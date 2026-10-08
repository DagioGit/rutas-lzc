// Página principal: todo lo que se arma con los datos de ruta-2.js y horario.js.

const R = window.RUTA_2;
const H = window.RutaHorario;
const F = window.Formato;
const coloniaCorta = t => (t || "").replace("Víctor Manuel ", "");
const coordenadas = p => `${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`.replace("-", "−");

// ============ Diagrama de la línea del recorrido ============
function construirDiagrama(fracciones) {
    const cont = document.querySelector("[data-diagrama]");
    if (!cont || !R) return;
    cont.querySelectorAll(".estacion").forEach(e => e.remove());
    const n = R.paradas.length;
    const denso = n > 4; // muchas paradas: letra en el punto y nombre corto, alternando alturas
    cont.classList.toggle("diagrama--denso", denso);
    // si la primera parada queda muy cerca de la base, no cabe el nombre de la colonia
    const fr = id => fracciones && fracciones[id] != null ? fracciones[id] : (H ? H.fraccion(id) : null);
    const primera = Math.min(...R.paradas.map(p => fr(p.id) != null ? fr(p.id) : 1));
    const calleBase = primera < 0.1 ? "" : coloniaCorta(R.base.colonia);
    const html = [
        `<button type="button" class="estacion estacion--base" data-ir="base" data-abrir-mapa style="--pos:0%">
            <span class="estacion__punto"></span><span class="estacion__nombre">Base</span><span class="estacion__calle">${calleBase}</span></button>`,
        ...R.paradas.map((p, i) => {
            const f = fracciones && fracciones[p.id] != null ? fracciones[p.id] : (H && H.fraccion(p.id) != null ? H.fraccion(p.id) : (i + 1) / (n + 1));
            return `<button type="button" class="estacion${denso && i % 2 ? " estacion--abajo" : ""}" data-ir="${p.id}" data-abrir-mapa style="--pos:${(f * 100).toFixed(1)}%" title="${p.name} · ${F.calleCorta(p.calle)}">
                <span class="estacion__punto">${p.corto}</span><span class="estacion__nombre">${p.name}</span><span class="estacion__calle">${denso && p.apodo ? p.apodo : F.calleCorta(p.calle)}</span></button>`;
        }),
        `<span class="estacion estacion--fin" style="--pos:100%" aria-hidden="true"><span class="estacion__punto"></span><span class="estacion__nombre">Regreso a base</span></span>`
    ].join("");
    cont.insertAdjacentHTML("beforeend", html);
}

// ============ Panel del mapa ============
function construirSecuencia() {
    const lista = document.querySelector("[data-secuencia]");
    if (!lista || !R) return;
    lista.innerHTML = [
        `<li><button type="button" data-ir="base"><span class="secuencia__marca secuencia__marca--base"></span><span><strong>Base</strong><small>${R.base.calle}</small></span><span class="secuencia__eta" data-eta-sim="base"></span></button></li>`,
        ...R.paradas.map(p => `<li><button type="button" data-ir="${p.id}"><span class="secuencia__marca">${p.corto}</span><span><strong>${p.name}</strong><small>${F.calleCorta(p.calle)}</small></span><span class="secuencia__eta" data-eta-sim="${p.id}" title="Próxima combi en la simulación"></span></button></li>`)
    ].join("");
}

// ============ Portada: fichas laterales ============
function construirTablero() {
    const lista = document.querySelector("[data-tablero]");
    if (!lista || !R) return;
    lista.innerHTML = R.paradas.map(p => `
        <li class="llegadas__fila" data-fila="${p.id}">
            <span class="llegadas__letra">${p.corto}</span>
            <span class="llegadas__calle">${p.apodo || F.calleCorta(p.calle)}</span>
            <strong class="llegadas__tiempo" data-eta="${p.id}">—</strong>
        </li>`).join("");
}

function construirListaParadas() {
    const ul = document.querySelector("[data-lista-paradas]");
    if (!ul || !R) return;
    ul.innerHTML = R.paradas.map(p => `<li><b>${p.corto}</b>${p.apodo || F.calleCorta(p.calle)}</li>`).join("");
}

