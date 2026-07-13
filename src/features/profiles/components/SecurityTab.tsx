import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  Mail,
  Shield,
  CheckCircle,
  AlertCircle,
  Loader2,
  Clock,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../../shared/components/AppGate';

export function SecurityTab() {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Change Password States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);

  // Change Email States
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);

    if (!currentPassword) {
      setPwdError('Current password is required.');
      return;
    }
    if (!newPassword) {
      setPwdError('New password is required.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwdError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPwdError('Password must be at least 8 characters long.');
      return;
    }

    setPwdLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to change password.');
      }

      setPwdSuccess('Your password has been changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setPwdError(err.message || 'An error occurred.');
    } finally {
      setPwdLoading(false);
    }
  };

  const handleEmailChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);

    const emailToSubmit = newEmail.trim().toLowerCase();
    if (!emailToSubmit) {
      setEmailError('New email address is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToSubmit)) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    if (user?.recoveryEmail && emailToSubmit === user.recoveryEmail.toLowerCase()) {
      setEmailError('New email cannot be the same as your current email.');
      return;
    }

    setEmailLoading(true);

    try {
      const res = await fetch('/api/auth/change-email/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newEmail: emailToSubmit }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate email change.');
      }

      setPendingEmail(emailToSubmit);
      setNewEmail('');
    } catch (err: any) {
      setEmailError(err.message || 'An error occurred.');
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="space-y-8" id="security-tab-container">
      {/* Change Password Section */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 md:p-8 shadow-sm space-y-6" id="change-password-section">
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">{t('profile.security.changePasswordTitle')}</h3>
            <p className="text-xs text-slate-500">
              {t('profile.security.changePasswordDesc')}
            </p>
          </div>
        </div>

        <AnimatePresence>
          {pwdSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center space-x-2.5 rounded-xl bg-green-50 border border-green-100 p-4 text-sm text-green-700"
              id="password-success-alert"
            >
              <CheckCircle className="h-4 w-4 shrink-0 text-green-600" />
              <span>{pwdSuccess}</span>
            </motion.div>
          )}

          {pwdError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center space-x-2.5 rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-700"
              id="password-error-alert"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{pwdError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-lg" id="password-change-form">
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700" htmlFor="current-password-input">
              {t('profile.security.currentPassword')}
            </label>
            <input
              id="current-password-input"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm shadow-sm transition-all outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
              placeholder={t('profile.security.currentPasswordPlaceholder')}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700" htmlFor="new-password-input">
              {t('profile.security.newPassword')}
            </label>
            <input
              id="new-password-input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm shadow-sm transition-all outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
              placeholder={t('profile.security.newPasswordPlaceholder')}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700" htmlFor="confirm-new-password-input">
              {t('profile.security.confirmNewPassword')}
            </label>
            <input
              id="confirm-new-password-input"
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm shadow-sm transition-all outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
              placeholder={t('profile.security.confirmNewPasswordPlaceholder')}
              required
            />
          </div>

          <div className="pt-2 flex items-center">
            <button
              type="submit"
              disabled={pwdLoading}
              className="flex items-center justify-center space-x-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm shadow-blue-600/10"
              id="password-submit-btn"
            >
              {pwdLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t('profile.security.updatingPasswordBtn')}</span>
                </>
              ) : (
                <span>{t('profile.security.updatePasswordBtn')}</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Change Email Section */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 md:p-8 shadow-sm space-y-6" id="change-email-section">
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
          <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">{t('profile.security.changeEmailTitle')}</h3>
            <p className="text-xs text-slate-500">
              {t('profile.security.changeEmailDesc')}
            </p>
          </div>
        </div>

        <AnimatePresence>
          {emailError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center space-x-2.5 rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-700"
              id="email-error-alert"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{emailError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {!pendingEmail ? (
          <form onSubmit={handleEmailChangeRequest} className="space-y-4 max-w-lg" id="email-change-form">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700" htmlFor="new-email-input">
                {t('profile.security.newEmail')}
              </label>
              <input
                id="new-email-input"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm shadow-sm transition-all outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                placeholder={t('profile.security.newEmailPlaceholder')}
                required
              />
            </div>

            <div className="pt-2 flex items-center">
              <button
                type="submit"
                disabled={emailLoading}
                className="flex items-center justify-center space-x-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm shadow-indigo-600/10"
                id="email-submit-btn"
              >
                {emailLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t('profile.security.sendingRequestBtn')}</span>
                  </>
                ) : (
                  <span>{t('profile.security.sendVerificationBtn')}</span>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-5 space-y-4 max-w-lg" id="email-pending-state">
            <div className="flex items-start space-x-3">
              <Clock className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5 animate-pulse" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">{t('profile.security.verificationPendingTitle')}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {t('profile.security.verificationPendingDesc', { email: pendingEmail })}
                </p>
                <p className="text-xs text-slate-500 italic mt-1">
                  {t('profile.security.verificationPendingExpiry')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-indigo-100/60">
              <button
                type="button"
                onClick={() => setPendingEmail(null)}
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                id="cancel-email-change-btn"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>{t('profile.security.cancelEmailChange')}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MFA (Multi-Factor Authentication) Section - deferred honestly */}
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-6 md:p-8 shadow-sm space-y-4" id="mfa-section">
        <div className="flex items-center space-x-3">
          <div className="rounded-xl bg-slate-100 p-2.5 text-slate-500">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">{t('profile.security.mfaTitle')}</h3>
            <p className="text-xs text-slate-500">
              {t('profile.security.mfaDesc')}
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200/60 bg-white p-4 text-xs text-slate-600 flex items-center space-x-2.5 max-w-lg" id="mfa-alert">
          <AlertCircle className="h-4 w-4 text-slate-400 shrink-0" />
          <span>{t('profile.security.mfaUnavailable')}</span>
        </div>
      </div>
    </div>
  );
}
