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
