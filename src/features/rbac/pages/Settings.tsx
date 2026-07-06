/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { ShieldAlert, User, Key, Building2, Sliders, ArrowLeft, Users2 } from 'lucide-react';
import { RoleManagement } from './RoleManagement';
import { UserGroupManagement } from '../../organization/pages/UserGroupManagement';
import { useAuth } from '../../../shared/components/AppGate';
import { usePermission } from '../../../shared/hooks/usePermission';

export const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [view, setView] = useState<'hub' | 'roles' | 'organization'>('hub');

  const hasRolesManage = usePermission('roles', 'manage');
  const hasOrgView = usePermission('organization', 'view');
  const hasOrgCreate = usePermission('organization', 'create');
  const hasOrgEdit = usePermission('organization', 'edit');
  const hasOrgDelete = usePermission('organization', 'delete');
  const hasOrgManageMembers = usePermission('organization', 'manage-members');
  const hasOrgManageGroups = usePermission('organization', 'manage-groups');
  const hasOrgAccess = hasOrgView || hasOrgCreate || hasOrgEdit || hasOrgDelete || hasOrgManageMembers || hasOrgManageGroups;

  // Auto-redirect if they only have one permission and land on hub? No, the instructions say:
  // "Restructure Settings.tsx into a landing page with cards/buttons... Each card only renders if the viewer has its permission."
  // So the landing page shows cards for allowed sections.

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
      id="settings-root"
    >
      {/* Header section with generous space */}
      <div className="border-b border-slate-100 pb-6 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-4">
          {view !== 'hub' && (
            <button
              onClick={() => setView('hub')}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
              id="back-to-hub-btn"
              title="Back to Settings Hub"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl font-sans">
              {view === 'hub'
                ? t('settings.title', 'Settings Hub')
                : view === 'roles'
                ? t('settings.roles', 'Role Management')
                : t('settings.userGroupManagement', 'User & Group Management')}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500 max-w-2xl font-sans">
              {view === 'hub'
                ? 'Customize and manage your system environment settings, user permissions, and directory controls.'
                : view === 'roles'
                ? 'Configure role-based access control (RBAC), system permissions, and company settings.'
                : 'Manage your company department structure, organization units, and learning group cohorts.'}
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
              <p className="text-slate-400 font-medium leading-none">{t('settings.activeUser', 'Active Session')}</p>
              <p className="text-slate-800 font-bold mt-0.5 leading-none">{user.username}</p>
            </div>
          </div>
        )}
      </div>

      {/* Hub View: Grid of Navigation Cards */}
      {view === 'hub' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="settings-hub-grid">
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
                {t('settings.roles', 'Role Management')}
              </h3>
              <p className="text-sm text-slate-500 mt-2 font-sans">
                {t('settings.rolesDesc', 'Configure role-based access control, parent hierarchies, and system permission levels.')}
              </p>
              <span className="text-xs text-blue-600 font-semibold mt-4 inline-flex items-center space-x-1">
                <span>Manage Permissions</span>
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
                {t('settings.userGroupManagement', 'User & Group Management')}
              </h3>
              <p className="text-sm text-slate-500 mt-2 font-sans">
                Manage organization units, hierarchy, learning groups, and memberships for corporate structural organization.
              </p>
              <span className="text-xs text-indigo-600 font-semibold mt-4 inline-flex items-center space-x-1">
                <span>Manage Directory</span>
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
    </motion.div>
  );
};
