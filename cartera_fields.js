// NOA - CARTERA V8
// Incluye el ESTADO COMPARTIDO (window.NOA_ESTADO): una sola regla de fechas y de estado de cobro para Cartera
// y el resto de pantallas. Las fechas se manejan planas (sin hora ni zona) y en hora de Costa Rica.
// Periodo de gracia de Emmanuel: 9 dias habiles para todos los seguros (sin sabados, domingos ni feriados de ley),
// calculado siempre desde la fecha de cobro: no depende de ningun dato guardado, asi una recarga del Excel no lo cambia.
// Estados segun la lista de Emmanuel:
//   Pendiente = desde 1 mes antes del cobro; Pagada = el cobro del periodo ya fue registrado;
//   Cancelada = el dia siguiente a terminar el periodo de gracia.
// Lo que no se puede calcular (sin fecha) queda sin estado: no se inventa nada.
(()=>{
const MS_DIA=86400000;
const GRACIA_HABILES=9;
const pad2=n=>String(n).padStart(2,'0');
const numDia=(y,m,d)=>Math.round(Date.UTC(y,m-1,d)/MS_DIA);

function parseFecha(v){
  if(v===null||v===undefined||v==='')return null;
  let y,m,d;
  if(v instanceof Date){
    if(isNaN(v.getTime()))return null;
    y=v.getFullYear();m=v.getMonth()+1;d=v.getDate();
  }else{
    const s=String(v).trim();
    let r=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(r){y=+r[1];m=+r[2];d=+r[3];}
    else{
      r=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if(!r)return null;
      d=+r[1];m=+r[2];y=+r[3];
    }
  }
  if(!(m>=1&&m<=12&&d>=1&&d<=31))return null;
  return {y:y,m:m,d:d,n:numDia(y,m,d),iso:y+'-'+pad2(m)+'-'+pad2(d)};
}
function hoyCR(){
  try{
    return parseFecha(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Costa_Rica',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));
  }catch(e){return parseFecha(new Date());}
}
function mesesAntes(f,k){
  let y=f.y,m=f.m-k;
  while(m<1){m+=12;y--;}
  const ult=new Date(Date.UTC(y,m,0)).getUTCDate();
  return parseFecha(y+'-'+pad2(m)+'-'+pad2(Math.min(f.d,ult)));
}
function aDDMM(v){const f=parseFecha(v);return f?pad2(f.d)+'/'+pad2(f.m)+'/'+f.y:'';}

// Feriados de ley de Costa Rica: se usa el del sistema (noa_feriados_cr.js) y, si no esta cargado, una copia equivalente
const FERIADOS_FIJOS=[[1,1],[4,11],[5,1],[7,25],[8,15],[9,15],[12,25]];
const semanaSanta={};
function pascuaMs(anio){
  const a=anio%19,b=Math.floor(anio/100),c=anio%100,d=Math.floor(b/4),e=b%4;
  const f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30;
  const i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
  const mes=Math.floor((h+l-7*m+114)/31),dia=((h+l-7*m+114)%31)+1;
  return Date.UTC(anio,mes-1,dia);
}
function feriadoInterno(y,m,d){
  if(FERIADOS_FIJOS.some(x=>x[0]===m&&x[1]===d))return true;
  if(!semanaSanta[y]){const p=pascuaMs(y);semanaSanta[y]=[p-3*MS_DIA,p-2*MS_DIA];}
  return semanaSanta[y].indexOf(Date.UTC(y,m-1,d))!==-1;
}
function esFeriado(y,m,d){
  if(typeof window.esFeriadoLeyCR==='function'){try{return !!window.esFeriadoLeyCR(new Date(y,m-1,d));}catch(e){}}
  return feriadoInterno(y,m,d);
}
// Ultimo dia del periodo de gracia: GRACIA_HABILES dias habiles despues de la fecha de cobro
const LIMITES={};
function limiteGracia(ref){
  if(!ref)return null;
  if(LIMITES[ref.iso])return LIMITES[ref.iso];
  let ms=Date.UTC(ref.y,ref.m-1,ref.d),faltan=GRACIA_HABILES;
  while(faltan>0){
    ms+=MS_DIA;
    const dt=new Date(ms),dow=dt.getUTCDay();
    if(dow!==0&&dow!==6&&!esFeriado(dt.getUTCFullYear(),dt.getUTCMonth()+1,dt.getUTCDate()))faltan--;
  }
  const dt=new Date(ms);
  return (LIMITES[ref.iso]=parseFecha(dt.getUTCFullYear()+'-'+pad2(dt.getUTCMonth()+1)+'-'+pad2(dt.getUTCDate())));
}
// Fecha limite de pago de un cliente: siempre se calcula desde su fecha de cobro (no se usa el dato guardado)
function limiteDe(r,ref){
  const f=ref||parseFecha(r&&r.desde_cobro);
  return f?limiteGracia(f):null;
}

const PAGOS={cargado:false,porCliente:{}};
async function cargarPagos(){
  try{
    const u=(typeof getUserNOA==='function')?await getUserNOA():null;
    if(!u)return false;
    const resp=await fetch('/api/pagos?user_id='+encodeURIComponent(u.id));
    const datos=await resp.json();
    if(!resp.ok||!datos||datos.success===false)return false;
    const mapa={};
    (datos.pagos||[]).forEach(function(p){
      const f=parseFecha(p.periodo_hasta);
      if(!f)return;
      const k=String(p.cliente_id);
      (mapa[k]=mapa[k]||{})[f.iso]=true;
    });
    Object.keys(mapa).forEach(function(k){PAGOS.porCliente[k]=Object.assign(PAGOS.porCliente[k]||{},mapa[k]);});PAGOS.cargado=true;
    return true;
  }catch(e){console.error('No se pudieron cargar los pagos:',e);return false;}
}
function registrarPago(clienteId,periodoHasta){
  const f=parseFecha(periodoHasta);if(!f)return;
  const k=String(clienteId);
  (PAGOS.porCliente[k]=PAGOS.porCliente[k]||{})[f.iso]=true;
}
function estadoDe(r,hoyIso){
  const hoy=hoyIso?parseFecha(hoyIso):hoyCR();
  const ref=parseFecha(r.desde_cobro);
  if(!ref)return {clave:'sin_fecha',texto:'Sin fecha',clase:'badge-none',detalle:'El cliente no tiene fecha de cobro',dias:null};
  const dias=ref.n-hoy.n;
  const inicio=mesesAntes(ref,1);
  const limite=limiteDe(r,ref);
  const pagos=PAGOS.porCliente[String(r.id)];
  const pagada=!!(pagos&&pagos[ref.iso]);
  if(limite&&hoy.n>limite.n)return {clave:'cancelada',texto:'🔴 Cancelada',clase:'badge-late',detalle:'Cancelada: el periodo de gracia terminó el '+aDDMM(limite.iso),dias:dias};
  if(hoy.n>=inicio.n){
    let d;
    if(dias>0)d='Vence en '+dias+' días';
    else if(dias===0)d='Vence hoy';
    else d='En periodo de gracia'+(limite?' hasta el '+aDDMM(limite.iso):'');
    return {clave:'pendiente',texto:'🟡 Pendiente',clase:'badge-pending',detalle:d,dias:dias};
  }
  if(pagada)return {clave:'pagada',texto:'🟢 Pagada',clase:'badge-ok',detalle:'Pago registrado; vuelve a pendiente 1 mes antes del cobro',dias:dias};
  return {clave:'aun',texto:'—',clase:'badge-none',detalle:'Aún no entra al periodo de cobro (vence en '+dias+' días)',dias:dias};
}
window.NOA_ESTADO={parseFecha:parseFecha,hoyCR:hoyCR,mesesAntes:mesesAntes,aDDMM:aDDMM,estadoDe:estadoDe,limiteDe:limiteDe,limiteGracia:limiteGracia,GRACIA_HABILES:GRACIA_HABILES,cargarPagos:cargarPagos,registrarPago:registrarPago,
  diasHasta:function(f,hoyIso){const a=parseFecha(f);if(!a)return null;const h=hoyIso?parseFecha(hoyIso):hoyCR();return a.n-h.n;}};

const NOA={bg:'#111827',panel:'#1F2937',fg:'#FFFFFF',muted:'#CBD5E1',accent:'#0EA5E9',ok:'#10B981',warn:'#F59E0B',err:'#EF4444',radius:'14px',shadow:'0 10px 30px rgba(0,0,0,.25)'};
const norm=s=>(s==null?'':String(s)).normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim();

function buildCols(raw){
  return [
    {key:'select',label:'☑️'},
    {key:'estado_pago',label:'Estado Pago'},
    {key:'asegurado_sticky',label:'Cliente'},
    {key:'acciones',label:'Acciones'},
    {key:'identificacion',label:'Identificación'},
    {key:'poliza',label:'Póliza'},
    {key:'acreedor',label:'Acreedor'},
    {key:'aseguradora',label:'Aseguradora'},
    {key:'tipo_seguro',label:'Línea'},
    {key:'objeto_asegurado',label:'Objeto Asegurado'},
    {key:'anio',label:'Año'},
    {key:'placa',label:'Placa'},
    {key:'desde_cobro',label:'Vencimiento'},
    {key:'hasta',label:'Próx Pago'},
    {key:'periodicidad',label:'Forma de pago'},
    {key:'medio_cobro',label:'Medio de cobro'},
    {key:'fecha_limite',label:'F. Límite'},
    {key:'prima',label:'Prima'},
    {key:'moneda',label:'Moneda'},
    {key:'telefono',label:'Tel / WA'},
    {key:'telefonos_extra',label:'Otros tel.'},
    {key:'correo',label:'Email'},
    {key:'correos_extra',label:'Otros correos'},
    {key:'direccion',label:'Dirección'},
    {key:'planillas',label:'Planillas'},
    {key:'desde',label:'Inicio',grupo:'contrato'},
    {key:'vence_contrato',label:'Vence',grupo:'contrato'}
  ];
}

let COLS=[],FILTER='PENDIENTE',SEARCH_TERM='';const SZ=50;
const FILTROS_VIEJOS={VENCIDO:'CANCELADA',PAGADO:'PAGADA',POR_COBRAR:'PENDIENTE'};
const NOMBRES_FILTRO={TODO:'Todos',PENDIENTE:'🟡 Pendientes',PAGADA:'🟢 Pagadas',CANCELADA:'🔴 Canceladas',VENCE_HOY:'Vencen el día actual',CRC:'₡ Colones',USD:'$ Dólares',DM:'🏦 Deducción Mensual',DUPLICADOS:'⚠️ Duplicados'};
function excelDate(v){if(!v)return '';if(typeof v==='string'&&v.includes('-')&&v.length>=10){const parts=v.split('T')[0].split('-');if(parts.length===3&&parts[0].length===4)return parts[2]+'/'+parts[1]+'/'+parts[0];}const n=Number(v);if(!isNaN(n)&&n>1000&&n<100000){const d=new Date((n-25569)*86400*1000);if(!isNaN(d.getTime())){const dd=String(d.getUTCDate()).padStart(2,'0');const mm=String(d.getUTCMonth()+1).padStart(2,'0');const yy=d.getUTCFullYear();return `${dd}/${mm}/${yy}`;}}return v;}
window.excelDate = excelDate;
const esDM=r=>{const p=norm(r.periodicidad||'');const m=norm(r.medio_cobro||'');if(p.includes('deduccion mensual')||p==='dm')return true;return m.includes('deduccion mensual')||m==='tarjeta autorizada';}; /*NOA_DM_MEDIO*/

// Orden por columna: el valor de cada columna para poder ordenar (vacios siempre al final)
function valorOrden(k){
  const E=window.NOA_ESTADO;
  const f=iso=>{const p=iso?E.parseFecha(iso):null;return p?p.n:null;};
  const t=v=>{const s=norm(v==null?'':String(v));return s===''?null:s;};
  switch(k){
    case 'estado_pago':return (r,rg)=>rg.get(r);
    case 'asegurado_sticky':return r=>{const x=t(r.asegurado);return x&&(x.match(/[a-z]/g)||[]).length>=3?x:null;};
    case 'desde_cobro':return r=>f(r.desde_cobro);
    case 'hasta':return r=>f(r.hasta);
    case 'fecha_limite':return r=>{try{const p=E.parseFecha(r.desde_cobro);const l=p?E.limiteDe(r,p):null;return l&&l.iso?f(l.iso):null;}catch(e){return null;}};
    case 'prima':return r=>{const x=Number(String(r.prima==null?'':r.prima).replace(/\s/g,'').replace(',','.'));return isFinite(x)&&x>0?x:null;};
    case 'anio':return r=>{const x=parseInt(r['DETALLE_AUT_INS::Año']||r.anio,10);return isFinite(x)?x:null;};
    default:return r=>t(r[k]);
  }
}
function getFiltered(){
  const f=FILTROS_VIEJOS[FILTER]||FILTER;
  const RAW=window.datosReales||[];
  const ALL=f==='DM'?RAW.filter(esDM):RAW.filter(r=>!esDM(r));
  const cuenta={};ALL.forEach(c=>{if(c.poliza)cuenta[c.poliza]=(cuenta[c.poliza]||0)+1;});
  const E=window.NOA_ESTADO;
  const st=r=>E.estadoDe(r).clave;
  const mon=r=>norm(r.moneda||'');
  let lista;
  if(f==='PENDIENTE')lista=ALL.filter(r=>st(r)==='pendiente');
  else if(f==='PAGADA')lista=ALL.filter(r=>st(r)==='pagada');
  else if(f==='CANCELADA')lista=ALL.filter(r=>st(r)==='cancelada');
  else if(f==='VENCE_HOY')lista=ALL.filter(r=>{const e=E.estadoDe(r);return e.clave==='pendiente'&&e.dias===0;});
  else if(f==='CRC')lista=ALL.filter(r=>mon(r)===''||mon(r).includes('crc')||mon(r).includes('colon'));
  else if(f==='USD')lista=ALL.filter(r=>mon(r).includes('usd')||mon(r).includes('dolar'));
  else if(f==='DUPLICADOS')lista=ALL.filter(r=>r.poliza&&cuenta[r.poliza]>1);
  else lista=ALL;
  if(SEARCH_TERM){
    const search=norm(SEARCH_TERM);
    lista=lista.filter(r=>{
      const marca=r['DETALLE_AUT_INS::Marca']||r.marca||'';
      const modelo=r['DETALLE_AUT_INS::Modelo']||r.modelo||'';
      const anio=r['DETALLE_AUT_INS::Año']||r.anio||'';
      const objeto=[r.objeto_asegurado||'',marca,modelo,anio,r.placa||''].filter(x=>x&&String(x).trim()!=='').join(' ');
      const tipo=String(r.tipo_seguro||'').trim();
      const otros=[r.aseguradora,tipo,/^autos?$/i.test(tipo)?'automoviles automovil':'',r.periodicidad,r.medio_cobro==='Tarjeta Autorizada'?'Deducción Mensual':r.medio_cobro,r.direccion,r.acreedor,r.telefonos_extra,r.correos_extra].filter(x=>x&&String(x).trim()!=='').join(' ');
      return norm(r.asegurado||'').includes(search)||norm(r.poliza||'').includes(search)||norm(r.telefono||'').includes(search)||norm(r.correo||'').includes(search)||norm(r.identificacion||'').includes(search)||norm(objeto).includes(search)||norm(otros).includes(search);
    });
  }
  const nd=r=>{const p=E.parseFecha(r.desde_cobro);return p?p.n:Infinity;};
  // Orden: lo que hay que cobrar primero. Pendientes (la que vence antes arriba), luego las que aun estan lejos, las pagadas,
  // las canceladas (las mas recientes primero) y al final las que no tienen fecha.
  const ORDEN={pendiente:0,aun:1,pagada:2,cancelada:3,sin_fecha:4};
  const rango=new Map();
  lista.forEach(r=>{const k=E.estadoDe(r).clave;rango.set(r,ORDEN[k]===undefined?5:ORDEN[k]);});
  const porDefecto=(a,b)=>{const ra=rango.get(a),rb=rango.get(b);if(ra!==rb)return ra-rb;const x=nd(a),y=nd(b);if(x===y)return 0;return ra===3?(x>y?-1:1):(x<y?-1:1);};
  const S=window.NOA_SORT;
  if(S&&S.key){
    const val=valorOrden(S.key);
    return lista.sort((a,b)=>{
      const va=val(a,rango),vb=val(b,rango);
      const na=(va===null||va===undefined),nb=(vb===null||vb===undefined);
      if(na&&nb)return porDefecto(a,b);if(na)return 1;if(nb)return -1;
      const c=(typeof va==='number'&&typeof vb==='number')?va-vb:String(va).localeCompare(String(vb),'es');
      return c===0?porDefecto(a,b):c*S.dir;
    });
  }
  return lista.sort(porDefecto);
}
function getCurrentTab(){const tabs=document.querySelectorAll('.tab-content');for(let t of tabs){if(t.classList.contains('active'))return t.id;}return null;}
// FIN_PARTE_1
// ===== Vista de la tabla: SIMPLE por defecto (lo esencial) y COMPLETA (todas las columnas) =====
const VISTA_SIMPLE=['select','estado_pago','asegurado_sticky','acciones','poliza','acreedor','aseguradora','tipo_seguro','periodicidad','desde_cobro','fecha_limite','prima','moneda','objeto_asegurado','anio','placa','hasta','medio_cobro'];
let VISTA='simple';
function colsVisibles(){const o=VISTA_SIMPLE.map(k=>COLS.find(c=>c.key===k)).filter(Boolean);return VISTA==='completa'?o.concat(COLS.filter(c=>VISTA_SIMPLE.indexOf(c.key)===-1)):o;}
// Cuando se cambia un filtro, la tabla vuelve al inicio (izquierda y arriba). Si no, queda corrida a las columnas de detalle.
let RESET=false;
function irAlInicio(){RESET=true;}
window.NOA_IR_AL_INICIO=irAlInicio;
// Filtro del semaforo del Dashboard (azul, verde, amarillo, rojo). Se suma a la pestaña porque cada color es parte de Pendientes o de Canceladas.
let SEM=null;
const SEM_INFO={
  azul:{padre:'PENDIENTE',txt:'🔵 Azul: a 1 mes del vencimiento'},
  verde:{padre:'PENDIENTE',txt:'🟢 Verde: 20 días o menos para vencer'},
  amarillo:{padre:'PENDIENTE',txt:'🟡 Amarillo: periodo de gracia'},
  rojo:{padre:'CANCELADA',txt:'🔴 Rojo: canceladas'}
};
function aplicarSemaforo(lista){
  if(!SEM)return lista;
  const S=window.NOA_SEMAFORO;
  if(!S||typeof S.colorDe!=='function')return lista;
  return lista.filter(r=>S.colorDe(r)===SEM);
}

// Anchos de columna (incluyen el relleno), con diseño de tabla FIJO: la columna mide lo que aqui se dice y el texto largo se corta con "...".
// Vista completa: cada columna con su ancho y desplazamiento de lado.
const ANCHOS={select:'34px',estado_pago:'120px',asegurado_sticky:'190px',acciones:'208px',identificacion:'144px',poliza:'170px',acreedor:'150px',planillas:'104px',aseguradora:'132px',tipo_seguro:'170px',objeto_asegurado:'200px',anio:'64px',placa:'100px',desde_cobro:'120px',hasta:'104px',periodicidad:'150px',medio_cobro:'170px',fecha_limite:'104px',prima:'150px',moneda:'84px',telefono:'110px',telefonos_extra:'124px',correo:'230px',correos_extra:'230px',desde:'100px',vence_contrato:'100px'};
// Vista simple: letra de 12px y relleno de 6px (ver el CSS de .simple). Las 8 columnas suman 930px para caber en el panel sin correrse de lado.
const ANCHOS_SIMPLE={select:'26px',estado_pago:'106px',asegurado_sticky:'148px',acciones:'192px',poliza:'148px',acreedor:'110px',aseguradora:'108px',desde_cobro:'120px',periodicidad:'150px'};

function host(){
  const tabId=getCurrentTab();if(tabId!=='cartera')return null;
  let container=document.getElementById('cartera');if(!container)return null;
  let w=container.querySelector('#cartera-noa');
  if(!w){
    w=document.createElement('div');
    w.id='cartera-noa';
    w.style.cssText=`background:${NOA.panel};border-radius:${NOA.radius};box-shadow:${NOA.shadow};margin:20px 0;`;
    w.innerHTML=`<style>
.noa-btn{background:linear-gradient(135deg,${NOA.accent},#0284c7);color:${NOA.fg};border:none;padding:10px 20px;border-radius:${NOA.radius};font-weight:600;font-size:14px;cursor:pointer;transition:all .3s;box-shadow:0 4px 12px rgba(14,165,233,.3)}
.noa-btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(14,165,233,.5)}
.noa-btn:active{transform:translateY(0)}
.noa-tab{padding:12px 24px;font-size:15px;opacity:.7}
.noa-tab.activo{opacity:1;box-shadow:0 0 0 3px rgba(255,255,255,.9),0 6px 20px rgba(0,0,0,.4)}
.noa-menu{position:relative;display:inline-block}
.noa-menu>summary{list-style:none;cursor:pointer;display:inline-block}
.noa-menu>summary::-webkit-details-marker{display:none}
.noa-menu-panel{position:fixed;z-index:9500;margin-top:6px;background:#111827;border:1px solid #334155;border-radius:12px;padding:8px;display:flex;flex-direction:column;gap:6px;min-width:240px;box-shadow:0 12px 30px rgba(0,0,0,.5)}
.noa-menu-panel .noa-btn{text-align:left;padding:8px 14px;font-size:13px}
.noa-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:20px;font-size:13px;font-weight:600;white-space:nowrap}
.badge-ok{background:rgba(16,185,129,.15);color:${NOA.ok};border:1px solid ${NOA.ok}}
.badge-pending{background:rgba(245,158,11,.15);color:#b45309;border:1px solid ${NOA.warn}}
.badge-late{background:rgba(239,68,68,.15);color:${NOA.err};border:1px solid ${NOA.err}}
.badge-none{background:rgba(148,163,184,.15);color:#64748b;border:1px solid #94a3b8}
.noa-table{width:100%;border-collapse:collapse;font-size:13px;table-layout:fixed}
.noa-table th,.noa-table td{box-sizing:border-box}
.noa-table th{background:${NOA.bg};color:#FFFFFF;text-align:left;padding:10px 14px;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0;position:sticky;top:0;z-index:3;border-bottom:2px solid ${NOA.accent};white-space:nowrap}
.noa-table th.col-sticky{position:sticky;top:0;left:0;z-index:5;background:${NOA.bg};border-right:1px solid #334155}
.noa-table td{padding:10px 14px;border-bottom:1px solid #e2e8f0;transition:background .2s;white-space:nowrap;overflow:hidden;background:#ffffff;color:#1e293b;}
.noa-table td.col-sticky{position:sticky;left:0;background:${NOA.panel};z-index:2;border-right:1px solid #334155;font-weight:600;color:#FFFFFF}
.noa-table tr:hover td{background:rgba(14,165,233,.05)}
.noa-table tr:hover td.col-sticky{background:#1a2a3a}
.noa-table td,.noa-table th{padding-left:8px!important;padding-right:8px!important}
.noa-table td button{padding:4px 6px!important}
.noa-table .noa-badge{padding:3px 7px}
.noa-table.simple td,.noa-table.simple th{padding-left:6px!important;padding-right:6px!important}
.noa-table.simple td{font-size:12px!important}
.noa-table.simple th{font-size:10.5px!important}
.noa-table.simple td button{padding:3px 5px!important;font-size:12px!important;margin-right:2px!important}
.noa-table.simple .noa-badge{padding:2px 6px!important;font-size:10px!important}
</style>
<div style="padding:16px 20px;border-bottom:1px solid #334155">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:10px">
<h2 style="margin:0;color:${NOA.fg};font-size:24px;font-weight:700">Cartera</h2>
</div>
<div id="kpis-cartera" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
<div id="kpi-cartera-vencidos" onclick="window.filtrarCarteraPorKPI('CANCELADA')" title="Ver las canceladas" style="cursor:pointer;display:flex;align-items:baseline;gap:8px;background:linear-gradient(135deg,#DC2626,#991B1B);border-radius:999px;padding:6px 16px;">
<span id="kpi-cartera-vencidos-num" style="font-size:18px;font-weight:700;color:#fff">0</span>
<span style="font-size:12px;color:#fecaca">🔴 Canceladas</span>
</div>
<div id="kpi-cartera-porcobrar" onclick="window.filtrarCarteraPorKPI('VENCE_HOY')" title="Ver las que vencen hoy" style="cursor:pointer;display:flex;align-items:baseline;gap:8px;background:linear-gradient(135deg,#F59E0B,#B45309);border-radius:999px;padding:6px 16px;">
<span id="kpi-cartera-porcobrar-num" style="font-size:18px;font-weight:700;color:#fff">0</span>
<span style="font-size:12px;color:#fde68a">🟠 Vencen el día actual</span>
</div>
<div id="kpi-cartera-total" onclick="window.filtrarCarteraPorKPI('TODO')" title="Ver todos los clientes" style="cursor:pointer;display:flex;align-items:baseline;gap:8px;background:#1e293b;border:1px solid #334155;border-radius:999px;padding:6px 16px;">
<span id="kpi-cartera-total-num" style="font-size:18px;font-weight:700;color:#fff">0</span>
<span id="kpi-cartera-total-lbl" style="font-size:12px;color:#94a3b8">🔵 Total clientes</span>
</div>
</div>
<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px;">
<button id="btn-pendiente" class="noa-btn noa-tab" style="background:linear-gradient(135deg,#F59E0B,#B45309)">🟡 Pendientes</button>
<button id="btn-pagada" class="noa-btn noa-tab" style="background:linear-gradient(135deg,#10B981,#059669)">🟢 Pagadas</button>
<button id="btn-cancelada" class="noa-btn noa-tab" style="background:linear-gradient(135deg,#DC2626,#991B1B)">🔴 Canceladas</button>
<button id="btn-todo" class="noa-btn noa-tab">📊 Todas</button>
<span style="flex:1"></span>
<button id="btn-nuevo-cliente" class="noa-btn" style="background:linear-gradient(135deg,#10B981,#059669)" onclick="abrirFormularioCliente()">➕ Nuevo</button>
</div>
<div style="margin-bottom:14px"><input id="noa-search" type="text" placeholder="🔍 Buscar cliente o póliza" title="Busca por nombre, cédula, póliza, aseguradora, línea, forma de pago, medio de cobro, email, teléfono, dirección y objeto asegurado" style="width:100%;background:#111827;border:1px solid #334155;border-radius:10px;color:#fff;padding:12px 16px;font-size:14px;box-sizing:border-box"></div>
<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px;">
<select id="filtro-mes-rapido" onchange="window.filtrarPorMesRapido()" style="background:#111827;border:1px solid #334155;border-radius:8px;color:#fff;padding:8px 10px;font-size:13px;cursor:pointer;">
<option value="">📅 Mes...</option>
<option value="1">Enero</option><option value="2">Febrero</option><option value="3">Marzo</option>
<option value="4">Abril</option><option value="5">Mayo</option><option value="6">Junio</option>
<option value="7">Julio</option><option value="8">Agosto</option><option value="9">Septiembre</option>
<option value="10">Octubre</option><option value="11">Noviembre</option><option value="12">Diciembre</option>
</select>
<select id="filtro-anio-rapido" onchange="window.filtrarPorMesRapido()" style="display:none;background:#111827;border:1px solid #334155;border-radius:8px;color:#fff;padding:8px 10px;font-size:13px;cursor:pointer;"></select>
<label style="color:#94A3B8;font-size:13px;white-space:nowrap;">📅 Vence entre:</label>
<input type="date" id="filtro-fecha-desde" style="background:#111827;border:1px solid #334155;border-radius:8px;color:#fff;padding:8px 10px;font-size:13px;cursor:pointer;" onchange="window.filtrarPorFecha()">
<span style="color:#94A3B8;">y</span>
<input type="date" id="filtro-fecha-hasta" style="background:#111827;border:1px solid #334155;border-radius:8px;color:#fff;padding:8px 10px;font-size:13px;cursor:pointer;" onchange="window.filtrarPorFecha()">
<button onclick="window.limpiarFiltroFecha()" style="background:#334155;color:#94A3B8;border:none;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:12px;">✕ Limpiar</button>
<span style="flex:1"></span>
<details class="noa-menu" id="menu-filtros"><summary class="noa-btn" style="background:#334155;box-shadow:none;">⚙️ Filtros ▾</summary><div class="noa-menu-panel">
<button id="btn-crc" class="noa-btn">₡ Colones</button>
<button id="btn-usd" class="noa-btn">$ Dólares</button>
<button id="btn-duplicados" class="noa-btn" style="background:linear-gradient(135deg,#7c2d12,#431407)">⚠️ Duplicados</button>
<button id="btn-dm" class="noa-btn" style="background:linear-gradient(135deg,#F59E0B,#B45309)">🏦 Deducción Mensual</button>
</div></details>
<details class="noa-menu" id="menu-papelera"><summary class="noa-btn" style="background:#334155;box-shadow:none;">📦 Papelera ▾</summary><div class="noa-menu-panel">
<button id="btn-papelera" class="noa-btn" style="background:linear-gradient(135deg,#64748B,#475569)">📦 Ver la Papelera</button>
<button id="btn-papelera-fechas" class="noa-btn" style="background:linear-gradient(135deg,#64748B,#475569)">📅 Mover por rango de fechas</button>
<button id="btn-papelera-lotes" class="noa-btn" style="background:linear-gradient(135deg,#64748B,#475569)">↩️ Restaurar un lote</button>
<button id="btn-archivar-cliente" class="noa-btn" style="background:linear-gradient(135deg,#EF4444,#DC2626)">🗑️ Archivar un cliente por nombre</button>
</div></details>
</div>
<div id="barra-seleccion" style="display:none;align-items:center;gap:8px;flex-wrap:wrap;background:#0F172A;border:1px solid #334155;border-radius:10px;padding:10px 14px;margin-bottom:12px;">
<strong id="barra-seleccion-n" style="color:#fff;font-size:14px;margin-right:6px;">0 seleccionados</strong>
<button id="btn-email-masivo" class="noa-btn" style="background:linear-gradient(135deg,#8b5cf6,#7c3aed)">📧 Email Masivo</button>
<button id="btn-wa-masivo" class="noa-btn" style="background:linear-gradient(135deg,#10b981,#059669)">📱 WhatsApp Masivo</button>
<button id="btn-archivar" class="noa-btn" style="background:linear-gradient(135deg,#EF4444,#DC2626)">🗑️ Archivar</button>
<button id="btn-quitar-seleccion" class="noa-btn" style="background:#334155;box-shadow:none;">✕ Quitar selección</button>
</div>
<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;"><span id="stats" style="color:${NOA.muted};font-size:14px"></span><button id="btn-more-top" class="noa-btn" style="display:none;padding:4px 12px;font-size:12px;box-shadow:none;">↓ Ver 50 más</button><span style="flex:1"></span><span id="btn-vista" role="button" tabindex="0" title="Cambiar de vista" style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;user-select:none;white-space:nowrap;background:#0EA5E9;color:#FFFFFF;box-shadow:0 0 0 2px rgba(14,165,233,.35);"><span style="font-size:18px;line-height:1">👁</span> Vista: Simple ⇄</span></div></div>
<div id="cartera-scroll" style="overflow:auto;max-height:70vh"><table class="noa-table simple"><thead id="thead-cartera"></thead><tbody id="tbody-cartera"></tbody></table></div>
<div style="padding:12px 20px;text-align:center;border-top:1px solid #334155"><button id="btn-more" class="noa-btn" style="display:none">Cargar 50 más</button></div>`;
    container.appendChild(w);
  }
  return w;
}
// FIN_2A

function hdr(){
  const h=host();if(!h)return;
  const thead=h.querySelector('#thead-cartera');if(!thead)return;
  const V=colsVisibles();
  const completa=(VISTA==='completa');
  const ancho=c=>ANCHOS[c.key]||'120px';
  const etiqueta=c=>{
    if(completa)return c.label;
    return c.label;
  };
  // Vista simple: una sola fila de titulos. Vista completa: fila de grupos (24px) y debajo los titulos, pegados sin montarse.
  const ALTO=24;
  const GRP='height:'+ALTO+'px;box-sizing:border-box;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;text-align:center;padding:0;border-bottom:2px solid;';
  const COL='font-size:11px;font-weight:600;padding-top:8px;padding-bottom:8px;white-space:nowrap;border-bottom:1px solid #334155;background:#1E293B;color:#CBD5E1;top:'+(completa?ALTO:0)+'px;';
  const COL_STICKY=COL+'position:sticky;left:0;z-index:10;';
  const grupos={
    contrato:{fondo:'#1E3A5F',color:'#93C5FD',borde:'#3B82F6',titulo:'📋 Contrato'},
    cobro:{fondo:'#064E3B',color:'#6EE7B7',borde:'#10B981',titulo:'💰 Cobro'}
  };
  let row1='';
  if(completa){
    let i=0;
    while(i<V.length){
      const c=V[i];
      if(c.grupo&&grupos[c.grupo]){
        const g=grupos[c.grupo];let cnt=0,j=i;
        while(j<V.length&&V[j].grupo===c.grupo){cnt++;j++;}
        row1+=`<th colspan="${cnt}" style="${GRP}background:${g.fondo};color:${g.color};border-color:${g.borde};border-left:2px solid ${g.borde};border-right:2px solid ${g.borde};">${g.titulo}</th>`;
        i+=cnt;continue;
      }
      row1+=`<th style="${GRP}background:#0F172A;color:#475569;border-color:#1E293B;"></th>`;
      i++;
    }
  }
  const row2=V.map((c,idx)=>{
    const w=ancho(c);
    const st=`min-width:${w};width:${w};`;
    let extra='';
    const ant=V[idx-1],sig=V[idx+1];
    if(completa&&c.grupo&&grupos[c.grupo]){
      const b=grupos[c.grupo].borde;
      if(!ant||ant.grupo!==c.grupo)extra+=`border-left:2px solid ${b};`;
      if(!sig||sig.grupo!==c.grupo)extra+=`border-right:2px solid ${b};`;
    }
    if(c.key==='asegurado_sticky')return `<th class="col-sticky" style="${COL_STICKY}${st}${extra}">${esc(etiqueta(c))}</th>`;
    if(c.key==='select')return `<th style="${COL}${st}${extra}"><input type="checkbox" id="check-todos-cartera" title="Seleccionar todos los visibles" onclick="document.querySelectorAll('.cliente-checkbox').forEach(function(cb){cb.checked=this.checked;}, this);if(window.noaActualizarBarra)window.noaActualizarBarra();"></th>`;
    return `<th style="${COL}${st}${extra}">${esc(etiqueta(c))}</th>`;
  }).join('');
  thead.innerHTML=(completa?'<tr>'+row1+'</tr>':'')+'<tr>'+row2+'</tr>';
  // Titulos que se pueden tocar para ordenar (otro clic: al reves; tercer clic: vuelve al orden normal)
  {const fila=thead.lastElementChild,S=window.NOA_SORT||{};
   if(fila&&fila.children.length===V.length){
     V.forEach((c,i)=>{if(c.key==='select'||c.key==='acciones')return;const th=fila.children[i];
       th.setAttribute('data-orden',c.key);th.title='Ordenar por '+c.label;th.style.cursor='pointer';
       if(S.key===c.key){th.classList.add('noa-activa');th.insertAdjacentHTML('beforeend','<span class="noa-flecha"> '+(S.dir===1?'▲':'▼')+'</span>');}});
   }
   thead.onclick=function(e){const th=e.target.closest('th[data-orden]');if(th)window.noaOrdenar(th.getAttribute('data-orden'));};}
  // Diseño de tabla FIJO: cada columna mide exactamente lo que dice ANCHOS. Simple: ocupa el panel sin correrse. Completa: ancho propio con desplazamiento.
  const tabla=thead.parentElement;
  if(tabla&&tabla.tagName==='TABLE'){
    const vieja=tabla.querySelector('colgroup');if(vieja)vieja.remove();
    const cg=document.createElement('colgroup');
    cg.innerHTML=V.map(c=>'<col style="width:'+ancho(c)+'">').join('');
    tabla.insertBefore(cg,thead);
    const total=V.reduce((s,c)=>s+parseInt(ancho(c)),0);
    if(tabla.style&&typeof tabla.style.setProperty==='function')tabla.style.setProperty('table-layout','fixed','important');
    if(completa){tabla.style.width=total+'px';tabla.style.minWidth='';}
    else{tabla.style.width='100%';tabla.style.minWidth=total+'px';}
  }
}
// FIN_PARTE_2
const buscar=id=>(window.datosReales||[]).find(x=>String(x.id)===String(id))||(window._datosRealesBackup||[]).find(x=>String(x.id)===String(id));

function calcNext(desde,per){
  const parts=desde.split('/');if(parts.length!==3)return desde;
  const d=new Date(parts[2],parts[1]-1,parts[0]);if(isNaN(d.getTime()))return desde;
  const p=norm(per);
  if(p.includes('anual')||p.includes('año'))d.setFullYear(d.getFullYear()+1);
  else if(p.includes('semes'))d.setMonth(d.getMonth()+6);
  else if(p.includes('cuatri'))d.setMonth(d.getMonth()+4);
  else if(p.includes('trimest'))d.setMonth(d.getMonth()+3);
  else if(p.includes('mensual')||p.includes('mes'))d.setMonth(d.getMonth()+1);
  else return desde;
  return pad2(d.getDate())+'/'+pad2(d.getMonth()+1)+'/'+d.getFullYear();
}
function calcPrev(hasta,per){
  const parts=hasta.split('/');if(parts.length!==3)return hasta;
  const d=new Date(parts[2],parts[1]-1,parts[0]);if(isNaN(d.getTime()))return hasta;
  const p=norm(per);
  if(p.includes('anual')||p.includes('año'))d.setFullYear(d.getFullYear()-1);
  else if(p.includes('semes'))d.setMonth(d.getMonth()-6);
  else if(p.includes('cuatri'))d.setMonth(d.getMonth()-4);
  else if(p.includes('trimest'))d.setMonth(d.getMonth()-3);
  else if(p.includes('mensual')||p.includes('mes'))d.setMonth(d.getMonth()-1);
  else return hasta;
  return pad2(d.getDate())+'/'+pad2(d.getMonth()+1)+'/'+d.getFullYear();
}
function calcularDiasMora(hasta,fechaPago){try{const partsHasta=hasta.split('/');const partsPago=fechaPago.split('/');if(partsHasta.length!==3||partsPago.length!==3)return 0;const dateHasta=new Date(partsHasta[2],partsHasta[1]-1,partsHasta[0]);const datePago=new Date(partsPago[2],partsPago[1]-1,partsPago[0]);const diffTime=datePago-dateHasta;const diffDays=Math.floor(diffTime/(1000*60*60*24));return diffDays>0?diffDays:0;}catch(e){return 0;}}

// Fecha limite de pago (DD/MM/YYYY): 9 dias habiles despues de la fecha de cobro. Es la misma regla del estado de pago.
function calcFechaLimite(hasta){
  const E=window.NOA_ESTADO;
  const f=E.parseFecha(hasta);
  if(!f)return '';
  const l=E.limiteGracia(f);
  return l?E.aDDMM(l.iso):'';
}
window.calcFechaLimite = calcFechaLimite;

async function marcarPagado(id){
  const r=buscar(id);if(!r)return;
  const E=window.NOA_ESTADO;
  if(E.estadoDe(r).clave==='pagada'){const otro=window.noaConfirmar?await window.noaConfirmar({titulo:'Ya figura como pagado',mensaje:(r.asegurado||'Este cliente')+' ya figura como PAGADO para este periodo.',aviso:'Si registra otro pago, se suma un periodo más.',ok:'Registrar otro pago',cancelar:'Cancelar'}):confirm('Este cliente ya figura como PAGADO para este periodo.\n\n¿Registrar otro pago de todas formas?');if(!otro)return;}
  const fechaPago=E.aDDMM(E.hoyCR().iso);
  const hastaActual=E.aDDMM(r.hasta);
  if(!hastaActual){alert('Este cliente no tiene fecha de próximo pago.\n\nComplete las fechas (✏️ Editar) antes de registrar el pago.');return;}
  let desdeConvertido=E.aDDMM(r.desde_cobro);
  if(!desdeConvertido)desdeConvertido=calcPrev(hastaActual,r.periodicidad||'mensual');
  // Periodo pagado: desdeConvertido -> hastaActual. Nuevo periodo: hastaActual -> un periodo mas
  const nuevaDesde=hastaActual;
  const nuevaHasta=calcNext(hastaActual,r.periodicidad||'mensual');
  const diasMora=calcularDiasMora(hastaActual,fechaPago);
  {
    const sim=(window.normalizarMoneda?window.normalizarMoneda(r.moneda):r.moneda)==='USD'?'$':'₡';
    const prima=Number(r.prima)||0;
    const montoTxt=sim+prima.toLocaleString('es-CR',{minimumFractionDigits:2,maximumFractionDigits:2});
    const avisos=[];
    if(!prima)avisos.push('La prima está en 0: se registraría un pago de '+montoTxt+'.');
    if(diasMora>0)avisos.push('El pago tiene '+diasMora+' días de mora.');
    avisos.push('Si la forma de pago cambió (ej. de semestral a mensual), cancele y edítela antes, para que el próximo cobro se calcule bien.');
    const filas=[['Cliente',r.asegurado||'—'],['Póliza',r.poliza||'—'],['Monto',montoTxt],['Forma de pago',r.periodicidad||'no definida'],['Periodo que se paga',desdeConvertido+' – '+hastaActual],['Próximo periodo',nuevaDesde+' – '+nuevaHasta]];
    const seguir=window.noaConfirmar?await window.noaConfirmar({titulo:'💰 Confirmar pago',filas:filas,aviso:avisos.join(' '),ok:'Confirmar pago',cancelar:'Cancelar'}):confirm('Marcar como pagado a '+(r.asegurado||'este cliente')+' por '+montoTxt+'?');
    if(!seguir)return;
  }
  if(window.guardarPago){
    const resultPago=await window.guardarPago({cliente_id:r.id,poliza:r.poliza||r.id||'SIN-POLIZA',cliente_nombre:r.asegurado,periodo_desde:desdeConvertido,periodo_hasta:hastaActual,monto_pagado:r.prima,moneda:window.normalizarMoneda(r.moneda),fecha_pago:fechaPago,dias_mora:diasMora,metodo_pago:'manual'});
    if(!resultPago||!resultPago.success){alert('⚠️ Error guardando pago: '+((resultPago&&resultPago.error)||'sin detalle'));return;}
  }
  E.registrarPago(r.id,hastaActual);
  r._pagado=false;r._fecha_pago=fechaPago;
  const _filtroAntes=FILTER,_backupAntes=window._datosRealesBackup,_datosAntes=window.datosReales;
  if(window.actualizarClienteSupabase){await window.actualizarClienteSupabase(r.id,{pagado:false,hasta:nuevaHasta,desde_cobro:nuevaDesde});}
  r.desde_cobro=nuevaDesde;r.hasta=nuevaHasta;
  window.datosReales=_datosAntes;window._datosRealesBackup=_backupAntes;FILTER=_filtroAntes;
  render();
  if(typeof window.actualizarSemaforo==='function')window.actualizarSemaforo();
  if(typeof window.actualizarTodosLosIndicadores==='function')window.actualizarTodosLosIndicadores();
  alert('✅ Pago registrado\n\nPeriodo pagado: '+desdeConvertido+' - '+hastaActual+'\nNuevo periodo: '+nuevaDesde+' - '+nuevaHasta+(diasMora>0?'\n⚠️ Mora: '+diasMora+' días':''));
}

async function enviarEmailMasivo(){
  const cbs=document.querySelectorAll(".cliente-checkbox:checked");
  if(cbs.length===0){alert("Selecciona al menos un cliente");return;}
  const sel=Array.from(cbs).map(cb=>buscar(cb.dataset.id)).filter(r=>r&&r.correo);
  if(sel.length===0){alert("Los clientes seleccionados no tienen email");return;}
  window.abrirPanelEnvios(sel,"email","Aviso de vencimiento de póliza (mensaje automático por cliente)");
}
async function enviarWAMasivo(){
  const cbs=document.querySelectorAll(".cliente-checkbox:checked");
  if(cbs.length===0){alert("Selecciona al menos un cliente");return;}
  const sel=Array.from(cbs).map(cb=>buscar(cb.dataset.id)).filter(r=>r&&r.telefono);
  if(sel.length===0){alert("Los clientes seleccionados no tienen teléfono");return;}
  window.abrirPanelEnvios(sel,"whatsapp","Aviso de vencimiento de póliza (mensaje automático por cliente)");
}

async function enviarWA(id){
  const r=buscar(id);if(!r||!r.telefono){alert("No hay teléfono registrado para este cliente");return;}
  const nombre=r.asegurado||"Cliente";
  const poliza=r.poliza||"";
  const aseguradora=r.aseguradora||"";
  const periodicidad=r.periodicidad||"";
  const marca=r["DETALLE_AUT_INS::Marca"]||r.marca||"";
  const modelo=r["DETALLE_AUT_INS::Modelo"]||r.modelo||"";
  const anio=r["DETALLE_AUT_INS::Año"]||r.anio||"";
  const placa=r.placa||"";
  const objetoBase=r.objeto_asegurado||[marca,modelo].filter(x=>x&&String(x).trim()!=="").join(" ");
  const objetoAsegurado=[objetoBase,anio].filter(x=>x&&String(x).trim()!=="").join(" ");
  const vencimiento=r.desde_cobro?excelDate(r.desde_cobro):"";
  const fechaLimite=calcFechaLimite(vencimiento);
  const montoNum=Number(r.prima||0);
  const monto=montoNum>0?(r.moneda==="USD"?("$"+window.noaPrimaTxt(montoNum)):("₡"+window.noaPrimaTxt(montoNum))):"";
  const lineaVehiculo=objetoAsegurado?("🚗 "+objetoAsegurado+(placa?(" | 🔖 "+placa):"")):(placa?("🔖 Placa: "+placa):"");
  const lineas=[];
  if(aseguradora)lineas.push("🏢 "+aseguradora);
  if(poliza)lineas.push("📋 Póliza: *"+poliza+"*");
  if(lineaVehiculo)lineas.push(lineaVehiculo);
  if(vencimiento)lineas.push("📅 Vence: *"+vencimiento+"*");
  if(periodicidad)lineas.push("💳 Pago: "+periodicidad);
  if(monto)lineas.push("💰 Monto: *"+monto+"*");
  if(fechaLimite)lineas.push("📅 Límite de pago: *"+fechaLimite+"*");
  const mensajeWA="🔔 *Aviso de Vencimiento de Póliza*\n\nEstimado *"+nombre+"*,\n\n"+lineas.join("\n")+"\n\n⚠️ Después del período de gracia de *"+window.NOA_ESTADO.GRACIA_HABILES+" días hábiles*, la póliza quedará inactiva y sin cobertura.";
  window.mostrarModalMensaje("Mensaje para "+nombre,((window.noaMachote&&window.noaMachote(r))||{texto:mensajeWA,wa:mensajeWA}).wa,async function(msg){
    const tel=String(r.telefono).replace(/\D/g,"");
    const telCR=(tel.startsWith("506")?tel:"506"+tel);
    const telE164="+"+telCR;
    const apiKey=localStorage.getItem("wasender_api_key")||"";
    if(apiKey){
      try{
        const res=await fetch("https://www.wasenderapi.com/api/send-message",{method:"POST",headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json"},body:JSON.stringify({to:telE164,text:msg})});
        if(res.ok){alert("✅ Mensaje enviado por WhatsApp a "+nombre);if(window.guardarEnvio)window.guardarEnvio(r.id,r.asegurado,1,"whatsapp",msg,"manual");}
        else{alert("❌ Error al enviar: "+res.status);}
      }catch(e){alert("❌ Error de conexión: "+e.message);}
    }else{alert("⚠️ WhatsApp no configurado.\nAndá a Configuración y guardá tu API Key de Wasender.");}
  });
}
const EMAIL_EN_CURSO={};
async function enviarEmail(id){
  // Un solo envio a la vez por cliente: evita el correo doble si se da clic dos veces mientras sale
  const k=String(id);
  if(EMAIL_EN_CURSO[k])return;
  EMAIL_EN_CURSO[k]=true;
  try{await enviarEmailUno(id);}finally{setTimeout(()=>{EMAIL_EN_CURSO[k]=false;},4000);}
}
async function enviarEmailUno(id){const r=buscar(id);if(!r||!r.correo){alert("No hay email");return;}const nombre=r.asegurado||"Cliente";const email=r.correo;const poliza=r.poliza||"N/A";const monto=r.moneda==='USD'?'$'+window.noaPrimaTxt(r.prima||0):'₡'+window.noaPrimaTxt(r.prima||0);const vencimiento=excelDate(r.desde_cobro)||"N/A";const aseguradora=r.aseguradora||"N/A";const periodicidad=r.periodicidad||"N/A";const placa=r.placa||"";const marcaV=r['DETALLE_AUT_INS::Marca']||r.marca||"";const modeloV=r['DETALLE_AUT_INS::Modelo']||r.modelo||"";const anioV=r['DETALLE_AUT_INS::Año']||r.anio||"";const objetoAsegurado=[marcaV,modeloV,anioV].filter(x=>x&&String(x).trim()!=='').join(' ')||placa;const fechaLimite=calcFechaLimite(vencimiento)||"N/A";try{const params={to_email:email,nombre:nombre,aseguradora:aseguradora,poliza:poliza,objeto_asegurado:objetoAsegurado,placa:placa,vencimiento:vencimiento,periodicidad:periodicidad,monto:monto,fecha_limite:fechaLimite,asunto:'Recordatorio Vencimiento de Póliza',mensaje:((window.noaMachote&&window.noaMachote(r))||{texto:''}).texto};const res=await emailjs.send(window.EMAILJS_CONFIG.serviceId,window.EMAILJS_CONFIG.templateId,params,window.EMAILJS_CONFIG.publicKey);if(res.status===200){alert("✅ Email enviado a: "+email);if(window.guardarEnvio)window.guardarEnvio(r.id,r.asegurado,1,"email","Aviso de Vencimiento - "+aseguradora+" | Poliza: "+poliza+" | Vence: "+vencimiento+" | Monto: "+monto+" | Limite pago: "+fechaLimite);}else{alert("⚠️ Error al enviar email");}}catch(err){console.error(err);const detalle=(err&&(err.text||err.message||JSON.stringify(err)))||"sin detalle";alert("❌ Error: "+detalle);}}

// Edicion de Prima, Moneda y Medio de cobro directo desde la tabla
window.noaEditarCelda=async function(id,campo,el){
  const r=buscar(id);
  if(!r){alert('Cliente no encontrado');return;}
  let valor=el.value;
  if(campo==='prima'){valor=parseFloat(String(valor).replace(',','.'));if(isNaN(valor)||valor<0)valor=0;}
  const anterior=r[campo];
  if(typeof window.actualizarClienteSupabase!=='function'){alert('No se pudo guardar el cambio');return;}
  el.disabled=true;
  const res=await window.actualizarClienteSupabase(r.id,{[campo]:valor});
  el.disabled=false;
  if(!res||res.success===false){
    alert('⚠️ No se pudo guardar: '+((res&&res.error)||'error desconocido'));
    el.value=(anterior===null||anterior===undefined)?'':anterior;
    return;
  }
  r[campo]=valor;
  el.style.outline='2px solid #10B981';
  setTimeout(function(){el.style.outline='';},900);
  if(campo==='moneda'&&(FILTER==='CRC'||FILTER==='USD'))render();
};
// FIN_PARTE_3
function celdaTxt(v,extra){
  const t=(v===null||v===undefined)?'':String(v);
  return '<td title="'+esc(t)+'" style="font-size:13px;padding:10px 14px;white-space:nowrap;background:#ffffff;color:#1e293b;'+(extra||'')+'"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+esc(t)+'</div></td>';
}
function celdaSel(id,campo,valor,opciones){
  const o=opciones.slice();
  if(valor&&o.indexOf(valor)===-1)o.push(valor);
  return '<td style="padding:6px 8px;background:#ffffff;"><select onchange="window.noaEditarCelda(\''+id+'\',\''+campo+'\',this)" style="width:100%;padding:4px 6px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;background:#fff;color:#1e293b;">'+o.map(x=>'<option value="'+esc(x)+'"'+(x===(valor||'')?' selected':'')+'>'+(x===''?'—':esc(x))+'</option>').join('')+'</select></td>';
}
function renderFila(r){
  const E=window.NOA_ESTADO;
  const id=(r.id===undefined||r.id===null)?'':String(r.id);
  return colsVisibles().map(c=>{
    if(c.key==='select')return '<td><input type="checkbox" class="cliente-checkbox" data-id="'+esc(id)+'" data-email="'+esc(r.correo||'')+'" onchange="window.noaActualizarBarra()"></td>';
    if(c.key==='estado_pago'){const e=E.estadoDe(r);return '<td style="font-size:13px;padding:10px 14px;white-space:nowrap;"><span class="noa-badge '+e.clase+'" title="'+esc(e.detalle)+'" style="font-size:11px;">'+e.texto+'</span></td>';}
    if(c.key==='asegurado_sticky'){
      const n=(r.asegurado||'Sin nombre');
      const esDup=window._POLIZAS_DUPLICADAS&&r.poliza&&window._POLIZAS_DUPLICADAS.has(r.poliza);
      const badgeDup=esDup?'<span title="Poliza duplicada: hay 2 o mas clientes con este mismo numero de poliza. Revisa cual es la correcta." style="display:inline-block;margin-left:6px;padding:1px 6px;border-radius:8px;background:#7c2d12;color:#fed7aa;font-size:10px;font-weight:700;vertical-align:middle;">⚠️ DUPLICADO</span>':'';
      return '<td class="col-sticky" title="'+esc(n)+(esDup?' (póliza duplicada)':'')+'" style="font-size:13px;padding:10px 14px;white-space:nowrap;"><div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+esc(n)+badgeDup+'</div></td>';
    }
    if(c.key==='acciones'){
      const s='font-size:13px;padding:5px 8px;border-radius:6px;cursor:pointer;white-space:nowrap;border:1px solid;margin-right:3px;';
      const btnPagar=r._pagado?'':'<button onclick="marcarPagado(\''+id+'\')" title="💰 Marcar como pagado" style="'+s+'background:#10B981;border-color:#10B981;color:#fff;font-weight:600;">💰 Pagar</button>';
      const nWA=(window.CONTADOR_ENVIOS_WA&&window.CONTADOR_ENVIOS_WA[id])||0;
      const txtWA=nWA>0?' '+nWA:'';
      const btnWA='<button onclick="enviarWA(\''+id+'\')" title="📱 Enviar WhatsApp'+(nWA>0?' (enviado '+nWA+' vez/veces)':'')+'" style="'+s+'background:rgba(16,185,129,.15);border-color:#10B981;color:#059669;">📱'+txtWA+'</button>';
      const btnDet='<button data-id="'+id+'" onclick="window.noaVerCliente(this.dataset.id)" title="Ver los datos del cliente" style="'+s+'background:rgba(139,92,246,.15);border-color:#8B5CF6;color:#6d28d9;">👁 Ver</button>';
      const btnVer='<button onclick="verHistorialPagos(\''+id+'\')" title="Ver los pagos de este cliente" style="'+s+'background:rgba(14,165,233,.15);border-color:#0EA5E9;color:#0369a1;">💰 Pagos</button>';
      const noRenueva=!!r.poliza_no_renueva;
      const btnMas='<button onclick="window.noaMenuFila(\''+id+'\',this)" title="'+(noRenueva?'Más acciones (póliza NO renueva)':'Más acciones: editar, email, carpeta')+'" style="'+s+'background:'+(noRenueva?'rgba(239,68,68,.15)':'transparent')+';border-color:'+(noRenueva?'#EF4444':'#cbd5e1')+';color:'+(noRenueva?'#EF4444':'#475569')+';font-weight:700;">⋯</button>';
      return '<td style="font-size:13px;padding:10px 14px;white-space:nowrap;">'+btnPagar+btnWA+btnDet+btnVer+btnMas+'</td>';
    }
    if(c.key==='prima')return '<td style="padding:6px 8px;background:#ffffff;"><input type="text" inputmode="decimal" data-pid="'+id+'" value="'+esc(window.noaPrimaTxt(r.prima))+'" onfocus="window.noaPrima(this,1)" onchange="window.noaPrima(this,2)" onblur="window.noaPrima(this,3)" onkeydown="if(event.keyCode===13)this.blur()" style="width:100%;box-sizing:border-box;padding:4px 6px!important;border:1px solid #cbd5e1!important;border-radius:6px;font-size:13px!important;height:auto!important;min-height:0!important;line-height:normal!important;background:#fff;color:#1e293b;text-align:right;"></td>';
    if(c.key==='prima'){
      const n=Number(r.prima);
      return '<td style="padding:6px 8px;background:#ffffff;"><input type="number" min="0" step="0.01" value="'+esc(isNaN(n)?0:n)+'" onchange="window.noaEditarCelda(\''+id+'\',\'prima\',this)" style="width:100%;box-sizing:border-box;padding:4px 6px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;background:#fff;color:#1e293b;"></td>';
    }
    if(c.key==='moneda')return celdaSel(id,'moneda',r.moneda||'CRC',['CRC','USD']);
    if(c.key==='medio_cobro')return celdaSel(id,'medio_cobro',(r.medio_cobro==='Tarjeta Autorizada'?'Deducción Mensual':(r.medio_cobro||'')),['','Cargo Automático','Deducción Mensual']); /*NOA_SIN_OFICINA*/
    if(c.key==='aseguradora')return celdaSel(id,'aseguradora',String(r.aseguradora||'').replace('INSTITUTO NACIONAL DE SEGUROS','INS').replace('Instituto Nacional de Seguros','INS'),['','INS','MAPFRE','ASSA','QUALITAS','MNK','LAFISE','OCEANICA','BMI']);
    let v=r[c.key];
    if(c.key==='desde'||c.key==='hasta'||c.key==='vence_contrato'||c.key==='desde_cobro')v=excelDate(v||'');
    else if(c.key==='fecha_limite'){
      const L=E.limiteDe(r,E.parseFecha(r.desde_cobro));
      v=L?E.aDDMM(L.iso):'';
    }
    else if(c.key==='objeto_asegurado'){
      v=r.objeto_asegurado||[r['DETALLE_AUT_INS::Marca']||r.marca||'',r['DETALLE_AUT_INS::Modelo']||r.modelo||''].filter(x=>x&&String(x).trim()!=='').join(' ');
    }
    else if(c.key==='planillas'){v=r.planillas?'Sí':'';}
    else if(c.key==='correo'){const emails=String(v||'').split(',');v=emails[0].trim()+(emails.length>1?' +'+(emails.length-1):'');}
    else if(c.key==='aseguradora'){v=String(v||'').replace('INSTITUTO NACIONAL DE SEGUROS','INS').replace('Instituto Nacional de Seguros','INS');}
    if(c.key==='identificacion')return celdaTxt(v,'text-align:center;');
    return celdaTxt(v);
  }).join('');
}

// ===== Menu de cada fila (⋯): se abre fuera de la tabla para que no lo recorte =====
let MENU_CIERRE=null;
window.noaCerrarMenuFila=function(){
  const m=document.getElementById('noa-menu-fila');
  if(m&&typeof m.remove==='function')m.remove();
  if(MENU_CIERRE){if(typeof document.removeEventListener==='function')document.removeEventListener('click',MENU_CIERRE);MENU_CIERRE=null;}
};
window.noaMenuFila=function(id,btn){
  window.noaCerrarMenuFila();
  const r=buscar(id);
  const rc=(btn&&typeof btn.getBoundingClientRect==='function')?btn.getBoundingClientRect():{left:20,bottom:60};
  const iw=(typeof window.innerWidth==='number')?window.innerWidth:1200;
  const m=document.createElement('div');
  m.id='noa-menu-fila';
  m.style.cssText='position:fixed;z-index:9000;left:'+Math.max(8,Math.min(rc.left,iw-200))+'px;top:'+(rc.bottom+4)+'px;background:#111827;border:1px solid #334155;border-radius:12px;padding:8px;display:flex;flex-direction:column;gap:6px;min-width:170px;box-shadow:0 12px 30px rgba(0,0,0,.5);';
  const item=(txt,fn)=>'<button class="noa-btn" style="text-align:left;padding:8px 14px;font-size:13px;background:#1F2937;box-shadow:none;" onclick="window.noaCerrarMenuFila();'+fn+'">'+txt+'</button>';
  m.innerHTML=item('✏️ Editar',"editarCliente('"+esc(id)+"')")+item('📧 Enviar email',"enviarEmail('"+esc(id)+"')")+item('📁 Carpeta'+(r&&r.poliza_no_renueva?' 🚫':''),"window.abrirExpedienteCliente('"+esc(id)+"')");
  if(document.body&&typeof document.body.appendChild==='function')document.body.appendChild(m);
  // Si no cabe hacia abajo, el menu se abre hacia arriba (o se acomoda dentro de la pantalla) para que nunca quede cortado
  const ih=(typeof window.innerHeight==='number')?window.innerHeight:800,mh=m.offsetHeight||0;
  if(mh&&rc.bottom+4+mh>ih-8){
    const arriba=(typeof rc.top==='number'?rc.top:rc.bottom-30)-mh-4;
    m.style.top=(arriba>=8?arriba:Math.max(8,ih-mh-8))+'px';
  }
  if(typeof document.addEventListener==='function')document.addEventListener('scroll',window.noaCerrarMenuFila,{capture:true,once:true});
  setTimeout(function(){
    MENU_CIERRE=function(){window.noaCerrarMenuFila();};
    if(typeof document.addEventListener==='function')document.addEventListener('click',MENU_CIERRE);
  },0);
};

// Barra de acciones que aparece solo cuando hay clientes marcados
window.noaActualizarBarra=function(){
  const marcados=document.querySelectorAll('.cliente-checkbox:checked');
  const n=marcados?marcados.length:0;
  const b=document.getElementById('barra-seleccion');
  if(b&&b.style)b.style.display=n>0?'flex':'none';
  const t=document.getElementById('barra-seleccion-n');
  if(t)t.textContent=n+(n===1?' seleccionado':' seleccionados');
};
window.noaQuitarSeleccion=function(){
  document.querySelectorAll('.cliente-checkbox').forEach(function(cb){cb.checked=false;});
  const todos=document.getElementById('check-todos-cartera');if(todos)todos.checked=false;
  window.noaActualizarBarra();
};
// Alterna entre la vista simple y la completa; siempre vuelve al inicio de la tabla
window.noaCambiarVista=function(){
  VISTA=(VISTA==='simple')?'completa':'simple';
  irAlInicio();
  render();
};

// ===== Papelera por fechas: cuenta primero, pide confirmacion, mueve todo en una operacion y deja un lote para restaurar =====
async function userId(){const u=(typeof getUserNOA==='function')?await getUserNOA():null;return u?u.id:null;}
async function pedirJSON(url,opciones){
  const resp=await fetch(url,opciones);
  let datos=null;try{datos=await resp.json();}catch(e){datos=null;}
  if(!resp.ok||!datos||datos.success===false)throw new Error((datos&&datos.error)||('Error '+resp.status));
  return datos;
}
function fechaTecleada(txt){
  const f=window.NOA_ESTADO.parseFecha(String(txt||'').trim());
  return f?f.iso:null;
}
window.papeleraPorFechas=async function(){
  try{
    const uid=await userId();if(!uid){alert('No se pudo identificar al usuario');return;}
    const d1=prompt('📅 PAPELERA POR FECHAS\n\nSe mueven a la Papelera los clientes cuya fecha de cobro cae en un rango. No se borra nada: se pueden devolver.\n\nFecha DESDE (DD/MM/AAAA):');
    if(d1===null)return;
    const d2=prompt('Fecha HASTA (DD/MM/AAAA):');
    if(d2===null)return;
    const desde=fechaTecleada(d1),hasta=fechaTecleada(d2);
    if(!desde||!hasta||desde>hasta){alert('Las fechas no son válidas. Use el formato DD/MM/AAAA y que DESDE no sea mayor que HASTA.');return;}
    const c=await pedirJSON('/api/clientes?action=papelera-contar&user_id='+encodeURIComponent(uid)+'&desde='+desde+'&hasta='+hasta);
    if(c.cantidad===0){alert('No hay clientes con fecha de cobro entre '+window.NOA_ESTADO.aDDMM(desde)+' y '+window.NOA_ESTADO.aDDMM(hasta)+'.\n\nNo se movió nada.');return;}
    if(!confirm('Se van a mover a la Papelera '+c.cantidad+' cliente(s) con fecha de cobro entre '+window.NOA_ESTADO.aDDMM(desde)+' y '+window.NOA_ESTADO.aDDMM(hasta)+'.\n\nNo se borra nada: después se pueden devolver todos juntos con "Restaurar un lote".\n\n¿Continuar?'))return;
    const m=await pedirJSON('/api/clientes?action=papelera-rango',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:uid,desde:desde,hasta:hasta})});
    if(typeof window.cargarDatos==='function')await window.cargarDatos();
    alert('✅ Se movieron '+m.movidos+' cliente(s) a la Papelera.\n\nSi fue un error, entre a Papelera > "Restaurar un lote".');
  }catch(e){alert('⚠️ No se pudo completar: '+e.message);}
};
window.papeleraLotes=async function(){
  try{
    const uid=await userId();if(!uid)return;
    const r=await pedirJSON('/api/clientes?action=papelera-lotes&user_id='+encodeURIComponent(uid));
    const lotes=r.lotes||[];
    if(lotes.length===0){alert('La Papelera está vacía.');return;}
    const E=window.NOA_ESTADO;
    const texto=lotes.map((l,i)=>(i+1)+') '+(l.lote==='SIN_LOTE'?'Archivados uno a uno':'Lote del '+String(l.fecha).slice(0,10))+' — '+l.cantidad+' cliente(s)'+(l.desde?' (cobros del '+E.aDDMM(l.desde)+' al '+E.aDDMM(l.hasta)+')':'')).join('\n');
    const n=prompt('📦 LOTES EN LA PAPELERA\n\n'+texto+'\n\nEscriba el NÚMERO del lote que quiere RESTAURAR (o cancele):');
    if(n===null||String(n).trim()==='')return;
    const lote=lotes[parseInt(n,10)-1];
    if(!lote){alert('Número no válido.');return;}
    if(!confirm('¿Restaurar los '+lote.cantidad+' cliente(s) de este lote?'))return;
    const m=await pedirJSON('/api/clientes?action=papelera-restaurar-lote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:uid,lote:lote.lote})});
    if(typeof window.cargarDatos==='function')await window.cargarDatos();
    alert('✅ Se restauraron '+m.restaurados+' cliente(s).');
  }catch(e){alert('⚠️ No se pudo completar: '+e.message);}
};
// Menu antiguo de la Papelera por fechas (se conserva por si algun otro archivo lo llama)
window.papeleraMenu=function(){
  const op=prompt('📅 PAPELERA POR FECHAS\n\n1) Mover clientes a la Papelera por rango de fechas\n2) Restaurar un lote de la Papelera\n\nEscriba 1 o 2:');
  if(op===null)return;
  const o=String(op).trim();
  if(o==='1')return window.papeleraPorFechas();
  if(o==='2')return window.papeleraLotes();
  alert('Escriba 1 o 2.');
};
// FIN_PARTE_4
// ===== Linea de estado de la tabla y filtros por fecha =====
let STATS_BASE='';
function textoEstado(){
  return STATS_BASE+(window.NOA_FILTRO_FECHA_TEXTO?' | '+window.NOA_FILTRO_FECHA_TEXTO:'')+(window.NOA_AVISO_FECHA?' | '+window.NOA_AVISO_FECHA:'');
}
function limpiarEstadoFecha(){
  window.NOA_FILTRO_FECHA_TEXTO='';window.NOA_AVISO_FECHA='';
  ['filtro-mes-rapido','filtro-fecha-desde','filtro-fecha-hasta'].forEach(function(id){
    const e=document.getElementById(id);
    if(e){e.value='';if(e.style)e.style.outline='';}
  });
}
window.limpiarEstadoFecha=limpiarEstadoFecha;
// Lista de anios que existen en los datos; por defecto el anio actual (o "Todos los años" si no hay datos de ese anio)
function poblarAnios(sa){
  if(!sa)return;
  const E=window.NOA_ESTADO;
  const base=window._datosRealesBackup||window.datosReales||[];
  const set={};
  base.forEach(r=>{const f=E.parseFecha(r.desde_cobro);if(f)set[f.y]=true;});
  const anios=Object.keys(set).map(Number).sort((a,b)=>a-b);
  const firma=anios.join(',');
  if(sa._firmaAnios===firma)return;
  const previo=String(sa.value||'');
  sa.innerHTML='<option value="todos">Todos los años</option>'+anios.map(y=>'<option value="'+y+'">'+y+'</option>').join('');
  sa._firmaAnios=firma;
  const hoy=E.hoyCR().y;
  let elegido='todos';
  if(previo&&(previo==='todos'||set[previo]))elegido=previo;
  else if(set[hoy])elegido=String(hoy);
  sa.value=elegido;
}
// Cierra los menus desplegables (Filtros y Papelera) despues de elegir una opcion
function cerrarMenus(){
  const ms=document.querySelectorAll('details.noa-menu');
  if(ms&&ms.forEach)ms.forEach(function(m){if(m&&m.removeAttribute)m.removeAttribute('open');});
}

// Los menus (Filtros y Papelera) se abren flotando sobre la pagina para que ninguna caja los recorte,
// solo uno a la vez, y se cierran al hacer click fuera o al desplazarse.
function armarMenus(){
  const ms=document.querySelectorAll('details.noa-menu');
  if(ms&&ms.forEach)ms.forEach(function(m){
    m.ontoggle=function(){
      if(!m.open)return;
      ms.forEach(function(o){if(o!==m&&o.removeAttribute)o.removeAttribute('open');});
      const s=m.querySelector?m.querySelector('summary'):null,p=m.querySelector?m.querySelector('.noa-menu-panel'):null;
      if(!s||!p||!s.getBoundingClientRect)return;
      const r=s.getBoundingClientRect();
      const iw=(typeof window.innerWidth==='number')?window.innerWidth:1200;
      p.style.position='fixed';
      p.style.left=Math.max(8,Math.min(r.left,iw-260))+'px';
      p.style.top=(r.bottom+6)+'px';
    };
  });
  if(!window.__noaMenusCierre&&typeof document.addEventListener==='function'){
    window.__noaMenusCierre=true;
    document.addEventListener('click',function(e){
      const t=e&&e.target;
      if(t&&typeof t.closest==='function'&&t.closest('details.noa-menu'))return;
      cerrarMenus();
    });
    if(typeof window.addEventListener==='function')window.addEventListener('scroll',cerrarMenus,true);
  }
}
// FIN_5A1

// ===== Imprimir: la lista que se ve ahora (con la pestaña, el mes o las fechas, la busqueda y el color del semaforo aplicados) =====
// Imprime TODAS las filas de esa lista (no solo las 50 que estan cargadas en pantalla), en hoja horizontal,
// con los titulos repetidos en cada pagina. El Monto aparece solo si algun cliente de la lista tiene prima.
const sinEmoji=t=>String(t==null?'':t).replace(/\p{Extended_Pictographic}\uFE0F?\s*/gu,'').trim();
function descripcionLista(){
  const partes=[];
  const f=FILTROS_VIEJOS[FILTER]||FILTER;
  partes.push(sinEmoji(NOMBRES_FILTRO[f]||'Todos'));
  if(SEM&&SEM_INFO[SEM])partes.push(sinEmoji(SEM_INFO[SEM].txt));
  if(window.NOA_FILTRO_FECHA_TEXTO)partes.push(sinEmoji(window.NOA_FILTRO_FECHA_TEXTO));
  if(SEARCH_TERM)partes.push('Búsqueda: "'+SEARCH_TERM+'"');
  return partes.join(' · ');
}
function textoEstadoImp(r){
  const k=window.NOA_ESTADO.estadoDe(r).clave;
  return {pendiente:'Pendiente',pagada:'Pagada',cancelada:'Cancelada',aun:'Aún no',sin_fecha:'Sin fecha'}[k]||'';
}
function ahoraCR(){
  const E=window.NOA_ESTADO;
  let hora='';
  try{hora=new Intl.DateTimeFormat('es-CR',{timeZone:'America/Costa_Rica',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());}catch(e){hora='';}
  return E.aDDMM(E.hoyCR().iso)+(hora?' '+hora:'');
}
function htmlImpresion(lista){
  const montoTxt=r=>{
    const n=Number(r.prima)||0;
    if(n<=0)return '';
    const m=norm(r.moneda);
    return ((m.indexOf('usd')!==-1||m.indexOf('dolar')!==-1)?'$':'₡')+window.noaPrimaTxt(n);
  };
  const simb=r=>{const m=norm(r.moneda);return (m.indexOf('usd')!==-1||m.indexOf('dolar')!==-1)?'USD':'CRC';};
  const primaImp=r=>{const v=Number(r.prima)||0;return v>0?window.noaPrimaTxt(v):'';};
  const f=(k,fn,n)=>[k,fn,n||''];
  const VAL={
    estado_pago:f('estado_pago',textoEstadoImp),
    asegurado_sticky:f('asegurado_sticky',r=>r.asegurado||'Sin nombre'),
    identificacion:f('identificacion',r=>r.identificacion||'','n'),
    poliza:f('poliza',r=>r.poliza||'','n'),
    acreedor:f('acreedor',r=>r.acreedor||''),
    planillas:f('planillas',r=>r.planillas?'Sí':''),
    aseguradora:f('aseguradora',r=>String(r.aseguradora||'').replace(/instituto nacional de seguros/i,'INS')),
    tipo_seguro:f('tipo_seguro',r=>r.tipo_seguro||''),
    objeto_asegurado:f('objeto_asegurado',r=>r.objeto_asegurado||[r['DETALLE_AUT_INS::Marca']||r.marca||'',r['DETALLE_AUT_INS::Modelo']||r.modelo||''].filter(x=>x&&String(x).trim()!=='').join(' ')),
    anio:f('anio',r=>r['DETALLE_AUT_INS::Año']||r.anio||'','n'),
    placa:f('placa',r=>r.placa||'','n'),
    desde_cobro:f('desde_cobro',r=>excelDate(r.desde_cobro||''),'n'),
    hasta:f('hasta',r=>excelDate(r.hasta||''),'n'),
    periodicidad:f('periodicidad',r=>r.periodicidad||''),
    medio_cobro:f('medio_cobro',r=>(r.medio_cobro==='Tarjeta Autorizada'?'Deducción Mensual':(r.medio_cobro||''))),
    fecha_limite:f('fecha_limite',r=>{const E=window.NOA_ESTADO;const L=E.limiteDe(r,E.parseFecha(r.desde_cobro));return L?E.aDDMM(L.iso):'';},'n'),
    prima:f('prima',primaImp,'n'),
    moneda:f('moneda',simb),
    telefono:f('telefono',r=>r.telefono||'','n'),
    telefonos_extra:f('telefonos_extra',r=>r.telefonos_extra||''),
    correo:f('correo',r=>r.correo||''),
    correos_extra:f('correos_extra',r=>r.correos_extra||''),
    direccion:f('direccion',r=>r.direccion||''),
    desde:f('desde',r=>excelDate(r.desde||''),'n'),
    vence_contrato:f('vence_contrato',r=>excelDate(r.vence_contrato||''),'n')
  };
  const cols=colsVisibles().filter(c=>c.key!=='select'&&c.key!=='acciones'&&VAL[c.key]).map(c=>[c.label,VAL[c.key][1],VAL[c.key][2],c.key]);window.__noaImpCols=cols;
  const px=(VISTA==='completa')?7:8;
  const css='@page{size:landscape;margin:12mm}*{box-sizing:border-box}'+
    'body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0}'+
    'h1{font-size:17px;margin:0 0 4px}.meta{font-size:11px;color:#444;margin:0 0 10px}'+
    'table{width:100%;border-collapse:collapse;font-size:'+px+'px}thead{display:table-header-group}'+
    'th{background:#e5e7eb;text-align:left;padding:3px 4px;border:1px solid #9ca3af;font-size:'+px+'px}'+
    'td{padding:2px 4px;border:1px solid #d1d5db;vertical-align:top}tr{page-break-inside:avoid}'+
    'tbody tr:nth-child(even) td{background:#f3f4f6}.n{white-space:nowrap}.c{text-align:center}';
  const head='<th class="c">#</th>'+cols.map(c=>'<th>'+esc(c[0])+'</th>').join('');
  const body=lista.map((r,i)=>'<tr><td class="c">'+(i+1)+'</td>'+cols.map(c=>'<td'+(c[2]?' class="'+c[2]+'"':'')+'>'+esc(c[1](r))+'</td>').join('')+'</tr>').join('');
  return '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Cartera NOA</title><style>'+css+'</style></head><body>'+
    '<h1>Cartera NOA</h1><p class="meta">Vista '+(VISTA==='completa'?'completa':'simple')+' · '+esc(descripcionLista())+' · '+lista.length+(lista.length===1?' cliente':' clientes')+' · Impreso el '+esc(ahoraCR())+'</p>'+
    '<table><thead><tr>'+head+'</tr></thead><tbody>'+body+'</tbody></table></body></html>';
}
/*NOA_EXCEL_CARTERA*/
// Descargar en Excel la misma lista que se ve (mismo filtro, mismas columnas que Imprimir). El PDF sale de Imprimir: en la ventana elegir Guardar como PDF.
window.noaExcelCartera=function(){
  try{
    const lista=aplicarSemaforo(getFiltered());
    if(lista.length===0){alert('No hay clientes en esta lista para descargar.\n\nCambie el filtro y vuelva a intentar.');return;}
    htmlImpresion(lista);
    const cols=window.__noaImpCols||[];
    if(!cols.length){alert('No se pudo preparar el Excel.');return;}
    if(typeof XLSX==='undefined'){alert('No se pudo cargar el generador de Excel. Revise la conexión e intente de nuevo.');return;}
    const filas=lista.map((r,i)=>[i+1].concat(cols.map(c=>c[3]==='prima'?(Number(r.prima)||''):c[1](r))));
    const aoa=[['#'].concat(cols.map(c=>c[0]))].concat(filas);
    const ws=XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols']=aoa[0].map((_,i)=>({wch:Math.min(40,Math.max(8,...aoa.slice(0,200).map(r=>String(r[i]==null?'':r[i]).length)))}));
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'Cartera');
    const info=XLSX.utils.aoa_to_sheet([['Cartera NOA'],['Vista',VISTA==='completa'?'Completa':'Simple'],['Lista',descripcionLista()],['Clientes',lista.length],['Descargado el',ahoraCR()]]);
    XLSX.utils.book_append_sheet(wb,info,'Filtro');
    const nombre='Cartera_NOA_'+window.NOA_ESTADO.hoyCR().iso+'.xlsx';
    window.__noaUltimoExcel={nombre:nombre,filas:filas.length,columnas:aoa[0].length,lista:descripcionLista()};
    XLSX.writeFile(wb,nombre);
  }catch(e){
    console.error(e);
    alert('No se pudo preparar el Excel: '+(e&&e.message?e.message:e));
  }
};
window.noaImprimirCartera=function(){
  try{
    const lista=aplicarSemaforo(getFiltered());
    if(lista.length===0){alert('No hay clientes en esta lista para imprimir.\n\nCambie el filtro y vuelva a intentar.');return;}
    if(lista.length>300&&!confirm('Se van a imprimir '+lista.length+' clientes (unas '+Math.ceil(lista.length/32)+' páginas).\n\nSi quiere menos, antes elija una pestaña, un mes o un rango de fechas.\n\n¿Imprimir todos?'))return;
    const html=htmlImpresion(lista);
    const viejo=document.getElementById('noa-print-frame');
    if(viejo&&typeof viejo.remove==='function')viejo.remove();
    const f=document.createElement('iframe');
    f.id='noa-print-frame';
    f.setAttribute('title','Impresión de la cartera');
    f.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(f);
    const w=f.contentWindow,d=w.document;
    d.open();d.write(html);d.close();
    setTimeout(function(){
      try{w.focus();w.print();}
      catch(e){alert('No se pudo abrir la impresión: '+(e&&e.message?e.message:e));}
    },350);
  }catch(e){
    console.error(e);
    alert('No se pudo preparar la impresión: '+(e&&e.message?e.message:e));
  }
};

function render(){requestAnimationFrame(()=>{
  const h=host();if(!h)return;
  const tb=h.querySelector('#tbody-cartera');if(!tb)return;
  tb.innerHTML='';
  // La vista simple compacta la tabla (letra y espacios mas chicos); la completa conserva su tamaño normal
  const tabla=tb.parentElement;
  if(tabla&&tabla.classList&&typeof tabla.classList.toggle==='function')tabla.classList.toggle('simple',VISTA==='simple');
  hdr();armarMenus();
  if(window.NOA_FILTRO_FECHA_TEXTO&&window.datosReales!==window.NOA_FILTRO_FECHA_REF)limpiarEstadoFecha();
  const sa=h.querySelector('#filtro-anio-rapido');
  poblarAnios(sa);
  const selMes=h.querySelector('#filtro-mes-rapido');
  if(sa&&sa.style)sa.style.display=(selMes&&selMes.value)?'':'none';
  // Polizas duplicadas (mismo numero en 2+ clientes) para mostrar aviso por fila
  const _polizaCount={};(window.datosReales||[]).forEach(c=>{if(c.poliza)_polizaCount[c.poliza]=(_polizaCount[c.poliza]||0)+1;});
  window._POLIZAS_DUPLICADAS=new Set(Object.keys(_polizaCount).filter(p=>_polizaCount[p]>1));
  const filt=aplicarSemaforo(getFiltered());const shown=window.CARTERA_SHOWN||SZ;
  const toShow=filt.slice(0,Math.min(shown,filt.length));
  toShow.forEach(r=>{tb.insertAdjacentHTML('beforeend','<tr>'+renderFila(r)+'</tr>');});
  const s=h.querySelector('#stats');
  STATS_BASE='Mostrando '+toShow.length+' de '+filt.length+' | Filtro: '+(NOMBRES_FILTRO[FILTROS_VIEJOS[FILTER]||FILTER]||'Todos')+((SEM&&SEM_INFO[SEM])?' · '+SEM_INFO[SEM].txt:'');
  if(s)s.textContent=textoEstado();
  // "Ver mas" arriba (junto a la linea de estado) y abajo
  const quedan=filt.length-toShow.length;
  const bm=h.querySelector('#btn-more'),bt=h.querySelector('#btn-more-top');
  if(bm){if(quedan>0){bm.style.display='inline-block';bm.textContent='↓ Cargar 50 más (quedan '+quedan+')';}else{bm.style.display='none';}}
  if(bt){if(quedan>0){bt.style.display='inline-block';bt.textContent='↓ Cargar 50 más (quedan '+quedan+')';}else{bt.style.display='none';}}
  // La tabla vuelve al inicio (izquierda y arriba) cuando se cambia un filtro
  const sc=h.querySelector('#cartera-scroll');
  if(RESET&&sc){sc.scrollLeft=0;sc.scrollTop=0;}
  RESET=false;
  // Pestaña activa: la del filtro; un color del semaforo marca la pestaña a la que pertenece
  const fa=(SEM&&SEM_INFO[SEM])?SEM_INFO[SEM].padre:(FILTROS_VIEJOS[FILTER]||FILTER);
  const padre=(fa==='VENCE_HOY')?'PENDIENTE':fa;
  const act=(id,on)=>{const b=h.querySelector('#'+id);if(b&&b.classList&&typeof b.classList.toggle==='function')b.classList.toggle('activo',!!on);};
  act('btn-pendiente',padre==='PENDIENTE');act('btn-pagada',padre==='PAGADA');act('btn-cancelada',padre==='CANCELADA');act('btn-todo',padre==='TODO');
  const ir=(id,fn)=>{const b=h.querySelector('#'+id);if(b)b.onclick=fn;};
  const aplicar=(valor,restaurar)=>()=>{
    cerrarMenus();
    if(restaurar&&window._datosRealesBackup){window.datosReales=window._datosRealesBackup;window._datosRealesBackup=null;limpiarEstadoFecha();}
    FILTER=valor;SEM=null;window.CARTERA_SHOWN=SZ;irAlInicio();render();
  };
  ir('btn-todo',aplicar('TODO',true));
  ir('btn-crc',aplicar('CRC'));
  ir('btn-usd',aplicar('USD'));
  ir('btn-pendiente',aplicar('PENDIENTE'));
  ir('btn-pagada',aplicar('PAGADA'));
  ir('btn-cancelada',aplicar('CANCELADA'));
  ir('btn-duplicados',aplicar('DUPLICADOS'));
  ir('btn-dm',aplicar('DM'));
  // Tarjetas de arriba: mismas reglas de estado; Deduccion Mensual aparte, el total las incluye
  const E=window.NOA_ESTADO;
  const base=window._datosRealesBackup||window.datosReales||[];
  let canc=0,hoyN=0,dm=0;
  base.forEach(r=>{
    if(esDM(r)){dm++;return;}
    const e=E.estadoDe(r);
    if(e.clave==='cancelada')canc++;
    else if(e.clave==='pendiente'&&e.dias===0)hoyN++;
  });
  const elV=h.querySelector('#kpi-cartera-vencidos-num');if(elV)elV.textContent=canc;
  const elP=h.querySelector('#kpi-cartera-porcobrar-num');if(elP)elP.textContent=hoyN;
  const elT=h.querySelector('#kpi-cartera-total-num');if(elT)elT.textContent=base.length;
  const elL=h.querySelector('#kpi-cartera-total-lbl');if(elL)elL.textContent='🔵 Total clientes';
  // Cantidades en cada pestaña (de lo que esta cargado ahora, sin Deduccion Mensual)
  const actual=(window.datosReales||[]).filter(r=>!esDM(r));
  let cPend=0,cPag=0,cCanc=0;
  actual.forEach(r=>{const k=E.estadoDe(r).clave;if(k==='pendiente')cPend++;else if(k==='pagada')cPag++;else if(k==='cancelada')cCanc++;});
  const rotular=(id,txt)=>{const b=h.querySelector('#'+id);if(b)b.textContent=txt;};
  rotular('btn-pendiente','🟡 Pendientes ('+cPend+')');
  rotular('btn-pagada','🟢 Pagadas ('+cPag+')');
  rotular('btn-cancelada','🔴 Canceladas ('+cCanc+')');
  rotular('btn-todo','📊 Todas ('+actual.length+')');
  ir('btn-email-masivo',()=>enviarEmailMasivo());
  ir('btn-wa-masivo',()=>enviarWAMasivo());
  const mas=()=>{window.CARTERA_SHOWN=(window.CARTERA_SHOWN||SZ)+SZ;render();};
  if(bm)bm.onclick=mas;
  if(bt)bt.onclick=mas;
  ir('btn-papelera',()=>{cerrarMenus();window.abrirPapelera();});
  ir('btn-papelera-fechas',()=>{cerrarMenus();window.papeleraPorFechas();});
  ir('btn-papelera-lotes',()=>{cerrarMenus();window.papeleraLotes();});
  ir('btn-archivar-cliente',()=>{cerrarMenus();window.abrirModalBorrarCliente();});
  ir('btn-quitar-seleccion',()=>window.noaQuitarSeleccion());
  // Boton unico de vista (el ojito): dice en cual vista esta y cambia de color, azul = simple y verde = completa.
  // Es un <span> y el color va con prioridad maxima, porque la pagina fuerza un azul en todos los <button>.
  const bv=h.querySelector('#btn-vista');
  if(bv){
    bv.onclick=()=>window.noaCambiarVista();
    bv.innerHTML='<span style="font-size:18px;line-height:1">👁</span> Vista: '+(VISTA==='simple'?'Simple':'Completa')+' ⇄';
    const bg=(VISTA==='simple')?'#0d9488':'#12263f';
    if(bv.style&&typeof bv.style.setProperty==='function'){bv.style.setProperty('background',bg,'important');bv.style.setProperty('color','#FFFFFF','important');}
    else if(bv.style){bv.style.background=bg;bv.style.color='#FFFFFF';}
    // Boton Imprimir: se crea una sola vez, justo a la izquierda del boton de vista
    if(bv.parentElement&&!document.getElementById('btn-imprimir')){
      const bi=document.createElement('button');
      bi.id='btn-imprimir';
      bi.className='noa-btn';
      bi.setAttribute('title','Imprimir la lista que se ve ahora (con el filtro aplicado)');
      bi.style.cssText='padding:8px 14px;font-size:13px;box-shadow:none;margin-right:8px;';
      bi.textContent='🖨️ Imprimir / PDF';
      bi.setAttribute('title','Imprimir la lista que se ve ahora. Para guardarla en PDF, elija Guardar como PDF en la ventana de impresión');
      bi.onclick=()=>window.noaImprimirCartera();
      bv.parentElement.insertBefore(bi,bv);
      const bx=document.createElement('button');
      bx.id='btn-excel-cartera';
      bx.className='noa-btn';
      bx.setAttribute('title','Descargar en Excel la lista que se ve ahora (con el filtro aplicado)');
      bx.style.cssText='padding:8px 14px;font-size:13px;box-shadow:none;margin-right:8px;';
      bx.textContent='📊 Excel';
      bx.onclick=()=>window.noaExcelCartera();
      bv.parentElement.insertBefore(bx,bv);
    }
  }
  ir('btn-archivar',async function(){
    const checkboxes=document.querySelectorAll(".cliente-checkbox:checked");
    if(checkboxes.length===0){window.abrirModalBorrarCliente();return;}
    const seleccionados=Array.from(checkboxes).map(cb=>buscar(cb.dataset.id)).filter(Boolean);
    const nombres=seleccionados.map(r=>r.asegurado||'Sin nombre').join(', ');
    if(!confirm('¿Archivar a '+nombres+'?\n\nPodrás recuperarlos desde la Papelera.'))return;
    for(const r of seleccionados){
      const res=await window.borrarClienteSupabase(r.id);
      if(res.success){window.datosReales=window.datosReales.filter(x=>String(x.id)!==String(r.id));}
      else{alert('Error archivando '+r.asegurado+': '+res.error);}
    }
    if(typeof window.renderizarCartera==='function')window.renderizarCartera();
    if(typeof window.actualizarDashboard==='function')window.actualizarDashboard();
  });
  const si=h.querySelector('#noa-search');if(si)si.oninput=(e)=>{SEARCH_TERM=e.target.value;window.CARTERA_SHOWN=SZ;irAlInicio();render();};
  // Una fecha que no existe (por ejemplo 31/09) deja el campo vacio sin avisar: aqui se detecta y se avisa
  ['filtro-fecha-desde','filtro-fecha-hasta'].forEach(function(id){
    const i=h.querySelector('#'+id);if(!i)return;
    const revisar=function(){
      const malo=!!(i.validity&&i.validity.badInput);
      if(i.style)i.style.outline=malo?'2px solid #EF4444':'';
      if(malo)window.NOA_AVISO_FECHA='⚠️ La fecha del campo "'+(id.indexOf('desde')!==-1?'Desde':'Hasta')+'" no existe (revise el día del mes).';
      else if(window.NOA_AVISO_FECHA&&window.NOA_AVISO_FECHA.indexOf('no existe')!==-1)window.NOA_AVISO_FECHA='';
      const s2=h.querySelector('#stats');if(s2)s2.textContent=textoEstado();
    };
    i.onblur=revisar;i.onkeyup=revisar;
  });
  if(typeof window.noaActualizarBarra==='function')window.noaActualizarBarra();
});}
// FIN_5A2

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}

// El encabezado heredado decia "V6": se muestra V8
function ponerVersion(){
  if(typeof document.createTreeWalker!=='function'||!document.body)return;
  const w=document.createTreeWalker(document.body,4);
  let n;
  while((n=w.nextNode())){
    const t=n.nodeValue||'';
    if(/V6\s+completo/i.test(t))n.nodeValue=t.replace(/\bV6\b/g,'V8');
  }
}
if(typeof document.addEventListener==='function')document.addEventListener('DOMContentLoaded',ponerVersion);
setTimeout(ponerVersion,1500);

window.marcarPagado=marcarPagado;window.enviarWA=enviarWA;window.enviarEmail=enviarEmail;window.enviarEmailMasivo=enviarEmailMasivo;
window.renderizarCartera=render;
window.noaOrdenar=function(k){const S=window.NOA_SORT=window.NOA_SORT||{key:null,dir:1};if(S.key!==k){S.key=k;S.dir=1;}else if(S.dir===1){S.dir=-1;}else{S.key=null;S.dir=1;}window.CARTERA_SHOWN=SZ;RESET=true;render();};
window.setFiltroCartera=function(f){FILTER=f;SEM=null;irAlInicio();render();};
// Filtro pedido desde otras pantallas (Dashboard, semaforo, tarjetas): devuelve la lista COMPLETA, aplica el filtro
// y marca la pestaña que corresponde. "semaforo" es opcional: azul, verde, amarillo o rojo.
window.NOA_CARTERA_FILTRAR=function(tipo,semaforo){
  cerrarMenus();
  if(window._datosRealesBackup){window.datosReales=window._datosRealesBackup;window._datosRealesBackup=null;}
  limpiarEstadoFecha();
  FILTER=tipo||'TODO';
  SEM=(semaforo&&SEM_INFO[semaforo])?semaforo:null;
  window.CARTERA_SHOWN=SZ;
  irAlInicio();
  render();
};
window.filtrarCarteraPorKPI=function(tipo){window.NOA_CARTERA_FILTRAR(tipo);};
// Lista que se ve ahora en la tabla (para otras pantallas que la necesiten)
window.NOA_CARTERA_VISIBLE=function(){return aplicarSemaforo(getFiltered());};
window.NOA_RENDER_CARTERA=function(csvData){
  try{
    console.log('NOA_RENDER con',csvData.data.length,'clientes');
    COLS=buildCols(csvData.cols);FILTER='PENDIENTE';SEM=null;window.CARTERA_SHOWN=SZ;irAlInicio();
    setTimeout(function(){
      render();
      if(typeof window.actualizarContadoresProblemas==='function')window.actualizarContadoresProblemas();
      if(typeof window.actualizarTodosLosIndicadores==='function')window.actualizarTodosLosIndicadores();
    },300);
    if(!PAGOS.cargado)cargarPagos().then(function(ok){if(ok)render();});
  }catch(e){console.error(e);alert('Error: '+e.message);}
};
document.querySelectorAll('.nav-tab').forEach(btn=>{btn.addEventListener('click',()=>{irAlInicio();setTimeout(render,300);});});
})();

