# EVA03 — informe técnico: fuente de contenido

**Estado:** fuente editable de `Informe_Tecnico_EVA03_Final.pdf`, revisado el 19/10/2026 y contrastado con el modelo vigente. Nombres confirmados por el equipo; carnés, sección, fecha de entrega y responsabilidades reales de elaboración aún deben completarse. El reparto de la exposición se documenta por separado y no atribuye trabajo previo.

## Identificación y resumen

**Proyecto:** Habitar Marte — colonia científica conceptual sobre un terreno sintético. **Curso:** Matemática IV, Universidad Mesoamericana, Facultad de Ingeniería. **Integrantes:** Juan Carlos Boteo, Haroldo Rodriguez y Davis Javier Rivera Aroche. **Identificación para la portada:** `Identificacion_Equipo.json` centraliza docente, carnés, sección, fecha y responsabilidades reales. Los campos sin confirmar se mantienen pendientes.

La pregunta del proyecto es cómo usar cálculo multivariable para tomar decisiones coherentes de implantación, circulación y reserva en un terreno tridimensional. Se construyó una superficie diferenciable en un disco de radio 110 m y se mantuvo un único sistema métrico para derivadas, optimización, ruta, integrales y modelo 3D. La optimización restringida eligió la plataforma de llegada B⁺ por su pendiente local de 3.788359 %, frente a 6.471641 % del candidato opuesto. El núcleo del campus se implantó por centralidad en (−8, 8), no como resultado de ese mínimo. La ruta matemática de reconocimiento mide 226.204849 m; la región R tiene 622.035345 m² horizontales y 623.364857 m² de superficie real. El depósito E, modelado como semielipsoide, tiene 1344π = 4 222.300526 m³ de capacidad geométrica; con una densidad ideal variable, su contenido modelado tiene masa 3 797 114.863414 kg y centro de masa local (0.147315, 0, 2.970844) m.

El modelo integra circulación, un escenario solar y un escenario de riego. Estos últimos son balances **hipotéticos y parciales**: los 44 paneles y una batería nominal de 120 kWh cubren dos cargas eléctricas declaradas bajo los supuestos elegidos, y la línea de agua llega a 32 bandejas del invernadero. No se demostró autosuficiencia global de la colonia, potabilidad, presión ni estabilidad estructural.

## 1. Problema, alcance y método realmente seguido

La consigna oficial pide justificar un diseño mediante formulación, procedimiento analítico, interpretación, unidades y verificación; un resultado de software por sí solo no basta. Seguimos esta secuencia: (1) fijar ejes, escala, dominio y función; (2) evaluar cotas, niveles y trazas; (3) derivar pendientes y aproximaciones; (4) resolver críticos y comparar candidatos restringidos; (5) parametrizar la ruta; (6) integrar sobre R; (7) definir E e integrar volumen, masa y momentos; (8) implantar objetos en el mismo marco; (9) verificar resultados por métodos numéricos y comprobar geometría, conectividad y límites del sistema digital. Las ecuaciones reproducibles están en `Anexo_Matematico_EVA03_Fuente.md`.

Una coordenada en papel es (x, y, z) = (Este, Norte, altura), en metros. En Three.js se almacena como (x, altura, Norte); el nombre `z` en parte del código designa el Norte del plano, no la altura matemática. El relieve es sintético y el paisaje fuera del disco solo aporta contexto visual. Las magnitudes de energía, rendimiento, densidad y cargas del caso de servicios son supuestos de enseñanza, no mediciones marcianas.

## 2. Fase I: sistema de referencia y terreno

Se adoptó el disco físico D = {(x,y): x²+y² ≤ 110²}, de diámetro 220 m. La función matemática existe en todo ℝ²:

`f(x,y) = 18 + 6[((x²+y²)/6400) − 1]² + 0.012x − 0.006y`  [m].

