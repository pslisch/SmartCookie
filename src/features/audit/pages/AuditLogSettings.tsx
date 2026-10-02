/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarClock,
  Mail,
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { usePermission } from '../../../shared/hooks/usePermission';
import { AuditSettingsResponse, AuditSettingsUpdateRequest } from '../types';

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:csrfToken|XSRF-TOKEN)=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface AuditLogSettingsProps {
  initialData?: AuditSettingsResponse;
}

export const AuditLogSettings: React.FC<AuditLogSettingsProps> = ({ initialData }) => {
  const { t } = useTranslation();
  const canManageRetention = usePermission('audit', 'manage-retention');

  const [retentionDaysInput, setRetentionDaysInput] = useState<string>(
    initialData && typeof initialData.retentionDays === 'number' ? String(initialData.retentionDays) : '365'
  );
  const [recipients, setRecipients] = useState<string[]>(
    initialData && Array.isArray(initialData.failureAlertRecipients) ? initialData.failureAlertRecipients : []
  );
  const [newRecipientInput, setNewRecipientInput] = useState<string>('');
  const [recipientInputError, setRecipientInputError] = useState<string | null>(null);

  const [initialSettings, setInitialSettings] = useState<AuditSettingsResponse | null>(initialData ?? null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialData);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Fetch current audit settings on mount
  const fetchSettings = useCallback(async () => {
    if (!canManageRetention) return;

    setIsLoading(true);
    setLoadError(null);
    setSaveError(null);

    try {
      const res = await fetch('/api/audit-logs/settings', {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to fetch settings (${res.status})`);
      }

      const data: AuditSettingsResponse = await res.json();
      const safeRetention = typeof data.retentionDays === 'number' && data.retentionDays > 0
        ? data.retentionDays
        : 365;
      const safeRecipients = Array.isArray(data.failureAlertRecipients)
        ? data.failureAlertRecipients
        : [];

      setInitialSettings({
        retentionDays: safeRetention,
        failureAlertRecipients: safeRecipients,
      });
      setRetentionDaysInput(String(safeRetention));
      setRecipients(safeRecipients);
    } catch (err: unknown) {
      console.error('[AuditLogSettings] Failed to fetch settings:', err);
      setLoadError(err instanceof Error ? err.message : t('audit.loadSettingsError', 'Failed to load audit settings.'));
    } finally {
      setIsLoading(false);
    }
  }, [canManageRetention, t]);

  useEffect(() => {
    if (!initialData) {
      fetchSettings();
    }
  }, [fetchSettings, initialData]);

  // Client-side validation for retentionDays (must be positive integer)
  const parsedRetentionDays = Number(retentionDaysInput);
  const isRetentionDaysValid =
    retentionDaysInput.trim() !== '' &&
    !isNaN(parsedRetentionDays) &&
    Number.isInteger(parsedRetentionDays) &&
    parsedRetentionDays > 0;

  // Add recipient handler
  const handleAddRecipient = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newRecipientInput.trim().toLowerCase();

    if (!trimmed) {
      setRecipientInputError(null);
      return;
    }

    if (!EMAIL_REGEX.test(trimmed)) {
      setRecipientInputError(t('audit.recipientInvalid', 'Please enter a valid email address.'));
      return;
    }

    if (recipients.includes(trimmed)) {
      setRecipientInputError(t('audit.recipientDuplicate', 'This email address is already in the recipient list.'));
      return;
    }

    setRecipients((prev) => [...prev, trimmed]);
    setNewRecipientInput('');
    setRecipientInputError(null);
    setSaveSuccess(false);
  };

  // Remove recipient handler
  const handleRemoveRecipient = (indexToRemove: number) => {
    setRecipients((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setSaveSuccess(false);
  };

  // Save handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageRetention) return;

    if (!isRetentionDaysValid) {
      setSaveError(t('audit.retentionDaysInvalid', 'Retention days must be a positive integer (at least 1 day).'));
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const payload: AuditSettingsUpdateRequest = {
        retentionDays: parsedRetentionDays,
        failureAlertRecipients: recipients,
      };

      const csrfToken = getCsrfToken();
      const res = await fetch('/api/audit-logs/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || t('audit.settingsSaveError', 'Failed to save audit settings.'));
      }

      const updatedData: AuditSettingsResponse = await res.json();
      setInitialSettings({
        retentionDays: updatedData.retentionDays,
        failureAlertRecipients: updatedData.failureAlertRecipients,
      });
      setRetentionDaysInput(String(updatedData.retentionDays));
      setRecipients(updatedData.failureAlertRecipients);
      setSaveSuccess(true);

      setTimeout(() => {
        setSaveSuccess((prev) => (prev ? false : prev));
      }, 4000);
    } catch (err: unknown) {
      console.error('[AuditLogSettings] Save error:', err);
      setSaveError(err instanceof Error ? err.message : t('audit.settingsSaveError', 'Failed to save audit settings.'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!canManageRetention) {
    return (
      <div className="p-8 text-center text-status-error-text" id="audit-settings-unauthorized">
        <p className="text-sm font-semibold">{t('audit.unauthorizedSettings', 'Unauthorized: You do not have permission to manage audit retention settings.')}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center p-8" id="audit-settings-loading">
        <Loader2 className="h-8 w-8 animate-spin text-link-primary mb-3" />
        <p className="text-sm text-text-muted font-sans">{t('audit.loadingSettings', 'Loading audit settings…')}</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        className="flex items-center justify-between p-4 rounded-xl bg-status-error-bg/50 border border-status-error-text/20 text-status-error-text"
        id="audit-settings-error"
      >
        <div className="flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-sans">{loadError}</p>
        </div>
        <button
          type="button"
          onClick={fetchSettings}
          className="ml-4 px-3 py-1.5 text-xs font-semibold rounded-lg bg-status-error-text text-white hover:opacity-90 transition-opacity cursor-pointer shrink-0"
          id="audit-settings-retry-btn"
        >
          {t('common.retry', 'Retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl" id="audit-settings-page">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-text-heading font-sans" id="audit-settings-title">
          {t('audit.settingsTitle', 'Retention & Alerting Settings')}
        </h2>
        <p className="text-xs text-text-muted font-sans mt-0.5" id="audit-settings-subtitle">
          {t('audit.settingsSubtitle', 'Configure automated retention pruning and failure alert email notifications.')}
        </p>
      </div>

      {/* Success Notification Banner */}
      {saveSuccess && (
        <div
          className="flex items-center space-x-3 p-4 rounded-xl bg-status-success-bg border border-status-success-text/20 text-status-success-text"
          id="audit-settings-success-alert"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0 text-status-success-text" />
          <p className="text-sm font-semibold font-sans">
            {t('audit.settingsSavedSuccess', 'Audit log settings saved successfully.')}
          </p>
        </div>
      )}

      {/* Error Notification Banner */}
      {saveError && (
        <div
          className="flex items-center space-x-3 p-4 rounded-xl bg-status-error-bg/60 border border-status-error-text/30 text-status-error-text"
          id="audit-settings-error-alert"
        >
          <AlertCircle className="h-5 w-5 shrink-0 text-status-error-text" />
          <p className="text-sm font-semibold font-sans">{saveError}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6" id="audit-settings-form">
        {/* Retention Period Card */}
        <div className="rounded-2xl border border-card-border bg-card-bg p-6 shadow-sm space-y-4" id="retention-period-card">
          <div className="flex items-start space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-status-info-bg text-link-primary border border-link-primary/20 shrink-0">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-heading font-sans">
                {t('audit.retentionCardTitle', 'Log Retention Period')}
              </h3>
              <p className="text-xs text-text-muted font-sans mt-0.5">
                {t('audit.retentionCardDesc', 'Determine how long audit logs remain queryable before automated pruning occurs.')}
              </p>
            </div>
          </div>

          <div className="pt-2">
            <label
              htmlFor="retention-days-input"
              className="block text-xs font-semibold text-text-body font-sans mb-1"
            >
              {t('audit.retentionDaysLabel', 'Retention Period (Days)')}
            </label>
            <div className="flex items-center space-x-3 max-w-xs">
              <input
                id="retention-days-input"
                name="retentionDays"
                type="number"
                min="1"
                step="1"
                value={retentionDaysInput}
                onChange={(e) => {
                  setRetentionDaysInput(e.target.value);
                  setSaveSuccess(false);
                  setSaveError(null);
                }}
                className={`w-full rounded-xl border bg-card-bg px-3.5 py-2.5 text-sm text-text-heading placeholder-text-muted shadow-2xs transition-colors focus:outline-none ${
                  !isRetentionDaysValid
                    ? 'border-status-error-text focus:border-status-error-text'
                    : 'border-input-border focus:border-input-border-focus'
                }`}
                placeholder="365"
              />
              <span className="text-sm font-medium text-text-muted font-sans shrink-0">
                days
              </span>
            </div>

            {!isRetentionDaysValid ? (
              <p className="text-xs text-status-error-text mt-1.5 font-sans" id="retention-days-error">
                {t('audit.retentionDaysInvalid', 'Retention days must be a positive integer (at least 1 day).')}
              </p>
            ) : (
              <p className="text-xs text-text-muted mt-1.5 font-sans">
                {t('audit.retentionDaysHelp', 'Number of days before audit logs are automatically pruned. Must be a positive integer.')}
              </p>
            )}
          </div>
        </div>

        {/* Failure Alert Recipients Card */}
        <div className="rounded-2xl border border-card-border bg-card-bg p-6 shadow-sm space-y-4" id="failure-alerts-card">
          <div className="flex items-start space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-status-info-bg text-link-primary border border-link-primary/20 shrink-0">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-heading font-sans">
                {t('audit.failureAlertRecipientsTitle', 'Failure Alert Recipients')}
              </h3>
              <p className="text-xs text-text-muted font-sans mt-0.5">
                {t('audit.failureAlertRecipientsDesc', 'Configure additional email addresses notified when recurring authentication failure alerts trigger.')}
              </p>
            </div>
          </div>

          <div className="pt-2 space-y-3">
            <label
              htmlFor="add-recipient-input"
              className="block text-xs font-semibold text-text-body font-sans"
            >
              {t('audit.failureAlertRecipientsLabel', 'Alert Email Addresses')}
            </label>

            {/* Input + Add Button */}
            <div className="flex flex-col sm:flex-row gap-2 max-w-xl">
              <div className="relative flex-1">
                <input
                  id="add-recipient-input"
                  type="email"
                  value={newRecipientInput}
                  onChange={(e) => {
                    setNewRecipientInput(e.target.value);
                    if (recipientInputError) setRecipientInputError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddRecipient();
                    }
                  }}
                  placeholder={t('audit.addRecipientPlaceholder', 'security-alerts@example.com')}
                  className={`w-full rounded-xl border bg-card-bg px-3.5 py-2.5 text-sm text-text-heading placeholder-text-muted shadow-2xs transition-colors focus:outline-none ${
                    recipientInputError
                      ? 'border-status-error-text focus:border-status-error-text'
                      : 'border-input-border focus:border-input-border-focus'
                  }`}
                />
              </div>
              <button
                type="button"
                onClick={() => handleAddRecipient()}
                className="inline-flex items-center justify-center space-x-1.5 px-4 py-2.5 text-xs font-semibold rounded-xl bg-card-header-bg border border-card-border text-text-heading hover:bg-card-border/40 transition-all cursor-pointer shadow-2xs shrink-0"
                id="add-recipient-btn"
              >
                <Plus className="h-4 w-4" />
                <span>{t('audit.addRecipientBtn', 'Add')}</span>
              </button>
            </div>

            {recipientInputError && (
              <p className="text-xs text-status-error-text font-sans" id="recipient-input-error">
                {recipientInputError}
              </p>
            )}

            <p className="text-xs text-text-muted font-sans">
              {t('audit.failureAlertRecipientsHelp', 'Recipients will receive notification emails when persistent login or authentication failure patterns are detected.')}
            </p>

            {/* Recipients List */}
            <div className="pt-2">
              {recipients.length === 0 ? (
                <div
                  className="flex items-center space-x-2 p-3.5 rounded-xl border border-dashed border-card-border bg-bg-subtle/50 text-xs text-text-muted font-sans"
                  id="recipients-empty-state"
                >
                  <Info className="h-4 w-4 text-text-muted shrink-0" />
                  <span>
                    {t('audit.noRecipients', 'No external recipient emails configured. Failure alerts will only trigger through system-level channels.')}
                  </span>
                </div>
              ) : (
                <div className="space-y-2 max-w-xl" id="recipients-list">
                  {recipients.map((email, idx) => (
                    <div
                      key={email}
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-card-border bg-card-bg text-sm text-text-heading shadow-2xs group"
                      data-testid={`recipient-row-${idx}`}
                    >
                      <span className="font-mono text-xs text-text-body truncate select-all mr-2">
                        {email}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipient(idx)}
                        className="text-text-muted hover:text-status-error-text p-1 rounded-lg transition-colors cursor-pointer"
                        title={t('audit.removeRecipient', 'Remove recipient')}
                        aria-label={`${t('audit.removeRecipient', 'Remove recipient')} ${email}`}
                        id={`remove-recipient-${idx}-btn`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="submit"
            disabled={isSaving || !isRetentionDaysValid}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-btn-primary-bg text-btn-primary-text font-semibold text-sm shadow-sm hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer"
            id="audit-settings-save-btn"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                <span>{t('audit.savingSettings', 'Saving…')}</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1.5" />
                <span>{t('audit.saveSettingsBtn', 'Save Changes')}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
