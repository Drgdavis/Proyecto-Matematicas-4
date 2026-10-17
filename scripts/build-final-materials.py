"""Regenera informe, anexo y plano desde las fuentes académicas vigentes.

Uso: python scripts/build-final-materials.py
Las identidades se limitan a los nombres facilitados por el equipo; los carnés,
la sección, la fecha de entrega y las contribuciones reales se completan después.
"""
from __future__ import annotations

import html
import math
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    BaseDocTemplate, Flowable, Frame, KeepTogether, LongTable, PageBreak,
    PageTemplate, Paragraph, Spacer, TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents


ROOT = Path(__file__).resolve().parents[1]
MATERIALS = ROOT / "public" / "materials"
PAPER = colors.HexColor("#173434")
ACCENT = colors.HexColor("#B76542")
SOFT = colors.HexColor("#EAF0EC")
MUTED = colors.HexColor("#536260")
WIDTH, HEIGHT = A4

pdfmetrics.registerFont(TTFont("ArialEVA", "C:/Windows/Fonts/arial.ttf"))
pdfmetrics.registerFont(TTFont("ArialEVABold", "C:/Windows/Fonts/arialbd.ttf"))
pdfmetrics.registerFontFamily("ArialEVA", normal="ArialEVA", bold="ArialEVABold")
dejavu_candidates = (
    Path("C:/Windows/Fonts/DejaVuSans.ttf"),
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    Path("/usr/share/fonts/dejavu/DejaVuSans.ttf"),
)
body_font = next((font for font in dejavu_candidates if font.is_file()), Path("C:/Windows/Fonts/arial.ttf"))
pdfmetrics.registerFont(TTFont("DejaVuEVA", str(body_font)))
pdfmetrics.registerFontFamily("DejaVuEVA", normal="DejaVuEVA", bold="DejaVuEVA")

ST = getSampleStyleSheet()
ST.add(ParagraphStyle(name="EVATitle", fontName="ArialEVABold", fontSize=30, leading=36, textColor=PAPER, spaceAfter=22))
ST.add(ParagraphStyle(name="EVASub", fontName="ArialEVA", fontSize=15, leading=20, textColor=ACCENT, spaceAfter=28))
ST.add(ParagraphStyle(name="EVAH1", fontName="ArialEVABold", fontSize=15, leading=19, textColor=PAPER, spaceBefore=16, spaceAfter=9, keepWithNext=True))
ST.add(ParagraphStyle(name="EVAH2", fontName="ArialEVABold", fontSize=11.6, leading=15, textColor=ACCENT, spaceBefore=13, spaceAfter=7, keepWithNext=True))
ST.add(ParagraphStyle(name="EVABody", fontName="DejaVuEVA", fontSize=9.1, leading=14.2, textColor=PAPER, spaceAfter=8))
ST.add(ParagraphStyle(name="EVAList", parent=ST["EVABody"], leftIndent=15, firstLineIndent=-10, spaceAfter=5))
ST.add(ParagraphStyle(name="EVATable", fontName="DejaVuEVA", fontSize=7.35, leading=10.2, textColor=PAPER))
ST.add(ParagraphStyle(name="EVATableHead", fontName="DejaVuEVA", fontSize=7.5, leading=10.2, textColor=colors.white))
ST.add(ParagraphStyle(name="EVACode", fontName="DejaVuEVA", fontSize=8.5, leading=13.0, textColor=PAPER, leftIndent=11, rightIndent=8, backColor=SOFT, borderPadding=5, spaceAfter=6))
ST.add(ParagraphStyle(name="EVACoverInfo", fontName="DejaVuEVA", fontSize=10.7, leading=18, textColor=PAPER, spaceAfter=7))
ST.add(ParagraphStyle(name="EVATOC", fontName="DejaVuEVA", fontSize=8.9, leading=13.5, textColor=PAPER, leftIndent=10, firstLineIndent=-10, spaceAfter=4))
ST.add(ParagraphStyle(name="EVACaption", fontName="DejaVuEVA", fontSize=7.9, leading=11.5, textColor=MUTED, spaceBefore=5, spaceAfter=14))


