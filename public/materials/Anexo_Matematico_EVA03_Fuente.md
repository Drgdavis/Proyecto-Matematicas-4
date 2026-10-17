# EVA03 — anexo matemático: procedimientos reproducibles

**Estado:** fuente editable de `Anexo_Matematico_EVA03_Final.pdf`, exportado el 12/10/2026. Usa las coordenadas vigentes del depósito, punto decimal en ecuaciones y unidades SI; distingue cifras redondeadas de identidades exactas. El eje y matemático es Norte y el eje vertical matemático es z. En Three.js la terna se coloca como `(x,z,y)`. Carnés, sección y contribuciones reales del equipo siguen pendientes de confirmar.

## A1. Función, parámetros, dominio y tres evaluaciones

Se fijó `s(x,y)=(x²+y²)/6400−1` y `f(x,y)=18+6s²+0.012x−0.006y` m, con x,y en metros. La función es polinómica y su dominio matemático es ℝ². La región física estudiada es `D: x²+y²≤110²`; `A(D)=12100π≈38 013.272 m²`. El término radial se anula en r=80 m; las inclinaciones lineales producen asimetría. No debe confundirse el disco D con la circunferencia comparativa r=72 m ni con el sector de integración R.

Dimensiones de los parámetros: 18 m es cota de referencia; 6 m, amplitud radial; 6400 m² equivale a `(80 m)²`; 0.012 y −0.006 son coeficientes de elevación por metro horizontal (m/m); 110 m es el radio del dominio físico. Por ello cada sumando de f entrega metros. Los coeficientes se eligieron para producir depresión, elevación y asimetría resolubles analíticamente, no por ajuste a topografía real.

Sustituciones: `f(0,0)=18+6=24.000000 m`; en P=(40,−20), `s=2000/6400−1=−0.6875`, por lo que `f(P)=18+6(0.6875²)+0.480+0.120=21.4359375 m`. En B⁺=(64.398758,−32.199379), r=72, `s=5184/6400−1=−0.19` y `f(B⁺)≈19.182581 m`. Las últimas coordenadas se muestran redondeadas; el programa usa el par algebraico `72(2/√5,−1/√5)` para el candidato matemático.

## A2. Curvas de nivel, trazas y escala

Una curva de nivel c satisface `18+6[((x²+y²)/6400)−1]²+0.012x−0.006y=c`. Se representaron c=17, 18.5, 20, 21.5, 23 y 24 m. Por la inclinación lineal no son círculos perfectos ni todas tienen una única rama. Dos trazas verticales reproducibles se obtienen fijando un eje: `y=0 → z=18+6(x²/6400−1)²+0.012x` y `x=0 → z=18+6(y²/6400−1)²−0.006y`. En ambas, limitar el parámetro horizontal a [−110,110] si se habla del terreno físico D. La escala es 1 unidad de coordenada = 1 m. El paisaje procedural exterior no se utiliza para extrapolar niveles o decisiones.

## A3. Primeras y segundas derivadas

Por cadena, `s_x=x/3200`, `s_y=y/3200`, de donde

`f_x=12s(x/3200)+0.012=(3x/800)s+0.012`,

`f_y=12s(y/3200)−0.006=(3y/800)s−0.006`.

Derivando otra vez:

`f_xx=(3/800)s+(3x²/2 560 000)`, `f_yy=(3/800)s+(3y²/2 560 000)`, `f_xy=f_yx=3xy/2 560 000`.

En P, `s=−0.6875`, `∇f(P)=(−0.091125,0.0455625)` y

`H_f(P)=[[-0.000703125,−0.0009375], [−0.0009375,−0.002109375]]` [m⁻¹].

Las parciales primeras tienen unidad m/m (adimensional como razón de pendiente); las segundas cambian pendiente por metro. Se contrastan en el verificador con diferencias finitas, no se derivan de la malla 3D.

## A4. Plano tangente y error de linealización

El plano en P=(40,−20,21.4359375) es `z−f(P)=f_x(P)(x−40)+f_y(P)(y+20)`, es decir

`L(x,y)=21.4359375−0.091125(x−40)+0.0455625(y+20)`.

