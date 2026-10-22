# Auditoría breve: Gestor de bodas

Fecha: 22 de octubre de 2026.

## Objetivo y alcance de la revisión

Aplicación web para organizar bodas, centralizar la información de los invitados y ofrecer invitaciones digitales personalizadas. La estructura permite gestionar varias bodas, con datos agrupados por boda y un panel de administración global.

Este informe se basa en el código y la configuración del repositorio. Las funciones indicadas tienen implementación, pero no se ha verificado su funcionamiento completo en navegador ni el entorno desplegado. No es una auditoría de seguridad exhaustiva.

## Perfiles y flujo principal

- **Administrador:** revisa solicitudes de alta de bodas, las aprueba o rechaza, administra usuarios y bodas, puede suspender cuentas, solicitar restablecimientos de contraseña y acceder al panel de una boda en modo de gestión administrativa. Algunas acciones generan registros de auditoría.
- **Pareja o usuario organizador:** se registra mediante correo y contraseña o Google, solicita la creación de su boda y, tras la aprobación, accede al panel de organización.
- **Invitado:** accede mediante una URL con identificadores de boda e invitación, sin registro, para consultar la invitación y enviar sus respuestas.

## Funcionalidades implementadas

| Módulo | Alcance observado en el código |
| --- | --- |
| Acceso y cuentas | Registro, inicio de sesión, acceso con Google, cierre de sesión y gestión del estado del usuario. |
| Panel de resumen | Indicadores de invitados y presupuesto, con accesos a los módulos principales. |
| Invitados | Creación, edición y eliminación; agrupación por invitación o unidad familiar; estados de asistencia; generación de enlaces y envío mediante enlaces de WhatsApp. |
| Mesas | Plano visual con mesas desplazables, asignación de invitados y grupos, gestión de asientos y persistencia de posiciones. |
| Presupuesto | Gastos por categorías, costes fijos y variables por asistente, importes pagados y pendientes. |
| Autobuses | Configuración de trayectos de ida y vuelta, paradas y horarios; consulta de las elecciones de los invitados. |
| Editor de invitación | Personalización de colores, tipografía e imágenes; bloques configurables y ordenables; agenda, ubicación, cuenta atrás, galería, datos bancarios y vista previa. |
| Invitación pública | Confirmación de asistencia, alergias y dietas, selección de autobús, canciones y mensajes; enlaces de calendario y descarga de archivo de calendario; fecha límite de respuesta configurada desde el editor. |
| Respuestas y documentos | Revisión de alergias, mensajes y canciones, estados de aprobación y exportación a PDF para catering y DJ. |
| Administración | Gestión global de solicitudes, bodas y usuarios; eliminación mediante acciones de servidor y acceso administrativo al panel de las bodas. |

La inclusión de un IBAN permite mostrar datos para regalos; no se ha identificado una pasarela de pagos. El uso de WhatsApp y calendarios se realiza mediante enlaces o archivos, sin evidencia de integración con sus APIs de gestión.

## Tecnologías

Versiones declaradas en `package.json`; los símbolos `^` permiten actualizaciones compatibles dentro del rango.

| Tecnología | Versión declarada | Uso |
| --- | --- | --- |
| Next.js | 16.1.6 | Framework web, App Router, rutas dinámicas y Server Actions. |
| React / React DOM | 19.2.3 | Interfaces y componentes. |
| JavaScript y JSX | Sin TypeScript identificado | Lenguaje del proyecto. |
| Firebase SDK | ^12.8.0 | Authentication, Cloud Firestore y Cloud Storage. |
| Firebase Admin SDK | ^13.6.0 | Verificación de tokens y operaciones administrativas en servidor. |
| Tailwind CSS | ^3.4.17 | Estilos y diseño adaptable. |
| PostCSS / Autoprefixer | ^8.5.6 / ^10.4.23 | Procesamiento de estilos. |
| Lucide React | ^0.563.0 | Iconos. |
| react-draggable | ^4.5.0 | Movimiento de mesas en el plano. |
| jsPDF / jsPDF-AutoTable | ^4.2.1 / ^5.0.8 | Documentos PDF con tablas. |
| ESLint / eslint-config-next | ^9 / 16.1.6 | Análisis estático. |
| npm | Archivo package-lock.json | Gestión de dependencias y scripts. |

