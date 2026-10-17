"""Build the EVA03 team study guide from the verified mathematical annex."""

from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, PageBreak,
    KeepTogether, Table, TableStyle, HRFlowable,
)


ROOT = Path(__file__).resolve().parent
OUT = (ROOT.parent / "public" / "materials" / "Guia_de_Estudio_y_Defensa_EVA03.pdf"
       if ROOT.name == "scripts" else
       ROOT / "output" / "pdf" / "Guia_de_Estudio_y_Defensa_EVA03.pdf")
OUT.parent.mkdir(parents=True, exist_ok=True)

pdfmetrics.registerFont(TTFont("Arial", r"C:\Windows\Fonts\arial.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", r"C:\Windows\Fonts\arialbd.ttf"))
pdfmetrics.registerFontFamily("Arial", normal="Arial", bold="Arial-Bold")
pdfmetrics.registerFont(TTFont("Cambria", r"C:\Windows\Fonts\cambria.ttc", subfontIndex=0))
pdfmetrics.registerFont(TTFont("Cambria-Bold", r"C:\Windows\Fonts\cambriab.ttf"))
pdfmetrics.registerFontFamily("Cambria", normal="Cambria", bold="Cambria-Bold")

NAVY = colors.HexColor("#14243A")
TEAL = colors.HexColor("#117C80")
ORANGE = colors.HexColor("#CA693F")
PALE = colors.HexColor("#EEF5F5")
LIGHT = colors.HexColor("#F4F6F8")
INK = colors.HexColor("#233241")
MUTED = colors.HexColor("#5C6C78")

styles = {
    "kicker": ParagraphStyle("kicker", fontName="Arial-Bold", fontSize=9, leading=12, textColor=TEAL, spaceAfter=9),
    "cover": ParagraphStyle("cover", fontName="Arial-Bold", fontSize=28, leading=33, textColor=NAVY, spaceAfter=12),
    "cover_sub": ParagraphStyle("cover_sub", fontName="Arial", fontSize=15, leading=21, textColor=INK, spaceAfter=20),
    "h1": ParagraphStyle("h1", fontName="Arial-Bold", fontSize=20, leading=25, textColor=NAVY, spaceAfter=10),
    "h2": ParagraphStyle("h2", fontName="Arial-Bold", fontSize=12, leading=17, textColor=TEAL, spaceBefore=11, spaceAfter=4),
    "body": ParagraphStyle("body", fontName="Cambria", fontSize=12, leading=17.7, textColor=INK, spaceAfter=9),
    "small": ParagraphStyle("small", fontName="Cambria", fontSize=11, leading=15.7, textColor=INK, spaceAfter=7),
    "formula": ParagraphStyle("formula", fontName="Cambria", fontSize=11.5, leading=17.3, textColor=NAVY, spaceAfter=1),
    "callout": ParagraphStyle("callout", fontName="Arial-Bold", fontSize=11.5, leading=16, textColor=NAVY),
    "tiny": ParagraphStyle("tiny", fontName="Arial", fontSize=7.8, leading=10, textColor=MUTED),
}


def P(s, kind="body"):
    return Paragraph(s, styles[kind])


def box(content, bg=PALE, pad=10):
    t = Table([[content]], colWidths=[172 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX", (0, 0), (-1, -1), 0.4, colors.HexColor("#C7D9DB")),
        ("LEFTPADDING", (0, 0), (-1, -1), pad),
        ("RIGHTPADDING", (0, 0), (-1, -1), pad),
        ("TOPPADDING", (0, 0), (-1, -1), pad),
        ("BOTTOMPADDING", (0, 0), (-1, -1), pad),
    ]))
    return t


SCENES = []


def scene(n, who, title, question, formula, steps, model, variation, defense, source):
    SCENES.append(dict(n=n, who=who, title=title, question=question,
                       formula=formula, steps=steps, model=model,
                       variation=variation, defense=defense, source=source))


scene(2, "JUAN CARLOS", "El terreno y sus límites",
      "¿Qué terreno estamos estudiando? Es una superficie sintética: x apunta al Este, y al Norte y z mide altura. Cada unidad horizontal y vertical es un metro.",
      "s=(x²+y²)/6400−1<br/>f(x,y)=18+6s²+0.012x−0.006y [m]<br/>D: x²+y²≤110²; área(D)=12100π≈38 013.272 m².",
      "El término s depende del radio. Cuando r=80 m, s=0 y se anula su aporte radial; los términos lineales inclinan el terreno y rompen la simetría. f es polinómica y se puede derivar en todo R². El disco D limita el lugar de estudio, no el dominio matemático de f.",
      "Señala los ejes y el borde de D. El paisaje exterior sirve como contexto visual; las decisiones y cifras se calculan con f dentro de D.",
      "Si cambias 6400, cambia el radio de la zona donde s=0. Si quitas los términos lineales, muchas curvas se vuelven circulares y cambian los puntos óptimos. No digas que f proviene de una medición marciana.",
      "«La fórmula define un terreno reproducible, en metros. D es la parte física estudiada; fuera de D la expresión aún existe, pero el proyecto no justifica construir allí». Óptica de defensa: el modelo es matemático, no un levantamiento real.", "Anexo A1; escena 2")

scene(3, "JUAN CARLOS", "Cómo leer el relieve",
      "Una curva de nivel reúne puntos de igual altura. Las trazas muestran cortes verticales, y tres evaluaciones comprueban numéricamente la gráfica.",
      "Curva de nivel: f(x,y)=c.<br/>y=0: z=18+6(x²/6400−1)²+0.012x.<br/>x=0: z=18+6(y²/6400−1)²−0.006y.",
      "Se usan seis cotas: 17, 18.5, 20, 21.5, 23 y 24 m. f(0,0)=24 m; f(40,−20)=21.4359375 m; f(B⁺)≈19.182581 m. Para una traza física, x o y queda entre −110 y 110 m. Curvas juntas indican cambio de altura más rápido en el plano.",
      "En el 3D localiza depresión, elevación y la dirección de inclinación. El término lineal hace que la misma distancia al centro no garantice idéntica cota.",
      "Si f fuese radial pura, los puntos del mismo radio tendrían la misma altura. Aquí B⁺ y B⁻ están en el mismo círculo, pero pueden tener distintas cotas y pendientes.",
      "«No identificamos el terreno por el color de la malla: sustituimos coordenadas en f y comprobamos las curvas y cortes». La construcción requiere más criterios que la cota.", "Anexo A1–A2; escena 3")

scene(4, "JUAN CARLOS", "Derivadas, plano y normal",
      "Las primeras derivadas dicen cuánto cambia la altura por metro en x o y; las segundas dicen cómo cambia esa pendiente. El plano tangente aproxima la superficie cerca de P=(40,−20).",
      "f<sub>x</sub>=(3x/800)s+0.012; f<sub>y</sub>=(3y/800)s−0.006.<br/>f<sub>xx</sub>=(3/800)s+3x²/2 560 000; f<sub>yy</sub>=(3/800)s+3y²/2 560 000;<br/>f<sub>xy</sub>=f<sub>yx</sub>=3xy/2 560 000.",
      "Primero s<sub>x</sub>=x/3200 y s<sub>y</sub>=y/3200; aplica la regla de la cadena a 6s². En P: f<sub>x</sub>=−0.091125, f<sub>y</sub>=0.0455625. El plano es z−21.4359375=−0.091125(x−40)+0.0455625(y+20). Un vector perpendicular es n=(0.091125,−0.0455625,1).",
      "El plano toca la superficie en P; los dos signos de la pendiente indican la orientación local. Las segundas derivadas son curvatura local de la gráfica, no resistencia del suelo.",
      "Si las segundas derivadas fueran cero en toda la zona, el plano reproduciría exactamente f. Aquí no: al alejarse de P aparece error de aproximación.",
      "«Derivé la función analítica, no la malla 3D. El plano usa las primeras derivadas y su normal se obtiene de f(x,y)−z=0». La normal no es el gradiente plano ∇f.", "Anexo A3–A4; escena 4")

