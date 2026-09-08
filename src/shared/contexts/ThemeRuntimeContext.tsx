import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export interface ResolvedFontDetails {
  id: string;
  family: string;
  familyName: string;
  format: string | null;
  weight: string | null;
  style: string | null;
  storagePath: string | null;
  isSystem: boolean;
}

export interface ResolvedThemeResponse {
  themeId: string;
  name: string;
  isTest: boolean;
  baseFontSize: number;
  tokens: Record<string, string>;
  colorValues: Record<string, string>;
  darkTokens: Record<string, string> | null;
  darkColorValues: Record<string, string> | null;
  fonts?: Record<string, ResolvedFontDetails>;
  logoUrl?: string | null;
}

export interface ThemeRuntimeContextType {
  displayMode: 'light' | 'dark';
  isDarkMode: boolean;
  toggleDisplayMode: () => void;
  setDisplayMode: (mode: 'light' | 'dark') => void;
  isTestMode: boolean;
  testThemeName: string | null;
  testThemeId: string | null;
  logoUrl: string | null;
  refetch: () => Promise<void>;
  exitTestMode: () => Promise<void>;
}

const ThemeRuntimeContext = createContext<ThemeRuntimeContextType | undefined>(undefined);

export function useThemeRuntime(): ThemeRuntimeContextType {
  const context = useContext(ThemeRuntimeContext);
  if (!context) {
    throw new Error('useThemeRuntime must be used within a ThemeRuntimeProvider');
  }
  return context;
}

interface ThemeRuntimeProviderProps {
  children: React.ReactNode;
}

function getInitialDisplayMode(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem('themeDisplayMode');
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
  } catch {}
  return 'light';
}

