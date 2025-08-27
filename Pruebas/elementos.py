import re

def extraer_marcas_desde_html(archivo_txt):
    """
    Lee un archivo .txt con HTML que contiene una lista <ul><li>...</li></ul>
    y extrae los nombres limpios de las marcas, eliminando símbolos como ® y espacios.

    Args:
        archivo_txt (str): La ruta al archivo de texto con el HTML.

    Returns:
        list: Una lista de strings con las marcas extraídas y limpias.
    """
    try:
        with open(archivo_txt, 'r', encoding='utf-8') as file:
            html = file.read()
    except FileNotFoundError:
        print(f"[ERROR] No se encontró el archivo: {archivo_txt}")
        return []

    # Usamos una expresión regular para extraer el texto dentro de cada <li>
    # Buscamos: <li...> texto </li> y capturamos el texto.
    patron = re.compile(r'<li[^>]*>(.*?)</li>', re.IGNORECASE | re.DOTALL)
    coincidencias = patron.findall(html)
    
    # Limpiamos cada texto y filtramos las marcas vacías.
    marcas_limpias = []
    for texto in coincidencias:
        # Elimina símbolos de marca registrada, derechos de autor, etc.
        limpio = re.sub(r'', '', texto)
        # Elimina espacios en blanco, saltos de línea y tabulaciones al inicio y final.
        limpio = limpio.strip()
        # Solo agrega la marca si no está vacía después de la limpieza.
        if limpio:
            marcas_limpias.append(limpio)
            
    return marcas_limpias

# === USO ===
if __name__ == "__main__":
    archivo = "lista_marcas.txt"  # Cambia por el nombre de tu archivo
    marcas = extraer_marcas_desde_html(archivo)

    if marcas:
        print("Marcas extraídas:")
        for i, marca in enumerate(marcas, 1):
            print(f"{i}. {marca}")

        # Guardar en un archivo .txt
        try:
            with open("marcas_extraidas.txt", "w", encoding="utf-8") as f:
                for marca in marcas:
                    f.write(marca + "\n")
            print(f"\n✅ {len(marcas)} marcas extraídas y guardadas en 'marcas_extraidas.txt'")
        except Exception as e:
            print(f"\n[ERROR] No se pudo guardar el archivo: {e}")
    else:
        print("No se encontraron marcas para extraer.")