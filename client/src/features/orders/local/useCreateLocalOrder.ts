import { useMutation } from "@tanstack/react-query";

export type OrigenStock = 'ALMACEN' | 'PROVEEDOR';

export type LocalOrderItemInput = {
  sku: string;
  quantity: number;
  origenStock: OrigenStock;
  unitPrice?: number;
  discountAmount?: number;
  note?: string;
};

export type LocalOrderInput = {
  clientRequestId: string;
  customer?: { name?: string; email?: string; phone?: string };
  delivery: { type: 'pickup' | 'delivery_local' | 'paqueteria'; address?: { name?: string; phone?: string; line1?: string; city?: string; province?: string; country?: string; zip?: string } };
  items: LocalOrderItemInput[];
  orderLevelDiscount?: { type: 'percent' | 'amount'; value: number };
  payment?: { method?: 'cash' | 'transfer' | 'card' | 'other'; paidAmount?: number; reference?: string };
  notes?: string;
  createdBy?: string;
};

async function postLocalOrder(input: LocalOrderInput) {
  const res = await fetch('/api/orders/local', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  if (!res.ok) {
    const msg = (await res.json().catch(()=>null))?.message ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return res.json();
}

export function useCreateLocalOrder() {
  return useMutation({ mutationFn: postLocalOrder });
}