Su normal orientada es `n=(−f_x(P),−f_y(P),1)=(0.091125,−0.0455625,1)`. Para H=(44,−17), el desplazamiento es (4,3) m y `L(H)=21.4359375−0.091125·4+0.0455625·3=21.208125 m`. Sustitución directa en f: `f(H)=21.183314209 m`; por tanto `|L−f|≈0.024810791 m` y `100|L−f|/|f|≈0.117124 %`. El error tiene sentido local y aumenta al alejarse del punto de tangencia.

## A5. Gradiente y direccional en P

`‖∇f(P)‖=√[(-0.091125)²+(0.0455625)²]=0.101880847`, equivalente a 10.188085 % de pendiente máxima local. La dirección unitaria de ascenso es `a_P≈(−0.894427,0.447214)`; la de descenso, `−a_P`. Una tangente de nivel es `(0.447214,0.894427)` y su producto con ∇f(P) es 0 (con componentes exactas, sin error de redondeo). La dirección propuesta `u=(3/5,4/5)` es unitaria: `‖u‖=√(9/25+16/25)=1`. Entonces `D_u f(P)=−0.091125(3/5)+0.0455625(4/5)=−0.018225 m/m`: descenso instantáneo de 1.8225 cm por metro horizontal.

## A6. Segundo punto Q

En Q=(−50,35), `s=3725/6400−1=−0.41796875`, `∇f(Q)=(0.090369140625,−0.0608583984375)` y `‖∇f(Q)‖≈0.108951027` (10.895103 %). Ascenso unitario ≈(0.829447,−0.558585); descenso opuesto. Una tangente de nivel es ≈(0.558585,0.829447). Para `u=(1,−2)/√5`, `‖u‖=1` y `D_u f(Q)=[0.090369140625+2·0.0608583984375]/√5≈0.094847715 m/m`. La desigualdad `|D_u f|≤‖∇f‖` se satisface.

## A7. Regla de la cadena sobre la ruta de radio 72

Defina `x(t)=72 cos t`, `y(t)=72 sin t`, `z(t)=f(x(t),y(t))`. Entonces `x′=−72 sin t`, `y′=72 cos t`. Como r=72 es constante, `s=−0.19`, y la regla de la cadena da

`z′=[(3x/800)s+0.012]x′+[(3y/800)s−0.006]y′`.

Los términos proporcionales a `xx′+yy′=0` se anulan y queda `z′=−0.864 sin t−0.432 cos t=−√(0.864²+0.432²) sin(t+α)`, donde `α=atan(1/2)`. En `t∈[−α,π−α]`, el seno es positivo dentro; la ruta desciende en su interior y z′=0 en los extremos. `dz/dt` tiene m/rad; con un tiempo τ, `dz/dτ=z′(t)·dt/dτ`.

## A8. Puntos críticos libres y Hessiano

Escriba `q=3s/800`, de modo que `f_x=qx+0.012` y `f_y=qy−0.006`. El sistema `f_x=f_y=0` exige `qx=−0.012`, `qy=0.006`; ni q ni x pueden ser 0, y dividir da `y=−x/2`. Sustituir en q lleva a

`p(x)=1.25x³/6400−x+3.2=0`.

Se localiza una raíz en cada intervalo [−74,−72], [3,4] y [69,71]; Newton `x_{n+1}=x_n−p(x_n)/p′(x_n)` las refina. Tras volver a `y=−x/2` y `z=f(x,y)`, se obtienen aproximadamente:

| Candidato (x,y,z), m | D del Hessiano | Clasificación |
|---|---:|---|
| C₁≈(−73.104,36.552,16.915) | +1.312×10⁻⁶; `f_xx>0` | mínimo local |
| C₂≈(3.206,−1.603,24.024) | +1.395×10⁻⁵; `f_xx<0` | máximo local |
| C₃≈(69.897,−34.949,19.061) | −1.199×10⁻⁶ | silla |

La prueba se refiere al valor local de f, no a resistencia del terreno ni a una implantación automática.

## A9. Problema restringido auténtico y ecuaciones de Lagrange

La pregunta limitada es: ¿qué punto de la circunferencia de radio 72 m ofrece menor pendiente máxima local para una llegada? Se minimiza `F=‖∇f‖²=f_x²+f_y²` sujeto a `g=x²+y²=5184`. Usar F evita una raíz cuadrada y preserva el mínimo. La pertinencia del radio es académica: coincide con la ruta matemática y borde externo de R. No certifica un perímetro seguro.

