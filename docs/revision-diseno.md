# Revisión de diseño, accesibilidad y usabilidad

Revisión técnica hecha durante el desarrollo con la skill **web-design-guidelines**
(reglas de *Web Interface Guidelines*, Vercel Labs, obtenidas el 2026-11-12). Se revisaron
`index.html`, `css/styles.css`, `js/app.js` y `js/store.js` contra todas las reglas.

Es una revisión de código y de capturas. **No es una prueba con usuarios.**

## Hallazgos y correcciones

| Archivo | Hallazgo | Corrección |
| --- | --- | --- |
| `index.html` | `theme-color` no coincidía con el fondo del encabezado | Cambiado a `#ffffff` |
| `index.html` | El enlace «Saltar al contenido» usaba `#contenido`, que el enrutador interpretaba como una pantalla inexistente | El enlace mueve el foco al contenido sin cambiar la ruta (`js/app.js`) |
| `index.html`, `js/app.js` | Nombre de la herramienta y números de caso podían traducirse automáticamente | `translate="no"` en la marca y en los números de caso |
| `css/styles.css` | La animación del comprobante usaba `clip-path` | Ahora solo anima `opacity` y `transform`, y se desactiva con `prefers-reduced-motion` |
| `css/styles.css` | Sin `-webkit-tap-highlight-color` definido | Definido con el color de la interfaz |
| `css/styles.css` | Celdas de la tabla sin corte para textos largos sin espacios | `overflow-wrap: anywhere` en celdas |
| `css/styles.css` | Contenedores de ancho completo sin márgenes seguros (pantallas con muesca) | `env(safe-area-inset-*)` en los márgenes laterales |
| `css/styles.css` | Fechas cortadas en dos líneas en «Datos del caso» (detectado en captura) | `white-space: nowrap` en fechas y columna de etiquetas más angosta |
| `css/styles.css` | Anillo de foco sobre títulos al cambiar de pantalla (detectado en captura) | Los títulos y avisos que reciben foco por programa no muestran anillo; los controles sí |
| `css/styles.css` | Hueco vacío antes del historial en escritorio (detectado en captura) | La fila del resumen ya no se estira (`grid-template-rows: auto 1fr`) |
| `js/app.js` | Al enviar con errores, el foco iba al resumen y no al primer campo | El foco va al primer campo con error; el resumen se anuncia como alerta |
| `js/app.js` | El borrador del reporte se perdía al recargar | Se guarda en `sessionStorage` hasta registrar el caso |
| `js/app.js` | Un comentario, solución o motivo escrito se perdía sin aviso al recargar o cerrar | Aviso `beforeunload` si hay texto sin enviar |
| `js/app.js` | En el detalle de soporte los títulos saltaban de `h1` a `h3` | Niveles de título según el contexto (`h1` → `h2` en soporte, `h2` → `h3` en seguimiento) |
| `js/app.js` | Los avisos tenían `role="status"` y además recibían foco (doble lectura) | Se quitó el `role`; el foco basta para anunciarlos |
| `js/store.js` | Comillas rectas en los textos de ejemplo | Comillas tipográficas “…” |

## Reglas revisadas que no aplican o se cumplieron desde el inicio

- **Title Case en títulos y botones:** no aplica. En español los títulos se escriben con mayúscula inicial (tipo oración).
- **Imágenes, video, hidratación del servidor y listas virtualizadas:** el prototipo no usa imágenes ni servidor, y la lista de casos es breve.
- **Cumplidas desde la primera versión:** etiquetas en todos los campos, enlace para saltar al contenido, foco visible con `:focus-visible`, `touch-action: manipulation`, fechas con `Intl.DateTimeFormat`, estado del filtro en la URL, confirmación antes de restablecer, `overscroll-behavior: contain` en el diálogo, zoom sin bloquear, mensajes de error con indicación de cómo corregir y texto de usuario insertado siempre como texto.
