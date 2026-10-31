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
async function guardarClientesSupabase(clientes) {
  try {
    const user = await getUserNOA();
    if (!user) throw new Error("No autenticado");
    const { data: existentes, error: fetchError } = await supabaseClient.from("clientes").select("id, poliza").eq("user_id", user.id);
    if (fetchError) throw fetchError;
    const polizaToId = {};
    existentes.forEach(e => { polizaToId[e.poliza] = e.id; });
    let actualizados = 0, nuevos = 0;
    for (const c of clientes) {
      const datosCliente = {
        user_id: user.id,
        asegurado: c.asegurado || "",
        identificacion: c.identificacion || "",
        poliza: c.poliza || "",
        telefono: c.telefono || "",
        correo: c.correo || "",
        periodicidad: c.periodicidad || "",
        desde: c.desde || "",
        hasta: c.hasta || "",
        moneda: c.moneda || "CRC",
        placa: c.placa || "",
        aseguradora: c.aseguradora || "",
        prima: parseFloat(String(c.prima || 0).replace(",", ".")),
      };
      if (polizaToId[c.poliza]) {
        const { error } = await supabaseClient.from("clientes").update(datosCliente).eq("id", polizaToId[c.poliza]);
        if (error) throw error;
        actualizados++;
      } else {
        const { error } = await supabaseClient.from("clientes").insert([datosCliente]);
        if (error) throw error;
        nuevos++;
      }
    }
    console.log('✅ Guardado:', actualizados, 'actualizados,', nuevos, 'nuevos');
    return { success: true, actualizados, nuevos, total: clientes.length };
  } catch (error) {
    console.error("Error guardando:", error);
    return { success: false, error: error.message };
  }
}
async function cargarClientesSupabase() {
  try {
    const user = await getUserNOA();
    if (!user) throw new Error('No autenticado');
    const { data, error } = await supabaseClient.from('clientes').select('*').eq('user_id', user.id).or('borrado.is.null,borrado.eq.false').order('created_at', { ascending: false });
    if (error) throw error;
    return { success: true, clientes: data || [] };
  } catch (error) {
    console.error('Error cargando:', error);
    return { success: false, error: error.message };
  }
}
async function actualizarClienteSupabase(clienteId, cambios) {
  try {
    if (cambios.desde && cambios.desde.includes('/')) { const [dd, mm, yyyy] = cambios.desde.split('/'); cambios.desde = yyyy+'-'+mm+'-'+dd; }
    if (cambios.hasta && cambios.hasta.includes('/')) { const [dd, mm, yyyy] = cambios.hasta.split('/'); cambios.hasta = yyyy+'-'+mm+'-'+dd; }
    const { error } = await supabaseClient.from('clientes').update(cambios).eq('id', clienteId);
    if (error) throw error;
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
    const { data: cliente, error: fetchError } = await supabaseClient.from("clientes").select("*").eq("id", clienteId).single();
    if (fetchError) throw fetchError;
    const hastaActual = new Date(cliente.hasta);
    let hastaNuevo = new Date(hastaActual);
    const per = (cliente.periodicidad || "mensual").toLowerCase();
    if (per.includes("anual")) hastaNuevo.setFullYear(hastaNuevo.getFullYear() + 1);
    else if (per.includes("semes")) hastaNuevo.setMonth(hastaNuevo.getMonth() + 6);
    else if (per.includes("trimest")) hastaNuevo.setMonth(hastaNuevo.getMonth() + 3);
    else hastaNuevo.setMonth(hastaNuevo.getMonth() + 1);
    const { error: updateError } = await supabaseClient.from("clientes").update({ pagado: true, desde: cliente.hasta, hasta: hastaNuevo.toISOString().split("T")[0] }).eq("id", clienteId);
    if (updateError) throw updateError;
    const { error: historyError } = await supabaseClient.from("pagos_history").insert([{ user_id: user.id, cliente_id: clienteId, asegurado: cliente.asegurado, poliza: cliente.poliza, identificacion: cliente.identificacion, monto: cliente.prima, moneda: cliente.moneda, desde_anterior: cliente.desde, hasta_anterior: cliente.hasta, desde_nuevo: cliente.hasta, hasta_nuevo: hastaNuevo.toISOString().split("T")[0] }]);
    if (historyError) throw historyError;
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
    const { error } = await supabaseClient.from('clientes').delete().eq('user_id', user.id);
    if (error) throw error;
    if (typeof limpiarTodosLosIndicadores === "function") limpiarTodosLosIndicadores();
    return { success: true };
  } catch (error) {
    console.error('Error limpiando:', error);
    return { success: false, error: error.message };
  }
}
async function borrarClienteSupabase(clienteId) {
  try {
    const { error } = await supabaseClient.from('clientes').update({ borrado: true }).eq('id', clienteId);
    if (error) throw error;
    window.datosReales = (window.datosReales || []).filter(function(c) { return c.id !== clienteId; });
    if (typeof limpiarTodosLosIndicadores === "function") limpiarTodosLosIndicadores();
    return { success: true };
  } catch (error) {
    console.error('Error borrando:', error);
    return { success: false, error: error.message };
  }
}
async function cargarClientesBorrados() {
  try {
    const user = await getUserNOA();
    if (!user) throw new Error('No autenticado');
    const { data, error } = await supabaseClient.from('clientes').select('*').eq('user_id', user.id).eq('borrado', true).order('created_at', { ascending: false });
    if (error) throw error;
    return { success: true, clientes: data || [] };
  } catch (error) {
    console.error('Error cargando borrados:', error);
    return { success: false, error: error.message };
  }
}
async function restaurarClienteSupabase(clienteId) {
  try {
    const { error } = await supabaseClient.from('clientes').update({ borrado: false }).eq('id', clienteId);
    if (error) throw error;
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
