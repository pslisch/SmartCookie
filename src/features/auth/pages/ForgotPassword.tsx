import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { KeyRound, Loader2, AlertCircle, CheckCircle, Mail, ArrowLeft } from 'lucide-react';

interface ForgotPasswordProps {
  onBackToLogin: () => void;
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

export function ForgotPassword({ onBackToLogin }: ForgotPasswordProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email) {
      setError(t('forgotPassword.errors.required'));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': getCookie('csrfToken'),
        },
        body: JSON.stringify({ email }),
      });

      // No matter the status code (e.g. 200 or 429 or others), if we want to reinforce the no-enumeration rule,
      // the endpoint might return 200 with message. If the request was blocked by rate-limiting, we may show the rate limit error.
      // But for a normal 200 OK, or even if the user does not exist, we want to show the generic success message.
      const data = await res.json();
      
      if (res.status === 429) {
        throw new Error(data.error || 'Too many requests. Please try again later.');
      }

      // Always show generic success message for 200 OK to prevent user enumeration on the frontend.
      setSuccessMessage(t('forgotPassword.success'));
    } catch (err: any) {
      setError(err.message || t('forgotPassword.errors.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-app p-4 sm:p-6 md:p-8" id="auth-forgot-password-view">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="mb-8 text-center" id="forgot-password-header">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-btn-primary-bg text-text-inverse font-extrabold text-2xl shadow-sm mb-3">
            S
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-heading font-sans">
            {t('forgotPassword.title')}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {t('forgotPassword.subtitle')}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl border border-card-border bg-card-bg p-6 shadow-sm sm:p-8"
          id="forgot-password-card"
        >
          <div className="mb-6 flex items-center justify-between border-b border-card-border pb-4">
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-link-primary" />
              <span className="text-sm font-bold text-text-heading uppercase tracking-wider">{t('forgotPassword.badge')}</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-start space-x-2 rounded-lg bg-status-error-bg p-3.5 text-sm text-status-error-text border border-status-error-text/20">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-error-text" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 rounded-lg bg-status-success-bg p-4 text-sm text-status-success-text border border-status-success-text/20">
              <div className="flex items-start space-x-2">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-success-text" />
                <span className="font-medium">{successMessage}</span>
              </div>
              <button
                type="button"
                onClick={onBackToLogin}
                className="mt-4 flex items-center text-xs font-bold text-link-primary hover:text-link-hover transition-colors uppercase tracking-wider"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                {t('forgotPassword.backToLogin')}
              </button>
            </div>
          )}

          {!successMessage && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-body uppercase tracking-wider mb-1.5" htmlFor="forgot-email">
                  {t('forgotPassword.emailLabel')}
                </label>
                <input
                  type="email"
                  id="forgot-email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-input-border bg-card-bg px-3.5 py-2.5 text-sm text-text-heading transition-colors placeholder:text-text-muted focus:border-input-border-focus focus:outline-none focus:ring-1 focus:ring-input-border-focus"
                  placeholder={t('forgotPassword.emailPlaceholder')}
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
                {t('forgotPassword.button')}
              </button>

              <div className="pt-2 text-center border-t border-card-border mt-4">
                <button
                  type="button"
                  onClick={onBackToLogin}
                  className="inline-flex items-center text-xs font-bold text-text-muted hover:text-text-heading transition-colors uppercase tracking-wider"
                >
                  <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                  {t('forgotPassword.backToLogin')}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
