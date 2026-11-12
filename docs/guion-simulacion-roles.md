# Guion para la simulación de roles

Mesa de ayuda ACME · Prototipo académico · Datos ficticios

Este guion sirve para que el equipo realice la **simulación académica** del prototipo
(actividades 2.3 y 2.4). Es distinto de las pruebas técnicas automatizadas descritas en
el README: aquí participan personas y se observa cómo usan la herramienta.

> La simulación no reemplaza una validación en ACME Chile. Sus resultados describen
> cómo se comportó el prototipo con los participantes de la actividad, no la realidad
> de la empresa.

## Roles

| Rol | Quién | Qué hace |
| --- | --- | --- |
| Facilitador/a | Integrante del equipo | Lee las tareas, controla el tiempo y no ayuda a usar la pantalla salvo que la persona quede detenida. |
| Trabajador/a | Participante | Reporta un problema, consulta su caso y confirma o rechaza la solución. |
| Soporte TI | Participante | Revisa el panel, asigna responsable, comenta y registra la solución. |
| Observador/a | Integrante del equipo | Completa la [plantilla de registro](plantilla-registro-simulacion.md) con lo que ve y escucha. |

Una misma persona puede tomar los dos roles de usuario en turnos distintos.

## Preparación (5 minutos)

1. Abrir `index.html` en el navegador del equipo de prueba (ver README).
2. Pulsar **Restablecer datos de ejemplo** al final de la página y confirmar, para partir
   con los cuatro casos de ejemplo (ACME-001 a ACME-004).
3. Explicar a los participantes solo esto:
   - «Es un prototipo de una mesa de ayuda informática con datos ficticios.»
   - «Queremos observar la herramienta, no evaluarte a ti.»
   - «Piensa en voz alta: di lo que buscas y lo que esperas que pase.»
4. No mostrar el recorrido antes de empezar. El objetivo es comprobar si se entiende sin explicación.

## Tareas

Leer cada tarea en voz alta. Anotar si se logró sin ayuda, con ayuda o no se logró.

### Parte A · Trabajador/a

**A1. Reportar un problema.**
«Tu impresora no imprime desde la mañana. Repórtalo a soporte.»
- Observar: si encuentra la vista correcta, si entiende los campos, cómo reacciona a los mensajes de error.

**A2. Guardar el número del caso.**
«¿Con qué número podrás consultar tu caso después?»
- Observar: si identifica el número en la confirmación.

**A3. Consultar el avance.**
«Revisa en qué estado está tu caso y quién lo atiende.»
- Observar: si usa el botón de seguimiento o la búsqueda; si entiende «Sin asignar» y la barra de etapas.

**A4. Buscar un caso que no existe.**
«Busca el caso ACME-099.»
- Observar: si el mensaje de caso no encontrado le indica qué hacer.

### Parte B · Soporte TI

**B1. Encontrar casos pendientes.**
«Muestra solo los casos que aún nadie ha comenzado a atender.»
- Observar: uso del filtro por estado.

**B2. Atender el caso creado en A1.**
«Haz que una persona del equipo de soporte se haga cargo y comienza la atención.»
- Observar: si entiende que primero debe asignar un responsable.

**B3. Comunicar avance.**
«Avisa al trabajador que irás a revisar la impresora a las 15:00.»

**B4. Registrar la solución.**
«Ya lo resolviste. Registra qué hiciste.»

### Parte C · Cierre del ciclo (vuelve el rol trabajador)

**C1. Revisar la solución.**
«Cambia a la vista de trabajador y revisa qué hizo soporte.»
- Observar: si encuentra el selector «Ver como» y si el caso sigue a la vista.

**C2. El problema continúa.**
«La impresora volvió a fallar. Indícalo.»
- Observar: si encuentra la opción «El problema continúa» y entiende que el caso vuelve a soporte.

**C3. Confirmar y cerrar.**
Repetir B4 como soporte y luego: «Ahora sí funciona. Cierra el caso.»

### Parte D · Datos de la demostración (opcional)

**D1.** «Recarga la página. ¿Siguen ahí tus cambios?»
**D2.** «Deja la demostración como al inicio.» Observar si entiende la advertencia antes de borrar.

## Preguntas de cierre (2–3 minutos)

Anotar las respuestas textuales, sin interpretarlas en el momento:

1. ¿Qué fue lo más fácil de hacer?
2. ¿En qué momento dudaste o te detuviste?
3. ¿Hubo algún texto o botón que no entendiste?
4. ¿Qué información te faltó para saber cómo iba tu caso?

## Después de la simulación

1. Pasar las notas a la [plantilla de registro](plantilla-registro-simulacion.md).
2. Agrupar dificultades repetidas y llevarlas a la [plantilla de mejoras](plantilla-mejoras.md).
3. Guardar capturas o fotos como evidencia (sin datos personales reales).
4. Conservar esta versión del prototipo como referencia antes de aplicar cambios.
