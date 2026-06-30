-- ============================================================
-- SCRIPT SQL COMPLETO - CONVENIO CAR WWF FN
-- ============================================================
-- 
-- PROYECTO:    Convenio CAR - WWF - Fundación Natura
-- OBJETIVO:    Creación de la estructura completa de la base de datos
--              para la gestión de predios, propuestas de conservación,
--              obras hidráulicas, monitoreo y beneficiarios.
-- 
-- AUTOR:       Nikoll Tatiana Ordoñez Diaz
-- FECHA:       2025-06-28
-- VERSIÓN:     1.0 (Final)
-- MOTOR:       PostgreSQL / PostGIS
-- 
-- ESTRUCTURA:
--   Tema: BASE CLASIFICACIÓN DEL SUELO (bcs)
--     Grupo: LÍMITES POLÍTICO ADMINISTRATIVO (lpa)
--       - bcs_lpa_municipio
--       - bcs_lpa_vereda
--     Grupo: DIVISIÓN HIDROGRÁFICA (dh)
--       - bcs_dh_microcuenca
--       - bcs_dh_quebrada
--   
--   Tema: SISTEMAS GENERALES (sgs)
--     Grupo: PREDIO (pre)
--       - sgs_pre_propietario
--       - sgs_pre_usuario
--       - sgs_pre_predio
--     Grupo: UNIDADES AMBIENTALES (amb)
--       - sgs_amb_cobertura_clc
--       - sgs_amb_bioma
--       - sgs_amb_zonificacion_pomca
--       - sgs_amb_zonificacion_rfp
--       - sgs_amb_paramos
--     Grupo: INFRAESTRUCTURA (inf)
--       - sgs_inf_via
--       - sgs_inf_drenaje_simple
--       - sgs_inf_drenaje_doble
--     Grupo: COMPONENTES (com)
--       - sgs_com_componente
--       - sgs_com_accion
--     Grupo: PROPUESTAS (pro)
--       - sgs_pro_propuesta
--       - sgs_pro_propuesta_linea
--       - sgs_pro_propuesta_poligono
--       - sgs_pro_propuesta_punto
--     Grupo: RELACIONES (rel)
--       - sgs_rel_predio_cobertura
--       - sgs_rel_predio_bioma
--       - sgs_rel_predio_zonificacion_pomca
--       - sgs_rel_predio_zonificacion_rfp
--       - sgs_rel_predio_paramos
--       - sgs_rel_propuesta_punto_usuario
-- ============================================================


-- ============================================================
-- 1. ACTIVAR EXTENSIONES (PostGIS)
-- ============================================================

-- Habilitar PostGIS para geometrías (opcional)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;


-- ============================================================
-- TEMA: BASE CLASIFICACIÓN DEL SUELO (bcs)
-- GRUPO: LÍMITES POLÍTICO ADMINISTRATIVO (lpa)
-- ============================================================

-- MUNICIPIO
CREATE TABLE IF NOT EXISTS bcs_lpa_municipio (
    id_municipio SERIAL PRIMARY KEY,
    nombre_municipio VARCHAR(255) NOT NULL,
    codigo_administrativo VARCHAR(50) NOT NULL,
    departamento VARCHAR(100) NOT NULL,
    -- Geometría opcional (PostGIS)
    geom GEOMETRY(MULTIPOLYGON, 4686) -- SRID 4686 para Colombia
);

COMMENT ON TABLE bcs_lpa_municipio IS 'Entidad territorial base que representa los municipios del área de influencia del convenio.';
COMMENT ON COLUMN bcs_lpa_municipio.id_municipio IS 'Identificador único del municipio';
COMMENT ON COLUMN bcs_lpa_municipio.nombre_municipio IS 'Nombre oficial del municipio';
COMMENT ON COLUMN bcs_lpa_municipio.codigo_administrativo IS 'Código administrativo del municipio (DANE)';
COMMENT ON COLUMN bcs_lpa_municipio.departamento IS 'Departamento al que pertenece el municipio';
COMMENT ON COLUMN bcs_lpa_municipio.geom IS 'Geometría del municipio (PostGIS)';


-- VEREDA
CREATE TABLE IF NOT EXISTS bcs_lpa_vereda (
    id_vereda SERIAL PRIMARY KEY,
    nombre_vereda VARCHAR(255) NOT NULL,
    codigo_administrativo VARCHAR(50) NOT NULL,
    poblacion_estimada INTEGER NOT NULL DEFAULT 0,
    id_municipio INTEGER NOT NULL,
    -- Geometría opcional (PostGIS)
    geom GEOMETRY(MULTIPOLYGON, 4686),
    -- Restricción de integridad referencial
    CONSTRAINT fk_vereda_id_municipio 
        FOREIGN KEY (id_municipio) 
        REFERENCES bcs_lpa_municipio(id_municipio) 
        ON DELETE CASCADE
);

COMMENT ON TABLE bcs_lpa_vereda IS 'División territorial intermedia que representa las veredas del área de influencia del convenio.';
COMMENT ON COLUMN bcs_lpa_vereda.id_vereda IS 'Identificador único de la vereda';
COMMENT ON COLUMN bcs_lpa_vereda.nombre_vereda IS 'Nombre oficial de la vereda';
COMMENT ON COLUMN bcs_lpa_vereda.codigo_administrativo IS 'Código administrativo de la vereda';
COMMENT ON COLUMN bcs_lpa_vereda.poblacion_estimada IS 'Población estimada de la vereda';
COMMENT ON COLUMN bcs_lpa_vereda.id_municipio IS 'Identificador del municipio al que pertenece';
COMMENT ON COLUMN bcs_lpa_vereda.geom IS 'Geometría de la vereda (PostGIS)';


-- ============================================================
-- TEMA: BASE CLASIFICACIÓN DEL SUELO (bcs)
-- GRUPO: DIVISIÓN HIDROGRÁFICA (dh)
-- ============================================================

-- MICROCUENCA
CREATE TABLE IF NOT EXISTS bcs_dh_microcuenca (
    id_microcuenca SERIAL PRIMARY KEY,
    nombre_microcuenca VARCHAR(255) NOT NULL,
    area DECIMAL(12,2) NOT NULL DEFAULT 0,
    codigo VARCHAR(50) NOT NULL,
    latitud DECIMAL(12,6) NOT NULL DEFAULT 0,
    longitud DECIMAL(12,6) NOT NULL DEFAULT 0,
    nombre_usuarios VARCHAR(255) NOT NULL DEFAULT 'N/A',
    -- Geometría opcional (PostGIS)
    geom GEOMETRY(MULTIPOLYGON, 4686)
);

COMMENT ON TABLE bcs_dh_microcuenca IS 'Unidad hidrográfica mayor que representa las microcuencas del área de influencia del convenio.';
COMMENT ON COLUMN bcs_dh_microcuenca.id_microcuenca IS 'Identificador único de la microcuenca';
COMMENT ON COLUMN bcs_dh_microcuenca.nombre_microcuenca IS 'Nombre oficial de la microcuenca';
COMMENT ON COLUMN bcs_dh_microcuenca.area IS 'Área de la microcuenca en hectáreas';
COMMENT ON COLUMN bcs_dh_microcuenca.codigo IS 'Código identificador de la microcuenca';
COMMENT ON COLUMN bcs_dh_microcuenca.latitud IS 'Coordenada latitud del centroide';
COMMENT ON COLUMN bcs_dh_microcuenca.longitud IS 'Coordenada longitud del centroide';
COMMENT ON COLUMN bcs_dh_microcuenca.nombre_usuarios IS 'Nombre de los usuarios o comunidad asociada';
COMMENT ON COLUMN bcs_dh_microcuenca.geom IS 'Geometría de la microcuenca (PostGIS)';


