/* Proxy: si la UI llama emailjs.send, lo redirigimos a /api/send-email */
(function(){
  const fallback = async (_serviceId, _templateId, params) => {
    const r = await fetch('/api/send-email', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ template_params: params })
    });
    if(!r.ok){ throw new Error(await r.text()); }
    return { status: 'OK' };
  };
  window.emailjs = window.emailjs || {};
  const orig = window.emailjs.send;
  window.emailjs.send = (...args) => fallback(...args);
})();
