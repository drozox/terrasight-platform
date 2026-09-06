-- =============================================================================
-- Migration 30 — id_prop_*: cambiar a SERIAL con sequences
--
-- El GDB tiene id_prop_pu=0 para todos los puntos (no es ID real), e
-- id_predio=null. La PG schema tenía id_prop_punto INTEGER NOT NULL que
-- requiere un valor único. Cambiamos a SERIAL para que el import asigne
-- automáticamente cuando el GDB no tiene IDs reales.
-- =============================================================================

-- Crear sequences
CREATE SEQUENCE IF NOT EXISTS sgs_pro_propuesta_punto_id_seq;
CREATE SEQUENCE IF NOT EXISTS sgs_pro_propuesta_linea_id_seq;
CREATE SEQUENCE IF NOT EXISTS sgs_pro_propuesta_poligono_id_seq;

-- Cambiar columnas a usar las sequences (idempotente)
DO $$
BEGIN
  -- id_prop_punto
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'sgs_pro_propuesta_punto' AND column_name = 'id_prop_punto'
             AND column_default IS NULL) THEN
    ALTER TABLE sgs_pro_propuesta_punto
      ALTER COLUMN id_prop_punto SET DEFAULT nextval('sgs_pro_propuesta_punto_id_seq'),
      ALTER COLUMN id_prop_punto SET NOT NULL;
    ALTER SEQUENCE sgs_pro_propuesta_punto_id_seq OWNED BY sgs_pro_propuesta_punto.id_prop_punto;
  END IF;

  -- id_prop_linea
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'sgs_pro_propuesta_linea' AND column_name = 'id_prop_linea'
             AND column_default IS NULL) THEN
    ALTER TABLE sgs_pro_propuesta_linea
      ALTER COLUMN id_prop_linea SET DEFAULT nextval('sgs_pro_propuesta_linea_id_seq'),
      ALTER COLUMN id_prop_linea SET NOT NULL;
    ALTER SEQUENCE sgs_pro_propuesta_linea_id_seq OWNED BY sgs_pro_propuesta_linea.id_prop_linea;
  END IF;

  -- id_prop_poligono
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'sgs_pro_propuesta_poligono' AND column_name = 'id_prop_poligono'
             AND column_default IS NULL) THEN
    ALTER TABLE sgs_pro_propuesta_poligono
      ALTER COLUMN id_prop_poligono SET DEFAULT nextval('sgs_pro_propuesta_poligono_id_seq'),
      ALTER COLUMN id_prop_poligono SET NOT NULL;
    ALTER SEQUENCE sgs_pro_propuesta_poligono_id_seq OWNED BY sgs_pro_propuesta_poligono.id_prop_poligono;
  END IF;
END $$;
