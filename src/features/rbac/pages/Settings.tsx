/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Sliders } from 'lucide-react';
import { useAuth } from '../../../shared/components/AppGate';

export const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

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
            {t('settings.hubSubtitle')}
          </p>
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

      {/* Empty State message */}
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
    </motion.div>
  );
};
