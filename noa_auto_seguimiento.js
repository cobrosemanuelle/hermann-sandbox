// 🤖 NOA AUTO SEGUIMIENTO - Sistema de Envío Automático
// IMPORTANTE: Solo se activa cuando el usuario lo enciende manualmente

(function() {
    'use strict';
    
    console.log('🤖 Sistema de Auto Seguimiento cargado (INACTIVO por defecto)');
    
    const CONFIG = {
        checkIntervalMinutes: 3,
        enabled: false,  // SIEMPRE inicia desactivado
        corredor: localStorage.getItem('sistemaV5_nombreCorrector') || '',
        agencia: localStorage.getItem('sistemaV5_nombreAgencia') || ''
    };
    
    let isRunning = false;
    let intervalId = null;
    let lastCheckTime = null;
    let stats = {
        totalChecks: 0,
        enviosAutomaticos: 0,
        errores: 0
    };
    
    // ========================================
    // OBTENER CONFIGURACIÓN IA
    // ========================================
    
    function getConfigIA() {
        try {
            const saved = localStorage.getItem('sistemaV5_configIA');
            if (saved) return JSON.parse(saved);
        } catch(e) {}
        return { agresividad: 5, intervaloMinimo: 3, maxIntentos: 3 };
    }
    
    // ========================================
    // INTERVALOS POR PERIODICIDAD
    // ========================================
    
    window.INTERVALOS_DEFAULT = {
        mensual: { r1: 5, r2: 3, r3: 1 },
        trimestral: { r1: 15, r2: 7, r3: 3 },
        semestral: { r1: 30, r2: 15, r3: 7 },
        anual: { r1: 45, r2: 30, r3: 15 }
    };
    
    function getIntervalos() {
        try {
            const saved = localStorage.getItem('sistemaV5_intervalos');
            if (saved) {
                window.INTERVALOS_CONFIG = JSON.parse(saved);
                return window.INTERVALOS_CONFIG;
            }
        } catch(e) {}
        window.INTERVALOS_CONFIG = window.INTERVALOS_DEFAULT;
        return window.INTERVALOS_DEFAULT;
    }
    
    // ========================================
    // CALCULAR SI DEBE ENVIAR RECORDATORIO
    // ========================================
    
    function calcularDiasRestantes(fechaVencimiento) {
        if (!fechaVencimiento) return null;
        
        let fecha;
        if (fechaVencimiento.includes('/')) {
            const [d, m, y] = fechaVencimiento.split('/');
            fecha = new Date(y, m - 1, d);
        } else {
            fecha = new Date(fechaVencimiento);
        }
        
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        fecha.setHours(0, 0, 0, 0);
        
        const diffTime = fecha - hoy;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    function obtenerPeriodicidad(cliente) {
        const p = (cliente.periodicidad || 'mensual').toLowerCase().trim();
        if (p.includes('trim')) return 'trimestral';
        if (p.includes('sem')) return 'semestral';
        if (p.includes('anu')) return 'anual';
        return 'mensual';
    }
    
    async function contarEnviosPrevios(cliente) {
        /*NOA_AUTO_API*/
        // Cuenta los envios hechos a este cliente en los ultimos 45 dias (WhatsApp y correo, sea cual sea su origen).
        // Si no se puede consultar el historial, devuelve un numero alto: asi NO se manda nada (mejor no enviar que repetir mensajes).
        try {
            const r = await fetch('/api/envios?action=cliente&cliente_id=' + encodeURIComponent(cliente.id));
            const j = await r.json();
            if (!r.ok || !j || j.success === false) throw new Error('sin historial');
            const desde = Date.now() - 45 * 86400000;
            return (j.envios || []).filter(function (e) {
                return (e.estado || 'enviado') === 'enviado' && new Date(e.fecha_envio).getTime() >= desde;
            }).length;
        } catch (e) {
            console.error('No se pudo consultar el historial de envios (auto-seguimiento): no se enviara nada', e);
            return 999;
        }
    }
    window.noaContarEnviosPrevios = contarEnviosPrevios;
    
    async function debeEnviarRecordatorio(cliente) {
        const configIA = getConfigIA();
        const intervalos = getIntervalos();
        
        // Si ya está pagado, no enviar
        if (cliente.pagado === true) return null;
        
        // Verificar fecha de vencimiento (SIEMPRE desde_cobro, no hasta - ver reglas del proyecto)
        const fechaVenc = cliente.desde_cobro || cliente.vencimiento || cliente.fechaVencimiento;
        if (!fechaVenc) return null;
        
        const diasRestantes = calcularDiasRestantes(fechaVenc);
        if (diasRestantes === null || diasRestantes < 0) return null;
        
        // Obtener periodicidad e intervalos
        const periodicidad = obtenerPeriodicidad(cliente);
        const intervalosPeriodo = intervalos[periodicidad] || intervalos.mensual;
        
        // Contar envíos previos (consulta real en Supabase)
        const enviosPrevios = await contarEnviosPrevios(cliente);
        
        // Si ya se enviaron el máximo de intentos, no enviar más
        if (enviosPrevios >= configIA.maxIntentos) return null;
        
        // Determinar qué recordatorio toca
        const siguienteRecordatorio = enviosPrevios + 1;
        let diasParaEnviar;
        
        switch(siguienteRecordatorio) {
            case 1: diasParaEnviar = intervalosPeriodo.r1; break;
            case 2: diasParaEnviar = intervalosPeriodo.r2; break;
            case 3: diasParaEnviar = intervalosPeriodo.r3; break;
            default: return null;
        }
        
        console.log(`📊 ${cliente.asegurado}: ${diasRestantes} días restantes, periodicidad ${periodicidad}, recordatorio #${siguienteRecordatorio} debe enviarse a ${diasParaEnviar} días`);
        
        // Determinar canal disponible: WhatsApp si hay teléfono, si no, email
        const canalDisponible = cliente.telefono ? 'whatsapp' : (cliente.correo ? 'email' : null);
        if (!canalDisponible) return null; // sin teléfono ni correo, no hay forma de contactar

        // Verificar si es el momento de enviar
        if (diasRestantes <= diasParaEnviar) {
            return {
                debeEnviar: true,
                diasRestantes,
                tipoEnvio: siguienteRecordatorio,
                periodicidad,
                canal: canalDisponible
            };
        }
        
        return null;
    }
    
    // ========================================
    // ENVIAR RECORDATORIO
    // ========================================
    
    function construirMensajeWA(cliente, info) {
        const poliza = cliente.poliza || 'N/A';
        const monto = (cliente.moneda === 'USD' ? '$' : '₡') + (cliente.prima || '0');
        const aseguradora = cliente.aseguradora || '';
        const nombre = cliente.asegurado || '';
        const dias = info.diasRestantes;
        const vence = cliente.desde_cobro || '';

        if (info.tipoEnvio === 1) {
            return `Estimado/a ${nombre},\n\nLe recordamos que su póliza *${poliza}* vence en *${dias} días* (${vence}).\n\n💰 Prima: ${monto}\n🏢 Aseguradora: ${aseguradora}\n\nPor favor contáctenos para coordinar el pago y mantener su cobertura activa.\n\n_Recordatorio #1 - NOA Cobros_`;
        }
        if (info.tipoEnvio === 2) {
            return `Estimado/a ${nombre},\n\n⚠️ Su póliza *${poliza}* vence en *${dias} días* (${vence}) y todavía no hemos recibido confirmación de pago.\n\n💰 Prima pendiente: ${monto}\n🏢 Aseguradora: ${aseguradora}\n\nEs importante coordinar el pago pronto para que no pierda su cobertura.\n\n_Recordatorio #2 - NOA Cobros_`;
        }
        return `Estimado/a ${nombre},\n\n🚨 ÚLTIMO AVISO: su póliza *${poliza}* vence en *${dias} días* (${vence}) y aún no hemos recibido su pago.\n\n💰 Monto pendiente: ${monto}\n🏢 Aseguradora: ${aseguradora}\n\nSi no se realiza el pago antes del vencimiento, la póliza quedará inactiva y sin cobertura. Por favor contáctenos hoy mismo.\n\n_Recordatorio final #3 - NOA Cobros_`;
    }

    async function enviarRecordatorioAutomatico(cliente, info) {
        try {
            let canal = info.canal;

            // Si el canal preferido es WhatsApp pero está desconectado, usar email de respaldo si existe
            if (canal === 'whatsapp' && window.wasenderConectado === false) {
                if (cliente.correo) {
                    console.log('⚠️ WhatsApp desconectado, usando email como respaldo para:', cliente.asegurado);
                    canal = 'email';
                } else {
                    console.log('⚠️ WhatsApp desconectado y sin email de respaldo, no se puede enviar a:', cliente.asegurado);
                    return false;
                }
            }
            
            console.log('📤 Enviando recordatorio automático (' + canal + ') a:', cliente.asegurado);
            
            if (canal === 'whatsapp') {
                if (window.enviarWAIndividual) {
                    const result = await window.enviarWAIndividual(
                        cliente.telefono,
                        construirMensajeWA(cliente, info),
                        cliente.asegurado,
                        cliente.id,
                        'automatico'
                    );
                    
                    if (result && result.success) {
                        console.log('✅ WhatsApp enviado automáticamente:', cliente.asegurado);
                        stats.enviosAutomaticos++;
                        return true;
                    }
                }
            } else if (canal === 'email') {
                if (window.enviarEmailIndividual) {
                    const result = await window.enviarEmailIndividual(cliente);
                    
                    if (result && result.success) {
                        console.log('✅ Email enviado automáticamente:', cliente.asegurado);
                        stats.enviosAutomaticos++;
                        return true;
                    }
                }
            }
            
            return false;
        } catch (error) {
            console.error('❌ Error enviando recordatorio automático:', error);
            stats.errores++;
            return false;
        }
    }
    
    // ========================================
    // VERIFICAR CLIENTES
    // ========================================
    
    async function verificarClientesParaRecordatorio() {
        // VERIFICAR QUE ESTÉ ACTIVO - Si no está activo, no hacer nada
        if (!window.autoSeguimientoActivo) {
            console.log('⏸️ Auto-seguimiento inactivo, saltando verificación');
            return;
        }
        
        if (isRunning) {
            console.log('⏸️ Verificación ya en curso, saltando...');
            return;
        }
        
        isRunning = true;
        lastCheckTime = new Date();
        stats.totalChecks++;
        
        const configIA = getConfigIA();
        
        console.log('🔍 Verificando clientes para recordatorios automáticos...');
        console.log('📊 Check #', stats.totalChecks, '- Hora:', lastCheckTime.toLocaleTimeString());
        
        try {
            const clientes = window.datosReales || [];
            
            if (clientes.length === 0) {
                console.log('⚠️ No hay clientes cargados');
                isRunning = false;
                return;
            }
            
            console.log('👥 Revisando', clientes.length, 'clientes...');
            
            let candidatos = 0;
            
            for (const cliente of clientes) {
                // Verificar de nuevo que sigue activo (el usuario pudo desactivarlo)
                if (!window.autoSeguimientoActivo) {
                    console.log('⏹️ Auto-seguimiento desactivado durante verificación, deteniendo...');
                    break;
                }
                
                const info = await debeEnviarRecordatorio(cliente);
                
                if (info) {
                    candidatos++;
                    console.log('🎯 Candidato para envío:', cliente.asegurado, '- Recordatorio #' + info.tipoEnvio);
                    await enviarRecordatorioAutomatico(cliente, info);
                    await new Promise(r => setTimeout(r, 30000));
                }
            }
            
            console.log('✅ Verificación completada -', candidatos, 'recordatorios enviados');
            
        } catch (error) {
            console.error('❌ Error en verificación:', error);
            stats.errores++;
        } finally {
            isRunning = false;
        }
    }
    
    // ========================================
    // FUNCIONES PÚBLICAS PARA ACTIVAR/DESACTIVAR
    // ========================================
    
    window.autoSeguimientoActivo = false;  // SIEMPRE inicia en false
    
    window.activarAutoSeguimiento = function() {
        if (window.autoSeguimientoActivo) {
            console.log('⚠️ Auto-seguimiento ya está activo');
            return;
        }
        
        window.autoSeguimientoActivo = true;
        localStorage.setItem('auto_seguimiento_activo', 'true');
        actualizarIndicadorHeader(true);
        
        console.log('✅ Auto-Seguimiento ACTIVADO manualmente');
        console.log('⏱️ Verificación cada', CONFIG.checkIntervalMinutes, 'minutos');
        
        // Iniciar verificaciones
        verificarClientesParaRecordatorio();
        intervalId = setInterval(() => {
            verificarClientesParaRecordatorio();
        }, CONFIG.checkIntervalMinutes * 60 * 1000);
        
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('🤖 Auto-Seguimiento ACTIVADO', 'success');
        }
    };
    
    window.desactivarAutoSeguimiento = function() {
        window.autoSeguimientoActivo = false;
        localStorage.setItem('auto_seguimiento_activo', 'false');
        actualizarIndicadorHeader(false);
        
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
        
        console.log('⏹️ Auto-Seguimiento DESACTIVADO');
        
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('⏹️ Auto-Seguimiento DESACTIVADO', 'warning');
        }
    };
    
    window.getEstadoAutoSeguimiento = function() {
        return {
            activo: window.autoSeguimientoActivo,
            stats: stats,
            lastCheck: lastCheckTime
        };
    };
    

    // ========================================
    // FUNCIONES UI PARA PANEL DE CONTROL
    // ========================================
    
    window.activarAutoSeguimientoUI = function() {
        window.activarAutoSeguimiento();
        const estado = document.getElementById('estadoAutoSeguimiento');
        if (estado) {
            estado.innerHTML = '🟢 ACTIVO';
            estado.style.color = '#27ae60';
        }
    };
    
    window.desactivarAutoSeguimientoUI = function() {
        window.desactivarAutoSeguimiento();
        const estado = document.getElementById('estadoAutoSeguimiento');
        if (estado) {
            estado.innerHTML = '⚪ INACTIVO';
            estado.style.color = '#e74c3c';
        }
    };

    // ========================================
    // NO INICIAR AUTOMÁTICAMENTE
    // ========================================
    
    console.log('🤖 Sistema de Auto Seguimiento LISTO (esperando activación manual)');
    setTimeout(function() {
        const estaActivo = localStorage.getItem('auto_seguimiento_activo') === 'true';
        actualizarIndicadorHeader(estaActivo);
    }, 2000);
    console.log('   Para activar: window.activarAutoSeguimiento()');
    console.log('   Para desactivar: window.desactivarAutoSeguimiento()');
    
})();

