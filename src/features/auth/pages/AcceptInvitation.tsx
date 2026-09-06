import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Lock, KeyRound, Loader2, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

interface AcceptInvitationProps {
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

export function AcceptInvitation({ token, onSuccess }: AcceptInvitationProps) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError(t('acceptInvitation.errors.required'));
      return;
    }

    if (password.length < 8) {
      setError(t('acceptInvitation.errors.length'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('acceptInvitation.errors.mismatch'));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCookie('csrfToken'),
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t('acceptInvitation.errors.failed'));
      }

      setSuccess(true);
      setTimeout(async () => {
        // Clear query params to clean up the URL
        const url = new URL(window.location.href);
        url.search = '';
        window.history.replaceState({}, document.title, url.pathname === '/activate' ? '/' : url.href);
        await onSuccess();
      }, 1500);
    } catch (err: any) {
      setError(err.message || t('acceptInvitation.errors.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-app p-4 sm:p-6 md:p-8" id="auth-accept-invitation-view">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="mb-8 text-center" id="accept-invitation-header">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-btn-primary-bg text-text-inverse font-extrabold text-2xl shadow-sm mb-3">
            S
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-heading font-sans">
            {t('acceptInvitation.title')}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {t('acceptInvitation.subtitle')}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl border border-card-border bg-card-bg p-6 shadow-sm sm:p-8"
          id="accept-invitation-card"
        >
          <div className="mb-6 flex items-center justify-between border-b border-card-border pb-4">
            <div className="flex items-center space-x-2">
              <Lock className="h-5 w-5 text-link-primary" />
              <span className="text-sm font-bold text-text-heading uppercase tracking-wider">{t('acceptInvitation.badge')}</span>
            </div>
            <span className="inline-flex items-center rounded-full bg-status-info-bg px-2 py-1 text-xs font-semibold text-status-info-text">
              {t('acceptInvitation.badge')}
            </span>
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
              <span className="font-medium">{t('acceptInvitation.success')}</span>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-body uppercase tracking-wider mb-1.5" htmlFor="accept-password">
                  {t('acceptInvitation.passwordLabel')}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="accept-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-input-border bg-card-bg pl-3.5 pr-10 py-2.5 text-sm text-text-heading transition-colors placeholder:text-text-muted focus:border-input-border-focus focus:outline-none focus:ring-1 focus:ring-input-border-focus"
                    placeholder={t('acceptInvitation.passwordPlaceholder')}
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
                <label className="block text-xs font-bold text-text-body uppercase tracking-wider mb-1.5" htmlFor="accept-confirm-password">
                  {t('acceptInvitation.confirmPasswordLabel')}
                </label>
                <input
                  type="password"
                  id="accept-confirm-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-input-border bg-card-bg px-3.5 py-2.5 text-sm text-text-heading transition-colors placeholder:text-text-muted focus:border-input-border-focus focus:outline-none focus:ring-1 focus:ring-input-border-focus"
                  placeholder={t('acceptInvitation.confirmPasswordPlaceholder')}
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
                {t('acceptInvitation.button')}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
