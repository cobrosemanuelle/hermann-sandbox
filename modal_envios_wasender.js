// Modal envíos con WasenderAPI

window.enviarWAIndividual = async function(telefono, mensaje, clienteNombre, _id, origen) {
  try {
    const telefonoLimpio = String(telefono).replace(/\D/g, '');
    const numeroCompleto = telefonoLimpio.startsWith('506') ? telefonoLimpio : '506' + telefonoLimpio;
    const apiKey = localStorage.getItem('wasender_api_key') || '';
    
    console.log('📱 Enviando WA individual a:', numeroCompleto);
    
    const response = await fetch('https://www.wasenderapi.com/api/send-message', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: numeroCompleto,
        text: mensaje
      })
    });

    if (response.ok) {
      console.log('✅ WhatsApp enviado:', clienteNombre);
      if (window.guardarEnvio) {
        await window.guardarEnvio(_id, clienteNombre, 1, 'whatsapp', mensaje, origen);
      }
      return { success: true };
    } else {
      const errorText = await response.text();
      console.error('❌ Error WA:', errorText);
      return { success: false, error: 'API error: ' + response.status };
    }
  } catch (error) {
    console.error('❌ Error:', error);
    return { success: false, error: error.message };
  }
};
