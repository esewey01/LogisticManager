// server/integrations/mlg/mapAndUpsert.ts
import { db } from "../../db";
import { orders, orderItems } from "@shared/schema";
import { and, eq } from "drizzle-orm";
import type { Venta } from "./mlgClient";

const MLG_SHOP_ID = 3 as const;

function toStr(n: unknown) {
  return n == null ? null : String(n);
}

function mapEstatusToStatus(e?: string | null) {
  if (!e) return "pending";
  const m = e.toLowerCase();
  if (m.includes("entregado")) return "delivered";
  if (m.includes("camino") || m.includes("transito")) return "shipped";
  if (m.includes("preparación") || m.includes("preparacion")) return "processing";
  return "pending";
}

export async function upsertMlgOrder(v: Venta) {
  const orderIdStr = toStr(v.idCanje)!; // orders.orderId = idCanje as string
  const name = v.idOrder || null; // orders.name
  const customerName = v.nombreCliente ?? null;
  const totalAmount = toStr(v.totalCompra) ?? null;
  const subtotalPrice = toStr(v.precioArticulo) ?? null;
  const fulfillmentStatus = v.estatusEnvio ?? null;
  const financialStatus = "PAID";
  const createdAt = v.fechaSolicitud ? new Date(v.fechaSolicitud) : new Date();
  const shopifyCreatedAt = createdAt;
  const currency = "MXN";
  const tags = ["MLG"] as string[];

  const inserted = await db
    .insert(orders)
    .values({
      shopId: MLG_SHOP_ID,
      orderId: orderIdStr,
      name,
      customerName,
      totalAmount,
      subtotalPrice,
      financialStatus,
      fulfillmentStatus,
      createdAt,
      shopifyCreatedAt,
      currency,
      tags,
      status: mapEstatusToStatus(fulfillmentStatus),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [orders.shopId, orders.orderId],
      set: {
        name,
        customerName,
        totalAmount,
        subtotalPrice,
        financialStatus,
        fulfillmentStatus,
        currency,
        tags,
        status: mapEstatusToStatus(fulfillmentStatus),
        shopifyCreatedAt,
        updatedAt: new Date(),
      },
    })
    .returning({ id: orders.id });

  const orderRowId = inserted[0]?.id;

  // Optional: add one order_items row per sale (avoid duplicates by (order_id, title))
  if (orderRowId != null) {
    const title = v.titulo || v.producto || "Artículo MLG";
    const sku = v.modelo ? String(v.modelo) : toStr(v.idProductoProveedor) ?? null;
    const quantity = Number(v.cantidad || 1);
    const price = toStr(v.precioArticulo) ?? null;

    const existing = await db
      .select({ id: orderItems.id })
      .from(orderItems)
      .where(and(eq(orderItems.orderId, Number(orderRowId)), eq(orderItems.title, title)))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(orderItems).values({
        orderId: Number(orderRowId),
        title,
        sku,
        quantity,
        price,
        variantTitle: v.modelo ?? null,
      });
    }
  }
}
