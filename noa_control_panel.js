// 🎛️ NOA CONTROL PANEL - Panel de Control del Sistema

(function() {
    'use strict';
    
    console.log('🎛️ Control Panel cargado');
    
    // ========================================
    // COMANDOS GLOBALES
    // ========================================
    
    window.NOA = {
        version: '6.0.0',
        
        // Sistema
        status: () => window.getSystemStatus(),
        health: () => window.healthCheck(),
        recover: () => window.autoRecover(),
        performance: () => window.getPerformanceMetrics(),
        
        // Backups
        backup: {
            crear: () => window.crearBackup(true),
            listar: () => window.listarBackups(),
            restaurar: (index) => window.restaurarBackup(index || 0),
            exportar: () => window.exportarBackup()
        },
        
        // Datos
        datos: {
            count: () => window.datosReales ? window.datosReales.length : 0,
            columnas: () => window.detectarColumnas(window.datosReales),
            problemas: () => window.identificarClientesConProblemas()
        },
        
        // Utilidades
        help: () => {
            console.log('🎛️ NOA CONTROL PANEL - Comandos Disponibles:');
            console.log('');
            console.log('📊 SISTEMA:');
            console.log('  NOA.status()        - Estado del sistema');
            console.log('  NOA.health()        - Health check completo');
            console.log('  NOA.recover()       - Auto-recuperación');
            console.log('  NOA.performance()   - Métricas de performance');
            console.log('');
            console.log('💾 BACKUPS:');
            console.log('  NOA.backup.crear()          - Crear backup manual');
            console.log('  NOA.backup.listar()         - Listar backups');
            console.log('  NOA.backup.restaurar(0)     - Restaurar backup');
            console.log('  NOA.backup.exportar()       - Descargar backup');
            console.log('');
            console.log('📋 DATOS:');
            console.log('  NOA.datos.count()           - Cantidad de clientes');
            console.log('  NOA.datos.columnas()        - Ver columnas detectadas');
            console.log('  NOA.datos.problemas()       - Detectar problemas');
            console.log('');
            console.log('🛠️ UTILIDADES:');
            console.log('  NOA.help()                  - Mostrar esta ayuda');
            console.log('  NOA.version                 - Versión del sistema');
            console.log('');
            console.log('💡 Tip: Todos los comandos se pueden ejecutar en la consola');
        }
    };
    
    // ========================================
    // MOSTRAR AYUDA AL INICIO
    // ========================================
    
    setTimeout(() => {
        console.log('');
        console.log('═══════════════════════════════════════════');
        console.log('🛡️  SISTEMA NOA V6 - MODO BLINDADO ACTIVO');
        console.log('═══════════════════════════════════════════');
        console.log('');
        console.log('✅ Shield activado');
        console.log('✅ Monitor operativo');
        console.log('✅ Backup automático configurado');
        console.log('✅ Control Panel disponible');
        console.log('');
        console.log('💡 Escribe NOA.help() para ver comandos disponibles');
        console.log('');
    }, 3000);
    
})();
