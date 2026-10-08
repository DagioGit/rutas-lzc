// Diseños de caseta para el configurador del visor 3D.
//
// Sistema local de cada caseta: x = a lo largo de la calle, la calle queda del
// lado -y, z = arriba. Metros. La plataforma mide ~4.8 × 2.4 m.
//
// Cada diseño regresa { grupo, luces, alturaLuz, actualizar(dt, datos) }:
//  - luces: materiales que brillan de noche (LED, pantallas).
//  - alturaLuz: altura de la luz que ilumina la caseta de noche.
//  - actualizar: animaciones propias (por ejemplo, la pantalla de llegada).

(function () {
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
        return { grupo: k.g, luces: k.luces, alturaLuz: 2.6, actualizar() {} };
    }

    // ---------- Contador de llegada (tótem junto a la parada) ----------
    // Independiente del diseño de la caseta: se queda aunque cambien la caseta.
    function contador(THREE) {
        const g = new THREE.Group();
        const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.2, ...extra });
        const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.3, 2.35), mat(0x1f262b, { metalness: 0.5, roughness: 0.35 }));
        cuerpo.position.z = 0.16 + 2.35 / 2;
        cuerpo.castShadow = true;
        g.add(cuerpo);
        const remate = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.32, 0.12), mat(0xf2c200));
        remate.position.z = 0.16 + 2.35 + 0.06;
        g.add(remate);
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.45, 0.16), mat(0x9aa1a7));
        base.position.z = 0.08;
        g.add(base);

        const c = document.createElement("canvas");
        c.width = 256; c.height = 448;
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
        const pantalla = new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.6, roughness: 0.25 });
        [-1, 1].forEach(lado => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.875).rotateX(Math.PI / 2), pantalla);
            if (lado > 0) m.rotation.z = Math.PI;
            m.position.set(0, lado * 0.152, 1.72);
            g.add(m);
        });

        let ultimo = "";
        function dibujar(segundos, enParada) {
            const texto = enParada ? "EN PARADA" : segundos == null ? "--:--" : `${Math.floor(segundos / 60)}:${String(Math.max(0, Math.floor(segundos % 60))).padStart(2, "0")}`;
            if (texto === ultimo) return;
            ultimo = texto;
            const x = c.getContext("2d"), w = c.width, h = c.height;
            x.fillStyle = "#0c1419"; x.fillRect(0, 0, w, h);
            x.fillStyle = "#f2c200"; x.beginPath(); x.arc(46, 48, 28, 0, Math.PI * 2); x.fill();
            x.fillStyle = "#0c1419"; x.font = "bold 30px Arial"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("2", 46, 50);
            x.textAlign = "left"; x.fillStyle = "#ffffff"; x.font = "bold 26px Arial"; x.fillText("Ruta 2", 86, 40);
            x.fillStyle = "#8fa3ae"; x.font = "19px Arial"; x.fillText("Pollo", 86, 64);
            x.fillStyle = "#24343d"; x.fillRect(18, 100, w - 36, 2);
            x.fillStyle = "#8fa3ae"; x.font = "22px Arial"; x.fillText(enParada ? "La combi está" : "Próxima combi", 18, 145);
            x.fillStyle = enParada ? "#5fd08a" : "#f2c200";
            x.font = enParada ? "bold 40px Arial" : "bold 92px Arial";
            x.fillText(texto, 16, enParada ? 205 : 222);
            x.fillStyle = "#8fa3ae"; x.font = "20px Arial";
            x.fillText(enParada ? "Aborde por la puerta" : "minutos : segundos", 18, 290);
            x.fillText("lateral derecha", 18, enParada ? 316 : 999);
            x.fillStyle = "#24343d"; x.fillRect(18, 350, w - 36, 2);
            x.fillStyle = "#c9d4da"; x.font = "19px Arial";
            x.fillText("Base · A · B · Base", 18, 392);
            tex.needsUpdate = true;
        }
        dibujar(null, false);
        return { grupo: g, luces: [pantalla], actualizar: dibujar };
    }

    window.Casetas3D = {
        acentos: ACENTOS,
        disenos: {
            solar: { nombre: "Solar", desc: "Techo fotovoltaico, iluminación LED, banca con respaldo de cristal y franja táctil.", crear: solar, acento: "verde" }
        },
        crearContador: contador
    };
})();
