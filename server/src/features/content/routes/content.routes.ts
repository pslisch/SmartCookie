import { Router, Request, Response } from 'express';
import multer from 'multer';
import { prisma } from '../../../shared/db/prisma.js';
import { requirePermission } from '../../../shared/middleware/permission.middleware.js';
import { ContentService } from '../services/content.service.js';
import { ImageUploadService, InvalidImageError } from '../services/imageUpload.service.js';
import { getContentFilePath, PathTraversalError } from '../services/contentStorage.service.js';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();
export const fileRouter = Router();

const contentService = new ContentService();
const imageUploadService = new ImageUploadService();

// ==================================================
// CONTENT MANAGE ROUTES (under /api/content)
// ==================================================

/**
 * GET /api/content
 * List, filterable by category/tag/search term (simple DB query)
 */
router.get('/', requirePermission('content', 'view'), async (req: Request, res: Response) => {
  try {
    const { category, tag, search } = req.query;
    const where: any = {
      companyId: req.user!.companyId
    };

    if (category) {
      where.categoryId = String(category);
    }

    if (tag) {
      where.tags = {
        some: {
          tag: String(tag)
        }
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: String(search) } },
        { description: { contains: String(search) } }
      ];
    }

    const contents = await prisma.content.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        tags: true,
        category: true
      }
    });

    return res.json(contents);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to list content packages.' });
  }
});

/**
 * GET /api/content/:contentGroupId/versions
 * List all versions for a given contentGroupId
 */
router.get('/:contentGroupId/versions', requirePermission('content', 'view'), async (req: Request, res: Response) => {
  try {
    const { contentGroupId } = req.params;
    const contents = await prisma.content.findMany({
      where: {
        contentGroupId,
        companyId: req.user!.companyId
      },
      orderBy: {
        version: 'desc'
      },
      include: {
        tags: true,
        category: true
      }
    });

    return res.json(contents);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to list content versions.' });
  }
});

/**
 * POST /api/content/import
 * Multipart - zip + metadata fields
 */
router.post('/import', requirePermission('content', 'import'), upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Zip file is required in the "file" field.' });
    }

    let parsedTags: string[] = [];
    if (typeof req.body.tags === 'string' && req.body.tags.trim()) {
      try {
        const parsed = JSON.parse(req.body.tags);
        if (Array.isArray(parsed)) {
          parsedTags = parsed.map(t => String(t).trim());
        } else {
          parsedTags = req.body.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
        }
      } catch {
        parsedTags = req.body.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
      }
    } else if (Array.isArray(req.body.tags)) {
      parsedTags = req.body.tags.map(t => String(t).trim());
    }

    const { title, description, categoryId, author, language, versionBehavior, existingContentGroupId, certificateOption } = req.body;

    const behavior = versionBehavior === 'REPLACE' ? 'REPLACE' : 'NEW';

    const result = await contentService.importPackage(
      req.file.buffer,
      {
        title: title || '',
        description: description || '',
        categoryId: categoryId || null,
        author: author || '',
        language: language || '',
        companyId: req.user!.companyId,
        tags: parsedTags,
        certificateSetting: certificateOption
      },
      behavior,
      existingContentGroupId,
      req.user!.id
    );

    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed for SCORM package.',
        errors: result.errors,
        warnings: result.warnings,
        info: result.info
      });
    }

    return res.status(201).json(result);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to import SCORM package.' });
  }
});

/**
 * POST /api/content/:id/publish
 */
router.post('/:id/publish', requirePermission('content', 'publish'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await contentService.publishContent(id);
    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to publish content.' });
  }
});

/**
 * POST /api/content/:id/archive
 */
router.post('/:id/archive', requirePermission('content', 'delete'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await contentService.archiveContent(id);
    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to archive content.' });
  }
});

/**
 * POST /api/content/:id/restore
 */
router.post('/:id/restore', requirePermission('content', 'edit'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { targetStatus } = req.body;
    const updated = await contentService.restoreContent(id, targetStatus || 'DRAFT');
    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to restore content.' });
  }
});

/**
 * GET /api/content/:id/download
 * Downloads the original SCORM ZIP package.
 */
router.get('/:id/download', requirePermission('content', 'view'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const content = await prisma.content.findFirst({
      where: {
        id,
        companyId: req.user!.companyId!
      }
    });

    if (!content) {
      return res.status(404).json({ error: 'Content not found.' });
    }

    return res.download(content.storagePathZip, `${content.title || 'package'}.zip`);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to download zip.' });
  }
});

/**
 * POST /api/content/:id/thumbnail
 * Enforces magic-bytes checking and 2MB limit in Task 5
 */
router.post('/:id/thumbnail', requirePermission('content', 'edit'), upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required in the "file" field.' });
    }

    const savedPath = await imageUploadService.uploadThumbnail(req.file.buffer, id);
    return res.json({ success: true, thumbnailPath: savedPath });
  } catch (error: any) {
    if (error instanceof InvalidImageError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message || 'Failed to upload thumbnail.' });
  }
});

// ==================================================
// CATEGORIES CRUD ROUTES (under /api/content/categories)
// ==================================================

/**
 * GET /api/content/categories
 */
router.get('/categories', requirePermission('content', 'manage-categories'), async (req: Request, res: Response) => {
  try {
    const categories = await prisma.contentCategory.findMany({
      where: {
        companyId: req.user!.companyId
      },
      include: {
        childCategories: true,
        contents: true
      }
    });
    return res.json(categories);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to list categories.' });
  }
});

/**
 * POST /api/content/categories
 */
router.post('/categories', requirePermission('content', 'manage-categories'), async (req: Request, res: Response) => {
  try {
    const { name, parentCategoryId } = req.body;
    const category = await contentService.createCategory(name, parentCategoryId, req.user!.companyId);
    return res.status(201).json(category);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to create category.' });
  }
});

/**
 * PUT /api/content/categories/:id
 */
router.put('/categories/:id', requirePermission('content', 'manage-categories'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, parentCategoryId } = req.body;

    let category;
    if (name !== undefined) {
      category = await contentService.renameCategory(id, name);
    }
    if (parentCategoryId !== undefined) {
      category = await contentService.moveCategory(id, parentCategoryId);
    }

    if (!category) {
      return res.status(400).json({ error: 'At least name or parentCategoryId must be provided.' });
    }

    return res.json(category);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to update category.' });
  }
});

/**
 * DELETE /api/content/categories/:id
 */
router.delete('/categories/:id', requirePermission('content', 'manage-categories'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await contentService.deleteCategory(id);
    return res.json({ success: true, message: 'Category deleted successfully.' });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to delete category.' });
  }
});


// ==================================================
// FILE-SERVING ROUTE (under /content-files/:contentId/*path)
// ==================================================
fileRouter.get('/:contentId/*', requirePermission('content', 'view'), async (req: Request, res: Response) => {
  const { contentId } = req.params;
  const subPath = req.params[0] || '';

  try {
    const resolvedPath = getContentFilePath(contentId, subPath);
    return res.sendFile(resolvedPath);
  } catch (err: any) {
    if (err instanceof PathTraversalError) {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message || 'Error serving file' });
  }
});

export default router;
