// ============ RUTA 2 "POLLO" — RECORRIDO ============
// Primera ruta de la plataforma de combis de Lázaro Cárdenas.
// Base: Calle Tamarindo, Col. Benito Juárez (ubicación confirmada).
// RECORRIDO REAL (dibujado por el equipo en Google Earth, oct 2026):
// Base → Libramiento a Sicartsa → Av. Melchor Ocampo (Parada A, Tec; Parada B) →
// Fidelac → Av. Autonomía Universitaria → Col. Ejidal → Centro → regreso por
// Av. Río Balsas y Av. Belisario Domínguez (Parada H) → Av. Melchor Ocampo (Parada I) →
// Libramiento → Base. Unos 19.5 km por vuelta.
// "trazo" es la lista de [lng, lat] en orden; para corregirla se reemplaza completa.

window.RUTA_2 = {
    nombre: "Ruta 2 · Pollo",
    numero: 2,
    apodo: "Pollo",
    simulada: false, // recorrido real; el horario sigue siendo simulado
    base: {
        id: "base",
        name: "Base Ruta 2",
        corto: "Base",
        lat: 17.977166,
        lng: -102.235471,
        calle: "Calle Tamarindo",
        colonia: "Col. Benito Juárez",
        desc: "Punto de salida y regreso de las unidades.",
        imagen: "img/base.jpg"
    },
    // Para agregar otra parada: copia un bloque, cambia id, nombre, km y coordenadas.
    // "km" es la distancia sobre el recorrido desde la base (la da la tabla de la ficha técnica).
    // "cerca" son los lugares importantes a pie; salen en el mapa de la caseta.
    // Si no tiene maqueta hecha a mano en zonas-3d.js, el visor 3D genera una con OpenStreetMap.
    paradas: [
        {
            id: "A",
            name: "Parada A",
            corto: "A",
            apodo: "Tecnológico",
            km: 0.61, // distancia sobre el recorrido desde la base (ayuda cuando una calle se recorre de ida y de vuelta)
            lat: 17.973962,
            lng: -102.232731,
            calle: "Av. Melchor Ocampo, carril hacia el oriente",
            referencia: "Frente a la barda blanca del Instituto Tecnológico, junto a su entrada lateral",
            texto: "Sobre la plancha de concreto pegada a la barda blanca del Tecnológico, entre la ciclovía y la entrada lateral. A unos pasos empieza la barda de piedra; enfrente hay locales y comercios de la colonia.",
            desc: "Primera parada después de la base y la que más estudiantes atiende: entrada lateral del Tecnológico y dos bachilleratos a cinco minutos.",
            imagen: "img/parada-a.jpg",
            propuesta: false, // true: ubicación elegida en gabinete, falta visitarla
            entorno: [
                "Plancha de concreto pegada a la barda blanca del Tecnológico",
                "Entrada lateral del Tec a 15 m al poniente",
                "Barda de piedra a partir de 14 m al oriente; entrada principal a 90 m",
                "Ciclovía con guarnición amarilla entre la calle y la banqueta",
                "Carril de estacionamiento y camellón con árboles jóvenes"
            ],
            cerca: [
                { nombre: "Instituto Tecnológico (entrada lateral)", tipo: "escuela", min: 1, lat: 17.9737, lng: -102.233 },
                { nombre: "Bachillerato Belisario Domínguez", tipo: "escuela", min: 5, lat: 17.974343, lng: -102.229979 },
                { nombre: "Instituto Tecnológico (edificios)", tipo: "escuela", min: 6, lat: 17.971014, lng: -102.232728 }
            ]
        },
        {
            id: "B",
            name: "Parada B",
            corto: "B",
            apodo: "Clínica Fátima",
            km: 2.3, // distancia sobre el recorrido desde la base (ayuda cuando una calle se recorre de ida y de vuelta)
            lat: 17.971609,
            lng: -102.22358,
            calle: "Av. Melchor Ocampo, carril hacia el sureste",
            referencia: "Frente a la Clínica Fátima, del otro lado del camellón; la UMF 78 del IMSS a cuatro minutos",
            texto: "Tramo de Av. Melchor Ocampo con clínicas, laboratorios y farmacias. Del otro lado del camellón queda la Clínica Fátima. La caseta da sombra a quien sale de consulta y a los adultos mayores de la Casa del Anciano.",
            desc: "Zona de salud: clínica, IMSS UMF 78, centro médico y laboratorios en menos de ocho minutos a pie.",
            propuesta: true, // true: ubicación elegida en gabinete, falta visitarla
            maqueta: "img/parada-b.jpg", // maqueta 3D (zonas-fichas.js)
            entorno: [
                "Av. Melchor Ocampo dividida por un camellón de concreto con guarnición amarilla y árboles jóvenes",
                "Clínica Fátima enfrente: tres pisos, columnas azul marino y Farmacia Fátima 24 horas",
                "Locales con techo de lámina y casas de dos pisos del lado de la parada",
                "Cruce con Av. Francisco Zarco a unos pasos, hacia el norte",
                "Palmas y autos estacionados frente a la clínica"
            ],
            cerca: [
                { nombre: "Clínica Fátima", tipo: "salud", min: 1, lat: 17.97189, lng: -102.223494 },
                { nombre: "IMSS UMF 78", tipo: "salud", min: 4, lat: 17.973626, lng: -102.224592 },
                { nombre: "Secundaria Técnica 131", tipo: "escuela", min: 5, lat: 17.969422, lng: -102.224515 },
                { nombre: "Casa del Anciano", tipo: "salud", min: 6, lat: 17.974089, lng: -102.221504 },
                { nombre: "Plaza comercial Melchor Ocampo", tipo: "compras", min: 6, lat: 17.968859, lng: -102.221741 },
                { nombre: "Centro Médico Santa Clara", tipo: "salud", min: 7, lat: 17.975155, lng: -102.224437 }
            ]
        },
        {
            id: "C",
            name: "Parada C",
            corto: "C",
            apodo: "CFE",
            km: 5.4, // distancia sobre el recorrido desde la base (ayuda cuando una calle se recorre de ida y de vuelta)
            lat: 17.968166,
            lng: -102.209344,
            calle: "Av. Autonomía Universitaria, carril hacia el oriente",
            referencia: "Junto a la barda de la subestación eléctrica de la CFE; la oficina de atención y pago a un minuto",
            texto: "Sobre Av. Autonomía Universitaria, en el 2.º sector de Fidelac. La caseta queda en la banqueta ancha de la subestación de la CFE; mucha gente viene a pagar la luz y hay tres escuelas en la misma cuadra.",
            desc: "Trámites y escuelas: CFE, CECATI 70, Preparatoria Enrique Ramírez, Secundaria Técnica 110 y el CAM.",
            propuesta: true, // true: ubicación elegida en gabinete, falta visitarla
            maqueta: "img/parada-c.jpg", // maqueta 3D (zonas-fichas.js)
            entorno: [
                "Barda gris de la subestación eléctrica de la CFE a todo lo largo de la banqueta",
                "Letrero verde de la CFE y estructuras de acero de la subestación detrás de la barda",
                "Banqueta ancha de concreto con guarnición amarilla",
                "Camellón ancho de pasto con árboles grandes",
                "Enfrente, terrenos abiertos con una torre de alta tensión y bodegas al fondo"
            ],
            cerca: [
                { nombre: "CFE · atención y pago", tipo: "trámite", min: 1, lat: 17.96818, lng: -102.209653 },
                { nombre: "CAM Educación Especial", tipo: "escuela", min: 3, lat: 17.968487, lng: -102.207728 },
                { nombre: "Preparatoria Gral. Enrique Ramírez", tipo: "escuela", min: 3, lat: 17.967069, lng: -102.210578 },
                { nombre: "Coppel", tipo: "compras", min: 4, lat: 17.969758, lng: -102.210503 },
                { nombre: "Secundaria Técnica 110", tipo: "escuela", min: 4, lat: 17.970162, lng: -102.208708 },
                { nombre: "CECATI 70", tipo: "escuela", min: 5, lat: 17.968029, lng: -102.211845 }
            ]
        },
        {
            id: "D",
            name: "Parada D",
            corto: "D",
            apodo: "ISSSTE · Tec de Monterrey",
            km: 6.85, // distancia sobre el recorrido desde la base (ayuda cuando una calle se recorre de ida y de vuelta)
            lat: 17.961366,
            lng: -102.203275,
            calle: "Av. Melchor Ocampo, carril hacia el oriente",
            referencia: "Frente a la agencia Honda, junto al Tec de Monterrey; Bodega Aurrera enfrente",
            texto: "Llegada al centro por Av. Melchor Ocampo: universidad, colegio, supermercado, parque y la clínica del ISSSTE en un radio de cinco minutos.",
            desc: "Nodo de estudiantes, derechohabientes del ISSSTE y compras de todos los días.",
            propuesta: true, // true: ubicación elegida en gabinete, falta visitarla
            maqueta: "img/parada-d.jpg", // maqueta 3D (zonas-fichas.js)
            entorno: [
                "Av. Melchor Ocampo con camellón ancho de primaveras, palmas y guarnición amarilla",
                "Del lado de la parada: agencia Honda, locales de un piso y el Tec de Monterrey (edificio blanco con franja naranja)",
                "Enfrente: Bodega Aurrera con su estacionamiento y el Parque Erandeni",
                "Autos estacionados en batería frente a los locales y autobuses de Estrella de Oro",
                "Glorieta General Paúl González al poniente"
            ],
            cerca: [
                { nombre: "Tec de Monterrey", tipo: "escuela", min: 1, lat: 17.961248, lng: -102.203697 },
                { nombre: "Instituto Rector Hidalgo", tipo: "escuela", min: 2, lat: 17.960683, lng: -102.202401 },
                { nombre: "Bodega Aurrera", tipo: "compras", min: 2, lat: 17.962404, lng: -102.203835 },
                { nombre: "Parque Erandeni", tipo: "parque", min: 3, lat: 17.962317, lng: -102.202264 },
                { nombre: "ISSSTE Ricardo Flores Magón", tipo: "salud", min: 4, lat: 17.960024, lng: -102.204883 },
                { nombre: "Secundaria Federal Jaime Torres Bodet", tipo: "escuela", min: 5, lat: 17.962101, lng: -102.20069 }
            ]
        },
        {
            id: "E",
            name: "Parada E",
            corto: "E",
            apodo: "Central de autobuses",
            km: 7.79, // distancia sobre el recorrido desde la base (ayuda cuando una calle se recorre de ida y de vuelta)
            lat: 17.957662,
            lng: -102.196765,
            calle: "Calle Mariano Matamoros, carril hacia el sureste",
            referencia: "Junto a la barda del Hotel Sol del Pacífico; la Central Estrella de Oro a cuatro minutos",
            texto: "Conexión con los autobuses foráneos: quien llega a la central encuentra aquí la combi. Cerca están Plaza Zirahuén, escuelas y la Unidad Deportiva.",
            desc: "Transbordo con autobuses foráneos y acceso a la Unidad Deportiva.",
            propuesta: true, // true: ubicación elegida en gabinete, falta visitarla
            maqueta: "img/parada-e.jpg", // maqueta 3D (zonas-fichas.js)
            entorno: [
                "Calle Mariano Matamoros, angosta y de un solo sentido, por donde bajan las combis",
                "Barda crema del Hotel Sol del Pacífico con plantas del lado de la parada",
                "Enfrente, barda de ladrillo aparente de un terreno con zacate",
                "Al fondo, la calle General Mina con palmas, grúas y locales",
                "La Central Estrella de Oro y Plaza Zirahuén a cuatro minutos a pie"
            ],
            cerca: [
                { nombre: "Central Estrella de Oro", tipo: "transporte", min: 4, lat: 17.956068, lng: -102.197778 },
                { nombre: "Plaza Zirahuén", tipo: "compras", min: 4, lat: 17.959792, lng: -102.196201 },
                { nombre: "Secundaria Técnica 12", tipo: "escuela", min: 5, lat: 17.959869, lng: -102.197692 },
                { nombre: "Unidad Deportiva Lázaro Cárdenas", tipo: "parque", min: 6, lat: 17.956197, lng: -102.199582 },
                { nombre: "Primaria Federal Lázaro Cárdenas", tipo: "escuela", min: 6, lat: 17.959993, lng: -102.199187 },
                { nombre: "Palacio Municipal", tipo: "trámite", min: 9, lat: 17.962282, lng: -102.197804 }
            ]
        },
        {
            id: "F",
            name: "Parada F",
            corto: "F",
            apodo: "Centro · Mercado Hidalgo",
            km: 10.05, // distancia sobre el recorrido desde la base (ayuda cuando una calle se recorre de ida y de vuelta)
            lat: 17.96384,
            lng: -102.195897,
            calle: "Av. Heroica Escuela Naval Militar, carril hacia el poniente",
            referencia: "En la esquina con el Andador Nayarit, a un minuto del Parque Tierra Caliente y a tres del Mercado Hidalgo",
            texto: "El corazón del centro: mercado, Palacio Municipal, Protección Civil, COCOTRA y el Hospital del IMSS a menos de siete minutos.",
            desc: "La parada con más destinos: compras, trámites municipales y el hospital general del IMSS.",
            propuesta: true, // true: ubicación elegida en gabinete, falta visitarla
            maqueta: "img/parada-f.jpg", // maqueta 3D (zonas-fichas.js)
            entorno: [
                "Av. Heroica Escuela Naval Militar en el centro, con dos sentidos y camellón angosto",
                "Tienda de abarrotes azul de dos pisos en la esquina con el Andador Nayarit",
                "Casa cubierta de enredadera con techo de teja junto a la parada",
                "Enfrente, locales de dos pisos y árboles grandes",
                "Parque Tierra Caliente a un minuto y Mercado Hidalgo a tres"
            ],
            cerca: [
                { nombre: "Parque Tierra Caliente", tipo: "parque", min: 1, lat: 17.964515, lng: -102.195628 },
                { nombre: "Mercado Hidalgo", tipo: "compras", min: 3, lat: 17.963013, lng: -102.194843 },
                { nombre: "Protección Civil", tipo: "trámite", min: 4, lat: 17.962724, lng: -102.198002 },
                { nombre: "Palacio Municipal", tipo: "trámite", min: 5, lat: 17.962282, lng: -102.197804 },
                { nombre: "COCOTRA (Transporte Público)", tipo: "trámite", min: 6, lat: 17.965856, lng: -102.193421 },
                { nombre: "Hospital IMSS", tipo: "salud", min: 6, lat: 17.964057, lng: -102.19938 }
            ]
        },
        {
            id: "G",
            name: "Parada G",
            corto: "G",
            apodo: "Soriana",
            km: 12.27, // distancia sobre el recorrido desde la base (ayuda cuando una calle se recorre de ida y de vuelta)
            lat: 17.970361,
            lng: -102.211385,
            calle: "Prol. Tulipanes, carril hacia el nororiente",
            referencia: "Junto a la barda lateral de Soriana Mercado; Coppel en el mismo estacionamiento",
            texto: "De regreso del centro, en Prol. Tulipanes: supermercado y tiendas; el Hospital Naval y el CECATI a cinco minutos.",
            desc: "Compras de la semana y conexión con el Hospital Naval.",
            propuesta: true, // true: ubicación elegida en gabinete, falta visitarla
            maqueta: "img/parada-g.jpg", // maqueta 3D (zonas-fichas.js)
            entorno: [
                "Prolongación Tulipanes dividida por un camellón de pasto con árboles jóvenes",
                "Barda lateral de Soriana Mercado: ladrillo, franja roja y lámina gris, con talud de piedra bola",
                "Coppel junto a Soriana, sobre el mismo estacionamiento",
                "Enfrente, edificios de departamentos de cuatro pisos con jardineras azules",
                "Tráileres y autos que van hacia la Av. Autonomía Universitaria"
            ],
            cerca: [
                { nombre: "Soriana Mercado", tipo: "compras", min: 1, lat: 17.970053, lng: -102.211207 },
                { nombre: "Coppel", tipo: "compras", min: 2, lat: 17.969758, lng: -102.210503 },
                { nombre: "CECATI 70", tipo: "escuela", min: 5, lat: 17.968029, lng: -102.211845 },
                { nombre: "Hospital Naval", tipo: "salud", min: 5, lat: 17.972443, lng: -102.212653 },
                { nombre: "Secundaria Técnica 110", tipo: "escuela", min: 5, lat: 17.970162, lng: -102.208708 }
            ]
        },
        {
            id: "H",
            name: "Parada H",
            corto: "H",
            apodo: "Plaza Las Américas",
            km: 14.19, // distancia sobre el recorrido desde la base (ayuda cuando una calle se recorre de ida y de vuelta)
            lat: 17.97633,
            lng: -102.213406,
            calle: "Av. Belisario Domínguez, carril hacia el poniente",
            referencia: "Frente a la plaza comercial, junto al McDonald's",
            texto: "Del lado de Plaza Las Américas, junto al estacionamiento y al McDonald's de la esquina; al fondo, Walmart y Sam's Club. Enfrente, un camellón arbolado y la barda del fraccionamiento Marina 3.",
            desc: "Plaza Las Américas, Walmart y Liverpool: la parada de compras más grande del recorrido.",
            imagen: "img/parada-h.jpg",
            propuesta: false, // true: ubicación elegida en gabinete, falta visitarla
            entorno: [
                "Banqueta con franja de pasto del lado de la plaza comercial",
                "McDonald's en la esquina; Walmart y Sam's Club al fondo",
                "Estacionamiento de la plaza con luminarias e isletas",
                "Camellón arbolado al centro de la avenida",
                "Barda y acceso del fraccionamiento Marina 3 enfrente"
            ],
            cerca: [
                { nombre: "Liverpool", tipo: "compras", min: 2, lat: 17.977611, lng: -102.213659 },
                { nombre: "Plaza Las Américas", tipo: "compras", min: 3, lat: 17.978049, lng: -102.212959 },
                { nombre: "Walmart Supercenter", tipo: "compras", min: 4, lat: 17.97849, lng: -102.212616 },
                { nombre: "Hospital Naval", tipo: "salud", min: 8, lat: 17.972443, lng: -102.212653 },
                { nombre: "Secundaria Técnica Estatal 9", tipo: "escuela", min: 8, lat: 17.978768, lng: -102.217253 }
            ]
        },
        {
            id: "I",
            name: "Parada I",
            corto: "I",
            apodo: "Valle del Tecnológico",
            km: 17.0, // distancia sobre el recorrido desde la base (ayuda cuando una calle se recorre de ida y de vuelta)
            lat: 17.974054,
            lng: -102.228038,
            calle: "Av. Melchor Ocampo, carril hacia el poniente",
            referencia: "Junto a la fonda La Papaya, frente a la tienda Merza, en la colonia Valle del Tecnológico",
            texto: "Última parada antes de volver a la base, sobre Av. Melchor Ocampo de regreso: supermercado, colegio y dos bachilleratos.",
            desc: "Regreso de estudiantes y compras de la colonia antes de llegar a la base.",
            propuesta: true, // true: ubicación elegida en gabinete, falta visitarla
            maqueta: "img/parada-i.jpg", // maqueta 3D (zonas-fichas.js)
            entorno: [
                "Av. Melchor Ocampo con camellón angosto de concreto, árboles jóvenes y guarnición amarilla",
                "Ciclovía verde con bolardos del lado de la parada, la misma que llega al Tec",
                "Fonda «La Papaya» con toldo naranja, mesas y sillas de plástico junto a la parada",
                "Casas de dos pisos con portones, y una caseta rosa en la esquina",
                "Enfrente, tienda roja de refrescos, edificio de cristal azul y casas de tres pisos"
            ],
            cerca: [
                { nombre: "Merza", tipo: "compras", min: 2, lat: 17.974249, lng: -102.226818 },
                { nombre: "Colegio Anglo Mexicano", tipo: "escuela", min: 3, lat: 17.975276, lng: -102.226951 },
                { nombre: "Bachillerato Belisario Domínguez", tipo: "escuela", min: 4, lat: 17.974343, lng: -102.229979 },
                { nombre: "IMSS UMF 78", tipo: "salud", min: 6, lat: 17.973626, lng: -102.224592 },
                { nombre: "Preparatoria UVAC", tipo: "escuela", min: 7, lat: 17.976033, lng: -102.224926 },
                { nombre: "Centro Médico Santa Clara", tipo: "salud", min: 7, lat: 17.975155, lng: -102.224437 }
            ]
        }
    ],
    // Calles en orden (para mostrar en la página).
    calles: ["Calle Tamarindo", "Libramiento a Sicartsa", "Av. Melchor Ocampo", "Av. Francisco Zarco", "Av. Belisario Domínguez", "Prol. Tulipanes", "Av. Autonomía Universitaria", "Col. Ejidal", "Centro", "Av. Río Balsas", "Av. Belisario Domínguez", "Av. Melchor Ocampo", "Libramiento a Sicartsa", "Calle Tamarindo"],
    trazo: [[-102.235509,17.977016],[-102.235191,17.976941],[-102.234506,17.976759],[-102.234559,17.976539],[-102.234705,17.975931],[-102.234795,17.975544],[-102.234804,17.975511],[-102.235,17.974781],[-102.235049,17.974606],[-102.234493,17.974413],[-102.234301,17.974346],[-102.233352,17.974049],[-102.232897,17.974023],[-102.232729,17.974017],[-102.231844,17.973987],[-102.231416,17.973975],[-102.229791,17.973928],[-102.22971,17.973928],[-102.228389,17.973885],[-102.228209,17.973877],[-102.228152,17.973875],[-102.227661,17.973859],[-102.226702,17.973841],[-102.226589,17.973874],[-102.226586,17.973637],[-102.226598,17.973495],[-102.226602,17.973099],[-102.226761,17.972664],[-102.226938,17.972455],[-102.227111,17.972337],[-102.227524,17.972153],[-102.22771,17.972015],[-102.227827,17.971911],[-102.227959,17.971667],[-102.228079,17.971363],[-102.228226,17.970963],[-102.228307,17.970785],[-102.228212,17.970761],[-102.22797,17.970674],[-102.227757,17.970599],[-102.227455,17.970542],[-102.227248,17.97051],[-102.226936,17.970346],[-102.226532,17.97009],[-102.226272,17.970369],[-102.226016,17.970646],[-102.225894,17.970785],[-102.2257,17.970953],[-102.225461,17.971087],[-102.225001,17.971286],[-102.224655,17.971431],[-102.224154,17.971777],[-102.223791,17.972043],[-102.223262,17.971311],[-102.22208,17.969839],[-102.221227,17.968784],[-102.21998,17.969445],[-102.219903,17.969629],[-102.219764,17.970786],[-102.219674,17.971061],[-102.219391,17.971404],[-102.218754,17.97213],[-102.218118,17.972888],[-102.217386,17.973392],[-102.214587,17.975307],[-102.211884,17.977249],[-102.211678,17.977003],[-102.211842,17.976878],[-102.212275,17.973925],[-102.212315,17.973688],[-102.212225,17.973374],[-102.211974,17.973042],[-102.21186,17.972817],[-102.211995,17.971655],[-102.21204,17.970684],[-102.211998,17.970408],[-102.211894,17.970317],[-102.212045,17.970079],[-102.212114,17.969905],[-102.212208,17.969662],[-102.212325,17.969299],[-102.212383,17.969077],[-102.206247,17.967408],[-102.203585,17.966633],[-102.202725,17.965818],[-102.202865,17.965537],[-102.202905,17.965389],[-102.202928,17.965243],[-102.202991,17.965],[-102.203091,17.964846],[-102.20336,17.964664],[-102.20348,17.964588],[-102.203609,17.964507],[-102.203662,17.964412],[-102.203756,17.964304],[-102.203827,17.964177],[-102.204225,17.963134],[-102.204702,17.961904],[-102.204708,17.961588],[-102.204642,17.961462],[-102.204549,17.961429],[-102.204322,17.961417],[-102.20401,17.961431],[-102.203091,17.961451],[-102.201039,17.961455],[-102.20043,17.961398],[-102.199877,17.961803],[-102.199791,17.961733],[-102.198707,17.960301],[-102.198019,17.959421],[-102.197175,17.958343],[-102.196674,17.95768],[-102.196562,17.957752],[-102.196427,17.957563],[-102.19616,17.957237],[-102.195268,17.956046],[-102.19456,17.955124],[-102.193866,17.954223],[-102.193137,17.953239],[-102.193082,17.953172],[-102.192832,17.95331],[-102.19253,17.953481],[-102.192183,17.953667],[-102.192025,17.953762],[-102.191651,17.955074],[-102.191023,17.957191],[-102.190343,17.959518],[-102.190576,17.959461],[-102.190675,17.9594],[-102.190734,17.959361],[-102.190955,17.95965],[-102.191536,17.960433],[-102.192727,17.961968],[-102.193835,17.96343],[-102.195895,17.963758],[-102.196934,17.963871],[-102.197352,17.963736],[-102.197673,17.9635],[-102.19787,17.963334],[-102.197964,17.963499],[-102.197994,17.963848],[-102.197961,17.964553],[-102.197938,17.964941],[-102.198474,17.965288],[-102.198734,17.965445],[-102.199094,17.965545],[-102.199268,17.965533],[-102.199538,17.965471],[-102.199865,17.965355],[-102.200362,17.965208],[-102.200864,17.965188],[-102.201389,17.965269],[-102.201552,17.965605],[-102.201977,17.965955],[-102.202359,17.966009],[-102.202608,17.966069],[-102.202889,17.966195],[-102.203619,17.966795],[-102.204204,17.966986],[-102.208278,17.968093],[-102.210747,17.968806],[-102.21222,17.969221],[-102.211806,17.97023],[-102.210814,17.970757],[-102.209898,17.97123],[-102.208706,17.971809],[-102.208443,17.97193],[-102.208491,17.972042],[-102.208784,17.971911],[-102.210129,17.971265],[-102.21166,17.970481],[-102.211913,17.970403],[-102.211963,17.970482],[-102.211973,17.970711],[-102.211932,17.971758],[-102.211826,17.972782],[-102.211944,17.97306],[-102.21219,17.973395],[-102.21227,17.973699],[-102.212213,17.973968],[-102.21205,17.975238],[-102.211813,17.976826],[-102.211639,17.976966],[-102.211611,17.976986],[-102.211839,17.977268],[-102.211404,17.977554],[-102.211307,17.977638],[-102.211337,17.977701],[-102.211383,17.977774],[-102.211462,17.977719],[-102.211578,17.977645],[-102.21235,17.9771],[-102.212918,17.976666],[-102.213292,17.976404],[-102.214301,17.975685],[-102.215447,17.974828],[-102.216865,17.973829],[-102.218103,17.973015],[-102.218992,17.971989],[-102.21979,17.97105],[-102.220047,17.969582],[-102.220164,17.969427],[-102.22096,17.968959],[-102.221227,17.968784],[-102.22208,17.969839],[-102.223262,17.971311],[-102.223791,17.972043],[-102.224154,17.971777],[-102.224655,17.971431],[-102.225001,17.971286],[-102.225461,17.971087],[-102.2257,17.970953],[-102.225894,17.970785],[-102.226016,17.970646],[-102.226272,17.970369],[-102.226532,17.97009],[-102.226936,17.970346],[-102.227248,17.97051],[-102.227455,17.970542],[-102.227757,17.970599],[-102.22797,17.970674],[-102.228212,17.970761],[-102.228307,17.970785],[-102.228226,17.970963],[-102.228079,17.971363],[-102.227959,17.971667],[-102.227827,17.971911],[-102.22771,17.972015],[-102.227524,17.972153],[-102.227111,17.972337],[-102.226938,17.972455],[-102.226761,17.972664],[-102.226602,17.973099],[-102.226598,17.973495],[-102.226586,17.973637],[-102.226589,17.973874],[-102.226789,17.973906],[-102.226958,17.973916],[-102.227284,17.973948],[-102.228596,17.97399],[-102.230457,17.974061],[-102.23178,17.974089],[-102.232711,17.974113],[-102.233591,17.974206],[-102.234156,17.974462],[-102.23497,17.974689],[-102.234306,17.977299],[-102.233882,17.979005],[-102.233999,17.978969],[-102.234052,17.978885],[-102.234096,17.978768],[-102.234573,17.976798],[-102.235378,17.976959],[-102.236327,17.977168],[-102.237072,17.977296],[-102.237389,17.977334],[-102.237632,17.977295],[-102.238048,17.977141],[-102.238314,17.977058],[-102.238517,17.977001],[-102.238706,17.976936],[-102.238753,17.976895],[-102.238687,17.976826],[-102.238386,17.976672],[-102.238293,17.976692],[-102.238328,17.976809],[-102.238377,17.976916],[-102.238411,17.977004],[-102.237693,17.977284],[-102.237403,17.977339],[-102.236855,17.977236],[-102.235208,17.976875],[-102.235183,17.977081],[-102.235509,17.977016]]
};
