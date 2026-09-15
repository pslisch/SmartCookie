import React from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, AlertCircle, ShieldAlert } from 'lucide-react';
import { NotificationListItem as NotificationItemType } from '../types/notifications';

interface NotificationItemRowProps {
  item: NotificationItemType;
  onClick: (item: NotificationItemType) => void;
  idPrefix?: string;
}

function formatRelativeTime(dateStr: string, t: (key: string, opts?: any) => string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < 60) {
    return t('notifications.timeJustNow');
  }
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return t('notifications.timeMinutesAgo', { count: diffInMinutes });
  }
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return t('notifications.timeHoursAgo', { count: diffInHours });
  }
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return t('notifications.timeDaysAgo', { count: diffInDays });
  }
  return date.toLocaleDateString();
}

export const NotificationItemRow: React.FC<NotificationItemRowProps> = ({
  item,
  onClick,
  idPrefix = 'notif-item',
}) => {
  const { t } = useTranslation();
  const isUnread = !item.readAt;

  return (
    <div
      onClick={() => onClick(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(item);
        }
      }}
      className={`group flex w-full flex-col gap-1.5 rounded-xl p-3 text-left transition-all duration-200 cursor-pointer ${
        isUnread
          ? 'bg-status-info-bg/40 hover:bg-status-info-bg/70'
          : 'bg-card-bg hover:bg-card-header-bg'
      }`}
      id={`${idPrefix}-${item.deliveryId}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isUnread && (
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-btn-primary-bg"
              title={t('notifications.unreadIndicator')}
              aria-label={t('notifications.unreadIndicator')}
            />
          )}
          <span
            className={`text-xs font-semibold truncate ${
              isUnread ? 'text-text-heading font-bold' : 'text-text-body'
            }`}
          >
            {item.title}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {item.mandatory && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-status-error-bg px-2 py-0.5 text-[10px] font-semibold text-status-error-text"
              id={`${idPrefix}-mandatory-${item.deliveryId}`}
            >
              <ShieldAlert className="h-2.5 w-2.5" />
              {t('notifications.mandatory')}
            </span>
          )}
          <span className="text-[11px] text-text-muted">
            {formatRelativeTime(item.createdAt, t)}
          </span>
        </div>
      </div>

      <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">
        {item.body}
      </p>

      {item.actionUrl && (
        <div className="mt-1 flex items-center gap-1 text-xs">
          {item.targetAvailable ? (
            <span className="inline-flex items-center gap-1 font-medium text-link-primary group-hover:text-link-hover">
              <span>{item.actionLabel || t('notifications.openLink')}</span>
              <ExternalLink className="h-3 w-3" />
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-text-muted">
              <AlertCircle className="h-3 w-3 text-status-warning-text" />
              <span>{t('notifications.unavailable')}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
};
