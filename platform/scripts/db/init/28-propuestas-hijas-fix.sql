-- =============================================================================
-- Migration 28 — Fix schema de las 3 hijas de propuesta
--
-- Problemas encontrados al re-importar (Phase 7b+ smoke):
--   1. sgs_pro_propuesta_punto.geom es Point pero el GDB tiene MultiPoint
--      → cambiar a MULTIPOINT
--   2. Las 3 hijas no tienen id_predio (lo tienen en la super vía JOIN)
--      → agregar id_predio INTEGER NULL para que import pueda poblarlo
--      → el import_propuesta.mjs sintetiza la super con id_predio
-- =============================================================================

-- 1. Cambiar geom de propuesta_punto a MultiPoint
ALTER TABLE sgs_pro_propuesta_punto
  DROP COLUMN IF EXISTS geom;
ALTER TABLE sgs_pro_propuesta_punto
  ADD COLUMN geom GEOMETRY(MULTIPOINT, 4686);

-- 2. Agregar id_predio nullable a las 3 hijas
ALTER TABLE sgs_pro_propuesta_punto
  ADD COLUMN IF NOT EXISTS id_predio INTEGER REFERENCES sgs_pre_predio(id_predio) ON DELETE SET NULL;

ALTER TABLE sgs_pro_propuesta_linea
  ADD COLUMN IF NOT EXISTS id_predio INTEGER REFERENCES sgs_pre_predio(id_predio) ON DELETE SET NULL;

ALTER TABLE sgs_pro_propuesta_poligono
  ADD COLUMN IF NOT EXISTS id_predio INTEGER REFERENCES sgs_pre_predio(id_predio) ON DELETE SET NULL;

-- 3. Índices para que las queries con JOIN id_predio sean rápidas
CREATE INDEX IF NOT EXISTS idx_sgs_pro_propuesta_punto_id_predio
  ON sgs_pro_propuesta_punto(id_predio);
CREATE INDEX IF NOT EXISTS idx_sgs_pro_propuesta_linea_id_predio
  ON sgs_pro_propuesta_linea(id_predio);
CREATE INDEX IF NOT EXISTS idx_sgs_pro_propuesta_poligono_id_predio
  ON sgs_pro_propuesta_poligono(id_predio);
