import { Router } from 'express';
import { generateDocumentSuggestions, isAiConfigured } from '../ai.ts';
import { db } from '../db.ts';
import { AuthenticatedRequest, recordAudit, requireAuth, requireRole } from '../middleware.ts';

export const reviewsRouter = Router();

reviewsRouter.get('/assigned', requireAuth, requireRole('editor'), (req: AuthenticatedRequest, res) => {
  const rows = db
    .prepare(
      `SELECT
         d.id as document_id, d.title, d.doc_type, d.review_status, d.ai_consent_granted, d.updated_at,
         u_owner.full_name as applicant_name,
         ea.id as assignment_id, ea.due_at, ea.assigned_at,
         dr.id as review_id, dr.editor_summary
       FROM editor_assignments ea
       JOIN documents d ON d.id = ea.document_id
       JOIN users u_owner ON u_owner.id = d.owner_id
       LEFT JOIN document_reviews dr ON dr.assignment_id = ea.id
       WHERE ea.editor_id = ? AND ea.is_active = 1
       ORDER BY d.updated_at DESC`
    )
    .all(req.user!.id);

  res.json({ assignments: rows });
});

reviewsRouter.get('/:documentId', requireAuth, (req: AuthenticatedRequest, res) => {
  const documentId = Number(req.params.documentId);

  const doc = db
    .prepare(
      `SELECT d.*, u_owner.full_name as owner_name
       FROM documents d
       JOIN users u_owner ON u_owner.id = d.owner_id
       WHERE d.id = ?`
    )
    .get(documentId) as Record<string, any> | undefined;

  if (!doc) {
    res.status(404).json({ error: 'Document not found.' });
    return;
  }

  const isOwner = doc.owner_id === req.user!.id;
  const assignment = db
    .prepare(
      `SELECT ea.*, u_ed.full_name as editor_name
       FROM editor_assignments ea
       JOIN users u_ed ON u_ed.id = ea.editor_id
       WHERE ea.document_id = ? AND ea.is_active = 1
       ORDER BY ea.id DESC LIMIT 1`
    )
    .get(documentId) as (Record<string, any> & { editor_id: number }) | undefined;

  const isAssignedEditor = Boolean(assignment && req.user!.role === 'editor' && assignment.editor_id === req.user!.id);

  if (!isOwner && !isAssignedEditor) {
    res.status(403).json({
      error: 'Access denied. Only the applicant owner or their assigned human editor can open this review workspace.',
    });
    return;
  }

  const versions = db
    .prepare(
      `SELECT id, version_number, original_filename, mime_type, file_size, extracted_text, created_at
       FROM document_versions
       WHERE document_id = ?
       ORDER BY version_number DESC`
    )
    .all(documentId) as Array<Record<string, any>>;

  const review = db
    .prepare('SELECT * FROM document_reviews WHERE document_id = ? ORDER BY id DESC LIMIT 1')
    .get(documentId) as Record<string, any> | undefined;

  const currentVersion = versions.find((v) => v.id === doc.current_version_id) ?? versions[0] ?? null;

  res.json({
    document: doc,
    currentVersion,
    versions,
    assignment: assignment || null,
    review: review
      ? {
          ...review,
          annotations: JSON.parse(review.annotations_json || '[]'),
          aiSuggestions: JSON.parse(review.ai_suggestions_json || '[]'),
        }
      : {
          revised_text: currentVersion?.extracted_text || '',
          annotations: [],
          aiSuggestions: [],
          editor_summary: '',
          status: doc.review_status,
        },
    permissions: {
      isOwner,
      isAssignedEditor,
      aiConfigured: isAiConfigured(),
    },
  });
});

