// fix_long_area.mjs — Calcular longitud_km/area_ha con ST_Length/Area sobre geography
//
// SRID 4686 es geográfico (lat/lon en grados), NO proyectado en metros.
// Para distancias/áreas en metros, hay que castear a geography.

import postgres from "postgres";
const url = process.env.DATABASE_URL;
if (!url) { console.error("Falta DATABASE_URL"); process.exit(1); }
const sql = postgres(url, { max: 4, onnotice: () => {} });

console.log("[fix] Calculando longitud_km/m para propuestas_línea (geography)...");
const r1 = await sql`
  UPDATE sgs_pro_propuesta_linea
  SET longitud_m  = ST_Length(geom::geography),
      longitud_km = ST_Length(geom::geography) / 1000.0
  WHERE geom IS NOT NULL
`;
console.log(`  ${r1.count} líneas actualizadas`);

console.log("\n[fix] Calculando area_ha/m2 para propuestas_polígono (geography)...");
const r2 = await sql`
  UPDATE sgs_pro_propuesta_poligono
  SET area_m2 = ST_Area(geom::geography),
      area_ha = ST_Area(geom::geography) / 10000.0
  WHERE geom IS NOT NULL
`;
console.log(`  ${r2.count} polígonos actualizados`);

console.log("\n[fix] Verificación post-fix:");
const v = await sql`
  SELECT
    (SELECT count(*)::int FROM sgs_pro_propuesta_linea WHERE longitud_km > 0) AS linea_km_pos,
    (SELECT round(COALESCE(SUM(longitud_km),0)::numeric, 2) FROM sgs_pro_propuesta_linea) AS linea_km_total,
    (SELECT count(*)::int FROM sgs_pro_propuesta_poligono WHERE area_ha > 0) AS polig_ha_pos,
    (SELECT round(COALESCE(SUM(area_ha),0)::numeric, 2) FROM sgs_pro_propuesta_poligono) AS polig_ha_total
`;
console.log(" ", v[0]);

// Recalcular métricas de las metas
console.log("\n[fix] MÉTRICAS RECALCULADAS:");

console.log("\n  C1A1 (línea, 12 km cercos vivos + 12 km alambre):");
const c1a1 = await sql`
  SELECT
    round(SUM(CASE WHEN pl.actividad ILIKE '%cerco vivo%' OR pl.actividad ILIKE '%cerca viva%' THEN pl.longitud_km ELSE 0 END)::numeric, 2) AS km_cercos_vivos,
    round(SUM(CASE WHEN pl.actividad ILIKE '%alambre%' THEN pl.longitud_km ELSE 0 END)::numeric, 2) AS km_alambre,
    round(SUM(CASE WHEN pl.actividad ILIKE '%multiestrat%' THEN pl.longitud_km ELSE 0 END)::numeric, 2) AS km_multiestrat
  FROM sgs_pro_propuesta_linea pl
  JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pl.id_propuesta
  JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
  JOIN sgs_com_componente c ON c.id_componente = a.id_componente
  WHERE c.nombre = 'C1' AND a.nombre = 'A1'
`;
console.log("    km cercos vivos:", c1a1[0].km_cercos_vivos, "/ meta 12 km");
console.log("    km alambre:", c1a1[0].km_alambre, "/ meta 12 km");
console.log("    km multiestrat:", c1a1[0].km_multiestrat);