scene(5, "JUAN CARLOS", "Linealización: cuánto se equivoca",
      "El plano anterior predice la altura en H=(44,−17), a 4 m en x y 3 m en y desde P. El error mide si la aproximación local sigue siendo útil.",
      "L(H)=21.4359375−0.091125(4)+0.0455625(3)=21.208125 m.<br/>f(H)=21.183314209 m.<br/>|L−f|=0.024810791 m=2.481 cm; error relativo=0.117124 %.",
      "Calcula L sustituyendo el desplazamiento desde P; calcula f sustituyendo H en la expresión original. Después resta valores absolutos y divide por |f(H)| para el porcentaje. La comparación tiene sentido porque ambas alturas se refieren al mismo datum.",
      "Muestra en la escena el punto real y el plano. La representación aumenta el error visual ×80; la cifra válida sigue siendo 2.481 cm.",
      "Si H se acerca a P, el error tiende a cero más rápido que la distancia. Si H se aleja, no hay una garantía general de precisión; hay que volver a calcular con f.",
      "«El 0.117 % no demuestra que el plano sirva en todo D; es la precisión en este H concreto». El factor visual de ampliación no cambia el terreno.", "Anexo A4; escena 5")

scene(6, "JUAN CARLOS", "Gradiente: dónde sube más",
      "El gradiente es el vector de ascenso más rápido; su norma es la mayor variación de altura por metro horizontal. La dirección opuesta desciende más rápido.",
      "∇f=(f<sub>x</sub>,f<sub>y</sub>).<br/>∇f(P)=(−0.091125,0.0455625); |∇f(P)|≈0.101881=10.1881 %.<br/>∇f(Q)=(0.09036914,−0.06085840); |∇f(Q)|≈0.108951=10.8951 %.",
      "Evalúa f<sub>x</sub> y f<sub>y</sub> en cada punto y aplica Pitágoras. La dirección de ascenso en P es ∇f/|∇f|≈(−0.894427,0.447214); descenso = su negativo. En Q la dirección cambia, por eso no se puede transferir la pendiente de P.",
      "Relaciona las flechas de ascenso/descenso con curvas de nivel: el gradiente es perpendicular a una curva regular.",
      "Si la norma fuera cero, no habría primera dirección de ascenso local; haría falta mirar el Hessiano. Una pendiente de 10 % aquí significa unos 10 cm verticales por metro horizontal, no 10°.",
      "«La magnitud máxima depende del punto y del rumbo. En Q es mayor que en P». Evita llamar segura a una zona solo por una derivada local.", "Anexo A5–A6; escena 6")

scene(7, "JUAN CARLOS", "Derivada en el rumbo elegido",
      "Una pendiente máxima no responde qué ocurre al avanzar en una dirección concreta. Para eso sirve la derivada direccional, usando un vector unitario.",
      "D<sub>u</sub>f=∇f·u, con |u|=1.<br/>En P, u=(3/5,4/5): D<sub>u</sub>f=−0.018225 m/m.<br/>En Q, u=(1,−2)/√5: D<sub>u</sub>f≈0.094847715 m/m.",
      "Verifica |u|=1 antes del producto. En P: −0.091125(3/5)+0.0455625(4/5)=−0.018225: baja 1.8225 cm por metro. En Q el signo positivo indica ascenso de 9.485 cm/m. Siempre |D<sub>u</sub>f|≤|∇f|.",
      "Gira la dirección en la escena: el punto puede ser el mismo y cambiar el signo de la pendiente. La flecha tangente a una curva de nivel da producto cero.",
      "Si no normalizas u, duplicar el vector duplicaría el número aunque el rumbo no cambie. Si inviertes u, cambia el signo; si u es perpendicular al gradiente, la cota no cambia a primer orden.",
      "«El gradiente da el máximo posible; el producto punto da el cambio real en el rumbo consultado». Esta diferencia importa para ruta, drenaje o acceso.", "Anexo A5–A6; escena 7")

scene(8, "JUAN CARLOS", "Regla de la cadena sobre el círculo",
      "La ruta plana depende del parámetro angular t. Para saber si el rover sube o baja al recorrerla, derivamos la altura compuesta f(x(t),y(t)).",
      "x=72 cos t; y=72 sen t; s=−0.19.<br/>dz/dt=f<sub>x</sub>x′+f<sub>y</sub>y′=−0.864 sen t−0.432 cos t.<br/>α=atan(1/2); t∈[−α,π−α].",
      "x′=−72 sen t e y′=72 cos t. Al sustituir, los términos radiales desaparecen porque xx′+yy′=0: el radio es fijo. En el interior del intervalo dz/dt&lt;0; en sus extremos es cero. Por eso la ruta principal desciende desde la llegada.",
      "En el modelo sigue la altura de la línea del rover; los puntos de derivada cero no indican que el vehículo se detenga.",
      "Si la ruta cambiara de radio, xx′+yy′ ya no sería cero y aparecería el aporte radial. Si t se convierte a tiempo τ, dz/dτ=(dz/dt)(dt/dτ).",
      "«t está en radianes, no en segundos: dz/dt es cambio de altura por ángulo». La rapidez real exige una ley horaria adicional.", "Anexo A7; escena 8")

scene(9, "DAVIS", "Extremos libres y Hessiano",
      "Un punto crítico libre cumple ∇f=0. La prueba Hessiana clasifica la forma local: depresión, cima o silla. No decide automáticamente dónde construir.",
      "q=3s/800; f<sub>x</sub>=qx+0.012; f<sub>y</sub>=qy−0.006.<br/>∇f=0 ⇒ y=−x/2 ⇒ (1.25x³/6400)−x+3.2=0.<br/>Δ=f<sub>xx</sub>f<sub>yy</sub>−f<sub>xy</sub>².",
      "Divide las dos ecuaciones de gradiente; q no puede ser cero en una solución. Sustituye y=−x/2 y encuentra tres raíces (Newton o intervalos). C₁≈(−73.104,36.552,16.915): Δ&gt;0 y f<sub>xx</sub>&gt;0, mínimo. C₂≈(3.206,−1.603,24.024): Δ&gt;0 y f<sub>xx</sub>&lt;0, máximo. C₃≈(69.897,−34.949,19.061): Δ&lt;0, silla.",
      "Señala los tres puntos sobre el mismo terreno: el color y la forma dan intuición, el signo del Hessiano da la clasificación matemática.",
      "Si Δ=0, esta prueba no decide. Si se impone una restricción (por ejemplo r=72), los puntos libres ya no son los únicos candidatos; hay que resolver otro problema.",
      "«Un mínimo local de cota no es sinónimo de mejor plataforma». La selección de llegada minimiza pendiente sobre una circunferencia; eso se estudia en la escena 10.", "Anexo A8; escena 9")

scene(10, "DAVIS", "Lagrange: elegir la llegada",
      "La pregunta concreta es: en el círculo comparativo r=72 m, ¿dónde es menor la máxima pendiente local? Se minimiza el cuadrado de la norma para evitar una raíz sin cambiar el mínimo.",
      "F=f<sub>x</sub>²+f<sub>y</sub>²; g=x²+y²=5184.<br/>∇F=2H<sub>f</sub>∇f=λ∇g.<br/>B⁺=72(2/√5,−1/√5); B⁻=−B⁺.",
      "Deriva F antes de imponer g. Elimina λ con xF<sub>y</sub>−yF<sub>x</sub>=0; sobre el círculo resulta y=−x/2. Intersecta esa recta con r=72. Las pendientes son |∇f(B⁺)|=3.788359 % y |∇f(B⁻)|=6.471641 %. B⁺ mejora 41.46 % respecto de B⁻. La continuidad de F sobre el círculo compacto y esos únicos candidatos justifican el mínimo global en esa restricción.",
      "Enfoca B⁺ como llegada. El núcleo permanece cerca de (−8,8) por organización de las alas; no se trasladó al mínimo de pendiente del círculo.",
      "Si cambia el radio o la función de costo, cambian candidatos y decisión. El círculo no es una carretera construida ni un perímetro seguro; B⁺ no prueba menor excavación o estabilidad.",
      "«Optimizamos una métrica declarada, en una frontera declarada. La conclusión solo vale para esa pregunta». Si piden la derivada, escribe ∇F=2H<sub>f</sub>∇f.", "Anexo A9–A10; escena 10")

