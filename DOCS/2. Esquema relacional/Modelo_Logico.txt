-- ============================================================
-- MODELO LÓGICO RELACIONAL - CONVENIO CAR WWF FN
-- ============================================================
-- 
-- PROYECTO:    Convenio CAR - WWF -Fundación Natura
-- OBJETIVO:    Modelo lógico de base de datos para la gestión de predios,
--              propuestas de conservación, obras hidráulicas, monitoreo
--              y beneficiarios en el marco del convenio.
-- 
-- AUTOR:       NIKOLL Tatiana Ordoñez Diaz
-- FECHA:       2025-06-22
-- VERSIÓN:     1.0 (Final)
-- MOTOR:       PostgreSQL (compatible con MySQL, SQL Server, Oracle)
-- 
-- DESCRIPCIÓN:
--   Este script contiene la estructura completa de la base de datos,
--   incluyendo tablas, relaciones, restricciones de integridad
--   referencial e índices para optimización de consultas.
-- 
-- NOTA:        El script está organizado por secciones lógicas para
--              facilitar su lectura y mantenimiento.
-- ============================================================


-- ============================================================
-- 1. TABLAS BASE
-- ============================================================

CREATE TABLE propietario (
    id_propietario SERIAL NOT NULL,
    nombre_razon_social VARCHAR(255) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    PRIMARY KEY (id_propietario)
);

CREATE TABLE municipio (
    id_municipio SERIAL NOT NULL,
    nombre_municipio VARCHAR(255) NOT NULL,
    codigo_administrativo VARCHAR(50) NOT NULL,
    departamento VARCHAR(100) NOT NULL,
    PRIMARY KEY (id_municipio)
);

CREATE TABLE vereda (
    id_vereda SERIAL NOT NULL,
    nombre_vereda VARCHAR(255) NOT NULL,
    codigo_administrativo VARCHAR(50) NOT NULL,
    poblacion_estimada INTEGER NOT NULL,
    id_municipio INTEGER NOT NULL,
    PRIMARY KEY (id_vereda)
);

CREATE TABLE via (
    id_via SERIAL NOT NULL,
    tipo_via VARCHAR(20) NOT NULL CHECK (tipo_via IN ('primaria', 'secundaria', 'terciaria')),
    estado_superficie VARCHAR(20) NOT NULL CHECK (estado_superficie IN ('pavimento', 'afirmado', 'tierra')),
    numero_carriles INTEGER NOT NULL,
    accesibilidad VARCHAR(255) NOT NULL,
    id_municipio INTEGER NOT NULL,
    PRIMARY KEY (id_via)
);

CREATE TABLE drenaje_simple (
    id_drenaje_simple SERIAL NOT NULL,
    estado_drenaje VARCHAR(50) NOT NULL,
    nombre_geografico VARCHAR(255) NOT NULL,
    id_municipio INTEGER NOT NULL,
    PRIMARY KEY (id_drenaje_simple)
);

CREATE TABLE drenaje_doble (
    id_drenaje_doble SERIAL NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    nombre_geografico VARCHAR(255) NOT NULL,
    id_municipio INTEGER NOT NULL,
    PRIMARY KEY (id_drenaje_doble)
);

CREATE TABLE cobertura_clc (
    id_cobertura SERIAL NOT NULL,
    codigo_clc_nivel3 VARCHAR(20) NOT NULL,
    nombre_cobertura VARCHAR(255) NOT NULL,
    area_ha DECIMAL(12,2) NOT NULL,
    area_m2 DECIMAL(15,2) NOT NULL,
    estado_naturalidad VARCHAR(30) NOT NULL CHECK (estado_naturalidad IN ('natural', 'seminatural', 'transformado')),
    año_interpretacion INTEGER NOT NULL,
    label VARCHAR(255) NOT NULL,
    PRIMARY KEY (id_cobertura)
);

CREATE TABLE bioma (
    id_bioma SERIAL NOT NULL,
    bioma_iavh VARCHAR(255) NOT NULL,
    area_ha DECIMAL(12,2) NOT NULL,
    area_m2 DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (id_bioma)
);

