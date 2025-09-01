// server/integrations/mercadoLibre.ts
// Búsqueda pública de Mercado Libre (México por defecto: MLM)

export type Marketplace = "mercado_libre" | "amazon";

export interface MarketplaceResult {
  marketplace: Marketplace;
  id: string;
  title: string;
  price: number;
  currency: string;
  permalink: string;
  thumbnail?: string;
  seller?: string;
  available_quantity?: number;
}

export async function searchMercadoLibre(query: string, limit = 20): Promise<MarketplaceResult[]> {
  const site = process.env.ML_SITE_ID || "MLM"; // MX: MLM, AR: MLA, etc.
  const url = `https://api.mercadolibre.com/sites/${site}/search?q=${encodeURIComponent(query)}&limit=${limit}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`MercadoLibre search failed: ${res.status}`);
  }
  const json = await res.json();

  const items: MarketplaceResult[] = (json?.results ?? []).map((r: any) => ({
    marketplace: "mercado_libre",
    id: String(r.id),
    title: String(r.title ?? ""),
    price: Number(r.price ?? 0),
    currency: String(r.currency_id ?? "MXN"),
    permalink: String(r.permalink ?? ""),
    thumbnail: r?.thumbnail ? String(r.thumbnail) : r?.thumbnail_id ? String(r.thumbnail_id) : undefined,
    seller: r?.seller?.nickname ?? undefined,
    available_quantity: typeof r?.available_quantity === "number" ? r.available_quantity : undefined,
  }));

  return items;
}

