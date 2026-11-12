# Mesa de ayuda ACME

**Prototipo académico · Datos ficticios**

Prototipo web de una mesa de ayuda informática desarrollado por estudiantes de Ingeniería
Informática para las actividades 2.3 y 2.4 de *Proyectos Colaborativos de Innovación Regional*.

En las actividades 2.1 y 2.2 propusimos una herramienta para registrar problemas
informáticos, asignar responsables y consultar su avance. Este repositorio contiene la
maqueta digital funcional con pantallas conectadas y simulación de roles.

> Es una propuesta académica cuya utilidad en ACME Chile debe validarse. No es una
> herramienta oficial de la empresa, no describe fallas reales de ella y su diseño no
> representa una identidad corporativa. Todos los nombres y casos son ficticios.

## Cómo abrirlo

No requiere instalación ni conexión a un servidor.

1. Descargue o clone este repositorio.
2. Abra `index.html` con doble clic. Se abrirá en el navegador predeterminado; se
   recomienda una versión actual de Chrome, Edge o Firefox.

Si el navegador restringe archivos locales, puede servir la carpeta con cualquier servidor
estático. Por ejemplo, con Node.js instalado:

```bash
npx serve .
```

y abrir la dirección que indique (por ejemplo `http://localhost:3000`).

Las tipografías se cargan desde Google Fonts. Sin internet, el prototipo funciona igual
con las fuentes del sistema.

## Recorrido sugerido (2 minutos)

1. En **Inicio**, pulse **Entrar como trabajador** y complete **Reportar un problema**.
2. En la confirmación, anote el número (por ejemplo `ACME-005`) y pulse **Ver seguimiento del caso**.
3. Cambie a **Soporte TI** con el selector **Ver como** (arriba a la derecha). Se abre el mismo caso.
4. Asigne un responsable, pulse **Iniciar atención** y luego **Marcar como resuelto** escribiendo la solución.
5. Vuelva a **Trabajador**: confirme y cierre el caso, o indique que **el problema continúa**.

Los casos de ejemplo `ACME-001` a `ACME-004` están en estados distintos para probar cada pantalla.
`ACME-002` está resuelto y espera la confirmación del trabajador.

## Funciones

| Pantalla | Qué permite |
| --- | --- |
| **Inicio** | Elegir la vista Trabajador o Soporte TI. Explica el flujo del caso y cómo se guardan los datos. |
| **Reportar problema** | Formulario con nombre, área, equipo y descripción. Valida cada campo con mensajes que indican cómo corregir, conserva lo escrito ante errores (también al recargar la pestaña) y evita registrar dos veces el mismo caso por pulsaciones repetidas. |
| **Confirmación** | Muestra el número único del caso (`ACME-001`, `ACME-002`…) y lleva directo al seguimiento. |
| **Seguimiento** | Busca un caso por número (acepta `ACME-005`, `acme-5` o `5`). Muestra descripción, responsable, estado, etapas e historial con fecha y hora. Explica qué hacer si el caso no existe. |
| **Panel de soporte** | Lista los casos, del más reciente al más antiguo, y los filtra por estado (el filtro queda en la dirección de la página). |
| **Detalle de soporte** | Asignar o cambiar un responsable ficticio, iniciar la atención, agregar comentarios y marcar como resuelto con la solución aplicada. |

### Flujo del caso

`Recibido → En atención → Resuelto → Cerrado`

- Para pasar a **En atención** debe existir un responsable.
- Para marcar **Resuelto**, soporte debe escribir la solución aplicada.
- El trabajador puede **confirmar y cerrar** el caso, o indicar que **el problema continúa**
  (explicando qué sigue fallando). En ese caso vuelve a **En atención** con el mismo responsable.
- Cada cambio queda en el historial con fecha, hora y autor, y se ve igual en ambas vistas.

El [diagrama del recorrido](docs/diagrama-recorrido.md) muestra pantallas y estados.

### Roles

El cambio de rol es una **simulación**: no hay inicio de sesión ni contraseñas. El selector
**Ver como** cambia la vista y, si hay un caso abierto, lo mantiene en pantalla para
continuar con el otro rol.

## Datos y almacenamiento

- Los datos se guardan en el `localStorage` **de este navegador**. Otra persona, en otro
  equipo o navegador, no verá los mismos casos. Esta versión **no sincroniza usuarios ni equipos**.
- Si se abre en dos pestañas del mismo navegador, los cambios de una se reflejan en la otra.
- **Restablecer datos de ejemplo** (al pie de cada página) borra los casos y cambios del
  navegador y recarga los cuatro casos de ejemplo. Antes pide confirmación.
- Si el navegador bloquea el almacenamiento (por ejemplo, en modo privado estricto), si se
  llena o si los datos guardados están dañados, aparece un aviso que explica qué pasa. La
  demostración sigue funcionando en memoria y se ofrece restablecer los datos cuando corresponde.
- Todo el texto ingresado se muestra como texto: nunca se interpreta como HTML ni código.

## Dirección visual

Elegimos una dirección de **ventanilla de atención**, coherente con una herramienta interna de soporte:

