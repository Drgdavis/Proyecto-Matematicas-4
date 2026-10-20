# Atribución de texturas

Registro de procedencia declarado durante el desarrollo. La asociación exacta de cada
archivo con su original y las condiciones de redistribución aún requieren verificación
individual antes de publicar el paquete fuera de la entrega académica:

- `earthmap.jpg`, `earthnormal.jpg`, `earthclouds.png`, `moonmap.jpg`:
  Posible origen: repositorio de three.js, `examples/textures/planets/`.
  La licencia del código de three.js no demuestra por sí sola la licencia de cada imagen.

- Resto de planetas, lunas y anillos (`mercurymap.jpg`, `venusmap2.jpg`,
  `marsmap.jpg`, `jupitermap.jpg`, `saturnmap.jpg`, `uranusmap.jpg`,
  `neptunemap.jpg`, lunas de Marte/Júpiter/Saturno/Urano/Neptuno, anillos, etc.):
  Posible origen: `ofrohn/threex.planets`. Hay que cotejar cada archivo con el
  repositorio y su fuente primaria para registrar autor, permiso y modificación.

Los modelos `public/models/nasa-habitat.glb` y `nasa-perseverance.glb` tampoco
incorporan autor, URL ni licencia en sus metadatos GLB; el prefijo del nombre no
certifica origen NASA. Los ocho modelos `eva01-*.glb` carecen de crédito embebido.
`EVA03-campus.glb` declara como generador THREE.GLTFExporter y es una exportación
parcial del campus. La procedencia y las condiciones de uso de los activos originales permanecen
pendientes de verificación individual en este registro.


## Fuente de los documentos

`public/assets/fonts/DejaVuSans.ttf`: proyecto DejaVu Fonts, sin modificaciones.
Origen del proyecto: https://dejavu-fonts.github.io/ . Condiciones:
https://dejavu-fonts.github.io/License.html . Se conserva el aviso completo de
copyright y licencia incorporado en el archivo de fuente en
`public/assets/fonts/DejaVuSans-LICENSE.txt`. El generador la usa para cubrir
los símbolos matemáticos y la incrusta en los PDF.
