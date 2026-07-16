import { prisma } from '../../../shared/db/prisma';
import { SyncStatus, SyncTriggerType, UserStatus } from '@prisma/client';
import { EntraGraphClient } from '../providers/entraGraphClient';
import { entraIdAuthProvider } from '../providers/entraId.provider';
import { decrypt } from '../../../shared/crypto/encryption';
import { auditLogService } from '../../../shared/audit/auditLog.service';
import { permissionResolverService } from '../../rbac/services/permissionResolver.service';
import { emailService } from '../../../shared/email/email.service';

export class EntraSyncService {
  /**
   * Resolves value from Entra user based on fieldKey or fieldName.
   */
  private resolveEntraValue(entraUser: any, fieldKey: string | null, fieldName: string): string | null {
    const normKey = (fieldKey || fieldName).toLowerCase().replace(/[^a-z0-9]/g, '');
    switch (normKey) {
      case 'firstname':
      case 'givenname':
        return entraUser.givenName || null;
      case 'lastname':
      case 'surname':
        return entraUser.surname || null;
      case 'email':
      case 'mail':
      case 'userprincipalname':
        return entraUser.mail || entraUser.userPrincipalName || null;
      case 'department':
        return entraUser.department || null;
      case 'jobtitle':
      case 'title':
        return entraUser.jobTitle || null;
      default:
        if (fieldKey && entraUser[fieldKey] !== undefined) {
          return entraUser[fieldKey] ? String(entraUser[fieldKey]) : null;
        }
        const directProp = Object.keys(entraUser).find(k => k.toLowerCase() === normKey);
        if (directProp) {
          return entraUser[directProp] ? String(entraUser[directProp]) : null;
        }
        return null;
    }
  }

  /**
   * Generates a unique username for a company.
   */
  private async generateUniqueUsername(email: string): Promise<string> {
    const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    let username = baseUsername;
    let counter = 1;
    while (true) {
      const existing = await prisma.user.findUnique({
        where: { username },
      });
      if (!existing) break;
      username = `${baseUsername}${counter}`;
      counter++;
    }
    return username;
  }

