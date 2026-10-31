/*NOA_CFG_SERVIDOR*/
// Datos del corredor (nombre, WhatsApp, correo, agencia): se guardan en el servidor para toda la oficina
// y se copian a este navegador porque otras partes del sistema los leen de ahí.
// Los nombres de las funciones se dejan igual porque las llama la pantalla de Configuración.
(function () {
  var IDS = { nombre: 'nombreCorrector', whatsapp: 'whatsappCorrector', email: 'emailCorrector', agencia: 'agenciaCorrector' };
  var LS = { nombre: 'sistemaV5_nombreCorrector', whatsapp: 'sistemaV5_whatsappCorrector', email: 'sistemaV5_emailCorrector', agencia: 'sistemaV5_agenciaCorrector' };
  function valor(id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; }
  function copiar(c) {
    try {
      Object.keys(LS).forEach(function (k) { localStorage.setItem(LS[k], c[k] || ''); });
      localStorage.setItem('sistemaV5_nombreAgencia', c.agencia || '');
    } catch (e) {}
  }
  window.guardarConfigCorredorSupabase = async function () {
    try {
      var c = { nombre: valor(IDS.nombre), whatsapp: valor(IDS.whatsapp), email: valor(IDS.email), agencia: valor(IDS.agencia) };
      await window.noaConfigServidor.guardar({ corredor: c });
      copiar(c);
      return true;
    } catch (e) { console.error('No se pudieron guardar los datos del corredor:', e); return false; }
  };
  window.cargarConfigCorredorSupabase = async function () {
    try {
      var j = await window.noaConfigServidor.leer(); var c = j.corredor;
      if (!c) return null;
      Object.keys(IDS).forEach(function (k) { var e = document.getElementById(IDS[k]); if (e && c[k]) e.value = c[k]; });
      copiar(c);
      return c;
    } catch (e) { console.error('No se pudieron cargar los datos del corredor:', e); return null; }
  };
  document.addEventListener('DOMContentLoaded', function () { setTimeout(function () { window.cargarConfigCorredorSupabase(); }, 3000); });
})();
