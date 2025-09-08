// server/routes/combos.ts
import { Router } from "express";
import xlsx from "xlsx";
import { z } from "zod";
import * as storage from "../storage/combos";

const logErr = (e:any) => { console.error(e); };
const router = Router();

// GET /api/combos?search=&limit=&offset=
router.get("/", async (req, res) => {
  try {
    const search = String(req.query.search ?? "").trim();
    const limit = Number(req.query.limit ?? 20);
    const offset = Number(req.query.offset ?? 0);

    const [data, total] = await Promise.all([
      storage.listCombos({ search, limit, offset }),
      storage.countCombos({ search }),
    ]);

    res.json({ data, total, limit, offset });
  } catch (err: any) {
    logErr(err);
    res.status(500).json({ message: "Error al listar combos" });
  }
});

// GET /api/combos/:id
router.get("/:id", async (req, res) => {
  try {
    const id = String(req.params.id ?? "").trim(); // sku_combo
    if (!id) return res.status(400).json({ message: "ID inválido" });

    const combo = await storage.getComboWithItems(id);
    if (!combo) return res.status(404).json({ message: "Combo no encontrado" });

    res.json(combo);
  } catch (err: any) {
    logErr(err);
    res.status(500).json({ message: "Error al obtener combo" });
  }
});

// POST /api/combos
const itemSchema = z.object({
  sku: z.string().min(1),
  cantidad: z.number().int().positive(),
});
const createSchema = z.object({
  id: z.string().min(1), // sku_combo
  codigoMarca: z.string().min(1),
  categoria: z.enum(["compuesto", "permisivo"]),
  nombre: z.string().optional(),      // titulo
  descripcion: z.string().optional(),
  activo: z.boolean().optional(),
  items: z.array(itemSchema).optional(),
});
router.post("/", async (req, res) => {
  try {
    const payload = createSchema.parse(req.body);
    const created = await storage.createComboWithItems(payload);
    res.status(201).json(created);
  } catch (err: any) {
    logErr(err);
    res.status(400).json({ message: err?.message ?? "Error al crear combo" });
  }
});

// PUT /api/combos/:id
const updateSchema = z.object({
  nombre: z.string().optional(),
  descripcion: z.string().optional(),
  activo: z.boolean().optional(),
  codigoMarca: z.string().optional(),
  categoria: z.enum(["compuesto", "permisivo"]).optional(),
});
router.put("/:id", async (req, res) => {
  try {
    const id = String(req.params.id ?? "").trim();
    if (!id) return res.status(400).json({ message: "ID inválido" });

    const changes = updateSchema.parse(req.body);
    const updated = await storage.updateCombo(id, changes);
    if (!updated) return res.status(404).json({ message: "Combo no encontrado" });

    res.json(updated);
  } catch (err: any) {
    logErr(err);
    res.status(400).json({ message: err?.message ?? "Error al actualizar combo" });
  }
});

// PUT /api/combos/:id/items
const replaceItemsSchema = z.object({
  items: z.array(itemSchema).min(0),
});
router.put("/:id/items", async (req, res) => {
  try {
    const id = String(req.params.id ?? "").trim();
    if (!id) return res.status(400).json({ message: "ID inválido" });

    const { items } = replaceItemsSchema.parse(req.body);
    const result = await storage.replaceComboItems(id, items);
    if (!result) return res.status(404).json({ message: "Combo no encontrado" });

    res.json(result);
  } catch (err: any) {
    logErr(err);
    res.status(400).json({ message: err?.message ?? "Error al reemplazar items" });
  }
});

// DELETE /api/combos/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = String(req.params.id ?? "").trim();
    if (!id) return res.status(400).json({ message: "ID inválido" });

    const ok = await storage.deleteCombo(id);
    if (!ok) return res.status(404).json({ message: "Combo no encontrado" });

    res.json({ ok: true });
  } catch (err: any) {
    logErr(err);
    res.status(500).json({ message: "Error al eliminar combo" });
  }
});

// Salud
router.get("/health", (_req, res) => res.json({ ok: true }));

// GET /api/combos/brands → lista de marcas (selector en modal)
router.get("/brands", async (_req, res) => {
  try {
    const { baseDatos, sql } = await import("../db");
    const { rows } = await baseDatos.execute(sql`SELECT codigo, nombre FROM marcas ORDER BY nombre ASC;`);
    res.json(rows);
  } catch (err:any) {
    logErr(err);
    res.status(500).json({ message: "Error al listar marcas" });
  }
});

// GET /api/combos/export?format=csv|xlsx&search=&limit=&offset=
router.get("/export", async (req, res) => {
  try {
    const format = String(req.query.format ?? "csv").toLowerCase();
    const search = String(req.query.search ?? "").trim();
    const limit = Number(req.query.limit ?? 1000);
    const offset = Number(req.query.offset ?? 0);

    const combos = await storage.listCombos({ search, limit, offset });
    const ids = (combos as any[]).map(c => c.id);
    const items = await storage.getItemsForCombos(ids, 10);

    const itemsByCombo = new Map<string, { sku_marca: string; cantidad: number; costo: number | null }[]>();
    for (const it of items as any[]) {
      const arr = itemsByCombo.get(it.sku_combo) || [];
      arr.push({ sku_marca: it.sku_marca, cantidad: it.cantidad, costo: it.costo });
      itemsByCombo.set(it.sku_combo, arr);
    }

    const header = [
      "combo",
      ...Array.from({ length: 10 }, (_, i) => `sku${i + 1}`),
      ...Array.from({ length: 10 }, (_, i) => `costo_sku${i + 1}`),
      ...Array.from({ length: 10 }, (_, i) => `cantidad${i + 1}`),
      ...Array.from({ length: 10 }, (_, i) => `subtotal${i + 1}`),
      "costo_total",
    ];

    const pad = (arr: any[], n: number) => arr.concat(Array(Math.max(0, n - arr.length)).fill(""));
    const rows = (combos as any[]).map((c) => {
      const its = (itemsByCombo.get(c.id) || []).slice(0, 10);
      const sku = its.map(i => i.sku_marca);
      const costo = its.map(i => (i.costo ?? 0));
      const cantidad = its.map(i => i.cantidad);
      const subtotal = its.map((_, i) => cantidad[i] * costo[i]);
      const costo_total = subtotal.reduce((a, b) => a + b, 0);
      return [c.id, ...pad(sku, 10), ...pad(costo, 10), ...pad(cantidad, 10), ...pad(subtotal, 10), costo_total];
    });

    if (format === "xlsx" || format === "excel") {
      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.aoa_to_sheet([header, ...rows]);
      xlsx.utils.book_append_sheet(wb, ws, "Combos");
      const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", "attachment; filename=\"combos.xlsx\"");
      return res.end(buf);
    }

    const esc = (v: any) => {
      const s = String(v ?? "");
      if (s.includes(",") || s.includes("\n") || s.includes('"')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };
    const csv = [header.map(esc).join(","), ...rows.map(r => r.map(esc).join(","))].join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=\"combos.csv\"");
    return res.end(csv, "utf8");
  } catch (err:any) {
    logErr(err);
    res.status(500).json({ message: "Error al exportar combos" });
  }
});

export default router;