-- QUEBRADA
CREATE TABLE IF NOT EXISTS bcs_dh_quebrada (
    id_quebrada SERIAL PRIMARY KEY,
    nombre_quebrada VARCHAR(255) NOT NULL,
    area DECIMAL(12,2) NOT NULL DEFAULT 0,
    latitud DECIMAL(12,6) NOT NULL DEFAULT 0,
    longitud DECIMAL(12,6) NOT NULL DEFAULT 0,
    nombre_usuarios VARCHAR(255) NOT NULL DEFAULT 'N/A',
    id_municipio INTEGER NOT NULL,
    id_microcuenca INTEGER NOT NULL,
    -- Geometría opcional (PostGIS)
    geom GEOMETRY(MULTILINESTRING, 4686),
    -- Restricciones de integridad referencial
    CONSTRAINT fk_quebrada_id_municipio 
        FOREIGN KEY (id_municipio) 
        REFERENCES bcs_lpa_municipio(id_municipio) 
        ON DELETE CASCADE,
    CONSTRAINT fk_quebrada_id_microcuenca 
        FOREIGN KEY (id_microcuenca) 
        REFERENCES bcs_dh_microcuenca(id_microcuenca) 
        ON DELETE CASCADE
);

COMMENT ON TABLE bcs_dh_quebrada IS 'Cuerpo de agua menor que representa las quebradas del área de influencia del convenio.';
COMMENT ON COLUMN bcs_dh_quebrada.id_quebrada IS 'Identificador único de la quebrada';
COMMENT ON COLUMN bcs_dh_quebrada.nombre_quebrada IS 'Nombre oficial de la quebrada';
COMMENT ON COLUMN bcs_dh_quebrada.area IS 'Área de la quebrada en hectáreas';
COMMENT ON COLUMN bcs_dh_quebrada.latitud IS 'Coordenada latitud del centroide';
COMMENT ON COLUMN bcs_dh_quebrada.longitud IS 'Coordenada longitud del centroide';
COMMENT ON COLUMN bcs_dh_quebrada.nombre_usuarios IS 'Nombre de los usuarios o comunidad asociada';
COMMENT ON COLUMN bcs_dh_quebrada.id_municipio IS 'Identificador del municipio al que pertenece';
COMMENT ON COLUMN bcs_dh_quebrada.id_microcuenca IS 'Identificador de la microcuenca a la que pertenece';
COMMENT ON COLUMN bcs_dh_quebrada.geom IS 'Geometría de la quebrada (PostGIS)';


-- ============================================================
-- TEMA: SISTEMAS GENERALES (sgs)
-- GRUPO: PREDIO (pre)
-- ============================================================

-- PROPIETARIO
CREATE TABLE IF NOT EXISTS sgs_pre_propietario (
    id_propietario SERIAL PRIMARY KEY,
    nombre_razon_social VARCHAR(255) NOT NULL,
    telefono VARCHAR(20) NOT NULL
);

COMMENT ON TABLE sgs_pre_propietario IS 'Dueño o representante legal del predio.';
COMMENT ON COLUMN sgs_pre_propietario.id_propietario IS 'Identificador único del propietario';
COMMENT ON COLUMN sgs_pre_propietario.nombre_razon_social IS 'Nombre completo o razón social del propietario';
COMMENT ON COLUMN sgs_pre_propietario.telefono IS 'Número de teléfono de contacto';


-- USUARIO (Beneficiario)
CREATE TABLE IF NOT EXISTS sgs_pre_usuario (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    vereda VARCHAR(255) NOT NULL,
    municipio VARCHAR(255) NOT NULL
);

COMMENT ON TABLE sgs_pre_usuario IS 'Beneficiario de las obras y propuestas del convenio.';
COMMENT ON COLUMN sgs_pre_usuario.id_usuario IS 'Identificador único del usuario';
COMMENT ON COLUMN sgs_pre_usuario.nombre IS 'Nombre completo del usuario';
COMMENT ON COLUMN sgs_pre_usuario.telefono IS 'Número de teléfono de contacto';
COMMENT ON COLUMN sgs_pre_usuario.vereda IS 'Nombre de la vereda donde reside';
COMMENT ON COLUMN sgs_pre_usuario.municipio IS 'Nombre del municipio donde reside';


-- PREDIO
CREATE TABLE IF NOT EXISTS sgs_pre_predio (
    id_predio SERIAL PRIMARY KEY,
    nombre_predio VARCHAR(255) NOT NULL,
    area_ha DECIMAL(12,2) NOT NULL DEFAULT 0,
    cedula_catastral VARCHAR(50) NOT NULL,
    cedula_ant VARCHAR(50) NOT NULL,
    longitud_centroide DECIMAL(12,6) NOT NULL DEFAULT 0,
    latitud_centroide DECIMAL(12,6) NOT NULL DEFAULT 0,
    nucleo_predial VARCHAR(255) NOT NULL,
    observaciones TEXT NOT NULL DEFAULT '',
    perimetro DECIMAL(12,2) NOT NULL DEFAULT 0,
    id_propietario INTEGER NOT NULL,
    id_vereda INTEGER NOT NULL,
    -- Geometría opcional (PostGIS)
    geom GEOMETRY(MULTIPOLYGON, 4686),
    -- Restricciones de integridad referencial
    CONSTRAINT fk_predio_id_propietario 
        FOREIGN KEY (id_propietario) 
        REFERENCES sgs_pre_propietario(id_propietario) 
        ON DELETE RESTRICT,
    CONSTRAINT fk_predio_id_vereda 
        FOREIGN KEY (id_vereda) 
        REFERENCES bcs_lpa_vereda(id_vereda) 
        ON DELETE RESTRICT
);

COMMENT ON TABLE sgs_pre_predio IS 'Unidad territorial de intervención del convenio.';
COMMENT ON COLUMN sgs_pre_predio.id_predio IS 'Identificador único del predio';
COMMENT ON COLUMN sgs_pre_predio.nombre_predio IS 'Nombre del predio';
COMMENT ON COLUMN sgs_pre_predio.area_ha IS 'Área del predio en hectáreas';
COMMENT ON COLUMN sgs_pre_predio.cedula_catastral IS 'Cédula catastral del predio';
COMMENT ON COLUMN sgs_pre_predio.cedula_ant IS 'Cédula anterior del predio';
COMMENT ON COLUMN sgs_pre_predio.longitud_centroide IS 'Coordenada longitud del centroide';
COMMENT ON COLUMN sgs_pre_predio.latitud_centroide IS 'Coordenada latitud del centroide';
COMMENT ON COLUMN sgs_pre_predio.nucleo_predial IS 'Núcleo predial del predio';
COMMENT ON COLUMN sgs_pre_predio.observaciones IS 'Observaciones generales del predio';
COMMENT ON COLUMN sgs_pre_predio.perimetro IS 'Perímetro del predio en metros';
COMMENT ON COLUMN sgs_pre_predio.id_propietario IS 'Identificador del propietario del predio';
COMMENT ON COLUMN sgs_pre_predio.id_vereda IS 'Identificador de la vereda donde se ubica';
COMMENT ON COLUMN sgs_pre_predio.geom IS 'Geometría del predio (PostGIS)';


-- ============================================================
-- TEMA: SISTEMAS GENERALES (sgs)
-- GRUPO: UNIDADES AMBIENTALES (amb)
-- ============================================================

-- COBERTURA CLC
CREATE TABLE IF NOT EXISTS sgs_amb_cobertura_clc (
    id_cobertura SERIAL PRIMARY KEY,
    codigo_clc_nivel3 VARCHAR(20) NOT NULL,
    nombre_cobertura VARCHAR(255) NOT NULL,
    area_ha DECIMAL(12,2) NOT NULL DEFAULT 0,
    area_m2 DECIMAL(15,2) NOT NULL DEFAULT 0,
    estado_naturalidad VARCHAR(30) NOT NULL DEFAULT 'transformado' 
        CHECK (estado_naturalidad IN ('natural', 'seminatural', 'transformado')),
    año_interpretacion INTEGER NOT NULL DEFAULT 2025,
    label VARCHAR(255) NOT NULL DEFAULT ''
);

