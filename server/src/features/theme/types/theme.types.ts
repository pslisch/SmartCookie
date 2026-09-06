export type FontGroup =
  | 'general'
  | 'nav'
  | 'headings'
  | 'buttons'
  | 'forms'
  | 'cards'
  | 'links'
  | 'status';

export interface ResolvedFontDetails {
  id?: string;
  family: string;
  familyName: string;
  format: string | null;
  weight: string | null;
  style: string | null;
  storagePath: string | null;
  isSystem: boolean;
}

export interface ResolvedTheme {
  themeId: string;
  name: string;
  isTest: boolean;
  baseFontSize: number;
  tokens: Record<string, string>;
  colorValues: Record<string, string>;
  darkTokens: Record<string, string> | null;
  darkColorValues: Record<string, string> | null;
  fonts: Record<FontGroup, ResolvedFontDetails>;
}
