// MLG-INTEGRATION
import { z } from "zod";

const MLG_BASE_URL = process.env.MLG_BASE_URL ?? "https://www.mlgdev.mx/marketplaceapi";
const MLG_EMAIL = process.env.MLG_EMAIL!;
const MLG_PASSWORD = process.env.MLG_PASSWORD!;
const MLG_TOKEN_TTL_MIN = Number(process.env.MLG_TOKEN_TTL_MIN ?? 50);

const LoginRespSchema = z.object({
  token: z.string().nullable(),
  statusCode: z.number(),
  description: z.string().nullable(),
});
type LoginResp = z.infer<typeof LoginRespSchema>;

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function login(): Promise<string> {
  console.log("MLG login starting...");
  
  const res = await fetch(`${MLG_BASE_URL}/api/account/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: MLG_EMAIL, password: MLG_PASSWORD }),
  });

  if (!res.ok) {
    throw new Error(`MLG login HTTP ${res.status}`);
  }

  const data: unknown = await res.json();
  const parsed = LoginRespSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`MLG login invalid schema`);
  }

  if (parsed.data.statusCode !== 200 || !parsed.data.token) {
    throw new Error(`MLG login failed: ${parsed.data.description ?? "no token"}`);
  }

  cachedToken = parsed.data.token;
  tokenExpiresAt = Date.now() + MLG_TOKEN_TTL_MIN * 60 * 1000; // now + TTL
  console.log("MLG login ok");
  return cachedToken;
}

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;
  return login();
}

export async function mlgRequest(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const token = await getToken();
  const res = await fetch(`${MLG_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401 && retry) {
    // re-login once
    console.log("MLG re-login on 401");
    await login();
    return mlgRequest(path, init, false);
  }
  return res;
}