#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# --- Rutas de config y log ---
APPDATA_DIR = Path(os.getenv("APPDATA") or Path.home() / ".config")
CONFIG_DIR = APPDATA_DIR / "ExcelDropboxBackup"
CONFIG_FILE = CONFIG_DIR / "config.json"
LOG_FILE = CONFIG_DIR / "log.txt"

# --- Utilidades de log ---
def log(msg: str):
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    try:
        with LOG_FILE.open("a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass
    print(line)

# --- Config ---
def load_config():
    if CONFIG_FILE.exists():
        try:
            return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
        except Exception as e:
            log(f"ERROR leyendo config: {e}")
    return {
        "source": "",
        "dest": "",
        "prefix": "",
        "dow": "MON",   # MON..SUN
        "time": "09:00" # HH:MM 24h
    }

def save_config(cfg: dict):
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    CONFIG_FILE.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"Config guardada en {CONFIG_FILE}")

# --- Copia con fecha ---
def copy_with_date(source: Path, dest_dir: Path, prefix: str | None):
    if not source.exists():
        raise FileNotFoundError(f"No existe el archivo origen: {source}")
    dest_dir.mkdir(parents=True, exist_ok=True)

    stem = prefix if (prefix and prefix.strip()) else source.stem
    today = datetime.now().strftime("%Y-%m-%d")
    target = dest_dir / f"{stem}_{today}{source.suffix}"

    if target.exists():
        hhmmss = datetime.now().strftime("%H%M%S")
        target = dest_dir / f"{stem}_{today}_{hhmmss}{source.suffix}"

    # Nota: si el Excel está abierto, Windows puede bloquearlo
    shutil.copy2(source, target)
    return target

# --- Día de semana: etiquetas ES -> códigos schtasks ---
DOW_ES_TO_CODE = {
    "Lunes": "MON", "Martes": "TUE", "Miércoles": "WED", "Miercoles": "WED",
    "Jueves": "THU", "Viernes": "FRI", "Sábado": "SAT", "Sabado": "SAT", "Domingo": "SUN"
}
DOW_CODE_TO_ES = {v: k for k, v in DOW_ES_TO_CODE.items()}

def normalize_dow(value: str):
    v = (value or "").strip()
    if v.upper() in {"MON","TUE","WED","THU","FRI","SAT","SUN"}:
        return v.upper()
    return DOW_ES_TO_CODE.get(v, "MON")

# --- Comando a ejecutar por la tarea programada ---
def scheduled_command_for_current_binary():
    # Si está "congelado" (PyInstaller), sys.executable ES el .exe
    if getattr(sys, "frozen", False):
        exe = Path(sys.executable).resolve()
        return f'"{exe}" --run'
    # En modo script, usa python + ruta del script
    python = Path(sys.executable).resolve()
    script = Path(__file__).resolve()
    return f'"{python}" "{script}" --run'

# --- Crear tarea semanal con schtasks ---
def create_scheduled_task(task_name: str, dow_code: str, hhmm: str):
    cmd = scheduled_command_for_current_binary()
    # Importante: la tarea corre con la sesión del usuario actual
    # (no pide contraseña). Si quieres "sin iniciar sesión", necesitarás /RU y /RP.
    args = [
        "schtasks", "/Create", "/F",
        "/SC", "WEEKLY",
        "/D", dow_code,
        "/ST", hhmm,
        "/TN", task_name,
        "/TR", cmd
    ]
    log(f"Creando tarea: {' '.join(args)}")
    res = subprocess.run(args, capture_output=True, text=True, shell=False)
    if res.returncode != 0:
        raise RuntimeError(f"schtasks falló: {res.stderr.strip() or res.stdout.strip()}")
    return res.stdout.strip()

# --- Ejecución headless (para la tarea programada) ---
def run_backup_from_config():
    cfg = load_config()
    source = Path(cfg.get("source",""))
    dest = Path(cfg.get("dest",""))
    prefix = cfg.get("prefix","")
    log(f"Ejecutando backup: source={source} dest={dest} prefix={prefix!r}")
    try:
        target = copy_with_date(source, dest, prefix)
        log(f"OK -> {target}")
    except PermissionError as e:
        log(f"ERROR: Permiso denegado (¿archivo Excel abierto?): {e}")
        raise
    except Exception as e:
        log(f"ERROR en copia: {e}")
        raise