COMMENT ON TABLE sgs_amb_cobertura_clc IS 'Clasificación de cobertura del suelo según Corine Land Cover (CLC).';
COMMENT ON COLUMN sgs_amb_cobertura_clc.id_cobertura IS 'Identificador único de la cobertura';
COMMENT ON COLUMN sgs_amb_cobertura_clc.codigo_clc_nivel3 IS 'Código CLC nivel 3 (ej: 2.1.1)';
COMMENT ON COLUMN sgs_amb_cobertura_clc.nombre_cobertura IS 'Nombre de la cobertura según CLC';
COMMENT ON COLUMN sgs_amb_cobertura_clc.area_ha IS 'Área de la cobertura en hectáreas';
COMMENT ON COLUMN sgs_amb_cobertura_clc.area_m2 IS 'Área de la cobertura en metros cuadrados';
COMMENT ON COLUMN sgs_amb_cobertura_clc.estado_naturalidad IS 'Estado de naturalidad de la cobertura';
COMMENT ON COLUMN sgs_amb_cobertura_clc.año_interpretacion IS 'Año de interpretación de la cobertura';
COMMENT ON COLUMN sgs_amb_cobertura_clc.label IS 'Etiqueta descriptiva de la cobertura';


-- BIOMA
CREATE TABLE IF NOT EXISTS sgs_amb_bioma (
    id_bioma SERIAL PRIMARY KEY,
    bioma_iavh VARCHAR(255) NOT NULL,
    area_ha DECIMAL(12,2) NOT NULL DEFAULT 0,
    area_m2 DECIMAL(12,2) NOT NULL DEFAULT 0
);

COMMENT ON TABLE sgs_amb_bioma IS 'Clasificación ecológica de biomas según el Instituto Humboldt (IAvH).';
COMMENT ON COLUMN sgs_amb_bioma.id_bioma IS 'Identificador único del bioma';
COMMENT ON COLUMN sgs_amb_bioma.bioma_iavh IS 'Nombre del bioma según clasificación IAvH';
COMMENT ON COLUMN sgs_amb_bioma.area_ha IS 'Área del bioma en hectáreas';
COMMENT ON COLUMN sgs_amb_bioma.area_m2 IS 'Área del bioma en metros cuadrados';


-- ZONIFICACION POMCA
CREATE TABLE IF NOT EXISTS sgs_amb_zonificacion_pomca (
    id_zonificacion_pomca SERIAL PRIMARY KEY,
    categoria_zonificacion VARCHAR(255) NOT NULL,
    area_ha DECIMAL(12,2) NOT NULL DEFAULT 0
);

COMMENT ON TABLE sgs_amb_zonificacion_pomca IS 'Zonificación del Plan de Ordenación y Manejo de Cuencas (POMCA).';
COMMENT ON COLUMN sgs_amb_zonificacion_pomca.id_zonificacion_pomca IS 'Identificador único de la zonificación POMCA';
COMMENT ON COLUMN sgs_amb_zonificacion_pomca.categoria_zonificacion IS 'Categoría de zonificación POMCA';
COMMENT ON COLUMN sgs_amb_zonificacion_pomca.area_ha IS 'Área de la zonificación en hectáreas';


-- ZONIFICACION RFP
CREATE TABLE IF NOT EXISTS sgs_amb_zonificacion_rfp (
    id_zonificacion_rfp SERIAL PRIMARY KEY,
    categoria_zonificacion VARCHAR(255) NOT NULL,
    area_ha DECIMAL(12,2) NOT NULL DEFAULT 0,
    objectid VARCHAR(50) NOT NULL DEFAULT '',
    sector_cod VARCHAR(50) NOT NULL DEFAULT '',
    complejo_nombre VARCHAR(255) NOT NULL DEFAULT '',
    distrito_nombre VARCHAR(255) NOT NULL DEFAULT '',
    complejo_codigo VARCHAR(50) NOT NULL DEFAULT '',
    distrito_codigo VARCHAR(50) NOT NULL DEFAULT ''
);

COMMENT ON TABLE sgs_amb_zonificacion_rfp IS 'Zonificación de la Reserva Forestal Protectora (RFP).';
COMMENT ON COLUMN sgs_amb_zonificacion_rfp.id_zonificacion_rfp IS 'Identificador único de la zonificación RFP';
COMMENT ON COLUMN sgs_amb_zonificacion_rfp.categoria_zonificacion IS 'Categoría de zonificación RFP';
COMMENT ON COLUMN sgs_amb_zonificacion_rfp.area_ha IS 'Área de la zonificación en hectáreas';
COMMENT ON COLUMN sgs_amb_zonificacion_rfp.objectid IS 'Identificador de objeto geoespacial';
COMMENT ON COLUMN sgs_amb_zonificacion_rfp.sector_cod IS 'Código del sector';
COMMENT ON COLUMN sgs_amb_zonificacion_rfp.complejo_nombre IS 'Nombre del complejo';
COMMENT ON COLUMN sgs_amb_zonificacion_rfp.distrito_nombre IS 'Nombre del distrito';
COMMENT ON COLUMN sgs_amb_zonificacion_rfp.complejo_codigo IS 'Código del complejo';
COMMENT ON COLUMN sgs_amb_zonificacion_rfp.distrito_codigo IS 'Código del distrito';


-- PARAMOS
CREATE TABLE IF NOT EXISTS sgs_amb_paramos (
    id_paramos SERIAL PRIMARY KEY,
    nombre_paramo VARCHAR(255) NOT NULL,
    complejo_codigo VARCHAR(50) NOT NULL DEFAULT '',
    complejo_nombre VARCHAR(255) NOT NULL DEFAULT '',
    area_ha DECIMAL(12,2) NOT NULL DEFAULT 0
);

COMMENT ON TABLE sgs_amb_paramos IS 'Ecosistemas de páramo presentes en el área de influencia del convenio.';
COMMENT ON COLUMN sgs_amb_paramos.id_paramos IS 'Identificador único del páramo';
COMMENT ON COLUMN sgs_amb_paramos.nombre_paramo IS 'Nombre oficial del páramo';
COMMENT ON COLUMN sgs_amb_paramos.complejo_codigo IS 'Código del complejo de páramo';
COMMENT ON COLUMN sgs_amb_paramos.complejo_nombre IS 'Nombre del complejo de páramo';
COMMENT ON COLUMN sgs_amb_paramos.area_ha IS 'Área del páramo en hectáreas';


-- ============================================================
-- TEMA: SISTEMAS GENERALES (sgs)
-- GRUPO: INFRAESTRUCTURA (inf)
-- ============================================================

-- VIA
CREATE TABLE IF NOT EXISTS sgs_inf_via (
    id_via SERIAL PRIMARY KEY,
    tipo_via VARCHAR(20) NOT NULL 
        CHECK (tipo_via IN ('primaria', 'secundaria', 'terciaria')),
    estado_superficie VARCHAR(20) NOT NULL 
        CHECK (estado_superficie IN ('pavimento', 'afirmado', 'tierra')),
    numero_carriles INTEGER NOT NULL DEFAULT 1,
    accesibilidad VARCHAR(255) NOT NULL DEFAULT '',
    id_municipio INTEGER NOT NULL,
    -- Geometría opcional (PostGIS)
    geom GEOMETRY(MULTILINESTRING, 4686),
    -- Restricción de integridad referencial
    CONSTRAINT fk_via_id_municipio 
        FOREIGN KEY (id_municipio) 
        REFERENCES bcs_lpa_municipio(id_municipio) 
        ON DELETE CASCADE
);

