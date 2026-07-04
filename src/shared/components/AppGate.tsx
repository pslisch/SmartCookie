import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { SetupWizard } from '../../features/auth/pages/SetupWizard';
import { Login } from '../../features/auth/pages/Login';
import { AcceptInvitation } from '../../features/auth/pages/AcceptInvitation';
import { ForgotPassword } from '../../features/auth/pages/ForgotPassword';
import { ResetPassword } from '../../features/auth/pages/ResetPassword';

interface UserIdentity {
  id: string;
  username: string;
  isSuperuser: boolean;
  recoveryEmail: string;
  companyId: string | null;
  status: string;
}

interface AuthContextType {
  user: UserIdentity | null;
  setupStatus: 'superuser' | 'company' | 'complete' | null;
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
   const [setupStatus, setSetupStatus] = useState<'superuser' | 'company' | 'complete' | null>(null);
  const [user, setUser] = useState<UserIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [publicAction, setPublicAction] = useState<{ action: string; token: string } | null>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action') || (window.location.pathname === '/activate' || window.location.pathname === '/accept-invitation' ? 'activate' : window.location.pathname === '/reset-password' ? 'reset-password' : null);
    const token = urlParams.get('token');
    if (action && (action === 'activate' || action === 'reset-password') && token) {
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
        setIsLoading(false);
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

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create superuser.');
    }

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

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to complete company step.');
    }

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
  if (setupStatus === 'superuser' || setupStatus === 'company') {
    return (
      <AuthContext.Provider value={authContextValue}>
        <SetupWizard
          step={setupStatus}
          onSuperuserSubmit={triggerSuperuserSubmit}
          onCompanySubmit={triggerCompanySubmit}
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
