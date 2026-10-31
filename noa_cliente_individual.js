// NOA CLIENTE - UN SOLO FORMULARIO para Nuevo y Editar.
// Mismos campos, nombres y orden que el Excel "Formato columnas" de Emmanuel (07-10-26): Cliente, Póliza, Aseguradora, Línea,
// Forma de pago, Vencimiento, F. Límite (se calcula sola), Prima, Moneda, Objeto Asegurado, Año, Placa, Próx Pago, Medio de cobro;
// y el detalle del botón Ver: Identificación, Tel / WA, Otros tel., Email, Otros correos, Dirección, Planillas, Inicio y Vence del contrato.
// Obligatorios: Cliente, Póliza y Vencimiento; lo demás es opcional y, si queda vacío, queda vacío (no se inventa nada).
// Marca y Modelo no están en ese Excel pero se conservan en un grupo aparte ("por revisar") hasta decidir con Emmanuel.
// El contenido que se escribe se guarda en MAYÚSCULA (menos los correos).
// - Nuevo: guarda en la base (Neon) por /api/clientes?action=guardar. Antes revisa que la póliza no exista ya
//   (ni activa ni en la Papelera), porque el servidor, si la póliza existe, ACTUALIZA ese cliente en vez de crear otro.
// - Editar: manda solo los campos que cambiaron, por actualizarClienteSupabase (que ya apunta a Neon).
// - Fechas: se escriben con calendario y viajan planas (AAAA-MM-DD). "Próx Pago" se calcula solo, en Nuevo y en Editar,
//   cuando cambia la fecha de cobro o la forma de pago: fecha de cobro + (mensual 1 mes, trimestral 3, semestral 6, anual 12),
//   igual que al marcar un pago. Si la persona escribe Próx Pago a mano, no se pisa.
(function () {
  'use strict';

  const norm = s => (s == null ? '' : String(s)).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
  const p2 = n => String(n).padStart(2, '0');

  const PERIODICIDADES = ['Mensual', 'Trimestral', 'Semestral', 'Anual', 'Cuatrimestral']; /*NOA_DM_MEDIO*/
  const MEDIOS = ['Cargo Automático', 'Deducción Mensual']; /*NOA_SIN_OFICINA*/

  // t: text | date | number | select | calc (se calcula y no se guarda). ops: [valor, rótulo]. req: obligatorio. full: ocupa toda la fila.
  const GRUPOS = [
    { titulo: '📄 Póliza y cobro', campos: [
      { k: 'asegurado', l: 'Cliente', t: 'text', req: true, full: true },
      { k: 'poliza', l: 'Póliza', t: 'text', req: true },
      { k: 'acreedor', l: 'Acreedor', t: 'text' },
      { k: 'aseguradora', l: 'Aseguradora', t: 'text' },
      { k: 'tipo_seguro', l: 'Línea', t: 'text' },
      { k: 'periodicidad', l: 'Forma de pago', t: 'select', ops: PERIODICIDADES.map(x => [x, x]) },
      { k: 'desde_cobro', l: 'Vencimiento', t: 'date', req: true },
      { k: 'fecha_limite', l: 'F. Límite (se calcula sola)', t: 'calc' },
      { k: 'prima', l: 'Prima', t: 'number' },
      { k: 'moneda', l: 'Moneda', t: 'select', ops: [['CRC', '₡ Colones'], ['USD', '$ Dólares']], sinVacio: true },
      { k: 'objeto_asegurado', l: 'Objeto Asegurado', t: 'text' },
      { k: 'anio', l: 'Año', t: 'text' },
      { k: 'placa', l: 'Placa', t: 'text' },
      { k: 'hasta', l: 'Próx Pago', t: 'date' },
      { k: 'medio_cobro', l: 'Medio de cobro', t: 'select', ops: MEDIOS.map(x => [x, x]) }
    ] },
    { titulo: '👤 Detalle del cliente (botón Ver)', campos: [
      { k: 'identificacion', l: 'Identificación', t: 'text' },
      { k: 'telefono', l: 'Tel / WA', t: 'text' },
      { k: 'telefonos_extra', l: 'Otros tel.', t: 'text' },
      { k: 'correo', l: 'Email', t: 'text', minus: true },
      { k: 'correos_extra', l: 'Otros correos', t: 'text', minus: true },
      { k: 'direccion', l: 'Dirección', t: 'text', full: true },
      { k: 'planillas', l: 'Planillas', t: 'select', ops: [['Sí', 'Sí'], ['No', 'No']], sinVacio: true }
    ] },
    { titulo: '📋 Contrato', campos: [
      { k: 'desde', l: 'Inicio', t: 'date' },
      { k: 'vence_contrato', l: 'Vence', t: 'date' }
    ] }
  ]; /*NOA_SIN_MARCA_MODELO*/
  // Campos que se guardan (F. Límite solo se muestra). minus: se guarda tal cual, sin pasar a mayúscula (correos).
  const TODOS = GRUPOS.reduce((a, g) => a.concat(g.campos), []);
  const CAMPOS = TODOS.filter(c => c.t !== 'calc');

  // ---------- Fechas planas ----------
  function fechaInput(v) {
    if (v === null || v === undefined || v === '') return '';
    const E = window.NOA_ESTADO;
    if (E && typeof E.parseFecha === 'function') {
      const f = E.parseFecha(v);
      if (f) return f.iso;
    }
    const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? m[0] : '';
  }
  function sumarMeses(iso, n) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    if (!m || !n) return '';
    let y = +m[1], mo = (+m[2] - 1) + n, d = +m[3];
    y += Math.floor(mo / 12);
    mo = ((mo % 12) + 12) % 12;
    const ultimo = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
    if (d > ultimo) d = ultimo;
    return y + '-' + p2(mo + 1) + '-' + p2(d);
  }
  function mesesDe(per) {
    const p = norm(per);
    if (!p) return 0;
    if (p.indexOf('semes') !== -1) return 6;
    if (p.indexOf('cuatri') !== -1) return 4;
    if (p.indexOf('trimest') !== -1) return 3;
    if (p.indexOf('anual') !== -1 || p === 'ano') return 12;
    if (p.indexOf('mensual') !== -1 || p === 'mes') return 1;
    return 0;
  }

  // ---------- Estado del formulario abierto ----------
  let ST = { modo: 'nuevo', id: null, original: {}, hastaManual: false, guardando: false };

  function buscar(id) {
    const a = (window.datosReales || []).find(c => String(c.id) === String(id));
    return a || (window._datosRealesBackup || []).find(c => String(c.id) === String(id)) || null;
  }
  function todosLosClientes() {
    return window._datosRealesBackup || window.datosReales || [];
  }

  // Valor inicial de un campo, tal como se muestra en el formulario
  function valorInicial(c, cliente) {
    const v = cliente ? cliente[c.k] : null;
    if (c.t === 'date') return fechaInput(v);
    if (c.t === 'number') return (v !== null && v !== undefined && Number(v) > 0) ? String(Number(v)) : '';
    if (c.k === 'planillas') return (cliente && cliente.planillas) ? 'Sí' : 'No';
    if (c.k === 'moneda') {
      if (!cliente) return 'CRC';
      const m = norm(v);
      if (m.indexOf('usd') !== -1 || m.indexOf('dolar') !== -1) return 'USD';
      return 'CRC';
    }
    if (c.t === 'select') {
      const hallado = c.ops.find(o => norm(o[0]) === norm(v));
      return hallado ? hallado[0] : String(v == null ? '' : v).trim();
    }
    return String(v == null ? '' : v).trim();
  }

  // ---------- Dibujo ----------
  const ESTILO_INPUT = 'width:100%;box-sizing:border-box;background:#111827;border:1px solid #374151;border-radius:8px;color:#fff;padding:10px;font-size:14px;color-scheme:dark;';

  function campoHTML(c, valor) {
    const id = 'fc-' + c.k;
    let input;
    if (c.t === 'calc') {
      input = '<input type="text" id="' + id + '" value="' + esc(valor) + '" readonly tabindex="-1" style="' + ESTILO_INPUT + 'opacity:.75;cursor:default;">';
    } else if (c.t === 'select') {
      const ops = c.ops.slice();
      if (valor && !ops.some(o => o[0] === valor)) ops.push([valor, valor]);
      input = '<select id="' + id + '" style="' + ESTILO_INPUT + '">' +
        (c.sinVacio ? '' : '<option value="">— Seleccionar —</option>') +
        ops.map(o => '<option value="' + esc(o[0]) + '"' + (o[0] === valor ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') +
        '</select>';
    } else {
      const conLista = (c.k === 'aseguradora' || c.k === 'tipo_seguro');
      input = '<input type="' + c.t + '" id="' + id + '" value="' + esc(valor) + '"' + (c.t === 'number' ? ' min="0" step="0.01"' : '') + (conLista ? ' list="fc-dl-' + c.k + '" autocomplete="off"' : '') + ' style="' + ESTILO_INPUT + '">' +
        (conLista ? '<datalist id="fc-dl-' + c.k + '"></datalist>' : '') +
        (c.k === 'tipo_seguro' ? '<span style="color:#6B7280;font-size:12px;">Elija de la lista o escriba una línea nueva: queda guardada y aparece la próxima vez.</span>' : '');
    }
    return '<div style="display:flex;flex-direction:column;gap:5px;' + (c.full ? 'grid-column:1 / -1;' : '') + '">' +
      '<label for="' + id + '" style="color:#9CA3AF;font-size:13px;font-weight:500;">' + esc(c.l) + (c.req ? ' <span style="color:#F87171">*</span>' : '') + '</label>' +
      input + '</div>';
  }

  // Listas de ayuda: aseguradoras y líneas que ya existen en la cartera, las más usadas primero.
  // La lista de Línea muestra solo las de la aseguradora escrita (o todas si no hay coincidencia).
  function armarListas() {
    const dlA = document.getElementById('fc-dl-aseguradora'), dlL = document.getElementById('fc-dl-tipo_seguro');
    const elA = document.getElementById('fc-aseguradora');
    if (!dlA || !dlL || !elA) return;
    const lista = todosLosClientes();
    const limpio = x => String(x == null ? '' : x).trim().toUpperCase();
    const cuenta = (filas, campo) => {
      const m = {};
      filas.forEach(r => { const v = limpio(r[campo]); if (v) m[v] = (m[v] || 0) + 1; });
      return Object.keys(m).sort((a, b) => m[b] - m[a] || a.localeCompare(b));
    };
    const pintar = (dl, vals) => { dl.innerHTML = vals.slice(0, 60).map(v => '<option value="' + esc(v) + '"></option>').join(''); };
    pintar(dlA, cuenta(lista, 'aseguradora'));
    const refrescar = () => {
      const a = norm(elA.value);
      const propias = a ? lista.filter(r => norm(r.aseguradora) === a) : [];
      pintar(dlL, cuenta(propias.length ? propias : lista, 'tipo_seguro'));
    };
    elA.addEventListener('input', refrescar);
    elA.addEventListener('change', refrescar);
    refrescar();
  }

  function cerrar() {
    const m = document.getElementById('modal-cliente-noa');
    if (m && typeof m.remove === 'function') m.remove();
    ['modal-nuevo-cliente', 'modal-editar-cliente'].forEach(function (id) {
      const v = document.getElementById(id);
      if (v && typeof v.remove === 'function') v.remove();
    });
    if (typeof document.removeEventListener === 'function' && ST.teclas) { document.removeEventListener('keydown', ST.teclas); ST.teclas = null; }
  }

  function mostrarError(texto, k) {
    const e = document.getElementById('fc-error');
    if (e) { e.textContent = texto || ''; e.style.display = texto ? 'block' : 'none'; }
    CAMPOS.forEach(function (c) {
      const el = document.getElementById('fc-' + c.k);
      if (el) el.style.borderColor = (k && c.k === k) ? '#EF4444' : '#374151';
    });
    if (k) { const el = document.getElementById('fc-' + k); if (el && typeof el.focus === 'function') el.focus(); }
  }

  function recalcularHasta() {
    if (ST.hastaManual) return;
    const d = document.getElementById('fc-desde_cobro'), per = document.getElementById('fc-periodicidad'), h = document.getElementById('fc-hasta');
    if (!d || !per || !h) return;
    const nuevo = sumarMeses(d.value, mesesDe(per.value));
    // Al editar nunca se borra un Próx Pago que ya existe solo porque la forma de pago no se reconoce
    if (nuevo || ST.modo === 'nuevo') h.value = nuevo;
  }

  // F. Límite = Vencimiento + días hábiles de gracia (misma regla de Cartera: NOA_ESTADO.limiteDe). Solo se muestra, no se guarda.
  function recalcularLimite() {
    const el = document.getElementById('fc-fecha_limite'), d = document.getElementById('fc-desde_cobro'), per = document.getElementById('fc-periodicidad');
    if (!el) return;
    let txt = '';
    try {
      const E = window.NOA_ESTADO;
      if (E && d && d.value && typeof E.limiteDe === 'function' && typeof E.parseFecha === 'function') {
        const base = (ST.modo === 'editar' && ST.id) ? (buscar(ST.id) || {}) : {};
        const L = E.limiteDe(Object.assign({}, base, { periodicidad: per ? per.value : base.periodicidad, desde_cobro: d.value }), E.parseFecha(d.value));
        if (L && L.iso) txt = (typeof E.aDDMM === 'function') ? E.aDDMM(L.iso) : L.iso;
      }
    } catch (e) { txt = ''; }
    el.value = txt;
  }

  function abrir(modo, id) {
    let cliente = null;
    if (modo === 'editar') {
      cliente = buscar(id);
      if (!cliente) { alert('Cliente no encontrado'); return; }
    }
    cerrar();
    ST = { modo: modo, id: cliente ? String(cliente.id) : null, original: {}, hastaManual: false, guardando: false, teclas: null };
    const valores = {};
    CAMPOS.forEach(function (c) { valores[c.k] = valorInicial(c, cliente); });
    ST.original = Object.assign({}, valores);
    valores.fecha_limite = '';

    const m = document.createElement('div');
    m.id = 'modal-cliente-noa';
    m.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);z-index:10000;display:flex;justify-content:center;align-items:center;';
    const titulo = modo === 'nuevo' ? '➕ Nuevo cliente' : '✏️ Editar cliente';
    const nota = modo === 'nuevo'
      ? 'Solo Cliente, Póliza y Vencimiento son obligatorios. Próx Pago y F. Límite se calculan solos con el Vencimiento y la forma de pago. Todo se guarda en MAYÚSCULA.'
      : 'Solo se guardan los campos que cambie. Si cambia el Vencimiento o la forma de pago, Próx Pago se recalcula (puede corregirlo a mano). Lo que escriba se guarda en MAYÚSCULA.';
    m.innerHTML =
      '<div style="background:#1F2937;border-radius:16px;width:92%;max-width:760px;max-height:90vh;overflow-y:auto;padding:26px;box-shadow:0 20px 60px rgba(0,0,0,.5);">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
          '<h2 style="margin:0;color:#fff;font-size:22px;">' + titulo + '</h2>' +
          '<button type="button" id="fc-x" title="Cerrar" style="background:none;border:none;color:#fff;font-size:28px;cursor:pointer;">&times;</button>' +
        '</div>' +
        '<p style="margin:0 0 14px 0;color:#94A3B8;font-size:12px;">' + esc(nota) + '</p>' +
        '<form id="fc-form" novalidate>' +
          GRUPOS.map(function (g) {
            return '<div style="margin-bottom:16px;"><div style="color:#7DD3FC;font-weight:700;font-size:13px;margin-bottom:8px;border-bottom:1px solid #334155;padding-bottom:4px;">' + g.titulo + '</div>' +
              '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;">' +
              g.campos.map(function (c) { return campoHTML(c, valores[c.k]); }).join('') + '</div></div>';
          }).join('') +
          '<div id="fc-error" style="display:none;background:rgba(239,68,68,.15);border:1px solid #EF4444;color:#FCA5A5;border-radius:8px;padding:10px;font-size:13px;margin-bottom:12px;"></div>' +
          '<div style="display:flex;gap:12px;justify-content:flex-end;">' +
            '<button type="button" id="fc-cancelar" style="background:#4B5563;color:#fff;border:none;padding:12px 24px;border-radius:8px;font-size:14px;cursor:pointer;">Cancelar</button>' +
            '<button type="submit" id="fc-guardar" style="background:linear-gradient(135deg,#10B981,#059669);color:#fff;border:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">' + (modo === 'nuevo' ? '💾 Guardar cliente' : '💾 Guardar cambios') + '</button>' +
          '</div>' +
        '</form>' +
      '</div>';
    document.body.appendChild(m);
    recalcularLimite();
    armarListas(); /*NOA_LINEAS_ASEG*/

    document.getElementById('fc-x').onclick = cerrar;
    document.getElementById('fc-cancelar').onclick = cerrar;
    document.getElementById('fc-form').addEventListener('submit', function (e) { e.preventDefault(); guardar(); });
    const d = document.getElementById('fc-desde_cobro'), per = document.getElementById('fc-periodicidad'), h = document.getElementById('fc-hasta');
    if (d) d.addEventListener('change', recalcularHasta);
    if (per) per.addEventListener('change', recalcularHasta);
    if (d) d.addEventListener('change', recalcularLimite);
    if (per) per.addEventListener('change', recalcularLimite);
    // Si la persona escribe Próx Pago, ya no se pisa; si lo borra, el cálculo automático vuelve
    if (h) h.addEventListener('input', function () { ST.hastaManual = String(h.value || '') !== ''; });
    ST.teclas = function (e) { if (e && e.key === 'Escape') cerrar(); };
    if (typeof document.addEventListener === 'function') document.addEventListener('keydown', ST.teclas);
    const primero = document.getElementById(modo === 'nuevo' ? 'fc-asegurado' : 'fc-asegurado');
    if (primero && typeof primero.focus === 'function') primero.focus();
  }

  // ---------- Lectura y validación ----------
  function leer() {
    const o = {};
    CAMPOS.forEach(function (c) {
      const el = document.getElementById('fc-' + c.k);
      let x = el ? String(el.value).trim() : '';
      if (c.t === 'text' && !c.minus) x = x.toUpperCase();
      o[c.k] = x;
    });
    return o;
  }
  function validar(v) {
    if (!v.asegurado) return { k: 'asegurado', texto: 'El nombre del cliente es obligatorio.' };
    if (!v.poliza) return { k: 'poliza', texto: 'La póliza es obligatoria.' };
    if (!v.desde_cobro) return { k: 'desde_cobro', texto: 'El Vencimiento (fecha de cobro) es obligatorio (revise que sea una fecha que exista, por ejemplo no 31/09).' };
    if (v.prima !== '' && (isNaN(Number(v.prima)) || Number(v.prima) < 0)) return { k: 'prima', texto: 'El monto no es válido.' };
    return null;
  }

  async function usuario() {
    const u = (typeof getUserNOA === 'function') ? await getUserNOA() : null;
    return u && u.id ? u : null;
  }

  function refrescarPantalla() {
    if (typeof window.renderizarCartera === 'function') { try { window.renderizarCartera(); } catch (e) { console.error(e); } }
    ['actualizarSemaforo', 'actualizarTodosLosIndicadores'].forEach(function (n) {
      if (typeof window[n] === 'function') { try { window[n](); } catch (e) { console.error(e); } }
    });
  }

  // ---------- Guardar ----------
  async function guardarNuevo(v) {
    const u = await usuario();
    if (!u) { mostrarError('Debe iniciar sesión.'); return false; }
    const poliza = v.poliza;
    const clave = norm(poliza);
    const igual = todosLosClientes().find(c => norm(c.poliza) === clave);
    if (igual) {
      mostrarError('Ya existe un cliente con la póliza ' + poliza + ' (' + (igual.asegurado || 'sin nombre') + '). Búsquelo en Cartera y use ✏️ Editar.', 'poliza');
      return false;
    }
    // El servidor, si la póliza existe, actualiza ese cliente aunque esté en la Papelera: se revisa antes.
    let borrados;
    try {
      const r = await fetch('/api/clientes?action=borrados&user_id=' + encodeURIComponent(u.id));
      const d = await r.json();
      if (!r.ok || !d || d.success === false) throw new Error((d && d.error) || ('Error ' + r.status));
      borrados = d.clientes || [];
    } catch (e) {
      mostrarError('No pude revisar la Papelera, no se guardó nada. Intente de nuevo. (' + e.message + ')');
      return false;
    }
    const enPapelera = borrados.find(c => norm(c.poliza) === clave);
    if (enPapelera) {
      mostrarError('La póliza ' + poliza + ' está en la Papelera (' + (enPapelera.asegurado || 'sin nombre') + '). Restáurela desde Papelera en vez de crearla de nuevo.', 'poliza');
      return false;
    }

    const cliente = {};
    CAMPOS.forEach(function (c) {
      const x = v[c.k];
      if (c.t === 'date') cliente[c.k] = x || null;
      else if (c.t === 'number') cliente[c.k] = x === '' ? 0 : Number(x);
      else if (c.k === 'planillas') cliente[c.k] = (x === 'Sí');
      else cliente[c.k] = x;
    });
    if (!cliente.moneda) cliente.moneda = 'CRC';

    const resp = await fetch('/api/clientes?action=guardar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: u.id, clientes: [cliente] })
    });
    let datos = null;
    try { datos = await resp.json(); } catch (e) { datos = null; }
    if (!resp.ok || !datos || datos.success === false) throw new Error((datos && datos.error) || ('Error ' + resp.status));
    if (datos.fallidos && datos.fallidos.length) throw new Error(datos.fallidos[0].error || 'El cliente no se pudo guardar');
    if (datos.nuevos !== 1) throw new Error('El sistema no creó un cliente nuevo (resultado inesperado). Revise Cartera antes de repetir.');

    cerrar();
    if (typeof window.cargarDatos === 'function') { try { await window.cargarDatos(); } catch (e) { console.error(e); } }
    else { location.reload(); return true; }
    refrescarPantalla();
    alert('✅ Cliente guardado.\n\nBúsquelo en Cartera por el nombre o la póliza.');
    return true;
  }

  async function guardarCambios(v) {
    const cliente = buscar(ST.id);
    if (!cliente) { mostrarError('Cliente no encontrado.'); return false; }
    const cambios = {};
    CAMPOS.forEach(function (c) {
      const nuevo = v[c.k], orig = ST.original[c.k];
      if (c.t === 'number') {
        if (nuevo === '') return;
        if (parseFloat(nuevo || 0) !== parseFloat(orig || 0)) cambios[c.k] = Number(nuevo);
      } else {
        // En texto, cambiar solo mayúsculas/minúsculas no cuenta como cambio (todo se muestra y guarda en mayúscula)
        const cambio = c.t === 'text'
          ? (c.minus ? nuevo !== orig : String(nuevo).toUpperCase() !== String(orig).toUpperCase())
          : nuevo !== orig;
        if (cambio) cambios[c.k] = (c.t === 'date') ? (nuevo || null) : (c.k === 'planillas' ? (nuevo === 'Sí') : nuevo);
      }
    });
    if (!Object.keys(cambios).length) { cerrar(); return true; }
    // Misma regla que en Nuevo: no se puede dejar a este cliente con la póliza de otro
    if (cambios.poliza !== undefined) {
      const clave = norm(cambios.poliza);
      const otro = todosLosClientes().find(c => String(c.id) !== String(ST.id) && norm(c.poliza) === clave);
      if (otro) {
        mostrarError('Ya existe un cliente con la póliza ' + cambios.poliza + ' (' + (otro.asegurado || 'sin nombre') + '). Una póliza no puede repetirse.', 'poliza');
        return false;
      }
    }
    if (typeof window.actualizarClienteSupabase !== 'function') { mostrarError('No se pudo guardar: falta la conexión con la base de datos.'); return false; }
    const res = await window.actualizarClienteSupabase(ST.id, cambios);
    if (!res || res.success === false) { mostrarError('No se pudo guardar: ' + ((res && res.error) || 'error desconocido')); return false; }
    // Solo se aplica en pantalla si la base de datos lo aceptó
    Object.assign(cliente, cambios);
    try { localStorage.setItem('clientes_data', JSON.stringify(window.datosReales || [])); } catch (e) { /* sin espacio: no importa */ }
    cerrar();
    refrescarPantalla();
    alert('✅ Cliente actualizado correctamente');
    return true;
  }

  async function guardar() {
    if (ST.guardando) return;
    const v = leer();
    const falla = validar(v);
    if (falla) { mostrarError(falla.texto, falla.k); return; }
    mostrarError('');
    ST.guardando = true;
    const b = document.getElementById('fc-guardar');
    if (b) { b.disabled = true; b.style.opacity = '.6'; }
    try {
      if (ST.modo === 'nuevo') await guardarNuevo(v); else await guardarCambios(v);
    } catch (e) {
      console.error('❌ Error guardando cliente:', e);
      mostrarError('No se guardó: ' + (e && e.message ? e.message : e));
    } finally {
      ST.guardando = false;
      const b2 = document.getElementById('fc-guardar');
      if (b2) { b2.disabled = false; b2.style.opacity = '1'; }
    }
  }

  window.abrirFormularioCliente = function () { abrir('nuevo'); };
  window.editarCliente = function (id) { abrir('editar', id); };
  window.cerrarModalEditar = cerrar;
  window.NOA_FORM_CLIENTE = { abrir: abrir, cerrar: cerrar, sumarMeses: sumarMeses, mesesDe: mesesDe, validar: validar, CAMPOS: CAMPOS };
  console.log('✅ noa_cliente_individual.js cargado (formulario único Nuevo y Editar)');
})();
