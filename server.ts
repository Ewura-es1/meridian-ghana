import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { db, seedDatabase } from './server/db.ts';
import { AuthenticatedRequest, requireAuth } from './server/middleware.ts';
import { adminRouter } from './server/routes/admin.ts';
import { authRouter } from './server/routes/auth.ts';
import { documentsRouter } from './server/routes/documents.ts';
import { opportunitiesRouter } from './server/routes/opportunities.ts';
import { reviewsRouter } from './server/routes/reviews.ts';

async function startServer() {
  seedDatabase();

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());

  // API routes
  app.use('/api/auth', authRouter);
  app.use('/api/opportunities', opportunitiesRouter);
  app.use('/api/documents', documentsRouter);
  app.use('/api/reviews', reviewsRouter);
  app.use('/api/admin', adminRouter);

  app.get('/api/notifications', requireAuth, (req: AuthenticatedRequest, res) => {
    const notifications = db
      .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 30')
      .all(req.user!.id);
    res.json({ notifications });
  });

  app.post('/api/notifications/:id/read', requireAuth, (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(id, req.user!.id);
    res.json({ ok: true });
  });

  app.post('/api/notifications/read-all', requireAuth, (req: AuthenticatedRequest, res) => {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user!.id);
    res.json({ ok: true });
  });

  app.post('/api/contact', (req, res) => {
    const { name, email, subject, message } = req.body ?? {};
    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').trim();
    const cleanSubject = String(subject || '').trim();
    const cleanMessage = String(message || '').trim();

    if (cleanName.length < 2 || !cleanEmail.includes('@') || cleanSubject.length < 3 || cleanMessage.length < 10) {
      res.status(400).json({ error: 'Please complete all contact fields (message min 10 characters).' });
      return;
    }

    db.prepare(
      'INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)'
    ).run(cleanName.slice(0, 100), cleanEmail.slice(0, 140), cleanSubject.slice(0, 150), cleanMessage.slice(0, 2000));

    res.status(201).json({ ok: true });
  });

  // JSON error handler for Multer & API exceptions
  app.use('/api', (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof multer.MulterError) {
      res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'File exceeds the 5 MB size limit.' : err.message });
      return;
    }
    console.error('Unhandled API error:', err);
    res.status(500).json({ error: 'An unexpected server error occurred.' });
  });

  // Vite dev middleware or production static assets
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Meridian Youth Internship Registry running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
