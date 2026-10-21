# Habitar Marte · Matemática IV

Proyecto académico de una colonia científica conceptual sobre un terreno sintético. Las seis fases conectan una función de elevación con decisiones de ubicación, una ruta espacial, integrales dobles y el volumen, la masa y el centro de masa de un depósito.

**[Abrir el modelo interactivo](https://drgdavis.github.io/Proyecto-Matematicas-4/)**

**Equipo:** Juan Carlos Boteo, Haroldo Rodriguez y Davis Javier Rivera Aroche.

## Contenido

| Fase | Desarrollo |
|---|---|
| Terreno | Función diferenciable, coordenadas, dominio físico, curvas de nivel y trazas. |
| Cambio local | Derivadas parciales, plano tangente, normal, linealización, gradiente, direccionales y regla de la cadena. |
| Ubicación | Puntos críticos, Hessiano y optimización restringida con Lagrange. |
| Ruta | Curva espacial, derivadas, tangente, longitud de arco y curvatura. |
| Región R | Límites polares, integral doble, altura media y área real del relieve. |
| Depósito E | Semielipsoide, cambio de variables, jacobiano, integral triple, densidad, masa y centro de masa. |

El modelo contiene 22 escenas y permite explorar 53 temas. **Índice y respaldo** abre los documentos y el desarrollo de cada fase. Los estudios aplicados adicionales son complementarios.

## Documentos

- [Informe técnico](public/materials/Informe_Tecnico_EVA03_Final.pdf).
- [Anexo matemático](public/materials/Anexo_Matematico_EVA03_Final.pdf).
- [Plano integrado](public/materials/Plano_Integrado_EVA03_Final.pdf).
- [Presentación visual de 22 láminas](public/materials/Presentacion_EVA03_Defensa_Matematica_22_Escenas_Navegador.html).
- [Presentación en PDF](public/materials/Presentacion_EVA03_Defensa_Matematica_22_Escenas_Respaldo.pdf).

La presentación HTML revela fórmula con los datos del caso, tres cuentas con sustituciones numéricas, resultado e interpretación con las flechas o la barra espaciadora. **F** activa pantalla completa. El PDF conserva las láminas como respaldo fijo.

## Resultados de referencia

| Medida | Resultado |
|---|---:|
| Pendiente de llegada B⁺ | 3.788 % |
| Longitud de la ruta principal | 226.205 m |
| Área real del terreno en R | 623.365 m² |
| Capacidad geométrica de E | 1344π ≈ 4 222.301 m³ |
| Masa con la densidad supuesta | 3 797 114.863 kg |
| Altura local del centro de masa | 2.970844 m |

B⁺ optimiza la pendiente sobre la circunferencia de comparación, no todo el campus. La ruta principal se mide por separado del ramal al taller. El volumen bajo el terreno respecto de z=0 no representa excavación. La densidad del depósito es una hipótesis declarada.

## Ejecutar el proyecto

Con Node.js 22 o posterior:

```powershell
git clone https://github.com/Drgdavis/Proyecto-Matematicas-4.git
cd Proyecto-Matematicas-4
npm ci
npm run dev
```

Abre `http://127.0.0.1:3000/`. Para usar una compilación estática:

```powershell
npm run build
node static-server.cjs
```

El modelo requiere WebGL 2 y aceleración gráfica. Puede comprobarse en [la prueba de WebGL 2](https://get.webgl.org/webgl2/). Los controladores y la configuración del navegador influyen en su disponibilidad.

Los datos académicos de portada se completan en `public/materials/Identificacion_Equipo.json`. Después se regeneran informe y anexo con `python scripts/build-final-materials.py`. Los datos sin confirmar permanecen señalados en las portadas.

## Código y verificación

- React y TypeScript: interfaz y navegación.
- Three.js y WebGL: terreno, edificios, rover, vectores y demostraciones 3D.
- HTML y CSS: presentación visual.
- KaTeX: fórmulas matemáticas.
- Python: generación de documentos finales.
- Node.js y Vite: desarrollo, compilación y verificadores.

`src/data/marsMath.ts` y `src/data/mathSolutions.ts` contienen los cálculos y procedimientos. `src/components/marsScene.ts` y `src/components/colonyCampus.ts` construyen la escena. Las fuentes editables del informe y el anexo están junto a sus PDF.

```powershell
npm run audit
```

Este comando comprueba tipos, resultados numéricos, aspectos geométricos, contenido de la entrega y compilación. Las comprobaciones automáticas no sustituyen la inspección visual ni certifican una instalación real. GitHub Pages publica el build de `main` mediante el workflow del repositorio.

## Alcance y recursos

El relieve es sintético. Las conexiones, los servicios y las cargas tienen un alcance conceptual y parcial. La propuesta no acredita autosuficiencia, geotecnia, resistencia estructural o soporte vital de una colonia real.

Los créditos de la textura de roca están en [SOURCE.txt](public/materials/SOURCE.txt) y los de las texturas planetarias en [ATTRIBUTION.md](public/textures/ATTRIBUTION.md). El informe documenta las fuentes y los permisos de recursos que todavía requieren comprobación individual. La autoría del proyecto no transfiere derechos sobre los activos externos.
