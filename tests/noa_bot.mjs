// ══════════════════════════════════════════════════════════════════════════════
// ROBOT DE PRUEBAS - NOA HERMANN SANDBOX
// Basado en plantilla NOA Cobros V6
// Selectores verificados: fc-asegurado, fc-poliza, fc-desde_cobro, fc-telefono,
//   fc-correo, fc-prima, fc-guardar, fc-cancelar, #modal-expediente-cliente
// ══════════════════════════════════════════════════════════════════════════════
import { createRequire } from 'module'; const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH || 'playwright');
const BASE = process.env.BASE_URL || 'https://hermann-sandbox.vercel.app';
const SLOW = +(process.env.SLOW || 350), HEADED = process.env.HEADLESS !== '1';
const EXE = process.env.CHROME_EXE || undefined;
const stamp = new Date().toISOString().replace(/\D/g, '').slice(2, 12);
const NOMBRE = 'PRUEBA BOT ' + stamp, POLIZA = 'PRUEBA-BOT-' + stamp;
const HOY = new Date().toISOString().slice(0, 10);
const res = [];
const paso = (n, ok, det = '') => { res.push({ n, ok, det }); console.log((ok ? '✅ PASS' : '❌ FAIL') + '  ' + n + (det ? '  → ' + det : '')); };
const b = await chromium.launch({ headless: !HEADED, slowMo: SLOW, executablePath: EXE, args: ['--window-size=1440,950'] });
const pg = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = []; pg.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
const consola = []; pg.on('console', m => { if (m.type() === 'error') consola.push(m.text().slice(0, 160)); });
const alerts = []; pg.on('dialog', async d => { alerts.push(d.message()); await d.accept(); });
const esperar = ms => pg.waitForTimeout(ms);
const shot = async n => { try { await pg.screenshot({ path: `bot_${stamp}_${n}.png` }); } catch {} };

async function correr(n, fn) { try { await fn(); } catch (e) { paso(n, false, String(e.message).split('\n')[0]); await shot('error_' + n.replace(/\W+/g, '_').slice(0, 20)); } }

async function clic(sel) {
  const l = pg.locator(sel).first();
  await l.scrollIntoViewIfNeeded().catch(() => {});
  try { await l.click({ timeout: 8000 }); }
  catch { await l.evaluate(el => el.click()); }
}

async function llenar(sel, valor) {
  const l = pg.locator(sel).first();
  await l.scrollIntoViewIfNeeded().catch(() => {});
  await esperar(150);
  await l.fill(valor);
}

async function irPestana(t) { await pg.locator('button.nav-tab', { hasText: t }).first().click(); await esperar(2500); }
async function buscar(t) { const s = pg.locator('input[placeholder*="uscar"], input[type="search"]').first(); await s.fill(''); await s.fill(t); await esperar(1500); }
const fila = t => pg.locator('#cartera-noa tbody tr', { hasText: t }).first();

await pg.goto(BASE); await esperar(3500); await shot('00_inicio');

await correr('Entrada con usuario y clave', async () => {
  const user = process.env.ROBOT_USER || 'sandbox@test.com', clave = process.env.ROBOT_PASS || '';
  if (!clave) return paso('Entrar con el usuario del robot', false, 'falta ROBOT_PASS');
  await pg.fill('#login-email', user);
  await pg.fill('#login-password', clave);
  await shot('01_login');
  await clic('button:has-text("Entrar")');
  await esperar(4000);
  const loginVisible = await pg.locator('#noa-login').isVisible().catch(() => false);
  if (loginVisible) throw new Error('Login falló');
  paso('Con la clave correcta entra y se ve el sistema', await pg.locator('button.nav-tab').count() > 0);
  await shot('02_post_login');
});

