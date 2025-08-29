import { getShopifyCredentials } from "../../shopifyEnv";

type CancelArgs = {
  shopId: number | string;
  orderGid: string; // "gid://shopify/Order/1234567890"
  reason?: string;  // OrderCancelReason
  staffNote?: string;
  email?: boolean;
  restock?: boolean;
  refund?: boolean;
};

const ORDER_CANCEL_MUTATION = `
mutation orderCancel($id: ID!, $reason: OrderCancelReason, $staffNote: String, $email: Boolean, $restock: Boolean, $refund: Boolean){
  orderCancel(id: $id, reason: $reason, staffNote: $staffNote, email: $email, restock: $restock, refund: $refund){
    job { id }
    userErrors { field message }
  }
}`;

const JOB_QUERY = `
query job($id: ID!){
  job(id: $id) { id done }
}`;

const ORDER_QUERY = `
query order($id: ID!){
  node(id: $id) {
    ... on Order {
      id
      name
      cancelledAt
      cancelReason
      displayFinancialStatus
      displayFulfillmentStatus
    }
  }
}`;

export async function cancelShopifyOrderAndWait(args: CancelArgs) {
  const { shop, token, apiVersion } = getShopifyCredentials(String(args.shopId));

  // 1) Disparar cancelación
  const r = await fetch(`https://${shop}/admin/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({
      query: ORDER_CANCEL_MUTATION,
      variables: {
        id: args.orderGid,
        reason: args.reason || "OTHER",
        staffNote: args.staffNote || null,
        email: !!args.email,
        restock: !!args.restock,
        refund: !!args.refund,
      }
    }),
  });
  const data = await r.json();
  const userErrors = data?.data?.orderCancel?.userErrors || data?.errors;
  if (!r.ok || (userErrors && userErrors.length)) {
    return { ok: false as const, stage: "request" as const, errors: userErrors || [{ message: "Shopify cancel failed" }] };
  }

  const jobId = data?.data?.orderCancel?.job?.id;
  if (!jobId) {
    return { ok: false as const, stage: "no-job" as const, errors: [{ message: "Shopify did not return a job id" }] };
  }

  // 2) Polling del job (hasta 20s)
  const started = Date.now();
  const deadlineMs = 20000;
  let delay = 500;
  while (Date.now() - started < deadlineMs) {
    const jr = await fetch(`https://${shop}/admin/api/${apiVersion}/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({ query: JOB_QUERY, variables: { id: jobId } }),
    });
    const jdata = await jr.json();
    const done = !!jdata?.data?.job?.done;
    if (done) break;
    await new Promise((res) => setTimeout(res, delay));
    delay = Math.min(delay + 250, 1500);
  }

  // 3) Leer la orden y confirmar cancelledAt
  const or = await fetch(`https://${shop}/admin/api/${apiVersion}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
    body: JSON.stringify({ query: ORDER_QUERY, variables: { id: args.orderGid } }),
  });
  const odata = await or.json();
  const order = odata?.data?.node;

  if (!order?.cancelledAt) {
    return { ok: false as const, stage: "verify" as const, errors: [{ message: "Cancellation not reflected yet (cancelledAt null)" }], order };
  }

  return { ok: true as const, order };
}

