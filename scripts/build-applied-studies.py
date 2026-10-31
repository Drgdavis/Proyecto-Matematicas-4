"""Documento independiente de las cinco aplicaciones, calculado desde el código vigente.

Requiere reportlab, matplotlib y svglib. Uso: python scripts/build-applied-studies.py.
"""
from pathlib import Path
import sys, json, math, hashlib, subprocess, html, io

ROOT=Path(__file__).resolve().parents[1]
if (ROOT/'tmp/pdf-deps').is_dir():sys.path.insert(0,str(ROOT/'tmp/pdf-deps'))
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.mathtext import math_to_image
from matplotlib.font_manager import FontProperties, findfont
from svglib.svglib import svg2rlg
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, KeepTogether

TMP=ROOT/'tmp/pdfs/studies';TMP.mkdir(parents=True,exist_ok=True)
OUT=ROOT/'output/pdf';OUT.mkdir(parents=True,exist_ok=True)
DATA=json.loads(subprocess.check_output(['node','scripts/research-data.mjs'],cwd=ROOT,encoding='utf-8'))
TEAM=json.loads((ROOT/'public/materials/Identificacion_Equipo.json').read_text(encoding='utf-8'))
(TMP/'datos_verificados.json').write_text(json.dumps(DATA,ensure_ascii=False,indent=2),encoding='utf-8')
NAVY='#2D4E68';BLUE='#587FA0';PURPLE='#4B2D68';ICE='#E3F1FF';LINE='#C9DAE8';MUTED='#60798D'
body_font=Path('C:/Windows/Fonts/arial.ttf')
bold_font=Path('C:/Windows/Fonts/arialbd.ttf')
pdfmetrics.registerFont(TTFont('StudyBody',str(body_font) if body_font.exists() else findfont(FontProperties(family='DejaVu Sans'))))
pdfmetrics.registerFont(TTFont('StudyBold',str(bold_font) if bold_font.exists() else findfont(FontProperties(family='DejaVu Sans',weight='bold'))))
pdfmetrics.registerFontFamily('StudyBody',normal='StudyBody',bold='StudyBold')
STYLE={
 'body':ParagraphStyle('body',fontName='StudyBody',fontSize=10,leading=14.5,textColor=colors.HexColor(NAVY),spaceAfter=9),
 'small':ParagraphStyle('small',fontName='StudyBody',fontSize=8.7,leading=12.5,textColor=colors.HexColor(MUTED),spaceAfter=7),
 'h1':ParagraphStyle('h1',fontName='StudyBold',fontSize=25,leading=29,textColor=colors.HexColor(NAVY),spaceAfter=15),
 'h2':ParagraphStyle('h2',fontName='StudyBold',fontSize=12,leading=16,textColor=colors.HexColor(PURPLE),spaceBefore=10,spaceAfter=7,keepWithNext=True),
 'eyebrow':ParagraphStyle('eyebrow',fontName='StudyBold',fontSize=9,leading=12,textColor=colors.HexColor(BLUE),spaceAfter=10),
 'table':ParagraphStyle('table',fontName='StudyBody',fontSize=8.6,leading=11.8,textColor=colors.HexColor(NAVY)),
 'head':ParagraphStyle('head',fontName='StudyBold',fontSize=8.5,leading=11.5,textColor=colors.white),
 'result':ParagraphStyle('result',fontName='StudyBold',fontSize=11,leading=16,textColor=colors.HexColor(PURPLE)),
}
plt.rcParams.update({'font.family':'DejaVu Sans','mathtext.fontset':'stix','svg.fonttype':'path','font.size':9,'axes.labelcolor':NAVY,'text.color':NAVY,'xtick.color':MUTED,'ytick.color':MUTED,'axes.edgecolor':LINE,'axes.spines.top':False,'axes.spines.right':False,'axes.titleweight':'bold'})
W=495
story=[]
def p(text,style='body'):return Paragraph(text,STYLE[style])
def add(text,style='body'):story.append(p(text,style))
def heading(number,title,subtitle):
 story.extend([p(number,'eyebrow'),p(title,'h1'),p(subtitle)])
def h(text):add(text,'h2')
def drawing(file,width=W):
 d=svg2rlg(str(file));scale=min(1,width/d.width);d.scale(scale,scale);d.width*=scale;d.height*=scale;return d
