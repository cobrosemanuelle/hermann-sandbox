// ============================================
// NOA ML - Comportamiento de pago y efectividad de cobranza (datos reales de Neon)
// Pagos: /api/pagos. Envios: /api/envios. Clientes: la lista que ya esta cargada en pantalla (la misma de Cartera).
// Cada cliente se identifica por su id (no por su nombre): dos clientes con el mismo nombre no se mezclan.
// No se inventa nada: sin pagos o sin envios se dice claro, y si la base falla se muestra el error en vez de dejar "Cargando...".
// ============================================
(function () {
  'use strict';
  console.log('🤖 NOA ML cargando...');

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
  const nf = n => new Intl.NumberFormat('es-CR').format(Math.round(Number(n) || 0));
  const norm = s => (s == null ? '' : String(s)).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const esDM = r => { const p = norm(r && r.periodicidad); const m = norm(r && r.medio_cobro); return p.indexOf('deduccion mensual') !== -1 || p === 'dm' || m.indexOf('deduccion mensual') !== -1 || m === 'tarjeta autorizada'; }; /*NOA_DM_MEDIO*/
  const clientes = () => window._datosRealesBackup || window.datosReales || [];
  const claveDe = (id, nombre) => (id !== null && id !== undefined && id !== '') ? 'id:' + id : (nombre ? 'n:' + nombre : '');

  // ===== Lectura de datos =====
  async function usuario() {
    const u = (typeof getUserNOA === 'function') ? await getUserNOA() : null;
    if (!u) throw new Error('No se pudo identificar al usuario');
    return u;
  }
  async function pedir(url) {
    const r = await fetch(url);
    let d = null;
    try { d = await r.json(); } catch (e) { d = null; }
    if (!r.ok || !d || d.success === false) throw new Error((d && d.error) || ('Error ' + r.status));
    return d;
  }
  async function leerPagos() {
    const u = await usuario();
    const d = await pedir('/api/pagos?user_id=' + encodeURIComponent(u.id));
    return d.pagos || [];
  }
  async function leerEnvios() {
    const u = await usuario();
    const d = await pedir('/api/envios?user_id=' + encodeURIComponent(u.id));
    const lista = Object.keys(d).map(k => d[k]).find(Array.isArray);
    if (!lista) throw new Error('la respuesta no trae la lista de envíos');
    return lista;
  }

  const CAJA = 'background:linear-gradient(135deg,#1e293b,#334155);border-radius:12px;padding:20px;';
  const html_error = (titulo, error) => '<div style="background:#7f1d1d;color:#fff;border-radius:12px;padding:16px;">⚠️ ' + esc(titulo) + ': ' + esc(error && error.message ? error.message : error) + '</div>';
  const html_aviso = txt => '<div style="' + CAJA + 'color:#94A3B8;text-align:center;">' + txt + '</div>';

  // ============================================
  // COMPORTAMIENTO DE PAGO
  // ============================================
  window.calcularComportamientoPago = async function () {
    const cont = document.getElementById('ml-comportamiento');
    try {
      const pagos = await leerPagos();
      if (pagos.length === 0) {
        window._mlMejores = []; window._mlPeores = [];
        if (cont) cont.innerHTML = html_aviso('Todavía no hay pagos registrados: el análisis aparece cuando se usa el botón 💰 Pagar en Cartera.');
        return;
      }
      const porCliente = {};
      let totalMora = 0;
      pagos.forEach(p => {
        const mora = Number(p.dias_mora) || 0;
        totalMora += mora;
        const clave = claveDe(p.cliente_id, p.cliente_nombre) || 'n:Sin nombre';
        if (!porCliente[clave]) porCliente[clave] = { id: (p.cliente_id === undefined ? null : p.cliente_id), nombre: p.cliente_nombre || 'Sin nombre', totalMora: 0, pagos: 0 };
        porCliente[clave].totalMora += mora;
        porCliente[clave].pagos++;
      });
      const ranking = Object.keys(porCliente).map(k => {
        const c = porCliente[k];
        return { id: c.id, nombre: c.nombre, moraPromedio: Math.round(c.totalMora / c.pagos), pagos: c.pagos };
      }).sort((a, b) => (a.moraPromedio - b.moraPromedio) || (b.pagos - a.pagos) || a.nombre.localeCompare(b.nombre));
      const moraGeneral = Math.round(totalMora / pagos.length);
      const mejores = ranking.slice(0, 5);
      const peores = ranking.filter(c => c.moraPromedio > 0).sort((a, b) => (b.moraPromedio - a.moraPromedio) || (b.pagos - a.pagos) || a.nombre.localeCompare(b.nombre)).slice(0, 5);
      renderizarComportamiento(moraGeneral, mejores, peores);
    } catch (error) {
      console.error('Error calculando comportamiento:', error);
      if (cont) cont.innerHTML = html_error('No se pudo cargar el comportamiento de pago', error);
    }
  };

  function renderizarComportamiento(moraGeneral, mejores, peores) {
    const container = document.getElementById('ml-comportamiento');
    if (!container) return;
    window._mlMejores = mejores;
    window._mlPeores = peores;
    const peor = peores[0];
    const mejor = mejores[0];
    const tarjetaPeor = peor
      ? `<div style="background:linear-gradient(135deg,#7f1d1d,#991b1b);border-radius:12px;padding:20px;text-align:center;cursor:pointer;" onclick="irClienteML(0,'peor')" title="Ver peor pagador">
           <div style="font-size:2.5em;font-weight:800;color:#ef4444;">${peor.moraPromedio}</div>
           <div style="color:#94A3B8;font-size:14px;">Peor pagador →</div>
         </div>`
      : `<div style="background:linear-gradient(135deg,#1e293b,#334155);border-radius:12px;padding:20px;text-align:center;">
           <div style="font-size:2.5em;font-weight:800;color:#94A3B8;">—</div>
           <div style="color:#94A3B8;font-size:14px;">Ningún cliente con mora</div>
         </div>`;
    const fila = (c, i) => {
      const nombre = c.nombre.length > 25 ? c.nombre.substring(0, 25) + '...' : c.nombre;
      return `<div onclick="irClienteML(${i},'mejor')" style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.1);cursor:pointer;" title="Ver en Cartera">
                <span style="color:#fff;">${i + 1}. ${esc(nombre)} <span style="color:#94A3B8;font-size:12px;margin-left:6px;">${c.pagos} ${c.pagos === 1 ? 'pago' : 'pagos'}</span></span>
                <span style="color:#10b981;font-weight:600;">${c.moraPromedio} días →</span>
              </div>`;
    };
    container.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:25px;">
        <div style="background:linear-gradient(135deg,#1e293b,#334155);border-radius:12px;padding:20px;text-align:center;">
          <div style="font-size:2.5em;font-weight:800;color:#f59e0b;">${moraGeneral}</div>
          <div style="color:#94A3B8;font-size:14px;">Días mora promedio</div>
        </div>
        <div style="background:linear-gradient(135deg,#064e3b,#065f46);border-radius:12px;padding:20px;text-align:center;cursor:pointer;" onclick="irClienteML(0,'mejor')" title="Ver mejor pagador">
          <div style="font-size:2.5em;font-weight:800;color:#10b981;">${mejor ? mejor.moraPromedio : 0}</div>
          <div style="color:#94A3B8;font-size:14px;">Mejor pagador →</div>
        </div>
        ${tarjetaPeor}
      </div>
      <div style="display:grid;grid-template-columns:1fr;gap:20px;">
        <div style="background:linear-gradient(135deg,#064e3b,#065f46);border-radius:12px;padding:20px;">
          <h4 style="color:#10b981;margin:0 0 15px 0;">🏆 Top 5 Mejores Pagadores</h4>
          ${mejores.map(fila).join('')}
        </div>
      </div>`;
  }

  // Al tocar un cliente del ranking: Cartera se abre buscandolo. La lista cargada no se reemplaza.
  window.irClienteML = function (indice, tipo) {
    const lista = tipo === 'mejor' ? window._mlMejores : window._mlPeores;
    if (!lista || !lista[indice]) return;
    const c = lista[indice];
    const cli = (c.id !== null && c.id !== undefined) ? clientes().find(x => String(x.id) === String(c.id)) : null;
    const nombre = (cli && cli.asegurado) || c.nombre;
    if (typeof cambiarTab === 'function') cambiarTab('cartera');
    setTimeout(function () {
      if (typeof window.NOA_CARTERA_FILTRAR === 'function') window.NOA_CARTERA_FILTRAR(cli && esDM(cli) ? 'DM' : 'TODO');
      setTimeout(function () {
        const inp = document.getElementById('noa-search');
        if (inp) {
          inp.value = nombre;
          if (typeof inp.oninput === 'function') inp.oninput({ target: inp });
        }
        const old = document.getElementById('semaforo-banner');
        if (old && typeof old.remove === 'function') old.remove();
      }, 400);
    }, 300);
  };

  // ============================================
  // EFECTIVIDAD DE COBRANZA
  // ============================================
  window.calcularEfectividadCobranza = async function () {
    const cont = document.getElementById('ml-efectividad');
    try {
      const envios = await leerEnvios();
      if (envios.length === 0) {
        if (cont) cont.innerHTML = html_aviso('Todavía no hay envíos registrados.');
        return;
      }
      const canal = e => String(e.canal || e.tipo || '').toLowerCase();
      const enviado = e => String(e.estado || '').toLowerCase() === 'enviado';
      const wa = envios.filter(e => canal(e) === 'whatsapp');
      const em = envios.filter(e => canal(e) === 'email');
      const unicos = new Set(envios.map(e => claveDe(e.cliente_id, e.cliente_nombre)).filter(Boolean)).size;
      renderizarEfectividad({
        waTotal: wa.length, waOk: wa.filter(enviado).length,
        emTotal: em.length, emOk: em.filter(enviado).length,
        unicos: unicos, intentos: unicos > 0 ? Math.round(envios.length / unicos * 10) / 10 : 0
      });
    } catch (error) {
      console.error('Error calculando efectividad:', error);
      if (cont) cont.innerHTML = html_error('No se pudo cargar la efectividad de cobranza', error);
    }
  };

  function renderizarEfectividad(d) {
    const container = document.getElementById('ml-efectividad');
    if (!container) return;
    const pct = (ok, total) => total > 0 ? Math.round(ok / total * 100) : 0;
    const tarjeta = function (color, valor, etiqueta) {
      return '<div style="background:linear-gradient(135deg,#1e293b,#334155);border-radius:12px;padding:20px;text-align:center;">' +
        '<div style="font-size:2em;font-weight:800;color:' + color + ';">' + valor + '</div>' +
        '<div style="color:#94A3B8;font-size:13px;">' + etiqueta + '</div></div>';
    };
    const barra = function (titulo, colorTitulo, degradado, ok, total) {
      const p = pct(ok, total);
      return '<div style="background:linear-gradient(135deg,#1e293b,#334155);border-radius:12px;padding:20px;">' +
        '<h4 style="color:' + colorTitulo + ';margin:0 0 15px 0;">' + titulo + '</h4>' +
        '<div style="background:#0f172a;border-radius:10px;height:30px;overflow:hidden;">' +
        '<div style="background:' + degradado + ';height:100%;width:' + p + '%;display:flex;align-items:center;justify-content:center;min-width:40px;">' +
        '<span style="color:#fff;font-weight:700;font-size:14px;">' + p + '%</span></div></div>' +
        '<div style="color:#94A3B8;font-size:12px;margin-top:8px;">' + (total > 0 ? ok + ' de ' + total + ' con estado «enviado»' : 'Sin registros') + '</div></div>';
    };
    container.innerHTML =
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin-bottom:25px;">' +
      tarjeta('#22c55e', nf(d.waTotal), '📱 WhatsApp registrados') +
      tarjeta('#3b82f6', nf(d.emTotal), '📧 Emails registrados') +
      tarjeta('#f59e0b', nf(d.unicos), '👥 Clientes contactados') +
      tarjeta('#a855f7', d.intentos, '🔄 Intentos/cliente') +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">' +
      barra('📱 Efectividad WhatsApp', '#22c55e', 'linear-gradient(90deg,#22c55e,#16a34a)', d.waOk, d.waTotal) +
      barra('📧 Efectividad Email', '#3b82f6', 'linear-gradient(90deg,#3b82f6,#1d4ed8)', d.emOk, d.emTotal) +
      '</div>' +
      '<div style="margin-top:20px;background:linear-gradient(135deg,#1e293b,#334155);border-radius:12px;padding:20px;">' +
      '<h4 style="color:#fff;margin:0 0 15px 0;">📊 Comparativa de Canales</h4>' +
      '<canvas id="chart-canales" style="max-height:250px;"></canvas></div>';
    const canvas = document.getElementById('chart-canales');
    if (!canvas || !window.Chart || typeof canvas.getContext !== 'function') return;
    if (window.mlChart && typeof window.mlChart.destroy === 'function') window.mlChart.destroy();
    window.mlChart = new window.Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: { labels: ['WhatsApp', 'Email'], datasets: [{ label: 'Registrados', data: [d.waTotal, d.emTotal], backgroundColor: ['#0d9488', '#12263f'], borderRadius: 4 }] },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { color: '#6b7280' }, grid: { color: '#e5e7eb' } },
          x: { ticks: { color: '#374151' }, grid: { display: false } }
        }
      }
    });
  }

  // ============================================
  // INICIALIZAR ML
  // ============================================
  let CARGANDO = false;
  window.inicializarML = async function () {
    if (CARGANDO) return;
    CARGANDO = true;
    try {
      console.log('🤖 Inicializando ML...');
      await window.calcularComportamientoPago();
      await window.calcularEfectividadCobranza();
      console.log('🤖 ML inicializado ✅');
    } finally {
      CARGANDO = false;
    }
  };

  // Al entrar a la pestaña de ML, si todavia dice "Cargando...", se carga sola
  try {
    document.querySelectorAll('.nav-tab').forEach(function (b) {
      b.addEventListener('click', function () {
        setTimeout(function () {
          const c = document.getElementById('ml-comportamiento');
          if (c && c.offsetParent !== null && String(c.innerHTML).indexOf('⏳') !== -1) window.inicializarML();
        }, 400);
      });
    });
  } catch (e) { /* sin pestañas: no pasa nada */ }

  console.log('🤖 NOA ML cargado ✅');
})();
// FIN_ML
