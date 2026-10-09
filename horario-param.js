// Horario para el visor 3D cuando se abre desde la app (visor.html?zona=R1-…&f=8&d=123):
// una combi sale del inicio cada `f` minutos de 6:00 a 22:00 y llega a la parada `d`
// segundos después de salir; se detiene ESPERA segundos. Mismo formato que horario.js.
(function () {
    const q = new URLSearchParams(location.search);
    const H = (parseFloat(q.get("f")) || 10) * 60;
    const OFF = parseFloat(q.get("d")) || 0;
    const ESPERA = parseFloat(q.get("espera")) || 40;
    const INICIO = 6 * 3600, FIN = 22 * 3600, DIA = 86400;

    const reloj = { modo: "vivo", base: 0, desde: 0, velocidad: 1 };
    const segundosDelDia = d => d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000;
    function ahora() {
        if (reloj.modo === "vivo") return segundosDelDia(new Date());
        const t = reloj.base + ((performance.now() - reloj.desde) / 1000) * reloj.velocidad;
        return ((t % DIA) + DIA) % DIA;
    }
    function estado(id, t = ahora()) {
        let j = Math.ceil((t - ESPERA - OFF - INICIO) / H);
        if (j < 0) j = 0;
        let llega = INICIO + j * H + OFF, manana = false;
        if (INICIO + j * H >= FIN) { llega = INICIO + OFF + DIA; manana = true; }
        const en = t >= llega && t < llega + ESPERA;
        const jPrev = Math.floor((t - OFF - INICIO) / H);
        const anterior = jPrev >= 0 && INICIO + jPrev * H < FIN ? INICIO + jPrev * H + OFF : null;
        return {
            segundos: Math.max(0, llega - t),
            enParada: en,
            desde: anterior != null && anterior <= t ? t - anterior : null,
            servicio: !manana && t >= INICIO - 1800,
            llegada: llega % DIA
        };
    }
    window.RutaHorario = {
        ahora, estado,
        espera: ESPERA,
        frecuencia: H / 60,
        modo: () => reloj.modo,
        enVivo() { reloj.modo = "vivo"; },
        simular(t, velocidad = 1) { reloj.base = t; reloj.desde = performance.now(); reloj.modo = "sim"; reloj.velocidad = velocidad; },
        segundosPara(id) { return estado(id).segundos; },
        enParada(id) { return estado(id).enParada; },
        alCambiar() {}
    };
    window.Formato = window.Formato || {
        reloj: s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`,
        horaDia: t => { const m = Math.floor(t / 60) % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; },
        minutos: s => { const m = Math.round(s / 60); return m < 1 ? "menos de 1 min" : `${m} min`; },
        calleCorta: t => (t || "").split(",")[0]
    };
})();
