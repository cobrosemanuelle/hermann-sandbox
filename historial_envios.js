// Funciones para gestionar historial de envíos (datos en Neon, por /api/envios)

const API_ENVIOS = '/api/envios';

function escEnvio(t) {
  return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatearFechaEnvio(valor) {
  if (!valor) return 'N/A';
  var d = new Date(valor);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString('es-CR', { timeZone: 'America/Costa_Rica' });
}

async function pedirEnvios(url, opciones) {
  const resp = await fetch(url, opciones);
  let datos = null;
  try { datos = await resp.json(); } catch (e) { datos = null; }
  if (!resp.ok || !datos || datos.success === false) throw new Error((datos && datos.error) || ('Error ' + resp.status));
  return datos;
}

async function guardarEnvio(clienteId, clienteNombre, tipoEnvio, canal, mensaje, origen) {
  try {
    const user = (typeof getUserNOA === 'function') ? await getUserNOA() : null;
    const origenLabel = origen || 'manual';
    await pedirEnvios(API_ENVIOS + '?action=guardar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user ? user.id : '',
        cliente_id: String(clienteId),
        cliente_nombre: clienteNombre,
        tipo_envio: tipoEnvio,
        canal: canal,
        estado: (tipoEnvio === 0 || (mensaje && mensaje.includes('[FALLIDO'))) ? 'fallido' : 'enviado',
        mensaje: '[' + origenLabel.toUpperCase() + '] ' + mensaje
      })
    });
    if (typeof window.cargarContadorEnvios === 'function') window.cargarContadorEnvios();
    return { success: true, data: null };
  } catch (error) {
    console.error('Error guardando envío:', error);
    return { success: false, error: error };
  }
}

async function cargarTodosLosEnvios() {
  try {
    const datos = await pedirEnvios(API_ENVIOS + '?action=todos');
    return datos.envios || [];
  } catch (error) {
    console.error('Error cargando envíos:', error);
    return [];
  }
}

async function obtenerHistorialCliente(clienteId) {
  try {
    const datos = await pedirEnvios(API_ENVIOS + '?action=cliente&cliente_id=' + encodeURIComponent(clienteId));
    return { success: true, data: datos.envios || [] };
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    return { success: false, data: [] };
  }
}

window.filtrarHistorial = async function(filtro) {
  filtro = filtro || 'todos';
  console.log('Filtrando historial:', filtro);

  var envios = await cargarTodosLosEnvios();
  console.log('Envíos cargados:', envios.length);

  if (filtro === 'email') {
    envios = envios.filter(function(e) { return e.canal === 'email'; });
  } else if (filtro === 'whatsapp') {
    envios = envios.filter(function(e) { return e.canal === 'whatsapp'; });
  } else if (filtro === 'exitoso') {
    envios = envios.filter(function(e) { return e.estado === 'enviado'; });
  } else if (filtro === 'fallido') {
    envios = envios.filter(function(e) { return e.estado === 'fallido'; });
  }

  var tbody = document.getElementById('historial-tbody');
  if (!tbody) {
    console.error('No se encontró historial-tbody');
    return;
  }

  if (envios.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#94A3B8;">📭 No hay envíos para este filtro</td></tr>';
    return;
  }

  window._ENVIOS_TABLA = envios;
  var html = '';
  envios.forEach(function(e, i) {
    var fecha = formatearFechaEnvio(e.fecha_envio);
    var icono = e.canal === 'whatsapp' ? '📱' : '📧';
    var estadoColor = e.estado === 'enviado' ? '#10B981' : '#EF4444';
    var estadoTexto = e.estado === 'enviado' ? '✅ Enviado' : '❌ Fallido';
    var msg = e.mensaje || '';
    var origenTexto = msg.startsWith('[MASIVO]') ? '📦 Masivo' : (msg.startsWith('[AUTOMATICO]') ? '🤖 Automático' : '👤 Manual');
    var mensajeCorto = msg.substring(0, 50);

    html += '<tr style="border-bottom:1px solid #334155;">';
    html += '<td style="padding:12px;color:#fff;">' + escEnvio(fecha) + '</td>';
    html += '<td style="padding:12px;color:#fff;">' + escEnvio(e.cliente_nombre || 'N/A') + '</td>';
    html += '<td style="padding:12px;color:#fff;">' + icono + ' ' + escEnvio(e.canal || 'N/A') + '</td>';
    html += '<td style="padding:12px;color:#fff;">' + escEnvio(e.cliente_nombre || 'N/A') + '</td>';
    html += '<td style="padding:12px;color:' + estadoColor + ';">' + estadoTexto + '</td>';
    html += '<td style="padding:12px;color:#fff;">' + origenTexto + '</td>';
    html += '<td style="padding:12px;color:#94A3B8;max-width:200px;cursor:pointer;text-decoration:underline dotted;" onclick="window.verMensajeEnvio(' + i + ')" title="Click para ver el mensaje completo">' + escEnvio(mensajeCorto) + (mensajeCorto.length >= 50 ? '...' : '') + '</td>';
    html += '</tr>';
  });

  tbody.innerHTML = html;
  console.log('Historial renderizado: ' + envios.length + ' envíos');
};

