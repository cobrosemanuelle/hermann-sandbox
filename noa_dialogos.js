// NOA · Avisos y confirmaciones con el estilo del sistema (reemplazan las ventanas feas del navegador)
// - window.alert pasa a ser un aviso en pantalla (no bloquea, no trae la casilla "no permitir que vuelva a preguntar")
// - window.noaConfirmar({titulo, filas:[[etiqueta,valor]], aviso, ok, cancelar}) -> Promise<boolean>
(function () {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // ---------- Avisos ----------
  let caja = null;
  function cajaAvisos() {
    if (caja && document.body.contains(caja)) return caja;
    caja = document.createElement('div');
    caja.id = 'noa-avisos';
    caja.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:100000;display:flex;flex-direction:column;gap:10px;max-width:420px;width:calc(100vw - 40px);pointer-events:none;';
    document.body.appendChild(caja);
    return caja;
  }
  function aviso(texto) {
    try {
      const t = String(texto == null ? '' : texto);
      const lo = t.replace(/^\s+/, '');
      const tipo = /^(✅)/.test(lo) ? 'ok' : /^(⚠|❌|error|no se pudo|falta)/i.test(lo) ? 'mal' : 'info';
      const col = { ok: '#0d9488', mal: '#d97706', info: '#12263f' }[tipo];
      const el = document.createElement('div');
      el.setAttribute('role', 'status');
      el.style.cssText = 'pointer-events:auto;background:#fff;border:1px solid #e5e7eb;border-left:5px solid ' + col + ';border-radius:12px;box-shadow:0 10px 30px rgba(15,23,42,.18);padding:14px 16px;color:#12263f;font:14px/1.45 -apple-system,Segoe UI,Roboto,sans-serif;white-space:pre-line;display:flex;gap:12px;align-items:flex-start;';
      el.innerHTML = '<div style="flex:1">' + esc(t) + '</div><span role="button" tabindex="0" aria-label="Cerrar" data-x="1" style="cursor:pointer;color:#64748b;font-size:20px;line-height:1;padding:0 4px;">×</span>';
      const quitar = function () { if (el.parentNode) el.parentNode.removeChild(el); };
      el.querySelector('[data-x]').onclick = quitar;
      cajaAvisos().appendChild(el);
      setTimeout(quitar, tipo === 'mal' ? 14000 : 8000);
    } catch (e) { console.log(texto); }
  }
  window.noaAviso = aviso;
  window.alert = aviso;

  // ---------- Confirmación ----------
  function confirmar(o) {
    o = o || {};
    return new Promise(function (resolver) {
      const fondo = document.createElement('div');
      fondo.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:100001;display:flex;align-items:center;justify-content:center;padding:16px;';
      const filas = (o.filas || []).map(function (f) {
        return '<div style="display:flex;justify-content:space-between;gap:16px;padding:9px 0;border-bottom:1px solid #f1f5f9;"><span style="color:#64748b;font-size:13px;">' + esc(f[0]) + '</span><span style="color:#12263f;font-weight:600;text-align:right;">' + esc(f[1]) + '</span></div>';
      }).join('');
      const av = o.aviso ? '<div style="margin-top:12px;background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:10px;padding:10px 12px;font-size:13px;">' + esc(o.aviso) + '</div>' : '';
      const msg = o.mensaje ? '<div style="color:#475569;font-size:14px;margin-bottom:8px;white-space:pre-line;">' + esc(o.mensaje) + '</div>' : '';
      fondo.innerHTML = '<div role="dialog" aria-modal="true" style="background:#fff;border-radius:16px;box-shadow:0 20px 50px rgba(15,23,42,.3);width:100%;max-width:440px;padding:22px 24px;font:14px/1.45 -apple-system,Segoe UI,Roboto,sans-serif;">'
        + '<div style="font-size:19px;font-weight:800;color:#12263f;margin-bottom:10px;">' + esc(o.titulo || 'Confirmar') + '</div>' + msg + filas + av
        + '<div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px;">'
        + '<span role="button" tabindex="0" data-n="0" style="cursor:pointer;padding:10px 18px;border-radius:10px;border:1px solid #d1d5db;color:#374151;font-weight:600;">' + esc(o.cancelar || 'Cancelar') + '</span>'
        + '<span role="button" tabindex="0" data-n="1" style="cursor:pointer;padding:10px 20px;border-radius:10px;background:#0d9488;color:#fff;font-weight:700;">' + esc(o.ok || 'Confirmar') + '</span></div></div>';
      const cerrar = function (v) { document.removeEventListener('keydown', tecla, true); if (fondo.parentNode) fondo.parentNode.removeChild(fondo); resolver(v); };
      const tecla = function (e) { if (e.key === 'Escape') { e.preventDefault(); cerrar(false); } };
      document.addEventListener('keydown', tecla, true);
      fondo.addEventListener('click', function (e) { if (e.target === fondo) cerrar(false); });
      fondo.querySelectorAll('[data-n]').forEach(function (b) { const f = function () { cerrar(b.getAttribute('data-n') === '1'); }; b.onclick = f; b.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); f(); } }; });
      document.body.appendChild(fondo);
      const ok = fondo.querySelector('[data-n="1"]'); if (ok) ok.focus();
    });
  }
  window.noaConfirmar = confirmar;
  console.log('✅ noa_dialogos.js cargado');
})();
