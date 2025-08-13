// Utilidades de integración Vite ↔ Express 


import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

// Logger base de Vite (para reutilizar formato y niveles)
const viteLogger = createLogger();

/**
 * log — Imprime mensajes con hora y etiqueta de origen.
 * @param message Mensaje a imprimir
 * @param source  Módulo que origina el mensaje (por defecto "express")
 */
export function log(message: string, source = "express") {
  const horaFormateada = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  //ORIGINAL/console.log(`${horaFormateada} [${source}] ${message}`);
  console.log(`${horaFormateada} ${message}`);
}

/**
 * setupVite — Modo desarrollo: monta Vite como middleware dentro de Express.
 * - Habilita HMR (recarga en caliente) reutilizando el mismo servidor HTTP.
 * - Transforma index.html en tiempo real y controla caché del entry point.
 */
export async function setupVite(app: Express, server: Server) {
  // Opciones del servidor de Vite en modo middleware
  const opcionesServidor = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  // Crea la instancia de Vite con la configuración del proyecto
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false, // usamos el objeto importado, no buscar vite.config.* en disco
    customLogger: {
      ...viteLogger,
      // Si Vite reporta un error crítico, mostramos y salimos (evita estados raros)
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: opcionesServidor,
    appType: "custom", // indicamos que el servidor de la app lo controlamos nosotros
  });

  // Inyecta los middlewares de Vite en Express (sirve assets, HMR, etc.)
  app.use(vite.middlewares);

  // Para cualquier ruta, servimos el index.html procesado por Vite
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      // Ruta al index.html del cliente (sin build, archivo fuente)
      const rutaPlantilla = path.resolve(
        (import.meta as any).dirname,
        "..",
        "client",
        "index.html",
      );

      // Siempre recargamos desde disco por si el archivo cambió
      let plantilla = await fs.promises.readFile(rutaPlantilla, "utf-8");

      // Evita caché del entry point del cliente agregando un query param aleatorio
      plantilla = plantilla.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );

      // Deja que Vite transforme/injecte lo necesario en el HTML
      const pagina = await vite.transformIndexHtml(url, plantilla);

      res.status(200).set({ "Content-Type": "text/html" }).end(pagina);
    } catch (e) {
      // Mejora el stack trace para DX y delega al manejador de errores de Express
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

/**
 * serveStatic — Modo producción: sirve archivos estáticos ya construidos.
 * - Requiere haber corrido el build del cliente previamente.
 * - Ofrece fallback a index.html para rutas de SPA.
 */
export function serveStatic(app: Express) {
  // Carpeta con el build estático del cliente
  const rutaDist = path.resolve((import.meta as any).dirname, "public");

  // Validación: si no existe la carpeta de build, avisamos claramente
  if (!fs.existsSync(rutaDist)) {
    throw new Error(
      `No se encontró el directorio de build: ${rutaDist}. Asegúrate de compilar el cliente primero.`,
    );
  }

  // Sirve archivos estáticos (JS/CSS/imagenes) desde /public
  app.use(express.static(rutaDist));

  // Fallback: si no hay archivo físico, responde index.html (SPA routing)
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(rutaDist, "index.html"));
  });
}
