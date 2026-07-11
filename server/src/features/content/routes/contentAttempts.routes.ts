import { Router, Request, Response } from 'express';
import { requirePermission } from '../../../shared/middleware/permission.middleware.js';
import { ContentAttemptService } from '../services/contentAttempt.service.js';

const router = Router();
const attemptService = new ContentAttemptService();

/**
 * POST /api/content-attempts/start
 * Starts a new content attempt given a userAssignmentInstanceId.
 * Respects the assignment's attempt limit.
 */
router.post('/start', requirePermission('content', 'view'), async (req: Request, res: Response) => {
  try {
    const { userAssignmentInstanceId, instanceId } = req.body;
    const targetInstanceId = userAssignmentInstanceId || instanceId;

    if (!targetInstanceId) {
      return res.status(400).json({ error: 'userAssignmentInstanceId is required.' });
    }

    const attempt = await attemptService.startAttempt(targetInstanceId, req.user!.id);
    return res.status(201).json(attempt);
  } catch (error: any) {
    // If it's a validation error/attempt limit reached, return 400
    if (error.message && error.message.includes('limit reached')) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message || 'Failed to start content attempt.' });
  }
});

/**
 * POST /api/content-attempts/:id/commit
 * Receives SCORM CMI state from Task 7, updates the attempt record and triggers rollup.
 */
router.post('/:id/commit', requirePermission('content', 'view'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { cmi } = req.body;

    if (!cmi || typeof cmi !== 'object') {
      return res.status(400).json({ error: 'cmi state object is required.' });
    }

    const updatedAttempt = await attemptService.commitAttempt(id, cmi);
    return res.json(updatedAttempt);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to commit content attempt.' });
  }
});

/**
 * GET /api/content-attempts/:instanceId
 * Retrieves attempt history for a given instance.
 */
router.get('/:instanceId', requirePermission('content', 'view'), async (req: Request, res: Response) => {
  try {
    const { instanceId } = req.params;
    const history = await attemptService.getAttemptHistory(instanceId);
    return res.json(history);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch attempt history.' });
  }
});

export default router;