Con `p=(x,y)`, `b=(0.012,−0.006)`, `∇f=qp+b` y `H_f=qI+kppᵀ`, `k=3/2 560 000`, la derivada correcta se toma **antes** de fijar el radio: `∇F=2H_f∇f`. El sistema de Lagrange es `∇F=λ(2p)`, `p·p=5184`. Eliminar λ mediante `xF_y−yF_x=0` produce `2q(xb_y−yb_x)=0`. En la circunferencia, `q=−0.0007125≠0`; de ahí `−0.006x−0.012y=0`, o `y=−x/2`.

## A10. Candidatos, comparación y decisión

Intersecar `y=−x/2` con `x²+y²=5184` da `B⁺=72(2/√5,−1/√5)≈(64.398758,−32.199379)` y `B⁻=−B⁺`. Los valores son `F(B⁺)≈0.00143516655`, `F(B⁻)≈0.00418821345`; por raíz, las pendientes son 3.788359 % y 6.471641 %. Reducción porcentual: `100(6.471641−3.788359)/6.471641≈41.46 %`. Se escogió B⁺ como llegada y acceso. El núcleo (−8,8) prioriza distribución de las tres alas y su pendiente calculada es 5.447127 %. La elección de B⁺ no demuestra excavación menor ni seguridad estructural.

La circunferencia restringida es compacta y F es continua, así que existe mínimo global sobre ella. `∇g=(2x,2y)≠0` en r=72 y las únicas estaciones tangenciales resultaron B⁺ y B⁻; compararlas basta para el mínimo **de esa restricción**, sin extenderlo al resto de D.

## A11. Curva espacial, derivadas y tangente

`r(t)=(72cos t,72sin t,f(72cos t,72sin t))`, `t₀=−α`, `t₁=π−α`, `α=atan(1/2)`. Sus derivadas:

`r′(t)=(−72sin t,72cos t,−0.864sin t−0.432cos t)`,

`r″(t)=(−72cos t,−72sin t,−0.864cos t+0.432sin t)`.

`‖r′‖=√[5184+(−0.864sin t−0.432cos t)²]≥72>0`; por ello la curva es regular y `T(t)=r′/‖r′‖`. Estas son derivadas respecto de ángulo. Si t=t(τ) es un reloj, velocidad `v=r′·ṫ` y aceleración `a=r″ṫ²+r′ẗ`; no se atribuyen m/s o m/s² sin esa ley temporal.

## A12. Longitud, curvatura y punto relevante

`L=∫_{−α}^{π−α}√[5184+(−0.864sin t−0.432cos t)²] dt≈226.204849475 m`. Gauss–Legendre de órdenes crecientes y Simpson independiente coinciden dentro de tolerancia; además `72π≤L≤π√(5184+0.864²+0.432²)` sirve como control dimensional.

`r′×r″=(−62.208,31.104,5184)` en ejes (x,y,z), por tanto `κ=‖r′×r″‖/‖r′‖³`. En `t*=π/2−α≈1.107148718`, z′ es mínimo: `z″=−√(0.864²+0.432²)cos(t+α)` cambia de signo de negativo a positivo. El punto es `C*≈(32.199379,64.398758,18.2166)` m y allí `κ≈0.01388638934 m⁻¹`, `1/κ≈72.01296 m`. C* es crítico para **la pendiente longitudinal**, no singularidad de r. Si se impone por hipótesis aceleración lateral máxima de 0.55 m/s², `v_max=√(0.55/κ)≈6.29 m/s`: límite ideal que omite tracción y obstáculos.

## A13. Región R y jacobiano polar

`R={(r,θ):60≤r≤72,−π/4≤θ≤0}`. La matriz de `(x,y)=(r cosθ,r sinθ)` es `J=[[cosθ,−r sinθ],[sinθ,r cosθ]]`; `|det J|=r`. Por eso `∬_R h(x,y)dA=∫_{−π/4}^0∫_{60}^{72}h(r cosθ,r sinθ)r dr dθ`. El área horizontal se obtiene con h=1: `A=[r²/2]_{60}^{72}[θ]_{−π/4}^{0}=198π≈622.035345 m²`. La región en (r,θ) es rectangular, razón del cambio.

