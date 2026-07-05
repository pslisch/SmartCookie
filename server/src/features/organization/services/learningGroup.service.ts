import { prisma } from '../../../shared/db/prisma';
import crypto from 'crypto';

export class LearningGroupService {
  async create(
    name: string,
    parentGroupId: string | null = null,
    isTemporary: boolean = false,
    expiresAt: Date | null = null,
    companyId?: string
  ) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Learning group name is required.');
    }

    // Resolve companyId
    let resolvedCompanyId = companyId;
    if (!resolvedCompanyId) {
      const company = await prisma.company.findFirst();
      if (!company) {
        throw new Error('No company found to associate with this learning group.');
      }
      resolvedCompanyId = company.id;
    }

    if (parentGroupId) {
      const parent = await prisma.learningGroup.findFirst({
        where: { id: parentGroupId, deletedAt: null }
      });
      if (!parent) {
        throw new Error(`Parent learning group with ID ${parentGroupId} not found or has been soft-deleted.`);
      }
    }

    return await prisma.learningGroup.create({
      data: {
        name: trimmedName,
        companyId: resolvedCompanyId,
        parentGroupId: parentGroupId || null,
        isTemporary,
        expiresAt: isTemporary ? expiresAt : null
      }
    });
  }

  async rename(id: string, newName: string) {
    const trimmedName = newName.trim();
    if (!trimmedName) {
      throw new Error('New name is required.');
    }

    const group = await prisma.learningGroup.findFirst({
      where: { id, deletedAt: null }
    });
    if (!group) {
      throw new Error(`Learning group with ID ${id} not found or has been soft-deleted.`);
    }

    return await prisma.learningGroup.update({
      where: { id },
      data: { name: trimmedName }
    });
  }

  async move(id: string, newParentGroupId: string | null) {
    const group = await prisma.learningGroup.findFirst({
      where: { id, deletedAt: null }
    });
    if (!group) {
      throw new Error(`Learning group with ID ${id} not found or has been soft-deleted.`);
    }

    if (newParentGroupId !== null) {
      if (newParentGroupId === id) {
        throw new Error('A learning group cannot be its own parent.');
      }

      // Walk ancestor chain for cycle prevention
      let currentId: string | null = newParentGroupId;
      const visited = new Set<string>();

      while (currentId) {
        if (currentId === id) {
          throw new Error(
            'Circular dependency detected: Setting this parent would create a loop in the learning group hierarchy.'
          );
        }
        if (visited.has(currentId)) {
          break;
        }
        visited.add(currentId);

        const parentGroup = await prisma.learningGroup.findFirst({
          where: { id: currentId, deletedAt: null }
        });
        if (!parentGroup) {
          throw new Error(`Parent learning group with ID ${currentId} not found or has been soft-deleted.`);
        }
        currentId = parentGroup.parentGroupId;
      }
    }

    return await prisma.learningGroup.update({
      where: { id },
      data: { parentGroupId: newParentGroupId }
    });
  }

  async addMember(userId: string, learningGroupId: string, createdById?: string) {
    // Verify group exists and is active
    const group = await prisma.learningGroup.findFirst({
      where: { id: learningGroupId, deletedAt: null }
    });
    if (!group) {
      throw new Error('Active learning group not found.');
    }

    // Verify user exists and is active
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

    // Check if membership already exists (active)
    const existing = await prisma.membership.findFirst({
      where: {
        userId,
        learningGroupId,
        deletedAt: null
      }
    });
    if (existing) {
      return existing;
    }

    return await prisma.membership.create({
      data: {
        userId,
        learningGroupId,
        membershipType: 'MEMBER', // MANAGER is OU-only, reject if attempted
        status: 'ACTIVE',
        source: 'MANUAL',
        createdById: creatorId
      }
    });
  }

  async removeMember(userId: string, learningGroupId: string) {
    await prisma.membership.updateMany({
      where: {
        userId,
        learningGroupId,
        deletedAt: null
      },
      data: {
        deletedAt: new Date()
      }
    });
    return { success: true };
  }

  async delete(id: string) {
    const target = await prisma.learningGroup.findUnique({
      where: { id }
    });
    if (!target) {
      throw new Error(`Learning group with ID ${id} not found.`);
    }

    const deletedAt = new Date();
    const permanentDeleteAt = new Date(deletedAt.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days
    const deletionBatchId = crypto.randomUUID();

    // Child groups simply become top-level groups (parentGroupId = null)
    await prisma.learningGroup.updateMany({
      where: { parentGroupId: id },
      data: { parentGroupId: null }
    });

    await prisma.$transaction([
      prisma.learningGroup.update({
        where: { id },
        data: {
          deletedAt,
          permanentDeleteAt,
          deletionBatchId
        }
      }),
      prisma.membership.updateMany({
        where: { learningGroupId: id, deletedAt: null },
        data: {
          deletedAt,
          deletionBatchId
        }
      })
    ]);

    return { success: true };
  }

  async restore(id: string) {
    const target = await prisma.learningGroup.findFirst({
      where: { id, deletedAt: { not: null } }
    });
    if (!target) {
      throw new Error(`Deleted learning group with ID ${id} not found.`);
    }

    if (target.permanentDeleteAt && new Date() > target.permanentDeleteAt) {
      throw new Error('The 14-day restoration window has expired.');
    }

    const { deletionBatchId } = target;
    if (!deletionBatchId) {
      throw new Error('Deletion batch ID missing on the deleted learning group.');
    }

    await prisma.$transaction([
      prisma.learningGroup.updateMany({
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
}

export const learningGroupService = new LearningGroupService();
