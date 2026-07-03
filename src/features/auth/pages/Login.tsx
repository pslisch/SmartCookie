import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { Lock, KeyRound, Loader2, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => Promise<void>;
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

export function Login({ onLoginSuccess }: LoginProps) {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError(t('All fields are required.'));
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
          username: username.trim(),
          password: password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t('Invalid credentials.'));
      }

      // Successful login -> trigger state refresh to establish session
      await onLoginSuccess();
    } catch (err: any) {
      setError(err.message || t('Authentication failed.'));
    } finally {
      setLoading(false);
    }
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
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="login-username">
                {t('login.username')}
              </label>
              <input
                type="text"
                id="login-username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder={t('login.placeholderUser')}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="login-password">
                {t('login.password')}
              </label>
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
              className="w-full flex h-11 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <KeyRound className="h-4 w-4 mr-2" />
              )}
              {t('login.signIn')}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
