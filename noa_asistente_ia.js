// NOA ASISTENTE CON IA
// Reemplaza window.responderAsistenteIA: en vez de buscar palabras sueltas, conversa con Claude (vía /api/asistente).
// Claude pide datos con herramientas que se ejecutan AQUÍ, sobre la cartera ya cargada (window.datosReales), y responde con eso.
// Si la IA no está configurada o falla, se usa el asistente anterior (por palabras) para no dejar sin respuesta.
(function () {
  'use strict';
  const MAX_RONDAS = 6;       // veces que la IA puede pedir datos en una misma pregunta
  const MAX_HISTORIAL = 12;   // mensajes anteriores que recuerda
  const FILAS_MAX = 25;
  const historial = [];       // [{role, content:string}] solo texto

  // ---------- Datos ----------
  function cartera() { return window._datosRealesBackup || window.datosReales || []; }
  function norm(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
  function tienePolizaReal(p) { return /\d/.test(String(p || '')); }
  function hoyIso() {
    try {
      const E = window.NOA_ESTADO;
      const v = E && typeof E.hoyCR === 'function' ? E.hoyCR() : null;
      if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
      if (v && v.iso) return String(v.iso).slice(0, 10);
    } catch (e) { /* se usa el respaldo */ }
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Costa_Rica' });
  }
  function fechaIso(v) { const m = String(v == null ? '' : v).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[0] : ''; }
  function ddmm(iso) { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
  function estado(c) {
    try {
      const E = window.NOA_ESTADO;
      if (E && typeof E.estadoDe === 'function') { const e = E.estadoDe(c, hoyIso()); if (e) return { clave: String(e.clave || ''), dias: (typeof e.dias === 'number' ? e.dias : null) }; }
    } catch (e) { /* sin estado */ }
    return { clave: '', dias: null };
  }
  function fila(c) {
    const e = estado(c);
    return {
      asegurado: c.asegurado || '', poliza: c.poliza || '', aseguradora: c.aseguradora || '', tipo_seguro: c.tipo_seguro || '',
      forma_pago: c.periodicidad || '', fecha_cobro: ddmm(fechaIso(c.desde_cobro)), proximo_pago: ddmm(fechaIso(c.hasta)),
      estado: e.clave || 'sin estado', dias_para_cobro: e.dias, prima: Number(c.prima) || 0, moneda: c.moneda || '',
      telefono: c.telefono || '', correo: c.correo || '', placa: c.placa || '', objeto: c.objeto_asegurado || ''
    };
  }
  function limite(n) { n = parseInt(n, 10); return (n >= 1 && n <= FILAS_MAX) ? n : 10; }
  function porFechaCobro(a, b) { return String(fechaIso(a.desde_cobro) || '9999').localeCompare(String(fechaIso(b.desde_cobro) || '9999')); }

  // ---------- Lectura de la base ----------
  async function usuarioNOA() {
    const u = (typeof getUserNOA === 'function') ? await getUserNOA() : null;
    if (!u) throw new Error('No se pudo identificar al usuario');
    return u;
  }
  async function pedirJson(url) {
    const r = await fetch(url); let d = null;
    try { d = await r.json(); } catch (e) { d = null; }
    if (!r.ok || !d || d.success === false) throw new Error((d && d.error) || ('Error ' + r.status));
    return d;
  }
  async function leerPagos() { const u = await usuarioNOA(); return (await pedirJson('/api/pagos?user_id=' + encodeURIComponent(u.id))).pagos || []; }
  async function leerEnvios() {
    const u = await usuarioNOA(); const d = await pedirJson('/api/envios?user_id=' + encodeURIComponent(u.id));
    return Object.keys(d).map(function (k) { return d[k]; }).find(Array.isArray) || [];
  }

  // ---------- Herramientas (se ejecutan en el navegador) ----------
  const HERRAMIENTAS = {
    resumen_cartera: function () {
      const lista = cartera(), por = {}, hoy = hoyIso();
      let venceHoy = 0, dm = 0;
      lista.forEach(function (c) {
        const k = estado(c).clave || 'sin estado'; por[k] = (por[k] || 0) + 1;
        if (fechaIso(c.desde_cobro) === hoy) venceHoy++;
        if (norm(c.medio_cobro).indexOf('deduccion') !== -1 || norm(c.periodicidad).indexOf('deduccion') !== -1) dm++;
      });
      return { total_clientes: lista.length, por_estado: por, vencen_hoy: venceHoy, en_deduccion_mensual: dm, fecha_hoy: ddmm(hoy) };
    },
    buscar_clientes: function (a) {
      const q = norm(a && a.texto); if (!q) return { error: 'Falta el texto a buscar' };
      const campos = ['asegurado', 'poliza', 'identificacion', 'telefono', 'telefonos_extra', 'correo', 'correos_extra', 'placa', 'objeto_asegurado', 'marca', 'modelo'];
      const r = cartera().filter(function (c) { return campos.some(function (k) { return norm(c[k]).indexOf(q) !== -1; }); });
      return { total_coincidencias: r.length, mostrando: Math.min(r.length, limite(a.limite)), clientes: r.slice(0, limite(a.limite)).map(fila) };
    },
    listar_por_estado: function (a) {
      const q = norm(a && a.estado);
      const r = cartera().filter(function (c) { return norm(estado(c).clave) === q; }).sort(porFechaCobro);
      return { estado: q, total: r.length, mostrando: Math.min(r.length, limite(a.limite)), clientes: r.slice(0, limite(a.limite)).map(fila) };
    },
    listar_por_fecha: function (a) {
      const d = fechaIso(a && a.desde), h = fechaIso(a && a.hasta);
      if (!d || !h) return { error: 'Fechas inválidas: use AAAA-MM-DD' };
      const r = cartera().filter(function (c) { const f = fechaIso(c.desde_cobro); return f && f >= d && f <= h; }).sort(porFechaCobro);
      return { desde: ddmm(d), hasta: ddmm(h), total: r.length, mostrando: Math.min(r.length, limite(a.limite)), clientes: r.slice(0, limite(a.limite)).map(fila) };
    },
    contar_por: function (a) {
      const campo = a && a.campo; if (['aseguradora', 'tipo_seguro', 'periodicidad', 'medio_cobro', 'moneda'].indexOf(campo) === -1) return { error: 'Campo no permitido' };
      const por = {}; cartera().forEach(function (c) { const k = String(c[campo] || '').trim() || '(vacío)'; por[k] = (por[k] || 0) + 1; });
      return { campo: campo, total: cartera().length, conteo: por };
    },
    clientes_sin_dato: function (a) {
      const campo = a && a.campo; if (['telefono', 'correo', 'poliza'].indexOf(campo) === -1) return { error: 'Campo no permitido' };
      const r = cartera().filter(function (c) { return campo === 'poliza' ? !tienePolizaReal(c.poliza) : !String(c[campo] || '').trim(); });
      return { campo: campo, total: r.length, ejemplos: r.slice(0, 10).map(fila) };
    },
    polizas_repetidas: function () {
      const g = {}; cartera().forEach(function (c) { const k = String(c.poliza || '').trim().toUpperCase(); if (tienePolizaReal(k)) (g[k] = g[k] || []).push(c.asegurado || 'sin nombre'); });
      const lista = Object.keys(g).filter(function (k) { return g[k].length > 1; }).map(function (k) { return { poliza: k, clientes: g[k] }; });
      return { total: lista.length, polizas: lista.slice(0, FILAS_MAX) };
    },

    // ---------- Pagos, envíos y cross-selling (leen la base por /api/pagos y /api/envios) ----------
    pagos_resumen: async function (a) {
      const d = fechaIso(a && a.desde), h = fechaIso(a && a.hasta);
      const pagos = (await leerPagos()).filter(function (p) { const f = fechaIso(p.fecha_pago); return f && (!d || f >= d) && (!h || f <= h); });
      const porMoneda = {}, porMes = {}; let mora = 0;
      pagos.forEach(function (p) {
        const m = p.moneda || 'sin moneda', mes = fechaIso(p.fecha_pago).slice(0, 7), v = Number(p.monto_pagado) || 0;
        porMoneda[m] = porMoneda[m] || { pagos: 0, total: 0 }; porMoneda[m].pagos++; porMoneda[m].total += v;
        porMes[mes] = porMes[mes] || {}; porMes[mes][m] = (porMes[mes][m] || 0) + v;
        mora += Number(p.dias_mora) || 0;
      });
      return { desde: ddmm(d) || 'el inicio', hasta: ddmm(h) || 'hoy', total_pagos: pagos.length, por_moneda: porMoneda, por_mes: porMes, mora_promedio_dias: pagos.length ? Math.round(mora / pagos.length) : 0 };
    },
    pagos_de_cliente: async function (a) {
      const q = norm(a && a.texto); if (!q) return { error: 'Falta el nombre o la póliza' };
      const r = (await leerPagos()).filter(function (p) { return norm(p.cliente_nombre).indexOf(q) !== -1 || norm(p.poliza).indexOf(q) !== -1; })
        .sort(function (x, y) { return fechaIso(y.fecha_pago).localeCompare(fechaIso(x.fecha_pago)); });
      return { total_pagos: r.length, mostrando: Math.min(r.length, 15), pagos: r.slice(0, 15).map(function (p) { return { cliente: p.cliente_nombre || '', poliza: p.poliza || '', fecha: ddmm(fechaIso(p.fecha_pago)), monto: Number(p.monto_pagado) || 0, moneda: p.moneda || '', dias_mora: Number(p.dias_mora) || 0 }; }) };
    },
    ranking_mora: async function (a) {
      const pagos = await leerPagos(), g = {};
      pagos.forEach(function (p) { const k = p.cliente_nombre || 'Sin nombre'; g[k] = g[k] || { t: 0, n: 0 }; g[k].t += Number(p.dias_mora) || 0; g[k].n++; });
      const peores = !(a && a.orden === 'mejores');
      const lista = Object.keys(g).map(function (k) { return { cliente: k, mora_promedio_dias: Math.round(g[k].t / g[k].n), pagos: g[k].n }; })
        .filter(function (c) { return peores ? c.mora_promedio_dias > 0 : true; })
        .sort(function (x, y) { return peores ? (y.mora_promedio_dias - x.mora_promedio_dias) : (x.mora_promedio_dias - y.mora_promedio_dias) || (y.pagos - x.pagos); });
      return { orden: peores ? 'peores pagadores' : 'mejores pagadores', total_clientes_con_pagos: Object.keys(g).length, clientes: lista.slice(0, limite(a && a.limite)) };
    },
    envios_resumen: async function (a) {
      const d = fechaIso(a && a.desde), h = fechaIso(a && a.hasta);
      const env = (await leerEnvios()).filter(function (e) { const f = fechaIso(e.fecha_envio || e.created_at || e.fecha); return !f || ((!d || f >= d) && (!h || f <= h)); });
      const canal = {}, estado = {};
      env.forEach(function (e) { const c = e.canal || e.tipo || 'sin canal', s2 = e.estado || 'sin estado'; canal[c] = (canal[c] || 0) + 1; estado[s2] = (estado[s2] || 0) + 1; });
      return { desde: ddmm(d) || 'el inicio', hasta: ddmm(h) || 'hoy', total_envios: env.length, por_canal: canal, por_estado: estado };
    },
    envios_de_cliente: async function (a) {
      const q = norm(a && a.texto); if (!q) return { error: 'Falta el nombre del cliente' };
      const r = (await leerEnvios()).filter(function (e) { return norm(e.cliente_nombre || e.asegurado).indexOf(q) !== -1; })
        .sort(function (x, y) { return fechaIso(y.fecha_envio || y.created_at || y.fecha).localeCompare(fechaIso(x.fecha_envio || x.created_at || x.fecha)); });
      return { total_envios: r.length, mostrando: Math.min(r.length, 15), envios: r.slice(0, 15).map(function (e) { return { cliente: e.cliente_nombre || e.asegurado || '', fecha: ddmm(fechaIso(e.fecha_envio || e.created_at || e.fecha)), canal: e.canal || e.tipo || '', estado: e.estado || '' }; }) };
    },
    oportunidades_cross_selling: function (a) {
      const lista = window._oportunidadesCS;
      if (!Array.isArray(lista)) return { error: 'El análisis de Cross-Selling todavía no se ha corrido. Pídale al usuario abrir la pestaña Cross-Selling y volver a preguntar.' };
      const q = norm(a && a.texto);
      const r = q ? lista.filter(function (o) { return norm(o.cliente).indexOf(q) !== -1; }) : lista;
      return { total: r.length, mostrando: Math.min(r.length, limite(a && a.limite)), oportunidades: r.slice(0, limite(a && a.limite)).map(function (o) { return { cliente: o.cliente, seguros_actuales: o.tiposActuales, recomendacion: o.recomendacion, razon: o.razon, momento: o.timing, dias_para_vencer: o.diasVencimiento }; }) };
    }
  };

  async function ejecutar(nombre, entrada) {
    const f = HERRAMIENTAS[nombre];
    if (!f) return { error: 'Herramienta desconocida: ' + nombre };
    try { return await f(entrada || {}); } catch (e) { return { error: 'La herramienta falló: ' + (e && e.message ? e.message : e) }; }
  }

  // ---------- Conversación con la IA ----------
  async function llamarServidor(mensajes) {
    const resp = await fetch('/api/asistente', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: mensajes, hoy: hoyIso() }) });
    let datos = null; try { datos = await resp.json(); } catch (e) { datos = null; }
    if (!resp.ok || !datos) { const err = new Error((datos && (datos.mensaje || datos.error)) || ('Error ' + resp.status)); err.codigo = datos && datos.error; err.estado = resp.status; throw err; }
    return datos;
  }
  function textoDe(content) { return (content || []).filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join('\n').trim(); }

  async function conversar(pregunta) {
    const mensajes = historial.slice(-MAX_HISTORIAL).map(function (m) { return { role: m.role, content: m.content }; });
    mensajes.push({ role: 'user', content: pregunta });
    for (let ronda = 0; ronda <= MAX_RONDAS; ronda++) {
      const r = await llamarServidor(mensajes);
      const usos = (r.content || []).filter(function (b) { return b.type === 'tool_use'; });
      if (!usos.length || r.stop_reason !== 'tool_use') {
        const t = textoDe(r.content);
        return t || 'No logré armar una respuesta. ¿Me lo puede preguntar de otra forma?';
      }
      mensajes.push({ role: 'assistant', content: r.content });
      const resultados = await Promise.all(usos.map(function (u) { return ejecutar(u.name, u.input); }));
      mensajes.push({ role: 'user', content: usos.map(function (u, i) { return { type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(resultados[i]) }; }) });
    }
    return 'La consulta me quedó muy larga. ¿Me la puede hacer más concreta?';
  }

  // Búsqueda directa: si escriben una o dos palabras (un nombre, una póliza, una placa), se busca de una en la cartera
  function busquedaDirecta(p) {
    const t = String(p || '').trim();
    if (t.length < 3 || t.split(/\s+/).length > 3) return null;
    const r = HERRAMIENTAS.buscar_clientes({ texto: t, limite: 5 });
    if (!r || !r.total_coincidencias) return null;
    const lineas = r.clientes.map(function (c) {
      return '• ' + c.asegurado + ' · póliza ' + (c.poliza || '—') + ' · ' + (c.aseguradora || '—') + ' · ' + (c.estado || 'sin estado') + (c.proximo_pago ? ' · próximo pago ' + c.proximo_pago : '') + (c.telefono ? ' · ' + c.telefono : '');
    });
    return 'Encontré ' + r.total_coincidencias + (r.total_coincidencias === 1 ? ' coincidencia' : ' coincidencias') + ' para "' + t + '"' + (r.total_coincidencias > r.mostrando ? ' (muestro ' + r.mostrando + ')' : '') + ':\n\n' + lineas.join('\n');
  }

  function instalar() {
    const actual = window.responderAsistenteIA;
    if (typeof actual !== 'function' || actual.__noaIA) return;
    const anterior = actual;
    const nueva = async function (pregunta) {
      const p = String(pregunta == null ? '' : pregunta).trim();
      if (!p) return 'Escríbame su pregunta y le ayudo.';
      try {
        const resp = await conversar(p);
        historial.push({ role: 'user', content: p }, { role: 'assistant', content: resp });
        while (historial.length > MAX_HISTORIAL * 2) historial.shift();
        return resp;
      } catch (e) {
        console.warn('Asistente IA no disponible, se usa el asistente básico:', e && e.message ? e.message : e);
        const directa = busquedaDirecta(p);
        if (directa && e && e.codigo === 'SIN_LLAVE') return directa;
        const basico = await anterior.call(window, pregunta);
        if (e && e.codigo === 'SIN_LLAVE') return basico;
        return '⚠️ La IA no está disponible en este momento (' + (e && e.message ? e.message : 'error') + '). Esto es lo que encuentro con la búsqueda básica:\n\n' + basico;
      }
    };
    nueva.__noaIA = true;
    nueva.anterior = anterior;
    window.responderAsistenteIA = nueva;
  }

  window.NOA_ASISTENTE_IA = { HERRAMIENTAS: HERRAMIENTAS, ejecutar: ejecutar, instalar: instalar, historial: historial };
  instalar();
  // El asistente anterior puede definirse después de este archivo: se reintenta hasta que aparezca
  let intentos = 0;
  const t = setInterval(function () { instalar(); if (++intentos > 40 || (window.responderAsistenteIA && window.responderAsistenteIA.__noaIA)) clearInterval(t); }, 500);
  console.log('✅ noa_asistente_ia.js cargado (asistente conversacional con IA)');
})();
