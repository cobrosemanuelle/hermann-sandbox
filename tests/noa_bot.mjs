import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH || 'playwright');
const BASE = process.env.BASE_URL || 'https://hermann-sandbox.vercel.app';
const SLOW = +(process.env.SLOW || 350), HEADED = process.env.HEADLESS !== '1', EXE = process.env.CHROME_EXE || undefined;
const stamp = new Date().toISOString().replace(/\D/g, '').slice(2, 12);
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
await correr('Scripts cargan', async () => {
  const srcs = await pg.$$eval('script[src]', s => s.map(x => x.src));
  const malos = [];
  for (const u of srcs) { if (!u.startsWith('http')) continue; try { const r = await pg.context().request.get(u); if (r.status() !== 200 || /text\/html/i.test(r.headers()['content-type'] || '')) malos.push(u.replace(BASE, '').slice(0, 40)); } catch {} }
  paso('Ningún script falta', malos.length === 0, malos.join(', '));
});
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
await correr('Dashboard', async () => { await esperar(2000); const k = await pg.textContent('#kpi-total-clientes'); paso('KPIs cargan', !/undefined|NaN/i.test(k), 'Total: ' + k); await shot('04_dashboard'); });
await correr('Cartera', async () => { await pg.click('button.nav-tab:has-text("Cartera")'); await esperar(2000); const t = await pg.$('button:has-text("TODAS")'); if (t) await t.click(); await esperar(1500); const f = await pg.$$('#cartera-noa tbody tr'); paso('Clientes visibles', f.length > 0, f.length + ' filas'); await shot('05_cartera'); });
await correr('Expediente', async () => { const c = await pg.$('#cartera-noa tbody tr:first-child td'); if (!c) throw new Error('Sin filas'); await c.click(); await esperar(2000); paso('Expediente abre', true); await shot('06_expediente'); const x = await pg.$('button:has-text("Cerrar"), button:has-text("X")'); if (x) await x.click(); });
await correr('Historial Pagos', async () => { await pg.click('button.nav-tab:has-text("Historial Pagos")'); await esperar(2000); paso('Historial Pagos OK', true); await shot('07_pagos'); });
await correr('Historial Envíos', async () => { await pg.click('button.nav-tab:has-text("Historial Env")'); await esperar(2000); paso('Historial Envíos OK', true); await shot('08_envios'); });
await correr('Reportes', async () => { await pg.click('button.nav-tab:has-text("Reportes")'); await esperar(2000); paso('Reportes OK', true); await shot('09_reportes'); });
await correr('Errores JS', async () => { const g = errs.filter(e => !/favicon|404/i.test(e)); paso('Sin errores graves', g.length === 0, g.slice(0, 3).join(' | ')); });
const f = res.filter(r => !r.ok).length; console.log('\n' + res.length + ' pasos · ' + (res.length - f) + ' PASS · ' + f + ' FAIL');
await b.close(); process.exit(f > 0 ? 1 : 0);
