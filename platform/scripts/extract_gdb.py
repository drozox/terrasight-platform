"""extract_gdb.py — extrae capas de la GDB del convenio CAR-WWF-FN a
Shapefile/CSV listos para importar a Supabase.

Pipeline:
  1. Lista capas de la GDB con pyogrio.
  2. Para cada capa en SCOPE:
     - Lee como GeoDataFrame.
     - Si tiene geometry: reprojecta de EPSG:9377 (CTM12) a EPSG:4686 (Bogota),
       dropea Z/M (la PG schema es 2D), escribe Shapefile.
     - Si no tiene geometry: escribe CSV.
  3. Loguea progreso + counts + errores.

Output: C:\\dev\\scratch\\gdb_export\\<layer>.{shp|csv}

Uso:
    py scripts/extract_gdb.py
    # o con output custom:
    py scripts/extract_gdb.py --out "D:\\otro\\path" --crs 4686
"""
import argparse
import os
import sys
import warnings
from pathlib import Path

# Forzar UTF-8 en stdout/stderr (PowerShell usa cp1252 por default y rompe con emojis).
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

# pyogrio loguea warnings de Measured geometry; los silenciamos porque ya los manejamos.
warnings.filterwarnings("ignore")

import pyogrio
from shapely import force_2d

GDB_DEFAULT = r"C:\Users\agFab\OneDrive\Documents\GitHub\TG-Nikoll\DOCS\03_GDB\03_GDB\SIG_CAR_WWF_FN.gdb"
OUT_DEFAULT = r"C:\dev\scratch\gdb_export"
TARGET_CRS_DEFAULT = 4686  # EPSG:4686 = MAGNA-SIRGAS / Colombia Bogota zone

# Capas a EXPORTAR (skip de las 31 que hay).
# - sgs_ind_*     : derivados de tesis F6, se regeneran aparte
# - sgs_pre_usuario : equivalente a sgs_adm_usuario del plataforma (naming distinto)
# - sgs_amb_alerta  : no existe en GDB (es demo del plataforma)
# - sgs_pro_propuesta_avance : no existe en GDB (es demo del plataforma)
# - bcs_dh_quebrada : no existe en GDB, el plataforma la crea vacía
SCOPE_KEEP = {
    # Catálogos base (parent, no geom)
    "bcs_lpa_municipio",
    "bcs_lpa_vereda",
    "bcs_dh_microcuenca",
    "sgs_com_componente",
    "sgs_com_accion",
    "sgs_pre_propietario",
    # Ambiente (parent, geom)
    "sgs_amb_cobertura_clc",
    "sgs_amb_bioma",
    "sgs_amb_paramos",
    "sgs_amb_zonificacion_pomca",
    "sgs_amb_zonificacion_rfp",
    # Predios + propuesta supertipo
    "sgs_pre_predio",
    "sgs_pro_propuesta",
    # Subtipos de propuesta (geom)
    "sgs_pro_propuesta_punto",
    "sgs_pro_propuesta_linea",
    "sgs_pro_propuesta_poligono",
    # Infraestructura
    "sgs_inf_via",
    "sgs_inf_drenaje_simple",
    "sgs_inf_drenaje_doble",
    # Relaciones many-to-many (FK only, sin geom en PG aunque la GDB tenga)
    "sgs_rel_predio_cobertura",
    "sgs_rel_predio_bioma",
    "sgs_rel_predio_zonificacion_pomca",
    "sgs_rel_predio_zonificacion_rfp",
    "sgs_rel_predio_paramos",
    "sgs_rel_propuesta_punto_usuario",
}

# Junction tables: la GDB les pone geometry (joined del predio). En PG son solo FK pairs.
# Para estas, dropeamos la geometría antes de exportar.
JUNCTION_TABLES = {
    "sgs_rel_predio_cobertura",
    "sgs_rel_predio_bioma",
    "sgs_rel_predio_zonificacion_pomca",
    "sgs_rel_predio_zonificacion_rfp",
    "sgs_rel_predio_paramos",
    "sgs_rel_propuesta_punto_usuario",
}

# Columnas OBJECTID y Shape_* de ESRI — no las queremos en el import (es metadata).
DROP_COLS_PREFIX = ("OBJECTID", "Shape_", "ORIG_FID", "FID_")


def normalize_cols(df):
    """Limpia columnas ESRI redundantes."""
    cols_to_drop = [c for c in df.columns if any(c.startswith(p) for p in DROP_COLS_PREFIX)]
    return df.drop(columns=cols_to_drop, errors="ignore")


def normalize_col_names(df):
    """Lowercase + trim + reemplazo de espacios y chars raros en nombres de columnas."""
    new_cols = {}
    for c in df.columns:
        new_c = c.strip().lower()
        new_c = new_c.replace(" ", "_").replace("-", "_").replace(".", "_")
        new_c = new_c.replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u").replace("ñ", "n")
        new_cols[c] = new_c
    return df.rename(columns=new_cols)


