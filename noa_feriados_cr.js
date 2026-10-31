// Feriados de ley (pago obligatorio) de Costa Rica, calculados dinamicamente.
// Se usan para excluir dias del calculo de "10 dias habiles" en fecha_limite_pago.
(function() {
    function calcularSemanaSanta(anio) {
        // Algoritmo de Gauss para Domingo de Pascua
        const a = anio % 19;
        const b = Math.floor(anio / 100);
        const c = anio % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const mes = Math.floor((h + l - 7 * m + 114) / 31);
        const dia = ((h + l - 7 * m + 114) % 31) + 1;
        const domingoPascua = new Date(anio, mes - 1, dia);
        const juevesSanto = new Date(domingoPascua);
        juevesSanto.setDate(domingoPascua.getDate() - 3);
        const viernesSanto = new Date(domingoPascua);
        viernesSanto.setDate(domingoPascua.getDate() - 2);
        return { juevesSanto, viernesSanto };
    }

    function esFeriadoLeyCR(fecha) {
        const dd = fecha.getDate();
        const mm = fecha.getMonth() + 1;
        const anio = fecha.getFullYear();

        // Feriados fijos de pago obligatorio
        const fijos = [
            [1, 1],   // Año Nuevo
            [4, 11],  // Juan Santamaría
            [5, 1],   // Día del Trabajador
            [7, 25],  // Anexión de Nicoya
            [8, 15],  // Día de la Madre
            [9, 15],  // Independencia
            [12, 25], // Navidad
        ];
        if (fijos.some(([fm, fd]) => fm === mm && fd === dd)) return true;

        // Jueves y Viernes Santo (móviles)
        const { juevesSanto, viernesSanto } = calcularSemanaSanta(anio);
        if (fecha.getFullYear() === juevesSanto.getFullYear() &&
            fecha.getMonth() === juevesSanto.getMonth() &&
            fecha.getDate() === juevesSanto.getDate()) return true;
        if (fecha.getFullYear() === viernesSanto.getFullYear() &&
            fecha.getMonth() === viernesSanto.getMonth() &&
            fecha.getDate() === viernesSanto.getDate()) return true;

        return false;
    }

    window.esFeriadoLeyCR = esFeriadoLeyCR;
})();
