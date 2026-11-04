# Previsualización aislada de impresión

Desde la raíz del repositorio:

```sh
./node_modules/.bin/next dev tests/mesas/preview --webpack --hostname 127.0.0.1 --port 3147
```

Abrir http://127.0.0.1:3147 y pulsar «Abrir documento ficticio». Esta aplicación Next independiente importa únicamente el renderer real de impresión, la transformación pura y fixtures. No usa el layout principal, fuentes remotas, AuthProvider ni SDK Firebase. No iniciar la aplicación principal para esta prueba.

Validación PDF automatizada opcional, con Google Chrome ya instalado (sin instalar dependencias):

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-first-run --no-default-browser-check --disable-background-networking --disable-component-update --disable-sync --user-data-dir=/tmp/mesas-visual-chrome --remote-debugging-address=127.0.0.1 --remote-debugging-port=9337 about:blank
node tests/mesas/visual-check.mjs
```

El script usa el WebSocket incorporado en Node moderno y el protocolo de Chrome. Solo permite solicitudes de la página a `127.0.0.1:3147`, espera la hidratación de React, abre el documento y genera los tres PDF en `/tmp/mesas-visual-pdfs`. Imprime los errores de navegador y solicitudes externas bloqueadas. El puerto de depuración debe mantenerse en loopback y el perfil temporal no contiene sesiones personales. Cerrar ambos procesos al terminar. Los artefactos son ficticios y temporales, no se incluyen en Git.

Este ejercicio prueba el documento y su paginación; no valida la integración con Firestore ni la autenticación de la aplicación principal.