CREATE TABLE zonificacion_pomca (
    id_zonificacion_pomca SERIAL NOT NULL,
    categoria_zonificacion VARCHAR(255) NOT NULL,
    area_ha DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (id_zonificacion_pomca)
);

CREATE TABLE zonificacion_rfp (
    id_zonificacion_rfp SERIAL NOT NULL,
    categoria_zonificacion VARCHAR(255) NOT NULL,
    area_ha DECIMAL(12,2) NOT NULL,
    objectid VARCHAR(50) NOT NULL,
    sector_cod VARCHAR(50) NOT NULL,
    complejo_nombre VARCHAR(255) NOT NULL,
    distrito_nombre VARCHAR(255) NOT NULL,
    complejo_codigo VARCHAR(50) NOT NULL,
    distrito_codigo VARCHAR(50) NOT NULL,
    PRIMARY KEY (id_zonificacion_rfp)
);

CREATE TABLE paramos (
    id_paramos SERIAL NOT NULL,
    nombre_paramo VARCHAR(255) NOT NULL,
    complejo_codigo VARCHAR(50) NOT NULL,
    complejo_nombre VARCHAR(255) NOT NULL,
    area_ha DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (id_paramos)
);

CREATE TABLE microcuenca (
    id_microcuenca SERIAL NOT NULL,
    nombre_microcuenca VARCHAR(255) NOT NULL,
    area DECIMAL(12,2) NOT NULL,
    codigo VARCHAR(50) NOT NULL,
    latitud DECIMAL(12,6) NOT NULL,
    longitud DECIMAL(12,6) NOT NULL,
    nombre_usuarios VARCHAR(255) NOT NULL,
    PRIMARY KEY (id_microcuenca)
);

CREATE TABLE quebrada (
    id_quebrada SERIAL NOT NULL,
    nombre_quebrada VARCHAR(255) NOT NULL,
    area DECIMAL(12,2) NOT NULL,
    latitud DECIMAL(12,6) NOT NULL,
    longitud DECIMAL(12,6) NOT NULL,
    nombre_usuarios VARCHAR(255) NOT NULL,
    id_municipio INTEGER NOT NULL,
    id_microcuenca INTEGER NOT NULL,
    PRIMARY KEY (id_quebrada)
);

CREATE TABLE usuario (
    id_usuario SERIAL NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    vereda VARCHAR(255) NOT NULL,
    municipio VARCHAR(255) NOT NULL,
    PRIMARY KEY (id_usuario)
);

CREATE TABLE componente (
    id_componente SERIAL NOT NULL,
    nombre VARCHAR(2) NOT NULL CHECK (nombre IN ('C1', 'C2', 'C3')),
    PRIMARY KEY (id_componente)
);

CREATE TABLE accion (
    id_accion SERIAL NOT NULL,
    nombre VARCHAR(2) NOT NULL CHECK (nombre IN ('A1', 'A2')),
    id_componente INTEGER NOT NULL,
    PRIMARY KEY (id_accion)
);

-- ============================================================
-- 2. TABLA PREDIO (SIN FKs a zonificaciones y paramos)
-- ============================================================

CREATE TABLE predio (
    id_predio SERIAL NOT NULL,
    nombre_predio VARCHAR(255) NOT NULL,
    area_ha DECIMAL(12,2) NOT NULL,
    cedula_catastral VARCHAR(50) NOT NULL,
    cedula_ant VARCHAR(50) NOT NULL,
    longitud_centroide DECIMAL(12,6) NOT NULL,
    latitud_centroide DECIMAL(12,6) NOT NULL,
    nucleo_predial VARCHAR(255) NOT NULL,
    observaciones TEXT NOT NULL,
    perimetro DECIMAL(12,2) NOT NULL,
    id_propietario INTEGER NOT NULL,
    id_vereda INTEGER NOT NULL,
    PRIMARY KEY (id_predio)
);

