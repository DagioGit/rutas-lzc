// Diseños de caseta para el configurador del visor 3D.
// La principal es la Caseta LZC (modelo de SketchUp en modelos/caseta-lzc.glb).
//
// Sistema local de cada caseta: x = a lo largo de la calle, la calle queda del
// lado -y, z = arriba. Metros. La plataforma mide ~4.8 × 2.4 m.
//
// Cada diseño regresa { grupo, luces, alturaLuz, actualizar(dt, datos) }:
//  - luces: materiales que brillan de noche (LED, pantallas).
//  - alturaLuz: altura de la luz que ilumina la caseta de noche.
//  - actualizar: animaciones propias (por ejemplo, la pantalla de llegada).

(function () {
    // Datos de la ruta de la parada (la app los manda por la dirección; si no, Ruta 2 «Pollo»).
    function infoRuta() {
        const I = (window.RutaHorario && window.RutaHorario.info) || {};
        return { numero: I.numero || "2", apodo: I.apodo || "Pollo", color: I.color || "#f2c200", servicio: I.servicio || "6:00 a 22:00" };
    }

    const ACENTOS = {
        azul: 0x2e6c93,
        verde: 0x2f7d5b,
        terracota: 0xb5523b,
        amarillo: 0xf2c200
    };

    function base(THREE) {
        const g = new THREE.Group();
        const luces = [];
        const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05, ...extra });
        const caja = (lx, ly, lz, x, y, z, m) => {
            const o = new THREE.Mesh(new THREE.BoxGeometry(lx, ly, lz), m);
            o.position.set(x, y, z + lz / 2);
            o.castShadow = true;
            o.receiveShadow = true;
            g.add(o);
            return o;
        };
        const cil = (r0, r1, h, x, y, z, m, lados = 12) => {
            const o = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, h, lados).rotateX(Math.PI / 2), m);
            o.position.set(x, y, z + h / 2);
            o.castShadow = true;
            g.add(o);
            return o;
        };
        const lienzo = (w, h, dibujar) => {
            const c = document.createElement("canvas");
            c.width = w; c.height = h;
            dibujar(c.getContext("2d"), w, h);
            const t = new THREE.CanvasTexture(c);
            t.colorSpace = THREE.SRGBColorSpace;
            t.anisotropy = 8;
            return { t, c };
        };
        // Plataforma de concreto con guarnición y franja táctil amarilla del lado de la calle
        caja(4.8, 2.4, 0.16, 0, 0, 0, mat(0xd8d4cb, { roughness: 0.95 }));
        const tactil = lienzo(256, 32, (c, w, h) => {
            c.fillStyle = "#f2c200"; c.fillRect(0, 0, w, h);
            c.fillStyle = "#d9ad00";
            for (let x = 6; x < w; x += 12) for (let y = 6; y < h; y += 12) { c.beginPath(); c.arc(x, y, 3, 0, Math.PI * 2); c.fill(); }
        });
        caja(4.8, 0.4, 0.012, 0, -0.98, 0.16, mat(0xffffff, { map: tactil.t, roughness: 0.8 }));
        return { g, luces, mat, caja, cil, lienzo };
    }

    // Señal de parada en poste (disco amarillo con la "R2").
    function senal(THREE, k, x, y) {
        k.caja(0.08, 0.08, 2.9, x, y, 0.16, k.mat(0x2b3a45, { metalness: 0.4 }));
        const disco = k.lienzo(128, 128, (c, w, h) => {
            c.fillStyle = "#1d2a33"; c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2); c.fill();
            c.fillStyle = "#f2c200"; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 9, 0, Math.PI * 2); c.fill();
            c.fillStyle = "#1d2a33"; c.font = "bold 50px Arial"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("R2", w / 2, h / 2 + 2);
        });
        const m = new THREE.Mesh(new THREE.CircleGeometry(0.34, 32).rotateY(Math.PI / 2), k.mat(0xffffff, { map: disco.t, side: THREE.DoubleSide }));
        m.position.set(x, y, 2.85);
        k.g.add(m);
    }

    // ---------- 3. Solar: techo fotovoltaico, LED y pantalla de llegada ----------
    function solar(THREE, { acento }) {
        const k = base(THREE);
        const color = ACENTOS[acento] || ACENTOS.verde;
        const grafito = k.mat(0x2b3237, { metalness: 0.6, roughness: 0.35 });
        // dos marcos en "C" sostienen el techo en voladizo hacia la calle
        [-1.85, 1.85].forEach(x => {
            k.caja(0.14, 0.14, 2.75, x, 0.9, 0.16, grafito);
            k.caja(0.14, 2.3, 0.14, x, -0.2, 2.82, grafito);
        });
        // panel solar
        const celdas = k.lienzo(512, 256, (c, w, h) => {
            c.fillStyle = "#c9ced3"; c.fillRect(0, 0, w, h);
            const cw = w / 8, ch = h / 4;
            for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) {
                c.fillStyle = "#1c2f52"; c.fillRect(i * cw + 3, j * ch + 3, cw - 6, ch - 6);
                c.strokeStyle = "rgba(160,190,230,.35)"; c.lineWidth = 1;
                for (let s = 1; s < 4; s++) { c.beginPath(); c.moveTo(i * cw + 3 + (cw - 6) * s / 4, j * ch + 3); c.lineTo(i * cw + 3 + (cw - 6) * s / 4, j * ch + ch - 3); c.stroke(); }
            }
        });
        const techo = k.caja(4.6, 2.5, 0.08, 0, -0.15, 2.92, k.mat(0xffffff, { map: celdas.t, metalness: 0.5, roughness: 0.25 }));
        techo.rotation.x = 0.1;
        // tira LED bajo el borde
        const led = k.mat(0xffffff, { emissive: 0xdff4ff, emissiveIntensity: 0.15 });
        k.luces.push(led);
        k.caja(4.4, 0.05, 0.03, 0, -1.3, 2.74, led);
        // respaldo de cristal esmerilado con franja de color
        k.caja(3.5, 0.04, 1.9, 0, 0.92, 0.36, new THREE.MeshStandardMaterial({ color: 0xe6f1f5, transparent: true, opacity: 0.55, roughness: 0.3, depthWrite: false }));
        k.caja(3.5, 0.05, 0.22, 0, 0.92, 1.25, k.mat(color, { roughness: 0.4 }));
        // banca con descansabrazos
        const banca = k.mat(0x9aa3a8, { metalness: 0.6, roughness: 0.35 });
        k.caja(2.4, 0.45, 0.06, -0.2, 0.55, 0.6, banca);
        [-1.4, -0.2, 1.0].forEach(x => k.caja(0.06, 0.45, 0.28, x, 0.55, 0.66, grafito));
        senal(THREE, k, -2.6, 0.95);
        mobiliario(THREE, k.g, { xBotes: 2.75, xBanca: -3.95 });
        return { grupo: k.g, luces: k.luces, alturaLuz: 2.6, techo: 2.8, actualizar() {} };
    }

    // ---------- Caseta LZC: modelada en SketchUp (modelos/caseta-lzc.glb) ----------
    // El modelo trae materiales con nombre (LZC_*); aquí se cambian por materiales
    // con textura: letrero con el nombre de la parada, mapa «Usted está aquí» con
    // los lugares cercanos, panel solar, piso táctil, madera, cristal y LED.
    const TIPOS = {
        salud: { color: "#d64545", letra: "+" },
        escuela: { color: "#2f6fb5", letra: "E" },
        compras: { color: "#e08a1e", letra: "$" },
        "trámite": { color: "#7a4fb0", letra: "T" },
        parque: { color: "#3f9a5c", letra: "P" },
        transporte: { color: "#1d2a33", letra: "B" }
    };

    function textura(THREE, w, h, dibujar, { repetir = false, plana = true } = {}) {
        const c = document.createElement("canvas");
        c.width = w; c.height = h;
        dibujar(c.getContext("2d"), w, h);
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        t.flipY = !plana; // las caras del modelo traen la v hacia abajo (convención glTF)
        if (repetir) t.wrapS = t.wrapT = THREE.RepeatWrapping;
        return t;
    }

    function redondo(c, x, y, w, h, r) {
        c.beginPath();
        c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
    }

    // Mapa «Usted está aquí»: recorrido, paradas vecinas y lugares a pie.
    function dibujarMapa(c, w, h, parada) {
        const R = window.RUTA_2;
        c.fillStyle = "#f3f1ea"; c.fillRect(0, 0, w, h);
        // encabezado
        c.fillStyle = "#1d2a33"; c.fillRect(0, 0, w, 150);
        c.fillStyle = "#f2c200"; c.fillRect(28, 30, 92, 92);
        c.fillStyle = "#1d2a33"; c.font = "bold 40px Arial"; c.textAlign = "center"; c.textBaseline = "middle";
        c.fillText("LZC.", 74, 78);
        c.textAlign = "left"; c.fillStyle = "#ffffff"; c.font = "bold 46px Arial";
        c.fillText("Usted está aquí", 142, 62);
        c.fillStyle = "#f2c200";
        const sub = parada ? `${parada.name}${parada.apodo ? " · " + parada.apodo : ""}` : "Ruta 2";
        let tam = 28;
        do { c.font = `bold ${tam}px Arial`; tam -= 1; } while (c.measureText(sub).width > w - 166 && tam > 14);
        c.fillText(sub, 142, 106);
        if (!parada || !R) return;

        // mapa
        const x0 = 24, y0 = 170, mw = w - 48, mh = 470;
        c.save();
        redondo(c, x0, y0, mw, mh, 18); c.fillStyle = "#ffffff"; c.fill(); c.clip();
        const RADIO = 620; // metros visibles desde la parada
        const esc = (mw / 2) / RADIO;
        const cx = x0 + mw / 2, cy = y0 + mh / 2;
        const pr = (lng, lat) => [cx + (lng - parada.lng) * 105900 * esc, cy - (lat - parada.lat) * 110570 * esc];
        // cuadrícula de manzanas
        c.strokeStyle = "#ece8de"; c.lineWidth = 1;
        for (let x = x0; x < x0 + mw; x += 26) { c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y0 + mh); c.stroke(); }
        for (let y = y0; y < y0 + mh; y += 26) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + mw, y); c.stroke(); }
        // radio de 5 minutos a pie (400 m)
        c.setLineDash([10, 8]); c.strokeStyle = "#9fb2bd"; c.lineWidth = 3;
        c.beginPath(); c.arc(cx, cy, 400 * esc, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
        c.fillStyle = "#7d909b"; c.font = "18px Arial"; c.textAlign = "center";
        c.fillText("5 min a pie", cx, cy - 400 * esc - 8);
        // recorrido
        const linea = () => { c.beginPath(); R.trazo.forEach((p, i) => { const q = pr(p[0], p[1]); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); };
        c.lineJoin = c.lineCap = "round";
        linea(); c.strokeStyle = "#1d2a33"; c.lineWidth = 16; c.stroke();
        linea(); c.strokeStyle = "#f2c200"; c.lineWidth = 9; c.stroke();
        // otras paradas
        R.paradas.forEach(p => {
            if (p.id === parada.id) return;
            const q = pr(p.lng, p.lat);
            if (q[0] < x0 || q[0] > x0 + mw || q[1] < y0 || q[1] > y0 + mh) return;
            c.fillStyle = "#1d2a33"; redondo(c, q[0] - 16, q[1] - 16, 32, 32, 7); c.fill();
            c.fillStyle = "#f2c200"; c.font = "bold 20px Arial"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(p.corto, q[0], q[1] + 1);
        });
        // lugares
        (parada.cerca || []).forEach((l, i) => {
            const q = pr(l.lng, l.lat);
            const t = TIPOS[l.tipo] || TIPOS.transporte;
            c.fillStyle = "#ffffff"; c.beginPath(); c.arc(q[0], q[1], 19, 0, Math.PI * 2); c.fill();
            c.fillStyle = t.color; c.beginPath(); c.arc(q[0], q[1], 16, 0, Math.PI * 2); c.fill();
            c.fillStyle = "#ffffff"; c.font = "bold 19px Arial"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(String(i + 1), q[0], q[1] + 1);
        });
        // usted está aquí
        c.fillStyle = "rgba(214,69,69,.18)"; c.beginPath(); c.arc(cx, cy, 34, 0, Math.PI * 2); c.fill();
        c.fillStyle = "#d64545"; c.beginPath(); c.arc(cx, cy, 15, 0, Math.PI * 2); c.fill();
        c.strokeStyle = "#ffffff"; c.lineWidth = 5; c.stroke();
        c.restore();
        // norte
        c.fillStyle = "#1d2a33"; c.beginPath(); c.moveTo(x0 + mw - 34, y0 + 22); c.lineTo(x0 + mw - 24, y0 + 50); c.lineTo(x0 + mw - 44, y0 + 50); c.fill();
        c.font = "bold 18px Arial"; c.textAlign = "center"; c.fillText("N", x0 + mw - 34, y0 + 68);

        // lista de lugares
        let y = 674;
        c.textAlign = "left"; c.textBaseline = "middle";
        c.fillStyle = "#1d2a33"; c.font = "bold 26px Arial"; c.fillText("Cerca de esta parada", 28, y); y += 42;
        (parada.cerca || []).slice(0, 6).forEach((l, i) => {
            const t = TIPOS[l.tipo] || TIPOS.transporte;
            c.fillStyle = t.color; c.beginPath(); c.arc(44, y, 16, 0, Math.PI * 2); c.fill();
            c.fillStyle = "#fff"; c.font = "bold 18px Arial"; c.textAlign = "center"; c.fillText(String(i + 1), 44, y + 1);
            c.textAlign = "left"; c.fillStyle = "#1d2a33"; c.font = "23px Arial";
            const nombre = l.nombre.length > 34 ? l.nombre.slice(0, 33) + "…" : l.nombre;
            c.fillText(nombre, 72, y);
            c.textAlign = "right"; c.fillStyle = "#5f717b"; c.font = "bold 22px Arial"; c.fillText(`${l.min} min`, w - 30, y);
            c.textAlign = "left";
            y += 38;
        });
        // pie: ruta y código QR
        c.fillStyle = "#1d2a33"; c.fillRect(0, h - 92, w, 92);
        c.fillStyle = "#f2c200"; c.beginPath(); c.arc(56, h - 46, 26, 0, Math.PI * 2); c.fill();
        c.fillStyle = "#1d2a33"; c.font = "bold 30px Arial"; c.textAlign = "center"; c.fillText("2", 56, h - 44);
        c.textAlign = "left"; c.fillStyle = "#fff"; c.font = "bold 24px Arial"; c.fillText("Ruta 2 «Pollo»", 96, h - 60);
        c.fillStyle = "#b7c3ca"; c.font = "19px Arial"; c.fillText("Escanea para ver la próxima combi", 96, h - 30);
        // patrón del código QR (ilustrativo)
        const qx = w - 82, qy = h - 84, cel = 76 / 21;
        c.fillStyle = "#fff"; c.fillRect(qx - 4, qy - 4, 84, 84);
        c.fillStyle = "#1d2a33";
        let semilla = parada.id.charCodeAt(0) * 7919;
        const azar = () => { semilla = (semilla * 16807) % 2147483647; return semilla / 2147483647; };
        for (let i = 0; i < 21; i++) for (let j = 0; j < 21; j++) {
            const esquina = (i < 7 && j < 7) || (i > 13 && j < 7) || (i < 7 && j > 13);
            if (esquina) {
                const a = i % 14, b = j % 14;
                const anillo = Math.max(Math.abs(a - 3), Math.abs(b - 3));
                if (anillo !== 2 && anillo <= 3) c.fillRect(qx + i * cel, qy + j * cel, cel + 0.3, cel + 0.3);
            } else if (azar() > 0.52) c.fillRect(qx + i * cel, qy + j * cel, cel + 0.3, cel + 0.3);
        }
    }

    function dibujarLetrero(c, w, h, parada) {
        c.fillStyle = "#1d2a33"; c.fillRect(0, 0, w, h);
        c.fillStyle = "#f2c200"; c.fillRect(0, 0, 210, h);
        c.fillStyle = "#1d2a33"; c.font = "bold 76px Arial"; c.textAlign = "center"; c.textBaseline = "middle";
        c.fillText("LZC.", 105, h / 2 + 4);
        c.textAlign = "left"; c.fillStyle = "#ffffff"; c.font = "bold 74px Arial";
        const titulo = parada ? parada.name.toUpperCase() : "PARADA";
        c.fillText(titulo, 250, h / 2 + 4);
        const ancho = c.measureText(titulo).width;
        if (parada && parada.apodo) {
            c.fillStyle = "#b7c3ca"; c.font = "60px Arial";
            c.fillText("·  " + parada.apodo, 250 + ancho + 30, h / 2 + 4);
        }
        c.fillStyle = "#f2c200"; c.beginPath(); c.arc(w - 330, h / 2, 48, 0, Math.PI * 2); c.fill();
        c.fillStyle = "#1d2a33"; c.font = "bold 62px Arial"; c.textAlign = "center"; c.fillText("2", w - 330, h / 2 + 4);
        c.textAlign = "left"; c.fillStyle = "#ffffff"; c.font = "bold 44px Arial"; c.fillText("Ruta 2", w - 266, h / 2 - 18);
        c.fillStyle = "#b7c3ca"; c.font = "36px Arial"; c.fillText("Pollo", w - 266, h / 2 + 30);
    }

    const cacheTexturas = {};
    function texturasFijas(THREE) {
        if (cacheTexturas.listo) return cacheTexturas;
        cacheTexturas.tactil = textura(THREE, 1536, 128, (c, w, h) => {
            c.fillStyle = "#f2c200"; c.fillRect(0, 0, w, h);
            c.fillStyle = "#d4a800";
            for (let x = 8; x < w; x += 16) for (let y = 8; y < h; y += 16) { c.beginPath(); c.arc(x, y, 4.5, 0, Math.PI * 2); c.fill(); }
        });
        cacheTexturas.panel = textura(THREE, 1024, 512, (c, w, h) => {
            c.fillStyle = "#d9dde0"; c.fillRect(0, 0, w, h);
            const cols = 24, filas = 6, m = 10, cw = (w - 2 * m) / cols, ch = (h - 2 * m) / filas;
            for (let i = 0; i < cols; i++) for (let j = 0; j < filas; j++) {
                const g = c.createLinearGradient(0, m + j * ch, 0, m + (j + 1) * ch);
                g.addColorStop(0, "#1f355c"); g.addColorStop(1, "#15274a");
                c.fillStyle = g; c.fillRect(m + i * cw + 1.5, m + j * ch + 1.5, cw - 3, ch - 3);
                c.strokeStyle = "rgba(170,195,230,.35)"; c.lineWidth = 1;
                for (let s = 1; s < 5; s++) { c.beginPath(); c.moveTo(m + i * cw + 1.5, m + j * ch + ch * s / 5); c.lineTo(m + (i + 1) * cw - 1.5, m + j * ch + ch * s / 5); c.stroke(); }
            }
            c.fillStyle = "#c9ced3"; c.fillRect(w / 2 - 2, 0, 4, h);
        });
        cacheTexturas.madera = textura(THREE, 512, 512, (c, w, h) => {
            c.fillStyle = "#9b6438"; c.fillRect(0, 0, w, h);
            for (let i = 0; i < 140; i++) {
                const y = Math.random() * h, a = 0.05 + Math.random() * 0.12;
                c.strokeStyle = Math.random() > 0.5 ? `rgba(60,30,10,${a})` : `rgba(210,150,100,${a})`;
                c.lineWidth = 1 + Math.random() * 3;
                c.beginPath(); c.moveTo(0, y);
                for (let x = 0; x <= w; x += 32) c.lineTo(x, y + Math.sin(x / 70 + i) * 4);
                c.stroke();
            }
        }, { repetir: true });
        cacheTexturas.madera.repeat.set(0.9, 0.9);
        cacheTexturas.concreto = textura(THREE, 256, 256, (c, w, h) => {
            c.fillStyle = "#c9c4ba"; c.fillRect(0, 0, w, h);
            for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(${Math.random() > 0.5 ? "255,255,255" : "70,60,50"},${Math.random() * 0.1})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
        }, { repetir: true });
        cacheTexturas.isa = textura(THREE, 256, 256, (c, w, h) => {
            c.fillStyle = "#1f5caa"; c.fillRect(0, 0, w, h);
            c.strokeStyle = "#ffffff"; c.fillStyle = "#ffffff"; c.lineWidth = 14; c.lineCap = "round";
            c.beginPath(); c.arc(118, 64, 16, 0, Math.PI * 2); c.fill();
            c.beginPath(); c.moveTo(112, 92); c.lineTo(112, 150); c.lineTo(160, 150); c.lineTo(178, 196); c.stroke();
            c.beginPath(); c.moveTo(112, 118); c.lineTo(150, 118); c.stroke();
            c.lineWidth = 10; c.beginPath(); c.arc(112, 168, 42, Math.PI * 0.15, Math.PI * 1.3); c.stroke();
        });
        cacheTexturas.usb = textura(THREE, 256, 180, (c, w, h) => {
            c.fillStyle = "#1a1f24"; c.fillRect(0, 0, w, h);
            c.fillStyle = "#f2c200"; c.font = "bold 34px Arial"; c.textAlign = "center"; c.fillText("CARGA USB", w / 2, 46);
            [w / 2 - 50, w / 2 + 50].forEach(x => { c.fillStyle = "#0a0c0e"; redondo(c, x - 30, 80, 60, 26, 5); c.fill(); c.fillStyle = "#59636b"; c.fillRect(x - 20, 88, 40, 10); });
            c.fillStyle = "#8fa3ae"; c.font = "22px Arial"; c.fillText("energía solar", w / 2, 150);
        });
        cacheTexturas.disco = textura(THREE, 256, 256, (c, w, h) => {
            c.fillStyle = "#1d2a33"; c.fillRect(0, 0, w, h);
            c.fillStyle = "#f2c200"; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 14, 0, Math.PI * 2); c.fill();
            c.fillStyle = "#1d2a33"; c.font = "bold 96px Arial"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("R2", w / 2, h / 2 + 4);
        });
        cacheTexturas.listo = true;
        return cacheTexturas;
    }

    // Disco de la señal de parada con el número de la ruta ("R1" gris, "R2" amarillo).
    function discoRuta(THREE) {
        const R = infoRuta();
        return textura(THREE, 256, 256, (c, w, h) => {
            c.fillStyle = "#1d2a33"; c.fillRect(0, 0, w, h);
            c.fillStyle = R.color; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 14, 0, Math.PI * 2); c.fill();
            const claro = parseInt(R.color.slice(1, 3), 16) * 0.3 + parseInt(R.color.slice(3, 5), 16) * 0.59 + parseInt(R.color.slice(5, 7), 16) * 0.11 > 150;
            c.fillStyle = claro ? "#1d2a33" : "#ffffff"; c.font = "bold 96px Arial"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("R" + R.numero, w / 2, h / 2 + 4);
        });
    }

    function lzc(THREE, { acento, parada }) {
        const plantilla = window.Casetas3D.plantillaLZC;
        if (!plantilla) return solar(THREE, { acento });
        const T = texturasFijas(THREE);
        const color = ACENTOS[acento] || ACENTOS.amarillo;
        const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.05, side: THREE.DoubleSide, ...o });
        const luces = [];
        const letrero = textura(THREE, 2048, 142, (c, w, h) => dibujarLetrero(c, w, h, parada));
        const mapa = textura(THREE, 640, 1040, (c, w, h) => dibujarMapa(c, w, h, parada));
        const MATS = {
            LZC_Concreto: std({ color: 0xffffff, map: T.concreto, roughness: 0.95 }),
            LZC_Tactil: std({ color: 0xffffff, map: T.tactil, roughness: 0.8 }),
            LZC_Grafito: std({ color: 0x2b3237, metalness: 0.55, roughness: 0.38 }),
            LZC_Acento: std({ color, roughness: 0.45, metalness: 0.2 }),
            LZC_Cristal: new THREE.MeshStandardMaterial({ color: 0xdcecf2, transparent: true, opacity: 0.26, roughness: 0.04, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide }),
            LZC_Plafon: std({ color: 0xe6e7e4, roughness: 0.7 }),
            LZC_Madera: std({ color: 0xffffff, map: T.madera, roughness: 0.75 }),
            LZC_Panel_Solar: std({ color: 0xffffff, map: T.panel, metalness: 0.45, roughness: 0.22 }),
            LZC_Aluminio: std({ color: 0xc4cacf, metalness: 0.8, roughness: 0.3 }),
            LZC_LED: std({ color: 0xffffff, emissive: 0xfff4dc, emissiveIntensity: 0.15 }),
            LZC_Mapa: std({ color: 0xffffff, map: mapa, emissive: 0xffffff, emissiveMap: mapa, emissiveIntensity: 0.1, roughness: 0.35 }),
            LZC_Letrero: std({ color: 0xffffff, map: letrero, emissive: 0xffffff, emissiveMap: letrero, emissiveIntensity: 0.1, roughness: 0.4 }),
            LZC_ISA: std({ color: 0xffffff, map: T.isa, roughness: 0.8 }),
            LZC_USB: std({ color: 0xffffff, map: T.usb, emissive: 0xffffff, emissiveMap: T.usb, emissiveIntensity: 0.1 }),
            LZC_Disco: std({ color: 0xffffff, map: discoRuta(THREE), roughness: 0.4 })
        };
        // de noche: la tira LED brilla fuerte; mapa y letrero, retroiluminados más suaves
        luces.push(MATS.LZC_LED);
        const suaves = [MATS.LZC_Mapa, MATS.LZC_Letrero, MATS.LZC_USB];
        const grupo = plantilla.clone(true);
        grupo.traverse(o => {
            if (!o.isMesh) return;
            const nuevo = MATS[o.material.name];
            if (nuevo) o.material = nuevo;
            if (o.material === MATS.LZC_Cristal) { o.castShadow = false; o.renderOrder = 2; }
        });
        const g = new THREE.Group();
        g.add(grupo);
        mobiliario(THREE, g, { xBotes: 2.72, botesExistentes: true, xBanca: -3.95 });
        return {
            grupo: g, luces, alturaLuz: 2.55, techo: 2.62,
            noche(n) { suaves.forEach(m => { m.emissiveIntensity = 0.08 + 0.75 * n; }); },
            actualizar() {}
        };
    }

    // ---------- Mobiliario: botes de basura separada y banca exterior ----------
    // [xBotes]: dónde van los botes (a lo largo de la caseta); [botesExistentes]: la Caseta LZC
    // ya trae orgánico e inorgánico, aquí sólo se les pone tapa y etiqueta y se agrega el de reciclables.
    function mobiliario(THREE, g, { xBotes = 2.72, botesExistentes = false, xBanca = -3.95 } = {}) {
        const m = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05, ...extra });
        const caja = (lx, ly, lz, x, y, z, mm) => {
            const o = new THREE.Mesh(new THREE.BoxGeometry(lx, ly, lz), mm);
            o.position.set(x, y, z + lz / 2); o.castShadow = true; o.receiveShadow = true; g.add(o); return o;
        };
        const etiqueta = (texto, fondo, simbolo) => {
            const c = document.createElement("canvas"); c.width = 128; c.height = 160;
            const x = c.getContext("2d");
            x.fillStyle = fondo; x.fillRect(0, 0, 128, 160);
            x.fillStyle = "#ffffff"; x.textAlign = "center"; x.textBaseline = "middle";
            x.font = "bold 64px Arial"; x.fillText(simbolo, 64, 62);
            x.font = "bold 19px Arial"; x.fillText(texto, 64, 128);
            const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
        };
        // [y del centro, color cuerpo, color tapa, texto, símbolo]
        const botes = [
            [-0.34, 0x1f5caa, 0x163f78, "RECICLA", "R"],
            [0.15, 0x2f7d5b, 0x1f5f43, "ORGÁNICO", "O"],
            [0.62, 0x70787e, 0x4a5157, "INORGÁNICO", "I"]
        ];
        botes.forEach(([y, cuerpo, tapa, texto, simbolo], i) => {
            if (!(botesExistentes && i > 0)) caja(0.44, 0.44, 0.85, xBotes, y, 0, m(cuerpo, { roughness: 0.5 }));
            caja(0.48, 0.48, 0.07, xBotes, y, 0.85, m(tapa, { roughness: 0.45 }));
            caja(0.2, 0.06, 0.035, xBotes, y, 0.92, m(0x2b3237));
            // etiqueta del lado de la calle
            const e = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.4).rotateX(Math.PI / 2),
                m(0xffffff, { map: etiqueta(texto, "#" + new THREE.Color(tapa).getHexString(), simbolo), roughness: 0.5 }));
            e.position.set(xBotes, y - 0.225, 0.5);
            g.add(e);
        });
        // banca exterior: patas de concreto, tablas de madera y respaldo
        const concreto = m(0xb3ada4, { roughness: 0.95 }), madera = m(0x9e683c, { roughness: 0.75 });
        [-0.72, 0.72].forEach(dx => caja(0.16, 0.52, 0.42, xBanca + dx, 0.45, 0.0, concreto));
        [0.24, 0.36, 0.48, 0.6].forEach(y => caja(1.75, 0.1, 0.05, xBanca, y + 0.0, 0.42, madera));
        [0.62, 0.78].forEach(z => caja(1.75, 0.05, 0.12, xBanca, 0.7, z, madera));
        [-0.72, 0.72].forEach(dx => caja(0.06, 0.06, 0.5, xBanca + dx, 0.73, 0.42, m(0x2b3237, { metalness: 0.5 })));
    }

    // ---------- Contador de llegada: pantalla colgada del techo de la caseta ----------
    // Es parte de la caseta: cuelga al frente, con una cara hacia la calle y otra hacia la banca.
    function contador(THREE) {
        const g = new THREE.Group();
        const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.2, ...extra });
        const Z = 2.06; // centro de la pantalla
        const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.1, 0.36), mat(0x1f262b, { metalness: 0.5, roughness: 0.35 }));
        cuerpo.position.z = Z;
        cuerpo.castShadow = true;
        g.add(cuerpo);
        const remate = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.12, 0.04), mat(0xf2c200));
        remate.position.z = Z + 0.2;
        g.add(remate);
        // tirantes hasta el techo (su largo se ajusta con colgar())
        const tirantes = [-0.45, 0.45].map(x => {
            const t = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 1), mat(0x2b3237, { metalness: 0.6 }));
            t.position.x = x;
            g.add(t);
            return t;
        });
        function colgar(techo) {
            const z0 = Z + 0.22, largo = Math.max(0.05, techo - z0);
            tirantes.forEach(t => { t.scale.z = largo; t.position.z = z0 + largo / 2; });
        }
        colgar(2.62);

        const c = document.createElement("canvas");
        c.width = 640; c.height = 192;
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        const pantalla = new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.6, roughness: 0.25 });
        [-1, 1].forEach(lado => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(1.06, 0.318).rotateX(Math.PI / 2), pantalla);
            if (lado > 0) m.rotation.z = Math.PI;
            m.position.set(0, lado * 0.052, Z);
            g.add(m);
        });

        const info = infoRuta;
        let ultimo = "";
        const hhmm = t => { const m = Math.floor(t / 60) % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
        // e = estado de la parada en horario.js: { segundos, enParada, servicio, llegada }
        function dibujar(e) {
            const segundos = e ? e.segundos : null, enParada = !!(e && e.enParada);
            const sinServicio = !!(e && !e.servicio);
            const texto = sinServicio ? "Sin servicio" : enParada ? "EN PARADA" : segundos == null ? "--:--" : `${Math.floor(segundos / 60)}:${String(Math.max(0, Math.floor(segundos % 60))).padStart(2, "0")}`;
            const clave = texto + (e ? hhmm(e.llegada) : "");
            if (clave === ultimo) return;
            ultimo = clave;
            const R = info();
            const x = c.getContext("2d"), w = c.width, h = c.height;
            x.fillStyle = "#0c1419"; x.fillRect(0, 0, w, h);
            // ruta
            x.fillStyle = R.color; x.beginPath(); x.arc(84, 78, 52, 0, Math.PI * 2); x.fill();
            const claro = parseInt(R.color.slice(1, 3), 16) * 0.3 + parseInt(R.color.slice(3, 5), 16) * 0.59 + parseInt(R.color.slice(5, 7), 16) * 0.11 > 150;
            x.fillStyle = claro ? "#0c1419" : "#ffffff"; x.font = "bold 58px Arial"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(R.numero, 84, 82);
            x.fillStyle = "#c9d4da"; x.font = "bold 22px Arial"; x.fillText(R.apodo, 84, 162);
            x.fillStyle = "#24343d"; x.fillRect(170, 22, 3, h - 44);
            x.textAlign = "left"; x.textBaseline = "alphabetic";
            if (sinServicio) {
                x.fillStyle = "#e8734a"; x.font = "bold 64px Arial"; x.fillText("Sin servicio", 196, 92);
                x.fillStyle = "#c9d4da"; x.font = "26px Arial"; x.fillText(`Primera combi ${hhmm(e.llegada)} · ${R.servicio}`, 198, 150);
            } else if (enParada) {
                x.fillStyle = "#5fd08a"; x.font = "bold 76px Arial"; x.fillText("EN PARADA", 196, 102);
                x.fillStyle = "#c9d4da"; x.font = "26px Arial"; x.fillText("Suba con cuidado", 198, 156);
            } else {
                x.fillStyle = "#8fa3ae"; x.font = "26px Arial"; x.fillText("Próxima combi", 198, 46);
                x.fillStyle = "#f2c200"; x.font = "bold 92px Arial"; x.fillText(texto, 194, 132);
                x.fillStyle = "#c9d4da"; x.font = "26px Arial"; x.fillText(e ? `llega ${hhmm(e.llegada)}` : "", 198, 174);
                x.fillStyle = "#8fa3ae"; x.font = "22px Arial"; x.textAlign = "right"; x.fillText("min : seg", w - 22, 46);
            }
            tex.needsUpdate = true;
        }
        dibujar(null);
        return { grupo: g, luces: [pantalla], actualizar: dibujar, colgar };
    }

    window.Casetas3D = {
        acentos: ACENTOS,
        disenos: {
            lzc: { nombre: "Caseta LZC", desc: "Modelada en SketchUp: techo con 2 paneles solares, cristal templado, celosía de madera, banca y apoyo isquiático, mapa «Usted está aquí», carga USB, espacio para silla de ruedas, botes de basura separada (orgánico, inorgánico y reciclable), banca exterior y pantalla de llegada colgada del techo.", crear: lzc, acento: "amarillo" },
            solar: { nombre: "Solar básica", desc: "Versión sencilla: techo fotovoltaico, tira LED, banca con respaldo de cristal, franja táctil, botes de basura separada y banca exterior.", crear: solar, acento: "verde" }
        },
        plantillaLZC: null, // la llena el visor al leer modelos/caseta-lzc (caseta-lzc-modelo.js)
        dibujarMapa,
        dibujarLetrero,
        crearContador: contador
    };
})();
