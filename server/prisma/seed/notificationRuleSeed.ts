import { prisma } from '../../src/shared/db/prisma';
import { NotificationType, Prisma } from '@prisma/client';

export interface DefaultNotificationRuleDefinition {
  name: string;
  notificationType: NotificationType;
  mandatory: boolean;
  recipientConfig: {
    learner: boolean;
    directManager: boolean;
    entireCompany: boolean;
    groupIds: string[];
    userIds: string[];
  };
  channels: {
    inLms: boolean;
    email: boolean;
  };
  conditions?: Record<string, unknown>;
  titleKey: string;
  bodyKey: string;
}

export const DEFAULT_NOTIFICATION_RULES: DefaultNotificationRuleDefinition[] = [
  {
    name: 'New Lesson Assigned',
    notificationType: NotificationType.LESSON_ASSIGNED,
    mandatory: false,
    recipientConfig: {
      learner: true,
      directManager: false,
      entireCompany: false,
      groupIds: [],
      userIds: [],
    },
    channels: {
      inLms: true,
      email: true,
    },
    titleKey: 'New Lesson Assigned: {{lessonTitle}}',
    bodyKey: 'You have been assigned "{{lessonTitle}}". Please complete it{{dueDateText}}.',
  },
  {
    name: 'Deadline Reminder (7 days)',
    notificationType: NotificationType.DUE_SOON,
    mandatory: false,
    recipientConfig: {
      learner: true,
      directManager: false,
      entireCompany: false,
      groupIds: [],
      userIds: [],
    },
    channels: {
      inLms: true,
      email: true,
    },
    conditions: { daysBeforeDue: 7 },
    titleKey: 'Upcoming Deadline: {{lessonTitle}}',
    bodyKey: '"{{lessonTitle}}" is due in 7 days ({{dueDate}}).',
  },
  {
    name: 'Deadline Reminder (3 days)',
    notificationType: NotificationType.DUE_SOON,
    mandatory: false,
    recipientConfig: {
      learner: true,
      directManager: false,
      entireCompany: false,
      groupIds: [],
      userIds: [],
    },
    channels: {
      inLms: true,
      email: true,
    },
    conditions: { daysBeforeDue: 3 },
    titleKey: 'Upcoming Deadline: {{lessonTitle}}',
    bodyKey: '"{{lessonTitle}}" is due in 3 days ({{dueDate}}).',
  },
  {
    name: 'Deadline Reminder (1 day)',
    notificationType: NotificationType.DUE_SOON,
    mandatory: false,
    recipientConfig: {
      learner: true,
      directManager: false,
      entireCompany: false,
      groupIds: [],
      userIds: [],
    },
    channels: {
      inLms: true,
      email: true,
    },
    conditions: { daysBeforeDue: 1 },
    titleKey: 'Upcoming Deadline: {{lessonTitle}}',
    bodyKey: '"{{lessonTitle}}" is due tomorrow ({{dueDate}}).',
  },
  {
    name: 'Learner Overdue Notice',
    notificationType: NotificationType.OVERDUE,
    mandatory: false,
    recipientConfig: {
      learner: true,
      directManager: false,
      entireCompany: false,
      groupIds: [],
      userIds: [],
    },
    channels: {
      inLms: true,
      email: true,
    },
    titleKey: 'Overdue: {{lessonTitle}}',
    bodyKey: '"{{lessonTitle}}" was due on {{dueDate}} and is now overdue. Please complete it as soon as possible.',
  },
  {
    name: 'Manager Overdue Notice',
    notificationType: NotificationType.MANAGER_OVERDUE,
    mandatory: false,
    recipientConfig: {
      learner: false,
      directManager: true,
      entireCompany: false,
      groupIds: [],
      userIds: [],
    },
    channels: {
      inLms: true,
      email: true,
    },
    titleKey: 'Team Member Overdue: {{learnerName}}',
    bodyKey: '{{learnerName}} has an overdue assignment: "{{lessonTitle}}" (was due {{dueDate}}).',
  },
  {
    name: 'Learner Completion Confirmation',
    notificationType: NotificationType.COMPLETION_CONFIRMATION,
    mandatory: false,
    recipientConfig: {
      learner: true,
      directManager: false,
      entireCompany: false,
      groupIds: [],
      userIds: [],
    },
    channels: {
      inLms: true,
      email: false,
    },
    titleKey: 'Lesson Completed: {{lessonTitle}}',
    bodyKey: 'You have completed "{{lessonTitle}}". Nice work!',
  },
  {
    name: 'Manager Completion Notice',
    notificationType: NotificationType.MANAGER_COMPLETION,
    mandatory: false,
    recipientConfig: {
      learner: false,
      directManager: true,
      entireCompany: false,
      groupIds: [],
      userIds: [],
    },
    channels: {
      inLms: true,
      email: true,
    },
    titleKey: 'Team Member Completed a Lesson: {{learnerName}}',
    bodyKey: '{{learnerName}} has completed "{{lessonTitle}}".',
  },
];

/**
 * Seed default NotificationRule rows for a single company.
 * Idempotent: checks { companyId, notificationType, name, isSystemDefault: true } before creating.
 */
async function seedNotificationRulesForCompany(companyId: string) {
  for (const def of DEFAULT_NOTIFICATION_RULES) {
    const existing = await prisma.notificationRule.findFirst({
      where: {
        companyId,
        notificationType: def.notificationType,
        name: def.name,
        isSystemDefault: true,
      },
    });

    if (existing) {
      continue;
    }

    console.log(`[Notification Rule Seed] Creating default rule "${def.name}" for company: ${companyId}`);
    await prisma.notificationRule.create({
      data: {
        companyId,
        name: def.name,
        notificationType: def.notificationType,
        enabled: true,
        mandatory: def.mandatory,
        recipientConfig: def.recipientConfig as Prisma.InputJsonValue,
        channels: def.channels as Prisma.InputJsonValue,
        ...(def.conditions ? { conditions: def.conditions as Prisma.InputJsonValue } : {}),
        titleKey: def.titleKey,
        bodyKey: def.bodyKey,
        isSystemDefault: true,
        createdById: null,
      },
    });
  }
}

/**
 * Seed default notification rules across all existing companies, or for a specific target company.
 * Idempotent: safe to run repeatedly on startup or during company setup.
 */
export async function seedNotificationRules(targetCompanyId?: string) {
  console.log('[Notification Rule Seed] Running default notification rules seed...');

  if (targetCompanyId) {
    await seedNotificationRulesForCompany(targetCompanyId);
    console.log(`[Notification Rule Seed] Completed seed for company: ${targetCompanyId}`);
    return;
  }

  const companies = await prisma.company.findMany();

  for (const company of companies) {
    await seedNotificationRulesForCompany(company.id);
  }

  console.log('[Notification Rule Seed] Default notification rules seed complete.');
}
