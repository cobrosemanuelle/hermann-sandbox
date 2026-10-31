// ============================================
// NOA ASISTENTE IA - Responde TODO del sistema
// ============================================

(function() {
    'use strict';
    
    console.log('🤖 NOA Asistente IA cargando...');

    // ============================================
    // FUNCIONES DE CONSULTA DE DATOS
    // ============================================
    
    async function obtenerResumenGeneral() {
        const clientes = window.datosReales || [];
        const totalClientes = clientes.length;
        
        let pagados = 0, pendientes = 0, vencidos = 0;
        let totalUSD = 0, totalCRC = 0;
        let sinTelefono = 0, sinEmail = 0;
        
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        clientes.forEach(c => {
            if (c._pagado) pagados++;
            else pendientes++;
            
            const moneda = (c.moneda || 'CRC').toUpperCase();
            const prima = Number(c.prima) || 0;
            if (moneda === 'USD') totalUSD += prima;
            else totalCRC += prima;
            
            if (!c.telefono) sinTelefono++;
            if (!c.correo) sinEmail++;
            
            // Verificar vencidos
            if (c.hasta) {
                let fechaHasta;
                if (c.hasta.includes('/')) {
                    const [d, m, y] = c.hasta.split('/');
                    fechaHasta = new Date(y, m - 1, d);
                } else {
                    fechaHasta = new Date(c.hasta);
                }
                if (fechaHasta < hoy && !c._pagado) vencidos++;
            }
        });
        
        return { totalClientes, pagados, pendientes, vencidos, totalUSD, totalCRC, sinTelefono, sinEmail };
    }
    
    async function obtenerClientePorNombre(nombre) {
        const clientes = window.datosReales || [];
        const nombreLower = nombre.toLowerCase();
        
        return clientes.filter(c => 
            (c.asegurado || '').toLowerCase().includes(nombreLower)
        );
    }
    
    async function obtenerPoliza(numero) {
        const clientes = window.datosReales || [];
        return clientes.filter(c => 
            (c.poliza || '').toLowerCase().includes(numero.toLowerCase())
        );
    }
    
    async function obtenerVencenHoy() {
        const clientes = window.datosReales || [];
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        return clientes.filter(c => {
            if (!c.hasta || c._pagado) return false;
            let fechaHasta;
            if (c.hasta.includes('/')) {
                const [d, m, y] = c.hasta.split('/');
                fechaHasta = new Date(y, m - 1, d);
            } else {
                fechaHasta = new Date(c.hasta);
            }
            fechaHasta.setHours(0, 0, 0, 0);
            return fechaHasta.getTime() === hoy.getTime();
        });
    }
    
    async function obtenerVencenSemana() {
        const clientes = window.datosReales || [];
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const finSemana = new Date(hoy);
        finSemana.setDate(finSemana.getDate() + 7);
        
        return clientes.filter(c => {
            if (!c.hasta || c._pagado) return false;
            let fechaHasta;
            if (c.hasta.includes('/')) {
                const [d, m, y] = c.hasta.split('/');
                fechaHasta = new Date(y, m - 1, d);
            } else {
                fechaHasta = new Date(c.hasta);
            }
            return fechaHasta >= hoy && fechaHasta <= finSemana;
        });
    }
    
    async function obtenerTopMorosos() {
        if (!window.supabaseClient) return [];
        
        try {
            const { data } = await window.supabaseClient
                .from('historial_pagos')
                .select('cliente_nombre, poliza, dias_mora')
                .order('dias_mora', { ascending: false })
                .limit(5);
            return data || [];
        } catch (e) {
            return [];
        }
    }
    
    async function obtenerHistorialEnvios() {
        if (!window.supabaseClient) return { total: 0, whatsapp: 0, email: 0 };
        
        try {
            const { data } = await window.supabaseClient
                .from('historial_envios')
                .select('canal');
            
            const total = data?.length || 0;
            const whatsapp = data?.filter(e => e.canal === 'whatsapp').length || 0;
            const email = data?.filter(e => e.canal === 'email').length || 0;
            
            return { total, whatsapp, email };
        } catch (e) {
            return { total: 0, whatsapp: 0, email: 0 };
        }
    }
    
    async function obtenerPagosRecientes() {
        if (!window.supabaseClient) return [];
        
        try {
            const { data } = await window.supabaseClient
                .from('historial_pagos')
                .select('cliente_nombre, monto_pagado, moneda, fecha_pago')
                .order('fecha_pago', { ascending: false })
                .limit(5);
            return data || [];
        } catch (e) {
            return [];
        }
    }
    
    function formatNum(num) {
        return new Intl.NumberFormat('es-CR').format(Math.round(num));
    }

    // ============================================
    // RESPONDER PREGUNTAS
    // ============================================
    
    window.responderAsistenteIA = async function(pregunta) {
        const p = pregunta.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        // ===== RESUMEN GENERAL =====
        if (p.includes('como voy') || p.includes('resumen') || p.includes('este mes') || p.includes('general')) {
            const comparativa = await window.calcularComparativaMensual();
            const resumen = await obtenerResumenGeneral();
            
            return `📊 **Resumen de tu cartera:**

👥 Total clientes: ${resumen.totalClientes}
✅ Pagados: ${resumen.pagados}
⏳ Pendientes: ${resumen.pendientes}
🔴 Vencidos: ${resumen.vencidos}

💰 Por cobrar:
- USD: $${formatNum(resumen.totalUSD)}
- CRC: ₡${formatNum(resumen.totalCRC)}

${comparativa ? `📈 Este mes: ${comparativa.positivo ? '+' : ''}${comparativa.diferencia}% vs ${comparativa.mesAnteriorNombre}` : ''}

${resumen.vencidos > 5 ? '⚠️ Tienes varios clientes vencidos. ¡Prioriza el cobro!' : '✨ ¡Vas bien! Sigue así.'}`;
        }
        
        // ===== HOY =====
        if (p.includes('hoy') || p.includes('dia')) {
            const vencenHoy = await obtenerVencenHoy();
            
            if (vencenHoy.length === 0) {
                return `📅 **Hoy:**\n\n✅ No hay pólizas que venzan hoy. ¡Día tranquilo!\n\n💡 Aprovecha para hacer seguimiento a clientes con mora.`;
            }
            
            let montoHoy = 0;
            vencenHoy.forEach(c => montoHoy += Number(c.prima) || 0);
            
            return `📅 **Hoy vencen ${vencenHoy.length} pólizas:**

${vencenHoy.slice(0, 5).map(c => `• ${c.asegurado} - ₡${formatNum(c.prima)}`).join('\n')}
${vencenHoy.length > 5 ? `\n...y ${vencenHoy.length - 5} más` : ''}

💰 Total por cobrar hoy: ~₡${formatNum(montoHoy)}

💡 ¡Envía recordatorios ahora mismo!`;
        }
        
        // ===== SEMANA =====
        if (p.includes('semana') || p.includes('proximos dias')) {
            const vencenSemana = await obtenerVencenSemana();
            
            let montoSemana = 0;
            vencenSemana.forEach(c => montoSemana += Number(c.prima) || 0);
            
            return `🗓️ **Esta semana:**

📋 ${vencenSemana.length} pólizas por vencer
💰 Potencial: ~₡${formatNum(montoSemana)}

${vencenSemana.slice(0, 5).map(c => `• ${c.asegurado} - ${c.poliza}`).join('\n')}
${vencenSemana.length > 5 ? `\n...y ${vencenSemana.length - 5} más` : ''}

${vencenSemana.length > 10 ? '🔥 ¡Semana cargada! Prioriza montos altos.' : '💪 Semana manejable. ¡Tú puedes!'}`;
        }
        
        // ===== MOROSOS =====
        if (p.includes('mora') || p.includes('moroso') || p.includes('atrasado') || p.includes('debe')) {
            const morosos = await obtenerTopMorosos();
            
            if (morosos.length === 0) {
                return `✅ **Morosidad:**\n\n¡Excelente! No hay clientes con mora significativa registrada.`;
            }
            
            return `🔴 **Top clientes con mayor mora:**

${morosos.map((m, i) => `${i + 1}. ${m.cliente_nombre} - ${m.dias_mora} días (${m.poliza})`).join('\n')}

💡 Consejo: Contacta primero a los de mayor mora. Usa el botón "Cobrar" en el Dashboard.`;
        }
        
        // ===== CLIENTE ESPECÍFICO =====
        if (p.includes('cliente') && (p.includes('busca') || p.includes('como esta') || p.includes('info'))) {
            // Extraer nombre después de "cliente"
            const match = pregunta.match(/cliente\s+(.+)/i);
            if (match) {
                const nombreBuscado = match[1].trim();
                const encontrados = await obtenerClientePorNombre(nombreBuscado);
                
                if (encontrados.length === 0) {
                    return `🔍 No encontré clientes con "${nombreBuscado}".\n\nPrueba con otro nombre o parte del apellido.`;
                }
                
                const c = encontrados[0];
                return `👤 **${c.asegurado}**

📋 Póliza: ${c.poliza || 'N/A'}
💰 Prima: ${c.moneda === 'USD' ? '$' : '₡'}${formatNum(c.prima || 0)}
📅 Vence: ${c.hasta || 'N/A'}
📱 Tel: ${c.telefono || '❌ Sin teléfono'}
📧 Email: ${c.correo || '❌ Sin email'}
${c._pagado ? '✅ PAGADO' : '⏳ PENDIENTE'}

${encontrados.length > 1 ? `\n📌 Encontré ${encontrados.length} coincidencias. Este es el primero.` : ''}`;
            }
        }
        
        // ===== PÓLIZA ESPECÍFICA =====
        if (p.includes('poliza') || p.includes('numero')) {
            const match = pregunta.match(/(\d{5,})/);
            if (match) {
                const numPoliza = match[1];
                const encontrados = await obtenerPoliza(numPoliza);
                
                if (encontrados.length === 0) {
                    return `🔍 No encontré la póliza "${numPoliza}".`;
                }
                
                const c = encontrados[0];
                return `📋 **Póliza ${c.poliza}**

👤 Cliente: ${c.asegurado}
💰 Prima: ${c.moneda === 'USD' ? '$' : '₡'}${formatNum(c.prima || 0)}
📅 Vigencia: ${c.desde || '?'} - ${c.hasta || '?'}
${c._pagado ? '✅ PAGADO' : '⏳ PENDIENTE DE COBRO'}`;
            }
        }
        
        // ===== ENVÍOS =====
        if (p.includes('envio') || p.includes('mensaje') || p.includes('whatsapp') || p.includes('email')) {
            const envios = await obtenerHistorialEnvios();
            
            return `📨 **Historial de envíos:**

📱 WhatsApp: ${envios.whatsapp} mensajes
📧 Email: ${envios.email} correos
📊 Total: ${envios.total} comunicaciones

${envios.total > 100 ? '🏆 ¡Gran actividad de cobranza!' : '💡 Aumenta tus envíos para mejorar el cobro.'}`;
        }
        
        // ===== PAGOS =====
        if (p.includes('pago') || p.includes('cobrado') || p.includes('recaudado') || p.includes('quien pago')) {
            const pagos = await obtenerPagosRecientes();
            
            if (pagos.length === 0) {
                return `💰 **Pagos:**\n\nNo hay pagos registrados aún.`;
            }
            
            return `💰 **Últimos pagos registrados:**

${pagos.map(p => `• ${p.cliente_nombre}: ${p.moneda === 'USD' ? '$' : '₡'}${formatNum(p.monto_pagado)}`).join('\n')}

✨ ¡Cada pago cuenta!`;
        }
        
        // ===== PROBLEMAS / CONTACTOS =====
        if (p.includes('problema') || p.includes('sin telefono') || p.includes('sin email') || p.includes('falta')) {
            const resumen = await obtenerResumenGeneral();
            
            return `⚠️ **Problemas detectados:**

📱 Sin teléfono: ${resumen.sinTelefono} clientes
📧 Sin email: ${resumen.sinEmail} clientes

💡 Ve a "Top razones de mora" en el Dashboard para corregir estos datos.`;
        }
        
        // ===== MEJOR CLIENTE =====
        if (p.includes('mejor cliente') || p.includes('mejor pagador') || p.includes('puntual')) {
            const pagos = await obtenerPagosRecientes();
            
            // Buscar el que más ha pagado
            const porCliente = {};
            pagos.forEach(p => {
                if (!porCliente[p.cliente_nombre]) porCliente[p.cliente_nombre] = 0;
                porCliente[p.cliente_nombre] += Number(p.monto_pagado) || 0;
            });
            
            const ordenados = Object.entries(porCliente).sort((a, b) => b[1] - a[1]);
            
            if (ordenados.length === 0) {
                return `🏆 **Mejores clientes:**\n\nAún no hay suficientes datos de pagos.`;
            }
            
            return `🏆 **Mejores clientes (por monto pagado):**

${ordenados.slice(0, 5).map(([nombre, monto], i) => `${i + 1}. ${nombre}: ₡${formatNum(monto)}`).join('\n')}

💡 Estos clientes son ideales para cross-selling!`;
        }
        
        // ===== CONSEJO =====
        if (p.includes('consejo') || p.includes('tip') || p.includes('ayuda') || p.includes('sugerencia')) {
            const tips = [
                '💡 Los lunes y martes por la mañana (9-11am) son los mejores momentos para cobrar.',
                '💡 Envía recordatorio 3 días antes del vencimiento: aumenta 40% la tasa de pago.',
                '💡 Si WhatsApp no funciona en 48h, prueba con llamada telefónica.',
                '💡 Los clientes puntuales son perfectos para ofrecerles más productos.',
                '💡 Personaliza tus mensajes con el nombre del cliente y monto exacto.',
                '💡 Prioriza cobrar a los clientes con mayor mora primero.',
                '💡 El cross-selling es más efectivo después de un pago exitoso.',
                '💡 Mantén actualizada la información de contacto de tus clientes.'
            ];
            return tips[Math.floor(Math.random() * tips.length)];
        }
        
        // ===== ESTADÍSTICAS =====
        if (p.includes('estadistica') || p.includes('numero') || p.includes('dato') || p.includes('cuanto')) {
            const resumen = await obtenerResumenGeneral();
            const envios = await obtenerHistorialEnvios();
            
            return `📊 **Estadísticas del sistema:**

👥 Clientes: ${resumen.totalClientes}
✅ Pagados: ${resumen.pagados} (${Math.round(resumen.pagados/resumen.totalClientes*100)}%)
⏳ Pendientes: ${resumen.pendientes}
🔴 Vencidos: ${resumen.vencidos}

💰 Cartera:
- USD: $${formatNum(resumen.totalUSD)}
- CRC: ₡${formatNum(resumen.totalCRC)}

📨 Comunicaciones: ${envios.total} enviadas`;
        }
        
        // ===== QUÉ PUEDO PREGUNTAR =====
        if (p.includes('que puedo') || p.includes('opciones') || p.includes('comandos')) {
            return `🤖 **Puedo ayudarte con:**

📊 **Resumen:** "¿Cómo voy?" / "Dame un resumen"
📅 **Hoy:** "¿Qué vence hoy?" / "Mi día"
🗓️ **Semana:** "¿Qué tengo esta semana?"
🔴 **Mora:** "¿Quién tiene mora?" / "Morosos"
👤 **Cliente:** "Busca cliente Juan Pérez"
📋 **Póliza:** "Info póliza 123456"
📨 **Envíos:** "¿Cuántos mensajes envié?"
💰 **Pagos:** "¿Quién ha pagado?"
⚠️ **Problemas:** "¿Qué problemas hay?"
🏆 **Ranking:** "¿Quién es mi mejor cliente?"
💡 **Tips:** "Dame un consejo"

¡Pregunta lo que necesites!`;
        }
        
        // ===== SALUDO =====
        if (p.includes('hola') || p.includes('buenos') || p.includes('buenas')) {
            const hora = new Date().getHours();
            const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';
            
            return `${saludo} 👋

Soy tu asistente NOA. Estoy aquí para ayudarte con tu cartera de cobros.

Pregúntame cosas como:
- "¿Cómo voy este mes?"
- "¿Qué vence hoy?"
- "¿Quién tiene más mora?"

¡Estoy listo para ayudarte!`;
        }
        
        // ===== BUSQUEDA POR NOMBRE EN CUALQUIER PREGUNTA =====
        const datosB = window.datosReales || [];
        const palabras = pregunta.toUpperCase().split(/\s+/).filter(w => w.length > 3);
        const clienteEncontrado = datosB.find(c => {
            const nombre = (c.asegurado || '').toUpperCase();
            return palabras.some(p => nombre.includes(p));
        });
        if (clienteEncontrado) {
            const c = clienteEncontrado;
            let hasta = null;
            if (c.hasta) {
                if (String(c.hasta).includes('/')) {
                    const [d, m, y] = String(c.hasta).split('/');
                    hasta = new Date(y, m - 1, d);
                } else {
                    hasta = new Date(c.hasta);
                }
            }
            const hoyDate = new Date();
            const diasMora = hasta ? Math.floor((hoyDate - hasta) / 86400000) : 0;
            return `👤 **${c.asegurado}**

📋 Póliza: ${c.poliza || 'N/A'}
🏢 Aseguradora: ${c.aseguradora || 'N/A'}
💰 Prima: ${c.moneda === 'USD' ? '$' : '₡'}${c.prima || 0}
📅 Vence: ${c.hasta || 'N/A'}
${c._pagado ? '✅ PAGADO' : diasMora > 0 ? '🔴 VENCIDO - ' + diasMora + ' días de mora' : '⏳ Pendiente de cobro'}
📱 Tel: ${c.telefono || 'Sin teléfono'}`;
        }

        // ===== RESPUESTA POR DEFECTO =====
        return `🤖 Entiendo que preguntas sobre "${pregunta}".

No estoy seguro de qué buscas. Prueba preguntar:
- "¿Cómo voy?" - Resumen general
- "¿Qué vence hoy?" - Vencimientos del día
- "¿Quién tiene mora?" - Clientes morosos
- "Busca cliente [nombre]" - Info de cliente
- "Dame un consejo" - Tips de cobranza

Escribe "opciones" para ver todo lo que puedo hacer.`;
    };

    console.log('🤖 NOA Asistente IA cargado ✅');

})();
