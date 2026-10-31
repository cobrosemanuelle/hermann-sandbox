// NOA · Historial Envíos UX: encabezados de la tabla y filtro activo resaltado
(function () {
  'use strict';
  var COLS = ['Fecha y hora', 'Cliente', 'Canal', 'Destinatario', 'Estado', 'Origen', 'Mensaje (clic para ver completo)'];
  var ORIGEN = { MASIVO: ['📦', 'Envío masivo'], MANUAL: ['👤', 'Envío manual'], AUTOMATICO: ['🤖', 'Envío automático'] };
  function ponerEncabezados() {
    var th = document.querySelector('#historial thead');
    if (th && !th.children.length) {
      th.innerHTML = '<tr>' + COLS.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr>';
    }
  }
  function marcar(f) {
    f = f || 'todos';
    document.querySelectorAll('#historial > div > div:first-child button').forEach(function (b) {
      var m = /filtrarHistorial\('([a-z]+)'\)/.exec(b.getAttribute('onclick') || '');
      if (m) b.classList.toggle('noa-env-activo', m[1] === f);
    });
  }
  // El origen ya venía escrito al inicio del mensaje: se pasa a un iconito y el texto queda limpio
  function limpiarMensajes() {
    var tb = document.getElementById('historial-tbody');
    if (!tb) return;
    tb.querySelectorAll('td[onclick]').forEach(function (td) {
      if (td.dataset.nv) return;
      var m = /verMensajeEnvio\((\d+)\)/.exec(td.getAttribute('onclick') || '');
      var e = m && (window._ENVIOS_TABLA || [])[+m[1]];
      var full = e ? String(e.mensaje || '') : td.textContent;
      var o = /^\[([A-ZÁÉÍÓÚ]+)\]\s*/.exec(full);
      var info = o && ORIGEN[o[1]];
      td.dataset.nv = '1';
      if (!info) return;
      td.textContent = info[0] + ' ' + full.slice(o[0].length);
      td.title = info[1] + ' · clic para ver el mensaje completo';
    });
  }
  try { new MutationObserver(limpiarMensajes).observe(document.documentElement, { childList: true, subtree: true }); } catch (e) { /* sin observador */ }
  // Buscador y fechas: filtran las filas ya cargadas (cliente, fecha, canal, estado, mensaje, rango de fechas)
  function norm(t) { return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  function val(id) { var e = document.getElementById(id); return e ? e.value : ''; }
  // La fecha de la tabla viene como 18/10/2026, 2:02:03 p. m. -> 2026-10-18
  function isoFecha(t) {
    var m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(String(t || ''));
    return m ? m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2) : '';
  }
  function buscar() {
    var inp = document.getElementById('env-buscar'), tb = document.getElementById('historial-tbody');
    var cnt = document.getElementById('env-buscar-n'), cuenta = document.getElementById('env-cuenta');
    if (!inp || !tb) return;
    var q = norm(inp.value).split(/\s+/).filter(Boolean), total = 0, vis = 0;
    var de = val('env-desde'), ha = val('env-hasta');
    if (de && ha && de > ha) { var x = de; de = ha; ha = x; }
    tb.querySelectorAll('tr').forEach(function (tr) {
      if (tr.children.length < 7) return;
      total++;
      var ok = q.every(function (w) { return norm(tr.textContent + ' ' + (tr.children[2] ? tr.children[2].textContent : '')).indexOf(w) !== -1; });
      var d = isoFecha(tr.children[0].textContent);
      if (ok && de && (!d || d < de)) ok = false;
      if (ok && ha && (!d || d > ha)) ok = false;
      tr.style.display = ok ? '' : 'none';
      if (ok) vis++;
    });
    var filtrando = q.length || de || ha;
    if (cnt) cnt.textContent = (filtrando && total && !vis) ? 'SIN RESULTADOS' : '';
    if (cuenta) cuenta.textContent = total ? 'MOSTRANDO ' + vis + ' DE ' + total : '';
  }
  function limpiarFiltros() {
    ['env-buscar', 'env-desde', 'env-hasta'].forEach(function (i) { var e = document.getElementById(i); if (e) e.value = ''; });
    buscar();
  }
  window.noaEnvLimpiar = limpiarFiltros;
  function ponerBuscador() {
    var fila = document.querySelector('#historial > div > div:first-child');
    if (!fila || document.getElementById('env-buscar')) return;
    var wrap = document.createElement('div');
    wrap.className = 'noa-env-buscar';
    wrap.innerHTML = '<input id="env-buscar" type="search" autocomplete="off" placeholder="BUSCAR POR CLIENTE, FECHA O MENSAJE…"><span id="env-buscar-n"></span>';
    var exp = fila.querySelector('button[onclick*="exportarHistorialExcel"]');
    fila.insertBefore(wrap, exp || null);
    document.getElementById('env-buscar').addEventListener('input', buscar);
    // Segunda fila: rango de fechas, limpiar y contador
    var fechas = document.createElement('div');
    fechas.className = 'noa-env-fechas';
    fechas.innerHTML = '<label for="env-desde">ENVÍOS DEL</label><input id="env-desde" type="date">'
      + '<label for="env-hasta">AL</label><input id="env-hasta" type="date">'
      + '<button type="button" onclick="noaEnvLimpiar()">✕ LIMPIAR</button><span id="env-cuenta"></span>';
    fila.parentNode.insertBefore(fechas, fila.nextSibling);
    document.getElementById('env-desde').addEventListener('change', buscar);
    document.getElementById('env-hasta').addEventListener('change', buscar);
    var tb = document.getElementById('historial-tbody');
    if (tb) { try { new MutationObserver(buscar).observe(tb, { childList: true }); } catch (e) { /* sin observador */ } }
    buscar();
  }
  function envolver() {
    ponerEncabezados();
    ponerBuscador();
    if (typeof window.filtrarHistorial !== 'function' || window.filtrarHistorial.__ux) return;
    var orig = window.filtrarHistorial;
    window.filtrarHistorial = function (f) { marcar(f); ponerEncabezados(); return orig.apply(this, arguments); };
    window.filtrarHistorial.__ux = true;
    marcar('todos');
  }
  document.addEventListener('DOMContentLoaded', envolver);
  window.addEventListener('load', envolver);
  setTimeout(envolver, 1500);
  setTimeout(envolver, 4000);
})();