function actualizarIndicadorHeader(activo) {
    // Remover badge viejo del header si existe
    const old = document.getElementById('auto-seg-header-badge');
    if (old) old.remove();

    // Punto en tab Configuracion
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(function(tab) {
        if (tab.getAttribute('onclick') && tab.getAttribute('onclick').includes('configuracion')) {
            let punto = tab.querySelector('.auto-seg-dot');
            if (!activo) {
                if (!punto) {
                    punto = document.createElement('span');
                    punto.className = 'auto-seg-dot';
                    punto.style.cssText = 'display:inline-block;width:8px;height:8px;background:#ef4444;border-radius:50%;margin-left:6px;animation:pulse-dot 1.5s infinite;vertical-align:middle;';
                    tab.appendChild(punto);
                }
                tab.title = 'Auto-Seguimiento INACTIVO — Click para activar';
            } else {
                if (punto) punto.remove();
                tab.title = 'Auto-Seguimiento ACTIVO';
            }
        }
    });

    // Agregar animacion si no existe
    if (!document.getElementById('auto-seg-dot-style')) {
        const style = document.createElement('style');
        style.id = 'auto-seg-dot-style';
        style.textContent = '@keyframes pulse-dot{0%{opacity:1;transform:scale(1);}50%{opacity:0.4;transform:scale(1.3);}100%{opacity:1;transform:scale(1);}}';
        document.head.appendChild(style);
    }
}
