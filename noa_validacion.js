// 🛡️ NOA VALIDACIÓN - Sistema de validación de datos
// Valida clientes antes de permitir envíos

(function() {
    'use strict';
    
    console.log('🛡️ Sistema de Validación cargado');
    
    // Validaciones por campo
    const VALIDACIONES = {
        asegurado: {
            validar: (v) => v && v.trim().length > 0,
            mensaje: "Nombre vacío"
        },
        telefono: {
            validar: (v) => v && v.replace(/\D/g, '').length >= 8,
            mensaje: "Teléfono inválido (mínimo 8 dígitos)"
        },
        correo: {
            validar: (v) => !v || v.includes('@'), // Vacío es OK, pero si hay debe tener @
            mensaje: "Correo inválido"
        },
        hasta: {
            validar: (v) => v && !isNaN(new Date(v).getTime()),
            mensaje: "Fecha Hasta inválida"
        },
        desde: {
            validar: (v) => v && !isNaN(new Date(v).getTime()),
            mensaje: "Fecha Desde inválida"
        },
        periodicidad: {
            validar: (v) => ['mensual', 'trimestral', 'semestral', 'anual'].includes((v || '').toLowerCase()),
            mensaje: "Periodicidad no reconocida"
        },
        poliza: {
            validar: (v) => v && v.trim().length > 0,
            mensaje: "Número de póliza vacío"
        }
    };
    
    // Validación extra: desde < hasta
    function parsearFechaSegura(v) {
        if (!v) return null;
        const s = String(v);
        if (s.includes('/')) {
            const [d, m, y] = s.split('/');
            return new Date(y, m - 1, d);
        }
        return new Date(s);
    }
    function validarFechasCoherentes(cliente) {
        if (cliente.desde && cliente.hasta) {
            const desde = parsearFechaSegura(cliente.desde);
            const hasta = parsearFechaSegura(cliente.hasta);
            if (desde >= hasta) {
                return "Fecha Desde debe ser anterior a Fecha Hasta";
            }
        }
        return null;
    }
    
    // Validar un cliente completo
    window.validarCliente = function(cliente) {
        const errores = [];
        
        // Validar cada campo
        for (const [campo, regla] of Object.entries(VALIDACIONES)) {
            if (!regla.validar(cliente[campo])) {
                errores.push(regla.mensaje);
            }
        }
        
        // Validar coherencia de fechas
        const errorFechas = validarFechasCoherentes(cliente);
        if (errorFechas) errores.push(errorFechas);
        
        return errores;
    };
    
    // Validar array de clientes y retornar resumen
    window.validarClientes = function(clientes) {
        const resumen = {
            total: clientes.length,
            validos: 0,
            conErrores: 0,
            erroresPorTipo: {},
            clientesConErrores: []
        };
        
        clientes.forEach((cliente, index) => {
            const errores = window.validarCliente(cliente);
            
            if (errores.length === 0) {
                resumen.validos++;
            } else {
                resumen.conErrores++;
                resumen.clientesConErrores.push({
                    index: index,
                    asegurado: cliente.asegurado || 'Sin nombre',
                    poliza: cliente.poliza || 'Sin póliza',
                    errores: errores
                });
                
                // Contar errores por tipo
                errores.forEach(e => {
                    resumen.erroresPorTipo[e] = (resumen.erroresPorTipo[e] || 0) + 1;
                });
            }
        });
        
        return resumen;
    };
    
    // Mostrar resumen de validación
    window.mostrarResumenValidacion = function(resumen) {
        if (resumen.conErrores === 0) {
            console.log('✅ Todos los clientes pasaron la validación');
            return;
        }
        
        console.warn(`⚠️ ${resumen.conErrores} de ${resumen.total} clientes tienen errores:`);
        
        for (const [error, cantidad] of Object.entries(resumen.erroresPorTipo)) {
            console.warn(`   • ${error}: ${cantidad}`);
        }
        
        // Mostrar notificación al usuario
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion(
                `⚠️ ${resumen.conErrores} clientes con datos incompletos. Ver consola para detalles.`,
                'warning'
            );
        }
    };
    
    // Verificar si cliente puede recibir WhatsApp
    window.puedeEnviarWhatsApp = function(cliente) {
        const errores = window.validarCliente(cliente);
        const telefonoValido = VALIDACIONES.telefono.validar(cliente.telefono);
        return telefonoValido && errores.length === 0;
    };
    
    // Verificar si cliente puede recibir Email
    window.puedeEnviarEmail = function(cliente) {
        const errores = window.validarCliente(cliente);
        const correoValido = cliente.correo && cliente.correo.includes('@');
        return correoValido && errores.length === 0;
    };
    
})();
