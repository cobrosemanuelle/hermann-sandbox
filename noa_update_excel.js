// Módulo de Actualización desde Excel - NOA V6
// Usa el normalizador inteligente — funciona con cualquier formato de Excel del corredor

window.actualizarDesdeExcel = async function(file) {
  if (!file) { alert('Por favor seleccioná un archivo Excel'); return; }

  // Mostrar notificación de inicio
  if (window.mostrarNotificacion) window.mostrarNotificacion('🔄 Actualizando datos desde Excel...', 'info');

  const quitarOverlay = () => {}; // ya no necesitamos quitar nada

  try {
    // 1. Leer el archivo con el mismo parser que el cargador principal
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(new Uint8Array(buf), { type: 'array', cellFormula: false });

    // Buscar hoja correcta igual que el cargador
    let sheetName = wb.SheetNames.find(n =>
      n.toLowerCase().includes('consolidado') || n.toLowerCase().includes('notificacion')
    );
    if (!sheetName) sheetName = wb.SheetNames[0];
    console.log('[NOA UPDATE] Hoja:', sheetName);

    const sh = wb.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sh, { defval: '' });

    if (rawData.length === 0) { alert('El archivo está vacío'); return; }

    // 2. Normalizar con el mismo normalizador del cargador
    const normalizarLote = window.normalizarLote;
    if (!normalizarLote) { alert('Error: normalizador no cargado'); return; }

    const normalizados = normalizarLote(rawData.map(r => {
      const o = {};
      Object.keys(r).forEach(k => { o[k] = String(r[k] === null || r[k] === undefined ? '' : r[k]).trim(); });
      return o;
    }));

    console.log('[NOA UPDATE] Normalizados:', normalizados.length);

    // 3. Obtener clientes existentes de Supabase para buscar por póliza
    const { data: existentes } = await window.supabaseClient
      .from('clientes')
      .select('id, poliza')
      .eq('user_id', (await window.supabaseClient.auth.getUser()).data.user.id);

    const polizaToId = {};
    (existentes || []).forEach(c => { polizaToId[c.poliza] = c.id; });

    // 4. Actualizar SOLO campos estáticos — NO tocar fechas ni pagado
    let actualizados = 0, nuevos = 0, sinMatch = 0;

    for (const c of normalizados) {
      const id = polizaToId[c.poliza];

      if (id) {
        // Existe → UPDATE solo datos estáticos
        const datosUpdate = {};
        if (c.asegurado)    datosUpdate.asegurado    = c.asegurado;
        if (c.telefono)     datosUpdate.telefono      = c.telefono;
        if (c.correo)       datosUpdate.correo        = c.correo;
        if (c.prima)        datosUpdate.prima         = parseFloat(c.prima || 0);
        if (c.moneda)       datosUpdate.moneda        = c.moneda;
        if (c.aseguradora)  datosUpdate.aseguradora   = c.aseguradora;
        if (c.tipo_seguro)  datosUpdate.tipo_seguro   = c.tipo_seguro;
        if (c.placa)        datosUpdate.placa         = c.placa;
        if (c.fecha_limite_pago) datosUpdate.fecha_limite_pago = c.fecha_limite_pago;
        if (c.periodo_gracia)    datosUpdate.periodo_gracia    = c.periodo_gracia;

        if (Object.keys(datosUpdate).length > 0) {
          const { error } = await window.supabaseClient
            .from('clientes').update(datosUpdate).eq('id', id);
          if (!error) actualizados++; else console.warn('Error update:', error);
        }
      } else {
        const user = (await window.supabaseClient.auth.getUser()).data.user;
        const datosNuevo = {
          user_id: user.id,
          asegurado: c.asegurado || "",
          identificacion: c.identificacion || "",
          poliza: c.poliza,
          telefono: c.telefono || "",
          correo: c.correo || "",
          periodicidad: c.periodicidad || "",
          desde: c.desde || "",
          hasta: c.hasta || "",
          desde_cobro: c.desde_cobro || "",
          vence_contrato: c.vence_contrato || "",
          moneda: c.moneda || "CRC",
          placa: c.placa || "",
          aseguradora: c.aseguradora || "",
          tipo_seguro: c.tipo_seguro || "",
          marca: c.marca || "",
          modelo: c.modelo || "",
          anio: c.anio || "",
          prima: parseFloat(c.prima || 0),
          fecha_limite_pago: c.fecha_limite_pago || "",
          periodo_gracia: c.periodo_gracia || "",
        };
        const { error: errInsert } = await window.supabaseClient.from('clientes').insert([datosNuevo]);
        if (!errInsert) { nuevos++; polizaToId[c.poliza] = true; }
        else { sinMatch++; console.warn('[NOA UPDATE] Error insertando nuevo:', c.poliza, errInsert.message); }
      }
    }

    // 5. Recargar datos
    if (window.cargarClientesSupabase) await window.cargarClientesSupabase();
    if (window.actualizarDashboardCompleto) window.actualizarDashboardCompleto();

    if (window.mostrarNotificacion) {
      window.mostrarNotificacion('✅ ' + actualizados + ' actualizados | ' + nuevos + ' nuevos agregados' + (sinMatch > 0 ? ' | ⚠️ ' + sinMatch + ' con error' : ''), 'success');
    }

  } catch(err) {
    console.error('[NOA UPDATE] Error:', err);
    if (window.mostrarNotificacion) window.mostrarNotificacion('❌ Error al actualizar: ' + err.message, 'error');
  }
};

window.mostrarDialogoActualizarExcel = function() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx,.xlsm,.xls,.csv';
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (file) window.actualizarDesdeExcel(file);
  };
  input.click();
};

console.log('✅ noa_update_excel.js cargado (v2 con normalizador)');
