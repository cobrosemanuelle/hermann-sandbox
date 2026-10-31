const API_BASE = '/api/clientes';

const CAMPOS_FECHA = ['desde', 'hasta', 'desde_cobro', 'vence_contrato', 'fecha_limite_pago'];

function convertirDDMMaISO(fecha) {
  if (!fecha) return "";
  const f = String(fecha).trim();
  if (f.includes('/')) {
    const [dd, mm, yyyy] = f.split('/');
    if (dd && mm && yyyy && yyyy.length === 4) return `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
  }
  return f;
}

function detectarColumnaFecha(cliente, tipo) {
  if (tipo === "desde") {
    if (cliente["Fecha Desde"] !== undefined) return cliente["Fecha Desde"];
    if (cliente["Fecha Desde "] !== undefined) return cliente["Fecha Desde "];
  } else {
    if (cliente["Fecha Hasta"] !== undefined) return cliente["Fecha Hasta"];
    if (cliente["Fecha Hasta "] !== undefined) return cliente["Fecha Hasta "];
  }
  const palabrasDesde = ["vigencia desde", "fecha inicio", "inicio", "fec desde", "vigdesde"];
  const palabrasHasta = ["vigencia hasta", "fecha fin", "vencimiento", "fec hasta", "vighasta"];
  const palabras = tipo === "desde" ? palabrasDesde : palabrasHasta;
  for (const key of Object.keys(cliente)) {
    const keyLower = key.toLowerCase().trim();
    for (const palabra of palabras) {
      if (keyLower === palabra || keyLower.includes(palabra)) return cliente[key];
    }
  }
  return null;
}

function convertirFechaExcel(valor) {
  if (!valor) return null;
  if (typeof valor === 'string' && valor.includes('-')) return valor;
  if (typeof valor === 'number') {
    const fecha = new Date((valor - 25569) * 86400 * 1000);
    return fecha.toISOString().split('T')[0];
  }
  return null;
}

// Neon entrega el id como numero; toda la pantalla lo compara como texto.
function idATexto(c) {
  return Object.assign({}, c, { id: String(c.id) });
}

// Fechas vacias -> null, fechas DD/MM/YYYY -> ISO, prima vacia -> no se envia.
function limpiarCambios(cambios) {
  const limpio = {};
  Object.keys(cambios || {}).forEach(function (k) {
    let v = cambios[k];
    if (CAMPOS_FECHA.indexOf(k) !== -1) {
      v = convertirDDMMaISO(v);
      limpio[k] = v ? v : null;
      return;
    }
    if (k === 'prima') {
      if (v === '' || v === null || v === undefined || isNaN(Number(v))) return;
      limpio[k] = Number(v);
      return;
    }
    limpio[k] = v;
  });
  return limpio;
}

async function guardarClientesSupabase(clientes) {
  try {
    const user = await getUserNOA();
    if (!user) throw new Error("No autenticado");
    const clientesFormateados = clientes.map(c => ({
      ...c,
      desde: convertirDDMMaISO(c.desde),
      hasta: convertirDDMMaISO(c.hasta),
      desde_cobro: convertirDDMMaISO(c.desde_cobro),
      vence_contrato: convertirDDMMaISO(c.vence_contrato),
      fecha_limite_pago: convertirDDMMaISO(c.fecha_limite_pago),
    }));
    const resp = await fetch(`${API_BASE}?action=guardar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, clientes: clientesFormateados })
    });
    const result = await resp.json();
    console.log('✅ Guardado:', result.actualizados, 'actualizados,', result.nuevos, 'nuevos,', (result.fallidos || []).length, 'fallidos');
    return result;
  } catch (error) {
    console.error("Error guardando:", error);
    return { success: false, error: error.message };
  }
}

async function cargarClientesSupabase() {
  try {
    const user = await getUserNOA();
    if (!user) throw new Error('No autenticado');
    const resp = await fetch(`${API_BASE}?user_id=${encodeURIComponent(user.id)}`);
    const result = await resp.json();
    if (!result.success) throw new Error(result.error);
    return { success: true, clientes: (result.clientes || []).map(idATexto) };
  } catch (error) {
    console.error('Error cargando:', error);
    return { success: false, error: error.message };
  }
}

async function actualizarClienteSupabase(clienteId, cambios) {
  try {
    const limpio = limpiarCambios(cambios);
    if (Object.keys(limpio).length === 0) return { success: true };
    const resp = await fetch(`${API_BASE}?action=actualizar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: clienteId, cambios: limpio })
    });
    const result = await resp.json();
    if (!result.success) throw new Error(result.error);
    if (typeof limpiarTodosLosIndicadores === "function") limpiarTodosLosIndicadores();
    return { success: true };
  } catch (error) {
    console.error('Error actualizando:', error);
    return { success: false, error: error.message };
  }
}

async function marcarPagadoSupabase(clienteId) {
  try {
    const user = await getUserNOA();
    const resp = await fetch(`${API_BASE}?action=marcar-pagado`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: clienteId, user_id: user.id })
    });
    const result = await resp.json();
    if (!result.success) throw new Error(result.error);
    if (typeof limpiarTodosLosIndicadores === "function") limpiarTodosLosIndicadores();
    return { success: true };
  } catch (error) {
    console.error("Error marcando pagado:", error);
    return { success: false, error: error.message };
  }
}

async function limpiarClientesSupabase() {
  try {
    const user = await getUserNOA();
    if (!user) throw new Error('No autenticado');
    const resp = await fetch(`${API_BASE}?action=limpiar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id })
    });
    const result = await resp.json();
    if (!result.success) throw new Error(result.error);
    if (typeof limpiarTodosLosIndicadores === "function") limpiarTodosLosIndicadores();
    return { success: true };
  } catch (error) {
    console.error('Error limpiando:', error);
    return { success: false, error: error.message };
  }
}

async function borrarClienteSupabase(clienteId) {
  try {
    const resp = await fetch(`${API_BASE}?action=borrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: clienteId })
    });
    const result = await resp.json();
    if (!result.success) throw new Error(result.error);
    return { success: true };
  } catch (error) {
    console.error('Error archivando:', error);
    return { success: false, error: error.message };
  }
}

async function cargarClientesBorrados() {
  try {
    const user = await getUserNOA();
    if (!user) throw new Error('No autenticado');
    const resp = await fetch(`${API_BASE}?action=borrados&user_id=${encodeURIComponent(user.id)}`);
    const result = await resp.json();
    if (!result.success) throw new Error(result.error);
    return { success: true, clientes: (result.clientes || []).map(idATexto) };
  } catch (error) {
    console.error('Error cargando borrados:', error);
    return { success: false, error: error.message };
  }
}

async function restaurarClienteSupabase(clienteId) {
  try {
    const resp = await fetch(`${API_BASE}?action=restaurar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: clienteId })
    });
    const result = await resp.json();
    if (!result.success) throw new Error(result.error);
    return { success: true };
  } catch (error) {
    console.error('Error restaurando:', error);
    return { success: false, error: error.message };
  }
}

window.guardarClientesSupabase = guardarClientesSupabase;
window.cargarClientesSupabase = cargarClientesSupabase;
window.actualizarClienteSupabase = actualizarClienteSupabase;
window.marcarPagadoSupabase = marcarPagadoSupabase;
window.limpiarClientesSupabase = limpiarClientesSupabase;
window.borrarClienteSupabase = borrarClienteSupabase;
window.cargarClientesBorrados = cargarClientesBorrados;
window.restaurarClienteSupabase = restaurarClienteSupabase;
