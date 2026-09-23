/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Save,
  AlertCircle,
  Loader2,
  FileCode,
  Eye,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { EmailTemplate } from '../types';
import { EmailTemplateVariableHelper } from './EmailTemplateVariableHelper';

export interface EmailTemplateFormProps {
  template: EmailTemplate | null; // null for create mode, existing template for edit mode
  onSuccess: (savedTemplate: EmailTemplate) => void;
  onCancel: () => void;
}

function getCsrfToken(): string {
  const match = document.cookie.match(/csrfToken=([^;]+)/);
  return match ? match[1] : '';
}

export const EmailTemplateForm: React.FC<EmailTemplateFormProps> = ({
  template,
  onSuccess,
  onCancel,
}) => {
  const { t } = useTranslation();
  const isEditing = Boolean(template);

  const [name, setName] = useState<string>(template?.name || '');
  const [isDefault, setIsDefault] = useState<boolean>(template?.isDefault || false);
  const [htmlContent, setHtmlContent] = useState<string>(
    template?.htmlContent ||
      '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">\n  <h1 style="color: #1f2937; font-size: 20px; margin-bottom: 16px;">Notification</h1>\n  <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">\n    Hello {{learnerName}},\n  </p>\n  <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">\n    This is a notice regarding <strong>{{lessonTitle}}</strong>, due on <strong>{{dueDate}}</strong>.\n  </p>\n  <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />\n  <p style="color: #9ca3af; font-size: 12px;">SmartCookie Learning Platform</p>\n</div>'
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Form submission & validation states
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = t('emailTemplates.form.nameRequired', 'Template name is required.');
    }

    if (!htmlContent.trim()) {
      errors.htmlContent = t('emailTemplates.form.htmlRequired', 'Template HTML content is required.');
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) {
      return;
    }

    setSubmitting(true);

    try {
      const csrfToken = getCsrfToken();
      let res: Response;

      if (isEditing && template) {
        res = await fetch(`/api/email-templates/${template.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          credentials: 'include',
          body: JSON.stringify({
            name: name.trim(),
            htmlContent: htmlContent.trim(),
            isDefault,
          }),
        });
      } else {
        res = await fetch('/api/email-templates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          credentials: 'include',
          body: JSON.stringify({
            name: name.trim(),
            htmlContent: htmlContent.trim(),
            isDefault,
          }),
        });
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || t('emailTemplates.form.saveError', 'Failed to save email template.'));
      }

      onSuccess(data);
    } catch (err: any) {
      console.error('[EmailTemplateForm] Submit error:', err);
      setServerError(err.message || t('emailTemplates.form.unexpectedError', 'An unexpected error occurred.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl" id="email-template-form-container">
      {/* Top Breadcrumb / Back Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-card-border">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-card-border bg-card-bg text-text-body shadow-xs transition-colors hover:bg-card-header-bg cursor-pointer"
            id="btn-back-to-templates"
            title={t('emailTemplates.form.backToList', 'Back to Templates')}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-text-heading font-sans">
              {isEditing
                ? t('emailTemplates.form.editTitle', 'Edit Email Template')
                : t('emailTemplates.form.createTitle', 'Create Email Template')}
            </h2>
            <p className="text-xs text-text-muted mt-0.5 font-sans">
              {isEditing
                ? t('emailTemplates.form.editSubtitle', 'Modify HTML layout, brand variables, and default configuration.')
                : t('emailTemplates.form.createSubtitle', 'Author raw HTML layout for branded email notifications.')}
            </p>
          </div>
        </div>
      </div>

      {/* Server Error Alert */}
      {serverError && (
        <div
          className="flex items-center space-x-3 p-4 rounded-xl bg-status-error-bg/50 border border-status-error-text/20 text-status-error-text"
          id="template-form-server-error"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-sans">{serverError}</p>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6" id="email-template-editor-form">
        {/* Basic Configuration */}
        <div className="rounded-2xl border border-card-border bg-card-bg p-6 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-text-heading font-sans flex items-center space-x-2">
            <FileCode className="h-4 w-4 text-link-primary" />
            <span>{t('emailTemplates.form.generalInfo', 'General Information')}</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Template Name */}
            <div>
              <label
                htmlFor="template-name-input"
                className="block text-xs font-bold text-text-heading uppercase tracking-wider mb-2 font-sans"
              >
                {t('emailTemplates.form.nameLabel', 'Template Name')} <span className="text-status-error-text">*</span>
              </label>
              <input
                type="text"
                id="template-name-input"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
                }}
                placeholder={t('emailTemplates.form.namePlaceholder', 'e.g., Corporate Standard Notification')}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-text-heading bg-card-bg shadow-xs focus:outline-none focus:ring-2 focus:ring-link-primary/20 font-sans ${
                  fieldErrors.name ? 'border-status-error-text' : 'border-card-border'
                }`}
              />
              {fieldErrors.name && (
                <p className="text-xs text-status-error-text mt-1.5 font-medium font-sans">
                  {fieldErrors.name}
                </p>
              )}
            </div>

            {/* Set as Default Checkbox */}
            <div className="flex flex-col justify-center">
              <label
                htmlFor="template-default-checkbox"
                className={`flex items-start space-x-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                  isDefault
                    ? 'border-link-primary/40 bg-link-primary/5'
                    : 'border-card-border bg-card-bg hover:bg-card-header-bg/40'
                }`}
              >
                <input
                  type="checkbox"
                  id="template-default-checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="h-4 w-4 mt-0.5 rounded border-card-border text-btn-primary-bg focus:ring-link-primary/20"
                />
                <div>
                  <span className="text-sm font-bold text-text-heading font-sans block">
                    {t('emailTemplates.form.setAsDefaultLabel', 'Set as Default Template')}
                  </span>
                  <span className="text-xs text-text-muted font-sans block mt-0.5">
                    {t(
                      'emailTemplates.form.setAsDefaultHelp',
                      'Designating this template as default will automatically unset any other company default template.'
                    )}
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* HTML Source Editor with Variable Helper */}
        <div className="rounded-2xl border border-card-border bg-card-bg p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-text-heading font-sans">
                {t('emailTemplates.form.htmlSourceTitle', 'HTML Source Content')} <span className="text-status-error-text">*</span>
              </h3>
              <p className="text-xs text-text-muted mt-0.5 font-sans">
                {t('emailTemplates.form.htmlSourceDesc', 'Author raw HTML for your notification emails. Use the variable buttons below to insert placeholders at your cursor position.')}
              </p>
            </div>
            <div className="text-xs text-text-muted font-mono self-start sm:self-auto">
              {htmlContent.length} {t('emailTemplates.form.charactersCount', 'chars')}
            </div>
          </div>

          {/* Variable Helper Button Group */}
          <EmailTemplateVariableHelper
            textareaRef={textareaRef}
            value={htmlContent}
            onChange={(val) => {
              setHtmlContent(val);
              if (fieldErrors.htmlContent) {
                setFieldErrors((prev) => ({ ...prev, htmlContent: '' }));
              }
            }}
          />

          {/* Raw HTML Textarea */}
          <div>
            <textarea
              ref={textareaRef}
              id="template-html-textarea"
              rows={12}
              value={htmlContent}
              onChange={(e) => {
                setHtmlContent(e.target.value);
                if (fieldErrors.htmlContent) {
                  setFieldErrors((prev) => ({ ...prev, htmlContent: '' }));
                }
              }}
              placeholder={t('emailTemplates.form.htmlPlaceholder', 'Write or paste standard email HTML markup here...')}
              className={`w-full rounded-xl border p-4 text-xs font-mono text-text-heading bg-card-bg shadow-xs focus:outline-none focus:ring-2 focus:ring-link-primary/20 leading-relaxed ${
                fieldErrors.htmlContent ? 'border-status-error-text' : 'border-card-border'
              }`}
            />
            {fieldErrors.htmlContent && (
              <p className="text-xs text-status-error-text mt-1.5 font-medium font-sans">
                {fieldErrors.htmlContent}
              </p>
            )}
          </div>
        </div>

        {/* Live Preview Pane (Safely sandboxed in an iframe) */}
        <div className="rounded-2xl border border-card-border bg-card-bg p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2">
            <Eye className="h-4 w-4 text-link-primary" />
            <h3 className="text-base font-bold text-text-heading font-sans">
              {t('emailTemplates.form.previewTitle', 'Live Sandbox Preview')}
            </h3>
            <span className="text-xs rounded-md bg-card-header-bg px-2 py-0.5 text-text-muted font-mono border border-card-border">
              Isolated IFrame
            </span>
          </div>
          <p className="text-xs text-text-muted font-sans">
            {t(
              'emailTemplates.form.previewDesc',
              'This live preview renders your raw HTML in an isolated sandbox. Styles and scripts are strictly contained and cannot leak into the application.'
            )}
          </p>

          <div className="overflow-hidden rounded-xl border border-card-border bg-white shadow-inner p-1">
            <iframe
              srcDoc={
                htmlContent.trim()
                  ? htmlContent
                  : '<div style="font-family:sans-serif;color:#9ca3af;padding:40px;text-align:center;">Empty template preview</div>'
              }
              sandbox=""
              title={t('emailTemplates.form.previewIframeTitle', 'Email Template Preview Sandbox')}
              id="template-preview-iframe"
              className="w-full h-80 border-0 rounded-lg bg-white"
            />
          </div>
        </div>

        {/* Bottom Form Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-card-border">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-xl border border-card-border bg-card-bg px-4 py-2.5 text-sm font-semibold text-text-heading shadow-xs hover:bg-card-header-bg transition-colors cursor-pointer"
            id="btn-cancel-template"
          >
            {t('emailTemplates.form.cancelBtn', 'Cancel')}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center space-x-2 rounded-xl bg-btn-primary-bg px-5 py-2.5 text-sm font-semibold text-btn-primary-text shadow-xs hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
            id="btn-save-template"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t('emailTemplates.form.saving', 'Saving Template...')}</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>
                  {isEditing
                    ? t('emailTemplates.form.saveChangesBtn', 'Save Changes')
                    : t('emailTemplates.form.createTemplateBtn', 'Create Template')}
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
