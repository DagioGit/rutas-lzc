// Pantalla de parada en vivo (parada.html?id=A).
// Es lo que vería el pasajero al escanear el QR de la caseta, y lo mismo que
// mostraría el tótem de la parada en «modo pantalla».

(function () {
    const R = window.RUTA_2;
    const H = window.RutaHorario;
    const F = window.Formato;
    if (!R || !H) return;

    const params = new URLSearchParams(location.search);
    const parada = R.paradas.find(p => p.id === (params.get("id") || "").toUpperCase()) || R.paradas[0];
    const $ = s => document.querySelector(s);
    const PERIODO = H.frecuencia * 60;

    // ---------- Datos fijos de la parada ----------
    document.title = `${parada.name} en vivo · Ruta 2 Pollo`;
    $("[data-letra]").textContent = parada.corto;
    $("[data-nombre]").textContent = parada.name;
    $("[data-calle]").textContent = parada.calle;
    $("[data-referencia]").textContent = parada.referencia;
    $("[data-coordenadas]").textContent = `${parada.lat.toFixed(6)}, ${parada.lng.toFixed(6)}`.replace("-", "−");
    const foto = $("[data-foto]");
    if (foto && parada.imagen) { foto.src = parada.imagen; foto.alt = `Maqueta 3D de la ${parada.name}`; }

    $("[data-tabs]").innerHTML = R.paradas.map(p =>
        `<a href="parada.html?id=${p.id}"${p.id === parada.id ? ' aria-current="page"' : ""}>Parada ${p.corto}</a>`).join("");

    // ---------- Código QR con la dirección de esta página ----------
    const cajaQR = $("[data-qr]");
    try {
        const qr = qrcode(0, "M");
        qr.addData(location.href.split("#")[0]);
        qr.make();
        cajaQR.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    } catch (e) {
        cajaQR.innerHTML = `<p class="dato__nota">${location.href}</p>`;
    }

    // ---------- Línea del recorrido con las combis ----------
    const pista = $("[data-pista]");
    const puntos = [{ id: "base", corto: "Base", f: 0, nombre: "Base" }, ...R.paradas.map(p => ({ id: p.id, corto: p.corto, f: H.fraccion(p.id), nombre: p.name }))];
    puntos.forEach(p => {
        const el = document.createElement("div");
        el.className = "pista__punto" + (p.id === "base" ? " pista__punto--base" : "") + (p.id === parada.id ? " is-aqui" : "");
        el.style.left = `${(p.f * 100).toFixed(2)}%`;
        el.innerHTML = `<span class="pista__marca">${p.id === "base" ? "" : p.corto}</span><span class="pista__nombre">${p.nombre}</span>${p.id === parada.id ? '<span class="pista__aqui">Estás aquí</span>' : ""}`;
        pista.appendChild(el);
    });
    const fin = document.createElement("div");
    fin.className = "pista__punto pista__punto--base pista__punto--fin";
    fin.style.left = "100%";
    fin.innerHTML = '<span class="pista__marca"></span><span class="pista__nombre">Base</span>';
    pista.appendChild(fin);
    const combis = [];
    function dibujarCombis() {
        const fr = H.combisEnRuta();
        while (combis.length < fr.length) {
            const c = document.createElement("span");
            c.className = "pista__combi";
            c.setAttribute("aria-hidden", "true");
            pista.appendChild(c);
            combis.push(c);
        }
        combis.forEach((c, i) => {
            c.hidden = i >= fr.length;
            if (i < fr.length) c.style.left = `${(fr[i] * 100).toFixed(3)}%`;
        });
        $("[data-en-servicio]").textContent = fr.length;
        requestAnimationFrame(dibujarCombis);
    }
    requestAnimationFrame(dibujarCombis);

    // ---------- Desde esta parada ----------
    const fAqui = H.fraccion(parada.id);
    const siguientes = puntos.filter(p => p.id !== parada.id)
        .map(p => ({ ...p, viaje: H.viaje(parada.id, p.id) }))
        .sort((a, b) => a.viaje - b.viaje);
    $("[data-tramos-vivo]").innerHTML = siguientes.map(p => `
        <li>
            <span class="vivo-tramos__marca${p.id === "base" ? " vivo-tramos__marca--base" : ""}">${p.id === "base" ? "" : p.corto}</span>
            <span class="vivo-tramos__nombre"><strong>${p.id === "base" ? "Base (fin del recorrido)" : p.nombre}</strong><small>${p.id === "base" ? R.base.calle : F.calleCorta(R.paradas.find(x => x.id === p.id).calle)}</small></span>
            <span class="vivo-tramos__tiempo">${F.minutos(p.viaje)}</span>
            <span class="vivo-tramos__dist">${F.distancia(((p.f - fAqui + 1) % 1 || 1) * H.largo())}</span>
        </li>`).join("");

    // ---------- Cuenta regresiva ----------
    const elTiempo = $("[data-tiempo]"), elUnidad = $("[data-unidad]"), elEstado = $("[data-chip-estado]");
    const elProgreso = $("[data-progreso]"), elDespues = $("[data-despues]"), elReloj = $("[data-reloj]");
    const elAviso = $("[data-aviso]");
    let avisar = false, avisado = false, ultimoS = null;

    function estadoDe(s) {
        if (H.enParada(parada.id)) return { clase: "en-parada", texto: "En parada" };
        if (s < 60) return { clase: "llegando", texto: "Llegando" };
        return { clase: "a-tiempo", texto: "A tiempo" };
    }

    function actualizar() {
        const s = H.segundosPara(parada.id);
        const ahora = new Date();
        elReloj.textContent = F.hora(ahora);
        if (s == null) return;
        const est = estadoDe(s);
        document.body.dataset.estado = est.clase;
        elEstado.textContent = est.texto;
        if (est.clase === "en-parada") {
            elTiempo.textContent = "Aborda";
            elUnidad.textContent = "la combi está en la parada";
        } else {
            elTiempo.textContent = F.reloj(s);
            elUnidad.textContent = "minutos : segundos";
        }
        elProgreso.style.transform = `scaleX(${(1 - s / PERIODO).toFixed(4)})`;
        const prox = H.proximas(parada.id, 3).slice(1);
        elDespues.innerHTML = `<li class="mono-etiqueta">Después</li>` + prox.map(x => {
            const hora = F.hora(new Date(ahora.getTime() + x * 1000));
            return `<li><strong>${F.reloj(x)}</strong><span>llega ${hora}</span></li>`;
        }).join("");

        // Aviso a 2 minutos
        if (avisar && !avisado && ultimoS != null && ultimoS > 120 && s <= 120) {
            avisado = true;
            sonar();
            hablar(`Atención. La combi de la Ruta 2 llega a la ${parada.name} en dos minutos.`);
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            mostrarAviso("La combi llega en 2 minutos");
        }
        if (s > 120) avisado = false;
        ultimoS = s;
    }
    actualizar();
    setInterval(actualizar, 250);

    function mostrarAviso(texto) {
        elAviso.textContent = texto;
        elAviso.hidden = false;
        clearTimeout(mostrarAviso.t);
        mostrarAviso.t = setTimeout(() => { elAviso.hidden = true; }, 9000);
    }

    // ---------- Voz y sonido ----------
    function hablar(texto) {
        if (!("speechSynthesis" in window)) { mostrarAviso("Este navegador no puede leer en voz alta"); return; }
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(texto);
        u.lang = "es-MX";
        const voz = speechSynthesis.getVoices().find(v => /^es(-|_)MX/i.test(v.lang)) || speechSynthesis.getVoices().find(v => /^es/i.test(v.lang));
        if (voz) u.voice = voz;
        u.rate = 0.95;
        speechSynthesis.speak(u);
    }
    let audio = null;
    function sonar() {
        try {
            audio = audio || new (window.AudioContext || window.webkitAudioContext)();
            [0, 0.22].forEach((t, i) => {
                const o = audio.createOscillator(), g = audio.createGain();
                o.frequency.value = i ? 1046 : 784;
                g.gain.setValueAtTime(0.0001, audio.currentTime + t);
                g.gain.exponentialRampToValueAtTime(0.25, audio.currentTime + t + 0.02);
                g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + t + 0.4);
                o.connect(g).connect(audio.destination);
                o.start(audio.currentTime + t);
                o.stop(audio.currentTime + t + 0.45);
            });
        } catch (e) { /* sin audio */ }
    }

    $("[data-leer]").addEventListener("click", () => {
        const s = H.segundosPara(parada.id);
        const texto = H.enParada(parada.id)
            ? `Ruta 2 Pollo. La combi está en la ${parada.name}. Puedes abordar.`
            : `Ruta 2 Pollo, ${parada.name}, ${F.calleCorta(parada.calle)}. La próxima combi llega en ${Math.max(1, Math.round(s / 60))} ${Math.round(s / 60) === 1 ? "minuto" : "minutos"}.`;
        hablar(texto);
    });

    const btnAvisar = $("[data-avisar]");
    btnAvisar.addEventListener("click", () => {
        avisar = !avisar;
        btnAvisar.setAttribute("aria-checked", String(avisar));
        if (avisar) { sonar(); mostrarAviso("Listo: te avisaremos cuando falten 2 minutos"); }
    });

    // ---------- Texto grande ----------
    const btnGrande = $("[data-texto-grande]");
    const leerPref = () => { try { return localStorage.getItem("r2-texto-grande") === "1"; } catch (e) { return false; } };
    function aplicarGrande(v) {
        document.documentElement.classList.toggle("texto-grande", v);
        btnGrande.setAttribute("aria-pressed", String(v));
        try { localStorage.setItem("r2-texto-grande", v ? "1" : "0"); } catch (e) { /* sin almacenamiento */ }
    }
    aplicarGrande(leerPref());
    btnGrande.addEventListener("click", () => aplicarGrande(!document.documentElement.classList.contains("texto-grande")));

    // ---------- Modo pantalla (como el tótem de la caseta) ----------
    function entrarPantalla() {
        document.body.classList.add("modo-pantalla");
        const el = document.documentElement;
        if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    }
    function salirPantalla() {
        document.body.classList.remove("modo-pantalla");
        if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    }
    $("[data-modo-pantalla]").addEventListener("click", entrarPantalla);
    $("[data-salir-pantalla]").addEventListener("click", salirPantalla);
    document.addEventListener("keydown", e => { if (e.key === "Escape") salirPantalla(); });
    document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement) document.body.classList.remove("modo-pantalla"); });
    if (params.get("modo") === "pantalla") document.body.classList.add("modo-pantalla");

    // ---------- Reportes (guardados en este dispositivo) ----------
    const form = $("[data-reporte]"), lista = $("[data-reportes]"), ok = $("[data-reporte-ok]");
    const CLAVE = "r2-reportes";
    const leer = () => { try { return JSON.parse(localStorage.getItem(CLAVE) || "[]"); } catch (e) { return []; } };
    const guardar = v => { try { localStorage.setItem(CLAVE, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } };
    let memoria = leer();
    function pintarReportes() {
        const mios = memoria.filter(r => r.parada === parada.id).slice(-3).reverse();
        lista.innerHTML = mios.map(r => `<li><span class="mono-etiqueta mono-etiqueta--suave">${r.folio}</span><strong>${r.tipo}</strong><span>${new Date(r.fecha).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></li>`).join("");
    }
    pintarReportes();
    form.addEventListener("submit", e => {
        e.preventDefault();
        const datos = new FormData(form);
        const folio = `R2-${parada.id}-${Date.now().toString(36).slice(-5).toUpperCase()}`;
        memoria.push({ folio, parada: parada.id, tipo: datos.get("tipo"), detalle: String(datos.get("detalle") || "").slice(0, 280), fecha: Date.now() });
        memoria = memoria.slice(-30);
        guardar(memoria);
        ok.textContent = `Reporte recibido. Folio ${folio}.`;
        ok.hidden = false;
        form.querySelector("textarea").value = "";
        pintarReportes();
    });
})();
