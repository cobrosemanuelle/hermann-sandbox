// VISTA DE CARDS PREMIUM PARA CARTERA
window.renderClienteCard = function(cliente, index) {
  const isPagado = cliente._pagado;
  const badge = isPagado 
    ? '<span class="cliente-badge badge-pagado">✓ Pagado</span>'
    : '<span class="cliente-badge badge-pendiente">⏳ Pendiente</span>';
  
  const desde = cliente.desde || 'N/A';
  const hasta = cliente.hasta || 'N/A';
  const prima = cliente.prima || '0';
  const moneda = cliente.moneda || 'CRC';
  
  return `
    <div class="cliente-card fade-in-up" style="animation-delay: ${index * 0.05}s">
      <div class="cliente-card-header">
        <div class="cliente-nombre">
          <input type="checkbox" class="cliente-checkbox" data-id="${cliente.id}" data-email="${cliente.correo || ''}" style="margin-right: 8px;">
          ${cliente.asegurado || 'Sin nombre'}
        </div>
        ${badge}
      </div>
      
      <div class="cliente-info">
        <div class="info-item">
          <span class="info-label">Póliza</span>
          <span class="info-value">${cliente.poliza || 'N/A'}</span>
        </div>
        
        <div class="info-item">
          <span class="info-label">Desde</span>
          <span class="info-value">${desde}</span>
        </div>
        
        <div class="info-item">
          <span class="info-label">Hasta</span>
          <span class="info-value">${hasta}</span>
        </div>
        
        <div class="info-item">
          <span class="info-label">Prima</span>
          <span class="info-value">${moneda} ${prima}</span>
        </div>
        
        <div class="info-item">
          <span class="info-label">Aseguradora</span>
          <span class="info-value">${cliente.aseguradora || 'N/A'}</span>
        </div>
        
        <div class="info-item">
          <span class="info-label">Contacto</span>
          <span class="info-value">
            ${cliente.telefono ? '📱 ' + cliente.telefono : ''}
            ${cliente.correo ? '<br>📧 ' + cliente.correo : ''}
          </span>
        </div>
      </div>
      
      <div style="display: flex; gap: 8px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--noa-border);">
        ${!isPagado ? `<button class="noa-btn-premium" onclick="marcarPagado(${cliente.id})" style="flex: 1;">💰 Pagar</button>` : ''}
        <button class="noa-btn-premium" onclick="enviarWA(${cliente.id})" style="flex: 1; background: linear-gradient(135deg, #10b981, #059669);">📱 WhatsApp</button>
        <button class="noa-btn-premium" onclick="enviarEmail(${cliente.id})" style="flex: 1; background: linear-gradient(135deg, #8b5cf6, #7c3aed);">📧 Email</button>
      </div>
    </div>
  `;
};
