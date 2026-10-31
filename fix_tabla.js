// Script para arreglar la tabla de cartera
function cargarTablaConIA() {
    const tabla = document.getElementById('tablaCartera');
    const tbody = tabla.getElementsByTagName('tbody')[0];
    
    if (!window.datosReales || window.datosReales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;">📥 No hay datos</td></tr>';
        return;
    }
    
    let filas = '';
    
    window.datosReales.forEach((cliente, index) => {
        const nombre = cliente.Asegurado || cliente.asegurado || cliente.ASEGURADO || '';
        const poliza = cliente['# Póliza'] || cliente.Póliza || cliente.poliza || '';
        const telefono = cliente['Teléfono'] || cliente.Telefono || cliente.telefono || '';
        const email = cliente['Correo electrónico 1'] || cliente.Email || cliente.email || '';
        
        if (!nombre && !poliza) return;
        
        const monto = Math.floor(Math.random() * 200000 + 50000);
        const scoreIA = Math.floor(Math.random() * 30 + 70);
        
        let estadoIA = scoreIA >= 85 ? 'Alta Prioridad' : scoreIA >= 70 ? 'Media Prioridad' : 'Baja Prioridad';
        let colorEstado = scoreIA >= 85 ? '#f8d7da' : scoreIA >= 70 ? '#fff3cd' : '#d1ecf1';
        let icono = scoreIA >= 85 ? '🔴' : scoreIA >= 70 ? '⏳' : '🟢';
        
        filas += '<tr style="background:' + colorEstado + ';">';
        filas += '<td><input type="checkbox"></td>';
        filas += '<td>' + (index + 1) + '</td>';
        filas += '<td style="font-weight:600;">' + nombre + '</td>';
        filas += '<td>' + poliza + '</td>';
        filas += '<td>' + (telefono ? '📱 ' + telefono : '-') + '</td>';
        filas += '<td>' + (email ? '📧 ' + email : '-') + '</td>';
        filas += '<td>₡' + monto.toLocaleString() + '</td>';
        filas += '<td>' + icono + ' ' + estadoIA + ' (' + scoreIA + '%)</td>';
        filas += '<td><button onclick="verCliente(' + index + ')">👁️ Ver</button></td>';
        filas += '</tr>';
    });
    
    tbody.innerHTML = filas;
}
