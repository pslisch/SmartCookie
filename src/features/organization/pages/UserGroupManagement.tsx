import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Layers, Users, AlertTriangle, ShieldCheck } from 'lucide-react';
import { usePermission } from '../../../shared/hooks/usePermission';
import { OrganizationStructureTab } from '../components/OrganizationStructureTab';
import { LearningGroupsTab } from '../components/LearningGroupsTab';
import { ExpiringGroupsTab } from '../components/ExpiringGroupsTab';
import { UsersTab } from '../components/UsersTab';
import { RoleManagement } from '../../rbac/pages/RoleManagement';

type TabType = 'users' | 'structure' | 'groups' | 'expiring' | 'roles';

export const UserGroupManagement: React.FC = () => {
  const { t } = useTranslation();
  
  const hasUsersView = usePermission('users', 'view');
  const hasRolesManage = usePermission('roles', 'manage');
  
  const hasOrgView = usePermission('organization', 'view');
  const hasOrgCreate = usePermission('organization', 'create');
  const hasOrgEdit = usePermission('organization', 'edit');
  const hasOrgDelete = usePermission('organization', 'delete');
  const hasOrgManageMembers = usePermission('organization', 'manage-members');
  const hasOrgManageGroups = usePermission('organization', 'manage-groups');
  const hasOrgAccess = hasOrgView || hasOrgCreate || hasOrgEdit || hasOrgDelete || hasOrgManageMembers || hasOrgManageGroups;

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (hasUsersView) return 'users';
    if (hasOrgAccess) return 'structure';
    if (hasRolesManage) return 'roles';
    return 'users';
  });

  useEffect(() => {
    const isCurrentTabAllowed = 
      (activeTab === 'users' && hasUsersView) ||
      (activeTab === 'roles' && hasRolesManage) ||
      ((activeTab === 'structure' || activeTab === 'groups' || activeTab === 'expiring') && hasOrgAccess);

    if (!isCurrentTabAllowed) {
      if (hasUsersView) {
        setActiveTab('users');
      } else if (hasOrgAccess) {
        setActiveTab('structure');
      } else if (hasRolesManage) {
        setActiveTab('roles');
      }
    }
  }, [hasUsersView, hasOrgAccess, hasRolesManage, activeTab]);

  return (
    <div className="space-y-6" id="user-group-mgmt-container">
      {/* Tabs Selection Bar */}
      <div className="border-b border-card-border">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs" id="user-group-tabs">
          {hasUsersView && (
            <button
              onClick={() => setActiveTab('users')}
              className={`relative flex items-center space-x-2 py-4 px-1 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'users'
                  ? 'border-link-primary text-link-primary'
                  : 'border-transparent text-text-muted hover:text-text-body hover:border-card-border'
              }`}
              id="tab-btn-users"
            >
              <Users className="h-4 w-4" />
              <span>{t('organization.usersTab.usersTabBtn')}</span>
            </button>
          )}

          {hasOrgAccess && (
            <button
              onClick={() => setActiveTab('structure')}
              className={`relative flex items-center space-x-2 py-4 px-1 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'structure'
                  ? 'border-link-primary text-link-primary'
                  : 'border-transparent text-text-muted hover:text-text-body hover:border-card-border'
              }`}
              id="tab-btn-structure"
            >
              <Layers className="h-4 w-4" />
              <span>{t('organization.structureTab')}</span>
            </button>
          )}

          {hasOrgAccess && (
            <button
              onClick={() => setActiveTab('groups')}
              className={`relative flex items-center space-x-2 py-4 px-1 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'groups'
                  ? 'border-link-primary text-link-primary'
                  : 'border-transparent text-text-muted hover:text-text-body hover:border-card-border'
              }`}
              id="tab-btn-groups"
            >
              <Users className="h-4 w-4" />
              <span>{t('organization.learningGroupsTab')}</span>
            </button>
          )}

          {hasOrgAccess && (
            <button
              onClick={() => setActiveTab('expiring')}
              className={`relative flex items-center space-x-2 py-4 px-1 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'expiring'
                  ? 'border-link-primary text-link-primary'
                  : 'border-transparent text-text-muted hover:text-text-body hover:border-card-border'
              }`}
              id="tab-btn-expiring"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>{t('organization.expiringGroupsTab')}</span>
            </button>
          )}

          {hasRolesManage && (
            <button
              onClick={() => setActiveTab('roles')}
              className={`relative flex items-center space-x-2 py-4 px-1 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'roles'
                  ? 'border-link-primary text-link-primary'
                  : 'border-transparent text-text-muted hover:text-text-body hover:border-card-border'
              }`}
              id="tab-btn-roles"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{t('organization.rolesTab', 'Roles')}</span>
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
        id="tab-content-area"
      >
        {activeTab === 'users' && hasUsersView && <UsersTab />}
        {activeTab === 'structure' && hasOrgAccess && <OrganizationStructureTab />}
        {activeTab === 'groups' && hasOrgAccess && <LearningGroupsTab />}
        {activeTab === 'expiring' && hasOrgAccess && <ExpiringGroupsTab />}
        {activeTab === 'roles' && hasRolesManage && <RoleManagement />}
      </motion.div>
    </div>
  );
};
