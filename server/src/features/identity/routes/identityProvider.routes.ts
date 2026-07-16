import { Router, Request, Response } from 'express';
import { requirePermission } from '../../../shared/middleware/permission.middleware';
import { prisma } from '../../../shared/db/prisma';
import { encrypt } from '../../../shared/crypto/encryption';
import { EntraGraphClient } from '../providers/entraGraphClient';
import { entraSyncService } from '../services/entraSync.service';
import { LoginMode, ImportStrategy } from '@prisma/client';

const router = Router();

/**
 * Decodes a JWT token payload without signature verification (read-only claims extraction).
 */
function decodeJwt(token: string) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
}

/**
 * GET /api/identity-providers/entra - Retrieve active configuration
 * Gated by: identity-providers:view-config
 */
router.get('/entra', requirePermission('identity-providers', 'view-config'), async (req: Request, res: Response) => {
  const companyId = req.user!.companyId!;
  try {
    const config = await prisma.identityProviderConfig.findUnique({
      where: { companyId_providerType: { companyId, providerType: 'MICROSOFT_ENTRA' } },
      include: {
        entraGroupSelections: true
      }
    });

    if (!config) {
      return res.json(null);
    }

    // Mask secret
    const sanitizedConfig = {
      ...config,
      clientSecretEncrypted: config.clientSecretEncrypted ? '********' : null,
      clientSecretConfigured: !!config.clientSecretEncrypted
    };

    return res.json(sanitizedConfig);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch identity provider configuration.' });
  }
});

/**
 * POST /api/identity-providers/entra/test-connection - Read-only credentials validation
 * Gated by: identity-providers:configure
 * Acceptance: Never persists anything
 */
router.post('/entra/test-connection', requirePermission('identity-providers', 'configure'), async (req: Request, res: Response) => {
  const { tenantId, clientId, clientSecret } = req.body;
  if (!tenantId || !clientId || !clientSecret) {
    return res.status(400).json({ error: 'Tenant ID, Client ID, and Client Secret are required.' });
  }

  try {
    // 1. Call validateConnection (performs a lightweight organization info fetch)
    await EntraGraphClient.validateConnection(tenantId, clientId, clientSecret);

    // 2. Fetch the token and inspect the roles array in JWT claims
    const client = new EntraGraphClient(tenantId, clientId, clientSecret);
    const token = await client.acquireApplicationToken();
    const payload = decodeJwt(token);
    const roles: string[] = Array.isArray(payload?.roles) ? payload.roles : [];

    const userReadAllGranted = roles.includes('User.Read.All');
    const groupReadAllGranted = roles.includes('Group.Read.All');

    const permissions = [
      {
        permission: 'User.Read.All',
        status: userReadAllGranted ? 'Granted' : 'Missing',
        explanation: userReadAllGranted 
          ? 'Granted. Required to read Entra user profiles and sync them into LMS.'
          : 'Missing. Required to read Entra user profiles and sync them into LMS. Please add User.Read.All Application permission under Microsoft Graph API in your Entra App Registration and grant admin consent.'
      },
      {
        permission: 'Group.Read.All',
        status: groupReadAllGranted ? 'Granted' : 'Missing',
        explanation: groupReadAllGranted 
          ? 'Granted. Required to read Entra groups and sync organizational units.'
          : 'Missing. Required to read Entra groups and sync organizational units. Please add Group.Read.All Application permission under Microsoft Graph API in your Entra App Registration and grant admin consent.'
      }
    ];

    const allGranted = userReadAllGranted && groupReadAllGranted;

    return res.json({
      success: true,
      allGranted,
      permissions
    });
  } catch (error: any) {
    // Connection failed completely
    const permissions = [
      {
        permission: 'User.Read.All',
        status: 'Missing',
        explanation: `Failed to connect. Error: ${error.message}`
      },
      {
        permission: 'Group.Read.All',
        status: 'Missing',
        explanation: `Failed to connect. Error: ${error.message}`
      }
    ];

    return res.json({
      success: false,
      allGranted: false,
      error: error.message,
      permissions
    });
  }
});

/**
 * POST /api/identity-providers/entra - Save or overwrite the connection credentials
 * Gated by: identity-providers:configure
 * Acceptance: Encrypts secret, never persists plaintext
 */
