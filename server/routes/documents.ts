import crypto from 'node:crypto';
import fs from 'node:fs';
import { Router } from 'express';
import multer from 'multer';
import { db } from '../db.ts';
import { extractDocumentText } from '../docParser.ts';
import { AuthenticatedRequest, recordAudit, requireAuth } from '../middleware.ts';
import {
  createSignedDownloadToken,
  MAX_DOCUMENT_BYTES,
  resolvePrivateStoragePath,
  validateUploadedDocument,
  verifySignedDownloadToken,
} from '../security.ts';

export const documentsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOCUMENT_BYTES },
});

const ALLOWED_DOC_TYPES = new Set([
  'cv',
  'cover_letter',
  'motivation_letter',
  'personal_statement',
  'other',
]);

documentsRouter.get('/', requireAuth, (req: AuthenticatedRequest, res) => {
  const docs = db
    .prepare(
      `SELECT d.*, dv.version_number, dv.original_filename, dv.mime_type, dv.file_size, dv.created_at as version_created_at,
         u_ed.full_name as assigned_editor_name
       FROM documents d
       LEFT JOIN document_versions dv ON dv.id = d.current_version_id
       LEFT JOIN editor_assignments ea ON ea.document_id = d.id AND ea.is_active = 1
       LEFT JOIN users u_ed ON u_ed.id = ea.editor_id
       WHERE d.owner_id = ?
       ORDER BY d.updated_at DESC, d.id DESC`
    )
    .all(req.user!.id);

  res.json({ documents: docs });
});

