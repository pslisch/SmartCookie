import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { requireAuth } from '../../../shared/middleware/session.middleware';
import { requirePermission } from '../../../shared/middleware/permission.middleware';
import { prisma } from '../../../shared/db/prisma';
import { processMultipleFonts, listCompanyFonts } from '../services/font.service';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max per font file
    files: 20, // max 20 files per upload batch
  },
});

/**
 * The 8 font-group foreign key fields on Theme per Prisma schema.
 */
export const FONT_GROUP_FIELDS = [
  'generalFontId',
  'navFontId',
  'headingsFontId',
  'buttonsFontId',
  'formsFontId',
  'cardsFontId',
  'linksFontId',
  'statusFontId',
] as const;

type FontGroupField = typeof FONT_GROUP_FIELDS[number];

async function getEffectiveCompanyId(req: Request): Promise<string | null> {
  if (req.user?.companyId) {
    return req.user.companyId;
  }
  const company = await prisma.company.findFirst();
  return company?.id || null;
}

/**
 * GET /api/fonts
 * Lists all fonts available in the company's font library.
 * Returns font name and format only (per Section 10).
 * Requires theme:view permission.
 */
router.get('/', requireAuth, requirePermission('theme', 'view'), async (req: Request, res: Response) => {
  try {
    const companyId = await getEffectiveCompanyId(req);
    if (!companyId) {
      return res.status(400).json({ error: 'Company context is missing.' });
    }

    const fonts = await listCompanyFonts(companyId);
    return res.json(fonts);
  } catch (error: any) {
    console.error('[FontRoutes] Error listing fonts:', error);
    return res.status(500).json({ error: error.message || 'Failed to list fonts.' });
  }
});

/**
 * GET /api/fonts/:id/file
 * Serves custom uploaded font files for browser @font-face loading.
 */
router.get('/:id/file', async (req: Request, res: Response) => {
  try {
    const font = await prisma.font.findUnique({
      where: { id: req.params.id },
    });

    if (!font || !font.storagePath) {
      return res.status(404).json({ error: 'Font file not found.' });
    }

    const fullPath = path.isAbsolute(font.storagePath)
      ? font.storagePath
      : path.resolve(process.cwd(), font.storagePath);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Font file not found on disk.' });
    }

    const mimeTypes: Record<string, string> = {
      woff2: 'font/woff2',
      woff: 'font/woff',
      ttf: 'font/ttf',
      otf: 'font/otf',
    };

    const ext = (font.format || path.extname(fullPath).replace(/^\./, '')).toLowerCase();
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(fullPath);
  } catch (error: any) {
    console.error('[FontRoutes] Error serving font file:', error);
    return res.status(500).json({ error: 'Failed to serve font file.' });
  }
});

/**
 * POST /api/fonts
 * Multi-file font upload under field name "fonts".
 * Rejects corrupt or invalid fonts with fontkit; auto-detects metadata (TTF, OTF, WOFF, WOFF2);
 * checks for duplicate family names per company (case-insensitive);
 * processes each file independently so bad files do not block good files.
 * Requires theme:edit permission.
 */
router.post(
  '/',
  requireAuth,
  requirePermission('theme', 'edit'),
  upload.array('fonts'),
  async (req: Request, res: Response) => {
    try {
      const companyId = await getEffectiveCompanyId(req);
      if (!companyId) {
        return res.status(400).json({ error: 'Company context is missing.' });
      }

      const files = req.files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No font files provided under the "fonts" field.' });
      }

      const userId = req.user?.id || 'system';
      const result = await processMultipleFonts(companyId, userId, files);

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('[FontRoutes] Error uploading fonts:', error);
      return res.status(500).json({ error: error.message || 'Failed to upload fonts.' });
    }
  }
);

/**
 * DELETE /api/fonts/:id
 * Requires theme:edit permission.
 * - Returns 403 if isSystem font (cannot be deleted).
 * - Checks every Theme row scoped to this company for any of the 8 font-group FKs.
 * - If any found, returns 409 with list of affected themes (id, name, groups) without deletion.
 * - If none found, hard-deletes the Font row and removes its stored file from disk.
 */
