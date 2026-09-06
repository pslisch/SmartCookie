import * as path from 'path';
import * as fontkit from 'fontkit';
import { prisma } from '../../../shared/db/prisma';
import { saveFontFile } from './fontStorage.service';

export interface ParsedFontMeta {
  familyName: string;
  format: 'TTF' | 'OTF' | 'WOFF' | 'WOFF2';
  weight: string;
  style: string;
}

export interface FontUploadResult {
  imported: Array<{
    id: string;
    name: string;
    familyName: string;
    format: string;
    weight: string | null;
    style: string | null;
  }>;
  failed: Array<{
    filename: string;
    reason: string;
  }>;
}

/**
 * Detects the specific web font format from buffer magic headers or extension.
 */
export function detectFontFormat(buffer: Buffer, originalFilename?: string): 'TTF' | 'OTF' | 'WOFF' | 'WOFF2' {
  if (buffer.length >= 4) {
    const magicAscii = buffer.subarray(0, 4).toString('ascii');
    const magicBinary = buffer.subarray(0, 4).toString('binary');

    if (magicAscii === 'wOF2') return 'WOFF2';
    if (magicAscii === 'wOFF') return 'WOFF';
    if (magicAscii === 'OTTO') return 'OTF';
    if (magicBinary === '\x00\x01\x00\x00' || magicAscii === 'true') {
      if (originalFilename && originalFilename.toLowerCase().endsWith('.otf')) {
        return 'OTF';
      }
      return 'TTF';
    }
  }

  // Fallback to original file extension
  if (originalFilename) {
    const ext = path.extname(originalFilename).toLowerCase();
    if (ext === '.woff2') return 'WOFF2';
    if (ext === '.woff') return 'WOFF';
    if (ext === '.otf') return 'OTF';
    if (ext === '.ttf') return 'TTF';
  }

  return 'TTF';
}

/**
 * Parses and validates an uploaded font file using fontkit.
 * Rejects corrupt, extension-spoofed, or unusable fonts.
 */
export function validateAndParseFont(buffer: Buffer, originalFilename: string): ParsedFontMeta {
  if (!buffer || buffer.length < 16) {
    throw new Error('File is too small to be a valid font.');
  }

  const format = detectFontFormat(buffer, originalFilename);
  const supportedFormats = ['TTF', 'OTF', 'WOFF', 'WOFF2'];
  if (!supportedFormats.includes(format)) {
    throw new Error(`Unsupported font format. Only TTF, OTF, WOFF, and WOFF2 web fonts are supported.`);
  }

  // Parse font with fontkit
  let parsedFont: any;
  try {
    const createFn = (fontkit as any).create || (fontkit as any).default?.create;
    if (typeof createFn !== 'function') {
      throw new Error('Fontkit parser function is unavailable.');
    }
    parsedFont = createFn(buffer);
  } catch (err: any) {
    throw new Error(`Invalid or corrupt font file. Could not parse font structures: ${err?.message || 'Unknown font error'}`);
  }

  // Handle Font Collection if applicable
  if (parsedFont && 'fonts' in parsedFont && Array.isArray(parsedFont.fonts) && parsedFont.fonts.length > 0) {
    parsedFont = parsedFont.fonts[0];
  }

  if (!parsedFont) {
    throw new Error('Invalid font: No valid font instance could be extracted.');
  }

  // Extract family name
  const familyName = (parsedFont.familyName || parsedFont.fullName || '').trim();
  if (!familyName) {
    throw new Error('Font metadata error: Missing font family name.');
  }

  // Validate that the font has glyph outlines
  const numGlyphs = parsedFont.numGlyphs;
  if (typeof numGlyphs !== 'number' || numGlyphs <= 0) {
    throw new Error('Invalid font: Font does not contain any renderable glyphs.');
  }

  // Extract weight from OS/2 table or fallback from subfamily name
  let weight = '400';
  if (parsedFont['OS/2'] && typeof parsedFont['OS/2'].usWeightClass === 'number' && parsedFont['OS/2'].usWeightClass > 0) {
    weight = String(parsedFont['OS/2'].usWeightClass);
  } else if (parsedFont.subfamilyName) {
    const sub = parsedFont.subfamilyName.toLowerCase();
    if (sub.includes('bold') || sub.includes('black') || sub.includes('heavy')) {
      weight = '700';
    } else if (sub.includes('light') || sub.includes('thin')) {
      weight = '300';
    } else if (sub.includes('medium')) {
      weight = '500';
    }
  }

  // Extract style from OS/2 table fsSelection or italicAngle
  let style = 'normal';
  const fsSelection = parsedFont['OS/2']?.fsSelection;
  if (fsSelection && fsSelection.italic) {
    style = 'italic';
  } else if (typeof parsedFont.italicAngle === 'number' && parsedFont.italicAngle !== 0) {
    style = 'italic';
  } else if (parsedFont.subfamilyName && parsedFont.subfamilyName.toLowerCase().includes('italic')) {
    style = 'italic';
  }

  return {
    familyName,
    format,
    weight,
    style,
  };
}

