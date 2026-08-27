import { PrismaClient } from "@stock-kan-kan/db/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });
  return new PrismaClient({ adapter });
}

// Fluid Compute réutilise le processus : un client global évite de créer un nouveau
// pool PostgreSQL à chaque bundle de route, y compris en production.
globalForPrisma.prisma ??= createClient();
export const db = globalForPrisma.prisma;
