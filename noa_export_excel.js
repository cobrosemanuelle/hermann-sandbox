// ─── HELPERS ────────────────────────────────────────────────────────────────
function normalizarTel(tel) {
  return String(tel || '').replace(/\+506/g, '').replace(/[\s\-]/g, '').trim();
}

function _persona(c){var i=String(c.identificacion||'').replace(/[^0-9a-z]/gi,'').toLowerCase();if(i)return 'id'+i;return 'n'+String(c.asegurado||'').toLowerCase().replace(/[^a-z0-9ñ]/g,'');}
function _repetidoEntre(datos,clave){var m={},r={};datos.forEach(function(c){var k=clave(c);if(!k)return;(m[k]=m[k]||{})[_persona(c)]=1;});Object.keys(m).forEach(function(k){r[k]=Object.keys(m[k]).length;});return r;}
function detectarTelSospechososBasico(datos){
  var rep=_repetidoEntre(datos,function(c){return normalizarTel(c.telefono);}),result=[];
  datos.forEach(function(c){var t=normalizarTel(c.telefono);if(!t)return;var r=[];
    if(t.length!==8)r.push('No tiene 8 dígitos ('+t.length+')');
    else if(/^(\d)\1+$/.test(t))r.push('Dígitos repetidos');
    else if('01234567890'.indexOf(t)>-1||'09876543210'.indexOf(t)>-1)r.push('Secuencia de números');
    else if(!/^[24-8]/.test(t))r.push('No empieza con 2, 4, 5, 6, 7 u 8');
    if(rep[t]>=3)r.push('Lo usan '+rep[t]+' personas distintas');
    if(r.length)result.push({id:c.id,nombre:c.asegurado||'?',valor:c.telefono,razon:r.join(' | ')});});
  return result;
}
function detectarEmailSospechososBasico(datos){
  var rep=_repetidoEntre(datos,function(c){return String(c.correo||'').trim().toLowerCase();}),result=[];
  var TY={'gmial.com':'gmail.com','gmai.com':'gmail.com','gamil.com':'gmail.com','gmail.con':'gmail.com','gmail.co':'gmail.com','hotmial.com':'hotmail.com','hotmal.com':'hotmail.com','hotmail.con':'hotmail.com','yaho.com':'yahoo.com','yahoo.con':'yahoo.com','outlok.com':'outlook.com'};
  datos.forEach(function(c){var e=String(c.correo||'').trim();if(!e)return;var l=e.toLowerCase(),d=l.split('@')[1]||'',r=[];
    if(!e.includes('@')||!e.includes('.'))r.push('Formato inválido');
    if(TY[d])r.push('Posible error en el dominio (¿'+TY[d]+'?)');
    if(rep[l]>=3)r.push('Lo usan '+rep[l]+' personas distintas');
    if(r.length)result.push({id:c.id,nombre:c.asegurado||'?',valor:e,razon:r.join(' | ')});});
  return result;
}

window.contarSospechosos = function() {
  const datos = window.datosReales || [];
  return { tel: detectarTelSospechososBasico(datos).length, email: detectarEmailSospechososBasico(datos).length };
};

// ─── CLAUDE AI ───────────────────────────────────────────────────────────────
async function llamarClaudeIA(prompt) {
  const apiKey = window.NOA_CLAUDE ? window.NOA_CLAUDE.getKey() : '';
  if (!apiKey) return null;
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    const texto = data.content[0].text.trim().replace(/^```json\s*/,'').replace(/```\s*$/,'').trim();
    return JSON.parse(texto);
  } catch(e) {
    console.error('Claude API error:', e);
    return null;
  }
}

