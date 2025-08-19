export type OrderUiStatus = "GESTIONADA" | "SIN_GESTIONAR" | "DEVUELTO" | "ERROR";

// Mapea estados de Shopify a estados de UI coherentes
export function mapOrderUiStatus(
  fulfillment_status?: string | null,
  status?: string | null,
): OrderUiStatus {
  const fs = (fulfillment_status || "").toUpperCase();
  const st = (status || "").toUpperCase();
  if (fs === "FULFILLED") return "GESTIONADA";
  if (fs === "UNFULFILLED" || fs === "" || fs === "NULL") return "SIN_GESTIONAR";
  if (fs === "RESTOCKED" || st === "RESTOCKED") return "DEVUELTO";
  return "ERROR";
}
