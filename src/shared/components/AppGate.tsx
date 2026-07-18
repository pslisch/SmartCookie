import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { SetupWizard } from '../../features/auth/pages/SetupWizard';
import { Login } from '../../features/auth/pages/Login';
import { AcceptInvitation } from '../../features/auth/pages/AcceptInvitation';
import { ForgotPassword } from '../../features/auth/pages/ForgotPassword';
import { ResetPassword } from '../../features/auth/pages/ResetPassword';
import { ConfirmEmail } from '../../features/auth/pages/ConfirmEmail';

interface UserIdentity {
  id: string;
  username: string;
  isSuperuser: boolean;
  recoveryEmail: string;
  companyId: string | null;
  status: string;
  roleName: string | null;
  effectivePermissions: string[];
  incompleteRequiredFields?: string[];
}

interface AuthContextType {
  user: UserIdentity | null;
  setupStatus: 'superuser' | 'superuser-mfa' | 'company' | 'mail-config' | 'identity-provider' | 'org-structure' | 'role-templates' | 'complete' | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider/AppGate');
  }
  return context;
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

interface AppGateProps {
  children: React.ReactNode;
}

export function AppGate({ children }: AppGateProps) {
  const { t } = useTranslation();
  const [setupStatus, setSetupStatus] = useState<'superuser' | 'superuser-mfa' | 'company' | 'mail-config' | 'identity-provider' | 'org-structure' | 'role-templates' | 'complete' | null>(null);
  const [user, setUser] = useState<UserIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [publicAction, setPublicAction] = useState<{ action: string; token: string } | null>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action') || (
      window.location.pathname === '/activate' || window.location.pathname === '/accept-invitation'
        ? 'activate'
        : window.location.pathname === '/reset-password'
        ? 'reset-password'
        : window.location.pathname === '/confirm-email'
        ? 'confirm-email'
        : null
    );
    const token = urlParams.get('token');
    if (action && (action === 'activate' || action === 'reset-password' || action === 'confirm-email') && token) {
      return { action, token };
    }
    return null;
  });

  const checkStatusAndSession = async () => {
    try {
      // 1. Check Setup Status
      const setupRes = await fetch('/api/setup/status');
      
      if (setupRes.status === 403) {
        // Setup complete
        setSetupStatus('complete');
        await fetchSession();
      } else if (setupRes.ok) {
        const setupData = await setupRes.json();
        setSetupStatus(setupData.status);
        if (setupData.status === 'complete') {
          await fetchSession();
        } else {
          setIsLoading(false);
        }
      } else {
        // Fallback
        setSetupStatus('complete');
        await fetchSession();
      }
    } catch (err) {
      console.error('Error in AppGate status checking:', err);
      // Fallback
      setSetupStatus('complete');
      await fetchSession();
    }
  };

  const fetchSession = async () => {
    try {
      const sessionRes = await fetch('/api/auth/session');
      if (sessionRes.status === 200) {
        const sessionData = await sessionRes.json();
        if (sessionData.success && sessionData.user) {
          setUser(sessionData.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Error fetching session:', err);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkStatusAndSession();
  }, []);

  const handleJsonResponse = async (res: Response, fallbackErrorMessage: string) => {
    const contentType = res.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      throw new Error(`Server error (${res.status} ${res.statusText}): ${text.substring(0, 100)}...`);
    }

    if (!res.ok) {
      throw new Error(data.error || fallbackErrorMessage);
    }
    return data;
  };

  const triggerSuperuserSubmit = async (username: string, password: string, recoveryEmail: string) => {
    const res = await fetch('/api/setup/superuser', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCookie('csrfToken'),
      },
      body: JSON.stringify({
        username,
        password,
        recoveryEmail,
      }),
    });

    await handleJsonResponse(res, 'Failed to create superuser.');
    await checkStatusAndSession();
  };

  const triggerCompanySubmit = async (name: string, contactInfo: string) => {
    const res = await fetch('/api/setup/company', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCookie('csrfToken'),
      },
      body: JSON.stringify({
        name,
        contactInfo,
      }),
    });

    await handleJsonResponse(res, 'Failed to complete company step.');
    await checkStatusAndSession();
  };

  const triggerMfaSubmit = async (pendingSecret: string, code: string) => {
    const res = await fetch('/api/setup/mfa/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCookie('csrfToken'),
      },
      body: JSON.stringify({
        pendingSecret,
        code,
      }),
    });
    return await handleJsonResponse(res, 'Failed to verify MFA.');
  };

  const triggerMailConfigSubmit = async (config: { host: string; port: number; username: string; fromAddress: string }) => {
    const res = await fetch('/api/setup/mail-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCookie('csrfToken'),
      },
      body: JSON.stringify(config),
    });
    await handleJsonResponse(res, 'Failed to save mail configuration.');
    await checkStatusAndSession();
  };

  const triggerMailConfigSkip = async () => {
    const res = await fetch('/api/setup/mail-config/skip', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCookie('csrfToken'),
      },
    });
    await handleJsonResponse(res, 'Failed to skip mail configuration.');
    await checkStatusAndSession();
  };

  const triggerIdentityProviderSubmit = async (config: { tenantId: string; clientId: string; clientSecret: string }) => {
    const res = await fetch('/api/setup/identity-provider', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCookie('csrfToken'),
      },
      body: JSON.stringify(config),
    });
    await handleJsonResponse(res, 'Failed to save identity provider settings.');
    await checkStatusAndSession();
  };

  const triggerIdentityProviderSkip = async () => {
    const res = await fetch('/api/setup/identity-provider/skip', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCookie('csrfToken'),
      },
    });
    await handleJsonResponse(res, 'Failed to skip identity provider settings.');
    await checkStatusAndSession();
  };

  const triggerOrgStructureSubmit = async (ouNames: string[]) => {
    const res = await fetch('/api/setup/org-structure', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCookie('csrfToken'),
      },
      body: JSON.stringify({
        ouNames,
      }),
    });

    await handleJsonResponse(res, 'Failed to complete organization structure step.');
    await checkStatusAndSession();
  };

  const triggerRoleTemplatesSubmit = async (selectedNames: string[]) => {
    const res = await fetch('/api/setup/role-templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCookie('csrfToken'),
      },
      body: JSON.stringify({
        selectedNames,
      }),
    });

    await handleJsonResponse(res, 'Failed to complete role templates step.');
    await checkStatusAndSession();
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'X-CSRF-Token': getCookie('csrfToken'),
        },
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      sessionStorage.removeItem('requiredFieldsBannerDismissed');
      setUser(null);
      setSetupStatus('complete');
    }
  };

  const authContextValue: AuthContextType = {
    user,
    setupStatus,
    isLoading,
    refresh: checkStatusAndSession,
    logout: handleLogout,
  };

  if (publicAction) {
    if (publicAction.action === 'activate') {
      return (
        <AuthContext.Provider value={authContextValue}>
          <AcceptInvitation
            token={publicAction.token}
            onSuccess={async () => {
              setPublicAction(null);
              await checkStatusAndSession();
            }}
          />
        </AuthContext.Provider>
      );
    }
    if (publicAction.action === 'reset-password') {
      return (
        <AuthContext.Provider value={authContextValue}>
          <ResetPassword
            token={publicAction.token}
            onSuccess={async () => {
              setPublicAction(null);
              await checkStatusAndSession();
            }}
          />
        </AuthContext.Provider>
      );
    }
    if (publicAction.action === 'confirm-email') {
      return (
        <AuthContext.Provider value={authContextValue}>
          <ConfirmEmail
            token={publicAction.token}
            onSuccess={async () => {
              // Clear the token from URL and go back to login
              window.history.replaceState({}, document.title, '/');
              setPublicAction(null);
              await checkStatusAndSession();
            }}
          />
        </AuthContext.Provider>
      );
    }
  }

  if (showForgotPassword) {
    return (
      <AuthContext.Provider value={authContextValue}>
        <ForgotPassword onBackToLogin={() => setShowForgotPassword(false)} />
      </AuthContext.Provider>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 text-slate-800" id="appgate-loading-view">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center space-y-4"
        >
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white font-extrabold text-3xl shadow-md">
            S
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="absolute -inset-1.5 rounded-2xl border-2 border-blue-600 border-t-transparent opacity-60"
            />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">SmartCookie</h1>
            <p className="text-sm text-slate-500 font-medium">{t('appGate.verifying')}</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Gate 1: Setup Wizard Required
  if (setupStatus && setupStatus !== 'complete') {
    return (
      <AuthContext.Provider value={authContextValue}>
        <SetupWizard
          step={setupStatus}
          onSuperuserSubmit={triggerSuperuserSubmit}
          onMfaSubmit={triggerMfaSubmit}
          onCompanySubmit={triggerCompanySubmit}
          onMailConfigSubmit={triggerMailConfigSubmit}
          onMailConfigSkip={triggerMailConfigSkip}
          onIdentityProviderSubmit={triggerIdentityProviderSubmit}
          onIdentityProviderSkip={triggerIdentityProviderSkip}
          onOrgStructureSubmit={triggerOrgStructureSubmit}
          onRoleTemplatesSubmit={triggerRoleTemplatesSubmit}
        />
      </AuthContext.Provider>
    );
  }

  // Gate 2: Authentication Required (Setup complete but no active session)
  if (!user) {
    return (
      <AuthContext.Provider value={authContextValue}>
        <Login
          onLoginSuccess={checkStatusAndSession}
          onForgotPassword={() => setShowForgotPassword(true)}
        />
      </AuthContext.Provider>
    );
  }

  // Gate 3: Setup Completed and Active Valid Session Established -> Render App
  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}
