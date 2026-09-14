# MODELO DE DATOS — Base Geográfica (BDG) del Convenio 3038-2024

> Diccionario de las variables ambientales, territoriales y prediales
> (objetivo específico 1). Generado desde el esquema real de la BD (PostGIS).
>
> - **Fuente:** GDB del cliente (SIG_CAR_WWF_FN) importada a PostgreSQL/PostGIS.
> - **SRID:** 4686 (MAGNA-SIRGAS) para geometrías; coordenadas geográficas en 4326.
> - **Fuente única de indicadores:** vistas `sgs_v_indicador_propuesta` y
>   `sgs_v_indicador_global` (migración 36).
> - **Convención:** `bcs_*` cartografía base · `sgs_pre_*` predios ·
>   `sgs_pro_*` propuestas · `sgs_com_*` componentes · `sgs_amb_*` ambiental ·
>   `sgs_inf_*` infraestructura · `sgs_rel_*` relaciones · `sgs_ind_*` indicadores ·
>   `sgs_adm_*` administración.

## Vistas (indicadores)
- `sgs_v_indicador_global`
- `sgs_v_indicador_propuesta`

## Límites político-administrativos

_Municipios y veredas (geometría SRID 4686). Incluye la localidad de Usme vía el municipio de Bogotá._

### `bcs_lpa_municipio`
- id_municipio · integer
- nombre_municipio · character varying
- codigo_administrativo · character varying
- departamento · character varying
- geom · USER-DEFINED
- created_at · timestamp with time zone
- updated_at · timestamp with time zone

### `bcs_lpa_vereda`
- id_vereda · integer
- nombre_vereda · character varying
- codigo_administrativo · character varying
- poblacion_estimada · integer
- id_municipio · integer
- geom · USER-DEFINED
- created_at · timestamp with time zone
- updated_at · timestamp with time zone

## Hidrografía base

_Microcuencas y quebradas._

### `bcs_dh_microcuenca`
- id_microcuenca · integer
- nombre_microcuenca · character varying
- area · numeric
- codigo · character varying
- latitud · numeric
- longitud · numeric
- nombre_usuarios · character varying
- geom · USER-DEFINED
- created_at · timestamp with time zone
- updated_at · timestamp with time zone

### `bcs_dh_quebrada`
- id_quebrada · integer
- nombre_quebrada · character varying
- area · numeric
- latitud · numeric
- longitud · numeric
- nombre_usuarios · character varying
- id_municipio · integer
- id_microcuenca · integer
- geom · USER-DEFINED

## Predios (núcleo del convenio)

_Predios concertados, propietarios y usuarios/beneficiarios._

### `sgs_pre_predio`
- id_predio · integer
- nombre_predio · character varying
- area_ha · numeric
- cedula_catastral · character varying
- cedula_ant · character varying
- longitud_centroide · numeric
- latitud_centroide · numeric
- nucleo_predial · character varying
- observaciones · text
- perimetro · numeric
- id_propietario · integer
- id_vereda · integer
- geom · USER-DEFINED

### `sgs_pre_propietario`
- id_propietario · integer
- nombre_razon_social · character varying
- telefono · character varying
- created_at · timestamp with time zone
- updated_at · timestamp with time zone

### `sgs_pre_usuario`
- id_usuario · integer
- nombre · character varying
- telefono · character varying
- vereda · character varying
- municipio · character varying
- created_at · timestamp with time zone
- updated_at · timestamp with time zone

## Intervenciones / Propuestas

_Propuesta súper + punto/línea/polígono + avance + historial de estado._

### `sgs_pro_estado_historial`
- id_historial · integer
- id_propuesta · integer
- estado_anterior · character varying
- estado_nuevo · character varying
- usuario · character varying
- rol · character varying
- comentario · text
- created_at · timestamp with time zone

### `sgs_pro_propuesta`
- id_propuesta · integer
- tipo · character varying
- actividad · text
- id_predio · integer
- id_quebrada · integer
- id_accion · integer
- estado · character varying

### `sgs_pro_propuesta_avance`
- id_avance · bigint
- id_propuesta · integer
- avance_pct · integer
- nota · text
- id_usuario · integer
- created_at · timestamp with time zone
- es_backfill · boolean

### `sgs_pro_propuesta_linea`
- id_prop_linea · integer
- actividad · character varying
- longitud_m · numeric
- longitud_km · numeric
- id_propuesta · integer
- geom · USER-DEFINED
- id_predio · integer

