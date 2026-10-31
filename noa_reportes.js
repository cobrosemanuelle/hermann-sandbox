// ============================================
// NOA REPORTES - Métricas y Exportación
// Datos de la base (Neon): los pagos vienen de /api/pagos y los clientes son la lista que ya esta cargada en pantalla
// (la misma de Cartera). Fechas planas y en hora de Costa Rica, con el ESTADO COMPARTIDO (window.NOA_ESTADO).
// Moneda separada: nunca se suman colones con dolares. No se inventa nada: sin pagos todo queda en cero y se avisa.
// ============================================
(function () {
  'use strict';
  console.log('📊 NOA Reportes cargando...');

  const NOMBRES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const pad2 = n => String(n).padStart(2, '0');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
  const ESTADO = () => window.NOA_ESTADO;
  const clientes = () => window._datosRealesBackup || window.datosReales || [];

  function formatNumber(num) { return new Intl.NumberFormat('es-CR').format(Math.round(Number(num) || 0)); }
  function esUSD(m) { const s = String(m || 'CRC').toUpperCase(); return s === 'USD' || s.indexOf('DOLAR') !== -1; }
  function mesDe(fecha) {
    const E = ESTADO();
    const f = E ? E.parseFecha(fecha) : null;
    return f ? f.y + '-' + pad2(f.m) : null;
  }

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

  // ===== Selector de mes: por defecto el mes actual (si tiene pagos); "Todos los meses" se puede dejar elegido =====
  function prepararSelector(pagosRaw) {
    const sel = document.getElementById('reporte-mes-selector');
    if (!sel) return 'todos';
    const meses = [...new Set(pagosRaw.map(p => mesDe(p.fecha_pago)).filter(Boolean))].sort().reverse();
    let elegido;
    if (!sel.__noaListo) {
      const h = ESTADO().hoyCR();
      const mesHoy = h.y + '-' + pad2(h.m);
      elegido = meses.indexOf(mesHoy) !== -1 ? mesHoy : 'todos';
    } else {
      elegido = sel.value || 'todos';
    }
    if (elegido !== 'todos' && meses.indexOf(elegido) === -1) elegido = 'todos';
    sel.innerHTML = '<option value="todos">Todos los meses</option>' + meses.map(m => {
      const p = m.split('-');
      return '<option value="' + m + '">' + NOMBRES[parseInt(p[1], 10) - 1] + ' ' + p[0] + '</option>';
    }).join('');
    sel.value = elegido;
    sel.__noaListo = true;
    return elegido;
  }

  // ===== Metricas principales =====
  window.calcularMetricasReportes = async function () {
    const kpis = document.getElementById('reportes-kpis');
    const graf = document.getElementById('reportes-grafico');
    try {
      const pagosRaw = await leerPagos();
      const mesFiltro = prepararSelector(pagosRaw);
      const pagos = mesFiltro === 'todos' ? pagosRaw : pagosRaw.filter(p => mesDe(p.fecha_pago) === mesFiltro);
      const label = document.getElementById('reporte-mes-label');
      if (label) label.textContent = mesFiltro === 'todos' ? '' : pagos.length + (pagos.length === 1 ? ' pago' : ' pagos') + ' en este mes';

      const lista = clientes();
      let cobradoUSD = 0, cobradoCRC = 0, primaUSD = 0, primaCRC = 0;
      pagos.forEach(p => {
        const v = Number(p.monto_pagado) || 0;
        if (esUSD(p.moneda)) cobradoUSD += v; else cobradoCRC += v;
      });
      lista.forEach(c => {
        const v = Number(c.prima) || 0;
        if (esUSD(c.moneda)) primaUSD += v; else primaCRC += v;
      });
      const moraPromedio = pagos.length > 0
        ? Math.round(pagos.reduce((s, p) => s + (Number(p.dias_mora) || 0), 0) / pagos.length)
        : 0;

      renderizarKPIs({
        cobradoUSD: cobradoUSD, cobradoCRC: cobradoCRC,
        pendienteUSD: Math.max(0, primaUSD - cobradoUSD), pendienteCRC: Math.max(0, primaCRC - cobradoCRC),
        moraPromedio: moraPromedio, totalClientes: lista.length, sinPagos: pagosRaw.length === 0
      });
      renderizarGrafico(pagosRaw);
    } catch (error) {
      console.error('Error calculando métricas:', error);
      if (kpis) kpis.innerHTML = '<div style="background:#7f1d1d;color:#fff;border-radius:12px;padding:16px;">⚠️ No se pudieron cargar las métricas: ' + esc(error && error.message ? error.message : error) + '</div>';
      if (graf) graf.innerHTML = '';
    }
  };

  function renderizarKPIs(d) {
    const container = document.getElementById('reportes-kpis');
    if (!container) return;
    const base = 'background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px 24px;';
    const tarjeta = (acento, titulo, linea1, linea2) =>
      '<div style="' + base + 'border-left:4px solid ' + acento + ';">' +
      '<div style="color:#6b7280;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-bottom:10px;">' + titulo + '</div>' +
      '<div style="font-size:1.6em;font-weight:800;color:#12263f;line-height:1.2;">' + linea1 + '</div>' +
      '<div style="font-size:1.3em;font-weight:700;color:#475569;margin-top:4px;">' + linea2 + '</div></div>';
    const chica = (acento, titulo, valor) =>
      '<div style="' + base + 'border-left:4px solid ' + acento + ';">' +
      '<div style="color:#6b7280;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-bottom:10px;">' + titulo + '</div>' +
      '<div style="font-size:1.6em;font-weight:800;color:#12263f;line-height:1.2;">' + valor + '</div></div>';
    container.innerHTML =
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:20px;">' +
      tarjeta('#0d9488', '💰 Total cobrado', 'US$ ' + window.noaPrimaTxt(d.cobradoUSD), '₡ ' + window.noaPrimaTxt(d.cobradoCRC)) +
      tarjeta('#d97706', '⏳ Pendiente', 'US$ ' + window.noaPrimaTxt(d.pendienteUSD), '₡ ' + window.noaPrimaTxt(d.pendienteCRC)) +
      chica('#12263f', '👥 Total clientes', formatNumber(d.totalClientes)) +
      '</div>' +
      (d.sinPagos ? '<p style="color:#64748b;text-align:center;margin:0 0 20px 0;">Todavía no hay pagos registrados: los montos se llenan cuando se usa el botón 💰 Pagar en Cartera.</p>' : '');
  }

  // ===== Grafico: ultimos 6 meses con pagos (sin importar el mes elegido), dolares y colones por separado =====
  function renderizarGrafico(pagosRaw) {
    const cont = document.getElementById('reportes-grafico');
    if (!cont) return;
    const porMes = {};
    pagosRaw.forEach(p => {
      const m = mesDe(p.fecha_pago);
      if (!m) return;
      if (!porMes[m]) porMes[m] = { usd: 0, crc: 0 };
      const v = Number(p.monto_pagado) || 0;
      if (esUSD(p.moneda)) porMes[m].usd += v; else porMes[m].crc += v;
    });
    const meses = Object.keys(porMes).sort().slice(-6);
    const caja = 'background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px 24px;';
    const titulo = '<h4 style="color:#12263f;margin:0 0 16px 0;font-size:15px;">📈 Cobrado - Últimos 6 meses</h4>';
    if (meses.length === 0) {
      cont.innerHTML = '<div style="' + caja + '">' + titulo + '<p style="color:#6b7280;margin:0;">Aún no hay pagos registrados.</p></div>';
      return;
    }
    cont.innerHTML = '<div style="' + caja + '">' + titulo + '<canvas id="chart-reportes" style="max-height:300px;"></canvas></div>';
    const canvas = document.getElementById('chart-reportes');
    if (!canvas || !window.Chart || typeof canvas.getContext !== 'function') return;
    if (window.reportesChart && typeof window.reportesChart.destroy === 'function') window.reportesChart.destroy();
    const labels = meses.map(m => { const p = m.split('-'); return NOMBRES[parseInt(p[1], 10) - 1] + ' ' + p[0].slice(2); });
    window.reportesChart = new window.Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: 'Cobrado USD ($)', backgroundColor: '#0d9488', borderColor: '#0d9488', borderWidth: 0, borderRadius: 4, data: meses.map(m => Math.round(porMes[m].usd)) },
          { label: 'Cobrado CRC (miles ₡)', backgroundColor: '#f59e0b', borderColor: '#f59e0b', borderWidth: 0, borderRadius: 4, data: meses.map(m => Math.round(porMes[m].crc / 1000)) }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom', labels: { color: '#374151' } } },
        scales: {
          y: { beginAtZero: true, ticks: { color: '#6b7280' }, grid: { color: '#e5e7eb' } },
          x: { ticks: { color: '#374151' }, grid: { display: false } }
        }
      }
    });
  }

  // ===== Exportar reporte completo a Excel =====
  window.exportarReporteCompleto = async function () {
    if (typeof XLSX === 'undefined') { alert('No se pudo cargar el generador de Excel. Recargue la página e intente de nuevo.'); return; }
    try {
      const E = ESTADO();
      const pagos = await leerPagos();
      const lista = clientes();
      let envios = [], avisoEnvios = '';
      try { envios = await leerEnvios(); } catch (e) { envios = null; avisoEnvios = 'No se pudieron leer los envíos: ' + (e && e.message ? e.message : e); }
      const fecha = (v) => (E.aDDMM(v) || (v == null ? '' : String(v)));

      const wb = XLSX.utils.book_new();
      const resumen = [
        ['REPORTE COMPLETO NOA COBROS'],
        ['Fecha de generación:', new Date().toLocaleString('es-CR')],
        [''],
        ['MÉTRICAS PRINCIPALES'],
        ['Total Clientes:', lista.length],
        ['Total Pagos Registrados:', pagos.length],
        ['Total Envíos:', envios === null ? avisoEnvios : envios.length]
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), 'Resumen');

      if (lista.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lista.map(c => ({
          'Asegurado': c.asegurado || '',
          'Identificación': c.identificacion || '',
          'Póliza': c.poliza || '',
          'Aseguradora': c.aseguradora || '',
          'Línea': c.tipo_seguro || '',
          'Forma de pago': c.periodicidad || '',
          'Vence (cobro)': fecha(c.desde_cobro),
          'Prima': Number(c.prima) || 0,
          'Moneda': esUSD(c.moneda) ? 'USD' : 'CRC',
          'Teléfono': c.telefono || '',
          'Correo': c.correo || ''
        }))), 'Clientes');
      }
      if (pagos.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pagos.map(p => ({
          'Cliente': p.cliente_nombre || '',
          'Póliza': p.poliza || '',
          'Monto': Number(p.monto_pagado) || 0,
          'Moneda': esUSD(p.moneda) ? 'USD' : 'CRC',
          'Fecha pago': fecha(p.fecha_pago),
        }))), 'Pagos');
      }
      if (envios && envios.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(envios.map(e => ({
          'Cliente': e.cliente_nombre || e.asegurado || '',
          'Canal': e.canal || e.tipo || '',
          'Estado': e.estado || '',
          'Mensaje': e.mensaje || '',
          'Fecha': fecha(e.fecha_envio || e.created_at || e.fecha)
        }))), 'Envíos');
      }
      XLSX.writeFile(wb, 'reporte_completo_' + E.hoyCR().iso + '.xlsx');
      alert('✅ Reporte exportado exitosamente' + (envios === null ? '\n\n⚠️ ' + avisoEnvios : ''));
    } catch (error) {
      console.error('Error exportando reporte:', error);
      alert('❌ Error al exportar: ' + (error && error.message ? error.message : error));
    }
  };

  // ===== Inicializar =====
  window.inicializarReportes = async function () {
    console.log('📊 Inicializando Reportes...');
    await window.calcularMetricasReportes();
    console.log('📊 Reportes inicializado ✅');
  };

  // Al abrir la pestaña Reportes se cargan las metricas (por si la pagina no lo hace sola)
  try {
    document.querySelectorAll('.nav-tab[onclick*="reportes"]').forEach(function (b) {
      b.addEventListener('click', function () { setTimeout(function () { window.calcularMetricasReportes(); }, 300); });
    });
  } catch (e) { /* sin pestaña: no pasa nada */ }

  console.log('📊 NOA Reportes cargado ✅');
})();
// FIN_REPORTES
