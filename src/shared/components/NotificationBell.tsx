import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, History, Loader2, CheckCheck } from 'lucide-react';
import { NotificationListItem as NotificationItemType, NotificationsResponse } from '../types/notifications';
import { NotificationItemRow } from './NotificationItemRow';
import { NotificationHistoryModal } from './NotificationHistoryModal';

interface NotificationBellProps {
  onNavigate?: (path: string) => void;
  className?: string;
  idPrefix?: string;
}

function getCookie(name: string): string {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
  return '';
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  onNavigate,
  className = '',
  idPrefix = 'navbar-notif',
}) => {
  const { t } = useTranslation();
  const [unread, setUnread] = useState<NotificationItemType[]>([]);
  const [recentRead, setRecentRead] = useState<NotificationItemType[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data: NotificationsResponse = await res.json();
        setUnread(data.unread || []);
        setRecentRead(data.recentRead || []);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      if (isInitial) setLoading(false);
      setHasInitiallyLoaded(true);
    }
  }, []);

  // Poll notifications every 60 seconds
  useEffect(() => {
    fetchNotifications(true);
    const interval = setInterval(() => {
      fetchNotifications(false);
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const markAsRead = async (deliveryId: string) => {
    // Find item in unread list
    const itemToMark = unread.find((item) => item.deliveryId === deliveryId);
    if (!itemToMark) return;

    // Optimistic UI update
    const readItem = { ...itemToMark, readAt: new Date().toISOString() };
    setUnread((prev) => prev.filter((i) => i.deliveryId !== deliveryId));
    setRecentRead((prev) => [readItem, ...prev]);

    try {
      await fetch(`/api/notifications/${deliveryId}/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCookie('csrfToken'),
        },
      });
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      // Rollback if needed on next poll or keep optimistic
    }
  };

  const handleNotificationClick = async (item: NotificationItemType) => {
    if (!item.readAt) {
      await markAsRead(item.deliveryId);
    }

    if (item.targetAvailable && item.actionUrl) {
      setIsOpen(false);
      setShowHistory(false);
      if (onNavigate) {
        onNavigate(item.actionUrl);
      } else {
        if (item.actionUrl.startsWith('/')) {
          window.location.href = item.actionUrl;
        } else {
          window.open(item.actionUrl, '_blank', 'noopener,noreferrer');
        }
      }
    }
  };

  const unreadCount = unread.length;

  return (
    <>
      <div className={`relative ${className}`} ref={containerRef}>
        {/* Bell Trigger Button */}
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-card-border bg-bg-subtle text-nav-text transition-colors hover:bg-card-border hover:text-text-heading focus:outline-none"
          id={`${idPrefix}-trigger-btn`}
          title={t('notifications.bellTooltip')}
          aria-label={t('notifications.bellTooltip')}
          aria-expanded={isOpen}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-error-text px-1 text-[10px] font-bold text-text-inverse ring-2 ring-card-bg animate-pulse"
              id={`${idPrefix}-unread-badge`}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown Panel */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-card-border bg-card-bg p-4 shadow-xl ring-1 ring-black/5 z-50 overflow-hidden"
              id={`${idPrefix}-dropdown-card`}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-card-border">
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-bold text-text-heading">
                    {t('notifications.title')}
                  </h4>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-btn-primary-bg px-2 py-0.5 text-[11px] font-semibold text-text-inverse">
                      {unreadCount} {t('notifications.unreadCountLabel')}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowHistory(true);
                  }}
                  className="inline-flex items-center space-x-1 text-xs font-semibold text-link-primary hover:text-link-hover transition-colors"
                  id={`${idPrefix}-view-history-btn`}
                >
                  <History className="h-3.5 w-3.5" />
                  <span>{t('notifications.viewHistory')}</span>
                </button>
              </div>

              {/* Body */}
              <div className="max-h-[65vh] overflow-y-auto pt-2 space-y-3 divide-y divide-card-border/60">
                {loading && !hasInitiallyLoaded ? (
                  <div className="flex h-40 items-center justify-center text-text-muted">
                    <Loader2 className="h-6 w-6 animate-spin text-link-primary" />
                  </div>
                ) : unread.length === 0 && recentRead.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-text-muted">
                    <CheckCheck className="h-8 w-8 stroke-1 text-text-muted/60 mb-2" />
                    <p className="text-xs font-medium">{t('notifications.empty')}</p>
                  </div>
                ) : (
                  <>
                    {/* Unread Section */}
                    {unread.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="px-1 text-[11px] font-bold uppercase tracking-wider text-text-muted">
                          {t('notifications.sectionUnread')}
                        </div>
                        <div className="space-y-1">
                          {unread.map((item) => (
                            <NotificationItemRow
                              key={item.deliveryId}
                              item={item}
                              onClick={handleNotificationClick}
                              idPrefix="dropdown-unread"
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recent Read Section */}
                    {recentRead.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        <div className="px-1 text-[11px] font-bold uppercase tracking-wider text-text-muted">
                          {t('notifications.sectionRecentRead')}
                        </div>
                        <div className="space-y-1">
                          {recentRead.map((item) => (
                            <NotificationItemRow
                              key={item.deliveryId}
                              item={item}
                              onClick={handleNotificationClick}
                              idPrefix="dropdown-read"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Paginated History Modal */}
      <NotificationHistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        onNotificationClick={handleNotificationClick}
      />
    </>
  );
};
