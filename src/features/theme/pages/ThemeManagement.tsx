import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Palette,
  Plus,
  ArrowRight,
  Sparkles,
  Calendar,
  AlertCircle,
  Loader2,
  X,
  CheckCircle,
  Lock,
  Type,
  FlaskConical,
  Zap,
  CalendarClock,
} from 'lucide-react';
import { Theme } from '../types';
import { ThemeEditor } from './ThemeEditor';
import { FontLibrary } from '../components/FontLibrary';
import { ActivateScheduleModal } from '../components/ActivateScheduleModal';
import { usePermission } from '../../../shared/hooks/usePermission';
import { useThemeRuntime } from '../../../shared/contexts/ThemeRuntimeContext';

function getCsrfToken(): string {
  const match = document.cookie.match(/csrfToken=([^;]+)/);
  return match ? match[1] : '';
}

export const ThemeManagement: React.FC = () => {
  const canEdit = usePermission('theme', 'edit');
  const canActivate = usePermission('theme', 'activate');

  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selected theme for the editor
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);

  // Activate / Schedule Modal
  const [activeModalTheme, setActiveModalTheme] = useState<Theme | null>(null);

  // Tab state: 'themes' | 'fonts'
  const [activeTab, setActiveTab] = useState<'themes' | 'fonts'>('themes');

  // Create theme modal state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newThemeName, setNewThemeName] = useState<string>('');
  const [sourceThemeId, setSourceThemeId] = useState<string>('');
  const [creating, setCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Runtime test mode integration
  const { isTestMode, testThemeId, refetch: refetchRuntimeTheme, exitTestMode } = useThemeRuntime();
  const [testingThemeId, setTestingThemeId] = useState<string | null>(null);
  const [dismissedFailureIds, setDismissedFailureIds] = useState<Set<string>>(new Set());
  const [lockConflictModal, setLockConflictModal] = useState<{
    open: boolean;
    message: string;
  } | null>(null);

  const currentActiveTheme = useMemo(
    () => themes.find((t) => t.status === 'ACTIVE') || null,
    [themes]
  );
  const existingScheduledTheme = useMemo(
    () =>
      themes.find(
        (t) => t.scheduledActivationAt && (!activeModalTheme || t.id !== activeModalTheme.id)
      ) || null,
    [themes, activeModalTheme]
  );

  const fetchThemes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/themes', { credentials: 'include' });
      if (!res.ok) {
        throw new Error(`Failed to load themes (${res.status})`);
      }
      const data: Theme[] = await res.json();
      setThemes(data);

      // Default source theme to the Smart Cookie Default theme or first theme
      const defaultTheme = data.find((t) => t.isSmartCookieDefault) || data[0];
      if (defaultTheme) {
        setSourceThemeId(defaultTheme.id);
      }
    } catch (err: any) {
      console.error('[ThemeManagement] Error fetching themes:', err);
      setError(err.message || 'Failed to load themes.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDismissFailure = async (e: React.MouseEvent, themeId: string) => {
    e.stopPropagation();
    setDismissedFailureIds((prev) => new Set([...prev, themeId]));
    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(`/api/themes/${themeId}/dismiss-failure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
      });
      if (res.ok) {
        setThemes((prev) =>
          prev.map((t) =>
            t.id === themeId
              ? { ...t, scheduledActivationFailedAt: null, scheduledActivationFailedReason: null }
              : t
          )
        );
      }
    } catch (err) {
      console.error('Failed to dismiss activation failure:', err);
    }
  };

  useEffect(() => {
    fetchThemes();
  }, [fetchThemes]);

  const handleSetForTest = async (e: React.MouseEvent, theme: Theme) => {
    e.stopPropagation(); // prevent opening editor
    try {
      setTestingThemeId(theme.id);
      setError(null);

      // If user is already testing this exact theme, toggle exit test mode
      if (isTestMode && testThemeId === theme.id) {
        await exitTestMode();
        return;
      }

      // If testing a different theme, release that lock first
      const currentOverride = sessionStorage.getItem('themeTestOverrideId');
      if (currentOverride && currentOverride !== theme.id) {
        try {
          await fetch(`/api/themes/${currentOverride}/lock`, {
            method: 'DELETE',
            credentials: 'include',
          });
        } catch {}
      }

      // Acquire TEST lock
      const res = await fetch(`/api/themes/${theme.id}/lock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify({ lockType: 'TEST' }),
        credentials: 'include',
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setLockConflictModal({
            open: true,
            message: errData.error || `${errData.holderName || 'Another user'} is currently testing this theme.`,
          });
          return;
        }
        throw new Error(errData.error || `Failed to acquire test lock (${res.status})`);
      }

      // Store in sessionStorage and refresh theme runtime across the entire LMS
      sessionStorage.setItem('themeTestOverrideId', theme.id);
      await refetchRuntimeTheme();
    } catch (err: any) {
      console.error('[ThemeManagement] Error setting theme for test:', err);
      setError(err.message || 'Failed to set theme for test.');
    } finally {
      setTestingThemeId(null);
    }
  };

  const handleOpenCreateModal = () => {
    setNewThemeName('');
    setCreateError(null);
    const defaultTheme = themes.find((t) => t.isSmartCookieDefault) || themes[0];
    if (defaultTheme) {
      setSourceThemeId(defaultTheme.id);
    }
    setShowCreateModal(true);
  };

  const handleCreateTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newThemeName.trim();
    if (!trimmedName) {
      setCreateError('Please provide a name for the theme.');
      return;
    }
    if (!sourceThemeId) {
      setCreateError('Please select a template theme to clone from.');
      return;
    }

    try {
      setCreating(true);
      setCreateError(null);
      const csrfToken = getCsrfToken();
      const res = await fetch('/api/themes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          name: trimmedName,
          sourceThemeId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to create theme (${res.status})`);
      }

      const createdTheme: Theme = await res.json();
      setShowCreateModal(false);
      await fetchThemes();
      // Immediately navigate into editor for the new theme
      setSelectedThemeId(createdTheme.id);
    } catch (err: any) {
      console.error('[ThemeManagement] Error creating theme:', err);
      setCreateError(err.message || 'Failed to create theme.');
    } finally {
      setCreating(false);
    }
  };

  // If a theme is selected, mount the ThemeEditor
  if (selectedThemeId) {
    return (
      <ThemeEditor
        themeId={selectedThemeId}
        onBack={() => {
          setSelectedThemeId(null);
          fetchThemes();
        }}
      />
    );
  }

  return (
    <div className="space-y-6" id="theme-management-root">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-card-border">
        <div>
          <h2 className="text-xl font-bold text-text-heading font-sans" id="theme-management-heading">
            Themes & Branding
          </h2>
          <p className="text-sm text-text-muted mt-0.5 font-sans">
            Customize typography, color palettes, and interface styles for your company.
          </p>
        </div>

        {canEdit && activeTab === 'themes' && (
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center space-x-2 rounded-xl bg-link-primary px-4 py-2 text-sm font-semibold text-btn-primary-text shadow-sm transition-colors hover:bg-btn-primary-hover focus:outline-none self-start sm:self-auto"
            id="create-theme-btn"
          >
            <Plus className="h-4 w-4" />
            <span>Create Theme</span>
          </button>
        )}
      </div>

      {/* Tab Switcher: Themes vs Font Library */}
      <div className="flex items-center space-x-2 border-b border-card-border" id="theme-management-tabs">
        <button
          type="button"
          onClick={() => setActiveTab('themes')}
          className={`inline-flex items-center space-x-2 px-4 py-2.5 border-b-2 font-semibold text-sm transition-colors ${
            activeTab === 'themes'
              ? 'border-link-primary text-link-primary'
              : 'border-transparent text-text-muted hover:text-text-heading hover:border-card-border'
          }`}
          id="tab-themes-btn"
        >
          <Palette className="h-4 w-4" />
          <span>Themes</span>
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-card-header-bg border border-card-border text-text-muted">
            {themes.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('fonts')}
          className={`inline-flex items-center space-x-2 px-4 py-2.5 border-b-2 font-semibold text-sm transition-colors ${
            activeTab === 'fonts'
              ? 'border-link-primary text-link-primary'
              : 'border-transparent text-text-muted hover:text-text-heading hover:border-card-border'
          }`}
          id="tab-font-library-btn"
        >
          <Type className="h-4 w-4" />
          <span>Font Library</span>
        </button>
      </div>

      {activeTab === 'fonts' ? (
        <FontLibrary />
      ) : (
        <>
          {/* Error state */}
      {error && (
        <div className="flex items-center space-x-3 p-4 rounded-xl bg-status-error-bg/50 border border-status-error-text/20 text-status-error-text" id="theme-list-error">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-sans">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center p-8" id="theme-list-loading">
          <Loader2 className="h-8 w-8 animate-spin text-link-primary mb-3" />
          <p className="text-sm text-text-muted font-sans">Loading themes...</p>
        </div>
      ) : themes.length === 0 ? (
        <div className="flex flex-col items-center justify-center border border-dashed border-card-border rounded-2xl bg-card-bg p-12 text-center" id="theme-list-empty">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-card-header-bg text-text-muted mb-4">
            <Palette className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-text-heading font-sans">No Themes Configured</h3>
          <p className="text-sm text-text-muted mt-1 max-w-sm font-sans">
            Get started by creating your first custom theme template.
          </p>
          {canEdit && (
            <button
              onClick={handleOpenCreateModal}
              className="mt-6 inline-flex items-center space-x-2 rounded-xl bg-link-primary px-4 py-2 text-sm font-semibold text-btn-primary-text shadow-sm hover:bg-btn-primary-hover"
              id="empty-create-theme-btn"
            >
              <Plus className="h-4 w-4" />
              <span>Create Theme</span>
            </button>
          )}
        </div>
      ) : (
        /* Themes Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="themes-grid">
          {themes.map((theme) => {
            const isDefault = theme.isSmartCookieDefault;
            const isActive = theme.status === 'ACTIVE';
            const isReady = theme.status === 'READY';
            const isDraft = theme.status === 'DRAFT';
            const isReadOnly = isActive || isDefault || !canEdit;
            const isCurrentlyTestingThis = isTestMode && testThemeId === theme.id;

            return (
              <motion.div
                key={theme.id}
                whileHover={{ y: -3, scale: 1.01 }}
                onClick={() => setSelectedThemeId(theme.id)}
                className={`cursor-pointer flex flex-col justify-between p-6 rounded-2xl border bg-card-bg shadow-sm hover:shadow-md transition-all text-left ${
                  isCurrentlyTestingThis ? 'border-status-warning-text/40 ring-1 ring-status-warning-text/30' : 'border-card-border hover:border-link-primary'
                }`}
                id={`theme-card-${theme.id}`}
              >
                <div>
                  {/* Top row badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isActive && (
                        <span className="inline-flex items-center rounded-full bg-status-success-bg px-2.5 py-0.5 text-xs font-semibold text-status-success-text border border-status-success-text/20">
                          Active
                        </span>
                      )}
                      {isReady && (
                        <span className="inline-flex items-center rounded-full bg-status-info-bg px-2.5 py-0.5 text-xs font-semibold text-status-info-text border border-status-info-text/20">
                          Ready
                        </span>
                      )}
                      {isDraft && (
                        <span className="inline-flex items-center rounded-full bg-card-header-bg px-2.5 py-0.5 text-xs font-semibold text-text-muted border border-card-border">
                          Draft
                        </span>
                      )}
                      {isDefault && (
                        <span className="inline-flex items-center rounded-full bg-status-warning-bg px-2.5 py-0.5 text-xs font-semibold text-status-warning-text border border-status-warning-text/20">
                          System Default
                        </span>
                      )}
                      {isCurrentlyTestingThis && (
                        <span className="inline-flex items-center space-x-1 rounded-full bg-status-warning-bg px-2 py-0.5 text-xs font-semibold text-status-warning-text border border-status-warning-text/30" id={`theme-card-testing-badge-${theme.id}`}>
                          <FlaskConical className="h-3 w-3" />
                          <span>Testing</span>
                        </span>
                      )}
                      {theme.scheduledActivationAt && (
                        <span
                          className="inline-flex items-center space-x-1 rounded-full bg-status-info-bg px-2 py-0.5 text-xs font-semibold text-status-info-text border border-status-info-text/30"
                          id={`theme-card-scheduled-badge-${theme.id}`}
                          title={`Scheduled for ${new Date(theme.scheduledActivationAt).toLocaleString()}`}
                        >
                          <CalendarClock className="h-3 w-3" />
                          <span>Scheduled</span>
                        </span>
                      )}
                      {theme.scheduledActivationFailedAt && !dismissedFailureIds.has(theme.id) && (
                        <span
                          className="inline-flex items-center space-x-1 rounded-full bg-status-error-bg px-2 py-0.5 text-xs font-semibold text-status-error-text border border-status-error-text/30"
                          id={`theme-card-failed-badge-${theme.id}`}
                          title={`Scheduled activation failed: ${theme.scheduledActivationFailedReason || 'Unknown error'}`}
                        >
                          <AlertCircle className="h-3 w-3" />
                          <span>Activation Failed</span>
                        </span>
                      )}
                    </div>

                    {isReadOnly && (
                      <span title="Read-only theme" className="text-text-muted">
                        <Lock className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>

                  {/* Theme Title */}
                  <h3 className="text-lg font-bold text-text-heading font-sans mb-1 line-clamp-1">
                    {theme.name}
                  </h3>

                  {/* Scheduled Activation Failed Banner (Dismissible) */}
                  {theme.scheduledActivationFailedAt && !dismissedFailureIds.has(theme.id) && (
                    <div
                      className="mt-2.5 mb-1 p-2.5 rounded-xl bg-status-error-bg/40 border border-status-error-text/25 text-xs text-status-error-text flex items-start justify-between gap-2"
                      id={`theme-card-failed-banner-${theme.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-start space-x-2 min-w-0">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-status-error-text" />
                        <div className="min-w-0">
                          <p className="font-semibold text-text-heading">Activation Failed</p>
                          <p className="text-[11px] text-text-muted mt-0.5 break-words">
                            {theme.scheduledActivationFailedReason || 'Scheduled activation encountered an error.'}
                          </p>
                          <p className="text-[10px] text-text-muted/80 mt-1">
                            Failed at: {new Date(theme.scheduledActivationFailedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDismissFailure(e, theme.id)}
                        id={`dismiss-failed-banner-btn-${theme.id}`}
                        title="Dismiss notification"
                        className="p-1 rounded-md text-text-muted hover:text-text-heading hover:bg-card-header-bg transition-colors shrink-0 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="mt-3 space-y-1.5 text-xs text-text-muted font-sans">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        Created:{' '}
                        {new Date(theme.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-text-body">Base Font:</span>
                      <span>{theme.baseFontSize || 16}px</span>
                    </div>
                    {theme.scheduledActivationAt && (
                      <div className="flex items-center space-x-2 text-status-info-text font-medium">
                        <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                        <span className="line-clamp-1">
                          Scheduled: {new Date(theme.scheduledActivationAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })} at {new Date(theme.scheduledActivationAt).toLocaleTimeString(undefined, {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer click-through & Test Mode actions */}
                <div className="mt-6 pt-4 border-t border-card-border/60 flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={(e) => handleSetForTest(e, theme)}
                      disabled={testingThemeId === theme.id}
                      id={`theme-set-for-test-btn-${theme.id}`}
                      title={
                        isCurrentlyTestingThis
                          ? 'Currently testing this theme. Click to exit test mode.'
                          : 'Apply this theme to your entire LMS session for testing'
                      }
                      className={`inline-flex items-center space-x-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                        isCurrentlyTestingThis
                          ? 'bg-status-success-bg text-status-success-text border border-status-success-text/30 hover:bg-status-success-bg/80'
                          : 'bg-card-header-bg hover:bg-card-border/60 text-text-body border border-card-border hover:text-text-heading'
                      }`}
                    >
                      {testingThemeId === theme.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-link-primary" />
                      ) : isCurrentlyTestingThis ? (
                        <CheckCircle className="h-3.5 w-3.5 text-status-success-text" />
                      ) : (
                        <FlaskConical className="h-3.5 w-3.5 text-link-primary" />
                      )}
                      <span>{isCurrentlyTestingThis ? 'Testing Now' : 'Set for Test'}</span>
                    </button>

                    {/* Activate / Schedule action */}
                    {canActivate && !isActive && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveModalTheme(theme);
                        }}
                        id={`theme-activate-btn-${theme.id}`}
                        title={
                          theme.scheduledActivationAt
                            ? 'View or modify scheduled activation'
                            : 'Activate theme immediately or schedule activation'
                        }
                        className={`inline-flex items-center space-x-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                          theme.scheduledActivationAt
                            ? 'bg-status-info-bg text-status-info-text border border-status-info-text/30 hover:bg-status-info-bg/80'
                            : 'bg-link-primary text-btn-primary-text hover:bg-btn-primary-hover shadow-2xs'
                        }`}
                      >
                        {theme.scheduledActivationAt ? (
                          <>
                            <CalendarClock className="h-3.5 w-3.5" />
                            <span>Scheduled</span>
                          </>
                        ) : (
                          <>
                            <Zap className="h-3.5 w-3.5" />
                            <span>Activate</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center space-x-1 text-xs font-semibold text-link-primary hover:underline">
                    <span>{isReadOnly ? 'View Theme' : 'Edit Theme'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
        </>
      )}

      {/* Create Theme Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-overlay backdrop-blur-xs"
            id="create-theme-modal-backdrop"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg rounded-2xl border border-card-border bg-card-bg shadow-xl overflow-hidden"
              id="create-theme-modal"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-card-border">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-status-info-bg text-link-primary">
                    <Palette className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-heading font-sans">Create New Theme</h3>
                    <p className="text-xs text-text-muted font-sans">
                      Clone an existing template into a new editable draft.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-card-header-bg transition-colors"
                  id="close-create-theme-modal-btn"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body / Form */}
              <form onSubmit={handleCreateTheme} className="p-6 space-y-5">
                {createError && (
                  <div className="flex items-center space-x-2 p-3 rounded-xl bg-status-error-bg text-status-error-text text-xs border border-status-error-text/20">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{createError}</span>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="new-theme-name"
                    className="block text-sm font-semibold text-text-heading font-sans mb-1.5"
                  >
                    Theme Name <span className="text-status-error-text">*</span>
                  </label>
                  <input
                    id="new-theme-name"
                    type="text"
                    required
                    autoFocus
                    value={newThemeName}
                    onChange={(e) => setNewThemeName(e.target.value)}
                    placeholder="e.g. Modern Dark, High Contrast"
                    className="w-full rounded-xl border border-input-border bg-card-bg px-3.5 py-2.5 text-sm text-text-heading shadow-sm transition-colors focus:border-input-border-focus focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="template-theme-select"
                    className="block text-sm font-semibold text-text-heading font-sans mb-1.5"
                  >
                    Template / Source Theme <span className="text-status-error-text">*</span>
                  </label>
                  <select
                    id="template-theme-select"
                    value={sourceThemeId}
                    onChange={(e) => setSourceThemeId(e.target.value)}
                    className="w-full rounded-xl border border-input-border bg-card-bg px-3.5 py-2.5 text-sm text-text-heading shadow-sm transition-colors focus:border-input-border-focus focus:outline-none"
                  >
                    {themes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.status}
                        {t.isSmartCookieDefault ? ' - System Default' : ''})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-text-muted font-sans">
                    The new theme will inherit all color tokens, fonts, and base sizing as a snapshot copy.
                  </p>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-card-border">
                  <button
                    type="button"
                    disabled={creating}
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-xl border border-card-border bg-card-bg px-4 py-2 text-sm font-semibold text-text-heading shadow-sm hover:bg-card-header-bg transition-colors"
                    id="cancel-create-theme-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="inline-flex items-center space-x-2 rounded-xl bg-link-primary px-4 py-2 text-sm font-semibold text-btn-primary-text shadow-sm hover:bg-btn-primary-hover transition-colors disabled:opacity-60"
                    id="submit-create-theme-btn"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        <span>Create & Edit</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lock Conflict Modal */}
      <AnimatePresence>
        {lockConflictModal?.open && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-overlay backdrop-blur-xs"
            id="lock-conflict-modal-backdrop"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md rounded-2xl border border-card-border bg-card-bg p-6 shadow-2xl"
              id="lock-conflict-modal"
            >
              <div className="flex items-center space-x-3 text-status-warning-text mb-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-status-warning-bg">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-heading font-sans">Theme Locked</h3>
                  <p className="text-xs text-text-muted font-sans">Active lock in place</p>
                </div>
              </div>

              <p className="text-sm text-text-body font-sans leading-relaxed my-4">
                {lockConflictModal.message}
              </p>

              <div className="flex justify-end pt-3 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setLockConflictModal(null)}
                  id="lock-conflict-close-btn"
                  className="rounded-xl bg-link-primary hover:bg-link-hover text-btn-primary-text px-4 py-2 text-xs font-semibold shadow-xs cursor-pointer"
                >
                  Understood
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Activate / Schedule Theme Modal */}
      <AnimatePresence>
        {activeModalTheme && (
          <ActivateScheduleModal
            theme={activeModalTheme}
            currentActiveTheme={currentActiveTheme}
            existingScheduledTheme={existingScheduledTheme}
            onClose={() => setActiveModalTheme(null)}
            onSuccess={async () => {
              await fetchThemes();
              await refetchRuntimeTheme();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
