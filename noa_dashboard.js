// NOA DASHBOARD ACCIONABLE - datos de la base (Neon) con el ESTADO COMPARTIDO de Cartera.
// Misma regla de fechas (hora de Costa Rica) y mismo periodo de gracia (9 dias habiles) que Cartera y el semaforo,
// para que ninguna pantalla se contradiga. Deduccion Mensual queda aparte, igual que en Cartera.
(function () {
    'use strict';
    console.log('📊 NOA Dashboard cargando...');

    const norm = s => (s == null ? '' : String(s)).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const esDM = r => { const p = norm(r.periodicidad || ''); const m = norm(r.medio_cobro || ''); if (p.includes('deduccion mensual') || p === 'dm') return true; return m.includes('deduccion mensual') || m === 'tarjeta autorizada'; }; /*NOA_DM_MEDIO*/
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
    const ESTADO = () => window.NOA_ESTADO;
    const base = () => window._datosRealesBackup || window.datosReales || [];
    const seguro = async fn => { try { if (typeof fn === 'function') await fn(); } catch (e) { console.error(e); } };

    // Dias para el cobro (negativo = ya paso). Lee fechas planas (YYYY-MM-DD) o DD/MM/YYYY, en hora de Costa Rica.
    function calcularDiasParaVencer(fecha) {
        const E = ESTADO();
        if (!E || !fecha) return null;
        return E.diasHasta(fecha);
    }
    window.calcularDiasParaVencer = calcularDiasParaVencer;

    // ============================================
    // TARJETAS PRINCIPALES
    // ============================================
    function ponerTexto(idNumero, texto, titulo) {
        const n = document.getElementById(idNumero);
        if (!n) return null;
        const etiqueta = n.nextElementSibling;
        if (etiqueta && texto) etiqueta.textContent = texto;
        if (n.parentElement && titulo) n.parentElement.title = titulo;
        return n;
    }

    window.actualizarKPIsDashboard = function () {
        const E = ESTADO();
        const clientes = base();
        let canceladas = 0, vencenHoy = 0, dm = 0;
        if (E) {
            clientes.forEach(r => {
                if (esDM(r)) { dm++; return; }
                const e = E.estadoDe(r);
                if (e.clave === 'cancelada') canceladas++;
                else if (e.clave === 'pendiente' && e.dias === 0) vencenHoy++;
            });
        }
        const elC = ponerTexto('kpi-vencen-hoy', '🔴 Canceladas', 'Ver las pólizas canceladas (terminó el periodo de gracia)');
        const elH = ponerTexto('kpi-vencen-semana', '🟠 Vencen el día actual', 'Ver las pólizas que vencen hoy');
        const elT = ponerTexto('kpi-total-clientes', '👥 Total Clientes');
        if (elC) elC.textContent = canceladas;
        if (elH) elH.textContent = vencenHoy;
        if (elT) elT.textContent = clientes.length;
        const elV = document.getElementById('kpi-vencidos');
        if (elV) elV.textContent = canceladas;
        console.log('📊 KPIs actualizados:', { canceladas, vencenHoy, total: clientes.length, deduccionMensual: dm });
        return { canceladas: canceladas, vencenHoy: vencenHoy, total: clientes.length, deduccionMensual: dm };
    };

    // El semaforo vive en noa_semaforo.js (misma regla de estado)
    window.actualizarSemaforoDashboard = function () {
        if (typeof window.actualizarSemaforo === 'function') return window.actualizarSemaforo();
    };

    // ============================================
    // REQUIEREN ATENCION URGENTE: polizas en periodo de gracia, las mas cercanas a cancelarse
    // ============================================
    window.actualizarTop5Urgentes = async function () {
        try {
            const E = ESTADO();
            const contenedor = document.getElementById('top5-urgentes');
            if (!E || !contenedor) return [];
            const hoy = E.hoyCR();
            const DIAS_URGENTE = 3; let resto = 0; const habilesHasta = (iso, dias) => { let h = 0; const f = new Date(iso + 'T12:00:00'); for (let i = 0; i < dias; i++) { const d = new Date(f.getTime() - i * 86400000), w = d.getDay(); if (w !== 0 && w !== 6 && !(window.esFeriadoLeyCR && window.esFeriadoLeyCR(d))) h++; } return h; };
            const lista = [];
            base().forEach(r => {
                if (esDM(r)) return;
                const e = E.estadoDe(r);
                if (e.clave !== 'pendiente' || e.dias === null || e.dias >= 0) return;
                const lim = E.limiteDe(r, E.parseFecha(r.desde_cobro));
                if (!lim) return;
                if (lim.n !== hoy.n) { resto++; return; }
                lista.push({ id: String(r.id), cliente_nombre: r.asegurado || 'Sin nombre', poliza: r.poliza || '', limite: lim.iso, dias_para_cancelar: lim.n - hoy.n });
            });
            lista.sort((a, b) => (a.limite < b.limite ? -1 : (a.limite > b.limite ? 1 : 0)));
            const ver = window._urgTodos === true;
            const top5 = ver ? lista : lista.slice(0, 5);
            window.top5Urgentes = lista;
            if (top5.length === 0) {
                contenedor.innerHTML = '<p style="color:#0f766e;margin:0;">✅ Ninguna póliza está hoy en el día 10 del período de gracia</p>';
                return top5;
            }
            const mas = lista.length > 5 ? ' <a href="#" onclick="window._urgTodos=!window._urgTodos;window.actualizarTop5Urgentes();return false;" style="color:#0f766e;font-weight:600;margin-left:8px;">' + (ver ? 'Ver solo las 5 más urgentes' : 'Ver las ' + lista.length) + '</a>' : '';
            const intro = '<p style="color:#6b7280;font-size:12px;margin:0 0 8px 0;"><b style="color:#111827;">Pólizas 10 días hábiles - período de gracia</b>' + (ver || lista.length <= 5 ? '' : ' · mostrando las 5 primeras') + '.' + mas + '</p>';
            contenedor.innerHTML = intro + (ver ? '<div style="max-height:420px;overflow:auto;">' : '<div>') + top5.map((c, i) => {
    const hoyChip = c.dias_para_cancelar === 0;
    const cuando = hoyChip ? 'Último día: hoy' : 'Último día: ' + E.aDDMM(c.limite) + ' (en ' + c.dias_para_cancelar + (c.dias_para_cancelar === 1 ? ' día)' : ' días)');
    const chip = 'display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap;' + (hoyChip ? 'background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;' : 'background:#fef3c7;color:#92400e;border:1px solid #fcd34d;');
    return `<div style="display:grid;grid-template-columns:1.6fr 1fr auto auto;gap:12px;align-items:center;padding:10px 4px;border-bottom:1px solid #f1f5f9;">
        <span style="color:#111827;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(c.cliente_nombre)}</span>
        <span style="color:#6b7280;font-size:12px;">${esc(c.poliza)}</span>
        <span style="${chip}">${cuando}</span>
        <button onclick="window.cobrarUrgente(${i})" style="background:transparent;color:#60a5fa;border:1px solid #3b82f6;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;">Cobrar</button>
    </div>`;
}).join('') + '</div>';
            console.log('🚨 Atención urgente actualizada');
            return top5;
        } catch (error) {
            console.error('Error actualizando atención urgente:', error);
            return [];
        }
    };

    // ============================================
    // PENDIENTES DE NOTIFICAR: pendientes a 12 dias habiles (o menos) del vencimiento sin ningun aviso (correo ni WhatsApp)
    // ============================================
    const HABILES_AVISO = 12;
    const esHabil = d => { const w = d.getDay(); return w !== 0 && w !== 6 && !(window.esFeriadoLeyCR && window.esFeriadoLeyCR(d)); };
    const isoDe = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const fechaDe = iso => new Date(iso + 'T12:00:00');
    function habilesHasta(hoyIso, vencIso) {
        if (vencIso <= hoyIso) return 0;
        let n = 0; const d = fechaDe(hoyIso), fin = fechaDe(vencIso);
        for (let i = 0; i < 400 && d < fin; i++) { d.setDate(d.getDate() + 1); if (esHabil(d)) n++; }
        return n;
    }
    function inicioAviso(vencIso) {
        let n = 0; const d = fechaDe(vencIso);
        for (let i = 0; i < 60 && n < HABILES_AVISO; i++) { d.setDate(d.getDate() - 1); if (esHabil(d)) n++; }
        return isoDe(d);
    }
    window.noaPendientesNotificar = function (clientes, envios, hoyIso) {
        const E = ESTADO(); if (!E) return [];
        const hoy = hoyIso || E.hoyCR().iso;
        const porCliente = {};
        (envios || []).forEach(e => { if (!e || e.cliente_id == null) return; const k = String(e.cliente_id); const f = String(e.fecha || e.fecha_envio || '').slice(0, 10); if (f) (porCliente[k] = porCliente[k] || []).push(f); });
        const lista = [];
        (clientes || []).forEach(r => {
            if (esDM(r)) return;
            const e = E.estadoDe(r, hoy);
            if (e.clave !== 'pendiente') return;
            const venc = E.parseFecha(r.desde_cobro); if (!venc) return;
            const h = habilesHasta(hoy, venc.iso);
            if (h > HABILES_AVISO) return;
            const desde = inicioAviso(venc.iso);
            const avisado = (porCliente[String(r.id)] || []).some(f => f >= desde);
            if (avisado) return;
            lista.push({ id: String(r.id), cliente_nombre: r.asegurado || 'Sin nombre', poliza: r.poliza || '', vence: venc.iso, habiles: h, vencido: venc.iso < hoy });
        });
        lista.sort((a, b) => (a.vence < b.vence ? -1 : (a.vence > b.vence ? 1 : 0)));
        return lista;
    };
    let _enviosCache = { t: 0, datos: [] };
    async function cargarEnviosExitosos() {
        if (Date.now() - _enviosCache.t < 30000) return _enviosCache.datos;
        try { const resp = await fetch('/api/envios?action=contador'); const j = await resp.json(); if (resp.ok && j && j.success) _enviosCache = { t: Date.now(), datos: j.envios || [] }; } catch (e) { console.error('No se pudo leer el historial de envios:', e.message); }
        return _enviosCache.datos;
    }
    window.actualizarPendientesNotificar = async function () {
        try {
            const E = ESTADO();
            const cont = document.getElementById('pendientes-notificar');
            if (!E || !cont) return [];
            const envios = await cargarEnviosExitosos();
            const lista = window.noaPendientesNotificar(base(), envios);
            window.pendientesNotificar = lista;
            if (lista.length === 0) { cont.innerHTML = '<p style="color:#0f766e;margin:0;">✅ Todos los clientes dentro de los 12 días hábiles ya tienen aviso</p>'; return lista; }
            const ver = window._pendTodos === true;
            const mostrar = ver ? lista : lista.slice(0, 5);
            const mas = lista.length > 5 ? ' <a href="#" onclick="window._pendTodos=!window._pendTodos;window.actualizarPendientesNotificar();return false;" style="color:#0f766e;font-weight:600;margin-left:8px;">' + (ver ? 'Ver solo los 5 primeros' : 'Ver los ' + lista.length) + '</a>' : '';
            const intro = '<p style="color:#6b7280;font-size:12px;margin:0 0 8px 0;"><b style="color:#111827;">' + lista.length + (lista.length === 1 ? ' cliente' : ' clientes') + ' sin aviso</b> (ni correo ni WhatsApp) a 12 días hábiles o menos del vencimiento.' + mas + '</p>';
            cont.innerHTML = intro + (ver ? '<div style="max-height:420px;overflow:auto;">' : '<div>') + mostrar.map((c, i) => {
                const cuando = c.vencido ? 'Venció el ' + E.aDDMM(c.vence) : (c.habiles === 0 ? 'Vence hoy' : 'Vence el ' + E.aDDMM(c.vence) + ' (en ' + c.habiles + (c.habiles === 1 ? ' día hábil)' : ' días hábiles)'));
                const chip = 'display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap;' + (c.vencido ? 'background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;' : 'background:#fef3c7;color:#92400e;border:1px solid #fcd34d;');
                return '<div style="display:grid;grid-template-columns:1.6fr 1fr auto auto;gap:12px;align-items:center;padding:10px 4px;border-bottom:1px solid #f1f5f9;">' +
                    '<span style="color:#111827;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(c.cliente_nombre) + '</span>' +
                    '<span style="color:#6b7280;font-size:12px;">' + esc(c.poliza) + '</span>' +
                    '<span style="' + chip + '">' + cuando + '</span>' +
                    '<button onclick="window.notificarPendiente(' + i + ')" style="background:transparent;color:#60a5fa;border:1px solid #3b82f6;padding:5px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;">Notificar</button></div>';
            }).join('') + '</div>';
            return lista;
        } catch (error) { console.error('Error en pendientes de notificar:', error); return []; }
    };
    window.notificarPendiente = function (indice) {
        const c = (window.pendientesNotificar || [])[indice];
        if (!c) { alert('Error: No se encontró el cliente'); return; }
        const todos = window._datosRealesBackup || window.datosReales || [];
        const cliente = todos.find(x => String(x.id) === String(c.id));
        window._datosRealesBackup = todos;
        window.datosReales = cliente ? [cliente] : [];
        if (typeof cambiarTab === 'function') cambiarTab('cartera');
        setTimeout(function () {
            if (typeof window.setFiltroCartera === 'function') window.setFiltroCartera('TODO');
            else if (typeof window.renderizarCartera === 'function') window.renderizarCartera();
            const old = document.getElementById('semaforo-banner');
            if (old && typeof old.remove === 'function') old.remove();
        }, 300);
    };

    // Boton "Cobrar": abre Cartera solo con ese cliente
    window.cobrarUrgente = function (indice) {
        const c = (window.top5Urgentes || [])[indice];
        if (!c) { alert('Error: No se encontró el cliente'); return; }
        const todos = window._datosRealesBackup || window.datosReales || [];
        const cliente = todos.find(x => String(x.id) === String(c.id));
        window._datosRealesBackup = todos;
        window.datosReales = cliente ? [cliente] : [];
        if (typeof cambiarTab === 'function') cambiarTab('cartera');
        setTimeout(function () {
            if (typeof window.setFiltroCartera === 'function') window.setFiltroCartera('TODO');
            else if (typeof window.renderizarCartera === 'function') window.renderizarCartera();
            const old = document.getElementById('semaforo-banner');
            if (old && typeof old.remove === 'function') old.remove();
        }, 300);
    };

    // Filtrar Cartera por el nombre de un cliente (accion rapida)
    window.filtrarCarteraPorCliente = function (nombreCliente) {
        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        const carteraTab = document.getElementById('cartera');
        if (carteraTab) carteraTab.classList.add('active');
        setTimeout(() => {
            if (typeof render === 'function') render();
            setTimeout(() => {
                const inputBusqueda = document.getElementById('noa-search');
                if (inputBusqueda) {
                    inputBusqueda.value = nombreCliente;
                    inputBusqueda.dispatchEvent(new Event('input', { bubbles: true }));
                    console.log('✅ Filtrado por cliente:', nombreCliente);
                } else if (typeof window.SEARCH_TERM !== 'undefined') {
                    window.SEARCH_TERM = nombreCliente;
                    if (typeof render === 'function') render();
                }
            }, 500);
        }, 200);
    };

    // ============================================
    // GRAFICO DE TENDENCIA: pagos cobrados por mes (de la base Neon, por /api/pagos)
    // ============================================
    function mesDe(fecha) {
        const E = ESTADO();
        const f = E ? E.parseFecha(fecha) : null;
        return f ? f.y + '-' + String(f.m).padStart(2, '0') : null;
    }
    window.actualizarGraficoTendencia = async function () {
        try {
            const canvas = document.getElementById('salesTrendChart');
            if (!canvas || typeof Chart === 'undefined') return;
            const u = (typeof getUserNOA === 'function') ? await getUserNOA() : null;
            if (!u) return;
            const resp = await fetch('/api/pagos?user_id=' + encodeURIComponent(u.id));
            const datos = await resp.json();
            if (!resp.ok || !datos || datos.success === false) throw new Error((datos && datos.error) || ('Error ' + resp.status));
            const porMes = {};
            (datos.pagos || []).forEach(p => {
                const mes = mesDe(p.fecha_pago);
                if (!mes) return;
                if (!porMes[mes]) porMes[mes] = { usd: 0, crc: 0 };
                const moneda = String(p.moneda || 'CRC').toUpperCase();
                const monto = Number(p.monto_pagado) || 0;
                if (moneda === 'USD') porMes[mes].usd += monto; else porMes[mes].crc += monto;
            });
            const meses = Object.keys(porMes).sort().slice(-6);
            const nombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            const labels = meses.map(m => { const p = m.split('-'); return nombres[parseInt(p[1], 10) - 1] + ' ' + p[0].slice(2); });
            const dataUSD = meses.map(m => Math.round(porMes[m].usd));
            const dataCRC = meses.map(m => Math.round(porMes[m].crc / 1000));
            if (window.dashboardChart && typeof window.dashboardChart.destroy === 'function') window.dashboardChart.destroy();
            window.dashboardChart = new Chart(canvas.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        { label: 'Cobrado USD ($)', backgroundColor: '#0d9488', borderColor: '#0d9488', borderWidth: 2, data: dataUSD },
                        { label: 'Cobrado CRC (miles ₡)', backgroundColor: '#d97706', borderColor: '#d97706', borderWidth: 2, data: dataCRC }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { color: '#374151' } } },
                    scales: {
                        y: { beginAtZero: true, ticks: { color: '#6b7280' }, grid: { color: '#e5e7eb' } },
                        x: { ticks: { color: '#6b7280' }, grid: { display: false } }
                    }
                }
            });
            console.log('📈 Gráfico actualizado');
        } catch (error) {
            console.error('Error actualizando gráfico:', error);
        }
    };

    // ============================================
    // ACTUALIZAR TODO EL DASHBOARD
    // ============================================
    window.actualizarDashboardCompleto = async function () {
        console.log('📊 Actualizando Dashboard completo...');
        window.actualizarKPIsDashboard();
        await seguro(window.actualizarSemaforoDashboard);
        await seguro(window.actualizarComparativoCobros);
        await seguro(window.actualizarTop5Urgentes);
        await seguro(window.actualizarPendientesNotificar);
        await seguro(window.actualizarGraficoTendencia);
        await seguro(window.inicializarWow);
        console.log('📊 Dashboard actualizado');
    };

    // Se actualiza cada vez que se actualizan las estadisticas
    const originalActualizarEstadisticas = window.actualizarEstadisticas;
    window.actualizarEstadisticas = function () {
        if (originalActualizarEstadisticas) originalActualizarEstadisticas();
        window.actualizarDashboardCompleto();
    };

    console.log('📊 NOA Dashboard cargado ✅');
})();

