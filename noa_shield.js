// 🛡️ NOA SHIELD - Sistema de Blindaje y Validaciones
// Previene errores y protege funciones críticas

(function() {
    'use strict';
    
    console.log('🛡️ NOA Shield activado');
    
    // ========================================
    // 1. VALIDACIÓN DE DATOS CRÍTICOS
    // ========================================
    
    // Validar que window.datosReales siempre sea array
    Object.defineProperty(window, 'datosReales', {
        get: function() {
            return this._datosReales || [];
        },
        set: function(value) {
            if (!Array.isArray(value)) {
                console.warn('⚠️ Intentando setear datosReales con tipo inválido, convirtiendo a array');
                this._datosReales = [];
            } else {
                this._datosReales = value;
            }
        }
    });
    
    // ========================================
    // 2. WRAPPER SEGURO PARA FUNCIONES CRÍTICAS
    // ========================================
    
    window.safeCall = function(fn, fallback, ...args) {
        try {
            if (typeof fn === 'function') {
                return fn(...args);
            } else {
                console.warn('⚠️ Función no definida, usando fallback');
                return fallback;
            }
        } catch (error) {
            console.error('❌ Error en función:', error);
            return fallback;
        }
    };
    
    // ========================================
    // 3. VALIDADORES DE DATOS
    // ========================================
    
    window.validarEmail = function(email) {
        if (!email || typeof email !== 'string') return false;
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email.toLowerCase());
    };
    
    window.validarTelefono = function(telefono) {
        if (!telefono) return false;
        const limpio = String(telefono).replace(/\D/g, '');
        return limpio.length >= 8 && limpio.length <= 15;
    };
    
    window.validarMonto = function(monto) {
        const num = parseFloat(monto);
        return !isNaN(num) && num >= 0 && num < 1000000000;
    };
    
    // ========================================
    // 4. PROTECCIÓN DE FUNCIONES EXISTENTES
    // ========================================
    
    const originalAlert = window.alert;
    window.alert = function(msg) {
        if (!msg) msg = 'Notificación del sistema';
        return originalAlert.call(window, msg);
    };
    
    // ========================================
    // 5. DETECTAR Y RECUPERAR DE ERRORES
    // ========================================
    
    window.addEventListener('error', function(event) {
        console.error('🚨 Error capturado por Shield:', {
            mensaje: event.message,
            archivo: event.filename,
            linea: event.lineno
        });
        
        // No detener la ejecución
        event.preventDefault();
    });
    
    window.addEventListener('unhandledrejection', function(event) {
        console.error('🚨 Promise rechazada:', event.reason);
        event.preventDefault();
    });
    
    // ========================================
    // 6. HEALTH CHECK DEL SISTEMA
    // ========================================
    
    window.healthCheck = function() {
        const checks = {
            datosReales: Array.isArray(window.datosReales),
            detectarColumnas: typeof window.detectarColumnas === 'function',
            identificarProblemas: typeof window.identificarClientesConProblemas === 'function',
            supabase: typeof window.supabaseClient !== 'undefined',
            emailjs: typeof window.emailjs !== 'undefined'
        };
        
        const passed = Object.values(checks).filter(v => v).length;
        const total = Object.keys(checks).length;
        
        console.log('🏥 Health Check:', checks);
        console.log(`✅ ${passed}/${total} sistemas operativos`);
        
        return checks;
    };
    
    // ========================================
    // 7. AUTO-RECUPERACIÓN
    // ========================================
    
    window.autoRecover = function() {
        console.log('🔄 Intentando auto-recuperación...');
        
        // Reinicializar datosReales si está corrupto
        if (!Array.isArray(window.datosReales)) {
            window.datosReales = [];
            console.log('✅ datosReales reinicializado');
        }
        
        // Recargar datos de Supabase
        if (typeof window.cargarDatos === 'function') {
            window.cargarDatos();
            console.log('✅ Datos recargados');
        }
        
        console.log('✅ Auto-recuperación completada');
    };
    
    // ========================================
    // 8. EJECUTAR HEALTH CHECK AL INICIO
    // ========================================
    
    setTimeout(() => {
        window.healthCheck();
    }, 2000);
    
    console.log('🛡️ NOA Shield listo y monitoreando');
})();
