import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  ExternalLink,
  Search,
  Bell,
  Layers,
  Eye,
  Sliders,
  X,
} from 'lucide-react';
import { CANONICAL_DEFAULT_TOKENS, CANONICAL_DEFAULT_DARK_TOKENS } from '../constants/themeTokens';

export interface LivePreviewPaneProps {
  themeName: string;
  baseFontSize: number;
  draftColors: Record<string, string>;
  mode?: 'light' | 'dark';
  fonts?: {
    general?: string;
    nav?: string;
    headings?: string;
    buttons?: string;
    forms?: string;
    cards?: string;
    links?: string;
    status?: string;
  };
  logoPreviewSrc?: string | null;
}

export const LivePreviewPane: React.FC<LivePreviewPaneProps> = ({
  themeName,
  baseFontSize,
  draftColors,
  mode = 'light',
  fonts,
  logoPreviewSrc,
}) => {
  // Merge draft colors with canonical defaults (light or dark) to ensure all 28 tokens are resolved
  const fallbackDefaults = mode === 'dark' ? CANONICAL_DEFAULT_DARK_TOKENS : CANONICAL_DEFAULT_TOKENS;
  const colors: Record<string, string> = {
    ...fallbackDefaults,
    ...draftColors,
  };

  // Interactive local states for testing hover/focus/overlay
  const [isPrimaryBtnHovered, setIsPrimaryBtnHovered] = useState(false);
  const [isLinkHovered, setIsLinkHovered] = useState(false);
  const [isNavHovered, setIsNavHovered] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [inputValue, setInputValue] = useState('Introduction to TypeScript');
  const [showModalOverlay, setShowModalOverlay] = useState(false);
  const [activeNavTab, setActiveNavTab] = useState<'dashboard' | 'courses' | 'grades'>('courses');

  // Font family resolution
  const fontGeneral = fonts?.general ? `"${fonts.general}", sans-serif` : 'Inter, sans-serif';
  const fontNav = fonts?.nav ? `"${fonts.nav}", sans-serif` : fontGeneral;
  const fontHeadings = fonts?.headings ? `"${fonts.headings}", sans-serif` : fontGeneral;
  const fontButtons = fonts?.buttons ? `"${fonts.buttons}", sans-serif` : fontGeneral;
  const fontForms = fonts?.forms ? `"${fonts.forms}", sans-serif` : fontGeneral;
  const fontCards = fonts?.cards ? `"${fonts.cards}", sans-serif` : fontGeneral;
  const fontLinks = fonts?.links ? `"${fonts.links}", sans-serif` : fontGeneral;
  const fontStatus = fonts?.status ? `"${fonts.status}", sans-serif` : fontGeneral;

  // Proportional font sizing derived directly from baseFontSize
  const sizeHeading = Math.round(baseFontSize * 1.25);
  const sizeSubheading = Math.round(baseFontSize * 1.05);
  const sizeBody = baseFontSize;
  const sizeControls = Math.max(12, Math.round(baseFontSize * 0.875));
  const sizeSmall = Math.max(11, Math.round(baseFontSize * 0.75));

  return (
    <div
      id="live-preview-pane"
      className="rounded-2xl border border-card-border bg-card-bg shadow-sm overflow-hidden flex flex-col sticky top-6 transition-all"
    >
      {/* Pane Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-card-border bg-card-header-bg">
        <div className="flex items-center space-x-2">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-success-text opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-status-success-text" />
          </div>
          <span className="text-xs font-bold text-text-heading font-sans uppercase tracking-wider">
            Live Preview
          </span>
          <span className="inline-flex items-center rounded-md bg-card-bg px-1.5 py-0.5 text-[10px] font-semibold text-text-heading border border-card-border">
            {mode === 'dark' ? 'Dark' : 'Light'}
          </span>
          <span className="text-[11px] text-text-muted hidden sm:inline">
            (Instant draft reactivity)
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setShowModalOverlay((prev) => !prev)}
            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              showModalOverlay
                ? 'bg-link-primary text-btn-primary-text border-link-primary shadow-2xs'
                : 'bg-card-bg text-text-body border-card-border hover:bg-card-header-bg'
            }`}
            title="Toggle modal backdrop overlay preview (bg-overlay)"
            id="toggle-modal-overlay-preview-btn"
          >
            <Layers className="h-3 w-3" />
            <span>{showModalOverlay ? 'Hide Overlay' : 'Test Overlay'}</span>
          </button>
          <span className="text-[10px] font-mono text-text-muted bg-card-bg border border-card-border px-1.5 py-0.5 rounded">
            {baseFontSize}px base
          </span>
        </div>
      </div>

      {/* Mock Application Container (Canvas: bg-app) */}
      <div
        id="preview-viewport-canvas"
        className="relative p-4 md:p-5 overflow-x-hidden min-h-[580px] flex flex-col space-y-4 transition-colors duration-150"
        style={{
          backgroundColor: colors['bg-app'],
          fontFamily: fontGeneral,
          fontSize: `${sizeBody}px`,
        }}
      >
        {/* 1. Group: Navigation/Header (nav-bg, nav-text, nav-text-active) */}
        <div
          id="preview-nav-bar"
          className="rounded-xl border shadow-xs px-3.5 py-2.5 flex items-center justify-between transition-colors duration-150"
          style={{
            backgroundColor: colors['nav-bg'],
            borderColor: colors['card-border'],
            fontFamily: fontNav,
          }}
        >
          {/* Brand logo & title */}
          <div className="flex items-center space-x-2.5">
            {logoPreviewSrc ? (
              <img
                src={logoPreviewSrc}
                alt={themeName || 'Theme Logo'}
                className="h-7 w-7 rounded-lg object-contain"
                id="preview-nav-logo-img"
              />
            ) : (
              <div
                className="h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs shadow-2xs"
                style={{
                  backgroundColor: colors['btn-primary-bg'],
                  color: colors['btn-primary-text'],
                  fontFamily: fontButtons,
                }}
                id="preview-nav-logo-placeholder"
              >
                SC
              </div>
            )}
            <span
              className="font-bold text-sm tracking-tight truncate max-w-[120px] sm:max-w-[160px]"
              style={{
                color: colors['text-heading'],
                fontFamily: fontHeadings,
              }}
            >
              {themeName || 'SmartCookie'}
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              type="button"
              onClick={() => setActiveNavTab('courses')}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors duration-150"
              style={{
                color:
                  activeNavTab === 'courses' ? colors['nav-text-active'] : colors['nav-text'],
                backgroundColor:
                  activeNavTab === 'courses' ? `${colors['nav-text-active']}15` : 'transparent',
              }}
            >
              Courses
            </button>
            <button
              type="button"
              onClick={() => setActiveNavTab('dashboard')}
              onMouseEnter={() => setIsNavHovered(true)}
              onMouseLeave={() => setIsNavHovered(false)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors duration-150 hidden sm:inline-block"
              style={{
                color:
                  activeNavTab === 'dashboard'
                    ? colors['nav-text-active']
                    : isNavHovered
                    ? colors['nav-text-active']
                    : colors['nav-text'],
              }}
            >
              Dashboard
            </button>
            <div
              className="h-4 w-px mx-1 opacity-20"
              style={{ backgroundColor: colors['card-border'] }}
            />
            <button
              type="button"
              className="p-1.5 rounded-lg transition-colors duration-150"
              style={{ color: colors['nav-text'] }}
              title="Notifications"
            >
              <Bell className="h-3.5 w-3.5" />
            </button>
          </nav>
        </div>

        {/* 2. Group: Text/Headings & Backgrounds (text-heading, text-body, text-muted, text-inverse, bg-subtle) */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2
              id="preview-heading-text"
              className="font-bold tracking-tight transition-colors duration-150"
              style={{
                color: colors['text-heading'],
                fontFamily: fontHeadings,
                fontSize: `${sizeHeading}px`,
                lineHeight: 1.25,
              }}
            >
              Web Development Course
            </h2>

            {/* Inverse Text Badge Demo */}
            <span
              id="preview-inverse-text-badge"
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shadow-2xs"
              style={{
                backgroundColor: colors['btn-primary-bg'],
                color: colors['text-inverse'],
                fontFamily: fontButtons,
              }}
            >
              NEW MODULE
            </span>
          </div>

          <p
            id="preview-body-text"
            className="transition-colors duration-150 leading-relaxed"
            style={{
              color: colors['text-body'],
              fontFamily: fontGeneral,
              fontSize: `${sizeBody}px`,
            }}
          >
            Welcome to your interactive curriculum. Complete each assigned lesson to earn
            accreditation.
          </p>

          <p
            id="preview-muted-text"
            className="transition-colors duration-150 flex items-center space-x-1.5"
            style={{
              color: colors['text-muted'],
              fontFamily: fontGeneral,
              fontSize: `${sizeSmall}px`,
            }}
          >
            <span>Last updated 2 hours ago by Administration</span>
            <span>•</span>
            <span
              style={{
                color: colors['text-inverse'],
                backgroundColor: colors['text-muted'],
                padding: '1px 5px',
                borderRadius: '4px',
                fontSize: '9px',
                fontFamily: fontGeneral,
              }}
            >
              Inverse: {colors['text-inverse']}
            </span>
          </p>
        </div>

        {/* 3. Group: Cards/Panels (card-bg, card-border, card-header-bg) */}
        <div
          id="preview-card-panel"
          className="rounded-xl border shadow-xs overflow-hidden transition-colors duration-150"
          style={{
            backgroundColor: colors['card-bg'],
            borderColor: colors['card-border'],
            fontFamily: fontCards,
          }}
        >
          {/* Card Header */}
          <div
            id="preview-card-header"
            className="px-4 py-2.5 border-b flex items-center justify-between transition-colors duration-150"
            style={{
              backgroundColor: colors['card-header-bg'],
              borderColor: colors['card-border'],
            }}
          >
            <div className="flex items-center space-x-2">
              <span
                className="font-semibold"
                style={{
                  color: colors['text-heading'],
                  fontSize: `${sizeSubheading}px`,
                  fontFamily: fontCards,
                }}
              >
                Module Assessment & Controls
              </span>
            </div>

            {/* 6. Group: Links (link-primary, link-hover) */}
            <a
              href="#preview-link"
              id="preview-interactive-link"
              onClick={(e) => e.preventDefault()}
              onMouseEnter={() => setIsLinkHovered(true)}
              onMouseLeave={() => setIsLinkHovered(false)}
              className="inline-flex items-center space-x-1 transition-colors duration-150 underline underline-offset-2"
              style={{
                color: isLinkHovered ? colors['link-hover'] : colors['link-primary'],
                fontFamily: fontLinks,
                fontSize: `${sizeSmall}px`,
              }}
            >
              <span>Syllabus Guide</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Card Body with Forms and Buttons */}
          <div className="p-4 space-y-4">
            {/* 4. Group: Forms/Inputs (input-border, input-border-focus) */}
            <div className="space-y-1.5">
              <label
                htmlFor="preview-input-field"
                className="block font-medium transition-colors duration-150"
                style={{
                  color: colors['text-heading'],
                  fontFamily: fontForms,
                  fontSize: `${sizeControls}px`,
                }}
              >
                Lesson Search & Filter
              </label>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none transition-colors duration-150"
                  style={{
                    color: isInputFocused
                      ? colors['input-border-focus']
                      : colors['text-muted'],
                  }}
                />
                <input
                  id="preview-input-field"
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  className="w-full rounded-xl pl-8 pr-3 py-2 transition-all outline-none"
                  style={{
                    backgroundColor: colors['card-bg'],
                    color: colors['text-body'],
                    fontFamily: fontForms,
                    fontSize: `${sizeControls}px`,
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: isInputFocused
                      ? colors['input-border-focus']
                      : colors['input-border'],
                    boxShadow: isInputFocused
                      ? `0 0 0 3px ${colors['input-border-focus']}25`
                      : 'none',
                  }}
                />
              </div>
            </div>

            {/* 3. Group: Buttons (btn-primary-bg, btn-primary-hover, btn-primary-text) */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {/* Primary Action Button */}
              <button
                type="button"
                id="preview-primary-btn"
                onMouseEnter={() => setIsPrimaryBtnHovered(true)}
                onMouseLeave={() => setIsPrimaryBtnHovered(false)}
                className="px-4 py-2 rounded-xl font-semibold shadow-xs transition-all duration-150 active:scale-98"
                style={{
                  backgroundColor: isPrimaryBtnHovered
                    ? colors['btn-primary-hover']
                    : colors['btn-primary-bg'],
                  color: colors['btn-primary-text'],
                  fontFamily: fontButtons,
                  fontSize: `${sizeControls}px`,
                }}
              >
                Start Lesson
              </button>

              {/* Secondary Button */}
              <button
                type="button"
                id="preview-secondary-btn"
                className="px-4 py-2 rounded-xl font-medium border shadow-2xs transition-colors duration-150"
                style={{
                  backgroundColor: colors['card-bg'],
                  borderColor: colors['input-border'],
                  color: colors['text-body'],
                  fontFamily: fontButtons,
                  fontSize: `${sizeControls}px`,
                }}
              >
                Save for Later
              </button>
            </div>
          </div>
        </div>

        {/* 7. Group: Status/Feedback (4 badges: success, warning, error, info) */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <span
              className="font-semibold uppercase tracking-wider text-[11px]"
              style={{
                color: colors['text-muted'],
                fontFamily: fontGeneral,
              }}
            >
              Status & Feedback Badges
            </span>
          </div>
          <div
            id="preview-status-badges-container"
            className="grid grid-cols-2 sm:grid-cols-4 gap-2"
            style={{ fontFamily: fontStatus }}
          >
            {/* Success Badge */}
            <div
              id="preview-badge-success"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border transition-colors duration-150"
              style={{
                backgroundColor: colors['status-success-bg'],
                color: colors['status-success-text'],
                borderColor: `${colors['status-success-text']}25`,
                fontSize: `${sizeSmall}px`,
              }}
            >
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span className="font-semibold truncate">Success (98%)</span>
            </div>

            {/* Warning Badge */}
            <div
              id="preview-badge-warning"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border transition-colors duration-150"
              style={{
                backgroundColor: colors['status-warning-bg'],
                color: colors['status-warning-text'],
                borderColor: `${colors['status-warning-text']}25`,
                fontSize: `${sizeSmall}px`,
              }}
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span className="font-semibold truncate">Pending</span>
            </div>

            {/* Error Badge */}
            <div
              id="preview-badge-error"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border transition-colors duration-150"
              style={{
                backgroundColor: colors['status-error-bg'],
                color: colors['status-error-text'],
                borderColor: `${colors['status-error-text']}25`,
                fontSize: `${sizeSmall}px`,
              }}
            >
              <XCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="font-semibold truncate">Failed (1)</span>
            </div>

            {/* Info Badge */}
            <div
              id="preview-badge-info"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border transition-colors duration-150"
              style={{
                backgroundColor: colors['status-info-bg'],
                color: colors['status-info-text'],
                borderColor: `${colors['status-info-text']}25`,
                fontSize: `${sizeSmall}px`,
              }}
            >
              <Info className="h-3.5 w-3.5 shrink-0" />
              <span className="font-semibold truncate">Notice</span>
            </div>
          </div>
        </div>

        {/* 8. Group: Background Surfaces Demonstration (bg-subtle, bg-app) */}
        <div
          id="preview-subtle-well"
          className="rounded-xl p-3 border transition-colors duration-150 flex items-center justify-between flex-wrap gap-2"
          style={{
            backgroundColor: colors['bg-subtle'],
            borderColor: colors['card-border'],
          }}
        >
          <div className="flex items-center space-x-2">
            <div
              className="h-5 w-5 rounded-md border"
              style={{
                backgroundColor: colors['bg-subtle'],
                borderColor: colors['card-border'],
              }}
              title="bg-subtle fill"
            />
            <span
              className="text-xs font-medium"
              style={{
                color: colors['text-body'],
                fontFamily: fontGeneral,
                fontSize: `${sizeSmall}px`,
              }}
            >
              Subtle Surface Container (<code className="font-mono text-[10px]">{colors['bg-subtle']}</code>)
            </span>
          </div>

          <span
            className="text-[10px] font-mono"
            style={{
              color: colors['text-muted'],
              fontFamily: fontGeneral,
            }}
          >
            Canvas: {colors['bg-app']}
          </span>
        </div>

        {/* 8. Group: Modal Backdrop Overlay (bg-overlay) Simulated Dialog */}
        {showModalOverlay && (
          <div
            id="preview-modal-backdrop-overlay"
            className="absolute inset-0 z-30 flex items-center justify-center p-4 transition-all duration-150 rounded-xl"
            style={{
              backgroundColor: colors['bg-overlay'],
            }}
          >
            <div
              id="preview-modal-dialog-box"
              className="w-full max-w-xs rounded-2xl border shadow-xl p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150"
              style={{
                backgroundColor: colors['card-bg'],
                borderColor: colors['card-border'],
                fontFamily: fontCards,
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="font-bold"
                  style={{
                    color: colors['text-heading'],
                    fontFamily: fontHeadings,
                    fontSize: `${sizeSubheading}px`,
                  }}
                >
                  Overlay Active
                </span>
                <button
                  type="button"
                  onClick={() => setShowModalOverlay(false)}
                  className="p-1 rounded-lg transition-colors"
                  style={{ color: colors['text-muted'] }}
                  title="Close Overlay Demo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p
                className="leading-relaxed"
                style={{
                  color: colors['text-body'],
                  fontFamily: fontGeneral,
                  fontSize: `${sizeSmall}px`,
                }}
              >
                Backdrop uses <strong className="font-mono">{colors['bg-overlay']}</strong>. Test transparency and alpha adjustments in the Backgrounds section.
              </p>
              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowModalOverlay(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs"
                  style={{
                    backgroundColor: colors['btn-primary-bg'],
                    color: colors['btn-primary-text'],
                    fontFamily: fontButtons,
                  }}
                >
                  Dismiss Overlay
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pane Footer Info */}
      <div className="px-4 py-2.5 border-t border-card-border bg-card-header-bg/40 flex items-center justify-between text-[11px] text-text-muted">
        <div className="flex items-center space-x-1.5">
          <Sparkles className="h-3 w-3 text-link-primary" />
          <span>Independent from runtime app theme</span>
        </div>
        <span className="font-mono text-[10px]">28 Tokens Bound</span>
      </div>
    </div>
  );
};
