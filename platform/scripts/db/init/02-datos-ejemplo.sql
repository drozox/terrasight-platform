-- ============================================================
-- POBLAMIENTO DE DATOS - CONVENIO CAR WWF FN
-- DATOS DE PRUEBA (VERSIÓN AMPLIADA)
-- ============================================================

-- ============================================================
-- 1. LÍMITES POLÍTICO ADMINISTRATIVOS
-- ============================================================

-- MUNICIPIOS
INSERT INTO bcs_lpa_municipio (nombre_municipio, codigo_administrativo, departamento) VALUES
('Cali', '76001', 'Valle del Cauca'),
('Palmira', '76520', 'Valle del Cauca'),
('Yumbo', '76892', 'Valle del Cauca'),
('Jamundí', '76100', 'Valle del Cauca'),
('Candelaria', '76109', 'Valle del Cauca'),
('Dagua', '76122', 'Valle del Cauca'),
('La Cumbre', '76130', 'Valle del Cauca');

-- VEREDAS
INSERT INTO bcs_lpa_vereda (nombre_vereda, codigo_administrativo, poblacion_estimada, id_municipio) VALUES
-- Veredas de Cali
('La Sirena', '76001-01', 350, 1),
('El Porvenir', '76001-02', 280, 1),
('San Antonio', '76001-03', 420, 1),
('La Paz', '76001-04', 180, 1),
('El Paraíso', '76001-05', 230, 1),
('La Esperanza', '76001-06', 310, 1),
('Villa Nueva', '76001-07', 150, 1),
-- Veredas de Palmira
('La Cabaña', '76520-01', 150, 2),
('El Rosal', '76520-02', 200, 2),
('La Florida', '76520-03', 170, 2),
('El Bosque', '76520-04', 120, 2),
-- Veredas de Yumbo
('Las Vegas', '76892-01', 90, 3),
('La Playita', '76892-02', 110, 3);

-- ============================================================
-- 2. DIVISIÓN HIDROGRÁFICA
-- ============================================================

-- MICROCUENCAS
INSERT INTO bcs_dh_microcuenca (nombre_microcuenca, area, codigo, latitud, longitud, nombre_usuarios) VALUES
('Microcuenca La Sirena', 45.00, 'M001', 3.4512, -76.5321, 'Comunidad La Sirena'),
('Microcuenca El Porvenir', 30.50, 'M002', 3.4200, -76.5100, 'Comunidad El Porvenir'),
('Microcuenca La Cabaña', 25.00, 'M003', 3.4000, -76.4800, 'Comunidad La Cabaña'),
('Microcuenca San Antonio', 35.00, 'M004', 3.4700, -76.5500, 'Comunidad San Antonio'),
('Microcuenca El Rosal', 22.00, 'M005', 3.4100, -76.4900, 'Comunidad El Rosal');

-- QUEBRADAS
INSERT INTO bcs_dh_quebrada (nombre_quebrada, area, latitud, longitud, nombre_usuarios, id_municipio, id_microcuenca) VALUES
('Quebrada La Sirena', 12.50, 3.4512, -76.5321, 'Comunidad La Sirena', 1, 1),
('Quebrada El Porvenir', 8.30, 3.4200, -76.5100, 'Comunidad El Porvenir', 1, 2),
('Quebrada La Cabaña', 5.20, 3.4000, -76.4800, 'Comunidad La Cabaña', 2, 3),
('Quebrada San Antonio', 10.00, 3.4700, -76.5500, 'Comunidad San Antonio', 1, 4),
('Quebrada El Rosal', 6.00, 3.4100, -76.4900, 'Comunidad El Rosal', 2, 5),
('Quebrada Las Vegas', 4.50, 3.3800, -76.4700, 'Comunidad Las Vegas', 3, 2),
('Quebrada La Playita', 3.80, 3.3700, -76.4600, 'Comunidad La Playita', 3, 3),
('Quebrada La Esperanza', 7.20, 3.4400, -76.5200, 'Comunidad La Esperanza', 1, 1);


