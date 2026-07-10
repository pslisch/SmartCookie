/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { ShieldAlert, ArrowLeft, Users2, BookOpen } from 'lucide-react';
import { RoleManagement } from '../../rbac/pages/RoleManagement';
import { UserGroupManagement } from '../../organization/pages/UserGroupManagement';
import { AssignmentManagement } from '../../assignments/pages/AssignmentManagement';
import { ContentManagement } from '../../assignments/pages/ContentManagement';
import { useAuth } from '../../../shared/components/AppGate';
import { usePermission } from '../../../shared/hooks/usePermission';

export const Management: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [view, setView] = useState<'hub' | 'roles' | 'organization' | 'assignments'>('hub');
  const [assignmentsSubTab, setAssignmentsSubTab] = useState<'dispatcher' | 'catalog'>('dispatcher');

  const hasRolesManage = usePermission('roles', 'manage');
  
  const hasOrgView = usePermission('organization', 'view');
  const hasOrgCreate = usePermission('organization', 'create');
  const hasOrgEdit = usePermission('organization', 'edit');
  const hasOrgDelete = usePermission('organization', 'delete');
  const hasOrgManageMembers = usePermission('organization', 'manage-members');
  const hasOrgManageGroups = usePermission('organization', 'manage-groups');
  const hasOrgAccess = hasOrgView || hasOrgCreate || hasOrgEdit || hasOrgDelete || hasOrgManageMembers || hasOrgManageGroups;

  const hasAssignmentsAccess =
    usePermission('assignments', 'view') ||
    usePermission('assignments', 'create') ||
    usePermission('assignments', 'edit') ||
    usePermission('assignments', 'delete') ||
    usePermission('assignments', 'assign-own-groups') ||
    usePermission('assignments', 'assign-globally') ||
    usePermission('assignments', 'view-reports') ||
    usePermission('assignments', 'create-mandatory');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
      id="management-root"
    >
      {/* Header section with generous space */}
      <div className="border-b border-slate-100 pb-6 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-4">
          {view !== 'hub' && (
            <button
              onClick={() => setView('hub')}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
              id="back-to-management-hub-btn"
              title={t('management.backBtn')}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl font-sans">
              {view === 'hub'
                ? t('management.titleHub')
                : view === 'roles'
                ? t('management.roles')
                : view === 'organization'
                ? t('management.userGroupManagement')
                : t('management.assignments')}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500 max-w-2xl font-sans">
              {view === 'hub'
                ? t('management.hubSubtitle')
                : view === 'roles'
                ? t('management.rolesSubtitle')
                : view === 'organization'
                ? t('management.userGroupManagementSubtitle')
                : t('management.assignmentsSubtitle')}
            </p>
          </div>
        </div>

        {/* Current user session pill */}
        {user && (
          <div className="flex items-center space-x-2.5 rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-2 self-start md:self-auto shadow-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold text-xs">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="text-xs">
              <p className="text-slate-400 font-medium leading-none">{t('management.activeSession')}</p>
              <p className="text-slate-800 font-bold mt-0.5 leading-none">{user.username}</p>
            </div>
          </div>
        )}
      </div>

      {/* Hub View: Grid of Navigation Cards */}
      {view === 'hub' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="management-hub-grid">
          {hasRolesManage && (
            <motion.button
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ y: 0, scale: 0.99 }}
              onClick={() => setView('roles')}
              className="flex flex-col text-left p-6 rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-blue-300"
              id="card-role-mgmt"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-4">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-sans">
                {t('management.roles')}
              </h3>
              <p className="text-sm text-slate-500 mt-2 font-sans">
                {t('management.rolesDesc')}
              </p>
              <span className="text-xs text-blue-600 font-semibold mt-4 inline-flex items-center space-x-1">
                <span>{t('management.managePermissionsBtn')}</span>
                <span>&rarr;</span>
              </span>
            </motion.button>
          )}

          {hasOrgAccess && (
            <motion.button
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ y: 0, scale: 0.99 }}
              onClick={() => setView('organization')}
              className="flex flex-col text-left p-6 rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-blue-300"
              id="card-org-mgmt"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 mb-4">
                <Users2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-sans">
                {t('management.userGroupManagement')}
              </h3>
              <p className="text-sm text-slate-500 mt-2 font-sans">
                {t('management.userGroupManagementDesc')}
              </p>
              <span className="text-xs text-indigo-600 font-semibold mt-4 inline-flex items-center space-x-1">
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
              className="flex flex-col text-left p-6 rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-blue-300"
              id="card-assignment-mgmt"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-4">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-sans">
                {t('management.assignments')}
              </h3>
              <p className="text-sm text-slate-500 mt-2 font-sans">
                {t('management.assignmentsDesc')}
              </p>
              <span className="text-xs text-emerald-600 font-semibold mt-4 inline-flex items-center space-x-1">
                <span>{t('management.manageAssignmentsBtn')}</span>
                <span>&rarr;</span>
              </span>
            </motion.button>
          )}
        </div>
      )}

      {/* Sub-Views */}
      {view === 'roles' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm" id="roles-subview">
          <RoleManagement />
        </div>
      )}

      {view === 'organization' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm" id="org-subview">
          <UserGroupManagement />
        </div>
      )}

      {view === 'assignments' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm" id="assignments-subview">
          {/* Sub-tabs for assignments module */}
          <div className="flex border-b border-slate-150 pb-2 mb-6 gap-6" id="assignments-subtabs">
            <button
              onClick={() => setAssignmentsSubTab('dispatcher')}
              className={`pb-2 text-sm font-bold border-b-2 transition-all ${
                assignmentsSubTab === 'dispatcher'
                  ? 'border-blue-600 text-slate-800'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
              id="subtab-dispatcher"
            >
              Assignments & Distribution
            </button>
            <button
              onClick={() => setAssignmentsSubTab('catalog')}
              className={`pb-2 text-sm font-bold border-b-2 transition-all ${
                assignmentsSubTab === 'catalog'
                  ? 'border-blue-600 text-slate-800'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
              id="subtab-catalog"
            >
              Course & Lesson Catalog
            </button>
          </div>

          {assignmentsSubTab === 'dispatcher' ? (
            <AssignmentManagement />
          ) : (
            <ContentManagement />
          )}
        </div>
      )}
    </motion.div>
  );
};
