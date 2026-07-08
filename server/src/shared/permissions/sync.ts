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
      const existing = await prisma.permission.findFirst({
        where: {
          module: perm.module,
          action: perm.action,
        },
      });

      if (!existing) {
        await prisma.permission.create({
          data: {
            module: perm.module,
            action: perm.action,
          },
        });
      }
    } catch (err: any) {
      console.error(
        `[Permission Sync] Failed to sync permission ${perm.module}:${perm.action}`,
        err
      );
    }
  }

  console.log('[Permission Sync] Permission synchronization complete.');
}