El término radial produce una zona interior elevada y una depresión alrededor de r≈80 m; los términos lineales rompen la simetría para distinguir orientaciones y permitir una decisión no trivial. Como es polinómica, f es continua y diferenciable en ℝ². En D se representan seis cotas (17, 18.5, 20, 21.5, 23 y 24 m), dos trazas verticales y puntos de evaluación. Tres cotas: f(0,0)=24.000000 m, f(40,−20)=21.4359375 m y f(B⁺)≈19.182581 m. Las curvas de nivel son líneas de altura constante, no carreteras ni límites físicos. El borde del disco y la circunferencia r=72 m tienen papeles diferentes.

## 3. Fase II: diferencial y lectura de pendiente

Con `s=(x²+y²)/6400−1`, las primeras parciales son `f_x=(3x/800)s+0.012` y `f_y=(3y/800)s−0.006`. Las segundas son `f_xx=3s/800+3x²/2 560 000`, `f_yy=3s/800+3y²/2 560 000` y `f_xy=3xy/2 560 000`. En P=(40,−20), ∇f(P)=(−0.091125, 0.0455625) m/m. El plano tangente es

`z = 21.4359375 − 0.091125(x−40) + 0.0455625(y+20)`.

Para H=(44,−17), la linealización da 21.208125 m, mientras f(H)=21.183314209 m: error absoluto ≈0.024811 m y relativo ≈0.117124 %. La aproximación local sobrestima aproximadamente 2.48 cm; no reemplaza la superficie fuera de su vecindad.

La norma del gradiente en P es 0.101880847 (10.1881 % de pendiente máxima). En Q=(−50,35) es 0.108951027 (10.8951 %). El gradiente señala máximo ascenso; su opuesto, máximo descenso; un vector tangente a la curva de nivel es perpendicular a ∇f. Con u=(3/5,4/5), `D_u f(P)=−0.018225` m/m. Con u=(1,−2)/√5, `D_u f(Q)=0.094847715` m/m. Estos valores describen tasa vertical por metro horizontal instantáneo, no fuerza de tracción ni caudal.

En la trayectoria de radio 72 m, la regla de la cadena cancela los términos radiales y deja `z′(t)=−0.864 sin t−0.432 cos t`. En el intervalo definido para la ruta, z′<0 dentro y z′=0 en los extremos: el vehículo matemático desciende en el interior. El parámetro t es angular; una velocidad física en m/s exige especificar t(τ).

## 4. Fase III: extremos y decisión restringida

Para críticos libres se resolvió `f_x=f_y=0`; la relación `y=−x/2` reduce el problema a una cúbica con tres raíces. El Hessiano clasifica un mínimo local cerca de (−73.1035,36.5517,16.9149), un máximo local cerca de (3.2064,−1.6032,24.0240) y una silla cerca de (69.8971,−34.9485,19.0610). La clasificación matemática no prueba por sí misma capacidad portante.

La decisión restringida minimiza `F(x,y)=‖∇f(x,y)‖²` sujeto a `g(x,y)=x²+y²=72²`. Se eligió esa frontera como **circunferencia matemática de comparación**: coincide con el radio de la ruta y el borde externo de R, pero no es una carretera construida ni una zona geotécnica certificada. Lagrange da dos candidatos opuestos. En B⁺=(64.398758,−32.199379) la pendiente es 3.788359 %; en B⁻=(−64.398758,32.199379), 6.471641 %. La reducción relativa respecto de B⁻ es ≈41.46 %. B⁺ se usa como plataforma de llegada y acceso al hábitat. El núcleo, en (−8,8), tiene 5.447127 % y se ubicó para distribuir tres alas. La optimización de una llegada no fija automáticamente cada edificio.

## 5. Fase IV: ruta espacial del rover

La ruta matemática de reconocimiento es `r(t)=(72 cos t, 72 sin t, f(72 cos t,72 sin t))`, con `t∈[−atan(1/2), π−atan(1/2)]`. Sus derivadas son `r′(t)=(−72 sin t,72 cos t,−0.864 sin t−0.432 cos t)` y `r″(t)=(−72 cos t,−72 sin t,−0.864 cos t+0.432 sin t)`. El tangente unitario es `T=r′/‖r′‖`; la curvatura `κ=‖r′×r″‖/‖r′‖³`. En el punto de máximo descenso longitudinal `t*=π/2−atan(1/2)`, κ≈0.013886389 m⁻¹ y radio de curvatura ≈72.01296 m. La longitud `∫‖r′‖dt` es 226.204849475 m, contrastada por cuadraturas independientes y por el límite 72π≤L≤π√(5184+C²), C=√(0.864²+0.432²).

