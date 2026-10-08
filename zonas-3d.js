// Maquetas 3D detalladas de los alrededores de cada parada.
//
// Hechas a mano a partir de Google Street View (fachadas, colores, mobiliario)
// y OpenStreetMap (trazo de calles y contorno de edificios). Proporciones
// aproximadas. Coordenadas en metros: x = este, y = norte, z = arriba,
// con el origen en el punto exacto de la parada.
//
// La caseta se coloca aparte (visor-3d.js) para poder cambiarla por el diseño final.

(function () {
    // ====================== Kit de construcción ======================

    function crearKit(THREE, lim) {
        const planos = [
            new THREE.Plane(new THREE.Vector3(-1, 0, 0), lim.maxX),
            new THREE.Plane(new THREE.Vector3(1, 0, 0), -lim.minX),
            new THREE.Plane(new THREE.Vector3(0, -1, 0), lim.maxY),
            new THREE.Plane(new THREE.Vector3(0, 1, 0), -lim.minY)
        ];
        const grupo = new THREE.Group();
        const luces = []; // materiales que se encienden de noche
        const cacheMat = new Map();
        const cacheTex = new Map();

        const mat = (color, extra = {}) => {
            const clave = (typeof color === "number" ? color : String(color)) + JSON.stringify(Object.keys(extra).map(k => [k, extra[k] && extra[k].uuid ? extra[k].uuid : extra[k]]));
            if (!cacheMat.has(clave)) {
                cacheMat.set(clave, new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0, clippingPlanes: planos, ...extra }));
            }
            return cacheMat.get(clave);
        };

        // ---------- Texturas dibujadas en canvas ----------
        function lienzo(w, h, dibujar) {
            const c = document.createElement("canvas");
            c.width = w; c.height = h;
            dibujar(c.getContext("2d"), w, h);
            const t = new THREE.CanvasTexture(c);
            t.colorSpace = THREE.SRGBColorSpace;
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            t.anisotropy = 8;
            return t;
        }
        function ruido(g, w, h, n, colores, tam = 2) {
            for (let i = 0; i < n; i++) {
                g.fillStyle = colores[(Math.random() * colores.length) | 0];
                g.fillRect(Math.random() * w, Math.random() * h, tam, tam);
            }
        }
        const tex = (clave, crear) => {
            if (!cacheTex.has(clave)) cacheTex.set(clave, crear());
            return cacheTex.get(clave);
        };

        const texAsfalto = () => tex("asfalto", () => lienzo(256, 256, (g, w, h) => {
            g.fillStyle = "#5a5e63"; g.fillRect(0, 0, w, h);
            ruido(g, w, h, 5000, ["#4f5357", "#64686c", "#575b60", "#6c7074"], 2);
            ruido(g, w, h, 300, ["#45494d", "#73777b"], 3);
        }));
        const texBanqueta = (base = "#cdc8bd") => tex("banqueta" + base, () => lienzo(256, 256, (g, w, h) => {
            g.fillStyle = base; g.fillRect(0, 0, w, h);
            ruido(g, w, h, 2500, ["rgba(0,0,0,.05)", "rgba(255,255,255,.08)"], 2);
            g.strokeStyle = "rgba(90,85,75,.35)"; g.lineWidth = 2;
            for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(i * w / 2, 0); g.lineTo(i * w / 2, h); g.stroke(); g.beginPath(); g.moveTo(0, i * h / 2); g.lineTo(w, i * h / 2); g.stroke(); }
        }));
        const texTierra = () => tex("tierra", () => lienzo(256, 256, (g, w, h) => {
            g.fillStyle = "#cbbf9f"; g.fillRect(0, 0, w, h);
            ruido(g, w, h, 4000, ["#bfb290", "#d6cbad", "#b6a985", "#9fae78"], 3);
        }));
        const texPasto = () => tex("pasto", () => lienzo(256, 256, (g, w, h) => {
            g.fillStyle = "#7fab55"; g.fillRect(0, 0, w, h);
            ruido(g, w, h, 6000, ["#729f4b", "#8cb862", "#6a9444", "#93bd68"], 3);
        }));
        const texTecho = () => tex("techo", () => lienzo(128, 128, (g, w, h) => {
            g.fillStyle = "#d8d4cb"; g.fillRect(0, 0, w, h);
            ruido(g, w, h, 1200, ["#cbc6bc", "#e2ded6", "#c2bdb2"], 2);
        }));

        // Fachada repetible: un módulo de 4 m de ancho por 3.2 m de alto (un piso).
        const texFachada = (muro, opciones = {}) => tex("fachada" + muro + JSON.stringify(opciones), () => lienzo(256, 205, (g, w, h) => {
            g.fillStyle = muro; g.fillRect(0, 0, w, h);
            ruido(g, w, h, 900, ["rgba(0,0,0,.035)", "rgba(255,255,255,.06)"], 2);
            const marco = opciones.marco || "#f2efe8";
            const vidrio = opciones.vidrio || "#33424d";
            // ventana (abajo del módulo: el piso empieza abajo)
            const vw = w * (opciones.ancho || 0.38), vh = h * 0.42;
            const vx = (w - vw) / 2, vy = h * 0.22;
            g.fillStyle = marco; g.fillRect(vx - 5, h - vy - vh - 5, vw + 10, vh + 10);
            g.fillStyle = vidrio; g.fillRect(vx, h - vy - vh, vw, vh);
            g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(vx, h - vy - vh, vw * 0.45, vh);
            g.strokeStyle = marco; g.lineWidth = 3;
            g.beginPath(); g.moveTo(vx + vw / 2, h - vy - vh); g.lineTo(vx + vw / 2, h - vy); g.stroke();
            if (opciones.herreria) {
                g.strokeStyle = "rgba(30,30,30,.55)"; g.lineWidth = 2;
                for (let i = 1; i < 6; i++) { const x = vx + (vw * i) / 6; g.beginPath(); g.moveTo(x, h - vy - vh); g.lineTo(x, h - vy); g.stroke(); }
            }
            // franja inferior (rodapié)
            g.fillStyle = opciones.rodapie || "rgba(0,0,0,.08)"; g.fillRect(0, h - 10, w, 10);
        }));

        // Frente de local comercial: cortinas metálicas y un acceso.
        const texLocal = (muro, cortina = "#9aa1a6") => tex("local" + muro + cortina, () => lienzo(512, 205, (g, w, h) => {
            g.fillStyle = muro; g.fillRect(0, 0, w, h);
            const pintaCortina = (x, ancho) => {
                g.fillStyle = cortina; g.fillRect(x, h * 0.22, ancho, h * 0.78);
                g.strokeStyle = "rgba(0,0,0,.18)"; g.lineWidth = 2;
                for (let y = h * 0.24; y < h; y += 7) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + ancho, y); g.stroke(); }
            };
            pintaCortina(w * 0.06, w * 0.38);
            pintaCortina(w * 0.56, w * 0.38);
        }));

        // ---------- Geometría base ----------
        const normalDerecha = (a, b) => {
            const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
            return { x: dy / L, y: -dx / L };
        };
        // Desplaza una polilínea "d" metros a su derecha (negativo = izquierda).
        function desplazar(pts, d) {
            return pts.map((p, i) => {
                const n0 = i > 0 ? normalDerecha(pts[i - 1], p) : null;
                const n1 = i < pts.length - 1 ? normalDerecha(p, pts[i + 1]) : null;
                let n = n0 && n1 ? { x: n0.x + n1.x, y: n0.y + n1.y } : (n0 || n1);
                const L = Math.hypot(n.x, n.y) || 1;
                n = { x: n.x / L, y: n.y / L };
                const ref = n1 || n0;
                const esc = d / Math.max(0.5, n.x * ref.x + n.y * ref.y);
                return { x: p.x + n.x * esc, y: p.y + n.y * esc };
            });
        }
        // Tramo de una polilínea (monótona en x) entre dos valores de x.
        function cortarX(pts, xa, xb) {
            const lo = Math.min(xa, xb), hi = Math.max(xa, xb);
            const salida = [];
            const push = p => {
                const u = salida[salida.length - 1];
                if (!u || Math.hypot(u.x - p.x, u.y - p.y) > 0.01) salida.push(p);
            };
            for (let i = 1; i < pts.length; i++) {
                const a = pts[i - 1], b = pts[i];
                const dx = b.x - a.x;
                let t0 = 0, t1 = 1;
                if (Math.abs(dx) < 1e-9) {
                    if (a.x < lo || a.x > hi) continue;
                } else {
                    const ta = (lo - a.x) / dx, tb = (hi - a.x) / dx;
                    t0 = Math.max(0, Math.min(ta, tb));
                    t1 = Math.min(1, Math.max(ta, tb));
                    if (t0 > t1) continue;
                }
                push({ x: a.x + dx * t0, y: a.y + (b.y - a.y) * t0 });
                push({ x: a.x + dx * t1, y: a.y + (b.y - a.y) * t1 });
            }
            return salida;
        }
        const P = arr => arr.map(([x, y]) => ({ x, y }));

        function geometriaDe(pos, uvs, normalArriba) {
            const geo = new THREE.BufferGeometry();
            geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
            if (uvs) geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
            if (normalArriba) {
                const n = new Float32Array(pos.length);
                for (let i = 2; i < n.length; i += 3) n[i] = 1;
                geo.setAttribute("normal", new THREE.BufferAttribute(n, 3));
            } else geo.computeVertexNormals();
            return geo;
        }

        // Superficie plana entre dos desplazamientos de una línea (calles, carriles, franjas).
        function cinta(pts, dA, dB, z, material, tile = 4) {
            if (pts.length < 2) return null;
            const A = desplazar(pts, dA), B = desplazar(pts, dB);
            const pos = [], uv = [];
            let s = 0;
            const vert = (p, u, v) => { pos.push(p.x, p.y, z); uv.push(u / tile, v / tile); };
            for (let i = 1; i < pts.length; i++) {
                const L = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
                const a0 = A[i - 1], a1 = A[i], b0 = B[i - 1], b1 = B[i];
                const quad = [[a0, s, dA], [b0, s, dB], [b1, s + L, dB], [a1, s + L, dA]];
                // Orden antihorario visto desde arriba.
                const area = (b0.x - a0.x) * (b1.y - a0.y) - (b0.y - a0.y) * (b1.x - a0.x);
                const orden = area >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
                orden.forEach(k => vert(quad[k][0], quad[k][1], quad[k][2]));
                s += L;
            }
            const m = new THREE.Mesh(geometriaDe(pos, uv, true), material);
            m.receiveShadow = true;
            grupo.add(m);
            return m;
        }

        // Franja elevada con sus bordes verticales (banquetas, guarniciones, camellones, bardas).
        function franja(pts, dA, dB, z0, z1, matArriba, matLado, tile = 4) {
            if (pts.length < 2) return;
            cinta(pts, dA, dB, z1, matArriba, tile);
            const pos = [];
            [dA, dB].forEach(d => {
                const L = desplazar(pts, d);
                for (let i = 1; i < L.length; i++) {
                    const a = L[i - 1], b = L[i];
                    pos.push(a.x, a.y, z0, b.x, b.y, z0, b.x, b.y, z1, a.x, a.y, z0, b.x, b.y, z1, a.x, a.y, z1);
                }
                // tapas en los extremos
            });
            const A = desplazar(pts, dA), B = desplazar(pts, dB);
            [[A[0], B[0]], [A[A.length - 1], B[B.length - 1]]].forEach(([a, b]) => {
                pos.push(a.x, a.y, z0, b.x, b.y, z0, b.x, b.y, z1, a.x, a.y, z0, b.x, b.y, z1, a.x, a.y, z1);
            });
            const lado = matLado || matArriba;
            const m = new THREE.Mesh(geometriaDe(pos), lado.side === THREE.DoubleSide ? lado : ladoDoble(lado));
            m.castShadow = z1 - z0 > 0.5;
            m.receiveShadow = true;
            grupo.add(m);
        }
        const ladosDobles = new Map();
        function ladoDoble(m) {
            if (!ladosDobles.has(m)) {
                const c = m.clone();
                c.side = THREE.DoubleSide;
                ladosDobles.set(m, c);
            }
            return ladosDobles.get(m);
        }

        // Rayas punteadas a lo largo de una línea.
        function punteada(pts, d, z, largo, hueco, ancho, material) {
            const r = prepararRuta(pts);
            for (let s = hueco / 2; s < r.largo - largo; s += largo + hueco) {
                const tramo = [];
                for (let k = 0; k <= 2; k++) tramo.push(puntoEn(r, s + (largo * k) / 2));
                cinta(tramo, d - ancho / 2, d + ancho / 2, z, material, 2);
            }
        }

        // Polígono plano (terrenos, estacionamientos, albercas).
        function poligono(pts, z, material, tile = 6) {
            const forma = new THREE.Shape(pts.map(p => new THREE.Vector2(p.x, p.y)));
            const geo = new THREE.ShapeGeometry(forma);
            const uv = geo.attributes.uv;
            for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / tile, uv.getY(i) / tile);
            const m = new THREE.Mesh(geo, material);
            m.position.z = z;
            m.receiveShadow = true;
            grupo.add(m);
            return m;
        }

        // Caja orientada: centro (x, y), ancho a lo largo del ángulo, fondo perpendicular.
        function caja(ancho, fondo, alto, x, y, z, ang, material, sombra = true) {
            const m = new THREE.Mesh(new THREE.BoxGeometry(ancho, fondo, alto), material);
            m.position.set(x, y, z + alto / 2);
            m.rotation.z = ang || 0;
            m.castShadow = sombra;
            m.receiveShadow = true;
            grupo.add(m);
            return m;
        }

        function cilindro(r0, r1, alto, x, y, z, material, lados = 12) {
            const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, alto, lados).rotateX(Math.PI / 2), material);
            m.position.set(x, y, z + alto / 2);
            m.castShadow = true;
            grupo.add(m);
            return m;
        }

        // Edificio a partir de su contorno, con fachada texturizada por pisos.
        function edificio(pts, alto, muro, opciones = {}) {
            const anillo = pts.slice();
            const u = anillo[anillo.length - 1];
            if (Math.hypot(u.x - anillo[0].x, u.y - anillo[0].y) < 0.05) anillo.pop();
            if (anillo.length < 3) return null;
            const geo = new THREE.ExtrudeGeometry(new THREE.Shape(anillo.map(p => new THREE.Vector2(p.x, p.y))), { depth: alto, bevelEnabled: false });
            const tf = texFachada(muro, opciones).clone();
            tf.needsUpdate = true;
            tf.repeat.set(1 / 4, -1 / 3.2);
            tf.offset.set(0, 1 / 3.2 * 0);
            const tt = texTecho().clone();
            tt.needsUpdate = true;
            tt.repeat.set(1 / 6, 1 / 6);
            const m = new THREE.Mesh(geo, [mat(0xffffff, { map: tt, roughness: 0.95 }), mat(0xffffff, { map: tf })]);
            m.castShadow = true;
            m.receiveShadow = true;
            grupo.add(m);
            // pretil
            if (opciones.pretil !== false) {
                const borde = desplazarCerrado(anillo, -0.18);
                const pos = [];
                for (let i = 0; i < anillo.length; i++) {
                    const a = anillo[i], b = anillo[(i + 1) % anillo.length];
                    pos.push(a.x, a.y, alto, b.x, b.y, alto, b.x, b.y, alto + 0.6, a.x, a.y, alto, b.x, b.y, alto + 0.6, a.x, a.y, alto + 0.6);
                    const c = borde[i], d = borde[(i + 1) % borde.length];
                    pos.push(c.x, c.y, alto, d.x, d.y, alto, d.x, d.y, alto + 0.6, c.x, c.y, alto, d.x, d.y, alto + 0.6, c.x, c.y, alto + 0.6);
                    pos.push(a.x, a.y, alto + 0.6, b.x, b.y, alto + 0.6, d.x, d.y, alto + 0.6, a.x, a.y, alto + 0.6, d.x, d.y, alto + 0.6, c.x, c.y, alto + 0.6);
                }
                const pm = new THREE.Mesh(geometriaDe(pos), ladoDoble(mat(opciones.colorPretil || muro)));
                pm.castShadow = true;
                grupo.add(pm);
            }
            // tinacos
            if (opciones.tinacos) {
                const c = centro(anillo);
                for (let i = 0; i < opciones.tinacos; i++) tinaco(c.x + (i - (opciones.tinacos - 1) / 2) * 1.5, c.y + 1.2, alto);
            }
            return m;
        }

        function desplazarCerrado(anillo, d) {
            // Desplaza un polígono cerrado hacia dentro (d < 0 con orientación antihoraria).
            const area = areaPoligono(anillo);
            const signo = area > 0 ? -1 : 1;
            const cerrado = [anillo[anillo.length - 1], ...anillo, anillo[0]];
            return desplazar(cerrado, d * signo).slice(1, -1);
        }

        // Frente comercial sobre el lado del edificio más cercano a una calle.
        function frenteComercial(pts, calle, alto, muro, toldo, letrero) {
            const anillo = pts.slice();
            const u = anillo[anillo.length - 1];
            if (Math.hypot(u.x - anillo[0].x, u.y - anillo[0].y) < 0.05) anillo.pop();
            let mejor = null;
            for (let i = 0; i < anillo.length; i++) {
                const a = anillo[i], b = anillo[(i + 1) % anillo.length];
                const L = Math.hypot(b.x - a.x, b.y - a.y);
                if (L < 4) continue;
                const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
                const d = distanciaALinea(calle, m.x, m.y);
                if (!mejor || d < mejor.d) mejor = { a, b, L, m, d };
            }
            if (!mejor) return;
            const { a, b, L, m } = mejor;
            let ang = Math.atan2(b.y - a.y, b.x - a.x);
            // normal hacia afuera = hacia la calle
            let n = { x: Math.cos(ang - Math.PI / 2), y: Math.sin(ang - Math.PI / 2) };
            const c = centro(anillo);
            if ((m.x - c.x) * n.x + (m.y - c.y) * n.y < 0) n = { x: -n.x, y: -n.y };
            const angFrente = Math.atan2(n.y, n.x) - Math.PI / 2;
            const tl = texLocal(muro).clone();
            tl.needsUpdate = true;
            const plano = new THREE.Mesh(new THREE.PlaneGeometry(L - 0.4, 2.9).rotateX(Math.PI / 2), mat(0xffffff, { map: tl }));
            plano.position.set(m.x + n.x * 0.03, m.y + n.y * 0.03, 1.45);
            plano.rotation.z = angFrente + Math.PI;
            grupo.add(plano);
            if (toldo) {
                const t = caja(L - 0.6, 1.4, 0.08, m.x + n.x * 0.75, m.y + n.y * 0.75, 2.85, angFrente, mat(toldo, { roughness: 0.6 }));
                t.rotation.x = 0;
                t.rotateOnAxis(new THREE.Vector3(1, 0, 0), 0.18);
            }
            if (letrero) {
                caja(Math.min(L - 1, 6), 0.15, 0.9, m.x + n.x * 0.12, m.y + n.y * 0.12, Math.max(3.05, alto - 1.1), angFrente, mat(letrero, { roughness: 0.5 }));
            }
        }

        // ---------- Vegetación ----------
        // Copas orgánicas: esferas deformadas con ruido, sombreado suave y color por
        // vértice (más oscuro abajo y adentro, como la sombra propia del follaje).
        const verdes = [0x4f7f37, 0x5b8c3f, 0x466f31, 0x6a9a48, 0x3f6a2c];
        let semillaVeg = 1;
        const azarVeg = () => { semillaVeg = (semillaVeg * 16807) % 2147483647; return (semillaVeg - 1) / 2147483646; };
        const matFollaje = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, clippingPlanes: planos });
        const matCorteza = new THREE.MeshStandardMaterial({ color: 0x6b5a48, roughness: 1, clippingPlanes: planos });
        function copaGeo(r, color, aplanar = 0.8) {
            const g = new THREE.SphereGeometry(r, 18, 12);
            const pos = g.attributes.position;
            const base = new THREE.Color(color);
            const col = [];
            const k1 = azarVeg() * 10, k2 = azarVeg() * 10;
            const c = new THREE.Color();
            for (let i = 0; i < pos.count; i++) {
                const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
                const nx = x / r, ny = y / r, nz = z / r;
                const n = Math.sin(nx * 4.1 + k1) * Math.sin(ny * 3.7 + k2) * Math.sin(nz * 4.6 + k1 * 0.5) * 0.55
                    + Math.sin(nx * 9.3 + k2) * Math.sin(ny * 8.1 + k1) * 0.18;
                const esc = 1 + n * 0.22;
                pos.setXYZ(i, x * esc, y * esc, z * esc * (z < 0 ? aplanar * 0.75 : aplanar));
                const luz = 0.5 + 0.5 * (nz * 0.5 + 0.5) + n * 0.25;
                c.copy(base).multiplyScalar(Math.max(0.35, Math.min(1.25, luz)));
                c.offsetHSL((azarVeg() - 0.5) * 0.015, 0, (azarVeg() - 0.5) * 0.04);
                col.push(c.r, c.g, c.b);
            }
            g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
            g.computeVertexNormals();
            return g;
        }
        function tronco(x, y, z0, largo, r0, r1, inclX = 0, inclY = 0) {
            const g = new THREE.CylinderGeometry(r1, r0, largo, 9, 1).rotateX(Math.PI / 2).translate(0, 0, largo / 2);
            const m = new THREE.Mesh(g, matCorteza);
            m.position.set(x, y, z0);
            m.rotation.set(inclY, -inclX, 0);
            m.castShadow = true;
            grupo.add(m);
            return m;
        }
        // Árbol de sombra (mango, almendro, parota): tronco, ramas y copa ancha.
        function arbol(x, y, r = 3.2, alto = 6, opciones = {}) {
            semillaVeg = Math.abs(Math.round(x * 131 + y * 71)) % 2147483646 + 1;
            const color = opciones.color || verdes[Math.floor(azarVeg() * verdes.length)];
            const hTronco = alto * 0.42;
            tronco(x, y, 0, hTronco + 0.3, 0.13 * r / 3 + 0.12, 0.09 * r / 3 + 0.07);
            if (opciones.troncoBlanco) {
                const cal = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * r / 3 + 0.14, 0.21 * r / 3 + 0.15, 1.1, 10).rotateX(Math.PI / 2), mat(0xf1efe8));
                cal.position.set(x, y, 0.55);
                grupo.add(cal);
            }
            const ramas = 3 + Math.floor(azarVeg() * 2);
            for (let i = 0; i < ramas; i++) {
                const a = (i / ramas) * Math.PI * 2 + azarVeg();
                tronco(x, y, hTronco * 0.85, r * 0.75, 0.09, 0.05, Math.cos(a) * 0.75, Math.sin(a) * 0.75);
            }
            const n = opciones.copas || 5;
            const zc = hTronco + r * 0.55;
            for (let i = 0; i < n; i++) {
                const a = (i / n) * Math.PI * 2 + azarVeg() * 0.8;
                const rr = r * (0.5 + azarVeg() * 0.22);
                const m = new THREE.Mesh(copaGeo(rr, color), matFollaje);
                m.position.set(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, zc + (azarVeg() - 0.3) * r * 0.35);
                m.rotation.z = azarVeg() * 6;
                m.castShadow = true;
                m.receiveShadow = true;
                grupo.add(m);
            }
            const top = new THREE.Mesh(copaGeo(r * 0.72, color), matFollaje);
            top.position.set(x, y, zc + r * 0.42);
            top.castShadow = true;
            top.receiveShadow = true;
            grupo.add(top);
        }
        function arbolJoven(x, y) {
            semillaVeg = Math.abs(Math.round(x * 97 + y * 53)) % 2147483646 + 1;
            tronco(x, y, 0, 2.5, 0.07, 0.05);
            const m = new THREE.Mesh(copaGeo(1.05, 0x6f9e4a, 1.1), matFollaje);
            m.position.set(x, y, 3.0);
            m.castShadow = true;
            grupo.add(m);
            // tutor de madera
            caja(0.05, 0.05, 1.6, x + 0.25, y, 0, 0, mat(0x9c8463), false);
        }
        // Palmera de coco: tronco curvo con anillos y hojas pinnadas que cuelgan.
        const texHojaPalma = () => tex("hojaPalma", () => {
            const t = lienzo(64, 256, (g, w, h) => {
                g.clearRect(0, 0, w, h);
                g.strokeStyle = "#6f8f3a"; g.lineWidth = 3;
                g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
                for (let yy = 6; yy < h - 4; yy += 5) {
                    const l = (w / 2 - 2) * Math.sin((yy / h) * Math.PI) * 0.95 + 4;
                    g.strokeStyle = yy % 3 ? "#4e7f33" : "#5f9140";
                    g.lineWidth = 2.2;
                    g.beginPath(); g.moveTo(w / 2, yy); g.lineTo(w / 2 - l, yy + 9); g.stroke();
                    g.beginPath(); g.moveTo(w / 2, yy); g.lineTo(w / 2 + l, yy + 9); g.stroke();
                }
            });
            t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
            return t;
        });
        const texTroncoPalma = () => tex("troncoPalma", () => lienzo(32, 128, (g, w, h) => {
            g.fillStyle = "#8a7a62"; g.fillRect(0, 0, w, h);
            for (let yy = 0; yy < h; yy += 6) { g.fillStyle = "rgba(60,48,35,.45)"; g.fillRect(0, yy, w, 2); }
            ruido(g, w, h, 300, ["rgba(0,0,0,.1)", "rgba(255,255,255,.08)"], 2);
        }));
        function palmera(x, y, alto = 9, inclinacion = 0.05) {
            semillaVeg = Math.abs(Math.round(x * 61 + y * 29)) % 2147483646 + 1;
            const dir = azarVeg() * Math.PI * 2;
            const curva = new THREE.CatmullRomCurve3([
                new THREE.Vector3(x, y, 0),
                new THREE.Vector3(x + Math.cos(dir) * alto * inclinacion * 0.6, y + Math.sin(dir) * alto * inclinacion * 0.6, alto * 0.45),
                new THREE.Vector3(x + Math.cos(dir) * alto * inclinacion * 1.8, y + Math.sin(dir) * alto * inclinacion * 1.8, alto)
            ]);
            const tt = texTroncoPalma().clone(); tt.needsUpdate = true; tt.repeat.set(1, alto / 2);
            const tr = new THREE.Mesh(new THREE.TubeGeometry(curva, 12, 0.2, 8), mat(0xffffff, { map: tt, roughness: 1 }));
            tr.castShadow = true;
            grupo.add(tr);
            const cima = curva.getPoint(1);
            const hoja = mat(0xffffff, { map: texHojaPalma(), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.8 });
            const n = 12;
            for (let i = 0; i < n; i++) {
                const a = (i / n) * Math.PI * 2 + azarVeg() * 0.4;
                const largo = 3.6 + azarVeg() * 1.3;
                const caida = 0.5 + azarVeg() * 0.7 + (i % 3) * 0.15;
                const g = new THREE.PlaneGeometry(1.25, largo, 1, 8);
                const p = g.attributes.position;
                for (let k = 0; k < p.count; k++) {
                    const v = (p.getY(k) + largo / 2) / largo; // 0 base, 1 punta
                    const ang = v * caida * 1.6;
                    const rx = Math.sin(ang) * largo * v * 0.62;
                    const rz = Math.cos(ang) * largo * v * 0.62 - v * v * caida * 1.4;
                    p.setXYZ(k, p.getX(k) * (1 - v * 0.35), rx + 0.15, rz);
                }
                g.computeVertexNormals();
                const m = new THREE.Mesh(g, hoja);
                m.position.copy(cima);
                m.rotation.z = a;
                m.castShadow = true;
                grupo.add(m);
            }
            const cocos = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), mat(0x6f6232));
            cocos.position.set(cima.x, cima.y, cima.z - 0.35);
            grupo.add(cocos);
        }
        function arbusto(x, y, r = 0.8, color = 0x557f3d) {
            semillaVeg = Math.abs(Math.round(x * 37 + y * 17)) % 2147483646 + 1;
            const m = new THREE.Mesh(copaGeo(r, color, 0.75), matFollaje);
            m.position.set(x, y, r * 0.5);
            m.castShadow = true;
            m.receiveShadow = true;
            grupo.add(m);
            return m;
        }
        // Pasto alto y maleza en los terrenos baldíos
        function maleza(x, y, r = 1.2) {
            semillaVeg = Math.abs(Math.round(x * 43 + y * 89)) % 2147483646 + 1;
            const m = new THREE.Mesh(copaGeo(r, 0x7a9a4a, 0.45), matFollaje);
            m.position.set(x, y, r * 0.18);
            m.receiveShadow = true;
            grupo.add(m);
            return m;
        }

        // ---------- Mobiliario ----------
        const gris = () => mat(0x8f969c, { metalness: 0.4, roughness: 0.5 });
        const luzLampara = new THREE.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffd98a, emissiveIntensity: 0.15, clippingPlanes: planos });
        luces.push(luzLampara);
        function luminaria(x, y, ang, dobles = true, alto = 10) {
            cilindro(0.09, 0.14, alto, x, y, 0, gris(), 10);
            // base con franjas amarillas y negras
            for (let i = 0; i < 4; i++) cilindro(0.16, 0.16, 0.3, x, y, i * 0.3, mat(i % 2 ? 0x1e1e1e : 0xf2c200), 10);
            const brazos = dobles ? [ang, ang + Math.PI] : [ang];
            brazos.forEach(a => {
                const bx = x + Math.cos(a) * 1.1, by = y + Math.sin(a) * 1.1;
                caja(2.2, 0.08, 0.08, bx, by, alto - 0.1, a, gris(), false);
                const hx = x + Math.cos(a) * 2.2, hy = y + Math.sin(a) * 2.2;
                caja(0.75, 0.32, 0.14, hx, hy, alto - 0.22, a, mat(0x5b6168, { metalness: 0.4 }));
                caja(0.6, 0.26, 0.02, hx, hy, alto - 0.24, a, luzLampara, false);
            });
        }
        function luminariaEstacionamiento(x, y, ang) {
            cilindro(0.1, 0.16, 12, x, y, 0, gris(), 10);
            cilindro(0.35, 0.35, 0.8, x, y, 0, mat(0xc9c4b8), 12);
            caja(2.6, 0.1, 0.1, x, y, 11.9, ang, gris(), false);
            [-1.2, 1.2].forEach(o => {
                const hx = x + Math.cos(ang) * o, hy = y + Math.sin(ang) * o;
                caja(0.7, 0.45, 0.18, hx, hy, 11.75, ang, mat(0x5b6168, { metalness: 0.4 }));
                caja(0.6, 0.38, 0.02, hx, hy, 11.73, ang, luzLampara, false);
            });
        }
        // Poste de concreto de la CFE; regresa los puntos de amarre de los cables.
        function posteCFE(x, y, angCables, transformador = false) {
            cilindro(0.15, 0.24, 10.5, x, y, 0, mat(0xb9b4aa, { roughness: 0.95 }), 10);
            const perp = angCables + Math.PI / 2;
            caja(2.4, 0.12, 0.12, x, y, 9.4, perp, mat(0x7c7c7c), false);
            caja(1.6, 0.1, 0.1, x, y, 8.4, perp, mat(0x7c7c7c), false);
            const puntos = [-1.1, 0, 1.1].map(o => ({ x: x + Math.cos(perp) * o, y: y + Math.sin(perp) * o, z: 9.6 }));
            puntos.push({ x, y, z: 8.5 });
            if (transformador) {
                cilindro(0.38, 0.38, 1.1, x + Math.cos(perp) * 0.45, y + Math.sin(perp) * 0.45, 6.6, mat(0x7d858b, { metalness: 0.3 }), 12);
            }
            return puntos;
        }
        const matCable = new THREE.LineBasicMaterial({ color: 0x202326, clippingPlanes: planos });
        function cables(postes) {
            for (let i = 1; i < postes.length; i++) {
                postes[i].forEach((b, k) => {
                    const a = postes[i - 1][k];
                    if (!a) return;
                    const pts = [];
                    for (let j = 0; j <= 12; j++) {
                        const t = j / 12;
                        pts.push(new THREE.Vector3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t - Math.sin(Math.PI * t) * 0.45));
                    }
                    grupo.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), matCable));
                });
            }
        }
        function bolardo(x, y, color) {
            cilindro(0.09, 0.09, 1.0, x, y, 0.15, mat(color, { roughness: 0.5 }), 10);
            const t = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2), mat(color, { roughness: 0.5 }));
            t.position.set(x, y, 1.15);
            grupo.add(t);
        }
        function tinaco(x, y, z) {
            cilindro(0.55, 0.55, 1.25, x, y, z, mat(0x1f2224, { roughness: 0.6 }), 16);
            cilindro(0.3, 0.3, 0.12, x, y, z + 1.25, mat(0x2a2d30), 12);
        }
        function senalPreventiva(x, y, ang) {
            cilindro(0.04, 0.04, 2.6, x, y, 0, gris(), 6);
            const t = lienzo(128, 128, (g, w, h) => {
                g.fillStyle = "#111"; g.save(); g.translate(w / 2, h / 2); g.rotate(Math.PI / 4);
                g.fillRect(-44, -44, 88, 88); g.fillStyle = "#f2c200"; g.fillRect(-40, -40, 80, 80); g.restore();
                g.fillStyle = "#111"; g.font = "bold 46px Arial"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("!", w / 2, h / 2 + 2);
            });
            const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9).rotateX(Math.PI / 2), mat(0xffffff, { map: t, transparent: true, side: THREE.DoubleSide }));
            m.position.set(x, y, 2.5);
            m.rotation.z = ang;
            grupo.add(m);
        }

        // ---------- Vehículos ----------
        // Carrocería por perfil lateral (como un auto real: cofre, parabrisas, toldo,
        // cajuela), vidrios, llantas con rin, faros y calaveras. Se arma una sola
        // geometría con grupos de material para poder repetirla muchas veces.
        const geosAuto = {};
        function perfilExtruido(pts, ancho, bisel = 0.06) {
            const sh = new THREE.Shape(pts.map(([px, pz]) => new THREE.Vector2(px, pz)));
            const g = new THREE.ExtrudeGeometry(sh, { depth: ancho - 2 * bisel, bevelEnabled: true, bevelSize: bisel, bevelThickness: bisel, bevelSegments: 3, curveSegments: 4 });
            g.rotateX(Math.PI / 2);
            g.translate(0, (ancho - 2 * bisel) / 2, 0);
            return g;
        }
        function fusionar(partes) {
            // partes: [{ geo, grupo }] -> geometría no indexada con grupos de material
            const listas = [[], [], [], []];
            partes.forEach(p => listas[p.grupo].push(p.geo.index ? p.geo.toNonIndexed() : p.geo));
            const pos = [], nor = [], grupos = [];
            let inicio = 0;
            listas.forEach((lista, gi) => {
                let cuenta = 0;
                lista.forEach(g => {
                    if (!g.attributes.normal) g.computeVertexNormals();
                    pos.push(...g.attributes.position.array);
                    nor.push(...g.attributes.normal.array);
                    cuenta += g.attributes.position.count;
                });
                if (cuenta) grupos.push([inicio, cuenta, gi]);
                inicio += cuenta;
            });
            const geo = new THREE.BufferGeometry();
            geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
            geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
            grupos.forEach(([a, c, m]) => geo.addGroup(a, c, m));
            return geo;
        }
        const cajaG = (w, d, h, x, y, z, rx = 0, ry = 0) => { const g = new THREE.BoxGeometry(w, d, h); if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); return g.translate(x, y, z); };
        function llantas(partes, ejes, ancho) {
            ejes.forEach(ex => [1, -1].forEach(l => {
                partes.push({ geo: new THREE.CylinderGeometry(0.31, 0.31, 0.21, 16).translate(ex, l * (ancho / 2 - 0.1), 0.31), grupo: 2 });
                partes.push({ geo: new THREE.CylinderGeometry(0.19, 0.19, 0.215, 12).translate(ex, l * (ancho / 2 - 0.095), 0.31), grupo: 3 });
            }));
        }
        function geoAuto(tipo) {
            if (geosAuto[tipo]) return geosAuto[tipo];
            const partes = [];
            if (tipo === "pickup") {
                const A = 1.82;
                partes.push({ geo: perfilExtruido([[-2.6, 0.38], [2.45, 0.38], [2.62, 0.6], [2.62, 0.98], [1.0, 1.1], [1.0, 0.98], [-2.6, 0.98]], A), grupo: 0 });
                partes.push({ geo: perfilExtruido([[1.05, 1.08], [0.55, 1.75], [-0.75, 1.78], [-0.95, 1.08]], A - 0.12, 0.05), grupo: 1 });
                partes.push({ geo: cajaG(1.32, A - 0.1, 0.06, -0.14, 0, 1.79), grupo: 0 });
                [-0.12, -0.92].forEach(px => partes.push({ geo: cajaG(0.12, A - 0.08, 0.68, px, 0, 1.42), grupo: 0 }));
                // caja de carga
                [1, -1].forEach(l => partes.push({ geo: cajaG(1.7, 0.08, 0.45, -1.78, l * (A / 2 - 0.04), 1.2), grupo: 0 }));
                partes.push({ geo: cajaG(0.08, A, 0.45, -2.6, 0, 1.2), grupo: 0 });
                partes.push({ geo: cajaG(1.7, A - 0.15, 0.03, -1.78, 0, 0.99), grupo: 2 });
                llantas(partes, [1.7, -1.75], A);
                partes.push({ geo: cajaG(0.12, A + 0.05, 0.2, 2.66, 0, 0.5), grupo: 3 });
                partes.push({ geo: cajaG(0.12, A + 0.05, 0.2, -2.66, 0, 0.5), grupo: 3 });
            } else {
                const A = 1.66;
                // carrocería baja (cofre, puertas, cajuela)
                partes.push({ geo: perfilExtruido([[-2.15, 0.34], [2.0, 0.34], [2.18, 0.5], [2.15, 0.78], [1.15, 0.92], [-1.95, 0.95], [-2.18, 0.82], [-2.2, 0.5]], A), grupo: 0 });
                // cabina de vidrio y toldo
                partes.push({ geo: perfilExtruido([[1.15, 0.9], [0.35, 1.38], [-0.85, 1.4], [-1.6, 0.94]], A - 0.16, 0.05), grupo: 1 });
                partes.push({ geo: perfilExtruido([[0.4, 1.36], [0.32, 1.42], [-0.86, 1.44], [-0.9, 1.38]], A - 0.1, 0.04), grupo: 0 });
                partes.push({ geo: cajaG(0.1, A - 0.12, 0.48, -0.2, 0, 1.15), grupo: 0 }); // poste central
                llantas(partes, [1.3, -1.32], A);
                partes.push({ geo: cajaG(0.1, A + 0.03, 0.16, 2.2, 0, 0.46), grupo: 3 });
                partes.push({ geo: cajaG(0.1, A + 0.03, 0.16, -2.22, 0, 0.46), grupo: 3 });
            }
            // faros y calaveras
            const largo = tipo === "pickup" ? 2.63 : 2.16;
            [0.58, -0.58].forEach(py => {
                partes.push({ geo: cajaG(0.05, 0.32, 0.12, largo, py, tipo === "pickup" ? 0.84 : 0.66), grupo: 3 });
                partes.push({ geo: cajaG(0.05, 0.2, 0.14, -largo - 0.04, py * 1.15, tipo === "pickup" ? 0.84 : 0.72), grupo: 3 });
            });
            geosAuto[tipo] = fusionar(partes);
            return geosAuto[tipo];
        }
        const matsAuto = color => [
            mat(color, { roughness: 0.32, metalness: 0.45 }),
            mat(0x1b242c, { roughness: 0.06, metalness: 0.7 }),
            mat(0x161616, { roughness: 0.85 }),
            mat(0xb9bec2, { roughness: 0.3, metalness: 0.8 })
        ];
        function auto(x, y, ang, color, tipo = "sedan") {
            const m = new THREE.Mesh(geoAuto(tipo), matsAuto(color));
            m.castShadow = true;
            m.receiveShadow = true;
            const g = new THREE.Group();
            g.add(m);
            g.position.set(x, y, 0);
            g.rotation.z = ang;
            grupo.add(g);
            return g;
        }
        // Muchos autos estacionados con pocas llamadas de dibujo (instancias).
        function autosEstacionados(lista, tipo = "sedan") {
            if (!lista.length) return;
            const mats = [
                new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.32, metalness: 0.45, clippingPlanes: planos }),
                new THREE.MeshStandardMaterial({ color: 0x5a6a78, roughness: 0.06, metalness: 0.7, clippingPlanes: planos }),
                new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.85, clippingPlanes: planos }),
                new THREE.MeshStandardMaterial({ color: 0xd0d3d6, roughness: 0.3, metalness: 0.8, clippingPlanes: planos })
            ];
            const im = new THREE.InstancedMesh(geoAuto(tipo), mats, lista.length);
            const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), uno = new THREE.Vector3(1, 1, 1), c = new THREE.Color();
            lista.forEach((a, i) => {
                q.setFromEuler(e.set(0, 0, a.ang));
                m.compose(new THREE.Vector3(a.x, a.y, 0), q, uno);
                im.setMatrixAt(i, m);
                im.setColorAt(i, c.set(a.color));
            });
            im.castShadow = true;
            im.receiveShadow = true;
            grupo.add(im);
        }
        // Moto estacionada
        function moto(x, y, ang, color = 0x1d1d1d) {
            const g = new THREE.Group();
            const add = (geo, m) => { const o = new THREE.Mesh(geo, m); o.castShadow = true; g.add(o); };
            [0.68, -0.68].forEach(px => add(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 14).translate(px, 0, 0.3), mat(0x151515)));
            add(cajaG(1.0, 0.28, 0.3, 0.0, 0, 0.62), mat(color, { roughness: 0.35, metalness: 0.4 }));
            add(cajaG(0.6, 0.26, 0.12, -0.25, 0, 0.82), mat(0x222222));
            add(cajaG(0.06, 0.6, 0.05, 0.62, 0, 1.0), mat(0x888888, { metalness: 0.7 }));
            g.position.set(x, y, 0);
            g.rotation.z = ang;
            grupo.add(g);
            return g;
        }

        // Letrero con texto dibujado.
        function letreroTexto(ancho, alto, dibujar, x, y, z, ang) {
            const t = lienzo(Math.round(ancho * 110), Math.round(alto * 110), dibujar);
            const m = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto).rotateX(Math.PI / 2), mat(0xffffff, { map: t, transparent: true, roughness: 0.6 }));
            m.position.set(x, y, z);
            m.rotation.z = ang;
            grupo.add(m);
            return m;
        }

        // ====================== Casas de colonia ======================
        // Casas como las de Lázaro Cárdenas: losa plana con pretil, tinaco negro,
        // varillas que asoman de los castillos, cortinas metálicas, portones con
        // herrería, techos de lámina y algunas de teja. La fachada que da a la
        // calle se pinta a la medida (puertas, ventanas, cortinas, manchas).
        const texMuro = (color, tipo = "aplanado") => tex("muro" + color + tipo, () => lienzo(256, 256, (g, w, h) => {
            if (tipo === "ladrillo") {
                g.fillStyle = "#9c5a3c"; g.fillRect(0, 0, w, h);
                for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? -16 : 0; x < w; x += 32) {
                    g.fillStyle = ["#a8613f", "#97553a", "#b06a47", "#8f4f35"][(((x + 512) * 7 + y * 3) / 16 | 0) & 3];
                    g.fillRect(x + 1, y + 1, 30, 14);
                }
                g.fillStyle = "rgba(205,195,180,.55)";
                for (let y = 0; y < h; y += 16) g.fillRect(0, y, w, 1.5);
                g.fillStyle = "#b9b4aa"; g.fillRect(0, 0, 18, h); // castillo de concreto
                ruido(g, w, h, 900, ["rgba(0,0,0,.08)", "rgba(255,255,255,.06)"], 2);
                return;
            }
            if (tipo === "block") {
                g.fillStyle = "#9d9a93"; g.fillRect(0, 0, w, h);
                for (let y = 0; y < h; y += 32) for (let x = (y / 32) % 2 ? -32 : 0; x < w; x += 64) {
                    g.fillStyle = ["#a3a09a", "#96938c", "#aaa7a0"][(((x + 512) + y) / 32 | 0) % 3];
                    g.fillRect(x + 1.5, y + 1.5, 61, 29);
                }
                ruido(g, w, h, 1200, ["rgba(0,0,0,.07)", "rgba(255,255,255,.05)"], 2);
                return;
            }
            g.fillStyle = color; g.fillRect(0, 0, w, h);
            ruido(g, w, h, 2200, ["rgba(0,0,0,.035)", "rgba(255,255,255,.05)", "rgba(90,80,60,.04)"], 3);
            // manchas de humedad
            for (let i = 0; i < 5; i++) {
                const x = Math.random() * w, r = 20 + Math.random() * 40;
                const gr = g.createRadialGradient(x, h, 0, x, h, r * 2);
                gr.addColorStop(0, "rgba(70,60,45,.12)"); gr.addColorStop(1, "rgba(70,60,45,0)");
                g.fillStyle = gr; g.fillRect(0, 0, w, h);
            }
        }));
        const texLamina = color => tex("lamina" + color, () => lienzo(64, 64, (g, w, h) => {
            g.fillStyle = color; g.fillRect(0, 0, w, h);
            for (let x = 0; x < w; x += 8) {
                const gr = g.createLinearGradient(x, 0, x + 8, 0);
                gr.addColorStop(0, "rgba(255,255,255,.18)"); gr.addColorStop(0.5, "rgba(0,0,0,.18)"); gr.addColorStop(1, "rgba(255,255,255,.18)");
                g.fillStyle = gr; g.fillRect(x, 0, 8, h);
            }
            ruido(g, w, h, 160, ["rgba(120,70,40,.25)", "rgba(0,0,0,.1)"], 2);
        }));
        const texTeja = () => tex("teja", () => lienzo(128, 128, (g, w, h) => {
            g.fillStyle = "#a24a2c"; g.fillRect(0, 0, w, h);
            for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 ? -8 : 0; x < w; x += 16) {
                const gr = g.createLinearGradient(x, 0, x + 16, 0);
                gr.addColorStop(0, "#8c3d24"); gr.addColorStop(0.5, "#c0603a"); gr.addColorStop(1, "#8c3d24");
                g.fillStyle = gr; g.fillRect(x, y, 15, 15);
                g.fillStyle = "rgba(60,25,15,.35)"; g.fillRect(x, y + 13, 15, 3);
            }
            ruido(g, w, h, 400, ["rgba(0,0,0,.12)", "rgba(255,220,180,.08)"], 2);
        }));
        const texLosa = () => tex("losa", () => lienzo(256, 256, (g, w, h) => {
            g.fillStyle = "#c9c4ba"; g.fillRect(0, 0, w, h);
            ruido(g, w, h, 3000, ["#bdb8ad", "#d3cfc6", "#b3ada2", "rgba(90,80,60,.15)"], 3);
            for (let i = 0; i < 6; i++) {
                const x = Math.random() * w, y = Math.random() * h, r = 15 + Math.random() * 45;
                const gr = g.createRadialGradient(x, y, 0, x, y, r);
                gr.addColorStop(0, "rgba(80,75,65,.18)"); gr.addColorStop(1, "rgba(80,75,65,0)");
                g.fillStyle = gr; g.fillRect(0, 0, w, h);
            }
        }));

        // Caja orientada (centro, ancho, fondo y ángulo) que encierra un contorno.
        function cajaOrientada(anillo) {
            let mejor = null;
            for (let i = 0; i < anillo.length; i++) {
                const a = anillo[i], b = anillo[(i + 1) % anillo.length];
                const L = Math.hypot(b.x - a.x, b.y - a.y);
                if (!mejor || L > mejor.L) mejor = { L, ang: Math.atan2(b.y - a.y, b.x - a.x) };
            }
            const c = Math.cos(-mejor.ang), s = Math.sin(-mejor.ang);
            let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
            anillo.forEach(p => { const u = p.x * c - p.y * s, v = p.x * s + p.y * c; x0 = Math.min(x0, u); x1 = Math.max(x1, u); y0 = Math.min(y0, v); y1 = Math.max(y1, v); });
            const cu = (x0 + x1) / 2, cv = (y0 + y1) / 2;
            const ci = Math.cos(mejor.ang), si = Math.sin(mejor.ang);
            return { x: cu * ci - cv * si, y: cu * si + cv * ci, ancho: x1 - x0, fondo: y1 - y0, ang: mejor.ang };
        }

        // Dibuja la fachada a la medida: L metros de ancho y una o dos plantas.
        function pintarFachada(L, pisos, op, azar) {
            const ppm = op.ppm || 36;
            const H = pisos * 3 + 0.2;
            const w = Math.max(64, Math.round(L * ppm)), h = Math.round(H * ppm);
            const t = lienzo(w, h, (g) => {
                const Y = m => h - m * ppm; // metros desde el suelo -> pixel
                const X = m => m * ppm;
                const rect = (x, y, ww, hh, c) => { g.fillStyle = c; g.fillRect(X(x), Y(y + hh), ww * ppm, hh * ppm); };
                g.fillStyle = op.color; g.fillRect(0, 0, w, h);
                ruido(g, w, h, w * h / 30, ["rgba(0,0,0,.035)", "rgba(255,255,255,.05)"], 2);
                if (op.tipoMuro === "ladrillo" || op.tipoMuro === "block") {
                    const tm = texMuro(op.color, op.tipoMuro).image;
                    for (let x = 0; x < w; x += tm.width * ppm / 64) for (let y = 0; y < h; y += tm.height * ppm / 64) g.drawImage(tm, x, y, tm.width * ppm / 64, tm.height * ppm / 64);
                }
                // segunda planta de otro color / banda de losa
                if (op.colorAlto && pisos > 1) rect(0, 3.0, L, H - 3.0, op.colorAlto);
                if (op.zocalo) rect(0, 0, L, 0.9, op.zocalo);
                for (let p = 1; p <= pisos; p++) rect(0, p * 3 - 0.18, L, 0.24, op.banda || "rgba(0,0,0,.10)");
                // castillos de concreto (obra negra)
                if (op.tipoMuro === "ladrillo") for (let x = 0; x <= L; x += Math.max(2.5, L / Math.ceil(L / 3.5))) rect(Math.min(x, L - 0.25), 0, 0.25, H, "#b8b3a8");

                const herreria = (x, y, ww, hh, color = "#2a2a2a") => {
                    g.strokeStyle = color; g.lineWidth = Math.max(1.5, ppm * 0.04);
                    for (let i = 1; i < Math.round(ww / 0.14); i++) { const xx = X(x + (ww * i) / Math.round(ww / 0.14)); g.beginPath(); g.moveTo(xx, Y(y)); g.lineTo(xx, Y(y + hh)); g.stroke(); }
                    [0.33, 0.66].forEach(f => { g.beginPath(); g.moveTo(X(x), Y(y + hh * f)); g.lineTo(X(x + ww), Y(y + hh * f)); g.stroke(); });
                };
                const ventana = (x, y, ww, hh, arco = false) => {
                    rect(x - 0.08, y - 0.1, ww + 0.16, hh + 0.18, op.marco || "rgba(255,255,255,.75)");
                    const gr = g.createLinearGradient(0, Y(y + hh), 0, Y(y));
                    gr.addColorStop(0, "#5d7686"); gr.addColorStop(1, "#22303a");
                    g.fillStyle = gr;
                    if (arco) { g.beginPath(); g.moveTo(X(x), Y(y)); g.lineTo(X(x), Y(y + hh - ww / 2)); g.arc(X(x + ww / 2), Y(y + hh - ww / 2), ww / 2 * ppm, Math.PI, 0); g.lineTo(X(x + ww), Y(y)); g.closePath(); g.fill(); }
                    else g.fillRect(X(x), Y(y + hh), ww * ppm, hh * ppm);
                    g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(X(x), Y(y + hh), ww * ppm * 0.4, hh * ppm);
                    if (op.herreria !== false) herreria(x, y, ww, arco ? hh - ww / 2 : hh, op.colorHerreria || "#262626");
                    rect(x - 0.12, y - 0.14, ww + 0.24, 0.08, "rgba(0,0,0,.15)"); // repisón
                    // escurrimiento bajo la ventana
                    const sc = g.createLinearGradient(0, Y(y - 0.15), 0, Y(Math.max(0, y - 1.2)));
                    sc.addColorStop(0, "rgba(60,50,40,.16)"); sc.addColorStop(1, "rgba(60,50,40,0)");
                    g.fillStyle = sc; g.fillRect(X(x), Y(y - 0.15), ww * ppm, Math.min(y, 1.05) * ppm);
                };
                const puerta = (x, ww = 0.95, color = op.colorPuerta || "#5b3a26") => {
                    rect(x - 0.06, 0, ww + 0.12, 2.18, "rgba(0,0,0,.25)");
                    rect(x, 0, ww, 2.1, color);
                    rect(x + 0.08, 1.2, ww - 0.16, 0.75, "rgba(255,255,255,.08)");
                    herreria(x + 0.1, 1.25, ww - 0.2, 0.65, "#1b1b1b");
                    rect(x + ww - 0.18, 1.0, 0.06, 0.12, "#c9c2a0");
                };
                const cortina = (x, ww, color = op.colorCortina || "#5f7f6c") => {
                    rect(x - 0.1, 0, ww + 0.2, 2.75, "rgba(0,0,0,.2)");
                    rect(x, 0.08, ww, 2.55, color);
                    g.strokeStyle = "rgba(0,0,0,.22)"; g.lineWidth = 1;
                    for (let yy = 0.15; yy < 2.6; yy += 0.09) { g.beginPath(); g.moveTo(X(x), Y(yy)); g.lineTo(X(x + ww), Y(yy)); g.stroke(); }
                    rect(x, 2.5, ww, 0.18, "rgba(0,0,0,.25)");
                    rect(x + ww / 2 - 0.15, 0.25, 0.3, 0.06, "#333");
                };
                const porton = (x, ww = 2.7, color = op.colorPorton || "#4a3a30") => {
                    rect(x, 0, ww, 2.3, color);
                    herreria(x + 0.05, 0.05, ww - 0.1, 2.2, "#1a1a1a");
                    rect(x + ww / 2 - 0.02, 0, 0.04, 2.3, "#111");
                };
                // planta baja
                let x = 0.5 + azar() * 0.5;
                const fin = L - 0.4;
                const elementos = op.planta || (azar() < 0.3 ? ["cortina", "puerta", "ventana"] : azar() < 0.5 ? ["porton", "puerta", "ventana"] : ["ventana", "puerta", "ventana"]);
                let i = 0;
                while (x < fin - 0.9 && i < 12) {
                    const e = elementos[i % elementos.length];
                    i++;
                    if (e === "cortina" && x + 2.8 < fin) { cortina(x, 2.7); x += 3.1; }
                    else if (e === "porton" && x + 2.9 < fin) { porton(x, 2.7); x += 3.1; }
                    else if (e === "puerta" && x + 1.0 < fin) { puerta(x); x += 1.4; }
                    else if ((e === "ventana" || e === "arco") && x + 1.3 < fin) { ventana(x, 1.0, 1.2, e === "arco" ? 1.5 : 1.1, e === "arco"); x += 1.8; }
                    else x += 0.6;
                }
                // plantas altas
                for (let p = 1; p < pisos; p++) {
                    if (op.obraAlta) { // segunda planta sin terminar: vanos abiertos
                        for (let xx = 0.6; xx < L - 1.6; xx += 3.2) rect(xx, p * 3 + 0.3, 2.2, 2.2, "rgba(30,28,25,.85)");
                        continue;
                    }
                    for (let xx = 0.7 + azar() * 0.4; xx < L - 1.5; xx += 2.4 + azar() * 0.8) ventana(xx, p * 3 + 0.95, 1.2, 1.1, op.arcos);
                }
                // suciedad al pie del muro
                const sc = g.createLinearGradient(0, h, 0, Y(0.7));
                sc.addColorStop(0, "rgba(80,65,45,.38)"); sc.addColorStop(1, "rgba(80,65,45,0)");
                g.fillStyle = sc; g.fillRect(0, Y(0.7), w, 0.7 * ppm);
                if (op.numero) { g.fillStyle = "#f4f1e8"; g.font = `bold ${0.32 * ppm}px Arial`; g.fillText(op.numero, X(L - 1.1), Y(2.35)); }
                if (op.letrero) {
                    rect(op.letrero.x, 2.75, op.letrero.ancho, 0.55, op.letrero.fondo || "#f2f2ee");
                    g.fillStyle = op.letrero.color || "#c0262c"; g.font = `bold ${0.36 * ppm}px Arial`; g.textAlign = "center"; g.textBaseline = "middle";
                    g.fillText(op.letrero.texto, X(op.letrero.x + op.letrero.ancho / 2), Y(3.02));
                }
            });
            t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
            return t;
        }

        function casa(pts, calle, op = {}) {
            const anillo = pts.slice();
            const u = anillo[anillo.length - 1];
            if (Math.hypot(u.x - anillo[0].x, u.y - anillo[0].y) < 0.05) anillo.pop();
            if (anillo.length < 3) return null;
            let semilla = Math.abs(Math.round(anillo[0].x * 977 + anillo[0].y * 613)) + 7;
            const azar = () => { semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646; };
            const pisos = op.pisos || 1;
            const H = pisos * 3 + 0.2;
            const tipoMuro = op.tipoMuro || "aplanado";
            // muros y losa
            const geo = new THREE.ExtrudeGeometry(new THREE.Shape(anillo.map(p => new THREE.Vector2(p.x, p.y))), { depth: H, bevelEnabled: false });
            const tm = texMuro(op.colorLado || op.color, tipoMuro).clone(); tm.needsUpdate = true; tm.repeat.set(1 / 3.5, 1 / 3.5);
            const tl = texLosa().clone(); tl.needsUpdate = true; tl.repeat.set(1 / 7, 1 / 7);
            const m = new THREE.Mesh(geo, [mat(0xffffff, { map: tl, roughness: 0.95 }), mat(0xffffff, { map: tm, roughness: 0.93 })]);
            m.castShadow = true; m.receiveShadow = true;
            grupo.add(m);
            // fachada hacia la calle
            let mejor = null;
            for (let i = 0; i < anillo.length; i++) {
                const a = anillo[i], b = anillo[(i + 1) % anillo.length];
                const L = Math.hypot(b.x - a.x, b.y - a.y);
                if (L < 2.5) continue;
                const md = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
                const d = calle ? distanciaALinea(calle, md.x, md.y) : 0;
                if (!mejor || d < mejor.d - 0.5 || (Math.abs(d - mejor.d) <= 0.5 && L > mejor.L)) mejor = { a, b, L, md, d };
            }
            let frente = null;
            if (mejor) {
                const { a, b, L, md } = mejor;
                const ang = Math.atan2(b.y - a.y, b.x - a.x);
                let n = { x: Math.sin(ang), y: -Math.cos(ang) };
                const c = centro(anillo);
                if ((md.x - c.x) * n.x + (md.y - c.y) * n.y < 0) n = { x: -n.x, y: -n.y };
                const angFrente = Math.atan2(n.y, n.x) - Math.PI / 2;
                const tf = pintarFachada(L, pisos, { ...op, tipoMuro }, azar);
                const plano = new THREE.Mesh(new THREE.PlaneGeometry(L, H).rotateX(Math.PI / 2), mat(0xffffff, { map: tf, roughness: 0.9 }));
                plano.position.set(md.x + n.x * 0.025, md.y + n.y * 0.025, H / 2);
                plano.rotation.z = angFrente + Math.PI;
                plano.receiveShadow = true;
                grupo.add(plano);
                frente = { md, n, L, ang: angFrente, a, b };
                // banqueta o rampa al frente
                if (op.banqueta !== false) {
                    const fondo = op.banqueta || 1.3;
                    const t = new THREE.Mesh(new THREE.BoxGeometry(L, fondo, 0.16), mat(0xffffff, { map: texBanqueta("#bdb8ad"), roughness: 0.95 }));
                    t.position.set(md.x + n.x * fondo / 2, md.y + n.y * fondo / 2, 0.08);
                    t.rotation.z = angFrente;
                    t.receiveShadow = true;
                    grupo.add(t);
                }
                // alero de teja sobre la puerta
                if (op.alero) {
                    const t = texTeja().clone(); t.needsUpdate = true; t.repeat.set(L / 2, 0.5);
                    const al = new THREE.Mesh(new THREE.BoxGeometry(L + 0.2, 0.9, 0.08), mat(0xffffff, { map: t, roughness: 0.8 }));
                    al.position.set(md.x + n.x * 0.42, md.y + n.y * 0.42, 2.85);
                    al.rotation.z = angFrente;
                    al.rotateX(-0.32);
                    al.castShadow = true;
                    grupo.add(al);
                }
            }
            // pretil en la azotea
            const conPretil = op.pretil !== false && op.techo !== "teja";
            if (conPretil) {
                const borde = desplazarCerrado(anillo, -0.15);
                const pos = [];
                const z0 = H, z1 = H + (op.pretilAlto || 0.45);
                for (let i = 0; i < anillo.length; i++) {
                    const a = anillo[i], b = anillo[(i + 1) % anillo.length], c = borde[i], d = borde[(i + 1) % borde.length];
                    pos.push(a.x, a.y, z0, b.x, b.y, z0, b.x, b.y, z1, a.x, a.y, z0, b.x, b.y, z1, a.x, a.y, z1);
                    pos.push(c.x, c.y, z0, d.x, d.y, z0, d.x, d.y, z1, c.x, c.y, z0, d.x, d.y, z1, c.x, c.y, z1);
                    pos.push(a.x, a.y, z1, b.x, b.y, z1, d.x, d.y, z1, a.x, a.y, z1, d.x, d.y, z1, c.x, c.y, z1);
                }
                const pm = new THREE.Mesh(geometriaDe(pos), ladoDoble(mat(op.colorPretil || op.colorAlto || op.color)));
                pm.castShadow = true;
                grupo.add(pm);
                if (op.balaustrada && frente) {
                    // balaustres blancos sobre el pretil del frente
                    const { a, b } = frente;
                    const L = Math.hypot(b.x - a.x, b.y - a.y);
                    for (let s = 0.4; s < L - 0.3; s += 0.32) {
                        if (s % 3.2 < 0.5) continue;
                        const px = a.x + (b.x - a.x) * s / L, py = a.y + (b.y - a.y) * s / L;
                        cilindro(0.06, 0.08, 0.6, px - frente.n.x * 0.08, py - frente.n.y * 0.08, H, mat(0xf2efe6), 6).castShadow = false;
                    }
                    caja(L, 0.25, 0.1, frente.md.x - frente.n.x * 0.08, frente.md.y - frente.n.y * 0.08, H + 0.6, frente.ang, mat(0xf2efe6), false);
                }
            }
            // varillas que salen de los castillos (casa que va a crecer)
            if (op.varillas || (op.varillas !== false && azar() < 0.35 && op.techo !== "teja")) {
                const matVar = mat(0x5a4a3c, { metalness: 0.4, roughness: 0.7 });
                anillo.forEach(p => {
                    for (let k = 0; k < 4; k++) {
                        const v = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 4).rotateX(Math.PI / 2), matVar);
                        v.position.set(p.x + (k % 2 - 0.5) * 0.12 - Math.sign(p.x - centro(anillo).x) * 0.1, p.y + ((k >> 1) - 0.5) * 0.12 - Math.sign(p.y - centro(anillo).y) * 0.1, H + 0.45);
                        grupo.add(v);
                    }
                });
            }
            const ob = cajaOrientada(anillo);
            // techo de lámina sobre postes
            if (op.techo === "lamina") {
                const t = texLamina(op.colorLamina || "#9aa0a3").clone(); t.needsUpdate = true; t.repeat.set(ob.ancho / 1.2, 1);
                const lam = new THREE.Mesh(new THREE.BoxGeometry(ob.ancho + 0.4, ob.fondo + 0.5, 0.04), mat(0xffffff, { map: t, roughness: 0.55, metalness: 0.45 }));
                lam.position.set(ob.x, ob.y, H + 0.25 + (op.techoAlto || 0));
                lam.rotation.z = ob.ang;
                lam.rotateX(op.techoAlto ? 0.06 : 0.09);
                lam.castShadow = true; lam.receiveShadow = true;
                grupo.add(lam);
                if (op.techoAlto) [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([i, j]) => {
                    const px = ob.x + Math.cos(ob.ang) * i * ob.ancho / 2.1 - Math.sin(ob.ang) * j * ob.fondo / 2.1;
                    const py = ob.y + Math.sin(ob.ang) * i * ob.ancho / 2.1 + Math.cos(ob.ang) * j * ob.fondo / 2.1;
                    caja(0.08, 0.08, op.techoAlto + 0.3, px, py, H, ob.ang, mat(0x6e6a64, { metalness: 0.5 }));
                });
                if (op.paneles) {
                    for (let k = -1; k <= 1; k++) {
                        const px = ob.x + Math.cos(ob.ang) * k * 1.8, py = ob.y + Math.sin(ob.ang) * k * 1.8;
                        const pn = caja(1.7, 1.0, 0.04, px, py, H + 0.3 + op.techoAlto, ob.ang, mat(0x1b2c4a, { roughness: 0.2, metalness: 0.5 }));
                        pn.rotateX(0.2);
                    }
                }
            }
            // techo de teja a cuatro aguas
            if (op.techo === "teja") {
                const alto = Math.min(2.2, Math.min(ob.ancho, ob.fondo) * 0.32);
                const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1).rotateX(Math.PI / 2).rotateZ(Math.PI / 4);
                g.scale(ob.ancho + 0.8, ob.fondo + 0.8, alto);
                const t = texTeja().clone(); t.needsUpdate = true; t.repeat.set(ob.ancho / 2, ob.fondo / 2);
                const r = new THREE.Mesh(g, mat(0xffffff, { map: t, roughness: 0.85 }));
                r.position.set(ob.x, ob.y, H + alto / 2);
                r.rotation.z = ob.ang;
                r.castShadow = true; r.receiveShadow = true;
                grupo.add(r);
            }
            // tinaco, tanque de gas y antena
            if (op.techo !== "teja" && op.tinaco !== false && (op.techo !== "lamina" || op.techoAlto)) {
                const tx = ob.x + Math.cos(ob.ang) * ob.ancho * (azar() - 0.5) * 0.5, ty = ob.y + Math.sin(ob.ang) * ob.ancho * (azar() - 0.5) * 0.5;
                tinaco(tx, ty, H);
                if (azar() < 0.35) {
                    const gas = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.2, 12).rotateZ(Math.PI / 2), mat(0xe9e7e1, { roughness: 0.4, metalness: 0.3 }));
                    gas.position.set(tx + 1.4, ty + 0.4, H + 0.4); gas.rotation.z = ob.ang; gas.castShadow = true; grupo.add(gas);
                }
                if (azar() < 0.25) {
                    const ant = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 6, 0, Math.PI * 2, 0, 1.0), mat(0xdedede, { side: THREE.DoubleSide }));
                    ant.position.set(tx - 1.5, ty, H + 1.0); ant.rotation.set(-1.0, 0, azar() * 6); grupo.add(ant);
                    cilindro(0.03, 0.03, 0.9, tx - 1.5, ty, H, mat(0x777777), 5);
                }
            }
            return { frente, H, ob };
        }

        // Barda de block o de lámina para cerrar un terreno
        function barda(pts, alto, tipo = "block", color) {
            const matB = tipo === "lamina" ? mat(0xffffff, { map: texLamina(color || "#8f7a62"), roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide })
                : mat(0xffffff, { map: texMuro(color || "#a3a09a", color ? "aplanado" : "block"), roughness: 0.95 });
            for (let i = 1; i < pts.length; i++) {
                const a = pts[i - 1], b = pts[i];
                const L = Math.hypot(b.x - a.x, b.y - a.y);
                const t = matB.map ? matB.map.clone() : null;
                const m2 = t ? mat(0xffffff, { map: (t.needsUpdate = true, t.repeat.set(L / 3.5, alto / 3.5), t), roughness: matB.roughness, metalness: matB.metalness, side: matB.side }) : matB;
                caja(L, tipo === "lamina" ? 0.04 : 0.15, alto, (a.x + b.x) / 2, (a.y + b.y) / 2, 0, Math.atan2(b.y - a.y, b.x - a.x), m2);
            }
        }

        const texConcreto = () => tex("concreto", () => lienzo(256, 256, (g, w, h) => {
            g.fillStyle = "#b4b0a7"; g.fillRect(0, 0, w, h);
            ruido(g, w, h, 6000, ["#aaa69c", "#bdb9b0", "#a29e95", "#c3bfb6"], 2);
            for (let i = 0; i < 8; i++) {
                const x = Math.random() * w, y = Math.random() * h, r = 10 + Math.random() * 40;
                const gr = g.createRadialGradient(x, y, 0, x, y, r);
                gr.addColorStop(0, "rgba(70,65,55,.16)"); gr.addColorStop(1, "rgba(70,65,55,0)");
                g.fillStyle = gr; g.fillRect(0, 0, w, h);
            }
            g.strokeStyle = "rgba(60,58,52,.55)"; g.lineWidth = 2.5;
            g.beginPath(); g.moveTo(0, 1); g.lineTo(w, 1); g.moveTo(1, 0); g.lineTo(1, h); g.stroke();
            g.strokeStyle = "rgba(60,58,52,.3)"; g.lineWidth = 1;
            g.beginPath(); g.moveTo(w * 0.3, h * 0.2); g.lineTo(w * 0.45, h * 0.5); g.lineTo(w * 0.42, h * 0.8); g.stroke();
        }));

        // ---------- Base de la maqueta ----------
        function base(colorSuelo) {
            const w = lim.maxX - lim.minX, h = lim.maxY - lim.minY;
            const cx = (lim.maxX + lim.minX) / 2, cy = (lim.maxY + lim.minY) / 2;
            const ts = texTierra().clone(); ts.needsUpdate = true; ts.repeat.set(w / 8, h / 8);
            const suelo = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: colorSuelo || 0xffffff, map: ts, roughness: 1 }));
            suelo.position.set(cx, cy, 0);
            suelo.receiveShadow = true;
            grupo.add(suelo);
            const zocalo = new THREE.Mesh(new THREE.BoxGeometry(w, h, 5), new THREE.MeshStandardMaterial({ color: 0x1d2a33, roughness: 0.7 }));
            zocalo.position.set(cx, cy, -2.52);
            grupo.add(zocalo);
            const filo = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, h + 0.02, 0.25), new THREE.MeshStandardMaterial({ color: 0xf2c200, roughness: 0.6 }));
            filo.position.set(cx, cy, -0.2);
            grupo.add(filo);
        }

        // Muro de piedra (mampostería)
        const texPiedra = () => tex("piedra", () => lienzo(512, 256, (g, w, h) => {
            g.fillStyle = "#4a3d33"; g.fillRect(0, 0, w, h);
            const tonos = ["#6d5a4b", "#7b6655", "#5c4b3e", "#8a7563", "#665346", "#756b5f", "#5f584f"];
            for (let y = 0; y < h; y += 22) {
                for (let x = -20 + (y % 44 ? 18 : 0); x < w; x += 30 + Math.random() * 18) {
                    g.fillStyle = tonos[(Math.random() * tonos.length) | 0];
                    g.beginPath();
                    const rw = 22 + Math.random() * 16, rh = 16 + Math.random() * 6;
                    g.ellipse(x + rw / 2, y + rh / 2 + 2, rw / 2, rh / 2, (Math.random() - 0.5) * 0.4, 0, Math.PI * 2);
                    g.fill();
                }
            }
            ruido(g, w, h, 1500, ["rgba(0,0,0,.12)", "rgba(255,255,255,.06)"], 2);
        }));

        return {
            THREE, grupo, planos, mat, lim, luces, texPiedra,
            texAsfalto, texBanqueta, texPasto, texTierra, texFachada, lienzo,
            desplazar, cortarX, P, cinta, franja, punteada, poligono, caja, cilindro, edificio, frenteComercial,
            arbol, arbolJoven, palmera, arbusto, maleza, moto, luminaria, luminariaEstacionamiento, posteCFE, cables, bolardo, tinaco,
            senalPreventiva, auto, autosEstacionados, letreroTexto, base,
            casa, barda, texConcreto, texMuro, texLamina, texTeja, ruido, geometriaDe
        };
    }

    // ---------- utilidades geométricas ----------
    function areaPoligono(pts) {
        let a = 0;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j].x + pts[i].x) * (pts[j].y - pts[i].y);
        return -a / 2;
    }
    function centro(pts) {
        const s = pts.reduce((c, p) => ({ x: c.x + p.x, y: c.y + p.y }), { x: 0, y: 0 });
        return { x: s.x / pts.length, y: s.y / pts.length };
    }
    function distanciaALinea(pts, x, y) {
        let m = Infinity;
        for (let i = 1; i < pts.length; i++) {
            const a = pts[i - 1], b = pts[i];
            const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1;
            const u = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l2));
            m = Math.min(m, Math.hypot(x - (a.x + dx * u), y - (a.y + dy * u)));
        }
        return m;
    }

    // Marco a lo largo de una calle: s = metros sobre la calle desde la parada,
    // d = metros a la derecha del eje (en el sentido de circulación).
    function marcoCalle(pts, ox = 0, oy = 0) {
        const linea = prepararRuta(pts);
        const s0 = distanciaMasCercana(linea, ox, oy);
        const en = (s, d = 0) => {
            const p = puntoEn(linea, s0 + s);
            const dir = direccionEn(linea, s0 + s, 1);
            return { x: p.x + dir.y * d, y: p.y - dir.x * d, ang: Math.atan2(dir.y, dir.x) };
        };
        return { linea, s0, en };
    }

    // Movimiento de vehículos a lo largo de una calle.
    function crearTrafico(kit, vehiculos) {
        return (dt) => {
            vehiculos.forEach(v => {
                v.t = (v.t + dt) % v.ciclo;
                const s = v.desde + ((v.hasta - v.desde) * v.t) / v.ciclo;
                const p = v.marco.en(s, v.d);
                v.obj.position.set(p.x, p.y, 0);
                v.obj.rotation.z = p.ang;
            });
        };
    }

    // ====================== ZONA A — Av. Melchor Ocampo, frente al Tecnológico ======================
    function zonaA(THREE) {
        // El origen del marco es el punto de referencia original (17.973986, -102.232124).
        // La parada quedó 64 m al poniente, junto a la barda blanca, a un lado de la
        // entrada lateral del Tec (17.973962, -102.232731).
        const PX = -64.3, PY = -2.65;
        const kit = crearKit(THREE, { minX: PX - 90, maxX: PX + 105, minY: -72, maxY: 88 });
        const { mat, P, cinta, franja, punteada, cortarX, caja } = kit;
        kit.base(0xe9e2d0);

        const asfalto = mat(0xffffff, { map: kit.texAsfalto(), roughness: 0.95 });
        const banqueta = mat(0xffffff, { map: kit.texBanqueta(), roughness: 0.95 });
        const guarnicion = mat(0xc9c5bb);
        const amarillo = mat(0xf2c200, { roughness: 0.6 });
        const blancoRaya = mat(0xf4f4f0, { roughness: 0.7 });
        const verdeCiclovia = mat(0x4fc458, { roughness: 0.8 });
        const tierraCamellon = mat(0xffffff, { map: kit.texTierra(), roughness: 1 });
        const pasto = mat(0xffffff, { map: kit.texPasto(), roughness: 1 });
        const piedra = kit.texPiedra();

        // Ejes (OpenStreetMap), origen en la parada
        const SUR = P([[-200, 11], [-130, 7], [-82, 4], [30, 0], [75, -1], [247, -6]]); // hacia el oriente
        const NORTE = P([[247, 8], [172, 12], [134, 12], [76, 13], [42, 14], [-80, 19], [-123, 22], [-200, 26]]); // hacia el poniente
        const sur = marcoCalle(SUR);
        const norte = marcoCalle(NORTE);
        const S = (s, d) => sur.en(s, d);
        const N = (s, d) => norte.en(s, d);
        const surA = marcoCalle(SUR, PX, PY); // s = 0 en la parada
        const SA = surA.s0 - sur.s0; // distancia de la parada sobre el eje sur
        const SP = (s, d) => S(SA + s, d);
        const tramoS = (s0, s1) => { const pts = []; for (let s = s0; s <= s1; s += 3) { const p = S(s, 0); pts.push({ x: p.x, y: p.y }); } return pts; };
        const tramoN = (s0, s1) => { const pts = []; for (let s = s0; s <= s1; s += 3) { const p = N(s, 0); pts.push({ x: p.x, y: p.y }); } return pts; };

        // ---------- Calzadas: dos carriles + carril de estacionamiento en cada sentido ----------
        const surX = cortarX(SUR, -170, 125), norteX = cortarX(NORTE, -170, 125);
        cinta(surX, -5.2, 5.2, 0.06, asfalto, 6);
        cinta(norteX, -5.0, 5.0, 0.06, asfalto, 6);
        punteada(surX, -1.7, 0.075, 3, 4.5, 0.14, blancoRaya);
        cinta(surX, 1.75, 1.88, 0.075, blancoRaya);
        cinta(surX, -5.0, -4.87, 0.075, blancoRaya);
        punteada(norteX, -1.6, 0.075, 3, 4.5, 0.14, blancoRaya);
        cinta(norteX, 1.75, 1.88, 0.075, blancoRaya);
        cinta(norteX, -4.85, -4.72, 0.075, blancoRaya);
        // retornos / accesos que cruzan el camellón
        cinta(P([[76, 14], [75, -2]]), -4, 4, 0.055, asfalto, 6);
        cinta(P([[-80, 20], [-82, 3]]), -3.6, 3.6, 0.055, asfalto, 6);

        // Paso peatonal frente a la entrada del Tec
        for (let o = -4.6; o <= 4.6; o += 1.15) {
            const a = S(24, o), b = S(28, o);
            cinta([{ x: a.x, y: a.y }, { x: b.x, y: b.y }], -0.3, 0.3, 0.078, blancoRaya, 2);
        }
        for (let o = -4.4; o <= 4.4; o += 1.15) {
            const a = N(-26, o), b = N(-22, o);
            cinta([{ x: a.x, y: a.y }, { x: b.x, y: b.y }], -0.3, 0.3, 0.078, blancoRaya, 2);
        }

        // ---------- Camellón angosto con árboles jóvenes y luminarias ----------
        [[-170, -86], [-77, 71], [80, 125]].forEach(([xa, xb]) => {
            const a = cortarX(SUR, xa, xb), b = cortarX(NORTE, xa, xb);
            if (a.length < 2 || b.length < 2) return;
            const pts = [...kit.desplazar(a, -5.25), ...kit.desplazar(b, -5.05)];
            const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(p => new THREE.Vector2(p.x, p.y))), { depth: 0.2, bevelEnabled: false });
            const uv = geo.attributes.uv;
            for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 6, uv.getY(i) / 6);
            const m = new THREE.Mesh(geo, [tierraCamellon, amarillo]);
            m.receiveShadow = true;
            kit.grupo.add(m);
            franja(a, -5.55, -5.2, 0, 0.21, amarillo, amarillo, 2);
            franja(b, -5.35, -5.0, 0, 0.21, amarillo, amarillo, 2);
            cinta(kit.desplazar(a, -7.3), -0.9, 0.9, 0.215, pasto, 3);
        });
        const camellon = s => S(s, -7.4);
        [-148, -113, -78, -43, -8, 27, 62, 97].forEach(s => { const c = camellon(s); if (c.x < -86 || c.x > -76) kit.luminaria(c.x, c.y, c.ang + Math.PI / 2, true); });
        for (let s = -160; s <= 110; s += 10) {
            if (Math.abs(s - 24) < 4) continue;
            const c = camellon(s + 3);
            if ((c.x > -86 && c.x < -76) || (c.x > 71 && c.x < 80)) continue;
            kit.arbolJoven(c.x, c.y);
        }

        // ---------- Lado sur: ciclovía, pasto, banqueta y barda del Tec ----------
        cinta(tramoS(-165, 110), 5.2, 7.0, 0.065, verdeCiclovia, 3);
        // guarnición amarilla entre la ciclovía y la franja de tierra/pasto (como en la foto)
        [[-165, -88.5], [-75.2, 19], [34, 110]].forEach(([a, b]) => franja(tramoS(a, b), 7.0, 7.22, 0, 0.16, amarillo, amarillo, 2));
        // topes amarillos de concreto que separan la ciclovía del carril de estacionamiento
        for (let s = -163; s < 108; s += 5.5) {
            if ((s > -90 && s < -74) || (s > 17 && s < 36)) continue;
            const p = S(s, 5.25);
            caja(1.7, 0.32, 0.16, p.x, p.y, 0.06, p.ang, amarillo);
        }
        // cruce de la ciclovía frente a la entrada lateral: franjas verdes sobre asfalto
        cinta(tramoS(-88.6, -75.2), 5.2, 7.0, 0.068, asfalto, 6);
        for (let s = -88.2; s <= -75.6; s += 1.25) {
            const a = S(s, 5.25), b = S(s, 6.95);
            cinta([{ x: a.x, y: a.y }, { x: b.x, y: b.y }], -0.32, 0.32, 0.072, verdeCiclovia, 2);
        }
        [[-165, -95], [-69, 19], [34, 110]].forEach(([a, b]) => {
            franja(tramoS(a, b), 7.0, 8.6, 0, 0.14, pasto, guarnicion, 3);
            franja(tramoS(a, b), 8.6, 10.2, 0, 0.16, banqueta, guarnicion, 3);
            franja(tramoS(a, b), 10.2, 12.3, 0, 0.14, pasto, guarnicion, 3);
        });
        // accesos vehiculares (entrada principal y lateral)
        cinta(tramoS(18, 35), 5.2, 13, 0.07, mat(0xbdb8ad), 3);

        // Barda de piedra
        const piedraMat = mat(0xffffff, { map: piedra });
        const bardaPiedra = (s0, s1, alto = 3.0) => {
            for (let s = s0; s < s1; s += 4) {
                const l = Math.min(4, s1 - s);
                const p = S(s + l / 2, 12.6);
                const tx = piedra.clone(); tx.needsUpdate = true; tx.repeat.set(l / 4, alto / 2.2);
                const m = caja(l + 0.02, 0.6, alto, p.x, p.y, 0, p.ang, mat(0xffffff, { map: tx }));
                m.castShadow = true;
                caja(l + 0.02, 0.7, 0.12, p.x, p.y, alto, p.ang, mat(0x8c7f72));
            }
        };
        // Barda blanca lisa (aplanado pintado), con juntas cada 6 m y un zoclo sucio
        const aplanado = kit.lienzo(512, 256, (g, w, h) => {
            g.fillStyle = "#e9ebe7"; g.fillRect(0, 0, w, h);
            for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? "120,120,115" : "255,255,255"},${Math.random() * 0.05})`; g.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
            const z = g.createLinearGradient(0, h * 0.82, 0, h); z.addColorStop(0, "rgba(140,135,120,0)"); z.addColorStop(1, "rgba(140,135,120,.35)");
            g.fillStyle = z; g.fillRect(0, h * 0.8, w, h * 0.2);
            g.fillStyle = "rgba(90,90,85,.35)"; g.fillRect(w - 3, 0, 3, h);
        });
        const bardaBlanca = (s0, s1, alto = 2.7) => {
            for (let s = s0; s < s1; s += 6) {
                const l = Math.min(6, s1 - s);
                const p = S(s + l / 2, 12.6);
                const tx = aplanado.clone(); tx.needsUpdate = true; tx.repeat.set(l / 6, 1);
                caja(l + 0.02, 0.35, alto, p.x, p.y, 0, p.ang, mat(0xffffff, { map: tx, roughness: 0.92 })).castShadow = true;
            }
        };
        const SAr = Math.round(SA);
        bardaBlanca(-69, SAr + 14);
        bardaPiedra(SAr + 14, 18);
        bardaPiedra(36, 110, 3.3);

        // ---------- Entrada lateral del Tec (Street View, 2025) ----------
        // De oriente a poniente: reja blanca sobre zoclo azul con una palmera de coco
        // y un árbol al frente, el acceso peatonal (pórtico azul, escalones, rampa azul
        // y torniquetes), el acceso de autos con pluma, la caseta de vigilancia y la
        // reja que sigue hacia el poniente.
        const azulTec = mat(0x1e46b4, { roughness: 0.55 });
        const blancoTec = mat(0xf4f4f1, { roughness: 0.85 });
        const concretoTec = mat(0xc9c5bc, { map: kit.texBanqueta("#cbc7be"), roughness: 0.95 });
        const B = (ls, ld, h, s, d, z, m) => { const p = S(s, d); return caja(ls, ld, h, p.x, p.y, z, p.ang, m); };
        // Reja: barrotes blancos entre postes azules, sobre un zoclo azul
        const texBarrotes = kit.lienzo(512, 128, (g, w, h) => {
            g.clearRect(0, 0, w, h);
            g.fillStyle = "#f2f3f0";
            for (let x = 3; x < w; x += 13) g.fillRect(x, 0, 5, h);
            g.fillStyle = "#1e46b4"; g.fillRect(0, h * 0.06, w, 6); g.fillRect(0, h - 8, w, 8);
        });
        const rejaTec = (s0, s1) => {
            for (let s = s0; s < s1 - 0.01; s += 2.6) {
                const l = Math.min(2.6, s1 - s);
                B(l + 0.01, 0.4, 0.62, s + l / 2, 12.6, 0, azulTec);
                const p = S(s + l / 2, 12.6);
                const tx = texBarrotes.clone(); tx.needsUpdate = true; tx.repeat.set(l / 5, 1);
                const m = new THREE.Mesh(new THREE.PlaneGeometry(l, 1.9).rotateX(Math.PI / 2), mat(0xffffff, { map: tx, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }));
                m.position.set(p.x, p.y, 0.62 + 0.95); m.rotation.z = p.ang; m.castShadow = true;
                kit.grupo.add(m);
                B(0.14, 0.14, 2.6, s, 12.6, 0, azulTec);
            }
            B(0.14, 0.14, 2.6, s1, 12.6, 0, azulTec);
        };
        rejaTec(-75.4, -69);
        rejaTec(-165, -91.9);
        // franja de tierra con un árbol y una palmera de coco frente a la reja; banqueta angosta
        franja(tramoS(-95, -69), 7.22, 11.1, 0, 0.12, tierraCamellon, guarnicion, 4);
        franja(tramoS(-95, -69), 11.1, 12.42, 0, 0.15, concretoTec, guarnicion, 3);
        { const p = S(-71.4, 10.4); kit.palmera(p.x, p.y, 10.5, 0.1); }
        { const p = S(-73.6, 9.4); kit.arbol(p.x, p.y, 2.6, 5.2); }
        // plancha de concreto frente al acceso peatonal y al de autos
        franja(tramoS(-88.6, -75.2), 7.22, 12.5, 0, 0.13, concretoTec, guarnicion, 3);
        cinta(tramoS(-88.4, -79.8), 12.4, 26, 0.12, concretoTec, 3);

        // Acceso peatonal: pórtico azul con muros blancos
        const sP = -77.75; // centro del pórtico
        B(0.32, 4.2, 3.1, -75.55, 14.6, 0, blancoTec);           // muro oriente
        B(0.32, 4.2, 3.1, -79.95, 14.6, 0, blancoTec);           // muro poniente
        B(0.45, 0.45, 3.1, -80.05, 12.75, 0, azulTec);           // columna azul al frente
        B(5.3, 4.9, 0.62, sP, 14.75, 3.1, azulTec);              // losa azul
        B(5.3, 0.06, 0.62, sP, 12.28, 3.1, mat(0x183a96));       // canto de la losa
        const lampara = new THREE.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffe7a8, emissiveIntensity: 0.2, clippingPlanes: kit.planos });
        kit.luces.push(lampara);
        B(0.35, 0.2, 0.12, sP, 13.6, 2.98, lampara);
        // escalones (6 de 17 cm) del lado oriente y descanso arriba
        for (let i = 0; i < 6; i++) B(2.75, 0.36, 0.17 * (i + 1), -76.95, 12.95 + i * 0.36 + 0.18, 0, blancoTec);
        B(4.1, 1.7, 1.02, sP, 16.1, 0, blancoTec);
        // rampa azul con el símbolo de accesibilidad
        const texRampa = kit.lienzo(256, 512, (g, w, h) => {
            g.fillStyle = "#2d63c8"; g.fillRect(0, 0, w, h);
            kit.ruido(g, w, h, 2500, ["rgba(0,0,0,.06)", "rgba(255,255,255,.06)"], 2);
            g.strokeStyle = "#ffffff"; g.fillStyle = "#ffffff"; g.lineWidth = 16; g.lineCap = "round";
            const cx = w * 0.5, cy = h * 0.62;
            g.beginPath(); g.arc(cx + 8, cy + 40, 52, 0.2 * Math.PI, 1.55 * Math.PI); g.stroke();
            g.beginPath(); g.arc(cx - 6, cy - 78, 16, 0, Math.PI * 2); g.fill();
            g.beginPath(); g.moveTo(cx - 6, cy - 52); g.lineTo(cx - 2, cy + 10); g.lineTo(cx + 42, cy + 10); g.lineTo(cx + 60, cy + 56); g.stroke();
            g.beginPath(); g.moveTo(cx - 4, cy - 26); g.lineTo(cx + 34, cy - 26); g.stroke();
        });
        const LR = 3.3, TH = Math.atan2(1.02, 3.3);
        const grupoRampa = new THREE.Group();
        { const p = S(-79.05, 12.6 + LR / 2); grupoRampa.position.set(p.x, p.y, 0); grupoRampa.rotation.z = p.ang; kit.grupo.add(grupoRampa); }
        {
            const r = new THREE.Mesh(new THREE.PlaneGeometry(1.45, Math.hypot(LR, 1.02)).rotateZ(Math.PI), mat(0xffffff, { map: texRampa, roughness: 0.75 }));
            r.position.z = 0.53;
            r.rotation.x = -TH; // sube hacia adentro del Tec
            r.receiveShadow = true;
            grupoRampa.add(r);
            const lado = new THREE.Mesh(new THREE.BoxGeometry(0.08, LR, 1.02), blancoTec);
            lado.position.set(0.74, 0, 0.51);
            grupoRampa.add(lado);
        }
        // barandal metálico de la rampa y torniquetes arriba
        const acero = mat(0xb9bec2, { metalness: 0.75, roughness: 0.3 });
        for (let i = 0; i <= 3; i++) {
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.0), acero);
            const yy = LR / 2 - 0.15 - i * (LR - 0.3) / 3;
            post.position.set(0.7, yy, 0.5 + 0.53 - Math.tan(TH) * yy);
            grupoRampa.add(post);
        }
        { const riel = new THREE.Mesh(new THREE.BoxGeometry(0.05, Math.hypot(LR, 1.02) + 0.2, 0.05), acero); riel.position.set(0.7, 0, 1.53); riel.rotation.x = -TH; grupoRampa.add(riel); }
        [-76.4, -77.6, -78.8].forEach(s => {
            B(0.28, 0.4, 1.0, s, 15.95, 1.02, acero);
            B(0.5, 0.04, 0.04, s + 0.35, 15.95, 1.85, acero);
        });
        B(4.1, 0.05, 0.05, sP, 16.9, 2.0, acero);

        // Acceso de autos: pluma roja y blanca junto a la caseta de vigilancia
        const texPluma = kit.lienzo(512, 16, (g, w, h) => { for (let x = 0; x < w; x += 32) { g.fillStyle = (x / 32) % 2 ? "#f4f4f1" : "#d1262c"; g.fillRect(x, 0, 32, h); } });
        {
            const p = S(-84.0, 13.9);
            const pl = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.08, 0.09), mat(0xffffff, { map: texPluma, roughness: 0.5 }));
            pl.position.set(p.x, p.y, 1.02); pl.rotation.z = p.ang; pl.castShadow = true;
            kit.grupo.add(pl);
            B(0.3, 0.3, 1.1, -87.75, 13.9, 0, mat(0xe9e9e4, { roughness: 0.6 }));
            B(0.32, 0.32, 0.12, -87.75, 13.9, 1.1, mat(0xd1262c));
            const cono = S(-80.6, 13.0);
            kit.cilindro(0.18, 0.03, 0.7, cono.x, cono.y, 0.12, mat(0xf26a1b), 10);
        }
        // Caseta de vigilancia: cuarto blanco con ventanales y marco azul
        {
            const sc = -90.15, dc = 14.3;
            B(3.4, 3.2, 2.75, sc, dc, 0, blancoTec);
            B(3.6, 3.4, 0.55, sc, dc, 2.75, azulTec);
            B(3.5, 3.3, 0.1, sc, dc, 3.3, mat(0xdedbd3));
            [[-1.68, -1.58], [1.68, -1.58]].forEach(([os, od]) => B(0.12, 0.12, 2.75, sc + os, dc + od, 0, azulTec));
            // ventanales con herrería (frente y lado oriente)
            const texVentanal = kit.lienzo(256, 192, (g, w, h) => {
                const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#6f8796"); gr.addColorStop(1, "#2a3640");
                g.fillStyle = gr; g.fillRect(0, 0, w, h);
                g.fillStyle = "rgba(255,255,255,.18)"; g.fillRect(0, 0, w * 0.35, h);
                g.fillStyle = "#1e46b4";
                for (let x = 0; x <= w; x += w / 6) g.fillRect(x - 3, 0, 6, h);
                g.fillRect(0, 0, w, 7); g.fillRect(0, h - 7, w, 7); g.fillRect(0, h * 0.5 - 3, w, 6);
            });
            const vf = S(sc + 0.2, dc - 1.62);
            const v1 = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5).rotateX(Math.PI / 2), mat(0xffffff, { map: texVentanal, roughness: 0.2, metalness: 0.2 }));
            v1.position.set(vf.x, vf.y, 1.75); v1.rotation.z = vf.ang; kit.grupo.add(v1);
            const ve = S(sc + 1.72, dc - 0.2);
            const v2 = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.5).rotateX(Math.PI / 2), mat(0xffffff, { map: texVentanal, roughness: 0.2, metalness: 0.2 }));
            v2.position.set(ve.x, ve.y, 1.75); v2.rotation.z = ve.ang - Math.PI / 2; kit.grupo.add(v2);
            // repisón blanco bajo la ventana y escalón
            B(3.4, 0.5, 0.75, sc, dc - 1.85, 0, mat(0xe9e8e3));
            B(3.8, 0.9, 0.15, sc, dc - 2.2, 0, concretoTec);
            // bote de basura junto a la caseta
            const bt = S(sc + 2.1, dc - 2.2);
            kit.cilindro(0.28, 0.28, 0.85, bt.x, bt.y, 0, mat(0xb46a2a, { roughness: 0.7 }), 12);
        }
        // estudiantes entrando y esperando
        const estudiante = (s, d, ang, camisa, pantalon, mochila) => {
            const g = new THREE.Group();
            const m = c => mat(c, { roughness: 0.85 });
            const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 4, 8).rotateX(Math.PI / 2);
            const add = (geo, mm, x, y, z) => { const o = new THREE.Mesh(geo, mm); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
            [-0.1, 0.1].forEach(o => add(cap(0.075, 0.68), m(pantalon), 0, o, 0.45));
            add(cap(0.17, 0.3), m(camisa), 0, 0, 1.27).scale.set(0.75, 1.15, 1);
            [-0.24, 0.24].forEach(o => add(cap(0.055, 0.42), m(camisa), 0.02, o, 1.22));
            add(new THREE.SphereGeometry(0.115, 14, 10), m(0x8d5a3b), 0, 0, 1.69);
            add(new THREE.SphereGeometry(0.118, 14, 8, 0, Math.PI * 2, 0, 1.3), m(0x1b1714), -0.01, 0, 1.72);
            if (mochila) add(new THREE.BoxGeometry(0.16, 0.3, 0.4), m(mochila), -0.22, 0, 1.25);
            const p = S(s, d);
            g.position.set(p.x, p.y, 0.15); g.rotation.z = p.ang + ang;
            kit.grupo.add(g);
        };
        estudiante(-76.9, 11.6, Math.PI / 2, 0x7a1f2b, 0x2b3a55, null);
        estudiante(-78.9, 11.9, -Math.PI / 2, 0x1d1d1d, 0xc9b48a, 0x1d1d1d);

        // Entrada principal del Tec: caseta blanca, pórtico con letrero azul y reja
        const casetaTec = S(15.5, 16);
        caja(6, 6, 4.6, casetaTec.x, casetaTec.y, 0, casetaTec.ang, mat(0xffffff, { map: kit.texFachada("#f4f4f1", { vidrio: "#2f4a62" }) }));
        caja(6.4, 6.4, 0.3, casetaTec.x, casetaTec.y, 4.6, casetaTec.ang, mat(0x1f4fa0));
        const pilar1 = S(19.5, 13), pilar2 = S(35, 13);
        caja(1.6, 1.6, 7.2, pilar1.x, pilar1.y, 0, pilar1.ang, mat(0xf4f4f1));
        caja(1.2, 1.2, 4.2, pilar2.x, pilar2.y, 0, pilar2.ang, mat(0xf4f4f1));
        const viga = S(27.6, 12.9);
        caja(15.2, 0.9, 1.3, viga.x, viga.y, 5.4, viga.ang, mat(0x1f4fa0, { roughness: 0.5 }));
        const letrero = (texto, ancho, alto, s, d, z, tam) => {
            const p = S(s, d);
            kit.letreroTexto(ancho, alto, (g, w, h) => {
                g.fillStyle = "#1f4fa0"; g.fillRect(0, 0, w, h);
                g.strokeStyle = "rgba(255,255,255,.85)"; g.lineWidth = h * 0.04; g.strokeRect(h * 0.06, h * 0.08, w - h * 0.12, h - h * 0.16);
                g.fillStyle = "#ffffff"; g.font = `bold ${h * tam}px Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
                g.fillText(texto, w / 2, h / 2 + 2);
            }, p.x, p.y, z, p.ang + Math.PI);
        };
        letrero("TECNOLÓGICO NACIONAL DE MÉXICO", 14.6, 1.1, 27.6, 12.43, 6.05, 0.5);
        // letrero sobre la barda, con su base azul curva
        const zocalo = S(50, 12.0);
        caja(18, 1.2, 0.5, zocalo.x, zocalo.y, 0, zocalo.ang, mat(0x1f4fa0));
        letrero("INSTITUTO TECNOLÓGICO DE LÁZARO CÁRDENAS", 15, 1.5, 49, 12.27, 2.5, 0.36);
        // reja corrediza
        const reja = kit.lienzo(256, 96, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = "#24282b"; for (let x = 0; x < w; x += 10) g.fillRect(x, 0, 4, h); g.fillRect(0, 0, w, 6); g.fillRect(0, h - 6, w, 6); });
        const pr = S(27.5, 13.1);
        const mr = new THREE.Mesh(new THREE.PlaneGeometry(13.5, 2.2).rotateX(Math.PI / 2), mat(0xffffff, { map: reja, transparent: true, side: THREE.DoubleSide }));
        mr.position.set(pr.x, pr.y, 1.1); mr.rotation.z = pr.ang; kit.grupo.add(mr);
        // señal de cruce peatonal
        const sp = S(19, 8.4); kit.senalPreventiva(sp.x, sp.y, sp.ang - Math.PI / 2);

        // Interior del Tec: árboles grandes, estacionamientos y edificios
        for (let s = -161; s <= 105; s += 8) {
            if ((s > 12 && s < 38) || (s > -92 && s < -72)) continue;
            const p = S(s + ((s * 7) % 3), 17 + ((s * 13) % 5));
            kit.arbol(p.x, p.y, 3.6 + ((s / 8) % 3) * 0.5, 8 + ((s / 8) % 2) * 1.5);
        }
        const lotePasto = [];
        for (let s = -165; s <= 110; s += 5) lotePasto.push(S(s, 0));
        cinta(lotePasto.map(p => ({ x: p.x, y: p.y })), 12.9, 90, 0.015, pasto, 4);
        const asfaltoLote = mat(0xd8d8d8, { map: kit.texAsfalto(), roughness: 0.95 });
        kit.poligono(P([[-47, -27], [-49, -48], [-12, -52], [1, -61], [8, -60], [8, -67], [38, -68], [39, -33], [-10, -34]]), 0.04, asfaltoLote, 8);
        kit.poligono(P([[43, -33], [94, -33], [94, -18], [43, -18]]), 0.04, asfaltoLote, 8);
        cinta(P([[30, 0], [28, -27], [27, -36]]), -3.5, 3.5, 0.05, asfalto, 6);
        cinta(P([[28, -27], [89, -27]]), -3, 3, 0.05, asfalto, 6);
        cinta(P([[27, -36], [-36, -35], [-87, -30]]), -3, 3, 0.05, asfalto, 6);
        const coloresAuto = [0xf2f2f2, 0x9aa1a7, 0x1b1d20, 0xc0262c, 0xd9dcdf, 0x2a5ea8, 0x6b7076];
        let k = 0;
        const estacionadosTec = [];
        for (let x = -40; x < 34; x += 2.8) [-41, -55].forEach(y => { if ((k++ * 7) % 10 < 5) estacionadosTec.push({ x, y: y + (x > 0 ? -6 : 0), ang: Math.PI / 2, color: coloresAuto[k % coloresAuto.length] }); });
        for (let x = 46; x < 92; x += 2.8) if ((k++ * 3) % 10 < 6) estacionadosTec.push({ x, y: -21.5, ang: Math.PI / 2, color: coloresAuto[k % coloresAuto.length] });
        kit.autosEstacionados(estacionadosTec);
        const tecBlanco = "#f3f3ef";
        // Edificio de dos pisos que se ve detrás de la barda blanca, con palmeras al frente
        kit.edificio(P([[-128, -44], [-82, -44], [-82, -56], [-128, -56]]), 7.0, "#e8ddc5", { vidrio: "#3d4b52", colorPretil: "#b8783f" });
        cinta(P([[-82, -2], [-82, -38]]), -3, 3, 0.05, asfalto, 6);
        [[-74, -22, 10.5], [-70, -29, 9], [-58, -24, 11], [-100, -26, 9.5], [-108, -33, 10], [-50, -30, 8.5]].forEach(([x, y, h], i) => kit.palmera(x, y, h, 0.05 + (i % 3) * 0.03));
        [[[-49, -66], [-9, -67], [-9, -54], [-49, -53]], [[-6, -69], [6, -70], [6, -92], [-6, -92]], [[-72, -36], [-66, -36], [-67, -47], [-72, -46]]].forEach((c, i) => {
            kit.edificio(P(c), i === 2 ? 3.4 : 7.2, tecBlanco, { vidrio: "#2f4a62", colorPretil: "#1f4fa0" });
        });

        // ---------- Lado norte: comercios ----------
        const NOR = P;
        const edificios = [
            // frente a la avenida
            [[[-30, 26], [-29, 32], [-19, 32], [-19, 26]], 3.6, "#f1ede4", { comercio: 0xe8e8e8, letrero: 0xffffff }],
            [[[0, 26], [-19, 27], [-19, 33], [0, 32]], 7.0, "#f6f6f3", { comercio: 0xb0b6ba, letrero: 0xffffff, tinacos: 1 }],
            [[[11, 26], [1, 26], [1, 32], [11, 32]], 3.8, "#f3efe6", { comercio: 0xcf3a2b, letrero: 0xd8262b }],
            [[[8, 33], [1, 33], [1, 46], [9, 46]], 6.8, "#dfe3b0", { tinacos: 1 }],
            [[[6, 52], [6, 47], [12, 47], [12, 32], [21, 31], [22, 52]], 6.6, "#e2e6bd", { comercio: 0x5d8e45 }],
            [[[50, 31], [61, 31], [61, 24], [50, 24]], 7.4, "#f0a35a", { comercio: 0x2f6fcf, letrero: 0x2f6fcf, tinacos: 2 }],
            [[[49, 36], [61, 37], [61, 32], [49, 31]], 7.4, "#f0a35a", {}],
            [[[50, 51], [50, 37], [62, 37], [62, 51]], 6.4, "#ece2cf", { tinacos: 1 }],
            [[[70, 48], [70, 29], [81, 29], [81, 47]], 7.6, "#e9e6df", { comercio: 0xc0262c, letrero: 0xc0262c, vidrio: "#33424d", ancho: 0.75 }],
            [[[82, 51], [82, 24], [89, 24], [89, 28], [91, 28], [91, 34], [99, 34], [99, 50]], 7.6, "#efeae0", { comercio: 0xb0b6ba, vidrio: "#33424d", ancho: 0.75 }],
            [[[-49, 34], [-59, 34], [-59, 44], [-49, 44]], 3.6, "#f1e4cc", {}],
            [[[-59, 27], [-68, 27], [-68, 56], [-59, 55]], 6.6, "#f3f1ec", { comercio: 0x2f6fcf, tinacos: 2 }],
            [[[-78, 56], [-78, 27], [-68, 27], [-68, 56]], 3.8, "#e9d6bd", { comercio: 0xcf6f3a }],
            [[[-88, 41], [-80, 41], [-80, 27], [-85, 27], [-85, 29], [-89, 29]], 3.6, "#f0ece2", { comercio: 0x2e9e4f }],
            [[[-102, 56], [-112, 28], [-89, 28], [-89, 56]], 6.8, "#f2e3c6", { comercio: 0xb0b6ba, tinacos: 2 }],
            [[[-150, 31], [-128, 30], [-127, 50], [-150, 51]], 6.4, "#efe6d6", { comercio: 0x2e9e4f, tinacos: 1 }],
            [[[-160, 32], [-151, 32], [-151, 48], [-160, 48]], 3.6, "#f1e1c9", { comercio: 0xcf6f3a }],
            [[[-150, 55], [-127, 54], [-127, 72], [-150, 72]], 3.6, "#ebe3d1", { tinacos: 1 }],
            // segunda fila
            [[[-29, 56], [-29, 33], [-19, 33], [-19, 56]], 3.5, "#efe6d2", { tinacos: 1 }],
            [[[-19, 46], [-19, 33], [0, 33], [0, 51], [-4, 51], [-4, 46]], 6.8, "#f6f6f3", { tinacos: 2 }],
            [[[-9, 68], [-9, 52], [1, 52], [1, 68]], 3.5, "#e8d8c4", { tinacos: 1 }],
            [[[-18, 73], [-18, 64], [-11, 64], [-11, 73]], 3.3, "#f2dcc1", {}],
            [[[5, 73], [5, 53], [20, 53], [21, 73]], 6.4, "#f0e3c9", { tinacos: 1 }],
            [[[22, 74], [21, 54], [31, 53], [32, 73]], 3.6, "#efd9c5", {}],
            [[[33, 73], [42, 73], [41, 54], [32, 55]], 3.5, "#e7e0cf", { tinacos: 1 }],
            [[[49, 54], [73, 53], [73, 72], [64, 72], [63, 59], [61, 59], [61, 70], [50, 70]], 3.6, "#ebe3d1", { tinacos: 2 }],
            [[[74, 68], [82, 68], [81, 56], [73, 56]], 3.4, "#f0ddc6", {}],
            [[[90, 55], [82, 56], [82, 71], [90, 70]], 6.2, "#e6d9bf", { tinacos: 1 }],
            [[[90, 51], [91, 70], [100, 70], [100, 51]], 3.6, "#f3e8d0", {}],
            [[[-78, 76], [-78, 56], [-67, 56], [-67, 76]], 3.5, "#ebe3d1", { tinacos: 1 }],
            [[[-57, 56], [-67, 56], [-67, 77], [-57, 76]], 6.2, "#f0e1cc", { tinacos: 1 }],
            [[[-88, 76], [-88, 70], [-80, 70], [-80, 75]], 3.2, "#e7e0cf", {}],
            [[[-86, 56], [-86, 61], [-79, 61], [-79, 56]], 3.2, "#f2e3d0", {}],
            [[[32, 79], [33, 99], [44, 98], [43, 79]], 3.4, "#e9e4d7", {}],
            [[[12, 81], [20, 80], [22, 100], [13, 100]], 3.4, "#f1e7cf", {}],
            [[[-8, 81], [1, 80], [2, 101], [-7, 102]], 3.6, "#efe2cf", {}],
            [[[-17, 100], [-18, 81], [-23, 82], [-22, 86], [-27, 87], [-26, 100]], 3.4, "#ebe3d1", {}],
            [[[-28, 81], [-37, 82], [-36, 101], [-27, 100]], 3.4, "#f2dcc1", {}],
            [[[-48, 102], [-36, 101], [-37, 81], [-49, 82]], 6.2, "#ece5d6", { tinacos: 1 }],
            [[[51, 99], [63, 99], [62, 79], [51, 80]], 3.4, "#e9dfcc", {}],
            [[[74, 78], [75, 98], [83, 98], [83, 78]], 3.4, "#f0e4cf", {}],
            [[[84, 96], [84, 82], [94, 82], [94, 96]], 3.4, "#e5dccb", {}]
        ];
        edificios.forEach(([pts, h, color, op]) => {
            const contorno = NOR(pts);
            kit.edificio(contorno, h, color, op);
            if (op.comercio) kit.frenteComercial(contorno, NORTE, h, color, op.comercio, op.letrero);
        });
        // Edificio moderno de cuatro pisos (departamentos), con balcones de cristal
        const moderno = P([[21, 24], [42, 24], [43, 43], [21, 43]]);
        kit.edificio(moderno, 13.5, "#f7f7f5", { vidrio: "#3b5361", ancho: 0.82, herreria: false });
        for (let z = 3.4; z < 13; z += 3.3) kit.caja(9.5, 1.4, 0.12, 36.8, 23.2, z, 0, mat(0xf7f7f5));
        for (let z = 3.4; z < 13; z += 3.3) kit.caja(9.5, 0.05, 1.0, 36.8, 22.5, z + 0.12, 0, new THREE.MeshStandardMaterial({ color: 0x9fc6d6, transparent: true, opacity: 0.45, clippingPlanes: kit.planos }));
        kit.caja(1.6, 0.7, 13.9, 30.5, 23.7, 0, 0, mat(0x7b858c));
        // Letrero de la tortillería en poste
        kit.cilindro(0.06, 0.06, 3.2, 14, 25.5, 0, mat(0x555a5e), 8);
        kit.letreroTexto(3.2, 0.8, (g, w, h) => { g.fillStyle = "#e8eef2"; g.fillRect(0, 0, w, h); g.fillStyle = "#1f4fa0"; g.fillRect(0, h * 0.72, w, h * 0.28); g.fillStyle = "#1d2a33"; g.font = `bold ${h * 0.46}px Arial`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("TORTILLERÍA", w / 2, h * 0.38); }, 14, 25.4, 3.6, Math.PI);
        // Calles de la colonia
        [P([[42, 14], [45, 78], [53, 124]]), P([[-123, 22], [-101, 71], [-99, 77]]), P([[137, 75], [45, 78], [-99, 77]])].forEach(c => {
            cinta(c, -3.4, 3.4, 0.055, asfalto, 6);
            franja(c, 3.4, 5.0, 0, 0.14, banqueta, guarnicion, 3);
            franja(c, -5.0, -3.4, 0, 0.14, banqueta, guarnicion, 3);
        });
        // banqueta norte
        [[-170, 37], [47, 125]].forEach(([a, b]) => franja(tramoN(-b, -a), 5.0, 8.4, 0, 0.15, banqueta, guarnicion, 3));
        [[-60, 30, 4, 9], [-95, 62, 3.6, 8], [66, 52, 3.4, 8], [104, 30, 4, 8.5]].forEach(([x, y, r, h]) => kit.arbol(x, y, r, h));
        [[96, 22, 9], [101, 21, 10.5]].forEach(([x, y, h]) => kit.palmera(x, y, h, 0.06));

        // ---------- Autos estacionados ----------
        [-150, -143, -136, -112, -104, -97, -40, -32, -25, -17, 8, 14, 44, 51].forEach((s, i) => { const p = S(s, 3.5); kit.auto(p.x, p.y, p.ang, coloresAuto[(i * 3) % coloresAuto.length], i % 5 === 0 ? "pickup" : "sedan"); });
        [-140, -118, -96, -40, -28, -12, -4, 6, 16, 30, 52, 70].forEach((x, i) => { const p = N(-x, 3.4); kit.auto(p.x, p.y, p.ang, [0xc0262c, 0x1b1d20, 0xc0262c, 0xf2f2f2, 0x9aa1a7, 0xc0262c][i % 6]); });

        // ---------- Postes y cables ----------
        const postesN = [-130, -95, -60, -25, 10, 45, 80].map(x => { const p = N(-x, 6.2); return kit.posteCFE(p.x, p.y, p.ang, x === 10); });
        kit.cables(postesN);
        const postesS = [-140, -104, -36, 44, 80].map(s => { const p = S(s, 11.2); return kit.posteCFE(p.x, p.y, p.ang); });
        kit.cables(postesS);

        // ---------- Tráfico ----------
        const autosMov = [
            { marco: sur, d: -3.4, desde: -165, hasta: 125, ciclo: 20, t: 3, color: 0x2a5ea8 },
            { marco: sur, d: -3.4, desde: -165, hasta: 125, ciclo: 20, t: 11, color: 0xd9dcdf },
            { marco: norte, d: -3.3, desde: -165, hasta: 125, ciclo: 22, t: 5, color: 0x8a1d22 },
            { marco: norte, d: 0, desde: -165, hasta: 125, ciclo: 26, t: 15, color: 0xf2f2f2 }
        ].map(v => ({ ...v, obj: kit.auto(0, 0, 0, v.color) }));
        const trafico = crearTrafico(kit, autosMov);

        // Plancha de concreto pegada a la barda, donde va la parada (como en Street View, ago 2024)
        franja([SP(-2.6, 0), SP(0, 0), SP(2.6, 0)].map(p => ({ x: p.x, y: p.y })), 10.15, 12.4, 0, 0.17, mat(0xcfcac0, { roughness: 0.95 }), guarnicion, 3);
        const parada = SP(0, 11.0);
        const C = (s, d, z) => { const p = SP(s, d); return new THREE.Vector3(p.x, p.y, z); };
        return {
            grupo: kit.grupo,
            planos: kit.planos,
            lim: kit.lim,
            luces: kit.luces,
            caseta: { x: parada.x, y: parada.y, ang: parada.ang + Math.PI },
            combi: { marco: surA, carril: 0, parar: 3.4, desde: -85, hasta: 150 },
            pasajeros: { marco: surA, d: 8.9, puerta: 6.2 },
            animar: trafico,
            vistas: {
                inicio: { posicion: C(-14, -20, 10), objetivo: C(1, 10.5, 2) },
                calle: { posicion: C(3, -7.4, 1.65), objetivo: C(-1, 12.5, 2.2) },
                aerea: { posicion: new THREE.Vector3(PX - 95, -130, 125), objetivo: new THREE.Vector3(PX, 8, 0) }
            },
            entorno: [
                "Plancha de concreto pegada a la barda blanca del Instituto Tecnológico de Lázaro Cárdenas",
                "Entrada lateral del Tec a 12 m al poniente: pórtico azul con escalones, rampa y torniquetes; acceso de autos con pluma y caseta de vigilancia",
                "Reja blanca sobre zoclo azul con una palmera de coco al frente; la barda de piedra empieza 14 m al oriente",
                "Cruce verde de la ciclovía frente a la entrada y topes amarillos junto al estacionamiento",
                "Entrada principal con pórtico azul y paso peatonal a unos 90 m al oriente",
                "Ciclovía verde, franja de pasto y banqueta entre la calle y la barda",
                "Carril de estacionamiento con autos a ambos lados de la avenida",
                "Camellón angosto con árboles jóvenes y luminarias",
                "Del otro lado: locales, una tortillería y un edificio de departamentos de cuatro pisos"
            ]
        };
    }

    // ====================== ZONA B — Av. Belisario Domínguez ======================
    function zonaB(THREE) {
        const kit = crearKit(THREE, { minX: -110, maxX: 165, minY: -72, maxY: 255 });
        const { mat, P, cinta, franja, punteada, cortarX, caja } = kit;
        kit.base(0xe6dfcd);

        const asfalto = mat(0xffffff, { map: kit.texAsfalto(), roughness: 0.95 });
        const asfaltoLote = mat(0xd8d8d8, { map: kit.texAsfalto(), roughness: 0.95 });
        const banqueta = mat(0xffffff, { map: kit.texBanqueta(), roughness: 0.95 });
        const guarnicion = mat(0xbdb8ad);
        const amarillo = mat(0xf2c200, { roughness: 0.6 });
        const blancoRaya = mat(0xf4f4f0, { roughness: 0.7 });
        const tierra = mat(0xffffff, { map: kit.texTierra(), roughness: 1 });
        const pasto = mat(0xffffff, { map: kit.texPasto(), roughness: 1 });

        // Ejes (OpenStreetMap)
        const NOROESTE = P([[160, 116], [146, 106], [110, 80], [96, 69], [40, 27], [38, 25], [28, 18], [-18, -18], [-34, -30], [-45, -39], [-76, -60], [-97, -76], [-135, -105], [-141, -110], [-185, -141]]); // hacia el surponiente (lado de la parada)
        const SURESTE = P([[-285, -231], [-275, -223], [-186, -155], [-178, -150], [-92, -86], [37, 9], [163, 104], [222, 150]]); // hacia el nororiente
        const no = marcoCalle(NOROESTE);
        const se = marcoCalle(SURESTE);
        const N = (s, d) => no.en(s, d);

        const noX = cortarX(NOROESTE, -130, 130), seX = cortarX(SURESTE, -130, 130);
        cinta(noX, -4.2, 4.2, 0.06, asfalto, 6);
        cinta(seX, -4.2, 4.2, 0.06, asfalto, 6);
        punteada(noX, 0, 0.075, 3, 4.5, 0.14, blancoRaya);
        punteada(seX, 0, 0.075, 3, 4.5, 0.14, blancoRaya);
        cinta(noX, -4.0, -3.85, 0.075, blancoRaya);
        cinta(seX, -4.0, -3.85, 0.075, blancoRaya);

        // Camellón arbolado
        {
            const a = kit.desplazar(cortarX(NOROESTE, -130, 130), -4.3);
            const b = kit.desplazar(cortarX(SURESTE, -130, 130), -4.3);
            const forma = new THREE.Shape([...a, ...b].map(p => new THREE.Vector2(p.x, p.y)));
            const geo = new THREE.ExtrudeGeometry(forma, { depth: 0.2, bevelEnabled: false });
            const uv = geo.attributes.uv;
            for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 6, uv.getY(i) / 6);
            const m = new THREE.Mesh(geo, [tierra, amarillo]);
            m.receiveShadow = true;
            kit.grupo.add(m);
            franja(cortarX(NOROESTE, -130, 130), -4.6, -4.25, 0, 0.21, amarillo, amarillo, 2);
            franja(cortarX(SURESTE, -130, 130), -4.6, -4.25, 0, 0.21, amarillo, amarillo, 2);
        }
        const centroCamellon = s => {
            const p = N(s, -5.8);
            return p;
        };
        for (let s = -120; s <= 120; s += 9) {
            const c = centroCamellon(s);
            kit.arbol(c.x, c.y, 3.6 + ((s / 9) % 3) * 0.4, 8 + ((s / 9) % 2), { troncoBlanco: true });
        }

        // ---------- Lado norte: banqueta, franja de pasto y estacionamiento de la plaza ----------
        const tramo = (s0, s1) => { const pts = []; for (let s = s0; s <= s1; s += 3) { const p = N(s, 0); pts.push({ x: p.x, y: p.y }); } return pts; };
        // Entrada al estacionamiento en s≈-38 (hacia el nororiente, junto al restaurante)
        cinta(tramo(-130, 140), 4.2, 5.1, 0.12, pasto, 3);
        [[-140, -44], [-30, 140]].forEach(([a, b]) => {
            franja(tramo(a, b), 4.2, 5.1, 0, 0.14, pasto, guarnicion, 3);
            franja(tramo(a, b), 5.1, 7.7, 0, 0.16, banqueta, guarnicion, 3);
            franja(tramo(a, b), 7.7, 8.0, 0, 0.22, amarillo, amarillo, 2);
        });
        cinta(tramo(-46, -28), 4.2, 9, 0.065, asfalto, 6);

        // Estacionamiento (contorno de OpenStreetMap)
        const lote = P([[-62, 43], [-23, -7], [-18, -3], [-14, -6], [13, 14], [10, 18], [11, 22], [14, 26], [-5, 53], [13, 68], [34, 42], [37, 44], [41, 38], [59, 51], [47, 67], [52, 70], [39, 86], [37, 90], [51, 100], [51, 103], [54, 106], [40, 126], [36, 123], [32, 129], [23, 130], [13, 129], [5, 126], [-6, 121], [-20, 111], [-26, 107], [-32, 101], [-36, 94], [-42, 86], [-50, 71], [-56, 52], [-60, 49], [-58, 46], [-62, 43]]);
        kit.poligono(lote, 0.04, asfaltoLote, 8);
        const loteOeste = P([[-121, 16], [-94, -55], [-89, -54], [-85, -56], [-82, -59], [-47, -31], [-50, -27], [-28, -13], [-33, -6], [-31, -4], [-64, 41], [-69, 38], [-73, 42], [-92, 34], [-101, 27], [-121, 16]]);
        kit.poligono(loteOeste, 0.04, asfaltoLote, 8);
        // rellenar entre banqueta y lote
        kit.poligono(P([[-27, -10], [14, 14], [34, 30], [44, 44], [36, 50], [10, 30], [-20, 4]]), 0.035, asfaltoLote, 8);

        // Estacionamientos del lado de la plaza y frente a Walmart
        [
            P([[69, 134], [65, 131], [95, 90], [99, 92], [103, 91], [107, 88], [134, 109], [132, 122], [100, 162], [72, 140]]),
            P([[103, 168], [136, 124], [144, 128], [137, 137], [199, 182], [211, 191], [212, 191], [184, 228]]),
            P([[-30, 133], [7, 148], [42, 143], [52, 151], [99, 185], [96, 190], [50, 158], [40, 150], [6, 154], [-33, 140]])
        ].forEach(l => kit.poligono(l, 0.04, asfaltoLote, 8));
        // Calle interior frente a las tiendas y andador techado
        cinta(P([[50, 140], [63, 149], [75, 159], [88, 168], [96, 174], [103, 179], [116, 189], [129, 198], [141, 207], [154, 217], [167, 227], [179, 236]]), -3.6, 3.6, 0.05, asfalto, 6);
        franja(P([[-3, 138], [6, 143], [43, 140], [54, 148], [93, 176], [101, 182], [176, 240]]), -1.8, 1.8, 0, 0.16, banqueta, guarnicion, 3);
        cinta(P([[44, 137], [96, 69]]), -3.2, 3.2, 0.05, asfalto, 6);
        cinta(P([[50, 140], [91, 88], [96, 84], [102, 81], [110, 80]]), -3.2, 3.2, 0.05, asfalto, 6);

        // Cajones a lo largo de los pasillos
        const pasillos = [
            P([[-50, 79], [-3, 14]]), P([[-74, 52], [-31, -4]]), P([[-56, 61], [-17, 4]]), P([[-42, 94], [-17, 61]]),
            P([[-17, 61], [9, 23]]), P([[-36, 106], [-7, 69]]), P([[-12, 129], [18, 89]]), P([[-93, 45], [-46, -15]]), P([[-109, 39], [-59, -25]]),
            P([[7, 137], [34, 102]]), P([[27, 139], [47, 112]]), P([[63, 149], [100, 99]]), P([[75, 159], [114, 109]]), P([[88, 168], [126, 117]]),
            P([[103, 179], [129, 145]]), P([[116, 189], [143, 154]]), P([[129, 198], [156, 164]]), P([[141, 207], [165, 177]])
        ];
        const lineaCajon = mat(0xf2c200, { roughness: 0.7 });
        const coloresAuto = [0xf2f2f2, 0x9aa1a7, 0x1b1d20, 0xc0262c, 0xd9dcdf, 0x2a5ea8, 0xf2f2f2, 0x6b7076];
        const estacionados = [];
        let k = 0;
        pasillos.forEach(p => {
            const a = p[0], b = p[1];
            const L = Math.hypot(b.x - a.x, b.y - a.y);
            const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L;
            const ang = Math.atan2(uy, ux);
            for (let s = 4; s < L - 3; s += 2.7) {
                [1, -1].forEach(lado => {
                    const cx = a.x + ux * s - uy * lado * 6, cy = a.y + uy * s + ux * lado * 6;
                    const lx = a.x + ux * (s - 1.35) - uy * lado * 6, ly = a.y + uy * (s - 1.35) + ux * lado * 6;
                    caja(0.12, 5, 0.01, lx, ly, 0.045, ang, lineaCajon, false);
                    k++;
                    if ((k * 7) % 10 < 4) estacionados.push({ x: cx, y: cy, ang: ang + (Math.PI / 2) * lado, color: coloresAuto[k % coloresAuto.length] });
                });
            }
        });
        kit.autosEstacionados(estacionados);
        // Isletas con plantas y luminarias del estacionamiento
        [[-38, 20], [-14, 38], [10, 56], [-60, 0], [-34, 70], [-10, 92], [70, 112], [100, 135], [130, 160], [150, 185], [35, 120]].forEach(([x, y]) => {
            kit.cilindro(1.6, 1.6, 0.25, x, y, 0, mat(0xd8d2c4), 20);
            kit.cilindro(1.35, 1.35, 0.27, x, y, 0, pasto, 20);
            kit.luminariaEstacionamiento(x, y, 0.65);
            kit.arbusto(x + 0.7, y + 0.3, 0.6, 0x4e8a3d);
        });

        // ---------- Edificios de la plaza (contornos de OpenStreetMap) ----------
        // Restaurante de comida rápida con autoservicio (esquina)
        const resto = P([[9, 49], [17, 54], [31, 37], [23, 31]]);
        kit.edificio(resto, 6.8, "#c9cdd0", { vidrio: "#2a3943", ancho: 0.7, colorPretil: "#4a2f25" });
        kit.caja(22.6, 9.8, 1.5, 20, 42.7, 6.2, -0.88, mat(0x4a2f25), true);
        kit.caja(4, 4, 9.8, 25.5, 33.5, 0, -0.88, mat(0xa54532, { roughness: 0.8 }));
        cinta(P([[40, 27], [20, 53], [15, 57], [10, 57], [7, 54], [6, 50], [7, 45], [28, 18]]), -2, 2, 0.05, asfalto, 6);
        // Locales (cafetería, pizzas)
        kit.edificio(P([[40, 90], [63, 58], [81, 71], [58, 103]]), 5.6, "#e3d6bf", { vidrio: "#2a3943", ancho: 0.7, colorPretil: "#5a4535" });
        // Club de precios (poniente)
        kit.edificio(P([[-164, 138], [-128, 46], [-67, 70], [-84, 112], [-103, 162], [-107, 160]]), 10.5, "#efefea", { colorPretil: "#1f5aa6", ancho: 0.1 });
        // Papelería, banco y cine
        kit.edificio(P([[-84, 112], [-49, 125], [-60, 154], [-69, 175], [-103, 162]]), 9, "#ecebe7", { colorPretil: "#3a3f44", ancho: 0.1 });
        kit.edificio(P([[-49, 125], [-30, 133], [-41, 161], [-60, 154]]), 8, "#f4f4f2", { vidrio: "#2a3943", ancho: 0.8, colorPretil: "#8e959b" });
        kit.edificio(P([[-129, 213], [-113, 219], [-106, 200], [-74, 213], [-71, 205], [-60, 178], [-69, 175], [-103, 162], [-107, 160]]), 14, "#2b3a4a", { colorPretil: "#1d2a33", ancho: 0.1 });
        // Plaza comercial (pasillo de locales)
        kit.edificio(P([[-41, 161], [-30, 133], [-23, 135], [7, 148], [42, 143], [52, 151], [99, 185], [152, 224], [165, 234], [155, 246], [58, 171], [22, 220], [1, 204], [-31, 244], [-38, 238], [-45, 247], [-50, 244], [-36, 228], [-45, 221], [-61, 209], [-71, 205], [-60, 178], [-69, 175], [-60, 154]]), 8.5, "#e9e1d0", { vidrio: "#2a3943", ancho: 0.85, colorPretil: "#c9b994" });
        // Walmart Supercenter, al fondo
        const walmart = P([[12, 234], [22, 220], [58, 171], [155, 246], [109, 306]]);
        kit.edificio(walmart, 11.5, "#e6e8ea", { colorPretil: "#1a4f9c", ancho: 0.08 });
        const frenteW = { a: { x: 58, y: 171 }, b: { x: 155, y: 246 } };
        const angW = Math.atan2(frenteW.b.y - frenteW.a.y, frenteW.b.x - frenteW.a.x);
        const nW = { x: Math.sin(angW), y: -Math.cos(angW) }; // hacia el estacionamiento
        // franja azul de la fachada y dos accesos con marquesina
        kit.caja(Math.hypot(97, 75) - 2, 0.4, 2.2, (58 + 155) / 2 + nW.x * 0.25, (171 + 246) / 2 + nW.y * 0.25, 9.3, angW, mat(0x1a4f9c, { roughness: 0.5 }));
        [0.32, 0.68].forEach(t => {
            const x = 58 + 97 * t + nW.x * 3, y = 171 + 75 * t + nW.y * 3;
            kit.caja(13, 6, 0.5, x, y, 4.6, angW, mat(0x1a4f9c, { roughness: 0.5 }));
            kit.caja(11, 0.3, 4.4, x - nW.x * 2.85, y - nW.y * 2.85, 0, angW, mat(0x2a3943, { roughness: 0.15, metalness: 0.3 }));
            [-5.8, 5.8].forEach(o => kit.cilindro(0.2, 0.2, 4.6, x + Math.cos(angW) * o + nW.x * 2.5, y + Math.sin(angW) * o + nW.y * 2.5, 0, mat(0xd8dadc), 10));
            kit.caja(4, 0.25, 1.4, x - nW.x * 2.9, y - nW.y * 2.9, 6.8, angW, mat(0xf2c200, { roughness: 0.5 }));
        });
        // Locales sueltos al oriente
        kit.edificio(P([[187, 175], [193, 166], [157, 141], [151, 149]]), 6, "#efe4d1", { colorPretil: "#7a6a56", vidrio: "#2a3943", ancho: 0.7 });

        // ---------- Lado sur: banqueta, barda blanca y acceso del fraccionamiento ----------
        const bardaPts = P([[-146, -136], [40, 5], [160, 97]]);
        const seTramo = cortarX(SURESTE, -130, 130);
        // banqueta entre la calzada y la barda
        const bordeSE = kit.desplazar(seTramo, 4.25);
        const bardaX = cortarX(bardaPts, -130, 130);
        kit.poligono([...bordeSE, ...bardaX.slice().reverse()], 0.14, banqueta, 3);
        franja(seTramo, 4.2, 4.5, 0, 0.15, guarnicion, guarnicion, 2);
        // barda (con hueco para el acceso en x≈40)
        const bardaMat = mat(0xf6f5f0);
        const tramoBarda = (xa, xb) => {
            const pts = cortarX(bardaPts, xa, xb);
            franja(pts, -0.15, 0.15, 0, 3.0, bardaMat, bardaMat, 3);
            franja(pts, -0.22, 0.22, 3.0, 3.15, mat(0xd8d6cf), mat(0xd8d6cf), 3);
        };
        tramoBarda(-130, 35);
        tramoBarda(45, 130);
        // caseta de vigilancia y pluma
        kit.caja(2.6, 2.6, 2.7, 44, -1, 0, 0.65, mat(0xf2f1ec));
        kit.caja(3.4, 3.4, 0.25, 44, -1, 2.7, 0.65, mat(0x9e3b2c));
        kit.caja(7, 0.12, 0.12, 39.5, 3.8, 1.0, 0.65, mat(0xe03b2f));
        kit.letreroTexto(3.2, 0.7, (g, w, h) => { g.fillStyle = "#3a3f44"; g.fillRect(0, 0, w, h); g.fillStyle = "#fff"; g.font = `bold ${h * 0.55}px Arial`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("MARINA 3", w / 2, h / 2); }, 36.2, 2.1, 3.3, 0.65 + Math.PI);
        cinta(P([[40, 5], [61, -21], [65, -41]]), -3.2, 3.2, 0.05, asfalto, 6);
        // árboles detrás de la barda y casas del fraccionamiento
        for (let x = -120; x <= 120; x += 10) {
            const pts = cortarX(bardaPts, x - 0.5, x + 0.5);
            if (pts.length < 2 || Math.abs(x - 40) < 8) continue;
            const a = pts[0], b = pts[1];
            const ang = Math.atan2(b.y - a.y, b.x - a.x);
            const o = 4 + (Math.abs(x) % 3);
            kit.arbol(a.x + Math.sin(ang) * o, a.y - Math.cos(ang) * o, 4 + (Math.abs(x) % 2), 8.5);
        }
        [[[66, -1], [77, 6], [69, 18], [58, 10]], [[79, 7], [92, 16], [83, 28], [70, 19]], [[94, 21], [106, 29], [97, 41], [86, 33]]].forEach(c => kit.edificio(P(c), 6.4, "#f1e4cd", { tinacos: 1, colorPretil: "#b8412f" }));
        // Calles y casas del fraccionamiento (dos pisos, mismo modelo, colores claros)
        const callesMarina = [P([[61, -21], [65, -41], [101, -92], [113, -111]]), P([[61, -21], [116, 20], [144, 41]]), P([[116, 20], [101, -92]]), P([[-65, -141], [-12, -103], [-25, -80], [14, -54], [61, -21]])];
        callesMarina.forEach(c => cinta(c, -3, 3, 0.05, asfalto, 6));
        cinta(P([[140, -104], [142, -90], [163, 46], [165, 59], [170, 67]]), -4.5, 4.5, 0.055, asfalto, 6);
        const coloresCasa = ["#f1e4cd", "#efe7da", "#f3dcc4", "#e8e2d4", "#f4eadb"];
        const ocupadas = [];
        callesMarina.forEach((c, ci) => {
            const linea = prepararRuta(c);
            [1, -1].forEach(lado => {
                for (let s = 8; s < linea.largo - 6; s += 9.5) {
                    const p = puntoEn(linea, s), u = direccionEn(linea, s, 1);
                    const off = 3 + 2.5 + 6;
                    const cx = p.x + u.y * off * lado, cy = p.y - u.x * off * lado;
                    if (Math.abs(cx - 40) < 14 && Math.abs(cy - 5) < 14) continue; // acceso
                    if (ocupadas.some(o => Math.hypot(o.x - cx, o.y - cy) < 9)) continue;
                    if (callesMarina.some(o => distanciaALinea(o, cx, cy) < 8.5)) continue;
                    if (distanciaALinea(bardaPts, cx, cy) < 7) continue;
                    ocupadas.push({ x: cx, y: cy });
                    const ang = Math.atan2(u.y, u.x);
                    const g = new THREE.BoxGeometry(8, 11, 6.2);
                    g.clearGroups(); g.addGroup(0, 24, 1); g.addGroup(24, 12, 0);
                    g.rotateZ(ang); g.translate(cx, cy, 3.1);
                    const color = coloresCasa[(ci * 7 + Math.round(s)) % coloresCasa.length];
                    const t = kit.texFachada(color, { vidrio: "#33424d" }).clone();
                    t.needsUpdate = true;
                    t.repeat.set(2, 2);
                    const m = new THREE.Mesh(g, [mat(0xd9d4cb), mat(0xffffff, { map: t })]);
                    m.castShadow = true; m.receiveShadow = true;
                    kit.grupo.add(m);
                    // alero de teja sobre la puerta, del lado de la calle
                    const alero = new THREE.Mesh(new THREE.BoxGeometry(8.6, 1.2, 0.25).rotateZ(ang), mat(0xb8412f));
                    alero.position.set(cx - u.y * lado * 5.9, cy + u.x * lado * 5.9, 3.1);
                    alero.castShadow = true;
                    kit.grupo.add(alero);
                    if ((ci + Math.round(s)) % 3 === 0) kit.tinaco(cx, cy, 6.2);
                }
            });
        });
        kit.poligono(P([[21, -14], [4, -27], [-19, -43], [-73, -86], [-66, -104], [-41, -84], [-24, -106], [-19, -101], [-28, -78], [51, -24], [21, -14]]), 0.03, pasto, 4);

        // ---------- Postes, luminarias y señales ----------
        const postes = [-110, -72, -34, 4, 42, 80, 118].map(s => { const p = N(s, 5.4); return kit.posteCFE(p.x, p.y, p.ang, s === 4); });
        kit.cables(postes);
        [-90, -55, -18, 22, 60, 98].forEach(s => { const p = N(s, 7.4); kit.luminaria(p.x, p.y, p.ang + Math.PI / 2, false, 9.5); });
        const bol = N(3, 7.2); kit.bolardo(bol.x, bol.y, 0xf2c200);
        [N(-48, 7.6), N(-26, 7.6)].forEach(p => kit.senalPreventiva(p.x, p.y, p.ang - Math.PI / 2));

        // ---------- Tráfico ----------
        const autosMov = [
            { marco: se, d: -1.9, desde: -130, hasta: 140, ciclo: 19, t: 4, color: 0xc0262c },
            { marco: se, d: 1.9, desde: -130, hasta: 140, ciclo: 23, t: 13, color: 0xf2f2f2 },
            { marco: no, d: -1.9, desde: -140, hasta: 130, ciclo: 21, t: 9, color: 0x2a5ea8 }
        ].map(v => ({ ...v, obj: kit.auto(0, 0, 0, v.color) }));
        const trafico = crearTrafico(kit, autosMov);

        const parada = N(0, 6.4);
        const C = (s, d, z) => { const p = N(s, d); return new THREE.Vector3(p.x, p.y, z); };
        return {
            grupo: kit.grupo,
            planos: kit.planos,
            lim: kit.lim,
            luces: kit.luces,
            caseta: { x: parada.x, y: parada.y, ang: parada.ang + Math.PI },
            combi: { marco: no, carril: 1.8, parar: 2.7, desde: -130, hasta: 130 },
            pasajeros: { marco: no, d: 6.0, puerta: 4.0 },
            animar: trafico,
            vistas: {
                inicio: { posicion: C(-17, 24, 10), objetivo: C(1, 4, 1.4) },
                calle: { posicion: C(6, -5.6, 1.65), objetivo: C(-1, 9, 2.4) },
                aerea: { posicion: new THREE.Vector3(-190, -110, 190), objetivo: new THREE.Vector3(20, 70, 0) }
            },
            entorno: [
                "Banqueta con franja de pasto y guarnición amarilla del lado de la plaza",
                "Estacionamiento de la plaza comercial con luminarias e isletas",
                "McDonald's con autoservicio en la esquina, junto a la parada",
                "Plaza Las Américas con Walmart Supercenter al fondo, Sam's Club, Office Depot, Santander y Cinépolis",
                "Camellón con árboles grandes de tronco encalado",
                "Barda blanca y caseta de acceso del fraccionamiento Marina 3 enfrente",
                "Postes de concreto con cableado sobre la banqueta"
            ]
        };
    }

    // ====================== BASE — Calle Tamarindo, Col. Benito Juárez ======================
    // Origen en el punto de la base (17.977166, -102.235471). Trazo de calles y
    // contorno de las casas de OpenStreetMap; la base, las combis, los árboles y
    // la cancha a partir de Google Street View (ago 2024) y de la imagen satelital.
    const EDIFICIOS_BASE = [["",-122.4,104.9,-121.9,90.8,-115.9,91,-115.9,90.1,-104.2,90.5,-104.3,92.3,-100.2,92.5,-100.7,105.6],["",-57.7,79.9,-74,77.6,-73.1,71.1,-71.5,71.4,-70.8,66.4,-56.1,68.4],["",-80.9,78.6,-97.8,77.5,-96.9,63.4,-80,64.5],["",-103.9,75.7,-120.8,73.9,-119.3,59.7,-102.4,61.4],["",-122.9,74.7,-135.3,73.2,-132.9,53.7,-124.4,54.7,-126.2,68.3,-122.2,68.8],["",-124.2,107.6,-140.3,107,-139.5,88.1,-123.5,88.7],["",-124.7,53.6,-124.5,44.2,-115.4,44.4,-115.6,53.8],["",-114.8,53.7,-114.7,48.7,-113.1,48.7,-113,40.4,-105.9,40.5,-106,53.8],["",-105.4,54.1,-105.1,44.5,-94.6,44.7,-94.8,54.3],["",-94.5,38.7,-94.6,54.5,-87.8,54.5,-87.7,38.8],["",-126.3,28.9,-128.4,10.1,-119.6,9.1,-117.6,27.9],["",-116.8,27.8,-118.9,8,-106.2,6.7,-104.6,21,-110.9,21.7,-110.3,27.1],["",-94.4,34.8,-101.3,35.2,-101.4,33.5,-108.5,33.8,-109.1,22.7,-95.1,22],["",-103.3,22,-105.4,6.9,-99.8,6.1,-97.8,21.3],["",-96.5,21.8,-98.8,6.8,-91,5.6,-88.7,20.7],["",-86.8,20.8,-88.7,5.4,-78.3,4.1,-76.4,19.5],["",-90.3,33.1,-91.6,21.7,-87.1,21.2,-85.7,32.6],["",-76.2,20.3,-75.2,30.6,-85.7,31.6,-86.7,21.3],["",-75.9,19.2,-77.8,6.5,-74.6,6,-75,3.4,-70.2,2.7,-67.9,18],["",-74,30.3,-75.3,19.4,-68.2,18.5,-66.8,29.4],["",-65.2,54.9,-64.6,41.9,-49.8,42.6,-50.4,55.5],["",-65.2,36.7,-67.4,18.2,-57.4,17.1,-55.3,35.6],["",-67.7,18,-69.9,1.9,-59.5,0.4,-57.2,16.5],["",-61.3,-22.6,-73.3,-21.7,-74.4,-36.5,-62.4,-37.4],["",-73.6,-21.8,-83.1,-20.6,-85.1,-35.2,-75.5,-36.5],["",-83.1,-19.3,-93.8,-17.8,-96.2,-34.3,-85.4,-35.8],["",-94,-17.1,-103.4,-15.8,-105.8,-32.9,-96.4,-34.2],["",-100.8,-2.3,-91.7,-3.4,-93.3,-16.7,-102.4,-15.6],["",-101.2,-1.6,-111.3,-0.4,-113,-14.4,-102.8,-15.6],["",-111.6,-15,-122.7,-13.3,-125.1,-29.3,-114,-30.9],["",-103.5,-16,-111.4,-14.9,-113.7,-30.8,-105.8,-31.9],["",-80.7,-4.9,-82.8,-20.2,-73.2,-21.5,-71.1,-6.1],["",-111.4,0.9,-120.4,2.2,-122.7,-13.2,-113.6,-14.5],["",-121.2,1.2,-130.1,2.3,-132,-12.5,-123.1,-13.5],["",-123,-14.2,-132.9,-12.8,-135.3,-28.9,-125.4,-30.3],["",-114.5,-92.9,-113,-80.9,-103.4,-82.1,-105.5,-99,-121.2,-97.1,-120.5,-92.1],["",-83.7,-43.3,-85,-56.2,-78.7,-56.8,-77.4,-43.9],["",-77.1,-43.2,-78.8,-59.4,-69.9,-60.3,-68.2,-44.1],["",-118.5,-54,-108.8,-55.2,-106.5,-37.6,-116.2,-36.3],["",-127.2,-53.2,-128.8,-64.2,-118.5,-65.6,-116.9,-54.7],["",-106.4,-39.9,-108.2,-53.8,-98.4,-55.1,-96.6,-41.1],["",-96.5,-43.3,-98,-56.1,-85.8,-57.5,-84.3,-44.6],["",-100.6,-72.9,-98.2,-55.9,-108.5,-54.4,-110.9,-71.5],["",-98.1,-56.5,-100.2,-73.7,-91.3,-74.8,-89.2,-57.6],["",-90.9,-75.3,-89,-57.8,-79.7,-58.8,-81.6,-76.3],["",-79.2,-59.7,-81.3,-76.6,-72.5,-77.6,-70.5,-60.7],["",-83.3,-87.9,-85.1,-106.8,-74.8,-107.8,-72.9,-88.9],["",-105.2,-102.1,-103.3,-87.6,-95.1,-88.6,-97,-103.1],["",-83.7,-88.3,-94.5,-87.3,-96.1,-103.7,-85.3,-104.7],["",-123.7,-86.3,-132.3,-85.4,-133.6,-96.6,-124.9,-97.5],["",-126.4,-35.7,-128.7,-52.5,-118.9,-53.8,-116.6,-37],["",-135.5,-34.8,-137.6,-51.1,-128.9,-52.2,-126.9,-35.9],["",-68.2,47.6,-74.5,47.8,-74.7,40.2,-68.4,40.1],["",-81.2,46.7,-81.4,39.4,-75.5,39.3,-75.4,46.5],["",-81.2,52.9,-81.4,48.1,-74.8,47.9,-74.7,52.8],["",-81.9,44.9,-83.9,44.9,-84,39.3,-81.9,39.3],["",-85.2,44.5,-87.3,44.5,-87.3,38.9,-85.3,38.9],["",-82.1,52.5,-87.4,52.3,-87.2,45.9,-81.8,46],["",49,45.8,45.5,29,59.1,26.2,59.6,28.5,71.2,26.1,74.3,40.5],["",75.1,39.7,73.5,30.9,82.8,29.2,84.4,38],["",89.4,30.7,84.1,31.8,83.5,29.1,98.5,26,99.8,32.5,90.2,34.5],["",66,66.7,66,61.4,86,59.4,86.9,68.8],["",80.5,59.1,78.5,49.6,88.2,47.6,90.2,57],["",-24.6,-47.6,-6.7,-50.4,-10.1,-81.5,-29.1,-78.9],["",34.8,-31.4,32.4,-41.6,46.9,-45.1,49.4,-34.9],["",43.8,21.4,41.5,11.6,43.3,11.1,42.4,7.2,40.6,7.6,38.4,-1.5,63.3,-7.2,65.6,3,53.2,5.8,55.1,13.9,66.4,11.3,67.5,15.9],["",112.5,-76.8,133.1,-81.9,124.6,-110.9,104.1,-106.4],["",126.5,-1.8,141,-6.1,138.2,-15.7,123.6,-11.3],["",124.3,-24.1,113.7,-67.1,126.9,-70.8,127.2,-68.2,133.9,-70.1,138,-55.2,132.4,-53.6,135.4,-40.7,141.7,-42.3,145,-29.9],["",36,-11.8,47.5,-14.7,44.8,-25.7,33.2,-22.9],["",11.7,-9.7,19.2,-11.1,18.5,-14.7,11,-13.3],["",76.2,-5.3,70.6,-30.2,81.5,-32.7,87.2,-7.8],["",62.1,-10.1,58,-28.6,64.3,-30,67,-18.1,71.9,-19.2,73.4,-12.6],["",36.3,-11.1,38.6,-2.6,60.7,-8.4,59.3,-13.5,49.7,-11,48.8,-14.3],["",25.8,-71.6,27.5,-62.5,43.8,-65.6,42.1,-74.7],["",53.7,-99.5,56.6,-90,71,-94.2,68.2,-103.8],["",57.8,-88.9,60.3,-79,71.4,-81.8,68.8,-91.8],["",44.8,-86.4,47,-77.3,58.6,-80.1,56.3,-89.2],["",32.7,-74.1,44.7,-76.5,42.9,-85.3,30.9,-82.9],["",48.3,-66.4,53.1,-47,72.3,-51.7,70.2,-60.1,66.4,-59.2,63.6,-70.2],["",65.2,-69.9,67.5,-60.7,76.8,-63,74.6,-72.2],["",49.6,-44.4,52.3,-33.9,81,-41.4,78.2,-51.8],["",84.7,32.5,89,31.7,89.6,35.2,99.7,33.4,100.3,36.5,85.8,39],["",89.6,47.9,91.7,57.5,98.4,56,96.3,46.4],["",97,46.5,99.4,55.3,107.1,53.3,104.8,44.4],["",94.4,62.7,90.6,63.3,89.7,58.4,93.5,57.8]];

    function zonaBase(THREE) {
        const kit = crearKit(THREE, { minX: -105, maxX: 138, minY: -92, maxY: 88 });
        const { mat, P, cinta, franja, punteada, caja, cilindro, poligono, grupo } = kit;
        kit.base(0xd9cfb6);

        const concreto = mat(0xd6d2c9, { map: kit.texConcreto(), roughness: 0.93 });
        const asfalto = mat(0xffffff, { map: kit.texAsfalto(), roughness: 0.95 });
        const tierra = mat(0xd2c4a2, { map: kit.texTierra(), roughness: 1 });
        const terraceria = mat(0xc2b18c, { map: kit.texTierra(), roughness: 1 });
        const pasto = mat(0xd8dcb0, { map: kit.texPasto(), roughness: 1 });
        const banqueta = mat(0xffffff, { map: kit.texBanqueta("#c9c4b9"), roughness: 0.95 });
        const guarnicion = mat(0xbdb8ad);
        const blancoRaya = mat(0xf2f2ec, { roughness: 0.7 });
        const amarilloRaya = mat(0xf2c200, { roughness: 0.6 });

        // ---------- Calles (OpenStreetMap) ----------
        const TAM = P([[-213.3, 18.4], [-203.7, 16.8], [-155.7, 10.4], [-55.2, -4.1], [29.6, -24.9], [96.5, -43.5]]);
        const LIB = P([[126.6, 61], [125.1, 54.4], [108.7, -16.9], [102.2, -45], [96.6, -69.4], [81.1, -136.6]]);
        const NAR = P([[42.2, 53.4], [29.6, -24.9], [16.1, -97.6]]);
        const NORTE = P([[-47, 40], [3.4, 42.9], [21.8, 48], [42.2, 53.4]]);
        const MANGO = P([[-47, 40], [-55.2, -4.1]]);
        const PAPAYA = P([[-55.2, -4.1], [-55.3, -42.7], [-57.3, -86.6]]);
        const NANCHE = P([[-208.9, -17.5], [-55.3, -42.7]]);
        const COCOYOL = P([[-203.8, -57.3], [-57.3, -86.6], [16.1, -97.6], [65.5, -108.5]]);
        const GOLONDRINA = P([[108.7, -16.9], [167.3, -35.5]]);
        const HALCONES = P([[96.6, -69.4], [156.8, -82.3]]);
        const ANDADOR = P([[-155.7, 10.4], [-150, 34.8], [-47, 40]]);
        const CERRADA = P([[-146.8, 78.9], [-43, 86.8], [-33.2, 137.6]]);

        // Calle Tamarindo: concreto hidráulico, sin banquetas, acotamientos de tierra
        cinta(TAM, -5.4, 5.4, 0.035, terraceria, 6);
        cinta(TAM, -3.75, 3.75, 0.06, concreto, 3.6);
        // calles de concreto de la colonia
        [PAPAYA, MANGO, NANCHE, COCOYOL, GOLONDRINA, HALCONES, CERRADA].forEach(c => {
            cinta(c, -4.6, 4.6, 0.033, terraceria, 6);
            cinta(c, -3.3, 3.3, 0.055, concreto, 3.6);
        });
        // terracerías: Calle Naranjo, la calle del norte y el andador
        [NAR, NORTE].forEach(c => cinta(c, -3.4, 3.4, 0.045, terraceria, 5));
        cinta(ANDADOR, -1.6, 1.6, 0.04, terraceria, 4);

        // Libramiento a Sicartsa: dos cuerpos de asfalto, camellón y banquetas
        cinta(LIB, -8.6, -0.9, 0.06, asfalto, 6);
        cinta(LIB, 0.9, 8.6, 0.06, asfalto, 6);
        franja(LIB, -0.9, 0.9, 0, 0.2, pasto, guarnicion, 3);
        franja(LIB, 8.6, 11.2, 0, 0.16, banqueta, guarnicion, 3);
        franja(LIB, -11.2, -8.6, 0, 0.16, banqueta, guarnicion, 3);
        [-4.75, 4.75].forEach(d => punteada(LIB, d, 0.075, 3, 6, 0.13, blancoRaya));
        [-8.35, 8.35].forEach(d => cinta(LIB, d - 0.07, d + 0.07, 0.072, blancoRaya, 4));
        [-1.15, 1.15].forEach(d => cinta(LIB, d - 0.06, d + 0.06, 0.072, amarilloRaya, 4));
        // árboles y luminarias del camellón del Libramiento
        const libM = marcoCalle(LIB, 104, -30);
        [-70, -40, -10, 20, 50, 80].forEach((s, i) => { const p = libM.en(s, 0); kit.luminaria(p.x, p.y, p.ang + Math.PI / 2, true, 10); if (i % 2) kit.arbolJoven(libM.en(s + 15, 0).x, libM.en(s + 15, 0).y); });

        const calles = [TAM, LIB, NAR, NORTE, MANGO, PAPAYA, NANCHE, COCOYOL, GOLONDRINA, HALCONES, ANDADOR, CERRADA];

        // ---------- Marco sobre Calle Tamarindo (s: metros desde la base, d: + al sur) ----------
        const tam = marcoCalle(TAM, 0, 0);
        const T = (s, d) => tam.en(s, d);
        const bordeNorte = x => { // y del borde norte del concreto para una x dada
            let mejor = null;
            for (let s = -120; s <= 120; s += 1) { const p = T(s, -3.75); if (!mejor || Math.abs(p.x - x) < Math.abs(mejor.x - x)) mejor = p; }
            return mejor.y;
        };

        // ---------- Patio de la base y cancha ----------
        const texPatio = kit.lienzo(512, 512, (g, w, h) => {
            g.fillStyle = "#b9a988"; g.fillRect(0, 0, w, h);
            kit.ruido(g, w, h, 9000, ["#ad9c7a", "#c4b594", "#a39270", "#cbbd9d", "#9a8a6a"], 3);
            // manchas de aceite y huellas de llantas
            for (let i = 0; i < 18; i++) {
                const x = Math.random() * w, y = Math.random() * h, r = 12 + Math.random() * 40;
                const gr = g.createRadialGradient(x, y, 0, x, y, r);
                gr.addColorStop(0, "rgba(45,38,30,.35)"); gr.addColorStop(1, "rgba(45,38,30,0)");
                g.fillStyle = gr; g.fillRect(0, 0, w, h);
            }
            g.strokeStyle = "rgba(80,68,50,.22)"; g.lineWidth = 9;
            for (let i = 0; i < 7; i++) { g.beginPath(); g.moveTo(Math.random() * w, 0); g.bezierCurveTo(Math.random() * w, h * 0.3, Math.random() * w, h * 0.7, Math.random() * w, h); g.stroke(); }
        });
        const patio = mat(0xffffff, { map: texPatio, roughness: 1 });
        const yN = [-48, -30, -10, 10, 26.6].map(x => ({ x, y: bordeNorte(x) + 0.4 }));
        poligono([...yN, { x: 30.6, y: 6 }, { x: 14, y: 9.5 }, { x: -12, y: 5 }, { x: -48, y: 3.2 }], 0.045, patio, 14);
        // cancha llanera de tierra (la mancha clara de la imagen satelital)
        const texCancha = kit.lienzo(512, 512, (g, w, h) => {
            g.fillStyle = "#cdb995"; g.fillRect(0, 0, w, h);
            kit.ruido(g, w, h, 12000, ["#c3ae89", "#d6c4a2", "#bba582", "#dccbab"], 3);
            for (let i = 0; i < 26; i++) { // matas de zacate seco
                const x = Math.random() * w, y = Math.random() * h, r = 6 + Math.random() * 22;
                const gr = g.createRadialGradient(x, y, 0, x, y, r);
                gr.addColorStop(0, "rgba(120,130,70,.45)"); gr.addColorStop(1, "rgba(120,130,70,0)");
                g.fillStyle = gr; g.fillRect(0, 0, w, h);
            }
        });
        poligono(P([[-44, 5.5], [5, 9.2], [7.5, 44], [-41, 41.5]]), 0.05, mat(0xffffff, { map: texCancha, roughness: 1 }), 46);
        const porteria = (x, y, ang) => {
            const tubo = mat(0xf1f1ec, { roughness: 0.5, metalness: 0.2 });
            [-3.6, 3.6].forEach(o => cilindro(0.06, 0.06, 2.3, x + Math.cos(ang) * o, y + Math.sin(ang) * o, 0, tubo, 8));
            caja(7.32, 0.11, 0.11, x, y, 2.3, ang, tubo);
        };
        porteria(-41.6, 23.6, Math.PI / 2 + 0.06);
        porteria(5.9, 26.4, Math.PI / 2 + 0.06);
        // baldío del otro lado de la calle: zacate alto y maleza
        const texZacate = kit.lienzo(256, 256, (g, w, h) => {
            g.fillStyle = "#8ea25a"; g.fillRect(0, 0, w, h);
            kit.ruido(g, w, h, 9000, ["#7f9550", "#9db068", "#6f8646", "#a9b874", "#b5ad6a"], 3);
        });
        const zacate = mat(0xffffff, { map: texZacate, roughness: 1 });
        const sN = [-52, -20, 10, 28].map(x => { const p = T(x - T(0, 0).x, 6.6); return { x: p.x, y: p.y }; });
        poligono([...sN, { x: 30, y: -45 }, { x: -6, y: -46.5 }, { x: -52, y: -40 }], 0.04, zacate, 8);
        let semilla = 11;
        const azar = () => { semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646; };
        for (let i = 0; i < 70; i++) {
            const x = -50 + azar() * 78, y = -12 - azar() * 33;
            const p = T(x - T(0, 0).x, 0);
            if (y > p.y - 7.2) continue;
            kit.maleza(x, y, 0.9 + azar() * 1.4);
        }

        // ---------- Casas (contornos de OpenStreetMap) ----------
        const PALETA = ["#f0c9c4", "#efe0b0", "#f3e7d3", "#cfe0d0", "#d6e4ee", "#f2d39a", "#ecebe5", "#c9a98a", "#e7c84a", "#b8d0a0", "#d7c4e0", "#e9b7a3", "#f3e7d3", "#ecebe5", "#9fc3c9"];
        const LAMINAS = ["#9aa0a3", "#8d6a4f", "#4f6f8f", "#a2483a"];
        const OFICINA_OSM = [11.7, -9.7];
        const OFICINA = [[11.7, -7.9], [19.2, -9.3], [18.5, -12.9], [11, -11.5]]; // 1.8 m al norte del contorno de OSM (Street View)
        const ESQUINA = [[36, -11.8], [47.5, -14.7], [44.8, -25.7], [33.2, -22.9]];
        const casas = [];
        EDIFICIOS_BASE.forEach((e, i) => {
            const pts = [];
            for (let k = 1; k < e.length; k += 2) pts.push({ x: e[k], y: e[k + 1] });
            if (Math.hypot(pts[0].x - OFICINA_OSM[0], pts[0].y - OFICINA_OSM[1]) < 0.5) return;
            if (Math.hypot(pts[0].x - ESQUINA[0][0], pts[0].y - ESQUINA[0][1]) < 0.5) return;
            const cen = centro(pts);
            if (cen.x < -112 || cen.x > 145 || cen.y < -100 || cen.y > 96) return;
            let s = (i * 7919 + 13) % 997 / 997;
            const sig = () => { s = (s * 9301 + 0.4927) % 1; return s; };
            const op = { color: PALETA[Math.floor(sig() * PALETA.length)], pisos: sig() < 0.3 ? 2 : 1 };
            const area = Math.abs(areaPoligono(pts));
            if (op.pisos === 2 && sig() < 0.35) op.colorAlto = PALETA[Math.floor(sig() * PALETA.length)];
            if (sig() < 0.3) op.zocalo = ["#7a5a48", "#4e7a8a", "#8a3a30", "#5d7a4a"][Math.floor(sig() * 4)];
            const r = sig();
            if (r < 0.16) { op.techo = "lamina"; op.pretil = false; op.colorLamina = LAMINAS[Math.floor(sig() * LAMINAS.length)]; op.tinaco = false; }
            else if (r < 0.22 && op.pisos === 2) { op.tipoMuro = "ladrillo"; op.obraAlta = true; op.pretil = false; op.varillas = true; }
            else if (r < 0.28) { op.tipoMuro = "block"; op.color = "#a3a09a"; }
            else if (r < 0.34) op.techo = "teja";
            if (area > 400) { op.pisos = 1; op.techo = "lamina"; op.techoAlto = 1.2; op.colorLamina = "#9aa0a3"; op.pretil = false; op.color = "#d9d6cf"; op.planta = ["cortina", "cortina", "puerta"]; }
            const calle = calles.reduce((m, l) => { const d = distanciaALinea(l, cen.x, cen.y); return d < m.d ? { d, l } : m; }, { d: Infinity, l: null }).l;
            casas.push(kit.casa(pts, calle, { ppm: Math.hypot(cen.x, cen.y) < 60 ? 40 : 24, ...op }));
        });
        // casa salmón de la esquina con Calle Naranjo (Street View: dos ventanas con herrería)
        kit.casa(P(ESQUINA), NAR, { pisos: 1, color: "#e2917f", planta: ["ventana", "puerta", "ventana"], colorPuerta: "#3d3a36", varillas: true, tinaco: false, banqueta: 1.1, ppm: 48 });

        // ---------- La base ----------
        // Oficina del checador: cuarto de block aplanado, crema, con letrero de la ruta
        kit.casa(P(OFICINA), TAM, {
            pisos: 1, color: "#eee6d4", zocalo: "#7b5a45", planta: ["puerta", "ventana"], colorPuerta: "#5a4030",
            varillas: false, tinaco: true, banqueta: false, ppm: 60,
            letrero: { x: 0.5, ancho: 6.4, texto: "BASE RUTA 2 · POLLO", color: "#1d2a33", fondo: "#f2c200" }
        });
        // plancha de concreto entre la oficina y la calle
        const losa = (pts, alto, material) => {
            const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(p => new THREE.Vector2(p.x, p.y))), { depth: alto, bevelEnabled: false });
            const uv = geo.attributes.uv;
            for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3.6, uv.getY(i) / 3.6);
            const m = new THREE.Mesh(geo, material);
            m.castShadow = true; m.receiveShadow = true;
            grupo.add(m);
            return m;
        };
        const plancha = P([[7.6, -10.6], [21.6, -13.2], [21.4, -18.1], [7.6, -14.9]]);
        losa(plancha, 0.24, concreto);
        // jardinera baja con plantas a la orilla de la calle (con paso al centro)
        const matJardinera = mat(0xd9d3c6, { map: kit.texMuro("#d9d3c6"), roughness: 0.95 });
        [[7.7, 12.8], [15.4, 21.2]].map(([x0, x1]) => [x0, bordeNorte(x0) + 0.95, x1, bordeNorte(x1) + 0.95]).forEach(([x0, y0, x1, y1]) => {
            const L = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(y1 - y0, x1 - x0);
            caja(L, 0.45, 0.55, (x0 + x1) / 2, (y0 + y1) / 2, 0, a, matJardinera);
            for (let k = 0.6; k < L - 0.3; k += 0.9) kit.arbusto(x0 + Math.cos(a) * k, y0 + Math.sin(a) * k, 0.45 + azar() * 0.25, [0x4f7f37, 0x5f8f40, 0x6b9a3d][k * 10 % 3 | 0]).position.z = 0.75;
        });
        // lona roja tendida desde la oficina sobre la plancha
        const tuboMat = mat(0x6d7378, { metalness: 0.6, roughness: 0.45 });
        [[9.6, -14.0], [19.8, -16.0]].forEach(([x, y]) => cilindro(0.045, 0.045, 2.45, x, y, 0.24, tuboMat, 8));
        const lona = new THREE.Mesh(new THREE.PlaneGeometry(10.8, 3.2, 8, 2), mat(0xb3262b, { side: THREE.DoubleSide, roughness: 0.75 }));
        {
            const p = lona.geometry.attributes.position;
            for (let k = 0; k < p.count; k++) p.setZ(k, -Math.sin((p.getX(k) / 10.8 + 0.5) * Math.PI) * 0.12);
            lona.geometry.computeVertexNormals();
            lona.position.set(14.6, -12.9, 2.62);
            lona.rotation.set(-0.12, 0, -0.19);
            lona.castShadow = true; lona.receiveShadow = true;
            grupo.add(lona);
        }
        // foco encendido bajo la lona (se prende de noche con las luminarias)
        const foco = new THREE.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffd98a, emissiveIntensity: 0.15, clippingPlanes: kit.planos });
        kit.luces.push(foco);
        [[12.2, -12.9], [17.0, -13.8]].forEach(([x, y]) => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), foco); b.position.set(x, y, 2.45); grupo.add(b); });
        // bancas de concreto, sillas de plástico rojas y una mesa
        const matBanca = mat(0xcac4b8, { roughness: 0.95 });
        [[12.0, -12.4], [16.6, -13.3]].forEach(([x, y]) => {
            caja(2.3, 0.42, 0.08, x, y, 0.66, -0.19, matBanca);
            [-0.9, 0.9].forEach(o => caja(0.16, 0.38, 0.42, x + Math.cos(-0.19) * o, y + Math.sin(-0.19) * o, 0.24, -0.19, matBanca));
        });
        const rojoSilla = mat(0xc0262c, { roughness: 0.55 });
        const silla = (x, y, ang) => {
            const g = new THREE.Group();
            const add = (w, d, h, px, py, pz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, d, h), rojoSilla); m.position.set(px, py, pz); m.castShadow = true; g.add(m); };
            add(0.44, 0.44, 0.04, 0, 0, 0.44);
            add(0.04, 0.44, 0.45, -0.21, 0, 0.68);
            [[-0.19, -0.19], [-0.19, 0.19], [0.19, -0.19], [0.19, 0.19]].forEach(([a, b]) => add(0.04, 0.04, 0.44, a, b, 0.22));
            g.position.set(x, y, 0.24); g.rotation.z = ang;
            grupo.add(g);
        };
        silla(12.4, -14.0, 1.2); silla(13.6, -14.5, 1.9); silla(18.4, -15.2, 2.6); silla(19.7, -14.6, -2.4);
        const blancoPlastico = mat(0xf0efe9, { roughness: 0.5 });
        caja(0.8, 0.8, 0.04, 13.0, -15.2, 0.94, 0.2, blancoPlastico);
        cilindro(0.05, 0.05, 0.7, 13.0, -15.2, 0.24, blancoPlastico, 8);
        // garrafones de agua y un tambo
        [[11.3, -11.95], [11.8, -12.05]].forEach(([x, y]) => cilindro(0.15, 0.15, 0.48, x, y, 0.24, mat(0x4f8fc7, { transparent: true, opacity: 0.8, roughness: 0.15 }), 12));
        cilindro(0.3, 0.3, 0.9, 20.7, -14.2, 0.24, mat(0x2f5f9f, { roughness: 0.6 }), 14);
        // pizarrón con el rol de salidas
        kit.letreroTexto(1.5, 1.0, (g, w, h) => {
            g.fillStyle = "#1f3a2c"; g.fillRect(0, 0, w, h);
            g.strokeStyle = "#8a6a45"; g.lineWidth = 10; g.strokeRect(0, 0, w, h);
            g.fillStyle = "#f4f1e8"; g.font = `bold ${h * 0.13}px Arial`; g.textAlign = "left";
            g.fillText("ROL DE SALIDAS", w * 0.08, h * 0.2);
            g.font = `${h * 0.1}px Arial`;
            ["29 · 06:00", "14 · 06:15", "07 · 06:30", "33 · 06:45", "21 · 07:00"].forEach((t, i) => g.fillText(t, w * 0.1, h * (0.36 + i * 0.13)));
        }, 17.0, -12.75, 1.75, -0.19);

        // ---------- Combis de la Ruta 2 ----------
        const combis = [];
        const ponerCombi = (x, y, ang, numero) => {
            const c = Modelos3D.crearCombi(THREE, { numero });
            c.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.material = o.material.clone(); o.material.clippingPlanes = kit.planos; } });
            c.position.set(x, y, 0);
            c.rotation.z = ang;
            grupo.add(c);
            combis.push(c);
            return c;
        };
        // en batería bajo los árboles, con el frente hacia la calle (Street View)
        ["14", "07", "33", "21", "18", "05", "26"].forEach((n, i) => {
            const x = -12 - i * 3.5;
            ponerCombi(x, bordeNorte(x) + 3.1, -0.78, n);
        });
        // en el patio, junto a la oficina y la esquina con Calle Naranjo
        ponerCombi(22.6, -9.2, -1.64, "11");
        ponerCombi(25.3, -8.4, -1.62, "02");
        ponerCombi(28.0, -7.6, -1.6, "31");
        ponerCombi(10.6, -5.3, Math.PI - 0.19, "16");
        ponerCombi(-3.6, -2.4, -1.35, "09");

        // ---------- Gente de la base ----------
        const piel = [0x8d5a3b, 0xa86f4c, 0x6e4630, 0xb98058];
        const persona = (x, y, ang, camisa, sentado = false, gorra = null, z = 0.24) => {
            const g = new THREE.Group();
            const m = c => mat(c, { roughness: 0.85 });
            const add = (geo, mm, px, py, pz, rx = 0, ry = 0) => { const o = new THREE.Mesh(geo, mm); o.position.set(px, py, pz); o.rotation.set(rx, ry, 0); o.castShadow = true; g.add(o); return o; };
            const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 4, 8).rotateX(Math.PI / 2); // cápsula vertical (z)
            const pierna = cap(0.075, 0.68);
            const pantalon = m([0x2b3a55, 0x3a3f44, 0x5a4535, 0x24282c][Math.abs(Math.round(x * 7)) % 4]);
            if (sentado) {
                [-0.1, 0.1].forEach(o => { add(cap(0.08, 0.36), pantalon, 0.2, o, 0.5, 0, Math.PI / 2); add(cap(0.07, 0.36), pantalon, 0.42, o, 0.24); });
            } else [-0.1, 0.1].forEach(o => add(pierna, pantalon, 0, o, 0.45));
            const z0 = sentado ? 0.5 : 0.95;
            add(cap(0.17, 0.32), m(camisa), 0, 0, z0 + 0.32).scale.set(0.75, 1.15, 1);
            [-0.24, 0.24].forEach(o => add(cap(0.055, 0.42), m(camisa), 0.02, o, z0 + 0.26, 0, 0.08));
            add(new THREE.SphereGeometry(0.115, 14, 10), m(piel[Math.abs(Math.round(y * 5)) % piel.length]), 0, 0, z0 + 0.74);
            add(new THREE.SphereGeometry(0.118, 14, 8, 0, Math.PI * 2, 0, 1.3), m(0x1b1714), -0.01, 0, z0 + 0.77);
            if (gorra) add(new THREE.CylinderGeometry(0.12, 0.125, 0.07, 14).rotateX(Math.PI / 2), m(gorra), 0, 0, z0 + 0.84);
            g.position.set(x, y, z);
            g.rotation.z = ang;
            grupo.add(g);
            return g;
        };
        persona(12.3, -13.95, 1.2, 0xf2c200, true);         // checador sentado
        persona(18.35, -15.15, 2.6, 0xf2f2f2, true);
        persona(19.65, -14.55, -2.4, 0x2f6fcf, true, 0xc0262c);
        persona(15.4, -15.9, -1.9, 0xf2c200, false, 0x1d1d1d); // checador con su tabla
        persona(9.2, -13.2, -2.2, 0x7a4fa0);
        persona(1.3, -9.4, 0.5, 0xd9532b, false, 0xf2f2f2, 0.05);  // chofer junto a su unidad
        persona(-20.5, 1.1, -0.9, 0x2e9e4f, false, null, 0.05);

        // ---------- Árboles (higueras, mangos y almendros que dan sombra a la base) ----------
        [
            [-6, 1.5, 6.2, 10.5], [5, 7.5, 5.6, 10], [-18, 3.2, 5.2, 9], [-30, 3.6, 4.6, 8.5], [-41.5, 3.4, 4.2, 8],
            [16, 3, 5.2, 10], [27, 1.5, 4.2, 9], [22, 17, 5.6, 10.5], [9, 21, 5, 10], [15, 34, 5, 9.5], [26, 40, 4.4, 9],
            [-1, 48, 4.2, 8.5], [-47, 19, 3.6, 7.5], [-47.5, 33, 3.6, 7.5], [-20, 47.5, 4.2, 8.5], [34, 30, 3.2, 7],
            [-9, -38, 4.4, 8.5], [15, -40, 4.6, 8.5], [-36, -31, 3.2, 6.5], [21, -63, 4, 8], [-40, 60, 4, 8], [60, 10, 3.6, 7.5]
        ].forEach(([x, y, r, h]) => kit.arbol(x, y, r, h));
        [[37, -3], [38, 4], [-52, -14], [-24, -19.5], [66, -26]].forEach(([x, y]) => kit.arbolJoven(x, y));
        [[-49, 8, 1.3], [-46, 12, 1.1], [31.5, 12, 1.2], [32, 20, 1.0], [-12, 7.2, 0.9], [8, 9.8, 1.0]].forEach(([x, y, r]) => kit.arbusto(x, y, r));
        [[48, 2, 10], [52, 20, 11.5]].forEach(([x, y, h]) => kit.palmera(x, y, h, 0.06));

        // ---------- Postes de la CFE, luminaria y cables ----------
        const s0 = T(0, 0);
        const postes = [-100, -64, -28, 8, 44, 80].map((s, i) => { const p = T(s, 6.2); return kit.posteCFE(p.x, p.y, p.ang, i === 2); });
        kit.cables(postes);
        { const p = T(8, 6.2); kit.luminaria(p.x, p.y, p.ang - Math.PI / 2, false, 8.6); }
        { const p = T(-64, 6.2); kit.luminaria(p.x, p.y, p.ang - Math.PI / 2, false, 8.6); }
        const postesN = [-36, 0].map(s => { const p = T(s, -6.4); return kit.posteCFE(p.x, p.y, p.ang); });
        kit.cables(postesN);

        // ---------- Torre de alta tensión (la línea cruza la colonia de norte a sur) ----------
        const matTorre = mat(0x9aa1a6, { metalness: 0.6, roughness: 0.45 });
        const matLinea = new THREE.LineBasicMaterial({ color: 0x70777c, clippingPlanes: kit.planos });
        const matCableAT = new THREE.LineBasicMaterial({ color: 0x59626a, transparent: true, opacity: 0.75, clippingPlanes: kit.planos });
        function torre(x, y, ang, alto = 34) {
            const base = 3.6, cima = 1.1;
            const esq = (z, k) => {
                const a = base + (cima - base) * Math.min(1, z / (alto * 0.8));
                const sx = k & 1 ? 1 : -1, sy = k & 2 ? 1 : -1;
                const lx = sx * a, ly = sy * a;
                return new THREE.Vector3(x + Math.cos(ang) * lx - Math.sin(ang) * ly, y + Math.sin(ang) * lx + Math.cos(ang) * ly, z);
            };
            const seg = [];
            const niveles = [];
            for (let z = 0; z <= alto * 0.8 + 0.01; z += alto * 0.8 / 9) niveles.push(z);
            niveles.push(alto);
            for (let i = 1; i < niveles.length; i++) {
                const z0 = niveles[i - 1], z1 = niveles[i];
                for (let k = 0; k < 4; k++) {
                    const orden = [0, 1, 3, 2];
                    const a0 = esq(z0, orden[k]), b0 = esq(z0, orden[(k + 1) % 4]), a1 = esq(z1, orden[k]), b1 = esq(z1, orden[(k + 1) % 4]);
                    seg.push(a0, a1, a0, b0, a0, b1, b0, a1);
                }
            }
            grupo.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg), matLinea));
            // patas gruesas para que se lea a distancia
            for (let k = 0; k < 4; k++) {
                const a = esq(0, k), b = esq(alto * 0.8, k);
                const L = a.distanceTo(b);
                const m = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, L, 6), matTorre);
                m.position.copy(a).add(b).multiplyScalar(0.5);
                m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
                m.castShadow = true;
                grupo.add(m);
            }
            // crucetas y puntos de amarre
            const amarres = [];
            [[alto * 0.62, 7], [alto * 0.76, 8.5], [alto * 0.9, 6]].forEach(([z, l]) => {
                const perp = ang;
                const cx = x, cy = y;
                const cr = caja(l * 2, 0.35, 0.35, cx, cy, z, perp, matTorre);
                cr.castShadow = true;
                [-1, 1].forEach(sg => {
                    const px = cx + Math.cos(perp) * sg * (l - 0.4), py = cy + Math.sin(perp) * sg * (l - 0.4);
                    cilindro(0.09, 0.09, 1.6, px, py, z - 1.6, mat(0xd8dde0, { roughness: 0.3 }), 8);
                    amarres.push(new THREE.Vector3(px, py, z - 1.6));
                });
            });
            return amarres;
        }
        const angLinea = 1.68; // dirección de la línea (casi norte-sur)
        const amarres = torre(-30, 62, angLinea - Math.PI / 2);
        amarres.slice(2).forEach(a => {
            [-1, 1].forEach(sg => {
                const pts = [];
                const L = 200;
                for (let j = 0; j <= 24; j++) {
                    const t = j / 24;
                    const d = sg * L * t;
                    const z = a.z + (-6 * t) - Math.sin(Math.PI * Math.min(1, t * 1.6)) * 5.5;
                    pts.push(new THREE.Vector3(a.x + Math.cos(angLinea) * d, a.y + Math.sin(angLinea) * d, z));
                }
                grupo.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), matCableAT));
            });
        });

        // ---------- Autos de la colonia ----------
        kit.auto(33.8, 14, Math.PI / 2 + 0.16, 0xf2f2f2, "pickup");
        kit.auto(34.9, 22.5, Math.PI / 2 + 0.16, 0xe9e9e6, "pickup");
        kit.auto(-58.6, -14, -Math.PI / 2, 0x9a1d22);
        kit.auto(-52.0, -27, Math.PI / 2, 0x2a2d31);
        kit.moto(21.2, -13.2, 1.2, 0xb02020);

        // ---------- Movimiento ----------
        // Una combi sale de la base hacia el Libramiento y otra regresa y se mete de reversa.
        const lado = (pts, d) => kit.desplazar(pts, d);
        const tramoDe = (pts, desdeX, hastaX) => kit.cortarX(pts, desdeX, hastaX);
        const carrilSurTam = lado(TAM, 1.9);   // hacia el oriente
        const carrilNorTam = lado(TAM, -1.9);  // hacia el poniente
        const libSur = lado(LIB, 6.1);         // hacia el sur (cuerpo poniente)
        const libNorte = lado(LIB, -6.1).slice().reverse(); // hacia el norte (cuerpo oriente)
        const suavizar = (pts, n = 6) => {
            const curva = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p.x, p.y, 0)), false, "centripetal");
            return curva.getSpacedPoints(Math.max(8, Math.round(curva.getLength() / 1.5))).map(v => ({ x: v.x, y: v.y }));
        };
        const desdeLibHaciaSur = libSur.filter(p => p.y < -50);
        const salida = prepararRuta(suavizar([
            { x: -3.6, y: -2.4 }, { x: -3.0, y: -6.5 }, { x: -1.0, y: -11.4 }, { x: 3.5, y: -14.6 },
            ...tramoDe(carrilSurTam, 9, 88), { x: 94.5, y: -43.5 }, { x: 98.0, y: -50.5 },
            ...desdeLibHaciaSur
        ]));
        const libNorteHasta = libNorte.filter(p => p.y < -52);
        const llegada = prepararRuta(suavizar([
            ...libNorteHasta, { x: 107.5, y: -46 }, { x: 102.5, y: -40.6 },
            ...tramoDe(carrilNorTam, 88, -12).reverse(), { x: -14.5, y: -11.6 }
        ]));
        const reversa = prepararRuta(suavizar([{ x: -14.5, y: -11.6 }, { x: -9.5, y: -11.5 }, { x: -5.6, y: -9.6 }, { x: -3.9, y: -6.0 }, { x: -3.6, y: -2.4 }]));
        const movil = combis[combis.length - 1]; // la #09, junto a la oficina
        const fases = [
            { tipo: "quieta", dur: 9 },
            { tipo: "ruta", ruta: salida, dur: 24, vuelta: false, facil: u => u * u * (3 - 2 * u) },
            { tipo: "oculta", dur: 6 },
            { tipo: "ruta", ruta: llegada, dur: 22, vuelta: false, facil: u => 1 - (1 - u) * (1 - u) },
            { tipo: "quieta", dur: 1.5, alFinal: llegada },
            { tipo: "ruta", ruta: reversa, dur: 7, vuelta: true, facil: u => u * u * (3 - 2 * u) }
        ];
        const ciclo = fases.reduce((s, f) => s + f.dur, 0);
        let t = 0;
        const colocar = (ruta, d, vuelta) => {
            const p = puntoEn(ruta, d);
            const dir = direccionEn(ruta, d, 1);
            movil.position.set(p.x, p.y, 0);
            movil.rotation.z = Math.atan2(dir.y, dir.x) + (vuelta ? Math.PI : 0);
        };
        const autosLib = [
            { ruta: prepararRuta(libSur.map(p => ({ x: p.x, y: p.y }))), v: 13, t: 2, obj: kit.auto(0, 0, 0, 0x2a5ea8) },
            { ruta: prepararRuta(lado(LIB, 2.6)), v: 15, t: 9, obj: kit.auto(0, 0, 0, 0xd9dcdf, "pickup") },
            { ruta: prepararRuta(libNorte), v: 14, t: 5, obj: kit.auto(0, 0, 0, 0x8a1d22) },
            { ruta: prepararRuta(lado(LIB, -2.6).slice().reverse()), v: 12, t: 13, obj: kit.auto(0, 0, 0, 0xf2f2f2) },
            { ruta: prepararRuta(carrilNorTam.slice().reverse()), v: 7, t: 4, obj: kit.moto(0, 0, 0, 0x1d4fa0) }
        ];
        const animar = dt => {
            t = (t + dt) % ciclo;
            let r = t;
            for (const f of fases) {
                if (r < f.dur) {
                    movil.visible = f.tipo !== "oculta";
                    if (f.tipo === "ruta") colocar(f.ruta, f.ruta.largo * f.facil(r / f.dur), f.vuelta);
                    else if (f.tipo === "quieta" && f.alFinal) colocar(f.alFinal, f.alFinal.largo - 0.02, false);
                    else if (f.tipo === "quieta") { movil.position.set(-3.6, -2.4, 0); movil.rotation.z = -1.35; }
                    break;
                }
                r -= f.dur;
            }
            autosLib.forEach(a => {
                a.t = (a.t + dt) % (a.ruta.largo / a.v);
                const d = a.t * a.v;
                const p = puntoEn(a.ruta, d), dir = direccionEn(a.ruta, d, 1);
                a.obj.position.set(p.x, p.y, 0);
                a.obj.rotation.z = Math.atan2(dir.y, dir.x);
            });
        };

        const C = (x, y, z) => new THREE.Vector3(x, y, z);
        return {
            grupo: kit.grupo,
            planos: kit.planos,
            lim: kit.lim,
            luces: kit.luces,
            caseta: null,
            combi: null,
            animar,
            nombreInicio: "La base",
            puntoLuz: { x: 14.5, y: -13.8, z: 5.5 }, // foco bajo la lona de la oficina
            vistas: {
                inicio: { posicion: C(30, -33, 8.5), objetivo: C(4, -7, 1.2) },
                calle: { posicion: C(4.5, -22, 1.65), objetivo: C(-14, -6, 1.6) },
                aerea: { posicion: C(-70, -125, 120), objetivo: C(8, -6, 0) }
            },
            entorno: [
                "Base de la Ruta 2 sobre Calle Tamarindo, a 35 m de la esquina con Calle Naranjo",
                "Oficina del checador con plancha de concreto, bancas, sillas y lona roja",
                "Combis estacionadas en batería bajo higueras y mangos, con el frente hacia la calle",
                "Patio de tierra para las unidades y cancha llanera detrás",
                "Calle Tamarindo de concreto hidráulico, sin banquetas; enfrente, un baldío con zacate alto",
                "Torre de alta tensión al norte y postes de la CFE sobre la calle",
                "Al oriente, el Libramiento a Sicartsa: por ahí salen las combis hacia la Parada A"
            ]
        };
    }

    window.Zonas3D = { A: zonaA, H: zonaB, base: zonaBase }; // zonaB es la Parada H (Plaza Las Américas)
})();
