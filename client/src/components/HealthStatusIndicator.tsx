// client/src/components/HealthStatusIndicator.tsx
// Health indicators independientes por servicio/tienda
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle, Clock, WifiOff } from "lucide-react";

interface HealthStatus {
  ok: boolean;
  status?: number;
  error?: string;
  timestamp: string;
  details?: Record<string, any>;
}

type ServiceKey =
  | "ww"   // Shopify WW
  | "ct"   // Shopify CT
  | "mlg"
  | "expresspl";

interface HealthIndicatorProps {
  service: ServiceKey;
  label: string;
}

function HealthIndicator({ service, label }: HealthIndicatorProps) {
  const { data, isLoading, error } = useQuery<HealthStatus>({
    queryKey: [`/api/health/${service}`],
    queryFn: async () => {
      const res = await fetch(`/api/health/${service}`, { credentials: "include" });
      return res.json();
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 2,
  });

  const getStatusColor = () => {
    if (isLoading) return "bg-yellow-500";
    if (error || !data?.ok) return "bg-red-500";
    return "bg-green-500";
  };

  const getStatusIcon = () => {
    if (isLoading) return <Clock className="h-3 w-3" />;
    if (error || !data?.ok) return <WifiOff className="h-3 w-3" />;
    return <CheckCircle className="h-3 w-3" />;
  };

  const getTooltipContent = () => {
    if (isLoading) return `Verificando ${label}...`;
    if (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return `Error al verificar ${label}: ${msg}`;
    }
    if (!data?.ok) return `${label} desconectado: ${data?.error || "Sin conexión"}`;

    const lastCheck = data.timestamp
      ? new Date(data.timestamp).toLocaleString("es-MX")
      : "Desconocido";
    const shop = data.details?.shop ?? "";
    return `${label} conectado — ${shop ? `Tienda: ${shop} — ` : ""}Última verificación: ${lastCheck}`;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted/80 transition-colors cursor-help"
          data-testid={`status-${service}`}
        >
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
          <span className="text-xs font-medium">{label}</span>
          {getStatusIcon()}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="max-w-xs">{getTooltipContent()}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function HealthStatusIndicators() {
  return (
    <div className="flex items-center gap-2" data-testid="health-indicators">
      {/* Tiendas Shopify por separado */}
      <HealthIndicator service="ww" label="WordWide" />
      <HealthIndicator service="ct" label="CrediTienda" />
      {/* Otros servicios */}
      <HealthIndicator service="mlg" label="MLG" />
      <HealthIndicator service="expresspl" label="Express-PL" />
    </div>
  );
}
