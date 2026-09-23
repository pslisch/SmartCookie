/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RecipientConfig {
  learner?: boolean;
  directManager?: boolean;
  entireCompany?: boolean;
  groupIds?: string[];
  userIds?: string[];
}

export interface NotificationChannels {
  inLms: boolean;
  email: boolean;
}

export type ScheduledNotificationRecurrence = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type ScheduledNotificationStatus = 'ACTIVE' | 'CANCELLED';

export interface ScheduledNotificationCreatedBy {
  id: string;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

export interface ScheduledNotification {
  id: string;
  companyId: string;
  title: string;
  message: string;
  recipientConfig: RecipientConfig;
  channels: NotificationChannels;
  actionUrl: string | null;
  startAt: string;
  recurrence: ScheduledNotificationRecurrence;
  endAt: string | null;
  status: ScheduledNotificationStatus;
  nextExecutionAt: string;
  lastExecutedAt: string | null;
  createdById: string;
  createdBy?: ScheduledNotificationCreatedBy;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRule {
  id: string;
  companyId: string;
  name: string;
  notificationType: string;
  enabled: boolean;
  mandatory: boolean;
  recipientConfig: RecipientConfig;
  channels: NotificationChannels;
  conditions?: Record<string, any> | null;
  titleKey: string | null;
  bodyKey: string | null;
  actionType: string | null;
  actionUrl: string | null;
  isSystemDefault: boolean;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type NotificationDeliveryStatus = 'PENDING' | 'SENT' | 'FAILED' | 'PERMANENTLY_FAILED';
export type NotificationChannel = 'IN_LMS' | 'EMAIL';

export interface DeliveryFailureRecipient {
  userId: string;
  username: string | null;
  email: string | null;
}

export interface DeliveryFailureNotification {
  instanceId: string;
  sourceEventType: string;
  title: string;
}

export interface DeliveryFailureItem {
  deliveryId: string;
  channel: NotificationChannel;
  status: NotificationDeliveryStatus;
  attemptCount: number;
  lastAttemptAt: string | null;
  errorMessage: string | null;
  recipient: DeliveryFailureRecipient;
  notification: DeliveryFailureNotification;
}

export interface DeliveryFailuresResponse {
  items: DeliveryFailureItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
