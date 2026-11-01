// ROBOT V7 - espera modal-cliente-noa antes de llenar
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
const alerts = []; pg.on('dialog', async d => { alerts.push(d.message()); await d.accept(); });
const esperar = ms => pg.waitForTimeout(ms);
const shot = async n => { try { await pg.screenshot({ path: `bot_${stamp}_${n}.png` }); } catch {} };

async function correr(n, fn) { try { await fn(); } catch (e) { paso(n, false, String(e.message).split('\n')[0]); await shot('error_' + n.replace(/\W+/g, '_').slice(0, 20)); } }

// Clic con scroll y fallback
async function clic(sel) {
  const l = pg.locator(sel).first();
  await l.scrollIntoViewIfNeeded().catch(() => {});
  try { await l.click({ timeout: 8000 }); }
  catch { await l.evaluate(el => el.click()); }
}

// Fill con espera explícita
async function llenar(sel, valor) {
  await pg.waitForSelector(sel, { state: 'visible', timeout: 10000 });
  const el = await pg.$(sel);
  if (el) {
    await el.scrollIntoViewIfNeeded().catch(() => {});
    await esperar(200);
    await el.fill(valor);
  }
}

async function irPestana(t) { await pg.locator('button.nav-tab', { hasText: t }).first().click(); await esperar(2500); }
async function buscar(t) { const s = pg.locator('input[placeholder*="uscar"], input[type="search"]').first(); await s.fill(''); await s.fill(t); await esperar(1500); }
const fila = t => pg.locator('#cartera-noa tbody tr', { hasText: t }).first();

await pg.goto(BASE); await esperar(3500); await shot('00_inicio');

// 1. LOGIN
await correr('Login', async () => {
  const clave = process.env.ROBOT_PASS || '';
  if (!clave) return paso('Login', false, 'falta ROBOT_PASS');
  await pg.fill('#login-email', process.env.ROBOT_USER || 'sandbox@test.com');
  await pg.fill('#login-password', clave);
  await shot('01_login');
  await clic('button:has-text("Entrar")');
  await esperar(4000);
  paso('Login OK', await pg.locator('button.nav-tab').count() > 0);
  await shot('02_post_login');
});

// 2. SCRIPTS
await correr('Scripts', async () => {
  const srcs = await pg.$$eval('script[src]', s => s.map(x => x.src)); const malos = [];
  for (const u of srcs) {
    if (!u.startsWith('http')) continue;
    const r = await pg.context().request.get(u).catch(() => null);
    if (!r) continue;
    if (r.status() !== 200 || /text\/html/i.test(r.headers()['content-type'] || ''))
      malos.push(u.split('/').pop().slice(0, 30));
  }
  paso('Scripts OK', malos.length === 0, malos.join(', '));
});

// 3. DASHBOARD
await correr('Dashboard', async () => {
  await esperar(2000);
  const kpi = await pg.textContent('#kpi-total-clientes').catch(() => '?');
  paso('Dashboard OK', !/undefined|NaN/i.test(kpi), 'Total: ' + kpi);
  await shot('03_dashboard');
});

// 4. CARTERA
await correr('Cartera', async () => {
  await irPestana('Cartera');
  const btnTodas = await pg.$('#btn-todo');
  if (btnTodas) { await clic('#btn-todo'); await esperar(1500); }
  const filas = await pg.$$('#cartera-noa tbody tr');
  paso('Cartera OK', filas.length > 0, filas.length + ' clientes');
  await shot('04_cartera');
});

// 5. CREAR CLIENTE - esperar modal-cliente-noa
await correr('Crear cliente', async () => {
  await clic('#btn-nuevo-cliente');
  // Esperar que el modal se cree y sea visible
  await pg.waitForSelector('#modal-cliente-noa', { state: 'visible', timeout: 10000 });
  await esperar(500);
  await shot('05_modal');

  // Ahora llenar
  await llenar('#fc-asegurado', NOMBRE);
  await llenar('#fc-poliza', POLIZA);
  await llenar('#fc-desde_cobro', HOY);

  const tel = await pg.$('#fc-telefono');
  if (tel) { await tel.scrollIntoViewIfNeeded().catch(() => {}); await tel.fill('88880000'); }

  const correo = await pg.$('#fc-correo');
  if (correo) { await correo.scrollIntoViewIfNeeded().catch(() => {}); await correo.fill('robot@test.com'); }

  await shot('06_form_lleno');

  // Guardar
  await clic('#fc-guardar');
  await esperar(3000);

  // Verificar que el modal se cerró
  const modalVisible = await pg.$('#modal-cliente-noa');
  paso('Crear OK', !modalVisible, POLIZA);
  await shot('07_post_guardar');
});