window.normalizarMoneda = function(m) {
  m = (m || 'CRC').toString().toLowerCase().trim();
  if (m.includes('dolar') || m.includes('dollar') || m === 'usd' || m === '$' || m === 'us') return 'USD';
  return 'CRC';
};

// Filtros por fecha: fechas planas y hora de Costa Rica. El mes se filtra junto con el anio, y una fecha que no existe se avisa.
window.filtrarPorFecha = function() {
    const iD = document.getElementById('filtro-fecha-desde');
    const iH = document.getElementById('filtro-fecha-hasta');
    const malo = i => !!(i && i.validity && i.validity.badInput);
    const aviso = txt => { window.NOA_AVISO_FECHA = txt; if (typeof window.renderizarCartera === 'function') window.renderizarCartera(); };
    if (malo(iD) || malo(iH)) { aviso('⚠️ Una de las fechas no existe (por ejemplo, 31/09). Corríjala para filtrar.'); return; }
    const desde = iD ? iD.value : '';
    const hasta = iH ? iH.value : '';
    if (!desde && !hasta) { window.limpiarFiltroFecha(); return; }
    if (desde && hasta && desde > hasta) { aviso('⚠️ La fecha "Desde" es mayor que la fecha "Hasta".'); return; }
    window.NOA_AVISO_FECHA = '';
    const datosBase = window._datosRealesBackup || window.datosReales || [];
    if (!window._datosRealesBackup) window._datosRealesBackup = window.datosReales;
    const selM = document.getElementById('filtro-mes-rapido');
    if (selM) selM.value = '';
    const P = window.NOA_ESTADO.parseFecha, A = window.NOA_ESTADO.aDDMM;
    const filtrados = datosBase.filter(c => {
        const f = P(c.desde_cobro);
        if (!f) return false;
        if (desde && f.iso < desde) return false;
        if (hasta && f.iso > hasta) return false;
        return true;
    });
    window.datosReales = filtrados;
    window.NOA_FILTRO_FECHA_REF = filtrados;
    window.NOA_FILTRO_FECHA_TEXTO = 'Fechas: ' + (desde ? A(desde) : '…') + ' al ' + (hasta ? A(hasta) : '…');
    if (typeof window.setFiltroCartera === 'function') window.setFiltroCartera('TODO');
    else if (typeof window.renderizarCartera === 'function') window.renderizarCartera();
};

