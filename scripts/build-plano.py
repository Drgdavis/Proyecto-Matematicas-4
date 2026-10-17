from io import BytesIO
from pathlib import Path
import math

import numpy as np
from PIL import Image, ImageDraw
from pypdf import PdfReader, PdfWriter
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "public/materials/Plano_Integrado_EVA03.pdf"
REPORT = ROOT / "public/materials/Informe_Tecnico_EVA03.pdf"
PNG = ROOT / "tmp/pdfs/plano-actual-mapa.png"
PAGE = ROOT / "tmp/pdfs/plano-pagina-actual.pdf"
REPORT_PAGE = ROOT / "tmp/pdfs/informe-plano-pagina-actual.pdf"

# Refuse to regenerate the PDFs if their documented geometry diverges from
# the TypeScript model. The figures below use the same analytic f(x,y).
math_source = (ROOT / 'src/data/marsMath.ts').read_text(encoding='utf-8').replace(' ', '')
campus_source = (ROOT / 'src/components/colonyCampus.ts').read_text(encoding='utf-8').replace(' ', '')
habitat_source = (ROOT / 'src/data/marsHabitat.ts').read_text(encoding='utf-8').replace(' ', '')
for contract in ['routeRadius:72', 'a:18,b:14,c:8', 'tankX:0,tankY:-94',
                 'BPLUS_SITE={x:64.3988,y:-32.1994,z:19.1826}',
                 '18+6*((x*x+y*y)/6400-1)**2+.012*x-.006*y']:
    assert contract in math_source, f'Update the plan contract: {contract}'
assert 'constcx=-8,cz=8' in campus_source
assert 'consthabitatRadius=56,habitatAngle=-.65' in habitat_source


def elevation(x, y):
    return 18 + 6 * ((x*x + y*y) / 6400 - 1)**2 + .012*x - .006*y


def terrain_image():
    size = 1050
    grid = np.linspace(-110, 110, size, dtype=np.float64)
    xx, yy = np.meshgrid(grid, grid[::-1])
    zz = elevation(xx, yy)
    stops = np.array([16.5, 17.2, 18, 19, 20, 21, 22, 23, 24.5])
    colors = np.array([
        [30, 59, 130], [28, 102, 198], [30, 170, 217],
        [40, 193, 151], [150, 211, 93], [233, 221, 125],
        [194, 166, 119], [151, 125, 111], [232, 226, 213],
    ])
    rgb = np.stack([np.interp(zz, stops, colors[:, channel]) for channel in range(3)], axis=-1).astype('uint8')
    alpha = np.where(xx*xx + yy*yy <= 110**2, 255, 0).astype('uint8')
    image = Image.fromarray(np.dstack([rgb, alpha]), 'RGBA')
    draw = ImageDraw.Draw(image)
    # Contours come from the same analytic terrain function as the app.
    stride = 4
    sample = zz[::stride, ::stride]
    limit = sample.shape[0] - 1
    for level in [17, 18.5, 20, 21.5, 23, 24]:
        for row in range(limit):
            for col in range(limit):
                v = [sample[row, col], sample[row, col+1], sample[row+1, col+1], sample[row+1, col]]
                pts = [(col*stride, row*stride), ((col+1)*stride, row*stride),
                       ((col+1)*stride, (row+1)*stride), (col*stride, (row+1)*stride)]
                intersections = []
                for a, b in [(0, 1), (1, 2), (2, 3), (3, 0)]:
                    va, vb = v[a], v[b]
                    if (va-level)*(vb-level) >= 0:
                        continue
                    t = (level-va)/(vb-va)
                    intersections.append((pts[a][0]+t*(pts[b][0]-pts[a][0]),
                                          pts[a][1]+t*(pts[b][1]-pts[a][1])))
                if len(intersections) == 2:
                    draw.line(intersections, fill=(40, 51, 52, 110), width=2)
                elif len(intersections) == 4:
                    draw.line(intersections[:2], fill=(40, 51, 52, 110), width=2)
                    draw.line(intersections[2:], fill=(40, 51, 52, 110), width=2)
    image.putalpha(Image.fromarray(alpha))
    image.save(PNG)


def wrap_text(c, text, width, font, size):
    words = text.split()
    lines, line = [], ''
    for word in words:
        candidate = (line + ' ' + word).strip()
        if line and pdfmetrics.stringWidth(candidate, font, size) > width:
            lines.append(line)
            line = word
        else:
            line = candidate
    if line:
        lines.append(line)
    return lines


