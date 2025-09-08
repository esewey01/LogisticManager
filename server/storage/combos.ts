// server/storage/combos.ts
import { baseDatos, sql } from "../db";

type ListParams = { search: string; limit: number; offset: number };

// NOTA DE ESQUEMA:
// combos:      sku_combo (PK text), codigo_marca, titulo, descripcion, activo, categoria
// combo_items: id (serial), sku_combo (FK text), sku_marca (FK text), cantidad
// No hay created_at ni id numérico. Usaremos sku_combo como "id" (string).

export async function listCombos(params: ListParams) {
  const { search, limit, offset } = params;
  const term = `%${(search ?? "").toLowerCase()}%`;

  const { rows } = await baseDatos.execute(sql`
    SELECT
      c.sku_combo                                   AS "id",           -- string
      c.titulo                                      AS "nombre",
      COALESCE(c.descripcion, '')                   AS "descripcion",
      c.activo                                      AS "activo",
      NULL::timestamp                               AS "createdAt",    -- no existe en el esquema
      COALESCE(ci.cnt, 0)::int                      AS "itemsCount",
      m.nombre                                      AS "marcaNombre",
      c.categoria                                   AS "categoria",
      COALESCE(ct.costoTotal, 0)::numeric           AS "costoTotal"
    FROM combos c
    LEFT JOIN (
      SELECT sku_combo, COUNT(*) AS cnt
      FROM combo_items
      GROUP BY sku_combo
    ) ci ON ci.sku_combo = c.sku_combo
    LEFT JOIN (
      SELECT ci2.sku_combo, SUM(ci2.cantidad * COALESCE(a.costo, 0)) AS costoTotal
      FROM combo_items ci2
      LEFT JOIN articulos a ON a.sku = ci2.sku_marca
      GROUP BY ci2.sku_combo
    ) ct ON ct.sku_combo = c.sku_combo
    LEFT JOIN marcas m ON m.codigo = c.codigo_marca
    WHERE (
      ${search ? sql`
        (
          LOWER(c.titulo) LIKE ${term}
          OR LOWER(COALESCE(c.descripcion, '')) LIKE ${term}
          OR LOWER(c.sku_combo) LIKE ${term}
          OR LOWER(COALESCE(m.nombre, '')) LIKE ${term}
        )` : sql`TRUE`}
    )
    ORDER BY c.sku_combo ASC
    LIMIT ${limit} OFFSET ${offset};
  `);

  return rows;
}

export async function countCombos(params: { search: string }) {
  const { search } = params;
  const term = `%${(search ?? "").toLowerCase()}%`;

  const { rows } = await baseDatos.execute(sql`
    SELECT COUNT(*)::int AS total
    FROM combos c
    WHERE (
      ${search ? sql`LOWER(c.titulo) LIKE ${term} OR LOWER(COALESCE(c.descripcion, '')) LIKE ${term} OR LOWER(c.sku_combo) LIKE ${term}` : sql`TRUE`}
    );
  `);

  return rows?.[0]?.total ?? 0;
}

export async function getComboWithItems(skuCombo: string) {
  const { rows } = await baseDatos.execute(sql`
    SELECT
      c.sku_combo                                   AS "id",
      c.titulo                                      AS "nombre",
      COALESCE(c.descripcion, '')                   AS "descripcion",
      c.activo                                      AS "activo",
      NULL::timestamp                               AS "createdAt",
      c.codigo_marca                                AS "codigoMarca",
      c.categoria                                   AS "categoria",
      m.nombre                                      AS "marcaNombre",
      COALESCE(ct.costoTotal, 0)::numeric           AS "costoTotal"
    FROM combos c
    LEFT JOIN marcas m ON m.codigo = c.codigo_marca
    LEFT JOIN (
      SELECT ci2.sku_combo, SUM(ci2.cantidad * COALESCE(a.costo, 0)) AS costoTotal
      FROM combo_items ci2
      LEFT JOIN articulos a ON a.sku = ci2.sku_marca
      GROUP BY ci2.sku_combo
    ) ct ON ct.sku_combo = c.sku_combo
    WHERE c.sku_combo = ${skuCombo};
  `);
  const combo = rows?.[0];
  if (!combo) return undefined;

  const { rows: items } = await baseDatos.execute(sql`
  SELECT
    ci.id,
    ci.sku_marca                              AS "sku",
    ci.cantidad,
    a.nombre                                  AS "nombreProducto",
    a.costo,
    COALESCE(a.stock, a.stock_cp, 0)::int     AS "stock"
  FROM combo_items ci
  LEFT JOIN articulos a ON a.sku = ci.sku_marca
  WHERE ci.sku_combo = ${skuCombo}
  ORDER BY ci.id ASC;
`);

  return { ...combo, items };
}

