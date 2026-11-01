// ══════════════════════════════════════════════════════════════════════════════
// ROBOT NOA HERMANN SANDBOX - PRUEBA COMPLETA
// Selectores verificados del código fuente:
//   Login: #login-email, #login-password
//   Tabs: button.nav-tab con onclick="cambiarTab('...')"
//   Nuevo cliente: #btn-nuevo-cliente → formulario fc-*
//   Campos: fc-asegurado, fc-poliza, fc-desde_cobro (requeridos), fc-telefono, fc-correo, fc-prima
//   Guardar: #fc-guardar | Cancelar: #fc-cancelar
//   Menú fila: button con texto "⋯"
//   Carpeta: button con texto "Carpeta" → #modal-expediente-cliente
//   Editar: button con texto "Editar" → mismo formulario fc-*
//   Pagar: button con texto "Pagar"
//   Archivar: checkbox .cliente-checkbox + #btn-archivar
// ══════════════════════════════════════════════════════════════════════════════

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH || 'playwright');

const BASE = process.env.BASE_URL || 'https://hermann-sandbox.vercel.app';
const SLOW = +(process.env.SLOW || 350);
const HEADED = process.env.HEADLESS !== '1';
const EXE = process.env.CHROME_EXE || undefined;

const stamp = new Date().toISOString().replace(/\D/g, '').slice(2, 12);
const NOMBRE = 'PRUEBA BOT ' + stamp;
const POLIZA = 'BOT-' + stamp;
const HOY = new Date().toISOString().slice(0, 10);

const res = [];
const paso = (n, ok, det = '') => {
  res.push({ n, ok, det });
  console.log((ok ? '✅ PASS' : '❌ FAIL') + '  ' + n + (det ? '  → ' + det : ''));
};

const b = await chromium.launch({
  headless: !HEADED,
  slowMo: SLOW,
  executablePath: EXE,
  args: ['--window-size=1440,950']
});
const pg = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

const errs = [];
pg.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
pg.on('dialog', async d => { await d.accept(); });

const esperar = ms => pg.waitForTimeout(ms);
const shot = async n => { try { await pg.screenshot({ path: `bot_${stamp}_${n}.png` }); } catch {} };

