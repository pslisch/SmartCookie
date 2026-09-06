import { prisma } from '../../src/shared/db/prisma';
import { ThemeStatus } from '@prisma/client';

export const SMART_COOKIE_DEFAULT_COLOR_VALUES = {
  'nav-bg': '#ffffff',
  'nav-text': '#475569',
  'nav-text-active': '#2563eb',
  'text-heading': '#0f172a',
  'text-body': '#334155',
  'text-muted': '#64748b',
  'text-inverse': '#ffffff',
  'btn-primary-bg': '#2563eb',
  'btn-primary-hover': '#1d4ed8',
  'btn-primary-text': '#ffffff',
  'input-border': '#e2e8f0',
  'input-border-focus': '#2563eb',
  'card-bg': '#ffffff',
  'card-border': '#e2e8f0',
  'card-header-bg': '#f8fafc',
  'link-primary': '#2563eb',
  'link-hover': '#1d4ed8',
  'status-success-bg': '#ecfdf5',
  'status-success-text': '#047857',
  'status-warning-bg': '#fffbeb',
  'status-warning-text': '#b45309',
  'status-error-bg': '#fef2f2',
  'status-error-text': '#dc2626',
  'status-info-bg': '#eff6ff',
  'status-info-text': '#1d4ed8',
  'bg-app': '#f8fafc',
  'bg-subtle': '#f1f5f9',
  'bg-overlay': 'rgba(15, 23, 42, 0.40)',
};

export const SMART_COOKIE_DEFAULT_DARK_COLOR_VALUES = {
  'nav-bg': '#0f172a',
  'nav-text': '#94a3b8',
  'nav-text-active': '#60a5fa',
  'text-heading': '#f8fafc',
  'text-body': '#cbd5e1',
  'text-muted': '#94a3b8',
  'text-inverse': '#0f172a',
  'btn-primary-bg': '#3b82f6',
  'btn-primary-hover': '#2563eb',
  'btn-primary-text': '#ffffff',
  'input-border': '#334155',
  'input-border-focus': '#60a5fa',
  'card-bg': '#1e293b',
  'card-border': '#334155',
  'card-header-bg': '#0f172a',
  'link-primary': '#60a5fa',
  'link-hover': '#93c5fd',
  'status-success-bg': '#064e3b',
  'status-success-text': '#34d399',
  'status-warning-bg': '#451a03',
  'status-warning-text': '#fbbf24',
  'status-error-bg': '#450a0a',
  'status-error-text': '#f87171',
  'status-info-bg': '#172554',
  'status-info-text': '#60a5fa',
  'bg-app': '#0b0f19',
  'bg-subtle': '#1e293b',
  'bg-overlay': 'rgba(0, 0, 0, 0.70)',
};

/**
 * Seed system Font (Inter) and default Theme (Smart Cookie Default, ACTIVE) for a company.
 */
export async function seedThemeForCompany(companyId: string) {
  // 1. Ensure system Font "Inter" exists for this company
  let interFont = await prisma.font.findFirst({
    where: {
      companyId,
      familyName: 'Inter',
    },
  });

  if (!interFont) {
    console.log(`[Theme Seed] Creating system font 'Inter' for company: ${companyId}`);
    interFont = await prisma.font.create({
      data: {
        companyId,
        familyName: 'Inter',
        isSystem: true,
        createdById: 'system',
      },
    });
  }

  // 2. Ensure default Theme exists for this company
  const defaultTheme = await prisma.theme.findFirst({
    where: {
      companyId,
      isSmartCookieDefault: true,
    },
  });

  if (!defaultTheme) {
    console.log(`[Theme Seed] Creating 'Smart Cookie Default' theme for company: ${companyId}`);
    await prisma.theme.create({
      data: {
        companyId,
        name: 'Smart Cookie Default',
        status: ThemeStatus.ACTIVE,
        isSmartCookieDefault: true,
        colorValues: SMART_COOKIE_DEFAULT_COLOR_VALUES,
        darkColorValues: SMART_COOKIE_DEFAULT_DARK_COLOR_VALUES,
        generalFontId: interFont.id,
        navFontId: interFont.id,
        headingsFontId: interFont.id,
        buttonsFontId: interFont.id,
        formsFontId: interFont.id,
        cardsFontId: interFont.id,
        linksFontId: interFont.id,
        statusFontId: interFont.id,
        baseFontSize: 16,
        createdById: 'system',
      },
    });
  } else if (!defaultTheme.darkColorValues) {
    await prisma.theme.update({
      where: { id: defaultTheme.id },
      data: { darkColorValues: SMART_COOKIE_DEFAULT_DARK_COLOR_VALUES },
    });
  }
}

/**
 * Seed default theme and system font across all existing companies.
 * Idempotent: safe to run repeatedly on startup or installation.
 */
export async function seedThemes(targetCompanyId?: string) {
  console.log('[Theme Seed] Running default theme and system font seed...');

  if (targetCompanyId) {
    await seedThemeForCompany(targetCompanyId);
    console.log(`[Theme Seed] Completed seed for company: ${targetCompanyId}`);
    return;
  }

  const companies = await prisma.company.findMany();

  for (const company of companies) {
    await seedThemeForCompany(company.id);
  }

  console.log('[Theme Seed] Default theme and system font seed complete.');
}
