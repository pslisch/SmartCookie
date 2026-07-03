import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import 'dotenv/config';
import setupRouter from './features/auth/routes/setup.routes';
import authRouter from './features/auth/routes/auth.routes';
import { csrfProtection } from './shared/middleware/csrf.middleware';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON body parsing and cookie parsing
  app.use(express.json());
  app.use(cookieParser(process.env.SESSION_SECRET || 'smartcookie-secret-fallback'));

  // Place API routes before static file handlers
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.use('/api', csrfProtection);
  app.use('/api/setup', setupRouter);
  app.use('/api/auth', authRouter);

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

