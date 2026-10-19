# Guía completa para exposición y defensa — EVA03

Esta guía está pensada para Juan Carlos Boteo, Haroldo Rodriguez y Davis Javier Rivera Aroche. La exposición se hará desde la HP Victus: primero se explica la fórmula y sus pasos en la presentación HTML del navegador; después se demuestra el bloque en la aplicación 3D. No depende de una televisión externa. Los nombres identifican un **reparto oral propuesto**, no atribuyen trabajo previo que no haya confirmado el equipo. Faltan carnés, sección y responsabilidades reales de elaboración.

## 1. La idea del proyecto en treinta segundos

EVA03 toma un terreno marciano sintético descrito por una función `z=f(x,y)` y usa Matemática IV para tomar decisiones coherentes en el mismo lugar: leer el relieve, estudiar pendientes, elegir una ubicación con Lagrange, diseñar una ruta espacial, dimensionar una región de infraestructura con integrales dobles y calcular volumen, masa y centro de masa de un depósito con integrales triples.

La frase que los tres deben dominar es:

> **No usamos el 3D para reemplazar el cálculo. Usamos el cálculo para justificar el diseño y el 3D para comprobar que todas las decisiones pertenecen al mismo sistema.**

## 2. Reparto oral propuesto

| Persona | Parte principal | Escenas del modelo | Debe dominar especialmente |
|---|---|---:|---|
| Juan Carlos Boteo | Lo visible del terreno | 2, 3 y 5; tres escenas | La fórmula como receta de alturas, líneas de igual altura, cortes y el error de 2.48 cm de una predicción cercana. Davis toma la derivación si la piden. |
| Haroldo Rodriguez | Camino y forma de R | 11, 12 y 14; tres escenas | El rover sigue el relieve, la ruta mide 226.205 m y R es una rebanada entre radios 60 y 72 m. Davis toma la derivación si la piden. |
| Davis Javier Rivera Aroche | Demostraciones matemáticas | 4, 6–10, 13, 15–21; catorce escenas | Derivadas, plano, gradientes, regla de la cadena, Hessiano, Lagrange, curvatura, integrales dobles, jacobianos e integral triple, masa y centro. |

Juan Carlos abre la escena 1 y los tres cierran la 22. El reparto identifica la voz principal: Juan Carlos y Haroldo explican ideas y cifras fáciles, Davis desarrolla las cuentas. La defensa individual puede preguntar a cualquiera, así que los tres deben entender la historia completa y el diccionario de la guía PDF, aunque no memoricen las catorce demostraciones de Davis. Los detalles complementarios continúan disponibles en cada escena.

### Tarjeta de Juan Carlos Boteo: terreno visible

**Guion breve:** «Nuestro terreno es una maqueta matemática. Si damos un lugar al Este y al Norte, la receta f devuelve su altura. Estudiamos un plato redondo de radio 110 m. Las líneas de nivel conectan sitios igual de altos, y los cortes dejan ver la forma de lado. Una tabla recta puesta sobre un punto de la loma predice la altura cercana: en nuestro ejemplo se equivoca apenas 2.48 cm. Davis puede mostrar cómo se calculó esa tabla». Señala las escenas 2, 3 y 5.

**Tres cifras que sí memoriza:** radio de D = 110 m; f(0,0) = 24 m; error en H ≈ 0.0248 m = 2.48 cm. **Fórmula ancla:** `z=f(x,y)` significa que x e y producen una altura. **Si le preguntan por qué el plano no acierta exactamente:** porque la loma es curva y la tabla es recta.

### Tarjeta de Haroldo Rodriguez: camino y rebanada R

**Guion breve:** «El camino del rover es como un hilo apoyado sobre la misma loma: cada punto tiene posición y altura. El hilo de la ruta principal mide aproximadamente 226.205 m. Puedo señalar su inicio, un punto de control y el final. R es una rebanada de dona: empieza a 60 m del centro, termina a 72 m y abre 45 grados. Davis explicará la curvatura y las integrales de esa zona». Señala las escenas 11, 12 y 14.

