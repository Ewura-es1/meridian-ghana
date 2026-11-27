import fs from 'node:fs';
import { Router } from 'express';
import { db } from '../db.ts';
import { isAiConfigured } from '../ai.ts';
import { AuthenticatedRequest, recordAudit, requireAuth } from '../middleware.ts';
import {
  generateSessionToken,
  hashPassword,
  resolvePrivateStoragePath,
  verifyPassword,
} from '../security.ts';

export const authRouter = Router();

function createUserSession(userId: number): string {
  const { rawToken, tokenHash } = generateSessionToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(
    tokenHash,
    userId,
    expiresAt
  );
  return rawToken;
}

authRouter.get('/status', (_req, res) => {
  const adminRow = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get() as {
    c: number;
  };
  const envPasscodeSet = Boolean(process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim().length > 0);
  res.json({
    hasAdmin: adminRow.c > 0,
    envAdminPasscodeSet: envPasscodeSet,
    aiConfigured: isAiConfigured(),
  });
});

authRouter.post('/register', (req, res) => {
  const {
    email,
    password,
    fullName,
    isMinor,
    guardianConsentConfirmed,
    privacyConsentAccepted,
  } = req.body ?? {};

  const normalizedEmail = String(email || '').trim().toLowerCase();
  const cleanName = String(fullName || '').trim();
  const rawPassword = String(password || '');

  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    res.status(400).json({ error: 'Please provide a valid email address.' });
    return;
  }
  if (cleanName.length < 2 || cleanName.length > 100) {
    res.status(400).json({ error: 'Please enter your full name (2–100 characters).' });
    return;
  }
  if (rawPassword.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    return;
  }
  if (!privacyConsentAccepted) {
    res.status(400).json({
      error: 'Please review and accept the privacy and data handling notice before creating an account.',
    });
    return;
  }
  if (isMinor && !guardianConsentConfirmed) {
    res.status(400).json({
      error: 'Applicants under 18 must confirm parent or guardian awareness before registering.',
    });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const pwHash = hashPassword(rawPassword);
  const result = db
    .prepare(
      `INSERT INTO users (email, password_hash, full_name, role, is_minor, guardian_consent_confirmed, privacy_consent_at, is_demo)
       VALUES (?, ?, ?, 'applicant', ?, ?, datetime('now'), 0)`
    )
    .run(normalizedEmail, pwHash, cleanName, isMinor ? 1 : 0, guardianConsentConfirmed ? 1 : 0);

  const userId = Number(result.lastInsertRowid);
  db.prepare('INSERT INTO applicant_profiles (user_id) VALUES (?)').run(userId);
  db.prepare(
    `INSERT INTO notifications (user_id, type, title, message, link_path)
     VALUES (?, 'welcome', 'Welcome to Meridian Youth Internship Registry', 'Complete your Ghana region and industry preferences to receive relevant internship recommendations.', '/dashboard')`
  ).run(userId);

  const token = createUserSession(userId);
  recordAudit(userId, 'user_registered', 'user', userId, { role: 'applicant', isMinor: Boolean(isMinor) });

  res.status(201).json({
    token,
    user: {
      id: userId,
      email: normalizedEmail,
      full_name: cleanName,
      role: 'applicant',
      is_minor: isMinor ? 1 : 0,
      is_demo: 0,
    },
  });
});

authRouter.post('/login', (req, res) => {
  const { email, password } = req.body ?? {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const rawPassword = String(password || '');

  if (!normalizedEmail || !rawPassword) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const user = db
    .prepare('SELECT id, email, password_hash, full_name, role, is_minor, is_demo, status FROM users WHERE email = ?')
    .get(normalizedEmail) as
    | {
        id: number;
        email: string;
        password_hash: string;
        full_name: string;
        role: 'applicant' | 'editor' | 'admin';
        is_minor: number;
        is_demo: number;
        status: 'active' | 'suspended';
      }
    | undefined;

  if (!user || !verifyPassword(rawPassword, user.password_hash)) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  if (user.status !== 'active') {
    res.status(403).json({ error: 'This account is currently suspended. Please contact support.' });
    return;
  }

  const token = createUserSession(user.id);
  recordAudit(user.id, 'user_login', 'user', user.id, { role: user.role });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_minor: user.is_minor,
      is_demo: user.is_demo,
    },
  });
});

authRouter.post('/demo-login', (req, res) => {
  const { role } = req.body ?? {};
  if (role !== 'applicant' && role !== 'editor') {
    res.status(400).json({ error: 'Demo quick login is available only for Demo Applicant or Demo Editor.' });
    return;
  }

  const user = db
    .prepare(
      'SELECT id, email, full_name, role, is_minor, is_demo, status FROM users WHERE role = ? AND is_demo = 1 LIMIT 1'
    )
    .get(role) as
    | {
        id: number;
        email: string;
        full_name: string;
        role: 'applicant' | 'editor';
        is_minor: number;
        is_demo: number;
        status: string;
      }
    | undefined;

  if (!user || user.status !== 'active') {
    res.status(404).json({ error: 'Demo account is unavailable.' });
    return;
  }

  const token = createUserSession(user.id);
  recordAudit(user.id, 'demo_login', 'user', user.id, { role: user.role });

  res.json({ token, user });
});