// Silueta del recorrido dibujada con el trazo real
function dibujarTrazo() {
    const svg = document.querySelector("[data-trazo]");
    if (!svg || !R || !R.trazo) return;
    const W = 200, Hh = 110, m = 8;
    const k = Math.cos(18 * Math.PI / 180);
    const xs = R.trazo.map(p => p[0] * k), ys = R.trazo.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const esc = Math.min((W - 2 * m) / (maxX - minX), (Hh - 2 * m) / (maxY - minY));
    const ox = (W - (maxX - minX) * esc) / 2, oy = (Hh - (maxY - minY) * esc) / 2;
    const pr = (lng, lat) => [ox + (lng * k - minX) * esc, Hh - (oy + (lat - minY) * esc)];
    const d = R.trazo.map((p, i) => `${i ? "L" : "M"}${pr(p[0], p[1]).map(v => v.toFixed(1)).join(" ")}`).join("");
    const b = pr(R.base.lng, R.base.lat);
    svg.innerHTML = `<path d="${d}" class="trazo__casco"/><path d="${d}" class="trazo__linea"/>
        <rect x="${(b[0] - 4).toFixed(1)}" y="${(b[1] - 4).toFixed(1)}" width="8" height="8" class="trazo__base"/>
        ${R.paradas.map(p => { const q = pr(p.lng, p.lat); return `<g class="trazo__parada"><circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="6.5"/><text x="${q[0].toFixed(1)}" y="${(q[1] + 2.6).toFixed(1)}">${p.corto}</text></g>`; }).join("")}`;
}

// ============ Vitrina: base y paradas en 3D ============
// Maqueta de noche de la base y de cada parada.
function construirVitrina() {
    const tabs = document.querySelector("[data-vitrina-tabs]");
    const img = document.querySelector("[data-vitrina-img]");
    if (!tabs || !img || !R) return;
    const nombre = document.querySelector("[data-vitrina-nombre]");
    const calle = document.querySelector("[data-vitrina-calle]");
    const abrir = document.querySelector("[data-vitrina-abrir]");
    const lugares = [R.base, ...R.paradas.filter(p => p.imagen)]; // las que tienen maqueta detallada
    const inicial = R.paradas[0] ? R.paradas[0].id : "base";
    tabs.innerHTML = lugares.map(p => `<button type="button" role="tab" aria-selected="${p.id === inicial}" data-vitrina-id="${p.id}">${p.id === "base" ? "Base" : `Parada ${p.corto}`}</button>`).join("");
    tabs.addEventListener("click", e => {
        const b = e.target.closest("[data-vitrina-id]");
        if (!b) return;
        const p = lugares.find(x => x.id === b.dataset.vitrinaId);
        const esBase = p.id === "base";
        tabs.querySelectorAll("button").forEach(x => x.setAttribute("aria-selected", String(x === b)));
        const src = (p.imagen || "").replace(".jpg", "-noche.jpg");
        img.classList.add("is-cambiando");
        const nueva = new Image();
        nueva.onload = nueva.onerror = () => {
            img.src = src;
            img.alt = esBase ? `Maqueta 3D de la base de la Ruta 2 de noche, con las combis frente a ella en ${p.calle}`
                : `Maqueta 3D de la ${p.name} de noche, con la caseta iluminada`;
            nombre.textContent = esBase ? "Base · Ruta 2" : p.name;
            calle.textContent = esBase ? `${p.calle}, ${p.colonia}` : F.calleCorta(p.calle);
            abrir.dataset.abrirZona = p.id;
            requestAnimationFrame(() => img.classList.remove("is-cambiando"));
        };
        nueva.src = src;
    });
}

// ============ Fichas de cada parada ============
function textoDistancia(id) {
    const v = H.viaje("base", id);
    return `${F.distancia(H.distancia(id))}${v ? ` · ${F.minutos(v)}` : ""}`;
}

function fichaBase() {
    const b = R.base;
    return `
        <article class="parada parada--base" id="parada-base">
            <figure class="parada__foto">
                <img src="${b.imagen}" alt="Maqueta 3D de la base de la Ruta 2: combis estacionadas en ${b.calle}" width="1600" height="1000">
                <span class="parada__sello mono-etiqueta">Maqueta 3D</span>
            </figure>
            <div class="parada__cuerpo">
                <p class="parada__codigo"><span class="mono-etiqueta">Base de la Ruta 2</span></p>
                <h3><span class="parada__letra parada__letra--base" aria-hidden="true"></span>${b.calle}</h3>
                <p class="parada__calle">${b.colonia}</p>
                <p class="parada__texto">${b.desc} De aquí sale la primera combi a las 6:00 y luego una cada 15 minutos; las unidades esperan su turno estacionadas frente a la base.</p>
                <div class="parada__acciones">
                    <button type="button" class="boton boton--negro" data-abrir-zona="base">Ver en 3D</button>
                    <button type="button" class="boton boton--borde" data-ir="base" data-abrir-mapa>Ver en el mapa</button>
                </div>
            </div>
            <aside class="parada__datos">
                <p class="parada__eta"><span class="mono-etiqueta">Próxima salida (simulación)</span><strong data-eta-sim="base" data-sim-corto>—</strong></p>
                <dl class="ficha">
                    <div><dt>Coordenadas</dt><dd>${coordenadas(b)}</dd></div>
                    <div><dt>Salidas</dt><dd>Cada ${H.frecuencia} min, de 6:00 a 22:00</dd></div>
                    <div><dt>Unidades</dt><dd data-unidades>${H.unidadesNecesarias()} combis</dd></div>
                    <div><dt>Estado</dt><dd>Ubicación confirmada</dd></div>
                </dl>
            </aside>
        </article>`;
}

