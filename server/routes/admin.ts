import { Router } from 'express';
import { db, runDeadlineExpirySweep } from '../db.ts';
import { AuthenticatedRequest, recordAudit, requireAuth, requireRole } from '../middleware.ts';
import { hashPassword, isSafeHttpUrl } from '../security.ts';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('admin'));

adminRouter.get('/overview', (_req, res) => {
  runDeadlineExpirySweep();

  const stats = {
    totalUsers: (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c,
    totalOpportunities: (db.prepare('SELECT COUNT(*) as c FROM opportunities').get() as { c: number }).c,
    verifiedOpportunities: (
      db.prepare("SELECT COUNT(*) as c FROM opportunities WHERE verification_status = 'Verified'").get() as {
        c: number;
      }
    ).c,
    pendingVerification: (
      db.prepare("SELECT COUNT(*) as c FROM opportunities WHERE verification_status = 'Pending Verification'").get() as {
        c: number;
      }
    ).c,
    closingSoon: (
      db.prepare("SELECT COUNT(*) as c FROM opportunities WHERE verification_status = 'Closing Soon'").get() as {
        c: number;
      }
    ).c,
    expiredOpportunities: (
      db.prepare("SELECT COUNT(*) as c FROM opportunities WHERE verification_status = 'Expired'").get() as {
        c: number;
      }
    ).c,
    totalReviewRequests: (
      db.prepare("SELECT COUNT(*) as c FROM documents WHERE review_status != 'Submitted'").get() as { c: number }
    ).c,
    pendingReviews: (
      db
        .prepare("SELECT COUNT(*) as c FROM documents WHERE review_status IN ('Awaiting Assignment', 'Assigned', 'Under Review', 'Changes Suggested', 'Awaiting Applicant Approval')")
        .get() as { c: number }
    ).c,
    completedReviews: (
      db.prepare("SELECT COUNT(*) as c FROM documents WHERE review_status IN ('Approved', 'Completed')").get() as {
        c: number;
      }
    ).c,
    activeEditors: (
      db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'editor' AND status = 'active'").get() as { c: number }
    ).c,
    openReports: (
      db.prepare("SELECT COUNT(*) as c FROM opportunity_reports WHERE status = 'open'").get() as { c: number }
    ).c,
    demoListingsCount: (db.prepare('SELECT COUNT(*) as c FROM opportunities WHERE is_demo = 1').get() as { c: number }).c,
  };

  res.json({ stats });
});

adminRouter.get('/opportunities', (_req, res) => {
  runDeadlineExpirySweep();
  const rows = db
    .prepare(
      `SELECT o.*, org.name as organization_name, c.name as category_name, r.name as region_name
       FROM opportunities o
       JOIN organizations org ON org.id = o.organization_id
       JOIN opportunity_categories c ON c.id = o.category_id
       JOIN regions r ON r.id = o.region_id
       ORDER BY o.created_at DESC, o.id DESC`
    )
    .all();
  res.json({ opportunities: rows });
});

adminRouter.post('/opportunities', (req: AuthenticatedRequest, res) => {
  const {
    title,
    organizationName,
    organizationDescription,
    categoryId,
    regionId,
    cityDistrict,
    workArrangement,
    ghanaEligibilityConfirmed,
    ghanaEligibilityEvidence,
    description,
    responsibilities,
    qualifications,
    eligibilityRequirements,
    requiredSkills,
    requiredDocuments,
    openingDate,
    deadline,
    duration,
    compensation,
    officialApplyUrl,
    sourceUrl,
    isDemo,
  } = req.body ?? {};

  if (!ghanaEligibilityConfirmed) {
    res.status(400).json({
      error: 'Ghana-only policy: You must confirm and document Ghana-based eligibility before adding an internship.',
    });
    return;
  }

  const evidence = String(ghanaEligibilityEvidence || '').trim();
  if (evidence.length < 10) {
    res.status(400).json({
      error: 'Please provide clear evidence explaining how applicants based in Ghana are eligible.',
    });
    return;
  }

  const cleanTitle = String(title || '').trim();
  const cleanOrgName = String(organizationName || '').trim();
  if (cleanTitle.length < 4 || cleanOrgName.length < 2) {
    res.status(400).json({ error: 'Internship title and organization name are required.' });
    return;
  }

  if (!isSafeHttpUrl(String(officialApplyUrl || '')) || !isSafeHttpUrl(String(sourceUrl || ''))) {
    res.status(400).json({ error: 'Valid http/https Official Application URL and Source URL are required.' });
    return;
  }

  const region = db.prepare('SELECT id, name FROM regions WHERE id = ?').get(Number(regionId)) as
    | { id: number; name: string }
    | undefined;
  const cat = db.prepare('SELECT id FROM opportunity_categories WHERE id = ?').get(Number(categoryId)) as
    | { id: number }
    | undefined;

  if (!region || !cat) {
    res.status(400).json({ error: 'Please select a valid Ghana region and industry category.' });
    return;
  }

  const validArrangements = new Set(['On-site', 'Hybrid', 'Remote (Ghana Residents)']);
  if (!validArrangements.has(workArrangement)) {
    res.status(400).json({ error: 'Invalid work arrangement selected.' });
    return;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(deadline || ''))) {
    res.status(400).json({ error: 'Application deadline must be in YYYY-MM-DD format.' });
    return;
  }

  // Upsert organization
  const existingOrg = db.prepare('SELECT id FROM organizations WHERE name = ?').get(cleanOrgName) as
    | { id: number }
    | undefined;
  let orgId: number;
  if (existingOrg) {
    orgId = existingOrg.id;
  } else {
    const orgRes = db
      .prepare(
        `INSERT INTO organizations (name, description, ghana_presence_confirmed, primary_region_id, is_demo)
         VALUES (?, ?, 1, ?, ?)`
      )
      .run(cleanOrgName, String(organizationDescription || '').slice(0, 500), region.id, isDemo ? 1 : 0);
    orgId = Number(orgRes.lastInsertRowid);
  }

  const cleanCity = String(cityDistrict || '').trim() || 'Not specified';
  const locSummary = cleanCity === 'Not specified' ? `${region.name} Region, Ghana` : `${cleanCity} — ${region.name} Region`;

  // Never mark Verified merely upon insertion — starts as Pending Verification
  const oppRes = db
    .prepare(
      `INSERT INTO opportunities (
        title, organization_id, category_id, region_id, city_district, location_summary,
        work_arrangement, ghana_eligibility_confirmed, ghana_eligibility_evidence,
        description, responsibilities, qualifications, eligibility_requirements,
        required_skills, required_documents, opening_date, deadline, duration, compensation,
        official_apply_url, source_url, verification_status, verification_notes, is_demo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending Verification', 'Added by administrator; awaiting source verification check.', ?)`
    )
    .run(
      cleanTitle,
      orgId,
      cat.id,
      region.id,
      cleanCity,
      locSummary,
      workArrangement,
      evidence,
      String(description || '').trim() || 'Not specified',
      String(responsibilities || '').trim() || 'Not specified',
      String(qualifications || '').trim() || 'Not specified',
      String(eligibilityRequirements || '').trim() || 'Not specified',
      String(requiredSkills || '').trim() || 'Not specified',
      String(requiredDocuments || '').trim() || 'CV, Cover Letter',
      openingDate ? String(openingDate).trim() : null,
      String(deadline).trim(),
      String(duration || '').trim() || 'Not specified',
      String(compensation || '').trim() || 'Not specified',
      String(officialApplyUrl).trim(),
      String(sourceUrl).trim(),
      isDemo ? 1 : 0
    );

  const oppId = Number(oppRes.lastInsertRowid);
  recordAudit(req.user!.id, 'opportunity_created', 'opportunity', oppId, { title: cleanTitle, region: region.name });
  res.status(201).json({ id: oppId, verification_status: 'Pending Verification' });
});