authRouter.post('/admin-claim', (req, res) => {
  const { email, password, fullName, passcode } = req.body ?? {};
  const envPasscode = process.env.ADMIN_PASSCODE?.trim();
  const adminCount = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get() as { c: number }).c;

  if (envPasscode) {
    if (String(passcode || '') !== envPasscode) {
      res.status(403).json({ error: 'Invalid administrator passcode.' });
      return;
    }
  } else if (adminCount > 0) {
    res.status(403).json({
      error: 'An administrator account has already been claimed. Please sign in with your administrator email and password.',
    });
    return;
  }

  const normalizedEmail = String(email || '').trim().toLowerCase();
  const cleanName = String(fullName || 'Registry Administrator').trim();
  const rawPassword = String(password || '');

  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    res.status(400).json({ error: 'Please provide a valid administrator email address.' });
    return;
  }
  if (rawPassword.length < 8) {
    res.status(400).json({ error: 'Administrator password must be at least 8 characters long.' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail) as { id: number } | undefined;
  const pwHash = hashPassword(rawPassword);

  let userId: number;
  if (existing && envPasscode) {
    db.prepare("UPDATE users SET password_hash = ?, role = 'admin', full_name = ?, status = 'active' WHERE id = ?").run(
      pwHash,
      cleanName,
      existing.id
    );
    userId = existing.id;
  } else if (existing) {
    res.status(409).json({ error: 'That email is already registered. Use a distinct administrator email.' });
    return;
  } else {
    const inserted = db
      .prepare(
        `INSERT INTO users (email, password_hash, full_name, role, privacy_consent_at, is_demo)
         VALUES (?, ?, ?, 'admin', datetime('now'), 0)`
      )
      .run(normalizedEmail, pwHash, cleanName);
    userId = Number(inserted.lastInsertRowid);
  }

  const token = createUserSession(userId);
  recordAudit(userId, 'admin_claimed', 'user', userId, { viaEnvPasscode: Boolean(envPasscode) });

  res.status(201).json({
    token,
    user: {
      id: userId,
      email: normalizedEmail,
      full_name: cleanName,
      role: 'admin',
      is_minor: 0,
      is_demo: 0,
    },
  });
});

authRouter.post('/logout', requireAuth, (req: AuthenticatedRequest, res) => {
  if (req.sessionTokenHash) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(req.sessionTokenHash);
  }
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const profile = db
    .prepare('SELECT * FROM applicant_profiles WHERE user_id = ?')
    .get(userId) as
    | {
        user_id: number;
        education_level: string;
        institution: string;
        graduation_year: string;
        preferred_regions: string;
        preferred_categories: string;
        skills: string;
        bio: string;
        notify_deadlines: number;
        notify_reviews: number;
      }
    | undefined;

  const unreadCount = (
    db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0').get(userId) as {
      c: number;
    }
  ).c;

  res.json({
    user: req.user,
    profile: profile
      ? {
          education_level: profile.education_level,
          institution: profile.institution,
          graduation_year: profile.graduation_year,
          preferred_regions: JSON.parse(profile.preferred_regions || '[]'),
          preferred_categories: JSON.parse(profile.preferred_categories || '[]'),
          skills: JSON.parse(profile.skills || '[]'),
          bio: profile.bio,
          notify_deadlines: Boolean(profile.notify_deadlines),
          notify_reviews: Boolean(profile.notify_reviews),
        }
      : null,
    unreadNotifications: unreadCount,
  });
});

authRouter.put('/profile', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const {
    fullName,
    educationLevel,
    institution,
    graduationYear,
    preferredRegions,
    preferredCategories,
    skills,
    bio,
    notifyDeadlines,
    notifyReviews,
  } = req.body ?? {};

  if (typeof fullName === 'string' && fullName.trim().length >= 2) {
    db.prepare('UPDATE users SET full_name = ? WHERE id = ?').run(fullName.trim().slice(0, 100), userId);
  }

  const regionsArr = Array.isArray(preferredRegions) ? preferredRegions.map(String).slice(0, 17) : [];
  const catsArr = Array.isArray(preferredCategories) ? preferredCategories.map(String).slice(0, 25) : [];
  const skillsArr = Array.isArray(skills) ? skills.map(String).slice(0, 30) : [];

  db.prepare(
    `INSERT INTO applicant_profiles (
       user_id, education_level, institution, graduation_year,
       preferred_regions, preferred_categories, skills, bio,
       notify_deadlines, notify_reviews, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       education_level = excluded.education_level,
       institution = excluded.institution,
       graduation_year = excluded.graduation_year,
       preferred_regions = excluded.preferred_regions,
       preferred_categories = excluded.preferred_categories,
       skills = excluded.skills,
       bio = excluded.bio,
       notify_deadlines = excluded.notify_deadlines,
       notify_reviews = excluded.notify_reviews,
       updated_at = datetime('now')`
  ).run(
    userId,
    String(educationLevel || '').slice(0, 120),
    String(institution || '').slice(0, 150),
    String(graduationYear || '').slice(0, 12),
    JSON.stringify(regionsArr),
    JSON.stringify(catsArr),
    JSON.stringify(skillsArr),
    String(bio || '').slice(0, 600),
    notifyDeadlines === false ? 0 : 1,
    notifyReviews === false ? 0 : 1
  );

  recordAudit(userId, 'profile_updated', 'user', userId);
  res.json({ ok: true });
});

authRouter.delete('/account', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  if (req.user!.role === 'admin') {
    const adminCount = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get() as { c: number }).c;
    if (adminCount <= 1) {
      res.status(400).json({ error: 'Cannot delete the only administrator account.' });
      return;
    }
  }

  // Delete all private files owned by this user on disk
  const versions = db
    .prepare(
      `SELECT dv.storage_key FROM document_versions dv
       JOIN documents d ON d.id = dv.document_id
       WHERE d.owner_id = ?`
    )
    .all(userId) as Array<{ storage_key: string }>;

  for (const v of versions) {
    try {
      const p = resolvePrivateStoragePath(v.storage_key);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch {
      // ignore missing files
    }
  }

  recordAudit(null, 'account_deleted', 'user', userId, { selfService: true });
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  res.json({ ok: true });
});
