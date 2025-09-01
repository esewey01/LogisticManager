import type { Express, Request, Response } from "express";
import { db } from "../db";
import { carriers as carriersTable, logisticServices, serviceCarriers } from "@shared/schema";

// Registra GET /api/logistics/meta
// - Devuelve services, carriers y serviceCarriers con alias camelCase correctos
// - Sin GROUP BY; 3 consultas simples
// - Manejo de errores con log a consola
export function registerLogisticsMetaRoutes(app: Express, authMiddleware: any) {
  app.get("/api/logistics/meta", authMiddleware, async (_req: Request, res: Response) => {
    try {
      const services = await db
        .select({
          id: logisticServices.id,
          code: logisticServices.code,
          name: logisticServices.name,
          // En BD es boolean 'active' ya mapeado como .active en TS
          active: (logisticServices as any).active,
        })
        .from(logisticServices);

      const carriers = await db
        .select({
          id: carriersTable.id,
          code: carriersTable.code,
          name: carriersTable.name,
          // En BD es is_active; exponemos como 'active' en la API
          active: carriersTable.isActive,
        })
        .from(carriersTable);

      const links = await db
        .select({
          serviceId: serviceCarriers.serviceId,
          carrierId: serviceCarriers.carrierId,
        })
        .from(serviceCarriers);

      res.json({ services, carriers, serviceCarriers: links });
    } catch (err: any) {
      console.error("[logistics/meta] Error:", err?.message || err);
      res.status(500).json({ message: "Error interno al obtener catálogos" });
    }
  });
}

