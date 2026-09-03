import { buildServer } from './server.js';
import { env } from './env.js';
import { prisma } from './prisma.js';

async function main(): Promise<void> {
  const app = await buildServer();

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info(`Signal ${signal} reçu, arrêt en cours…`);
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
