# Sprint Status — SIG TERRITORIO

> Estado actual del proyecto: qué está hecho, qué falta, qué viene.
> Última actualización: 2026-09-08 (Sprint 18.1, post-push de medir distancia + área).

---

## 1. Resumen ejecutivo

| Indicador | Valor |
|-----------|-------|
| **Commits en `main`** | `d1e4c72` (HEAD) |
| **Tag baseline** | `v0.1.0-pre-final` |
| **Fases completadas** | MVP-1, Phase 1-7, Metas del convenio, Branding, **Sprint 18.1 (medir)** |
| **Datos reales en Supabase** | 1,381 propuestas, 132 predios, 5,959 vías, 656 quebradas, 20 municipios |
| **Migraciones aplicadas** | 31 |
| **Audit UI/UX** | 46/55 (84%) cerrados |
| **TECH-DEBT** | 0 items abiertos |
| **Tests** | 156+ unit (ahora +20 = 176+), 6 E2E, smoke 55/56 (sin regresión) |
| **Última URL de Vercel** | ver https://vercel.com/drozox/terrasight-platform |

---

## 2. Metas operativas del convenio (5 metas, /metas/convenio)

Estado al 2026-09-08 con datos reales del GDB. Drill-down disponible en cada indicador.

| Meta | Indicador | Actual | Meta | % | Estado |
|------|-----------|--------|------|---|--------|
| **C1A1** | Cercos vivos | 11.10 km | 12 km | 92% | 🟡 cerca |
| **C1A1** | Aislamientos (alambre) | 8.89 km | 12 km | 74% | 🟡 cerca |
| **C1A2** | Franjas de conectividad | 5.20 km | 15 km | 35% | 🔴 atrasada |
| **C1A2** | Sistemas silvopastoriles | 6.46 ha | 15 ha | 43% | 🔴 atrasada |
| **C1A2** | Sistemas agroforestales | 4.44 ha | 15 ha | 30% | 🔴 atrasada |
| **C2A1** | Cosecha de agua | 79 | 79 | 100% | 🟢 cumplida |
| **C2A1** | Kit de compostaje | 79 | 79 | 100% | 🟢 cumplida |
| **C2A2** | Estaciones limnimétricas | 7 | 7 | 100% | 🟢 cumplida |
| **C2A2** | Obras de captación | 96 | 48 | 200% | 🟢 superada |
| **C3** | Predios en áreas protegidas | 39 | 35 | 111% | 🟢 cumplida |

**Resumen global**: 5/10 metas cumplidas (🟢), 2 cerca (🟡), 3 atrasadas (🔴).

**Cobertura territorial**: 14 municipios intervenidos + ~93 veredas (intersección espacial con líneas y polígonos + lookup por id_predio).

### Funcionalidades de `/metas/convenio`

- [x] Barra de cumplimiento global con leyenda 🟢🟡🟠🔴
- [x] Tabla compacta resumen de los 10 indicadores (1 vistazo)
- [x] Gráfico de torta Recharts
- [x] Banner de calidad de datos (692 prop_punto sin geom, C2A2 suma total)
- [x] Banner de alertas automáticas para metas <50%
- [x] Labels expandidos (C1A1 · Conservación del Recurso Hídrico, etc.)
- [x] Drill-down municipio → `/metas/convenio/[id_municipio]` con 10 indicadores del municipio
- [x] Drill-down propuestas → `/metas/convenio/propuestas?indicador=<key>` (10 indicadores)
- [x] Vista imprimible `/metas/convenio/imprimir` (Ctrl+P → PDF)

---

## 3. UX Audit (P0–P3, 46/55 cerrados)

Ver `docs/ui-ux-audit-2026-07-24.md` para el detalle. Resumen:

| Prioridad | Original | Cerrados | Pendientes |
|-----------|----------|----------|------------|
| P0 (bloqueante) | 6 | 6 ✅ | 0 |
| P1 (alto) | 18 | 18 ✅ | 0 |
| P2 (medio) | 15 | 15 ✅ | 0 (cambió desde 12/15 → 15/15 con sprint 17) |
| P3 (bajo) | 16 | 7 ✅ | 9 (incluye nuevos del sprint 17) |
| **Total** | **55** | **46** | **9** |

### Pendientes P3 (nice-to-have)

- **UX-33** — Clustering del mapa (>5000 features). Refactor a MVT pendiente. **Sprint +2**.
- **UX-66** — Tablas virtualizadas (`@tanstack/react-virtual`) para `/intervenciones` y
  `/predios`. **Sprint +1**.
- **UX-61** — Topbar búsqueda global de predios. **Sprint +1**.
- **UX-64** — Paginación de alertas (5 actuales, no urge).
- **UX-47** — Etiquetas de mapa con nombres (placeholder existe).
- **UX-07/08/10/11** — Diferencias visuales menores vs Stitch (decisión de UX).
- **UX-16** — 404 con ilustración.
- **UX-42** — Dark mode contraste (no dark mode aún).

---

## 4. TECH-DEBT (0 items abiertos)

Ver `docs/TECH-DEBT.md`. Todos los DEBTs cerrados. Único pendiente cosmético:

