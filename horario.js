// Horario de la Ruta 2 — una sola fuente para toda la página.
//
// Una combi sale de la base cada FRECUENCIA_MIN minutos, de 6:00 a 22:00, recorre
// la ruta a VELOCIDAD_KMH y se detiene ESPERA_PARADA segundos en cada parada.
// La llegada a una parada es:
//     salida + (distancia desde la base ÷ velocidad) + (paradas anteriores × espera)
//
// Todo lo que muestra un tiempo usa este reloj: la lista de llegadas, la pantalla
// de la parada (parada.html), el mapa y el tótem de las maquetas 3D. Así el tótem,
// el mapa y la lista siempre dicen lo mismo.
//
// El reloj va «en vivo» (hora real) o «en simulación» (otra hora, más rápido), por
// ejemplo cuando el mapa adelanta el día o la maqueta muestra la llegada de la combi.

(function () {
    const FRECUENCIA_MIN = 15;
    const VELOCIDAD_KMH = 18;
    const ESPERA_PARADA = 60;            // segundos detenida en cada parada
    const INICIO = 6 * 3600;             // primera salida 06:00
    const FIN = 22 * 3600;               // ya no sale ninguna a partir de las 22:00
    const DIA = 86400;
    const H = FRECUENCIA_MIN * 60;
    const V = VELOCIDAD_KMH / 3.6;

    const R = window.RUTA_2;
    let largo = 0;
    let fracciones = {};

    // Cálculo propio a partir del trazo, para no depender de que cargue el mapa.
    if (R && R.trazo && R.trazo.length > 1) {
        const rad = Math.PI / 180;
        const dist = (a, b) => {
            const x = (b[0] - a[0]) * rad * Math.cos((a[1] + b[1]) / 2 * rad);
            const y = (b[1] - a[1]) * rad;
            return Math.hypot(x, y) * 6371000;
        };
        const acum = [0];
        for (let i = 1; i < R.trazo.length; i++) acum.push(acum[i - 1] + dist(R.trazo[i - 1], R.trazo[i]));
        largo = acum[acum.length - 1];
        R.paradas.forEach(p => {
            // con "km" se busca sólo cerca de esa distancia (calles que se recorren de ida y de vuelta)
            const pista = p.km != null ? p.km * 1000 : null;
            let mejor = 0, dMin = Infinity;
            R.trazo.forEach((q, i) => {
                if (pista != null && Math.abs(acum[i] - pista) > 450) return;
                const d = dist(q, [p.lng, p.lat]);
                if (d < dMin) { dMin = d; mejor = i; }
            });
            fracciones[p.id] = acum[mejor] / largo;
        });
    }

    // ---------- Itinerario de una vuelta ----------
    let orden = [], offsets = {}, duracion = 0;
    function recalcular() {
        orden = R ? R.paradas.map(p => p.id).filter(id => fracciones[id] != null).sort((a, b) => fracciones[a] - fracciones[b]) : [];
        offsets = {};
        orden.forEach((id, k) => { offsets[id] = (fracciones[id] * largo) / V + k * ESPERA_PARADA; });
        duracion = largo / V + orden.length * ESPERA_PARADA;
    }
    recalcular();

    // ---------- Reloj ----------
    const reloj = { modo: "vivo", base: 0, desde: 0, velocidad: 1, pausa: false };
    const segundosDelDia = d => d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000;
    const perf = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
    function ahora() {
        if (reloj.modo === "vivo") return segundosDelDia(new Date());
        const t = reloj.base + (reloj.pausa ? 0 : ((perf() - reloj.desde) / 1000) * reloj.velocidad);
        return ((t % DIA) + DIA) % DIA;
    }
    const oyentes = [];
    const avisar = () => oyentes.forEach(f => { try { f(reloj.modo); } catch (e) { /* nada */ } });

    // Próxima llegada a una parada a la hora t (segundos del día).
    function estado(id, t = ahora()) {
        const off = id === "base" ? 0 : offsets[id];
        if (off == null || !largo) return null;
        const espera = id === "base" ? 0 : ESPERA_PARADA;
        // salida cuya combi todavía no se va de la parada
        let j = Math.ceil((t - espera - off - INICIO) / H);
        if (j < 0) j = 0;
        let llega = INICIO + j * H + off, manana = false;
        if (INICIO + j * H >= FIN) { llega = INICIO + off + DIA; manana = true; }
        const en = t >= llega && t < llega + espera;
        // la llegada anterior (para saber si una combi acaba de irse)
        const jPrev = Math.floor((t - off - INICIO) / H);
        const anterior = jPrev >= 0 && INICIO + jPrev * H < FIN ? INICIO + jPrev * H + off : null;
        return {
            segundos: Math.max(0, llega - t),
            enParada: en,
            desde: anterior != null && anterior <= t ? t - anterior : null,
            servicio: !manana && t >= INICIO - 1800,
            llegada: llega % DIA
        };
    }

    // Dónde va, a los `tau` segundos de haber salido de la base.
    function posicionEn(tau) {
        let tPrev = 0, dPrev = 0;
        for (let k = 0; k < orden.length; k++) {
            const id = orden[k];
            const d = fracciones[id] * largo;
            const llega = offsets[id];
            if (tau < llega) return { d: dPrev + (d - dPrev) * ((tau - tPrev) / (llega - tPrev || 1)), parada: null };
            if (tau < llega + ESPERA_PARADA) return { d, parada: id };
            tPrev = llega + ESPERA_PARADA; dPrev = d;
        }
        return { d: Math.min(largo, dPrev + (tau - tPrev) * V), parada: null };
    }

    // Salidas que están en ruta a la hora t.
    function salidasEnRuta(t = ahora()) {
        const res = [];
        const j0 = Math.max(0, Math.ceil((t - duracion - INICIO) / H));
        for (let j = j0; ; j++) {
            const s = INICIO + j * H;
            if (s > t || s >= FIN) break;
            if (t - s < duracion) res.push(s);
        }
        return res;
    }
    function proximaSalida(t = ahora()) {
        if (t < INICIO) return INICIO;
        const s = INICIO + Math.ceil((t - INICIO) / H) * H;
        return s < FIN ? s : null;
    }

    window.RutaHorario = {
        frecuencia: FRECUENCIA_MIN,
        velocidad: VELOCIDAD_KMH,
        espera: ESPERA_PARADA,
        inicio: INICIO,
        fin: FIN,
        // El mapa calcula las posiciones exactas y las comparte al cargar.
        ajustar(f, L) { fracciones = { ...fracciones, ...f }; if (L) largo = L; recalcular(); },
        largo: () => largo,
        vuelta: () => duracion,
        fraccion: id => (id === "base" ? 0 : fracciones[id]),
        distancia(id) { const f = this.fraccion(id); return f != null ? f * largo : null; },
        // Segundos de viaje desde la base hasta la parada (incluye las esperas anteriores).
        desdeBase: id => (id === "base" ? 0 : offsets[id]),

        // ----- reloj -----
        ahora,
        modo: () => reloj.modo,
        enVivo() { reloj.modo = "vivo"; reloj.velocidad = 1; reloj.pausa = false; avisar(); },
        // Pasa a simulación a partir de la hora t (segundos del día), `velocidad` veces más rápido.
        simular(t, velocidad = reloj.velocidad) {
            reloj.base = t == null ? ahora() : t; reloj.desde = perf();
            reloj.modo = "sim"; reloj.velocidad = velocidad; reloj.pausa = false; avisar();
        },
        velocidadReloj: () => reloj.velocidad,
        cambiarVelocidad(v) { reloj.base = ahora(); reloj.desde = perf(); reloj.velocidad = v; if (reloj.modo === "vivo" && v !== 1) reloj.modo = "sim"; avisar(); },
        pausar(si) { if (reloj.modo === "vivo") { reloj.base = ahora(); reloj.modo = "sim"; } reloj.base = ahora(); reloj.desde = perf(); reloj.pausa = si; avisar(); },
        enPausa: () => reloj.pausa,
        alCambiar(f) { oyentes.push(f); },

        // ----- llegadas -----
        estado,
        // Segundos hasta la próxima combi en la parada `id` (0 mientras está en la parada).
        segundosPara(id) { const e = estado(id); return e ? e.segundos : null; },
        enParada(id) { const e = estado(id); return !!(e && e.enParada); },
        enServicio(id) { const e = estado(id); return !!(e && e.servicio); },
        // Las siguientes `n` llegadas (segundos desde ahora), sin pasar del fin del servicio.
        proximas(id, n = 3) {
            const t = ahora(), e = estado(id, t);
            if (!e) return [];
            const off = id === "base" ? 0 : offsets[id];
            let salida = t + e.segundos - off;
            const res = [];
            while (res.length < n) {
                res.push(salida + off - t);
                salida += H;
                const enDia = ((salida % DIA) + DIA) % DIA;
                if (enDia >= FIN || enDia < INICIO) salida = salida - enDia + (enDia >= FIN ? DIA : 0) + INICIO;
            }
            return res;
        },
        posicionEn,
        salidasEnRuta,
        proximaSalida,
        // Combis en servicio en este momento: fracción del recorrido de cada una.
        combisEnRuta(t = ahora()) {
            if (!largo) return [];
            return salidasEnRuta(t).map(s => posicionEn(t - s).d / largo);
        },
        // Tiempo de viaje en la combi entre dos puntos del recorrido (segundos).
        viaje(de, a) {
            const o0 = de === "base" ? 0 : offsets[de], o1 = a === "base" ? duracion : offsets[a];
            if (o0 == null || o1 == null) return null;
            const t = o1 - o0 - (de === "base" ? 0 : ESPERA_PARADA);
            return t > 0 ? t : t + duracion;
        },
        unidadesNecesarias: () => Math.ceil(duracion / H)
    };

    // ---------- Formatos compartidos ----------
    window.Formato = {
        reloj: s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`,
        minutos: s => { const m = Math.round(s / 60); return m < 1 ? "menos de 1 min" : `${m} min`; },
        distancia: m => m == null ? "—" : m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`,
        hora: d => d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false }),
        horaDia: t => { const m = Math.floor(t / 60) % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; },
        calleCorta: t => (t || "").split(",")[0]
    };
})();
