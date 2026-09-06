import React, { useEffect, useMemo } from 'react';
import {
  Type,
  Sparkles,
  Link as LinkIcon,
  Check,
  Info,
  CornerDownRight,
  Layers,
  Search,
} from 'lucide-react';
import { FontLibraryItem, FontGroupSlot, FontSlotConfig } from '../types';

export const FONT_SLOT_CONFIGS: FontSlotConfig[] = [
  {
    key: 'generalFontId',
    previewKey: 'general',
    name: 'General',
    shortName: 'General Font',
    description: 'Root font family applied across the application. All other groups inherit from this font unless explicitly overridden.',
    isGeneral: true,
    sampleText: 'The quick brown fox jumps over the lazy dog (1234567890)',
  },
  {
    key: 'navFontId',
    previewKey: 'nav',
    name: 'Navigation / Header',
    shortName: 'Navigation',
    description: 'Main navigation bar, menu items, breadcrumbs, and application header text.',
    sampleText: 'Dashboard • Courses • Assignments • Settings',
  },
  {
    key: 'headingsFontId',
    previewKey: 'headings',
    name: 'Headings',
    shortName: 'Headings',
    description: 'Page titles, section headers (H1-H6), modal headers, and display typography.',
    sampleText: 'Introduction to TypeScript & Frontend Architecture',
  },
  {
    key: 'buttonsFontId',
    previewKey: 'buttons',
    name: 'Buttons',
    shortName: 'Buttons',
    description: 'Primary, secondary, and ghost buttons, action triggers, and badges.',
    sampleText: 'Save Changes • Submit Assessment • Cancel',
  },
  {
    key: 'formsFontId',
    previewKey: 'forms',
    name: 'Forms / Inputs',
    shortName: 'Forms & Inputs',
    description: 'Text inputs, selects, textareas, checkboxes, and input labels.',
    sampleText: 'Enter your email address • Select an option',
  },
  {
    key: 'cardsFontId',
    previewKey: 'cards',
    name: 'Cards / Panels',
    shortName: 'Cards & Panels',
    description: 'Card containers, summary boxes, dashboard panels, and modal content.',
    sampleText: 'Course Progress: 85% completed • 4 modules remaining',
  },
  {
    key: 'linksFontId',
    previewKey: 'links',
    name: 'Links',
    shortName: 'Links',
    description: 'Text hyperlinks, navigation hyperlinks, and clickable text elements.',
    sampleText: 'View detailed performance report →',
  },
  {
    key: 'statusFontId',
    previewKey: 'status',
    name: 'Status / Feedback',
    shortName: 'Status & Feedback',
    description: 'Success alerts, error notices, warning tags, and system feedback pills.',
    sampleText: 'Changes saved successfully • Warning: Check connection',
  },
];

export interface FontEditorTabProps {
  draftFontIds: Record<FontGroupSlot, string | null>;
  isReadOnly: boolean;
  searchQuery?: string;
  onFontChange: (slot: FontGroupSlot, fontId: string | null) => void;
  onFontBlur: (slot: FontGroupSlot, fontId: string | null) => void;
  availableFonts: FontLibraryItem[];
  fontsLoading?: boolean;
}

