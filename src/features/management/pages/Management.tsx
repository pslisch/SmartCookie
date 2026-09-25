/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { ArrowLeft, Users2, BookOpen, Settings2, Palette, Bell } from 'lucide-react';
import { UserGroupManagement } from '../../organization/pages/UserGroupManagement';
import { AssignmentManagement } from '../../assignments/pages/AssignmentManagement';
import { ContentManagement } from '../../assignments/pages/ContentManagement';
import { FieldBuilder } from '../../profiles/pages/FieldBuilder';
import { ThemeManagement } from '../../theme/pages/ThemeManagement';
import { NotificationsHub } from '../../notifications/pages/NotificationsHub';
import { useAuth } from '../../../shared/components/AppGate';
import { usePermission } from '../../../shared/hooks/usePermission';

export const Management: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [view, setView] = useState<'hub' | 'organization' | 'assignments' | 'fields' | 'theme' | 'notifications'>('hub');
  const [assignmentsSubTab, setAssignmentsSubTab] = useState<'dispatcher' | 'catalog'>('dispatcher');

  // People & Access permissions
  const hasRolesManage = usePermission('roles', 'manage');
  const hasUsersView = usePermission('users', 'view');
  const hasOrgView = usePermission('organization', 'view');
  const hasOrgCreate = usePermission('organization', 'create');
  const hasOrgEdit = usePermission('organization', 'edit');
  const hasOrgDelete = usePermission('organization', 'delete');
  const hasOrgManageMembers = usePermission('organization', 'manage-members');
  const hasOrgManageGroups = usePermission('organization', 'manage-groups');
  const hasOrgAccess = hasOrgView || hasOrgCreate || hasOrgEdit || hasOrgDelete || hasOrgManageMembers || hasOrgManageGroups || hasUsersView;
  const hasPeopleAccess = hasRolesManage || hasOrgAccess;

  // Assignments & Content permissions
  const hasAssignmentsAccess =
    usePermission('assignments', 'view') ||
    usePermission('assignments', 'create') ||
    usePermission('assignments', 'edit') ||
    usePermission('assignments', 'delete') ||
    usePermission('assignments', 'assign-own-groups') ||
    usePermission('assignments', 'assign-globally') ||
    usePermission('assignments', 'view-reports') ||
    usePermission('assignments', 'create-mandatory');

  // Field Builder permissions
  const canManageFields = usePermission('profile-fields', 'manage-fields');

  // Theme Management permissions
  const canViewThemes = usePermission('theme', 'view');

  // Notifications permissions
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
      id="management-root"
    >
      {/* Header section with generous space */}
      <div className="border-b border-card-border pb-6 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-4">
          {view !== 'hub' && (
            <button
              onClick={() => setView('hub')}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-card-border bg-card-bg text-text-body shadow-sm transition-colors hover:bg-card-header-bg"
              id="back-to-management-hub-btn"
              title={t('management.backBtn')}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-heading sm:text-3xl font-sans">
              {view === 'hub'
                ? t('management.titleHub')
                : view === 'organization'
                ? t('management.userGroupManagement')
                : view === 'assignments'
                ? t('management.assignments')
                : view === 'fields'
                ? t('settings.fieldBuilder')
                : view === 'theme'
                ? t('settings.themeManagement')
                : t('settings.notifications')}
            </h1>
            <p className="mt-1.5 text-sm text-text-muted max-w-2xl font-sans">
              {view === 'hub'
                ? t('management.hubSubtitle')
                : view === 'organization'
                ? t('management.userGroupManagementSubtitle')
                : view === 'assignments'
                ? t('management.assignmentsSubtitle')
                : view === 'fields'
                ? t('settings.fieldBuilderSubtitle')
                : view === 'theme'
                ? t('settings.themeManagementSubtitle')
                : t('settings.notificationsSubtitle')}
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
              <p className="text-text-muted font-medium leading-none">{t('management.activeSession')}</p>
              <p className="text-text-heading font-bold mt-0.5 leading-none">{user.username}</p>
            </div>
          </div>
        )}
      </div>

      {/* Hub View: Grid of Navigation Cards */}
      {view === 'hub' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="management-hub-grid">
          {hasPeopleAccess && (
            <motion.button
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ y: 0, scale: 0.99 }}
              onClick={() => setView('organization')}
              className="flex flex-col text-left p-6 rounded-2xl border border-card-border bg-card-bg shadow-sm transition-all hover:shadow-md hover:border-link-primary"
              id="card-org-mgmt"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-status-info-bg text-link-primary mb-4">
                <Users2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-text-heading font-sans">
                {t('management.userGroupManagement')}
              </h3>
              <p className="text-sm text-text-muted mt-2 font-sans">
                {t('management.userGroupManagementDesc')}
              </p>
              <span className="text-xs text-link-primary font-semibold mt-4 inline-flex items-center space-x-1">
                <span>{t('management.manageDirectoryBtn')}</span>
                <span>&rarr;</span>
              </span>
            </motion.button>
          )}

          {hasAssignmentsAccess && (
            <motion.button
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ y: 0, scale: 0.99 }}
              onClick={() => setView('assignments')}
              className="flex flex-col text-left p-6 rounded-2xl border border-card-border bg-card-bg shadow-sm transition-all hover:shadow-md hover:border-link-primary"
              id="card-assignment-mgmt"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-status-success-bg text-status-success-text mb-4">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-text-heading font-sans">
                {t('management.assignments')}
              </h3>
              <p className="text-sm text-text-muted mt-2 font-sans">
                {t('management.assignmentsDesc')}
              </p>
              <span className="text-xs text-status-success-text font-semibold mt-4 inline-flex items-center space-x-1">
                <span>{t('management.manageAssignmentsBtn')}</span>
                <span>&rarr;</span>
              </span>
            </motion.button>
          )}

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
      )}

      {/* Sub-Views */}
      {view === 'organization' && hasPeopleAccess && (
        <div className="bg-card-bg p-6 rounded-2xl border border-card-border shadow-sm animate-fade-in" id="org-subview">
          <UserGroupManagement />
        </div>
      )}

      {view === 'assignments' && hasAssignmentsAccess && (
        <div className="bg-card-bg p-6 rounded-2xl border border-card-border shadow-sm animate-fade-in" id="assignments-subview">
          {/* Sub-tabs for assignments module */}
          <div className="flex border-b border-card-border pb-2 mb-6 gap-6" id="assignments-subtabs">
            <button
              onClick={() => setAssignmentsSubTab('dispatcher')}
              className={`pb-2 text-sm font-bold border-b-2 transition-all ${
                assignmentsSubTab === 'dispatcher'
                  ? 'border-link-primary text-text-heading'
                  : 'border-transparent text-text-muted hover:text-text-body'
              }`}
              id="subtab-dispatcher"
            >
              {t('management.subtabDispatcher')}
            </button>
            <button
              onClick={() => setAssignmentsSubTab('catalog')}
              className={`pb-2 text-sm font-bold border-b-2 transition-all ${
                assignmentsSubTab === 'catalog'
                  ? 'border-link-primary text-text-heading'
                  : 'border-transparent text-text-muted hover:text-text-body'
              }`}
              id="subtab-catalog"
            >
              {t('management.subtabCatalog')}
            </button>
          </div>

          {assignmentsSubTab === 'dispatcher' ? (
            <AssignmentManagement />
          ) : (
            <ContentManagement />
          )}
        </div>
      )}

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
