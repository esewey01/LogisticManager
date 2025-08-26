// EXPRESSPL-INTEGRATION
import { setTimeout as delay } from "timers/promises";

const BASE_URL = process.env.EXPRESSPL_BASE_URL!;
const LOGIN = process.env.EXPRESSPL_LOGIN!;
const PASSWORD = process.env.EXPRESSPL_PASSWORD!;
const NUMCLIENTE = process.env.EXPRESSPL_NUMCLIENTE!;
const IDMENSAJERIA = process.env.EXPRESSPL_IDMENSAJERIA!;
const IDSERVICIO = process.env.EXPRESSPL_IDSERVICIO!;
const TIMEOUT = Number(process.env.EXPRESSPL_TIMEOUT_MS ?? 30000);

function withTimeout<T>(p: Promise<T>, ms: number) {
  let t: NodeJS.Timeout;
  return Promise.race([
    p.finally(() => clearTimeout(t)),
    new Promise<T>((_, rej) => (t = setTimeout(() => rej(new Error(`Timeout ${ms}ms`)), ms))),
  ]);
}

export async function generateLabelExpressPL(payload: any) {
  // El payload que llega ya debe contener remitente/destinatario/paquete
  // Inyectamos credenciales base si no vienen:
  const body = {
    login: LOGIN,
    password: PASSWORD,
    numcliente: NUMCLIENTE,
    idmensajeria: IDMENSAJERIA,
    idservicio: IDSERVICIO,
    ...payload,
  };

  const res = await withTimeout(
    fetch(`${BASE_URL}/generarguia`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    TIMEOUT
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`ExpressPL HTTP ${res.status}: ${text}`);
  }

  const json = await res.json().catch(() => null);
  if (!json || json.codigo !== "200" || !json.pdf) {
    const msg = json?.mensaje || "Respuesta inválida de Express-PL";
    throw new Error(`ExpressPL error: ${msg}`);
  }

  // Devuelve base64 y metadatos si existen
  return {
    pdfBase64: json.pdf as string,
    meta: {
      guia: json.numeroGuia,
      paqueteria: json.paqueteria,
    },
  };
}