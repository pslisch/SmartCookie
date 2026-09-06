export type ColorTokenGroup =
  | 'Navigation/Header'
  | 'Text/Headings'
  | 'Buttons'
  | 'Forms/Inputs'
  | 'Cards/Panels'
  | 'Links'
  | 'Status/Feedback'
  | 'Backgrounds';

export interface ColorTokenDef {
  key: string;
  label: string;
  group: ColorTokenGroup;
  description: string;
  defaultValue: string;
  defaultDarkValue?: string;
  supportsAlpha?: boolean;
}

export const COLOR_TOKEN_GROUPS: ColorTokenGroup[] = [
  'Navigation/Header',
  'Text/Headings',
  'Buttons',
  'Forms/Inputs',
  'Cards/Panels',
  'Links',
  'Status/Feedback',
  'Backgrounds',
];

export const COLOR_TOKENS: ColorTokenDef[] = [
  // 1. Navigation/Header
  {
    key: 'nav-bg',
    label: 'Navigation Bar Background',
    group: 'Navigation/Header',
    description: 'Primary navigation bar and sticky top header surface fill.',
    defaultValue: '#ffffff',
    defaultDarkValue: '#0f172a',
  },
  {
    key: 'nav-text',
    label: 'Navigation Item Text',
    group: 'Navigation/Header',
    description: 'Default navigation links, drawer items, and header utilities.',
    defaultValue: '#475569',
    defaultDarkValue: '#94a3b8',
  },
  {
    key: 'nav-text-active',
    label: 'Navigation Item Active Text',
    group: 'Navigation/Header',
    description: 'Active navigation item text, icon tint, and active link indicator.',
    defaultValue: '#2563eb',
    defaultDarkValue: '#60a5fa',
  },

  // 2. Text/Headings
  {
    key: 'text-heading',
    label: 'Heading & Title Text',
    group: 'Text/Headings',
    description: 'Headings (H1–H6), modal dialog titles, and card headers.',
    defaultValue: '#0f172a',
    defaultDarkValue: '#f8fafc',
  },
  {
    key: 'text-body',
    label: 'Body & Content Text',
    group: 'Text/Headings',
    description: 'Standard body copy, paragraphs, table cells, and form descriptions.',
    defaultValue: '#334155',
    defaultDarkValue: '#cbd5e1',
  },
  {
    key: 'text-muted',
    label: 'Muted & Helper Text',
    group: 'Text/Headings',
    description: 'Secondary labels, timestamps, metadata, helper text, and breadcrumbs.',
    defaultValue: '#64748b',
    defaultDarkValue: '#94a3b8',
  },
  {
    key: 'text-inverse',
    label: 'Inverse Text (on Dark/Color)',
    group: 'Text/Headings',
    description: 'High-contrast text used on dark backgrounds and colored surfaces.',
    defaultValue: '#ffffff',
    defaultDarkValue: '#0f172a',
  },

  // 3. Buttons
  {
    key: 'btn-primary-bg',
    label: 'Primary Button Background',
    group: 'Buttons',
    description: 'Solid background for primary calls to action and submit buttons.',
    defaultValue: '#2563eb',
    defaultDarkValue: '#3b82f6',
  },
  {
    key: 'btn-primary-hover',
    label: 'Primary Button Hover Background',
    group: 'Buttons',
    description: 'Hover state background for primary action buttons.',
    defaultValue: '#1d4ed8',
    defaultDarkValue: '#2563eb',
  },
  {
    key: 'btn-primary-text',
    label: 'Primary Button Text',
    group: 'Buttons',
    description: 'Text and icon color inside primary action buttons.',
    defaultValue: '#ffffff',
    defaultDarkValue: '#ffffff',
  },

  // 4. Forms/Inputs
  {
    key: 'input-border',
    label: 'Form Control Inactive Border',
    group: 'Forms/Inputs',
    description: 'Border stroke for inactive text fields, dropdowns, and checkboxes.',
    defaultValue: '#e2e8f0',
    defaultDarkValue: '#334155',
  },
  {
    key: 'input-border-focus',
    label: 'Form Control Focus Border',
    group: 'Forms/Inputs',
    description: 'Border stroke and focus ring for active form controls.',
    defaultValue: '#2563eb',
    defaultDarkValue: '#60a5fa',
  },

  // 5. Cards/Panels
  {
    key: 'card-bg',
    label: 'Card & Panel Surface Fill',
    group: 'Cards/Panels',
    description: 'Surface fill for cards, modal dialogs, and content panels.',
    defaultValue: '#ffffff',
    defaultDarkValue: '#1e293b',
  },
  {
    key: 'card-border',
    label: 'Card & Panel Border Stroke',
    group: 'Cards/Panels',
    description: 'Perimeter border for cards, panels, and table dividers.',
    defaultValue: '#e2e8f0',
    defaultDarkValue: '#334155',
  },
  {
    key: 'card-header-bg',
    label: 'Card & Table Header Background',
    group: 'Cards/Panels',
    description: 'Subtle header bar background for cards and tables.',
    defaultValue: '#f8fafc',
    defaultDarkValue: '#0f172a',
  },

  // 6. Links
  {
    key: 'link-primary',
    label: 'Interactive Hyperlink Text',
    group: 'Links',
    description: 'Inline text links, actionable breadcrumbs, and clickable references.',
    defaultValue: '#2563eb',
    defaultDarkValue: '#60a5fa',
  },
  {
    key: 'link-hover',
    label: 'Interactive Hyperlink Hover Text',
    group: 'Links',
    description: 'Hover state color for interactive hyperlinks.',
    defaultValue: '#1d4ed8',
    defaultDarkValue: '#93c5fd',
  },

  // 7. Status/Feedback
  {
    key: 'status-success-bg',
    label: 'Success Status Background',
    group: 'Status/Feedback',
    description: 'Background tint for success badges, completed states, and alerts.',
    defaultValue: '#ecfdf5',
    defaultDarkValue: '#064e3b',
  },
  {
    key: 'status-success-text',
    label: 'Success Status Text & Icon',
    group: 'Status/Feedback',
    description: 'Foreground text and icon color for success badges and alerts.',
    defaultValue: '#047857',
    defaultDarkValue: '#34d399',
  },
  {
    key: 'status-warning-bg',
    label: 'Warning Status Background',
    group: 'Status/Feedback',
    description: 'Background tint for warning badges, pending alerts, and notices.',
    defaultValue: '#fffbeb',
    defaultDarkValue: '#451a03',
  },
  {
    key: 'status-warning-text',
    label: 'Warning Status Text & Icon',
    group: 'Status/Feedback',
    description: 'Foreground text and icon color for warning notifications.',
    defaultValue: '#b45309',
    defaultDarkValue: '#fbbf24',
  },
  {
    key: 'status-error-bg',
    label: 'Error Status Background',
    group: 'Status/Feedback',
    description: 'Background tint for error notices, danger alerts, and failed states.',
    defaultValue: '#fef2f2',
    defaultDarkValue: '#450a0a',
  },
  {
    key: 'status-error-text',
    label: 'Error Status Text & Icon',
    group: 'Status/Feedback',
    description: 'Foreground text and icon color for error alerts and badges.',
    defaultValue: '#dc2626',
    defaultDarkValue: '#f87171',
  },
  {
    key: 'status-info-bg',
    label: 'Info Status Background',
    group: 'Status/Feedback',
    description: 'Background tint for informational banners, chips, and tips.',
    defaultValue: '#eff6ff',
    defaultDarkValue: '#172554',
  },
  {
    key: 'status-info-text',
    label: 'Info Status Text & Icon',
    group: 'Status/Feedback',
    description: 'Foreground text and icon color for informational callouts.',
    defaultValue: '#1d4ed8',
    defaultDarkValue: '#60a5fa',
  },

  // 8. Backgrounds
  {
    key: 'bg-app',
    label: 'Application Page Canvas Background',
    group: 'Backgrounds',
    description: 'Underlying viewport canvas background for the application.',
    defaultValue: '#f8fafc',
    defaultDarkValue: '#0b0f19',
  },
  {
    key: 'bg-subtle',
    label: 'Subtle / Secondary Surface Background',
    group: 'Backgrounds',
    description: 'Background for secondary containers, sidebar panels, and wells.',
    defaultValue: '#f1f5f9',
    defaultDarkValue: '#1e293b',
  },
  {
    key: 'bg-overlay',
    label: 'Modal Backdrop Overlay',
    group: 'Backgrounds',
    description: 'Semi-transparent backdrop overlay for modal dialogs and drawers.',
    defaultValue: 'rgba(15, 23, 42, 0.40)',
    defaultDarkValue: 'rgba(0, 0, 0, 0.70)',
    supportsAlpha: true,
  },
];

