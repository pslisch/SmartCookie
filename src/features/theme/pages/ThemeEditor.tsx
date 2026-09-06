import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Settings,
  Palette,
  Type,
  ChevronDown,
  ChevronUp,
  Lock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Info,
  Search,
  X,
  Eye,
  EyeOff,
  CalendarClock,
} from 'lucide-react';
import { Theme, FontLibraryItem, FontGroupSlot } from '../types';
import { usePermission } from '../../../shared/hooks/usePermission';
import { useThemeRuntime } from '../../../shared/contexts/ThemeRuntimeContext';
import { ColorEditorTab } from '../components/ColorEditorTab';
import { FontEditorTab } from '../components/FontEditorTab';
import { LivePreviewPane } from '../components/LivePreviewPane';
import { COLOR_TOKENS, CANONICAL_DEFAULT_TOKENS, CANONICAL_DEFAULT_DARK_TOKENS } from '../constants/themeTokens';

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:csrfToken|XSRF-TOKEN)=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

interface CollapsibleSectionProps {
  id: string;
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  id,
  title,
  description,
  defaultOpen = true,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className="rounded-2xl border border-card-border bg-card-bg shadow-sm overflow-hidden transition-all mb-6"
      id={id}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left bg-card-bg hover:bg-card-header-bg/50 transition-colors border-b border-card-border/60"
        id={`${id}-toggle-btn`}
      >
        <div>
          <h3 className="text-base font-semibold text-text-heading font-sans">{title}</h3>
          {description && (
            <p className="text-xs text-text-muted mt-0.5 font-sans">{description}</p>
          )}
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-card-border/70 bg-card-bg text-text-muted">
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="p-5"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export interface ThemeEditorProps {
  themeId: string;
  onBack: () => void;
}

export const ThemeEditor: React.FC<ThemeEditorProps> = ({ themeId, onBack }) => {
  const canEdit = usePermission('theme', 'edit');
  const themeRuntime = useThemeRuntime();

  const [theme, setTheme] = useState<Theme | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'colors' | 'fonts'>('general');

  // Search input state owned by ThemeEditor and passed down
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Live component preview pane toggle
  const [showPreview, setShowPreview] = useState<boolean>(true);

  // Form states for General tab
  const [name, setName] = useState<string>('');
  const [baseFontSize, setBaseFontSize] = useState<number>(16);

  // Draft colors state for Colors tab (immediate updates for live preview readiness)
  const [draftColors, setDraftColors] = useState<Record<string, string>>({});
  const [draftDarkColors, setDraftDarkColors] = useState<Record<string, string>>({});
  const [defaultThemeColors, setDefaultThemeColors] = useState<Record<string, string> | null>(null);
  const [defaultThemeDarkColors, setDefaultThemeDarkColors] = useState<Record<string, string> | null>(null);
  const [colorSubMode, setColorSubMode] = useState<'light' | 'dark'>('light');

  // Available fonts from Font Library (GET /api/fonts)
  const [availableFonts, setAvailableFonts] = useState<FontLibraryItem[]>([]);
  const [fontsLoading, setFontsLoading] = useState<boolean>(false);

  // Draft font assignments state for immediate live preview reactivity across all 8 groups
  const [draftFontIds, setDraftFontIds] = useState<Record<FontGroupSlot, string | null>>({
    generalFontId: null,
    navFontId: null,
    headingsFontId: null,
    buttonsFontId: null,
    formsFontId: null,
    cardsFontId: null,
    linksFontId: null,
    statusFontId: null,
  });

  // Autosave status state
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  // Edit-side lock management state
  const isLockHeldByMeRef = useRef<boolean>(false);
  const [isLockHeldByMe, setIsLockHeldByMe] = useState<boolean>(false);
  const [lockHolderInfo, setLockHolderInfo] = useState<{
    holderName: string;
    lockType: string;
    lockedAt: string;
  } | null>(null);

  // 1. On mount: POST /api/themes/:id/lock { lockType: 'EDIT' }; release on unmount
  useEffect(() => {
    let isCancelled = false;

    const acquireEditLock = async () => {
      try {
        const res = await fetch(`/api/themes/${themeId}/lock`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': getCsrfToken(),
          },
          body: JSON.stringify({ lockType: 'EDIT' }),
          credentials: 'include',
        });

        if (isCancelled) return;

        if (res.status === 409) {
          const errData = await res.json().catch(() => ({}));
          setLockHolderInfo({
            holderName: errData.holderName || 'Another user',
            lockType: errData.lockType || 'EDIT',
            lockedAt: errData.lockedAt || new Date().toISOString(),
          });
          setIsLockHeldByMe(false);
          isLockHeldByMeRef.current = false;
          return;
        }

        if (res.ok) {
          setLockHolderInfo(null);
          setIsLockHeldByMe(true);
          isLockHeldByMeRef.current = true;
          return;
        }

        if (res.status === 403) {
          // Lacks theme:edit permission; query current lock status for read-only view
          const getRes = await fetch(`/api/themes/${themeId}/lock`, { credentials: 'include' });
          if (getRes.ok && !isCancelled) {
            const getData = await getRes.json();
            if (getData.isLocked && !getData.lock?.isMine) {
              setLockHolderInfo(getData.lock);
            }
          }
        }
      } catch (err) {
        console.warn('[ThemeEditor] Error acquiring edit lock on mount:', err);
      }
    };

    acquireEditLock();

    return () => {
      isCancelled = true;
      if (isLockHeldByMeRef.current) {
        isLockHeldByMeRef.current = false;
        fetch(`/api/themes/${themeId}/lock`, {
          method: 'DELETE',
          headers: {
            'X-CSRF-Token': getCsrfToken(),
          },
          credentials: 'include',
        }).catch((err) => {
          console.warn('[ThemeEditor] Error releasing lock on unmount:', err);
        });
      }
    };
  }, [themeId]);

  // 2. Heartbeat: re-POST lock every ~2 minutes while mounted and tab has focus
  useEffect(() => {
    if (!isLockHeldByMe) return;

    const HEARTBEAT_INTERVAL_MS = 2 * 60 * 1000; // ~2 minutes

    const renewLock = async () => {
      // Only renew if tab has focus
      const isFocused =
        typeof document !== 'undefined' &&
        typeof document.hasFocus === 'function' &&
        document.hasFocus() &&
        document.visibilityState === 'visible';

      if (!isFocused) return;

      try {
        const res = await fetch(`/api/themes/${themeId}/lock`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': getCsrfToken(),
          },
          body: JSON.stringify({ lockType: 'EDIT' }),
          credentials: 'include',
        });

        if (res.status === 409) {
          const errData = await res.json().catch(() => ({}));
          setLockHolderInfo({
            holderName: errData.holderName || 'Another user',
            lockType: errData.lockType || 'EDIT',
            lockedAt: errData.lockedAt || new Date().toISOString(),
          });
          setIsLockHeldByMe(false);
          isLockHeldByMeRef.current = false;
        }
      } catch (err) {
        console.warn('[ThemeEditor] Lock heartbeat renewal failed:', err);
      }
    };

    const intervalId = setInterval(renewLock, HEARTBEAT_INTERVAL_MS);

    const handleFocusOrVisible = () => {
      if (
        typeof document !== 'undefined' &&
        typeof document.hasFocus === 'function' &&
        document.hasFocus() &&
        document.visibilityState === 'visible'
      ) {
        renewLock();
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, [themeId, isLockHeldByMe]);

  // 3. Best-effort release on beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isLockHeldByMeRef.current) {
        try {
          fetch(`/api/themes/${themeId}/lock`, {
            method: 'DELETE',
            headers: {
              'X-CSRF-Token': getCsrfToken(),
            },
            credentials: 'include',
            keepalive: true,
          });
        } catch {}
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [themeId]);

  // 4. Release on Back navigation
  const handleBack = async () => {
    if (isLockHeldByMeRef.current) {
      isLockHeldByMeRef.current = false;
      setIsLockHeldByMe(false);
      try {
        await fetch(`/api/themes/${themeId}/lock`, {
          method: 'DELETE',
          headers: {
            'X-CSRF-Token': getCsrfToken(),
          },
          credentials: 'include',
        });
      } catch (err) {
        console.warn('[ThemeEditor] Error releasing lock on back navigation:', err);
      }
    }
    onBack();
  };

  // Fetch available fonts
  const fetchFonts = useCallback(async () => {
    try {
      setFontsLoading(true);
      const res = await fetch('/api/fonts', { credentials: 'include' });
      if (res.ok) {
        const data: FontLibraryItem[] = await res.json();
        setAvailableFonts(data);
      }
    } catch (err) {
      console.warn('[ThemeEditor] Error loading fonts:', err);
    } finally {
      setFontsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFonts();
  }, [fetchFonts]);

  // Fetch theme details
  const fetchTheme = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/themes/${themeId}`, { credentials: 'include' });
      if (!res.ok) {
        throw new Error(`Failed to load theme (${res.status})`);
      }
      const data: Theme = await res.json();
      setTheme(data);
      setName(data.name);
      setBaseFontSize(data.baseFontSize || 16);

      let parsedColors: Record<string, string> = {};
      try {
        parsedColors =
          typeof data.colorValues === 'string'
            ? JSON.parse(data.colorValues)
            : (data.colorValues as Record<string, string>) || {};
      } catch {
        parsedColors = {};
      }
      setDraftColors({ ...CANONICAL_DEFAULT_TOKENS, ...parsedColors });

      let parsedDarkColors: Record<string, string> = {};
      try {
        parsedDarkColors =
          typeof data.darkColorValues === 'string'
            ? JSON.parse(data.darkColorValues)
            : (data.darkColorValues as Record<string, string>) || {};
      } catch {
        parsedDarkColors = {};
      }
      setDraftDarkColors({ ...CANONICAL_DEFAULT_DARK_TOKENS, ...parsedDarkColors });

      setDraftFontIds({
        generalFontId: data.generalFontId || null,
        navFontId: data.navFontId || null,
        headingsFontId: data.headingsFontId || null,
        buttonsFontId: data.buttonsFontId || null,
        formsFontId: data.formsFontId || null,
        cardsFontId: data.cardsFontId || null,
        linksFontId: data.linksFontId || null,
        statusFontId: data.statusFontId || null,
      });
    } catch (err: any) {
      console.error('[ThemeEditor] Error loading theme:', err);
      setError(err.message || 'Failed to load theme.');
    } finally {
      setLoading(false);
    }
  }, [themeId]);

  useEffect(() => {
    fetchTheme();
  }, [fetchTheme]);

  const isReadOnly = Boolean(
    !canEdit || Boolean(lockHolderInfo) || (theme && (theme.status === 'ACTIVE' || theme.isSmartCookieDefault))
  );

  // On-demand fetch of the Smart Cookie Default theme values for per-token reset
  const requestDefaultTheme = useCallback(async (): Promise<Record<string, string>> => {
    if (defaultThemeColors) return defaultThemeColors;

    try {
      const res = await fetch('/api/themes', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch themes');
      const themes: Theme[] = await res.json();
      const defaultTheme = themes.find((t) => t.isSmartCookieDefault);
      if (defaultTheme && defaultTheme.colorValues) {
        const parsed =
          typeof defaultTheme.colorValues === 'string'
            ? JSON.parse(defaultTheme.colorValues)
            : (defaultTheme.colorValues as Record<string, string>) || {};
        const merged = { ...CANONICAL_DEFAULT_TOKENS, ...parsed };
        setDefaultThemeColors(merged);
        return merged;
      }
    } catch (err) {
      console.warn('[ThemeEditor] Error requesting default theme from server:', err);
    }

    return CANONICAL_DEFAULT_TOKENS;
  }, [defaultThemeColors]);

  // On-demand fetch of the Smart Cookie Default theme dark values for per-token reset
  const requestDefaultThemeDark = useCallback(async (): Promise<Record<string, string>> => {
    if (defaultThemeDarkColors) return defaultThemeDarkColors;

    try {
      const res = await fetch('/api/themes', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch themes');
      const themes: Theme[] = await res.json();
      const defaultTheme = themes.find((t) => t.isSmartCookieDefault);
      if (defaultTheme && defaultTheme.darkColorValues) {
        const parsed =
          typeof defaultTheme.darkColorValues === 'string'
            ? JSON.parse(defaultTheme.darkColorValues)
            : (defaultTheme.darkColorValues as Record<string, string>) || {};
        const merged = { ...CANONICAL_DEFAULT_DARK_TOKENS, ...parsed };
        setDefaultThemeDarkColors(merged);
        return merged;
      }
    } catch (err) {
      console.warn('[ThemeEditor] Error requesting dark default theme from server:', err);
    }

    return CANONICAL_DEFAULT_DARK_TOKENS;
  }, [defaultThemeDarkColors]);

  // Autosave trigger for General fields, individual Color tokens, and Font group slots
  const saveField = async (updates: {
    name?: string;
    baseFontSize?: number;
    colorValues?: Record<string, string>;
    darkColorValues?: Record<string, string>;
    generalFontId?: string | null;
    navFontId?: string | null;
    headingsFontId?: string | null;
    buttonsFontId?: string | null;
    formsFontId?: string | null;
    cardsFontId?: string | null;
    linksFontId?: string | null;
    statusFontId?: string | null;
  }) => {
    if (isReadOnly || !theme) return;

    // Check if there is an actual change
    if (updates.name !== undefined && updates.name.trim() === theme.name) return;
    if (updates.baseFontSize !== undefined && updates.baseFontSize === theme.baseFontSize) return;

    const fontSlots: FontGroupSlot[] = [
      'generalFontId',
      'navFontId',
      'headingsFontId',
      'buttonsFontId',
      'formsFontId',
      'cardsFontId',
      'linksFontId',
      'statusFontId',
    ];

    const hasFontChange = fontSlots.some(
      (slot) => updates[slot] !== undefined && (updates[slot] ?? null) !== (theme[slot] ?? null)
    );

    let hasColorChange = false;
    if (updates.colorValues) {
      let existingColors: Record<string, string> = {};
      try {
        existingColors =
          typeof theme.colorValues === 'string'
            ? JSON.parse(theme.colorValues)
            : (theme.colorValues as Record<string, string>) || {};
      } catch {
        existingColors = {};
      }

      hasColorChange = Object.entries(updates.colorValues).some(
        ([k, v]) => (existingColors[k] || CANONICAL_DEFAULT_TOKENS[k]) !== v
      );
    }

    if (updates.darkColorValues) {
      let existingDark: Record<string, string> = {};
      try {
        existingDark =
          typeof theme.darkColorValues === 'string'
            ? JSON.parse(theme.darkColorValues)
            : (theme.darkColorValues as Record<string, string>) || {};
      } catch {
        existingDark = {};
      }

      hasColorChange =
        hasColorChange ||
        Object.entries(updates.darkColorValues).some(
          ([k, v]) => (existingDark[k] || CANONICAL_DEFAULT_DARK_TOKENS[k]) !== v
        );
    }

    if (
      !hasFontChange &&
      !hasColorChange &&
      updates.name === undefined &&
      updates.baseFontSize === undefined
    ) {
      return;
    }

    setSaveStatus('saving');
    setSaveError(null);

    try {
      const csrfToken = getCsrfToken();
      const res = await fetch(`/api/themes/${theme.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setLockHolderInfo({
            holderName: errData.holderName || 'Another user',
            lockType: errData.lockType || 'EDIT',
            lockedAt: errData.lockedAt || new Date().toISOString(),
          });
          setIsLockHeldByMe(false);
          isLockHeldByMeRef.current = false;
        }
        throw new Error(errData.error || `Failed to save changes (${res.status})`);
      }

      const updated: Theme = await res.json();
      setTheme(updated);
      setName(updated.name);
      setBaseFontSize(updated.baseFontSize);

      if (updated.colorValues) {
        const parsed =
          typeof updated.colorValues === 'string'
            ? JSON.parse(updated.colorValues)
            : (updated.colorValues as Record<string, string>) || {};
        setDraftColors((prev) => ({ ...prev, ...parsed }));
      }

      if (updated.darkColorValues) {
        const parsed =
          typeof updated.darkColorValues === 'string'
            ? JSON.parse(updated.darkColorValues)
            : (updated.darkColorValues as Record<string, string>) || {};
        setDraftDarkColors((prev) => ({ ...prev, ...parsed }));
      }

      setDraftFontIds({
        generalFontId: updated.generalFontId || null,
        navFontId: updated.navFontId || null,
        headingsFontId: updated.headingsFontId || null,
        buttonsFontId: updated.buttonsFontId || null,
        formsFontId: updated.formsFontId || null,
        cardsFontId: updated.cardsFontId || null,
        linksFontId: updated.linksFontId || null,
        statusFontId: updated.statusFontId || null,
      });

      setSaveStatus('saved');

      setTimeout(() => {
        setSaveStatus((prev) => (prev === 'saved' ? 'idle' : prev));
      }, 2500);

      // Refresh runtime theme tokens in case this theme is currently active or being tested
      themeRuntime.refetch().catch(() => {});
    } catch (err: any) {
      console.error('[ThemeEditor] Autosave failed:', err);
      setSaveStatus('error');
      setSaveError(err.message || 'Failed to save changes.');
    }
  };

  // Immediate draft font change for instant LivePreviewPane reactivity
  const handleFontChange = (slot: FontGroupSlot, fontId: string | null) => {
    setDraftFontIds((prev) => ({
      ...prev,
      [slot]: fontId,
    }));
  };

  // On-blur autosave handler for fonts
  const handleFontBlur = (slot: FontGroupSlot, fontId: string | null) => {
    saveField({ [slot]: fontId });
  };

  // Dynamically resolve preview font families for all 8 groups, ensuring General inheritance is immediate
  const previewFonts = useMemo(() => {
    const generalId = draftFontIds.generalFontId;
    let generalFamily = 'Inter';
    if (generalId) {
      const found = availableFonts.find((f) => f.id === generalId);
      if (found) generalFamily = found.familyName;
      else if (theme?.generalFont?.familyName) generalFamily = theme.generalFont.familyName;
    } else {
      const sys = availableFonts.find((f) => f.isSystem);
      if (sys) generalFamily = sys.familyName;
      else if (theme?.generalFont?.familyName) generalFamily = theme.generalFont.familyName;
    }

    const resolveGroupFamily = (slot: FontGroupSlot, themeFont?: { familyName: string } | null) => {
      const assignedId = draftFontIds[slot];
      if (!assignedId) {
        // Inherits General!
        return generalFamily;
      }
      const found = availableFonts.find((f) => f.id === assignedId);
      return found?.familyName || themeFont?.familyName || generalFamily;
    };

    return {
      general: generalFamily,
      nav: resolveGroupFamily('navFontId', theme?.navFont),
      headings: resolveGroupFamily('headingsFontId', theme?.headingsFont),
      buttons: resolveGroupFamily('buttonsFontId', theme?.buttonsFont),
      forms: resolveGroupFamily('formsFontId', theme?.formsFont),
      cards: resolveGroupFamily('cardsFontId', theme?.cardsFont),
      links: resolveGroupFamily('linksFontId', theme?.linksFont),
      status: resolveGroupFamily('statusFontId', theme?.statusFont),
    };
  }, [draftFontIds, availableFonts, theme]);

  const handleNameBlur = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      if (theme) setName(theme.name);
      return;
    }
    if (theme && trimmed !== theme.name) {
      saveField({ name: trimmed });
    }
  };

  const handleBaseFontSizeBlur = () => {
    const validSize = Math.max(12, Math.min(24, Math.round(Number(baseFontSize)) || 16));
    setBaseFontSize(validSize);
    if (theme && validSize !== theme.baseFontSize) {
      saveField({ baseFontSize: validSize });
    }
  };

  // Color draft state updater for live preview (Task 12 readiness)
  const handleColorChange = (tokenKey: string, newValue: string) => {
    setDraftColors((prev) => ({
      ...prev,
      [tokenKey]: newValue,
    }));
  };

  // Color blur updater that triggers autosave-on-blur
  const handleColorBlur = (tokenKey: string, newValue: string) => {
    saveField({ colorValues: { [tokenKey]: newValue } });
  };

  // Dark color draft state updater for live preview
  const handleDarkColorChange = (tokenKey: string, newValue: string) => {
    setDraftDarkColors((prev) => ({
      ...prev,
      [tokenKey]: newValue,
    }));
  };

  // Dark color blur updater that triggers autosave-on-blur
  const handleDarkColorBlur = (tokenKey: string, newValue: string) => {
    saveField({ darkColorValues: { [tokenKey]: newValue } });
  };

  // Search match calculations across tabs
  const searchStats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return {
        general: 0,
        colors: 0,
        fonts: 0,
        total: 0,
        firstMatchTab: null as 'general' | 'colors' | 'fonts' | null,
      };
    }

    // General tab search matches
    let general = 0;
    if (
      'theme name information identifier'.includes(q) ||
      (theme?.name || '').toLowerCase().includes(q)
    ) {
      general++;
    }
    if ('base font size typography scaling pixels presets 16px rem'.includes(q)) {
      general++;
    }

    // Colors tab search matches
    const colors = COLOR_TOKENS.filter(
      (t) =>
        t.label.toLowerCase().includes(q) ||
        t.key.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.group.toLowerCase().includes(q) ||
        (draftColors[t.key] || t.defaultValue).toLowerCase().includes(q)
    ).length;

    // Fonts tab search matches
    let fonts = 0;
    const fontGroupKeywords = [
      'general',
      'nav',
      'navigation',
      'headings',
      'buttons',
      'forms',
      'inputs',
      'cards',
      'panels',
      'links',
      'status',
      'feedback',
      'inherit',
      'inter',
      'smart cookie default',
      'typography',
    ];
    fontGroupKeywords.forEach((k) => {
      if (k.includes(q) || q.includes(k)) fonts++;
    });
    availableFonts.forEach((f) => {
      if (f.familyName.toLowerCase().includes(q) || (f.name && f.name.toLowerCase().includes(q))) {
        fonts++;
      }
    });

    let firstMatchTab: 'general' | 'colors' | 'fonts' | null = null;
    if (colors > 0) firstMatchTab = 'colors';
    else if (general > 0) firstMatchTab = 'general';
    else if (fonts > 0) firstMatchTab = 'fonts';

    return {
      general,
      colors,
      fonts,
      total: general + colors + fonts,
      firstMatchTab,
    };
  }, [searchQuery, draftColors, theme?.name, availableFonts]);

  // Handle search input change with automatic tab switching if match is on another tab
  const handleSearchChange = (newQuery: string) => {
    setSearchQuery(newQuery);
    const q = newQuery.trim().toLowerCase();
    if (q) {
      // If current tab has 0 matches, but another tab has matches, auto-switch to that tab
      const isMatchInColors = COLOR_TOKENS.some(
        (t) =>
          t.label.toLowerCase().includes(q) ||
          t.key.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.group.toLowerCase().includes(q) ||
          (draftColors[t.key] || t.defaultValue).toLowerCase().includes(q)
      );
      const isMatchInGeneral =
        'theme name information'.includes(q) ||
        'base font size typography scaling 16px'.includes(q) ||
        (theme?.name || '').toLowerCase().includes(q);
      const isMatchInFonts =
        [
          'general',
          'nav',
          'navigation',
          'headings',
          'buttons',
          'forms',
          'inputs',
          'cards',
          'panels',
          'links',
          'status',
          'feedback',
          'inherit',
          'inter',
          'smart cookie default',
          'typography',
        ].some((k) => k.includes(q) || q.includes(k)) ||
        availableFonts.some(
          (f) =>
            f.familyName.toLowerCase().includes(q) ||
            (f.name && f.name.toLowerCase().includes(q))
        );

      if (activeTab === 'general' && !isMatchInGeneral) {
        if (isMatchInColors) setActiveTab('colors');
        else if (isMatchInFonts) setActiveTab('fonts');
      } else if (activeTab === 'colors' && !isMatchInColors) {
        if (isMatchInGeneral) setActiveTab('general');
        else if (isMatchInFonts) setActiveTab('fonts');
      } else if (activeTab === 'fonts' && !isMatchInFonts) {
        if (isMatchInColors) setActiveTab('colors');
        else if (isMatchInGeneral) setActiveTab('general');
      }
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (searchStats.firstMatchTab && searchStats.firstMatchTab !== activeTab) {
        setActiveTab(searchStats.firstMatchTab);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-8" id="theme-editor-loading">
        <Loader2 className="h-8 w-8 animate-spin text-link-primary mb-3" />
        <p className="text-sm text-text-muted font-sans">Loading theme details...</p>
      </div>
    );
  }

  if (error || !theme) {
    return (
      <div className="rounded-2xl border border-status-error-bg bg-card-bg p-8 text-center" id="theme-editor-error">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-status-error-bg text-status-error-text mb-4">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-bold text-text-heading font-sans">Failed to Load Theme</h3>
        <p className="text-sm text-text-muted mt-1 max-w-md mx-auto font-sans">{error || 'Theme not found.'}</p>
        <button
          onClick={onBack}
          className="mt-6 inline-flex items-center space-x-2 rounded-xl border border-card-border bg-card-bg px-4 py-2 text-sm font-semibold text-text-heading shadow-sm hover:bg-card-header-bg"
          id="theme-editor-back-to-list-error-btn"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Themes</span>
        </button>
      </div>
    );
  }

  const cleanQuery = searchQuery.trim().toLowerCase();
  const isGeneralNameMatched = cleanQuery && ('theme name'.includes(cleanQuery) || (theme.name || '').toLowerCase().includes(cleanQuery));
  const isGeneralFontSizeMatched = cleanQuery && ('base font size typography scaling 16px rem'.includes(cleanQuery));

  return (
    <div className="space-y-6" id="theme-editor-root">
      {/* Editor Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-card-border">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-card-border bg-card-bg text-text-body shadow-sm transition-colors hover:bg-card-header-bg"
            id="theme-editor-back-btn"
            title="Back to Themes List"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-bold text-text-heading font-sans" id="theme-editor-title">
                {theme.name}
              </h2>
              {/* Status Badges */}
              {theme.status === 'ACTIVE' && (
                <span className="inline-flex items-center rounded-full bg-status-success-bg px-2.5 py-0.5 text-xs font-semibold text-status-success-text border border-status-success-text/20">
                  Active
                </span>
              )}
              {theme.status === 'READY' && (
                <span className="inline-flex items-center rounded-full bg-status-info-bg px-2.5 py-0.5 text-xs font-semibold text-status-info-text border border-status-info-text/20">
                  Ready
                </span>
              )}
              {theme.status === 'DRAFT' && (
                <span className="inline-flex items-center rounded-full bg-card-header-bg px-2.5 py-0.5 text-xs font-semibold text-text-muted border border-card-border">
                  Draft
                </span>
              )}
              {theme.isSmartCookieDefault && (
                <span className="inline-flex items-center rounded-full bg-status-warning-bg px-2.5 py-0.5 text-xs font-semibold text-status-warning-text border border-status-warning-text/20">
                  System Default
                </span>
              )}
              {theme.scheduledActivationAt && (
                <span
                  className="inline-flex items-center space-x-1 rounded-full bg-status-info-bg px-2.5 py-0.5 text-xs font-semibold text-status-info-text border border-status-info-text/20"
                  id="theme-editor-scheduled-badge"
                  title={`Scheduled for ${new Date(theme.scheduledActivationAt).toLocaleString()}`}
                >
                  <CalendarClock className="h-3 w-3" />
                  <span>Scheduled</span>
                </span>
              )}
              {theme.scheduledActivationFailedAt && (
                <span
                  className="inline-flex items-center space-x-1 rounded-full bg-status-error-bg px-2.5 py-0.5 text-xs font-semibold text-status-error-text border border-status-error-text/20"
                  id="theme-editor-failed-badge"
                  title={`Scheduled activation failed: ${theme.scheduledActivationFailedReason || 'Unknown error'}`}
                >
                  <AlertCircle className="h-3 w-3" />
                  <span>Activation Failed</span>
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-1 font-sans">
              ID: <span className="font-mono text-[11px]">{theme.id}</span>
            </p>
          </div>
        </div>

        {/* Header Right: Single Search Input & Autosave Status Indicator */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Header Search Input */}
          <div className="relative w-full sm:w-64 md:w-72" id="theme-editor-search-container">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
            <input
              id="theme-editor-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search tokens & settings..."
              className="w-full rounded-xl border border-input-border bg-card-bg pl-9 pr-8 py-2 text-xs text-text-heading placeholder-text-muted shadow-2xs transition-colors focus:border-input-border-focus focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-heading p-0.5 rounded transition-colors"
                title="Clear search"
                id="theme-editor-clear-search-btn"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Autosave Status Indicator */}
          <div className="flex items-center space-x-3 shrink-0" id="theme-editor-autosave-indicator">
            {saveStatus === 'saving' && (
              <div className="flex items-center space-x-2 text-xs text-text-muted bg-card-header-bg px-3 py-1.5 rounded-full border border-card-border">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-link-primary" />
                <span>Saving changes...</span>
              </div>
            )}
            {saveStatus === 'saved' && (
              <div className="flex items-center space-x-2 text-xs text-status-success-text bg-status-success-bg px-3 py-1.5 rounded-full border border-status-success-text/20">
                <CheckCircle className="h-3.5 w-3.5" />
                <span>All changes saved</span>
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="flex items-center space-x-2 text-xs text-status-error-text bg-status-error-bg px-3 py-1.5 rounded-full border border-status-error-text/20">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{saveError || 'Save failed'}</span>
              </div>
            )}
            {saveStatus === 'idle' && !isReadOnly && (
              <div className="flex items-center space-x-2 text-xs text-text-muted bg-card-header-bg/60 px-3 py-1.5 rounded-full border border-card-border">
                <span className="h-2 w-2 rounded-full bg-status-success-text" />
                <span>Autosave on blur enabled</span>
              </div>
            )}
            {isReadOnly && (
              <div className="flex items-center space-x-2 text-xs text-text-muted bg-card-header-bg px-3 py-1.5 rounded-full border border-card-border">
                <Lock className="h-3.5 w-3.5 text-text-muted" />
                <span>Read-only</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Read-Only / Lock Notice Banner */}
      {isReadOnly && (
        <div
          className={`flex items-start space-x-3 p-4 rounded-xl border ${
            lockHolderInfo
              ? 'bg-status-warning-bg/40 border-status-warning-text/30 text-status-warning-text'
              : theme?.isSmartCookieDefault
              ? 'bg-status-warning-bg/40 border-status-warning-text/20 text-status-warning-text'
              : theme?.status === 'ACTIVE'
              ? 'bg-status-info-bg/40 border-status-info-text/20 text-status-info-text'
              : 'bg-card-header-bg border-card-border text-text-muted'
          }`}
          id={lockHolderInfo ? 'theme-editor-lock-banner' : 'theme-editor-readonly-banner'}
          data-testid="theme-editor-lock-banner"
          data-holder-name={lockHolderInfo?.holderName}
        >
          <Lock className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-sm font-sans">
            <h4 className="font-semibold text-text-heading" id="theme-editor-lock-banner-heading">
              {lockHolderInfo
                ? `${lockHolderInfo.holderName} is currently ${lockHolderInfo.lockType === 'TEST' ? 'testing' : 'editing'}`
                : theme?.isSmartCookieDefault
                ? 'System Default Theme (Read-Only)'
                : theme?.status === 'ACTIVE'
                ? 'Active Theme (Read-Only)'
                : 'View-Only Access'}
            </h4>
            <p className="mt-0.5 text-xs text-text-muted" id="theme-editor-lock-banner-description">
              {lockHolderInfo
                ? `${lockHolderInfo.holderName} is currently ${lockHolderInfo.lockType === 'TEST' ? 'testing' : 'editing'} this theme. The editor is in read-only mode to prevent conflicting modifications.`
                : theme?.isSmartCookieDefault
                ? 'The Smart Cookie Default theme is system-managed and cannot be directly modified. Create a copy to customize this theme.'
                : theme?.status === 'ACTIVE'
                ? 'Active themes are locked to prevent inadvertent layout or styling breaks. Create a copy or edit in Draft/Ready status.'
                : 'You do not have permission to edit themes. All fields are displayed in read-only mode.'}
            </p>
          </div>
        </div>
      )}

      {/* Tabs Navigation & Live Preview Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-card-border gap-2" id="theme-editor-tabs-bar">
        <div className="flex space-x-2" id="theme-editor-tabs">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center space-x-2 py-3 px-4 border-b-2 text-sm font-semibold transition-colors ${
              activeTab === 'general'
                ? 'border-link-primary text-link-primary'
                : 'border-transparent text-text-muted hover:text-text-heading'
            }`}
            id="tab-theme-general"
          >
            <Settings className="h-4 w-4" />
            <span>General</span>
            {cleanQuery && searchStats.general > 0 && (
              <span className="rounded-full bg-link-primary/10 px-2 py-0.5 text-xs font-bold text-link-primary">
                {searchStats.general}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('colors')}
            className={`flex items-center space-x-2 py-3 px-4 border-b-2 text-sm font-semibold transition-colors ${
              activeTab === 'colors'
                ? 'border-link-primary text-link-primary'
                : 'border-transparent text-text-muted hover:text-text-heading'
            }`}
            id="tab-theme-colors"
          >
            <Palette className="h-4 w-4" />
            <span>Colors</span>
            {cleanQuery && searchStats.colors > 0 && (
              <span className="rounded-full bg-link-primary/10 px-2 py-0.5 text-xs font-bold text-link-primary">
                {searchStats.colors}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('fonts')}
            className={`flex items-center space-x-2 py-3 px-4 border-b-2 text-sm font-semibold transition-colors ${
              activeTab === 'fonts'
                ? 'border-link-primary text-link-primary'
                : 'border-transparent text-text-muted hover:text-text-heading'
            }`}
            id="tab-theme-fonts"
          >
            <Type className="h-4 w-4" />
            <span>Fonts</span>
            {cleanQuery && searchStats.fonts > 0 && (
              <span className="rounded-full bg-link-primary/10 px-2 py-0.5 text-xs font-bold text-link-primary">
                {searchStats.fonts}
              </span>
            )}
          </button>
        </div>

        {/* Live Preview Toggle Button */}
        <button
          type="button"
          onClick={() => setShowPreview((p) => !p)}
          className={`self-start sm:self-center flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all mb-2 sm:mb-0 ${
            showPreview
              ? 'bg-link-primary text-btn-primary-text border-link-primary shadow-2xs'
              : 'bg-card-bg text-text-body border-card-border hover:bg-card-header-bg'
          }`}
          title={showPreview ? 'Hide live component preview pane' : 'Show live component preview pane'}
          id="theme-editor-toggle-preview-btn"
        >
          {showPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          <span>{showPreview ? 'Hide Preview' : 'Live Preview'}</span>
        </button>
      </div>

      {/* Cross-tab Search Quick Jumper Banner */}
      {cleanQuery && searchStats.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-card-header-bg/60 border border-card-border text-xs">
          <div className="flex items-center space-x-2 text-text-body">
            <Search className="h-3.5 w-3.5 text-link-primary shrink-0" />
            <span>
              Found <strong className="font-semibold text-text-heading">{searchStats.total}</strong> results for "
              <span className="text-link-primary">{searchQuery}</span>". Jump to tab:
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('general')}
              disabled={searchStats.general === 0}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'general'
                  ? 'bg-link-primary text-btn-primary-text shadow-2xs'
                  : searchStats.general > 0
                  ? 'bg-card-bg text-text-body border border-card-border hover:bg-card-header-bg'
                  : 'opacity-40 cursor-not-allowed text-text-muted'
              }`}
            >
              General ({searchStats.general})
            </button>
            <button
              onClick={() => setActiveTab('colors')}
              disabled={searchStats.colors === 0}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'colors'
                  ? 'bg-link-primary text-btn-primary-text shadow-2xs'
                  : searchStats.colors > 0
                  ? 'bg-card-bg text-text-body border border-card-border hover:bg-card-header-bg'
                  : 'opacity-40 cursor-not-allowed text-text-muted'
              }`}
            >
              Colors ({searchStats.colors})
            </button>
            <button
              onClick={() => setActiveTab('fonts')}
              disabled={searchStats.fonts === 0}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'fonts'
                  ? 'bg-link-primary text-btn-primary-text shadow-2xs'
                  : searchStats.fonts > 0
                  ? 'bg-card-bg text-text-body border border-card-border hover:bg-card-header-bg'
                  : 'opacity-40 cursor-not-allowed text-text-muted'
              }`}
            >
              Fonts ({searchStats.fonts})
            </button>
          </div>
        </div>
      )}

      {/* Editor Body Grid: Tabs & Live Preview Pane */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start" id="theme-editor-body-grid">
        {/* Left / Main Editor Tabs Column */}
        <div className={showPreview ? 'xl:col-span-7 space-y-6' : 'xl:col-span-12 space-y-6'}>
          {/* Tab 1: General */}
          {activeTab === 'general' && (
        <div className="space-y-6" id="theme-tab-general-content">
          <CollapsibleSection
            id="section-theme-information"
            title="Theme Information"
            description="Configure the primary identifier and metadata for this theme."
            defaultOpen={true}
          >
            <div className="space-y-4 max-w-xl">
              <div
                className={`p-3 rounded-xl transition-all ${
                  isGeneralNameMatched
                    ? 'border border-link-primary bg-link-primary/5 ring-1 ring-link-primary/40'
                    : ''
                }`}
              >
                <label
                  htmlFor="theme-name-input"
                  className="block text-sm font-semibold text-text-heading font-sans mb-1.5"
                >
                  Theme Name <span className="text-status-error-text">*</span>
                </label>
                <input
                  id="theme-name-input"
                  type="text"
                  disabled={isReadOnly}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={handleNameBlur}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  }}
                  className={`w-full rounded-xl border border-input-border bg-card-bg px-3.5 py-2.5 text-sm text-text-heading shadow-sm transition-colors focus:border-input-border-focus focus:outline-none ${
                    isReadOnly ? 'cursor-not-allowed bg-card-header-bg/60 opacity-80' : ''
                  }`}
                  placeholder="e.g. Modern Navy, Midnight High-Contrast"
                />
                <p className="mt-1 text-xs text-text-muted font-sans">
                  Saves automatically when you click outside the input field.
                </p>
              </div>

              <div className="pt-2 px-3">
                <label className="block text-sm font-semibold text-text-heading font-sans mb-1">
                  Status
                </label>
                <div className="text-sm text-text-muted font-sans">
                  Current state:{' '}
                  <span className="font-semibold text-text-heading">{theme.status}</span>
                  {theme.isSmartCookieDefault && ' (System Default)'}
                </div>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            id="section-typography-scaling"
            title="Typography Base Scaling"
            description="Adjust the root font size that drives CSS REM calculations across all interface elements."
            defaultOpen={true}
          >
            <div className="space-y-4 max-w-xl">
              <div
                className={`p-3 rounded-xl transition-all ${
                  isGeneralFontSizeMatched
                    ? 'border border-link-primary bg-link-primary/5 ring-1 ring-link-primary/40'
                    : ''
                }`}
              >
                <label
                  htmlFor="theme-base-font-size-input"
                  className="block text-sm font-semibold text-text-heading font-sans mb-1.5"
                >
                  Base Font Size (px)
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    id="theme-base-font-size-input"
                    type="number"
                    min={12}
                    max={24}
                    step={1}
                    disabled={isReadOnly}
                    value={baseFontSize}
                    onChange={(e) => setBaseFontSize(Number(e.target.value))}
                    onBlur={handleBaseFontSizeBlur}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    }}
                    className={`w-32 rounded-xl border border-input-border bg-card-bg px-3.5 py-2.5 text-sm text-text-heading shadow-sm transition-colors focus:border-input-border-focus focus:outline-none ${
                      isReadOnly ? 'cursor-not-allowed bg-card-header-bg/60 opacity-80' : ''
                    }`}
                  />
                  <span className="text-sm text-text-muted font-sans">pixels (default: 16px)</span>
                </div>
                <p className="mt-1 text-xs text-text-muted font-sans">
                  Governs the <code className="bg-card-header-bg px-1 py-0.5 rounded text-[11px]">--font-size-base</code> custom property. Valid range: 12px – 24px.
                </p>
              </div>

              {/* Quick preset buttons */}
              {!isReadOnly && (
                <div className="px-3">
                  <label className="block text-xs font-semibold text-text-muted font-sans mb-2">
                    Quick Presets
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[14, 15, 16, 17, 18].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setBaseFontSize(size);
                          if (theme && size !== theme.baseFontSize) {
                            saveField({ baseFontSize: size });
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          baseFontSize === size
                            ? 'bg-link-primary text-btn-primary-text border-link-primary shadow-sm'
                            : 'bg-card-bg text-text-body border-card-border hover:bg-card-header-bg'
                        }`}
                        id={`preset-size-${size}-btn`}
                      >
                        {size}px {size === 16 ? '(Default)' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>
        </div>
      )}

      {/* Tab 2: Colors (Full 28-token grouped editor with swatches, hex sync, alpha, on-demand reset, and Light/Dark sub-mode) */}
      {activeTab === 'colors' && (
        <ColorEditorTab
          draftColors={draftColors}
          draftDarkColors={draftDarkColors}
          colorSubMode={colorSubMode}
          onColorSubModeChange={setColorSubMode}
          isReadOnly={isReadOnly}
          searchQuery={searchQuery}
          onColorChange={handleColorChange}
          onColorBlur={handleColorBlur}
          onDarkColorChange={handleDarkColorChange}
          onDarkColorBlur={handleDarkColorBlur}
          defaultThemeColors={defaultThemeColors}
          defaultThemeDarkColors={defaultThemeDarkColors}
          onRequestDefaultTheme={requestDefaultTheme}
          onRequestDefaultThemeDark={requestDefaultThemeDark}
        />
      )}

      {/* Tab 3: Fonts (Full per-group font assignment with General inheritance) */}
      {activeTab === 'fonts' && (
        <FontEditorTab
          draftFontIds={draftFontIds}
          isReadOnly={isReadOnly}
          searchQuery={searchQuery}
          onFontChange={handleFontChange}
          onFontBlur={handleFontBlur}
          availableFonts={availableFonts}
          fontsLoading={fontsLoading}
        />
      )}
        </div>

        {/* Right / Live Preview Column */}
        {showPreview && (
          <div className="xl:col-span-5 w-full" id="theme-editor-preview-column">
            <LivePreviewPane
              themeName={name}
              baseFontSize={baseFontSize}
              draftColors={colorSubMode === 'dark' ? draftDarkColors : draftColors}
              mode={colorSubMode}
              fonts={previewFonts}
            />
          </div>
        )}
      </div>
    </div>
  );
};

