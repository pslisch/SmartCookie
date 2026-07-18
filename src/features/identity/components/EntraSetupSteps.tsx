import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { 
  Info, CheckCircle2, XCircle, Copy, Check, ChevronRight, HelpCircle, 
  ArrowLeft, ArrowRight, ShieldAlert, Key, Globe, Eye, EyeOff, Loader2 
} from 'lucide-react';

interface PermissionResult {
  permission: string;
  status: string;
  explanation: string;
}

interface EntraSetupProps {
  onSave: (config: { tenantId: string; clientId: string; clientSecret: string }) => Promise<void>;
  onSkip: () => Promise<void>;
}

export function EntraSetupSteps({ onSave, onSkip }: EntraSetupProps) {
  const { t } = useTranslation();
  const [subStep, setSubStep] = useState<1 | 2 | 3 | 4>(1);
  const [loginMode, setLoginMode] = useState<'LOCAL_ONLY' | 'MICROSOFT_ONLY' | 'BOTH'>('BOTH');
  const [tenantId, setTenantId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);

  // Test Connection state
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    allGranted: boolean;
    error?: string;
    permissions?: PermissionResult[];
  } | null>(null);

  // Strategy & Map state
  const [importStrategy, setImportStrategy] = useState<'FIRST_LOGIN' | 'ALL_USERS' | 'SELECTED_GROUPS' | 'SELECTED_GROUPS_AND_FIRST_LOGIN'>('FIRST_LOGIN');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const redirectUri = `${window.location.origin}/api/auth/login/callback`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestConnection = async () => {
    if (!tenantId.trim() || !clientId.trim() || !clientSecret.trim()) {
      setErrorMsg(t('setupWizard.entra.errors.credentialsRequired'));
      return;
    }
    setErrorMsg('');
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/setup/identity-provider/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: tenantId.trim(),
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim()
        })
      });

      const data = await response.json();
      setTestResult({
        success: data.success,
        allGranted: data.allGranted,
        error: data.error,
        permissions: data.permissions
      });

      if (data.success && data.allGranted) {
        // Automatically advance to strategy and mappings step on clean green status
        setTimeout(() => setSubStep(4), 1200);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        allGranted: false,
        error: err.message || t('setupWizard.entra.errors.handshakeFailed')
      });
    } finally {
      setTesting(false);
    }
  };

  const handleModeSelectionSubmit = async () => {
    if (loginMode === 'LOCAL_ONLY') {
      // If choosing Local Only, we can simply skip Entra ID configuration
      setSaving(true);
      try {
        await onSkip();
      } catch (err: any) {
        setErrorMsg(err.message || t('setupWizard.entra.errors.failedToCompleteChoice'));
      } finally {
        setSaving(false);
      }
    } else {
      setSubStep(2);
    }
  };

  const handleFinalSave = async () => {
    setSaving(true);
    setErrorMsg('');
    try {
      // We save the Entra configuration to our setup endpoint
      await onSave({
        tenantId: tenantId.trim(),
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim()
      });
    } catch (err: any) {
      setErrorMsg(err.message || t('setupWizard.entra.errors.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  const handleSkipFlow = async () => {
    setSaving(true);
    try {
      await onSkip();
    } catch (err: any) {
      setErrorMsg(err.message || t('setupWizard.entra.errors.failedToSkip'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6" id="entra-setup-flow">
      {errorMsg && (
        <div className="flex items-start space-x-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-800 border border-rose-100" id="entra-error-banner">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* STEP 1: LOGIN MODE CHOICE */}
      {subStep === 1 && (
        <div className="space-y-5" id="entra-step-1">
          <div>
            <h3 className="text-base font-bold text-slate-900">{t('setupWizard.entra.modeTitle')}</h3>
            <p className="text-xs text-slate-500 mt-1">
              {t('setupWizard.entra.modeSubtitle')}
            </p>
          </div>

          <div className="space-y-3">
            <label className={`flex items-start space-x-3.5 rounded-xl border p-4 transition-all cursor-pointer ${
              loginMode === 'BOTH' ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200 hover:bg-slate-50'
            }`}>
              <input
                type="radio"
                name="loginMode"
                value="BOTH"
                checked={loginMode === 'BOTH'}
                onChange={() => setLoginMode('BOTH')}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="block text-sm font-semibold text-slate-800">{t('setupWizard.entra.modeBothTitle')}</span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  {t('setupWizard.entra.modeBothDesc')}
                </span>
              </div>
            </label>

            <label className={`flex items-start space-x-3.5 rounded-xl border p-4 transition-all cursor-pointer ${
              loginMode === 'MICROSOFT_ONLY' ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200 hover:bg-slate-50'
            }`}>
              <input
                type="radio"
                name="loginMode"
                value="MICROSOFT_ONLY"
                checked={loginMode === 'MICROSOFT_ONLY'}
                onChange={() => setLoginMode('MICROSOFT_ONLY')}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="block text-sm font-semibold text-slate-800">{t('setupWizard.entra.modeMicrosoftOnlyTitle')}</span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  {t('setupWizard.entra.modeMicrosoftOnlyDesc')}
                </span>
              </div>
            </label>

            <label className={`flex items-start space-x-3.5 rounded-xl border p-4 transition-all cursor-pointer ${
              loginMode === 'LOCAL_ONLY' ? 'border-blue-500 bg-blue-50/20' : 'border-slate-200 hover:bg-slate-50'
            }`}>
              <input
                type="radio"
                name="loginMode"
                value="LOCAL_ONLY"
                checked={loginMode === 'LOCAL_ONLY'}
                onChange={() => setLoginMode('LOCAL_ONLY')}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="block text-sm font-semibold text-slate-800">{t('setupWizard.entra.modeLocalOnlyTitle')}</span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  {t('setupWizard.entra.modeLocalOnlyDesc')}
                </span>
              </div>
            </label>
          </div>

          <div className="pt-3 flex space-x-3">
            <button
              onClick={handleModeSelectionSubmit}
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ChevronRight className="h-4 w-4 mr-1.5" />}
              {loginMode === 'LOCAL_ONLY' ? t('setupWizard.entra.confirmSkipBtn') : t('setupWizard.entra.continueBtn')}
            </button>
            <button
              onClick={handleSkipFlow}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {t('setupWizard.entra.skipStepBtn')}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: APP REGISTRATION & CREDENTIALS FORM */}
      {subStep === 2 && (
        <div className="space-y-6" id="entra-step-2">
          {/* Detailed app registration guidance */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-xs space-y-3.5 text-slate-700">
            <div className="flex items-center space-x-2 text-slate-900 font-bold border-b border-slate-100 pb-2">
              <Globe className="h-4 w-4 text-blue-600" />
              <span>{t('setupWizard.entra.guideTitle')}</span>
            </div>

            <ol className="list-decimal pl-4 space-y-2 text-slate-600 leading-relaxed">
              <li>
                {t('setupWizard.entra.guideStep1_1')} <a href="https://entra.microsoft.com" target="_blank" rel="noreferrer" className="text-blue-600 font-medium underline">{t('setupWizard.entra.guideStep1_2')}</a>.
              </li>
              <li>
                {t('setupWizard.entra.guideStep2_1')} <span className="font-semibold text-slate-800">{t('setupWizard.entra.guideStep2_2')}</span>{t('setupWizard.entra.guideStep2_3')} <span className="font-semibold text-slate-800">{t('setupWizard.entra.guideStep2_4')}</span>.
              </li>
              <li>
                {t('setupWizard.entra.guideStep3_1')} <span className="font-mono text-blue-700">{t('setupWizard.entra.guideStep3_2')}</span>{t('setupWizard.entra.guideStep3_3')} <span className="font-semibold text-slate-800">{t('setupWizard.entra.guideStep3_4')}</span> {t('setupWizard.entra.guideStep3_5')}
              </li>
              <li>
                {t('setupWizard.entra.guideStep4_1')} <span className="font-semibold text-slate-800">{t('setupWizard.entra.guideStep4_2')}</span>{t('setupWizard.entra.guideStep4_3')} <span className="font-semibold text-slate-800">{t('setupWizard.entra.guideStep4_4')}</span> {t('setupWizard.entra.guideStep4_5')}
              </li>
              <li>
                {t('setupWizard.entra.guideStep4_1')} <span className="font-semibold text-slate-800">{t('setupWizard.entra.guideStep5_1')}</span>{t('setupWizard.entra.guideStep5_2')} <span className="italic text-rose-700 font-semibold">{t('setupWizard.entra.guideStep5_3')}</span> {t('setupWizard.entra.guideStep5_4')}
              </li>
              <li>
                {t('setupWizard.entra.guideStep4_1')} <span className="font-semibold text-slate-800">{t('setupWizard.entra.guideStep6_1')}</span>{t('setupWizard.entra.guideStep6_2')} <span className="font-semibold text-slate-800">{t('setupWizard.entra.guideStep6_3')}</span>{t('setupWizard.entra.guideStep6_4')} <span className="font-semibold text-slate-800">{t('setupWizard.entra.guideStep6_5')}</span>:
                <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11px] text-slate-500">
                  <li><span className="font-semibold text-slate-700">{t('setupWizard.entra.guideStep6_6')}</span> {t('setupWizard.entra.guideStep6_7')}</li>
                  <li><span className="font-semibold text-slate-700">{t('setupWizard.entra.guideStep6_8')}</span> {t('setupWizard.entra.guideStep6_9')}</li>
                </ul>
              </li>
              <li>
                <span className="font-bold text-rose-700">{t('setupWizard.entra.guideStep7_1')}</span> Click <span className="font-bold text-slate-800">{t('setupWizard.entra.guideStep7_2')}</span>{t('setupWizard.entra.guideStep7_3')}
              </li>
            </ol>
          </div>

          {/* COPY REDIRECT URI BLOCK */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/20 p-4 space-y-2">
            <span className="block text-xs font-bold text-blue-900 uppercase tracking-wider">{t('setupWizard.entra.redirectUriTitle')}</span>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={redirectUri}
                className="flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none"
              />
              <button
                type="button"
                onClick={copyToClipboard}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                title={t('setupWizard.entra.copyRedirectTooltip')}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* CREDENTIALS FORM */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="tenant-id">
                {t('setupWizard.entra.tenantIdLabel')}
              </label>
              <input
                type="text"
                id="tenant-id"
                required
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:border-blue-500 focus:outline-none"
                placeholder="e.g. 8f635c91-477c-473d-986c-..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="client-id">
                {t('setupWizard.entra.clientIdLabel')}
              </label>
              <input
                type="text"
                id="client-id"
                required
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-mono text-slate-900 focus:border-blue-500 focus:outline-none"
                placeholder="e.g. 1a2b3c4d-5e6f-7a8b-..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="client-secret">
                {t('setupWizard.entra.clientSecretLabel')}
              </label>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  id="client-secret"
                  required
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white pl-3.5 pr-11 py-2.5 text-sm font-mono text-slate-900 focus:border-blue-500 focus:outline-none"
                  placeholder="e.g. ABC123~xyz789_abcdefgh..."
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-3 flex space-x-3">
            <button
              onClick={() => setSubStep(1)}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              {t('setupWizard.entra.backBtn')}
            </button>
            <button
              onClick={() => setSubStep(3)}
              disabled={!tenantId.trim() || !clientId.trim() || !clientSecret.trim()}
              className="flex-1 inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {t('setupWizard.entra.continueValidationBtn')}
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </button>
            <button
              onClick={handleSkipFlow}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
            >
              {t('setupWizard.entra.skipBtn')}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: CONNECTION TESTING & API PERMISSIONS VALIDATION */}
      {subStep === 3 && (
        <div className="space-y-6" id="entra-step-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">{t('setupWizard.entra.validateTitle')}</h3>
            <p className="text-xs text-slate-500 mt-1">
              {t('setupWizard.entra.validateSubtitle')}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs space-y-2 text-slate-600">
            <div className="flex justify-between">
              <span className="font-semibold text-slate-700">{t('setupWizard.entra.targetTenantLabel')}</span>
              <span className="font-mono">{tenantId}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-700">{t('setupWizard.entra.targetClientIdLabel')}</span>
              <span className="font-mono">{clientId}</span>
            </div>
          </div>

          {!testResult && !testing && (
            <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">
              <HelpCircle className="h-10 w-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">{t('setupWizard.entra.readyToTestTitle')}</p>
              <p className="text-xs text-slate-500 mt-0.5 px-6">
                {t('setupWizard.entra.readyToTestDesc')}
              </p>
            </div>
          )}

          {testing && (
            <div className="flex flex-col items-center justify-center py-8 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-800">{t('setupWizard.entra.testingTitle')}</p>
                <p className="text-xs text-slate-500">{t('setupWizard.entra.testingSubtitle')}</p>
              </div>
            </div>
          )}

          {testResult && (
            <div className="space-y-4" id="entra-test-results">
              {testResult.success ? (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/20 p-4 flex items-start space-x-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-emerald-900">{t('setupWizard.entra.handshakeSuccessTitle')}</h4>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      {t('setupWizard.entra.handshakeSuccessDesc')}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-rose-100 bg-rose-50/20 p-4 flex items-start space-x-3">
                  <XCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-rose-900">{t('setupWizard.entra.handshakeFailedTitle')}</h4>
                    <p className="text-xs text-rose-700 mt-0.5">
                      {testResult.error || t('setupWizard.entra.handshakeFailedDesc')}
                    </p>
                  </div>
                </div>
              )}

              {testResult.permissions && (
                <div className="space-y-3">
                  <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">{t('setupWizard.entra.scopesCheckedTitle')}</span>
                  <div className="space-y-2.5">
                    {testResult.permissions.map((p, idx) => (
                      <div key={idx} className="rounded-xl border border-slate-150 p-3 bg-white space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-slate-800">{p.permission}</span>
                          <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'Granted' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : 'bg-rose-50 text-rose-700 border border-rose-100'
                          }`}>
                            {p.status === 'Granted' ? <Check className="h-3 w-3 mr-0.5" /> : <XCircle className="h-3 w-3 mr-0.5" />}
                            {p.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">{p.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-3 flex space-x-3">
            <button
              onClick={() => setSubStep(2)}
              disabled={testing}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              {t('setupWizard.entra.backBtn')}
            </button>
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="flex-1 inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
              {t('setupWizard.entra.runValidationTestBtn')}
            </button>
            {testResult?.success && (
              <button
                onClick={() => setSubStep(4)}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                {t('setupWizard.entra.nextBtn')}
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </button>
            )}
            <button
              onClick={handleSkipFlow}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
            >
              {t('setupWizard.entra.skipBtn')}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: IMPORT STRATEGY & CONFIRMATION MAPS */}
      {subStep === 4 && (
        <div className="space-y-6" id="entra-step-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">{t('setupWizard.entra.mappingTitle')}</h3>
            <p className="text-xs text-slate-500 mt-1">
              {t('setupWizard.entra.mappingSubtitle')}
            </p>
          </div>

          {/* Sync Strategy Choice */}
          <div className="space-y-3">
            <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">{t('setupWizard.entra.importStrategyTitle')}</span>
            
            <div className="space-y-2">
              <label className="flex items-start space-x-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors cursor-pointer">
                <input
                  type="radio"
                  name="importStrategy"
                  value="FIRST_LOGIN"
                  checked={importStrategy === 'FIRST_LOGIN'}
                  onChange={() => setImportStrategy('FIRST_LOGIN')}
                  className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="block text-xs font-bold text-slate-800">{t('setupWizard.entra.strategyFirstLoginTitle')}</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    {t('setupWizard.entra.strategyFirstLoginDesc')}
                  </span>
                </div>
              </label>

              <label className="flex items-start space-x-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors cursor-pointer">
                <input
                  type="radio"
                  name="importStrategy"
                  value="ALL_USERS"
                  checked={importStrategy === 'ALL_USERS'}
                  onChange={() => setImportStrategy('ALL_USERS')}
                  className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="block text-xs font-bold text-slate-800">{t('setupWizard.entra.strategyAllUsersTitle')}</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    {t('setupWizard.entra.strategyAllUsersDesc')}
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Fixed Attribute Mapping shown as an informational confirmation screen (not editable) */}
          <div className="space-y-2.5">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Info className="h-4 w-4 text-blue-600" />
              <span>{t('setupWizard.entra.attributeMappingTitle')}</span>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="p-3">{t('setupWizard.entra.tableHeadEntra')}</th>
                    <th className="p-3">{t('setupWizard.entra.tableHeadLocal')}</th>
                    <th className="p-3">{t('setupWizard.entra.tableHeadFallback')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  <tr>
                    <td className="p-3 font-mono text-blue-600 font-semibold">userPrincipalName</td>
                    <td className="p-3 font-bold text-slate-800">{t('setupWizard.entra.tableFieldUsername')}</td>
                    <td className="p-3 text-slate-400 italic">{t('setupWizard.entra.tableFallbackNone')}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-blue-600 font-semibold">mail</td>
                    <td className="p-3 font-bold text-slate-800">{t('setupWizard.entra.tableFieldEmail')}</td>
                    <td className="p-3 text-slate-500">{t('setupWizard.entra.tableFallbackUpn')}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-blue-600 font-semibold">givenName</td>
                    <td className="p-3 font-bold text-slate-800">{t('setupWizard.entra.tableFieldFirstName')}</td>
                    <td className="p-3 text-slate-500">{t('setupWizard.entra.tableFallbackUsername')}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-blue-600 font-semibold">surname</td>
                    <td className="p-3 font-bold text-slate-800">{t('setupWizard.entra.tableFieldLastName')}</td>
                    <td className="p-3 text-slate-500">{t('setupWizard.entra.tableFallbackEmpty')}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-blue-600 font-semibold">department</td>
                    <td className="p-3 font-bold text-slate-800">{t('setupWizard.entra.tableFieldOu')}</td>
                    <td className="p-3 text-slate-500">{t('setupWizard.entra.tableFallbackRoot')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              {t('setupWizard.entra.attributeMappingFooter')}
            </p>
          </div>

          <div className="pt-3 flex space-x-3">
            <button
              onClick={() => setSubStep(3)}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              {t('setupWizard.entra.backBtn')}
            </button>
            <button
              onClick={handleFinalSave}
              disabled={saving}
              className="flex-1 inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
              {t('setupWizard.entra.saveAndFinishBtn')}
            </button>
            <button
              onClick={handleSkipFlow}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
            >
              {t('setupWizard.entra.skipBtn')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