COMMENT ON TABLE sgs_inf_via IS 'Clasificación funcional de las vías municipales.';
COMMENT ON COLUMN sgs_inf_via.id_via IS 'Identificador único de la vía';
COMMENT ON COLUMN sgs_inf_via.tipo_via IS 'Tipo de vía según clasificación funcional';
COMMENT ON COLUMN sgs_inf_via.estado_superficie IS 'Estado de la superficie de la vía';
COMMENT ON COLUMN sgs_inf_via.numero_carriles IS 'Número de carriles de la vía';
COMMENT ON COLUMN sgs_inf_via.accesibilidad IS 'Tipo de accesibilidad de la vía';
COMMENT ON COLUMN sgs_inf_via.id_municipio IS 'Identificador del municipio al que pertenece';
COMMENT ON COLUMN sgs_inf_via.geom IS 'Geometría de la vía (PostGIS)';


-- DRENAJE SIMPLE
CREATE TABLE IF NOT EXISTS sgs_inf_drenaje_simple (
    id_drenaje_simple SERIAL PRIMARY KEY,
    estado_drenaje VARCHAR(50) NOT NULL DEFAULT 'Activo',
    nombre_geografico VARCHAR(255) NOT NULL DEFAULT '',
    id_municipio INTEGER NOT NULL,
    -- Geometría opcional (PostGIS)
    geom GEOMETRY(MULTILINESTRING, 4686),
    -- Restricción de integridad referencial
    CONSTRAINT fk_drenaje_simple_id_municipio 
        FOREIGN KEY (id_municipio) 
        REFERENCES bcs_lpa_municipio(id_municipio) 
        ON DELETE CASCADE
);

COMMENT ON TABLE sgs_inf_drenaje_simple IS 'Drenaje de tipo simple presente en el territorio.';
COMMENT ON COLUMN sgs_inf_drenaje_simple.id_drenaje_simple IS 'Identificador único del drenaje simple';
COMMENT ON COLUMN sgs_inf_drenaje_simple.estado_drenaje IS 'Estado actual del drenaje';
COMMENT ON COLUMN sgs_inf_drenaje_simple.nombre_geografico IS 'Nombre geográfico del drenaje';
COMMENT ON COLUMN sgs_inf_drenaje_simple.id_municipio IS 'Identificador del municipio al que pertenece';
COMMENT ON COLUMN sgs_inf_drenaje_simple.geom IS 'Geometría del drenaje (PostGIS)';


-- DRENAJE DOBLE
CREATE TABLE IF NOT EXISTS sgs_inf_drenaje_doble (
    id_drenaje_doble SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL DEFAULT '',
    nombre_geografico VARCHAR(255) NOT NULL DEFAULT '',
    id_municipio INTEGER NOT NULL,
    -- Geometría opcional (PostGIS)
    geom GEOMETRY(MULTILINESTRING, 4686),
    -- Restricción de integridad referencial
    CONSTRAINT fk_drenaje_doble_id_municipio 
        FOREIGN KEY (id_municipio) 
        REFERENCES bcs_lpa_municipio(id_municipio) 
        ON DELETE CASCADE
);

COMMENT ON TABLE sgs_inf_drenaje_doble IS 'Drenaje de tipo doble presente en el territorio.';
COMMENT ON COLUMN sgs_inf_drenaje_doble.id_drenaje_doble IS 'Identificador único del drenaje doble';
COMMENT ON COLUMN sgs_inf_drenaje_doble.tipo IS 'Tipo de drenaje doble';
COMMENT ON COLUMN sgs_inf_drenaje_doble.nombre_geografico IS 'Nombre geográfico del drenaje';
COMMENT ON COLUMN sgs_inf_drenaje_doble.id_municipio IS 'Identificador del municipio al que pertenece';
COMMENT ON COLUMN sgs_inf_drenaje_doble.geom IS 'Geometría del drenaje (PostGIS)';


-- ============================================================
-- TEMA: SISTEMAS GENERALES (sgs)
-- GRUPO: COMPONENTES (com)
-- ============================================================

-- COMPONENTE
CREATE TABLE IF NOT EXISTS sgs_com_componente (
    id_componente SERIAL PRIMARY KEY,
    nombre VARCHAR(2) NOT NULL CHECK (nombre IN ('C1', 'C2', 'C3'))
);

COMMENT ON TABLE sgs_com_componente IS 'Componentes del convenio (C1, C2, C3).';
COMMENT ON COLUMN sgs_com_componente.id_componente IS 'Identificador único del componente';
COMMENT ON COLUMN sgs_com_componente.nombre IS 'Nombre del componente (C1, C2, C3)';


-- ACCION
CREATE TABLE IF NOT EXISTS sgs_com_accion (
    id_accion SERIAL PRIMARY KEY,
    nombre VARCHAR(2) NOT NULL CHECK (nombre IN ('A1', 'A2')),
    id_componente INTEGER NOT NULL,
    -- Restricción de integridad referencial
    CONSTRAINT fk_accion_id_componente 
        FOREIGN KEY (id_componente) 
        REFERENCES sgs_com_componente(id_componente) 
        ON DELETE RESTRICT
);

COMMENT ON TABLE sgs_com_accion IS 'Acciones dentro de cada componente (A1, A2).';
COMMENT ON COLUMN sgs_com_accion.id_accion IS 'Identificador único de la acción';
COMMENT ON COLUMN sgs_com_accion.nombre IS 'Nombre de la acción (A1, A2)';
COMMENT ON COLUMN sgs_com_accion.id_componente IS 'Identificador del componente al que pertenece';


-- ============================================================
-- TEMA: SISTEMAS GENERALES (sgs)
-- GRUPO: PROPUESTAS (pro)
-- ============================================================

-- PROPUESTA (Super-tipo)
CREATE TABLE IF NOT EXISTS sgs_pro_propuesta (
    id_propuesta SERIAL PRIMARY KEY,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('linea', 'poligono', 'punto')),
    actividad TEXT NOT NULL DEFAULT '',
    id_predio INTEGER NOT NULL,
    id_quebrada INTEGER NOT NULL,
    id_accion INTEGER NOT NULL,
    -- Restricciones de integridad referencial
    CONSTRAINT fk_propuesta_id_predio 
        FOREIGN KEY (id_predio) 
        REFERENCES sgs_pre_predio(id_predio) 
        ON DELETE CASCADE,
    CONSTRAINT fk_propuesta_id_quebrada 
        FOREIGN KEY (id_quebrada) 
        REFERENCES bcs_dh_quebrada(id_quebrada) 
        ON DELETE SET NULL,
    CONSTRAINT fk_propuesta_id_accion 
        FOREIGN KEY (id_accion) 
        REFERENCES sgs_com_accion(id_accion) 
        ON DELETE RESTRICT
);

COMMENT ON TABLE sgs_pro_propuesta IS 'Super-tipo de todas las propuestas del convenio.';
COMMENT ON COLUMN sgs_pro_propuesta.id_propuesta IS 'Identificador único de la propuesta';
COMMENT ON COLUMN sgs_pro_propuesta.tipo IS 'Tipo de propuesta (línea, polígono, punto)';
COMMENT ON COLUMN sgs_pro_propuesta.actividad IS 'Descripción de la actividad de la propuesta';
COMMENT ON COLUMN sgs_pro_propuesta.id_predio IS 'Identificador del predio asociado';
COMMENT ON COLUMN sgs_pro_propuesta.id_quebrada IS 'Identificador de la quebrada asociada';
COMMENT ON COLUMN sgs_pro_propuesta.id_accion IS 'Identificador de la acción asociada';


