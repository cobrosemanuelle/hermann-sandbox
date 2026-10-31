// Configuración WasenderAPI - Lee de localStorage (cada cliente configura su propia key)
//
// MODO PRUEBA: mientras no haya una API Key real guardada, el WhatsApp se simula.
// No sale ningun mensaje, pero el envio queda registrado (historial, contador del boton y Carpeta)
// marcado como prueba. En cuanto se guarda una API Key real de Wasender, el modo prueba se apaga
// solo y todo sale de verdad. Se quita por completo antes de cargar datos reales.
(function () {
  'use strict';

  const MARCA = 'MODO_PRUEBA';
  const enPrueba = function () { return (localStorage.getItem('wasender_api_key') || '') === MARCA; };

  // Sin llave guardada se arranca en modo prueba
  if (!localStorage.getItem('wasender_api_key')) localStorage.setItem('wasender_api_key', MARCA);

  // 1. Las llamadas a Wasender se simulan mientras sea modo prueba
  const fetchOriginal = window.fetch.bind(window);
  window.fetch = function (recurso, opciones) {
    const url = String((recurso && recurso.url) || recurso || '');
    if (enPrueba() && url.indexOf('wasenderapi.com') !== -1) {
      const cuerpo = { success: true, status: 'connected', message: 'Modo prueba: no se envio nada', data: { status: 'connected' } };
      return Promise.resolve(new Response(JSON.stringify(cuerpo), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }
    return fetchOriginal(recurso, opciones);
  };

  // 2. El envio de WhatsApp queda marcado como prueba en el historial
  const guardarOriginal = window.guardarEnvio;
  if (typeof guardarOriginal === 'function') {
    window.guardarEnvio = function (clienteId, clienteNombre, tipoEnvio, canal, mensaje, origen) {
      const texto = (enPrueba() && canal === 'whatsapp') ? '🧪 PRUEBA (no salió) — ' + mensaje : mensaje;
      return guardarOriginal.call(this, clienteId, clienteNombre, tipoEnvio, canal, texto, origen);
    };
  }

  // 3. El aviso de "enviado" aclara que en realidad no salio nada
  const alertOriginal = window.alert;
  window.alert = function (mensaje) {
    let texto = mensaje;
    if (enPrueba() && typeof texto === 'string' && texto.indexOf('✅ Mensaje enviado por WhatsApp') === 0) {
      texto = texto.replace('✅ Mensaje enviado por WhatsApp', '🧪 MODO PRUEBA: el mensaje NO salió; quedó registrado como envío de prueba');
    }
    return alertOriginal.call(window, texto);
  };

  // 4. El estado de conexion siempre aparece conectado mientras sea modo prueba
  let conectadoReal;
  Object.defineProperty(window, 'wasenderConectado', {
    configurable: true,
    get: function () { return enPrueba() ? true : conectadoReal; },
    set: function (valor) { conectadoReal = valor; }
  });

  // 5. Etiqueta visible en pantalla
  let avisoPuesto = false;
  function mostrarAviso() {
    if (avisoPuesto || !enPrueba() || !document.body) return;
    avisoPuesto = true;
    return; /*NOA_SIN_AVISO_WA*/
    const el = document.createElement('div');
    el.id = 'aviso-modo-prueba-wa';
    el.textContent = '🧪 MODO PRUEBA · los WhatsApp no salen, solo se registran';
    el.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:9999;background:#7c2d12;color:#fed7aa;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,.35);';
    document.body.appendChild(el);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mostrarAviso);
  else mostrarAviso();

  window.WASENDER_MODO_PRUEBA = enPrueba;
})();

const WASENDER_CONFIG = {
  apiUrl: 'https://www.wasenderapi.com/api/send-message',
  apiKey: localStorage.getItem('wasender_api_key') || '',
  enabled: true
};

window.WASENDER_CONFIG = WASENDER_CONFIG;

if (window.WASENDER_MODO_PRUEBA && window.WASENDER_MODO_PRUEBA()) {
    console.log('🧪 WhatsApp en MODO PRUEBA - no sale ningun mensaje, solo se registra');
} else if (WASENDER_CONFIG.apiKey) {
    console.log('✅ WasenderAPI configurado desde localStorage');
} else {
    console.log('⚠️ WasenderAPI no configurado - Configure su API Key en Ajustes');
}
