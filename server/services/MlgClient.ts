// server/services/MlgClient.ts
// MLG-INTEGRATION (validación fuerte de envs + trim + mejor logging)
import { z } from "zod";

const rawBase = process.env.MLG_BASE_URL ?? "https://www.mlgdev.mx/marketplaceapi";
const rawEmail = process.env.MLG_EMAIL ?? "";
const rawPassword = process.env.MLG_PASSWORD ?? "";
const MLG_TOKEN_TTL_MIN = Number(process.env.MLG_TOKEN_TTL_MIN ?? 50);

const MLG_BASE_URL = rawBase.trim().replace(/\/+$/, "");        // sin slash final
const MLG_EMAIL = rawEmail.trim();
const MLG_PASSWORD = rawPassword.trim();

if (!MLG_BASE_URL || !MLG_EMAIL || !MLG_PASSWORD) {
  console.error("[MLG] Faltan variables de entorno:");
  console.error("  MLG_BASE_URL:", JSON.stringify(MLG_BASE_URL));
  console.error("  MLG_EMAIL:", JSON.stringify(MLG_EMAIL));
  console.error("  MLG_PASSWORD is set?:", Boolean(MLG_PASSWORD));
  throw new Error("MLG env vars missing. Revisa tu .env y proceso del server.");
}

console.log("[MLG] BASE_URL:", MLG_BASE_URL);
console.log("[MLG] EMAIL:", MLG_EMAIL);

const LoginRespSchema = z.object({
  token: z.string().nullable(),
  statusCode: z.number().optional(),
  description: z.string().nullable().optional(),
});
type LoginResp = z.infer<typeof LoginRespSchema>;

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function doLoginAt(path: string): Promise<string> {
  const url = `${MLG_BASE_URL}${path}`;
  const payload = { email: MLG_EMAIL, password: MLG_PASSWORD };

  const res = await fetch(url, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "<no-body>");
    console.error("[MLG] login failed:", res.status, res.statusText, "URL:", url, "BODY:", text?.slice(0, 500));
    throw new Error(`MLG login HTTP ${res.status}`);
  }

  const data: unknown = await res.json().catch(() => ({}));
  const parsed = LoginRespSchema.safeParse(data);
  if (!parsed.success) {
    console.error("[MLG] login schema mismatch:", data);
    throw new Error(`MLG login invalid schema`);
  }

  const token = parsed.data.token ?? null;
  if (!token) {
    console.error("[MLG] login no token. Response:", parsed.data);
    throw new Error(`MLG login failed: ${parsed.data.description ?? "no token"}`);
  }

  cachedToken = token;
  tokenExpiresAt = Date.now() + MLG_TOKEN_TTL_MIN * 60 * 1000;
  console.log("[MLG] login ok at", path);
  return cachedToken;
}

async function login(): Promise<string> {
  console.log("MLG login starting...");
  try {
    // Ruta que te funciona en Postman
    return await doLoginAt("/api/Account/login");
  } catch (e: any) {
    if (String(e?.message).includes("HTTP 404")) {
      console.warn("[MLG] /api/Account/login → 404, intentando /Account/login");
      return await doLoginAt("/Account/login");
    }
    throw e;
  }
}

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;
  return login();
}

export async function mlgRequest(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const token = await getToken();

  const res = await fetch(`${MLG_BASE_URL}${path}`, {
    ...init,
    method: init.method ?? "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401 && retry) {
    console.log("MLG re-login on 401");
    await login();
    return mlgRequest(path, init, false);
  }

  if (res.status === 404) {
    const text = await res.text().catch(() => "<no-body>");
    console.error("[MLG] 404 at", `${MLG_BASE_URL}${path}`, "BODY:", text?.slice(0, 500));
  }

  return res;
}
