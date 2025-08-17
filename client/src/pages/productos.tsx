import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

interface Variant {
  sku: string | null;
}

interface Product {
  id: number;
  title: string;
  vendor: string | null;
  status: string;
  variants?: Variant[];
  shopId: number;
}

export default function Productos() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, isError, refetch } = useQuery<Product[]>({
    queryKey: ["productos"],
    queryFn: async () => {
      const stores = [1, 2];
      const responses = await Promise.all(
        stores.map((s) =>
          apiRequest(
            "GET",
            `/api/integrations/shopify/products?store=${s}`,
          ).then((r) => r.json()),
        ),
      );
      return responses.flatMap((r, idx) =>
        (r.products || []).map((p: any) => ({ ...p, shopId: stores[idx] })),
      );
    },
  });

  const filtered = (data ?? []).filter((p: Product) => {
    const term = search.toLowerCase();
    const inTitle = p.title.toLowerCase().includes(term);
    const skus = (p.variants || []).map((v: Variant) => v.sku?.toLowerCase() || "");
    const inSku = skus.some((s: string) => s.includes(term));
    return inTitle || inSku;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const start = (page - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Productos</h1>
      <Input
        placeholder="Buscar por título o SKU"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>SKUs</TableHead>
            <TableHead>Tienda</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={5} className="text-center">
                Cargando...
              </TableCell>
            </TableRow>
          )}
          {isError && (
            <TableRow>
              <TableCell colSpan={5} className="text-center">
                Error al cargar. <Button variant="outline" onClick={() => refetch()}>Reintentar</Button>
              </TableCell>
            </TableRow>
          )}
          {!isLoading && !isError && pageItems.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center">
                Sin resultados
              </TableCell>
            </TableRow>
          )}
          {!isLoading && !isError &&
            pageItems.map((p: Product) => (
              <TableRow key={`${p.shopId}-${p.id}`}>
                <TableCell>{p.title}</TableCell>
                <TableCell>{p.vendor ?? ""}</TableCell>
                <TableCell>{p.status}</TableCell>
                <TableCell>
                  {(p.variants || [])
                    .map((v: Variant) => v.sku)
                    .filter(Boolean)
                    .join(", ")}
                </TableCell>
                <TableCell>{p.shopId}</TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Anterior
        </Button>
        <span>
          Página {page} de {totalPages}
        </span>
        <Button
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}