const COLOR_TIPO = { salud: "#d64545", escuela: "#2f6fb5", compras: "#e08a1e", "trámite": "#7a4fb0", parque: "#3f9a5c", transporte: "#1d2a33" };
const chipsCerca = (p, n = 4) => (p.cerca || []).slice(0, n).map(l =>
    `<li><i style="--c:${COLOR_TIPO[l.tipo] || "#555"}" aria-hidden="true"></i>${l.nombre} <b>${l.min} min</b></li>`).join("");

function fichaCompleta(p) {
    return `
        <article class="parada" id="parada-${p.id}">
            <figure class="parada__foto">
                <img src="${p.imagen}" alt="Maqueta 3D de la ${p.name}: ${p.referencia}" width="1600" height="1000">
                <span class="parada__sello mono-etiqueta">Maqueta 3D</span>
            </figure>
            <div class="parada__cuerpo">
                <p class="parada__codigo"><span class="mono-etiqueta">${p.name} · ${p.apodo || "Ruta 2"}</span></p>
                <h3><span class="parada__letra">${p.corto}</span>${F.calleCorta(p.calle)}</h3>
                <p class="parada__calle">${p.referencia}</p>
                <p class="parada__texto">${p.texto || ""}</p>
                <ul class="cerca parada__cerca" aria-label="Cerca de la parada">${chipsCerca(p)}</ul>
                <div class="parada__acciones">
                    <button type="button" class="boton boton--negro" data-abrir-zona="${p.id}">Ver en 3D</button>
                    <button type="button" class="boton boton--borde" data-ir="${p.id}" data-abrir-mapa>Ver en el mapa</button>
                    <a class="boton boton--borde" href="parada.html?id=${p.id}">En vivo</a>
                </div>
            </div>
            <aside class="parada__datos">
                <p class="parada__eta" data-eta-caja="${p.id}"><span class="mono-etiqueta">Próxima combi</span><strong data-eta="${p.id}">—</strong></p>
                <dl class="ficha">
                    <div><dt>Coordenadas</dt><dd>${coordenadas(p)}</dd></div>
                    <div><dt>Sentido</dt><dd>${(p.calle.split(",")[1] || "—").trim().replace(/^./, c => c.toUpperCase())}</dd></div>
                    <div><dt>Desde la base</dt><dd data-distancia="${p.id}">${textoDistancia(p.id)}</dd></div>
                    <div><dt>Caseta</dt><dd>Caseta LZC con tótem contador</dd></div>
                </dl>
            </aside>
        </article>`;
}

function fichaPropuesta(p) {
    return `
        <article class="propuesta" id="parada-${p.id}">
            <div class="propuesta__mapa"><img src="img/mapas/mapa-${p.id.toLowerCase()}.png" alt="Mapa de la ${p.name} con los lugares cercanos" loading="lazy" width="640" height="1040"></div>
            <div class="propuesta__cuerpo">
                <h3><span class="parada__letra">${p.corto}</span>${p.apodo}<span class="propuesta__eta" data-eta="${p.id}">—</span></h3>
                <p class="propuesta__calle">${F.calleCorta(p.calle)} · <span data-distancia="${p.id}">${textoDistancia(p.id)}</span> desde la base</p>
                <ul class="cerca" aria-label="Cerca de la parada">${chipsCerca(p)}</ul>
                <div class="propuesta__acciones">
                    <button type="button" class="boton boton--negro" data-abrir-zona="${p.id}">Ver en 3D</button>
                    <button type="button" class="boton boton--borde" data-ir="${p.id}" data-abrir-mapa>Mapa</button>
                    <a class="boton boton--borde" href="parada.html?id=${p.id}">En vivo</a>
                </div>
            </div>
        </article>`;
}