## A14. Integral doble de f y altura media

Al sustituir polar, `f=24−12r²/6400+6r⁴/6400²+r(0.012cosθ−0.006sinθ)`. Multiplicar por el jacobiano r da

`fr=24r−12r³/6400+6r⁵/6400²+(0.012cosθ−0.006sinθ)r²`.

La primitiva radial es `K(r)+(0.004cosθ−0.002sinθ)r³`, con `K(r)=12r²−3r⁴/6400+r⁶/6400²`. Por tanto

`V_R=[K(72)−K(60)]π/4+(72³−60³)[0.004/√2+0.002(1−1/√2)]`.

Evaluación analítica: `V_R≈12 119.961705428 m³`; cuadratura finita de contraste ≈12 119.961745 m³. `f̄=V_R/A≈19.484362 m`. f es positiva en R, así que la integral es volumen bajo la gráfica hasta z=0, no un volumen de corte o un tanque. El orden primero r, después θ mantiene límites constantes.

## A15. Área verdadera de la superficie

Parametrice `S(x,y)=(x,y,f(x,y))`. Entonces `S_x=(1,0,f_x)`, `S_y=(0,1,f_y)` y `S_x×S_y=(−f_x,−f_y,1)`. La integral es

`A_S=∫_{−π/4}^0∫_{60}^{72}√[1+f_x(r cosθ,r sinθ)²+f_y(r cosθ,r sinθ)²] r dr dθ`.

Cuadratura Gauss–Legendre con 12, 24, 48 y 96 nodos por eje, contrastada por Simpson, converge a `A_S≈623.364856989 m²`. Diferencia `A_S−A≈1.329512 m²`; relativa `100(A_S/A−1)≈0.213736 %`. Esta superficie de suelo no es la suma del área nominal de los paneles.

## A16. Semielipsoide y límites cartesianos

`E: u²/324+v²/196+w²/64≤1, w≥0`. Para el orden `dw dv du`:

`−18≤u≤18`, `−14√(1−u²/324)≤v≤14√(1−u²/324)`, `0≤w≤8√(1−u²/324−v²/196)`.

La integral triple cartesiana de 1 usa exactamente esos límites. E tiene planta de 36×28 m y altura máxima 8 m. Su posición global vigente es `(x,y,z)=(u,−94+v,23.363122115+w)` m (piso calculado a partir de la huella del terreno; la última cifra puede variar según precisión de representación). El volumen y momentos que siguen se calculan en **coordenadas locales**; una traslación del depósito no cambia esos integrales.

## A17. Cambio esférico escalado y jacobiano explícito

`u=aρsinφcosθ`, `v=bρsinφsinθ`, `w=cρcosφ`, con `(a,b,c)=(18,14,8) m`, `0≤ρ≤1`, `0≤φ≤π/2`, `0≤θ≤2π`. La matriz `∂(u,v,w)/∂(ρ,φ,θ)` es

```text
[ a sinφ cosθ    aρ cosφ cosθ    −aρ sinφ sinθ ]
[ b sinφ sinθ    bρ cosφ sinθ     bρ sinφ cosθ ]
[ c cosφ        −cρ sinφ          0           ]
```

Factorizar a,b,c de filas deja el jacobiano esférico usual; así `|J|=abcρ²sinφ=2016ρ²sinφ` [m³] y `dV=2016ρ²sinφ dρ dφ dθ`. Sustituir en la desigualdad de E da ρ²≤1 y w≥0 implica cosφ≥0; el dominio del cambio es correcto. Frente a los límites cartesianos dependientes de u y v, aquí todos son constantes.

## A18. Volumen triple evaluado paso a paso

La evaluación indispensable de la consigna es:

```text
V = ∫(θ=0→2π) ∫(φ=0→π/2) ∫(ρ=0→1) 2016ρ²sinφ dρ dφ dθ
  = ∫(0→2π) ∫(0→π/2) [672ρ³sinφ]₀¹ dφ dθ
  = ∫(0→2π) 672[−cosφ]₀^(π/2) dθ
  = ∫(0→2π) 672 dθ = 1344π = 4 222.300526 m³.
```

