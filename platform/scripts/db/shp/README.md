# Carga de Shapefiles al convenio CAR-WWF-FN

Procedimiento para cargar los 9 shapefiles geográficos del cliente al schema PostGIS,
reproyectando a SRID 4686 (MAGNA-SIRGAS geográfico).

## Archivos fuente (input)

Los shapefiles están en el repo del cliente, NO versionados en este repo:
`DOCS/6. Script SQL (Implementación)/Datos prueba/Datos_Prueba/Datos_Prueba/`

| Shapefile                  | Tabla target              | SRID origen       | EPSG origen | Registros |
|----------------------------|---------------------------|-------------------|-------------|-----------|
| bcs_lpa_municipio_C1A1     | bcs_lpa_municipio         | MAGNA_Colombia_CTM12 | **9377**  | 3         |
| bcs_lpa_vereda_C1_A1       | bcs_lpa_vereda            | WGS_Web_Mercator  | 3857        | 23        |
| sgs_amb_bioma              | sgs_amb_bioma             | GCS_MAGNA (geo)   | 4686        | 70        |
| sgs_amb_cobertura_clc      | sgs_amb_cobertura_clc     | WGS_UTM_18N       | 32618       | 35        |
| sgs_pre_predio             | sgs_pre_predio            | MAGNA_Colombia_CTM12 | **9377**  | 1         |
| sgs_inf_via                | sgs_inf_via               | MAGNA_Colombia_Bogota | 3116    | 2295      |
| sgs_inf_drenaje_simple     | sgs_inf_drenaje_simple    | MAGNA_Colombia_Bogota | 3116    | 2985      |
| sgs_inf_drenaje_doble      | sgs_inf_drenaje_doble     | MAGNA_Colombia_Bogota | 3116    | 27        |
| sgs_pro_propuesta_linea    | sgs_pro_propuesta_linea   | MAGNA_Colombia_CTM12 | **9377**  | 141       |

> ⚠️ **EPSG:3116 NO es MAGNA CTM12** (es la zona regional Bogota con parámetros distintos).
> El EPSG correcto para CTM12/Origen-Nacional es **EPSG:9377** (puede no venir preinstalado en
> el contenedor PostGIS — ver paso 0).

## Procedimiento

### 0. (Una sola vez) Registrar SRID 9377 en `spatial_ref_sys`

```powershell
docker exec terrasight-db psql -U terrasight -d convenio_car_wwf -f platform\scripts\db\shp\add-9377.sql
```

### 1. Reiniciar BD (opcional, si hay datos residuales)

```powershell
docker exec terrasight-db psql -U terrasight -d convenio_car_wwf -f platform\scripts\db\init\00-truncate.sql
docker exec terrasight-db psql -U terrasight -d convenio_car_wwf -f platform\scripts\db\init\02-datos-ejemplo.sql
```

### 2. Copiar shapefiles al contenedor y cargarlos a staging

```powershell
# 2a. Copiar todos los componentes del shapefile (.shp .shx .dbf .prj .cpg) al contenedor
docker exec terrasight-db mkdir -p /tmp/shp
$src = "<ruta local>\Datos prueba\Datos_Prueba\Datos_Prueba"
foreach ($f in Get-ChildItem "$src\*.shp", "$src\*.shx", "$src\*.dbf", "$src\*.prj", "$src\*.cpg") {
  docker cp $f.FullName "terrasight-db:/tmp/shp/$($f.Name)"
}

# 2b. shp2pgsql con SRIDs correctos -> tablas stg_*
docker exec terrasight-db bash /tmp/reload-stg.sh
```

### 3. UPSERT de tablas con match por atributo (municipio/vereda/bioma/cobertura)

```powershell
docker exec terrasight-db psql -U terrasight -d convenio_car_wwf -v ON_ERROR_STOP=1 `
  -f platform\scripts\db\shp\01-upsert-referencias.sql
```

### 4. INSERT de infraestructura (vías/drenajes) + propuesta_linea

```powershell
docker exec terrasight-db psql -U terrasight -d convenio_car_wwf -v ON_ERROR_STOP=1 `
  -f platform\scripts\db\shp\02-upsert-infra.sql
```

### 5. Limpieza

```powershell
docker exec terrasight-db psql -U terrasight -d convenio_car_wwf -c "DROP TABLE IF EXISTS public.stg_* CASCADE;"
```

## Notas de diseño

### Mapeo de códigos CUD IGAC (vías)

Los shapefiles del cliente usan **CUD (Códigos Únicos de Dominio)** IGAC en vez de strings:

| Campo DBF     | CUD   | Mapeo                       |
|---------------|-------|------------------------------|
| estado_sup    | 3301  | pavimento                    |
| estado_sup    | 3306  | afirmado                     |
| estado_sup    | 3350  | tierra                       |
| estado_sup    | "Sin Valor" | afirmado (default)    |
| numero_car    | 3501  | 1 carril                     |
| numero_car    | 3502  | 2 carriles                   |
| accesibili    | 3600  | Vehicular alta capacidad     |
| accesibili    | 3601  | Vehicular                    |
| estado_dre    | 5101  | Inactivo                     |
| estado_dre    | 5102  | Activo                       |

### Asignación espacial de `id_municipio`

Para shapes sin atributo de municipio (vías/drenajes/propuestas):
1. Intentar `ST_Intersects(shape.geom, municipio.geom)` — si intersecta, asignar ese municipio.
2. Si no, asignar el municipio con `ST_Distance` mínimo (vecino más cercano).
3. Si todo falla, default al primer municipio cargado.

### Migración de schema

Las tablas `sgs_amb_bioma`, `sgs_amb_cobertura_clc`, `sgs_amb_zonificacion_pomca`,
`sgs_amb_zonificacion_rfp`, `sgs_amb_paramos` **no tenían columna geom** en el schema original.
Se agregaron con `ALTER TABLE ... ADD COLUMN IF NOT EXISTS geom GEOMETRY(MULTIPOLYGON, 4686)` en
el script 01-upsert-referencias.sql.

### Drenaje doble: geometría inconsistente

`sgs_inf_drenaje_doble.shp` viene como **MultiPolygon** (probablemente el área entre dos
líneas paralelas). El schema espera `MultiLineString`. Se convierte con
`ST_Boundary(geom)`.

### Resultado de la carga (post-carga)

| Tabla                     | Registros | Con geom |
|---------------------------|-----------|----------|
| bcs_lpa_municipio         | 10        | 3        |
| bcs_lpa_vereda            | 33        | 20       |
| sgs_amb_bioma             | 76        | 70       |
| sgs_amb_cobertura_clc     | 45        | 35       |
| sgs_pre_predio            | 11        | 1        |
| sgs_inf_via               | 2303      | 2295     |
| sgs_inf_drenaje_simple    | 2993      | 2985     |
| sgs_inf_drenaje_doble     | 33        | 27       |
| sgs_pro_propuesta_linea   | 144       | 141      |

**Total: 27 tablas, ~6083 registros, 5581 con geometría.**