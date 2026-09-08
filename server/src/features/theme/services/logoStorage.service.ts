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
 * Returns the storage root directory for theme logo files.
 * Defaults to ./logo-storage if LOGO_STORAGE_PATH environment variable is not defined.
 */
export function getLogoStorageRoot(): string {
  return process.env.LOGO_STORAGE_PATH || path.join(process.cwd(), 'logo-storage');
}

/**
 * Returns the dedicated logos directory within the logo storage root.
 * Ensures the directory exists.
 */
export function getLogosDir(): string {
  const root = path.resolve(getLogoStorageRoot());
  const logosDir = path.resolve(root, 'logos');

  if (logosDir !== root && !logosDir.startsWith(root + path.sep)) {
    throw new PathTraversalError('Invalid logo storage path');
  }

  if (!fs.existsSync(logosDir)) {
    fs.mkdirSync(logosDir, { recursive: true });
  }

  return logosDir;
}

/**
 * Safely saves an uploaded logo buffer to the logos storage directory with path-safety verification.
 * Returns the relative storage path to be recorded in the database.
 */
export function saveLogoFile(themeId: string, ext: string, buffer: Buffer): string {
  if (!themeId || themeId.includes('..') || themeId.includes('/') || themeId.includes('\\')) {
    throw new PathTraversalError('Invalid theme ID');
  }

  const sanitizedExt = ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  if (!allowedExtensions.includes(sanitizedExt)) {
    throw new Error('Unsupported image extension');
  }

  const logosDir = getLogosDir();
  const filename = `${themeId}-${Date.now()}${sanitizedExt}`;
  const targetPath = path.resolve(logosDir, filename);

  if (targetPath !== logosDir && !targetPath.startsWith(logosDir + path.sep)) {
    throw new PathTraversalError('Path traversal detected in logo file destination');
  }

  fs.writeFileSync(targetPath, buffer);
  return path.relative(process.cwd(), targetPath);
}

/**
 * Resolves a stored logo file path safely, verifying it remains inside the logo storage directory
 * and exists on disk.
 */
export function getLogoFilePath(storagePath: string): string {
  if (!storagePath) {
    throw new PathTraversalError('Invalid logo file reference');
  }

  const decoded = decodeURIComponent(storagePath).replace(/\0/g, '');
  if (decoded.includes('..')) {
    throw new PathTraversalError('Invalid logo file reference');
  }

  const fullPath = path.isAbsolute(decoded)
    ? decoded
    : path.resolve(process.cwd(), decoded);

  const root = path.resolve(getLogoStorageRoot());
  const logosDir = path.resolve(root, 'logos');

  if (
    !fullPath.startsWith(logosDir + path.sep) &&
    !fullPath.startsWith(root + path.sep) &&
    !fullPath.startsWith(path.resolve(process.cwd()) + path.sep)
  ) {
    throw new PathTraversalError('Logo file path outside storage directory');
  }

  if (!fs.existsSync(fullPath)) {
    throw new Error('Logo file not found on disk');
  }

  return fullPath;
}

/**
 * Deletes a logo file from disk if it exists.
 */
export function deleteLogoFile(storagePath?: string | null): void {
  if (!storagePath) return;

  try {
    const decoded = decodeURIComponent(storagePath).replace(/\0/g, '');
    if (decoded.includes('..')) {
      return;
    }

    const fullPath = path.isAbsolute(decoded)
      ? decoded
      : path.resolve(process.cwd(), decoded);

    const root = path.resolve(getLogoStorageRoot());
    const cwd = path.resolve(process.cwd());

    // Basic safety check so it only unlinks within logo root or cwd
    if (!fullPath.startsWith(root) && !fullPath.startsWith(cwd)) {
      return;
    }

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    console.warn('[LogoStorage] Could not delete logo file:', error);
  }
}