router.delete(
  '/:id',
  requireAuth,
  requirePermission('theme', 'edit'),
  async (req: Request, res: Response) => {
    try {
      const companyId = await getEffectiveCompanyId(req);
      if (!companyId) {
        return res.status(400).json({ error: 'Company context is missing.' });
      }

      const fontId = req.params.id;

      const font = await prisma.font.findUnique({
        where: { id: fontId },
      });

      if (!font) {
        return res.status(404).json({ error: 'Font not found.' });
      }

      // Ensure tenant scoping: non-system fonts must belong to this company
      if (!font.isSystem && font.companyId !== companyId) {
        return res.status(404).json({ error: 'Font not found in your company.' });
      }

      // System fonts cannot be deleted under any circumstances
      if (font.isSystem) {
        return res.status(403).json({ error: 'System fonts cannot be deleted.' });
      }

      // Check every Theme row (scoped to this company) for any of the 8 font-group FKs
      const affectedThemes = await prisma.theme.findMany({
        where: {
          companyId,
          OR: FONT_GROUP_FIELDS.map((field) => ({ [field]: fontId })),
        },
        select: {
          id: true,
          name: true,
          generalFontId: true,
          navFontId: true,
          headingsFontId: true,
          buttonsFontId: true,
          formsFontId: true,
          cardsFontId: true,
          linksFontId: true,
          statusFontId: true,
        },
      });

      // If any affected themes exist, return 409 with list of affected theme names/ids
      if (affectedThemes.length > 0) {
        const affectedThemesList = affectedThemes.map((theme) => {
          const matchedGroups: string[] = [];
          for (const field of FONT_GROUP_FIELDS) {
            if ((theme as any)[field] === fontId) {
              matchedGroups.push(field);
            }
          }
          return {
            id: theme.id,
            name: theme.name,
            groups: matchedGroups,
          };
        });

        return res.status(409).json({
          error: 'Font is in use by one or more themes and cannot be deleted.',
          affectedThemes: affectedThemesList,
        });
      }

      // Hard-delete Font row
      await prisma.font.delete({
        where: { id: fontId },
      });

      // Hard-delete stored file if present
      if (font.storagePath) {
        try {
          const fullPath = path.isAbsolute(font.storagePath)
            ? font.storagePath
            : path.resolve(process.cwd(), font.storagePath);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        } catch (fileErr) {
          console.warn('[FontRoutes] Could not delete font file on disk:', fileErr);
        }
      }

      return res.status(200).json({ message: 'Font deleted successfully.' });
    } catch (error: any) {
      console.error('[FontRoutes] Error deleting font:', error);
      return res.status(500).json({ error: error.message || 'Failed to delete font.' });
    }
  }
);

/**
 * POST /api/fonts/:id/replace
 * Requires theme:edit permission.
 * Body: { replacementFontId }
 * In one atomic transaction:
 * - Updates every affected theme's matching font-group field(s) to replacementFontId
 *   (preserving which specific group(s) referenced the old font per theme)
 * - Hard-deletes the original Font row
 * - Cleans up the original font file from disk
 */
router.post(
  '/:id/replace',
  requireAuth,
  requirePermission('theme', 'edit'),
  async (req: Request, res: Response) => {
    try {
      const companyId = await getEffectiveCompanyId(req);
      if (!companyId) {
        return res.status(400).json({ error: 'Company context is missing.' });
      }

      const fontId = req.params.id;
      const { replacementFontId } = req.body;

      if (!replacementFontId || typeof replacementFontId !== 'string') {
        return res.status(400).json({ error: 'replacementFontId is required.' });
      }

      if (replacementFontId === fontId) {
        return res.status(400).json({
          error: 'Replacement font must be different from the font being deleted.',
        });
      }

      // Fetch the font to be deleted
      const fontToDelete = await prisma.font.findUnique({
        where: { id: fontId },
      });

      if (!fontToDelete) {
        return res.status(404).json({ error: 'Font not found.' });
      }

      if (!fontToDelete.isSystem && fontToDelete.companyId !== companyId) {
        return res.status(404).json({ error: 'Font not found in your company.' });
      }

      // System fonts cannot be deleted
      if (fontToDelete.isSystem) {
        return res.status(403).json({ error: 'System fonts cannot be deleted.' });
      }

      // Validate replacement font exists
      const replacementFont = await prisma.font.findUnique({
        where: { id: replacementFontId },
      });

      if (!replacementFont) {
        return res.status(400).json({ error: 'Replacement font not found.' });
      }

      // Replacement font must belong to same company or be a system font
      if (!replacementFont.isSystem && replacementFont.companyId !== companyId) {
        return res.status(400).json({
          error: 'Replacement font does not belong to your company.',
        });
      }

      // Atomic transaction: update affected themes, then delete the font
      await prisma.$transaction(async (tx) => {
        // Find all affected themes in the company
        const affectedThemes = await tx.theme.findMany({
          where: {
            companyId,
            OR: FONT_GROUP_FIELDS.map((field) => ({ [field]: fontId })),
          },
        });

        for (const theme of affectedThemes) {
          const updateData: Record<string, string> = {};
          for (const field of FONT_GROUP_FIELDS) {
            if ((theme as any)[field] === fontId) {
              updateData[field] = replacementFontId;
            }
          }

          if (Object.keys(updateData).length > 0) {
            await tx.theme.update({
              where: { id: theme.id },
              data: updateData,
            });
          }
        }

        // Hard-delete the original Font row
        await tx.font.delete({
          where: { id: fontId },
        });
      });

      // Remove stored file on disk
      if (fontToDelete.storagePath) {
        try {
          const fullPath = path.isAbsolute(fontToDelete.storagePath)
            ? fontToDelete.storagePath
            : path.resolve(process.cwd(), fontToDelete.storagePath);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        } catch (fileErr) {
          console.warn('[FontRoutes] Could not delete font file on disk:', fileErr);
        }
      }

      return res.status(200).json({
        message: 'Font replaced and deleted successfully.',
      });
    } catch (error: any) {
      console.error('[FontRoutes] Error replacing and deleting font:', error);
      return res.status(500).json({ error: error.message || 'Failed to replace font.' });
    }
  }
);

export default router;