// Export helpers
export async function getItemsForCombos(skuCombos: string[], limitPerCombo = 10) {
  if (skuCombos.length === 0) return [] as any[];
  const { rows } = await baseDatos.execute(sql`
    WITH ranked AS (
      SELECT
        ci.sku_combo,
        ci.id,
        ci.sku_marca,
        ci.cantidad,
        a.costo,
        ROW_NUMBER() OVER (PARTITION BY ci.sku_combo ORDER BY ci.id ASC) AS rn
      FROM combo_items ci
      LEFT JOIN articulos a ON a.sku = ci.sku_marca
      WHERE ci.sku_combo = ANY(${skuCombos})
    )
    SELECT sku_combo, id, sku_marca, cantidad, costo
    FROM ranked
    WHERE rn <= ${limitPerCombo}
    ORDER BY sku_combo ASC, id ASC;
  `);
  return rows as Array<{ sku_combo: string; id: number; sku_marca: string; cantidad: number; costo: number | null }>;
}

// Para crear combos, en tu esquema se requieren campos clave:
// sku_combo, codigo_marca, categoria (CHECK 'compuesto'|'permisivo').
// titulo/descripcion/activo son opcionales (activo default true).
export async function createComboWithItems(payload: {
  id: string;                    // sku_combo
  codigoMarca: string;           // codigo_marca
  categoria: "compuesto" | "permisivo";
  nombre?: string;               // titulo
  descripcion?: string;
  activo?: boolean;
  items?: { sku: string; cantidad: number }[];
}) {
  const {
    id, codigoMarca, categoria,
    nombre = null, descripcion = null,
    activo = true,
    items = [],
  } = payload;

  // Inserta combo
  await baseDatos.execute(sql`
    INSERT INTO combos (sku_combo, codigo_marca, titulo, descripcion, activo, categoria)
    VALUES (${id}, ${codigoMarca}, ${nombre}, ${descripcion}, ${activo}, ${categoria});
  `);

  // Filtra/normaliza items y mapea a columnas reales
  const validItems = items
    .filter(i => (i?.sku ?? "").trim() !== "" && Number(i?.cantidad) > 0)
    .map(i => ({ sku_marca: i.sku.trim(), cantidad: Number(i.cantidad) }));

  if (validItems.length > 0) {
    await baseDatos.execute(sql`
      INSERT INTO combo_items (sku_combo, sku_marca, cantidad)
      VALUES ${sql.join(
      validItems.map(i => sql`(${id}, ${i.sku_marca}, ${i.cantidad})`),
      sql`,`
    )};
    `);
  }

  return getComboWithItems(id);
}

export async function updateCombo(
  id: string, // sku_combo
  changes: Partial<{ nombre: string; descripcion: string; activo: boolean; codigoMarca: string; categoria: "compuesto" | "permisivo" }>
) {
  const sets: any[] = [];
  if (changes.nombre !== undefined) sets.push(sql`titulo = ${changes.nombre}`);
  if (changes.descripcion !== undefined) sets.push(sql`descripcion = ${changes.descripcion}`);
  if (changes.activo !== undefined) sets.push(sql`activo = ${changes.activo}`);
  if (changes.codigoMarca !== undefined) sets.push(sql`codigo_marca = ${changes.codigoMarca}`);
  if (changes.categoria !== undefined) sets.push(sql`categoria = ${changes.categoria}`);

  if (sets.length === 0) return getComboWithItems(id);

  const { rowCount } = await baseDatos.execute(sql`
    UPDATE combos
    SET ${sql.join(sets, sql`, `)}
    WHERE sku_combo = ${id};
  `);
  if (!rowCount) return undefined;

  return getComboWithItems(id);
}

export async function replaceComboItems(
  id: string, // sku_combo
  items: { sku: string; cantidad: number }[]
) {
  // Normalizar/merge SKUs
  const merged: Record<string, number> = {};
  for (const it of items || []) {
    const sku = (it?.sku ?? "").trim();
    const qty = Number(it?.cantidad) || 0;
    if (!sku || qty <= 0) continue;
    merged[sku] = (merged[sku] ?? 0) + qty;
  }
  const finalItems = Object.entries(merged).map(([sku, cantidad]) => ({ sku_marca: sku, cantidad }));

  await baseDatos.transaction(async (tx) => {
    await tx.execute(sql`DELETE FROM combo_items WHERE sku_combo = ${id};`);
    if (finalItems.length > 0) {
      await tx.execute(sql`
        INSERT INTO combo_items (sku_combo, sku_marca, cantidad)
        VALUES ${sql.join(
        finalItems.map(i => sql`(${id}, ${i.sku_marca}, ${i.cantidad})`),
        sql`,`
      )};
      `);
    }
  });

  return getComboWithItems(id);
}

export async function deleteCombo(id: string) {
  const deleted = await baseDatos.transaction(async (tx) => {
    await tx.execute(sql`DELETE FROM combo_items WHERE sku_combo = ${id};`);
    const { rowCount } = await tx.execute(sql`DELETE FROM combos WHERE sku_combo = ${id};`);
    return rowCount as number;
  });
  return (deleted ?? 0) > 0;
}