- **Paleta sobria**: fondo gris frío (`#F3F5F4`), tinta verde oscuro (`#1E2B29`) y verde
  petróleo (`#0B5563`) para las acciones. Evitamos el azul genérico de software y los
  degradados. Los contrastes de texto cumplen WCAG AA.
- **Estados por texto y color**: Recibido (índigo), En atención (ámbar), Resuelto (verde)
  y Cerrado (gris). El nombre del estado siempre aparece escrito.
- **Tipografía**: *Public Sans*, de uso institucional y muy legible, para la interfaz;
  *Barlow Condensed* solo para títulos y números de caso.
- **Un solo elemento distintivo**: el número del caso se presenta como un número de atención
  impreso con perforación, porque es lo que la persona debe recordar. El resto de la interfaz
  es deliberadamente sencillo.
- **Sin métricas inventadas ni decoración**. La única animación es la breve aparición del
  comprobante, y se desactiva si el sistema pide reducir el movimiento.

Accesibilidad y usabilidad: diseño adaptable desde 320 px, navegación completa con teclado,
foco visible, enlace para saltar al contenido, campos con etiqueta y ayuda, errores junto a
cada campo con un resumen al inicio, controles táctiles de al menos 44 px y avisos para
lectores de pantalla.

## Estructura

```
index.html                 Estructura base, encabezado, pie y diálogo de restablecer
css/styles.css             Estilos y tokens de diseño
js/store.js                Datos, reglas del flujo y localStorage
js/app.js                  Pantallas, navegación y acciones
pruebas/prueba_navegador.py  Prueba técnica automatizada (Playwright)
pruebas/resultado-ultima-ejecucion.txt  Resultado de la última ejecución
docs/                      Evidencia para la actividad (ver abajo)
docs/capturas/             Capturas reales tomadas por la prueba automatizada
```

## Dos tipos de prueba: técnica y académica

### 1. Pruebas técnicas (ejecutadas durante el desarrollo)

Estas pruebas las ejecutó el desarrollo del prototipo, **sin participantes**. Verifican que
el software funciona; no miden si es útil ni fácil de usar para personas reales.

- **Revisión de código** con las reglas de *Web Interface Guidelines*. Los hallazgos y
  correcciones están en [docs/revision-diseno.md](docs/revision-diseno.md).
- **Prueba automatizada en navegador** (Chromium mediante Playwright): 75 comprobaciones
  que cubren
  - registro válido, validación de campos, conservación de lo escrito y doble envío;
  - consulta de un caso existente, uno inexistente y números con formato inválido;
  - asignación de responsable y reglas de cambio de estado;
  - resolución, reapertura y cierre, con continuidad del caso al cambiar de rol;
  - filtro del panel, persistencia al recargar y restablecimiento con confirmación;
  - texto seguro (etiquetas HTML ingresadas se muestran como texto);
  - navegación con teclado y pantalla móvil de 390 px (sin desplazamiento horizontal y
    controles de al menos 44 px), y sin desplazamiento horizontal a 320 px;
  - almacenamiento bloqueado y datos guardados dañados.

  El resultado de la última ejecución está en
  [pruebas/resultado-ultima-ejecucion.txt](pruebas/resultado-ultima-ejecucion.txt) y las
  capturas en [docs/capturas/](docs/capturas/).

Para repetirla se necesita [uv](https://docs.astral.sh/uv/):

```bash
uv run --python 3.12 --with playwright python -m playwright install chromium
```

```bash
uv run --python 3.12 --with playwright python pruebas/prueba_navegador.py
```

**No verificado técnicamente:** Safari y Firefox (la prueba usa solo Chromium), lectores de
pantalla reales (NVDA, VoiceOver) y teléfonos físicos (se emuló un móvil en Chromium).

### 2. Simulación académica (la realiza el equipo)

La simulación con personas en los roles de trabajador y soporte **aún no se ha realizado**.
Para hacerla:

- [Guion para la simulación de roles](docs/guion-simulacion-roles.md)
- [Plantilla de registro](docs/plantilla-registro-simulacion.md): participante, tarea,
  logro, dificultad, comentario y evidencia.
- [Plantilla de mejoras](docs/plantilla-mejoras.md): hallazgo, prioridad, decisión, cambio
  realizado y efecto esperado.

Las plantillas están vacías a propósito: deben completarse con lo que ocurra en la simulación.

## Limitaciones

- Sin autenticación: cualquiera puede elegir cualquier rol.
- Datos solo en el navegador local; no hay servidor, base de datos ni sincronización entre
  personas o equipos.
- Responsables de soporte fijos y ficticios (cuatro nombres de ejemplo).
- Sin notificaciones por correo ni avisos cuando cambia un caso.
- Sin adjuntos (capturas de pantalla del problema), prioridades ni tiempos de respuesta.
- Un caso cerrado no se puede reabrir; un problema nuevo se registra como caso nuevo.
- Las áreas de la empresa del formulario son genéricas y deben ajustarse con información real.
- La utilidad para ACME Chile no está validada: es el objetivo de las próximas etapas.

## Versión

Primera versión estable, antes del testeo con participantes. Se conserva como referencia
para comparar con los cambios posteriores a la simulación.
