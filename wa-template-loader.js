// WhatsApp Template Loader - Sistema de plantillas configurables
(async function() {
  if (window.WA_TEMPLATES_LOADED) return;
  window.WA_TEMPLATES_LOADED = true;

  console.log('📝 Cargando templates de WhatsApp...');

  // Cargar templates desde JSON
  let templates = null;
  try {
    const response = await fetch('/wa-templates.json');
    if (!response.ok) throw new Error('No se pudo cargar wa-templates.json');
    const data = await response.json();
    templates = data.templates;
    console.log('✅ Templates cargados:', Object.keys(templates));
  } catch (error) {
    console.error('❌ Error cargando templates:', error);
    return;
  }

  // Función para reemplazar placeholders
  function replacePlaceholders(template, data) {
    let message = template;
    Object.keys(data).forEach(key => {
      const placeholder = '{' + key + '}';
      message = message.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), data[key] || '');
    });
    return message;
  }

  // Obtener datos del cliente desde la tabla
  function getClienteData(index) {
    if (!window.datosReales || !window.datosReales[index]) return null;
    const cliente = window.datosReales[index];
    
    // Extraer datos necesarios
    const nombre = cliente.nombre || cliente.Nombre || cliente.Asegurado || cliente.asegurado || 'Cliente';
    const empresa = cliente.agenciaCorrector || cliente.empresa || 'Su aseguradora';
    const poliza = cliente.poliza || cliente.pol_original || cliente['# Póliza'] || cliente['# Poliza'] || 'N/A';
    
    // Monto: buscar Prima Aseguradora o monto
    let monto = cliente['Prima Aseguradora'] || cliente.prima || cliente.monto || cliente.Monto || '0';
    const moneda = cliente.moneda || cliente.Moneda || 'CRC';
    if (typeof monto === 'number' || !isNaN(parseFloat(monto))) {
      const num = parseFloat(String(monto).replace(/[^\d.-]/g, '')) || 0;
      monto = moneda === 'USD' ? '$' + window.noaPrimaTxt(num) : '₡' + window.noaPrimaTxt(num);
    }
    
    // Fecha de vencimiento (fecha real de cobro): buscar 'desde_cobro' primero
    let vencimiento = cliente.desde_cobro || cliente['Vigencia hasta'] || cliente.vencimiento || cliente.Vencimiento || cliente.hasta || '';
    if (vencimiento && vencimiento instanceof Date) {
      vencimiento = vencimiento.toLocaleDateString('es-CR');
    } else if (vencimiento) {
      vencimiento = String(vencimiento);
    }

    // Fecha limite de pago (vencimiento + 10 dias habiles)
    let fechaLimite = cliente.fecha_limite || '';
    if (fechaLimite && fechaLimite instanceof Date) {
      fechaLimite = fechaLimite.toLocaleDateString('es-CR');
    } else if (fechaLimite) {
      fechaLimite = String(fechaLimite);
    }

    // Aseguradora (INS, ASSA, etc.)
    const aseguradora = cliente.aseguradora || 'N/A';

    // Objeto asegurado: Marca + Modelo + Año + Placa
    const marca = cliente['DETALLE_AUT_INS::Marca'] || cliente.marca || '';
    const modelo = cliente['DETALLE_AUT_INS::Modelo'] || cliente.modelo || '';
    const anio = cliente['DETALLE_AUT_INS::Año'] || cliente.anio || '';
    const placa = cliente.placa || '';
    const objetoAsegurado = [marca, modelo, anio].filter(x => x && String(x).trim() !== '').join(' ');

    // Periodicidad de pago
    const periodicidad = cliente.periodicidad || 'N/A';

    // Fecha de envío (hoy)
    const fechaEnvio = new Date().toLocaleDateString('es-CR');
    
    // Link de pago
    const linkPago = 'https://tuapp.com/pagar/' + poliza;
    
    return {
      nombre: nombre,
      empresa: empresa,
      poliza: poliza,
      monto: monto,
      vencimiento: vencimiento,
      fecha_limite: fechaLimite,
      aseguradora: aseguradora,
      objeto_asegurado: objetoAsegurado,
      placa: placa,
      periodicidad: periodicidad,
      fecha_envio: fechaEnvio,
      link_pago: linkPago
    };
  }

  // Definir/sobrescribir enviarWhatsAppIA
  const originalEnviarWhatsAppIA = window.enviarWhatsAppIA;
  
  window.enviarWhatsAppIA = async function(index, templateType = 'primer_recordatorio') {
    try {
      // Obtener datos del cliente
      const clienteData = getClienteData(index);
      if (!clienteData) {
        console.error('❌ No se encontraron datos del cliente en índice:', index);
        if (window.mostrarNotificacion) {
          window.mostrarNotificacion('❌ Error: datos del cliente no encontrados', 'error');
        }
        return;
      }

      // Seleccionar template (por defecto primer_recordatorio)
      const template = templates[templateType] || templates.primer_recordatorio;
      if (!template) {
        console.error('❌ Template no encontrado:', templateType);
        return;
      }

      // Reemplazar placeholders
      const message = replacePlaceholders(template, clienteData);
      
      console.log('📱 Enviando WhatsApp con template:', templateType);
      console.log('Mensaje:', message);

      // Obtener número de teléfono
      const cliente = window.datosReales[index];
      let telefono = cliente.telefono || cliente.Teléfono || cliente.telefono_whatsapp || cliente['Teléfono'] || '';
      telefono = String(telefono).replace(/[^0-9]/g, '');
      
      if (!telefono || telefono.length < 8) {
        console.error('❌ Teléfono inválido:', telefono);
        if (window.mostrarNotificacion) {
          window.mostrarNotificacion('❌ Cliente sin número de teléfono válido', 'error');
        }
        return;
      }

      // Enviar vía Netlify function
      const response = await fetch('/.netlify/functions/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: telefono,
          message: message
        })
      });

      if (!response.ok) {
        throw new Error('Error en respuesta: ' + response.status);
      }

      const result = await response.json();
      console.log('✅ WhatsApp enviado:', result);
      
      if (window.mostrarNotificacion) {
        window.mostrarNotificacion('✅ WhatsApp enviado a ' + clienteData.nombre, 'success');
      }

      // Guardar en historial si la función existe
      if (window.guardarEnHistorial) {
        await window.guardarEnHistorial(cliente.id || cliente._id, 'whatsapp', message);
      }

      return result;
    } catch (error) {
      console.error('❌ Error enviando WhatsApp:', error);
      if (window.mostrarNotificacion) {
        window.mostrarNotificacion('❌ Error enviando WhatsApp: ' + error.message, 'error');
      }
      throw error;
    }
  };

  console.log('🔄 Función enviarWhatsAppIA configurada con templates');
  console.log('📋 Templates disponibles:', Object.keys(templates));
})();
