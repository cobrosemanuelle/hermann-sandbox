(function(){
  if (window.NOA_FORCE_13) return; window.NOA_FORCE_13 = true;

  function pad(n){return String(n).padStart(2,"0")}
  function ddmmaa(d){return pad(d.getUTCDate())+"-"+pad(d.getUTCMonth()+1)+"-"+String(d.getUTCFullYear()).slice(-2)}
  function excelSerialToDate(n){var ms=Number(n)*86400000; if(!isFinite(ms))return null; return new Date(Date.UTC(1899,11,30)+ms)}
  function parseDate(v){
    if(v==null||v==="")return null; var s=String(v).trim();
    if(/^\d{4,6}$/.test(s)){var d=excelSerialToDate(Number(s)); return d&&!isNaN(d)?d:null}
    var m=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2}|\d{4})$/);
    if(m){var dd=+m[1],mm=+m[2],yy=m[3]; var yyyy=yy.length===2?2000+(+yy):(+yy); return new Date(Date.UTC(yyyy,mm-1,dd))}
    var d2=new Date(s); return isNaN(d2)?null:new Date(Date.UTC(d2.getFullYear(),d2.getMonth(),d2.getDate()))
  }
  function addMonthsUTC(d,n){return new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+n,d.getUTCDate()))}
  function norm(s){try{return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim()}catch(e){return String(s||"").toLowerCase().trim()}
  }
  function monthsByPeriod(t){var x=norm(t); if(x.includes("bimens"))return 2; if(x.includes("trimes"))return 3; if(x.includes("semes"))return 6; if(x.includes("anual"))return 12; if(x.includes("mens"))return 1; return 1}
  function money(v,c){c=c||"CRC"; var n=Number(String(v||"").replace(/[^\d.-]/g,""))||0; try{return new Intl.NumberFormat("es-CR",{style:"currency",currency:c,minimumFractionDigits: 2, maximumFractionDigits: 2}).format(n)}catch(e){return n.toLocaleString("es-CR")}}
  function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(m){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]})}
  function keyPol(pol){return String(pol||"").replace(/\s+/g,"").toUpperCase()}

  // helpers para periodicidad
  function looksLikeFormaPago(x){x=norm(x); return /transfer|tarjeta|debito|credito|efect|sinpe|deposit|contado/.test(x)}
  function looksLikePeriodicidad(x){x=norm(x); return /(mens|bimens|trimes|semes|anual)/.test(x)}
  function pickPeriodicidad(obj){
    // intenta varias llaves comunes
    var cand = obj.periodicidad || obj.periodicidad_pago || obj.periodicidad_de_pago || obj.periocidad || obj.periocidad_de_pago || obj.periocidad_pago || "";
    if (looksLikePeriodicidad(cand)) return cand;
    if (looksLikePeriodicidad(obj.__period_tabla||"")) return obj.__period_tabla;
    // si solo hay forma de pago, no la uses como periodicidad
    return cand && !looksLikeFormaPago(cand) ? cand : "";
  }

  function findOld9(){
    var ts=document.querySelectorAll("table");
    for(var i=0;i<ts.length;i++){
      var t=ts[i], ths=t.tHead&&t.tHead.querySelectorAll?t.tHead.querySelectorAll("th").length:0;
      var head=t.tHead?t.tHead.textContent.toLowerCase():"";
      if(ths>0&&ths<=9&&/#\s*pol/i.test(head)&&/asegurado/i.test(head)) return t;
    } return null;
  }

  function buildData(){
        // Primero: leer desde Supabase (window.datosReales)
    if (window.datosReales && window.datosReales.length > 0) {
      for (var i=0; i<window.datosReales.length; i++) {
        var cliente = window.datosReales[i];
        var pol = cliente.poliza || cliente.pol_original || cliente['# Póliza'] || cliente['# Poliza'] || '';
        if (!pol) continue;
        var k = keyPol(pol);
        map[k] = {
          estado: cliente.estado || '',
          desde: cliente.desde || cliente.Desde || '',
          hasta: cliente.hasta || cliente['Fecha Hasta'] || cliente['Fecha Hasta '] || cliente['Vigencia hasta'] || '',
          pol_original: pol,
          periodicidad: cliente.periodicidad || cliente['Periodicidad de pago'] || '',
          asegurado: cliente.nombre || cliente.Nombre || cliente.Asegurado || cliente.asegurado || '',
          identificacion: cliente.identificacion || cliente.Identificación || '',
          telefono: cliente.telefono || cliente.Teléfono || '',
          correo: cliente.correo || cliente['Correo electrónico'] || cliente.email || '',
          tipo_seguro: cliente.tipo_seguro || cliente['Tipo de seguro'] || '',
          placa: cliente.placa || cliente['Placa del Vehículo'] || '',
          moneda: cliente.moneda || cliente.Moneda || 'CRC',
          prima: cliente.prima || cliente['Prima Aseguradora'] || cliente.monto || cliente.Monto || ''
        };
      }
    }

    var map = {};
    // Excel (si existe)
    if (window.NOA_BY_POLIZA && (Array.isArray(window.NOA_BY_POLIZA)? window.NOA_BY_POLIZA.length : Object.keys(window.NOA_BY_POLIZA).length)) {
      var src = window.NOA_BY_POLIZA;
      if (Array.isArray(src)){
        for (var i=0;i<src.length;i++){
          var d=src[i], k=keyPol(d.pol_original||d.poliza||d.pol||""); if(!k) continue;
          map[k]=Object.assign({}, d); if(!map[k].moneda) map[k].moneda="CRC";
        }
      } else {
        for (var k in src){
          var d2=src[k], kk=keyPol(k);
          map[kk]=Object.assign({}, d2);
          if(!map[kk].pol_original) map[kk].pol_original=d2.pol_original||k;
          if(!map[kk].moneda) map[kk].moneda="CRC";
        }
      }
    }
    // Tabla base (9) para completar y guardar periodicidad real en __period_tabla
    var t9=findOld9();
    if (t9){
      var rs=t9.tBodies[0].rows;
      for(var r=0;r<rs.length;r++){
        var c=rs[r].cells, pol=(c[3]&&c[3].textContent.trim())||""; if(!pol)continue; var kk=keyPol(pol);
        var base = map[kk]||{};
        var periodicidadTabla = (c[4]&&c[4].textContent.trim())||"";
        map[kk]=Object.assign({
          estado:(c[0]&&c[0].textContent.trim())||"",
          desde:(c[1]&&c[1].textContent.trim())||"",
          hasta:(c[2]&&c[2].textContent.trim())||"",
          pol_original:pol,
          periodicidad: base.periodicidad || periodicidadTabla,
          __period_tabla: periodicidadTabla,
          asegurado:(c[5]&&c[5].textContent.trim())||"",
          identificacion:(c[6]&&c[6].textContent.trim())||"",
          telefono:(c[7]&&c[7].textContent.trim())||"",
          correo:(c[8]&&c[8].textContent.trim())||"",
          tipo_seguro: base.tipo_seguro || "",
          placa: base.placa || "",
          moneda: base.moneda || "CRC",
          prima: base.prima || ""
        }, base);
      }
    }
    // saneo final de periodicidad
    Object.keys(map).forEach(function(k){
      map[k].periodicidad = pickPeriodicidad(map[k]);
    });
    return map;
  }

  function hideOldTables(){
    document.querySelectorAll("table").forEach(function(t){
      var ths=t.tHead&&t.tHead.querySelectorAll?t.tHead.querySelectorAll("th").length:0;
      if (ths && ths<=9) t.style.display="none";
    });
  }

  function render13(){
    var MAP = buildData(), keys = Object.keys(MAP);
    if (!keys.length) return false;

    hideOldTables();

    var titles=["Estado","Desde","Hasta","# Póliza","Periodicidad de pago","Asegurado","Identificación","Teléfono","Correo electrónico","Tipo de seguro","Placa del Vehículo","Moneda","Prima"];
    var mount=document.getElementById("noa-cartera13");
    if(!mount){
      mount=document.createElement("div");
      mount.id="noa-cartera13";
      mount.style.cssText="margin:24px 16px;padding:12px;background:#111827;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.35)";
      document.body.appendChild(mount);
    }
    var html='<h3 style="margin:8px 12px 16px 12px;color:#e5e7eb">Cartera (13 columnas)</h3><div class="tableWrap" style="overflow:auto"><table id="tabla13" style="width:100%;border-collapse:collapse"><thead><tr>';
    for(var i=0;i<titles.length;i++){ html+='<th style="text-align:left;padding:8px;border-bottom:1px solid #1f2937;color:#e5e7eb;white-space:nowrap">'+titles[i]+'</th>'; }
    html+='</tr></thead><tbody></tbody></table></div>';
    mount.innerHTML=html;

    var tb=mount.querySelector("#tabla13 tbody"), arr=keys.map(function(k){return MAP[k]});
    arr.sort(function(a,b){return String(a.asegurado||"").localeCompare(String(b.asegurado||""),"es")});

    for(i=0;i<arr.length;i++){
      var d=arr[i], desde=d.desde?(parseDate(d.desde)?ddmmaa(parseDate(d.desde)):d.desde):"", hasta=d.hasta?(parseDate(d.hasta)?ddmmaa(parseDate(d.hasta)):d.hasta):"";
      var per= pickPeriodicidad(d);
      var vals=[ d.estado||"", desde, hasta, d.pol_original||"", per||"", d.asegurado||"", d.identificacion||"", d.telefono||"", d.correo||"", d.tipo_seguro||"", d.placa||"", d.moneda||"CRC", money(d.prima||0,d.moneda||"CRC") ];
      var row="<tr>";
      for(var j=0;j<vals.length;j++){ row+='<td style="padding:8px;border-bottom:1px solid #1f2937;color:#e5e7eb;white-space:nowrap">'+esc(vals[j])+"</td>"; }
      row+="</tr>";
      tb.insertAdjacentHTML("beforeend", row);
    }

    // Click Estado ⇒ Pagado rota fechas según periodicidad
    var IDX_ESTADO=0, IDX_DESDE=1, IDX_HASTA=2, IDX_POL=3, IDX_PER=4, trs=tb.querySelectorAll("tr");
    for(i=0;i<trs.length;i++){ (function(tr){
      var estadoCell=tr.children[IDX_ESTADO]; estadoCell.style.cursor="pointer"; estadoCell.title="Click para alternar estado y, si Pagado, rodar fechas";
      estadoCell.addEventListener("click", function(){
        var pol=tr.children[IDX_POL].textContent.trim(), k=keyPol(pol), d=MAP[k]; if(!d)return;
        var actual=(estadoCell.textContent||"").toLowerCase(), nuevo= actual==="pagado" ? "Pendiente" : "Pagado";
        if(nuevo==="Pagado"){
          var hastaActual=parseDate(tr.children[IDX_HASTA].textContent || d.hasta); if(!hastaActual){alert("No se pudo leer HASTA actual."); return}
          var perTxt = tr.children[IDX_PER].textContent || d.periodicidad || "";
          var meses = monthsByPeriod(perTxt);
          var desdeNuevo=hastaActual, hastaNuevo=addMonthsUTC(hastaActual, meses);
          d.desde=ddmmaa(desdeNuevo); d.hasta=ddmmaa(hastaNuevo);
          tr.children[IDX_DESDE].textContent=d.desde; tr.children[IDX_HASTA].textContent=d.hasta;
        }
        d.estado=nuevo; estadoCell.textContent=nuevo;
      });
    })(trs[i]); }

    console.log("[NOA] 13 columnas OK (periodicidad saneada). Filas:", arr.length);
    return true;
  }

  function ensure(){
    if (render13()) return;
    var tries=0, iv=setInterval(function(){ tries++; if (render13()){clearInterval(iv);return} if(tries>60)clearInterval(iv) }, 500);
    var obs=new MutationObserver(function(){ render13() });
    obs.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", ensure); else ensure();
})();
