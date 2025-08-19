// server/businessRules.ts - Reglas de negocio del sistema

/**
 * Mapea el fulfillment_status de Shopify al estado de gestión del sistema
 * Reglas de negocio:
 * - FULFILLED → "Gestionado"
 * - UNFULFILLED o NULL → "Sin Gestionar"
 * - RESTOCKED → "Devuelto"
 * - Otros → "Error"
 */
export function mapearEstadoGestion(fulfillmentStatus: string | null): string {
  if (!fulfillmentStatus || fulfillmentStatus.toUpperCase() === "UNFULFILLED") {
    return "Sin Gestionar";
  }
  
  switch (fulfillmentStatus.toUpperCase()) {
    case "FULFILLED":
      return "Gestionado";
    case "RESTOCKED":
      return "Devuelto";
    default:
      return "Error";
  }
}

/**
 * Determina si una orden está gestionada basándose en su fulfillment_status
 */
export function esOrdenGestionada(fulfillmentStatus: string | null): boolean {
  return fulfillmentStatus?.toUpperCase() === "FULFILLED";
}

/**
 * Obtiene el color de estado para la UI basado en fulfillment_status
 */
export function obtenerColorEstado(fulfillmentStatus: string | null): string {
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