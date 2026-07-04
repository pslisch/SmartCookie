import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { UserPlus, Building2, AlertCircle, Loader2, Sparkles, ShieldCheck } from 'lucide-react';

interface SetupWizardProps {
  step: 'superuser' | 'company' | 'role-templates';
  onSuperuserSubmit: (username: string, password: string, recoveryEmail: string) => Promise<void>;
  onCompanySubmit: (name: string, contactInfo: string) => Promise<void>;
  onRoleTemplatesSubmit: (selectedNames: string[]) => Promise<void>;
}

export function SetupWizard({ step, onSuperuserSubmit, onCompanySubmit, onRoleTemplatesSubmit }: SetupWizardProps) {
  const { t } = useTranslation();

  // Superuser Form State
  const [suUsername, setSuUsername] = useState('');
  const [suPassword, setSuPassword] = useState('');
  const [suRecoveryEmail, setSuRecoveryEmail] = useState('');
  const [suLoading, setSuLoading] = useState(false);
  const [suError, setSuError] = useState('');

  // Company Form State
  const [coName, setCoName] = useState('');
  const [coContactInfo, setCoContactInfo] = useState('');
  const [coLoading, setCoLoading] = useState(false);
  const [coError, setCoError] = useState('');

  const handleSuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuError('');

    if (!suUsername.trim() || !suPassword || !suRecoveryEmail.trim()) {
      setSuError(t('setup.errors.fieldsRequired'));
      return;
    }

    setSuLoading(true);
    try {
      await onSuperuserSubmit(suUsername.trim(), suPassword, suRecoveryEmail.trim());
    } catch (err: any) {
      setSuError(err.message || t('setup.errors.unexpected'));
    } finally {
      setSuLoading(false);
    }
  };

  const handleCoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCoError('');

    if (!coName.trim() || !coContactInfo.trim()) {
      setCoError(t('setup.errors.fieldsRequired'));
      return;
    }

    setCoLoading(true);
    try {
      await onCompanySubmit(coName.trim(), coContactInfo.trim());
    } catch (err: any) {
      setCoError(err.message || t('setup.errors.unexpected'));
    } finally {
      setCoLoading(false);
    }
  };

  // Role Templates State
  const defaultTemplates = ['LMS Manager', 'Content Creator', 'User Manager', 'Service Desk', 'Learner'];
  const [checkedTemplates, setCheckedTemplates] = useState<Record<string, boolean>>({
    'LMS Manager': true,
    'Content Creator': true,
    'User Manager': true,
    'Service Desk': true,
    'Learner': true,
  });
  const [rtLoading, setRtLoading] = useState(false);
  const [rtError, setRtError] = useState('');

  const toggleTemplate = (name: string) => {
    setCheckedTemplates((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const handleRtSubmit = async (e: React.FormEvent | null, skip = false) => {
    if (e) {
      e.preventDefault();
    }
    setRtError('');
    setRtLoading(true);

    try {
      const selectedNames = skip
        ? []
        : defaultTemplates.filter((name) => checkedTemplates[name]);
      await onRoleTemplatesSubmit(selectedNames);
    } catch (err: any) {
      setRtError(err.message || t('setup.errors.unexpected'));
    } finally {
      setRtLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 sm:p-6 md:p-8" id="setup-wizard-container">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="mb-8 text-center" id="setup-wizard-header">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white font-extrabold text-2xl shadow-sm mb-3">
            S
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('setup.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('setup.subtitle')}</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
          id="setup-wizard-card"
        >
          {step === 'superuser' ? (
            <div id="setup-step-superuser">
              <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-2">
                  <UserPlus className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-bold text-slate-900 uppercase tracking-wider">{t('setup.step1')}</span>
                </div>
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                  {t('setup.superuserRequired')}
                </span>
              </div>

              <h2 className="text-lg font-bold text-slate-900">{t('setup.createPrimaryAdmin')}</h2>
              <p className="text-sm text-slate-500 mt-1 mb-6">
                {t('setup.adminDesc')}
              </p>

              {suError && (
                <div className="mb-4 flex items-start space-x-2 rounded-lg bg-rose-50 p-3.5 text-sm text-rose-800 border border-rose-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <span className="font-medium">{suError}</span>
                </div>
              )}

              <form onSubmit={handleSuSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="su-username">
                    {t('setup.username')}
                  </label>
                  <input
                    type="text"
                    id="su-username"
                    required
                    value={suUsername}
                    onChange={(e) => setSuUsername(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder={t('setup.placeholders.admin')}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="su-email">
                    {t('setup.recoveryEmail')}
                  </label>
                  <input
                    type="email"
                    id="su-email"
                    required
                    value={suRecoveryEmail}
                    onChange={(e) => setSuRecoveryEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder={t('setup.placeholders.email')}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">{t('setup.recoveryEmailDesc')}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="su-password">
                    {t('setup.password')}
                  </label>
                  <input
                    type="password"
                    id="su-password"
                    required
                    value={suPassword}
                    onChange={(e) => setSuPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                  <div className="mt-2 rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-500 space-y-1">
                    <span className="font-bold block text-slate-600 mb-0.5 uppercase tracking-wider text-[10px]">{t('setup.complexity')}</span>
                    <ul className="list-disc pl-3 space-y-0.5">
                      <li>{t('setup.complexityMin')}</li>
                      <li>{t('setup.complexityCase')}</li>
                      <li>{t('setup.complexitySym')}</li>
                    </ul>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={suLoading}
                  className="w-full flex h-11 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {suLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  {t('setup.createContinue')}
                </button>
              </form>
            </div>
          ) : step === 'company' ? (
            <div id="setup-step-company">
              <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-bold text-slate-900 uppercase tracking-wider">{t('setup.step2')}</span>
                </div>
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                  {t('setup.companyConfig')}
                </span>
              </div>

              <h2 className="text-lg font-bold text-slate-900">{t('setup.setupPrimaryCompany')}</h2>
              <p className="text-sm text-slate-500 mt-1 mb-6">
                {t('setup.companyDesc')}
              </p>

              {coError && (
                <div className="mb-4 flex items-start space-x-2 rounded-lg bg-rose-50 p-3.5 text-sm text-rose-800 border border-rose-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <span className="font-medium">{coError}</span>
                </div>
              )}

              <form onSubmit={handleCoSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="co-name">
                    {t('setup.companyName')}
                  </label>
                  <input
                    type="text"
                    id="co-name"
                    required
                    value={coName}
                    onChange={(e) => setCoName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder={t('setup.placeholders.companyName')}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="co-contact">
                    {t('setup.contactInfo')}
                  </label>
                  <input
                    type="text"
                    id="co-contact"
                    required
                    value={coContactInfo}
                    onChange={(e) => setCoContactInfo(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder={t('setup.placeholders.contact')}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">{t('setup.contactInfoDesc')}</p>
                </div>

                <button
                  type="submit"
                  disabled={coLoading}
                  className="w-full flex h-11 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {coLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Building2 className="h-4 w-4 mr-2" />
                  )}
                  {t('setup.completeLaunch')}
                </button>
              </form>
            </div>
          ) : (
            <div id="setup-step-role-templates">
              <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-bold text-slate-900 uppercase tracking-wider">{t('setup.step3')}</span>
                </div>
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                  {t('setup.roleTemplates')}
                </span>
              </div>

              <h2 className="text-lg font-bold text-slate-900">{t('setup.selectTemplates')}</h2>
              <p className="text-sm text-slate-500 mt-1 mb-6">
                {t('setup.templatesDesc')}
              </p>

              {rtError && (
                <div className="mb-4 flex items-start space-x-2 rounded-lg bg-rose-50 p-3.5 text-sm text-rose-800 border border-rose-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <span className="font-medium">{rtError}</span>
                </div>
              )}

              <form onSubmit={(e) => handleRtSubmit(e, false)} className="space-y-4">
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {defaultTemplates.map((name) => (
                    <label
                      key={name}
                      className="flex items-center space-x-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={!!checkedTemplates[name]}
                        onChange={() => toggleTemplate(name)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-semibold text-slate-800">{name}</span>
                    </label>
                  ))}
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="submit"
                    disabled={rtLoading}
                    className="w-full flex h-11 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {rtLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 mr-2" />
                    )}
                    {t('setup.seedTemplatesBtn')}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRtSubmit(null, true)}
                    disabled={rtLoading}
                    className="w-full flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {t('setup.skipBtn')}
                  </button>
                </div>
              </form>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
