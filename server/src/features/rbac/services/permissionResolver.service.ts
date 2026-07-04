import { prisma } from '../../../shared/db/prisma';
import { Permission } from '@prisma/client';

export class PermissionResolverService {
  /**
   * Resolves all effective permissions for a role.
   * If Company.roleInheritanceEnabled is true, walks parentRoleId up the chain,
   * unioning each ancestor's permissions.
   * If false, returns only the role's own permissions.
   */
  async getEffectivePermissions(roleId: string): Promise<Permission[]> {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        company: true,
      },
    });

    if (!role) {
      return [];
    }

    const checkInheritance = role.company?.roleInheritanceEnabled ?? false;
    const roleIdsToFetch = [roleId];

    if (checkInheritance) {
      const visited = new Set<string>();
      visited.add(roleId);
      let currentRoleId = role.parentRoleId;

      while (currentRoleId) {
        if (visited.has(currentRoleId)) {
          break; // Avoid infinite recursion on cycles
        }
        visited.add(currentRoleId);
        roleIdsToFetch.push(currentRoleId);

        const currentRole = await prisma.role.findUnique({
          where: { id: currentRoleId },
        });

        if (!currentRole) {
          break;
        }
        currentRoleId = currentRole.parentRoleId;
      }
    }

    // Retrieve unique permissions for all collected role IDs
    const rolePermissions = await prisma.rolePermission.findMany({
      where: {
        roleId: { in: roleIdsToFetch },
      },
      include: {
        permission: true,
      },
    });

    // Deduplicate permissions by ID
    const uniquePermissionsMap = new Map<string, Permission>();
    for (const rp of rolePermissions) {
      uniquePermissionsMap.set(rp.permissionId, rp.permission);
    }

    return Array.from(uniquePermissionsMap.values());
  }

  /**
   * Checks if a user has a specific permission.
   * Bypasses all Role/Permission tables completely if user.isSuperuser is true.
   */
  async hasPermission(userId: string, module: string, action: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return false;
    }

    // Superuser check never touches the Role/Permission tables at all.
    if (user.isSuperuser) {
      return true;
    }

    if (!user.roleId) {
      return false;
    }

    const effectivePermissions = await this.getEffectivePermissions(user.roleId);
    return effectivePermissions.some(
      (p) => p.module === module && p.action === action
    );
  }
}

export const permissionResolverService = new PermissionResolverService();