Comprobación independiente por cortes horizontales: `A(w)=πab(1−w²/c²)` y `∫₀⁸ A(w)dw=πab[8−8/3]=1344π`. Es capacidad geométrica total del sólido ideal, no inventario actual ni autonomía.

Como referencia **geométrica sin densidad**, el primer momento de volumen es `∭_E w dV=3V` y los de u y v se anulan por simetría. Por ello el centroide del sólido es `(0,0,3) m` en coordenadas locales. No debe confundirse con el centro de masa de A20, que usa δ variable y queda ligeramente más bajo.

## A19. Densidad positiva y masa

Se definió `δ(u,v,w)=920[1+0.04u/18−0.06w/8] kg/m³`. Sobre el semielipsoide, el mínimo del término lineal ocurre en la frontera con w≥0 y vale `δ_min=920−√(36.8²+55.2²)≈853.658 kg/m³>0`; el máximo es 956.8 kg/m³ en u=18,w=0. Es una distribución ideal de composición/porosidad, no agua pura en equilibrio.

Los cocientes `u/18` y `w/8` son adimensionales. El valor base 920 kg/m³ y las perturbaciones de 4 % horizontal y 6 % vertical se adoptaron para producir una masa y un centro desplazado sin violar positividad; no proceden de una muestra, estratigrafía o prueba de fluido.

`M=∭_E δ dV=920[V+(0.04/18)∭u dV−(0.06/8)∭w dV]`. Por simetría en u, `∭u dV=0`. Para la semiesfera escalada, `I_w=∭w dV=abc²(∫₀¹ρ³dρ)(∫₀^(π/2)cosφsinφdφ)(∫₀^(2π)dθ)=πabc²/4=3V`. En consecuencia `M=920[V−(0.06/8)3V]=899.3V≈3 797 114.863414 kg`. La densidad media ideal es 899.3 kg/m³.

## A20. Tres primeros momentos y centro de masa

Simetría da `∭vδdV=0`. Otras integrales auxiliares del semielipsoide son `∭u²dV=Va²/5`, `∭w²dV=Vc²/5`; los términos impares en u, v y uw se anulan. Con la notación de la consigna:

`M_vw=∭uδdV=920(0.04/a)(Va²/5)≈559 370.373741 kg·m`,

`M_uw=∭vδdV=0`,

`M_uv=∭wδdV=920[I_w−(0.06/c)(Vc²/5)]≈11 280 635.870438 kg·m`.

Son **primeros momentos**, no momentos de inercia. Dividir cada uno por M produce `(ū,v̄,w̄)≈(0.147314578,0,2.970843990) m`. La altura mundial correspondiente es `23.363122115+2.970843990=26.333966105 m`, y la planta mundial `(0.147314578,−94) m`. Como `w̄/8≈0.37136`, el centro del contenido ideal está bajo la mitad de la altura; no sustituye un análisis de volcamiento, paredes, cargas y fundación.

## A21. Integración de resultados y controles de alcance

Los objetos usan el mismo D y la misma f. B⁺ decide solo llegada; el núcleo (−8,8) y los 16 módulos se justifican por circulación. R decide suelo e integral doble, y los 20 paneles dentro de R no deben intercambiarse con los 24 auxiliares externos. E decide la integral triple; mover su origen global a (0,−94) no cambia V, M ni el centro **local**. La ruta r(t) es un semicírculo matemático; el ramal físico hacia el taller se mide por separado. Ninguna integral aporta por sí misma potabilidad, energía para todas las cargas, seguridad geotécnica o autosuficiencia.

Verificadores asociados: `verify-mars.mjs` (derivadas, integrales y cambios), `verify-region.mjs` (R y área), `verify-demonstrations.mjs` (secuencia matemática), `verify-systems.mjs` (escenario de servicios), `verify-traceability.mjs` (inventario y cifras), más verificadores de accesos/maniobra compilados por `verify-project.mjs`. Las pruebas numéricas verifican tolerancias; las identidades analíticas anteriores explican el procedimiento.

## A22. Balance complementario de energía y agua (supuestos de diseño)

