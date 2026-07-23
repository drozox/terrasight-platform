# Checklist de revisión del producto — TerraSight (CAR Cundinamarca)

> **Para**: dueño del producto (CAR Cundinamarca – WWF – Fundación Natura)
> **URL de la app**: https://journal-investor-remainder-bought.trycloudflare.com
> **Login**: `admin@car.gov.co` / `Admin123!`
> **Fecha**: 2026-07-23
> **Versión**: MVP-1 + parches posteriores (DEBT-1 a 3.9)

Este documento es una **guía de revisión**. Cada bloque tiene 3 partes:

1. **Qué probar** — el flujo que tenés que ejecutar en la app.
2. **Qué validar** — lo que tiene que pasar para considerarlo OK.
3. **Preguntas abiertas** — lo que necesito que respondas para saber qué falta.

Al final, hay una sección de **"Lo que NO está implementado"** con la lista de huecos detectados durante la auditoría interna.

---

## Contexto técnico antes de empezar

- Los datos son **demo de Cundinamarca** (1 predio "El Clavel" en La Calera, 5 municipios, 23 veredas, 70 biomas IAVH, 2985 quebradas, 2295 vías, 141 propuestas de aislamiento). No son los datos finales del convenio.
- El mapa está centrado en Cundinamarca (lat 4.92, lon -73.93). Zoom range 3 a 22.
- El mapa renderiza **geometría real** (polígonos para predios/municipios/veredas/biomas, líneas para drenajes/vías). No son markers.
- La BD es local en mi máquina (Docker). Lo que ve el dueño del producto son los mismos datos que yo.

---

## Módulo 1: Login y Home (`/`)

### Qué probar
1. Ir a `/login`. Ver el form de login.
2. Iniciar sesión con `admin@car.gov.co` / `Admin123!`.
3. En home, ver el dashboard con mapa central, KPIs a la derecha, tabla de intervenciones abajo.

### Qué validar
- [ ] El form de login se ve limpio, sin sidebar ni errores.
- [ ] Después del login, redirige a `/` y muestra el dashboard.
- [ ] El mapa del home ocupa la mayor parte de la pantalla (no es una pieza chica).
- [ ] El pill verde "PostGIS OK" aparece abajo a la izquierda.
- [ ] Los KPIs a la derecha muestran números (no "—").

### Preguntas abiertas
1. ¿Qué KPIs son los MÁS importantes para el dueño del producto? Hoy muestro total de predios, quebradas, componentes, etc. ¿Falta alguno crítico?
2. ¿La tabla de "Intervenciones recientes" es útil o sobra? ¿Cuántas filas debería mostrar?
3. ¿Necesita ver alertas activas en el home? Hoy solo aparecen en `/alertas`.
4. ¿El mapa del home debería estar filtrado por defecto (ej. solo el componente activo) o siempre mostrar todo Cundinamarca?

---

## Módulo 2: Mapa (`/mapa`)

### Qué probar
1. Activar/desactivar toggles del panel de capas:
   - Predios (polígono verde del El Clavel)
   - Quebradas / Drenajes (líneas azules)
   - Ríos principales (líneas azules más gruesas)
   - Vías (líneas marrón)
   - Límite Municipal (polígonos azules punteados)
   - Límite Veredal (polígonos verde oscuro punteados)
   - Biomas IAVH (polígonos verde claro)
   - Parques Naturales (WFS)
   - Reservas Forestales (WFS)
2. Probar el zoom:
   - Click + muchas veces: debería acercarse hasta edificios.
   - Click − muchas veces: debería alejarse a toda Colombia.
   - Ruedita del mouse: zoom continuo.
   - Doble click en el mapa: zoom in.
3. Probar el cambio de basemap (esquina superior derecha): OSM, Topo, Satellite.
4. Click en cualquier polígono/línea → debe abrir un popup con metadata.
5. Herramientas inferiores: Medir, Seleccionar, Dibujar, Marcadores, Recentrar.

### Qué validar
- [ ] Cada toggle enciende/apaga la capa correspondiente.
- [ ] El popup muestra nombre, área (ha), longitud (km), tipo, estado (según la capa).
- [ ] El zoom no se queda trabado en un límite.
- [ ] La basemap satellite muestra imágenes satelitales de ESRI.

