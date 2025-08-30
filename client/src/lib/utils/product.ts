// client/src/lib/utils/product.ts

// Regex usada para detectar Combos:
// - Cubre tokens como: "Com...", "1-Com0032", "ComABC_2"
// - Es case-insensitive y busca límite de palabra
// Ejemplos cubiertos: Com, Com1, Com0032, 1-Com0032, ComABC_2, x-Com9_12
// No coincide con palabras donde "Com" es parte de otra palabra más larga sin separación alfanumérica.
const COMBO_RE = /\bCom[a-zA-Z0-9]*(_\d+)?\b/i;

export function isCombo(skuInterno?: string | null): boolean {
  if (!skuInterno) return false;
  return COMBO_RE.test(String(skuInterno));
}

// Calcula peso volumétrico (cm, divisor configurable por paquetería: 5000/6000)
// Fórmula: (largo * ancho * alto) / divisor
export function calcVolumetric(
  largo?: number | null,
  ancho?: number | null,
  alto?: number | null,
  divisor: number = 5000,
): number {
  const l = Number(largo ?? 0);
  const a = Number(ancho ?? 0);
  const h = Number(alto ?? 0);
  const d = Number(divisor || 5000);
  if (!Number.isFinite(l) || !Number.isFinite(a) || !Number.isFinite(h) || !Number.isFinite(d) || d <= 0) return 0;
  const v = (l * a * h) / d;
  return Number.isFinite(v) && v >= 0 ? v : 0;
}

// Peso facturable sugerido
export function calcChargeable(pesoReal?: number | null, pesoVol?: number | null): number {
  const r = Number(pesoReal ?? 0);
  const v = Number(pesoVol ?? 0);
  const rr = Number.isFinite(r) && r >= 0 ? r : 0;
  const vv = Number.isFinite(v) && v >= 0 ? v : 0;
  return Math.max(rr, vv);
}

export function formatKg(n?: number | null): string {
  const nn = Number(n ?? 0);
  return `${(Number.isFinite(nn) ? nn : 0).toFixed(2)} kg`;
}

export function formatCurrencyMX(n?: number | null): string {
  const nn = Number(n ?? 0);
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number.isFinite(nn) ? nn : 0);
}

export function isLikelyUrl(s?: string | null): boolean {
  if (!s) return false;
  try {
    const u = new URL(s);
    return !!u.protocol && !!u.host;
  } catch {
    return false;
  }
}

