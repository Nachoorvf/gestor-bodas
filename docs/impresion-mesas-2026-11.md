# Impresión de mesas — preparación local

Rama: `feature/mesas-print`, basada en `main` (`9480d90`), sin incorporar el commit de seguridad. No se han hecho commits, push, merges ni despliegues. No se han consultado datos reales ni cambiado reglas, autenticación, invitaciones públicas, dependencias o modelos de datos.

## Implementación

- `app/dashboard/mesas/page.js`: botón «Imprimir mesas». Instrumenta únicamente las promesas de las escrituras existentes para detectar errores, operaciones activas y cambios durante la lectura; conserva sus operaciones y datos. Una escritura rechazada bloquea la impresión hasta recargar y revisar. El botón no crea escrituras: espera `waitForPendingWrites`, lee documento de boda y colecciones completas de mesas e invitados mediante `getDocFromServer`/`getDocsFromServer` y rechaza snapshots de caché o con escrituras pendientes. Tiempo máximo de preparación: 15 segundos. No utiliza el filtro `orderBy('nombre')` del editor para la exportación.
- `utils/mesasPrint.mjs`: transformación pura, proyección explícita sin teléfono/alergias ni campos ajenos al documento, incorporación de novios virtuales con identidad separada de invitados, orden por asiento válido y nombre, estados de asistencia, mesas vacías, personas sin asignar y referencias a mesas inexistentes. No fusiona personas homónimas ni repara documentos. Detecta índices inválidos, asientos duplicados, exceso de capacidad, nombres repetidos y geometría inválida. Un ID de persona o mesa duplicado bloquea la impresión; todas las personas se mantienen en los listados.
- `components/planner/MesasPrintDocument.jsx`: diálogo modal nativo con documento independiente del editor, sin nueva URL. Solo se prepara desde la sesión y boda actuales; al cambiar sesión/boda se ocultan los datos del documento. Modelo fijo en memoria: los cambios remotos no alteran las páginas ya preparadas. El SVG representa cuerpos de mesa con sus dimensiones, forma, posición y rotación central, calcula límites incluyendo esquinas giradas y coordenadas negativas y usa escala uniforme. No representa sillas; el asiento se informa en el listado. Texto SVG dividido en líneas, sin captura rasterizada.
- `components/planner/mesasPrint.css`: plano A4/A3 horizontal; listados A4 vertical, en trabajos separados. Cabeceras de tabla repetibles, filas con corte desaconsejado y textos sin truncamiento. La impresión oculta el resto de la aplicación mientras existe el documento. No cambia los estilos normales del editor.
- `tests/mesas/print.test.mjs`: tests Node sin Firebase ni dependencias nuevas.

El documento incluye nombre y fecha de boda, total de personas/mesas, advertencias y ocupación. Estados confirmado/pendiente/rechazado figuran en cada fila, incluidos rechazados asignados o sin asignar. No se omiten personas por estado, búsqueda o índice duplicado. El plano es una representación gráfica, no una escala física del recinto.

## Consistencia y límites

La lectura se hace después de esperar las escrituras ya enviadas. El diálogo impide seguir interactuando con el editor mientras prepara el documento; una operación que se reanude durante ese intervalo cambia la versión local y provoca rechazo de la preparación. Los metadatos confirman la procedencia y ausencia de pendientes del snapshot; no se presume persistencia a partir de la pantalla o del botón «Guardar» anterior.

Las tres lecturas de servidor no forman una transacción global. Otro organizador podría editar entre ellas o después de generar el documento; esta versión no añade bloqueos ni escrituras de coordinación. Cerrar la edición concurrente y regenerar el documento antes de entregarlo. La instantánea impresa puede quedar anticuada tras su preparación.

La protección reutiliza el contexto de acceso actual y las lecturas sujetas a las reglas existentes. No endurece S1/S2 ni afirma que esas reglas estén corregidas: esos riesgos siguen pendientes en la rama de seguridad. No se añade un endpoint público ni se pasan datos por URL/localStorage. El diálogo no modifica Firestore; los únicos métodos de escritura del archivo siguen siendo los del editor anterior, ahora observados para detectar fallos.

Los nombres extremadamente largos o planos muy extensos pueden resultar pequeños en una sola hoja; revisar previsualización y usar A3. Los solapamientos originales se conservan. No se promete legibilidad universal por reducir el plano. Mesas con geometría inválida bloquean la salida, sin excluirlas silenciosamente.

## Validación