### `sgs_pro_propuesta_poligono`
- id_prop_poligono · integer
- actividad · character varying
- area_ha · numeric
- area_m2 · numeric
- id_propuesta · integer
- geom · USER-DEFINED
- id_predio · integer

### `sgs_pro_propuesta_punto`
- id_prop_punto · integer
- actividad · character varying
- este · numeric
- norte · numeric
- descripcion · text
- tipo_punto · character varying
- tipo_obra · integer
- estructura_anclaje · boolean
- nivel_complejidad · character varying
- id_estacion_original · character varying
- cod_tipo · character varying
- codigo_caj · character varying
- id_propuesta · integer
- id_quebrada · integer
- created_at · timestamp with time zone
- updated_at · timestamp with time zone
- id_predio · integer
- geom · USER-DEFINED

## Componentes y acciones

_C1/C2/C3 × A1/A2 (y U). Base de la clasificación de intervenciones._

### `sgs_com_accion`
- id_accion · integer
- nombre · character varying
- id_componente · integer
- created_at · timestamp with time zone
- updated_at · timestamp with time zone

### `sgs_com_componente`
- id_componente · integer
- nombre · character varying
- created_at · timestamp with time zone
- updated_at · timestamp with time zone

## Ambiental

_Coberturas CLC, biomas, páramos, zonificación POMCA/RFP y puntos de monitoreo._

### `sgs_amb_alerta`
- id_alerta · bigint
- tipo · character varying
- titulo · character varying
- descripcion · text
- fecha · timestamp with time zone
- estado · character varying
- id_usuario · integer
- id_propuesta · integer
- created_at · timestamp with time zone
- updated_at · timestamp with time zone

### `sgs_amb_bioma`
- id_bioma · integer
- bioma_iavh · character varying
- area_ha · numeric
- area_m2 · numeric

### `sgs_amb_cobertura_clc`
- id_cobertura · integer
- codigo_clc_nivel3 · character varying
- nombre_cobertura · character varying
- area_ha · numeric
- area_m2 · numeric
- estado_naturalidad · character varying
- año_interpretacion · integer
- label · character varying
- objectid_gdb · integer
- municipio_predio · character varying
- geom · USER-DEFINED

### `sgs_amb_paramos`
- id_paramos · integer
- nombre_paramo · character varying
- complejo_codigo · character varying
- complejo_nombre · character varying
- area_ha · numeric

### `sgs_amb_zonificacion_pomca`
- id_zonificacion_pomca · integer
- categoria_zonificacion · character varying
- area_ha · numeric
- objectid_gdb · integer
- codigo · character varying
- nomenclatura · character varying
- descripcion · character varying
- geom · USER-DEFINED

### `sgs_amb_zonificacion_rfp`
- id_zonificacion_rfp · integer
- categoria_zonificacion · character varying
- area_ha · numeric
- objectid · character varying
- sector_cod · character varying
- complejo_nombre · character varying
- distrito_nombre · character varying
- complejo_codigo · character varying
- distrito_codigo · character varying
- objectid_gdb · integer
- nombre · character varying
- sub_zonificacion · character varying
- geom · USER-DEFINED

## Infraestructura

_Vías y drenajes (simple/doble)._

### `sgs_inf_drenaje_doble`
- id_drenaje_doble · integer
- tipo · character varying
- nombre_geografico · character varying
- id_municipio · integer
- geom · USER-DEFINED

### `sgs_inf_drenaje_simple`
- id_drenaje_simple · integer
- estado_drenaje · character varying
- nombre_geografico · character varying
- id_municipio · integer
- geom · USER-DEFINED

### `sgs_inf_via`
- id_via · integer
- tipo_via · character varying
- estado_superficie · character varying
- numero_carriles · integer
- accesibilidad · character varying
- id_municipio · integer
- geom · USER-DEFINED

## Relaciones espaciales

_Junctions predio↔capa y propuesta-punto↔usuario (beneficiarios)._

### `sgs_rel_predio_bioma`
- id_predio · integer
- id_bioma · integer
- area_interseccion_ha · numeric
- porcentaje_predio · numeric
- geom · USER-DEFINED

### `sgs_rel_predio_cobertura`
- id_predio · integer
- id_cobertura · integer
- area_ha_parcial · numeric
- area_interseccion_ha · numeric
- porcentaje_predio · numeric
- geom · USER-DEFINED