scene(11, "HAROLDO", "La trayectoria realmente es 3D",
      "La ruta incluye x, y y la altura calculada: el rover recorre la superficie del mismo terreno. Sus derivadas respecto del ángulo describen dirección y cambio de dirección.",
      "r(t)=(72cos t,72sen t,f(72cos t,72sen t)).<br/>r′=(−72sen t,72cos t,−0.864sen t−0.432cos t).<br/>r″=(−72cos t,−72sen t,−0.864cos t+0.432sen t).<br/>T=r′/|r′|.",
      "Deriva componente por componente, usando la regla de la cadena en z. |r′|=√(5184+z′²)≥72, así que la curva es regular y T siempre existe. El vector T representa solo orientación, porque tiene norma uno.",
      "La línea se pega al terreno porque su coordenada vertical es exactamente f(x(t),y(t)); las flechas pueden mostrar r′, r″ y T.",
      "Si t=t(τ) representa el tiempo, la velocidad física es r′(t)ṫ y la aceleración es r″(t)ṫ²+r′(t)ẗ. Cambiar rapidez de conducción cambia esas magnitudes, no la forma geométrica de r.",
      "«r′ y r″ están derivados por radianes. No afirmamos m/s ni m/s² sin parametrizar el tiempo». La ruta circular matemática no incluye el ramal físico al taller.", "Anexo A11; escena 11")

scene(12, "HAROLDO", "Longitud y tres hitos de la ruta",
      "Una distancia horizontal de medio círculo no incluye los cambios verticales. La longitud de arco integra la norma de la derivada espacial.",
      "L=∫<sub>−α</sub><sup>π−α</sup>|r′(t)|dt<br/>=∫√[5184+(−0.864sen t−0.432cos t)²]dt<br/>≈226.204849 m; α=atan(1/2).",
      "La parte horizontal tiene rapidez 72 m/rad y mide 72π≈226.195 m. La elevación añade una pequeña distancia. Una cuadratura Gauss–Legendre y Simpson verifican la cifra. También 72π≤L≤π√(5184+0.864²+0.432²), control útil contra errores de unidad.",
      "Señala inicio en B⁺, punto de control C* y final. El tramo visible entre estos hitos es la curva matemática que se integró.",
      "Si el desnivel fuera cero, L=72π exactamente. Si agregan el ramal hacia el taller, hay que calcularlo aparte antes de hablar de distancia total recorrida.",
      "«La integral suma distancias diferenciales ds=|r′|dt, no alturas ni tiempo». L es longitud de la ruta modelada.", "Anexo A11–A12; escena 12")

scene(13, "HAROLDO", "Curvatura: cuánto gira",
      "La curvatura cuantifica el cambio de dirección por unidad de arco. En C* la pendiente longitudinal alcanza su descenso más fuerte; eso no significa que allí la curva sea singular o tenga curvatura máxima.",
      "κ=|r′×r″|/|r′|³.<br/>t*=π/2−atan(1/2)≈1.107149 rad.<br/>κ(C*)≈0.013886389 m⁻¹; radio local 1/κ≈72.01296 m.",
      "Primero evalúa r′ y r″; su producto cruz tiene magnitud cercana a la del giro de un círculo de radio 72. Divide por |r′|³. En t*, z′=−√(0.864²+0.432²) y z″=0: la pendiente longitudinal tiene un mínimo, por eso C* es un hito de descenso.",
      "Señala el marcador C* y compara la curvatura con el giro circular. La pequeña diferencia se debe al componente vertical.",
      "Con límite lateral supuesto a<sub>lat</sub>=0.55 m/s², v≤√(a<sub>lat</sub>/κ)≈6.29 m/s. Sin tracción, obstáculos y tiempo no es una velocidad autorizada de operación.",
      "«Curvatura es geometría de la ruta, no pendiente ni aceleración por sí sola». Una velocidad límite exige el supuesto adicional de aceleración lateral.", "Anexo A12; escena 13")

scene(14, "HAROLDO", "La región R y sus límites",
      "R es un sector anular de 45° entre 60 y 72 m de radio. La descripción polar hace que sus límites sean constantes y facilita tanto el área como la integral de altura.",
      "R={(r,θ):60≤r≤72; −π/4≤θ≤0}.<br/>x=r cosθ; y=r senθ.<br/>A<sub>proy</sub>=∫<sub>−π/4</sub><sup>0</sup>∫<sub>60</sub><sup>72</sup>r dr dθ=198π≈622.035345 m².",
      "Dibuja dos círculos y dos rayos. En cada radio, θ recorre −45° a 0°. El factor r aparece porque una celda de ángulo dθ se ensancha conforme aumenta el radio. Integra r: [r²/2] entre 60 y 72, luego multiplica por π/4.",
      "En la escena identifica el sector R; no lo confundas con el disco D de radio 110 ni con el círculo r=72 usado por Lagrange.",
      "Si se cambia el ancho angular, el área escala con ese ángulo. Si se usa dA=dr dθ sin r, el resultado tiene unidades erróneas y subestima el sector exterior.",
      "«R es una región plana de integración; su área proyectada todavía no es el área de suelo inclinado». Son superficies distintas de la escena 16.", "Anexo A13; escena 14")

scene(15, "HAROLDO", "Integral doble: volumen y promedio",
      "Al integrar la elevación f sobre R se obtiene el volumen bajo la gráfica hasta el datum z=0. Dividir por el área horizontal entrega la altura media de esa región.",
      "V<sub>R</sub>=∫<sub>−π/4</sub><sup>0</sup>∫<sub>60</sub><sup>72</sup>f(r cosθ,r senθ)r dr dθ<br/>≈12 119.961705 m³.<br/>f<sub>media</sub>=V<sub>R</sub>/A<sub>proy</sub>≈19.484362 m.",
      "Sustituye f=24−12r²/6400+6r⁴/6400²+r(0.012cosθ−0.006senθ). Multiplica por r antes de integrar: 24r−12r³/6400+6r⁵/6400²+(0.012cosθ−0.006senθ)r². La primitiva radial es 12r²−3r⁴/6400+r⁶/6400²+(0.004cosθ−0.002senθ)r³. Evalúa 60→72 y luego θ.",
      "El volumen dibujado se extiende desde z=0 hasta el terreno; el promedio equivale a una columna uniforme de igual volumen sobre R.",
      "Si cambias el datum vertical, V<sub>R</sub> cambia en A·Δz, pero el área y la forma del terreno no. No llames a V<sub>R</sub> excavación, agua almacenada ni material de construcción.",
      "«La unidad es m³ porque f aporta metros y dA m². La altura media en metros resulta al dividir por A». El dato responde una pregunta matemática precisa.", "Anexo A14; escena 15")