- `node --test tests/mesas/print.test.mjs`: **6 pruebas aprobadas, 0 fallos**. Casos: cuatro formas, rotación 45°, coordenadas negativas, mesa vacía, novios asignados/no asignados, tres estados de asistencia, huérfanos, índices inválidos/duplicados, homónimos/IDs duplicados, datos sin mesas, geometría inválida, nombres largos con acentos y 500 personas en 50 mesas. Se comprueba que la proyección elimina datos innecesarios y no muta los originales.
- ESLint sobre página de mesas y los tres archivos JavaScript nuevos: **0 errores y 0 avisos**. El lint global sigue fallando por deuda ajena al alcance: **17 errores y 11 avisos**. No se han desactivado reglas ni corregido módulos ajenos para ocultarlo. La inicialización móvil preexistente no se ha modificado.
- `git diff --check`: sin errores. `firestore.rules`, `storage.rules`, `firebase/`, contexto de autenticación, `package.json` y lockfile no se modificaron.
- `npm run build`: código 1, imposibilidad de descargar Inter, Playfair Display y Cormorant Garamond desde Google Fonts. No se considera un build aprobado; pueden existir fallos posteriores todavía no visibles. Salida `/tmp/mesas-print-build.txt`.
- **No verificados visualmente en navegador:** SVG renderizado, diálogo nativo, generación PDF, cabeceras repetidas, documentos de varias páginas y A3. No se levantó la aplicación con su configuración Firebase real ni se utilizaron cuentas reales. Los tests de datos numerosos verifican conservación/agrupación, no equivalen a comprobar la paginación en un PDF.
- **No verificados con Firebase:** flujo de espera/escritura rechazada, desconexión, cambio de sesión y respuestas de metadatos. La revisión de código comprueba uso exclusivo de lecturas desde la acción de imprimir; no se realizaron escrituras reales para probarlo.

## Antes de publicar

Revisión del diff y aprobación expresa, seguida de validación aislada con Firebase ficticio o emulador configurado antes de cargar la aplicación; nunca conectar las pruebas al proyecto real. Verificar lectura fallida, pendientes, escritura rechazada y cambio de sesión, además de la navegación y la ausencia de regresiones del editor. Revisar PDFs A4/A3 y listados extensos con Chromium y el navegador que vaya a usar el organizador; ajustar tamaños desde el diálogo del navegador. Una fila más alta que una página puede dividirse a pesar de CSS: comprobar nombres extremos.

Completar build en entorno con acceso a fuentes, revisar los riesgos de seguridad existentes y confirmar estrategia de recuperación/rollback antes de cualquier publicación autorizada. No publicar desde esta ejecución. Los informes anteriores se encuentran en la rama de seguridad y no se han copiado ni mezclado con esta rama.

## Validación visual posterior — 4 de noviembre de 2026

Se abrió en Google Chrome headless una aplicación Next independiente en `tests/mesas/preview`, servida exclusivamente en `127.0.0.1:3147`. Usa el mismo componente, CSS y transformación del producto con `tests/mesas/fixtures.mjs`; no importa Firebase, AuthProvider ni el layout de la aplicación principal. No usa credenciales. El controlador CDP `tests/mesas/visual-check.mjs` bloquea solicitudes de la página a destinos distintos del servidor local: resultado observado, cero solicitudes externas y cero excepciones de navegador. No se ha navegado a producción. No se instalaron dependencias.

### Defectos observados y corrección limitada

1. Las advertencias aparecían solas en una primera página casi vacía del plano. Ahora su detalle se imprime con los listados y el plano conserva un contador visible de incidencias. Los planos finales ocupan una página.
2. El contenedor modal provocaba márgenes/cabeceras de continuación recortados al paginar en Chrome. Durante `beforeprint` el mismo diálogo pasa a apertura no modal, se imprime sin caja propia (`display: contents`) y en `afterprint` recupera su estado modal. No se copian ni vuelven a consultar datos. Se retiraron los listeners en la limpieza del componente.
3. Las tablas distribuían tres columnas iguales pese a los estilos de cabecera, dejando demasiado poco espacio a nombres largos. Un `colgroup` explícito fija 20% / 60% / 20%. También se acotó el modelo de caja y el margen de título para que el documento no dependa de resets externos.

Solo se corrigieron presentación y ciclo de impresión; no se modificaron editor, autenticación, reglas, datos o contratos en esta validación. Se añadió únicamente infraestructura local de fixtures y previsualización, documentada en `tests/mesas/preview/README.md`.

### Documentos efectivamente generados

| PDF ficticio | Resultado |
| --- | --- |
| `/tmp/mesas-visual-pdfs/plan-a4.pdf` | 1 página, A4 horizontal (aprox. 842 × 595 puntos). |
| `/tmp/mesas-visual-pdfs/plan-a3.pdf` | 1 página, A3 horizontal (aprox. 1191 × 842 puntos). |
| `/tmp/mesas-visual-pdfs/list-a4.pdf` | 15 páginas, A4 vertical (aprox. 595 × 842 puntos). |