Para los 20 paneles horizontales de estudio, `P_R(t)=I₀(20·6)ηPR·max(0,ŝ(t)·n̂)`, con `I₀=590 W/m²`, `η=0.24`, `PR=0.86`, latitud 18° y declinación 0. `P_R(mediodía)≈13.897903 kW`; de noche `P_R=0`. El escenario de servicio suma 24 paneles auxiliares: 44 paneles en total. La energía conectada escala el mismo perfil por `44/20`, fracción activa 0.85 y transmitancia 0.70. Se integra por Simpson compuesto de 2 400 subintervalos sobre un ciclo de 24 h **normalizado**: `E_sol≈138.979355 kWh`. Demanda de dos cargas: `(4.5+0.6)kW·24h=122.4 kWh`. Batería usable `120·0.8=96 kWh`; en cada paso Δt=0.01 h se añade `0.9·max(P−5.1,0)Δt` o se resta `max(5.1−P,0)Δt/0.9`, truncando a [0,96] kWh. Se repiten tres ciclos mediodía→mediodía para descartar el llenado inicial arbitrario. Caso final: 0 kWh no servidos, mínimo≈21.891 kWh y recorte≈0.934 kWh. Cambiar transmitancia a 0.60 vuelve a dejar carga sin servir. No se incluyeron demás edificios.

Para agua, `N=32` salidas, `q=2 L/salida/ciclo`, rendimiento `η_T=0.85`, capacidad `C_T=100 L/ciclo`. `L_entregados=Nq=64 L`, `L_brutos=64/0.85=75.294118 L`, `L_pérdida=11.294118 L`, margen de planta `100−75.294118=24.705882 L/ciclo`. Una demanda hipotética de tripulación `3·20=60 L/ciclo`, aún sin conexión, llevaría la necesidad a `(64+60)/0.85=145.882353 L/ciclo` y superaría la capacidad por 45.882353 L/ciclo. No se convierte el volumen geométrico de E en ciclos de agua disponible: faltan llenado, tratamiento, recirculación y potabilidad.

## A23. Estudio exploratorio de polvo (independiente de A22)

El control de polvo adopta opacidad adimensional `0≤τ≤4` y transmitancia `T=e^(−τ)`. Mantiene fija la incidencia y usa solo los 20 paneles nominales de R: `I(τ)=590e^(−τ) W/m²` y `P(τ)=I(τ)·120 m²·0.24·0.86/1000=14.61312e^(−τ) kW`. A τ=0, `P=14.61312 kW`, excedente instantáneo frente a una carga **hipotética distinta** de 12 kW de 2.61312 kW. La igualdad `P=12` ocurre en `τ=ln(14.61312/12)≈0.197013`; por encima hay déficit instantáneo. A τ=4, `P≈0.267649 kW`, déficit ≈11.732351 kW. Este ejercicio no incluye batería ni el escenario conectado de 44 paneles/5.1 kW de A22. El factor `e^(−τ)` ilustra atenuación; τ no se midió en el campus sintético.

## A24. Índice exploratorio de hielo

Tres candidatos internos a D son C1=(−48,42), C2=(−82,18), C3=(−22,76) m. Se les asignaron **por hipótesis** potenciales de hielo `H=(0.78,0.63,0.49)`. Para cada sitio se calcula `P_i=max(0,1−‖∇f(C_i)‖/0.12)` y `D_i=max(0,1−d(C_i,B⁺)/200)`, ambos sin unidades. Los puntajes son `S_i(w)=wH_i+(0.75−w)P_i+0.25D_i`, `0.25≤w≤0.65`; los pesos suman 1. La pendiente y distancia proceden de f y de B⁺; H no procede de sondeo real.

| Sitio | `‖∇f‖` | `d(C,B⁺)` m | P | D | `S(0.25)` | `S(0.65)` |
|---|---:|---:|---:|---:|---:|---:|
| C1 | 0.100190 | 134.681 | 0.165085 | 0.326594 | 0.359191 | 0.605157 |
| C2 | 0.019153 | 154.766 | 0.840395 | 0.226169 | 0.634240 | 0.550082 |
| C3 | 0.018446 | 138.462 | 0.846285 | 0.307688 | 0.622564 | 0.480050 |