def rich(raw: str) -> str:
    """Limited Markdown inline syntax for ReportLab paragraphs."""
    tokens = re.split(r"(\*\*.*?\*\*|`[^`]*`|\[[^\]]+\]\([^)]*\))", raw)
    out = []
    for token in tokens:
        if token.startswith("**") and token.endswith("**"):
            out.append("<b>" + html.escape(token[2:-2]) + "</b>")
        elif token.startswith("`") and token.endswith("`"):
            out.append('<font color="#8E4A31">' + html.escape(token[1:-1]) + "</font>")
        elif token.startswith("[") and "](" in token and token.endswith(")"):
            label, target = token[1:-1].split("](", 1)
            out.append('<link href="' + html.escape(target, quote=True) + '">' + html.escape(label) + "</link>")
        else:
            out.append(html.escape(token))
    return "".join(out)


def terrain(x: float, y: float) -> float:
    s = (x*x + y*y) / 6400 - 1
    return 18 + 6*s*s + .012*x - .006*y


class TraceFigure(Flowable):
    def __init__(self):
        Flowable.__init__(self)
        self.width, self.height = 480, 175

    def draw(self):
        c = self.canv
        c.setStrokeColor(colors.HexColor("#B7C8C1"))
        c.setLineWidth(.5)
        for z in (17, 20, 23, 26):
            y = 25 + (z-15) * 11
            c.line(37, y, 465, y)
            c.setFont("ArialEVA", 7.3)
            c.setFillColor(MUTED)
            c.drawRightString(32, y-2, str(z))
        c.setFont("ArialEVA", 8)
        c.drawString(7, 156, "z [m]")
        for xx in (-100, 0, 100):
            px = 37 + (xx+110)/220*428
            c.drawCentredString(px, 12, str(xx))
        for axis, color, label in ((0, ACCENT, "y=0"), (1, PAPER, "x=0")):
            c.setStrokeColor(color)
            c.setLineWidth(1.8)
            p = c.beginPath()
            for i in range(221):
                t = -110+i
                z = terrain(t, 0) if axis == 0 else terrain(0, t)
                px, py = 37 + i/220*428, 25 + (z-15)*11
                if i == 0: p.moveTo(px, py)
                else: p.lineTo(px, py)
            c.drawPath(p)
            c.setFillColor(color)
            c.drawString(388, 147-axis*14, label)
        c.setFillColor(MUTED)
        c.drawCentredString(251, 1, "coordenada x o y [m]")


class RegionFigure(Flowable):
    def __init__(self):
        Flowable.__init__(self)
        self.width, self.height = 480, 210

    def draw(self):
        c=self.canv
        ox,oy,scale=225,125,1.35
        c.setStrokeColor(colors.HexColor("#9CB7AE"))
        c.line(30,oy,430,oy); c.line(ox,20,ox,202)
        c.setFont("ArialEVA",8); c.setFillColor(MUTED)
        c.drawString(435,oy-3,"x"); c.drawString(ox+4,197,"y")
        p=c.beginPath()
        for i in range(71):
            a=-math.pi/4+i*(math.pi/4)/70
            x,y=ox+72*scale*math.cos(a),oy+72*scale*math.sin(a)
            if i==0:p.moveTo(x,y)
            else:p.lineTo(x,y)
        for i in range(70,-1,-1):
            a=-math.pi/4+i*(math.pi/4)/70
            p.lineTo(ox+60*scale*math.cos(a),oy+60*scale*math.sin(a))
        p.close()
        c.setFillColor(colors.HexColor("#E7B294"));c.setStrokeColor(ACCENT)
        c.drawPath(p,stroke=1,fill=1)
        c.setFillColor(PAPER);c.setFont("ArialEVABold",10)
        c.drawString(355,69,"R")
        c.setFont("ArialEVA",8)
        c.drawString(58,42,"60 ≤ r ≤ 72 m")
        c.drawString(58,30,"−π/4 ≤ θ ≤ 0")