scene(16, "HAROLDO", "Área real y jacobiano polar",
      "El suelo inclinado tiene algo más de área que su proyección horizontal. El cambio polar introduce r; la parametrización de la superficie introduce √(1+f<sub>x</sub>²+f<sub>y</sub>²).",
      "|det ∂(x,y)/∂(r,θ)|=r.<br/>S(x,y)=(x,y,f); |S<sub>x</sub>×S<sub>y</sub>|=√(1+f<sub>x</sub>²+f<sub>y</sub>²).<br/>A<sub>real</sub>=∬<sub>R</sub>√(1+f<sub>x</sub>²+f<sub>y</sub>²)dA≈623.364857 m².",
      "La matriz polar tiene filas (cosθ,−r senθ) y (senθ,r cosθ); su determinante es r. Los vectores tangentes de S son (1,0,f<sub>x</sub>) y (0,1,f<sub>y</sub>), cuyo producto cruz da (−f<sub>x</sub>,−f<sub>y</sub>,1). Se integra numéricamente sobre los mismos límites de R.",
      "A<sub>real</sub>−A<sub>proy</sub>≈1.329512 m², o 0.213736 %. La visualización puede separar ambas lecturas: suelo sobre la ladera frente a su sombra plana.",
      "Con pendiente cero, el factor radical vale 1 y ambas áreas coinciden. Esta área de suelo no es el área nominal de los 20 paneles ni produce potencia por sí sola.",
      "«Hay dos factores geométricos diferentes: r cambia coordenadas en el plano; el radical corrige la inclinación de la superficie». Ninguno puede omitirse.", "Anexo A13, A15; escena 16")

scene(17, "DAVIS", "Definir el depósito E",
      "E es un semielipsoide ideal, con base plana en w=0. Se calcula en coordenadas locales (u,v,w); luego se traslada a su posición en el campus.",
      "E: u²/18²+v²/14²+w²/8²≤1; w≥0.<br/>−18≤u≤18;<br/>−14√(1−u²/324)≤v≤14√(1−u²/324);<br/>0≤w≤8√(1−u²/324−v²/196).",
      "Despeja primero w de la desigualdad para el orden dw dv du. Para que la raíz sea real, v debe estar dentro de la elipse correspondiente; después u recorre todo su diámetro. La planta mide 36×28 m y la altura máxima es 8 m.",
      "En el mundo: (x,y,z)=(u,−94+v,23.363122+w) m. Si la escena exagera la altura ×9 para verla, la integral sigue usando 8 m, no 72 m.",
      "Una traslación no cambia volumen, masa ni centro local. Si se cambia un semieje sí cambian los resultados: V es proporcional al producto abc.",
      "«Los límites cartesianos describen exactamente el mismo sólido que veremos en esféricas escaladas». El depósito es una idealización geométrica, no un tanque certificado.", "Anexo A16; escena 17")

scene(18, "DAVIS", "Cambio de variables y jacobiano",
      "La sustitución transforma el semielipsoide en media bola unitaria. Los límites quedan constantes, a cambio de multiplicar por el determinante jacobiano.",
      "u=18ρ senφ cosθ; v=14ρ senφ senθ; w=8ρ cosφ.<br/>0≤ρ≤1; 0≤φ≤π/2; 0≤θ≤2π.<br/>dV=|J|dρ dφ dθ=2016ρ²senφ dρ dφ dθ.",
      "Sustituye u,v,w en u²/324+v²/196+w²/64: resulta ρ²(sen²φ cos²θ+sen²φ sen²θ+cos²φ)=ρ²≤1. La condición w≥0 da cosφ≥0. Factorizar 18,14,8 de las filas de la matriz derivada multiplica el jacobiano esférico usual ρ²senφ por 18·14·8=2016.",
      "Muestra el mismo E en dos descripciones: anidado en cartesiano y con límites rectangulares en (ρ,φ,θ). El factor de escala visual no pertenece a |J|.",
      "Si se omite ρ²senφ, los elementos cercanos al centro y al ecuador recibirían pesos falsos. Si cambian los semiejes, |J| cambia por abc.",
      "«No basta sustituir la ecuación del borde; también se transforma dV». El jacobiano representa cuánto volumen ocupa una celda de los nuevos parámetros.", "Anexo A16–A17; escena 18")

scene(19, "DAVIS", "Integral triple completa",
      "La consigna pide evaluar el volumen paso a paso. Aquí la integral de 1 sobre E produce la capacidad geométrica ideal.",
      "V=∫<sub>0</sub><sup>2π</sup>∫<sub>0</sub><sup>π/2</sup>∫<sub>0</sub><sup>1</sup>2016ρ²senφ dρ dφ dθ<br/>=2016·(1/3)·1·(2π)=1344π≈4 222.300526 m³.",
      "Interior: ∫ρ² dρ=[ρ³/3]₀¹=1/3. Medio: ∫senφ dφ=[−cosφ]₀^(π/2)=1. Exterior: ∫dθ=2π. Comprobación independiente: cada corte horizontal tiene A(w)=π·18·14(1−w²/64); ∫₀⁸A(w)dw=1344π. Por simetría, el centroide geométrico está a w=3 m.",
      "El volumen corresponde a los semiejes reales de 18,14,8 m. La apariencia ampliada del depósito no modifica esta cifra.",
      "Si duplicas solo a, el volumen se duplica. Si lo llenas parcialmente, el volumen de contenido exige otro límite superior en w; 1344π no es el inventario actual.",
      "«Dimos dos caminos que llegan al mismo número: cambio esférico escalado y cortes cartesianos». Las unidades del 2016 son m³ por celda de parámetros adimensionales.", "Anexo A18; escena 19")

scene(20, "DAVIS", "Densidad variable y masa",
      "La masa no es simplemente 920V porque la densidad baja con la altura y sube ligeramente hacia +u. Antes de integrar hay que comprobar que la densidad nunca sea negativa.",
      "δ=920[1+0.04u/18−0.06w/8] kg/m³.<br/>M=∭<sub>E</sub>δ dV=920[V+(0.04/18)∭u dV−(0.06/8)∭w dV].<br/>∭u dV=0; ∭w dV=3V ⇒ M=899.3V≈3 797 114.863 kg.",
      "El término u se anula por simetría: cada +u tiene un −u con igual volumen. El momento geométrico ∭w dV=3V se obtiene con el mismo cambio de variables. Para positividad, el mínimo del término lineal sobre la media elipsoide es δ<sub>min</sub>=920−√(36.8²+55.2²)≈853.658 kg/m³&gt;0.",
      "La distribución puede representarse por color, pero el color no mide densidad real. 899.3 kg/m³ es la densidad media ideal M/V.",
      "Si el término −0.06w/8 se anula, M=920V porque el sesgo horizontal se cancela. Si se incrementa demasiado su magnitud, hay que volver a probar positividad; entonces el modelo puede dejar de ser físico.",
      "«La densidad es un supuesto didáctico de composición/porosidad, no una muestra de agua pura». Masa y volumen no son sinónimos.", "Anexo A19; escena 20")

scene(21, "DAVIS", "Tres momentos y centro de masa",
      "Los primeros momentos ponderan la masa por cada coordenada. Al dividirlos por M obtenemos el centro de masa, distinto del centroide geométrico (0,0,3).",
      "M<sub>vw</sub>=∭uδ dV≈559 370.374 kg·m;<br/>M<sub>uw</sub>=∭vδ dV=0;<br/>M<sub>uv</sub>=∭wδ dV≈11 280 635.870 kg·m.<br/>(ū,v̄,w̄)=(M<sub>vw</sub>,M<sub>uw</sub>,M<sub>uv</sub>)/M≈(0.147315,0,2.970844) m.",
      "Usa ∭u²dV=Va²/5 y ∭w²dV=Vc²/5; los integrandos impares en u o v se cancelan. Así M<sub>vw</sub>=920(0.04/a)(Va²/5). M<sub>uv</sub>=920[3V−(0.06/c)(Vc²/5)]. Traslada el centro a (0.147315,−94,26.333966) m en el mundo.",
      "Señala el punto de centro de masa ligeramente hacia +u y algo bajo los 3 m del centroide. El sesgo sigue exactamente los signos de la densidad.",
      "Si la densidad fuera constante, el centro volvería a (0,0,3). Cambiar la posición global traslada el centro mundial, pero no los momentos locales calculados respecto al origen del tanque.",
      "«Son primeros momentos, no momentos de inercia. Que la proyección caiga dentro de la base no certifica muros, cimentación o estabilidad». La interpretación es geométrica y limitada.", "Anexo A20–A21; escena 21")


