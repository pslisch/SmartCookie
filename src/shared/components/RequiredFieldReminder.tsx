/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, ArrowRight, X, Sparkles } from 'lucide-react';
import { useAuth } from './AppGate';

interface MissingField {
  id: string;
  name: string;
  fieldType: string;
}

interface CompletionResponse {
  percentage: number;
  missingFields: MissingField[];
}

interface RequiredFieldReminderProps {
  onNavigateToProfile: () => void;
}

export const RequiredFieldReminder: React.FC<RequiredFieldReminderProps> = ({
  onNavigateToProfile,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [completion, setCompletion] = useState<CompletionResponse | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem('requiredFieldsBannerDismissed') === 'true';
  });

  useEffect(() => {
    if (!user || dismissed) return;

    // Fetch live profile completion status
    fetch('/api/profile/me/completion')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Failed to fetch completion');
      })
      .then((data: CompletionResponse) => {
        if (data.missingFields && data.missingFields.length > 0) {
          setCompletion(data);
        } else {
          setCompletion(null);
        }
      })
      .catch((err) => {
        console.error('Error in RequiredFieldReminder fetch:', err);
      });
  }, [user, dismissed]);

  // If already dismissed, or no user, or no missing fields, don't show
  if (dismissed || !user || !completion || completion.missingFields.length === 0) {
    return null;
  }

  const handleDismiss = () => {
    sessionStorage.setItem('requiredFieldsBannerDismissed', 'true');
    setDismissed(true);
  };

  const missingNames = completion.missingFields.map((f) => f.name).join(', ');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 lg:px-8"
        id="required-fields-reminder-banner"
      >
        <div className="relative rounded-2xl border border-amber-100 bg-amber-50/55 p-4 pr-12 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 shadow-sm">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 font-sans flex items-center gap-1.5">
                <span>{t('profile.reminder.title')}</span>
                <span className="text-[10px] font-extrabold bg-amber-100/85 text-amber-900 px-2 py-0.5 rounded-full border border-amber-200">
                  {t('profile.reminder.percentageDone', { percentage: completion.percentage })}
                </span>
              </h4>
              <p className="text-xs text-slate-600 font-sans mt-1">
                {t('profile.reminder.missingMessage')}<span className="font-semibold text-slate-800">{missingNames}</span>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-auto">
            <button
              onClick={onNavigateToProfile}
              className="inline-flex items-center space-x-1 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-slate-800 active:scale-98"
              id="btn-complete-profile-now"
            >
              <span>{t('profile.reminder.goToProfile')}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            id="btn-dismiss-reminder"
            title={t('profile.reminder.dismissTooltip')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
