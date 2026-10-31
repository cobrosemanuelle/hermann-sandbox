// NOA EXPEDIENTE DE CLIENTE
// Notas de gestion (con historial, nunca se sobreescriben), "Poliza no renueva", envios recientes
// y comprobantes de pago (Vercel Blob privado). Todo contra Neon por medio de /api/expediente.
// Regla NOA: nada se inventa, nada se borra, todo queda en historial.

(function() {

const API = '/api/expediente';
const MAX_BYTES = 4 * 1024 * 1024;
const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function esc(t) {
    return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function buscarCliente(id) {
    return (window.datosReales || []).find(x => String(x.id) === String(id));
}

async function pedir(url, opciones) {
    const resp = await fetch(url, opciones);
    let datos = null;
    try { datos = await resp.json(); } catch (e) { datos = null; }
    if (resp.status === 413) throw new Error('El archivo es demasiado grande (maximo 4 MB)');
    if (!resp.ok || !datos || datos.success === false) throw new Error((datos && datos.error) || ('Error ' + resp.status));
    return datos;
}

function agruparPorMes(items, campoFecha, renderItem, mensajeVacio) {
    if (!items || items.length === 0) {
        return '<div style="color:#64748b;font-size:13px;text-align:center;padding:14px;">' + mensajeVacio + '</div>';
    }
    const grupos = new Map();
    items.forEach(item => {
        const fechaObj = new Date(item[campoFecha]);
        const clave = fechaObj.getFullYear() + '-' + String(fechaObj.getMonth()).padStart(2, '0');
        if (!grupos.has(clave)) grupos.set(clave, { fechaObj, items: [] });
        grupos.get(clave).items.push(item);
    });
    const clavesOrdenadas = Array.from(grupos.keys()).sort().reverse();
    return clavesOrdenadas.map((clave, idx) => {
        const grupo = grupos.get(clave);
        const etiqueta = MESES_ES[grupo.fechaObj.getMonth()] + ' ' + grupo.fechaObj.getFullYear();
        const itemsHtml = grupo.items.map(item => {
            const fecha = new Date(item[campoFecha]).toLocaleString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            return renderItem(item, fecha);
        }).join('');
        return '<details' + (idx === 0 ? ' open' : '') + ' style="margin-bottom:6px;">'
            + '<summary style="cursor:pointer;color:#38BDF8;font-size:13px;font-weight:600;padding:6px 4px;user-select:none;">' + etiqueta + ' (' + grupo.items.length + ')</summary>'
            + '<div style="padding-top:6px;">' + itemsHtml + '</div>'
            + '</details>';
    }).join('');
}

async function cargarNotas(clienteId) {
    try {
        const datos = await pedir(API + '?action=notas&cliente_id=' + encodeURIComponent(clienteId));
        return datos.notas || [];
    } catch (e) {
        console.error('Error cargando notas:', e);
        return [];
    }
}

async function agregarNota(clienteId, texto) {
    try {
        const user = await getUserNOA();
        await pedir(API + '?action=nota', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: user ? user.id : '', cliente_id: String(clienteId), nota: texto })
        });
        return true;
    } catch (e) {
        console.error('Error guardando nota:', e);
        alert('No se pudo guardar la nota: ' + e.message);
        return false;
    }
}

async function cargarComprobantes(clienteId) {
    try {
        const datos = await pedir(API + '?action=comprobantes&cliente_id=' + encodeURIComponent(clienteId));
        return datos.comprobantes || [];
    } catch (e) {
        console.error('Error cargando comprobantes:', e);
        return [];
    }
}

// Las fotos se reducen antes de subir para que quepan en el limite de 4 MB por archivo.
function comprimirImagen(file) {
    return new Promise(function(resolve, reject) {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = function() {
            URL.revokeObjectURL(url);
            const maxLado = 1800;
            const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * escala);
            canvas.height = Math.round(img.height * escala);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(function(blob) {
                if (!blob) { reject(new Error('No se pudo leer la imagen')); return; }
                if (blob.size <= MAX_BYTES) { resolve(blob); return; }
                canvas.toBlob(function(b2) {
                    if (b2 && b2.size <= MAX_BYTES) resolve(b2);
                    else reject(new Error('La imagen sigue pesando mas de 4 MB'));
                }, 'image/jpeg', 0.5);
            }, 'image/jpeg', 0.82);
        };
        img.onerror = function() {
            URL.revokeObjectURL(url);
            reject(new Error('No se pudo abrir la imagen'));
        };
        img.src = url;
    });
}

