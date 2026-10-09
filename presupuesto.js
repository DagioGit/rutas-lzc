// ============ PRESUPUESTO DE LA CASETA LZC ============
// Precios de referencia en pesos mexicanos (MXN), IVA incluido, octubre de 2026.
// Los materiales con fuente salen de tiendas en línea y catálogos públicos;
// los marcados como "estimado" hay que cotizarlos con proveedores de Lázaro Cárdenas.
// Lo usan la página principal (calculadora de la caseta) y la ficha técnica.
//
// Para cambiar un precio: edita "pu" (precio unitario) o "cantidad". Todo se recalcula solo.

window.PRESUPUESTO_CASETA = {
    fecha: "octubre de 2026",
    moneda: "MXN",
    modulos: [
        {
            id: "plataforma", nombre: "Plataforma y cimentación", fijo: true,
            desc: "Losa de concreto de 4.80 × 2.40 m a nivel de banqueta, franja táctil y espacio para silla de ruedas.",
            partidas: [
                { concepto: "Demolición de banqueta existente y nivelación", cantidad: 1, unidad: "lote", pu: 2500, nota: "estimado" },
                { concepto: "Concreto premezclado f'c 250, colocado y vibrado", cantidad: 1.9, unidad: "m³", pu: 5000, fuente: "concreto" },
                { concepto: "Malla electrosoldada y cimbra perimetral", cantidad: 1, unidad: "lote", pu: 1500, nota: "estimado" },
                { concepto: "Loseta podotáctil amarilla (franja táctil)", cantidad: 2, unidad: "m²", pu: 900, nota: "estimado" },
                { concepto: "Placas base y anclas para columnas", cantidad: 2, unidad: "juego", pu: 1000, nota: "estimado" },
                { concepto: "Señalización del espacio para silla de ruedas", cantidad: 1, unidad: "lote", pu: 400, nota: "estimado" },
                { concepto: "Rampa de concreto para silla de ruedas (2.0 × 0.95 m) pintada con el símbolo de accesibilidad", cantidad: 1, unidad: "lote", pu: 1800, nota: "estimado" }
            ]
        },
        {
            id: "estructura", nombre: "Estructura y cubierta", fijo: true,
            desc: "Dos columnas de acero con viguetas en voladizo, cubierta de lámina con plafón, canalón y bajante pluvial.",
            partidas: [
                { concepto: "PTR 4\" × 4\" cal. 11 (columnas, viguetas y largueros)", cantidad: 4, unidad: "pza 6 m", pu: 2250, fuente: "ptr" },
                { concepto: "Lámina de cubierta y plafón", cantidad: 11.8, unidad: "m²", pu: 650, nota: "estimado" },
                { concepto: "Canalón y bajante pluvial", cantidad: 1, unidad: "lote", pu: 1200, nota: "estimado" },
                { concepto: "Pintura anticorrosiva y esmalte grafito", cantidad: 1, unidad: "lote", pu: 3500, nota: "estimado" },
                { concepto: "Fabricación y montaje (taller de herrería)", cantidad: 1, unidad: "lote", pu: 12000, nota: "estimado" }
            ]
        },
        {
            id: "cristal", nombre: "Respaldo de cristal templado", fijo: true,
            desc: "Dos hojas de cristal templado de 10 mm: protegen del viento y dejan ver la calle (más seguridad de noche).",
            partidas: [
                { concepto: "Cristal templado 10 mm con herrajes, instalado", cantidad: 7.1, unidad: "m²", pu: 2200, nota: "estimado" },
                { concepto: "Franja de vinil anticolisión (color de la ruta)", cantidad: 1, unidad: "pza", pu: 400, nota: "estimado" }
            ]
        },
        {
            id: "banca", nombre: "Banca de madera", fijo: true,
            desc: "Banca de 2.10 m en madera tropical tratada, con ménsulas de acero y descansabrazos para levantarse con apoyo.",
            partidas: [
                { concepto: "Banca de madera tropical con ménsulas de acero", cantidad: 1, unidad: "pza", pu: 7500, nota: "estimado" }
            ]
        },
        {
            id: "senal", nombre: "Letrero y señal de parada", fijo: true,
            desc: "Letrero frontal retroiluminado con el nombre de la parada y disco «R2» en poste, visible para el chofer.",
            partidas: [
                { concepto: "Letrero frontal (vinil sobre lámina, retroiluminado)", cantidad: 1, unidad: "pza", pu: 2500, nota: "estimado" },
                { concepto: "Poste con disco de parada reflejante", cantidad: 1, unidad: "pza", pu: 1500, nota: "estimado" }
            ]
        },
        {
            id: "solar", nombre: "Energía solar e iluminación", fijo: true,
            desc: "Dos paneles en el techo, batería de litio y controlador: la caseta no necesita conexión a CFE. Luz LED que se enciende sola al oscurecer.",
            partidas: [
                { concepto: "Módulo solar monocristalino 550–645 W", cantidad: 2, unidad: "pza", pu: 3450, fuente: "panel" },
                { concepto: "Controlador de carga MPPT 40 A", cantidad: 1, unidad: "pza", pu: 2200, fuente: "mppt" },
                { concepto: "Batería LiFePO4 12.8 V 100 Ah", cantidad: 2, unidad: "pza", pu: 4800, fuente: "bateria" },
                { concepto: "Gabinete metálico IP65 con llave", cantidad: 1, unidad: "pza", pu: 1800, fuente: "gabinete" },
                { concepto: "Tira LED 12 V IP67, perfil de aluminio y sensor crepuscular", cantidad: 1, unidad: "lote", pu: 1600, fuente: "led" },
                { concepto: "Cableado, protecciones y tierra física", cantidad: 1, unidad: "lote", pu: 2500, nota: "estimado" },
                { concepto: "Instalación eléctrica", cantidad: 1, unidad: "lote", pu: 3000, nota: "estimado" }
            ]
        },
        {
            id: "totem", nombre: "Tótem contador de llegada", fijo: true,
            desc: "Pantalla LED a dos caras que dice cuánto falta para la próxima combi. Un ESP32 con módem 4G recibe la información.",
            partidas: [
                { concepto: "Módulo LED P10 para exterior (32 × 16 cm)", cantidad: 8, unidad: "pza", pu: 650, fuente: "p10" },
                { concepto: "Tarjeta ESP32-S3 con módem 4G", cantidad: 1, unidad: "pza", pu: 1260, fuente: "esp32" },
                { concepto: "Fuente DC-DC 12 → 5 V y cableado", cantidad: 1, unidad: "lote", pu: 600, nota: "estimado" },
                { concepto: "Gabinete del tótem (lámina, acrílico y base)", cantidad: 1, unidad: "pza", pu: 6500, nota: "estimado" }
            ]
        },
        {
            id: "mapa", nombre: "Mapa «Usted está aquí»", fijo: true,
            desc: "Panel a dos caras con el mapa de la zona, los lugares importantes a pie y el código QR de la parada en vivo.",
            partidas: [
                { concepto: "Vinil impreso de alta resolución, laminado (2 caras)", cantidad: 4, unidad: "m²", pu: 200, fuente: "vinil" },
                { concepto: "Marco de acero y policarbonato protector", cantidad: 1, unidad: "pza", pu: 2500, nota: "estimado" }
            ]
        },
        {
            id: "celosia", nombre: "Celosía de madera", fijo: false,
            desc: "Lamas verticales en el extremo: dan sombra con el sol de la tarde y dejan pasar el aire.",
            partidas: [
                { concepto: "Celosía de 7 lamas de madera tratada con rieles", cantidad: 1, unidad: "lote", pu: 4500, nota: "estimado" }
            ]
        },
        {
            id: "apoyo", nombre: "Apoyo isquiático", fijo: false,
            desc: "Barra acolchada para esperar recargado: útil para quien no quiere sentarse o lleva bultos.",
            partidas: [
                { concepto: "Apoyo isquiático de acero y madera", cantidad: 1, unidad: "pza", pu: 2500, nota: "estimado" }
            ]
        },
        {
            id: "usb", nombre: "Carga USB", fijo: false,
            desc: "Dos tomas USB en la columna, alimentadas por los paneles solares.",
            partidas: [
                { concepto: "Toma USB doble 12 V para exterior", cantidad: 2, unidad: "pza", pu: 150, fuente: "usb" },
                { concepto: "Instalación", cantidad: 1, unidad: "lote", pu: 200, nota: "estimado" }
            ]
        },
        {
            id: "basura", nombre: "Botes de basura separada", fijo: false,
            desc: "Reciclable, orgánico e inorgánico, de acero, soldados a la caseta junto a la banca.",
            partidas: [
                { concepto: "Bote doble de acero inoxidable (orgánico / inorgánico)", cantidad: 1, unidad: "pza", pu: 4000, fuente: "bote" }
            ]
        },
        {
            id: "voz", nombre: "Señalamiento por voz", fijo: false,
            desc: "Botón con braille en la columna: al presionarlo, una bocina dice el nombre de la parada y en cuántos minutos llega la próxima combi. Para personas con discapacidad visual.",
            partidas: [
                { concepto: "Módulo de audio con bocina exterior IP65", cantidad: 1, unidad: "pza", pu: 1200, nota: "estimado" },
                { concepto: "Botón pulsador antivandálico con placa en braille", cantidad: 1, unidad: "pza", pu: 650, nota: "estimado" },
                { concepto: "Instalación y programación", cantidad: 1, unidad: "lote", pu: 500, nota: "estimado" }
            ]
        }
    ],
    // Costos que se suman a cada caseta.
    indirectos: [
        { concepto: "Proyecto ejecutivo y revisión estructural", importe: 3000 },
        { concepto: "Permiso municipal para obra en vía pública", importe: 1500 },
        { concepto: "Flete e instalación con grúa", importe: 3000 }
    ],
    imprevistos: 0.10, // 10 % sobre materiales, mano de obra e indirectos
    // Operación de una caseta durante un año.
    operacion: [
        { concepto: "Datos móviles del tótem (plan IoT)", mensual: 150 },
        { concepto: "Limpieza y mantenimiento preventivo", mensual: 600 },
        { concepto: "Fondo de reposición (baterías, LED, vinil)", mensual: 125 }
    ],
    // Consumo eléctrico diario (para dimensionar los paneles y la batería).
    energia: {
        consumos: [
            { equipo: "Tira LED (de 18:30 a 6:30)", watts: 24, horas: 12 },
            { equipo: "Tótem LED a dos caras (promedio)", watts: 32, horas: 18 },
            { equipo: "ESP32 con módem 4G", watts: 3, horas: 24 },
            { equipo: "Carga USB (uso estimado)", watts: 10, horas: 10 },
            { equipo: "Mapa y letrero retroiluminados", watts: 12, horas: 12 },
            { equipo: "Bocina del señalamiento por voz (uso estimado)", watts: 10, horas: 1 }
        ],
        panelesW: 1100,       // 2 × 550 W
        horasSolPico: 5.5,    // costa de Michoacán, promedio anual aproximado
        eficiencia: 0.75,     // pérdidas de controlador, cableado, calor y polvo
        bateriaWh: 2560,      // 2 × 12.8 V × 100 Ah
        profundidad: 0.8      // descarga útil de la batería LiFePO4
    },
    fuentes: {
        concreto: { texto: "Tandacasa · precio unitario del concreto f'c 250 colocado (CDMX, julio 2026): $4,998/m³", url: "https://tandacasa.com/blog/colado-de-losa-cuanto-cuesta-2026" },
        ptr: { texto: "Tool Ferreterías · PTR 4\" × 4\" cal. 11: $2,247", url: "https://www.toolferreterias.com/products/ptr-4-x-4-calibre-11" },
        panel: { texto: "Amazon México · módulos LONGi 645 W: $3,426–$3,513; Syscom vende módulos de 550 W", url: "https://www.syscom.mx/producto/ETM772BH550WW-WB-ETSOLAR-207706.html" },
        mppt: { texto: "Amazon México · EPEVER MPPT 40 A 12/24 V: $2,201", url: "https://www.amazon.com.mx/s?k=controlador+carga+mppt+40a+12v" },
        bateria: { texto: "Amazon México · LiFePO4 12 V 100 Ah: $4,299–$5,270", url: "https://www.amazon.com.mx/s?k=bateria+lifepo4+12v+100ah" },
        gabinete: { texto: "Amazon México · gabinetes metálicos IP65: $899–$3,324", url: "https://www.amazon.com.mx/s?k=gabinete+electrico+intemperie+nema+4x" },
        led: { texto: "Amazon México · tira LED 12 V IP67 de 5 m: $220–$490; sensores 12 V: $146–$184", url: "https://www.amazon.com.mx/s?k=tira+led+12v+exterior+ip67+5+metros" },
        p10: { texto: "Amazon México · módulo LED P10 exterior 32 × 16: $590–$800", url: "https://www.amazon.com.mx/s?k=modulo+led+p10+exterior+32x16" },
        esp32: { texto: "Amazon México · Waveshare ESP32-S3 SIM7670G 4G: $1,264", url: "https://www.amazon.com.mx/s?k=modulo+sim+4g+esp32" },
        vinil: { texto: "Amazon México · vinil impreso alta resolución: $180–$205 por m²", url: "https://www.amazon.com.mx/s?k=vinil+impreso+alta+resolucion+exterior+m2" },
        usb: { texto: "Amazon México · toma USB doble 12 V impermeable: $134–$234", url: "https://www.amazon.com.mx/s?k=cargador+usb+12v+empotrable+doble+impermeable" },
        bote: { texto: "Amazon México · bote doble de acero inoxidable con separación: $2,390–$3,995", url: "https://www.amazon.com.mx/s?k=bote+basura+exterior+acero+doble+separacion" }
    }
};

