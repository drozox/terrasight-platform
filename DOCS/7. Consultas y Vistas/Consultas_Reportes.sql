-- ============================================================
-- CONSULTAS_REPORTES.SQL
-- CONSULTAS PARA REPORTES OPERATIVOS Y DE GESTIÓN
-- CONVENIO CAR WWF FN
-- ============================================================
--
-- AUTOR:       Nikoll Tatiana Ordoñez Diaz
-- FECHA:       2025-06-28
-- DESCRIPCIÓN: Consultas para generar reportes de gestión,
--              avance y seguimiento del convenio.
-- ============================================================


-- ============================================================
-- REPORTE 1: LISTADO COMPLETO DE PREDIOS
-- ============================================================
-- Descripción: Lista todos los predios con su propietario,
-- vereda, municipio y área.

SELECT 
    p.id_predio,
    p.nombre_predio,
    p.area_ha,
    pr.nombre_razon_social AS propietario,
    pr.telefono AS telefono_propietario,
    v.nombre_vereda,
    m.nombre_municipio,
    m.departamento,
    p.cedula_catastral,
    p.observaciones
FROM sgs_pre_predio p
JOIN sgs_pre_propietario pr ON p.id_propietario = pr.id_propietario
JOIN bcs_lpa_vereda v ON p.id_vereda = v.id_vereda
JOIN bcs_lpa_municipio m ON v.id_municipio = m.id_municipio
ORDER BY m.nombre_municipio, v.nombre_vereda, p.nombre_predio;

-- ============================================================
-- REPORTE 2: PREDIOS CON SUS COBERTURAS Y BIOMAS
-- ============================================================
-- Descripción: Lista los predios con sus coberturas CLC y biomas asociados.

SELECT 
    p.id_predio,
    p.nombre_predio,
    p.area_ha,
    STRING_AGG(DISTINCT c.nombre_cobertura, ', ' ORDER BY c.nombre_cobertura) AS coberturas,
    STRING_AGG(DISTINCT b.bioma_iavh, ', ' ORDER BY b.bioma_iavh) AS biomas,
    COUNT(DISTINCT c.id_cobertura) AS total_coberturas,
    COUNT(DISTINCT b.id_bioma) AS total_biomas
FROM sgs_pre_predio p
LEFT JOIN sgs_rel_predio_cobertura pc ON p.id_predio = pc.id_predio
LEFT JOIN sgs_amb_cobertura_clc c ON pc.id_cobertura = c.id_cobertura
LEFT JOIN sgs_rel_predio_bioma pb ON p.id_predio = pb.id_predio
LEFT JOIN sgs_amb_bioma b ON pb.id_bioma = b.id_bioma
GROUP BY p.id_predio, p.nombre_predio, p.area_ha
ORDER BY p.nombre_predio;

-- ============================================================
-- REPORTE 3: PROPUESTAS POR COMPONENTE Y ACCIÓN
-- ============================================================
-- Descripción: Reporte de avance de propuestas agrupadas por componente y acción.

SELECT 
    comp.nombre AS componente,
    acc.nombre AS accion,
    COUNT(prop.id_propuesta) AS total_propuestas,
    COUNT(CASE WHEN prop.tipo = 'linea' THEN 1 END) AS propuestas_linea,
    COUNT(CASE WHEN prop.tipo = 'poligono' THEN 1 END) AS propuestas_poligono,
    COUNT(CASE WHEN prop.tipo = 'punto' THEN 1 END) AS propuestas_punto,
    STRING_AGG(DISTINCT prop.tipo, ', ') AS tipos_presentes
FROM sgs_pro_propuesta prop
JOIN sgs_com_accion acc ON prop.id_accion = acc.id_accion
JOIN sgs_com_componente comp ON acc.id_componente = comp.id_componente
GROUP BY comp.nombre, acc.nombre
ORDER BY comp.nombre, acc.nombre;

-- ============================================================
-- REPORTE 4: PROPUESTAS POR PREDIO
-- ============================================================
-- Descripción: Lista detallada de propuestas asociadas a cada predio.

