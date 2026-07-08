import { Router, Request, Response } from 'express';
import { requireAuth } from '../../../shared/middleware/session.middleware';
import { selfAssignmentService } from '../services/selfAssignment.service';
import { assignmentService } from '../services/assignment.service';
import { completionService } from '../services/completion.service';
import { permissionResolverService } from '../../rbac/services/permissionResolver.service';
import { prisma } from '../../../shared/db/prisma';

const router = Router();

// Protect all assignment routes with authentication
router.use(requireAuth);

/**
 * POST /api/assignments
 * Assigns a lesson to users/groups/OUs.
 * Gated by assignments:create-mandatory or assignments:create.
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { lessonId, targets, type, scheduledFor, dueDateDefaultDays, isMandatory } = req.body;

    if (!lessonId || typeof lessonId !== 'string') {
      return res.status(400).json({ error: 'lessonId is required.' });
    }

    const mandatory = isMandatory === true || isMandatory === 'true';
    const action = mandatory ? 'create-mandatory' : 'create';

    const hasPerm = await permissionResolverService.hasPermission(req.user!.id, 'assignments', action);
    if (!hasPerm) {
      return res.status(403).json({ error: `Forbidden: Missing required permission "assignments:${action}".` });
    }

    const assignment = await assignmentService.createLessonAssignment(
      lessonId,
      targets || [],
      type || 'IMMEDIATE',
      scheduledFor,
      dueDateDefaultDays,
      mandatory,
      req.user!.id, // owner
      req.user!.id  // creator
    );

    return res.json(assignment);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to create assignment.' });
  }
});

/**
 * POST /api/assignments/course
 * Assigns a course (and its lessons).
 * Gated by assignments:create-mandatory or assignments:create.
 */
router.post('/course', async (req: Request, res: Response) => {
  try {
    const { courseId, targets, type, scheduledFor, dueDateDefaultDays, isMandatory } = req.body;

    if (!courseId || typeof courseId !== 'string') {
      return res.status(400).json({ error: 'courseId is required.' });
    }

    const mandatory = isMandatory === true || isMandatory === 'true';
    const action = mandatory ? 'create-mandatory' : 'create';

    const hasPerm = await permissionResolverService.hasPermission(req.user!.id, 'assignments', action);
    if (!hasPerm) {
      return res.status(403).json({ error: `Forbidden: Missing required permission "assignments:${action}".` });
    }

    const assignments = await assignmentService.createCourseAssignment(
      courseId,
      targets || [],
      type || 'IMMEDIATE',
      scheduledFor,
      dueDateDefaultDays,
      mandatory,
      req.user!.id,
      req.user!.id
    );

    return res.json(assignments);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to create course assignments.' });
  }
});

/**
 * DELETE /api/assignments/:id
 * Soft-delete / cancel assignment.
 * Gated by assignments:delete.
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Assignment ID is required.' });
    }

    const hasPerm = await permissionResolverService.hasPermission(req.user!.id, 'assignments', 'delete');
    if (!hasPerm) {
      return res.status(403).json({ error: 'Forbidden: Missing required permission "assignments:delete".' });
    }

    await assignmentService.cancelAssignment(id, req.user!.id);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to cancel assignment.' });
  }
});

/**
 * GET /api/assignments
 * List and filter assignments.
 * Gated by assignments:view.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const hasPerm = await permissionResolverService.hasPermission(req.user!.id, 'assignments', 'view');
    if (!hasPerm) {
      return res.status(403).json({ error: 'Forbidden: Missing required permission "assignments:view".' });
    }

    const { status, lessonId } = req.query;
    const where: any = {
      companyId: req.user!.companyId,
      deletedAt: null,
    };

    if (status && typeof status === 'string') {
      where.status = status;
    }
    if (lessonId && typeof lessonId === 'string') {
      where.lessonId = lessonId;
    }

    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            status: true,
          }
        },
        targets: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
              }
            },
            organizationUnit: {
              select: {
                id: true,
                name: true,
              }
            },
            learningGroup: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      }
    });

    return res.json(assignments);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to retrieve assignments.' });
  }
});

/**
 * GET /api/assignments/:id/instances
 * Per-user instances breakdown.
 * Gated by assignments:view-reports.
 */
router.get('/:id/instances', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Assignment ID is required.' });
    }

    const hasPerm = await permissionResolverService.hasPermission(req.user!.id, 'assignments', 'view-reports');
    if (!hasPerm) {
      return res.status(403).json({ error: 'Forbidden: Missing required permission "assignments:view-reports".' });
    }

    const instances = await prisma.userAssignmentInstance.findMany({
      where: {
        assignmentId: id,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          }
        }
      }
    });

    return res.json(instances);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to retrieve assignment instances.' });
  }
});

/**
 * POST /api/assignments/self-assign
 * Self-assigns a published lesson to the logged-in user.
 * Gated by assignments:view.
 */
router.post('/self-assign', async (req: Request, res: Response) => {
  try {
    const { lessonId } = req.body;
    if (!lessonId || typeof lessonId !== 'string') {
      return res.status(400).json({ error: 'lessonId is required.' });
    }

    const hasPerm = await permissionResolverService.hasPermission(req.user!.id, 'assignments', 'view');
    if (!hasPerm) {
      return res.status(403).json({ error: 'Forbidden: Missing required permission "assignments:view".' });
    }

    const instance = await selfAssignmentService.selfAssign(req.user!.id, lessonId);
    return res.json(instance);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to self-assign lesson.' });
  }
});

/**
 * DELETE /api/assignments/self-assign/:instanceId
 * Removes self-assignment.
 * Gated by assignments:view.
 */
router.delete('/self-assign/:instanceId', async (req: Request, res: Response) => {
  try {
    const { instanceId } = req.params;
    if (!instanceId) {
      return res.status(400).json({ error: 'instanceId is required.' });
    }

    const hasPerm = await permissionResolverService.hasPermission(req.user!.id, 'assignments', 'view');
    if (!hasPerm) {
      return res.status(403).json({ error: 'Forbidden: Missing required permission "assignments:view".' });
    }

    const result = await selfAssignmentService.removeSelfAssignment(req.user!.id, instanceId);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to remove self-assignment.' });
  }
});

/**
 * Dedicated Router for /api/assignment-instances
 */
export const assignmentInstancesRouter = Router();
assignmentInstancesRouter.use(requireAuth);

/**
 * POST /api/assignment-instances/:id/complete
 * Marks an assignment instance as complete.
 * Gated by assignments:view.
 */
assignmentInstancesRouter.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Instance ID is required.' });
    }

    const hasPerm = await permissionResolverService.hasPermission(req.user!.id, 'assignments', 'view');
    if (!hasPerm) {
      return res.status(403).json({ error: 'Forbidden: Missing required permission "assignments:view".' });
    }

    const result = await completionService.markComplete(id, req.user!.id);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to complete assignment instance.' });
  }
});

export default router;
