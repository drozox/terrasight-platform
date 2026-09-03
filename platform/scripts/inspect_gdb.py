"""Inspect GDB: lee 4 capas representativas y muestra schema + samples."""
import warnings
warnings.filterwarnings("ignore")
import pyogrio

GDB = r"C:\Users\agFab\OneDrive\Documents\GitHub\TG-Nikoll\DOCS\03_GDB\03_GDB\SIG_CAR_WWF_FN.gdb"

LAYERS = [
    "bcs_lpa_municipio",
    "sgs_pre_predio",
    "sgs_rel_predio_cobertura",
    "sgs_pro_propuesta_punto",
    "sgs_pro_propuesta_linea",
    "sgs_pro_propuesta_poligono",
    "sgs_com_accion",
    "sgs_pre_propietario",
    "sgs_amb_alerta",  # puede no estar
    "sgs_amb_zonificacion_rfp",
    "sgs_rel_predio_zonificacion_rfp",
    "sgs_amb_paramos",
    "sgs_rel_predio_paramos",
    "bcs_dh_microcuenca",
    "bcs_dh_quebrada",  # puede no estar
    "sgs_inf_via",
]

for name in LAYERS:
    try:
        gdf = pyogrio.read_dataframe(GDB, layer=name)
        cols = [c for c in gdf.columns if c != "geometry"]
        print(f"\n=== {name} ===")
        print(f"  filas: {gdf.shape[0]}, cols: {len(cols)}, geom: {gdf.geometry.geom_type.unique().tolist() if len(gdf) else 'n/a'}, CRS: {gdf.crs}")
        print(f"  columnas: {cols}")
    except Exception as e:
        print(f"\n=== {name} ===")
        print(f"  ERROR: {type(e).__name__}: {str(e)[:200]}")