window.limpiarFiltroFecha = function() {
    window.limpiarEstadoFecha();
    if (window._datosRealesBackup) {
        window.datosReales = window._datosRealesBackup;
        window._datosRealesBackup = null;
    }
    if (typeof window.setFiltroCartera === 'function') window.setFiltroCartera('TODO');
    else if (typeof window.renderizarCartera === 'function') window.renderizarCartera();
};

window.filtrarPorMesRapido = function() {
    const sel = document.getElementById('filtro-mes-rapido');
    const mes = sel ? parseInt(sel.value) : 0;
    if (!mes) {
        window.limpiarFiltroFecha();
        return;
    }
    const selA = document.getElementById('filtro-anio-rapido');
    const anioTxt = selA ? String(selA.value || '') : '';
    const anio = (anioTxt === '' || anioTxt === 'todos') ? null : parseInt(anioTxt);
    const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const datosBase = window._datosRealesBackup || window.datosReales || [];
    if (!window._datosRealesBackup) window._datosRealesBackup = window.datosReales;
    ['filtro-fecha-desde', 'filtro-fecha-hasta'].forEach(function(id) {
        const e = document.getElementById(id);
        if (e) { e.value = ''; if (e.style) e.style.outline = ''; }
    });
    window.NOA_AVISO_FECHA = '';
    const P = window.NOA_ESTADO.parseFecha;
    const filtrados = datosBase.filter(c => {
        const f = P(c.desde_cobro);
        return !!f && f.m === mes && (anio === null || f.y === anio);
    });
    window.datosReales = filtrados;
    window.NOA_FILTRO_FECHA_REF = filtrados;
    window.NOA_FILTRO_FECHA_TEXTO = 'Mes: ' + MESES[mes - 1] + (anio === null ? ' (todos los años)' : ' ' + anio);
    if (typeof window.setFiltroCartera === 'function') window.setFiltroCartera('TODO');
    else if (typeof window.renderizarCartera === 'function') window.renderizarCartera();
};

