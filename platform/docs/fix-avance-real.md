# Fix: Avance real desde `sgs_pro_propuesta_avance`

> Plan consolidado de la auditoría. Output de 3 reviewers (terrasight-gis, terrasight-arch, terrasight-ux). Decisiones finales del orquestador (Mavis).

## Contexto

El "avance %" de las intervenciones en TerraSight es **ficto**. La función `avancePctPorTipo(tipo)` en `platform/src/lib/repository.ts` hardcodea:
- `punto` → 20%
- `linea` → 75%
- `poligono` → 100%

Esto se usa en **dos lugares**:
1. `getIntervencionCompleta` (como fallback cuando no hay registros en `sgs_pro_propuesta_avance`).
2. `getIntervencionesRecientes` (un `CASE WHEN tipo` **hardcodeado en el SELECT**, ni siquiera consulta la tabla).

La tabla `sgs_pro_propuesta_avance` (migration 06) **ya existe** con FK, CHECK 0-100, índice `(id_propuesta, created_at DESC)`. El backfill inicial sembró una fila por propuesta con valores ficticios del tipo. Hay que distinguirlas para no seguir mintiendo.

## Decisiones del orquestador (Mavis)

| Decisión | Final | Razón |
|---|---|---|
| Tipo `avance` | `number \| null` | La verdad > retrocompatibilidad. |
| `COALESCE` en query | NO usar | Sin COALESCE, devuelve `NULL` cuando no hay evento real. UI muestra "Avance no registrado". |
| Microcopy | "Avance no registrado" | Explícito sobre QUÉ falta. |
| `unstable_cache` | NO en este PR | Scope creep. Va en otro PR. |
| Color barra | `warning<50`, `primary 50-79`, `success>=80` | Mapea a design system. |

## Cambios

### 1. Migration nueva: `platform/scripts/db/init/09-propuesta-avance-es-backfill.sql`

```sql
-- =============================================================================
-- 09-propuesta-avance-es-backfill.sql
-- Marca las filas del backfill de la migración 06 para que las queries de
-- "último avance real" las puedan filtrar sin depender del texto de la nota
-- ni de `id_usuario IS NULL` (que ya no será un proxy fiable).
-- =============================================================================

ALTER TABLE sgs_pro_propuesta_avance
    ADD COLUMN IF NOT EXISTS es_backfill BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN sgs_pro_propuesta_avance.es_backfill IS
  'TRUE si la fila fue sembrada por el backfill de la migración 06 (valores
   20/75/100 derivados del tipo). Las queries de "último avance real" deben
   filtrar WHERE es_backfill = FALSE.';

UPDATE sgs_pro_propuesta_avance
SET    es_backfill = TRUE
WHERE  nota = 'Backfill inicial (migración 06)'
  AND  es_backfill = FALSE;

CREATE INDEX IF NOT EXISTS idx_sgs_pro_propuesta_avance_vigente
    ON sgs_pro_propuesta_avance (id_propuesta, created_at DESC)
    WHERE es_backfill = FALSE;
```

### 2. Repo `platform/src/lib/repository.ts`

**Función nueva** para reutilizar:
```ts
async function getUltimoAvanceReal(idPropuesta: number): Promise<AvancePropuesta | null> {
  const rows = await sql<{
    id_avance: number | string;
    id_propuesta: number | string;
    avance_pct: number | string;
    nota: string;
    id_usuario: number | string | null;
    autor_email: string | null;
    es_backfill: boolean | string;
    created_at: Date | string;
  }[]>`
    SELECT av.id_avance, av.id_propuesta, av.avance_pct, av.nota,
           av.id_usuario, autor.email AS autor_email,
           av.es_backfill, av.created_at
    FROM   sgs_pro_propuesta_avance av
    LEFT JOIN sgs_adm_usuario autor ON autor.id_usuario = av.id_usuario
    WHERE  av.id_propuesta = ${idPropuesta}
      AND  av.es_backfill = FALSE
    ORDER  BY av.created_at DESC, av.id_avance DESC
    LIMIT  1;
  `;
  const r = rows[0];
  if (!r) return null;
  return {
    idAvance: pgInt(r.id_avance),
    idPropuesta: pgInt(r.id_propuesta),
    avancePct: pgInt(r.avance_pct),
    nota: pgText(r.nota),
    idUsuario: r.id_usuario == null ? null : pgInt(r.id_usuario),
    autorEmail: r.autor_email,
    esBackfill: r.es_backfill === true || r.es_backfill === "t" || r.es_backfill === "true",
    createdAt: new Date(pgText(r.created_at)),
  };
}
```

**Modificar `getIntervencionesRecientes`** (línea ~218 de `repository.ts`):
- Reemplazar el bloque `CASE WHEN pp.tipo = 'punto' THEN 20 ... END AS avance` por un `LEFT JOIN LATERAL` que devuelva el último avance real (excluyendo backfill).
- Tipo del campo: `avance: number | string | null` en la query.
- Tipo retornado: `avance: number | null` en `IntervencionReciente`.

