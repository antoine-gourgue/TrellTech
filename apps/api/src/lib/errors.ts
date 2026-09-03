import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import type { ApiError } from '@trelltech/shared';

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const NotFound = (message = 'Ressource introuvable') =>
  new HttpError(404, 'NOT_FOUND', message);
export const Unauthorized = (message = 'Authentification requise') =>
  new HttpError(401, 'UNAUTHORIZED', message);
export const Forbidden = (message = 'Accès refusé') => new HttpError(403, 'FORBIDDEN', message);
export const BadRequest = (message = 'Requête invalide', details?: unknown) =>
  new HttpError(400, 'BAD_REQUEST', message, details);

function toEnvelope(code: string, message: string, details?: unknown): ApiError {
  return { error: { code, message, ...(details !== undefined ? { details } : {}) } };
}

export function registerErrorHandler(app: {
  setErrorHandler: (
    handler: (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => void,
  ) => void;
}): void {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof HttpError) {
      reply.status(error.status).send(toEnvelope(error.code, error.message, error.details));
      return;
    }

    if (error instanceof ZodError) {
      reply
        .status(400)
        .send(toEnvelope('VALIDATION_ERROR', 'Données invalides', error.flatten()));
      return;
    }

    if (typeof error.statusCode === 'number' && error.statusCode < 500) {
      reply
        .status(error.statusCode)
        .send(toEnvelope(error.code ?? 'BAD_REQUEST', error.message));
      return;
    }

    request.log.error({ err: error }, 'Erreur non gérée');
    reply.status(500).send(toEnvelope('INTERNAL_ERROR', 'Une erreur interne est survenue'));
  });
}