class EllipsoidFigure(Flowable):
    def __init__(self):
        Flowable.__init__(self)
        self.width, self.height=480,175

    def draw(self):
        c=self.canv; x0,y0=240,41
        c.setStrokeColor(PAPER);c.setLineWidth(1.4)
        p=c.beginPath();p.moveTo(x0-162,y0)
        for i in range(101):
            t=math.pi-i*math.pi/100
            p.lineTo(x0+162*math.cos(t),y0+103*math.sin(t))
        p.lineTo(x0-162,y0);c.drawPath(p)
        c.setStrokeColor(ACCENT);c.line(x0-162,y0,x0+162,y0)
        c.setFont("ArialEVA",8.5);c.setFillColor(MUTED)
        c.drawCentredString(x0,23,"36 m (eje u)")
        c.drawString(408,87,"8 m")
        c.drawString(40,145,"Planta elíptica: eje v = 28 m")
        c.drawString(40,130,"Centro global de planta: (0, −94) m")


def map_drawing(c: canvas.Canvas, W: float, H: float):
    ox, oy, sc = W*.47, H*.51, 2.12
    c.setFillColor(colors.HexColor("#F8F6F0"));c.rect(0,0,W,H,fill=1,stroke=0)
    # Contours are sampled from the same terrain function used by the analysis.
    c.saveState()
    clip = c.beginPath(); clip.circle(ox, oy, 110*sc)
    c.clipPath(clip, stroke=0, fill=0)
    levels = (17, 18.5, 20, 21.5, 23, 24)
    contour_color = colors.HexColor("#A7B9AE")
    c.setStrokeColor(contour_color); c.setLineWidth(.45)
    step = 2.5
    for level in levels:
        for i in range(88):
            x = -110 + i*step
            for j in range(88):
                y = -110 + j*step
                corners = ((x,y),(x+step,y),(x+step,y+step),(x,y+step))
                values = [terrain(*pt) for pt in corners]
                crossings = []
                for a,b in ((0,1),(1,2),(2,3),(3,0)):
                    va,vb = values[a],values[b]
                    if (va < level <= vb) or (vb < level <= va):
                        t = (level-va)/(vb-va)
                        crossings.append((corners[a][0]+t*(corners[b][0]-corners[a][0]),
                                          corners[a][1]+t*(corners[b][1]-corners[a][1])))
                for k in range(0,len(crossings)-1,2):
                    a,b = crossings[k:k+2]
                    c.line(ox+a[0]*sc,oy+a[1]*sc,ox+b[0]*sc,oy+b[1]*sc)
    c.restoreState()
    c.setStrokeColor(PAPER);c.setLineWidth(2)
    c.circle(ox,oy,110*sc,fill=0,stroke=1)
    c.setStrokeColor(colors.HexColor("#B8C9C4"));c.setLineWidth(.7)
    c.line(ox-110*sc,oy,ox+110*sc,oy);c.line(ox,oy-110*sc,ox,oy+110*sc)
    c.setFont("ArialEVA",8);c.setFillColor(MUTED)
    c.drawString(ox+110*sc+5,oy-3,"Este x");c.drawString(ox+4,oy+110*sc-18,"Norte y")
    p=c.beginPath()
    for i in range(61):
        a=-math.pi/4+i*math.pi/4/60
        xx,yy=ox+72*sc*math.cos(a),oy+72*sc*math.sin(a)
        if i==0:p.moveTo(xx,yy)
        else:p.lineTo(xx,yy)
    for i in range(60,-1,-1):
        a=-math.pi/4+i*math.pi/4/60
        p.lineTo(ox+60*sc*math.cos(a),oy+60*sc*math.sin(a))
    p.close();c.setFillColor(colors.HexColor("#E7B294"));c.drawPath(p,fill=1,stroke=0)
    # The footprint of E is its 18 m by 14 m horizontal ellipse.
    c.setStrokeColor(colors.HexColor("#557A8A")); c.setFillColor(colors.HexColor("#DCE8EB"))
    c.setLineWidth(1.1)
    c.ellipse(ox-18*sc,oy-108*sc,ox+18*sc,oy-80*sc,stroke=1,fill=1)
    # The curved rover line is mathematical; the logistics spur is separate.
    c.setStrokeColor(ACCENT);c.setLineWidth(1.7)
    p=c.beginPath();alpha=math.atan(.5)
    for i in range(121):
        t=-alpha+i*math.pi/120
        xx,yy=ox+72*sc*math.cos(t),oy+72*sc*math.sin(t)
        if i==0:p.moveTo(xx,yy)
        else:p.lineTo(xx,yy)
    c.drawPath(p)
    marks=[("B+",64.398758,-32.199379,7,-11),("Núcleo",-8,8,-5,10),("Hábitat",44.581,-33.890,8,3),("Taller",-20,-35,-52,-15),("Logística",-77,-52,-38,-14),("Invernadero",-8,-62,-45,-16),("Tratamiento",24,-58,8,-4),("E",0,-94,8,-10),("Lab A",95,-28,8,1),("Lab B",96,-45,8,-12)]
    for label,x,y,dx,dy in marks:
        px,py=ox+x*sc,oy+y*sc
        c.setFillColor(PAPER);c.circle(px,py,3.1,fill=1,stroke=0)
        c.setFont("ArialEVABold",8);c.drawString(px+dx,py+dy,label)
    for label,x,y in (("P",40,-20),("Q",-50,35)):
        px,py=ox+x*sc,oy+y*sc
        s=(x*x+y*y)/6400-1
        gx=.00375*x*s+.012; gy=.00375*y*s-.006
        norm=math.hypot(gx,gy)
        ux,uy=gx/norm,gy/norm
        ex,ey=px+ux*19*sc,py+uy*19*sc
        c.setStrokeColor(colors.HexColor("#476A89"));c.setFillColor(colors.HexColor("#476A89"))
        c.setLineWidth(1.4);c.line(px,py,ex,ey)
        c.line(ex,ey,ex-7*ux+4*uy,ey-7*uy-4*ux)
        c.line(ex,ey,ex-7*ux-4*uy,ey-7*uy+4*ux)
        c.circle(px,py,2.5,fill=1,stroke=0)
        c.setFont("ArialEVABold",8);c.drawString(px+5,py+6,label)
    # A measured scale bar avoids relying on screen or print zoom.
    sx,sy=660,150
    c.setStrokeColor(PAPER);c.setFillColor(PAPER);c.setLineWidth(1.5)
    c.line(sx,sy,sx+50*sc,sy)
    for offset in (0,25*sc,50*sc):c.line(sx+offset,sy-4,sx+offset,sy+4)
    c.setFont("ArialEVA",8);c.drawString(sx,sy+8,"0");c.drawCentredString(sx+25*sc,sy+8,"25");c.drawRightString(sx+50*sc,sy+8,"50 m")
    c.setFont("ArialEVA",8);c.setFillColor(MUTED)
    c.drawString(656,187,"Curvas de nivel [m]:")
    c.drawString(656,174,"17 · 18.5 · 20 · 21.5 · 23 · 24")
    c.drawString(656,111,"Flechas azules: gradientes en P y Q")
    c.drawString(656,98,"Óvalo azul: huella del depósito E")
    c.setFillColor(PAPER);c.setFont("ArialEVABold",19)
    c.drawString(40,H-53,"Plano integrado del terreno y decisiones")
    c.setFont("ArialEVA",9);c.setFillColor(MUTED)
    c.drawString(41,H-72,"D: radio 110 m. Coordenadas en metros.")
    c.drawString(45,51,"Sector R en color. Curva naranja: ruta matemática del rover, distinta del ramal físico de logística.")
    c.drawString(45,35,"Posiciones de edificios: centros de planta redondeados. Los caminos y conductos completos se inspeccionan en el modelo 3D.")
    c.setFont("ArialEVA",8);c.drawRightString(W-35,26,"EVA03 · versión técnica 14/10/2026 · propuesta académica")