**Tres cifras que sí memoriza:** ruta 226.205 m; R va de 60 a 72 m; el ángulo de R es 45°. **Fórmula ancla:** `r(t)=(x(t),y(t),z(t))` ubica al rover en tres dimensiones. **Si le preguntan por la distancia:** es la curva matemática sobre el terreno; el ramal al taller se mide aparte.

### Tarjeta de Davis Javier Rivera Aroche: demostraciones

**Guion breve:** «Yo tomo los cálculos que explican las decisiones. Las derivadas muestran cómo cambia la altura y la pendiente; el Hessiano clasifica valle, cima y silla. Con Lagrange elegimos B⁺, de 3.788 % de pendiente, frente al opuesto de 6.472 %, solo sobre el círculo de comparación. También explico cómo medimos la curva del rover y las integrales de R. Para el depósito, parecido a media sandía, el cambio de variables tiene jacobiano `2016ρ²senφ`: la integral triple da `1344π≈4 222.301 m³`. Luego calculo la masa y el punto de equilibrio del contenido supuesto». Señala las escenas 4, 6–10, 13 y 15–21.

**Tres cifras que sí memoriza:** B⁺ 3.788 %; capacidad E 4 222.301 m³; centro de masa local a 2.971 m de altura. **Derivación que debe poder escribir:** `2016·(1/3)·1·(2π)=1344π`. **Si le preguntan por el depósito:** su origen global es (0,−94), pero la integral se hace en coordenadas locales.

### Acuerdo común antes de exponer

Los tres deben poder decir sin ayuda: (1) D es el disco estudiado, R el sector de integral y E el depósito; (2) B⁺ optimiza solo la llegada sobre una circunferencia, no todo el campus; (3) los 44 paneles y el agua modelada no prueban autosuficiencia de la colonia; (4) el terreno es sintético; (5) el modelo muestra las ecuaciones calculadas, mientras el anexo deja los pasos reproducibles.

### Ruta recomendada para el día de exposición

La aplicación abre en **Presentación · 22 escenas**. **Siguiente** avanza una escena; cada una conserva todos sus temas y destaca uno a tres para explicar. Los 53 temas también se pueden recorrer uno por uno en **Explorar · 53 temas**. El PDF oficial exige las seis fases y el desarrollo analítico de las integrales, pero no 53 intervenciones orales separadas. Los cinco estudios aplicados son optativos y no sustituyen ninguna exigencia matemática.

| Escena | Voz | Explicar con claridad | Mencionar o abrir en la misma escena |
|---:|---|---|---|
| 1 | Juan Carlos | Pregunta, maqueta común y seis fases en palabras simples. | Cuatro accesos opcionales. |
| 2 | Juan Carlos | f, ejes, escala y dominio matemático/físico. | Unidades y región D. |
| 3 | Juan Carlos | Curvas de nivel, dos trazas y tres evaluaciones. | Elevaciones, depresiones y posible construcción. |
| 4 | Davis | Plano tangente, normal y segundas parciales. | Interpretación de orientación local. |
| 5 | Juan Carlos | La tabla recta predice H con 2.48 cm de error. | Davis abre cálculo absoluto/porcentual y explica por qué es local si se lo piden. |
| 6 | Davis | Derivadas y gradientes en P y Q. | Ascenso, descenso, pendiente y curvas de nivel. |
| 7 | Davis | Direccionales en P y Q con vectores unitarios. | Signo, rumbo y unidades. |
| 8 | Davis | Regla de la cadena sobre r(t). | Ascenso, descenso y movimiento a nivel. |
| 9 | Davis | Resolver ∇f=0 y clasificar mínimo, máximo y silla con Hessiano. | Conveniencia constructiva y alcance local. |
| 10 | Davis | Objetivo, restricción, Lagrange, candidatos y decisión B⁺. | B⁺ es llegada; el núcleo no fue optimizado. |
| 11 | Haroldo | El rover sigue un hilo pegado al terreno en tres dimensiones. | Davis desarrolla v(t), a(t) y tangente unitaria si lo piden. |
| 12 | Haroldo | Ruta de 226.205 m; señala inicio, control y final. | Davis desarrolla la integral de longitud si lo piden; el ramal al taller es aparte. |
| 13 | Davis | Curvatura en un punto e interpretación del giro. | Velocidad límite como estudio añadido. |
| 14 | Haroldo | R es una rebanada entre radios 60 y 72 m, abierta 45°. | Davis justifica límites y polares si piden la cuenta. |
| 15 | Davis | Integral doble del volumen y valor medio. | Datum z=0 y significado físico. |
| 16 | Davis | Jacobiano polar y área real frente a proyección. | Potencia solar como estudio añadido. |
| 17 | Davis | Desigualdades y gráfica del semielipsoide E. | Límites cartesianos. |
| 18 | Davis | Transformación, límites, jacobiano y comparación cartesiana. | Un solo sólido en dos coordenadas. |
| 19 | Davis | Integral triple de volumen evaluada paso a paso. | Unidades y capacidad geométrica. |
| 20 | Davis | Densidad positiva y masa por integral triple. | Variación de densidad y simetría. |
| 21 | Davis | Tres momentos y centro de masa. | Interpretación y límite de estabilidad. |
| 22 | Compartida | Tres conclusiones cuantificadas y limitaciones. | Modelo completo, fuentes y preguntas. |