async function analizarTelefonosConIA(telefonos) {
  const lista = telefonos.map((t, i) => `${i + 1}. ${t}`).join('\n');
  const prompt = `Eres un experto en validación de datos de clientes en Costa Rica.
Analiza esta lista de teléfonos costarricenses y detecta cuáles son sospechosos.

Criterios para Costa Rica:
- Los números válidos tienen 8 dígitos (sin código de país)
- Celulares empiezan con 6, 7 o 8
- Fijos empiezan con 2
- Números como 00000000, 11111111, 12345678 son inválidos
- Números que parecen inventados o de prueba

Lista de teléfonos (ya sin +506):
${lista}

Responde SOLO en JSON sin texto adicional ni markdown:
{"sospechosos":[{"telefono":"88888888","razon":"descripción corta"}]}

Si ninguno es sospechoso: {"sospechosos":[]}`;
  return await llamarClaudeIA(prompt);
}

async function analizarEmailsConIA(emails) {
  const lista = emails.map((e, i) => `${i + 1}. ${e}`).join('\n');
  const prompt = `Eres un experto en validación de datos de clientes de seguros en Costa Rica.
Analiza esta lista de emails y detecta cuáles son sospechosos o incorrectos.

Criterios:
- Typos en dominios (gmial, hotmal, yahooo, gmai, outloook, noacr, noa.cpm, etc.)
- Dominios inventados o sin sentido
- Emails genéricos de prueba (test@, admin@, info@, ejemplo@, noa@, lo@, tv@)
- Estructura claramente inválida

Lista de emails:
${lista}

Responde SOLO en JSON sin texto adicional ni markdown:
{"sospechosos":[{"email":"correo@ejemplo.com","razon":"descripción corta"}]}

Si ninguno es sospechoso: {"sospechosos":[]}`;
  return await llamarClaudeIA(prompt);
}

// ─── GUARDAR EN SUPABASE ─────────────────────────────────────────────────────
async function guardarCampoCliente(id, campo, valor, btnEl) {
  if (!valor.trim()) { alert('El campo no puede estar vacío'); return; }
  btnEl.textContent = '...';
  btnEl.disabled = true;
  try {
    const cambios = {};
    cambios[campo] = valor.trim();
    const { error } = await window.supabaseClient.from('clientes').update(cambios).eq('id', id);
    if (error) throw error;
    const idx = (window.datosReales || []).findIndex(c => c.id === id);
    if (idx >= 0) window.datosReales[idx][campo] = valor.trim();
    btnEl.textContent = '✅';
    btnEl.style.background = '#10b981';
    setTimeout(() => { btnEl.textContent = 'Guardar'; btnEl.disabled = false; btnEl.style.background = '#3b82f6'; }, 2000);
    if (window.actualizarTodosLosIndicadores) window.actualizarTodosLosIndicadores();
  } catch(e) {
    alert('Error al guardar: ' + e.message);
    btnEl.textContent = 'Guardar';
    btnEl.disabled = false;
  }
}

// ─── BOTÓN CONFIG IA ─────────────────────────────────────────────────────────
function botonConfigIA() {
  return `<div style="text-align:right;margin-bottom:12px;">
    <button onclick="const k=prompt('Pegue su API Key de Claude (sk-ant-...):');if(k&&k.trim()){window.NOA_CLAUDE.setKey(k.trim());alert('✅ API Key guardada correctamente');}" style="background:#7c3aed;color:#fff;border:none;border-radius:6px;padding:6px 12px;cursor:pointer;font-size:12px;">🔑 Configurar IA</button>
  </div>`;
}