-- ============================================================
-- 3. PREDIO - PROPIETARIOS Y USUARIOS
-- ============================================================

-- PROPIETARIOS
INSERT INTO sgs_pre_propietario (nombre_razon_social, telefono) VALUES
('Juan Carlos Pérez Gómez', '3123456789'),
('María Elena Rodríguez', '3156789012'),
('Ganadera El Rosario S.A.S.', '3210987654'),
('Luis Fernando Ramírez', '3101234567'),
('Ana María Ortiz', '3152345678'),
('Carlos Alberto Sánchez', '3213456789'),
('Marta Elena Ríos', '3109876543'),
('José Gabriel López', '3187654321'),
('Comunidad La Sirena', '3224567890'),
('Fondo de Agua Cali', '3001234567');

-- USUARIOS (Beneficiarios)
INSERT INTO sgs_pre_usuario (nombre, telefono, vereda, municipio) VALUES
('Luis Fernando Ramírez', '3101234567', 'La Sirena', 'Cali'),
('Ana María Ortiz', '3152345678', 'El Porvenir', 'Cali'),
('Carlos Alberto Sánchez', '3213456789', 'La Cabaña', 'Palmira'),
('Marta Elena Ríos', '3109876543', 'San Antonio', 'Cali'),
('José Gabriel López', '3187654321', 'El Rosal', 'Palmira'),
('Andrés Felipe Torres', '3204567890', 'La Esperanza', 'Cali'),
('Claudia Patricia Gómez', '3112345678', 'La Florida', 'Palmira'),
('Jorge Enrique Díaz', '3198765432', 'La Sirena', 'Cali'),
('Carmen Lucía Giraldo', '3123456789', 'El Porvenir', 'Cali'),
('Roberto Carlos Narváez', '3214567890', 'La Cabaña', 'Palmira');

-- ============================================================
-- 4. PREDIO - PREDIOS
-- ============================================================

-- PREDIOS (con sus relaciones a propietarios y veredas)
INSERT INTO sgs_pre_predio (
    nombre_predio, area_ha, cedula_catastral, cedula_ant, 
    longitud_centroide, latitud_centroide, 
    nucleo_predial, observaciones, perimetro, 
    id_propietario, id_vereda
) VALUES
('Finca El Edén', 50.50, '123-456-789', 'ANT-001', 3.4512, -76.5321, 'NUC-001', 'Predio en conservación', 850.00, 1, 1),
('Finca El Porvenir', 35.25, '234-567-890', 'ANT-002', 3.4200, -76.5100, 'NUC-002', 'Predio con obras de captación', 620.50, 2, 2),
('Finca La Cabaña', 28.75, '345-678-901', 'ANT-003', 3.4000, -76.4800, 'NUC-003', 'Predio en zonificación RFP', 540.30, 3, 3),
('Finca San Antonio', 42.00, '456-789-012', 'ANT-004', 3.4700, -76.5500, 'NUC-004', 'Predio con múltiples coberturas', 720.00, 1, 4),
('Finca El Rosal', 22.50, '567-890-123', 'ANT-005', 3.4100, -76.4900, 'NUC-005', 'Predio en páramo', 480.00, 5, 5),
('Finca La Esperanza', 38.00, '678-901-234', 'ANT-006', 3.4400, -76.5200, 'NUC-006', 'Predio con cerca viva', 650.00, 7, 6),
('Finca La Florida', 31.20, '789-012-345', 'ANT-007', 3.3800, -76.4700, 'NUC-007', 'Predio silvopastoril', 560.00, 8, 7),
('Finca Las Vegas', 18.75, '890-123-456', 'ANT-008', 3.3700, -76.4600, 'NUC-008', 'Predio de conservación', 400.00, 6, 8),
('Finca El Bosque', 45.30, '901-234-567', 'ANT-009', 3.4000, -76.4800, 'NUC-009', 'Predio con agroforestería', 780.00, 4, 9),
('Finca La Playita', 15.60, '012-345-678', 'ANT-010', 3.3700, -76.4600, 'NUC-010', 'Predio con bebedero', 320.00, 9, 10);

