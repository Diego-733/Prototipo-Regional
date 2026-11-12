"""
Prueba técnica en navegador del prototipo "Mesa de ayuda ACME".

Usa Playwright (Chromium sin interfaz) sobre index.html abierto como archivo local.
Recorre el flujo completo, guarda capturas en docs/capturas/ y escribe el resultado
en pruebas/resultado-ultima-ejecucion.txt.

Ejecución (desde la raíz del repositorio):
    uv run --python 3.12 --with playwright python pruebas/prueba_navegador.py
    (la primera vez: uv run --python 3.12 --with playwright python -m playwright install chromium)
"""
import datetime
import pathlib
import sys

from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

RAIZ = pathlib.Path(__file__).resolve().parent.parent
URL = RAIZ.joinpath('index.html').as_uri()
CAPTURAS = RAIZ / 'docs' / 'capturas'
CAPTURAS.mkdir(parents=True, exist_ok=True)
CLAVE = 'mesaAyudaAcme.v1'

resultados = []


def check(nombre, condicion, detalle=''):
    estado = 'OK   ' if condicion else 'FALLA'
    linea = f'[{estado}] {nombre}' + (f' — {detalle}' if detalle and not condicion else '')
    resultados.append((bool(condicion), linea))
    print(linea)


def capturar(page, nombre):
    page.screenshot(path=str(CAPTURAS / f'{nombre}.png'), full_page=True)


