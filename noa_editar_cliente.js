// NOA EDITAR CLIENTE + TARJETA "PÓLIZAS REPETIDAS" DEL DASHBOARD
// 1) Editar ya no tiene su propio formulario: Nuevo y Editar usan el mismo, que vive en noa_cliente_individual.js
//    (window.editarCliente y window.cerrarModalEditar los define ese archivo). Este archivo se deja para no tocar index.html.
// 2) Tarjeta del Dashboard que lista las pólizas que están en más de un cliente, con botón para corregirlas.
(function () {
  'use strict';
  const ID = 'noa-polizas-repetidas';

  function norm(s) { return String(s == null ? '' : s).trim().toUpperCase(); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }
  // Una póliza "real" trae al menos un número. Textos como "Autos" son marcadores de póliza que falta, no pólizas repetidas.
  function esReal(k) { return /\d/.test(String(k || '')); }
  function clientes() { return window._datosRealesBackup || window.datosReales || []; }

  // Devuelve [{poliza, lista:[cliente,...]}] solo de las pólizas que aparecen 2 o más veces
  function repetidas() {
    const g = {};
    clientes().forEach(function (c) {
      const k = norm(c.poliza);
      if (!k || !esReal(k)) return;
      (g[k] = g[k] || []).push(c);
    });
    return Object.keys(g).filter(function (k) { return g[k].length > 1; }).sort().map(function (k) { return { poliza: k, lista: g[k] }; });
  }

  function irACartera() {
    // Mejor esfuerzo: abre la pestaña Cartera y aplica el filtro de duplicados que ya existe allí
    const nav = Array.from(document.querySelectorAll('button, a, li, div')).find(function (e) {
      return e.children.length <= 2 && /^\W*cartera\W*$/i.test((e.textContent || '').replace(/[^\wÁÉÍÓÚáéíóúñÑ ]/g, '').trim()) && e.offsetParent !== null;
    });
    if (nav) nav.click();
    setTimeout(function () {
      const b = document.getElementById('btn-duplicados');
      if (b) b.click();
    }, 300);
  }

  let ultimaFirma = null;
  function cerrarModalRep() { const m = document.getElementById(ID + '-modal'); if (m) m.remove(); }
  function listaHTML(grupos) {
    return grupos.map(function (g) {
      return '<div style="background:#fff;padding:12px 16px;border-radius:8px;border-left:4px solid #0d9488;margin-bottom:10px"><div style="font-weight:700;margin-bottom:4px;color:#111827">' + esc(g.poliza) + ' · ' + g.lista.length + ' CLIENTES</div>' +
        g.lista.map(function (c) {
          return '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 0;font-size:13px;color:#374151"><span>' +
            esc((c.asegurado || 'SIN NOMBRE').toUpperCase()) + (c.aseguradora ? ' · ' + esc(String(c.aseguradora).toUpperCase()) : '') +
            '</span><button type="button" data-edit="' + esc(c.id) + '" style="padding:4px 10px">✏️ EDITAR</button></div>';
        }).join('') + '</div>';
    }).join('');
  }
  function abrirModalRepetidas() {
    cerrarModalRep();
    const grupos = repetidas();
    const m = document.createElement('div');
    m.id = ID + '-modal';
    m.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.55);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px';
    m.innerHTML = '<div style="background:#f1f5f9;border-radius:14px;max-width:680px;width:100%;max-height:85vh;display:flex;flex-direction:column">' +
      '<div style="padding:18px 22px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:flex-start;gap:12px"><div><div style="font-size:17px;font-weight:700;color:#111827">PÓLIZAS REPETIDAS (' + grupos.length + ')</div>' +
      '<div style="font-size:12px;color:#6b7280;margin-top:2px">UNA PÓLIZA NO DEBE ESTAR EN MÁS DE UN CLIENTE. CORRIJA LA PÓLIZA DE LOS QUE ESTÉN MAL.</div></div>' +
      '<button type="button" data-cerrar style="padding:6px 14px">CERRAR</button></div>' +
      '<div style="padding:6px 22px 18px;overflow:auto">' + (grupos.length ? listaHTML(grupos) : '<p style="padding:14px 0;color:#065f46">✅ NO HAY PÓLIZAS REPETIDAS</p>') + '</div></div>';
    document.body.appendChild(m);
    m.addEventListener('click', function (e) { if (e.target === m) cerrarModalRep(); });
    m.querySelector('[data-cerrar]').onclick = cerrarModalRep;
    m.querySelectorAll('[data-edit]').forEach(function (b) {
      b.onclick = function () { if (typeof window.editarCliente === 'function') window.editarCliente(b.getAttribute('data-edit')); };
    });
  }
  function pintar() {
    const grupos = repetidas();
    const total = grupos.reduce(function (n, g) { return n + g.lista.length; }, 0);
    const el = document.getElementById('count-polizas-repetidas');
    if (el) el.textContent = '(' + grupos.length + ')';
    const sub = document.querySelector('#noa-calidad [data-k="polizas-repetidas"] small');
    if (sub) sub.textContent = 'Un mismo número de póliza en más de un cliente · ' + total + ' clientes';
    const vieja = document.getElementById(ID);
    if (vieja) vieja.remove();
    const firma = JSON.stringify(grupos.map(function (g) { return [g.poliza, g.lista.map(function (c) { return c.id + '|' + c.asegurado; })]; }));
    if (firma !== ultimaFirma) { ultimaFirma = firma; if (document.getElementById(ID + '-modal')) abrirModalRepetidas(); }
  }
  window.abrirModalRepetidas = abrirModalRepetidas;
  setInterval(function () { try { pintar(); } catch (e) { console.error('Pólizas repetidas:', e); } }, 3000);

  // Cartera marca con ⚠️ DUPLICADO las pólizas que están en su lista window._POLIZAS_DUPLICADAS: se le quitan los marcadores sin número
  let _dups = window._POLIZAS_DUPLICADAS;
  try {
    Object.defineProperty(window, '_POLIZAS_DUPLICADAS', {
      configurable: true,
      get: function () { return _dups; },
      set: function (v) { _dups = (v && typeof v.forEach === 'function') ? new Set(Array.from(v).filter(esReal)) : v; }
    });
    if (_dups) window._POLIZAS_DUPLICADAS = _dups;
  } catch (e) { console.error('No se pudo filtrar marcadores de póliza:', e); }

  // ---- TODO EL SISTEMA EN MAYÚSCULAS (solo en pantalla; los datos guardados no se tocan) ----
  (function () {
    const st = document.createElement('style');
    st.id = 'noa-mayusculas';
    st.textContent = 'html, body, body *, input, textarea, select, option, button, ::placeholder { text-transform: uppercase !important; }';
    (document.head || document.documentElement).appendChild(st);
    // Los mensajes emergentes del navegador no se pueden estilizar con CSS: se pasan a mayúsculas al mostrarlos
    ['alert', 'confirm'].forEach(function (f) {
      const orig = window[f];
      if (typeof orig !== 'function' || orig.__noaMay) return;
      const nuevo = function (m) { return orig.call(window, String(m == null ? '' : m).toUpperCase()); };
      nuevo.__noaMay = true;
      window[f] = nuevo;
    });
  })();
  // ---- Columna Asegurado: más ancha, el nombre baja a una segunda línea en vez de cortarse, letra de la tabla un punto menor ----
  const ANCHO_ASEGURADO = '210px';
  (function () {
    const st = document.createElement('style');
    st.id = 'noa-asegurado-ancho';
    st.textContent =
      '.noa-table td { font-size: 12px; }' +
      '.noa-table td.col-sticky > div { white-space: normal !important; text-overflow: clip !important; line-height: 1.25 !important;' +
      ' display: -webkit-box !important; -webkit-box-orient: vertical !important; -webkit-line-clamp: 2 !important; overflow: hidden !important; word-break: break-word; }' +
      '.noa-table th.col-sticky, .noa-table td.col-sticky { width: ' + ANCHO_ASEGURADO + ' !important; min-width: ' + ANCHO_ASEGURADO + ' !important; max-width: ' + ANCHO_ASEGURADO + ' !important; }';
    (document.head || document.documentElement).appendChild(st);
  })();
  function anchoAsegurado() {
    document.querySelectorAll('.noa-table').forEach(function (t) {
      const th = t.querySelector('th.col-sticky');
      if (!th || t.getAttribute('data-aw') === '1') return;
      const i = Array.prototype.indexOf.call(th.parentElement.children, th);
      const col = t.querySelectorAll('colgroup > col')[i];
      if (col) col.style.setProperty('width', ANCHO_ASEGURADO, 'important');
      t.setAttribute('data-aw', '1');
    });
  }
  function titulosEnMayuscula() {
    document.querySelectorAll('[title]:not([data-tu])').forEach(function (e) {
      e.setAttribute('data-tu', '1');
      const t = e.getAttribute('title');
      if (t) e.setAttribute('title', t.toUpperCase());
    });
  }
  // ---- Ninguna columna de Cartera debe mostrar "..." ni dejar texto cortado: cada columna crece hasta que su contenido más largo quepa ----
  const TOPE_COLUMNA = 420; // px: un texto larguísimo (ej. un correo raro) no deja la columna infinita
  const SIN_TEXTO = { INPUT: 1, SELECT: 1, BUTTON: 1, TEXTAREA: 1, OPTION: 1 };
  function ajustarColumnas() {
    document.querySelectorAll('.noa-table').forEach(function (t) {
      if (!t.offsetParent) return; // tabla oculta (otra pestaña): no se puede medir
      const hs = t.querySelectorAll('thead th');
      const cols = t.querySelectorAll('colgroup > col');
      if (!hs.length || !cols.length) return;
      const falta = new Array(cols.length).fill(0);
      // los títulos de columna también (ej. "ASEGURADO..." en vez de ASEGURADORA)
      Array.prototype.forEach.call(hs, function (th, i) {
        if (i >= cols.length || th.classList.contains('col-sticky') || th.colSpan > 1) return;
        const els = [th].concat(Array.prototype.slice.call(th.querySelectorAll('*')));
        els.forEach(function (el) {
          const extra = el.scrollWidth - el.clientWidth;
          if (extra > 1) falta[i] = Math.max(falta[i], extra + 2);
        });
      });
      t.querySelectorAll('tbody tr').forEach(function (tr) {
        Array.prototype.forEach.call(tr.children, function (td, i) {
          if (i >= cols.length || td.classList.contains('col-sticky')) return;
          const els = [td].concat(Array.prototype.slice.call(td.querySelectorAll('*')));
          els.forEach(function (el) {
            if (SIN_TEXTO[el.tagName]) return;
            const extra = el.scrollWidth - el.clientWidth;
            if (extra > 1) falta[i] = Math.max(falta[i], extra + 2);
          });
        });
      });
      falta.forEach(function (extra, i) {
        if (!extra) return;
        const actual = cols[i].getBoundingClientRect().width || hs[i].getBoundingClientRect().width;
        const w = Math.min(TOPE_COLUMNA, Math.ceil(actual + extra));
        if (w <= actual + 1) return;
        cols[i].style.setProperty('width', w + 'px', 'important');
        if (hs[i]) { hs[i].style.setProperty('width', w + 'px', 'important'); hs[i].style.setProperty('min-width', w + 'px', 'important'); }
      });
    });
  }

  // ---- Cartera usa todo el ancho de la pantalla: se quitan los topes de ancho y los márgenes blancos de los contenedores que la rodean ----
  (function () {
    const st = document.createElement('style');
    st.id = 'noa-cartera-ancha';
    st.textContent = '[data-noa-ancho] { max-width: none !important; width: auto !important; min-width: 0 !important; margin-left: 0 !important; margin-right: 0 !important; padding-left: 12px !important; padding-right: 12px !important; box-sizing: border-box !important; }';
    (document.head || document.documentElement).appendChild(st);
  })();
  function carteraAncha() {
    const c = document.getElementById('cartera-noa');
    if (!c || c.getAttribute('data-ancha') === '1') return;
    c.setAttribute('data-ancha', '1');
    let a = c.parentElement;
    while (a && a !== document.body && a !== document.documentElement) {
      a.setAttribute('data-noa-ancho', '1');
      a = a.parentElement;
    }
  }

  // ---- Estado y Cliente quedan fijos juntos al correr la tabla de lado (antes el Cliente se montaba encima de Estado) ----
  function fijarColumnas() {
    document.querySelectorAll('.noa-table').forEach(function (t) {
      const thS = t.querySelector('th.col-sticky');
      if (!thS || !t.offsetParent) return;
      const fila = thS.parentElement;
      const idx = Array.prototype.indexOf.call(fila.children, thS);
      const lefts = []; let acum = 0;
      for (let i = 0; i <= idx; i++) { lefts.push(acum); acum += fila.children[i].getBoundingClientRect().width; }
      t.querySelectorAll('tr').forEach(function (tr) {
        if (tr.children.length !== fila.children.length) return;
        for (let i = 0; i <= idx; i++) {
          const c = tr.children[i];
          c.style.setProperty('position', 'sticky');
          c.style.setProperty('left', lefts[i] + 'px');
          c.style.setProperty('z-index', c.tagName === 'TH' ? '8' : '3');
        }
      });
    });
  }
  let _t = null, _medir = false;
  new MutationObserver(function (muts) {
    for (let k = 0; k < muts.length && !_medir; k++) {
      const n = muts[k].target;
      if (n && n.nodeType === 1 && (n.closest('.noa-table') || n.querySelector('.noa-table'))) _medir = true;
    }
    if (_t) return;
    _t = setTimeout(function () {
      _t = null;
      try { titulosEnMayuscula(); } catch (e) { /* no importa */ }
      try { anchoAsegurado(); } catch (e) { /* no importa */ }
      try { fijarColumnas(); } catch (e) { /* no importa */ }
      try { carteraAncha(); } catch (e) { /* no importa */ }
      if (_medir) { _medir = false; try { ajustarColumnas(); } catch (e) { console.error('Ajuste de columnas:', e); } }
    }, 120);
  }).observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('load', function () { setTimeout(function () { try { ajustarColumnas(); } catch (e) { /* no importa */ } }, 600); });

  try { titulosEnMayuscula(); } catch (e) { /* no importa */ }
  // Carga el asistente conversacional con IA (se hace desde aquí para no tocar index.html)
  (function () {
    if (document.querySelector('script[data-noa-ia]')) return;
    const sc = document.createElement('script');
    sc.src = '/noa_asistente_ia.js?v=1'; sc.defer = true; sc.setAttribute('data-noa-ia', '1');
    (document.head || document.documentElement).appendChild(sc);
  })();

  window.NOA_POLIZAS_REPETIDAS = { repetidas: repetidas, pintar: pintar };
  setInterval(function () { try { pintar(); } catch (e) { console.error('Pólizas repetidas:', e); } }, 1500);
  console.log('✅ noa_editar_cliente.js cargado (formulario único + tarjeta Pólizas repetidas)');
})();