-- ============================================================
-- 3. TABLAS PUENTE DE PREDIO (TODAS LAS RELACIONES N:N)
-- ============================================================

-- PREDIO ↔ COBERTURA_CLC (N:N)
CREATE TABLE predio_cobertura (
    id_predio INTEGER NOT NULL,
    id_cobertura INTEGER NOT NULL,
    area_ha_parcial DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (id_predio, id_cobertura)
);

-- PREDIO ↔ BIOMA (N:N)
CREATE TABLE predio_bioma (
    id_predio INTEGER NOT NULL,
    id_bioma INTEGER NOT NULL,
    PRIMARY KEY (id_predio, id_bioma)
);

-- PREDIO ↔ ZONIFICACION_POMCA (N:N) - NUEVA
CREATE TABLE predio_zonificacion_pomca (
    id_predio INTEGER NOT NULL,
    id_zonificacion_pomca INTEGER NOT NULL,
    PRIMARY KEY (id_predio, id_zonificacion_pomca)
);

-- PREDIO ↔ ZONIFICACION_RFP (N:N) - NUEVA
CREATE TABLE predio_zonificacion_rfp (
    id_predio INTEGER NOT NULL,
    id_zonificacion_rfp INTEGER NOT NULL,
    PRIMARY KEY (id_predio, id_zonificacion_rfp)
);

-- PREDIO ↔ PARAMOS (N:N) - NUEVA
CREATE TABLE predio_paramos (
    id_predio INTEGER NOT NULL,
    id_paramos INTEGER NOT NULL,
    PRIMARY KEY (id_predio, id_paramos)
);

-- ============================================================
-- 4. PROPUESTAS Y SUBTIPOS
-- ============================================================

CREATE TABLE propuesta (
    id_propuesta SERIAL NOT NULL,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('linea', 'poligono', 'punto')),
    actividad TEXT NOT NULL,
    id_predio INTEGER NOT NULL,
    id_quebrada INTEGER NOT NULL,
    id_accion INTEGER NOT NULL,
    PRIMARY KEY (id_propuesta)
);

CREATE TABLE propuesta_linea (
    id_prop_linea SERIAL NOT NULL,
    actividad VARCHAR(255) NOT NULL,
    longitud_m DECIMAL(12,2) NOT NULL,
    longitud_km DECIMAL(12,2) NOT NULL,
    id_propuesta INTEGER NOT NULL UNIQUE,
    PRIMARY KEY (id_prop_linea)
);

CREATE TABLE propuesta_poligono (
    id_prop_poligono SERIAL NOT NULL,
    actividad VARCHAR(255) NOT NULL,
    area_ha DECIMAL(12,2) NOT NULL,
    area_m2 DECIMAL(12,2) NOT NULL,
    id_propuesta INTEGER NOT NULL UNIQUE,
    PRIMARY KEY (id_prop_poligono)
);

CREATE TABLE propuesta_punto (
    id_prop_punto SERIAL NOT NULL,
    actividad VARCHAR(255) NOT NULL,
    este DECIMAL(12,6) NOT NULL,
    norte DECIMAL(12,6) NOT NULL,
    descripcion TEXT NOT NULL,
    tipo_punto VARCHAR(30) NOT NULL CHECK (tipo_punto IN ('obra_captacion', 'estacion_limnimetrica', 'bebedero', 'tanque', 'panel_solar')),
    tipo_obra INTEGER NOT NULL CHECK (tipo_obra IN (1, 2, 3)),
    estructura_anclaje BOOLEAN NOT NULL,
    nivel_complejidad VARCHAR(50) NOT NULL,
    id_estacion_original VARCHAR(50) NOT NULL,
    cod_tipo VARCHAR(50) NOT NULL,
    codigo_caj VARCHAR(50) NOT NULL,
    id_propuesta INTEGER NOT NULL UNIQUE,
    id_quebrada INTEGER NOT NULL,
    PRIMARY KEY (id_prop_punto)
);

-- ============================================================
-- 5. TABLA PUENTE PROPUESTA_PUNTO → USUARIO
-- ============================================================

