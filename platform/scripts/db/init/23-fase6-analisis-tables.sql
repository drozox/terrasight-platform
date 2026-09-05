-- =============================================================================
-- Fase 6 — Indicadores y Relaciones de análisis (S5.M+)
--
-- Agrega las 5 junction tables (extendidas con area + porcentaje + geom) y
-- las 5 indicator tables nuevas. Migración desde el GDB (sgs_ind_*) y
-- junction tables (sgs_rel_predio_*) que ya están pobladas en la GDB.
--
-- Las junction tables en PG ya existían (01-schema.sql) pero con schema
-- minimal. Las extendemos con:
--   - area_interseccion_ha: área de la intersección (ST_Area en ha)
--   - porcentaje_predio: % del predio cubierto por esa capa
--   - geom: geometría de la intersección (3D MultiPolygon, EPSG:4686)
--
-- Las 5 indicator tables son NUEVAS en PG. Su diseño es limpio (no
-- denormalizado): tienen id_predio FK + las columnas de análisis del spec.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Junction tables: extender schema con area, porcentaje y geom
-- -----------------------------------------------------------------------------
ALTER TABLE sgs_rel_predio_cobertura
  ADD COLUMN IF NOT EXISTS area_interseccion_ha DECIMAL(14,4),
  ADD COLUMN IF NOT EXISTS porcentaje_predio      DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS geom                   GEOMETRY(MULTIPOLYGON, 4686);

ALTER TABLE sgs_rel_predio_bioma
  ADD COLUMN IF NOT EXISTS area_interseccion_ha DECIMAL(14,4),
  ADD COLUMN IF NOT EXISTS porcentaje_predio      DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS geom                   GEOMETRY(MULTIPOLYGON, 4686);

ALTER TABLE sgs_rel_predio_paramos
  ADD COLUMN IF NOT EXISTS area_interseccion_ha DECIMAL(14,4),
  ADD COLUMN IF NOT EXISTS porcentaje_predio      DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS geom                   GEOMETRY(MULTIPOLYGON, 4686);

ALTER TABLE sgs_rel_predio_zonificacion_pomca
  ADD COLUMN IF NOT EXISTS area_interseccion_ha DECIMAL(14,4),
  ADD COLUMN IF NOT EXISTS porcentaje_predio      DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS geom                   GEOMETRY(MULTIPOLYGON, 4686);

ALTER TABLE sgs_rel_predio_zonificacion_rfp
  ADD COLUMN IF NOT EXISTS area_interseccion_ha DECIMAL(14,4),
  ADD COLUMN IF NOT EXISTS porcentaje_predio      DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS geom                   GEOMETRY(MULTIPOLYGON, 4686);

-- -----------------------------------------------------------------------------
-- 2. F.6.1 — sgs_ind_predio: indicadores agregados por predio
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sgs_ind_predio (
    id_predio INTEGER PRIMARY KEY REFERENCES sgs_pre_predio(id_predio) ON DELETE CASCADE,
    microcuenca         VARCHAR(255),
    num_coberturas      INTEGER,
    cobertura_principal VARCHAR(255),
    bioma_principal     VARCHAR(255),
    porc_paramo         DECIMAL(6,2),
    categoria_pomca     VARCHAR(255),
    nombre_rfp          VARCHAR(255)
);

-- -----------------------------------------------------------------------------
-- 3. F.6.2 — sgs_ind_ambiental_predio: composición ambiental
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sgs_ind_ambiental_predio (
    id_predio INTEGER PRIMARY KEY REFERENCES sgs_pre_predio(id_predio) ON DELETE CASCADE,
    area_bosque_ha                  DECIMAL(14,4),
    area_pastos_ha                  DECIMAL(14,4),
    area_cultivos_ha                DECIMAL(14,4),
    area_vegetacion_secundaria_ha   DECIMAL(14,4),
    area_mosaico_ha                 DECIMAL(14,4),
    area_urbana_ha                  DECIMAL(14,4),
    area_otros_ha                   DECIMAL(14,4),
    area_bioma_ha                   DECIMAL(14,4),
    area_paramo_ha                  DECIMAL(14,4),
    tipo_cobertura_predominante     VARCHAR(255),
    tipo_bioma_predominante         VARCHAR(255)
);

-- -----------------------------------------------------------------------------
-- 4. F.6.3 — sgs_ind_hidrico_predio: relación con recurso hídrico
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sgs_ind_hidrico_predio (
    id_predio INTEGER PRIMARY KEY REFERENCES sgs_pre_predio(id_predio) ON DELETE CASCADE,
    long_drenaje_m     DECIMAL(14,2),
    distancia_drenaje_m DECIMAL(14,2),
    area_ronda_ha      DECIMAL(14,4),
    porc_ronda         DECIMAL(6,2)
);