### Preguntas abiertas
1. ¿Las áreas protegidas de OpenStreetMap son suficientes o necesitamos las oficiales del RUNAP / IGAC? Hoy uso WFS de Overpass (OpenStreetMap) con fallback hardcoded.
2. ¿Falta alguna capa en el panel? Hoy tenemos: predios, quebradas, ríos, vías, municipios, veredas, biomas, parques, reservas. ¿Cobertura CLC, zonificación POMCA, RFP, páramos?
3. ¿Las herramientas de medición / dibujo son críticas? Hoy son no-op (placeholders visuales).
4. ¿Necesitan exportar la vista actual del mapa a PDF/PNG?
5. ¿El usuario debería poder subir sus propios SHP/GeoJSON al mapa?

---

## Módulo 3: Predios (`/predios`, `/predios/nuevo`, `/predios/[id]`)

### Qué probar
1. `/predios` — ver la tabla de predios (1 fila: El Clavel).
2. Click en una fila → ir al detalle.
3. `/predios/nuevo` — completar el formulario y crear un nuevo predio.

### Qué validar
- [ ] La tabla muestra nombre, área, municipio, vereda, propietario.
- [ ] El detalle del predio muestra geometría (polígono) en un mini-mapa.
- [ ] El formulario valida campos requeridos (cédula, nombre, etc.).
- [ ] Después de crear un predio, aparece en el mapa principal.

### Preguntas abiertas
1. ¿Qué campos son obligatorios para un predio en el contexto del convenio? (Hoy asumo: nombre, área, cédula catastral, id_propietario, id_vereda, geom).
2. ¿Necesitan importar predios desde un Excel/CSV en bulk?
3. ¿La geometría se captura con un editor visual (draw) o se sube como SHP/KML?
4. ¿Falta el campo "tipo de predio" (rural/urbano) o "uso del suelo"?

---

## Módulo 4: Intervenciones / Propuestas (`/intervenciones`)

### Qué probar
1. `/intervenciones` — ver la tabla (141 propuestas demo).
2. Filtrar por componente (C1, C2, C3) y por texto.
3. Click en una fila → ver detalle de la propuesta.
4. En el detalle, probar el form de "Registrar avance" (DEBT-7/8): debe advertir si registrás 0% como primer avance.

### Qué validar
- [ ] La tabla muestra actividad, tipo, estado, fecha, avance.
- [ ] El filtro por componente funciona (C1, C2, C3 desde el ribbon de arriba).
- [ ] El detalle muestra línea/polígono/punto según tipo de propuesta.
- [ ] El form de avance avisa al usuario si intenta registrar 0% como primer evento.

### Preguntas abiertas
1. ¿Los tipos de propuesta (punto/linea/polígono) son los correctos? ¿O faltan tipos?
2. ¿El "avance" es por evento o por porcentaje agregado? Hoy es por evento con porcentaje.
3. ¿Necesitan workflow de aprobación? (Hoy el estado se setea a "En ejecución" automáticamente al crear.)
4. ¿La columna "Avance %" del reporte R4/R5 muestra lo correcto? Es un JOIN LATERAL al último evento.

---

## Módulo 5: Monitoreo (`/monitoreo`)

### Qué probar
1. `/monitoreo` — ver el listado (4 puntos demo) y el mapa.
2. Filtrar por tipo de punto, componente, texto libre.
3. Toggle Tabla/Mapa.
4. Click en una fila → ver ficha expandible con detalles.
5. En el mapa, los markers muestran popup con metadata.

### Qué validar
- [ ] La lista muestra tipo (obra_captacion, estacion_limnimetrica, bebedero, tanque, panel_solar), componente, municipio.
- [ ] El mapa muestra los 4 puntos con iconos diferentes.
- [ ] La búsqueda libre filtra en tiempo real.

### Preguntas abiertas
1. ¿Los 5 tipos de punto cubren todos los casos? ¿Falta "pozo", "estación meteorológica", "vivero"?
2. ¿Necesitan un formulario de edición de puntos? Hoy es read-only.
3. ¿El conteo de "beneficiarios" en la ficha es lo que ustedes reportan? Hoy es un COUNT(*) de la tabla relacional.

---

## Módulo 6: Análisis Espacial (`/analisis`)

