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

## Descarga Excel — una sola hoja

Añadido «Descargar Excel» a la misma vista de documentos. Usa la instantánea confirmada ya preparada, con los mismos bloqueos ante errores/carga pendiente. Archivo `.xlsx` real, una hoja «Distribución de mesas», con bloques de mesas consecutivos, títulos destacados, cabeceras y columnas Asiento/Nombre/Asistencia. Incluye novios, mesas vacías, sin asignar, huérfanos y advertencias; no incorpora datos adicionales de invitados. El archivo avisa de que editarlo no modifica la aplicación.

Generación local en `utils/mesasExcel.mjs`, importada bajo demanda desde el botón; no hay peticiones a servidor, escrituras en Firebase, nuevos modelos ni dependencias nuevas. Paquete OOXML con ZIP sin compresión, CRC32 y estilos acotados a este documento. Las celdas de texto usan `inlineStr`, sin fórmulas ni enlaces externos; se escapan XML y secuencias especiales de OOXML. Los textos que superen 32767 caracteres provocan error explícito en vez de truncamiento silencioso. Se revoca la URL Blob después de iniciar la descarga. El archivo solo se conserva donde el navegador del usuario lo descarga.

Pruebas: `node --test tests/mesas/print.test.mjs tests/mesas/excel.test.mjs`, **10 aprobadas / 0 fallos**. El test de Excel emplea un lector independiente de ZIP/CRC y XML mediante la biblioteca estándar de Python 3 (requisito de ese test, no del producto). Verifica hoja única, todas las personas ficticias, Unicode, caracteres XML, nombres con aspecto de fórmula, celdas de texto y bloqueos ante errores. Lint de componente, generador y test: sin errores ni avisos. `git diff --check`: correcto.

Se pulsó el botón real con Chrome en la previsualización aislada: descarga de `Mesas_Maria_Jose_ficticia_y_Inigo_ficticio_.xlsx` en `/tmp/mesas-excel-downloads`, con cero peticiones externas y cero excepciones del navegador. Se volvió a comprobar el ZIP/CRC y cada XML del archivo descargado. No se ha verificado visualmente su apertura en Microsoft Excel o LibreOffice: esa comprobación de compatibilidad sigue pendiente. Los artefactos de prueba son temporales y no se guardan en el repositorio.

Implementación local en `feature/mesas-excel`, sin commits, push ni despliegues y sin modificar `main`. Archivos de este ajuste: `components/planner/MesasPrintDocument.jsx`, `utils/mesasExcel.mjs`, `tests/mesas/excel.test.mjs` y este informe. No se repitió el build completo de la aplicación principal; la compilación local de la vista aislada y del módulo descargado respondió correctamente.

Referencia de formato consultada: [Microsoft: estructura de SpreadsheetML](https://learn.microsoft.com/en-us/office/open-xml/spreadsheet/structure-of-a-spreadsheetml-document).

## Reducción de esperas al preparar y descargar

Se identificaron tres esperas evitables en el código (sin medir sesiones reales): espera global de escrituras Firebase antes de abrir el documento, tres lecturas adicionales incluso con listeners ya sincronizados, y espera de todas las fuentes de la web antes de invocar la impresión. Excel también se importaba por primera vez al pulsar su botón.

Cambios locales:

- `utils/loadMesasPrint.mjs` separa la carga del documento del SDK, para probar su coordinación sin producción. Reutiliza las tres instantáneas completas de la boda actual únicamente con `fromCache === false` y `hasPendingWrites === false`. Una instantánea ausente, fallida, de otra boda o sin confirmar fuerza las lecturas de servidor, que siguen comprobando metadatos. No se convierte una lectura cacheada en prueba de persistencia.
- El editor conserva metadatos de sus listeners usando `includeMetadataChanges`. La consulta de invitados es completa, sin `orderBy` que excluya registros sin nombre; el orden alfabético del editor se aplica localmente y los nombres no textuales se representan sin modificar documentos. La exportación recibe los datos completos originales. El estado se reinicia al cambiar boda o usuario.
- Se esperan únicamente las promesas de las escrituras existentes del editor de mesas, no toda la cola global de Firebase (por ejemplo logs administrativos ajenos). Se conservan el bloqueo ante fallos, pendientes y nuevas escrituras durante la preparación. Los errores síncronos de una escritura también quedan registrados.
- Mensajes distintos para guardados pendientes, lectura lenta y permisos denegados. Las preparaciones caducadas no inician nuevas lecturas tras resolverse tarde sus guardados. Se mantiene el límite de espera de 15 segundos para operaciones que realmente dependan de servidor; no se añaden reintentos ni lecturas periódicas.
- Excel se carga con la vista, eliminando la petición de un chunk adicional en el clic. No se almacena ningún archivo. Impresión llama directamente a `window.print()`; la salida impresa ya usa Arial y no necesita bloquearse por fuentes remotas de la interfaz.

Validación: **16 tests aprobados**, con nuevos casos de carga rápida sin lecturas, caché, pendientes, ausencia/error de listeners, otra boda, escritura fallida, modificación concurrente, permisos y caducidad. Los archivos nuevos y el componente pasan lint sin errores/avisos. Lint del archivo completo de mesas vuelve a señalar la inicialización móvil preexistente (`setZoom` dentro de `useEffect`, línea desplazada a 158); ese código no se ha modificado ni se ha desactivado la regla. `git diff --check` correcto.

Medición orientativa Node, con los mismos 335 registros ficticios: apertura con transformación en ~1,5 ms, 0 lecturas adicionales y generación XLSX en ~6,3 ms en la ejecución final (otra ejecución previa de Excel midió ~28 ms). Son medidas locales, variables según equipo/calientamiento, sin latencia de red ni renderizado de navegador: **no son una medición ni una garantía de tiempos en producción**. No se ha consultado Firestore real ni verificado este nuevo flujo con sus respuestas reales. Se conserva la necesidad de prueba de integración aislada antes de publicar.

La optimización está exclusivamente en `feature/mesas-excel`; no se ha hecho commit, push, merge ni despliegue. Las reglas, autenticación, dependencias y datos permanecen intactos.

Criterio de metadatos contrastado con [Firebase: datos offline y metadatos](https://firebase.google.com/docs/firestore/manage-data/enable-offline).

## Comprobación del clic de impresión antes de publicar

El usuario concreta que la demora sucede entre pulsar «Imprimir / Guardar como PDF» y abrir el diálogo del navegador. Se añadió a `tests/mesas/visual-check.mjs` una regresión: simular `document.fonts.ready` como promesa que nunca resuelve y comprobar que el clic invoca `window.print()` sin esperar. Resultado en Chrome aislado: `printInvokedWithoutWaitingForFonts: true`, cero excepciones y cero solicitudes externas. Se regeneraron los tres PDF ficticios. Este test comprueba la ausencia de espera de la aplicación; no mide la ventana nativa ni garantiza el tiempo interno de paginación del navegador.

La compilación completa `npm run build` se repitió con acceso a las fuentes y **terminó con código 0**. Se mantiene un aviso preexistente del fallback opcional `firebase/admin.js` por ausencia del archivo local `service-account.json`; no se han añadido credenciales ni cambiado el Admin SDK. Los 16 tests siguen aprobados y el lint del componente/archivos nuevos/controlador visual pasa. El error preexistente del efecto móvil en lint de la página completa sigue documentado.

El usuario ha autorizado expresamente crear commit en esta rama, push y fusión/push a main para activar Vercel. No se publican reglas ni se migran datos; la rama de seguridad continúa fuera de este cambio. Los párrafos previos «sin commit/despliegue» describen la etapa local anterior a esta autorización.