Fixtures: 20 mesas, 335 personas (330 invitados numerados, dos novios y tres personas para casos de no asignado, mesa inexistente y asiento duplicado). Cuatro formas, rotaciones 0/45/90/−45°, coordenadas negativas, mesa vacía y nombres extensos con acentos/ñ. Los planos contienen las 20 mesas y conservan la distribución original sin deformación. A3 amplía la representación física; con muchas mesas las etiquetas de plano continúan siendo pequeñas, especialmente en A4. No se garantiza lectura cómoda en una sala a distancia: el listado mantiene los nombres completos legibles.

Se inspeccionaron imágenes rasterizadas localmente desde los PDF mediante PDFKit: ambos planos, primera/última página y continuaciones de listados, además de hojas de revisión de las 15 páginas. Ante artefactos de miniatura de PDFKit, se contrastaron páginas de continuación mediante dibujo directo a doble resolución y coordenadas de texto. No se observaron recortes o solapamientos en el resultado final comprobado; las cabeceras se repiten y las filas ordinarias permanecen enteras.

Comprobaciones adicionales del PDF: los marcadores `(000)` a `(329)` aparecen exactamente una vez; cada nombre completo de esos 330 invitados, incluido su marcador, está íntegro dentro de una página (normalizando espacios de saltos de línea); cero páginas vacías. La comprobación de cajas de caracteres de las 15 páginas encontró cero caracteres fuera del margen aproximado de 12 mm (tolerancia de 2 puntos). Estos controles complementan la inspección visual, no son una garantía para cualquier dato o impresora.

### Pruebas repetidas y límites pendientes

- `node --test tests/mesas/print.test.mjs`: **7 aprobadas, 0 fallos**, incluida comprobación de coherencia de los fixtures visuales.
- ESLint de página de mesas, componente, utilidad, tests, fixtures, controlador visual y fuentes/configuración de la previsualización: **0 errores, 0 avisos**. `git diff --check`: correcto.
- Las solicitudes locales de la previsualización compilaron y respondieron HTTP 200. No se repitió el build completo ni se resolvió la descarga de fuentes de la aplicación principal: sigue vigente la limitación del build documentada anteriormente.
- No verificados: diálogo de impresión manual del sistema, impresora física, Safari/Firefox/Edge, integración con sesión/Firestore, fallos de red/escrituras y combinación con el layout real de producción. No se utilizaron personas reales para probar esos flujos. Los PDF se generaron mediante el motor de impresión de Chrome (`Page.printToPDF`, respetando CSS de página), no mediante una impresora ni el diálogo interactivo.
- No se promete evitar cortes de una fila cuyo contenido por sí solo supere una página. No se han cambiado posiciones ni reducido nombres para ocultar posibles incoherencias.

`main` permanece en `9480d90`; rama actual `feature/mesas-print`. Sin commits, push, merges ni despliegues. Reglas principales, Firebase, autenticación y dependencias siguen sin cambios. Los PDF y capturas son temporales, fuera del repositorio. La previsualización se puede reproducir siguiendo su README.

## Ajuste final: una mesa por página y presentación

Los listados fuerzan un salto de página antes de cada sección posterior a la primera. Cada mesa comienza en una hoja propia; «Sin asignar» y «Mesa inexistente» también tienen hojas independientes. No se añade un salto tras la última sección, evitando páginas finales vacías. Una mesa excepcional cuyo contenido supere una hoja continúa en la siguiente sin recortar personas; nunca comparte esa continuación con la mesa siguiente. El mapa no cambia su paginación.

Se ajustó la pantalla del documento a la estética de El Convite: fondo claro, cabecera de marca, fuentes heredadas de la web con fallback local, detalles dorados, controles agrupados y botón principal oscuro. Estos elementos se ocultan en papel. El estilo del PDF conserva sus márgenes y legibilidad. No se ha publicado.

Verificación con la aplicación aislada y Chrome: plano A4 y A3, una página cada uno; listado con fixtures, **22 páginas** (20 mesas y dos apartados), cero páginas vacías, ninguna página con dos mesas y marcadores de los 330 invitados numerados presentes exactamente una vez. Inspección de la pantalla y de una página de mesa con 21 invitados, con nombres largos completos. Cero solicitudes externas o excepciones del navegador. Siete tests aprobados y lint del componente sin errores ni avisos. Archivos funcionales afectados en este ajuste: `MesasPrintDocument.jsx` y `mesasPrint.css`. Sin cambios de datos, dependencias, reglas, commits o despliegues; las limitaciones de integración y otros navegadores continúan vigentes.
