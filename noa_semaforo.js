// NOA SEMAFORO - Estado de Cobranza del Dashboard
// Usa el ESTADO COMPARTIDO de Cartera (window.NOA_ESTADO): la misma regla de fechas, en hora de Costa Rica,
// y el mismo periodo de gracia (9 dias habiles), para que el Dashboard y Cartera nunca se contradigan.
// Deduccion Mensual queda aparte, igual que en Cartera.
// Colores segun la lista de Emmanuel (a confirmar con ella):
//   Azul = a 1 mes del vencimiento (mas de 20 dias); Verde = 20 dias o menos para vencer;
//   Amarillo = periodo de gracia (ya vencio y aun no se cancela); Rojo = cancelada (termino la gracia).
// Lo que no entra en ninguno (pagada, aun lejos del vencimiento, sin fecha) no se cuenta: no se inventa un color.
// Al tocar una tarjeta o un color, Cartera filtra SIN reemplazar la lista cargada: marca la pestaña que corresponde.
// El detalle de colores (las 4 etiquetas y su leyenda) queda SIEMPRE ABIERTO bajo el titulo "Estado de Cobranza".
// No se borra nada: los numeros y los filtros siguen igual.
(function () {
  'use strict';

  const norm = s => (s == null ? '' : String(s)).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const esDM = r => { const p = norm(r.periodicidad || ''); const m = norm(r.medio_cobro || ''); if (p.includes('deduccion mensual') || p === 'dm') return true; return m.includes('deduccion mensual') || m === 'tarjeta autorizada'; }; /*NOA_DM_MEDIO*/
  const ESTADO = () => window.NOA_ESTADO;

  function colorDe(r, hoyIso) {
    const E = ESTADO();
    if (!E) return null;
    const e = E.estadoDe(r, hoyIso);
    if (e.clave === 'cancelada') return 'rojo';
    if (e.clave !== 'pendiente') return null;
    if (e.dias < 0) return 'amarillo';
    if (e.dias <= 20) return 'verde';
    return 'azul';
  }

  function base() { return window._datosRealesBackup || window.datosReales || []; }

  function contar(hoyIso) {
    const c = { azul: 0, verde: 0, amarillo: 0, rojo: 0 };
    base().forEach(function (r) {
      if (esDM(r)) return;
      const k = colorDe(r, hoyIso);
      if (k) c[k]++;
    });
    return c;
  }

  const TAGS = [
    { k: 'azul', t: 'Azul', id: 'tag-sem-azul', color: '#93c5fd', estilo: 'background:rgba(59,130,246,.2);color:#93c5fd;border:1px solid #3b82f6;', titulo: 'Ver clientes a 1 mes del vencimiento', leyenda: '(1 mes antes del vencimiento - días naturales)' },
    { k: 'verde', t: 'Verde', id: 'tag-sem-verde', color: '#36ffad', estilo: '', titulo: 'Ver clientes a 20 días o menos del vencimiento', leyenda: '(20 días naturales antes del vencimiento)' },
    { k: 'amarillo', t: 'Amarillo', id: 'tag-sem-amarillo', color: '#ffc300', estilo: '', titulo: 'Ver clientes en periodo de gracia', leyenda: '(9 días hábiles - período de gracia)' },
    { k: 'rojo', t: 'Rojo', id: 'tag-sem-rojo', color: '#ff534f', estilo: '', titulo: 'Ver clientes cancelados', leyenda: '(Cancelada: terminó el Período de Gracia)' }
  ];

  // El detalle (etiquetas y leyenda) queda siempre abierto, sin desplegable.
  function plegar(h3, cont, lista) {
    [cont, lista].forEach(function (el) { if (el.style) el.style.display = ''; });
    h3.textContent = String(h3.textContent || '').replace(/^[▸▾] */, '').trim();
    h3.onclick = null;
    if (h3.style) h3.style.cursor = 'default';
    if (h3.removeAttribute) h3.removeAttribute('title');
  }

  // Reemplaza, una sola vez, los 3 colores fijos del Dashboard por los 4 de la lista de Emmanuel
  function prepararSemaforo() {
    const hs = document.querySelectorAll('h3');
    let h3 = null;
    for (let i = 0; i < hs.length; i++) {
      if (String(hs[i].textContent || '').indexOf('Estado de Cobranza') !== -1) { h3 = hs[i]; break; }
    }
    if (!h3) return false;
    const cont = h3.nextElementSibling;
    const lista = cont ? cont.nextElementSibling : null;
    if (!cont || !lista) return false;
    if (!(cont.getAttribute && cont.getAttribute('data-noa-sem') === '1')) {
      cont.innerHTML = TAGS.map(function (t) {
        return '<span id="' + t.id + '" class="tag-semaforo ' + t.k + '" onclick="filtrarCarteraSemaforo(\'' + t.k + '\')" title="' + t.titulo + '" style="cursor:pointer;' + t.estilo + '">' + t.t + ': 0</span>';
      }).join(' ');
      lista.innerHTML = TAGS.map(function (t) {
        return '<li style="margin-bottom:6px;"><span style="color:' + t.color + ';font-weight:700;">' + t.t + '</span> <span style="color:' + t.color + ';">' + t.leyenda + '</span></li>';
      }).join('');
      if (cont.setAttribute) cont.setAttribute('data-noa-sem', '1');
    }
    plegar(h3, cont, lista);
    return true;
  }

  window.actualizarSemaforo = function () {
    prepararSemaforo();
    const c = contar();
    TAGS.forEach(function (t) {
      const el = document.getElementById(t.id);
      if (el) el.textContent = t.t + ': ' + c[t.k];
    });
    console.log('Semaforo actualizado:', c);
    return c;
  };

  document.addEventListener('DOMContentLoaded', function () {
    window.actualizarSemaforo();
  });

  // Abre Cartera y le pide el filtro. Cartera conserva la lista completa y marca la pestaña que corresponde.
  function abrirCartera(tipo, color) {
    if (typeof cambiarTab === 'function') cambiarTab('cartera');
    setTimeout(function () {
      if (typeof window.NOA_CARTERA_FILTRAR === 'function') window.NOA_CARTERA_FILTRAR(tipo, color || null);
      // Otras pantallas pueden leer la lista que se ve ahora
      if (typeof window.NOA_CARTERA_VISIBLE === 'function') {
        window._filtroContextoActivo = 'TODO';
        window._datosContextoActivo = window.NOA_CARTERA_VISIBLE();
      }
      const old = document.getElementById('semaforo-banner');
      if (old && typeof old.remove === 'function') old.remove();
    }, 300);
  }

  // Colores del semaforo: rojo = Canceladas; azul, verde y amarillo = parte de Pendientes
  window.filtrarCarteraSemaforo = function (color) {
    if (color === 'rojo') abrirCartera('CANCELADA');
    else if (color === 'azul' || color === 'verde' || color === 'amarillo') abrirCartera('PENDIENTE', color);
  };

  // Tarjetas del Dashboard: 'hoy' = Canceladas, 'semana' = Vencen el dia actual
  window.filtrarCarteraVencimiento = function (periodo) {
    if (periodo === 'hoy') abrirCartera('CANCELADA');
    else if (periodo === 'semana') abrirCartera('VENCE_HOY');
  };

  window.NOA_SEMAFORO = { colorDe: colorDe, contar: contar, esDM: esDM, prepararSemaforo: prepararSemaforo };
  console.log('noa_semaforo.js cargado');
})();
// FIN_SEMAFORO
