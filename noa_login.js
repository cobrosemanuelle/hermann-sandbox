(()=> {
  const KEY='NOA_TOKEN';

  // UI mínima (solo aparece si no hay token)
  function injectLoginUI(){
    if (document.getElementById('noa-login')) return;
    const bar = document.createElement('div');
    bar.id='noa-login';
    bar.style.cssText='position:fixed;inset:auto 16px 16px 16px;display:flex;gap:8px;background:#0b1220;color:#e5e7eb;border:1px solid #1f2937;border-radius:12px;padding:12px;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.35)';
    bar.innerHTML = `
      <strong style="min-width:110px">Acceso NOA</strong>
      <input id="noa-email" type="email" placeholder="usuario@empresa.com" style="flex:1; background:#0b1220;border:1px solid #1f2937;border-radius:10px;color:#e5e7eb;padding:8px;">
      <input id="noa-pass"  type="password" placeholder="••••••••" style="flex:1; background:#0b1220;border:1px solid #1f2937;border-radius:10px;color:#e5e7eb;padding:8px;">
      <button id="noa-btn" style="background:#00e6ff;color:#001016;border:0;border-radius:10px;padding:8px 12px;font-weight:700;cursor:pointer">Entrar</button>
      <button id="noa-x"   style="background:transparent;color:#94a3b8;border:1px solid #334155;border-radius:10px;padding:8px 12px;cursor:pointer">X</button>
    `;
    document.body.appendChild(bar);
    document.getElementById('noa-btn').onclick = login;
    document.getElementById('noa-x').onclick   = () => bar.remove();
  }

  async function login(){
    const email = (document.getElementById('noa-email')||{}).value || '';
    const pass  = (document.getElementById('noa-pass') ||{}).value || '';
    if (!email || !pass) return alert('Email y clave requeridos');
    try{
      const r = await fetch('/auth/login', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email, password: pass })
      });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json().catch(()=> ({}));
      const token = data.token || data.accessToken || data.access_token;
      if (!token) throw new Error('No vino token en la respuesta');
      localStorage.setItem(KEY, token);
      document.getElementById('noa-login')?.remove();
      console.log('[NOA] Login OK');
    }catch(e){
      alert('Login falló: ' + e);
    }
  }

  // fetch wrapper: agrega Authorization y maneja 401
  const rawFetch = window.fetch.bind(window);
  window.fetch = async (input, init={}) => {
    const url = typeof input==='string'? input : input.url;
    const isAPI = /^\/(api|auth|upload_file|login)/.test(url);
    if (isAPI){
      const token = localStorage.getItem(KEY);
      const headers = new Headers((init && init.headers) || {});
      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', 'Bearer ' + token);
      }
      init = { ...init, headers };
    }
    const resp = await rawFetch(input, init);
    if (resp.status === 401) {
      localStorage.removeItem(KEY);
      injectLoginUI();
    }
    return resp;
  };

  // mostrar login si no hay token
  if (!localStorage.getItem(KEY)) {
    document.readyState==='loading'
      ? document.addEventListener('DOMContentLoaded', injectLoginUI)
      : injectLoginUI();
  }
})();