El modelo incluye aparte una derivación **física exterior** hacia logística de 127.950325 m, con 74.360308 m de firme estabilizado, rampa curva de 21.301 m y enlace de carga de 44.911 m. Estas piezas conectan la transferencia con el taller; no se suman silenciosamente a los 226.205 m de la curva matemática ni se presentan como una sola trayectoria paramétrica probada.

## 6. Fase V: región R e integrales dobles

La región elegida es el sector anular `60≤r≤72`, `−π/4≤θ≤0`. Coordenadas polares simplifican sus límites: `x=r cosθ`, `y=r sinθ`, `dA=r dr dθ`. El área horizontal es `A=(1/2)(72²−60²)(π/4)=198π≈622.035345 m²`. Integrando f sobre R desde el datum z=0 se obtiene `∬_R f dA≈12 119.961705 m³` analíticamente; la cuadratura independiente con resolución finita da ≈12 119.961745 m³. La elevación media es `f̄≈19.484362 m`. Esa integral **no** es volumen de excavación ni capacidad de almacenamiento.

Para la superficie `S(x,y)=(x,y,f(x,y))`, `‖S_x×S_y‖=√(1+f_x²+f_y²)` y `A_S=∬_R √(1+f_x²+f_y²)dA≈623.364857 m²`. La diferencia frente a su proyección horizontal es ≈1.329512 m² (0.213736 %). Sirve para estimar recubrimiento de terreno; no equivale a superficie activa fotovoltaica.

En R se mantienen 20 paneles horizontales de 6 m² **nominales** cada uno, distribuidos 6/7/7. La aplicación solar instantánea usa `I₀=590 W/m²`, eficiencia 0.24, factor de rendimiento 0.86, latitud 18° y declinación 0: potencia ideal al mediodía ≈13.897903 kW para esos 20 paneles y 0 kW de noche. No es pronóstico de irradiancia ni medición de la superficie semiconductor del activo 3D. Los otros 24 paneles de servicio se ubican fuera de R y dentro de D; no alteran los límites de la integral.

## 7. Fase VI: depósito, integral triple, masa y centro

Se eligió un depósito semielipsoidal local E porque sus límites exigen una integral triple no trivial y su volumen tiene interpretación de capacidad. `E={u²/18²+v²/14²+w²/8²≤1, w≥0}` [m]. La planta global está centrada en (0,−94) m; el piso de representación está a 23.363122 m. Así `(x,y,z)=(u,−94+v,23.363122+w)`, con redondeo solo en la cifra mostrada. La orientación y el origen se distinguen de las coordenadas locales de integración.

El cambio `u=18ρsinφcosθ`, `v=14ρsinφsinθ`, `w=8ρcosφ`, con `0≤ρ≤1`, `0≤φ≤π/2`, `0≤θ≤2π`, tiene `|J|=2016ρ²sinφ`. La integración sucesiva da `V=∫∫∫_E 1dV=1344π≈4 222.300526 m³`. Un cálculo por cortes elípticos reproduce el resultado. El centroide **geométrico** del sólido homogéneo es `(0,0,3) m` local. Con `δ(u,v,w)=920[1+0.04u/18−0.06w/8] kg/m³`, positiva en todo E (mínimo≈853.658 kg/m³), se obtiene `M=899.3V≈3 797 114.863414 kg` y primeros momentos `(M_vw,M_uw,M_uv)≈(559 370.373741,0,11 280 635.870438) kg·m`. El centro de **masa** local es `(0.147314578,0,2.970843990) m`; el centro global aproximado es `(0.147314578,−94,26.333966105) m`.

