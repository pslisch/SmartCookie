import * as fs from 'fs';
import * as path from 'path';

export class PathTraversalError extends Error {
  status = 400;
  constructor(message: string) {
    super(message);
    this.name = 'PathTraversalError';
  }
}

/**
 * Returns the storage root directory for custom font files.
 * Defaults to ./font-storage if FONT_STORAGE_PATH environment variable is not defined.
 */
export function getFontStorageRoot(): string {
  return process.env.FONT_STORAGE_PATH || path.join(process.cwd(), 'font-storage');
}

/**
 * Validates company ID and returns company-specific directory within font storage root.
 * Throws PathTraversalError if companyId contains directory traversal sequences.
 */
export function getCompanyFontDir(companyId: string): string {
  if (!companyId || companyId.includes('..') || companyId.includes('/') || companyId.includes('\\')) {
    throw new PathTraversalError('Invalid company ID');
  }

  const root = path.resolve(getFontStorageRoot());
  const companyDir = path.resolve(root, companyId);

  if (companyDir !== root && !companyDir.startsWith(root + path.sep)) {
    throw new PathTraversalError('Invalid company storage path');
  }

  if (!fs.existsSync(companyDir)) {
    fs.mkdirSync(companyDir, { recursive: true });
  }

  return companyDir;
}

/**
 * Safely saves an uploaded font buffer to company storage with path-safety verification.
 * Returns the relative storage path to be recorded in the database.
 */
export function saveFontFile(companyId: string, filename: string, buffer: Buffer): string {
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new PathTraversalError('Invalid font filename');
  }

  const companyDir = getCompanyFontDir(companyId);
  const targetPath = path.resolve(companyDir, filename);

  if (targetPath !== companyDir && !targetPath.startsWith(companyDir + path.sep)) {
    throw new PathTraversalError('Path traversal detected in font file destination');
  }

  fs.writeFileSync(targetPath, buffer);
  return path.relative(process.cwd(), targetPath);
}

/**
 * Resolves a stored font file path safely, verifying it remains inside the company directory
 * and exists on disk.
 */
export function getFontFilePath(companyId: string, filename: string): string {
  const companyDir = getCompanyFontDir(companyId);
  const decodedFilename = decodeURIComponent(filename).replace(/\0/g, '');

  if (decodedFilename.includes('..') || decodedFilename.includes('/') || decodedFilename.includes('\\')) {
    throw new PathTraversalError('Invalid font file reference');
  }

  const targetPath = path.resolve(companyDir, decodedFilename);

  if (targetPath !== companyDir && !targetPath.startsWith(companyDir + path.sep)) {
    throw new PathTraversalError('Font file path outside company directory');
  }

  if (!fs.existsSync(targetPath)) {
    throw new PathTraversalError('Font file not found on disk');
  }

  return targetPath;
}

/**
 * Deletes a font file from disk if it exists.
 */
export function deleteFontFile(companyId: string, filename: string): void {
  try {
    const filePath = getFontFilePath(companyId, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Ignore if already gone
  }
}
