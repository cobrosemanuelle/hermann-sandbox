// NOA - Machotes de aviso de vencimiento (WhatsApp y correo), segun el documento FORMATOS_NOTIFICACIONES de Emmanuel.
// Cada machote sale de aseguradora + linea + moneda (+ medio de cobro y forma de pago). Los textos y cuentas son los del documento.
(function () {
  'use strict';
  var T=["Buen día.","Por este medio le recordamos el vencimiento de la siguiente Póliza de ******:","CÉDULA JURÍDICA: 4-000-001902-22 INSTITUTO NACIONAL DE SEGUROS (COLONES)","BANCO NACIONAL: CTA IBAN: CR12015100010010077221","BANCO COSTA RICA: CTA IBAN: CR55015201001000029681","SINPE MÓVIL: 8992-8228","📌 Importante: Recuerde mantener su vehículo asegurado por su valor real de mercado, para evitar una multa en la indemnización (infraseguro o sobreseguro).","Estamos para servirle.","CÉDULA JURÍDICA: 4-000-001902-22 INSTITUTO NACIONAL DE SEGUROS (DÓLARES)","BANCO NACIONAL: CTA IBAN: CR27015100010020604555","BANCO COSTA RICA: CTA IBAN: CR2015201001020269103","Buen día,","Por este medio le recordamos el vencimiento de la siguiente Póliza de Incendio:","CÉDULA JURÍDICA: 4-000-001902-22 INSTITUTO NACIONAL DE SEGUROS (COLONES)","📌 Importante: Recuerde mantener el monto de su póliza actualizado, según el valor real de los bienes, para garantizar una cobertura adecuada ante un siniestro.","Por este medio le recordamos el vencimiento de la siguiente Póliza de *****:","CÉDULA JURÍDICA: 4-000-001902-22 INSTITUTO NACIONAL DE SEGUROS (COLONES).","Por este medio le recordamos el vencimiento de la siguiente Póliza Médica:","Por este medio le recordamos el vencimiento de la siguiente Póliza de Fidelidad:","CÉDULA JURÍDICA: 4-000-001902-22 INSTITUTO NACIONAL DE SEGUROS","Por este medio le recordamos el vencimiento de la siguiente Póliza de ********:","Por este medio le recordamos el vencimiento de la siguiente Póliza de Riesgos del Trabajo:","*Además el Servicio de Presentación de Planillas:","CÉDULA JURÍDICA: 3-101-560179 MAPFRE Seguros Costa Rica S.A. (COLONES)","BANCO NACIONAL: CTA IBAN: CR37015100010012201168","BANCO COSTA RICA: CTA IBAN: CR69015201001028555771","SINPE MOVIL: 6349-1497","CÉDULA JURÍDICA: 3-101-666929 MNK SEGUROS (COLONES)","BANCO NACIONAL: CTA IBAN: CR61015100210010151504","BANCO DAVIVIENDA:  CTA IBAN: CR08010400142200172113","BAC CREDOMATIC: CTA IBAN: CR19010200009189795506","SINPE MÓVIL: 6474-9961","Pago en línea: https://portal.oceanica-cr.com:5443/pagoEnLinea/index.php/validacion/","CÉDULA JURÍDICA: 3-101-622002 QUALITAS COMPAÑÍA DE SEGUROS","BANCO NACIONAL: CTA IBAN: CR05015108710010016578","BANCO COSTA RICA: CTA IBAN: CR62015201001029721740","BAC CREDOMATIC: CTA IBAN: CR67010200009371737639","SINPE MÓVIL:  7017-8812","Pago en línea: https://www.qualitas.co.cr/web/qcr/pagos","Por este medio le recordamos el vencimiento de la siguiente Póliza de Automóvil:","CÉDULA JURÍDICA: 3-101-622002 QUALITAS COMPAÑÍA DE SEGUROS (DÓLARES)","BANCO NACIONAL: CTA IBAN: CR16015108710026012068","BANCO COSTA RICA: CTA IBAN: CR52015201001029721823","BAC CREDOMATIC: CR77010200009371737556","Por este medio le recordamos el vencimiento del programa de indemnización:","📌 Importante: Es requisito tener el seguro del vehículo vigente.","Pago en línea: https://appsr.assanet.com/cr/pagos/primaonline/formulariopago.aspx","CÉDULA JURÍDICA: 3-101-622002 COLONES ASSA COMPAÑÍA DE SEGUROS S.A.","BANCO NACIONAL: CTA IBAN: CR94015100010012198590","BANCO COSTA RICA: CTA IBAN: CR26015201001028198130","BAC CREDOMATIC:  CTA IBAN:  CR34010200009100882514","SINPE MÓVIL:  8634-9301","CÉDULA JURÍDICA: 3-101-678807 COLONES Seguros LAFISE Costa Rica, S.A.","BANCO DE COSTA RICA: Cuenta IBAN: CR03015201001046698190","BANCO NACIONAL: Cuenta IBAN: CR55015120210010002008","SINPE MÓVIL: 6215-8771","Pagos en línea: https://appscr.seguroslafise.com/posvirtualext","CÉDULA JURÍDICA: 3-101-678807 DÓLARES Seguros LAFISE Costa Rica, S.A.","BANCO DE COSTA RICA: Cuenta IBAN: CR66015201001046698511","BANCO NACIONAL: Cuenta IBAN: CR13015120210020001524","Por este medio le recordamos el vencimiento de la siguiente Póliza de *******:","CÉDULA JURÍDICA: 3-012-622635 BMI COSTA RICA (DÓLARES)","BAC San José: Cuenta IBAN. CR90010200009116441858","Banco Nacional de Costa Rica: Cuenta IBAN. CR60015103710026009198","📌 Importante:","La póliza cuenta con una tarjeta ligada para realizar el descargo automático el día del vencimiento. Si no desea que se realice el cobro o necesita cambiar la tarjeta, le agradecemos informarlo antes de esa fecha.","Recuerde mantener su vehículo asegurado por su valor real de mercado, para evitar una reducción en la indemnización por infraseguro o sobreseguro.","CÉDULA: 2-630-340","SINPE MÓVIL: 8840-9569","COOCIQUE: CR49081100110001469001","BAC SAN JOSÉ: CR77010200007004525015"];
  var M={"INS_AUTO_CRC":[0,1,[0,1,2,3,4,5],[2,3,4,5,6,7]],"INS_AUTO_USD":[0,1,[0,1,2,3,4,5],[8,9,10,6,7]],"INS_INC_CRC":[11,12,[0,1,2,3,4],[13,3,4,5,14,7]],"INS_INC_USD":[11,12,[0,1,2,3,4],[8,9,10,14,7]],"INS_OTROS_CRC":[11,15,[0,1,2,3,4],[16,3,4,5,7]],"INS_MEDICAL":[11,17,[0,1,2,3,4],[2,3,4,8,9,10,7]],"INS_CARGA_CRC":[11,1,[0,1,2,3,4,5],[2,3,4,5,7]],"INS_CARGA_USD":[11,1,[0,1,2,3,4,5],[8,9,10,7]],"INS_FID":[11,18,[0,1,2,3,4,6],[19,3,4,5,7]],"INS_RT":[11,20,[0,1,2,4,3],[19,3,4,5,7]],"INS_RT_PLAN":[11,21,[0,1,2,4],[22,7]],"MAPFRE_AUTO":[11,1,[0,1,2,3,4,5],[23,24,25,26,6,7]],"MNK_AUTO":[0,1,[0,1,2,3,4,5],[27,28,29,30,31,32,6,7]],"MNK_RC":[0,1,[0,1,2,3,4],[27,28,29,30,31,32,7]],"QUA_CRC":[11,1,[0,1,2,3,4,5],[33,34,35,36,37,38,6,7]],"QUA_USD":[11,39,[0,1,2,3,4,5],[40,41,42,43,38,6,7]],"QUA_IND":[11,44,[0,1,2,3,4,5],[33,34,35,36,37,38,45,7]],"ASSA_LINEA":[11,1,[0,1,2,3,4,5],[46,6,7]],"ASSA_CRC":[11,1,[0,1,2,3,4,5],[47,48,49,50,51,46,6,7]],"LAF_CRC":[11,15,[0,1,2,3,4,5],[52,53,54,55,56,6,7]],"LAF_USD":[11,1,[0,1,2,3,4,5],[57,58,59,56,6,7]],"BMI_USD":[11,60,[0,1,2,3,4],[61,62,63,7]],"CARGO_AUTO":[11,15,[0,1,2,3,4,5],[64,65,66,7]]};
  var PLAN=[67, 68, 69, 70];
  var CAMPOS=['Póliza','A nombre de','Vence','Monto a pagar','Forma de pago','Placa','Zona de riesgo'];
  var CIERRE='Estamos para servirle.';
  var norm=function(s){return String(s==null?'':s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();};
  var fecha=function(v){return typeof window.excelDate==='function'?window.excelDate(v||''):String(v||'');};
  function aseg(r){var a=norm(r.aseguradora);
    if(!a||a==='ins'||a.indexOf('instituto nacional')>-1)return 'INS';
    if(a.indexOf('mapfre')>-1)return 'MAPFRE';
    if(a.indexOf('mnk')>-1||a.indexOf('oceanica')>-1)return 'MNK';
    if(a.indexOf('qualitas')>-1)return 'QUALITAS';
    if(a.indexOf('assa')>-1)return 'ASSA';
    if(a.indexOf('lafise')>-1)return 'LAFISE';
    if(a.indexOf('bmi')>-1)return 'BMI';
    return a.toUpperCase();}
  function clase(r){var l=norm(r.tipo_seguro);
    if(/indemniz/.test(l))return 'indemnizacion';
    if(/^auto|automovil|moto|embarc|colectiva automov/.test(l))return 'auto';
    if(/incendio/.test(l))return 'incendio';
    if(/fidelidad/.test(l))return 'fidelidad';
    if(/riesgos? del trabajo|^rt/.test(l))return 'rt';
    if(/medical|medica/.test(l))return 'medical';
    if(/^carga$|equipo contratista|aviacion/.test(l))return 'carga';
    return 'otros';}
  function elegir(r){
    var A=aseg(r),C=clase(r),usd=/usd|dolar|\$/.test(norm(r.moneda)),per=norm(r.periodicidad),med=norm(r.medio_cobro);
    if(med.indexOf('cargo automatico')>-1&&C==='auto'&&/trimestral|semestral|anual/.test(per)&&A!=='BMI')return 'CARGO_AUTO';
    if(A==='INS'){
      if(C==='auto')return usd?'INS_AUTO_USD':'INS_AUTO_CRC';
      if(C==='incendio')return usd?'INS_INC_USD':'INS_INC_CRC';
      if(C==='carga')return usd?'INS_CARGA_USD':'INS_CARGA_CRC';
      if(C==='fidelidad')return 'INS_FID';
      if(C==='rt')return r.planillas?'INS_RT_PLAN':'INS_RT';
      if(C==='medical')return 'INS_MEDICAL';
      return usd?null:'INS_OTROS_CRC';}
    if(A==='MAPFRE')return (C==='auto'&&!usd)?'MAPFRE_AUTO':null;
    if(A==='MNK')return usd?null:(C==='auto'?'MNK_AUTO':'MNK_RC');
    if(A==='QUALITAS'){if(C==='indemnizacion')return 'QUA_IND';return usd?'QUA_USD':'QUA_CRC';}
    if(A==='ASSA')return usd?'ASSA_LINEA':'ASSA_CRC';
    if(A==='LAFISE')return usd?'LAF_USD':'LAF_CRC';
    if(A==='BMI')return 'BMI_USD';
    return null;}
  function etiquetaLinea(r){var l=String(r.tipo_seguro||'').trim();if(!l)return 'seguro';
    if(/^autos?$/i.test(l))return 'Automóvil';return l;}
  function negritaWA(t){return String(t).split('\n').map(function(l){
    if(/^\*Además/.test(l))return l.replace(/\s+$/,'')+'*';
    if(/^Buen d[ií]a[.,;]/.test(l))return '*'+l.replace(/\s+$/,'')+'*';
    if(/^C[ÉE]DULA JUR[ÍI]DICA/.test(l))return '*'+l.replace(/\s+$/,'')+'*';
    l=l.replace(/(Importante:)/,'*$1*');
    l=l.replace(/(Pagos? en l[ií]nea:)/,'*$1*');
    return l;}).join('\n');}
  window.noaMachote=function(r){
    try{
      var id=elegir(r);if(!id||!M[id])return null;
      var m=M[id],av=[],L=[];
      var intro=T[m[1]].replace(/\*{3,}/g,etiquetaLinea(r));
      var prima=Number(r.prima)||0;
      var usd=/usd|dolar|\$/.test(norm(r.moneda));
      var monto=prima>0?((usd?'US$ ':'₡ ')+(window.noaPrimaTxt?window.noaPrimaTxt(prima):prima)):'';
      var val={0:r.poliza||'',1:r.asegurado||'',2:fecha(r.desde_cobro),3:monto,4:r.periodicidad||'',5:r.placa||'',6:r.zona_riesgo||''};
      L.push(T[m[0]],'',intro,'');
      m[2].forEach(function(c){var v=val[c];
        if(v)L.push('- '+CAMPOS[c]+': '+v);else av.push('Falta '+CAMPOS[c].toLowerCase());});
      var cola=m[3].map(function(i){return T[i];});
      if(id==='INS_RT_PLAN'){
        var ins=M.INS_RT[3].map(function(i){return T[i];}).filter(function(x){return x!==CIERRE;});
        var pl=PLAN.map(function(i){return T[i];});
        cola=ins.concat([cola[0]],pl,[CIERRE]);}
      cola.forEach(function(x,k){
        if(k===0||x.indexOf('📌')===0||x===CIERRE||x.indexOf('*Además')===0)L.push('');
        L.push(x);});
      var raw=L.join('\n');return {id:id,texto:raw.replace(/^\*Además/m,'Además'),wa:negritaWA(raw),avisos:av};
    }catch(e){console.error('Machote:',e);return null;}
  };
  window.NOA_MACHOTES={ids:Object.keys(M),elegir:elegir};
  console.log('✅ noa_machotes.js cargado ('+Object.keys(M).length+' machotes)');
})();
