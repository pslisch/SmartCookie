/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import {
  CalendarClock,
  Clock,
  Repeat,
  Copy,
  Ban,
  X,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Bell,
  Mail,
  Users,
  Building2,
  Plus,
  Edit,
} from 'lucide-react';
import { ScheduledNotification } from '../types';
import { ScheduledNotificationForm } from '../components/ScheduledNotificationForm';

function getCsrfToken(): string {
  const match = document.cookie.match(/csrfToken=([^;]+)/);
  return match ? match[1] : '';
}

export const ScheduledNotificationManagement: React.FC = () => {
  const { t } = useTranslation();

  const [notifications, setNotifications] = useState<ScheduledNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Action status banners
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Form View State (undefined = list, null = create, object = edit)
  const [formNotification, setFormNotification] = useState<ScheduledNotification | null | undefined>(undefined);

  // Cancellation Modal State
  const [notificationToCancel, setNotificationToCancel] = useState<ScheduledNotification | null>(null);
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [cancelModalError, setCancelModalError] = useState<string | null>(null);

  // Duplication Modal State
  const [notificationToDuplicate, setNotificationToDuplicate] = useState<ScheduledNotification | null>(null);
  const [duplicateTitle, setDuplicateTitle] = useState<string>('');
  const [duplicateStartAt, setDuplicateStartAt] = useState<string>('');
  const [duplicateEndAt, setDuplicateEndAt] = useState<string>('');
  const [duplicateModalError, setDuplicateModalError] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<boolean>(false);

  // Fetch Scheduled Notifications
  const fetchNotifications = useCallback(async (isRetry = false) => {
    try {
      if (notifications.length > 0) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const res = await fetch('/api/scheduled-notifications', {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });

      const contentType = res.headers.get('content-type') || '';

      if (!res.ok) {
        if (contentType.includes('application/json')) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || `${t('scheduledNotifications.loadError')} (${res.status})`);
        }
        throw new Error(`${t('scheduledNotifications.loadError')} (${res.status})`);
      }

      if (!contentType.includes('application/json')) {
        if (!isRetry) {
          setTimeout(() => {
            fetchNotifications(true);
          }, 1000);
          return;
        }
        throw new Error(t('scheduledNotifications.serverStarting'));
      }

      const data: ScheduledNotification[] = await res.json();
      setNotifications(data || []);
    } catch (err: unknown) {
      console.error('[ScheduledNotificationManagement] Error fetching notifications:', err);
      const message = err instanceof Error ? err.message : t('scheduledNotifications.loadError');
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [notifications.length, t]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Handle Cancellation Execution
  const handleExecuteCancel = async (item: ScheduledNotification) => {
    try {
      setCancelling(true);
      setCancelModalError(null);

      const res = await fetch(`/api/scheduled-notifications/${item.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        credentials: 'include',
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || t('scheduledNotifications.cancelError'));
      }

      setNotificationToCancel(null);
      setActionSuccess(t('scheduledNotifications.cancelSuccess', { title: item.title }));
      fetchNotifications();
    } catch (err: unknown) {
      console.error('[ScheduledNotificationManagement] Error cancelling notification:', err);
      const message = err instanceof Error ? err.message : t('scheduledNotifications.cancelError');
      setCancelModalError(message);
    } finally {
      setCancelling(false);
    }
  };

  // Open Duplicate Modal with sensible defaults
  const handleOpenDuplicate = (item: ScheduledNotification) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    const startStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

    let endStr = '';
    if (item.recurrence !== 'NONE') {
      const end = new Date(now);
      end.setMonth(end.getMonth() + 1);
      endStr = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
    }

    setDuplicateTitle(`${item.title} (Copy)`);
    setDuplicateStartAt(startStr);
    setDuplicateEndAt(endStr);
    setDuplicateModalError(null);
    setNotificationToDuplicate(item);
  };

  // Handle Duplication Execution
  const handleExecuteDuplicate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notificationToDuplicate) return;

    if (!duplicateStartAt) {
      setDuplicateModalError(t('scheduledNotifications.validationStartRequired'));
      return;
    }

    const startDate = new Date(duplicateStartAt);
    if (isNaN(startDate.getTime())) {
      setDuplicateModalError(t('scheduledNotifications.validationStartRequired'));
      return;
    }

    const isRecurring = notificationToDuplicate.recurrence !== 'NONE';
    let endDate: Date | undefined;

    if (isRecurring) {
      if (!duplicateEndAt) {
        setDuplicateModalError(t('scheduledNotifications.validationEndRequired'));
        return;
      }
      endDate = new Date(duplicateEndAt);
      if (isNaN(endDate.getTime())) {
        setDuplicateModalError(t('scheduledNotifications.validationEndRequired'));
        return;
      }
      if (endDate.getTime() <= startDate.getTime()) {
        setDuplicateModalError(t('scheduledNotifications.validationEndAfterStart'));
        return;
      }
    } else if (duplicateEndAt) {
      endDate = new Date(duplicateEndAt);
      if (!isNaN(endDate.getTime()) && endDate.getTime() <= startDate.getTime()) {
        setDuplicateModalError(t('scheduledNotifications.validationEndAfterStart'));
        return;
      }
    }

    try {
      setDuplicating(true);
      setDuplicateModalError(null);

      const payload: { startAt: string; endAt?: string; title?: string } = {
        startAt: startDate.toISOString(),
      };
      if (endDate && !isNaN(endDate.getTime())) {
        payload.endAt = endDate.toISOString();
      }
      if (duplicateTitle.trim()) {
        payload.title = duplicateTitle.trim();
      }

      const res = await fetch(`/api/scheduled-notifications/${notificationToDuplicate.id}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || t('scheduledNotifications.duplicateError'));
      }

      const duplicatedItem = await res.json();
      setNotificationToDuplicate(null);
      setActionSuccess(
        t('scheduledNotifications.duplicateSuccess', {
          title: duplicatedItem.title || notificationToDuplicate.title,
        })
      );
      fetchNotifications();
    } catch (err: unknown) {
      console.error('[ScheduledNotificationManagement] Error duplicating notification:', err);
      const message = err instanceof Error ? err.message : t('scheduledNotifications.duplicateError');
      setDuplicateModalError(message);
    } finally {
      setDuplicating(false);
    }
  };

  // Helper to format dates
  const formatDateTime = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  // Helper for human-readable recipient summary
  const renderRecipientSummary = (config: ScheduledNotification['recipientConfig']) => {
    if (config?.entireCompany) {
      return (
        <span className="inline-flex items-center space-x-1.5 text-xs font-medium text-text-heading">
          <Building2 className="h-3.5 w-3.5 text-link-primary shrink-0" />
          <span>{t('scheduledNotifications.recipientsEntireCompany')}</span>
        </span>
      );
    }

    const parts: string[] = [];
    if (config?.groupIds && config.groupIds.length > 0) {
      parts.push(
        config.groupIds.length === 1
          ? t('scheduledNotifications.recipientsGroups', { count: 1 })
          : t('scheduledNotifications.recipientsGroups_other', { count: config.groupIds.length })
      );
    }
    if (config?.userIds && config.userIds.length > 0) {
      parts.push(
        config.userIds.length === 1
          ? t('scheduledNotifications.recipientsUsers', { count: 1 })
          : t('scheduledNotifications.recipientsUsers_other', { count: config.userIds.length })
      );
    }

    if (parts.length === 0) {
      return (
        <span className="text-xs text-text-muted">
          {t('scheduledNotifications.recipientsNone')}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center space-x-1.5 text-xs font-medium text-text-heading">
        <Users className="h-3.5 w-3.5 text-text-muted shrink-0" />
        <span>{parts.join(', ')}</span>
      </span>
    );
  };

  // Helper for Recurrence label
  const getRecurrenceLabel = (recurrence: ScheduledNotification['recurrence']) => {
    switch (recurrence) {
      case 'DAILY':
        return t('scheduledNotifications.recurrenceDaily');
      case 'WEEKLY':
        return t('scheduledNotifications.recurrenceWeekly');
      case 'MONTHLY':
        return t('scheduledNotifications.recurrenceMonthly');
      case 'NONE':
      default:
        return t('scheduledNotifications.recurrenceNone');
    }
  };

  // Render Create/Edit Form View
  if (formNotification !== undefined) {
    return (
      <div className="space-y-6" id="scheduled-notification-management">
        <ScheduledNotificationForm
          notification={formNotification}
          onSuccess={(saved) => {
            const isEdit = Boolean(formNotification);
            setFormNotification(undefined);
            setActionSuccess(
              isEdit
                ? t('scheduledNotifications.form.editSuccess', { title: saved.title })
                : t('scheduledNotifications.form.createSuccess', { title: saved.title })
            );
            fetchNotifications();
          }}
          onCancel={() => setFormNotification(undefined)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6" id="scheduled-notification-management">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-card-border">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold tracking-tight text-text-heading font-sans">
              {t('scheduledNotifications.title')}
            </h2>
            {!loading && (
              <span
                className="inline-flex items-center rounded-full bg-card-header-bg px-2.5 py-0.5 text-xs font-semibold text-text-muted border border-card-border"
                id="scheduled-notifications-count-badge"
              >
                {t('scheduledNotifications.countBadge', { count: notifications.length })}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-text-muted font-sans max-w-2xl">
            {t('scheduledNotifications.subtitle')}
          </p>
        </div>

        {/* Actions: Refresh & Create */}
        <div className="shrink-0 flex items-center space-x-2">
          <button
            type="button"
            onClick={() => fetchNotifications()}
            disabled={loading || refreshing}
            className="inline-flex items-center space-x-1.5 rounded-xl border border-card-border bg-card-bg px-3.5 py-2 text-xs font-semibold text-text-heading shadow-xs hover:bg-card-header-bg transition-colors cursor-pointer disabled:opacity-60"
            id="refresh-scheduled-notifications-btn"
            title={t('scheduledNotifications.retry')}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? t('scheduledNotifications.loading') : t('scheduledNotifications.retry')}</span>
          </button>

          <button
            type="button"
            onClick={() => setFormNotification(null)}
            className="inline-flex items-center space-x-2 rounded-xl bg-btn-primary-bg px-4 py-2 text-sm font-semibold text-btn-primary-text shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
            id="create-scheduled-notification-btn"
          >
            <Plus className="h-4 w-4" />
            <span>{t('scheduledNotifications.createBtn')}</span>
          </button>
        </div>
      </div>

      {/* Action Feedback Banners */}
      <AnimatePresence>
        {actionSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-between p-4 rounded-xl bg-status-success-bg border border-status-success-text/20 text-status-success-text"
            id="scheduled-action-success-banner"
          >
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-sans">{actionSuccess}</p>
            </div>
            <button
              type="button"
              onClick={() => setActionSuccess(null)}
              className="text-current/70 hover:text-current ml-2 cursor-pointer"
              id="dismiss-scheduled-action-success-btn"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}

        {actionError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center justify-between p-4 rounded-xl bg-status-error-bg/50 border border-status-error-text/20 text-status-error-text"
            id="scheduled-action-error-banner"
          >
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-sans">{actionError}</p>
            </div>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-current/70 hover:text-current ml-2 cursor-pointer"
              id="dismiss-scheduled-action-error-btn"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      {loading ? (
        <div
          className="flex min-h-[300px] flex-col items-center justify-center p-8"
          id="scheduled-notifications-loading"
        >
          <Loader2 className="h-8 w-8 animate-spin text-link-primary mb-3" />
          <p className="text-sm text-text-muted font-sans">{t('scheduledNotifications.loading')}</p>
        </div>
      ) : error ? (
        <div
          className="flex items-center justify-between p-4 rounded-xl bg-status-error-bg/50 border border-status-error-text/20 text-status-error-text"
          id="scheduled-notifications-error"
        >
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-sans">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => fetchNotifications()}
            className="ml-4 px-3 py-1.5 text-xs font-semibold rounded-lg bg-status-error-text text-white hover:opacity-90 transition-opacity cursor-pointer shrink-0"
            id="scheduled-notifications-retry-btn"
          >
            {t('scheduledNotifications.retry')}
          </button>
        </div>
      ) : notifications.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center border border-dashed border-card-border rounded-2xl bg-card-bg p-12 text-center"
          id="scheduled-notifications-empty"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-card-header-bg text-text-muted mb-4">
            <CalendarClock className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-text-heading font-sans">
            {t('scheduledNotifications.emptyStateTitle')}
          </h3>
          <p className="text-sm text-text-muted mt-1 max-w-sm font-sans">
            {t('scheduledNotifications.emptyStateDesc')}
          </p>
          <button
            type="button"
            onClick={() => setFormNotification(null)}
            className="mt-4 inline-flex items-center space-x-2 rounded-xl bg-btn-primary-bg px-4 py-2 text-sm font-semibold text-btn-primary-text shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
            id="empty-create-scheduled-notification-btn"
          >
            <Plus className="h-4 w-4" />
            <span>{t('scheduledNotifications.createBtn')}</span>
          </button>
        </div>
      ) : (
        /* Scheduled Notifications Table */
        <div
          className="overflow-hidden rounded-2xl border border-card-border bg-card-bg shadow-xs"
          id="scheduled-notifications-table-container"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="scheduled-notifications-table">
              <thead>
                <tr className="border-b border-card-border bg-card-header-bg/70 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  <th scope="col" className="px-6 py-3.5">
                    {t('scheduledNotifications.thTitle')}
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    {t('scheduledNotifications.thRecipients')}
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    {t('scheduledNotifications.thChannels')}
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    {t('scheduledNotifications.thRecurrence')}
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    {t('scheduledNotifications.thSchedule')}
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    {t('scheduledNotifications.thLastRun')}
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    {t('scheduledNotifications.thStatus')}
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    {t('scheduledNotifications.thActions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border text-sm">
                {notifications.map((item) => {
                  // Derive Expired client-side: recurrence !== 'NONE' and nextExecutionAt > endAt
                  const isCancelled = item.status === 'CANCELLED';
                  const isExpired =
                    !isCancelled &&
                    item.recurrence !== 'NONE' &&
                    Boolean(item.endAt) &&
                    new Date(item.nextExecutionAt).getTime() > new Date(item.endAt!).getTime();
                  const isActive = item.status === 'ACTIVE' && !isExpired;

                  // Cancellable only when active and not expired
                  const canCancel = isActive;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-card-header-bg/40 transition-colors"
                      id={`scheduled-row-${item.id}`}
                    >
                      {/* Title & Message */}
                      <td className="px-6 py-4 align-top max-w-xs">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-text-heading font-sans line-clamp-1" title={item.title}>
                            {item.title}
                          </span>
                          <p className="text-xs text-text-muted font-sans line-clamp-2" title={item.message}>
                            {item.message}
                          </p>
                        </div>
                      </td>

                      {/* Recipients Summary */}
                      <td className="px-6 py-4 align-top whitespace-nowrap">
                        {renderRecipientSummary(item.recipientConfig)}
                      </td>

                      {/* Delivery Channels */}
                      <td className="px-6 py-4 align-top whitespace-nowrap">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {item.channels?.inLms && (
                            <span
                              className="inline-flex items-center space-x-1 rounded-md bg-status-info-bg px-2 py-0.5 text-xs font-medium text-status-info-text border border-status-info-text/20"
                              title={t('scheduledNotifications.channelInLms')}
                            >
                              <Bell className="h-3 w-3" />
                              <span>{t('scheduledNotifications.channelInLms')}</span>
                            </span>
                          )}
                          {item.channels?.email && (
                            <span
                              className="inline-flex items-center space-x-1 rounded-md bg-status-success-bg px-2 py-0.5 text-xs font-medium text-status-success-text border border-status-success-text/20"
                              title={t('scheduledNotifications.channelEmail')}
                            >
                              <Mail className="h-3 w-3" />
                              <span>{t('scheduledNotifications.channelEmail')}</span>
                            </span>
                          )}
                          {!item.channels?.inLms && !item.channels?.email && (
                            <span className="text-xs text-text-muted">
                              {t('scheduledNotifications.noChannels')}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Recurrence */}
                      <td className="px-6 py-4 align-top whitespace-nowrap">
                        <span className="inline-flex items-center space-x-1 rounded-md bg-card-header-bg px-2.5 py-1 text-xs font-semibold text-text-body border border-card-border">
                          {item.recurrence !== 'NONE' && <Repeat className="h-3 w-3 text-text-muted" />}
                          <span>{getRecurrenceLabel(item.recurrence)}</span>
                        </span>
                      </td>

                      {/* Schedule: Starts, Next Run, Ends */}
                      <td className="px-6 py-4 align-top whitespace-nowrap">
                        <div className="flex flex-col gap-1 text-xs font-sans">
                          <span className="text-text-muted">
                            {t('scheduledNotifications.scheduleStarts', { date: formatDateTime(item.startAt) })}
                          </span>
                          <span className="font-medium text-text-heading flex items-center space-x-1">
                            <Clock className="h-3 w-3 text-link-primary shrink-0" />
                            <span>
                              {t('scheduledNotifications.scheduleNext', { date: formatDateTime(item.nextExecutionAt) })}
                            </span>
                          </span>
                          {item.endAt && (
                            <span className="text-text-muted">
                              {t('scheduledNotifications.scheduleEnds', { date: formatDateTime(item.endAt) })}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Last Execution */}
                      <td className="px-6 py-4 align-top whitespace-nowrap text-xs text-text-muted font-sans">
                        {item.lastExecutedAt ? formatDateTime(item.lastExecutedAt) : t('scheduledNotifications.neverRun')}
                      </td>

                      {/* Status Badge (Derived Expired client-side) */}
                      <td className="px-6 py-4 align-top whitespace-nowrap">
                        {isCancelled ? (
                          <span
                            className="inline-flex items-center space-x-1 rounded-full bg-status-error-bg px-2.5 py-0.5 text-xs font-semibold text-status-error-text border border-status-error-text/20"
                            id={`status-badge-cancelled-${item.id}`}
                          >
                            <span>{t('scheduledNotifications.statusCancelled')}</span>
                          </span>
                        ) : isExpired ? (
                          <span
                            className="inline-flex items-center space-x-1 rounded-full bg-status-warning-bg px-2.5 py-0.5 text-xs font-semibold text-status-warning-text border border-status-warning-text/20"
                            id={`status-badge-expired-${item.id}`}
                          >
                            <span>{t('scheduledNotifications.statusExpired')}</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center space-x-1 rounded-full bg-status-success-bg px-2.5 py-0.5 text-xs font-semibold text-status-success-text border border-status-success-text/20"
                            id={`status-badge-active-${item.id}`}
                          >
                            <span>{t('scheduledNotifications.statusActive')}</span>
                          </span>
                        )}
                      </td>

                      {/* Actions: Edit, Cancel & Duplicate */}
                      <td className="px-6 py-4 align-top whitespace-nowrap text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Edit Action */}
                          <button
                            type="button"
                            onClick={() => setFormNotification(item)}
                            className="inline-flex items-center space-x-1.5 rounded-lg border border-card-border bg-card-bg px-2.5 py-1.5 text-xs font-semibold text-text-heading shadow-xs hover:bg-card-header-bg transition-colors cursor-pointer"
                            id={`edit-scheduled-btn-${item.id}`}
                            title={t('scheduledNotifications.editBtn')}
                          >
                            <Edit className="h-3.5 w-3.5 text-text-muted" />
                            <span>{t('scheduledNotifications.editBtn')}</span>
                          </button>

                          {/* Cancel Action (Only for active non-expired rows) */}
                          {canCancel && (
                            <button
                              type="button"
                              onClick={() => {
                                setCancelModalError(null);
                                setNotificationToCancel(item);
                              }}
                              className="inline-flex items-center space-x-1.5 rounded-lg border border-card-border bg-card-bg px-2.5 py-1.5 text-xs font-semibold text-status-error-text shadow-xs hover:bg-status-error-bg hover:border-status-error-text/30 transition-colors cursor-pointer"
                              id={`cancel-scheduled-btn-${item.id}`}
                              title={t('scheduledNotifications.cancelBtn')}
                            >
                              <Ban className="h-3.5 w-3.5" />
                              <span>{t('scheduledNotifications.cancelBtn')}</span>
                            </button>
                          )}

                          {/* Duplicate Action */}
                          <button
                            type="button"
                            onClick={() => handleOpenDuplicate(item)}
                            className="inline-flex items-center space-x-1.5 rounded-lg border border-card-border bg-card-bg px-2.5 py-1.5 text-xs font-semibold text-text-heading shadow-xs hover:bg-card-header-bg transition-colors cursor-pointer"
                            id={`duplicate-scheduled-btn-${item.id}`}
                            title={t('scheduledNotifications.duplicateBtn')}
                          >
                            <Copy className="h-3.5 w-3.5 text-text-muted" />
                            <span>{t('scheduledNotifications.duplicateBtn')}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <AnimatePresence>
        {notificationToCancel && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-overlay backdrop-blur-xs"
            id="cancel-scheduled-modal-backdrop"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md rounded-2xl border border-card-border bg-card-bg shadow-xl overflow-hidden"
              id="cancel-scheduled-modal"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-card-border">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-status-error-bg text-status-error-text">
                    <Ban className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-heading font-sans">
                      {t('scheduledNotifications.cancelConfirmTitle')}
                    </h3>
                    <p className="text-xs text-text-muted font-sans line-clamp-1">
                      {notificationToCancel.title}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={() => setNotificationToCancel(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-card-header-bg transition-colors cursor-pointer"
                  id="close-cancel-scheduled-modal-btn"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                {cancelModalError && (
                  <div className="flex items-center space-x-2 p-3 rounded-xl bg-status-error-bg text-status-error-text text-xs border border-status-error-text/20">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{cancelModalError}</span>
                  </div>
                )}

                <p className="text-sm text-text-body font-sans leading-relaxed">
                  {t('scheduledNotifications.cancelConfirmMessage', { title: notificationToCancel.title })}
                </p>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end space-x-3 p-6 pt-4 border-t border-card-border">
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={() => setNotificationToCancel(null)}
                  className="rounded-xl border border-card-border bg-card-bg px-4 py-2 text-sm font-semibold text-text-heading shadow-xs hover:bg-card-header-bg transition-colors cursor-pointer disabled:opacity-60"
                  id="cancel-modal-dismiss-btn"
                >
                  {t('scheduledNotifications.modalCancelBtn')}
                </button>
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={() => handleExecuteCancel(notificationToCancel)}
                  className="inline-flex items-center space-x-2 rounded-xl bg-status-error-text px-4 py-2 text-sm font-semibold text-btn-primary-text shadow-xs hover:bg-status-error-text/90 transition-colors cursor-pointer disabled:opacity-60"
                  id="confirm-cancel-scheduled-btn"
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t('scheduledNotifications.cancelling')}</span>
                    </>
                  ) : (
                    <>
                      <Ban className="h-4 w-4" />
                      <span>{t('scheduledNotifications.confirmCancelBtn')}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Duplicate Prompt Modal */}
      <AnimatePresence>
        {notificationToDuplicate && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-overlay backdrop-blur-xs"
            id="duplicate-scheduled-modal-backdrop"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg rounded-2xl border border-card-border bg-card-bg shadow-xl overflow-hidden"
              id="duplicate-scheduled-modal"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-card-border">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-status-info-bg text-link-primary">
                    <Copy className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-heading font-sans">
                      {t('scheduledNotifications.duplicateModalTitle')}
                    </h3>
                    <p className="text-xs text-text-muted font-sans line-clamp-1">
                      {t('scheduledNotifications.duplicateModalSubtitle', { title: notificationToDuplicate.title })}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={duplicating}
                  onClick={() => setNotificationToDuplicate(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-card-header-bg transition-colors cursor-pointer"
                  id="close-duplicate-scheduled-modal-btn"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleExecuteDuplicate}>
                <div className="p-6 space-y-4">
                  {duplicateModalError && (
                    <div className="flex items-center space-x-2 p-3 rounded-xl bg-status-error-bg text-status-error-text text-xs border border-status-error-text/20">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{duplicateModalError}</span>
                    </div>
                  )}

                  {/* Title field (optional, defaults to copy) */}
                  <div>
                    <label
                      htmlFor="duplicate-title-input"
                      className="block text-xs font-semibold text-text-heading uppercase tracking-wider mb-1.5"
                    >
                      {t('scheduledNotifications.titleLabel')}
                    </label>
                    <input
                      type="text"
                      id="duplicate-title-input"
                      value={duplicateTitle}
                      onChange={(e) => setDuplicateTitle(e.target.value)}
                      placeholder={t('scheduledNotifications.titlePlaceholder', {
                        title: notificationToDuplicate.title,
                      })}
                      className="w-full rounded-xl border border-card-border bg-card-bg px-3.5 py-2 text-sm text-text-heading focus:border-link-primary focus:outline-hidden"
                    />
                  </div>

                  {/* Start Date & Time (required) */}
                  <div>
                    <label
                      htmlFor="duplicate-start-at-input"
                      className="block text-xs font-semibold text-text-heading uppercase tracking-wider mb-1.5"
                    >
                      {t('scheduledNotifications.startAtLabel')} <span className="text-status-error-text">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      id="duplicate-start-at-input"
                      required
                      value={duplicateStartAt}
                      onChange={(e) => setDuplicateStartAt(e.target.value)}
                      className="w-full rounded-xl border border-card-border bg-card-bg px-3.5 py-2 text-sm text-text-heading focus:border-link-primary focus:outline-hidden"
                    />
                  </div>

                  {/* End Date & Time (required if recurring) */}
                  <div>
                    <label
                      htmlFor="duplicate-end-at-input"
                      className="block text-xs font-semibold text-text-heading uppercase tracking-wider mb-1.5"
                    >
                      {t('scheduledNotifications.endAtLabel')}{' '}
                      {notificationToDuplicate.recurrence !== 'NONE' && (
                        <span className="text-status-error-text">*</span>
                      )}
                    </label>
                    <input
                      type="datetime-local"
                      id="duplicate-end-at-input"
                      required={notificationToDuplicate.recurrence !== 'NONE'}
                      value={duplicateEndAt}
                      onChange={(e) => setDuplicateEndAt(e.target.value)}
                      className="w-full rounded-xl border border-card-border bg-card-bg px-3.5 py-2 text-sm text-text-heading focus:border-link-primary focus:outline-hidden"
                    />
                    {notificationToDuplicate.recurrence !== 'NONE' && (
                      <p className="text-xs text-text-muted mt-1.5 font-sans">
                        {t('scheduledNotifications.recurringNote', {
                          recurrence: getRecurrenceLabel(notificationToDuplicate.recurrence),
                        })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end space-x-3 p-6 pt-4 border-t border-card-border">
                  <button
                    type="button"
                    disabled={duplicating}
                    onClick={() => setNotificationToDuplicate(null)}
                    className="rounded-xl border border-card-border bg-card-bg px-4 py-2 text-sm font-semibold text-text-heading shadow-xs hover:bg-card-header-bg transition-colors cursor-pointer disabled:opacity-60"
                    id="duplicate-modal-dismiss-btn"
                  >
                    {t('scheduledNotifications.modalCancelBtn')}
                  </button>
                  <button
                    type="submit"
                    disabled={duplicating}
                    className="inline-flex items-center space-x-2 rounded-xl bg-btn-primary-bg px-4 py-2 text-sm font-semibold text-btn-primary-text shadow-xs hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-60"
                    id="confirm-duplicate-scheduled-btn"
                  >
                    {duplicating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{t('scheduledNotifications.duplicating')}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>{t('scheduledNotifications.confirmDuplicateBtn')}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
