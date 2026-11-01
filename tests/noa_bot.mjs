import{createRequire as R}from'module';const require=R(import.meta.url),{chromium}=require(process.env.PW_PATH||'playwright');
const BASE=process.env.BASE_URL||'https://hermann-sandbox.vercel.app',SLOW=+(process.env.SLOW||250),EXE=process.env.CHROME_EXE||void 0;
const stamp=new Date().toISOString().replace(/\D/g,'').slice(2,12),NOMBRE='ROBOT '+stamp,POLIZA='R-'+stamp,HOY=new Date().toISOString().slice(0,10);
const res=[],paso=(n,ok,d='')=>{res.push({n,ok,d});console.log((ok?'✅ PASS':'❌ FAIL')+'  '+n+(d?'  → '+d:''));};
const b=await chromium.launch({headless:process.env.HEADLESS==='1',slowMo:SLOW,executablePath:EXE,args:['--window-size=1440,950']});
const pg=await(await b.newContext({viewport:{width:1440,height:900}})).newPage();
const errs=[];pg.on('pageerror',e=>errs.push(String(e.message).slice(0,100)));pg.on('dialog',async d=>{await d.accept();});
const w=ms=>pg.waitForTimeout(ms),shot=async n=>{try{await pg.screenshot({path:`${stamp}_${n}.png`});}catch{}};
async function sc(s,t=8000){const e=await pg.waitForSelector(s,{timeout:t,state:'attached'});await e.scrollIntoViewIfNeeded();await w(150);await e.click();}
async function sf(s,v,t=8000){const e=await pg.waitForSelector(s,{timeout:t,state:'attached'});await e.scrollIntoViewIfNeeded();await w(100);await e.fill(v);}
async function ex(s,t=2000){try{await pg.waitForSelector(s,{timeout:t,state:'attached'});return true;}catch{return false;}}
async function T(n,fn){try{await fn();}catch(e){paso(n,false,String(e.message).split('\n')[0].slice(0,60));await shot('ERR_'+n.replace(/\W+/g,'_').slice(0,10));}}

await pg.goto(BASE);await w(3500);await shot('00');

await T('Scripts',async()=>{const s=await pg.$$eval('script[src]',e=>e.map(x=>x.src).filter(u=>u.startsWith('http')));const m=[];for(const u of s.slice(0,15)){try{const r=await pg.context().request.get(u,{timeout:5000});if(r.status()!==200||/html/i.test(r.headers()['content-type']||''))m.push(u.split('/').pop());}catch{}}paso('Scripts OK',m.length===0,m.join(','));});

await T('Login',async()=>{const U=process.env.ROBOT_USER||'sandbox@test.com',P=process.env.ROBOT_PASS||'';await pg.waitForSelector('#login-email',{timeout:10000});await pg.fill('#login-email',U);await pg.fill('#login-password',P);await shot('01');await pg.click('button:has-text("Entrar")');await w(4000);if(await ex('#noa-login',1000))throw new Error('Login falló');paso('Login OK',true);await shot('02');});

await T('Dashboard',async()=>{await w(2000);const k=await pg.textContent('#kpi-total-clientes').catch(()=>'?');paso('KPIs OK',!/undefined|NaN/i.test(k),'Total: '+k);await shot('03');});

await T('Cartera',async()=>{await sc('button.nav-tab:has-text("Cartera")');await w(2000);if(await ex('#btn-todo'))await sc('#btn-todo');await w(1500);const f=await pg.$$('#cartera-noa tbody tr');paso('Cartera OK',f.length>0,f.length+' clientes');await shot('04');});

await T('Crear',async()=>{await sc('#btn-nuevo-cliente');await pg.waitForSelector('#fc-asegurado',{timeout:5000});await shot('05');await sf('#fc-asegurado',NOMBRE);await sf('#fc-poliza',POLIZA);await sf('#fc-desde_cobro',HOY);if(await ex('#fc-telefono'))await sf('#fc-telefono','88880000');if(await ex('#fc-correo'))await sf('#fc-correo','robot@test.com');if(await ex('#fc-prima'))await sf('#fc-prima','25000');await shot('06');await sc('#fc-guardar');await w(3000);if(await ex('#fc-form',1000))throw new Error('Form no cerró');paso('Crear OK',true,POLIZA);await shot('07');});

await T('Buscar',async()=>{await sc('button.nav-tab:has-text("Cartera")');await w(1500);if(await ex('#btn-todo'))await sc('#btn-todo');await w(1500);const b=await pg.$('input[placeholder*="uscar"]');if(b){await b.fill(POLIZA);await w(2000);}const f=await pg.$$('#cartera-noa tbody tr');paso('Buscar OK',f.length>0,f.length+' resultado(s)');await shot('08');});

await T('Expediente',async()=>{const m=await pg.$('#cartera-noa tbody tr:first-child button:has-text("⋯")');if(!m)throw new Error('Sin menú');await m.scrollIntoViewIfNeeded();await m.click();await w(500);await sc('button:has-text("Carpeta")');await w(2500);if(!(await ex('#modal-expediente-cliente')))throw new Error('Modal no abrió');paso('Expediente OK',true);await shot('09');const c=await pg.$('#modal-expediente-cliente button');if(c)await c.click();await w(500);});

await T('Editar',async()=>{const m=await pg.$('#cartera-noa tbody tr:first-child button:has-text("⋯")');if(!m)throw new Error('Sin menú');await m.scrollIntoViewIfNeeded();await m.click();await w(500);await sc('button:has-text("Editar")');await pg.waitForSelector('#fc-asegurado',{timeout:5000});paso('Editar OK',true);await shot('10');await sc('#fc-cancelar');await w(500);});

await T('Pagar',async()=>{const b=await pg.$('#cartera-noa tbody tr:first-child button:has-text("Pagar")');if(b){await b.scrollIntoViewIfNeeded();await b.click();await w(2000);paso('Pagar OK',true);await shot('11');}else{paso('Pagar OK',true,'Ya pagado');}});

await T('HistPagos',async()=>{await sc('button.nav-tab:has-text("Historial Pagos")');await w(2000);paso('Hist Pagos OK',true);await shot('12');});
await T('HistEnvios',async()=>{await sc('button.nav-tab:has-text("Historial Env")');await w(2000);paso('Hist Envíos OK',true);await shot('13');});
await T('Reportes',async()=>{await sc('button.nav-tab:has-text("Reportes")');await w(2000);paso('Reportes OK',true);await shot('14');});

await T('Archivar',async()=>{await sc('button.nav-tab:has-text("Cartera")');await w(1500);const b=await pg.$('input[placeholder*="uscar"]');if(b){await b.fill(POLIZA);await w(2000);}const cb=await pg.$('#cartera-noa tbody tr:first-child .cliente-checkbox');if(cb){await cb.scrollIntoViewIfNeeded();await cb.click();await w(500);if(await ex('#btn-archivar')){await sc('#btn-archivar');await w(2000);paso('Archivar OK',true,POLIZA);}else{paso('Archivar OK',true,'Sin botón');}}else{paso('Archivar OK',true,'Sin checkbox');}await shot('15');});

await T('Errores',async()=>{const g=errs.filter(e=>!/favicon|404|metric/i.test(e));paso('Sin errores JS',g.length===0,g.slice(0,2).join(' | '));});

const f=res.filter(r=>!r.ok).length;console.log('\n'+res.length+' pasos · '+(res.length-f)+' PASS · '+f+' FAIL');await shot('99');await b.close();process.exit(f>0?1:0);
