/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Sliders, ArrowLeft, Settings2 } from 'lucide-react';
import { useAuth } from '../../../shared/components/AppGate';
import { usePermission } from '../../../shared/hooks/usePermission';
import { FieldBuilder } from '../../profiles/pages/FieldBuilder';

export const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [view, setView] = useState<'hub' | 'fields'>('hub');

  const canManageFields = usePermission('profile-fields', 'manage-fields');

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
              id="back-to-settings-hub-btn"
              title={t('settings.backBtn')}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl font-sans">
              {view === 'hub'
                ? t('settings.title')
                : t('settings.fieldBuilder')}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500 max-w-2xl font-sans">
              {view === 'hub'
                ? t('settings.hubSubtitle')
                : t('settings.fieldBuilderSubtitle')}
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
              <p className="text-slate-400 font-medium leading-none">{t('settings.activeSession')}</p>
              <p className="text-slate-800 font-bold mt-0.5 leading-none">{user.username}</p>
            </div>
          </div>
        )}
      </div>

      {/* Hub View */}
      {view === 'hub' && (
        <>
          {canManageFields ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="settings-hub-grid">
              <motion.button
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ y: 0, scale: 0.99 }}
                onClick={() => setView('fields')}
                className="flex flex-col text-left p-6 rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-blue-300"
                id="card-field-builder"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 mb-4">
                  <Settings2 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 font-sans">
                  {t('settings.fieldBuilder')}
                </h3>
                <p className="text-sm text-slate-500 mt-2 font-sans">
                  {t('settings.fieldBuilderDesc')}
                </p>
                <span className="text-xs text-blue-600 font-semibold mt-4 inline-flex items-center space-x-1">
                  <span>{t('settings.manageFieldsBtn')}</span>
                  <span>&rarr;</span>
                </span>
              </motion.button>
            </div>
          ) : (
            /* Empty State message (No permissions config) */
            <div className="flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-white p-12 text-center shadow-sm" id="settings-empty-state">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-400 mb-4">
                <Sliders className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-sans">
                {t('settings.title')}
              </h3>
              <p className="text-sm text-slate-500 mt-2 max-w-md font-sans">
                {t('settings.emptyState')}
              </p>
            </div>
          )}
        </>
      )}

      {/* Sub-Views */}
      {view === 'fields' && canManageFields && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-fade-in" id="fields-subview">
          <FieldBuilder />
        </div>
      )}
    </motion.div>
  );
};
