// Visor 3D de la zona de una parada.
//
// - Maquetas detalladas (zonas-3d.js) para las paradas que ya se modelaron a mano;
//   para cualquier otra parada, la maqueta se genera sola con OpenStreetMap.
// - Configurador de caseta: la Caseta LZC (modelo de SketchUp), la versión solar
//   básica, color de acento y la opción de probar un modelo propio (.glb).
// - Hora del día con la posición real del sol en Lázaro Cárdenas: sombras,
//   atardecer y noche con luminarias encendidas.
// - Pasajeros que esperan en la caseta y suben a la combi.
//
// Usa funciones compartidas de map.js (crearMarcoLocal, prepararRuta, etc.).

(function () {
    const MITAD = 150; // media maqueta automática, en metros
    const RADIO_CONSULTA = 230;
    const SERVIDORES_OVERPASS = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter"
    ];
    const ANCHO_CALLE = {
        motorway: 16, trunk: 14, primary: 13, secondary: 11, tertiary: 9,
        unclassified: 7, residential: 7, living_street: 6, road: 7, service: 4.5, track: 3.5
    };
    const PEATONAL = new Set(["footway", "path", "pedestrian", "cycleway", "steps", "corridor", "bridleway"]);
    const COLORES_MURO = [0xf1e3c8, 0xe9cfae, 0xf3d9d2, 0xd7e3e8, 0xe6e1d3, 0xf0d7a8, 0xd9e2cf, 0xeedfd0, 0xe4d2c3];
    const VELOCIDAD_COMBI = 9;
    const LATITUD = 17.97;
    const LONGITUD = -102.22;

    let THREE = null;
    let OrbitControls = null;
    let GLTFLoader = null;
    let posproceso = null; // { composer, ao } oclusión ambiental (sombras de contacto)
    let cielo = null;
    let pmrem = null;
    let escenaCielo = null;
    let ultimoEntorno = null;
    let horaEntorno = null;
    let ui = null;
    let renderer = null;
    let camara = null;
    let controles = null;
    let escena = null;
    let luz = null;
    let zonaActual = null;
    let abierto = false;
    let solicitud = 0;
    let anterior = 0;
    let vuelo = null;
    let pausado = false; // para sacar capturas cuadro por cuadro (imágenes de la página)
    let focoPrevio = null;
    const zonas = new Map();

    // Configuración de la caseta (se conserva al cambiar de parada)
    const config = { diseno: "lzc", acento: null, hora: 11 };
    let modeloPropio = null;
    let nombrePropio = "Tu diseño";
    let casetaActiva = null;
    let luzCaseta = null;

    // ====================== Interfaz ======================

    function construirUI() {
        if (ui) return;
        const disenos = window.Casetas3D ? window.Casetas3D.disenos : {};
        const acentos = window.Casetas3D ? window.Casetas3D.acentos : {};
        const raiz = document.createElement("div");
        raiz.className = "visor";
        raiz.hidden = true;
        raiz.innerHTML = `
          <div class="visor__fondo" data-cerrar></div>
          <div class="visor__ventana" role="dialog" aria-modal="true" aria-labelledby="visorTitulo">
            <div class="visor__lienzo">
              <div class="visor__cargando" data-cargando>
                <span class="visor__spinner"></span>
                <span data-cargando-texto>Preparando la zona…</span>
              </div>
              <div class="visor__soltar" data-soltar hidden>Suelta tu archivo .glb para probarlo en la parada</div>
              <p class="visor__pista">Arrastra para girar · rueda o pellizco para acercar · clic derecho para mover</p>
            </div>
            <aside class="visor__info">
              <button type="button" class="visor__cerrar" data-cerrar aria-label="Cerrar visor 3D">
                <svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
              </button>
              <p class="visor__eyebrow">Maqueta de la zona</p>
              <h2 id="visorTitulo" data-titulo></h2>
              <p class="visor__calle" data-calle></p>
              <p class="visor__desc" data-desc></p>

              <div class="visor__grupo" data-grupo-caseta>
                <span class="visor__etiqueta">Caseta</span>
                <div class="visor__disenos" role="group" aria-label="Diseño de la caseta">
                  ${Object.entries(disenos).map(([id, d]) => `<button type="button" data-diseno="${id}">${d.nombre}</button>`).join("")}
                  <button type="button" data-diseno="propio" hidden data-propio>Tu diseño</button>
                  <button type="button" data-diseno="ninguna">Sin caseta</button>
                </div>
                <p class="visor__nota" data-diseno-desc></p>
                <div class="visor__acentos" role="radiogroup" aria-label="Color de la caseta" data-acentos>
                  ${Object.entries(acentos).map(([id, c]) => `<button type="button" role="radio" aria-label="Color ${id}" data-acento="${id}" style="--c:#${c.toString(16).padStart(6, "0")}"></button>`).join("")}
                </div>
                <label class="visor__subir">
                  <input type="file" accept=".glb,.gltf,model/gltf-binary" data-archivo hidden>
                  <span>Cargar mi caseta (.glb)</span>
                </label>
              </div>

              <div class="visor__grupo">
                <span class="visor__etiqueta">Hora del día <output data-hora-texto></output></span>
                <input type="range" min="5" max="23" step="0.25" value="11" data-hora aria-label="Hora del día">
                <div class="visor__horas">
                  <button type="button" data-hora-fija="7.5">Mañana</button>
                  <button type="button" data-hora-fija="14">Mediodía</button>
                  <button type="button" data-hora-fija="18.2">Atardecer</button>
                  <button type="button" data-hora-fija="21">Noche</button>
                </div>
                <p class="visor__nota">Sol calculado para Lázaro Cárdenas en la fecha de hoy: revisa a qué hora da sombra la caseta.</p>
              </div>

              <div class="visor__grupo">
                <span class="visor__etiqueta">Cámara</span>
                <div class="visor__vistas">
                  <button type="button" data-vista="inicio" data-vista-inicio>Caseta</button>
                  <button type="button" data-vista="calle">A pie de calle</button>
                  <button type="button" data-vista="aerea">Aérea</button>
                </div>
              </div>

              <div class="visor__entorno" data-entorno-caja>
                <span class="visor__etiqueta">Qué hay alrededor</span>
                <ul data-entorno></ul>
              </div>

              <p class="visor__fuente" data-fuente></p>
              <button type="button" class="visor__reintentar" data-reintentar hidden>Reintentar descarga</button>
            </aside>
          </div>`;
        document.body.appendChild(raiz);

        ui = {
            raiz,
            lienzo: raiz.querySelector(".visor__lienzo"),
            cargando: raiz.querySelector("[data-cargando]"),
            cargandoTexto: raiz.querySelector("[data-cargando-texto]"),
            soltar: raiz.querySelector("[data-soltar]"),
            titulo: raiz.querySelector("[data-titulo]"),
            calle: raiz.querySelector("[data-calle]"),
            desc: raiz.querySelector("[data-desc]"),
            entorno: raiz.querySelector("[data-entorno]"),
            entornoCaja: raiz.querySelector("[data-entorno-caja]"),
            fuente: raiz.querySelector("[data-fuente]"),
            reintentar: raiz.querySelector("[data-reintentar]"),
            disenos: [...raiz.querySelectorAll("[data-diseno]")],
            propio: raiz.querySelector("[data-propio]"),
            disenoDesc: raiz.querySelector("[data-diseno-desc]"),
            acentos: [...raiz.querySelectorAll("[data-acento]")],
            cajaAcentos: raiz.querySelector("[data-acentos]"),
            archivo: raiz.querySelector("[data-archivo]"),
            hora: raiz.querySelector("[data-hora]"),
            horaTexto: raiz.querySelector("[data-hora-texto]"),
            botonesVista: [...raiz.querySelectorAll("[data-vista]")],
            grupoCaseta: raiz.querySelector("[data-grupo-caseta]"),
            vistaInicio: raiz.querySelector("[data-vista-inicio]")
        };

        raiz.querySelectorAll("[data-cerrar]").forEach(b => b.addEventListener("click", cerrar));
        document.addEventListener("keydown", e => { if (abierto && e.key === "Escape") cerrar(); });
        ui.botonesVista.forEach(b => b.addEventListener("click", () => irAVista(b.dataset.vista)));
        ui.disenos.forEach(b => b.addEventListener("click", () => { config.diseno = b.dataset.diseno; config.acento = null; montarCaseta(); }));
        ui.acentos.forEach(b => b.addEventListener("click", () => { config.acento = b.dataset.acento; montarCaseta(); }));
        ui.hora.addEventListener("input", () => aplicarHora(parseFloat(ui.hora.value)));
        raiz.querySelectorAll("[data-hora-fija]").forEach(b => b.addEventListener("click", () => aplicarHora(parseFloat(b.dataset.horaFija))));
        ui.archivo.addEventListener("change", () => { if (ui.archivo.files[0]) cargarArchivoPropio(ui.archivo.files[0]); ui.archivo.value = ""; });
        ui.lienzo.addEventListener("dragover", e => { e.preventDefault(); ui.soltar.hidden = false; });
        ui.lienzo.addEventListener("dragleave", () => { ui.soltar.hidden = true; });
        ui.lienzo.addEventListener("drop", e => {
            e.preventDefault();
            ui.soltar.hidden = true;
            const f = e.dataTransfer.files && e.dataTransfer.files[0];
            if (f) cargarArchivoPropio(f);
        });
        ui.reintentar.addEventListener("click", () => {
            if (!zonaActual) return;
            const { opciones } = zonaActual;
            zonas.delete(opciones.parada.id);
            try { localStorage.removeItem(claveCache(opciones.parada)); } catch (e) { /* sin almacenamiento */ }
            abrir(opciones);
        });
    }

    function estadoCarga(activo, texto) {
        ui.cargando.hidden = !activo;
        if (texto) ui.cargandoTexto.textContent = texto;
    }

    // ====================== Abrir / cerrar ======================

    async function abrir(opciones) {
        construirUI();
        const { parada } = opciones;
        const id = ++solicitud;

        ui.titulo.textContent = parada.name;
        ui.calle.textContent = parada.calle || "";
        ui.desc.textContent = parada.referencia || parada.desc || "";
        ui.entorno.innerHTML = "";
        ui.entornoCaja.hidden = true;
        ui.fuente.textContent = "";
        ui.reintentar.hidden = true;

        if (!abierto) {
            focoPrevio = document.activeElement;
            ui.raiz.hidden = false;
            document.body.classList.add("visor-abierto");
            abierto = true;
            requestAnimationFrame(() => ui.raiz.classList.add("is-open"));
            ui.raiz.querySelector(".visor__cerrar").focus({ preventScroll: true });
        }
        estadoCarga(true, "Preparando la zona…");

        try {
            if (!THREE) {
                THREE = await import("three");
                ({ OrbitControls } = await import("three/addons/controls/OrbitControls.js"));
                ({ GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js"));
                await cargarPosproceso();
                iniciarRenderer();
                await cargarPlantillaLZC();
                // ¿Ya existe la caseta del equipo en modelos/parada.glb?
                const glb = await cargarCaseta(opciones.modeloParada);
                if (glb) {
                    modeloPropio = glb;
                    nombrePropio = "Diseño del equipo";
                    config.diseno = "propio";
                }
            }

            let zona = zonas.get(parada.id);
            if (!zona) {
                zona = await construirZona(opciones, texto => { if (id === solicitud) estadoCarga(true, texto); });
                zonas.set(parada.id, zona);
            }
            if (id !== solicitud || !abierto) return;

            if (zonaActual && zonaActual.grupo.parent) escena.remove(zonaActual.grupo);
            zonaActual = zona;
            escena.add(zona.grupo);
            recortarPosproceso(zona.planos);
            ajustarLuzAZona(zona);
            ui.fuente.innerHTML = zona.fuente;
            ui.reintentar.hidden = !zona.sinDatos;
            if (zona.entorno && zona.entorno.length) {
                ui.entorno.innerHTML = zona.entorno.map(t => `<li>${t}</li>`).join("");
                ui.entornoCaja.hidden = false;
            }
            ui.grupoCaseta.hidden = !zona.caseta;
            ui.vistaInicio.textContent = zona.nombreInicio || "Caseta";
            await montarCaseta();
            montarContador(zona);
            aplicarHora(config.hora);
            ajustarTamano();
            irAVista("inicio", true);
            estadoCarga(false);
            iniciarBucle();
        } catch (err) {
            console.error(err);
            if (id === solicitud) estadoCarga(true, "No se pudo abrir el visor 3D. Revisa tu conexión e intenta de nuevo.");
        }
    }

    function cerrar() {
        if (!abierto) return;
        abierto = false;
        solicitud++;
        ui.raiz.classList.remove("is-open");
        document.body.classList.remove("visor-abierto");
        if (renderer) renderer.setAnimationLoop(null);
        setTimeout(() => { if (!abierto) ui.raiz.hidden = true; }, 250);
        if (focoPrevio && focoPrevio.focus) focoPrevio.focus({ preventScroll: true });
    }

    // ====================== Render y luz ======================

    function iniciarRenderer() {
        renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.localClippingEnabled = true;
        // Color cinematográfico: tonos suaves en las altas luces, como una foto
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        ui.lienzo.prepend(renderer.domElement);

        escena = new THREE.Scene();
        escena.background = new THREE.Color(0xe6eef3);
        escena.fog = new THREE.Fog(0xe6eef3, 380, 900);

        // Cielo: degradado del cenit al horizonte con el resplandor del sol
        cielo = new THREE.Mesh(new THREE.SphereGeometry(2500, 32, 16), new THREE.ShaderMaterial({
            side: THREE.BackSide, depthWrite: false, fog: false,
            uniforms: {
                cenit: { value: new THREE.Color(0x2f6fb8) },
                horizonte: { value: new THREE.Color(0xcfe0ea) },
                suelo: { value: new THREE.Color(0x8d8a80) },
                solDir: { value: new THREE.Vector3(0, 0, 1) },
                solColor: { value: new THREE.Color(0xfff2d8) },
                brillo: { value: 1 },
                colorNube: { value: new THREE.Color(0xffffff) }
            },
            vertexShader: `varying vec3 vDir; void main(){ vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
            fragmentShader: `uniform vec3 cenit; uniform vec3 horizonte; uniform vec3 suelo; uniform vec3 solDir; uniform vec3 solColor; uniform float brillo; uniform vec3 colorNube; varying vec3 vDir;
                float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
                float ruido(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
                  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }
                float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 6; i++) { v += a * ruido(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return v; }
                void main(){ vec3 d = normalize(vDir); float h = d.z;
                  vec3 c = h > 0.0 ? mix(horizonte, cenit, pow(clamp(h, 0.0, 1.0), 0.55)) : mix(horizonte, suelo, clamp(-h * 6.0, 0.0, 1.0));
                  // cúmulos de la costa: ruido sobre un techo de nubes, se desvanecen hacia el horizonte
                  if (h > 0.0) {
                    vec2 uv = d.xy / (h + 0.12) * 1.15;
                    float n = fbm(uv + vec2(4.0, 2.0));
                    float cob = smoothstep(0.5, 0.74, n) * smoothstep(0.02, 0.3, h);
                    float s = max(dot(d, normalize(solDir)), 0.0);
                    vec3 nube = colorNube * (0.78 + 0.3 * smoothstep(0.55, 0.85, n) + 0.25 * pow(s, 6.0));
                    c = mix(c, nube, cob * 0.9);
                  }
                  float s = max(dot(d, normalize(solDir)), 0.0);
                  c += solColor * (pow(s, 900.0) * 6.0 + pow(s, 24.0) * 0.28 + pow(s, 4.0) * 0.08) * step(-0.02, solDir.z);
                  gl_FragColor = vec4(c * brillo, 1.0);
                  #include <tonemapping_fragment>
                  #include <colorspace_fragment>
                }`
        }));
        cielo.renderOrder = -10;
        cielo.frustumCulled = false;
        cielo.onBeforeRender = (r, sc, cam) => cielo.position.copy(cam.position);
        escena.add(cielo);
        // reflejos de los vidrios, la pintura de los autos y el metal: salen del mismo cielo
        pmrem = new THREE.PMREMGenerator(renderer);
        escenaCielo = new THREE.Scene();
        const cieloEntorno = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), cielo.material);
        escenaCielo.add(cieloEntorno);

        camara = new THREE.PerspectiveCamera(45, 1, 0.5, 4000);
        camara.up.set(0, 0, 1);

        controles = new OrbitControls(camara, renderer.domElement);
        controles.enableDamping = true;
        controles.dampingFactor = 0.08;
        controles.maxPolarAngle = 1.54;
        controles.minDistance = 3;
        controles.maxDistance = 700;
        controles.addEventListener("start", () => { vuelo = null; });

        luz = {
            cielo: new THREE.HemisphereLight(0xffffff, 0xb9ae9a, 1.5),
            ambiente: new THREE.AmbientLight(0xffffff, 0.35),
            sol: new THREE.DirectionalLight(0xfff6e8, 3.2),
            calle: new THREE.PointLight(0xffd59a, 0, 32, 1.7)
        };
        luz.sol.castShadow = true;
        luz.sol.shadow.mapSize.set(4096, 4096);
        luz.sol.shadow.radius = 3;
        luz.sol.shadow.bias = -0.0004;
        luz.sol.shadow.normalBias = 0.3;
        Object.values(luz).forEach(l => escena.add(l));
        escena.add(luz.sol.target);

        if (posproceso) iniciarPosproceso();
        new ResizeObserver(ajustarTamano).observe(ui.lienzo);
    }

    // ---------- Oclusión ambiental (GTAO): oscurece rincones, bajo los autos y al pie de los muros ----------
    let Pases = null;
    async function cargarPosproceso() {
        const baja = /calidad=baja/.test(location.search) || (window.matchMedia && window.matchMedia("(max-width: 700px)").matches);
        if (baja) return;
        try {
            const [ec, rp, gt, op] = await Promise.all([
                import("three/addons/postprocessing/EffectComposer.js"),
                import("three/addons/postprocessing/RenderPass.js"),
                import("three/addons/postprocessing/GTAOPass.js"),
                import("three/addons/postprocessing/OutputPass.js")
            ]);
            Pases = { EffectComposer: ec.EffectComposer, RenderPass: rp.RenderPass, GTAOPass: gt.GTAOPass, OutputPass: op.OutputPass };
            posproceso = {};
        } catch (e) { posproceso = null; }
    }
    function iniciarPosproceso() {
        const composer = new Pases.EffectComposer(renderer);
        composer.addPass(new Pases.RenderPass(escena, camara));
        const ao = new Pases.GTAOPass(escena, camara, 512, 512);
        ao.updateGtaoMaterial({ radius: 1.4, distanceExponent: 1.6, thickness: 1.5, scale: 1.1, samples: 16 });
        ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 16 });
        ao.blendIntensity = 0.85;
        composer.addPass(ao);
        composer.addPass(new Pases.OutputPass());
        posproceso = { composer, ao, lentos: 0, cuadros: 0 };
    }
    function renderizar(dt) {
        if (posproceso && posproceso.composer) {
            posproceso.composer.render(dt);
            // si la computadora no puede con la oclusión ambiental, se apaga sola
            posproceso.cuadros++;
            if (dt > 0.06) posproceso.lentos++;
            if (posproceso.cuadros === 90 && posproceso.lentos > 60) posproceso = null;
        } else renderer.render(escena, camara);
    }
    // Las piezas fuera de la maqueta están recortadas: el pase de normales también.
    function recortarPosproceso(planos) {
        if (posproceso && posproceso.ao) posproceso.ao.normalMaterial.clippingPlanes = planos || [];
    }
    function actualizarEntorno(hora) {
        if (!pmrem || (horaEntorno !== null && Math.abs(hora - horaEntorno) < 0.4)) return;
        horaEntorno = hora;
        const rt = pmrem.fromScene(escenaCielo, 0, 0.1, 300);
        if (ultimoEntorno) ultimoEntorno.dispose();
        ultimoEntorno = rt;
        escena.environment = rt.texture;
    }

    function ajustarLuzAZona(zona) {
        const lim = zona.lim || { minX: -MITAD, maxX: MITAD, minY: -MITAD, maxY: MITAD };
        const cx = (lim.minX + lim.maxX) / 2, cy = (lim.minY + lim.maxY) / 2;
        const r = Math.max(lim.maxX - lim.minX, lim.maxY - lim.minY) * 0.62;
        luz.centro = new THREE.Vector3(cx, cy, 0);
        luz.sol.target.position.copy(luz.centro);
        const sc = luz.sol.shadow.camera;
        sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r;
        sc.near = 10; sc.far = 1400;
        sc.updateProjectionMatrix();
        const c = zona.caseta;
        if (c) luz.calle.position.set(c.position.x, c.position.y, 10);
        else if (zona.puntoLuz) luz.calle.position.set(zona.puntoLuz.x, zona.puntoLuz.y, zona.puntoLuz.z);
    }

    // Posición del sol (vector unitario: x = este, y = norte, z = arriba).
    function posicionSol(hora) {
        const hoy = new Date();
        const n = Math.round((hoy - new Date(hoy.getFullYear(), 0, 0)) / 86400000);
        const decl = (23.44 * Math.PI / 180) * Math.sin((2 * Math.PI * (284 + n)) / 365);
        const lat = (LATITUD * Math.PI) / 180;
        const horaSolar = hora - (-LONGITUD - 90) / 15; // hora del centro (UTC−6) a hora solar
        const H = ((horaSolar - 12) * 15 * Math.PI) / 180;
        return new THREE.Vector3(
            -Math.cos(decl) * Math.sin(H),
            Math.sin(decl) * Math.cos(lat) - Math.cos(decl) * Math.sin(lat) * Math.cos(H),
            Math.sin(decl) * Math.sin(lat) + Math.cos(decl) * Math.cos(lat) * Math.cos(H)
        ).normalize();
    }

    const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const mezcla = (c1, c2, t) => new THREE.Color(c1).lerp(new THREE.Color(c2), t);

    function aplicarHora(h) {
        config.hora = h;
        if (ui) {
            ui.hora.value = String(h);
            const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
            ui.horaTexto.textContent = `${hh}:${String(mm).padStart(2, "0")}`;
        }
        if (!luz || !luz.centro) return;
        const s = posicionSol(h);
        const dia = suave(-0.04, 0.14, s.z);
        const alto = suave(0.05, 0.45, s.z);
        const noche = 1 - dia;
        const pos = luz.centro.clone().addScaledVector(s.z > 0 ? s : new THREE.Vector3(s.x, s.y, 0.05).normalize(), 600);
        luz.sol.position.copy(pos);
        luz.sol.intensity = 3.6 * dia;
        luz.sol.color.copy(mezcla(0xffa868, 0xfff6e8, alto));
        luz.cielo.intensity = 0.15 + 0.55 * dia;
        luz.cielo.color.copy(mezcla(0x324766, 0xffffff, dia));
        luz.ambiente.intensity = 0.06 + 0.06 * dia;
        luz.calle.intensity = 170 * noche;
        const fondo = s.z < 0.02 ? mezcla(0x0f1a2a, 0x2a3550, suave(-0.15, 0.02, s.z)) : mezcla(0xf2b07c, 0xdfe7ee, alto);
        escena.background.copy(fondo);
        escena.fog.color.copy(fondo);
        if (cielo) {
            const u = cielo.material.uniforms;
            u.solDir.value.copy(s);
            u.cenit.value.copy(mezcla(0x0b1424, mezcla(0x3a5f95, 0x1f62bd, alto), dia));
            u.horizonte.value.copy(mezcla(0x1c2638, mezcla(0xf0a76e, 0xbfd6e8, alto), dia));
            u.suelo.value.copy(mezcla(0x10151c, 0x8d8a80, dia));
            u.solColor.value.copy(mezcla(0xff9a50, 0xfff2d8, alto));
            u.colorNube.value.copy(mezcla(0x262c38, mezcla(0xf3c3a0, 0xf4f6f8, alto), dia));
            escena.fog.color.copy(u.horizonte.value);
            renderer.toneMappingExposure = 0.85 + 0.15 * dia;
            actualizarEntorno(h);
        }
        // luminarias, letreros y pantallas
        const brillo = 0.12 + 2.6 * noche;
        if (zonaActual && zonaActual.luces) zonaActual.luces.forEach(m => { m.emissiveIntensity = brillo; });
        if (casetaActiva) {
            casetaActiva.luces.forEach(m => { m.emissiveIntensity = 0.35 + 2.2 * noche; });
            if (casetaActiva.noche) casetaActiva.noche(noche);
        }
        if (luzCaseta) luzCaseta.intensity = 40 * noche;
        if (zonaActual && zonaActual.contador) zonaActual.contador.luces.forEach(m => { m.emissiveIntensity = 0.6 + 0.9 * noche; });
    }

    function ajustarTamano() {
        if (!renderer) return;
        const w = ui.lienzo.clientWidth || 1;
        const h = ui.lienzo.clientHeight || 1;
        renderer.setSize(w, h, false);
        if (posproceso && posproceso.composer) posproceso.composer.setSize(w, h);
        camara.aspect = w / h;
        camara.updateProjectionMatrix();
    }

    function iniciarBucle() {
        anterior = performance.now();
        renderer.setAnimationLoop(ahora => {
            const dt = Math.min(0.1, (ahora - anterior) / 1000);
            anterior = ahora;
            if (pausado) return;
            cuadro(dt, ahora);
        });
    }

    function cuadro(dt, ahora = performance.now()) {
        {
            if (zonaActual && zonaActual.animar) zonaActual.animar(dt, ahora / 1000);
            if (zonaActual && zonaActual.contador) {
                const l = zonaActual.llegada;
                if (l) zonaActual.contador.actualizar(l.segundos, l.enParada);
                else if (window.RutaHorario) zonaActual.contador.actualizar(window.RutaHorario.segundosPara(zonaActual.opciones.parada.id), false);
            }
            if (vuelo) avanzarVuelo(ahora);
            controles.update();
            renderizar(dt);
        }
    }

    // ====================== Caseta: configurador ======================

    async function montarCaseta() {
        if (!ui) return;
        const disenos = window.Casetas3D ? window.Casetas3D.disenos : {};
        if (config.diseno === "propio" && !modeloPropio) config.diseno = "lzc";
        if (config.diseno === "lzc" && !(window.Casetas3D && window.Casetas3D.plantillaLZC)) config.diseno = "solar";
        ui.propio.hidden = !modeloPropio;
        ui.propio.textContent = nombrePropio;
        ui.disenos.forEach(b => b.classList.toggle("is-active", b.dataset.diseno === config.diseno));
        const d = disenos[config.diseno];
        const acento = config.acento || (d && d.acento);
        ui.cajaAcentos.hidden = !d;
        ui.acentos.forEach(b => b.setAttribute("aria-checked", String(b.dataset.acento === acento)));
        ui.disenoDesc.textContent = d ? d.desc
            : config.diseno === "propio" ? "Tu modelo, escalado a 4.5 m de largo y colocado sobre la banqueta."
                : "Así se ve hoy la parada, sin caseta.";

        if (!zonaActual || !zonaActual.caseta) return;
        const soporte = zonaActual.caseta;
        soporte.clear();
        casetaActiva = null;
        luzCaseta = null;
        if (config.diseno === "ninguna") return aplicarHora(config.hora);

        let objeto;
        if (config.diseno === "propio") {
            objeto = modeloPropio.clone(true);
            casetaActiva = { luces: [], alturaLuz: 2.5, actualizar() {} };
        } else if (d) {
            casetaActiva = d.crear(THREE, { acento, parada: zonaActual.opciones.parada });
            objeto = casetaActiva.grupo;
        } else return;
        objeto.traverse(o => { if (o.isMesh) { o.castShadow = !o.material.transparent; o.receiveShadow = true; } });
        soporte.add(objeto);
        luzCaseta = new THREE.PointLight(0xfff0d0, 0, 9, 2);
        luzCaseta.position.set(0, 0, casetaActiva.alturaLuz);
        soporte.add(luzCaseta);
        aplicarHora(config.hora);
    }

    // Tótem con el contador de llegada, a un lado de la caseta (se queda aunque cambie la caseta).
    function montarContador(zona) {
        if (zona.contador || !zona.caseta || !window.Casetas3D || !window.Casetas3D.crearContador) return;
        const c = window.Casetas3D.crearContador(THREE);
        c.grupo.position.copy(zona.caseta.position);
        c.grupo.rotation.copy(zona.caseta.rotation);
        c.grupo.translateX(3.3);
        c.grupo.translateY(-0.15);
        c.grupo.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        zona.grupo.add(c.grupo);
        zona.contador = c;
    }

    function cargarArchivoPropio(archivo) {
        if (!THREE || !GLTFLoader) return;
        if (!/\.(glb|gltf)$/i.test(archivo.name)) {
            ui.disenoDesc.textContent = "Ese archivo no es un modelo .glb. En Blender: Archivo › Exportar › glTF 2.0 (.glb).";
            return;
        }
        const lector = new FileReader();
        lector.onload = () => {
            new GLTFLoader().parse(lector.result, "", gltf => {
                modeloPropio = Modelos3D.prepararModeloGLB(THREE, gltf.scene, 4.5);
                nombrePropio = archivo.name.replace(/\.(glb|gltf)$/i, "");
                config.diseno = "propio";
                montarCaseta();
            }, err => {
                console.error(err);
                ui.disenoDesc.textContent = "No se pudo leer el modelo. Revisa que se haya exportado como glTF Binary (.glb).";
            });
        };
        lector.readAsArrayBuffer(archivo);
    }

    // ====================== Cámara ======================

    function irAVista(nombre, inmediato) {
        if (!zonaActual) return;
        ui.botonesVista.forEach(b => b.classList.toggle("is-active", b.dataset.vista === nombre));
        const v = zonaActual.vistas[nombre];
        if (!v) return;
        if (inmediato) {
            camara.position.copy(v.posicion);
            controles.target.copy(v.objetivo);
            vuelo = null;
            controles.update();
            return;
        }
        vuelo = { inicio: performance.now(), dur: 1300, p0: camara.position.clone(), t0: controles.target.clone(), p1: v.posicion.clone(), t1: v.objetivo.clone() };
    }

    function avanzarVuelo(ahora) {
        const u = Math.min(1, (ahora - vuelo.inicio) / vuelo.dur);
        const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
        camara.position.lerpVectors(vuelo.p0, vuelo.p1, e);
        controles.target.lerpVectors(vuelo.t0, vuelo.t1, e);
        if (u >= 1) vuelo = null;
    }

    // ====================== Pasajeros ======================

    function crearPersona(camisa, pantalon) {
        const g = new THREE.Group();
        const m = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 });
        const piel = [0x8d5a3b, 0xa86f4c, 0xc68e64][Math.floor(Math.random() * 3)];
        const piernas = [-0.1, 0.1].map(y => {
            const p = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.82).translate(0, 0, -0.41), m(pantalon));
            p.position.set(0, y, 0.84);
            g.add(p);
            return p;
        });
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.44, 0.62), m(camisa));
        torso.position.z = 1.15;
        g.add(torso);
        const cabeza = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), m(piel));
        cabeza.position.z = 1.6;
        g.add(cabeza);
        g.traverse(o => { if (o.isMesh) o.castShadow = true; });
        g.userData.piernas = piernas;
        return g;
    }

    // ====================== Maqueta detallada ======================

    async function construirZonaDetallada(opciones, crearZona) {
        const z = crearZona(THREE);
        const grupo = z.grupo;
        const fuente = 'Maqueta elaborada a partir de Google Street View, imagen satelital y <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>. Proporciones aproximadas.';

        // Zonas sin caseta (la base): la maqueta trae su propia animación
        if (!z.caseta) {
            return {
                opciones, grupo, caseta: null, sinDatos: false,
                lim: z.lim, planos: z.planos, luces: z.luces || [], llegada: null,
                animar: dt => z.animar(dt), vistas: z.vistas, entorno: z.entorno,
                nombreInicio: z.nombreInicio, puntoLuz: z.puntoLuz, fuente
            };
        }

        // soporte donde el configurador monta la caseta
        const caseta = new THREE.Group();
        caseta.position.set(z.caseta.x, z.caseta.y, 0.16);
        caseta.rotation.z = z.caseta.ang;
        grupo.add(caseta);

        const combi = Modelos3D.crearCombi(THREE);
        combi.traverse(o => {
            if (o.isMesh) {
                o.castShadow = true;
                o.material = o.material.clone();
                o.material.clippingPlanes = z.planos;
            }
        });
        grupo.add(combi);
        // faros de la combi (se encienden de noche)
        const faros = combi.children.filter(o => o.isMesh && o.material.emissiveIntensity === 0.6).map(o => o.material);

        // Llega, se detiene en la parada, suben pasajeros y sigue su camino.
        const { marco, carril, parar, desde, hasta } = z.combi;
        const v = 9;
        const tramos = [
            { fase: "llegando", de: desde, a: 0, dur: (-desde / v) * 1.25 },
            { fase: "parada", pausa: 7, en: 0 },
            { fase: "saliendo", de: 0, a: hasta, dur: (hasta / v) * 1.2 },
            { fase: "fuera", pausa: 4, en: hasta }
        ];
        const ciclo = tramos.reduce((s, t) => s + (t.pausa || t.dur), 0);
        let t = 0;
        const fren = u => 1 - (1 - u) * (1 - u);
        const arranque = u => u * u;
        const estado = { fase: "llegando", u: 0 };
        const llegada = { segundos: null, enParada: false };
        const animarCombi = dt => {
            t = (t + dt) % ciclo;
            let r = t, s = 0;
            for (let i = 0; i < tramos.length; i++) {
                const tr = tramos[i];
                const dur = tr.pausa || tr.dur;
                if (r < dur) {
                    estado.fase = tr.fase;
                    estado.u = r / dur;
                    if (tr.pausa) s = tr.en;
                    else s = tr.de + (tr.a - tr.de) * (i === 0 ? fren(r / dur) : arranque(r / dur));
                    break;
                }
                r -= dur;
            }
            const cerca = Math.max(0, 1 - Math.abs(s) / 22);
            const p = marco.en(s, carril + (parar - carril) * cerca * cerca * (3 - 2 * cerca));
            combi.position.set(p.x, p.y, 0);
            combi.rotation.z = p.ang;
            // segundos para la siguiente llegada -> "minutos" en la pantalla de la caseta
            const restante = estado.fase === "parada" ? 0 : (estado.fase === "llegando" ? tramos[0].dur - t : ciclo - t + tramos[0].dur);
            llegada.segundos = restante;
            llegada.enParada = estado.fase === "parada";
        };

        // Pasajeros
        const pz = z.pasajeros;
        const camisas = [0xd9532b, 0x2f6fcf, 0xf2f2f2, 0x2e9e4f, 0xf2c200, 0x7a4fa0];
        const lugares = [[-1.3, 0.35], [-0.2, 0.35], [0.9, -0.45], [-1.6, -0.5]];
        const personas = lugares.map((l, i) => {
            const p = crearPersona(camisas[i % camisas.length], [0x2b3a55, 0x3a3f44, 0x5a4535][i % 3]);
            grupo.add(p);
            return { obj: p, lugar: l, estado: "esperando", fase: Math.random() * 6, sube: i !== 3 };
        });
        const puntoLugar = l => caseta.localToWorld(new THREE.Vector3(l[0], l[1], 0.16));
        const puerta = () => { const q = marco.en(0.6, pz.puerta); return new THREE.Vector3(q.x, q.y, 0.06); };
        const origenes = [marco.en(-22, pz.d), marco.en(24, pz.d)];
        personas.forEach(p => { p.obj.position.copy(puntoLugar(p.lugar)); });
        const caminar = (p, destino, dt, vel = 1.35) => {
            const pos = p.obj.position;
            const dx = destino.x - pos.x, dy = destino.y - pos.y, dist = Math.hypot(dx, dy);
            if (dist < 0.05) { p.obj.userData.piernas.forEach(l => { l.rotation.y = 0; }); return true; }
            const paso = Math.min(dist, vel * dt);
            pos.x += (dx / dist) * paso;
            pos.y += (dy / dist) * paso;
            pos.z = destino.z;
            p.obj.rotation.z = Math.atan2(dy, dx);
            p.fase += dt * 8;
            p.obj.userData.piernas.forEach((l, k) => { l.rotation.y = Math.sin(p.fase + k * Math.PI) * 0.5; });
            return false;
        };
        const animarPasajeros = dt => {
            caseta.updateMatrixWorld(true);
            personas.forEach((p, i) => {
                if (p.estado === "esperando") {
                    p.obj.visible = true;
                    const l = puntoLugar(p.lugar);
                    caminar(p, l, dt);
                    // mira hacia la calle mientras espera
                    if (p.obj.position.distanceTo(l) < 0.1) p.obj.rotation.z = caseta.rotation.z - Math.PI / 2;
                    if (p.sube && estado.fase === "parada" && estado.u > 0.12 + i * 0.12) p.estado = "abordando";
                } else if (p.estado === "abordando") {
                    if (caminar(p, puerta(), dt, 1.5)) { p.estado = "arriba"; p.obj.visible = false; }
                } else if (p.estado === "arriba") {
                    if (estado.fase === "fuera" || (estado.fase === "llegando" && estado.u < 0.3)) {
                        const o = origenes[i % 2];
                        p.obj.position.set(o.x, o.y, 0.16);
                        p.obj.visible = true;
                        p.estado = "esperando";
                    }
                }
            });
        };

        return {
            opciones, grupo, caseta, sinDatos: false,
            lim: z.lim,
            planos: z.planos,
            luces: [...(z.luces || []), ...faros],
            llegada,
            animar: dt => { z.animar(dt); animarCombi(dt); animarPasajeros(dt); },
            vistas: z.vistas,
            entorno: z.entorno,
            fuente: 'Maqueta elaborada a partir de Google Street View y de <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>. Proporciones aproximadas.'
        };
    }

    async function construirZona(opciones, avisar) {
        const { parada, rutaGeo, modeloParada } = opciones;
        if (window.Zonas3D && window.Zonas3D[parada.id]) {
            avisar("Construyendo la maqueta de la zona…");
            await new Promise(r => setTimeout(r, 30));
            return construirZonaDetallada(opciones, window.Zonas3D[parada.id]);
        }
        const marco = crearMarcoLocal(parada.lat, parada.lng);
        const grupo = new THREE.Group();
        const planos = [
            new THREE.Plane(new THREE.Vector3(-1, 0, 0), MITAD),
            new THREE.Plane(new THREE.Vector3(1, 0, 0), MITAD),
            new THREE.Plane(new THREE.Vector3(0, -1, 0), MITAD),
            new THREE.Plane(new THREE.Vector3(0, 1, 0), MITAD)
        ];
        const materiales = new Map();
        const mat = (color, extra = {}) => {
            const clave = color + JSON.stringify(extra);
            if (!materiales.has(clave)) {
                materiales.set(clave, new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, clippingPlanes: planos, ...extra }));
            }
            return materiales.get(clave);
        };

        // ---- Ruta de la combi en este marco ----
        const ruta = prepararRuta(rutaGeo.map(marco.aLocal));
        const dParada = distanciaMasCercana(ruta, 0, 0, parada.km != null ? parada.km * 1000 : null);
        const sentido = +1; // el trazo va en el sentido en que circulan las combis
        const pParada = puntoEn(ruta, dParada);
        const dirParada = direccionEn(ruta, dParada, sentido);
        const derecha = { x: dirParada.y, y: -dirParada.x };

        // ---- 1) Maqueta propia hecha en Blender ----
        if (parada.modeloZona && puedeLeerArchivos()) {
            avisar("Buscando la maqueta de la zona…");
            const propia = await cargarGLB(parada.modeloZona);
            if (propia) {
                propia.rotation.x = Math.PI / 2; // glTF (Y arriba) -> Z arriba
                propia.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
                grupo.add(propia);
                const caja = new THREE.Box3().setFromObject(grupo);
                const tam = caja.getSize(new THREE.Vector3());
                const r = Math.max(tam.x, tam.y, 40);
                return {
                    opciones, grupo, caseta: null, anillo: null, animar: null, sinDatos: false,
                    fuente: "Maqueta hecha por el equipo en Blender.",
                    vistas: {
                        inicio: { posicion: new THREE.Vector3(-r * 0.35, -r * 0.45, r * 0.3), objetivo: new THREE.Vector3(0, 0, 1.5) },
                        calle: { posicion: new THREE.Vector3(-12, -6, 1.7), objetivo: new THREE.Vector3(0, 0, 1.4) },
                        aerea: { posicion: new THREE.Vector3(-r * 0.6, -r * 0.9, r * 0.9), objetivo: new THREE.Vector3(0, 0, 0) }
                    }
                };
            }
        }

        // ---- 2) Datos de OpenStreetMap ----
        avisar("Descargando calles y edificios de OpenStreetMap…");
        const osm = await descargarOSM(parada);
        avisar("Construyendo la maqueta…");

        // Por su rectángulo, no por sus vértices: una calle larga puede cruzar la maqueta
        // sin tener ningún punto dentro.
        const enMaqueta = pts => {
            const c = cajaDe(pts), L = MITAD + 25;
            return c.maxX > -L && c.minX < L && c.maxY > -L && c.minY < L;
        };
        const calles = [];
        const peatonales = [];
        const edificios = [];
        const verdes = [];
        const aguas = [];
        const arbolesOSM = [];

        if (osm) {
            osm.elements.forEach(el => {
                const t = el.tags || {};
                if (el.type === "node") {
                    if (t.natural === "tree") arbolesOSM.push(marco.aLocal({ lat: el.lat, lng: el.lon }));
                    return;
                }
                if (!el.geometry || el.geometry.length < 2) return;
                const pts = el.geometry.map(g => marco.aLocal({ lat: g.lat, lng: g.lon }));
                if (!enMaqueta(pts)) return;
                if (t.building && t.building !== "no") {
                    edificios.push({ id: el.id, pts, tags: t });
                } else if (t.highway) {
                    if (PEATONAL.has(t.highway)) peatonales.push({ pts, ancho: 2.2 });
                    else if (ANCHO_CALLE[t.highway]) {
                        const ancho = parseFloat(t.width) || ANCHO_CALLE[t.highway];
                        calles.push({ pts, ancho, tipo: t.highway });
                    }
                } else if (t.natural === "water") {
                    aguas.push(pts);
                } else if (t.leisure || t.landuse || t.natural) {
                    verdes.push(pts);
                }
            });
        }

        // Sin datos de calles: al menos la calle por donde pasa la combi.
        if (!calles.length) {
            const pts = [];
            for (let d = Math.max(0, dParada - 260); d <= Math.min(ruta.largo, dParada + 260); d += 5) pts.push(puntoEn(ruta, d));
            if (pts.length > 1) calles.push({ pts, ancho: 9, tipo: "ruta" });
        }

        const mitadCallePara = (x, y) => {
            let mejor = { dist: Infinity, ancho: 9 };
            calles.forEach(c => {
                for (let i = 1; i < c.pts.length; i++) {
                    const dist = distanciaASegmento(x, y, c.pts[i - 1], c.pts[i]);
                    if (dist < mejor.dist) mejor = { dist, ancho: c.ancho };
                }
            });
            return mejor.ancho / 2;
        };
        const distABorde = (x, y) => {
            let m = Infinity;
            calles.forEach(c => {
                for (let i = 1; i < c.pts.length; i++) m = Math.min(m, distanciaASegmento(x, y, c.pts[i - 1], c.pts[i]) - c.ancho / 2);
            });
            return m;
        };

        // Caseta: sobre la banqueta, a la derecha del sentido en que sale la combi.
        const mitadCalle = mitadCallePara(pParada.x, pParada.y);
        const separacion = mitadCalle + 2.6;
        const posCaseta = { x: pParada.x + derecha.x * separacion, y: pParada.y + derecha.y * separacion };
        const lejosDeCaseta = (x, y, r) => Math.hypot(x - posCaseta.x, y - posCaseta.y) > r;

        // ---- Base de la maqueta ----
        const suelo = new THREE.Mesh(new THREE.PlaneGeometry(MITAD * 2, MITAD * 2), new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 1 }));
        suelo.receiveShadow = true;
        grupo.add(suelo);
        const zocalo = new THREE.Mesh(new THREE.BoxGeometry(MITAD * 2, MITAD * 2, 6), new THREE.MeshStandardMaterial({ color: 0x24333f, roughness: 0.7 }));
        zocalo.position.z = -3.02;
        grupo.add(zocalo);

        // ---- Áreas verdes y agua ----
        verdes.forEach(pts => grupo.add(poligonoPlano(pts, mat(0xa9c98c), 0.03)));
        aguas.forEach(pts => grupo.add(poligonoPlano(pts, mat(0x8fc1d9, { roughness: 0.3 }), 0.025)));

        // ---- Calles ----
        const banquetas = calles.map(c => ({ pts: c.pts, ancho: c.ancho + 3.6 }));
        agregarCintas(grupo, banquetas, 0.04, mat(0xd3cdc1), true);
        agregarCintas(grupo, peatonales, 0.05, mat(0xcfc6b5), true);
        agregarCintas(grupo, calles, 0.08, mat(0x5d6168, { roughness: 0.95 }), true);
        const rayas = [];
        calles.filter(c => c.ancho >= 9).forEach(c => rayas.push(...lineaPunteada(c.pts, 3, 3.5, 0.18)));
        agregarCintas(grupo, rayas, 0.1, mat(0xf2f2f2), false);

        // Ruta de la combi pintada en amarillo sobre la calle.
        const tramoRuta = [];
        for (let d = Math.max(0, dParada - 320); d <= Math.min(ruta.largo, dParada + 320); d += 3) tramoRuta.push(puntoEn(ruta, d));
        if (tramoRuta.length > 1) {
            agregarCintas(grupo, [{ pts: tramoRuta, ancho: 0.8 }], 0.12, mat(0xf5c400, { transparent: true, opacity: 0.85 }), false);
        }

        // ---- Edificios ----
        let aproximados = false;
        const materialesMuro = COLORES_MURO.map(c => mat(c));
        const techo = mat(0xf4f1ea);
        const bordes = new THREE.LineBasicMaterial({ color: 0x7d7468, transparent: true, opacity: 0.35, clippingPlanes: planos });

        const agregarEdificio = (geo, semilla) => {
            const malla = new THREE.Mesh(geo, [techo, materialesMuro[semilla % materialesMuro.length]]);
            malla.castShadow = true;
            malla.receiveShadow = true;
            grupo.add(malla);
            grupo.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), bordes));
        };

        edificios.forEach(({ id, pts, tags }) => {
            const anillo = pts.slice();
            const ult = anillo[anillo.length - 1];
            if (Math.hypot(ult.x - anillo[0].x, ult.y - anillo[0].y) < 0.01) anillo.pop();
            if (anillo.length < 3) return;
            const c = centroide(anillo);
            if (!lejosDeCaseta(c.x, c.y, 4)) return;
            const altura = alturaEdificio(tags, id);
            try {
                const forma = new THREE.Shape(anillo.map(p => new THREE.Vector2(p.x, p.y)));
                agregarEdificio(new THREE.ExtrudeGeometry(forma, { depth: altura, bevelEnabled: false }), id);
            } catch (e) { /* polígono inválido */ }
        });

        // OpenStreetMap no tiene edificios aquí: casas aproximadas a lo largo de las calles.
        if (edificios.length < 12) {
            aproximados = true;
            const azar = generadorAzar(hashTexto(parada.id + "casas"));
            const ocupados = [];
            const libre = (x, y, r) => ocupados.every(o => Math.hypot(x - o.x, y - o.y) > r + o.r);
            calles.filter(c => c.tipo !== "service" && c.tipo !== "track").forEach(c => {
                // Se recorre la calle completa de forma continua (aunque venga en tramos cortos).
                const linea = prepararRuta(c.pts);
                for (const lado of [1, -1]) {
                    let s = 3 + azar() * 4;
                    while (s < linea.largo - 3) {
                        const frente = 7 + azar() * 4.5;
                        const fondo = 9 + azar() * 6;
                        const medio = s + frente / 2;
                        s += frente + 0.4 + (azar() < 0.15 ? 6 + azar() * 6 : 0);
                        const p = puntoEn(linea, medio);
                        const u = direccionEn(linea, medio, 1);
                        const ux = u.x, uy = u.y;
                        const ang = Math.atan2(uy, ux);
                        const retiro = c.ancho / 2 + 2.2 + fondo / 2 + azar() * 0.6;
                        const cx = p.x - uy * retiro * lado;
                        const cy = p.y + ux * retiro * lado;
                        if (Math.abs(cx) > MITAD - 4 || Math.abs(cy) > MITAD - 4) continue;
                        const radio = Math.min(frente, fondo) / 2;
                        if (!lejosDeCaseta(cx, cy, radio + 6) || !libre(cx, cy, radio * 0.95)) continue;
                        // Las cuatro esquinas deben quedar fuera de cualquier calle.
                        const esquinas = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => ({
                            x: cx + ux * (i * frente / 2) - uy * (j * fondo / 2),
                            y: cy + uy * (i * frente / 2) + ux * (j * fondo / 2)
                        }));
                        if (esquinas.some(q => distABorde(q.x, q.y) < 1.6)) continue;
                        ocupados.push({ x: cx, y: cy, r: radio });
                        const r = azar();
                        const altura = r < 0.62 ? 3.4 + azar() * 0.8 : r < 0.94 ? 6.2 + azar() * 0.9 : 9.3 + azar() * 0.6;
                        const geo = new THREE.BoxGeometry(frente, fondo, altura);
                        // Caja con grupos [techo, muros] como los edificios extruidos.
                        geo.clearGroups();
                        geo.addGroup(0, 24, 1); // ±x, ±y -> muros
                        geo.addGroup(24, 12, 0); // ±z -> techo/base
                        geo.rotateZ(ang);
                        geo.translate(cx, cy, altura / 2);
                        agregarEdificio(geo, Math.floor(azar() * 1000));
                    }
                }
            });
        }

        // ---- Árboles ----
        const azarArboles = generadorAzar(hashTexto(parada.id + "arboles"));
        const arboles = arbolesOSM.filter(p => Math.abs(p.x) < MITAD - 2 && Math.abs(p.y) < MITAD - 2);
        verdes.forEach(pts => {
            const caja = cajaDe(pts);
            const area = Math.abs(areaPoligono(pts));
            const n = Math.min(40, Math.floor(area / 140));
            for (let k = 0, intentos = 0; k < n && intentos < n * 6; intentos++) {
                const x = caja.minX + azarArboles() * (caja.maxX - caja.minX);
                const y = caja.minY + azarArboles() * (caja.maxY - caja.minY);
                if (dentroDePoligono(x, y, pts)) { arboles.push({ x, y }); k++; }
            }
        });
        // Árboles de banqueta, cada tanto.
        calles.forEach(c => {
            const linea = prepararRuta(c.pts);
            for (let s = 6 + azarArboles() * 10; s < linea.largo - 4; s += 16 + azarArboles() * 18) {
                if (azarArboles() < 0.45) continue;
                const p = puntoEn(linea, s);
                const u = direccionEn(linea, s, 1);
                const lado = azarArboles() < 0.5 ? 1 : -1;
                const off = c.ancho / 2 + 1.3;
                arboles.push({ x: p.x - u.y * off * lado, y: p.y + u.x * off * lado });
            }
        });
        agregarArboles(grupo, arboles.filter(p =>
            Math.abs(p.x) < MITAD - 1.5 && Math.abs(p.y) < MITAD - 1.5 && lejosDeCaseta(p.x, p.y, 5)
        ), azarArboles, planos);

        // ---- Caseta ----
        const caseta = new THREE.Group(); // el visor monta aquí el diseño elegido
        caseta.position.set(posCaseta.x, posCaseta.y, 0);
        caseta.rotation.z = Math.atan2(dirParada.y, dirParada.x) + Math.PI; // la calle queda del lado -y del modelo
        grupo.add(caseta);

        const anillo = new THREE.Mesh(
            new THREE.RingGeometry(4.2, 4.7, 64),
            new THREE.MeshBasicMaterial({ color: 0xf5c400, transparent: true, opacity: 0.8, depthWrite: false })
        );
        anillo.position.set(posCaseta.x, posCaseta.y, 0.2);
        grupo.add(anillo);

        // ---- Combi: pasa, se detiene en la caseta y sigue ----
        const combi = Modelos3D.crearCombi(THREE);
        combi.traverse(o => {
            if (o.isMesh) {
                o.castShadow = true;
                o.material = o.material.clone();
                o.material.clippingPlanes = planos;
            }
        });
        grupo.add(combi);

        const dIni = Math.min(ruta.largo, Math.max(0, dParada - 200 * sentido));
        const dFin = Math.min(ruta.largo, Math.max(0, dParada + 200 * sentido));
        const tramos = [
            { de: dIni, a: dParada, s: sentido },
            { pausa: 3.5, en: dParada, s: sentido },
            { de: dParada, a: dFin, s: sentido },
            { pausa: 1.5, en: dFin, s: -sentido },
            { de: dFin, a: dParada, s: -sentido },
            { pausa: 3.5, en: dParada, s: -sentido },
            { de: dParada, a: dIni, s: -sentido },
            { pausa: 1.5, en: dIni, s: sentido }
        ].map(t => ({ ...t, dur: t.pausa || Math.max(2, (Math.abs(t.a - t.de) / VELOCIDAD_COMBI) * 1.15) }));
        const cicloCombi = tramos.reduce((s, t) => s + t.dur, 0);
        const estado = { t: 0, ang: Math.atan2(dirParada.y, dirParada.x) };

        const animar = (dt, segundos) => {
            estado.t = (estado.t + dt) % cicloCombi;
            let t = estado.t;
            let tramo = tramos[0];
            for (const tr of tramos) {
                if (t < tr.dur) { tramo = tr; break; }
                t -= tr.dur;
            }
            const d = tramo.pausa ? tramo.en : tramo.de + (tramo.a - tramo.de) * avance(t / tramo.dur);
            const dir = direccionEn(ruta, d, tramo.s);
            const rapidez = tramo.pausa ? 2.2 : 6;
            estado.ang += anguloMasCorto(estado.ang, Math.atan2(dir.y, dir.x)) * (1 - Math.exp(-dt * rapidez));
            const p = puntoEn(ruta, d);
            const carril = Math.min(mitadCalle * 0.5, 2.2);
            combi.position.set(p.x + Math.sin(estado.ang) * carril, p.y - Math.cos(estado.ang) * carril, 0);
            combi.rotation.z = estado.ang;
            anillo.material.opacity = 0.45 + 0.35 * (0.5 + 0.5 * Math.sin(segundos * 2.4));
        };

        // ---- Vistas de cámara ----
        const f = { x: dirParada.x, y: dirParada.y };
        const V = (x, y, z) => new THREE.Vector3(x, y, z);
        const vistas = {
            inicio: {
                posicion: V(posCaseta.x - derecha.x * 34 - f.x * 26, posCaseta.y - derecha.y * 34 - f.y * 26, 20),
                objetivo: V(posCaseta.x, posCaseta.y, 1.5)
            },
            calle: {
                posicion: V(pParada.x - derecha.x * (mitadCalle + 2) - f.x * 9, pParada.y - derecha.y * (mitadCalle + 2) - f.y * 9, 1.7),
                objetivo: V(posCaseta.x, posCaseta.y, 1.3)
            },
            aerea: {
                posicion: V(-derecha.x * MITAD * 1.15 - f.x * MITAD * 0.7, -derecha.y * MITAD * 1.15 - f.y * MITAD * 0.7, MITAD * 1.35),
                objetivo: V(0, 0, 0)
            }
        };

        const atribucion = 'Calles y edificios: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">colaboradores de OpenStreetMap</a>.';
        let fuente;
        if (!osm) {
            fuente = "No se pudieron descargar los datos de OpenStreetMap, así que la calle y las casas son aproximadas. Revisa tu conexión y reintenta.";
        } else if (aproximados) {
            fuente = `${atribucion} OpenStreetMap no tiene edificios dibujados en esta zona, así que las casas son aproximadas (volumen y altura típicos).`;
        } else {
            fuente = `${atribucion} Alturas aproximadas cuando no vienen en los datos.`;
        }

        return { opciones, grupo, caseta, anillo, animar, vistas, fuente, sinDatos: !osm };
    }

    // ====================== Datos de OpenStreetMap ======================

    const claveCache = parada => `zona-osm-v1:${parada.lat},${parada.lng}`;

    async function descargarOSM(parada) {
        const clave = claveCache(parada);
        try {
            const guardado = localStorage.getItem(clave);
            if (guardado) return JSON.parse(guardado);
        } catch (e) { /* sin almacenamiento */ }

        const a = `(around:${RADIO_CONSULTA},${parada.lat},${parada.lng})`;
        const consulta = `[out:json][timeout:25];(` +
            `way["building"]${a};way["highway"]${a};` +
            `way["leisure"~"^(park|garden|pitch|playground)$"]${a};` +
            `way["landuse"~"^(grass|recreation_ground|village_green|meadow|forest)$"]${a};` +
            `way["natural"~"^(water|wood|scrub|grassland)$"]${a};` +
            `node["natural"="tree"]${a};);out geom;`;

        for (const url of SERVIDORES_OVERPASS) {
            try {
                const ctrl = new AbortController();
                const temporizador = setTimeout(() => ctrl.abort(), 25000);
                const res = await fetch(url, {
                    method: "POST",
                    body: "data=" + encodeURIComponent(consulta),
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    signal: ctrl.signal
                });
                clearTimeout(temporizador);
                if (!res.ok) continue;
                const datos = await res.json();
                const ligero = {
                    elements: (datos.elements || []).map(e => ({
                        type: e.type, id: e.id, tags: e.tags, lat: e.lat, lon: e.lon,
                        geometry: e.geometry && e.geometry.map(g => ({ lat: +g.lat.toFixed(7), lon: +g.lon.toFixed(7) }))
                    }))
                };
                try { localStorage.setItem(clave, JSON.stringify(ligero)); } catch (e) { /* sin espacio */ }
                return ligero;
            } catch (e) {
                console.warn("Overpass no respondió (" + url + "):", e.message || e);
            }
        }
        return null;
    }

    // ====================== Modelos ======================

    // Caseta LZC: el .glb va embebido en caseta-lzc-modelo.js para que cargue
    // también sin servidor (doble clic en index.html).
    async function cargarPlantillaLZC() {
        const C = window.Casetas3D;
        if (!C || C.plantillaLZC || !window.CASETA_LZC_GLB || !GLTFLoader) return;
        try {
            const bin = Uint8Array.from(atob(window.CASETA_LZC_GLB), ch => ch.charCodeAt(0)).buffer;
            const gltf = await new Promise((ok, mal) => new GLTFLoader().parse(bin, "", ok, mal));
            gltf.scene.rotation.x = Math.PI / 2; // glTF (Y arriba) -> Z arriba
            C.plantillaLZC = gltf.scene;
        } catch (err) {
            console.error("No se pudo leer la Caseta LZC", err);
        }
    }

    async function cargarGLB(url) {
        try {
            const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
            const gltf = await new GLTFLoader().loadAsync(url);
            return gltf.scene;
        } catch (e) {
            return null;
        }
    }

    async function cargarCaseta(modelo) {
        if (!modelo || !puedeLeerArchivos()) return null;
        const escenaGLB = await cargarGLB(modelo.url);
        return escenaGLB ? Modelos3D.prepararModeloGLB(THREE, escenaGLB, modelo.largo) : null;
    }

    function agregarArboles(grupo, puntos, azar, planos) {
        if (!puntos.length) return;
        const tronco = new THREE.InstancedMesh(
            new THREE.CylinderGeometry(0.16, 0.22, 2.4, 6).rotateX(Math.PI / 2).translate(0, 0, 1.2),
            new THREE.MeshStandardMaterial({ color: 0x7a5a3c, roughness: 1, clippingPlanes: planos }),
            puntos.length
        );
        const copa = new THREE.InstancedMesh(
            new THREE.IcosahedronGeometry(1, 0),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, flatShading: true, clippingPlanes: planos }),
            puntos.length
        );
        const verdes = [0x6f9e55, 0x5f8f4a, 0x7fae5f, 0x58864a].map(c => new THREE.Color(c));
        const m = new THREE.Matrix4();
        const q = new THREE.Quaternion();
        const eje = new THREE.Vector3(0, 0, 1);
        puntos.forEach((p, i) => {
            const s = 0.8 + azar() * 0.6;
            m.compose(new THREE.Vector3(p.x, p.y, 0), q, new THREE.Vector3(s, s, s));
            tronco.setMatrixAt(i, m);
            const r = (1.7 + azar() * 1.1) * s;
            q.setFromAxisAngle(eje, azar() * Math.PI);
            m.compose(new THREE.Vector3(p.x, p.y, 2.3 * s + r * 0.7), q, new THREE.Vector3(r, r, r * 0.85));
            copa.setMatrixAt(i, m);
            copa.setColorAt(i, verdes[Math.floor(azar() * verdes.length)]);
            q.identity();
        });
        [tronco, copa].forEach(o => { o.castShadow = true; o.receiveShadow = true; grupo.add(o); });
    }

    // ====================== Geometría ======================

    // Cintas planas (calles, banquetas, rayas) con uniones redondeadas.
    function agregarCintas(grupo, lineas, z, material, uniones) {
        const pos = [];
        const tri = (a, b, c) => pos.push(a.x, a.y, z, b.x, b.y, z, c.x, c.y, z);
        lineas.forEach(({ pts, ancho }) => {
            const r = ancho / 2;
            for (let i = 1; i < pts.length; i++) {
                const a = pts[i - 1], b = pts[i];
                const dx = b.x - a.x, dy = b.y - a.y;
                const L = Math.hypot(dx, dy);
                if (L < 0.01) continue;
                const nx = (-dy / L) * r, ny = (dx / L) * r;
                const a1 = { x: a.x + nx, y: a.y + ny }, a2 = { x: a.x - nx, y: a.y - ny };
                const b1 = { x: b.x + nx, y: b.y + ny }, b2 = { x: b.x - nx, y: b.y - ny };
                tri(a2, b2, b1);
                tri(a2, b1, a1);
            }
            if (!uniones) return;
            pts.forEach(p => {
                const n = 12;
                for (let k = 0; k < n; k++) {
                    const t0 = (k / n) * Math.PI * 2, t1 = ((k + 1) / n) * Math.PI * 2;
                    tri(p, { x: p.x + Math.cos(t0) * r, y: p.y + Math.sin(t0) * r }, { x: p.x + Math.cos(t1) * r, y: p.y + Math.sin(t1) * r });
                }
            });
        });
        if (!pos.length) return;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        const normales = new Float32Array(pos.length);
        for (let i = 2; i < normales.length; i += 3) normales[i] = 1;
        geo.setAttribute("normal", new THREE.BufferAttribute(normales, 3));
        const malla = new THREE.Mesh(geo, material);
        malla.receiveShadow = true;
        grupo.add(malla);
    }

    function lineaPunteada(pts, largo, hueco, ancho) {
        const salida = [];
        let resto = 0;
        let dibujando = true;
        for (let i = 1; i < pts.length; i++) {
            const a = pts[i - 1], b = pts[i];
            const L = Math.hypot(b.x - a.x, b.y - a.y);
            let s = 0;
            while (s < L) {
                const paso = Math.min(L - s, (dibujando ? largo : hueco) - resto);
                if (dibujando) {
                    const u0 = s / L, u1 = (s + paso) / L;
                    salida.push({
                        ancho,
                        pts: [{ x: a.x + (b.x - a.x) * u0, y: a.y + (b.y - a.y) * u0 }, { x: a.x + (b.x - a.x) * u1, y: a.y + (b.y - a.y) * u1 }]
                    });
                }
                s += paso;
                resto += paso;
                if (resto >= (dibujando ? largo : hueco) - 1e-6) { resto = 0; dibujando = !dibujando; }
            }
        }
        return salida;
    }

    function poligonoPlano(pts, material, z) {
        const forma = new THREE.Shape(pts.map(p => new THREE.Vector2(p.x, p.y)));
        const malla = new THREE.Mesh(new THREE.ShapeGeometry(forma), material);
        malla.position.z = z;
        malla.receiveShadow = true;
        return malla;
    }

    function alturaEdificio(tags, id) {
        const h = parseFloat(tags.height);
        if (h > 0) return h;
        const niveles = parseFloat(tags["building:levels"]);
        if (niveles > 0) return niveles * 3.1 + 0.5;
        const r = generadorAzar(id)();
        return r < 0.6 ? 3.6 + r : r < 0.93 ? 6.6 : 9.6;
    }

    function distanciaASegmento(x, y, a, b) {
        const dx = b.x - a.x, dy = b.y - a.y;
        const l2 = dx * dx + dy * dy || 1;
        const u = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l2));
        return Math.hypot(x - (a.x + dx * u), y - (a.y + dy * u));
    }

    function centroide(pts) {
        const s = pts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
        return { x: s.x / pts.length, y: s.y / pts.length };
    }

    function cajaDe(pts) {
        return pts.reduce((c, p) => ({
            minX: Math.min(c.minX, p.x), maxX: Math.max(c.maxX, p.x),
            minY: Math.min(c.minY, p.y), maxY: Math.max(c.maxY, p.y)
        }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
    }

    function areaPoligono(pts) {
        let a = 0;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j].x + pts[i].x) * (pts[j].y - pts[i].y);
        return a / 2;
    }

    function dentroDePoligono(x, y, pts) {
        let dentro = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            const a = pts[i], b = pts[j];
            if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) dentro = !dentro;
        }
        return dentro;
    }

    function hashTexto(texto) {
        let h = 2166136261;
        for (let i = 0; i < texto.length; i++) h = Math.imul(h ^ texto.charCodeAt(i), 16777619);
        return h >>> 0;
    }

    // Números "al azar" pero siempre iguales para la misma semilla.
    function generadorAzar(semilla) {
        let a = (semilla >>> 0) || 1;
        return () => {
            a = (a + 0x6d2b79f5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    window.VisorZona = {
        abrir, cerrar,
        // Capturas: detiene el bucle y dibuja un cuadro a la vez (avanzando dt segundos)
        capturas: {
            pausar(v = true) { pausado = v; },
            cuadro(dt = 0) { vuelo = null; cuadro(dt); },
            vista(nombre) { irAVista(nombre, true); },
            camara(p, t) { camara.position.set(p[0], p[1], p[2]); controles.target.set(t[0], t[1], t[2]); controles.update(); },
            hayOclusion() { return !!(posproceso && posproceso.composer); },
            // posición y giro del soporte de la caseta, para encuadrar tomas
            caseta() { const c = zonaActual && zonaActual.caseta; return c ? [c.position.x, c.position.y, c.position.z, c.rotation.z] : null; },
            sinOclusion() { posproceso = null; }
        }
    };
})();
