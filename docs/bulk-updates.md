Actualización masiva de servicio logístico y paquetería

Resumen
- Nuevos endpoints:
  - GET `/api/logistics/meta` → Servicios, Paqueterías y compatibilidad (service_carriers).
  - PATCH `/api/tickets/bulk/service` → Actualiza `service_id` y `carrier_id` en bloque.
- Corrección de GET `/api/tickets` para evitar error de SQL por GROUP BY.

Uso en UI (Tickets)
- Selecciona varias filas con los checkboxes.
- Barra superior muestra:
  - Select “Servicio logístico” (obligatorio)
  - Select “Paquetería” (opcional, filtrado por compatibilidad)
  - Botón “Aplicar”
  - Botón “Limpiar selección”

Flujo
1) La UI carga catálogos desde `/api/logistics/meta`.
2) Al hacer clic en “Aplicar”, envía:

```
PATCH /api/tickets/bulk/service
{
  "ids": [1,2,3],
  "serviceId": 10,
  "carrierId": 5 // opcional; puede ser null para limpiar
}
```

Validaciones del backend
- `serviceId` debe existir y estar activo.
- Si `carrierId` viene:
  - Debe existir y estar activo.
  - Si existe `service_carriers`, se valida la compatibilidad.

Respuesta
```
{ "updated": 3, "skipped": 0, "ids": [1,2,3] }
```

Notas
- El endpoint GET `/api/tickets` ahora usa `LEFT JOIN` y una subconsulta agregada por `order_id` para contar items y reunir SKUs/marcas sin usar `GROUP BY` en columnas no agregadas.
- El front tolera `serviceName`/`carrierName` nulos y muestra “—”.

