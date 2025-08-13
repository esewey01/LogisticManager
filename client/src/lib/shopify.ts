// client/src/lib/shopify.ts
const shop = process.env.SHOPIFY_SHOP_NAME!;
const token = process.env.SHOPIFY_ACCESS_TOKEN!;
const apiVersion = process.env.SHOPIFY_API_VERSION || "2024-07";

if (!shop || !token) {
  throw new Error("Faltan SHOPIFY_SHOP/SHOPIFY_ADMIN_TOKEN en el entorno");
}

const base = `https://${shop}/admin/api/${apiVersion}`;

export async function shopifyGet(path: string) {
  const res = await fetch(`${base}${path}`, {
    headers: { "X-Shopify-Access-Token": token }
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Shopify ${res.status} ${res.statusText} :: ${txt}`);
  }
  return res.json();
}
