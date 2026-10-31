const SUPABASE_URL = 'https://getafbqdlhyzaisfugzp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdldGFmYnFkbGh5emFpc2Z1Z3pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MTkzMDYsImV4cCI6MjEwNDM5NTMwNn0.xjsiSQktZERp-OEaoJmYVJCQkxXnnuGlc9yk82pRT-w';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabaseClient = supabaseClient;
async function registroNOA(email, password, nombre) {
  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: { nombre }
      }
    });
    if (error) throw error;
    return { success: true, message: "Registro exitoso. Verifica tu email." };
  } catch (error) {
    return { success: false, message: error.message };
  }
}
async function loginNOA(email, password) {
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { success: true, user: data.user };
  } catch (error) {
    return { success: false, message: error.message };
  }
}
async function logoutNOA() {
  await supabaseClient.auth.signOut();
  window.location.reload();
}
async function getUserNOA() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  return user;
}
async function verificarAuthNOA() {
  const user = await getUserNOA();
  if (!user) { mostrarLoginNOA(); return false; }
  mostrarUsuarioLogueado(user);
  return true;
}
function mostrarLoginNOA() {
  document.body.insertAdjacentHTML('beforeend', '<div id="noa-login" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:1009;display:flex;align-items:center;justify-content:center;"><div style="background:#1E293B;padding:40px;border-radius:15px;max-width:400px;width:90%;"><h2 style="margin:0 0 10px;color:#0EA5E9;text-align:center;">🚀 NOA</h2><p style="color:#F1F5F9;text-align:center;margin:0 0 30px;font-size:14px;">Sistema Multi-Tenant</p><div id="login-form"><input type="email" id="login-email" placeholder="Email" style="width:100%;padding:12px;margin-bottom:10px;border:1px solid #334155;border-radius:8px;background:#0F172A;color:white;"><input type="password" id="login-password" placeholder="Contraseña" style="width:100%;padding:12px;margin-bottom:15px;border:1px solid #334155;border-radius:8px;background:#0F172A;color:white;"><button onclick="handleLoginNOA()" style="width:100%;padding:12px;background:#0EA5E9;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Entrar</button><p style="text-align:center;margin-top:15px;"><a href="#" onclick="mostrarRegistroNOA();return false;" style="color:#0EA5E9;font-size:13px;">Registrate</a></p></div><div id="registro-form" style="display:none;"><input type="text" id="registro-nombre" placeholder="Nombre" style="width:100%;padding:12px;margin-bottom:10px;border:1px solid #334155;border-radius:8px;background:#0F172A;color:white;"><input type="email" id="registro-email" placeholder="Email" style="width:100%;padding:12px;margin-bottom:10px;border:1px solid #334155;border-radius:8px;background:#0F172A;color:white;"><input type="password" id="registro-password" placeholder="Contraseña" style="width:100%;padding:12px;margin-bottom:15px;border:1px solid #334155;border-radius:8px;background:#0F172A;color:white;"><button onclick="handleRegistroNOA()" style="width:100%;padding:12px;background:#10B981;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Crear Cuenta</button><p style="text-align:center;margin-top:15px;"><a href="#" onclick="mostrarLoginFormNOA();return false;" style="color:#0EA5E9;font-size:13px;">Entrar</a></p></div><div id="auth-message" style="margin-top:15px;padding:10px;border-radius:8px;display:none;"></div></div></div>');
}
function mostrarUsuarioLogueado(user) {
  // Cintillo removido - ya no estorba las ventanas modales
  console.log('Usuario logueado:', user.email);
}
function mostrarRegistroNOA() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('registro-form').style.display = 'block';
}
function mostrarLoginFormNOA() {
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('registro-form').style.display = 'none';
}
async function handleLoginNOA() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  if (!email || !password) return mostrarMensajeAuth('Completá todos los campos', 'error');
  const result = await loginNOA(email, password);
  if (result.success) { document.getElementById('noa-login').remove(); window.location.reload(); } else { mostrarMensajeAuth(result.message, 'error'); }
}
async function handleRegistroNOA() {
  const nombre = document.getElementById('registro-nombre').value;
  const email = document.getElementById('registro-email').value;
  const password = document.getElementById('registro-password').value;
  if (!nombre || !email || !password) return mostrarMensajeAuth('Completá todos', 'error');
  if (password.length < 6) return mostrarMensajeAuth('Min 6 caracteres', 'error');
  const result = await registroNOA(email, password, nombre);
  if (result.success) { mostrarMensajeAuth(result.message, 'success'); setTimeout(() => mostrarLoginFormNOA(), 2000); } else { mostrarMensajeAuth(result.message, 'error'); }
}
function mostrarMensajeAuth(mensaje, tipo) {
  const msgDiv = document.getElementById('auth-message');
  msgDiv.textContent = mensaje;
  msgDiv.style.display = 'block';
  msgDiv.style.background = tipo === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)';
  msgDiv.style.color = tipo === 'success' ? '#10B981' : '#EF4444';
  msgDiv.style.border = '1px solid ' + (tipo === 'success' ? '#10B981' : '#EF4444');
}
document.addEventListener('DOMContentLoaded', async () => { await verificarAuthNOA(); });
// Updated Wed Oct 29 12:13:12 CST 2025
