import { prisma } from '../db/prisma';
import { getRegisteredPermissions } from './registry';

/**
 * Synchronizes in-memory registered permissions with the database Permission table.
 * Uses Prisma upsert to safely verify existence without duplicates or collisions.
 */
export async function syncPermissions() {
  const permissions = getRegisteredPermissions();
  console.log(`[Permission Sync] Synchronizing ${permissions.length} registered permissions with database...`);

  for (const perm of permissions) {
    try {
      await prisma.permission.upsert({
        where: {
          module_action_idx: {
            module: perm.module,
            action: perm.action,
          },
        },
        update: {}, // Keep existing record intact if it already exists
        create: {
          module: perm.module,
          action: perm.action,
        },
      });
    } catch (err: any) {
      console.error(
        `[Permission Sync] Failed to upsert permission ${perm.module}:${perm.action}`,
        err
      );
    }
  }

  console.log('[Permission Sync] Permission synchronization complete.');
}
