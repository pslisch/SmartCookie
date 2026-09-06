import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Zap,
  Calendar,
  Clock,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Loader2,
  X,
  Trash2,
  AlertCircle,
  Info,
  CalendarClock,
} from 'lucide-react';
import { Theme } from '../types';

interface ActivateScheduleModalProps {
  theme: Theme;
  currentActiveTheme?: Theme | null;
  existingScheduledTheme?: Theme | null;
  onClose: () => void;
  onSuccess: (updatedTheme: Theme) => void;
}

function getCsrfToken(): string {
  const match = document.cookie.match(/csrfToken=([^;]+)/);
  return match ? match[1] : '';
}

function computeCountdown(targetDate: Date): string {
  const diffMs = targetDate.getTime() - Date.now();
  if (diffMs <= 0) return 'Scheduled time has passed';
  const totalMinutes = Math.floor(diffMs / (60 * 1000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `in ${days} day${days > 1 ? 's' : ''}, ${hours} hr${hours !== 1 ? 's' : ''}`;
  }
  if (hours > 0) {
    return `in ${hours} hr${hours > 1 ? 's' : ''}, ${minutes} min${minutes !== 1 ? 's' : ''}`;
  }
  return `in ${minutes} min${minutes !== 1 ? 's' : ''}`;
}

export const ActivateScheduleModal: React.FC<ActivateScheduleModalProps> = ({
  theme,
  currentActiveTheme,
  existingScheduledTheme,
  onClose,
  onSuccess,
}) => {
  const isAlreadyScheduled = Boolean(theme.scheduledActivationAt);
  const [activeTab, setActiveTab] = useState<'immediate' | 'schedule'>(
    isAlreadyScheduled ? 'schedule' : 'immediate'
  );

  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Timezone detection
  const userTimeZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }, []);

  // Compute default date: tomorrow if 03:00 has passed today, else tomorrow anyway for standard maintenance window
  const defaultDateStr = useMemo(() => {
    if (theme.scheduledActivationAt) {
      const d = new Date(theme.scheduledActivationAt);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    const target = new Date();
    target.setDate(target.getDate() + 1);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, [theme.scheduledActivationAt]);

  const defaultTimeStr = useMemo(() => {
    if (theme.scheduledActivationAt) {
      const d = new Date(theme.scheduledActivationAt);
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${min}`;
    }
    return '03:00';
  }, [theme.scheduledActivationAt]);

  const [dateInput, setDateInput] = useState<string>(defaultDateStr);
  const [timeInput, setTimeInput] = useState<string>(defaultTimeStr);

  // Confirmation prompt state when replacing another theme's schedule
  const [showReplacePrompt, setShowReplacePrompt] = useState<boolean>(false);
  const [replaceTargetInfo, setReplaceTargetInfo] = useState<{
    name: string;
    scheduledAt: string;
  } | null>(
    existingScheduledTheme && existingScheduledTheme.id !== theme.id
      ? {
          name: existingScheduledTheme.name,
          scheduledAt: existingScheduledTheme.scheduledActivationAt || '',
        }
      : null
  );

  // Countdown timer for already scheduled theme
  const [countdownText, setCountdownText] = useState<string>('');
  useEffect(() => {
    if (!theme.scheduledActivationAt) return;
    const target = new Date(theme.scheduledActivationAt);
    setCountdownText(computeCountdown(target));
    const timer = setInterval(() => {
      setCountdownText(computeCountdown(target));
    }, 30000);
    return () => clearInterval(timer);
  }, [theme.scheduledActivationAt]);

  // Derived selected local Date and UTC string
  const { localDateObj, utcIsoString, isDateValid, isFutureDate } = useMemo(() => {
    if (!dateInput || !timeInput) {
      return { localDateObj: null, utcIsoString: null, isDateValid: false, isFutureDate: false };
    }
    const [y, m, d] = dateInput.split('-').map(Number);
    const [hh, mm] = timeInput.split(':').map(Number);
    if (isNaN(y) || isNaN(m) || isNaN(d) || isNaN(hh) || isNaN(mm)) {
      return { localDateObj: null, utcIsoString: null, isDateValid: false, isFutureDate: false };
    }
    // Constructs in local browser timezone: handles DST transitions precisely
    const dateObj = new Date(y, m - 1, d, hh, mm, 0, 0);
    const valid = !isNaN(dateObj.getTime());
    const future = valid && dateObj.getTime() > Date.now();
    return {
      localDateObj: valid ? dateObj : null,
      utcIsoString: valid ? dateObj.toISOString() : null,
      isDateValid: valid,
      isFutureDate: future,
    };
  }, [dateInput, timeInput]);

  // Formatted local representation for selected date
  const formattedSelectedLocal = useMemo(() => {
    if (!localDateObj) return '';
    return localDateObj.toLocaleString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  }, [localDateObj]);

  // Formatted scheduled representation for existing schedule
  const formattedExistingSchedule = useMemo(() => {
    if (!theme.scheduledActivationAt) return null;
    const d = new Date(theme.scheduledActivationAt);
    return {
      dateText: d.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      timeText: d.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      }),
      utcText: d.toUTCString(),
    };
  }, [theme.scheduledActivationAt]);

  // Submit Immediate Activation (Section 23)
  const handleActivateImmediate = async () => {
    try {
      setSubmitting(true);
      setError(null);
      const csrfToken = getCsrfToken();
      const res = await fetch(`/api/themes/${theme.id}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({ mode: 'immediate' }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to activate theme (${res.status})`);
      }

      const updated: Theme = await res.json();
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      console.error('[ActivateScheduleModal] Immediate activation error:', err);
      setError(err.message || 'Failed to activate theme.');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Schedule Activation (Section 25)
  const handleScheduleActivation = async (confirmReplace: boolean = false) => {
    if (!isDateValid || !isFutureDate || !utcIsoString) {
      setError('Please select a valid future date and time for activation.');
      return;
    }

    // Check if another theme is scheduled and confirmation is required
    if (existingScheduledTheme && existingScheduledTheme.id !== theme.id && !confirmReplace) {
      setReplaceTargetInfo({
        name: existingScheduledTheme.name,
        scheduledAt: existingScheduledTheme.scheduledActivationAt || '',
      });
      setShowReplacePrompt(true);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const csrfToken = getCsrfToken();
      const res = await fetch(`/api/themes/${theme.id}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          mode: 'schedule',
          scheduledActivationAt: utcIsoString,
          confirmReplaceExisting: confirmReplace,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 409 && errData.requiresConfirmation) {
          setReplaceTargetInfo({
            name: errData.existingScheduledTheme?.name || 'another theme',
            scheduledAt: errData.existingScheduledTheme?.scheduledActivationAt || '',
          });
          setShowReplacePrompt(true);
          return;
        }
        throw new Error(errData.error || `Failed to schedule theme activation (${res.status})`);
      }

      const updated: Theme = await res.json();
      setShowReplacePrompt(false);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      console.error('[ActivateScheduleModal] Scheduling error:', err);
      setError(err.message || 'Failed to schedule activation.');
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel Schedule (Section 25)
  const handleCancelSchedule = async () => {
    try {
      setCancelling(true);
      setError(null);
      const csrfToken = getCsrfToken();
      const res = await fetch(`/api/themes/${theme.id}/cancel-schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to cancel schedule (${res.status})`);
      }

      const updated: Theme = await res.json();
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      console.error('[ActivateScheduleModal] Cancel schedule error:', err);
      setError(err.message || 'Failed to cancel schedule.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-overlay backdrop-blur-xs"
      id="activate-schedule-modal-backdrop"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-xl rounded-2xl border border-card-border bg-card-bg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        id="activate-schedule-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-card-border">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-link-primary/10 text-link-primary">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-heading font-sans" id="activate-modal-title">
                Activate Theme: {theme.name}
              </h3>
              <p className="text-xs text-text-muted font-sans">
                Deploy immediately or schedule automatic activation.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-card-header-bg transition-colors"
            id="activate-modal-close-btn"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher: Immediate vs Schedule */}
        <div className="flex border-b border-card-border px-6 pt-2 bg-card-header-bg/40" id="activation-mode-tabs">
          <button
            type="button"
            onClick={() => {
              setActiveTab('immediate');
              setError(null);
            }}
            id="tab-immediate-activation"
            className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-semibold text-xs tracking-wide transition-all cursor-pointer ${
              activeTab === 'immediate'
                ? 'border-link-primary text-link-primary'
                : 'border-transparent text-text-muted hover:text-text-heading hover:border-card-border'
            }`}
          >
            <Zap className="h-4 w-4" />
            <span>Immediate Activation</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('schedule');
              setError(null);
            }}
            id="tab-scheduled-activation"
            className={`flex items-center space-x-2 py-3 px-4 border-b-2 font-semibold text-xs tracking-wide transition-all cursor-pointer ${
              activeTab === 'schedule'
                ? 'border-link-primary text-link-primary'
                : 'border-transparent text-text-muted hover:text-text-heading hover:border-card-border'
            }`}
          >
            <CalendarClock className="h-4 w-4" />
            <span>Schedule Activation</span>
            {isAlreadyScheduled && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-status-info-bg text-status-info-text border border-status-info-text/20">
                Pending
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5" id="activation-modal-body">
          {/* Error Banner */}
          {error && (
            <div className="flex items-center space-x-2 p-3.5 rounded-xl bg-status-error-bg text-status-error-text text-xs border border-status-error-text/25" id="activation-error-banner">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: IMMEDIATE ACTIVATION (Section 23) */}
          {activeTab === 'immediate' && (
            <div className="space-y-5" id="immediate-activation-pane">
              {/* Section 23 Before / After Confirmation Card */}
              <div className="rounded-xl border border-card-border bg-card-header-bg/50 p-4">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                  Theme Transition Overview
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  {/* Current Active Theme */}
                  <div className="flex-1 rounded-xl border border-card-border bg-card-bg p-3.5" id="current-active-theme-card">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-medium text-text-muted">Current Theme</span>
                      <span className="inline-flex items-center rounded-full bg-status-success-bg px-2 py-0.5 text-[10px] font-semibold text-status-success-text border border-status-success-text/20">
                        Active
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-text-heading line-clamp-1">
                      {currentActiveTheme?.name || 'System Default'}
                    </h4>
                    <p className="text-[11px] text-text-muted mt-1">
                      Will be demoted to <span className="font-semibold text-text-heading">Ready</span>
                    </p>
                  </div>

                  {/* Transition Arrow */}
                  <div className="flex items-center justify-center p-1 text-text-muted sm:rotate-0 rotate-90">
                    <ArrowRight className="h-5 w-5 text-link-primary" />
                  </div>

                  {/* New Target Theme */}
                  <div className="flex-1 rounded-xl border border-link-primary/40 bg-card-bg p-3.5 ring-1 ring-link-primary/20" id="new-target-theme-card">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-medium text-text-muted">New Theme</span>
                      <span className="inline-flex items-center rounded-full bg-status-info-bg px-2 py-0.5 text-[10px] font-semibold text-status-info-text border border-status-info-text/20">
                        {theme.status}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-text-heading line-clamp-1">
                      {theme.name}
                    </h4>
                    <p className="text-[11px] text-status-success-text font-semibold mt-1">
                      Will become Active company-wide
                    </p>
                  </div>
                </div>
              </div>

              {/* Informational Advisory */}
              <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-card-header-bg/60 border border-card-border text-xs text-text-body">
                <Info className="h-4 w-4 text-link-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-text-heading">Immediate Effect</p>
                  <p className="text-text-muted leading-relaxed">
                    Activating <span className="font-semibold text-text-heading">{theme.name}</span> will instantly apply its color palette, base font size ({theme.baseFontSize}px), and typography styles to all users across the organization.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SCHEDULED ACTIVATION (Section 25) */}
          {activeTab === 'schedule' && (
            <div className="space-y-5" id="scheduled-activation-pane">
              {/* If theme already has a pending schedule, show status and countdown */}
              {isAlreadyScheduled && formattedExistingSchedule && (
                <div className="rounded-xl border border-status-info-text/30 bg-status-info-bg/30 p-4 space-y-3" id="existing-schedule-banner">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CalendarClock className="h-4 w-4 text-status-info-text" />
                      <span className="text-xs font-bold text-text-heading">Pending Activation Schedule</span>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-status-info-bg px-2.5 py-0.5 text-xs font-semibold text-status-info-text border border-status-info-text/30">
                      {countdownText || 'Scheduled'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-text-body">
                    <div>
                      <span className="text-text-muted">Local Date & Time:</span>
                      <p className="font-semibold text-text-heading">
                        {formattedExistingSchedule.dateText} at {formattedExistingSchedule.timeText}
                      </p>
                    </div>
                    <div>
                      <span className="text-text-muted">Stored UTC Time:</span>
                      <p className="font-mono text-[11px] text-text-muted">
                        {formattedExistingSchedule.utcText}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-card-border/50 text-xs">
                    <span className="text-text-muted">Need to cancel this schedule?</span>
                    <button
                      type="button"
                      disabled={cancelling}
                      onClick={handleCancelSchedule}
                      id="cancel-existing-schedule-btn"
                      className="inline-flex items-center space-x-1.5 text-status-error-text hover:underline font-semibold cursor-pointer disabled:opacity-60"
                    >
                      {cancelling ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      <span>Cancel Schedule</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Date & Time Input Picker */}
              <div className="rounded-xl border border-card-border bg-card-bg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-text-heading">
                    {isAlreadyScheduled ? 'Modify Scheduled Time' : 'Select Scheduled Activation Time'}
                  </h4>
                  <span className="text-[11px] text-text-muted flex items-center space-x-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Default: 03:00 local</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="schedule-date-input"
                      className="block text-xs font-semibold text-text-heading mb-1"
                    >
                      Date <span className="text-status-error-text">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="schedule-date-input"
                        type="date"
                        value={dateInput}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setDateInput(e.target.value)}
                        className="w-full rounded-xl border border-input-border bg-card-bg px-3.5 py-2 text-xs text-text-heading shadow-2xs focus:border-input-border-focus focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="schedule-time-input"
                      className="block text-xs font-semibold text-text-heading mb-1"
                    >
                      Time (Local) <span className="text-status-error-text">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="schedule-time-input"
                        type="time"
                        value={timeInput}
                        onChange={(e) => setTimeInput(e.target.value)}
                        className="w-full rounded-xl border border-input-border bg-card-bg px-3.5 py-2 text-xs text-text-heading shadow-2xs focus:border-input-border-focus focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Timezone & Conversion Preview (Accounts for DST) */}
                <div className="p-3 rounded-lg bg-card-header-bg/60 border border-card-border space-y-2 text-xs">
                  <div className="flex items-center justify-between text-text-muted">
                    <span>Local Timezone:</span>
                    <span className="font-semibold text-text-heading">{userTimeZone}</span>
                  </div>

                  {localDateObj && isDateValid && (
                    <>
                      <div className="flex items-center justify-between text-text-muted">
                        <span>Local Activation Time:</span>
                        <span className="font-medium text-text-heading">{formattedSelectedLocal}</span>
                      </div>
                      <div className="flex items-center justify-between text-text-muted">
                        <span>Stored as UTC:</span>
                        <span className="font-mono text-[11px] text-text-muted">{utcIsoString}</span>
                      </div>
                      <div className="flex items-center justify-between text-text-muted">
                        <span>Relative Time:</span>
                        <span className="font-semibold text-status-info-text">
                          {computeCountdown(localDateObj)}
                        </span>
                      </div>
                    </>
                  )}

                  {!isFutureDate && isDateValid && (
                    <p className="text-status-error-text text-[11px] font-semibold mt-1">
                      Scheduled time must be in the future.
                    </p>
                  )}
                </div>
              </div>

              {/* Confirm Replace Notice if another theme already has a pending schedule */}
              {existingScheduledTheme && existingScheduledTheme.id !== theme.id && (
                <div className="flex items-start space-x-3 p-3.5 rounded-xl bg-status-warning-bg/40 border border-status-warning-text/30 text-xs text-text-body" id="existing-other-schedule-notice">
                  <AlertTriangle className="h-4 w-4 text-status-warning-text shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-text-heading">Existing Schedule Detected</p>
                    <p className="text-text-body">
                      Theme <span className="font-semibold text-text-heading">"{existingScheduledTheme.name}"</span> is currently scheduled for activation. Only one pending schedule may exist company-wide.
                    </p>
                    <p className="text-text-muted text-[11px]">
                      Scheduling this theme will automatically cancel the pending schedule on "{existingScheduledTheme.name}".
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-card-border bg-card-header-bg/40">
          <button
            type="button"
            disabled={submitting || cancelling}
            onClick={onClose}
            id="activation-cancel-btn"
            className="rounded-xl border border-card-border bg-card-bg px-4 py-2 text-xs font-semibold text-text-heading shadow-2xs hover:bg-card-header-bg transition-colors"
          >
            Close
          </button>

          <div className="flex items-center space-x-3">
            {activeTab === 'immediate' ? (
              <button
                type="button"
                disabled={submitting}
                onClick={handleActivateImmediate}
                id="confirm-immediate-activate-btn"
                className="inline-flex items-center space-x-2 rounded-xl bg-link-primary px-4 py-2 text-xs font-semibold text-btn-primary-text shadow-sm hover:bg-btn-primary-hover transition-colors cursor-pointer disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Activating...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-3.5 w-3.5" />
                    <span>Activate Now</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting || cancelling || !isFutureDate}
                onClick={() => handleScheduleActivation(false)}
                id="confirm-schedule-activate-btn"
                className="inline-flex items-center space-x-2 rounded-xl bg-link-primary px-4 py-2 text-xs font-semibold text-btn-primary-text shadow-sm hover:bg-btn-primary-hover transition-colors cursor-pointer disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving Schedule...</span>
                  </>
                ) : (
                  <>
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{isAlreadyScheduled ? 'Update Schedule' : 'Schedule Activation'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Conflict / Replace Schedule Confirmation Sub-Modal */}
        <AnimatePresence>
          {showReplacePrompt && replaceTargetInfo && (
            <div
              className="absolute inset-0 z-60 flex items-center justify-center p-4 bg-bg-overlay/80 backdrop-blur-xs"
              id="confirm-replace-schedule-prompt-backdrop"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                className="w-full max-w-md rounded-2xl border border-card-border bg-card-bg p-6 shadow-2xl space-y-4"
                id="confirm-replace-schedule-prompt"
              >
                <div className="flex items-center space-x-3 text-status-warning-text">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-status-warning-bg">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text-heading font-sans">
                      Replace Existing Schedule?
                    </h4>
                    <p className="text-xs text-text-muted font-sans">
                      Single company schedule policy
                    </p>
                  </div>
                </div>

                <p className="text-xs text-text-body font-sans leading-relaxed">
                  Theme <span className="font-semibold text-text-heading">"{replaceTargetInfo.name}"</span> is currently scheduled for activation. Only one pending schedule may exist at a time.
                </p>

                <p className="text-xs text-text-muted font-sans">
                  Do you want to cancel the schedule for <span className="font-semibold text-text-heading">"{replaceTargetInfo.name}"</span> and schedule <span className="font-semibold text-text-heading">"{theme.name}"</span> instead?
                </p>

                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-card-border">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setShowReplacePrompt(false)}
                    id="cancel-replace-schedule-btn"
                    className="rounded-xl border border-card-border bg-card-bg px-3.5 py-1.5 text-xs font-semibold text-text-heading hover:bg-card-header-bg transition-colors"
                  >
                    Keep Existing
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleScheduleActivation(true)}
                    id="confirm-replace-schedule-btn"
                    className="inline-flex items-center space-x-1.5 rounded-xl bg-link-primary hover:bg-btn-primary-hover text-btn-primary-text px-3.5 py-1.5 text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-60"
                  >
                    {submitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle className="h-3.5 w-3.5" />
                    )}
                    <span>Confirm & Replace</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
