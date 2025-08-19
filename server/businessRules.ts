// server/businessRules.ts - Reglas de negocio del sistema

/**
 * Mapea el fulfillment_status de Shopify al estado de gestión del sistema
 * Reglas de negocio:
 * - FULFILLED → "Gestionado"
 * - UNFULFILLED o NULL → "Sin Gestionar"
 * - RESTOCKED → "Devuelto"
 * - Otros → "Error"
 *
 * Case-insensitive: acepta fulfilled, FULFILLED, Fulfilled, etc.
 */
export function mapearEstadoGestion(
  fulfillmentStatus: string | null | undefined,
): string {
  // NULL, undefined o string vacío
  if (!fulfillmentStatus || fulfillmentStatus.trim() === "") {
    return "Sin Gestionar";
  }

  const status = fulfillmentStatus.trim().toUpperCase();

  switch (status) {
    case "fulfilled":
      return "Gestionado";
    case "unfulfilled":
      return "Sin Gestionar";
    case "restocked":
      return "Devuelto";
    default:
      return "Error";
  }
}

/**
 * Determina si una orden está gestionada basándose en su fulfillment_status
 */
export function esOrdenGestionada(
  fulfillmentStatus: string | null | undefined,
): boolean {
  if (!fulfillmentStatus) return false;
  return fulfillmentStatus.trim().toUpperCase() === "fulfilled";
}

/**
 * Obtiene el color de estado para la UI basado en fulfillment_status
 */
export function obtenerColorEstado(
  fulfillmentStatus: string | null | undefined,
): string {
  const estado = mapearEstadoGestion(fulfillmentStatus);

  switch (estado) {
    case "Gestionado":
      return "green";
    case "Sin Gestionar":
      return "yellow";
    case "Devuelto":
      return "blue";
    case "Error":
      return "red";
    default:
      return "gray";
  }
}

/**
 * Obtiene el badge variant para shadcn/ui basado en fulfillment_status
 */
export function obtenerVarianteBadge(
  fulfillmentStatus: string | null | undefined,
): "default" | "secondary" | "destructive" | "outline" {
  const estado = mapearEstadoGestion(fulfillmentStatus);

  switch (estado) {
    case "Gestionado":
      return "default"; // Verde
    case "Sin Gestionar":
      return "secondary"; // Amarillo/Gris
    case "Devuelto":
      return "outline"; // Azul
    case "Error":
      return "destructive"; // Rojo
    default:
      return "secondary";
  }
}