// ─── MODAL GENÉRICO ───────────────────────────────────────────────────────────
function mostrarModalSospechosos(tipo, lista, usandoIA) {
  const existente = document.getElementById('modal-sospechosos');
  if (existente) existente.remove();

  const esTel = tipo === 'telefono';
  const icono = esTel ? '📱' : '📧';
  const titulo = esTel ? 'Teléfonos Sospechosos' : 'Emails Sospechosos';
  const colorBorde = '#0d9488';
  const colorBadge = '#ccfbf1';
  const colorTexto = '#0f766e';
  const campo = esTel ? 'telefono' : 'correo';
  const placeholder = esTel ? 'Nuevo teléfono' : 'Nuevo email';

  let tarjetas = '';
  lista.forEach((r, i) => {
    tarjetas += `
      <div style="background:#fff;border-radius:8px;padding:14px 16px;margin-bottom:10px;border-left:4px solid ${colorBorde};box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <div style="font-weight:700;color:#1e293b;font-size:14px;margin-bottom:4px;">${r.nombre}</div>
        <div style="color:${colorTexto};font-size:13px;margin-bottom:4px;">${icono} ${r.valor}</div>
        <div style="color:#ef4444;font-size:12px;margin-bottom:10px;">⚠️ ${r.razon}</div>
        <div style="display:flex;gap:8px;align-items:center;">
          <input id="sosp-input-${i}" type="text" placeholder="${placeholder}" style="flex:1;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;" />
          <button onclick="(async()=>{const inp=document.getElementById('sosp-input-${i}');await guardarCampoCliente('${r.id}','${campo}',inp.value,this);})()" style="background:#3b82f6;color:#fff;border:none;border-radius:6px;padding:7px 14px;cursor:pointer;font-size:13px;font-weight:600;">Guardar</button>
        </div>
      </div>`;
  });

  const cuerpo = lista.length === 0
    ? `<div style="text-align:center;padding:30px;color:#10b981;font-size:16px;font-weight:600;">✅ No se encontraron ${titulo.toLowerCase()}</div>`
    : tarjetas;

  document.body.insertAdjacentHTML('beforeend', `
    <div id="modal-sospechosos" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;">
      <div style="background:#f1f5f9;border-radius:14px;padding:24px;max-width:620px;width:92%;max-height:82vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.25);">
        ${botonConfigIA()}
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div>
            <div style="font-size:18px;font-weight:700;color:#1e293b;">${icono} ${titulo}</div>
            <div style="font-size:13px;color:#64748b;margin-top:2px;">${lista.length} registros · ${usandoIA ? '<span style="color:#0f766e;">🤖 Análisis IA activo</span>' : '<span style="color:#94a3b8;">Sin IA configurada</span>'}</div>
          </div>
          <div style="display:flex;gap:8px;">
            ${lista.length > 0 ? `<button onclick="exportarSospechososExcel('${tipo}')" style="background:#10b981;color:#fff;border:none;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:13px;font-weight:600;">📥 Excel</button>` : ''}
            <button onclick="document.getElementById('modal-sospechosos').remove()" style="background:#ef4444;color:#fff;border:none;border-radius:8px;padding:8px 16px;cursor:pointer;font-size:13px;font-weight:600;">✕ Cerrar</button>
          </div>
        </div>
        ${lista.length > 0 ? `<div style="background:${colorBadge};border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px;color:${colorTexto};font-weight:600;">Corrija el valor directamente y presione Guardar</div>` : ''}
        ${cuerpo}
      </div>
    </div>`);
}

function mostrarLoading(titulo) {
  const existente = document.getElementById('modal-sospechosos');
  if (existente) existente.remove();
  document.body.insertAdjacentHTML('beforeend', `
    <div id="modal-sospechosos" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;">
      <div style="background:#f1f5f9;border-radius:14px;padding:40px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.25);min-width:280px;">
        <div style="font-size:36px;margin-bottom:12px;">🧠</div>
        <div style="font-size:16px;font-weight:700;color:#1e293b;margin-bottom:6px;">${titulo}</div>
        <div style="font-size:13px;color:#64748b;">Claude está analizando los datos...</div>
      </div>
    </div>`);
}