function construirFichas() {
    const cont = document.querySelector("[data-hojas]");
    if (!cont || !R) return;
    const conMaqueta = R.paradas.filter(p => p.imagen);
    const propuestas = R.paradas.filter(p => !p.imagen);
    cont.innerHTML = fichaBase() + conMaqueta.map(fichaCompleta).join("") + (propuestas.length ? `
        <div class="red-paradas">
            <div class="red-paradas__cabeza">
                <h3>${propuestas.length} paradas propuestas</h3>
                <p>Elegidas por lo que hay a cinco minutos a pie (datos de OpenStreetMap). Su vista 3D se arma sola con las calles y edificios de la zona; falta visitarlas para hacer su maqueta detallada.</p>
            </div>
            ${propuestas.map(fichaPropuesta).join("")}
        </div>` : "");
}

// ============ Caseta LZC: módulos, calculadora y fotos ============
function construirCaseta() {
    const P = window.PRESUPUESTO_CASETA, Pr = window.Presupuesto;
    const lista = document.querySelector("[data-modulos]");
    if (!P || !Pr || !lista) return;
    lista.innerHTML = P.modulos.map((m, i) => `
        <li class="modulo" data-modulo="${m.id}">
            <div class="modulo__cabeza"><span class="modulo__num">${String(i + 1).padStart(2, "0")}</span><span class="modulo__precio">${Pr.pesos(Pr.modulo(m))}</span></div>
            <h4>${m.nombre}</h4>
            <p>${m.desc}</p>
            <div class="modulo__pie">${m.fijo
                ? `<span class="modulo__chip">Incluido</span>`
                : `<label class="interruptor"><input type="checkbox" checked data-opcional="${m.id}" aria-label="Incluir ${m.nombre}"><span>Incluir</span></label>`}</div>
        </li>`).join("");
    const pon = (sel, t) => document.querySelectorAll(sel).forEach(el => { el.textContent = t; });
    function calcular() {
        const elegidos = [...lista.querySelectorAll("[data-opcional]")].filter(c => c.checked).map(c => c.dataset.opcional);
        lista.querySelectorAll("[data-opcional]").forEach(c => c.closest(".modulo").classList.toggle("is-fuera", !c.checked));
        const c = Pr.caseta(elegidos);
        const n = R ? R.paradas.length : 1;
        pon("[data-calc-total]", Pr.pesos(c.total));
        pon("[data-calc-detalle]", `Materiales y mano de obra ${Pr.pesos(c.directo)} · indirectos ${Pr.pesos(c.indirecto)} · imprevistos 10 % ${Pr.pesos(c.imprevistos)}`);
        pon("[data-calc-red]", Pr.pesos(c.total * n));
        pon("[data-calc-piloto]", Pr.pesos(c.total * 2));
    }
    lista.addEventListener("change", calcular);
    calcular();
    pon("[data-calc-operacion]", Pr.pesos(Pr.operacionAnual()));
    pon("[data-costo-caseta]", Pr.redondo(Pr.caseta().total));
    pon("[data-costo-fecha]", P.fecha);
    const e = Pr.energia();
    pon("[data-energia-gen]", (e.generacion / 1000).toFixed(1));
    pon("[data-energia-uso]", (e.consumo / 1000).toFixed(1));
    pon("[data-energia-dias]", e.autonomia.toFixed(1));

    // fotos de la caseta: día, noche y Parada H
    const foto = document.querySelector("[data-caseta-foto]");
    document.querySelectorAll("[data-caseta-ver]").forEach(b => b.addEventListener("click", () => {
        document.querySelectorAll("[data-caseta-ver]").forEach(x => x.setAttribute("aria-selected", String(x === b)));
        foto.classList.add("is-cambiando");
        const img = new Image();
        img.onload = () => { foto.src = b.dataset.casetaVer; foto.classList.remove("is-cambiando"); };
        img.src = b.dataset.casetaVer;
        const abajo = foto.closest("figure").querySelector(".caseta-heroe__abajo p");
        const boton = foto.closest("figure").querySelector("[data-abrir-zona]");
        const enH = b.dataset.casetaVer.includes("-h");
        abajo.textContent = enH ? "Parada H · frente a Plaza Las Américas" : `Parada A · frente al Tecnológico${b.dataset.casetaVer.includes("noche") ? ", de noche" : ""}`;
        boton.dataset.abrirZona = enH ? "H" : "A";
    }));
}

function construirAccionesCaseta() {
    const cont = document.querySelector("[data-acciones-caseta]");
    if (!cont || !R || !R.paradas.length) return;
    const p = R.paradas[0];
    cont.innerHTML = `
        <button type="button" class="boton boton--negro" data-abrir-zona="${p.id}">Ver la caseta en la ${p.name}</button>
        <a class="boton boton--borde" href="ficha-tecnica.html#caseta">Especificaciones completas</a>`;
}

