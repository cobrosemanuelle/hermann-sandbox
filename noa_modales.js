console.log('🚀 NOA Modales cargado');

function validarEmail(email) {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());
}

function validarTelefono(telefono) {
    if (!telefono) return false;
    return String(telefono).replace(/\D/g, '').length >= 8;
}

window.detectarColumnas = function(datos) {
    if (!datos || datos.length === 0) return null;
    const cols = Object.keys(datos[0]);
    return {
        nombre:   cols.find(c => /asegurado|nombre|cliente|name|titular/i.test(c)),
        correo:   cols.find(c => /email|correo|mail|e-mail|electronico/i.test(c)),
        telefono: cols.find(c => /telefono|tel|phone|celular|movil|whatsapp/i.test(c)),
        poliza:   cols.find(c => /poliza|policy|contrato/i.test(c)),
        monto:    cols.find(c => /prima|monto|amount|total|saldo|cuota|pago|valor/i.test(c)),
        moneda:   cols.find(c => /moneda|currency|divisa/i.test(c)),
        desde:    cols.find(c => /desde|inicio|vigencia.*desde|start/i.test(c)),
        hasta:    cols.find(c => /hasta|fin|vencimiento|vigencia.*hasta|end/i.test(c))
    };
};

window.identificarClientesConProblemas = function() {
    if (!window.datosReales || window.datosReales.length === 0) return null;
    const columnas = window.detectarColumnas(window.datosReales);
    if (!columnas) return null;

    const problemas = { sinEmail: [], sinTelefono: [], sinMonto: [], polizasDuplicadas: [] };
    
    // Detectar pólizas duplicadas
    const polizaCount = {};
    window.datosReales.forEach(c => {
        if (c.poliza) polizaCount[c.poliza] = (polizaCount[c.poliza] || 0) + 1;
    });
    const polizasDup = Object.entries(polizaCount).filter(([p, n]) => n > 1).map(([p]) => p);
    
    window.datosReales.forEach((cliente, index) => {
        if (polizasDup.includes(cliente.poliza)) {
            problemas.polizasDuplicadas.push({ ...cliente, _index: index });
        }
    });

    window.datosReales.forEach((cliente, index) => {
        if (!validarEmail(cliente[columnas.correo]))
            problemas.sinEmail.push({ ...cliente, _index: index });
        if (!validarTelefono(cliente[columnas.telefono]))
            problemas.sinTelefono.push({ ...cliente, _index: index });
        if (columnas.monto) {
            const m = parseFloat(cliente[columnas.monto] || 0);
            if (!m || isNaN(m)) problemas.sinMonto.push({ ...cliente, _index: index });
        }
    });

    console.log('🔍 Problemas:', { sinEmail: problemas.sinEmail.length, sinTelefono: problemas.sinTelefono.length, sinMonto: problemas.sinMonto.length });
    return { problemas, columnas };
};

window.clientesActuales = [];
window.indiceActual = 0;
window.tipoProblemaActual = '';

// abrirModalListaClientes definida en noa_modales_clientes.js

