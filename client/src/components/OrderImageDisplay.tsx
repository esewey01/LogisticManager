// GMART-INTEGRATION: Component para mostrar imágenes de productos
import React from "react";
import { getGMartImage } from "@/lib/image";

interface OrderImageDisplayProps {
  item: {
    sku?: string | null;
    foto?: string | null;
    title?: string | null;
    productName?: string | null;
  };
  className?: string;
}

export function OrderImageDisplay({ item, className = "w-16 h-16" }: OrderImageDisplayProps) {
  const [imageSrc, setImageSrc] = React.useState<string>("");
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    const src = getGMartImage({ 
      skuInterno: item.sku, 
      foto: item.foto 
    });
    setImageSrc(src);
    setHasError(false);
  }, [item.sku, item.foto]);

  const handleError = () => {
    setHasError(true);
  };

  if (!imageSrc || hasError) {
    return (
      <div 
        className={`${className} bg-muted rounded flex items-center justify-center text-xs text-muted-foreground`}
        data-testid="img-placeholder"
      >
        Sin imagen
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={item.title || item.productName || item.sku || "Producto"}
      onError={handleError}
      className={`${className} object-contain rounded border`}
      data-testid="img-product"
    />
  );
}