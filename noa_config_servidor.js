/*NOA_CFG_SERVIDOR*/
// Lee y guarda la configuración de la oficina en el servidor (no en cada navegador).
(function () {
  async function pedir(cuerpo) {
    var r = await fetch('/api/envios?action=config', {
      method: cuerpo ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined
    });
    var j = null; try { j = await r.json(); } catch (e) {}
    if (!r.ok || !j || j.success === false) throw new Error((j && j.error) || ('error ' + r.status));
    return j;
  }
  window.noaConfigServidor = { leer: function () { return pedir(null); }, guardar: function (c) { return pedir(c); } };
})();
