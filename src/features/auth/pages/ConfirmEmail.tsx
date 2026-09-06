import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, AlertCircle, Loader2, Mail } from 'lucide-react';

interface ConfirmEmailProps {
  token: string;
  onSuccess: () => void;
}

export function ConfirmEmail({ token, onSuccess }: ConfirmEmailProps) {
  const { t } = useTranslation();
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const performConfirmation = async () => {
      try {
        const res = await fetch('/api/auth/change-email/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to confirm email change.');
        }

        setSuccess(true);
      } catch (err: any) {
        setError(err.message || 'An error occurred while confirming your email change.');
      } finally {
        setVerifying(false);
      }
    };

    performConfirmation();
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-app p-4 sm:p-6 md:p-8" id="confirm-email-view">
      <div className="w-full max-w-md rounded-2xl border border-card-border bg-card-bg p-8 shadow-sm" id="confirm-email-card">
        <div className="mb-6 text-center" id="confirm-email-header">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-status-info-bg text-status-info-text">
            <Mail className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold text-text-heading">{t('profile.confirmEmail.title')}</h2>
          <p className="mt-1.5 text-sm text-text-muted">
            {t('profile.confirmEmail.desc')}
          </p>
        </div>

        {verifying && (
          <div className="flex flex-col items-center justify-center py-6 space-y-3" id="confirm-email-verifying-state">
            <Loader2 className="h-8 w-8 animate-spin text-link-primary" />
            <span className="text-sm font-medium text-text-body">{t('profile.confirmEmail.verifying')}</span>
          </div>
        )}

        {!verifying && success && (
          <div className="space-y-6 text-center" id="confirm-email-success-state">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-status-success-bg text-status-success-text">
              <CheckCircle className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-text-heading">{t('profile.confirmEmail.successTitle')}</h3>
              <p className="text-sm text-text-body leading-relaxed">
                {t('profile.confirmEmail.successDesc')}
              </p>
            </div>
            <button
              onClick={onSuccess}
              className="w-full rounded-xl bg-btn-primary-bg py-2.5 text-sm font-semibold text-btn-primary-text hover:bg-btn-primary-hover transition-colors shadow-sm shadow-btn-primary-bg/10"
              id="confirm-email-login-btn"
            >
              {t('profile.confirmEmail.backToLogin')}
            </button>
          </div>
        )}

        {!verifying && error && (
          <div className="space-y-6 text-center" id="confirm-email-error-state">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-status-error-bg text-status-error-text">
              <AlertCircle className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-text-heading">{t('profile.confirmEmail.failedTitle')}</h3>
              <p className="text-sm text-status-error-text font-medium">
                {error}
              </p>
              <p className="text-xs text-text-muted leading-relaxed">
                {t('profile.confirmEmail.failedDesc')}
              </p>
            </div>
            <button
              onClick={onSuccess}
              className="w-full rounded-xl bg-bg-subtle py-2.5 text-sm font-semibold text-text-body hover:bg-card-border transition-colors"
              id="confirm-email-back-btn"
            >
              {t('profile.confirmEmail.backToLogin')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