-- ============================================================
-- 5. UNIDADES AMBIENTALES
-- ============================================================

-- COBERTURA CLC
INSERT INTO sgs_amb_cobertura_clc (codigo_clc_nivel3, nombre_cobertura, area_ha, area_m2, estado_naturalidad, año_interpretacion, label) VALUES
('2.1.1', 'Pasto arbolado', 15.50, 155000, 'transformado', 2023, 'Pasto arbolado'),
('2.2.1', 'Pastos limpios', 10.25, 102500, 'transformado', 2023, 'Pasto limpio'),
('1.1.1', 'Rastrojo', 5.75, 57500, 'natural', 2023, 'Rastrojo'),
('3.1.1', 'Bosque ripario', 8.00, 80000, 'natural', 2023, 'Bosque ripario'),
('2.3.1', 'Cultivos permanentes', 12.00, 120000, 'transformado', 2023, 'Cultivo'),
('1.2.1', 'Bosque natural', 20.00, 200000, 'natural', 2023, 'Bosque natural'),
('2.4.1', 'Cultivos transitorios', 8.50, 85000, 'transformado', 2023, 'Cultivo transitorio'),
('3.2.1', 'Vegetación secundaria', 6.75, 67500, 'seminatural', 2023, 'Vegetación secundaria'),
('1.3.1', 'Bosque de galería', 9.00, 90000, 'natural', 2023, 'Bosque de galería'),
('2.5.1', 'Cafetal', 7.25, 72500, 'transformado', 2023, 'Cafetal');

-- BIOMAS
INSERT INTO sgs_amb_bioma (bioma_iavh, area_ha, area_m2) VALUES
('Bosque Andino', 25.00, 250000),
('Valle del Cauca', 18.50, 185000),
('Bosque Seco Tropical', 12.30, 123000),
('Bosque Húmedo Tropical', 20.00, 200000),
('Páramo', 8.50, 85000),
('Bosque Subandino', 15.00, 150000);

-- ZONIFICACION POMCA
INSERT INTO sgs_amb_zonificacion_pomca (categoria_zonificacion, area_ha) VALUES
('Zona de Protección', 20.00),
('Zona de Recuperación', 15.50),
('Zona de Producción Sostenible', 30.00),
('Zona de Conservación', 10.00),
('Zona de Uso Restringido', 5.00),
('Zona de Manejo Especial', 12.50);

-- ZONIFICACION RFP
INSERT INTO sgs_amb_zonificacion_rfp (
    categoria_zonificacion, area_ha, objectid, sector_cod, 
    complejo_nombre, distrito_nombre, complejo_codigo, distrito_codigo
) VALUES
('Zona A', 10.00, 'OBJ001', 'SEC01', 'Complejo A', 'Distrito 1', 'C001', 'D001'),
('Zona B', 8.50, 'OBJ002', 'SEC02', 'Complejo B', 'Distrito 2', 'C002', 'D002'),
('Zona C', 12.00, 'OBJ003', 'SEC03', 'Complejo C', 'Distrito 3', 'C003', 'D003'),
('Zona D', 6.50, 'OBJ004', 'SEC04', 'Complejo D', 'Distrito 4', 'C004', 'D004'),
('Zona E', 9.00, 'OBJ005', 'SEC05', 'Complejo E', 'Distrito 5', 'C005', 'D005');

-- PARAMOS
INSERT INTO sgs_amb_paramos (nombre_paramo, complejo_codigo, complejo_nombre, area_ha) VALUES
('Páramo El Buey', 'PB-001', 'Complejo El Buey', 12.00),
('Páramo Las Hermosas', 'PB-002', 'Complejo Las Hermosas', 8.50),
('Páramo Los Nevados', 'PB-003', 'Complejo Los Nevados', 15.00),
('Páramo El Ángel', 'PB-004', 'Complejo El Ángel', 10.00),
('Páramo La Rusia', 'PB-005', 'Complejo La Rusia', 6.50);

