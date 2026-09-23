/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Save,
  Plus,
  AlertCircle,
  Loader2,
  Info,
  Calendar,
  Clock,
  Repeat,
  Link,
  Users,
  Building2,
  Bell,
  Mail,
} from 'lucide-react';
import {
  ScheduledNotification,
  ScheduledNotificationRecurrence,
} from '../types';
import { UserMultiSelect } from '../../../shared/components/UserMultiSelect';
import { GroupMultiSelect } from '../../../shared/components/GroupMultiSelect';

export interface ScheduledNotificationFormProps {
  notification: ScheduledNotification | null; // null for create mode, existing for edit mode
  onSuccess: (savedNotification: ScheduledNotification) => void;
  onCancel: () => void;
}

function getCsrfToken(): string {
  const match = document.cookie.match(/csrfToken=([^;]+)/);
  return match ? match[1] : '';
}

function toLocalDateTimeInput(isoDateString?: string | null): string {
  if (!isoDateString) return '';
  const d = new Date(isoDateString);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toIsoString(localDateTimeString?: string | null): string | null {
  if (!localDateTimeString) return null;
  const d = new Date(localDateTimeString);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function getDefaultStartAt(): string {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return toLocalDateTimeInput(d.toISOString());
}

function getDefaultEndAt(startDateStr?: string): string {
  const base = startDateStr ? new Date(startDateStr) : new Date();
  const d = isNaN(base.getTime()) ? new Date() : new Date(base);
  d.setMonth(d.getMonth() + 1);
  return toLocalDateTimeInput(d.toISOString());
}

export const ScheduledNotificationForm: React.FC<ScheduledNotificationFormProps> = ({
  notification,
  onSuccess,
  onCancel,
}) => {
  const { t } = useTranslation();
  const isEditing = Boolean(notification);

  // Form State
  const [title, setTitle] = useState<string>(notification?.title || '');
  const [message, setMessage] = useState<string>(notification?.message || '');
  const [actionUrl, setActionUrl] = useState<string>(notification?.actionUrl || '');

  // Recipient Targeting State (no learner / directManager options)
  const [recipientEntireCompany, setRecipientEntireCompany] = useState<boolean>(
    notification?.recipientConfig?.entireCompany ?? false
  );
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    Array.isArray(notification?.recipientConfig?.userIds)
      ? notification.recipientConfig.userIds
      : []
  );
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(
    Array.isArray(notification?.recipientConfig?.groupIds)
      ? notification.recipientConfig.groupIds
      : []
  );

  // Delivery Channels State
  const [channelInLms, setChannelInLms] = useState<boolean>(
    notification?.channels?.inLms ?? true
  );
  const [channelEmail, setChannelEmail] = useState<boolean>(
    notification?.channels?.email ?? false
  );

  // Schedule & Recurrence State
  const [startAt, setStartAt] = useState<string>(
    notification ? toLocalDateTimeInput(notification.startAt) : getDefaultStartAt()
  );
  const [recurrence, setRecurrence] = useState<ScheduledNotificationRecurrence>(
    notification?.recurrence ?? 'NONE'
  );
  const [endAt, setEndAt] = useState<string>(
    notification?.endAt ? toLocalDateTimeInput(notification.endAt) : ''
  );

  // Submission & Validation State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // When changing recurrence, auto-fill endAt if empty and switching to recurring
  const handleRecurrenceChange = (newRecurrence: ScheduledNotificationRecurrence) => {
    setRecurrence(newRecurrence);
    if (newRecurrence !== 'NONE' && !endAt) {
      setEndAt(getDefaultEndAt(startAt));
    }
    if (fieldErrors.endAt) {
      setFieldErrors((prev) => ({ ...prev, endAt: '' }));
    }
  };

  // Client-side validation mirroring server logic
  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate title
    if (!title.trim()) {
      errors.title = t('scheduledNotifications.form.titleRequired');
    }

    // Validate message
    if (!message.trim()) {
      errors.message = t('scheduledNotifications.form.messageRequired');
    }

    // Validate recipients: at least one recipient target must be selected
    if (!recipientEntireCompany && selectedUserIds.length === 0 && selectedGroupIds.length === 0) {
      errors.recipients = t('scheduledNotifications.form.recipientsRequired');
    }

    // Validate channels: at least one channel enabled
    if (!channelInLms && !channelEmail) {
      errors.channels = t('scheduledNotifications.form.channelsRequired');
    }

    // Validate startAt
    if (!startAt) {
      errors.startAt = t('scheduledNotifications.form.startAtRequired');
    } else {
      const startDate = new Date(startAt);
      if (isNaN(startDate.getTime())) {
        errors.startAt = t('scheduledNotifications.form.startAtInvalid');
      }
    }

    // Validate endAt
    if (recurrence !== 'NONE') {
      if (!endAt) {
        errors.endAt = t('scheduledNotifications.form.endAtRequired');
      } else {
        const endDate = new Date(endAt);
        if (isNaN(endDate.getTime())) {
          errors.endAt = t('scheduledNotifications.form.endAtInvalid');
        } else if (startAt) {
          const startDate = new Date(startAt);
          if (!isNaN(startDate.getTime()) && endDate.getTime() <= startDate.getTime()) {
            errors.endAt = t('scheduledNotifications.form.endAtAfterStart');
          }
        }
      }
    } else if (endAt) {
      const endDate = new Date(endAt);
      if (isNaN(endDate.getTime())) {
        errors.endAt = t('scheduledNotifications.form.endAtInvalid');
      } else if (startAt) {
        const startDate = new Date(startAt);
        if (!isNaN(startDate.getTime()) && endDate.getTime() <= startDate.getTime()) {
          errors.endAt = t('scheduledNotifications.form.endAtAfterStart');
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setServerError(null);

    // Run client-side validation
    const isValid = validate();
    if (!isValid) {
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        title: title.trim(),
        message: message.trim(),
        recipientConfig: {
          learner: false,
          directManager: false,
          entireCompany: recipientEntireCompany,
          groupIds: selectedGroupIds,
          userIds: selectedUserIds,
        },
        channels: {
          inLms: channelInLms,
          email: channelEmail,
        },
        startAt: toIsoString(startAt),
        recurrence,
        endAt: recurrence !== 'NONE' || endAt ? toIsoString(endAt) : null,
        actionUrl: actionUrl.trim() ? actionUrl.trim() : null,
      };

      const url = isEditing
        ? `/api/scheduled-notifications/${notification.id}`
        : '/api/scheduled-notifications';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || t('scheduledNotifications.form.generalError'));
      }

      const savedNotification: ScheduledNotification = await res.json();
      onSuccess(savedNotification);
    } catch (err: unknown) {
      console.error('[ScheduledNotificationForm] Submission error:', err);
      const message = err instanceof Error ? err.message : t('scheduledNotifications.form.generalError');
      setServerError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" id="scheduled-notification-form-container">
      {/* Top Header and Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-card-border">
        <div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-link-primary hover:text-link-hover mb-2 cursor-pointer transition-colors"
            id="scheduled-form-back-btn"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t('scheduledNotifications.form.backToList')}</span>
          </button>
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold tracking-tight text-text-heading font-sans" id="scheduled-form-title">
              {isEditing
                ? t('scheduledNotifications.form.editTitle')
                : t('scheduledNotifications.form.createTitle')}
            </h2>
          </div>
          <p className="mt-1 text-sm text-text-muted font-sans max-w-2xl">
            {isEditing
              ? t('scheduledNotifications.form.editSubtitle')
              : t('scheduledNotifications.form.createSubtitle')}
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center space-x-3 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-xl border border-card-border bg-card-bg px-4 py-2 text-sm font-semibold text-text-heading shadow-xs hover:bg-card-header-bg transition-colors cursor-pointer disabled:opacity-60"
            id="scheduled-form-header-cancel-btn"
          >
            {t('scheduledNotifications.form.cancelBtn')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center space-x-2 rounded-xl bg-btn-primary-bg px-4 py-2 text-sm font-semibold text-btn-primary-text shadow-xs hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-60"
            id="scheduled-form-header-submit-btn"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {isEditing
                    ? t('scheduledNotifications.form.saving')
                    : t('scheduledNotifications.form.creating')}
                </span>
              </>
            ) : (
              <>
                {isEditing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                <span>
                  {isEditing
                    ? t('scheduledNotifications.form.saveBtn')
                    : t('scheduledNotifications.form.createBtn')}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Global Server Error Banner */}
      {serverError && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-3 p-4 rounded-xl bg-status-error-bg/50 border border-status-error-text/20 text-status-error-text"
          id="scheduled-form-server-error-banner"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-sans font-medium">{serverError}</p>
        </motion.div>
      )}

      {/* Main Form Form */}
      <form onSubmit={handleSubmit} className="space-y-8" id="scheduled-notification-form">
        {/* Section 1: Notification Content */}
        <div
          className="rounded-2xl border border-card-border bg-card-bg p-6 shadow-xs space-y-6"
          id="scheduled-section-content"
        >
          <div>
            <h3 className="text-base font-bold text-text-heading font-sans">
              {t('scheduledNotifications.form.contentSection')}
            </h3>
            <p className="text-xs text-text-muted mt-0.5 font-sans">
              {t('scheduledNotifications.form.contentSectionDesc')}
            </p>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label
                htmlFor="scheduled-form-title-input"
                className="block text-xs font-semibold text-text-heading uppercase tracking-wider font-sans mb-1.5"
              >
                {t('scheduledNotifications.form.titleLabel')}{' '}
                <span className="text-status-error-text">*</span>
              </label>
              <input
                type="text"
                id="scheduled-form-title-input"
                required
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (fieldErrors.title) {
                    setFieldErrors((prev) => ({ ...prev, title: '' }));
                  }
                }}
                placeholder={t('scheduledNotifications.form.titlePlaceholder')}
                className={`w-full rounded-xl border bg-card-bg px-3.5 py-2.5 text-sm text-text-heading focus:border-link-primary focus:outline-hidden ${
                  fieldErrors.title ? 'border-status-error-text' : 'border-card-border'
                }`}
              />
              {fieldErrors.title && (
                <p className="text-xs text-status-error-text mt-1 font-sans" id="scheduled-title-error">
                  {fieldErrors.title}
                </p>
              )}
            </div>

            {/* Message Body */}
            <div>
              <label
                htmlFor="scheduled-form-message-input"
                className="block text-xs font-semibold text-text-heading uppercase tracking-wider font-sans mb-1.5"
              >
                {t('scheduledNotifications.form.messageLabel')}{' '}
                <span className="text-status-error-text">*</span>
              </label>
              <textarea
                id="scheduled-form-message-input"
                required
                rows={4}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (fieldErrors.message) {
                    setFieldErrors((prev) => ({ ...prev, message: '' }));
                  }
                }}
                placeholder={t('scheduledNotifications.form.messagePlaceholder')}
                className={`w-full rounded-xl border bg-card-bg px-3.5 py-2.5 text-sm text-text-heading focus:border-link-primary focus:outline-hidden ${
                  fieldErrors.message ? 'border-status-error-text' : 'border-card-border'
                }`}
              />
              {fieldErrors.message && (
                <p className="text-xs text-status-error-text mt-1 font-sans" id="scheduled-message-error">
                  {fieldErrors.message}
                </p>
              )}
            </div>

            {/* Action URL */}
            <div>
              <label
                htmlFor="scheduled-form-action-url-input"
                className="block text-xs font-semibold text-text-heading uppercase tracking-wider font-sans mb-1.5"
              >
                {t('scheduledNotifications.form.actionUrlLabel')}
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-text-muted">
                  <Link className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  id="scheduled-form-action-url-input"
                  value={actionUrl}
                  onChange={(e) => setActionUrl(e.target.value)}
                  placeholder={t('scheduledNotifications.form.actionUrlPlaceholder')}
                  className="w-full rounded-xl border border-card-border bg-card-bg pl-10 pr-3.5 py-2.5 text-sm text-text-heading focus:border-link-primary focus:outline-hidden"
                />
              </div>
              <p className="text-xs text-text-muted mt-1.5 font-sans">
                {t('scheduledNotifications.form.actionUrlHelp')}
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Recipient Targeting */}
        <div
          className="rounded-2xl border border-card-border bg-card-bg p-6 shadow-xs space-y-6"
          id="scheduled-section-recipients"
        >
          <div>
            <h3 className="text-base font-bold text-text-heading font-sans">
              {t('scheduledNotifications.form.recipientsSection')}
            </h3>
            <p className="text-xs text-text-muted mt-0.5 font-sans">
              {t('scheduledNotifications.form.recipientsSectionDesc')}
            </p>
          </div>

          {/* Entire Organization Checkbox */}
          <div className="space-y-4">
            <label
              htmlFor="recipient-entire-company-checkbox"
              className={`flex items-center space-x-3.5 p-4 rounded-xl border cursor-pointer transition-colors ${
                recipientEntireCompany
                  ? 'border-link-primary/40 bg-link-primary/5'
                  : 'border-card-border bg-card-bg hover:bg-card-header-bg/40'
              }`}
            >
              <input
                type="checkbox"
                id="recipient-entire-company-checkbox"
                checked={recipientEntireCompany}
                onChange={(e) => {
                  setRecipientEntireCompany(e.target.checked);
                  if (fieldErrors.recipients) {
                    setFieldErrors((prev) => ({ ...prev, recipients: '' }));
                  }
                }}
                className="h-4 w-4 rounded border-card-border text-btn-primary-bg focus:ring-link-primary/20"
              />
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-link-primary" />
                <span className="text-sm font-semibold text-text-heading font-sans">
                  {t('scheduledNotifications.form.targetEntireCompany')}
                </span>
              </div>
            </label>

            {fieldErrors.recipients && (
              <p className="text-xs text-status-error-text font-medium font-sans" id="scheduled-recipients-error">
                {fieldErrors.recipients}
              </p>
            )}

            {/* User and Group Multi-Select Pickers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-card-border">
              {/* Specific Users Picker */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-text-heading uppercase tracking-wider font-sans">
                  {t('scheduledNotifications.form.targetSpecificUsers')}
                </label>
                <UserMultiSelect
                  selectedUserIds={selectedUserIds}
                  onChange={(ids) => {
                    setSelectedUserIds(ids);
                    if (fieldErrors.recipients) {
                      setFieldErrors((prev) => ({ ...prev, recipients: '' }));
                    }
                  }}
                  id="scheduled-user-multiselect"
                />
              </div>

              {/* Specific Groups Picker */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-text-heading uppercase tracking-wider font-sans">
                  {t('scheduledNotifications.form.targetSpecificGroups')}
                </label>
                <GroupMultiSelect
                  selectedGroupIds={selectedGroupIds}
                  onChange={(ids) => {
                    setSelectedGroupIds(ids);
                    if (fieldErrors.recipients) {
                      setFieldErrors((prev) => ({ ...prev, recipients: '' }));
                    }
                  }}
                  id="scheduled-group-multiselect"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Delivery Channels */}
        <div
          className="rounded-2xl border border-card-border bg-card-bg p-6 shadow-xs space-y-4"
          id="scheduled-section-channels"
        >
          <div>
            <h3 className="text-base font-bold text-text-heading font-sans">
              {t('scheduledNotifications.form.channelsSection')}
            </h3>
            <p className="text-xs text-text-muted mt-0.5 font-sans">
              {t('scheduledNotifications.form.channelsSectionDesc')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* In-LMS Channel */}
            <label
              htmlFor="channel-in-lms-checkbox"
              className={`flex items-center space-x-3.5 p-4 rounded-xl border cursor-pointer transition-colors ${
                channelInLms
                  ? 'border-link-primary/40 bg-link-primary/5'
                  : 'border-card-border bg-card-bg hover:bg-card-header-bg/40'
              }`}
            >
              <input
                type="checkbox"
                id="channel-in-lms-checkbox"
                checked={channelInLms}
                onChange={(e) => {
                  setChannelInLms(e.target.checked);
                  if (fieldErrors.channels) {
                    setFieldErrors((prev) => ({ ...prev, channels: '' }));
                  }
                }}
                className="h-4 w-4 rounded border-card-border text-btn-primary-bg focus:ring-link-primary/20"
              />
              <div className="space-y-0.5">
                <div className="flex items-center space-x-1.5">
                  <Bell className="h-4 w-4 text-link-primary" />
                  <span className="text-sm font-bold text-text-heading font-sans">
                    {t('scheduledNotifications.form.channelInLms')}
                  </span>
                </div>
                <span className="text-xs text-text-muted font-sans block">
                  {t('scheduledNotifications.form.channelInLmsDesc')}
                </span>
              </div>
            </label>

            {/* Email Channel */}
            <label
              htmlFor="channel-email-checkbox"
              className={`flex items-center space-x-3.5 p-4 rounded-xl border cursor-pointer transition-colors ${
                channelEmail
                  ? 'border-link-primary/40 bg-link-primary/5'
                  : 'border-card-border bg-card-bg hover:bg-card-header-bg/40'
              }`}
            >
              <input
                type="checkbox"
                id="channel-email-checkbox"
                checked={channelEmail}
                onChange={(e) => {
                  setChannelEmail(e.target.checked);
                  if (fieldErrors.channels) {
                    setFieldErrors((prev) => ({ ...prev, channels: '' }));
                  }
                }}
                className="h-4 w-4 rounded border-card-border text-btn-primary-bg focus:ring-link-primary/20"
              />
              <div className="space-y-0.5">
                <div className="flex items-center space-x-1.5">
                  <Mail className="h-4 w-4 text-status-success-text" />
                  <span className="text-sm font-bold text-text-heading font-sans">
                    {t('scheduledNotifications.form.channelEmail')}
                  </span>
                </div>
                <span className="text-xs text-text-muted font-sans block">
                  {t('scheduledNotifications.form.channelEmailDesc')}
                </span>
              </div>
            </label>
          </div>

          {fieldErrors.channels && (
            <p className="text-xs text-status-error-text font-medium font-sans" id="scheduled-channels-error">
              {fieldErrors.channels}
            </p>
          )}
        </div>

        {/* Section 4: Schedule & Recurrence */}
        <div
          className="rounded-2xl border border-card-border bg-card-bg p-6 shadow-xs space-y-6"
          id="scheduled-section-schedule"
        >
          <div>
            <h3 className="text-base font-bold text-text-heading font-sans">
              {t('scheduledNotifications.form.scheduleSection')}
            </h3>
            <p className="text-xs text-text-muted mt-0.5 font-sans">
              {t('scheduledNotifications.form.scheduleSectionDesc')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Start Date & Time */}
            <div>
              <label
                htmlFor="scheduled-form-start-at-input"
                className="block text-xs font-semibold text-text-heading uppercase tracking-wider font-sans mb-1.5"
              >
                {t('scheduledNotifications.form.startAtLabel')}{' '}
                <span className="text-status-error-text">*</span>
              </label>
              <div className="relative">
                <input
                  type="datetime-local"
                  id="scheduled-form-start-at-input"
                  required
                  value={startAt}
                  onChange={(e) => {
                    setStartAt(e.target.value);
                    if (fieldErrors.startAt) {
                      setFieldErrors((prev) => ({ ...prev, startAt: '' }));
                    }
                  }}
                  className={`w-full rounded-xl border bg-card-bg px-3.5 py-2.5 text-sm text-text-heading focus:border-link-primary focus:outline-hidden ${
                    fieldErrors.startAt ? 'border-status-error-text' : 'border-card-border'
                  }`}
                />
              </div>
              {fieldErrors.startAt && (
                <p className="text-xs text-status-error-text mt-1 font-sans" id="scheduled-start-at-error">
                  {fieldErrors.startAt}
                </p>
              )}
            </div>

            {/* Recurrence Cadence */}
            <div>
              <label
                htmlFor="scheduled-form-recurrence-select"
                className="block text-xs font-semibold text-text-heading uppercase tracking-wider font-sans mb-1.5"
              >
                {t('scheduledNotifications.form.recurrenceLabel')}
              </label>
              <select
                id="scheduled-form-recurrence-select"
                value={recurrence}
                onChange={(e) =>
                  handleRecurrenceChange(e.target.value as ScheduledNotificationRecurrence)
                }
                className="w-full rounded-xl border border-card-border bg-card-bg px-3.5 py-2.5 text-sm text-text-heading focus:border-link-primary focus:outline-hidden"
              >
                <option value="NONE">{t('scheduledNotifications.form.recurrenceNone')}</option>
                <option value="DAILY">{t('scheduledNotifications.form.recurrenceDaily')}</option>
                <option value="WEEKLY">{t('scheduledNotifications.form.recurrenceWeekly')}</option>
                <option value="MONTHLY">{t('scheduledNotifications.form.recurrenceMonthly')}</option>
              </select>
            </div>
          </div>

          {/* End Date & Time (Shown / Required when recurrence !== 'NONE') */}
          {recurrence !== 'NONE' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 pt-4 border-t border-card-border"
              id="scheduled-end-at-container"
            >
              <div>
                <label
                  htmlFor="scheduled-form-end-at-input"
                  className="block text-xs font-semibold text-text-heading uppercase tracking-wider font-sans mb-1.5"
                >
                  {t('scheduledNotifications.form.endAtLabel')}{' '}
                  <span className="text-status-error-text">*</span>
                </label>
                <input
                  type="datetime-local"
                  id="scheduled-form-end-at-input"
                  required
                  value={endAt}
                  onChange={(e) => {
                    setEndAt(e.target.value);
                    if (fieldErrors.endAt) {
                      setFieldErrors((prev) => ({ ...prev, endAt: '' }));
                    }
                  }}
                  className={`w-full max-w-md rounded-xl border bg-card-bg px-3.5 py-2.5 text-sm text-text-heading focus:border-link-primary focus:outline-hidden ${
                    fieldErrors.endAt ? 'border-status-error-text' : 'border-card-border'
                  }`}
                />
                {fieldErrors.endAt && (
                  <p className="text-xs text-status-error-text mt-1 font-sans" id="scheduled-end-at-error">
                    {fieldErrors.endAt}
                  </p>
                )}
              </div>

              <div
                className="flex items-start space-x-3 p-3.5 rounded-xl bg-card-header-bg border border-card-border"
                id="scheduled-recurring-hint-box"
              >
                <Info className="h-4 w-4 text-link-primary shrink-0 mt-0.5" />
                <p className="text-xs text-text-muted font-sans leading-relaxed">
                  {t('scheduledNotifications.form.recurringNote', {
                    recurrence:
                      recurrence === 'DAILY'
                        ? t('scheduledNotifications.form.recurrenceDaily')
                        : recurrence === 'WEEKLY'
                        ? t('scheduledNotifications.form.recurrenceWeekly')
                        : t('scheduledNotifications.form.recurrenceMonthly'),
                  })}
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Bottom Action Footer */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-card-border">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-xl border border-card-border bg-card-bg px-5 py-2.5 text-sm font-semibold text-text-heading shadow-xs hover:bg-card-header-bg transition-colors cursor-pointer disabled:opacity-60"
            id="scheduled-form-footer-cancel-btn"
          >
            {t('scheduledNotifications.form.cancelBtn')}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center space-x-2 rounded-xl bg-btn-primary-bg px-5 py-2.5 text-sm font-semibold text-btn-primary-text shadow-xs hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-60"
            id="scheduled-form-footer-submit-btn"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {isEditing
                    ? t('scheduledNotifications.form.saving')
                    : t('scheduledNotifications.form.creating')}
                </span>
              </>
            ) : (
              <>
                {isEditing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                <span>
                  {isEditing
                    ? t('scheduledNotifications.form.saveBtn')
                    : t('scheduledNotifications.form.createBtn')}
                </span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
