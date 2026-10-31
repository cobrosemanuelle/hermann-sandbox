// NOA · Cross-Selling UX: abre y analiza solo; no manda a Cartera; avisa si no hay clientes
(function () {
  'use strict';
  function vacio(msg) {
    var c = document.getElementById('ia-crossselling');
    if (c) c.innerHTML = '<div class="ia-vacio">' + msg + '</div>';
  }
  function envolver() {
    var orig = window.analizarCrossSelling;
    if (typeof orig !== 'function' || orig.__ux) return;
    window.analizarCrossSelling = function () {
      var base = window._datosRealesBackup || window.datosReales;
      if (!base || !base.length) { vacio('Todavía no hay clientes cargados. Cuando haya datos en Cartera, aquí aparecen las oportunidades.'); return; }
      var actual = window.datosReales;
      window.datosReales = base;
      window._oportunidadesCS = null;
      try { return orig.apply(this, arguments); } finally { window.datosReales = actual; }
    };
    window.analizarCrossSelling.__ux = true;
    window.inicializarIA = async function () { window.analizarCrossSelling(); };
  }
  // El cambiarTab de la página no abre el análisis de Cross-Selling: se hace aquí al entrar a la pestaña
  document.querySelectorAll('.nav-tab').forEach(function (b) {
    b.addEventListener('click', function () {
      setTimeout(function () {
        var t = document.getElementById('ia');
        if (t && t.classList.contains('active') && typeof window.inicializarIA === 'function') window.inicializarIA();
      }, 400);
    });
  });
  envolver();
  document.addEventListener('DOMContentLoaded', envolver);
  window.addEventListener('load', envolver);
})();