export function ThemeRuntimeProvider({ children }: ThemeRuntimeProviderProps) {
  const [displayMode, setDisplayModeState] = useState<'light' | 'dark'>(getInitialDisplayMode);
  const [isTestMode, setIsTestMode] = useState<boolean>(false);
  const [testThemeName, setTestThemeName] = useState<string | null>(null);
  const [testThemeId, setTestThemeId] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync data-theme attribute on <html> element immediately
  useEffect(() => {
    document.documentElement.dataset.theme = displayMode;
  }, [displayMode]);

  // Listen to OS theme changes if user hasn't explicitly chosen in localStorage
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      const explicit = localStorage.getItem('themeDisplayMode');
      if (!explicit) {
        setDisplayModeState(e.matches ? 'dark' : 'light');
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  const setDisplayMode = useCallback((mode: 'light' | 'dark') => {
    try {
      localStorage.setItem('themeDisplayMode', mode);
    } catch {}
    document.documentElement.dataset.theme = mode;
    setDisplayModeState(mode);
  }, []);

  const toggleDisplayMode = useCallback(() => {
    const nextMode = displayMode === 'dark' ? 'light' : 'dark';
    setDisplayMode(nextMode);
  }, [displayMode, setDisplayMode]);

  const applyThemeTokens = useCallback((resolved: ResolvedThemeResponse) => {
    if (resolved.tokens && typeof resolved.tokens === 'object') {
      for (const [key, value] of Object.entries(resolved.tokens)) {
        if (typeof value === 'string') {
          document.documentElement.style.setProperty(`--color-${key}`, value);
        }
      }
    }

    if (resolved.baseFontSize) {
      document.documentElement.style.setProperty('--font-size-base', `${resolved.baseFontSize}px`);
    }

    if (resolved.fonts && typeof resolved.fonts === 'object') {
      for (const [slot, fontDetails] of Object.entries(resolved.fonts)) {
        if (fontDetails?.familyName) {
          document.documentElement.style.setProperty(`--font-family-${slot}`, `"${fontDetails.familyName}", sans-serif`);
          if (slot === 'general') {
            document.documentElement.style.setProperty('--font-family-base', `"${fontDetails.familyName}", sans-serif`);
            document.body.style.fontFamily = `"${fontDetails.familyName}", sans-serif`;
          }
        }
      }
    }
  }, []);

  const fetchTheme = useCallback(async () => {
    try {
      const testOverrideId = sessionStorage.getItem('themeTestOverrideId');
      const params = new URLSearchParams();
      if (testOverrideId) {
        params.set('test', testOverrideId);
      }
      params.set('mode', displayMode);

      const url = `/api/themes/resolved?${params.toString()}`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch resolved theme (status: ${res.status})`);
      }

      const data: ResolvedThemeResponse = await res.json();

      // If test theme was requested via sessionStorage, but the response indicates it no longer exists
      // (isTest is false or returned themeId does not match testOverrideId), clear sessionStorage and refetch active theme.
      if (testOverrideId && (!data.isTest || data.themeId !== testOverrideId)) {
        sessionStorage.removeItem('themeTestOverrideId');
        const fallbackRes = await fetch(`/api/themes/resolved?mode=${displayMode}`);
        if (fallbackRes.ok) {
          const fallbackData: ResolvedThemeResponse = await fallbackRes.json();
          applyThemeTokens(fallbackData);
          setIsTestMode(false);
          setTestThemeName(null);
          setTestThemeId(null);
          setLogoUrl(fallbackData.logoUrl || null);
          return;
        }
      }

      applyThemeTokens(data);
      setIsTestMode(Boolean(data.isTest));
      setTestThemeName(data.isTest ? data.name : null);
      setTestThemeId(data.isTest ? data.themeId : null);
      setLogoUrl(data.logoUrl || null);
    } catch (error) {
      console.warn('[ThemeRuntime] Error fetching resolved theme:', error);
    } finally {
      setIsLoading(false);
    }
  }, [applyThemeTokens, displayMode]);

  const exitTestMode = useCallback(async () => {
    const overrideId = sessionStorage.getItem('themeTestOverrideId') || testThemeId;
    if (overrideId) {
      try {
        await fetch(`/api/themes/${overrideId}/lock`, {
          method: 'DELETE',
          credentials: 'include',
        });
      } catch (err) {
        console.warn('[ThemeRuntime] Failed to release test lock on exit:', err);
      }
      sessionStorage.removeItem('themeTestOverrideId');
    }
    await fetchTheme();
  }, [testThemeId, fetchTheme]);

  // Periodic heartbeat to refresh test lock while tab is actively open
  useEffect(() => {
    if (!isTestMode || !testThemeId) return;

    // Refresh every 2 minutes (timeout safety window is 5 minutes)
    const interval = setInterval(() => {
      fetch(`/api/themes/${testThemeId}/lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lockType: 'TEST' }),
        credentials: 'include',
      }).catch((err) => {
        console.warn('[ThemeRuntime] Lock heartbeat failed:', err);
      });
    }, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isTestMode, testThemeId]);

  // Best-effort beforeunload lock release
  useEffect(() => {
    const handleBeforeUnload = () => {
      const overrideId = sessionStorage.getItem('themeTestOverrideId');
      if (overrideId) {
        try {
          fetch(`/api/themes/${overrideId}/lock`, {
            method: 'DELETE',
            keepalive: true,
            credentials: 'include',
          });
        } catch {}
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    fetchTheme();
  }, [fetchTheme]);

  if (isLoading) {
    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center bg-bg-app text-text-heading"
        id="theme-runtime-loading"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-card-border border-t-link-primary" />
      </div>
    );
  }

  return (
    <ThemeRuntimeContext.Provider
      value={{
        displayMode,
        isDarkMode: displayMode === 'dark',
        toggleDisplayMode,
        setDisplayMode,
        isTestMode,
        testThemeName,
        testThemeId,
        logoUrl,
        refetch: fetchTheme,
        exitTestMode,
      }}
    >
      {children}
    </ThemeRuntimeContext.Provider>
  );
}