### Qué probar
1. `/analisis` — ver la matriz de componentes por municipio.
2. Usar el análisis de buffer: target=quebrada, distancia, ver predios dentro.
3. Usar el análisis de intersección: bounding box, ver predios intersectados.

### Qué validar
- [ ] La matriz muestra C1/C2/C3 vs municipios con conteos y hectáreas.
- [ ] El buffer devuelve resultados en < 5s para 1 quebrada + 11 predios.
- [ ] La intersección funciona con bounding box.

### Preguntas abiertas
1. ¿El análisis de buffer es el cálculo correcto? Hoy: predios a < N metros del eje de la quebrada.
2. ¿Necesitan análisis de corredor, área de influencia, o superposición entre capas?
3. ¿La matriz debe incluir otras capas (no solo propuestas)?

---

## Módulo 7: Reportes (`/reportes`)

### Qué probar
1. `/reportes` — selector de 10 reportes (R1 a R10).
2. Probar cada uno y descargar el CSV.
3. Verificar que la columna "Avance %" aparece en R4 y R5.

### Qué validar
- [ ] El selector tiene las 10 opciones (R1 predios, R2 coberturas, R3 componentes, R4 propuestas por predio, R5 propuestas con beneficiarios, R6 zonificación, R7 municipios, R8 predios con propuestas, R9 quebradas, R10 biomas).
- [ ] El CSV abre bien en Excel con encoding correcto (UTF-8 con BOM, separador `;`).
- [ ] R4 y R5 muestran la columna "Avance %" con el valor del último evento.

### Preguntas abiertas
1. ¿Los 10 reportes son los correctos? ¿Faltan? ¿Sobran? ¿Hay que cambiar el SQL de alguno?
2. ¿Necesitan filtros adicionales (por fecha, por municipio, por responsable)?
3. ¿El formato CSV es el que ustedes manejan o necesitan otro (Excel directo, PDF)?

---

## Módulo 8: Alertas (`/alertas`)

### Qué probar
1. `/alertas` — ver las 5 alertas demo.
2. Filtrar por estado (activas, resueltas, descartadas).
3. Click en una alerta → ver detalle.

### Qué validar
- [ ] Las 5 alertas tienen título, descripción, tipo, fecha.
- [ ] El formato de fecha es "Hoy" / "Ayer" / "Hace N días" / fecha larga.
- [ ] El filtro por estado funciona.

### Preguntas abiertas
1. ¿Los 5 tipos de alerta (error, warning, info, etc.) cubren los casos del negocio? ¿Falta "vencimiento" (actividades por vencer), "stock" (bajo inventario), "auditoría" (eventos)?
2. ¿Las alertas se generan automáticamente desde alguna lógica, o se cargan manualmente?
3. ¿Quién debe poder marcar como resuelta una alerta?

---

## Módulo 9: Catálogos (`/catalogos`)

### Qué probar
1. `/catalogos` — ver 7 sub-páginas: componentes, acciones, municipios, veredas, microcuencas, beneficiarios, propietarios.
2. Crear un nuevo registro en cada uno.
3. Editar uno existente.
4. Borrar uno (verificar FK constraints).

### Qué validar
- [ ] Cada sub-página tiene su tabla y form.
- [ ] Las validaciones de campos requeridos funcionan.
- [ ] Al borrar un componente con propuestas asociadas, da error (FK constraint).

### Preguntas abiertas
1. ¿Los 7 catálogos son los correctos? ¿Falta alguno (veredas, tipo de cobertura, etc.)?
2. ¿Los campos actuales de cada catálogo son los que ustedes necesitan?
3. ¿Los catálogos deben ser editables solo por ADMIN, o también por ANALISTA?

---

## Módulo 10: Administración (`/admin/usuarios`, `/admin/auditoria`)

### Qué probar
1. `/admin/usuarios` — gestión CRUD de usuarios.
2. `/admin/auditoria` — ver eventos de login (LOGIN_OK, LOGIN_FAIL, ACCESS_DENY).

### Qué validar
- [ ] Solo rol ADMIN puede acceder.
- [ ] Crear/editar/borrar usuarios funciona.
- [ ] La auditoría muestra los eventos del admin que se logueó (admin@car.gov.co).

