import { z } from 'zod';

try {
  process.loadEnvFile();
} catch {
  void 0;
}

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(16).default('dev_session_secret_change_me_please'),
  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
  TRELLO_API_KEY: z.string().optional(),
  TRELLO_API_SECRET: z.string().optional(),
  TRELLO_OAUTH_CALLBACK_URL: z
    .string()
    .url()
    .default('http://localhost:4000/api/auth/trello/callback'),
});

export type Env = z.infer<typeof EnvSchema>;

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Configuration d'environnement invalide:\n${issues}`);
}

export const env: Env = parsed.data;

export function trelloConfigured(): boolean {
  return Boolean(env.TRELLO_API_KEY && env.TRELLO_API_SECRET);
}
