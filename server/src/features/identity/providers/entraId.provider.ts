import { AuthProvider, AuthUser, AuthCredentials } from '../../auth/services/auth.service';
import { prisma } from '../../../shared/db/prisma';
import { EntraGraphClient } from './entraGraphClient';
import { EntraTokenValidator } from './entraTokenValidator';
import { decrypt } from '../../../shared/crypto/encryption';
import { issueSession } from '../../auth/services/sessionHelper';
import { Request, Response } from 'express';
import { User } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class EntraIdAuthProvider implements AuthProvider {
  readonly id = 'microsoft-entra';
  readonly displayName = 'Microsoft Entra ID';

  /**
   * Directly authenticating via username/password is not supported for Entra ID.
   */
  async authenticate(credentials: AuthCredentials): Promise<AuthUser> {
    throw new Error('Direct credentials authentication not supported for Microsoft Entra ID. Use OAuth flow.');
  }

  /**
   * Generates the authorization URL for initiating Entra ID login.
   */
  async getAuthorizationUrl(companyId: string, state: string, customRedirectUri?: string): Promise<string> {
    const config = await prisma.identityProviderConfig.findUnique({
      where: { companyId_providerType: { companyId, providerType: 'MICROSOFT_ENTRA' } },
    });

    if (!config || !config.enabled) {
      throw new Error('Microsoft Entra ID login is not enabled for this company.');
    }

    const tenantId = config.tenantId;
    const clientId = config.clientId;
    const redirectUri = customRedirectUri || config.redirectUri;

    if (!tenantId || !clientId || !redirectUri) {
      throw new Error('Microsoft Entra ID provider is not fully configured (missing tenantId, clientId, or redirectUri).');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      response_mode: 'query',
      scope: 'openid profile email https://graph.microsoft.com/User.Read',
      state,
    });

    return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /**
   * Helper to retrieve member group IDs of the user in Entra ID.
   */
  async getUserGroupIds(accessToken: string, userId: string): Promise<string[]> {
    try {
      const response = await fetch(`https://graph.microsoft.com/v1.0/users/${userId}/memberOf?$select=id`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        console.warn(`[EntraIdAuthProvider] Failed to fetch member groups: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      return (data.value || []).map((g: any) => g.id as string);
    } catch (error) {
      console.error('[EntraIdAuthProvider] Error fetching user groups:', error);
      return [];
    }
  }

  /**
   * Resolves the default role for a company. Matches defaultSyncedUserRoleId,
   * falls back to a role named 'Learner', falls back to any first role, or creates one if empty.
   */
  async resolveDefaultRole(companyId: string, defaultSyncedUserRoleId?: string | null): Promise<string> {
    if (defaultSyncedUserRoleId) {
      const role = await prisma.role.findUnique({
        where: { id: defaultSyncedUserRoleId },
      });
      if (role) return role.id;
    }

    const learnerRole = await prisma.role.findFirst({
      where: { companyId, name: 'Learner' },
    });
    if (learnerRole) return learnerRole.id;

    const anyRole = await prisma.role.findFirst({
      where: { companyId },
    });
    if (anyRole) return anyRole.id;

    const newRole = await prisma.role.create({
      data: {
        name: 'Learner',
        companyId,
        isProtected: false,
      },
    });
    return newRole.id;
  }

  /**
   * Downloads and saves user's profile photo from Microsoft Graph.
   */
  async saveUserProfilePicture(userId: string, photoBuffer: Buffer): Promise<string | null> {
    try {
      const storageDir = path.join(process.cwd(), 'storage', 'profile_pictures');
      fs.mkdirSync(storageDir, { recursive: true });
      const filename = `${crypto.randomBytes(16).toString('hex')}.jpg`;
      const targetPath = path.join(storageDir, filename);
      fs.writeFileSync(targetPath, photoBuffer);

      const urlPath = `/api/profile/picture/raw/${filename}`;
      await prisma.user.update({
        where: { id: userId },
        data: { profilePicturePath: urlPath },
      });
      return urlPath;
    } catch (error) {
      console.error('[EntraIdAuthProvider] Failed to save user profile picture:', error);
      return null;
    }
  }

  /**
   * Handles the OAuth authorization code callback.
   * Exchanges code, validates ID token, matches/provisions user, and issues real session.
   */
  async handleCallback(code: string, companyId: string, customRedirectUri: string | undefined, req: Request, res: Response) {
    const config = await prisma.identityProviderConfig.findUnique({
      where: { companyId_providerType: { companyId, providerType: 'MICROSOFT_ENTRA' } },
    });

    if (!config || !config.enabled) {
      throw new AuthenticationError('Microsoft Entra ID is not enabled or configured for this company.');
    }

    if (!config.tenantId || !config.clientId || !config.clientSecretEncrypted) {
      throw new AuthenticationError('Microsoft Entra ID provider is missing essential configurations.');
    }

    const decryptedSecret = decrypt(config.clientSecretEncrypted);
    const redirectUri = customRedirectUri || config.redirectUri || '';

    // 1. Exchange OAuth code for tokens
    const graphClient = new EntraGraphClient(config.tenantId, config.clientId, decryptedSecret);
    const tokenResponse = await graphClient.acquireDelegatedToken(code, redirectUri);

    if (!tokenResponse.id_token) {
      throw new AuthenticationError('No ID token returned by Microsoft Entra ID.');
    }

    // 2. Validate ID Token
    const validator = new EntraTokenValidator(config.tenantId, config.clientId);
    const tokenPayload = await validator.validate(tokenResponse.id_token);

    // 3. Match User
    let user: User | null = await prisma.user.findFirst({
      where: { companyId, entraObjectId: tokenPayload.oid },
    });

    if (!user && tokenPayload.email) {
      user = await prisma.user.findFirst({
        where: { companyId, email: tokenPayload.email.toLowerCase().trim() },
      });

      if (user) {
        // One-time link up: associate local account with Microsoft Entra ID going forward
        user = await prisma.user.update({
          where: { id: user.id },
          data: { entraObjectId: tokenPayload.oid },
        });
      }
    }

    // 4. Provision first-time user if no match found
    if (!user) {
      const allowedStrategies = ['FIRST_LOGIN', 'SELECTED_GROUPS_AND_FIRST_LOGIN', 'ALL_USERS'];
      if (!allowedStrategies.includes(config.importStrategy)) {
        throw new AuthenticationError('Access denied: Automatic registration is disabled.');
      }

      // If SELECTED_GROUPS_AND_FIRST_LOGIN is configured, verify group membership
      if (config.importStrategy === 'SELECTED_GROUPS_AND_FIRST_LOGIN') {
        const selectedGroups = await prisma.entraGroupSelection.findMany({
          where: { companyId },
        });

        if (selectedGroups.length === 0) {
          throw new AuthenticationError('Access denied: No groups configured for synchronization.');
        }

        const userGroupIds = await this.getUserGroupIds(tokenResponse.access_token, tokenPayload.oid);
        const hasMatchingGroup = selectedGroups.some((sg) => userGroupIds.includes(sg.entraGroupId));

        if (!hasMatchingGroup) {
          throw new AuthenticationError('Access denied: You are not a member of any synchronized groups.');
        }
      }

      // Create new user in DB
      const defaultRoleId = await this.resolveDefaultRole(companyId, config.defaultSyncedUserRoleId);
      const emailVal = tokenPayload.email ? tokenPayload.email.toLowerCase().trim() : '';
      const usernamePrefix = emailVal ? emailVal.split('@')[0] : `user_${tokenPayload.oid.slice(0, 8)}`;

      // Enforce unique username constraint
      let finalUsername = usernamePrefix;
      let attempt = 0;
      while (true) {
        const existingUser = await prisma.user.findUnique({
          where: { username: finalUsername },
        });
        if (!existingUser) break;
        attempt++;
        finalUsername = `${usernamePrefix}_${attempt}`;
      }

      user = await prisma.user.create({
        data: {
          companyId,
          email: emailVal || null,
          username: finalUsername,
          firstName: tokenPayload.given_name || tokenPayload.name?.split(' ')[0] || null,
          lastName: tokenPayload.family_name || tokenPayload.name?.split(' ').slice(1).join(' ') || null,
          status: 'ACTIVE',
          roleId: defaultRoleId,
          entraObjectId: tokenPayload.oid,
          profilePictureManuallySet: false,
        },
      });

      // Fetch and save user's profile picture from Graph
      try {
        const photoBuffer = await graphClient.getUserPhoto(tokenPayload.oid);
        if (photoBuffer) {
          await this.saveUserProfilePicture(user.id, photoBuffer);
        }
      } catch (err) {
        console.warn('[EntraIdAuthProvider] Failed to fetch or save user photo on first login:', err);
      }
    }

    // 5. Issue full-featured secure session
    return await issueSession(user, req, res);
  }
}

// Export a singleton instance of the Entra ID Provider
export const entraIdAuthProvider = new EntraIdAuthProvider();
