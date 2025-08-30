Feature: Tickets con Servicio logístico y Paquetería

Qué se agregó
- Nuevas tablas: logistic_services, service_carriers, ticket_events (auditoría).
- Tabla tickets ampliada con columnas: service_id, carrier_id, tracking_number, label_url, service_level, package_count, weight_kg, length_cm, width_cm, height_cm, external_refs, shipped_at, delivered_at, canceled_at, sla_due_at.
- Endpoints backend:
  - GET /api/logistic-services
  - GET /api/service-carriers?serviceId=ID
  - PATCH /api/tickets/:id/service { serviceId, carrierId? }
  - PATCH /api/tickets/:id/shipping-data { weight_kg, length_cm, width_cm, height_cm, package_count, service_level }
  - PATCH /api/tickets/:id/status { status }
  - PATCH /api/tickets/:id/tracking { tracking_number, label_url, carrierId? }
- GET /api/tickets ahora incluye serviceName y carrierName, además de tracking/medidas.
- Frontend Tickets:
  - Columnas: Ticket | Pedido | Producto (SKU) | Servicio logístico | Paquetería | Tracking | Fecha | Acciones
  - Modal con edición de Servicio/Paquetería, Datos de envío y Tracking.

Migración
- SQL en server/migrations/2025-08-29_tickets_logistics.sql (idempotente, con semillas Wiship/Express PL y paqueterías DHL/FEDEX/ESTAFETA).

Pruebas manuales
1) Cambiar servicio a Wiship/Express PL
   - En la tabla de Tickets, abrir el modal (icono “Ver”).
   - Seleccionar “Servicio logístico”. Debe guardar y reflejar el nombre en la tabla.
2) Seleccionar paquetería válida
   - Tras elegir servicio, el segundo Select carga paqueterías compatibles. Guardar selección.
3) Guardar peso/medidas y service_level
   - Completar “Paquetes (>=1)”, “Peso kg (>0)” y dimensiones. Guardar. Debe persistir sin errores.
4) Asignar tracking_number/label_url y verificar estado
   - Ingresar número de guía y URL de etiqueta y “Guardar”.
   - El estado del ticket pasa a ETIQUETA_GENERADA si antes estaba ABIERTO/open.
   - Ver botón “Ver etiqueta” en la tabla y “Copiar”.
5) Consultar auditoría ticket_events
   - Verificar registros para SERVICE_SET, SHIPPING_DATA_UPDATED, TRACKING_UPDATED y STATUS_CHANGED.

Notas
- Validaciones: package_count >= 1, weight_kg > 0 (backend y UI).
- Compatibilidad: no se removieron endpoints existentes; status admite valores previos (open/closed).
- UI en español (labels/toasts).