documentsRouter.post('/', requireAuth, upload.single('file'), async (req: AuthenticatedRequest, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Please select a PDF or DOCX file to upload.' });
    return;
  }

  const title = String(req.body?.title || '').trim();
  const docType = String(req.body?.docType || 'cv').trim();
  const aiConsent = req.body?.aiConsent === 'true' || req.body?.aiConsent === true;

  if (title.length < 2 || title.length > 140) {
    res.status(400).json({ error: 'Please enter a descriptive document title (2–140 characters).' });
    return;
  }
  if (!ALLOWED_DOC_TYPES.has(docType)) {
    res.status(400).json({ error: 'Invalid document type selected.' });
    return;
  }

  const check = validateUploadedDocument(req.file.originalname, req.file.mimetype, req.file.buffer);
  if (check.valid === false) {
    res.status(400).json({ error: check.error });
    return;
  }

  const storageKey = `${crypto.randomUUID()}${check.normalizedExt}`;
  const targetPath = resolvePrivateStoragePath(storageKey);
  fs.writeFileSync(targetPath, req.file.buffer);

  const extractedText = await extractDocumentText(req.file.buffer, check.normalizedExt);
  const retentionDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const docRes = db
    .prepare(
      `INSERT INTO documents (owner_id, title, doc_type, review_status, ai_consent_granted, retention_expires_at)
       VALUES (?, ?, ?, 'Submitted', ?, ?)`
    )
    .run(req.user!.id, title, docType, aiConsent ? 1 : 0, retentionDate);
  const docId = Number(docRes.lastInsertRowid);

  const verRes = db
    .prepare(
      `INSERT INTO document_versions (document_id, version_number, original_filename, mime_type, file_size, storage_key, extracted_text, uploaded_by)
       VALUES (?, 1, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      docId,
      req.file.originalname.slice(0, 180),
      check.normalizedMime,
      req.file.buffer.length,
      storageKey,
      extractedText,
      req.user!.id
    );
  const versionId = Number(verRes.lastInsertRowid);

  db.prepare('UPDATE documents SET current_version_id = ? WHERE id = ?').run(versionId, docId);
  recordAudit(req.user!.id, 'document_uploaded', 'document', docId, {
    docType,
    fileSize: req.file.buffer.length,
  });

  res.status(201).json({ id: docId, versionId, extractedText });
});

documentsRouter.post('/:id/replace', requireAuth, upload.single('file'), async (req: AuthenticatedRequest, res) => {
  const docId = Number(req.params.id);
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(docId) as
    | { id: number; owner_id: number }
    | undefined;

  if (!doc) {
    res.status(404).json({ error: 'Document not found.' });
    return;
  }
  if (doc.owner_id !== req.user!.id) {
    res.status(403).json({ error: 'Only the document owner can upload a replacement version.' });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: 'Please select a PDF or DOCX file.' });
    return;
  }

  const check = validateUploadedDocument(req.file.originalname, req.file.mimetype, req.file.buffer);
  if (check.valid === false) {
    res.status(400).json({ error: check.error });
    return;
  }

  const maxVerRow = db
    .prepare('SELECT COALESCE(MAX(version_number), 0) as maxVer FROM document_versions WHERE document_id = ?')
    .get(docId) as { maxVer: number };
  const nextVer = maxVerRow.maxVer + 1;

  const storageKey = `${crypto.randomUUID()}${check.normalizedExt}`;
  fs.writeFileSync(resolvePrivateStoragePath(storageKey), req.file.buffer);
  const extractedText = await extractDocumentText(req.file.buffer, check.normalizedExt);

  const verRes = db
    .prepare(
      `INSERT INTO document_versions (document_id, version_number, original_filename, mime_type, file_size, storage_key, extracted_text, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      docId,
      nextVer,
      req.file.originalname.slice(0, 180),
      check.normalizedMime,
      req.file.buffer.length,
      storageKey,
      extractedText,
      req.user!.id
    );
  const versionId = Number(verRes.lastInsertRowid);

  db.prepare(
    `UPDATE documents SET current_version_id = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(versionId, docId);

  recordAudit(req.user!.id, 'document_version_uploaded', 'document', docId, { versionNumber: nextVer });
  res.json({ ok: true, versionId, versionNumber: nextVer });
});

documentsRouter.post('/:id/request-review', requireAuth, (req: AuthenticatedRequest, res) => {
  const docId = Number(req.params.id);
  const aiConsent = Boolean(req.body?.aiConsent);

  const doc = db.prepare('SELECT id, owner_id, review_status FROM documents WHERE id = ?').get(docId) as
    | { id: number; owner_id: number; review_status: string }
    | undefined;

  if (!doc) {
    res.status(404).json({ error: 'Document not found.' });
    return;
  }
  if (doc.owner_id !== req.user!.id) {
    res.status(403).json({ error: 'You may only request reviews for your own documents.' });
    return;
  }

  const nextStatus = doc.review_status === 'Submitted' ? 'Awaiting Assignment' : doc.review_status;
  db.prepare(
    `UPDATE documents
     SET review_status = ?, ai_consent_granted = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(nextStatus, aiConsent ? 1 : 0, docId);

  recordAudit(req.user!.id, 'review_requested', 'document', docId, { aiConsent });
  res.json({ ok: true, reviewStatus: nextStatus });
});

documentsRouter.get('/:id/versions', requireAuth, (req: AuthenticatedRequest, res) => {
  const docId = Number(req.params.id);
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(docId) as
    | { id: number; owner_id: number }
    | undefined;

  if (!doc) {
    res.status(404).json({ error: 'Document not found.' });
    return;
  }

  const isOwner = doc.owner_id === req.user!.id;
  const isAssignedEditor =
    req.user!.role === 'editor' &&
    Boolean(
      db
        .prepare('SELECT id FROM editor_assignments WHERE document_id = ? AND editor_id = ? AND is_active = 1')
        .get(docId, req.user!.id)
    );

  if (!isOwner && !isAssignedEditor) {
    res.status(403).json({ error: 'Access denied. Only the document owner or assigned editor can view versions.' });
    return;
  }

  const versions = db
    .prepare(
      `SELECT id, document_id, version_number, original_filename, mime_type, file_size, extracted_text, created_at
       FROM document_versions
       WHERE document_id = ?
       ORDER BY version_number DESC`
    )
    .all(docId);

  res.json({ document: doc, versions });
});

documentsRouter.post('/:id/download-token', requireAuth, (req: AuthenticatedRequest, res) => {
  const docId = Number(req.params.id);
  const requestedVersionId = Number(req.body?.versionId);

  const doc = db.prepare('SELECT id, owner_id, current_version_id FROM documents WHERE id = ?').get(docId) as
    | { id: number; owner_id: number; current_version_id: number }
    | undefined;

  if (!doc) {
    res.status(404).json({ error: 'Document not found.' });
    return;
  }

  const isOwner = doc.owner_id === req.user!.id;
  const isAssignedEditor =
    req.user!.role === 'editor' &&
    Boolean(
      db
        .prepare('SELECT id FROM editor_assignments WHERE document_id = ? AND editor_id = ? AND is_active = 1')
        .get(docId, req.user!.id)
    );

  if (!isOwner && !isAssignedEditor) {
    res.status(403).json({ error: 'Access denied. You are not authorized to download this private document.' });
    return;
  }

  const targetVersionId =
    Number.isInteger(requestedVersionId) && requestedVersionId > 0
      ? requestedVersionId
      : doc.current_version_id;

  const ver = db
    .prepare('SELECT id FROM document_versions WHERE id = ? AND document_id = ?')
    .get(targetVersionId, docId);
  if (!ver) {
    res.status(404).json({ error: 'Requested version not found.' });
    return;
  }

  const token = createSignedDownloadToken(targetVersionId, req.user!.id, 90);
  recordAudit(req.user!.id, 'download_token_issued', 'document', docId, { versionId: targetVersionId });
  res.json({ downloadUrl: `/api/documents/download?token=${encodeURIComponent(token)}` });
});

documentsRouter.get('/download', (req, res) => {
  const token = String(req.query.token || '');
  const verified = verifySignedDownloadToken(token);
  if (!verified) {
    res.status(401).json({ error: 'Download link has expired or is invalid.' });
    return;
  }

  const row = db
    .prepare(
      `SELECT dv.id, dv.document_id, dv.original_filename, dv.mime_type, dv.storage_key, d.owner_id
       FROM document_versions dv
       JOIN documents d ON d.id = dv.document_id
       WHERE dv.id = ?`
    )
    .get(verified.versionId) as
    | {
        id: number;
        document_id: number;
        original_filename: string;
        mime_type: string;
        storage_key: string;
        owner_id: number;
      }
    | undefined;

  if (!row) {
    res.status(404).json({ error: 'File version no longer exists.' });
    return;
  }

  const isOwner = row.owner_id === verified.userId;
  const isAssignedEditor = Boolean(
    db
      .prepare('SELECT id FROM editor_assignments WHERE document_id = ? AND editor_id = ? AND is_active = 1')
      .get(row.document_id, verified.userId)
  );

  if (!isOwner && !isAssignedEditor) {
    res.status(403).json({ error: 'Authorization revoked for this document.' });
    return;
  }

  const filePath = resolvePrivateStoragePath(row.storage_key);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'File payload missing from private storage.' });
    return;
  }

  const safeDownloadName = row.original_filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  res.setHeader('Content-Type', row.mime_type);
  res.setHeader('Content-Disposition', `attachment; filename="${safeDownloadName}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  fs.createReadStream(filePath).pipe(res);
});

documentsRouter.delete('/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const docId = Number(req.params.id);
  const doc = db.prepare('SELECT id, owner_id, title FROM documents WHERE id = ?').get(docId) as
    | { id: number; owner_id: number; title: string }
    | undefined;

  if (!doc) {
    res.status(404).json({ error: 'Document not found.' });
    return;
  }
  if (doc.owner_id !== req.user!.id) {
    res.status(403).json({ error: 'Only the document owner can delete this file.' });
    return;
  }

  const versions = db
    .prepare('SELECT storage_key FROM document_versions WHERE document_id = ?')
    .all(docId) as Array<{ storage_key: string }>;

  for (const v of versions) {
    try {
      const filePath = resolvePrivateStoragePath(v.storage_key);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      // ignore missing file
    }
  }

  db.prepare('DELETE FROM documents WHERE id = ?').run(docId);
  recordAudit(req.user!.id, 'document_deleted', 'document', docId, { title: doc.title });
  res.json({ ok: true });
});
