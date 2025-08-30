                    await tx.execute(sql`
                      UPDATE catalogo_productos
                      SET nombre_producto = ${nombre}, costo = ${costoNum}, stock = ${stockNum}, sku_interno = ${sku_interno || null}, marca = ${marca}, categoria = ${categoria}
                      WHERE sku = ${sku}
                    `);
                    updated++;
                  } else {
                    await tx.execute(sql`
                      INSERT INTO catalogo_productos (sku, sku_interno, nombre_producto, costo, stock, marca, categoria)
                      VALUES (${sku || null}, ${sku_interno || null}, ${nombre}, ${costoNum}, ${stockNum}, ${marca}, ${categoria})
                    `);
                    inserted++;
                  }
                } else {
                  // No sku externo, insert con sku_interno al menos
                  await tx.execute(sql`
                    INSERT INTO catalogo_productos (sku, sku_interno, nombre_producto, costo, stock, marca, categoria)
                    VALUES (${null}, ${sku_interno || null}, ${nombre}, ${costoNum}, ${stockNum}, ${marca}, ${categoria})
                  `);
                  inserted++;
                }
              } catch (e: any) {
                // Provoca rollback del lote completo
                errors.push({ rowIndex, message: e?.message || 'Error desconocido' });
                throw e;
              }
            }
          });
        } catch (e) {
          // Lote falló y se revirtió; continuar con el siguiente
          continue;
        }
      }

      // Generar CSV de errores si existen
      let reportBase64: string | undefined;
      if (errors.length) {
        const h = 'rowIndex,message';
        const lines = [h, ...errors.map((e) => `${e.rowIndex},"${String(e.message).replace(/"/g,'""')}"`)];
        const csv = lines.join('\n');
        reportBase64 = Buffer.from(csv, 'utf8').toString('base64');
      }

      res.json({ inserted, updated, errors: errors.length, errorRows: errors, reportBase64 });
    } catch (error: any) {
      console.error('Error en POST /api/catalogo/import:', error);
      res.status(500).json({ message: error?.message || 'Error al importar catálogo' });
    }
  });

  // Filtro de marcas unificado: union de products.vendor y catalogo_productos.marca
  app.get("/api/orders/brands", requiereAutenticacion, async (req, res) => {
    try {
      const shopIdRaw = (req.query.shopId ?? req.query.channelId) as string | undefined;
      const shopId = shopIdRaw && shopIdRaw !== 'all' ? Number(shopIdRaw) : undefined;
      const result = await baseDatos.execute(sql`
        (
          SELECT DISTINCT TRIM(COALESCE(p.vendor, '')) AS marca
          FROM products p
          ${shopId !== undefined ? sql`WHERE p.vendor IS NOT NULL AND p.vendor <> '' AND p.shop_id = ${shopId}` : sql`WHERE p.vendor IS NOT NULL AND p.vendor <> ''`}
        )
        UNION
        (
          SELECT DISTINCT TRIM(COALESCE(cp.marca, '')) AS marca
          FROM catalogo_productos cp
          WHERE cp.marca IS NOT NULL AND cp.marca <> ''
        )
        ORDER BY marca ASC
      `);
      const brands = (result.rows || [])
        .map((r: any) => r.marca)
        .filter((s: any) => typeof s === 'string' && s.trim().length > 0);
      res.json(brands);
    } catch (e) {
      res.status(500).json({ message: 'No se pudieron obtener marcas' });
    }
  });

  // Flags: unmapped y stock cero por orden
  app.get("/api/orders/:id/flags", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "ID de orden inválido" });
      }

      const q = sql`
        SELECT
          -- Ítems sin mapeo
          EXISTS (
            SELECT 1
            FROM order_items oi
            LEFT JOIN LATERAL (
              SELECT cp.*
              FROM catalogo_productos cp
              WHERE oi.sku IS NOT NULL AND (
                lower(cp.sku_interno) = lower(oi.sku) OR lower(cp.sku) = lower(oi.sku)
              )
              ORDER BY (lower(cp.sku_interno) = lower(oi.sku)) DESC,
                       (lower(cp.sku) = lower(oi.sku)) DESC
              LIMIT 1
            ) cp ON TRUE
            WHERE oi.order_id = ${id}
              AND cp.sku IS NULL AND cp.sku_interno IS NULL
          ) AS has_unmapped,

          -- Ítems con stock de marca en cero
          EXISTS (
            SELECT 1
            FROM order_items oi
            LEFT JOIN LATERAL (
              SELECT cp.*
              FROM catalogo_productos cp
              WHERE oi.sku IS NOT NULL AND (
                lower(cp.sku_interno) = lower(oi.sku) OR lower(cp.sku) = lower(oi.sku)
              )
              ORDER BY (lower(cp.sku_interno) = lower(oi.sku)) DESC,
                       (lower(cp.sku) = lower(oi.sku)) DESC
              LIMIT 1
            ) cp ON TRUE
            WHERE oi.order_id = ${id}
              AND cp.stock = 0
          ) AS has_zero_stock
      `;
      const r = await baseDatos.execute(q);
      const row = (r.rows as any[])[0] || {};
      res.json({ has_unmapped: !!row.has_unmapped, has_zero_stock: !!row.has_zero_stock });
    } catch (e: any) {
      res.status(500).json({ message: e?.message || "No se pudieron calcular flags" });
    }
  });



  app.get("/api/orders/:id", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      console.log(`[GET /api/orders/:id] Solicitando orden ID: ${id}`);

      if (Number.isNaN(id)) {
        return res.status(400).json({ message: "ID de orden inválido" });
      }

      const orden = await almacenamiento.getOrder(id);
      console.log(`[GET /api/orders/:id] Orden encontrada:`, !!orden);

      if (!orden) {
        return res.status(404).json({ message: "Orden no encontrada" });
      }
      res.json(jsonSafe(orden));
    } catch (error) {
      console.error(`[GET /api/orders/:id] Error:`, error);
      res.status(500).json({ message: "No se pudo obtener la orden" });
    }
  });

  app.get("/api/orders/:orderId/items", requiereAutenticacion, async (req, res) => {
    const orderId = Number(req.params.orderId);
    console.log(`[DEBUG] Solicitando items para order ID: ${orderId}`);

    if (!Number.isFinite(orderId)) {
      console.log(`[DEBUG] Order ID inválido: ${req.params.orderId}`);
      return res.status(400).json({ message: "orderId inválido" });
    }

    try {
      const items = await almacenamiento.getOrderItems(orderId);
      console.log(`[DEBUG] Items retornados:`, items);
      res.json(jsonSafe({ items }));
    } catch (e: any) {
      console.error("[items] Error:", e?.message);
      res.status(500).json({ message: "No se pudieron obtener items" });
    }
  });

  // Reasignación de SKU para un item de una orden
  app.put("/api/orders/:orderId/items/:itemId/sku", requiereAutenticacion, async (req, res) => {
    try {
      const orderId = Number(req.params.orderId);
      const itemId = Number(req.params.itemId);
      if (!Number.isInteger(orderId) || orderId <= 0 || !Number.isInteger(itemId) || itemId <= 0) {
        return res.status(400).json({ message: "Parámetros inválidos" });
      }

      const bodySchema = z.object({ sku: z.string().min(1) });
      const { sku } = bodySchema.parse(req.body);

      const existsQ = sql`
        SELECT 1 FROM catalogo_productos cp
        WHERE lower(cp.sku_interno) = lower(${sku}) OR lower(cp.sku) = lower(${sku})
        LIMIT 1
      `;
      const exists = await baseDatos.execute(existsQ);
      if (!exists.rows.length) {
        return res.status(400).json({ message: "SKU no existe en catálogo" });
      }

      const upd = sql`
        UPDATE order_items SET sku = ${sku}
        WHERE id = ${itemId} AND order_id = ${orderId}
      `;
      await baseDatos.execute(upd);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(400).json({ message: e?.message || "No se pudo reasignar el SKU" });
    }
  });

  app.post("/api/orders/:id/cancel", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id))
        return res.status(400).json({ message: "ID de orden inválido" });

      const orden = await almacenamiento.getOrder(id);
      if (!orden) return res.status(404).json({ ok: false, errors: "Orden no encontrada" });

      // [cancel-order] Evita cancelar nuevamente si ya aparece cancelada
      if ((orden as any).shopifyCancelledAt) {
        return res.status(400).json({ ok: false, errors: "La orden ya está cancelada" });
      }

      const { reason, staffNote, notifyCustomer, restock, refundToOriginal } = req.body;
      const gid = (orden.orderId && orden.orderId.startsWith("gid://"))
        ? orden.orderId
        : `gid://shopify/Order/${orden.orderId || orden.id}`;

      // [cancel-order] Nuevo flujo con polling y actualización segura en BD
      {
        if (orden.shopId !== 1 && orden.shopId !== 2) {
          return res.status(400).json({ ok: false, errors: "La orden no corresponde a Shopify (shopId 1 o 2)" });
        }

        const reasonEff = typeof reason === 'string' && reason ? reason : 'OTHER';
        const staffNoteEff = typeof staffNote === 'string' ? staffNote : '';
        const notifyCustomerEff = (notifyCustomer === undefined ? true : !!notifyCustomer);
        const restockEff = (restock === undefined ? true : !!restock);
        const refundEff = !!refundToOriginal;

        console.log("[cancel-order] start", { id, gid, reason: reasonEff });

        const { cancelShopifyOrderAndWait } = await import("./integrations/shopify/cancelOrder");
        const result = await cancelShopifyOrderAndWait({
          shopId: orden.shopId,
          orderGid: gid,
          reason: reasonEff,
          staffNote: staffNoteEff,
          notifyCustomer: notifyCustomerEff,
          restock: restockEff,
          refundToOriginal: refundEff,
        });

        if (!result.ok) {
          console.warn("[cancel-order] shopify failed", result);
          return res.status(400).json({ ok: false, errors: (result as any).errors || [{ message: "Cancelación no confirmada en Shopify" }], stage: (result as any).stage });
        }

        const o = (result as any).order;
        const { markOrderCancelledSafe } = await import("./storage");
        await markOrderCancelledSafe(id, {
          cancelledAt: o?.cancelledAt || null,
          cancelReason: o?.cancelReason || reasonEff || null,
          staffNote: staffNoteEff || null,
          displayFinancialStatus: o?.displayFinancialStatus || null,
          displayFulfillmentStatus: o?.displayFulfillmentStatus || null,
        });

        return res.json({ ok: true, order: o });
      }

      // legacy fallback removed in favor of helper with job polling
    } catch (e: any) {
      console.error("cancel order", e?.message);
      res.status(500).json({ ok: false, errors: e?.message });
    }
  });

  app.post("/api/orders", requiereAutenticacion, async (req, res) => {
    try {
      const datosOrden = insertOrderSchema.parse(req.body); // validación Zod
      const orden = await almacenamiento.createOrder(datosOrden);
      res.status(201).json(orden);
    } catch {
      res.status(400).json({ message: "Datos de orden inválidos" });
    }
  });

  app.patch("/api/orders/:id", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id))
        return res.status(400).json({ message: "ID de orden inválido" });

      const orden = await almacenamiento.updateOrder(id, req.body);
      res.json(orden);
    } catch {
      res.status(400).json({ message: "No se pudo actualizar la orden" });
    }
  });


  //ORDENES IMPORTACION Y EXPORTACION VIA EXCEL
  // Body: { selectedIds?: (number|string)[], statusFilter?, channelId?, search?, searchType? }
  // Si no hay selectedIds, usa los filtros actuales para exportar lo visible (page/pageSize opcional).
  // ———————————————————————————————————
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
      const allowed = new Set([
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
        "application/csv",
      ]);
      const ok = allowed.has(file.mimetype);
      if (!ok) return cb(new Error("415: Tipo de archivo no soportado. Sube CSV o Excel (.xlsx/.xls)."));
      cb(null, true);
    },
  });

  app.post(
    "/api/orders/import",
    requiereAutenticacion,
    upload.single("file"),
    async (req: Request & { file?: Express.Multer.File }, res: Response) => {
      try {
        // gracias a @types/multer, req.file existe:
        if (!req.file?.buffer) {
          return res.status(400).json({ message: "No se recibió archivo" });
        }

        const wb = xlsx.read(req.file.buffer, { type: "buffer" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        if (!ws) return res.status(400).json({ message: "El Excel no tiene hojas" });

        const rawRows = xlsx.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null, raw: true });
        // Validación de columnas mínimas según modo (A: items JSON, B: filas por ítem)
        {
          const firstRow = rawRows[0] ?? {};
          const modeA = Object.prototype.hasOwnProperty.call(firstRow, "items");
          const requiredA = ["shopId", "orderId", "items"];
          const requiredB = ["shopId", "orderId", "sku", "quantity"];
          const required = modeA ? requiredA : requiredB;
          const missing = required.filter((c) => !(c in firstRow));
          if (missing.length) {
            return res.status(400).json({
              message: "Faltan columnas obligatorias",
              missing,
              requiredTemplate: (modeA ? requiredA : requiredB).concat([
                "name", "orderNumber", "customerName", "customerEmail",
                "subtotalPrice", "totalAmount", "currency", "financialStatus", "fulfillmentStatus",
                "tags", "createdAt", "shopifyCreatedAt",
                ...(modeA ? [] : ["price", "cost", "itemCurrency", "title"])
              ]),
            });
          }
        }

        // Validar columnas mínimas
        const requiredColumns = ["shopId", "orderId"];
        const firstRow = rawRows[0] ?? {};
        const missing = requiredColumns.filter((c) => !(c in firstRow));
        if (missing.length) {
          return res.status(400).json({
            message: "Faltan columnas obligatorias",
            missing,
            requiredTemplate: requiredColumns.concat([
              "name", "orderNumber", "customerName", "customerEmail",
              "subtotalPrice", "totalAmount", "currency", "financialStatus", "fulfillmentStatus",
              "tags", "createdAt", "shopifyCreatedAt", "items", "skus"
            ]),
          });
        }

        const { results, summary } = await almacenamiento.importOrdersFromRows(rawRows);
        return res.json({
          ...summary,
          errors: results
            .filter((r) => r.status === "error")
            .map((r) => ({ rowIndex: r.rowIndex, message: r.message, field: r.field, value: r.value })),
        });
      } catch (err: any) {
        console.error("❌ Import error:", err);
        res.status(500).json({ message: err?.message || "Error en la importación" });
      }
    }
  );


  app.post("/api/orders/export", requiereAutenticacion, async (req: Request, res: Response) => {
    try {
      const {
        selectedIds,
        statusFilter = "unmanaged",
        channelId,
        search,
        searchType,
        page,
        pageSize,
        sortField,
        sortOrder,
      } = (req.body ?? {}) as {
        selectedIds?: (number | string)[];
        statusFilter?: "unmanaged" | "managed" | "all";
        channelId?: number | string;
        search?: string;
        searchType?: "all" | "sku" | "customer" | "product";
        page?: number;
        pageSize?: number;
        sortField?: string;
        sortOrder?: "asc" | "desc";
      };

      const rows = await almacenamiento.getOrdersForExport({
        selectedIds,
        statusFilter,
        channelId: channelId ? Number(channelId) : undefined,
        search,
        searchType,
        page,
        pageSize,
        sortField,
        sortOrder,
      });

      const data = rows.map((o: any) => ({
        shopId: o.shopId,
        orderId: o.orderId,
        name: o.name,
        orderNumber: o.orderNumber ?? null,
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        subtotalPrice: o.subtotalPrice ?? null,
        totalAmount: o.totalAmount ?? null,
        currency: o.currency ?? null,
        financialStatus: o.financialStatus ?? null,
        fulfillmentStatus: o.fulfillmentStatus ?? null,
        tags: Array.isArray(o.tags) ? o.tags.join(",") : o.tags ?? "",
        createdAt: o.createdAt ? new Date(o.createdAt) : null,
        shopifyCreatedAt: o.shopifyCreatedAt ? new Date(o.shopifyCreatedAt) : null,
        itemsCount: o.itemsCount ?? 0,
        skus: Array.isArray(o.skus) ? o.skus.join(",") : "",
      }));

      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.json_to_sheet(data, { dateNF: "yyyy-mm-dd hh:mm:ss" });
      xlsx.utils.book_append_sheet(wb, ws, "orders");
      const buf = xlsx.write(wb, { bookType: "xlsx", type: "buffer" });

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="ordenes_${new Date().toISOString().slice(0, 10)}.xlsx"`);
      res.send(buf);
    } catch (err: any) {
      console.error("❌ Export error:", err);
      res.status(500).json({ message: "No se pudo exportar el Excel" });
    }
  });





  // ---------- Tickets ----------
  // routes.ts
  app.get("/api/tickets", requiereAutenticacion, async (_req, res) => {
    try {
      const rows = await almacenamiento.getTicketsView();

      // Si en algún lado quedara BigInt, lo volvemos JSON-safe por si acaso
      const safe = JSON.parse(JSON.stringify(rows, (_, v) => (typeof v === "bigint" ? v.toString() : v)));

      res.json(safe);
    } catch (e: any) {
      res.status(400).json({ message: e?.message || "No se pudieron obtener los tickets" });
    }
  });

  // 🔧 Elimina la definición duplicada de POST /api/tickets/bulk (dejando solo una).



  app.post("/api/tickets", requiereAutenticacion, async (req, res) => {
    try {
      const datos = insertTicketSchema.parse(req.body); // { orderId, notes? }
      const ticket = await almacenamiento.createTicketAndFulfill({
        orderId: datos.orderId,
        notes: datos.notes,
      });

      // 🔥 Convierte BigInt → string antes de mandar al cliente
      const safeTicket = JSON.parse(
        JSON.stringify(ticket, (_, v) => (typeof v === "bigint" ? v.toString() : v))
      );

      res.status(201).json(safeTicket);
    } catch (e: any) {
      const msg = e?.message || "No se pudo crear el ticket";
      const isShopify = /Shopify (GET|POST)/i.test(msg);
      res.status(isShopify ? 502 : 400).json({ message: msg });
    }
  });



  // Crear tickets masivos
  app.post("/api/tickets/bulk", requiereAutenticacion, async (req, res) => {
    try {
      const { orderIds, notes } = createBulkTicketsSchema.parse(req.body);

      console.log(`🎫 Creando tickets masivos para ${orderIds.length} órdenes...`);
      const resultado = await almacenamiento.createBulkTickets(orderIds, notes);

      const mensaje = `Tickets creados: ${resultado.tickets.length}. Órdenes actualizadas: ${resultado.updated}. Fallidas: ${resultado.failed.length}`;

      res.status(201).json({
        ok: true,
        message: mensaje,
        tickets: resultado.tickets,
        ordersUpdated: resultado.updated,
        failed: resultado.failed,
      });
    } catch (error: any) {
      console.error("❌ Error creando tickets masivos:", error);
      res.status(500).json({
        ok: false,
        message: "Error interno al crear tickets masivos",
        error: error?.message
      });
    }
  });

  // Eliminar ticket por ID
  app.delete("/api/tickets/:id", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await almacenamiento.deleteTicket(id);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(400).json({ ok: false, message: e?.message || "No se pudo eliminar el ticket" });
    }
  });

  // Revertir ticket (borrar + revertir fulfillment local; opcional Shopify)
  app.post("/api/tickets/:id/revert", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const revertShopify = req.query.revertShopify === "1" || req.body?.revertShopify === true;
      const r = await almacenamiento.revertTicket(id, { revertShopify });
      res.json(r);
    } catch (e: any) {
      res.status(400).json({ ok: false, message: e?.message || "No se pudo revertir el ticket" });
    }
  });

  //Feedback de ticket
  app.post("/api/tickets/bulk", requiereAutenticacion, async (req, res) => {
    try {
      const { orderIds, notes } = createBulkTicketsSchema.parse(req.body);
      const r = await almacenamiento.createBulkTickets(orderIds, notes);

      // BigInt-safe por si algún field viene en bigint
      const safe = JSON.parse(JSON.stringify(r, (_, v) => (typeof v === "bigint" ? v.toString() : v)));

      res.status(201).json({
        ok: true,
        message: `Tickets creados: ${safe.tickets.length}. Órdenes marcadas fulfilled: ${safe.updated}. Fallidas: ${safe.failed.length}`,
        ...safe,
      });
    } catch (e: any) {
      res.status(400).json({ ok: false, message: e?.message || "Error al crear tickets masivos" });
    }
  });




  // ---------- Catálogos: Canales, Marcas, Paqueterías ----------
  app.get("/api/channels", requiereAutenticacion, async (_req, res) => {
    try {
      const canales = await almacenamiento.getChannels();
      res.json(canales);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener canales" });
    }
  });

  app.get("/api/brands", requiereAutenticacion, async (_req, res) => {
    try {
      const marcas = await almacenamiento.getBrands();
      res.json(marcas);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener marcas" });
    }
  });

  app.get("/api/carriers", requiereAutenticacion, async (_req, res) => {
    try {
      const paqueterias = await almacenamiento.getCarriers();
      res.json(paqueterias);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener paqueterías" });
    }
  });

  // ---------- Notas ----------
  app.get("/api/notes", requiereAutenticacion, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const notas = await almacenamiento.getUserNotes(userId);

      const mapped = notas?.map((n) => ({
        id: n.id,
        content: n.content,
        date: new Date(n.createdAt!).toISOString().split('T')[0], // Para el calendario
        createdAt: n.createdAt,
      })) ?? [];

      res.json(mapped);
    } catch (error) {
      console.log('Error en GET /api/notes:', error);
      res.status(500).json([]);
    }
  });

  app.post("/api/notes", requiereAutenticacion, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { content } = insertNoteSchema.parse(req.body);

      console.log('Creando nota para usuario:', userId, 'con contenido:', content);

      const nota = await almacenamiento.createNote({
        userId: userId,
        content,
      });

      console.log('Nota creada:', nota);
      res.status(201).json({
        id: nota.id,
        content: nota.content,
        date: new Date(nota.createdAt!).toISOString().split('T')[0],
        createdAt: nota.createdAt
      });
    } catch (error) {
      console.log('Error en POST /api/notes:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Datos de nota inválidos", errors: error.errors });
      }
      res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  app.put("/api/notes/:id", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { text } = req.body as { text?: string };
      if (!id || !text || !text.trim()) return res.status(400).json({ message: "Texto inválido" });

      await almacenamiento.updateNote(id, { content: text.trim() });
      res.json({ ok: true });
    } catch {
      res.status(500).json({ message: "No se pudo actualizar la nota" });
    }
  });

  app.delete("/api/notes/:id", requiereAutenticacion, async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id))
        return res.status(400).json({ message: "ID de nota inválido" });

      await almacenamiento.deleteNote(id);
      res.status(204).send();
    } catch {
      res.status(500).json({ message: "No se pudo eliminar la nota" });
    }
  });

  // ---------- Productos ----------
  app.get("/api/products", requiereAutenticacion, async (req, res) => {
    try {
      const shopId = Number(req.query.shopId);
      const page = req.query.page ? Number(req.query.page) : 1;
      const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 15;
      const data = await almacenamiento.getProductsPaginated({ page, pageSize });
      res.json(data);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener productos" });
    }
  });

  app.get("/api/catalog-products", requiereAutenticacion, async (req, res) => {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 15;
      const data = await almacenamiento.getCatalogProductsPaginated(page, pageSize);
      res.json(data);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener productos" });
    }
  });

  // Búsqueda simple en catálogo por sku/sku_interno/nombre (case-insensitive)
  app.get("/api/catalogo/search", requiereAutenticacion, async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      if (!q) return res.json([]);
      const pattern = `%${q.toLowerCase()}%`;
      const r = await baseDatos.execute(sql`
        SELECT sku, sku_interno, nombre_producto, costo, stock
        FROM catalogo_productos
        WHERE lower(sku) LIKE ${pattern}
           OR lower(sku_interno) LIKE ${pattern}
           OR lower(nombre_producto) LIKE ${pattern}
        LIMIT 20
      `);
      res.json(r.rows);
    } catch (e: any) {
      res.status(500).json({ message: e?.message || "Error en búsqueda de catálogo" });
    }
  });

  // TODO: /api/external-products endpoint removed — external_products not in current schema

  // ---------- Admin ----------
  app.get("/api/admin/users", requiereAdmin, async (_req, res) => {
    try {
      const usuarios = await almacenamiento.getAllUsers();
      res.json(usuarios);
    } catch {
      res.status(500).json({ message: "No se pudieron obtener usuarios" });
    }
  });

  // ========== INTEGRACIÓN SHOPIFY COMPLETA ==========

  // PING SHOPIFY CON CONTEO DE ÓRDENES
  app.get("/api/integrations/shopify/ping-count", requiereAutenticacion, async (req, res) => {
    try {
      const storeParam = (req.query.store as string) || '1';
      const result = await getOrdersCount(storeParam);

      return res.json({
        ok: true,
        store: result.store,
        shop: result.shop,
        count: result.count,
        apiVersion: getShopifyCredentials(String(storeParam)).apiVersion,
      });
    } catch (e: any) {
      console.log(`❌ Error en ping count: ${e.message}`);
      res.status(500).json({ ok: false, error: e.message });
    }
  });
  // Backfill inicial de órdenes
  app.post("/api/integrations/shopify/orders/backfill", requiereAutenticacion, async (req, res) => {
    try {
      const storeParam = (req.query.store as string) || '1';
      const since = req.query.since as string | undefined;
      const cursor = (req.query.cursor as string) || undefined;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await syncShopifyOrdersBackfill({
        store: storeParam,
        since,
        pageInfo: cursor,
        limit,
      });

      if (result.ok) {
        res.json({
          ok: true,
          message: `Backfill completado para tienda ${storeParam}`,
          summary: result.summary,
          hasNextPage: result.hasNextPage,
          nextPageInfo: result.nextPageInfo,
        });
      } else {
        res.status(500).json({ ok: false, message: `Backfill falló para tienda ${storeParam}` });
      }
    } catch (e: any) {
      console.log(`❌ Error en backfill: ${e.message}`);
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // Sincronización manual de órdenes (botón "Sincronizar ahora")
  app.post("/api/integrations/shopify/sync-now", requiereAutenticacion, async (req, res) => {
    try {
      console.log('🔄 Iniciando sincronización manual de Shopify...');

      // Usar la función existente syncShopifyOrders
      const resultado = await syncShopifyOrders({ store: "all", limit: 50 });

      console.log('✅ Sincronización manual completada');

      res.json({
        ok: true,
        message: "Sincronización completada exitosamente",