**Regla de uso:** el tema destacado abre su modelo, ecuación y resultado. La última columna no se elimina: se explica brevemente o se abre desde **Más evidencia de esta escena** cuando necesite demostración. Las segundas parciales, la normal, las tres evaluaciones del terreno, la tangente unitaria, los momentos y la comparación de coordenadas ahora están destacados en la ruta principal. Abran su desarrollo matemático cuando el docente pida el procedimiento. Ensayen el tiempo real en la HP Victus; no usen el cálculo anterior de 12 min 20 s, que correspondía a la ruta recortada.

## 3. Presentación desde la HP Victus

### Secuencia presentación HTML → modelo 3D

- Abra con doble clic `public/materials/Presentacion_EVA03_Defensa_Matematica_22_Escenas_Navegador.html` en Edge o Chrome. Funciona sin internet y sin PowerPoint. Sus 22 láminas corresponden, en orden, a las 22 escenas: fórmula, tres pasos, resultado y significado. Use `→` o espacio para revelar cada parte, `←` para retroceder, `F` para pantalla completa y `N` para ocultar o mostrar notas del expositor. Mantenga las notas ocultas al proyectar. No hay capturas del modelo.
- Explique las láminas **1–3**, luego muestre escenas **1–3** del 3D; repita con **4–8**, **9–10**, **11–13**, **14–16**, **17–21** y cierre con **22**. La franja inferior avisa cuándo pasar al 3D. Así hay siete cambios de soporte en vez de interrumpir cada escena. Cada persona toma las láminas y escenas que le corresponden en la tabla de reparto.
- El HTML condensa el procedimiento para hablarlo; el desarrollo reproducible completo permanece en el anexo y en **Desarrollo matemático** dentro del modelo. El PDF `Presentacion_EVA03_Defensa_Matematica_22_Escenas_Respaldo.pdf` permite mostrar las láminas sin animación si hace falta. El PPTX queda editable para un editor compatible, pero no se necesita para presentar. No sustituyan la integral triple de la escena 19 por la cifra final: expliquen sus tres factores.

### Uso de la aplicación interactiva

- Abra el sitio o la versión local desde un servidor; con `node static-server.cjs` use `http://127.0.0.1:3000/`. La vista inicial ya es EVA03 en **Presentación · 22 escenas**.
- En la laptop, active pantalla completa si mejora la lectura. El modelo ocupa la izquierda y la evidencia clave la derecha. **Solo modelo 3D** amplía la vista cuando necesiten señalar una pieza; `Esc` vuelve a la presentación.
- Avance con **Siguiente**, `→` o espacio; vuelva con `←`. En **Presentación**, el avance pasa a la próxima escena; los temas destacados y la evidencia adicional se abren dentro de ella. **Explorar · 53 temas** recorre cada demostración por separado. `Z` acerca y `X` aleja la cámara aérea. En **Solo modelo 3D**, `P` pausa/reanuda y `R` repite la escena.
- Abra **Desarrollo matemático** desde el panel cuando haga falta la derivación; en **Solo modelo 3D** el botón equivalente se llama **Ver cálculo**. Cada tema selecciona su objeto, cámara y evidencia.