Esta densidad es un perfil matemático ideal de contenido o mezcla, no una afirmación de agua pura en equilibrio. La masa no incluye paredes, suelo, tuberías ni cimientos. El centro cae en la proyección del apoyo y a 37.14 % de la altura, hecho favorable en una lectura preliminar; faltan cálculo de cargas, presión y suelo para afirmar estabilidad.

## 8. Integración funcional del modelo

Las posiciones siguientes son pares (Este, Norte) en metros del modelo vigente, redondeados solo para esta lectura. La altura de cada apoyo procede de f y del perfil constructivo, no de sustituir el segundo componente como si fuese la cota vertical.

| Elemento | Posición o región | Finalidad de la ubicación |
|---|---|---|
| B⁺, llegada | (64.398758, −32.199379) | Menor pendiente entre los candidatos de la circunferencia r=72 m; inicia el acceso comprobado al hábitat. |
| Núcleo geodésico | (−8, 8) | Reparto de tres alas y referencia de circulación; no es el óptimo restringido. |
| Hábitat explorable y esclusa | (44.581, −33.890) y (44.581, −59.890) | Estancia y transición exterior/interior con rampa y conducto medidos. |
| Bloque industrial y taller | (31, 41) y (−20, −35) | Mantenimiento e infraestructura del campus; el taller también recibe la carga del rover. |
| Logística | (−77, −52) | Plataforma de transferencia del rover hacia el taller. |
| Laboratorios A/B | (95, −28) y (96, −45) | Dos destinos científicos conectados al hábitat. |
| Invernadero y tratamiento | (−8, −62) y (24, −58) | Investigación agrícola y proceso previo al reparto a 32 bandejas. |
| Depósito E | (0, −94) | Reserva geométrica del semielipsoide y origen global de A16–A20. |
| Campo de estudio / auxiliar | R: 60≤r≤72; auxiliar: radios 100, 103.3 y 106.6 m | Separar el problema de integral doble de la ampliación eléctrica conectada. |

El núcleo geodésico y ocho nodos reparten tres alas de 16 cápsulas (4/6/6). Catorce cápsulas tienen escalera por desnivel y dos del norte rampa. Hay ocho cámaras de ala, dos accesos reales al núcleo y 55 huecos comprobados en la red del campus; 66 apoyos de cámaras y 68 de troncales sostienen sus pisos. El grafo peatonal comprobado alcanza 43 destinos por 44 tramos desde B⁺. Son pruebas de continuidad geométrica del modelo, no de presurización, accesibilidad universal o estructura certificada.

El invernadero aprobado conserva 32 bandejas y su esclusa de tres vías: entrada exterior, entrada al invernadero y corredor al taller. La línea de agua conceptual va de E a tratamiento y de allí a un registro y cuatro colectores con 32 salidas. No se confunde esa tubería con un camino transitable. El taller recibe una transferencia de carga desde la plataforma del rover y acceso peatonal; las puertas y pasajes visibles no acreditan operación mecánica, estanqueidad ni atmósfera simulada. Dos laboratorios se conectan al hábitat. Rocas, rótulos, curvas y luces se tratan como contexto o ayudas de lectura y no se suman como infraestructura calculada.

El balance eléctrico complementario usa 44 paneles (20 de estudio + 24 auxiliares), seis buses, dos alimentadores y un gabinete conceptual de batería/inversor. Para un ciclo solar **normalizado de 24 h, no un sol marciano**, se supusieron fracción activa 0.85, transmitancia 0.70, cargas constantes de 4.5 kW (hábitat) y 0.6 kW (tratamiento), batería nominal de 120 kWh con 96 kWh utilizables y eficiencias de carga y descarga de 0.90. La integración de potencia da 138.979355 kWh generados frente a 122.4 kWh de demanda bruta; el despacho repetido de mediodía a mediodía da 0 kWh no servidos, mínimo 21.891 kWh almacenados y ≈0.934 kWh recortados por ciclo. La diferencia bruta de 16.579355 kWh no es reserva neta. Si la transmitancia baja a 0.60, el caso presenta demanda no servida. Ninguna otra carga de la colonia está incluida.

