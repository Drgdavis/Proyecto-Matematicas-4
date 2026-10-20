import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {Script} from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const deck=fs.readFileSync(path.join(root,'public/materials/Presentacion_EVA03_Defensa_Matematica_22_Escenas_Navegador.html'),'utf8');
new Script(deck.match(/<script>([\s\S]*?)<\/script>/)[1]);
const slides=JSON.parse(deck.match(/const slides=(\[[\s\S]*?\]);\s*const cues=/)[1]);
assert.equal(slides.length,22);assert.ok(slides.every(s=>s.steps.length===3&&!Object.hasOwn(s,'notes')));
assert.ok(!/notes|cabina|Notas del expositor/.test(deck));
const list=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?list(path.join(dir,e.name)):[path.join(dir,e.name)]);
assert.ok(!fs.existsSync(path.join(root,'src/presenter')));
assert.ok(!fs.existsSync(path.join(root,'server/cabina.cjs')));
const publicFiles=list(path.join(root,'public'));
assert.ok(!publicFiles.some(f=>/Guia_|Guion_|Auditoria_|\.pptx$/.test(f)));
const expedition=fs.readFileSync(path.join(root,'src/Expedition.tsx'),'utf8');
for(const m of expedition.matchAll(/assetUrl\('([^']+)'\)/g))if(m[1].startsWith('/materials/'))assert.ok(fs.existsSync(path.join(root,'public',m[1].slice(1))),m[1]);
assert.ok(!fs.readFileSync(path.join(root,'src/main.tsx'),'utf8').includes('CabinRoot'));
for(const name of ['Anexo_Matematico_EVA03_Fuente.md','Informe_Tecnico_EVA03_Fuente.md']){
 const text=fs.readFileSync(path.join(root,'public/materials',name),'utf8');
 assert.ok(!/Auditoria_EVA03|verify-traceability|PDF oficial conservado en la raíz/.test(text),name+' contiene referencias retiradas');
}
assert.ok(fs.existsSync(path.join(root,'public/materials/Identificacion_Equipo.json')));
console.log('PASS: presentación visual de 22 láminas, documentos enlazados y ausencia de guiones, notas y consola privada.');
