import { prisma } from '../../../shared/db/prisma';
import { MembershipStatus } from '@prisma/client';

export interface TargetSource {
  targetId: string;
  sourceType: 'MANUAL' | 'ORGANIZATION_UNIT' | 'LEARNING_GROUP';
  organizationUnitId?: string | null;
  learningGroupId?: string | null;
}

export interface ResolvedUser {
  userId: string;
  sources: TargetSource[];
}

export class TargetResolutionService {
  /**
   * Resolves all targets for an assignment into a flat, deduplicated list of user IDs.
   * Each resolved user is annotated with the source target(s) that produced them.
   */
  async resolveTargets(assignmentId: string): Promise<ResolvedUser[]> {
    const targets = await prisma.assignmentTarget.findMany({
      where: { assignmentId },
    });

    const userSourcesMap = new Map<string, TargetSource[]>();

    for (const target of targets) {
      if (target.userId) {
        // userId targets: that user directly.
        const user = await prisma.user.findUnique({
          where: { id: target.userId },
        });

        if (user) {
          const userId = user.id;
          const source: TargetSource = {
            targetId: target.id,
            sourceType: 'MANUAL',
            organizationUnitId: null,
            learningGroupId: null,
          };
          
          if (!userSourcesMap.has(userId)) {
            userSourcesMap.set(userId, []);
          }
          userSourcesMap.get(userId)!.push(source);
        }
      } else if (target.organizationUnitId) {
        // organizationUnitId targets: that OU's direct members PLUS every descendant OU's members
        // Walk the tree down (cascading). Only ACTIVE memberships, only non-deleted OUs.
        const ouIds = await this.getDescendantOUs(target.organizationUnitId);
        
        if (ouIds.length > 0) {
          const memberships = await prisma.membership.findMany({
            where: {
              organizationUnitId: { in: ouIds },
              status: MembershipStatus.ACTIVE,
              deletedAt: null,
            },
            select: { userId: true },
          });

          for (const membership of memberships) {
            const userId = membership.userId;
            const source: TargetSource = {
              targetId: target.id,
              sourceType: 'ORGANIZATION_UNIT',
              organizationUnitId: target.organizationUnitId,
              learningGroupId: null,
            };

            if (!userSourcesMap.has(userId)) {
              userSourcesMap.set(userId, []);
            }
            // Avoid duplicate sources of the exact same targetId for the same user
            const existingSources = userSourcesMap.get(userId)!;
            if (!existingSources.some(s => s.targetId === target.id)) {
              existingSources.push(source);
            }
          }
        }
      } else if (target.learningGroupId) {
        // learningGroupId targets: that group's direct members ONLY - no cascading
        const group = await prisma.learningGroup.findFirst({
          where: { id: target.learningGroupId, deletedAt: null },
        });

        if (group) {
          const memberships = await prisma.membership.findMany({
            where: {
              learningGroupId: target.learningGroupId,
              status: MembershipStatus.ACTIVE,
              deletedAt: null,
            },
            select: { userId: true },
          });

          for (const membership of memberships) {
            const userId = membership.userId;
            const source: TargetSource = {
              targetId: target.id,
              sourceType: 'LEARNING_GROUP',
              organizationUnitId: null,
              learningGroupId: target.learningGroupId,
            };

            if (!userSourcesMap.has(userId)) {
              userSourcesMap.set(userId, []);
            }
            const existingSources = userSourcesMap.get(userId)!;
            if (!existingSources.some(s => s.targetId === target.id)) {
              existingSources.push(source);
            }
          }
        }
      }
    }

    const resolvedUsers: ResolvedUser[] = [];
    for (const [userId, sources] of userSourcesMap.entries()) {
      resolvedUsers.push({ userId, sources });
    }

    return resolvedUsers;
  }

  /**
   * Helper to perform cycle-safe BFS to find all descendant OU IDs including the root OU ID.
   * Only returns/walks OUs where deletedAt is null.
   */
  private async getDescendantOUs(rootOuId: string): Promise<string[]> {
    const rootOu = await prisma.organizationUnit.findUnique({
      where: { id: rootOuId },
    });
    if (!rootOu || rootOu.deletedAt !== null) {
      return [];
    }

    const result: string[] = [rootOuId];
    const queue: string[] = [rootOuId];
    const visited = new Set<string>([rootOuId]);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = await prisma.organizationUnit.findMany({
        where: {
          parentId: currentId,
          deletedAt: null,
        },
        select: { id: true },
      });

      for (const child of children) {
        if (!visited.has(child.id)) {
          visited.add(child.id);
          result.push(child.id);
          queue.push(child.id);
        }
      }
    }

    return result;
  }
}

export const targetResolutionService = new TargetResolutionService();
