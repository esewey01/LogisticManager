// REFACTOR: Real-time health status indicators for navbar
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, Wifi, WifiOff } from "lucide-react";

interface HealthStatus {
  ok: boolean;
  status?: number;
  error?: string;
  timestamp: string;
}

interface HealthIndicatorProps {
  service: "shopify" | "mlg" | "expresspl";
  label: string;
}

function HealthIndicator({ service, label }: HealthIndicatorProps) {
  const { data, isLoading, error } = useQuery<HealthStatus>({
    queryKey: [`/api/health/${service}`],
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000, // Consider stale after 30s
    retry: 2
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
    if (error) return `Error al verificar ${label}: ${error}`;
    if (!data?.ok) return `${label} desconectado: ${data?.error || 'Sin conexión'}`;
    
    const lastCheck = data?.timestamp ? new Date(data.timestamp).toLocaleString('es-ES') : 'Desconocido';
    return `${label} conectado - Última verificación: ${lastCheck}`;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div 
          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted hover:bg-muted/80 transition-colors cursor-help"
          data-testid={`status-${service}`}
        >
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
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
      <HealthIndicator service="shopify" label="Shopify" />
      <HealthIndicator service="mlg" label="MLG" />
      <HealthIndicator service="expresspl" label="Express-PL" />
    </div>
  );
}