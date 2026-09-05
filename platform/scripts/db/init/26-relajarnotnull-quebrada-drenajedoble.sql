-- =============================================================================
-- Migration 26 — Relajar NOT NULL en bcs_dh_quebrada + sgs_inf_drenaje_doble
--
-- Las tablas tienen columnas NOT NULL que el GDB no tiene (id_municipio,
-- id_microcuenca, area, latitud, longitud, nombre_usuarios). Para poder
-- importar desde el GDB sin hacer spatial join complejo, las relajamos.
--
-- El uso normal (queries de la app) puede poblar estas columnas con
-- triggers o jobs batch después.
-- =============================================================================

ALTER TABLE bcs_dh_quebrada
  ALTER COLUMN id_municipio     DROP NOT NULL,
  ALTER COLUMN id_microcuenca   DROP NOT NULL,
  ALTER COLUMN nombre_usuarios  DROP NOT NULL,
  ALTER COLUMN area             DROP NOT NULL,
  ALTER COLUMN latitud          DROP NOT NULL,
  ALTER COLUMN longitud         DROP NOT NULL;

ALTER TABLE sgs_inf_drenaje_doble
  ALTER COLUMN id_municipio DROP NOT NULL;
