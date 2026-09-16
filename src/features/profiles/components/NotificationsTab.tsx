import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  NotificationPreferenceRow,
  Preference,
} from './NotificationPreferenceRow';

export function NotificationsTab() {
  const { t } = useTranslation();
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch('/api/notification-preferences');

        if (!res.ok) {
          throw new Error(t('profile.notifications.loadError'));
        }

        const data = await res.json();
        setPreferences(data.preferences || []);
      } catch (err: any) {
        setError(err.message || t('profile.notifications.loadError'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [t]);

  const handleToggle = async (
    type: string,
    channel: 'inLms' | 'email',
    currentVal: boolean
  ) => {
    const pref = preferences.find((p) => p.notificationType === type);
    if (!pref || pref.mandatory) {
      return;
    }

    const key = `${type}:${channel}`;
    setSavingKey(key);
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
          channel,
          enabled: newVal,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('profile.notifications.saveError'));
      }

      setPreferences((prev) =>
        prev.map((p) => {
          if (p.notificationType !== type) return p;
          return {
            ...p,
            [channel === 'inLms' ? 'inLmsEnabled' : 'emailEnabled']: newVal,
          };
        })
      );

      setSuccess(t('profile.notifications.saveSuccess'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || t('profile.notifications.saveError'));
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center space-y-3" id="notifications-tab-loading">
        <Loader2 className="h-8 w-8 animate-spin text-link-primary" />
        <span className="text-sm font-medium text-text-muted">{t('profile.notifications.loading')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="notifications-tab-container">
      <div className="flex items-center space-x-3 pb-4 border-b border-card-border">
        <div className="rounded-xl bg-status-info-bg p-2.5 text-status-info-text">
          <Bell className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-text-heading">{t('profile.notifications.title')}</h3>
          <p className="text-xs text-text-muted">
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
            className="flex items-center space-x-2.5 rounded-xl bg-status-error-bg border border-card-border p-4 text-sm text-status-error-text"
            id="notifications-error-alert"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-status-error-text" />
            <span>{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center space-x-2.5 rounded-xl bg-status-success-bg border border-card-border p-4 text-sm text-status-success-text"
            id="notifications-success-alert"
          >
            <CheckCircle className="h-4 w-4 shrink-0 text-status-success-text" />
            <span>{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="divide-y divide-card-border" id="notification-types-list">
        {preferences.map((pref) => {
          let savingChannel: 'inLms' | 'email' | null = null;
          if (savingKey === `${pref.notificationType}:inLms`) {
            savingChannel = 'inLms';
          } else if (savingKey === `${pref.notificationType}:email`) {
            savingChannel = 'email';
          }

          return (
            <NotificationPreferenceRow
              key={pref.notificationType}
              pref={pref}
              savingChannel={savingChannel}
              onToggle={handleToggle}
            />
          );
        })}
      </div>
    </div>
  );
}
