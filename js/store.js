/*
 * Mesa de ayuda ACME — capa de datos.
 * Guarda la demostración en localStorage y concentra las reglas del flujo:
 * Recibido → En atención → Resuelto → Cerrado.
 * Todas las vistas usan estas funciones, así ambos roles ven la misma información.
 */
(function (global) {
  'use strict';

  const CLAVE = 'mesaAyudaAcme.v1';
  const VERSION = 1;

  const ESTADOS = {
    recibido: 'Recibido',
    en_atencion: 'En atención',
    resuelto: 'Resuelto',
    cerrado: 'Cerrado',
  };
  const ORDEN_ESTADOS = ['recibido', 'en_atencion', 'resuelto', 'cerrado'];

  // Responsables ficticios del equipo de soporte.
  const RESPONSABLES = ['Ana Soto', 'Felipe Araya', 'Valentina Pérez', 'Matías González'];

  const AREAS = [
    'Administración y finanzas',
    'Bodega y logística',
    'Comercial y ventas',
    'Operaciones',
    'Personas (RR. HH.)',
    'Otra área',
  ];

  const LIMITES = {
    nombre: { min: 3, max: 80 },
    equipo: { min: 2, max: 80 },
    descripcion: { min: 15, max: 1000 },
    solucion: { min: 10, max: 1000 },
    comentario: { min: 3, max: 600 },
    motivo: { min: 10, max: 600 },
  };

  let datos = null;
  // null | 'no-disponible' | 'no-guardado' | 'datos-danados'
  let problema = null;
  const oyentes = new Set();

  /* ---------- Utilidades ---------- */

  function ahora() {
    return new Date().toISOString();
  }

  function formatearId(n) {
    return 'ACME-' + String(n).padStart(3, '0');
  }

  /** Convierte "acme-5", "5", "ACME 005" en "ACME-005". Devuelve null si no es válido. */
  function normalizarId(texto) {
    const limpio = String(texto || '').trim().toUpperCase();
    const m = limpio.match(/^(?:ACME[\s-]*)?0*(\d{1,6})$/);
    if (!m || Number(m[1]) === 0) return null;
    return formatearId(Number(m[1]));
  }

  /** Limpia texto ingresado: quita espacios sobrantes y caracteres de control. */
  function limpiarTexto(valor, multilinea) {
    let t = String(valor == null ? '' : valor);
    // eslint-disable-next-line no-control-regex
    t = t.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
    if (multilinea) {
      t = t.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n');
    } else {
      t = t.replace(/\s+/g, ' ');
    }
    return t.trim();
  }

  function clonar(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /* ---------- Datos de ejemplo ---------- */

  function haceDias(dias, hora, minuto) {
    const d = new Date();
    d.setDate(d.getDate() - dias);
    d.setHours(hora, minuto, 0, 0);
    return d.toISOString();
  }

  function datosEjemplo() {
    const casos = [
      {
        id: 'ACME-001',
        nombre: 'Camila Rojas',
        area: 'Administración y finanzas',
        equipo: 'Impresora del segundo piso',
        descripcion:
          'La impresora muestra el mensaje “Atasco de papel” aunque la bandeja está vacía. No se puede imprimir desde ningún computador del piso.',
        estado: 'cerrado',
        responsable: 'Ana Soto',
        solucion: 'Se retiró un trozo de papel atascado en el rodillo trasero y se reinició la impresora. Se imprimió una página de prueba.',
        creado: haceDias(9, 9, 12),
        historial: [
          { fecha: haceDias(9, 9, 12), autor: 'Camila Rojas', tipo: 'registro', titulo: 'Caso registrado' },
          { fecha: haceDias(9, 10, 3), autor: 'Soporte TI', tipo: 'asignacion', titulo: 'Responsable asignado: Ana Soto' },
          { fecha: haceDias(9, 10, 5), autor: 'Soporte TI', tipo: 'estado', titulo: 'Estado cambiado a En atención' },
          {
            fecha: haceDias(9, 11, 40),
            autor: 'Soporte TI',
            tipo: 'resuelto',
            titulo: 'Marcado como resuelto',
            detalle: 'Se retiró un trozo de papel atascado en el rodillo trasero y se reinició la impresora. Se imprimió una página de prueba.',
          },
          { fecha: haceDias(8, 8, 50), autor: 'Camila Rojas', tipo: 'cierre', titulo: 'Solución confirmada y caso cerrado' },
        ],
      },
      {
        id: 'ACME-002',
        nombre: 'Jorge Muñoz',
        area: 'Comercial y ventas',
        equipo: 'Correo en el teléfono',
        descripcion:
          'Desde ayer el correo del teléfono no recibe mensajes nuevos. En el computador sí llegan. El teléfono pide la contraseña cada vez que abro la aplicación.',
        estado: 'resuelto',
        responsable: 'Felipe Araya',
        solucion: 'Se eliminó la cuenta del teléfono y se configuró nuevamente. Se envió un correo de prueba que llegó correctamente.',
        creado: haceDias(3, 15, 20),
        historial: [
          { fecha: haceDias(3, 15, 20), autor: 'Jorge Muñoz', tipo: 'registro', titulo: 'Caso registrado' },
          { fecha: haceDias(3, 16, 0), autor: 'Soporte TI', tipo: 'asignacion', titulo: 'Responsable asignado: Felipe Araya' },
          { fecha: haceDias(2, 9, 15), autor: 'Soporte TI', tipo: 'estado', titulo: 'Estado cambiado a En atención' },
          {
            fecha: haceDias(2, 9, 30),
            autor: 'Soporte TI',
            tipo: 'comentario',
            titulo: 'Comentario de soporte',
            detalle: 'Coordinamos una revisión del teléfono a las 12:00 en la oficina de soporte.',
          },
          {
            fecha: haceDias(2, 12, 25),
            autor: 'Soporte TI',
            tipo: 'resuelto',
            titulo: 'Marcado como resuelto',
            detalle: 'Se eliminó la cuenta del teléfono y se configuró nuevamente. Se envió un correo de prueba que llegó correctamente.',
          },
        ],
      },
      {
        id: 'ACME-003',
        nombre: 'Daniela Fuentes',
        area: 'Operaciones',
        equipo: 'Notebook',
        descripcion:
          'El notebook tarda más de diez minutos en encender y las planillas se congelan al abrirlas. Empezó después de la última actualización.',
        estado: 'en_atencion',
        responsable: 'Valentina Pérez',
        solucion: null,
        creado: haceDias(1, 11, 5),
        historial: [
          { fecha: haceDias(1, 11, 5), autor: 'Daniela Fuentes', tipo: 'registro', titulo: 'Caso registrado' },
          { fecha: haceDias(1, 11, 45), autor: 'Soporte TI', tipo: 'asignacion', titulo: 'Responsable asignado: Valentina Pérez' },
          { fecha: haceDias(0, 8, 30), autor: 'Soporte TI', tipo: 'estado', titulo: 'Estado cambiado a En atención' },
        ],
      },
      {
        id: 'ACME-004',
        nombre: 'Rodrigo Silva',
        area: 'Personas (RR. HH.)',
        equipo: 'Carpeta compartida',
        descripcion:
          'No puedo abrir la carpeta compartida del área. Aparece el mensaje “No tiene permiso para acceder”. La semana pasada sí podía.',
        estado: 'recibido',
        responsable: null,
        solucion: null,
        creado: haceDias(0, 9, 40),
        historial: [{ fecha: haceDias(0, 9, 40), autor: 'Rodrigo Silva', tipo: 'registro', titulo: 'Caso registrado' }],
      },
    ];
    casos.forEach((c) => {
      c.actualizado = c.historial[c.historial.length - 1].fecha;
    });
    return { version: VERSION, siguiente: 5, rol: null, casos };
  }

  /* ---------- Almacenamiento ---------- */

  function almacenamientoDisponible() {
    try {
      const k = CLAVE + '.prueba';
      global.localStorage.setItem(k, '1');
      global.localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  }

  function esValido(d) {
    return (
      d &&
      typeof d === 'object' &&
      d.version === VERSION &&
      Array.isArray(d.casos) &&
      Number.isInteger(d.siguiente) &&
      d.casos.every((c) => c && typeof c.id === 'string' && ESTADOS[c.estado] && Array.isArray(c.historial))
    );
  }

  function leer() {
    let texto;
    try {
      texto = global.localStorage.getItem(CLAVE);
    } catch (e) {
      return { ok: false, motivo: 'no-disponible' };
    }
    if (texto === null) return { ok: true, datos: null };
    try {
      const d = JSON.parse(texto);
      if (!esValido(d)) return { ok: false, motivo: 'datos-danados' };
      return { ok: true, datos: d };
    } catch (e) {
      return { ok: false, motivo: 'datos-danados' };
    }
  }

  function guardar() {
    if (problema === 'no-disponible' || problema === 'datos-danados') return false;
    try {
      global.localStorage.setItem(CLAVE, JSON.stringify(datos));
      if (problema === 'no-guardado') problema = null;
      return true;
    } catch (e) {
      problema = 'no-guardado';
      return false;
    }
  }

  /** Carga los datos al iniciar. Si no hay datos guardados, usa los de ejemplo. */
  function iniciar() {
    if (!almacenamientoDisponible()) {
      problema = 'no-disponible';
      datos = datosEjemplo();
      return;
    }
    const r = leer();
    if (!r.ok) {
      problema = r.motivo;
      datos = datosEjemplo();
      return;
    }
    if (r.datos) {
      datos = r.datos;
    } else {
      datos = datosEjemplo();
      guardar();
    }
  }

  /** Vuelve a leer lo guardado (por ejemplo, si otra pestaña hizo cambios). */
  function sincronizar() {
    if (problema) return;
    const r = leer();
    if (r.ok && r.datos) datos = r.datos;
  }

  function notificar(evento) {
    oyentes.forEach((fn) => {
      try {
        fn(evento);
      } catch (e) {
        console.error(e);
      }
    });
  }

  /* ---------- Consultas ---------- */

  function buscarInterno(id) {
    return datos.casos.find((c) => c.id === id) || null;
  }

  function obtenerCaso(id) {
    const c = buscarInterno(id);
    return c ? clonar(c) : null;
  }

  function listarCasos(estado) {
    return clonar(
      datos.casos
        .filter((c) => !estado || c.estado === estado)
        .sort((a, b) => (a.actualizado < b.actualizado ? 1 : a.actualizado > b.actualizado ? -1 : 0))
    );
  }

  function contarPorEstado() {
    const cuenta = { todos: datos.casos.length };
    ORDEN_ESTADOS.forEach((e) => {
      cuenta[e] = 0;
    });
    datos.casos.forEach((c) => {
      cuenta[c.estado] += 1;
    });
    return cuenta;
  }

  /* ---------- Acciones ---------- */

  function validarLargo(valor, campo, etiqueta) {
    const { min, max } = LIMITES[campo];
    if (!valor) return `Escribe ${etiqueta}.`;
    if (valor.length < min) return `Escribe ${etiqueta} con al menos ${min} caracteres.`;
    if (valor.length > max) return `Acorta ${etiqueta} a ${max} caracteres como máximo.`;
    return null;
  }

  /** Valida el formulario de reporte. Devuelve un objeto { campo: mensaje } vacío si todo está bien. */
  function validarReporte(entrada) {
    const errores = {};
    const nombre = limpiarTexto(entrada.nombre);
    const equipo = limpiarTexto(entrada.equipo);
    const descripcion = limpiarTexto(entrada.descripcion, true);

    const eNombre = validarLargo(nombre, 'nombre', 'tu nombre');
    if (eNombre) errores.nombre = eNombre;
    else if (!/\p{L}/u.test(nombre)) errores.nombre = 'Escribe tu nombre usando letras.';

    if (!AREAS.includes(entrada.area)) errores.area = 'Selecciona el área donde trabajas.';

    const eEquipo = validarLargo(equipo, 'equipo', 'el equipo o sistema afectado');
    if (eEquipo) errores.equipo = eEquipo;

    const eDesc = validarLargo(descripcion, 'descripcion', 'la descripción del problema');
    if (eDesc) errores.descripcion = eDesc;

    return errores;
  }

  function mutar(id, fn) {
    sincronizar();
    const caso = buscarInterno(id);
    if (!caso) return { ok: false, error: `No existe el caso ${id}.` };
    const error = fn(caso);
    if (error) return { ok: false, error };
    caso.actualizado = caso.historial[caso.historial.length - 1].fecha;
    const guardado = guardar();
    notificar({ tipo: 'cambio', id });
    return { ok: true, caso: clonar(caso), guardado };
  }

  function agregarHistorial(caso, entrada) {
    caso.historial.push(Object.assign({ fecha: ahora() }, entrada));
  }

  function crearCaso(entrada) {
    const errores = validarReporte(entrada);
    if (Object.keys(errores).length) return { ok: false, errores };
    sincronizar();

    const maxExistente = datos.casos.reduce((m, c) => {
      const n = Number(c.id.replace('ACME-', ''));
      return Number.isFinite(n) && n > m ? n : m;
    }, 0);
    const numero = Math.max(datos.siguiente, maxExistente + 1);
    const fecha = ahora();
    const nombre = limpiarTexto(entrada.nombre);
    const caso = {
      id: formatearId(numero),
      nombre,
      area: entrada.area,
      equipo: limpiarTexto(entrada.equipo),
      descripcion: limpiarTexto(entrada.descripcion, true),
      estado: 'recibido',
      responsable: null,
      solucion: null,
      creado: fecha,
      actualizado: fecha,
      historial: [{ fecha, autor: nombre, tipo: 'registro', titulo: 'Caso registrado' }],
    };
    datos.casos.push(caso);
    datos.siguiente = numero + 1;
    const guardado = guardar();
    notificar({ tipo: 'cambio', id: caso.id });
    return { ok: true, caso: clonar(caso), guardado };
  }

  function asignarResponsable(id, responsable) {
    return mutar(id, (caso) => {
      if (!RESPONSABLES.includes(responsable)) return 'Selecciona un responsable de la lista.';
      if (caso.estado === 'resuelto' || caso.estado === 'cerrado') {
        return 'No se puede cambiar el responsable de un caso resuelto o cerrado.';
      }
      if (caso.responsable === responsable) return `${responsable} ya es responsable de este caso.`;
      const titulo = caso.responsable
        ? `Responsable cambiado de ${caso.responsable} a ${responsable}`
        : `Responsable asignado: ${responsable}`;
      caso.responsable = responsable;
      agregarHistorial(caso, { autor: 'Soporte TI', tipo: 'asignacion', titulo });
      return null;
    });
  }

  function iniciarAtencion(id) {
    return mutar(id, (caso) => {
      if (caso.estado !== 'recibido') return 'Solo los casos en estado Recibido pueden pasar a En atención.';
      if (!caso.responsable) return 'Asigna un responsable antes de iniciar la atención.';
      caso.estado = 'en_atencion';
      agregarHistorial(caso, { autor: 'Soporte TI', tipo: 'estado', titulo: 'Estado cambiado a En atención' });
      return null;
    });
  }

  function resolver(id, solucionTexto) {
    return mutar(id, (caso) => {
      if (caso.estado !== 'en_atencion') return 'Solo los casos En atención pueden marcarse como resueltos.';
      const solucion = limpiarTexto(solucionTexto, true);
      const error = validarLargo(solucion, 'solucion', 'la solución aplicada');
      if (error) return error;
      caso.estado = 'resuelto';
      caso.solucion = solucion;
      agregarHistorial(caso, { autor: 'Soporte TI', tipo: 'resuelto', titulo: 'Marcado como resuelto', detalle: solucion });
      return null;
    });
  }

  function confirmarCierre(id) {
    return mutar(id, (caso) => {
      if (caso.estado !== 'resuelto') return 'Solo puedes cerrar un caso que soporte marcó como resuelto.';
      caso.estado = 'cerrado';
      agregarHistorial(caso, { autor: caso.nombre, tipo: 'cierre', titulo: 'Solución confirmada y caso cerrado' });
      return null;
    });
  }

  function reabrir(id, motivoTexto) {
    return mutar(id, (caso) => {
      if (caso.estado !== 'resuelto') return 'Solo puedes devolver a soporte un caso marcado como resuelto.';
      const motivo = limpiarTexto(motivoTexto, true);
      const error = validarLargo(motivo, 'motivo', 'qué sigue fallando');
      if (error) return error;
      caso.estado = 'en_atencion';
      caso.solucion = null;
      agregarHistorial(caso, {
        autor: caso.nombre,
        tipo: 'reapertura',
        titulo: 'El problema continúa: caso devuelto a En atención',
        detalle: motivo,
      });
      return null;
    });
  }

  function comentar(id, textoComentario) {
    return mutar(id, (caso) => {
      if (caso.estado === 'cerrado') return 'No se pueden agregar comentarios a un caso cerrado.';
      const texto = limpiarTexto(textoComentario, true);
      const error = validarLargo(texto, 'comentario', 'el comentario');
      if (error) return error;
      agregarHistorial(caso, { autor: 'Soporte TI', tipo: 'comentario', titulo: 'Comentario de soporte', detalle: texto });
      return null;
    });
  }

  function restablecer() {
    datos = datosEjemplo();
    if (problema === 'datos-danados') problema = null;
    const guardado = guardar();
    notificar({ tipo: 'restablecer' });
    return { ok: true, guardado };
  }

  function obtenerRol() {
    return datos.rol === 'soporte' || datos.rol === 'trabajador' ? datos.rol : null;
  }

  function definirRol(rol) {
    if (rol !== 'soporte' && rol !== 'trabajador') return;
    if (datos.rol === rol) return;
    sincronizar();
    datos.rol = rol;
    guardar();
  }

  function escucharOtrasPestanas() {
    global.addEventListener('storage', (e) => {
      if (e.key !== CLAVE || problema) return;
      sincronizar();
      notificar({ tipo: 'externo' });
    });
  }

  global.MesaStore = {
    ESTADOS,
    ORDEN_ESTADOS,
    RESPONSABLES,
    AREAS,
    LIMITES,
    iniciar,
    escucharOtrasPestanas,
    obtenerProblema: () => problema,
    suscribir: (fn) => {
      oyentes.add(fn);
      return () => oyentes.delete(fn);
    },
    normalizarId,
    obtenerCaso,
    listarCasos,
    contarPorEstado,
    validarReporte,
    crearCaso,
    asignarResponsable,
    iniciarAtencion,
    resolver,
    confirmarCierre,
    reabrir,
    comentar,
    restablecer,
    obtenerRol,
    definirRol,
  };
})(window);
