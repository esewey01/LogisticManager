// shopifyFulfillment.ts
import { getShopifyCredentials } from "./shopifyEnv";
import pRetry from 'p-retry';


/** Helpers HTTP (ajusta a tus helpers reales) */
async function shopifyRestGet<T>(storeNumber: number, path: string): Promise<T> {
  const { shop, token, apiVersion } = getShopifyCredentials(String(storeNumber));
  const base = `https://${shop}/admin/api/${apiVersion}`;
  const r = await fetch(`${base}${path}`, {
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
      "User-Agent": "LogisticManager/1.0 (+node)",
    },
  });
  const text = await r.text();
  if (!r.ok) {
    throw new Error(`Shopify GET ${path} => ${r.status} ${r.statusText} :: ${text.slice(0, 400)}`);
  }
  return JSON.parse(text) as T;
}

async function shopifyRestPost<T>(storeNumber: number, path: string, body: any): Promise<T> {
  const { shop, token, apiVersion } = getShopifyCredentials(String(storeNumber));
  const base = `https://${shop}/admin/api/${apiVersion}`;
  const r = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
      "User-Agent": "LogisticManager/1.0 (+node)",
    },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) {
    const errorText = await r.text();
    throw new Error(`Shopify POST ${path} => ${r.status} ${r.statusText} :: ${errorText.slice(0, 400)}`);
  }
  return JSON.parse(text) as T;
}

export async function unfulfillOrderInShopify(params: { storeNumber: number; shopifyOrderId: string; }) {
  const { storeNumber, shopifyOrderId } = params;

  // 1) Listar fulfillments existentes
  const list = await shopifyRestGet<{ fulfillments: Array<{ id: number | string; status: string }> }>(
    storeNumber, `/orders/${shopifyOrderId}/fulfillments.json`
  );

  let cancelled = 0;
  for (const f of list.fulfillments ?? []) {
    try {
      // 2) Intentar cancelación (Shopify la permite para ciertos estados)
      await shopifyRestPost(storeNumber, `/fulfillments/${f.id}/cancel.json`, {});
      cancelled++;
    } catch (e) {
      // Si no se puede cancelar, continúa con los demás
      console.warn(`[Shopify] No se pudo cancelar fulfillment ${f.id}:`, (e as any)?.message || e);
    }
  }
  return cancelled;
}

/** Versión corregida: usa `fulfillable_quantity` */
export async function fulfillOrderInShopify(params: {
  storeNumber: number;
  shopifyOrderId: string | number;
  notifyCustomer?: boolean;
}) {
  const { storeNumber, shopifyOrderId, notifyCustomer = false } = params;

  return await pRetry(
    async () => {
      console.log(`[Shopify] Fulfilling order ${shopifyOrderId} on store ${storeNumber}`);

      // 1) Trae Fulfillment Orders
      const foResp = await shopifyRestGet<{
        fulfillment_orders: Array<{
          id: number | string;
          status?: string;
          request_status?: string;
          supported_actions?: string[];
          line_items: Array<{
            id: number | string;
            quantity: number;
            fulfillable_quantity: number;
          }>;
        }>;
      }>(storeNumber, `/orders/${shopifyOrderId}/fulfillment_orders.json`);

      // 2) Filtrar items fulfillable
      const line_items_by_fulfillment_order = foResp.fulfillment_orders
        .map(fo => {
          const items = fo.line_items
            .filter(li => (li.fulfillable_quantity ?? 0) > 0)
            .map(li => ({
              id: li.id,
              quantity: li.fulfillable_quantity,
            }));
          return items.length > 0
            ? { fulfillment_order_id: fo.id, fulfillment_order_line_items: items }
            : null;
        })
        .filter(Boolean) as Array<{
          fulfillment_order_id: number | string;
          fulfillment_order_line_items: Array<{ id: number | string; quantity: number }>;
        }>;

      if (line_items_by_fulfillment_order.length === 0) {
        return { ok: true, alreadyFulfilled: true };
      }

      // 3) Crear fulfillment
      const created = await shopifyRestPost<{ fulfillment: { id: number | string } }>(
        storeNumber,
        `/fulfillments.json`,
        {
          fulfillment: {
            line_items_by_fulfillment_order,
            notify_customer: notifyCustomer,
            tracking_info: { number: null, url: null, company: "Manual" },
          },
        }
      );

      return { ok: true, fulfillmentId: created.fulfillment.id };
    },
    {
      retries: 3,
      minTimeout: 1000,
      onFailedAttempt: (error) => {
        console.warn(`Intento ${error.attemptNumber} falló. Quedan ${error.retriesLeft} reintentos. Error: ${error}`);
      }
    }
  );
}

