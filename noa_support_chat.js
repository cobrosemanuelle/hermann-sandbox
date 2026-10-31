(function() {
  'use strict';
  const SYSTEM_PROMPT = 'Eres el asistente de soporte de NOA. Ayuda a los usuarios con instrucciones paso a paso, sin mandarlos a leer documentación. CARGAR DATOS: desde menu Cargar Datos, acepta Excel. WHATSAPP: boton Enviar WhatsApp en Cartera. EMAILS: 200 gratis/mes. COSTOS: $9/mes base. CONTACTO: tv@noacr.net, +506 6045-7989';
  let chatHistory = [];
  let isOpen = false;
  
  function createChatUI() {
    const html = '<div id="noa-support-chat" style="position:fixed;bottom:20px;right:20px;z-index:10000;font-family:-apple-system,sans-serif"><button id="noa-chat-toggle" style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#0EA5E9,#0284c7);border:none;color:white;font-size:24px;cursor:pointer;box-shadow:0 4px 12px rgba(14,165,233,0.4)">💬</button><div id="noa-chat-window" style="display:none;position:absolute;bottom:70px;right:0;width:380px;height:500px;background:white;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.2);flex-direction:column;overflow:hidden"><div style="background:linear-gradient(135deg,#0EA5E9,#0284c7);color:white;padding:15px;display:flex;justify-content:space-between;align-items:center"><div><div style="font-weight:600;font-size:16px">🤖 Asistente NOA</div><div style="font-size:11px;opacity:0.9">Soporte IA 24/7</div></div><button id="noa-chat-close" style="background:rgba(255,255,255,0.2);border:none;color:white;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:18px">×</button></div><div id="noa-chat-messages" style="flex:1;overflow-y:auto;padding:15px;background:#f8fafc"><div style="background:white;padding:12px;border-radius:8px;margin-bottom:10px;border-left:3px solid #0EA5E9;font-size:13px;color:#475569">👋 ¡Hola! Preguntame lo que necesites.<br><br><strong>Ejemplos:</strong><br>• ¿Cómo cargo mi Excel?<br>• ¿Cómo envío WhatsApp?</div></div><div style="padding:15px;border-top:1px solid #e2e8f0;background:white"><div style="display:flex;gap:8px"><input type="text" id="noa-chat-input" placeholder="Escribe tu pregunta..." style="flex:1;padding:10px;border:1px solid #cbd5e1;border-radius:8px;font-size:13px;outline:none"/><button id="noa-chat-send" style="background:#0EA5E9;color:white;border:none;padding:10px 16px;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px">Enviar</button></div></div></div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('noa-chat-toggle').addEventListener('click', toggleChat);
    document.getElementById('noa-chat-close').addEventListener('click', toggleChat);
    document.getElementById('noa-chat-send').addEventListener('click', sendMessage);
    document.getElementById('noa-chat-input').addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
  }
  
  function toggleChat() {
    isOpen = !isOpen;
    const w = document.getElementById('noa-chat-window');
    const t = document.getElementById('noa-chat-toggle');
    if (isOpen) { w.style.display = 'flex'; t.textContent = '✕'; } 
    else { w.style.display = 'none'; t.textContent = '💬'; }
  }
  
  function addMessage(text, isUser = false) {
    const m = document.getElementById('noa-chat-messages');
    m.insertAdjacentHTML('beforeend', '<div style="background:'+(isUser?'#0EA5E9':'white')+';color:'+(isUser?'white':'#1e293b')+';padding:10px 12px;border-radius:8px;margin-bottom:8px;'+(isUser?'margin-left:40px':'margin-right:40px')+';font-size:13px;line-height:1.5;'+(isUser?'':'border-left:3px solid #0EA5E9')+'">'+text.replace(/\n/g,'<br>')+'</div>');
    m.scrollTop = m.scrollHeight;
  }
  
  function addTyping() {
    document.getElementById('noa-chat-messages').insertAdjacentHTML('beforeend', '<div id="typing-indicator" style="background:white;padding:10px;border-radius:8px;margin-right:40px;font-size:13px;border-left:3px solid #0EA5E9">●●●</div>');
  }
  
  function removeTyping() {
    const t = document.getElementById('typing-indicator');
    if (t) t.remove();
  }
  
  async function sendMessage() {
    const input = document.getElementById('noa-chat-input');
    const msg = input.value.trim();
    if (!msg) return;
    addMessage(msg, true);
    input.value = '';
    chatHistory.push({ role: 'user', content: msg });
    addTyping();
    try {
      const res = await fetch('/.netlify/functions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: SYSTEM_PROMPT, messages: chatHistory })
      });
      if (!res.ok) throw new Error('Error');
      const data = await res.json();
      const reply = data.content[0].text;
      chatHistory.push({ role: 'assistant', content: reply });
      removeTyping();
      addMessage(reply, false);
    } catch (error) {
      removeTyping();
      addMessage('❌ Error. Contacta tv@noacr.net', false);
    }
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createChatUI);
  } else {
    createChatUI();
  }
})();
