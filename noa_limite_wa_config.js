/*NOA_LIMITE_API*/
window.LIMITE_WA_DEFAULT = 50;

// Pausa entre WhatsApp de un envio masivo: alrededor de 1 minuto (entre 50 y 70 segundos, para que no sea un ritmo exacto)
window.noaPausaWA = function() { return 50000 + Math.floor(Math.random() * 20001); };

// Cuantos WhatsApp exitosos hay en el dia de "ahora" (hora de la computadora)
window.noaContarWAHoy = function(envios, ahora) {
  var d0 = new Date(ahora); d0.setHours(0, 0, 0, 0);
  var d1 = new Date(d0.getTime()); d1.setDate(d1.getDate() + 1);
  return (envios || []).filter(function(e) {
    if (!e || e.canal !== 'whatsapp') return false;
    var f = new Date(e.fecha); return !isNaN(f.getTime()) && f >= d0 && f < d1;
  }).length;
};

// Ids de clientes que ya recibieron WhatsApp hoy (para no repetir envios al reabrir el panel)
window.noaIdsWAHoy = function(envios, ahora) {
  var d0 = new Date(ahora); d0.setHours(0, 0, 0, 0);
  var d1 = new Date(d0.getTime()); d1.setDate(d1.getDate() + 1);
  var ids = {};
  (envios || []).forEach(function(e) {
    if (!e || e.canal !== 'whatsapp' || e.cliente_id == null) return;
    var f = new Date(e.fecha); if (!isNaN(f.getTime()) && f >= d0 && f < d1) ids[String(e.cliente_id)] = true;
  });
  return ids;
};

window.cargarLimiteWA = async function() {
  try {
    var r = await fetch('/api/envios?action=limite');
    var j = await r.json();
    window.LIMITE_DIARIO_WA_CONFIG = (j && j.limite_diario_wa) ? j.limite_diario_wa : window.LIMITE_WA_DEFAULT;
  } catch (e) {
    window.LIMITE_DIARIO_WA_CONFIG = window.LIMITE_WA_DEFAULT;
  }
  var el = document.getElementById('limite-wa-input');
  if (el) el.value = window.LIMITE_DIARIO_WA_CONFIG;
};

window.guardarLimiteWA = async function() {
  try {
    var val = parseInt(document.getElementById('limite-wa-input').value, 10) || window.LIMITE_WA_DEFAULT;
    if (val < 1 || val > 1000) { alert('Ingresa un numero entre 1 y 1000'); return; }
    var r = await fetch('/api/envios?action=limite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ limite_diario_wa: val }) });
    var j = await r.json();
    if (!r.ok || !j.success) { alert('No se pudo guardar: ' + ((j && j.error) || r.status)); return; }
    window.LIMITE_DIARIO_WA_CONFIG = val;
    alert('Limite diario de WhatsApp guardado: ' + val);
  } catch (e) {
    alert('Error: ' + e.message);
  }
};

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() { window.cargarLimiteWA(); }, 3000);
});

console.log('noa_limite_wa_config.js cargado');
