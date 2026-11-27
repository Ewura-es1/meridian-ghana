import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { ensurePrivateStorageDir, hashPassword, resolvePrivateStoragePath } from './security.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'meridian_ghana.sqlite');
export const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

export function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('applicant', 'editor', 'admin')) DEFAULT 'applicant',
      is_minor INTEGER NOT NULL DEFAULT 0,
      guardian_consent_confirmed INTEGER NOT NULL DEFAULT 0,
      privacy_consent_at TEXT,
      status TEXT NOT NULL CHECK(status IN ('active', 'suspended')) DEFAULT 'active',
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS applicant_profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      education_level TEXT NOT NULL DEFAULT '',
      institution TEXT NOT NULL DEFAULT '',
      graduation_year TEXT NOT NULL DEFAULT '',
      preferred_regions TEXT NOT NULL DEFAULT '[]',
      preferred_categories TEXT NOT NULL DEFAULT '[]',
      skills TEXT NOT NULL DEFAULT '[]',
      bio TEXT NOT NULL DEFAULT '',
      notify_deadlines INTEGER NOT NULL DEFAULT 1,
      notify_reviews INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS regions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      capital TEXT NOT NULL DEFAULT '',
      is_multi_region INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS opportunity_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      sector TEXT NOT NULL DEFAULT '',
      ghana_presence_confirmed INTEGER NOT NULL DEFAULT 1,
      website_url TEXT NOT NULL DEFAULT '',
      primary_region_id INTEGER REFERENCES regions(id) ON DELETE SET NULL,
      is_demo INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS opportunities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
      category_id INTEGER NOT NULL REFERENCES opportunity_categories(id) ON DELETE RESTRICT,
      region_id INTEGER NOT NULL REFERENCES regions(id) ON DELETE RESTRICT,
      city_district TEXT NOT NULL DEFAULT 'Not specified',
      location_summary TEXT NOT NULL,
      work_arrangement TEXT NOT NULL CHECK(work_arrangement IN ('On-site', 'Hybrid', 'Remote (Ghana Residents)')),
      ghana_eligibility_confirmed INTEGER NOT NULL CHECK(ghana_eligibility_confirmed = 1),
      ghana_eligibility_evidence TEXT NOT NULL,
      description TEXT NOT NULL,
      responsibilities TEXT NOT NULL,
      qualifications TEXT NOT NULL,
      eligibility_requirements TEXT NOT NULL,
      required_skills TEXT NOT NULL,
      required_documents TEXT NOT NULL,
      opening_date TEXT,
      deadline TEXT NOT NULL,
      duration TEXT NOT NULL DEFAULT 'Not specified',
      compensation TEXT NOT NULL DEFAULT 'Not specified',
      official_apply_url TEXT NOT NULL,
      source_url TEXT NOT NULL,
      verification_status TEXT NOT NULL CHECK(verification_status IN (
        'Verified',
        'Pending Verification',
        'Closing Soon',
        'Expired',
        'Closed',
        'Source Unavailable'
      )) DEFAULT 'Pending Verification',
      last_verified_at TEXT,
      next_verification_at TEXT,
      verification_notes TEXT NOT NULL DEFAULT '',
      verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      is_demo INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS verification_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opportunity_id INTEGER NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
      admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      previous_status TEXT NOT NULL,
      new_status TEXT NOT NULL,
      source_checked_url TEXT NOT NULL,
      ghana_confirmed INTEGER NOT NULL DEFAULT 1,
      notes TEXT NOT NULL DEFAULT '',
      checked_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS saved_opportunities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      opportunity_id INTEGER NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, opportunity_id)
    );

    CREATE TABLE IF NOT EXISTS recently_viewed (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      opportunity_id INTEGER NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
      viewed_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, opportunity_id)
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      doc_type TEXT NOT NULL CHECK(doc_type IN ('cv', 'cover_letter', 'motivation_letter', 'personal_statement', 'other')),
      current_version_id INTEGER,
      review_status TEXT NOT NULL CHECK(review_status IN (
        'Submitted',
        'Awaiting Assignment',
        'Assigned',
        'Under Review',
        'Changes Suggested',
        'Awaiting Applicant Approval',
        'Approved',
        'Completed'
      )) DEFAULT 'Submitted',
      ai_consent_granted INTEGER NOT NULL DEFAULT 0,
      retention_expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS document_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      version_number INTEGER NOT NULL,
      original_filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      storage_key TEXT NOT NULL,
      extracted_text TEXT NOT NULL DEFAULT '',
      uploaded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS editor_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      editor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      due_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      assigned_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS document_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      assignment_id INTEGER NOT NULL REFERENCES editor_assignments(id) ON DELETE CASCADE,
      editor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      base_version_id INTEGER NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
      revised_text TEXT NOT NULL DEFAULT '',
      annotations_json TEXT NOT NULL DEFAULT '[]',
      ai_suggestions_json TEXT NOT NULL DEFAULT '[]',
      editor_summary TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Under Review',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link_path TEXT NOT NULL DEFAULT '/dashboard',
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS opportunity_reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opportunity_id INTEGER NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
      reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      reason TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL CHECK(status IN ('open', 'resolved', 'dismissed')) DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function isoDateOffset(days: number): string {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

/**
 * Automatically expires active listings whose deadline has passed,
 * removes them from active views, updates Closing Soon within 7 days,
 * and sends one-time expiry notifications to applicants who saved them.
 */
export function runDeadlineExpirySweep(): { expiredCount: number } {
  const today = new Date().toISOString().slice(0, 10);
  const soonDate = isoDateOffset(7);

  const newlyExpired = db
    .prepare(
      `SELECT id, title, deadline, verification_status
       FROM opportunities
       WHERE deadline < ? AND verification_status IN ('Verified', 'Closing Soon')`
    )
    .all(today) as Array<{ id: number; title: string; deadline: string; verification_status: string }>;

  if (newlyExpired.length > 0) {
    const updateStmt = db.prepare(
      `UPDATE opportunities SET verification_status = 'Expired' WHERE id = ?`
    );
    const logStmt = db.prepare(
      `INSERT INTO verification_logs (opportunity_id, admin_id, previous_status, new_status, source_checked_url, ghana_confirmed, notes)
       VALUES (?, NULL, ?, 'Expired', 'system://deadline-check', 1, ?)`
    );
    const savedUsersStmt = db.prepare(
      `SELECT user_id FROM saved_opportunities WHERE opportunity_id = ?`
    );
    const notifyStmt = db.prepare(
      `INSERT INTO notifications (user_id, type, title, message, link_path)
       VALUES (?, 'opportunity_expired', ?, ?, ?)`
    );

    for (const opp of newlyExpired) {
      updateStmt.run(opp.id);
      logStmt.run(
        opp.id,
        opp.verification_status,
        `Automatically marked Expired after deadline (${opp.deadline}) passed.`
      );
      const savers = savedUsersStmt.all(opp.id) as Array<{ user_id: number }>;
      for (const saver of savers) {
        notifyStmt.run(
          saver.user_id,
          'Saved internship expired',
          `"${opp.title}" reached its deadline (${opp.deadline}) and has left the active registry.`,
          `/internships/${opp.id}`
        );
      }
    }
  }

  // Mark Verified listings with deadline within next 7 days as Closing Soon
  db.prepare(
    `UPDATE opportunities
     SET verification_status = 'Closing Soon'
     WHERE deadline >= ? AND deadline <= ? AND verification_status = 'Verified'`
  ).run(today, soonDate);

  return { expiredCount: newlyExpired.length };
}

export function seedDatabase(): void {
  ensurePrivateStorageDir();
  initSchema();

  const existingRegions = db.prepare('SELECT COUNT(*) as c FROM regions').get() as { c: number };
  if (existingRegions.c === 0) {
    const ghanaRegions = [
      { name: 'Greater Accra', slug: 'greater-accra', capital: 'Accra', multi: 0 },
      { name: 'Ashanti', slug: 'ashanti', capital: 'Kumasi', multi: 0 },
      { name: 'Western', slug: 'western', capital: 'Sekondi-Takoradi', multi: 0 },
      { name: 'Western North', slug: 'western-north', capital: 'Sefwi Wiawso', multi: 0 },
      { name: 'Central', slug: 'central', capital: 'Cape Coast', multi: 0 },
      { name: 'Eastern', slug: 'eastern', capital: 'Koforidua', multi: 0 },
      { name: 'Volta', slug: 'volta', capital: 'Ho', multi: 0 },
      { name: 'Oti', slug: 'oti', capital: 'Dambai', multi: 0 },
      { name: 'Northern', slug: 'northern', capital: 'Tamale', multi: 0 },
      { name: 'Savannah', slug: 'savannah', capital: 'Damongo', multi: 0 },
      { name: 'North East', slug: 'north-east', capital: 'Nalerigu', multi: 0 },
      { name: 'Upper East', slug: 'upper-east', capital: 'Bolgatanga', multi: 0 },
      { name: 'Upper West', slug: 'upper-west', capital: 'Wa', multi: 0 },
      { name: 'Bono', slug: 'bono', capital: 'Sunyani', multi: 0 },
      { name: 'Bono East', slug: 'bono-east', capital: 'Techiman', multi: 0 },
      { name: 'Ahafo', slug: 'ahafo', capital: 'Goaso', multi: 0 },
      { name: 'Multi-Region (Across Ghana)', slug: 'multi-region', capital: 'Multiple Ghanaian Cities', multi: 1 },
    ];
    const insertRegion = db.prepare(
      'INSERT INTO regions (name, slug, capital, is_multi_region) VALUES (?, ?, ?, ?)'
    );
    for (const r of ghanaRegions) {
      insertRegion.run(r.name, r.slug, r.capital, r.multi);
    }
  }

  const existingCats = db.prepare('SELECT COUNT(*) as c FROM opportunity_categories').get() as { c: number };
  if (existingCats.c === 0) {
    const categories = [
      'Technology and IT',
      'Software Development',
      'Engineering',
      'Business and Administration',
      'Finance and Accounting',
      'Banking',
      'Marketing and Communications',
      'Media and Journalism',
      'Law',
      'Healthcare and Public Health',
      'Education',
      'Agriculture',
      'Environmental Science',
      'Research',
      'Human Resources',
      'Social Work and Community Development',
      'Hospitality and Tourism',
      'Government and Public Administration',
      'NGO and Nonprofit',
      'Entrepreneurship',
    ];
    const insertCat = db.prepare(
      'INSERT INTO opportunity_categories (name, slug) VALUES (?, ?)'
    );
    for (const name of categories) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      insertCat.run(name, slug);
    }
  }

  // Seed non-admin demo accounts (applicant & editor) if empty
  const existingUsers = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
  let demoApplicantId: number;
  let demoEditorId: number;

  if (existingUsers.c === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (email, password_hash, full_name, role, is_minor, guardian_consent_confirmed, privacy_consent_at, is_demo)
      VALUES (?, ?, ?, ?, 0, 0, datetime('now'), 1)
    `);
    const appRes = insertUser.run(
      'applicant.demo@meridian-gh.example',
      hashPassword(crypto.randomBytes(16).toString('hex')),
      'Kwame Mensah (Demo Applicant)',
      'applicant'
    );
    demoApplicantId = Number(appRes.lastInsertRowid);

    db.prepare(`
      INSERT INTO applicant_profiles (user_id, education_level, institution, graduation_year, preferred_regions, preferred_categories, skills, bio)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      demoApplicantId,
      'BSc Computer Science (Level 300)',
      'Kwame Nkrumah University of Science and Technology (Demo Profile)',
      '2027',
      JSON.stringify(['Greater Accra', 'Ashanti']),
      JSON.stringify(['Software Development', 'Technology and IT']),
      JSON.stringify(['TypeScript', 'React', 'SQL', 'Technical Writing']),
      'Demonstration student profile exploring verified Ghana-based software and data internships.'
    );

    const edRes = insertUser.run(
      'editor.demo@meridian-gh.example',
      hashPassword(crypto.randomBytes(16).toString('hex')),
      'Abena Boateng (Demo Editor)',
      'editor'
    );
    demoEditorId = Number(edRes.lastInsertRowid);
  } else {
    const appRow = db.prepare("SELECT id FROM users WHERE role = 'applicant' LIMIT 1").get() as { id: number } | undefined;
    const edRow = db.prepare("SELECT id FROM users WHERE role = 'editor' LIMIT 1").get() as { id: number } | undefined;
    demoApplicantId = appRow?.id ?? 1;
    demoEditorId = edRow?.id ?? 2;
  }

  // Seed clearly labelled Demo Organizations & Ghana-Only Opportunities
  const existingOpps = db.prepare('SELECT COUNT(*) as c FROM opportunities').get() as { c: number };
  if (existingOpps.c === 0) {
    const getRegionId = (name: string) =>
      (db.prepare('SELECT id FROM regions WHERE name = ?').get(name) as { id: number }).id;
    const getCatId = (name: string) =>
      (db.prepare('SELECT id FROM opportunity_categories WHERE name = ?').get(name) as { id: number }).id;

    const insertOrg = db.prepare(`
      INSERT INTO organizations (name, description, sector, ghana_presence_confirmed, website_url, primary_region_id, is_demo)
      VALUES (?, ?, ?, 1, ?, ?, 1)
    `);

    const orgTechId = Number(
      insertOrg.run(
        '[DEMO] Accra Civic Tech Foundry',
        'Demonstration Ghanaian software engineering and digital public-services training studio based in Osu, Accra.',
        'Software Development',
        'https://example.org/meridian-demo/accra-civic-tech',
        getRegionId('Greater Accra')
      ).lastInsertRowid
    );
    const orgFinId = Number(
      insertOrg.run(
        '[DEMO] Kumasi Enterprise Finance Lab',
        'Demonstration SME advisory and accounting practice supporting young businesses in the Ashanti Region.',
        'Finance and Accounting',
        'https://example.org/meridian-demo/kumasi-finance-lab',
        getRegionId('Ashanti')
      ).lastInsertRowid
    );
    const orgHealthId = Number(
      insertOrg.run(
        '[DEMO] Cape Coast Community Health Partners',
        'Demonstration public health outreach and maternal wellness initiative operating across Central Region clinics.',
        'Healthcare and Public Health',
        'https://example.org/meridian-demo/cape-coast-health',
        getRegionId('Central')
      ).lastInsertRowid
    );
    const orgEngId = Number(
      insertOrg.run(
        '[DEMO] Sekondi-Takoradi Renewable Systems',
        'Demonstration solar microgrid and coastal engineering group based in Western Region.',
        'Engineering',
        'https://example.org/meridian-demo/takoradi-renewables',
        getRegionId('Western')
      ).lastInsertRowid
    );
    const orgAgriId = Number(
      insertOrg.run(
        '[DEMO] Northern Savanna Agri-Data Cooperative',
        'Demonstration agricultural extension and crop-yield analytics team serving smallholder cooperatives in Tamale.',
        'Agriculture',
        'https://example.org/meridian-demo/tamale-agri-data',
        getRegionId('Northern')
      ).lastInsertRowid
    );
    const orgMediaId = Number(
      insertOrg.run(
        '[DEMO] Volta Digital Media & Communications Studio',
        'Demonstration regional journalism, radio production, and digital storytelling studio operating in Ho.',
        'Media and Journalism',
        'https://example.org/meridian-demo/ho-media-studio',
        getRegionId('Volta')
      ).lastInsertRowid
    );
    const orgBonoId = Number(
      insertOrg.run(
        '[DEMO] Bono Forestry & Climate Field Unit',
        'Demonstration environmental monitoring team in Sunyani tracking regional reforestation plots.',
        'Environmental Science',
        'https://example.org/meridian-demo/bono-forestry',
        getRegionId('Bono')
      ).lastInsertRowid
    );

    const insertOpp = db.prepare(`
      INSERT INTO opportunities (
        title, organization_id, category_id, region_id, city_district, location_summary,
        work_arrangement, ghana_eligibility_confirmed, ghana_eligibility_evidence,
        description, responsibilities, qualifications, eligibility_requirements,
        required_skills, required_documents, opening_date, deadline, duration, compensation,
        official_apply_url, source_url, verification_status, last_verified_at, verification_notes, is_demo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const opp1Id = Number(
      insertOpp.run(
        '[DEMO] Junior Software Engineering Intern (Accra)',
        orgTechId,
        getCatId('Software Development'),
        getRegionId('Greater Accra'),
        'Accra (Osu)',
        'Osu, Accra — Greater Accra Region',
        'Hybrid',
        'Physical hub located in Osu, Accra; hybrid participation restricted to applicants residing in Ghana.',
        'Join a 12-week structured demonstration internship building accessible web tools for Ghanaian youth services alongside senior engineers.',
        '• Build and test accessible React & TypeScript interface modules\n• Assist with API integration and automated test coverage\n• Participate in weekly Accra studio code reviews',
        'Currently enrolled in or recent graduate of a Ghanaian university, technical university, or coding programme in Computer Science or related field.',
        'Must reside in Ghana for the duration of the internship; available 3 days/week on-site in Accra and 2 days remote.',
        'JavaScript/TypeScript, React fundamentals, Git version control, clear written communication',
        'CV (max 2 pages), Motivation Letter, Academic Transcript (optional)',
        isoDateOffset(-14),
        isoDateOffset(24),
        '12 weeks',
        'GHS 1,800 / month stipend (Demo figure)',
        'https://example.org/meridian-demo-apply/accra-software-intern',
        'https://example.org/meridian-demo-source/accra-civic-tech-2026',
        'Verified',
        isoDateOffset(-2),
        'Checked demo source URL and confirmed Greater Accra hybrid arrangement for Ghana residents.',
      ).lastInsertRowid
    );

    const opp2Id = Number(
      insertOpp.run(
        '[DEMO] Finance & SME Advisory Intern (Kumasi)',
        orgFinId,
        getCatId('Finance and Accounting'),
        getRegionId('Ashanti'),
        'Kumasi (Adum)',
        'Adum, Kumasi — Ashanti Region',
        'On-site',
        'On-site placement at Adum office in Kumasi, Ashanti Region.',
        'Support bookkeeping reviews, cashflow forecasting, and financial literacy workshops for growth-stage micro-enterprises across Kumasi.',
        '• Prepare monthly ledger reconciliations under supervisor guidance\n• Draft concise financial health summaries for SME founders\n• Support client workshop logistics in Kumasi',
        'Diploma or Bachelor student in Accounting, Finance, Business Administration, or Commerce.',
        'Open to students and National Service alumni able to commute to Adum, Kumasi.',
        'Spreadsheet modeling, basic accounting principles, attention to detail',
        'CV, Cover Letter addressed to Practice Lead',
        isoDateOffset(-20),
        isoDateOffset(4), // Within 7 days -> auto-marked Closing Soon
        '10 weeks',
        'Transport & lunch allowance (Demo)',
        'https://example.org/meridian-demo-apply/kumasi-finance-intern',
        'https://example.org/meridian-demo-source/kumasi-finance-2026',
        'Verified',
        isoDateOffset(-3),
        'Confirmed on-site Kumasi office schedule and deadline.',
      ).lastInsertRowid
    );

    const opp3Id = Number(
      insertOpp.run(
        '[DEMO] Public Health Data & Outreach Intern (Cape Coast)',
        orgHealthId,
        getCatId('Healthcare and Public Health'),
        getRegionId('Central'),
        'Cape Coast',
        'Cape Coast — Central Region',
        'On-site',
        'Field placement across partner health clinics in Cape Coast Metropolitan District.',
        'Assist community health coordinators with anonymized clinic attendance tracking and youth health education materials.',
        '• Organize outreach session schedules with district coordinators\n• Compile weekly anonymized attendance summaries\n• Help prepare plain-language health leaflets',
        'Undergraduate or graduate student in Public Health, Nursing, Biological Sciences, or Social Work.',
        'Resident in Central Region or willing to commute locally to Cape Coast.',
        'Community outreach, basic spreadsheet reporting, respectful communication',
        'CV, Personal Statement, Student/Graduate ID confirmation',
        isoDateOffset(-10),
        isoDateOffset(19),
        '3 months',
        'Not specified',
        'https://example.org/meridian-demo-apply/cape-coast-health-intern',
        'https://example.org/meridian-demo-source/cape-coast-health-2026',
        'Verified',
        isoDateOffset(-1),
        'Verified Cape Coast field placement.',
      ).lastInsertRowid
    );

    const opp4Id = Number(
      insertOpp.run(
        '[DEMO] Solar Microgrid Engineering Trainee (Takoradi)',
        orgEngId,
        getCatId('Engineering'),
        getRegionId('Western'),
        'Sekondi-Takoradi',
        'Sekondi-Takoradi — Western Region',
        'On-site',
        'Engineering workshop and coastal site visits in Sekondi-Takoradi, Western Region.',
        'Gain hands-on exposure to solar PV sizing, battery maintenance diagnostics, and safety documentation.',
        '• Shadow field technicians during routine microgrid inspections\n• Log system voltage and load measurements\n• Update component maintenance checklists',
        'HND or BSc student in Electrical, Mechanical, or Renewable Energy Engineering.',
        'Based in Ghana; safety orientation completed on-site in Takoradi.',
        'Circuit fundamentals, technical documentation, teamwork',
        'CV, Cover Letter',
        isoDateOffset(-7),
        isoDateOffset(30),
        '16 weeks',
        'GHS 1,500 / month + PPE provided (Demo)',
        'https://example.org/meridian-demo-apply/takoradi-solar-intern',
        'https://example.org/meridian-demo-source/takoradi-solar-2026',
        'Verified',
        isoDateOffset(-4),
        'Confirmed Western Region workshop address and engineering supervision.',
      ).lastInsertRowid
    );

    const opp5Id = Number(
      insertOpp.run(
        '[DEMO] Remote Research & Policy Intern (Across Ghana)',
        orgAgriId,
        getCatId('Research'),
        getRegionId('Multi-Region (Across Ghana)'),
        'Tamale / Remote across Ghana',
        'Multi-Region (Remote from anywhere in Ghana)',
        'Remote (Ghana Residents)',
        'Explicitly restricted to applicants residing in Ghana across all 16 regions, with optional in-person check-ins in Tamale.',
        'Conduct desk research and stakeholder interview notes on youth agri-business supply chains across northern and southern Ghana.',
        '• Synthesize agricultural market bulletins from Ghanaian districts\n• Assist with bilingual survey review\n• Present monthly research briefs to cooperative leads',
        'Final-year undergraduate or recent graduate in Economics, Agriculture, Development Studies, or Statistics.',
        'Must be currently resident in Ghana with reliable internet access.',
        'Qualitative & quantitative research, Excel/Sheets, concise report writing',
        'CV, Motivation Letter, Writing Sample (1–2 pages)',
        isoDateOffset(-5),
        isoDateOffset(28),
        'Not specified',
        'GHS 1,200 / month data & research stipend (Demo)',
        'https://example.org/meridian-demo-apply/ghana-remote-research-intern',
        'https://example.org/meridian-demo-source/tamale-agri-research-2026',
        'Verified',
        isoDateOffset(-1),
        'Confirmed remote-within-Ghana eligibility across all 16 regions.',
      ).lastInsertRowid
    );

    // Pending verification listing (to test Admin Verification Queue)
    insertOpp.run(
      '[DEMO] Digital Storytelling & Radio Intern (Ho — Pending Check)',
      orgMediaId,
      getCatId('Media and Journalism'),
      getRegionId('Volta'),
      'Ho',
      'Ho — Volta Region',
      'On-site',
      'Studio located in Ho Municipal District, Volta Region.',
      'Assist local producers with audio editing, youth entrepreneurship features, and social media briefs.',
      '• Edit short community radio segments\n• Draft interview outlines for local guests',
      'Student or graduate in Communication Studies, Journalism, or Media Arts.',
      'Available on-site in Ho, Volta Region.',
      'Audio editing basics, storytelling, interviewing',
      'CV, Cover Letter',
      isoDateOffset(-2),
      isoDateOffset(22),
      '8 weeks',
      'Not specified',
      'https://example.org/meridian-demo-apply/ho-media-intern',
      'https://example.org/meridian-demo-source/ho-media-pending',
      'Pending Verification',
      null,
      'Awaiting administrator review of official application link before publishing.',
    );

    // Expired listing (past deadline -> auto-swept to Expired and removed from active view!)
    const expiredOppId = Number(
      insertOpp.run(
        '[DEMO] Regional Forestry Field Intern (Sunyani — Expired Sample)',
        orgBonoId,
        getCatId('Environmental Science'),
        getRegionId('Bono'),
        'Sunyani',
        'Sunyani — Bono Region',
        'On-site',
        'Forestry field station in Sunyani, Bono Region.',
        'Demonstration expired listing showing how past-deadline opportunities automatically leave active discovery feeds.',
        '• Assist field botanists with seedling survival counts\n• Record GPS plot notes',
        'Undergraduate in Forestry, Natural Resources, or Environmental Science.',
        'Available in Bono Region.',
        'Field data logging, teamwork',
        'CV, Cover Letter',
        isoDateOffset(-45),
        isoDateOffset(-10), // 10 days ago!
        '8 weeks',
        'Not specified',
        'https://example.org/meridian-demo-apply/bono-forestry-expired',
        'https://example.org/meridian-demo-source/bono-forestry-expired',
        'Verified',
        isoDateOffset(-35),
        'Initially verified; deadline has now passed.',
      ).lastInsertRowid
    );

    // Save opp1 & expiredOpp for Demo Applicant so they see saved items + expiry notification
    db.prepare('INSERT OR IGNORE INTO saved_opportunities (user_id, opportunity_id) VALUES (?, ?)').run(
      demoApplicantId,
      opp1Id
    );
    db.prepare('INSERT OR IGNORE INTO saved_opportunities (user_id, opportunity_id) VALUES (?, ?)').run(
      demoApplicantId,
      expiredOppId
    );
    db.prepare('INSERT OR IGNORE INTO saved_opportunities (user_id, opportunity_id) VALUES (?, ?)').run(
      demoApplicantId,
      opp2Id
    );

    // Seed verification logs for verified items
    const logStmt = db.prepare(`
      INSERT INTO verification_logs (opportunity_id, admin_id, previous_status, new_status, source_checked_url, ghana_confirmed, notes)
      VALUES (?, NULL, 'Pending Verification', 'Verified', ?, 1, ?)
    `);
    logStmt.run(opp1Id, 'https://example.org/meridian-demo-source/accra-civic-tech-2026', 'Initial demo verification in Greater Accra.');
    logStmt.run(opp2Id, 'https://example.org/meridian-demo-source/kumasi-finance-2026', 'Initial demo verification in Ashanti.');
    logStmt.run(opp3Id, 'https://example.org/meridian-demo-source/cape-coast-health-2026', 'Initial demo verification in Central.');
    logStmt.run(opp4Id, 'https://example.org/meridian-demo-source/takoradi-solar-2026', 'Initial demo verification in Western.');
    logStmt.run(opp5Id, 'https://example.org/meridian-demo-source/tamale-agri-research-2026', 'Initial demo verification for Remote within Ghana.');

    // Seed 1 realistic non-sensitive demo CV document + active review assignment for Demo Applicant & Demo Editor
    const existingDocs = db.prepare('SELECT COUNT(*) as c FROM documents').get() as { c: number };
    if (existingDocs.c === 0) {
      const sampleCvText = [
        'KWAME MENSAH (DEMO APPLICANT)',
        'Kumasi / Accra, Ghana | kwame.mensah.demo@example.org',
        '',
        'OBJECTIVE',
        'Computer science student seeking a software engineering internship in Ghana to apply web development skills.',
        '',
        'EDUCATION',
        'BSc Computer Science (Expected 2027) — Demonstration University, Kumasi, Ghana',
        'Relevant Coursework: Data Structures, Database Systems, Web Engineering',
        '',
        'PROJECTS',
        'Campus Hostel Maintenance Tracker (2025)',
        '- Built a web form and tracking list using React and SQLite.',
        '- Helped students report plumbing and electrical issues faster.',
        '',
        'SKILLS',
        'TypeScript, React, HTML/CSS, SQL, Git',
      ].join('\n');

      // Create a minimal valid PDF buffer on private disk so download & preview work for the demo document too
      const demoStorageKey = `demo-${crypto.randomUUID()}.pdf`;
      const demoPdfContent = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 98 >> stream
BT /F1 12 Tf 72 720 Td (Meridian Demo CV - Kwame Mensah - Greater Accra / Ashanti, Ghana) Tj ET
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000241 00000 n 
0000000389 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
457
%%EOF`;
      const demoBuf = Buffer.from(demoPdfContent, 'utf8');
      fs.writeFileSync(resolvePrivateStoragePath(demoStorageKey), demoBuf);

      const docRes = db
        .prepare(
          `INSERT INTO documents (owner_id, title, doc_type, review_status, ai_consent_granted, retention_expires_at)
           VALUES (?, ?, 'cv', 'Changes Suggested', 0, ?)`
        )
        .run(demoApplicantId, '[DEMO] Graduate Software Internship CV', isoDateOffset(90));
      const docId = Number(docRes.lastInsertRowid);

      const verRes = db
        .prepare(
          `INSERT INTO document_versions (document_id, version_number, original_filename, mime_type, file_size, storage_key, extracted_text, uploaded_by)
           VALUES (?, 1, 'kwame_mensah_demo_cv.pdf', 'application/pdf', ?, ?, ?, ?)`
        )
        .run(docId, demoBuf.length, demoStorageKey, sampleCvText, demoApplicantId);
      const verId = Number(verRes.lastInsertRowid);

      db.prepare('UPDATE documents SET current_version_id = ? WHERE id = ?').run(verId, docId);

      const assignRes = db
        .prepare(
          `INSERT INTO editor_assignments (document_id, editor_id, assigned_by, due_at, is_active)
           VALUES (?, ?, NULL, ?, 1)`
        )
        .run(docId, demoEditorId, isoDateOffset(3));
      const assignId = Number(assignRes.lastInsertRowid);

      const sampleAnnotations = [
        {
          id: 'ann-1',
          color: 'red',
          label: 'Error Requiring Correction',
          section: 'Contact Information',
          excerpt: 'kwame.mensah.demo@example.org',
          comment: 'Add a phone contact or LinkedIn/GitHub link (without sensitive national ID numbers) so Ghanaian recruiters can reach you.',
          status: 'open',
        },
        {
          id: 'ann-2',
          color: 'yellow',
          label: 'Suggested Improvement',
          section: 'Projects',
          excerpt: 'Helped students report plumbing and electrical issues faster.',
          comment: 'Quantify the impact if known (e.g., how many student reports or modules you built) without exaggerating.',
          status: 'open',
        },
        {
          id: 'ann-3',
          color: 'green',
          label: 'Accepted Correction',
          section: 'Education',
          excerpt: 'BSc Computer Science (Expected 2027)',
          comment: 'Clear graduation timeline and relevant coursework listed.',
          status: 'accepted',
        },
        {
          id: 'ann-4',
          color: 'blue',
          label: 'Editor Comment',
          section: 'Overall Structure',
          excerpt: 'OBJECTIVE',
          comment: 'Consider renaming "OBJECTIVE" to "PROFESSIONAL SUMMARY" and tailoring one sentence to the Accra hybrid software internship.',
          status: 'open',
        },
      ];

      const revisedDraft = sampleCvText
        .replace('OBJECTIVE', 'PROFESSIONAL SUMMARY')
        .replace(
          'Computer science student seeking a software engineering internship in Ghana to apply web development skills.',
          'Level 300 Computer Science student in Ghana with hands-on React, TypeScript, and SQLite project experience, seeking a Software Engineering Internship in Greater Accra or Ashanti.'
        );

      db.prepare(
        `INSERT INTO document_reviews (document_id, assignment_id, editor_id, base_version_id, revised_text, annotations_json, editor_summary, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Changes Suggested')`
      ).run(
        docId,
        assignId,
        demoEditorId,
        verId,
        revisedDraft,
        JSON.stringify(sampleAnnotations),
        'Strong foundational technical projects. Please review the suggested summary phrasing and add a portfolio/GitHub URL.'
      );

      db.prepare(
        `INSERT INTO notifications (user_id, type, title, message, link_path)
         VALUES (?, 'review_changes', ?, ?, ?)`
      ).run(
        demoApplicantId,
        'Editor suggested improvements on your CV',
        'Abena Boateng (Demo Editor) reviewed "[DEMO] Graduate Software Internship CV" and left 4 notes.',
        `/reviews/${docId}`
      );
    }

    // Seed platform announcement
    const existingAnn = db.prepare('SELECT COUNT(*) as c FROM announcements').get() as { c: number };
    if (existingAnn.c === 0) {
      db.prepare(
        `INSERT INTO announcements (title, body, is_active)
         VALUES (?, ?, 1)`
      ).run(
        'Demonstration Registry Notice',
        'Listings marked [DEMO] illustrate verified Ghana-only opportunities across the 16 regions. Administrators verify source URLs and Ghana eligibility before any listing appears as Verified.'
      );
    }
  }

  // Run deadline sweep immediately so the expired demo listing leaves the active view right away
  runDeadlineExpirySweep();
}
