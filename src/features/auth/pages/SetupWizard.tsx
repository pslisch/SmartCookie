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

  // CSRF token helper
  const getCsrfToken = () => {
    const match = document.cookie.match(/csrfToken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  };

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
      setMfaError(t('setupWizard.mfa.errors.codeRequired'));
      return;
    }

    if (!onMfaSubmit) {
      setMfaError(t('setupWizard.mfa.errors.handlerUnavailable'));
      return;
    }

    setMfaLoading(true);
    try {
      const data = await onMfaSubmit(mfaSecret, mfaCode.trim());
      if (data && data.recoveryCodes) {
        setRecoveryCodes(data.recoveryCodes);
        setMfaSuccessMsg(t('setupWizard.mfa.verifySuccess'));
      } else {
        setMfaError(t('setupWizard.mfa.errors.noCodes'));
      }
    } catch (err: any) {
      setMfaError(err.message || t('setupWizard.mfa.errors.verificationFailed'));
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
      setMfaError(t('setupWizard.mfa.errors.confirmSavedRequired'));
      return;
    }
    setMfaLoading(true);
    try {
      await refresh();
    } catch (err: any) {
      setMfaError(err.message || t('setupWizard.mfa.errors.failedToAdvance'));
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
          'X-XSRF-TOKEN': getCsrfToken()
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
      setOrgError(t('setupWizard.org.errors.alreadyExists'));
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
      setOrgError(t('setupWizard.org.errors.atLeastOneRequired'));
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
    <div className="flex min-h-screen items-center justify-center bg-bg-app p-4 sm:p-6 md:p-8" id="setup-wizard-container">
      <div className={`w-full ${maxCardWidth} transition-all duration-300`}>
        {/* Logo/Header */}
        <div className="mb-6 text-center" id="setup-wizard-header">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-btn-primary-bg text-text-inverse font-extrabold text-xl shadow-sm mb-2">
            S
          </div>
          <h1 className="text-xl font-bold tracking-tight text-text-heading">{t('setup.title')}</h1>
          <p className="text-xs text-text-muted mt-0.5">{t('setup.subtitle')}</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl border border-card-border bg-card-bg p-5 shadow-sm sm:p-6"
          id="setup-wizard-card"
        >
          {/* STEP 1: SUPERUSER CREATION */}
          {step === 'superuser' && (
            <div id="setup-step-superuser" className="space-y-4">
              <div className="flex items-center justify-between border-b border-card-border pb-3">
                <div className="flex items-center space-x-2">
                  <UserPlus className="h-4.5 w-4.5 text-link-primary" />
                  <span className="text-xs font-bold text-text-heading uppercase tracking-wider">Step 1 of 7</span>
                </div>
                <span className="inline-flex items-center rounded-full bg-status-info-bg px-2 py-0.5 text-[10px] font-bold text-status-info-text">
                  {t('setup.superuserRequired')}
                </span>
              </div>

              <div>
                <h2 className="text-base font-bold text-text-heading">{t('setup.createPrimaryAdmin')}</h2>
                <p className="text-xs text-text-muted mt-1">
                  {t('setup.adminDesc')}
                </p>
              </div>

              {suError && (
                <div className="flex items-start space-x-2 rounded-xl bg-status-error-bg p-3 text-xs text-status-error-text border border-status-error-text/20">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-error-text" />
                  <span className="font-medium">{suError}</span>
                </div>
              )}

              <form onSubmit={handleSuSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-text-body uppercase tracking-wider mb-1" htmlFor="su-username">
                    {t('setup.username')}
                  </label>
                  <input
                    type="text"
                    id="su-username"
                    required
                    value={suUsername}
                    onChange={(e) => setSuUsername(e.target.value)}
                    className="w-full rounded-xl border border-input-border bg-card-bg px-3 py-2 text-xs text-text-heading focus:border-input-border-focus focus:outline-none"
                    placeholder={t('setup.placeholders.admin')}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-body uppercase tracking-wider mb-1" htmlFor="su-email">
                    {t('setup.recoveryEmail')}
                  </label>
                  <input
                    type="email"
                    id="su-email"
                    required
                    value={suRecoveryEmail}
                    onChange={(e) => setSuRecoveryEmail(e.target.value)}
                    className="w-full rounded-xl border border-input-border bg-card-bg px-3 py-2 text-xs text-text-heading focus:border-input-border-focus focus:outline-none"
                    placeholder={t('setup.placeholders.email')}
                  />
                  <p className="text-[10px] text-text-muted mt-0.5">{t('setup.recoveryEmailDesc')}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-body uppercase tracking-wider mb-1" htmlFor="su-password">
                    {t('setup.password')}
                  </label>
                  <input
                    type="password"
                    id="su-password"
                    required
                    value={suPassword}
                    onChange={(e) => setSuPassword(e.target.value)}
                    className="w-full rounded-xl border border-input-border bg-card-bg px-3 py-2 text-xs text-text-heading focus:border-input-border-focus focus:outline-none"
                    placeholder="••••••••"
                  />
                  <div className="mt-1.5 rounded-lg bg-bg-subtle p-2 text-[10px] text-text-muted space-y-0.5">
                    <span className="font-bold block text-text-body uppercase tracking-wider text-[9px]">{t('setup.complexity')}</span>
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
                  className="w-full flex h-10 items-center justify-center rounded-xl bg-btn-primary-bg text-xs font-semibold text-btn-primary-text shadow-sm hover:bg-btn-primary-hover transition-colors disabled:opacity-50"
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
              <div className="flex items-center justify-between border-b border-card-border pb-3">
                <div className="flex items-center space-x-2">
                  <Key className="h-4.5 w-4.5 text-link-primary" />
                  <span className="text-xs font-bold text-text-heading uppercase tracking-wider">{t('setupWizard.mfa.stepHeader')}</span>
                </div>
                <span className="inline-flex items-center rounded-full bg-status-error-bg px-2 py-0.5 text-[10px] font-bold text-status-error-text">
                  {t('setupWizard.mfa.mandatoryBadge')}
                </span>
              </div>

              {mfaLoading && !mfaSecret && (
                <div className="flex flex-col items-center justify-center py-8 space-y-2">
                  <Loader2 className="h-6 w-6 text-link-primary animate-spin" />
                  <p className="text-xs text-text-muted">{t('setupWizard.mfa.generatingKeys')}</p>
                </div>
              )}

              {mfaError && (
                <div className="flex items-start space-x-2 rounded-xl bg-status-error-bg p-3 text-xs text-status-error-text border border-status-error-text/20">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-status-error-text" />
                  <span className="font-medium">{mfaError}</span>
                </div>
              )}

              {mfaSuccessMsg && (
                <div className="flex items-start space-x-2 rounded-xl bg-status-success-bg p-3 text-xs text-status-success-text border border-status-success-text/20">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-success-text" />
                  <span className="font-medium">{mfaSuccessMsg}</span>
                </div>
              )}

              {/* Verified screen with recovery codes */}
              {recoveryCodes.length > 0 ? (
                <div className="space-y-4" id="mfa-recovery-screen">
                  <div className="rounded-xl border border-status-warning-text/20 bg-status-warning-bg/25 p-3.5 space-y-1 text-xs">
                    <div className="flex items-center space-x-1.5 text-status-warning-text font-bold">
                      <ShieldAlert className="h-4.5 w-4.5 text-status-warning-text" />
                      <span>{t('setupWizard.mfa.recoveryWarningTitle')}</span>
                    </div>
                    <p className="text-status-warning-text font-medium leading-relaxed mt-1">
                      {t('setupWizard.mfa.recoveryWarningDesc')}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-bg-subtle border border-card-border p-3 font-mono text-xs text-text-body">
                    {recoveryCodes.map((code, idx) => (
                      <div key={idx} className="flex justify-between items-center px-2 py-1 bg-card-bg rounded border border-card-border">
                        <span className="text-[10px] text-text-muted font-sans">{idx + 1}.</span>
                        <span className="font-bold text-text-heading select-all">{code}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={copyRecoveryCodes}
                      className="inline-flex items-center space-x-1.5 text-xs font-bold text-link-primary hover:text-link-hover transition-colors"
                    >
                      {copiedCodes ? <Check className="h-4 w-4 text-status-success-text" /> : <Clipboard className="h-4 w-4" />}
                      <span>{copiedCodes ? t('setupWizard.mfa.copied') : t('setupWizard.mfa.copyToClipboard')}</span>
                    </button>
                  </div>

                  <label className="flex items-start space-x-2.5 rounded-xl border border-card-border p-3 hover:bg-bg-subtle cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={recoverySavedConfirmed}
                      onChange={(e) => setRecoverySavedConfirmed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-input-border text-link-primary focus:ring-input-border-focus"
                    />
                    <span className="text-xs font-semibold text-text-body">
                      {t('setupWizard.mfa.checkboxLabel')}
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={handleMfaComplete}
                    disabled={!recoverySavedConfirmed || mfaLoading}
                    className="w-full h-10 flex items-center justify-center rounded-xl bg-btn-primary-bg text-xs font-bold text-btn-primary-text shadow-sm hover:bg-btn-primary-hover disabled:opacity-50 transition-all"
                  >
                    {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                    {t('setupWizard.mfa.confirmBtn')}
                  </button>
                </div>
              ) : (
                /* Interactive QR scanning form */
                mfaSecret && (
                  <div className="space-y-4" id="mfa-verify-form">
                    <div>
                      <h3 className="text-xs font-bold text-text-heading uppercase tracking-wide">{t('setupWizard.mfa.scanQrTitle')}</h3>
                      <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                        {t('setupWizard.mfa.scanQrDesc')}
                      </p>
                    </div>

                    <div className="flex justify-center py-2">
                      {mfaQrCodeUrl ? (
                        <div className="p-2 border border-card-border rounded-2xl bg-card-bg shadow-sm">
                          <img src={mfaQrCodeUrl} alt="MFA QR Code" className="h-36 w-36" />
                        </div>
                      ) : (
                        <div className="h-36 w-36 flex items-center justify-center border border-card-border rounded-2xl bg-bg-subtle">
                          <Loader2 className="h-5 w-5 animate-spin text-link-primary" />
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl bg-bg-subtle p-2.5 border border-card-border text-center">
                      <span className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">{t('setupWizard.mfa.manualSetupKey')}</span>
                      <code className="text-xs font-bold text-text-body select-all font-mono tracking-wider">{mfaSecret}</code>
                    </div>

                    <form onSubmit={handleMfaVerify} className="space-y-3 pt-1 border-t border-card-border">
                      <div>
                        <label className="block text-xs font-bold text-text-body uppercase tracking-wider mb-1" htmlFor="mfa-code">
                          {t('setupWizard.mfa.enterCodeTitle')}
                        </label>
                        <input
                          type="text"
                          id="mfa-code"
                          required
                          value={mfaCode}
                          onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                          className="w-full text-center tracking-[0.25em] font-mono rounded-xl border border-input-border bg-card-bg px-3 py-2.5 text-base font-bold text-text-heading focus:border-input-border-focus focus:outline-none"
                          placeholder="000000"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={mfaLoading || mfaCode.length < 6}
                        className="w-full flex h-10 items-center justify-center rounded-xl bg-btn-primary-bg text-xs font-bold text-btn-primary-text shadow-sm hover:bg-btn-primary-hover transition-colors disabled:opacity-50"
                      >
                        {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <ShieldCheck className="h-4 w-4 mr-1.5" />}
                        {t('setupWizard.mfa.verifyAndEnableBtn')}
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
              <div className="flex items-center justify-between border-b border-card-border pb-3">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-4.5 w-4.5 text-link-primary" />
                  <span className="text-xs font-bold text-text-heading uppercase tracking-wider">{t('setupWizard.company.stepHeader')}</span>
                </div>
                <span className="inline-flex items-center rounded-full bg-status-info-bg px-2 py-0.5 text-[10px] font-bold text-status-info-text">
                  {t('setup.companyConfig')}
                </span>
              </div>

              <div>
                <h2 className="text-base font-bold text-text-heading">{t('setup.setupPrimaryCompany')}</h2>
                <p className="text-xs text-text-muted mt-1">
                  {t('setup.companyDesc')}
                </p>
              </div>

              {coError && (
                <div className="flex items-start space-x-2 rounded-xl bg-status-error-bg p-3 text-xs text-status-error-text border border-status-error-text/20">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-error-text" />
                  <span className="font-medium">{coError}</span>
                </div>
              )}

              <form onSubmit={handleCoSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-text-body uppercase tracking-wider mb-1" htmlFor="co-name">
                    {t('setup.companyName')}
                  </label>
                  <input
                    type="text"
                    id="co-name"
                    required
                    value={coName}
                    onChange={(e) => setCoName(e.target.value)}
                    className="w-full rounded-xl border border-input-border bg-card-bg px-3 py-2 text-xs text-text-heading focus:border-input-border-focus focus:outline-none"
                    placeholder={t('setup.placeholders.companyName')}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-body uppercase tracking-wider mb-1" htmlFor="co-contact">
                    {t('setup.contactInfo')}
                  </label>
                  <input
                    type="text"
                    id="co-contact"
                    required
                    value={coContactInfo}
                    onChange={(e) => setCoContactInfo(e.target.value)}
                    className="w-full rounded-xl border border-input-border bg-card-bg px-3 py-2 text-xs text-text-heading focus:border-input-border-focus focus:outline-none"
                    placeholder={t('setup.placeholders.contact')}
                  />
                  <p className="text-[10px] text-text-muted mt-0.5">{t('setup.contactInfoDesc')}</p>
                </div>

                <button
                  type="submit"
                  disabled={coLoading}
                  className="w-full flex h-10 items-center justify-center rounded-xl bg-btn-primary-bg text-xs font-semibold text-btn-primary-text shadow-sm hover:bg-btn-primary-hover transition-colors disabled:opacity-50"
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
              <div className="flex items-center justify-between border-b border-card-border pb-2">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4.5 w-4.5 text-link-primary" />
                  <span className="text-xs font-bold text-text-heading uppercase tracking-wider">{t('setupWizard.mail.stepHeader')}</span>
                </div>
                <span className="inline-flex items-center rounded-full bg-bg-subtle px-2 py-0.5 text-[10px] font-bold text-text-body">
                  {t('setupWizard.mail.skippableBadge')}
                </span>
              </div>

              <div>
                <h2 className="text-base font-bold text-text-heading">{t('setupWizard.mail.title')}</h2>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  {t('setupWizard.mail.subtitle')}
                </p>
              </div>

              {mailConfigError && (
                <div className="flex items-start space-x-2 rounded-xl bg-status-error-bg p-3 text-xs text-status-error-text border border-status-error-text/20" id="mail-config-error">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-status-error-text" />
                  <span className="font-medium">{mailConfigError}</span>
                </div>
              )}

              {mailConfigTestSuccess && (
                <div className="flex items-start space-x-2 rounded-xl bg-status-success-bg p-3 text-xs text-status-success-text border border-status-success-text/20" id="mail-config-success">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-success-text" />
                  <span className="font-medium">{t('setupWizard.mail.testSuccess')}</span>
                </div>
              )}

              {/* PROGRESS BAR FOR GUIDED ENTRY */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-text-muted uppercase">
                  <span>{t('setupWizard.mail.progressTitle')}</span>
                  <span>{getSmtpStepProgressPercent()}%</span>
                </div>
                <div className="h-1.5 w-full bg-bg-subtle rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-btn-primary-bg transition-all duration-300" 
                    style={{ width: `${getSmtpStepProgressPercent()}%` }}
                  />
                </div>
              </div>

              {/* STEPPED FIELDS */}
              <div className="p-4 border border-card-border rounded-xl bg-bg-subtle space-y-4">
                {mailConfigFieldIdx === 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-text-heading uppercase tracking-wide">
                      <Server className="h-4 w-4 text-link-primary" />
                      <span>{t('setupWizard.mail.fieldHostTitle')}</span>
                    </div>
                    <p className="text-xs text-text-muted leading-normal">
                      {t('setupWizard.mail.fieldHostDesc')}
                    </p>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-input-border bg-card-bg px-3 py-2 text-xs text-text-heading focus:border-input-border-focus focus:outline-none"
                      placeholder="e.g. smtp.mailu.io"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                    />
                  </div>
                )}

                {mailConfigFieldIdx === 1 && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-text-heading uppercase tracking-wide">
                      <HelpCircle className="h-4 w-4 text-link-primary" />
                      <span>{t('setupWizard.mail.fieldPortTitle')}</span>
                    </div>
                    <p className="text-xs text-text-muted leading-normal">
                      {t('setupWizard.mail.fieldPortDesc')}
                    </p>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-input-border bg-card-bg px-3 py-2 text-xs text-text-heading focus:border-input-border-focus focus:outline-none"
                      placeholder="e.g. 465"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                )}

                {mailConfigFieldIdx === 2 && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-text-heading uppercase tracking-wide">
                      <UserPlus className="h-4 w-4 text-link-primary" />
                      <span>{t('setupWizard.mail.fieldUserTitle')}</span>
                    </div>
                    <p className="text-xs text-text-muted leading-normal">
                      {t('setupWizard.mail.fieldUserDesc')}
                    </p>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-input-border bg-card-bg px-3 py-2 text-xs text-text-heading focus:border-input-border-focus focus:outline-none"
                      placeholder="e.g. mailer@yourcompany.com"
                      value={smtpUsername}
                      onChange={(e) => setSmtpUsername(e.target.value)}
                    />
                  </div>
                )}

                {mailConfigFieldIdx === 3 && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-text-heading uppercase tracking-wide">
                      <Key className="h-4 w-4 text-link-primary" />
                      <span>{t('setupWizard.mail.fieldPassTitle')}</span>
                    </div>
                    <p className="text-xs text-text-muted leading-normal">
                      {t('setupWizard.mail.fieldPassDesc')}
                    </p>
                    <input
                      type="password"
                      className="w-full rounded-xl border border-input-border bg-card-bg px-3 py-2 text-xs text-text-heading focus:border-input-border-focus focus:outline-none"
                      placeholder="••••••••••••••••"
                      value={smtpPassword}
                      onChange={(e) => setSmtpPassword(e.target.value)}
                    />
                  </div>
                )}

                {mailConfigFieldIdx === 4 && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-text-heading uppercase tracking-wide">
                      <Mail className="h-4 w-4 text-link-primary" />
                      <span>{t('setupWizard.mail.fieldFromTitle')}</span>
                    </div>
                    <p className="text-xs text-text-muted leading-normal">
                      {t('setupWizard.mail.fieldFromDesc')}
                    </p>
                    <input
                      type="email"
                      className="w-full rounded-xl border border-input-border bg-card-bg px-3 py-2 text-xs text-text-heading focus:border-input-border-focus focus:outline-none"
                      placeholder="e.g. training@yourcompany.com"
                      value={smtpFromAddress}
                      onChange={(e) => setSmtpFromAddress(e.target.value)}
                    />
                  </div>
                )}

                {/* STEERING CONTROLS */}
                <div className="flex justify-between items-center pt-2 border-t border-card-border">
                  <button
                    type="button"
                    disabled={mailConfigFieldIdx === 0}
                    onClick={() => {
                      setMailConfigFieldIdx(prev => prev - 1);
                      setMailConfigTestSuccess(null);
                    }}
                    className="inline-flex items-center space-x-1 text-xs font-bold text-text-muted hover:text-text-heading disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>{t('setupWizard.mail.backBtn')}</span>
                  </button>

                  <span className="text-[10px] text-text-muted font-bold font-mono">
                    {t('setupWizard.mail.progressTitle')} {mailConfigFieldIdx + 1} of 5
                  </span>

                  {mailConfigFieldIdx < 4 ? (
                    <button
                      type="button"
                      onClick={() => setMailConfigFieldIdx(prev => prev + 1)}
                      className="inline-flex items-center space-x-1 text-xs font-bold text-link-primary hover:text-link-hover"
                    >
                      <span>{t('setupWizard.mail.nextBtn')}</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-status-success-text">{t('setupWizard.mail.guidedDone')}</span>
                  )}
                </div>
              </div>

              {/* OVERALL SMTP SUMMARY & TEST CONTROLS */}
              {mailConfigFieldIdx === 4 && (
                <div className="space-y-4 pt-2">
                  <div className="rounded-xl border border-status-info-text/20 bg-status-info-bg/20 p-3.5 space-y-2">
                    <div className="flex items-center space-x-1 text-xs font-bold text-status-info-text uppercase">
                      <Info className="h-4 w-4 text-link-primary" />
                      <span>{t('setupWizard.mail.summaryTitle')}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-xs">
                      <div><span className="text-text-muted font-semibold">{t('setupWizard.mail.summaryHost')}:</span> <span className="font-semibold text-text-body font-mono">{smtpHost || '(Empty)'}</span></div>
                      <div><span className="text-text-muted font-semibold">{t('setupWizard.mail.summaryPort')}:</span> <span className="font-semibold text-text-body font-mono">{smtpPort}</span></div>
                      <div><span className="text-text-muted font-semibold">{t('setupWizard.mail.summaryUser')}:</span> <span className="font-semibold text-text-body font-mono text-[11px] select-all">{smtpUsername || '(Empty)'}</span></div>
                      <div><span className="text-text-muted font-semibold">{t('setupWizard.mail.summaryFrom')}:</span> <span className="font-semibold text-text-body font-mono text-[11px] select-all">{smtpFromAddress || '(Empty)'}</span></div>
                    </div>
                  </div>

                  {/* Mailu recommendation note */}
                  <div className="rounded-xl border border-card-border bg-card-bg p-3 space-y-1.5 text-[11px] text-text-muted leading-relaxed">
                    <span className="font-bold text-text-heading block">{t('setupWizard.mail.prodNoteTitle')}</span>
                    <p>
                      {t('setupWizard.mail.prodNoteDesc')}
                    </p>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={handleTestMailConfig}
                      disabled={mailConfigTesting || !smtpHost.trim() || !smtpUsername.trim() || !smtpFromAddress.trim()}
                      className="flex-1 inline-flex h-10 items-center justify-center rounded-xl bg-btn-primary-bg text-xs font-bold text-btn-primary-text hover:bg-btn-primary-hover disabled:opacity-50 transition-colors"
                    >
                      {mailConfigTesting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Server className="h-4 w-4 mr-1.5" />}
                      {t('setupWizard.mail.testBtn')}
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleSaveMailConfig}
                      disabled={mailConfigSaving || !mailConfigTestSuccess}
                      className="flex-1 inline-flex h-10 items-center justify-center rounded-xl bg-btn-primary-bg text-xs font-bold text-btn-primary-text hover:bg-btn-primary-hover disabled:opacity-50 transition-colors"
                    >
                      {mailConfigSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                      {t('setupWizard.mail.saveBtn')}
                    </button>
                  </div>
                </div>
              )}

              {/* SKIP OPTIONS ROW */}
              <div className="pt-2 border-t border-card-border flex flex-col space-y-2">
                <div className="rounded-lg bg-status-error-bg/50 border border-status-error-text/20 p-2.5 text-[10px] text-status-error-text leading-normal">
                  {t('setupWizard.mail.skipNotice')}
                </div>
                <button
                  type="button"
                  onClick={handleSkipMailConfig}
                  disabled={mailConfigSaving}
                  className="w-full py-2 border border-card-border text-text-muted rounded-xl text-xs font-semibold hover:bg-bg-subtle transition-colors"
                >
                  {t('setupWizard.mail.skipBtn')}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: IDENTITY PROVIDER (ENTRA ID) CONFIGURATION */}
          {step === 'identity-provider' && (
            <div id="setup-step-identity-provider" className="space-y-4">
              <div className="flex items-center justify-between border-b border-card-border pb-2">
                <div className="flex items-center space-x-2">
                  <Globe className="h-4.5 w-4.5 text-link-primary" />
                  <span className="text-xs font-bold text-text-heading uppercase tracking-wider">{t('setupWizard.entra.stepHeader')}</span>
                </div>
                <span className="inline-flex items-center rounded-full bg-bg-subtle px-2 py-0.5 text-[10px] font-bold text-text-body">
                  {t('setupWizard.entra.skippableBadge')}
                </span>
              </div>

              <div>
                <h2 className="text-base font-bold text-text-heading">{t('setupWizard.entra.title')}</h2>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  {t('setupWizard.entra.subtitle')}
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
              <div className="flex items-center justify-between border-b border-card-border pb-3">
                <div className="flex items-center space-x-2">
                  <Layers className="h-4.5 w-4.5 text-link-primary" />
                  <span className="text-xs font-bold text-text-heading uppercase tracking-wider">{t('setupWizard.org.stepHeader')}</span>
                </div>
                <span className="inline-flex items-center rounded-full bg-status-info-bg px-2 py-0.5 text-[10px] font-bold text-status-info-text">
                  {t('setupWizard.org.badge')}
                </span>
              </div>

              <div>
                <h2 className="text-base font-bold text-text-heading">{t('setupWizard.org.title')}</h2>
                <p className="text-xs text-text-muted mt-1">
                  {t('setupWizard.org.subtitle')}
                </p>
              </div>

              {orgError && (
                <div className="flex items-start space-x-2 rounded-xl bg-status-error-bg p-3 text-xs text-status-error-text border border-status-error-text/20">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-error-text" />
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
                    className="flex-1 rounded-xl border border-input-border bg-card-bg px-3 py-2 text-xs text-text-heading focus:border-input-border-focus focus:outline-none"
                    placeholder={t('setupWizard.org.inputPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={addOuToList}
                    className="inline-flex items-center justify-center rounded-xl bg-btn-primary-bg hover:bg-btn-primary-hover px-3 text-btn-primary-text text-[11px] font-bold transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    {t('setupWizard.org.addBtn')}
                  </button>
                </div>

                {/* List of currently added OUs */}
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {ouList.length === 0 ? (
                    <p className="text-[11px] text-text-muted italic py-3 text-center">{t('setupWizard.org.emptyMsg')}</p>
                  ) : (
                    ouList.map((name, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-xl border border-card-border bg-bg-subtle px-3 py-2"
                      >
                        <span className="text-xs font-semibold text-text-body">{name}</span>
                        <button
                          type="button"
                          onClick={() => removeOuFromList(idx)}
                          className="text-text-muted hover:text-status-error-text transition-colors"
                          title={t('setupWizard.org.removeTooltip')}
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
                  className="w-full flex h-10 items-center justify-center rounded-xl bg-btn-primary-bg text-xs font-semibold text-btn-primary-text shadow-sm hover:bg-btn-primary-hover transition-colors disabled:opacity-50 mt-3"
                >
                  {orgLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  {t('setupWizard.org.saveBtn')}
                </button>
              </div>
            </div>
          )}

          {/* STEP 7: ROLE TEMPLATES SELECTION */}
          {step === 'role-templates' && (
            <div id="setup-step-role-templates" className="space-y-4">
              <div className="flex items-center justify-between border-b border-card-border pb-3">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="h-4.5 w-4.5 text-link-primary" />
                  <span className="text-xs font-bold text-text-heading uppercase tracking-wider">{t('setupWizard.roleTemplates.stepHeader')}</span>
                </div>
                <span className="inline-flex items-center rounded-full bg-status-info-bg px-2 py-0.5 text-[10px] font-bold text-status-info-text">
                  {t('setup.roleTemplates')}
                </span>
              </div>

              <div>
                <h2 className="text-base font-bold text-text-heading">{t('setup.selectTemplates')}</h2>
                <p className="text-xs text-text-muted mt-1">
                  {t('setup.templatesDesc')}
                </p>
              </div>

              {rtError && (
                <div className="flex items-start space-x-2 rounded-xl bg-status-error-bg p-3 text-xs text-status-error-text border border-status-error-text/20">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-error-text" />
                  <span className="font-medium">{rtError}</span>
                </div>
              )}

              <form onSubmit={(e) => handleRtSubmit(e, false)} className="space-y-3.5">
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {defaultTemplates.map((name) => (
                    <label
                      key={name}
                      className="flex items-center space-x-3 rounded-xl border border-card-border bg-bg-subtle p-2.5 hover:bg-bg-subtle/80 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={!!checkedTemplates[name]}
                        onChange={() => toggleTemplate(name)}
                        className="h-4 w-4 rounded border-input-border text-btn-primary-bg focus:ring-input-border-focus"
                      />
                      <span className="text-xs font-semibold text-text-heading">{name}</span>
                    </label>
                  ))}
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="submit"
                    disabled={rtLoading}
                    className="w-full flex h-10 items-center justify-center rounded-xl bg-btn-primary-bg text-xs font-semibold text-btn-primary-text shadow-sm hover:bg-btn-primary-hover transition-colors disabled:opacity-50"
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
                    className="w-full flex h-10 items-center justify-center rounded-xl border border-card-border bg-card-bg text-xs font-semibold text-text-muted hover:bg-bg-subtle transition-colors disabled:opacity-50"
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