Con peso bajo para hielo gana C2; con peso alto gana C1. El cambio es sensibilidad de una **regla de decisión supuesta**, no detección de recurso ni comprobación de perforabilidad.

## A25. Balance didáctico de oxígeno

Para tres personas se supuso consumo `C=2.52 kg O₂/sol`. La producción P es parámetro entre 1.5 y 3.5 kg/sol; reserva inicial 9 kg y capacidad ideal 18 kg. En un sol, `ΔM=P−2.52 kg`, `M₁=min(18,max(0,9+ΔM)) kg`. Si P=1.5, `ΔM=−1.02 kg` y `M₁=7.98 kg`; si P=2.52, balance nulo y `M₁=9 kg`; si P=3.5, `ΔM=+0.98 kg` y `M₁=9.98 kg`. Al mantener P=3.5 y sin pérdidas adicionales, el tiempo algebraico para pasar de 9 a 18 kg sería `9/0.98≈9.184 soles`, no una predicción operativa. No se dimensionaron generación ISRU, agua de alimentación ni aporte biológico. Esta reserva no es el depósito E y el sol no se equipara al ciclo eléctrico normalizado de 24 h.

## A26. Atenuación comparativa de blindaje

Se normalizó exposición exterior D₀=100 % y se adoptó `μ=0.42 m⁻¹` **solo como parámetro demostrativo**. Para espesor equivalente `0≤x≤5 m`, `D(x)/D₀=e^(−μx)` y reducción `R=1−e^(−μx)`. A x=0, R=0. A x=5, `e^(−2.1)=0.122456` y `R≈0.877544=87.7544 %`. Es una comparación relativa sin espectro, material especificado, dosis clínica ni masa de cubierta; no prueba un nivel de protección para personas.

## A27. Estimado independiente de energía del rover

Para la ruta matemática L≈226.205 m se adoptaron por hipótesis masa operativa `320≤m≤620 kg`, gravedad 3.71 m/s², coeficiente de rodadura 0.04 y margen adicional 0.19 Wh/kg. `E_rod=0.04·m·3.71·226.205/(3.6·10⁶) kWh` convierte joules a kWh; `E_margen=0.19m/1000 kWh`; `E_est=E_rod+E_margen`. Para 320 kg, `E_rod≈0.002984`, `E_margen=0.060800`, total≈0.063784 kWh. Para 620 kg, `E_rod≈0.005781`, `E_margen=0.117800`, total≈0.123581 kWh. La pendiente se representa localmente, pero el trabajo de elevación no se integra en esta ecuación; tampoco se incluyen aceleraciones, recuperación, rendimiento de motor ni el ramal a logística. Sin capacidad de batería no se deduce autonomía. La cota de velocidad por curvatura de A12 es otra restricción y no se suma como energía.

## A28. Líneas de máximo descenso (capa topográfica)

Desde una semilla p₀ del disco, un paso de longitud horizontal tentativa `Δs=2.4 m` sigue `p_{k+1}=p_k−Δs∇f(p_k)/‖∇f(p_k)‖`. El algoritmo reduce el paso a la mitad si la nueva cota no baja o el punto sale de D; se detiene cerca de un crítico o si no encuentra descenso. La comprobación en cada paso aceptado es `f(p_{k+1})<f(p_k)`. La construcción da **líneas topográficas discretas** del modelo f; no calcula precipitación, caudal, erosión ni presencia de agua líquida.

## Fuentes

- PDF oficial *Proyecto Integrador Matemática IV — Mars Math Base*, §4–11 y lista de verificación §14.
- Fuentes numéricas activas: `src/data/marsMath.ts`, `src/data/campusServiceBalance.ts`, `src/data/projectFacts.ts`, `src/data/mathSolutions.ts` y `src/data/academicDevelopment.ts`.
- Escenarios exploratorios separados: `src/data/researchScenarios.ts` y `src/data/marsSystems.ts`. Sus parámetros de polvo, hielo, oxígeno, blindaje y energía del rover son supuestos del programa, no medidas obtenidas de las referencias contextuales NASA listadas en el informe.
- Interpretación y decisiones: `Informe_Tecnico_EVA03_Fuente.md` y `Auditoria_EVA03_Maestra.md`. Esta última es la única auditoría operativa; el presente archivo es un anexo académico, no un plan.
