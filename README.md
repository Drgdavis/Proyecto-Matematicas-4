# EVA03 — Mars Math Base · Matemática IV

**Qué es:** un proyecto académico de diseño matemático de una colonia científica conceptual en Marte. Combina un terreno descrito por `z=f(x,y)`, decisiones de ubicación, la ruta espacial de un rover, una región para integrales dobles y un depósito semielipsoidal para integrales triples. La aplicación React/Three.js presenta esos cálculos sobre un mismo modelo 3D. Es una propuesta de ingeniería conceptual basada en un terreno sintético; no certifica una instalación real ni demuestra autosuficiencia completa.

**Abrir en internet:** [modelo 3D y 22 escenas](https://drgdavis.github.io/Proyecto-Matematicas-4/). Desde **Índice y respaldo** se accede a la presentación de defensa y a los PDF. GitHub Pages publica automáticamente el último build aprobado de `main` mediante [el workflow](.github/workflows/pages.yml). Para ver el 3D se necesita un navegador con WebGL.

**Fuente que manda:** [Proyecto_Integrador_Matematica_IV_Mars_Math_Base_261003_140546.pdf](Proyecto_Integrador_Matematica_IV_Mars_Math_Base_261003_140546.pdf), el documento oficial de 11 páginas recibido el 03/10/2026. Para requisitos, cifras y notación debe consultarse este PDF.

**Única auditoría y plan:** [Auditoria_EVA03_Maestra.md](public/materials/Auditoria_EVA03_Maestra.md). El PDF oficial gobierna requisitos; el archivo maestro contiene el estado, los pendientes, la evidencia y la secuencia. No hay otro plan activo.

## Qué incluye el proyecto

| Parte | Contenido |
|---|---|
| Fase I · Terreno | Sistema cartesiano y escala métrica, función diferenciable, dominio físico, curvas de nivel, trazas y cotas en puntos relevantes. |
| Fase II · Análisis diferencial | Derivadas, plano tangente, normal, linealización y error; gradiente y direccionales en dos puntos; regla de la cadena a lo largo de la ruta. |
| Fase III · Ubicación | Puntos críticos libres y Hessiano; selección restringida de una plataforma mediante Lagrange. |
| Fase IV · Movilidad | Curva 3D del rover, velocidad y aceleración paramétricas, tangente, longitud de arco, curvatura y puntos de control. |
| Fase V · Región R | Límites polares, integral doble del volumen respecto a `z=0`, valor medio, área real del relieve y comparación con la proyección. |
| Fase VI · Depósito | Semielipsoide, límites y cambio de variables, jacobiano, integral triple evaluada, densidad positiva, masa, momentos y centro de masa. |
| Síntesis | Plano común de terreno, base, ruta, R, depósito y resultados cuantificados. |

La exposición abre con **22 escenas** que cubren las seis fases del PDF oficial. En cada escena se destacan uno a tres temas centrales y los demás permanecen accesibles en **Más evidencia de esta escena**. En **Plano general**, **Siguiente** recorre sus tres temas antes de pasar a la escena 2; después avanza por escenas. **Explorar · 53 temas** permite recorrer cada demostración individualmente. Un solo modelo 3D ofrece cuatro accesos opcionales: terreno, llegada y rover, región R y depósito E. También hay cinco estudios aplicados complementarios: energía/polvo, selección de hielo, balance de oxígeno, blindaje y energía del rover. Son optativos; no sustituyen los procedimientos obligatorios.

## Dónde está cada cosa

| Ruta | Función |
|---|---|
| `src/Expedition.tsx` | Recorrido visible, paneles, controles y navegación de escenas. |
| `src/components/marsScene.ts` y `src/components/colonyCampus.ts` | Terreno, campus, rover, depósito, objetos y animaciones 3D. |
| `src/data/marsMath.ts`, `src/data/mathSolutions.ts` | Funciones matemáticas y desarrollo analítico mostrado por tema. |
| `src/data/eva01Project.ts`, `src/data/presentationSlides.ts`, `src/data/sceneCallouts.ts` | Temas, estructura narrativa y lecturas ancladas al modelo. |
| `src/data/marsSystems.ts`, `src/data/researchScenarios.ts` | Supuestos y cálculos de estudios aplicados. |
| `src/expedition.css` | Interfaz de la presentación. |
| `public/models/`, `public/assets/`, `public/materials/` | Modelos, texturas e informes, anexos y presentaciones de respaldo. |
| `scripts/` | Verificadores numéricos, geométricos y de navegación. |
| `dist/` | Compilación local para abrir la presentación sin ejecutar Vite. No es la fuente editable. |

Los entregables documentales vigentes son el [informe técnico final](public/materials/Informe_Tecnico_EVA03_Final.pdf), el [anexo matemático final](public/materials/Anexo_Matematico_EVA03_Final.pdf) y el [plano integrado final](public/materials/Plano_Integrado_EVA03_Final.pdf). Se reproducen con `python scripts/build-final-materials.py` a partir de [la fuente del informe](public/materials/Informe_Tecnico_EVA03_Fuente.md) y [la fuente del anexo](public/materials/Anexo_Matematico_EVA03_Fuente.md). La [guía de estudio y defensa en PDF](public/materials/Guia_de_Estudio_y_Defensa_EVA03.pdf) empieza con ejemplos cotidianos, traduce los símbolos y luego explica los procedimientos para Juan Carlos, Haroldo y Davis, con tres escenas sencillas para Juan Carlos (2, 3, 5), tres para Haroldo (11, 12, 14) y las otras catorce demostraciones para Davis; se regenera con `python scripts/build-study-guide.py` (requiere ReportLab y fuentes Cambria/Arial de Windows). La [guía oral de tres integrantes](public/materials/Guia_Defensa_3_Integrantes.md) organiza el recorrido. La [presentación de navegador, 22 láminas](public/materials/Presentacion_EVA03_Defensa_Matematica_22_Escenas_Navegador.html) es la versión para exponer sin PowerPoint: abra el HTML en Edge o Chrome, incluso sin internet. Cada escena revela con `→` o espacio la fórmula, tres pasos, resultado y lectura; `F` entra en pantalla completa y `N` muestra las notas de quien expone. Tras cada bloque indicado, cambie al modelo 3D. El [PDF fijo de respaldo](public/materials/Presentacion_EVA03_Defensa_Matematica_22_Escenas_Respaldo.pdf) conserva las 22 láminas sin animación. El [PPTX editable](public/materials/Presentacion_EVA03_Defensa_Matematica_22_Escenas.pptx) queda para quien sí disponga de un editor compatible. Ninguna versión incluye fotografías del modelo. Las 53 demostraciones siguen disponibles en la aplicación y en el anexo. Las presentaciones anteriores son respaldo y no versión vigente. **No entregar los PDF antiguos ni el PPTX de respaldo como versiones vigentes.** Antes de la entrega formal faltan carnets, sección, fecha, contribuciones reales, créditos individuales de algunos activos y ensayo con el equipo; el estado preciso está en la auditoría maestra.

## Cómo lo abro en mi computadora

Después de clonar el repositorio, preparo la aplicación con Node.js 22:

```powershell
npm ci
npm run build
node static-server.cjs
```

Abro `http://127.0.0.1:3000/`. Ese servidor muestra el último contenido compilado de `dist` y comienza en **Presentación · 22 escenas**. El botón **Índice y respaldo** permite saltar a cualquiera de los 53 temas. Tras editar la fuente, vuelvo a ejecutar `npm run build` para actualizarla. Si quiero ver los cambios al guardar, uso `npm run dev`.

### Navegadores para el modelo 3D

Puedo abrirlo en versiones actuales de **Google Chrome, Microsoft Edge, Mozilla Firefox, Safari u Opera**. Para la exposición en Windows usaré Chrome o Edge y comprobaré antes que el equipo tenga la aceleración gráfica activa. Este proyecto usa **WebGL 2**: pruebo el navegador en [get.webgl.org/webgl2](https://get.webgl.org/webgl2/) y después recorro varias escenas del [modelo público](https://drgdavis.github.io/Proyecto-Matematicas-4/). La compatibilidad depende también de la GPU y sus controladores; [MDN explica ese requisito](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API).

## Cómo trabajo desde mis computadoras

En una computadora nueva instalo Git y Node.js 22. Clono mi repositorio y preparo las dependencias:

```powershell
git clone https://github.com/Drgdavis/Proyecto-Matematicas-4.git
cd Proyecto-Matematicas-4
npm ci
```

Antes de empezar en cualquiera de mis computadoras, traigo la versión más reciente con `git pull --ff-only`. Al terminar, ejecuto `npm run audit`, reviso los cambios con `git status` y los publico:

```powershell
git add .
git commit -m "Describir el cambio realizado"
git push origin main
```

`git pull --ff-only` me avisa si tengo cambios incompatibles para resolverlos antes de continuar. Git guarda el código, los documentos, modelos y evidencias propias. Dejo fuera `node_modules/`, `dist/`, `tmp/`, archivos `.env` y tres imágenes externas cuya licencia de redistribución no está verificada. La publicación de GitHub Pages se actualiza tras cada push a `main`. Para comprobar el modelo 3D necesito un navegador con WebGL; las pruebas automáticas no sustituyen esa revisión visual.

## Estado y continuidad

Abre [la auditoría maestra](public/materials/Auditoria_EVA03_Maestra.md). Ahí están las prioridades ponderadas por la rúbrica, los elementos ya verificados, los problemas visuales abiertos, los criterios de aceptación y la siguiente acción concreta. Actualiza ese mismo archivo al cerrar cada bloque; no agregues registros de reanudación ni planes nuevos.

Para ejecutar de una vez tipos, verificadores, inventarios y compilación: `npm run audit`. Continúa después de un fallo y devuelve código 1 si alguna comprobación falla. No sustituye la inspección WebGL ni el cotejo de entregables. La auditoría maestra registra los defectos conocidos; no rebajes tolerancias para conseguir un resultado verde.
