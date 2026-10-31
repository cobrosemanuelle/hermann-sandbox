(()=>{
// ===== Utils =====
const pad=n=>String(n).padStart(2,'0');
const esc=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const money=(v,c='CRC')=>{const n=Number(String(v||'').replace(/[^\d.-]/g,''))||0;try{return new Intl.NumberFormat('es-CR',{style:'currency',currency:c,minimumFractionDigits: 2, maximumFractionDigits: 2}).format(n)}catch{return n.toLocaleString('es-CR')}};
const ddmmaa=(d)=>`${pad(d.getUTCDate())}-${pad(d.getUTCMonth()+1)}-${String(d.getUTCFullYear()).slice(-2)}`;
const excelSerialToDate=n=>{const ms=Number(n)*86400000; if(!isFinite(ms)) return null; return new Date(Date.UTC(1899,11,30)+ms);};
const parseDate=v=>{
  if(v==null||v==='') return null;
  const s=String(v).trim();
  if(/^\d{4,6}$/.test(s)){const d=excelSerialToDate(Number(s)); return d&&!isNaN(d)?d:null;}
  const m=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2}|\d{4})$/);
  if(m){let[_,dd,mm,yy]=m; const yyyy=yy.length===2?2000+Number(yy):Number(yy); return new Date(Date.UTC(yyyy,Number(mm)-1,Number(dd)));}
  const d=new Date(s); return isNaN(d)?null:new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
};
const addMonthsUTC=(d,n)=>new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+n,d.getUTCDate()));
const norm=s=>String(s??'').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim();
const monthsByPeriod=t=>{const x=norm(t); if(x.includes('bimens'))return 2; if(x.includes('trimes'))return 3; if(x.includes('semes'))return 6; if(x.includes('anual'))return 12; if(x.includes('mens'))return 1; return 1;};

// ===== Render 13 columnas (quita la vieja de 9) =====
const TITLES=['Estado','Desde','Hasta','# Póliza','Periodicidad de pago','Asegurado','Identificación','Teléfono','Correo electrónico','Tipo de seguro','Placa del Vehículo','Moneda','Prima'];

function hideOldTables(){
  document.querySelectorAll('table').forEach(t=>t.style.display='none'); // fuera duplicados
}

function keyFromPol(pol){ return String(pol||'').replace(/\s+/g,'').toUpperCase(); }

function render13(MAP){
  let mount=document.getElementById('noa-cartera13');
  if(!mount){
    mount=document.createElement('div');
    mount.id='noa-cartera13';
    mount.style.cssText='margin:24px 16px;padding:12px;background:#111827;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.35)';
    document.body.appendChild(mount);
  }
  mount.innerHTML=`<h3 style="margin:8px 12px 16px 12px;color:#e5e7eb">Cartera (13 columnas)</h3>
  <div class="tableWrap" style="overflow:auto">
    <table id="tabla13" style="width:100%;border-collapse:collapse">
      <thead><tr>${TITLES.map(h=>`<th style="text-align:left;padding:8px;border-bottom:1px solid #1f2937;color:#e5e7eb;white-space:nowrap">${h}</th>`).join('')}</tr></thead>
      <tbody></tbody>
    </table>
  </div>`;

  const tb=mount.querySelector('#tabla13 tbody'); tb.innerHTML='';
  // Acepta MAP como objeto de entradas { key: datos } ó array de filas
  const entries = Array.isArray(MAP) ? MAP.map((d)=>[keyFromPol(d.pol_original||d.poliza||d.pol||''), d]) : Object.entries(MAP);

  const rows=entries.sort((a,b)=>String(a[1].asegurado||'').localeCompare(String(b[1].asegurado||''),'es'));
  for(const [key,d0] of rows){
    const d = {...d0}; // copia defensiva
    const pol = d.pol_original || d.poliza || d.pol || key || '';
    const vals=[
      d.estado||'',
      d.desde? (parseDate(d.desde)? ddmmaa(parseDate(d.desde)) : d.desde) : '',
      d.hasta? (parseDate(d.hasta)? ddmmaa(parseDate(d.hasta)) : d.hasta) : '',
      pol,
      d.periodicidad||'',
      d.asegurado||'',
      d.identificacion||'',
      d.telefono||'',
      d.correo||'',
      d.tipo_seguro||'',
      d.placa||'',
      d.moneda||'CRC',
      money(d.prima||0, d.moneda||'CRC'),
    ];
    tb.insertAdjacentHTML('beforeend','<tr>'+vals.map(v=>`<td style="padding:8px;border-bottom:1px solid #1f2937;color:#e5e7eb;white-space:nowrap">${esc(v)}</td>`).join('')+'</tr>');
  }

  // Doble-click para marcar pagada y rodar vigencia
  const IDX_DESDE=1, IDX_HASTA=2, IDX_POL=3;
  tb.querySelectorAll('tr').forEach(tr=>{
    tr.addEventListener('dblclick', ()=>{
      const c=[...tr.children];
      const pol=(c[IDX_POL]?.textContent||'').trim(); if(!pol) return;
      const k=keyFromPol(pol);
      const src = Array.isArray(MAP) ? MAP.find(r => keyFromPol(r.pol_original||r.poliza||r.pol||'')===k) : (MAP[k]||null);
      if(!src) return alert('No encontré la póliza en datos cargados.');
      const per = src.periodicidad || 'Mensual';
      if(!confirm(`¿Marcar pagada la póliza ${pol}? Se rodará DESDE/HASTA según periodicidad: ${per}`)) return;

      const hastaActual = parseDate(src.hasta || c[IDX_HASTA].textContent);
      if(!hastaActual){ alert('No se pudo leer HASTA actual.'); return; }

      const meses = monthsByPeriod(per);
      const desdeNuevo = hastaActual;
      const hastaNuevo = addMonthsUTC(hastaActual, meses);

      src.desde = ddmmaa(desdeNuevo);
      src.hasta = ddmmaa(hastaNuevo);

      c[IDX_DESDE].textContent = src.desde;
      c[IDX_HASTA].textContent = src.hasta;

      console.log(`[NOA] ${pol} pagada → nueva vigencia ${src.desde} a ${src.hasta} ( +${meses} meses )`);
    }, {once:false});
  });

  if(!document.getElementById('noa-tip-dbl')){
    const tip=document.createElement('div');
    tip.id='noa-tip-dbl';
    tip.textContent='💰 Doble-click en una fila para marcar PAGADA y rodar DESDE/HASTA según periodicidad.';
    tip.style.cssText='position:sticky;bottom:8px;margin:12px 16px;padding:8px 12px;background:#0b1324;color:#e5e7eb;border:1px solid #1f2937;border-radius:10px;display:inline-block';
    mount.appendChild(tip);
  }

  console.log('[NOA] Cartera 13 columnas OK. Filas:', rows.length);
}

function ready(){
  // 1) Esconde tablas viejas (9 columnas)
  hideOldTables();

  // 2) Espera NOA_BY_POLIZA y renderiza
  let tries=0, iv=setInterval(()=>{
    tries++;
    const MAP = window.NOA_BY_POLIZA;
    if(MAP && (Array.isArray(MAP) ? MAP.length>0 : Object.keys(MAP).length>0)){
      clearInterval(iv);
      render13(MAP);
    }
    if(tries>80){ clearInterval(iv); console.warn('[NOA] NOA_BY_POLIZA vacío; subí tu Excel para ver la cartera.'); }
  },250);
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})();