- Comentarios inline en `lib/types.ts:658,660` mencionan `ST_X(geom::geometry)` que ya no se usa.
  Es texto muerto, no afecta runtime.

---

## 5. Funcional pendiente (review-producto 2026-07-23)

Huecos identificados en la revisión del producto. **Actualizado al 2026-09-08**:

### Funcional

| Item | Estado | Notas |
|------|--------|-------|
| ~~Solo 1 predio demo~~ | ✅ Cerrado | 132 predios reales del GDB |
| ~~141 propuestas demo~~ | ✅ Cerrado | 1,381 propuestas reales |
| ~~Sin drenajes dobles~~ | ✅ Cerrado | 7 drenaje doble + 656 quebradas derivadas |
| ~~Sin cobertura CLC~~ | ✅ Cerrado | 162 lookup + 128 junction |
| ~~Sin páramos/POMCA/RFP~~ | ✅ Cerrado | 10/245/486 lookup + junction |
| Workflow de aprobación | ❌ Pendiente | Cambio de modelo de dominio, sprint +1 con cliente |
| Upload de archivos (KML/SHP) | ❌ Pendiente | sprint +2 |
| Notificaciones (email/push) | ❌ Pendiente | sprint +2 (requiere SMTP/Resend) |
| Export PDF del reporte | ✅ Cerrado | `/metas/convenio/imprimir` con `window.print()` |
| Dashboard de avance por municipio | ✅ Cerrado | `/metas/convenio/[id_municipio]` |
| Herramientas de mapa funcionales | ❌ Pendiente | placeholders visuales |
| Comparador de versiones | ❌ Pendiente | sprint +2 |
| Importación masiva Excel/CSV | ❌ Pendiente | sprint +1 |

### UX / Visual

| Item | Estado | Notas |
|------|--------|-------|
| Etiquetas con nombres en mapa | ❌ Pendiente | UX-47 |
| Búsqueda en panel de capas | ❌ Pendiente | sprint +1 |
| Vista mobile optimizada | 🟡 Parcial | sidebar se oculta en mobile, falta drawer |
| Logo CAR-WWF-Natura específico | 🟡 Parcial | hay logo genérico, partners en topbar |

### Integración

| Item | Estado | Notas |
|------|--------|-------|
| API pública | ❌ Pendiente | sprint +2 (FastAPI o Next.js route handlers) |
| Sincronización IGAC/RUNAP/SINCHI | ❌ Pendiente | sprint +3+ |
| SSO (CAR/Google Workspace) | ❌ Pendiente | sprint +2 (requiere decisión del cliente) |

---

## 6. Commits recientes (último mes)

```
9adb285 feat(platform): UX-63/UX-18/UX-80/F1/UX-17/UX-45 — sort, breadcrumb, skeletons, export PDF
3718fd0 feat(platform): Metas del convenio amigable para tomadores de decisión
0070094 feat(platform): drill-down municipio + barra global de cumplimiento + fix estaciones
8e4fe25 feat(platform): Metas del convenio — C1A2 conectividad en km + municipios/veredas con intersección espacial
8fb2217 feat(platform): Metas del convenio — 5 metas operativas + veredas intervenidas
c349118 chore: .gitignore + untracked files exclusion
a5ddcc2 refactor(platform): rename TerraSight → SIG TERRITORIO
c9f7941 fix(platform): smoke test pass + TRUNCATE→DELETE en import_drenaje_quebrada
c9a16a7 fix(platform): Phase 7c — fix propuesta re-import + serial PKs
83d2c3f feat(platform): Phase 7b — importar drenaje doble + derivar quebradas
57234a0 feat(platform): Phase 7 — import Fase 6 GDB → Supabase
```

---

## 7. Plan sprint +1 (siguiente)

Sprint 18 en curso (herramientas SIG). Plan:

- [x] **18.1** Medir distancia + área ✅ (commit `d1e4c72`)
- [ ] **18.2** Identificar (2 días) — click sobre feature → popup con metadata
- [ ] **18.3** Buffer (2 días) — ST_Buffer + ST_DWithin para análisis
- [ ] **18.4** Selección espacial (1 día) — rectángulo + counts por capa
- [ ] **18.5** MVT para drenajes (UX-31 hotfix) — `/api/tiles/[layer]/[z]/[x]/[y]`

Después:

- [ ] **19** Búsqueda transversal + dashboard /admin/calidad
- [ ] **20** Workflow de intervenciones (BORRADOR → EN_REVISION → ...)
- [ ] **21** Importación CSV/XLSX + KML
- [ ] **22** Versionado + histórico de metas
- [ ] **23** Reportes restantes + auditoría R1-R10

---

## 8. Recursos

- `docs/ARCHITECTURE.md` — capas, decisiones, modelo de datos
- `docs/REVIEW-GUIDE.md` — checklist para code review
- `docs/TECH-DEBT.md` — deuda técnica cerrada
- `docs/ui-ux-audit-2026-07-24.md` — audit vivo UX
- `AGENTS.md` — convenciones, comandos, anti-patrones