-- -----------------------------------------------------------------------------
-- 5. F.6.4 — sgs_ind_intervencion_predio: acciones implementadas
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sgs_ind_intervencion_predio (
    id_predio INTEGER PRIMARY KEY REFERENCES sgs_pre_predio(id_predio) ON DELETE CASCADE,
    num_propuestas_punto     INTEGER DEFAULT 0,
    num_propuestas_linea     INTEGER DEFAULT 0,
    num_propuestas_poligono  INTEGER DEFAULT 0,
    total_propuestas         INTEGER DEFAULT 0,
    area_intervenida_ha      DECIMAL(14,4),
    longitud_intervenida_m   DECIMAL(14,2),
    estado_predominante      VARCHAR(50),
    componente_predominante  VARCHAR(50),
    accion_predominante      VARCHAR(50)
);

-- -----------------------------------------------------------------------------
-- 6. F.6.5 — sgs_ind_municipio: consolidado por municipio
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sgs_ind_municipio (
    id_municipio          INTEGER PRIMARY KEY REFERENCES bcs_lpa_municipio(id_municipio) ON DELETE CASCADE,
    num_predios           INTEGER,
    area_total_ha         DECIMAL(14,2),
    area_bosque_ha        DECIMAL(14,2),
    area_pastos_ha        DECIMAL(14,2),
    area_cultivos_ha      DECIMAL(14,2),
    area_paramo_ha        DECIMAL(14,2),
    num_predios_paramo    INTEGER,
    num_intervenciones    INTEGER,
    area_restaurada_ha    DECIMAL(14,2),
    longitud_intervencion_m DECIMAL(14,2),
    area_ronda_ha         DECIMAL(14,2)
);

-- -----------------------------------------------------------------------------
-- 7. bcs_dh_quebrada: tabla para análisis hídrico (F.6.3)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bcs_dh_quebrada (
    id_quebrada          SERIAL PRIMARY KEY,
    nombre_quebrada      VARCHAR(255) NOT NULL,
    area_ha              DECIMAL(14,4),
    longitud_km          DECIMAL(14,2),
    geom                 GEOMETRY(MULTILINESTRING, 4686)
);

-- -----------------------------------------------------------------------------
-- 8. Índices para performance
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sgs_ind_predio_microcuenca ON sgs_ind_predio(microcuenca);
CREATE INDEX IF NOT EXISTS idx_sgs_ind_ambiental_cobertura ON sgs_ind_ambiental_predio(tipo_cobertura_predominante);
CREATE INDEX IF NOT EXISTS idx_sgs_ind_ambiental_bioma ON sgs_ind_ambiental_predio(tipo_bioma_predominante);
CREATE INDEX IF NOT EXISTS idx_sgs_ind_hidrico_dist ON sgs_ind_hidrico_predio(distancia_drenaje_m);
CREATE INDEX IF NOT EXISTS idx_sgs_ind_intervencion_estado ON sgs_ind_intervencion_predio(estado_predominante);
CREATE INDEX IF NOT EXISTS idx_sgs_rel_predio_cobertura_pct ON sgs_rel_predio_cobertura(porcentaje_predio);
CREATE INDEX IF NOT EXISTS idx_sgs_rel_predio_bioma_pct ON sgs_rel_predio_bioma(porcentaje_predio);
CREATE INDEX IF NOT EXISTS idx_sgs_rel_predio_paramos_pct ON sgs_rel_predio_paramos(porcentaje_predio);
CREATE INDEX IF NOT EXISTS idx_sgs_rel_predio_pomca_pct ON sgs_rel_predio_zonificacion_pomca(porcentaje_predio);
CREATE INDEX IF NOT EXISTS idx_sgs_rel_predio_rfp_pct ON sgs_rel_predio_zonificacion_rfp(porcentaje_predio);
CREATE INDEX IF NOT EXISTS idx_bcs_dh_quebrada_geom ON bcs_dh_quebrada USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_sgs_rel_predio_cobertura_geom ON sgs_rel_predio_cobertura USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_sgs_rel_predio_bioma_geom ON sgs_rel_predio_bioma USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_sgs_rel_predio_paramos_geom ON sgs_rel_predio_paramos USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_sgs_rel_predio_pomca_geom ON sgs_rel_predio_zonificacion_pomca USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_sgs_rel_predio_rfp_geom ON sgs_rel_predio_zonificacion_rfp USING GIST(geom);
