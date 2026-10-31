// Validacion y formato de lo que se escribe en las ventanas de Calidad de datos
window.noaValidarCampo = function(campo, valor) {
  var t = String(valor == null ? '' : valor).trim();
  if (campo === 'telefono') {
    var d = t.replace(/\D/g, '');
    if (d.length === 11 && d.indexOf('506') === 0) d = d.slice(3);
    if (d.length !== 8) return { ok: false, error: 'El teléfono debe tener 8 dígitos (ejemplo: 8888-8888).' };
    return { ok: true, valor: d, mostrar: d.slice(0, 4) + '-' + d.slice(4) };
  }
  if (campo === 'correo') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return { ok: false, error: 'El correo no parece válido (ejemplo: nombre@correo.com).' };
    return { ok: true, valor: t.toLowerCase(), mostrar: t.toLowerCase() };
  }
  if (campo === 'prima') {
    if (/-/.test(t)) return { ok: false, error: 'El monto no puede ser negativo.' };
    var n = t.replace(/[^\d.,]/g, '');
    var ult = Math.max(n.lastIndexOf(','), n.lastIndexOf('.'));
    if (ult !== -1 && n.length - ult - 1 <= 2) n = n.slice(0, ult).replace(/[.,]/g, '') + '.' + n.slice(ult + 1);
    else n = n.replace(/[.,]/g, '');
    var num = parseFloat(n);
    if (!(num > 0)) return { ok: false, error: 'Escriba un monto mayor que cero (ejemplo: 150 000,00).' };
    return { ok: true, valor: String(num), mostrar: num };
  }
  if (!t) return { ok: false, error: 'Ingrese un valor' };
  return { ok: true, valor: t, mostrar: t };
};

// Modal para agregar telefono/email a clientes
window.abrirModalListaClientes = function(tipo) {
  if (!window.datosReales || window.datosReales.length === 0) {
    alert('No hay datos cargados');
    return;
  }
  // Normalizar tipos para compatibilidad
  if (tipo === 'telefono') tipo = 'corregir';
  if (tipo === 'email') tipo = 'llamar';
  
  var clientesFiltrados = [];
  var titulo = '';
  var campo = '';
  if (tipo === 'corregir') {
    clientesFiltrados = window.datosReales.filter(function(c) { return typeof validarTelefono === 'function' ? !validarTelefono(c.telefono) : (!c.telefono || c.telefono === ''); });
    titulo = 'Agregar Telefono';
    campo = 'telefono';
  } else if (tipo === 'llamar') {
    clientesFiltrados = window.datosReales.filter(function(c) { return typeof validarEmail === 'function' ? !validarEmail(c.correo) : (!c.correo || c.correo === ''); });
    titulo = 'Agregar Email';
    campo = 'correo';
  } else if (tipo === 'borrar') {
    window.abrirModalBorrarCliente();
    return;
  } else if (tipo === 'actualizar') {
    clientesFiltrados = window.datosReales.filter(function(c) {
      var m = parseFloat(c.prima || 0);
      return isNaN(m) || m <= 0;
    });
    titulo = 'Monto Incorrecto';
    campo = 'prima';
  } else if (tipo === 'duplicadas') {
    var polizaCount = {};
    window.datosReales.forEach(function(c) {
      if (c.poliza) polizaCount[c.poliza] = (polizaCount[c.poliza] || 0) + 1;
    });
    clientesFiltrados = window.datosReales.filter(function(c) {
      return c.poliza && polizaCount[c.poliza] > 1;
    });
    titulo = 'Pólizas Duplicadas';
    campo = 'poliza';
  }
  if (clientesFiltrados.length === 0) {
    alert('No hay clientes pendientes');
    return;
  }
  var modal = document.createElement('div');
  modal.id = 'modal-lista-clientes';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);z-index:10000;display:flex;justify-content:center;align-items:center;';
  var html = '<div style="background:#f1f5f9;border-radius:14px;width:92%;max-width:640px;max-height:82vh;overflow-y:auto;padding:24px;">';
  html += '<div style="display:flex;justify-content:space-between;margin-bottom:20px;"><h2 style="color:#111827;font-size:18px;font-weight:700;margin:0;">' + titulo + '</h2>';
  html += '<button onclick="document.getElementById(\'modal-lista-clientes\').remove()" style="background:#e5e7eb;color:#374151;border:none;padding:8px 12px;border-radius:8px;cursor:pointer;">X</button></div>';
  html += '<div style="color:#64748b;font-size:13px;margin-bottom:14px;">Mostrando ' + Math.min(50, clientesFiltrados.length) + ' de ' + clientesFiltrados.length + '</div>';
  html += '<div id="lista-campos-modal">';
  html += '</div>';
  html += '</div>';
  modal.innerHTML = html;
  document.body.appendChild(modal);

  // Agregar filas con DOM puro para evitar problemas de escaping en onclick
  var contenedor = modal.querySelector('#lista-campos-modal');
  if (!contenedor) contenedor = modal.lastElementChild;

  clientesFiltrados.slice(0, 50).forEach(function(c) {
    var fila = document.createElement('div');
    fila.style.cssText = 'background:#fff;padding:14px 16px;border-radius:8px;border-left:4px solid #0d9488;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;gap:12px;';
    fila.className = 'noa-fila-campo';

    var info = document.createElement('div');
    var nombre = document.createElement('div');
    nombre.style.cssText = 'color:#111827;font-weight:600;';
    nombre.textContent = c.asegurado || 'Sin nombre';
    var polizaEl = document.createElement('div');
    polizaEl.style.cssText = 'color:#64748b;font-size:12px;';
    polizaEl.textContent = 'Póliza: ' + (c.poliza || 'N/A');
    info.appendChild(nombre);
    info.appendChild(polizaEl);

    var controles = document.createElement('div');
    controles.style.cssText = 'display:flex;gap:8px;align-items:center;';

    var input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Ingrese ' + campo;
    input.style.cssText = 'padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;color:#111827;width:180px;';

    var btn = document.createElement('button');
    btn.textContent = 'Guardar';
    btn.style.cssText = 'background:#0d9488;color:#fff;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;';
    btn.addEventListener('click', async function() {
      var valor = input.value.trim();
      if (!valor) { alert('Ingrese un valor'); return; }
      var ok = window.noaValidarCampo(campo, valor);
      if (!ok.ok) { alert(ok.error); return; }
      btn.disabled = true;
      var cambios = {}; cambios[campo] = ok.valor;
      var res = await window.actualizarClienteSupabase(c.id, cambios);
      btn.disabled = false;
      if (!res.success) { alert('No se pudo guardar: ' + res.error); return; }
      var clienteLocal = (window.datosReales || []).find(function(x) { return String(x.id) === String(c.id); });
      if (clienteLocal) clienteLocal[campo] = ok.mostrar;
      fila.style.display = 'none';
      if (typeof window.actualizarContadoresProblemas === 'function') window.actualizarContadoresProblemas();
      if (typeof window.renderizarCartera === 'function') window.renderizarCartera();
    });

    controles.appendChild(input);
    controles.appendChild(btn);
    fila.appendChild(info);
    fila.appendChild(controles);
    contenedor.appendChild(fila);
  });
};

