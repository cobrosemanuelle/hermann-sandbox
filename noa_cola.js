(function(){
var CF={telefono:{c:'telefono',t:'Agregar teléfono',l:'Teléfono (8 dígitos)',e:'8888-8888',f:function(c){return typeof validarTelefono==='function'?!validarTelefono(c.telefono):!c.telefono;}},
correo:{c:'correo',t:'Agregar email',l:'Correo electrónico',e:'nombre@gmail.com',f:function(c){return typeof validarEmail==='function'?!validarEmail(c.correo):!c.correo;}},
prima:{c:'prima',t:'Corregir monto',l:'Monto de la prima',e:'150 000,00',f:function(c){var m=parseFloat(c.prima||0);return isNaN(m)||m<=0;}}};
CF.nombre={c:'asegurado',t:'Registros sin nombre',l:'Nombre del asegurado',e:'APELLIDO1 APELLIDO2 NOMBRE',f:function(c){var a=String(c.asegurado==null?'':c.asegurado).trim();return !a||a==='?'||a.length<3;}};
CF.telSosp={c:'telefono',t:'Teléfonos sospechosos',l:'Teléfono (8 dígitos)',e:'8888-8888',pre:function(){var m={};(window.detectarTelSospechososBasico?window.detectarTelSospechososBasico(window.datosReales):[]).forEach(function(x){m[x.id]=x.razon;});return m;},vieja:window.revisarTelefonosSospechosos};
CF.emailSosp={c:'correo',t:'Emails sospechosos',l:'Correo electrónico',e:'nombre@gmail.com',pre:function(){var m={};(window.detectarEmailSospechososBasico?window.detectarEmailSospechososBasico(window.datosReales):[]).forEach(function(x){m[x.id]=x.razon;});return m;},vieja:window.revisarEmailsSospechosos};
var Q=null,ETQ={poliza:'Póliza',identificacion:'Cédula',tipo_seguro:'Tipo de seguro',aseguradora:'Aseguradora',correo:'Email',telefono:'Teléfono',direccion:'Dirección',desde:'Inicio',vence_contrato:'Vence'};
var NO=/^(id|user_id|asegurado|moneda|prima|periodo_gracia|tipo_movimiento|pagado|borrado|planillas|poliza_no_renueva|raw|data)$|_at$|_id$|^_/;
var TYPO={'gmial.com':'gmail.com','gmai.com':'gmail.com','gamil.com':'gmail.com','gmail.con':'gmail.com','gmail.co':'gmail.com','hotmial.com':'hotmail.com','hotmal.com':'hotmail.com','hotmail.con':'hotmail.com','yaho.com':'yahoo.com','yahoo.con':'yahoo.com','outlok.com':'outlook.com'};
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m];});}
function cli(){return (window.datosReales||[]).find(function(c){return c.id===Q.ids[Q.i];});}
function money(n){var p=Math.abs(n).toFixed(2).split('.');return p[0].replace(/\B(?=(\d{3})+(?!\d))/g,' ')+','+p[1];}
function fmt(k,v){v=String(v).trim();var d=v.match(/^(\d{4})-(\d{2})-(\d{2})/);return d?d[3]+'/'+d[2]+'/'+d[1]:v;}
function toast(t,mal){var x=document.createElement('div');x.textContent=t;x.style.cssText='position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:'+(mal?'#dc2626':'#0f766e')+';color:#fff;padding:12px 20px;border-radius:10px;font-weight:600;z-index:9600;box-shadow:0 6px 20px rgba(0,0,0,.3)';document.body.appendChild(x);setTimeout(function(){x.remove();},2200);}
function malTel(d){if(!/^[24-8]/.test(d))return 'Los números de Costa Rica empiezan con 2, 4, 5, 6, 7 u 8';if(/^(\d)\1+$/.test(d)||'01234567890'.indexOf(d)>-1||'09876543210'.indexOf(d)>-1||new Set(d.split('')).size<=2)return 'Ese número no parece real (repetido o en secuencia)';return '';}
function malMail(m){var p=m.toLowerCase().split('@'),l=p[0],d=p[1]||'';if(TYPO[d])return '¿Quiso decir @'+TYPO[d]+'?';if(/^(example|ejemplo|test|prueba|dominio)\.(com|org|net)$/.test(d))return 'Ese dominio es de ejemplo, no real';if(l.length<3||/^(test|prueba|asdf|xxx+|nada|ninguno|sincorreo|notiene|noaplica|abc+|aaa+|qwerty)$/.test(l))return 'Ese correo no parece real';return '';}
function pintar(){
  var m=document.getElementById('noa-cola-b');if(!m)return;
  var n=Q.ids.length,c=cli(),pct=n?Math.round(Q.ok/n*100):100,k=Q.cfg.c,h='';
  h+='<div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:18px;color:#12263f">'+Q.cfg.t+'</b><span>'+(Q.cfg.vieja?'<button data-a="l" style="margin-right:8px">Lista completa / Excel</button>':'')+'<button data-a="x">Cerrar</button></span></div>';
  h+='<div style="background:#e5e7eb;border-radius:6px;height:8px;margin:10px 0"><div style="background:#0d9488;height:8px;border-radius:6px;width:'+pct+'%"></div></div>';
  if(!c){return m.innerHTML=h+'<p style="color:#0f766e;font-size:16px">'+(n?'Listo: revisó todos ('+Q.ok+' corregidos de '+n+').':'No hay clientes pendientes.')+'</p>';}
  var usd=c.moneda==='USD',pr=parseFloat(c.prima||0),f=[['Moneda',usd?'Dólares (US$)':'Colones (₡)']];
  if(k!=='prima'&&pr>0)f.push(['Prima',(usd?'US$ ':'₡ ')+money(pr)]);
  Object.keys(c).forEach(function(x){var v=c[x],s=String(v==null?'':v).trim().toLowerCase();if(x===k||NO.test(x)||typeof v==='object'||!s||s==='false'||s==='true'||s==='0')return;f.push([ETQ[x]||x.replace(/_/g,' '),fmt(x,v)]);});
  h+='<div style="color:#6b7280;margin-bottom:8px">Cliente '+(Q.i+1)+' de '+n+' · corregidos '+Q.ok+'</div>';
  h+='<input id="noa-cola-q" placeholder="Buscar nombre, póliza o cédula y Enter" style="width:100%;padding:8px;margin-bottom:10px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box">';
  h+='<div style="background:#fff;border-left:4px solid #0d9488;border-radius:10px;padding:14px"><div style="font-size:17px;font-weight:700;color:#111827;margin-bottom:8px">'+esc(c.asegurado||'(sin nombre)')+'</div>'+(Q.raz&&Q.raz[c.id]?'<div style="color:#dc2626;font-weight:600;font-size:13px;margin-bottom:8px">⚠ '+esc(Q.raz[c.id])+'</div>':'')+'<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 16px">'+f.map(function(r){return '<div><div style="font-size:11px;color:#6b7280">'+esc(r[0])+'</div><div style="font-size:13px;color:#111827">'+esc(r[1])+'</div></div>';}).join('')+'</div></div>';
  h+='<label style="display:block;margin-top:14px;font-weight:700;color:#12263f">'+Q.cfg.l+'</label><input id="noa-cola-v" value="'+esc(c[k]||'')+'" placeholder="ej. '+Q.cfg.e+'" style="width:100%;padding:12px;font-size:18px;border:2px solid #0d9488;border-radius:8px;box-sizing:border-box;background:#fff;color:#111827">';
  h+='<div id="noa-cola-e" style="color:#dc2626;min-height:22px;font-size:13px;margin-top:4px"></div>';
  h+='<div style="display:flex;gap:8px;flex-wrap:wrap"><button data-a="p">← Anterior</button><button data-a="s">Saltar →</button><button data-a="g">Guardar y siguiente (Enter)</button></div>';
  m.innerHTML=h;var v=document.getElementById('noa-cola-v');if(v){v.focus();v.select();}
}
function sig(d){Q.i=Math.max(0,Math.min(Q.ids.length,Q.i+d));pintar();}
function guardar(){
  var c=cli(),v=document.getElementById('noa-cola-v'),e=document.getElementById('noa-cola-e'),k=Q.cfg.c;if(!c)return;
  var r=window.noaValidarCampo(k,v.value),x='';
  if(!r.ok)x=r.error||'Dato no válido';
  else if(k==='telefono')x=malTel(String(r.valor).replace(/\D/g,''));
  else if(k==='correo')x=malMail(String(r.valor));
  else if(k==='asegurado')x=(/@/.test(r.valor)||String(r.valor).trim().length<3)?'Escriba el nombre completo del asegurado':'';
  else if(k==='prima'&&Number(r.valor)<(c.moneda==='USD'?10:1000))x='Monto muy bajo para '+(c.moneda==='USD'?'dólares':'colones')+' (¿falta un cero?)';
  if(x){e.textContent=x;v.style.borderColor='#dc2626';return;}
  var o={};o[k]=r.valor;
  window.actualizarClienteSupabase(c.id,o).then(function(rs){if(rs&&(rs.error||rs.ok===false))throw 0;c[k]=(r.mostrar!=null?r.mostrar:r.valor);Q.ok++;if(window.actualizarContadoresProblemas)window.actualizarContadoresProblemas();if(window.actualizarTodosLosIndicadores)window.actualizarTodosLosIndicadores();toast('✓ Guardado: '+(k==='prima'?((c.moneda==='USD'?'US$ ':'₡ ')+money(Number(r.valor))):(r.mostrar||r.valor)));sig(1);}).catch(function(){toast('No se pudo guardar, intente de nuevo',1);});
}
function buscar(t){t=t.toLowerCase();var k=Q.ids.findIndex(function(id){var c=(window.datosReales||[]).find(function(x){return x.id===id;})||{};return [c.asegurado,c.poliza,c.identificacion].join(' ').toLowerCase().indexOf(t)>-1;});if(k>-1){Q.i=k;pintar();}else toast('No encontrado en esta lista',1);}
window.abrirColaCorreccion=function(tipo){
  var cfg=CF[tipo];if(!cfg||!window.datosReales)return;
  var raz=cfg.pre?cfg.pre():null;
  Q={cfg:cfg,raz:raz,ids:window.datosReales.filter(cfg.pre?function(c){return raz[c.id];}:cfg.f).map(function(c){return c.id;}),i:0,ok:0};
  var o=document.createElement('div');o.id='noa-cola';o.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9000;display:flex;align-items:center;justify-content:center';
  o.innerHTML='<div id="noa-cola-b" style="background:#f1f5f9;border-radius:14px;padding:20px;width:640px;max-width:95vw;max-height:92vh;overflow:auto"></div>';
  document.body.appendChild(o);
  o.addEventListener('click',function(ev){var a=ev.target.getAttribute&&ev.target.getAttribute('data-a');
    if(a==='x'){o.remove();if(window.renderizarCartera)window.renderizarCartera();}
    else if(a==='l'&&Q.cfg.vieja){o.remove();Q.cfg.vieja();}else if(a==='g')guardar();else if(a==='s')sig(1);else if(a==='p')sig(-1);});
  o.addEventListener('keydown',function(ev){if(ev.key!=='Enter')return;if(ev.target.id==='noa-cola-q')buscar(ev.target.value);else if(ev.target.id==='noa-cola-v')guardar();});
  pintar();
};
var orig=window.abrirModalListaClientes,mapa={telefono:'telefono',corregir:'telefono',email:'correo',llamar:'correo',actualizar:'prima'};
window.abrirModalListaClientes=function(t){if(mapa[t]&&window.abrirColaCorreccion)return window.abrirColaCorreccion(mapa[t]);return orig.apply(this,arguments);};
window.abrirModalSinNombre=function(){return window.abrirColaCorreccion('nombre');};
window.revisarTelefonosSospechosos=function(){return window.abrirColaCorreccion('telSosp');};
window.revisarEmailsSospechosos=function(){return window.abrirColaCorreccion('emailSosp');};
})();
