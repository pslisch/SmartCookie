import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import { prisma } from '../../../shared/db/prisma.js';
import { getContentStorageRoot } from './contentStorage.service.js';

export class InvalidImageError extends Error {
  status = 400;
  constructor(message: string) {
    super(message);
    this.name = 'InvalidImageError';
  }
}

export class ImageUploadService {
  /**
   * Validates the file's magic bytes to ensure it's a real image (JPEG, PNG, GIF, or WebP).
   * Returns the recommended extension if valid, or throws an InvalidImageError if invalid.
   */
  validateImageSignature(buffer: Buffer): string {
    if (buffer.length < 4) {
      throw new InvalidImageError('File is too small to be a valid image.');
    }

    // JPEG signature check (FF D8 FF)
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      return '.jpg';
    }

    // PNG signature check (89 50 4E 47 0D 0A 1A 0A)
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return '.png';
    }

    // GIF signature check (GIF87a / GIF89a -> 47 49 46 38 37/39 61)
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
      return '.gif';
    }

    // WebP signature check ("RIFF" at 0-3, "WEBP" at 8-11)
    if (buffer.length >= 12) {
      const isRiff = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
      const isWebp = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
      if (isRiff && isWebp) {
        return '.webp';
      }
    }

    throw new InvalidImageError('Invalid image format: file does not match a supported image signature (JPEG, PNG, GIF, WebP).');
  }

  /**
   * Uploads and saves a content thumbnail.
   * Enforces max size (2MB) and magic bytes signature validation.
   */
  async uploadThumbnail(imageBuffer: Buffer, contentId: string): Promise<string> {
    // 1. Enforce max size of 2MB
    const MAX_SIZE = 2 * 1024 * 1024; // 2MB
    if (imageBuffer.length > MAX_SIZE) {
      throw new InvalidImageError('File size exceeds the maximum allowed limit of 2MB.');
    }

    // 2. Validate content is actually a valid image by magic bytes signature
    const ext = this.validateImageSignature(imageBuffer);

    // 3. Confirm that the content package exists
    const content = await prisma.content.findUnique({
      where: { id: contentId }
    });
    if (!content) {
      throw new Error(`Content with ID ${contentId} not found.`);
    }

    // 4. Save to a dedicated thumbnails folder under the storage root
    const storageRoot = getContentStorageRoot();
    const thumbnailDir = path.join(storageRoot, 'thumbnails');
    fs.mkdirSync(thumbnailDir, { recursive: true });

    // Use a unique name or the contentId
    const filename = `${contentId}${ext}`;
    const targetPath = path.join(thumbnailDir, filename);

    fs.writeFileSync(targetPath, imageBuffer);

    // 5. Update the database record with the relative or absolute target path
    await prisma.content.update({
      where: { id: contentId },
      data: { thumbnailPath: targetPath }
    });

    return targetPath;
  }
}
