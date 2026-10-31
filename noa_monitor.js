// 🔍 NOA MONITOR - Monitoreo Continuo del Sistema

(function() {
    'use strict';
    
    console.log('🔍 NOA Monitor iniciado');
    
    // ========================================
    // CONFIGURACIÓN DE MONITOREO
    // ========================================
    
    const CONFIG = {
        checkInterval: 30000, // 30 segundos
        autoRecoverOnError: false, // DESACTIVADO: recargaba cargarDatos() solo cada 30s sin avisar, causando que Total Clientes y otros contadores cambiaran solos sin que el usuario tocara nada. Ahora solo registra el problema en consola, no recarga nada automaticamente.
        logErrors: true
    };
    
    // ========================================
    // ESTADO DEL SISTEMA
    // ========================================
    
    const systemState = {
        lastCheck: null,
        errors: [],
        warnings: [],
        status: 'unknown'
    };
    
    // ========================================
    // VERIFICACIÓN PERIÓDICA
    // ========================================
    
    function checkSystem() {
        const now = new Date();
        systemState.lastCheck = now;
        
        const checks = {
            datosReales: {
                status: Array.isArray(window.datosReales),
                message: Array.isArray(window.datosReales) ? 
                    `✅ ${window.datosReales.length} clientes cargados` : 
                    '❌ datosReales no es array'
            },
            detectarColumnas: {
                status: typeof window.detectarColumnas === 'function',
                message: typeof window.detectarColumnas === 'function' ? 
                    '✅ Función disponible' : 
                    '❌ Función no encontrada'
            },
            supabase: {
                status: typeof window.supabaseClient !== 'undefined',
                message: typeof window.supabaseClient !== 'undefined' ? 
                    '✅ Supabase conectado' : 
                    '⚠️ Supabase no inicializado'
            },
            emailjs: {
                status: typeof emailjs !== 'undefined',
                message: typeof emailjs !== 'undefined' ? 
                    '✅ EmailJS disponible' : 
                    '⚠️ EmailJS no cargado'
            }
        };
        
        // Contar problemas
        const failed = Object.values(checks).filter(c => !c.status).length;
        const total = Object.keys(checks).length;
        
        systemState.status = failed === 0 ? 'healthy' : 
                             failed < total / 2 ? 'degraded' : 'critical';
        
        // Loguear si hay problemas
        if (failed > 0 && CONFIG.logErrors) {
            console.warn('⚠️ Problemas detectados en el sistema:', checks);
            
            // Auto-recuperación si está activada
            if (CONFIG.autoRecoverOnError && systemState.status === 'critical') {
                console.log('🔄 Intentando auto-recuperación...');
                if (typeof window.autoRecover === 'function') {
                    window.autoRecover();
                }
            }
        }
        
        return {
            timestamp: now,
            status: systemState.status,
            checks: checks,
            passed: total - failed,
            total: total
        };
    }
    
    // ========================================
    // REPORTE DE ESTADO
    // ========================================
    
    window.getSystemStatus = function() {
        const report = checkSystem();
        
        console.log('📊 REPORTE DEL SISTEMA');
        console.log('Estado:', report.status.toUpperCase());
        console.log('Checks:', report.passed + '/' + report.total + ' pasados');
        console.log('Última verificación:', report.timestamp.toLocaleString());
        console.log('Detalles:', report.checks);
        
        return report;
    };
    
    // ========================================
    // MONITOREO DE PERFORMANCE
    // ========================================
    
    const performanceMetrics = {
        pageLoadTime: 0,
        apiCalls: 0,
        errors: 0
    };
    
    // Capturar tiempo de carga
    window.addEventListener('load', function() {
        if (window.performance) {
            performanceMetrics.pageLoadTime = window.performance.now();
            console.log('⏱️ Página cargada en:', Math.round(performanceMetrics.pageLoadTime), 'ms');
        }
    });
    
    // Interceptar fetch para contar llamadas API
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        performanceMetrics.apiCalls++;
        return originalFetch.apply(this, args);
    };
    
    window.getPerformanceMetrics = function() {
        console.log('📈 MÉTRICAS DE PERFORMANCE');
        console.log('Tiempo de carga:', Math.round(performanceMetrics.pageLoadTime), 'ms');
        console.log('Llamadas API:', performanceMetrics.apiCalls);
        console.log('Errores capturados:', performanceMetrics.errors);
        
        return performanceMetrics;
    };
    
    // ========================================
    // INICIAR MONITOREO PERIÓDICO
    // ========================================
    
    setInterval(checkSystem, CONFIG.checkInterval);
    
    // Primera verificación después de 5 segundos
    setTimeout(() => {
        console.log('🔍 Primera verificación del sistema...');
        window.getSystemStatus();
    }, 5000);
    
    console.log('✅ Monitor configurado (verificación cada ' + (CONFIG.checkInterval/1000) + 's)');
})();