export const FontEditorTab: React.FC<FontEditorTabProps> = ({
  draftFontIds,
  isReadOnly,
  searchQuery = '',
  onFontChange,
  onFontBlur,
  availableFonts,
  fontsLoading = false,
}) => {
  // Dynamically load custom uploaded font faces into browser document.fonts for real previewing
  useEffect(() => {
    availableFonts.forEach((font) => {
      if (!font.isSystem && font.id && typeof FontFace !== 'undefined') {
        const familyName = font.familyName;
        try {
          const isLoaded = Array.from(document.fonts.values()).some(
            (f) => f.family === familyName || f.family === `"${familyName}"`
          );
          if (!isLoaded) {
            const fontFace = new FontFace(familyName, `url(/api/fonts/${font.id}/file)`);
            fontFace
              .load()
              .then((loaded) => {
                document.fonts.add(loaded);
              })
              .catch((err) => {
                console.warn(`[FontEditorTab] Failed to load font face "${familyName}":`, err);
              });
          }
        } catch (e) {
          // Ignore
        }
      }
    });
  }, [availableFonts]);

  // Identify system font from available fonts (or fallback)
  const systemFont = useMemo(() => {
    return (
      availableFonts.find((f) => f.isSystem) ||
      availableFonts.find((f) => f.familyName.toLowerCase() === 'inter') ||
      null
    );
  }, [availableFonts]);

  // Resolve active General font family and display label
  const generalFontFamily = useMemo(() => {
    const generalId = draftFontIds.generalFontId;
    if (generalId) {
      const found = availableFonts.find((f) => f.id === generalId);
      if (found) return found.familyName;
    }
    return systemFont?.familyName || 'Inter';
  }, [draftFontIds.generalFontId, availableFonts, systemFont]);

  const generalFontDisplayName = useMemo(() => {
    const generalId = draftFontIds.generalFontId;
    if (generalId) {
      const found = availableFonts.find((f) => f.id === generalId);
      if (found) {
        return found.isSystem ? `${found.familyName} (Smart Cookie Default)` : found.familyName;
      }
    }
    return 'Smart Cookie Default (Inter)';
  }, [draftFontIds.generalFontId, availableFonts]);

  // Helper to resolve font family name for any group
  const resolveFontFamily = (slot: FontGroupSlot): string => {
    if (slot === 'generalFontId') {
      return generalFontFamily;
    }
    const assignedId = draftFontIds[slot];
    if (!assignedId) {
      // Inherits general
      return generalFontFamily;
    }
    const found = availableFonts.find((f) => f.id === assignedId);
    return found ? found.familyName : generalFontFamily;
  };

  // Count how many groups currently inherit from General
  const inheritedCount = useMemo(() => {
    const childSlots: FontGroupSlot[] = [
      'navFontId',
      'headingsFontId',
      'buttonsFontId',
      'formsFontId',
      'cardsFontId',
      'linksFontId',
      'statusFontId',
    ];
    return childSlots.filter((slot) => draftFontIds[slot] === null).length;
  }, [draftFontIds]);

  // Filter groups if search query is active
  const filteredConfigs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return FONT_SLOT_CONFIGS;

    return FONT_SLOT_CONFIGS.filter((config) => {
      const matchesName = config.name.toLowerCase().includes(q);
      const matchesShort = config.shortName.toLowerCase().includes(q);
      const matchesDesc = config.description.toLowerCase().includes(q);
      const familyName = resolveFontFamily(config.key).toLowerCase();
      const matchesFamily = familyName.includes(q);
      const isInheritMatch =
        q.includes('inherit') && (config.isGeneral || draftFontIds[config.key] === null);
      return matchesName || matchesShort || matchesDesc || matchesFamily || isInheritMatch;
    });
  }, [searchQuery, draftFontIds, availableFonts, generalFontFamily]);

  // Separate General config and child configs
  const generalConfig = FONT_SLOT_CONFIGS.find((c) => c.isGeneral)!;
  const childConfigs = filteredConfigs.filter((c) => !c.isGeneral);
  const showGeneral = !searchQuery.trim() || filteredConfigs.some((c) => c.isGeneral);

  return (
    <div className="space-y-6" id="theme-tab-fonts-content">
      {/* Information Header */}
      <div className="rounded-2xl border border-card-border bg-card-bg p-5 shadow-2xs">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-link-primary/10 text-link-primary shrink-0 mt-0.5">
              <Type className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text-heading font-sans">
                Typography Group Assignments
              </h3>
              <p className="text-xs text-text-muted mt-1 font-sans leading-relaxed max-w-2xl">
                Assign fonts across all 8 functional groups. By default, all interface slots inherit
                the <strong className="font-semibold text-text-body">General</strong> font.
                Custom fonts can be uploaded and managed in the{' '}
                <span className="font-semibold text-text-heading">Font Library</span>.
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center space-x-2 bg-card-header-bg border border-card-border px-3 py-1.5 rounded-xl text-xs font-sans text-text-muted">
            <Sparkles className="h-3.5 w-3.5 text-link-primary" />
            <span>
              Inheritance: <strong className="text-text-heading">{inheritedCount} / 7</strong> slots active
            </span>
          </div>
        </div>
      </div>

      {/* 1. General Group Card */}
      {showGeneral && (
        <div
          className="rounded-2xl border-2 border-link-primary/30 bg-card-bg shadow-2xs overflow-hidden transition-all"
          id={`font-group-${generalConfig.key}`}
        >
          <div className="p-5 border-b border-card-border/70 bg-link-primary/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-link-primary text-btn-primary-text font-bold text-xs shadow-2xs">
                GEN
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-bold text-text-heading font-sans">
                    {generalConfig.name} (Inherited Root)
                  </h4>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-link-primary/10 text-link-primary border border-link-primary/20">
                    Base Parent
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5 font-sans">
                  {generalConfig.description}
                </p>
              </div>
            </div>

            <div className="text-right self-start sm:self-auto">
              <span className="text-[11px] font-semibold text-text-muted bg-card-bg border border-card-border px-2.5 py-1 rounded-lg">
                Inherited by {inheritedCount} groups
              </span>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <label
                htmlFor="font-select-generalFontId"
                className="text-xs font-bold text-text-heading font-sans uppercase tracking-wider block sm:w-1/3"
              >
                General Font Family
              </label>
              <div className="sm:w-2/3">
                <select
                  id="font-select-generalFontId"
                  value={
                    draftFontIds.generalFontId ||
                    (systemFont ? systemFont.id : '')
                  }
                  disabled={isReadOnly || fontsLoading}
                  onChange={(e) => {
                    const val = e.target.value;
                    onFontChange('generalFontId', val || null);
                  }}
                  onBlur={() => {
                    onFontBlur('generalFontId', draftFontIds.generalFontId);
                  }}
                  className="w-full h-10 px-3.5 py-2 text-xs font-medium rounded-xl border border-card-border bg-card-bg text-text-heading focus:outline-hidden focus:ring-2 focus:ring-link-primary focus:border-transparent transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs"
                >
                  {/* System default option */}
                  {systemFont ? (
                    <option value={systemFont.id}>
                      Smart Cookie Default ({systemFont.familyName})
                    </option>
                  ) : (
                    <option value="">Smart Cookie Default (Inter)</option>
                  )}

                  {/* Available uploaded custom fonts */}
                  {availableFonts
                    .filter((f) => !f.isSystem)
                    .map((font) => (
                      <option key={font.id} value={font.id}>
                        {font.name || font.familyName} ({font.format || 'TTF'})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Specimen Preview Box */}
            <div className="rounded-xl border border-card-border/80 bg-card-header-bg/50 p-4">
              <div className="flex items-center justify-between text-[11px] text-text-muted mb-2 font-sans">
                <span className="font-semibold uppercase tracking-wider">Live Typography Specimen</span>
                <span className="font-mono">{generalFontFamily}, sans-serif</span>
              </div>
              <p
                className="text-sm font-normal text-text-heading transition-all"
                style={{ fontFamily: `"${generalFontFamily}", sans-serif` }}
              >
                {generalConfig.sampleText}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Remaining 7 Functional Typography Groups */}
      <div className="space-y-4" id="theme-fonts-groups-list">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider font-sans">
            Specific Group Overrides ({childConfigs.length} slots)
          </h4>
          <span className="text-[11px] text-text-muted font-sans">
            Checking "Use General Font" clears explicit font assignment
          </span>
        </div>

        {childConfigs.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-card-border bg-card-bg text-xs text-text-muted font-sans">
            No typography groups match your search "{searchQuery}".
          </div>
        ) : (
          childConfigs.map((group) => {
            const isInheriting = draftFontIds[group.key] === null;
            const currentFontFamily = resolveFontFamily(group.key);
            const assignedId = draftFontIds[group.key];

            return (
              <div
                key={group.key}
                id={`font-group-${group.key}`}
                className={`rounded-2xl border bg-card-bg shadow-2xs overflow-hidden transition-all ${
                  !isInheriting
                    ? 'border-link-primary/40 ring-1 ring-link-primary/20'
                    : 'border-card-border'
                }`}
              >
                <div className="p-4 sm:p-5 flex flex-col gap-4">
                  {/* Top Bar: Group info & Badges */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-card-border/60 pb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-bold text-text-heading font-sans">
                          {group.name}
                        </h4>
                        {isInheriting ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-card-header-bg text-text-muted border border-card-border">
                            <CornerDownRight className="h-3 w-3 text-link-primary" />
                            <span>Inherits General</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-link-primary/10 text-link-primary border border-link-primary/20">
                            Custom Override
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted mt-0.5 font-sans">
                        {group.description}
                      </p>
                    </div>

                    {/* "Use General Font" Toggle */}
                    <div className="flex items-center shrink-0">
                      <label
                        htmlFor={`toggle-use-general-${group.key}`}
                        className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                          isInheriting
                            ? 'bg-link-primary/10 text-link-primary border-link-primary/30 shadow-2xs'
                            : 'bg-card-header-bg text-text-muted border-card-border hover:text-text-heading'
                        } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <input
                          type="checkbox"
                          id={`toggle-use-general-${group.key}`}
                          checked={isInheriting}
                          disabled={isReadOnly}
                          onChange={(e) => {
                            if (e.target.checked) {
                              // Selecting the toggle nulls that group's FK (inherits General)
                              onFontChange(group.key, null);
                              onFontBlur(group.key, null);
                            } else {
                              // Deselecting assigns an explicit font (defaults to general font or first custom font)
                              const fallbackId =
                                draftFontIds.generalFontId ||
                                systemFont?.id ||
                                availableFonts[0]?.id ||
                                '';
                              onFontChange(group.key, fallbackId || null);
                              onFontBlur(group.key, fallbackId || null);
                            }
                          }}
                          className="rounded border-card-border text-link-primary focus:ring-link-primary h-3.5 w-3.5"
                        />
                        <span>Use General Font</span>
                      </label>
                    </div>
                  </div>

                  {/* Main Controls Row: Font Select */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-4">
                      <span className="text-xs font-semibold text-text-body block font-sans">
                        Assigned Font Family
                      </span>
                      <span className="text-[11px] text-text-muted block font-sans mt-0.5">
                        {isInheriting
                          ? `Currently using General: "${generalFontFamily}"`
                          : 'Specific font active for this functional slot'}
                      </span>
                    </div>

                    <div className="md:col-span-8">
                      <select
                        id={`font-select-${group.key}`}
                        value={isInheriting ? '__inherit__' : assignedId || ''}
                        disabled={isReadOnly || fontsLoading}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '__inherit__') {
                            // Selected inherit: nulls the FK
                            onFontChange(group.key, null);
                            onFontBlur(group.key, null);
                          } else {
                            // Selecting a specific font clears the toggle and sets FK
                            onFontChange(group.key, val);
                          }
                        }}
                        onBlur={() => {
                          if (!isInheriting && assignedId) {
                            onFontBlur(group.key, assignedId);
                          }
                        }}
                        className={`w-full h-10 px-3.5 py-2 text-xs font-medium rounded-xl border text-text-heading focus:outline-hidden focus:ring-2 focus:ring-link-primary focus:border-transparent transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs ${
                          isInheriting
                            ? 'bg-card-header-bg/60 border-card-border text-text-muted italic'
                            : 'bg-card-bg border-link-primary/40 font-semibold'
                        }`}
                      >
                        {/* Inherit option */}
                        <option value="__inherit__">
                          Inherit General ({generalFontDisplayName})
                        </option>

                        {/* System default option */}
                        {systemFont && (
                          <option value={systemFont.id}>
                            Smart Cookie Default ({systemFont.familyName})
                          </option>
                        )}

                        {/* Available custom fonts */}
                        {availableFonts
                          .filter((f) => !f.isSystem)
                          .map((font) => (
                            <option key={font.id} value={font.id}>
                              {font.name || font.familyName} ({font.format || 'TTF'})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Specimen / Preview row */}
                  <div className="rounded-xl border border-card-border/60 bg-card-header-bg/40 px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex-1 truncate">
                      <span
                        className="font-normal text-text-heading transition-all truncate block"
                        style={{ fontFamily: `"${currentFontFamily}", sans-serif` }}
                      >
                        {group.sampleText}
                      </span>
                    </div>
                    <div className="shrink-0 text-[10px] font-mono text-text-muted bg-card-bg border border-card-border px-2 py-0.5 rounded">
                      {currentFontFamily}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
