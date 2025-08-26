// GMART-INTEGRATION: Utility for GMart product images
export function getGMartImage({ skuInterno, foto }: { skuInterno?: string | null; foto?: string | null }) {
  if (foto && foto.trim()) return foto.trim();
  if (!skuInterno || !skuInterno.trim()) return "";
  return `https://www.gmart.com.mx/images/banco_de_imagenes_gamrt/producto/${skuInterno.trim()}.jpg`;
}