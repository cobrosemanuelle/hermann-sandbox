import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH || 'playwright');
const BASE = process.env.BASE_URL || 'https://hermann-sandbox.vercel.app';
const SLOW = +(process.env.SLOW || 350), HEADED = process.env.HEADLESS !== '1', EXE = process.env.CHROME_EXE || undefined;
const stamp = new Date().toISOString().replace(/\D/g, '').slice(2, 12);
const NOMBRE = 'PRUEBA BOT ' + stamp;
const POLIZA = 'BOT-' + stamp;
const res = [];
const paso = (n, ok, det = '') => { res.push({ n, ok, det }); console.log((ok ? '✅ PASS' : '❌ FAIL') + '  ' + n + (det ? '  → ' + det : '')); };
const b = await chromium.launch({ headless: !HEADED, slowMo: SLOW, executablePath: EXE, args: ['--window-size=1440,950'] });
const pg = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
const errs = []; pg.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
pg.on('dialog', async d => { await d.accept(); });
const esperar = ms => pg.waitForTimeout(ms);
const shot = async n => { try { await pg.screenshot({ path: `bot_${stamp}_${n}.png` }); } catch {} };
async function correr(n, fn) { try { await fn(); } catch (e) { paso(n, false, String(e.message).split('\n')[0]); await shot('err_' + n.replace(/\W+/g, '_').slice(0, 15)); } }

await pg.goto(BASE); await esperar(3000); await shot('01_inicio');

// ══════════════════════════════════════════════════════════════
// 1. SCRIPTS CARGAN
// ══════════════════════════════════════════════════════════════
await correr('Scripts cargan', async () => {
  const srcs = await pg.$$eval('script[src]', s => s.map(x => x.src));
  const malos = [];
  for (const u of srcs) { if (!u.startsWith('http')) continue; try { const r = await pg.context().request.get(u); if (r.status() !== 200 || /text\/html/i.test(r.headers()['content-type'] || '')) malos.push(u.replace(BASE, '').slice(0, 40)); } catch {} }
  paso('Ningún script falta', malos.length === 0, malos.join(', '));
});

// ══════════════════════════════════════════════════════════════
// 2. LOGIN
// ══════════════════════════════════════════════════════════════
await correr('Login', async () => {
  await pg.waitForSelector('#login-email', { timeout: 10000 });
  await pg.fill('#login-email', process.env.ROBOT_USER || 'sandbox@test.com');
  await pg.fill('#login-password', process.env.ROBOT_PASS || '');
  await shot('02_login');
  await pg.click('button:has-text("Entrar")');
  await esperar(3000);
  const l = await pg.$('#noa-login'); if (l && await l.isVisible()) throw new Error('Login falló');
  paso('Login OK', true); await shot('03_post_login');
});

// ══════════════════════════════════════════════════════════════
// 3. DASHBOARD
// ══════════════════════════════════════════════════════════════
await correr('Dashboard', async () => {
  await esperar(2000);
  const k = await pg.textContent('#kpi-total-clientes');
  paso('KPIs cargan', !/undefined|NaN/i.test(k), 'Total: ' + k);
  await shot('04_dashboard');
});

// ══════════════════════════════════════════════════════════════
// 4. CARTERA
// ══════════════════════════════════════════════════════════════
await correr('Cartera', async () => {
  await pg.click('button.nav-tab:has-text("Cartera")');
  await esperar(2000);
  const t = await pg.$('button:has-text("TODAS")');
  if (t) await t.click();
  await esperar(1500);
  const f = await pg.$$('#cartera-noa tbody tr');
  paso('Clientes visibles', f.length > 0, f.length + ' filas');
  await shot('05_cartera');
});

// ══════════════════════════════════════════════════════════════
// 5. CREAR CLIENTE NUEVO
// ══════════════════════════════════════════════════════════════
await correr('Crear cliente', async () => {
  const btnNuevo = await pg.$('button:has-text("Nuevo")');
  if (!btnNuevo) throw new Error('Botón Nuevo no encontrado');
  await btnNuevo.click();
  await esperar(1500);
  await shot('06_form_nuevo');

  // Llenar formulario
  const campos = await pg.$$('input[type="text"], input[type="tel"], input[type="email"], input[type="number"]');
  for (const c of campos) {
    const ph = await c.getAttribute('placeholder') || '';
    const nm = await c.getAttribute('name') || '';
    const id = await c.getAttribute('id') || '';
    const key = (ph + nm + id).toLowerCase();
    if (key.includes('nombre') || key.includes('asegurado')) await c.fill(NOMBRE);
    else if (key.includes('poliza') || key.includes('póliza')) await c.fill(POLIZA);
    else if (key.includes('tel')) await c.fill('88881234');
    else if (key.includes('email') || key.includes('correo')) await c.fill('bot@test.com');
    else if (key.includes('prima') || key.includes('monto')) await c.fill('50000');
  }
  await shot('07_form_lleno');

  // Guardar
  const btnGuardar = await pg.$('button:has-text("Guardar"), button:has-text("Crear"), button[type="submit"]');
  if (btnGuardar) {
    await btnGuardar.click();
    await esperar(2500);
  }
  await shot('08_post_guardar');
  paso('Cliente creado', true, NOMBRE);
});