function mostrarFormularioEdicion() {
    if (window.indiceActual >= window.clientesActuales.length) {
        alert('✅ Todos los clientes han sido procesados');
        cerrarModalEdicion();
        return;
    }

    const cliente = window.clientesActuales[window.indiceActual];
    const cols = window.columnasMapeadas;
    const nombre   = (cliente[cols.nombre]   || '').replace(/"/g,'');
    const email    = (cliente[cols.correo]   || '').replace(/"/g,'');
    const telefono = (cliente[cols.telefono] || '').replace(/"/g,'');
    const poliza   = (cliente[cols.poliza]   || '').replace(/"/g,'');
    const monto    = parseFloat(cliente[cols.monto] || 0) || 0;
    const tipo     = window.tipoProblemaActual;
    const prog     = (window.indiceActual + 1) + '/' + window.clientesActuales.length;

    let titulo = '', campos = '';

    if (tipo === 'telefono') {
        titulo = '📱 Agregar Teléfono (' + prog + ')';
        campos = campo('Nombre', '<input type="text" value="' + nombre + '" disabled style="width:100%;padding:10px;border:2px solid #ddd;border-radius:5px;background:#f5f5f5;">') +
                 campo('Teléfono', '<input type="tel" id="edit-telefono" value="' + telefono + '" placeholder="88888888" style="width:100%;padding:10px;border:2px solid #ddd;border-radius:5px;">');
    } else if (tipo === 'email') {
        titulo = '📧 Agregar Email (' + prog + ')';
        campos = campo('Nombre', '<input type="text" value="' + nombre + '" disabled style="width:100%;padding:10px;border:2px solid #ddd;border-radius:5px;background:#f5f5f5;">') +
                 campo('Email', '<input type="email" id="edit-email" value="' + email + '" placeholder="ejemplo@correo.com" style="width:100%;padding:10px;border:2px solid #ddd;border-radius:5px;">');
    } else if (tipo === 'corregir') {
        titulo = '📋 Corregir Datos (' + prog + ')';
        campos = campo('Nombre', '<input type="text" id="edit-nombre" value="' + nombre + '" style="width:100%;padding:10px;border:2px solid #ddd;border-radius:5px;">') +
                 campo('Email', '<input type="email" id="edit-email" value="' + email + '" placeholder="ejemplo@correo.com" style="width:100%;padding:10px;border:2px solid #ddd;border-radius:5px;">') +
                 campo('Teléfono', '<input type="tel" id="edit-telefono" value="' + telefono + '" placeholder="88888888" style="width:100%;padding:10px;border:2px solid #ddd;border-radius:5px;">');
    } else if (tipo === 'actualizar') {
        titulo = '💰 Actualizar Monto (' + prog + ')';
        campos = campo('Nombre', '<input type="text" value="' + nombre + '" disabled style="width:100%;padding:10px;border:2px solid #ddd;border-radius:5px;background:#f5f5f5;">') +
                 campo('Póliza', '<input type="text" value="' + poliza + '" disabled style="width:100%;padding:10px;border:2px solid #ddd;border-radius:5px;background:#f5f5f5;">') +
                 campo('Monto/Prima', '<input type="number" id="edit-monto" value="' + monto + '" placeholder="0.00" style="width:100%;padding:10px;border:2px solid #ddd;border-radius:5px;">');
    }

    const overlay = document.createElement('div');
    overlay.id = 'modal-edicion-overlay';
    overlay.className = 'modal-overlay-razones';
    overlay.onclick = e => { if (e.target === overlay) cerrarModalEdicion(); };

    const modal = document.createElement('div');
    modal.className = 'modal-content-razones';
    modal.style.maxWidth = '600px';
    modal.onclick = e => e.stopPropagation();
    modal.innerHTML = '<h2 style="color:#1e3a8a;margin:0 0 20px 0;">' + titulo + '</h2>' +
        campos +
        '<div style="display:flex;gap:10px;margin-top:20px;">' +
        '<button onclick="guardarYContinuar()" style="flex:1;padding:12px;background:#3b82f6;color:white;border:none;border-radius:8px;cursor:pointer;font-size:16px;">✓ Guardar y Continuar</button>' +
        '<button onclick="saltarCliente()" style="flex:1;padding:12px;background:#f59e0b;color:white;border:none;border-radius:8px;cursor:pointer;font-size:16px;">⏭️ Saltar</button>' +
        '<button onclick="cerrarModalEdicion()" style="padding:12px 20px;background:#ef4444;color:white;border:none;border-radius:8px;cursor:pointer;font-size:16px;">✕</button>' +
        '</div>' +
        '<div style="margin-top:15px;padding:10px;background:#f0f9ff;border-radius:5px;text-align:center;font-size:14px;color:#666;">Progreso: ' + (window.indiceActual + 1) + ' de ' + window.clientesActuales.length + ' clientes</div>';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}

function campo(label, input) {
    return '<div style="margin:15px 0;"><label style="display:block;font-weight:bold;margin-bottom:5px;">' + label + ':</label>' + input + '</div>';
}

window.guardarYContinuar = function() {
    const cliente = window.clientesActuales[window.indiceActual];
    const cols = window.columnasMapeadas;
    const indexReal = cliente._index;
    const tipo = window.tipoProblemaActual;

    if (tipo === 'telefono') {
        const val = document.getElementById('edit-telefono');
        if (val) window.datosReales[indexReal][cols.telefono] = val.value;
    } else if (tipo === 'email') {
        const val = document.getElementById('edit-email');
        if (val) window.datosReales[indexReal][cols.correo] = val.value;
    } else if (tipo === 'corregir') {
        const n = document.getElementById('edit-nombre');
        const e = document.getElementById('edit-email');
        const t = document.getElementById('edit-telefono');
        if (n) window.datosReales[indexReal][cols.nombre] = n.value;
        if (e) window.datosReales[indexReal][cols.correo] = e.value;
        if (t) window.datosReales[indexReal][cols.telefono] = t.value;
    } else if (tipo === 'actualizar') {
        const val = document.getElementById('edit-monto');
        if (val) window.datosReales[indexReal][cols.monto] = val.value;
    }

    cerrarModalEdicion();
    window.indiceActual++;
    if (window.indiceActual < window.clientesActuales.length) {
        setTimeout(() => mostrarFormularioEdicion(), 300);
    } else {
        alert('✅ ¡Todos los clientes han sido actualizados!');
        if (typeof window.actualizarContadoresProblemas === 'function') window.actualizarContadoresProblemas();
    }
};

window.saltarCliente = function() {
    cerrarModalEdicion();
    window.indiceActual++;
    if (window.indiceActual < window.clientesActuales.length) {
        setTimeout(() => mostrarFormularioEdicion(), 300);
    } else {
        alert('✅ Proceso completado');
    }
};

window.cerrarModalEdicion = function() {
    const o = document.getElementById('modal-edicion-overlay');
    if (o) o.remove();
};

window.filtrarPorSemaforo = function(color) {
    if (!window.datosReales || window.datosReales.length === 0) { alert('⚠️ No hay datos cargados.'); return; }
    const columnas = window.detectarColumnas(window.datosReales);
    if (!columnas) return;
    function diasHasta(fechaDesde) {
        if (!fechaDesde) return 999;
        let fecha;
        if (String(fechaDesde).includes('/')) { const p = fechaDesde.split('/'); fecha = new Date(p[2], p[1]-1, p[0]); }
        else fecha = new Date(fechaDesde);
        const hoy = new Date(); hoy.setHours(0,0,0,0); fecha.setHours(0,0,0,0);
        return Math.floor((fecha - hoy) / 86400000);
    }
    const filtrados = window.datosReales.map((c,i) => ({...c, _index:i, _dias:diasHasta(c.desde_cobro||c[columnas.desde]||c.desde)}))
        .filter(c => color==='verde'?c._dias>10:color==='amarillo'?(c._dias>=0&&c._dias<=10):c._dias<0);
    if (!filtrados.length) { alert('ℹ️ No hay clientes en estado: ' + color.toUpperCase()); return; }
    window.clientesActuales = filtrados;
    window.indiceActual = 0;
    window.tipoProblemaActual = 'corregir';
    window.columnasMapeadas = columnas;
    mostrarFormularioEdicion();
};

window.actualizarContadoresProblemas = function(limpiar = false) {
    const ids = ['count-contacto-erroneo','count-no-responde-mora','count-saldo-incorrecto','count-sin-contacto','count-saldo-invalido','count-no-responde','count-sin-telefono','count-sin-email'];
    if (limpiar || !window.datosReales || window.datosReales.length === 0) {
        ids.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '(0)'; });
        return;
    }
    const r = window.identificarClientesConProblemas();
    if (!r) return;
    const { problemas } = r;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = '(' + val + ')'; };
    set('count-sin-telefono', problemas.sinTelefono.length);
    set('count-sin-email', problemas.sinEmail.length);
    set('count-saldo-incorrecto', problemas.sinMonto.length);
    set('count-sin-contacto', problemas.sinTelefono.length);
    set('count-contacto-erroneo', problemas.sinEmail.length);
    set('count-saldo-invalido', problemas.sinMonto.length);
    set('count-polizas-duplicadas', problemas.polizasDuplicadas.length);
};

window.actualizarComparativoCobros = async function() {
    try {
        const E = window.NOA_ESTADO;
        if (!E) return;
        // La meta ($150,000 / ₡30,000,000) y su barra de avance eran valores fijos del sistema original, no datos de Emmanuel:
        // se ocultan hasta que ella defina una meta propia.
        document.querySelectorAll('.comparativo-monedas span').forEach(function (sp) {
            if (/Meta:/.test(sp.textContent || '')) sp.style.display = 'none';
        });
        const barra = document.querySelector('.meta-bar-container');
        if (barra) barra.style.display = 'none';

        const u = (typeof getUserNOA === 'function') ? await getUserNOA() : null;
        if (!u) return;
        const resp = await fetch('/api/pagos?user_id=' + encodeURIComponent(u.id));
        const datos = await resp.json();
        if (!resp.ok || !datos || datos.success === false) throw new Error((datos && datos.error) || ('Error ' + resp.status));
        const pagos = datos.pagos || [];
        const dosDig = n => String(n).padStart(2, '0');
        const mesDe = f => { const p = E.parseFecha(f); return p ? p.y + '-' + dosDig(p.m) : null; };
        const esDM = r => { const t = String(r.periodicidad || '').toLowerCase(); const m = String(r.medio_cobro || '').toLowerCase(); return t.indexOf('deducci') !== -1 || t === 'dm' || m.indexOf('deducci') !== -1 || m.indexOf('tarjeta autorizada') !== -1; }; /*NOA_DM_MEDIO*/

        // Selector con los meses que tienen pagos registrados
        const selector = document.getElementById('comparativo-mes-selector');
        const abreviados = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        if (selector) {
            const meses = Array.from(new Set(pagos.map(p => mesDe(p.fecha_pago)).filter(Boolean))).sort().reverse();
            const valorActual = selector.value;
            selector.innerHTML = '<option value="actual">Mes actual</option>' + meses.map(function (m) {
                const p = m.split('-');
                const sel = (valorActual !== 'actual' && valorActual === m) ? 'selected' : '';
                return '<option value="' + m + '" ' + sel + '>' + abreviados[parseInt(p[1], 10) - 1] + ' ' + p[0] + '</option>';
            }).join('');
        }
        const selVal = selector ? selector.value : 'actual';
        let mes, anio;
        if (selVal === 'actual' || selVal.indexOf('-') === -1) { const h = E.hoyCR(); mes = h.m; anio = h.y; }
        else { const p = selVal.split('-'); anio = parseInt(p[0], 10); mes = parseInt(p[1], 10); }
        const claveMes = anio + '-' + dosDig(mes);

        // Cobrado: pagos registrados en ese mes
        let cobradoUSD = 0, cobradoCRC = 0, porCobrarUSD = 0, porCobrarCRC = 0;
        pagos.forEach(function (p) {
            if (mesDe(p.fecha_pago) !== claveMes) return;
            const v = parseFloat(p.monto_pagado) || 0;
            if (String(p.moneda || 'CRC').toUpperCase().indexOf('USD') !== -1) cobradoUSD += v; else cobradoCRC += v;
        });
        // Por cobrar: lo que vence en ese mes y todavia no tiene pago registrado para ese periodo (Deduccion Mensual aparte)
        const pagado = {};
        pagos.forEach(function (p) { const f = E.parseFecha(p.periodo_hasta); if (f) pagado[String(p.cliente_id) + '|' + f.iso] = true; });
        (window._datosRealesBackup || window.datosReales || []).forEach(function (c) {
            if (esDM(c)) return;
            const f = E.parseFecha(c.desde_cobro);
            if (!f || f.y !== anio || f.m !== mes) return;
            if (pagado[String(c.id) + '|' + f.iso]) return;
            const v = parseFloat(c.prima || 0) || 0;
            if (String(c.moneda || 'CRC').toUpperCase().indexOf('USD') !== -1) porCobrarUSD += v; else porCobrarCRC += v;
        });
        const s = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        s('cobrado-usd', '$' + cobradoUSD.toLocaleString('es-CR',{minimumFractionDigits:2,maximumFractionDigits:2}));
        s('cobrado-crc', '₡' + cobradoCRC.toLocaleString('es-CR',{minimumFractionDigits:2,maximumFractionDigits:2}));
        s('porcobrar-usd', '$' + porCobrarUSD.toLocaleString('es-CR',{minimumFractionDigits:2,maximumFractionDigits:2}));
        s('porcobrar-crc', '₡' + porCobrarCRC.toLocaleString('es-CR',{minimumFractionDigits:2,maximumFractionDigits:2}));
        const nombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        s('mes-comparativo', nombres[mes - 1] + ' ' + anio);
        console.log('💰 Comparativo actualizado:', { cobradoUSD: cobradoUSD, cobradoCRC: cobradoCRC, porCobrarUSD: porCobrarUSD, porCobrarCRC: porCobrarCRC });
    } catch (e) { console.error('Error comparativo:', e); }
};

console.log('✅ NOA Modales listo');

// Top Razones ahora se recalcula desde NOA_RENDER_CARTERA (cartera_fields.js) cada vez que hay datos reales,
// en vez de un setTimeout ciego que podia adelantarse o quedar pegado con datos viejos.

// =====================================================
// MODAL DE MENSAJE PERSONALIZADO (reemplaza prompt)
// =====================================================
window.mostrarModalMensaje = function(titulo, mensajeDefault, callback) {
    const modal = document.createElement('div');
    modal.id = 'modal-mensaje-wa';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:10000;display:flex;justify-content:center;align-items:center;';
    modal.innerHTML = `
        <div style="background:#1F2937;border-radius:16px;width:95%;max-width:560px;padding:25px;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
                <h3 style="color:#fff;margin:0;font-size:1.1em;">✉️ ${titulo}</h3>
                <button onclick="document.getElementById('modal-mensaje-wa').remove()" style="background:#EF4444;color:#fff;border:none;padding:6px 12px;border-radius:8px;cursor:pointer;">✕</button>
            </div>
            <div style="margin-bottom:15px;">
                <label style="color:#94A3B8;font-size:13px;display:block;margin-bottom:8px;">Mensaje:</label>
                <textarea id="modal-mensaje-texto" style="width:100%;height:160px;background:#111827;border:1px solid #334155;border-radius:8px;color:#fff;padding:12px;font-size:14px;resize:vertical;box-sizing:border-box;line-height:1.6;">${mensajeDefault}</textarea>
            </div>
            <div style="display:flex;gap:12px;">
                <button onclick="document.getElementById('modal-mensaje-wa').remove()" style="flex:1;background:#334155;color:#fff;border:none;padding:12px;border-radius:10px;cursor:pointer;font-weight:600;">Cancelar</button>
                <button id="modal-mensaje-enviar" style="flex:2;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border:none;padding:12px;border-radius:10px;cursor:pointer;font-size:15px;font-weight:600;">📤 Enviar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('modal-mensaje-enviar').onclick = function() {
        const texto = document.getElementById('modal-mensaje-texto').value.trim();
        if (!texto) return;
        modal.remove();
        callback(texto);
    };
};
