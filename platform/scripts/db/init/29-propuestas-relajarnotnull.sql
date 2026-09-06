-- =============================================================================
-- Migration 29 — Relajar NOT NULL en las hijas de propuesta
--
-- Las hijas (punto/linea/poligono) tienen id_propuesta NOT NULL que se llena
-- DESPUÉS de sintetizar la super (sgs_pro_propuesta). Para poder importar las
-- hijas antes de la super, relajamos:
--   - id_propuesta → NULL (lo llena import_propuesta.mjs después)
--   - tipo_punto, tipo_obra, estructura_anclaje, nivel_complejidad,
--     id_estacion_original, cod_tipo, codigo_caj (GDB tiene vacíos)
-- =============================================================================

ALTER TABLE sgs_pro_propuesta_punto
  ALTER COLUMN id_propuesta DROP NOT NULL,
  ALTER COLUMN tipo_punto DROP NOT NULL,
  ALTER COLUMN tipo_obra DROP NOT NULL,
  ALTER COLUMN estructura_anclaje DROP NOT NULL,
  ALTER COLUMN nivel_complejidad DROP NOT NULL,
  ALTER COLUMN id_estacion_original DROP NOT NULL,
  ALTER COLUMN cod_tipo DROP NOT NULL,
  ALTER COLUMN codigo_caj DROP NOT NULL;

-- Defaults para que un INSERT sin estos campos no falle
ALTER TABLE sgs_pro_propuesta_punto
  ALTER COLUMN tipo_punto SET DEFAULT '',
  ALTER COLUMN tipo_obra SET DEFAULT 0,
  ALTER COLUMN estructura_anclaje SET DEFAULT FALSE,
  ALTER COLUMN nivel_complejidad SET DEFAULT '',
  ALTER COLUMN id_estacion_original SET DEFAULT '',
  ALTER COLUMN cod_tipo SET DEFAULT '',
  ALTER COLUMN codigo_caj SET DEFAULT '';

ALTER TABLE sgs_pro_propuesta_linea
  ALTER COLUMN id_propuesta DROP NOT NULL;

ALTER TABLE sgs_pro_propuesta_poligono
  ALTER COLUMN id_propuesta DROP NOT NULL;
