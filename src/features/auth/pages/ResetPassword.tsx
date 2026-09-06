import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Lock, KeyRound, Loader2, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

interface ResetPasswordProps {
  token: string;
  onSuccess: () => Promise<void>;
}

// Utility to parse cookies safely
function getCookie(name: string): string {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || '';
  }
  return '';
}

export function ResetPassword({ token, onSuccess }: ResetPasswordProps) {
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword) {
      setError(t('resetPassword.errors.required'));
      return;
    }

    if (newPassword.length < 8) {
      setError(t('resetPassword.errors.length'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('resetPassword.errors.mismatch'));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCookie('csrfToken'),
        },
        body: JSON.stringify({
          token,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t('resetPassword.errors.failed'));
      }

      setSuccess(true);
      // Wait 1.5 seconds to show success animation, then trigger automatic login redirect
      setTimeout(async () => {
        // Clear query params to clean up the URL
        const url = new URL(window.location.href);
        url.search = '';
        window.history.replaceState({}, document.title, url.pathname === '/reset-password' ? '/' : url.href);
        await onSuccess();
      }, 1500);
    } catch (err: any) {
      setError(err.message || t('resetPassword.errors.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-app p-4 sm:p-6 md:p-8" id="auth-reset-password-view">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="mb-8 text-center" id="reset-password-header">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-btn-primary-bg text-text-inverse font-extrabold text-2xl shadow-sm mb-3">
            S
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-heading font-sans">
            {t('resetPassword.title')}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {t('resetPassword.subtitle')}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl border border-card-border bg-card-bg p-6 shadow-sm sm:p-8"
          id="reset-password-card"
        >
          <div className="mb-6 flex items-center justify-between border-b border-card-border pb-4">
            <div className="flex items-center space-x-2">
              <Lock className="h-5 w-5 text-link-primary" />
              <span className="text-sm font-bold text-text-heading uppercase tracking-wider">{t('resetPassword.badge')}</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-start space-x-2 rounded-lg bg-status-error-bg p-3.5 text-sm text-status-error-text border border-status-error-text/20">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-error-text" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 flex items-start space-x-2 rounded-lg bg-status-success-bg p-3.5 text-sm text-status-success-text border border-status-success-text/20 animate-pulse">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-success-text" />
              <span className="font-medium">{t('resetPassword.success')}</span>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-body uppercase tracking-wider mb-1.5" htmlFor="reset-new-password">
                  {t('resetPassword.passwordLabel')}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="reset-new-password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-input-border bg-card-bg pl-3.5 pr-10 py-2.5 text-sm text-text-heading transition-colors placeholder:text-text-muted focus:border-input-border-focus focus:outline-none focus:ring-1 focus:ring-input-border-focus"
                    placeholder={t('resetPassword.passwordPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-text-muted hover:text-text-body"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-body uppercase tracking-wider mb-1.5" htmlFor="reset-confirm-password">
                  {t('resetPassword.confirmPasswordLabel')}
                </label>
                <input
                  type="password"
                  id="reset-confirm-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-input-border bg-card-bg px-3.5 py-2.5 text-sm text-text-heading transition-colors placeholder:text-text-muted focus:border-input-border-focus focus:outline-none focus:ring-1 focus:ring-input-border-focus"
                  placeholder={t('resetPassword.confirmPasswordPlaceholder')}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex h-11 items-center justify-center rounded-xl bg-btn-primary-bg text-sm font-semibold text-btn-primary-text shadow-sm transition-colors hover:bg-btn-primary-hover focus:outline-none focus:ring-2 focus:ring-btn-primary-bg focus:ring-offset-2 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <KeyRound className="h-4 w-4 mr-2" />
                )}
                {t('resetPassword.button')}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
