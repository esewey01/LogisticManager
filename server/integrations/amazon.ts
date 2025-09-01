// server/integrations/amazon.ts
// Amazon PA-API es con llave. Si no hay llaves en .env, devolvemos [] y el frontend lo mostrará como "no configurado".

import type { MarketplaceResult } from "./mercadoLibre";

export async function searchAmazon(query: string, limit = 10): Promise<MarketplaceResult[]> {
  const access = process.env.AMAZON_PA_ACCESS_KEY;
  const secret = process.env.AMAZON_PA_SECRET_KEY;
  const partnerTag = process.env.AMAZON_PA_PARTNER_TAG;
  const region = process.env.AMAZON_PA_REGION || "us-east-1";

  if (!access || !secret || !partnerTag) {
    // Sin credenciales → no reventar, solo devolver vacío
    return [];
  }

  // TODO: Implementar PA-API ItemsSearch (PartnerTag, Keywords=query, Resources=Images,ItemInfo,Offers,SearchRefinements)
  // Mantener sin dependencias por ahora. Cuando integres el SDK oficial, mapear al tipo MarketplaceResult.
  return [];
}

