import { prisma } from '../../../shared/db/prisma';
import { UserStatus, TokenPurpose } from '@prisma/client';
import { TokenService } from '../../../shared/token/token.service';
import { emailService } from '../../../shared/email/email.service';
import { PASSWORD_RESET_TTL_SECONDS } from '../../../shared/constants';
import { userReactivationService } from './userReactivation.service';
import { organizationUnitService } from '../../organization/services/organizationUnit.service';
import { learningGroupService } from '../../organization/services/learningGroup.service';
import { ProfileFieldValueService } from '../../profiles/services/profileFieldValue.service';
import { auditLogService } from '../../../shared/audit/auditLog.service';

export interface ListUsersFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  roleId?: string;
  organizationUnitId?: string;
}

export class UserManagementService {
  /**
   * Returns a paginated and filtered list of users with their basic info.
   */
  async listUsers(companyId: string, filters: ListUsersFilters) {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      companyId,
    };

    if (filters.search) {
      const searchLower = filters.search.trim();
      where.OR = [
        { firstName: { contains: searchLower } },
        { lastName: { contains: searchLower } },
        { email: { contains: searchLower } },
        { username: { contains: searchLower } },
      ];
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.roleId) {
      where.roleId = filters.roleId;
    }

    if (filters.organizationUnitId) {
      where.memberships = {
        some: {
          organizationUnitId: filters.organizationUnitId,
          deletedAt: null,
          membershipType: 'MEMBER',
        },
      };
    }

    const total = await prisma.user.count({ where });

    const users = await prisma.user.findMany({
      where,
      skip,
      take: limit,
      include: {
        role: true,
        memberships: {
          where: {
            deletedAt: null,
            membershipType: 'MEMBER',
            organizationUnitId: { not: null },
          },
          include: {
            organizationUnit: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mappedUsers = users.map((u) => {
      const memberMembership = u.memberships[0];
      return {
        id: u.id,
        username: u.username,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.email || '',
        status: u.status,
        role: u.role ? { id: u.role.id, name: u.role.name } : null,
        organizationUnit: memberMembership?.organizationUnit
          ? { id: memberMembership.organizationUnit.id, name: memberMembership.organizationUnit.name }
          : null,
      };
    });

    return {
      users: mappedUsers,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Returns complete profile and membership details of a user.
   */
  async getUserDetail(userId: string, requestingUserId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        memberships: {
          where: { deletedAt: null },
          include: {
            organizationUnit: true,
            learningGroup: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error(`User with ID ${userId} not found.`);
    }

    const profileFieldValueService = new ProfileFieldValueService();
    const profile = await profileFieldValueService.getProfile(userId, requestingUserId);

    const organizationUnits = user.memberships
      .filter((m) => m.organizationUnit && !m.deletedAt)
      .map((m) => ({
        id: m.organizationUnit!.id,
        name: m.organizationUnit!.name,
        membershipType: m.membershipType,
      }));

    const learningGroups = user.memberships
      .filter((m) => m.learningGroup && !m.deletedAt)
      .map((m) => ({
        id: m.learningGroup!.id,
        name: m.learningGroup!.name,
      }));

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || user.email || '',
      status: user.status,
      role: user.role ? { id: user.role.id, name: user.role.name } : null,
      organizationUnits,
      learningGroups,
      profile,
    };
  }

  /**
   * Updates standard profile fields, role assignment, and organization / learning group memberships.
   */
  async updateUser(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      roleId?: string | null;
      organizationUnitId?: string | null;
      learningGroupIds?: string[];
    },
    requestingUserId: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new Error(`User with ID ${userId} not found.`);
    }

    const updateData: any = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.roleId !== undefined) updateData.roleId = data.roleId;

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });
    }

    if (data.organizationUnitId !== undefined) {
      if (data.organizationUnitId) {
        await organizationUnitService.moveUser(userId, data.organizationUnitId, requestingUserId);
      } else {
        await prisma.membership.updateMany({
          where: {
            userId,
            membershipType: 'MEMBER',
            organizationUnitId: { not: null },
            deletedAt: null,
          },
          data: {
            deletedAt: new Date(),
          },
        });
      }
    }

    if (data.learningGroupIds !== undefined) {
      const currentMemberships = await prisma.membership.findMany({
        where: {
          userId,
          learningGroupId: { not: null },
          deletedAt: null,
        },
      });
      const currentGroupIds = currentMemberships.map((m) => m.learningGroupId as string);

      const targetGroupIds = data.learningGroupIds;

      const toRemove = currentGroupIds.filter((gId) => !targetGroupIds.includes(gId));
      for (const gId of toRemove) {
        await learningGroupService.removeMember(userId, gId);
      }

      const toAdd = targetGroupIds.filter((gId) => !currentGroupIds.includes(gId));
      for (const gId of toAdd) {
        await learningGroupService.addMember(userId, gId, requestingUserId);
      }
    }

    return { success: true };
  }

  /**
   * Sets the user status to ARCHIVED.
   */
  async archiveUser(userId: string, requestingUserId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new Error(`User with ID ${userId} not found.`);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { status: 'ARCHIVED' },
    });

    await auditLogService.log(
      user.companyId || 'SYSTEM',
      'User',
      userId,
      'ARCHIVE',
      requestingUserId
    );

    return { success: true };
  }

  /**
   * Reactivates the user status, delegating to userReactivationService.
   */
  async restoreUser(userId: string, option: 'RESTORE' | 'FRESH_START', requestingUserId: string) {
    return await userReactivationService.reactivate(userId, option, requestingUserId);
  }

  /**
   * Resets password by generating reset token and sending email.
   */
  async adminResetPassword(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found.');
    }

    if (user.status !== 'ACTIVE') {
      throw new Error('Cannot reset password for a non-active user.');
    }

    if (!user.email) {
      throw new Error('User does not have an email address.');
    }

    const token = await TokenService.issue(user.id, TokenPurpose.PASSWORD_RESET, PASSWORD_RESET_TTL_SECONDS);

    await emailService.send(user.email, 'password-reset', {
      username: user.username || user.email,
      token,
    });

    return { success: true };
  }
}

export const userManagementService = new UserManagementService();
