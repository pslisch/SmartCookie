import { prisma } from '../../../shared/db/prisma';
import { Theme, Font, ThemeStatus } from '@prisma/client';
import {
  SMART_COOKIE_DEFAULT_COLOR_VALUES,
  SMART_COOKIE_DEFAULT_DARK_COLOR_VALUES,
} from '../../../../prisma/seed/themeSeed';
import { FontGroup, ResolvedFontDetails, ResolvedTheme } from '../types/theme.types';

type ThemeWithFonts = Theme & {
  generalFont?: Font | null;
  navFont?: Font | null;
  headingsFont?: Font | null;
  buttonsFont?: Font | null;
  formsFont?: Font | null;
  cardsFont?: Font | null;
  linksFont?: Font | null;
  statusFont?: Font | null;
};

const FONT_SLOTS: Record<
  FontGroup,
  {
    slotId: keyof Pick<
      Theme,
      | 'generalFontId'
      | 'navFontId'
      | 'headingsFontId'
      | 'buttonsFontId'
      | 'formsFontId'
      | 'cardsFontId'
      | 'linksFontId'
      | 'statusFontId'
    >;
    slotRelation: keyof Pick<
      ThemeWithFonts,
      | 'generalFont'
      | 'navFont'
      | 'headingsFont'
      | 'buttonsFont'
      | 'formsFont'
      | 'cardsFont'
      | 'linksFont'
      | 'statusFont'
    >;
  }
> = {
  general: { slotId: 'generalFontId', slotRelation: 'generalFont' },
  nav: { slotId: 'navFontId', slotRelation: 'navFont' },
  headings: { slotId: 'headingsFontId', slotRelation: 'headingsFont' },
  buttons: { slotId: 'buttonsFontId', slotRelation: 'buttonsFont' },
  forms: { slotId: 'formsFontId', slotRelation: 'formsFont' },
  cards: { slotId: 'cardsFontId', slotRelation: 'cardsFont' },
  links: { slotId: 'linksFontId', slotRelation: 'linksFont' },
  status: { slotId: 'statusFontId', slotRelation: 'statusFont' },
};

function parseJsonRecord(val: unknown): Record<string, string> | null {
  if (!val) return null;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, string>;
      }
    } catch {
      return null;
    }
  }
  if (typeof val === 'object' && !Array.isArray(val)) {
    return val as Record<string, string>;
  }
  return null;
}

function toFontDetails(font: Font | null | undefined, fallbackInter?: Font | null): ResolvedFontDetails {
  const chosen = font || fallbackInter;
  if (chosen) {
    return {
      id: chosen.id,
      family: chosen.familyName,
      familyName: chosen.familyName,
      format: chosen.format ?? null,
      weight: chosen.weight ?? null,
      style: chosen.style ?? null,
      storagePath: chosen.storagePath ?? null,
      isSystem: chosen.isSystem,
    };
  }
  return {
    id: 'system-inter',
    family: 'Inter',
    familyName: 'Inter',
    format: 'woff2',
    weight: null,
    style: null,
    storagePath: null,
    isSystem: true,
  };
}

function resolveFontForSlot(
  group: FontGroup,
  testTheme?: ThemeWithFonts | null,
  activeTheme?: ThemeWithFonts | null,
  defaultTheme?: ThemeWithFonts | null,
  systemInter?: Font | null
): ResolvedFontDetails {
  const { slotId, slotRelation } = FONT_SLOTS[group];

  let chosenFont: Font | null | undefined = null;

  if (testTheme && testTheme[slotId] && testTheme[slotRelation]) {
    chosenFont = testTheme[slotRelation];
  } else if (activeTheme && activeTheme[slotId] && activeTheme[slotRelation]) {
    chosenFont = activeTheme[slotRelation];
  } else if (defaultTheme && defaultTheme[slotId] && defaultTheme[slotRelation]) {
    chosenFont = defaultTheme[slotRelation];
  } else if (testTheme?.[slotRelation]) {
    chosenFont = testTheme[slotRelation];
  } else if (activeTheme?.[slotRelation]) {
    chosenFont = activeTheme[slotRelation];
  } else if (defaultTheme?.[slotRelation]) {
    chosenFont = defaultTheme[slotRelation];
  }

  return toFontDetails(chosenFont, systemInter);
}

