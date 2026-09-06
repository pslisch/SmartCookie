import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X, Loader2, ArrowRight, Type, CheckCircle } from 'lucide-react';
import { FontLibraryItem, AffectedThemeInfo } from '../types';

function getCsrfToken(): string {
  const match = document.cookie.match(/csrfToken=([^;]+)/);
  return match ? match[1] : '';
}

const FONT_GROUP_LABELS: Record<string, string> = {
  generalFontId: 'General / Body',
  general: 'General / Body',
  navFontId: 'Navigation',
  nav: 'Navigation',
  headingsFontId: 'Headings',
  headings: 'Headings',
  buttonsFontId: 'Buttons',
  buttons: 'Buttons',
  formsFontId: 'Forms',
  forms: 'Forms',
  cardsFontId: 'Cards',
  cards: 'Cards',
  linksFontId: 'Links',
  links: 'Links',
  statusFontId: 'Status',
  status: 'Status',
};

interface FontReplacementModalProps {
  isOpen: boolean;
  onClose: () => void;
  fontToDelete: FontLibraryItem | null;
  affectedThemes: AffectedThemeInfo[];
  availableFonts: FontLibraryItem[];
  onSuccess: () => void;
}

export const FontReplacementModal: React.FC<FontReplacementModalProps> = ({
  isOpen,
  onClose,
  fontToDelete,
  affectedThemes,
  availableFonts,
  onSuccess,
}) => {
  const [selectedReplacementId, setSelectedReplacementId] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Eligible replacement candidates (excluding the font being deleted)
  const candidateFonts = availableFonts.filter((f) => f.id !== fontToDelete?.id);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedReplacementId('');
      setError(null);
      setSubmitting(false);
    }
  }, [isOpen, fontToDelete]);

  if (!isOpen || !fontToDelete) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReplacementId) {
      setError('Please select a replacement font to proceed.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/fonts/${fontToDelete.id}/replace`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify({
          replacementFontId: selectedReplacementId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to replace and delete font.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('[FontReplacementModal] Replacement error:', err);
      setError(err?.message || 'An unexpected error occurred during replacement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-overlay backdrop-blur-xs overflow-y-auto"
        id="font-replacement-modal-backdrop"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-lg rounded-2xl border border-card-border bg-card-bg shadow-xl overflow-hidden my-8"
          id="font-replacement-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="font-replacement-modal-title"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-card-border">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-status-warning-bg text-status-warning-text shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3
                  className="text-lg font-bold text-text-heading font-sans"
                  id="font-replacement-modal-title"
                >
                  Font in Use — Replacement Required
                </h3>
                <p className="text-xs text-text-muted font-sans">
                  Assign a replacement font before deleting{' '}
                  <span className="font-semibold text-text-heading">
                    {fontToDelete.name || fontToDelete.familyName}
                  </span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-card-header-bg transition-colors disabled:opacity-50"
              id="close-font-replacement-modal-btn"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Warning Callout */}
            <div className="p-4 rounded-xl bg-status-warning-bg/50 border border-status-warning-text/20 text-text-body text-xs font-sans space-y-1.5">
              <p className="font-semibold text-status-warning-text">
                This font cannot be deleted directly
              </p>
              <p>
                <strong>{fontToDelete.name || fontToDelete.familyName}</strong> is currently in use
                by <strong>{affectedThemes.length}</strong> theme
                {affectedThemes.length === 1 ? '' : 's'}. Choose a replacement font below. All
                references in the affected themes will be updated atomically before this font is
                permanently deleted.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div
                className="p-3 rounded-xl bg-status-error-bg text-status-error-text text-xs border border-status-error-text/20 font-sans"
                id="font-replacement-error"
              >
                {error}
              </div>
            )}

            {/* Affected Themes List */}
            <div>
              <label className="block text-xs font-bold text-text-heading font-sans uppercase tracking-wider mb-2">
                Affected Themes ({affectedThemes.length})
              </label>
              <div
                className="max-h-44 overflow-y-auto space-y-2 rounded-xl border border-card-border bg-card-header-bg/40 p-3"
                id="affected-themes-list"
              >
                {affectedThemes.map((theme) => (
                  <div
                    key={theme.id}
                    className="p-2.5 rounded-lg border border-card-border bg-card-bg text-xs font-sans space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-text-heading">{theme.name}</span>
                      <span className="text-[11px] text-text-muted">ID: {theme.id.slice(0, 8)}...</span>
                    </div>
                    {theme.groups && theme.groups.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        <span className="text-[11px] text-text-muted">Used in:</span>
                        {theme.groups.map((group) => (
                          <span
                            key={group}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-card-header-bg border border-card-border text-text-body"
                          >
                            {FONT_GROUP_LABELS[group] || group}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Replacement Font Selector */}
            <div>
              <label
                htmlFor="replacement-font-select"
                className="block text-sm font-semibold text-text-heading font-sans mb-1.5"
              >
                Select Replacement Font <span className="text-status-error-text">*</span>
              </label>
              <div className="relative">
                <select
                  id="replacement-font-select"
                  value={selectedReplacementId}
                  onChange={(e) => setSelectedReplacementId(e.target.value)}
                  disabled={submitting}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-input-border bg-card-bg text-text-body focus:outline-none focus:border-input-border-focus transition-colors disabled:opacity-50"
                  required
                >
                  <option value="">-- Choose a replacement font --</option>
                  {candidateFonts.map((font) => (
                    <option key={font.id} value={font.id}>
                      {font.name || font.familyName} ({font.format || 'TTF'})
                      {font.isSystem ? ' [System]' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-text-muted font-sans mt-1.5">
                Every affected theme will have its matching font groups updated to this font.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-card-border">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-text-body hover:bg-card-header-bg rounded-xl border border-card-border transition-colors disabled:opacity-50"
                id="cancel-font-replacement-btn"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedReplacementId}
                className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-semibold text-btn-primary-text bg-status-error-text hover:bg-status-error-text/90 rounded-xl shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                id="confirm-font-replacement-btn"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Replacing &amp; Deleting...</span>
                  </>
                ) : (
                  <>
                    <Type className="h-4 w-4" />
                    <span>Replace &amp; Delete Font</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
