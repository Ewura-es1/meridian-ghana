import type { NextFunction, Request, Response } from 'express';
import { db } from './db.ts';
import { hashToken } from './security.ts';

export interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  role: 'applicant' | 'editor' | 'admin';
  is_minor: number;
  is_demo: number;
  status: 'active' | 'suspended';
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  sessionTokenHash?: string;
}

function resolveUserFromRequest(req: Request): { user: AuthUser; tokenHash: string } | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const rawToken = authHeader.slice(7).trim();
  if (!rawToken) return null;

  const tokenHash = hashToken(rawToken);
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.full_name, u.role, u.is_minor, u.is_demo, u.status, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`
    )
    .get(tokenHash) as (AuthUser & { expires_at: string }) | undefined;

  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    return null;
  }
  if (row.status !== 'active') return null;

  return {
    user: {
      id: row.id,
      email: row.email,
      full_name: row.full_name,
      role: row.role,
      is_minor: row.is_minor,
      is_demo: row.is_demo,
      status: row.status,
    },
    tokenHash,
  };
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const found = resolveUserFromRequest(req);
  if (found) {
    req.user = found.user;
    req.sessionTokenHash = found.tokenHash;
  }
  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const found = resolveUserFromRequest(req);
  if (!found) {
    res.status(401).json({ error: 'Authentication required. Please sign in to continue.' });
    return;
  }
  req.user = found.user;
  req.sessionTokenHash = found.tokenHash;
  next();
}

export function requireRole(...allowedRoles: Array<'applicant' | 'editor' | 'admin'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'You do not have permission to perform this action.' });
      return;
    }
    next();
  };
}

export function recordAudit(
  actorId: number | null,
  action: string,
  targetType: string,
  targetId: string | number,
  metadata: Record<string, unknown> = {}
): void {
  try {
    db.prepare(
      `INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata_json)
       VALUES (?, ?, ?, ?, ?)`
    ).run(actorId, action, targetType, String(targetId), JSON.stringify(metadata));
  } catch (err) {
    console.error('Audit logging failed:', err);
  }
}
