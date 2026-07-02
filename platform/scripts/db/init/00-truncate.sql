-- =============================================================================
-- Reset completo y carga de Datos_ejemplo.txt (Nikoll Tatiana Ordoñez Diaz)
-- =============================================================================
-- Ejecutar con: docker exec -i terrasight-db psql -U terrasight -d convenio_car_wwf -v ON_ERROR_STOP=1 -f <file>

SET client_min_messages = WARNING;

-- Truncar todo (preserva schema). CASCADE para FKs.
TRUNCATE TABLE
    sgs_rel_propuesta_punto_usuario,
    sgs_rel_predio_paramos,
    sgs_rel_predio_zonificacion_rfp,
    sgs_rel_predio_zonificacion_pomca,
    sgs_rel_predio_bioma,
    sgs_rel_predio_cobertura,
    sgs_pro_propuesta_punto,
    sgs_pro_propuesta_poligono,
    sgs_pro_propuesta_linea,
    sgs_pro_propuesta,
    sgs_pre_predio,
    sgs_pre_usuario,
    sgs_pre_propietario,
    sgs_inf_drenaje_doble,
    sgs_inf_drenaje_simple,
    sgs_inf_via,
    sgs_amb_paramos,
    sgs_amb_zonificacion_rfp,
    sgs_amb_zonificacion_pomca,
    sgs_amb_bioma,
    sgs_amb_cobertura_clc,
    sgs_com_accion,
    sgs_com_componente,
    bcs_dh_quebrada,
    bcs_dh_microcuenca,
    bcs_lpa_vereda,
    bcs_lpa_municipio
RESTART IDENTITY CASCADE;

-- Resetear secuencias por si acaso (TRUNCATE RESTART IDENTITY ya lo hace, pero por seguridad)
SELECT setval('bcs_lpa_municipio_id_municipio_seq', 1, false);
SELECT setval('bcs_lpa_vereda_id_vereda_seq', 1, false);
SELECT setval('bcs_dh_microcuenca_id_microcuenca_seq', 1, false);
SELECT setval('bcs_dh_quebrada_id_quebrada_seq', 1, false);
SELECT setval('sgs_pre_propietario_id_propietario_seq', 1, false);
SELECT setval('sgs_pre_usuario_id_usuario_seq', 1, false);
SELECT setval('sgs_pre_predio_id_predio_seq', 1, false);
SELECT setval('sgs_amb_cobertura_clc_id_cobertura_seq', 1, false);
SELECT setval('sgs_amb_bioma_id_bioma_seq', 1, false);
SELECT setval('sgs_amb_zonificacion_pomca_id_zonificacion_pomca_seq', 1, false);
SELECT setval('sgs_amb_zonificacion_rfp_id_zonificacion_rfp_seq', 1, false);
SELECT setval('sgs_amb_paramos_id_paramos_seq', 1, false);
SELECT setval('sgs_inf_via_id_via_seq', 1, false);
SELECT setval('sgs_inf_drenaje_simple_id_drenaje_simple_seq', 1, false);
SELECT setval('sgs_inf_drenaje_doble_id_drenaje_doble_seq', 1, false);
SELECT setval('sgs_com_componente_id_componente_seq', 1, false);
SELECT setval('sgs_com_accion_id_accion_seq', 1, false);
SELECT setval('sgs_pro_propuesta_id_propuesta_seq', 1, false);
SELECT setval('sgs_pro_propuesta_linea_id_prop_linea_seq', 1, false);
SELECT setval('sgs_pro_propuesta_poligono_id_prop_poligono_seq', 1, false);
SELECT setval('sgs_pro_propuesta_punto_id_prop_punto_seq', 1, false);