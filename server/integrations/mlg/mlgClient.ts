// server/integrations/mlg/mlgClient.ts
import { mlgRequest } from "../../services/MlgClient";

export type ObtenerVentasParams = {
  page: number;
  totalRows: number;
  providerId: string | number;
  orderBy?: number;
  orderType?: number;
  filter?: string | null;
  dateMin?: string | null;
  dateMax?: string | null;
};

export type Venta = {
  idCanje: number | string;
  idOrder: string;
  idProductoProveedor?: number;
  titulo?: string;
  producto?: string;
  modelo?: string;
  precioArticulo?: string | number;
  fechaSolicitud: string;
  estatusEnvio?: string;
  nombreCliente?: string;
  direccionCliente?: string;
  totalCompra?: string | number;
  cantidad?: number;
  numeroGuia?: string | null;
};

export type VentasResponse = {
  ventas?: {
    results: Venta[];
    currentPage: number;
    pageCount: number;
    pageSize: number;
    rowCount: number;
  };
  statusCode: number;
  description?: string | null;
};

export async function obtenerVentas(params: ObtenerVentasParams): Promise<VentasResponse> {
  const res = await mlgRequest("/api/Ventas/ObtenerVentasProveedor", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(params),
  });
  const json = (await res.json()) as VentasResponse;
  return json;
}

