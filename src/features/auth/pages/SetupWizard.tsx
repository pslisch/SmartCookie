import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { 
  UserPlus, Building2, AlertCircle, Loader2, Sparkles, ShieldCheck, 
  Layers, Plus, X, ShieldAlert, Key, Clipboard, Check, ChevronRight, 
  ChevronLeft, Info, HelpCircle, Mail, Globe, Server, CheckCircle2 
} from 'lucide-react';
import QRCode from 'qrcode';
import { useAuth } from '../../../shared/components/AppGate';
import { EntraSetupSteps } from '../../identity/components/EntraSetupSteps';

interface SetupWizardProps {
  step: 'superuser' | 'superuser-mfa' | 'company' | 'mail-config' | 'identity-provider' | 'org-structure' | 'role-templates';
  onSuperuserSubmit: (username: string, password: string, recoveryEmail: string) => Promise<void>;
  onCompanySubmit: (name: string, contactInfo: string) => Promise<void>;
  onOrgStructureSubmit: (ouNames: string[]) => Promise<void>;
  onRoleTemplatesSubmit: (selectedNames: string[]) => Promise<void>;
  onMfaSubmit?: (pendingSecret: string, code: string) => Promise<{ recoveryCodes: string[] }>;
  onMailConfigSubmit?: (config: { host: string; port: number; username: string; password?: string; fromAddress: string }) => Promise<void>;
  onMailConfigSkip?: () => Promise<void>;
  onIdentityProviderSubmit?: (config: { tenantId: string; clientId: string; clientSecret: string }) => Promise<void>;
  onIdentityProviderSkip?: () => Promise<void>;
}

