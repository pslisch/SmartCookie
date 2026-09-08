export type ThemeStatus = 'DRAFT' | 'READY' | 'ACTIVE';

export interface ThemeFont {
  id: string;
  familyName: string;
  format?: string | null;
  weight?: string | null;
  style?: string | null;
  storagePath?: string | null;
  isSystem: boolean;
}

export interface FontLibraryItem {
  id: string;
  name: string;
  familyName: string;
  format: string;
  isSystem?: boolean;
}

export interface AffectedThemeInfo {
  id: string;
  name: string;
  groups?: string[];
}

export type FontGroupSlot =
  | 'generalFontId'
  | 'navFontId'
  | 'headingsFontId'
  | 'buttonsFontId'
  | 'formsFontId'
  | 'cardsFontId'
  | 'linksFontId'
  | 'statusFontId';

export interface FontSlotConfig {
  key: FontGroupSlot;
  previewKey: 'general' | 'nav' | 'headings' | 'buttons' | 'forms' | 'cards' | 'links' | 'status';
  name: string;
  shortName: string;
  description: string;
  isGeneral?: boolean;
  sampleText: string;
}

export interface Theme {
  id: string;
  companyId: string;
  name: string;
  status: ThemeStatus;
  isSmartCookieDefault: boolean;
  colorValues: Record<string, string> | string;
  darkColorValues?: Record<string, string> | string | null;
  generalFontId?: string | null;
  navFontId?: string | null;
  headingsFontId?: string | null;
  buttonsFontId?: string | null;
  formsFontId?: string | null;
  cardsFontId?: string | null;
  linksFontId?: string | null;
  statusFontId?: string | null;
  baseFontSize: number;
  logoStoragePath?: string | null;
  scheduledActivationAt?: string | null;
  scheduledActivationFailedAt?: string | null;
  scheduledActivationFailedReason?: string | null;
  deletedAt?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  generalFont?: ThemeFont | null;
  navFont?: ThemeFont | null;
  headingsFont?: ThemeFont | null;
  buttonsFont?: ThemeFont | null;
  formsFont?: ThemeFont | null;
  cardsFont?: ThemeFont | null;
  linksFont?: ThemeFont | null;
  statusFont?: ThemeFont | null;
}
