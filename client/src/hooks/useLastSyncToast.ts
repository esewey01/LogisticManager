import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Hook: muestra un toast cuando hay un nuevo resultado de sincronización automática
// Español: Consulta periódicamente el endpoint del backend que expone el último
// resultado de sync (manual/auto/bulk). Si cambia el timestamp y hay pedidos
// actualizados (>0), emite un toast y memoriza el último timestamp visto.
export function useLastSyncToast(intervalMs: number = 60_000) {
  const { toast } = useToast();

  const { data } = useQuery<{ ok: boolean; last?: { timestamp?: string; totalUpserted?: number } }>({
    queryKey: ["/api/integrations/shopify/sync-last-result"],
    queryFn: () =>
      apiRequest("GET", "/api/integrations/shopify/sync-last-result").then((r) => r.json()),
    refetchInterval: intervalMs,
  });

  useEffect(() => {
    const lastTs = localStorage.getItem("lastSyncTs") || "";
    const newTs = data?.last?.timestamp || "";
    const total = data?.last?.totalUpserted || 0;
    if (newTs && newTs !== lastTs && total > 0) {
      toast({ title: "Sincronización automática", description: `Pedidos actualizados: ${total}` });
      localStorage.setItem("lastSyncTs", newTs);
    }
  }, [data, toast]);
}