// ============================================
// FUNCIONES DE NAVEGACION PARA BOTONES
// ============================================
window.irACartera = function () {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById('cartera').classList.add('active');
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector('.nav-tab[onclick*="cartera"]');
    if (btn) btn.classList.add('active');
};
window.irACarteraWA = function () {
    window.irACartera();
    setTimeout(() => alert('Selecciona clientes con los checkboxes y usa el botón WhatsApp Masivo en la cartera'), 500);
};
window.irACarteraEmail = function () {
    window.irACartera();
    setTimeout(() => alert('Selecciona clientes con los checkboxes y usa el botón Email Masivo en la cartera'), 500);
};
window.irAHistorialEnvios = function () {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById('historial').classList.add('active');
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector('.nav-tab[onclick*="historial"]');
    if (btn) btn.classList.add('active');
    setTimeout(() => { if (typeof window.filtrarHistorial === 'function') window.filtrarHistorial('todos'); }, 300);
};
window.irAHistorialPagos = function () {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById('historial-pagos-tab').classList.add('active');
    setTimeout(() => { if (typeof window.renderHistorialPagos === 'function') window.renderHistorialPagos(); }, 300);
};

// Enviar cobro por WhatsApp
window.enviarCobroWhatsApp = function (telefono, nombreCliente) {
    const mensaje = document.getElementById('mensaje-cobro').value;
    const telefonoLimpio = telefono.replace(/\D/g, '');
    const telefonoCompleto = telefonoLimpio.startsWith('506') ? telefonoLimpio : '506' + telefonoLimpio;
    document.getElementById('modal-cobro').remove();
    if (window.enviarWAIndividual) {
        window.enviarWAIndividual(telefonoCompleto, mensaje, nombreCliente, null, 'manual');
    } else {
        const url = `https://wa.me/${telefonoCompleto}?text=${encodeURIComponent(mensaje)}`;
        window.open(url, '_blank');
        if (typeof guardarEnvio === 'function') {
            guardarEnvio(null, nombreCliente, 1, 'whatsapp', 'Aviso de Cobro', 'manual');
        }
    }
};

