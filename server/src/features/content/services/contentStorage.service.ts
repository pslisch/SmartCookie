import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';

export class PathTraversalError extends Error {
  status = 404;
  constructor(message: string) {
    super(message);
    this.name = 'PathTraversalError';
  }
}

export function getContentStorageRoot(): string {
  return process.env.CONTENT_STORAGE_PATH || path.join(process.cwd(), 'content-storage');
}

export function getContentDir(contentId: string): string {
  // Path traversal check on the contentId itself to be safe
  if (contentId.includes('..') || contentId.includes('/') || contentId.includes('\\')) {
    throw new PathTraversalError('Invalid content ID');
  }
  return path.resolve(getContentStorageRoot(), contentId);
}

/**
 * Safely extracts a zip file into a content directory, preventing Zip Slip (Path Traversal) attacks.
 * If any entry would resolve outside the target directory, the extraction is aborted before writing.
 */
export function extractZip(zipPath: string, contentId: string, _mockEntries?: any[]): string {
  const destDir = getContentDir(contentId);
  const resolvedDestDir = path.resolve(destDir);
  
  if (!fs.existsSync(zipPath) && !_mockEntries) {
    throw new Error(`Zip file not found at ${zipPath}`);
  }
  
  const zip = !_mockEntries ? new AdmZip(zipPath) : null;
  const zipEntries = _mockEntries || zip!.getEntries();
  
  // 1. Path-traversal (Zip Slip) validation step:
  // Validate all entries before writing any file to abort the entire process if malicious.
  for (const entry of zipEntries) {
    const targetPath = path.join(resolvedDestDir, entry.entryName);
    const resolvedTarget = path.resolve(targetPath);
    
    if (resolvedTarget !== resolvedDestDir && !resolvedTarget.startsWith(resolvedDestDir + path.sep)) {
      throw new Error(`Zip slip protection: Invalid zip entry path "${entry.entryName}"`);
    }
  }
  
  // Create destDir if it doesn't exist
  fs.mkdirSync(resolvedDestDir, { recursive: true });
  
  // 2. Safe Extraction step
  for (const entry of zipEntries) {
    const targetPath = path.join(resolvedDestDir, entry.entryName);
    const resolvedTarget = path.resolve(targetPath);
    
    if (entry.isDirectory) {
      fs.mkdirSync(resolvedTarget, { recursive: true });
    } else {
      const parentDir = path.dirname(resolvedTarget);
      fs.mkdirSync(parentDir, { recursive: true });
      fs.writeFileSync(resolvedTarget, entry.getData());
    }
  }
  
  return resolvedDestDir;
}

/**
 * Resolves a requested subpath against a content directory, ensuring that the target file
 * does not escape the content's directory. Throws a 404 PathTraversalError if it does.
 */
export function getContentFilePath(contentId: string, requestedSubPath: string): string {
  const contentDir = getContentDir(contentId);
  
  // Decode percent encoding and remove null bytes to prevent attacks
  const decodedSubPath = decodeURIComponent(requestedSubPath).replace(/\0/g, '');
  
  const targetPath = path.join(contentDir, decodedSubPath);
  const resolvedTarget = path.resolve(targetPath);
  
  if (resolvedTarget !== contentDir && !resolvedTarget.startsWith(contentDir + path.sep)) {
    throw new PathTraversalError('File not found');
  }
  
  // Also verify that the file actually exists on disk
  if (!fs.existsSync(resolvedTarget)) {
    throw new PathTraversalError('File not found');
  }
  
  return resolvedTarget;
}
