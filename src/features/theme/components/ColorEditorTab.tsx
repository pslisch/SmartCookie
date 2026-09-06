import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Check,
  Sparkles,
  Sliders,
  Layers,
  Sun,
  Moon,
} from 'lucide-react';
import {
  ColorTokenDef,
  ColorTokenGroup,
  COLOR_TOKEN_GROUPS,
  COLOR_TOKENS,
  CANONICAL_DEFAULT_TOKENS,
  CANONICAL_DEFAULT_DARK_TOKENS,
  parseColorToHexAndAlpha,
  formatColorString,
} from '../constants/themeTokens';

export interface ColorEditorTabProps {
  draftColors: Record<string, string>;
  draftDarkColors?: Record<string, string>;
  isReadOnly: boolean;
  searchQuery: string;
  onColorChange: (tokenKey: string, newValue: string) => void;
  onColorBlur: (tokenKey: string, newValue: string) => void;
  onDarkColorChange?: (tokenKey: string, newValue: string) => void;
  onDarkColorBlur?: (tokenKey: string, newValue: string) => void;
  colorSubMode?: 'light' | 'dark';
  onColorSubModeChange?: (mode: 'light' | 'dark') => void;
  defaultThemeColors?: Record<string, string> | null;
  defaultThemeDarkColors?: Record<string, string> | null;
  onRequestDefaultTheme?: () => Promise<Record<string, string>>;
  onRequestDefaultThemeDark?: () => Promise<Record<string, string>>;
}

// Group icons / descriptions for section headers
const GROUP_META: Record<
  ColorTokenGroup,
  { title: string; description: string; tokenCount: number }
> = {
  'Navigation/Header': {
    title: 'Navigation & Header',
    description: 'Surfaces, text, and active indicators for the main header and navigation bars.',
    tokenCount: 3,
  },
  'Text/Headings': {
    title: 'Typography & Text Hierarchy',
    description: 'Headings, standard body text, secondary muted copy, and inverse contrast text.',
    tokenCount: 4,
  },
  Buttons: {
    title: 'Buttons & Action Surfaces',
    description: 'Primary action buttons, hover states, and button foreground typography.',
    tokenCount: 3,
  },
  'Forms/Inputs': {
    title: 'Forms & Input Controls',
    description: 'Border strokes and focus rings for inputs, selects, and checkboxes.',
    tokenCount: 2,
  },
  'Cards/Panels': {
    title: 'Cards, Modals & Surfaces',
    description: 'Background fills, perimeter borders, and header bars for elevated containers.',
    tokenCount: 3,
  },
  Links: {
    title: 'Interactive Links',
    description: 'Inline text links, actionable breadcrumbs, and hover states.',
    tokenCount: 2,
  },
  'Status/Feedback': {
    title: 'Semantic Status & Feedback',
    description: 'Backgrounds and foreground text/icons for success, warning, error, and info states.',
    tokenCount: 8,
  },
  Backgrounds: {
    title: 'Canvas & Background Surfaces',
    description: 'Application viewport canvas, subtle secondary fills, and modal backdrop overlay.',
    tokenCount: 3,
  },
};

/**
 * Individual Token Row Component
 */
interface TokenFieldRowProps {
  token: ColorTokenDef;
  currentValue: string;
  defaultVal: string;
  isReadOnly: boolean;
  searchQuery: string;
  onColorChange: (tokenKey: string, newValue: string) => void;
  onColorBlur: (tokenKey: string, newValue: string) => void;
  onReset: (tokenKey: string) => Promise<void>;
  isResetting: boolean;
  justReset: boolean;
}

