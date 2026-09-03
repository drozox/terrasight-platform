"""dump_gdb_schemas.py — imprime columnas de cada capa extraida en formato
legible, para disenar el mapping GDB -> PG."""
import warnings
warnings.filterwarnings("ignore")
import pyogrio

GDB = r"C:\Users\agFab\OneDrive\Documents\GitHub\TG-Nikoll\DOCS\03_GDB\03_GDB\SIG_CAR_WWF_FN.gdb"
OUT = r"C:\dev\scratch\gdb_export"

import os
files = sorted(os.listdir(OUT))
print(f"Archivos en {OUT}:")
for f in files:
    if f.endswith((".shp", ".csv")):
        print(f"\n{'='*70}\n{f}\n{'='*70}")
        path = os.path.join(OUT, f)
        if f.endswith(".shp"):
            gdf = pyogrio.read_dataframe(path)
        else:
            # CSV: leer con pyogrio (auto-detecta)
            gdf = pyogrio.read_dataframe(path)
        for i, col in enumerate(gdf.columns, 1):
            dtype = str(gdf[col].dtype)
            sample = gdf[col].dropna().head(1).tolist()
            sample_str = repr(sample[0])[:60] if sample else "null"
            print(f"  {i:>2}. {col:<30} {dtype:<15} ej: {sample_str}")