def has_geometry(df):
    """¿El DataFrame tiene columna geometry con datos espaciales?"""
    if "geometry" not in df.columns:
        return False
    geom = df.geometry
    if geom is None:
        return False
    # geopandas devuelve GeometryArray vacia si no hay geom
    try:
        return len(geom) > 0 and geom.geom_type.notna().any() if hasattr(geom, "geom_type") else False
    except Exception:
        return False


def force_2d_geom(geom):
    """Drop Z/M de una geometría. Si es None/empty, devuelve tal cual."""
    if geom is None or geom.is_empty:
        return geom
    try:
        return force_2d(geom)
    except Exception:
        return geom


def export_layer(gdb, layer, out_dir, target_crs):
    """Lee 1 capa y la escribe a Shapefile o CSV. Devuelve (filas, escrito_a)."""
    try:
        gdf = pyogrio.read_dataframe(gdb, layer=layer)
    except Exception as e:
        return (0, None, f"READ_FAIL: {type(e).__name__}: {str(e)[:200]}")

    is_junction = layer in JUNCTION_TABLES
    is_spatial = has_geometry(gdf) and not is_junction

    # Para junction tables: dropear geometry
    if is_junction and "geometry" in gdf.columns:
        gdf = gdf.drop(columns=["geometry"])

    # Para tablas espaciales: reproject + 2D
    if is_spatial:
        try:
            gdf = gdf.to_crs(epsg=target_crs)
        except Exception as e:
            return (0, None, f"REPROJECT_FAIL: {type(e).__name__}: {str(e)[:200]}")
        # Drop Z/M
        gdf["geometry"] = gdf["geometry"].apply(force_2d_geom)

    # Limpiar columnas
    gdf = normalize_cols(gdf)
    gdf = normalize_col_names(gdf)

    # Escribir
    out_path = Path(out_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    if is_spatial:
        out_file = out_path / f"{layer}.shp"
        try:
            # Shapefile tiene limite de 10 chars para nombre de columna. pyogrio lo trunca.
            gdf.to_file(out_file, driver="ESRI Shapefile", encoding="utf-8")
        except Exception as e:
            return (len(gdf), None, f"WRITE_SHP_FAIL: {type(e).__name__}: {str(e)[:200]}")
        return (len(gdf), str(out_file), None)
    else:
        out_file = out_path / f"{layer}.csv"
        try:
            gdf.to_csv(out_file, index=False, encoding="utf-8")
        except Exception as e:
            return (len(gdf), None, f"WRITE_CSV_FAIL: {type(e).__name__}: {str(e)[:200]}")
        return (len(gdf), str(out_file), None)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--gdb", default=GDB_DEFAULT, help="Ruta a la GDB")
    ap.add_argument("--out", default=OUT_DEFAULT, help="Directorio de salida")
    ap.add_argument("--crs", type=int, default=TARGET_CRS_DEFAULT, help="EPSG destino")
    args = ap.parse_args()

    gdb = args.gdb
    out_dir = args.out
    target_crs = args.crs

    if not os.path.isdir(gdb):
        print(f"ERROR: GDB no encontrada: {gdb}")
        sys.exit(1)

    print(f"[extract] GDB:    {gdb}")
    print(f"[extract] OUT:    {out_dir}")
    print(f"[extract] CRS:    EPSG:{target_crs}")
    print()

    # Listar capas disponibles
    available = pyogrio.list_layers(gdb)
    available_names = {name for name, _ in available}
    print(f"[extract] {len(available_names)} capas en GDB, {len(SCOPE_KEEP)} en SCOPE")
    print()

    # Filtrar a SCOPE que existan
    to_process = sorted(SCOPE_KEEP & available_names)
    missing = sorted(SCOPE_KEEP - available_names)
    if missing:
        print(f"[extract] AVISO: {len(missing)} capas en SCOPE no encontradas en GDB:")
        for m in missing:
            print(f"  - {m}")
        print()

    skipped = sorted(available_names - SCOPE_KEEP)
    if skipped:
        print(f"[extract] SKIP ({len(skipped)} capas ignoradas por scope):")
        for s in skipped:
            print(f"  - {s}")
        print()

    # Exportar
    print(f"[extract] Exportando {len(to_process)} capas...")
    print()
    results = []
    for i, layer in enumerate(to_process, 1):
        rows, out_file, err = export_layer(gdb, layer, out_dir, target_crs)
        if err:
            status = f"❌ {err}"
        else:
            kind = "shp" if out_file.endswith(".shp") else "csv"
            status = f"✅ {rows:>6} filas → {Path(out_file).name}"
        print(f"  [{i:>2}/{len(to_process)}] {layer:<40} {status}")
        results.append((layer, rows, out_file, err))

    # Resumen
    print()
    ok = [r for r in results if r[3] is None]
    fail = [r for r in results if r[3] is not None]
    total_rows = sum(r[1] for r in ok)
    print(f"[extract] Resultado: {len(ok)} OK ({total_rows:,} filas), {len(fail)} FAIL")
    if fail:
        print()
        print("[extract] FALLAS:")
        for layer, _, _, err in fail:
            print(f"  ❌ {layer}: {err}")


if __name__ == "__main__":
    main()
