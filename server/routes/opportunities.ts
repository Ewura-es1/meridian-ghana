import { Router } from 'express';
import { db, runDeadlineExpirySweep } from '../db.ts';
import { AuthenticatedRequest, optionalAuth, recordAudit, requireAuth } from '../middleware.ts';
import { isSafeHttpUrl } from '../security.ts';

export const opportunitiesRouter = Router();

opportunitiesRouter.get('/meta', (_req, res) => {
  runDeadlineExpirySweep();

  const regions = db
    .prepare(
      `SELECT r.*,
        (SELECT COUNT(*) FROM opportunities o
         WHERE o.region_id = r.id AND o.verification_status IN ('Verified', 'Closing Soon')) as active_count
       FROM regions r
       WHERE r.is_active = 1
       ORDER BY r.is_multi_region ASC, r.name ASC`
    )
    .all();

  const categories = db
    .prepare(
      `SELECT c.*,
        (SELECT COUNT(*) FROM opportunities o
         WHERE o.category_id = c.id AND o.verification_status IN ('Verified', 'Closing Soon')) as active_count
       FROM opportunity_categories c
       WHERE c.is_active = 1
       ORDER BY c.name ASC`
    )
    .all();

  const announcements = db
    .prepare('SELECT id, title, body, created_at FROM announcements WHERE is_active = 1 ORDER BY id DESC LIMIT 3')
    .all();

  res.json({ regions, categories, announcements });
});

opportunitiesRouter.get('/', optionalAuth, (req: AuthenticatedRequest, res) => {
  runDeadlineExpirySweep();

  const {
    q = '',
    region = '',
    city = '',
    category = '',
    organization = '',
    workArrangement = '',
    qualification = '',
    deadlineBefore = '',
    status = '',
    includeArchived = 'false',
    sort = 'recently_verified',
  } = req.query as Record<string, string>;

  const whereClauses: string[] = ['o.ghana_eligibility_confirmed = 1'];
  const params: Array<string | number> = [];

  if (includeArchived === 'true') {
    if (status) {
      whereClauses.push('o.verification_status = ?');
      params.push(status);
    }
  } else if (status === 'Verified' || status === 'Closing Soon') {
    whereClauses.push('o.verification_status = ?');
    params.push(status);
  } else {
    // Active public view strictly excludes Expired, Closed, Pending Verification, and Source Unavailable
    whereClauses.push("o.verification_status IN ('Verified', 'Closing Soon')");
  }

  if (q.trim()) {
    const like = `%${q.trim()}%`;
    whereClauses.push(
      '(o.title LIKE ? OR org.name LIKE ? OR c.name LIKE ? OR o.description LIKE ? OR o.city_district LIKE ? OR o.qualifications LIKE ?)'
    );
    params.push(like, like, like, like, like, like);
  }

  if (region.trim()) {
    whereClauses.push('(r.slug = ? OR r.name = ? OR CAST(r.id AS TEXT) = ?)');
    params.push(region.trim(), region.trim(), region.trim());
  }

  if (city.trim()) {
    whereClauses.push('(o.city_district LIKE ? OR o.location_summary LIKE ?)');
    const cLike = `%${city.trim()}%`;
    params.push(cLike, cLike);
  }

  if (category.trim()) {
    whereClauses.push('(c.slug = ? OR c.name = ? OR CAST(c.id AS TEXT) = ?)');
    params.push(category.trim(), category.trim(), category.trim());
  }

  if (organization.trim()) {
    whereClauses.push('org.name LIKE ?');
    params.push(`%${organization.trim()}%`);
  }

  if (workArrangement.trim()) {
    whereClauses.push('o.work_arrangement = ?');
    params.push(workArrangement.trim());
  }

  if (qualification.trim()) {
    whereClauses.push('(o.qualifications LIKE ? OR o.eligibility_requirements LIKE ?)');
    const qLike = `%${qualification.trim()}%`;
    params.push(qLike, qLike);
  }

  if (deadlineBefore.trim()) {
    whereClauses.push('o.deadline <= ?');
    params.push(deadlineBefore.trim());
  }

  let orderBy = 'COALESCE(o.last_verified_at, o.created_at) DESC, o.id DESC';
  if (sort === 'newest') {
    orderBy = 'o.created_at DESC, o.id DESC';
  } else if (sort === 'closing_soon') {
    orderBy = 'o.deadline ASC, o.id DESC';
  } else if (sort === 'recently_verified') {
    orderBy = 'COALESCE(o.last_verified_at, o.created_at) DESC, o.id DESC';
  }

  const sql = `
    SELECT
      o.id, o.title, o.city_district, o.location_summary, o.work_arrangement,
      o.ghana_eligibility_confirmed, o.ghana_eligibility_evidence,
      o.description, o.qualifications, o.eligibility_requirements,
      o.opening_date, o.deadline, o.duration, o.compensation,
      o.official_apply_url, o.source_url, o.verification_status,
      o.last_verified_at, o.is_demo, o.created_at,
      org.id as organization_id, org.name as organization_name, org.description as organization_description,
      c.id as category_id, c.name as category_name, c.slug as category_slug,
      r.id as region_id, r.name as region_name, r.slug as region_slug
    FROM opportunities o
    JOIN organizations org ON org.id = o.organization_id
    JOIN opportunity_categories c ON c.id = o.category_id
    JOIN regions r ON r.id = o.region_id
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY ${orderBy}
  `;

  const items = db.prepare(sql).all(...params) as Array<Record<string, any>>;

  let savedIds = new Set<number>();
  if (req.user) {
    const rows = db
      .prepare('SELECT opportunity_id FROM saved_opportunities WHERE user_id = ?')
      .all(req.user.id) as Array<{ opportunity_id: number }>;
    savedIds = new Set(rows.map((r) => r.opportunity_id));
  }

  const archivedCount = (
    db
      .prepare("SELECT COUNT(*) as c FROM opportunities WHERE verification_status IN ('Expired', 'Closed')")
      .get() as { c: number }
  ).c;

  res.json({
    opportunities: items.map((item) => ({
      ...item,
      isSaved: savedIds.has(item.id),
    })),
    archivedCount,
  });
});

