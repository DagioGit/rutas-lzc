// Mapa del recorrido de la Ruta 2 «Pollo» — MapLibre + OpenFreeMap (gratis, sin clave).
//
// - Traza el recorrido completo (ruta-2.js) con flechas de sentido.
// - Simula un día de servicio: una combi sale de la base cada 15 minutos
//   simulados (1 segundo real = 1 minuto) y recorre la ruta como en un día normal.
// - El panel lateral muestra la hora simulada, las combis en ruta y la ficha de
//   cada parada, con el botón para abrir la maqueta 3D de la zona (visor-3d.js).

const MODELO_PARADA = { url: "modelos/parada.glb", largo: 4.5 };
const ESTILO_MAPA = "https://tiles.openfreemap.org/styles/positron";
const VELOCIDAD_REAL_KMH = 18; // para el tiempo estimado que se muestra
const PX_MINIMOS_COMBI = 54;
const LARGO_COMBI = 4.8;

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("mapaRuta")) iniciarMapa();
});

async function iniciarMapa() {
    const mapEl = document.getElementById("mapaRuta");
    const R = window.RUTA_2;
    if (!R) return;

    if (typeof maplibregl === "undefined") {
        mostrarAviso(mapEl, "No se pudo cargar el mapa", "Revisa tu conexión a internet y vuelve a cargar la página.");
        return;
    }
    let THREE;
    try {
        THREE = await import("three");
    } catch (err) {
        console.error(err);
        mostrarAviso(mapEl, "No se pudieron cargar los modelos 3D", "Revisa tu conexión a internet y vuelve a cargar la página.");
        return;
    }

    // ---------- Recorrido ----------
    const rutaGeo = R.trazo.map(([lng, lat]) => ({ lat, lng }));
    const lat0 = rutaGeo.reduce((s, p) => s + p.lat, 0) / rutaGeo.length;
    const lng0 = rutaGeo.reduce((s, p) => s + p.lng, 0) / rutaGeo.length;
    const marco = crearMarcoLocal(lat0, lng0);
    const ruta = prepararRuta(rutaGeo.map(marco.aLocal));
    const L = ruta.largo;
    const circular = Math.hypot(ruta.puntos[0].x - ruta.puntos[ruta.puntos.length - 1].x, ruta.puntos[0].y - ruta.puntos[ruta.puntos.length - 1].y) < 15;

    // Paradas en orden del recorrido, con su distancia sobre la ruta.
    const puntos = [R.base, ...R.paradas].map(p => {
        const local = marco.aLocal(p);
        return { ...p, d: p.id === "base" ? 0 : distanciaMasCercana(ruta, local.x, local.y, p.km != null ? p.km * 1000 : null) };
    });
    const porId = Object.fromEntries(puntos.map(p => [p.id, p]));
    const orden = puntos.slice().sort((a, b) => a.d - b.d);
    const tramos = orden.map((p, i) => {
        const sig = orden[i + 1] || (circular ? { ...orden[0], d: L } : null);
        return sig ? { de: p, a: sig, metros: sig.d - p.d } : null;
    }).filter(Boolean);

    llenarResumen(R, L, tramos);
    window.dispatchEvent(new CustomEvent("ruta:lista", { detail: { fracciones: Object.fromEntries(puntos.map(p => [p.id, p.d / L])), largo: L } }));

    // ---------- Mapa ----------
    const map = new maplibregl.Map({
        container: mapEl,
        style: ESTILO_MAPA,
        center: [lng0, lat0],
        zoom: 14,
        maxPitch: 70,
        cooperativeGestures: true,
        attributionControl: { compact: true },
        locale: {
            "CooperativeGesturesHandler.WindowsHelpText": "Usa Ctrl + rueda del mouse para acercar el mapa",
            "CooperativeGesturesHandler.MacHelpText": "Usa ⌘ + rueda del mouse para acercar el mapa",
            "CooperativeGesturesHandler.MobileHelpText": "Usa dos dedos para mover el mapa",
            "NavigationControl.ZoomIn": "Acercar",
            "NavigationControl.ZoomOut": "Alejar",
            "NavigationControl.ResetBearing": "Orientar al norte"
        }
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.on("error", e => console.warn("Mapa:", e && e.error ? e.error.message : e));
    await new Promise(resolve => (map.loaded() ? resolve() : map.once("load", resolve)));

    const etiquetas = (map.getStyle().layers.find(l => l.type === "symbol") || {}).id;
    asegurarEdificios3D(map);
    map.addImage("flecha-ruta", flechaRuta(), { pixelRatio: 2 });
    map.addSource("ruta-2", {
        type: "geojson",
        data: { type: "Feature", geometry: { type: "LineString", coordinates: R.trazo } }
    });
    map.addLayer({
        id: "ruta-2-borde", type: "line", source: "ruta-2",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#1D2A33", "line-width": ["interpolate", ["linear"], ["zoom"], 12, 6, 17, 16] }
    }, etiquetas);
    map.addLayer({
        id: "ruta-2-linea", type: "line", source: "ruta-2",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#F2C200", "line-width": ["interpolate", ["linear"], ["zoom"], 12, 3, 17, 10] }
    }, etiquetas);
    map.addLayer({
        id: "ruta-2-sentido", type: "symbol", source: "ruta-2",
        layout: {
            "symbol-placement": "line", "symbol-spacing": 90, "icon-image": "flecha-ruta",
            "icon-size": ["interpolate", ["linear"], ["zoom"], 12, 0.55, 17, 1], "icon-allow-overlap": true
        }
    });

    // ---------- Marcadores ----------
    const marcadores = {};
    puntos.forEach(p => {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "marca" + (p.id === "base" ? " marca--base" : "");
        el.innerHTML = p.id === "base"
            ? `<span class="marca__placa"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11l8-6 8 6v8H4z" fill="currentColor"/></svg>Base</span>`
            : `<span class="marca__disco">${p.corto}</span><span class="marca__palo"></span>`;
        el.addEventListener("click", e => { e.stopPropagation(); irA(p.id); });
        new maplibregl.Marker({ element: el, anchor: "bottom", offset: p.id === "base" ? [0, -6] : [0, -4] }).setLngLat([p.lng, p.lat]).addTo(map);
        el.setAttribute("aria-label", p.id === "base" ? "Base de la Ruta 2" : `${p.name}: ver la parada`);
        marcadores[p.id] = el;
    });

    // ---------- Simulación de un día de servicio ----------
    // Reloj acelerado: 1 segundo real = 1 minuto simulado. Una combi sale de la
    // base cada FRECUENCIA_SIM minutos, recorre la ruta a VELOCIDAD_REAL_KMH,
    // se detiene un minuto en cada parada y regresa a la base.
    const SIM_POR_SEG = 60;                 // segundos simulados por segundo real
    const FRECUENCIA_SIM = 15 * 60;         // entre salidas (s simulados)
    const INICIO_SERVICIO = 6 * 3600;       // 06:00
    const FIN_SERVICIO = 22 * 3600;         // última salida antes de las 22:00
    const ESPERA_PARADA = 60;               // s simulados detenida en cada parada
    const V = VELOCIDAD_REAL_KMH / 3.6;     // m por s simulado

    // Itinerario de una vuelta: tramos en movimiento y esperas en cada parada.
    const itinerario = [];
    {
        let t = 0, d = 0;
        orden.filter(p => p.id !== "base").forEach(p => {
            itinerario.push({ t0: t, t1: t + (p.d - d) / V, d0: d, d1: p.d });
            t += (p.d - d) / V;
            itinerario.push({ t0: t, t1: t + ESPERA_PARADA, d0: p.d, d1: p.d, parada: p.id });
            t += ESPERA_PARADA;
            d = p.d;
        });
        itinerario.push({ t0: t, t1: t + (L - d) / V, d0: d, d1: L });
    }
    const DURACION_VUELTA = itinerario[itinerario.length - 1].t1;
    const llegadaA = id => { const tr = itinerario.find(x => x.parada === id); return tr ? tr.t0 : (id === "base" ? 0 : null); };
    const posicionEn = tau => {
        const tr = itinerario.find(x => tau >= x.t0 && tau < x.t1) || itinerario[itinerario.length - 1];
        const u = tr.t1 > tr.t0 ? Math.min(1, (tau - tr.t0) / (tr.t1 - tr.t0)) : 1;
        return { d: tr.d0 + (tr.d1 - tr.d0) * u, parada: tr.parada || null };
    };

    const sim = { t: INICIO_SERVICIO + 5 * 60, pausa: false, velocidad: 1 };
    const salidasHasta = t => {
        const res = [];
        const primera = Math.max(INICIO_SERVICIO, Math.ceil((t - DURACION_VUELTA - INICIO_SERVICIO) / FRECUENCIA_SIM) * FRECUENCIA_SIM + INICIO_SERVICIO);
        for (let s = primera; s <= t && s < FIN_SERVICIO; s += FRECUENCIA_SIM) if (t - s <= DURACION_VUELTA) res.push(s);
        return res;
    };
    const proximaSalida = t => {
        if (t < INICIO_SERVICIO) return INICIO_SERVICIO;
        const s = INICIO_SERVICIO + Math.ceil((t - INICIO_SERVICIO) / FRECUENCIA_SIM) * FRECUENCIA_SIM;
        return s < FIN_SERVICIO ? s : null;
    };
    // Segundos simulados hasta que la próxima combi llegue a la parada `id`.
    function proximaLlegada(id) {
        const offset = llegadaA(id);
        if (offset == null) return null;
        let mejor = null;
        const base = Math.floor((sim.t - offset - INICIO_SERVICIO) / FRECUENCIA_SIM);
        for (let k = base; k <= base + 2; k++) {
            const salida = INICIO_SERVICIO + k * FRECUENCIA_SIM;
            if (salida < INICIO_SERVICIO || salida >= FIN_SERVICIO) continue;
            const llega = salida + offset;
            if (llega >= sim.t - (id === "base" ? 0 : ESPERA_PARADA) && (mejor == null || llega < mejor)) mejor = llega;
        }
        return mejor == null ? null : mejor - sim.t;
    }
    const horaSim = t => { const m = Math.floor(t / 60) % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
    const textoMinSim = s => s == null ? "Sin servicio" : s <= 0 ? "En parada" : s < 60 ? "Llegando" : `${Math.round(s / 60)} min`;

    // ---------- Combis (capa 3D) ----------
    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    scene.add(new THREE.AmbientLight(0xffffff, 1.4));
    const sol = new THREE.DirectionalLight(0xffffff, 2.4);
    sol.position.set(-3, -6, 10);
    scene.add(sol);
    const flota = [];
    const combiDe = salida => {
        let c = flota.find(x => x.salida === salida);
        if (!c) {
            c = flota.find(x => x.salida == null);
            if (!c) {
                c = { obj: Modelos3D.crearCombi(THREE), ang: null };
                scene.add(c.obj);
                flota.push(c);
            }
            c.salida = salida;
            c.ang = null;
            c.numero = Math.round((salida - INICIO_SERVICIO) / FRECUENCIA_SIM) % 9 + 1;
        }
        return c;
    };

    const origen = maplibregl.MercatorCoordinate.fromLngLat([lng0, lat0], 0);
    const s = origen.meterInMercatorCoordinateUnits();
    const matrizLocal = new THREE.Matrix4().makeTranslation(origen.x, origen.y, origen.z).scale(new THREE.Vector3(s, -s, s));
    const metrosPorPx = zoom => (40075016.686 * Math.cos((lat0 * Math.PI) / 180)) / (512 * Math.pow(2, zoom));

    let renderer = null;
    map.addLayer({
        id: "combi-3d", type: "custom", renderingMode: "3d",
        onAdd(_m, gl) {
            renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true });
            renderer.autoClear = false;
        },
        render(_gl, args) {
            const arr = args && args.length === 16 ? args : (args.defaultProjectionData && args.defaultProjectionData.mainMatrix) || args.modelViewProjectionMatrix;
            camera.projectionMatrix = new THREE.Matrix4().fromArray(arr).multiply(matrizLocal);
            const escala = Math.max(1, (PX_MINIMOS_COMBI * metrosPorPx(map.getZoom())) / LARGO_COMBI);
            flota.forEach(c => c.obj.scale.setScalar(escala));
            renderer.resetState();
            renderer.render(scene, camera);
        }
    });

    let enRuta = [];          // [{ salida, d, parada, x, y, ang }]
    let seleccion = "base";
    let siguiendo = false;
    let seguida = null;       // hora de salida de la combi que sigue la cámara

    function actualizar(dt) {
        if (!sim.pausa) {
            sim.t += dt * SIM_POR_SEG * sim.velocidad;
            if (sim.t >= FIN_SERVICIO + DURACION_VUELTA) sim.t = INICIO_SERVICIO; // empieza otro día
        }
        const activas = salidasHasta(sim.t);
        flota.forEach(c => { if (!activas.includes(c.salida)) { c.salida = null; c.obj.visible = false; } });
        enRuta = activas.map(salida => {
            const c = combiDe(salida);
            const pos = posicionEn(sim.t - salida);
            const p = puntoEn(ruta, Math.min(L - 0.01, pos.d));
            const dir = direccionEn(ruta, Math.min(L - 0.01, pos.d), 1);
            const objetivo = Math.atan2(dir.y, dir.x);
            c.ang = c.ang == null ? objetivo : c.ang + anguloMasCorto(c.ang, objetivo) * (1 - Math.exp(-dt * 9));
            const x = p.x + Math.sin(c.ang) * 1.6, y = p.y - Math.cos(c.ang) * 1.6;
            c.obj.visible = true;
            c.obj.position.set(x, y, 0);
            c.obj.rotation.z = c.ang;
            return { salida, numero: c.numero, d: pos.d, parada: pos.parada, x, y, ang: c.ang };
        });
        if (seguida != null && !enRuta.some(c => c.salida === seguida)) {
            seguida = null;
            if (tour) { detenerTour(); vistaCompleta(1600); }
        }
    }
    const combiSeguida = () => enRuta.find(c => c.salida === seguida) || null;

    // ---------- Panel ----------
    const panel = document.querySelector("[data-panel-ruta]");
    const estadoEl = panel && panel.querySelector("[data-estado]");
    const detalleEl = panel && panel.querySelector("[data-detalle]");
    let ultimoAviso = 0;

    function avisarEstado(forzar) {
        const ahora = performance.now();
        if (!forzar && ahora - ultimoAviso < 250) return;
        ultimoAviso = ahora;
        const prox = proximaSalida(sim.t);
        const n = enRuta.length;
        const texto = `${horaSim(sim.t)} · ${n === 0 ? "Ninguna combi en ruta" : n === 1 ? "1 combi en ruta" : `${n} combis en ruta`} · ${prox != null ? `próxima salida ${horaSim(prox)}` : "fin del servicio"}`;
        if (estadoEl) {
            estadoEl.textContent = texto;
            estadoEl.classList.toggle("is-moving", n > 0);
        }
        if (relojEl) relojEl.textContent = horaSim(sim.t);
        puntos.forEach(p => {
            const sTxt = textoMinSim(proximaLlegada(p.id));
            document.querySelectorAll(`[data-eta-sim="${p.id}"]`).forEach(el => { el.textContent = p.id === "base" ? (prox != null ? `${"simCorto" in el.dataset ? "" : "sale "}${horaSim(prox)}` : "—") : sTxt; });
        });
        document.querySelectorAll("[data-ir]").forEach(b => {
            b.classList.toggle("is-selected", b.dataset.ir === seleccion);
            b.classList.toggle("is-here", enRuta.some(c => c.parada === b.dataset.ir));
        });
        Object.entries(marcadores).forEach(([id, el]) => el.classList.toggle("is-selected", id === seleccion));
        window.dispatchEvent(new CustomEvent("ruta:combis", { detail: { hora: horaSim(sim.t), combis: enRuta.map(c => ({ fraccion: c.d / L, parada: c.parada, numero: c.numero })) } }));
    }

    function irA(id) {
        const p = porId[id];
        if (!p) return;
        seleccion = id;
        siguiendo = false;
        actualizarBotonSeguir();
        mostrarDetalle(p);
        if (!tour) map.easeTo({ center: [p.lng, p.lat], zoom: Math.max(map.getZoom(), 16), duration: 900 });
        avisarEstado(true);
    }

    function mostrarDetalle(p) {
        if (!detalleEl) return;
        const tieneZona = !!(window.Zonas3D && window.Zonas3D[p.id]) || p.id !== "base";
        detalleEl.innerHTML = `
          <h3>${p.name}</h3>
          <p class="detalle__calle">${p.calle}</p>
          <p>${p.referencia || p.colonia || ""}</p>
          <p class="detalle__eta">${p.id === "base" ? "Próxima salida" : "Próxima combi"} (simulación): <strong data-eta-sim="${p.id}">—</strong></p>
          ${tieneZona ? `<button type="button" class="boton boton--primario" data-zona="${p.id}">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3Z M4 7.5l8 4.5 8-4.5M12 12v9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>
              ${p.id === "base" ? "Ver la base en 3D" : "Ver la zona en 3D"}</button>` : ""}`;
        const b = detalleEl.querySelector("[data-zona]");
        if (b) b.addEventListener("click", () => abrirZona(p.id));
    }

    function abrirZona(id) {
        const p = porId[id];
        if (!p) return;
        siguiendo = false;
        if (!window.VisorZona) { irA(id); if (window.MapaCompleto) window.MapaCompleto.abrir(); return; }
        window.VisorZona.abrir({ parada: p, rutaGeo, modeloParada: MODELO_PARADA });
    }

    // Botones "data-ir" (panel, diagrama de la portada, fichas de paradas)
    document.addEventListener("click", e => {
        const b = e.target.closest("[data-ir]");
        if (!b) return;
        if (b.hasAttribute("data-desplazar")) document.getElementById("recorrido").scrollIntoView({ behavior: "smooth", block: "start" });
        irA(b.dataset.ir);
    });
    document.addEventListener("click", e => {
        const b = e.target.closest("[data-abrir-zona]");
        if (b) abrirZona(b.dataset.abrirZona);
    });

    // ---------- Cámara ----------
    const limites = new maplibregl.LngLatBounds();
    R.trazo.forEach(c => limites.extend(c));
    const vistaCompleta = (dur = 900) => {
        siguiendo = false;
        actualizarBotonSeguir();
        map.fitBounds(limites, { padding: { top: 70, bottom: 70, left: 50, right: 50 }, pitch: 0, bearing: 0, duration: dur });
    };

    // Reloj de la simulación (esquina superior izquierda del mapa)
    const reloj = document.createElement("div");
    reloj.className = "mapa__reloj";
    reloj.innerHTML = `<span class="mapa__reloj-hora" data-reloj-sim>06:05</span>
      <span class="mapa__reloj-texto">Día de servicio simulado<br>1&nbsp;s = 1&nbsp;min · una combi cada 15&nbsp;min</span>
      <button type="button" class="mapa__reloj-boton" data-accion="pausa" aria-label="Pausar la simulación">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>
      <button type="button" class="mapa__reloj-boton" data-accion="rapido" aria-label="Velocidad de la simulación">×1</button>`;
    mapEl.appendChild(reloj);
    const relojEl = reloj.querySelector("[data-reloj-sim]");
    const btnPausa = reloj.querySelector('[data-accion="pausa"]');
    btnPausa.addEventListener("click", () => {
        sim.pausa = !sim.pausa;
        btnPausa.setAttribute("aria-label", sim.pausa ? "Continuar la simulación" : "Pausar la simulación");
        btnPausa.innerHTML = sim.pausa
            ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5l12 7-12 7z" fill="currentColor"/></svg>'
            : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
    });
    const btnRapido = reloj.querySelector('[data-accion="rapido"]');
    btnRapido.addEventListener("click", () => {
        sim.velocidad = sim.velocidad === 1 ? 2 : sim.velocidad === 2 ? 4 : 1;
        btnRapido.textContent = `×${sim.velocidad}`;
    });

    const controles = document.createElement("div");
    controles.className = "mapa__controles";
    controles.innerHTML = `
      <button type="button" class="chip" data-accion="seguir"><span class="chip__combi" aria-hidden="true"></span><span data-texto>Seguir una combi</span></button>
      <button type="button" class="chip" data-accion="completa">Ver recorrido completo</button>
      <button type="button" class="chip" data-accion="cobertura" aria-pressed="false">Cobertura a pie (5 min)</button>
      <button type="button" class="chip chip--destacado" data-accion="guiado"><span data-texto>Recorrido guiado</span></button>`;
    mapEl.appendChild(controles);
    const btnSeguir = controles.querySelector('[data-accion="seguir"]');
    function actualizarBotonSeguir() {
        btnSeguir.classList.toggle("is-active", siguiendo);
        btnSeguir.querySelector("[data-texto]").textContent = siguiendo ? "Dejar de seguir" : "Seguir una combi";
    }
    // la combi que va más adelantada en su vuelta, o la próxima en salir
    const elegirCombi = () => (enRuta.length ? enRuta.reduce((a, b) => (a.salida < b.salida ? b : a)).salida : null);
    btnSeguir.addEventListener("click", () => {
        siguiendo = !siguiendo;
        if (siguiendo) {
            seguida = elegirCombi();
            const c = combiSeguida();
            if (!c) { siguiendo = false; }
            else {
                const g = marco.aGeo(c.x, c.y);
                map.easeTo({ center: [g.lng, g.lat], zoom: 17, pitch: 55, duration: 900 });
            }
        } else seguida = null;
        actualizarBotonSeguir();
    });
    controles.querySelector('[data-accion="completa"]').addEventListener("click", () => { detenerTour(); vistaCompleta(); });
    map.on("dragstart", () => { siguiendo = false; seguida = tour ? seguida : null; actualizarBotonSeguir(); detenerTour(); });

    // ---------- Cobertura: lo que se camina en 5 minutos (≈400 m) desde cada parada ----------
    const circulo = (p, r) => {
        const c = [];
        const local = marco.aLocal(p);
        for (let i = 0; i <= 64; i++) {
            const a = (i / 64) * Math.PI * 2;
            const g = marco.aGeo(local.x + Math.cos(a) * r, local.y + Math.sin(a) * r);
            c.push([g.lng, g.lat]);
        }
        return { type: "Feature", properties: { id: p.id }, geometry: { type: "Polygon", coordinates: [c] } };
    };
    map.addSource("cobertura", { type: "geojson", data: { type: "FeatureCollection", features: R.paradas.map(p => circulo(p, 400)) } });
    map.addLayer({ id: "cobertura-relleno", type: "fill", source: "cobertura", layout: { visibility: "none" }, paint: { "fill-color": "#2F7D5B", "fill-opacity": 0.12 } }, "ruta-2-borde");
    map.addLayer({ id: "cobertura-borde", type: "line", source: "cobertura", layout: { visibility: "none" }, paint: { "line-color": "#2F7D5B", "line-width": 2, "line-dasharray": [2, 2] } }, "ruta-2-borde");
    const btnCobertura = controles.querySelector('[data-accion="cobertura"]');
    btnCobertura.addEventListener("click", () => {
        const ver = btnCobertura.getAttribute("aria-pressed") !== "true";
        btnCobertura.setAttribute("aria-pressed", String(ver));
        btnCobertura.classList.toggle("is-active", ver);
        ["cobertura-relleno", "cobertura-borde"].forEach(id => map.setLayoutProperty(id, "visibility", ver ? "visible" : "none"));
        if (ver) { detenerTour(); vistaCompleta(); }
    });

    // ---------- Recorrido guiado: la cámara va detrás de la próxima combi en salir ----------
    let tour = null;
    const btnGuiado = controles.querySelector('[data-accion="guiado"]');
    function detenerTour() {
        if (!tour) return;
        tour = null;
        seguida = null;
        btnGuiado.classList.remove("is-active");
        btnGuiado.querySelector("[data-texto]").textContent = "Recorrido guiado";
    }
    function recorridoGuiado() {
        if (tour) { detenerTour(); vistaCompleta(); return; }
        tour = {};
        siguiendo = false;
        actualizarBotonSeguir();
        btnGuiado.classList.add("is-active");
        btnGuiado.querySelector("[data-texto]").textContent = "Detener recorrido";
        // la combi que acaba de salir; si no hay, adelanta el reloj a la próxima salida
        const reciente = enRuta.find(c => sim.t - c.salida < 60);
        if (reciente) seguida = reciente.salida;
        else {
            const prox = proximaSalida(sim.t);
            if (prox == null) { detenerTour(); return; }
            sim.t = prox;
            seguida = prox;
        }
        const b = porId.base;
        rumboSuave = map.getBearing();
        map.easeTo({ center: [b.lng, b.lat], zoom: 16.4, pitch: 58, duration: 1400 });
    }
    btnGuiado.addEventListener("click", recorridoGuiado);
    const rumboDe = ang => 90 - (ang * 180) / Math.PI;
    let rumboSuave = 0;

    // ---------- Bucle ----------
    let visible = true;
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(mapEl);
    let anterior = performance.now();
    function bucle(ahora) {
        const dt = Math.min(0.1, (ahora - anterior) / 1000);
        anterior = ahora;
        actualizar(dt);
        avisarEstado();
        if (visible) {
            const c = combiSeguida();
            if (c && tour && !map.isEasing()) {
                const g = marco.aGeo(c.x, c.y);
                const objetivo = rumboDe(c.ang);
                rumboSuave += ((((objetivo - rumboSuave) % 360) + 540) % 360 - 180) * Math.min(1, dt * 1.5);
                map.jumpTo({ center: [g.lng, g.lat], bearing: rumboSuave });
            } else if (c && siguiendo && !map.isEasing()) {
                const g = marco.aGeo(c.x, c.y);
                map.jumpTo({ center: [g.lng, g.lat] });
            }
            map.triggerRepaint();
        }
        requestAnimationFrame(bucle);
    }
    requestAnimationFrame(bucle);

    vistaCompleta(0);
    mostrarDetalle(porId.base);
    avisarEstado(true);

    window.RutaMapa = { irA, abrirZona, mapa: map, simulacion: sim };
}

// ---------- Resumen del recorrido (distancias y tiempos) ----------
function llenarResumen(R, L, tramos) {
    document.querySelectorAll("[data-total-km]").forEach(el => { el.textContent = formatoKm(L); });
    document.querySelectorAll("[data-total-min]").forEach(el => { el.textContent = `${Math.round((L / 1000 / VELOCIDAD_REAL_KMH) * 60)}\u00a0min`; });
    const lista = document.querySelector("[data-tramos]");
    if (lista) {
        lista.innerHTML = tramos.map(t => `
          <li><span>${t.de.corto === "Base" ? "Base" : t.de.name} → ${t.a.corto === "Base" ? "Base" : t.a.name}</span><span>${formatoKm(t.metros)}</span></li>`).join("");
    }
}

function formatoKm(m) {
    return m >= 1000 ? `${(m / 1000).toFixed(1)}\u00a0km` : `${Math.round(m)}\u00a0m`;
}

// Flecha blanca para marcar el sentido del recorrido sobre la línea amarilla.
function flechaRuta() {
    const c = document.createElement("canvas");
    c.width = 40; c.height = 40;
    const g = c.getContext("2d");
    g.fillStyle = "#1D2A33";
    g.beginPath(); g.moveTo(12, 10); g.lineTo(28, 20); g.lineTo(12, 30); g.lineTo(16, 20); g.closePath(); g.fill();
    return g.getImageData(0, 0, 40, 40);
}

// ====================== Utilidades compartidas (también las usa el visor 3D) ======================

function crearMarcoLocal(lat0, lng0) {
    const M_LAT = 110574;
    const M_LNG = 111320 * Math.cos((lat0 * Math.PI) / 180);
    return {
        aLocal: p => ({ x: (p.lng - lng0) * M_LNG, y: (p.lat - lat0) * M_LAT }),
        aGeo: (x, y) => ({ lat: lat0 + y / M_LAT, lng: lng0 + x / M_LNG })
    };
}

function asegurarEdificios3D(map) {
    const estilo = map.getStyle();
    if (estilo.layers.some(l => l.type === "fill-extrusion")) return;
    const fuente = Object.keys(estilo.sources).find(k => estilo.sources[k].type === "vector");
    if (!fuente) return;
    const primeraEtiqueta = (estilo.layers.find(l => l.type === "symbol") || {}).id;
    map.addLayer({
        id: "edificios-3d", type: "fill-extrusion", source: fuente, "source-layer": "building", minzoom: 15,
        paint: {
            "fill-extrusion-color": "#dde0dc",
            "fill-extrusion-height": ["coalesce", ["get", "render_height"], 5],
            "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
            "fill-extrusion-opacity": 0.8
        }
    }, primeraEtiqueta);
}

function prepararRuta(puntosLocales) {
    const puntos = [];
    puntosLocales.forEach(p => {
        const u = puntos[puntos.length - 1];
        if (!u || Math.hypot(p.x - u.x, p.y - u.y) > 0.5) puntos.push(p);
    });
    if (puntos.length < 2) puntos.push({ x: puntos[0].x + 1, y: puntos[0].y });
    const acum = [0];
    for (let i = 1; i < puntos.length; i++) {
        acum.push(acum[i - 1] + Math.hypot(puntos[i].x - puntos[i - 1].x, puntos[i].y - puntos[i - 1].y));
    }
    return { puntos, acum, largo: acum[acum.length - 1] };
}

function puntoEn(ruta, d) {
    const { puntos, acum, largo } = ruta;
    d = Math.max(0, Math.min(largo, d));
    let lo = 0, hi = acum.length - 1;
    while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (acum[mid] <= d) lo = mid; else hi = mid;
    }
    const seg = acum[hi] - acum[lo] || 1;
    const u = (d - acum[lo]) / seg;
    return { x: puntos[lo].x + (puntos[hi].x - puntos[lo].x) * u, y: puntos[lo].y + (puntos[hi].y - puntos[lo].y) * u };
}