window.guardarCampoCliente = async function(clienteId, campo, valor, boton) {
  var v = window.noaValidarCampo(campo, valor);
  if (!v.ok) { alert(v.error); return; }
  if (boton && boton.disabled !== undefined) boton.disabled = true;
  var cambios = {}; cambios[campo] = v.valor;
  var res = await window.actualizarClienteSupabase(clienteId, cambios);
  if (boton && boton.disabled !== undefined) boton.disabled = false;
  if (!res.success) { alert('No se pudo guardar: ' + res.error); return; }
  var cliente = (window.datosReales || []).find(function(c) { return String(c.id) === String(clienteId); });
  if (cliente) cliente[campo] = v.mostrar;
  var tarjeta = (boton && boton.closest) ? boton.closest('div[style*="border-left"]') : null;
  if (tarjeta) tarjeta.style.display = 'none';
  if (typeof window.actualizarContadoresProblemas === 'function') window.actualizarContadoresProblemas();
  if (typeof window.renderizarCartera === 'function') window.renderizarCartera();
};

window.abrirModalBorrarCliente = function() {
  if (!window.datosReales || window.datosReales.length === 0) {
    alert('No hay datos cargados');
    return;
  }
  var modal = document.createElement('div');
  modal.id = 'modal-borrar-cliente';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);z-index:10000;display:flex;justify-content:center;align-items:center;';
  var html = '<div style="background:#f1f5f9;border-radius:14px;width:92%;max-width:640px;max-height:82vh;overflow-y:auto;padding:24px;">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">';
  html += '<h2 style="color:#111827;font-size:18px;font-weight:700;margin:0;">🗑️ Archivar Asegurado</h2>';
  html += '<button onclick="document.getElementById(\'modal-borrar-cliente\').remove()" style="background:#e5e7eb;color:#374151;border:none;padding:8px 12px;border-radius:8px;cursor:pointer;">X</button></div>';
  html += '<div style="color:#92400e;font-size:13px;margin-bottom:16px;background:#fef3c7;padding:10px;border-radius:8px;">⚠️ El asegurado pasa a la papelera. No se borra permanentemente.</div>';
  html += '<input type="text" id="buscador-borrar" oninput="window.filtrarListaBorrar()" placeholder="🔍 Buscar por nombre o póliza..." style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#111827;margin-bottom:16px;box-sizing:border-box;">';
  html += '<div id="lista-borrar">';
  window.datosReales.slice(0, 50).forEach(function(c) {
    html += window._renderFilaBorrar(c);
  });
  html += '</div>';
  html += '<div style="margin-top:20px;border-top:1px solid #e2e8f0;padding-top:16px;">';
  html += '<button onclick="window.abrirPapelera()" style="background:#64748B;color:#fff;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:14px;">📦 Ver Papelera</button>';
  html += '</div></div>';
  modal.innerHTML = html;
  document.body.appendChild(modal);
};

