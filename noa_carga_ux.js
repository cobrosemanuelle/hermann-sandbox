// NOA · Cargar Datos: "Limpiar datos" en rojo y con confirmación fuerte (hay que escribir ELIMINAR)
(function () {
  'use strict';
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }

  var st = document.createElement('style');
  st.textContent =
    'button[onclick="limpiarDatos()"]{background:#fff!important;color:#dc2626!important;border:1px solid #fca5a5!important;border-radius:8px!important;box-shadow:none!important;margin-top:28px!important;}' +
    'button[onclick="limpiarDatos()"]:hover{background:#fef2f2!important;}' +
    '#noa-elim .ne-card{background:#fff;color:#111827;border:1px solid #fecaca;border-radius:14px;padding:24px;width:100%;max-width:460px;box-shadow:0 20px 50px rgba(15,23,42,.3)}' +
    '#noa-elim .ne-t{font-size:19px;font-weight:700;color:#b91c1c}' +
    '#noa-elim .ne-p{color:#374151;font-size:14px;line-height:1.5;margin:10px 0 14px}' +
    '#noa-elim input{width:100%;box-sizing:border-box;padding:11px 14px;border:1px solid #d1d5db!important;border-radius:8px!important;font-size:15px;letter-spacing:.08em;background:#fff!important;color:#111827!important}' +
    '#noa-elim .ne-b{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}' +
    '#noa-elim button{border-radius:8px!important;padding:9px 20px!important;font-weight:700!important;cursor:pointer;box-shadow:none!important}' +
    '#noa-elim .ne-c{background:#fff!important;color:#374151!important;border:1px solid #d1d5db!important}' +
    '#noa-elim .ne-x{background:#dc2626!important;color:#fff!important;border:0!important}' +
    '#noa-elim .ne-x:disabled{background:#fca5a5!important;cursor:not-allowed}';
  document.head.appendChild(st);

  window.limpiarDatos = function () {
    var viejo = document.getElementById('noa-elim'); if (viejo) viejo.remove();
    var n = (window.datosReales || []).length;
    var m = document.createElement('div'); m.id = 'noa-elim';
    m.style.cssText = 'position:fixed;inset:0;z-index:9600;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:16px';
    m.innerHTML = '<div class="ne-card"><div class="ne-t">⚠️ Eliminar todos los datos</div>' +
      '<div class="ne-p">Se van a borrar <b>' + esc(n) + ' ' + (n === 1 ? 'póliza' : 'pólizas') + '</b> de la cartera. <b>No se puede deshacer.</b><br>Si solo querés actualizar la información, no hace falta borrar: subí el Excel completo y el sistema actualiza lo que ya existe.</div>' +
      '<div class="ne-p" style="margin-bottom:6px">Para confirmar, escribí <b>ELIMINAR</b>:</div>' +
      '<input id="noa-elim-in" type="text" autocomplete="off" placeholder="ELIMINAR">' +
      '<div class="ne-b"><button class="ne-c" id="noa-elim-c">Cancelar</button><button class="ne-x" id="noa-elim-x" disabled>Eliminar todo</button></div></div>';
    var cerrar = function () { m.remove(); document.removeEventListener('keydown', tecla); };
    var tecla = function (e) { if (e.key === 'Escape') cerrar(); };
    document.addEventListener('keydown', tecla);
    m.onclick = function (e) { if (e.target === m) cerrar(); };
    document.body.appendChild(m);
    var inp = document.getElementById('noa-elim-in'), x = document.getElementById('noa-elim-x');
    inp.focus();
    inp.oninput = function () { x.disabled = inp.value.trim().toUpperCase() !== 'ELIMINAR'; };
    document.getElementById('noa-elim-c').onclick = cerrar;
    x.onclick = async function () {
      if (inp.value.trim().toUpperCase() !== 'ELIMINAR') return;
      x.disabled = true; x.textContent = 'Eliminando...';
      try {
        if (typeof window.limpiarTodo === 'function') await window.limpiarTodo();
        if (typeof window.mostrarNotificacion === 'function') window.mostrarNotificacion('Datos eliminados correctamente', 'success');
      } catch (err) {
        alert('No se pudo eliminar: ' + (err && err.message ? err.message : err));
      }
      cerrar();
    };
  };
})();