### Respaldo

- Tenga disponibles el HTML vigente, su PDF fijo de respaldo, los PDF finales de informe, anexo y plano, y capturas propias de escenas clave si falla WebGL.
- Antes de presentar, pruebe los enlaces a los tres PDF desde **Índice y respaldo**. Verifique en la Victus que carguen el terreno, el rover, R y E, y que **Siguiente** recorra las 22 escenas en orden. Abra al menos una evidencia adicional en cada fase.

### Regla práctica

- Presente fórmula, pasos y conclusión en el HTML; después señale el objeto correspondiente en el 3D.
- Abra el desarrollo del modelo para completar una derivación o responder una pregunta. Termine con la decisión y el límite del resultado.

## 4. Guion sincronizado de 22 escenas

Este guion corresponde a las 22 láminas y a las 22 escenas del modelo. La duración anterior ya no aplica: ensayen en la HP Victus el cambio entre las dos pestañas del navegador, las entradas de texto, la demostración 3D y las preguntas. Los nombres junto a cada escena indican quién toma la palabra. Cada integrante prepara también los temas adicionales de sus escenas y puede responder sobre las otras fases.

### Escena 1 — Plano general — Juan Carlos Boteo — tres temas

En la presentación del modelo, avance por los tres temas antes de pasar a la escena 2:

1. **Mapa del sistema:** «Todo sucede sobre el mismo terreno y usa las mismas coordenadas. Aquí están la base, la llegada, la ruta del rover, los paneles solares y el depósito». Señale esos lugares en la vista general. Así se entiende dónde aparecerán las cuentas de las seis fases.
2. **Terreno y cálculo:** «La altura de cada punto sale de una función matemática. Con esa misma función calculamos pendientes, rutas y zonas de estudio; los números del modelo provienen de esas cuentas». Señale el relieve y distinga la representación visual del procedimiento matemático que se desarrolla después.
3. **Funciones del sistema:** «Cada parte tiene una tarea: habitar, captar energía, tratar agua, explorar y guardar recursos». Señale núcleo, paneles, tratamiento, rover y depósito. Sus conexiones son una propuesta de diseño; los cálculos no prueban que la colonia funcione sola en la realidad.

**Idea defendible:** el proyecto es integrado porque terreno, ubicaciones y resultados comparten un mismo sistema de referencia.

**No diga:** que la base está certificada o que el paisaje es topografía real de Marte.

### Escena 2 — Función diferenciable — Juan Carlos Boteo — 55 s

`f(x,y)=18+6[((x²+y²)/6400)-1]²+0.012x-0.006y`.

Explique que x es Este–Oeste, y es Norte–Sur y z es elevación, todo en metros. f es polinómica, por eso es diferenciable en R². El dominio físico se restringe al disco `x²+y²≤110²` porque ese es el sector estudiado.

**Pregunta probable:** «¿Por qué distinguir dominio matemático y físico?»
**Respuesta:** la función existe en todo R², pero el diseño solo toma decisiones dentro del área levantada.

### Escena 3 — Seis curvas de nivel — Juan Carlos Boteo — 45 s

Explique que `f(x,y)=k` conecta puntos de igual elevación. Curvas cercanas significan cambio rápido; curvas separadas, pendiente menor. Se entregan seis niveles, dos trazas verticales y evaluaciones de f en A, P y B. Señale en la gráfica elevaciones, depresiones y una zona de posible construcción.

**Relación clave:** en una curva regular, el gradiente es perpendicular a la curva de nivel.

### Escena 4 — Plano tangente, normal y segundas parciales — Davis Javier Rivera Aroche

En `P=(40,-20)` calculamos fₓ, fᵧ y las segundas parciales. El plano es `z−f(P)=fₓ(P)(x−40)+fᵧ(P)(y+20)`; un vector normal es `⟨−fₓ(P),−fᵧ(P),1⟩`. Señalen la superficie, el contacto en P y la orientación del plano. Las segundas parciales describen cómo cambia esa pendiente alrededor de P.