El balance de agua toma 2 L por bandeja y ciclo, rendimiento hipotético 0.85 y capacidad de tratamiento 100 L/ciclo: 32×2=64 L entregados; `64/0.85=75.294118 L` brutos; pérdida de proceso 11.294118 L. Se usó inventario de ejemplo de 1 000 L solo para ensayar el cálculo, sin afirmar que el depósito está lleno ni que todo su volumen sea agua disponible. La demanda ilustrativa de tres personas a 20 L/persona/ciclo suma 60 L, pero no existe ramal físico dibujado ni tratamiento dimensionado para servirla; sumarla al riego requeriría `124/0.85=145.882353 L` brutos, por encima de 100 L/ciclo. Por ello tampoco se afirma autonomía hídrica.

### 8.1. Pasos de construcción y motivo de cada corrección

La secuencia siguiente describe decisiones realmente incorporadas al modelo. Los criterios de pendiente y holgura citados son internos de este ejercicio; no se presentan como normas de construcción marciana.

| Paso aplicado | Problema detectado y decisión | Comprobación y límite |
|---|---|---|
| Acceso B⁺→hábitat | La esclusa y el domo tenían pisos separados por 1.691383 m en solo 0.6 m horizontales (281.897 %), un salto incompatible con el acceso dibujado. Se separó la esclusa 11 m, se ajustaron ambos plintos y se creó un conector de 11.6 m con 1.630600 m de desnivel. | Pendiente del conector 14.057 %, bajo el criterio interno de 15 %; piso y portales coinciden en el recorrido geométrico. No certifica accesibilidad universal ni presión. |
| Esclusa agrícola | Se conservaron la entrada exterior y el invernadero aprobado. El corredor al taller se resolvió mediante una abertura lateral en la esclusa de tres vías, con hojas, testeros cerrados, pisos y apoyos; así el tubo no ocupa la escalera de acceso. | Rampa exterior de 27.5 m al 12.5522 %; holgura tubo/rampa 0.338 m y gálibo sobre andador 3.071 m en el caso de QA. Las puertas son representación estática, sin ciclo de presurización. |
| Red de cápsulas y núcleo | Se sustituyeron derivaciones aparentes sin destino por portales reales, cámaras y troncales con pisos. Se conservaron ocho nodos de circuito y se abrieron solo las dos entradas del núcleo que tienen conexión efectiva. | Grafo de 43 destinos y 44 tramos alcanzables desde B⁺; 16 cápsulas, 14 escaleras y 2 rampas. La conectividad geométrica no incluye ventilación ni resistencia. |
| Taller, industria y laboratorios | Las conducciones que terminaban contra paredes recibieron aberturas alineadas con sus ejes; el taller distingue paso peatonal y bahía vehicular. | Pruebas de huecos, pisos, juntas y 55 portales del campus; los dos laboratorios conectan al hábitat. No se modeló operación de equipos ni cierre hermético. |
| Tratamiento e invernadero | La rampa de tratamiento se enrasó con el plinto. La línea enterrada se llevó a un registro del invernadero y luego a cuatro colectores con 32 salidas, en lugar de terminar visualmente bajo una plataforma. | Rampa de 8 m al 7.299 % y 32 salidas verificadas. Sin caudal, presión, potabilidad o retorno calculados. |
| Depósito E | Se desplazó su implantación global a (0,−94) para despejar el corredor del rover, manteniendo semiejes y densidad locales. | La huella permanece dentro de D; las integrales locales V/M/CM son invariantes ante esta traslación. |
| Rover y carga | Se separó la semicurva académica r(t) de una derivación física hacia logística. Se añadieron firme estabilizado, rampa curva, junta de plataforma y tablero hasta el portón oeste del taller. | Se muestrearon seis ruedas en 678 estaciones y las uniones de rodadura. Las masas, fricción y materiales son hipótesis; no se certifica maniobra marciana real. |
| Ampliación eléctrica | Los 20 paneles de R se dejaron intactos para conservar las integrales; su potencia no cubría el caso de carga conectado. Se añadieron 24 auxiliares fuera de R, seis buses, dos alimentadores y acumulación conceptual. | El despacho bajo parámetros declarados cubre hábitat y tratamiento en el caso nominal. A transmitancia 0.60 reaparece déficit; no se incluyen las demás cargas. |