-- ============================================================
-- 6. INFRAESTRUCTURA
-- ============================================================

-- VÍAS
INSERT INTO sgs_inf_via (tipo_via, estado_superficie, numero_carriles, accesibilidad, id_municipio) VALUES
('primaria', 'pavimento', 4, 'Vehicular y peatonal', 1),
('secundaria', 'afirmado', 2, 'Vehicular', 1),
('terciaria', 'tierra', 1, 'Rural', 2),
('primaria', 'pavimento', 2, 'Vehicular', 3),
('secundaria', 'afirmado', 1, 'Rural', 4),
('terciaria', 'tierra', 1, 'Rural', 5),
('primaria', 'pavimento', 4, 'Vehicular y peatonal', 2),
('secundaria', 'afirmado', 2, 'Vehicular', 6);

-- DRENAJE SIMPLE
INSERT INTO sgs_inf_drenaje_simple (estado_drenaje, nombre_geografico, id_municipio) VALUES
('Activo', 'Quebrada La Sirena', 1),
('Inactivo', 'Drenaje El Porvenir', 1),
('Activo', 'Canal La Cabaña', 2),
('Activo', 'Drenaje San Antonio', 1),
('Inactivo', 'Canal El Rosal', 2),
('Activo', 'Drenaje La Esperanza', 1),
('Inactivo', 'Canal La Florida', 2),
('Activo', 'Drenaje Las Vegas', 3);

-- DRENAJE DOBLE
INSERT INTO sgs_inf_drenaje_doble (tipo, nombre_geografico, id_municipio) VALUES
('Canal doble', 'Drenaje Cali 1', 1),
('Tubería', 'Drenaje Palmira 1', 2),
('Canal doble', 'Drenaje Yumbo 1', 3),
('Tubería', 'Drenaje Cali 2', 1),
('Canal doble', 'Drenaje Jamundí 1', 4),
('Tubería', 'Drenaje Candelaria 1', 5);

-- ============================================================
-- 7. COMPONENTES Y ACCIONES
-- ============================================================

-- COMPONENTES (ya existen, pero confirmamos)
INSERT INTO sgs_com_componente (nombre) VALUES 
('C1'),
('C2'),
('C3');

-- ACCIONES
INSERT INTO sgs_com_accion (nombre, id_componente) VALUES 
('A1', 1),  -- C1A1
('A2', 1),  -- C1A2
('A1', 2),  -- C2A1
('A2', 2);  -- C2A2

-- ============================================================
-- 8. PROPUESTAS
-- ============================================================

-- PROPUESTAS (Super-tipo)
INSERT INTO sgs_pro_propuesta (tipo, actividad, id_predio, id_quebrada, id_accion) VALUES
('linea', 'Cerca viva - Tramo 1', 1, 1, 1),    -- C1A1
('linea', 'Cerca viva - Tramo 2', 6, 6, 1),    -- C1A1
('poligono', 'Silvopastoril - Lote A', 1, 2, 2),  -- C1A2
('poligono', 'Agroforestal - Lote B', 7, 3, 2),   -- C1A2
('punto', 'Obra de captación - Quebrada Sirena', 2, 1, 3),  -- C2A1
('punto', 'Estación limnimétrica - Quebrada Sirena', 2, 1, 4), -- C2A2
('punto', 'Bebedero - Finca El Edén', 1, 1, 1),  -- C3
('punto', 'Tanque - Finca El Porvenir', 2, 1, 1), -- C3
('linea', 'Cerco de aislamiento', 3, 3, 1),     -- C1A1
('poligono', 'Silvopastoril - Finca La Cabaña', 3, 3, 2); -- C1A2