// ---------- Cálculos (los usan la página y la ficha) ----------
window.Presupuesto = (function () {
    const P = window.PRESUPUESTO_CASETA;
    const importe = p => p.cantidad * p.pu;
    const modulo = m => m.partidas.reduce((s, p) => s + importe(p), 0);
    // total de una caseta con los módulos elegidos (por omisión, todos)
    function caseta(elegidos) {
        const mods = P.modulos.filter(m => m.fijo || !elegidos || elegidos.includes(m.id));
        const directo = mods.reduce((s, m) => s + modulo(m), 0);
        const indirecto = P.indirectos.reduce((s, i) => s + i.importe, 0);
        const imprevistos = (directo + indirecto) * P.imprevistos;
        return { directo, indirecto, imprevistos, total: directo + indirecto + imprevistos };
    }
    const operacionAnual = () => P.operacion.reduce((s, o) => s + o.mensual * 12, 0);
    function energia() {
        const E = P.energia;
        const consumo = E.consumos.reduce((s, c) => s + c.watts * c.horas, 0);
        const generacion = E.panelesW * E.horasSolPico * E.eficiencia;
        const autonomia = (E.bateriaWh * E.profundidad) / consumo;
        return { consumo, generacion, autonomia };
    }
    const pesos = n => "$" + Math.round(n).toLocaleString("es-MX");
    const redondo = n => "$" + (Math.round(n / 1000) * 1000).toLocaleString("es-MX");
    return { importe, modulo, caseta, operacionAnual, energia, pesos, redondo };
})();
