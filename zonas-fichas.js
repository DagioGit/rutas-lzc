// Fichas de las maquetas de las paradas B a G e I.
//
// Calles, edificios y áreas salen de OpenStreetMap (zonas-datos.js); lo que va
// aquí es lo que se vio en Google Street View (agosto de 2024): qué calle es
// la de la parada, camellones, edificios que se reconocen, bardas, colores y
// letreros. zonas-paradas.js arma la maqueta con el mismo kit de la A y la H.

(function () {
    const Z = window.registrarZonaOSM;
    if (!Z) return;

    // ---------- utilidades para los detalles ----------
    // Barda a lo largo de la calle de la parada, entre s0 y s1, a d metros del eje.
    function bardaCalle(ctx, s0, s1, d, alto, material, grosor = 0.2, z0 = 0.15) {
        const { N, caja } = ctx;
        for (let s = s0; s < s1; s += 3) {
            const a = N(s, d), b = N(Math.min(s + 3, s1), d);
            const L = Math.hypot(b.x - a.x, b.y - a.y);
            caja(L + 0.05, grosor, alto, (a.x + b.x) / 2, (a.y + b.y) / 2, z0, Math.atan2(b.y - a.y, b.x - a.x), material);
        }
    }
    // Letrero con texto, de frente a la calle de la parada (mirando hacia d < 0).
    function letrero(ctx, s, d, z, ancho, alto, texto, fondo, color = "#ffffff", girar = 0) {
        const { N, kit } = ctx;
        const p = N(s, d);
        return kit.letreroTexto(ancho, alto, (g, w, h) => {
            g.fillStyle = fondo; g.fillRect(0, 0, w, h);
            g.fillStyle = color; g.font = `bold ${h * 0.56}px Arial`; g.textAlign = "center"; g.textBaseline = "middle";
            g.fillText(texto, w / 2, h / 2 + 1);
        }, p.x, p.y, z, p.ang + girar);
    }
    // Torre de celosía (alta tensión o estructura de subestación)
    function celosia(ctx, x, y, alto, base, ang = 0, color = 0xb8bcc0) {
        const { kit, THREE, mat } = ctx;
        const m = mat(color, { metalness: 0.5, roughness: 0.5 });
        const g = new THREE.Group();
        const top = base * 0.28;
        [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([i, j]) => {
            const a = new THREE.Vector3(i * base / 2, j * base / 2, 0), b = new THREE.Vector3(i * top / 2, j * top / 2, alto);
            const L = a.distanceTo(b);
            const pata = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, L, 5), m);
            pata.position.copy(a.clone().add(b).multiplyScalar(0.5));
            pata.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
            g.add(pata);
        });
        for (let z = 2; z < alto; z += 2.2) {
            const w = base + (top - base) * (z / alto);
            [0, Math.PI / 2].forEach(r => {
                const t = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, 0.06), m);
                t.position.set(0, 0, z); t.rotation.z = r; g.add(t);
                const d = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(w, 2.2), 0.05, 0.05), m);
                d.position.set(0, (r ? 0 : 1) * w / 2 * 0, z - 1.1); d.rotation.set(0, Math.atan2(2.2, w), r); g.add(d);
            });
        }
        g.position.set(x, y, 0); g.rotation.z = ang;
        g.traverse(o => { if (o.isMesh) o.castShadow = true; });
        kit.grupo.add(g);
        return g;
    }
    // Mesas y sillas de plástico de una fonda
    function mesas(ctx, s0, d0, n, colorSilla = 0xd8312b) {
        const { N, caja, cilindro, mat } = ctx;
        for (let i = 0; i < n; i++) {
            const p = N(s0 + i * 1.9, d0 + (i % 2) * 0.9);
            caja(0.9, 0.9, 0.04, p.x, p.y, 0.72, p.ang, mat(0xf4f4f0));
            ctx.kit.cilindro(0.04, 0.04, 0.72, p.x, p.y, 0, mat(0x777777), 6);
            [[0.75, 0], [-0.75, 0]].forEach(([a]) => {
                const q = N(s0 + i * 1.9 + a, d0 + (i % 2) * 0.9);
                caja(0.42, 0.42, 0.45, q.x, q.y, 0, q.ang, mat(colorSilla, { roughness: 0.5 }));
                caja(0.42, 0.06, 0.45, q.x + Math.cos(q.ang) * a * 0.25, q.y + Math.sin(q.ang) * a * 0.25, 0.45, q.ang + Math.PI / 2, mat(colorSilla, { roughness: 0.5 }));
            });
        }
    }

    // ====================== B · Clínica Fátima ======================
    // Av. Melchor Ocampo dividida por un camellón de concreto con guarnición amarilla y
    // árboles jóvenes. La parada va en el carril hacia el sureste, del lado de los locales;
    // enfrente, la Clínica Fátima (tres pisos, columnas azul marino) y su farmacia 24 h.
    Z("B", {
        divididas: {
            "Avenida Melchor Ocampo": { camellon: 3.4, tipo: "concreto", arboles: 9 },
            "Avenida Francisco Zarco": { camellon: 2.6, tipo: "pasto", arboles: 12 }
        },
        ruta: { nombre: "Avenida Melchor Ocampo", s: -4 },
        calles: { "Avenida Melchor Ocampo": { estacionados: 1 } },
        locales: 0.45, pisos2: 0.45,
        especiales: [
            { en: [9, 31], op: { tipo: "comercio", alto: 10.5, color: "#eef0f1", colorPretil: "#1f2f5c", vidrio: "#2b3b4c", vanos: 0.55, letrero: { texto: "FATIMA CLINICA", fondo: "#1f2f5c", ancho: 11, alto: 1.5, z: 8.4 } } },
            { en: [27, 20], op: { tipo: "comercio", alto: 10.5, color: "#eef0f1", colorPretil: "#1f2f5c", vidrio: "#2b3b4c", vanos: 0.55 } }
        ],
        palmeras: [[20, 10, 7], [24, 13, 8], [-2, 47, 7.5]],
        extra(ctx) {
            const { N, porId, caja, mat } = ctx;
            const r = porId("ruta");
            // farmacia y cajones con el de discapacidad pintado de azul, frente a la clínica
            letrero(ctx, 30, -(r.mitad + r.camIzq * 2 + 10.5), 3.0, 5, 0.8, "FARMACIA FATIMA 24 HRS", "#c0262c", "#ffffff", Math.PI);
            // locales con techo de lámina del lado de la parada
            const p = N(-22, r.mitad + r.banq + 2.2);
            caja(16, 4.5, 0.1, p.x, p.y, 3.2, p.ang, mat(0x9aa0a3, { metalness: 0.4, roughness: 0.5 }));
            [-7.8, 7.8].forEach(o => { const q = N(-22 + o, r.mitad + r.banq + 0.2); ctx.kit.cilindro(0.06, 0.06, 3.2, q.x, q.y, 0, mat(0x6e6a64), 6); });
        },
        entorno: [
            "Av. Melchor Ocampo dividida por un camellón de concreto con guarnición amarilla y árboles jóvenes",
            "Clínica Fátima enfrente: tres pisos, columnas azul marino y Farmacia Fátima 24 horas",
            "Locales con techo de lámina y casas de dos pisos del lado de la parada",
            "Cruce con Av. Francisco Zarco a unos pasos, hacia el norte",
            "Palmas y autos estacionados frente a la clínica"
        ]
    });

    // ====================== C · CFE ======================
    // Av. Autonomía Universitaria con un camellón ancho de pasto y árboles. La parada queda
    // en la banqueta de la subestación eléctrica de la CFE: barda de concreto gris, letrero
    // verde «Subestación certificada» y las estructuras de acero detrás. Enfrente, terrenos
    // abiertos con una torre de alta tensión.
    Z("C", {
        divididas: { "Avenida Autonomía Universitaria": { camellon: 5, tipo: "pasto", arboles: 8, banqueta: 3.2 } },
        ruta: { nombre: "Avenida Autonomía Universitaria", s: 0 },
        areas: { parking: { tipo: "pasto", arboles: true, densidad: 260 }, industrial: { tipo: "terraceria" } },
        relleno: { evitar: [[[-80, 26], [62, -14], [62, -110], [-80, -110]]] },
        especiales: [
            { en: [-37, -20], op: { tipo: "comercio", alto: 5, color: "#d9d6cf", colorPretil: "#9aa0a3", vanos: 0.15 } },
            { en: [-40, -56], op: { tipo: "comercio", alto: 5, color: "#d9d6cf", colorPretil: "#9aa0a3", vanos: 0.15 } }
        ],
        extra(ctx) {
            const { N, porId, mat, kit } = ctx;
            const r = porId("ruta");
            const dB = r.mitad + r.banq + 0.25;
            const concreto = mat(0xffffff, { map: kit.texConcreto(), roughness: 0.95 });
            bardaCalle(ctx, -62, 52, dB, 3.1, concreto, 0.3);
            letrero(ctx, 14, dB - 0.2, 1.9, 2.6, 2.0, "CFE · SUBESTACIÓN", "#1c8a4a", "#ffffff", Math.PI);
            // alambre de púas sobre la barda
            for (let s = -62; s < 52; s += 0.5) { const p = N(s, dB); kit.cilindro(0.18, 0.18, 0.02, p.x, p.y, 3.35, mat(0x8c9196, { metalness: 0.6 }), 8); }
            // estructuras de acero y torres dentro de la subestación
            [[-48, 14], [-30, 14], [-12, 14], [6, 14], [24, 14]].forEach(([s, o]) => {
                const p = N(s, dB + o);
                celosia(ctx, p.x, p.y, 11, 2.2, p.ang);
                const q = N(s, dB + o + 9); celosia(ctx, q.x, q.y, 11, 2.2, q.ang);
                const v = N(s, dB + o + 4.5); kit.caja(9.5, 0.25, 0.25, v.x, v.y, 10.6, p.ang + Math.PI / 2, mat(0xb8bcc0, { metalness: 0.5 }));
            });
            [[-40, 26], [-16, 28], [10, 26]].forEach(([s, o]) => {
                const p = N(s, dB + o);
                kit.caja(5, 3.5, 3.6, p.x, p.y, 0, p.ang, mat(0x8e979c, { metalness: 0.3 }));
                kit.caja(5.4, 0.5, 1.2, p.x, p.y, 3.6, p.ang, mat(0x6b7378, { metalness: 0.3 }));
            });
            const t = N(30, -r.mitad - r.camIzq * 2 - 30);
            celosia(ctx, t.x, t.y, 28, 5, 0.3, 0xc2c5c8);
            const t2 = N(-70, -r.mitad - r.camIzq * 2 - 40);
            celosia(ctx, t2.x, t2.y, 28, 5, 0.3, 0xc2c5c8);
        },
        entorno: [
            "Barda gris de la subestación eléctrica de la CFE a todo lo largo de la banqueta",
            "Letrero verde de la CFE y estructuras de acero de la subestación detrás de la barda",
            "Banqueta ancha de concreto con guarnición amarilla",
            "Camellón ancho de pasto con árboles grandes",
            "Enfrente, terrenos abiertos con una torre de alta tensión y bodegas al fondo"
        ]
    });

    // ====================== D · ISSSTE · Tec de Monterrey ======================
    // Av. Melchor Ocampo con camellón ancho de primaveras y palmas. La parada va del lado sur,
    // frente a los locales y el Tec de Monterrey; enfrente, Bodega Aurrera y el Parque Erandeni.
    Z("D", {
        divididas: { "Avenida Melchor Ocampo": { camellon: 6, tipo: "tierra", arboles: 7, palmas: true, colorArbol: 0xb8b23a } },
        ruta: { nombre: "Avenida Melchor Ocampo", s: 4 },
        relleno: { evitar: [[[-80, 3], [80, 3], [80, -7], [-80, -7]]] },
        locales: 0.5,
        especiales: [
            { nombre: "Tecnológico de Monterrey Campus Lázaro Cárdenas", op: { tipo: "comercio", alto: 13, color: "#f4f4f2", colorPretil: "#e5702a", vidrio: "#33424d", vanos: 0.5, letrero: { texto: "TEC DE MONTERREY", fondo: "#1d4f91", ancho: 8, alto: 1.1, z: 10.5 } } },
            { en: [-14, -10], op: { tipo: "comercio", alto: 6, color: "#f4f4f2", colorPretil: "#d5d5d0", vidrio: "#2b3b4c", vanos: 0.7, letrero: { texto: "HONDA", fondo: "#ffffff", color: "#d71920", ancho: 4.5, alto: 1, z: 4.2 } } },
            { en: [-5, -10], op: { tipo: "comercio", alto: 5, color: "#f2f2ef", colorPretil: "#e3e3df", vidrio: "#2b3b4c", vanos: 0.6 } },
            { en: [10, -20], op: { tipo: "comercio", alto: 5.5, color: "#f2f2ef", colorPretil: "#e3e3df", vidrio: "#2b3b4c", vanos: 0.6 } },
            { en: [28, -20], op: { tipo: "comercio", alto: 8, color: "#eae6dd", colorPretil: "#b23b2e", vidrio: "#2b3b4c", vanos: 0.6 } },
            { nombre: "Inbursa", op: { tipo: "comercio", alto: 7, color: "#f2f2ef", colorPretil: "#1e3a6e", vanos: 0.6, letrero: { texto: "INBURSA", fondo: "#1e3a6e", ancho: 4, alto: 0.9 } } },
            { nombre: "Centro de Atención Telcel", op: { tipo: "comercio", alto: 7, color: "#f2f2ef", colorPretil: "#1f4aa0", vanos: 0.6, letrero: { texto: "TELCEL", fondo: "#1f4aa0", ancho: 4, alto: 0.9 } } },
            { nuevo: [[-60, 88], [-18, 88], [-18, 120], [-60, 120]], op: { tipo: "comercio", alto: 9, color: "#f0f2ee", colorPretil: "#2e9b3e", vanos: 0.1, letrero: { texto: "BODEGA AURRERA", fondo: "#2e9b3e", color: "#ffd200", ancho: 12, alto: 1.8, z: 6.5 } } }
        ],
        extra(ctx) {
            const { N, porId, mat, kit } = ctx;
            const r = porId("ruta");
            // franja de estacionamiento en batería frente a los locales (del lado de la parada)
            const d0 = r.mitad + r.banq, d1 = d0 + 5.5;
            const L = [];
            for (let s = -70; s <= 70; s += 2) { const p = N(s, 0); L.push({ x: p.x, y: p.y }); }
            const tramo = (a, b) => L.filter((p, i) => { const s = -70 + i * 2; return s >= a && s <= b; });
            [[-70, -6], [8, 70]].forEach(([a, b]) => {
                kit.cinta(tramo(a, b), d0, d1, 0.06, mat(0xd8d8d8, { map: kit.texAsfalto(), roughness: 0.95 }), 6);
                kit.franja(tramo(a, b), d1, d1 + 1.8, 0, 0.15, mat(0xffffff, { map: kit.texBanqueta(), roughness: 0.95 }), mat(0xbdb8ad), 3);
            });
            const autos = [];
            for (let s = -66; s < 66; s += 2.8) {
                if (s > -9 && s < 11) continue;
                const k = Math.round((s + 66) / 2.8);
                const p = N(s, d0 + 2.7);
                if ((k * 7) % 10 < 6) autos.push({ x: p.x, y: p.y, ang: p.ang + Math.PI / 2, color: [0xf2f2f2, 0x2a5ea8, 0x1b1d20, 0xc0262c, 0x9aa1a7][k % 5] });
                const q = N(s - 1.4, d0 + 2.7); kit.caja(0.12, 5, 0.01, q.x, q.y, 0.07, q.ang + Math.PI / 2, mat(0xf4f4f0), false);
            }
            kit.autosEstacionados(autos);
        },
        entorno: [
            "Av. Melchor Ocampo con camellón ancho de primaveras, palmas y guarnición amarilla",
            "Del lado de la parada: agencia Honda, locales de un piso y el Tec de Monterrey (edificio blanco con franja naranja)",
            "Enfrente: Bodega Aurrera con su estacionamiento y el Parque Erandeni",
            "Autos estacionados en batería frente a los locales y autobuses de Estrella de Oro",
            "Glorieta General Paúl González al poniente"
        ]
    });

    // ====================== E · Central de autobuses ======================
    // Calle Mariano Matamoros, de un solo sentido y angosta, por donde bajan las combis al
    // centro. Del lado de la parada, la barda crema del Hotel Sol del Pacífico con plantas;
    // enfrente, la barda de ladrillo aparente de un terreno con zacate. Al final, la calle
    // General Mina con palmas y locales.
    Z("E", {
        ruta: { nombre: "Calle Mariano Matamoros", s: -26 },
        inicio: [-20, 0, 9.5],
        calles: { "Calle Mariano Matamoros": { ancho: 6.4, banqueta: 1.8 }, "Calle General Francisco Javier Mina": { estacionados: true } },
        pisos2: 0.5, locales: 0.35,
        especiales: [
            { nombre: "Hotel Sol del Pacífico", op: { tipo: "comercio", alto: 12, color: "#f1e9d8", colorPretil: "#c79a62", vidrio: "#2b3b4c", vanos: 0.55 } },
            { nombre: "Banamex", op: { tipo: "comercio", alto: 7, color: "#f2f2ef", colorPretil: "#1b3f8f", vanos: 0.6 } },
            { nombre: "Viña del Mar", op: { tipo: "comercio", alto: 12, color: "#e4573d", colorPretil: "#f2f2ef", vanos: 0.5 } },
            { nombre: "Yunuen", op: { tipo: "comercio", alto: 9, color: "#f2f2ef", colorPretil: "#c0262c", vanos: 0.5 } }
        ],
        palmeras: [[28, -8, 10], [36, -2, 11], [18, 12, 9], [44, 6, 10]],
        extra(ctx) {
            const { porId, mat, kit } = ctx;
            const r = porId("ruta");
            const crema = mat(0xffffff, { map: kit.texMuro("#eee5d0", "aplanado"), roughness: 0.95 });
            bardaCalle(ctx, -70, -4, r.mitad + r.banq + 0.2, 2.6, crema, 0.25);
            const ladrillo = mat(0xffffff, { map: kit.texMuro("#b5653f", "ladrillo"), roughness: 0.95 });
            bardaCalle(ctx, -62, -12, -(r.mitad + r.banq + 0.2), 2.4, ladrillo, 0.2);
            // zacate del terreno detrás de la barda de ladrillo
            for (let s = -60; s < -14; s += 3) { const p = ctx.N(s, -(r.mitad + r.banq + 3 + (s % 5))); kit.maleza(p.x, p.y, 1.1); }
            // arbustos frente a la barda del hotel
            for (let s = -66; s < -8; s += 4.5) { const p = ctx.N(s, r.mitad + r.banq - 0.5); kit.arbusto(p.x, p.y, 0.7 + (Math.abs(s) % 3) * 0.2, 0x5b8c3f); }
        },
        entorno: [
            "Calle Mariano Matamoros, angosta y de un solo sentido, por donde bajan las combis",
            "Barda crema del Hotel Sol del Pacífico con plantas del lado de la parada",
            "Enfrente, barda de ladrillo aparente de un terreno con zacate",
            "Al fondo, la calle General Mina con palmas, grúas y locales",
            "La Central Estrella de Oro y Plaza Zirahuén a cuatro minutos a pie"
        ]
    });

    // ====================== F · Centro · Mercado Hidalgo ======================
    // Av. Heroica Escuela Naval Militar, en el centro: dos sentidos separados por un camellón
    // angosto. La parada va del lado norte, junto al Andador Nayarit; en la esquina, la tienda
    // de abarrotes azul de dos pisos y, más adelante, la casa cubierta de enredadera.
    Z("F", {
        divididas: { "Avenida Heroica Escuela Naval Militar": { camellon: 2.4, tipo: "pasto", arboles: 14 } },
        ruta: { nombre: "Avenida Heroica Escuela Naval Militar", s: -8 },
        calles: { "Andador Nayarit": { ancho: 5.4, banqueta: 1.2, estacionados: true } },
        pisos2: 0.45, locales: 0.4,
        especiales: [
            { en: [25, 3], op: { pisos: 2, color: "#3d6fb0", colorAlto: "#f2f2ef", planta: ["cortina", "cortina", "puerta"], letrero: { x: 0.6, ancho: 6, texto: "ABARROTES", color: "#ffffff", fondo: "#d4262b" } } },
            { en: [-20, 15], op: { pisos: 1, color: "#557a33", techo: "teja", planta: ["ventana", "puerta", "ventana"] } },
            { en: [-24, 18], op: { pisos: 1, color: "#557a33", techo: "teja" } },
            { nombre: "Mercado Hidalgo", op: { tipo: "comercio", alto: 8, color: "#e8dcc4", colorPretil: "#2f6f3e", vanos: 0.4, letrero: { texto: "MERCADO HIDALGO", fondo: "#2f6f3e", ancho: 9, alto: 1.3 } } },
            { nombre: "Funeraria San Miguel", op: { tipo: "comercio", alto: 6.5, color: "#f2efe8", colorPretil: "#3b2f5c", vanos: 0.5 } },
            { nombre: "El Escorial", op: { tipo: "comercio", alto: 9, color: "#f3e3c3", colorPretil: "#a0522d", vanos: 0.55 } }
        ],
        areas: { "Tierra Caliente": { arboles: true, densidad: 70 } },
        arboles: [[-8, -30, 4.2, 9], [18, -28, 3.8, 8.5], [-40, -14, 3.5, 8]],
        palmeras: [[-35, 6, 6.5], [-31, 7, 7]],
        entorno: [
            "Av. Heroica Escuela Naval Militar en el centro, con dos sentidos y camellón angosto",
            "Tienda de abarrotes azul de dos pisos en la esquina con el Andador Nayarit",
            "Casa cubierta de enredadera con techo de teja junto a la parada",
            "Enfrente, locales de dos pisos y árboles grandes",
            "Parque Tierra Caliente a un minuto y Mercado Hidalgo a tres"
        ]
    });

    // ====================== G · Soriana ======================
    // Prolongación Tulipanes dividida por un camellón de pasto con árboles jóvenes. La parada
    // queda junto a la barda lateral de Soriana Mercado: ladrillo, franja roja y lámina gris,
    // con un talud de piedra bola. Enfrente, los edificios de departamentos de cuatro pisos.
    Z("G", {
        divididas: { "Prolongación Tulipanes": { camellon: 4.6, tipo: "pasto", arboles: 10 } },
        ruta: { nombre: "Prolongación Tulipanes", s: 0 },
        calles: { "Prolongación Tulipanes": { banqueta: 2.2 } },
        especiales: [
            { nombre: "Mercado Soriana", op: { tipo: "nave", alto: 10, color: "#d6d8d6", colorPretil: "#d71e28", vanos: 0.02 } },
            { nombre: "Coppel", op: { tipo: "comercio", alto: 9, color: "#f3f3f0", colorPretil: "#1a3f8f", vanos: 0.15, letrero: { texto: "COPPEL", fondo: "#ffd200", color: "#1a3f8f", ancho: 7, alto: 1.4 } } }
        ],
        extra(ctx) {
            const { N, porId, mat, kit, THREE } = ctx;
            const r = porId("ruta");
            // talud de piedra bola entre la banqueta y la barda de Soriana
            const piedra = mat(0xffffff, { map: kit.texPiedra(), roughness: 1 });
            const L = [];
            for (let s = -60; s <= 70; s += 2) { const p = N(s, 0); L.push({ x: p.x, y: p.y }); }
            kit.franja(L, r.mitad + r.banq, r.mitad + r.banq + 2.6, 0, 0.35, piedra, piedra, 3);
            // ladrillo y franja roja al pie de la nave (lado de la calle)
            const ladrillo = mat(0xffffff, { map: kit.texMuro("#8a5a44", "ladrillo"), roughness: 0.95 });
            bardaCalle(ctx, -48, 62, r.mitad + r.banq + 2.75, 3.6, ladrillo, 0.12);
            bardaCalle(ctx, -48, 62, r.mitad + r.banq + 2.72, 0.35, mat(0xd71e28), 0.14, 3.75);
            letrero(ctx, 30, r.mitad + r.banq + 2.6, 7.6, 9, 1.8, "SORIANA mercado", "#d71e28", "#ffffff", Math.PI);
        },
        entorno: [
            "Prolongación Tulipanes dividida por un camellón de pasto con árboles jóvenes",
            "Barda lateral de Soriana Mercado: ladrillo, franja roja y lámina gris, con talud de piedra bola",
            "Coppel junto a Soriana, sobre el mismo estacionamiento",
            "Enfrente, edificios de departamentos de cuatro pisos con jardineras azules",
            "Tráileres y autos que van hacia la Av. Autonomía Universitaria"
        ]
    });

    // ====================== I · Valle del Tecnológico ======================
    // Av. Melchor Ocampo, ya cerca del Tec: camellón angosto de concreto con árboles jóvenes y
    // la ciclovía verde con bolardos del lado norte. La parada queda junto a la fonda
    // «La Papaya» (toldo naranja, mesas con mantel y sillas de plástico); enfrente, una tienda
    // roja de refrescos, un edificio de cristal azul y casas de tres pisos.
    Z("I", {
        divididas: { "Avenida Melchor Ocampo": { camellon: 3.2, tipo: "concreto", arboles: 9 } },
        ruta: { nombre: "Avenida Melchor Ocampo", s: 0, calle: { ciclovia: 1.7 } },
        pisos2: 0.45, locales: 0.35,
        especiales: [
            { en: [2, 12], op: { pisos: 1, color: "#f4f1ea", planta: ["cortina", "puerta"] } },
            { en: [-27, 8], op: { pisos: 2, color: "#f2f2ef", colorAlto: "#e9e7e1", planta: ["porton", "porton"], colorPorton: "#6b4a33" } },
            { en: [-60, 14], op: { pisos: 1, color: "#d98a6c" } },
            { en: [0, -35], op: { tipo: "comercio", alto: 7, color: "#c8102e", colorPretil: "#a00d24", vanos: 0.3, letrero: { texto: "MERZA", fondo: "#ffffff", color: "#c8102e", ancho: 5, alto: 1 } } },
            { en: [-45, -35], op: { tipo: "comercio", alto: 7.5, color: "#2b4a7a", colorPretil: "#1f2f4c", vidrio: "#7ea3c4", vanos: 0.85 } },
            { en: [28, -40], op: { pisos: 3, color: "#f1d4b3", colorAlto: "#f6e7d3", balaustrada: true } }
        ],
        extra(ctx) {
            const { N, porId, mat, kit } = ctx;
            const r = porId("ruta");
            const d0 = r.mitad + r.ciclovia + r.banq;
            // fonda La Papaya: toldo naranja, letrero y mesas en la banqueta
            const p = N(10, d0 - 1.2);
            kit.caja(9, 3, 0.08, p.x, p.y, 2.55, p.ang, mat(0xe8742a, { roughness: 0.6 }));
            letrero(ctx, 10, d0 - 2.6, 2.9, 4, 0.6, "La Papaya", "#e8742a", "#ffffff", Math.PI);
            mesas(ctx, 6.5, d0 - 1.4, 5, 0xd8312b);
            // bolardos de la ciclovía y caseta rosa de vigilancia en la esquina
            for (let s = -30; s < -12; s += 2) { const q = N(s, r.mitad + 0.1); kit.cilindro(0.08, 0.08, 0.8, q.x, q.y, 0, mat(0x222222), 8); }
            const c = N(-24, d0 + 1.5);
            kit.caja(2.2, 2.2, 2.6, c.x, c.y, 0, c.ang, mat(0xd99a8c));
            kit.caja(2.6, 2.6, 0.2, c.x, c.y, 2.6, c.ang, mat(0xb86f60));
        },
        entorno: [
            "Av. Melchor Ocampo con camellón angosto de concreto, árboles jóvenes y guarnición amarilla",
            "Ciclovía verde con bolardos del lado de la parada, la misma que llega al Tec",
            "Fonda «La Papaya» con toldo naranja, mesas y sillas de plástico junto a la parada",
            "Casas de dos pisos con portones, y una caseta rosa en la esquina",
            "Enfrente, tienda roja de refrescos, edificio de cristal azul y casas de tres pisos"
        ]
    });
})();
