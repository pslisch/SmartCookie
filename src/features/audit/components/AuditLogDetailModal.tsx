/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { AuditDetailResponse, AuditListItem } from '../types';
import { CopyableIdTooltip } from '../../../shared/components/CopyableIdTooltip';

interface AuditLogDetailModalProps {
  selectedItem: AuditListItem | null;
  onClose: () => void;
}

export const AuditLogDetailModal: React.FC<AuditLogDetailModalProps> = ({
  selectedItem,
  onClose,
}) => {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<AuditDetailResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedItem) {
      setDetail(null);
      return;
    }

    let isMounted = true;
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/audit-logs/${selectedItem.id}`);
        if (!res.ok) {
          throw new Error(`Failed to load audit detail (${res.status})`);
        }
        const data: AuditDetailResponse = await res.json();
        if (isMounted) {
          setDetail(data);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error loading audit detail');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [selectedItem]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (selectedItem) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedItem, onClose]);

  if (!selectedItem) return null;

  const formatDateTime = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return String(dateStr);
    }
  };

  const itemData = detail || selectedItem;
  const changes = Array.isArray(detail?.changes) ? detail.changes : [];
  const additionalObjects = Array.isArray(detail?.additionalAffectedObjects) ? detail.additionalAffectedObjects : [];
  const detailsObj = detail?.details && typeof detail.details === 'object' ? detail.details : null;

  const modalContent = (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        id="audit-detail-modal-backdrop"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-card-border bg-card-bg p-6 shadow-2xl ring-1 ring-black/5 text-left"
          id="audit-detail-modal-card"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-card-border">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-base font-bold text-text-heading">
                  {itemData.action}
                </span>
                {itemData.outcome === 'FAILURE' && (
                  <span className="inline-flex items-center space-x-1 rounded-md bg-status-error-bg px-2 py-0.5 text-2xs font-bold text-status-error-text border border-status-error-text/20">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    <span>{t('audit.outcomeFailure', 'Failure')}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted mt-1">
                {formatDateTime(itemData.createdAt)}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-card-border text-text-muted hover:bg-card-header-bg hover:text-text-heading transition-colors cursor-pointer"
              id="audit-detail-modal-close-btn"
              aria-label={t('common.close', 'Close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Loading / Error indicator */}
          {loading && !detail && (
            <div className="flex items-center justify-center py-8 text-text-muted">
              <Loader2 className="h-6 w-6 animate-spin text-link-primary" />
            </div>
          )}

          {error && (
            <div className="my-4 p-3 rounded-xl bg-status-error-bg text-status-error-text text-xs">
              {error}
            </div>
          )}

          {/* Modal Body */}
          <div className="space-y-6 pt-4">
            {/* Primary Attributes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-card-header-bg/50 border border-card-border p-4">
              <div>
                <span className="text-2xs font-bold uppercase tracking-wider text-text-muted block">
                  {t('audit.actor', 'Actor')}
                </span>
                <span className="text-xs font-semibold text-text-heading mt-0.5 block">
                  {itemData.actor?.displayName || t('audit.systemActor', 'System')}
                </span>
                {detail?.triggeredBy && (
                  <span className="text-2xs text-text-muted block mt-0.5">
                    {t('audit.triggeredBy', 'Triggered by')}: {detail.triggeredBy.displayName}
                  </span>
                )}
              </div>

              <div>
                <span className="text-2xs font-bold uppercase tracking-wider text-text-muted block">
                  {t('audit.category', 'Category')}
                </span>
                <span className="text-xs font-medium text-text-body mt-0.5 block">
                  {itemData.category || t('audit.unclassified', 'Unclassified')}
                </span>
              </div>

              <div>
                <span className="text-2xs font-bold uppercase tracking-wider text-text-muted block">
                  {t('audit.affectedObject', 'Affected Object')}
                </span>
                <span className="text-xs font-semibold text-text-heading mt-0.5 block break-words">
                  {itemData.affectedObjectName || itemData.entityType || '—'}
                </span>
              </div>

              <div>
                <span className="text-2xs font-bold uppercase tracking-wider text-text-muted block">
                  {t('audit.outcome', 'Outcome')}
                </span>
                <span className="text-xs font-semibold text-text-heading mt-0.5 block">
                  {itemData.outcome || t('audit.unclassified', 'Unclassified')}
                </span>
              </div>

              {itemData.authFailureCount !== null && itemData.authFailureCount !== undefined && (
                <div>
                  <span className="text-2xs font-bold uppercase tracking-wider text-text-muted block">
                    {t('audit.authFailureCount', 'Failure Attempts Count')}
                  </span>
                  <span className="text-xs font-mono font-bold text-status-error-text mt-0.5 block">
                    {itemData.authFailureCount}
                  </span>
                </div>
              )}

              {itemData.resolvedAt && (
                <div>
                  <span className="text-2xs font-bold uppercase tracking-wider text-text-muted block">
                    {t('audit.resolvedAt', 'Resolved At')}
                  </span>
                  <span className="text-xs font-mono text-status-info-text mt-0.5 block">
                    {formatDateTime(itemData.resolvedAt)}
                  </span>
                </div>
              )}
            </div>

            {/* Field Changes Mini-Table (when present) */}
            {changes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  {t('audit.fieldChanges', 'Field Modifications')}
                </h4>
                <div className="overflow-hidden rounded-xl border border-card-border bg-card-bg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-card-border bg-card-header-bg/80 text-2xs font-semibold text-text-muted uppercase">
                        <th className="px-4 py-2">{t('audit.thField', 'Field')}</th>
                        <th className="px-4 py-2">{t('audit.thBefore', 'Before')}</th>
                        <th className="px-4 py-2">{t('audit.thAfter', 'After')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-card-border font-mono">
                      {changes.map((change, idx) => (
                        <tr key={idx} className="hover:bg-card-header-bg/30">
                          <td className="px-4 py-2 font-semibold text-text-heading">{change.field}</td>
                          <td className="px-4 py-2 text-text-muted break-all">
                            {change.before !== undefined ? String(change.before) : '—'}
                          </td>
                          <td className="px-4 py-2 text-text-heading font-medium break-all">
                            {change.after !== undefined ? String(change.after) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Structured Details (Sanitized) */}
            {detailsObj && Object.keys(detailsObj).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                  {t('audit.detailsTitle', 'Event Metadata & Details')}
                </h4>
                <div className="rounded-xl border border-card-border bg-bg-subtle/70 p-3 space-y-1.5 text-xs font-mono">
                  {Object.entries(detailsObj).map(([key, value]) => (
                    <div key={key} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                      <span className="font-semibold text-text-heading min-w-[140px] shrink-0">
                        {key}:
                      </span>
                      <span className="text-text-body break-all font-mono">
                        {typeof value === 'object' && value !== null
                          ? JSON.stringify(value, null, 2)
                          : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Technical Information Section */}
            <div className="space-y-2 pt-2 border-t border-card-border">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                {t('audit.technicalInfo', 'Technical Identifiers')}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-card-border bg-card-bg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">{t('audit.auditId', 'Audit Event ID')}:</span>
                  <CopyableIdTooltip idValue={itemData.id} idPrefix="audit-event" />
                </div>

                {detail?.entityId && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">
                      {detail.entityType || 'Entity'} ID:
                    </span>
                    <CopyableIdTooltip idValue={detail.entityId} idPrefix="entity-target" />
                  </div>
                )}

                {additionalObjects.map((obj, i) => (
                  <div key={i} className="flex items-center justify-between col-span-full">
                    <span className="text-xs text-text-muted">
                      {obj.type} ({obj.name}):
                    </span>
                    <CopyableIdTooltip idValue={obj.id} idPrefix={`addl-obj-${i}`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  if (typeof document === 'undefined') {
    return modalContent;
  }

  return createPortal(modalContent, document.body);
};