### Escena 5 — Linealización y error — Juan Carlos Boteo

Juan Carlos dice: «Una tabla recta puede parecerse mucho a la loma si la apoyamos cerca del punto correcto. Aquí predice una altura de 21.20813 m y el suelo de verdad marca 21.18331 m: solo 2.48 cm de diferencia». Comparen ambas alturas en el modelo. El aumento visual del error está rotulado ×80: no cambia la escala del terreno ni del plano. Si piden la resta y el 0.117 % de error, Davis desarrolla la cuenta.

**Pregunta probable:** «¿Por qué no usar siempre el plano?»
**Respuesta:** porque la linealización es local; el error crece al alejarnos del punto de tangencia.

### Escena 6 — Gradientes en P y Q — Davis Javier Rivera Aroche

`∇f(P)=<-0.091125,0.0455625>` y `||∇f(P)||=0.101881`.

- ∇f apunta al máximo ascenso.
- -∇f apunta al máximo descenso.
- La norma representa la pendiente máxima: aproximadamente 10.19 cm verticales por metro horizontal.
- En Q la norma es `0.108951`, mayor que en P: la pendiente máxima cambia de lugar a lugar.
- Para una tubería o vehículo, la dirección importa tanto como el punto.

### Escena 7 — Direccionales en P y Q — Davis Javier Rivera Aroche

En `Q=(-50,35)`, `||∇f(Q)||=0.108951`, mayor que en P. Con `u=<1,-2>/√5`, `Dᵤf(Q)=0.094848`, por lo que se ascienden 9.485 cm por metro en esa dirección. En P se propone otro rumbo unitario, `⟨3/5,4/5⟩`, cuyo producto con ∇f(P) da `−0.018225`: descenso de 1.8225 cm/m. El gradiente es perpendicular a la curva de nivel regular.

**Defensa esencial:** u debe ser unitario; de lo contrario el producto punto mezclaría pendiente con magnitud del vector.

### Escena 8 — Regla de la cadena — Davis Javier Rivera Aroche — 60 s

La trayectoria plana es `x=72 cos t`, `y=72 sen t`. La altura es `z(t)=f(x(t),y(t))`, así que

`dz/dt = fx dx/dt + fy dy/dt = -0.864 sen t - 0.432 cos t`.

- `z'>0`: asciende.
- `z'<0`: desciende.
- `z'=0`: se mueve instantáneamente en dirección tangente a una curva de nivel.

Aclaren que t es angular. La velocidad física requeriría multiplicar por `dt/dτ`.

### Escena 9 — Extremos libres y Hessiano — Davis Javier Rivera Aroche

Resolvemos `fₓ=fᵧ=0` y clasificamos los tres puntos con `D=fₓₓfᵧᵧ−fₓᵧ²`: C₁ es mínimo local (`D>0`, `fₓₓ>0`), C₂ máximo local (`D>0`, `fₓₓ<0`) y C₃ silla (`D<0`). Señalen depresión, cima y silla en el mismo terreno. Esta clasificación explica el relieve, pero no elige por sí sola la llegada.

### Escena 10 — Lagrange y decisión B⁺ — Davis Javier Rivera Aroche

Se minimiza `F=||∇f||²`, cuadrado de la pendiente máxima local, sobre `g=x²+y²=72²`. La circunferencia es frontera matemática de comparación; no es una carretera construida. Resolvemos `∇F=λ∇g` y comparamos:

- `B+=(64.3988,-32.1994)`: 3.788 %.
- `B-=(-64.3988,32.1994)`: 6.472 %.
- reducción relativa: 41.46 %.

**Decisión:** B⁺ es la plataforma de llegada sobre esa frontera. El núcleo permanece en (−8,8) por centralidad de las tres alas.

### Escena 11 — Trayectoria y movimiento — Haroldo Rodriguez

