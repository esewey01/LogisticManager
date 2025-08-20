"""
Modulo para integración con Shopify.
Gestiona creación de órdenes y estados BIW: Recibida, Enviada, Entregada, Cancelada.
Autor: David Velasquez / ULUM
Fecha: 2025
"""
import requests
import json

# --- CONFIGURACIÓN DE TIENDA ---
SHOP_NAME = 'c3b13f-2'
ACCESS_TOKEN = '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'
API_VERSION = '2025-07'
BASE_URL = f'https://{SHOP_NAME}.myshopify.com/admin/api/{API_VERSION}'
HEADERS = {
    "X-Shopify-Access-Token": ACCESS_TOKEN,
    "Content-Type": "application/json"
}


# === FUNCIONES PRINCIPALES ===

def crear_orden(line_items, order_name=None):
    """
    Crea una orden en Shopify con estado Recibida (PAID + UNFULFILLED)
    :param line_items: lista de diccionarios con variant_id y quantity
    :param order_name: nombre personalizado (ej: WW1001)
    :return: order_id, order_data
    """
    total_items = sum(item['quantity'] for item in line_items)
    costo_envio_total = total_items * 140

    if not order_name:
        order_name = f"WW-{len(line_items)}-{total_items}"

    url = f"{BASE_URL}/orders.json"
    data = {
        "order": {
            "name": order_name,
            "line_items": line_items,
            "customer": {
                "first_name": "David",
                "last_name": "Prueba",
                "email": "dmau639@gmail.com"
            },
            "shipping_address": {
                "first_name": "David",
                "last_name": "ULUM",
                "address1": "Calle Falsa 123",  # ✅ Corregido
                "phone": "5512345678",
                "city": "Ciudad de México",
                "province": "CDMX",
                "country": "MX",
                "zip": "03100"
            },
            "billing_address": {
                "first_name": "David",
                "last_name": "BIW",
                "address1": "Calle Falsa 123",  # ✅ Corregido
                "phone": "5512345678",
                "city": "Ciudad de México",
                "province": "CDMX",
                "country": "MX",
                "zip": "03100"
            },
            "financial_status": "paid",
            "tags": "test"
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
        if e.response is not None:  # ← Verifica que haya respuesta
            try:
                error_detail = e.response.json()
                print(f"   ❗ Error de Shopify (JSON): {json.dumps(error_detail, indent=2, ensure_ascii=False)}")
            except Exception as parse_error:
                print(f"   📄 Respuesta cruda (no JSON): {e.response.text}")
        else:
            print("   ❌ No hubo respuesta del servidor.")
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


# === MENÚ ===

def mostrar_menu():
    print("\n" + " " * 10 + "🔧 INTEGRACIÓN WW - SHOPIFY")
    print("=" * 50)
    print("1. Consultar productos y precios")
    print("2. Crear orden (Recibida)")
    print("3. Consultar inventario")
    print("4. Consultar costo de envío")
    print("5. Listar pedidos recientes")
    print("6. Ver estatus BIW de una orden")
    print("7. Marcar orden como ENVIADA")
    print("8. Marcar orden como ENTREGADA (simulación)")
    print("9. Cancelar orden (Cancelada)")
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
                print("\n📦 CREAR ORDEN (Recibida)")
                order_name = input("Nombre de la orden (ej: WW1001): ").strip() or None
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
                    order_id, _ = crear_orden(line_items, order_name)
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

            else:
                print("❌ Opción no válida.")

        except KeyboardInterrupt:
            print("\n\n👋 ¡Hasta luego!")
            break
        except Exception as e:
            print(f"\n❌ Error inesperado: {e}")


if __name__ == "__main__":
    main()