También se declara `@tailwindcss/postcss` versión ^4, aunque la configuración activa utiliza el plugin `tailwindcss` de la versión 3. Conviene revisar esta coexistencia al mantener las dependencias.

## Arquitectura y datos

Una única aplicación Next.js contiene la web pública, el panel de la pareja y el panel administrativo. La mayoría de los módulos interactúan directamente desde el navegador con Firebase. React Context centraliza el estado de autenticación y el acceso administrativo a bodas. Se utilizan suscripciones `onSnapshot` para actualizar información en tiempo real en distintos módulos.

Firebase proporciona los servicios principales:

- **Authentication:** identidad con correo y contraseña o Google.
- **Cloud Firestore:** base de datos documental NoSQL. Colecciones principales: `users`, `weddings`, `wedding_requests` y `audit_logs`. Cada boda contiene subcolecciones como `guests`, `invitations`, `tables` y `expenses`.
- **Cloud Storage:** imágenes de las invitaciones.
- **Admin SDK:** operaciones privilegiadas desde `app/actions.js`, con comprobación de token y rol administrativo.

Existen reglas locales para Firestore y Storage. La configuración del Admin SDK contempla credenciales mediante variables de entorno y contiene referencias a Vercel, pero esto no confirma que el proyecto esté desplegado allí ni permite determinar su infraestructura activa.

## Estado técnico y puntos pendientes

1. **Permisos de usuario excesivos en Firestore — prioridad alta.** Las reglas permiten al usuario escribir su propio documento completo sin limitar campos como `role` o `weddingId`. Si se desplegaran tal como están, permitirían modificar los atributos de los que dependen las comprobaciones de autorización.
2. **Datos de invitados con acceso público — prioridad alta.** Las reglas permiten lectura pública de bodas, invitaciones e invitados, y actualización pública de documentos de invitados sin restricciones de campos. El enlace personalizado no constituye por sí solo un control de acceso en estas reglas. Es necesario delimitar qué datos son públicos y qué respuestas puede modificar cada invitado.
3. **Storage con escritura demasiado amplia.** Cualquier usuario autenticado puede escribir en cualquier ruta, sin comprobación de pertenencia a una boda ni límites definidos en reglas para tipo o tamaño de archivo.
4. **Borrado incompleto de bodas.** La acción elimina invitados y el documento de la boda, pero no contempla eliminar otras subcolecciones, como invitaciones, mesas o gastos, ni los archivos de Storage. Pueden quedar datos huérfanos. Además, la eliminación de usuario no comprueba el resultado de la eliminación de su boda antes de continuar.
5. **Calidad del código.** La ejecución actual de `npm run lint` termina con **29 incidencias: 18 errores y 11 advertencias**, relacionadas, entre otras cosas, con comillas en JSX, actualizaciones de estado dentro de efectos, dependencias de hooks e imágenes sin optimizar.
6. **Pruebas y documentación.** No se ha identificado una suite de pruebas automatizadas ni configuración de integración continua en los archivos revisados. El README mantiene el texto inicial de Next.js y no documenta los módulos, el modelo de datos ni la configuración necesaria del proyecto.

Los hallazgos de permisos se refieren a las reglas del repositorio: no se han consultado ni contrastado con las reglas activas de Firebase. Tampoco se ha ejecutado una compilación de producción ni se han evaluado rendimiento, costes, capacidad o accesibilidad en navegador.

## Texto breve para incorporar a un informe

El proyecto es una aplicación web de gestión de bodas desarrollada con Next.js 16 y React 19, utilizando JavaScript, JSX y Tailwind CSS. Su backend se apoya principalmente en Firebase Authentication, Cloud Firestore y Cloud Storage, con Firebase Admin SDK para operaciones privilegiadas. Incluye perfiles de administrador y organizador, además de acceso público a invitaciones personalizadas para invitados. El alcance implementado abarca solicitudes de alta, gestión de invitados y confirmaciones, distribución visual de mesas, presupuesto, transporte, edición de invitaciones y exportación de documentos PDF para catering y DJ. La revisión del repositorio muestra una base funcional amplia, pendiente de validación integral, corrección de incidencias de análisis estático, mejora de documentación y refuerzo de permisos y procesos de eliminación de datos.