# Se lee antes de la fórmula. Da a cada integrante una imagen mental concreta
# y traduce el tecnicismo que encontrará en esa escena.
SIMPLE = {
    2: ("Imaginen que el terreno es una maqueta. Le damos dos números a una receta: cuánto caminamos al Este (x) y cuánto al Norte (y). La receta f devuelve la altura z de ese lugar.",
        "<b>Función</b> = receta que entrega una altura. <b>Dominio D</b> = el círculo completo de terreno que decidimos estudiar."),
    3: ("Si subiera el agua hasta una altura fija, la marca que dejaría en la montaña sería una curva de nivel. Una traza es como cortar la maqueta con un cuchillo vertical para ver su perfil de lado.",
        "<b>Curva de nivel</b> = lugares con la misma altura. <b>Traza</b> = corte de lado. <b>Cota</b> = altura de un punto."),
    4: ("Pongan una tabla recta apoyada sobre un puntito de la loma. La tabla es el plano tangente: se parece al suelo justo allí. Las derivadas nos dicen cuánto se inclina la tabla al caminar al Este y al Norte.",
        "<b>Derivada</b> = cambio de altura al dar un paso pequeño. <b>Normal</b> = flecha que sale perpendicular a la tabla."),
    5: ("Una tabla recta puede copiar bien una loma cerca del punto donde la apoyamos, pero no a gran distancia. En H, la tabla anuncia una altura y el terreno real otra: la diferencia es de apenas 2.48 cm.",
        "<b>Linealizar</b> = usar esa tabla como aproximación. <b>Error</b> = distancia entre la predicción y la altura calculada con la receta original."),
    6: ("Si dejan rodar una pelota, la flecha del gradiente apunta justo al lado contrario: el camino que más sube desde ese punto. El tamaño de la flecha cuenta qué tan empinada es esa subida.",
        "<b>Gradiente</b> = flecha de subida más fuerte. <b>Norma</b> = tamaño de esa flecha. Cambia según el lugar."),
    7: ("Aunque estén en la misma loma, caminar hacia un lado puede subir y caminar hacia otro puede bajar. Esta fórmula responde: «si camino exactamente en esta dirección, ¿qué pasa con mi altura?».",
        "<b>Direccional</b> = pendiente en el rumbo escogido. <b>Vector unitario</b> = flecha de longitud 1 que solo señala el rumbo."),
    8: ("Dibujen un camino curvo en la loma. La regla de la cadena junta dos movimientos: cuánto avanzamos al Este y al Norte, y cómo cada movimiento cambia la altura.",
        "<b>Regla de la cadena</b> = combinar cambios. <b>t</b> aquí es el ángulo que ubica al rover en el círculo; todavía no es un reloj."),
    9: ("Hay lugares donde el suelo parece plano justo bajo los pies. Algunos son fondo de un valle, otros cima y otros como una silla de montar: sube hacia dos lados y baja hacia otros dos.",
        "<b>Punto crítico</b> = primera pendiente cero. <b>Hessiano</b> = segunda revisión que distingue valle, cima y silla."),
    10: ("Imaginen que solo podemos escoger una llegada sobre una línea circular dibujada en el mapa. Lagrange nos ayuda a buscar la parte menos inclinada de esa línea; después comparamos las dos opciones finales.",
         "<b>Restricción</b> = regla «solo sobre este círculo». <b>Optimizar</b> = elegir el menor valor de la pendiente, según esa regla."),
    11: ("Pongan un hilo sobre el suelo siguiendo el camino del rover. El hilo no flota: cada punto tiene la altura de la loma debajo. Las derivadas indican hacia dónde va y cómo va cambiando esa dirección.",
         "<b>Ruta 3D</b> = coordenadas Este, Norte y altura. <b>Tangente</b> = flecha que sigue el camino en un instante."),
    12: ("Si miran el camino en un mapa plano, parece un medio círculo. Si miden con un hilo apoyado en el relieve, sale un poquito más largo. La integral suma todos esos pedacitos de hilo.",
         "<b>Longitud de arco</b> = distancia recorrida sobre la curva. <b>Integral</b> = suma continua de pedacitos muy pequeños."),
    13: ("La curvatura dice cuánto hay que girar el volante. Una curva cerrada exige más giro; una casi recta, menos. En C* también miramos dónde la bajada del camino es más fuerte: son preguntas distintas.",
         "<b>Curvatura</b> = intensidad del giro. <b>Radio local</b> = tamaño del círculo que se parece a la curva cerca de un punto."),
    14: ("R se parece a una rebanada de dona: empieza a 60 m del centro, termina a 72 m y ocupa un ángulo de 45°. Para medirla, avanzamos desde el radio interior al exterior y luego barremos el ángulo.",
         "<b>Región R</b> = esa rebanada plana. <b>Polar</b> = ubicar puntos con distancia al centro y ángulo."),
    15: ("Imaginen que R se llena de columnas delgaditas que van desde el piso z=0 hasta el terreno. La integral doble suma el volumen de todas; al repartirlo de manera pareja, obtenemos una altura promedio.",
         "<b>Integral doble</b> = suma sobre una zona plana. <b>Valor medio</b> = altura uniforme que daría el mismo volumen."),
    16: ("Una sábana sobre una loma tiene más tela que su sombra plana en el suelo. Aquí medimos la «tela» real de R y la comparamos con su «sombra». El jacobiano corrige el tamaño de las celdas al usar coordenadas polares.",
         "<b>Área real</b> = suelo inclinado. <b>Proyección</b> = sombra plana. <b>Jacobiano</b> = factor para que cada pedacito conserve el área correcta."),
    17: ("El depósito tiene la forma de media sandía colocada sobre su cara cortada y plana. Se extiende 18 m a un lado y 18 al otro, 14 m al Norte y 14 al Sur, y sube como máximo 8 m.",
         "A esa media sandía estirada los matemáticos la llaman <b>semielipsoide</b>. <b>E</b> es todo el espacio dentro de ella, no solo la cáscara."),
    18: ("Para medir la media sandía, primero la imaginamos como media pelota sencilla y luego la estiramos en tres direcciones: 18, 14 y 8. El jacobiano dice cuánto se agranda cada pedacito al estirarlo.",
         "<b>Cambio de variables</b> = describir el mismo objeto con otras coordenadas. <b>Jacobiano</b> = multiplicador que evita perder o inventar volumen."),
    19: ("Ahora sumamos muchísimos cubitos diminutos hasta llenar la media sandía. Eso hace la integral triple. El resultado es cuánto cabría si el recipiente ideal estuviera completamente lleno.",
         "<b>Integral triple</b> = suma en un cuerpo con largo, ancho y alto. <b>Volumen</b> = espacio interior, medido en m³."),
    20: ("Piensen en una esponja gigante: algunas partes pesan un poco más que otras aunque ocupen el mismo espacio. La densidad nos dice cuántos kilogramos hay en cada cubito; al sumarlos sale la masa total.",
         "<b>Densidad</b> = masa por m³. <b>Masa</b> = suma de todos los cubitos, cada uno con la densidad que le corresponde."),
    21: ("¿Dónde pondrían un dedo para equilibrar el contenido del depósito? Ese punto es el centro de masa. Como el material supuesto pesa un poco más hacia un lado y menos arriba, el equilibrio se corre un poquito.",
         "<b>Momento</b> = peso multiplicado por distancia. <b>Centro de masa</b> = punto de equilibrio del contenido supuesto."),
}

