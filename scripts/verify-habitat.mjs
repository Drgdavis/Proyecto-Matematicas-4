import assert from 'node:assert/strict';
import {HABITAT,HABITAT_ACCESS_PATH,canWalkHabitat,walkFloor} from '../src/data/marsHabitat.ts';
// Follow the current approach through BOTH portals into the inhabited shell.
// The former fixed coordinates stayed outside the relocated habitat.
const path=[...HABITAT_ACCESS_PATH.map(p=>[p.x,p.z]),
 [HABITAT.airlockX,HABITAT.airlockZ],
 [HABITAT.airlockX,HABITAT.airlockZ+4.2],
 [HABITAT.x,HABITAT.z-10.2],
 [HABITAT.x,HABITAT.z-7.5]];
let previous=path[0],maxStep=0,maxGrade=0;
for(let i=1;i<path.length;i++){
 const a=path[i-1],b=path[i],samples=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.05);
 for(let j=1;j<=samples;j++){
 const t=j/samples,p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
 assert.ok(canWalkHabitat(...p,...previous),`Acceso bloqueado en ${p}`);
 const rise=Math.abs(walkFloor(...p)-walkFloor(...previous)),run=Math.hypot(p[0]-previous[0],p[1]-previous[1]);
 maxStep=Math.max(maxStep,rise);if(run>0)maxGrade=Math.max(maxGrade,rise/run);previous=p;
 }
}
assert.ok(Math.hypot(previous[0]-HABITAT.x,previous[1]-HABITAT.z)<9.65,'La ruta debe terminar dentro del hábitat.');
assert.ok(!canWalkHabitat(HABITAT.x,HABITAT.z,HABITAT.x,HABITAT.z+3),'La mesa debe bloquear el paso');
assert.ok(!canWalkHabitat(HABITAT.x+10,HABITAT.z,HABITAT.x+9,HABITAT.z),'La pared debe bloquear el paso');
assert.ok(canWalkHabitat(HABITAT.x,HABITAT.z+5,HABITAT.x,HABITAT.z+5),'Entrada rápida debe estar despejada');
const connectorRun=Math.abs((HABITAT.z-10.2)-(HABITAT.airlockZ+4.2));
const connectorRise=Math.abs(HABITAT.floor-HABITAT.airlockFloor);
console.log({scope:'B+ → rampa → esclusa → corredor → interior; suelo lógico, no colisión completa de mallas',maxStep,maxGrade,connectorRun,connectorRise,connectorGrade:connectorRise/connectorRun});
// Same conceptual 15% design limit as verify-rover-clearance; not a building code.
assert.ok(maxGrade<=.15,`Acceso completo: ${(maxGrade*100).toFixed(2)}%; supera el criterio geométrico interno del 15%. Ver hallazgo H01 en la auditoría maestra.`);
console.log('PASS: recorrido exterior-interior actual, pendiente, mesa, pared y punto de entrada.');
