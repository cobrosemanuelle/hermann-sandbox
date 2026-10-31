// ============================================
// NOA WOW - Panel inferior del Dashboard (datos reales de Neon, por /api/pagos)
// Sin datos inventados: si no hay pagos o montos, el panel lo dice.
// ============================================

(function () {
    'use strict';

    console.log('🚀 NOA WOW cargando...');

    const E = () => window.NOA_ESTADO;
    const base = () => window._datosRealesBackup || window.datosReales || [];
    const NOMBRES_MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const esDM = r => { const t = String(r.periodicidad || '').toLowerCase(); const m = String(r.medio_cobro || '').toLowerCase(); return t.indexOf('deducci') !== -1 || t === 'dm' || m.indexOf('deducci') !== -1 || m.indexOf('tarjeta autorizada') !== -1; }; /*NOA_DM_MEDIO*/
    const esUSD = m => String(m || 'CRC').toUpperCase().indexOf('USD') !== -1;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
    function formatNum(num) { return new Intl.NumberFormat('es-CR').format(Math.round(num)); }

    // Pagos registrados (se guardan para que la prediccion pueda saber que ya se pago)
    let PAGOS_CACHE = [];
    async function leerPagos() {
        try {
            const u = (typeof getUserNOA === 'function') ? await getUserNOA() : null;
            if (!u) return PAGOS_CACHE;
            const resp = await fetch('/api/pagos?user_id=' + encodeURIComponent(u.id));
            const datos = await resp.json();
            if (!resp.ok || !datos || datos.success === false) throw new Error((datos && datos.error) || ('Error ' + resp.status));
            PAGOS_CACHE = datos.pagos || [];
        } catch (error) {
            console.error('Error leyendo pagos:', error);
        }
        return PAGOS_CACHE;
    }

    // ============================================
    // 1. COMPARATIVA VS MES ANTERIOR (solo colones: no se suman dolares con colones)
    // ============================================

    window.calcularComparativaMensual = async function (pagosOpc) {
        const est = E();
        if (!est) return null;
        const pagos = pagosOpc || await leerPagos();
        const hoy = est.hoyCR();
        const mesActual = hoy.m, anioActual = hoy.y;
        const mesAnterior = mesActual === 1 ? 12 : mesActual - 1;
        const anioAnterior = mesActual === 1 ? anioActual - 1 : anioActual;
        let actual = 0, anterior = 0;
        pagos.forEach(function (p) {
            const f = est.parseFecha(p.fecha_pago);
            if (!f || esUSD(p.moneda)) return;
            const monto = Number(p.monto_pagado) || 0;
            if (f.m === mesActual && f.y === anioActual) actual += monto;
            else if (f.m === mesAnterior && f.y === anioAnterior) anterior += monto;
        });
        // Si el mes anterior no tuvo pagos no hay con que comparar: no se inventa un porcentaje
        const diferencia = anterior > 0 ? Math.round(((actual - anterior) / anterior) * 100) : null;
        return {
            actual: actual,
            anterior: anterior,
            diferencia: diferencia,
            mesAnteriorNombre: NOMBRES_MESES[mesAnterior - 1],
            positivo: diferencia !== null && diferencia >= 0
        };
    };

    // ============================================
    // 2. PREDICCION DE FLUJO SEMANAL: lo que vence en los proximos 7 dias y aun no tiene pago registrado
    // ============================================

    window.calcularPrediccionSemanal = function () {
        const est = E();
        if (!est) return null;
        const pagado = {};
        (PAGOS_CACHE || []).forEach(function (p) {
            const f = est.parseFecha(p.periodo_hasta);
            if (f) pagado[String(p.cliente_id) + '|' + f.iso] = true;
        });
        let prediccionUSD = 0, prediccionCRC = 0, polizasVencen = 0;
        base().forEach(function (c) {
            if (esDM(c)) return;
            const f = est.parseFecha(c.desde_cobro);
            if (!f) return;
            const dias = est.diasHasta(c.desde_cobro);
            if (dias === null || dias < 0 || dias > 7) return;
            if (pagado[String(c.id) + '|' + f.iso]) return;
            polizasVencen++;
            const prima = Number(c.prima) || 0;
            if (esUSD(c.moneda)) prediccionUSD += prima; else prediccionCRC += prima;
        });
        return { prediccionUSD: prediccionUSD, prediccionCRC: prediccionCRC, polizasVencen: polizasVencen };
    };

    // ============================================
    // 3. LOGROS (sin meta inventada)
    // ============================================

    window.calcularLogros = async function (comparativaOpc, prediccionOpc) {
        const logros = [];
        const comparativa = comparativaOpc !== undefined ? comparativaOpc : await window.calcularComparativaMensual();
        const prediccion = prediccionOpc !== undefined ? prediccionOpc : window.calcularPrediccionSemanal();

        if (comparativa && comparativa.diferencia !== null && comparativa.diferencia > 0) {
            logros.push({ icono: '📈', titulo: '¡Superando!', desc: '+' + comparativa.diferencia + '% vs ' + comparativa.mesAnteriorNombre, color: '#10b981' });
        }
        if (prediccion && prediccion.polizasVencen >= 5) {
            logros.push({ icono: '⚡', titulo: 'Semana activa', desc: prediccion.polizasVencen + ' pólizas por cobrar', color: '#8b5cf6' });
        }
        const total = base().length;
        if (total >= 100) {
            logros.push({ icono: '👑', titulo: 'Cartera Premium', desc: total + '+ clientes', color: '#ec4899' });
        }
        return logros;
    };

    // ============================================
    // 4. ASISTENTE CONVERSACIONAL
    // ============================================

    window.responderAsistenteIA = async function (pregunta) {
        const preguntaLower = String(pregunta || '').toLowerCase();
        const pagos = await leerPagos();
        const comparativa = await window.calcularComparativaMensual(pagos);
        const prediccion = window.calcularPrediccionSemanal();
        const totalClientes = base().length;

        if (preguntaLower.includes('cómo voy') || preguntaLower.includes('como voy') || preguntaLower.includes('este mes')) {
            if (!comparativa) return '📊 Cargando datos... Asegúrate de tener la cartera cargada.';
            if (comparativa.actual === 0 && comparativa.anterior === 0) {
                return '📊 Aún no hay pagos registrados este mes ni el mes anterior.';
            }
            if (comparativa.diferencia === null) {
                return '📊 Este mes has cobrado ₡' + formatNum(comparativa.actual) + '.\n\nEl mes anterior no tuvo pagos registrados, así que no hay con qué comparar.';
            }
            const signo = comparativa.positivo ? '+' : '';
            return '📊 Este mes has cobrado ₡' + formatNum(comparativa.actual) + '.\n\n' + (comparativa.positivo ? '🎉' : '📉') + ' Eso es ' + signo + comparativa.diferencia + '% comparado con ' + comparativa.mesAnteriorNombre + ' (₡' + formatNum(comparativa.anterior) + ').';
        }

        if (preguntaLower.includes('semana') || preguntaLower.includes('cobrar')) {
            if (!prediccion) return '🔮 Carga tu cartera para ver la semana.';
            const montos = (prediccion.prediccionCRC > 0 || prediccion.prediccionUSD > 0)
                ? '\n\n💰 Por cobrar:\n- CRC: ₡' + formatNum(prediccion.prediccionCRC) + '\n- USD: $' + formatNum(prediccion.prediccionUSD)
                : '\n\nTodavía no hay montos cargados en estas pólizas.';
            return '🔮 Esta semana tienes ' + prediccion.polizasVencen + ' pólizas por vencer.' + montos;
        }

        if (preguntaLower.includes('cliente') || preguntaLower.includes('cartera')) {
            return '👥 Tu cartera tiene ' + totalClientes + ' clientes activos.';
        }

        if (preguntaLower.includes('ayuda') || preguntaLower.includes('qué puedo')) {
            return '🤖 Soy tu asistente NOA. Puedo ayudarte con:\n\n- "¿Cómo voy este mes?" - Resumen de cobranza\n- "¿Qué debo cobrar esta semana?" - Lo que vence esta semana\n- "¿Cuántos clientes tengo?" - Info de cartera\n- "Dame un consejo" - Tip del día\n\n¡Pregúntame lo que necesites!';
        }

        if (preguntaLower.includes('consejo') || preguntaLower.includes('tip')) {
            const tips = [
                '💡 Un recordatorio amable unos días antes del vencimiento ayuda a que el cliente pague a tiempo.',
                '💡 Los clientes que pagan puntual son buenos candidatos para ofrecerles otros seguros.',
                '💡 Usar el nombre del cliente en el mensaje lo hace más cercano.',
                '💡 Si un cliente no responde por WhatsApp, pruebe con correo o una llamada.'
            ];
            return tips[Math.floor(Math.random() * tips.length)];
        }

        return '🤖 Entiendo que preguntas sobre "' + esc(pregunta) + '".\n\nPrueba preguntarme:\n- ¿Cómo voy este mes?\n- ¿Qué debo cobrar esta semana?\n- Dame un consejo\n\n¡Estoy aquí para ayudarte!';
    };

    // ============================================
    // PANEL WOW EN EL DASHBOARD
    // ============================================

    window.renderizarPanelWow = async function () {
        const container = document.getElementById('wow-panel');
        if (!container) return;

        const pagos = await leerPagos();
        const comparativa = await window.calcularComparativaMensual(pagos);
        const prediccion = window.calcularPrediccionSemanal();
        const logros = await window.calcularLogros(comparativa, prediccion);

        const hayDif = !!comparativa && comparativa.diferencia !== null;
        const textoPct = hayDif ? ((comparativa.positivo ? '+' : '') + comparativa.diferencia + '%') : '—';
        const colorPct = hayDif ? (comparativa.positivo ? '#0f766e' : '#b91c1c') : '#6b7280';
        let subPct;
        if (!comparativa) subPct = 'Sin datos';
        else if (hayDif) subPct = comparativa.positivo ? '📈 ¡Vas mejor!' : '📉 Oportunidad de mejora';
        else if (comparativa.actual > 0) subPct = 'Sin pagos registrados el mes anterior';
        else subPct = 'Aún no hay pagos registrados';

        const crc = prediccion ? prediccion.prediccionCRC : 0;
        const usd = prediccion ? prediccion.prediccionUSD : 0;
        let montoSemana = (crc > 0 ? '~₡' + formatNum(crc) : '') + (crc > 0 && usd > 0 ? ' y ' : '') + (usd > 0 ? '~$' + formatNum(usd) : '');
        montoSemana = montoSemana ? montoSemana + ' por cobrar' : 'Sin montos cargados';

        const html = `
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:15px;margin-bottom:20px;">
                <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px 18px;text-align:center;">
                    <div style="font-size:12px;color:#6b7280;margin-bottom:5px;">vs ${esc(comparativa ? comparativa.mesAnteriorNombre : 'mes anterior')} (colones)</div>
                    <div style="font-size:2em;font-weight:800;color:${colorPct};">${textoPct}</div>
                    <div style="font-size:11px;color:#64748b;margin-top:5px;">${subPct}</div>
                </div>

                <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px 18px;text-align:center;">
                    <div style="font-size:12px;color:#6b7280;margin-bottom:5px;">🔮 Esta semana</div>
                    <div style="font-size:1.5em;font-weight:800;color:#12263f;">${prediccion ? prediccion.polizasVencen : 0} pólizas</div>
                    <div style="font-size:11px;color:#64748b;margin-top:5px;">${montoSemana}</div>
                </div>

                <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px 18px;">
                    <div style="font-size:12px;color:#6b7280;margin-bottom:8px;text-align:center;">🏆 Logros</div>
                    <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
                        ${logros.length > 0
                            ? logros.slice(0, 3).map(l => `<div title="${esc(l.desc)}" style="text-align:center;cursor:help;"><div style="font-size:1.5em;">${l.icono}</div><div style="font-size:11px;color:#6b7280;">${esc(l.titulo)}</div></div>`).join('')
                            : '<span style="color:#64748b;font-size:12px;">Aún sin logros</span>'}
                    </div>
                </div>
            </div>

            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px 18px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px;">
                    <span style="font-size:1.5em;">🤖</span>
                    <span style="color:#111827;font-weight:600;">Asistente NOA</span>
                </div>
                <div id="chat-respuesta" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:15px;margin-bottom:15px;min-height:60px;color:#374151;font-size:14px;line-height:1.5;position:relative;">
                    <span id="chat-texto">¿Qué busca?</span>
                    <button id="chat-cerrar" onclick="window.cerrarRespuestaIA()" style="display:none;position:absolute;top:8px;right:8px;background:#e5e7eb;color:#6b7280;border:none;width:24px;height:24px;border-radius:50%;cursor:pointer;font-size:14px;line-height:1;">✕</button>
                </div>
                <div style="display:flex;gap:10px;">
                    <input type="text" id="chat-input" placeholder="Escriba un nombre, una póliza o una pregunta…"
                           onkeypress="if(event.key==='Enter')window.enviarPreguntaIA()"
                           style="flex:1;background:#fff;border:1px solid #d1d5db;border-radius:10px;padding:12px 15px;color:#111827;font-size:14px;">
                    <button onclick="window.enviarPreguntaIA()"
                            style="background:#0d9488;color:#fff;border:none;padding:12px 20px;border-radius:10px;cursor:pointer;font-weight:600;">
                        Enviar
                    </button>
                </div>
            </div>
        `;

        container.innerHTML = html;
    };

    window.enviarPreguntaIA = async function () {
        const input = document.getElementById('chat-input');
        const chatTexto = document.getElementById('chat-texto');
        const btnCerrar = document.getElementById('chat-cerrar');

        if (!input || !input.value.trim()) return;

        const pregunta = input.value.trim();
        input.value = '';

        if (chatTexto) chatTexto.innerHTML = '<span style="color:#6b7280;">🤔 Pensando...</span>';
        if (btnCerrar) btnCerrar.style.display = 'none';

        const respuesta = await window.responderAsistenteIA(pregunta);
        if (chatTexto) chatTexto.innerHTML = String(respuesta).replace(/\n/g, '<br>');
        if (btnCerrar) btnCerrar.style.display = 'block';
    };

    window.cerrarRespuestaIA = function () {
        const chatTexto = document.getElementById('chat-texto');
        const btnCerrar = document.getElementById('chat-cerrar');

        if (chatTexto) chatTexto.innerHTML = '¿Qué busca?';
        if (btnCerrar) btnCerrar.style.display = 'none';
    };

    window.inicializarWow = async function () {
        console.log('🚀 Inicializando WOW...');
        await window.renderizarPanelWow();
        console.log('🚀 WOW inicializado ✅');
    };

    console.log('🚀 NOA WOW cargado ✅');

})();
