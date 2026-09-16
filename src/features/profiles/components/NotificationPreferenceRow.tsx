import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  BookOpen,
  Calendar,
  AlertTriangle,
  Award,
  CheckCircle,
  Megaphone,
  Loader2,
  Info,
} from 'lucide-react';

export interface Preference {
  notificationType: string;
  governedBy: 'rule' | 'legacy';
  hasInLmsChannel: boolean;
  hasEmailChannel: boolean;
  mandatory: boolean;
  inLmsEnabled: boolean;
  emailEnabled: boolean;
}

interface NotificationPreferenceRowProps {
  pref: Preference;
  savingChannel: 'inLms' | 'email' | null;
  onToggle: (type: string, channel: 'inLms' | 'email', currentVal: boolean) => void;
}

export const NotificationPreferenceRow: React.FC<NotificationPreferenceRowProps> = ({
  pref,
  savingChannel,
  onToggle,
}) => {
  const { t } = useTranslation();

  const getIconForType = (type: string) => {
    switch (type) {
      case 'LESSON_ASSIGNED':
        return <BookOpen className="h-5 w-5 text-link-primary" />;
      case 'REMINDER':
        return <Bell className="h-5 w-5 text-link-primary" />;
      case 'DUE_SOON':
        return <Calendar className="h-5 w-5 text-status-warning-text" />;
      case 'OVERDUE':
      case 'MANAGER_OVERDUE':
        return <AlertTriangle className="h-5 w-5 text-status-error-text" />;
      case 'COMPLETION_CONFIRMATION':
      case 'MANAGER_COMPLETION':
        return <CheckCircle className="h-5 w-5 text-status-success-text" />;
      case 'CERTIFICATES':
        return <Award className="h-5 w-5 text-status-info-text" />;
      case 'SYSTEM_ANNOUNCEMENTS':
        return <Megaphone className="h-5 w-5 text-status-info-text" />;
      default:
        return <Bell className="h-5 w-5 text-text-muted" />;
    }
  };

  const isInLmsSaving = savingChannel === 'inLms';
  const isEmailSaving = savingChannel === 'email';
  const isInLmsActive = pref.mandatory || pref.inLmsEnabled;
  const isEmailActive = pref.mandatory || pref.emailEnabled;
  const typeLower = pref.notificationType.toLowerCase();

  return (
    <div
      className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 py-5 first:pt-0 last:pb-0"
      id={`notification-row-${typeLower}`}
    >
      <div className="flex items-start space-x-4 max-w-2xl">
        <div className="rounded-xl bg-card-header-bg p-2 shrink-0 mt-0.5">
          {getIconForType(pref.notificationType)}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-text-heading">
              {t(`profile.notifications.types.${pref.notificationType}.title`)}
            </span>
            {pref.mandatory && (
              <span className="inline-flex items-center rounded-full bg-bg-subtle px-2 py-0.5 text-2xs font-semibold text-text-muted border border-card-border/50">
                {t('profile.notifications.mandatoryBadge')}
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            {t(`profile.notifications.types.${pref.notificationType}.desc`)}
          </p>
          {pref.mandatory && (
            <div className="flex items-center space-x-1.5 pt-1.5 text-2xs text-text-muted">
              <Info className="h-3 w-3 shrink-0" />
              <span>{t('profile.notifications.mandatoryExplanatory')}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-5 shrink-0 self-end sm:self-center">
        {pref.hasInLmsChannel && (
          <div className="flex items-center space-x-2.5">
            <span className="text-xs font-medium text-text-muted">
              {t('profile.notifications.channelInLms')}
            </span>
            {isInLmsSaving && (
              <Loader2 className="h-4 w-4 animate-spin text-link-primary" />
            )}
            <button
              type="button"
              role="switch"
              aria-checked={isInLmsActive}
              disabled={pref.mandatory || isInLmsSaving}
              onClick={() => onToggle(pref.notificationType, 'inLms', pref.inLmsEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-link-primary/20 ${
                isInLmsActive ? 'bg-btn-primary-bg' : 'bg-input-border'
              } ${pref.mandatory ? 'opacity-50 cursor-not-allowed' : ''} ${
                isInLmsSaving ? 'opacity-50 cursor-wait' : ''
              }`}
              id={`notification-switch-${typeLower}-inlms`}
              aria-label={`${t(`profile.notifications.types.${pref.notificationType}.title`)} - ${t('profile.notifications.channelInLms')}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-card-bg shadow-sm ring-0 transition duration-200 ease-in-out ${
                  isInLmsActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        )}

        {pref.hasEmailChannel && (
          <div className="flex items-center space-x-2.5">
            <span className="text-xs font-medium text-text-muted">
              {t('profile.notifications.channelEmail')}
            </span>
            {isEmailSaving && (
              <Loader2 className="h-4 w-4 animate-spin text-link-primary" />
            )}
            <button
              type="button"
              role="switch"
              aria-checked={isEmailActive}
              disabled={pref.mandatory || isEmailSaving}
              onClick={() => onToggle(pref.notificationType, 'email', pref.emailEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-link-primary/20 ${
                isEmailActive ? 'bg-btn-primary-bg' : 'bg-input-border'
              } ${pref.mandatory ? 'opacity-50 cursor-not-allowed' : ''} ${
                isEmailSaving ? 'opacity-50 cursor-wait' : ''
              }`}
              id={`notification-switch-${typeLower}-email`}
              aria-label={`${t(`profile.notifications.types.${pref.notificationType}.title`)} - ${t('profile.notifications.channelEmail')}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-card-bg shadow-sm ring-0 transition duration-200 ease-in-out ${
                  isEmailActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
