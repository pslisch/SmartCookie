import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Layers, Users, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../../shared/components/AppGate';
import { OrganizationStructureTab } from '../components/OrganizationStructureTab';
import { LearningGroupsTab } from '../components/LearningGroupsTab';
import { ExpiringGroupsTab } from '../components/ExpiringGroupsTab';
import { UsersTab } from '../components/UsersTab';

export const UserGroupManagement: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const hasUsersView = !!(user?.effectivePermissions?.includes('users:view') || user?.isSuperuser);

  const [activeTab, setActiveTab] = useState<'users' | 'structure' | 'groups' | 'expiring'>('structure');

  useEffect(() => {
    if (hasUsersView) {
      setActiveTab('users');
    }
  }, [hasUsersView]);

  return (
    <div className="space-y-6" id="user-group-mgmt-container">
      {/* Tabs Selection Bar */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs" id="user-group-tabs">
          {hasUsersView && (
            <button
              onClick={() => setActiveTab('users')}
              className={`relative flex items-center space-x-2 py-4 px-1 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'users'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
              id="tab-btn-users"
            >
              <Users className="h-4 w-4" />
              <span>{t('organization.usersTab.usersTabBtn')}</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('structure')}
            className={`relative flex items-center space-x-2 py-4 px-1 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'structure'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
            id="tab-btn-structure"
          >
            <Layers className="h-4 w-4" />
            <span>{t('organization.structureTab')}</span>
          </button>

          <button
            onClick={() => setActiveTab('groups')}
            className={`relative flex items-center space-x-2 py-4 px-1 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'groups'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
            id="tab-btn-groups"
          >
            <Users className="h-4 w-4" />
            <span>{t('organization.learningGroupsTab')}</span>
          </button>

          <button
            onClick={() => setActiveTab('expiring')}
            className={`relative flex items-center space-x-2 py-4 px-1 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'expiring'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
            id="tab-btn-expiring"
          >
            <AlertTriangle className="h-4 w-4" />
            <span>{t('organization.expiringGroupsTab')}</span>
          </button>
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
        {activeTab === 'structure' && <OrganizationStructureTab />}
        {activeTab === 'groups' && <LearningGroupsTab />}
        {activeTab === 'expiring' && <ExpiringGroupsTab />}
      </motion.div>
    </div>
  );
};
