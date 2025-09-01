-- Migración: Seeding de catálogos logísticos (servicios, paqueterías y relación)
-- Objetivo: insertar/actualizar registros base e insertar mapeos idempotentes.
-- Notas:
--  - Usa INSERT ... ON CONFLICT (code) DO UPDATE para catálogos por código.
--  - Usa INSERT ... SELECT con DO NOTHING para service_carriers.
--  - Actualiza updated_at con NOW() en upserts.

-- 1) Servicios logísticos base
--    EXPRESS_PL → "Express PL"
--    WISHIP     → "Wiship"
INSERT INTO public.logistic_services (code, name, is_active, updated_at)
VALUES
  ('EXPRESS_PL', 'Express PL', TRUE, NOW()),
  ('WISHIP',     'Wiship',     TRUE, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 2) Paqueterías base
--    EXPRESS_PL (carrier propia), FEDEX, ESTAFETA, DHL, UPS
INSERT INTO public.carriers (code, name, api_endpoint, is_active, updated_at)
VALUES
  ('EXPRESS_PL', 'Express PL', NULL, TRUE, NOW()),
  ('FEDEX',      'FedEx',      NULL, TRUE, NOW()),
  ('ESTAFETA',   'Estafeta',   NULL, TRUE, NOW()),
  ('DHL',        'DHL',        NULL, TRUE, NOW()),
  ('UPS',        'UPS',        NULL, TRUE, NOW())
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  api_endpoint = EXCLUDED.api_endpoint,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 3) Relación servicio → paqueterías compatibles
--    EXPRESS_PL → [EXPRESS_PL]
--    Limpieza de asociaciones no deseadas (por cambios de reglas)
DELETE FROM public.service_carriers sc
USING public.logistic_services s, public.carriers c
WHERE sc.service_id = s.id AND sc.carrier_id = c.id
  AND s.code = 'EXPRESS_PL'
  AND c.code IN ('DHL','FEDEX');

INSERT INTO public.service_carriers (service_id, carrier_id)
SELECT s.id, c.id
FROM public.logistic_services s
JOIN public.carriers c ON c.code IN ('EXPRESS_PL')
WHERE s.code = 'EXPRESS_PL'
ON CONFLICT DO NOTHING;

--    WISHIP → [FEDEX, ESTAFETA, DHL, UPS]
INSERT INTO public.service_carriers (service_id, carrier_id)
SELECT s.id, c.id
FROM public.logistic_services s
JOIN public.carriers c ON c.code IN ('FEDEX','ESTAFETA','DHL','UPS')
WHERE s.code = 'WISHIP'
ON CONFLICT DO NOTHING;

-- Fin de migración
