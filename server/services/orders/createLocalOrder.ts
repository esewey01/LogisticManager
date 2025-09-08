// server/services/orders/createLocalOrder.ts
import { baseDatos, sql } from "../../db";

type OrigenStock = 'ALMACEN' | 'PROVEEDOR';

type LocalOrderItemInput = {
  sku: string;
  quantity: number;
  origenStock: OrigenStock;
  unitPrice?: number;        // precio de venta capturado por usuario (si no, usa costo ref.)
  discountAmount?: number;   // descuento a nivel línea (opcional)
  note?: string;
};

type LocalOrderInput = {
  clientRequestId: string;
  customer?: { name?: string; email?: string; phone?: string };
  delivery: {
    type: 'pickup' | 'delivery_local' | 'paqueteria';
    address?: { name?: string; phone?: string; line1?: string; city?: string; province?: string; country?: string; zip?: string };
  };
  items: LocalOrderItemInput[];
  orderLevelDiscount?: { type: 'percent' | 'amount'; value: number };
  payment?: { method?: 'cash'|'transfer'|'card'|'other'; paidAmount?: number; reference?: string };
  notes?: string;
  createdBy?: string;
};

export type LocalOrderDTO = {
  id: number;
  shopId: 0;
  orderId: string;   // consecutivo local (1,2,3...) guardado como texto
  name: string;      // VD00001, VD00002, ...
  financial_status: 'PAID'|'PARTIALLY_PAID'|'PENDING';
  fulfillment_status: 'UNFULFILLED'|'FULFILLED'|'IN_TRANSIT'|'RETURNED'|'CANCELLED';
  subtotal: number;
  discount_total: number;
  tax_total: number;
  shipping_total: number;
  total: number;
  items: Array<{ sku: string; quantity: number; unitPrice: number; origenStock: OrigenStock; discountAmount?: number }>;
  created_at: string;
};

function pad(n: number, width = Number(process.env.LOCAL_NAME_PAD ?? 5)) {
  const s = String(n);
  return s.length >= width ? s : "0".repeat(width - s.length) + s;
}