const TokenFieldRow: React.FC<TokenFieldRowProps> = ({
  token,
  currentValue,
  defaultVal,
  isReadOnly,
  searchQuery,
  onColorChange,
  onColorBlur,
  onReset,
  isResetting,
  justReset,
}) => {
  const { hex, alpha } = parseColorToHexAndAlpha(currentValue);
  const [localHexInput, setLocalHexInput] = useState<string>(hex);
  const [localAlpha, setLocalAlpha] = useState<number>(alpha);

  // Sync internal input state when external currentValue changes
  useEffect(() => {
    const parsed = parseColorToHexAndAlpha(currentValue);
    setLocalHexInput(parsed.hex);
    setLocalAlpha(parsed.alpha);
  }, [currentValue]);

  // Highlight matches when search query is active
  const isQueryMatched =
    searchQuery.trim().length > 0 &&
    (token.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      currentValue.toLowerCase().includes(searchQuery.toLowerCase()));

  // Handle swatch picker change
  const handlePickerChange = (pickedHex: string) => {
    if (isReadOnly) return;
    setLocalHexInput(pickedHex);
    const formatted = formatColorString(pickedHex, localAlpha, token.supportsAlpha);
    onColorChange(token.key, formatted);
  };

  const handlePickerBlur = () => {
    if (isReadOnly) return;
    const formatted = formatColorString(localHexInput, localAlpha, token.supportsAlpha);
    onColorBlur(token.key, formatted);
  };

  // Handle manual hex typing
  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    const val = e.target.value;
    setLocalHexInput(val);

    // If valid 3, 6, or 8 digit hex or starting with #, update draft immediately
    if (/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(val)) {
      const normalizedHex = val.startsWith('#') ? val : `#${val}`;
      const formatted = formatColorString(normalizedHex, localAlpha, token.supportsAlpha);
      onColorChange(token.key, formatted);
    }
  };

  const handleHexInputBlur = () => {
    if (isReadOnly) return;
    let cleanHex = localHexInput.trim();
    if (!cleanHex.startsWith('#')) {
      cleanHex = `#${cleanHex}`;
    }

    // Validate 6-digit hex
    if (!/^#([0-9a-fA-F]{6})$/.test(cleanHex)) {
      // Revert to valid draft color
      const parsed = parseColorToHexAndAlpha(currentValue);
      setLocalHexInput(parsed.hex);
      return;
    }

    setLocalHexInput(cleanHex.toLowerCase());
    const formatted = formatColorString(cleanHex, localAlpha, token.supportsAlpha);
    onColorBlur(token.key, formatted);
  };

  // Handle Alpha slider change
  const handleAlphaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    const newAlpha = parseInt(e.target.value, 10);
    setLocalAlpha(newAlpha);
    const formatted = formatColorString(localHexInput, newAlpha, token.supportsAlpha);
    onColorChange(token.key, formatted);
  };

  const handleAlphaBlur = () => {
    if (isReadOnly) return;
    const formatted = formatColorString(localHexInput, localAlpha, token.supportsAlpha);
    onColorBlur(token.key, formatted);
  };

  // Check if token differs from standard default
  const isCustomized = currentValue.toLowerCase() !== defaultVal.toLowerCase();

  return (
    <div
      id={`token-field-${token.key}`}
      className={`group relative rounded-xl border p-4 transition-all ${
        isQueryMatched
          ? 'border-link-primary bg-link-primary/5 shadow-xs ring-1 ring-link-primary/40'
          : 'border-card-border bg-card-bg hover:border-card-border/90 hover:bg-card-header-bg/20'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Token Label & Meta */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center space-x-2">
            <label
              htmlFor={`color-input-${token.key}`}
              className="text-sm font-semibold text-text-heading font-sans truncate cursor-pointer"
            >
              {token.label}
            </label>
            {token.supportsAlpha && (
              <span className="inline-flex items-center space-x-1 rounded-md bg-status-info-bg px-1.5 py-0.5 text-[10px] font-semibold text-status-info-text border border-status-info-text/20">
                <Sliders className="h-2.5 w-2.5" />
                <span>Alpha</span>
              </span>
            )}
            {isCustomized && (
              <span className="inline-flex items-center rounded-md bg-card-header-bg px-1.5 py-0.5 text-[10px] font-medium text-text-muted border border-card-border">
                Customized
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted mt-0.5 font-sans leading-relaxed">
            {token.description}
          </p>
          <div className="mt-1 flex items-center space-x-2 text-[11px] text-text-muted">
            <span className="font-mono text-[10px] text-text-muted/80">{token.key}</span>
            <span>•</span>
            <span>
              Default:{' '}
              <code className="font-mono text-[10px] bg-card-header-bg px-1 py-0.2 rounded">
                {defaultVal}
              </code>
            </span>
          </div>
        </div>

        {/* Controls Container: Swatch, Hex Input, Reset Button */}
        <div className="flex items-center space-x-2.5 shrink-0 self-start sm:self-center">
          {/* Swatch with Checkerboard Pattern (for transparency) + Native Picker */}
          <div className="relative">
            <div
              className="relative h-9 w-9 rounded-xl border border-card-border shadow-xs overflow-hidden cursor-pointer shrink-0 transition-transform active:scale-95 ring-1 ring-black/5"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                backgroundSize: '8px 8px',
                backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
              }}
            >
              {/* Color overlay layer */}
              <div
                className="absolute inset-0 w-full h-full"
                style={{ backgroundColor: currentValue }}
              />

              {/* Native color picker input overlaid invisibly for click target */}
              <input
                id={`color-picker-${token.key}`}
                type="color"
                disabled={isReadOnly}
                value={localHexInput.startsWith('#') && localHexInput.length === 7 ? localHexInput : '#000000'}
                onChange={(e) => handlePickerChange(e.target.value)}
                onBlur={handlePickerBlur}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
                title={`Pick color for ${token.label}`}
              />
            </div>
          </div>

          {/* Hex Text Input */}
          <div className="relative w-28">
            <input
              id={`color-input-${token.key}`}
              type="text"
              disabled={isReadOnly}
              value={localHexInput}
              onChange={handleHexInputChange}
              onBlur={handleHexInputBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
              placeholder="#000000"
              maxLength={9}
              className={`w-full rounded-xl border border-input-border bg-card-bg px-2.5 py-1.5 text-xs font-mono text-text-heading shadow-xs transition-colors focus:border-input-border-focus focus:outline-none ${
                isReadOnly ? 'cursor-not-allowed bg-card-header-bg/60 opacity-80' : ''
              }`}
            />
          </div>

          {/* Reset to Default Icon Button (Not shown persistently - visible on hover or focus) */}
          {!isReadOnly && (
            <div className="relative flex items-center">
              <button
                type="button"
                onClick={() => onReset(token.key)}
                disabled={isResetting || !isCustomized}
                title={
                  !isCustomized
                    ? 'Already set to system default'
                    : `Reset to Default (${defaultVal})`
                }
                className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
                  !isCustomized
                    ? 'opacity-0 group-hover:opacity-30 border-transparent text-text-muted cursor-default'
                    : 'opacity-0 group-hover:opacity-100 focus:opacity-100 border-card-border bg-card-bg text-text-muted hover:border-link-primary hover:text-link-primary hover:bg-card-header-bg shadow-2xs'
                }`}
                id={`reset-token-${token.key}-btn`}
              >
                {justReset ? (
                  <Check className="h-3.5 w-3.5 text-status-success-text" />
                ) : (
                  <RotateCcw
                    className={`h-3.5 w-3.5 ${isResetting ? 'animate-spin text-link-primary' : ''}`}
                  />
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Alpha Range Slider (Rendered only for tokens flagged in Task 1, e.g. bg-overlay) */}
      {token.supportsAlpha && (
        <div className="mt-3 pt-3 border-t border-card-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2 text-xs text-text-muted font-sans">
            <Layers className="h-3.5 w-3.5 text-text-muted/80" />
            <span>Opacity / Alpha:</span>
            <span className="font-mono font-semibold text-text-heading">{localAlpha}%</span>
          </div>
          <div className="flex items-center space-x-3 w-full sm:w-60">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              disabled={isReadOnly}
              value={localAlpha}
              onChange={handleAlphaChange}
              onBlur={handleAlphaBlur}
              className="w-full h-1.5 bg-card-header-bg rounded-lg appearance-none cursor-pointer accent-link-primary disabled:cursor-not-allowed"
              id={`alpha-slider-${token.key}`}
              title={`Adjust transparency for ${token.label}`}
            />
            <span className="text-[11px] font-mono text-text-muted w-8 text-right">
              {Math.round(localAlpha)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Main ColorEditorTab Component
 */
export const ColorEditorTab: React.FC<ColorEditorTabProps> = ({
  draftColors,
  draftDarkColors,
  isReadOnly,
  searchQuery,
  onColorChange,
  onColorBlur,
  onDarkColorChange,
  onDarkColorBlur,
  colorSubMode,
  onColorSubModeChange,
  defaultThemeColors,
  defaultThemeDarkColors,
  onRequestDefaultTheme,
  onRequestDefaultThemeDark,
}) => {
  // Light / Dark sub-mode state
  const [internalMode, setInternalMode] = useState<'light' | 'dark'>('light');
  const activeMode = colorSubMode !== undefined ? colorSubMode : internalMode;

  const handleModeChange = (newMode: 'light' | 'dark') => {
    setInternalMode(newMode);
    onColorSubModeChange?.(newMode);
  };

  const isDark = activeMode === 'dark';
  const activeDraftColors = isDark ? (draftDarkColors || {}) : draftColors;
  const activeColorChange = isDark && onDarkColorChange ? onDarkColorChange : onColorChange;
  const activeColorBlur = isDark && onDarkColorBlur ? onDarkColorBlur : onColorBlur;

  // Collapsible section open states
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    'Navigation/Header': true,
    'Text/Headings': true,
    Buttons: true,
    'Forms/Inputs': true,
    'Cards/Panels': true,
    Links: true,
    'Status/Feedback': true,
    Backgrounds: true,
  });

  // Track per-token reset in-flight and success states
  const [resettingToken, setResettingToken] = useState<string | null>(null);
  const [justResetTokens, setJustResetTokens] = useState<Record<string, boolean>>({});

  // Local cache for default values fetched on demand
  const cachedDefaultsRef = useRef<Record<string, string> | null>(defaultThemeColors || null);
  const cachedDarkDefaultsRef = useRef<Record<string, string> | null>(defaultThemeDarkColors || null);

  useEffect(() => {
    if (defaultThemeColors) {
      cachedDefaultsRef.current = defaultThemeColors;
    }
  }, [defaultThemeColors]);

  useEffect(() => {
    if (defaultThemeDarkColors) {
      cachedDarkDefaultsRef.current = defaultThemeDarkColors;
    }
  }, [defaultThemeDarkColors]);

  // When a search query is active, automatically expand sections that have matching tokens
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const updatedOpenState = { ...openSections };
      let anyMatched = false;

      COLOR_TOKEN_GROUPS.forEach((group) => {
        const tokensInGroup = COLOR_TOKENS.filter((t) => t.group === group);
        const hasMatch = tokensInGroup.some(
          (t) =>
            t.label.toLowerCase().includes(q) ||
            t.key.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            group.toLowerCase().includes(q) ||
            (activeDraftColors[t.key] || '').toLowerCase().includes(q)
        );

        if (hasMatch) {
          updatedOpenState[group] = true;
          anyMatched = true;
        }
      });

      if (anyMatched) {
        setOpenSections(updatedOpenState);
      }
    }
  }, [searchQuery, activeDraftColors]);

  const toggleSection = (group: ColorTokenGroup) => {
    setOpenSections((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  /**
   * Reset single token to Smart Cookie Default theme's value on demand
   */
  const handleResetToken = async (tokenKey: string) => {
    if (isReadOnly || resettingToken) return;

    setResettingToken(tokenKey);
    try {
      let defaultValue: string | undefined;

      if (isDark) {
        defaultValue = cachedDarkDefaultsRef.current?.[tokenKey];

        if (!defaultValue && onRequestDefaultThemeDark) {
          try {
            const fetchedDark = await onRequestDefaultThemeDark();
            cachedDarkDefaultsRef.current = fetchedDark;
            defaultValue = fetchedDark[tokenKey];
          } catch (err) {
            console.warn('[ColorEditorTab] Failed to fetch dark defaults from server:', err);
          }
        }

        if (!defaultValue) {
          const tokenDef = COLOR_TOKENS.find((t) => t.key === tokenKey);
          defaultValue =
            CANONICAL_DEFAULT_DARK_TOKENS[tokenKey] ||
            tokenDef?.defaultDarkValue ||
            tokenDef?.defaultValue ||
            '#1e293b';
        }
      } else {
        defaultValue = cachedDefaultsRef.current?.[tokenKey];

        if (!defaultValue && onRequestDefaultTheme) {
          try {
            const fetchedDefaults = await onRequestDefaultTheme();
            cachedDefaultsRef.current = fetchedDefaults;
            defaultValue = fetchedDefaults[tokenKey];
          } catch (err) {
            console.warn('[ColorEditorTab] Failed to fetch defaults from server:', err);
          }
        }

        if (!defaultValue) {
          const tokenDef = COLOR_TOKENS.find((t) => t.key === tokenKey);
          defaultValue =
            CANONICAL_DEFAULT_TOKENS[tokenKey] || tokenDef?.defaultValue || '#ffffff';
        }
      }

      // 1. Update draft immediately (for live preview)
      activeColorChange(tokenKey, defaultValue);

      // 2. Trigger autosave for this single token
      activeColorBlur(tokenKey, defaultValue);

      // Flash feedback
      setJustResetTokens((prev) => ({ ...prev, [tokenKey]: true }));
      setTimeout(() => {
        setJustResetTokens((prev) => ({ ...prev, [tokenKey]: false }));
      }, 2000);
    } catch (error) {
      console.error(`[ColorEditorTab] Failed to reset token ${tokenKey}:`, error);
    } finally {
      setResettingToken(null);
    }
  };

  const cleanQuery = searchQuery.trim().toLowerCase();

  return (
    <div className="space-y-6" id="theme-color-editor-tab">
      {/* Light / Dark Sub-Toggle Bar */}
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl border border-card-border bg-card-bg shadow-xs"
        id="color-editor-mode-toggle-bar"
      >
        <div className="flex items-center space-x-1.5 p-1 bg-card-header-bg rounded-xl border border-card-border/60">
          <button
            type="button"
            onClick={() => handleModeChange('light')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              !isDark
                ? 'bg-link-primary text-btn-primary-text shadow-xs'
                : 'text-text-muted hover:text-text-heading hover:bg-card-bg'
            }`}
            id="color-mode-light-btn"
          >
            <Sun className="h-3.5 w-3.5" />
            <span>Light Mode Colors</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('dark')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isDark
                ? 'bg-link-primary text-btn-primary-text shadow-xs'
                : 'text-text-muted hover:text-text-heading hover:bg-card-bg'
            }`}
            id="color-mode-dark-btn"
          >
            <Moon className="h-3.5 w-3.5" />
            <span>Dark Mode Colors</span>
          </button>
        </div>
        <div className="text-xs text-text-muted">
          {!isDark ? (
            <span>Editing standard light tokens (stored in <code className="font-mono text-[11px] text-text-heading">colorValues</code>)</span>
          ) : (
            <span>Editing dark mode tokens (stored in <code className="font-mono text-[11px] text-text-heading">darkColorValues</code>)</span>
          )}
        </div>
      </div>

      {/* Search notice if filtering */}
      {cleanQuery.length > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-link-primary/10 border border-link-primary/20 px-4 py-2.5 text-xs text-link-primary">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>
              Filtering tokens matching <strong className="font-semibold">"{searchQuery}"</strong>
            </span>
          </div>
          <span className="text-text-muted">
            {
              COLOR_TOKENS.filter(
                (t) =>
                  t.label.toLowerCase().includes(cleanQuery) ||
                  t.key.toLowerCase().includes(cleanQuery) ||
                  t.description.toLowerCase().includes(cleanQuery) ||
                  t.group.toLowerCase().includes(cleanQuery) ||
                  (activeDraftColors[t.key] || '').toLowerCase().includes(cleanQuery)
              ).length
            }{' '}
            matching tokens found
          </span>
        </div>
      )}

      {/* Render 8 Collapsible Sections per Task 1 audit specification */}
      {COLOR_TOKEN_GROUPS.map((group) => {
        const groupTokens = COLOR_TOKENS.filter((t) => t.group === group);
        const meta = GROUP_META[group];
        const isOpen = openSections[group] ?? true;

        // Check if group contains search matches
        const matchingTokens = groupTokens.filter(
          (t) =>
            !cleanQuery ||
            t.label.toLowerCase().includes(cleanQuery) ||
            t.key.toLowerCase().includes(cleanQuery) ||
            t.description.toLowerCase().includes(cleanQuery) ||
            group.toLowerCase().includes(cleanQuery) ||
            (activeDraftColors[t.key] || '').toLowerCase().includes(cleanQuery)
        );

        // If search query is active and no tokens in this group match, collapse or hide
        if (cleanQuery && matchingTokens.length === 0) {
          return null;
        }

        const sectionId = `color-section-${group.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

        return (
          <div
            key={group}
            id={sectionId}
            className="rounded-2xl border border-card-border bg-card-bg shadow-sm overflow-hidden transition-all"
          >
            {/* Collapsible Section Header */}
            <button
              type="button"
              onClick={() => toggleSection(group)}
              className="w-full flex items-center justify-between p-5 text-left bg-card-bg hover:bg-card-header-bg/50 transition-colors border-b border-card-border/60"
              id={`${sectionId}-toggle`}
            >
              <div className="pr-4">
                <div className="flex items-center space-x-2.5">
                  <h3 className="text-base font-semibold text-text-heading font-sans">
                    {meta.title}
                  </h3>
                  <span className="inline-flex items-center rounded-full bg-card-header-bg px-2 py-0.5 text-xs font-semibold text-text-muted border border-card-border">
                    {cleanQuery ? `${matchingTokens.length}/${groupTokens.length}` : groupTokens.length} tokens
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5 font-sans">{meta.description}</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-card-border/70 bg-card-bg text-text-muted shrink-0">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </button>

            {/* Section Token Rows */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="p-5"
                >
                  <div className="grid grid-cols-1 gap-3.5">
                    {matchingTokens.map((token) => {
                      const defaultVal = isDark
                        ? (cachedDarkDefaultsRef.current?.[token.key] ||
                            defaultThemeDarkColors?.[token.key] ||
                            token.defaultDarkValue ||
                            token.defaultValue)
                        : (cachedDefaultsRef.current?.[token.key] ||
                            defaultThemeColors?.[token.key] ||
                            token.defaultValue);

                      const currentVal = isDark
                        ? (activeDraftColors[token.key] ||
                            token.defaultDarkValue ||
                            token.defaultValue)
                        : (activeDraftColors[token.key] || token.defaultValue);

                      return (
                        <TokenFieldRow
                          key={token.key}
                          token={token}
                          currentValue={currentVal}
                          defaultVal={defaultVal}
                          isReadOnly={isReadOnly}
                          searchQuery={searchQuery}
                          onColorChange={activeColorChange}
                          onColorBlur={activeColorBlur}
                          onReset={handleResetToken}
                          isResetting={resettingToken === token.key}
                          justReset={Boolean(justResetTokens[token.key])}
                        />
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};
