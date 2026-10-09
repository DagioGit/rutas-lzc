// Horario para el visor 3D cuando se abre desde la app (visor.html?zona=R1-…&f=8&d=123):
// una combi sale del inicio cada `f` minutos desde las 6:00 hasta `fin` (última salida, en
// segundos del día; 22:00 si no viene) y llega a la parada `d`
// segundos después de salir; se detiene ESPERA segundos. Mismo formato que horario.js.
(function () {
    const q = new URLSearchParams(location.search);
    const H = (parseFloat(q.get("f")) || 10) * 60;
    const OFF = parseFloat(q.get("d")) || 0;
    const ESPERA = parseFloat(q.get("espera")) || 40;
    const INICIO = 6 * 3600, FIN = parseFloat(q.get("fin")) || 22 * 3600, DIA = 86400;

    const reloj = { modo: "vivo", base: 0, desde: 0, velocidad: 1 };
    // ?t=segundos del día: la app pidió otra hora (para probar a cualquier hora)
    if (q.has("t")) { reloj.modo = "sim"; reloj.base = parseFloat(q.get("t")) || 0; reloj.desde = performance.now(); }
    const segundosDelDia = d => d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000;
    function ahora() {
        if (reloj.modo === "vivo") return segundosDelDia(new Date());
        const t = reloj.base + ((performance.now() - reloj.desde) / 1000) * reloj.velocidad;
        return ((t % DIA) + DIA) % DIA;
    }
    // ?llegadas=36360_31,36840_28,… : llegadas exactas que calculó la app (segundo del día
    // en que llega la combi _ segundos que se queda). Así la pantalla de la caseta dice lo mismo que la app.
    const LISTA = (q.get("llegadas") || "").split(",").filter(Boolean).map(x => {
        const [a, d] = x.split("_").map(Number);
        return { a, d: d || ESPERA };
    }).filter(x => isFinite(x.a)).sort((x, y) => x.a - y.a);
    function estadoLista(t) {
        // t puede ser de hoy; las llegadas de mañana vienen con +86400
        let i = LISTA.findIndex(x => x.a + x.d > t);
        if (i < 0) {
            // ya pasaron todas: la primera de mañana (misma hora que la primera de la lista, +1 día)
            const p = LISTA[0];
            return { segundos: Math.max(0, p.a + DIA - t), enParada: false, desde: null, servicio: false, llegada: p.a % DIA };
        }
        const x = LISTA[i];
        const anterior = i > 0 ? LISTA[i - 1].a : null;
        return {
            segundos: Math.max(0, x.a - t),
            enParada: t >= x.a,
            desde: anterior != null ? t - anterior : null,
            servicio: x.a < DIA && t >= INICIO - 1800,
            llegada: x.a % DIA
        };
    }
    function estado(id, t = ahora()) {
        if (LISTA.length) return estadoLista(t);
        let j = Math.ceil((t - ESPERA - OFF - INICIO) / H);
        if (j < 0) j = 0;
        let llega = INICIO + j * H + OFF, manana = false;
        if (INICIO + j * H > FIN) { llega = INICIO + OFF + DIA; manana = true; }
        const en = t >= llega && t < llega + ESPERA;
        const jPrev = Math.floor((t - OFF - INICIO) / H);
        const anterior = jPrev >= 0 && INICIO + jPrev * H <= FIN ? INICIO + jPrev * H + OFF : null;
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
        // datos de la ruta para la pantalla de la caseta
        info: {
            numero: q.get("ruta") || "2",
            apodo: q.get("apodo") || "Pollo",
            color: q.get("color") || "#f2c200",
            servicio: q.get("servicio") || "6:00 a 22:00"
        },
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