READ_FORMULA = {
    2: "Los primeros números crean la forma básica de la loma. Al final, +0.012x y −0.006y la inclinan suavemente. El signo ≤ en D dice «adentro del plato de radio 110». Todo termina en metros de altura.",
    3: "f(x,y)=c significa «busca todos los lugares con altura c». En los otros dos renglones fijamos una coordenada en cero, como si pasáramos el cuchillo por el centro de la maqueta.",
    4: "f<sub>x</sub> y f<sub>y</sub> son las inclinaciones de la tabla hacia dos direcciones. Las letras con dos x o dos y dicen cómo va cambiando esa inclinación alrededor del punto.",
    5: "L(H) es la altura que anuncia la tabla recta; f(H), la de la loma. Restarlas da centímetros de diferencia. Dividir esa diferencia por f(H) y multiplicar por 100 da el porcentaje.",
    6: "Los dos números entre paréntesis forman la flecha de subida. La barra |∇f| mide su tamaño: 0.101881 equivale a unos 10.19 cm de subida máxima por cada metro horizontal.",
    7: "El punto ∇f·u combina la pendiente del lugar con la dirección elegida. Resultado negativo: baja. Positivo: sube. Si u apunta justo al otro lado, el resultado cambia de signo.",
    8: "La primera línea ubica al rover en el círculo. La segunda suma cuánto cambia la altura por moverse en x y cuánto por moverse en y. El resultado negativo en medio de la ruta indica bajada.",
    9: "Igualar a cero las dos primeras pendientes busca lugares momentáneamente planos. La última línea, Δ, revisa cómo se curva el suelo allí y nos dice si vemos valle, cima o silla.",
    10: "F es la pendiente elevada al cuadrado: menor F significa terreno menos inclinado. g obliga a quedarse a 72 m del centro. B⁺ y B⁻ son los dos lugares finales que comparamos.",
    11: "r(t) da la posición completa del rover. r′ dice cómo cambia esa posición; r″, cómo cambia ese primer cambio. T conserva solo la dirección del movimiento sobre el camino.",
    12: "La raíz mide un pedacito del camino incluyendo subida o bajada. El signo ∫ suma todos los pedacitos desde el inicio hasta el final. El resultado es una distancia en metros.",
    13: "κ es grande si el camino dobla mucho. El número 1/κ expresa el radio del círculo parecido a esa pequeña parte del camino: aquí cerca de 72 m.",
    14: "r dice qué tan lejos estamos del centro y θ hacia dónde giramos. Los límites enmarcan la rebanada. El r que aparece dentro de la integral corrige que las celdas externas son más anchas.",
    15: "f da altura y r dr dθ da una minúscula pieza de suelo: al multiplicarlas obtenemos una pequeña columna. Sumarlas entrega m³; dividir por toda el área deja una altura media en m.",
    16: "El primer r corrige la medición de la rebanada en polares. La raíz √(1+f<sub>x</sub>²+f<sub>y</sub>²) añade la inclinación del suelo. Son dos correcciones distintas.",
    17: "La suma de tres fracciones ≤1 significa «dentro de la media sandía». w≥0 elimina la mitad de abajo. Las tres líneas siguientes dicen desde dónde hasta dónde podemos movernos en cada dirección sin salirnos.",
    18: "ρ avanza del centro al borde, φ inclina el recorrido hacia arriba y θ gira alrededor. El 2016 viene de estirar la media pelota por 18·14·8; ρ²senφ ajusta los pedacitos dentro de ella.",
    19: "El 2016 ajusta el tamaño de cada cubito. El 1/3 aparece al sumar del centro al borde, el 1 al barrer de abajo a arriba y 2π al dar una vuelta completa. Así sale 1344π m³.",
    20: "920 es la densidad de referencia; +0.04u/18 la aumenta un poco hacia un lado y −0.06w/8 la reduce arriba. La integral suma la masa de cada cubito: densidad por volumen pequeño.",
    21: "Cada momento suma «masa del cubito por su distancia en una dirección». Al dividir los tres resultados entre la masa total encontramos dónde se equilibraría todo el contenido.",
}


def draw_page(canvas, doc):
    canvas.saveState()
    w, h = A4
    canvas.setFillColor(NAVY)
    canvas.rect(0, h-8*mm, w, 8*mm, stroke=0, fill=1)
    canvas.setFont("Arial", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(19*mm, 12*mm, "EVA03  ·  Guía de estudio y defensa  ·  15 oct 2026")
    canvas.drawRightString(w-19*mm, 12*mm, f"{doc.page}")
    canvas.restoreState()


doc = BaseDocTemplate(str(OUT), pagesize=A4, leftMargin=19*mm, rightMargin=19*mm,
                      topMargin=19*mm, bottomMargin=19*mm,
                      title="EVA03 - Guia de estudio y defensa para tres integrantes",
                      author="Equipo EVA03")
frame = Frame(19*mm, 20*mm, 172*mm, 258*mm, leftPadding=0, rightPadding=0,
              topPadding=0, bottomPadding=0)
doc.addPageTemplates(PageTemplate(id="all", frames=frame, onPage=draw_page))

story = []
story += [Spacer(1, 31*mm), P("MATEMÁTICA IV  /  EVA03", "kicker"),
          P("Guía para entender<br/>y defender el proyecto", "cover"),
          P("Explicado desde cero: primero la idea sencilla, después la fórmula y cómo defenderla.", "cover_sub"),
          HRFlowable(width="100%", thickness=2, color=TEAL), Spacer(1, 11*mm),
          P("Tres partes para ensayar", "h1")]

intro_rows = [
    [P("1  Juan Carlos Boteo", "callout"), P("La maqueta del terreno, sus líneas de altura y un ejemplo sencillo de predicción. Escenas 2, 3 y 5.", "small")],
    [P("2  Haroldo Rodriguez", "callout"), P("El camino visible del rover, su distancia y la forma de la rebanada R. Escenas 11, 12 y 14.", "small")],
    [P("3  Davis Javier Rivera Aroche", "callout"), P("Las otras 14 escenas: derivadas, pendientes, optimización, curvatura, integrales dobles y depósito. Explica las cuentas difíciles.", "small")],
]
t = Table(intro_rows, colWidths=[57*mm, 115*mm], hAlign="LEFT")
t.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"), ("BACKGROUND",(0,0),(-1,-1),LIGHT),
                       ("LINEBELOW",(0,0),(-1,-2),0.4,colors.HexColor("#D6E2E5")),
                       ("LEFTPADDING",(0,0),(-1,-1),8), ("RIGHTPADDING",(0,0),(-1,-1),8),
                       ("TOPPADDING",(0,0),(-1,-1),8), ("BOTTOMPADDING",(0,0),(-1,-1),7)]))
story += [t, Spacer(1, 11*mm),
          P("Juan Carlos abre la escena 1 y los tres cierran la 22. Este reparto oral propuesto deja a Juan Carlos y Haroldo las ideas más fáciles; Davis asume las demostraciones. En las escenas 5, 11, 12 y 14, Davis puede tomar la cuenta si el profesor pide desarrollarla. El reparto no atribuye quién hizo históricamente cada parte. Faltan carnés, sección y contribuciones reales.", "small"),
          P("Fuente de las cifras: Anexo Matemático EVA03, apartados A1–A28. Las consignas proceden del PDF oficial del proyecto. Esta guía explica y prepara la defensa; el anexo conserva la demostración completa y reproducible.", "tiny"), PageBreak()]

story += [P("ANTES DE DIVIDIRSE", "kicker"), P("La historia completa en seis pasos", "h1"),
          P("Imaginen que construimos una maqueta sobre una mesa. La fórmula dibuja la altura del suelo en cada lugar. Después usamos esa misma maqueta para escoger una llegada, marcar un camino, medir una zona y calcular un depósito. El 3D enseña dónde pasa cada cosa; las cuentas explican por qué.")]
chain = [
    ("1  Terreno", "f(x,y), D, curvas, cortes y cotas."),
    ("2  Cambio local", "Derivadas, plano, gradientes y regla de la cadena."),
    ("3  Decisión", "Críticos libres y mínima pendiente sobre r=72."),
    ("4  Movimiento", "Ruta espacial r(t), longitud y curvatura."),
    ("5  Región", "Sector R, integral doble, promedio y área de suelo."),
    ("6  Sólido", "Depósito E, integral triple, masa y centro."),
]
for a,b in chain:
    story += [box([P(a, "callout"), P(b, "small")], bg=LIGHT, pad=7), Spacer(1, 3*mm)]