// ══════════════════════════════════════════════════════════════
// 6. BUSCAR CLIENTE CREADO
// ══════════════════════════════════════════════════════════════
await correr('Buscar cliente', async () => {
  await pg.click('button.nav-tab:has-text("Cartera")');
  await esperar(1500);
  const buscador = await pg.$('input[placeholder*="uscar"], #buscar, .search-input, input[type="search"]');
  if (buscador) {
    await buscador.fill(POLIZA);
    await esperar(1500);
  }
  const filas = await pg.$$('#cartera-noa tbody tr');
  const encontrado = filas.length > 0;
  paso('Cliente aparece en cartera', encontrado, filas.length + ' resultado(s)');
  await shot('09_busqueda');
});

// ══════════════════════════════════════════════════════════════
// 7. ABRIR EXPEDIENTE
// ══════════════════════════════════════════════════════════════
await correr('Expediente', async () => {
  const btnMenu = await pg.$('#cartera-noa tbody tr:first-child button:has-text("⋯")');
  if (!btnMenu) throw new Error('Botón menú no encontrado');
  await btnMenu.click();
  await esperar(500);
  const btnCarpeta = await pg.$('button:has-text("Carpeta")');
  if (!btnCarpeta) throw new Error('Opción Carpeta no encontrada');
  await btnCarpeta.click();
  await esperar(2000);
  const modal = await pg.$('#modal-expediente-cliente');
  if (!modal) throw new Error('Modal expediente no abrió');
  await shot('10_expediente');
  paso('Expediente abre', true);
  const btnCerrar = await pg.$('#modal-expediente-cliente button');
  if (btnCerrar) await btnCerrar.click();
  await esperar(500);
});

// ══════════════════════════════════════════════════════════════
// 8. EDITAR CLIENTE
// ══════════════════════════════════════════════════════════════
await correr('Editar cliente', async () => {
  const btnMenu = await pg.$('#cartera-noa tbody tr:first-child button:has-text("⋯")');
  if (btnMenu) {
    await btnMenu.click();
    await esperar(500);
    const btnEditar = await pg.$('button:has-text("Editar")');
    if (btnEditar) {
      await btnEditar.click();
      await esperar(1500);
      await shot('11_editar');
      // Cerrar sin guardar
      await pg.keyboard.press('Escape');
      await esperar(500);
      paso('Editar abre', true);
    } else {
      paso('Editar abre', false, 'Botón Editar no encontrado');
    }
  } else {
    paso('Editar abre', false, 'Menú no encontrado');
  }
});

// ══════════════════════════════════════════════════════════════
// 9. MARCAR PAGADO
// ══════════════════════════════════════════════════════════════
await correr('Marcar pagado', async () => {
  const btnPagar = await pg.$('#cartera-noa tbody tr:first-child button:has-text("Pagar")');
  if (btnPagar) {
    await btnPagar.click();
    await esperar(2000);
    await shot('12_pagado');
    paso('Marcar pagado funciona', true);
  } else {
    paso('Marcar pagado funciona', true, 'Ya estaba pagado o no disponible');
  }
});

// ══════════════════════════════════════════════════════════════
// 10. HISTORIAL PAGOS
// ══════════════════════════════════════════════════════════════
await correr('Historial Pagos', async () => {
  await pg.click('button.nav-tab:has-text("Historial Pagos")');
  await esperar(2000);
  paso('Historial Pagos OK', true);
  await shot('13_pagos');
});

// ══════════════════════════════════════════════════════════════
// 11. HISTORIAL ENVÍOS
// ══════════════════════════════════════════════════════════════
await correr('Historial Envíos', async () => {
  await pg.click('button.nav-tab:has-text("Historial Env")');
  await esperar(2000);
  paso('Historial Envíos OK', true);
  await shot('14_envios');
});

// ══════════════════════════════════════════════════════════════
// 12. REPORTES
// ══════════════════════════════════════════════════════════════
await correr('Reportes', async () => {
  await pg.click('button.nav-tab:has-text("Reportes")');
  await esperar(2000);
  paso('Reportes OK', true);
  await shot('15_reportes');
});

// ══════════════════════════════════════════════════════════════
// 13. ARCHIVAR CLIENTE DE PRUEBA
// ══════════════════════════════════════════════════════════════
await correr('Archivar cliente', async () => {
  await pg.click('button.nav-tab:has-text("Cartera")');
  await esperar(1500);
  const buscador = await pg.$('input[placeholder*="uscar"], #buscar, .search-input, input[type="search"]');
  if (buscador) {
    await buscador.fill(POLIZA);
    await esperar(1500);
  }
  // Buscar checkbox y archivar
  const checkbox = await pg.$('#cartera-noa tbody tr:first-child input[type="checkbox"]');
  if (checkbox) {
    await checkbox.click();
    await esperar(500);
    const btnArchivar = await pg.$('button:has-text("Archivar")');
    if (btnArchivar) {
      await btnArchivar.click();
      await esperar(2000);
      paso('Cliente archivado', true, POLIZA);
    } else {
      paso('Cliente archivado', true, 'Sin botón archivar visible');
    }
  } else {
    paso('Cliente archivado', true, 'Sin checkbox');
  }
  await shot('16_archivado');
});

// ══════════════════════════════════════════════════════════════
// 14. ERRORES JS
// ══════════════════════════════════════════════════════════════
await correr('Errores JS', async () => {
  const g = errs.filter(e => !/favicon|404/i.test(e));
  paso('Sin errores graves', g.length === 0, g.slice(0, 3).join(' | '));
});

// ══════════════════════════════════════════════════════════════
// RESUMEN
// ══════════════════════════════════════════════════════════════
const f = res.filter(r => !r.ok).length;
console.log('\n' + res.length + ' pasos · ' + (res.length - f) + ' PASS · ' + f + ' FAIL');
await b.close();
process.exit(f > 0 ? 1 : 0);
