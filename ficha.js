// Ficha técnica: arma las hojas con los datos de ruta-2.js y horario.js.

(function () {
    const R = window.RUTA_2;
    const H = window.RutaHorario;
    const F = window.Formato;
    if (!R || !H) return;
    const $ = (s, el = document) => el.querySelector(s);
    const $$ = (s, el = document) => [...el.querySelectorAll(s)];

    document.addEventListener("click", e => { if (e.target.closest("[data-imprimir]")) window.print(); });

    // ---------- Plano del recorrido (SVG a partir del trazo real) ----------
    function plano(svg, destacar) {
        const conNombres = !destacar && R.paradas.length <= 4; // con muchas paradas, sólo la letra
        const W = 640, Hh = 380, m = 34;
        const k = Math.cos(18 * Math.PI / 180);
        const xs = R.trazo.map(p => p[0] * k), ys = R.trazo.map(p => p[1]);
        const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
        const esc = Math.min((W - 2 * m) / (maxX - minX), (Hh - 2 * m) / (maxY - minY));
        const ox = (W - (maxX - minX) * esc) / 2, oy = (Hh - (maxY - minY) * esc) / 2;
        const pr = (lng, lat) => [ox + (lng * k - minX) * esc, Hh - (oy + (lat - minY) * esc)];
        const d = R.trazo.map((p, i) => `${i ? "L" : "M"}${pr(p[0], p[1]).map(v => v.toFixed(1)).join(" ")}`).join("");
        const mPorPx = 110574 / esc;
        const barra = 500 / mPorPx;
        const b = pr(R.base.lng, R.base.lat);
        let rejilla = "";
        for (let x = 0; x <= W; x += 40) rejilla += `<line x1="${x}" y1="0" x2="${x}" y2="${Hh}"/>`;
        for (let y = 0; y <= Hh; y += 40) rejilla += `<line x1="0" y1="${y}" x2="${W}" y2="${y}"/>`;
        const paradas = R.paradas.map(p => {
            const q = pr(p.lng, p.lat);
            const activa = !destacar || destacar === "base" || destacar === p.id;
            return `<g class="pr-parada${activa ? "" : " is-tenue"}${destacar === p.id ? " is-destacada" : ""}">
                ${destacar === p.id ? `<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="20" class="pr-halo"/>` : ""}
                <rect x="${(q[0] - 10).toFixed(1)}" y="${(q[1] - 10).toFixed(1)}" width="20" height="20" rx="5"/>
                <text x="${q[0].toFixed(1)}" y="${(q[1] + 4).toFixed(1)}">${p.corto}</text>
                ${conNombres ? (q[0] > W * 0.6
                    ? `<text class="pr-nombre" style="text-anchor:end" x="${(q[0] - 16).toFixed(1)}" y="${(q[1] - 14).toFixed(1)}">${p.name.toUpperCase()} · ${F.calleCorta(p.calle).toUpperCase()}</text>`
                    : `<text class="pr-nombre" x="${(q[0] + 16).toFixed(1)}" y="${(q[1] - 12).toFixed(1)}">${p.name.toUpperCase()} · ${F.calleCorta(p.calle).toUpperCase()}</text>`) : ""}
            </g>`;
        }).join("");
        svg.innerHTML = `
            <g class="pr-rejilla">${rejilla}</g>
            <path d="${d}" class="pr-casco"/><path d="${d}" class="pr-linea"/>
            <g class="pr-base">${destacar === "base" ? `<circle cx="${b[0].toFixed(1)}" cy="${b[1].toFixed(1)}" r="20" class="pr-halo"/>` : ""}<rect x="${(b[0] - 7).toFixed(1)}" y="${(b[1] - 7).toFixed(1)}" width="14" height="14" rx="2"/>
            ${!destacar || destacar === "base" ? `<text class="pr-nombre" x="${(b[0] + 14).toFixed(1)}" y="${(b[1] + 4).toFixed(1)}">BASE · ${R.base.calle.toUpperCase()}</text>` : ""}</g>
            ${paradas}
            <g class="pr-norte" transform="translate(${W - 34} 40)"><path d="M0 -18 L7 6 L0 1 L-7 6 Z"/><text y="22">N</text></g>
            <g class="pr-escala" transform="translate(24 ${Hh - 24})"><rect width="${(barra / 2).toFixed(1)}" height="5"/><rect x="${(barra / 2).toFixed(1)}" width="${(barra / 2).toFixed(1)}" height="5" class="is-blanco"/>
            <text y="-6">0</text><text x="${barra.toFixed(1)}" y="-6">500 m</text></g>`;
    }

    // ---------- Hojas de las paradas ----------
    // Hoja completa sólo para las paradas con levantamiento y maqueta; las demás van en la hoja «Red de paradas».
    const plantilla = $("[data-plantilla-parada]");
    const antesDe = $("#base");
    const orden = R.paradas.slice().sort((a, b) => H.fraccion(a.id) - H.fraccion(b.id));
    orden.filter(p => p.imagen && !p.propuesta).forEach(p => {
        const hoja = plantilla.content.firstElementChild.cloneNode(true);
        hoja.id = `parada-${p.id.toLowerCase()}`;
        hoja.dataset.titulo = `${p.name} · ${F.calleCorta(p.calle)}`;
        $("[data-p-titulo]", hoja).textContent = `${p.name} · ${F.calleCorta(p.calle)}`;
        $("[data-p-referencia]", hoja).textContent = p.referencia;
        const img = $("[data-p-foto]", hoja);
        img.src = p.imagen;
        img.alt = `Maqueta 3D de la ${p.name}`;
        $("[data-p-pie]", hoja).textContent = `Maqueta 3D de la ${p.name} con la Caseta LZC y el tótem contador`;
        const v = H.viaje("base", p.id);
        const sentido = (p.calle.split(",")[1] || "—").trim();
        $("[data-p-datos]", hoja).innerHTML = [
            ["Coordenadas", `${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`.replace("-", "−")],
            ["Calle", F.calleCorta(p.calle)],
            ["Sentido", sentido.charAt(0).toUpperCase() + sentido.slice(1)],
            ["Referencia", p.referencia],
            ["Desde la base", `${F.distancia(H.distancia(p.id))} · ${F.minutos(v)}`],
            ["Apodo", p.apodo || "—"],
            ["Caseta", "Caseta LZC con tótem y mapa"]
        ].map(([a, b]) => `<tr><th>${a}</th><td>${b}</td></tr>`).join("");
        $("[data-p-entorno]", hoja).innerHTML = (p.entorno || []).map(t => `<li>${t}</li>`).join("");
        $("[data-p-obs]", hoja).textContent = p.desc || "—";
        plano($("[data-p-mini]", hoja), p.id);
        antesDe.before(hoja);
    });

    // ---------- Hoja de la base ----------
    const hojaBase = $("#base");
    if (hojaBase) {
        const b = R.base;
        $("[data-b-calle]", hojaBase).textContent = b.calle;
        $("[data-b-colonia]", hojaBase).textContent = `${b.colonia} · ${b.desc}`;
        $("[data-b-datos]", hojaBase).innerHTML = [
            ["Coordenadas", `${b.lat.toFixed(6)}, ${b.lng.toFixed(6)}`.replace("-", "−")],
            ["Calle", b.calle],
            ["Colonia", b.colonia],
            ["Salidas", `Una combi cada ${H.frecuencia} min`],
            ["Horario", "6:00 a 22:00 (simulado)"],
            ["Unidades", `${H.unidadesNecesarias()} combis en servicio`],
            ["Estado", "Ubicación confirmada"]
        ].map(([a, c]) => `<tr><th>${a}</th><td>${c}</td></tr>`).join("");
        plano($("[data-b-mini]", hojaBase), "base");
    }

    // ---------- Hoja del recorrido ----------
    plano($("[data-plano-ruta]"));
    const L = H.largo(), T = H.vuelta();
    const pon = (sel, txt) => $$(sel).forEach(el => { el.textContent = txt; });
    pon("[data-largo]", F.distancia(L));
    pon("[data-vuelta]", `${Math.round(T / 60)} min`);
    pon("[data-velocidad]", `${H.velocidad} km/h`);
    pon("[data-frecuencia]", `Una combi cada ${H.frecuencia} min`);
    pon("[data-unidades]", `${H.unidadesNecesarias()} combis`);
    pon("[data-num-paradas]", String(R.paradas.length));
    pon("[data-base]", `${R.base.calle}, ${R.base.colonia}`);
    const puntos = [{ id: "base", nombre: "Base", f: 0 }, ...orden.map(p => ({ id: p.id, nombre: p.name, f: H.fraccion(p.id) })), { id: "base", nombre: "Base", f: 1 }];
    $("[data-tramos]").innerHTML = puntos.slice(0, -1).map((p, i) => {
        const q = puntos[i + 1];
        const metros = (q.f - p.f) * L;
        return `<tr><th>${p.nombre} → ${q.nombre}</th><td>${F.distancia(metros)}</td><td>${F.minutos(metros / (H.velocidad / 3.6))}</td></tr>`;
    }).join("") + `<tr class="total"><th>Vuelta completa</th><td>${F.distancia(L)}</td><td>${Math.round(T / 60)} min</td></tr>`;
    $("[data-calles]").textContent = (R.calles || []).join(" → ");


    // ---------- Presupuesto de la caseta (datos de presupuesto.js) ----------
    const P = window.PRESUPUESTO_CASETA, Pr = window.Presupuesto;
    if (P && Pr) {
        const $p = Pr.pesos;
        const num = n => Number.isInteger(n) ? String(n) : n.toLocaleString("es-MX", { maximumFractionDigits: 2 });
        pon("[data-f-fecha]", P.fecha);
        const completa = Pr.caseta(), basica = Pr.caseta([]);
        pon("[data-f-costo]", `${$p(completa.total)} con todos los módulos`);
        $$("[data-f-partidas]").forEach(tp => {
        const [desde, hasta] = tp.dataset.fPartidas.split("-").map(Number);
        const ultimo = hasta >= P.modulos.length;
        tp.innerHTML = P.modulos.slice(desde, hasta).map((m, k) => { const i = desde + k; return `
            <tr class="modulo"><th colspan="4">${String(i + 1).padStart(2, "0")} · ${m.nombre}${m.fijo ? "" : " <i>opc.</i>"}</th><td>${$p(Pr.modulo(m))}</td></tr>` +
            m.partidas.map(p => `<tr><th>${p.concepto}${p.fuente ? "" : " <sup>†</sup>"}</th><td>${num(p.cantidad)}</td><td>${p.unidad}</td><td>${$p(p.pu)}</td><td>${$p(Pr.importe(p))}</td></tr>`).join(""); }
        ).join("") + (ultimo ? `<tr class="total"><th colspan="4">Materiales, equipo y mano de obra (módulos 01 a ${String(P.modulos.length).padStart(2, "0")})</th><td>${$p(completa.directo)}</td></tr>` : "");
        });

        const tr = $("[data-f-resumen]");
        if (tr) tr.innerHTML = [
            ["Materiales, equipo y mano de obra", completa.directo],
            ...P.indirectos.map(x => [x.concepto, x.importe]),
            [`Imprevistos (${Math.round(P.imprevistos * 100)} %)`, completa.imprevistos]
        ].map(([a, b]) => `<tr><th>${a}</th><td>${$p(b)}</td></tr>`).join("") +
            `<tr class="total"><th>Caseta completa</th><td>${$p(completa.total)}</td></tr>` +
            `<tr><th>Caseta básica (sin opcionales)</th><td>${$p(basica.total)}</td></tr>`;

        const n = R.paradas.length, op = Pr.operacionAnual();
        const trd = $("[data-f-red]");
        if (trd) trd.innerHTML = [
            [`${n} casetas completas`, completa.total * n],
            [`${n} casetas básicas`, basica.total * n],
            [`Operación de la red, por año`, op * n]
        ].map(([a, b]) => `<tr><th>${a}</th><td>${$p(b)}</td></tr>`).join("");

        const E = Pr.energia();
        const te = $("[data-f-energia]");
        if (te) te.innerHTML = P.energia.consumos.map(c => `<tr><th>${c.equipo}</th><td>${c.watts}</td><td>${c.horas}</td><td>${num(c.watts * c.horas)}</td></tr>`).join("") +
            `<tr class="total"><th colspan="3">Consumo diario</th><td>${Math.round(E.consumo).toLocaleString("es-MX")}</td></tr>` +
            `<tr><th colspan="3">Generación (${(P.energia.panelesW / 1000).toFixed(1)} kW × ${P.energia.horasSolPico} h × ${Math.round(P.energia.eficiencia * 100)} %)</th><td>${Math.round(E.generacion).toLocaleString("es-MX")}</td></tr>` +
            `<tr><th colspan="3">Autonomía de la batería sin sol</th><td>${E.autonomia.toFixed(1)} días</td></tr>`;

        const to = $("[data-f-operacion]");
        if (to) to.innerHTML = P.operacion.map(o => `<tr><th>${o.concepto}</th><td>${$p(o.mensual * 12)}</td></tr>`).join("") +
            `<tr class="total"><th>Total por año</th><td>${$p(op)}</td></tr>`;

        const tf = $("[data-f-fuentes]");
        if (tf) tf.innerHTML = Object.values(P.fuentes).map(f => `<li>${f.texto} · <span>${f.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\?.*$/, "")}</span></li>`).join("");
    }

    // ---------- Red de paradas ----------
    const svgRed = $("[data-plano-red]");
    if (svgRed) plano(svgRed);
    const trp = $("[data-f-red-paradas]");
    if (trp) trp.innerHTML = orden.map(p => {
        const km = p.km != null ? p.km : H.distancia(p.id) / 1000;
        const lugares = (p.cerca || []).slice(0, 3).map(l => `${l.nombre} <i>${l.min}&nbsp;min</i>`).join(" · ");
        return `<tr><td class="letra"><b>${p.corto}</b></td><th>${p.apodo || p.name}${p.propuesta ? "" : " <i>✓</i>"}</th><td>${F.calleCorta(p.calle)}</td><td>${km.toFixed(1)}</td><td class="lugares">${lugares}</td></tr>`;
    }).join("");

    // ---------- Numeración, índice y folios ----------
    const hojas = $$(".hoja");
    const N = hojas.length;
    hojas.forEach((h, i) => {
        $$("[data-folio]", h).forEach(el => { el.textContent = `Hoja ${i + 1} / ${N}`; });
        const etiqueta = $("[data-num-seccion], [data-p-etiqueta]", h);
        if (etiqueta) etiqueta.textContent = `${String(i).padStart(2, "0")} · ${h.dataset.titulo.split(" · ")[0]}`;
    });
    $("[data-indice]").innerHTML = hojas.slice(1).map((h, i) =>
        `<li><a href="#${h.id}"><span>${String(i + 1).padStart(2, "0")}</span>${h.dataset.titulo}<b>${i + 2}</b></a></li>`).join("");
    pon("[data-num-hojas]", `${N} hojas · tamaño carta`);

    // Si se abrió con un ancla (#caseta), ir a esa hoja ya armada.
    if (location.hash) {
        const destino = document.getElementById(location.hash.slice(1));
        if (destino) setTimeout(() => destino.scrollIntoView(), 50);
    }
})();