adminRouter.post('/opportunities/:id/verify', (req: AuthenticatedRequest, res) => {
  const oppId = Number(req.params.id);
  const { status, sourceCheckedUrl, ghanaConfirmed, notes, extendedDeadline } = req.body ?? {};

  const opp = db.prepare('SELECT * FROM opportunities WHERE id = ?').get(oppId) as
    | { id: number; verification_status: string; source_url: string; deadline: string }
    | undefined;
  if (!opp) {
    res.status(404).json({ error: 'Opportunity not found.' });
    return;
  }

  const allowedStatuses = new Set([
    'Verified',
    'Pending Verification',
    'Closing Soon',
    'Expired',
    'Closed',
    'Source Unavailable',
  ]);
  if (!allowedStatuses.has(status)) {
    res.status(400).json({ error: 'Invalid verification status.' });
    return;
  }

  const checkedUrl = String(sourceCheckedUrl || opp.source_url).trim();
  if (status === 'Verified' && (!ghanaConfirmed || !isSafeHttpUrl(checkedUrl))) {
    res.status(400).json({
      error: 'Verifying an opportunity requires confirming Ghana-based eligibility and a valid source URL.',
    });
    return;
  }

  const effectiveDeadline =
    extendedDeadline && /^\d{4}-\d{2}-\d{2}$/.test(String(extendedDeadline))
      ? String(extendedDeadline)
      : opp.deadline;

  const updateVerifiedDate = status === 'Verified' ? new Date().toISOString().slice(0, 10) : null;

  if (updateVerifiedDate) {
    db.prepare(
      `UPDATE opportunities
       SET verification_status = ?, last_verified_at = ?, verified_by = ?, verification_notes = ?, deadline = ?
       WHERE id = ?`
    ).run(status, updateVerifiedDate, req.user!.id, String(notes || '').slice(0, 500), effectiveDeadline, oppId);
  } else {
    db.prepare(
      `UPDATE opportunities
       SET verification_status = ?, verification_notes = ?, deadline = ?
       WHERE id = ?`
    ).run(status, String(notes || '').slice(0, 500), effectiveDeadline, oppId);
  }

  db.prepare(
    `INSERT INTO verification_logs (opportunity_id, admin_id, previous_status, new_status, source_checked_url, ghana_confirmed, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(oppId, req.user!.id, opp.verification_status, status, checkedUrl, ghanaConfirmed ? 1 : 0, String(notes || '').slice(0, 500));

  recordAudit(req.user!.id, 'opportunity_verification_updated', 'opportunity', oppId, {
    from: opp.verification_status,
    to: status,
  });

  runDeadlineExpirySweep();
  res.json({ ok: true });
});

adminRouter.delete('/opportunities/:id', (req: AuthenticatedRequest, res) => {
  const oppId = Number(req.params.id);
  db.prepare('DELETE FROM opportunities WHERE id = ?').run(oppId);
  recordAudit(req.user!.id, 'opportunity_deleted', 'opportunity', oppId);
  res.json({ ok: true });
});

adminRouter.post('/categories', (req: AuthenticatedRequest, res) => {
  const name = String(req.body?.name || '').trim();
  if (name.length < 2 || name.length > 80) {
    res.status(400).json({ error: 'Category name must be between 2 and 80 characters.' });
    return;
  }
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  try {
    const info = db
      .prepare('INSERT INTO opportunity_categories (name, slug, created_by) VALUES (?, ?, ?)')
      .run(name, slug, req.user!.id);
    recordAudit(req.user!.id, 'category_created', 'category', Number(info.lastInsertRowid), { name });
    res.status(201).json({ id: Number(info.lastInsertRowid), name, slug });
  } catch {
    res.status(409).json({ error: 'That category already exists.' });
  }
});

adminRouter.get('/users', (_req, res) => {
  const users = db
    .prepare(
      `SELECT id, email, full_name, role, is_minor, status, is_demo, created_at
       FROM users
       ORDER BY created_at DESC`
    )
    .all();
  res.json({ users });
});

adminRouter.post('/editors', (req: AuthenticatedRequest, res) => {
  const { email, fullName, password } = req.body ?? {};
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanName = String(fullName || '').trim();
  const rawPass = String(password || '');

  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    res.status(400).json({ error: 'Valid editor email is required.' });
    return;
  }
  if (cleanName.length < 2 || rawPass.length < 8) {
    res.status(400).json({ error: 'Full name and password (min 8 chars) are required.' });
    return;
  }

  try {
    const info = db
      .prepare(
        `INSERT INTO users (email, password_hash, full_name, role, privacy_consent_at, is_demo)
         VALUES (?, ?, ?, 'editor', datetime('now'), 0)`
      )
      .run(cleanEmail, hashPassword(rawPass), cleanName);
    const id = Number(info.lastInsertRowid);
    recordAudit(req.user!.id, 'editor_account_created', 'user', id, { email: cleanEmail });
    res.status(201).json({ id, email: cleanEmail, full_name: cleanName, role: 'editor' });
  } catch {
    res.status(409).json({ error: 'An account with that email already exists.' });
  }
});

adminRouter.patch('/users/:id', (req: AuthenticatedRequest, res) => {
  const userId = Number(req.params.id);
  const { status, role } = req.body ?? {};
  if (userId === req.user!.id && (status === 'suspended' || (role && role !== 'admin'))) {
    res.status(400).json({ error: 'You cannot suspend or demote your own active admin session.' });
    return;
  }
  if (status === 'active' || status === 'suspended') {
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, userId);
  }
  if (role === 'applicant' || role === 'editor' || role === 'admin') {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
  }
  recordAudit(req.user!.id, 'user_updated', 'user', userId, { status, role });
  res.json({ ok: true });
});

adminRouter.get('/reviews', (_req, res) => {
  // Metadata only — admins do not receive raw personal document contents in review oversight
  const rows = db
    .prepare(
      `SELECT d.id as document_id, d.title, d.doc_type, d.review_status, d.created_at, d.updated_at,
         u_owner.full_name as applicant_name,
         ea.editor_id, u_ed.full_name as editor_name, ea.due_at
       FROM documents d
       JOIN users u_owner ON u_owner.id = d.owner_id
       LEFT JOIN editor_assignments ea ON ea.document_id = d.id AND ea.is_active = 1
       LEFT JOIN users u_ed ON u_ed.id = ea.editor_id
       ORDER BY d.updated_at DESC`
    )
    .all();

  const editors = db
    .prepare("SELECT id, full_name, email, is_demo FROM users WHERE role = 'editor' AND status = 'active'")
    .all();

  res.json({ reviews: rows, editors });
});

adminRouter.post('/reviews/:documentId/assign', (req: AuthenticatedRequest, res) => {
  const documentId = Number(req.params.documentId);
  const editorId = Number(req.body?.editorId);
  const dueAt = req.body?.dueAt ? String(req.body.dueAt) : null;

  const doc = db.prepare('SELECT id, owner_id, title, current_version_id FROM documents WHERE id = ?').get(documentId) as
    | { id: number; owner_id: number; title: string; current_version_id: number }
    | undefined;
  const editor = db.prepare("SELECT id, full_name FROM users WHERE id = ? AND role = 'editor' AND status = 'active'").get(
    editorId
  ) as { id: number; full_name: string } | undefined;

  if (!doc || !editor) {
    res.status(400).json({ error: 'Valid document and active editor are required.' });
    return;
  }

  db.prepare('UPDATE editor_assignments SET is_active = 0 WHERE document_id = ?').run(documentId);
  const assignRes = db
    .prepare(
      `INSERT INTO editor_assignments (document_id, editor_id, assigned_by, due_at, is_active)
       VALUES (?, ?, ?, ?, 1)`
    )
    .run(documentId, editorId, req.user!.id, dueAt);
  const assignmentId = Number(assignRes.lastInsertRowid);

  const ver = db
    .prepare('SELECT extracted_text FROM document_versions WHERE id = ?')
    .get(doc.current_version_id) as { extracted_text: string } | undefined;

  db.prepare(
    `INSERT INTO document_reviews (document_id, assignment_id, editor_id, base_version_id, revised_text, status)
     VALUES (?, ?, ?, ?, ?, 'Assigned')`
  ).run(documentId, assignmentId, editorId, doc.current_version_id, ver?.extracted_text || '');

  db.prepare(`UPDATE documents SET review_status = 'Assigned', updated_at = datetime('now') WHERE id = ?`).run(
    documentId
  );

  db.prepare(
    `INSERT INTO notifications (user_id, type, title, message, link_path)
     VALUES (?, 'review_assigned', ?, ?, ?)`
  ).run(
    doc.owner_id,
    'Document assigned to an editor',
    `"${doc.title}" has been assigned to ${editor.full_name} for review.`,
    `/reviews/${documentId}`
  );
  db.prepare(
    `INSERT INTO notifications (user_id, type, title, message, link_path)
     VALUES (?, 'editor_assignment', ?, ?, ?)`
  ).run(
    editorId,
    'New document review assigned',
    `You have been assigned to review "${doc.title}".`,
    `/reviews/${documentId}`
  );

  recordAudit(req.user!.id, 'editor_assigned', 'document', documentId, { editorId });
  res.json({ ok: true });
});

adminRouter.get('/reports', (_req, res) => {
  const reports = db
    .prepare(
      `SELECT r.*, o.title as opportunity_title, o.verification_status
       FROM opportunity_reports r
       JOIN opportunities o ON o.id = r.opportunity_id
       ORDER BY r.created_at DESC`
    )
    .all();
  res.json({ reports });
});

adminRouter.patch('/reports/:id', (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const status = String(req.body?.status || '');
  if (!['open', 'resolved', 'dismissed'].includes(status)) {
    res.status(400).json({ error: 'Invalid report status.' });
    return;
  }
  db.prepare('UPDATE opportunity_reports SET status = ? WHERE id = ?').run(status, id);
  recordAudit(req.user!.id, 'report_updated', 'opportunity_report', id, { status });
  res.json({ ok: true });
});

adminRouter.get('/announcements', (_req, res) => {
  const announcements = db.prepare('SELECT * FROM announcements ORDER BY id DESC').all();
  res.json({ announcements });
});

adminRouter.post('/announcements', (req: AuthenticatedRequest, res) => {
  const title = String(req.body?.title || '').trim();
  const body = String(req.body?.body || '').trim();
  if (title.length < 3 || body.length < 5) {
    res.status(400).json({ error: 'Announcement title and message are required.' });
    return;
  }
  const info = db
    .prepare('INSERT INTO announcements (title, body, is_active, created_by) VALUES (?, ?, 1, ?)')
    .run(title, body, req.user!.id);
  recordAudit(req.user!.id, 'announcement_created', 'announcement', Number(info.lastInsertRowid));
  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

adminRouter.get('/audit-logs', (_req, res) => {
  const logs = db
    .prepare(
      `SELECT al.*, u.full_name as actor_name, u.role as actor_role
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_id
       ORDER BY al.id DESC
       LIMIT 60`
    )
    .all();
  res.json({ logs });
});