Cada corrección se aceptó después de contrastar el mismo dato en geometría, ficha visible, cálculo y verificador. Las comprobaciones reproducibles conservan los márgenes geométricos y los límites de interpretación del caso académico.

### 8.2. Estudios aplicados complementarios y su frontera

La aplicación contiene además cinco estudios exploratorios. Son **escenarios separados** de las seis fases obligatorias y del balance conectado anterior; sus controles interactivos cambian supuestos para mostrar sensibilidad, no para certificar instalaciones. Los procedimientos numéricos están en A23–A27 del anexo.

| Estudio | Cálculo que se muestra | Alcance correcto |
|---|---|---|
| Polvo y energía | Para 20 paneles nominales, incidencia fija y `I(τ)=590e^(−τ) W/m²`, se compara `P(τ)` con una carga hipotética de 12 kW. A τ=0: 14.613 kW; a τ=4: 0.268 kW. | Es una demostración **instantánea sin batería**; los 12 kW no son las dos cargas conectadas de 5.1 kW ni se suman al despacho de 44 paneles. |
| Hielo y ubicación | Tres sitios C1/C2/C3 reciben un índice ponderado de potencial supuesto H, pendiente calculada con ∇f y distancia a B⁺. Con peso H=0.25 gana C2; con 0.65 gana C1. | H no es una medición de hielo en el terreno sintético. El índice propone exploración, no perforación aprobada. |
| Oxígeno | Reserva didáctica inicial 9 kg, capacidad 18 kg, consumo supuesto 2.52 kg/sol para tres personas; producción variable de 1.5 a 3.5 kg/sol. | No hay proceso ISRU dimensionado ni aporte biológico medido. Esta reserva de O₂ es distinta del depósito E y su sol no se equipara al ciclo solar normalizado de 24 h. |
| Blindaje | Atenuación relativa `D(x)/D₀=e^(−0.42x)` hasta 5 m equivalentes; a 5 m la reducción ideal es 87.754 %. | El coeficiente es de demostración: no se calculó dosis clínica, material, masa ni radiación real. |
| Energía del rover | Para masa supuesta de 320–620 kg, rodadura 0.04 y un margen de 0.19 Wh/kg, `E_est≈0.064–0.124 kWh` para L=226.205 m. | La pendiente se visualiza pero no se integra como trabajo adicional; la cifra no es autonomía de batería ni incluye la derivación exterior a logística. |

Una visualización adicional sigue pasos de `−∇f/‖∇f‖` para estudiar máximo descenso superficial. Es una trayectoria topográfica iterativa y no una simulación de escorrentía, caudal o agua líquida. Se mantuvo fuera de las conclusiones cuantitativas obligatorias.

## 9. Decisiones, verificación y límites

Se prefirió B⁺ por pendiente sobre una frontera elegida, no se trasladó el núcleo allí porque la red radial necesita centralidad. Se mantuvo R fijo para que la integral, el campo de 20 paneles y sus gráficos describan el mismo sector; la potencia complementaria se instaló fuera de R sin modificar el problema matemático. El depósito se ubicó en (0,−94) para despejar la maniobra del rover sin alterar su sólido local. Se conservaron el invernadero y su entrada exterior aprobados; las conexiones se corrigieron mediante aberturas, pisos, compuertas y apoyos con destino, evitando senderos bajo plataformas sin acceso.

La verificación combina sustitución simbólica y controles independientes: derivadas por diferencias finitas, integrales por cuadratura, volumen por cortes, longitud por dos métodos numéricos, afirmaciones de servicios contra el mismo escenario de código y comprobaciones de geometría/conectividad. `npm run audit` ejecuta el conjunto automatizado y la compilación; la revisión de navegación vigente recorrió las 22 escenas. Una revisión visual anterior cubrió los 53 temas y estados de las 42 demostraciones animadas antes de su reorganización en 22 escenas. Esto verifica el programa dentro del alcance observado; no valida una instalación real ni el equipo físico de exposición.

