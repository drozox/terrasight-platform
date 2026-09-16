-- =============================================================================
-- 46-metas-global-10-keys.sql
--
-- Fix del CI (test integration tests/integration/indicadores.int.test.ts):
-- la vista `sgs_v_indicador_global` se construía con GROUP BY sobre
-- `sgs_v_indicador_propuesta`, por lo que los indicadores SIN filas (p. ej.
-- "conectividad" cuando el seed no tiene polígonos de ese tipo) quedaban
-- AUSENTES del agregado. El test (y la app) esperan las 10 keys siempre.
--
-- Fix: partir de una lista fija de las 10 keys y LEFT JOIN con el agregado,
-- devolviendo actual = 0 cuando no hay filas. Es determinista y no depende de
-- los datos sembrados.
-- =============================================================================

CREATE OR REPLACE VIEW sgs_v_indicador_global AS
WITH keys(indicador_key, unidad) AS (
  VALUES
    ('cercos_vivos'::text,    'km'::text),
    ('alambre',               'km'),
    ('conectividad',          'ha'),
    ('silvopastoril',         'ha'),
    ('agroforestal',          'ha'),
    ('cosecha',               'obras'),
    ('compostaje',            'kits'),
    ('estaciones',            'estaciones'),
    ('obras_captacion',       'obras'),
    ('predios_c3',            'predios')
),
agg AS (
  SELECT indicador_key,
         CASE
           WHEN max(agregacion) = 'count_distinct_predio'
             THEN count(DISTINCT id_predio)::numeric
           ELSE COALESCE(SUM(medida), 0)::numeric
         END AS actual
  FROM sgs_v_indicador_propuesta
  GROUP BY indicador_key
)
SELECT k.indicador_key,
       k.unidad,
       COALESCE(a.actual, 0)::numeric AS actual
FROM keys k
LEFT JOIN agg a ON a.indicador_key = k.indicador_key;

COMMENT ON VIEW sgs_v_indicador_global IS
  'Agregado de sgs_v_indicador_propuesta con las 10 keys SIEMPRE presentes '
  '(actual=0 si no hay filas). Consumida por getMetasConvenio() y el CI.';