CREATE TABLE propuesta_punto_usuario (
    id_prop_punto INTEGER NOT NULL,
    id_usuario INTEGER NOT NULL,
    PRIMARY KEY (id_prop_punto, id_usuario)
);

-- ============================================================
-- 6. RESTRICCIONES DE INTEGRIDAD REFERENCIAL
-- ============================================================

ALTER TABLE vereda ADD CONSTRAINT fk_vereda_id_municipio FOREIGN KEY (id_municipio) REFERENCES municipio (id_municipio);
ALTER TABLE via ADD CONSTRAINT fk_via_id_municipio FOREIGN KEY (id_municipio) REFERENCES municipio (id_municipio);
ALTER TABLE drenaje_simple ADD CONSTRAINT fk_drenaje_simple_id_municipio FOREIGN KEY (id_municipio) REFERENCES municipio (id_municipio);
ALTER TABLE drenaje_doble ADD CONSTRAINT fk_drenaje_doble_id_municipio FOREIGN KEY (id_municipio) REFERENCES municipio (id_municipio);
ALTER TABLE quebrada ADD CONSTRAINT fk_quebrada_id_municipio FOREIGN KEY (id_municipio) REFERENCES municipio (id_municipio);
ALTER TABLE quebrada ADD CONSTRAINT fk_quebrada_id_microcuenca FOREIGN KEY (id_microcuenca) REFERENCES microcuenca (id_microcuenca);
ALTER TABLE predio ADD CONSTRAINT fk_predio_id_propietario FOREIGN KEY (id_propietario) REFERENCES propietario (id_propietario);
ALTER TABLE predio ADD CONSTRAINT fk_predio_id_vereda FOREIGN KEY (id_vereda) REFERENCES vereda (id_vereda);
ALTER TABLE accion ADD CONSTRAINT fk_accion_id_componente FOREIGN KEY (id_componente) REFERENCES componente (id_componente);
ALTER TABLE propuesta ADD CONSTRAINT fk_propuesta_id_predio FOREIGN KEY (id_predio) REFERENCES predio (id_predio);
ALTER TABLE propuesta ADD CONSTRAINT fk_propuesta_id_quebrada FOREIGN KEY (id_quebrada) REFERENCES quebrada (id_quebrada);
ALTER TABLE propuesta ADD CONSTRAINT fk_propuesta_id_accion FOREIGN KEY (id_accion) REFERENCES accion (id_accion);
ALTER TABLE propuesta_linea ADD CONSTRAINT fk_propuesta_linea_id_propuesta FOREIGN KEY (id_propuesta) REFERENCES propuesta (id_propuesta);
ALTER TABLE propuesta_poligono ADD CONSTRAINT fk_propuesta_poligono_id_propuesta FOREIGN KEY (id_propuesta) REFERENCES propuesta (id_propuesta);
ALTER TABLE propuesta_punto ADD CONSTRAINT fk_propuesta_punto_id_propuesta FOREIGN KEY (id_propuesta) REFERENCES propuesta (id_propuesta);
ALTER TABLE propuesta_punto ADD CONSTRAINT fk_propuesta_punto_id_quebrada FOREIGN KEY (id_quebrada) REFERENCES quebrada (id_quebrada);
ALTER TABLE predio_cobertura ADD CONSTRAINT fk_predio_cobertura_id_predio FOREIGN KEY (id_predio) REFERENCES predio (id_predio);
ALTER TABLE predio_cobertura ADD CONSTRAINT fk_predio_cobertura_id_cobertura FOREIGN KEY (id_cobertura) REFERENCES cobertura_clc (id_cobertura);
ALTER TABLE predio_bioma ADD CONSTRAINT fk_predio_bioma_id_predio FOREIGN KEY (id_predio) REFERENCES predio (id_predio);
ALTER TABLE predio_bioma ADD CONSTRAINT fk_predio_bioma_id_bioma FOREIGN KEY (id_bioma) REFERENCES bioma (id_bioma);
ALTER TABLE predio_zonificacion_pomca ADD CONSTRAINT fk_predio_zon_pomca_id_predio FOREIGN KEY (id_predio) REFERENCES predio (id_predio);
ALTER TABLE predio_zonificacion_pomca ADD CONSTRAINT fk_predio_zon_pomca_id_zon FOREIGN KEY (id_zonificacion_pomca) REFERENCES zonificacion_pomca (id_zonificacion_pomca);
ALTER TABLE predio_zonificacion_rfp ADD CONSTRAINT fk_predio_zon_rfp_id_predio FOREIGN KEY (id_predio) REFERENCES predio (id_predio);
ALTER TABLE predio_zonificacion_rfp ADD CONSTRAINT fk_predio_zon_rfp_id_zon FOREIGN KEY (id_zonificacion_rfp) REFERENCES zonificacion_rfp (id_zonificacion_rfp);
ALTER TABLE predio_paramos ADD CONSTRAINT fk_predio_paramos_id_predio FOREIGN KEY (id_predio) REFERENCES predio (id_predio);
ALTER TABLE predio_paramos ADD CONSTRAINT fk_predio_paramos_id_paramos FOREIGN KEY (id_paramos) REFERENCES paramos (id_paramos);
ALTER TABLE propuesta_punto_usuario ADD CONSTRAINT fk_prop_punto_usuario_id_punto FOREIGN KEY (id_prop_punto) REFERENCES propuesta_punto (id_prop_punto);
ALTER TABLE propuesta_punto_usuario ADD CONSTRAINT fk_prop_punto_usuario_id_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario);

