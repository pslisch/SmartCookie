/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Trash2, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { AuditListItem } from '../types';

interface AuditLogTableProps {
  items: AuditListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onSelectRow: (item: AuditListItem) => void;
  loading: boolean;
}

export const AuditLogTable: React.FC<AuditLogTableProps> = ({
  items,
  totalCount,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onSelectRow,
  loading,
}) => {
  const { t } = useTranslation();

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
        second: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const startIndex = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, totalCount);

  return (
    <div
      className="overflow-hidden rounded-2xl border border-card-border bg-card-bg shadow-xs"
      id="audit-log-table-container"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" id="audit-log-table">
          <thead>
            <tr className="border-b border-card-border bg-card-header-bg/70 text-xs font-semibold text-text-muted uppercase tracking-wider">
              <th scope="col" className="px-6 py-3.5">
                {t('audit.thDateTime', 'Date & Time')}
              </th>
              <th scope="col" className="px-6 py-3.5">
                {t('audit.thActor', 'Actor')}
              </th>
              <th scope="col" className="px-6 py-3.5">
                {t('audit.thAction', 'Action')}
              </th>
              <th scope="col" className="px-6 py-3.5">
                {t('audit.thAffectedObject', 'Affected Object')}
              </th>
              <th scope="col" className="px-6 py-3.5">
                {t('audit.thOutcome', 'Outcome')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-card-border text-sm">
            {items.map((item) => {
              const isDeletion = item.category === 'DELETION';
              const isCompleted = item.action === 'COMPLETED';
              const isFailure = item.outcome === 'FAILURE';
              const isResolved = item.outcome === 'RESOLVED';
              const isSuccess = item.outcome === 'SUCCESS';
              const isUnclassifiedOutcome = !item.outcome;

              return (
                <tr
                  key={item.id}
                  onClick={() => onSelectRow(item)}
                  className="hover:bg-card-header-bg/40 transition-colors cursor-pointer"
                  id={`audit-row-${item.id}`}
                >
                  {/* Date & Time (Browser Local) */}
                  <td className="px-6 py-4 align-top whitespace-nowrap">
                    <span className="text-xs text-text-body font-mono font-medium">
                      {formatDateTime(item.createdAt)}
                    </span>
                  </td>

                  {/* Actor */}
                  <td className="px-6 py-4 align-top">
                    <div className="flex flex-col">
                      <span className="font-semibold text-text-heading text-xs">
                        {item.actor?.displayName || t('audit.systemActor', 'System')}
                      </span>
                      {item.authFailureCount && item.authFailureCount > 1 && (
                        <span className="text-2xs text-text-muted mt-0.5">
                          {t('audit.failureCount', { count: item.authFailureCount, defaultValue: `Failures: ${item.authFailureCount}` })}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Action with deletion/completion icons */}
                  <td className="px-6 py-4 align-top">
                    <div className="flex items-center space-x-1.5">
                      {isDeletion && (
                        <span title={t('audit.deletionCategory', 'Deletion Event')}>
                          <Trash2 className="h-3.5 w-3.5 text-status-error-text shrink-0" />
                        </span>
                      )}
                      {isCompleted && (
                        <span title={t('audit.completedAction', 'Completed')}>
                          <CheckCircle2 className="h-3.5 w-3.5 text-status-success-text shrink-0" />
                        </span>
                      )}
                      <span className="font-mono text-xs font-medium text-text-heading">
                        {item.action}
                      </span>
                    </div>
                  </td>

                  {/* Affected Object */}
                  <td className="px-6 py-4 align-top">
                    <div className="flex flex-col max-w-xs sm:max-w-sm">
                      <span className="font-medium text-text-heading text-xs break-words">
                        {item.affectedObjectName || item.entityType || '—'}
                      </span>
                      {item.entityType && (
                        <span className="text-2xs text-text-muted mt-0.5 font-mono">
                          {item.entityType}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Outcome with Failure Alert Icon */}
                  <td className="px-6 py-4 align-top whitespace-nowrap">
                    <div className="flex items-center space-x-1.5">
                      {isFailure && (
                        <>
                          <AlertTriangle className="h-3.5 w-3.5 text-status-error-text shrink-0" />
                          <span className="text-xs font-semibold text-status-error-text">
                            {t('audit.outcomeFailure', 'Failure')}
                          </span>
                        </>
                      )}
                      {isSuccess && (
                        <span className="text-xs font-semibold text-status-success-text">
                          {t('audit.outcomeSuccess', 'Success')}
                        </span>
                      )}
                      {isResolved && (
                        <span className="text-xs font-semibold text-status-info-text">
                          {t('audit.outcomeResolved', 'Resolved')}
                        </span>
                      )}
                      {isUnclassifiedOutcome && (
                        <span className="text-xs font-medium text-text-muted italic">
                          {t('audit.unclassified', 'Unclassified')}
                        </span>
                      )}
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
        id="audit-log-pagination"
      >
        <span className="text-xs text-text-muted font-medium">
          {t('audit.showingIndicator', {
            from: startIndex,
            to: endIndex,
            total: totalCount,
            defaultValue: `Showing ${startIndex}-${endIndex} of ${totalCount}`,
          })}
        </span>

        <div className="flex items-center space-x-3">
          <span className="text-xs text-text-muted font-medium">
            {t('audit.pageIndicator', {
              current: page,
              total: totalPages,
              defaultValue: `Page ${page} of ${totalPages}`,
            })}
          </span>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => onPageChange(page - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-card-border bg-card-bg text-text-body hover:bg-card-header-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              id="audit-prev-page"
              aria-label={t('audit.previousPage', 'Previous Page')}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => onPageChange(page + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-card-border bg-card-bg text-text-body hover:bg-card-header-bg disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              id="audit-next-page"
              aria-label={t('audit.nextPage', 'Next Page')}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