**Query nueva**:
```sql
SELECT
  pp.id_propuesta,
  pp.tipo,
  pp.actividad,
  pr.nombre_predio,
  ('PR-' || LPAD(pr.id_predio::text, 5, '0'))     AS codigo_predio,
  m.nombre_municipio,
  c.nombre                                         AS nombre_componente,
  a.nombre                                         AS nombre_accion,
  pol.area_ha                                      AS hectareas,
  pl.longitud_m                                    AS longitud,
  av.avance_pct                                    AS avance,
  pp.estado                                        AS estado
FROM sgs_pro_propuesta pp
JOIN sgs_pre_predio pr      ON pr.id_predio   = pp.id_predio
JOIN sgs_com_accion a       ON a.id_accion    = pp.id_accion
JOIN sgs_com_componente c   ON c.id_componente = a.id_componente
LEFT JOIN bcs_lpa_vereda v       ON v.id_vereda        = pr.id_vereda
LEFT JOIN bcs_lpa_municipio m   ON m.id_municipio     = v.id_municipio
LEFT JOIN sgs_pro_propuesta_linea    pl  ON pl.id_propuesta  = pp.id_propuesta
LEFT JOIN sgs_pro_propuesta_poligono  pol ON pol.id_propuesta = pp.id_propuesta
LEFT JOIN LATERAL (
  SELECT av2.avance_pct
  FROM   sgs_pro_propuesta_avance av2
  WHERE  av2.id_propuesta = pp.id_propuesta
    AND  av2.es_backfill = FALSE
  ORDER  BY av2.created_at DESC, av2.id_avance DESC
  LIMIT  1
) av ON true
${componente ? sql`WHERE c.nombre = ${componente}` : sql``}
ORDER BY pp.id_propuesta ASC
LIMIT ${limit};
```

**Modificar `getIntervencionCompleta`** (línea ~2682):
- Reemplazar el fallback `avancePctPorTipo(tipo)` por `null`.
- Borrar la función `avancePctPorTipo` entera.
- Cambiar el tipo: `avancePctActual: number | null`.
- **Importante**: el array `avances` que se pasa al `Timeline` también debe filtrar el backfill, o el Timeline va a mostrar "20% — Backfill inicial (migración 06)" en la primera entrada. Solución: en la línea donde se hace `const avancePctActual = ...`, calcular también `avancesFiltrados = avances.filter(a => !a.esBackfill)`. Pasar `avancesFiltrados` al Timeline, y dejar `avances` completo si lo usa otro lado (no parece).

### 3. Tipo `platform/src/lib/types.ts`

Cambiar `IntervencionReciente.avance: number` → `avance: number | null`.

### 4. UI — 3 lugares (ver snippets exactos en el reporte UX)

**`platform/src/app/intervenciones/page.tsx`** — columna Avance:
- Cuando `i.avance === null || undefined`, mostrar chip `<span class="... border-dashed border-outline-variant ...">Avance no registrado</span>` con tooltip.
- Cuando hay valor, mostrar barra con `bg-warning/primary/success` según threshold, con `role="progressbar"` y `aria-valuenow/min/max`.

**`platform/src/components/dashboard/intervenciones-table.tsx`** — idem.

**`platform/src/app/intervenciones/[id]/avance-form.tsx`**:
- Tipo: `avanceActual: number | null`.
- `useState<number | null>(avanceActual ?? null)`.
- En modo lectura: si null, mostrar `<p>Avance no registrado</p>` en vez de `{pct}%`.
- En modo edición: idem arriba; barra condicional (placeholder con `border-dashed` si null).
- `useEffect(() => setPct(avanceActual ?? 0), [avanceActual])` — el slider arranca en 0 cuando no hay registro, no rompe.

## Stop condition para coder

El fix está completo cuando:
- [ ] Migration `09-*.sql` corre sin error en `npm run db:migrate`.
- [ ] `getIntervencionesRecientes` ejecuta y devuelve `avance: number | null` (verificar con `npm run dev` y abrir `/intervenciones`).
- [ ] `getIntervencionCompleta` ejecuta sin error y devuelve `avancePctActual: number | null`.
- [ ] `avancePctPorTipo` no existe más en el repo (grep 0 matches).
- [ ] Los 3 lugares UI muestran "Avance no registrado" cuando `avance === null` y la barra con color correcto cuando hay valor.
- [ ] El test suite pasa: `npm test`.
- [ ] `npm run lint` pasa.
- [ ] `npm run build` pasa (sin errores de TypeScript).

## Plan de deploy

1. Commit atómico: migration + repo + UI + types juntos.
2. Correr `npm run db:migrate` en dev/staging.
3. Verificar en `/intervenciones` que aparece "Avance no registrado" en propuestas que no tienen evento manual.
4. Probar: un gestor registra un avance real en una propuesta de prueba. El sistema muestra el nuevo valor y la fila aparece en el Timeline.
5. (Después) PR separado: `unstable_cache` 60s + `revalidateTag` en actions. Fuera de scope de este PR.

## Decisiones bloqueantes que el orquestador ya tomó

- ✅ Tipo `avance: number | null` (rompe UI actual, pero la UI ya se va a tocar).
- ✅ Microcopy: "Avance no registrado".
- ✅ Sin `COALESCE` en la query (devuelve null cuando no hay evento real).
- ✅ Sin `unstable_cache` en este PR.
- ✅ Color: warning/primary/success según threshold.
- ✅ Borrar `avancePctPorTipo` del repo.

## Si algo se rompe

- Si el tipo `avance: number | null` rompe un test, ajustar el test (no el tipo).
- Si la query LATERAL es lenta en dataset grande, agregar `LIMIT` a la subquery o cambiar a `DISTINCT ON` (pero LATERAL está validado por el plan).
- Si la migration 09 falla por `ADD COLUMN ... NOT NULL DEFAULT FALSE` en una versión vieja de Postgres, la columna puede que requiera `WITH VALUES` (Postgres ≥11 no lo necesita).
- Si la UI muestra "Avance no registrado" en TODAS las propuestas y el cliente se queja: revertir el commit. La migration 09 es inofensiva por sí sola (agrega una columna + un índice). La query nueva es la que cambia el comportamiento.
