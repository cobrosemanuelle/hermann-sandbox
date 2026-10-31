// Modal de Gestión de Envíos - NOA Cobros
window.abrirPanelEnvios = async function(clientesOriginal, tipo, mensaje) {
  let clientes = clientesOriginal;
  let yaEnviadosHoy = 0;

  // Si es WhatsApp, filtrar a los que YA recibieron mensaje hoy - asi al reabrir el panel
  // (ej. al dia siguiente, retomando donde quedo) no se repiten envios a quien ya se le mando.
  if (tipo === 'whatsapp') {
    try {
      const rr0 = await fetch('/api/envios?action=contador');
      const dd0 = await rr0.json();
      if (rr0.ok && dd0 && dd0.success) {
        const ya = window.noaIdsWAHoy(dd0.envios || [], new Date());
        const totalOriginal = clientes.length;
        clientes = clientes.filter(function(c) { return !ya[String(c.id)]; });
        yaEnviadosHoy = totalOriginal - clientes.length;
      }
    } catch (e) {
      console.error('No se pudo filtrar clientes ya enviados hoy:', e.message);
    }
  }

  if (clientes.length === 0 && yaEnviadosHoy > 0) {
    alert('✅ Los ' + yaEnviadosHoy + ' clientes seleccionados ya recibieron WhatsApp hoy. No queda nadie pendiente en este grupo.');
    return;
  }

  const casoId = Date.now();
  
  window.datosEnvioActual = { 
    clientes: clientes, 
    tipo: tipo, 
    mensaje: mensaje, 
    casoId: casoId 
  };
  
  const modal = document.createElement('div');
  modal.id = 'modal-' + casoId;
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:10000;display:flex;justify-content:center;align-items:center;';
  
  const panel = document.createElement('div');
  panel.style.cssText = 'background:#1F2937;border-radius:16px;width:90%;max-width:800px;max-height:80vh;overflow-y:auto;padding:30px;';
  
  const icono = tipo === 'email' ? '📧' : '📱';
  const tipoTexto = tipo === 'email' ? 'Email' : 'WhatsApp';
  
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:20px;';
  header.innerHTML = '<h2 style="color:#fff;margin:0;">' + icono + ' ' + tipoTexto + (yaEnviadosHoy > 0 ? ' <span style="font-size:13px;color:#94A3B8;font-weight:400;">(' + yaEnviadosHoy + ' ya recibieron hoy, no se muestran)</span>' : '') + '</h2>';
  
  const btnAuto = document.createElement('button');
  btnAuto.textContent = '🚀 Enviar Todo Automático';
  btnAuto.style.cssText = 'background:#10B981;color:#fff;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:600;margin-right:10px;';
  btnAuto.onclick = function() { window.iniciarEnvioAutomatico(); };
  header.appendChild(btnAuto);
  
  const btnCerrar = document.createElement('button');
  btnCerrar.textContent = '✕';
  btnCerrar.style.cssText = 'background:#EF4444;color:#fff;border:none;padding:10px 15px;border-radius:8px;cursor:pointer;font-size:18px;';
  btnCerrar.onclick = function() { modal.remove(); };
  header.appendChild(btnCerrar);
  
  const info = document.createElement('div');
  info.style.cssText = 'background:#111827;padding:15px;border-radius:8px;margin-bottom:20px;';
  info.innerHTML = '<div style="color:#10B981;">Total: <strong>' + clientes.length + '</strong></div>' +
    '<div id="progress-' + casoId + '" style="color:#0EA5E9;margin-top:5px;">Progreso: 0/' + clientes.length + '</div>';
  
  const lista = document.createElement('div');
  lista.id = 'lista-' + casoId;
  
  clientes.forEach(function(cliente, i) {
    const nombre = cliente.asegurado || cliente.Asegurado || cliente.ASEGURADO || 'Cliente ' + (i+1);
    const email = cliente.correo || cliente['Correo electrónico 1'] || cliente.Email || '';
    const telefono = cliente.telefono || cliente['Teléfono'] || cliente.Telefono || '';
    const poliza = cliente.poliza || cliente['# Póliza'] || cliente.Póliza || '';
    const contacto = tipo === 'email' ? email : telefono;
    
    const item = document.createElement('div');
    item.style.cssText = 'background:#111827;padding:15px;border-radius:8px;margin-bottom:10px;';
    
    const contenido = document.createElement('div');
    contenido.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';
    
    const detalles = document.createElement('div');
    detalles.innerHTML = '<div style="color:#fff;font-weight:600;">#' + (i+1) + ' ' + nombre + '</div>' +
      '<div style="color:#CBD5E1;font-size:13px;margin-top:4px;">' + icono + ' ' + contacto + '</div>' +
      '<div style="color:#94A3B8;font-size:12px;">Póliza: ' + poliza + '</div>';
    
    const btnEnviar = document.createElement('button');
    btnEnviar.textContent = 'Enviar';
    btnEnviar.style.cssText = 'background:#10B981;color:#fff;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;';
    btnEnviar.setAttribute('data-index', i);
    btnEnviar.onclick = function() {
      window.enviarAhora(parseInt(this.getAttribute('data-index')));
    };
    
    const estado = document.createElement('div');
    estado.id = 'estado-' + i;
    estado.style.cssText = 'color:#F59E0B;font-size:12px;margin-top:8px;';
    estado.textContent = '⏳ Pendiente';
    
    contenido.appendChild(detalles);
    contenido.appendChild(btnEnviar);
    item.appendChild(contenido);
    item.appendChild(estado);
    lista.appendChild(item);
  });
  
  panel.appendChild(header);
  panel.appendChild(info);
  panel.appendChild(lista);
  modal.appendChild(panel);
  document.body.appendChild(modal);
  
  console.log('✅ Modal abierto con', clientes.length, 'clientes');
};