class EVADoc(BaseDocTemplate):
    def __init__(self, filename, **kw):
        BaseDocTemplate.__init__(self, filename, pagesize=A4, leftMargin=47,
                                 rightMargin=47, topMargin=58, bottomMargin=52, **kw)
        frame=Frame(self.leftMargin,self.bottomMargin,self.width,self.height,
                    leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)
        self.addPageTemplates(PageTemplate(id="normal",frames=frame,onPage=self.paint))

    def paint(self,c,doc):
        if doc.page==1:return
        c.setStrokeColor(colors.HexColor("#BBC9C3"));c.setLineWidth(.6)
        c.line(47,39,WIDTH-47,39)
        c.setFont("ArialEVA",8);c.setFillColor(MUTED)
        c.drawString(47,27,"EVA03 · Matemática IV · terreno sintético")
        c.drawRightString(WIDTH-47,27,str(doc.page))

    def afterFlowable(self,flowable):
        if isinstance(flowable,Paragraph) and flowable.style.name in ("EVAH1","EVAH2"):
            level=0 if flowable.style.name=="EVAH1" else 1
            self.notify("TOCEntry",(level,flowable.getPlainText(),self.page))


def table_flow(lines: list[str]):
    rows=[]
    for line in lines:
        if re.match(r"^\|[\s:\-|]+\|$",line):continue
        parts=[x.strip() for x in line.strip().strip("|").split("|")]
        rows.append(parts)
    if not rows:return None
    n=len(rows[0]); total=WIDTH-94
    if n==3:widths=[total*.37,total*.28,total*.35]
    elif n==7:widths=[total*.13]+[total*.145]*6
    else:widths=[total/n]*n
    data=[]
    for i,row in enumerate(rows):
        style=ST["EVATableHead"] if i==0 else ST["EVATable"]
        data.append([Paragraph(rich(cell),style) for cell in row])
    t=LongTable(data,colWidths=widths,repeatRows=1,hAlign="LEFT")
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),PAPER),
                           ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white,SOFT]),
                           ("GRID",(0,0),(-1,-1),.3,colors.HexColor("#CCD6D0")),
                           ("VALIGN",(0,0),(-1,-1),"TOP"),
                           ("LEFTPADDING",(0,0),(-1,-1),6),("RIGHTPADDING",(0,0),(-1,-1),6),
                           ("TOPPADDING",(0,0),(-1,-1),5),("BOTTOMPADDING",(0,0),(-1,-1),5)]))
    return t


