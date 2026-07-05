import { prisma } from '../db/prisma';
import { emailService } from '../email/email.service';
import { permissionResolverService } from '../../features/rbac/services/permissionResolver.service';
import crypto from 'crypto';

export class ScheduledTasksService {
  private intervalId: NodeJS.Timeout | null = null;

  start() {
    if (this.intervalId) return;

    // Run immediately on boot to catch up
    this.runAllTasks().catch((err) => {
      console.error('Error running scheduled tasks on startup:', err);
    });

    // Run hourly
    this.intervalId = setInterval(() => {
      this.runAllTasks().catch((err) => {
        console.error('Error in scheduled tasks hourly run:', err);
      });
    }, 60 * 60 * 1000);

    console.log('Scheduled tasks service started (hourly interval).');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async runAllTasks() {
    console.log('[Scheduler] Running all periodic tasks...');
    await this.expireTemporaryGroups();
    await this.sendExpirationReminders();
    await this.purgeExpiredSoftDeletes();
    console.log('[Scheduler] All periodic tasks finished.');
  }

  /**
   * Finds LearningGroups with isTemporary=true, expiresAt in the past, deletedAt still null
   * and soft-deletes them (same lifecycle as manual deletion).
   */
  async expireTemporaryGroups() {
    const now = new Date();
    const groupsToExpire = await prisma.learningGroup.findMany({
      where: {
        isTemporary: true,
        expiresAt: { lte: now },
        deletedAt: null
      }
    });

    for (const group of groupsToExpire) {
      const deletedAt = new Date();
      const permanentDeleteAt = new Date(deletedAt.getTime() + 14 * 24 * 60 * 60 * 1000);
      const deletionBatchId = crypto.randomUUID();

      // Child groups parentGroupId set to null
      await prisma.learningGroup.updateMany({
        where: { parentGroupId: group.id },
        data: { parentGroupId: null }
      });

      // Soft-delete group and its memberships
      await prisma.$transaction([
        prisma.learningGroup.update({
          where: { id: group.id },
          data: {
            deletedAt,
            permanentDeleteAt,
            deletionBatchId
          }
        }),
        prisma.membership.updateMany({
          where: { learningGroupId: group.id, deletedAt: null },
          data: {
            deletedAt,
            deletionBatchId
          }
        })
      ]);

      console.log(`[Scheduler] Expired temporary learning group: "${group.name}" (ID: ${group.id})`);
    }
  }

  /**
   * Finds LearningGroups with expiresAt approaching (e.g. within 3 days) AND reminderSentAt still null,
   * sends notification emails via EmailService, and sets reminderSentAt.
   */
  async sendExpirationReminders() {
    const now = new Date();
    const threshold = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days

    const groupsExpiring = await prisma.learningGroup.findMany({
      where: {
        isTemporary: true,
        expiresAt: {
          gt: now,
          lte: threshold
        },
        reminderSentAt: null,
        deletedAt: null
      },
      include: {
        company: {
          select: {
            contactInfo: true
          }
        },
        memberships: {
          where: {
            deletedAt: null
          },
          include: {
            user: true
          }
        }
      }
    });

    for (const group of groupsExpiring) {
      const recipientEmails = new Set<string>();

      // 1. Resolve users holding the "organization:manage-groups" permission
      try {
        const potentialManagers = await prisma.user.findMany({
          where: {
            status: 'ACTIVE',
            OR: [
              { companyId: group.companyId },
              { isSuperuser: true }
            ]
          }
        });

        for (const user of potentialManagers) {
          const hasPerm = await permissionResolverService.hasPermission(user.id, 'organization', 'manage-groups');
          if (hasPerm && user.email) {
            recipientEmails.add(user.email.trim());
          }
        }
      } catch (err) {
        console.error(`[Scheduler] Failed to resolve HR/LMS managers with organization:manage-groups permission for group "${group.name}":`, err);
      }

      // 2. Add company contact info if it looks like an email
      if (group.company && group.company.contactInfo && group.company.contactInfo.includes('@')) {
        recipientEmails.add(group.company.contactInfo.trim());
      }

      // 3. Add all active members of the group
      for (const m of group.memberships) {
        if (m.user && m.user.email) {
          recipientEmails.add(m.user.email.trim());
        }
      }

      // 4. Fallback to superuser if no recipients resolved
      if (recipientEmails.size === 0) {
        const superuser = await prisma.user.findFirst({
          where: { isSuperuser: true }
        });
        if (superuser) {
          if (superuser.recoveryEmail) {
            recipientEmails.add(superuser.recoveryEmail);
          } else if (superuser.email) {
            recipientEmails.add(superuser.email);
          }
        }
      }

      // Send the emails
      for (const email of recipientEmails) {
        try {
          await emailService.send(email, 'group-expiration', {
            groupName: group.name,
            expiresAt: group.expiresAt!
          });
        } catch (err) {
          console.error(`[Scheduler] Failed to send expiration reminder for group "${group.name}" to ${email}:`, err);
        }
      }

      // Update reminderSentAt
      await prisma.learningGroup.update({
        where: { id: group.id },
        data: { reminderSentAt: new Date() }
      });

      console.log(`[Scheduler] Sent expiration reminders for group "${group.name}" to ${recipientEmails.size} recipients.`);
    }
  }

  /**
   * Permanently deletes OrganizationUnit/LearningGroup rows past their permanentDeleteAt
   * (and memberships are cascade-deleted due to onDelete: Cascade).
   */
  async purgeExpiredSoftDeletes() {
    const now = new Date();

    // 1. Purge OUs
    const ousToPurge = await prisma.organizationUnit.findMany({
      where: {
        deletedAt: { not: null },
        permanentDeleteAt: { lte: now }
      },
      select: { id: true }
    });

    if (ousToPurge.length > 0) {
      const ouIds = ousToPurge.map((o) => o.id);
      // Sever parent self-relations to avoid Restrict violations
      await prisma.organizationUnit.updateMany({
        where: { id: { in: ouIds } },
        data: { parentId: null }
      });
      const deleteResult = await prisma.organizationUnit.deleteMany({
        where: { id: { in: ouIds } }
      });
      console.log(`[Scheduler] Purged ${deleteResult.count} expired soft-deleted organization units.`);
    }

    // 2. Purge LearningGroups
    const groupsToPurge = await prisma.learningGroup.findMany({
      where: {
        deletedAt: { not: null },
        permanentDeleteAt: { lte: now }
      },
      select: { id: true }
    });

    if (groupsToPurge.length > 0) {
      const groupIds = groupsToPurge.map((g) => g.id);
      // Sever parent self-relations
      await prisma.learningGroup.updateMany({
        where: { id: { in: groupIds } },
        data: { parentGroupId: null }
      });
      const deleteResult = await prisma.learningGroup.deleteMany({
        where: { id: { in: groupIds } }
      });
      console.log(`[Scheduler] Purged ${deleteResult.count} expired soft-deleted learning groups.`);
    }
  }
}

export const scheduledTasksService = new ScheduledTasksService();
