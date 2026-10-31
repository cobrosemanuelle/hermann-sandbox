window.CONTADOR_ENVIOS_WA = {};
window.CONTADOR_ENVIOS_EMAIL = {};

// Convierte DD/MM/YYYY (formato de desde_cobro) a Date. Si ya es ISO, tambien funciona.
function _parseFechaCiclo(v) {
  if (!v) return null;
  const s = String(v);
  if (s.includes('/')) {
    const p = s.split('/');
    if (p.length === 3) return new Date(p[2], p[1] - 1, p[0]);
    return null;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

window.cargarContadorEnvios = async function() {
  try {
    const resp = await fetch('/api/envios?action=contador');
    const datos = await resp.json();
    if (!resp.ok || !datos || !datos.success) return;
    const data = datos.envios || [];

    // Mapa cliente_id -> fecha de inicio del ciclo actual (desde_cobro), para no contar envios de ciclos ya pagados.
    const inicioCiclo = {};
    (window.datosReales || []).forEach(function(r) {
      if (r.id && r.desde_cobro) inicioCiclo[String(r.id)] = _parseFechaCiclo(r.desde_cobro);
    });

    const conteoWA = {};
    const conteoEmail = {};
    data.forEach(function(row) {
      if (!row.cliente_id) return;
      const inicio = inicioCiclo[String(row.cliente_id)];
      if (inicio) {
        const fechaEnvio = new Date(row.fecha);
        if (fechaEnvio < inicio) return; // envio de un ciclo ya pagado, no cuenta
      }
      if (row.canal === 'whatsapp') conteoWA[row.cliente_id] = (conteoWA[row.cliente_id] || 0) + 1;
      else if (row.canal === 'email') conteoEmail[row.cliente_id] = (conteoEmail[row.cliente_id] || 0) + 1;
    });
    window.CONTADOR_ENVIOS_WA = conteoWA;
    window.CONTADOR_ENVIOS_EMAIL = conteoEmail;
    if (typeof window.renderizarCartera === 'function') window.renderizarCartera();
  } catch (e) {
    console.error('No se pudo cargar el contador de envios:', e.message);
  }
};

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() { window.cargarContadorEnvios(); }, 3500);
});

console.log('noa_contador_envios.js cargado');
