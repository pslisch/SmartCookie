/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Sliders, ArrowLeft, Settings2, Palette, Bell } from 'lucide-react';
import { useAuth } from '../../../shared/components/AppGate';
import { usePermission } from '../../../shared/hooks/usePermission';
import { FieldBuilder } from '../../profiles/pages/FieldBuilder';
import { ThemeManagement } from '../../theme/pages/ThemeManagement';
import { NotificationsHub } from '../../notifications/pages/NotificationsHub';

export const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [view, setView] = useState<'hub' | 'fields' | 'theme' | 'notifications'>('hub');

  const canManageFields = usePermission('profile-fields', 'manage-fields');
  const canViewThemes = usePermission('theme', 'view');
  const canManageNotificationRules = usePermission('notifications', 'manage-rules');
  const canViewDeliveryFailures = usePermission('notifications', 'view-delivery-failures');
  const canManageScheduledNotifications = usePermission('notifications', 'manage-scheduled');
  const canManageEmailTemplates = usePermission('notifications', 'manage-templates');
  const hasNotificationAccess = canManageNotificationRules || canViewDeliveryFailures || canManageScheduledNotifications || canManageEmailTemplates;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
      id="settings-root"
    >
      {/* Header section with generous space */}
      <div className="border-b border-card-border pb-6 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-4">
          {view !== 'hub' && (
            <button
              onClick={() => setView('hub')}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-card-border bg-card-bg text-text-body shadow-sm transition-colors hover:bg-card-header-bg"
              id="back-to-settings-hub-btn"
              title={t('settings.backBtn')}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-heading sm:text-3xl font-sans">
              {view === 'hub'
                ? t('settings.title')
                : view === 'theme'
                ? t('settings.themeManagement')
                : view === 'notifications'
                ? t('settings.notifications')
                : t('settings.fieldBuilder')}
            </h1>
            <p className="mt-1.5 text-sm text-text-muted max-w-2xl font-sans">
              {view === 'hub'
                ? t('settings.hubSubtitle')
                : view === 'theme'
                ? t('settings.themeManagementSubtitle')
                : view === 'notifications'
                ? t('settings.notificationsSubtitle')
                : t('settings.fieldBuilderSubtitle')}
            </p>
          </div>
        </div>

        {/* Current user session pill */}
        {user && (
          <div className="flex items-center space-x-2.5 rounded-2xl border border-card-border bg-card-header-bg px-4 py-2 self-start md:self-auto shadow-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-status-info-bg text-status-info-text font-semibold text-xs">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="text-xs">
              <p className="text-text-muted font-medium leading-none">{t('settings.activeSession')}</p>
              <p className="text-text-heading font-bold mt-0.5 leading-none">{user.username}</p>
            </div>
          </div>
        )}
      </div>

      {/* Hub View */}
      {view === 'hub' && (
        <>
          {canManageFields || canViewThemes || hasNotificationAccess ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" id="settings-hub-grid">
              {canManageFields && (
                <motion.button
                  whileHover={{ y: -3, scale: 1.01 }}
                  whileTap={{ y: 0, scale: 0.99 }}
                  onClick={() => setView('fields')}
                  className="flex flex-col text-left p-6 rounded-2xl border border-card-border bg-card-bg shadow-sm transition-all hover:shadow-md hover:border-link-primary"
                  id="card-field-builder"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-status-info-bg text-link-primary mb-4">
                    <Settings2 className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-text-heading font-sans">
                    {t('settings.fieldBuilder')}
                  </h3>
                  <p className="text-sm text-text-muted mt-2 font-sans">
                    {t('settings.fieldBuilderDesc')}
                  </p>
                  <span className="text-xs text-link-primary font-semibold mt-4 inline-flex items-center space-x-1">
                    <span>{t('settings.manageFieldsBtn')}</span>
                    <span>&rarr;</span>
                  </span>
                </motion.button>
              )}

              {canViewThemes && (
                <motion.button
                  whileHover={{ y: -3, scale: 1.01 }}
                  whileTap={{ y: 0, scale: 0.99 }}
                  onClick={() => setView('theme')}
                  className="flex flex-col text-left p-6 rounded-2xl border border-card-border bg-card-bg shadow-sm transition-all hover:shadow-md hover:border-link-primary"
                  id="card-theme-management"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-status-info-bg text-link-primary mb-4">
                    <Palette className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-text-heading font-sans">
                    {t('settings.themeManagement')}
                  </h3>
                  <p className="text-sm text-text-muted mt-2 font-sans">
                    {t('settings.themeManagementDesc')}
                  </p>
                  <span className="text-xs text-link-primary font-semibold mt-4 inline-flex items-center space-x-1">
                    <span>{t('settings.manageThemesBtn')}</span>
                    <span>&rarr;</span>
                  </span>
                </motion.button>
              )}

              {hasNotificationAccess && (
                <motion.button
                  whileHover={{ y: -3, scale: 1.01 }}
                  whileTap={{ y: 0, scale: 0.99 }}
                  onClick={() => setView('notifications')}
                  className="flex flex-col text-left p-6 rounded-2xl border border-card-border bg-card-bg shadow-sm transition-all hover:shadow-md hover:border-link-primary"
                  id="card-notifications"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-status-info-bg text-link-primary mb-4">
                    <Bell className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-text-heading font-sans">
                    {t('settings.notifications')}
                  </h3>
                  <p className="text-sm text-text-muted mt-2 font-sans">
                    {t('settings.notificationsDesc')}
                  </p>
                  <span className="text-xs text-link-primary font-semibold mt-4 inline-flex items-center space-x-1">
                    <span>{t('settings.manageNotificationsBtn')}</span>
                    <span>&rarr;</span>
                  </span>
                </motion.button>
              )}
            </div>
          ) : (
            /* Empty State message (No permissions config) */
            <div className="flex flex-col items-center justify-center border border-dashed border-card-border rounded-2xl bg-card-bg p-12 text-center shadow-sm" id="settings-empty-state">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-card-header-bg text-text-muted mb-4">
                <Sliders className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-text-heading font-sans">
                {t('settings.title')}
              </h3>
              <p className="text-sm text-text-muted mt-2 max-w-md font-sans">
                {t('settings.emptyState')}
              </p>
            </div>
          )}
        </>
      )}

      {/* Sub-Views */}
      {view === 'fields' && canManageFields && (
        <div className="bg-card-bg p-6 rounded-2xl border border-card-border shadow-sm animate-fade-in" id="fields-subview">
          <FieldBuilder />
        </div>
      )}

      {view === 'theme' && canViewThemes && (
        <div className="bg-card-bg p-6 rounded-2xl border border-card-border shadow-sm animate-fade-in" id="theme-subview">
          <ThemeManagement />
        </div>
      )}

      {view === 'notifications' && hasNotificationAccess && (
        <div className="bg-card-bg p-6 rounded-2xl border border-card-border shadow-sm animate-fade-in" id="notifications-subview">
          <NotificationsHub />
        </div>
      )}
    </motion.div>
  );
};
