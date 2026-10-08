# Convierte las caras de la Caseta LZC extraídas de SketchUp (metros, Z arriba)
# a un .glb (Y arriba) con materiales LZC_* y coordenadas UV para las texturas.
# Uso: python3 herramientas/sketchup_a_glb.py herramientas/caseta-lzc-caras.json modelos/caseta-lzc.glb
import json, struct, sys, math


caras = json.load(open(sys.argv[1]))
salida = sys.argv[2]

COLORES = {
    "LZC_Concreto": (200, 196, 188, 255), "LZC_Tactil": (242, 194, 0, 255), "LZC_Grafito": (43, 50, 55, 255),
    "LZC_Acento": (242, 194, 0, 255), "LZC_Cristal": (205, 226, 234, 95), "LZC_Plafon": (226, 227, 224, 255),
    "LZC_Madera": (158, 104, 60, 255), "LZC_Panel_Solar": (28, 47, 82, 255), "LZC_Aluminio": (190, 196, 200, 255),
    "LZC_LED": (250, 252, 255, 255), "LZC_Mapa": (240, 240, 236, 255), "LZC_Letrero": (30, 38, 44, 255),
    "LZC_ISA": (31, 92, 170, 255), "LZC_Bote_Organico": (47, 125, 91, 255), "LZC_Bote_Inorganico": (112, 120, 126, 255),
    "LZC_USB": (20, 24, 28, 255), "LZC_Disco": (242, 194, 0, 255),
}
# Materiales con imagen: UV normalizado 0..1 en cada cara; los demás en metros.
NORMALIZADOS = {"LZC_Tactil", "LZC_Panel_Solar", "LZC_Mapa", "LZC_Letrero", "LZC_ISA", "LZC_USB", "LZC_Disco"}
CILINDROS = {"Bote_Organico", "Bote_Inorganico", "Poste", "Disco"}

def norm(v):
    l = math.sqrt(sum(c * c for c in v)) or 1
    return [c / l for c in v]

def cruz(a, b):
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

# ejes de los cilindros (para normales suaves)
ejes = {}
for c in caras:
    if c["g"] in CILINDROS:
        ejes.setdefault(c["g"], []).extend(c["p"])

def eje_de(g):
    pts = ejes[g]
    xs, ys, zs = zip(*pts)
    rx, ry, rz = max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs)
    centro = [(max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2, (max(zs) + min(zs)) / 2]
    eje = 0 if rx > max(ry, rz) * 0.99 and g == "Disco" else 2
    if g == "Disco":
        eje = 0  # el disco está acostado sobre x
    return centro, eje

prims = {}
for c in caras:
    m = c["m"] or "LZC_Grafito"
    n = c["n"]
    pts = c["p"]
    up = [0, 0, 1]
    if abs(n[2]) > 0.9:
        t = [1, 0, 0]
        b = norm(cruz(n, t))
        if n[2] < 0:
            b = [-x for x in b]
        b = [0, 1, 0] if n[2] > 0 else [0, -1, 0]
    else:
        t = norm(cruz(up, n))
        b = norm(cruz(n, t))
    uv = [[sum(p[i] * t[i] for i in range(3)), sum(p[i] * b[i] for i in range(3))] for p in pts]
    if m in NORMALIZADOS:
        u0, u1 = min(a[0] for a in uv), max(a[0] for a in uv)
        v0, v1 = min(a[1] for a in uv), max(a[1] for a in uv)
        uv = [[(a[0] - u0) / ((u1 - u0) or 1), (a[1] - v0) / ((v1 - v0) or 1)] for a in uv]
    normales = [n] * len(pts)
    if c["g"] in CILINDROS:
        centro, eje = eje_de(c["g"])
        if abs(n[eje]) < 0.5:  # cara lateral: normal radial
            normales = []
            for p in pts:
                r = [p[i] - centro[i] for i in range(3)]
                r[eje] = 0
                normales.append(norm(r))
    pr = prims.setdefault(m, {"pos": [], "nor": [], "uv": [], "idx": []})
    base = len(pr["pos"])
    for p, q, w in zip(pts, normales, uv):
        pr["pos"].append([p[0], p[2], -p[1]])      # Z arriba -> Y arriba
        pr["nor"].append([q[0], q[2], -q[1]])
        pr["uv"].append([w[0], 1 - w[1]])          # glTF: v hacia abajo
    for k in range(1, len(pts) - 1):
        pr["idx"] += [base, base + k, base + k + 1]

buf = bytearray()
vistas, accesores, materiales, primitivas = [], [], [], []

def agregar(datos, fmt, comp, tipo, target, minmax=False):
    while len(buf) % 4:
        buf.append(0)
    off = len(buf)
    for d in datos:
        buf.extend(struct.pack(fmt, *d) if isinstance(d, (list, tuple)) else struct.pack(fmt, d))
    vistas.append({"buffer": 0, "byteOffset": off, "byteLength": len(buf) - off, "target": target})
    acc = {"bufferView": len(vistas) - 1, "componentType": comp, "count": len(datos), "type": tipo}
    if minmax:
        acc["min"] = [min(d[i] for d in datos) for i in range(3)]
        acc["max"] = [max(d[i] for d in datos) for i in range(3)]
    accesores.append(acc)
    return len(accesores) - 1

nodos = []
for i, (m, pr) in enumerate(sorted(prims.items())):
    r, g, b, a = COLORES.get(m, (128, 128, 128, 255))
    lin = lambda c: (c / 255) ** 2.2
    mat = {"name": m, "doubleSided": True,
           "pbrMetallicRoughness": {"baseColorFactor": [lin(r), lin(g), lin(b), a / 255], "metallicFactor": 0.1, "roughnessFactor": 0.7}}
    if a < 255:
        mat["alphaMode"] = "BLEND"
    materiales.append(mat)
    ip = agregar(pr["pos"], "<3f", 5126, "VEC3", 34962, True)
    inn = agregar(pr["nor"], "<3f", 5126, "VEC3", 34962)
    iu = agregar(pr["uv"], "<2f", 5126, "VEC2", 34962)
    ii = agregar(pr["idx"], "<I", 5125, "SCALAR", 34963)
    primitivas.append({"name": m, "primitives": [{"attributes": {"POSITION": ip, "NORMAL": inn, "TEXCOORD_0": iu}, "indices": ii, "material": i}]})
    nodos.append({"name": m, "mesh": i})

gltf = {
    "asset": {"version": "2.0", "generator": "Rutas LZC · SketchUp -> glTF"},
    "scene": 0, "scenes": [{"name": "Caseta_LZC", "nodes": list(range(len(nodos)))}],
    "nodes": nodos, "meshes": primitivas, "materials": materiales,
    "accessors": accesores, "bufferViews": vistas, "buffers": [{"byteLength": len(buf)}],
}
js = json.dumps(gltf, separators=(",", ":")).encode()
while len(js) % 4:
    js += b" "
while len(buf) % 4:
    buf.append(0)
total = 12 + 8 + len(js) + 8 + len(buf)
with open(salida, "wb") as f:
    f.write(struct.pack("<III", 0x46546C67, 2, total))
    f.write(struct.pack("<II", len(js), 0x4E4F534A)); f.write(js)
    f.write(struct.pack("<II", len(buf), 0x004E4942)); f.write(buf)
print("ok", salida, total, "bytes,", sum(len(p["idx"]) // 3 for p in prims.values()), "triángulos")