Haroldo dice: «El rover sigue un hilo puesto sobre la loma: por eso cada punto tiene Este, Norte y altura». Señala la ruta y la expresión `r(t)=⟨72 cos t,72 sen t,f(72 cos t,72 sen t)⟩`. Si piden velocidad, aceleración o tangente unitaria, Davis deriva `v(t)=r′(t)`, `a(t)=r″(t)` y `T=v/||v||`.

### Escena 12 — Longitud e hitos de la ruta — Haroldo Rodriguez

Haroldo dice: «Si pongo un hilo encima de todo el camino y luego lo estiro, mide 226.205 m». Señala inicio, punto de control C* y final sobre la misma curva. La longitud sirve para estudios posteriores, pero no prueba autonomía. El ramal exterior hacia el taller se mide aparte. Si piden cómo se sumaron todos los pedacitos de hilo, Davis explica `L=∫||r′(t)||dt`.

### Escena 13 — Curvatura — Davis Javier Rivera Aroche — 55 s

`κ=||r'×r''||/||r'||³≈0.013886 m⁻¹`, por lo que `1/κ≈72.01 m`.

La circunferencia osculatriz y la normal principal aparecen sobre el rover. Un radio amplio implica giro suave. La velocidad segura mostrada usa una aceleración lateral máxima supuesta; no incluye obstáculos ni suelo real.

### Escena 14 — Región R — Haroldo Rodriguez — 45 s

Haroldo dice: «R es como una rebanada de dona: va de 60 a 72 m del centro y abre 45 grados». Señala sus dos bordes curvos y sus dos lados rectos. La escritura es `R={(r,θ):60≤r≤72, -π/4≤θ≤0}`. Si piden por qué usar polares o cómo integrar, Davis toma el desarrollo.

### Escena 15 — Integral doble — Davis Javier Rivera Aroche — 65 s

`V=∫∫R f dA = ∫[-π/4,0]∫[60,72] f(r cosθ,r senθ) r dr dθ`.

El resultado es `12 119.9617 m³` y la elevación media `19.48436 m`.

**Aclaración obligatoria:** es volumen algebraico bajo f respecto de z=0. No es excavación. Como f es positiva en R, volumen neto y volumen positivo coinciden.

### Escena 16 — Polar y área real — Davis Javier Rivera Aroche — 55 s

El jacobiano polar es `|J|=r`. El área horizontal de R es `622.035 m²`; el área real del terreno es `623.365 m²`, porque incorpora `√(1+fx²+fy²)`. La diferencia es `1.330 m²`, o `0.214 %`.

**No confundir:** área real del suelo no es área de paneles ni potencia eléctrica.

### Escena 17 — Sólido E — Davis Javier Rivera Aroche — 50 s

El depósito se modela como semielipsoide:

`u²/18²+v²/14²+w²/8²≤1`, con `w≥0`.

Sus dimensiones totales son 36 m × 28 m × 8 m. El corte animado y las secciones muestran exactamente la región integrada.

### Escena 18 — Transformación y jacobiano — Davis Javier Rivera Aroche — 65 s

Se usan coordenadas esféricas sobre una semiesfera unitaria y luego se estira cada eje:

- `u=18ρ senφ cosθ`
- `v=14ρ senφ senθ`
- `w=8ρ cosφ`
- `0≤ρ≤1`, `0≤φ≤π/2`, `0≤θ≤2π`

El jacobiano es `18·14·8ρ²senφ=2016ρ²senφ`.

**Comparación:** en cartesianas los límites tienen raíces anidadas; transformados son constantes y separables.

### Escena 19 — Integral triple paso a paso — Davis Javier Rivera Aroche — 90 s

Esta es la escena que jamás deben saltarse si el docente pregunta por la condición mínima.

`V=∫₀²π∫₀π/2∫₀¹ 2016ρ²senφ dρ dφ dθ`.

1. `∫₀¹ρ²dρ=1/3`.
2. `∫₀π/2 senφ dφ=1`.
3. `∫₀²π dθ=2π`.
4. `V=2016(1/3)(1)(2π)=1344π=4 222.30053 m³`.

Con esto queda demostrado que no se presentó solo el número de un programa.

