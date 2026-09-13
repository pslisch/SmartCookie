import { prisma } from '../db/prisma';
import { emailService } from '../email/email.service';
import { permissionResolverService } from '../../features/rbac/services/permissionResolver.service';
import crypto from 'crypto';
import { NotificationType, ThemeStatus, AssignmentStatus, UserAssignmentInstanceStatus } from '@prisma/client';
import { entraSyncService } from '../../features/identity/services/entraSync.service';
import { processPendingEmailDeliveries } from '../../features/notifications/services/emailDelivery.service';

async function shouldSendNotification(
  userId: string,
  companyId: string,
  type: NotificationType
): Promise<boolean> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { mandatoryNotificationTypes: true },
  });

  if (company && company.mandatoryNotificationTypes) {
    const mandatoryList = company.mandatoryNotificationTypes as string[];
    if (Array.isArray(mandatoryList) && mandatoryList.includes(type)) {
      return true; // Mandatory company-wide
    }
  }

  const pref = await prisma.notificationPreference.findUnique({
    where: {
      userId_notificationType: {
        userId,
        notificationType: type,
      },
    },
  });

  if (pref) {
    return pref.emailEnabled;
  }

  return true; // Defaults to enabled
}

async function filterNotificationRecipients(emails: Set<string>, type: NotificationType): Promise<string[]> {
  const emailList = Array.from(emails);
  if (emailList.length === 0) return [];

  const users = await prisma.user.findMany({
    where: {
      email: { in: emailList },
      status: 'ACTIVE',
    },
    select: {
      id: true,
      email: true,
      companyId: true,
    },
  });

  const allowedEmails: string[] = [];

  for (const email of emailList) {
    const user = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) {
      allowedEmails.push(email);
      continue;
    }

    const companyId = user.companyId;
    if (!companyId) {
      allowedEmails.push(email);
      continue;
    }

    const shouldSend = await shouldSendNotification(user.id, companyId, type);
    if (shouldSend) {
      allowedEmails.push(email);
    }
  }

  return allowedEmails;
}

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
    await this.activateScheduledAssignments();
    await this.purgeExpiredAssignments();
    await this.sendBasicReminders();
    await this.runEntraSync();
    await this.activateScheduledThemes();
    await processPendingEmailDeliveries();
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

        const potentialManagerIds = potentialManagers.map(u => u.id);
        const authorizedManagerIds = await permissionResolverService.filterUsersWithPermission(potentialManagerIds, 'organization', 'manage-groups');
        const authorizedManagers = potentialManagers.filter(u => authorizedManagerIds.includes(u.id));

        for (const user of authorizedManagers) {
          if (user.email) {
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
      const allowedRecipients = await filterNotificationRecipients(recipientEmails, 'REMINDER');
      for (const email of allowedRecipients) {
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

      console.log(`[Scheduler] Sent expiration reminders for group "${group.name}" to ${allowedRecipients.length} allowed recipients (out of ${recipientEmails.size} total).`);
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

    // 3. Purge Themes
    const themesToPurge = await prisma.theme.findMany({
      where: {
        deletedAt: { not: null },
        permanentDeleteAt: { lte: now }
      },
      select: { id: true }
    });

    if (themesToPurge.length > 0) {
      const themeIds = themesToPurge.map((t) => t.id);
      const deleteResult = await prisma.theme.deleteMany({
        where: { id: { in: themeIds } }
      });
      console.log(`[Scheduler] Purged ${deleteResult.count} expired soft-deleted themes.`);
    }
  }

  /**
   * Permanently deletes soft-deleted Assignment and UserAssignmentInstance rows past their permanentDeleteAt.
   */
  async purgeExpiredAssignments() {
    const now = new Date();

    // 1. Purge UserAssignmentInstances past permanentDeleteAt
    const instancesToPurge = await prisma.userAssignmentInstance.findMany({
      where: {
        deletedAt: { not: null },
        permanentDeleteAt: { lte: now }
      },
      select: { id: true }
    });

    if (instancesToPurge.length > 0) {
      const instanceIds = instancesToPurge.map((i) => i.id);
      const deleteResult = await prisma.userAssignmentInstance.deleteMany({
        where: { id: { in: instanceIds } }
      });
      console.log(`[Scheduler] Purged ${deleteResult.count} expired soft-deleted user assignment instances.`);
    }

    // 2. Purge Assignments past permanentDeleteAt
    const assignmentsToPurge = await prisma.assignment.findMany({
      where: {
        deletedAt: { not: null },
        permanentDeleteAt: { lte: now }
      },
      select: { id: true }
    });

    if (assignmentsToPurge.length > 0) {
      const assignmentIds = assignmentsToPurge.map((a) => a.id);
      const deleteResult = await prisma.assignment.deleteMany({
        where: { id: { in: assignmentIds } }
      });
      console.log(`[Scheduler] Purged ${deleteResult.count} expired soft-deleted assignments.`);
    }
  }

  /**
   * For ACTIVE, non-completed instances past their dueDate (or a configurable interval before it),
   * send ONE reminder email via EmailService if none sent in the last 14 days (track via lastReminderSentAt).
   */
  async sendBasicReminders() {
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const instancesToRemind = await prisma.userAssignmentInstance.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        dueDate: { lt: now },
        OR: [
          { lastReminderSentAt: null },
          { lastReminderSentAt: { lte: fourteenDaysAgo } }
        ]
      },
      include: {
        user: true,
        assignment: {
          include: {
            lesson: {
              select: {
                title: true
              }
            }
          }
        }
      }
    });

    for (const instance of instancesToRemind) {
      if (!instance.user || !instance.user.email) {
        continue;
      }

      if (instance.user.companyId) {
        const shouldSend = await shouldSendNotification(instance.user.id, instance.user.companyId, 'REMINDER');
        if (!shouldSend) {
          console.log(`[Scheduler] Skipping assignment reminder to ${instance.user.email} due to notification preference.`);
          continue;
        }
      }

      try {
        await emailService.send(instance.user.email, 'assignment-reminder', {
          lessonTitle: instance.assignment.lesson.title,
          dueDate: instance.dueDate
        });

        // Update lastReminderSentAt
        await prisma.userAssignmentInstance.update({
          where: { id: instance.id },
          data: { lastReminderSentAt: now }
        });

        console.log(`[Scheduler] Sent learning assignment reminder to ${instance.user.email} for "${instance.assignment.lesson.title}"`);
      } catch (err) {
        console.error(`[Scheduler] Failed to send assignment reminder for instance ${instance.id} to ${instance.user.email}:`, err);
      }
    }
  }

  async runEntraSync() {
    console.log('[Scheduler] Checking if Entra Sync is due...');
    const now = new Date();
    const currentHour = now.getHours();

    // Gate: is it past 03:00?
    if (currentHour < 3) {
      console.log(`[Scheduler] Entra sync skipped: current hour (${currentHour}) is before 03:00.`);
      return;
    }

    try {
      // Find all companies with an enabled MICROSOFT_ENTRA configuration
      const configs = await prisma.identityProviderConfig.findMany({
        where: {
          providerType: 'MICROSOFT_ENTRA',
          enabled: true,
        },
      });

      const todayString = now.toDateString();

      for (const config of configs) {
        const companyId = config.companyId;

        // Check if we already ran scheduled sync today for this company
        const lastSync = await prisma.syncLog.findFirst({
          where: {
            companyId,
            triggeredBy: 'SCHEDULED',
          },
          orderBy: {
            startedAt: 'desc',
          },
        });

        const alreadyRanToday = lastSync && lastSync.startedAt.toDateString() === todayString;

        if (alreadyRanToday) {
          console.log(`[Scheduler] Entra sync already ran today (${todayString}) for company: ${companyId}`);
          continue;
        }

        console.log(`[Scheduler] Executing scheduled Entra sync for company: ${companyId}`);
        try {
          await entraSyncService.runSync(companyId, 'SCHEDULED');
        } catch (err: any) {
          console.error(`[Scheduler] Entra sync failed for company ${companyId}:`, err);
        }
      }
    } catch (err: any) {
      console.error('[Scheduler] Error in runEntraSync:', err);
    }
  }

  /**
   * Finds all READY themes with scheduledActivationAt <= now and deletedAt null,
   * grouped by company. For each, attempts the atomic activation transaction
   * (target -> ACTIVE, previous Active -> READY, clear scheduledActivationAt).
   *
   * On failure: sets scheduledActivationFailedAt = now,
   * scheduledActivationFailedReason = error message; leaves the theme READY with
   * schedule cleared (does not retry indefinitely); leaves current Active theme untouched.
   */
  async activateScheduledThemes() {
    const now = new Date();

    const dueThemes = await prisma.theme.findMany({
      where: {
        status: ThemeStatus.READY,
        scheduledActivationAt: { lte: now },
        deletedAt: null,
      },
      orderBy: {
        scheduledActivationAt: 'asc',
      },
    });

    if (dueThemes.length === 0) {
      return;
    }

    console.log(`[Scheduler] Found ${dueThemes.length} scheduled theme activation(s) due.`);

    // Group by companyId
    const companyThemeMap = new Map<string, typeof dueThemes>();
    for (const theme of dueThemes) {
      const list = companyThemeMap.get(theme.companyId) || [];
      list.push(theme);
      companyThemeMap.set(theme.companyId, list);
    }

    for (const [companyId, themes] of companyThemeMap.entries()) {
      for (const theme of themes) {
        try {
          console.log(
            `[Scheduler] Activating scheduled theme "${theme.name}" (ID: ${theme.id}) for company ${companyId}...`
          );

          // Validate that referenced fonts exist before activating
          const fontIds = [
            theme.generalFontId,
            theme.navFontId,
            theme.headingsFontId,
            theme.buttonsFontId,
            theme.formsFontId,
            theme.cardsFontId,
            theme.linksFontId,
            theme.statusFontId,
          ].filter((id): id is string => typeof id === 'string' && id.trim().length > 0);

          if (fontIds.length > 0) {
            const existingFonts = await prisma.font.findMany({
              where: {
                id: { in: fontIds },
                companyId,
              },
              select: { id: true },
            });
            const foundSet = new Set(existingFonts.map((f) => f.id));
            const danglingIds = fontIds.filter((id) => !foundSet.has(id));
            if (danglingIds.length > 0) {
              throw new Error(
                `Font reference(s) ${danglingIds.join(', ')} do not exist in company font library.`
              );
            }
          }

          // Atomic activation transaction (same as immediate activate in Task 6):
          await prisma.$transaction(async (tx) => {
            // 1. Demote any currently ACTIVE theme(s) for this company to READY
            await tx.theme.updateMany({
              where: {
                companyId,
                status: ThemeStatus.ACTIVE,
                id: { not: theme.id },
                deletedAt: null,
              },
              data: {
                status: ThemeStatus.READY,
              },
            });

            // 2. Promote target theme to ACTIVE and clear scheduled timestamps
            await tx.theme.update({
              where: { id: theme.id },
              data: {
                status: ThemeStatus.ACTIVE,
                scheduledActivationAt: null,
                scheduledActivationFailedAt: null,
                scheduledActivationFailedReason: null,
              },
            });
          });

          console.log(
            `[Scheduler] Successfully activated scheduled theme "${theme.name}" (ID: ${theme.id}) for company ${companyId}.`
          );
        } catch (err: any) {
          const errorMessage = err?.message || 'Unknown error during scheduled activation.';
          console.error(
            `[Scheduler] Failed to activate scheduled theme "${theme.name}" (ID: ${theme.id}) for company ${companyId}:`,
            err
          );

          // On failure: set scheduledActivationFailedAt = now, scheduledActivationFailedReason = error message;
          // leave the theme READY with schedule cleared (do not retry indefinitely);
          // leave the current Active theme untouched.
          try {
            await prisma.theme.update({
              where: { id: theme.id },
              data: {
                status: ThemeStatus.READY,
                scheduledActivationAt: null,
                scheduledActivationFailedAt: new Date(),
                scheduledActivationFailedReason: errorMessage,
              },
            });
            console.log(
              `[Scheduler] Marked scheduled activation as failed for theme "${theme.name}" (ID: ${theme.id}). Current active theme remains untouched.`
            );
          } catch (updateErr: any) {
            console.error(
              `[Scheduler] Failed to record scheduled activation failure for theme "${theme.name}" (ID: ${theme.id}):`,
              updateErr
            );
          }
        }
      }
    }
  }

  /**
   * Activates SCHEDULED assignments whose scheduledFor timestamp has passed,
   * transitioning both the Assignment and its SCHEDULED UserAssignmentInstance rows to ACTIVE.
   */
  async activateScheduledAssignments(): Promise<void> {
    const now = new Date();

    const scheduledAssignments = await prisma.assignment.findMany({
      where: {
        status: AssignmentStatus.SCHEDULED,
        scheduledFor: { lte: now },
        deletedAt: null,
      },
      select: { id: true },
    });

    if (scheduledAssignments.length === 0) {
      return;
    }

    let activatedCount = 0;

    for (const assignment of scheduledAssignments) {
      try {
        await prisma.$transaction([
          prisma.assignment.update({
            where: { id: assignment.id },
            data: { status: AssignmentStatus.ACTIVE },
          }),
          prisma.userAssignmentInstance.updateMany({
            where: {
              assignmentId: assignment.id,
              status: UserAssignmentInstanceStatus.SCHEDULED,
            },
            data: { status: UserAssignmentInstanceStatus.ACTIVE },
          }),
        ]);

        activatedCount++;
      } catch (err) {
        console.error(`[Scheduler] Failed to activate scheduled assignment (ID: ${assignment.id}):`, err);
      }
    }

    console.log(`[Scheduler] Activated ${activatedCount} scheduled assignment(s).`);
  }
}

export const scheduledTasksService = new ScheduledTasksService();
