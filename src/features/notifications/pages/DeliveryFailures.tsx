/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Mail,
  Bell,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { DeliveryFailureItem, DeliveryFailuresResponse } from '../types';

export const DeliveryFailures: React.FC = () => {
  const { t } = useTranslation();

  const [items, setItems] = useState<DeliveryFailureItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFailures = useCallback(
    async (targetPage = 1, isRetry = false) => {
      try {
        if (items.length > 0) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const res = await fetch(
          `/api/notification-admin/delivery-failures?page=${targetPage}&pageSize=${pageSize}`,
          {
            headers: { Accept: 'application/json' },
            credentials: 'include',
          }
        );

        const contentType = res.headers.get('content-type') || '';

        if (!res.ok) {
          if (contentType.includes('application/json')) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.error || `${t('deliveryFailures.loadError')} (${res.status})`);
          }
          throw new Error(`${t('deliveryFailures.loadError')} (${res.status})`);
        }

        if (!contentType.includes('application/json')) {
          if (!isRetry) {
            setTimeout(() => {
              fetchFailures(targetPage, true);
            }, 1000);
            return;
          }
          throw new Error(t('deliveryFailures.serverStarting'));
        }

        const data: DeliveryFailuresResponse = await res.json();
        setItems(data.items || []);
        setTotalCount(data.totalCount || 0);
        setPage(data.page || targetPage);
        setTotalPages(data.totalPages || 1);
      } catch (err: unknown) {
        console.error('[DeliveryFailures] Error fetching failures:', err);
        const message = err instanceof Error ? err.message : t('deliveryFailures.loadError');
        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [pageSize, items.length, t]
  );

  useEffect(() => {
    fetchFailures(page);
  }, [page, fetchFailures]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      setPage(newPage);
    }
  };

  const formatDateTime = (dateStr: string | null): string => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const startIndex = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, totalCount);

  return (
    <div className="space-y-6" id="delivery-failures-management">
      {/* Top action & metrics bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-status-error-bg text-status-error-text border border-status-error-text/20">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-heading font-sans">
              {t('deliveryFailures.title')}
            </h2>
            <p className="text-xs text-text-muted font-sans">
              {t('deliveryFailures.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 self-end sm:self-auto">
          <span
            className="inline-flex items-center rounded-full bg-card-header-bg px-3 py-1 text-xs font-semibold text-text-muted border border-card-border"
            id="delivery-failures-count-badge"
          >
            {totalCount === 1
              ? t('deliveryFailures.failuresCount_one')
              : t('deliveryFailures.failuresCount', { count: totalCount })}
          </span>

          <button
            type="button"
            onClick={() => fetchFailures(page)}
            disabled={loading || refreshing}
            className="inline-flex items-center space-x-2 rounded-xl border border-card-border bg-card-bg px-3.5 py-2 text-xs font-semibold text-text-body shadow-xs hover:bg-card-header-bg disabled:opacity-50 transition-colors cursor-pointer"
            id="refresh-delivery-failures-btn"
            title={t('deliveryFailures.refresh')}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-link-primary' : ''}`}
            />
            <span>{t('deliveryFailures.refresh')}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area: Loading, Error, or Table */}
      {loading ? (
        <div
          className="flex min-h-[300px] flex-col items-center justify-center p-8"
          id="delivery-failures-loading"
        >
          <Loader2 className="h-8 w-8 animate-spin text-link-primary mb-3" />
          <p className="text-sm text-text-muted font-sans">{t('deliveryFailures.loading')}</p>
        </div>
      ) : error ? (
        <div
          className="flex items-center justify-between p-4 rounded-xl bg-status-error-bg/50 border border-status-error-text/20 text-status-error-text"
          id="delivery-failures-error"
        >
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-sans">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => fetchFailures(page)}
            className="ml-4 px-3 py-1.5 text-xs font-semibold rounded-lg bg-status-error-text text-white hover:opacity-90 transition-opacity cursor-pointer shrink-0"
            id="delivery-failures-retry-btn"
          >
            {t('deliveryFailures.retry')}
          </button>
        </div>
      ) : items.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center border border-dashed border-card-border rounded-2xl bg-card-bg p-12 text-center"
          id="delivery-failures-empty"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-status-success-bg text-status-success-text mb-4 border border-status-success-text/20">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-text-heading font-sans">
            {t('deliveryFailures.emptyStateTitle')}
          </h3>
          <p className="text-sm text-text-muted mt-1 max-w-md font-sans">
            {t('deliveryFailures.emptyStateDesc')}
          </p>
        </div>
      ) : (
        /* Failures Table Container */
        <div
          className="overflow-hidden rounded-2xl border border-card-border bg-card-bg shadow-xs"
          id="delivery-failures-table-container"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="delivery-failures-table">
              <thead>
                <tr className="border-b border-card-border bg-card-header-bg/70 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  <th scope="col" className="px-6 py-3.5">
                    {t('deliveryFailures.thRecipient')}
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    {t('deliveryFailures.thNotification')}
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    {t('deliveryFailures.thSourceEvent')}
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    {t('deliveryFailures.thChannel')}
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    {t('deliveryFailures.thStatus')}
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-center">
                    {t('deliveryFailures.thAttempts')}
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    {t('deliveryFailures.thLastAttempt')}
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    {t('deliveryFailures.thErrorMessage')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border text-sm">
                {items.map((item) => {
                  const isPermFailed = item.status === 'PERMANENTLY_FAILED';

                  return (
                    <tr
                      key={item.deliveryId}
                      className="hover:bg-card-header-bg/40 transition-colors"
                      id={`failure-row-${item.deliveryId}`}
                    >
                      {/* Recipient */}
                      <td className="px-6 py-4 align-top">
                        <div className="flex flex-col">
                          <span
                            className="font-semibold text-text-heading font-sans"
                            id={`recipient-username-${item.deliveryId}`}
                          >
                            {item.recipient.username || t('deliveryFailures.unknownUser')}
                          </span>
                          <span
                            className="text-xs text-text-muted mt-0.5"
                            id={`recipient-email-${item.deliveryId}`}
                          >
                            {item.recipient.email || t('deliveryFailures.noEmail')}
                          </span>
                        </div>
                      </td>

                      {/* Notification Title */}
                      <td className="px-6 py-4 align-top">
                        <div className="flex flex-col max-w-xs">
                          <span
                            className="font-medium text-text-heading font-sans text-xs leading-relaxed"
                            id={`notification-title-${item.deliveryId}`}
                          >
                            {item.notification.title}
                          </span>
                          <span className="text-2xs text-text-muted font-mono mt-1">
                            ID: {item.notification.instanceId.slice(0, 8)}...
                          </span>
                        </div>
                      </td>

                      {/* Source Event Type */}
                      <td className="px-6 py-4 align-top">
                        <span
                          className="inline-flex items-center rounded-md bg-card-header-bg px-2 py-0.5 text-2xs font-mono font-medium text-text-body border border-card-border"
                          id={`source-event-${item.deliveryId}`}
                        >
                          {item.notification.sourceEventType}
                        </span>
                      </td>

                      {/* Channel */}
                      <td className="px-6 py-4 align-top">
                        <div className="flex items-center space-x-1.5 text-xs text-text-body font-medium">
                          {item.channel === 'EMAIL' ? (
                            <>
                              <Mail className="h-3.5 w-3.5 text-link-primary shrink-0" />
                              <span>{t('deliveryFailures.channelEmail')}</span>
                            </>
                          ) : (
                            <>
                              <Bell className="h-3.5 w-3.5 text-link-primary shrink-0" />
                              <span>{t('deliveryFailures.channelInLms')}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Status (visual distinction: FAILED vs PERMANENTLY_FAILED) */}
                      <td className="px-6 py-4 align-top">
                        {isPermFailed ? (
                          <span
                            className="inline-flex items-center space-x-1 rounded-md bg-status-error-bg px-2.5 py-1 text-2xs font-bold text-status-error-text border border-status-error-text/20"
                            id={`status-badge-perm-${item.deliveryId}`}
                          >
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            <span>{t('deliveryFailures.statusPermanentlyFailed')}</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center space-x-1 rounded-md bg-status-warning-bg px-2.5 py-1 text-2xs font-bold text-status-warning-text border border-status-warning-text/20"
                            id={`status-badge-failed-${item.deliveryId}`}
                          >
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>{t('deliveryFailures.statusFailed')}</span>
                          </span>
                        )}
                      </td>

                      {/* Attempt Count */}
                      <td className="px-6 py-4 align-top text-center">
                        <span
                          className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-card-header-bg px-2 text-xs font-semibold text-text-heading border border-card-border"
                          id={`attempt-count-${item.deliveryId}`}
                        >
                          {item.attemptCount}
                        </span>
                      </td>

                      {/* Last Attempt Time */}
                      <td className="px-6 py-4 align-top">
                        <span
                          className="text-xs text-text-muted whitespace-nowrap"
                          id={`last-attempt-${item.deliveryId}`}
                        >
                          {formatDateTime(item.lastAttemptAt)}
                        </span>
                      </td>

                      {/* Error Message */}
                      <td className="px-6 py-4 align-top">
                        <div
                          className="max-w-xs sm:max-w-sm rounded-lg bg-bg-subtle/80 p-2 text-2xs font-mono text-status-error-text border border-card-border break-words"
                          id={`error-message-${item.deliveryId}`}
                        >
                          {item.errorMessage || t('deliveryFailures.noErrorDetails')}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div
            className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-card-border bg-card-header-bg gap-3"
            id="delivery-failures-pagination"
          >
            <span className="text-xs text-text-muted font-medium">
              {t('deliveryFailures.showingIndicator', {
                from: startIndex,
                to: endIndex,
                total: totalCount,
              })}
            </span>

            <div className="flex items-center space-x-3">
              <span className="text-xs text-text-muted font-medium">
                {t('deliveryFailures.pageIndicator', {
                  current: page,
                  total: totalPages,
                })}
              </span>

              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  disabled={page <= 1 || loading || refreshing}
                  onClick={() => handlePageChange(page - 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-card-border bg-card-bg text-text-body hover:bg-card-header-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  id="delivery-failures-prev-page"
                  aria-label={t('deliveryFailures.previousPage')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages || loading || refreshing}
                  onClick={() => handlePageChange(page + 1)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-card-border bg-card-bg text-text-body hover:bg-card-header-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  id="delivery-failures-next-page"
                  aria-label={t('deliveryFailures.nextPage')}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