-- PROPUESTA_LINEA (Sub-tipo)
INSERT INTO sgs_pro_propuesta_linea (actividad, longitud_m, longitud_km, id_propuesta) VALUES
('Cerca viva - Tramo 1', 150.50, 0.150, 1),
('Cerca viva - Tramo 2', 85.25, 0.085, 2),
('Cerco de aislamiento', 120.30, 0.120, 9);

-- PROPUESTA_POLIGONO (Sub-tipo)
INSERT INTO sgs_pro_propuesta_poligono (actividad, area_ha, area_m2, id_propuesta) VALUES
('Silvopastoril - Lote A', 12.50, 125000, 3),
('Agroforestal - Lote B', 8.75, 87500, 4),
('Silvopastoril - Finca La Cabaña', 15.20, 152000, 10);

-- PROPUESTA_PUNTO (Sub-tipo)
INSERT INTO sgs_pro_propuesta_punto (
    actividad, este, norte, descripcion, tipo_punto, 
    tipo_obra, estructura_anclaje, nivel_complejidad, 
    id_estacion_original, cod_tipo, codigo_caj, 
    id_propuesta, id_quebrada
) VALUES
('Obra de captación - Quebrada Sirena', 123456.78, 987654.32, 'Obra tipo 1 en quebrada para captación de agua', 'obra_captacion', 1, TRUE, 'Medio', 'N/A', 'TIPO-01', 'CAJ-001', 5, 1),
('Estación limnimétrica - Quebrada Sirena', 123500.00, 987700.00, 'Estación de monitoreo de nivel de agua', 'estacion_limnimetrica', 1, TRUE, 'Alto', 'EST-001', 'TIPO-02', 'CAJ-002', 6, 1),
('Bebedero - Finca El Edén', 124000.00, 988000.00, 'Bebedero para ganado en predio', 'bebedero', 1, FALSE, 'Bajo', 'N/A', 'TIPO-03', 'CAJ-003', 7, 1),
('Tanque - Finca El Porvenir', 124500.00, 988500.00, 'Tanque de almacenamiento de agua', 'tanque', 1, TRUE, 'Medio', 'N/A', 'TIPO-04', 'CAJ-004', 8, 2);

-- ============================================================
-- 9. RELACIONES (Tablas Puente)
-- ============================================================

-- PREDIO ↔ COBERTURA
INSERT INTO sgs_rel_predio_cobertura (id_predio, id_cobertura, area_ha_parcial) VALUES
(1, 1, 25.00),
(1, 2, 15.50),
(1, 3, 10.00),
(2, 1, 20.25),
(2, 2, 15.00),
(3, 3, 15.75),
(3, 4, 8.00),
(4, 1, 10.00),
(4, 2, 12.00),
(4, 5, 20.00),
(5, 3, 12.50),
(5, 4, 10.00),
(6, 1, 18.00),
(6, 5, 20.00);

-- PREDIO ↔ BIOMA
INSERT INTO sgs_rel_predio_bioma (id_predio, id_bioma) VALUES
(1, 1),
(1, 2),
(2, 1),
(3, 3),
(4, 1),
(4, 2),
(5, 1),
(5, 5),
(6, 1),
(7, 2),
(8, 3),
(9, 1),
(10, 4);

-- PREDIO ↔ ZONIFICACION_POMCA
INSERT INTO sgs_rel_predio_zonificacion_pomca (id_predio, id_zonificacion_pomca) VALUES
(1, 1),
(1, 2),
(2, 2),
(3, 3),
(4, 1),
(5, 3),
(5, 4),
(6, 2),
(7, 1),
(8, 5),
(9, 3),
(10, 6);

-- PREDIO ↔ ZONIFICACION_RFP
INSERT INTO sgs_rel_predio_zonificacion_rfp (id_predio, id_zonificacion_rfp) VALUES
(1, 1),
(3, 2),
(4, 1),
(5, 3),
(6, 4),
(8, 2),
(9, 5);

-- PREDIO ↔ PARAMOS
INSERT INTO sgs_rel_predio_paramos (id_predio, id_paramos) VALUES
(1, 1),
(2, 2),
(5, 1),
(5, 3),
(9, 4),
(10, 5);