PNG.parent.mkdir(parents=True, exist_ok=True)
terrain_image()
reader = PdfReader(str(PDF))
assert len(reader.pages) == 3
width = float(reader.pages[2].mediabox.width)
height = float(reader.pages[2].mediabox.height)
pdfmetrics.registerFont(TTFont('Arial', r'C:\Windows\Fonts\arial.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Bold', r'C:\Windows\Fonts\arialbd.ttf'))

c = canvas.Canvas(str(PAGE), pagesize=(width, height))
navy, ink, green, blue = '#153447', '#263c49', '#226e59', '#285dc7'
c.setFillColor(navy)
c.setFont('Arial-Bold', 23)
c.drawString(66, height-70, 'Plano académico integrado')
c.setFillColor(ink)
c.setFont('Arial', 9)
c.drawString(66, height-89, 'EVA03 · terreno f(x,y), coordenadas vigentes y regiones de cálculo')

plot_x, plot_y, plot_size = 130, 337, 332
c.drawImage(ImageReader(str(PNG)), plot_x, plot_y, plot_size, plot_size, mask='auto')

def xy(x, y):
    return plot_x + (x+110)/220*plot_size, plot_y + (y+110)/220*plot_size

c.setStrokeColor(navy)
c.setLineWidth(.8)
c.circle(*xy(0, 0), plot_size/2, stroke=1, fill=0)
for tick in [-100, -50, 0, 50, 100]:
    tx, _ = xy(tick, -110)
    c.line(tx, plot_y-3, tx, plot_y)
    c.setFont('Arial', 7.5)
    c.drawCentredString(tx, plot_y-14, str(tick))
    _, ty = xy(-110, tick)
    c.line(plot_x-3, ty, plot_x, ty)
    c.drawRightString(plot_x-6, ty-2, str(tick))
c.setFont('Arial', 8)
c.drawCentredString(plot_x+plot_size/2, plot_y-28, 'x: Este local (m)')
c.saveState()
c.translate(plot_x-34, plot_y+plot_size/2)
c.rotate(90)
c.drawCentredString(0, 0, 'y: Norte local (m)')
c.restoreState()

# R is the solar-sector integration domain, not a complete orbital road.
angles = np.linspace(-math.pi/4, 0, 80)
region = c.beginPath()
region.moveTo(*xy(60*math.cos(angles[0]), 60*math.sin(angles[0])))
for angle in angles[1:]:
    region.lineTo(*xy(60*math.cos(angle), 60*math.sin(angle)))
for angle in angles[::-1]:
    region.lineTo(*xy(72*math.cos(angle), 72*math.sin(angle)))
region.close()
c.saveState()
c.setFillColor('#5ed5d3')
c.setFillAlpha(.4)
c.drawPath(region, stroke=0, fill=1)
c.restoreState()

c.setStrokeColor('#d85135')
c.setLineWidth(2)
route = c.beginPath()
start = -math.atan(.5)
for i, angle in enumerate(np.linspace(start, start+math.pi, 200)):
    px, py = xy(72*math.cos(angle), 72*math.sin(angle))
    (route.moveTo if i == 0 else route.lineTo)(px, py)
c.drawPath(route)

# Current reservoir location and its horizontal footprint, derived from MARS.
cx, cy = xy(0, -94)
c.saveState()
c.setFillColor('#78a5eb')
c.setFillAlpha(.48)
c.ellipse(*xy(-18, -108), *xy(18, -80), fill=1, stroke=0)
c.restoreState()
c.setStrokeColor(blue)
c.setLineWidth(2)
c.ellipse(*xy(-18, -108), *xy(18, -80), fill=0, stroke=1)

def marker(x, y, label, color, dx=5, dy=4):
    px, py = xy(x, y)
    c.setFillColor(color)
    c.circle(px, py, 2.5, stroke=0, fill=1)
    c.setFont('Arial-Bold', 8)
    c.drawString(px+dx, py+dy, label)