window.enviarAhora = async function(index) {
  console.log('🚀 EJECUTANDO enviarAhora, index:', index);
  
  if (!window.datosEnvioActual) {
    alert('Error: No hay datos de envío');
    return;
  }
  
  const datos = window.datosEnvioActual;
  const cliente = datos.clientes[index];
  const tipo = datos.tipo;
  const mensaje = datos.mensaje;
  
  const estadoEl = document.getElementById('estado-' + index);
  if (!estadoEl) {
    console.error('❌ No existe estado-' + index);
    return;
  }
  
  estadoEl.textContent = '⏳ Enviando...';
  estadoEl.style.color = '#0EA5E9';
  
  const nombre = cliente.asegurado || cliente.Asegurado || cliente.ASEGURADO || 'Cliente';
  const email = cliente.correo || cliente['Correo electrónico 1'] || cliente.Email || '';
  const telefono = String(cliente.telefono || cliente['Teléfono'] || cliente.Telefono || '').replace(/[^0-9]/g, '');
  const poliza = cliente.poliza || cliente['# Póliza'] || cliente.Póliza || '';
  const monto = cliente.moneda === 'USD' ? '$' + window.noaPrimaTxt(cliente.prima||0) : '₡' + window.noaPrimaTxt(cliente.prima||0);
  function fmtFechaEnvio(v){if(!v)return 'N/A';if(typeof excelDate==='function')return excelDate(v);return v;}
  const vencimiento = fmtFechaEnvio(cliente.desde_cobro) || 'N/A';
  const aseguradora = cliente.aseguradora || 'N/A';
  const periodicidad = cliente.periodicidad || 'N/A';
  const placa = cliente.placa || '';
  const marcaV = cliente['DETALLE_AUT_INS::Marca'] || cliente.marca || '';
  const modeloV = cliente['DETALLE_AUT_INS::Modelo'] || cliente.modelo || '';
  const anioV = cliente['DETALLE_AUT_INS::Año'] || cliente.anio || '';
  const objetoAsegurado = [marcaV, modeloV, anioV].filter(x=>x && String(x).trim()!=='').join(' ') || placa;
  const fechaLimiteEnvio = (typeof excelDate === 'function' && excelDate(cliente.fecha_limite_pago||'')) || ((typeof calcFechaLimite === 'function') ? calcFechaLimite(vencimiento) : 'N/A');
  const clienteId = cliente.id;
  
  console.log('📋 Datos cliente:', {nombre: nombre, tel: telefono, email: email, tipo: tipo, id: clienteId});
  
  if (tipo === 'whatsapp') {
    if (!telefono || telefono.length < 8) {
      estadoEl.textContent = '❌ Tel inválido: ' + telefono;
      estadoEl.style.color = '#EF4444';
      return;
    }
    
    try {
      // Verificar estado de WhatsApp antes de enviar
      if (window.wasenderConectado === false) {
        estadoEl.textContent = '❌ WA Desconectado';
        estadoEl.style.color = '#EF4444';
        console.log('⚠️ No se envió - WhatsApp desconectado');
        if (window.guardarEnvio && clienteId) {
          await window.guardarEnvio(clienteId, nombre, 0, 'whatsapp', mensaje + ' [FALLIDO - WA Desconectado]', 'masivo');
        }
        return;
      }
      
      const lineaVehiculo = objetoAsegurado ? ('🚗 ' + objetoAsegurado + (placa && objetoAsegurado !== placa ? (' | 🔖 ' + placa) : '')) : '';
      const seccionVehiculo = lineaVehiculo ? ('\n' + lineaVehiculo) : '';
      const periodoGracia = cliente.periodo_gracia || '9';
      const msgBase = '🔔 *Aviso de Vencimiento de Póliza*\n\nEstimado *' + nombre + '*,\n\n🏢 ' + aseguradora + '\n📋 Póliza: *' + poliza + '*' + seccionVehiculo + '\n📅 Vence: *' + vencimiento + '*\n💳 Pago: ' + periodicidad + '\n💰 Monto: *' + monto + '*\n📅 Límite de pago: *' + fechaLimiteEnvio + '*\n\n⚠️ Después del período de gracia de *' + periodoGracia + ' días*, la póliza quedará inactiva y sin cobertura.';
      const _mach = window.noaMachote ? window.noaMachote(cliente) : null;
      const msg = _mach ? (_mach.wa || _mach.texto) : msgBase;
      const numeroCompleto = '+506' + telefono;
      
      const apiKey = localStorage.getItem('wasender_api_key') || '';
      
      if (apiKey && apiKey !== '') {
        console.log('📱 Enviando via WasenderAPI a:', numeroCompleto);
        
        const response = await fetch('https://www.wasenderapi.com/api/send-message', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: numeroCompleto,
            text: msg
          })
        });
        
        if (response.ok) {
          estadoEl.textContent = '✅ Enviado via API';
          estadoEl.style.color = '#10B981';
          console.log('✅ WasenderAPI envió correctamente');
          
          if (window.guardarEnvio && clienteId) {
            await window.guardarEnvio(clienteId, nombre, 1, 'whatsapp', msg, 'masivo');
            console.log('💾 Guardado en historial con ID:', clienteId);
          }
        } else {
          throw new Error('API error: ' + response.status);
        }
      } else {
        console.log('⚠️ API key no configurada, usando wa.me');
        const url = 'https://wa.me/' + numeroCompleto + '?text=' + encodeURIComponent(msg);
        window.open(url, '_blank');
        estadoEl.textContent = '✅ WhatsApp Web abierto';
        estadoEl.style.color = '#10B981';
        
        if (window.guardarEnvio && clienteId) {
          await window.guardarEnvio(clienteId, nombre, 1, 'whatsapp', msg, 'masivo');
        }
      }
      
      actualizarProgreso();
    } catch(e) {
      estadoEl.textContent = '❌ Error';
      estadoEl.style.color = '#EF4444';
      console.error('❌ Error:', e);
    }
  } else {
    if (!email || !email.includes('@')) {
      estadoEl.textContent = '❌ Email inválido';
      estadoEl.style.color = '#EF4444';
      return;
    }
    
    try {
      await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
        to_email: email,
        nombre: nombre,
        aseguradora: aseguradora,
        poliza: poliza,
        objeto_asegurado: objetoAsegurado,
        placa: placa,
        vencimiento: vencimiento,
        periodicidad: periodicidad,
        monto: monto,
        fecha_limite: fechaLimiteEnvio,
        asunto: 'Recordatorio Vencimiento de Póliza',
        mensaje: (window.noaMachote && window.noaMachote(cliente) ? window.noaMachote(cliente).texto : '')
      }, EMAILJS_CONFIG.publicKey);
      
      estadoEl.textContent = '✅ Enviado';
      estadoEl.style.color = '#10B981';
      
      if (window.guardarEnvio && clienteId) {
        const resumenEmail = 'Aviso de Vencimiento - ' + aseguradora + ' | Poliza: ' + poliza + ' | Vence: ' + vencimiento + ' | Monto: ' + monto + ' | Limite pago: ' + fechaLimiteEnvio;
        await window.guardarEnvio(clienteId, nombre, 1, 'email', resumenEmail, 'masivo');
      }
      
      actualizarProgreso();
    } catch(e) {
      const detalle = (e && (e.text || e.message || JSON.stringify(e))) || 'sin detalle';
      estadoEl.textContent = '❌ ' + detalle;
      estadoEl.style.color = '#EF4444';
      console.error(e);
    }
  }
};

