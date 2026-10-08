// Horario simulado de la Ruta 2 — compartido por todas las páginas.
//
// Una combi sale de la base cada FRECUENCIA_MIN minutos y da la vuelta a
// velocidad constante. La llegada a cada parada es:
//     salida + (fracción del recorrido × duración de la vuelta)
// Mientras no exista el horario real, todas las cuentas regresivas salen de aquí.

(function () {
    const FRECUENCIA_MIN = 15;
    const VELOCIDAD_KMH = 18;
    const ESPERA_EN_PARADA = 25; // segundos que se muestra «En parada»

    const R = window.RUTA_2;
    const H = FRECUENCIA_MIN * 60;
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
            let mejor = 0, dMin = Infinity;
            R.trazo.forEach((q, i) => {
                const d = dist(q, [p.lng, p.lat]);
                if (d < dMin) { dMin = d; mejor = i; }
            });
            fracciones[p.id] = acum[mejor] / largo;
        });
    }

    const vuelta = () => largo / (VELOCIDAD_KMH / 3.6);
    const ahora = () => Date.now() / 1000;
    const fraccion = id => (id === "base" ? 0 : fracciones[id]);

    window.RutaHorario = {
        frecuencia: FRECUENCIA_MIN,
        velocidad: VELOCIDAD_KMH,
        // El mapa calcula las posiciones exactas y las comparte al cargar.
        ajustar(f, L) { fracciones = { ...fracciones, ...f }; if (L) largo = L; },
        largo: () => largo,
        vuelta,
        fraccion,
        distancia(id) { const f = fraccion(id); return f != null ? f * largo : null; },
        // Segundos hasta la próxima combi en la parada `id`.
        segundosPara(id) {
            const f = fraccion(id);
            if (f == null || !largo) return null;
            return (((f * vuelta() - ahora()) % H) + H) % H;
        },
        // Las siguientes `n` llegadas (segundos desde ahora).
        proximas(id, n = 3) {
            const s = this.segundosPara(id);
            if (s == null) return [];
            return Array.from({ length: n }, (_, i) => s + i * H);
        },
        enParada(id) {
            const s = this.segundosPara(id);
            return s != null && s > H - ESPERA_EN_PARADA;
        },
        // Combis en servicio en este momento: fracción del recorrido de cada una.
        combisEnRuta() {
            if (!largo) return [];
            const T = vuelta(), t = ahora();
            const res = [];
            for (let k = 0; k * H < T; k++) {
                const enRuta = ((t % H) + k * H);
                if (enRuta < T) res.push(enRuta / T);
            }
            return res;
        },
        // Tiempo de viaje en la combi entre dos puntos del recorrido (segundos).
        viaje(de, a) {
            const f0 = fraccion(de), f1 = fraccion(a);
            if (f0 == null || f1 == null) return null;
            return (((f1 - f0) % 1) + 1) % 1 * vuelta();
        },
        unidadesNecesarias: () => Math.ceil(vuelta() / H)
    };

    // ---------- Formatos compartidos ----------
    window.Formato = {
        reloj: s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`,
        minutos: s => { const m = Math.round(s / 60); return m < 1 ? "menos de 1 min" : `${m} min`; },
        distancia: m => m == null ? "—" : m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`,
        hora: d => d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false }),
        calleCorta: t => (t || "").split(",")[0]
    };
})();