  /**
   * Executes the Microsoft Entra synchronization.
   */
  async runSync(
    companyId: string,
    triggeredBy: SyncTriggerType,
    triggeredByUserId?: string
  ): Promise<{ status: SyncStatus; usersProcessed: number; usersFailed: number; groupsProcessed: number }> {
    console.log(`[EntraSyncService] Starting sync for company: ${companyId}. Triggered by: ${triggeredBy}`);

    // 1. Get enabled identity provider config of type MICROSOFT_ENTRA
    const config = await prisma.identityProviderConfig.findUnique({
      where: { companyId_providerType: { companyId, providerType: 'MICROSOFT_ENTRA' } },
    });

    if (!config || !config.enabled) {
      throw new Error(`Microsoft Entra ID integration is not enabled for company: ${companyId}`);
    }

    const { tenantId, clientId, clientSecretEncrypted, importStrategy, defaultSyncedUserRoleId } = config;

    if (!tenantId || !clientId || !clientSecretEncrypted) {
      throw new Error(`Microsoft Entra ID is not fully configured (missing tenantId, clientId, or clientSecret).`);
    }

    // Create a pending SyncLog record
    const syncLog = await prisma.syncLog.create({
      data: {
        companyId,
        status: 'SUCCESS', // Will update later
        usersProcessed: 0,
        usersFailed: 0,
        groupsProcessed: 0,
        triggeredBy,
        triggeredByUserId: triggeredByUserId || null,
        startedAt: new Date(),
      },
    });

    let usersProcessed = 0;
    let usersFailed = 0;
    let groupsProcessed = 0;
    const errorDetails: string[] = [];

    try {
      // Decrypt the secret
      const decryptedSecret = decrypt(clientSecretEncrypted);
      const graphClient = new EntraGraphClient(tenantId, clientId, decryptedSecret);

      let entraUsers: any[] = [];
      let entraGroups: any[] = [];

      // 2. Fetch users/groups based on importStrategy
      console.log(`[EntraSyncService] Fetching data using strategy: ${importStrategy}`);
      if (importStrategy === 'ALL_USERS') {
        entraUsers = await graphClient.getUsers();
        entraGroups = await graphClient.getGroups();
      } else if (importStrategy === 'SELECTED_GROUPS' || importStrategy === 'SELECTED_GROUPS_AND_FIRST_LOGIN') {
        // Find configured EntraGroupSelection
        const selections = await prisma.entraGroupSelection.findMany({
          where: { companyId },
        });

        const selectedGroupIds = selections.map(s => s.entraGroupId);
        if (selectedGroupIds.length > 0) {
          // Fetch all groups from Entra and filter to selected ones to check existence/name
          const allGroups = await graphClient.getGroups();
          entraGroups = allGroups.filter(g => selectedGroupIds.includes(g.id));

          // Fetch group members and deduplicate
          const userMap = new Map<string, any>();
          for (const groupId of selectedGroupIds) {
            try {
              const members = await graphClient.getGroupMembers(groupId);
              for (const m of members) {
                // Ensure they are user entities (not other groups)
                if (m.userPrincipalName || m.mail) {
                  userMap.set(m.id, m);
                }
              }
            } catch (err: any) {
              console.error(`[EntraSyncService] Failed to fetch members for group ${groupId}:`, err);
              errorDetails.push(`Failed to fetch members for group ${groupId}: ${err.message}`);
            }
          }
          entraUsers = Array.from(userMap.values());
        }
      } else if (importStrategy === 'FIRST_LOGIN') {
        // FIRST_LOGIN strategy:
        // No group synchronization.
        // We fetch all users from Entra but we ONLY synchronize/update users who ALREADY exist in our local DB with a non-null entraObjectId!
        entraUsers = await graphClient.getUsers();
        entraGroups = [];
      }

      console.log(`[EntraSyncService] Fetched ${entraUsers.length} users and ${entraGroups.length} groups from Entra.`);

      // 3. Organization import (OrganizationUnits)
      if (importStrategy !== 'FIRST_LOGIN') {
        console.log(`[EntraSyncService] Syncing OrganizationUnits...`);
        for (const group of entraGroups) {
          try {
            await prisma.organizationUnit.upsert({
              where: {
                companyId_entraGroupId: {
                  companyId,
                  entraGroupId: group.id,
                },
              },
              create: {
                name: group.displayName,
                companyId,
                entraGroupId: group.id,
                syncSource: 'ENTRA_SYNC',
                deletedAt: null,
              },
              update: {
                name: group.displayName,
                deletedAt: null, // restore if soft-deleted
              },
            });
            groupsProcessed++;
          } catch (err: any) {
            console.error(`[EntraSyncService] Failed to sync group ${group.displayName}:`, err);
            errorDetails.push(`Failed to sync group ${group.displayName}: ${err.message}`);
          }
        }

        // Soft-delete MANUAL-sourced groups is NOT done. But ENTRA_SYNC sourced groups that are no longer present in entraGroups MUST be soft-deleted!
        try {
          const fetchedGroupIds = entraGroups.map(g => g.id);
          const missingUnits = await prisma.organizationUnit.findMany({
            where: {
              companyId,
              syncSource: 'ENTRA_SYNC',
              deletedAt: null,
              entraGroupId: { notIn: fetchedGroupIds },
            },
          });

          for (const unit of missingUnits) {
            await prisma.organizationUnit.update({
              where: { id: unit.id },
              data: { deletedAt: new Date() },
            });
            console.log(`[EntraSyncService] Soft-deleted missing OrganizationUnit: ${unit.name}`);
          }
        } catch (err: any) {
          console.error('[EntraSyncService] Failed to reconcile/soft-delete missing organization units:', err);
          errorDetails.push(`OrganizationUnit reconciliation failed: ${err.message}`);
        }
      }

      // 4. User Synchronization
      // Load all profile field definitions for this company to identify externalSyncLocked fields
      const profileFieldDefs = await prisma.profileFieldDefinition.findMany({
        where: { companyId },
      });

      console.log(`[EntraSyncService] Syncing users...`);
      for (const entraUser of entraUsers) {
        try {
          const email = (entraUser.mail || entraUser.userPrincipalName || '').toLowerCase().trim();
          if (!email) {
            throw new Error(`User with Entra Object ID ${entraUser.id} does not have an email address.`);
          }

          // Search for existing user
          let user = await prisma.user.findFirst({
            where: {
              companyId,
              entraObjectId: entraUser.id,
            },
          });

          if (!user) {
            // Check if matching email exists to link up
            user = await prisma.user.findFirst({
              where: {
                companyId,
                email,
              },
            });
            if (user) {
              // Link entraObjectId
              user = await prisma.user.update({
                where: { id: user.id },
                data: { entraObjectId: entraUser.id },
              });
              console.log(`[EntraSyncService] Linked user ${email} with Entra ID ${entraUser.id}`);
            }
          }

          if (!user) {
            // User does not exist locally.
            if (importStrategy === 'FIRST_LOGIN') {
              // Do NOT provision new users in automated background sync for FIRST_LOGIN strategy
              continue;
            }

            // Provision a brand new user
            const defaultRoleId = await entraIdAuthProvider.resolveDefaultRole(companyId, defaultSyncedUserRoleId);
            const username = await this.generateUniqueUsername(email);

            const firstName = entraUser.givenName || entraUser.displayName?.split(' ')[0] || 'First';
            const lastName = entraUser.surname || entraUser.displayName?.split(' ').slice(1).join(' ') || 'Last';

            user = await prisma.user.create({
              data: {
                companyId,
                email,
                username,
                firstName,
                lastName,
                status: entraUser.accountEnabled === false ? 'DISABLED' : 'ACTIVE',
                roleId: defaultRoleId,
                entraObjectId: entraUser.id,
                profilePictureManuallySet: false,
              },
            });

            console.log(`[EntraSyncService] Provisioned new user: ${email} (ID: ${user.id})`);

            // Since it's a new user, populate ALL custom fields from Entra ID if possible
            for (const fieldDef of profileFieldDefs) {
              if (fieldDef.fieldKey === 'profilePicture') {
                try {
                  const photoBuffer = await graphClient.getUserPhoto(entraUser.id);
                  if (photoBuffer) {
                    await entraIdAuthProvider.saveUserProfilePicture(user.id, photoBuffer);
                  }
                } catch (err) {
                  console.warn(`[EntraSyncService] Failed to download profile photo for new user ${email}:`, err);
                }
              } else if (!fieldDef.isSystemField) {
                const val = this.resolveEntraValue(entraUser, fieldDef.fieldKey, fieldDef.name);
                if (val !== null) {
                  await prisma.profileFieldValue.create({
                    data: {
                      userId: user.id,
                      fieldDefinitionId: fieldDef.id,
                      value: val,
                    },
                  });
                }
              }
            }

            await auditLogService.log(companyId, 'User', user.id, 'PROVISION_ENTRA', triggeredByUserId || 'SYSTEM');
          } else {
            // User already exists locally.
            // Determine active/disabled status based on Entra ID
            const targetStatus: UserStatus = entraUser.accountEnabled === false ? 'DISABLED' : 'ACTIVE';

            // Check what fields should be updated.
            const userUpdates: any = {};
            if (user.status !== targetStatus) {
              userUpdates.status = targetStatus;
            }

            for (const fieldDef of profileFieldDefs) {
              if (fieldDef.externalSyncLocked) {
                if (fieldDef.fieldKey === 'profilePicture') {
                  if (!user.profilePictureManuallySet) {
                    try {
                      const photoBuffer = await graphClient.getUserPhoto(entraUser.id);
                      if (photoBuffer) {
                        await entraIdAuthProvider.saveUserProfilePicture(user.id, photoBuffer);
                      }
                    } catch (err: any) {
                      console.warn(`[EntraSyncService] Failed to sync profile photo for user ${email}:`, err.message);
                    }
                  }
                } else if (fieldDef.isSystemField) {
                  const val = this.resolveEntraValue(entraUser, fieldDef.fieldKey, fieldDef.name);
                  if (fieldDef.fieldKey === 'firstName' && val !== null) {
                    userUpdates.firstName = val;
                  } else if (fieldDef.fieldKey === 'lastName' && val !== null) {
                    userUpdates.lastName = val;
                  } else if (fieldDef.fieldKey === 'email' && val !== null) {
                    userUpdates.email = val.toLowerCase();
                  }
                } else {
                  // Custom profile field
                  const val = this.resolveEntraValue(entraUser, fieldDef.fieldKey, fieldDef.name);
                  await prisma.profileFieldValue.upsert({
                    where: {
                      userId_fieldDefinitionId: {
                        userId: user.id,
                        fieldDefinitionId: fieldDef.id,
                      },
                    },
                    create: {
                      userId: user.id,
                      fieldDefinitionId: fieldDef.id,
                      value: val,
                    },
                    update: {
                      value: val,
                    },
                  });
                }
              }
            }

            // Apply updates to standard columns if any
            if (Object.keys(userUpdates).length > 0) {
              await prisma.user.update({
                where: { id: user.id },
                data: userUpdates,
              });
            }
          }

          usersProcessed++;
        } catch (err: any) {
          console.error(`[EntraSyncService] Failed to sync user ${entraUser.userPrincipalName || entraUser.id}:`, err);
          usersFailed++;
          errorDetails.push(`Failed to sync user ${entraUser.userPrincipalName || entraUser.id}: ${err.message}`);
        }
      }

      // 5. Handle Disabled/Removed Users
      // Find all users in our database for this company who have a non-null entraObjectId BUT were NOT in the list of Entra users we fetched
      const syncedEntraUserIds = entraUsers.map(u => u.id);
      const missingUsers = await prisma.user.findMany({
        where: {
          companyId,
          entraObjectId: { not: null, notIn: syncedEntraUserIds },
          status: { not: 'ARCHIVED' }, // Skip if already archived
        },
      });

      console.log(`[EntraSyncService] Reconciling ${missingUsers.length} users deleted/removed from Entra ID.`);
      for (const missingUser of missingUsers) {
        try {
          // Set status to ARCHIVED per soft-delete pattern
          await prisma.user.update({
            where: { id: missingUser.id },
            data: { status: 'ARCHIVED' },
          });

          await auditLogService.log(
            companyId,
            'User',
            missingUser.id,
            'ARCHIVE_DELETED_ENTRA_USER',
            triggeredByUserId || 'SYSTEM'
          );
          usersProcessed++;
        } catch (err: any) {
          console.error(`[EntraSyncService] Failed to soft-delete missing user ${missingUser.email}:`, err);
          usersFailed++;
          errorDetails.push(`Failed to soft-delete missing user ${missingUser.email}: ${err.message}`);
        }
      }

      // 6. Complete SyncLog and Config updates
      const finalStatus: SyncStatus = usersFailed > 0 ? 'PARTIAL_FAILURE' : 'SUCCESS';

      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          finishedAt: new Date(),
          status: finalStatus,
          usersProcessed,
          usersFailed,
          groupsProcessed,
          errorDetails: errorDetails.length > 0 ? { errors: errorDetails } : null,
        },
      });

      await prisma.identityProviderConfig.update({
        where: { id: config.id },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: finalStatus,
        },
      });

      console.log(`[EntraSyncService] Sync finished for company ${companyId}. Status: ${finalStatus}. processed: ${usersProcessed}, failed: ${usersFailed}, groups: ${groupsProcessed}`);
      return { status: finalStatus, usersProcessed, usersFailed, groupsProcessed };

    } catch (error: any) {
      console.error(`[EntraSyncService] Critical error during sync run:`, error);
      
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          finishedAt: new Date(),
          status: 'FAILED',
          usersProcessed,
          usersFailed,
          groupsProcessed,
          errorDetails: { error: error.message, stack: error.stack, errors: errorDetails },
        },
      });

      await prisma.identityProviderConfig.update({
        where: { id: config.id },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: 'FAILED',
        },
      });

      // Send critical failure email notification to users holding identity-providers:view-logs permission
      await this.notifyLmsManagersOnFailure(companyId, error);

      throw error;
    }
  }

  /**
   * Notifies active users holding identity-providers:view-logs permission when synchronization completely fails.
   */
  private async notifyLmsManagersOnFailure(companyId: string, error: any): Promise<void> {
    try {
      const potentialManagers = await prisma.user.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { companyId },
            { isSuperuser: true }
          ]
        }
      });

      const potentialManagerIds = potentialManagers.map(u => u.id);
      const authorizedManagerIds = await permissionResolverService.filterUsersWithPermission(
        potentialManagerIds,
        'identity-providers',
        'view-logs'
      );
      const authorizedManagers = potentialManagers.filter(u => authorizedManagerIds.includes(u.id));

      const recipientEmails = new Set<string>();
      for (const user of authorizedManagers) {
        if (user.email) {
          recipientEmails.add(user.email.trim());
        }
      }

      if (recipientEmails.size === 0) {
        console.log('[EntraSyncService] No active users with identity-providers:view-logs permission to notify.');
        return;
      }

      const emailList = Array.from(recipientEmails);
      console.log(`[EntraSyncService] Sending sync failure notification to: ${emailList.join(', ')}`);

      const errorMessage = error.message || String(error);

      for (const email of emailList) {
        try {
          await emailService.send(email, 'entra-sync-failure', {
            errorMessage
          });
        } catch (emailErr) {
          console.error(`[EntraSyncService] Failed to send sync failure email to ${email}:`, emailErr);
        }
      }
    } catch (err) {
      console.error('[EntraSyncService] Failed to resolve or notify managers on sync failure:', err);
    }
  }
}

export const entraSyncService = new EntraSyncService();