marker(64.3988, -32.1994, 'B+ · llegada', green, 5, 4)
marker(-64.3988, 32.1994, 'B-', '#9d4b3e', -16, 5)
marker(-8, 8, 'Núcleo', navy, -33, 6)
marker(44.581, -33.890, 'Hábitat', navy, -41, -13)
marker(0, -94, 'Depósito E', blue, 12, 8)
c.setFillColor(navy)
c.setFont('Arial-Bold', 7.5)
c.drawString(plot_x-4, plot_y+plot_size+9, 'Altura 16.5-24.5 m · curvas 17, 18.5, 20, 21.5, 23 y 24 m')

legend_y = plot_y-47
for x, color, label in [(120, '#d85135', 'r(t)'), (208, '#5ed5d3', 'R'),
                         (272, blue, 'Depósito E'), (385, green, 'B+')]:
    c.setStrokeColor(color)
    c.setLineWidth(4)
    c.line(x, legend_y, x+12, legend_y)
    c.setFillColor(ink)
    c.setFont('Arial', 8)
    c.drawString(x+17, legend_y-3, label)

c.setFillColor(navy)
c.setFont('Arial-Bold', 12)
c.drawString(66, 266, 'Lectura de la decisión')
paragraphs = [
    'B+ = (64.399, -32.199) m: plataforma de llegada elegida por la menor pendiente (3.788 %) sobre x² + y² = 72². Su sendero exterior conduce a la esclusa del hábitat.',
    'El radio de 72 m comparte escala con la trayectoria de reconocimiento y con el arco exterior de R. Es una frontera de comparación; el círculo completo no es una carretera construida.',
    'Núcleo = (-8, 8) m: distribuye las alas del campus. Su posición conceptual no fue optimizada por Lagrange. Depósito E: centro (0, -94) m y semiejes 18 × 14 × 8 m.',
    'R: 60 ≤ r ≤ 72 m, -45° ≤ θ ≤ 0°. r(t) recorre solo el semicírculo de reconocimiento. El plano superpone objetos al terreno original f sin modificarlo.',
]
y = 247
for paragraph in paragraphs:
    for line in wrap_text(c, paragraph, width-132, 'Arial', 9.1):
        c.setFillColor(ink)
        c.setFont('Arial', 9.1)
        c.drawString(66, y, line)
        y -= 12
    y -= 8
assert y > 43, f'Text overflow: {y}'
c.setStrokeColor('#d2dce0')
c.line(66, 43, width-66, 43)
c.setFillColor('#637e90')
c.setFont('Arial', 8)
c.drawString(66, 29, 'EVA03 · Plano integrado · fuente: modelo 3D actual')
c.drawRightString(width-66, 29, '3')
c.showPage()
c.save()

replacement = PdfReader(str(PAGE))
writer = PdfWriter()
writer.add_page(reader.pages[0])
writer.add_page(reader.pages[1])
writer.add_page(replacement.pages[0])
writer.add_metadata({k: str(v) for k, v in (reader.metadata or {}).items() if v is not None})
with PDF.open('wb') as stream:
    writer.write(stream)
print(f'Updated {PDF}; page size {width} x {height}; text end y={y}')


def draw_report_map(c, left, bottom, size):
    c.drawImage(ImageReader(str(PNG)), left, bottom, size, size, mask='auto')

    def point(x, y):
        return left+(x+110)/220*size, bottom+(y+110)/220*size

    c.setStrokeColor(navy)
    c.setLineWidth(.7)
    c.circle(*point(0, 0), size/2, stroke=1, fill=0)
    for tick in [-100, -50, 0, 50, 100]:
        tx, _ = point(tick, -110)
        c.setFont('Arial', 7)
        c.drawCentredString(tx, bottom-12, str(tick))
        _, ty = point(-110, tick)
        c.drawRightString(left-5, ty-2, str(tick))
    region = c.beginPath()
    angles = np.linspace(-math.pi/4, 0, 80)
    region.moveTo(*point(60*math.cos(angles[0]), 60*math.sin(angles[0])))
    for angle in angles[1:]:
        region.lineTo(*point(60*math.cos(angle), 60*math.sin(angle)))
    for angle in angles[::-1]:
        region.lineTo(*point(72*math.cos(angle), 72*math.sin(angle)))
    region.close()
    c.saveState()
    c.setFillColor('#5ed5d3')
    c.setFillAlpha(.4)
    c.drawPath(region, stroke=0, fill=1)
    c.restoreState()
    c.setStrokeColor('#d85135')
    c.setLineWidth(1.8)
    route = c.beginPath()
    for i, angle in enumerate(np.linspace(-math.atan(.5), math.pi-math.atan(.5), 160)):
        (route.moveTo if i == 0 else route.lineTo)(*point(72*math.cos(angle), 72*math.sin(angle)))
    c.drawPath(route)
    c.saveState()
    c.setFillColor('#78a5eb')
    c.setFillAlpha(.48)
    c.ellipse(*point(-18, -108), *point(18, -80), fill=1, stroke=0)
    c.restoreState()
    c.setStrokeColor(blue)
    c.setLineWidth(1.7)
    c.ellipse(*point(-18, -108), *point(18, -80), fill=0, stroke=1)
    for x, y, label, color, dx, dy in [
        (64.3988, -32.1994, 'B+ llegada', green, 4, 3),
        (-8, 8, 'Núcleo', navy, -31, 5),
        (44.581, -33.890, 'Hábitat', navy, -35, -12),
        (0, -94, 'E', blue, 5, 4),
    ]:
        px, py = point(x, y)
        c.setFillColor(color)
        c.circle(px, py, 2.3, stroke=0, fill=1)
        c.setFont('Arial-Bold', 7.5)
        c.drawString(px+dx, py+dy, label)


