// Desarrollo del caso oficial EVA03. Anexo A1–A21.
import { MARS, tankFloor } from './marsMath.ts';
export const academicDevelopment:Record<string,{working:string[];why?:string;result?:string;eq?:string;tag?:string}> = {
  "Gradiente en P": {
    "working": [
      "s(P)=−0.6875; fx(P)=0.15s+0.012=−0.091125; fy(P)=−0.075s−0.006=0.0455625.",
      "||∇f(P)||=√(fx²+fy²)=0.101880847: pendiente máxima 10.1881%.",
      "Ascenso unitario (−0.894427,0.447214); descenso (0.894427,−0.447214).",
      "La cota local cambia hasta 10.1881 cm por metro horizontal. La fuerza de tracción y el caudal requieren otros modelos.",
      "Una tangente de nivel es (0.447214,0.894427); su producto punto con ∇f es cero. Anexo A5."
    ]
  },
  "Gradiente en Q": {
    "why": "El lugar cambia la pendiente; el gradiente permite comparar direcciones.",
    "working": [
      "Q=(−50,35); s=−0.41796875.",
      "fx=0.090369140625; fy=−0.0608583984375.",
      "||∇f(Q)||=0.108951027: pendiente máxima 10.8951%.",
      "Ascenso unitario (0.829447,−0.558585); descenso (−0.829447,0.558585).",
      "Tangente de nivel (0.558585,0.829447), perpendicular al gradiente. Anexo A6."
    ]
  },
  "Derivada direccional": {
    "working": [
      "u=(3/5,4/5). ||u||=√(9/25+16/25)=1.",
      "Du f(P)=−0.091125(0.6)+0.0455625(0.8)=−0.018225 m/m.",
      "Desciende 1.8225 cm por metro horizontal, como tasa instantánea.",
      "Para un pequeño Δℓ, Δz≈Du f·Δℓ. La distancia sobre el terreno es distinta de la horizontal. Anexo A5."
    ]
  },
  "Direccional en Q": {
    "working": [
      "u=(1,−2)/√5; ||u||=√((1+4)/5)=1.",
      "Du f(Q)=[0.090369140625+2(0.0608583984375)]/√5.",
      "Resultado 0.094847715 m/m: ascenso de 9.4848 cm por metro horizontal.",
      "La norma limita todas las direccionales: −||∇f||≤Du f≤||∇f||. Anexo A6."
    ]
  },
  "Regla de la cadena": {
    "result": "Descenso en todo el interior; z′=0 en los extremos",
    "why": "El signo se evalúa en el intervalo real de la ruta.",
    "working": [
      "x′=−72sin t; y′=72cos t. En el anillo, ∇f=q(x,y)+(0.012,−0.006).",
      "z′=(qx+0.012)(−72sin t)+(qy−0.006)(72cos t).",
      "Los términos radiales se cancelan: z′=−0.864sin t−0.432cos t.",
      "Con α=atan(1/2), z′=−0.965981366sin(t+α).",
      "t∈[−α,π−α]: z′<0 en el interior, z′=0 al inicio y al final. No hay tramo ascendente.",
      "t es angular: m/rad. La velocidad vertical física requiere multiplicar por dt/dτ. Anexo A7."
    ]
  },
  "Sistema crítico": {
    "working": [
      "q=3[(x²+y²)/6400−1]/800; qx=−0.012 y qy=0.006.",
      "q≠0 y x≠0, por lo que y=−x/2.",
      "p(x)=1.25x³/6400−x+3.2=0.",
      "Tres raíces: intervalos [−74,−72], [3,4] y [69,71].",
      "Newton: x nuevo=x−p(x)/p′(x). Sustituir en fx,fy y calcular Hessiano. Anexo A8."
    ]
  },
  "Objetivo y restricción": {
    "result": "Plataforma de llegada de menor pendiente sobre la circunferencia de 72 m",
    "why": "Radio 72 m adoptado para conectar ruta y borde externo de R.",
    "working": [
      "F=fx²+fy²; g=x²+y²=5184.",
      "Minimizar el cuadrado equivale a minimizar la pendiente máxima local.",
      "La circunferencia de comparación es una hipótesis geométrica, no una frontera geotécnica certificada.",
      "B⁺ es la plataforma de llegada y acceso; el núcleo (−8,8) es una implantación conceptual distinta. Anexo A9."
    ]
  },
  "Lagrange y comparación": {
    "why": "B⁺ minimiza la pendiente sobre la circunferencia de comparación adoptada.",
    "working": [
      "p=(x,y), b=(0.012,−0.006), ∇f=qp+b; H=qI+kppᵀ, k=3/2560000.",
      "Derivar antes de imponer radio: ∇F=2H∇f=λ(2p).",
      "Eliminar λ: xFy−yFx=2q(xby−ybx)=0.",
      "q=−0.0007125≠0 ⇒ y=−x/2. Con g=5184: B±=±(64.398758,−32.199379).",
      "F(B+)=0.00143516655; F(B−)=0.00418821345.",
      "Pendientes: 3.788359% y 6.471641%. Menor pendiente no calcula excavación. Anexo A9–A10."
    ]
  },
  "Velocidad y aceleración": {
    "working": [
      "r′=(−72sin t,72cos t,−0.864sin t−0.432cos t).",
      "r″=(−72cos t,−72sin t,−0.864cos t+0.432sin t).",
      "Son derivadas respecto a un parámetro angular, no segundos.",
      "Para tiempo τ: v=r′ṫ; a=r″ṫ²+r′ẗ. Las flechas visuales tienen escala de representación. Anexo A11."
    ]
  },
  "Longitud de arco": {
    "why": "Mide distancia recorrida; energía y autonomía necesitan consumo.",
    "working": [
      "L=∫√(5184+(−0.864sin t−0.432cos t)²)dt en [−α,π−α].",
      "Gauss–Legendre: trasladar nodos de [−1,1] a [t0,t1] y sumar pesos por rapidez.",
      "Órdenes 16,32,64,128 convergen a 226.204849475 m.",
      "Control independiente: Simpson adaptativo y 72π≤L≤π√(5184+C²). Anexo A12."
    ]
  },
  "Curvatura": {
    "working": [
      "r′×r″=(−62.208,31.104,5184) en ejes matemáticos.",
      "κ(t)=||r′×r″||/||r′||³.",
      "En t*=1.107148718 rad: κ=0.01388638934 m⁻¹; R=72.01296 m.",
      "El círculo se calcula con punto y normal principal del parámetro mostrado. Usa Caso de referencia para comparar con el anexo A12."
    ]
  },
  "Inicio, control y final": {
    "eq": "t0=−atan(1/2); t*=π/2−atan(1/2); t1=π−atan(1/2)",
    "result": "B · C*: máximo descenso longitudinal · final",
    "why": "C* es crítico para la pendiente z′, no una singularidad de r.",
    "tag": "INICIO · CRÍTICO · FINAL",
    "working": [
      "z″=−0.965981366cos(t+α); z″(t*)=0.",
      "Antes de t*, z″<0; después, z″>0. z′ tiene mínimo.",
      "C*=(32.199379,64.398758,18.2166) m; |z′|/72 es máximo.",
      "La altura es estacionaria solo en los extremos; ||r′||≥72 siempre. Anexo A12."
    ]
  },
  "Área real": {
    "working": [
      "S=(x,y,f); Sx×Sy=(−fx,−fy,1).",
      "dS=√(1+fx²+fy²)dA, y en polar dA=r dr dθ.",
      "Gauss–Legendre 12,24,48,96 puntos por eje: 623.364856989 m².",
      "Contraste con Simpson adaptativo; diferencia real/proyección 1.329512 m² ≈0.213736%.",
      "Área de suelo para recubrimiento, no área instalada de paneles. Anexo A15."
    ]
  },
  "Transformación y límites": {
    "why": "La semiesfera unitaria parametriza el semielipsoide físico.",
    "working": [
      "u=18ρsinφcosθ; v=14ρsinφsinθ; w=8ρcosφ.",
      "Sustituir en E produce ρ²≤1: 0≤ρ≤1.",
      "w≥0 exige 0≤φ≤π/2. La planta completa exige 0≤θ≤2π.",
      `ρ es adimensional, semiejes en metros; el origen global es (${MARS.tankX},${MARS.tankY},${tankFloor.toFixed(6)}). Anexo A16–A17.`
    ]
  },
  "Jacobiano triple": {
    "working": [
      "Formar la matriz de derivadas de u,v,w respecto de ρ,φ,θ.",
      "Factorizar 18,14,8 de las filas.",
      "El determinante esférico restante es ρ²sinφ.",
      "|J|=2016ρ²sinφ; dV=|J|dρdφdθ.",
      "Las celdas de volumen se estiran según el producto de semiejes. Matriz completa en anexo A17."
    ]
  },
  "Volumen paso a paso": {
    "working": [
      "V=∫₀²π∫₀π/2∫₀¹2016ρ²sinφ dρdφdθ.",
      "Primero ρ: 2016sinφ[ρ³/3]₀¹=672sinφ.",
      "Después φ: 672[−cosφ]₀π/2=672.",
      "Finalmente θ: 672[θ]₀²π=1344π=4222.300526 m³.",
      "Control: ∫₀⁸π(18)(14)(1−w²/64)dw da el mismo volumen. Anexo A18."
    ]
  },
  "Masa paso a paso": {
    "working": [
      "M=920[V+(0.04/18)∭u dV−(0.06/8)∭w dV].",
      "La integral impar ∭u dV=0 por simetría.",
      "Iw=abc²(∫ρ³)(∫cosφsinφ)(∫dθ)=abc²(1/4)(1/2)(2π).",
      "Iw=πabc²/4=3V para c=8 m.",
      "M=920[V−(0.06/8)3V]=899.3V=3797114.863 kg. Anexo A19."
    ]
  },
  "Momentos": {
    "working": [
      "Iu²=a³bc(1/5)(2/3)π=Va²/5; Iw²=abc³(1/5)(1/3)2π=Vc²/5.",
      "Las integrales de u,v y uw son cero por simetría.",
      "Mvw=920(0.04/18)Iu²=559370.373741 kg·m.",
      "Muw=0; Muv=920[Iw−(0.06/8)Iw²]=11280635.870438 kg·m.",
      "Las tres integraciones auxiliares se desarrollan en anexo A20."
    ]
  },
  "Cartesiano vs. elipsoidal": {
    "working": [
      "En cartesianas: −18≤u≤18.",
      "−14√(1−u²/324)≤v≤14√(1−u²/324).",
      "0≤w≤8√(1−u²/324−v²/196). Orden dw dv du.",
      "Esféricas escaladas: límites constantes ρ:0–1, φ:0–π/2, θ:0–2π.",
      "La simplificación conserva el sólido y requiere multiplicar por 2016ρ²sinφ. Anexo A16–A18."
    ]
  },
  "Escorrentía por máximo descenso": {
    "working": [
      "p nuevo=p−Δs∇f/||∇f||.",
      "El paso inicial es 2.4 m; se reduce por mitades si la altura no baja o se sale de D.",
      "Se detiene cerca de críticos o cuando no encuentra descenso.",
      "Son líneas geométricas de máximo descenso. No calculan caudal ni agua líquida marciana."
    ]
  }
};
