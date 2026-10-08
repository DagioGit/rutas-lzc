# Datos de OpenStreetMap para las maquetas (paradas B a G e I)

`zonas-datos.js` guarda, por parada, lo que hay en 200 m a la redonda según
OpenStreetMap, en metros desde la parada (x = este, y = norte):

- `c`: calles `[tipo, nombre, sentidoÚnico, puntos]`
- `e`: edificios `[tipo, niveles, nombre, puntos]` (se descartan los de menos de 20 m²)
- `a`: áreas `[clase, nombre, puntos]` (estacionamientos, parques, escuelas…)
- `t`: árboles `[x, y]`
- `p`: lugares con nombre `[x, y, tipo, nombre]`

## Cómo se obtuvieron

Consulta a Overpass (https://overpass-api.de) desde el navegador, una por parada:

```
[out:json][timeout:60];
(
  way["building"](around:200,LAT,LNG);
  way["highway"](around:200,LAT,LNG);
  way["landuse"](around:200,LAT,LNG);
  way["leisure"](around:200,LAT,LNG);
  way["amenity"](around:200,LAT,LNG);
  way["barrier"](around:200,LAT,LNG);
  way["natural"](around:200,LAT,LNG);
  node["natural"="tree"](around:200,LAT,LNG);
  node["amenity"](around:200,LAT,LNG);
  node["shop"](around:200,LAT,LNG);
);
out geom;
```

Cada punto se pasa a metros con
`x = (lon − lngParada) × 111320 × cos(latParada)` y `y = (lat − latParada) × 110574`,
redondeado a medio metro, y se recorta a ±120 m × ±115 m.

## Qué se agregó a mano (zonas-fichas.js)

Lo que no está en OpenStreetMap y se vio en Google Street View (agosto de 2024):
camellones, bardas, colores de fachadas, letreros, estructuras de la
subestación de la CFE, la barda de Soriana, la fonda La Papaya, etc.