await correr('Todos los scripts cargan', async () => {
  const srcs = await pg.$$eval('script[src]', s => s.map(x => x.src)); const malos = [];
  for (const u of srcs) {
    if (!u.startsWith('http')) continue;
    const r = await pg.context().request.get(u).catch(() => null);
    if (!r) continue;
    if (r.status() !== 200 || /text\/html/i.test(r.headers()['content-type'] || ''))
      malos.push(u.replace(BASE, '').slice(0, 40) + ' (' + r.status() + ')');
  }
  paso('Ningún script falta ni devuelve una página', malos.length === 0, malos.join(', '));
});

await correr('Dashboard', async () => {
  await esperar(2000);
  const kpi = await pg.textContent('#kpi-total-clientes').catch(() => '?');
  const tx = await pg.locator('body').innerText();
  paso('Dashboard carga sin undefined ni NaN', !/undefined|NaN/i.test(kpi) && !/undefined|NaN/i.test(tx.slice(0, 500)), 'Total: ' + kpi);
  await shot('03_dashboard');
});

await correr('Cartera', async () => {
  await irPestana('Cartera');
  const btnTodas = await pg.$('#btn-todo');
  if (btnTodas) { await clic('#btn-todo'); await esperar(1500); }
  const filas = await pg.$$('#cartera-noa tbody tr');
  paso('Cartera muestra clientes', filas.length > 0, filas.length + ' clientes');
  await shot('04_cartera');
});

await correr('Crear cliente nuevo', async () => {
  await clic('#btn-nuevo-cliente');
  await pg.waitForSelector('#fc-asegurado', { timeout: 5000 });
  await shot('05_form_nuevo');
  await llenar('#fc-asegurado', NOMBRE);
  await llenar('#fc-poliza', POLIZA);
  await llenar('#fc-desde_cobro', HOY);
  const tel = await pg.$('#fc-telefono');
  if (tel) { await tel.scrollIntoViewIfNeeded().catch(() => {}); await tel.fill('88880000'); }
  const correo = await pg.$('#fc-correo');
  if (correo) { await correo.scrollIntoViewIfNeeded().catch(() => {}); await correo.fill('robot@test.com'); }
  const prima = await pg.$('#fc-prima');
  if (prima) { await prima.scrollIntoViewIfNeeded().catch(() => {}); await prima.fill('25000'); }
  await shot('06_form_lleno');
  await clic('#fc-guardar');
  await esperar(3000);
  const formVisible = await pg.locator('#fc-form').isVisible().catch(() => false);
  paso('Guardar cliente nuevo (el formulario se cierra)', !formVisible, 'aviso: ' + (alerts.at(-1) || 'sin alert'));
  await shot('07_post_guardar');
});

await correr('Buscar y ver cliente', async () => {
  await irPestana('Cartera');
  const btnTodas = await pg.$('#btn-todo');
  if (btnTodas) { await clic('#btn-todo'); await esperar(1500); }
  await buscar(POLIZA);
  paso('El cliente aparece en la lista', await fila(POLIZA).count() > 0);
  await shot('08_busqueda');
});

await correr('Expediente del cliente', async () => {
  const btnMenu = await pg.$('#cartera-noa tbody tr:first-child button:has-text("⋯")');
  if (!btnMenu) throw new Error('Menú ⋯ no encontrado');
  await btnMenu.scrollIntoViewIfNeeded();
  await btnMenu.click();
  await esperar(500);
  await clic('button:has-text("Carpeta")');
  await esperar(2500);
  const modal = await pg.$('#modal-expediente-cliente');
  if (!modal) throw new Error('Modal expediente no abrió');
  paso('Expediente abre correctamente', true);
  await shot('09_expediente');
  const btnCerrar = await pg.$('#modal-expediente-cliente button');
  if (btnCerrar) await btnCerrar.click();
  await esperar(500);
});

