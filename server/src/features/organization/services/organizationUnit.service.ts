import { prisma } from '../../../shared/db/prisma';
import crypto from 'crypto';
import { membershipAssignmentHooksService } from '../../assignments/services/membershipAssignmentHooks.service';

export class OrganizationUnitService {
  async create(name: string, parentId?: string | null, companyId?: string) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Organization unit name is required.');
    }

    // Resolve or find companyId
    let resolvedCompanyId = companyId;
    if (!resolvedCompanyId) {
      const company = await prisma.company.findFirst();
      if (!company) {
        throw new Error('No company found to associate with this organization unit.');
      }
      resolvedCompanyId = company.id;
    }

    if (parentId) {
      const parent = await prisma.organizationUnit.findFirst({
        where: { id: parentId, deletedAt: null }
      });
      if (!parent) {
        throw new Error(`Parent organization unit with ID ${parentId} not found.`);
      }
    }

    return await prisma.organizationUnit.create({
      data: {
        name: trimmedName,
        companyId: resolvedCompanyId,
        parentId: parentId || null
      }
    });
  }

  async rename(id: string, newName: string) {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      throw new Error('New name is required.');
    }

    const ou = await prisma.organizationUnit.findFirst({
      where: { id, deletedAt: null }
    });
    if (!ou) {
      throw new Error(`Organization unit with ID ${id} not found or has been soft-deleted.`);
    }

    return await prisma.organizationUnit.update({
      where: { id },
      data: { name: trimmedName }
    });
  }

  async move(id: string, newParentId: string | null) {
    const ou = await prisma.organizationUnit.findFirst({
      where: { id, deletedAt: null }
    });
    if (!ou) {
      throw new Error(`Organization unit with ID ${id} not found or has been soft-deleted.`);
    }

    if (newParentId !== null) {
      if (newParentId === id) {
        throw new Error('An organization unit cannot be its own parent.');
      }

      // Walk the ancestor chain of newParentId to verify no cycle is created
      let currentId: string | null = newParentId;
      const visited = new Set<string>();

      while (currentId) {
        if (currentId === id) {
          throw new Error(
            'Circular dependency detected: Setting this parent would create a loop in the organization unit hierarchy.'
          );
        }
        if (visited.has(currentId)) {
          break; // prevent infinite loops in case of pre-existing circularity
        }
        visited.add(currentId);

        const parentOU = await prisma.organizationUnit.findFirst({
          where: { id: currentId, deletedAt: null }
        });
        if (!parentOU) {
          throw new Error(`Parent organization unit with ID ${currentId} not found or has been soft-deleted.`);
        }
        currentId = parentOU.parentId;
      }
    }

    return await prisma.organizationUnit.update({
      where: { id },
      data: { parentId: newParentId }
    });
  }

  async delete(id: string, option: 'REASSIGN' | 'SUBTREE') {
    const target = await prisma.organizationUnit.findUnique({
      where: { id }
    });
    if (!target) {
      throw new Error(`Organization unit with ID ${id} not found.`);
    }

    const deletedAt = new Date();
    const permanentDeleteAt = new Date(deletedAt.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days
    const deletionBatchId = crypto.randomUUID();

    if (option === 'REASSIGN') {
      // Move direct children to target's parent (grandparent)
      await prisma.organizationUnit.updateMany({
        where: { parentId: id },
        data: { parentId: target.parentId }
      });

      // Soft-delete target and its memberships with deletionBatchId
      await prisma.$transaction([
        prisma.organizationUnit.update({
          where: { id },
          data: {
            deletedAt,
            permanentDeleteAt,
            deletionBatchId
          }
        }),
        prisma.membership.updateMany({
          where: { organizationUnitId: id, deletedAt: null },
          data: {
            deletedAt,
            deletionBatchId
          }
        })
      ]);
    } else {
      // SUBTREE delete - get target + all descendants
      const idsToDelete = [id, ...await this.getDescendants(id)];

      await prisma.$transaction([
        prisma.organizationUnit.updateMany({
          where: { id: { in: idsToDelete } },
          data: {
            deletedAt,
            permanentDeleteAt,
            deletionBatchId
          }
        }),
        prisma.membership.updateMany({
          where: { organizationUnitId: { in: idsToDelete }, deletedAt: null },
          data: {
            deletedAt,
            deletionBatchId
          }
        })
      ]);
    }

    return { success: true };
  }

  async getAffectedUsers(id: string, option: 'REASSIGN' | 'SUBTREE') {
    let idsToCheck: string[] = [];
    if (option === 'REASSIGN') {
      idsToCheck = [id];
    } else {
      idsToCheck = [id, ...await this.getDescendants(id)];
    }

    const memberships = await prisma.membership.findMany({
      where: {
        organizationUnitId: { in: idsToCheck },
        deletedAt: null,
        status: 'ACTIVE'
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        }
      }
    });

    const userMap = new Map<string, { id: string; username: string | null; email: string | null }>();
    for (const m of memberships) {
      if (m.user) {
        userMap.set(m.user.id, m.user);
      }
    }

    return Array.from(userMap.values());
  }

  async restore(id: string) {
    const target = await prisma.organizationUnit.findFirst({
      where: { id, deletedAt: { not: null } }
    });
    if (!target) {
      throw new Error(`Deleted organization unit with ID ${id} not found.`);
    }

    if (target.permanentDeleteAt && new Date() > target.permanentDeleteAt) {
      throw new Error('The 14-day restoration window has expired.');
    }

    const { deletionBatchId } = target;

    if (!deletionBatchId) {
      throw new Error('Deletion batch ID missing on the deleted organization unit.');
    }

    // Restore all sharing deletionBatchId
    await prisma.$transaction([
      prisma.organizationUnit.updateMany({
        where: { deletionBatchId },
        data: {
          deletedAt: null,
          permanentDeleteAt: null,
          deletionBatchId: null
        }
      }),
      prisma.membership.updateMany({
        where: { deletionBatchId },
        data: {
          deletedAt: null,
          deletionBatchId: null
        }
      })
    ]);

    return { success: true };
  }

  async assignManager(userId: string, organizationUnitId: string, createdById?: string) {
    // Verify OU exists and is active
    const ou = await prisma.organizationUnit.findFirst({
      where: { id: organizationUnitId, deletedAt: null }
    });
    if (!ou) {
      throw new Error('Active organization unit not found.');
    }

    // Verify User exists and is active
    const user = await prisma.user.findFirst({
      where: { id: userId, status: 'ACTIVE' }
    });
    if (!user) {
      throw new Error('Active user not found.');
    }

    // Resolve createdById if not provided
    let creatorId = createdById;
    if (!creatorId) {
      const superuser = await prisma.user.findFirst({ where: { isSuperuser: true } });
      if (!superuser) {
        throw new Error('No creator user available.');
      }
      creatorId = superuser.id;
    }

    // Check if membership already exists (active)
    const existing = await prisma.membership.findFirst({
      where: {
        userId,
        organizationUnitId,
        membershipType: 'MANAGER',
        deletedAt: null
      }
    });
    if (existing) {
      return existing;
    }

    const result = await prisma.membership.create({
      data: {
        userId,
        organizationUnitId,
        membershipType: 'MANAGER',
        status: 'ACTIVE',
        source: 'MANUAL',
        createdById: creatorId
      }
    });

    await membershipAssignmentHooksService.onMembershipCreated(result.id);
    return result;
  }

  async removeManager(userId: string, organizationUnitId: string) {
    await prisma.membership.updateMany({
      where: {
        userId,
        organizationUnitId,
        membershipType: 'MANAGER',
        deletedAt: null
      },
      data: {
        deletedAt: new Date()
      }
    });

    await membershipAssignmentHooksService.onMembershipDeleted(userId, organizationUnitId, null);
    return { success: true };
  }

  async moveUser(userId: string, organizationUnitId: string, createdById?: string) {
    // Verify OU exists and is active
    const ou = await prisma.organizationUnit.findFirst({
      where: { id: organizationUnitId, deletedAt: null }
    });
    if (!ou) {
      throw new Error('Active organization unit not found.');
    }

    // Verify User exists and is active
    const user = await prisma.user.findFirst({
      where: { id: userId, status: 'ACTIVE' }
    });
    if (!user) {
      throw new Error('Active user not found.');
    }

    // Resolve creator ID
    let creatorId = createdById;
    if (!creatorId) {
      const superuser = await prisma.user.findFirst({ where: { isSuperuser: true } });
      if (!superuser) {
        throw new Error('No creator user available.');
      }
      creatorId = superuser.id;
    }

    // Find previous memberships first
    const previousMemberships = await prisma.membership.findMany({
      where: {
        userId,
        membershipType: 'MEMBER',
        organizationUnitId: { not: null },
        deletedAt: null
      },
      select: { organizationUnitId: true }
    });

    // Soft-delete existing MEMBER memberships of this user in any OU (moving them out)
    await prisma.membership.updateMany({
      where: {
        userId,
        membershipType: 'MEMBER',
        organizationUnitId: { not: null },
        deletedAt: null
      },
      data: {
        deletedAt: new Date()
      }
    });

    // Trigger leave hooks
    for (const pm of previousMemberships) {
      if (pm.organizationUnitId) {
        await membershipAssignmentHooksService.onMembershipDeleted(userId, pm.organizationUnitId, null);
      }
    }

    // Create new MEMBER membership
    const result = await prisma.membership.create({
      data: {
        userId,
        organizationUnitId,
        membershipType: 'MEMBER',
        status: 'ACTIVE',
        source: 'MANUAL',
        createdById: creatorId
      }
    });

    // Trigger join hook
    await membershipAssignmentHooksService.onMembershipCreated(result.id);

    return result;
  }

  // Internal helper to walk descendants
  private async getDescendants(nodeId: string): Promise<string[]> {
    const children = await prisma.organizationUnit.findMany({
      where: { parentId: nodeId, deletedAt: null },
      select: { id: true }
    });
    let ids = children.map((c) => c.id);
    for (const child of children) {
      const subIds = await this.getDescendants(child.id);
      ids = ids.concat(subIds);
    }
    return ids;
  }
}

export const organizationUnitService = new OrganizationUnitService();