def markdown_story(text: str, kind: str):
    lines=text.splitlines(); out=[]; para=[]; code=[]; table=[]; in_code=False
    def flush_para():
        if para:
            value=" ".join(x.strip() for x in para).strip()
            if value:out.append(Paragraph(rich(value),ST["EVABody"]))
            para.clear()
    def flush_table():
        if table:
            flow=table_flow(table)
            if flow:out.extend((Spacer(1,5),flow,Spacer(1,8)))
            table.clear()
    for raw in lines:
        line=raw.strip()
        if line.startswith("# ") or line.startswith("**Estado:**") or line.startswith("**Control de entrega:**"):
            continue
        if kind=="informe" and line.startswith("**Proyecto:**"):
            continue
        if kind=="informe" and "El anexo PDF anterior aún contiene el origen viejo" in line:
            raw=raw.replace("El anexo PDF anterior aún contiene el origen viejo y no debe usarse como versión vigente.","Los cálculos locales permanecen invariantes ante la traslación.")
            line=raw.strip()
        if line.startswith("```"):
            flush_para();flush_table()
            if in_code:
                for codeline in code:
                    out.append(Paragraph(html.escape(codeline).replace(" ","&nbsp;"),ST["EVACode"]))
                code=[]
            in_code=not in_code
            continue
        if in_code:
            code.append(raw)
            continue
        if line.startswith("|"):
            flush_para();table.append(line);continue
        flush_table()
        if not line:
            flush_para();continue
        if line.startswith("## "):
            flush_para();title=line[3:]
            out.append(Paragraph(rich(title),ST["EVAH1"]))
            if kind=="informe" and title.startswith("2. Fase I"):
                out.extend((TraceFigure(),Paragraph("Figura 1. Trazas del relieve en y=0 y x=0, calculadas de f y limitadas al dominio físico.",ST["EVACaption"])))
            if kind=="informe" and title.startswith("6. Fase V"):
                out.extend((RegionFigure(),Paragraph("Figura 2. Región R usada en los límites polares y en las integrales dobles.",ST["EVACaption"])))
            if kind=="informe" and title.startswith("7. Fase VI"):
                out.extend((EllipsoidFigure(),Paragraph("Figura 3. Corte del semielipsoide E y sus dimensiones de planta.",ST["EVACaption"])))
            continue
        if line.startswith("### "):
            flush_para();out.append(Paragraph(rich(line[4:]),ST["EVAH2"]));continue
        if re.match(r"^([-*]|\d+\.)\s",line):
            flush_para();out.append(Paragraph(rich(line),ST["EVAList"]));continue
        if line.startswith("> "):
            flush_para();out.append(Paragraph(rich(line[2:]),ST["EVACode"]));continue
        para.append(raw)
    flush_para();flush_table()
    return out


