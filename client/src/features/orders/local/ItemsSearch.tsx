import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type ArticuloResult = {
  sku: string;
  sku_interno?: string | null;
  nombre: string;
  costo: number | null;        // puede venir null en algunos catálogos
  stock_a: number | null;
  stock_cp: number | null;
  es_combo: boolean | null;
  sku_combo?: string | null;
};

type Props = {
  value: string;
  onSelect: (art: ArticuloResult) => void;
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
};

export function ItemSearch({ value, onSelect, onChange, label = "SKU / SKU interno / Nombre", placeholder = "Buscar…", disabled }: Props) {
  const [q, setQ] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ArticuloResult[]>([]);
  const controllerRef = useRef<AbortController | null>(null);
  const debouncedQ = useDebounced(q, 220);

  useEffect(() => setQ(value || ""), [value]);

  useEffect(() => {
    if (!debouncedQ || debouncedQ.trim().length < 2) {
      setResults([]);
      return;
    }
    (async () => {
      try {
        controllerRef.current?.abort();
        const ac = new AbortController();
        controllerRef.current = ac;
        setLoading(true);
        // Endpoint de búsqueda:
        // Implementa en backend GET /api/articulos/search?q=<term>
        // Debe buscar por sku, sku_interno o nombre y devolver los campos del tipo ArticuloResult
        const r = await fetch(`/api/articulos/search?q=${encodeURIComponent(debouncedQ)}`, { signal: ac.signal });
        if (!r.ok) throw new Error("Error de búsqueda");
        const data = (await r.json()) as ArticuloResult[];
        setResults(data ?? []);
      } catch (e) {
        if ((e as any)?.name !== "AbortError") {
          setResults([]);
        }
      } finally {
        setLoading(false);
        setOpen(true);
      }
    })();
  }, [debouncedQ]);

  return (
    <div className="relative">
      {label && <Label className="mb-1 block">{label}</Label>}
      <Input
        value={q}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => {
          setQ(e.target.value);
          onChange(e.target.value);
        }}
        onFocus={() => setOpen(results.length > 0)}
        onBlur={() => {
          // pequeño delay para permitir click en lista
          setTimeout(() => setOpen(false), 150);
        }}
      />
      {open && (results.length > 0 || loading) && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
          <div className="max-h-80 overflow-auto">
            {loading && <div className="px-3 py-2 text-sm opacity-70">Buscando…</div>}
            {!loading && results.map((it) => {
              const costo = it.costo ?? 0;
              const tag = it.es_combo ? "Combo" : "Artículo";
              return (
                <button
                  key={`${it.sku}`}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelect(it);
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{it.nombre}</div>
                      <div className="text-xs opacity-70">
                        SKU: {it.sku} {it.sku_interno ? ` · SKU interno: ${it.sku_interno}` : ""} · {tag}
                      </div>
                    </div>
                    <div className="text-xs text-right opacity-80">
                      Costo ref: ${costo.toFixed(2)}<br/>
                      Alm: {it.stock_a ?? 0} · Prov: {it.stock_cp ?? 0}
                    </div>
                  </div>
                </button>
              );
            })}
            {!loading && results.length === 0 && (
              <div className="px-3 py-2 text-sm opacity-70">Sin resultados</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function useDebounced<T>(v: T, ms = 200) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}
