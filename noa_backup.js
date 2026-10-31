// 💾 NOA BACKUP - Sistema de Respaldo Automático

(function() {
    'use strict';
    
    console.log('💾 NOA Backup inicializado');
    
    // ========================================
    // CONFIGURACIÓN
    // ========================================
    
    const CONFIG = {
        autoBackupInterval: 300000, // 5 minutos
        maxBackups: 5,
        backupPrefix: 'noa_backup_'
    };
    
    // ========================================
    // CREAR BACKUP
    // ========================================
    
    window.crearBackup = function(manual = false) {
        try {
            if (!window.datosReales || window.datosReales.length === 0) {
                console.log('ℹ️ No hay datos para respaldar');
                return false;
            }
            
            const backup = {
                timestamp: new Date().toISOString(),
                version: 'v5',
                clientesCount: window.datosReales.length,
                datos: window.datosReales,
                columnas: window.columnasMapeadas || null,
                manual: manual
            };
            
            const backupKey = CONFIG.backupPrefix + Date.now();
            localStorage.setItem(backupKey, JSON.stringify(backup));
            
            console.log('✅ Backup creado:', backupKey);
            
            // Limpiar backups viejos
            limpiarBackupsViejos();
            
            return true;
            
        } catch (error) {
            console.error('❌ Error creando backup:', error);
            return false;
        }
    };
    
    // ========================================
    // LIMPIAR BACKUPS VIEJOS
    // ========================================
    
    function limpiarBackupsViejos() {
        try {
            const backups = [];
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(CONFIG.backupPrefix)) {
                    backups.push(key);
                }
            }
            
            // Ordenar por fecha (más recientes primero)
            backups.sort().reverse();
            
            // Eliminar backups excedentes
            if (backups.length > CONFIG.maxBackups) {
                const toDelete = backups.slice(CONFIG.maxBackups);
                toDelete.forEach(key => {
                    localStorage.removeItem(key);
                    console.log('🗑️ Backup antiguo eliminado:', key);
                });
            }
            
        } catch (error) {
            console.error('❌ Error limpiando backups:', error);
        }
    }
    
    // ========================================
    // LISTAR BACKUPS
    // ========================================
    
    window.listarBackups = function() {
        const backups = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(CONFIG.backupPrefix)) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    backups.push({
                        key: key,
                        timestamp: data.timestamp,
                        clientes: data.clientesCount,
                        manual: data.manual || false
                    });
                } catch (e) {
                    console.warn('⚠️ Backup corrupto:', key);
                }
            }
        }
        
        backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        console.log('📋 BACKUPS DISPONIBLES:', backups.length);
        backups.forEach((b, i) => {
            const fecha = new Date(b.timestamp).toLocaleString();
            const tipo = b.manual ? 'MANUAL' : 'AUTO';
            console.log(`${i+1}. [${tipo}] ${fecha} - ${b.clientes} clientes`);
        });
        
        return backups;
    };
    
    // ========================================
    // RESTAURAR BACKUP
    // ========================================
    
    window.restaurarBackup = function(index = 0) {
        const backups = window.listarBackups();
        
        if (backups.length === 0) {
            alert('❌ No hay backups disponibles');
            return false;
        }
        
        if (index < 0 || index >= backups.length) {
            alert('❌ Índice de backup inválido');
            return false;
        }
        
        const backup = backups[index];
        
        if (!confirm(`¿Restaurar backup de ${new Date(backup.timestamp).toLocaleString()} con ${backup.clientes} clientes?`)) {
            return false;
        }
        
        try {
            const data = JSON.parse(localStorage.getItem(backup.key));
            window.datosReales = normalizarLote(data.datos);
            window.columnasMapeadas = data.columnas;
            
            console.log('✅ Backup restaurado:', backup.clientes, 'clientes');
            
            // Actualizar interfaz
            if (typeof window.renderCartera === 'function') {
                window.renderCartera();
            }
            
            if (typeof window.actualizarSemaforo === "function") {
                window.actualizarSemaforo();
            }
            
            if (typeof window.actualizarEstadisticas === "function") {
                window.actualizarEstadisticas();
            }
            
            alert('✅ Backup restaurado exitosamente');
            return true;
            
        } catch (error) {
            console.error('❌ Error restaurando backup:', error);
            alert('❌ Error restaurando backup');
            return false;
        }
    };
    
    // ========================================
    // BACKUP AUTOMÁTICO
    // ========================================
    
    function iniciarBackupAutomatico() {
        // Backup inicial después de 30 segundos
        setTimeout(() => {
            if (window.datosReales && window.datosReales.length > 0) {
                window.crearBackup(false);
            }
        }, 30000);
        
        // Backups periódicos
        setInterval(() => {
            if (window.datosReales && window.datosReales.length > 0) {
                window.crearBackup(false);
            }
        }, CONFIG.autoBackupInterval);
        
        console.log('✅ Backup automático configurado (cada ' + (CONFIG.autoBackupInterval/60000) + ' minutos)');
    }
    
    // ========================================
    // EXPORTAR BACKUP A ARCHIVO
    // ========================================
    
    window.exportarBackup = function() {
        try {
            if (!window.datosReales || window.datosReales.length === 0) {
                alert('❌ No hay datos para exportar');
                return;
            }
            
            const backup = {
                timestamp: new Date().toISOString(),
                version: 'v5',
                clientesCount: window.datosReales.length,
                datos: window.datosReales
            };
            
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'noa_backup_' + new Date().toISOString().split('T')[0] + '.json';
            a.click();
            URL.revokeObjectURL(url);
            
            console.log('✅ Backup exportado');
            
        } catch (error) {
            console.error('❌ Error exportando backup:', error);
            alert('Error exportando backup');
        }
    };
    
    // ========================================
    // INICIAR SISTEMA
    // ========================================
    
    iniciarBackupAutomatico();
    
    console.log('✅ Sistema de backup listo');
    console.log('💡 Comandos disponibles:');
    console.log('  - crearBackup(true) : Crear backup manual');
    console.log('  - listarBackups() : Ver backups disponibles');
    console.log('  - restaurarBackup(0) : Restaurar backup más reciente');
    console.log('  - exportarBackup() : Descargar backup como archivo');
})();
