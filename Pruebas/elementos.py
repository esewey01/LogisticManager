import re

def extraer_marcas_desde_html(archivo_txt):
    """
    Lee un archivo .txt con HTML que contiene una lista <ul><li>...</li></ul>
    y extrae los nombres limpios de las marcas, eliminando símbolos como ® y espacios.
    """
    try:
        with open(archivo_txt, 'r', encoding='utf-8') as file:
            html = file.read()
    except FileNotFoundError:
        print(f"[ERROR] No se encontró el archivo: {archivo_txt}")
        return []

    # Usamos una expresión regular para extraer el texto dentro de cada <li>
    # Buscamos: <li ...> texto </li>
    patron = r'<li[^>]*>([^<]+)</li>'
    coincidencias = re.findall(patron, html, re.IGNORECASE)

    # Limpiamos cada texto: eliminamos ®, espacios extra, etc.
    marcas = []
    for texto in coincidencias:
        # Eliminar símbolos como ®, espacios extra, tabulaciones
        limpio = re.sub(r'[®©™\s]+', ' ', texto).strip()  # Reemplaza múltiples espacios
        limpio = limpio.strip()  # Limpieza final
        if limpio:  # Solo agregar si no está vacío
            marcas.append(limpio)

    return marcas

# === USO ===
if __name__ == "__main__":
    archivo = "lista_marcas.txt"  # Cambia por el nombre de tu archivo
    marcas = extraer_marcas_desde_html(archivo)

    print("Marcas extraídas:")
    for i, marca in enumerate(marcas, 1):
        print(f"{i}. {marca}")

    # Opcional: guardar en un archivo .txt
    with open("marcas_extraidas.txt", "w", encoding="utf-8") as f:
        for marca in marcas:
            f.write(marca + "\n")
    print(f"\n✅ {len(marcas)} marcas extraídas y guardadas en 'marcas_extraidas.txt'")