### Preguntas abiertas
1. ¿Los roles actuales (ADMIN, ANALISTA, GESTOR) son los correctos? ¿Falta alguno?
2. ¿Necesitan workflow de aprobación de usuarios nuevos? (Hoy cualquier ADMIN puede crear usuarios).
3. ¿La auditoría debe persistir más allá de los últimos N eventos? ¿O un export a CSV?

---

## Módulo 11: Configuración (`/configuracion`)

### Qué probar
1. `/configuracion` — ver qué hay.

### Qué validar
- [ ] Algo aparece en esta página (puede ser un placeholder).

### Preguntas abiertas
1. ¿Qué debería ir en `/configuracion`? Hoy es un placeholder. ¿Configuración general del sistema? ¿Tema/branding? ¿API keys externas (IGAC, Overpass, etc.)?

---

## Lo que NO está implementado (auditoría interna detectó estos huecos)

Esto lo reporto para que no te lleves sorpresas. **No es un juicio**, es la lista honesta de lo que falta:

### Funcional
- **No hay workflow de aprobación de propuestas**. Cualquier GESTOR puede crear, no hay revisión de ADMIN.
- **No hay upload de archivos** (KML, SHP, GeoJSON, fotos). Los predios/propuestas se crean uno a uno con form.
- **No hay notificaciones** (email, push). Las alertas son solo in-app.
- **No hay exportación a PDF** (más allá del "Imprimir" del browser en /reportes).
- **No hay dashboard de avance por municipio** consolidado. Hay matriz en /analisis pero sin gráficos.
- **Las herramientas de mapa (medir, dibujar, marcar)** son placeholders visuales. No-op.
- **No hay comparador de versiones de geometría** (cambios de un predio en el tiempo).
- **No hay importación masiva desde Excel/CSV**.

### Datos
- Solo **1 predio** (El Clavel). El cliente debería poder ver **datos reales** del convenio, no demo.
- Solo **141 propuestas de aislamiento** (líneas). No hay propuestas de punto ni de polígono.
- No hay **drenajes dobles** (la tabla está vacía). El SHP tenía 27 features, pero el schema pedía un campo adicional que no estaba.
- No hay **cobertura CLC** (la tabla está vacía). El SHP era de Cali, no Cundinamarca.
- No hay **páramos** ni **zonificación POMCA/RFP** (tablas vacías).

### UX / Visual
- El mapa no muestra **etiquetas con nombres** de predios/municipios (solo el popup on click).
- El panel de capas no tiene **búsqueda ni filtro** (es solo toggles).
- No hay **vista mobile optimizada** (la app está hecha para desktop).
- El **logo** es un placeholder genérico. No hay branding CAR-WWF-Natura específico.

### Integración
- No hay **API pública** (REST/GraphQL) para que sistemas externos consulten.
- No hay **sincronización con IGAC / RUNAP / SINCHI** (los datos son estáticos en la BD local).
- No hay **autenticación con SSO** (CAR/Colsubsidio/Google Workspace).

---

## Preguntas generales para el dueño del producto

1. **¿Cuál es el flujo principal del usuario tipo?** Hoy asumo: GESTOR entra → ve mapa → carga propuesta → registra avance. ¿Es eso?
2. **¿Cuál es el primer "éxito" medible?** ¿Tener 100 predios cargados? ¿Tener 50 propuestas con avance? ¿Generar el primer reporte oficial?
3. **¿Hay un plazo para que esto entre en producción con datos reales?** Eso define prioridades.
4. **¿Hay otros usuarios (además del dueño) que van a entrar pronto?** ¿Necesitan un ambiente de staging separado?
5. **¿Hay un equipo técnico del lado del cliente que pueda mantener la BD o necesita ser todo gestionado por nosotros?**

---

## Cómo documentar la revisión

Te sugiero ir módulo por módulo, y por cada uno:

- **OK** si todo funciona como esperabas.
- **No OK — [descripción breve]** si encontraste un bug o algo que no anda.
- **Falta — [qué falta] — [prioridad alta/media/baja]** si algo no está y lo querés.
- **Cambio — [qué cambiarías] — [por qué]** si algo anda pero no te gusta.

Si podés, mandame eso en un doc (Word, Excel, lo que sea) y con eso armamos el siguiente sprint.

---

**Si algo crítico no anda, no esperes a terminar todo**: mandame un mensaje con el bug y lo ataco antes.
