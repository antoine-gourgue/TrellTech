import { ApiErrorSchema } from '@trelltech/shared';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
};

async function parseError(response: Response): Promise<ApiRequestError> {
  let code = 'UNKNOWN';
  let message = "Une erreur inattendue s'est produite.";
  try {
    const payload: unknown = await response.json();
    const parsed = ApiErrorSchema.safeParse(payload);
    if (parsed.success) {
      code = parsed.data.error.code;
      message = parsed.data.error.message;
    }
  } catch {
    // réponse sans corps JSON exploitable
  }
  return new ApiRequestError(response.status, code, message);
}

/**
 * Client API unique : envoie toujours les cookies de session et normalise
 * l'enveloppe d'erreur `{ error: { code, message } }` en `ApiRequestError`.
 */
export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options;
  const response = await fetch(`${API_URL}${path}`, {
    method,
    credentials: 'include',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
