import React, { useState } from 'react';
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
      setErrorMsg('All connection credentials are required to test.');
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
        error: err.message || 'Failed to complete connection test.'
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
        setErrorMsg(err.message || 'Failed to complete setup choice.');
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
      setErrorMsg(err.message || 'Failed to save identity provider settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkipFlow = async () => {
    setSaving(true);
    try {
      await onSkip();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to skip identity provider step.');
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
            <h3 className="text-base font-bold text-slate-900">Choose Identity Setup</h3>
            <p className="text-xs text-slate-500 mt-1">
              Select how your employees and administrators will sign in to SmartCookie.
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
                <span className="block text-sm font-semibold text-slate-800">Microsoft Entra ID + Local Password (Recommended)</span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  Allows users to authenticate seamlessly with their company Microsoft 365 / Entra accounts, while retaining secure local recovery options.
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
                <span className="block text-sm font-semibold text-slate-800">Microsoft Entra ID Only (Strict SSO)</span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  Forces all login attempts through your corporate Microsoft single sign-on screen. Standard passwords will be disabled.
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
                <span className="block text-sm font-semibold text-slate-800">Local Accounts Only (Skip SSO Setup)</span>
                <span className="block text-xs text-slate-500 mt-0.5">
                  Users sign in using email invitations and secure custom passwords. Choose this to skip setting up Microsoft integration now.
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
              {loginMode === 'LOCAL_ONLY' ? 'Confirm & Skip Entra' : 'Continue to Connection Settings'}
            </button>
            <button
              onClick={handleSkipFlow}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Skip Step
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
              <span>Microsoft Entra ID App Registration Guide</span>
            </div>

            <ol className="list-decimal pl-4 space-y-2 text-slate-600 leading-relaxed">
              <li>
                Navigate to the <a href="https://entra.microsoft.com" target="_blank" rel="noreferrer" className="text-blue-600 font-medium underline">Microsoft Entra Admin Center</a>.
              </li>
              <li>
                Go to <span className="font-semibold text-slate-800">Identity &gt; Applications &gt; App registrations</span>, then click <span className="font-semibold text-slate-800">New registration</span>.
              </li>
              <li>
                Provide a name (e.g., <span className="font-mono text-blue-700">SmartCookie LMS</span>) and select <span className="font-semibold text-slate-800">Single tenant</span> or multi-tenant as fits your company.
              </li>
              <li>
                Under <span className="font-semibold text-slate-800">Redirect URI</span>, select <span className="font-semibold text-slate-800">Web</span> and paste the exact value shown below.
              </li>
              <li>
                Under <span className="font-semibold text-slate-800">Certificates & secrets</span>, create a new client secret. Copy the secret <span className="italic text-rose-700 font-semibold">Value</span> immediately (it is only shown once).
              </li>
              <li>
                Under <span className="font-semibold text-slate-800">API permissions</span>, click <span className="font-semibold text-slate-800">Add a permission</span>, choose <span className="font-semibold text-slate-800">Microsoft Graph</span>:
                <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11px] text-slate-500">
                  <li><span className="font-semibold text-slate-700">Delegated Permissions:</span> User.Read (default)</li>
                  <li><span className="font-semibold text-slate-700">Application Permissions:</span> User.Read.All, Group.Read.All</li>
                </ul>
              </li>
              <li>
                <span className="font-bold text-rose-700">CRITICAL ACTION:</span> Click <span className="font-bold text-slate-800">"Grant admin consent for [Your Tenant]"</span>. Your background directory synchronization will fail until consent is explicitly granted.
              </li>
            </ol>
          </div>

          {/* COPY REDIRECT URI BLOCK */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/20 p-4 space-y-2">
            <span className="block text-xs font-bold text-blue-900 uppercase tracking-wider">Redirect Callback URI for Microsoft Entra</span>
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
                title="Copy Redirect URI"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* CREDENTIALS FORM */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="tenant-id">
                Directory (Tenant) ID
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
                Application (Client) ID
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
                Client Secret (Value)
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
              Back
            </button>
            <button
              onClick={() => setSubStep(3)}
              disabled={!tenantId.trim() || !clientId.trim() || !clientSecret.trim()}
              className="flex-1 inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Continue to Validation
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </button>
            <button
              onClick={handleSkipFlow}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: CONNECTION TESTING & API PERMISSIONS VALIDATION */}
      {subStep === 3 && (
        <div className="space-y-6" id="entra-step-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Validate Connections & Permissions</h3>
            <p className="text-xs text-slate-500 mt-1">
              Before saving, let's verify if your Microsoft Graph credentials and Admin Consents are successfully configured.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs space-y-2 text-slate-600">
            <div className="flex justify-between">
              <span className="font-semibold text-slate-700">Target Tenant:</span>
              <span className="font-mono">{tenantId}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-700">Target Client ID:</span>
              <span className="font-mono">{clientId}</span>
            </div>
          </div>

          {!testResult && !testing && (
            <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">
              <HelpCircle className="h-10 w-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">Ready to test connection</p>
              <p className="text-xs text-slate-500 mt-0.5 px-6">
                Clicking the button will initiate an OAuth client handshake using Microsoft Graph API to read token metadata.
              </p>
            </div>
          )}

          {testing && (
            <div className="flex flex-col items-center justify-center py-8 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
              <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-800">Contacting Microsoft Graph API...</p>
                <p className="text-xs text-slate-500">Checking scopes and delegated token capabilities</p>
              </div>
            </div>
          )}

          {testResult && (
            <div className="space-y-4" id="entra-test-results">
              {testResult.success ? (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/20 p-4 flex items-start space-x-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-emerald-900">Connection Handshake Successful</h4>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      Your credentials are valid. We successfully received and parsed an authorization token from Microsoft Entra.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-rose-100 bg-rose-50/20 p-4 flex items-start space-x-3">
                  <XCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-rose-900">Handshake Failed</h4>
                    <p className="text-xs text-rose-700 mt-0.5">
                      {testResult.error || 'The connection could not be established. Please verify your Tenant ID, Client ID, and Secret.'}
                    </p>
                  </div>
                </div>
              )}

              {testResult.permissions && (
                <div className="space-y-3">
                  <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Required API Scopes Checked</span>
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
              Back
            </button>
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="flex-1 inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
              Run Validation Test
            </button>
            {testResult?.success && (
              <button
                onClick={() => setSubStep(4)}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </button>
            )}
            <button
              onClick={handleSkipFlow}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: IMPORT STRATEGY & CONFIRMATION MAPS */}
      {subStep === 4 && (
        <div className="space-y-6" id="entra-step-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Configure Sync & Attribute Mapping</h3>
            <p className="text-xs text-slate-500 mt-1">
              Finalize synchronization behaviors and view how Microsoft user profiles are translated.
            </p>
          </div>

          {/* Sync Strategy Choice */}
          <div className="space-y-3">
            <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">User Import Strategy</span>
            
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
                  <span className="block text-xs font-bold text-slate-800">On-Demand Provisioning (First Login)</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    User accounts are automatically provisioned the first time they log in via Microsoft SSO.
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
                  <span className="block text-xs font-bold text-slate-800">Full Directory Synchronization</span>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    Automatically syncs all Microsoft Entra users down into the SmartCookie local directory on a recurring cycle.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Fixed Attribute Mapping shown as an informational confirmation screen (not editable) */}
          <div className="space-y-2.5">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Info className="h-4 w-4 text-blue-600" />
              <span>Microsoft-to-LMS Attribute Mapping</span>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="p-3">Microsoft Entra field</th>
                    <th className="p-3">SmartCookie field</th>
                    <th className="p-3">Fallback Behavior</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  <tr>
                    <td className="p-3 font-mono text-blue-600 font-semibold">userPrincipalName</td>
                    <td className="p-3 font-bold text-slate-800">Username</td>
                    <td className="p-3 text-slate-400 italic">None (Required)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-blue-600 font-semibold">mail</td>
                    <td className="p-3 font-bold text-slate-800">Primary Email</td>
                    <td className="p-3 text-slate-500">Falls back to UPN</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-blue-600 font-semibold">givenName</td>
                    <td className="p-3 font-bold text-slate-800">First Name</td>
                    <td className="p-3 text-slate-500">Defaults to username</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-blue-600 font-semibold">surname</td>
                    <td className="p-3 font-bold text-slate-800">Last Name</td>
                    <td className="p-3 text-slate-500">Empty string</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-blue-600 font-semibold">department</td>
                    <td className="p-3 font-bold text-slate-800">Organizational Unit</td>
                    <td className="p-3 text-slate-500">Assigned to Root OU</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              These mappings are standardized according to enterprise SCIM/OIDC guidelines to ensure consistent, clean directory sync logic, and cannot be custom modified.
            </p>
          </div>

          <div className="pt-3 flex space-x-3">
            <button
              onClick={() => setSubStep(3)}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </button>
            <button
              onClick={handleFinalSave}
              disabled={saving}
              className="flex-1 inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
              Save Configuration & Finish
            </button>
            <button
              onClick={handleSkipFlow}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