opportunitiesRouter.get('/saved/list', requireAuth, (req: AuthenticatedRequest, res) => {
  runDeadlineExpirySweep();
  const rows = db
    .prepare(
      `SELECT
         o.id, o.title, o.city_district, o.location_summary, o.work_arrangement,
         o.deadline, o.verification_status, o.last_verified_at, o.is_demo,
         org.name as organization_name, c.name as category_name, r.name as region_name,
         s.created_at as saved_at
       FROM saved_opportunities s
       JOIN opportunities o ON o.id = s.opportunity_id
       JOIN organizations org ON org.id = o.organization_id
       JOIN opportunity_categories c ON c.id = o.category_id
       JOIN regions r ON r.id = o.region_id
       WHERE s.user_id = ?
       ORDER BY s.created_at DESC`
    )
    .all(req.user!.id);

  const recent = db
    .prepare(
      `SELECT
         o.id, o.title, o.location_summary, o.deadline, o.verification_status, o.is_demo,
         org.name as organization_name, r.name as region_name, rv.viewed_at
       FROM recently_viewed rv
       JOIN opportunities o ON o.id = rv.opportunity_id
       JOIN organizations org ON org.id = o.organization_id
       JOIN regions r ON r.id = o.region_id
       WHERE rv.user_id = ?
       ORDER BY rv.viewed_at DESC
       LIMIT 6`
    )
    .all(req.user!.id);

  res.json({ saved: rows, recentlyViewed: recent });
});

opportunitiesRouter.get('/:id', optionalAuth, (req: AuthenticatedRequest, res) => {
  runDeadlineExpirySweep();
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid opportunity ID.' });
    return;
  }

  const opp = db
    .prepare(
      `SELECT
         o.*,
         org.name as organization_name, org.description as organization_description, org.website_url as organization_website,
         c.name as category_name, c.slug as category_slug,
         r.name as region_name, r.slug as region_slug, r.capital as region_capital
       FROM opportunities o
       JOIN organizations org ON org.id = o.organization_id
       JOIN opportunity_categories c ON c.id = o.category_id
       JOIN regions r ON r.id = o.region_id
       WHERE o.id = ?`
    )
    .get(id) as Record<string, any> | undefined;

  if (!opp) {
    res.status(404).json({ error: 'Opportunity not found.' });
    return;
  }

  const verificationHistory = db
    .prepare(
      `SELECT vl.id, vl.previous_status, vl.new_status, vl.source_checked_url, vl.ghana_confirmed, vl.notes, vl.checked_at
       FROM verification_logs vl
       WHERE vl.opportunity_id = ?
       ORDER BY vl.checked_at DESC, vl.id DESC
       LIMIT 10`
    )
    .all(id);

  let isSaved = false;
  if (req.user) {
    isSaved = Boolean(
      db
        .prepare('SELECT id FROM saved_opportunities WHERE user_id = ? AND opportunity_id = ?')
        .get(req.user.id, id)
    );
    db.prepare(
      `INSERT INTO recently_viewed (user_id, opportunity_id, viewed_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(user_id, opportunity_id) DO UPDATE SET viewed_at = datetime('now')`
    ).run(req.user.id, id);
  }

  res.json({
    opportunity: {
      ...opp,
      official_apply_url: isSafeHttpUrl(opp.official_apply_url) ? opp.official_apply_url : '',
      source_url: isSafeHttpUrl(opp.source_url) ? opp.source_url : '',
      isSaved,
    },
    verificationHistory,
  });
});

opportunitiesRouter.post('/:id/save', requireAuth, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const exists = db.prepare('SELECT id FROM opportunities WHERE id = ?').get(id);
  if (!exists) {
    res.status(404).json({ error: 'Opportunity not found.' });
    return;
  }
  db.prepare('INSERT OR IGNORE INTO saved_opportunities (user_id, opportunity_id) VALUES (?, ?)').run(
    req.user!.id,
    id
  );
  res.json({ saved: true });
});

opportunitiesRouter.delete('/:id/save', requireAuth, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM saved_opportunities WHERE user_id = ? AND opportunity_id = ?').run(req.user!.id, id);
  res.json({ saved: false });
});

opportunitiesRouter.post('/:id/report', optionalAuth, (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const { reason, details } = req.body ?? {};
  const exists = db.prepare('SELECT id FROM opportunities WHERE id = ?').get(id);
  if (!exists) {
    res.status(404).json({ error: 'Opportunity not found.' });
    return;
  }
  const cleanReason = String(reason || '').trim();
  if (cleanReason.length < 3) {
    res.status(400).json({ error: 'Please select or enter a reason for reporting this listing.' });
    return;
  }

  db.prepare(
    `INSERT INTO opportunity_reports (opportunity_id, reporter_id, reason, details)
     VALUES (?, ?, ?, ?)`
  ).run(id, req.user?.id ?? null, cleanReason.slice(0, 120), String(details || '').slice(0, 600));

  recordAudit(req.user?.id ?? null, 'opportunity_reported', 'opportunity', id, { reason: cleanReason });
  res.status(201).json({ ok: true });
});
