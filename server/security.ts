import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const PRIVATE_DOCS_DIR = path.resolve(process.cwd(), 'storage', 'private_docs');

export function ensurePrivateStorageDir(): void {
  if (!fs.existsSync(PRIVATE_DOCS_DIR)) {
    fs.mkdirSync(PRIVATE_DOCS_DIR, { recursive: true });
  }
}

const EPHEMERAL_SIGNING_KEY = crypto.randomBytes(32).toString('hex');

function getSigningSecret(): string {
  return process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16
    ? process.env.SESSION_SECRET.trim()
    : EPHEMERAL_SIGNING_KEY;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function generateSessionToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(32).toString('hex');
  return { rawToken, tokenHash: hashToken(rawToken) };
}

export function createSignedDownloadToken(versionId: number, userId: number, ttlSeconds = 90): string {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${versionId}.${userId}.${expiresAt}`;
  const sig = crypto.createHmac('sha256', getSigningSecret()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifySignedDownloadToken(
  token: string
): { versionId: number; userId: number } | null {
  const parts = token.split('.');
  if (parts.length !== 4) return null;
  const [versionStr, userStr, expStr, providedSig] = parts;
  const versionId = Number(versionStr);
  const userId = Number(userStr);
  const expiresAt = Number(expStr);
  if (!Number.isInteger(versionId) || !Number.isInteger(userId) || !Number.isInteger(expiresAt)) {
    return null;
  }
  if (Math.floor(Date.now() / 1000) > expiresAt) {
    return null;
  }
  const payload = `${versionStr}.${userStr}.${expStr}`;
  const expectedSig = crypto.createHmac('sha256', getSigningSecret()).update(payload).digest('hex');
  const a = Buffer.from(providedSig, 'hex');
  const b = Buffer.from(expectedSig, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }
  return { versionId, userId };
}

export function isSafeHttpUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateUploadedDocument(
  originalName: string,
  mimeType: string,
  buffer: Buffer
): { valid: true; normalizedExt: '.pdf' | '.docx'; normalizedMime: string } | { valid: false; error: string } {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'Uploaded file is empty.' };
  }
  if (buffer.length > MAX_DOCUMENT_BYTES) {
    return { valid: false, error: 'File exceeds the 5 MB size limit.' };
  }

  const ext = path.extname(originalName).toLowerCase();
  const isPdfMagic = buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  const isZipMagic =
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07);

  if (ext === '.pdf') {
    if (!isPdfMagic) {
      return { valid: false, error: 'File does not match a valid PDF signature.' };
    }
    if (mimeType && !['application/pdf', 'application/x-pdf', 'application/octet-stream'].includes(mimeType)) {
      return { valid: false, error: 'Invalid MIME type for PDF document.' };
    }
    return { valid: true, normalizedExt: '.pdf', normalizedMime: 'application/pdf' };
  }

  if (ext === '.docx') {
    if (!isZipMagic) {
      return { valid: false, error: 'File does not match a valid DOCX archive signature.' };
    }
    const allowedDocxMimes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/octet-stream',
      'application/zip',
    ];
    if (mimeType && !allowedDocxMimes.includes(mimeType)) {
      return { valid: false, error: 'Invalid MIME type for DOCX document.' };
    }
    return {
      valid: true,
      normalizedExt: '.docx',
      normalizedMime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
  }

  return { valid: false, error: 'Only PDF (.pdf) and Word (.docx) files are accepted.' };
}

export function resolvePrivateStoragePath(storageKey: string): string {
  ensurePrivateStorageDir();
  const safeBase = path.basename(storageKey);
  const resolved = path.resolve(PRIVATE_DOCS_DIR, safeBase);
  if (!resolved.startsWith(PRIVATE_DOCS_DIR + path.sep)) {
    throw new Error('Invalid storage path.');
  }
  return resolved;
}
