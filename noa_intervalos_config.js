/*NOA_CFG_SERVIDOR*/
// Intervalos de recordatorio por periodicidad: se guardan en el servidor para toda la oficina
// y se copian a este navegador porque el auto-seguimiento los lee de ahí.
window.INTERVALOS_DEFAULT = {
  mensual: { r1: 5, r2: 3, r3: 1 },
  trimestral: { r1: 15, r2: 7, r3: 3 },
  semestral: { r1: 30, r2: 15, r3: 7 },
  anual: { r1: 45, r2: 30, r3: 15 }
};

function noaCopiarIntervalos(c) { try { localStorage.setItem('sistemaV5_intervalos', JSON.stringify(c)); } catch (e) {} }

window.cargarIntervalosConfig = async function () {
  try {
    var j = await window.noaConfigServidor.leer();
    window.INTERVALOS_CONFIG = j.intervalos || window.INTERVALOS_DEFAULT;
    noaCopiarIntervalos(window.INTERVALOS_CONFIG);
  } catch (e) {
    window.INTERVALOS_CONFIG = window.INTERVALOS_DEFAULT;
  }
  actualizarCamposIntervalos();
};

window.guardarIntervalosConfig = async function () {
  try {
    var d = window.INTERVALOS_DEFAULT, nuevo = {};
    ['mensual', 'trimestral', 'semestral', 'anual'].forEach(function (p) {
      nuevo[p] = {};
      ['r1', 'r2', 'r3'].forEach(function (r) {
        var n = parseInt(document.getElementById('int-' + p + '-' + r).value, 10);
        nuevo[p][r] = isNaN(n) ? d[p][r] : n;
      });
    });
    await window.noaConfigServidor.guardar({ intervalos: nuevo });
    window.INTERVALOS_CONFIG = nuevo;
    noaCopiarIntervalos(nuevo);
    alert('Intervalos guardados');
  } catch (e) {
    alert('No se pudieron guardar los intervalos: ' + e.message);
  }
};

function actualizarCamposIntervalos() {
  var c = window.INTERVALOS_CONFIG || window.INTERVALOS_DEFAULT;
  ['mensual', 'trimestral', 'semestral', 'anual'].forEach(function (p) {
    ['r1', 'r2', 'r3'].forEach(function (r) {
      var el = document.getElementById('int-' + p + '-' + r);
      if (el && c[p]) el.value = c[p][r];
    });
  });
}

document.addEventListener('DOMContentLoaded', function () {
  setTimeout(function () { window.cargarIntervalosConfig(); }, 3000);
});

console.log('noa_intervalos_config.js cargado');
