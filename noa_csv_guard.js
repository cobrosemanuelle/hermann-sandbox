(()=> {
  // Campos sugeridos para este layout (no bloqueamos si faltan; sólo avisamos)
  const SUG = ['Estado','Desde','Hasta','# Póliza','Periodicidad de pago','Asegurado','Identificación','Teléfono','Correo electrónico','Tipo de seguro','Placa del Vehículo','Moneda','Prima'];
  const norm = s=> (s==null?'':String(s)).normalize('NFD').replace(/\p{Diacritic}/gu,'').trim().toLowerCase();

  function guessDelim(line){ return (line.includes(';') && !line.includes(',')) ? ';' : ','; }

  function parseCSV(text){
    const lines = text.replace(/\r/g,'').split('\n').filter(Boolean);
    const delim = guessDelim(lines[0]||'');
    const cols  = lines.shift().split(delim).map(s=>s.trim());
    const data  = lines.map(line=>{
      const vals = line.split(delim); // simple; si usás comillas, podemos mejorar luego
      const obj={}; cols.forEach((c,i)=> obj[c] = (vals[i] ?? '').trim());
      return obj;
    });
    return { cols, data };
  }

  async function onFile(e){
    const f = e.target.files?.[0]; if(!f) return;
    const txt = await f.text();
    const parsed = parseCSV(txt);
    // Avisos suaves por columnas
    const colset = parsed.cols.map(c=>norm(c));
    const missing = SUG.filter(s=> !colset.includes(norm(s)));
    if (missing.length){
      console.warn('[NOA] Encabezados ausentes (no bloquea):', missing);
      alert('Aviso: Faltan columnas sugeridas:\n- ' + missing.join('\n- ') + '\nSe intentará mapear con lo disponible.');
    } else {
      alert(`CSV OK · Filas: ${parsed.data.length}`);
    }
    // Llamar al renderer de Cartera si existe
    if (typeof window.NOA_RENDER_CARTERA==='function'){
      window.NOA_RENDER_CARTERA(parsed);
    } else {
      console.log('[NOA] NOA_RENDER_CARTERA no existe aún.');
    }
  }

  function attach(){
    document.querySelectorAll('input[type="file"][accept*=".csv"]').forEach(inp=>{
      if (inp._noa_guard) return; inp._noa_guard = true;
      inp.addEventListener('change', onFile);
    });
  }

  document.readyState==='loading'
    ? document.addEventListener('DOMContentLoaded', attach)
    : attach();
})();