console.log("\n  C1A2 (polígono, 15 ha conectividad + 15 ha silvopastoril + 15 ha agroforestal):");
const c1a2 = await sql`
  SELECT
    round(SUM(CASE WHEN pq.actividad ILIKE '%conectividad%' OR pq.actividad ILIKE '%franja%' OR pq.actividad ILIKE '%arreglo%' OR pq.actividad ILIKE '%perimetral%' THEN pq.area_ha ELSE 0 END)::numeric, 2) AS ha_conectividad,
    round(SUM(CASE WHEN pq.actividad ILIKE '%silvopastoril%' OR pq.actividad ILIKE '%silvopast%' OR pq.actividad ILIKE '%pastos arbolados%' OR pq.actividad ILIKE '%enriquecimiento%' OR pq.actividad ILIKE '%pradera%' OR pq.actividad ILIKE '%potrero%' OR pq.actividad ILIKE '%ssp%' THEN pq.area_ha ELSE 0 END)::numeric, 2) AS ha_silvopastoril,
    round(SUM(CASE WHEN pq.actividad ILIKE '%agroforestal%' OR pq.actividad ILIKE '%huerta%' OR pq.actividad ILIKE '%callejon%' OR pq.actividad ILIKE '%modulo%' OR pq.actividad ILIKE '%modulos%' OR pq.actividad ILIKE '%banco%' OR pq.actividad ILIKE '%bosque comestible%' THEN pq.area_ha ELSE 0 END)::numeric, 2) AS ha_agroforestal
  FROM sgs_pro_propuesta_poligono pq
  JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pq.id_propuesta
  JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
  JOIN sgs_com_componente c ON c.id_componente = a.id_componente
  WHERE c.nombre = 'C1' AND a.nombre = 'A2'
`;
console.log("    ha conectividad:", c1a2[0].ha_conectividad, "/ meta 15 ha");
console.log("    ha silvopastoril:", c1a2[0].ha_silvopastoril, "/ meta 15 ha");
console.log("    ha agroforestal:", c1a2[0].ha_agroforestal, "/ meta 15 ha");

console.log("\n  C2A1 (punto, 79 cosecha + 79 compostaje):");
const c2a1 = await sql`
  SELECT
    SUM(CASE WHEN pt.actividad ILIKE '%cosecha%' THEN 1 ELSE 0 END)::int AS n_cosecha,
    SUM(CASE WHEN pt.actividad ILIKE '%compostaje%' OR pt.actividad ILIKE '%compost%' THEN 1 ELSE 0 END)::int AS n_compostaje
  FROM sgs_pro_propuesta_punto pt
  JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pt.id_propuesta
  JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
  JOIN sgs_com_componente c ON c.id_componente = a.id_componente
  WHERE c.nombre = 'C2' AND a.nombre = 'A1'
`;
console.log("    cosecha agua:", c2a1[0].n_cosecha, "/ meta 79");
console.log("    compostaje:", c2a1[0].n_compostaje, "/ meta 79");

console.log("\n  C2A2 (punto, 7 estaciones + 48 obras):");
const c2a2 = await sql`
  SELECT
    SUM(CASE WHEN pt.actividad ILIKE '%estacion%limnimet%' OR pt.actividad ILIKE '%limnimet%' THEN 1 ELSE 0 END)::int AS n_estaciones,
    SUM(CASE WHEN pt.actividad ILIKE '%captacion%' OR pt.actividad ILIKE '%c aptación%' THEN 1 ELSE 0 END)::int AS n_obras
  FROM sgs_pro_propuesta_punto pt
  JOIN sgs_pro_propuesta pp ON pp.id_propuesta = pt.id_propuesta
  JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
  JOIN sgs_com_componente c ON c.id_componente = a.id_componente
  WHERE c.nombre = 'C2' AND a.nombre = 'A2'
`;
console.log("    estaciones limnimétricas:", c2a2[0].n_estaciones, "/ meta 7");
console.log("    obras de captación:", c2a2[0].n_obras, "/ meta 48");

console.log("\n  C3 (predios en áreas protegidas, meta 35):");
const c3 = await sql`
  SELECT count(DISTINCT pp.id_predio)::int AS n
  FROM sgs_pro_propuesta pp
  JOIN sgs_com_accion a ON a.id_accion = pp.id_accion
  JOIN sgs_com_componente c ON c.id_componente = a.id_componente
  WHERE c.nombre = 'C3' AND pp.id_predio IS NOT NULL
`;
console.log("    predios C3:", c3[0].n, "/ meta 35");

await sql.end({ timeout: 5 });
