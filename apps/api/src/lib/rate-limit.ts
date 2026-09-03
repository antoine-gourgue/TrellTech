import type { FastifyRequest } from 'fastify';
import { HttpError } from './errors.js';

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Limiteur de débit en mémoire (fenêtre fixe) par IP et par clé logique.
 * Suffisant pour freiner le bruteforce sur login/register sur une seule instance.
 */
export function createRateLimiter(key: string, limit: number, windowMs: number) {
  const buckets = new Map<string, Bucket>();
  return function guard(request: FastifyRequest): void {
    const now = Date.now();
    const id = `${key}:${request.ip}`;
    const bucket = buckets.get(id);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(id, { count: 1, resetAt: now + windowMs });
      return;
    }
    bucket.count += 1;
    if (bucket.count > limit) {
      throw new HttpError(429, 'RATE_LIMITED', 'Trop de tentatives, réessayez plus tard');
    }
  };
}
