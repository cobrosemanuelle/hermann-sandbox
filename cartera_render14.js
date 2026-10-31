(()=>{ 
  const TITLES=['Estado','Desde','Hasta','# Póliza','Periodicidad de pago','Asegurado','Identificación','Teléfono','Correo electrónico','Tipo de seguro','Placa del Vehículo','Moneda','Prima','Acciones IA'];
  const esc=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
  const money=(v,c='CRC')=>{ const n=Number(String(v||'').replace(/[^\d.-]/g,''))||0; try{ return new Intl.NumberFormat('es-CR',{style:'currency',currency:c,minimumFractionDigits: 2, maximumFractionDigits: 2}).format(n);}catch{ return n.toLocaleString('es-CR'); } };

  function hideOld(){
    for(const t of document.querySelectorAll('table')){
      const h=(t.tHead?.textContent||'').toLowerCase();
      if(h.includes('asegurado') && h.includes('score') && h.includes('acciones')){
        t.style.display='none';
        break;
      }
    }
  }

  function renderFrom(MAP){
    // contenedor al final para no pelear con estilos existentes
    let mount=document.getElementById('noa-cartera14');
    if(!mount){
      mount=document.createElement('div');
      mount.id='noa-cartera14';
      mount.style.cssText='margin:24px 16px;padding:12px;background:#111827;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.35)';
      document.body.appendChild(mount);
    }
    mount.innerHTML=`<h3 style="margin:8px 12px 16px 12px;color:#e5e7eb">Cartera (formato Seguros — 14 columnas)</h3>
      <div class="tableWrap" style="overflow:auto">
        <table id="tabla14" style="width:100%;border-collapse:collapse">
          <thead><tr>${TITLES.map(h=>`<th style="text-align:left;padding:8px;border-bottom:1px solid #1f2937;color:#e5e7eb;white-space:nowrap">${h}</th>`).join('')}</tr></thead>
          <tbody></tbody>
        </table>
      </div>`;
    const tb=mount.querySelector('#tabla14 tbody'); tb.innerHTML='';

    const rows=Object.values(MAP).sort((a,b)=>String(a.asegurado||'').localeCompare(String(b.asegurado||''),'es'));
    for(const d of rows){
      const phone=String(d.telefono||'').replace(/\D+/g,'');
      const correo=d.correo||'';
      const wa=phone?`<a href="https://wa.me/${phone}?text=${encodeURIComponent('Hola '+(d.asegurado||'')+', recordatorio de póliza '+(d.pol_original||''))}" target="_blank">WA</a>`:'';
      const mail=correo?`<a href="mailto:${correo}?subject=${encodeURIComponent('Recordatorio Vencimiento de Póliza')}">Email</a>`:'';
      const vals=[ d.estado||'', d.desde||'', d.hasta||'', d.pol_original||'',
                   d.periodicidad||'', d.asegurado||'', d.identificacion||'',
                   d.telefono||'', d.correo||'', d.tipo_seguro||'',
                   d.placa||'', d.moneda||'CRC', money(d.prima||0, d.moneda||'CRC'),
                   {__html:`${wa} ${mail}`} ];
      tb.insertAdjacentHTML('beforeend',
        '<tr>'+vals.map(v => (v&&typeof v==='object'&&v.__html!=null)
          ? `<td style="padding:8px;border-bottom:1px solid #1f2937">${v.__html}</td>`
          : `<td style="padding:8px;border-bottom:1px solid #1f2937;color:#e5e7eb;white-space:nowrap">${esc(v)}</td>`
        ).join('') + '</tr>');
    }
    console.log('[NOA] Cartera 14 columnas renderizada:', rows.length, 'filas');
  }

  function ready(){
    let tries=0;
    const iv=setInterval(()=>{
      tries++;
      const MAP=window.NOA_BY_POLIZA;
      if(MAP && Object.keys(MAP).length){
        clearInterval(iv);
        hideOld();
        renderFrom(MAP);
      } else if (tries>80){ // ~20s
        clearInterval(iv);
        console.warn('[NOA] NOA_BY_POLIZA vacío; cargar Excel para ver la tabla 14 columnas.');
      }
    },250);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
})();