export const CANONICAL_DEFAULT_TOKENS: Record<string, string> = COLOR_TOKENS.reduce(
  (acc, token) => {
    acc[token.key] = token.defaultValue;
    return acc;
  },
  {} as Record<string, string>
);

export const CANONICAL_DEFAULT_DARK_TOKENS: Record<string, string> = COLOR_TOKENS.reduce(
  (acc, token) => {
    acc[token.key] = token.defaultDarkValue || token.defaultValue;
    return acc;
  },
  {} as Record<string, string>
);

/**
 * Parses any color string (hex, rgb, rgba) into a 6-digit hex code and alpha percentage (0-100).
 */
export function parseColorToHexAndAlpha(colorVal: string | undefined): {
  hex: string;
  alpha: number;
} {
  if (!colorVal || typeof colorVal !== 'string') {
    return { hex: '#000000', alpha: 100 };
  }

  const trimmed = colorVal.trim();

  // Handle rgba(...) or rgb(...)
  const rgbaMatch = trimmed.match(
    /^rgba?\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([\d.]+))?\s*\)$/i
  );
  if (rgbaMatch) {
    const r = Math.min(255, Math.max(0, parseInt(rgbaMatch[1], 10)));
    const g = Math.min(255, Math.max(0, parseInt(rgbaMatch[2], 10)));
    const b = Math.min(255, Math.max(0, parseInt(rgbaMatch[3], 10)));
    const a = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1;

    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    const alpha = Math.round(Math.min(1, Math.max(0, a)) * 100);
    return { hex, alpha };
  }

  // Handle 3-digit hex (#fff)
  const hex3Match = trimmed.match(/^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  if (hex3Match) {
    const hex = `#${hex3Match[1]}${hex3Match[1]}${hex3Match[2]}${hex3Match[2]}${hex3Match[3]}${hex3Match[3]}`.toLowerCase();
    return { hex, alpha: 100 };
  }

  // Handle 6-digit hex (#ffffff)
  const hex6Match = trimmed.match(/^#?([0-9a-f]{6})$/i);
  if (hex6Match) {
    return { hex: `#${hex6Match[1].toLowerCase()}`, alpha: 100 };
  }

  // Handle 8-digit hex (#ffffff80)
  const hex8Match = trimmed.match(/^#?([0-9a-f]{6})([0-9a-f]{2})$/i);
  if (hex8Match) {
    const hex = `#${hex8Match[1].toLowerCase()}`;
    const alphaHex = parseInt(hex8Match[2], 16);
    const alpha = Math.round((alphaHex / 255) * 100);
    return { hex, alpha };
  }

  return { hex: trimmed.startsWith('#') ? trimmed : `#${trimmed}`, alpha: 100 };
}

/**
 * Combines a 6-digit hex and an alpha percentage into an appropriate color string.
 * If supportsAlpha is true and alpha < 100, produces rgba(r, g, b, 0.xx).
 * Otherwise produces 6-digit hex.
 */
export function formatColorString(hex: string, alpha: number, supportsAlpha?: boolean): string {
  const normalizedHex = hex.startsWith('#') ? hex : `#${hex}`;

  if (!supportsAlpha) {
    return normalizedHex.toLowerCase();
  }

  if (alpha >= 100) {
    return normalizedHex.toLowerCase();
  }

  // Convert hex to rgb
  const r = parseInt(normalizedHex.slice(1, 3), 16) || 0;
  const g = parseInt(normalizedHex.slice(3, 5), 16) || 0;
  const b = parseInt(normalizedHex.slice(5, 7), 16) || 0;
  const a = (alpha / 100).toFixed(2);

  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
