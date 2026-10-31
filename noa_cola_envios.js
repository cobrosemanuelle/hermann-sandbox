window.iniciarColaEnvioWA = async function() {
  try {
    const checkboxes = document.querySelectorAll(".cliente-checkbox:checked");
    if (checkboxes.length === 0) { alert("Selecciona al menos un cliente"); return; }
    const user = await getUserNOA();
    if (!user) { alert("Inicia sesion"); return; }

    const ids = Array.from(checkboxes).map(cb => cb.dataset.id).filter(Boolean);
    const clientesValidos = ids
      .map(id => (window.datosReales || []).find(r => r.id === id))
      .filter(r => r && r.telefono);

    if (clientesValidos.length === 0) { alert("Los clientes seleccionados no tienen telefono"); return; }

    const confirmar = confirm('Vas a agregar ' + clientesValidos.length + ' clientes a la cola de envio de WhatsApp.\n\nEl sistema los ira mandando automaticamente segun el limite diario configurado, sin que tengas que volver a seleccionarlos.\n\n¿Continuar?');
    if (!confirmar) return;

    const filas = clientesValidos.map(c => ({
      user_id: user.id,
      cliente_id: c.id,
      estado: 'pendiente'
    }));

    const { error } = await window.supabaseClient.from('cola_envios_wa').insert(filas);
    if (error) { alert('Error al guardar la cola: ' + error.message); return; }

    alert('✅ ' + clientesValidos.length + ' clientes agregados a la cola. El envio se ira haciendo automaticamente respetando el limite diario.');
  } catch (e) {
    alert('Error: ' + e.message);
  }
};

console.log('noa_cola_envios.js cargado');