# --- GUI con Tkinter ---
def run_gui():
    import tkinter as tk
    from tkinter import ttk, filedialog, messagebox

    cfg = load_config()

    root = tk.Tk()
    root.title("Backup Excel → Dropbox")
    root.geometry("640x360")
    root.resizable(False, False)

    # --- Vars ---
    var_source = tk.StringVar(value=cfg.get("source",""))
    var_dest   = tk.StringVar(value=cfg.get("dest",""))
    var_prefix = tk.StringVar(value=cfg.get("prefix",""))
    var_time   = tk.StringVar(value=cfg.get("time","09:00"))
    var_dow    = tk.StringVar(value=DOW_CODE_TO_ES.get(cfg.get("dow","MON"), "Lunes"))
    status_var = tk.StringVar(value="Listo.")

    # --- Layout ---
    pad = {"padx": 10, "pady": 6}

    frm = ttk.Frame(root)
    frm.pack(fill="both", expand=True, **pad)

    # Origen
    ttk.Label(frm, text="Archivo Excel origen:").grid(row=0, column=0, sticky="w")
    ent_source = ttk.Entry(frm, textvariable=var_source, width=60)
    ent_source.grid(row=1, column=0, columnspan=2, sticky="we")
    def pick_source():
        path = filedialog.askopenfilename(
            title="Selecciona el Excel",
            filetypes=[("Excel", "*.xlsx *.xlsm *.xlsb *.xls"), ("Todos", "*.*")]
        )
        if path: var_source.set(path)
    ttk.Button(frm, text="Buscar…", command=pick_source).grid(row=1, column=2, sticky="we")

    # Destino
    ttk.Label(frm, text="Carpeta destino (Dropbox local):").grid(row=2, column=0, sticky="w")
    ent_dest = ttk.Entry(frm, textvariable=var_dest, width=60)
    ent_dest.grid(row=3, column=0, columnspan=2, sticky="we")
    def pick_dest():
        path = filedialog.askdirectory(title="Selecciona carpeta de Dropbox")
        if path: var_dest.set(path)
    ttk.Button(frm, text="Buscar…", command=pick_dest).grid(row=3, column=2, sticky="we")

    # Prefijo
    ttk.Label(frm, text="Prefijo (opcional):").grid(row=4, column=0, sticky="w")
    ttk.Entry(frm, textvariable=var_prefix, width=30).grid(row=4, column=1, sticky="we")

    # Programación
    ttk.Label(frm, text="Programación semanal:").grid(row=5, column=0, sticky="w")

    cbo_dow = ttk.Combobox(frm, state="readonly", values=list(DOW_ES_TO_CODE.keys()), textvariable=var_dow, width=20)
    cbo_dow.grid(row=6, column=0, sticky="w")
    ttk.Label(frm, text="Hora (24h, ej. 09:30):").grid(row=6, column=1, sticky="w")
    ttk.Entry(frm, textvariable=var_time, width=10).grid(row=6, column=1, sticky="e")

    # Botones
    def do_save():
        cfg_local = {
            "source": var_source.get().strip(),
            "dest": var_dest.get().strip(),
            "prefix": var_prefix.get().strip(),
            "dow": normalize_dow(var_dow.get()),
            "time": var_time.get().strip()
        }
        if not cfg_local["source"] or not Path(cfg_local["source"]).exists():
            messagebox.showerror("Error", "Selecciona un archivo Excel válido.")
            return
        if not cfg_local["dest"]:
            messagebox.showerror("Error", "Selecciona una carpeta destino.")
            return
        # Validación de hora
        try:
            datetime.strptime(cfg_local["time"], "%H:%M")
        except ValueError:
            messagebox.showerror("Error", "Hora inválida. Usa formato HH:MM (24h).")
            return
        save_config(cfg_local)
        status_var.set("Configuración guardada.")

    def do_test_copy():
        try:
            cfg_now = load_config()
            target = copy_with_date(Path(var_source.get().strip()), Path(var_dest.get().strip()), var_prefix.get().strip())
            status_var.set(f"Copia OK → {target.name}")
            log(f"Prueba de copia OK -> {target}")
        except Exception as e:
            status_var.set(f"Error: {e}")
            messagebox.showerror("Error en la copia", str(e))
            log(f"Prueba de copia ERROR: {e}")

    def do_schedule():
        # Guarda antes de agendar
        do_save()
        cfg_now = load_config()
        try:
            out = create_scheduled_task("ExcelDropboxBackup", cfg_now["dow"], cfg_now["time"])
            messagebox.showinfo("Listo", f"Tarea semanal creada.\n{out}")
            status_var.set("Tarea semanal creada.")
        except Exception as e:
            messagebox.showerror("Error al crear tarea", str(e))
            status_var.set(f"Error al crear tarea: {e}")
            log(f"ERROR creando tarea: {e}")

    btns = ttk.Frame(frm)
    btns.grid(row=7, column=0, columnspan=3, sticky="we", pady=10)
    ttk.Button(btns, text="Guardar configuración", command=do_save).pack(side="left", padx=4)
    ttk.Button(btns, text="Probar copia ahora", command=do_test_copy).pack(side="left", padx=4)
    ttk.Button(btns, text="Crear tarea semanal", command=do_schedule).pack(side="left", padx=4)

    # Estado
    ttk.Separator(frm).grid(row=8, column=0, columnspan=3, sticky="we", pady=6)
    ttk.Label(frm, textvariable=status_var).grid(row=9, column=0, columnspan=3, sticky="w")

    for i in range(3):
        frm.grid_columnconfigure(i, weight=1)

    root.mainloop()

# --- CLI ---
def main():
    parser = argparse.ArgumentParser(description="Backup semanal de Excel a Dropbox (con GUI y scheduler)")
    parser.add_argument("--run", action="store_true", help="Ejecuta el backup en modo silencioso (para la tarea programada)")
    parser.add_argument("--schedule", action="store_true", help="Crea/actualiza la tarea semanal con la configuración guardada")
    parser.add_argument("--day", help="Día (MON..SUN o en español: Lunes..Domingo)")
    parser.add_argument("--time", help="Hora HH:MM (24h)")

    args = parser.parse_args()

    if args.run:
        run_backup_from_config()
        return

    if args.schedule:
        cfg = load_config()
        dow = normalize_dow(args.day or cfg.get("dow","MON"))
        hhmm = (args.time or cfg.get("time","09:00")).strip()
        # Validación
        datetime.strptime(hhmm, "%H:%M")
        out = create_scheduled_task("ExcelDropboxBackup", dow, hhmm)
        log(out)
        return

    # Sin flags -> abrir GUI
    run_gui()

if __name__ == "__main__":
    main()
