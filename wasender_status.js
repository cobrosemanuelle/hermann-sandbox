// =====================================================
// WASENDER STATUS - Verificador de conexión WhatsApp
// =====================================================
(function() {
  'use strict';
  
  const CONFIG = {
    apiUrl: 'https://www.wasenderapi.com/api/status',
    checkInterval: 60000,
    apiKey: localStorage.getItem('wasender_api_key') || ''
  };
  
  const ESTADOS = {
    connected: { emoji: '🟢', texto: 'Conectado', color: '#27ae60', ok: true },
    connecting: { emoji: '🟡', texto: 'Conectando...', color: '#f39c12', ok: false },
    need_scan: { emoji: '🔴', texto: 'Necesita QR', color: '#e74c3c', ok: false },
    logged_out: { emoji: '🔴', texto: 'Sesión cerrada', color: '#e74c3c', ok: false },
    expired: { emoji: '🔴', texto: 'Expirado', color: '#e74c3c', ok: false },
    disconnected: { emoji: '🔴', texto: 'Desconectado', color: '#e74c3c', ok: false },
    not_configured: { emoji: '⚪', texto: 'No configurado', color: '#95a5a6', ok: false },
    error: { emoji: '⚠️', texto: 'Error al verificar', color: '#95a5a6', ok: false }
  };
  
  window.wasenderConectado = false;
  
  function crearIndicador() {
    const header = document.querySelector('.header');
    if (!header || document.getElementById('wasender-status-badge')) return;
    
    const badge = document.createElement('div');
    badge.id = 'wasender-status-badge';
    badge.style.cssText = 'position:absolute;top:15px;left:15px;background:rgba(255,255,255,0.95);padding:8px 15px;border-radius:20px;font-size:13px;font-weight:500;display:flex;align-items:center;gap:8px;box-shadow:0 2px 10px rgba(0,0,0,0.1);cursor:pointer;transition:all 0.3s ease;z-index:100;';
    badge.innerHTML = '<span id="wasender-status-emoji">⏳</span><span>WhatsApp: </span><span id="wasender-status-texto" style="font-weight:bold;">Verificando...</span>';
    badge.onclick = function() { badge.style.transform='scale(0.95)'; setTimeout(()=>badge.style.transform='scale(1)',150); verificarEstado(); };
    badge.title = 'Click para verificar estado';
    header.appendChild(badge);
  }
  
  function actualizarIndicador(estado) {
    const info = ESTADOS[estado] || ESTADOS.error;
    const emoji = document.getElementById('wasender-status-emoji');
    const texto = document.getElementById('wasender-status-texto');
    const badge = document.getElementById('wasender-status-badge');
    if (emoji) emoji.textContent = info.emoji;
    if (texto) { texto.textContent = info.texto; texto.style.color = info.color; }
    window.wasenderConectado = info.ok;
    if (!info.ok && badge && estado !== 'not_configured') badge.style.animation = 'wasender-pulse 2s infinite';
    else if (badge) badge.style.animation = 'none';
    console.log('📱 WhatsApp Status: ' + info.emoji + ' ' + info.texto);
  }
  
  async function verificarEstado() {
    // Si no hay API key configurada, mostrar "No configurado"
    const apiKey = localStorage.getItem('wasender_api_key') || '';
    if (!apiKey) {
      actualizarIndicador('not_configured');
      return 'not_configured';
    }
    
    try {
      const response = await fetch(CONFIG.apiUrl, { method: 'GET', headers: { 'Authorization': 'Bearer ' + apiKey } });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      actualizarIndicador(data.status || 'error');
      return data.status;
    } catch (error) {
      console.error('❌ Error verificando WhatsApp:', error);
      actualizarIndicador('error');
      return 'error';
    }
  }
  
  window.verificarWasenderAntesDeEnviar = async function() {
    const apiKey = localStorage.getItem('wasender_api_key') || '';
    if (!apiKey) {
      alert('⚠️ WhatsApp no configurado\n\nPor favor configure su API Key de Wasender en la sección de Ajustes.');
      return false;
    }
    
    const estado = await verificarEstado();
    if (estado !== 'connected') {
      const info = ESTADOS[estado] || ESTADOS.error;
      alert('⚠️ WhatsApp ' + info.texto + '\n\nNo se puede enviar el mensaje.\nPor favor reconecta WhatsApp en el panel de Wasender.');
      return false;
    }
    return true;
  };
  
  function agregarEstilos() {
    if (document.getElementById('wasender-status-styles')) return;
    const style = document.createElement('style');
    style.id = 'wasender-status-styles';
    style.textContent = '@keyframes wasender-pulse{0%{box-shadow:0 0 0 0 rgba(231,76,60,0.7);}70%{box-shadow:0 0 0 10px rgba(231,76,60,0);}100%{box-shadow:0 0 0 0 rgba(231,76,60,0);}}';
    document.head.appendChild(style);
  }
  
  function init() {
    agregarEstilos();
    crearIndicador();
    verificarEstado();
    setInterval(verificarEstado, CONFIG.checkInterval);
    console.log('✅ WasenderStatus inicializado');
  }
  
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
