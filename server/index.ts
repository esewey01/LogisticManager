// index.ts —
/*====================
CREA LA APLICACION EXPRESS, CONFIGURA MIDDLEWARE PARA RECIBIR DATOS EN JSON Y FORMULAROS REGISTRA LAS RUTAS DE LA API (register Routes) 

=================*/

// Compatibilidad fetch en runtimes sin fetch global
// import fetchOrig from "node-fetch"; // Removed problematic import
//SINCRONIZACION DE AMBAS TIENDAS
import { startSchedulers } from "./scheduler";
const _g: any = globalThis as any;
// Modern Node.js has built-in fetch
if (typeof _g.fetch !== "function") {
  console.log("Using built-in fetch");
}

// Importa Express y tipos para Tiposcript
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import fileUpload from "express-fileupload";

// Importa función que registra todas las rutas de la API
import { registerRoutes } from "./routes";

// Importa utilidades para integrar Vite (frontend) y servir archivos
import { setupVite, serveStatic, log } from "./vite";

// Crea la aplicación Express
const aplicacion = express();

// Permite credenciales y *refleja* el Origin que venga (requisito para cookies)
// ✅ Úsalo en DEV/Replit. Si quieres restringir, abajo dejo una versión con regex.
aplicacion.use(
  cors({
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
      // Permite sin Origin (curl, extensiones, etc.)
      if (!origin) return cb(null, true);
      // Refleja el origin para que el navegador acepte la cookie (no puede ser "*")
      return cb(null, true);
    },
    credentials: true,
  }),
);

// Middleware para parsear JSON en peticiones
aplicacion.use(express.json());

// Middleware para parsear datos de formularios (application/x-www-form-urlencoded)
aplicacion.use(express.urlencoded({ extended: true }));

// Middleware para subida de archivos
aplicacion.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  abortOnLimit: true
}));


// Middleware de logging personalizado - registra todas las peticiones
aplicacion.use((req, res, next) => {
  // Log simple de todas las peticiones recibidas
  //console.log(`➡️ Petición recibida: ${req.method} ${req.url}`);

  const inicio = Date.now(); // marca de tiempo al recibir la petición
  const ruta = req.path;
  let respuestaJsonCapturada: Record<string, any> | undefined = undefined;

  // Guardamos la función original de res.json
  const funcionOriginalResJson = res.json;

  // Sobreescribimos res.json para capturar lo que responde la API
  res.json = function (cuerpoJson, ...args) {
    respuestaJsonCapturada = cuerpoJson;
    return funcionOriginalResJson.apply(res, [cuerpoJson, ...args]);
  };

  // Cuando la respuesta termine...
  res.on("finish", () => {
    const duracion = Date.now() - inicio;
    if (ruta.startsWith("/api")) {
      let lineaLog = `${req.method} ${ruta} ${res.statusCode} en ${duracion}ms`;

      // Agrega el JSON devuelto (si existe)
      if (respuestaJsonCapturada) {
        lineaLog += ` :: ${JSON.stringify(respuestaJsonCapturada)}`;
      }

      // Limita la longitud del log a 80 caracteres
      if (lineaLog.length > 80) {
        lineaLog = lineaLog.slice(0, 79) + "…";
      }

      log(lineaLog); // imprime el log
    }
  });

  next(); // continúa al siguiente middleware
});

// Función autoejecutable async
(async () => {
  // Registra todas las rutas y obtiene el servidor HTTP
  const servidor = await registerRoutes(aplicacion);

  // Middleware de manejo de errores centralizado
  aplicacion.use(
    (err: any, _req: Request, res: Response, _next: NextFunction) => {
      const estado = err.status || err.statusCode || 500;
      const mensaje = err.message || "Error interno del servidor";

      res.status(estado).json({ mensaje });
      throw err; // lanza para depuración
    },
  );

  // Configura Vite solo en desarrollo, después de las rutas
  if (aplicacion.get("env") === "development") {
    await setupVite(aplicacion, servidor);
  } else {
    serveStatic(aplicacion);
  }

  // Determina el puerto (de env o 5000 por defecto)
  const puerto = parseInt(process.env.PORT || "5000", 10);

  // Inicia el servidor en todas las interfaces de red (0.0.0.0) para compatibilidad con Replit
  servidor.listen({ port: puerto, host: "0.0.0.0" }, () => {
    log(` Servidor trabajando en el puerto ${puerto}`);
    if (process.env.ENABLE_CRON === "1") {
      startSchedulers();
    } else {
      console.log("[CRON] Desactivado (ENABLE_CRON != 1)");
    }
  });
})();