/**
 * Checks whether a font family already exists for this company (case-insensitive)
 * or within the current upload batch.
 */
export async function checkDuplicateFontFamily(
  companyId: string,
  familyName: string,
  batchFamilies?: Set<string>
): Promise<void> {
  const normalized = familyName.trim().toLowerCase();

  // 1. Check in current upload batch
  if (batchFamilies && batchFamilies.has(normalized)) {
    throw new Error(`Font family "${familyName}" is duplicated in this upload batch.`);
  }

  // 2. Check in database for the company
  const existingFonts = await prisma.font.findMany({
    where: { companyId },
    select: { familyName: true },
  });

  const duplicate = existingFonts.find((f) => f.familyName.trim().toLowerCase() === normalized);
  if (duplicate) {
    throw new Error(`Font family "${familyName}" already exists in your company font library.`);
  }
}

/**
 * Processes a single uploaded font file:
 * - Validates and extracts metadata using fontkit
 * - Checks for duplicate family names
 * - Saves file to company storage
 * - Inserts record into database
 */
export async function processSingleFont(
  companyId: string,
  userId: string,
  file: Express.Multer.File,
  batchFamilies?: Set<string>
) {
  // 1. Validate and parse font metadata
  const meta = validateAndParseFont(file.buffer, file.originalname);

  // 2. Check for duplicate family name (case-insensitive)
  await checkDuplicateFontFamily(companyId, meta.familyName, batchFamilies);

  // 3. Save font file safely to disk
  const ext = path.extname(file.originalname).toLowerCase() || `.${meta.format.toLowerCase()}`;
  const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeFilename = `${Date.now()}-${baseName}${ext}`;
  const storagePath = saveFontFile(companyId, safeFilename, file.buffer);

  // 4. Create database record
  const fontRecord = await prisma.font.create({
    data: {
      companyId,
      familyName: meta.familyName,
      format: meta.format,
      weight: meta.weight,
      style: meta.style,
      storagePath,
      isSystem: false,
      createdById: userId,
    },
  });

  // Track family name for the batch
  if (batchFamilies) {
    batchFamilies.add(meta.familyName.trim().toLowerCase());
  }

  return fontRecord;
}

/**
 * Processes multiple font uploads independently.
 * A failure in one font file does NOT block valid font files in the same batch.
 */
export async function processMultipleFonts(
  companyId: string,
  userId: string,
  files: Express.Multer.File[]
): Promise<FontUploadResult> {
  const imported: FontUploadResult['imported'] = [];
  const failed: FontUploadResult['failed'] = [];
  const batchFamilies = new Set<string>();

  for (const file of files) {
    try {
      const font = await processSingleFont(companyId, userId, file, batchFamilies);
      imported.push({
        id: font.id,
        name: font.familyName,
        familyName: font.familyName,
        format: font.format || 'TTF',
        weight: font.weight,
        style: font.style,
      });
    } catch (err: any) {
      failed.push({
        filename: file.originalname,
        reason: err?.message || 'Failed to process font file.',
      });
    }
  }

  return { imported, failed };
}

/**
 * Retrieves the font library for a company (name + format only per Section 10).
 */
export async function listCompanyFonts(companyId: string) {
  const fonts = await prisma.font.findMany({
    where: {
      OR: [
        { companyId },
        { isSystem: true },
      ],
    },
    orderBy: { familyName: 'asc' },
    select: {
      id: true,
      familyName: true,
      format: true,
      isSystem: true,
    },
  });

  return fonts.map((f) => ({
    id: f.id,
    name: f.familyName,
    familyName: f.familyName,
    format: f.format || 'TTF',
    isSystem: f.isSystem,
  }));
}