-- ============================================================
-- 7. ÍNDICES
-- ============================================================

CREATE INDEX idx_vereda_id_municipio ON vereda (id_municipio);
CREATE INDEX idx_via_id_municipio ON via (id_municipio);
CREATE INDEX idx_drenaje_simple_id_municipio ON drenaje_simple (id_municipio);
CREATE INDEX idx_drenaje_doble_id_municipio ON drenaje_doble (id_municipio);
CREATE INDEX idx_quebrada_id_municipio ON quebrada (id_municipio);
CREATE INDEX idx_quebrada_id_microcuenca ON quebrada (id_microcuenca);
CREATE INDEX idx_predio_id_propietario ON predio (id_propietario);
CREATE INDEX idx_predio_id_vereda ON predio (id_vereda);
CREATE INDEX idx_accion_id_componente ON accion (id_componente);
CREATE INDEX idx_propuesta_id_predio ON propuesta (id_predio);
CREATE INDEX idx_propuesta_id_quebrada ON propuesta (id_quebrada);
CREATE INDEX idx_propuesta_id_accion ON propuesta (id_accion);
CREATE INDEX idx_propuesta_punto_id_quebrada ON propuesta_punto (id_quebrada);
CREATE INDEX idx_propuesta_punto_tipo_punto ON propuesta_punto (tipo_punto);
CREATE INDEX idx_predio_cobertura_id_predio ON predio_cobertura (id_predio);
CREATE INDEX idx_predio_cobertura_id_cobertura ON predio_cobertura (id_cobertura);
CREATE INDEX idx_predio_bioma_id_predio ON predio_bioma (id_predio);
CREATE INDEX idx_predio_bioma_id_bioma ON predio_bioma (id_bioma);
CREATE INDEX idx_predio_zon_pomca_id_predio ON predio_zonificacion_pomca (id_predio);
CREATE INDEX idx_predio_zon_pomca_id_zon ON predio_zonificacion_pomca (id_zonificacion_pomca);
CREATE INDEX idx_predio_zon_rfp_id_predio ON predio_zonificacion_rfp (id_predio);
CREATE INDEX idx_predio_zon_rfp_id_zon ON predio_zonificacion_rfp (id_zonificacion_rfp);
CREATE INDEX idx_predio_paramos_id_predio ON predio_paramos (id_predio);
CREATE INDEX idx_predio_paramos_id_paramos ON predio_paramos (id_paramos);

-- ============================================================
-- FIN DEL MODELO
-- ============================================================