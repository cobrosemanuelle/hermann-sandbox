// NOA - Seguro anti-envios a clientes reales.
// La base tiene los correos y celulares ORIGINALES. Mientras REALES sea false, NINGUN correo ni WhatsApp
// sale hacia un cliente: todo se redirige al correo y celular de prueba que se guardan en este navegador
// (clic en la etiqueta naranja de abajo a la izquierda). Sin destino de prueba, el envio se bloquea.
// ENTREGA: cambiar REALES a true (y quitar la etiqueta) para que los avisos salgan a los clientes.
(function () {
  'use strict';
  var REALES = false;
  window.NOA_ENVIOS_REALES = REALES;

  function ls(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function ss(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function tel8(v) { var d = String(v || '').replace(/\D/g, ''); if (d.indexOf('506') === 0 && d.length > 8) d = d.slice(3); return d.length === 8 ? d : ''; }
  function limpiarMail(v) { return String(v || '').trim().replace(/[\s.,;]+$/, '').toLowerCase(); }
  function mailOk(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim()); }
  var avisoBloqueo = function (que) {
    window.alert('🧪 ENVÍOS EN MODO PRUEBA\n\nNo se envió el ' + que + ' porque no hay destino de prueba.\nDé clic en la etiqueta naranja de abajo a la izquierda y escriba su ' + (que === 'correo' ? 'correo' : 'celular') + '.\n\n(Así ningún aviso sale a un cliente real.)');
  };

  // Correo: EmailJS.
  // OJO: la libreria de EmailJS entrega sus funciones como propiedades de solo lectura, asi que NO se puede
  // reemplazar emailjs.send directamente (daba error y apagaba todo el seguro). Se reemplaza el objeto emailjs completo.
  function crearEmailSeguro(base) {
    var seguro = {};
    try { for (var k in base) { seguro[k] = (typeof base[k] === 'function') ? base[k].bind(base) : base[k]; } } catch (e) {}
    var origSend = (base && typeof base.send === 'function') ? base.send.bind(base) : null;
    seguro.send = function (servicio, plantilla, params, llave) {
      var dest = limpiarMail(ls('noa_prueba_email'));
      if (!mailOk(dest)) { avisoBloqueo('correo'); return Promise.reject({ text: 'Modo prueba: falta el correo de prueba' }); }
      if (!origSend) return Promise.reject({ text: 'Modo prueba: EmailJS no esta disponible' });
      var p = Object.assign({}, params || {});
      var original = p.to_email || '(sin correo)';
      p.to_email = dest;
      p.asunto = '[PRUEBA] ' + (p.asunto || '');
      p.mensaje = '(PRUEBA: este aviso iba para ' + original + ')\n\n' + (p.mensaje || '');
      return origSend(servicio, plantilla, p, llave);
    };
    seguro.__noaPrueba = true;
    return seguro;
  }
  function envolverEmail() {
    if (REALES) return;
    var actual = window.emailjs;
    if (actual && actual.__noaPrueba) return;
    if (actual) {
      var seguro = crearEmailSeguro(actual);
      try { window.emailjs = seguro; } catch (e) {}
      if (window.emailjs !== seguro) {
        try { Object.defineProperty(window, 'emailjs', { configurable: true, get: function () { return seguro; }, set: function () {} }); } catch (e2) {}
      }
    } else {
      // La libreria todavia no cargo: se envuelve en cuanto aparezca
      var guardado;
      try {
        Object.defineProperty(window, 'emailjs', {
          configurable: true,
          get: function () { return guardado; },
          set: function (v) { guardado = (v && !v.__noaPrueba) ? crearEmailSeguro(v) : v; }
        });
      } catch (e3) {}
    }
  }

  // WhatsApp: Wasender (se aplica antes del modo simulado)
  function envolverWA() {
    if (REALES || window.__noaPruebaFetch) return;
    var f = window.fetch.bind(window);
    window.fetch = function (recurso, opciones) {
      try {
        var url = String((recurso && recurso.url) || recurso || '');
        var esEnvio = url.indexOf('wasenderapi.com/api/send-message') !== -1;
        var simulado = ls('wasender_api_key') === 'MODO_PRUEBA';
        if (esEnvio && !simulado) {
          var d = tel8(ls('noa_prueba_tel'));
          if (!d) { avisoBloqueo('WhatsApp'); return Promise.reject(new Error('Modo prueba: falta el celular de prueba')); }
          var b = JSON.parse((opciones && opciones.body) || '{}');
          var orig = b.to || '(sin número)';
          b.to = '+506' + d;
          b.text = '(PRUEBA: este aviso iba para ' + orig + ')\n\n' + (b.text || '');
          opciones = Object.assign({}, opciones, { body: JSON.stringify(b) });
        }
      } catch (e) { console.error('noa_prueba', e); }
      return f(recurso, opciones);
    };
    window.__noaPruebaFetch = true;
  }

  // Etiqueta visible y configuracion del destino de prueba
  function pintar(el) {
    var e = limpiarMail(ls('noa_prueba_email')), t = tel8(ls('noa_prueba_tel'));
    el.textContent = '🧪 ENVÍOS DE PRUEBA → ' + (mailOk(e) ? e : 'sin correo') + ' · ' + (t ? t.slice(0, 4) + '-' + t.slice(4) : 'sin celular') + ' (clic para cambiar)';
  }
  function etiqueta() {
    if (REALES || !document.body || document.getElementById('noa-aviso-prueba-destino')) return;
    var el = document.createElement('div');
    el.id = 'noa-aviso-prueba-destino';
    el.style.cssText = 'position:fixed;left:12px;bottom:48px;z-index:9999;background:#9a3412;color:#ffedd5;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:600;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.35);max-width:92vw;';
    el.onclick = function () {
      var c = window.prompt('Correo de PRUEBA (a donde llegarán los avisos por correo):', limpiarMail(ls('noa_prueba_email')));
      if (c !== null) { c = limpiarMail(c); if (c && !mailOk(c)) window.alert('Ese correo no es válido.'); else ss('noa_prueba_email', c); }
      var t = window.prompt('Celular de PRUEBA, 8 dígitos (a donde llegarán los WhatsApp):', ls('noa_prueba_tel'));
      if (t !== null) { if (t.trim() && !tel8(t)) window.alert('El celular debe tener 8 dígitos.'); else ss('noa_prueba_tel', tel8(t)); }
      pintar(el);
    };
    pintar(el);
    el.style.display = 'none'; /*NOA_SIN_AVISO*/
    document.body.appendChild(el);
  }

  try { envolverEmail(); } catch (e) { console.error('noa_prueba email', e); }
  try { envolverWA(); } catch (e) { console.error('noa_prueba wa', e); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', etiqueta); else etiqueta();
})();
