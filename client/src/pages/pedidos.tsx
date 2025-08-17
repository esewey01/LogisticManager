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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";

interface Order {
  id: number;
  name: string | null;
  customerName: string | null;
  totalAmount: string | null;
  fulfillmentStatus: string | null;
  createdAt: string;
}

interface OrdersResponse {
  rows: Order[];
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
}

interface OrderItem {
  id: number;
  sku: string | null;
  quantity: number;
  price: string | null;
  title: string | null;
}

export default function Pedidos() {
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [tab, setTab] = useState<"unfulfilled" | "fulfilled">("unfulfilled");
  const [selected, setSelected] = useState<Order | null>(null);

  const { data, isLoading } = useQuery<OrdersResponse>({
    queryKey: ["orders", page, pageSize, tab],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/orders?page=${page}&pageSize=${pageSize}&fulfillment=${tab}`,
      );
      return res.json();
    },
    keepPreviousData: true,
  });

  const { data: items } = useQuery<OrderItem[]>({
    queryKey: ["order-items", selected?.id],
    queryFn: async () => {
      if (!selected) return [];
      const res = await apiRequest("GET", `/api/orders/${selected.id}/items`);
      return res.json();
    },
    enabled: !!selected,
  });

  const orders: Order[] = data?.rows ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Pedidos</h1>
      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as any);
          setPage(1);
        }}
      >
        <TabsList>
          <TabsTrigger value="unfulfilled">No preparados</TabsTrigger>
          <TabsTrigger value="fulfilled">Preparados</TabsTrigger>
        </TabsList>
      </Tabs>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Fulfillment</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={6} className="text-center">
                Cargando...
              </TableCell>
            </TableRow>
          )}
          {!isLoading && orders.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center">
                Sin resultados
              </TableCell>
            </TableRow>
          )}
          {orders.map((order: Order) => (
            <TableRow key={order.id}>
              <TableCell>{order.name ?? order.id}</TableCell>
              <TableCell>{order.customerName ?? ""}</TableCell>
              <TableCell>{order.totalAmount ?? ""}</TableCell>
              <TableCell>{order.fulfillmentStatus ?? ""}</TableCell>
              <TableCell>
                {order.createdAt
                  ? new Date(order.createdAt).toLocaleString()
                  : ""}
              </TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelected(order)}
                >
                  Ver detalle
                </Button>
              </TableCell>
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

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle de pedido</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Cliente</p>
                <p>{selected.customerName}</p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Precio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(items ?? []).map((it: OrderItem) => (
                    <TableRow key={it.id}>
                      <TableCell>{it.sku}</TableCell>
                      <TableCell>{it.title ?? ""}</TableCell>
                      <TableCell>{it.quantity}</TableCell>
                      <TableCell>{it.price ?? ""}</TableCell>
                    </TableRow>
                  )) ?? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