## 10. Conclusiones cuantitativas

1. **Acceso:** B⁺ reduce la pendiente local de 6.471641 % a 3.788359 % respecto del candidato opuesto, una mejora relativa de ≈41.46 %. Es una razón matemática para elegir llegada en esa circunferencia, no una certificación de seguridad ni de todo el campus.
2. **Suelo:** R ofrece 622.035345 m² proyectados y 623.364857 m² reales: el 0.213736 % adicional muestra por qué el recubrimiento de suelo no debe estimarse solo con el plano. La potencia fotovoltaica exige irradiancia y área activa independientes.
3. **Ruta:** el recorrido de cálculo mide 226.204849 m y mantiene descenso interior; el enlace exterior de 127.950325 m hacia logística es otra ruta. Distinguirlas evita sumar longitudes incompatibles.
4. **Reserva:** la capacidad geométrica de E es 4 222.300526 m³ y su centro de contenido modelado está a 2.970844 m sobre el piso. Sin fracción de llenado, consumo, esfuerzos y suelo, ni capacidad ni centro demuestran autonomía o estabilidad certificada.
5. **Servicios:** bajo el escenario explícito, 44 paneles sirven 122.4 kWh/ciclo de dos cargas con batería, y el riego requiere 75.294118 L brutos/ciclo. Al faltar alimentadores y una línea de agua al resto del campus, la colonia completa sigue siendo una propuesta conceptual, no autosustentable demostrada.

## Fuentes y materiales de contraste

- Universidad Mesoamericana, *Proyecto Integrador Matemática IV — Mars Math Base*, consigna académica, Guatemala, 2026, docente ScD. Juan Carlos Ruiz Castillo, páginas físicas 4–11 (requisitos, fases, rúbrica y productos).
- Modelo y parámetros vigentes: `src/data/marsMath.ts`, `src/data/marsHabitat.ts`, `src/data/campusUtilities.ts`, `src/data/campusServiceBalance.ts`, `src/data/projectFacts.ts` y `src/components/colonyCampus.ts`.
- Desarrollo visible y verificadores: `src/data/mathSolutions.ts`, `src/data/academicDevelopment.ts` y `scripts/verify-project.mjs` con sus comprobaciones subordinadas. Procedimientos ampliados en `Anexo_Matematico_EVA03_Fuente.md`.
- Recursos externos visibles en el modelo: la textura `rock_06` procede de Poly Haven, autor Rob Tuytel, CC0 (origen y licencia en `public/materials/SOURCE.txt`); las texturas planetarias se describen en `public/textures/ATTRIBUTION.md`. La procedencia y los permisos individuales de los GLB NASA/otros y algunos mapas aún deben confirmarse antes de redistribuir el paquete.
- Contexto externo para los cinco estudios opcionales: [NASA, tormentas de polvo](https://science.nasa.gov/resource/mars-report-dust-storms-on-mars/), [NASA, mapa SWIM de hielo subsuperficial](https://science.nasa.gov/resource/swim-map-shows-subsurface-water-ice-on-mars/), [NASA, misión MOXIE](https://www.nasa.gov/solar-system/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/) y [NASA/JPL, radiación medida por Curiosity](https://www.nasa.gov/centers-and-facilities/jpl/how-nasas-curiosity-rover-is-making-mars-safer-for-astronauts/). Estas fuentes contextualizan los temas; **no** proporcionan los coeficientes hipotéticos de EVA03.

**Control de entrega:** el PDF generado incorpora portada, índice paginado y figuras propias de trazas, R y E; el plano integrado se exporta por separado. Antes de entregar se completan carnés, sección, fecha, contribuciones auténticas y atribuciones individuales pendientes, y se ensaya la defensa de los tres integrantes.
