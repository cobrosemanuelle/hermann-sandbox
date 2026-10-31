(()=> {
  // --- Panel visible de resumen de carga (sin depender de consola) ---
  function mostrarPanelResumenCarga(info) {
    const r = info.resultado || {};
    const guardadosOk = (r.nuevos || 0) + (r.actualizados || 0);
    const fallidos = r.fallidos || [];
    const huboProblema = !r.success || fallidos.length > 0 || guardadosOk !== info.enviadosAGuardar;
    const color = huboProblema ? '#dc2626' : '#16a34a';
    let html = '<div style="position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:99999;background:#0f172a;border:3px solid ' + color + ';border-radius:12px;padding:18px 24px;box-shadow:0 8px 30px rgba(0,0,0,0.5);max-width:520px;font-family:sans-serif;color:#fff;">';
    html += '<div style="font-size:16px;font-weight:800;margin-bottom:10px;color:' + color + ';">' + (huboProblema ? '⚠️ RESUMEN DE CARGA — revisar' : '✅ RESUMEN DE CARGA — todo bien') + '</div>';
    html += '<div style="font-size:13px;line-height:1.7;">';
    html += '📄 Leídos del Excel: <b>' + info.leidosDelExcel + '</b><br>';
    html += '📤 Enviados a guardar: <b>' + info.enviadosAGuardar + '</b><br>';
    if (r.success) {
      html += '🆕 Nuevos: <b>' + (r.nuevos||0) + '</b> &nbsp; 🔄 Actualizados: <b>' + (r.actualizados||0) + '</b><br>';
      html += '❌ Fallidos: <b style="color:' + (fallidos.length ? '#f87171' : '#4ade80') + '">' + fallidos.length + '</b>';
      if (fallidos.length > 0) {
        html += '<div style="margin-top:8px;max-height:150px;overflow-y:auto;background:#1e293b;padding:8px;border-radius:6px;">';
        fallidos.slice(0, 15).forEach(f => {
          html += '• ' + f.asegurado + ' (' + f.poliza + '): ' + f.error + '<br>';
        });
        if (fallidos.length > 15) html += '...y ' + (fallidos.length - 15) + ' más';
        html += '</div>';
      }
    } else {
      html += '<span style="color:#f87171;">ERROR: ' + (r.error || 'desconocido') + '</span>';
    }
    html += '</div>';
    html += '<button onclick="this.parentElement.remove()" style="margin-top:12px;background:#334155;color:#fff;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;">Cerrar</button>';
    html += '</div>';
    const div = document.createElement('div');
    div.innerHTML = html;
    document.body.appendChild(div.firstChild);
  }
  window.mostrarPanelResumenCarga = mostrarPanelResumenCarga;

  // --- Utils CSV ---
  const norm = s=> (s==null?'':String(s)).normalize('NFD').replace(/\p{Diacritic}/gu,'').trim().toLowerCase();
  function detectDelim(sample){
    const count=(txt,ch)=>{let c=0,inQ=false;for(let i=0;i<txt.length;i++){const t=txt[i];
      if(t==='"'){ if(inQ && txt[i+1]==='"'){i++;} else inQ=!inQ; }
      else if(!inQ && t===ch){ c++; }} return c; };
    return count(sample,';')>count(sample,',')? ';' : ',';
  }
  function splitCSV(line, d){
    const out=[],len=line.length; let cur='',inQ=false;
    for(let i=0;i<len;i++){
      const ch=line[i];
      if(ch==='"'){ if(inQ && line[i+1]==='"'){cur+='"';i++;} else inQ=!inQ; }
      else if(ch===d && !inQ){ out.push(cur); cur=''; }
      else cur+=ch;
    }
    out.push(cur); return out;
  }
  function parseCSV(text){
    text=text.replace(/^\uFEFF/,'').replace(/\r/g,'');
    const lines=text.split('\n').filter(l=>l.length>0);
    const sample=lines.slice(0,5).join('\n');
    const d=detectDelim(sample);
    const cols=splitCSV(lines.shift(),d).map(s=>s.trim());
    const data=lines.map(line=>{const vals=splitCSV(line,d);const obj={};cols.forEach((c,i)=>obj[c]=(vals[i]??'').trim());return obj;});
    return { cols, data };
  }

  // --- Excel (.xlsx/.xls) via SheetJS CDN ---
  async function ensureXLSX(){
    if (window.XLSX) return;
    await new Promise((res,rej)=>{
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/xlsx@0.19.3/dist/xlsx.full.min.js';
      s.onload=res; s.onerror=()=>rej(new Error('No se pudo cargar XLSX'));
      document.head.appendChild(s);
    });
  }
  async function parseExcel(file){
    await ensureXLSX();
    const buf = await file.arrayBuffer();
    const wb  = XLSX.read(new Uint8Array(buf), { type:'array', cellFormula: false });

    // Seleccionar hoja correcta: primero la de control de clientes, luego las de otros formatos
    const nombres = wb.SheetNames;
    const buscar = txt => nombres.find(n => norm(n).includes(txt));
    let sheetName = buscar('control de clientes') || buscar('consolidado') || buscar('notificacion');
    if (!sheetName) sheetName = nombres[0];
    console.log('[NOA] Hoja seleccionada:', sheetName, '| Hojas:', nombres);

    const sh = wb.Sheets[sheetName];

    // Si la hoja trae filas de titulo arriba, buscar la fila de encabezados (CLIENTE + POLIZA)
    let filaEncabezado = 0;
    const filas = XLSX.utils.sheet_to_json(sh, { header: 1, defval: '' });
    for (let i = 0; i < Math.min(filas.length, 15); i++) {
      const celdas = filas[i].map(c => norm(c));
      if (celdas.some(c => c === 'cliente') && celdas.some(c => c.startsWith('poliza'))) { filaEncabezado = i; break; }
    }
    if (filaEncabezado > 0) console.log('[NOA] Encabezados en la fila', filaEncabezado + 1);

    // sheet_to_json usa la fila de encabezados como nombres de columna
    const data = XLSX.utils.sheet_to_json(sh, { defval: '', range: filaEncabezado });
    const cols = data.length > 0 ? Object.keys(data[0]) : [];

    // Convertir valores a string limpio
    const dataStr = data.map(row => {
      const o = {};
      cols.forEach(c => { o[c] = String(row[c] === null || row[c] === undefined ? '' : row[c]).trim(); });
      return o;
    }).filter(row => cols.some(c => row[c] !== ''));

    console.log('[NOA] Filas leídas:', dataStr.length);
    return { cols, data: dataStr };
  }

  // --- PDF: extrae texto con PDF.js, manda texto a Claude ---
  async function ensurePDFJS(){
    if (window.pdfjsLib) return;
    await new Promise((res,rej)=>{
      const s=document.createElement('script');
      s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      s.onload=res; s.onerror=()=>rej(new Error('No se pudo cargar PDF.js'));
      document.head.appendChild(s);
    });
    window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  async function extractPDFText(file){
    await ensurePDFJS();
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({data: new Uint8Array(buf)}).promise;
    let text = '';
    for(let i=1; i<=pdf.numPages; i++){
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item=>item.str).join(' ') + '\n';
    }
    return text;
  }

  // ── LLAMADA A CLAUDE VIA PROXY ──────────────────────────────
  async function llamarClaude(prompt, maxTokens=4096){
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!resp.ok) {
      const err = await resp.json().catch(()=>({}));
      throw new Error('Error Claude: ' + (err.error?.message || resp.status));
    }
    const r = await resp.json();
    return r.content?.[0]?.text || '';
  }

  // ── PREVISUALIZACIÓN ANTES DE CARGAR ────────────────────────
  function mostrarPreview(registros){
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:99999;display:flex;align-items:center;justify-content:center;';

      const campos = ['asegurado','poliza','desde','hasta','prima','moneda'];
      const filas = registros.slice(0,10).map(r =>
        `<tr>${campos.map(c=>`<td style="padding:6px 10px;border-bottom:1px solid #333;font-size:13px;color:#eee">${r[c]||''}</td>`).join('')}</tr>`
      ).join('');

      overlay.innerHTML = `
        <div style="background:#1a1a2e;border-radius:12px;padding:28px;max-width:90vw;max-height:85vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,0.8)">
          <h3 style="color:#4fc3f7;margin:0 0 8px;font-size:20px">📋 Previsualización del PDF</h3>
          <p style="color:#aaa;margin:0 0 16px;font-size:14px">Claude extrajo <strong style="color:#fff">${registros.length} registros</strong>. Revise los primeros 10 antes de cargar:</p>
          <div style="overflow-x:auto">
            <table style="border-collapse:collapse;min-width:600px">
              <thead><tr>${campos.map(c=>`<th style="padding:8px 10px;background:#2E75B6;color:#fff;font-size:13px;text-align:left">${c}</th>`).join('')}</tr></thead>
              <tbody>${filas}</tbody>
            </table>
          </div>
          ${registros.length > 10 ? `<p style="color:#888;font-size:12px;margin:10px 0 0">...y ${registros.length-10} registros más</p>` : ''}
          <div style="display:flex;gap:12px;margin-top:20px;justify-content:flex-end">
            <button id="pdfCancelar" style="padding:10px 24px;background:#555;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:15px">❌ Cancelar</button>
            <button id="pdfConfirmar" style="padding:10px 24px;background:#27AE60;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:15px;font-weight:bold">✅ Cargar ${registros.length} registros</button>
          </div>
        </div>`;

      document.body.appendChild(overlay);
      document.getElementById('pdfConfirmar').onclick = () => { document.body.removeChild(overlay); resolve(true); };
      document.getElementById('pdfCancelar').onclick  = () => { document.body.removeChild(overlay); resolve(false); };
    });
  }

  // ── PARSE JSON ROBUSTO ───────────────────────────────────────
  function parsearJSON(texto){
    const limpio = texto.replace(/```json|```/g,'').trim();
    try { return JSON.parse(limpio); } catch(e){}
    // Intentar recuperar si viene truncado
    const cutAt = Math.max(limpio.lastIndexOf(',{"'), limpio.lastIndexOf('},{'));
    const recuperado = cutAt > 0 ? limpio.substring(0, cutAt) + ']' : limpio + ']';
    try { return JSON.parse(recuperado); } catch(e2){ return null; }
  }

  // ── PARSEPDF: 2 PASADAS INTELIGENTES ────────────────────────
  async function parsePDF(file){
    const notify = (msg, tipo='info') => { if(typeof window.mostrarNotificacion==='function') window.mostrarNotificacion(msg, tipo); };

    notify('📄 Extrayendo texto del PDF...');
    const textoPDF = await extractPDFText(file);
    if (!textoPDF.trim()) throw new Error('El PDF no tiene texto extraíble (puede ser imagen escaneada)');

    const muestra = textoPDF.substring(0, 4000);
    const textoCompleto = textoPDF.substring(0, 14000);

    // ── PASADA 1: Descubrir estructura ──────────────────────
    notify('🔍 Pasada 1/2: Descubriendo estructura del PDF...');
    const promptEstructura = `Sos un experto en análisis de documentos. Analizá este fragmento de un PDF de pólizas de seguros.

Tu tarea: identificar CÓMO está organizada la información. Encontrá:
- ¿Qué columnas o campos existen? ¿Cómo se llaman exactamente en este PDF?
- ¿Cómo separa un registro del siguiente?
- ¿Hay encabezados? ¿En qué línea empiezan los datos?
- ¿Qué campo corresponde al nombre del asegurado, número de póliza, fechas de vigencia, prima/monto?

Respondé SOLO con un JSON así (sin markdown):
{"nombre_campo_asegurado":"como se llama en el PDF","nombre_campo_poliza":"...","nombre_campo_desde":"...","nombre_campo_hasta":"...","nombre_campo_prima":"...","nombre_campo_moneda":"...","patron_registro":"cómo identificar cada registro","observaciones":"lo que sea relevante"}

TEXTO DEL PDF:
${muestra}`;

    const respEstructura = await llamarClaude(promptEstructura, 1024);
    console.log('🔍 Estructura detectada:', respEstructura.substring(0, 300));
    let estructura = {};
    try { estructura = JSON.parse(respEstructura.replace(/```json|```/g,'').trim()); } catch(e){}

    // ── PASADA 2: Extraer datos usando la estructura ─────────
    notify('🤖 Pasada 2/2: Extrayendo todos los registros...');
    const promptExtraccion = `Sos un extractor experto de pólizas de seguros. 

ESTRUCTURA DETECTADA DE ESTE PDF:
${JSON.stringify(estructura, null, 2)}

Usando esa guía, extraé TODOS los registros del texto. Para cada campo buscalo con TODAS sus variaciones posibles:
- asegurado: nombre, cliente, tomador, titular, beneficiario, contratante, propietario, ${estructura.nombre_campo_asegurado||''}
- poliza: #póliza, número póliza, código, folio, contrato, certificado, ${estructura.nombre_campo_poliza||''}
- desde: inicio, vigencia desde, fecha inicio, emisión, efectivo desde, ${estructura.nombre_campo_desde||''}
- hasta: vencimiento, vigencia hasta, expira, vence, fin vigencia, ${estructura.nombre_campo_hasta||''}
- prima: pago, cuota, monto, valor, importe, costo, tarifa, ${estructura.nombre_campo_prima||''}
- moneda: CRC o USD (default CRC), ${estructura.nombre_campo_moneda||''}
- telefono: tel, celular, móvil, whatsapp, contacto
- correo: email, mail, correo electrónico
- aseguradora: compañía, empresa, carrier, ins
- periodicidad: mensual, trimestral, semestral, anual, frecuencia
- identificacion: cédula, documento, id, DNI
- tipo_seguro: producto, ramo, línea, tipo
- placa: vehículo, placa del vehículo

NO asumas orden fijo. Buscá la info dondequiera que esté.
Devolvé ÚNICAMENTE un array JSON compacto, sin texto ni markdown.

TEXTO COMPLETO:
${textoCompleto}`;

    const respDatos = await llamarClaude(promptExtraccion, 8192);
    console.log('📊 Datos extraídos:', respDatos.substring(0, 300));

    const jsonData = parsearJSON(respDatos);
    if (!jsonData || !jsonData.length) throw new Error('Claude no encontró registros en el PDF. Verifique que el PDF tenga texto seleccionable.');

    // ── PREVISUALIZACIÓN ─────────────────────────────────────
    const confirmado = await mostrarPreview(jsonData);
    if (!confirmado) throw new Error('Carga cancelada por el usuario.');

    // ── Convertir a Excel en memoria → pipeline normal ────────
    await ensureXLSX();
    const ws = XLSX.utils.json_to_sheet(jsonData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cartera');
    const cols = Object.keys(jsonData[0] || {});
    const data = XLSX.utils.sheet_to_json(wb.Sheets['Cartera'], { defval: '' });
    return { cols, data };
  }

  // === USA EL NORMALIZADOR CENTRAL ===
  async function handleFile(file){
    if (window.NOA_CARGA_EN_PROCESO) {
      alert('⏳ Ya hay una carga en proceso, esperá a que termine antes de subir otro archivo.');
      return;
    }
    window.NOA_CARGA_EN_PROCESO = true;
    const btnCarga = document.querySelector('button[onclick*="fileInput"]');
    const textoOriginalBtn = btnCarga ? btnCarga.innerHTML : null;
    if (btnCarga) { btnCarga.disabled = true; btnCarga.innerHTML = '⏳ Procesando, no cerrar ni recargar la pagina...'; btnCarga.style.opacity = '0.6'; btnCarga.style.cursor = 'not-allowed'; }

    const name=file.name.toLowerCase();
    let parsed;
    if (name.endsWith('.pdf')) parsed = await parsePDF(file);
    else if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.xlsm')) parsed = await parseExcel(file);
    else if (name.endsWith('.csv')) parsed = parseCSV(await file.text());
    else {
      try { parsed = await parseExcel(file); }
      catch { parsed = parseCSV(await file.text()); }
    }

    console.log('[NOA] Headers detectados:', parsed.cols);

    // === USAR NORMALIZADOR CENTRAL ===
    const datosNormalizados = window.normalizarLote ? window.normalizarLote(parsed.data) : parsed.data;

    console.log('[NOA] ✅ Datos normalizados:', datosNormalizados.length, 'registros');

    // Agregar al array existente en lugar de reemplazar
    if (!window.datosReales || !Array.isArray(window.datosReales)) {
      window.datosReales = datosNormalizados;
    } else {
      // Evitar duplicados por póliza: consultar a la base de datos qué pólizas ya existen
      let polizasExistentes = new Set();
      try {
        if (typeof window.cargarClientesSupabase === 'function') {
          const existentes = await window.cargarClientesSupabase();
          if (existentes && existentes.success && existentes.clientes) {
            existentes.clientes.forEach(c => polizasExistentes.add(c.poliza));
          }
        }
      } catch(e) { console.warn('Error consultando pólizas:', e); }
      const nuevos = datosNormalizados.filter(r => !polizasExistentes.has(r.poliza));
      window.datosReales = [...window.datosReales, ...nuevos];
      console.log('[NOA] Agregados', nuevos.length, 'nuevos registros. Total:', window.datosReales.length);
    }
    // Avisar que se está guardando ANTES de mostrar nada, para no mostrar un numero que despues cambia solo
    if (typeof mostrarNotificacion === 'function') mostrarNotificacion('⏳ Guardando ' + window.datosReales.length + ' clientes, un momento...', 'info');

    let resultadoGuardado = null;
    if (typeof window.guardarDatos === 'function') {
      resultadoGuardado = await window.guardarDatos(); // ESPERAR a que termine de verdad antes de mostrar pantalla
      console.log('[NOA] Guardado:', resultadoGuardado);
    }

    // Ya con window.datosReales sincronizado desde la base de datos (guardarDatos lo actualiza internamente), renderizar
    if (typeof window.NOA_RENDER_CARTERA==='function'){
      window.NOA_LAST_COLS = parsed.cols;
      window.NOA_LAST_SAMPLE = window.datosReales.slice(0,3);
      window.NOA_RENDER_CARTERA({ cols: parsed.cols, data: window.datosReales });
    } else {
      alert('Renderer de Cartera no encontrado.');
    }

    if (resultadoGuardado) {
      mostrarPanelResumenCarga({
        leidosDelExcel: datosNormalizados.length,
        enviadosAGuardar: window.datosReales.length,
        resultado: resultadoGuardado
      });
    }

    // Cambiar a cartera y notificar
    if (typeof mostrarNotificacion === 'function') mostrarNotificacion('✅ ' + window.datosReales.length + ' clientes cargados correctamente', 'success');
    if (typeof window.actualizarDashboardCompleto === 'function') window.actualizarDashboardCompleto();
    setTimeout(function() {
      if (typeof cambiarTab === 'function') cambiarTab('cartera');
    }, 800);

    window.NOA_CARGA_EN_PROCESO = false;
    if (btnCarga) { btnCarga.disabled = false; btnCarga.innerHTML = textoOriginalBtn; btnCarga.style.opacity = '1'; btnCarga.style.cursor = 'pointer'; }
  }

  // ===== Escuchar el "change" GLOBAL en captura =====
  document.addEventListener('change', async (e)=>{
    const el = e.target;
    if (el && el.tagName === 'INPUT' && el.type === 'file' && el.files && el.files[0]) {
      try { await handleFile(el.files[0]); }
      catch(err){
        alert('No se pudo leer el archivo: '+err);
        window.NOA_CARGA_EN_PROCESO = false;
        const btnCargaErr = document.querySelector('button[onclick*="fileInput"]');
        if (btnCargaErr) { btnCargaErr.disabled = false; btnCargaErr.style.opacity = '1'; btnCargaErr.style.cursor = 'pointer'; }
      }
    }
  }, true);

  // Soportar drop directo
  document.addEventListener('dragover', e=>{ e.preventDefault(); }, false);
  document.addEventListener('drop', async e=>{
    if (!e.dataTransfer?.files?.length) return;
    e.preventDefault();
    try { await handleFile(e.dataTransfer.files[0]); }
    catch(err){ alert('No se pudo leer el archivo (drop): '+err); }
  }, false);
})();