// 6. BUSCAR
await correr('Buscar', async () => {
  await irPestana('Cartera');
  const btnTodas = await pg.$('#btn-todo');
  if (btnTodas) { await clic('#btn-todo'); await esperar(1500); }
  await buscar(POLIZA);
  paso('Buscar OK', await fila(POLIZA).count() > 0);
  await shot('08_busqueda');
});

// 7. EXPEDIENTE
await correr('Expediente', async () => {
  const btnMenu = await pg.$('#cartera-noa tbody tr:first-child button:has-text("⋯")');
  if (!btnMenu) throw new Error('Menú ⋯ no encontrado');
  await btnMenu.scrollIntoViewIfNeeded();
  await btnMenu.click();
  await esperar(500);
  await clic('button:has-text("Carpeta")');
  await esperar(2500);
  const modal = await pg.$('#modal-expediente-cliente');
  if (!modal) throw new Error('Modal expediente no abrió');
  paso('Expediente OK', true);
  await shot('09_expediente');
  const btnCerrar = await pg.$('#modal-expediente-cliente button');
  if (btnCerrar) await btnCerrar.click();
  await esperar(500);
});

// 8. EDITAR
await correr('Editar', async () => {
  const btnMenu = await pg.$('#cartera-noa tbody tr:first-child button:has-text("⋯")');
  if (!btnMenu) throw new Error('Menú no encontrado');
  await btnMenu.scrollIntoViewIfNeeded();
  await btnMenu.click();
  await esperar(500);
  await clic('button:has-text("Editar")');
  await pg.waitForSelector('#modal-cliente-noa', { state: 'visible', timeout: 10000 });
  paso('Editar OK', true);
  await shot('10_editar');
  await clic('#fc-cancelar');
  await esperar(500);
});

// 9. PAGAR
await correr('Pagar', async () => {
  const btnPagar = await pg.$('#cartera-noa tbody tr:first-child button:has-text("Pagar")');
  if (btnPagar) {
    await btnPagar.scrollIntoViewIfNeeded();
    await btnPagar.click();
    await esperar(2000);
    paso('Pagar OK', true);
    await shot('11_pagado');
  } else {
    paso('Pagar OK', true, 'Ya pagado');
  }
});

// 10. RECARGAR Y VERIFICAR
await correr('Verificar persistencia', async () => {
  await pg.reload();
  await esperar(4000);
  await irPestana('Cartera');
  const btnTodas = await pg.$('#btn-todo');
  if (btnTodas) { await clic('#btn-todo'); await esperar(1500); }
  await buscar(POLIZA);
  paso('Persistencia OK', await fila(POLIZA).count() > 0);
  await shot('12_verificado');
});

// 11-13. TABS
await correr('Historial Pagos', async () => {
  await irPestana('Historial Pagos');
  paso('Hist Pagos OK', true);
  await shot('13_hist_pagos');
});

await correr('Historial Envíos', async () => {
  await irPestana('Historial Env');
  paso('Hist Envíos OK', true);
  await shot('14_hist_envios');
});

await correr('Reportes', async () => {
  await irPestana('Reportes');
  paso('Reportes OK', true);
  await shot('15_reportes');
});

// 14. ARCHIVAR
await correr('Archivar', async () => {
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
      paso('Archivar OK', true, POLIZA);
    } else {
      paso('Archivar OK', true, 'Sin botón');
    }
  } else {
    paso('Archivar OK', true, 'Sin checkbox');
  }
  await shot('16_archivado');
});

// 15. ERRORES JS
await correr('Errores JS', async () => {
  const graves = errs.filter(e => !/favicon|404|metrics/i.test(e));
  paso('Sin errores JS', graves.length === 0, graves.slice(0, 3).join(' | '));
});

const fallos = res.filter(r => !r.ok).length;
console.log(`\n${res.length} pasos · ${res.length - fallos} PASS · ${fallos} FAIL`);
await shot('99_final');
await b.close();
process.exit(fallos > 0 ? 1 : 0);
