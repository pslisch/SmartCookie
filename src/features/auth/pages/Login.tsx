import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Lock, KeyRound, Loader2, AlertCircle, QrCode, ArrowLeft, ShieldAlert, Check, Copy } from 'lucide-react';
import QRCode from 'qrcode';

interface LoginProps {
  onLoginSuccess: () => Promise<void>;
  onForgotPassword?: () => void;
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

export function Login({ onLoginSuccess, onForgotPassword }: LoginProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'login' | 'mfa' | 'mfa-setup' | 'mfa-recovery-codes'>('login');
  
  // Standard credentials
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  
  // MFA challenges
  const [mfaCode, setMfaCode] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [manualSecret, setManualSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copiedCodes, setCopiedCodes] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Store the attempted route/tab from URL before user logs in
  useEffect(() => {
    // Capture attempted tab from URL hash or query params
    const hash = window.location.hash.replace('#', '');
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    const attempted = hash || tabParam;

    if (attempted && (attempted === 'catalog' || attempted === 'my-lessons')) {
      localStorage.setItem('attemptedTab', attempted);
    }
  }, []);

  // Generate QR code data URL when otpauthUrl is set
  useEffect(() => {
    if (otpauthUrl) {
      QRCode.toDataURL(otpauthUrl)
        .then((url) => setQrCodeUrl(url))
        .catch((err) => console.error('Failed to generate QR code', err));
    }
  }, [otpauthUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'login') {
      if (!identifier.trim() || !password) {
        setError(t('login.errors.fieldsRequired'));
        return;
      }

      setLoading(true);
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': getCookie('csrfToken'),
          },
          body: JSON.stringify({
            identifier: identifier.trim(),
            username: identifier.trim(),
            password: password,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || t('login.errors.invalidCredentials'));
        }

        if (data.mfaRequired) {
          setChallengeToken(data.challengeToken);
          setMode('mfa');
          setMfaCode('');
        } else if (data.mfaSetupRequired) {
          setSetupToken(data.setupToken);
          // Fetch the pending setup information
          const setupPendingRes = await fetch('/api/auth/mfa/setup-pending', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': getCookie('csrfToken'),
            },
            body: JSON.stringify({ setupToken: data.setupToken }),
          });
          const setupPendingData = await setupPendingRes.json();
          if (!setupPendingRes.ok) {
            throw new Error(setupPendingData.error || 'Failed to initiate MFA setup.');
          }
          setOtpauthUrl(setupPendingData.otpauthUrl);
          setManualSecret(setupPendingData.secret);
          setMode('mfa-setup');
          setMfaCode('');
        } else {
          // Normal successful login -> trigger state refresh to establish session
          await onLoginSuccess();
        }
      } catch (err: any) {
        setError(err.message || t('login.errors.authenticationFailed'));
      } finally {
        setLoading(false);
      }
    } else if (mode === 'mfa') {
      if (!mfaCode.trim()) {
        setError(t('login.errors.fieldsRequired'));
        return;
      }

      setLoading(true);
      try {
        const res = await fetch('/api/auth/mfa/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': getCookie('csrfToken'),
          },
          body: JSON.stringify({
            challengeToken,
            code: mfaCode.trim(),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || t('login.errors.invalidMfa'));
        }

        // Successfully logged in via MFA
        await onLoginSuccess();
      } catch (err: any) {
        setError(err.message || t('login.errors.authenticationFailed'));
      } finally {
        setLoading(false);
      }
    } else if (mode === 'mfa-setup') {
      if (!mfaCode.trim()) {
        setError(t('login.errors.fieldsRequired'));
        return;
      }

      setLoading(true);
      try {
        const res = await fetch('/api/auth/mfa/enable-pending', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': getCookie('csrfToken'),
          },
          body: JSON.stringify({
            setupToken,
            pendingSecret: manualSecret,
            code: mfaCode.trim(),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || t('login.errors.invalidMfa'));
        }

        // Successfully enabled MFA. Save recovery codes and show them to the user.
        setRecoveryCodes(data.recoveryCodes || []);
        setMode('mfa-recovery-codes');
      } catch (err: any) {
        setError(err.message || t('login.errors.authenticationFailed'));
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCopyCodes = () => {
    const textToCopy = recoveryCodes.join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleResetMode = () => {
    setMode('login');
    setMfaCode('');
    setError('');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 sm:p-6 md:p-8" id="auth-login-view">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="mb-8 text-center" id="login-header">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-extrabold text-2xl shadow-sm mb-3">
            S
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-sans">{t('login.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('login.subtitle')}</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
          id="login-card"
        >
          {mode === 'login' && (
            <>
              <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-2">
                  <Lock className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-bold text-slate-900 uppercase tracking-wider">{t('login.secureAccess')}</span>
                </div>
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                  {t('login.required')}
                </span>
              </div>

              {error && (
                <div className="mb-4 flex items-start space-x-2 rounded-lg bg-rose-50 p-3.5 text-sm text-rose-800 border border-rose-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="login-identifier">
                    {t('login.identifier')}
                  </label>
                  <input
                    type="text"
                    id="login-identifier"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder={t('login.placeholderIdentifier')}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider" htmlFor="login-password">
                      {t('login.password')}
                    </label>
                    {onForgotPassword && (
                      <button
                        type="button"
                        onClick={onForgotPassword}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        {t('login.forgotPassword')}
                      </button>
                    )}
                  </div>
                  <input
                    type="password"
                    id="login-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder={t('login.placeholderPass')}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex h-11 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <KeyRound className="h-4 w-4 mr-2" />
                  )}
                  {t('login.signIn')}
                </button>
              </form>
            </>
          )}

          {mode === 'mfa' && (
            <>
              <div className="mb-4 flex items-center space-x-2 border-b border-slate-100 pb-3">
                <button
                  type="button"
                  onClick={handleResetMode}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center space-x-2">
                  <QrCode className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-bold text-slate-900 uppercase tracking-wider">{t('login.mfaTitle')}</span>
                </div>
              </div>

              <p className="text-sm text-slate-500 mb-6">{t('login.mfaSubtitle')}</p>

              {error && (
                <div className="mb-4 flex items-start space-x-2 rounded-lg bg-rose-50 p-3.5 text-sm text-rose-800 border border-rose-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="mfa-code">
                    {t('login.mfaCode')}
                  </label>
                  <input
                    type="text"
                    id="mfa-code"
                    required
                    maxLength={10}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    className="w-full text-center tracking-widest text-lg font-bold rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder={t('login.placeholderMfa')}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex h-11 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  {t('login.mfaVerify')}
                </button>

                <button
                  type="button"
                  onClick={handleResetMode}
                  className="w-full text-center text-xs text-slate-500 hover:text-slate-800 font-semibold transition-colors mt-2"
                >
                  {t('login.backToLogin')}
                </button>
              </form>
            </>
          )}

          {mode === 'mfa-setup' && (
            <>
              <div className="mb-4 flex items-center space-x-2 border-b border-slate-100 pb-3">
                <button
                  type="button"
                  onClick={handleResetMode}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center space-x-2">
                  <QrCode className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-bold text-slate-900 uppercase tracking-wider">{t('login.mfaSetupTitle')}</span>
                </div>
              </div>

              <p className="text-sm text-slate-500 mb-4 leading-relaxed">{t('login.mfaSetupSubtitle')}</p>

              {qrCodeUrl ? (
                <div className="flex flex-col items-center justify-center bg-slate-50 rounded-xl p-4 border border-slate-100 mb-4">
                  <img src={qrCodeUrl} alt="MFA QR Code" className="h-44 w-44 object-contain shadow-sm rounded-lg bg-white p-2" />
                  <div className="mt-3 text-center w-full">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('login.mfaSetupSecret')}</span>
                    <code className="text-xs font-mono font-bold text-slate-700 bg-slate-200/60 px-2 py-1 rounded select-all break-all">{manualSecret}</code>
                  </div>
                </div>
              ) : (
                <div className="flex h-44 items-center justify-center bg-slate-50 rounded-xl mb-4 border border-slate-100">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              )}

              {error && (
                <div className="mb-4 flex items-start space-x-2 rounded-lg bg-rose-50 p-3.5 text-sm text-rose-800 border border-rose-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="mfa-setup-code">
                    {t('login.mfaCode')}
                  </label>
                  <input
                    type="text"
                    id="mfa-setup-code"
                    required
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    className="w-full text-center tracking-widest text-lg font-bold rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder={t('login.placeholderMfa')}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex h-11 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  {t('login.mfaSetupVerify')}
                </button>

                <button
                  type="button"
                  onClick={handleResetMode}
                  className="w-full text-center text-xs text-slate-500 hover:text-slate-800 font-semibold transition-colors mt-2"
                >
                  {t('login.backToLogin')}
                </button>
              </form>
            </>
          )}

          {mode === 'mfa-recovery-codes' && (
            <>
              <div className="mb-4 flex items-center space-x-2 border-b border-slate-100 pb-3">
                <ShieldAlert className="h-5 w-5 text-amber-500 animate-pulse" />
                <span className="text-sm font-bold text-slate-900 uppercase tracking-wider">{t('login.mfaRecoveryTitle')}</span>
              </div>

              <p className="text-sm text-slate-500 mb-4 leading-relaxed">{t('login.mfaRecoverySubtitle')}</p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 font-mono text-sm font-semibold text-slate-800">
                <div className="grid grid-cols-2 gap-2 text-center">
                  {recoveryCodes.map((code, index) => (
                    <div key={index} className="bg-white border border-slate-100 rounded p-1 shadow-sm select-all">
                      {code}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleCopyCodes}
                  className="mt-4 flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
                >
                  {copiedCodes ? (
                    <>
                      <Check className="h-4 w-4 text-green-600 mr-1.5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1.5 text-slate-500" />
                      Copy All Codes
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={async () => {
                  await onLoginSuccess();
                }}
                className="w-full flex h-11 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
              >
                {t('login.mfaRecoveryButton')}
              </button>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}

