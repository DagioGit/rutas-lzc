# Copia modelos/caseta-lzc.glb dentro de caseta-lzc-modelo.js (base64), para que
# la caseta cargue aunque la página se abra sin servidor.
# Uso (desde la carpeta del proyecto): python3 herramientas/glb_a_js.py
import base64

datos = base64.b64encode(open("modelos/caseta-lzc.glb", "rb").read()).decode()
with open("caseta-lzc-modelo.js", "w") as f:
    f.write("// Caseta LZC modelada en SketchUp (copia de modelos/caseta-lzc.glb en base64).\n")
    f.write("// Se genera con: python3 herramientas/glb_a_js.py — no se edita a mano.\n")
    f.write('window.CASETA_LZC_GLB = "' + datos + '";\n')
print("listo:", len(datos), "caracteres")