router.post('/entra', requirePermission('identity-providers', 'configure'), async (req: Request, res: Response) => {
  const companyId = req.user!.companyId!;
  const { tenantId, clientId, clientSecret } = req.body;

  if (!tenantId || !clientId || !clientSecret) {
    return res.status(400).json({ error: 'Tenant ID, Client ID, and Client Secret are required.' });
  }

  try {
    const encryptedSecret = encrypt(clientSecret);

    const config = await prisma.identityProviderConfig.upsert({
      where: {
        companyId_providerType: {
          companyId,
          providerType: 'MICROSOFT_ENTRA'
        }
      },
      create: {
        companyId,
        providerType: 'MICROSOFT_ENTRA',
        enabled: true,
        tenantId,
        clientId,
        clientSecretEncrypted: encryptedSecret,
        loginMode: 'BOTH',
        importStrategy: 'FIRST_LOGIN',
      },
      update: {
        tenantId,
        clientId,
        clientSecretEncrypted: encryptedSecret,
        enabled: true
      },
      include: {
        entraGroupSelections: true
      }
    });

    const sanitizedConfig = {
      ...config,
      clientSecretEncrypted: '********',
      clientSecretConfigured: true
    };

    return res.json({
      success: true,
      config: sanitizedConfig
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to save identity provider configuration.' });
  }
});

/**
 * PATCH /api/identity-providers/entra - Update identity provider strategies and group selections
 * Gated by: identity-providers:configure
 */
router.patch('/entra', requirePermission('identity-providers', 'configure'), async (req: Request, res: Response) => {
  const companyId = req.user!.companyId!;
  const { loginMode, importStrategy, defaultSyncedUserRoleId, groupSelections, enabled } = req.body;

  try {
    // Verify config exists first
    const existingConfig = await prisma.identityProviderConfig.findUnique({
      where: { companyId_providerType: { companyId, providerType: 'MICROSOFT_ENTRA' } }
    });

    if (!existingConfig) {
      return res.status(404).json({ error: 'Identity provider configuration not found. Please save connection settings first.' });
    }

    const updatedConfig = await prisma.$transaction(async (tx) => {
      // 1. Update main configuration
      const config = await tx.identityProviderConfig.update({
        where: { id: existingConfig.id },
        data: {
          ...(loginMode !== undefined && { loginMode: loginMode as LoginMode }),
          ...(importStrategy !== undefined && { importStrategy: importStrategy as ImportStrategy }),
          ...(defaultSyncedUserRoleId !== undefined && { defaultSyncedUserRoleId }),
          ...(enabled !== undefined && { enabled: !!enabled })
        }
      });

      // 2. Handle group selections if provided
      if (Array.isArray(groupSelections)) {
        // Clear existing group selections
        await tx.entraGroupSelection.deleteMany({
          where: { companyId }
        });

        if (groupSelections.length > 0) {
          await tx.entraGroupSelection.createMany({
            data: groupSelections.map((g: any) => ({
              companyId,
              entraGroupId: g.entraGroupId || g.id,
              entraGroupName: g.entraGroupName || g.name,
              identityProviderConfigId: config.id
            }))
          });
        }
      }

      // Fetch full configuration with relations to return
      return tx.identityProviderConfig.findUnique({
        where: { id: config.id },
        include: {
          entraGroupSelections: true
        }
      });
    });

    if (!updatedConfig) {
      return res.status(500).json({ error: 'Failed to retrieve updated configuration.' });
    }

    const sanitizedConfig = {
      ...updatedConfig,
      clientSecretEncrypted: updatedConfig.clientSecretEncrypted ? '********' : null,
      clientSecretConfigured: !!updatedConfig.clientSecretEncrypted
    };

    return res.json({
      success: true,
      config: sanitizedConfig
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to update identity provider settings.' });
  }
});

/**
 * POST /api/identity-providers/entra/sync-now - Triggers manual background synchronization
 * Gated by: identity-providers:manual-sync
 */
router.post('/entra/sync-now', requirePermission('identity-providers', 'manual-sync'), async (req: Request, res: Response) => {
  const companyId = req.user!.companyId!;
  try {
    const result = await entraSyncService.runSync(companyId, 'MANUAL', req.user!.id);
    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to run Entra sync.' });
  }
});

/**
 * GET /api/identity-providers/entra/sync-logs - Paginated history
 * Gated by: identity-providers:view-logs
 */
router.get('/entra/sync-logs', requirePermission('identity-providers', 'view-logs'), async (req: Request, res: Response) => {
  const companyId = req.user!.companyId!;
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string || '10', 10)));
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.syncLog.findMany({
        where: { companyId },
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
        include: {
          triggeredByUser: {
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }),
      prisma.syncLog.count({
        where: { companyId }
      })
    ]);

    return res.json({
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch sync logs.' });
  }
});

/**
 * GET /api/identity-providers/entra/sync-logs/:id/download - Returns errorDetails as downloadable file
 * Gated by: identity-providers:view-logs
 */
router.get('/entra/sync-logs/:id/download', requirePermission('identity-providers', 'view-logs'), async (req: Request, res: Response) => {
  const companyId = req.user!.companyId!;
  try {
    const log = await prisma.syncLog.findFirst({
      where: { id: req.params.id, companyId }
    });

    if (!log) {
      return res.status(404).json({ error: 'Sync log not found.' });
    }

    const errorDetailsStr = log.errorDetails 
      ? JSON.stringify(log.errorDetails, null, 2)
      : 'No error details recorded for this sync.';

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="sync-log-${log.id}.txt"`);
    return res.send(errorDetailsStr);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to download sync log.' });
  }
});

export default router;