-- PROPUESTA_LINEA (Sub-tipo)
CREATE TABLE IF NOT EXISTS sgs_pro_propuesta_linea (
    id_prop_linea SERIAL PRIMARY KEY,
    actividad VARCHAR(255) NOT NULL DEFAULT '',
    longitud_m DECIMAL(12,2) NOT NULL DEFAULT 0,
    longitud_km DECIMAL(12,2) NOT NULL DEFAULT 0,
    id_propuesta INTEGER NOT NULL UNIQUE,
    -- Geometría opcional (PostGIS)
    geom GEOMETRY(MULTILINESTRING, 4686),
    -- Restricción de integridad referencial
    CONSTRAINT fk_propuesta_linea_id_propuesta 
        FOREIGN KEY (id_propuesta) 
        REFERENCES sgs_pro_propuesta(id_propuesta) 
        ON DELETE CASCADE
);

COMMENT ON TABLE sgs_pro_propuesta_linea IS 'Sub-tipo de propuesta para intervenciones lineales (cercos vivos, aislamientos).';
COMMENT ON COLUMN sgs_pro_propuesta_linea.id_prop_linea IS 'Identificador único de la propuesta línea';
COMMENT ON COLUMN sgs_pro_propuesta_linea.actividad IS 'Descripción de la actividad lineal';
COMMENT ON COLUMN sgs_pro_propuesta_linea.longitud_m IS 'Longitud en metros';
COMMENT ON COLUMN sgs_pro_propuesta_linea.longitud_km IS 'Longitud en kilómetros';
COMMENT ON COLUMN sgs_pro_propuesta_linea.id_propuesta IS 'Identificador de la propuesta padre';
COMMENT ON COLUMN sgs_pro_propuesta_linea.geom IS 'Geometría de la propuesta línea (PostGIS)';


-- PROPUESTA_POLIGONO (Sub-tipo)
CREATE TABLE IF NOT EXISTS sgs_pro_propuesta_poligono (
    id_prop_poligono SERIAL PRIMARY KEY,
    actividad VARCHAR(255) NOT NULL DEFAULT '',
    area_ha DECIMAL(12,2) NOT NULL DEFAULT 0,
    area_m2 DECIMAL(12,2) NOT NULL DEFAULT 0,
    id_propuesta INTEGER NOT NULL UNIQUE,
    -- Geometría opcional (PostGIS)
    geom GEOMETRY(MULTIPOLYGON, 4686),
    -- Restricción de integridad referencial
    CONSTRAINT fk_propuesta_poligono_id_propuesta 
        FOREIGN KEY (id_propuesta) 
        REFERENCES sgs_pro_propuesta(id_propuesta) 
        ON DELETE CASCADE
);

COMMENT ON TABLE sgs_pro_propuesta_poligono IS 'Sub-tipo de propuesta para áreas (silvopastoriles, agroforestales).';
COMMENT ON COLUMN sgs_pro_propuesta_poligono.id_prop_poligono IS 'Identificador único de la propuesta polígono';
COMMENT ON COLUMN sgs_pro_propuesta_poligono.actividad IS 'Descripción de la actividad poligonal';
COMMENT ON COLUMN sgs_pro_propuesta_poligono.area_ha IS 'Área en hectáreas';
COMMENT ON COLUMN sgs_pro_propuesta_poligono.area_m2 IS 'Área en metros cuadrados';
COMMENT ON COLUMN sgs_pro_propuesta_poligono.id_propuesta IS 'Identificador de la propuesta padre';
COMMENT ON COLUMN sgs_pro_propuesta_poligono.geom IS 'Geometría de la propuesta polígono (PostGIS)';


-- PROPUESTA_PUNTO (Sub-tipo)
CREATE TABLE IF NOT EXISTS sgs_pro_propuesta_punto (
    id_prop_punto SERIAL PRIMARY KEY,
    actividad VARCHAR(255) NOT NULL DEFAULT '',
    este DECIMAL(12,6) NOT NULL DEFAULT 0,
    norte DECIMAL(12,6) NOT NULL DEFAULT 0,
    descripcion TEXT NOT NULL DEFAULT '',
    tipo_punto VARCHAR(30) NOT NULL 
        CHECK (tipo_punto IN ('obra_captacion', 'estacion_limnimetrica', 'bebedero', 'tanque', 'panel_solar')),
    tipo_obra INTEGER NOT NULL DEFAULT 1 CHECK (tipo_obra IN (1, 2, 3)),
    estructura_anclaje BOOLEAN NOT NULL DEFAULT FALSE,
    nivel_complejidad VARCHAR(50) NOT NULL DEFAULT '',
    id_estacion_original VARCHAR(50) NOT NULL DEFAULT '',
    cod_tipo VARCHAR(50) NOT NULL DEFAULT '',
    codigo_caj VARCHAR(50) NOT NULL DEFAULT '',
    id_propuesta INTEGER NOT NULL UNIQUE,
    id_quebrada INTEGER NOT NULL,
    -- Geometría opcional (PostGIS)
    geom GEOMETRY(POINT, 4686),
    -- Restricciones de integridad referencial
    CONSTRAINT fk_propuesta_punto_id_propuesta 
        FOREIGN KEY (id_propuesta) 
        REFERENCES sgs_pro_propuesta(id_propuesta) 
        ON DELETE CASCADE,
    CONSTRAINT fk_propuesta_punto_id_quebrada 
        FOREIGN KEY (id_quebrada) 
        REFERENCES bcs_dh_quebrada(id_quebrada) 
        ON DELETE SET NULL
);

COMMENT ON TABLE sgs_pro_propuesta_punto IS 'Sub-tipo de propuesta para puntos (bebederos, tanques, paneles, obras de captación, estaciones limnimétricas).';
COMMENT ON COLUMN sgs_pro_propuesta_punto.id_prop_punto IS 'Identificador único de la propuesta punto';
COMMENT ON COLUMN sgs_pro_propuesta_punto.actividad IS 'Descripción de la actividad puntual';
COMMENT ON COLUMN sgs_pro_propuesta_punto.este IS 'Coordenada Este (X)';
COMMENT ON COLUMN sgs_pro_propuesta_punto.norte IS 'Coordenada Norte (Y)';
COMMENT ON COLUMN sgs_pro_propuesta_punto.descripcion IS 'Descripción detallada del punto';
COMMENT ON COLUMN sgs_pro_propuesta_punto.tipo_punto IS 'Tipo de punto específico';
COMMENT ON COLUMN sgs_pro_propuesta_punto.tipo_obra IS 'Tipo de obra (1, 2, 3)';
COMMENT ON COLUMN sgs_pro_propuesta_punto.estructura_anclaje IS 'Indica si tiene estructura de anclaje';
COMMENT ON COLUMN sgs_pro_propuesta_punto.nivel_complejidad IS 'Nivel de complejidad de la obra';
COMMENT ON COLUMN sgs_pro_propuesta_punto.id_estacion_original IS 'Identificador original de la estación';
COMMENT ON COLUMN sgs_pro_propuesta_punto.cod_tipo IS 'Código del tipo';
COMMENT ON COLUMN sgs_pro_propuesta_punto.codigo_caj IS 'Código del CAJ';
COMMENT ON COLUMN sgs_pro_propuesta_punto.id_propuesta IS 'Identificador de la propuesta padre';
COMMENT ON COLUMN sgs_pro_propuesta_punto.id_quebrada IS 'Identificador de la quebrada asociada';
COMMENT ON COLUMN sgs_pro_propuesta_punto.geom IS 'Geometría de la propuesta punto (PostGIS)';


-- ============================================================
-- TEMA: SISTEMAS GENERALES (sgs)
-- GRUPO: RELACIONES (rel) - Tablas puente
-- ============================================================

