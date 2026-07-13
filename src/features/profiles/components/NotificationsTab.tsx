import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  BookOpen,
  Calendar,
  Clock,
  AlertTriangle,
  Award,
  CheckCircle,
  AlertCircle,
  Megaphone,
  Loader2,
  Info,
} from 'lucide-react';

interface Preference {
  notificationType: string;
  enabled: boolean;
}

export function NotificationsTab() {
  const { t } = useTranslation();
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [mandatoryTypes, setMandatoryTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [prefsRes, mandatoryRes] = await Promise.all([
          fetch('/api/notification-preferences'),
          fetch('/api/company/mandatory-notification-types'),
        ]);

        if (!prefsRes.ok) {
          throw new Error('Failed to fetch notification preferences.');
        }
        if (!mandatoryRes.ok) {
          throw new Error('Failed to fetch mandatory notification settings.');
        }

        const prefsData = await prefsRes.json();
        const mandatoryData = await mandatoryRes.json();

        setPreferences(prefsData.preferences || []);
        setMandatoryTypes(mandatoryData.mandatoryNotificationTypes || []);
      } catch (err: any) {
        setError(err.message || 'An error occurred while loading settings.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleToggle = async (type: string, currentVal: boolean) => {
    // If it's mandatory, it cannot be changed
    if (mandatoryTypes.includes(type)) {
      return;
    }

    setSavingId(type);
    setError(null);
    setSuccess(null);

    const newVal = !currentVal;

    try {
      const res = await fetch('/api/notification-preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationType: type,
          enabled: newVal,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update preference.');
      }

      setPreferences((prev) =>
        prev.map((pref) =>
          pref.notificationType === type ? { ...pref, enabled: newVal } : pref
        )
      );

      setSuccess(t('profile.notifications.saveSuccess'));
      // Clear success notification after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || t('profile.notifications.saveError'));
    } finally {
      setSavingId(null);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'LESSON_ASSIGNED':
        return <BookOpen className="h-5 w-5 text-blue-600" />;
      case 'REMINDER':
        return <Bell className="h-5 w-5 text-indigo-600" />;
      case 'DUE_SOON':
        return <Calendar className="h-5 w-5 text-amber-600" />;
      case 'OVERDUE':
        return <AlertTriangle className="h-5 w-5 text-rose-600" />;
      case 'COMPLETION_CONFIRMATION':
        return <CheckCircle className="h-5 w-5 text-emerald-600" />;
      case 'CERTIFICATES':
        return <Award className="h-5 w-5 text-violet-600" />;
      case 'SYSTEM_ANNOUNCEMENTS':
        return <Megaphone className="h-5 w-5 text-sky-600" />;
      default:
        return <Bell className="h-5 w-5 text-slate-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center space-y-3" id="notifications-tab-loading">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="text-sm font-medium text-slate-500">Loading preferences...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="notifications-tab-container">
      <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
        <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
          <Bell className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">{t('profile.notifications.title')}</h3>
          <p className="text-xs text-slate-500">
            {t('profile.notifications.description')}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center space-x-2.5 rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-700"
            id="notifications-error-alert"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center space-x-2.5 rounded-xl bg-green-50 border border-green-100 p-4 text-sm text-green-700"
            id="notifications-success-alert"
          >
            <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
            <span>{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="divide-y divide-slate-100" id="notification-types-list">
        {preferences.map((pref) => {
          const isMandatory = mandatoryTypes.includes(pref.notificationType);
          const isSaving = savingId === pref.notificationType;
          const isEnabled = isMandatory || pref.enabled;

          return (
            <div
              key={pref.notificationType}
              className="flex items-start justify-between py-5 first:pt-0 last:pb-0"
              id={`notification-row-${pref.notificationType.toLowerCase()}`}
            >
              <div className="flex items-start space-x-4 max-w-2xl">
                <div className="rounded-xl bg-slate-50 p-2 shrink-0 mt-0.5">
                  {getIconForType(pref.notificationType)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">
                      {t(`profile.notifications.types.${pref.notificationType}.title`)}
                    </span>
                    {isMandatory && (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-2xs font-semibold text-slate-600 border border-slate-200/50">
                        {t('profile.notifications.mandatoryBadge')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {t(`profile.notifications.types.${pref.notificationType}.desc`)}
                  </p>
                  {isMandatory && (
                    <div className="flex items-center space-x-1.5 pt-1.5 text-2xs text-slate-400">
                      <Info className="h-3 w-3 shrink-0" />
                      <span>{t('profile.notifications.mandatoryExplanatory')}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3 shrink-0 self-center">
                {isSaving && (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                )}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isEnabled}
                  disabled={isMandatory || isSaving}
                  onClick={() => handleToggle(pref.notificationType, pref.enabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                    isEnabled ? 'bg-blue-600' : 'bg-slate-200'
                  } ${isMandatory ? 'opacity-50 cursor-not-allowed' : ''} ${
                    isSaving ? 'opacity-50 cursor-wait' : ''
                  }`}
                  id={`notification-switch-${pref.notificationType.toLowerCase()}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      isEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
