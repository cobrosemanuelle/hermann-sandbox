// NOA · Configuración UX: el bloque grande verde de EmailJS pasa a una línea de estado.
// Los datos técnicos (claves) siguen ahí, escondidos en "Ver datos técnicos".
(function () {
  'use strict';
  function compactar() {
    var cfg = document.getElementById('configuracion');
    if (!cfg || cfg.dataset.ncMail) return;
    var bloque = null;
    Array.prototype.forEach.call(cfg.children, function (d) {
      if (!bloque && d.tagName === 'DIV' && /EmailJS\s+CONFIGURADO/i.test(d.textContent)) bloque = d;
    });
    if (!bloque) return;
    cfg.dataset.ncMail = '1';
    var hijos = Array.prototype.slice.call(bloque.children);
    var cab = document.createElement('div');
    cab.className = 'nc-mail';
    cab.innerHTML = '<div><div class="nc-t">✅ Envío de correos configurado</div><div class="nc-s">El sistema ya puede mandar avisos por correo.</div></div>' +
      '<button type="button" onclick="verificarConfiguracionEmailJS()">🧪 Probar envío de correo</button>';
    var det = document.createElement('details');
    det.className = 'nc-tec';
    var sum = document.createElement('summary');
    sum.textContent = 'Ver datos técnicos';
    det.appendChild(sum);
    hijos.forEach(function (h) { det.appendChild(h); });
    bloque.appendChild(cab);
    bloque.appendChild(det);
  }
  document.addEventListener('DOMContentLoaded', compactar);
  window.addEventListener('load', compactar);
  setTimeout(compactar, 1500);
})();
