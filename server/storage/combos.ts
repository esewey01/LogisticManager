// server/storage/combos.ts
import { db as baseDatos } from "../db";
import { sql } from "drizzle-orm";

type ListParams = { search: string; limit: number; offset: number };

export async function listCombos(params: ListParams) {
  const { search, limit, offset } = params;
  const term = `%${search.toLowerCase()}%`;

  const { rows } = await baseDatos.execute(sql`
    SELECT
      c.id,
      c.nombre,
      c.descripcion,
      c.activo,
      c.created_at AS "createdAt",
      COALESCE(ci.cnt, 0) AS "itemsCount"
    FROM combos c
    LEFT JOIN (
      SELECT combo_id, COUNT(*) AS cnt
      FROM combo_items
      GROUP BY combo_id
    ) ci ON ci.combo_id = c.id
    WHERE (${search ? sql`LOWER(c.nombre) LIKE ${term} OR LOWER(c.descripcion) LIKE ${term}` : sql`TRUE`})
    ORDER BY c.created_at DESC, c.id DESC
    LIMIT ${limit} OFFSET ${offset};
  `);

  return rows;
}

export async function countCombos(params: { search: string }) {
  const { search } = params;
  const term = `%${search.toLowerCase()}%`;

  const { rows } = await baseDatos.execute(sql`
    SELECT COUNT(*)::int AS total
    FROM combos c
    WHERE (${search ? sql`LOWER(c.nombre) LIKE ${term} OR LOWER(c.descripcion) LIKE ${term}` : sql`TRUE`});
  `);

  return rows?.[0]?.total ?? 0;
}

export async function getComboWithItems(id: number) {
  const { rows } = await baseDatos.execute(sql`
    SELECT
      c.id,
      c.nombre,
      c.descripcion,
      c.activo,
      c.created_at AS "createdAt"
    FROM combos c
    WHERE c.id = ${id};
  `);
  const combo = rows?.[0];
  if (!combo) return undefined;

  const { rows: items } = await baseDatos.execute(sql`
    SELECT
      ci.id,
      ci.sku,
      ci.cantidad,
      cp.nombre_producto AS "nombreProducto",
      cp.costo
    FROM combo_items ci
    LEFT JOIN catalogo_productos cp ON cp.sku = ci.sku
    WHERE ci.combo_id = ${id}
    ORDER BY ci.id ASC;
  `);

  return { ...combo, items };
}

export async function createComboWithItems(payload: {
  nombre: string;
  descripcion?: string;
  activo?: boolean;
  items?: { sku: string; cantidad: number }[];
}) {
  const { nombre, descripcion = "", activo = true, items = [] } = payload;

  // Crear combo
  const { rows } = await baseDatos.execute(sql`
    INSERT INTO combos (nombre, descripcion, activo)
    VALUES (${nombre}, ${descripcion}, ${activo})
    RETURNING id, nombre, descripcion, activo, created_at AS "createdAt";
  `);
  const combo = rows[0];

  // Insertar items (si hay)
  if (items.length > 0) {
    await baseDatos.execute(sql`
      INSERT INTO combo_items (combo_id, sku, cantidad)
      VALUES ${sql.join(
        items.map(i => sql`(${combo.id}, ${i.sku}, ${i.cantidad})`),
        sql`,`
      )};
    `);
  }

  return getComboWithItems(combo.id);
}

export async function updateCombo(
  id: number,
  changes: Partial<{ nombre: string; descripcion: string; activo: boolean }>
) {
  // construir SET dinámico
  const sets: any[] = [];
  if (typeof changes.nombre === "string") sets.push(sql`nombre = ${changes.nombre}`);
  if (typeof changes.descripcion === "string") sets.push(sql`descripcion = ${changes.descripcion}`);
  if (typeof changes.activo === "boolean") sets.push(sql`activo = ${changes.activo}`);

  if (sets.length === 0) return getComboWithItems(id);

  const { rowCount } = await baseDatos.execute(sql`
    UPDATE combos
    SET ${sql.join(sets, sql`, `)}
    WHERE id = ${id};
  `);
  if (!rowCount) return undefined;

  return getComboWithItems(id);
}

export async function replaceComboItems(
  id: number,
  items: { sku: string; cantidad: number }[]
) {
  // validar existencia combo
  const { rows: exist } = await baseDatos.execute(sql`SELECT 1 FROM combos WHERE id = ${id};`);
  if (exist.length === 0) return undefined;

  // transacción: borrar e insertar
  await (baseDatos as any).transaction(async (tx: any) => {
    await tx.execute(sql`DELETE FROM combo_items WHERE combo_id = ${id};`);
    if (items.length > 0) {
      await tx.execute(sql`
        INSERT INTO combo_items (combo_id, sku, cantidad)
        VALUES ${sql.join(
          items.map(i => sql`(${id}, ${i.sku}, ${i.cantidad})`),
          sql`,`
        )};
      `);
    }
  });

  return getComboWithItems(id);
}

export async function deleteCombo(id: number) {
  const deleted = await (baseDatos as any).transaction(async (tx: any) => {
    await tx.execute(sql`DELETE FROM combo_items WHERE combo_id = ${id};`);
    const { rowCount } = await tx.execute(sql`DELETE FROM combos WHERE id = ${id};`);
    return rowCount as number;
  });
  return (deleted ?? 0) > 0;
}
