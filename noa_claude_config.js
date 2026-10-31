// NOA Claude AI Config
window.NOA_CLAUDE = {
  getKey: function() {
    return localStorage.getItem('noa_claude_api_key') || (typeof CONFIG !== 'undefined' ? CONFIG.ANTHROPIC_API_KEY : '') || '';
  },
  setKey: function(key) {
    localStorage.setItem('noa_claude_api_key', key);
  },
  hasKey: function() {
    return !!(localStorage.getItem('noa_claude_api_key') || (typeof CONFIG !== 'undefined' ? CONFIG.ANTHROPIC_API_KEY : ''));
  }
};

// Auto-sembrar desde CONFIG si no hay key guardada
if (!localStorage.getItem('noa_claude_api_key') && typeof CONFIG !== 'undefined' && CONFIG.ANTHROPIC_API_KEY) {
  localStorage.setItem('noa_claude_api_key', CONFIG.ANTHROPIC_API_KEY);
  console.log('✅ API Key Claude sembrada desde CONFIG');
}

console.log('✅ noa_claude_config.js cargado');