// ─── MODAL TELÉFONOS ─────────────────────────────────────────────────────────
window.revisarTelefonosSospechosos = async function() {
  const datos = window.datosReales || [];
  if (datos.length === 0) { alert('No hay datos cargados'); return; }

  mostrarLoading('Analizando teléfonos con IA...');

  const basicosList = detectarTelSospechososBasico(datos);
  const telsUnicos = [...new Set(datos.filter(c => c.telefono && c.telefono.trim()).map(c => normalizarTel(c.telefono)))];
  const iaResult = await analizarTelefonosConIA(telsUnicos);

  const iaMap = {};
  if (iaResult && iaResult.sospechosos) {
    iaResult.sospechosos.forEach(s => { iaMap[normalizarTel(s.telefono)] = s.razon; });
  }

  const yaIncluidos = new Set();
  const lista = [];

  basicosList.forEach(r => {
    const key = r.id + '_' + r.valor;
    if (!yaIncluidos.has(key)) { yaIncluidos.add(key); lista.push(r); }
  });

  datos.forEach(c => {
    const t = normalizarTel(c.telefono);
    if (!t || !iaMap[t]) return;
    const key = c.id + '_' + c.telefono;
    if (!yaIncluidos.has(key)) {
      yaIncluidos.add(key);
      lista.push({ id: c.id, nombre: c.asegurado || '?', valor: c.telefono, razon: '🤖 IA: ' + iaMap[t] });
    }
  });

  mostrarModalSospechosos('telefono', lista, iaResult !== null);
};

// ─── MODAL EMAILS ─────────────────────────────────────────────────────────────
window.revisarEmailsSospechosos = async function() {
  const datos = window.datosReales || [];
  if (datos.length === 0) { alert('No hay datos cargados'); return; }

  mostrarLoading('Analizando emails con IA...');

  const basicosList = detectarEmailSospechososBasico(datos);
  const emailsUnicos = [...new Set(datos.filter(c => c.correo && c.correo.trim()).map(c => c.correo.trim().toLowerCase()))];
  const iaResult = await analizarEmailsConIA(emailsUnicos);

  const iaMap = {};
  if (iaResult && iaResult.sospechosos) {
    iaResult.sospechosos.forEach(s => { iaMap[s.email.toLowerCase()] = s.razon; });
  }

  const yaIncluidos = new Set();
  const lista = [];

  basicosList.forEach(r => {
    const key = r.id + '_' + r.valor;
    if (!yaIncluidos.has(key)) { yaIncluidos.add(key); lista.push(r); }
  });

  datos.forEach(c => {
    const email = String(c.correo || '').trim().toLowerCase();
    if (!email || !iaMap[email]) return;
    const key = c.id + '_' + c.correo;
    if (!yaIncluidos.has(key)) {
      yaIncluidos.add(key);
      lista.push({ id: c.id, nombre: c.asegurado || '?', valor: c.correo, razon: '🤖 IA: ' + iaMap[email] });
    }
  });

  mostrarModalSospechosos('email', lista, iaResult !== null);
};

// ─── EXCEL SOSPECHOSOS ───────────────────────────────────────────────────────
window.exportarSospechososExcel = function(tipo) {
  const datos = window.datosReales || [];
  const esTel = tipo === 'telefono';
  const lista = esTel ? detectarTelSospechososBasico(datos) : detectarEmailSospechososBasico(datos);
  if (lista.length === 0) { alert('No hay registros sospechosos'); return; }
  const headers = ['Asegurado', esTel ? 'Teléfono' : 'Email', 'Razón'];
  const wsData = [headers];
  lista.forEach(r => wsData.push([r.nombre, r.valor, r.razon]));
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sospechosos');
  XLSX.writeFile(wb, 'NOA_Sospechosos_' + (esTel ? 'Telefono' : 'Email') + '_' + new Date().toISOString().split('T')[0] + '.xlsx');
};

