# Rutas LZC

Plataforma para el transporte en combi de Lázaro Cárdenas, Michoacán.
Ruta piloto: **Ruta 2 «Pollo»** (base en Calle Tamarindo, Col. Benito Juárez).

- Mapa con el recorrido real de la Ruta 2 y un día de servicio simulado (una combi cada 15 min).
- Base y paradas con maqueta 3D hecha a mano (funciona sin internet).
- Pantalla de parada en vivo (`parada.html?id=A`), la que se abre con el QR de la caseta.
- Ficha técnica imprimible (`ficha-tecnica.html`) y su PDF en `docs/`.

## Verlo

Es un sitio estático (HTML, CSS y JavaScript, sin compilar).

- **En línea:** con GitHub Pages activado, queda en `https://USUARIO.github.io/rutas-lzc/`.
- **En tu computadora:** abre la carpeta con un servidor local (por ejemplo la extensión
  *Live Server* de VS Code). Con doble clic sobre `index.html` algunas cosas no cargan.

## Dónde se cambia cada cosa

| Qué | Archivo |
| --- | --- |
| Base, paradas, recorrido y calles de la ruta | `ruta-2.js` |
| Frecuencia y velocidad | `horario.js` |
| Mapa y simulación del día | `map.js` |
| Maquetas 3D de la base y las paradas | `zonas-3d.js` |
| Combi y caseta en 3D | `modelos-3d.js`, `casetas-3d.js` |
| Textos de cada página | `index.html`, `proyecto.html`, `parada.html`, `ficha-tecnica.html` |
| Estilos | `styles.css`, `parada.css`, `ficha.css` |

El recorrido original está en `docs/ruta-2.kml` (se abre en Google Earth).
Más detalles en `modelos/LEEME.txt`.