async function subirComprobante(clienteId, file) {
    try {
        const user = await getUserNOA();
        let cuerpo = file;
        let tipo = file.type || 'application/octet-stream';
        let nombre = file.name || 'comprobante';
        if (tipo.indexOf('image/') === 0) {
            cuerpo = await comprimirImagen(file);
            tipo = 'image/jpeg';
            nombre = nombre.replace(/\.[^.]+$/, '') + '.jpg';
        } else if (file.size > MAX_BYTES) {
            throw new Error('El archivo pesa mas de 4 MB. Comprimalo o subalo como foto.');
        }
        const url = API + '?action=comprobante&cliente_id=' + encodeURIComponent(clienteId)
            + '&user_id=' + encodeURIComponent(user ? user.id : '')
            + '&nombre=' + encodeURIComponent(nombre)
            + '&tipo=' + encodeURIComponent(tipo);
        await pedir(url, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: cuerpo });
        return true;
    } catch (e) {
        console.error('Error subiendo comprobante:', e);
        alert('No se pudo subir el comprobante: ' + e.message);
        return false;
    }
}

async function togglePolizaNoRenueva(clienteId, nuevoValor) {
    try {
        await pedir(API + '?action=no-renueva', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cliente_id: String(clienteId), valor: nuevoValor })
        });
        const r = buscarCliente(clienteId);
        if (r) r.poliza_no_renueva = nuevoValor;
        return true;
    } catch (e) {
        console.error('Error actualizando estado:', e);
        alert('No se pudo actualizar: ' + e.message);
        return false;
    }
}