// Enviar cobro por Email
window.enviarCobroEmail = function (email, nombreCliente, poliza) {
    const mensaje = document.getElementById('mensaje-cobro').value;
    if (window.emailjs) {
        emailjs.send('service_noa', 'template_cobro', {
            to_email: email, nombre: nombreCliente, poliza: poliza, mensaje: mensaje
        }).then(() => {
            alert('✅ Email enviado correctamente');
            document.getElementById('modal-cobro').remove();
            if (typeof guardarEnvio === 'function') {
                guardarEnvio(null, nombreCliente, 1, 'email', 'Aviso de Cobro', 'manual');
            }
        }).catch(err => {
            console.error('Error enviando email:', err);
            window.location.href = `mailto:${email}?subject=Recordatorio Vencimiento de Póliza&body=${encodeURIComponent(mensaje)}`;
        });
    } else {
        window.location.href = `mailto:${email}?subject=Recordatorio Vencimiento de Póliza&body=${encodeURIComponent(mensaje)}`;
        document.getElementById('modal-cobro').remove();
    }
};

// Calidad de datos: barritas de proporcion (se repintan solas cuando cambia cualquier cifra)
(function () {
    function pintarBarras() {
        var total = (window._datosRealesBackup || window.datosReales || []).length || 1;
        document.querySelectorAll('#noa-calidad .noa-cal-row').forEach(function (row) {
            var b = row.querySelector('b'), u = row.querySelector('u');
            if (!b || !u) return;
            var n = parseInt(String(b.textContent).replace(/\D/g, ''), 10) || 0;
            var p = Math.min(100, n / total * 100);
            u.style.width = (n > 0 ? Math.max(p, 2) : 0) + '%';
            u.style.setProperty('--c', p >= 50 ? '#ef4444' : (p >= 10 ? '#f59e0b' : '#0d9488'));
        });
    }
    var intentos = 0;
    var t = setInterval(function () {
        var caja = document.getElementById('noa-calidad');
        if (caja) {
            clearInterval(t);
            new MutationObserver(pintarBarras).observe(caja, { childList: true, characterData: true, subtree: true });
            pintarBarras();
        } else if (++intentos > 40) clearInterval(t);
    }, 500);
})();