SELECT 
    p.id_predio,
    p.nombre_predio,
    prop.id_propuesta,
    prop.tipo,
    prop.actividad,
    comp.nombre AS componente,
    acc.nombre AS accion,
    q.nombre_quebrada,
    CASE 
        WHEN prop.tipo = 'linea' THEN (SELECT longitud_m FROM sgs_pro_propuesta_linea WHERE id_propuesta = prop.id_propuesta)::TEXT
        WHEN prop.tipo = 'poligono' THEN (SELECT area_ha FROM sgs_pro_propuesta_poligono WHERE id_propuesta = prop.id_propuesta)::TEXT || ' Ha'
        WHEN prop.tipo = 'punto' THEN (SELECT tipo_punto FROM sgs_pro_propuesta_punto WHERE id_propuesta = prop.id_propuesta)
        ELSE 'N/A'
    END AS detalle_especifico
FROM sgs_pre_predio p
JOIN sgs_pro_propuesta prop ON p.id_predio = prop.id_predio
JOIN sgs_com_accion acc ON prop.id_accion = acc.id_accion
JOIN sgs_com_componente comp ON acc.id_componente = comp.id_componente
LEFT JOIN bcs_dh_quebrada q ON prop.id_quebrada = q.id_quebrada
ORDER BY p.nombre_predio, prop.id_propuesta;

-- ============================================================
-- REPORTE 5: PROPUESTAS PUNTO CON SUS USUARIOS BENEFICIARIOS
-- ============================================================
-- Descripción: Lista las propuestas punto con los usuarios beneficiarios asociados.

SELECT 
    pp.id_prop_punto,
    pp.actividad,
    pp.tipo_punto,
    pp.este,
    pp.norte,
    q.nombre_quebrada,
    STRING_AGG(u.nombre, ', ') AS usuarios_beneficiarios,
    COUNT(u.id_usuario) AS total_usuarios
FROM sgs_pro_propuesta_punto pp
JOIN sgs_pro_propuesta prop ON pp.id_propuesta = prop.id_propuesta
LEFT JOIN bcs_dh_quebrada q ON pp.id_quebrada = q.id_quebrada
LEFT JOIN sgs_rel_propuesta_punto_usuario rpu ON pp.id_prop_punto = rpu.id_prop_punto
LEFT JOIN sgs_pre_usuario u ON rpu.id_usuario = u.id_usuario
GROUP BY pp.id_prop_punto, pp.actividad, pp.tipo_punto, pp.este, pp.norte, q.nombre_quebrada
ORDER BY pp.tipo_punto, pp.actividad;

-- ============================================================
-- REPORTE 6: ZONIFICACIONES POR PREDIO
-- ============================================================
-- Descripción: Lista los predios con sus zonificaciones ambientales.

SELECT 
    p.id_predio,
    p.nombre_predio,
    STRING_AGG(DISTINCT zp.categoria_zonificacion, ', ' ORDER BY zp.categoria_zonificacion) AS zonificacion_pomca,
    STRING_AGG(DISTINCT zr.categoria_zonificacion, ', ' ORDER BY zr.categoria_zonificacion) AS zonificacion_rfp,
    STRING_AGG(DISTINCT pa.nombre_paramo, ', ' ORDER BY pa.nombre_paramo) AS paramos
FROM sgs_pre_predio p
LEFT JOIN sgs_rel_predio_zonificacion_pomca rpzp ON p.id_predio = rpzp.id_predio
LEFT JOIN sgs_amb_zonificacion_pomca zp ON rpzp.id_zonificacion_pomca = zp.id_zonificacion_pomca
LEFT JOIN sgs_rel_predio_zonificacion_rfp rpzr ON p.id_predio = rpzr.id_predio
LEFT JOIN sgs_amb_zonificacion_rfp zr ON rpzr.id_zonificacion_rfp = zr.id_zonificacion_rfp
LEFT JOIN sgs_rel_predio_paramos rpp ON p.id_predio = rpp.id_predio
LEFT JOIN sgs_amb_paramos pa ON rpp.id_paramos = pa.id_paramos
GROUP BY p.id_predio, p.nombre_predio
ORDER BY p.nombre_predio;

-- ============================================================
-- REPORTE 7: INFRAESTRUCTURA POR MUNICIPIO
-- ============================================================
-- Descripción: Lista la infraestructura (vías, drenajes) por municipio.