function actualizarProgreso() {
  if (!window.datosEnvioActual) return;
  
  const completados = document.querySelectorAll('[id^="estado-"]');
  let enviados = 0;
  for(let i = 0; i < completados.length; i++) {
    if (completados[i].textContent.includes('✅')) enviados++;
  }
  
  const progEl = document.getElementById('progress-' + window.datosEnvioActual.casoId);
  if (progEl) {
    progEl.textContent = 'Progreso: ' + enviados + '/' + window.datosEnvioActual.clientes.length;
  }
}

window.iniciarEnvioAutomatico = async function() {
  if (!window.datosEnvioActual) return;
  
  const clientes = window.datosEnvioActual.clientes;
  const tipo = window.datosEnvioActual.tipo;
  
  if (clientes.length === 0) {
    alert('⚠️ No hay clientes para enviar');
    return;
  }

  // LIMITE DIARIO para WhatsApp - evitar restricciones de Meta por volumen alto en poco tiempo.
  // No es un tema de "delay entre mensajes" (eso ya existe), es volumen TOTAL por dia.
  if (tipo === 'whatsapp' && typeof window.cargarLimiteWA === 'function') { try { await window.cargarLimiteWA(); } catch (e) { /* queda el ultimo valor */ } }
  const LIMITE_DIARIO_WA = window.LIMITE_DIARIO_WA_CONFIG || window.LIMITE_WA_DEFAULT || 50;
  let enviadosHoy = 0;
  if (tipo === 'whatsapp') {
    let sinContar = false;
    try {
      const rr = await fetch('/api/envios?action=contador');
      const dd = await rr.json();
      if (!rr.ok || !dd || !dd.success) throw new Error('respuesta no valida');
      enviadosHoy = window.noaContarWAHoy(dd.envios || [], new Date());
    } catch (e) {
      sinContar = true;
      console.error('No se pudo consultar el limite diario de WhatsApp:', e.message);
    }
    if (sinContar) {
      alert('⚠️ No se pudo revisar cuántos WhatsApp van hoy, así que no se envía nada para no pasarse del límite diario. Intente de nuevo en un momento.');
      return;
    }
    if (enviadosHoy >= LIMITE_DIARIO_WA) {
      alert('⚠️ Ya se mandaron ' + enviadosHoy + ' WhatsApp hoy (límite diario: ' + LIMITE_DIARIO_WA + ').\n\nPara evitar que Meta restrinja el número, hay que esperar a mañana para seguir mandando.\n\nEsto es normal y protege la cuenta del corredor - no es un error.');
      return;
    }
    const disponiblesHoy = LIMITE_DIARIO_WA - enviadosHoy;
    if (clientes.length > disponiblesHoy) {
      const seguir = confirm('⚠️ Límite diario de WhatsApp: ' + LIMITE_DIARIO_WA + ' por día (protege el número de restricciones de Meta).\n\nYa van ' + enviadosHoy + ' hoy. Solo se pueden mandar ' + disponiblesHoy + ' más hoy, de los ' + clientes.length + ' seleccionados.\n\n¿Mandar solo esos ' + disponiblesHoy + ' ahora, y el resto mañana?');
      if (!seguir) return;
      clientes.length = disponiblesHoy;
    }
  }
  
  const delay = tipo === 'email' ? 5000 : 60000;
  const confirmar = confirm('🚀 ¿Enviar automáticamente a los ' + clientes.length + ' clientes?\n\nDelay: ' + (delay/1000) + ' segundos entre cada uno');
  
  if (!confirmar) return;
  
  console.log('🚀 Iniciando envío automático de', clientes.length, 'clientes');
  
  for (let i = 0; i < clientes.length; i++) {
    console.log('📤 Enviando automático', (i+1), 'de', clientes.length);
    await window.enviarAhora(i);
    
    if (i < clientes.length - 1) {
      console.log('⏳ Esperando', (delay/1000), 'segundos...');
      await new Promise(r => setTimeout(r, tipo === 'email' ? delay : window.noaPausaWA()));
    }
  }
  
  alert('✅ Envío masivo completado: ' + clientes.length + ' clientes');
  console.log('✅ Envío masivo completado');
};

console.log('✅ modal_envios.js cargado');
