import { NotificationType } from '@prisma/client';

export interface NotificationEvent {
  companyId: string;
  notificationType: NotificationType;
  sourceEventType: string;
  sourceEventId: string;
  subjectUserId: string;
  titleParams?: Record<string, unknown>;
  bodyParams?: Record<string, unknown>;
  actionType?: string;
  actionEntityType?: string;
  actionEntityId?: string;
  actionUrl?: string;
}

export interface RecipientConfig {
  learner: boolean;
  directManager: boolean;
  entireCompany: boolean;
  groupIds: string[];
  userIds: string[];
}

export interface NotificationChannels {
  inLms: boolean;
  email: boolean;
}
