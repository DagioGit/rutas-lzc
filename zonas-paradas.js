// Maquetas 3D de las paradas B a G e I, armadas con datos.
//
// Cada parada se describe con una "ficha" (calles, edificios, lotes, árboles y
// detalles vistos en Street View) y zonaCiudad() la construye con el mismo kit
// de las maquetas hechas a mano (zonas-3d.js). Coordenadas en metros: x = este,
// y = norte, con el origen en el punto exacto de la parada.
//
// Reglas de la ficha:
//   calles[].pts  van en el sentido en que circula la combi cuando es la calle de
//                 la parada: la caseta queda a la DERECHA (d > 0).
//   ancho         calzada completa (sin camellón); camellon = ancho del camellón.
//   edificios[]   { pts, tipo: "casa" | "comercio" | "nave", ...opciones de kit.casa }
//   relleno       calles donde se agregan casas típicas de la colonia donde
//                 OpenStreetMap no tiene edificios dibujados.

(function () {
    const K = window.Zonas3DKit;
    if (!K) return;
    const { crearKit, marcoCalle, crearTrafico, distanciaALinea, centro, areaPoligono } = K;

    const PALETA_COLONIA = ["#f0c9c4", "#efe0b0", "#f3e7d3", "#cfe0d0", "#d6e4ee", "#f2d39a", "#ecebe5", "#c9a98a", "#e7c84a", "#b8d0a0", "#d7c4e0", "#e9b7a3", "#f3e7d3", "#ecebe5", "#9fc3c9"];
    const ZOCALOS = ["#7a5a48", "#4e7a8a", "#8a3a30", "#5d7a4a"];
    const COLORES_AUTO = [0xf2f2f2, 0x9aa1a7, 0x1b1d20, 0xc0262c, 0xd9dcdf, 0x2a5ea8, 0xf2f2f2, 0x6b7076, 0x8a1c1c];

    const dentro = (x, y, pts) => {
        let c = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            const a = pts[i], b = pts[j];
            if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c;
        }
        return c;
    };
    const rect = (cx, cy, w, d, ang) => {
        const c = Math.cos(ang), s = Math.sin(ang);
        return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => ({ x: cx + c * i * w / 2 - s * j * d / 2, y: cy + s * i * w / 2 + c * j * d / 2 }));
    };

    function zonaCiudad(THREE, F) {
        const kit = crearKit(THREE, F.lim);
        const { mat, P, cinta, franja, punteada, caja, poligono } = kit;
        kit.base(F.suelo || 0xe2dac6);

        const M = {
            asfalto: mat(0xffffff, { map: kit.texAsfalto(), roughness: 0.95 }),
            concreto: mat(0xd6d2c9, { map: kit.texConcreto(), roughness: 0.93 }),
            terraceria: mat(0xc2b18c, { map: kit.texTierra(), roughness: 1 }),
            banqueta: mat(0xffffff, { map: kit.texBanqueta(), roughness: 0.95 }),
            guarnicion: mat(0xbdb8ad),
            amarillo: mat(0xf2c200, { roughness: 0.6 }),
            blanco: mat(0xf4f4f0, { roughness: 0.7 }),
            pasto: mat(0xd8dcb0, { map: kit.texPasto(), roughness: 1 }),
            tierra: mat(0xd2c4a2, { map: kit.texTierra(), roughness: 1 }),
            lote: mat(0xd8d8d8, { map: kit.texAsfalto(), roughness: 0.95 }),
            ciclovia: mat(0x4fc458, { roughness: 0.8 }),
            agua: mat(0x5fb3d6, { roughness: 0.15, metalness: 0.1 })
        };

        // ---------- Calles ----------
        const calles = (F.calles || []).map((c, i) => {
            const pts = P(c.pts);
            const cam = c.camellon || 0;
            const mitad = c.ancho / 2 + cam / 2;
            return { ...c, i, pts, cam, mitad, banq: c.banqueta == null ? 2.2 : c.banqueta, linea: prepararRuta(pts) };
        });
        const porId = id => calles.find(c => c.id === id);

        // Tramos de una calle que no chocan con otras calles (para banquetas y camellones).
        function tramosLibres(c, d, margen = 0.5) {
            const runs = [];
            let actual = null;
            for (let s = 0; s <= c.linea.largo; s += 1) {
                const p = puntoEn(c.linea, s), u = direccionEn(c.linea, s, 1);
                const x = p.x + u.y * d, y = p.y - u.x * d;
                const choca = calles.some(o => o !== c && !(o.nombre && o.nombre === c.nombre) && distanciaALinea(o.pts, x, y) < o.mitad + margen);
                if (!choca) { if (!actual) { actual = []; runs.push(actual); } actual.push({ x: p.x, y: p.y }); }
                else actual = null;
            }
            return runs.filter(r => r.length > 2);
        }

        calles.forEach(c => {
            const z = 0.05 + c.i * 0.004;
            const material = M[c.material || "asfalto"];
            if (c.cam) {
                cinta(c.pts, -c.mitad, -c.cam / 2, z, material, 6);
                cinta(c.pts, c.cam / 2, c.mitad, z, material, 6);
            } else cinta(c.pts, -c.mitad, c.mitad, z, material, 6);

            // ciclovía verde a la derecha (entre la calle y la banqueta)
            if (c.ciclovia) tramosLibres(c, c.mitad + c.ciclovia / 2).forEach(r => {
                cinta(r, c.mitad, c.mitad + c.ciclovia, z + 0.004, M.ciclovia, 4);
                punteada(r, c.mitad + 0.12, z + 0.012, 1.2, 1.2, 0.12, M.blanco);
            });
            // medio camellón a la izquierda (avenidas divididas dibujadas por sentido)
            if (c.camIzq) tramosLibres(c, -c.mitad - c.camIzq / 2, 0.3).forEach(r => {
                const top = c.tipoCamellon === "concreto" ? M.concreto : c.tipoCamellon === "tierra" ? M.tierra : M.pasto;
                franja(r, -c.mitad - c.camIzq - 0.05, -c.mitad, 0, 0.2, top, M.guarnicion, 3);
                franja(r, -c.mitad - 0.22, -c.mitad + 0.02, 0, 0.22, M.amarillo, M.amarillo, 2);
                if (c.arbolesCamellon) {
                    const L = prepararRuta(r);
                    for (let s = 5 + (c.i * 3) % 7; s < L.largo - 3; s += c.arbolesCamellon) {
                        const p = puntoEn(L, s), u = direccionEn(L, s, 1);
                        const d = -c.mitad - c.camIzq * 0.55;
                        const x = p.x + u.y * d, y = p.y - u.x * d;
                        if (c.palmasCamellon && (s / c.arbolesCamellon) % 3 < 1) kit.palmera(x, y, 7 + (s % 3), 0.04);
                        else if ((Math.round(s) % 5) === 0) kit.arbolJoven(x, y);
                        else kit.arbol(x, y, 1.9 + (s % 7) * 0.12, 5.4 + (s % 5) * 0.25, { color: c.colorArbol, troncoBlanco: c.troncoBlanco });
                    }
                }
            });

            // banquetas con guarnición, cortadas en los cruces
            if (c.banq > 0) [1, -1].forEach(lado => {
                if (c.sinBanqueta === lado || (c.camIzq && lado < 0)) return;
                const ext = lado > 0 ? (c.ciclovia || 0) : 0;
                const dMedio = lado * (c.mitad + ext + c.banq / 2);
                tramosLibres(c, dMedio).forEach(r => {
                    const a = lado > 0 ? c.mitad + ext : -c.mitad - c.banq, b = lado > 0 ? c.mitad + ext + c.banq : -c.mitad;
                    franja(r, a, b, 0, 0.15, M.banqueta, M.guarnicion, 3);
                    if (c.guarnicion === "amarilla") {
                        const g0 = lado > 0 ? c.mitad + ext : -c.mitad - 0.22, g1 = lado > 0 ? c.mitad + ext + 0.22 : -c.mitad;
                        franja(r, g0, g1, 0, 0.17, M.amarillo, M.amarillo, 2);
                    }
                    if (c.pastoBanqueta) {
                        const p0 = lado > 0 ? c.mitad + 0.25 : -c.mitad - 0.25 - c.pastoBanqueta;
                        cinta(r, p0, p0 + c.pastoBanqueta, 0.155, M.pasto, 3);
                    }
                });
            });

            // camellón
            if (c.cam) tramosLibres(c, 0, 0.5).forEach(r => {
                const top = c.tipoCamellon === "concreto" ? M.concreto : c.tipoCamellon === "pasto" ? M.pasto : M.tierra;
                franja(r, -c.cam / 2, c.cam / 2, 0, 0.2, top, M.guarnicion, 3);
                franja(r, -c.cam / 2 - 0.05, -c.cam / 2 + 0.2, 0, 0.22, M.amarillo, M.amarillo, 2);
                franja(r, c.cam / 2 - 0.2, c.cam / 2 + 0.05, 0, 0.22, M.amarillo, M.amarillo, 2);
                if (c.arbolesCamellon) {
                    const L = prepararRuta(r);
                    for (let s = 4; s < L.largo - 3; s += c.arbolesCamellon) {
                        const p = puntoEn(L, s);
                        if (c.palmasCamellon) kit.palmera(p.x, p.y, 8 + (s % 3), 0.04);
                        else kit.arbol(p.x, p.y, 3.2 + (s % 7) * 0.12, 7.5 + (s % 5) * 0.3, { troncoBlanco: c.troncoBlanco !== false });
                    }
                }
            });

            // rayas
            if (c.rayas !== false && c.material !== "terraceria") {
                tramosLibres(c, 0, 1).forEach(r => {
                    if (r.length < 6) return;
                    if (c.cam) {
                        if (c.ancho >= 12) {
                            punteada(r, -c.cam / 2 - c.ancho / 4, z + 0.012, 3, 4.5, 0.12, M.blanco);
                            punteada(r, c.cam / 2 + c.ancho / 4, z + 0.012, 3, 4.5, 0.12, M.blanco);
                        }
                    } else if (c.dobleAmarilla) {
                        cinta(r, -0.18, -0.06, z + 0.012, M.amarillo);
                        cinta(r, 0.06, 0.18, z + 0.012, M.amarillo);
                    } else if (c.ancho >= 7) punteada(r, 0, z + 0.012, 3, 4.5, 0.12, M.blanco);
                });
            }
        });

        // ---------- Lotes, áreas verdes y plazas ----------
        (F.lotes || []).forEach(l => {
            const pts = P(l.pts);
            const m = { estacionamiento: M.lote, pasto: M.pasto, tierra: M.tierra, concreto: M.concreto, plaza: mat(0xffffff, { map: kit.texBanqueta(l.color || "#d9cfbd"), roughness: 0.95 }), terraceria: M.terraceria, agua: M.agua, cancha: M.pasto }[l.tipo] || M.tierra;
            if (l.alto) {
                const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(p => new THREE.Vector2(p.x, p.y))), { depth: l.alto, bevelEnabled: false });
                const uv = geo.attributes.uv;
                for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 4, uv.getY(i) / 4);
                const me = new THREE.Mesh(geo, [m, M.guarnicion]);
                me.receiveShadow = true;
                kit.grupo.add(me);
            } else poligono(pts, l.z || 0.03, m, l.tipo === "estacionamiento" ? 8 : 5);
            if (l.tipo === "estacionamiento" && l.cajones) {
                const lineas = mat(l.colorRaya || 0xf4f4f0, { roughness: 0.7 });
                const estacionados = [];
                let k = 0;
                l.cajones.forEach(([ax, ay, bx, by, lados = 2]) => {
                    const L = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / L, uy = (by - ay) / L, ang = Math.atan2(uy, ux);
                    for (let s = 2; s < L - 2; s += 2.7) {
                        (lados === 2 ? [1, -1] : [lados]).forEach(lado => {
                            const lx = ax + ux * (s - 1.35) - uy * lado * 3, ly = ay + uy * (s - 1.35) + ux * lado * 3;
                            caja(0.12, 5, 0.01, lx - uy * lado * 0, ly, (l.z || 0.03) + 0.015, ang, lineas, false);
                            k++;
                            if ((k * 7 + (l.semilla || 0)) % 10 < (l.ocupacion || 5)) estacionados.push({ x: ax + ux * s - uy * lado * 3, y: ay + uy * s + ux * lado * 3, ang: ang + (Math.PI / 2) * lado, color: COLORES_AUTO[k % COLORES_AUTO.length] });
                        });
                    }
                });
                kit.autosEstacionados(estacionados);
            }
        });

        // ---------- Caseta y calle de la parada ----------
        const cr = porId(F.ruta.calle);
        const marco = marcoCalle(cr.pts);
        const N = (s, d) => marco.en(s, d);
        // La caseta (2.40 m de fondo) va junto a la guarnición, a 0.30 m de la orilla, y el
        // tótem a un lado, en la misma franja. Detrás siempre quedan al menos 1.20 m libres
        // para caminar: si la banqueta no alcanza, se pavimenta una explanada detrás de ella
        // (en el remetimiento del predio), nunca se le quita espacio a la calle.
        const sC = F.ruta.s || 0;
        const orilla = cr.mitad + (cr.ciclovia || 0);
        const dCaseta = orilla + 0.3 + 1.2 + (F.ruta.retiro || 0);
        const posCaseta = N(sC, dCaseta);
        const FONDO_CASETA = 0.3 + 2.4 + (F.ruta.retiro || 0);
        const explanada = F.ruta.explanada != null ? F.ruta.explanada : Math.max(0, FONDO_CASETA + 1.25 - cr.banq);
        const tramoRuta = (s0, s1, paso = 1) => { const r = []; for (let s = s0; s <= s1 + 1e-6; s += paso) { const p = N(s, 0); r.push({ x: p.x, y: p.y }); } return r; };
        const zonaParada = { s0: sC - 7, s1: sC + 6, d0: orilla, d1: orilla + cr.banq + explanada };
        if (explanada > 0) {
            const r = tramoRuta(sC - 6.5, sC + 5.5, 0.5);
            franja(r, orilla + cr.banq - 0.02, orilla + cr.banq + explanada, 0, 0.15, M.banqueta, M.guarnicion, 3);
        }
        // ¿está (x, y) en la franja de la parada? (caseta, tótem y paso libre)
        const enParada = (x, y, margen = 0) => {
            const L = marco.linea;
            const sx = distanciaMasCercana(L, x, y) - marco.s0;
            const p = puntoEn(L, sx + marco.s0), u = direccionEn(L, sx + marco.s0, 1);
            const d = (x - p.x) * u.y - (y - p.y) * u.x;
            return sx >= zonaParada.s0 - margen && sx <= zonaParada.s1 + margen && d >= zonaParada.d0 - 0.5 && d <= zonaParada.d1 + margen;
        };
        const lejosCaseta = (x, y, r) => Math.hypot(x - posCaseta.x, y - posCaseta.y) > r && !enParada(x, y, 0.8);

        // ---------- Edificios ----------
        const ocupados = [];
        const calleCercana = (x, y) => calles.reduce((m, c) => { const d = distanciaALinea(c.pts, x, y); return d < m.d ? { d, c } : m; }, { d: Infinity, c: null }).c;
        let semillaCasa = 7;
        const azarCasa = () => { semillaCasa = (semillaCasa * 16807) % 2147483647; return (semillaCasa - 1) / 2147483646; };
        const opcionesColonia = (base = {}) => {
            const op = { color: PALETA_COLONIA[Math.floor(azarCasa() * PALETA_COLONIA.length)], pisos: azarCasa() < (F.pisos2 == null ? 0.3 : F.pisos2) ? 2 : 1 };
            if (op.pisos === 2 && azarCasa() < 0.35) op.colorAlto = PALETA_COLONIA[Math.floor(azarCasa() * PALETA_COLONIA.length)];
            if (azarCasa() < 0.3) op.zocalo = ZOCALOS[Math.floor(azarCasa() * ZOCALOS.length)];
            const r = azarCasa();
            if (r < 0.1) { op.techo = "lamina"; op.pretil = false; op.colorLamina = ["#9aa0a3", "#8d6a4f", "#4f6f8f"][Math.floor(azarCasa() * 3)]; op.tinaco = false; }
            else if (r < 0.16 && op.pisos === 2) { op.tipoMuro = "ladrillo"; op.obraAlta = true; op.pretil = false; op.varillas = true; }
            else if (r < 0.22) op.techo = "teja";
            if (azarCasa() < (F.locales == null ? 0.2 : F.locales)) op.planta = ["cortina", "puerta"];
            return { ...op, ...base };
        };
        const rotulos = [];
        (F.edificios || []).forEach(e => {
            const pts = e.rect ? rect(...e.rect) : P(e.pts);
            const c = centro(pts);
            if (e.rotulo) rotulos.push({ texto: e.rotulo, x: c.x, y: c.y, z: (e.tipo === "comercio" || e.tipo === "nave" ? e.alto || 7 : (e.pisos || 1) * 3) + 1.2, tipo: "lugar" });
            ocupados.push({ pts, c, r: Math.sqrt(Math.abs(areaPoligono(pts))) / 2, h: e.tipo === "comercio" || e.tipo === "nave" ? (e.alto || 7) + 0.6 : (e.pisos || 2) * 3 + 1.6 });
            const calle = e.calle ? porId(e.calle).pts : (calleCercana(c.x, c.y) || {}).pts;
            if (e.tipo === "comercio" || e.tipo === "nave") {
                kit.edificio(pts, e.alto || 7, e.color || "#ecebe5", { vidrio: e.vidrio, ancho: e.vanos == null ? (e.tipo === "nave" ? 0.08 : 0.7) : e.vanos, colorPretil: e.colorPretil || e.color, tinacos: e.tinacos, pretil: e.pretil });
                if (e.frente && calle) kit.frenteComercial(pts, calle, e.alto || 7, e.colorFrente || e.color || "#ecebe5", e.toldo, e.colorLetrero);
                if (e.letrero) {
                    const { texto, color = "#ffffff", fondo = "#c0262c", ancho = 6, alto = 1.2, z } = e.letrero;
                    const fr = frenteHacia(pts, calle);
                    if (fr) kit.letreroTexto(ancho, alto, (g, w, h) => {
                        g.fillStyle = fondo; g.fillRect(0, 0, w, h);
                        g.fillStyle = color; g.font = `bold ${h * 0.56}px Arial`; g.textAlign = "center"; g.textBaseline = "middle";
                        g.fillText(texto, w / 2, h / 2 + 1, w * 0.92);
                    }, fr.m.x + fr.n.x * 0.12, fr.m.y + fr.n.y * 0.12, z || Math.max(3.4, (e.alto || 7) - 1), fr.ang + Math.PI);
                }
            } else {
                kit.casa(pts, calle, { ppm: Math.hypot(c.x - posCaseta.x, c.y - posCaseta.y) < 55 ? 30 : 16, ...opcionesColonia(), ...e });
            }
        });

        function frenteHacia(pts, calle) {
            if (!calle) return null;
            let mejor = null;
            for (let i = 0; i < pts.length; i++) {
                const a = pts[i], b = pts[(i + 1) % pts.length];
                const L = Math.hypot(b.x - a.x, b.y - a.y);
                if (L < 3) continue;
                const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
                const d = distanciaALinea(calle, m.x, m.y);
                if (!mejor || d < mejor.d) mejor = { a, b, L, m, d };
            }
            if (!mejor) return null;
            const ang = Math.atan2(mejor.b.y - mejor.a.y, mejor.b.x - mejor.a.x);
            let n = { x: Math.sin(ang), y: -Math.cos(ang) };
            const c = centro(pts);
            if ((mejor.m.x - c.x) * n.x + (mejor.m.y - c.y) * n.y < 0) n = { x: -n.x, y: -n.y };
            return { m: mejor.m, n, ang: Math.atan2(n.y, n.x) - Math.PI / 2, L: mejor.L };
        }

        // Casas típicas de la colonia a lo largo de las calles indicadas
        const libres = (F.relleno && F.relleno.calles) || [];
        const evitar = (F.relleno && F.relleno.evitar || []).map(P);
        const lotesPts = (F.lotes || []).map(l => P(l.pts));
        libres.forEach(id => {
            const c = porId(id);
            if (!c) return;
            const lados = c.rellenoLados || [1, -1];
            lados.forEach(lado => {
                let s = 2 + azarCasa() * 3;
                while (s < c.linea.largo - 2) {
                    const frente = (F.relleno.frente || 7.5) + azarCasa() * 4;
                    const fondo = (F.relleno.fondo || 11) + azarCasa() * 5;
                    const medio = s + frente / 2;
                    s += frente + 0.25 + (azarCasa() < (F.relleno.huecos || 0.08) ? 5 + azarCasa() * 6 : 0);
                    const p = puntoEn(c.linea, medio), u = direccionEn(c.linea, medio, 1);
                    const off = c.mitad + (lado > 0 ? c.ciclovia || 0 : 0) + c.banq + 0.3 + fondo / 2;
                    const cx = p.x + u.y * off * lado, cy = p.y - u.x * off * lado;
                    const ang = Math.atan2(u.y, u.x);
                    const pts = rect(cx, cy, frente, fondo, ang);
                    const lim = F.lim;
                    if (pts.some(q => q.x < lim.minX + 1 || q.x > lim.maxX - 1 || q.y < lim.minY + 1 || q.y > lim.maxY - 1)) continue;
                    if (!lejosCaseta(cx, cy, Math.max(frente, fondo) / 2 + 5) || pts.some(q => enParada(q.x, q.y, 1))) continue;
                    if (pts.concat([{ x: cx, y: cy }]).some(q => calles.some(o => distanciaALinea(o.pts, q.x, q.y) < o.mitad + o.banq + 0.2))) continue;
                    if (pts.concat([{ x: cx, y: cy }]).some(q => lotesPts.some(l => dentro(q.x, q.y, l)) || evitar.some(l => dentro(q.x, q.y, l)))) continue;
                    if (ocupados.some(o => Math.hypot(o.c.x - cx, o.c.y - cy) < o.r + Math.min(frente, fondo) / 2 + 0.3 || o.pts.some(q => dentro(q.x, q.y, pts)) || pts.some(q => dentro(q.x, q.y, o.pts)))) continue;
                    ocupados.push({ pts, c: { x: cx, y: cy }, r: Math.min(frente, fondo) / 2, h: 7.6 });
                    kit.casa(pts, c.pts, { ppm: Math.hypot(cx - posCaseta.x, cy - posCaseta.y) < 70 ? 30 : 20, banqueta: false, ...opcionesColonia(F.relleno.op) });
                }
            });
        });

        // ---------- Bardas ----------
        (F.bardas || []).forEach(b => kit.barda(P(b.pts), b.alto || 2.4, b.tipo || "block", b.color));

        // ---------- Letreros de los negocios que registra OpenStreetMap ----------
        // Cada negocio con nombre lleva su letrero en la fachada del edificio más cercano,
        // del lado de la calle, para que la cuadra se reconozca.
        const COLOR_NEGOCIO = { restaurant: "#c0392b", fast_food: "#d35400", cafe: "#6d4c41", bar: "#4a235a", pharmacy: "#1e8449", clinic: "#1f618d", school: "#7d3c98", books: "#2e86c1", lottery: "#b7950b", post_office: "#34495e", travel_agency: "#117a65" };
        const conLetrero = new Set();
        (F.lugares || []).forEach(([x, y, tipo, nombre]) => {
            if (!nombre || /semefo/i.test(nombre) || rotulos.some(r => r.texto === nombre)) return;
            const cand = ocupados.map(o => ({ o, d: Math.hypot(o.c.x - x, o.c.y - y) - o.r })).filter(q => q.d < 9 && !conLetrero.has(q.o)).sort((a, b) => a.d - b.d)[0];
            if (!cand) return;
            const o = cand.o;
            if (enParada(o.c.x, o.c.y, 2)) return;
            const calle = calleCercana(o.c.x, o.c.y);
            const fr = calle && frenteHacia(o.pts, calle.pts);
            if (!fr || fr.L < 3.5) return;
            conLetrero.add(o);
            const texto = nombre.length > 26 ? nombre.slice(0, 25) + "…" : nombre;
            const ancho = Math.min(fr.L * 0.85, 1.2 + texto.length * 0.32);
            const fondo = COLOR_NEGOCIO[tipo] || "#f4f1e8", tinta = COLOR_NEGOCIO[tipo] ? "#ffffff" : "#26333b";
            kit.letreroTexto(ancho, 0.75, (g, w, h) => {
                g.fillStyle = fondo; g.fillRect(0, 0, w, h);
                g.fillStyle = tinta; g.font = `bold ${h * 0.5}px Arial`; g.textAlign = "center"; g.textBaseline = "middle";
                g.fillText(texto.toUpperCase(), w / 2, h / 2 + 1, w * 0.94);
            }, fr.m.x + fr.n.x * 0.14, fr.m.y + fr.n.y * 0.14, Math.min(3.3, (o.h || 6) - 1.4), fr.ang + Math.PI);
        });

        // ---------- Vegetación ----------
        // (nada de árboles encima de un edificio ni en la franja de la parada)
        const sobreEdificio = (x, y) => ocupados.some(o => dentro(x, y, o.pts));
        (F.arboles || []).forEach(([x, y, r = 3.2, alto = 7, blanco]) => { if (lejosCaseta(x, y, 3) && !sobreEdificio(x, y)) kit.arbol(x, y, r, alto, { troncoBlanco: !!blanco }); });
        (F.palmeras || []).forEach(([x, y, alto = 9]) => { if (lejosCaseta(x, y, 2) && !sobreEdificio(x, y)) kit.palmera(x, y, alto, 0.06); });
        (F.arbustos || []).forEach(([x, y, r = 0.8]) => { if (lejosCaseta(x, y, 1) && !sobreEdificio(x, y)) kit.arbusto(x, y, r); });
        // árboles sueltos en banquetas
        calles.forEach(c => {
            if (!c.arbolesBanqueta) return;
            [1, -1].forEach(lado => {
                for (let s = 6 + (c.i * 5) % 9; s < c.linea.largo - 4; s += c.arbolesBanqueta + ((s * 7) % 9)) {
                    const p = puntoEn(c.linea, s), u = direccionEn(c.linea, s, 1);
                    const d = (c.mitad + c.banq - 0.6) * lado;
                    const x = p.x + u.y * d, y = p.y - u.x * d;
                    if (!lejosCaseta(x, y, 6) || sobreEdificio(x, y)) continue;
                    if (calles.some(o => o !== c && distanciaALinea(o.pts, x, y) < o.mitad + 1.5)) continue;
                    if ((s * 13 + lado * 5) % 10 < 4) kit.arbolJoven(x, y); else kit.arbol(x, y, 2.6 + (s % 5) * 0.2, 6 + (s % 3));
                }
            });
        });

        // ---------- Postes, luminarias y cables sobre la calle de la parada ----------
        const sPostes = F.postes || [-125, -90, -55, 16, 50, 85, 120];
        const postes = sPostes.map(s => {
            const p = N(s, (cr.mitad + 0.5));
            if (!lejosCaseta(p.x, p.y, 4.5)) return null;
            if (calles.some(o => o !== cr && distanciaALinea(o.pts, p.x, p.y) < o.mitad + 0.5)) return null;
            return kit.posteCFE(p.x, p.y, p.ang, s === sPostes[2]);
        }).filter(Boolean);
        if (postes.length > 1) kit.cables(postes);
        if (cr.cam) {
            for (let s = -110; s <= 110; s += 30) {
                const p = N(s, 0);
                if (calles.some(o => o !== cr && distanciaALinea(o.pts, p.x, p.y) < o.mitad + 2)) continue;
                kit.luminaria(p.x, p.y, p.ang + Math.PI / 2, true, 10);
            }
        }

        // ---------- Tráfico ----------
        const vehiculos = [];
        calles.filter(c => c.trafico !== false && c.material !== "terraceria").forEach((c, k) => {
            const m = marcoCalle(c.pts, puntoEn(c.linea, c.linea.largo / 2).x, puntoEn(c.linea, c.linea.largo / 2).y);
            const largo = c.linea.largo / 2 - 4;
            const carril = c.cam ? c.cam / 2 + c.ancho / 4 : Math.max(1.3, c.ancho / 4);
            const n = c === cr ? 2 : (c.ancho >= 9 ? 1 : 0);
            for (let j = 0; j < n; j++) {
                const sentido = j % 2 ? -1 : 1;
                vehiculos.push({ marco: m, d: carril * sentido, desde: sentido > 0 ? -largo : largo, hasta: sentido > 0 ? largo : -largo, ciclo: 16 + (k * 5 + j * 7) % 11, t: (k * 3 + j * 5) % 9, color: COLORES_AUTO[(k * 3 + j) % COLORES_AUTO.length] });
            }
        });
        vehiculos.forEach(v => { v.obj = kit.auto(0, 0, 0, v.color, v.tipo); });
        // con sentido inverso: el marco avanza en s y el auto mira al revés
        const trafico = crearTrafico(kit, vehiculos);
        const animarTrafico = dt => {
            trafico(dt);
            vehiculos.forEach(v => { if (v.hasta < v.desde) v.obj.rotation.z += Math.PI; });
        };

        // Autos estacionados junto a la banqueta
        const estacionados = [];
        calles.forEach(c => {
            if (!c.estacionados) return;
            (c.estacionados === true ? [1, -1] : [c.estacionados]).forEach(lado => {
                for (let s = 5; s < c.linea.largo - 5; s += 6.5) {
                    if ((s * 7 + c.i * 3 + (lado > 0 ? 1 : 0)) % 10 > 3) continue;
                    const p = puntoEn(c.linea, s), u = direccionEn(c.linea, s, 1);
                    const d = (c.mitad - 1.2) * lado;
                    const x = p.x + u.y * d, y = p.y - u.x * d;
                    if (!lejosCaseta(x, y, 14)) continue;
                    if (calles.some(o => o !== c && distanciaALinea(o.pts, x, y) < o.mitad + 4)) continue;
                    estacionados.push({ x, y, ang: Math.atan2(u.y, u.x) + (lado < 0 ? Math.PI : 0), color: COLORES_AUTO[Math.round(s) % COLORES_AUTO.length] });
                }
            });
        });
        kit.autosEstacionados(estacionados);

        // ---------- Revisión: que la parada no estorbe ----------
        // Edificios dentro de la franja de la parada y calles que cruzan cerca (esquinas).
        const revision = [];
        ocupados.forEach((o, k) => {
            const muestras = o.pts.concat([o.c]);
            for (let i = 0; i < o.pts.length; i++) { const a = o.pts[i], b = o.pts[(i + 1) % o.pts.length]; for (let t = 0.25; t < 1; t += 0.25) muestras.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }); }
            if (muestras.some(q => enParada(q.x, q.y))) revision.push(`edificio ${k} dentro de la franja de la parada`);
        });
        calles.forEach(o => {
            if (o === cr || (o.nombre && o.nombre === cr.nombre)) return;
            for (let s = zonaParada.s0 - 4; s <= zonaParada.s1 + 4; s += 1) {
                const p = N(s, orilla + 1);
                if (distanciaALinea(o.pts, p.x, p.y) < o.mitad + (o.banq || 0) + 1) { revision.push(`cruce con ${o.nombre || o.tipo || "calle"} a ${Math.round(s - sC)} m de la caseta`); break; }
            }
        });
        if (revision.length && typeof console !== "undefined") console.warn("[parada]", revision.join(" · "));

        // ---------- Nombres de calles y lugares ----------
        const abreviar = t => t.replace(/^Avenida /, "Av. ").replace(/^Calle /, "C. ").replace(/^Prolongación /, "Prol. ").replace(/^Andador /, "And. ").replace(/^Boulevard /, "Blvd. ").replace(/ Heroica Escuela Naval Militar/, " Heroica Esc. Naval Militar");
        const yaNombradas = new Set();
        const dentroLim = (x, y) => x > F.lim.minX + 8 && x < F.lim.maxX - 8 && y > F.lim.minY + 8 && y < F.lim.maxY - 8;
        const dCalle = c => distanciaALinea(c.pts, posCaseta.x, posCaseta.y);
        [cr].concat(calles.filter(c => c !== cr && c.nombre && dCalle(c) < 75).sort((a, b) => dCalle(a) - dCalle(b))).forEach(c => {
            if (rotulos.filter(r => r.tipo === "calle").length >= 4) return;
            if (!c.nombre || yaNombradas.has(abreviar(c.nombre)) || (F.sinNombre || []).includes(c.nombre)) return;
            let p = null;
            if (c === cr) p = N(sC - 20, 0);
            else {
                // el punto de la calle más cercano a la parada, recorrido 18 m para no tapar la esquina
                const s0 = distanciaMasCercana(c.linea, posCaseta.x, posCaseta.y);
                for (const ds of [18, -18, 35, -35, 0]) {
                    const s1 = Math.max(4, Math.min(c.linea.largo - 4, s0 + ds));
                    const q = puntoEn(c.linea, s1);
                    if (dentroLim(q.x, q.y) && Math.hypot(q.x - posCaseta.x, q.y - posCaseta.y) > 12) { p = q; break; }
                }
            }
            if (!p || !dentroLim(p.x, p.y) || Math.hypot(p.x - posCaseta.x, p.y - posCaseta.y) > 110) return;
            if (rotulos.some(r => r.tipo === "calle" && Math.hypot(r.x - p.x, r.y - p.y) < 20)) return;
            yaNombradas.add(abreviar(c.nombre));
            rotulos.push({ texto: abreviar(c.nombre), x: p.x, y: p.y, z: 2.2, tipo: "calle" });
        });
        (F.rotulos || []).forEach(([texto, x, y, z = 6]) => rotulos.push({ texto, x, y, z, tipo: "lugar" }));
        const rotulo = (texto, s, d, z = 6) => { const p = N(s, d); rotulos.push({ texto, x: p.x, y: p.y, z, tipo: "lugar" }); };

        // ---------- Detalles propios de la parada ----------
        const ctx = { rotulo, kit, THREE, M, P, N, porId, calles, posCaseta, rect, mat, caja, frenteHacia, enParada, zonaParada, sC, explanada, tramoRuta, sobreEdificio };
        const extraAnimar = F.extra ? F.extra(ctx) : null;

        const C = (s, d, z) => { const p = N((F.ruta.s || 0) + s, d); return new THREE.Vector3(p.x, p.y, z); };
        const carrilCombi = cr.cam ? cr.cam / 2 + cr.ancho / 2 - 1.8 : Math.max(1.5, cr.mitad - 1.9);
        // Vista inicial: la caseta en primer plano y, detrás, el lugar que da nombre a la parada
        // (F.foco, o el edificio con rótulo más cercano), para que se entienda dónde está.
        let inicio = { posicion: C(...(F.inicio || [-19, cr.mitad - 2.5, 7])), objetivo: C(...(F.objetivo || [1, dCaseta + 0.5, 1.3])) };
        const focoLugar = F.foco ? { x: F.foco[0], y: F.foco[1] }
            : rotulos.filter(r => r.tipo === "lugar").sort((a, b) => Math.hypot(a.x - posCaseta.x, a.y - posCaseta.y) - Math.hypot(b.x - posCaseta.x, b.y - posCaseta.y))[0];
        if (focoLugar && !F.inicio) {
            const vx = posCaseta.x - focoLugar.x, vy = posCaseta.y - focoLugar.y, L = Math.hypot(vx, vy) || 1;
            // de 3/4: se gira la dirección hacia atrás de la calle para ver la avenida
            const giro = F.giro == null ? 0.55 : F.giro;
            const t = direccionEn(marco.linea, marco.s0 + sC, 1);
            let ux = vx / L, uy = vy / L;
            const lado = Math.sign(uy * t.x - ux * t.y) || 1;
            const c = Math.cos(giro * lado), sn = Math.sin(giro * lado);
            [ux, uy] = [ux * c - uy * sn, ux * sn + uy * c];
            // se prueban giros y alturas hasta que ningún edificio tape la caseta
            const dist = F.distancia || 27;
            const enfoque = { x: posCaseta.x + (focoLugar.x - posCaseta.x) * 0.3, y: posCaseta.y + (focoLugar.y - posCaseta.y) * 0.3 };
            const tapada = (cx, cy, cz) => {
                for (let k = 1; k < 40; k++) {
                    const u = k / 40, x = cx + (posCaseta.x - cx) * u, y = cy + (posCaseta.y - cy) * u, z = cz + (1.5 - cz) * u;
                    if (ocupados.some(o => Math.hypot(o.c.x - x, o.c.y - y) < o.r * 2.2 + 2 && z < o.h && dentro(x, y, o.pts))) return true;
                }
                return false;
            };
            const v0 = [vx / L, vy / L];
            // (mejor si la cámara no queda encima de una azotea, que tapa media vista)
            let elegida = null;
            const sobreAzotea = (x, y) => ocupados.some(o => dentro(x, y, o.pts));
            for (const exigir of [true, false]) {
                for (const alto of F.alto ? [F.alto] : [16, 21, 27]) {
                    for (const dd of [dist, dist * 0.75, dist * 1.3]) {
                        for (const g of [giro, giro * 1.6, giro * 0.3, -giro, -giro * 1.6, giro * 2.2, -giro * 2.2]) {
                            const c = Math.cos(g * lado), sn = Math.sin(g * lado);
                            const ex = v0[0] * c - v0[1] * sn, ey = v0[0] * sn + v0[1] * c;
                            const cx = posCaseta.x + ex * dd, cy = posCaseta.y + ey * dd;
                            if (exigir && sobreAzotea(cx, cy)) continue;
                            if (!tapada(cx, cy, alto)) { elegida = [cx, cy, alto]; break; }
                        }
                        if (elegida) break;
                    }
                    if (elegida) break;
                }
                if (elegida) break;
            }
            if (!elegida) elegida = [posCaseta.x + ux * dist, posCaseta.y + uy * dist, 30];
            inicio = { posicion: new THREE.Vector3(...elegida), objetivo: new THREE.Vector3(enfoque.x, enfoque.y, 2) };
        }
        const vistas = F.vistas || {
            inicio,
            calle: { posicion: C(7, cr.mitad - 3.5, 1.65), objetivo: C(-1, dCaseta + 3, 2.2) },
            aerea: { posicion: C(-120, -150, 150), objetivo: C(0, 10, 0) }
        };
        return {
            grupo: kit.grupo,
            planos: kit.planos,
            lim: kit.lim,
            luces: kit.luces,
            caseta: { x: posCaseta.x, y: posCaseta.y, ang: posCaseta.ang + Math.PI },
            combi: { marco: { en: (s, d) => marco.en((F.ruta.s || 0) + s, d) }, carril: carrilCombi, parar: cr.mitad - 1.05, desde: -120, hasta: 120 },
            pasajeros: { marco: { en: (s, d) => marco.en((F.ruta.s || 0) + s, d) }, d: dCaseta - 0.4, puerta: cr.mitad + 0.4 },
            animar: dt => { animarTrafico(dt); if (extraAnimar) extraAnimar(dt); },
            vistas,
            entorno: F.entorno || [],
            rotulos,
            revision
        };
    }


    // ====================== De OpenStreetMap a ficha ======================
    // osm = { c: [[tipo, nombre, sentidoUnico, pts]], e: [[tipo, niveles, nombre, pts]],
    //         a: [[clase, nombre, pts]], t: [[x, y]], p: [[x, y, tipo, nombre]] }  (zonas-datos.js)
    const ANCHOS = {
        primary: [12, 7.6, 2.6], secondary: [11, 7.2, 2.4], tertiary: [10, 7, 2.2], primary_link: [6, 5, 1.2],
        secondary_link: [6, 5, 1.2], tertiary_link: [6, 5, 1.2], residential: [7, 5.6, 1.5], unclassified: [7, 5.6, 1.4],
        living_street: [5.4, 4.6, 1.1], service: [4.6, 4, 0], pedestrian: [3.2, 3.2, 0]
    }; // [doble sentido, un sentido, banqueta]

    const RELLENO = new Set(["primary", "secondary", "tertiary", "residential", "unclassified", "living_street"]);

    function fichaDesdeOSM(osm, cfg) {
        const d2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
        const pip = (x, y, pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
        const lotesEst = osm.a.filter(a => a[0] === "parking").map(a => a[2]);
        // 1) calles: unir tramos consecutivos de la misma vía
        let vias = osm.c.map(([tipo, nombre, uno, pts]) => ({ tipo, nombre, uno, pts: pts.slice() }));
        let unio = true;
        while (unio) {
            unio = false;
            for (let i = 0; i < vias.length && !unio; i++) for (let j = 0; j < vias.length && !unio; j++) {
                if (i === j) continue;
                const a = vias[i], b = vias[j];
                if (a.nombre !== b.nombre || a.tipo !== b.tipo || a.uno !== b.uno) continue;
                if (d2(a.pts[a.pts.length - 1], b.pts[0]) < 1) { a.pts = a.pts.concat(b.pts.slice(1)); vias.splice(j, 1); unio = true; }
            }
        }
        const omitir = cfg.omitir || [];
        vias = vias.filter(v => {
            if (!ANCHOS[v.tipo]) return false;
            if (omitir.some(o => o === v.nombre || (o.tipo && o.tipo === v.tipo && (!o.nombre || o.nombre === v.nombre)))) return false;
            // calles de servicio sin nombre dentro de estacionamientos: son pasillos
            if (v.tipo === "service" && !v.nombre) {
                const dentroLote = v.pts.filter(p => lotesEst.some(l => pip(p[0], p[1], l))).length;
                if (dentroLote >= v.pts.length / 2 || cfg.sinServicio) return false;
            }
            return true;
        });
        const divididas = cfg.divididas || {};
        const calles = vias.map((v, i) => {
            const w = ANCHOS[v.tipo];
            const div = divididas[v.nombre];
            const c = { id: "v" + i, nombre: v.nombre, tipo: v.tipo, pts: v.pts, ancho: v.uno ? w[1] : w[0], banqueta: w[2], estacionados: v.tipo === "residential" || v.tipo === "living_street" ? true : undefined, rayas: v.tipo !== "service" && v.tipo !== "living_street" && v.tipo !== "pedestrian" };
            if (v.tipo === "pedestrian") { c.material = "concreto"; c.trafico = false; }
            if (v.tipo === "service" || v.tipo === "living_street") c.trafico = false;
            if (div && v.uno) Object.assign(c, { rellenoLados: [1], camIzq: div.camellon / 2, tipoCamellon: div.tipo || "pasto", arbolesCamellon: div.arboles, palmasCamellon: div.palmas, colorArbol: div.colorArbol, guarnicion: div.guarnicion || "amarilla" }, div.calzada ? { ancho: div.calzada } : {}, div.banqueta != null ? { banqueta: div.banqueta } : {});
            const extra = (cfg.calles || {})[v.nombre];
            if (extra) Object.assign(c, extra);
            return c;
        });
        // 2) calle de la parada: la de ese nombre que deja el origen a su derecha y más cerca
        let mejor = null;
        calles.filter(c => c.nombre === cfg.ruta.nombre).forEach(c => {
            const L = prepararRuta(c.pts.map(p => ({ x: p[0], y: p[1] })));
            const s = distanciaMasCercana(L, 0, 0);
            const p = puntoEn(L, s), u = direccionEn(L, s, 1);
            const d = (0 - p.x) * u.y - (0 - p.y) * u.x; // > 0: el origen queda a la derecha
            const dist = Math.hypot(p.x, p.y);
            if ((cfg.ruta.izquierda ? d < 0 : d > -1) && (!mejor || dist < mejor.dist)) mejor = { c, dist };
        });
        if (!mejor) mejor = { c: calles.find(c => c.nombre === cfg.ruta.nombre) };
        mejor.c.id = "ruta";
        if (cfg.ruta.calle) Object.assign(mejor.c, cfg.ruta.calle);
        // árboles del camellón: sólo un sentido de cada avenida los planta (si no, salen dos hileras)
        Object.keys(divididas).forEach(nombre => {
            const sentidos = calles.filter(c => c.nombre === nombre && c.camIzq);
            const queda = sentidos.find(c => c.id === "ruta") || sentidos.sort((a, b) => prepararRuta(b.pts.map(p => ({ x: p[0], y: p[1] }))).largo - prepararRuta(a.pts.map(p => ({ x: p[0], y: p[1] }))).largo)[0];
            sentidos.forEach(c => { if (c !== queda) c.arbolesCamellon = 0; });
        });

        // 3) edificios
        const esp = cfg.especiales || [];
        const usados = new Set();
        const edificios = [];
        osm.e.forEach(([tipo, niv, nombre, pts], k) => {
            const area = Math.abs(pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);
            if (area < 18) return;
            const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
            const e = esp.find((x, i) => !usados.has(i) && ((x.nombre && x.nombre === nombre) || (x.en && pip(x.en[0], x.en[1], pts))));
            if (e) usados.add(esp.indexOf(e));
            if (e && e.quitar) return;
            const h = Math.abs(Math.round(cx * 7 + cy * 13)) % 100 / 100;
            let op;
            const pisos = niv ? Math.min(4, +niv) : null;
            if (tipo === "apartments" || tipo === "residential") op = { tipo: "comercio", alto: (pisos || 4) * 3, color: ["#e9dcc6", "#f0c99a", "#d9d4cb", "#efb08a"][Math.floor(h * 4)], vidrio: "#33424d", vanos: 0.55, colorPretil: "#b9b1a3" };
            else if (tipo === "school") op = { tipo: "comercio", alto: 6.6, color: "#f1ead8", vidrio: "#33424d", vanos: 0.6, colorPretil: "#7a2b2b" };
            else if (tipo === "industrial") op = { tipo: "nave", alto: 8, color: "#d9d6cf", colorPretil: "#9aa0a3" };
            else if (area > 900) op = { tipo: "comercio", alto: 8, color: "#ecebe5", colorPretil: "#b9b5ad", vanos: 0.12 };
            else if (area > 380) op = { pisos: pisos || 2, planta: ["cortina", "cortina", "puerta"], color: ["#ecebe5", "#f3e7d3", "#e9e1d0", "#d6e4ee"][Math.floor(h * 4)] };
            else op = pisos ? { pisos: Math.min(3, pisos) } : {};
            edificios.push({ pts, ...op, ...(e ? e.op || {} : {}) });
        });
        esp.filter((x, i) => !usados.has(i) && x.nuevo).forEach(x => edificios.push({ pts: x.nuevo, ...x.op }));

        // 4) lotes, áreas y árboles
        const lotes = [];
        const arboles = osm.t.map(([x, y]) => [x, y, 2.8 + (Math.abs(x * 3 + y) % 10) / 10, 6.5]);
        let semilla = 17;
        const azar = () => { semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646; };
        osm.a.forEach(([clase, nombre, pts]) => {
            const tipo = { parking: "estacionamiento", park: "pasto", grass: "pasto", garden: "pasto", village_green: "pasto", pitch: "cancha", playground: "tierra", swimming_pool: "agua", school: "tierra", kindergarten: "tierra", place_of_worship: "plaza", industrial: "terraceria", recreation_ground: "pasto" }[clase];
            if (!tipo) return;
            const sobre = (cfg.areas || {})[nombre || clase] || {};
            if (sobre.quitar) return;
            lotes.push({ pts, tipo: sobre.tipo || tipo, z: tipo === "agua" ? 0.09 : 0.02 + lotes.length * 0.002 });
            if (tipo === "pasto" && clase !== "grass" || sobre.arboles) {
                const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
                const area = Math.abs(pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);
                const n = Math.min(45, Math.floor(area / (sobre.densidad || 150)));
                for (let k = 0, intentos = 0; k < n && intentos < n * 8; intentos++) {
                    const x = Math.min(...xs) + azar() * (Math.max(...xs) - Math.min(...xs)), y = Math.min(...ys) + azar() * (Math.max(...ys) - Math.min(...ys));
                    if (pip(x, y, pts) && !calles.some(c => distanciaALinea(c.pts.map(p => ({ x: p[0], y: p[1] })), x, y) < c.ancho / 2 + 2)) { arboles.push([x, y, 2.8 + azar() * 1.6, 6 + azar() * 3]); k++; }
                }
            }
        });
        return { calles, edificios, lotes, arboles, lugares: osm.p || [] };
    }

    // Registra una parada armada con los datos de OpenStreetMap (zonas-datos.js) y su configuración.
    window.registrarZonaOSM = (id, cfg) => {
        window.Zonas3D = window.Zonas3D || {};
        window.Zonas3D[id] = THREE => {
            const osm = (window.ZONAS_OSM || {})[id];
            const base = fichaDesdeOSM(osm, cfg);
            const F = {
                lim: cfg.lim || { minX: -120, maxX: 120, minY: -110, maxY: 110 },
                suelo: cfg.suelo,
                calles: base.calles.concat(cfg.callesExtra || []),
                ruta: { calle: "ruta", s: cfg.ruta.s || 0, retiro: cfg.ruta.retiro, explanada: cfg.ruta.explanada },
                edificios: base.edificios.concat(cfg.edificiosExtra || []),
                lotes: (cfg.lotesAntes || []).concat(base.lotes, cfg.lotesExtra || []),
                arboles: base.arboles.concat(cfg.arboles || []),
                palmeras: cfg.palmeras, arbustos: cfg.arbustos, bardas: cfg.bardas,
                relleno: cfg.relleno === false ? null : {
                    frente: 7.5, fondo: 11, huecos: 0.06, ...(cfg.relleno || {}),
                    calles: base.calles.filter(c => RELLENO.has(c.tipo) && !(cfg.sinRelleno || []).includes(c.nombre)).map(c => c.id)
                },
                pisos2: cfg.pisos2, locales: cfg.locales, lugares: base.lugares,
                postes: cfg.postes, extra: cfg.extra, vistas: cfg.vistas, inicio: cfg.inicio, entorno: cfg.entorno,
                rotulos: cfg.rotulos, sinNombre: cfg.sinNombre, objetivo: cfg.objetivo, foco: cfg.foco, giro: cfg.giro, distancia: cfg.distancia, alto: cfg.alto
            };
            return zonaCiudad(THREE, F);
        };
    };

    window.ZonasParadas = { zonaCiudad, fichas: {} };
    // Las fichas (zonas-fichas.js) se registran con: ZonasParadas.fichas.C = {...}
    window.registrarZonaParada = (id, ficha) => {
        window.ZonasParadas.fichas[id] = ficha;
        if (window.Zonas3D) window.Zonas3D[id] = THREE => zonaCiudad(THREE, ficha);
    };
})();
