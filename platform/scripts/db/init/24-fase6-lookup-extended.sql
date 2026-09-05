-- =============================================================================
-- Fase 6 — Extender lookup tables con schema completo del GDB
--
-- Las junction tables (sgs_rel_predio_*) referencian las lookup tables por
-- nombre (no por id), así que necesitamos las columnas descriptivas del GDB
-- en las lookup tables.
--
-- Cambios:
--   1. sgs_amb_cobertura_clc: agregar objectid, municipio_predio, geom
--   2. sgs_amb_zonificacion_rfp: agregar nombre, sub_zonificacion, geom
--   3. sgs_amb_zonificacion_pomca: agregar codigo, nomenclatura, descripcion, geom
--
-- Decisión: NO pre-aggregate — guardamos TODOS los features del GDB (162/486/245)
-- porque la junction hace lookup por NOMBRE/CATEGORIA, no por FID.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. sgs_amb_cobertura_clc
-- -----------------------------------------------------------------------------
-- Estado actual: VACÍA (0 rows). Reimportable sin conflicto.
ALTER TABLE sgs_amb_cobertura_clc
  ADD COLUMN IF NOT EXISTS objectid_gdb    INTEGER,
  ADD COLUMN IF NOT EXISTS municipio_predio VARCHAR(100),
  ADD COLUMN IF NOT EXISTS geom            GEOMETRY(MULTIPOLYGON, 4686);

-- -----------------------------------------------------------------------------
-- 2. sgs_amb_zonificacion_rfp
-- -----------------------------------------------------------------------------
-- Estado actual: 4 rows pre-aggregated (Phase 2). Reimportaremos los 486 features.
ALTER TABLE sgs_amb_zonificacion_rfp
  ADD COLUMN IF NOT EXISTS objectid_gdb    INTEGER,
  ADD COLUMN IF NOT EXISTS nombre          VARCHAR(255),
  ADD COLUMN IF NOT EXISTS sub_zonificacion VARCHAR(255),
  ADD COLUMN IF NOT EXISTS geom            GEOMETRY(MULTIPOLYGON, 4686);

-- -----------------------------------------------------------------------------
-- 3. sgs_amb_zonificacion_pomca
-- -----------------------------------------------------------------------------
-- Estado actual: 9 rows pre-aggregated (Phase 2). Reimportaremos los 245 features.
ALTER TABLE sgs_amb_zonificacion_pomca
  ADD COLUMN IF NOT EXISTS objectid_gdb    INTEGER,
  ADD COLUMN IF NOT EXISTS codigo          VARCHAR(20),
  ADD COLUMN IF NOT EXISTS nomenclatura    VARCHAR(20),
  ADD COLUMN IF NOT EXISTS descripcion     VARCHAR(255),
  ADD COLUMN IF NOT EXISTS geom            GEOMETRY(MULTIPOLYGON, 4686);

-- -----------------------------------------------------------------------------
-- 4. bcs_dh_quebrada ya existe desde migration 23, sin cambios.
-- -----------------------------------------------------------------------------
