import type { FastifyReply, FastifyRequest } from 'fastify';
import type { User as PrismaUser } from '@prisma/client';
import { prisma } from '../prisma.js';
import { Unauthorized } from './errors.js';

const COOKIE_NAME = 'tt_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: PrismaUser;
  }
}

export function setSession(reply: FastifyReply, userId: string): void {
  reply.setCookie(COOKIE_NAME, userId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    signed: true,
    maxAge: COOKIE_MAX_AGE,
  });
}

export function clearSession(reply: FastifyReply): void {
  reply.clearCookie(COOKIE_NAME, { path: '/' });
}

async function resolveUser(request: FastifyRequest): Promise<PrismaUser | null> {
  const raw = request.cookies[COOKIE_NAME];
  if (!raw) return null;
  const unsigned = request.unsignCookie(raw);
  if (!unsigned.valid || !unsigned.value) return null;
  return prisma.user.findUnique({ where: { id: unsigned.value } });
}

export async function requireAuth(request: FastifyRequest): Promise<PrismaUser> {
  if (request.currentUser) return request.currentUser;
  const user = await resolveUser(request);
  if (!user) throw Unauthorized();
  request.currentUser = user;
  return user;
}

export async function getOptionalUser(request: FastifyRequest): Promise<PrismaUser | null> {
  const user = await resolveUser(request);
  request.currentUser = user ?? undefined;
  return user;
}

export function resolveSessionUserId(request: FastifyRequest): string | null {
  const raw = request.cookies[COOKIE_NAME];
  if (!raw) return null;
  const unsigned = request.unsignCookie(raw);
  if (!unsigned.valid || !unsigned.value) return null;
  return unsigned.value;
}
