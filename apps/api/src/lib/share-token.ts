import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../env.js';

export type ShareRole = 'EDITOR' | 'VIEWER';
export type ShareTargetType = 'workspace' | 'board' | 'doc' | 'whiteboard';

export interface SharePayload {
  t: ShareTargetType;
  id: string;
  r: ShareRole;
  exp: number;
}

type LegacyPayload = { b: string; r: ShareRole; exp: number };

const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function sign(body: string): string {
  return createHmac('sha256', env.SESSION_SECRET).update(body).digest('base64url');
}

/** Émet un jeton de partage signé (sans stockage) : `<payload>.<hmac>`. */
export function signShareToken(
  type: ShareTargetType,
  id: string,
  role: ShareRole,
  ttlMs = DEFAULT_TTL_MS,
): string {
  const payload: SharePayload = { t: type, id, r: role, exp: Date.now() + ttlMs };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

function isRole(value: unknown): value is ShareRole {
  return value === 'EDITOR' || value === 'VIEWER';
}

function isType(value: unknown): value is ShareTargetType {
  return value === 'workspace' || value === 'board' || value === 'doc' || value === 'whiteboard';
}

function normalize(raw: SharePayload | LegacyPayload): SharePayload | null {
  if ('t' in raw) {
    if (!isType(raw.t) || typeof raw.id !== 'string' || !raw.id || !isRole(raw.r)) return null;
    if (typeof raw.exp !== 'number' || raw.exp < Date.now()) return null;
    return { t: raw.t, id: raw.id, r: raw.r, exp: raw.exp };
  }
  if (typeof raw.b !== 'string' || !raw.b || !isRole(raw.r)) return null;
  if (typeof raw.exp !== 'number' || raw.exp < Date.now()) return null;
  return { t: 'board', id: raw.b, r: raw.r, exp: raw.exp };
}

/** Vérifie un jeton (signature + expiration) et normalise l'ancien format board. */
export function verifyShareToken(token: string): SharePayload | null {
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const raw = JSON.parse(Buffer.from(body, 'base64url').toString()) as SharePayload | LegacyPayload;
    return normalize(raw);
  } catch {
    return null;
  }
}