report = PdfReader(str(REPORT))
assert len(report.pages) == 12
report_width = float(report.pages[9].mediabox.width)
report_height = float(report.pages[9].mediabox.height)
assert (report_width, report_height) == (width, height)
c = canvas.Canvas(str(REPORT_PAGE), pagesize=(report_width, report_height))
c.setFillColor(navy)
c.setFont('Arial-Bold', 21)
c.drawString(66, report_height-70, '8. Plano integrado y demostración')
c.setFillColor(ink)
c.setFont('Arial', 9)
c.drawString(66, report_height-89, 'Figura 5 · terreno, ubicación, ruta, región R y depósito vigentes')
draw_report_map(c, 158, 381, 300)
paragraphs = [
    'El plano usa el mismo f(x,y) de la aplicación. El punto B+ = (64.399, -32.199) m minimiza la pendiente local (3.788 %) sobre la frontera x²+y²=72² y se materializa como plataforma de llegada con sendero hacia la esclusa del hábitat.',
    'El núcleo de distribución está en (-8, 8) m: su ubicación conceptual no proviene de Lagrange. El radio de 72 m comparte escala con la ruta de reconocimiento r(t) y el arco exterior de R, pero no representa una carretera circular completa.',
    'Depósito E: centro (0, -94) m, huella elíptica de semiejes 18 y 14 m, altura 8 m. R ocupa 60 ≤ r ≤ 72 m y -45° ≤ θ ≤ 0°. Las construcciones se superponen sin alterar el terreno matemático.',
    'Secuencia de exposición: terreno y trazas; pendientes en P/Q; comparación B±; rover y regla de la cadena; región polar; depósito, volumen y centro de masa; síntesis. La presentación interactiva permite pausar, repetir y consultar el desarrollo.',
    'El archivo 3D aislado del campus es una referencia visual parcial. La experiencia completa incluye terreno, regiones, etiquetas y animaciones; el PowerPoint y este informe son respaldos de la defensa.',
]
report_y = 356
for paragraph in paragraphs:
    for line in wrap_text(c, paragraph, report_width-132, 'Arial', 9.1):
        c.setFillColor(ink)
        c.setFont('Arial', 9.1)
        c.drawString(66, report_y, line)
        report_y -= 12
    report_y -= 8
assert report_y > 42, f'Report text overflow: {report_y}'
c.setStrokeColor('#d2dce0')
c.line(66, 43, report_width-66, 43)
c.setFillColor('#637e90')
c.setFont('Arial', 8)
c.drawString(66, 29, 'EVA03 · Informe técnico')
c.drawRightString(report_width-66, 29, '10')
c.showPage()
c.save()

replacement = PdfReader(str(REPORT_PAGE))
writer = PdfWriter()
for index, page in enumerate(report.pages):
    writer.add_page(replacement.pages[0] if index == 9 else page)
writer.add_metadata({k: str(v) for k, v in (report.metadata or {}).items() if v is not None})
with REPORT.open('wb') as stream:
    writer.write(stream)
print(f'Updated {REPORT}; page 10 text end y={report_y}')
for artifact in [PNG, PAGE, REPORT_PAGE]:
    artifact.unlink(missing_ok=True)
try:
    PNG.parent.rmdir()
except OSError:
    pass