// ─── SEMÁFORO EXCEL ──────────────────────────────────────────────────────────
window.exportarSemaforoExcel = function(color) {
  const datos = window.datosReales || [];
  if (datos.length === 0) { alert('No hay datos para exportar'); return; }
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const filtrados = datos.filter(c => {
    if (!c.hasta) return false;
    let f;
    if (c.hasta.includes('-')) f = new Date(c.hasta);
    else if (c.hasta.includes('/')) { const [d,m,y]=c.hasta.split('/'); f=new Date(y,m-1,d); }
    if (!f||isNaN(f)) return false;
    const diff = Math.floor((f-hoy)/86400000);
    return color==='verde'?diff>10:color==='amarillo'?(diff>=0&&diff<=10):diff<0;
  });
  if (filtrados.length===0) { alert('No hay clientes en estado '+color.toUpperCase()); return; }
  const headers=['Asegurado','Cédula','Póliza','Prima','Moneda','Periodicidad','Desde','Hasta','Celular','Email','Aseguradora','Objeto Asegurado','Estado Póliza'];
  const wsData=[headers];
  filtrados.forEach(c=>wsData.push([c.asegurado||'',c.identificacion||'',c.poliza||'',c.prima||'',c.moneda||'',c.periodicidad||'',c.desde||'',c.hasta||'',c.telefono||'',c.correo||'',c.aseguradora||'',c.placa||'',c.estado||'']));
  const ws=XLSX.utils.aoa_to_sheet(wsData);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,color.toUpperCase());
  XLSX.writeFile(wb,'NOA_'+color.toUpperCase()+'_'+new Date().toISOString().split('T')[0]+'.xlsx');
};

// ─── PROBLEMA EXCEL ──────────────────────────────────────────────────────────
window.exportarProblemaExcel = function(tipo) {
  const datos = window.datosReales || [];
  if (datos.length===0) { alert('No hay datos para exportar'); return; }
  let filtrados = [], nombreArchivo = '';
  if (tipo === 'sin_nombre') {
    filtrados = datos.filter(function(c) {
      var n = (c.asegurado || '').toString().trim();
      return !n || n === '?' || n.length < 3;
    });
    nombreArchivo = 'sin_nombre';
  } else if (tipo === 'contacto_erroneo') { filtrados = datos.filter(c => !c.telefono || String(c.telefono).trim() === ''); nombreArchivo = 'Sin_Telefono'; }
  else if (tipo === 'no_responde') { filtrados = datos.filter(c => !c.correo || String(c.correo).trim() === ''); nombreArchivo = 'Sin_Email'; }
  else if (tipo === 'sin_contacto') { filtrados = datos.filter(c => (!c.telefono||String(c.telefono).trim()==='') && (!c.correo||String(c.correo).trim()===''));  nombreArchivo = 'Sin_Contacto'; }
  else if (tipo === 'saldo_invalido' || tipo === 'saldo_incorrecto') { filtrados = datos.filter(c => !c.prima || parseFloat(c.prima)<=0 || isNaN(parseFloat(c.prima))); nombreArchivo = 'Saldo_Invalido'; }
  if (filtrados.length===0) { alert('No hay clientes con este problema'); return; }
  const headers=['Asegurado','Cédula','Póliza','Prima','Moneda','Periodicidad','Desde','Hasta','Celular','Email','Aseguradora','Problema'];
  const wsData=[headers];
  filtrados.forEach(c => {
    let problemas = [];
    if (!c.telefono||String(c.telefono).trim()==='') problemas.push('Sin teléfono');
    if (!c.correo||String(c.correo).trim()==='') problemas.push('Sin email');
    if (!c.prima||parseFloat(c.prima)<=0||isNaN(parseFloat(c.prima))) problemas.push('Saldo inválido');
    wsData.push([c.asegurado||'',c.identificacion||'',c.poliza||'',c.prima||'',c.moneda||'',c.periodicidad||'',c.desde||'',c.hasta||'',c.telefono||'',c.correo||'',c.aseguradora||'',problemas.join(' | ')||'OK']);
  });
  const ws=XLSX.utils.aoa_to_sheet(wsData);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Problemas');
  XLSX.writeFile(wb,'NOA_'+nombreArchivo+'_'+new Date().toISOString().split('T')[0]+'.xlsx');
};

console.log('✅ noa_export_excel.js cargado');
;(function(){function p(){try{if(!window.contarSospechosos||!(window.datosReales||[]).length)return;var s=window.contarSospechosos(),a=document.getElementById('count-tel-sospechosos'),b=document.getElementById('count-email-sospechosos'),x='('+s.tel+')',y='('+s.email+')';if(a&&a.textContent!==x)a.textContent=x;if(b&&b.textContent!==y)b.textContent=y;}catch(e){}}setInterval(p,3000);setTimeout(p,800);})();
