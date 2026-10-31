/**
 * NOA NORMALIZADOR INTELIGENTE - Módulo Central de Normalización y Validación
 * 
 * BÚSQUEDA INTELIGENTE:
 * - Ignora mayúsculas/minúsculas
 * - Ignora espacios extras al inicio/final
 * - Busca por palabras clave, no strings exactos
 * - Detecta automáticamente columnas similares
 */

(function() {
    'use strict';

    // =========================================
    // DICCIONARIO DE MAPEO DE CAMPOS
    // Ahora usa PALABRAS CLAVE en lugar de strings exactos
    // =========================================
    const MAPEO_CAMPOS = {
        // ─── PÓLIZA ───────────────────────────────────────────────────────────
        // Cómo las corredoras la llaman: Póliza, Seguro, Contrato, Certificado, Folio, N°, Código
        poliza: {
            keywords: [
                'poliza', 'póliza', '# poliza', '# póliza', 'no poliza', 'n° poliza', 'nro poliza',
                'numero poliza', 'número póliza', 'numero de poliza', 'número de póliza',
                'seguro', 'no seguro', 'numero seguro', 'número de seguro',
                'contrato', 'no contrato', 'numero contrato', 'número de contrato',
                'certificado', 'no certificado', 'cert', 'folio', 'codigo poliza',
                'id poliza', 'clave', 'referencia', 'expediente', 'aptv', 'num poliza',
                'no. seguro', 'no seguro', 'no. poliza', 'no. póliza', 'nro. poliza'
            ],
            excluir: ['nombre', 'asegurado', 'correo', 'telefono'],
            requerido: true
        },

        // ─── NOMBRE ASEGURADO ─────────────────────────────────────────────────
        // Cómo las corredoras lo llaman: Asegurado, Cliente, Nombre, Titular, Tomador, Beneficiario
        asegurado: {
            keywords: [
                'asegurado', 'nombre asegurado', 'nombre del asegurado',
                'tomador', 'nombre tomador', 'nombre del tomador',
                'cliente', 'nombre cliente', 'nombre del cliente',
                'titular', 'nombre titular', 'nombre del titular',
                'beneficiario', 'propietario', 'contratante',
                'nombre completo', 'nombre', 'razon social', 'razón social',
                'empresa', 'entidad', 'persona', 'aseg',
                'client name', 'customer name', 'insured name', 'policy holder', 'name',
                'nomase', 'nomas'
            ],
            excluir: ['tipo', 'prima', 'monto', 'poliza', 'correo', 'telefono', 'cedula', 'identificacion', 'aseguradora', 'asegurador', 'email', 'mail', 'correo'],
            requerido: true
        },

        // 'hasta' (proximo_pago) ya NO viene del Excel — se CALCULA desde FDESDE + periodicidad
        // ver calcularFechasCobro() al final de normalizarCliente

        // ─── VENCIMIENTO CONTRATO ────────────────────────────────────────────────
        vence_contrato: {
            keywords: ['fhasta', 'fecha hasta', 'fin vigencia', 'vencimiento contrato', 'fin contrato'],
            excluir: ['desde', 'inicio', 'pago'],
            requerido: false,
            transformar: 'fecha'
        },

        // ─── FECHA INICIO ─────────────────────────────────────────────────────
        // Cómo las corredoras la llaman: Desde, Inicio, Emisión, Vigencia desde
        desde: {
            keywords: [
                'desde', 'fec desde', 'fecha desde',
                'inicio', 'fecha inicio', 'fec inicio',
                'fecha de inicio', 'inicio vigencia',
                'emision', 'emisión', 'fecha emision', 'fecha de emision',
                'vigencia desde', 'vigencia inicio', 'inicio de vigencia',
                'fecha inicio cobertura', 'fecha contrato',
                'periodo desde', 'período desde',
                'cobertura desde', 'inicio cobertura', 'fdesde', 'fec desde',
                'start date', 'inception date', 'effective date', 'issue date'
            ],
            excluir: ['hasta', 'vencimiento', 'fin'],
            requerido: false,
            transformar: 'fecha'
        },

        // ─── TELÉFONO ─────────────────────────────────────────────────────────
        // Cómo las corredoras lo llaman: Teléfono, Celular, WhatsApp, Contacto, Tel
        telefono: {
            keywords: [
                'telefono', 'teléfono', 'telefono 1', 'teléfono 1',
                'celular', 'celular 1', 'cel',
                'movil', 'móvil', 'telefono movil', 'teléfono móvil',
                'whatsapp', 'numero whatsapp', 'número whatsapp',
                'tel', 'tel 1', 'tel.', 'telef',
                'contacto', 'numero contacto', 'número de contacto',
                'numero de telefono', 'número de teléfono',
                'telefono principal', 'teléfono principal',
                'numero celular', 'número celular',
                'fono', 'phone', 'phone number', 'mobile', 'mobile number', 'cell', 'cell phone',
                'telefo'
            ],
            excluir: ['correo', 'email', 'mail', 'fax'],
            requerido: false
        },

        // ─── CORREO ───────────────────────────────────────────────────────────
        // Cómo las corredoras lo llaman: Email, Correo, Mail, E-mail
        correo: {
            keywords: [
                'correo', 'correo electronico', 'correo electrónico',
                'correo 1', 'correo electronico 1',
                'email', 'email 1', 'e-mail', 'e-mail 1',
                'mail', 'mail 1', 'emailaddress',
                'direccion email', 'dirección email',
                'contacto email', 'correo contacto',
                'correo principal', 'email principal',
                'email address', 'emailaddress', 'contact email'
            ],
            excluir: ['telefono', 'celular'],
            requerido: false
        },

        // ─── PRIMA / MONTO ────────────────────────────────────────────────────
        // Cómo las corredoras la llaman: Prima, Monto, Cuota, Tarifa, Valor, Precio
        prima: {
            keywords: [
                'prima', 'prima a cobrar', 'prima cobrar', 'prima neta',
                'prima mensual', 'prima anual', 'prima total',
                'monto', 'monto a cobrar', 'monto cobrar', 'monto prima',
                'cuota', 'cuota mensual', 'cuota a pagar',
                'tarifa', 'tarifa mensual',
                'valor', 'valor prima', 'valor cuota', 'valor a pagar',
                'importe', 'costo', 'precio', 'precio prima',
                'mensualidad', 'anualidad', 'pago', 'monto pago',
                'prima a pagar', 'cobrar', 'a cobrar', 'tprima',
                'premium', 'premium amount', 'amount', 'fee', 'rate',
                'insurance premium', 'monthly premium', 'annual premium'
            ],
            excluir: ['comision', 'comisión', 'descuento', 'iva', 'impuesto', 'colectiva'],
            requerido: true
        },

        // ─── PERIODICIDAD ─────────────────────────────────────────────────────
        // Cómo las corredoras la llaman: F. Pago, Forma de Pago, Frecuencia, Periodo
        periodicidad: {
            keywords: [
                'periodicidad', 'periodo', 'período',
                'frecuencia', 'frecuencia de pago', 'frecuencia pago',
                'forma pago', 'forma de pago', 'f pago', 'f. pago',
                'modalidad pago', 'modalidad de pago',
                'tipo pago', 'tipo de pago',
                'plan pago', 'plan de pago',
                'facturacion', 'facturación', 'ciclo pago',
                'payment frequency', 'frequency', 'billing cycle', 'payment mode',
                'fpagoc', 'fpago', 'fipago'
            ],
            excluir: ['fecha', 'monto', 'prima'],
            requerido: true
        },

        // ─── ASEGURADORA ──────────────────────────────────────────────────────
        // Cómo las corredoras la llaman: Aseguradora, Compañía, CIA, Empresa, INS, ASSA
        aseguradora: {
            keywords: [
                'aseguradora', 'nombre aseguradora',
                'compania', 'compañía', 'cia', 'cía', 'cia aseguradora',
                'empresa aseguradora', 'empresa',
                'proveedor', 'proveedor seguro',
                'ins', 'assa', 'sura', 'mapfre', 'lafise', 'qualitas', 'mnk',
                'entidad aseguradora', 'entidad',
                'insurance company', 'insurer', 'carrier', 'underwriter'
            ],
            excluir: ['prima', 'moneda', 'comision', 'nombre asegurado', 'cliente', 'detalle', 'marca', 'modelo'],
            requerido: true
        },

        // ─── MONEDA ───────────────────────────────────────────────────────────
        moneda: {
            keywords: [
                'moneda', 'currency', 'divisa', 'tipo moneda',
                'moneda pago', 'tipo de moneda',
                'currency', 'currency code'
            ],
            excluir: ['prima', 'monto'],
            requerido: false,
            defaultValido: 'CRC'
        },

        // ─── PLACA / VEHÍCULO ─────────────────────────────────────────────────
        // Cómo las corredoras lo llaman: Placa, Matrícula, Vehículo, Folio
        placa: {
            keywords: [
                'placa', 'num placa', 'número placa', 'numero placa',
                'matricula', 'matrícula', 'chasis',
                'vehiculo', 'vehículo', 'auto',
                'marca vehiculo', 'modelo'
            ],
            excluir: ['nombre', 'asegurado'],
            requerido: false
        },

        // ─── TIPO DE SEGURO / RAMO ────────────────────────────────────────────
        // Cómo las corredoras lo llaman: Ramo, Producto, Tipo, Línea, Cobertura
        tipo_seguro: {
            keywords: [
                'producto', 'tipo de seguro', 'tipo seguro',
                'ramo', 'linea', 'línea', 'line',
                'cobertura', 'tipo cobertura',
                'clase seguro', 'categoria', 'categoría',
                'modalidad', 'plan', 'tipo de poliza', 'tipo de póliza',
                'coverage type', 'product type', 'line of business', 'insurance type'
            ],
            excluir: ['prima', 'monto', 'fecha'],
            requerido: false
        },

        // ─── IDENTIFICACIÓN ───────────────────────────────────────────────────
        // Cómo las corredoras lo llaman: Cédula, ID, Documento, RUC
        identificacion: {
            keywords: [
                'identificacion', 'identificación',
                'cedula', 'cédula', 'cedula juridica', 'cédula jurídica',
                'cedula identidad', 'numero cedula', 'número cédula',
                'documento', 'num documento', 'id cliente',
                'ruc', 'nit', 'dni', 'pasaporte',
                'numero identidad', 'número de identidad',
                'cod cliente', 'codigo cliente', 'id asegurado',
                'id number', 'id no', 'identification number', 'tax id'
            ],
            excluir: ['service', 'email', 'correo'],
            requerido: false
        }
    };

    // =========================================
    // BÚSQUEDA INTELIGENTE DE COLUMNAS
    // =========================================
    
    function normalizarTexto(str) {
        if (!str) return '';
        return str.toString()
            .toLowerCase()
            .trim()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    // Raíces de palabras por campo — detecta cualquier variación sin necesidad de estar en keywords
    var RAICES_CAMPO = {
        poliza:        ['poliz','segur','contra','certif','polic','folio','aptv','expedient','referenc'],
        asegurado:     ['tomad','titular','benefic','propietar','contratant','insured','holder','person','nombre','nomase'],
        hasta:         ['vencim','hasta','expir','renov','vigencia h','fin vig','fecha fin','due','expiry','maturity','end date'],
        desde:         ['inici','desde','emis','efectiv','vigencia d','inicio vig','start','inception','effective','issue'],
        telefono:      ['telef','celul','movil','whatsap','phone','mobil','cell','fono','contact'],
        correo:        ['correo','email','e-mail','mail','emai'],
        prima:         ['prima','cuota','monto','tarif','valor','impor','costo','precio','mensual','anual','cobrar','premium','amount','fee'],
        periodicidad:  ['period','frecuen','forma.pag','fpago','billing','payment.freq','modalid','ciclo','payment mode'],
        aseguradora:   ['asegurador','compan','cia.','insurer','carrier','underwr','proveedor'],
        moneda:        ['moneda','currency','divisa','curr'],
        identificacion:['cedula','identif','docum','pasap','ruc','dni','nit'],
        tipo_seguro:   ['ramo','product','cobertu','tipo.seg','line.of','coverage','insurance.type'],
        placa:         ['placa','matricul','vehic','chasis','folio']
    };

    function columnaCoincide(nombreColumna, config) {
        const colNorm = normalizarTexto(nombreColumna);
        
        // 1. Verificar exclusiones
        for (const excl of (config.excluir || [])) {
            if (colNorm.includes(normalizarTexto(excl))) return false;
        }
        
        // 2. Coincidencia exacta o por keyword
        for (const kw of config.keywords) {
            const kwNorm = normalizarTexto(kw);
            if (colNorm === kwNorm || colNorm.includes(kwNorm)) return true;
        }

        // 3. Coincidencia por raíz de palabra (fuzzy)
        // Identificar a qué campo pertenece esta config
        var campoActual = null;
        for (var campo in RAICES_CAMPO) {
            // Verificar si las keywords de este campo coinciden con las del config
            if (config.keywords && config.keywords.length > 0 && RAICES_CAMPO[campo]) {
                var primeraKw = normalizarTexto(config.keywords[0]);
                if (RAICES_CAMPO[campo].some(function(r) { return primeraKw.startsWith(r) || r.startsWith(primeraKw.substring(0,4)); })) {
                    campoActual = campo;
                    break;
                }
            }
        }
        if (campoActual && RAICES_CAMPO[campoActual]) {
            for (var r of RAICES_CAMPO[campoActual]) {
                if (colNorm.includes(r)) return true;
            }
        }
        
        return false;
    }

    // ── MAPA DIRECTO para columnas conocidas de aseguradoras CR ─────────────
    // Estos nombres se mapean exactamente, sin fuzzy matching, para evitar conflictos
    var MAPA_DIRECTO_COLUMNAS = {
        // Asegurado / Nombre
        'nomase': 'asegurado', 'nombre asegurado': 'asegurado', 'tomador': 'asegurado',
        'cliente': 'asegurado', 'titular': 'asegurado', 'nombre cliente': 'asegurado',
        'nombre completo': 'asegurado', 'nombre': 'asegurado',
        // Póliza
        'nopoliza': 'poliza', 'no. poliza': 'poliza',
        'numero poliza': 'poliza', 'poliza': 'poliza', 'no seguro': 'poliza',
        'no. seguro': 'poliza', 'certificado': 'poliza', 'contrato': 'poliza',
        'aptv': 'poliza', 'policy number': 'poliza',
        // FEVEC: fecha próximo vencimiento de cobro
        'fevec': 'hasta', 'fevec1': 'hasta', 'fevec2': 'hasta',
        'flpago': 'hasta',
        // FEVEC ya NO se mapea a 'hasta' — el sistema calcula proximo_pago dinámicamente
        // desde FDESDE + periodicidad (ver calcularFechasCobro)
        // Fecha vencimiento contrato (vigencia completa)
        'fhasta': 'vence_contrato', 'fecha hasta': 'vence_contrato', 'vencimiento': 'vence_contrato',
        'fecha vencimiento': 'vence_contrato', 'expiration date': 'vence_contrato',
        'expiry date': 'vence_contrato', 'vence': 'vence_contrato',
        // Fecha inicio
        'fdesde': 'desde', 'fecha desde': 'desde', 'desde': 'desde',
        'inicio': 'desde', 'fecha inicio': 'desde', 'start date': 'desde',
        'vigencia desde': 'desde', 'emision': 'desde', 'emisión': 'desde',
        // Prima
        'tprima': 'prima', 'prima': 'prima', 'prima a cobrar': 'prima',
        'cuota': 'prima', 'monto': 'prima', 'premium': 'prima',
        'premium amount': 'prima', 'amount': 'prima', 'tarifa': 'prima',
        // Periodicidad
        'fpagoc': 'periodicidad', 'fpago': 'periodicidad', 'periodicidad': 'periodicidad',
        'forma pago': 'periodicidad', 'forma de pago': 'periodicidad',
        'frecuencia': 'periodicidad', 'payment frequency': 'periodicidad',
        // Teléfono
        'telefo': 'telefono', 'telefono': 'telefono', 'celular': 'telefono',
        'tel': 'telefono', 'phone': 'telefono', 'phone number': 'telefono',
        'movil': 'telefono', 'móvil': 'telefono',
        // Correo
        'email cliente': 'correo', 'correo electronico': 'correo',
        'correo electrónico': 'correo', 'email': 'correo', 'correo': 'correo',
        'e-mail': 'correo', 'email address': 'correo', 'email_cliente': 'correo',
        // Aseguradora
        'aseguradora': 'aseguradora', 'compania': 'aseguradora',
        'compañia': 'aseguradora', 'cia': 'aseguradora',
        'insurance company': 'aseguradora',
        // Moneda
        'monedaimporte': 'moneda', 'moneda': 'moneda', 'currency': 'moneda',
        // Placa
        'polizas::placa': 'placa', 'placa': 'placa', 'matricula': 'placa',
        // Tipo seguro
        'tipo poliza': 'tipo_seguro', 'ramo': 'tipo_seguro', 'producto': 'tipo_seguro',
        'coverage type': 'tipo_seguro',
        // Cédula
        'cedula': 'identificacion',
        'identificacion': 'identificacion', 'id number': 'identificacion'
    };

    function mapeoDirecto(nombreColumna) {
        return MAPA_DIRECTO_COLUMNAS[normalizarTexto(nombreColumna)] || null;
    }

    function buscarValorInteligente(datos, config) {
        const keys = Object.keys(datos);
        
        for (const key of keys) {
            if (columnaCoincide(key, config)) {
                const valor = datos[key];
                if (valor !== undefined && valor !== null && valor !== '') {
                    return valor;
                }
            }
        }
        
        return null;
    }

    // =========================================
    // UTILIDADES
    // =========================================
    
    function convertirFechaExcel(valor) {
        if (!valor) return '';
        
        if (typeof valor === 'string') {
            var v = valor.trim();
            // Formato DDMMYYYY sin separadores (ej: 01062026)
            if (/^\d{8}$/.test(v)) {
                return v.substring(0,2) + '/' + v.substring(2,4) + '/' + v.substring(4,8);
            }
            // Formato YYYY-MM-DD
            if (v.includes('-') && v.length >= 10) {
                const soloFecha = v.split(' ')[0].split('T')[0];
                const parts = soloFecha.split('-');
                if (parts.length === 3 && parts[0].length === 4) {
                    return parts[2] + '/' + parts[1] + '/' + parts[0];
                }
            }
            // Ya viene en formato DD/MM/YYYY
            if (v.includes('/')) {
                return v;
            }
        }
        
        const num = parseFloat(valor);
        if (!isNaN(num) && num > 30000 && num < 60000) {
            const fecha = new Date((num - 25569) * 86400 * 1000);
            const dd = String(fecha.getUTCDate()).padStart(2, '0');
            const mm = String(fecha.getUTCMonth() + 1).padStart(2, '0');
            const yy = fecha.getUTCFullYear();
            return dd + '/' + mm + '/' + yy;
        }
        
        // Formato DDMMYYYY como número entero o float (ej: 1072026 o 1102025.0)
        if (!isNaN(num) && num >= 1012000 && num <= 31129999) {
            const s = String(Math.round(num)).padStart(8, '0');
            const dd = s.slice(0, 2);
            const mm = s.slice(2, 4);
            const yy = s.slice(4, 8);
            if (parseInt(dd) >= 1 && parseInt(dd) <= 31 && parseInt(mm) >= 1 && parseInt(mm) <= 12) {
                return dd + '/' + mm + '/' + yy;
            }
        }
        
        // Formato DMMYYYY (7 dígitos, ej: 1102025 = 01/10/2025)
        if (!isNaN(num) && num >= 112000 && num <= 9129999) {
            const s = String(Math.round(num)).padStart(7, '0');
            const dd = '0' + s.slice(0, 1);
            const mm = s.slice(1, 3);
            const yy = s.slice(3, 7);
            if (parseInt(mm) >= 1 && parseInt(mm) <= 12) {
                return dd + '/' + mm + '/' + yy;
            }
        }
        
        if (valor instanceof Date && !isNaN(valor)) {
            const dd = String(valor.getDate()).padStart(2, '0');
            const mm = String(valor.getMonth() + 1).padStart(2, '0');
            const yy = valor.getFullYear();
            return dd + '/' + mm + '/' + yy;
        }
        
        return String(valor);
    }

    // Suma N meses a una fecha en formato DD/MM/YYYY, devuelve DD/MM/YYYY
    function sumarMeses(fechaDDMMYYYY, meses) {
        if (!fechaDDMMYYYY || !fechaDDMMYYYY.includes('/')) return fechaDDMMYYYY;
        const partes = fechaDDMMYYYY.split('/');
        if (partes.length !== 3) return fechaDDMMYYYY;
        const d = new Date(parseInt(partes[2]), parseInt(partes[1]) - 1, parseInt(partes[0]));
        if (isNaN(d.getTime())) return fechaDDMMYYYY;
        d.setMonth(d.getMonth() + meses);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yy = d.getFullYear();
        return dd + '/' + mm + '/' + yy;
    }

    // Devuelve cuántos meses dura un período según la periodicidad
    function mesesPorPeriodicidad(periodicidad) {
        const p = (periodicidad || '').toLowerCase();
        if (p.includes('anual') || p.includes('año')) return 12;
        if (p.includes('semes')) return 6;
        if (p.includes('trimest')) return 3;
        return 1; // mensual por defecto
    }

    // Calcula desde_cobro y proximo_pago (hasta) a partir de FDESDE + periodicidad
    // desde_cobro = FDESDE (inicio del contrato / primer período de cobro)
    // proximo_pago = FDESDE + 1 periodo
    function calcularFechasCobro(resultado) {
        // Si el registro YA tiene desde_cobro (viene de Supabase, ya procesado antes),
        // NO recalcular - respetar el avance hecho por marcarPagado
        if (resultado.desde_cobro && String(resultado.desde_cobro).trim() !== '') {
            return resultado;
        }
        const desdeContrato = resultado.desde;
        const periodicidad = resultado.periodicidad;
        if (!desdeContrato || !desdeContrato.includes('/')) {
            resultado.desde_cobro = '';
            resultado.hasta = '';
            return resultado;
        }
        const meses = mesesPorPeriodicidad(periodicidad);
        resultado.desde_cobro = desdeContrato;
        resultado.hasta = sumarMeses(desdeContrato, meses); // 'hasta' = proximo_pago
        return resultado;
    }

    function getIdentificador(d) {
        return d.asegurado || 
               d.poliza ||
               buscarValorInteligente(d, MAPEO_CAMPOS.asegurado) ||
               buscarValorInteligente(d, MAPEO_CAMPOS.poliza) ||
               'Registro desconocido';
    }

    // =========================================
    // FUNCIONES PRINCIPALES
    // =========================================

    function normalizarCliente(d, avisos) {
        if (!d) return null;

        // Filtrar filas que no son clientes reales (solo casos muy obvios)
        const _primerValor = String(Object.values(d)[0] || '').trim().toUpperCase();
        const _palabrasInvalidas = ['LEYENDA:', 'TOTAL POLIZAS', 'TOTAL PÓLIZAS', 'SUBTOTAL', 'NOMBRE ASEGURADO', 'ASEGURADO'];
        if (_palabrasInvalidas.some(p => _primerValor === p)) return null;
        // Filtrar solo si absolutamente todos los valores están vacíos
        const _hayAlgunValor = Object.values(d).some(v => v !== null && v !== undefined && String(v).trim() !== '');
        if (!_hayAlgunValor) return null;

        avisos = avisos || [];
        const resultado = { ...d };

        // ── PASO 1: Mapa directo — columnas conocidas de aseguradoras CR ──────
        // Asignar directamente sin fuzzy matching para evitar conflictos
        const _mapeadosDirectos = new Set();
        for (const [colOriginal, valCol] of Object.entries(d)) {
            const campoMapeado = mapeoDirecto(colOriginal);
            const valStr = String(valCol || '').trim();
            // Ignorar fórmulas de Excel (empiezan con =) y valores vacíos
            if (campoMapeado && valStr !== '' && !valStr.startsWith('=')) {
                if (!resultado[campoMapeado] || resultado[campoMapeado] === '') {
                    resultado[campoMapeado] = valCol;
                    _mapeadosDirectos.add(campoMapeado);
                }
            }
        }

        // ── PASO 1.2: Construir número de póliza completo desde LOC+MASTECO+SYMB+NOPOLIZA+MOD ─
        const _loc  = String(d['LOC']  || d['loc']  || '').trim().replace(/\.0$/, '');
        const _mas  = String(d['MASTECO'] || d['masteco'] || '').trim().replace(/\.0$/, '');
        const _sym  = String(d['SYMB'] || d['symb'] || '').trim();
        const _nop  = String(d['NOPOLIZA'] || d['nopoliza'] || resultado['poliza'] || '').trim();
        const _mod  = String(d['MOD']  || d['mod']  || '').trim().replace(/\.0$/, '');
        
        if (_nop) {
            const partes = [
                _loc  ? _loc.padStart(2, '0')  : '',
                _mas  ? _mas.padStart(2, '0')  : '',
                _sym  || '',
                _nop  || '',
                _mod  ? _mod.padStart(2, '0')  : ''
            ].filter(p => p !== '');
            resultado['poliza'] = partes.join(' ');
            _mapeadosDirectos.add('poliza');
        }


        if (!resultado['aseguradora'] || resultado['aseguradora'] === '') {
            // Usar NOPOLIZA original (sin LOC/MASTECO/SYMB) para detectar aseguradora
            const nopoliza = _nop.toUpperCase();
            
            if (/^RT/.test(nopoliza)) {
                resultado['aseguradora'] = 'INS';
            } else if (/^(0107|0201)/.test(nopoliza)) {
                resultado['aseguradora'] = 'INS';
            } else if (/^02[A-Z]/.test(nopoliza)) {
                resultado['aseguradora'] = 'ASSA';
            } else if (/^\d{6}$/.test(nopoliza)) {
                resultado['aseguradora'] = 'QUALITAS';
            } else if (/^\d{13}$/.test(nopoliza)) {
                resultado['aseguradora'] = 'MAPFRE';
            } else if (/^[A-Z]{4}\d{5}$/.test(nopoliza)) {
                resultado['aseguradora'] = 'MNK';
            } else if (/^[A-Z]{2}[A-Z0-9]{12}$/.test(nopoliza)) {
                resultado['aseguradora'] = 'LAFISE';
            }
            
            if (resultado['aseguradora']) {
                _mapeadosDirectos.add('aseguradora');
            }
        }
        
        // ── PASO 1.6: Normalizar nombre completo de aseguradora a abreviación ──
        if (resultado['aseguradora']) {
            const asegMap = {
                'INSTITUTO NACIONAL DE SEGUROS': 'INS',
                'QUALITAS': 'QUALITAS',
                'QUÁLITAS': 'QUALITAS',
                'LAFISE': 'LAFISE',
                'SEGUROS LAFISE': 'LAFISE',
                'MNK': 'MNK',
                'MNK SEGUROS': 'MNK',
                'ASSA': 'ASSA',
                'ASSA COMPAÑIA DE SEGUROS': 'ASSA',
                'ASSA COMPAÑÍA DE SEGUROS': 'ASSA',
                'MAPFRE': 'MAPFRE',
                'MAPFRE SEGUROS': 'MAPFRE',
            };
            const asegUpper = String(resultado['aseguradora']).trim().toUpperCase();
            if (asegMap[asegUpper]) {
                resultado['aseguradora'] = asegMap[asegUpper];
            }
        }

        // ── PASO 1.7: Normalizar periodicidad ─────────────────────────────────
        if (resultado['periodicidad']) {
            const p = String(resultado['periodicidad']).trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (p.includes('ANUAL') || p.includes('ANUAL')) resultado['periodicidad'] = 'Anual';
            else if (p.includes('SEMES')) resultado['periodicidad'] = 'Semestral';
            else if (p.includes('TRIMEST')) resultado['periodicidad'] = 'Trimestral';
            else if (p.includes('MENSUAL') || p.includes('MONTHLY') || p.includes('DEDUCC')) resultado['periodicidad'] = 'Mensual';
        }

        // ── PASO 1.8: Normalizar moneda ───────────────────────────────────────
        if (resultado['moneda']) {
            const m = String(resultado['moneda']).trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (m.includes('DOLAR') || m.includes('USD') || m === '$') resultado['moneda'] = 'USD';
            else if (m.includes('COLON') || m.includes('CRC') || m === '₡') resultado['moneda'] = 'CRC';
        }
        for (const [campoNorm, config] of Object.entries(MAPEO_CAMPOS)) {
            let valor = null;

            // Si ya fue mapeado directamente, usarlo y NO sobreescribir con fuzzy
            if (_mapeadosDirectos.has(campoNorm)) {
                valor = resultado[campoNorm];
            } else if (resultado[campoNorm] !== undefined && resultado[campoNorm] !== null && resultado[campoNorm] !== '') {
                valor = resultado[campoNorm];
            } else {
                valor = buscarValorInteligente(d, config);
            }
            
            if (valor && config.transformar === 'fecha') {
                valor = convertirFechaExcel(valor);
            }
            // Validar identificacion: mínimo 5 caracteres para evitar códigos internos
            if (campoNorm === 'identificacion' && valor) {
                var idStr = String(valor).trim().replace(/\D/g, '');
                if (idStr.length < 5) {
                    valor = '';
                }
            }

            // Capitalizar nombre asegurado correctamente
            if (campoNorm === 'asegurado' && valor) {
                valor = String(valor).trim().toLowerCase().split(/(\s+|,\s*|-)/).map(function(word) {
                    if (!word.trim()) return word;
                    return word.charAt(0).toUpperCase() + word.slice(1);
                }).join('');
            }

            // Limpiar teléfono: quitar extensiones y caracteres raros
            // Ej: "86234633 2" → "86234633", "8823-4567" → "88234567"
            if (campoNorm === 'telefono' && valor) {
                var telStr = String(valor).trim();
                // Extraer solo los primeros 8 dígitos (teléfono CR)
                var soloDigitos = telStr.replace(/\D/g, '');
                if (soloDigitos.length >= 8) {
                    valor = soloDigitos.substring(0, 8);
                } else if (soloDigitos.length > 0) {
                    valor = soloDigitos;
                }
            }
            
            if (config.requerido && !valor) {
                const identificador = getIdentificador(d);
                avisos.push({
                    tipo: 'warning',
                    campo: campoNorm,
                    identificador: identificador
                });
            }
            
            if (valor) {
                resultado[campoNorm] = valor;
            } else if (config.defaultValido) {
                resultado[campoNorm] = config.defaultValido;
            } else {
                resultado[campoNorm] = '';
            }
        }
        
        // Calcular desde_cobro y proximo_pago (hasta) desde FDESDE + periodicidad
        calcularFechasCobro(resultado);

        return resultado;
    }

    function normalizarLote(datos) {
        if (!datos || !Array.isArray(datos)) {
            console.warn('[NOA Normalizador] Datos inválidos recibidos');
            return [];
        }
        
        console.log('[NOA Normalizador IA] Procesando', datos.length, 'registros...');
        
        if (datos.length > 0) {
            console.log('[NOA Normalizador IA] Columnas detectadas:', Object.keys(datos[0]));
        }
        
        const avisos = [];
        const normalizados = datos.map(function(d) {
            return normalizarCliente(d, avisos);
        }).filter(function(d) {
            return d !== null;
        });
        
        if (avisos.length > 0) {
            const resumen = {};
            avisos.forEach(function(a) {
                resumen[a.campo] = (resumen[a.campo] || 0) + 1;
            });
            console.warn('[NOA Normalizador IA] Campos vacíos:', resumen);
        }
        
        console.log('[NOA Normalizador IA] ✅ Normalizados:', normalizados.length);
        
        if (normalizados.length > 0) {
            console.log('[NOA Normalizador IA] Ejemplo:', {
                asegurado: normalizados[0].asegurado,
                periodicidad: normalizados[0].periodicidad,
                hasta: normalizados[0].hasta,
                poliza: normalizados[0].poliza
            });
        }
        
        return normalizados;
    }

    // =========================================
    // EXPORTAR FUNCIONES GLOBALMENTE
    // =========================================
    window.NOA_NORMALIZADOR = {
        normalizarCliente: normalizarCliente,
        normalizarLote: normalizarLote,
        convertirFechaExcel: convertirFechaExcel,
        MAPEO_CAMPOS: MAPEO_CAMPOS
    };
    
    window.normalizarCliente = normalizarCliente;
    window.normalizarLote = normalizarLote;
    
    console.log('[NOA Normalizador IA] ✅ Búsqueda inteligente activa');

})();