export function SetupWizard({ 
  step, 
  onSuperuserSubmit, 
  onCompanySubmit, 
  onOrgStructureSubmit, 
  onRoleTemplatesSubmit,
  onMfaSubmit,
  onMailConfigSubmit,
  onMailConfigSkip,
  onIdentityProviderSubmit,
  onIdentityProviderSkip
}: SetupWizardProps) {
  const { t } = useTranslation();
  const { refresh } = useAuth();

  // Superuser Form State
  const [suUsername, setSuUsername] = useState('');
  const [suPassword, setSuPassword] = useState('');
  const [suRecoveryEmail, setSuRecoveryEmail] = useState('');
  const [suLoading, setSuLoading] = useState(false);
  const [suError, setSuError] = useState('');

  // MFA Form State
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaOtpauthUrl, setMfaOtpauthUrl] = useState('');
  const [mfaQrCodeUrl, setMfaQrCodeUrl] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState('');
  const [mfaSuccessMsg, setMfaSuccessMsg] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [recoverySavedConfirmed, setRecoverySavedConfirmed] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // Company Form State
  const [coName, setCoName] = useState('');
  const [coContactInfo, setCoContactInfo] = useState('');
  const [coLoading, setCoLoading] = useState(false);
  const [coError, setCoError] = useState('');

  // Mail Config Form State
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('465');
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpFromAddress, setSmtpFromAddress] = useState('');
  const [mailConfigFieldIdx, setMailConfigFieldIdx] = useState<number>(0);
  const [mailConfigTesting, setMailConfigTesting] = useState(false);
  const [mailConfigTestSuccess, setMailConfigTestSuccess] = useState<boolean | null>(null);
  const [mailConfigError, setMailConfigError] = useState('');
  const [mailConfigSaving, setMailConfigSaving] = useState(false);

  // Org Structure Step State
  const [ouList, setOuList] = useState<string[]>(['Engineering', 'Sales', 'Human Resources', 'Operations']);
  const [newOuInput, setNewOuInput] = useState('');
  const [orgLoading, setOrgLoading] = useState(false);
  const [orgError, setOrgError] = useState('');

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

  // Fetch MFA Setup secret on enter of superuser-mfa
  useEffect(() => {
    if (step === 'superuser-mfa' && !mfaSecret) {
      setMfaLoading(true);
      fetch('/api/setup/mfa/setup')
        .then(res => res.json())
        .then(async (data) => {
          if (data.success) {
            setMfaSecret(data.secret);
            setMfaOtpauthUrl(data.otpauthUrl);
            const qrUrl = await QRCode.toDataURL(data.otpauthUrl);
            setMfaQrCodeUrl(qrUrl);
          } else {
            setMfaError(data.error || 'Failed to initialize MFA.');
          }
        })
        .catch(err => {
          setMfaError(err.message || 'Failed to fetch MFA configuration.');
        })
        .finally(() => {
          setMfaLoading(false);
        });
    }
  }, [step, mfaSecret]);

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

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError('');
    setMfaSuccessMsg('');

    if (!mfaCode.trim()) {
      setMfaError('Verification code is required.');
      return;
    }

    if (!onMfaSubmit) {
      setMfaError('MFA submission handler is not available.');
      return;
    }

    setMfaLoading(true);
    try {
      const data = await onMfaSubmit(mfaSecret, mfaCode.trim());
      if (data && data.recoveryCodes) {
        setRecoveryCodes(data.recoveryCodes);
        setMfaSuccessMsg('MFA successfully verified and enabled!');
      } else {
        setMfaError('MFA verified but no recovery codes returned.');
      }
    } catch (err: any) {
      setMfaError(err.message || 'MFA verification failed. Please check the code and try again.');
    } finally {
      setMfaLoading(false);
    }
  };

  const copyRecoveryCodes = () => {
    const text = recoveryCodes.join('\n');
    navigator.clipboard.writeText(text);
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleMfaComplete = async () => {
    if (!recoverySavedConfirmed) {
      setMfaError('Please confirm that you have saved your recovery codes before proceeding.');
      return;
    }
    setMfaLoading(true);
    try {
      await refresh();
    } catch (err: any) {
      setMfaError(err.message || 'Failed to advance setup wizard.');
    } finally {
      setMfaLoading(false);
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

  // Mail Config Form Submissions & Helpers
  const handleTestMailConfig = async () => {
    setMailConfigError('');
    setMailConfigTestSuccess(null);
    setMailConfigTesting(true);

    try {
      const response = await fetch('/api/setup/mail-config/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: smtpHost.trim(),
          port: parseInt(smtpPort, 10),
          username: smtpUsername.trim(),
          password: smtpPassword,
          fromAddress: smtpFromAddress.trim()
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setMailConfigTestSuccess(true);
      } else {
        setMailConfigTestSuccess(false);
        setMailConfigError(data.error || 'SMTP Connection test failed. Verify your server hostname and port details.');
      }
    } catch (err: any) {
      setMailConfigTestSuccess(false);
      setMailConfigError(err.message || 'SMTP Handshake error occurred during connection test.');
    } finally {
      setMailConfigTesting(false);
    }
  };

  const handleSaveMailConfig = async () => {
    setMailConfigError('');
    if (!onMailConfigSubmit) return;

    if (!smtpHost.trim() || !smtpUsername.trim() || !smtpFromAddress.trim()) {
      setMailConfigError('SMTP Host, Username, and Sender Address are required.');
      return;
    }

    setMailConfigSaving(true);
    try {
      await onMailConfigSubmit({
        host: smtpHost.trim(),
        port: parseInt(smtpPort, 10),
        username: smtpUsername.trim(),
        password: smtpPassword || undefined,
        fromAddress: smtpFromAddress.trim()
      });
    } catch (err: any) {
      setMailConfigError(err.message || 'Failed to save email configuration.');
    } finally {
      setMailConfigSaving(false);
    }
  };

  const handleSkipMailConfig = async () => {
    setMailConfigError('');
    if (!onMailConfigSkip) return;

    setMailConfigSaving(true);
    try {
      await onMailConfigSkip();
    } catch (err: any) {
      setMailConfigError(err.message || 'Failed to skip email configuration.');
    } finally {
      setMailConfigSaving(false);
    }
  };

  const handleEntraSave = async (config: { tenantId: string; clientId: string; clientSecret: string }) => {
    if (!onIdentityProviderSubmit) return;
    await onIdentityProviderSubmit(config);
  };

  const handleEntraSkip = async () => {
    if (!onIdentityProviderSkip) return;
    await onIdentityProviderSkip();
  };

  // Org Structure Step
  const addOuToList = () => {
    const trimmed = newOuInput.trim();
    if (!trimmed) return;
    if (ouList.some(item => item.toLowerCase() === trimmed.toLowerCase())) {
      setOrgError('That organizational unit is already in the list.');
      return;
    }
    setOrgError('');
    setOuList(prev => [...prev, trimmed]);
    setNewOuInput('');
  };

  const removeOuFromList = (indexToRemove: number) => {
    setOuList(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrgError('');

    if (ouList.length === 0) {
      setOrgError('Please define at least one top-level organizational unit to continue.');
      return;
    }

    setOrgLoading(true);
    try {
      await onOrgStructureSubmit(ouList);
    } catch (err: any) {
      setOrgError(err.message || t('setup.errors.unexpected'));
    } finally {
      setOrgLoading(false);
    }
  };

  // Role Templates Form
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

  const getSmtpStepProgressPercent = () => {
    return Math.min(100, Math.round(((mailConfigFieldIdx + 1) / 5) * 100));
  };

  // Dynamic Card Width Adjustment based on step type for ultimate readability
  const maxCardWidth = step === 'identity-provider' ? 'max-w-2xl' : 'max-w-md';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 sm:p-6 md:p-8" id="setup-wizard-container">
      <div className={`w-full ${maxCardWidth} transition-all duration-300`}>
        {/* Logo/Header */}
        <div className="mb-6 text-center" id="setup-wizard-header">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white font-extrabold text-xl shadow-sm mb-2">
            S
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">{t('setup.title')}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{t('setup.subtitle')}</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          id="setup-wizard-card"
        >
          {/* STEP 1: SUPERUSER CREATION */}
          {step === 'superuser' && (
            <div id="setup-step-superuser" className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <UserPlus className="h-4.5 w-4.5 text-blue-600" />
                  <span className="text-xs font-bold text-slate-950 uppercase tracking-wider">Step 1 of 7</span>
                </div>
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                  {t('setup.superuserRequired')}
                </span>
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-900">{t('setup.createPrimaryAdmin')}</h2>
                <p className="text-xs text-slate-500 mt-1">
                  {t('setup.adminDesc')}
                </p>
              </div>

              {suError && (
                <div className="flex items-start space-x-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-800 border border-rose-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <span className="font-medium">{suError}</span>
                </div>
              )}

              <form onSubmit={handleSuSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="su-username">
                    {t('setup.username')}
                  </label>
                  <input
                    type="text"
                    id="su-username"
                    required
                    value={suUsername}
                    onChange={(e) => setSuUsername(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    placeholder={t('setup.placeholders.admin')}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="su-email">
                    {t('setup.recoveryEmail')}
                  </label>
                  <input
                    type="email"
                    id="su-email"
                    required
                    value={suRecoveryEmail}
                    onChange={(e) => setSuRecoveryEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    placeholder={t('setup.placeholders.email')}
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">{t('setup.recoveryEmailDesc')}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="su-password">
                    {t('setup.password')}
                  </label>
                  <input
                    type="password"
                    id="su-password"
                    required
                    value={suPassword}
                    onChange={(e) => setSuPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    placeholder="••••••••"
                  />
                  <div className="mt-1.5 rounded-lg bg-slate-50 p-2 text-[10px] text-slate-500 space-y-0.5">
                    <span className="font-bold block text-slate-600 uppercase tracking-wider text-[9px]">{t('setup.complexity')}</span>
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
                  className="w-full flex h-10 items-center justify-center rounded-xl bg-blue-600 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
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
          )}

          {/* STEP 2: SUPERUSER MFA SETTING */}
          {step === 'superuser-mfa' && (
            <div id="setup-step-superuser-mfa" className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Key className="h-4.5 w-4.5 text-blue-600" />
                  <span className="text-xs font-bold text-slate-950 uppercase tracking-wider">Step 2 of 7</span>
                </div>
                <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                  MFA Mandatory
                </span>
              </div>

              {mfaLoading && !mfaSecret && (
                <div className="flex flex-col items-center justify-center py-8 space-y-2">
                  <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                  <p className="text-xs text-slate-500">Generating secure 2FA keys...</p>
                </div>
              )}

              {mfaError && (
                <div className="flex items-start space-x-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-800 border border-rose-100">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <span className="font-medium">{mfaError}</span>
                </div>
              )}

              {mfaSuccessMsg && (
                <div className="flex items-start space-x-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-100">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="font-medium">{mfaSuccessMsg}</span>
                </div>
              )}

              {/* Verified screen with recovery codes */}
              {recoveryCodes.length > 0 ? (
                <div className="space-y-4" id="mfa-recovery-screen">
                  <div className="rounded-xl border border-amber-100 bg-amber-50/25 p-3.5 space-y-1 text-xs">
                    <div className="flex items-center space-x-1.5 text-amber-900 font-bold">
                      <ShieldAlert className="h-4.5 w-4.5 text-amber-600" />
                      <span>WARNING: Save these recovery codes now!</span>
                    </div>
                    <p className="text-amber-700 font-medium leading-relaxed mt-1">
                      These codes allow you to sign in to your system if you lose your authenticator app. They are shown <span className="font-bold underline">ONLY ONCE</span> and will never be displayed again.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 border border-slate-100 p-3 font-mono text-xs text-slate-700">
                    {recoveryCodes.map((code, idx) => (
                      <div key={idx} className="flex justify-between items-center px-2 py-1 bg-white rounded border border-slate-150">
                        <span className="text-[10px] text-slate-400 font-sans">{idx + 1}.</span>
                        <span className="font-bold text-slate-800 select-all">{code}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={copyRecoveryCodes}
                      className="inline-flex items-center space-x-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      {copiedCodes ? <Check className="h-4 w-4 text-emerald-600" /> : <Clipboard className="h-4 w-4" />}
                      <span>{copiedCodes ? 'Copied!' : 'Copy to Clipboard'}</span>
                    </button>
                  </div>

                  <label className="flex items-start space-x-2.5 rounded-xl border border-slate-200 p-3 hover:bg-slate-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={recoverySavedConfirmed}
                      onChange={(e) => setRecoverySavedConfirmed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-semibold text-slate-700">
                      I have securely saved these 10 recovery codes and understand they cannot be shown again.
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={handleMfaComplete}
                    disabled={!recoverySavedConfirmed || mfaLoading}
                    className="w-full h-10 flex items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-all"
                  >
                    {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                    Confirm & Proceed to Company Config
                  </button>
                </div>
              ) : (
                /* Interactive QR scanning form */
                mfaSecret && (
                  <div className="space-y-4" id="mfa-verify-form">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">1. Scan QR Code</h3>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        Open your authenticator app (Google Authenticator, Microsoft Authenticator, Duo, etc.) and scan this QR code:
                      </p>
                    </div>

                    <div className="flex justify-center py-2">
                      {mfaQrCodeUrl ? (
                        <div className="p-2 border border-slate-150 rounded-2xl bg-white shadow-sm">
                          <img src={mfaQrCodeUrl} alt="MFA QR Code" className="h-36 w-36" />
                        </div>
                      ) : (
                        <div className="h-36 w-36 flex items-center justify-center border rounded-2xl bg-slate-50">
                          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 text-center">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Manual Setup Key</span>
                      <code className="text-xs font-bold text-slate-700 select-all font-mono tracking-wider">{mfaSecret}</code>
                    </div>

                    <form onSubmit={handleMfaVerify} className="space-y-3 pt-1 border-t border-slate-100">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="mfa-code">
                          2. Enter 6-Digit Authenticator Code
                        </label>
                        <input
                          type="text"
                          id="mfa-code"
                          required
                          value={mfaCode}
                          onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                          className="w-full text-center tracking-[0.25em] font-mono rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                          placeholder="000000"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={mfaLoading || mfaCode.length < 6}
                        className="w-full flex h-10 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <ShieldCheck className="h-4 w-4 mr-1.5" />}
                        Verify & Enable MFA
                      </button>
                    </form>
                  </div>
                )
              )}
            </div>
          )}

          {/* STEP 3: COMPANY SETUP */}
          {step === 'company' && (
            <div id="setup-step-company" className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-4.5 w-4.5 text-blue-600" />
                  <span className="text-xs font-bold text-slate-950 uppercase tracking-wider">Step 3 of 7</span>
                </div>
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                  {t('setup.companyConfig')}
                </span>
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-900">{t('setup.setupPrimaryCompany')}</h2>
                <p className="text-xs text-slate-500 mt-1">
                  {t('setup.companyDesc')}
                </p>
              </div>

              {coError && (
                <div className="flex items-start space-x-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-800 border border-rose-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <span className="font-medium">{coError}</span>
                </div>
              )}

              <form onSubmit={handleCoSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="co-name">
                    {t('setup.companyName')}
                  </label>
                  <input
                    type="text"
                    id="co-name"
                    required
                    value={coName}
                    onChange={(e) => setCoName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    placeholder={t('setup.placeholders.companyName')}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="co-contact">
                    {t('setup.contactInfo')}
                  </label>
                  <input
                    type="text"
                    id="co-contact"
                    required
                    value={coContactInfo}
                    onChange={(e) => setCoContactInfo(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    placeholder={t('setup.placeholders.contact')}
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">{t('setup.contactInfoDesc')}</p>
                </div>

                <button
                  type="submit"
                  disabled={coLoading}
                  className="w-full flex h-10 items-center justify-center rounded-xl bg-blue-600 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
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
          )}

          {/* STEP 4: SMTP MAIL CONFIGURATION */}
          {step === 'mail-config' && (
            <div id="setup-step-mail-config" className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4.5 w-4.5 text-blue-600" />
                  <span className="text-xs font-bold text-slate-950 uppercase tracking-wider">Step 4 of 7</span>
                </div>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                  Email Config (Skippable)
                </span>
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-900">Email SMTP Setup</h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Configure SMTP settings to enable email notifications, learner registration invitations, and administrator password resets.
                </p>
              </div>

              {mailConfigError && (
                <div className="flex items-start space-x-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-800 border border-rose-100" id="mail-config-error">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <span className="font-medium">{mailConfigError}</span>
                </div>
              )}

              {mailConfigTestSuccess && (
                <div className="flex items-start space-x-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-100" id="mail-config-success">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="font-medium">SMTP Connection validation handshake successful! You can now save your configuration.</span>
                </div>
              )}

              {/* PROGRESS BAR FOR GUIDED ENTRY */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                  <span>Guided Entry Progress</span>
                  <span>{getSmtpStepProgressPercent()}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-300" 
                    style={{ width: `${getSmtpStepProgressPercent()}%` }}
                  />
                </div>
              </div>

              {/* STEPPED FIELDS */}
              <div className="p-4 border border-slate-150 rounded-xl bg-slate-50/50 space-y-4">
                {mailConfigFieldIdx === 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
                      <Server className="h-4 w-4 text-blue-500" />
                      <span>1. SMTP Host Server</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-normal">
                      The domain or IP address of your mail transfer agent (e.g. <code className="font-mono bg-white px-1 py-0.5 border text-blue-600 text-[10px]">smtp.yourdomain.com</code> or <code className="font-mono bg-white px-1 py-0.5 border text-blue-600 text-[10px]">smtp.gmail.com</code>).
                    </p>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                      placeholder="e.g. smtp.mailu.io"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                    />
                  </div>
                )}

                {mailConfigFieldIdx === 1 && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
                      <HelpCircle className="h-4 w-4 text-blue-500" />
                      <span>2. SMTP Port</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-normal">
                      The socket port to connect over. Recommended: <code className="font-mono bg-white px-1 py-0.5 border text-blue-600 text-[10px]">465</code> for secure SSL/TLS. Use <code className="font-mono bg-white px-1 py-0.5 border text-blue-600 text-[10px]">587</code> for STARTTLS / opportunistic TLS.
                    </p>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                      placeholder="e.g. 465"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                )}

                {mailConfigFieldIdx === 2 && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
                      <UserPlus className="h-4 w-4 text-blue-500" />
                      <span>3. SMTP Username / Mailbox</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-normal">
                      The login email address or credential user ID required to authenticate with the mail server.
                    </p>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                      placeholder="e.g. mailer@yourcompany.com"
                      value={smtpUsername}
                      onChange={(e) => setSmtpUsername(e.target.value)}
                    />
                  </div>
                )}

                {mailConfigFieldIdx === 3 && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
                      <Key className="h-4 w-4 text-blue-500" />
                      <span>4. SMTP Password / App Secret</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-normal">
                      The authentication password. For Gmail or Outlook, use a dedicated, secure 16-character <span className="font-semibold">App Password</span> rather than your main account credentials.
                    </p>
                    <input
                      type="password"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                      placeholder="••••••••••••••••"
                      value={smtpPassword}
                      onChange={(e) => setSmtpPassword(e.target.value)}
                    />
                  </div>
                )}

                {mailConfigFieldIdx === 4 && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
                      <Mail className="h-4 w-4 text-blue-500" />
                      <span>5. Default From Address</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-normal">
                      The visible sender address shown to recipients (e.g. <code className="font-mono bg-white px-1 py-0.5 border text-blue-600 text-[10px]">no-reply@yourcompany.com</code>). Must be authorized on your mail server.
                    </p>
                    <input
                      type="email"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                      placeholder="e.g. training@yourcompany.com"
                      value={smtpFromAddress}
                      onChange={(e) => setSmtpFromAddress(e.target.value)}
                    />
                  </div>
                )}

                {/* STEERING CONTROLS */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={mailConfigFieldIdx === 0}
                    onClick={() => {
                      setMailConfigFieldIdx(prev => prev - 1);
                      setMailConfigTestSuccess(null);
                    }}
                    className="inline-flex items-center space-x-1 text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Back</span>
                  </button>

                  <span className="text-[10px] text-slate-400 font-bold font-mono">
                    Step {mailConfigFieldIdx + 1} of 5
                  </span>

                  {mailConfigFieldIdx < 4 ? (
                    <button
                      type="button"
                      onClick={() => setMailConfigFieldIdx(prev => prev + 1)}
                      className="inline-flex items-center space-x-1 text-xs font-bold text-blue-600 hover:text-blue-800"
                    >
                      <span>Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-emerald-600">Guided Steps Done!</span>
                  )}
                </div>
              </div>

              {/* OVERALL SMTP SUMMARY & TEST CONTROLS */}
              {mailConfigFieldIdx === 4 && (
                <div className="space-y-4 pt-2">
                  <div className="rounded-xl border border-blue-100 bg-blue-50/20 p-3.5 space-y-2">
                    <div className="flex items-center space-x-1 text-xs font-bold text-blue-900 uppercase">
                      <Info className="h-4 w-4 text-blue-600" />
                      <span>SMTP Deployment Summary</span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-xs">
                      <div><span className="text-slate-400 font-semibold">Host:</span> <span className="font-semibold text-slate-700 font-mono">{smtpHost || '(Empty)'}</span></div>
                      <div><span className="text-slate-400 font-semibold">Port:</span> <span className="font-semibold text-slate-700 font-mono">{smtpPort}</span></div>
                      <div><span className="text-slate-400 font-semibold">User:</span> <span className="font-semibold text-slate-700 font-mono text-[11px] select-all">{smtpUsername || '(Empty)'}</span></div>
                      <div><span className="text-slate-400 font-semibold">From:</span> <span className="font-semibold text-slate-700 font-mono text-[11px] select-all">{smtpFromAddress || '(Empty)'}</span></div>
                    </div>
                  </div>

                  {/* Mailu recommendation note */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1.5 text-[11px] text-slate-500 leading-relaxed">
                    <span className="font-bold text-slate-700 block">Deploying in Production?</span>
                    <p>
                      For production environments, we recommend deploying a robust, self-hosted mail solution like <a href="https://mailu.io" target="_blank" rel="noreferrer" className="text-blue-600 underline font-medium">Mailu</a>, or utilizing a dedicated transactional SMTP provider. Ensure secure ports (465/587) are used and proper SPF/DKIM DNS records are created to ensure deliverability.
                    </p>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={handleTestMailConfig}
                      disabled={mailConfigTesting || !smtpHost.trim() || !smtpUsername.trim() || !smtpFromAddress.trim()}
                      className="flex-1 inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
                    >
                      {mailConfigTesting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Server className="h-4 w-4 mr-1.5" />}
                      Test Connection
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleSaveMailConfig}
                      disabled={mailConfigSaving || !mailConfigTestSuccess}
                      className="flex-1 inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {mailConfigSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                      Save & Continue
                    </button>
                  </div>
                </div>
              )}

              {/* SKIP OPTIONS ROW */}
              <div className="pt-2 border-t border-slate-100 flex flex-col space-y-2">
                <div className="rounded-lg bg-rose-50/50 border border-rose-100 p-2.5 text-[10px] text-rose-800 leading-normal">
                  <span className="font-bold">Skipping Consequence Notice:</span> If you skip SMTP configuration now, automated user onboarding emails, compliance reminders, and password resets will fail. You can re-enable this later under System Settings.
                </div>
                <button
                  type="button"
                  onClick={handleSkipMailConfig}
                  disabled={mailConfigSaving}
                  className="w-full py-2 border border-slate-200 text-slate-500 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Skip Email Setup For Now
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: IDENTITY PROVIDER (ENTRA ID) CONFIGURATION */}
          {step === 'identity-provider' && (
            <div id="setup-step-identity-provider" className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center space-x-2">
                  <Globe className="h-4.5 w-4.5 text-blue-600" />
                  <span className="text-xs font-bold text-slate-950 uppercase tracking-wider">Step 5 of 7</span>
                </div>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                  SSO Setup (Skippable)
                </span>
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-900">Microsoft Entra ID / OIDC Integration</h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Configure Microsoft Single Sign-On and employee directory synchronization to link corporate profiles automatically.
                </p>
              </div>

              {/* Render the complex multi-part sub-flow component */}
              <EntraSetupSteps 
                onSave={handleEntraSave} 
                onSkip={handleEntraSkip} 
              />
            </div>
          )}

          {/* STEP 6: ORG STRUCTURE SETUP */}
          {step === 'org-structure' && (
            <div id="setup-step-org-structure" className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Layers className="h-4.5 w-4.5 text-blue-600" />
                  <span className="text-xs font-bold text-slate-950 uppercase tracking-wider">Step 6 of 7</span>
                </div>
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                  Org Structure
                </span>
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-900">Configure Divisions & Units</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Create top-level organizational units (e.g. Sales, HR, Engineering) to organize learners and managers.
                </p>
              </div>

              {orgError && (
                <div className="flex items-start space-x-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-800 border border-rose-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <span className="font-medium">{orgError}</span>
                </div>
              )}

              <div className="space-y-3">
                {/* Input box to add custom OUs */}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newOuInput}
                    onChange={(e) => setNewOuInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addOuToList();
                      }
                    }}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                    placeholder="e.g. Finance, Marketing, Support"
                  />
                  <button
                    type="button"
                    onClick={addOuToList}
                    className="inline-flex items-center justify-center rounded-xl bg-slate-900 hover:bg-slate-800 px-3 text-white text-[11px] font-bold transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add
                  </button>
                </div>

                {/* List of currently added OUs */}
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {ouList.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic py-3 text-center">No units added yet. Add at least one to continue.</p>
                  ) : (
                    ouList.map((name, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2"
                      >
                        <span className="text-xs font-semibold text-slate-700">{name}</span>
                        <button
                          type="button"
                          onClick={() => removeOuFromList(idx)}
                          className="text-slate-400 hover:text-rose-600 transition-colors"
                          title="Remove"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleOrgSubmit}
                  disabled={orgLoading || ouList.length === 0}
                  className="w-full flex h-10 items-center justify-center rounded-xl bg-blue-600 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50 mt-3"
                >
                  {orgLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Save & Continue
                </button>
              </div>
            </div>
          )}

          {/* STEP 7: ROLE TEMPLATES SELECTION */}
          {step === 'role-templates' && (
            <div id="setup-step-role-templates" className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="h-4.5 w-4.5 text-blue-600" />
                  <span className="text-xs font-bold text-slate-950 uppercase tracking-wider">Step 7 of 7</span>
                </div>
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                  {t('setup.roleTemplates')}
                </span>
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-900">{t('setup.selectTemplates')}</h2>
                <p className="text-xs text-slate-500 mt-1">
                  {t('setup.templatesDesc')}
                </p>
              </div>

              {rtError && (
                <div className="flex items-start space-x-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-800 border border-rose-100">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                  <span className="font-medium">{rtError}</span>
                </div>
              )}

              <form onSubmit={(e) => handleRtSubmit(e, false)} className="space-y-3.5">
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {defaultTemplates.map((name) => (
                    <label
                      key={name}
                      className="flex items-center space-x-3 rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 hover:bg-slate-100 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={!!checkedTemplates[name]}
                        onChange={() => toggleTemplate(name)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs font-semibold text-slate-800">{name}</span>
                    </label>
                  ))}
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="submit"
                    disabled={rtLoading}
                    className="w-full flex h-10 items-center justify-center rounded-xl bg-blue-600 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
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
                    className="w-full flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
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
