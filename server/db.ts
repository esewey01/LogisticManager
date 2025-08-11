// server/db.ts
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';

// Cargar variables de entorno
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
}

// Conexión a PostgreSQL local
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Drizzle ORM con soporte para Node.js + PostgreSQL
export const db = drizzle(pool, { schema });