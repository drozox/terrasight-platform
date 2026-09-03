-- =============================================================================
-- Permitir NULL en FKs para datos reales del GDB (S5.M+)
--
-- El GDB del convenio CAR-WWF-Fundación Natura tiene datos incompletos:
--   - 49 de 137 predios tienen `nom_prop` vacío → no se puede resolver
--     id_propietario desde el nombre del propietario
--   - 4 de 137 predios tienen `cod_vereda` = ' ' (espacio) → no se puede
--     resolver id_vereda
--   - 1 de 577 veredas tiene `codigo_mun=25269` sin municipio en la GDB
--     (CORITO — el municipio 25269 no está en la capa municipio del GDB)
--
-- Estos NULLs son **legítimos del dato fuente** (no son errores de import).
-- En lugar de droppear las filas, permitimos NULL y dejamos que las queries
-- los manejen con LEFT JOIN.
--
-- Tablas afectadas:
--   - sgs_pre_predio.id_vereda      (4 NULLs de 137)
--   - sgs_pre_predio.id_propietario (49 NULLs de 137)
--   - bcs_lpa_vereda.id_municipio   (1 NULL de 577)
--
-- Rollback manual:
--   ALTER TABLE sgs_pre_predio    ALTER COLUMN id_vereda      SET NOT NULL;
--   ALTER TABLE sgs_pre_predio    ALTER COLUMN id_propietario SET NOT NULL;
--   ALTER TABLE bcs_lpa_vereda    ALTER COLUMN id_municipio   SET NOT NULL;
-- =============================================================================

ALTER TABLE sgs_pre_predio ALTER COLUMN id_vereda      DROP NOT NULL;
ALTER TABLE sgs_pre_predio ALTER COLUMN id_propietario DROP NOT NULL;
ALTER TABLE bcs_lpa_vereda ALTER COLUMN id_municipio   DROP NOT NULL;