### Escena 20 — Densidad y masa — Davis Javier Rivera Aroche — 70 s

`δ(u,v,w)=920[1+0.04u/18-0.06w/8] kg/m³`.

Se demuestra que `δmín=853.658 kg/m³>0`. La masa es `M=∭E δ dV=3 797 114.863 kg`. El término lineal en u se cancela por simetría; la componente en w no se cancela porque el sólido es solo la mitad superior.

### Escena 21 — Centro de masa — Davis Javier Rivera Aroche — 65 s

Se calculan los tres primeros momentos `Mᵧ𝓏=∭E uδdV`, `Mₓ𝓏=∭E vδdV` y `Mₓᵧ=∭E wδdV`. Al dividir cada uno por M se obtiene el centro de masa:

`(ū,v̄,w̄)=(0.147315,0,2.970844) m`.

La altura del centro es 37.14 % de la altura total y su proyección queda dentro del apoyo. Esto favorece estabilidad, pero no demuestra resistencia de materiales, cimentación o respuesta dinámica.

### Escena 22 — Limitaciones y cierre — Los tres — 50 s

Cada integrante dice una conclusión:

1. Juan Carlos Boteo: «La fórmula nos dice la altura del terreno y sus líneas de nivel muestran dónde tiene la misma altura».
2. Haroldo Rodriguez: «El camino del rover mide 226.205 m y R es una rebanada entre 60 y 72 m del centro».
3. Davis Javier Rivera Aroche: «B⁺ redujo la pendiente de llegada; las integrales explican el área real de R y los 4 222.301 m³ de capacidad geométrica del depósito».

Cierre conjunto: «El modelo demuestra coherencia matemática y de diseño conceptual; no pretende reemplazar geotecnia, estructura ni certificación».

## 5. Cómo explicar las animaciones

| Animación | Qué cambia | Qué demuestra |
|---|---|---|
| Sistema solar y descenso | Cámara y transición de escala | Contextualiza la misión y separa introducción de defensa técnica. |
| Rover | Parámetro t, posición, vectores y cámara | r(t) está adherida a f; permite leer cadena, longitud, tangente y curvatura. |
| Sol y paneles | Hora local, dirección solar, incidencia y potencia | El producto punto convierte orientación en potencia instantánea. |
| Curvas/trazas y direcciones | Punto o barrido paramétrico | La pendiente y el cambio dependen del lugar y del rumbo. |
| Región polar | θ/r y celdas polares | Los límites y el jacobiano corresponden a la geometría de R. |
| Volumen doble | Columnas de acumulación | La integral suma contribuciones pequeñas; el valor final proviene del cálculo analítico. |
| Depósito | Corte, sección y coordenadas transformadas | La región integrada coincide con el semielipsoide visible. |
| Jacobiano triple | Capas ρ y ángulos | El factor ρ²senφ y el estiramiento abc cambian el elemento de volumen. |
| Densidad/masa | Color y puntos internos | δ varía dentro del sólido y desplaza el centro de masa. |

Si una animación distrae, pulse **Pausar animación** y deje el caso de referencia quieto.

## 6. Banco de preguntas de defensa

### Modelo y derivadas

**¿Por qué f es diferenciable?**
Porque es un polinomio en x e y; sus derivadas de todos los órdenes existen y son continuas.

**¿Qué unidades tienen fx y fy?**
Metros verticales por metro horizontal; numéricamente son razones adimensionales que se suelen expresar como porcentaje de pendiente.

**¿La norma del gradiente es un ángulo?**
No. Es una razón de pendiente. El ángulo sería `arctan(||∇f||)`.

**¿Por qué ∇f es perpendicular a una curva de nivel?**
Si f(x(t),y(t))=k, al derivar se obtiene `∇f·r'(t)=0`; por eso gradiente y tangente son ortogonales.

**¿Qué significa z'=0?**
Que no cambia elevación instantáneamente. El vehículo puede seguir moviéndose sobre una dirección de nivel.

### Optimización y ruta

**¿Por qué minimizar F=||∇f||² y no ||∇f||?**
Ambas tienen los mismos minimizadores porque la raíz es creciente, pero F evita derivar una raíz y simplifica Lagrange.

