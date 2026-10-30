import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const materials=path.join(root,'public/materials');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const team=JSON.parse(read('public/materials/Identificacion_Equipo.json'));
assert.deepEqual(team.integrantes.map(person=>[person.nombre,person.carne]),[
 ['Juan Carlos Boteo Granados','202558502'],
 ['Carlos Haroldo Rodriguez Fuentes','202574501'],
 ['Davis Javier Rivera Aroche','202558500'],
]);
const app=read('src/App.tsx');
assert.match(app,/get\('eva01'\) === 'surface' \? 'surface' : 'solar'/);
assert.ok(app.includes('VIAJAR A MARTE'));
assert.ok(app.includes("assetUrl('/materials/Entrega_EVA03.html')"));
const html=read('public/materials/Entrega_EVA03.html');
for(const person of team.integrantes){assert.ok(html.includes(person.nombre));assert.ok(html.includes(person.carne));}
const base=new URL('https://example.org/Proyecto-Matematicas-4/materials/Entrega_EVA03.html');
for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)){
 const link=new URL(match[1],base);
 assert.ok(link.pathname.startsWith('/Proyecto-Matematicas-4/'),`El enlace pierde la subruta de Pages: ${match[1]}`);
 const relative=decodeURIComponent(link.pathname.slice('/Proyecto-Matematicas-4/'.length));
 if(relative)assert.ok(fs.existsSync(path.join(root,'public',relative)),`Falta ${relative}`);
}
const video=path.join(materials,'Video_Recorrido_EVA03.mp4');
assert.ok(fs.statSync(video).size>1000000,'El video está vacío o es una muestra incompleta.');
assert.ok(fs.statSync(video).size<95*1024*1024,'El video supera el tamaño previsto para la entrega en Git.');
const fd=fs.openSync(video,'r'),header=Buffer.alloc(12);fs.readSync(fd,header);fs.closeSync(fd);
assert.equal(header.toString('ascii',4,8),'ftyp');
const chapters=JSON.parse(read('public/materials/Recorrido_EVA03_Capitulos.json'));
assert.equal(chapters.temasMatematicos,53);
assert.equal(chapters.estudiosComplementarios,5);
assert.ok(chapters.capitulos.length>=60);
assert.ok(chapters.duracionSegundos>400);
for(let i=1;i<chapters.capitulos.length;i++)assert.ok(chapters.capitulos[i].inicioSegundos>chapters.capitulos[i-1].inicioSegundos);
console.log('PASS: inicio orbital, viaje a Marte, identificación, enlaces bajo subruta y video completo de la entrega.');
