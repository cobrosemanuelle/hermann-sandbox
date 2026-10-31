// NOA Auth - usuarios con clave, sesión de 12 horas y bitácora (cambio #11)
(function () {
  var KT = 'NOA_SESION_E';
  var mem = null;
  var sesion = leer();
  var pendiente = null;
  var rawFetch = window.fetch.bind(window);
  var permiso = null, permisoPend = null;

  function leer() {
    try { var s = JSON.parse(localStorage.getItem(KT) || 'null'); if (s && s.token && s.exp > Date.now()) return s; } catch (e) {}
    return (mem && mem.exp > Date.now()) ? mem : null;
  }
  function guardar(s) { mem = s; try { localStorage.setItem(KT, JSON.stringify(s)); } catch (e) {} }
  function borrar() { mem = null; sesion = null; try { localStorage.removeItem(KT); } catch (e) {} }

  window.NOA_TOKEN = function () { var s = sesion || leer(); return s ? s.token : ''; };
  window.NOA_USUARIO = function () { var s = sesion || leer(); return s ? s.usuario : ''; };

  function enListo(fn) { if (document.body) fn(); else document.addEventListener('DOMContentLoaded', fn); }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function $(id) { return document.getElementById(id); }

  var CSS = '#noa-lg,#noa-lg *,#noa-barra,#noa-barra *{text-transform:none !important;letter-spacing:normal !important}' +
    '#noa-lg input{background:#0b1220 !important;color:#e5e7eb !important;border:1px solid #334155 !important}#noa-lg button{background:#00e6ff !important;color:#001016 !important}#noa-lg button.s{background:transparent !important;color:#94a3b8 !important}' +
    '#noa-lg{position:fixed;inset:0;z-index:2147483000;background:#0b1220;display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,Segoe UI,sans-serif}' +
    '#noa-lg .c{background:#111a2e;border:1px solid #1f2937;border-radius:16px;padding:28px;width:min(92vw,380px);color:#e5e7eb;box-shadow:0 12px 40px rgba(0,0,0,.5)}' +
    '#noa-lg h2{margin:0 0 4px;font-size:20px}#noa-lg p{margin:0 0 16px;color:#94a3b8;font-size:13px}' +
    '#noa-lg input{width:100%;box-sizing:border-box;margin:0 0 10px;padding:10px 12px;border-radius:10px;border:1px solid #334155;background:#0b1220;color:#e5e7eb;font-size:15px}' +
    '#noa-lg button{width:100%;padding:11px;border:0;border-radius:10px;background:#00e6ff;color:#001016;font-weight:700;font-size:15px;cursor:pointer}' +
    '#noa-lg button.s{background:transparent;color:#94a3b8;border:1px solid #334155;margin-top:8px}' +
    '#noa-lg .m{min-height:18px;color:#fca5a5;font-size:13px;margin:0 0 8px}' +
    '#noa-lg.modal{background:rgba(2,6,23,.8)}#noa-lg .ancho{width:min(94vw,860px);max-height:86vh;overflow:auto}' +
    '#noa-lg table{width:100%;border-collapse:collapse;font-size:12.5px}#noa-lg th,#noa-lg td{border-bottom:1px solid #1f2937;padding:6px 8px;text-align:left;vertical-align:top}' +
    '#noa-barra{position:fixed;left:8px;bottom:8px;z-index:9000;display:flex;gap:6px;align-items:center;background:#0b1220;color:#e5e7eb;border:1px solid #1f2937;border-radius:999px;padding:5px 10px;font:12px system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.35)}' +
    '#noa-barra button{background:transparent;border:0;color:#7dd3fc;cursor:pointer;font-size:12px;padding:2px 4px}';

  function estilo() {
    if (document.getElementById('noa-lg-css')) return;
    var s = document.createElement('style'); s.id = 'noa-lg-css'; s.textContent = CSS; document.head.appendChild(s);
  }
  function quitarCapa() { var x = $('noa-lg'); if (x) x.remove(); }
  function capa(html, esModal) {
    quitarCapa();
    var d = document.createElement('div'); d.id = 'noa-lg'; if (esModal) d.className = 'modal'; d.innerHTML = html;
    document.body.appendChild(d); return d;
  }

  async function api(accion, metodo, cuerpo, conToken) {
    var h = { 'Content-Type': 'application/json' };
    if (conToken) h.Authorization = 'Bearer ' + window.NOA_TOKEN();
    var r = await rawFetch('/api/auth?action=' + accion, { method: metodo, headers: h, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
    var j = {}; try { j = await r.json(); } catch (e) {}
    return { ok: r.ok, status: r.status, j: j };
  }

  function pantallaLogin(resolver) {
    estilo();
    capa('<div class="c"><h2>Cobros Emmanuel Esquivel</h2><p>Entre con su usuario y su clave.</p>' +
      '<input id="noa-lg-user" placeholder="Usuario" autocomplete="username" autocapitalize="off">' +
      '<input id="noa-lg-clave" type="password" placeholder="Clave" autocomplete="current-password">' +
      '<div class="m" id="noa-lg-msg"></div><button id="noa-lg-entrar">Entrar</button></div>');
    var u = $('noa-lg-user'), c = $('noa-lg-clave'), m = $('noa-lg-msg'), b = $('noa-lg-entrar');
    async function entrar() {
      m.textContent = ''; b.disabled = true;
      try {
        var r = await api('login', 'POST', { usuario: u.value, clave: c.value }, false);
        if (!r.ok) { m.textContent = (r.j && r.j.error) || 'No se pudo entrar'; b.disabled = false; return; }
        sesion = { token: r.j.token, usuario: r.j.usuario, rol: r.j.rol, exp: Date.now() + 11.5 * 3600 * 1000 };
        guardar(sesion);
        if (r.j.debe_cambiar) return pantallaCambio(c.value, true, resolver);
        terminar(resolver);
      } catch (e) { m.textContent = 'Sin conexión con el sistema'; b.disabled = false; }
    }
    b.onclick = entrar;
    [u, c].forEach(function (x) { x.addEventListener('keydown', function (e) { if (e.key === 'Enter') entrar(); }); });
    setTimeout(function () { u.focus(); }, 50);
  }

  function pantallaCambio(actualPrevia, obligatorio, resolver) {
    estilo();
    capa('<div class="c"><h2>' + (obligatorio ? 'Cree su clave nueva' : 'Cambiar clave') + '</h2><p>' + (obligatorio ? 'Es su primera vez: elija una clave que solo usted sepa (mínimo 8 caracteres).' : 'Mínimo 8 caracteres.') + '</p>' +
      (actualPrevia ? '' : '<input id="noa-cc-act" type="password" placeholder="Clave actual" autocomplete="current-password">') +
      '<input id="noa-cc-nueva" type="password" placeholder="Clave nueva" autocomplete="new-password">' +
      '<input id="noa-cc-rep" type="password" placeholder="Repita la clave nueva" autocomplete="new-password">' +
      '<div class="m" id="noa-cc-msg"></div><button id="noa-cc-ok">Guardar clave</button>' +
      (obligatorio ? '' : '<button class="s" id="noa-cc-x">Cancelar</button>') + '</div>', !obligatorio);
    var m = $('noa-cc-msg');
    $('noa-cc-ok').onclick = async function () {
      var act = actualPrevia || ($('noa-cc-act') || {}).value || '', n = $('noa-cc-nueva').value, r2 = $('noa-cc-rep').value;
      if (n !== r2) { m.textContent = 'Las dos claves nuevas no son iguales'; return; }
      var r = await api('cambiar-clave', 'POST', { actual: act, nueva: n }, true);
      if (!r.ok) { m.textContent = (r.j && r.j.error) || 'No se pudo cambiar'; return; }
      if (obligatorio) terminar(resolver); else { quitarCapa(); alert('Clave cambiada.'); }
    };
    if (!obligatorio) $('noa-cc-x').onclick = quitarCapa;
  }

  /*SEG_FRONT*/
  function pantallaSeguridad(modo, resolver) {
    estilo();
    api('seguridad', 'GET', null, true).then(function (est) {
      var hay = !!(est.j && est.j.hay_clave), pedir = modo === 'pedir';
      var titulo = pedir ? (hay ? 'Clave de seguridad' : 'Cree la clave de seguridad') : (hay ? 'Cambiar clave de seguridad' : 'Crear clave de seguridad');
      var txt = (pedir && hay) ? 'Esto es delicado (cargar un Excel o eliminar datos). Escriba la clave de seguridad.' : 'Es una clave extra, distinta a la de entrar. Protege cargar un Excel y eliminar datos. Mínimo 8 caracteres.';
      capa('<div class="c"><h2>' + titulo + '</h2><p>' + txt + '</p>' +
        ((pedir && hay) ? '<input id="noa-sg-act" type="password" placeholder="Clave de seguridad" autocomplete="off">' :
          (hay ? '<input id="noa-sg-act" type="password" placeholder="Clave de seguridad actual" autocomplete="off">' : '') +
          '<input id="noa-sg-nueva" type="password" placeholder="Clave de seguridad nueva" autocomplete="new-password">' +
          '<input id="noa-sg-rep" type="password" placeholder="Repita la clave nueva" autocomplete="new-password">') +
        '<div class="m" id="noa-sg-msg"></div><button id="noa-sg-ok">' + ((pedir && hay) ? 'Continuar' : 'Guardar clave') + '</button><button class="s" id="noa-sg-x">Cancelar</button></div>', true);
      var m = $('noa-sg-msg');
      function dar(ok) { quitarCapa(); if (resolver) resolver(ok); }
      $('noa-sg-x').onclick = function () { dar(false); };
      $('noa-sg-ok').onclick = async function () {
        var act = ($('noa-sg-act') || {}).value || '';
        if (!(pedir && hay)) {
          var n = $('noa-sg-nueva').value, r2 = $('noa-sg-rep').value;
          if (n !== r2) { m.textContent = 'Las dos claves nuevas no son iguales'; return; }
          var g = await api('clave-seguridad', 'POST', { actual: act, nueva: n }, true);
          if (!g.ok) { m.textContent = (g.j && g.j.error) || 'No se pudo guardar'; return; }
          if (!pedir) { quitarCapa(); alert('Clave de seguridad guardada.'); return; }
          act = n;
        }
        var p = await api('permiso', 'POST', { clave: act }, true);
        if (!p.ok) { m.textContent = (p.j && p.j.error) || 'No se pudo comprobar la clave'; return; }
        permiso = { t: p.j.permiso, hasta: Date.now() + 4 * 60 * 1000 };
        dar(true);
      };
      var f = $('noa-sg-act') || $('noa-sg-nueva'); if (f) setTimeout(function () { f.focus(); }, 50);
    });
  }
  function pedirPermiso() {
    if (permiso && permiso.hasta > Date.now()) return Promise.resolve(true);
    if (!permisoPend) permisoPend = new Promise(function (res) { pantallaSeguridad('pedir', res); }).then(function (v) { permisoPend = null; return v; });
    return permisoPend;
  }

  function terminar(resolver) {
    quitarCapa(); pendiente = null; pintarBarra();
    if (resolver) resolver();
  }

  function pedirLogin() {
    if (sesion && sesion.exp > Date.now()) return Promise.resolve();
    sesion = leer();
    if (sesion) { enListo(pintarBarra); return Promise.resolve(); }
    if (!pendiente) pendiente = new Promise(function (res) { enListo(function () { pantallaLogin(res); }); });
    return pendiente;
  }

  function esApi(u) { return u.indexOf('/api/') === 0 || u.indexOf(location.origin + '/api/') === 0; }
  function sinToken(u) { return /\/api\/auth\?(.*&)?action=(login|setup)(&|$)/.test(u); }

  window.fetch = async function (input, init) {
    var url = typeof input === 'string' ? input : ((input && input.url) || String(input));
    if (!esApi(url) || sinToken(url)) return rawFetch(input, init);
    await pedirLogin();
    function conToken() {
      var h = new Headers((init && init.headers) || (typeof input !== 'string' && input && input.headers) || {});
      h.set('Authorization', 'Bearer ' + window.NOA_TOKEN());
      if (permiso && permiso.hasta > Date.now()) h.set('X-Permiso', permiso.t);
      return Object.assign({}, init || {}, { headers: h });
    }
    var r = await rawFetch(input, conToken());
    if (r.status === 401) {
      borrar(); await pedirLogin();
      r = await rawFetch(input, conToken());
    }
    if (r.status === 403 && !/\/api\/auth\?/.test(url)) {
      var jj = null; try { jj = await r.clone().json(); } catch (e) {}
      if (jj && jj.necesita_permiso && await pedirPermiso()) r = await rawFetch(input, conToken());
    }
    return r;
  };

  function pintarBarra() {
    if (!document.body || !window.NOA_USUARIO()) return;
    estilo();
    var b = $('noa-barra'); if (b) b.remove();
    b = document.createElement('div'); b.id = 'noa-barra';
    b.innerHTML = '👤 <b>' + esc(window.NOA_USUARIO()) + '</b> <button id="noa-b-bit">Bitácora</button><button id="noa-b-cl">Clave</button><button id="noa-b-sg">Seguridad</button><button id="noa-b-us">Usuarios</button><button id="noa-b-sal">Salir</button>';
    document.body.appendChild(b);
    $('noa-b-sal').onclick = function () { borrar(); location.reload(); };
    $('noa-b-cl').onclick = function () { pantallaCambio('', false, null); };
    $('noa-b-bit').onclick = verBitacora;
    $('noa-b-sg').onclick = function () { pantallaSeguridad('cambiar', null); };
    $('noa-b-us').onclick = verUsuarios;
  }

  async function verBitacora() {
    estilo();
    capa('<div class="c ancho"><h2>Bitácora</h2><p>Quién hizo qué (lo más reciente arriba).</p><div id="noa-bit">Cargando…</div><button class="s" id="noa-bit-x">Cerrar</button></div>', true);
    $('noa-bit-x').onclick = quitarCapa;
    var r = await api('bitacora', 'GET', null, true);
    if (!r.ok) { $('noa-bit').textContent = 'No se pudo cargar'; return; }
    $('noa-bit').innerHTML = '<table><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr>' +
      r.j.filas.map(function (f) { return '<tr><td>' + esc(new Date(f.fecha).toLocaleString('es-CR')) + '</td><td>' + esc(f.usuario) + '</td><td>' + esc(f.accion) + '</td><td>' + esc(f.detalle) + '</td></tr>'; }).join('') + '</table>';
  }

  async function verUsuarios() {
    estilo();
    capa('<div class="c ancho"><h2>Usuarios</h2><p>Para dar de alta a alguien o dar una clave temporal nueva a quien la olvidó.</p><div id="noa-us">Cargando…</div>' +
      '<input id="noa-us-nuevo" placeholder="Nombre del usuario nuevo" style="margin-top:12px"><button id="noa-us-crear">Crear usuario</button><div class="m" id="noa-us-msg" style="color:#86efac;margin-top:8px"></div><button class="s" id="noa-us-x">Cerrar</button></div>', true);
    $('noa-us-x').onclick = quitarCapa;
    async function listar() {
      var r = await api('usuarios', 'GET', null, true);
      if (!r.ok) { $('noa-us').textContent = 'No se pudo cargar'; return; }
      $('noa-us').innerHTML = '<table><tr><th>Usuario</th><th>Estado</th><th></th></tr>' + r.j.usuarios.filter(function (x) { return x.rol !== 'robot'; }).map(function (x) {
        return '<tr><td>' + esc(x.nombre) + '</td><td>' + (x.activo ? 'Activo' : 'Desactivado') + (x.debe_cambiar ? ' · clave temporal' : '') + '</td><td><button data-r="' + esc(x.nombre) + '" style="width:auto;padding:4px 8px;font-size:12px">Clave temporal nueva</button> ' +
          (x.nombre.toLowerCase() === window.NOA_USUARIO().toLowerCase() ? '' : '<button class="s" data-e="' + esc(x.nombre) + '" data-a="' + (x.activo ? 0 : 1) + '" style="width:auto;padding:4px 8px;font-size:12px;margin:0">' + (x.activo ? 'Desactivar' : 'Activar') + '</button>') + '</td></tr>';
      }).join('') + '</table>';
      Array.prototype.forEach.call($('noa-us').querySelectorAll('button[data-r]'), function (bt) {
        bt.onclick = async function () {
          var r2 = await api('reset-clave', 'POST', { usuario: bt.getAttribute('data-r') }, true);
          $('noa-us-msg').textContent = r2.ok ? ('Clave temporal de ' + r2.j.usuario + ': ' + r2.j.clave_temporal + ' (la cambia al entrar)') : ((r2.j && r2.j.error) || 'Error');
          listar();
        };
      });
      Array.prototype.forEach.call($('noa-us').querySelectorAll('button[data-e]'), function (bt) {
        bt.onclick = async function () {
          await api('estado-usuario', 'POST', { usuario: bt.getAttribute('data-e'), activo: bt.getAttribute('data-a') === '1' }, true);
          listar();
        };
      });
    }
    $('noa-us-crear').onclick = async function () {
      var r = await api('crear-usuario', 'POST', { usuario: $('noa-us-nuevo').value }, true);
      $('noa-us-msg').textContent = r.ok ? ('Usuario ' + r.j.usuario + ' creado. Clave temporal: ' + r.j.clave_temporal + ' (la cambia al entrar)') : ((r.j && r.j.error) || 'Error');
      if (r.ok) { $('noa-us-nuevo').value = ''; listar(); }
    };
    listar();
  }

  // Compatibilidad: el resto del sistema sigue viendo el mismo dueño de los datos
  window.getUserNOA = async function () { return { id: 'test-user-1', email: 'pruebas@emanuelle.local', nombre: window.NOA_USUARIO() }; };
  window.verificarAuthNOA = async function () { await pedirLogin(); return true; };
  window.logoutNOA = async function () { borrar(); window.location.reload(); };
  window.mostrarUsuarioLogueado = function (user) { console.log('Usuario logueado:', window.NOA_USUARIO() || (user && user.email)); };

  if (sesion) enListo(pintarBarra); else pedirLogin();
})();