(function(){
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return '&#'+c.charCodeAt(0)+';';});};
var fecha=function(v){var s=String(v||'').split('T')[0].split('-');return s.length===3&&s[0].length===4?s[2]+'/'+s[1]+'/'+s[0]:String(v||'');};
window.noaVerCliente=function(id){
var r=(window.datosReales||[]).concat(window._datosRealesBackup||[]).find(function(x){return String(x.id)===String(id);});
if(r===undefined)return;
var o=document.getElementById('noa-ver');if(o)o.remove();
var fx=function(v){return (typeof window.excelDate==='function')?window.excelDate(v):fecha(v);};
var usd=String(r.moneda||'').toUpperCase().indexOf('USD')>-1||String(r.moneda||'').indexOf('$')>-1;
var pr=Number(r.prima)||0;
var primaTxt=pr>0?((usd?'US$ ':'₡ ')+(window.noaPrimaTxt?window.noaPrimaTxt(pr):pr)):'';
var vacio=function(v){return v==null||v===''||v==='-'||v==='?';};
var fila=function(k,v,falta){
if(vacio(v)){if(!falta)return '';return '<div class="nv-f"><b>'+k+'</b><span class="nv-falta">'+falta+'</span></div>';}
return '<div class="nv-f"><b>'+k+'</b><span>'+esc(v)+'</span></div>';};
var sec=function(t,rows){var h=rows.join('');return h?'<div class="nv-s">'+t+'</div>'+h:'';};
var polizaH=sec('Póliza',[fila('Acreedor',r.acreedor,'—')]);
var contactoH=sec('Datos del cliente',[fila('Identificación',r.identificacion,'—'),fila('Tel / WA',r.telefono,'Sin teléfono'),fila('Otros tel.',r.telefonos_extra,'—'),fila('Email',r.correo,'Sin correo'),fila('Otros correos',r.correos_extra,'—'),fila('Dirección',r.direccion,'—'),fila('Planillas',r.planillas?'Sí':'','No')]);
var contratoH=sec('Contrato',[fila('Inicio',fx(r.desde),'—'),fila('Vence',fx(r.vence_contrato),'—')]);
if(!document.getElementById('noa-ver-css')){var st=document.createElement('style');st.id='noa-ver-css';
st.textContent='#noa-ver .nv-card{background:#fff;color:#111827;border:1px solid #e5e7eb;border-radius:14px;padding:22px 24px;width:100%;max-width:520px;max-height:90vh;overflow:auto;box-shadow:0 20px 50px rgba(15,23,42,.25)}#noa-ver .nv-t{font-size:19px;font-weight:700;color:#12263f}#noa-ver .nv-p{color:#6b7280;font-size:13px;margin:2px 0 6px}#noa-ver .nv-s{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#0f766e;margin:16px 0 4px;padding-bottom:4px;border-bottom:2px solid #ccfbf1}#noa-ver .nv-f{display:flex;gap:12px;padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:14px}#noa-ver .nv-f b{flex:0 0 150px;color:#6b7280;font-size:12px;font-weight:600;padding-top:1px}#noa-ver .nv-f span{flex:1;word-break:break-word;color:#111827;font-weight:500}#noa-ver .nv-f span.nv-falta{color:#b45309;font-weight:600}#noa-ver .nv-x{background:#0d9488!important;color:#fff!important;border:0!important;border-radius:8px!important;padding:9px 22px!important;font-weight:700!important;cursor:pointer}';
document.head.appendChild(st);}
var m=document.createElement('div');m.id='noa-ver';
m.style.cssText='position:fixed;inset:0;z-index:9500;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:16px';
m.innerHTML='<div class="nv-card"><div class="nv-t">'+esc(r.asegurado||'')+'</div><div class="nv-p">Póliza '+esc(r.poliza||'')+'</div>'+polizaH+contactoH+contratoH+'<div style="text-align:right;margin-top:18px"><button class="nv-x" id="noa-ver-x">Cerrar</button></div></div>';
var cerrar=function(){m.remove();document.removeEventListener('keydown',esc2);};
var esc2=function(e){if(e.key==='Escape')cerrar();};
m.onclick=function(e){if(e.target===m)cerrar();};
document.addEventListener('keydown',esc2);
document.body.appendChild(m);
document.getElementById('noa-ver-x').onclick=cerrar;
};
})();