story += [Spacer(1, 3*mm), P("Tres figuras que no deben confundirse", "h2"),
          P("<b>D</b> es todo el plato redondo de terreno que estudiamos (radio 110 m). <b>R</b> es una rebanada de dona dentro de ese plato (entre 60 y 72 m): allí sumamos columnas de altura. <b>E</b> es el espacio interior del depósito, parecido a media sandía gigante apoyada sobre su corte plano. Su nombre matemático es <i>semielipsoide</i>. El círculo de radio 72 m también sirve para comparar posibles llegadas y trazar la ruta; no es toda la rebanada R."),
          P("<b>Coordenadas:</b> x Este, y Norte, z altura. En Three.js se dibujan como (x,z,y). Esta permutación de pantalla no altera ninguna derivada ni integral.", "small"),
          P("<b>Cómo usar la guía:</b> lee primero la idea sencilla; luego explica con tus palabras la fórmula; finalmente señala la pieza en el 3D y responde qué cambiaría si cambiamos un dato. Nadie necesita recitar símbolos sin entender la historia.", "small"),
          PageBreak()]

story += [P("DICCIONARIO PARA EMPEZAR", "kicker"), P("Los símbolos, sin miedo", "h1"),
          P("Esta página se puede tener abierta al ensayar. Los símbolos son maneras cortas de escribir ideas muy simples."),
          box([P("x, y, z", "callout"), P("x dice cuánto al Este; y, cuánto al Norte; z, qué tan alto. f(x,y) es la receta que toma x e y y devuelve z.", "small")], LIGHT), Spacer(1, 3*mm),
          box([P("=, ≈, ≤, π", "callout"), P("= significa exactamente igual; ≈, casi igual por redondeo; ≤, menor o igual; π≈3.1416 aparece cuando medimos círculos.", "small")], LIGHT), Spacer(1, 3*mm),
          box([P("f<sub>x</sub>, f<sub>y</sub> y ∇f", "callout"), P("f<sub>x</sub> dice cuánto cambia la altura al moverse un poco al Este; f<sub>y</sub>, al Norte. ∇f reúne ambas respuestas en una flecha que apunta a la subida más fuerte.", "small")], LIGHT), Spacer(1, 3*mm),
          box([P("∫, ∫∫, ∫∫∫", "callout"), P("Son sumas de pedacitos: sobre un camino, una zona plana o un cuerpo con volumen. dA es un pedacito de área y dV uno de volumen.", "small")], LIGHT), Spacer(1, 3*mm),
          box([P("m, m², m³, kg y %", "callout"), P("Metros para distancias; metros cuadrados para áreas; metros cúbicos para volumen; kilogramos para masa; porcentaje para comparar una cantidad con 100 partes.", "small")], LIGHT),
          Spacer(1, 5*mm), P("Ejemplo que vale para todo el proyecto", "h2"),
          P("Si f(P)=21.44 m, la maqueta tiene esa altura en P. Si allí f<sub>x</sub>=−0.09, caminar un metro hacia el Este baja aproximadamente 9 cm, siempre que sigamos muy cerca de P. El signo menos quiere decir «baja»; la palabra «aproximadamente» importa porque el terreno puede curvarse.", "small"),
          PageBreak()]

story += [P("REPARTO EN VOZ HUMANA", "kicker"), P("Qué cuenta cada uno, sin recitar fórmulas", "h1"),
          P("Estas son las historias completas de cada parte. Primero practíquenlas sin símbolos; después añadan una cuenta y señalen el objeto en el 3D."),
          P("Juan Carlos · el suelo", "h2"),
          box(P("«Hicimos una maqueta matemática del terreno. Si me dices un lugar, la fórmula me dice su altura. Las líneas de nivel unen sitios igual de altos y los cortes enseñan la loma de lado. Una tabla recta apoyada en un punto predice la altura cercana: en nuestro ejemplo se equivoca solo 2.48 cm. Davis mostrará de dónde salen las derivadas de esa tabla si quieren ver el cálculo».", "body"), LIGHT),
          P("Haroldo · el camino y la rebanada R", "h2"),
          box(P("«El rover sigue un hilo puesto encima de esa misma maqueta: por eso su camino tiene largo, ancho y altura. Ese hilo mide 226.205 m. La región R es una rebanada de dona entre dos distancias al centro. Yo puedo señalarla y explicar sus límites; Davis desarrollará las integrales y la curvatura».", "body"), LIGHT),
          P("Davis · las cuentas difíciles", "h2"),
          box(P("«Yo explico cómo calculamos inclinaciones y direcciones de subida, por qué elegimos B⁺ como llegada y cómo se obtienen la curvatura y las áreas de R. Después calculo el depósito con forma de media sandía: espacio interior, masa supuesta y punto de equilibrio. Muestro las cuentas y digo con claridad qué conclusiones permiten y cuáles no».", "body"), LIGHT),
          Spacer(1, 5*mm), P("Cómo pasarse la palabra", "h2"),
          P("En el orden de la aplicación, Davis interviene entre las escenas sencillas de Juan Carlos y Haroldo. Cada uno presenta su idea visible; Davis entra cuando llega una derivación o integral. Así el equipo cubre todo sin pedir a los otros dos que memoricen cuentas que no van a exponer.", "small"),
          PageBreak()]

easy_juan = {2, 3, 5}
easy_haroldo = {11, 12, 14}
for item in SCENES:
    item["who"] = ("JUAN CARLOS" if item["n"] in easy_juan else
                   "HAROLDO" if item["n"] in easy_haroldo else "DAVIS")
order = [2, 3, 5, 11, 12, 14] + [n for n in range(2, 22) if n not in easy_juan | easy_haroldo]
by_n = {d["n"]: d for d in SCENES}
part_map = {"JUAN CARLOS": "PARTE 1 / JUAN CARLOS BOTEO", "HAROLDO": "PARTE 2 / HAROLDO RODRIGUEZ", "DAVIS": "PARTE 3 / DAVIS JAVIER RIVERA AROCHE"}

for n in order:
    d = by_n[n]
    story += [P(part_map[d["who"]], "kicker"), P(f"Escena {n:02d}  ·  {d['title']}", "h1"),
              P("Primero, sin palabras complicadas", "h2"),
              box([P(SIMPLE[n][0], "body"), P(SIMPLE[n][1], "small")], bg=PALE, pad=9),
              P("Ahora sí: la fórmula", "h2"), box(P(d["formula"], "formula")),
              P("La fórmula, traducida", "h2"), P(READ_FORMULA[n]),
              P("Cómo sale el resultado", "h2"), P(d["steps"]),
              P("Dónde aparece en el 3D", "h2"), P(d["model"]),
              P("Qué pasaría si cambiamos algo", "h2"), P(d["variation"]),
              P("Cómo responder al profesor", "h2"), box(P(d["defense"], "small"), bg=LIGHT, pad=8),
              Spacer(1, 4*mm), P(f"Base para revisar: {d['source']}.", "tiny"),
              PageBreak()]

story += [P("CIERRE COMPARTIDO", "kicker"), P("Lo que sí concluye el proyecto", "h1"),
          P("Juan Carlos y Haroldo pueden decir la idea visible y su cifra sencilla. Davis desarrolla las comparaciones matemáticas si el profesor pide la prueba:"),
          box([P("Llegada", "callout"), P("B⁺ reduce la pendiente máxima local de 6.472 % a 3.788 % frente al candidato opuesto, <b>solo sobre el círculo r=72</b>.", "small")], LIGHT), Spacer(1,3*mm),
          box([P("Región R", "callout"), P("El área horizontal es 622.035 m² y la superficie real 623.365 m²: la diferencia es 0.214 %. La integral de f entrega altura media 19.484 m respecto a z=0.", "small")], LIGHT), Spacer(1,3*mm),
          box([P("Depósito E", "callout"), P("El volumen ideal es 1344π≈4 222.301 m³. Con la densidad supuesta, M≈3.797 millones kg y el centro local queda en w≈2.971 m.", "small")], LIGHT),
          Spacer(1,5*mm), P("Preguntas que pueden hacerles", "h2"),
          P("<b>¿Por qué hay 22 escenas si había 53 temas?</b> Las 22 escenas agrupan los 53 temas del explorador; la cantidad de pantallas no reemplaza ni elimina las seis fases requeridas. Abran la evidencia adicional de una escena cuando pidan el paso completo."),
          P("<b>¿Qué prueba el modelo 3D?</b> Que terreno, ruta, región, depósito y puntos usan las mismas coordenadas y resultados. No reemplaza la derivación escrita ni demuestra ingeniería estructural o topografía real."),
          P("<b>¿Cómo defender una cifra dudosa?</b> Digan la ecuación, sustitución, unidad y alcance. Si el docente propone otro parámetro, expliquen qué parte del resultado cambia antes de aventurar un nuevo número."),
          PageBreak()]