-- PREDIO ↔ COBERTURA_CLC (N:N)
CREATE TABLE IF NOT EXISTS sgs_rel_predio_cobertura (
    id_predio INTEGER NOT NULL,
    id_cobertura INTEGER NOT NULL,
    area_ha_parcial DECIMAL(12,2) NOT NULL DEFAULT 0,
    -- Clave primaria compuesta
    PRIMARY KEY (id_predio, id_cobertura),
    -- Restricciones de integridad referencial
    CONSTRAINT fk_rel_predio_cobertura_id_predio 
        FOREIGN KEY (id_predio) 
        REFERENCES sgs_pre_predio(id_predio) 
        ON DELETE CASCADE,
    CONSTRAINT fk_rel_predio_cobertura_id_cobertura 
        FOREIGN KEY (id_cobertura) 
        REFERENCES sgs_amb_cobertura_clc(id_cobertura) 
        ON DELETE CASCADE
);

COMMENT ON TABLE sgs_rel_predio_cobertura IS 'Relación muchos a muchos entre PREDIO y COBERTURA_CLC.';
COMMENT ON COLUMN sgs_rel_predio_cobertura.id_predio IS 'Identificador del predio';
COMMENT ON COLUMN sgs_rel_predio_cobertura.id_cobertura IS 'Identificador de la cobertura';
COMMENT ON COLUMN sgs_rel_predio_cobertura.area_ha_parcial IS 'Área parcial de la cobertura dentro del predio';


-- PREDIO ↔ BIOMA (N:N)
CREATE TABLE IF NOT EXISTS sgs_rel_predio_bioma (
    id_predio INTEGER NOT NULL,
    id_bioma INTEGER NOT NULL,
    -- Clave primaria compuesta
    PRIMARY KEY (id_predio, id_bioma),
    -- Restricciones de integridad referencial
    CONSTRAINT fk_rel_predio_bioma_id_predio 
        FOREIGN KEY (id_predio) 
        REFERENCES sgs_pre_predio(id_predio) 
        ON DELETE CASCADE,
    CONSTRAINT fk_rel_predio_bioma_id_bioma 
        FOREIGN KEY (id_bioma) 
        REFERENCES sgs_amb_bioma(id_bioma) 
        ON DELETE CASCADE
);

COMMENT ON TABLE sgs_rel_predio_bioma IS 'Relación muchos a muchos entre PREDIO y BIOMA.';
COMMENT ON COLUMN sgs_rel_predio_bioma.id_predio IS 'Identificador del predio';
COMMENT ON COLUMN sgs_rel_predio_bioma.id_bioma IS 'Identificador del bioma';


-- PREDIO ↔ ZONIFICACION_POMCA (N:N)
CREATE TABLE IF NOT EXISTS sgs_rel_predio_zonificacion_pomca (
    id_predio INTEGER NOT NULL,
    id_zonificacion_pomca INTEGER NOT NULL,
    -- Clave primaria compuesta
    PRIMARY KEY (id_predio, id_zonificacion_pomca),
    -- Restricciones de integridad referencial
    CONSTRAINT fk_rel_predio_zon_pomca_id_predio 
        FOREIGN KEY (id_predio) 
        REFERENCES sgs_pre_predio(id_predio) 
        ON DELETE CASCADE,
    CONSTRAINT fk_rel_predio_zon_pomca_id_zon 
        FOREIGN KEY (id_zonificacion_pomca) 
        REFERENCES sgs_amb_zonificacion_pomca(id_zonificacion_pomca) 
        ON DELETE CASCADE
);

COMMENT ON TABLE sgs_rel_predio_zonificacion_pomca IS 'Relación muchos a muchos entre PREDIO y ZONIFICACION_POMCA.';
COMMENT ON COLUMN sgs_rel_predio_zonificacion_pomca.id_predio IS 'Identificador del predio';
COMMENT ON COLUMN sgs_rel_predio_zonificacion_pomca.id_zonificacion_pomca IS 'Identificador de la zonificación POMCA';


-- PREDIO ↔ ZONIFICACION_RFP (N:N)
CREATE TABLE IF NOT EXISTS sgs_rel_predio_zonificacion_rfp (
    id_predio INTEGER NOT NULL,
    id_zonificacion_rfp INTEGER NOT NULL,
    -- Clave primaria compuesta
    PRIMARY KEY (id_predio, id_zonificacion_rfp),
    -- Restricciones de integridad referencial
    CONSTRAINT fk_rel_predio_zon_rfp_id_predio 
        FOREIGN KEY (id_predio) 
        REFERENCES sgs_pre_predio(id_predio) 
        ON DELETE CASCADE,
    CONSTRAINT fk_rel_predio_zon_rfp_id_zon 
        FOREIGN KEY (id_zonificacion_rfp) 
        REFERENCES sgs_amb_zonificacion_rfp(id_zonificacion_rfp) 
        ON DELETE CASCADE
);

COMMENT ON TABLE sgs_rel_predio_zonificacion_rfp IS 'Relación muchos a muchos entre PREDIO y ZONIFICACION_RFP.';
COMMENT ON COLUMN sgs_rel_predio_zonificacion_rfp.id_predio IS 'Identificador del predio';
COMMENT ON COLUMN sgs_rel_predio_zonificacion_rfp.id_zonificacion_rfp IS 'Identificador de la zonificación RFP';


-- PREDIO ↔ PARAMOS (N:N)
CREATE TABLE IF NOT EXISTS sgs_rel_predio_paramos (
    id_predio INTEGER NOT NULL,
    id_paramos INTEGER NOT NULL,
    -- Clave primaria compuesta
    PRIMARY KEY (id_predio, id_paramos),
    -- Restricciones de integridad referencial
    CONSTRAINT fk_rel_predio_paramos_id_predio 
        FOREIGN KEY (id_predio) 
        REFERENCES sgs_pre_predio(id_predio) 
        ON DELETE CASCADE,
    CONSTRAINT fk_rel_predio_paramos_id_paramos 
        FOREIGN KEY (id_paramos) 
        REFERENCES sgs_amb_paramos(id_paramos) 
        ON DELETE CASCADE
);

COMMENT ON TABLE sgs_rel_predio_paramos IS 'Relación muchos a muchos entre PREDIO y PARAMOS.';
COMMENT ON COLUMN sgs_rel_predio_paramos.id_predio IS 'Identificador del predio';
COMMENT ON COLUMN sgs_rel_predio_paramos.id_paramos IS 'Identificador del páramo';


-- PROPUESTA_PUNTO ↔ USUARIO (N:N)
CREATE TABLE IF NOT EXISTS sgs_rel_propuesta_punto_usuario (
    id_prop_punto INTEGER NOT NULL,
    id_usuario INTEGER NOT NULL,
    -- Clave primaria compuesta
    PRIMARY KEY (id_prop_punto, id_usuario),
    -- Restricciones de integridad referencial
    CONSTRAINT fk_rel_prop_punto_usuario_id_punto 
        FOREIGN KEY (id_prop_punto) 
        REFERENCES sgs_pro_propuesta_punto(id_prop_punto) 
        ON DELETE CASCADE,
    CONSTRAINT fk_rel_prop_punto_usuario_id_usuario 
        FOREIGN KEY (id_usuario) 
        REFERENCES sgs_pre_usuario(id_usuario) 
        ON DELETE CASCADE
);

COMMENT ON TABLE sgs_rel_propuesta_punto_usuario IS 'Relación muchos a muchos entre PROPUESTA_PUNTO y USUARIO.';
COMMENT ON COLUMN sgs_rel_propuesta_punto_usuario.id_prop_punto IS 'Identificador de la propuesta punto';
COMMENT ON COLUMN sgs_rel_propuesta_punto_usuario.id_usuario IS 'Identificador del usuario beneficiario';


-- ============================================================
-- ÍNDICES PARA OPTIMIZAR CONSULTAS
-- ============================================================

-- Índices LPA
CREATE INDEX idx_bcs_lpa_vereda_id_municipio ON bcs_lpa_vereda (id_municipio);
CREATE INDEX idx_bcs_lpa_vereda_nombre ON bcs_lpa_vereda (nombre_vereda);
CREATE INDEX idx_bcs_lpa_municipio_nombre ON bcs_lpa_municipio (nombre_municipio);
CREATE INDEX idx_bcs_lpa_municipio_departamento ON bcs_lpa_municipio (departamento);

