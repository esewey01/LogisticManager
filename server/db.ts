// server/db.ts
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
// Alias en español para mayor claridad al usar en este archivo
import * as esquema from '@shared/schema';

// Cargar variables de entorno desde .env
import 'dotenv/config';

// Validación temprana: la URL de base de datos es obligatoria
if (!process.env.DATABASE_URL) {
  throw new Error('URL DATABASE NO DEFINIDA/ENCONTRADA');
}

/**
 * Piscina de conexiones a PostgreSQL (conexión reutilizable y eficiente).
 * Usa la variable de entorno DATABASE_URL.
 */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Instancia de Drizzle ORM para Node.js + PostgreSQL.
 * Se le pasa el "schema" (aquí referenciado como `esquema`) para tener tipado.
 */
export const db = drizzle(pool, { schema: esquema });

/**
 * Alias en español por si quieres usarlos en el resto del proyecto:
 * - `piscina` como alias de `pool`
 * - `bd` como alias de `db`
 *
 * Así no rompes código existente que ya importe `pool` o `db`,
 * pero puedes migrar gradualmente a los nombres en español.
 */
export { pool as piscina, db as bd };