export class ThemeResolutionService {
  /**
   * Resolves the effective theme for a company with priority:
   * test override > global Active > Smart Cookie Default.
   *
   * When mode is 'dark', resolves from darkColorValues (with the same
   * test > active > default fallback chain, falling back to Smart Cookie Default's
   * dark values for missing keys).
   *
   * Every token key, dark token key, font FK, and baseFontSize falls back
   * to default values so no property is missing or null.
   */
  async resolveTheme(
    companyId: string,
    testThemeId?: string,
    mode: 'light' | 'dark' = 'light'
  ): Promise<ResolvedTheme> {
    const fontInclude = {
      generalFont: true,
      navFont: true,
      headingsFont: true,
      buttonsFont: true,
      formsFont: true,
      cardsFont: true,
      linksFont: true,
      statusFont: true,
    };

    // 1. Fetch test theme if requested (must belong to company and not be soft-deleted)
    let testTheme: ThemeWithFonts | null = null;
    if (testThemeId) {
      testTheme = await prisma.theme.findFirst({
        where: {
          id: testThemeId,
          companyId,
          deletedAt: null,
        },
        include: fontInclude,
      });
    }

    // 2. Fetch global Active theme for company
    const activeTheme = await prisma.theme.findFirst({
      where: {
        companyId,
        status: ThemeStatus.ACTIVE,
        deletedAt: null,
      },
      include: fontInclude,
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // 3. Fetch Smart Cookie Default theme for company
    const defaultTheme = await prisma.theme.findFirst({
      where: {
        companyId,
        isSmartCookieDefault: true,
      },
      include: fontInclude,
    });

    // 4. Fetch system Inter font for company (if exists)
    const systemInter = await prisma.font.findFirst({
      where: {
        companyId,
        familyName: 'Inter',
      },
    });

    // Determine metadata
    const isTest = Boolean(testTheme);
    const effectiveTheme = testTheme || activeTheme || defaultTheme;
    const themeId = effectiveTheme?.id || 'default';
    const name = effectiveTheme?.name || 'Smart Cookie Default';

    // 5. Merge light color tokens
    const testColors = parseJsonRecord(testTheme?.colorValues);
    const activeColors = parseJsonRecord(activeTheme?.colorValues);
    const defaultColors = parseJsonRecord(defaultTheme?.colorValues);

    const allTokenKeys = new Set<string>([
      ...Object.keys(SMART_COOKIE_DEFAULT_COLOR_VALUES),
      ...Object.keys(defaultColors || {}),
      ...Object.keys(activeColors || {}),
      ...Object.keys(testColors || {}),
    ]);

    const resolvedLightTokens: Record<string, string> = {};
    for (const key of allTokenKeys) {
      const val =
        testColors?.[key] ??
        activeColors?.[key] ??
        defaultColors?.[key] ??
        (SMART_COOKIE_DEFAULT_COLOR_VALUES as Record<string, string>)[key];
      if (val !== undefined && val !== null) {
        resolvedLightTokens[key] = String(val);
      }
    }

    // 6. Merge dark color tokens with fallback chain:
    // test override > active > default > Smart Cookie Default's dark values
    const testDarkColors = parseJsonRecord(testTheme?.darkColorValues);
    const activeDarkColors = parseJsonRecord(activeTheme?.darkColorValues);
    const defaultDarkColors = parseJsonRecord(defaultTheme?.darkColorValues);

    const allDarkKeys = new Set<string>([
      ...Object.keys(SMART_COOKIE_DEFAULT_DARK_COLOR_VALUES),
      ...allTokenKeys,
      ...Object.keys(defaultDarkColors || {}),
      ...Object.keys(activeDarkColors || {}),
      ...Object.keys(testDarkColors || {}),
    ]);

    const resolvedDarkTokens: Record<string, string> = {};
    for (const key of allDarkKeys) {
      const val =
        testDarkColors?.[key] ??
        activeDarkColors?.[key] ??
        defaultDarkColors?.[key] ??
        (SMART_COOKIE_DEFAULT_DARK_COLOR_VALUES as Record<string, string>)[key] ??
        resolvedLightTokens[key];
      if (val !== undefined && val !== null) {
        resolvedDarkTokens[key] = String(val);
      }
    }

    // Effective tokens chosen according to requested display mode
    const effectiveTokens = mode === 'dark' ? resolvedDarkTokens : resolvedLightTokens;

    // 7. Merge base font size
    const baseFontSize =
      testTheme?.baseFontSize ??
      activeTheme?.baseFontSize ??
      defaultTheme?.baseFontSize ??
      16;

    // 8. Merge font details per group
    const fonts: Record<FontGroup, ResolvedFontDetails> = {
      general: resolveFontForSlot('general', testTheme, activeTheme, defaultTheme, systemInter),
      nav: resolveFontForSlot('nav', testTheme, activeTheme, defaultTheme, systemInter),
      headings: resolveFontForSlot('headings', testTheme, activeTheme, defaultTheme, systemInter),
      buttons: resolveFontForSlot('buttons', testTheme, activeTheme, defaultTheme, systemInter),
      forms: resolveFontForSlot('forms', testTheme, activeTheme, defaultTheme, systemInter),
      cards: resolveFontForSlot('cards', testTheme, activeTheme, defaultTheme, systemInter),
      links: resolveFontForSlot('links', testTheme, activeTheme, defaultTheme, systemInter),
      status: resolveFontForSlot('status', testTheme, activeTheme, defaultTheme, systemInter),
    };

    // 9. Resolve theme logo URL: null if the resolved theme has no logoStoragePath, otherwise /api/themes/{themeId}/logo
    const logoUrl =
      effectiveTheme?.id && effectiveTheme.logoStoragePath
        ? `/api/themes/${effectiveTheme.id}/logo`
        : null;

    return {
      themeId,
      name,
      isTest,
      baseFontSize,
      tokens: effectiveTokens,
      colorValues: effectiveTokens,
      darkTokens: resolvedDarkTokens,
      darkColorValues: resolvedDarkTokens,
      fonts,
      logoUrl,
    };
  }
}

export const themeResolutionService = new ThemeResolutionService();