window._renderFilaBorrar = function(c) {
  return '<div id="fila-' + c.id + '" style="background:#fff;padding:14px 16px;border-radius:8px;border-left:4px solid #0d9488;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;gap:12px;">' +
    '<div><div style="color:#111827;font-weight:600;">' + (c.asegurado || 'Sin nombre') + '</div>' +
    '<div style="color:#64748b;font-size:12px;">Póliza: ' + (c.poliza || 'N/A') + ' · ' + (c.aseguradora || '') + '</div></div>' +
    '<button onclick="window.confirmarBorrar(\'' + c.id + '\', \'' + (c.asegurado || 'Sin nombre').replace(/'/g, '') + '\')" style="background:#EF4444;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;font-size:13px;">Archivar</button>' +
    '</div>';
};

window.filtrarListaBorrar = function() {
  var txt = (document.getElementById('buscador-borrar').value || '').toLowerCase();
  var lista = document.getElementById('lista-borrar');
  if (!lista) return;
  var filtrados = window.datosReales.filter(function(c) {
    return (c.asegurado || '').toLowerCase().includes(txt) || (c.poliza || '').toLowerCase().includes(txt);
  });
  lista.innerHTML = filtrados.slice(0, 50).map(window._renderFilaBorrar).join('');
};

window.confirmarBorrar = function(clienteId, nombre) {
  if (!confirm('¿Archivar a ' + nombre + '?\n\nPodrás recuperarlo desde la Papelera.')) return;
  window.borrarClienteSupabase(clienteId).then(function(res) {
    if (res.success) {
      var fila = document.getElementById('fila-' + clienteId);
      if (fila) fila.remove();
      if (typeof window.renderizarCartera === 'function') window.renderizarCartera();
      if (typeof window.actualizarDashboard === 'function') window.actualizarDashboard();
    } else {
      alert('Error al archivar: ' + res.error);
    }
  });
};

window.abrirPapelera = async function() {
  var modal = document.createElement('div');
  modal.id = 'modal-papelera';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);z-index:10001;display:flex;justify-content:center;align-items:center;';
  modal.innerHTML = '<div style="background:#f1f5f9;border-radius:14px;width:92%;max-width:640px;padding:24px;"><div style="color:#374151;text-align:center;">Cargando papelera...</div></div>';
  document.body.appendChild(modal);
  var res = await window.cargarClientesBorrados();
  var borrados = (res.success ? res.clientes : []);
  var html = '<div style="background:#f1f5f9;border-radius:14px;width:92%;max-width:640px;max-height:82vh;overflow-y:auto;padding:24px;">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">';
  html += '<h2 style="color:#111827;font-size:18px;font-weight:700;margin:0;">📦 Papelera (' + borrados.length + ')</h2>';
  html += '<button onclick="document.getElementById(\'modal-papelera\').remove()" style="background:#e5e7eb;color:#374151;border:none;padding:8px 12px;border-radius:8px;cursor:pointer;">X</button></div>';
  if (borrados.length === 0) {
    html += '<div style="color:#64748b;text-align:center;padding:40px;">La papelera está vacía</div>';
  } else {
    borrados.forEach(function(c) {
      html += '<div id="papelera-fila-' + c.id + '" style="background:#fff;padding:14px 16px;border-radius:8px;border-left:4px solid #0d9488;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;gap:12px;">';
      html += '<div><div style="color:#111827;font-weight:600;">' + (c.asegurado || 'Sin nombre') + '</div>';
      html += '<div style="color:#64748b;font-size:12px;">Póliza: ' + (c.poliza || 'N/A') + ' · ' + (c.aseguradora || '') + '</div></div>';
      html += '<button onclick="window.confirmarRestaurar(\'' + c.id + '\', \'' + (c.asegurado || 'Sin nombre').replace(/'/g, '') + '\')" style="background:#0d9488;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;font-size:13px;">Restaurar</button>';
      html += '</div>';
    });
  }
  html += '</div>';
  modal.innerHTML = html;
};

window.confirmarRestaurar = function(clienteId, nombre) {
  if (!confirm('¿Restaurar a ' + nombre + ' a la cartera activa?')) return;
  window.restaurarClienteSupabase(clienteId).then(async function(res) {
    if (res.success) {
      var fila = document.getElementById('papelera-fila-' + clienteId);
      if (fila) fila.remove();
      var resultado = await window.cargarClientesSupabase();
      if (resultado.success) {
        window.datosReales = resultado.clientes;
        if (typeof window.renderizarCartera === 'function') window.renderizarCartera();
        if (typeof window.actualizarDashboard === 'function') window.actualizarDashboard();
      }
      alert('✅ ' + nombre + ' restaurado a la cartera.');
    } else {
      alert('Error al restaurar: ' + res.error);
    }
  });
};

console.log('noa_modales_clientes.js cargado');

// ─── MODAL SIN NOMBRE ────────────────────────────────────────────────────────
window.abrirModalSinNombre = function() {
  if (!window.datosReales || window.datosReales.length === 0) {
    alert('No hay datos cargados'); return;
  }
  var sinNombre = window.datosReales.filter(function(c) {
    var n = (c.asegurado || '').toString().trim();
    return !n || n === '?' || n.length < 3;
  });
  if (sinNombre.length === 0) {
    alert('✅ Todos los registros tienen nombre'); return;
  }
  var existente = document.getElementById('modal-sin-nombre');
  if (existente) existente.remove();

  var modal = document.createElement('div');
  modal.id = 'modal-sin-nombre';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);z-index:10000;display:flex;align-items:center;justify-content:center;';

  var html = '<div style="background:#f1f5f9;border-radius:14px;padding:24px;max-width:640px;width:92%;max-height:82vh;overflow-y:auto;">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">';
  html += '<div><div style="font-size:18px;font-weight:700;color:#dc2626;">⚠️ Registros Sin Nombre</div>';
  html += '<div style="font-size:13px;color:#64748b;">' + sinNombre.length + ' registros detectados · Corrija el nombre y presione Guardar</div></div>';
  html += '<div style="display:flex;gap:8px;">';
  html += '<button onclick="exportarProblemaExcel(\'sin_nombre\')" style="background:#10b981;color:#fff;border:none;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:13px;font-weight:600;">📥 Excel</button>';
  html += '<button onclick="document.getElementById(\'modal-sin-nombre\').remove()" style="background:#ef4444;color:#fff;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-size:13px;font-weight:600;">✕ Cerrar</button>';
  html += '</div></div>';
  html += '<div style="background:#fef2f2;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px;color:#b91c1c;font-weight:600;">Estos registros no tienen nombre — verifique el Excel original y corrija aquí o actualice desde el archivo fuente.</div>';

  sinNombre.slice(0, 50).forEach(function(c, i) {
    html += '<div style="background:#fff;border-radius:8px;padding:14px 16px;margin-bottom:10px;border-left:4px solid #ef4444;">';
    html += '<div style="color:#94a3b8;font-size:12px;margin-bottom:6px;">Póliza: <strong>' + (c.poliza || 'Sin póliza') + '</strong> · Tel: ' + (c.telefono || '—') + ' · Monto: ' + (c.prima || '—') + '</div>';
    html += '<div style="display:flex;gap:8px;align-items:center;">';
    html += '<input id="nombre-inp-' + i + '" type="text" placeholder="Escriba el nombre del asegurado" style="flex:1;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;">';
    html += '<button onclick="(function(){var n=document.getElementById(\'nombre-inp-' + i + '\').value.trim();if(!n){alert(\'Ingrese un nombre\');return;}guardarCampoCliente(\'' + (c.id||'') + '\',\'asegurado\',n,this);}).call(this)" style="background:#3b82f6;color:#fff;border:none;border-radius:6px;padding:8px 14px;cursor:pointer;font-size:13px;font-weight:600;">Guardar</button>';
    html += '</div></div>';
  });

  html += '</div>';
  modal.innerHTML = html;
  document.body.appendChild(modal);
};
