// NOA INIT v5 - Contadores separados
console.log('🚀 noa_init.js v5');

window.limpiarTodosLosIndicadores = function() {
  ['count-sin-telefono','count-sin-email','count-saldo-incorrecto','count-sin-contacto','count-saldo-invalido','count-no-responde','count-no-responde-mora','count-contacto-erroneo','count-tel-sospechosos','count-email-sospechosos'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.textContent = '(0)';
  });
  /*NOA_SEMAFORO_NO_CERO*/ // El Estado de Cobranza lo calcula noa_semaforo.js: aqui no se pone en cero (se borraba al corregir un dato desde Calidad de datos)
  if (typeof window.actualizarSemaforo === 'function') window.actualizarSemaforo();
};

window.actualizarTodosLosIndicadores = function() {
  if (!window.datosReales || window.datosReales.length === 0) {
    window.limpiarTodosLosIndicadores();
    return;
  }

  var datos = window.datosReales;
  var sinContacto = 0, sinEmail = 0, sinTelefono = 0, saldoInvalido = 0, sinNombre = 0;
  var reEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  for (var i = 0; i < datos.length; i++) {
    var c = datos[i];
    var tel = (c.telefono || '').toString().trim();
    var email = (c.correo || '').toString().trim();
    var monto = parseFloat(c.prima || 0);
    var nombre = (c.asegurado || '').toString().trim();
    var telValido = tel.replace(/\D/g, '').length >= 8;
    var emailValido = email && reEmail.test(email.toLowerCase());
    if (!telValido && !emailValido) sinContacto++;
    if (!emailValido) sinEmail++;
    if (!telValido) sinTelefono++;
    if (isNaN(monto) || monto <= 0) saldoInvalido++;
    if (!nombre || nombre === '?' || nombre.length < 3) sinNombre++;
  }

  var ids = {
    'count-sin-nombre': sinNombre,
    'count-sin-contacto': sinContacto,
    'count-sin-telefono': sinTelefono,
    'count-sin-email': sinEmail,
    'count-contacto-erroneo': sinTelefono,
    'count-saldo-incorrecto': saldoInvalido,
    'count-saldo-invalido': saldoInvalido,
    'count-no-responde': 0,
    'count-no-responde-mora': 0
  };

  Object.keys(ids).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.textContent = '(' + ids[id] + ')';
  });

  // Contadores sospechosos
  if (window.contarSospechosos) {
    var sosp = window.contarSospechosos();
    var elTel = document.getElementById('count-tel-sospechosos');
    var elEmail = document.getElementById('count-email-sospechosos');
    if (elTel) elTel.textContent = '(' + sosp.tel + ')';
    if (elEmail) elEmail.textContent = '(' + sosp.email + ')';
  }

  console.log('✅ Contadores actualizados');
};

console.log('✅ noa_init.js v5 listo');
