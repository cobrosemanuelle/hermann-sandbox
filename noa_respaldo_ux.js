// NOA · Respaldo en Configuración: tarjeta con el botón "Respaldar ahora" (baja la cartera completa en Excel).
// La copia automática diaria (6 pm) la hace el servidor; este botón es para bajar una copia propia cuando se quiera.
(function () {
  'use strict';
  var COLS = [['asegurado','Cliente'],['poliza','Póliza'],['aseguradora','Aseguradora'],['tipo_seguro','Línea'],['periodicidad','Forma de pago'],['desde_cobro','Vencimiento'],['prima','Prima'],['moneda','Moneda'],['objeto_asegurado','Objeto Asegurado'],['anio','Año'],['placa','Placa'],['hasta','Próx Pago'],['medio_cobro','Medio de cobro'],['identificacion','Identificación'],['telefono','Tel / WA'],['telefonos_extra','Otros tel.'],['correo','Email'],['correos_extra','Otros correos'],['direccion','Dirección'],['planillas','Planillas'],['desde','Inicio'],['vence_contrato','Vence'],['pagado','Pagado'],['borrado','En papelera']];
  var FECHAS = ['desde_cobro', 'hasta', 'desde', 'vence_contrato'];
  var KEY = 'noa_ultimo_respaldo_excel';

  function ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function ss(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function dos(n) { return (n < 10 ? '0' : '') + n; }

  function celda(k, v, c) {
    if (k === 'pagado' && v === undefined) v = c._pagado;
    if (v === null || v === undefined) return '';
    if (FECHAS.indexOf(k) >= 0) {
      var m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
      return m ? m[3] + '/' + m[2] + '/' + m[1] : String(v);
    }
    if (k === 'prima') { var n = Number(v); return isNaN(n) ? String(v) : n; }
    if (typeof v === 'boolean') return v ? 'Sí' : '';
    return String(v);
  }

  function hoja(filas) {
    var aoa = [COLS.map(function (c) { return c[1]; })];
    filas.forEach(function (r) { aoa.push(COLS.map(function (c) { return celda(c[0], r[c[0]], r); })); });
    var ws = window.XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = COLS.map(function (c) { return { wch: Math.max(12, c[1].length + 4) }; });
    var iPrima = COLS.findIndex(function (c) { return c[0] === 'prima'; });
    for (var i = 1; i < aoa.length; i++) {
      var ref = window.XLSX.utils.encode_cell({ r: i, c: iPrima });
      if (ws[ref] && ws[ref].t === 'n') ws[ref].z = '#,##0.00';
    }
    return ws;
  }

  function estado(txt, malo) {
    var e = document.getElementById('nr-estado');
    if (!e) return;
    e.textContent = txt;
    e.className = 'nr-estado' + (malo ? ' nr-malo' : '');
  }

  async function respaldarAhora() {
    var btn = document.getElementById('nr-btn');
    if (btn) { btn.disabled = true; }
    try {
      if (!window.XLSX) throw new Error('No se cargó la librería de Excel. Recargue la página.');
      if (typeof window.cargarClientesSupabase !== 'function') throw new Error('El sistema aún no terminó de cargar.');
      estado('Preparando el respaldo...');
      var a = await window.cargarClientesSupabase();
      if (!a || !a.success) throw new Error('No se pudo leer la cartera' + (a && a.error ? ': ' + a.error : ''));
      var b = typeof window.cargarClientesBorrados === 'function' ? await window.cargarClientesBorrados() : { success: true, clientes: [] };
      if (!b || !b.success) throw new Error('No se pudo leer la papelera' + (b && b.error ? ': ' + b.error : ''));
      var wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, hoja(a.clientes), 'Cartera');
      if (b.clientes.length) window.XLSX.utils.book_append_sheet(wb, hoja(b.clientes.map(function (c) { var x = Object.assign({}, c); x.borrado = true; return x; })), 'Papelera');
      var d = new Date();
      var f = d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' + dos(d.getDate());
      window.XLSX.writeFile(wb, 'Respaldo_Cartera_' + f + '.xlsx');
      var cuando = dos(d.getDate()) + '/' + dos(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + dos(d.getHours()) + ':' + dos(d.getMinutes());
      ss(KEY, cuando + '|' + a.clientes.length + '|' + b.clientes.length);
      estado('Listo: se bajó el Excel con ' + a.clientes.length + ' clientes' + (b.clientes.length ? ' y ' + b.clientes.length + ' en la papelera' : '') + '.');
      pintarUltimo();
    } catch (e) {
      estado('No se pudo respaldar. ' + (e && e.message ? e.message : ''), true);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function pintarUltimo() {
    var e = document.getElementById('nr-ultimo');
    if (!e) return;
    var v = ls(KEY);
    if (!v) { e.textContent = 'Todavía no ha bajado ningún respaldo desde este navegador.'; return; }
    var p = v.split('|');
    e.textContent = 'Último respaldo bajado desde este navegador: ' + p[0] + ' (' + p[1] + ' clientes).';
  }

  function armar() {
    var cfg = document.getElementById('configuracion');
    if (!cfg || document.getElementById('nr-card')) return;
    var h2 = cfg.querySelector('h2');
    var card = document.createElement('div');
    card.id = 'nr-card';
    card.className = 'nr-card';
    card.innerHTML =
      '<div class="nr-fila"><div><div class="nr-t">Respaldo de la cartera</div>' +
      '<div class="nr-s">El sistema guarda una copia de todo automáticamente cada día a las 6 pm. Aquí puede bajar una copia en Excel cuando quiera.</div></div>' +
      '<button type="button" id="nr-btn" class="nr-btn">Respaldar ahora (Excel)</button></div>' +
      '<div id="nr-estado" class="nr-estado" role="status"></div>' +
      '<div id="nr-ultimo" class="nr-ultimo"></div>';
    if (h2 && h2.nextSibling) cfg.insertBefore(card, h2.nextSibling); else cfg.insertBefore(card, cfg.firstChild);
    document.getElementById('nr-btn').addEventListener('click', respaldarAhora);
    pintarUltimo();
  }

  window.noaRespaldarAhora = respaldarAhora;
  document.addEventListener('DOMContentLoaded', armar);
  window.addEventListener('load', armar);
  setTimeout(armar, 1500);
})();