-- Índices DH
CREATE INDEX idx_bcs_dh_quebrada_id_municipio ON bcs_dh_quebrada (id_municipio);
CREATE INDEX idx_bcs_dh_quebrada_id_microcuenca ON bcs_dh_quebrada (id_microcuenca);
CREATE INDEX idx_bcs_dh_quebrada_nombre ON bcs_dh_quebrada (nombre_quebrada);
CREATE INDEX idx_bcs_dh_microcuenca_nombre ON bcs_dh_microcuenca (nombre_microcuenca);

-- Índices PREDIO
CREATE INDEX idx_sgs_pre_predio_id_propietario ON sgs_pre_predio (id_propietario);
CREATE INDEX idx_sgs_pre_predio_id_vereda ON sgs_pre_predio (id_vereda);
CREATE INDEX idx_sgs_pre_predio_nombre ON sgs_pre_predio (nombre_predio);
CREATE INDEX idx_sgs_pre_predio_cedula_catastral ON sgs_pre_predio (cedula_catastral);
CREATE INDEX idx_sgs_pre_propietario_nombre ON sgs_pre_propietario (nombre_razon_social);

-- Índices UNIDADES AMBIENTALES
CREATE INDEX idx_sgs_amb_cobertura_codigo ON sgs_amb_cobertura_clc (codigo_clc_nivel3);
CREATE INDEX idx_sgs_amb_cobertura_nombre ON sgs_amb_cobertura_clc (nombre_cobertura);
CREATE INDEX idx_sgs_amb_bioma_nombre ON sgs_amb_bioma (bioma_iavh);
CREATE INDEX idx_sgs_amb_zon_pomca_categoria ON sgs_amb_zonificacion_pomca (categoria_zonificacion);
CREATE INDEX idx_sgs_amb_zon_rfp_categoria ON sgs_amb_zonificacion_rfp (categoria_zonificacion);
CREATE INDEX idx_sgs_amb_paramos_nombre ON sgs_amb_paramos (nombre_paramo);

-- Índices INFRAESTRUCTURA
CREATE INDEX idx_sgs_inf_via_id_municipio ON sgs_inf_via (id_municipio);
CREATE INDEX idx_sgs_inf_via_tipo ON sgs_inf_via (tipo_via);
CREATE INDEX idx_sgs_inf_drenaje_simple_id_municipio ON sgs_inf_drenaje_simple (id_municipio);
CREATE INDEX idx_sgs_inf_drenaje_doble_id_municipio ON sgs_inf_drenaje_doble (id_municipio);

-- Índices COMPONENTES
CREATE INDEX idx_sgs_com_accion_id_componente ON sgs_com_accion (id_componente);

-- Índices PROPUESTAS
CREATE INDEX idx_sgs_pro_propuesta_id_predio ON sgs_pro_propuesta (id_predio);
CREATE INDEX idx_sgs_pro_propuesta_id_quebrada ON sgs_pro_propuesta (id_quebrada);
CREATE INDEX idx_sgs_pro_propuesta_id_accion ON sgs_pro_propuesta (id_accion);
CREATE INDEX idx_sgs_pro_propuesta_tipo ON sgs_pro_propuesta (tipo);
CREATE INDEX idx_sgs_pro_propuesta_punto_id_quebrada ON sgs_pro_propuesta_punto (id_quebrada);
CREATE INDEX idx_sgs_pro_propuesta_punto_tipo_punto ON sgs_pro_propuesta_punto (tipo_punto);

-- Índices RELACIONES
CREATE INDEX idx_sgs_rel_predio_cobertura_id_predio ON sgs_rel_predio_cobertura (id_predio);
CREATE INDEX idx_sgs_rel_predio_cobertura_id_cobertura ON sgs_rel_predio_cobertura (id_cobertura);
CREATE INDEX idx_sgs_rel_predio_bioma_id_predio ON sgs_rel_predio_bioma (id_predio);
CREATE INDEX idx_sgs_rel_predio_bioma_id_bioma ON sgs_rel_predio_bioma (id_bioma);
CREATE INDEX idx_sgs_rel_predio_zon_pomca_id_predio ON sgs_rel_predio_zonificacion_pomca (id_predio);
CREATE INDEX idx_sgs_rel_predio_zon_pomca_id_zon ON sgs_rel_predio_zonificacion_pomca (id_zonificacion_pomca);
CREATE INDEX idx_sgs_rel_predio_zon_rfp_id_predio ON sgs_rel_predio_zonificacion_rfp (id_predio);
CREATE INDEX idx_sgs_rel_predio_zon_rfp_id_zon ON sgs_rel_predio_zonificacion_rfp (id_zonificacion_rfp);
CREATE INDEX idx_sgs_rel_predio_paramos_id_predio ON sgs_rel_predio_paramos (id_predio);
CREATE INDEX idx_sgs_rel_predio_paramos_id_paramos ON sgs_rel_predio_paramos (id_paramos);
CREATE INDEX idx_sgs_rel_prop_punto_usuario_id_punto ON sgs_rel_propuesta_punto_usuario (id_prop_punto);
CREATE INDEX idx_sgs_rel_prop_punto_usuario_id_usuario ON sgs_rel_propuesta_punto_usuario (id_usuario);

-- Índices espaciales (PostGIS) - Opcionales
CREATE INDEX idx_bcs_lpa_municipio_geom ON bcs_lpa_municipio USING GIST (geom);
CREATE INDEX idx_bcs_lpa_vereda_geom ON bcs_lpa_vereda USING GIST (geom);
CREATE INDEX idx_bcs_dh_microcuenca_geom ON bcs_dh_microcuenca USING GIST (geom);
CREATE INDEX idx_bcs_dh_quebrada_geom ON bcs_dh_quebrada USING GIST (geom);
CREATE INDEX idx_sgs_pre_predio_geom ON sgs_pre_predio USING GIST (geom);
CREATE INDEX idx_sgs_inf_via_geom ON sgs_inf_via USING GIST (geom);
CREATE INDEX idx_sgs_inf_drenaje_simple_geom ON sgs_inf_drenaje_simple USING GIST (geom);
CREATE INDEX idx_sgs_inf_drenaje_doble_geom ON sgs_inf_drenaje_doble USING GIST (geom);
CREATE INDEX idx_sgs_pro_propuesta_linea_geom ON sgs_pro_propuesta_linea USING GIST (geom);
CREATE INDEX idx_sgs_pro_propuesta_poligono_geom ON sgs_pro_propuesta_poligono USING GIST (geom);
CREATE INDEX idx_sgs_pro_propuesta_punto_geom ON sgs_pro_propuesta_punto USING GIST (geom);


-- ============================================================
-- DATOS DE PRUEBA (Ejemplo)
-- ============================================================

-- Insertar componentes
INSERT INTO sgs_com_componente (nombre) VALUES 
('C1'),
('C2'),
('C3');

-- Insertar acciones
INSERT INTO sgs_com_accion (nombre, id_componente) VALUES 
('A1', 1),
('A2', 1),
('A1', 2),
('A2', 2);

-- Insertar municipios
INSERT INTO bcs_lpa_municipio (nombre_municipio, codigo_administrativo, departamento) VALUES 
('Cali', '76001', 'Valle del Cauca'),
('Palmira', '76520', 'Valle del Cauca'),
('Yumbo', '76892', 'Valle del Cauca');

-- Insertar veredas
INSERT INTO bcs_lpa_vereda (nombre_vereda, codigo_administrativo, poblacion_estimada, id_municipio) VALUES 
('La Sirena', '76001-01', 350, 1),
('El Porvenir', '76001-02', 280, 1),
('La Cabaña', '76520-01', 150, 2);