async function renderModal(clienteId) {
    const r = buscarCliente(clienteId);
    if (!r) { alert('Cliente no encontrado'); return; }
    const viejo = document.getElementById('modal-expediente-cliente');
    if (viejo) viejo.remove();

    const nombre = r.asegurado || 'Cliente';
    const noRenuevaActual = r.poliza_no_renueva === true;

    const notas = await cargarNotas(clienteId);
    const comprobantes = await cargarComprobantes(clienteId);
    const historialEnviosResult = window.obtenerHistorialCliente ? await window.obtenerHistorialCliente(clienteId) : { data: [] };
    const historialEnvios = (historialEnviosResult && historialEnviosResult.data) || [];

    const notasHtml = agruparPorMes(notas, 'created_at', (n, fecha) => {
        return '<div style="border-left:3px solid #0EA5E9;padding:8px 12px;margin-bottom:8px;background:#111827;border-radius:6px;">'
            + '<div style="color:#64748b;font-size:11px;margin-bottom:4px;">' + fecha + '</div>'
            + '<div style="color:#fff;font-size:13px;white-space:pre-wrap;">' + esc(n.nota) + '</div></div>';
    }, 'Sin notas todavía');

    const comprobantesHtml = agruparPorMes(comprobantes, 'created_at', (c, fecha) => {
        return '<div class="comp-item" data-ruta="' + esc(c.storage_path) + '" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#111827;border-radius:6px;margin-bottom:6px;">'
            + '<span style="color:#38BDF8;font-size:13px;text-decoration:underline;">📎 ' + esc(c.nombre_archivo || 'archivo') + '</span>'
            + '<span style="color:#64748b;font-size:11px;">' + fecha + '</span></div>';
    }, 'Sin comprobantes todavía');

    const enviosHtml = agruparPorMes(historialEnvios, 'fecha_envio', (e, fecha) => {
        const ok = e.estado === 'enviado';
        const icono = e.canal === 'whatsapp' ? '📱' : '📧';
        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 12px;background:#111827;border-radius:6px;margin-bottom:5px;">'
            + '<span style="color:#fff;font-size:13px;">' + icono + ' ' + (e.canal === 'whatsapp' ? 'WhatsApp' : 'Email') + (ok ? ' ✅' : ' ❌') + '</span>'
            + '<span style="color:#64748b;font-size:11px;">' + fecha + '</span></div>';
    }, 'Sin envíos registrados todavía');

    const modal = document.createElement('div');
    modal.id = 'modal-expediente-cliente';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:10000;display:flex;justify-content:center;align-items:center;';
    modal.innerHTML = '<div style="background:#1F2937;border-radius:16px;width:95%;max-width:520px;max-height:88vh;overflow-y:auto;padding:25px;box-shadow:0 20px 60px rgba(0,0,0,0.5);">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">'
        + '<h3 style="color:#fff;margin:0;font-size:1.1em;">📁 Expediente - ' + esc(nombre) + '</h3>'
        + '<button onclick="document.getElementById(\'modal-expediente-cliente\').remove()" style="background:#EF4444;color:#fff;border:none;padding:6px 12px;border-radius:8px;cursor:pointer;">✕</button>'
        + '</div>'
        + '<div style="display:flex;align-items:center;justify-content:space-between;background:#111827;border-radius:10px;padding:12px 14px;margin-bottom:20px;">'
        + '<span style="color:#fff;font-size:14px;font-weight:600;">🚫 Póliza no renueva</span>'
        + '<label style="position:relative;display:inline-block;width:46px;height:26px;">'
        + '<input type="checkbox" id="chk-no-renueva" ' + (noRenuevaActual ? 'checked' : '') + ' style="opacity:0;width:0;height:0;">'
        + '<span id="switch-no-renueva" style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:' + (noRenuevaActual ? '#EF4444' : '#334155') + ';border-radius:26px;transition:.2s;"></span>'
        + '<span id="switch-no-renueva-knob" style="position:absolute;height:20px;width:20px;left:' + (noRenuevaActual ? '23px' : '3px') + ';bottom:3px;background:#fff;border-radius:50%;transition:.2s;box-shadow:0 1px 3px rgba(0,0,0,0.4);pointer-events:none;"></span>'
        + '</label></div>'
        + '<div style="margin-bottom:20px;">'
        + '<label style="color:#F1F5F9;font-size:14px;font-weight:700;display:block;margin-bottom:10px;">📝 Nueva nota:</label>'
        + '<textarea id="txt-nueva-nota" placeholder="Ej: Cliente indica que paga el 15..." style="width:100%;height:70px;background:#111827;border:1px solid #334155;border-radius:8px;color:#fff;padding:10px;font-size:13px;resize:vertical;box-sizing:border-box;"></textarea>'
        + '<button id="btn-guardar-nota" style="margin-top:8px;width:100%;background:#0EA5E9;color:#fff;border:none;padding:10px;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;">Guardar nota</button>'
        + '</div>'
        + '<div style="margin-bottom:20px;">'
        + '<label style="color:#F1F5F9;font-size:14px;font-weight:700;display:block;margin-bottom:10px;">🗂️ Historial de notas:</label>'
        + '<div id="lista-notas">' + notasHtml + '</div></div>'
        + '<div style="margin-bottom:20px;">'
        + '<label style="color:#F1F5F9;font-size:14px;font-weight:700;display:block;margin-bottom:10px;">💬 Envíos recientes:</label>'
        + '<div id="lista-envios">' + enviosHtml + '</div></div>'
        + '<div>'
        + '<label style="color:#F1F5F9;font-size:14px;font-weight:700;display:block;margin-bottom:10px;">🧾 Comprobantes de pago:</label>'
        + '<div id="lista-comprobantes" style="margin-bottom:10px;">' + comprobantesHtml + '</div>'
        + '<input type="file" id="file-comprobante" accept="image/*,.pdf" style="display:none;">'
        + '<button id="btn-subir-comprobante" style="width:100%;background:#334155;color:#fff;border:none;padding:10px;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;">📤 Subir comprobante</button>'
        + '</div></div>';
    document.body.appendChild(modal);

    modal.querySelectorAll('.comp-item').forEach(function(el) {
        el.onclick = function() { window.abrirComprobanteCliente(el.getAttribute('data-ruta')); };
    });

    document.getElementById('chk-no-renueva').onchange = async function(e) {
        const chk = e.target;
        const nuevo = chk.checked;
        const ok = await togglePolizaNoRenueva(clienteId, nuevo);
        if (!ok) { chk.checked = !nuevo; return; }
        document.getElementById('switch-no-renueva').style.background = nuevo ? '#EF4444' : '#334155';
        document.getElementById('switch-no-renueva-knob').style.left = nuevo ? '23px' : '3px';
        if (typeof window.renderizarCartera === 'function') window.renderizarCartera();
    };

    document.getElementById('btn-guardar-nota').onclick = async function() {
        const texto = document.getElementById('txt-nueva-nota').value.trim();
        if (!texto) return;
        this.disabled = true; this.textContent = 'Guardando...';
        const ok = await agregarNota(clienteId, texto);
        if (ok) {
            renderModal(clienteId);
        } else {
            this.disabled = false; this.textContent = 'Guardar nota';
        }
    };

    document.getElementById('btn-subir-comprobante').onclick = function() {
        document.getElementById('file-comprobante').click();
    };
    document.getElementById('file-comprobante').onchange = async function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const btn = document.getElementById('btn-subir-comprobante');
        btn.disabled = true; btn.textContent = 'Subiendo...';
        const ok = await subirComprobante(clienteId, file);
        if (ok) {
            renderModal(clienteId);
        } else {
            btn.disabled = false; btn.textContent = '📤 Subir comprobante';
        }
    };
}

window.abrirExpedienteCliente = function(clienteId) {
    renderModal(clienteId);
};

window.abrirComprobanteCliente = function(storagePath) {
    window.open(API + '?action=abrir&path=' + encodeURIComponent(storagePath) + '&t=' + encodeURIComponent(window.NOA_TOKEN ? window.NOA_TOKEN() : ''), '_blank');
};

})();
