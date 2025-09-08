// server/routes/articulosSearch.ts
import { Router } from "express";
import { baseDatos, sql } from "../db";

const router = Router();

/**
 * GET /api/articulos/search?q=term
 * Busca por sku, sku_interno o nombre (ILIKE) y devuelve lo que espera el front.
 */
router.get("/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (q.length < 2) return res.json([]);

  // Nota: añade índices/GIN trigram si el catálogo es grande.
  const like = `%${q.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;

  const { rows } = await baseDatos.execute(sql`
    SELECT
      sku,
      sku_interno,
      nombre,
      costo::numeric AS costo,
      stock_a::int AS stock_a,
      stock_cp::int AS stock_cp,
      es_combo,
      NULL::text AS sku_combo
    FROM articulos
    WHERE sku ILIKE ${like}
       OR nombre ILIKE ${like}
       OR (sku_interno IS NOT NULL AND sku_interno ILIKE ${like})
    ORDER BY nombre ASC
    LIMIT 50;
  `);

  res.json(rows);
});

export default router;
