// Descarga de OpenStreetMap (Overpass) lo que hay alrededor de cada parada de la Ruta 1
// (Av. Lázaro Cárdenas) y genera:
//   zonas-datos-r1.js  — mismo formato que zonas-datos.js (ver herramientas/osm_paradas.md)
//   zonas-fichas-r1.js — registra cada parada con registrarZonaOSM para el visor 3D
// Se corre en GitHub Actions (.github/workflows/osm-ruta1.yml) porque necesita internet.
import fs from "fs";

const PARADAS = [
  ["R1-1i", "Glorieta Las Palmas", "Hacia el malecón", 17.97165, -102.20617, "Merza Mayoreo, City Express y la gasolinera; conecta con Prol. Tulipanes y Blvd. de las Islas"],
  ["R1-2i", "Hospital General", "Hacia el malecón", 17.96713, -102.20259, "Hospital General y talleres de la avenida; semáforo a un lado"],
  ["R1-3i", "Monumento al Minero", "Hacia el malecón", 17.96483, -102.20086, "Hospital IMSS a dos cuadras y la agencia Chevrolet"],
  ["R1-4i", "Palacio Municipal", "Hacia el malecón", 17.96237, -102.19884, "Palacio Municipal, INE, Plaza Tabachines y Centro Cultural Flamingos"],
  ["R1-5i", "Plaza Zirahuén", "Hacia el malecón", 17.95962, -102.19669, "Monumento a Lázaro Cárdenas, Correos, bancos y la Secundaria Técnica 12"],
  ["R1-6i", "Monumento a Melchor Ocampo", "Hacia el malecón", 17.95531, -102.19338, "El corazón del centro: tiendas, farmacias, bancos y la Primaria Melchor Ocampo"],
  ["R1-7i", "Plaza Voluntad de Acero", "Hacia el malecón", 17.95129, -102.19022, "Porto Hotel, la Heroica Escuela Naval Militar y la Primaria 1 de Mayo"],
  ["R1-8i", "Malecón de la Cultura", "Hacia el malecón", 17.94639, -102.18868, "El malecón: camellón con andadores, bancas y vista al mar"],
  ["R1-9i", "Teatro APILAC", "Hacia el malecón", 17.94108, -102.18812, "Teatro del puerto; la combi da vuelta en el retorno y regresa"],
  ["R1-9v", "Teatro APILAC", "Hacia Las Palmas", 17.94109, -102.18806, "Teatro del puerto, del lado de regreso"],
  ["R1-8v", "Malecón de la Cultura", "Hacia Las Palmas", 17.9464, -102.1886, "El malecón, del lado de regreso"],
  ["R1-7v", "Plaza Voluntad de Acero", "Hacia Las Palmas", 17.95133, -102.19015, "Escuela Naval Militar y Porto Hotel"],
  ["R1-6v", "Monumento a Melchor Ocampo", "Hacia Las Palmas", 17.95542, -102.19326, "Centro: tiendas, farmacias y bancos"],
  ["R1-5v", "Plaza Zirahuén", "Hacia Las Palmas", 17.95968, -102.1966, "Plaza Zirahuén y Monumento a Lázaro Cárdenas"],
  ["R1-4v", "Palacio Municipal", "Hacia Las Palmas", 17.96245, -102.19873, "Palacio Municipal y Plaza Tabachines"],
  ["R1-3v", "Monumento al Minero", "Hacia Las Palmas", 17.96492, -102.20074, "Monumento al Minero y Hospital IMSS"],
  ["R1-2v", "Hospital General", "Hacia Las Palmas", 17.96721, -102.20249, "Hospital General; semáforo a un lado"],
  ["R1-1v", "Glorieta Las Palmas", "Hacia Las Palmas", 17.97175, -102.20603, "Entronque con Prol. Tulipanes y Blvd. de las Islas (semáforo)"],
];

const SERVIDORES = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
const espera = ms => new Promise(r => setTimeout(r, ms));

