"""Reúne exclusivamente la documentación pública de la entrega."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json

ROOT=Path(__file__).resolve().parents[1]
MATERIALS=ROOT/'public/materials'
PDFS=['Informe_Tecnico_EVA03_Final.pdf','Anexo_Matematico_EVA03_Final.pdf','Plano_Integrado_EVA03_Final.pdf','Presentacion_EVA03_Defensa_Matematica_22_Escenas_Respaldo.pdf','Cinco_Estudios_Aplicados_EVA03.pdf']
team=json.loads((MATERIALS/'Identificacion_Equipo.json').read_text(encoding='utf-8'))
for name in PDFS:
    assert (MATERIALS/name).read_bytes().startswith(b'%PDF-'),name
base='https://drgdavis.github.io/Proyecto-Matematicas-4/'
links=f'''HABITAR MARTE — EVA03
Universidad Mesoamericana · Matemática IV

Entrega con video y documentos:
{base}materials/Entrega_EVA03.html

Proyecto interactivo:
{base}

Código fuente público:
https://github.com/Drgdavis/Proyecto-Matematicas-4

Documentos incluidos:
- Informe técnico: descripción y desarrollo del proyecto.
- Anexo matemático: formulación, procedimientos y resultados.
- Plano integrado: distribución de la base.
- Presentación de apoyo en PDF.
- Cinco estudios aplicados: datos, cálculos, gráficas y sensibilidad.
- Fotografía del equipo e identificación de integrantes.

La presentación interactiva, las animaciones y el video están en la página de entrega.
'''
identification='HABITAR MARTE — INTEGRANTES\n\n'+f"{team['universidad']}\n{team['facultad']}\nCurso: {team['curso']}\nDocente: {team['docente']}\n\n"+'\n'.join(f"{person['nombre']} — Carné {person['carne']}" for person in team['integrantes'])+'\n'
target=MATERIALS/'Documentacion_Final_EVA03.zip'
with ZipFile(target,'w',ZIP_DEFLATED,compresslevel=6) as archive:
    for name in PDFS: archive.write(MATERIALS/name,name)
    archive.write(MATERIALS/'Foto_Equipo_EVA03.png','Foto_Equipo_EVA03.png')
    archive.writestr('00_Contenido_y_Enlaces.txt',links.encode('utf-8'))
    archive.writestr('Integrantes.txt',identification.encode('utf-8'))
with ZipFile(target) as archive:
    assert archive.testzip() is None
    assert len(archive.namelist())==8
print(f'Entrega: {target.name} · {target.stat().st_size:,} bytes · 5 PDF, fotografía, integrantes y enlaces.')
