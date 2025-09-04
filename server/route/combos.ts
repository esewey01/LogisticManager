// server/routes/combos.ts
import { Router } from "express";
import { z } from "zod";
import * as storage from "../storage/combos";

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
    req.log?.error?.(err);
    res.status(500).json({ message: "Error al listar combos" });
  }
});

// GET /api/combos/:id  -> combo + items + enriquecimiento catálogo
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "ID inválido" });

    const combo = await storage.getComboWithItems(id);
    if (!combo) return res.status(404).json({ message: "Combo no encontrado" });

    res.json(combo);
  } catch (err: any) {
    req.log?.error?.(err);
    res.status(500).json({ message: "Error al obtener combo" });
  }
});

// POST /api/combos  -> crear combo + items (opcional)
const itemSchema = z.object({
  sku: z.string().min(1),
  cantidad: z.number().int().positive(),
});
const createSchema = z.object({
  nombre: z.string().min(1),
  descripcion: z.string().optional().default(""),
  activo: z.boolean().optional().default(true),
  items: z.array(itemSchema).optional().default([]),
});
router.post("/", async (req, res) => {
  try {
    const payload = createSchema.parse(req.body);
    const created = await storage.createComboWithItems(payload);
    res.status(201).json(created);
  } catch (err: any) {
    req.log?.error?.(err);
    res.status(400).json({ message: err?.message ?? "Error al crear combo" });
  }
});

// PUT /api/combos/:id -> actualizar nombre/descripcion/activo
const updateSchema = z.object({
  nombre: z.string().min(1).optional(),
  descripcion: z.string().optional(),
  activo: z.boolean().optional(),
});
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "ID inválido" });

    const changes = updateSchema.parse(req.body);
    const updated = await storage.updateCombo(id, changes);
    if (!updated) return res.status(404).json({ message: "Combo no encontrado" });

    res.json(updated);
  } catch (err: any) {
    req.log?.error?.(err);
    res.status(400).json({ message: err?.message ?? "Error al actualizar combo" });
  }
});

// PUT /api/combos/:id/items -> reemplazar items del combo en una sola operación
const replaceItemsSchema = z.object({
  items: z.array(itemSchema).min(0),
});
router.put("/:id/items", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "ID inválido" });

    const { items } = replaceItemsSchema.parse(req.body);
    const result = await storage.replaceComboItems(id, items);
    if (!result) return res.status(404).json({ message: "Combo no encontrado" });

    res.json(result);
  } catch (err: any) {
    req.log?.error?.(err);
    res.status(400).json({ message: err?.message ?? "Error al reemplazar items" });
  }
});

// DELETE /api/combos/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "ID inválido" });

    const ok = await storage.deleteCombo(id);
    if (!ok) return res.status(404).json({ message: "Combo no encontrado" });

    res.json({ ok: true });
  } catch (err: any) {
    req.log?.error?.(err);
    res.status(500).json({ message: "Error al eliminar combo" });
  }
});

export default router;
