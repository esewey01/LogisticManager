import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type Props = {
  open: boolean;
  onClose: () => void;
  seedQuery?: string;
};

type Result = {
  marketplace: "mercado_libre" | "amazon";
  id: string;
  title: string;
  price: number;
  currency: string;
  permalink: string;
  thumbnail?: string;
  seller?: string;
  available_quantity?: number;
};

export default function SearchAlternativesModal({ open, onClose, seedQuery = "" }: Props) {
  const [q, setQ] = React.useState(seedQuery);
  const [marketplace, setMarketplace] = React.useState<"all" | "ml" | "amazon">("all");

  React.useEffect(() => { if (open) setQ(seedQuery || ""); }, [open, seedQuery]);

  const { data, isFetching, refetch } = useQuery<{ results: Result[] }>({
    queryKey: ["/api/search", { q, marketplace }],
    enabled: false,
    queryFn: async () => {
      const params = new URLSearchParams({ q, marketplace, limit: "20" });
      const res = await apiRequest("GET", `/api/search?${params.toString()}`);
      return res.json();
    },
  });

  const results = data?.results ?? [];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Buscar alternativas (Stock Out)</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="SKU, nombre de producto o modelo…"
              onKeyDown={(e) => { if (e.key === "Enter") refetch(); }}
            />
            <Select value={marketplace} onValueChange={(v) => setMarketplace(v as any)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Marketplace" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ml">Mercado Libre</SelectItem>
                <SelectItem value="amazon">Amazon</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => refetch()} disabled={!q || isFetching} className="h-9">
              {isFetching ? "Buscando…" : "Buscar"}
            </Button>
          </div>

          <Separator />

          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isFetching ? "Buscando resultados…" : "Sin resultados aún. Ingresa una consulta y presiona Buscar."}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {results.map((r) => (
                <Card key={`${r.marketplace}-${r.id}`} className="overflow-hidden">
                  <CardContent className="p-3 flex gap-3">
                    <div className="w-20 h-20 flex items-center justify-center bg-muted/30 shrink-0">
                      {r.thumbnail ? (
                        <img src={r.thumbnail} alt={r.title} className="max-w-full max-h-full object-contain" />
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin imagen</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {r.marketplace === "mercado_libre" ? "Mercado Libre" : "Amazon"}
                        </Badge>
                        {typeof r.available_quantity === "number" && (
                          <Badge variant="outline" className="text-[10px]">Disp: {r.available_quantity}</Badge>
                        )}
                      </div>
                      <a href={r.permalink} target="_blank" rel="noreferrer" className="block font-medium truncate mt-1 hover:underline">
                        {r.title}
                      </a>
                      <div className="text-sm font-semibold mt-1">
                        {r.currency} ${r.price.toLocaleString()}
                      </div>
                      {r.seller && <div className="text-xs text-muted-foreground mt-0.5">Vendedor: {r.seller}</div>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