construirDiagrama();
construirSecuencia();
construirTablero();
construirListaParadas();
dibujarTrazo();
construirVitrina();
construirFichas();
construirCaseta();
construirAccionesCaseta();
document.querySelectorAll("[data-num-paradas]").forEach(el => { el.textContent = R ? R.paradas.length : "—"; });
document.querySelectorAll("[data-unidades]").forEach(el => { el.textContent = `${H.unidadesNecesarias()} combis`; });
window.actualizarLlegadas && window.actualizarLlegadas();

// El mapa calcula dónde cae cada parada sobre el recorrido.
window.addEventListener("ruta:lista", e => {
    H.ajustar(e.detail.fracciones, e.detail.largo);
    construirDiagrama(e.detail.fracciones);
    document.querySelectorAll("[data-distancia]").forEach(el => { el.textContent = textoDistancia(el.dataset.distancia); });
    document.querySelectorAll("[data-unidades]").forEach(el => { el.textContent = `${H.unidadesNecesarias()} combis`; });
    window.actualizarLlegadas && window.actualizarLlegadas();
});

// Las combis del diagrama siguen a las de la simulación del mapa.
window.addEventListener("ruta:combis", e => {
    const cont = document.querySelector("[data-diagrama]");
    if (!cont) return;
    const lista = e.detail.combis;
    let iconos = [...cont.querySelectorAll(".diagrama__combi")];
    while (iconos.length < lista.length) {
        const c = document.createElement("span");
        c.className = "diagrama__combi";
        c.setAttribute("aria-hidden", "true");
        cont.appendChild(c);
        iconos.push(c);
    }
    iconos.forEach((c, i) => {
        c.hidden = i >= lista.length;
        if (i < lista.length) {
            c.style.left = `${(lista[i].fraccion * 100).toFixed(2)}%`;
            c.classList.toggle("is-detenida", !!lista[i].parada);
        }
    });
    const paradas = new Set(lista.map(c => c.parada).filter(Boolean));
    document.querySelectorAll(".estacion[data-ir]").forEach(b => b.classList.toggle("is-here", paradas.has(b.dataset.ir)));
    document.querySelectorAll("[data-hora-sim]").forEach(el => { el.textContent = e.detail.hora; });
});

// ============ Mapa a pantalla completa ============
// El mismo mapa (con su panel) se mueve a una capa que cubre toda la ventana.
(function () {
    const capa = document.querySelector("[data-mapa-completo]");
    const marco = document.querySelector("[data-mapa-marco]");
    const origen = document.querySelector("[data-mapa-origen]");
    const destino = document.querySelector("[data-mapa-destino]");
    if (!capa || !marco || !origen || !destino) return;
    let focoAnterior = null;

    const redimensionar = () => {
        const m = window.RutaMapa && window.RutaMapa.mapa;
        if (!m) return;
        m.resize();
        setTimeout(() => m.resize(), 280);
    };

    function abrir() {
        if (!capa.hidden) return;
        focoAnterior = document.activeElement;
        destino.appendChild(marco);
        capa.hidden = false;
        document.body.classList.add("mapa-abierto");
        requestAnimationFrame(() => {
            capa.classList.add("is-open");
            redimensionar();
        });
        capa.querySelector("[data-cerrar-mapa]").focus({ preventScroll: true });
        if (location.hash !== "#mapa") history.replaceState(null, "", "#mapa");
    }

    function cerrar() {
        if (capa.hidden) return;
        capa.classList.remove("is-open");
        origen.appendChild(marco);
        capa.hidden = true;
        document.body.classList.remove("mapa-abierto");
        redimensionar();
        history.replaceState(null, "", location.pathname + location.search);
        if (focoAnterior && focoAnterior.focus) focoAnterior.focus({ preventScroll: true });
    }

    document.addEventListener("click", e => {
        if (e.target.closest("[data-abrir-mapa]")) { e.preventDefault(); abrir(); }
        else if (e.target.closest("[data-cerrar-mapa]")) cerrar();
    });
    document.addEventListener("keydown", e => {
        if (e.key === "Escape" && !capa.hidden && !document.body.classList.contains("visor-abierto")) cerrar();
    });
    window.addEventListener("hashchange", () => { if (location.hash === "#mapa") abrir(); });
    if (location.hash === "#mapa") abrir();
    window.MapaCompleto = { abrir, cerrar };
})();