**¿La restricción es una frontera segura demostrada?**
No. Es un corredor de diseño declarado que conecta la implantación con la ruta; una frontera geotécnica requeriría datos reales.

**¿Por qué se comparan candidatos después de Lagrange?**
Lagrange produce candidatos estacionarios restringidos, no garantiza por sí solo cuál es mínimo global. El círculo es compacto y se comparan sus valores.

**¿r'(t) está en m/s?**
No mientras t sea angular. Está en metros por radián. Para tiempo físico τ se usa `dr/dτ=r'(t)dt/dτ`.

**¿Qué significa la curvatura?**
Mide qué tan rápido cambia la dirección de la tangente por unidad de arco; su inversa es el radio osculador cuando κ≠0.

### Integrales dobles

**¿De dónde sale el r de dA?**
Del determinante `∂(x,y)/∂(r,θ)`.

**¿Por qué volumen neto y positivo coinciden?**
Porque se verificó que f>0 en toda R respecto al datum elegido.

**¿Por qué el área real supera a la horizontal?**
Porque el factor `√(1+fx²+fy²)` es al menos 1.

### Integrales triples

**¿Son coordenadas esféricas si el sólido es elipsoidal?**
Sí, aplicadas primero a una semiesfera unitaria y después estiradas por 18, 14 y 8.

**¿Por qué el jacobiano tiene 2016?**
Porque `18·14·8=2016`, multiplicado por el jacobiano esférico `ρ²senφ`.

**¿Por qué una parte de la masa se anula?**
El sólido es simétrico respecto de u=0 y el término proporcional a u es impar.

**¿Por qué el momento en v es cero?**
Por simetría respecto de v=0: el integrando correspondiente es impar.

**¿El centro de masa bajo garantiza estabilidad?**
No. Es favorable, pero faltan cargas externas, resistencia, apoyo, vibración y propiedades reales del terreno.

## 7. Errores que bajan la calidad de la defensa

- Leer números sin mencionar qué se optimiza o integra.
- Llamar «respuesta del programa» al resultado analítico.
- Confundir m, m², m³, kg y kg·m.
- Usar un vector direccional sin normalizar.
- Decir que z'=0 significa que el rover se detuvo.
- Confundir área de terreno con área de paneles.
- Confundir volumen bajo el terreno con excavación.
- Declarar que B optimiza todo el campus.
- Presentar el 3D como certificación de una base real.
- Abrir todas las soluciones largas durante la exposición; solo se abren para el paso clave o preguntas.

## 8. Ensayo mínimo obligatorio

1. Cada persona ensaya su tramo completo con el guion oral de la cabina y mide cuánto tarda realmente. Después explica con sus palabras la idea principal para comprobar que entiende lo que está leyendo.
2. Cada persona resuelve en papel un paso de su parte.
3. Un compañero hace cinco preguntas aleatorias de otra sección.
4. Practican las 22 escenas, los temas destacados y la apertura de los PDF; cada persona sabe localizar las otras demostraciones de su fase en la misma escena.
5. Prueban pantalla completa, zoom y carga de los cuatro focos en la HP Victus.
6. Ensayan la integral triple completa sin depender de la animación.
7. Preparan un plan B: plano, informe y anexo PDF, más capturas propias del modelo si el navegador falla.

## 9. Lista final antes de entregar

- [ ] Nombres, carnés, sección y fecha completos.
- [ ] Responsabilidades reales escritas.
- [ ] Herramientas autorizadas por el docente.
- [ ] Parámetros confirmados como propios del equipo.
- [ ] Informe, anexo, plano PDF y modelo digital presentes; no usar PPTX ni GLB parcial como entrega completa.
- [ ] Sitio abre en la computadora que se usará.
- [ ] La aplicación inicia en la escena 1 y permite volver desde **Solo modelo 3D**.
- [ ] Las flechas, espacio, Z y X responden; **Desarrollo matemático** abre el procedimiento.
- [ ] Los tres pueden explicar `V=1344π` sin software.
- [ ] Los tres conocen las limitaciones del modelo.
