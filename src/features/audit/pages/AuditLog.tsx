/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { ScrollText, Settings } from 'lucide-react';
import { usePermission } from '../../../shared/hooks/usePermission';
import { AuditLogView } from './AuditLogView';
import { AuditLogSettings } from './AuditLogSettings';

export type AuditTab = 'log' | 'settings';

export const AuditLog: React.FC = () => {
  const { t } = useTranslation();

  const canViewAudit = usePermission('audit', 'view');
  const canManageRetention = usePermission('audit', 'manage-retention');

  const getFirstPermittedTab = (): AuditTab => {
    if (canViewAudit) return 'log';
    if (canManageRetention) return 'settings';
    return 'log';
  };

  const [activeTab, setActiveTab] = useState<AuditTab>(getFirstPermittedTab);

  // Synchronize active tab if current selection is not permitted or permissions update
  useEffect(() => {
    const isCurrentPermitted =
      (activeTab === 'log' && canViewAudit) ||
      (activeTab === 'settings' && canManageRetention);

    if (!isCurrentPermitted) {
      setActiveTab(getFirstPermittedTab());
    }
  }, [activeTab, canViewAudit, canManageRetention]);

  const hasAnyAccess = canViewAudit || canManageRetention;
  if (!hasAnyAccess) {
    return (
      <div className="p-8 text-center text-status-error-text" id="audit-hub-unauthorized">
        <p className="text-sm font-semibold">{t('audit.unauthorized', 'Unauthorized: You do not have permission to view audit logs or manage retention settings.')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="audit-hub-container">
      {/* Tabs Selection Bar */}
      <div className="border-b border-card-border">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs" id="audit-tabs">
          {canViewAudit && (
            <button
              type="button"
              onClick={() => setActiveTab('log')}
              className={`relative flex items-center space-x-2 py-4 px-1 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'log'
                  ? 'border-link-primary text-link-primary'
                  : 'border-transparent text-text-muted hover:text-text-body hover:border-card-border'
              }`}
              id="tab-btn-log"
            >
              <ScrollText className="h-4 w-4" />
              <span>{t('audit.tabLog', 'Log')}</span>
            </button>
          )}

          {canManageRetention && (
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`relative flex items-center space-x-2 py-4 px-1 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'border-link-primary text-link-primary'
                  : 'border-transparent text-text-muted hover:text-text-body hover:border-card-border'
              }`}
              id="tab-btn-settings"
            >
              <Settings className="h-4 w-4" />
              <span>{t('audit.tabSettings', 'Settings')}</span>
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
        id="audit-tab-content-area"
      >
        {activeTab === 'log' && canViewAudit && <AuditLogView />}
        {activeTab === 'settings' && canManageRetention && <AuditLogSettings />}
      </motion.div>
    </div>
  );
};
