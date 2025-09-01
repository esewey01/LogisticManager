// server/db/catalogs.ts
// Helpers para sembrar catálogos logísticos de forma idempotente.
// - upsertLogisticServices: inserta/actualiza servicios base.
// - upsertCarriers: inserta/actualiza paqueterías base.
// - linkServiceCarriers: crea relaciones servicio→paquetería si no existen.
// - seedLogisticsIfEmpty: verifica si tablas están vacías y siembra una sola vez.

import { db as baseDatos } from "../db";
import { sql } from "drizzle-orm";

/** Inserta o actualiza servicios logísticos base. */
export async function upsertLogisticServices(): Promise<void> {
  // Comentario: idempotente por ON CONFLICT (code); actualiza updated_at
  await baseDatos.execute(sql`
    INSERT INTO public.logistic_services (code, name, is_active, updated_at)
    VALUES
      ('EXPRESS_PL', 'Express PL', TRUE, NOW()),
      ('WISHIP',     'Wiship',     TRUE, NOW())
    ON CONFLICT (code) DO UPDATE SET
      name = EXCLUDED.name,
      is_active = EXCLUDED.is_active,
      updated_at = NOW();
  `);
}

/** Inserta o actualiza paqueterías base. */
export async function upsertCarriers(): Promise<void> {
  // Comentario: api_endpoint se deja NULL por ahora; actualizado con NOW()
  await baseDatos.execute(sql`
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
  `);
}

/** Crea relaciones servicio→paquetería si no existen (idempotente). */
export async function linkServiceCarriers(): Promise<void> {
  // Limpieza: EXPRESS_PL no debe vincular DHL/FEDEX
  await baseDatos.execute(sql`
    DELETE FROM public.service_carriers sc
    USING public.logistic_services s, public.carriers c
    WHERE sc.service_id = s.id AND sc.carrier_id = c.id
      AND s.code = 'EXPRESS_PL'
      AND c.code IN ('DHL','FEDEX');
  `);

  // EXPRESS_PL → [EXPRESS_PL]
  await baseDatos.execute(sql`
    INSERT INTO public.service_carriers (service_id, carrier_id)
    SELECT s.id, c.id
    FROM public.logistic_services s
    JOIN public.carriers c ON c.code IN ('EXPRESS_PL')
    WHERE s.code = 'EXPRESS_PL'
    ON CONFLICT DO NOTHING;
  `);

  // WISHIP → [FEDEX, ESTAFETA, DHL, UPS]
  await baseDatos.execute(sql`
    INSERT INTO public.service_carriers (service_id, carrier_id)
    SELECT s.id, c.id
    FROM public.logistic_services s
    JOIN public.carriers c ON c.code IN ('FEDEX','ESTAFETA','DHL','UPS')
    WHERE s.code = 'WISHIP'
    ON CONFLICT DO NOTHING;
  `);
}

/** Ejecuta el seeding completo (idempotente), sin verificar vacíos; devuelve totales. */
export async function seedLogistics(): Promise<{ services: number; carriers: number; mappings: number }> {
  console.info('[Seed] Sembrando catálogos logísticos (forzado)...');
  await upsertLogisticServices();
  await upsertCarriers();
  await linkServiceCarriers();

  const { rows: r1 } = await baseDatos.execute(sql`SELECT COUNT(*)::int AS n FROM public.logistic_services`);
  const { rows: r2 } = await baseDatos.execute(sql`SELECT COUNT(*)::int AS n FROM public.carriers`);
  const { rows: r3 } = await baseDatos.execute(sql`SELECT COUNT(*)::int AS n FROM public.service_carriers`);
  const services = Number(r1[0]?.n ?? 0);
  const carriers = Number(r2[0]?.n ?? 0);
  const mappings = Number(r3[0]?.n ?? 0);
  console.info(`[Seed] Totales -> servicios=${services}, paqueterías=${carriers}, vínculos=${mappings}`);
  return { services, carriers, mappings };
}

/**
 * Verifica si logistic_services o carriers están vacíos; si es así, siembra una sola vez.
 * No bloquea si ya existen datos: omite y sólo registra logs informativos.
 */
export async function seedLogisticsIfEmpty(): Promise<{ seeded: boolean; services: number; carriers: number; mappings: number }> {
  try {
    const { rows: a } = await baseDatos.execute(sql`SELECT COUNT(*)::int AS n FROM public.logistic_services`);
    const { rows: b } = await baseDatos.execute(sql`SELECT COUNT(*)::int AS n FROM public.carriers`);
    const countServices = Number(a[0]?.n ?? 0);
    const countCarriers = Number(b[0]?.n ?? 0);

    if (countServices === 0 || countCarriers === 0) {
      console.warn('[Seed] Catálogos logísticos vacíos; ejecutando seeding inicial...');
      await upsertLogisticServices();
      await upsertCarriers();
      await linkServiceCarriers();
      const { rows: r1 } = await baseDatos.execute(sql`SELECT COUNT(*)::int AS n FROM public.logistic_services`);
      const { rows: r2 } = await baseDatos.execute(sql`SELECT COUNT(*)::int AS n FROM public.carriers`);
      const { rows: r3 } = await baseDatos.execute(sql`SELECT COUNT(*)::int AS n FROM public.service_carriers`);
      const services = Number(r1[0]?.n ?? 0);
      const carriers = Number(r2[0]?.n ?? 0);
      const mappings = Number(r3[0]?.n ?? 0);
      console.info('[Seed] Seeding completado correctamente.');
      return { seeded: true, services, carriers, mappings };
    }

    // Ya hay datos; no hacer nada
    const { rows: r3 } = await baseDatos.execute(sql`SELECT COUNT(*)::int AS n FROM public.service_carriers`);
    const mappings = Number(r3[0]?.n ?? 0);
    console.info('[Seed] Catálogos ya poblados; se omite seeding.');
    return { seeded: false, services: countServices, carriers: countCarriers, mappings };
  } catch (e: any) {
    console.error('[Seed] Error durante verificación/siembra:', e?.message || e);
    throw e;
  }
}
