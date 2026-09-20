/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  Copy,
  Trash2,
  Lock,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  BookOpen,
  Calendar,
  AlertTriangle,
  Award,
  Megaphone,
  Plus,
} from 'lucide-react';
import { NotificationRule } from '../types';

function getCsrfToken(): string {
  const match = document.cookie.match(/csrfToken=([^;]+)/);
  return match ? match[1] : '';
}

export const NotificationRuleManagement: React.FC = () => {
  const { t } = useTranslation();

  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Action states
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<NotificationRule | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);

  // Feedback banner
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchRules = useCallback(async (isRetry = false) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/notification-admin/rules', {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });

      const contentType = res.headers.get('content-type') || '';

      if (!res.ok) {
        if (contentType.includes('application/json')) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || `${t('notificationRules.loadError')} (${res.status})`);
        }
        throw new Error(`${t('notificationRules.loadError')} (${res.status})`);
      }

      if (!contentType.includes('application/json')) {
        if (!isRetry) {
          setTimeout(() => {
            fetchRules(true);
          }, 1000);
          return;
        }
        throw new Error(t('notificationRules.serverStarting'));
      }

      const data: NotificationRule[] = await res.json();
      setRules(data);
    } catch (err: any) {
      console.error('[NotificationRuleManagement] Error fetching rules:', err);
      setError(err.message || t('notificationRules.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // Toggle rule enabled state
  const handleToggleRule = async (rule: NotificationRule) => {
    if (togglingId === rule.id) return;

    const previousEnabled = rule.enabled;
    const newEnabled = !previousEnabled;

    // Optimistic update
    setRules((prev) =>
      prev.map((r) => (r.id === rule.id ? { ...r, enabled: newEnabled } : r))
    );
    setTogglingId(rule.id);
    setActionError(null);

    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(`/api/notification-admin/rules/${rule.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ enabled: newEnabled }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t('notificationRules.toggleError'));
      }

      const updated = await res.json();
      // Ensure state is synced with server return
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, ...updated } : r)));
      setActionSuccess(
        t('notificationRules.toggleSuccess', {
          name: rule.name,
          status: newEnabled ? t('notificationRules.enabled') : t('notificationRules.disabled'),
        })
      );
    } catch (err: any) {
      console.error('[NotificationRuleManagement] Error toggling rule:', err);
      // Revert optimistic update
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, enabled: previousEnabled } : r))
      );
      setActionError(err.message || t('notificationRules.toggleError'));
    } finally {
      setTogglingId(null);
    }
  };

  // Duplicate rule
  const handleDuplicateRule = async (rule: NotificationRule) => {
    if (duplicatingId === rule.id) return;

    setDuplicatingId(rule.id);
    setActionError(null);
    setActionSuccess(null);

    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(`/api/notification-admin/rules/${rule.id}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t('notificationRules.duplicateError'));
      }

      const duplicatedRule: NotificationRule = await res.json();
      await fetchRules();
      setActionSuccess(
        t('notificationRules.duplicateSuccess', { name: duplicatedRule.name })
      );
    } catch (err: any) {
      console.error('[NotificationRuleManagement] Error duplicating rule:', err);
      setActionError(err.message || t('notificationRules.duplicateError'));
    } finally {
      setDuplicatingId(null);
    }
  };

  // Execute delete custom rule
  const handleExecuteDelete = async (rule: NotificationRule) => {
    try {
      setDeleting(true);
      setDeleteModalError(null);
      setActionError(null);

      const csrfToken = getCsrfToken();
      const res = await fetch(`/api/notification-admin/rules/${rule.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errorMsg = data.error || t('notificationRules.deleteError');
        setDeleteModalError(errorMsg);
        return;
      }

      setRuleToDelete(null);
      setActionSuccess(t('notificationRules.deleteSuccess', { name: rule.name }));
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
    } catch (err: any) {
      console.error('[NotificationRuleManagement] Error deleting rule:', err);
      setDeleteModalError(err.message || t('notificationRules.deleteError'));
    } finally {
      setDeleting(false);
    }
  };

  const getNotificationTypeLabel = (type: string): string => {
    const key = `profile.notifications.types.${type}.title`;
    const translated = t(key);
    return translated !== key ? translated : type;
  };

  const getNotificationTypeIcon = (type: string) => {
    switch (type) {
      case 'LESSON_ASSIGNED':
        return <BookOpen className="h-4 w-4" />;
      case 'REMINDER':
        return <Bell className="h-4 w-4" />;
      case 'DUE_SOON':
        return <Calendar className="h-4 w-4" />;
      case 'OVERDUE':
      case 'MANAGER_OVERDUE':
        return <AlertTriangle className="h-4 w-4" />;
      case 'COMPLETION_CONFIRMATION':
      case 'MANAGER_COMPLETION':
        return <CheckCircle className="h-4 w-4" />;
      case 'CERTIFICATES':
        return <Award className="h-4 w-4" />;
      case 'SYSTEM_ANNOUNCEMENTS':
        return <Megaphone className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6" id="notification-rule-management">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-card-border">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold tracking-tight text-text-heading font-sans">
              {t('notificationRules.title')}
            </h2>
            {!loading && (
              <span
                className="inline-flex items-center rounded-full bg-card-header-bg px-2.5 py-0.5 text-xs font-semibold text-text-muted border border-card-border"
                id="rules-count-badge"
              >
                {t('notificationRules.rulesCount', { count: rules.length })}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-text-muted font-sans max-w-2xl">
            {t('notificationRules.subtitle')}
          </p>
        </div>

        {/* Visibly disabled Create Rule button for Phase 3 */}
        <div className="shrink-0">
          <button
            type="button"
            disabled
            className="inline-flex items-center space-x-2 rounded-xl border border-card-border bg-card-header-bg/60 px-4 py-2 text-sm font-semibold text-text-muted cursor-not-allowed opacity-60 shadow-xs"
            id="create-rule-disabled-btn"
            title={t('notificationRules.createRuleComingSoon')}
          >
            <Plus className="h-4 w-4" />
            <span>{t('notificationRules.createRuleBtn')}</span>
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
            id="rule-action-success-banner"
          >
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-sans">{actionSuccess}</p>
            </div>
            <button
              type="button"
              onClick={() => setActionSuccess(null)}
              className="text-current/70 hover:text-current ml-2 cursor-pointer"
              id="dismiss-action-success-btn"
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
            id="rule-action-error-banner"
          >
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-sans">{actionError}</p>
            </div>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-current/70 hover:text-current ml-2 cursor-pointer"
              id="dismiss-action-error-btn"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area: Loading, Error, or List */}
      {loading ? (
        <div
          className="flex min-h-[300px] flex-col items-center justify-center p-8"
          id="notification-rules-loading"
        >
          <Loader2 className="h-8 w-8 animate-spin text-link-primary mb-3" />
          <p className="text-sm text-text-muted font-sans">{t('notificationRules.loading')}</p>
        </div>
      ) : error ? (
        <div
          className="flex items-center justify-between p-4 rounded-xl bg-status-error-bg/50 border border-status-error-text/20 text-status-error-text"
          id="notification-rules-error"
        >
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-sans">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => fetchRules()}
            className="ml-4 px-3 py-1.5 text-xs font-semibold rounded-lg bg-status-error-text text-white hover:opacity-90 transition-opacity cursor-pointer shrink-0"
            id="notification-rules-retry-btn"
          >
            {t('notificationRules.retry')}
          </button>
        </div>
      ) : rules.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center border border-dashed border-card-border rounded-2xl bg-card-bg p-12 text-center"
          id="notification-rules-empty"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-card-header-bg text-text-muted mb-4">
            <Bell className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-text-heading font-sans">
            {t('notificationRules.emptyStateTitle')}
          </h3>
          <p className="text-sm text-text-muted mt-1 max-w-sm font-sans">
            {t('notificationRules.emptyStateDesc')}
          </p>
        </div>
      ) : (
        /* Rules Table */
        <div
          className="overflow-hidden rounded-2xl border border-card-border bg-card-bg shadow-xs"
          id="notification-rules-table-container"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="notification-rules-table">
              <thead>
                <tr className="border-b border-card-border bg-card-header-bg/70 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  <th scope="col" className="px-6 py-3.5">
                    {t('notificationRules.thRule')}
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    {t('notificationRules.thType')}
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    {t('notificationRules.thChannels')}
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    {t('notificationRules.thStatus')}
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    {t('notificationRules.thActions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border text-sm">
                {rules.map((rule) => {
                  const isToggling = togglingId === rule.id;
                  const isDuplicating = duplicatingId === rule.id;

                  return (
                    <tr
                      key={rule.id}
                      className="hover:bg-card-header-bg/40 transition-colors"
                      id={`rule-row-${rule.id}`}
                    >
                      {/* Rule Name & Badges */}
                      <td className="px-6 py-4 align-middle">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className="font-bold text-text-heading font-sans"
                              id={`rule-name-${rule.id}`}
                            >
                              {rule.name}
                            </span>
                            {rule.isSystemDefault ? (
                              <span
                                className="inline-flex items-center space-x-1 rounded-md bg-status-info-bg px-2 py-0.5 text-2xs font-semibold text-status-info-text border border-status-info-text/20"
                                id={`badge-system-default-${rule.id}`}
                              >
                                <Lock className="h-3 w-3 mr-0.5 shrink-0" />
                                <span>{t('notificationRules.systemDefaultBadge')}</span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center rounded-md bg-bg-subtle px-2 py-0.5 text-2xs font-semibold text-text-muted border border-card-border"
                                id={`badge-custom-${rule.id}`}
                              >
                                {t('notificationRules.customBadge')}
                              </span>
                            )}
                            {rule.mandatory && (
                              <span
                                className="inline-flex items-center rounded-md bg-status-warning-bg px-2 py-0.5 text-2xs font-semibold text-status-warning-text border border-status-warning-text/20"
                                id={`badge-mandatory-${rule.id}`}
                              >
                                {t('notificationRules.mandatoryBadge')}
                              </span>
                            )}
                          </div>
                          {rule.titleKey && (
                            <p className="text-xs text-text-muted font-mono line-clamp-1">
                              {rule.titleKey}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Notification Type */}
                      <td className="px-6 py-4 align-middle">
                        <div className="flex items-center space-x-2 text-text-body">
                          <span className="text-text-muted shrink-0">
                            {getNotificationTypeIcon(rule.notificationType)}
                          </span>
                          <span className="text-xs font-semibold font-sans">
                            {getNotificationTypeLabel(rule.notificationType)}
                          </span>
                        </div>
                      </td>

                      {/* Delivery Channels */}
                      <td className="px-6 py-4 align-middle">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {rule.channels?.inLms && (
                            <span className="inline-flex items-center rounded-md bg-card-header-bg px-2 py-0.5 text-2xs font-medium text-text-heading border border-card-border">
                              {t('notificationRules.channelInLms')}
                            </span>
                          )}
                          {rule.channels?.email && (
                            <span className="inline-flex items-center rounded-md bg-card-header-bg px-2 py-0.5 text-2xs font-medium text-text-heading border border-card-border">
                              {t('notificationRules.channelEmail')}
                            </span>
                          )}
                          {!rule.channels?.inLms && !rule.channels?.email && (
                            <span className="text-xs text-text-muted italic">
                              {t('notificationRules.noChannels')}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Enabled / Disabled Switch */}
                      <td className="px-6 py-4 align-middle">
                        <div className="flex items-center space-x-2.5">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={rule.enabled}
                            disabled={isToggling}
                            onClick={() => handleToggleRule(rule)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-link-primary/20 ${
                              rule.enabled ? 'bg-btn-primary-bg' : 'bg-input-border'
                            } ${isToggling ? 'opacity-50 cursor-wait' : ''}`}
                            id={`rule-switch-${rule.id}`}
                            aria-label={`${rule.name} - ${
                              rule.enabled
                                ? t('notificationRules.enabled')
                                : t('notificationRules.disabled')
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-card-bg shadow-sm ring-0 transition duration-200 ease-in-out ${
                                rule.enabled ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span className="text-xs font-medium text-text-muted">
                            {rule.enabled
                              ? t('notificationRules.enabled')
                              : t('notificationRules.disabled')}
                          </span>
                        </div>
                      </td>

                      {/* Actions: Duplicate & Delete */}
                      <td className="px-6 py-4 align-middle text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Duplicate Button (Always Available) */}
                          <button
                            type="button"
                            disabled={isDuplicating}
                            onClick={() => handleDuplicateRule(rule)}
                            className="inline-flex items-center space-x-1.5 rounded-lg border border-card-border bg-card-bg px-2.5 py-1.5 text-xs font-semibold text-text-body shadow-xs hover:bg-card-header-bg hover:text-text-heading transition-colors cursor-pointer disabled:opacity-50"
                            id={`duplicate-rule-btn-${rule.id}`}
                            title={t('notificationRules.duplicateBtn')}
                          >
                            {isDuplicating ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                            <span>{t('notificationRules.duplicateBtn')}</span>
                          </button>

                          {/* Delete Button: Locked for System Default, Active for Custom */}
                          {rule.isSystemDefault ? (
                            <button
                              type="button"
                              disabled
                              className="inline-flex items-center space-x-1.5 rounded-lg border border-card-border/40 bg-bg-subtle/50 px-2.5 py-1.5 text-xs font-semibold text-text-muted/60 cursor-not-allowed opacity-50"
                              id={`delete-rule-btn-${rule.id}`}
                              aria-label={t('notificationRules.deleteDisabledTooltip')}
                              title={t('notificationRules.deleteDisabledTooltip')}
                            >
                              <Lock className="h-3.5 w-3.5 shrink-0" />
                              <span>{t('notificationRules.deleteBtn')}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteModalError(null);
                                setRuleToDelete(rule);
                              }}
                              className="inline-flex items-center space-x-1.5 rounded-lg border border-card-border bg-card-bg px-2.5 py-1.5 text-xs font-semibold text-status-error-text shadow-xs hover:bg-status-error-bg hover:border-status-error-text/30 transition-colors cursor-pointer"
                              id={`delete-rule-btn-${rule.id}`}
                              title={t('notificationRules.deleteBtn')}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>{t('notificationRules.deleteBtn')}</span>
                            </button>
                          )}
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

      {/* Delete Confirmation Modal (Mirrors ThemeManagement.tsx) */}
      <AnimatePresence>
        {ruleToDelete && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-overlay backdrop-blur-xs"
            id="delete-rule-modal-backdrop"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md rounded-2xl border border-card-border bg-card-bg shadow-xl overflow-hidden"
              id="delete-rule-modal"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-card-border">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-status-error-bg text-status-error-text">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-heading font-sans">
                      {t('notificationRules.deleteConfirmTitle')}
                    </h3>
                    <p className="text-xs text-text-muted font-sans line-clamp-1">
                      {ruleToDelete.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setRuleToDelete(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-card-header-bg transition-colors cursor-pointer"
                  id="close-delete-rule-modal-btn"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                {deleteModalError && (
                  <div className="flex items-center space-x-2 p-3 rounded-xl bg-status-error-bg text-status-error-text text-xs border border-status-error-text/20">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{deleteModalError}</span>
                  </div>
                )}

                <p className="text-sm text-text-body font-sans leading-relaxed">
                  {t('notificationRules.deleteConfirmMessage', { name: ruleToDelete.name })}
                </p>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end space-x-3 p-6 pt-4 border-t border-card-border">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setRuleToDelete(null)}
                  className="rounded-xl border border-card-border bg-card-bg px-4 py-2 text-sm font-semibold text-text-heading shadow-sm hover:bg-card-header-bg transition-colors cursor-pointer disabled:opacity-60"
                  id="cancel-delete-rule-btn"
                >
                  {t('notificationRules.cancelBtn')}
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => handleExecuteDelete(ruleToDelete)}
                  className="inline-flex items-center space-x-2 rounded-xl bg-status-error-text px-4 py-2 text-sm font-semibold text-btn-primary-text shadow-sm hover:bg-status-error-text/90 transition-colors cursor-pointer disabled:opacity-60"
                  id="confirm-delete-rule-btn"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t('notificationRules.deleting')}</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span>{t('notificationRules.confirmDeleteBtn')}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