def nuevo_contexto(browser, **kw):
    opciones = {'viewport': {'width': 1366, 'height': 900}, 'reduced_motion': 'reduce', 'locale': 'es-CL'}
    opciones.update(kw)
    ctx = browser.new_context(**opciones)
    page = ctx.new_page()
    errores = []
    page.on('console', lambda m: errores.append(m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: errores.append(str(e)))
    return ctx, page, errores


def ir(page, ruta=''):
    page.goto(URL + ruta)
    page.wait_for_load_state('networkidle')


def esperar_texto(page, selector, texto):
    page.wait_for_function(
        '([s, t]) => { const e = document.querySelector(s); return !!e && e.textContent.includes(t); }', arg=[selector, texto])


def estado_caso(page):
    return page.locator('.case__header .status').inner_text().strip()


def casos_guardados(page):
    return page.evaluate(f"JSON.parse(localStorage.getItem('{CLAVE}')).casos.length")


def llenar_reporte(page, nombre='Pía Contreras', area='Bodega y logística', equipo='Lector de código de barras',
                   descripcion='El lector no reconoce los códigos desde esta mañana y no emite sonido al escanear.'):
    page.fill('#campo-nombre', nombre)
    page.select_option('#campo-area', area)
    page.fill('#campo-equipo', equipo)
    page.fill('#campo-descripcion', descripcion)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # ---------- 1. Inicio ----------
        ctx, page, errores = nuevo_contexto(browser)
        ir(page)
        check('Inicio: título "Mesa de ayuda ACME"', page.locator('.brand__name').inner_text() == 'Mesa de ayuda ACME')
        check('Inicio: aviso "Prototipo académico · Datos ficticios"',
              'Prototipo académico · Datos ficticios' in page.locator('.brand__note').inner_text())
        check('Inicio: se cargan 4 casos de ejemplo', casos_guardados(page) == 4)
        capturar(page, '01-inicio-escritorio')

        # ---------- 2. Registro y validación ----------
        page.click('text=Entrar como trabajador')
        page.wait_for_selector('#campo-nombre')
        check('Rol trabajador: abre "Reportar un problema"', page.locator('h1').inner_text() == 'Reportar un problema')
        page.click('form.report-form button[type=submit]')
        n_err = page.locator('.error-summary__list li').count()
        check('Validación: formulario vacío muestra 4 errores', n_err == 4, f'errores={n_err}')
        check('Validación: el foco va al primer campo con error',
              page.evaluate('document.activeElement.id') == 'campo-nombre')
        check('Validación: campos marcados con aria-invalid',
              page.locator('[aria-invalid=true]').count() == 4)
        capturar(page, '02-reporte-errores')

        page.fill('#campo-nombre', 'Pía Contreras')
        page.fill('#campo-descripcion', 'corto')
        page.click('form.report-form button[type=submit]')
        check('Validación: conserva lo escrito tras el error',
              page.input_value('#campo-nombre') == 'Pía Contreras' and page.input_value('#campo-descripcion') == 'corto')
        check('Validación: descripción corta pide mínimo de caracteres',
              'al menos 15' in page.locator('#campo-descripcion-error').inner_text())

        # Borrador conservado al recargar la pestaña
        page.reload()
        page.wait_for_load_state('networkidle')
        check('Borrador: se conserva al recargar la pestaña', page.input_value('#campo-nombre') == 'Pía Contreras')

        llenar_reporte(page)
        # Doble envío: dos envíos seguidos en el mismo instante
        page.evaluate("""() => { const f = document.querySelector('form.report-form'); f.requestSubmit(); f.requestSubmit(); }""")
        page.wait_for_selector('.ticket__number')
        numero = page.locator('.ticket__number').inner_text()
        check('Registro válido: muestra número ACME-005', numero == 'ACME-005', numero)
        check('Doble envío: se registró un solo caso', casos_guardados(page) == 5, f'casos={casos_guardados(page)}')
        page.wait_for_timeout(300)
        capturar(page, '03-confirmacion')

        # ---------- 3. Seguimiento ----------
        page.click('text=Ver seguimiento del caso')
        page.wait_for_selector('#caso-titulo')
        check('Confirmación → seguimiento del mismo caso', 'ACME-005' in page.locator('#caso-titulo').inner_text())
        check('Seguimiento: estado inicial Recibido', estado_caso(page) == 'Recibido')
        check('Seguimiento: muestra descripción', 'lector no reconoce' in page.locator('.case__summary').inner_text())
        check('Seguimiento: responsable "Sin asignar"', 'Sin asignar' in page.locator('.facts').inner_text())

        page.fill('#buscar-caso', 'acme-2')
        page.click('text=Buscar caso')
        esperar_texto(page, '#caso-titulo', 'ACME-002')
        check('Búsqueda: "acme-2" encuentra ACME-002', 'ACME-002' in page.locator('#caso-titulo').inner_text())
        check('Búsqueda: historial con fechas', page.locator('.timeline__item time').count() >= 5)

        page.fill('#buscar-caso', 'ACME-099')
        page.click('text=Buscar caso')
        page.wait_for_selector('#caso-no-encontrado')
        check('Búsqueda: caso inexistente muestra mensaje claro',
              'No encontramos el caso ACME-099' in page.locator('#caso-no-encontrado').inner_text())
        capturar(page, '04-seguimiento-no-encontrado')

        page.fill('#buscar-caso', 'xyz')
        page.click('text=Buscar caso')
        check('Búsqueda: formato inválido explica el formato',
              'Usa el formato ACME-001' in page.locator('#buscar-caso-error').inner_text())
        page.fill('#buscar-caso', '')
        page.click('text=Buscar caso')
        check('Búsqueda: campo vacío pide un número', 'Escribe un número de caso' in page.locator('#buscar-caso-error').inner_text())

        # ---------- 4. Soporte: asignación y estados ----------
        ir(page, '#/seguimiento/ACME-005')
        page.click('.role-switch__option[data-rol=soporte]')
        page.wait_for_selector('#form-asignar')
        check('Cambio de rol conserva el caso (trabajador → soporte)', page.url.endswith('#/soporte/ACME-005'), page.url)

        page.click('#form-iniciar button')
        check('Regla: no inicia atención sin responsable',
              'Asigna un responsable' in page.locator('#form-iniciar-error-general').inner_text() and estado_caso(page) == 'Recibido')

        page.select_option('#responsable', 'Ana Soto')
        page.click('#form-asignar button')
        page.wait_for_selector('#aviso')
        check('Asignación: confirma "Responsable asignado: Ana Soto"', 'Ana Soto' in page.locator('#aviso').inner_text())
        check('Asignación: queda en el historial', 'Responsable asignado: Ana Soto' in page.locator('.timeline').inner_text())

        page.click('#form-iniciar button')
        page.wait_for_selector('#aviso')
        check('Estado: pasa a En atención', estado_caso(page) == 'En atención')

        page.click('#form-comentar button')
        check('Comentario vacío: muestra error', page.locator('#comentario-error').is_visible())
        page.fill('#comentario', 'Revisaré el lector en bodega a las 15:00.')
        page.click('#form-comentar button')
        page.wait_for_selector('#aviso')
        check('Comentario: queda en el historial', 'Revisaré el lector en bodega' in page.locator('.timeline').inner_text())

        page.click('#form-resolver button')
        check('Regla: no marca Resuelto sin solución',
              page.locator('#solucion-error').is_visible() and estado_caso(page) == 'En atención')
        page.fill('#solucion', 'Se reconfiguró el lector con el código de fábrica.')
        page.click('#form-resolver button')
        page.wait_for_selector('#aviso')
        check('Estado: pasa a Resuelto con solución', estado_caso(page) == 'Resuelto')
        capturar(page, '05-soporte-detalle-resuelto')

        # ---------- 5. Reapertura y cierre ----------
        page.click('.role-switch__option[data-rol=trabajador]')
        page.wait_for_selector('#form-cerrar')
        check('Cambio de rol conserva el caso (soporte → trabajador)', page.url.endswith('#/seguimiento/ACME-005'), page.url)
        check('Trabajador ve la solución aplicada', 'código de fábrica' in page.locator('.case__section--solution').inner_text())
        capturar(page, '06-trabajador-confirmar-solucion')

        page.click('#form-reabrir button')
        check('Reapertura sin motivo: muestra error', page.locator('#motivo-error').is_visible())
        page.fill('#motivo', 'Sigue sin leer los códigos pequeños de las cajas.')
        page.click('#form-reabrir button')
        page.wait_for_selector('#aviso')
        check('Reapertura: vuelve a En atención', estado_caso(page) == 'En atención')
        check('Reapertura: queda en el historial', 'El problema continúa' in page.locator('.timeline').inner_text())

        page.click('.role-switch__option[data-rol=soporte]')
        page.wait_for_selector('#form-resolver')
        check('Soporte ve la reapertura y el responsable se mantiene', 'Ana Soto' in page.locator('.facts').inner_text())
        page.fill('#solucion', 'Se actualizó el firmware del lector y se probó con cajas reales.')
        page.click('#form-resolver button')
        page.wait_for_selector('#aviso')

        page.click('.role-switch__option[data-rol=trabajador]')
        page.wait_for_selector('#form-cerrar')
        page.click('#form-cerrar button')
        page.wait_for_selector('#aviso')
        check('Cierre: el trabajador confirma y queda Cerrado', estado_caso(page) == 'Cerrado')

        page.click('.role-switch__option[data-rol=soporte]')
        page.wait_for_selector('#caso-titulo')
        check('Soporte ve el caso Cerrado y sin formularios',
              estado_caso(page) == 'Cerrado' and page.locator('#caso-titulo ~ * form, .actions form').count() == 0)

        # ---------- 6. Panel y filtros ----------
        ir(page, '#/soporte')
        check('Panel: lista 5 casos', page.locator('.cases-table tbody tr').count() == 5)
        page.click('#filtro-cerrado')
        esperar_texto(page, '.cases-table__caption', 'Cerrado')
        filas = page.locator('.cases-table tbody tr').count()
        estados = set(page.locator('.cases-table tbody .status').all_inner_texts())
        check('Filtro Cerrado: solo casos cerrados y estado en la URL', filas == 2 and estados == {'Cerrado'} and page.url.endswith('estado=cerrado'), f'filas={filas} estados={estados} url={page.url}')
        page.click('#filtro-recibido')
        esperar_texto(page, '.cases-table__caption', 'Recibido')
        check('Filtro Recibido: muestra ACME-004', page.locator('.cases-table tbody').inner_text().count('ACME-') == 1)
        page.click('#filtro-todos')
        esperar_texto(page, '.cases-table__caption', 'en total')
        capturar(page, '07-panel-soporte')

        # ---------- 7. Persistencia ----------
        page.reload()
        page.wait_for_load_state('networkidle')
        ir(page, '#/seguimiento/ACME-005')
        check('Persistencia: tras recargar, ACME-005 sigue Cerrado', estado_caso(page) == 'Cerrado')
        check('Persistencia: historial completo tras recargar', page.locator('.timeline__item').count() == 8,
              f'eventos={page.locator(".timeline__item").count()}')

        # ---------- 8. Texto seguro ----------
        ir(page, '#/reportar')
        llenar_reporte(page, nombre='<b>Ana</b> Prueba', equipo='<script>alert(1)</script>',
                       descripcion='<img src=x onerror="window.__xss=1"> texto con etiquetas HTML')
        page.click('form.report-form button[type=submit]')
        page.wait_for_selector('.ticket__number')
        ir(page, '#/seguimiento/ACME-006')
        check('Texto seguro: etiquetas se muestran como texto',
              '<img src=x' in page.locator('.case__summary').inner_text() and page.locator('main img, main b, main script').count() == 0)
        check('Texto seguro: no se ejecuta código', page.evaluate('window.__xss') is None)

        # ---------- 9. Restablecer ----------
        page.click('#btn-restablecer')
        check('Restablecer: pide confirmación', page.locator('#dialogo-restablecer').is_visible())
        page.click('#dialogo-restablecer button[value=cancelar]')
        check('Restablecer: Cancelar no borra datos', casos_guardados(page) == 6)
        check('Restablecer: el foco vuelve al botón', page.evaluate('document.activeElement.id') == 'btn-restablecer')
        page.click('#btn-restablecer')
        page.keyboard.press('Escape')
        check('Restablecer: Escape cierra sin borrar', casos_guardados(page) == 6 and not page.locator('#dialogo-restablecer').is_visible())
        page.click('#btn-restablecer')
        capturar(page, '08-dialogo-restablecer')
        page.click('#dialogo-restablecer button[value=confirmar]')
        page.wait_for_selector('#aviso')
        check('Restablecer: vuelven los 4 casos de ejemplo', casos_guardados(page) == 4)
        ir(page, '#/seguimiento/ACME-005')
        check('Restablecer: ACME-005 ya no existe', page.locator('#caso-no-encontrado').count() == 1)
        check('Sin errores de JavaScript en el recorrido', not errores, '; '.join(errores))
        ctx.close()

        # ---------- 10. Teclado ----------
        ctx, page, errores = nuevo_contexto(browser)
        ir(page)
        page.keyboard.press('Tab')
        check('Teclado: el primer Tab llega a "Saltar al contenido"',
              page.evaluate('document.activeElement.className') == 'skip-link')
        page.keyboard.press('Enter')
        check('Teclado: "Saltar al contenido" no cambia de pantalla',
              page.evaluate('document.activeElement.id') == 'contenido' and page.locator('h1').inner_text() == '¿Qué necesitas hacer?')
        page.keyboard.press('Tab')
        anillo = page.evaluate("getComputedStyle(document.activeElement).outlineStyle")
        check('Teclado: foco visible en el siguiente control', anillo != 'none', anillo)
        # Recorrido de reporte solo con teclado
        ir(page, '#/reportar')
        page.focus('#campo-nombre')
        page.keyboard.type('Luis Toro')
        page.keyboard.press('Tab')
        page.keyboard.press('ArrowDown')  # elige la primera área
        page.keyboard.press('Tab')
        page.keyboard.type('Monitor')
        page.keyboard.press('Tab')
        page.keyboard.type('El monitor parpadea y se apaga cada cinco minutos.')
        page.keyboard.press('Tab')
        foco_boton = page.evaluate('document.activeElement.textContent')
        page.keyboard.press('Enter')
        page.wait_for_selector('.ticket__number')
        check('Teclado: formulario completo con Tab y Enter', foco_boton == 'Registrar problema' and page.locator('.ticket__number').inner_text() == 'ACME-005',
              f'boton={foco_boton}')
        # Filtros con flechas
        ir(page, '#/soporte')
        page.focus('#filtro-todos')
        page.keyboard.press('ArrowRight')
        esperar_texto(page, '.cases-table__caption', 'Recibido')
        check('Teclado: filtros se cambian con flechas y mantienen el foco',
              page.evaluate('document.activeElement.id') == 'filtro-recibido')
        check('Teclado: sin errores de JavaScript', not errores, '; '.join(errores))
        ctx.close()

        # ---------- 11. Pantalla móvil ----------
        ctx, page, errores = nuevo_contexto(browser, viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
        for ruta, nombre in [('', '09-movil-inicio'), ('#/reportar', '10-movil-reporte'),
                             ('#/seguimiento/ACME-002', '11-movil-seguimiento'), ('#/soporte', '12-movil-panel'),
                             ('#/soporte/ACME-003', '13-movil-detalle-soporte')]:
            ir(page, ruta)
            desborde = page.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            check(f'Móvil 390px: sin desplazamiento horizontal en {ruta or "inicio"}', desborde <= 0, f'desborde={desborde}px')
            capturar(page, nombre)
        ir(page, '#/soporte')
        alto_min = page.evaluate("Math.min(...[...document.querySelectorAll('main button, main .filters__option label, .role-switch__option')].map(e => e.getBoundingClientRect().height))")
        check('Móvil: controles de al menos 44 px de alto', alto_min >= 44, f'min={alto_min}')
        check('Móvil: sin errores de JavaScript', not errores, '; '.join(errores))
        ctx.close()

        ctx, page, errores = nuevo_contexto(browser, viewport={'width': 320, 'height': 640}, is_mobile=True, has_touch=True)
        for ruta in ['', '#/reportar', '#/confirmacion/ACME-004', '#/seguimiento/ACME-002', '#/soporte', '#/soporte/ACME-003']:
            ir(page, ruta)
            desborde = page.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            check(f'Móvil 320px: sin desplazamiento horizontal en {ruta or "inicio"}', desborde <= 0, f'desborde={desborde}px')
        ctx.close()

        # ---------- 12. Problemas de almacenamiento ----------
        ctx, page, errores = nuevo_contexto(browser)
        page.add_init_script("Storage.prototype.setItem = function () { throw new DOMException('bloqueado', 'SecurityError'); };")
        ir(page)
        check('Almacenamiento bloqueado: muestra aviso comprensible',
              page.locator('#storage-banner').is_visible() and 'no permite guardar' in page.locator('#storage-banner').inner_text())
        ir(page, '#/reportar')
        llenar_reporte(page)
        page.click('form.report-form button[type=submit]')
        page.wait_for_selector('.ticket__number')
        check('Almacenamiento bloqueado: la demostración sigue funcionando en memoria',
              page.locator('.ticket__number').inner_text() == 'ACME-005')
        capturar(page, '14-aviso-almacenamiento')
        ctx.close()

        ctx, page, errores = nuevo_contexto(browser)
        ir(page)
        page.evaluate(f"localStorage.setItem('{CLAVE}', '{{datos dañados')")
        page.reload()
        page.wait_for_load_state('networkidle')
        check('Datos dañados: avisa y ofrece restablecer',
              'no se pudieron leer' in page.locator('#storage-banner').inner_text()
              and page.locator('#storage-banner button').count() == 1)
        page.click('#storage-banner button')
        page.click('#dialogo-restablecer button[value=confirmar]')
        page.wait_for_selector('#aviso')
        check('Datos dañados: restablecer recupera el guardado', page.locator('#storage-banner').is_hidden() and casos_guardados(page) == 4)
        ctx.close()

        browser.close()

    total = len(resultados)
    fallas = [l for ok, l in resultados if not ok]
    resumen = f'{total - len(fallas)} de {total} comprobaciones correctas.'
    print('\n' + resumen)
    salida = RAIZ / 'pruebas' / 'resultado-ultima-ejecucion.txt'
    salida.write_text(
        f'Ejecución: {datetime.datetime.now().isoformat(timespec="seconds")}\n'
        f'Navegador: Chromium (Playwright, sin interfaz)\n\n'
        + '\n'.join(l for _, l in resultados) + f'\n\n{resumen}\n',
        encoding='utf-8',
    )
    return 1 if fallas else 0


if __name__ == '__main__':
    sys.exit(main())