reviewsRouter.put('/:documentId', requireAuth, requireRole('editor'), (req: AuthenticatedRequest, res) => {
  const documentId = Number(req.params.documentId);
  const assignment = db
    .prepare('SELECT id, editor_id FROM editor_assignments WHERE document_id = ? AND editor_id = ? AND is_active = 1')
    .get(documentId, req.user!.id) as { id: number; editor_id: number } | undefined;

  if (!assignment) {
    res.status(403).json({ error: 'You are not assigned to review this document.' });
    return;
  }

  const doc = db
    .prepare('SELECT id, owner_id, title, current_version_id FROM documents WHERE id = ?')
    .get(documentId) as { id: number; owner_id: number; title: string; current_version_id: number } | undefined;

  if (!doc) {
    res.status(404).json({ error: 'Document not found.' });
    return;
  }

  const { revisedText, annotations, editorSummary, nextStatus } = req.body ?? {};
  const allowedEditorStatuses = new Set([
    'Under Review',
    'Changes Suggested',
    'Awaiting Applicant Approval',
    'Completed',
  ]);
  const statusToApply = allowedEditorStatuses.has(nextStatus) ? nextStatus : 'Under Review';

  const cleanAnnotations = Array.isArray(annotations) ? annotations.slice(0, 60) : [];
  const cleanRevised = String(revisedText ?? '').slice(0, 30000);
  const cleanSummary = String(editorSummary ?? '').slice(0, 2000);

  const existingReview = db
    .prepare('SELECT id FROM document_reviews WHERE assignment_id = ?')
    .get(assignment.id) as { id: number } | undefined;

  if (existingReview) {
    db.prepare(
      `UPDATE document_reviews
       SET revised_text = ?, annotations_json = ?, editor_summary = ?, status = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(cleanRevised, JSON.stringify(cleanAnnotations), cleanSummary, statusToApply, existingReview.id);
  } else {
    db.prepare(
      `INSERT INTO document_reviews (document_id, assignment_id, editor_id, base_version_id, revised_text, annotations_json, editor_summary, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      documentId,
      assignment.id,
      req.user!.id,
      doc.current_version_id,
      cleanRevised,
      JSON.stringify(cleanAnnotations),
      cleanSummary,
      statusToApply
    );
  }

  db.prepare(`UPDATE documents SET review_status = ?, updated_at = datetime('now') WHERE id = ?`).run(
    statusToApply,
    documentId
  );

  if (statusToApply !== 'Under Review') {
    db.prepare(
      `INSERT INTO notifications (user_id, type, title, message, link_path)
       VALUES (?, 'review_update', ?, ?, ?)`
    ).run(
      doc.owner_id,
      `Document status: ${statusToApply}`,
      `Your document "${doc.title}" was updated by ${req.user!.full_name}.`,
      `/reviews/${documentId}`
    );
  }

  recordAudit(req.user!.id, 'editor_review_saved', 'document', documentId, { status: statusToApply });
  res.json({ ok: true, status: statusToApply });
});

reviewsRouter.post('/:documentId/applicant-decision', requireAuth, (req: AuthenticatedRequest, res) => {
  const documentId = Number(req.params.documentId);
  const { decision, note } = req.body ?? {};

  const doc = db
    .prepare('SELECT id, owner_id, title FROM documents WHERE id = ?')
    .get(documentId) as { id: number; owner_id: number; title: string } | undefined;

  if (!doc) {
    res.status(404).json({ error: 'Document not found.' });
    return;
  }
  if (doc.owner_id !== req.user!.id) {
    res.status(403).json({ error: 'Only the applicant owner can approve or request further edits.' });
    return;
  }

  const nextStatus = decision === 'approve' ? 'Approved' : decision === 'complete' ? 'Completed' : 'Under Review';

  db.prepare(`UPDATE documents SET review_status = ?, updated_at = datetime('now') WHERE id = ?`).run(
    nextStatus,
    documentId
  );
  db.prepare(`UPDATE document_reviews SET status = ?, updated_at = datetime('now') WHERE document_id = ?`).run(
    nextStatus,
    documentId
  );

  const assignment = db
    .prepare('SELECT editor_id FROM editor_assignments WHERE document_id = ? AND is_active = 1')
    .get(documentId) as { editor_id: number } | undefined;

  if (assignment) {
    db.prepare(
      `INSERT INTO notifications (user_id, type, title, message, link_path)
       VALUES (?, 'applicant_decision', ?, ?, ?)`
    ).run(
      assignment.editor_id,
      `Applicant marked "${doc.title}" as ${nextStatus}`,
      note ? String(note).slice(0, 300) : `The applicant updated review status to ${nextStatus}.`,
      `/reviews/${documentId}`
    );
  }

  recordAudit(req.user!.id, 'applicant_review_decision', 'document', documentId, { nextStatus });
  res.json({ ok: true, status: nextStatus });
});

reviewsRouter.post('/:documentId/ai-suggest', requireAuth, async (req: AuthenticatedRequest, res) => {
  const documentId = Number(req.params.documentId);
  const { grantConsentNow } = req.body ?? {};

  const doc = db
    .prepare('SELECT id, owner_id, doc_type, ai_consent_granted, current_version_id FROM documents WHERE id = ?')
    .get(documentId) as
    | {
        id: number;
        owner_id: number;
        doc_type: string;
        ai_consent_granted: number;
        current_version_id: number;
      }
    | undefined;

  if (!doc) {
    res.status(404).json({ error: 'Document not found.' });
    return;
  }

  const isOwner = doc.owner_id === req.user!.id;
  const isAssignedEditor = Boolean(
    req.user!.role === 'editor' &&
      db
        .prepare('SELECT id FROM editor_assignments WHERE document_id = ? AND editor_id = ? AND is_active = 1')
        .get(documentId, req.user!.id)
  );

  if (!isOwner && !isAssignedEditor) {
    res.status(403).json({ error: 'Access denied.' });
    return;
  }

  if (isOwner && grantConsentNow === true && !doc.ai_consent_granted) {
    db.prepare('UPDATE documents SET ai_consent_granted = 1 WHERE id = ?').run(documentId);
    doc.ai_consent_granted = 1;
    recordAudit(req.user!.id, 'ai_consent_granted', 'document', documentId);
  }

  if (!doc.ai_consent_granted) {
    res.status(403).json({
      error: 'Explicit applicant consent is required before sending document text to the AI assistant.',
    });
    return;
  }

  const ver = db
    .prepare('SELECT extracted_text FROM document_versions WHERE id = ?')
    .get(doc.current_version_id) as { extracted_text: string } | undefined;

  const reviewRow = db
    .prepare('SELECT id, revised_text FROM document_reviews WHERE document_id = ? ORDER BY id DESC LIMIT 1')
    .get(documentId) as { id: number; revised_text: string } | undefined;

  const sourceText =
    reviewRow?.revised_text && reviewRow.revised_text.trim().length > 20
      ? reviewRow.revised_text
      : ver?.extracted_text || '';

  const result = await generateDocumentSuggestions(doc.doc_type, sourceText);

  if (reviewRow && result.suggestions.length > 0) {
    db.prepare(`UPDATE document_reviews SET ai_suggestions_json = ?, updated_at = datetime('now') WHERE id = ?`).run(
      JSON.stringify(result.suggestions),
      reviewRow.id
    );
  }

  recordAudit(req.user!.id, 'ai_suggestions_requested', 'document', documentId, {
    available: result.available,
    count: result.suggestions.length,
  });

  res.json(result);
});