-- PROPUESTA_PUNTO ↔ USUARIO
INSERT INTO sgs_rel_propuesta_punto_usuario (id_prop_punto, id_usuario) VALUES
(1, 1),
(1, 2),
(2, 1),
(2, 3),
(3, 4),
(3, 5),
(4, 2),
(4, 6);

-- ============================================================
-- 10. CONSULTAS DE VERIFICACIÓN
-- ============================================================

-- Verificar cantidad de registros por tabla
SELECT 'bcs_lpa_municipio' AS tabla, COUNT(*) AS registros FROM bcs_lpa_municipio
UNION ALL
SELECT 'bcs_lpa_vereda', COUNT(*) FROM bcs_lpa_vereda
UNION ALL
SELECT 'bcs_dh_microcuenca', COUNT(*) FROM bcs_dh_microcuenca
UNION ALL
SELECT 'bcs_dh_quebrada', COUNT(*) FROM bcs_dh_quebrada
UNION ALL
SELECT 'sgs_pre_propietario', COUNT(*) FROM sgs_pre_propietario
UNION ALL
SELECT 'sgs_pre_usuario', COUNT(*) FROM sgs_pre_usuario
UNION ALL
SELECT 'sgs_pre_predio', COUNT(*) FROM sgs_pre_predio
UNION ALL
SELECT 'sgs_amb_cobertura_clc', COUNT(*) FROM sgs_amb_cobertura_clc
UNION ALL
SELECT 'sgs_amb_bioma', COUNT(*) FROM sgs_amb_bioma
UNION ALL
SELECT 'sgs_amb_zonificacion_pomca', COUNT(*) FROM sgs_amb_zonificacion_pomca
UNION ALL
SELECT 'sgs_amb_zonificacion_rfp', COUNT(*) FROM sgs_amb_zonificacion_rfp
UNION ALL
SELECT 'sgs_amb_paramos', COUNT(*) FROM sgs_amb_paramos
UNION ALL
SELECT 'sgs_inf_via', COUNT(*) FROM sgs_inf_via
UNION ALL
SELECT 'sgs_inf_drenaje_simple', COUNT(*) FROM sgs_inf_drenaje_simple
UNION ALL
SELECT 'sgs_inf_drenaje_doble', COUNT(*) FROM sgs_inf_drenaje_doble
UNION ALL
SELECT 'sgs_com_componente', COUNT(*) FROM sgs_com_componente
UNION ALL
SELECT 'sgs_com_accion', COUNT(*) FROM sgs_com_accion
UNION ALL
SELECT 'sgs_pro_propuesta', COUNT(*) FROM sgs_pro_propuesta
UNION ALL
SELECT 'sgs_pro_propuesta_linea', COUNT(*) FROM sgs_pro_propuesta_linea
UNION ALL
SELECT 'sgs_pro_propuesta_poligono', COUNT(*) FROM sgs_pro_propuesta_poligono
UNION ALL
SELECT 'sgs_pro_propuesta_punto', COUNT(*) FROM sgs_pro_propuesta_punto
UNION ALL
SELECT 'sgs_rel_predio_cobertura', COUNT(*) FROM sgs_rel_predio_cobertura
UNION ALL
SELECT 'sgs_rel_predio_bioma', COUNT(*) FROM sgs_rel_predio_bioma
UNION ALL
SELECT 'sgs_rel_predio_zonificacion_pomca', COUNT(*) FROM sgs_rel_predio_zonificacion_pomca
UNION ALL
SELECT 'sgs_rel_predio_zonificacion_rfp', COUNT(*) FROM sgs_rel_predio_zonificacion_rfp
UNION ALL
SELECT 'sgs_rel_predio_paramos', COUNT(*) FROM sgs_rel_predio_paramos
UNION ALL
SELECT 'sgs_rel_propuesta_punto_usuario', COUNT(*) FROM sgs_rel_propuesta_punto_usuario
ORDER BY tabla;