"""
Modulo para integración con Shopify.
Gestiona creación de órdenes y estados BIW: Recibida, Enviada, Entregada, Cancelada.
+ Soporte de Metafields (definición, escritura y lectura): "logistics.delivery_date"
Autor: David Velasquez / ULUM
Fecha: 2025
"""
import requests
import json
import os
from typing import Optional, Tuple, Any, Dict

# --- CONFIGURACIÓN DE TIENDA ---
SHOP_NAME = 'c3b13f-2'
ACCESS_TOKEN = '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'
API_VERSION = '2025-07'
BASE_URL = f'https://{SHOP_NAME}.myshopify.com/admin/api/{API_VERSION}'
GRAPHQL_URL = f'{BASE_URL}/graphql.json'
HEADERS = {
    "X-Shopify-Access-Token": ACCESS_TOKEN,
    "Content-Type": "application/json"
}

# --- CONFIG METAFIELD POR DEFECTO ---
MF_NAMESPACE = "Logistica"
MF_KEY = "FechaEntrega"      # cambia si quieres otro key
MF_TYPE = "date"              # usa "date_time" si necesitas hora

# Archivo para almacenar el último número de orden
ORDER_COUNTER_FILE = "order_counter.txt"


# -------------------- HELPERS GENERALES --------------------

def get_next_order_number():
    """Obtiene y actualiza el siguiente número de orden WWP"""
    if os.path.exists(ORDER_COUNTER_FILE):
        with open(ORDER_COUNTER_FILE, "r") as f:
            try:
                last_number = int(f.read().strip())
            except ValueError:
                last_number = 0
    else:
        last_number = 0

    next_number = last_number + 1
    with open(ORDER_COUNTER_FILE, "w") as f:
        f.write(str(next_number))

    return f"WWP{next_number:03d}"


def _order_numeric_id_to_gid(order_id: int) -> str:
    """Convierte un ID numérico de orden a GID GraphQL."""
    return f"gid://shopify/Order/{order_id}"


