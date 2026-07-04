import { prisma } from '../../../shared/db/prisma';

export class RoleService {
  /**
   * Creates a new custom role with isProtected=false and no permissions.
   */
  async create(name: string, companyId: string) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Role name is required.');
    }

    if (trimmedName.toLowerCase() === 'superuser') {
      throw new Error('The role name "Superuser" is reserved for system use.');
    }

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!company) {
      throw new Error(`Company with ID ${companyId} not found.`);
    }

    return await prisma.role.create({
      data: {
        name: trimmedName,
        companyId,
        isProtected: false,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  /**
   * Renames a custom role. Rejects if isProtected.
   */
  async rename(roleId: string, newName: string) {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      throw new Error('New role name is required.');
    }

    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });
    if (!role) {
      throw new Error(`Role with ID ${roleId} not found.`);
    }

    if (role.isProtected) {
      throw new Error(`Cannot rename the protected role "${role.name}".`);
    }

    if (trimmedName.toLowerCase() === 'superuser') {
      throw new Error('The role name "Superuser" is reserved for system use.');
    }

    return await prisma.role.update({
      where: { id: roleId },
      data: { name: trimmedName },
    });
  }

  /**
   * Duplicates an existing role. Copies name (+" copy"), permissions, and parent.
   * Never copies isProtected=true.
   */
  async duplicate(roleId: string) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: true,
      },
    });
    if (!role) {
      throw new Error(`Role with ID ${roleId} not found.`);
    }

    return await prisma.role.create({
      data: {
        name: `${role.name} copy`,
        parentRoleId: role.parentRoleId,
        companyId: role.companyId,
        isProtected: false,
        permissions: {
          create: role.permissions.map((p) => ({
            permissionId: p.permissionId,
          })),
        },
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  /**
   * Deletes a role. Rejects if isProtected.
   * Rejects if any other role has this as parentRoleId (returns the roles that depend on it).
   */
  async delete(roleId: string) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });
    if (!role) {
      throw new Error(`Role with ID ${roleId} not found.`);
    }

    if (role.isProtected) {
      throw new Error(`Cannot delete the protected role "${role.name}".`);
    }

    // Check if any other role has this as parentRoleId
    const childRoles = await prisma.role.findMany({
      where: { parentRoleId: roleId },
    });

    if (childRoles.length > 0) {
      const dependentNames = childRoles.map((r) => r.name).join(', ');
      const error = new Error(
        `Cannot delete role because other roles depend on it as a parent: ${dependentNames}`
      );
      (error as any).dependentRoles = childRoles;
      throw error;
    }

    await prisma.role.delete({
      where: { id: roleId },
    });

    return { success: true };
  }

  /**
   * Sets the parent role of a role. Rejects if isProtected.
   * Rejects if this would create a cycle in the role hierarchy.
   */
  async setParent(roleId: string, parentRoleId: string | null) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });
    if (!role) {
      throw new Error(`Role with ID ${roleId} not found.`);
    }

    if (role.isProtected) {
      throw new Error(`Cannot set parent for the protected role "${role.name}".`);
    }

    if (parentRoleId !== null) {
      if (parentRoleId === roleId) {
        throw new Error('A role cannot be its own parent.');
      }

      // Walk the ancestor chain of parentRoleId to verify no cycle is created
      let currentId: string | null = parentRoleId;
      const visited = new Set<string>();

      while (currentId) {
        if (currentId === roleId) {
          throw new Error(
            'Circular dependency detected: Setting this parent would create a loop in the role hierarchy.'
          );
        }
        if (visited.has(currentId)) {
          break; // prevent infinite loops in case of pre-existing circularity
        }
        visited.add(currentId);

        const parentRole = await prisma.role.findUnique({
          where: { id: currentId },
        });
        if (!parentRole) {
          throw new Error(`Parent role with ID ${currentId} not found.`);
        }
        currentId = parentRole.parentRoleId;
      }
    }

    return await prisma.role.update({
      where: { id: roleId },
      data: { parentRoleId },
    });
  }

  /**
   * Updates permission assignments for a custom role. Rejects if isProtected.
   */
  async updatePermissions(roleId: string, permissionIds: string[]) {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });
    if (!role) {
      throw new Error(`Role with ID ${roleId} not found.`);
    }

    if (role.isProtected) {
      throw new Error(`Cannot modify permissions of the protected role "${role.name}".`);
    }

    return await prisma.$transaction(async (tx) => {
      // Clear existing permissions
      await tx.rolePermission.deleteMany({
        where: { roleId },
      });

      // Insert new permissions
      if (permissionIds.length > 0) {
        const count = await tx.permission.count({
          where: {
            id: { in: permissionIds },
          },
        });
        if (count !== permissionIds.length) {
          throw new Error('One or more permission IDs are invalid.');
        }

        await tx.rolePermission.createMany({
          data: permissionIds.map((pId) => ({
            roleId,
            permissionId: pId,
          })),
        });
      }

      return await tx.role.findUnique({
        where: { id: roleId },
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });
    });
  }

  /**
   * Retrieves a role by ID along with its permissions.
   */
  async getById(roleId: string) {
    return await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  /**
   * Lists all roles for a given company.
   */
  async list(companyId: string) {
    return await prisma.role.findMany({
      where: { companyId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }
}

export const roleService = new RoleService();
