import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import 'dotenv/config';
import setupRouter from './features/auth/routes/setup.routes';
import authRouter from './features/auth/routes/auth.routes';
import usersRouter from './features/auth/routes/users.routes';
import rolesRouter from './features/rbac/routes/roles.routes';
import permissionsRouter from './features/rbac/routes/permissions.routes';
import companyRouter from './features/rbac/routes/company.routes';
import organizationUnitsRouter from './features/organization/routes/organizationUnits.routes';
import learningGroupsRouter from './features/organization/routes/learningGroups.routes';
import assignmentsRouter, { assignmentInstancesRouter } from './features/assignments/routes/assignments.routes';
import contentRouter from './features/assignments/routes/content.routes';
import contentManagementRouter, { fileRouter as contentFileRouter } from './features/content/routes/content.routes.js';
import contentAttemptsRouter from './features/content/routes/contentAttempts.routes.js';
import previewRouter from './features/preview/routes/preview.routes';
import { csrfProtection } from './shared/middleware/csrf.middleware';
import './features/auth/auth.permissions';
import './features/rbac/rbac.permissions';
import './features/organization/organization.permissions';
import './features/assignments/assignments.permissions';
import './features/content/content.permissions.js';
import './features/preview/preview.permissions';
import { syncPermissions } from './shared/permissions/sync';
import { seedSuperuserRoles } from '../prisma/seed/rbacSeed';
import { scheduledTasksService } from './shared/scheduler/scheduledTasks.service';

async function startServer() {
  // Start periodic background task runner
  scheduledTasksService.start();

  const app = express();
  const PORT = 3000;

  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // Run permission synchronization and RBAC seeding on startup
  try {
    await syncPermissions();
    await seedSuperuserRoles();

    // Run manual DB migrations on startup
    const { prisma } = await import('./shared/db/prisma');
  } catch (err) {
    console.error('Failed to sync permissions, seed superuser roles, or run startup schema migration:', err);
  }

  // JSON body parsing and cookie parsing
  app.use(express.json());
  let sessionSecret = process.env.SESSION_SECRET;
  if (sessionSecret) {
    if (
      (sessionSecret.startsWith('"') && sessionSecret.endsWith('"')) ||
      (sessionSecret.startsWith("'") && sessionSecret.endsWith("'"))
    ) {
      sessionSecret = sessionSecret.slice(1, -1);
    }
  }
  if (!sessionSecret && process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set in production');
  }
  app.use(cookieParser(sessionSecret || 'smartcookie-secret-fallback'));

  // Place API routes before static file handlers
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.use('/api', csrfProtection);
  app.use('/api/setup', setupRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/roles', rolesRouter);
  app.use('/api/permissions', permissionsRouter);
  app.use('/api/company', companyRouter);
  app.use('/api/organization-units', organizationUnitsRouter);
  app.use('/api/learning-groups', learningGroupsRouter);
  app.use('/api/assignments', assignmentsRouter);
  app.use('/api/assignment-instances', assignmentInstancesRouter);
  app.use('/api/content', contentManagementRouter);
  app.use('/api/content-attempts', contentAttemptsRouter);
  app.use('/content-files', contentFileRouter);
  app.use('/api', contentRouter);
  app.use('/api', previewRouter);

  // Serve frontend using Vite middleware in development, and static assets in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    // SPA fallback for routing
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express full-stack server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer();

