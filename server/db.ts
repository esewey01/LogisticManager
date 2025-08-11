// server/db.ts

//LIBRERIA Y FUNCIONES PARA CONETTAR CON POSTGRESQL
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

import * as schema from '@shared/schema';//IMPORTA TODO LO DEFINIDO EN SCHEMA
import 'dotenv/config';//VAR ENT

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no definida/encontrada');
}

// Conexión a PostgreSQL local
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Drizzle ORM con soporte para Node.js + PostgreSQL
export const db = drizzle(pool, { schema });
//LE INDICA A DRIZZLE QUE TABLAS Y ESTRUCTURAS EXISTEN EN LA BD