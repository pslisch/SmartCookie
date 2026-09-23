/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Save,
  Plus,
  AlertCircle,
  Loader2,
  Lock,
  Info,
  Calendar,
  Code,
  Mail,
} from 'lucide-react';
import { NotificationRule, EmailTemplate } from '../types';
import { UserMultiSelect } from '../../../shared/components/UserMultiSelect';
import { GroupMultiSelect } from '../../../shared/components/GroupMultiSelect';

export const NOTIFICATION_TYPES = [
  'LESSON_ASSIGNED',
  'REMINDER',
  'DUE_SOON',
  'OVERDUE',
  'COMPLETION_CONFIRMATION',
  'CERTIFICATES',
  'SYSTEM_ANNOUNCEMENTS',
  'MANAGER_COMPLETION',
  'MANAGER_OVERDUE',
] as const;

export type NotificationType = typeof NOTIFICATION_TYPES[number];

export interface NotificationRuleFormProps {
  rule: NotificationRule | null; // null for create mode, existing rule for edit mode
  onSuccess: (savedRule: NotificationRule) => void;
  onCancel: () => void;
}

function getCsrfToken(): string {
  const match = document.cookie.match(/csrfToken=([^;]+)/);
  return match ? match[1] : '';
}

export const NotificationRuleForm: React.FC<NotificationRuleFormProps> = ({
  rule,
  onSuccess,
  onCancel,
}) => {
  const { t } = useTranslation();
  const isEditing = Boolean(rule);

  // Form State
  const [name, setName] = useState<string>(rule?.name || '');
  const [notificationType, setNotificationType] = useState<string>(
    rule?.notificationType || 'LESSON_ASSIGNED'
  );
  const [enabled, setEnabled] = useState<boolean>(rule ? rule.enabled : true);
  const [mandatory, setMandatory] = useState<boolean>(rule ? rule.mandatory : false);

  // Recipient Targeting State
  const [recipientLearner, setRecipientLearner] = useState<boolean>(
    rule?.recipientConfig?.learner ?? true
  );
  const [recipientDirectManager, setRecipientDirectManager] = useState<boolean>(
    rule?.recipientConfig?.directManager ?? false
  );
  const [recipientEntireCompany, setRecipientEntireCompany] = useState<boolean>(
    rule?.recipientConfig?.entireCompany ?? false
  );
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    Array.isArray(rule?.recipientConfig?.userIds) ? rule.recipientConfig.userIds : []
  );
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(
    Array.isArray(rule?.recipientConfig?.groupIds) ? rule.recipientConfig.groupIds : []
  );

  // Delivery Channels State
  const [channelInLms, setChannelInLms] = useState<boolean>(
    rule?.channels?.inLms ?? true
  );
  const [channelEmail, setChannelEmail] = useState<boolean>(
    rule?.channels?.email ?? false
  );

  // Conditions State
  const [daysBeforeDue, setDaysBeforeDue] = useState<number | string>(
    typeof rule?.conditions?.daysBeforeDue === 'number'
      ? rule.conditions.daysBeforeDue
      : 3
  );
  const [conditionsJson, setConditionsJson] = useState<string>(() => {
    if (rule?.conditions && rule.notificationType !== 'DUE_SOON') {
      try {
        return JSON.stringify(rule.conditions, null, 2);
      } catch {
        return '';
      }
    }
    return '';
  });

  // Message Content Template State
  const [titleKey, setTitleKey] = useState<string>(rule?.titleKey || '');
  const [bodyKey, setBodyKey] = useState<string>(rule?.bodyKey || '');
  const [emailTemplateId, setEmailTemplateId] = useState<string | null>(
    rule?.emailTemplateId || null
  );
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);

  // Fetch available company email templates
  useEffect(() => {
    let isMounted = true;
    fetch('/api/email-templates', {
      headers: { Accept: 'application/json' },
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setEmailTemplates(data);
        }
      })
      .catch((err) => {
        console.warn('[NotificationRuleForm] Could not load email templates:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Action / Deep Link State
  const [actionType, setActionType] = useState<string>(rule?.actionType || '');
  const [actionUrl, setActionUrl] = useState<string>(rule?.actionUrl || '');

  // Validation and Submission State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = t('notificationRules.form.ruleNameRequired');
    }

    if (!channelInLms && !channelEmail) {
      errors.channels = t('notificationRules.form.channelsRequired');
    }

    if (notificationType === 'DUE_SOON') {
      const num = Number(daysBeforeDue);
      if (isNaN(num) || num < 0 || !Number.isInteger(num)) {
        errors.daysBeforeDue = t('notificationRules.form.daysBeforeDueError');
      }
    } else if (conditionsJson.trim()) {
      try {
        const parsed = JSON.parse(conditionsJson);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          errors.conditions = t('notificationRules.form.advancedConditionsError');
        }
      } catch {
        errors.conditions = t('notificationRules.form.advancedConditionsError');
      }
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

      // Parse conditions
      let evaluatedConditions: Record<string, any> | null = null;
      if (notificationType === 'DUE_SOON') {
        evaluatedConditions = { daysBeforeDue: Number(daysBeforeDue) };
      } else if (conditionsJson.trim()) {
        evaluatedConditions = JSON.parse(conditionsJson.trim());
      }

      // Exact server shape matching isValidRecipientConfig and isValidChannels
      const recipientConfigPayload = {
        learner: Boolean(recipientLearner),
        directManager: Boolean(recipientDirectManager),
        entireCompany: Boolean(recipientEntireCompany),
        groupIds: selectedGroupIds,
        userIds: selectedUserIds,
      };

      const channelsPayload = {
        inLms: Boolean(channelInLms),
        email: Boolean(channelEmail),
      };

      let res: Response;

      if (isEditing && rule) {
        // PATCH: notificationType and isSystemDefault are immutable on the server and must not be sent
        const patchPayload: Record<string, any> = {
          name: name.trim(),
          enabled,
          mandatory,
          recipientConfig: recipientConfigPayload,
          channels: channelsPayload,
          conditions: evaluatedConditions,
          titleKey: titleKey.trim() || null,
          bodyKey: bodyKey.trim() || null,
          actionType: actionType.trim() || null,
          actionUrl: actionUrl.trim() || null,
          emailTemplateId: emailTemplateId || null,
        };

        res = await fetch(`/api/notification-admin/rules/${rule.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          credentials: 'include',
          body: JSON.stringify(patchPayload),
        });
      } else {
        // POST: create new custom rule
        const postPayload = {
          name: name.trim(),
          notificationType,
          enabled,
          mandatory,
          recipientConfig: recipientConfigPayload,
          channels: channelsPayload,
          conditions: evaluatedConditions,
          titleKey: titleKey.trim() || null,
          bodyKey: bodyKey.trim() || null,
          actionType: actionType.trim() || null,
          actionUrl: actionUrl.trim() || null,
          emailTemplateId: emailTemplateId || null,
        };

        res = await fetch('/api/notification-admin/rules', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          credentials: 'include',
          body: JSON.stringify(postPayload),
        });
      }

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || t('notificationRules.form.saveError', 'Failed to save notification rule.'));
      }

      onSuccess(data);
    } catch (err: any) {
      console.error('[NotificationRuleForm] Submit error:', err);
      setServerError(err.message || 'An unexpected error occurred while saving the rule.');
    } finally {
      setSubmitting(false);
    }
  };

  const getNotificationTypeLabel = (type: string): string => {
    const key = `profile.notifications.types.${type}.title`;
    const translated = t(key);
    return translated !== key ? translated : type;
  };

  return (
    <div className="space-y-6" id="notification-rule-form-container">
      {/* Header and Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-card-border">
        <div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-link-primary hover:text-link-hover mb-2 cursor-pointer transition-colors"
            id="rule-form-back-btn"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t('notificationRules.form.backToList')}</span>
          </button>
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold tracking-tight text-text-heading font-sans" id="rule-form-title">
              {isEditing ? t('notificationRules.form.editTitle') : t('notificationRules.form.createTitle')}
            </h2>
            {isEditing && rule?.isSystemDefault && (
              <span
                className="inline-flex items-center space-x-1 rounded-md bg-status-info-bg px-2 py-0.5 text-2xs font-semibold text-status-info-text border border-status-info-text/20"
                id="rule-form-system-default-badge"
              >
                <Lock className="h-3 w-3 mr-0.5 shrink-0" />
                <span>{t('notificationRules.systemDefaultBadge')}</span>
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-text-muted font-sans max-w-2xl">
            {isEditing ? t('notificationRules.form.editSubtitle') : t('notificationRules.form.createSubtitle')}
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center space-x-3 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-xl border border-card-border bg-card-bg px-4 py-2 text-sm font-semibold text-text-heading shadow-xs hover:bg-card-header-bg transition-colors cursor-pointer disabled:opacity-60"
            id="rule-form-header-cancel-btn"
          >
            {t('notificationRules.form.cancelBtn')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center space-x-2 rounded-xl bg-btn-primary-bg px-4 py-2 text-sm font-semibold text-btn-primary-text shadow-xs hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-60"
            id="rule-form-header-submit-btn"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t('notificationRules.form.saving')}</span>
              </>
            ) : (
              <>
                {isEditing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                <span>{isEditing ? t('notificationRules.form.saveBtn') : t('notificationRules.form.createBtn')}</span>
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
          id="rule-form-server-error-banner"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-sans font-medium">{serverError}</p>
        </motion.div>
      )}

      {/* Form Grid */}
      <form onSubmit={handleSubmit} className="space-y-8" id="notification-rule-form">
        {/* Section 1: Basic Information & Governance */}
        <div className="rounded-2xl border border-card-border bg-card-bg p-6 shadow-xs space-y-6" id="rule-section-basic-info">
          <div>
            <h3 className="text-base font-bold text-text-heading font-sans">
              {t('notificationRules.form.basicInfo')}
            </h3>
            <p className="text-xs text-text-muted mt-0.5 font-sans">
              {t('notificationRules.form.statusAndGovernance')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rule Name */}
            <div>
              <label htmlFor="rule-name-input" className="block text-xs font-bold text-text-heading uppercase tracking-wider mb-2 font-sans">
                {t('notificationRules.form.ruleName')} <span className="text-status-error-text">*</span>
              </label>
              <input
                type="text"
                id="rule-name-input"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) {
                    setFieldErrors((prev) => ({ ...prev, name: '' }));
                  }
                }}
                placeholder={t('notificationRules.form.ruleNamePlaceholder')}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-text-heading bg-card-bg shadow-xs focus:outline-none focus:ring-2 focus:ring-link-primary/20 ${
                  fieldErrors.name ? 'border-status-error-text' : 'border-card-border'
                }`}
              />
              {fieldErrors.name && (
                <p className="mt-1.5 text-xs text-status-error-text font-medium font-sans" id="rule-name-error">
                  {fieldErrors.name}
                </p>
              )}
            </div>

            {/* Notification Type (Select, disabled when editing) */}
            <div>
              <label htmlFor="rule-notification-type-select" className="block text-xs font-bold text-text-heading uppercase tracking-wider mb-2 font-sans">
                {t('notificationRules.form.notificationType')}
              </label>
              <div className="relative">
                <select
                  id="rule-notification-type-select"
                  value={notificationType}
                  disabled={isEditing}
                  onChange={(e) => setNotificationType(e.target.value)}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-text-heading shadow-xs focus:outline-none focus:ring-2 focus:ring-link-primary/20 ${
                    isEditing
                      ? 'bg-card-header-bg/70 border-card-border cursor-not-allowed opacity-75'
                      : 'bg-card-bg border-card-border cursor-pointer'
                  }`}
                >
                  {NOTIFICATION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {getNotificationTypeLabel(type)} ({type})
                    </option>
                  ))}
                </select>
                {isEditing && (
                  <div className="absolute inset-y-0 right-8 flex items-center pointer-events-none text-text-muted">
                    <Lock className="h-4 w-4" />
                  </div>
                )}
              </div>
              {isEditing ? (
                <p className="mt-1.5 text-xs text-text-muted flex items-center space-x-1 font-sans" id="rule-notification-type-immutable-note">
                  <Lock className="h-3 w-3 shrink-0" />
                  <span>{t('notificationRules.form.notificationTypeImmutableNote')}</span>
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-text-muted font-sans">
                  {t('notificationRules.form.notificationTypeHelp')}
                </p>
              )}
            </div>
          </div>

          {/* Enabled & Mandatory Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-card-border">
            {/* Enabled Switch */}
            <div className="flex items-start justify-between p-4 rounded-xl bg-card-header-bg/50 border border-card-border">
              <div className="pr-4">
                <label htmlFor="rule-enabled-toggle" className="text-sm font-bold text-text-heading font-sans cursor-pointer">
                  {t('notificationRules.form.enabled')}
                </label>
                <p className="text-xs text-text-muted mt-0.5 font-sans leading-relaxed">
                  {t('notificationRules.form.enabledDesc')}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                onClick={() => setEnabled(!enabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-link-primary/20 ${
                  enabled ? 'bg-btn-primary-bg' : 'bg-input-border'
                }`}
                id="rule-enabled-toggle"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-card-bg shadow-sm ring-0 transition duration-200 ease-in-out ${
                    enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Mandatory Switch */}
            <div className="flex items-start justify-between p-4 rounded-xl bg-card-header-bg/50 border border-card-border">
              <div className="pr-4">
                <label htmlFor="rule-mandatory-toggle" className="text-sm font-bold text-text-heading font-sans cursor-pointer">
                  {t('notificationRules.form.mandatory')}
                </label>
                <p className="text-xs text-text-muted mt-0.5 font-sans leading-relaxed">
                  {t('notificationRules.form.mandatoryDesc')}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={mandatory}
                onClick={() => setMandatory(!mandatory)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-link-primary/20 ${
                  mandatory ? 'bg-btn-primary-bg' : 'bg-input-border'
                }`}
                id="rule-mandatory-toggle"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-card-bg shadow-sm ring-0 transition duration-200 ease-in-out ${
                    mandatory ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Delivery Channels */}
        <div className="rounded-2xl border border-card-border bg-card-bg p-6 shadow-xs space-y-4" id="rule-section-channels">
          <div>
            <h3 className="text-base font-bold text-text-heading font-sans">
              {t('notificationRules.form.deliveryChannels')}
            </h3>
            <p className="text-xs text-text-muted mt-0.5 font-sans">
              {t('notificationRules.form.deliveryChannelsDesc')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* In-LMS Channel */}
            <label
              htmlFor="channel-in-lms-checkbox"
              className={`flex items-center space-x-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                channelInLms ? 'border-link-primary/40 bg-link-primary/5' : 'border-card-border bg-card-bg hover:bg-card-header-bg/40'
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
              <div>
                <span className="text-sm font-bold text-text-heading font-sans block">
                  {t('notificationRules.form.channelInLms')}
                </span>
                <span className="text-xs text-text-muted font-sans">
                  {t('notificationRules.channelInLms')}
                </span>
              </div>
            </label>

            {/* Email Channel */}
            <label
              htmlFor="channel-email-checkbox"
              className={`flex items-center space-x-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                channelEmail ? 'border-link-primary/40 bg-link-primary/5' : 'border-card-border bg-card-bg hover:bg-card-header-bg/40'
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
              <div>
                <span className="text-sm font-bold text-text-heading font-sans block">
                  {t('notificationRules.form.channelEmail')}
                </span>
                <span className="text-xs text-text-muted font-sans">
                  {t('notificationRules.channelEmail')}
                </span>
              </div>
            </label>
          </div>

          {fieldErrors.channels && (
            <p className="text-xs text-status-error-text font-medium font-sans" id="rule-channels-error">
              {fieldErrors.channels}
            </p>
          )}
        </div>

        {/* Section 3: Conditions (DUE_SOON daysBeforeDue vs Advanced JSON) */}
        <div className="rounded-2xl border border-card-border bg-card-bg p-6 shadow-xs space-y-4" id="rule-section-conditions">
          <div>
            <h3 className="text-base font-bold text-text-heading font-sans">
              {t('notificationRules.form.conditions')}
            </h3>
            <p className="text-xs text-text-muted mt-0.5 font-sans">
              {notificationType === 'DUE_SOON'
                ? t('notificationRules.form.daysBeforeDueHelp')
                : t('notificationRules.form.advancedConditionsHelp')}
            </p>
          </div>

          {notificationType === 'DUE_SOON' ? (
            <div>
              <label htmlFor="rule-days-before-due-input" className="block text-xs font-bold text-text-heading uppercase tracking-wider mb-2 font-sans">
                {t('notificationRules.form.daysBeforeDue')} <span className="text-status-error-text">*</span>
              </label>
              <div className="relative max-w-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                  <Calendar className="h-4 w-4" />
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  id="rule-days-before-due-input"
                  value={daysBeforeDue}
                  onChange={(e) => {
                    setDaysBeforeDue(e.target.value);
                    if (fieldErrors.daysBeforeDue) {
                      setFieldErrors((prev) => ({ ...prev, daysBeforeDue: '' }));
                    }
                  }}
                  placeholder={t('notificationRules.form.daysBeforeDuePlaceholder')}
                  className={`w-full rounded-xl border pl-10 pr-3.5 py-2.5 text-sm text-text-heading bg-card-bg shadow-xs focus:outline-none focus:ring-2 focus:ring-link-primary/20 ${
                    fieldErrors.daysBeforeDue ? 'border-status-error-text' : 'border-card-border'
                  }`}
                />
              </div>
              {fieldErrors.daysBeforeDue ? (
                <p className="mt-1.5 text-xs text-status-error-text font-medium font-sans" id="rule-days-before-due-error">
                  {fieldErrors.daysBeforeDue}
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-text-muted font-sans">
                  {t('notificationRules.form.daysBeforeDueHelp')}
                </p>
              )}
            </div>
          ) : (
            <div>
              <label htmlFor="rule-advanced-conditions-textarea" className="block text-xs font-bold text-text-heading uppercase tracking-wider mb-2 font-sans flex items-center space-x-1.5">
                <Code className="h-3.5 w-3.5" />
                <span>{t('notificationRules.form.advancedConditions')}</span>
              </label>
              <textarea
                id="rule-advanced-conditions-textarea"
                rows={4}
                value={conditionsJson}
                onChange={(e) => {
                  setConditionsJson(e.target.value);
                  if (fieldErrors.conditions) {
                    setFieldErrors((prev) => ({ ...prev, conditions: '' }));
                  }
                }}
                placeholder={t('notificationRules.form.advancedConditionsPlaceholder')}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-mono text-text-heading bg-card-bg shadow-xs focus:outline-none focus:ring-2 focus:ring-link-primary/20 ${
                  fieldErrors.conditions ? 'border-status-error-text' : 'border-card-border'
                }`}
              />
              {fieldErrors.conditions ? (
                <p className="mt-1.5 text-xs text-status-error-text font-medium font-sans" id="rule-conditions-error">
                  {fieldErrors.conditions}
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-text-muted font-sans">
                  {t('notificationRules.form.advancedConditionsHelp')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Section 4: Recipient Targeting */}
        <div className="rounded-2xl border border-card-border bg-card-bg p-6 shadow-xs space-y-6" id="rule-section-recipients">
          <div>
            <h3 className="text-base font-bold text-text-heading font-sans">
              {t('notificationRules.form.recipientTargeting')}
            </h3>
            <p className="text-xs text-text-muted mt-0.5 font-sans">
              {t('notificationRules.form.recipientTargetingDesc')}
            </p>
          </div>

          {/* Broad Target Checkboxes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label
              htmlFor="recipient-learner-checkbox"
              className={`flex items-center space-x-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                recipientLearner ? 'border-link-primary/40 bg-link-primary/5' : 'border-card-border bg-card-bg hover:bg-card-header-bg/40'
              }`}
            >
              <input
                type="checkbox"
                id="recipient-learner-checkbox"
                checked={recipientLearner}
                onChange={(e) => setRecipientLearner(e.target.checked)}
                className="h-4 w-4 rounded border-card-border text-btn-primary-bg focus:ring-link-primary/20"
              />
              <span className="text-sm font-semibold text-text-heading font-sans">
                {t('notificationRules.form.targetLearner')}
              </span>
            </label>

            <label
              htmlFor="recipient-direct-manager-checkbox"
              className={`flex items-center space-x-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                recipientDirectManager ? 'border-link-primary/40 bg-link-primary/5' : 'border-card-border bg-card-bg hover:bg-card-header-bg/40'
              }`}
            >
              <input
                type="checkbox"
                id="recipient-direct-manager-checkbox"
                checked={recipientDirectManager}
                onChange={(e) => setRecipientDirectManager(e.target.checked)}
                className="h-4 w-4 rounded border-card-border text-btn-primary-bg focus:ring-link-primary/20"
              />
              <span className="text-sm font-semibold text-text-heading font-sans">
                {t('notificationRules.form.targetDirectManager')}
              </span>
            </label>

            <label
              htmlFor="recipient-entire-company-checkbox"
              className={`flex items-center space-x-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                recipientEntireCompany ? 'border-link-primary/40 bg-link-primary/5' : 'border-card-border bg-card-bg hover:bg-card-header-bg/40'
              }`}
            >
              <input
                type="checkbox"
                id="recipient-entire-company-checkbox"
                checked={recipientEntireCompany}
                onChange={(e) => setRecipientEntireCompany(e.target.checked)}
                className="h-4 w-4 rounded border-card-border text-btn-primary-bg focus:ring-link-primary/20"
              />
              <span className="text-sm font-semibold text-text-heading font-sans">
                {t('notificationRules.form.targetEntireCompany')}
              </span>
            </label>
          </div>

          {/* User and Group Multi-Select Pickers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-card-border">
            {/* Specific Users Picker */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-text-heading uppercase tracking-wider font-sans">
                {t('notificationRules.form.targetSpecificUsers')}
              </label>
              <UserMultiSelect
                selectedUserIds={selectedUserIds}
                onChange={setSelectedUserIds}
                id="rule-user-multiselect"
              />
            </div>

            {/* Specific Groups Picker */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-text-heading uppercase tracking-wider font-sans">
                {t('notificationRules.form.targetSpecificGroups')}
              </label>
              <GroupMultiSelect
                selectedGroupIds={selectedGroupIds}
                onChange={setSelectedGroupIds}
                id="rule-group-multiselect"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Message Content Templates */}
        <div className="rounded-2xl border border-card-border bg-card-bg p-6 shadow-xs space-y-6" id="rule-section-templates">
          <div>
            <h3 className="text-base font-bold text-text-heading font-sans">
              {t('notificationRules.form.messageTemplates')}
            </h3>
            <p className="text-xs text-text-muted mt-0.5 font-sans">
              {t('notificationRules.form.messageTemplatesDesc')}
            </p>
          </div>

          {/* Static Helper Note */}
          <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-card-header-bg border border-card-border" id="rule-template-hint-box">
            <Info className="h-4 w-4 text-link-primary shrink-0 mt-0.5" />
            <p className="text-xs text-text-muted font-sans leading-relaxed">
              {t('notificationRules.form.placeholderSyntaxNote')}
            </p>
          </div>

          <div className="space-y-4">
            {/* Title Template */}
            <div>
              <label htmlFor="rule-title-template-input" className="block text-xs font-bold text-text-heading uppercase tracking-wider mb-2 font-sans">
                {t('notificationRules.form.titleTemplate')}
              </label>
              <textarea
                id="rule-title-template-input"
                rows={2}
                value={titleKey}
                onChange={(e) => setTitleKey(e.target.value)}
                placeholder={t('notificationRules.form.titleTemplatePlaceholder')}
                className="w-full rounded-xl border border-card-border px-3.5 py-2.5 text-sm text-text-heading bg-card-bg shadow-xs focus:outline-none focus:ring-2 focus:ring-link-primary/20 font-mono text-xs"
              />
            </div>

            {/* Body Template */}
            <div>
              <label htmlFor="rule-body-template-textarea" className="block text-xs font-bold text-text-heading uppercase tracking-wider mb-2 font-sans">
                {t('notificationRules.form.bodyTemplate')}
              </label>
              <textarea
                id="rule-body-template-textarea"
                rows={4}
                value={bodyKey}
                onChange={(e) => setBodyKey(e.target.value)}
                placeholder={t('notificationRules.form.bodyTemplatePlaceholder')}
                className="w-full rounded-xl border border-card-border px-3.5 py-2.5 text-sm text-text-heading bg-card-bg shadow-xs focus:outline-none focus:ring-2 focus:ring-link-primary/20 font-mono text-xs"
              />
            </div>

            {/* Email Template Selector */}
            <div className="pt-3 border-t border-card-border">
              <label htmlFor="rule-email-template-select" className="block text-xs font-bold text-text-heading uppercase tracking-wider mb-2 font-sans flex items-center space-x-1.5">
                <Mail className="h-3.5 w-3.5 text-link-primary" />
                <span>{t('notificationRules.form.emailTemplate', 'Email Template')}</span>
              </label>
              <select
                id="rule-email-template-select"
                value={emailTemplateId || ''}
                onChange={(e) => setEmailTemplateId(e.target.value || null)}
                className="w-full rounded-xl border border-card-border px-3.5 py-2.5 text-sm text-text-heading bg-card-bg shadow-xs focus:outline-none focus:ring-2 focus:ring-link-primary/20 font-sans cursor-pointer"
              >
                <option value="">{t('notificationRules.form.useDefaultTemplate', 'Use default')}</option>
                {emailTemplates.map((tmpl) => (
                  <option key={tmpl.id} value={tmpl.id}>
                    {tmpl.name} {tmpl.isDefault ? `(${t('emailTemplates.defaultBadge', 'Default')})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-text-muted mt-1.5 font-sans">
                {t(
                  'notificationRules.form.emailTemplateHelp',
                  'Optionally link this rule to a custom HTML email template. If "Use default" is selected, the company default template is used.'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Section 6: Action & Deep Link (Optional) */}
        <div className="rounded-2xl border border-card-border bg-card-bg p-6 shadow-xs space-y-6" id="rule-section-action">
          <div>
            <h3 className="text-base font-bold text-text-heading font-sans">
              {t('notificationRules.form.actionSettings')}
            </h3>
            <p className="text-xs text-text-muted mt-0.5 font-sans">
              {t('notificationRules.form.actionSettingsDesc')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="rule-action-type-input" className="block text-xs font-bold text-text-heading uppercase tracking-wider mb-2 font-sans">
                {t('notificationRules.form.actionType')}
              </label>
              <input
                type="text"
                id="rule-action-type-input"
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                placeholder={t('notificationRules.form.actionTypePlaceholder')}
                className="w-full rounded-xl border border-card-border px-3.5 py-2.5 text-sm text-text-heading bg-card-bg shadow-xs focus:outline-none focus:ring-2 focus:ring-link-primary/20"
              />
            </div>

            <div>
              <label htmlFor="rule-action-url-input" className="block text-xs font-bold text-text-heading uppercase tracking-wider mb-2 font-sans">
                {t('notificationRules.form.actionUrl')}
              </label>
              <input
                type="text"
                id="rule-action-url-input"
                value={actionUrl}
                onChange={(e) => setActionUrl(e.target.value)}
                placeholder={t('notificationRules.form.actionUrlPlaceholder')}
                className="w-full rounded-xl border border-card-border px-3.5 py-2.5 text-sm text-text-heading bg-card-bg shadow-xs focus:outline-none focus:ring-2 focus:ring-link-primary/20"
              />
            </div>
          </div>
        </div>

        {/* Section 7: Form Footer Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-card-border" id="rule-form-footer-actions">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-xl border border-card-border bg-card-bg px-5 py-2.5 text-sm font-semibold text-text-heading shadow-xs hover:bg-card-header-bg transition-colors cursor-pointer disabled:opacity-60"
            id="rule-form-cancel-btn"
          >
            {t('notificationRules.form.cancelBtn')}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center space-x-2 rounded-xl bg-btn-primary-bg px-6 py-2.5 text-sm font-semibold text-btn-primary-text shadow-xs hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-60"
            id="rule-form-submit-btn"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t('notificationRules.form.saving')}</span>
              </>
            ) : (
              <>
                {isEditing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                <span>{isEditing ? t('notificationRules.form.saveBtn') : t('notificationRules.form.createBtn')}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
