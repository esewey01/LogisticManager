-- Migración: soporte de Servicio logístico y Paquetería en Tickets
-- Objetivo: nuevas tablas y columnas para modelar servicios de logística, paqueterías y tracking.
-- NOTA: idempotente; usa IF NOT EXISTS y ON CONFLICT DO NOTHING para no fallar si ya existe.

-- 1) Catálogo de servicios logísticos
CREATE TABLE IF NOT EXISTS public.logistic_services (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS logistic_services_code_unique ON public.logistic_services(code);

-- 2) Catálogo de paqueterías ya existe (public.carriers); aseguramos índices
CREATE UNIQUE INDEX IF NOT EXISTS carriers_code_unique ON public.carriers(code);

-- 3) Puente servicio <-> paquetería
CREATE TABLE IF NOT EXISTS public.service_carriers (
  service_id INT NOT NULL REFERENCES public.logistic_services(id) ON DELETE CASCADE,
  carrier_id INT NOT NULL REFERENCES public.carriers(id) ON DELETE CASCADE,
  PRIMARY KEY(service_id, carrier_id)
);

-- 4) Eventos/auditoría de tickets
CREATE TABLE IF NOT EXISTS public.ticket_events (
  id SERIAL PRIMARY KEY,
  ticket_id INT NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_ticket_events_ticket ON public.ticket_events(ticket_id);
CREATE INDEX IF NOT EXISTS ix_ticket_events_type ON public.ticket_events(event_type);

-- 5) Ampliación de tabla tickets (no elimina columnas viejas; quedan deprecadas en UI)
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS service_id INT REFERENCES public.logistic_services(id),
  ADD COLUMN IF NOT EXISTS carrier_id INT REFERENCES public.carriers(id),
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS label_url TEXT,
  ADD COLUMN IF NOT EXISTS service_level TEXT,
  ADD COLUMN IF NOT EXISTS package_count INT,
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS length_cm NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS width_cm NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS status TEXT, -- Sugerido: ABIERTO, ETIQUETA_GENERADA, EN_TRÁNSITO, ENTREGADO, CANCELADO, FALLIDO
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS external_refs JSONB,
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMP;

-- 6) Índices útiles
CREATE INDEX IF NOT EXISTS ix_tickets_service ON public.tickets(service_id);
CREATE INDEX IF NOT EXISTS ix_tickets_carrier ON public.tickets(carrier_id);
CREATE INDEX IF NOT EXISTS ix_tickets_tracking ON public.tickets(tracking_number);
CREATE INDEX IF NOT EXISTS ix_tickets_status ON public.tickets(status);

-- 7) Semillas de datos básicos
-- Servicios logísticos
INSERT INTO public.logistic_services(name, code)
SELECT v.name, v.code
FROM (VALUES
  ('Wiship', 'WISHIP'),
  ('Express PL', 'EXPRESS_PL')
) AS v(name, code)
ON CONFLICT (code) DO NOTHING;

-- Paqueterías base
INSERT INTO public.carriers(name, code, api_endpoint, is_active)
SELECT v.name, v.code, v.api_endpoint, TRUE
FROM (VALUES
  ('DHL', 'DHL', 'https://api.dhl.com'),
  ('FEDEX', 'FEDEX', 'https://api.fedex.com'),
  ('Estafeta', 'ESTAFETA', 'https://api.estafeta.com')
) AS v(name, code, api_endpoint)
ON CONFLICT (code) DO NOTHING;

-- Asociaciones servicio-paquetería (puentes)
-- Wiship soporta: DHL, FEDEX, ESTAFETA
INSERT INTO public.service_carriers(service_id, carrier_id)
SELECT s.id, c.id
FROM public.logistic_services s
JOIN public.carriers c ON c.code IN ('DHL','FEDEX','ESTAFETA')
WHERE s.code = 'WISHIP'
ON CONFLICT DO NOTHING;

-- Express PL soporta: DHL, FEDEX
INSERT INTO public.service_carriers(service_id, carrier_id)
SELECT s.id, c.id
FROM public.logistic_services s
JOIN public.carriers c ON c.code IN ('DHL','FEDEX')
WHERE s.code = 'EXPRESS_PL'
ON CONFLICT DO NOTHING;

-- Comentarios de deprecación (UI)
-- Las columnas antiguas de UI "Marca", "Items", "Estado", "Estado Stock" permanecen por compatibilidad.
-- En el frontend se reemplazan por "Servicio logístico" y "Paquetería".

