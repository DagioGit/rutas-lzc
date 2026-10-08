// Modelos 3D que se dibujan sobre Google Maps (Three.js).
//
// Sistema de coordenadas de todos los modelos (el mismo que usa el mapa):
//   x = adelante / este, y = izquierda / norte, z = arriba. Unidades: metros.
//
// - crearCombi(THREE): combi blanca con una franja amarilla por el medio.
// - crearParadaBase(THREE): parada provisional, se usa mientras no exista
//   el modelo real (modelos/parada.glb). La calle queda del lado -y.
// - prepararModeloGLB(THREE, escenaGLTF, largo): acomoda un modelo exportado
//   de Blender (eje Y hacia arriba) a este sistema y lo ajusta al largo indicado.

(function () {
    const COLORES = {
        blanco: 0xf7f7f4,
        amarillo: 0xf5c400,
        franja: 0xee9b22,
        vidrio: 0x1d2a35,
        llanta: 0x1b1b1b,
        rin: 0xb9bec4,
        defensa: 0x3a3f45,
        faro: 0xfff6d5,
        calavera: 0xd0202a,
        teal: 0x2e6c93,
        navy: 0x24333f,
        concreto: 0xd9d6cf,
        madera: 0xb07a45
    };

    function mat(THREE, color, extra = {}) {
        return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05, ...extra });
    }

    // Caja posicionada por su centro (x, y, z) con tamaño (largo x, ancho y, alto z).
    function caja(THREE, material, lx, ly, lz, x, y, z) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(lx, ly, lz), material);
        m.position.set(x, y, z);
        return m;
    }

    function sombra(THREE, radioX, radioY, opacidad) {
        const s = new THREE.Mesh(
            new THREE.CircleGeometry(1, 40),
            new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: opacidad, depthWrite: false })
        );
        s.scale.set(radioX, radioY, 1);
        s.position.z = 0.02;
        s.renderOrder = -1;
        return s;
    }

    // ====================== COMBI ======================
    // Combi tipo Nissan Urvan / Toyota Hiace, como las de las rutas de Lázaro Cárdenas:
    // blanca, franja amarilla, vidrios polarizados, puerta corrediza del lado derecho
    // y el letrero de la ruta arriba del parabrisas.
    // opciones: { numero: "29" } -> número pintado en el frente y a los lados.
    function crearCombi(THREE, opciones = {}) {
        const combi = new THREE.Group();
        combi.name = 'combi';
        const blanco = mat(THREE, COLORES.blanco, { roughness: 0.32, metalness: 0.1 });
        const amarillo = mat(THREE, COLORES.franja, { roughness: 0.4 });
        const vidrio = mat(THREE, 0x151d24, { roughness: 0.08, metalness: 0.55 });
        const negro = mat(THREE, COLORES.llanta, { roughness: 0.9 });
        const plastico = mat(THREE, 0x2a2e33, { roughness: 0.7 });
        const gris = mat(THREE, COLORES.rin, { metalness: 0.7, roughness: 0.28 });
        const ANCHO = 1.9;
        const BISEL = 0.07;

        // Carrocería: perfil lateral extruido a lo ancho (x = adelante, z = arriba)
        const perfil = new THREE.Shape();
        perfil.moveTo(-2.55, 0.36);
        perfil.lineTo(2.40, 0.36);
        perfil.lineTo(2.56, 0.52);
        perfil.lineTo(2.58, 0.98);      // frente
        perfil.lineTo(2.22, 1.16);      // cofre corto e inclinado
        perfil.lineTo(1.62, 2.02);      // parabrisas
        perfil.lineTo(1.42, 2.13);
        perfil.lineTo(-2.40, 2.13);     // techo
        perfil.lineTo(-2.55, 2.0);
        perfil.lineTo(-2.55, 0.36);
        const geoCuerpo = new THREE.ExtrudeGeometry(perfil, { depth: ANCHO - 2 * BISEL, bevelEnabled: true, bevelSize: BISEL, bevelThickness: BISEL, bevelSegments: 4 });
        geoCuerpo.rotateX(Math.PI / 2);
        geoCuerpo.translate(0, (ANCHO - 2 * BISEL) / 2, 0);
        combi.add(new THREE.Mesh(geoCuerpo, blanco));

        // Franja naranja a lo largo, justo debajo de las ventanas (como las de la Ruta 2)
        combi.add(caja(THREE, amarillo, 5.12, ANCHO + 0.03, 0.15, -0.02, 0, 1.22));
        combi.add(caja(THREE, amarillo, 5.12, ANCHO + 0.03, 0.035, -0.02, 0, 1.06));
        
        // Vidrios laterales: ventanas de pasajeros y ventana de la puerta del chofer
        const ventanas = [[-2.32, -1.42], [-1.36, -0.46], [-0.40, 0.50], [0.56, 1.30]];
        [1, -1].forEach(lado => {
            ventanas.forEach(([x0, x1]) => combi.add(caja(THREE, vidrio, x1 - x0, 0.03, 0.56, (x0 + x1) / 2, lado * (ANCHO / 2 + 0.008), 1.62)));
            const puertaChofer = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.03, 0.52), vidrio);
            puertaChofer.position.set(1.66, lado * (ANCHO / 2 + 0.008), 1.6);
            combi.add(puertaChofer);
            // espejos
            combi.add(caja(THREE, plastico, 0.08, 0.2, 0.26, 2.0, lado * (ANCHO / 2 + 0.16), 1.5));
            combi.add(caja(THREE, plastico, 0.18, 0.12, 0.04, 2.04, lado * (ANCHO / 2 + 0.07), 1.42));
            // molduras de los arcos de las llantas
            [1.75, -1.62].forEach(x => combi.add(caja(THREE, plastico, 0.95, 0.04, 0.16, x, lado * (ANCHO / 2 + 0.01), 0.72)));
        });
        // puerta corrediza (lado derecho = -y): juntas y riel
        [0.52, 1.32].forEach(x => combi.add(caja(THREE, plastico, 0.025, 0.02, 1.62, x, -(ANCHO / 2 + 0.012), 1.2)));
        combi.add(caja(THREE, plastico, 1.5, 0.03, 0.03, -0.1, -(ANCHO / 2 + 0.012), 1.38));
        combi.add(caja(THREE, plastico, 0.18, 0.04, 0.04, 0.62, -(ANCHO / 2 + 0.02), 1.12));

        // Parabrisas y letrero de la ruta en la parte de arriba
        const parabrisas = new THREE.Mesh(new THREE.BoxGeometry(0.02, ANCHO - 0.16, 0.8), vidrio);
        parabrisas.position.set(2.04, 0, 1.56);
        parabrisas.rotation.y = -0.6;
        combi.add(parabrisas);
        const c = document.createElement('canvas');
        c.width = 512; c.height = 96;
        const g = c.getContext('2d');
        g.fillStyle = '#f5c400'; g.fillRect(0, 0, c.width, c.height);
        g.fillStyle = '#111'; g.font = 'bold 62px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(opciones.numero ? 'POLLO  ' + opciones.numero : 'RUTA 2 · POLLO', c.width / 2, c.height / 2 + 3);
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        const matLetrero = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, emissive: 0x332800, side: THREE.DoubleSide });
        const piv = new THREE.Group();
        piv.position.set(1.80, 0, 1.93);
        piv.rotation.y = -0.6;
        const placa = new THREE.Mesh(new THREE.PlaneGeometry(ANCHO - 0.4, 0.2), matLetrero);
        placa.rotation.x = Math.PI / 2;
        placa.rotation.y = Math.PI / 2;
        placa.position.x = 0.02;
        piv.add(placa);
        combi.add(piv);
        // medallón
        combi.add(caja(THREE, vidrio, 0.03, 1.5, 0.62, -2.635, 0, 1.6));

        // Frente: parrilla, faros, defensa y placa
        combi.add(caja(THREE, plastico, 0.05, 1.1, 0.26, 2.655, 0, 0.74));
        [0.48, 0.9].forEach(z => combi.add(caja(THREE, gris, 0.02, 1.0, 0.025, 2.682, 0, z - 0.1)));
        const faro = mat(THREE, COLORES.faro, { emissive: 0xfff1b0, emissiveIntensity: 0.6, roughness: 0.2 });
        const calavera = mat(THREE, COLORES.calavera, { emissive: 0x7a0000, emissiveIntensity: 0.4 });
        [0.66, -0.66].forEach(y => {
            combi.add(caja(THREE, faro, 0.06, 0.38, 0.2, 2.64, y, 0.9));
            combi.add(caja(THREE, calavera, 0.05, 0.14, 0.42, -2.63, y * 1.13, 1.0));
        });
        combi.add(caja(THREE, plastico, 0.18, ANCHO + 0.06, 0.24, 2.66, 0, 0.47));
        combi.add(caja(THREE, plastico, 0.16, ANCHO + 0.04, 0.22, -2.64, 0, 0.47));
        const placaMat = mat(THREE, 0xf3f3f3, { roughness: 0.5 });
        combi.add(caja(THREE, placaMat, 0.02, 0.36, 0.13, 2.76, 0, 0.47));
        combi.add(caja(THREE, placaMat, 0.02, 0.36, 0.13, -2.66, 0, 0.66));

        // Número económico de la unidad, pintado en negro
        if (opciones.numero) {
            const cn = document.createElement('canvas');
            cn.width = 128; cn.height = 64;
            const gn = cn.getContext('2d');
            gn.fillStyle = '#111'; gn.font = 'bold 54px Arial, sans-serif'; gn.textAlign = 'center'; gn.textBaseline = 'middle';
            gn.fillText(String(opciones.numero), 64, 34);
            const tn = new THREE.CanvasTexture(cn);
            tn.colorSpace = THREE.SRGBColorSpace;
            const mn = new THREE.MeshBasicMaterial({ map: tn, transparent: true, depthWrite: false });
            [1, -1].forEach(lado => {
                const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), mn);
                pl.rotation.x = Math.PI / 2;
                pl.rotation.y = lado > 0 ? Math.PI : 0;
                pl.position.set(-1.7, lado * (ANCHO / 2 + 0.012), 0.82);
                combi.add(pl);
            });
        }

        // Canastilla en el techo
        combi.add(caja(THREE, plastico, 2.6, 0.05, 0.05, -0.6, 0.78, 2.26));
        combi.add(caja(THREE, plastico, 2.6, 0.05, 0.05, -0.6, -0.78, 2.26));
        [-1.8, -0.6, 0.6].forEach(x => combi.add(caja(THREE, plastico, 0.05, 1.6, 0.04, x, 0, 2.27)));

        // Llantas con rines
        const geoLlanta = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 28);
        const geoRin = new THREE.CylinderGeometry(0.2, 0.2, 0.25, 20);
        [1.75, -1.62].forEach(x => {
            [1, -1].forEach(lado => {
                const llanta = new THREE.Mesh(geoLlanta, negro);
                llanta.position.set(x, lado * 0.83, 0.34);
                combi.add(llanta);
                const rin = new THREE.Mesh(geoRin, gris);
                rin.position.set(x, lado * 0.84, 0.34);
                combi.add(rin);
            });
        });
        combi.add(sombra(THREE, 3.0, 1.35, 0.3));
        return combi;
    }

    function crearParadaBase(THREE) {
        const parada = new THREE.Group();
        parada.name = 'parada';

        const concreto = mat(THREE, COLORES.concreto, { roughness: 0.95 });
        const amarillo = mat(THREE, COLORES.amarillo, { roughness: 0.6 });
        const estructura = mat(THREE, COLORES.navy, { metalness: 0.4, roughness: 0.4 });
        const techo = mat(THREE, COLORES.teal, { roughness: 0.45 });
        const madera = mat(THREE, COLORES.madera, { roughness: 0.8 });
        const cristal = new THREE.MeshStandardMaterial({
            color: 0xa9d4ea, transparent: true, opacity: 0.38, roughness: 0.05, metalness: 0.1, depthWrite: false
        });
        const panelLuz = mat(THREE, 0xffffff, { emissive: 0xe8f2f8, emissiveIntensity: 0.55 });

        // Banqueta y guarnición pintada de amarillo (lado de la calle = -y).
        parada.add(caja(THREE, concreto, 4.6, 2.2, 0.16, 0, 0, 0.08));
        parada.add(caja(THREE, amarillo, 4.6, 0.14, 0.18, 0, -1.1, 0.09));

        // Postes traseros y delanteros.
        [[-1.85, 0.75], [1.85, 0.75], [-1.85, -0.55], [1.85, -0.55]].forEach(([x, y]) => {
            parada.add(caja(THREE, estructura, 0.1, 0.1, 2.5, x, y, 0.16 + 1.25));
        });

        // Techo ligeramente inclinado hacia atrás.
        const t = caja(THREE, techo, 4.5, 2.25, 0.12, 0, 0.05, 2.72);
        t.rotation.x = -0.06;
        parada.add(t);
        parada.add(caja(THREE, estructura, 4.5, 0.08, 0.16, 0, -1.06, 2.64));

        // Panel trasero de cristal.
        parada.add(caja(THREE, cristal, 3.6, 0.04, 1.85, 0, 0.78, 0.16 + 0.3 + 0.93));

        // Panel lateral iluminado (mapa de la ruta / publicidad).
        parada.add(caja(THREE, estructura, 0.12, 1.32, 2.0, 1.95, 0.1, 0.16 + 1.15));
        parada.add(caja(THREE, panelLuz, 0.14, 1.12, 1.7, 1.95, 0.1, 0.16 + 1.18));

        // Banca.
        parada.add(caja(THREE, madera, 2.6, 0.48, 0.07, -0.3, 0.42, 0.62));
        parada.add(caja(THREE, madera, 2.6, 0.06, 0.4, -0.3, 0.68, 0.9));
        [-1.4, 0.8].forEach(x => parada.add(caja(THREE, estructura, 0.08, 0.4, 0.46, x, 0.42, 0.39)));

        // Señal de parada en poste (amarilla, como la combi).
        parada.add(caja(THREE, estructura, 0.08, 0.08, 2.9, -2.55, -0.85, 0.16 + 1.45));
        const senal = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.05, 32), amarillo);
        senal.rotation.z = Math.PI / 2; // disco vertical de frente al tráfico (eje x)
        senal.position.set(-2.55, -0.85, 2.85);
        parada.add(senal);
        const centro = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 32), estructura);
        centro.rotation.copy(senal.rotation);
        centro.position.copy(senal.position);
        parada.add(centro);

        return parada;
    }

    // ====================== MODELO GLB (Blender) ======================
    function prepararModeloGLB(THREE, escenaGLTF, largo) {
        const contenedor = new THREE.Group();
        escenaGLTF.rotation.x = Math.PI / 2; // Y-arriba (glTF) -> Z-arriba (mapa)
        contenedor.add(escenaGLTF);
        contenedor.updateMatrixWorld(true);

        const caja3 = new THREE.Box3().setFromObject(contenedor);
        const tam = caja3.getSize(new THREE.Vector3());
        const ladoMayor = Math.max(tam.x, tam.y) || 1;
        const escala = largo ? largo / ladoMayor : 1;
        escenaGLTF.scale.multiplyScalar(escala);

        // Centrar en x/y y apoyar sobre el piso (z = 0).
        contenedor.updateMatrixWorld(true);
        const caja4 = new THREE.Box3().setFromObject(contenedor);
        const centro = caja4.getCenter(new THREE.Vector3());
        escenaGLTF.position.x -= centro.x;
        escenaGLTF.position.y -= centro.y;
        escenaGLTF.position.z -= caja4.min.z;

        const parada = new THREE.Group();
        parada.name = 'parada';
        parada.add(contenedor);
        return parada;
    }

    window.Modelos3D = { crearCombi, crearParadaBase, prepararModeloGLB };
})();
