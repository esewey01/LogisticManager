// server/db.ts

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import "dotenv/config";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no definida/encontrada");
}

// Conexión a PostgreSQL con SSL (Neon requiere SSL)
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

//SOLO PARA IDENTIFICAR LA BASE DE DATOS
const u = new URL(process.env.DATABASE_URL);
console.log("[DB] Conectando a:", u.hostname); // Debe mostrar ...neon.tech (pooler)

// Drizzle ORM con soporte para Node.js + PostgreSQL
export const db = drizzle(pool, { schema });
