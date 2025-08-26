// EXPRESSPL-INTEGRATION
import type { Express } from "express";
import { z } from "zod";
import { generateLabelExpressPL } from "../services/ExpressPlClient";
import { storage as almacenamiento } from "../storage";

const ReqSchema = z.object({
  orderId: z.number().int().positive(),
  observaciones: z.string().max(500).optional(),
});

// Utilidad para armar remitente fijo desde .env (ajústalo a tu negocio)
function getFixedSender() {
  return {
    claveCliente: "",
    rfc: "CSH180418DW0",
    razonsocial: "ULUM.MX",
    contacto: "ULUM.MX",
    telefono: "5519646667",
    celular: "5519646667",
    calle: "AV. BENJAMÍN FRANKLIN",
    numinterior: "302",
    numexterior: "232",
    codigoPostal: "11800",
    colonia: "HIPODROMO CONDESA",
    ciudad: "CIUDAD DE MEXICO",
    estado: "CDMX",
    email: "contacto@ulum.mx",
    pais: "MEX",
    entreCalles: "no",
    referencia: "no",
  };
}

export function registerShippingRoutes(app: Express) {
  app.post("/api/shipping/expresspl/label", async (req, res) => {
    try {
      const { orderId, observaciones } = ReqSchema.parse(req.body);

      // 1) Cargar ORDER + sus ITEMS + dimensiones desde CATALOGO_PRODUCTS
      const order = await almacenamiento.getOrderById(Number(orderId));
      if (!order) return res.status(404).json({ message: "Orden no encontrada" });

      const items = await almacenamiento.getOrderItemsForShipping(Number(orderId));
      if (!items?.length) return res.status(400).json({ message: "Orden sin items" });

      // Traer dimensiones por cada SKU
      const dimsBySku: Record<string, { alto: number; ancho: number; largo: number }> = {};
      for (const it of items) {
        const sku = (it.sku ?? "").trim();
        if (!sku) continue;
        try {
          const row = await almacenamiento.getCatalogoBySkuInterno(sku);
          dimsBySku[sku] = {
            alto: Number(row?.alto_cm ?? 10) || 10,
            ancho: Number(row?.ancho_cm ?? 10) || 10,
            largo: Number(row?.largo_cm ?? 10) || 10,
          };
        } catch (error) {
          // Si no existe en catálogo, usar defaults
          dimsBySku[sku] = { alto: 10, ancho: 10, largo: 10 };
        }
      }

      const piezas = items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0) || 1;
      // Escoge las dimensiones del primer SKU o defaults
      const firstSku = (items[0]?.sku ?? "").trim();
      const dims = dimsBySku[firstSku] ?? { alto: 10, ancho: 10, largo: 10 };

      // 2) Armar destinatario desde 'orders'
      const destinatario = {
        claveCliente: "",
        rfc: "XAXX010101000",
        razonsocial: order.customerName || "Cliente",
        contacto: order.customerName || "Cliente",
        telefono: order.phone || "",
        celular: order.phone || "",
        calle: order.shippingAddress || "",
        numinterior: "",
        numexterior: "",
        codigoPostal: order.postalCode || "",
        colonia: "",
        ciudad: order.city || "",
        estado: order.province || "",
        email: order.customerEmail || "contacto@ulum.mx",
        pais: order.country || "MEX",
        entreCalles: "no",
        referencia: order.notes || "no",
      };

      // 3) Payload Express-PL (con remitente fijo)
      const payload = {
        referencia: String(orderId),
        observaciones: observaciones ?? "",
        remitente: getFixedSender(),
        destinatario,
        paquete: {
          cantidad: piezas,
          alto: dims.alto,
          ancho: dims.ancho,
          largo: dims.largo,
          peso: 1.0,
          valor: 0.0,
          tipoMercancia: "GENERAL",
          descripcionMercancia: "MERCANCIA",
          tipoEmpaque: "P",
          asegurarlo: false,
          esmultiple: false,
          volumen: 1.0,
        },
      };

      // 4) Llamada al servicio
      const { pdfBase64, meta } = await generateLabelExpressPL(payload);

      // 5) Responder como PDF descargable
      const pdfBuffer = Buffer.from(pdfBase64, "base64");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="guia_${meta?.guia ?? orderId}.pdf"`
      );
      res.send(pdfBuffer);
    } catch (err: any) {
      console.error("Error generando guía Express-PL:", err.message);
      res.status(400).json({ 
        message: "No se pudo generar la guía", 
        error: String(err?.message ?? err) 
      });
    }
  });
}