export async function createLocalOrder(input: LocalOrderInput): Promise<LocalOrderDTO> {
  // Idempotencia por clientRequestId en note_attributes
  const existing = await baseDatos.execute(sql`
    SELECT id, order_id AS "orderId", name, created_at AS "createdAt",
           subtotal_price::numeric AS subtotal, total_amount::numeric AS total,
           financial_status AS "financialStatus"
    FROM orders
    WHERE shop_id = 0
      AND (note_attributes->>'clientRequestId') = ${input.clientRequestId}
    ORDER BY id DESC
    LIMIT 1;
  `);

  if (existing.rows?.[0]) {
    const r = existing.rows[0] as any;
    const itemsRows = await baseDatos.execute(sql`
      SELECT sku, quantity, price::numeric AS "unitPrice"
      FROM order_items
      WHERE order_id = ${r.id};
    `);
    return {
      id: r.id,
      shopId: 0,
      orderId: r.orderId,
      name: r.name,
      financial_status: (r.financialStatus || 'PENDING'),
      fulfillment_status: 'UNFULFILLED',
      subtotal: Number(r.subtotal || 0),
      discount_total: 0,
      tax_total: 0,
      shipping_total: 0,
      total: Number(r.total || 0),
      items: (itemsRows.rows as any[]).map(it => ({
        sku: it.sku,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        origenStock: 'ALMACEN'
      })),
      created_at: r.createdAt?.toISOString?.() || new Date().toISOString(),
    };
  }

  // Normaliza SKUs y trae artículos
  const skus = Array.from(new Set(input.items.map(i => i.sku.trim()).filter(Boolean)));
  const { rows: arts } = await baseDatos.execute(sql`
    SELECT sku, nombre, costo::numeric AS costo,
           stock_a::int AS "stockA", stock_cp::int AS "stockCP", es_combo
    FROM articulos
    WHERE sku = ANY(${skus});
  `);
  const artBySku = new Map<string, any>(arts.map((a: any) => [a.sku, a]));

  // Totales
  let subtotal = 0;
  let discountLines = 0;

  const normalizedItems = input.items.map((it) => {
    const art = artBySku.get(it.sku);
    const precioVenta = Number(
      typeof it.unitPrice === "number" && !Number.isNaN(it.unitPrice)
        ? it.unitPrice
        : (art?.costo ?? 0)
    );
    const lineDisc = Number(it.discountAmount ?? 0);
    const lineSubtotal = precioVenta * Number(it.quantity);
    subtotal += lineSubtotal;
    discountLines += lineDisc;

    // Validaciones de existencia cuando es ALMACEN
    if (it.origenStock === 'ALMACEN' && !art) {
      throw new Error(`SKU ${it.sku} no existe en catálogo (ALMACEN).`);
    }
    return {
      ...it,
      unitPrice: precioVenta,
      discountAmount: lineDisc,
      isCombo: !!art?.es_combo,
      nombre: art?.nombre
    };
  });

  // Descuento a nivel orden
  let discountOrder = 0;
  if (input.orderLevelDiscount) {
    discountOrder = input.orderLevelDiscount.type === 'percent'
      ? Math.max(0, Math.min(100, input.orderLevelDiscount.value)) * 0.01 * subtotal
      : input.orderLevelDiscount.value;
  }
  const discount_total = discountLines + discountOrder;

  const TAX_RATE = Number(process.env.VAT_RATE ?? 0.16);
  const tax_base = Math.max(0, subtotal - discount_total);
  const tax_total = Number((tax_base * TAX_RATE).toFixed(2));

  const shipping_total = input.delivery.type === 'pickup' ? 0 : 0; // parametrizable luego
  const total = Number((tax_base + tax_total + shipping_total).toFixed(2));

  const paidAmount = Number(input.payment?.paidAmount ?? 0);
  const financial_status: LocalOrderDTO['financial_status'] =
    paidAmount >= total ? 'PAID' : (paidAmount > 0 ? 'PARTIALLY_PAID' : 'PENDING');

  const fulfillment_status: LocalOrderDTO['fulfillment_status'] = 'UNFULFILLED';

  // Transacción: secuencia + inventario + inserts
  const { rows: [result] } = await baseDatos.transaction(async (tx) => {
    // 1) Obtén consecutivo local
    const { rows: [seqRow] } = await tx.execute(sql`SELECT nextval('local_order_seq') AS seq;`);
    const seq = Number(seqRow.seq);
    const orderId = String(seq);                  // "1","2",...
    const name = `VD${pad(seq)}`;                 // "VD00001", ...

    // 2) Valida y descuenta inventario para ALMACEN
    for (const it of normalizedItems) {
      if (it.origenStock === 'ALMACEN') {
        const { rows: cur } = await tx.execute(sql`
          SELECT stock_a::int AS "stockA"
          FROM articulos
          WHERE sku = ${it.sku}
          FOR UPDATE;
        `);
        const stockA = Number(cur?.[0]?.stockA ?? 0);
        if (stockA < it.quantity) {
          throw new Error(`Sin stock en almacén para SKU ${it.sku}. Disponible: ${stockA}, pedido: ${it.quantity}`);
        }
        await tx.execute(sql`
          UPDATE articulos
          SET stock_a = stock_a - ${it.quantity}
          WHERE sku = ${it.sku};
        `);
      }
    }

    // 3) Inserta orden
    const noteAttributes = {
      clientRequestId: input.clientRequestId,
      kind: 'local',
      delivery: input.delivery,
      payment: input.payment,
      orderLevelDiscount: input.orderLevelDiscount,
      createdBy: input.createdBy || null,
      dropshipLines: normalizedItems.filter(i => i.origenStock === 'PROVEEDOR').map(i => i.sku),
    };

    const now = sql`NOW()`;
    const orderIns = await tx.execute(sql`
      INSERT INTO orders (
        shop_id, order_id, name,
        customer_name, customer_email,
        ship_name, ship_phone, ship_address1, ship_city, ship_province, ship_country, ship_zip,
        subtotal_price, total_amount, financial_status, fulfillment_status,
        order_note, note_attributes,
        created_at, updated_at, shopify_created_at, shopify_updated_at
      ) VALUES (
        0, ${orderId}, ${name},
        ${input.customer?.name ?? null}, ${input.customer?.email ?? null},
        ${input.delivery.address?.name ?? null},
        ${input.delivery.address?.phone ?? null},
        ${input.delivery.address?.line1 ?? null},
        ${input.delivery.address?.city ?? null},
        ${input.delivery.address?.province ?? null},
        ${input.delivery.address?.country ?? null},
        ${input.delivery.address?.zip ?? null},
        ${subtotal}, ${total}, ${financial_status}, ${fulfillment_status},
        ${input.notes ?? null}, ${sql.json(noteAttributes)},
        ${now}, ${now}, ${now}, ${now}
      )
      RETURNING id, created_at AS "createdAt", order_id AS "orderId", name;
    `);

    const orderRow = orderIns.rows[0] as any;

    // 4) Inserta líneas
    for (const it of normalizedItems) {
      await tx.execute(sql`
        INSERT INTO order_items (order_id, sku, quantity, price, title)
        VALUES (${orderRow.id}, ${it.sku}, ${it.quantity}, ${it.unitPrice}, ${it.nombre ?? it.sku});
      `);
    }

    return [{
      id: orderRow.id,
      createdAt: orderRow.createdAt,
      orderId: orderRow.orderId,
      name: orderRow.name
    }];
  });

  const createdAtIso = (result as any).createdAt?.toISOString?.() || new Date().toISOString();

  return {
    id: Number(result.id),
    shopId: 0,
    orderId: String(result.orderId),
    name: String(result.name),
    financial_status,
    fulfillment_status,
    subtotal: Number(subtotal),
    discount_total: Number(discount_total),
    tax_total: Number(tax_total),
    shipping_total: Number(shipping_total),
    total: Number(total),
    items: normalizedItems.map(i => ({
      sku: i.sku,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      origenStock: i.origenStock,
      discountAmount: i.discountAmount
    })),
    created_at: createdAtIso,
  };
}
