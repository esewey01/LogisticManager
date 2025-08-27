# --- IMPORTS ---
import os
import csv
import time
import threading
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from datetime import datetime
from typing import List, Dict, Any
import requests

# ================== CONFIG FIJA (embebida) ==================
SHOP_NAME = "c3b13f-2.myshopify.com"
ACCESS_TOKEN = "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"
API_VERSION = "2025-07"

MF_NAMESPACE = "Logistica"
MF_KEY = "FechaEntrega"
MF_TYPE = "date"

BATCH_SIZE = 20
RETRIES = 2
# ============================================================

# --- Funciones lógicas (sin cambios) ---
def normalize_date(val: str) -> str:
    if not val or not str(val).strip():
        return ""
    s = str(val).strip()
    fmts = ["%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d", "%d-%m-%Y", "%m-%d-%Y"]
    for fmt in fmts:
        try:
            return datetime.strptime(s, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    try:
        import pandas as pd
        dt = pd.to_datetime(s, errors="coerce", dayfirst=False)
        if pd.notna(dt):
            return dt.strftime("%Y-%m-%d")
    except ImportError:
        pass
    except Exception:
        pass
    return s

def to_gid(order_id: int) -> str:
    return f"gid://shopify/Order/{order_id}"

def graphql(url: str, headers: dict, query: str, variables: dict) -> dict:
    try:
        r = requests.post(url, headers=headers, json={"query": query, "variables": variables}, timeout=30)
        r.raise_for_status()
        data = r.json()
        if "errors" in data:
            raise RuntimeError(f"GraphQL errors: {data['errors']}")
        return data
    except requests.exceptions.Timeout:
        raise RuntimeError("Tiempo de espera agotado.")
    except requests.exceptions.ConnectionError:
        raise RuntimeError("Error de conexión.")
    except requests.exceptions.HTTPError as e:
        raise RuntimeError(f"Error HTTP {r.status_code}: {r.text}")
    except Exception as e:
        raise RuntimeError(f"Error inesperado: {str(e)}")

def ensure_definition(graphql_url: str, headers: dict, namespace: str, key: str, mf_type: str):
    mutation = """
    mutation CreateDef($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition { id key namespace ownerType }
        userErrors { field message code }
      }
    }
    """
    variables = {"definition": {
        "name": "Fecha de Entrega",
        "namespace": namespace,
        "key": key,
        "description": "Fecha de entrega confirmada para la orden",
        "type": mf_type,
        "ownerType": "ORDER"
    }}
    try:
        resp = graphql(graphql_url, headers, mutation, variables)["data"]["metafieldDefinitionCreate"]
        if resp.get("createdDefinition"):
            return True
        errs = resp.get("userErrors", [])
        for error in errs:
            if error.get("code") == "TAKEN" or "already exists" in error.get("message", "").lower():
                return True
        raise RuntimeError(f"Error al crear definición: {errs}")
    except Exception as e:
        if "TAKEN" in str(e) or "already exists" in str(e).lower():
            return True
        raise RuntimeError(f"No se pudo verificar/crear la definición del metafield: {e}")

def metafields_set_batch(graphql_url: str, headers: dict, rows: List[Dict[str, str]], ns: str, key: str, mf_type: str):
    mutation = """
    mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        userErrors { field message code }
      }
    }
    """
    metas = []
    for row in rows:
        try:
            gid = to_gid(int(row["order_id"]))
        except ValueError:
            raise RuntimeError(f"ID inválido: '{row['order_id']}'")
        metas.append({
            "ownerId": gid,
            "namespace": ns,
            "key": key,
            "type": mf_type,
            "value": row["delivery_date"]
        })
    result = graphql(graphql_url, headers, mutation, {"metafields": metas})
    return result["data"]["metafieldsSet"]

def _resolve_columns(header_map: dict) -> tuple[str, str]:
    keys = {k.lower(): k for k in header_map.keys()}
    oid_aliases = ["order_id", "id", "orderid", "idorden", "id_orden"]
    date_aliases = ["delivery_date", "fechaentrega", "fecha_entrega", "fecha", "deliverydate", "entrega"]
    oid_key = next((keys[a] for a in oid_aliases if a in keys), None)
    date_key = next((keys[a] for a in date_aliases if a in keys), None)
    if not oid_key or not date_key:
        import unicodedata
        def norm(s):
            return ''.join(c for c in unicodedata.normalize('NFD', s)
                           if unicodedata.category(c) != 'Mn').lower() \
                           .replace(" ", "").replace("-", "").replace("_", "")
        nkeys = {norm(k): k for k in header_map.keys()}
        oid_key = oid_key or next((nkeys.get(a) for a in ("orderid", "id", "idorden")), None)
        date_key = date_key or next((nkeys.get(a) for a in ("fechaentrega", "deliverydate", "fecha")), None)
    if not oid_key or not date_key:
        raise RuntimeError("No se encontraron columnas clave.")
    return oid_key, date_key

def read_csv(path: str) -> list[dict[str, str]]:
    rows = []
    try:
        with open(path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            first = next(reader, None)
            if not first:
                return rows
            oid_key, date_key = _resolve_columns(first)
            rows.append(first)
            rows.extend(reader)
        processed = []
        for i, row in enumerate(rows):
            oid = str(row.get(oid_key, "")).strip()
            raw_date = str(row.get(date_key, "")).strip()
            clean_date = normalize_date(raw_date)
            if not oid:
                continue
            if not clean_date:
                continue
            processed.append({"order_id": oid, "delivery_date": clean_date})
        return processed
    except Exception as e:
        raise RuntimeError(f"Error leyendo CSV: {e}")

def read_xlsx(path: str) -> list[dict[str, str]]:
    try:
        import pandas as pd
    except ImportError:
        raise RuntimeError("Requiere 'pandas'. Instálalo con: pip install pandas openpyxl")
    try:
        df = pd.read_excel(path, dtype=str)
        if df.empty:
            return []
        sample = df.iloc[0].to_dict()
        oid_key, date_key = _resolve_columns(sample)
        processed = []
        for idx, row in df.iterrows():
            oid = str(row.get(oid_key, "")).strip()
            raw_date = str(row.get(date_key, "")).strip()
            clean_date = normalize_date(raw_date)
            if not oid:
                continue
            if not clean_date:
                continue
            processed.append({"order_id": oid, "delivery_date": clean_date})
        return processed
    except Exception as e:
        raise RuntimeError(f"Error leyendo XLSX: {e}")


# ================== INTERFAZ MEJORADA ==================
class App(tk.Tk):
    def __init__(self):
        super().__init__()

        # Configuración de ventana
        self.title(f"🚚 Cargador de Fechas de Entrega - {SHOP_NAME}")
        self.geometry("780x520")
        self.minsize(600, 400)
        self.configure(bg="#f0f0f0")

        # Estilo moderno
        style = ttk.Style()
        style.theme_use("clam")  # Puedes probar con 'alt', 'default', 'classic'
        style.configure("TButton", font=("Segoe UI", 10), padding=6)
        style.configure("TProgressbar", thickness=10, troughcolor="#e0e0e0", background="#4CAF50")

        # Variables
        self.var_file = tk.StringVar()
        self.var_status = tk.StringVar(value="Listo para cargar archivo...")

        # Layout principal
        main_frame = ttk.Frame(self, padding="15")
        main_frame.pack(fill="both", expand=True)

        # Información superior
        info_frame = ttk.LabelFrame(main_frame, text="Configuración", padding="10")
        info_frame.pack(fill="x", pady=(0, 10))

        ttk.Label(info_frame, text=f"🏪 Tienda: {SHOP_NAME}", font=("Segoe UI", 10, "bold")).pack(anchor="w")
        ttk.Label(info_frame, text=f"🔖 Metafield: {MF_NAMESPACE}.{MF_KEY} ({MF_TYPE})").pack(anchor="w", pady=(3, 0))

        # Selección de archivo
        file_frame = ttk.Frame(main_frame)
        file_frame.pack(fill="x", pady=(0, 10))

        ttk.Label(file_frame, text="Archivo:").pack(side="left")
        ttk.Entry(file_frame, textvariable=self.var_file, width=50, state="readonly").pack(side="left", fill="x", expand=True, padx=(5, 5))
        ttk.Button(file_frame, text="📁 Elegir", command=self.pick_file, width=12).pack(side="left")

        # Barra de progreso
        progress_frame = ttk.LabelFrame(main_frame, text="Progreso", padding="10")
        progress_frame.pack(fill="x", pady=(0, 10))

        self.progress = ttk.Progressbar(progress_frame, mode="determinate", style="TProgressbar")
        self.progress.pack(fill="x", expand=True)

        # Logs con scrollbar
        log_frame = ttk.LabelFrame(main_frame, text="Registro de Actividad", padding="5")
        log_frame.pack(fill="both", expand=True, pady=(0, 10))

        # Texto y scrollbar
        text_frame = ttk.Frame(log_frame)
        text_frame.pack(fill="both", expand=True)

        self.output = tk.Text(text_frame, wrap="word", height=12, font=("Consolas", 9), bg="#f8f8f8", fg="#111", relief="flat")
        scrollbar = ttk.Scrollbar(text_frame, orient="vertical", command=self.output.yview)
        self.output.configure(yscrollcommand=scrollbar.set)

        self.output.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        # Botones inferiores
        button_frame = ttk.Frame(main_frame)
        button_frame.pack(fill="x", pady=(0, 5))

        self.btn_run = ttk.Button(button_frame, text="▶️ Ejecutar", command=self.run_thread, width=15)
        self.btn_run.pack(side="right", padx=(5, 0))

        ttk.Button(button_frame, text="🗑️ Limpiar", command=self.clear_log, width=12).pack(side="right")

        # Barra de estado
        status_frame = ttk.Frame(self, relief="sunken", padding=(5, 3))
        status_frame.pack(side="bottom", fill="x")

        ttk.Label(status_frame, textvariable=self.var_status, font=("Segoe UI", 9), foreground="#555").pack(side="left")

    def log(self, msg: str):
        """Agrega un mensaje al log con color según el tipo."""
        timestamp = datetime.now().strftime("%H:%M:%S")
        full_msg = f"[{timestamp}] {msg}\n"
        
        # Cambiar color según tipo (solo si usas un widget con tags, pero aquí usamos simple)
        self.output.configure(state="normal")
        self.output.insert("end", full_msg)
        self.output.see("end")
        self.output.configure(state="disabled")
        self.update_idletasks()

    def clear_log(self):
        self.output.configure(state="normal")
        self.output.delete("1.0", "end")
        self.output.configure(state="disabled")
        self.log("📝 Registro limpiado.")

    def pick_file(self):
        path = filedialog.askopenfilename(
            title="Selecciona archivo",
            filetypes=[("CSV", "*.csv"), ("Excel", "*.xlsx"), ("Todos", "*.*")]
        )
        if path:
            self.var_file.set(path)
            self.var_status.set(f"Archivo cargado: {os.path.basename(path)}")
            self.log(f"✅ Archivo seleccionado: {os.path.basename(path)}")

    def run_thread(self):
        self.btn_run.configure(state="disabled")
        self.var_status.set("Procesando... por favor espera.")
        t = threading.Thread(target=self.run_process, daemon=True)
        t.start()

    def run_process(self):
        try:
            file_path = self.var_file.get().strip()
            if not file_path:
                messagebox.showerror("❌ Error", "Por favor, selecciona un archivo.")
                self.var_status.set("Error: archivo no seleccionado.")
                return

            self.log(f"📁 Procesando archivo: {file_path}")
            graphql_url = f"https://{SHOP_NAME}/admin/api/{API_VERSION}/graphql.json"
            headers = {"X-Shopify-Access-Token": ACCESS_TOKEN, "Content-Type": "application/json"}

            ext = file_path.lower().split(".")[-1]
            if ext == "csv":
                self.log("📄 Leyendo archivo CSV...")
                rows = read_csv(file_path)
            elif ext == "xlsx":
                self.log("📊 Leyendo archivo Excel (.xlsx)...")
                rows = read_xlsx(file_path)
            else:
                raise RuntimeError("Formato no soportado. Usa CSV o XLSX.")

            total = len(rows)
            if total == 0:
                messagebox.showwarning("⚠️ Sin datos", "No se encontraron filas válidas (order_id + fecha).")
                self.log("🚫 No se procesó ninguna fila.")
                self.var_status.set("No se encontraron datos válidos.")
                return

            self.log(f"📦 {total} órdenes cargadas. Iniciando actualización...")
            self.progress["maximum"] = total
            self.progress["value"] = 0

            self.log("🔧 Verificando definición del metafield...")
            try:
                ensure_definition(graphql_url, headers, MF_NAMESPACE, MF_KEY, MF_TYPE)
                self.log("✅ Metafield listo para uso.")
            except Exception as e:
                self.log(f"❌ Error crítico al verificar metafield: {e}")
                messagebox.showerror("❌ Error", f"No se pudo configurar el metafield: {e}")
                self.var_status.set("Error al verificar metafield.")
                return

            ok, fail = 0, 0
            batch_num = 0
            total_batches = (total + BATCH_SIZE - 1) // BATCH_SIZE

            for i in range(0, total, BATCH_SIZE):
                batch_num += 1
                batch = rows[i:i+BATCH_SIZE]
                start_idx = i + 1
                end_idx = min(i + len(batch), total)
                self.log(f"📤 Lote {batch_num}/{total_batches} ({start_idx}-{end_idx}): Enviando {len(batch)} órdenes...")

                attempt = 0
                success = False
                while attempt <= RETRIES and not success:
                    attempt += 1
                    try:
                        resp = metafields_set_batch(graphql_url, headers, batch, MF_NAMESPACE, MF_KEY, MF_TYPE)
                        errs = resp.get("userErrors", [])
                        if errs:
                            self.log(f"❗ Errores en lote {batch_num}: {errs}")
                            fail += len(batch)
                        else:
                            self.log(f"✅ Lote {batch_num}: {len(batch)} órdenes actualizadas.")
                            ok += len(batch)
                        success = True
                    except Exception as e:
                        if attempt <= RETRIES:
                            wait = 2 ** attempt
                            self.log(f"⏳ Error en lote {batch_num}: {e}. Reintentando en {wait}s...")
                            time.sleep(wait)
                        else:
                            self.log(f"❌ Falla definitiva en lote {batch_num}: {e}")
                            fail += len(batch)

                self.progress["value"] = end_idx
                self.update_idletasks()

            self.log(f"\n🎉 Proceso finalizado.")
            self.log(f"✅ Éxitos: {ok}")
            self.log(f"❌ Fallidos: {fail}")
            self.log(f"📊 Total: {total}")

            if fail == 0:
                messagebox.showinfo("✅ Éxito", f"✅ {ok} órdenes actualizadas correctamente.")
                self.var_status.set(f"✅ Éxito: {ok} actualizadas.")
            elif ok > 0:
                messagebox.showwarning("⚠️ Parcial", f"✅ {ok} éxitos, ❌ {fail} fallos.")
                self.var_status.set(f"⚠️ Parcial: {ok} éxitos, {fail} fallos.")
            else:
                messagebox.showerror("❌ Fallido", "Ninguna orden fue actualizada.")
                self.var_status.set("❌ Proceso fallido.")

        except Exception as e:
            self.log(f"💥 Error crítico: {e}")
            messagebox.showerror("❌ Error", f"Ocurrió un error: {str(e)}")
            self.var_status.set("Error crítico durante ejecución.")

        finally:
            self.btn_run.configure(state="normal")

if __name__ == "__main__":
    App().mainloop()