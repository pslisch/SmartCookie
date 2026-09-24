/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Bell, AlertTriangle, CalendarClock, FileCode } from 'lucide-react';
import { usePermission } from '../../../shared/hooks/usePermission';
import { NotificationRuleManagement } from './NotificationRuleManagement';
import { DeliveryFailures } from './DeliveryFailures';
import { ScheduledNotificationManagement } from './ScheduledNotificationManagement';
import { EmailTemplateManagement } from './EmailTemplateManagement';

export type NotificationTab = 'rules' | 'delivery-failures' | 'scheduled' | 'templates';

export const NotificationsHub: React.FC = () => {
  const { t } = useTranslation();

  const canManageRules = usePermission('notifications', 'manage-rules');
  const canViewDeliveryFailures = usePermission('notifications', 'view-delivery-failures');
  const canManageScheduled = usePermission('notifications', 'manage-scheduled');
  const canManageTemplates = usePermission('notifications', 'manage-templates');

  const getFirstPermittedTab = (): NotificationTab => {
    if (canManageRules) return 'rules';
    if (canViewDeliveryFailures) return 'delivery-failures';
    if (canManageScheduled) return 'scheduled';
    if (canManageTemplates) return 'templates';
    return 'rules';
  };

  const [activeTab, setActiveTab] = useState<NotificationTab>(getFirstPermittedTab);

  // Synchronize active tab if current selection is not permitted or permissions update
  useEffect(() => {
    const isCurrentPermitted =
      (activeTab === 'rules' && canManageRules) ||
      (activeTab === 'delivery-failures' && canViewDeliveryFailures) ||
      (activeTab === 'scheduled' && canManageScheduled) ||
      (activeTab === 'templates' && canManageTemplates);

    if (!isCurrentPermitted) {
      setActiveTab(getFirstPermittedTab());
    }
  }, [activeTab, canManageRules, canViewDeliveryFailures, canManageScheduled, canManageTemplates]);

  const hasAnyAccess = canManageRules || canViewDeliveryFailures || canManageScheduled || canManageTemplates;
  if (!hasAnyAccess) {
    return null;
  }

  return (
    <div className="space-y-6" id="notifications-hub-container">
      {/* Tabs Selection Bar */}
      <div className="border-b border-card-border">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs" id="notifications-tabs">
          {canManageRules && (
            <button
              onClick={() => setActiveTab('rules')}
              className={`relative flex items-center space-x-2 py-4 px-1 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'rules'
                  ? 'border-link-primary text-link-primary'
                  : 'border-transparent text-text-muted hover:text-text-body hover:border-card-border'
              }`}
              id="tab-btn-rules"
            >
              <Bell className="h-4 w-4" />
              <span>{t('settings.notificationsTabs.rules')}</span>
            </button>
          )}

          {canViewDeliveryFailures && (
            <button
              onClick={() => setActiveTab('delivery-failures')}
              className={`relative flex items-center space-x-2 py-4 px-1 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'delivery-failures'
                  ? 'border-link-primary text-link-primary'
                  : 'border-transparent text-text-muted hover:text-text-body hover:border-card-border'
              }`}
              id="tab-btn-delivery-failures"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>{t('settings.notificationsTabs.deliveryFailures')}</span>
            </button>
          )}

          {canManageScheduled && (
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`relative flex items-center space-x-2 py-4 px-1 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'scheduled'
                  ? 'border-link-primary text-link-primary'
                  : 'border-transparent text-text-muted hover:text-text-body hover:border-card-border'
              }`}
              id="tab-btn-scheduled"
            >
              <CalendarClock className="h-4 w-4" />
              <span>{t('settings.notificationsTabs.scheduled')}</span>
            </button>
          )}

          {canManageTemplates && (
            <button
              onClick={() => setActiveTab('templates')}
              className={`relative flex items-center space-x-2 py-4 px-1 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'templates'
                  ? 'border-link-primary text-link-primary'
                  : 'border-transparent text-text-muted hover:text-text-body hover:border-card-border'
              }`}
              id="tab-btn-templates"
            >
              <FileCode className="h-4 w-4" />
              <span>{t('settings.notificationsTabs.templates')}</span>
            </button>
          )}
        </nav>
      </div>

      {/* Tab Contents */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="pt-2"
        id="notifications-tab-content-area"
      >
        {activeTab === 'rules' && canManageRules && <NotificationRuleManagement />}
        {activeTab === 'delivery-failures' && canViewDeliveryFailures && <DeliveryFailures />}
        {activeTab === 'scheduled' && canManageScheduled && <ScheduledNotificationManagement />}
        {activeTab === 'templates' && canManageTemplates && <EmailTemplateManagement />}
      </motion.div>
    </div>
  );
};