def eq(tex,size=16):
 name=hashlib.sha256((tex+str(size)).encode()).hexdigest()[:16]+'.svg';file=TMP/name
 if not file.exists():math_to_image('$'+tex+'$',file,prop=FontProperties(size=size),format='svg',color=NAVY,dpi=150)
 story.extend([Spacer(1,4),drawing(file),Spacer(1,8)])
def table(headers,rows,widths=None):
 content=[[p(str(v),'head') for v in headers]]+[[p(str(v),'table') for v in row] for row in rows]
 t=Table(content,colWidths=widths or [W/len(headers)]*len(headers),repeatRows=1,hAlign='LEFT')
 t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor(NAVY)),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#F3F8FC')]),('LINEBELOW',(0,0),(-1,-1),.35,colors.HexColor(LINE))]))
 story.extend([t,Spacer(1,8)])
def result(text):
 t=Table([[p(text,'result')]],colWidths=[W],hAlign='LEFT');t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),colors.HexColor(ICE)),('LINEBEFORE',(0,0),(0,-1),3,colors.HexColor(PURPLE)),('LEFTPADDING',(0,0),(-1,-1),12),('RIGHTPADDING',(0,0),(-1,-1),12),('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),10)]));story.extend([t,Spacer(1,10)])
def chart(name,draw,height=2.2):
 fig,ax=plt.subplots(figsize=(6.6,height));draw(ax);ax.grid(axis='y',color=LINE,linewidth=.55,alpha=.65);ax.set_axisbelow(True);fig.tight_layout(pad=.8);file=TMP/(name+'.svg');fig.savefig(file,format='svg',transparent=True);plt.close(fig);story.extend([drawing(file),Spacer(1,7)])
def new():story.append(PageBreak())
def fmt(value,n=3):return f'{value:,.{n}f}'.replace(',',' ').replace('.',',')
def ref(n,label):add(f'<b>Referencia de contexto [{n}].</b> {label}','small')

# 1. Portada.
add('UNIVERSIDAD MESOAMERICANA / FACULTAD DE INGENIERÍA','eyebrow')
story.append(Spacer(1,35))
add('Cinco estudios<br/>aplicados para<br/>una base en Marte','h1')
add('HABITAR MARTE · EVA03','h2')
add('Datos, formulación, procedimiento, sensibilidad y decisiones. Documento complementario del modelo tridimensional de Matemática IV.')
story.append(Spacer(1,24))
table(['01 / ENERGÍA','02 / RECURSO','03 / SOPORTE','04 / PROTECCIÓN','05 / MOVILIDAD'],[['Polvo y potencia solar','Ubicación del hielo','Oxígeno y reserva','Atenuación del blindaje','Energía y riesgo del rover']])
story.append(Spacer(1,32))
for person in TEAM['integrantes']:add(f"<b>{person['nombre']}</b><br/>Carné {person['carne']}")
story.append(Spacer(1,20))
add(f"Docente: {TEAM['docente']}<br/>Curso: {TEAM['curso']}<br/>Versión documental: 30 de octubre de 2026",'small')
result('Un mismo propósito: transformar condiciones de operación en decisiones matemáticas que puedan explicarse y reproducirse.')
new()

# 2. Introducción y trazabilidad.
heading('LECTURA DEL DOCUMENTO','De los datos a la decisión','Cada aplicación cambia una variable y permite observar qué ocurre con una magnitud de interés. Los cinco escenarios se estudian por separado, con sus propias unidades y condiciones.')
table(['Aplicación','Variable de control','Magnitud que se obtiene'],[['Polvo','Opacidad óptica, de 0 a 4','Potencia disponible y déficit [kW]'],['Hielo','Peso del recurso, de 0,25 a 0,65','Índice de conveniencia de tres sitios'],['Oxígeno','Producción, de 1,5 a 3,5 kg/sol','Balance y reserva [kg]'],['Blindaje','Espesor equivalente, de 0 a 5 m','Transmisión y reducción relativas [%]'],['Rover','Masa operativa, de 320 a 620 kg','Energía estimada [kWh] y cota de velocidad [m/s]']],[80,180,235])
h('Marco de referencia')
add('El equipo identifica a SpaceX como procedencia del material de referencia que motivó estas aplicaciones. Este documento recoge esa procedencia como información facilitada por el equipo y presenta, por separado, los parámetros numéricos adoptados en EVA03 y las fuentes públicas de contexto. No se asigna a una misión concreta un coeficiente que no esté documentado en una ficha original.')
add('La propuesta pública de SpaceX sobre Marte incluye el estudio de recursos locales, infraestructura energética y hábitats [6]. Las publicaciones NASA citadas respaldan el contexto de polvo, hielo, producción de oxígeno y radiación. Los valores concretos del simulador son los que figuran en las tablas de las páginas siguientes.')
h('Cómo leer cada estudio')
add('<b>Datos:</b> valores y unidades que entran al modelo. <b>Modelo:</b> relación matemática utilizada. <b>Cálculo:</b> sustitución reproducible. <b>Sensibilidad:</b> qué cambia al mover el control. <b>Decisión:</b> interpretación del resultado dentro del escenario.')
result('Las cifras se calcularon desde las funciones del programa. Potencia, masa, índices, porcentajes y energía se comparan en sus propias unidades; no se suman entre sí.')
new()

# 3 y 4. Polvo.
heading('01 / POLVO Y ENERGÍA','Potencia solar durante una tormenta','Pregunta: ¿la potencia instantánea del campo fotovoltaico cubre una carga crítica cuando aumenta la opacidad del polvo?')
ref(1,'Las tormentas marcianas pueden reducir la luz que llega a los paneles y alterar las operaciones de equipos de superficie.')
table(['Dato','Valor utilizado','Interpretación'],[['Irradiancia de referencia','590 W/m²','Valor de entrada con incidencia fija'],['Área nominal de paneles','120 m²','20 paneles de 6 m²'],['Eficiencia y rendimiento','0,24 y 0,86','Factores adimensionales'],['Carga crítica','12 kW','Carga de comparación de este estudio'],['Opacidad óptica','0 ≤ τ ≤ 4','Control adimensional']],[140,130,225])
h('Modelo de atenuación y conversión eléctrica')
eq(r'I(\tau)=590e^{-\tau}\ \mathrm{W/m^2}')
eq(r'P(\tau)=\frac{I(\tau)\,(120)\,(0.24)\,(0.86)}{1000}=14.61312e^{-\tau}\ \mathrm{kW}',14)
chart('polvo',lambda ax:(ax.plot([i/100 for i in range(401)],[14.61312*math.exp(-i/100) for i in range(401)],color=BLUE,lw=2),ax.axhline(12,color=PURPLE,ls='--',lw=1.2,label='Carga: 12 kW'),ax.axvline(DATA['dust']['threshold'],color=PURPLE,lw=.8),ax.set(xlabel='Opacidad óptica τ',ylabel='Potencia [kW]',xlim=(0,4),ylim=(0,15.5)),ax.legend(frameon=False,fontsize=8)))
result('Sin atenuación: 14,613 kW. Con τ = 4: 0,268 kW. La igualdad con la carga ocurre en τ ≈ 0,197.')
new()
heading('01 / DESARROLLO','De la irradiancia al déficit','Ejemplo numérico: opacidad óptica τ = 1.')
h('1. Reducir la irradiancia según la transmitancia')
eq(r'I(1)=590e^{-1}\approx217.04887\ \mathrm{W/m^2}')
add('El factor exponencial conserva aproximadamente el 36,79 % de la irradiancia de referencia.')
h('2. Convertir la irradiancia en potencia y comparar')
eq(r'P(1)=\frac{217.04887(120)(0.24)(0.86)}{1000}\approx5.375866\ \mathrm{kW}',14)
eq(r'B(1)=P(1)-12\approx-6.624134\ \mathrm{kW}')
table(['τ','Irradiancia [W/m²]','Potencia [kW]','Balance [kW]'],[[fmt(r['tau'],3),fmt(r['irradiance'],2),fmt(r['power'],3),fmt(r['balance'],3)] for r in DATA['dust']['rows']],[75,150,135,135])
h('3. Encontrar el punto de cambio')
eq(r'14.61312e^{-\tau}=12\quad\Rightarrow\quad\tau=\ln\!\left(\frac{14.61312}{12}\right)\approx0.197013',15)
add('Como la potencia disminuye al crecer τ, superar ese valor produce déficit instantáneo. Si se duplicara el área nominal manteniendo los demás factores, también se duplicaría la potencia calculada.')
result('Decisión: identificar el déficit y plantear respaldo o reducción de demanda. Este estudio no calcula batería ni autonomía y no sustituye al balance conectado de 44 paneles del informe principal.')
new()

# 5 y 6. Hielo.
heading('02 / RECURSO Y UBICACIÓN','Elegir un sitio para explorar hielo','Pregunta: ¿cómo comparar potencial de recurso, pendiente y distancia sin elegir solamente el punto de mayor potencial?')
ref(2,'El proyecto SWIM reúne evidencia de hielo subsuperficial de Marte. En EVA03, los valores H de los tres candidatos son hipótesis del caso, no mediciones de ese mapa.')
table(['Sitio [m]','H','Pendiente','Distancia a B⁺ [m]'],[[f"{s['name']} = ({s['x']}, {s['y']})",fmt(s['H'],2),fmt(s['slope']*100,3)+' %',fmt(s['distance'],3)] for s in DATA['ice']['sites']],[165,60,115,155])
h('Tres criterios comparables y una ponderación')
eq(r'P_i=\max\!\left(0,1-\frac{\|\nabla f(C_i)\|}{0.12}\right),\qquad D_i=\max\!\left(0,1-\frac{d(C_i,B^+)}{200}\right)',14)
eq(r'S_i(w)=wH_i+(0.75-w)P_i+0.25D_i')
add('H representa el potencial de hielo asignado; P favorece terreno de menor pendiente; D favorece menor distancia a B⁺ = (64,3988; -32,1994) m. Los pesos suman uno y permanecen no negativos para 0,25 ≤ w ≤ 0,65.')
def plot_ice(ax):
 for site,col in zip(DATA['ice']['sites'],[PURPLE,BLUE,'#97A9B8']):
  ws=[.25+i*.004 for i in range(101)];ax.plot(ws,[w*site['H']+(.75-w)*site['P']+.25*site['D'] for w in ws],label=site['name'],color=col,lw=2)
 ax.axvline(DATA['ice']['crossover'],color=PURPLE,lw=.8,ls=':');ax.set(xlabel='Peso del recurso w',ylabel='Índice S',xlim=(.25,.65));ax.legend(frameon=False,ncols=3,fontsize=8)
chart('hielo',plot_ice)
result('Con w = 0,25 gana C2; con w = 0,65 gana C1. El cambio de prioridad ocurre cerca de w = 0,5833.')
new()
heading('02 / DESARROLLO','Comparar criterios antes de decidir','Ejemplo numérico: candidato C2 y peso del recurso w = 0,25.')
h('1. Normalizar pendiente y distancia')
eq(r'P_2=1-\frac{0.01915256}{0.12}\approx0.840395')
eq(r'D_2=1-\frac{154.766238}{200}\approx0.226169')
add('La distancia es euclídea en planta. La pendiente se obtiene del gradiente de la misma función de terreno utilizada en el resto del proyecto.')
h('2. Sustituir los valores en el índice')
eq(r'S_2(0.25)=0.25(0.63)+0.50(0.840395)+0.25(0.226169)',15)
eq(r'S_2(0.25)\approx0.634240')
table(['Peso w','C1','C2','C3','Mayor índice'],[[fmt(row['w'],2)]+[fmt(s['score'],6) for s in row['sites']]+[max(row['sites'],key=lambda s:s['score'])['name']] for row in DATA['ice']['weights']],[75,100,100,100,120])
h('3. Interpretar la sensibilidad')
add('C1 tiene el mayor H, pero también una pendiente cercana al 10,02 %. C2 presenta menor potencial asignado y un terreno mucho más suave. Al aumentar w se reduce el peso de la pendiente y C1 termina superando a C2. C3 mantiene una pendiente favorable, pero no obtiene el mayor índice en este intervalo.')
result('Decisión: proponer C2 cuando el relieve pesa más y C1 cuando se prioriza el potencial de recurso. El índice ordena alternativas; la presencia y accesibilidad real del hielo requerirían exploración.')
new()

# 7 y 8. Oxígeno.
heading('03 / SOPORTE Y RESERVA','Producción local de oxígeno','Pregunta: ¿la producción de oxígeno cubre el consumo supuesto de tres tripulantes y cómo cambia la reserva?')
ref(3,'MOXIE demostró producción de oxígeno en Marte. La producción de este ejercicio es un parámetro de EVA03 y no la capacidad medida de MOXIE ni de un equipo comercial.')
table(['Dato','Valor utilizado'],[['Tripulación y consumo','3 personas; 2,52 kg O₂/sol en conjunto'],['Producción P','De 1,5 a 3,5 kg O₂/sol'],['Reserva inicial M₀','9 kg de O₂'],['Capacidad K','18 kg de O₂'],['Tiempo de evaluación','Un sol marciano; separado del ciclo eléctrico normalizado']],[165,330])
eq(r'b=P-2.52\quad[\mathrm{kg/sol}]')
eq(r'M_1=\min\!\left(18\,\mathrm{kg},\max(0\,\mathrm{kg},9\,\mathrm{kg}+b(1\,\mathrm{sol}))\right)',14)
def plot_oxygen(ax):
 for production,col in [(1.5,'#97A9B8'),(2.52,BLUE),(3.5,PURPLE)]:
  sols=[i/10 for i in range(201)];ax.plot(sols,[min(18,max(0,9+(production-2.52)*s)) for s in sols],label=f'P = {production:.2f} kg/sol',color=col,lw=2)
 ax.set(xlabel='Tiempo [soles]',ylabel='Reserva ideal [kg]',xlim=(0,20),ylim=(0,19));ax.legend(frameon=False,fontsize=8,loc='center right')
chart('oxigeno',plot_oxygen)
result('El equilibrio ocurre en P = 2,52 kg/sol. A 3,5 kg/sol, la reserva aumenta 0,98 kg por sol antes de alcanzar su capacidad.')
new()
heading('03 / DESARROLLO','Actualizar el inventario de oxígeno','Ejemplo numérico: producción constante P = 3,5 kg/sol.')
h('1. Restar el consumo a la producción')
eq(r'b=3.50-2.52=0.98\ \mathrm{kg/sol}')
h('2. Añadir el balance a la reserva inicial')
eq(r'\Delta M=b(1\,\mathrm{sol})=0.98\ \mathrm{kg}')
eq(r'M_1=\min(18,\max(0,9+0.98))\ \mathrm{kg}=9.98\ \mathrm{kg}')
table(['Producción [kg/sol]','Balance [kg/sol]','Reserva tras un sol [kg]'],[[fmt(r['production'],2),fmt(r['net'],2),fmt(r['stock'],2)] for r in DATA['oxygen']['rows']],[165,150,180])
h('3. Estimar el tiempo algebraico de llenado')
eq(r'n=\frac{18-9}{3.50-2.52}\approx9.1837\ \mathrm{soles}')
add('Con producción constante de 1,5 kg/sol, la disminución sería de 1,02 kg por sol y la reserva inicial alcanzaría algebraicamente para unos 8,824 soles. Llegar a cero indica agotamiento: truncar el inventario no elimina el consumo que quedaría sin atender.')
h('Qué cambiaría con otra persona')
add('Si se mantuviera el consumo adoptado de 0,84 kg por persona y sol, cuatro personas exigirían 3,36 kg/sol. Con P = 3,5, el superávit bajaría a 0,14 kg/sol. Esto muestra que una reserva aparentemente favorable puede crecer mucho más lentamente al cambiar la demanda.')
result('Decisión: comparar producción y demanda antes de interpretar la reserva. Se trata de oxígeno, no del depósito de agua E. El balance no dimensiona el generador ni incorpora pérdidas adicionales.')
new()

# 9 y 10. Blindaje.
heading('04 / PROTECCIÓN RELATIVA','Atenuación de un blindaje','Pregunta: ¿cómo cambia la fracción transmitida cuando aumenta el espesor equivalente de la protección?')
ref(4,'Las observaciones de Curiosity permiten estudiar la relación entre el entorno y la radiación. Aquí se usa un modelo exponencial comparativo con un coeficiente adoptado.')
table(['Dato','Valor y unidad','Función en el cálculo'],[['Exposición exterior D₀','Normalizada al 100 %','Referencia de comparación'],['Coeficiente μ','0,42 m⁻¹','Parámetro demostrativo de atenuación'],['Espesor x','De 0 a 5 m','Control de la aplicación']],[145,140,210])
eq(r'\frac{D(x)}{D_0}=e^{-0.42x},\qquad R(x)=1-e^{-0.42x}')
def plot_shield(ax):
 xs=[i/50 for i in range(251)];ax.plot(xs,[math.exp(-.42*x)*100 for x in xs],color=BLUE,lw=2,label='Transmisión');ax.plot(xs,[(1-math.exp(-.42*x))*100 for x in xs],color=PURPLE,lw=2,label='Reducción');ax.set(xlabel='Espesor equivalente [m]',ylabel='Porcentaje de referencia',xlim=(0,5),ylim=(0,105));ax.legend(frameon=False,fontsize=8)
chart('blindaje',plot_shield,height=2.5)
result('A 5 m equivalentes se transmite el 12,246 % y la reducción relativa calculada es del 87,754 %.')
new()
heading('04 / DESARROLLO','Traducir espesor en reducción','Ejemplo numérico: espesor equivalente x = 3 m.')
h('1. Calcular la fracción que atraviesa el blindaje')
eq(r'\frac{D(3)}{D_0}=e^{-0.42(3)}=e^{-1.26}\approx0.283654')
h('2. Restar esa fracción a la referencia completa')
eq(r'R(3)=1-0.283654=0.716346\approx71.6346\%')
table(['Espesor [m]','Transmisión [%]','Reducción [%]'],[[fmt(r['x'],1),fmt(r['transmission']*100,3),fmt(r['reduction']*100,3)] for r in DATA['shield']['rows']],[135,180,180])
h('3. Despejar un espesor objetivo')
eq(r'e^{-0.42x}=0.5\quad\Rightarrow\quad x=\frac{\ln 2}{0.42}\approx1.6504\ \mathrm{m}')
add('Para una reducción matemática del 90 %, la misma ecuación daría x = ln(10)/0,42 ≈ 5,4823 m, fuera del intervalo de hasta 5 m representado por el control. El aumento de reducción por cada metro adicional disminuye: el modelo tiene rendimientos decrecientes.')
result('Decisión: comparar espesores bajo un mismo coeficiente. El resultado es una atenuación relativa; sin especificar material, espectro y dosis, no se convierte en una certificación de protección para personas.')
new()

# 11 y 12. Rover.
heading('05 / MOVILIDAD','Energía y restricción del rover','Pregunta: ¿cómo cambia el consumo estimado con la masa y qué papel distinto cumple la curvatura de la ruta?')
table(['Dato','Valor utilizado','Interpretación'],[['Longitud L','226,205 m','Longitud de la ruta 3D, redondeada'],['Masa m','De 320 a 620 kg','Control de este escenario'],['Gravedad g','3,71 m/s²','Valor adoptado para Marte'],['Rodadura cᵣ','0,04','Coeficiente supuesto'],['Margen q','0,19 Wh/kg','Asignación operativa por masa'],['Aceleración lateral','0,55 m/s²','Parámetro para la cota de velocidad']],[145,130,220])
eq(r'E_{\mathrm{rod}}=\frac{0.04\,m\,(3.71)(226.205)}{3.6\times10^6}\ \mathrm{kWh}',15)
eq(r'E_{\mathrm{est}}=E_{\mathrm{rod}}+\frac{0.19m}{1000}\ \mathrm{kWh},\qquad v_{\max}(t)=\sqrt{\frac{0.55}{\kappa(t)}}',15)
def plot_rover(ax):
 rows=DATA['rover']['rows'];xs=[0,1,2];ax.bar(xs,[r['rolling']*1000 for r in rows],color=BLUE,label='Rodadura');ax.bar(xs,[r['margin']*1000 for r in rows],bottom=[r['rolling']*1000 for r in rows],color=PURPLE,label='Margen');ax.set(xticks=xs,xticklabels=[f"{r['mass']:.0f} kg" for r in rows],ylabel='Energía estimada [Wh]');ax.legend(frameon=False,fontsize=8)
chart('rover',plot_rover,height=2.0)
result('La masa aumenta linealmente ambos términos de energía. La velocidad por curvatura es otra restricción y se evalúa por separado.')
new()
heading('05 / DESARROLLO','Descomponer la energía del recorrido','Ejemplo numérico: masa operativa m = 470 kg.')
h('1. Calcular fuerza de rodadura y trabajo')
eq(r'F_{\mathrm{rod}}=0.04(470)(3.71)=69.748\ \mathrm{N}')
eq(r'E_{\mathrm{rod}}=\frac{69.748(226.205)}{3.6\times10^6}\approx0.004382596\ \mathrm{kWh}',15)
h('2. Añadir el margen con sus unidades correctas')
eq(r'E_{\mathrm{margen}}=\frac{0.19(470)}{1000}=0.0893\ \mathrm{kWh}')
eq(r'E_{\mathrm{est}}\approx0.093682596\ \mathrm{kWh}=93.6826\ \mathrm{Wh}')
table(['Masa [kg]','Rodadura [kWh]','Margen [kWh]','Total [kWh]'],[[fmt(r['mass'],0),fmt(r['rolling'],6),fmt(r['margin'],6),fmt(r['energy'],6)] for r in DATA['rover']['rows']],[90,135,135,135])
h('3. Interpretar la restricción de curvatura')
eq(r'\kappa(t^*)\approx0.01388639\ \mathrm{m^{-1}},\qquad v_{\max}(t^*)\approx6.2934\ \mathrm{m/s}',15)
add('El punto de control usa t* ≈ 1,107149 rad. La cota procede de a<sub>lat</sub> = v²κ con la aceleración adoptada. La pendiente se muestra en el modelo, pero su trabajo de elevación no está integrado en esta estimación de energía.')
result('Decisión: justificar qué parte de la energía se atribuye a rodadura y cuál al margen. Sin capacidad de batería, rendimiento del motor y demás consumos, no se deduce autonomía ni un límite operativo certificado.')
new()

# 13. Síntesis.
heading('SÍNTESIS DE LOS CINCO ESTUDIOS','Cinco resultados, cinco decisiones','Los escenarios convierten controles del modelo tridimensional en resultados que pueden comprobarse. Su valor está en mostrar qué hipótesis produce cada conclusión.')
table(['Estudio','Resultado representativo','Decisión que permite'],[['Polvo','Umbral τ ≈ 0,197 para 12 kW','Reconocer cuándo aparece déficit instantáneo'],['Hielo','C2 con w = 0,25; C1 con w = 0,65','Explicar una elección según prioridades'],['Oxígeno','Equilibrio en 2,52 kg/sol','Identificar superávit, déficit o agotamiento'],['Blindaje','87,754 % de reducción a 5 m','Comparar espesores en un mismo modelo'],['Rover','0,093683 kWh con 470 kg','Separar rodadura, margen y cota por curvatura']],[75,190,230])
h('Relación con el proyecto principal')
add('El estudio del hielo utiliza el gradiente del terreno y la posición B⁺. El estudio del rover reutiliza la longitud espacial y la curvatura de la trayectoria. Los controles de polvo, oxígeno y blindaje permiten visualizar sensibilidad a condiciones de operación sin modificar las seis fases matemáticas centrales.')
h('Relaciones que deben explicarse con cuidado')
add('Una reducción de potencia puede motivar revisar el suministro a equipos de soporte, pero el programa no acopla automáticamente el control de polvo con la producción de oxígeno. De igual manera, el espesor del blindaje no modifica por sí solo la masa del rover ni la masa del depósito. Son relaciones de planificación, no ecuaciones conectadas dentro de estos cinco simuladores.')
h('Qué observar en el modelo 3D')
add('En «Índice y respaldo», abrir «Estudios optativos». Los cinco controles corresponden, en orden, a polvo, hielo, oxígeno, blindaje y rover. Conviene mover un control, comparar el número con la ecuación de estas páginas y señalar qué decisión cambia.')
result('La defensa de cada aplicación se apoya en cuatro elementos: condición adoptada, ecuación, resultado con unidad e interpretación dentro de su alcance.')
new()

# 14. Fuentes.
heading('REFERENCIAS Y TRAZABILIDAD','Procedencia y reproducción','Fuentes públicas consultadas el 30 de octubre de 2026. Cada referencia se usa para el contexto que se indica, sin transferirle automáticamente los coeficientes del caso.')
refs=[
 ('[1] NASA Science. Mars Report: Dust Storms on Mars.',DATA['sources'][0]['url'],'Contexto del efecto del polvo sobre operaciones y energía.'),
 ('[2] NASA/JPL-Caltech/Planetary Science Institute. SWIM Map Shows Subsurface Water Ice on Mars.',DATA['sources'][1]['url'],'Contexto de cartografía de hielo; H de EVA03 sigue siendo una hipótesis.'),
 ('[3] NASA. NASA’s Oxygen-Generating Experiment MOXIE Completes Mars Mission.',DATA['sources'][2]['url'],'Demostración de producción local de oxígeno; no origina las tasas adoptadas.'),
 ('[4] NASA/JPL. How NASA’s Curiosity Rover Is Making Mars Safer for Astronauts.',DATA['sources'][3]['url'],'Contexto de radiación y entorno; no proporciona el coeficiente μ = 0,42.'),
 ('[5] NASA. 2023 Moon to Mars Architecture Concept Review White Papers, pp. 39-43.',DATA['sources'][4]['url'],'Contexto de necesidades de energía en superficie; no especificación del rover.'),
 ('[6] SpaceX. Mission: Mars.','https://www.spacex.com/mars','Marco de infraestructura y recursos para presencia humana en Marte.'),
]
for title,url,scope in refs:
 add(f'<b>{html.escape(title)}</b><br/>{html.escape(scope)} <link href="{html.escape(url,quote=True)}" color="{PURPLE}">Consultar fuente</link>.','small')
h('Fuentes numéricas del proyecto')
add('Valores y controles: <link href="https://github.com/Drgdavis/Proyecto-Matematicas-4/blob/main/src/data/researchScenarios.ts" color="#4B2D68">researchScenarios.ts</link>. Terreno, gradiente, longitud y curva: <link href="https://github.com/Drgdavis/Proyecto-Matematicas-4/blob/main/src/data/marsMath.ts" color="#4B2D68">marsMath.ts</link>. Curvatura y velocidad: <link href="https://github.com/Drgdavis/Proyecto-Matematicas-4/blob/main/src/data/marsSystems.ts" color="#4B2D68">marsSystems.ts</link>.','small')
add('La generación del documento obtiene las tablas del mismo código mediante research-data.mjs. Las gráficas y sustituciones se contrastan con esos valores. La longitud exacta del recorrido principal es aproximadamente 226,204849 m; este escenario energético utiliza su redondeo a 226,205 m.','small')
h('Criterio de atribución')
add('El material de referencia identificado como SpaceX corresponde a la procedencia informada por el equipo. Los parámetros adoptados, los datos públicos de contexto y los resultados calculados se presentan como categorías distintas. La atribución a una misión específica requiere la ficha técnica original que documente ese dato.','small')

class NumberedCanvas(Canvas):
 def __init__(self,*args,**kwargs):super().__init__(*args,**kwargs);self.states=[]
 def showPage(self):self.states.append(dict(self.__dict__));self._startPage()
 def save(self):
  total=len(self.states)
  for state in self.states:
   self.__dict__.update(state);self.setStrokeColor(colors.HexColor(LINE));self.line(50,43,545,43);self.setFont('StudyBody',8);self.setFillColor(colors.HexColor(MUTED));self.drawString(50,29,'HABITAR MARTE / CINCO ESTUDIOS APLICADOS');self.drawRightString(545,29,f'{self._pageNumber:02d} / {total:02d}');super().showPage()
  super().save()
def page(canvas,doc):
 canvas.saveState();canvas.setFillColor(colors.HexColor(ICE));canvas.rect(0,833,595,9,fill=1,stroke=0);canvas.setStrokeColor(colors.HexColor(LINE));canvas.line(50,800,545,800);canvas.setFont('StudyBold',8);canvas.setFillColor(colors.HexColor(BLUE));canvas.drawString(50,812,'MATEMÁTICA IV');canvas.drawRightString(545,812,'EVA03 / APLICACIONES');canvas.restoreState()
target=OUT/'Cinco_Estudios_Aplicados_EVA03.pdf'
doc=SimpleDocTemplate(str(target),pagesize=A4,rightMargin=50,leftMargin=50,topMargin=62,bottomMargin=57,title='Habitar Marte - Cinco estudios aplicados',author='Juan Carlos Boteo Granados; Carlos Haroldo Rodriguez Fuentes; Davis Javier Rivera Aroche',subject='Datos, procedimientos, sensibilidad y decisiones de cinco aplicaciones de EVA03')
doc.build(story,onFirstPage=page,onLaterPages=page,canvasmaker=NumberedCanvas)
print(target)
