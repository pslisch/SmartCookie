/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  FileCode,
  Plus,
  Edit,
  Trash2,
  Star,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Lock,
  Link as LinkIcon,
  Calendar,
  User as UserIcon,
} from 'lucide-react';
import { EmailTemplate } from '../types';
import { EmailTemplateForm } from '../components/EmailTemplateForm';

function getCsrfToken(): string {
  const match = document.cookie.match(/csrfToken=([^;]+)/);
  return match ? match[1] : '';
}

export const EmailTemplateManagement: React.FC = () => {
  const { t } = useTranslation();

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form View State: undefined = list, null = create, object = edit
  const [formTemplate, setFormTemplate] = useState<EmailTemplate | null | undefined>(undefined);

  // Default setting state
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  // Deletion Modal State
  const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);

  // Action status banners
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch Templates
  const fetchTemplates = useCallback(async (isRetry = false) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/email-templates', {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });

      const contentType = res.headers.get('content-type') || '';

      if (!res.ok) {
        if (contentType.includes('application/json')) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || `${t('emailTemplates.loadError', 'Failed to load email templates.')} (${res.status})`);
        }
        throw new Error(`${t('emailTemplates.loadError', 'Failed to load email templates.')} (${res.status})`);
      }

      if (!contentType.includes('application/json')) {
        if (!isRetry) {
          setTimeout(() => {
            fetchTemplates(true);
          }, 1000);
          return;
        }
        throw new Error(t('emailTemplates.serverStarting', 'Waiting for server to respond...'));
      }

      const data: EmailTemplate[] = await res.json();
      setTemplates(data);
    } catch (err: any) {
      console.error('[EmailTemplateManagement] Error fetching templates:', err);
      setError(err.message || t('emailTemplates.loadError', 'Failed to load email templates.'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Set Template as Default
  const handleSetDefault = async (template: EmailTemplate) => {
    if (template.isDefault || settingDefaultId === template.id) return;

    setSettingDefaultId(template.id);
    setActionError(null);
    setActionSuccess(null);

    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(`/api/email-templates/${template.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ isDefault: true }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || t('emailTemplates.setDefaultError', 'Failed to set template as default.'));
      }

      setActionSuccess(
        t('emailTemplates.setDefaultSuccess', {
          name: template.name,
          defaultValue: `"${template.name}" is now designated as your company's default email template.`,
        })
      );
      await fetchTemplates();
    } catch (err: any) {
      console.error('[EmailTemplateManagement] Error setting default template:', err);
      setActionError(err.message || t('emailTemplates.setDefaultError', 'Failed to set template as default.'));
    } finally {
      setSettingDefaultId(null);
    }
  };

  // Delete Template Confirmation & Execution
  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;

    setDeleting(true);
    setDeleteModalError(null);

    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(`/api/email-templates/${templateToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || t('emailTemplates.deleteError', 'Failed to delete template.'));
      }

      setActionSuccess(
        t('emailTemplates.deleteSuccess', {
          name: templateToDelete.name,
          defaultValue: `Template "${templateToDelete.name}" was deleted successfully.`,
        })
      );
      setTemplateToDelete(null);
      await fetchTemplates();
    } catch (err: any) {
      console.error('[EmailTemplateManagement] Error deleting template:', err);
      setDeleteModalError(err.message || t('emailTemplates.deleteError', 'Failed to delete template.'));
    } finally {
      setDeleting(false);
    }
  };

  // If in Create/Edit mode, render the Form
  if (formTemplate !== undefined) {
    return (
      <div className="space-y-6" id="email-template-form-view">
        <EmailTemplateForm
          template={formTemplate}
          onSuccess={(saved) => {
            const isEdit = Boolean(formTemplate);
            setFormTemplate(undefined);
            setActionSuccess(
              isEdit
                ? t('emailTemplates.form.editSuccess', {
                    name: saved.name,
                    defaultValue: `Successfully updated template "${saved.name}".`,
                  })
                : t('emailTemplates.form.createSuccess', {
                    name: saved.name,
                    defaultValue: `Successfully created template "${saved.name}".`,
                  })
            );
            fetchTemplates();
          }}
          onCancel={() => setFormTemplate(undefined)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6" id="email-template-management">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-card-border">
        <div>
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold tracking-tight text-text-heading font-sans">
              {t('emailTemplates.title', 'Email Templates')}
            </h2>
            {!loading && (
              <span
                className="inline-flex items-center rounded-full bg-card-header-bg px-2.5 py-0.5 text-xs font-semibold text-text-muted border border-card-border"
                id="templates-count-badge"
              >
                {t('emailTemplates.countBadge', { count: templates.length, defaultValue: `${templates.length} Templates Total` })}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-text-muted font-sans max-w-2xl">
            {t(
              'emailTemplates.subtitle',
              'Manage customized HTML layouts for system notifications. Assign default styling or target specific rules.'
            )}
          </p>
        </div>

        {/* Create Template Button */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={() => setFormTemplate(null)}
            className="inline-flex items-center space-x-2 rounded-xl bg-btn-primary-bg px-4 py-2 text-sm font-semibold text-btn-primary-text shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
            id="btn-create-email-template"
          >
            <Plus className="h-4 w-4" />
            <span>{t('emailTemplates.createBtn', 'Create Template')}</span>
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
            id="template-action-success-banner"
          >
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <p className="text-sm font-sans">{actionSuccess}</p>
            </div>
            <button
              type="button"
              onClick={() => setActionSuccess(null)}
              className="text-current/70 hover:text-current ml-2 cursor-pointer"
              id="dismiss-template-success-btn"
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
            id="template-action-error-banner"
          >
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-sans">{actionError}</p>
            </div>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-current/70 hover:text-current ml-2 cursor-pointer"
              id="dismiss-template-error-btn"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      {loading ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-2xl border border-card-border bg-card-bg shadow-xs"
          id="email-templates-loading-state"
        >
          <Loader2 className="h-8 w-8 animate-spin text-link-primary mb-3" />
          <p className="text-sm font-medium text-text-muted font-sans">
            {t('emailTemplates.loading', 'Loading email templates...')}
          </p>
        </div>
      ) : error ? (
        <div
          className="flex flex-col items-center justify-center p-8 rounded-2xl border border-status-error-text/20 bg-status-error-bg/30 text-center shadow-xs"
          id="email-templates-error-state"
        >
          <AlertCircle className="h-8 w-8 text-status-error-text mb-3" />
          <h3 className="text-base font-bold text-text-heading font-sans">
            {t('emailTemplates.loadErrorTitle', 'Error Loading Templates')}
          </h3>
          <p className="text-sm text-text-muted mt-1 max-w-md font-sans">{error}</p>
          <button
            type="button"
            onClick={() => fetchTemplates()}
            className="mt-4 inline-flex items-center space-x-2 rounded-xl border border-card-border bg-card-bg px-4 py-2 text-xs font-semibold text-text-heading shadow-xs hover:bg-card-header-bg transition-colors cursor-pointer"
          >
            {t('emailTemplates.retryBtn', 'Retry')}
          </button>
        </div>
      ) : templates.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl border border-dashed border-card-border bg-card-bg text-center shadow-xs"
          id="email-templates-empty-state"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-status-info-bg text-link-primary mb-4">
            <FileCode className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-text-heading font-sans">
            {t('emailTemplates.emptyStateTitle', 'No Email Templates Found')}
          </h3>
          <p className="text-sm text-text-muted mt-1 max-w-md font-sans">
            {t(
              'emailTemplates.emptyStateDesc',
              'There are no email templates configured yet. Create a standard corporate template to customize notification styling.'
            )}
          </p>
          <button
            type="button"
            onClick={() => setFormTemplate(null)}
            className="mt-6 inline-flex items-center space-x-2 rounded-xl bg-btn-primary-bg px-4 py-2 text-sm font-semibold text-btn-primary-text shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>{t('emailTemplates.createFirstBtn', 'Create First Template')}</span>
          </button>
        </div>
      ) : (
        /* Templates Table / List */
        <div className="overflow-hidden rounded-2xl border border-card-border bg-card-bg shadow-xs" id="email-templates-table-wrapper">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-sans border-collapse" id="email-templates-table">
              <thead>
                <tr className="border-b border-card-border bg-card-header-bg text-xs font-bold uppercase tracking-wider text-text-muted">
                  <th className="py-3.5 px-6">{t('emailTemplates.thName', 'Template')}</th>
                  <th className="py-3.5 px-4">{t('emailTemplates.thStatus', 'Status')}</th>
                  <th className="py-3.5 px-4">{t('emailTemplates.thReferencedRules', 'Referencing Rules')}</th>
                  <th className="py-3.5 px-4">{t('emailTemplates.thCreatedBy', 'Created By')}</th>
                  <th className="py-3.5 px-6 text-right">{t('emailTemplates.thActions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {templates.map((tmpl) => {
                  const ruleCount = tmpl._count?.notificationRules ?? 0;
                  const isReferenced = ruleCount > 0;
                  const isDefault = tmpl.isDefault;

                  // Compute whether deletion is blocked and the exact explanation
                  const deleteBlocked = isDefault || isReferenced;
                  let deleteBlockedReason = '';
                  if (isDefault && isReferenced) {
                    deleteBlockedReason = t(
                      'emailTemplates.deleteBlockedDefaultAndReferenced',
                      `Cannot delete template: it is designated as default and referenced by ${ruleCount} rule(s).`
                    );
                  } else if (isDefault) {
                    deleteBlockedReason = t(
                      'emailTemplates.deleteBlockedDefault',
                      'Cannot delete the current default email template. Please designate another default template first.'
                    );
                  } else if (isReferenced) {
                    deleteBlockedReason = t(
                      'emailTemplates.deleteBlockedReferenced',
                      `Cannot delete email template because it is currently referenced by ${ruleCount} notification rule(s). Please reassign or clear those rules first.`
                    );
                  }

                  return (
                    <tr
                      key={tmpl.id}
                      id={`template-row-${tmpl.id}`}
                      className="hover:bg-card-header-bg/40 transition-colors"
                    >
                      {/* Name & ID */}
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-card-header-bg text-link-primary border border-card-border shrink-0">
                            <FileCode className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-bold text-text-heading text-sm">
                              {tmpl.name}
                            </div>
                            <div className="text-xs text-text-muted font-mono mt-0.5">
                              {tmpl.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status Badges */}
                      <td className="py-4 px-4">
                        {isDefault ? (
                          <span
                            className="inline-flex items-center space-x-1 rounded-full bg-status-success-bg px-2.5 py-0.5 text-xs font-semibold text-status-success-text border border-status-success-text/20"
                            id={`badge-default-${tmpl.id}`}
                          >
                            <Star className="h-3 w-3 fill-current" />
                            <span>{t('emailTemplates.defaultBadge', 'Default')}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-card-header-bg px-2.5 py-0.5 text-xs font-medium text-text-muted border border-card-border">
                            {t('emailTemplates.customBadge', 'Custom')}
                          </span>
                        )}
                      </td>

                      {/* Referencing Rules Count */}
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-1.5 text-xs">
                          <LinkIcon className="h-3.5 w-3.5 text-text-muted shrink-0" />
                          <span
                            className={`font-semibold ${
                              isReferenced ? 'text-link-primary' : 'text-text-muted'
                            }`}
                            id={`rule-count-${tmpl.id}`}
                          >
                            {ruleCount === 1
                              ? t('emailTemplates.ruleCount_one', '1 rule')
                              : t('emailTemplates.ruleCount_other', {
                                  count: ruleCount,
                                  defaultValue: `${ruleCount} rules`,
                                })}
                          </span>
                        </div>
                      </td>

                      {/* Created By & Date */}
                      <td className="py-4 px-4 text-xs text-text-muted">
                        <div className="flex items-center space-x-1">
                          <UserIcon className="h-3.5 w-3.5 shrink-0" />
                          <span>{tmpl.createdBy?.username || t('emailTemplates.unknownUser', 'System / Admin')}</span>
                        </div>
                        <div className="flex items-center space-x-1 mt-0.5 text-[11px]">
                          <Calendar className="h-3 w-3 shrink-0" />
                          <span>{new Date(tmpl.createdAt).toLocaleDateString()}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Set Default Action */}
                          {!isDefault && (
                            <button
                              type="button"
                              onClick={() => handleSetDefault(tmpl)}
                              disabled={settingDefaultId === tmpl.id}
                              className="inline-flex items-center space-x-1 rounded-lg border border-card-border bg-card-bg px-2.5 py-1 text-xs font-semibold text-text-heading hover:bg-card-header-bg transition-colors cursor-pointer disabled:opacity-50"
                              id={`btn-set-default-${tmpl.id}`}
                              title={t('emailTemplates.setDefaultTooltip', 'Make this the default template for all rules that have no custom template.')}
                            >
                              {settingDefaultId === tmpl.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Star className="h-3.5 w-3.5 text-link-primary" />
                              )}
                              <span>{t('emailTemplates.setDefaultBtn', 'Set Default')}</span>
                            </button>
                          )}

                          {/* Edit Action */}
                          <button
                            type="button"
                            onClick={() => setFormTemplate(tmpl)}
                            className="inline-flex items-center space-x-1 rounded-lg border border-card-border bg-card-bg px-2.5 py-1 text-xs font-semibold text-text-heading hover:bg-card-header-bg transition-colors cursor-pointer"
                            id={`btn-edit-${tmpl.id}`}
                            title={t('emailTemplates.editBtn', 'Edit')}
                          >
                            <Edit className="h-3.5 w-3.5 text-text-muted" />
                            <span>{t('emailTemplates.editBtn', 'Edit')}</span>
                          </button>

                          {/* Delete Action (Disabled with explanatory title if blocked) */}
                          <div className="relative inline-block" title={deleteBlockedReason || t('emailTemplates.deleteBtn', 'Delete')}>
                            <button
                              type="button"
                              onClick={() => setTemplateToDelete(tmpl)}
                              disabled={deleteBlocked}
                              className={`inline-flex items-center space-x-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                                deleteBlocked
                                  ? 'border-card-border bg-card-header-bg/50 text-text-muted/50 cursor-not-allowed'
                                  : 'border-card-border bg-card-bg text-status-error-text hover:bg-status-error-bg/30 hover:border-status-error-text/30 cursor-pointer'
                              }`}
                              id={`btn-delete-${tmpl.id}`}
                            >
                              {deleteBlocked ? (
                                <Lock className="h-3.5 w-3.5 text-text-muted/60" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                              <span>{t('emailTemplates.deleteBtn', 'Delete')}</span>
                            </button>
                          </div>
                        </div>

                        {/* Inline blocked reason display if blocked */}
                        {deleteBlocked && (
                          <div className="text-[10px] text-text-muted mt-1 max-w-xs ml-auto">
                            {isDefault && (
                              <span className="block text-amber-600 dark:text-amber-400 font-medium">
                                • {t('emailTemplates.deleteBlockedShortDefault', 'Default template cannot be deleted')}
                              </span>
                            )}
                            {isReferenced && (
                              <span className="block text-amber-600 dark:text-amber-400 font-medium">
                                • {t('emailTemplates.deleteBlockedShortReferenced', {
                                  count: ruleCount,
                                  defaultValue: `Referenced by ${ruleCount} rule(s)`,
                                })}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {templateToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-card-border bg-card-bg p-6 shadow-xl space-y-4"
              id="template-delete-modal"
            >
              <div className="flex items-center space-x-3 text-status-error-text">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-status-error-bg">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-heading font-sans">
                    {t('emailTemplates.deleteModalTitle', 'Delete Email Template')}
                  </h3>
                  <p className="text-xs text-text-muted font-sans">
                    {t('emailTemplates.deleteModalSubtitle', 'Confirm template soft-deletion')}
                  </p>
                </div>
              </div>

              {deleteModalError && (
                <div className="p-3 rounded-xl bg-status-error-bg/50 border border-status-error-text/20 text-status-error-text text-xs">
                  {deleteModalError}
                </div>
              )}

              <p className="text-sm text-text-heading font-sans leading-relaxed">
                {t('emailTemplates.deleteConfirmText', {
                  name: templateToDelete.name,
                  defaultValue: `Are you sure you want to delete the email template "${templateToDelete.name}"? This action will archive the template.`,
                })}
              </p>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => {
                    setTemplateToDelete(null);
                    setDeleteModalError(null);
                  }}
                  disabled={deleting}
                  className="rounded-xl border border-card-border bg-card-bg px-4 py-2 text-xs font-semibold text-text-heading hover:bg-card-header-bg transition-colors cursor-pointer"
                  id="btn-cancel-delete-modal"
                >
                  {t('emailTemplates.cancelBtn', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="inline-flex items-center space-x-2 rounded-xl bg-status-error-text px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                  id="btn-confirm-delete-modal"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>{t('emailTemplates.deleting', 'Deleting...')}</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>{t('emailTemplates.confirmDeleteBtn', 'Delete Template')}</span>
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
