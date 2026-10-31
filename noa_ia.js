// ============================================
// NOA IA - Cross-selling con Claude AI
// ============================================

(function() {
    'use strict';
    console.log('🧠 NOA IA cargando...');

    const NOMBRE_TIPO = {
        'auto': '🚗 Automóvil',
        'camion': '🚛 Camión/Transporte',
        'medico': '🏥 Gastos Médicos',
        'rc': '⚖️ Responsabilidad Civil',
        'vida': '❤️ Vida',
        'incendio': '🔥 Incendio/Hogar',
        'robo': '🔐 Robo',
        'motocicleta': '🏍️ Motocicleta',
        'embarcacion': '⛵ Embarcación',
        'otro': '📋 Otro'
    };

    const INFO_SEGURO = {
        'vida': {
            stats: ['1 de cada 3 familias enfrenta una crisis financiera por fallecimiento del sostén del hogar', 'El 78% de las personas no tienen seguro de vida al momento de fallecer', 'Un seguro de vida puede cubrir hasta 10 años de ingresos familiares'],
            beneficios: ['Protege el patrimonio familiar ante imprevistos', 'Cubre deudas y gastos funerarios', 'Garantiza educación de los hijos', 'Tranquilidad financiera para el núcleo familiar']
        },
        'medico': {
            stats: ['Una hospitalización puede costar entre ₡500,000 y ₡5,000,000 en Costa Rica', 'El 60% de las deudas familiares se generan por gastos médicos no cubiertos', 'Los gastos médicos son la principal causa de quiebra personal'],
            beneficios: ['Atención en clínicas y hospitales privados', 'Cobertura en emergencias nacionales e internacionales', 'Medicamentos y exámenes incluidos', 'Sin listas de espera']
        },
        'rc': {
            stats: ['Un accidente con terceros puede generar demandas de hasta $500,000', 'El 40% de los negocios sin RC cierran tras una demanda mayor', 'En CR la RC es obligatoria para muchas actividades comerciales'],
            beneficios: ['Protege ante daños causados a terceros', 'Cubre gastos legales y judiciales', 'Indispensable para contratos comerciales', 'Protege el patrimonio personal y empresarial']
        },
        'incendio': {
            stats: ['En CR ocurren más de 2,000 incendios residenciales al año', 'El valor promedio de pérdidas por incendio supera los $50,000', 'Solo el 30% de los hogares costarricenses tienen seguro de incendio'],
            beneficios: ['Cubre estructura, contenido y pérdidas', 'Incluye daños por cortocircuito y explosión', 'Protege maquinaria y equipo', 'Cubre gastos de alojamiento temporal']
        },
        'robo': {
            stats: ['Costa Rica reporta más de 40,000 robos anuales a propiedades', 'El valor promedio robado por evento supera ₡800,000', 'Solo 1 de cada 5 propiedades tiene cobertura contra robo'],
            beneficios: ['Cubre equipos electrónicos, joyas y efectivo', 'Incluye robo con fuerza y asalto', 'Reposición rápida de bienes', 'Cobertura dentro y fuera del domicilio']
        },
        'auto': {
            stats: ['En CR ocurren más de 60,000 accidentes de tránsito al año', 'El costo promedio de un choque supera ₡1,500,000', 'El seguro obligatorio del COSEVI NO cubre daños al vehículo propio'],
            beneficios: ['Cubre daños propios y a terceros', 'Grúa y asistencia en carretera', 'Auto sustituto mientras se repara', 'Cobertura por robo total o parcial']
        },
        'camion': {
            stats: ['Los accidentes con camiones generan pérdidas promedio de $80,000', 'El 65% de las empresas de transporte no tienen RC suficiente', 'Una carga dañada puede costar más que el vehículo mismo'],
            beneficios: ['Cubre la carga transportada', 'RC ampliada para flotas comerciales', 'Asistencia mecánica en ruta', 'Cobertura nacional e internacional']
        },
        'motocicleta': {
            stats: ['Las motocicletas tienen 5 veces más riesgo de accidente que los autos', 'El 70% de accidentes de moto generan lesiones graves', 'El costo de reparación de una moto puede superar su valor'],
            beneficios: ['Cobertura ante accidentes y robo', 'Gastos médicos del conductor', 'RC ante terceros', 'Asistencia en carretera']
        },
        'otro': {
            stats: ['El 70% de los costarricenses están sub-asegurados', 'Un imprevisto sin seguro puede eliminar años de ahorro', 'Los seguros reducen hasta un 80% el impacto financiero de un siniestro'],
            beneficios: ['Protección integral del patrimonio', 'Tranquilidad ante imprevistos', 'Respaldo financiero inmediato', 'Asesoría profesional personalizada']
        }
    };

    const RECOMENDACIONES = {
        'auto': [
            { tipo: 'vida', nombre: 'Seguro de Vida', icono: '❤️', razon: 'Protege a tu familia si algo te pasa al volante' },
            { tipo: 'medico', nombre: 'Gastos Médicos', icono: '🏥', razon: 'Cobertura médica en accidentes de tránsito' }
        ],
        'motocicleta': [
            { tipo: 'medico', nombre: 'Gastos Médicos', icono: '🏥', razon: 'Las motos tienen 5x más riesgo de accidente' },
            { tipo: 'vida', nombre: 'Seguro de Vida', icono: '❤️', razon: 'Protección esencial para motociclistas' }
        ],
        'camion': [
            { tipo: 'rc', nombre: 'Responsabilidad Civil', icono: '⚖️', razon: 'Protección ante daños a terceros en ruta' },
            { tipo: 'vida', nombre: 'Seguro de Accidentes', icono: '🛡️', razon: 'Esencial para conductores profesionales' }
        ],
        'medico': [
            { tipo: 'vida', nombre: 'Seguro de Vida', icono: '❤️', razon: 'Complemento ideal para protección total' }
        ],
        'vida': [
            { tipo: 'medico', nombre: 'Gastos Médicos', icono: '🏥', razon: 'Cobertura completa de salud y vida' }
        ],
        'incendio': [
            { tipo: 'robo', nombre: 'Seguro de Robo', icono: '🔐', razon: 'Protección integral de su propiedad' },
            { tipo: 'rc', nombre: 'Responsabilidad Civil', icono: '⚖️', razon: 'Indispensable para comercios y empresas' }
        ],
        'robo': [
            { tipo: 'incendio', nombre: 'Incendio/Hogar', icono: '🔥', razon: 'Cobertura completa del hogar' }
        ],
        'rc': [
            { tipo: 'vida', nombre: 'Seguro de Vida', icono: '❤️', razon: 'Protección personal complementaria' }
        ],
        'otro': [
            { tipo: 'vida', nombre: 'Seguro de Vida', icono: '❤️', razon: 'Protección básica para toda familia' },
            { tipo: 'medico', nombre: 'Gastos Médicos', icono: '🏥', razon: 'La salud es la prioridad número uno' }
        ]
    };

    // ============================================
    // CLASIFICACIÓN LOCAL INTELIGENTE
    // ============================================

    function clasificarTipo(poliza, placa, tipoSeguro) {
        // 1. Usar tipo_seguro si existe
        const ts = (tipoSeguro || '').toUpperCase().trim();
        if (ts) {
            if (/AUTO|VEHICULO|VEHÍCULO|AUTOM/.test(ts)) return 'auto';
            if (/CAMION|CAMIÓN|TRANSPORTE|TRAILER|CABEZAL/.test(ts)) return 'camion';
            if (/MOTO/.test(ts)) return 'motocicleta';
            if (/MEDICO|MÉDICO|SALUD|GMM|GASTOS/.test(ts)) return 'medico';
            if (/VIDA|ACCIDENTE/.test(ts)) return 'vida';
            if (/INCENDIO|HOGAR|CASA|EDIFICIO|LOCAL|COMERCIAL|BODEGA|APTO|APARTAMENTO/.test(ts)) return 'incendio';
            if (/ROBO|HURTO/.test(ts)) return 'robo';
            if (/RESPONSABILIDAD|CIVIL|\bRC\b/.test(ts)) return 'rc';
            if (/BARCA|LANCHA|EMBARCACION|BARCO/.test(ts)) return 'embarcacion';
        }

        // 2. Analizar campo placa/objeto asegurado
        const p = (placa || '').toUpperCase().trim();
        if (p) {
            // Placa CR: 2-3 letras seguidas de 3-4 números (TSJ4659, AAA123, BHK444)
            if (/^[A-Z]{2,3}[0-9]{3,4}$/.test(p)) return 'auto';
            // Motocicleta: 1 letra + números o formato moto
            if (/^[A-Z][0-9]{5,6}$/.test(p)) return 'motocicleta';
            // Solo números largos = finca/terreno
            if (/^[0-9]{4,}$/.test(p)) return 'incendio';
            // Texto descriptivo
            if (/CASA|HOGAR|APTO|APARTAMENTO|RESIDENCIA/.test(p)) return 'incendio';
            if (/LOCAL|COMERCIAL|BODEGA|OFICINA|EDIFICIO|FINCA/.test(p)) return 'incendio';
            if (/MOTO|MOTOCICLETA/.test(p)) return 'motocicleta';
            if (/CAMION|CAMIÓN|TRAILER|CABEZAL/.test(p)) return 'camion';
            if (/BARCO|LANCHA|EMBARCACION/.test(p)) return 'embarcacion';
        }

        // 3. Fallback por número de póliza
        const pol = (poliza || '').toUpperCase();
        if (/AUT|APTV/.test(pol)) return 'auto';
        if (/CAM/.test(pol)) return 'camion';
        if (/MED|GMM/.test(pol)) return 'medico';
        if (/60B|70B|BMI|VIDA/.test(pol)) return 'vida';
        if (/INC/.test(pol)) return 'incendio';
        if (/ROB/.test(pol)) return 'robo';
        if (/RCG|\bRC\b/.test(pol)) return 'rc';

        return 'otro';
    }

        // ============================================
    // SEGUIMIENTO
    // ============================================

    const SEGUIMIENTO_KEY = 'noa_crossselling_seguimiento';
    function getSeguimiento() { try { return JSON.parse(localStorage.getItem(SEGUIMIENTO_KEY) || '{}'); } catch(e) { return {}; } }
    function guardarSeguimiento(key, estado) {
        const data = getSeguimiento();
        data[key] = { estado, fecha: new Date().toISOString() };
        localStorage.setItem(SEGUIMIENTO_KEY, JSON.stringify(data));
    }
    window.resetSeguimiento = function(key) {
        const data = getSeguimiento();
        delete data[key];
        localStorage.setItem(SEGUIMIENTO_KEY, JSON.stringify(data));
        const fila = document.getElementById('seg-' + key);
        if (fila) fila.innerHTML = '<div style="display:flex;gap:4px;"><button onclick="marcarSeguimiento(\'' + key + '\',\'contactado\')" style="background:#f59e0b;color:#fff;border:none;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:11px;">📞 Contacté</button><button onclick="marcarSeguimiento(\'' + key + '\',\'adoptado\')" style="background:#10b981;color:#fff;border:none;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:11px;">✅ Adoptó</button><button onclick="marcarSeguimiento(\'' + key + '\',\'descartado\')" style="background:#6b7280;color:#fff;border:none;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:11px;">❌ Descartar</button></div>';
    };
    window.marcarSeguimiento = function(key, estado) {
        guardarSeguimiento(key, estado);
        const colores = { contactado: '#f59e0b', adoptado: '#10b981', descartado: '#6b7280' };
        const textos = { contactado: '📞 Contactado', adoptado: '✅ Adoptó', descartado: '❌ Descartado' };
        const fila = document.getElementById('seg-' + key);
        if (fila) fila.innerHTML = '<div style="display:flex;gap:4px;align-items:center;"><span style="color:' + (colores[estado]||'#fff') + ';font-size:12px;font-weight:600;">' + (textos[estado]||estado) + '</span><button onclick="window.resetSeguimiento(\'' + key + '\')" style="background:#334155;color:#94A3B8;border:none;padding:2px 6px;border-radius:4px;cursor:pointer;font-size:10px;">↺</button></div>';
    };

    // ============================================
    // ANALIZAR CROSS-SELLING
    // ============================================
    
    window.analizarCrossSelling = function() {
        if (!window.datosReales || window.datosReales.length === 0) return;

        const container = document.getElementById('ia-crossselling');
        if (container) container.innerHTML = '<div style="text-align:center;padding:30px;color:#94A3B8;">🧠 Analizando pólizas con IA...</div>';
        
        const porCliente = {};
        window.datosReales.forEach(function(c) {
            const nombre = c.asegurado || 'Sin nombre';
            if (!porCliente[nombre]) {
                porCliente[nombre] = { nombre, telefono: c.telefono, correo: c.correo, polizas: [], tipos: new Set() };
            }
            porCliente[nombre].polizas.push(c);
        });

        // Clasificar con lógica local inteligente
        Object.values(porCliente).forEach(function(cliente) {
            cliente.polizas.forEach(function(p) {
                var tipo = clasificarTipo(p.poliza, p.placa, p.tipo_seguro);
                cliente.tipos.add(tipo);
            });
        });

        const oportunidades = [];
        Object.values(porCliente).forEach(function(cliente) {
            const tiposActuales = Array.from(cliente.tipos);
            tiposActuales.forEach(function(tipo) {
                const recs = RECOMENDACIONES[tipo] || RECOMENDACIONES['otro'];
                recs.forEach(function(rec) {
                    if (!cliente.tipos.has(rec.tipo)) {
                        // Calcular timing basado en fecha de vencimiento mas proxima
                        var hoyCS = new Date(); hoyCS.setHours(0,0,0,0);
                        var diasMin = 9999;
                        cliente.polizas.forEach(function(p) {
                            if (!p.hasta) return;
                            var f = p.hasta.includes('/') ? (function(){ var a=p.hasta.split('/'); return new Date(a[2],a[1]-1,a[0]); })() : new Date(p.hasta);
                            var d = Math.ceil((f - hoyCS) / 86400000);
                            if (d < diasMin) diasMin = d;
                        });
                        var timing, timingColor, timingBg;
                        if (diasMin < 30) { timing='⛔ Prioridad Cobro'; timingColor='#ef4444'; timingBg='rgba(239,68,68,0.1)'; }
                        else if (diasMin < 60) { timing='🟡 Considerar'; timingColor='#f59e0b'; timingBg='rgba(245,158,11,0.1)'; }
                        else { timing='🟢 Momento Ideal'; timingColor='#10b981'; timingBg='rgba(16,185,129,0.1)'; }

                        // Obtener fecha de la poliza mas proxima a vencer
                        var hastaStr = '';
                        cliente.polizas.forEach(function(p) {
                            if (p.hasta) hastaStr = p.hasta;
                        });
                        oportunidades.push({
                            cliente: cliente.nombre,
                            telefono: cliente.telefono,
                            correo: cliente.correo,
                            tiposActuales: tiposActuales,
                            polizas: cliente.polizas,
                            recomendacion: rec.nombre,
                            tipoRec: rec.tipo,
                            icono: rec.icono,
                            razon: rec.razon,
                            timing: timing,
                            timingColor: timingColor,
                            timingBg: timingBg,
                            diasVencimiento: diasMin,
                            hastaStr: hastaStr
                        });
                    }
                });
            });
        });

        const unicosMap = {};
        oportunidades.forEach(function(o) {
            const key = o.cliente + '-' + o.recomendacion;
            if (!unicosMap[key]) unicosMap[key] = o;
        });

        renderizarCrossSelling(Object.values(unicosMap).slice(0, 10));
    };
    
    function renderizarCrossSelling(oportunidades) {
        const container = document.getElementById('ia-crossselling');
        if (!container) return;

        if (oportunidades.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:40px;color:#94A3B8;"><div style="font-size:2.5em;margin-bottom:10px;">✅</div><div style="font-size:15px;">No hay oportunidades para mostrar</div><button type="button" onclick="window._filtroCS&&window._filtroCS(&quot;&quot;)" style="margin-top:14px;">Ver todas</button></div>';
            return;
        }

        const seguimiento = getSeguimiento();
        window._oportunidadesCS = window._oportunidadesCS || oportunidades;
        window._renderCrossSelling = renderizarCrossSelling;

        window._filtroCS = function(tipo) {
            if (!tipo) { window._renderCrossSelling(window._oportunidadesCS); return; }
            window._renderCrossSelling(window._oportunidadesCS.filter(function(o){ return o.timing.indexOf(tipo) >= 0; }));
        };
        const total = (window._oportunidadesCS||oportunidades).length;
        const filtros = '<div id="cs-filtros" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;padding-bottom:15px;border-bottom:1px solid #334155;">' +
            '<button data-filtro="" style="background:#475569;color:#fff;border:none;padding:7px 16px;border-radius:20px;cursor:pointer;font-size:12px;font-weight:600;">Todas (' + total + ')</button>' +
            '<button data-filtro="Momento Ideal" style="background:rgba(16,185,129,0.15);color:#10b981;border:1px solid #10b981;padding:7px 16px;border-radius:20px;cursor:pointer;font-size:12px;font-weight:600;">Momento Ideal</button>' +
            '<button data-filtro="Considerar" style="background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid #f59e0b;padding:7px 16px;border-radius:20px;cursor:pointer;font-size:12px;font-weight:600;">Considerar</button>' +
            '<button data-filtro="Prioridad Cobro" style="background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid #ef4444;padding:7px 16px;border-radius:20px;cursor:pointer;font-size:12px;font-weight:600;">Prioridad Cobro</button>' +
        '</div>';

        const cards = oportunidades.map(function(o) {
            const segKey = (o.cliente + '-' + o.recomendacion).replace(/[^a-zA-Z0-9]/g, '_');
            const segActual = seguimiento[segKey];
            const coloresSeg = { contactado: '#f59e0b', adoptado: '#10b981', descartado: '#6b7280' };
            const textosSeg = { contactado: '📞 Contactado', adoptado: '✅ Adoptó', descartado: '❌ Descartado' };
            const polizasActuales = o.tiposActuales.filter(function(t){return t!=='otro';}).map(function(t){ return NOMBRE_TIPO[t]||t; }).filter(function(v,i,a){return a.indexOf(v)===i;}).join(' · ') || 'Sin clasificar';
            const borderColor = o.timingColor || '#8b5cf6';

            return '<div style="background:#1e293b;border-radius:14px;overflow:hidden;border:1px solid #334155;">' +
                // Header con timing
                '<div style="background:' + (o.timingBg||'rgba(16,185,129,0.1)') + ';padding:10px 16px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e2e8f0;">' +
                    '<span style="color:' + borderColor + ';font-size:12px;font-weight:700;">' + (o.timing||'🟢 Momento Ideal') + '</span>' +
                    '<span style="color:#64748b;font-size:11px;">📅 Vence: <strong style="color:' + borderColor + ';">' + (o.hastaStr||'N/A') + '</strong></span>' +
                '</div>' +
                // Body
                '<div style="padding:14px 16px;background:#fff;">' +
                    // Cliente
                    '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">' +
                        '<div style="flex:1;">' +
                            '<div onclick="window.irClienteDesdeCS(decodeURIComponent(this.dataset.nombre))" data-nombre="' + encodeURIComponent(o.cliente) + '" style="color:#fff;font-weight:700;font-size:14px;cursor:pointer;" title="Ver en Cartera">' + o.cliente.substring(0,30) + (o.cliente.length>30?'...':'') + ' <span style="color:#64748b;font-size:11px;">↗</span></div>' +
                            '<div style="color:#64748b;font-size:11px;margin-top:2px;">Tiene: ' + polizasActuales + '</div>' +
                        '</div>' +
                        '<div style="display:flex;gap:5px;margin-left:8px;">' +
                            (o.telefono ? '<button class="cs-wa-btn" data-tel="' + encodeURIComponent(o.telefono) + '" data-nombre="' + encodeURIComponent(o.cliente) + '" data-prod="' + encodeURIComponent(o.recomendacion) + '" style="background:#22c55e;color:#fff;border:none;width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:14px;">📱</button>' : '') +
                            (o.correo ? '<button class="cs-email-btn" data-correo="' + encodeURIComponent(o.correo) + '" data-nombre="' + encodeURIComponent(o.cliente) + '" data-prod="' + encodeURIComponent(o.recomendacion) + '" style="background:#3b82f6;color:#fff;border:none;width:32px;height:32px;border-radius:8px;cursor:pointer;font-size:14px;">📧</button>' : '') +
                        '</div>' +
                    '</div>' +
                    // Oportunidad
                    '<div style="background:#f8fafc;border-radius:8px;padding:10px;margin-bottom:10px;display:flex;align-items:center;gap:10px;border:1px solid #e2e8f0;">' +
                        '<span style="font-size:1.6em;">' + o.icono + '</span>' +
                        '<div>' +
                            '<div style="color:#7c3aed;font-size:13px;font-weight:700;">' + o.recomendacion + '</div>' +
                            '<div style="color:#475569;font-size:12px;margin-top:2px;">' + o.razon + '</div>' +
                        '</div>' +
                    '</div>' +
                    // Seguimiento
                    '<div id="seg-' + segKey + '" style="display:flex;gap:5px;flex-wrap:wrap;">' +
                        (segActual ?
                            '<span style="color:' + (coloresSeg[segActual.estado]||'#fff') + ';font-size:12px;font-weight:600;padding:4px 10px;background:rgba(0,0,0,0.3);border-radius:6px;">' + (textosSeg[segActual.estado]||segActual.estado) + '</span>' +
                            '<button class="cs-reset-btn" data-key="' + segKey + '" style="background:#334155;color:#94A3B8;border:none;padding:4px 8px;border-radius:6px;cursor:pointer;font-size:10px;">↺</button>' :
                            '<button class="cs-seg-btn" data-key="' + segKey + '" data-estado="contactado" style="background:#f59e0b;color:#fff;border:none;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;">📞 Contacté</button>' +
                            '<button class="cs-seg-btn" data-key="' + segKey + '" data-estado="adoptado" style="background:#10b981;color:#fff;border:none;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;">✅ Adoptó</button>' +
                            '<button class="cs-seg-btn" data-key="' + segKey + '" data-estado="descartado" style="background:#475569;color:#94A3B8;border:none;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:11px;">❌</button>'
                        ) +
                    '</div>' +
                '</div>' +
            '</div>';
        }).join('');

        container.innerHTML = filtros +
            '<div style="color:#64748b;font-size:12px;margin-bottom:15px;">Mostrando ' + oportunidades.length + ' oportunidades</div>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:15px;">' + cards + '</div>';

        // Event listener para filtros
        const filtrosDiv = document.getElementById('cs-filtros');
        if (filtrosDiv) {
            filtrosDiv.addEventListener('click', function(e) {
                const btn = e.target.closest('button');
                if (!btn) return;
                window._filtroCS(btn.dataset.filtro);
            });
        }
        // Event listeners para WA, Email y Seguimiento
        if (!container.dataset.csL) { container.dataset.csL = '1'; container.addEventListener('click', function(e) {
            const wa = e.target.closest('.cs-wa-btn');
            if (wa) { enviarCrossSellingWA(decodeURIComponent(wa.dataset.tel), decodeURIComponent(wa.dataset.nombre), decodeURIComponent(wa.dataset.prod)); return; }
            const em = e.target.closest('.cs-email-btn');
            if (em) { enviarCrossSellingEmail(decodeURIComponent(em.dataset.correo), decodeURIComponent(em.dataset.nombre), decodeURIComponent(em.dataset.prod)); return; }
            const seg = e.target.closest('.cs-seg-btn');
            if (seg) { marcarSeguimiento(seg.dataset.key, seg.dataset.estado); return; }
            const reset = e.target.closest('.cs-reset-btn');
            if (reset) { window.resetSeguimiento(reset.dataset.key); return; }
        }); }
    }

    
    window.calcularAlertasCriticas = async function() {
        const alertas = [];
        if (window.datosReales) {
            const hoy = new Date(); hoy.setHours(0,0,0,0);
            window.datosReales.forEach(function(c) {
                if (!c.hasta || c.estado === 'pagado' || c._pagado) return;
                let fechaHasta;
                if (c.hasta.includes('/')) { const [d,m,y] = c.hasta.split('/'); fechaHasta = new Date(y,m-1,d); } else { fechaHasta = new Date(c.hasta); }
                const diasMora = Math.floor((hoy - fechaHasta) / 86400000);
                if (diasMora > 15) alertas.push({ tipo: 'mora', icono: '🔴', titulo: c.asegurado || 'Sin nombre', detalle: 'Póliza ' + (c.poliza||'') + ' - ' + diasMora + ' días de mora', severidad: diasMora > 30 ? 'critica' : 'alta' });
            });
        }
        if (window.datosReales) {
            const hoy = new Date(); hoy.setHours(0,0,0,0);
            window.datosReales.forEach(function(c) {
                if (!c.hasta || c._pagado) return;
                let fechaHasta;
                if (c.hasta.includes('/')) { const [d,m,y] = c.hasta.split('/'); fechaHasta = new Date(y,m-1,d); } else { fechaHasta = new Date(c.hasta); }
                const diasRestantes = Math.ceil((fechaHasta - hoy) / 86400000);
                if (diasRestantes <= 7 && diasRestantes >= 0) alertas.push({ tipo: 'vencer', icono: '⚠️', titulo: c.asegurado, detalle: 'Póliza ' + c.poliza + ' vence en ' + diasRestantes + ' días', severidad: diasRestantes <= 3 ? 'critica' : 'media' });
            });
        }
        const orden = { critica: 0, alta: 1, media: 2 };
        alertas.sort(function(a,b){ return orden[a.severidad] - orden[b.severidad]; });
        renderizarAlertas(alertas.slice(0,10));
    };
    
    function renderizarAlertas(alertas) {
        const container = document.getElementById('ia-alertas');
        if (!container) return;
        if (alertas.length === 0) { container.innerHTML = '<div style="text-align:center;padding:30px;color:#10b981;"><div style="font-size:2em;">✅</div>No hay alertas críticas</div>'; return; }
        const colores = { critica: '#ef4444', alta: '#f59e0b', media: '#3b82f6' };
        container.innerHTML = '<div style="color:#94A3B8;margin-bottom:15px;font-size:14px;">' + alertas.length + ' alertas activas</div>' +
            alertas.map(function(a){ return '<div style="background:#1e293b;border-radius:12px;padding:15px;margin-bottom:12px;border-left:4px solid ' + colores[a.severidad] + ';"><div style="display:flex;align-items:center;gap:10px;"><span style="font-size:1.5em;">' + a.icono + '</span><div><div style="color:#fff;font-weight:600;">' + a.titulo.substring(0,35) + '</div><div style="color:#94A3B8;font-size:13px;">' + a.detalle + '</div></div></div></div>'; }).join('');
    }

    // ============================================
    // ENVIAR CROSS-SELLING
    // ============================================
    
    window.enviarCrossSellingWA = function(telefono, cliente, producto) {
        const mensaje = 'Estimado/a ' + cliente + ',\n\nEn NOA hemos analizado su perfil y tenemos una excelente oportunidad:\n\n🛡️ ' + producto + '\n\nEste seguro complementaría perfectamente su cobertura actual.\n\n¿Le gustaría recibir más información?\n\nQuedamos atentos.';
        const telLimpio = telefono.replace(/\D/g,'');
        const telCompleto = telLimpio.startsWith('506') ? telLimpio : '506' + telLimpio;

        // Modal de confirmación
        const modalId = 'modal-cs-wa-' + Date.now();
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center;';
        const msgEsc = mensaje.replace(/'/g, "\'");
        modal.innerHTML = '<div style="background:#1E293B;border-radius:12px;padding:28px;max-width:480px;width:90%;color:white;">' +
            '<h3 style="margin:0 0 16px;color:#25d366;">📱 Mensaje para ' + cliente + '</h3>' +
            '<label style="font-size:13px;color:#94a3b8;">Mensaje:</label>' +
            '<textarea id="txt-' + modalId + '" style="width:100%;height:140px;margin-top:8px;padding:10px;background:#0F172A;color:white;border:1px solid #334155;border-radius:8px;font-size:13px;resize:vertical;">' + mensaje + '</textarea>' +
            '<div style="display:flex;gap:10px;margin-top:16px;">' +
            '<button onclick="document.getElementById(\'' + modalId + '\').remove()" style="flex:1;padding:10px;background:#334155;color:white;border:none;border-radius:8px;cursor:pointer;">Cancelar</button>' +
            '<button id="btn-enviar-' + modalId + '" style="flex:1;padding:10px;background:#25d366;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;">📲 Enviar</button>' +
            '</div></div>';
        document.body.appendChild(modal);
        document.getElementById('btn-enviar-' + modalId).onclick = function() {
            var txt = document.getElementById('txt-' + modalId).value;
            document.getElementById(modalId).remove();
            if (window.enviarWAIndividual) {
                window.enviarWAIndividual(telCompleto, txt, cliente, null, 'manual');
            } else {
                window.open('https://wa.me/' + telCompleto + '?text=' + encodeURIComponent(txt), '_blank');
            }
        };
    };
    
    window.enviarCrossSellingEmail = function(correo, cliente, producto) {
        const asunto = 'Oportunidad de cobertura: ' + producto;
        const mensaje = 'Estimado/a ' + cliente + ',\n\nHemos analizado su perfil y detectamos una oportunidad:\n\n🛡️ ' + producto + '\n\n¿Le gustaría agendar una llamada para conocer los beneficios?\n\nQuedamos atentos.';
        window.location.href = 'mailto:' + correo + '?subject=' + encodeURIComponent(asunto) + '&body=' + encodeURIComponent(mensaje);
    };


    window.irClienteDesdeCS = function(nombreCliente) {
        const datos = window._datosRealesBackup || window.datosReales || [];
        window._datosRealesBackup = window.datosReales;
        const filtrados = datos.filter(function(c) {
            return (c.asegurado || '').toUpperCase().includes(nombreCliente.toUpperCase().substring(0,15));
        });
        window.datosReales = filtrados.length > 0 ? filtrados : datos;
        cambiarTab('cartera');
        setTimeout(function() {
            if (typeof window.setFiltroCartera === 'function') window.setFiltroCartera('TODO');
        }, 300);
    };

    window.inicializarIA = async function() {
        console.log('🧠 Inicializando IA...');
        await window.analizarCrossSelling();
        await window.calcularAlertasCriticas();
        console.log('🧠 IA inicializada ✅');
    };

    console.log('🧠 NOA IA cargado ✅');
})();