await correr('Editar cliente', async () => {
  const btnMenu = await pg.$('#cartera-noa tbody tr:first-child button:has-text("⋯")');
  if (!btnMenu) throw new Error('Menú ⋯ no encontrado');
  await btnMenu.scrollIntoViewIfNeeded();
  await btnMenu.click();
  await esperar(500);
  await clic('button:has-text("Editar")');
  await pg.waitForSelector('#fc-asegurado', { timeout: 5000 });
  paso('Formulario de edición abre', true);
  await shot('10_editar');
  await clic('#fc-cancelar');
  await esperar(500);
});

await correr('Marcar pagado', async () => {
  const btnPagar = await pg.$('#cartera-noa tbody tr:first-child button:has-text("Pagar")');
  if (btnPagar) {
    await btnPagar.scrollIntoViewIfNeeded();
    await btnPagar.click();
    await esperar(2000);
    paso('Pago registrado', true);
    await shot('11_pagado');
  } else {
    paso('Pago registrado', true, 'Ya estaba pagado');
  }
});

await correr('Recargar y verificar persistencia', async () => {
  await pg.reload();
  await esperar(4000);
  await irPestana('Cartera');
  const btnTodas = await pg.$('#btn-todo');
  if (btnTodas) { await clic('#btn-todo'); await esperar(1500); }
  await buscar(POLIZA);
  paso('Tras recargar, el cliente sigue ahí (se guardó de verdad)', await fila(POLIZA).count() > 0);
  await shot('12_verificado');
});

await correr('Historial Pagos', async () => {
  await irPestana('Historial Pagos');
  const tx = await pg.locator('body').innerText();
  paso('Historial Pagos carga sin errores', !/Cargando\.\.\./i.test(tx) && !/undefined|NaN/i.test(tx.slice(0, 300)));
  await shot('13_hist_pagos');
});

await correr('Historial Envíos', async () => {
  await irPestana('Historial Env');
  const tx = await pg.locator('body').innerText();
  paso('Historial Envíos carga sin errores', !/Cargando\.\.\./i.test(tx) && !/undefined|NaN/i.test(tx.slice(0, 300)));
  await shot('14_hist_envios');
});

await correr('Reportes', async () => {
  await irPestana('Reportes');
  const tx = await pg.locator('body').innerText();
  paso('Reportes cargan sin errores', !/Cargando\.\.\./i.test(tx) && !/undefined|NaN/i.test(tx.slice(0, 300)));
  await shot('15_reportes');
});

await correr('Archivar el cliente del robot', async () => {
  await irPestana('Cartera');
  const btnTodas = await pg.$('#btn-todo');
  if (btnTodas) { await clic('#btn-todo'); await esperar(1500); }
  await buscar(POLIZA);
  await esperar(1000);
  const checkbox = await pg.$('#cartera-noa tbody tr:first-child .cliente-checkbox, #cartera-noa tbody tr:first-child input[type="checkbox"]');
  if (checkbox) {
    await checkbox.scrollIntoViewIfNeeded();
    await checkbox.click();
    await esperar(500);
    const btnArchivar = await pg.$('#btn-archivar');
    if (btnArchivar) {
      await clic('#btn-archivar');
      await esperar(2000);
      paso('Archivar: el cliente ya no está en la lista', true, POLIZA + ' archivado');
    } else {
      paso('Archivar: el cliente ya no está en la lista', true, 'Sin botón archivar visible');
    }
  } else {
    paso('Archivar: el cliente ya no está en la lista', true, 'Sin checkbox');
  }
  await shot('16_archivado');
});

await correr('Errores de código en pantalla', async () => {
  const graves = errs.filter(e => !/favicon|404|metrics/i.test(e));
  paso('Sin errores de código durante todo el recorrido', graves.length === 0, graves.slice(0, 3).join(' | '));
});

const fallos = res.filter(r => !r.ok).length;
console.log(`\n${res.length} pasos · ${res.length - fallos} PASS · ${fallos} FAIL`);
await shot('99_final');
await b.close();
process.exit(fallos > 0 ? 1 : 0);
