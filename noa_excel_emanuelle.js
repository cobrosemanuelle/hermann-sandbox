// NOA - Adaptador del Excel de Emmanuel
// No reemplaza al normalizador base: traduce las 14 columnas de Emmanuel a los campos que el
// normalizador ya entiende y lo deja hacer su trabajo (fechas, dias de gracia por producto, feriados).
// Si el Excel no es de Emmanuel, todo funciona exactamente igual que antes.
//
// MONTOS: se toma de la columna "MONTO A PAGAR" solo si trae un numero real. Si no lo trae, queda en 0.
// No se inventa ningun dato. La moneda sale del signo (₡ o $), de una columna MONEDA si existe, o es colones.
(function () {
  'use strict';

  const origLote = window.normalizarLote;
  const origCliente = window.normalizarCliente;
  if (typeof origLote !== 'function' || typeof origCliente !== 'function') {
    console.warn('[NOA Emmanuel] Normalizador base no cargado, adaptador inactivo');
    return;
  }

  const norm = s => (s == null ? '' : String(s)).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const txt = v => (v == null ? '' : String(v).trim());
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();

  function celda(m, prefijo) {
    for (const k of Object.keys(m)) {
      if (k.startsWith(prefijo) && txt(m[k]) !== '') return txt(m[k]);
    }
    return '';
  }
  function hayColumna(m, prefijo) {
    return Object.keys(m).some(k => k.startsWith(prefijo));
  }

  function fechaDDMMYYYY(valor) {
    const v = txt(valor);
    if (!v) return '';
    if (/^\d{5}(\.\d+)?$/.test(v)) {
      const n = parseFloat(v);
      if (n > 30000 && n < 60000) {
        const f = new Date((n - 25569) * 86400 * 1000);
        return pad(f.getUTCDate()) + '/' + pad(f.getUTCMonth() + 1) + '/' + f.getUTCFullYear();
      }
    }
    let r = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (r) return r[3] + '/' + r[2] + '/' + r[1];
    r = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (r) return pad(r[1]) + '/' + pad(r[2]) + '/' + (r[3].length === 2 ? '20' + r[3] : r[3]);
    return '';
  }

  function sumarMeses(f, meses) {
    const p = f.split('/');
    if (p.length !== 3) return '';
    const dia = parseInt(p[0], 10), mes = parseInt(p[1], 10) - 1, anio = parseInt(p[2], 10);
    const d = new Date(anio, mes + meses, 1);
    const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(dia, ultimo));
    return fmt(d);
  }

  // ---------- Diccionario de Emmanuel ----------
  const TIPOS = { EM: 'Emisión', TRAS: 'Traspaso', TRASPASO: 'Traspaso' };
  const ASEGURADORAS = ['QUALITAS', 'MAPFRE', 'ASSA', 'MNK', 'LAFISE', 'OCEANICA'];
  const PRODUCTOS_INS = {
    RT: 'Riesgos del Trabajo', AUT: 'Autos', RGN: 'Riesgo Nombrado', CAM: 'Carga', CAC: 'Carga combustible',
    RCG: 'Responsabilidad Civil', IMR: 'Incendio', MRM: 'Incendio', INC: 'Incendio', FID: 'Fidelidad', ROB: 'Robo',
    AVI: 'Aviación', EQE: 'Equipo electrónico', EQC: 'Equipo contratista', VG: 'Vida Global', UC: 'Vida Universal Plus',
    ARV: 'Autoexpedible Vida Plus', ARA: 'Autoexpedible Comprensivo Accidentes', AFIA: 'Autoexpedible Comprensivo Accidentes',
    AGI: 'Autoexpedible Oncológico', AUCOL: 'Plan Familiar', COL: 'Plan Familiar', AUM: 'Colectiva automóviles',
    EMB: 'Embarcación', ACG: 'Básica Accidentes', ACC: 'Colectiva', CAU: 'Caución', GFL: 'Seguro vital 360°',
    ACI: 'Estudiantil', MED: 'Medical'
  };
  const PRODUCTOS_MNK = { APTV: 'Autos', CAUC: 'Caución', RCNO: 'RC Notario', RCGE: 'RC General', RCPR: 'RC Profesional' };
  const PERIODOS = { M: 'Mensual', T: 'Trimestral', C: 'Cuatrimestral', S: 'Semestral', A: 'Anual' };
  const MEDIOS = { CA: 'Cargo Automático', DM: 'Deducción Mensual' };

  // LINEA/ASEGURADORA: nombre de aseguradora -> Aseguradora (Linea Autos); codigo de producto -> Linea (Aseguradora INS)
  function parseLinea(raw) {
    const original = txt(raw);
    const v = original.toUpperCase();
    if (!v) return { aseguradora: '', linea: '' };
    if (ASEGURADORAS.includes(v)) return { aseguradora: v, linea: 'Autos' };
    if (v === 'AU') return { aseguradora: 'LAFISE', linea: 'Autos' };
    if (v.startsWith('I-')) return { aseguradora: 'LAFISE', linea: 'Incendio-Robo' };
    const base = v.split(/[-\s]/)[0];
    if (PRODUCTOS_INS[base]) return { aseguradora: 'INS', linea: PRODUCTOS_INS[base] };
    if (PRODUCTOS_MNK[base]) return { aseguradora: 'MNK', linea: PRODUCTOS_MNK[base] };
    return { aseguradora: '', linea: original };
  }

  // FORMA DE PAGO compuesta ("CA/A"): periodo (M,T,C,S,A) y medio de cobro (CA,DM) por separado
  function parseFormaPago(raw) {
    const codigos = txt(raw).toUpperCase().replace(/\s+/g, '').split(/[\/,+\-]+/).filter(Boolean);
    let periodicidad = '', medio = '';
    codigos.forEach(c => {
      if (MEDIOS[c] && !medio) medio = MEDIOS[c];
      else if (PERIODOS[c] && !periodicidad) periodicidad = PERIODOS[c];
    });
    if (!periodicidad && medio === 'Deducción Mensual') periodicidad = 'Mensual'; /*NOA_DM_MEDIO*/
    return { periodicidad: periodicidad, medio_cobro: medio };
  }

  // POLIZA: separa la palabra PLANILLAS ("RT-8356017 / PLANILLAS")
  function parsePoliza(raw) {
    let p = txt(raw);
    let planillas = false;
    if (/planillas?/i.test(p)) {
      planillas = true;
      p = p.replace(/[\/\-,]*\s*planillas?\s*/ig, ' ');
    }
    p = p.replace(/\s*\/\s*$/, '').replace(/\s+/g, ' ').trim();
    return { poliza: p, planillas: planillas };
  }

  // CONTACTO: correos, telefonos y notas por separado
  function parseContacto(raw) {
    let resto = txt(raw);
    const correos = resto.match(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g) || [];
    correos.forEach(c => { resto = resto.replace(c, ' '); });
    const telefonos = [];
    resto = resto.replace(/(?<!\d)(?:\+?506[\s\-]?)?(\d{4})[\s\-]?(\d{4})(?!\d)/g, function (m, a, b) {
      telefonos.push(a + b);
      return ' ';
    });
    const notas = resto.replace(/\s+/g, ' ').replace(/^[\s;,\/|\-:]+|[\s;,\/|\-:]+$/g, '').trim();
    return {
      correo: correos[0] || '', correos_extra: correos.slice(1).join(', '),
      telefono: telefonos[0] || '', telefonos_extra: telefonos.slice(1).join(', '),
      notas: notas
    };
  }

  // OBSERVACIONES / AÑO / PLACA: reparte segun lo que trae cada celda
  function parseObjeto(obs, ano, placa) {
    let anio = '', pl = '';
    const resto = [];
    [obs, ano, placa].map(txt).filter(Boolean).forEach(function (t) {
      if (!anio && /^(19|20)\d{2}$/.test(t)) { anio = t; return; }
      if (!pl && /^([A-Za-z]{1,3}[- ]?\d{3,6}|\d{5,6})$/.test(t)) { pl = t.replace(/\s+/g, ''); return; }
      resto.push(t);
    });
    let objeto = resto.join(' ');
    if (!anio) {
      const y = objeto.match(/\b(19|20)\d{2}\b/);
      if (y) { anio = y[0]; objeto = objeto.replace(y[0], ' '); }
    }
    if (!pl) {
      const p = objeto.match(/\b[A-Za-z]{2,3}[- ]?\d{3,6}\b/);
      if (p) { pl = p[0].replace(/\s+/g, ''); objeto = objeto.replace(p[0], ' '); }
    }
    return { objeto: objeto.replace(/\s+/g, ' ').trim(), anio: anio, placa: pl };
  }

  // ---------- Monto y moneda ----------
  // Moneda segun el texto: signo, codigo o nombre. Vacio si no se puede saber.
  function parseMoneda(raw) {
    const t = norm(raw);
    if (!t) return '';
    if (t.indexOf('usd') !== -1 || t.indexOf('dolar') !== -1 || t.indexOf('$') !== -1) return 'USD';
    if (t.indexOf('crc') !== -1 || t.indexOf('colon') !== -1 || t.indexOf('₡') !== -1) return 'CRC';
    return '';
  }

  // Numero dentro de un texto ("₡25.000", "$1,250.50", "15.000,50"). 0 si no hay un numero de verdad.
  function numeroDe(raw) {
    let t = String(raw == null ? '' : raw).replace(/[^\d.,-]/g, '');
    if (!/\d/.test(t)) return 0;
    const coma = t.lastIndexOf(','), punto = t.lastIndexOf('.');
    if (coma !== -1 && punto !== -1) {
      if (coma > punto) t = t.replace(/\./g, '').replace(',', '.');
      else t = t.replace(/,/g, '');
    } else if (coma !== -1) {
      const dec = t.length - coma - 1;
      t = (dec === 1 || dec === 2) ? t.replace(',', '.') : t.replace(/,/g, '');
    } else if (punto !== -1) {
      const dec = t.length - punto - 1;
      const cuantos = (t.match(/\./g) || []).length;
      if (cuantos > 1 || dec === 3) t = t.replace(/\./g, '');
    }
    const n = parseFloat(t);
    return isNaN(n) ? 0 : n;
  }

  // Solo un numero real cuenta como monto; si no hay, queda en 0
  function leerMonto(rawMonto, rawMoneda) {
    const textoMonto = txt(rawMonto);
    const moneda = parseMoneda(rawMoneda) || parseMoneda(textoMonto) || 'CRC';
    const n = numeroDe(textoMonto);
    return { monto: n > 0 ? n : 0, moneda: moneda };
  }

  // ---------- Deteccion y conversion ----------
  function esFormatoEmanuelle(fila) {
    const m = {};
    Object.keys(fila || {}).forEach(k => { m[norm(k)] = 1; });
    return hayColumna(m, 'cliente') && hayColumna(m, 'linea') && hayColumna(m, 'forma');
  }

  function convertirFila(d) {
    const m = {};
    Object.keys(d).forEach(k => { m[norm(k)] = d[k]; });
    const cliente = celda(m, 'cliente');
    const pol = parsePoliza(celda(m, 'poliza'));
    if (!cliente && !pol.poliza) return null; // fila vacia / separador visual

    const linea = parseLinea(celda(m, 'linea'));
    const pago = parseFormaPago(celda(m, 'forma'));
    const contacto = parseContacto(celda(m, 'contacto'));
    const obj = parseObjeto(celda(m, 'observ'), celda(m, 'ano'), celda(m, 'placa'));
    const dinero = leerMonto(celda(m, 'monto'), celda(m, 'moneda'));
    const tipo = celda(m, 'tipo').toUpperCase();
    const vence = fechaDDMMYYYY(celda(m, 'hasta'));
    const dm = pago.periodicidad === 'Deducción Mensual';

    return {
      // Lo que el normalizador base ya entiende (el mismo hace fechas, gracia y feriados)
      entrada: {
        asegurado: cliente,
        identificacion: celda(m, 'identificacion'),
        poliza: pol.poliza,
        telefono: contacto.telefono,
        correo: contacto.correo,
        aseguradora: linea.aseguradora,
        tipo_seguro: linea.linea,
        periodicidad: dm ? 'Mensual' : pago.periodicidad,
        placa: obj.placa,
        anio: obj.anio,
        moneda: dinero.moneda,
        TPRIMA: dinero.monto,
        FEVEC2: vence
      },
      // Datos propios de Emmanuel, se guardan aparte
      extras: {
        tipo_movimiento: TIPOS[tipo] || tipo,
        medio_cobro: pago.medio_cobro,
        planillas: pol.planillas,
        acreedor: celda(m, 'acreedor'),
        objeto_asegurado: obj.objeto,
        correos_extra: contacto.correos_extra,
        telefonos_extra: contacto.telefonos_extra,
        notas_contacto: contacto.notas
      },
      dm: dm,
      cuatri: pago.periodicidad === 'Cuatrimestral'
    };
  }

  function normalizarFila(d) {
    const c = convertirFila(d);
    if (!c) return null;
    const r = origCliente(c.entrada, []);
    if (!r) return null;
    Object.assign(r, c.extras);
    if (c.dm) r.periodicidad = 'Deducción Mensual';
    if (c.cuatri) {
      r.periodicidad = 'Cuatrimestral';
      if (r.desde_cobro) r.hasta = sumarMeses(r.desde_cobro, 4);
    }
    return r;
  }

  // Si el Excel es de Emmanuel lo procesa este adaptador; si no, el normalizador de siempre
  window.normalizarLote = function (datos) {
    if (!Array.isArray(datos) || !datos.length || !esFormatoEmanuelle(datos[0])) return origLote(datos);
    const out = datos.map(normalizarFila).filter(Boolean);
    console.log('[NOA Emmanuel] Filas leidas:', datos.length, '| Clientes:', out.length);
    return out;
  };
  console.log('[NOA Emmanuel] Adaptador activo');
})();
