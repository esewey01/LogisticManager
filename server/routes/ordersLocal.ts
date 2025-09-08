// server/routes/ordersLocal.ts
import { Router } from "express";
import { z } from "zod";
import { createLocalOrder } from "../services/orders/createLocalOrder";

const router = Router();

// Zod schemas
const OrigenStock = z.enum(["ALMACEN", "PROVEEDOR"]);
const LocalOrderItemInput = z.object({
  sku: z.string().min(1),
  quantity: z.number().int().positive(),
  origenStock: OrigenStock,
  unitPrice: z.number().nonnegative().optional(),
  discountAmount: z.number().nonnegative().optional(),
  note: z.string().optional(),
});
const AddressSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  line1: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  country: z.string().optional(),
  zip: z.string().optional(),
});
const LocalOrderInput = z.object({
  clientRequestId: z.string().min(1),
  customer: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional()
  }).optional(),
  delivery: z.object({
    type: z.enum(["pickup", "delivery_local", "paqueteria"]),
    address: AddressSchema.optional(),
  }),
  items: z.array(LocalOrderItemInput).min(1),
  orderLevelDiscount: z.object({ type: z.enum(["percent", "amount"]), value: z.number().nonnegative() }).optional(),
  payment: z.object({ method: z.enum(["cash", "transfer", "card", "other"]).optional(), paidAmount: z.number().nonnegative().optional(), reference: z.string().optional() }).optional(),
  notes: z.string().optional(),
  createdBy: z.string().optional(),
});

router.post("/local", async (req, res) => {
  try {
    const input = LocalOrderInput.parse(req.body);

    if (input.delivery.type !== "pickup") {
      const addr = input.delivery.address || {};
      if (!addr.line1 || !addr.city || !addr.province || !addr.country || !addr.zip) {
        return res.status(400).json({ message: "Dirección incompleta para entrega (line1, city, province, country, zip)." });
      }
    }

    const dto = await createLocalOrder(input);
    res.status(201).json(dto);
  } catch (err: any) {
    const msg = err?.message || "Error al crear orden local";
    res.status(400).json({ message: msg });
  }
});

export default router;