// Version de enviarEmail que recibe el objeto cliente directo (no id) y no usa alert,
// pensada para ser llamada por procesos automaticos (ej. noa_auto_seguimiento.js).
window.enviarEmailIndividual = async function(cliente) {
    if (!cliente || !cliente.correo) return { success: false, error: 'Sin email' };
    try {
        const nombre = cliente.asegurado || "Cliente";
        const email = cliente.correo;
        const poliza = cliente.poliza || "N/A";
        const monto = cliente.moneda === 'USD' ? '$' + window.noaPrimaTxt(cliente.prima||0) : '₡' + window.noaPrimaTxt(cliente.prima||0);
        const vencimiento = excelDate(cliente.desde_cobro) || "N/A";
        const aseguradora = cliente.aseguradora || "N/A";
        const periodicidad = cliente.periodicidad || "N/A";
        const placa = cliente.placa || "";
        const marcaV = cliente['DETALLE_AUT_INS::Marca'] || cliente.marca || "";
        const modeloV = cliente['DETALLE_AUT_INS::Modelo'] || cliente.modelo || "";
        const anioV = cliente['DETALLE_AUT_INS::Año'] || cliente.anio || "";
        const objetoAsegurado = [marcaV, modeloV, anioV].filter(x => x && String(x).trim() !== '').join(' ') || placa;
        const fechaLimite = calcFechaLimite(vencimiento) || "N/A";
        const params = { to_email: email, nombre: nombre, aseguradora: aseguradora, poliza: poliza, objeto_asegurado: objetoAsegurado, placa: placa, vencimiento: vencimiento, periodicidad: periodicidad, monto: monto, fecha_limite: fechaLimite };
        params.asunto = 'Recordatorio Vencimiento de Póliza';
        params.mensaje = ((window.noaMachote && window.noaMachote(cliente)) || { texto: '' }).texto;
        const res = await emailjs.send(window.EMAILJS_CONFIG.serviceId, window.EMAILJS_CONFIG.templateId, params, window.EMAILJS_CONFIG.publicKey);
        if (res.status === 200) {
            if (window.guardarEnvio) {
                await window.guardarEnvio(cliente.id, nombre, 1, "email", "Aviso de Vencimiento - " + aseguradora + " | Poliza: " + poliza + " | Vence: " + vencimiento + " | Monto: " + monto + " | Limite pago: " + fechaLimite, "automatico");
            }
            return { success: true };
        }
        return { success: false, error: 'status ' + res.status };
    } catch (err) {
        console.error('enviarEmailIndividual error:', err);
        return { success: false, error: (err && (err.text || err.message)) || 'error desconocido' };
    }
};
// FIN_PARTE_5
