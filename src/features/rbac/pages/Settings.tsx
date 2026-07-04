/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { ShieldAlert, User, Key, Building2, Sliders } from 'lucide-react';
import { RoleManagement } from './RoleManagement';
import { useAuth } from '../../../shared/components/AppGate';

export const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'roles'>('roles');

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
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl font-sans">
            {t('settings.title')}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 max-w-2xl font-sans">
            Customize and manage your system environment settings, user permissions, and directory controls.
          </p>
        </div>

        {/* Current user session pill */}
        {user && (
          <div className="flex items-center space-x-2.5 rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-2 self-start md:self-auto shadow-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-semibold text-xs">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="text-xs">
              <p className="text-slate-400 font-medium leading-none">{t('settings.activeUser')}</p>
              <p className="text-slate-800 font-bold mt-0.5 leading-none">{user.username}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        
        {/* Navigation panel */}
        <aside className="lg:col-span-3 space-y-1">
          <button
            onClick={() => setActiveSubTab('roles')}
            className={`w-full flex items-center space-x-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
              activeSubTab === 'roles'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
            id="subtab-roles"
          >
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <div className="text-left">
              <p className="font-bold text-xs uppercase tracking-wider leading-none">Access Control</p>
              <p className="text-[11px] font-normal mt-0.5 opacity-80 leading-none">{t('settings.roles')}</p>
            </div>
          </button>
        </aside>

        {/* Sub-tab view content area */}
        <div className="lg:col-span-9">
          {activeSubTab === 'roles' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 leading-tight">
                  {t('settings.roles')}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {t('settings.rolesDesc')}
                </p>
              </div>

              <div className="pt-2">
                <RoleManagement />
              </div>
            </div>
          )}
        </div>

      </div>

    </motion.div>
  );
};