// pista (opcional): distancia aproximada sobre el recorrido; sólo se buscan tramos cercanos a ella.
function distanciaMasCercana(ruta, x, y, pista = null) {
    let mejor = { d: 0, dist: Infinity };
    for (let i = 1; i < ruta.puntos.length; i++) {
        if (pista != null && (ruta.acum[i] < pista - 450 || ruta.acum[i - 1] > pista + 450)) continue;
        const a = ruta.puntos[i - 1], b = ruta.puntos[i];
        const dx = b.x - a.x, dy = b.y - a.y;
        const l2 = dx * dx + dy * dy || 1;
        const u = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l2));
        const dist = Math.hypot(x - (a.x + dx * u), y - (a.y + dy * u));
        if (dist < mejor.dist) mejor = { d: ruta.acum[i - 1] + Math.sqrt(l2) * u, dist };
    }
    return mejor.d;
}

function direccionEn(ruta, d, sentido) {
    const MARGEN = 8;
    let a = puntoEn(ruta, d - MARGEN * sentido);
    let b = puntoEn(ruta, d + MARGEN * sentido);
    if (Math.hypot(b.x - a.x, b.y - a.y) < 0.01) {
        a = puntoEn(ruta, sentido > 0 ? 0 : ruta.largo);
        b = puntoEn(ruta, sentido > 0 ? ruta.largo : 0);
    }
    const n = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return { x: (b.x - a.x) / n, y: (b.y - a.y) / n };
}

function anguloMasCorto(desde, hacia) {
    return ((((hacia - desde) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
}

function avance(u) {
    const a = 0.12;
    const v = 1 / (1 - a);
    if (u <= 0) return 0;
    if (u >= 1) return 1;
    if (u < a) return (v * u * u) / (2 * a);
    if (u > 1 - a) return 1 - (v * (1 - u) * (1 - u)) / (2 * a);
    return v * (u - a / 2);
}

const puedeLeerArchivos = () => /^https?:$/.test(location.protocol);

function mostrarAviso(el, titulo, texto) {
    el.innerHTML = `<div class="mapa__aviso"><strong>${titulo}</strong><p>${texto}</p></div>`;
}
