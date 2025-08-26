// MLG-INTEGRATION: React Query component for testing MLG API
import { useQuery } from "@tanstack/react-query";

export function MlgPingBox() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/mlg/ping"],
    queryFn: async () => {
      const res = await fetch("/api/mlg/ping", { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">MLG: cargando…</div>;
  if (error) return <div className="text-sm text-destructive">MLG error: {(error as Error).message}</div>;
  
  return (
    <div className="border rounded-md p-3 bg-muted/20">
      <div className="text-sm font-medium mb-2">MLG API Status</div>
      <pre className="text-xs bg-background p-2 rounded border overflow-auto max-h-32">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}