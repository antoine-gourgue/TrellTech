import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';

process.env.SESSION_SECRET = 'test_session_secret_at_least_16_chars';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://trelltech:trelltech@localhost:5432/trelltech?schema=public';

const { signShareToken, verifyShareToken } = await import('../src/lib/share-token.js');

describe('share-token', () => {
  it('encode et décode chaque type de cible', () => {
    for (const type of ['workspace', 'board', 'doc', 'whiteboard'] as const) {
      const token = signShareToken(type, `${type}-1`, 'EDITOR');
      const payload = verifyShareToken(token);
      expect(payload).toMatchObject({ t: type, id: `${type}-1`, r: 'EDITOR' });
    }
  });

  it('rejette un jeton falsifié', () => {
    const token = signShareToken('board', 'b1', 'VIEWER');
    const tampered = `${token.slice(0, -2)}xy`;
    expect(verifyShareToken(tampered)).toBeNull();
  });

  it('rejette un jeton expiré', () => {
    const token = signShareToken('doc', 'd1', 'EDITOR', -1000);
    expect(verifyShareToken(token)).toBeNull();
  });

  it('reste compatible avec l’ancien format board { b, r, exp }', () => {
    const legacy = { b: 'b-legacy', r: 'EDITOR' as const, exp: Date.now() + 60_000 };
    const body = Buffer.from(JSON.stringify(legacy)).toString('base64url');
    const sig = createHmac('sha256', process.env.SESSION_SECRET as string)
      .update(body)
      .digest('base64url');
    const payload = verifyShareToken(`${body}.${sig}`);
    expect(payload).toMatchObject({ t: 'board', id: 'b-legacy', r: 'EDITOR' });
  });
});
