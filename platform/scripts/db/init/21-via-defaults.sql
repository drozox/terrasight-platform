-- =============================================================================
-- Defaults para sgs_inf_via NOT NULL cols (Phase 2)
--
-- El GDB codifica tipo_via y estado_superficie con domain codes numéricos
-- (3301, 3306, 3350) que no matchean el CHECK del schema. Asignamos defaults
-- razonables para que el import pueda insertar las 5959 vias del GDB.
--
-- Si en el futuro se quiere re-codificar, ajustar los valores primero.
-- =============================================================================

-- Defaults para campos con NOT NULL sin default
ALTER TABLE sgs_inf_via
  ALTER COLUMN tipo_via SET DEFAULT 'terciaria',
  ALTER COLUMN estado_superficie SET DEFAULT 'tierra',
  ALTER COLUMN accesibilidad SET DEFAULT '';
