/*
 * Mesa de ayuda ACME — interfaz.
 * Enrutador por hash, vistas y acciones. Todo el texto ingresado por usuarios
 * se inserta con textContent (nunca como HTML) para mantenerlo como texto seguro.
 */
(function () {
  'use strict';

  const Store = window.MesaStore;
  const main = document.getElementById('contenido');
  const navLista = document.getElementById('nav-list');
  const banner = document.getElementById('storage-banner');
  const anuncio = document.getElementById('anuncio');
  const dialogo = document.getElementById('dialogo-restablecer');
  const btnRestablecer = document.getElementById('btn-restablecer');
  const botonesRol = Array.from(document.querySelectorAll('.role-switch__option'));

  const NOMBRE_ROL = { trabajador: 'Trabajador', soporte: 'Soporte TI' };
  const formatoFecha = new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' });

  // Mensaje de confirmación o error que se muestra en la próxima vista.
  let aviso = null;
  // Selector del elemento que debe recibir el foco después de dibujar.
  let focoPendiente = null;
  // Borrador del formulario de reporte. Se conserva al cambiar de vista, si hay errores
  // y al recargar la pestaña (sessionStorage); se borra al registrar el caso.
  const CLAVE_BORRADOR = 'mesaAyudaAcme.borrador';
  const BORRADOR_VACIO = { nombre: '', area: '', equipo: '', descripcion: '' };
  let borrador = leerBorrador();
  // Evita registrar dos veces el mismo caso por pulsaciones repetidas.
  let enviando = false;
  let primeraCarga = true;
  // Nivel de los subtítulos dentro del detalle de un caso (h2 si el caso es el h1 de la página).
  let nivelSub = 'h3';

  function leerBorrador() {
    try {
      const d = JSON.parse(window.sessionStorage.getItem(CLAVE_BORRADOR) || 'null');
      if (d && typeof d === 'object') {
        return Object.keys(BORRADOR_VACIO).reduce((acc, k) => {
          acc[k] = typeof d[k] === 'string' ? d[k] : '';
          return acc;
        }, {});
      }
    } catch (e) {
      /* sin sessionStorage: el borrador se mantiene solo en memoria */
    }
    return Object.assign({}, BORRADOR_VACIO);
  }

  function guardarBorrador() {
    try {
      const vacio = Object.keys(BORRADOR_VACIO).every((k) => !borrador[k]);
      if (vacio) window.sessionStorage.removeItem(CLAVE_BORRADOR);
      else window.sessionStorage.setItem(CLAVE_BORRADOR, JSON.stringify(borrador));
    } catch (e) {
      /* sin sessionStorage: se ignora */
    }
  }

  function limpiarBorrador() {
    borrador = Object.assign({}, BORRADOR_VACIO);
    guardarBorrador();
  }

  /* ---------- Utilidades de DOM ---------- */

  /** Crea un elemento. Los hijos de texto se agregan como nodos de texto (seguro). */
  function h(etiqueta, atributos, ...hijos) {
    const el = document.createElement(etiqueta);
    if (atributos) {
      Object.keys(atributos).forEach((clave) => {
        const valor = atributos[clave];
        if (valor == null || valor === false) return;
        if (clave === 'class') el.className = valor;
        else if (clave.startsWith('on') && typeof valor === 'function') el.addEventListener(clave.slice(2), valor);
        else if (valor === true) el.setAttribute(clave, '');
        else el.setAttribute(clave, String(valor));
      });
    }
    hijos.flat(Infinity).forEach((hijo) => {
      if (hijo == null || hijo === false) return;
      el.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
    });
    return el;
  }

  function fecha(iso) {
    const d = new Date(iso);
    return h('time', { datetime: iso }, Number.isNaN(d.getTime()) ? 'Fecha no disponible' : formatoFecha.format(d));
  }

  function insigniaEstado(estado) {
    return h('span', { class: `status status--${estado}` }, Store.ESTADOS[estado]);
  }

  function anunciar(texto) {
    anuncio.textContent = '';
    window.setTimeout(() => {
      anuncio.textContent = texto;
    }, 60);
  }

  function ir(hash) {
    if (location.hash === hash) render({ foco: true });
    else location.hash = hash;
  }

  function rutaActual() {
    const hash = decodeURIComponent(location.hash.replace(/^#/, '')) || '/';
    const [ruta, consulta] = hash.split('?');
    return { partes: ruta.split('/').filter(Boolean), params: new URLSearchParams(consulta || '') };
  }

  function avisoExito(texto, guardado) {
    aviso = { tipo: guardado === false ? 'advertencia' : 'exito', texto };
    if (guardado === false) {
      aviso.texto += ' Atención: el cambio no se pudo guardar en este navegador y se perderá al recargar.';
    }
  }

  /* ---------- Campos de formulario ---------- */

  function idsDescritos(...ids) {
    return ids.filter(Boolean).join(' ') || null;
  }

  function marcarError(control, mensajeEl, mensaje) {
    if (mensaje) {
      control.setAttribute('aria-invalid', 'true');
      mensajeEl.textContent = mensaje;
      mensajeEl.hidden = false;
    } else {
      control.removeAttribute('aria-invalid');
      mensajeEl.textContent = '';
      mensajeEl.hidden = true;
    }
  }

  /** Grupo de etiqueta + ayuda + control + error, enlazados para lectores de pantalla. */
  function grupoCampo({ id, etiqueta, ayuda, control, extra }) {
    const idAyuda = ayuda ? `${id}-ayuda` : null;
    const idError = `${id}-error`;
    control.id = id;
    control.setAttribute('aria-describedby', idsDescritos(idAyuda, idError));
    const error = h('p', { class: 'field__error', id: idError, hidden: true });
    return {
      nodo: h(
        'div',
        { class: 'field' },
        h('label', { class: 'field__label', for: id }, etiqueta),
        ayuda ? h('p', { class: 'field__hint', id: idAyuda }, ayuda) : null,
        control,
        extra || null,
        error
      ),
      control,
      error,
    };
  }

  /** Formulario breve de una acción (asignar, resolver, comentar, reabrir). */
  function formularioAccion({ id, titulo, descripcion, campo, boton, claseBoton, alEnviar }) {
    const errorGeneral = h('p', { class: 'field__error', id: `${id}-error-general`, hidden: true });
    const form = h(
      'form',
      { class: 'action', id, novalidate: true, 'aria-labelledby': `${id}-titulo` },
      h(nivelSub, { class: 'action__title', id: `${id}-titulo` }, titulo),
      descripcion ? h('p', { class: 'action__text' }, descripcion) : null,
      campo ? campo.nodo : null,
      errorGeneral,
      h('button', { type: 'submit', class: `button ${claseBoton || 'button--primary'}` }, boton)
    );
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const r = alEnviar(campo ? campo.control.value : null);
      if (r && !r.ok) {
        if (campo) {
          marcarError(campo.control, campo.error, r.error);
          campo.control.focus();
        } else {
          errorGeneral.textContent = r.error;
          errorGeneral.hidden = false;
          form.querySelector('button').setAttribute('aria-describedby', errorGeneral.id);
          form.querySelector('button').focus();
        }
      }
    });
    if (campo) {
      campo.control.addEventListener('input', () => {
        if (campo.control.getAttribute('aria-invalid')) marcarError(campo.control, campo.error, null);
      });
    }
    return form;
  }

  function areaTexto(nombre, max, filas) {
    return h('textarea', { class: 'input input--area', name: nombre, rows: filas || 3, maxlength: max, autocomplete: 'off', 'data-preservar': '' });
  }

  /* ---------- Componentes de caso ---------- */

  function progreso(estado) {
    const actual = Store.ORDEN_ESTADOS.indexOf(estado);
    return h(
      'ol',
      { class: 'progress', 'aria-label': 'Etapas del caso' },
      Store.ORDEN_ESTADOS.map((e, i) => {
        const condicion = i < actual ? 'hecho' : i === actual ? 'actual' : 'pendiente';
        const sufijo = { hecho: ' (completada)', actual: ' (etapa actual)', pendiente: ' (pendiente)' }[condicion];
        return h(
          'li',
          { class: `progress__step progress__step--${condicion}`, 'aria-current': condicion === 'actual' ? 'step' : null },
          h('span', { class: 'progress__marker', 'aria-hidden': 'true' }, condicion === 'hecho' ? '✓' : String(i + 1)),
          h('span', { class: 'progress__label' }, Store.ESTADOS[e], h('span', { class: 'visually-hidden' }, sufijo))
        );
      })
    );
  }

  function datosDelCaso(caso) {
    const fila = (termino, valor) => h('div', { class: 'facts__row' }, h('dt', null, termino), h('dd', null, valor));
    return h(
      'section',
      { class: 'panel', 'aria-labelledby': 'datos-titulo' },
      h(nivelSub, { class: 'panel__title', id: 'datos-titulo' }, 'Datos del caso'),
      h(
        'dl',
        { class: 'facts' },
        fila('Estado', insigniaEstado(caso.estado)),
        fila('Reportado por', caso.nombre),
        fila('Área', caso.area),
        fila('Equipo o sistema', caso.equipo),
        fila('Responsable', caso.responsable || h('span', { class: 'muted' }, 'Sin asignar')),
        fila('Registrado', fecha(caso.creado)),
        fila('Última actualización', fecha(caso.actualizado))
      )
    );
  }

  function historial(caso) {
    return h(
      'section',
      { class: 'case__section', 'aria-labelledby': 'historial-titulo' },
      h(nivelSub, { class: 'case__section-title', id: 'historial-titulo' }, 'Historial'),
      h(
        'ol',
        { class: 'timeline' },
        caso.historial.map((ev) =>
          h(
            'li',
            { class: `timeline__item timeline__item--${ev.tipo}` },
            h('p', { class: 'timeline__meta' }, fecha(ev.fecha), h('span', { class: 'timeline__author' }, ev.autor)),
            h('p', { class: 'timeline__title' }, ev.titulo),
            ev.detalle ? h('p', { class: 'timeline__detail' }, ev.detalle) : null
          )
        )
      )
    );
  }

  /** Re-dibuja la vista actual tras una acción exitosa y deja el foco en el mensaje. */
  function trasAccion(r, texto) {
    if (!r.ok) return r;
    avisoExito(texto, r.guardado);
    render({ foco: false });
    return r;
  }

  function accionesTrabajador(caso) {
    const nodos = [];
    if (caso.estado === 'recibido') {
      nodos.push(
        h('div', { class: 'action action--info' }, h(nivelSub, { class: 'action__title' }, 'Qué sigue'),
          h('p', { class: 'action__text' }, 'Soporte TI revisará tu caso y asignará un responsable. Vuelve a esta página para ver el avance.'))
      );
    } else if (caso.estado === 'en_atencion') {
      nodos.push(
        h('div', { class: 'action action--info' }, h(nivelSub, { class: 'action__title' }, 'Qué sigue'),
          h('p', { class: 'action__text' }, `${caso.responsable} está atendiendo tu caso. Cuando registre la solución, podrás confirmarla aquí.`))
      );
    } else if (caso.estado === 'resuelto') {
      nodos.push(
        formularioAccion({
          id: 'form-cerrar',
          titulo: '¿Se solucionó tu problema?',
          descripcion: 'Soporte TI marcó el caso como resuelto. Revisa la solución aplicada y confirma si todo funciona.',
          boton: 'Sí, confirmar y cerrar caso',
          alEnviar: () => trasAccion(Store.confirmarCierre(caso.id), `Caso ${caso.id} cerrado. Confirmaste que la solución funciona.`),
        })
      );
      const campo = grupoCampo({
        id: 'motivo',
        etiqueta: '¿Qué sigue fallando?',
        ayuda: 'Describe lo que aún no funciona. Soporte TI lo verá en el historial.',
        control: areaTexto('motivo', Store.LIMITES.motivo.max, 3),
      });
      nodos.push(
        formularioAccion({
          id: 'form-reabrir',
          titulo: 'El problema continúa',
          campo,
          boton: 'Devolver caso a soporte',
          claseBoton: 'button--secondary',
          alEnviar: (valor) => trasAccion(Store.reabrir(caso.id, valor), `Caso ${caso.id} devuelto a soporte. Quedó nuevamente En atención.`),
        })
      );
    } else {
      const cierre = caso.historial.filter((ev) => ev.tipo === 'cierre').pop();
      nodos.push(
        h('div', { class: 'action action--info' }, h(nivelSub, { class: 'action__title' }, 'Caso cerrado'),
          h('p', { class: 'action__text' }, cierre ? ['Se cerró el ', fecha(cierre.fecha), '. '] : '',
            'Si tienes un problema nuevo, regístralo como un caso nuevo.'),
          h('a', { class: 'button button--secondary', href: '#/reportar' }, 'Reportar otro problema'))
      );
    }
    return nodos;
  }

  function accionesSoporte(caso) {
    const nodos = [];
    const abierto = caso.estado === 'recibido' || caso.estado === 'en_atencion';

    if (abierto) {
      const select = h(
        'select',
        { class: 'input', name: 'responsable', 'data-preservar': '' },
        h('option', { value: '' }, 'Selecciona una persona'),
        Store.RESPONSABLES.map((r) => h('option', { value: r, selected: r === caso.responsable }, r))
      );
      const campo = grupoCampo({
        id: 'responsable',
        etiqueta: 'Persona de soporte',
        ayuda: caso.responsable ? `Responsable actual: ${caso.responsable}.` : 'El caso aún no tiene responsable.',
        control: select,
      });
      nodos.push(
        formularioAccion({
          id: 'form-asignar',
          titulo: caso.responsable ? 'Cambiar responsable' : 'Asignar responsable',
          campo,
          boton: caso.responsable ? 'Cambiar responsable' : 'Asignar responsable',
          claseBoton: caso.responsable ? 'button--secondary' : 'button--primary',
          alEnviar: (valor) => {
            if (!valor) return { ok: false, error: 'Selecciona una persona de soporte.' };
            const r = Store.asignarResponsable(caso.id, valor);
            return trasAccion(r, caso.responsable ? `Responsable cambiado a ${valor}.` : `Responsable asignado: ${valor}.`);
          },
        })
      );
    }

    if (caso.estado === 'recibido') {
      nodos.push(
        formularioAccion({
          id: 'form-iniciar',
          titulo: 'Iniciar atención',
          descripcion: caso.responsable
            ? `El caso pasará a En atención con ${caso.responsable} como responsable.`
            : 'Para iniciar la atención, primero asigna un responsable.',
          boton: 'Iniciar atención',
          claseBoton: caso.responsable ? 'button--primary' : 'button--secondary',
          alEnviar: () => trasAccion(Store.iniciarAtencion(caso.id), `El caso ${caso.id} está ahora En atención.`),
        })
      );
    }

    if (caso.estado === 'en_atencion') {
      const campo = grupoCampo({
        id: 'solucion',
        etiqueta: 'Solución aplicada',
        ayuda: 'Describe qué se hizo para resolver el problema. El trabajador la leerá antes de confirmar.',
        control: areaTexto('solucion', Store.LIMITES.solucion.max, 4),
      });
      nodos.push(
        formularioAccion({
          id: 'form-resolver',
          titulo: 'Marcar como resuelto',
          campo,
          boton: 'Marcar como resuelto',
          alEnviar: (valor) => trasAccion(Store.resolver(caso.id, valor), `Caso ${caso.id} marcado como resuelto. Falta que el trabajador confirme la solución.`),
        })
      );
    }

    if (caso.estado === 'resuelto') {
      nodos.push(
        h('div', { class: 'action action--info' }, h(nivelSub, { class: 'action__title' }, 'Esperando confirmación'),
          h('p', { class: 'action__text' }, `${caso.nombre} debe confirmar la solución. Si indica que el problema continúa, el caso volverá a En atención.`))
      );
    }

    if (caso.estado === 'cerrado') {
      nodos.push(
        h('div', { class: 'action action--info' }, h(nivelSub, { class: 'action__title' }, 'Caso cerrado'),
          h('p', { class: 'action__text' }, 'El trabajador confirmó la solución. El caso ya no admite cambios.'))
      );
    } else {
      const campo = grupoCampo({
        id: 'comentario',
        etiqueta: 'Comentario',
        ayuda: 'Queda en el historial y el trabajador lo verá en el seguimiento.',
        control: areaTexto('comentario', Store.LIMITES.comentario.max, 3),
      });
      nodos.push(
        formularioAccion({
          id: 'form-comentar',
          titulo: 'Agregar comentario',
          campo,
          boton: 'Agregar comentario',
          claseBoton: 'button--secondary',
          alEnviar: (valor) => trasAccion(Store.comentar(caso.id, valor), 'Comentario agregado al historial.'),
        })
      );
    }
    return nodos;
  }

  function detalleCaso(caso, rol, nivelTitulo) {
    // Mantiene la jerarquía de títulos: h1 → h2 en soporte, h2 → h3 en seguimiento.
    nivelSub = nivelTitulo === 'h1' ? 'h2' : 'h3';
    return h(
      'article',
      { class: 'case', 'aria-labelledby': 'caso-titulo' },
      h(
        'header',
        { class: 'case__header' },
        h(
          nivelTitulo,
          { class: 'case__id', id: 'caso-titulo', tabindex: '-1' },
          h('span', { class: 'visually-hidden' }, 'Caso '),
          h('span', { translate: 'no' }, caso.id)
        ),
        insigniaEstado(caso.estado),
        h('p', { class: 'case__subject' }, caso.equipo)
      ),
      progreso(caso.estado),
      h(
        'div',
        { class: 'case__grid' },
        h(
          'div',
          { class: 'case__summary' },
          h(
            'section',
            { class: 'case__section', 'aria-labelledby': 'descripcion-titulo' },
            h(nivelSub, { class: 'case__section-title', id: 'descripcion-titulo' }, 'Descripción del problema'),
            h('p', { class: 'prose' }, caso.descripcion)
          ),
          caso.solucion
            ? h(
                'section',
                { class: 'case__section case__section--solution', 'aria-labelledby': 'solucion-titulo' },
                h(nivelSub, { class: 'case__section-title', id: 'solucion-titulo' }, 'Solución aplicada'),
                h('p', { class: 'prose' }, caso.solucion)
              )
            : null
        ),
        h(
          'div',
          { class: 'case__side' },
          h(
            'section',
            { class: 'actions', 'aria-label': rol === 'soporte' ? 'Acciones de soporte' : 'Acciones del trabajador' },
            rol === 'soporte' ? accionesSoporte(caso) : accionesTrabajador(caso)
          ),
          datosDelCaso(caso)
        ),
        h('div', { class: 'case__history' }, historial(caso))
      )
    );
  }

  /* ---------- Vistas ---------- */

  function tituloPagina(texto, extra) {
    return h('h1', { class: 'page-title', tabindex: '-1' }, texto, extra || null);
  }

  function vistaInicio() {
    const opcion = (rol, titulo, texto, puntos, boton) =>
      h(
        'section',
        { class: `choice choice--${rol}`, 'aria-labelledby': `opcion-${rol}` },
        h('h2', { class: 'choice__title', id: `opcion-${rol}` }, titulo),
        h('p', { class: 'choice__text' }, texto),
        h('ul', { class: 'choice__list' }, puntos.map((p) => h('li', null, p))),
        h('button', { type: 'button', class: 'button button--primary', onclick: () => cambiarRol(rol) }, boton)
      );

    return {
      titulo: 'Inicio',
      rol: null,
      contenido: [
        h(
          'div',
          { class: 'intro' },
          tituloPagina('¿Qué necesitas hacer?'),
          h(
            'p',
            { class: 'lead' },
            'Registra un problema informático, sigue su avance o atiende los casos como parte de Soporte TI. ' +
              'Puedes cambiar de vista cuando quieras con el selector «Ver como»; no se pide contraseña porque es una simulación de roles.'
          )
        ),
        h(
          'div',
          { class: 'choices' },
          opcion('trabajador', 'Trabajador', 'Para quien tiene un problema con su equipo o un sistema.', [
            'Reportar un problema en cuatro campos',
            'Recibir un número de caso',
            'Revisar el avance y confirmar la solución',
          ], 'Entrar como trabajador'),
          opcion('soporte', 'Soporte TI', 'Para quien atiende y resuelve los casos.', [
            'Ver y filtrar los casos por estado',
            'Asignar un responsable y comentar',
            'Registrar la solución aplicada',
          ], 'Entrar como soporte TI')
        ),
        h(
          'section',
          { class: 'flow', 'aria-labelledby': 'flujo-titulo' },
          h('h2', { class: 'section-title', id: 'flujo-titulo' }, 'Cómo avanza un caso'),
          h(
            'ol',
            { class: 'flow__list' },
            [
              ['recibido', 'El trabajador registra el problema y recibe un número de caso.'],
              ['en_atencion', 'Soporte TI asigna un responsable y comienza a trabajar.'],
              ['resuelto', 'Soporte TI describe la solución aplicada.'],
              ['cerrado', 'El trabajador confirma que funciona. Si el problema continúa, el caso vuelve a En atención.'],
            ].map(([estado, texto]) => h('li', { class: 'flow__item' }, insigniaEstado(estado), h('p', null, texto)))
          )
        ),
        h(
          'section',
          { class: 'about', 'aria-labelledby': 'sobre-titulo' },
          h('h2', { class: 'section-title', id: 'sobre-titulo' }, 'Sobre esta demostración'),
          h('p', null, 'Incluye cuatro casos de ejemplo (ACME-001 a ACME-004) con nombres ficticios. Los casos nuevos y los cambios se guardan solo en este navegador: otra persona, en otro equipo, no los verá.'),
          h('p', null, 'Para empezar de cero, usa «Restablecer datos de ejemplo» al final de la página.')
        ),
      ],
    };
  }

  function vistaReportar() {
    enviando = false;
    const actualizar = (campo) => (e) => {
      borrador[campo] = e.target.value;
      guardarBorrador();
    };

    const nombre = grupoCampo({
      id: 'campo-nombre',
      etiqueta: 'Nombre y apellido',
      control: h('input', {
        class: 'input', type: 'text', name: 'nombre', autocomplete: 'name', maxlength: Store.LIMITES.nombre.max,
        value: borrador.nombre, oninput: actualizar('nombre'),
      }),
    });
    const area = grupoCampo({
      id: 'campo-area',
      etiqueta: 'Área',
      control: h(
        'select',
        { class: 'input', name: 'area', onchange: actualizar('area') },
        h('option', { value: '' }, 'Selecciona tu área'),
        Store.AREAS.map((a) => h('option', { value: a, selected: a === borrador.area }, a))
      ),
    });
    const equipo = grupoCampo({
      id: 'campo-equipo',
      etiqueta: 'Equipo o sistema afectado',
      ayuda: 'Por ejemplo: notebook, impresora, correo o carpeta compartida.',
      control: h('input', {
        class: 'input', type: 'text', name: 'equipo', list: 'sugerencias-equipo', autocomplete: 'off',
        maxlength: Store.LIMITES.equipo.max, value: borrador.equipo, oninput: actualizar('equipo'),
      }),
      extra: h(
        'datalist',
        { id: 'sugerencias-equipo' },
        ['Notebook', 'Computador de escritorio', 'Impresora', 'Correo', 'Carpeta compartida', 'Conexión a internet', 'Teléfono'].map((s) =>
          h('option', { value: s })
        )
      ),
    });
    const contador = h('p', { class: 'field__counter', 'aria-hidden': 'true' });
    const descripcionCtrl = h('textarea', {
      class: 'input input--area', name: 'descripcion', rows: 6, autocomplete: 'off', maxlength: Store.LIMITES.descripcion.max,
    });
    descripcionCtrl.value = borrador.descripcion;
    const descripcion = grupoCampo({
      id: 'campo-descripcion',
      etiqueta: 'Descripción del problema',
      ayuda: `Cuenta qué ocurre, desde cuándo y si aparece algún mensaje en pantalla. Entre ${Store.LIMITES.descripcion.min} y ${Store.LIMITES.descripcion.max} caracteres.`,
      control: descripcionCtrl,
      extra: contador,
    });
    const actualizarContador = () => {
      contador.textContent = `${descripcionCtrl.value.length} de ${Store.LIMITES.descripcion.max} caracteres`;
    };
    descripcionCtrl.addEventListener('input', (e) => {
      borrador.descripcion = e.target.value;
      guardarBorrador();
      actualizarContador();
    });
    actualizarContador();

    const campos = { nombre, area, equipo, descripcion };
    const resumen = h('div', { class: 'error-summary', id: 'resumen-errores', role: 'alert', hidden: true });
    const boton = h('button', { type: 'submit', class: 'button button--primary button--large' }, 'Registrar problema');

    function mostrarErrores(errores) {
      const claves = Object.keys(campos).filter((k) => errores[k]);
      Object.keys(campos).forEach((k) => marcarError(campos[k].control, campos[k].error, errores[k] || null));
      resumen.replaceChildren(
        h('h2', { class: 'error-summary__title' },
          claves.length === 1 ? 'Revisa 1 campo antes de registrar el problema' : `Revisa ${claves.length} campos antes de registrar el problema`),
        h(
          'ul',
          { class: 'error-summary__list' },
          claves.map((k) =>
            h('li', null, h('a', {
              href: `#${campos[k].control.id}`,
              onclick: (e) => {
                e.preventDefault();
                campos[k].control.focus();
              },
            }, errores[k]))
          )
        )
      );
      resumen.hidden = false;
      // El foco va al primer campo con error; el resumen se anuncia como alerta.
      if (claves.length) campos[claves[0]].control.focus();
    }

    // Tras un primer intento con errores, quita el mensaje en cuanto el campo se corrige.
    Object.keys(campos).forEach((k) => {
      const ctrl = campos[k].control;
      ctrl.addEventListener(k === 'area' ? 'change' : 'input', () => {
        if (!ctrl.getAttribute('aria-invalid')) return;
        const errores = Store.validarReporte(borrador);
        if (!errores[k]) marcarError(ctrl, campos[k].error, null);
      });
    });

    const form = h(
      'form',
      { class: 'report-form', novalidate: true, 'aria-labelledby': 'titulo-reportar' },
      resumen,
      nombre.nodo,
      area.nodo,
      equipo.nodo,
      descripcion.nodo,
      h('div', { class: 'form-actions' }, boton, h('p', { class: 'form-actions__note' }, 'Recibirás un número de caso para seguir el avance.'))
    );

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (enviando) return;
      enviando = true;
      boton.disabled = true;
      boton.textContent = 'Registrando…';
      const entrada = {
        nombre: nombre.control.value,
        area: area.control.value,
        equipo: equipo.control.value,
        descripcion: descripcion.control.value,
      };
      const r = Store.crearCaso(entrada);
      if (!r.ok) {
        enviando = false;
        boton.disabled = false;
        boton.textContent = 'Registrar problema';
        mostrarErrores(r.errores);
        return;
      }
      limpiarBorrador();
      if (r.guardado === false) {
        aviso = { tipo: 'advertencia', texto: 'El caso se registró, pero no se pudo guardar en este navegador y se perderá al recargar.' };
      }
      ir(`#/confirmacion/${r.caso.id}`);
    });

    const h1 = tituloPagina('Reportar un problema');
    h1.id = 'titulo-reportar';
    return {
      titulo: 'Reportar un problema',
      rol: 'trabajador',
      contenido: [
        h('div', { class: 'intro' }, h1,
          h('p', { class: 'lead' }, 'Completa los cuatro campos. Soporte TI recibirá el caso y podrás seguir su avance con el número que obtendrás al final.')),
        form,
      ],
    };
  }

  function vistaConfirmacion(id) {
    const caso = id ? Store.obtenerCaso(id) : null;
    if (!caso) return vistaCasoNoEncontrado(id, 'trabajador');
    return {
      titulo: `Caso ${caso.id} registrado`,
      rol: 'trabajador',
      contenido: [
        h('div', { class: 'intro' }, tituloPagina('Problema registrado'),
          h('p', { class: 'lead' }, 'Soporte TI ya puede ver tu caso. Guarda este número para consultar el avance.')),
        h(
          'section',
          { class: 'ticket', 'aria-label': `Comprobante del caso ${caso.id}` },
          h('p', { class: 'ticket__label' }, 'Tu número de caso'),
          h('p', { class: 'ticket__number', translate: 'no' }, caso.id),
          h(
            'dl',
            { class: 'ticket__facts' },
            h('div', null, h('dt', null, 'Estado'), h('dd', null, insigniaEstado(caso.estado))),
            h('div', null, h('dt', null, 'Registrado'), h('dd', null, fecha(caso.creado))),
            h('div', null, h('dt', null, 'Equipo o sistema'), h('dd', null, caso.equipo)),
            h('div', null, h('dt', null, 'Área'), h('dd', null, caso.area))
          )
        ),
        h(
          'div',
          { class: 'button-row' },
          h('a', { class: 'button button--primary button--large', href: `#/seguimiento/${caso.id}` }, 'Ver seguimiento del caso'),
          h('a', { class: 'button button--secondary button--large', href: '#/reportar' }, 'Reportar otro problema')
        ),
      ],
    };
  }

  function vistaSeguimiento(idBuscado) {
    const idNormal = idBuscado ? Store.normalizarId(idBuscado) : null;
    const caso = idNormal ? Store.obtenerCaso(idNormal) : null;

    const input = h('input', {
      class: 'input input--case', type: 'text', name: 'caso', autocomplete: 'off', spellcheck: 'false',
      inputmode: 'text', placeholder: 'ACME-001…', value: idNormal || idBuscado || '', maxlength: 20,
    });
    const campo = grupoCampo({
      id: 'buscar-caso',
      etiqueta: 'Número de caso',
      ayuda: 'Formato ACME-001. También puedes escribir solo el número.',
      control: input,
    });
    const form = h(
      'form',
      { class: 'search', role: 'search', novalidate: true, 'aria-label': 'Buscar un caso' },
      h('div', { class: 'search__row' }, campo.nodo, h('button', { type: 'submit', class: 'button button--primary' }, 'Buscar caso'))
    );
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const valor = input.value.trim();
      if (!valor) {
        marcarError(input, campo.error, 'Escribe un número de caso, por ejemplo ACME-001.');
        input.focus();
        return;
      }
      const normal = Store.normalizarId(valor);
      if (!normal) {
        marcarError(input, campo.error, `«${valor}» no es un número de caso válido. Usa el formato ACME-001.`);
        input.focus();
        return;
      }
      focoPendiente = Store.obtenerCaso(normal) ? '#caso-titulo' : '#caso-no-encontrado';
      ir(`#/seguimiento/${normal}`);
    });
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid')) marcarError(input, campo.error, null);
    });

    const ejemplos = h(
      'p',
      { class: 'search__examples' },
      'Casos de ejemplo: ',
      ['ACME-001', 'ACME-002', 'ACME-003', 'ACME-004'].map((ej, i, arr) => [
        h('a', { href: `#/seguimiento/${ej}` }, ej),
        i < arr.length - 1 ? ', ' : '.',
      ])
    );

    let resultado = null;
    if (idBuscado && !caso) {
      const mostrado = idNormal || idBuscado;
      resultado = h(
        'div',
        { class: 'notice notice--error', id: 'caso-no-encontrado', tabindex: '-1' },
        h('h2', { class: 'notice__title' }, `No encontramos el caso ${mostrado}`),
        h('p', null, 'Revisa el número en tu comprobante. Los casos se guardan solo en el navegador donde se registraron, así que un caso creado en otro equipo no aparecerá aquí.')
      );
    } else if (caso) {
      resultado = detalleCaso(caso, 'trabajador', 'h2');
    }

    return {
      titulo: caso ? `Seguimiento ${caso.id}` : 'Seguimiento de casos',
      rol: 'trabajador',
      contenido: [
        h('div', { class: 'intro' }, tituloPagina('Seguimiento de casos'),
          h('p', { class: 'lead' }, 'Escribe el número que recibiste al reportar el problema para ver su estado, responsable e historial.')),
        form,
        ejemplos,
        resultado,
      ],
    };
  }

  function vistaPanel(filtro) {
    const estado = Store.ESTADOS[filtro] ? filtro : '';
    const cuenta = Store.contarPorEstado();
    const casos = Store.listarCasos(estado || null);

    const opciones = [['', 'Todos', cuenta.todos]].concat(Store.ORDEN_ESTADOS.map((e) => [e, Store.ESTADOS[e], cuenta[e]]));
    const filtros = h(
      'fieldset',
      { class: 'filters' },
      h('legend', { class: 'filters__legend' }, 'Filtrar por estado'),
      h(
        'div',
        { class: 'filters__options' },
        opciones.map(([valor, etiqueta, n]) => {
          const idFiltro = `filtro-${valor || 'todos'}`;
          return h(
            'div',
            { class: 'filters__option' },
            h('input', {
              type: 'radio', name: 'filtro-estado', id: idFiltro, value: valor, checked: valor === estado,
              onchange: () => {
                focoPendiente = `#${idFiltro}`;
                const total = valor ? cuenta[valor] : cuenta.todos;
                anunciar(valor ? `${total} ${total === 1 ? 'caso' : 'casos'} en estado ${etiqueta}.` : `Mostrando los ${total} casos.`);
                ir(valor ? `#/soporte?estado=${valor}` : '#/soporte');
              },
            }),
            h('label', { for: idFiltro }, etiqueta, ' ', h('span', { class: 'filters__count' }, `(${n})`))
          );
        })
      )
    );

    const descripcionTabla = estado
      ? `${casos.length} ${casos.length === 1 ? 'caso' : 'casos'} en estado ${Store.ESTADOS[estado]}`
      : `${casos.length} ${casos.length === 1 ? 'caso' : 'casos'} en total`;

    const cuerpo = casos.length
      ? casos.map((c) =>
          h(
            'tr',
            null,
            h('th', { scope: 'row', 'data-label': 'Caso' }, h('a', { class: 'case-link', href: `#/soporte/${c.id}`, translate: 'no' }, c.id)),
            h('td', { 'data-label': 'Estado' }, insigniaEstado(c.estado)),
            h('td', { 'data-label': 'Problema', class: 'cell-problem' },
              h('span', { class: 'cell-problem__title' }, c.equipo),
              h('span', { class: 'cell-problem__text' }, c.descripcion)),
            h('td', { 'data-label': 'Reportado por' }, c.nombre, h('span', { class: 'cell-sub' }, c.area)),
            h('td', { 'data-label': 'Responsable' }, c.responsable || h('span', { class: 'muted' }, 'Sin asignar')),
            h('td', { 'data-label': 'Actualizado', class: 'cell-date' }, fecha(c.actualizado))
          )
        )
      : [
          h('tr', { class: 'table-empty' },
            h('td', { colspan: '6' },
              h('p', null, `No hay casos en estado ${Store.ESTADOS[estado] || ''}.`),
              h('a', { href: '#/soporte' }, 'Ver todos los casos'))),
        ];

    return {
      titulo: 'Panel de soporte',
      rol: 'soporte',
      contenido: [
        h('div', { class: 'intro' }, tituloPagina('Panel de soporte'),
          h('p', { class: 'lead' }, 'Abre un caso para asignar un responsable, comentar o registrar la solución. Los casos más recientes aparecen primero.')),
        filtros,
        h(
          'div',
          { class: 'table-wrap' },
          h(
            'table',
            { class: 'cases-table' },
            h('caption', { class: 'cases-table__caption' }, descripcionTabla),
            h('thead', null, h('tr', null, ['Caso', 'Estado', 'Problema', 'Reportado por', 'Responsable', 'Actualizado'].map((t) => h('th', { scope: 'col' }, t)))),
            h('tbody', null, cuerpo)
          )
        ),
      ],
    };
  }

  function vistaDetalleSoporte(id) {
    const idNormal = Store.normalizarId(id);
    const caso = idNormal ? Store.obtenerCaso(idNormal) : null;
    if (!caso) return vistaCasoNoEncontrado(idNormal || id, 'soporte');
    return {
      titulo: `Caso ${caso.id}`,
      rol: 'soporte',
      contenido: [
        h('p', { class: 'back-link' }, h('a', { href: '#/soporte' }, 'Volver al panel de casos')),
        detalleCaso(caso, 'soporte', 'h1'),
      ],
    };
  }

  function vistaCasoNoEncontrado(id, rol) {
    return {
      titulo: 'Caso no encontrado',
      rol,
      contenido: [
        tituloPagina('Caso no encontrado'),
        h('div', { class: 'notice notice--error' },
          h('p', null, id ? `No existe el caso ${id} en este navegador.` : 'Falta el número de caso.',
            ' Puede que se haya borrado al restablecer los datos de ejemplo o que se haya registrado en otro navegador.')),
        h('p', null, h('a', { class: 'button button--secondary', href: rol === 'soporte' ? '#/soporte' : '#/seguimiento' },
          rol === 'soporte' ? 'Volver al panel de casos' : 'Buscar otro caso')),
      ],
    };
  }

  function vistaNoEncontrada() {
    return {
      titulo: 'Página no encontrada',
      rol: null,
      contenido: [
        tituloPagina('Página no encontrada'),
        h('p', null, 'La dirección no corresponde a ninguna pantalla de la mesa de ayuda.'),
        h('p', null, h('a', { class: 'button button--secondary', href: '#/' }, 'Ir al inicio')),
      ],
    };
  }

  function resolverVista({ partes, params }) {
    const [seccion, id] = partes;
    if (!seccion) return vistaInicio();
    if (seccion === 'reportar' && !id) return vistaReportar();
    if (seccion === 'confirmacion') return vistaConfirmacion(id);
    if (seccion === 'seguimiento') return vistaSeguimiento(id);
    if (seccion === 'soporte' && id) return vistaDetalleSoporte(id);
    if (seccion === 'soporte') return vistaPanel(params.get('estado'));
    return vistaNoEncontrada();
  }

  /* ---------- Marco: rol, navegación, avisos ---------- */

  function cambiarRol(rol) {
    const { partes } = rutaActual();
    const id = ['seguimiento', 'confirmacion', 'soporte'].includes(partes[0]) ? Store.normalizarId(partes[1]) : null;
    Store.definirRol(rol);
    anunciar(`Ahora ves la mesa de ayuda como ${NOMBRE_ROL[rol]}.`);
    if (rol === 'soporte') ir(id ? `#/soporte/${id}` : '#/soporte');
    else ir(id ? `#/seguimiento/${id}` : '#/reportar');
  }

  function dibujarNavegacion(rol, partes) {
    const enlaces = [['#/', 'Inicio', !partes[0]]];
    if (rol === 'soporte') {
      enlaces.push(['#/soporte', 'Panel de casos', partes[0] === 'soporte']);
    } else if (rol === 'trabajador') {
      enlaces.push(['#/reportar', 'Reportar problema', partes[0] === 'reportar' || partes[0] === 'confirmacion']);
      enlaces.push(['#/seguimiento', 'Seguimiento', partes[0] === 'seguimiento']);
    }
    navLista.replaceChildren(
      ...enlaces.map(([href, texto, activo]) =>
        h('li', null, h('a', { class: 'site-nav__link', href, 'aria-current': activo ? 'page' : null }, texto))
      )
    );
    botonesRol.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.rol === rol)));
  }

  function dibujarBanner() {
    const problema = Store.obtenerProblema();
    const textos = {
      'no-disponible':
        'Este navegador no permite guardar datos (por ejemplo, en modo privado o con el almacenamiento bloqueado). Puedes usar la demostración, pero los cambios se perderán al recargar la página.',
      'no-guardado':
        'No se pudo guardar el último cambio porque el almacenamiento del navegador está lleno o bloqueado. Lo verás en pantalla, pero se perderá al recargar. Libera espacio en el navegador o restablece los datos de ejemplo.',
      'datos-danados':
        'Los datos guardados de la demostración no se pudieron leer. Se muestran los casos de ejemplo y los cambios no se guardarán hasta que restablezcas los datos.',
    };
    if (!problema) {
      banner.hidden = true;
      banner.replaceChildren();
      return;
    }
    banner.replaceChildren(
      h('div', { class: 'storage-banner__inner' },
        h('p', null, textos[problema]),
        problema !== 'no-disponible'
          ? h('button', { type: 'button', class: 'button button--secondary', onclick: abrirDialogo }, 'Restablecer datos de ejemplo')
          : null)
    );
    banner.hidden = false;
  }

  function capturarCampos() {
    const valores = {};
    main.querySelectorAll('[data-preservar][id]').forEach((el) => {
      valores[el.id] = el.value;
    });
    return { valores, enfocado: document.activeElement && main.contains(document.activeElement) ? document.activeElement.id : null };
  }

  function restaurarCampos(estado) {
    Object.keys(estado.valores).forEach((id) => {
      const el = document.getElementById(id);
      if (el && 'value' in el) el.value = estado.valores[id];
    });
    if (estado.enfocado) {
      const el = document.getElementById(estado.enfocado);
      if (el) el.focus();
    }
  }

  function render(opciones) {
    const { foco = false, preservar = false } = opciones || {};
    const guardados = preservar ? capturarCampos() : null;
    const ruta = rutaActual();
    const vista = resolverVista(ruta);

    if (vista.rol) Store.definirRol(vista.rol);
    const rol = Store.obtenerRol();

    dibujarNavegacion(rol, ruta.partes);
    dibujarBanner();
    document.title = `${vista.titulo} · Mesa de ayuda ACME`;
    main.replaceChildren(...vista.contenido.filter(Boolean));

    let elementoAviso = null;
    if (aviso) {
      elementoAviso = h('div', { class: `notice notice--${aviso.tipo}`, id: 'aviso', tabindex: '-1' }, h('p', null, aviso.texto));
      // Junto al caso si la vista muestra uno; si no, bajo el título de la página.
      const h1 = main.querySelector('h1');
      const ancla = main.querySelector('.case__header') || (h1 && (h1.closest('.intro') || h1));
      if (ancla) ancla.after(elementoAviso);
      else main.prepend(elementoAviso);
      aviso = null;
    }

    if (guardados) restaurarCampos(guardados);

    if (focoPendiente) {
      const el = main.querySelector(focoPendiente);
      focoPendiente = null;
      if (el) el.focus();
    } else if (elementoAviso) {
      elementoAviso.focus();
    } else if (foco && !primeraCarga) {
      window.scrollTo(0, 0);
      const h1 = main.querySelector('h1');
      if (h1) h1.focus({ preventScroll: true });
    }
    primeraCarga = false;
  }

  /* ---------- Restablecer datos ---------- */

  let disparadorDialogo = null;

  function abrirDialogo(e) {
    disparadorDialogo = e && e.currentTarget ? e.currentTarget : document.activeElement;
    dialogo.returnValue = '';
    if (typeof dialogo.showModal === 'function') {
      dialogo.showModal();
    } else if (window.confirm('Se borrarán los casos que registraste y los cambios hechos en este navegador. ¿Restablecer los datos de ejemplo?')) {
      ejecutarRestablecer();
    }
  }

  function ejecutarRestablecer() {
    const r = Store.restablecer();
    limpiarBorrador();
    avisoExito('Datos de ejemplo restablecidos. Se borraron los casos y cambios hechos en este navegador.', r.guardado);
    render({ foco: false });
  }

  dialogo.addEventListener('close', () => {
    if (dialogo.returnValue === 'confirmar') {
      ejecutarRestablecer();
    } else if (disparadorDialogo && document.contains(disparadorDialogo)) {
      disparadorDialogo.focus();
    }
  });

  /* ---------- Inicio ---------- */

  botonesRol.forEach((b) => b.addEventListener('click', () => cambiarRol(b.dataset.rol)));
  btnRestablecer.addEventListener('click', abrirDialogo);
  window.addEventListener('hashchange', () => render({ foco: true }));

  // El enlace "Saltar al contenido" no debe cambiar la ruta (que también usa el hash).
  document.querySelector('.skip-link').addEventListener('click', (e) => {
    e.preventDefault();
    main.focus();
    main.scrollIntoView();
  });

  // Advierte al recargar o cerrar si hay un comentario, solución o motivo escrito sin enviar.
  // (El formulario de reporte no lo necesita: su borrador se conserva en la pestaña.)
  window.addEventListener('beforeunload', (e) => {
    const pendiente = Array.from(main.querySelectorAll('textarea[data-preservar]')).some((t) => t.value.trim());
    if (pendiente) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  Store.iniciar();
  Store.escucharOtrasPestanas();
  Store.suscribir((evento) => {
    if (evento.tipo === 'externo') {
      render({ preservar: true });
      anunciar('Los datos se actualizaron desde otra pestaña.');
    }
  });
  render();
})();