window.noaPrimaTxt=function(v){return (Number(v)||0).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2});};
window.noaPrima=function(el,modo){
if(modo===3){if(el.dataset.g==='1')return;el.value=window.noaPrimaTxt(Number(String(el.value).replace(/[^0-9,.]/g,'').replace(',','.'))||0);return;}
if(modo===1){var n=Number(String(el.value).replace(/[^0-9,]/g,'').replace(',','.'))||0;el.value=String(n).replace('.',',');el.select();return;}
el.value=String(el.value).replace(/[^0-9,.]/g,'').replace(',','.');
el.dataset.g='1';Promise.resolve(window.noaEditarCelda(el.dataset.pid,'prima',el)).then(function(){el.dataset.g='';el.value=window.noaPrimaTxt(Number(String(el.value).replace(',','.'))||0);});
};

(function(){
var f=function(n){return window.noaPrimaTxt?window.noaPrimaTxt(n):String(n);};
var p=function(t){var n=Number(String(t).replace(/[^0-9,.]/g,'').replace(',','.'));return isNaN(n)?0:n;};
function arreglar(){
var o=document.getElementById('fc-prima');
if(o===null||o.getAttribute('data-fmt'))return;
o.setAttribute('data-fmt','1');
var t=document.createElement('input');t.type='text';t.setAttribute('inputmode','decimal');t.setAttribute('data-twin','fc-prima');
t.style.cssText=o.style.cssText;t.className=o.className;
var n0=Number(o.value)||0;t.value=n0>0?f(n0):'';
t.onfocus=function(){var n=p(t.value);t.value=n>0?String(n).replace('.',','):'';t.select();};
t.oninput=function(){var n=p(t.value);o.value=n>0?String(n):'';};
t.onblur=function(){var n=p(t.value);o.value=n>0?String(n):'';t.value=n>0?f(n):'';};
o.parentNode.insertBefore(t,o);o.style.display='none';
}
new MutationObserver(arreglar).observe(document.documentElement,{childList:true,subtree:true});
})();
(function(){
  var NOM='tabla-historial-pagos';
  function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
  function filas(t){return Array.prototype.slice.call(t.querySelectorAll('#pagos-tbody tr'));}
  function iso(s){
    s=String(s||'').trim();
    var m=s.match(/^(\d{4})-(\d{2})-(\d{2})/); if(m) return m[1]+'-'+m[2]+'-'+m[3];
    m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if(m) return m[3]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2);
    return '';
  }
  function val(id){return (document.getElementById(id)||{}).value||'';}
  function filtrar(){
    var t=document.getElementById(NOM); if(!t) return;
    var q=norm(val('noa-hp-buscar')).trim(), de=val('noa-hp-desde'), ha=val('noa-hp-hasta'), mo=val('noa-hp-moneda'), n=0, tot=0, nUSD=0, nCRC=0;
    filas(t).forEach(function(tr){
      var c=tr.getElementsByTagName('td'); if(c.length<5) return;
      tot++;
      var ok=true, d=iso(c[0].textContent);
      if(q && norm(tr.textContent).indexOf(q)<0) ok=false;
      if(ok && de && (!d || d<de)) ok=false;
      if(ok && ha && (!d || d>ha)) ok=false;
      var usd=/USD|US\$/i.test(c[4].textContent||'');
      if(ok && mo && ((mo==='usd')!==usd)) ok=false;
      tr.style.display=ok?'':'none'; if(ok){ n++; if(usd) nUSD++; else nCRC++; }
    });
    var e=document.getElementById('noa-hp-cuenta'); if(e) e.textContent='Mostrando '+n+' de '+tot;
    var tab=document.getElementById('historial-pagos-tab');
    if(tab) Array.prototype.forEach.call(tab.querySelectorAll('div'),function(d){
      if(d.children.length!==0||!d.parentElement) return;
      var tx=d.textContent.trim();
      if(tx==='Total USD') d.parentElement.style.display=(mo==='crc')?'none':'';
      else if(tx==='Total CRC') d.parentElement.style.display=(mo==='usd')?'none':'';
      else if(tx==='Total Pagos'){ var v=d.nextElementSibling; if(v) v.textContent=String(n); }
    });
  }
  function limpiar(){
    ['noa-hp-buscar','noa-hp-desde','noa-hp-hasta','noa-hp-moneda'].forEach(function(i){var x=document.getElementById(i); if(x) x.value='';});
    filtrar();
  }
  function exportar(){
    var t=document.getElementById(NOM); if(!t) return;
    var datos=[['Fecha Pago','Cliente','Póliza','Periodo','Monto']];
    filas(t).forEach(function(tr){
      var c=tr.getElementsByTagName('td');
      if(tr.style.display==='none'||c.length<5) return;
      datos.push([0,1,2,3,4].map(function(i){return (c[i].textContent||'').trim();}));
    });
    if(datos.length<2){alert('No hay datos visibles para exportar');return;}
    var ws=XLSX.utils.aoa_to_sheet(datos);
    ws['!cols']=[{wch:14},{wch:36},{wch:18},{wch:26},{wch:16}];
    var wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Historial Pagos');
    XLSX.writeFile(wb,'historial_pagos_'+(window.mesPagosSeleccionado||'todos')+'.xlsx');
  }
  window.noaHpLimpiar=limpiar;
  function ux(){
    window.filtrarPagosPorColumna=filtrar; window.exportarPagosExcel=exportar;
    var t=document.getElementById(NOM);
    if(!t||t.dataset.ux) return; t.dataset.ux='1';
    t.querySelectorAll('thead input').forEach(function(i){i.remove();});
    Array.prototype.forEach.call(t.querySelectorAll('tr'),function(r){
      var c=r.children;
      if(c.length>=7){ c[6].remove(); c[5].remove(); }
      else if(c.length===1 && c[0].getAttribute('colspan')) c[0].setAttribute('colspan','5');
    });
    t.style.width='100%'; t.style.tableLayout='auto';
    Array.prototype.forEach.call(t.querySelectorAll('th,td'),function(x){
      x.style.maxWidth='none'; x.style.overflow='visible'; x.style.textOverflow='clip';
      x.style.whiteSpace=(x.cellIndex===1)?'normal':'nowrap';
    });
    Array.prototype.forEach.call((document.getElementById('historial-pagos-tab')||document).querySelectorAll('div'),function(d){
      if(d.children.length===0 && d.textContent.trim()==='Promedio Mora' && d.parentElement) d.parentElement.style.display='none';
    });
    var s='background:#0F172A;border:1px solid #334155;color:#E2E8F0;border-radius:8px;padding:9px 12px;font-size:14px;';
    var l='color:#94A3B8;font-size:13px;';
    var bar=document.createElement('div');
    bar.style.cssText='display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:10px 0;';
    bar.innerHTML='<input id="noa-hp-buscar" type="text" placeholder="🔍 Buscar por cliente, póliza o monto..." oninput="filtrarPagosPorColumna()" style="'+s+'flex:1 1 260px;">'
      +'<label style="'+l+'">📅 Pagos del</label>'
      +'<input id="noa-hp-desde" type="date" onchange="filtrarPagosPorColumna()" style="'+s+'">'
      +'<label style="'+l+'">al</label>'
      +'<input id="noa-hp-hasta" type="date" onchange="filtrarPagosPorColumna()" style="'+s+'">'
      +'<select id="noa-hp-moneda" onchange="filtrarPagosPorColumna()" style="'+s+'cursor:pointer;"><option value="">Todas las monedas</option><option value="crc">₡ Colones</option><option value="usd">US$ Dólares</option></select>'
      +'<button type="button" onclick="noaHpLimpiar()" style="'+s+'cursor:pointer;">✕ Limpiar</button>'
      +'<span id="noa-hp-cuenta" style="'+l+'"></span>';
    var host=t.parentElement; host.parentNode.insertBefore(bar,host);
    filtrar();
  }
  try{ new MutationObserver(ux).observe(document.documentElement,{childList:true,subtree:true}); }catch(e){}
  document.addEventListener('DOMContentLoaded',ux);
})();
(function(){
  var RE=/(^|[^\d-])(\d{4})-(\d{2})-(\d{2})(?![\dT-])/g;
  function fix(s){return s.replace(RE,function(m,p,y,mo,d){
    if(+mo<1||+mo>12||+d<1||+d>31) return m;
    return p+d+'/'+mo+'/'+y;});}
  function walk(n){
    if(n.nodeType===3){
      var v=n.nodeValue;
      if(v && v.indexOf('-')>0){ var w=fix(v); if(w!==v) n.nodeValue=w; }
      return;
    }
    if(n.nodeType!==1) return;
    var t=n.tagName;
    if(t==='SCRIPT'||t==='STYLE'||t==='TEXTAREA'||t==='INPUT'||t==='SELECT') return;
    for(var c=n.firstChild;c;c=c.nextSibling) walk(c);
  }
  try{
    new MutationObserver(function(ms){
      ms.forEach(function(m){
        if(m.type==='characterData') walk(m.target);
        else Array.prototype.forEach.call(m.addedNodes,walk);
      });
    }).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  }catch(e){}
  document.addEventListener('DOMContentLoaded',function(){ if(document.body) walk(document.body); });
})();
(function(){
  var RE=/^(\s*)autos(\s*)$/i;
  function fix(n){
    var m=RE.exec(n.nodeValue||''); if(!m) return;
    var p=n.parentNode;
    if(p && p.tagName==='OPTION' && !p.hasAttribute('value')) p.setAttribute('value',n.nodeValue.trim());
    n.nodeValue=m[1]+'Autom\u00F3viles'+m[2];
  }
  function walk(n){
    if(n.nodeType===3){ fix(n); return; }
    if(n.nodeType!==1) return;
    var t=n.tagName;
    if(t==='SCRIPT'||t==='STYLE'||t==='TEXTAREA'||t==='INPUT') return;
    for(var c=n.firstChild;c;c=c.nextSibling) walk(c);
  }
  try{
    new MutationObserver(function(ms){
      ms.forEach(function(m){
        if(m.type==='characterData') walk(m.target);
        else Array.prototype.forEach.call(m.addedNodes,walk);
      });
    }).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  }catch(e){}
  document.addEventListener('DOMContentLoaded',function(){ if(document.body) walk(document.body); });
})();