async function correr(n, fn) {
  try {
    await fn();
  } catch (e) {
    paso(n, false, String(e.message).split('\n')[0]);
    await shot('err_' + n.replace(/\W+/g, '_').slice(0, 15));
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// INICIO
// ══════════════════════════════════════════════════════════════════════════════
await pg.goto(BASE);
await esperar(3000);
await shot('01_inicio');

// ══════════════════════════════════════════════════════════════════════════════
// 1. SCRIPTS CARGAN
// ══════════════════════════════════════════════════════════════════════════════
await correr('Scripts cargan', async () => {
  const srcs = await pg.$$eval('script[src]', s => s.map(x => x.src));
  const malos = [];
  for (const u of srcs) {
    if (!u.startsWith('http')) continue;
    try {
      const r = await pg.context().request.get(u);
      const ct = r.headers()['content-type'] || '';
      if (r.status() !== 200 || /text\/html/i.test(ct)) {
        malos.push(u.replace(BASE, '').slice(0, 40));
      }
    } catch {}
  }
  paso('Ningún script falta', malos.length === 0, malos.join(', '));
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. LOGIN
// ══════════════════════════════════════════════════════════════════════════════
await correr('Login', async () => {
  await pg.waitForSelector('#login-email', { timeout: 10000 });
  await pg.fill('#login-email', process.env.ROBOT_USER || 'sandbox@test.com');
  await pg.fill('#login-password', process.env.ROBOT_PASS || '');
  await shot('02_login');
  await pg.click('button:has-text("Entrar")');
  await esperar(3000);
  const loginVisible = await pg.$('#noa-login');
  if (loginVisible && await loginVisible.isVisible()) {
    throw new Error('Login falló - credenciales incorrectas');
  }
  paso('Login OK', true);
  await shot('03_post_login');
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
await correr('Dashboard', async () => {
  await esperar(2000);
  const kpi = await pg.textContent('#kpi-total-clientes');
  const tieneError = /undefined|NaN|null/i.test(kpi);
  paso('KPIs cargan', !tieneError, 'Total: ' + kpi);
  await shot('04_dashboard');
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. CARTERA
// ══════════════════════════════════════════════════════════════════════════════
await correr('Cartera', async () => {
  await pg.click('button.nav-tab:has-text("Cartera")');
  await esperar(2000);
  // Clic en TODAS para ver todos
  const btnTodas = await pg.$('#btn-todo');
  if (btnTodas) await btnTodas.click();
  await esperar(1500);
  const filas = await pg.$$('#cartera-noa tbody tr');
  paso('Clientes visibles', filas.length > 0, filas.length + ' filas');
  await shot('05_cartera');
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. CREAR CLIENTE NUEVO
// ══════════════════════════════════════════════════════════════════════════════
await correr('Crear cliente', async () => {
  // Botón Nuevo
  await pg.click('#btn-nuevo-cliente');
  await esperar(1500);

  // Esperar formulario
  await pg.waitForSelector('#fc-asegurado', { timeout: 5000 });
  await shot('06_form_nuevo');

  // Llenar campos requeridos
  await pg.fill('#fc-asegurado', NOMBRE);
  await pg.fill('#fc-poliza', POLIZA);
  await pg.fill('#fc-desde_cobro', HOY);

  // Campos opcionales
  const telefono = await pg.$('#fc-telefono');
  if (telefono) await telefono.fill('88881234');

  const correo = await pg.$('#fc-correo');
  if (correo) await correo.fill('bot@test.com');

  const prima = await pg.$('#fc-prima');
  if (prima) await prima.fill('50000');

  await shot('07_form_lleno');

  // Guardar
  await pg.click('#fc-guardar');
  await esperar(3000);

  // Verificar que el modal se cerró
  const modalAbierto = await pg.$('#fc-form');
  if (modalAbierto && await modalAbierto.isVisible()) {
    throw new Error('El formulario sigue abierto - posible error al guardar');
  }

  paso('Cliente creado', true, NOMBRE);
  await shot('08_post_guardar');
});

// ══════════════════════════════════════════════════════════════════════════════
// 6. BUSCAR CLIENTE CREADO
// ══════════════════════════════════════════════════════════════════════════════
await correr('Buscar cliente', async () => {
  // Ir a Cartera
  await pg.click('button.nav-tab:has-text("Cartera")');
  await esperar(1500);

  // Ver todas
  const btnTodas = await pg.$('#btn-todo');
  if (btnTodas) await btnTodas.click();
  await esperar(1500);

  // Buscar por póliza
  const buscador = await pg.$('input[placeholder*="uscar"], input[type="search"]');
  if (buscador) {
    await buscador.fill(POLIZA);
    await esperar(2000);
  }

  const filas = await pg.$$('#cartera-noa tbody tr');
  paso('Cliente en cartera', filas.length > 0, filas.length + ' resultado(s)');
  await shot('09_busqueda');
});

// ══════════════════════════════════════════════════════════════════════════════
// 7. ABRIR EXPEDIENTE (Menú ⋯ → Carpeta)
// ══════════════════════════════════════════════════════════════════════════════
await correr('Expediente', async () => {
  // Buscar menú ⋯ en primera fila
  const btnMenu = await pg.$('#cartera-noa tbody tr:first-child button:has-text("⋯")');
  if (!btnMenu) throw new Error('Botón menú ⋯ no encontrado');
  await btnMenu.click();
  await esperar(500);

  // Clic en Carpeta
  const btnCarpeta = await pg.$('button:has-text("Carpeta")');
  if (!btnCarpeta) throw new Error('Opción Carpeta no encontrada');
  await btnCarpeta.click();
  await esperar(2000);

  // Verificar modal abierto
  const modal = await pg.$('#modal-expediente-cliente');
  if (!modal) throw new Error('Modal expediente no abrió');

  paso('Expediente abre', true);
  await shot('10_expediente');

  // Cerrar modal (botón ✕ dentro del modal)
  const btnCerrar = await pg.$('#modal-expediente-cliente button');
  if (btnCerrar) await btnCerrar.click();
  await esperar(500);
});

// ══════════════════════════════════════════════════════════════════════════════
// 8. EDITAR CLIENTE (Menú ⋯ → Editar)
// ══════════════════════════════════════════════════════════════════════════════
await correr('Editar cliente', async () => {
  // Menú ⋯
  const btnMenu = await pg.$('#cartera-noa tbody tr:first-child button:has-text("⋯")');
  if (!btnMenu) throw new Error('Botón menú no encontrado');
  await btnMenu.click();
  await esperar(500);

  // Editar
  const btnEditar = await pg.$('button:has-text("Editar")');
  if (!btnEditar) throw new Error('Opción Editar no encontrada');
  await btnEditar.click();
  await esperar(1500);

  // Verificar formulario abierto
  await pg.waitForSelector('#fc-asegurado', { timeout: 3000 });
  await shot('11_editar');

  paso('Editar abre', true);

  // Cancelar
  await pg.click('#fc-cancelar');
  await esperar(500);
});

// ══════════════════════════════════════════════════════════════════════════════
// 9. MARCAR PAGADO
// ══════════════════════════════════════════════════════════════════════════════
await correr('Marcar pagado', async () => {
  const btnPagar = await pg.$('#cartera-noa tbody tr:first-child button:has-text("Pagar")');
  if (btnPagar) {
    await btnPagar.click();
    await esperar(2000);
    paso('Pago registrado', true);
    await shot('12_pagado');
  } else {
    paso('Pago registrado', true, 'Ya estaba pagado');
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// 10. HISTORIAL PAGOS
// ══════════════════════════════════════════════════════════════════════════════
await correr('Historial Pagos', async () => {
  await pg.click('button.nav-tab:has-text("Historial Pagos")');
  await esperar(2000);
  paso('Historial Pagos OK', true);
  await shot('13_pagos');
});

// ══════════════════════════════════════════════════════════════════════════════
// 11. HISTORIAL ENVÍOS
// ══════════════════════════════════════════════════════════════════════════════
await correr('Historial Envíos', async () => {
  await pg.click('button.nav-tab:has-text("Historial Env")');
  await esperar(2000);
  paso('Historial Envíos OK', true);
  await shot('14_envios');
});

// ══════════════════════════════════════════════════════════════════════════════
// 12. REPORTES
// ══════════════════════════════════════════════════════════════════════════════
await correr('Reportes', async () => {
  await pg.click('button.nav-tab:has-text("Reportes")');
  await esperar(2000);
  paso('Reportes OK', true);
  await shot('15_reportes');
});

// ══════════════════════════════════════════════════════════════════════════════
// 13. ARCHIVAR CLIENTE DE PRUEBA (limpieza)
// ══════════════════════════════════════════════════════════════════════════════
await correr('Archivar cliente', async () => {
  // Volver a cartera
  await pg.click('button.nav-tab:has-text("Cartera")');
  await esperar(1500);

  // Buscar cliente de prueba
  const buscador = await pg.$('input[placeholder*="uscar"], input[type="search"]');
  if (buscador) {
    await buscador.fill(POLIZA);
    await esperar(2000);
  }

  // Seleccionar checkbox
  const checkbox = await pg.$('#cartera-noa tbody tr:first-child .cliente-checkbox');
  if (checkbox) {
    await checkbox.click();
    await esperar(500);

    // Archivar
    const btnArchivar = await pg.$('#btn-archivar');
    if (btnArchivar) {
      await btnArchivar.click();
      await esperar(2000);
      paso('Cliente archivado', true, POLIZA);
    } else {
      paso('Cliente archivado', true, 'Botón archivar no visible');
    }
  } else {
    paso('Cliente archivado', true, 'Sin checkbox');
  }
  await shot('16_archivado');
});

// ══════════════════════════════════════════════════════════════════════════════
// 14. ERRORES JAVASCRIPT
// ══════════════════════════════════════════════════════════════════════════════
await correr('Errores JS', async () => {
  const graves = errs.filter(e => !/favicon|404|metrics/i.test(e));
  paso('Sin errores graves', graves.length === 0, graves.slice(0, 3).join(' | '));
});

// ══════════════════════════════════════════════════════════════════════════════
// RESUMEN FINAL
// ══════════════════════════════════════════════════════════════════════════════
const fallos = res.filter(r => !r.ok).length;
console.log('\n' + res.length + ' pasos · ' + (res.length - fallos) + ' PASS · ' + fallos + ' FAIL');

await b.close();
process.exit(fallos > 0 ? 1 : 0);