async function consultar(lat, lng) {
  const q = `[out:json][timeout:90];
(
  way["building"](around:200,${lat},${lng});
  way["highway"](around:220,${lat},${lng});
  way["landuse"](around:200,${lat},${lng});
  way["leisure"](around:200,${lat},${lng});
  way["amenity"](around:200,${lat},${lng});
  node["natural"="tree"](around:200,${lat},${lng});
  node["amenity"](around:200,${lat},${lng});
  node["shop"](around:200,${lat},${lng});
);
out geom;`;
  for (let intento = 0; intento < 8; intento++) {
    const url = SERVIDORES[intento % SERVIDORES.length];
    try {
      const r = await fetch(url, { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "rutas-lzc (proyecto escolar)" } });
      if (r.ok) return await r.json();
      console.log("  ", url, r.status);
    } catch (e) {
      console.log("  ", url, e.message);
    }
    await espera(8000 * (intento + 1));
  }
  throw new Error("Overpass no respondió");
}

const r05 = v => Math.round(v * 2) / 2;

function convertir(j, lat0, lng0) {
  const kx = 111320 * Math.cos(lat0 * Math.PI / 180), ky = 110574;
  const loc = (lat, lon) => [r05((lon - lng0) * kx), r05((lat - lat0) * ky)];
  const dentro = ([x, y], m = 0) => Math.abs(x) <= 120 + m && Math.abs(y) <= 115 + m;
  const area = pts => { let a = 0; for (let i = 0; i < pts.length - 1; i++) a += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1]; return Math.abs(a / 2); };
  const out = { c: [], e: [], a: [], t: [], p: [] };
  for (const el of j.elements) {
    const tg = el.tags || {};
    if (el.type === "node") {
      const p = loc(el.lat, el.lon);
      if (!dentro(p, 10)) continue;
      if (tg.natural === "tree") out.t.push(p);
      else if (tg.name && (tg.amenity || tg.shop)) out.p.push([p[0], p[1], tg.amenity || tg.shop, tg.name]);
      continue;
    }
    if (!el.geometry) continue;
    let pts = el.geometry.map(g => loc(g.lat, g.lon));
    if (tg.highway) {
      // se conservan los puntos cercanos (y uno más de cada lado) para no cortar las calles
      const keep = pts.map(p => dentro(p, 60));
      const sel = pts.filter((p, i) => keep[i] || keep[i - 1] || keep[i + 1]);
      if (sel.length < 2) continue;
      const uno = tg.oneway === "yes" || tg.junction === "roundabout" ? 1 : 0;
      out.c.push([tg.highway, tg.name || "", uno, sel]);
    } else if (tg.building) {
      if (area(pts) < 20) continue;
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      if (!dentro([cx, cy], 10)) continue;
      out.e.push([tg.building === "yes" ? "" : tg.building, tg["building:levels"] || "", tg.name || "", pts]);
    } else {
      const clase = tg.amenity || tg.leisure || tg.landuse;
      if (!clase || !pts.some(p => dentro(p, 20))) continue;
      out.a.push([clase, tg.name || "", pts]);
    }
  }
  return out;
}

const datos = {};
for (const [id, nombre, , lat, lng] of PARADAS) {
  console.log(id, nombre);
  const j = await consultar(lat, lng);
  datos[id] = convertir(j, lat, lng);
  console.log("   calles", datos[id].c.length, "edificios", datos[id].e.length, "áreas", datos[id].a.length, "árboles", datos[id].t.length);
  await espera(4000);
}

fs.writeFileSync("zonas-datos-r1.js",
  "// GENERADO por herramientas/osm_ruta1.mjs — © colaboradores de OpenStreetMap (ODbL).\n" +
  "// Alrededor de cada parada de la Ruta 1 (Av. Lázaro Cárdenas), en metros desde la parada.\n" +
  "window.ZONAS_OSM = Object.assign(window.ZONAS_OSM || {}, " + JSON.stringify(datos) + ");\n");

const fichas = PARADAS.map(([id, nombre, sentido, , , desc]) => `    Z(${JSON.stringify(id)}, {
        divididas: { "Avenida Lázaro Cárdenas": { camellon: 7, tipo: "pasto", arboles: 9, palmas: true } },
        ruta: { nombre: "Avenida Lázaro Cárdenas" },
        entorno: [${JSON.stringify("Av. Lázaro Cárdenas · " + sentido)}, ${JSON.stringify(desc)}]
    });`).join("\n");
fs.writeFileSync("zonas-fichas-r1.js",
  "// GENERADO por herramientas/osm_ruta1.mjs — paradas de la Ruta 1 para el visor 3D (visor.html).\n" +
  "(function () {\n    const Z = window.registrarZonaOSM;\n    if (!Z) return;\n" + fichas + "\n})();\n");
console.log("listo");
