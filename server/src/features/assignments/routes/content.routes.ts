/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../../../shared/middleware/session.middleware';
import { permissionResolverService } from '../../rbac/services/permissionResolver.service';
import { prisma } from '../../../shared/db/prisma';
import { LessonStatus, CourseStatus } from '@prisma/client';

const router = Router();

// Protect all content routes with authentication
router.use(requireAuth);

/**
 * Helper middleware or check for assignments:create or assignments:view
 */
async function checkPermission(req: Request, res: Response, action: 'create' | 'view') {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized: User is missing.' });
    return false;
  }
  const hasPerm = await permissionResolverService.hasPermission(user.id, 'assignments', action);
  if (!hasPerm) {
    res.status(403).json({ error: `Forbidden: Missing required permission "assignments:${action}".` });
    return false;
  }
  return true;
}

/**
 * GET /api/lessons
 * List all lessons for the company
 */
router.get('/lessons', async (req: Request, res: Response) => {
  try {
    const hasView = await permissionResolverService.hasPermission(req.user!.id, 'assignments', 'view');
    const hasCreate = await permissionResolverService.hasPermission(req.user!.id, 'assignments', 'create');
    if (!hasView && !hasCreate) {
      return res.status(403).json({ error: 'Forbidden: Missing assignments view/create permission.' });
    }

    const lessons = await prisma.lesson.findMany({
      where: {
        companyId: req.user!.companyId!,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.json(lessons);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to list lessons.' });
  }
});

/**
 * POST /api/lessons
 * Create a new lesson stub (DRAFT status)
 */
router.post('/lessons', async (req: Request, res: Response) => {
  try {
    if (!(await checkPermission(req, res, 'create'))) return;

    const { title } = req.body;
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required and must be a string.' });
    }

    const lesson = await prisma.lesson.create({
      data: {
        companyId: req.user!.companyId!,
        title,
        status: LessonStatus.DRAFT,
      },
    });

    return res.status(201).json(lesson);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to create lesson.' });
  }
});

/**
 * PATCH /api/lessons/:id/publish
 * Toggle published status of a lesson
 */
router.patch('/lessons/:id/publish', async (req: Request, res: Response) => {
  try {
    if (!(await checkPermission(req, res, 'create'))) return;

    const { id } = req.params;
    const { status } = req.body;

    const current = await prisma.lesson.findFirst({
      where: {
        id,
        companyId: req.user!.companyId!,
      },
    });

    if (!current) {
      return res.status(404).json({ error: 'Lesson not found.' });
    }

    let targetStatus: LessonStatus;
    if (status) {
      targetStatus = status === 'PUBLISHED' ? LessonStatus.PUBLISHED : LessonStatus.DRAFT;
    } else {
      targetStatus = current.status === LessonStatus.PUBLISHED ? LessonStatus.DRAFT : LessonStatus.PUBLISHED;
    }

    const updated = await prisma.lesson.update({
      where: { id },
      data: { status: targetStatus },
    });

    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to publish/unpublish lesson.' });
  }
});

/**
 * GET /api/courses
 * List all courses for the company
 */
router.get('/courses', async (req: Request, res: Response) => {
  try {
    const hasView = await permissionResolverService.hasPermission(req.user!.id, 'assignments', 'view');
    const hasCreate = await permissionResolverService.hasPermission(req.user!.id, 'assignments', 'create');
    if (!hasView && !hasCreate) {
      return res.status(403).json({ error: 'Forbidden: Missing assignments view/create permission.' });
    }

    const courses = await prisma.course.findMany({
      where: {
        companyId: req.user!.companyId!,
      },
      include: {
        courseLessons: {
          orderBy: {
            order: 'asc',
          },
          include: {
            lesson: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.json(courses);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to list courses.' });
  }
});

/**
 * POST /api/courses
 * Create a new course stub (DRAFT status)
 */
router.post('/courses', async (req: Request, res: Response) => {
  try {
    if (!(await checkPermission(req, res, 'create'))) return;

    const { title } = req.body;
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required and must be a string.' });
    }

    const course = await prisma.course.create({
      data: {
        companyId: req.user!.companyId!,
        title,
        status: CourseStatus.DRAFT,
      },
    });

    return res.status(201).json(course);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to create course.' });
  }
});

/**
 * PATCH /api/courses/:id/publish
 * Toggle published status of a course
 */
router.patch('/courses/:id/publish', async (req: Request, res: Response) => {
  try {
    if (!(await checkPermission(req, res, 'create'))) return;

    const { id } = req.params;
    const { status } = req.body;

    const current = await prisma.course.findFirst({
      where: {
        id,
        companyId: req.user!.companyId!,
      },
    });

    if (!current) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    let targetStatus: CourseStatus;
    if (status) {
      targetStatus = status === 'PUBLISHED' ? CourseStatus.PUBLISHED : CourseStatus.DRAFT;
    } else {
      targetStatus = current.status === CourseStatus.PUBLISHED ? CourseStatus.DRAFT : CourseStatus.PUBLISHED;
    }

    const updated = await prisma.course.update({
      where: { id },
      data: { status: targetStatus },
    });

    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to publish/unpublish course.' });
  }
});

/**
 * PUT /api/courses/:id/lessons
 * Save/reorder lessons associated with a course
 */
router.put('/courses/:id/lessons', async (req: Request, res: Response) => {
  try {
    if (!(await checkPermission(req, res, 'create'))) return;

    const { id } = req.params;
    const { lessonIds } = req.body;

    if (!Array.isArray(lessonIds)) {
      return res.status(400).json({ error: 'lessonIds must be an array of strings.' });
    }

    // Verify course belongs to company
    const course = await prisma.course.findFirst({
      where: {
        id,
        companyId: req.user!.companyId!,
      },
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    // Transaction to update CourseLessons
    await prisma.$transaction(async (tx) => {
      // Delete existing
      await tx.courseLesson.deleteMany({
        where: { courseId: id },
      });

      // Insert new ordered
      if (lessonIds.length > 0) {
        await tx.courseLesson.createMany({
          data: lessonIds.map((lessonId, idx) => ({
            courseId: id,
            lessonId,
            order: idx + 1,
          })),
        });
      }
    });

    const updatedCourse = await prisma.course.findUnique({
      where: { id },
      include: {
        courseLessons: {
          orderBy: { order: 'asc' },
          include: { lesson: true },
        },
      },
    });

    return res.json(updatedCourse);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to reorder course lessons.' });
  }
});

/**
 * PUT /api/lessons/:id/content
 * Associate a content package (or null) with a lesson
 */
router.put('/lessons/:id/content', async (req: Request, res: Response) => {
  try {
    if (!(await checkPermission(req, res, 'create'))) return;

    const { id } = req.params;
    const { contentId } = req.body;

    const lesson = await prisma.lesson.findFirst({
      where: {
        id,
        companyId: req.user!.companyId!,
      }
    });

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found.' });
    }

    const updated = await prisma.lesson.update({
      where: { id },
      data: {
        contentId: contentId || null
      }
    });

    return res.json(updated);
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Failed to associate content with lesson.' });
  }
});

export default router;