SELECT 
    m.nombre_municipio,
    m.departamento,
    COUNT(DISTINCT v.id_via) AS total_vias,
    COUNT(DISTINCT ds.id_drenaje_simple) AS total_drenajes_simples,
    COUNT(DISTINCT dd.id_drenaje_doble) AS total_drenajes_dobles,
    STRING_AGG(DISTINCT v.tipo_via, ', ') AS tipos_via,
    STRING_AGG(DISTINCT ds.estado_drenaje, ', ') AS estados_drenaje_simple,
    STRING_AGG(DISTINCT dd.tipo, ', ') AS tipos_drenaje_doble
FROM bcs_lpa_municipio m
LEFT JOIN sgs_inf_via v ON m.id_municipio = v.id_municipio
LEFT JOIN sgs_inf_drenaje_simple ds ON m.id_municipio = ds.id_municipio
LEFT JOIN sgs_inf_drenaje_doble dd ON m.id_municipio = dd.id_municipio
GROUP BY m.id_municipio, m.nombre_municipio, m.departamento
ORDER BY m.nombre_municipio;

-- ============================================================
-- REPORTE 8: RESÚMEN DE PREDIOS POR COMPONENTE
-- ============================================================
-- Descripción: Resumen de predios y propuestas por componente.

SELECT 
    comp.nombre AS componente,
    COUNT(DISTINCT prop.id_predio) AS predios_con_propuestas,
    COUNT(prop.id_propuesta) AS total_propuestas,
    COUNT(CASE WHEN prop.tipo = 'linea' THEN 1 END) AS linea,
    COUNT(CASE WHEN prop.tipo = 'poligono' THEN 1 END) AS poligono,
    COUNT(CASE WHEN prop.tipo = 'punto' THEN 1 END) AS punto
FROM sgs_com_componente comp
LEFT JOIN sgs_com_accion acc ON comp.id_componente = acc.id_componente
LEFT JOIN sgs_pro_propuesta prop ON acc.id_accion = prop.id_accion
GROUP BY comp.id_componente, comp.nombre
ORDER BY comp.nombre;

-- ============================================================
-- REPORTE 9: QUEBRADAS CON MÁS PROPUESTAS
-- ============================================================
-- Descripción: Identifica las quebradas con mayor número de propuestas asociadas.

SELECT 
    q.id_quebrada,
    q.nombre_quebrada,
    q.area,
    m.nombre_municipio,
    COUNT(prop.id_propuesta) AS total_propuestas,
    COUNT(CASE WHEN prop.tipo = 'linea' THEN 1 END) AS propuestas_linea,
    COUNT(CASE WHEN prop.tipo = 'poligono' THEN 1 END) AS propuestas_poligono,
    COUNT(CASE WHEN prop.tipo = 'punto' THEN 1 END) AS propuestas_punto
FROM bcs_dh_quebrada q
JOIN bcs_lpa_municipio m ON q.id_municipio = m.id_municipio
LEFT JOIN sgs_pro_propuesta prop ON q.id_quebrada = prop.id_quebrada
GROUP BY q.id_quebrada, q.nombre_quebrada, q.area, m.nombre_municipio
HAVING COUNT(prop.id_propuesta) > 0
ORDER BY total_propuestas DESC;

-- ============================================================
-- REPORTE 10: ÁREA TOTAL DE CONSERVACIÓN POR BIOMA
-- ============================================================
-- Descripción: Calcula el área total de predios por tipo de bioma.

SELECT 
    b.bioma_iavh,
    COUNT(DISTINCT p.id_predio) AS total_predios,
    SUM(p.area_ha) AS area_total_ha,
    AVG(p.area_ha) AS area_promedio_ha,
    STRING_AGG(DISTINCT p.nombre_predio, ', ' ORDER BY p.nombre_predio) AS predios
FROM sgs_amb_bioma b
JOIN sgs_rel_predio_bioma pb ON b.id_bioma = pb.id_bioma
JOIN sgs_pre_predio p ON pb.id_predio = p.id_predio
GROUP BY b.id_bioma, b.bioma_iavh
ORDER BY area_total_ha DESC;