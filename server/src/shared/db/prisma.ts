import dotenv from 'dotenv';
// Load .env configuration
dotenv.config({ override: true });

import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

let prismaInstance: PrismaClient | null = null;

function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    if (globalForPrisma.prisma) {
      prismaInstance = globalForPrisma.prisma;
    } else {
      let dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error('DATABASE_URL environment variable is required');
      }

      // Strip enclosing quotes if they exist
      if (
        (dbUrl.startsWith('"') && dbUrl.endsWith('"')) ||
        (dbUrl.startsWith("'") && dbUrl.endsWith("'"))
      ) {
        dbUrl = dbUrl.slice(1, -1);
      }

      const adapter = new PrismaMariaDb(dbUrl);

      prismaInstance = new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      });

      globalForPrisma.prisma = prismaInstance;
    }
  }
  return prismaInstance;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    const client = getPrisma();
    const value = Reflect.get(client, prop);
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});