### `sgs_rel_predio_paramos`
- id_predio · integer
- id_paramos · integer
- area_interseccion_ha · numeric
- porcentaje_predio · numeric
- geom · USER-DEFINED

### `sgs_rel_predio_zonificacion_pomca`
- id_predio · integer
- id_zonificacion_pomca · integer
- area_interseccion_ha · numeric
- porcentaje_predio · numeric
- geom · USER-DEFINED

### `sgs_rel_predio_zonificacion_rfp`
- id_predio · integer
- id_zonificacion_rfp · integer
- area_interseccion_ha · numeric
- porcentaje_predio · numeric
- geom · USER-DEFINED

### `sgs_rel_propuesta_punto_usuario`
- id_prop_punto · integer
- id_usuario · integer

## Indicadores Fase 6

_Agregados por predio y por municipio._

### `sgs_ind_ambiental_predio`
- id_predio · integer
- area_bosque_ha · numeric
- area_pastos_ha · numeric
- area_cultivos_ha · numeric
- area_vegetacion_secundaria_ha · numeric
- area_mosaico_ha · numeric
- area_urbana_ha · numeric
- area_otros_ha · numeric
- area_bioma_ha · numeric
- area_paramo_ha · numeric
- tipo_cobertura_predominante · character varying
- tipo_bioma_predominante · character varying

### `sgs_ind_hidrico_predio`
- id_predio · integer
- long_drenaje_m · numeric
- distancia_drenaje_m · numeric
- area_ronda_ha · numeric
- porc_ronda · numeric

### `sgs_ind_intervencion_predio`
- id_predio · integer
- num_propuestas_punto · integer
- num_propuestas_linea · integer
- num_propuestas_poligono · integer
- total_propuestas · integer
- area_intervenida_ha · numeric
- longitud_intervenida_m · numeric
- estado_predominante · character varying
- componente_predominante · character varying
- accion_predominante · character varying

### `sgs_ind_municipio`
- id_municipio · integer
- num_predios · integer
- area_total_ha · numeric
- area_bosque_ha · numeric
- area_pastos_ha · numeric
- area_cultivos_ha · numeric
- area_paramo_ha · numeric
- num_predios_paramo · integer
- num_intervenciones · integer
- area_restaurada_ha · numeric
- longitud_intervencion_m · numeric
- area_ronda_ha · numeric

### `sgs_ind_predio`
- id_predio · integer
- microcuenca · character varying
- num_coberturas · integer
- cobertura_principal · character varying
- bioma_principal · character varying
- porc_paramo · numeric
- categoria_pomca · character varying
- nombre_rfp · character varying

## Administración

_Usuarios, roles, auditoría, importaciones y snapshots de metas._

### `sgs_adm_auditoria_acceso`
- id_evento · bigint
- ocurrido_en · timestamp with time zone
- id_usuario · integer
- email_usado · character varying
- evento · character varying
- recurso · character varying
- ip · character varying
- user_agent · character varying
- exitoso · boolean
- detalle · text

### `sgs_adm_importacion`
- id_importacion · integer
- tipo_entidad · character varying
- nombre_archivo · character varying
- usuario · character varying
- estado · character varying
- total_filas · integer
- filas_exitosas · integer
- filas_con_error · integer
- comentario · text
- created_at · timestamp with time zone
- completed_at · timestamp with time zone

### `sgs_adm_importacion_error`
- id_error · integer
- id_importacion · integer
- fila · integer
- columna · character varying
- valor · text
- mensaje · text
- created_at · timestamp with time zone

### `sgs_adm_meta_comparacion`
- id_comparacion · integer
- id_snapshot_a · integer
- id_snapshot_b · integer
- diff · jsonb
- usuario · character varying
- created_at · timestamp with time zone

### `sgs_adm_meta_snapshot`
- id_snapshot · integer
- fecha_corte · date
- descripcion · character varying
- snapshot · jsonb
- usuario · character varying
- created_at · timestamp with time zone

### `sgs_adm_rol`
- id_rol · integer
- nombre · character varying
- descripcion · character varying

### `sgs_adm_usuario`
- id_usuario · integer
- email · character varying
- password_hash · text
- nombre · character varying
- id_rol · integer
- activo · boolean
- ultimo_acceso_en · timestamp with time zone
- creado_en · timestamp with time zone
- actualizado_en · timestamp with time zone
- intentos_fallidos · smallint
- bloqueado_hasta · timestamp with time zone