-- Insertar microcuencas
INSERT INTO bcs_dh_microcuenca (nombre_microcuenca, area, codigo, latitud, longitud, nombre_usuarios) VALUES 
('Microcuenca La Sirena', 45.00, 'M001', 3.4512, -76.5321, 'Comunidad La Sirena'),
('Microcuenca El Porvenir', 30.50, 'M002', 3.4200, -76.5100, 'Comunidad El Porvenir');

-- Insertar quebradas
INSERT INTO bcs_dh_quebrada (nombre_quebrada, area, latitud, longitud, nombre_usuarios, id_municipio, id_microcuenca) VALUES 
('Quebrada La Sirena', 12.50, 3.4512, -76.5321, 'Comunidad La Sirena', 1, 1),
('Quebrada El Porvenir', 8.30, 3.4200, -76.5100, 'Comunidad El Porvenir', 1, 2),
('Quebrada La Cabaña', 5.20, 3.4000, -76.4800, 'Comunidad La Cabaña', 2, 1);

-- Insertar propietarios
INSERT INTO sgs_pre_propietario (nombre_razon_social, telefono) VALUES 
('Juan Carlos Pérez Gómez', '3123456789'),
('María Elena Rodríguez', '3156789012'),
('Ganadera El Rosario S.A.S.', '3210987654');

-- Insertar usuarios
INSERT INTO sgs_pre_usuario (nombre, telefono, vereda, municipio) VALUES 
('Luis Fernando Ramírez', '3101234567', 'La Sirena', 'Cali'),
('Ana María Ortiz', '3152345678', 'El Porvenir', 'Cali'),
('Carlos Alberto Sánchez', '3213456789', 'La Cabaña', 'Palmira');

-- Insertar coberturas
INSERT INTO sgs_amb_cobertura_clc (codigo_clc_nivel3, nombre_cobertura, area_ha, area_m2, estado_naturalidad, año_interpretacion, label) VALUES 
('2.1.1', 'Pasto arbolado', 15.50, 155000, 'transformado', 2023, 'Pasto arbolado'),
('2.2.1', 'Pastos limpios', 10.25, 102500, 'transformado', 2023, 'Pasto limpio'),
('1.1.1', 'Rastrojo', 5.75, 57500, 'natural', 2023, 'Rastrojo');

-- Insertar biomas
INSERT INTO sgs_amb_bioma (bioma_iavh, area_ha, area_m2) VALUES 
('Bosque Andino', 25.00, 250000),
('Valle del Cauca', 18.50, 185000),
('Bosque Seco Tropical', 12.30, 123000);

-- Insertar zonificaciones POMCA
INSERT INTO sgs_amb_zonificacion_pomca (categoria_zonificacion, area_ha) VALUES 
('Zona de Protección', 20.00),
('Zona de Recuperación', 15.50),
('Zona de Producción Sostenible', 30.00);

-- Insertar zonificaciones RFP
INSERT INTO sgs_amb_zonificacion_rfp (categoria_zonificacion, area_ha, objectid, sector_cod, complejo_nombre, distrito_nombre, complejo_codigo, distrito_codigo) VALUES 
('Zona A', 10.00, 'OBJ001', 'SEC01', 'Complejo A', 'Distrito 1', 'C001', 'D001'),
('Zona B', 8.50, 'OBJ002', 'SEC02', 'Complejo B', 'Distrito 2', 'C002', 'D002');

-- Insertar páramos
INSERT INTO sgs_amb_paramos (nombre_paramo, complejo_codigo, complejo_nombre, area_ha) VALUES 
('Páramo El Buey', 'PB-001', 'Complejo El Buey', 12.00),
('Páramo Las Hermosas', 'PB-002', 'Complejo Las Hermosas', 8.50);

-- Insertar vías
INSERT INTO sgs_inf_via (tipo_via, estado_superficie, numero_carriles, accesibilidad, id_municipio) VALUES 
('primaria', 'pavimento', 4, 'Vehicular y peatonal', 1),
('secundaria', 'afirmado', 2, 'Vehicular', 1),
('terciaria', 'tierra', 1, 'Rural', 2);

-- Insertar predios
INSERT INTO sgs_pre_predio (nombre_predio, area_ha, cedula_catastral, cedula_ant, longitud_centroide, latitud_centroide, nucleo_predial, observaciones, perimetro, id_propietario, id_vereda) VALUES 
('Finca El Edén', 50.50, '123-456-789', 'ANT-001', 3.4512, -76.5321, 'NUC-001', 'Predio en conservación', 850.00, 1, 1),
('Finca El Porvenir', 35.25, '234-567-890', 'ANT-002', 3.4200, -76.5100, 'NUC-002', 'Predio con obras de captación', 620.50, 2, 2),
('Finca La Cabaña', 28.75, '345-678-901', 'ANT-003', 3.4000, -76.4800, 'NUC-003', 'Predio en zonificación RFP', 540.30, 3, 3);

-- Insertar relaciones Predio-Cobertura
INSERT INTO sgs_rel_predio_cobertura (id_predio, id_cobertura, area_ha_parcial) VALUES 
(1, 1, 25.00),
(1, 2, 15.50),
(1, 3, 10.00),
(2, 1, 20.25),
(2, 2, 15.00);

-- Insertar relaciones Predio-Bioma
INSERT INTO sgs_rel_predio_bioma (id_predio, id_bioma) VALUES 
(1, 1),
(1, 2),
(2, 1);

-- Insertar relaciones Predio-Zonificacion POMCA
INSERT INTO sgs_rel_predio_zonificacion_pomca (id_predio, id_zonificacion_pomca) VALUES 
(1, 1),
(1, 2),
(2, 2);

-- Insertar relaciones Predio-Zonificacion RFP
INSERT INTO sgs_rel_predio_zonificacion_rfp (id_predio, id_zonificacion_rfp) VALUES 
(1, 1),
(3, 2);

-- Insertar relaciones Predio-Páramos
INSERT INTO sgs_rel_predio_paramos (id_predio, id_paramos) VALUES 
(1, 1),
(2, 2);

-- Insertar propuestas
INSERT INTO sgs_pro_propuesta (tipo, actividad, id_predio, id_quebrada, id_accion) VALUES 
('linea', 'Cerca viva', 1, 1, 1),
('poligono', 'Silvopastoril', 1, 2, 2),
('punto', 'Obra de captación', 1, 1, 3),
('punto', 'Estación limnimétrica', 1, 1, 4);

-- Insertar propuestas línea
INSERT INTO sgs_pro_propuesta_linea (actividad, longitud_m, longitud_km, id_propuesta) VALUES 
('Cerca viva', 150.50, 0.150, 1);

-- Insertar propuestas polígono
INSERT INTO sgs_pro_propuesta_poligono (actividad, area_ha, area_m2, id_propuesta) VALUES 
('Silvopastoril', 12.50, 125000, 2);

-- Insertar propuestas punto
INSERT INTO sgs_pro_propuesta_punto (actividad, este, norte, descripcion, tipo_punto, tipo_obra, estructura_anclaje, nivel_complejidad, id_estacion_original, cod_tipo, codigo_caj, id_propuesta, id_quebrada) VALUES 
('Captación de agua', 123456.78, 987654.32, 'Obra tipo 1 en quebrada', 'obra_captacion', 1, TRUE, 'Medio', 'N/A', 'TIPO-01', 'CAJ-001', 3, 1),
('Estación de monitoreo', 123500.00, 987700.00, 'Estación en quebrada', 'estacion_limnimetrica', 1, TRUE, 'Alto', 'EST-001', 'TIPO-02', 'CAJ-002', 4, 1);

-- Insertar relaciones Propuesta Punto-Usuario
INSERT INTO sgs_rel_propuesta_punto_usuario (id_prop_punto, id_usuario) VALUES 
(1, 1),
(1, 2),
(2, 1),
(2, 3);


-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================