def make_pdf(kind: str, source: Path, output: Path):
    title="INFORME TÉCNICO" if kind=="informe" else "ANEXO MATEMÁTICO"
    subtitle="Habitar Marte · diseño conceptual mediante cálculo multivariable"
    story=[Spacer(1,100),Paragraph("EVA03  /  MATEMÁTICA IV",ST["EVASub"]),
           Paragraph(title,ST["EVATitle"]),Paragraph(subtitle,ST["EVASub"]),
           Spacer(1,28),
           Paragraph("Universidad Mesoamericana · Facultad de Ingeniería",ST["EVACoverInfo"]),
           Paragraph("Juan Carlos Boteo · Haroldo Rodriguez · Davis Javier Rivera Aroche",ST["EVACoverInfo"]),
           Paragraph("Carnés, sección y fecha de entrega: por completar con el equipo.",ST["EVACoverInfo"]),
           Spacer(1,32),
           Paragraph("Versión técnica de 14 de octubre de 2026. Terreno y servicios de carácter académico y sintético; los límites físicos y operativos se declaran en el texto.",ST["EVABody"]),
           PageBreak(),Paragraph("Índice",ST["EVATitle"])]
    toc=TableOfContents();toc.levelStyles=[ST["EVATOC"],ST["EVATOC"]]
    story.extend((toc,PageBreak()))
    story.extend(markdown_story(source.read_text(encoding="utf-8"),kind))
    doc=EVADoc(str(output),title=title,author="Equipo EVA03",subject="Proyecto Integrador Matemática IV")
    doc.multiBuild(story)


def make_plan(output: Path):
    W,H=landscape(A4)
    c=canvas.Canvas(str(output),pagesize=(W,H),pageCompression=1)
    c.setTitle("Plano integrado EVA03 · versión final")
    c.setAuthor("Equipo EVA03")
    map_drawing(c,W,H)
    c.showPage();c.save()


if __name__=="__main__":
    MATERIALS.mkdir(parents=True,exist_ok=True)
    make_pdf("informe",MATERIALS/"Informe_Tecnico_EVA03_Fuente.md",MATERIALS/"Informe_Tecnico_EVA03_Final.pdf")
    make_pdf("anexo",MATERIALS/"Anexo_Matematico_EVA03_Fuente.md",MATERIALS/"Anexo_Matematico_EVA03_Final.pdf")
    make_plan(MATERIALS/"Plano_Integrado_EVA03_Final.pdf")
    print("Generados informe, anexo y plano final.")