def graphql_request(query: str, variables: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Hace una petición GraphQL a Shopify Admin, maneja errores comunes y devuelve JSON."""
    payload = {"query": query}
    if variables:
        payload["variables"] = variables

    r = requests.post(GRAPHQL_URL, headers=HEADERS, json=payload)
    try:
        r.raise_for_status()
    except requests.HTTPError as e:
        # Intenta imprimir detalles útiles del cuerpo
        try:
            print("GraphQL error response:", r.json())
        except Exception:
            print("GraphQL text response:", r.text)
        raise e

    data = r.json()
    if "errors" in data and data["errors"]:
        # Errores a nivel de operación
        raise RuntimeError(f"GraphQL Operation Errors: {data['errors']}")
    return data


# -------------------- METAFIELDS: DEFINICIÓN / SET / GET --------------------

def ensure_order_metafield_definition(namespace: str = MF_NAMESPACE, key: str = MF_KEY, mf_type: str = MF_TYPE):
    """
    Crea la definición para ORDER si no existe.
    """
    mutation = """
    mutation CreateDef($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition {
          id
          name
          namespace
          key
          ownerType
        }
        userErrors { field message code }
      }
    }
    """
    variables = {
      "definition": {
        "name": "Fecha de Entrega",
        "namespace": namespace,
        "key": key,
        "description": "Fecha de entrega real y confirmada por logística",
        "type": mf_type,
        "ownerType": "ORDER"
      }
    }
    data = graphql_request(mutation, variables)["data"]["metafieldDefinitionCreate"]
    if data.get("createdDefinition"):
        cd = data["createdDefinition"]
        print(f"✅ Definición lista: {cd['namespace']}.{cd['key']} (owner={cd['ownerType']})")
        return cd.get("id")

    errs = data.get("userErrors") or []
    if errs:
        # --- LÓGICA CORREGIDA AQUÍ ---
        # Ahora verifica si el error es 'TAKEN' (ya existe) o si el mensaje lo menciona
        is_taken_error = any(e.get("code") == "TAKEN" for e in errs)
        msg_contains_already = any("already exists" in e.get("message", "").lower() for e in errs)
        
        if is_taken_error or msg_contains_already:
            print(f"ℹ️ La definición {namespace}.{key} ya existe y no necesita ser creada.")
            return None
        # --- FIN DE LA LÓGICA CORREGIDA ---
        
        raise RuntimeError(f"metafieldDefinitionCreate userErrors: {errs}")

    return None
    """
    Crea la definición para ORDER si no existe.
    - type: "date" o "date_time"
    - ownerType: "ORDER"
    """
    mutation = """
    mutation CreateDef($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition {
          id
          name
          namespace
          key
          ownerType
        }
        userErrors { field message code }
      }
    }
    """
    variables = {
      "definition": {
        "name": "Fecha de Entrega",
        "namespace": namespace,
        "key": key,
        "description": "Fecha de entrega real y confirmada por logística",
        "type": mf_type,          # "date" | "date_time"
        "ownerType": "ORDER"
        # Si quieres controlar visibilidad/acceso: usa "access", no visibleToStorefrontApi
        # "access": { "admin": "MERCHANT_READ" }
      }
    }
    data = graphql_request(mutation, variables)["data"]["metafieldDefinitionCreate"]
    if data.get("createdDefinition"):
        cd = data["createdDefinition"]
        print(f"✅ Definición lista: {cd['namespace']}.{cd['key']} (owner={cd['ownerType']})")
        return cd.get("id")

    errs = data.get("userErrors") or []
    # Si ya existía, Shopify suele devolver un error de conflicto (lo ignoramos con mensaje)
    if errs:
        msg = " ".join(e.get("message","").lower() for e in errs)
        if "already exists" in msg or "already" in msg:
            print(f"ℹ️ La definición {namespace}.{key} ya existe.")
            return None
        raise RuntimeError(f"metafieldDefinitionCreate userErrors: {errs}")

    return None


def set_order_metafield(order_id: int, value: str, namespace: str = MF_NAMESPACE, key: str = MF_KEY, mf_type: str = MF_TYPE):
    """
    Establece el metafield en la orden.
    - mf_type: "date" -> value "YYYY-MM-DD"
               "date_time" -> ISO 8601 (e.g., "2025-08-29T00:00:00Z")
    """
    ensure_order_metafield_definition(namespace, key, mf_type)
    gid = _order_numeric_id_to_gid(order_id)

    mutation = """
    mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { key namespace value updatedAt }
        userErrors { field message code }
      }
    }
    """
    variables = {
      "metafields": [{
        "ownerId": gid,
        "namespace": namespace,
        "key": key,
        "type": mf_type,   # string enum: "date" | "date_time" | "single_line_text_field" etc.
        "value": value
      }]
    }
    resp = graphql_request(mutation, variables)["data"]["metafieldsSet"]
    errs = resp.get("userErrors") or []
    if errs:
        raise RuntimeError(f"metafieldsSet userErrors: {errs}")

    mf = (resp.get("metafields") or [None])[0]
    if mf:
        print(f"✅ Metafield {namespace}.{key} = {mf['value']}")
        return mf.get("value")
    print("⚠️ No se devolvió el metafield tras set.")
    return None


def get_order_metafield(order_id: int, namespace: str = MF_NAMESPACE, key: str = MF_KEY):
    gid = _order_numeric_id_to_gid(order_id)
    query = """
    query GetOrderMF($id: ID!, $ns: String!, $key: String!) {
      order(id: $id) {
        metafield(namespace: $ns, key: $key) { type value }
      }
    }
    """
    data = graphql_request(query, {"id": gid, "ns": namespace, "key": key})["data"]["order"]
    mf = data.get("metafield")
    if mf:
        print(f"ℹ️ {namespace}.{key} => {mf['value']} (type={mf['type']})")
        return mf
    print(f"ℹ️ {namespace}.{key} no existe en la orden {order_id}.")
    return None


# -------------------- LÓGICA EXISTENTE: ÓRDENES/ESTATUS --------------------

def crear_orden(line_items):
    """
    Crea una orden en Shopify con estado Recibida (PAID + UNFULFILLED)
    Genera automáticamente un nombre con prefijo WWP y numeración secuencial
    :param line_items: lista de diccionarios con variant_id y quantity
    :return: order_id, order_data
    """
    total_items = sum(item['quantity'] for item in line_items)
    costo_envio_total = total_items * 140

    # Generar nombre automático con prefijo WWP
    order_name = get_next_order_number()
    print(f"📝 Generando nombre de orden: {order_name}")

    url = f"{BASE_URL}/orders.json"
    data = {
        "order": {
            "name": order_name,
            "line_items": line_items,
            "financial_status": "paid",
            "customer": {
                "first_name": "Cliente",
                "last_name": "David",
                "email": "dmau639@gmail.com"
            },
            "shipping_address": {
                "first_name": "David",
                "last_name": "ULUM",
                "address1": "Calle Falsa 123",
                "phone": "5512345678",
                "city": "Ciudad de México",
                "province": "CDMX",
                "country": "MX",
                "zip": "03100"
            },
            "billing_address": {
                "first_name": "David",
                "last_name": "BIW",
                "address1": "Calle Falsa 123",
                "phone": "5512345678",
                "city": "Ciudad de México",
                "province": "CDMX",
                "country": "MX",
                "zip": "03100"
            },
            "shipping_lines": [{
                "title": "Envío estándar",
                "price": str(costo_envio_total),
                "code": "STANDARD",
                "source": "ww"
            }],
            "fulfillment_status": "unfulfilled",
            "tags": "test "
        }
    }

    try:
        response = requests.post(url, headers=HEADERS, json=data)
        response.raise_for_status()
        order_data = response.json()["order"]
        order_id = order_data["id"]
        print(f"\n✅ Orden creada: {order_data['name']}")
        print(f"   ID: {order_id}")
        print(f"   Financial Status: {order_data['financial_status']}")
        print(f"   Fulfillment Status: {order_data['fulfillment_status']}")
        return order_id, order_data
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Error al crear orden: {e}")
        if e.response:
            try:
                error_detail = e.response.json()
                print(f"   Detalles: {error_detail}")
            except:
                print(f"   Respuesta: {e.response.text}")
        return None, None


def marcar_como_enviada(order_id, tracking_number, carrier="Estafeta"):
    """
    Marca una orden como enviada (FULFILLED + IN_TRANSIT)
    """
    url = f"{BASE_URL}/orders/{order_id}/fulfillments.json"
    data = {
        "fulfillment": {
            "tracking_number": tracking_number,
            "tracking_company": carrier,
            "notify_customer": False
        }
    }

    try:
        response = requests.post(url, headers=HEADERS, json=data)
        response.raise_for_status()
        fulfillment = response.json()["fulfillment"]
        print(f"\n🚚 Orden {order_id} marcada como ENVIADA")
        print(f"   Tracking: {tracking_number} ({carrier})")
        print(f"   Status: {fulfillment['status']}")
        return fulfillment
    except Exception as e:
        print(f"\n❌ Error al marcar como enviada: {e}")
        if hasattr(e, 'response') and e.response.text:
            print(f"   Detalles: {e.response.text}")
        return None


def marcar_como_entregada(order_id):
    """
    Simula que la orden fue entregada.
    Nota: Shopify no permite marcar como entregado directamente vía REST.
    Pero puedes verificar deliveredAt en GraphQL o en el admin.
    """
    print(f"\n📦 Simulación: La orden {order_id} fue entregada.")
    print("   En producción, el campo 'deliveredAt' se actualiza cuando el fulfillment cambia a DELIVERED.")
    return True


def cancelar_orden(order_id, reason="CUSTOMER"):
    """
    Cancela y reembolsa una orden (REFUNDED + UNFULFILLED)
    """
    order_url = f"{BASE_URL}/orders/{order_id}.json"
    try:
        order_response = requests.get(order_url, headers=HEADERS)
        order_response.raise_for_status()
        order = order_response.json()["order"]

        refund_data = {
            "refund": {
                "shipping": {"full_refund": True},
                "refund_line_items": [
                    {"line_item_id": item["id"], "quantity": item["quantity"]}
                    for item in order["line_items"]
                ]
            }
        }

        calc_url = f"{BASE_URL}/orders/{order_id}/refunds/calculate.json"
        calc_response = requests.post(calc_url, headers=HEADERS, json=refund_data)
        calc_response.raise_for_status()
        calculated = calc_response.json()

        apply_url = f"{BASE_URL}/orders/{order_id}/refunds.json"
        final_refund = {
            "refund": {
                **calculated["refund"],
                "notify_customer": False
            }
        }

        apply_response = requests.post(apply_url, headers=HEADERS, json=final_refund)
        apply_response.raise_for_status()

        print(f"\n💸 Orden {order_id} REEMBOLSADA y cancelada")
        print(f"   Reason: {reason}")
        return True
    except Exception as e:
        print(f"\n❌ Error al cancelar orden: {e}")
        return False


# === FUNCIONES DE CONSULTA ===

def consultar_producto_y_precios():
    url = f"{BASE_URL}/products.json?limit=10"
    try:
        response = requests.get(url, headers=HEADERS)
        response.raise_for_status()
        products_data = response.json()
        print("\n Productos disponibles:")
        print("=" * 50)
        for i, product in enumerate(products_data['products']):
            print(f"\n{i+1}. {product['title']} (ID: {product['id']})")
            for j, variant in enumerate(product['variants']):
                print(f"     → {variant['title']}: ${variant['price']} (Variant ID: {variant['id']})")
        return products_data
    except Exception as e:
        print(f"\nError consultando productos: {e}")
        return None


def consultar_costo_envio():
    url = f"{BASE_URL}/shipping_zones.json"
    try:
        response = requests.get(url, headers=HEADERS)
        response.raise_for_status()
        zones = response.json().get('shipping_zones', [])
        print("\nZonas de envío configuradas:")
        for zone in zones:
            print(f"\nZona: {zone.get('name')}")
            for rate in zone.get('price_based_shipping_rates', []):
                print(f" - {rate.get('name')}: ${rate.get('price')}")
            for rate in zone.get('weight_based_shipping_rates', []):
                print(f" - {rate.get('name')}: ${rate.get('price')}")
            if zone.get('carrier_shipping_rate_providers'):
                print(" - Tarifas de transportista configuradas")
        for zone in zones:
            if zone.get('price_based_shipping_rates'):
                return float(zone['price_based_shipping_rates'][0]['price'])
        return None
    except Exception as e:
        print(f"\nError consultando envío: {e}")
        return None


def consultar_inventario(variant_id):
    variant_url = f"{BASE_URL}/variants/{variant_id}.json"
    try:
        response = requests.get(variant_url, headers=HEADERS)
        response.raise_for_status()
        variant_data = response.json()
        inventory_item_id = variant_data['variant']['inventory_item_id']

        inv_url = f"{BASE_URL}/inventory_levels.json?inventory_item_ids={inventory_item_id}"
        response = requests.get(inv_url, headers=HEADERS)
        response.raise_for_status()
        inventory_data = response.json()

        if inventory_data.get('inventory_levels'):
            stock = inventory_data['inventory_levels'][0]['available']
            print(f"\nInventario disponible: {stock} unidades")
            return stock
        else:
            print("\nNo se encontró inventario.")
            return 0
    except Exception as e:
        print(f"\nError en consulta de inventario: {e}")
        return None


def listar_pedidos_con_envio():
    url = f"{BASE_URL}/orders.json?status=any&limit=5"
    try:
        response = requests.get(url, headers=HEADERS)
        response.raise_for_status()
        orders = response.json().get('orders', [])
        print("\nPedidos recientes:")
        print("=" * 60)
        for order in orders:
            shipping_cost = sum(float(line['price']) for line in order.get('shipping_lines', []))
            print(f"Orden #{order['name']}")
            print(f"Fecha: {order['created_at']}")
            print(f"Total: ${order['total_price']} (Envío: ${shipping_cost})")
            print(f"Estado: {order['financial_status']}")
            print("Método de envío:")
            for shipping in order.get('shipping_lines', []):
                print(f" - {shipping['title']}: ${shipping['price']}")
            print("-" * 60)
        return orders
    except Exception as e:
        print(f"\nError al listar pedidos: {e}")
        return None


# === ESTADO BIW ===

def obtener_estatus_biw(order_id):
    """
    Determina el estatus BIW según los campos esperados.
    """
    url = f"{BASE_URL}/orders/{order_id}.json?fields=name,financial_status,fulfillment_status,cancelled_at,fulfillments,shipping_address,line_items"
    try:
        response = requests.get(url, headers=HEADERS)
        response.raise_for_status()
        order = response.json()["order"]

        fin_status = order.get("financial_status", "")
        ful_status = order.get("fulfillment_status", "")
        cancelled_at = order.get("cancelled_at")
        fulfillments = order.get("fulfillments", [])
        shipping_addr = order.get("shipping_address", {})

        # Cancelada
        if cancelled_at and fin_status == "refunded":
            return "Cancelada"

        # Enviada o Entregada
        if ful_status == "fulfilled":
            for f in fulfillments:
                if f.get("status") == "success":
                    if f.get("delivered_at"):
                        return "Entregada"
                    elif f.get("in_transit_at"):
                        return "Enviada"

        # Recibida
        if fin_status == "paid" and ful_status == "unfulfilled" and not cancelled_at:
            return "Recibida"

        # Complementarios
        if not shipping_addr.get("address1") or not shipping_addr.get("city"):
            return "Dirección inválida/incorrecta"

        for item in order.get("line_items", []):
            variant_id = item.get("variant_id")
            qty = item.get("quantity")
            if variant_id:
                stock = consultar_inventario(variant_id)
                if stock is not None and stock < qty:
                    return "Stock out"

        return "En proceso"
    except Exception as e:
        print(f"\nError obteniendo estatus BIW: {e}")
        return "Error"


# -------------------- MENÚ --------------------

def mostrar_menu():
    print("\n" + " " * 10 + "🔧 INTEGRACIÓN WW - SHOPIFY")
    print("=" * 50)
    print("1. Consultar productos y precios")
    print("2. Crear orden (Recibida) - Genera nombre WWP automáticamente")
    print("3. Consultar inventario")
    print("4. Consultar costo de envío")
    print("5. Listar pedidos recientes")
    print("6. Ver estatus BIW de una orden")
    print("7. Marcar orden como ENVIADA")
    print("8. Marcar orden como ENTREGADA (simulación)")
    print("9. Cancelar orden (Cancelada)")
    print("10. Escribir Fecha de Entrega (metafield)")
    print("11. Leer Fecha de Entrega (metafield)")
    print("0. Salir")


def main():
    print(f"🔧 Tienda: {SHOP_NAME}")
    print(f"📦 API Version: {API_VERSION}")
    print(f"🔗 Base URL: {BASE_URL}")

    while True:
        try:
            mostrar_menu()
            opcion = input("\nSelecciona una opción: ").strip()

            if opcion == "0":
                print("\n👋 ¡Hasta luego!")
                break

            elif opcion == "1":
                consultar_producto_y_precios()

            elif opcion == "2":
                print("\n📦 CREAR ORDEN (Recibida) - Nombre WWP generado automáticamente")
                line_items = []
                while True:
                    try:
                        vid = input("Variant ID (Enter para terminar): ").strip()
                        if not vid:
                            break
                        qty = int(input("Cantidad: ") or "1")
                        line_items.append({"variant_id": int(vid), "quantity": qty})
                    except ValueError:
                        print("❌ ID o cantidad inválidos.")
                if line_items:
                    order_id, _ = crear_orden(line_items)
                    if order_id:
                        print(f"✅ Usa ID {order_id} para avanzar estatus")

            elif opcion == "3":
                try:
                    vid = int(input("Variant ID: "))
                    consultar_inventario(vid)
                except ValueError:
                    print("❌ ID inválido.")

            elif opcion == "4":
                costo = consultar_costo_envio()
                if costo:
                    print(f"🚚 Costo de envío: ${costo}")

            elif opcion == "5":
                listar_pedidos_con_envio()

            elif opcion == "6":
                try:
                    oid = int(input("Order ID: "))
                    estatus = obtener_estatus_biw(oid)
                    print(f"\n📊 Estatus BIW: {estatus}")
                except ValueError:
                    print("❌ ID inválido.")

            elif opcion == "7":
                try:
                    oid = int(input("Order ID: "))
                    tracking = input("Número de tracking: ").strip()
                    if not tracking:
                        print("❌ Requiere número de tracking.")
                        continue
                    carrier = input("Paquetería (default Estafeta): ").strip() or "Estafeta"
                    marcar_como_enviada(oid, tracking, carrier)
                except ValueError:
                    print("❌ ID inválido.")

            elif opcion == "8":
                try:
                    oid = int(input("Order ID (simulación): "))
                    marcar_como_entregada(oid)
                except ValueError:
                    print("❌ ID inválido.")

            elif opcion == "9":
                try:
                    oid = int(input("Order ID a cancelar: "))
                    cancelar_orden(oid)
                except ValueError:
                    print("❌ ID inválido.")

            elif opcion == "10":
                try:
                    oid = int(input("Order ID: "))
                    if MF_TYPE == "date":
                        val = input("Fecha de entrega (YYYY-MM-DD): ").strip()
                    else:
                        val = input("Fecha/hora entrega ISO 8601 (p.ej. 2025-08-27T18:30:00Z): ").strip()
                    set_order_metafield(oid, val)
                except ValueError:
                    print("❌ ID inválido.")
                except Exception as e:
                    print(f"❌ Error al escribir metafield: {e}")

            elif opcion == "11":
                try:
                    oid = int(input("Order ID: "))
                    mf = get_order_metafield(oid)
                    if mf:
                        print(f"📅 Fecha de entrega: {mf['value']} (type={mf['type']})")
                    else:
                        print("📭 Sin fecha registrada.")
                except ValueError:
                    print("❌ ID inválido.")
                except Exception as e:
                    print(f"❌ Error al leer metafield: {e}")

            else:
                print("❌ Opción no válida.")

        except KeyboardInterrupt:
            print("\n\n👋 ¡Hasta luego!")
            break
        except Exception as e:
            print(f"\n❌ Error inesperado: {e}")


if __name__ == "__main__":
    main()
