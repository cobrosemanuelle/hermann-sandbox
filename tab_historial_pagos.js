// Pestaña Historial de Pagos - NOA V6 (datos en Neon vía /api/pagos)

// Variable global para el mes seleccionado
window.mesPagosSeleccionado = null;

window.renderHistorialPagos = async function(mesAño) {
  const container = document.getElementById('historial-pagos-tab');
  if (!container) return;
  
  container.innerHTML = '<div style="text-align:center;padding:40px;color:#fff;">Cargando historial de pagos...</div>';
  
  try {
    const user = await getUserNOA();
    const resp = await fetch('/api/pagos?user_id=' + encodeURIComponent(user.id));
    const resultado = await resp.json();
    if (!resultado.success) throw new Error(resultado.error);
    const todosPagos = resultado.pagos || [];
    
    // Si no hay mes seleccionado, usar el mes actual
    const ahora = new Date();
    if (!mesAño) {
      mesAño = 'todos';
    }
    window.mesPagosSeleccionado = mesAño;
    
    // Filtrar pagos por mes seleccionado
    const [añoSel, mesSel] = mesAño.split('-').map(Number);
    const pagos = todosPagos.filter(p => {
      if (!p.fecha_pago) return false;
      let fecha;
      if (p.fecha_pago.includes('/')) {
        const partes = p.fecha_pago.split('/');
        fecha = new Date(partes[2], partes[1] - 1, partes[0]);
      } else {
        fecha = new Date(p.fecha_pago);
      }
      return mesAño === 'todos' || (fecha.getFullYear() === añoSel && (fecha.getMonth() + 1) === mesSel);
    });
    
    // Obtener meses disponibles para el selector
    const mesesDisponibles = new Set();
    todosPagos.forEach(p => {
      if (!p.fecha_pago) return;
      let fecha;
      if (p.fecha_pago.includes('/')) {
        const partes = p.fecha_pago.split('/');
        fecha = new Date(partes[2], partes[1] - 1, partes[0]);
      } else {
        fecha = new Date(p.fecha_pago);
      }
      const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      mesesDisponibles.add(key);
    });
    
    // Agregar mes actual si no hay pagos
    mesesDisponibles.add(`${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`);
    
    const mesesOrdenados = Array.from(mesesDisponibles).sort().reverse();
    
    const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    const opcionesMeses = mesesOrdenados.map(m => {
      const [a, mes] = m.split('-');
      const nombreMes = nombresMeses[parseInt(mes) - 1];
      const selected = m === mesAño ? 'selected' : '';
      return `<option value="${m}" ${selected}>${nombreMes} ${a}</option>`;
    }).join('');
    
    const mesActualLabel = mesAño === 'todos' ? 'todos los meses' : nombresMeses[mesSel - 1] + ' ' + añoSel;
    
    const html = `
      <div style="background:#1F2937;border-radius:14px;margin:20px 0;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.25);">
        <div style="padding:20px;border-bottom:1px solid #334155;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:15px;">
            <h2 style="margin:0;color:#fff;font-size:24px;font-weight:700;">
              📊 Historial de <span style="color:#0EA5E9;">Pagos</span>
            </h2>
            <div style="display:flex;align-items:center;gap:15px;flex-wrap:wrap;">
              <div style="display:flex;align-items:center;gap:10px;">
                <label style="color:#94A3B8;font-size:14px;">📅 Mes:</label>
                <select id="selector-mes-pagos" onchange="renderHistorialPagos(this.value)" style="padding:8px 12px;border-radius:6px;border:1px solid #444;background:#111827;color:#fff;font-size:14px;cursor:pointer;">
                  <option value="todos"${mesAño === 'todos' ? ' selected' : ''}>Todos los meses</option>${opcionesMeses}
                </select>
              </div>
              <div style="color:#94A3B8;font-size:14px;">
                ${pagos.length} ${pagos.length === 1 ? 'pago' : 'pagos'} en ${mesActualLabel}
              </div>
              <button onclick="exportarPagosExcel()" style="padding:10px 20px;background:#059669;color:white;border:none;border-radius:5px;cursor:pointer;font-weight:600;">📥 Exportar Excel</button>
            </div>
          </div>
        </div>
        
        <div style="overflow-x:auto;max-height:600px;">
          <table id="tabla-historial-pagos" style="width:100%;border-collapse:separate;border-spacing:0;font-size:14px;">
            <thead>
              <tr style="background:#111827;">
                <th style="color:#fff;text-align:left;padding:12px 16px;font-weight:600;font-size:13px;text-transform:uppercase;position:sticky;top:0;background:#111827;border-bottom:2px solid #0EA5E9;">
                  <div>Fecha Pago</div>
                  <input type="text" id="filtro-pago-fecha" placeholder="Buscar..." onkeyup="filtrarPagosPorColumna()" style="width:90%;padding:4px;margin-top:4px;border:1px solid #444;border-radius:4px;font-size:12px;background:#1F2937;color:#fff;">
                </th>
                <th style="color:#fff;text-align:left;padding:12px 16px;font-weight:600;font-size:13px;text-transform:uppercase;position:sticky;top:0;background:#111827;border-bottom:2px solid #0EA5E9;">
                  <div>Cliente</div>
                  <input type="text" id="filtro-pago-cliente" placeholder="Buscar..." onkeyup="filtrarPagosPorColumna()" style="width:90%;padding:4px;margin-top:4px;border:1px solid #444;border-radius:4px;font-size:12px;background:#1F2937;color:#fff;">
                </th>
                <th style="color:#fff;text-align:left;padding:12px 16px;font-weight:600;font-size:13px;text-transform:uppercase;position:sticky;top:0;background:#111827;border-bottom:2px solid #0EA5E9;">
                  <div>Póliza</div>
                  <input type="text" id="filtro-pago-poliza" placeholder="Buscar..." onkeyup="filtrarPagosPorColumna()" style="width:90%;padding:4px;margin-top:4px;border:1px solid #444;border-radius:4px;font-size:12px;background:#1F2937;color:#fff;">
                </th>
                <th style="color:#fff;text-align:left;padding:12px 16px;font-weight:600;font-size:13px;text-transform:uppercase;position:sticky;top:0;background:#111827;border-bottom:2px solid #0EA5E9;">
                  <div>Periodo</div>
                  <input type="text" id="filtro-pago-periodo" placeholder="Buscar..." onkeyup="filtrarPagosPorColumna()" style="width:90%;padding:4px;margin-top:4px;border:1px solid #444;border-radius:4px;font-size:12px;background:#1F2937;color:#fff;">
                </th>
                <th style="color:#fff;text-align:right;padding:12px 16px;font-weight:600;font-size:13px;text-transform:uppercase;position:sticky;top:0;background:#111827;border-bottom:2px solid #0EA5E9;">
                  <div>Monto</div>
                  <input type="text" id="filtro-pago-monto" placeholder="Buscar..." onkeyup="filtrarPagosPorColumna()" style="width:90%;padding:4px;margin-top:4px;border:1px solid #444;border-radius:4px;font-size:12px;background:#1F2937;color:#fff;">
                </th>
                <th style="color:#fff;text-align:center;padding:12px 16px;font-weight:600;font-size:13px;text-transform:uppercase;position:sticky;top:0;background:#111827;border-bottom:2px solid #0EA5E9;">
                  <div>Mora</div>
                  <input type="text" id="filtro-pago-mora" placeholder="Buscar..." onkeyup="filtrarPagosPorColumna()" style="width:90%;padding:4px;margin-top:4px;border:1px solid #444;border-radius:4px;font-size:12px;background:#1F2937;color:#fff;">
                </th>
                <th style="color:#fff;text-align:center;padding:12px 16px;font-weight:600;font-size:13px;text-transform:uppercase;position:sticky;top:0;background:#111827;border-bottom:2px solid #0EA5E9;">
                  <div>Método</div>
                  <input type="text" id="filtro-pago-metodo" placeholder="Buscar..." onkeyup="filtrarPagosPorColumna()" style="width:90%;padding:4px;margin-top:4px;border:1px solid #444;border-radius:4px;font-size:12px;background:#1F2937;color:#fff;">
                </th>
              </tr>
            </thead>
            <tbody id="pagos-tbody">
              ${pagos.length === 0 ? `
                <tr>
                  <td colspan="7" style="text-align:center;padding:40px;color:#94A3B8;">
                    <div style="font-size:48px;margin-bottom:10px;">📭</div>
                    <div>No hay pagos registrados en ${mesActualLabel}</div>
                  </td>
                </tr>
              ` : pagos.map(pago => {
                let currency = (pago.moneda || 'CRC').toLowerCase();
                if (currency.includes('colon')) currency = 'CRC';
                else if (currency.includes('dolar') || currency.includes('dollar')) currency = 'USD';
                else if (currency === 'dólares') currency = 'USD';
                else if (currency === 'usd') currency = 'USD';
                else currency = 'CRC';
                
                const montoFmt = new Intl.NumberFormat('es-CR', {
                  style: 'currency',
                  currency: currency.toUpperCase(),
                  minimumFractionDigits: 2, maximumFractionDigits: 2
                }).format(pago.monto_pagado);
                
                const moraColor = pago.dias_mora > 0 ? '#F59E0B' : '#10B981';
                const moraIcon = pago.dias_mora > 0 ? '⚠️' : '✅';
                
                return `
                  <tr style="border-bottom:1px solid #334155;transition:background .2s;" onmouseover="this.style.background='rgba(14,165,233,.05)'" onmouseout="this.style.background='transparent'">
                    <td style="padding:12px 16px;color:#CBD5E1;">${pago.fecha_pago}</td>
                    <td style="padding:12px 16px;color:#fff;font-weight:500;">${pago.cliente_nombre}</td>
                    <td style="padding:12px 16px;color:#94A3B8;">${pago.poliza}</td>
                    <td style="padding:12px 16px;color:#94A3B8;font-size:12px;">${pago.periodo_desde} - ${pago.periodo_hasta}</td>
                    <td style="padding:12px 16px;color:#10B981;font-weight:600;text-align:right;">${montoFmt}</td>
                    <td style="padding:12px 16px;text-align:center;">
                      <span style="color:${moraColor};font-size:12px;font-weight:600;">
                        ${moraIcon} ${pago.dias_mora} días
                      </span>
                    </td>
                    <td style="padding:12px 16px;text-align:center;">
                      <span style="background:#334155;padding:4px 8px;border-radius:6px;color:#CBD5E1;font-size:11px;text-transform:uppercase;">
                        ${pago.metodo_pago}
                      </span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
        
        ${pagos.length > 0 ? `
          <div style="padding:20px;border-top:1px solid #334155;background:#111827;">
            <div style="display:flex;justify-content:space-around;text-align:center;flex-wrap:wrap;gap:20px;">
              <div>
                <div style="color:#94A3B8;font-size:12px;">Total USD</div>
                <div style="color:#10B981;font-size:24px;font-weight:700;margin-top:5px;">
                  ${(() => {
                    const totalUSD = pagos.filter(p => {
                      const m = (p.moneda || "").toLowerCase();
                      return m.includes("dolar") || m.includes("dollar") || m === "usd";
                    }).reduce((sum, p) => sum + Number(p.monto_pagado), 0);
                    return new Intl.NumberFormat("es-CR", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalUSD);
                  })()}
                </div>
              </div>
              <div>
                <div style="color:#94A3B8;font-size:12px;">Total CRC</div>
                <div style="color:#10B981;font-size:24px;font-weight:700;margin-top:5px;">
                  ${(() => {
                    const totalCRC = pagos.filter(p => {
                      const m = (p.moneda || "CRC").toLowerCase();
                      return m.includes("colon") || m === "crc" || (!m.includes("dolar") && !m.includes("dollar") && m !== "usd");
                    }).reduce((sum, p) => sum + Number(p.monto_pagado), 0);
                    return new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalCRC);
                  })()}
                </div>
              </div>
              <div>
                <div style="color:#94A3B8;font-size:12px;">Promedio Mora</div>
                <div style="color:#F59E0B;font-size:24px;font-weight:700;margin-top:5px;">
                  ${(() => {
                    const totalMora = pagos.reduce((sum, p) => sum + (p.dias_mora || 0), 0);
                    return (totalMora / pagos.length).toFixed(1);
                  })()} días
                </div>
              </div>
              <div>
                <div style="color:#94A3B8;font-size:12px;">Total Pagos</div>
                <div style="color:#0EA5E9;font-size:24px;font-weight:700;margin-top:5px;">
                  ${pagos.length}
                </div>
              </div>
            </div>
          </div>
        ` : ""}
      </div>
    `;
    
    container.innerHTML = html;
    
  } catch(error) {
    console.error('Error cargando historial:', error);
    container.innerHTML = `
      <div style="text-align:center;padding:40px;color:#EF4444;">
        ❌ Error cargando historial: ${error.message}
      </div>
    `;
  }
};

// ========== FILTROS POR COLUMNA PAGOS ==========
window.filtrarPagosPorColumna = function() {
  var filtroFecha = (document.getElementById('filtro-pago-fecha')?.value || '').toLowerCase();
  var filtroCliente = (document.getElementById('filtro-pago-cliente')?.value || '').toLowerCase();
  var filtroPoliza = (document.getElementById('filtro-pago-poliza')?.value || '').toLowerCase();
  var filtroPeriodo = (document.getElementById('filtro-pago-periodo')?.value || '').toLowerCase();
  var filtroMonto = (document.getElementById('filtro-pago-monto')?.value || '').toLowerCase();
  var filtroMora = (document.getElementById('filtro-pago-mora')?.value || '').toLowerCase();
  var filtroMetodo = (document.getElementById('filtro-pago-metodo')?.value || '').toLowerCase();

  var tbody = document.getElementById('pagos-tbody');
  if (!tbody) return;

  var filas = tbody.getElementsByTagName('tr');
  for (var i = 0; i < filas.length; i++) {
    var celdas = filas[i].getElementsByTagName('td');
    if (celdas.length < 7) continue;

    var fecha = (celdas[0]?.textContent || '').toLowerCase();
    var cliente = (celdas[1]?.textContent || '').toLowerCase();
    var poliza = (celdas[2]?.textContent || '').toLowerCase();
    var periodo = (celdas[3]?.textContent || '').toLowerCase();
    var monto = (celdas[4]?.textContent || '').toLowerCase();
    var mora = (celdas[5]?.textContent || '').toLowerCase();
    var metodo = (celdas[6]?.textContent || '').toLowerCase();

    var mostrar = fecha.includes(filtroFecha) &&
                  cliente.includes(filtroCliente) &&
                  poliza.includes(filtroPoliza) &&
                  periodo.includes(filtroPeriodo) &&
                  monto.includes(filtroMonto) &&
                  mora.includes(filtroMora) &&
                  metodo.includes(filtroMetodo);

    filas[i].style.display = mostrar ? '' : 'none';
  }
};

// ========== EXPORTAR PAGOS A EXCEL (XLSX) ==========
window.exportarPagosExcel = function() {
  if (typeof XLSX === "undefined") {
    alert("Librería Excel no disponible");
    return;
  }

  var tbody = document.getElementById('pagos-tbody');
  if (!tbody) {
    alert('No hay datos para exportar');
    return;
  }

  var filas = tbody.getElementsByTagName('tr');
  var datos = [];
  
  datos.push(['Fecha Pago', 'Cliente', 'Póliza', 'Periodo', 'Monto', 'Mora', 'Método']);

  for (var i = 0; i < filas.length; i++) {
    if (filas[i].style.display === 'none') continue;
    var celdas = filas[i].getElementsByTagName('td');
    if (celdas.length < 7) continue;

    datos.push([
      (celdas[0]?.textContent || '').trim(),
      (celdas[1]?.textContent || '').trim(),
      (celdas[2]?.textContent || '').trim(),
      (celdas[3]?.textContent || '').trim(),
      (celdas[4]?.textContent || '').trim(),
      (celdas[5]?.textContent || '').trim(),
      (celdas[6]?.textContent || '').trim()
    ]);
  }

  if (datos.length <= 1) {
    alert('No hay datos visibles para exportar');
    return;
  }

  var wb = XLSX.utils.book_new();
  var ws = XLSX.utils.aoa_to_sheet(datos);
  
  ws['!cols'] = [
    {wch: 12}, {wch: 25}, {wch: 18}, {wch: 25}, {wch: 15}, {wch: 10}, {wch: 12}
  ];
  
  XLSX.utils.book_append_sheet(wb, ws, 'Historial Pagos');
  
  var mesLabel = window.mesPagosSeleccionado || 'todos';
  var filename = 'historial_pagos_' + mesLabel + '.xlsx';
  XLSX.writeFile(wb, filename);
  
  console.log('✅ Excel exportado: ' + (datos.length - 1) + ' registros');
};

console.log('✅ tab_historial_pagos.js cargado con selector de mes');
