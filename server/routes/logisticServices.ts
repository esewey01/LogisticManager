import type { Express, Request, Response } from "express";
import { db } from "../db";
import { logisticServices } from "@shared/schema";

// Registra GET /api/logistic-services
// - Devuelve { services } con alias correctos y manejo de errores
export function registerLogisticServicesRoutes(app: Express, authMiddleware: any) {
  app.get("/api/logistic-services", authMiddleware, async (_req: Request, res: Response) => {
    try {
      const services = await db
        .select({
          id: logisticServices.id,
          code: logisticServices.code,
          name: logisticServices.name,
          active: (logisticServices as any).active,
        })
        .from(logisticServices);

      res.json({ services });
    } catch (err: any) {
      console.error("[logistic-services] Error:", err?.message || err);
      res.status(500).json({ message: "Error interno al obtener catálogos" });
    }
  });
}

