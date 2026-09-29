import { Router, Request, Response, NextFunction } from 'express';
import { AuditOutcome } from '@prisma/client';
import { prisma } from '../../../shared/db/prisma';
import { requirePermission } from '../../../shared/middleware/permission.middleware';
import { auditQueryService } from '../services/auditQuery.service';
import { auditExportService } from '../services/auditExport.service';
import { AuditLogQueryFilters } from '../types/audit.types';

const router = Router();

// Router-level permission gate: exports require no separate permission
router.use(requirePermission('audit', 'view'));

// Company-scoped gate: all endpoints require an associated companyId
router.use((req: Request, res: Response, next: NextFunction) => {
  const companyId = req.user?.companyId;
  if (!companyId) {
    return res.status(400).json({ error: 'No company associated with current user.' });
  }
  next();
});

/**
 * Shared parser for query filters across list, search, and export routes.
 */
function parseAuditQueryFilters(req: Request): AuditLogQueryFilters & { error?: string } {
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const rawPageSize = parseInt(String(req.query.pageSize), 10) || 30;
  const pageSize = Math.min(100, Math.max(1, rawPageSize));

  let dateFrom: Date | undefined;
  if (req.query.dateFrom !== undefined && req.query.dateFrom !== '') {
    const parsed = new Date(String(req.query.dateFrom));
    if (isNaN(parsed.getTime())) {
      return { page, pageSize, error: 'Invalid dateFrom parameter.' };
    }
    dateFrom = parsed;
  }

  let dateTo: Date | undefined;
  if (req.query.dateTo !== undefined && req.query.dateTo !== '') {
    const parsed = new Date(String(req.query.dateTo));
    if (isNaN(parsed.getTime())) {
      return { page, pageSize, error: 'Invalid dateTo parameter.' };
    }
    dateTo = parsed;
  }

  let outcome: AuditOutcome | undefined;
  if (req.query.outcome !== undefined && req.query.outcome !== '') {
    const rawOutcome = String(req.query.outcome).trim();
    if (!Object.values(AuditOutcome).includes(rawOutcome as AuditOutcome)) {
      return { page, pageSize, error: 'Invalid outcome filter value.' };
    }
    outcome = rawOutcome as AuditOutcome;
  }

  const actorId =
    typeof req.query.actorId === 'string' && req.query.actorId.trim()
      ? req.query.actorId.trim()
      : undefined;

  const action =
    typeof req.query.action === 'string' && req.query.action.trim()
      ? req.query.action.trim()
      : undefined;

  const entityType =
    typeof req.query.entityType === 'string' && req.query.entityType.trim()
      ? req.query.entityType.trim()
      : undefined;

  const entityId =
    typeof req.query.entityId === 'string' && req.query.entityId.trim()
      ? req.query.entityId.trim()
      : undefined;

  return {
    page,
    pageSize,
    dateFrom,
    dateTo,
    outcome,
    actorId,
    action,
    entityType,
    entityId,
  };
}

/**
 * GET /api/audit-logs
 * Paginated list of audit logs for the authenticated user's company.
 * Query params: page, pageSize, dateFrom, dateTo, actorId, action, entityType, entityId, outcome
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const parsed = parseAuditQueryFilters(req);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    const result = await auditQueryService.getAuditLogs(companyId, parsed);
    return res.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to retrieve audit logs.';
    console.error('[Audit API] GET / error:', error);
    return res.status(500).json({ error: message });
  }
});

/**
 * GET /api/audit-logs/search
 * Fulltext and exact-ID search over audit logs for the authenticated user's company.
 * Query params: q (required), plus same filters as list endpoint
 * Note: Must be defined before /:id to avoid route collision.
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId!;

    const rawQ = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!rawQ) {
      return res.status(400).json({ error: 'Search query parameter "q" cannot be empty.' });
    }

    const parsed = parseAuditQueryFilters(req);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    const result = await auditQueryService.searchAuditLogs(companyId, rawQ, parsed);
    return res.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to search audit logs.';
    console.error('[Audit API] GET /search error:', error);
    return res.status(500).json({ error: message });
  }
});

/**
 * GET /api/audit-logs/export/all
 * Streams the entire available audit log for the company as an RFC4180 CSV.
 * Note: Must be defined before /:id to avoid route collision.
 */
router.get('/export/all', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    });
    const companySlug = company?.name
      ? company.name.toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
      : 'export';
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `audit-log-${companySlug}-${dateStr}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await auditExportService.exportAll(companyId, res);
  } catch (error: unknown) {
    console.error('[Audit API] GET /export/all error:', error);
    if (!res.headersSent) {
      const message = error instanceof Error ? error.message : 'Failed to export audit logs.';
      return res.status(500).json({ error: message });
    }
    res.end();
  }
});

/**
 * GET /api/audit-logs/export
 * Streams the filtered audit log (with optional search term q) as an RFC4180 CSV.
 * Ignores page/pageSize and exports all matching rows.
 * Note: Must be defined before /:id to avoid route collision.
 */
router.get('/export', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const parsed = parseAuditQueryFilters(req);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    const rawQ =
      typeof req.query.q === 'string' && req.query.q.trim() ? req.query.q.trim() : undefined;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    });
    const companySlug = company?.name
      ? company.name.toLowerCase().replace(/[^a-z0-9_-]+/g, '-')
      : 'export';
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `audit-log-${companySlug}-${dateStr}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await auditExportService.exportFiltered(companyId, parsed, rawQ, res);
  } catch (error: unknown) {
    console.error('[Audit API] GET /export error:', error);
    if (!res.headersSent) {
      const message = error instanceof Error ? error.message : 'Failed to export filtered audit logs.';
      return res.status(500).json({ error: message });
    }
    res.end();
  }
});

/**
 * GET /api/audit-logs/filter-options
 * Distinct filter dropdown options for the authenticated user's company.
 * Note: Must be defined before /:id to avoid route collision.
 */
router.get('/filter-options', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const result = await auditQueryService.getFilterOptions(companyId);
    return res.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to retrieve audit log filter options.';
    console.error('[Audit API] GET /filter-options error:', error);
    return res.status(500).json({ error: message });
  }
});

/**
 * GET /api/audit-logs/:id
 * Full detail for a single audit log entry.
 * Returns 404 if not found or belongs to another company (without revealing existence).
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const companyId = req.user!.companyId!;
    const { id } = req.params;

    const result = await auditQueryService.getAuditLogById(companyId, id);
    if (!result) {
      return res.status(404).json({ error: 'Audit log not found.' });
    }

    return res.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to retrieve audit log detail.';
    console.error('[Audit API] GET /:id error:', error);
    return res.status(500).json({ error: message });
  }
});

export default router;