window.guardarEnvio = guardarEnvio;
window.cargarTodosLosEnvios = cargarTodosLosEnvios;
window.obtenerHistorialCliente = obtenerHistorialCliente;

console.log('historial_envios.js cargado OK');

// ========== FILTROS POR COLUMNA ==========
window.filtrarHistorialPorColumna = function() {
  var filtroFecha = (document.getElementById('filtro-fecha')?.value || '').toLowerCase();
  var filtroCliente = (document.getElementById('filtro-cliente')?.value || '').toLowerCase();
  var filtroTipo = (document.getElementById('filtro-tipo')?.value || '').toLowerCase();
  var filtroDestinatario = (document.getElementById('filtro-destinatario')?.value || '').toLowerCase();
  var filtroEstado = (document.getElementById('filtro-estado')?.value || '').toLowerCase();
  var filtroOrigen = (document.getElementById('filtro-origen')?.value || '').toLowerCase();
  var filtroDetalles = (document.getElementById('filtro-detalles')?.value || '').toLowerCase();

  var tbody = document.getElementById('historial-tbody');
  if (!tbody) return;

  var filas = tbody.getElementsByTagName('tr');
  for (var i = 0; i < filas.length; i++) {
    var celdas = filas[i].getElementsByTagName('td');
    if (celdas.length < 7) continue;

    var fecha = (celdas[0]?.textContent || '').toLowerCase();
    var cliente = (celdas[1]?.textContent || '').toLowerCase();
    var tipo = (celdas[2]?.textContent || '').toLowerCase();
    var destinatario = (celdas[3]?.textContent || '').toLowerCase();
    var estado = (celdas[4]?.textContent || '').toLowerCase();
    var origen = (celdas[5]?.textContent || '').toLowerCase();
    var detalles = (celdas[6]?.textContent || '').toLowerCase();

    var mostrar = fecha.includes(filtroFecha) &&
                  cliente.includes(filtroCliente) &&
                  tipo.includes(filtroTipo) &&
                  destinatario.includes(filtroDestinatario) &&
                  estado.includes(filtroEstado) &&
                  origen.includes(filtroOrigen) &&
                  detalles.includes(filtroDetalles);

    filas[i].style.display = mostrar ? '' : 'none';
  }
};

// ========== EXPORTAR A EXCEL ==========
window.exportarHistorialExcel = function() {
  var tbody = document.getElementById('historial-tbody');
  if (!tbody) {
    alert('No hay datos para exportar');
    return;
  }

  var filas = tbody.getElementsByTagName('tr');
  var datos = [];

  // Encabezados
  datos.push(['Fecha/Hora', 'Cliente', 'Tipo', 'Destinatario', 'Estado', 'Origen', 'Detalles']);

  for (var i = 0; i < filas.length; i++) {
    if (filas[i].style.display === 'none') continue;
    var celdas = filas[i].getElementsByTagName('td');
    if (celdas.length < 7) continue;

    datos.push([
      celdas[0]?.textContent || '',
      celdas[1]?.textContent || '',
      celdas[2]?.textContent || '',
      celdas[3]?.textContent || '',
      celdas[4]?.textContent || '',
      celdas[5]?.textContent || '',
      celdas[6]?.textContent || ''
    ]);
  }

  if (datos.length <= 1) {
    alert('No hay datos visibles para exportar');
    return;
  }

  // Crear libro Excel
  var wb = XLSX.utils.book_new();
  var ws = XLSX.utils.aoa_to_sheet(datos);

  // Ajustar ancho de columnas
  ws['!cols'] = [
    {wch: 18}, {wch: 25}, {wch: 12}, {wch: 25}, {wch: 12}, {wch: 10}, {wch: 30}
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Historial Envios');

  // Descargar
  var filename = 'historial_envios_' + new Date().toISOString().slice(0,10) + '.xlsx';
  XLSX.writeFile(wb, filename);

  console.log('✅ Excel exportado: ' + (datos.length - 1) + ' registros');
};

console.log('✅ Filtros y Export Excel XLSX cargados');

// Función para abrir historial desde dashboard
window.abrirHistorialEnvios = function() {
    // Cambiar al tab de historial directamente
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    const historialTab = document.getElementById('historial');
    if (historialTab) historialTab.classList.add('active');

    // Cargar y renderizar los envíos
    setTimeout(() => {
        if (typeof window.filtrarHistorial === 'function') {
            window.filtrarHistorial('todos');
        }
    }, 300);
};

console.log('✅ abrirHistorialEnvios agregado');

window.verMensajeCompleto = function(mensaje, cliente, fecha) {
  var mensajeReal = String(mensaje || '').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
  alert('📨 Mensaje enviado a: ' + cliente + '\n📅 ' + fecha + '\n\n' + mensajeReal);
};

window.verMensajeEnvio = function(i) {
  var e = (window._ENVIOS_TABLA || [])[i];
  if (!e) return;
  window.verMensajeCompleto(e.mensaje || '', e.cliente_nombre || '', formatearFechaEnvio(e.fecha_envio));
};