story += [P("APÉNDICE PARA LOS TRES", "kicker"), P("Energía y agua: cómo leer los balances", "h1"),
          P("Estos cálculos acompañan al diseño, pero sus parámetros son supuestos. Se separan de las seis fases exigidas y no demuestran autosuficiencia."),
          P("Paneles y batería", "h2"),
          box(P("P<sub>R</sub>(t)=I<sub>0</sub>(20·6)η·PR·max(0,ŝ·n̂), con I<sub>0</sub>=590 W/m², η=0.24 y PR=0.86. E<sub>sol</sub>=∫P(t)dt≈138.979 kWh por ciclo de 24 h normalizadas, usando 44 paneles y los factores del escenario conectado.", "formula")),
          P("El producto convierte irradiancia, área e incidencias en potencia instantánea. Integrar potencia en el tiempo produce energía. Los 20 paneles de R más 24 auxiliares forman 44 en el balance conectado; no se debe usar el resultado de 20 como si fuese de 44. El consumo incluido es (4.5+0.6) kW·24 h=122.4 kWh. La batería usable es 120·0.8=96 kWh, y el modelo de carga/descarga aplica eficiencia 0.9 y límites de 0 a 96 kWh."),
          P("<b>Si cambia el supuesto:</b> al bajar transmitancia de 0.70 a 0.60 el escenario deja carga sin servir. El caso base entrega cero carga no servida únicamente para hábitat y tratamiento; no cubre todas las cargas de la base.", "small"),
          P("Tratamiento de agua", "h2"),
          box(P("L<sub>entregado</sub>=Nq=32·2=64 L/ciclo.<br/>L<sub>bruto</sub>=L<sub>entregado</sub>/η<sub>T</sub>=64/0.85≈75.294 L/ciclo.<br/>Capacidad=100 L/ciclo; margen≈24.706 L/ciclo.", "formula")),
          P("Dividir por eficiencia recupera la cantidad de entrada requerida; la diferencia de 11.294 L representa pérdidas del tratamiento supuesto. Si añadimos 60 L/ciclo hipotéticos de tripulación, la entrada necesaria subiría a (64+60)/0.85≈145.882 L/ciclo: excede la capacidad por 45.882 L. El volumen geométrico E no se convierte en ciclos disponibles sin llenado, calidad ni recirculación."),
          P("Fuente y defensa: Anexo A22. Pregunta clave: «¿Qué cargas y consumos están incluidos?» Responder con la lista exacta antes de afirmar suficiencia.", "tiny"),
          PageBreak(),
          P("APÉNDICE PARA LOS TRES", "kicker"), P("Cinco estudios y líneas de descenso", "h1"),
          P("Cada fórmula siguiente responde una pregunta hipotética. Su principal defensa es explicar qué variable se cambia y qué no se ha medido."),
          P("Polvo", "h2"),
          P("P(τ)=14.61312e<sup>−τ</sup> kW para los <b>20 paneles de R</b>. La opacidad τ reduce la irradiancia; con τ≈0.197, P iguala una carga hipotética de 12 kW. Es una comparación instantánea sin batería, distinta del balance conectado de 44 paneles."),
          P("Hielo", "h2"),
          P("S<sub>i</sub>(w)=wH<sub>i</sub>+(0.75−w)P<sub>i</sub>+0.25D<sub>i</sub>. Mezcla un potencial de hielo supuesto, facilidad por pendiente y cercanía a B⁺. Si el peso w pasa de 0.25 a 0.65, cambia el candidato ganador. La fórmula revela sensibilidad de una regla, no detecta hielo."),
          P("Oxígeno y blindaje", "h2"),
          P("Oxígeno: ΔM=P−2.52 kg/sol, con P supuesto y reserva inicial de 9 kg. Si P&lt;2.52, la reserva baja; si P&gt;2.52, sube hasta una capacidad ideal de 18 kg. Blindaje: D(x)/D<sub>0</sub>=e<sup>−0.42x</sup>. Al aumentar espesor x, baja exposición relativa; el coeficiente no define dosis clínica ni material certificado."),
          P("Energía del rover y líneas de descenso", "h2"),
          P("E<sub>est</sub>=0.04m·3.71·L/(3.6·10<sup>6</sup>)+0.19m/1000 kWh, L≈226.205 m. Crece con la masa supuesta (320–620 kg); omite trabajo vertical, aceleración y ramal, así que no da autonomía. Las líneas topográficas siguen p<sub>k+1</sub>=p<sub>k</sub>−Δs∇f/|∇f| con Δs inicial 2.4 m y aceptan solo pasos que bajan f. Muestran descenso geométrico, no caudal ni agua líquida."),
          P("Fuente: Anexo A23–A28. Si preguntan de dónde salen los parámetros, digan que son elecciones didácticas para sensibilidad; no son medidas marcianas ni pruebas de habitabilidad.", "tiny"),
          PageBreak()]

story += [P("ENSAYO FINAL", "kicker"), P("Prueba cruzada de 15 minutos", "h1"),
          P("Juan Carlos y Haroldo ensayan sus explicaciones sencillas; Davis practica las cuentas difíciles. Los tres conocen la historia general por si llega una pregunta individual."),
          P("Juan Carlos pregunta a Haroldo", "h2"),
          P("«¿Por qué el camino del rover tiene tres números en cada punto? ¿Qué forma tiene R?» Respuesta esperada: Este, Norte y altura; R es una rebanada entre radios 60 y 72 m."),
          P("Haroldo pregunta a Davis", "h2"),
          P("«¿Por qué B⁺ es un mínimo solo sobre r=72? ¿Y por qué el depósito necesita 2016ρ²senφ?» Respuesta esperada: comparación completa de candidatos tangenciales en círculo compacto; jacobiano del escalamiento por 18·14·8."),
          P("Davis pregunta a Juan Carlos", "h2"),
          P("«¿Qué entrega la receta f(x,y)? ¿Qué es una curva de nivel? ¿Por qué la tabla recta se equivoca un poquito?» Respuesta esperada: altura, lugares igual de altos y curvatura de la loma."),
          Spacer(1,8*mm),
          box([P("Secuencia para responder cualquier pregunta", "callout"),
               P("1. Identifica el objeto y sus coordenadas.  2. Escribe la fórmula.  3. Explica el paso clave.  4. Da unidad y valor.  5. Señala dónde aparece.  6. Declara el límite de la conclusión.", "small")], PALE),
          Spacer(1,7*mm),
          P("Material de contraste", "h2"),
          P("PDF oficial del Proyecto Integrador Matemática IV (fases 1–6 y lista de verificación); Anexo_Matematico_EVA03_Final.pdf (A1–A28); Informe_Tecnico_EVA03_Final.pdf; aplicación interactiva con 22 escenas y explorador de 53 temas. Los resultados redondeados aquí deben contrastarse con las expresiones exactas del anexo.", "small"),
          P("Versión de estudio: 15 de octubre de 2026. Reparto oral propuesto; datos personales pendientes.", "tiny")]

doc.build(story)
print(OUT)
