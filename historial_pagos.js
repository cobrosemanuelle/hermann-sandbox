// Módulo de Historial de Pagos - NOA V6 (datos en Neon vía /api/pagos)

function calcularDiasMora(hasta, fechaPago) {
  try {
    const partsHasta = hasta.split('/');
    const partsPago = fechaPago.split('/');
    
    if (partsHasta.length !== 3 || partsPago.length !== 3) return 0;
    
    const dateHasta = new Date(partsHasta[2], partsHasta[1]-1, partsHasta[0]);
    const datePago = new Date(partsPago[2], partsPago[1]-1, partsPago[0]);
    
    const diffTime = datePago - dateHasta;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  } catch(e) {
    console.error('Error calculando mora:', e);
    return 0;
  }
}

window.guardarPago = async function(datosPago) {
  try {
    console.log('💰 Guardando pago:', datosPago);

    const user = await getUserNOA();
    if (!user?.id) {
      throw new Error('Usuario no autenticado');
    }

    if (!datosPago.cliente_id) throw new Error('cliente_id requerido');
    if (!datosPago.poliza) datosPago.poliza = datosPago.cliente_id || 'SIN-POLIZA';

    const resp = await fetch('/api/pagos?action=guardar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        cliente_id: String(datosPago.cliente_id),
        poliza: datosPago.poliza,
        cliente_nombre: datosPago.cliente_nombre || 'Cliente',
        periodo_desde: datosPago.periodo_desde,
        periodo_hasta: datosPago.periodo_hasta,
        monto_pagado: Number(datosPago.monto_pagado) || 0,
        moneda: datosPago.moneda || 'CRC',
        fecha_pago: datosPago.fecha_pago,
        dias_mora: datosPago.dias_mora || 0,
        metodo_pago: datosPago.metodo_pago || 'manual'
      })
    });
    const result = await resp.json();
    if (!result.success) throw new Error(result.error);

    console.log('✅ Pago guardado en historial');
    return { success: true };

  } catch(error) {
    console.error('❌ Error guardando pago:', error);
    return { success: false, error: error.message };
  }
};

window.obtenerHistorialPagos = async function(clienteId) {
  try {
    if (!clienteId) {
      throw new Error('clienteId requerido');
    }

    const resp = await fetch('/api/pagos?cliente_id=' + encodeURIComponent(clienteId));
    const result = await resp.json();
    if (!result.success) throw new Error(result.error);

    console.log('📊 Historial de pagos obtenido:', result.pagos);
    return { success: true, data: result.pagos };

  } catch(error) {
    console.error('❌ Error obteniendo historial:', error);
    return { success: false, error: error.message, data: [] };
  }
};

window.verHistorialPagos = async function(clienteId) {
  const cliente = (window.datosReales || []).find(c => c.id === clienteId) ||
                  (window.datosReales || []).find(c => String(c.id) === String(clienteId));
  if (!cliente) {
    alert('Cliente no encontrado');
    return;
  }
  
  const result = await window.obtenerHistorialPagos(clienteId);
  
  if (!result.success) {
    alert('Error obteniendo historial: ' + result.error);
    return;
  }
  
  const pagos = result.data || [];
  
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:10000;display:flex;justify-content:center;align-items:center;';
  
  const panel = document.createElement('div');
  panel.style.cssText = 'background:#1F2937;border-radius:16px;width:90%;max-width:800px;max-height:80vh;overflow-y:auto;padding:30px;';
  
  let html = `
    <div style="display:flex;justify-content:space-between;margin-bottom:20px;">
      <h2 style="color:#fff;margin:0;">💰 Historial de Pagos</h2>
      <button onclick="this.closest('[style*=fixed]').remove()" 
              style="background:#EF4444;color:#fff;border:none;padding:10px 15px;border-radius:8px;cursor:pointer;">✕</button>
    </div>
    
    <div style="background:#111827;padding:15px;border-radius:8px;margin-bottom:20px;">
      <div style="color:#10B981;font-weight:600;font-size:18px;">${cliente.asegurado}</div>
      <div style="color:#CBD5E1;margin-top:5px;">Póliza: ${cliente.poliza}</div>
      <div style="color:#94A3B8;margin-top:5px;">Total de pagos: ${pagos.length}</div>
    </div>
  `;
  
  if (pagos.length === 0) {
    html += `
      <div style="text-align:center;padding:40px;color:#94A3B8;">
        <div style="font-size:48px;margin-bottom:10px;">📭</div>
        <div>No hay pagos registrados</div>
      </div>
    `;
  } else {
    html += '<div style="display:flex;flex-direction:column;gap:10px;">';
    
    pagos.forEach((pago, i) => {
      let currency = pago.moneda || 'CRC';
      if (currency.toLowerCase().includes('colon')) currency = 'CRC';
      if (currency.toLowerCase().includes('dolar') || currency.toLowerCase().includes('dollar')) currency = 'USD';
      
      const montoFmt = new Intl.NumberFormat('es-CR', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2, maximumFractionDigits: 2
      }).format(pago.monto_pagado);
      
      const moraColor = pago.dias_mora > 0 ? '#F59E0B' : '#10B981';
      const moraText = pago.dias_mora > 0 ? `${pago.dias_mora} días de mora` : 'Puntual';
      
      html += `
        <div style="background:#111827;padding:15px;border-radius:8px;border-left:4px solid ${moraColor};">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="color:#fff;font-weight:600;font-size:16px;">${montoFmt}</div>
              <div style="color:#CBD5E1;font-size:13px;margin-top:5px;">
                Periodo: ${pago.periodo_desde} - ${pago.periodo_hasta}
              </div>
              <div style="color:#94A3B8;font-size:12px;margin-top:3px;">
                Pagado: ${pago.fecha_pago}
              </div>
            </div>
            <div style="text-align:right;">
              <div style="color:${moraColor};font-size:12px;font-weight:600;">${moraText}</div>
              <div style="color:#94A3B8;font-size:11px;margin-top:3px;">${pago.metodo_pago}</div>
            </div>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    
    const totalPagado = pagos.reduce((sum, p) => sum + Number(p.monto_pagado), 0);
    const totalMora = pagos.reduce((sum, p) => sum + (p.dias_mora || 0), 0);
    const promMora = pagos.length > 0 ? (totalMora / pagos.length).toFixed(1) : 0;
    
    let currency = pagos[0]?.moneda || 'CRC';
    if (currency.toLowerCase().includes('colon')) currency = 'CRC';
    if (currency.toLowerCase().includes('dolar')) currency = 'USD';
    
    const totalFmt = new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(totalPagado);
    
    html += `
      <div style="background:#111827;padding:15px;border-radius:8px;margin-top:20px;border-top:2px solid #0EA5E9;">
        <div style="display:flex;justify-content:space-around;text-align:center;">
          <div>
            <div style="color:#94A3B8;font-size:12px;">Total Pagado</div>
            <div style="color:#10B981;font-size:20px;font-weight:600;margin-top:5px;">${totalFmt}</div>
          </div>
          <div>
            <div style="color:#94A3B8;font-size:12px;">Promedio Mora</div>
            <div style="color:#F59E0B;font-size:20px;font-weight:600;margin-top:5px;">${promMora} días</div>
          </div>
        </div>
      </div>
    `;
  }
  
  panel.innerHTML = html;
  modal.appendChild(panel);
  document.body.appendChild(modal);
};

console.log('✅ historial_pagos.js cargado');
