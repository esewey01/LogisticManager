import { sql } from "drizzle-orm";
import type { LocalOrderDTO } from "../services/orders/createLocalOrder";

// Este módulo queda como punto de extensión si más adelante movemos lógica
// de persistencia desde el servicio hacia aquí. Por ahora, la transacción
// está implementada en createLocalOrder y usamos raw SQL sobre baseDatos/tx.

export type { LocalOrderDTO };

