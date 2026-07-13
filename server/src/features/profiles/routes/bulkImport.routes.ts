import { Router, Request, Response } from 'express';
import { prisma } from '../../../shared/db/prisma';
import { requireAuth } from '../../../shared/middleware/session.middleware';
import { requirePermission } from '../../../shared/middleware/permission.middleware';
import { bulkImportService } from '../services/bulkImport.service';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * GET /api/users/bulk-import/template
 * Generates and returns a CSV file template.
 * Requires users:create permission.
 */
router.get('/template', requireAuth, requirePermission('users', 'create'), async (req: Request, res: Response) => {
  try {
    if (!req.user!.companyId) {
      return res.status(400).json({ error: 'User is not associated with a company.' });
    }
    const csvContent = await bulkImportService.generateTemplate(req.user!.companyId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="user_bulk_import_template.csv"');
    return res.status(200).send(csvContent);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to generate template.' });
  }
});

/**
 * Helper to extract CSV content from request (either multer file, JSON body, or raw text)
 */
function getCSVContent(req: Request): string {
  if (req.file) {
    return req.file.buffer.toString('utf-8');
  }
  if (req.body && typeof req.body.csv === 'string') {
    return req.body.csv;
  }
  if (req.body && typeof req.body === 'string') {
    return req.body;
  }
  throw new Error('No CSV content found in request. Please upload a file with key "file" or send raw CSV string in body.');
}

/**
 * POST /api/users/bulk-import/validate
 * Accepts CSV upload or raw text, parses and validates each row without saving.
 * Requires users:create permission.
 */
router.post(
  '/validate',
  requireAuth,
  requirePermission('users', 'create'),
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.user!.companyId) {
        return res.status(400).json({ error: 'User is not associated with a company.' });
      }
      const csvContent = getCSVContent(req);
      const results = await bulkImportService.validate(req.user!.companyId, csvContent);
      return res.json({ results });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to validate CSV.' });
    }
  }
);

/**
 * POST /api/users/bulk-import/confirm
 * Re-validates the CSV and creates all users if EVERY single row is valid. All-or-nothing.
 * Requires users:create permission.
 */
router.post(
  '/confirm',
  requireAuth,
  requirePermission('users', 'create'),
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.user!.companyId) {
        return res.status(400).json({ error: 'User is not associated with a company.' });
      }
      const csvContent = getCSVContent(req);
      const result = await bulkImportService.confirm(req.user!.companyId, csvContent, req.user!.id);

      if (Array.isArray(result)) {
        // Validation errors found, nothing created
        return res.status(422).json({
          error: 'Validation failed on one or more rows. No users were imported.',
          results: result,
        });
      }

      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to complete bulk import.' });
    }
  }
);

export default router;
