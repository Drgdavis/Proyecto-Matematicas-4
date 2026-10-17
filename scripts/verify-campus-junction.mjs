import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {CAPSULE_PORTAL,createColonyCampus,INDUSTRY_ACCESS,industryFrontWallGeometry,WORKSHOP_NORTH_ACCESS} from '../src/components/colonyCampus.ts';
import {HABITAT,HABITAT_RING_ACCESS,HABITAT_ACCESS_PATH,LAB_ACCESS,GREENHOUSE,GREENHOUSE_ACCESS_PORTAL,GREENHOUSE_PRESSURE_PORTAL,GREENHOUSE_CORRIDOR,WORKSHOP_CARGO_LINK,ROVER_LOGISTICS_TRANSFER,ROVER_TRANSFER_BRANCH_T,canWalkHabitat,habitatPortal,labWalkway,segmentDistance,walkFloor} from '../src/data/marsHabitat.ts';
import {BPLUS_SITE,SOLAR_ARRAY_LAYOUT} from '../src/data/marsMath.ts';
import {habitatWallGeometry} from '../src/components/habitatWall.ts';
import {workshopFacadeGeometry,workshopNorthWallGeometry,workshopWestCargoWallGeometry,WORKSHOP_WEST_BAY,WORKSHOP_WEST_GATE,workshopGateOffset,prepareWorkshopForAccess} from '../src/components/workshopFacade.ts';
import {landscape,routeAt,START} from '../src/data/marsMath.ts';

function glbSize(path){
 const bytes=readFileSync(path),jsonLength=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+jsonLength).toString()),bounds=new T.Box3();
 function visit(index,parent){
  const node=doc.nodes[index],local=node.matrix?new T.Matrix4().fromArray(node.matrix):new T.Matrix4().compose(new T.Vector3(...(node.translation??[0,0,0])),new T.Quaternion(...(node.rotation??[0,0,0,1])),new T.Vector3(...(node.scale??[1,1,1]))),world=parent.clone().multiply(local);
  if(node.mesh!==undefined)for(const primitive of doc.meshes[node.mesh].primitives){const accessor=doc.accessors[primitive.attributes.POSITION];assert.ok(accessor.min&&accessor.max,`${path}: faltan límites de vértices`);for(const x of [accessor.min[0],accessor.max[0]])for(const y of [accessor.min[1],accessor.max[1]])for(const z of [accessor.min[2],accessor.max[2]])bounds.expandByPoint(new T.Vector3(x,y,z).applyMatrix4(world));}
  for(const child of node.children??[])visit(child,world);
 }
 for(const index of doc.scenes[doc.scene??0].nodes)visit(index,new T.Matrix4());
 assert.ok(!bounds.isEmpty(),`${path}: modelo vacío`);return bounds.getSize(new T.Vector3());
}

const {corridorRadius,openingRadius,floorOffset,walkwayWidth}=CAPSULE_PORTAL;
const clearWidth=(radius,drop)=>2*Math.sqrt(radius**2-drop**2);
assert.ok(clearWidth(corridorRadius,floorOffset+.08)>=walkwayWidth+.02,'Los peldaños atraviesan la pared inferior del tubo.');
assert.ok(clearWidth(openingRadius,floorOffset)>=1.85+.02,'El piso interior de la cápsula atraviesa la abertura circular.');

const campus=createColonyCampus(new T.Texture());
const terminal=campus.junctions.find(item=>item.id==='ala-este-terminal');
const distribution=campus.junctions.find(item=>item.id==='ala-este-distribucion');
const northJunctions=['ala-norte-distribucion-1','ala-norte-distribucion-2','ala-norte-terminal'].map(id=>campus.junctions.find(item=>item.id===id));
const westJunctions=['ala-oeste-distribucion-1','ala-oeste-distribucion-2','ala-oeste-terminal'].map(id=>campus.junctions.find(item=>item.id===id));
const ringJunctions=campus.ringJunctions;
const ring=campus.ringEastJunction;
const northEast=campus.ringNorthEastJunction;
const north=campus.ringNorthJunction;
assert.ok(terminal&&distribution,'Faltan las dos cámaras del ala este.');
assert.ok(northJunctions.every(Boolean),'Faltan las tres cámaras del ala norte.');
assert.ok(westJunctions.every(Boolean),'Faltan las tres cámaras del ala oeste.');
assert.equal(ringJunctions.length,8,'El anillo necesita sus ocho cámaras.');
assert.ok(ring,'Falta la cámara del nodo este del anillo.');
assert.ok(northEast,'Falta la cámara vecina del anillo noreste.');
assert.ok(north,'Falta la cámara del nodo norte.');
const core=campus.coreEastPortal;
const coreNorthEast=campus.coreNorthEastPortal;
assert.ok(core,'Falta el acceso oriental del núcleo.');
assert.ok(coreNorthEast,'Falta el acceso noreste del núcleo.');
assert.ok(core.radius>corridorRadius,'La piel exterior del tubo atraviesa el borde de la puerta del núcleo.');
assert.ok(clearWidth(core.radius,floorOffset)>=walkwayWidth+.02,'El piso del conducto no cabe en el acceso al núcleo.');
assert.ok(coreNorthEast.radius>corridorRadius&&clearWidth(coreNorthEast.radius,floorOffset)>=walkwayWidth+.02,'El tubo o piso no cabe en la puerta noreste del núcleo.');
assert.equal(ring.ports.length,4,'El nodo del anillo necesita cuatro huecos alineados.');
assert.equal(ring.supports.length,6,'La cámara hexagonal necesita seis apoyos de borde.');
assert.equal(northEast.ports.length,4,'El nodo noreste necesita cuatro huecos: anillo, núcleo e industria.');
assert.equal(northEast.supports.length,4,'El nodo noreste necesita cuatro apoyos exteriores.');
assert.equal(north.ports.length,3,'El nodo norte necesita llegada, salida noroeste y ramal habitacional.');
assert.equal(north.supports.length,4,'El nodo norte necesita cuatro apoyos exteriores.');
for(const port of north.ports){
 const run=Math.hypot(port.targetX-north.x,port.targetZ-north.z),fraction=north.apothem/run;
 assert.ok(Math.hypot(port.x-(north.x+(port.targetX-north.x)*fraction),port.z-(north.z+(port.targetZ-north.z)*fraction))<.001,`${port.kind}: hueco norte fuera del eje.`);
 assert.ok(Math.abs(port.y-(north.centerY+(port.targetY-north.centerY)*fraction))<.001,`${port.kind}: hueco norte a distinta cota.`);
 assert.ok(port.radius>corridorRadius,`${port.kind}: tubo más ancho que el hueco norte.`);
 assert.ok(Math.abs(port.targetY-north.centerY)/run<=.15,`${port.kind}: el piso norte excede el criterio interno de rampa.`);
}
for(const support of north.supports){
 assert.ok(support.topY>support.groundY+.5,'Apoyo norte sin terreno.');
 assert.ok(Math.hypot(support.x-north.x,support.z-north.z)>north.apothem,'Apoyo norte sobre el piso.');
 for(const port of north.ports){const dx=support.x-north.x,dz=support.z-north.z,along=dx*port.normalX+dz*port.normalZ,lateral=Math.abs(dx*port.normalZ-dz*port.normalX);assert.ok(along<=0||lateral>corridorRadius+.15,`Apoyo norte en el conducto ${port.kind}.`);}
}
for(const port of northEast.ports){
 const run=Math.hypot(port.targetX-northEast.x,port.targetZ-northEast.z),fraction=northEast.apothem/run;
 assert.ok(Math.hypot(port.x-(northEast.x+(port.targetX-northEast.x)*fraction),port.z-(northEast.z+(port.targetZ-northEast.z)*fraction))<.001,`${port.kind}: hueco noreste fuera del eje.`);
 assert.ok(Math.abs(port.y-(northEast.centerY+(port.targetY-northEast.centerY)*fraction))<.001,`${port.kind}: hueco noreste a distinta cota.`);
 assert.ok(port.radius>corridorRadius,`${port.kind}: tubo más ancho que el hueco noreste.`);
 assert.ok(Math.abs(port.targetY-northEast.centerY)/run<=.15,`${port.kind}: tramo noreste excede 15 %.`);
}
for(const support of northEast.supports){
 assert.ok(support.topY>support.groundY+.5,'Apoyo noreste sin terreno.');
 assert.ok(Math.hypot(support.x-northEast.x,support.z-northEast.z)>northEast.apothem,'Apoyo noreste en el piso de la cámara.');
 for(const port of northEast.ports){const dx=support.x-northEast.x,dz=support.z-northEast.z,along=dx*port.normalX+dz*port.normalZ,lateral=Math.abs(dx*port.normalZ-dz*port.normalX);assert.ok(along<=0||lateral>corridorRadius+.15,`Apoyo noreste en el conducto ${port.kind}.`);}
}
for(const port of ring.ports){
 const run=Math.hypot(port.targetX-ring.x,port.targetZ-ring.z);
 const expectedX=ring.x+(port.targetX-ring.x)*ring.apothem/run;
 const expectedZ=ring.z+(port.targetZ-ring.z)*ring.apothem/run;
 const expectedY=ring.centerY+(port.targetY-ring.centerY)*ring.apothem/run;
 assert.ok(Math.hypot(port.x-expectedX,port.z-expectedZ)<.001&&Math.abs(port.y-expectedY)<.001,`${port.kind}: hueco del anillo fuera del eje o cota del tubo.`);
 assert.ok(port.radius>corridorRadius,`${port.kind}: hueco del anillo más angosto que el tubo.`);
 assert.ok(Math.abs(port.targetY-ring.centerY)/run<=.15,`${port.kind}: tubo del anillo excede el criterio interno de rampa.`);
}
for(const support of ring.supports){
 assert.ok(support.topY>support.groundY+.5,'Un apoyo de la cámara del anillo no llega al terreno.');
 assert.ok(Math.hypot(support.x-ring.x,support.z-ring.z)>2.5,'Un apoyo de la cámara ocupa el piso central.');
}
assert.equal(terminal.ports.length,3,'El nodo terminal necesita un tronco y dos derivaciones.');
assert.equal(distribution.ports.length,4,'El nodo de distribución necesita dos troncales y dos derivaciones.');
assert.deepEqual(northJunctions.map(item=>item.ports.length),[4,4,3],'El ala norte necesita dos distribuidores y una cámara terminal.');
assert.deepEqual(westJunctions.map(item=>item.ports.length),[4,4,3],'El ala oeste necesita dos distribuidores y una cámara terminal.');
const branchJunctions=[distribution,terminal,...northJunctions,...westJunctions];
for(const junction of branchJunctions){
 assert.equal(junction.supports.length,4,`${junction.id}: faltan apoyos de esquina.`);
 const linked=campus.accessPorts.filter(port=>Math.hypot(port.junctionX-junction.x,port.junctionZ-junction.z)<.01);
 assert.equal(linked.length,2,`${junction.id}: faltan derivaciones a las dos cápsulas.`);
 for(const port of linked){
  const aperture=junction.ports.find(item=>item.kind===`cápsula-${port.side}`);
  assert.ok(aperture,`${port.moduleId}: falta hueco de la cámara.`);
  const fraction=junction.halfWidth/port.run;
  assert.ok(Math.hypot(aperture.x-(junction.x+(port.x-junction.x)*fraction),aperture.z-(junction.z+(port.z-junction.z)*fraction))<.001,`${port.moduleId}: hueco fuera del eje del tubo.`);
  assert.ok(Math.abs(aperture.y-(port.junctionY+port.rise*fraction))<.001,`${port.moduleId}: hueco y piso tienen cotas distintas.`);
  assert.ok(aperture.radius>corridorRadius,`${port.moduleId}: la pared reduce el diámetro útil del tubo.`);
 }
 for(const support of junction.supports){
  assert.ok(support.topY>support.groundY+.5,`${junction.id}: un apoyo no llega al terreno.`);
  assert.ok(Math.abs(support.z-junction.z)>1.3&&Math.abs(support.x-junction.x)>1.3,`${junction.id}: un apoyo ocupa un eje peatonal.`);
 }
}

const outgoing=distribution.ports.find(port=>port.kind==='tronco-saliente');
const incoming=terminal.ports.find(port=>port.kind==='tronco-entrante');
const ringIncoming=distribution.ports.find(port=>port.kind==='tronco-entrante');
assert.ok(outgoing&&incoming,'Faltan los dos extremos del tramo troncal compartido.');
assert.ok(ringIncoming,'Falta el hueco hacia el anillo en la cámara de distribución.');
assert.ok(Math.abs(outgoing.z-incoming.z)<.001&&outgoing.x<incoming.x,'El tronco este no une los ejes de ambas cámaras.');
const lineY=x=>outgoing.y+(incoming.y-outgoing.y)*(x-outgoing.x)/(incoming.x-outgoing.x);
assert.ok(Math.abs(lineY(distribution.x)-(distribution.floorY+floorOffset))<.001,'El piso sale a distinta cota del nodo de distribución.');
assert.ok(Math.abs(lineY(terminal.x)-(terminal.floorY+floorOffset))<.001,'El piso llega a distinta cota del nodo terminal.');
assert.ok(Math.abs(incoming.y-outgoing.y)/(incoming.x-outgoing.x)<=.15,'La pendiente troncal excede el criterio interno de rampa.');
assert.ok(Math.abs(ringIncoming.z-campus.ringEastPort.z)<.001&&ringIncoming.x>campus.ringEastPort.x,'El ramal al anillo no sigue el eje del portal este.');
const ringGrade=(distribution.floorY+floorOffset-campus.ringEastPort.y)/(distribution.x-campus.ringEastPort.x);
assert.ok(Math.abs(ringGrade)<=.15,'El tramo al anillo excede el criterio interno de rampa.');
assert.ok(Math.abs(ringIncoming.y-(distribution.floorY+floorOffset-ringGrade*distribution.halfWidth))<.001,'El hueco hacia el anillo no sigue la cota del tubo.');
assert.equal(campus.trunkSupports.length,68,'El circuito, las alas y los enlaces industrial, taller y hábitat necesitan treinta y cuatro pares de apoyos troncales.');
for(const support of campus.trunkSupports){
 assert.ok(Math.abs(support.topY-(support.axisY-corridorRadius-.1))<.001,'Un apoyo no toca la cara inferior del tronco.');
 assert.ok(support.topY>support.groundY+(support.segment==='anillo-hábitat'?.15:.5),'Un apoyo troncal no llega al terreno.');
 assert.ok(Math.abs(Math.hypot(support.x-support.axisX,support.z-support.axisZ)-1.42)<.001,'Un apoyo troncal invade el piso peatonal.');
 if(!support.segment.startsWith('ala-norte')&&!support.segment.includes('oeste'))assert.ok(Math.hypot(support.x,support.z)<60,'Un apoyo del anillo o ala este invade la franja del rover a r=72 m.');
}

// Check the rendered, batched opaque geometry. A clear ray must pass through
// each aperture; a parallel ray beside it must meet its surrounding wall.
const opaque=[];campus.root.updateMatrixWorld(true);
campus.root.traverse(object=>{if(object instanceof T.Mesh&&!object.material.transparent)opaque.push(object);});
const trunkStart=new T.Vector3(outgoing.x,outgoing.y,outgoing.z);
const trunkEnd=new T.Vector3(incoming.x,incoming.y,incoming.z);
const trunkDirection=trunkEnd.clone().sub(trunkStart).normalize();
const trunkHits=new T.Raycaster(trunkStart.clone().addScaledVector(trunkDirection,.12),trunkDirection,0,trunkStart.distanceTo(trunkEnd)-.24).intersectObjects(opaque,false);
assert.equal(trunkHits.length,0,'Un sólido bloquea el eje interior entre las dos cámaras este.');
const ringExit=ring.ports.find(port=>port.kind==='ala-este');
assert.ok(ringExit,'Falta el hueco del anillo hacia las cápsulas del este.');
const ringStart=new T.Vector3(ringIncoming.x,ringIncoming.y,ringIncoming.z);
const ringEnd=new T.Vector3(ringExit.x,ringExit.y,ringExit.z);
const ringDirection=ringEnd.clone().sub(ringStart).normalize();
assert.equal(new T.Raycaster(ringStart.clone().addScaledVector(ringDirection,.15),ringDirection,0,ringStart.distanceTo(ringEnd)-.3).intersectObjects(opaque,false).length,0,'El eje entre la cámara del anillo y el ala este está obstruido.');
for(const port of ring.ports){
 const outward=new T.Vector3(port.normalX,0,port.normalZ),side=new T.Vector3(-outward.z,0,outward.x).multiplyScalar(1.6);
 const test=(offset)=>{const origin=new T.Vector3(port.x,port.y,port.z).addScaledVector(outward,.4).add(offset);return new T.Raycaster(origin,outward.clone().negate(),0,.8).intersectObjects(opaque,false).length;};
 assert.equal(test(new T.Vector3()),0,`${port.kind}: el hueco del anillo contiene una pared.`);
 assert.ok(test(side)>0,`${port.kind}: falta pared contigua al hueco del anillo.`);
 if(port.kind==='núcleo'){
  assert.ok(Math.hypot(port.targetX-core.x,port.targetZ-core.z)<.001&&Math.abs(port.targetY-core.y)<.001,'El tubo no termina en el portal del núcleo.');
  assert.ok(Math.abs(core.floorY-(core.y-floorOffset))<.001,'El piso del núcleo no coincide con el conducto.');
  const start=new T.Vector3(port.x,port.y,port.z),end=new T.Vector3(core.x-2,core.y,core.z),direction=end.clone().sub(start).normalize();
  assert.equal(new T.Raycaster(start.clone().addScaledVector(direction,.15),direction,0,start.distanceTo(end)-.15).intersectObjects(opaque,false).length,0,'El conducto anillo→núcleo o el interior del núcleo contienen una pared.');
  const across=(z)=>new T.Raycaster(new T.Vector3(core.x+.45,core.y,z),new T.Vector3(-1,0,0),0,.9).intersectObjects(opaque,false).length;
  assert.equal(across(core.z),0,'El centro de la abertura del núcleo está obstruido.');
  assert.ok(across(core.z+1.5)>0&&across(core.z-1.5)>0,'Faltan paredes a ambos lados de la puerta del núcleo.');
 }else if(port.kind==='anillo-norte'){
  const arrival=northEast.ports.find(item=>item.kind==='anillo-este');
  assert.ok(arrival,'Falta el extremo noreste del conducto entre nodos.');
  const start=new T.Vector3(port.x,port.y,port.z),end=new T.Vector3(arrival.x,arrival.y,arrival.z),direction=end.clone().sub(start).normalize();
  assert.equal(new T.Raycaster(start.clone().addScaledVector(direction,.15),direction,0,start.distanceTo(end)-.3).intersectObjects(opaque,false).length,0,'El tubo este→noreste está obstruido.');
 }
}
for(const port of northEast.ports){
 const outward=new T.Vector3(port.normalX,0,port.normalZ),side=new T.Vector3(-outward.z,0,outward.x).multiplyScalar(1.6);
 const test=(offset)=>{const origin=new T.Vector3(port.x,port.y,port.z).addScaledVector(outward,.4).add(offset);return new T.Raycaster(origin,outward.clone().negate(),0,1.2).intersectObjects(opaque,false).length;};
 assert.equal(test(new T.Vector3()),0,`${port.kind}: el hueco noreste contiene una pared.`);
 assert.ok(test(side)>0,`${port.kind}: falta pared contigua al hueco noreste.`);
 if(port.kind==='núcleo'){
  assert.ok(Math.hypot(port.targetX-coreNorthEast.x,port.targetZ-coreNorthEast.z)<.001&&Math.abs(port.targetY-coreNorthEast.y)<.001,'El conducto noreste no termina en el núcleo.');
  assert.ok(Math.abs(coreNorthEast.floorY-(coreNorthEast.y-floorOffset))<.001,'El piso noreste no coincide con el conducto.');
  const normal=new T.Vector3(Math.SQRT1_2,0,Math.SQRT1_2),tangent=new T.Vector3(-Math.SQRT1_2,0,Math.SQRT1_2),start=new T.Vector3(port.x,port.y,port.z),end=new T.Vector3(coreNorthEast.x,coreNorthEast.y,coreNorthEast.z).addScaledVector(normal,-2),direction=end.clone().sub(start).normalize();
  assert.equal(new T.Raycaster(start.clone().addScaledVector(direction,.15),direction,0,start.distanceTo(end)-.15).intersectObjects(opaque,false).length,0,'El tubo noreste→núcleo o el interior contienen una pared.');
  const across=(offset)=>new T.Raycaster(new T.Vector3(coreNorthEast.x,coreNorthEast.y,coreNorthEast.z).addScaledVector(normal,.45).addScaledVector(tangent,offset),normal.clone().negate(),0,.9).intersectObjects(opaque,false).length;
  assert.equal(across(0),0,'La abertura noreste del núcleo está bloqueada.');
  assert.ok(across(-1.6)>0&&across(1.6)>0,'Falta pared junto a la abertura noreste del núcleo.');
 }else if(port.kind==='anillo-norte'){
  const arrival=north.ports.find(item=>item.kind==='anillo-noreste');
  assert.ok(arrival,'Falta el extremo norte del conducto noreste→norte.');
  const start=new T.Vector3(port.x,port.y,port.z),end=new T.Vector3(arrival.x,arrival.y,arrival.z),direction=end.clone().sub(start).normalize();
  assert.equal(new T.Raycaster(start.clone().addScaledVector(direction,.15),direction,0,start.distanceTo(end)-.3).intersectObjects(opaque,false).length,0,'El tubo noreste→norte está obstruido.');
 }
}
for(let i=0;i<northEast.ports.length;i++)for(let j=i+1;j<northEast.ports.length;j++){
 const start=new T.Vector3(northEast.ports[i].x,northEast.ports[i].y,northEast.ports[i].z),end=new T.Vector3(northEast.ports[j].x,northEast.ports[j].y,northEast.ports[j].z),direction=end.clone().sub(start).normalize();
 assert.equal(new T.Raycaster(start.clone().addScaledVector(direction,.12),direction,0,start.distanceTo(end)-.24).intersectObjects(opaque,false).length,0,`El interior noreste bloquea ${northEast.ports[i].kind}→${northEast.ports[j].kind}.`);
}
for(const port of north.ports){
 const outward=new T.Vector3(port.normalX,0,port.normalZ),side=new T.Vector3(-outward.z,0,outward.x).multiplyScalar(1.6);
 const test=(offset)=>{const origin=new T.Vector3(port.x,port.y,port.z).addScaledVector(outward,.4).add(offset);return new T.Raycaster(origin,outward.clone().negate(),0,1.2).intersectObjects(opaque,false).length;};
 assert.equal(test(new T.Vector3()),0,`${port.kind}: el hueco norte contiene una pared.`);
 assert.equal(test(side.clone().multiplyScalar(.55)),0,`${port.kind}: el borde positivo del hueco norte quedó cerrado.`);
 assert.equal(test(side.clone().multiplyScalar(-.55)),0,`${port.kind}: el borde negativo del hueco norte quedó cerrado.`);
 assert.ok(test(side)>0,`${port.kind}: falta pared junto al hueco norte.`);
}
const northArrival=north.ports.find(item=>item.kind==='anillo-noreste'),northExit=north.ports.find(item=>item.kind==='ala-norte');
assert.ok(northArrival&&northExit,'Falta un extremo de la cámara norte.');
const northInnerStart=new T.Vector3(northArrival.x,northArrival.y,northArrival.z),northInnerEnd=new T.Vector3(northExit.x,northExit.y,northExit.z),northInnerDirection=northInnerEnd.clone().sub(northInnerStart).normalize();
assert.equal(new T.Raycaster(northInnerStart.clone().addScaledVector(northInnerDirection,.12),northInnerDirection,0,northInnerStart.distanceTo(northInnerEnd)-.24).intersectObjects(opaque,false).length,0,'El interior norte bloquea el recorrido noreste→ala norte.');
const northRoute=[north,...northJunctions];
for(let i=0;i<northRoute.length-1;i++){
 const from=northRoute[i],to=northRoute[i+1],out=from.ports.find(item=>item.kind===(i===0?'ala-norte':'tronco-saliente')),arrival=to.ports.find(item=>item.kind==='tronco-entrante');
 assert.ok(out&&arrival,`Falta un portal troncal entre ${i} y ${i+1} del ala norte.`);
 const start=new T.Vector3(out.x,out.y,out.z),end=new T.Vector3(arrival.x,arrival.y,arrival.z),run=Math.hypot(to.x-from.x,to.z-from.z),rise=to.floorY-from.floorY;
 const crest=i===1?new T.Vector3(...campus.northBridge.crest):null,waypoints=crest?[start,crest,end]:[start,end];
 for(let k=0;k<waypoints.length-1;k++){
  const a=waypoints[k],b=waypoints[k+1],direction=b.clone().sub(a).normalize(),segmentRun=Math.hypot(b.x-a.x,b.z-a.z);
  assert.ok(Math.abs(b.y-a.y)/segmentRun<=.15,`Tronco norte ${i}: pendiente excesiva en tramo ${k}.`);
  assert.equal(new T.Raycaster(a.clone().addScaledVector(direction,.15),direction,0,a.distanceTo(b)-.3).intersectObjects(opaque,false).length,0,`Tronco norte ${i}: hay un sólido en el paso ${k}.`);
 }
 for(let j=0;j<=20;j++){
  const t=j/20,x=from.x+(to.x-from.x)*t,z=from.z+(to.z-from.z)*t,floor=crest?(z<=crest.z?from.floorY+(crest.y-floorOffset-from.floorY)*(z-from.z)/(crest.z-from.z):crest.y-floorOffset+(to.floorY-(crest.y-floorOffset))*(z-crest.z)/(to.z-crest.z)):from.floorY+rise*t;
  assert.ok(floor-landscape(x,z)>=(i===1?1.75:.1),`Tronco norte ${i}: piso demasiado cerca del terreno en ${z.toFixed(1)} m.`);
 }
}
for(let i=0;i<ring.ports.length;i++)for(let j=i+1;j<ring.ports.length;j++){
 const start=new T.Vector3(ring.ports[i].x,ring.ports[i].y,ring.ports[i].z),end=new T.Vector3(ring.ports[j].x,ring.ports[j].y,ring.ports[j].z),direction=end.clone().sub(start).normalize();
 assert.equal(new T.Raycaster(start.clone().addScaledVector(direction,.12),direction,0,start.distanceTo(end)-.24).intersectObjects(opaque,false).length,0,`El interior de la cámara del anillo bloquea ${ring.ports[i].kind}→${ring.ports[j].kind}.`);
}
for(const junction of branchJunctions)for(const port of junction.ports){
 const outward=new T.Vector3(port.x-junction.x,0,port.z-junction.z).normalize();
 const side=new T.Vector3(-outward.z,0,outward.x).multiplyScalar(1.65);
 const test=(offset)=>{const origin=new T.Vector3(port.x,port.y,port.z).addScaledVector(outward,.42).add(offset);return new T.Raycaster(origin,outward.clone().negate(),0,.85).intersectObjects(opaque,false).length;};
 assert.equal(test(new T.Vector3()),0,`${junction.id}/${port.kind}: la abertura contiene una pared opaca.`);
 assert.ok(test(side)>0,`${junction.id}/${port.kind}: falta pared al lado de la abertura.`);
}
for(const junction of branchJunctions)for(let i=0;i<junction.ports.length;i++)for(let j=i+1;j<junction.ports.length;j++){
 const start=new T.Vector3(junction.ports[i].x,junction.ports[i].y,junction.ports[i].z),end=new T.Vector3(junction.ports[j].x,junction.ports[j].y,junction.ports[j].z),direction=end.clone().sub(start).normalize();
 assert.equal(new T.Raycaster(start.clone().addScaledVector(direction,.12),direction,0,start.distanceTo(end)-.24).intersectObjects(opaque,false).length,0,`${junction.id}: una pared cruza la cámara entre dos portales.`);
}
const westRoute=[ringJunctions[4],...westJunctions];
for(const [index,junction] of ringJunctions.entries()){
 assert.ok(junction,`Falta el nodo ${index} del anillo.`);
 assert.ok(junction.supports.length>=4,`Nodo ${index}: faltan apoyos de borde.`);
 for(const port of junction.ports){
  const outward=new T.Vector3(port.x-junction.x,0,port.z-junction.z).normalize(),side=new T.Vector3(-outward.z,0,outward.x).multiplyScalar(1.65);
  const wallAt=offset=>new T.Raycaster(new T.Vector3(port.x,port.y,port.z).addScaledVector(outward,.4).add(offset),outward.clone().negate(),0,1.2).intersectObjects(opaque,false).length;
  assert.equal(wallAt(new T.Vector3()),0,`Nodo ${index}/${port.kind}: hueco bloqueado.`);
  assert.ok(wallAt(side)>0,`Nodo ${index}/${port.kind}: falta pared contigua.`);
  if(port.targetX!==undefined){
   const run=Math.hypot(port.targetX-junction.x,port.targetZ-junction.z);
   assert.ok(Math.abs(port.targetY-junction.centerY)/run<=.15,`Nodo ${index}/${port.kind}: pendiente superior al 15 %.`);
  }
 }
 for(const support of junction.supports){
  assert.ok(support.topY>support.groundY+.5,`Nodo ${index}: apoyo sin terreno.`);
  for(const port of junction.ports){const dx=support.x-junction.x,dz=support.z-junction.z,nx=(port.x-junction.x)/junction.apothem,nz=(port.z-junction.z)/junction.apothem,along=dx*nx+dz*nz,lateral=Math.abs(dx*nz-dz*nx);assert.ok(along<=0||lateral>corridorRadius+.15,`Nodo ${index}: apoyo ocupa el paso ${port.kind}.`);}
 }
 for(let i=0;i<junction.ports.length;i++)for(let j=i+1;j<junction.ports.length;j++){
  const a=junction.ports[i],b=junction.ports[j],start=new T.Vector3(a.x,a.y,a.z),end=new T.Vector3(b.x,b.y,b.z),direction=end.clone().sub(start).normalize();
  assert.equal(new T.Raycaster(start.clone().addScaledVector(direction,.12),direction,0,start.distanceTo(end)-.24).intersectObjects(opaque,false).length,0,`Nodo ${index}: interior bloqueado ${a.kind}→${b.kind}.`);
 }
 const next=ringJunctions[(index+1)%ringJunctions.length];
 const out=junction.ports.find(port=>Math.hypot(port.targetX-next.x,port.targetZ-next.z)<.01);
 const arrival=next.ports.find(port=>Math.hypot(port.targetX-junction.x,port.targetZ-junction.z)<.01);
 assert.ok(out&&arrival,`Anillo ${index}→${(index+1)%8}: faltan extremos compatibles.`);
 const start=new T.Vector3(out.x,out.y,out.z),end=new T.Vector3(arrival.x,arrival.y,arrival.z),direction=end.clone().sub(start).normalize();
 assert.equal(new T.Raycaster(start.clone().addScaledVector(direction,.15),direction,0,start.distanceTo(end)-.3).intersectObjects(opaque,false).length,0,`Anillo ${index}→${(index+1)%8}: tubo obstruido.`);
 for(let sample=0;sample<=20;sample++){const t=sample/20,x=junction.x+(next.x-junction.x)*t,z=junction.z+(next.z-junction.z)*t,floor=junction.floorY+(next.floorY-junction.floorY)*t;assert.ok(floor-landscape(x,z)>.15,`Anillo ${index}: el piso se entierra bajo el terreno.`);}
}
assert.deepEqual(ringJunctions.map(junction=>junction.ports.length),[4,4,3,2,3,2,3,3],'El circuito debe tener solo los accesos que llegan a un destino.');
const workshop=ringJunctions[6].ports.find(port=>port.kind==='taller');
assert.ok(workshop,'Falta el portal del nodo sur hacia el taller.');
const workshopStart=new T.Vector3(workshop.x,workshop.y,workshop.z),workshopEnd=new T.Vector3(...campus.workshopAccess.door),workshopDirection=workshopEnd.clone().sub(workshopStart).normalize();
assert.ok(workshopEnd.distanceTo(new T.Vector3(workshop.targetX,workshop.targetY,workshop.targetZ))<.001,'El corredor no termina en el portal posterior del taller.');
assert.equal(new T.Raycaster(workshopStart.clone().addScaledVector(workshopDirection,.15),workshopDirection,0,workshopStart.distanceTo(workshopEnd)-.3).intersectObjects(opaque,false).length,0,'El corredor del taller contiene una pared opaca.');
assert.ok(campus.workshopAccess.link.grade<=.15,'La pendiente del anillo al taller supera 15 %.');
const workshopRampStart=new T.Vector3(...campus.workshopAccess.rampStart),workshopRampEnd=new T.Vector3(...campus.workshopAccess.rampEnd);
assert.ok(Math.abs(workshopRampStart.y-(workshopEnd.y-floorOffset))<.001,'La rampa interior del taller no empieza al nivel del tubo.');
assert.ok(Math.abs(workshopRampEnd.y-(WORKSHOP_NORTH_ACCESS.foundationY+.225))<.001,'La rampa interior del taller no acaba al nivel del piso.');
assert.ok(Math.abs(workshopRampStart.y-workshopRampEnd.y)/workshopRampStart.distanceTo(new T.Vector3(workshopRampEnd.x,workshopRampStart.y,workshopRampEnd.z))<=.15,'La rampa interior del taller excede 15 %.');
const workshopY=WORKSHOP_NORTH_ACCESS.foundationY,front=new T.Mesh(workshopFacadeGeometry(GREENHOUSE_CORRIDOR.startRise),new T.MeshBasicMaterial({side:T.DoubleSide}));front.position.set(-20,workshopY,-40.9);front.updateMatrixWorld(true);
const northWall=new T.Mesh(workshopNorthWallGeometry(WORKSHOP_NORTH_ACCESS.x+20,WORKSHOP_NORTH_ACCESS.centerRise,WORKSHOP_NORTH_ACCESS.radius),new T.MeshBasicMaterial({side:T.DoubleSide}));northWall.position.set(-20,workshopY,WORKSHOP_NORTH_ACCESS.z);northWall.updateMatrixWorld(true);
const northWallHit=(x,rise)=>new T.Raycaster(new T.Vector3(x,workshopY+rise,WORKSHOP_NORTH_ACCESS.z+.4),new T.Vector3(0,0,-1),0,.8).intersectObject(northWall).length;
for(const [dx,rise] of [[0,WORKSHOP_NORTH_ACCESS.centerRise],[-.6,WORKSHOP_NORTH_ACCESS.centerRise],[.6,WORKSHOP_NORTH_ACCESS.centerRise],[0,WORKSHOP_NORTH_ACCESS.centerRise-.9]])assert.equal(northWallHit(WORKSHOP_NORTH_ACCESS.x+dx,rise),0,'El mamparo norte bloquea la sección transitable al taller.');
for(const dx of [-1.65,1.65])assert.ok(northWallHit(WORKSHOP_NORTH_ACCESS.x+dx,WORKSHOP_NORTH_ACCESS.centerRise)>0,'Falta pared junto a la entrada norte del taller.');
assert.ok(clearWidth(WORKSHOP_NORTH_ACCESS.radius,.9+.07)>=1.65+.02,'La rampa interior no cabe en la boca norte del taller.');
const frontRay=(x,y)=>new T.Raycaster(new T.Vector3(x,y,-41.9),new T.Vector3(0,0,1),0,2).intersectObject(front).length;
assert.ok(frontRay(-24.2,workshopY+2)>0,'La antigua bahía sur sigue abierta.');
assert.equal(frontRay(-20,workshopY+GREENHOUSE_CORRIDOR.startRise),0,'La puerta peatonal sur quedó tapada.');
assert.ok(frontRay(-21.5,workshopY+2)>0,'Falta pared junto a la puerta peatonal.');
const westFacade=new T.Mesh(workshopWestCargoWallGeometry(),new T.MeshBasicMaterial({side:T.DoubleSide}));westFacade.position.set(-27,workshopY,-35);westFacade.rotation.y=Math.PI/2;westFacade.updateMatrixWorld(true);
const westRay=(z,y)=>new T.Raycaster(new T.Vector3(-28,y,z),new T.Vector3(1,0,0),0,2).intersectObject(westFacade).length;
assert.equal(westRay(-35,workshopY+2),0,'La pared fija tapa el hueco del portón oeste.');
assert.ok(westRay(-38,workshopY+2)>0,'La pared oeste está abierta fuera del portón.');
assert.equal(2*WORKSHOP_WEST_GATE.leafWidth,WORKSHOP_WEST_BAY.width,'Las dos hojas no cubren el ancho del portón.');
assert.ok(Math.abs(WORKSHOP_WEST_GATE.bottom-.225)<.001,'La compuerta no toca el piso del taller.');
assert.ok(Math.abs(WORKSHOP_WEST_GATE.bottom+WORKSHOP_WEST_GATE.height-WORKSHOP_WEST_BAY.height)<.001,'La compuerta deja un hueco superior.');
assert.ok(WORKSHOP_WEST_GATE.travel>=WORKSHOP_WEST_GATE.leafWidth+.025,'Las hojas no liberan el vano al abrirse.');
assert.ok(WORKSHOP_WEST_GATE.travel+WORKSHOP_WEST_GATE.leafWidth<=7,'Las hojas abiertas sobresalen de la fachada del taller.');
const gate=new T.Group(),gatePanels=[];
for(const side of [-1,1]){const panel=new T.Group();gate.add(panel);gatePanels.push({side,panel});const leaf=new T.Mesh(new T.BoxGeometry(WORKSHOP_WEST_GATE.thickness,WORKSHOP_WEST_GATE.height,WORKSHOP_WEST_GATE.leafWidth-.025),new T.MeshBasicMaterial());leaf.position.set(WORKSHOP_WEST_GATE.planeX,workshopY+WORKSHOP_WEST_GATE.bottom+WORKSHOP_WEST_GATE.height/2,WORKSHOP_WEST_GATE.centerZ+side*WORKSHOP_WEST_GATE.leafWidth/2);panel.add(leaf);const gasket=new T.Mesh(new T.CylinderGeometry(.06,.06,WORKSHOP_WEST_GATE.height,8),new T.MeshBasicMaterial());gasket.position.set(WORKSHOP_WEST_GATE.planeX-.1,workshopY+WORKSHOP_WEST_GATE.bottom+WORKSHOP_WEST_GATE.height/2,WORKSHOP_WEST_GATE.centerZ-side*.025);panel.add(gasket);}gate.updateMatrixWorld(true);
for(const z of [-37.2,-36,-35,-34,-32.8])for(const rise of [.35,2.5,4.8]){
 const ray=new T.Raycaster(new T.Vector3(-28,workshopY+rise,z),new T.Vector3(1,0,0),0,2);
 assert.ok(ray.intersectObjects(gate.children,true).length>0,`La compuerta cerrada deja paso en z=${z}, altura=${rise}.`);
}
for(const {side,panel} of gatePanels)panel.position.z=workshopGateOffset(side,1);
gate.updateMatrixWorld(true);
for(const z of [-37.2,-36,-35,-34,-32.8])for(const rise of [.35,2.5,4.8]){
 const ray=new T.Raycaster(new T.Vector3(-28,workshopY+rise,z),new T.Vector3(1,0,0),0,2);
 assert.equal(ray.intersectObjects(gate.children,true).length,0,`La compuerta abierta sigue tapando z=${z}, altura=${rise}.`);
}
const workshopBytes=readFileSync('public/models/eva01-workshop.glb'),workshopBuffer=workshopBytes.buffer.slice(workshopBytes.byteOffset,workshopBytes.byteOffset+workshopBytes.byteLength),workshopAsset=(await new GLTFLoader().parseAsync(workshopBuffer,'')).scene;
const rearWall=workshopAsset.children.find(part=>part.name==='Cerramiento_posterior');assert.ok(rearWall,'El GLB cambió el nombre de su pared posterior.');
workshopAsset.position.set(-20,workshopY,-35);workshopAsset.rotation.y=Math.PI;workshopAsset.updateMatrixWorld(true);
const northRay=()=>new T.Raycaster(new T.Vector3(WORKSHOP_NORTH_ACCESS.x,workshopY+WORKSHOP_NORTH_ACCESS.centerRise,-28.5),new T.Vector3(0,0,-1),0,1.2).intersectObject(workshopAsset,true).length;
assert.ok(northRay()>0,'La prueba necesita detectar el cerramiento GLB antes de retirarlo.');
const westAssetRay=()=>new T.Raycaster(new T.Vector3(-28,workshopY+2,-35),new T.Vector3(1,0,0),0,2).intersectObject(workshopAsset,true).length;
assert.ok(westAssetRay()>0,'La prueba necesita detectar la pared oeste original.');
prepareWorkshopForAccess(workshopAsset);workshopAsset.updateMatrixWorld(true);
assert.equal(northRay(),0,'El cerramiento GLB sigue tapando la puerta norte del taller.');
assert.equal(westAssetRay(),0,'El GLB sigue obstruyendo el portón oeste.');
for(const z of [-36.65,-35,-33.35])for(const rise of [.3,.7,1.2,2]){
 const hits=new T.Raycaster(new T.Vector3(-27.5,workshopY+rise,z),new T.Vector3(1,0,0),0,8).intersectObject(workshopAsset,true);
 assert.equal(hits.length,0,`El pasillo vehicular del taller está ocupado por ${hits[0]?.object.name}.`);
}
const cargoLandingTop=Math.max(...Array.from({length:48},(_,i)=>landscape(-77+14*Math.cos(i/48*Math.PI*2),-52+14*Math.sin(i/48*Math.PI*2))))+.45+.225;
const padDrivingTop=cargoLandingTop+.02;
const cargoStart=new T.Vector3(WORKSHOP_CARGO_LINK.startX,workshopY+.125,WORKSHOP_CARGO_LINK.startZ),cargoEnd=new T.Vector3(WORKSHOP_CARGO_LINK.endX,padDrivingTop-.1,WORKSHOP_CARGO_LINK.endZ),cargoRun=Math.hypot(cargoEnd.x-cargoStart.x,cargoEnd.z-cargoStart.z);
assert.ok(Math.abs(cargoEnd.y-cargoStart.y)/cargoRun<.15,'La plataforma de carga a taller supera el criterio interno de rampa.');
assert.ok(WORKSHOP_CARGO_LINK.width>2*2.055+.2,'La cubierta vehicular no admite la envolvente horizontal del rover.');
assert.ok(Math.abs(cargoStart.y+.1-(workshopY+.225))<.001,'El tablero no coincide con el piso del taller.');
const deckSurfaceAtPad=cargoEnd.y+.1*cargoRun/cargoStart.distanceTo(cargoEnd);
assert.ok(Math.abs(deckSurfaceAtPad-padDrivingTop)<.001,'El tablero no coincide con el piso vehicular de la plataforma.');
const roverSize=glbSize('public/models/nasa-perseverance.glb'),roverScale=3.1/Math.max(roverSize.x,roverSize.y,roverSize.z),cargoApproach=Math.atan2(cargoStart.z-cargoEnd.z,cargoStart.x-cargoEnd.x),doorHalfSpan=(roverSize.x*roverScale*Math.cos(cargoApproach)+roverSize.z*roverScale*Math.sin(cargoApproach))/2;
console.log(`Rover GLB escalado: ${(roverSize.x*roverScale).toFixed(3)} × ${(roverSize.y*roverScale).toFixed(3)} × ${(roverSize.z*roverScale).toFixed(3)} m (x, altura, norte).`);
assert.ok(WORKSHOP_WEST_BAY.width/2-doorHalfSpan>=.5,'El rover no cabe en el portón oeste con la orientación de llegada.');
assert.ok(WORKSHOP_WEST_BAY.height-roverSize.y*roverScale>=.5,'El rover no cabe en altura por el portón oeste.');
assert.ok(Math.abs(cargoApproach)<=15*Math.PI/180,'La plataforma no se alinea con el portón oeste.');
assert.ok(WORKSHOP_WEST_BAY.width-WORKSHOP_CARGO_LINK.width/Math.cos(cargoApproach)>=.1,'Los cantos del tablero penetran en las jambas del portón.');
assert.ok(Math.hypot(cargoEnd.x+77,cargoEnd.z+52)+WORKSHOP_CARGO_LINK.width/2<=14,'El ancho completo del tablero de carga no descansa en la plataforma logística.');
for(let sample=0;sample<=80;sample++){const t=sample/80,p=cargoStart.clone().lerp(cargoEnd,t);assert.ok(p.y-landscape(p.x,p.z)>2,'La cubierta vehicular choca con el terreno.');assert.ok(Math.hypot(p.x+8,p.z+62)>11.5+WORKSHOP_CARGO_LINK.width/2,'La cubierta vehicular invade el invernadero aprobado.');}
const transfer=ROVER_LOGISTICS_TRANSFER,routeBranch=routeAt(START+ROVER_TRANSFER_BRANCH_T),transferFirst=transfer.waypoints[0];
assert.ok(ROVER_TRANSFER_BRANCH_T>0&&ROVER_TRANSFER_BRANCH_T<Math.PI,'La derivación debe estar dentro del semicírculo calculado.');
assert.ok(Math.hypot(transferFirst.x-routeBranch[0],transferFirst.z-routeBranch[2])<1e-8,'El traslado todoterreno no comienza sobre r(t).');
assert.ok(transfer.width>2*2.055+.2,'El traslado todoterreno es más angosto que la envolvente del rover.');
const transferCurve=new T.CatmullRomCurve3(transfer.waypoints.map(p=>new T.Vector3(p.x,0,p.z)),false,'centripetal');
const routeBefore=routeAt(START+ROVER_TRANSFER_BRANCH_T-.0001),routeHeading=new T.Vector2(routeBranch[0]-routeBefore[0],routeBranch[2]-routeBefore[2]).normalize(),transferHeading=transferCurve.getTangent(0),joinAngle=routeHeading.angleTo(new T.Vector2(transferHeading.x,transferHeading.z));
assert.ok(joinAngle<=2*Math.PI/180,'La derivación exige un giro brusco al salir de r(t).');
assert.ok(transfer.rampStartT>.5&&transfer.rampStartT<1,'La rampa debe salir de la curva todoterreno antes de su antiguo extremo.');
let transferMinDomain=Infinity,transferMinModule=Infinity,transferMaxGrade=0,transferMinTurn=Infinity,transferTravel=0,previous=null;
for(let sample=0;sample<=1000;sample++){
 const t=transfer.rampStartT*sample/1000,p=transferCurve.getPoint(t),terrain=landscape(p.x,p.z);
 transferMinDomain=Math.min(transferMinDomain,110-Math.hypot(p.x,p.z)-transfer.width/2);
 transferMinModule=Math.min(transferMinModule,...campus.obstacles.map(module=>Math.hypot(p.x-module.x,p.z-module.z)-7.8-transfer.width/2));
 if(previous){const step=Math.hypot(p.x-previous.x,p.z-previous.z);transferTravel+=step;transferMaxGrade=Math.max(transferMaxGrade,Math.abs(terrain-previous.y)/step);}
 if(sample>0&&sample<1000){const a=transferCurve.getPoint(transfer.rampStartT*(sample-1)/1000),b=transferCurve.getPoint(transfer.rampStartT*(sample+1)/1000),incoming=p.clone().sub(a),outgoing=b.clone().sub(p),angle=incoming.angleTo(outgoing);transferMinTurn=Math.min(transferMinTurn,(incoming.length()+outgoing.length())/2/Math.max(angle,1e-12));}
 previous={x:p.x,y:terrain,z:p.z};
}
assert.ok(transferMinDomain>=1,'El traslado saca su envolvente fuera del disco físico D.');
assert.ok(transferMinModule>=1,'El traslado todoterreno invade un cimiento residencial.');
assert.ok(transferMaxGrade<=.15,'La pendiente del traslado todoterreno excede el criterio interno del 15 %.');
assert.ok(transferMinTurn>=6,'La curva del traslado exige un giro demasiado cerrado para la envolvente representada.');
assert.ok(transfer.stabilizedStartT>.3&&transfer.stabilizedStartT<transfer.rampStartT,'La franja estabilizada debe seguir a la huella exterior y terminar en la rampa.');
const bankRise=transfer.width*Math.tan(transfer.bankLimitDeg*Math.PI/180);
const roadSection=time=>{const p=transferCurve.getPoint(time),t=transferCurve.getTangent(time),normal=new T.Vector2(-t.z,t.x).normalize(),blend=Math.max(0,Math.min(1,(time-transfer.stabilizedStartT)/transfer.roadEntryBlendT)),entry=blend*blend*(3-2*blend),surfaceOffset=transfer.roadEntryLip+(.18-transfer.roadEntryLip)*entry,edges=[-1,1].map(side=>{const x=p.x+side*transfer.width/2*normal.x,z=p.z+side*transfer.width/2*normal.y,ground=landscape(x,z);return {x,z,ground,natural:ground+surfaceOffset};}),high=Math.max(...edges.map(e=>e.natural));return edges.map(e=>({...e,top:Math.max(e.natural,high-bankRise)}));};
let ungradedMaxBank=0,roadMaxBank=0,roadMaxGrade=0,roadMaxFill=0,roadMinTopTerrain=Infinity,roadMinDomain=Infinity,roadLength=0,roadPrevious=[null,null],roadCenterPrevious=null;
let shoulderMinCover=Infinity,shoulderMinDomain=Infinity,shoulderMinModule=Infinity,shoulderMaxSlope=0;
for(let i=0;i<=1000;i++){
 const time=transfer.stabilizedStartT*i/1000,edges=roadSection(time),bank=Math.atan2(Math.abs(edges[1].natural-edges[0].natural),transfer.width);
 ungradedMaxBank=Math.max(ungradedMaxBank,bank);
}
for(let i=0;i<=1000;i++){
 const time=transfer.stabilizedStartT+(transfer.rampStartT-transfer.stabilizedStartT)*i/1000,edges=roadSection(time),center=transferCurve.getPoint(time),bank=Math.atan2(Math.abs(edges[1].top-edges[0].top),transfer.width);
 roadMaxBank=Math.max(roadMaxBank,bank);if(roadCenterPrevious)roadLength+=center.distanceTo(roadCenterPrevious);roadCenterPrevious=center;
 for(const [index,edge] of edges.entries()){
  roadMaxFill=Math.max(roadMaxFill,edge.top-edge.ground);roadMinDomain=Math.min(roadMinDomain,110-Math.hypot(edge.x,edge.z));
  for(let across=0;across<=4;across++){const other=edges[1-index],s=across/4,x=edge.x*(1-s)+other.x*s,z=edge.z*(1-s)+other.z*s,y=edge.top*(1-s)+other.top*s;roadMinTopTerrain=Math.min(roadMinTopTerrain,y-landscape(x,z));}
  const before=roadPrevious[index];if(before)roadMaxGrade=Math.max(roadMaxGrade,Math.abs(edge.top-before.top)/Math.hypot(edge.x-before.x,edge.z-before.z));roadPrevious[index]=edge;
  const tangent=transferCurve.getTangent(time),normal=new T.Vector2(-tangent.z,tangent.x).normalize(),side=index===0?-1:1,toeX=center.x+side*(transfer.width/2+transfer.shoulderWidth)*normal.x,toeZ=center.z+side*(transfer.width/2+transfer.shoulderWidth)*normal.y,toeY=landscape(toeX,toeZ)+.03;
  shoulderMinDomain=Math.min(shoulderMinDomain,110-Math.hypot(toeX,toeZ));
  shoulderMinModule=Math.min(shoulderMinModule,...campus.obstacles.map(module=>Math.hypot(toeX-module.x,toeZ-module.z)-7.8));
  shoulderMaxSlope=Math.max(shoulderMaxSlope,Math.abs(edge.top-toeY)/transfer.shoulderWidth);
  for(let across=0;across<=8;across++){const s=across/8,x=edge.x*(1-s)+toeX*s,z=edge.z*(1-s)+toeZ*s,y=edge.top*(1-s)+toeY*s;shoulderMinCover=Math.min(shoulderMinCover,y-landscape(x,z));}
 }
}
assert.ok(ungradedMaxBank<=transfer.bankLimitDeg*Math.PI/180+.001,'La huella natural previa supera la inclinación lateral interna.');
assert.ok(roadMaxBank<=transfer.bankLimitDeg*Math.PI/180+.001,'La franja estabilizada supera la inclinación lateral interna.');
assert.ok(roadMaxGrade<=.15,`El borde de la franja estabilizada excede la pendiente longitudinal interna: ${(roadMaxGrade*100).toFixed(3)} %.`);
const roadEntryEdges=roadSection(transfer.stabilizedStartT);
assert.ok(Math.max(...roadEntryEdges.map(edge=>edge.top-edge.ground))<=.05,'El firme conserva un escalón al comenzar sobre el terreno natural.');
assert.ok(roadMinTopTerrain>=.02,'El piso estabilizado penetra el terreno en algún punto de su ancho.');
assert.ok(roadMinDomain>=1,'La franja estabilizada sale del dominio físico D.');
assert.ok(shoulderMinCover>=.02,'El talud lateral del firme se entierra bajo el terreno.');
assert.ok(shoulderMinDomain>=1,'El talud lateral sale del dominio físico D.');
assert.ok(shoulderMinModule>=1,'El talud lateral invade la franja libre de una cápsula.');
assert.ok(shoulderMaxSlope<=.65,'El talud lateral vuelve a ser una pared casi vertical.');
const rampEntry=transferCurve.getPoint(transfer.rampStartT),rampIncoming=transferCurve.getTangent(transfer.rampStartT).setY(0).normalize(),rampExit=new T.Vector3(transfer.rampEnd.x,0,transfer.rampEnd.z),rampOutgoing=new T.Vector3(cargoEnd.x-rampExit.x,0,cargoEnd.z-rampExit.z).normalize();
const rampCurve=new T.CubicBezierCurve3(rampEntry,rampEntry.clone().addScaledVector(rampIncoming,transfer.rampControlIn),rampExit.clone().addScaledVector(rampOutgoing,-transfer.rampControlOut),rampExit);
const rampSamples=300,rampCenters=Array.from({length:rampSamples+1},(_,i)=>rampCurve.getPoint(i/rampSamples)),rampDistances=[0];
for(let i=1;i<=rampSamples;i++)rampDistances.push(rampDistances[i-1]+rampCenters[i].distanceTo(rampCenters[i-1]));
const entryHeights=roadSection(transfer.rampStartT).map(edge=>edge.top-.07);
const smooth=u=>{const t=Math.max(0,Math.min(1,u));return t*t*(3-2*t);};
const rampCrown=fraction=>transfer.rampCrestHeight*smooth((fraction-transfer.rampCrestStart)/(transfer.rampCrestTop-transfer.rampCrestStart))*(1-smooth((fraction-transfer.rampCrestTop)/(1-transfer.rampCrestTop)));
let apronMinUnderside=Infinity,apronMaxGrade=0,apronMinTurn=Infinity,apronMinDomain=Infinity,apronMinLanderCenter=Infinity,apronMaxBank=0;
let padOverlapDepth=0;
const previousEdges=[null,null];
for(let sample=0;sample<=rampSamples;sample++){
 const p=rampCenters[sample],t=rampCurve.getTangent(sample/rampSamples),normal=new T.Vector2(-t.z,t.x).normalize(),progress=rampDistances[sample]/rampDistances[rampSamples],edgeY=[];
 apronMinLanderCenter=Math.min(apronMinLanderCenter,Math.hypot(p.x+77,p.z+52));
 if(sample>0&&sample<rampSamples){const a=rampCenters[sample-1],b=rampCenters[sample+1],v1=p.clone().sub(a),v2=b.clone().sub(p);apronMinTurn=Math.min(apronMinTurn,(v1.length()+v2.length())/2/Math.max(v1.angleTo(v2),1e-12));}
 for(const [index,side] of [-1,1].entries()){
  const x=p.x+side*transfer.width/2*normal.x,z=p.z+side*transfer.width/2*normal.y,y=entryHeights[index]*(1-progress)+(padDrivingTop-.07)*progress+rampCrown(progress);
  edgeY.push(y);apronMinUnderside=Math.min(apronMinUnderside,y-.07-landscape(x,z));apronMinDomain=Math.min(apronMinDomain,110-Math.hypot(x,z));
  if(Math.hypot(x+77,z+52)<=14.1)padOverlapDepth=Math.max(padOverlapDepth,cargoLandingTop-(y+.07));
  const before=previousEdges[index];if(before)apronMaxGrade=Math.max(apronMaxGrade,Math.abs(y-before.y)/Math.hypot(x-before.x,z-before.z));previousEdges[index]={x,z,y};
 }
 apronMaxBank=Math.max(apronMaxBank,Math.atan2(Math.abs(edgeY[1]-edgeY[0]),transfer.width));
}
assert.ok(padOverlapDepth<=.005,'La superficie de la plataforma tapa una parte de la rampa.');
assert.ok(apronMinUnderside>=.02,'El intradós de la rampa curva invade el terreno en alguno de sus bordes.');
assert.ok(apronMaxGrade<=.15,'Un borde de la rampa supera el criterio interno de pendiente longitudinal del 15 %.');
assert.ok(apronMinTurn>=6,'La rampa curva exige un giro demasiado cerrado.');
assert.ok(apronMinDomain>=1,'El ancho de la rampa sale del disco físico D.');
assert.ok(Math.hypot(rampExit.x+77,rampExit.z+52)+transfer.width/2<=14,'La rampa no entrega su ancho completo en la plataforma.');
const transferRampJoin=rampIncoming.angleTo(rampCurve.getTangent(0)),apronB=new T.Vector3(rampExit.x,padDrivingTop,rampExit.z);
const rampSurfaceAtPad=(padDrivingTop-.07)+.07;
const padDeckSurface=padDrivingTop-.08+.16/2;
const jointDeckSurface=padDrivingTop-.05+.1/2;
assert.ok(Math.abs(rampSurfaceAtPad-padDeckSurface)<.001,'La rampa deja un escalón en el piso de plataforma.');
assert.ok(Math.abs(padDeckSurface-jointDeckSurface)<.001,'La chapa deja un escalón en el piso de plataforma.');
assert.ok(Math.abs(jointDeckSurface-deckSurfaceAtPad)<.001,'La chapa deja un escalón hacia el tablero del taller.');
assert.ok(transferRampJoin<.001,'La rampa no empalma tangencialmente con la huella todoterreno.');
const landerBytes=readFileSync('public/models/eva01-cargo-lander.glb'),landerBuffer=landerBytes.buffer.slice(landerBytes.byteOffset,landerBytes.byteOffset+landerBytes.byteLength),landerAsset=(await new GLTFLoader().parseAsync(landerBuffer,'')).scene;
landerAsset.updateMatrixWorld(true);let landerRadius=0;const vertex=new T.Vector3();
landerAsset.traverse(part=>{if(!(part instanceof T.Mesh))return;const positions=part.geometry.attributes.position;for(let i=0;i<positions.count;i++){vertex.fromBufferAttribute(positions,i).applyMatrix4(part.matrixWorld);landerRadius=Math.max(landerRadius,Math.hypot(vertex.x,vertex.z));}});
const padChord=new T.Line3(apronB,cargoEnd),nearestLander=padChord.closestPointToPoint(new T.Vector3(-77,cargoLandingTop,-52),true,new T.Vector3()),landerGap=Math.hypot(nearestLander.x+77,nearestLander.z+52)-landerRadius-2.055;
assert.ok(landerGap>=1,'El traslado por la plataforma invade la envolvente real del módulo de aterrizaje.');
assert.ok(apronMinLanderCenter-landerRadius-transfer.width/2>=.5,'La rampa curva invade el módulo de aterrizaje.');
assert.ok(WORKSHOP_CARGO_LINK.jointWidth>=transfer.width+.1&&WORKSHOP_CARGO_LINK.jointLength>=2,'La chapa de unión no cubre ambos bordes del giro.');
const jointHeading=new T.Vector2(cargoEnd.x-apronB.x,cargoEnd.z-apronB.z).normalize(),jointNormal=new T.Vector2(-jointHeading.y,jointHeading.x),jointCenter=new T.Vector2(cargoEnd.x,cargoEnd.z);
for(const along of [-1,1])for(const side of [-1,1]){const corner=jointCenter.clone().addScaledVector(jointHeading,along*WORKSHOP_CARGO_LINK.jointLength/2).addScaledVector(jointNormal,side*WORKSHOP_CARGO_LINK.jointWidth/2);assert.ok(corner.distanceTo(new T.Vector2(-77,-52))<=14,'La chapa de unión sobresale de la plataforma logística.');}
const landerRelative=new T.Vector2(-77-cargoEnd.x,-52-cargoEnd.z),jointLanderGap=Math.hypot(Math.max(0,Math.abs(landerRelative.dot(jointHeading))-WORKSHOP_CARGO_LINK.jointLength/2),Math.max(0,Math.abs(landerRelative.dot(jointNormal))-WORKSHOP_CARGO_LINK.jointWidth/2))-landerRadius;
assert.ok(jointLanderGap>=.5,'La chapa de unión invade el módulo de aterrizaje.');
const padFloorGap=Math.hypot(nearestLander.x+77,nearestLander.z+52)-landerRadius-transfer.width/2;
assert.ok(padFloorGap>=.5,'El piso vehicular de la plataforma choca con el módulo de aterrizaje.');
const padRun=Math.hypot(apronB.x-cargoEnd.x,apronB.z-cargoEnd.z);
assert.ok(padRun>transfer.width*2,'Falta superficie de cruce entre la rampa y el tablero del taller.');
for(let sample=0;sample<=100;sample++){const p=apronB.clone().lerp(cargoEnd,sample/100);assert.ok(Math.hypot(p.x+77,p.z+52)+transfer.width/2<=14,'El piso vehicular sobresale de la plataforma.');}
console.log(`Traslado rover: ${transferTravel.toFixed(3)} m exteriores hasta la rampa; primera huella natural: inclinación lateral máx. ${(ungradedMaxBank*180/Math.PI).toFixed(3)}°; franja estabilizada ${roadLength.toFixed(3)} m, relleno total máx. ${roadMaxFill.toFixed(3)} m, inclinación lateral máx. ${(roadMaxBank*180/Math.PI).toFixed(3)}°, pendiente longitudinal máx. ${(roadMaxGrade*100).toFixed(3)} %; talud lateral ${transfer.shoulderWidth.toFixed(2)} m, pendiente máx. ${(shoulderMaxSlope*100).toFixed(3)} %, margen a cápsulas ${shoulderMinModule.toFixed(3)} m tras reserva de 1 m; empalme con r(t) ${(joinAngle*180/Math.PI).toFixed(3)}°; pendiente natural del eje máx. ${(transferMaxGrade*100).toFixed(3)} %; giro mín. ${transferMinTurn.toFixed(3)} m; margen de cápsulas ${transferMinModule.toFixed(3)} m.`);
const rampHeading=new T.Vector2(rampCurve.getTangent(1).x,rampCurve.getTangent(1).z),padHeading=new T.Vector2(cargoEnd.x-apronB.x,cargoEnd.z-apronB.z),deckHeading=new T.Vector2(cargoStart.x-cargoEnd.x,cargoStart.z-cargoEnd.z);
assert.ok(rampHeading.angleTo(padHeading)<.001,'La rampa llega girada respecto al piso de plataforma.');
// Sweep the scaled GLB's horizontal bounding rectangle along the chosen
// centreline. This catches body overhang at bends; it does not model steering,
// suspension, wheel contact, roll stability, or loads.
const vehicleHalfWidth=roverSize.x*roverScale/2,vehicleHalfLength=roverSize.z*roverScale/2;
const vehiclePath=[...Array.from({length:251},(_,i)=>{const p=transferCurve.getPoint(transfer.rampStartT*i/250);return {p:new T.Vector2(p.x,p.z),width:transfer.width};}),...Array.from({length:101},(_,i)=>{const p=rampCurve.getPoint(i/100);return {p:new T.Vector2(p.x,p.z),width:transfer.width};}),...Array.from({length:81},(_,i)=>({p:new T.Vector2(apronB.x+(cargoEnd.x-apronB.x)*i/80,apronB.z+(cargoEnd.z-apronB.z)*i/80),width:transfer.width})),...Array.from({length:181},(_,i)=>({p:new T.Vector2(cargoEnd.x+(cargoStart.x-cargoEnd.x)*i/180,cargoEnd.z+(cargoStart.z-cargoEnd.z)*i/180),width:WORKSHOP_CARGO_LINK.width}))];
const vehicleDistances=[0];for(let i=1;i<vehiclePath.length;i++)vehicleDistances[i]=vehicleDistances[i-1]+vehiclePath[i].p.distanceTo(vehiclePath[i-1].p);
let vehicleMinEdge=Infinity,vehicleMinLander=Infinity;
for(let i=5;i<vehiclePath.length-5;i+=2){
 if(vehicleDistances[i]<vehicleHalfLength+.1||vehicleDistances.at(-1)-vehicleDistances[i]<vehicleHalfLength+.1)continue;
 const at=vehiclePath[i].p,heading=vehiclePath[i+2].p.clone().sub(vehiclePath[i-2].p).normalize(),normal=new T.Vector2(-heading.y,heading.x);
 for(const forward of [-1,1])for(const side of [-1,1]){
  const corner=at.clone().addScaledVector(heading,forward*vehicleHalfLength).addScaledVector(normal,side*vehicleHalfWidth);
  let margin=-Infinity;
  for(let j=Math.max(0,i-24);j<Math.min(vehiclePath.length-1,i+24);j++){
   const a=vehiclePath[j].p,b=vehiclePath[j+1].p,v=b.clone().sub(a),lengthSquared=v.lengthSq();if(lengthSquared<1e-12)continue;
   const u=Math.max(0,Math.min(1,corner.clone().sub(a).dot(v)/lengthSquared)),nearest=a.clone().addScaledVector(v,u);
   margin=Math.max(margin,Math.min(vehiclePath[j].width,vehiclePath[j+1].width)/2-corner.distanceTo(nearest));
  }
  vehicleMinEdge=Math.min(vehicleMinEdge,margin);
  if(i>=251+101){vehicleMinLander=Math.min(vehicleMinLander,corner.distanceTo(new T.Vector2(-77,-52))-landerRadius);}
 }
}
assert.ok(vehicleMinEdge>=.1,'La envolvente rígida escalada del rover sobresale de la superficie de rodadura.');
assert.ok(vehicleMinLander>=.5,'La envolvente rígida del rover invade el módulo de aterrizaje.');
console.log(`Rampa curva: ${rampDistances[rampSamples].toFixed(3)} m; pendiente longitudinal por borde máx. ${(apronMaxGrade*100).toFixed(3)} %; radio mín. ${apronMinTurn.toFixed(3)} m; intradós mín. ${apronMinUnderside.toFixed(3)} m; inclinación transversal máx. ${(apronMaxBank*180/Math.PI).toFixed(3)}°; margen del dominio ${apronMinDomain.toFixed(3)} m.`);
console.log(`Barrido rígido muestreado del rover GLB: margen mínimo de carrocería al borde ${vehicleMinEdge.toFixed(3)} m; al módulo de aterrizaje ${vehicleMinLander.toFixed(3)} m.`);
console.log(`Acceso de carga: piso de plataforma ${padRun.toFixed(3)} m (holgura al módulo ${padFloorGap.toFixed(3)} m; chapa de unión ${jointLanderGap.toFixed(3)} m); tablero ${cargoRun.toFixed(3)} m al ${(100*Math.abs(cargoEnd.y-cargoStart.y)/cargoRun).toFixed(3)} %; llegada al portón ${(cargoApproach*180/Math.PI).toFixed(3)}°; holgura lateral por lado ${(WORKSHOP_WEST_BAY.width/2-doorHalfSpan).toFixed(3)} m; giros rampa/plataforma ${(rampHeading.angleTo(padHeading)*180/Math.PI).toFixed(3)}° y plataforma/tablero ${(padHeading.angleTo(deckHeading)*180/Math.PI).toFixed(3)}°.`);
for(let sample=0;sample<=20;sample++){const t=sample/20,x=campus.workshopAccess.ring[0]+(workshopEnd.x-campus.workshopAccess.ring[0])*t,z=campus.workshopAccess.ring[2]+(workshopEnd.z-campus.workshopAccess.ring[2])*t,floor=campus.workshopAccess.ring[1]-floorOffset+(workshopEnd.y-campus.workshopAccess.ring[1])*t;assert.ok(floor-landscape(x,z)>.15,'El piso hacia el taller se entierra bajo el terreno.');}
const habitat=ringJunctions[7].ports.find(port=>port.kind==='hábitat');
assert.ok(habitat,'Falta el portal sureste hacia el hábitat explorable.');
const habitatStart=new T.Vector3(habitat.x,habitat.y,habitat.z),habitatEnd=new T.Vector3(...campus.habitatAccess.door),habitatDirection=habitatEnd.clone().sub(habitatStart).normalize();
assert.ok(habitatEnd.distanceTo(new T.Vector3(HABITAT_RING_ACCESS.x,HABITAT_RING_ACCESS.centerY,HABITAT_RING_ACCESS.z))<.001,'El tubo no llega a la pared real del hábitat.');
assert.ok(Math.abs(ringJunctions[7].floorY-HABITAT_RING_ACCESS.ringFloor)<.001,'La cota del nodo sureste no coincide con el piso usado al caminar.');
assert.ok(Math.abs(walkFloor(HABITAT_RING_ACCESS.x,HABITAT_RING_ACCESS.z)-HABITAT.floor)<.001,'El piso de entrada al hábitat no coincide con el conducto.');
assert.ok(canWalkHabitat(HABITAT_RING_ACCESS.x,HABITAT_RING_ACCESS.z,HABITAT.x+9*Math.cos(HABITAT_RING_ACCESS.angle),HABITAT.z+9*Math.sin(HABITAT_RING_ACCESS.angle)),'El recorrido a pie bloquea la nueva puerta del hábitat.');
assert.equal(new T.Raycaster(habitatStart.clone().addScaledVector(habitatDirection,.15),habitatDirection,0,habitatStart.distanceTo(habitatEnd)-.3).intersectObjects(opaque,false).length,0,'El tubo hacia el hábitat contiene una pared opaca.');
assert.ok(campus.habitatAccess.link.grade<=.15,'La pendiente hacia el hábitat supera 15 %.');
for(let sample=0;sample<=40;sample++){const t=sample/40,x=campus.habitatAccess.ring[0]+(habitatEnd.x-campus.habitatAccess.ring[0])*t,z=campus.habitatAccess.ring[2]+(habitatEnd.z-campus.habitatAccess.ring[2])*t,floor=campus.habitatAccess.ring[1]-floorOffset+(habitatEnd.y-campus.habitatAccess.ring[1])*t;assert.ok(floor-landscape(x,z)>.15,'El piso al hábitat se entierra bajo el terreno.');}
for(const panel of SOLAR_ARRAY_LAYOUT)assert.ok(segmentDistance(panel.x,panel.z,habitatStart.x,habitatStart.z,habitatEnd.x,habitatEnd.z).distance>corridorRadius+1.84,'El conducto al hábitat invade un panel solar.');
for(const module of campus.obstacles)assert.ok(segmentDistance(module.x,module.z,habitatStart.x,habitatStart.z,habitatEnd.x,habitatEnd.z).distance>module.r+corridorRadius,'El conducto al hábitat invade una cápsula.');
const wallBase=HABITAT.floor-.18,habitatWall=new T.Mesh(habitatWallGeometry([{angle:-Math.PI/2,centerY:HABITAT.floor+.93-wallBase,radius:1.36},{angle:HABITAT_RING_ACCESS.angle,centerY:HABITAT_RING_ACCESS.centerY-wallBase,radius:HABITAT_RING_ACCESS.openingRadius},...LAB_ACCESS.map(lab=>({angle:lab.angle,centerY:lab.habitatCenterY-wallBase,radius:lab.openingRadius}))]),new T.MeshBasicMaterial({side:T.DoubleSide}));
habitatWall.position.set(HABITAT.x,wallBase,HABITAT.z);habitatWall.updateMatrixWorld(true);
for(const [angle,y] of [[-Math.PI/2,HABITAT.floor+.93],[HABITAT_RING_ACCESS.angle,HABITAT_RING_ACCESS.centerY],...LAB_ACCESS.map(lab=>[lab.angle,lab.habitatCenterY])]){
 const radial=new T.Vector3(Math.cos(angle),0,Math.sin(angle)),tangent=new T.Vector3(-radial.z,0,radial.x),origin=new T.Vector3(HABITAT.x,y,HABITAT.z).addScaledVector(radial,11.1),toward=radial.clone().negate();
 assert.equal(new T.Raycaster(origin,toward,0,1.8).intersectObject(habitatWall).length,0,'Una puerta del hábitat está tapada.');
 assert.ok(new T.Raycaster(origin.clone().addScaledVector(tangent,1.65),toward,0,1.8).intersectObject(habitatWall).length>0,'Falta pared contigua a una puerta del hábitat.');
}
assert.equal(LAB_ACCESS.length,2,'Deben existir dos puertos de laboratorio independientes.');
for(const lab of LAB_ACCESS){
 const start=new T.Vector3(lab.habitatX,lab.habitatCenterY,lab.habitatZ),end=new T.Vector3(lab.labX,lab.labCenterY,lab.z),run=Math.hypot(end.x-start.x,end.z-start.z),grade=Math.abs(end.y-start.y)/run,steps=Math.ceil(Math.abs(end.y-start.y)/.15);
 const westCapX=lab.x-6.7,firstTreadX=lab.x-6.65;
 assert.ok(lab.labX>=westCapX&&lab.labX-westCapX<=.05,`Laboratorio ${lab.index}: el conducto termina fuera del mamparo oeste.`);
 assert.ok(firstTreadX-lab.labX>=0&&firstTreadX-lab.labX<=.05,`Laboratorio ${lab.index}: queda un hueco de piso antes del primer peldaño.`);
 assert.ok(Math.abs(lab.padY-(lab.labCenterY-3.3))<1e-6,'El portal del laboratorio no usa la cota de su plataforma.');
 assert.ok(lab.index===0?grade<=.15:grade>.15&&Math.abs(end.y-start.y)/steps<=.15,'La rampa o escalera de laboratorio no corresponde al desnivel.');
 assert.ok(Math.abs(start.y-.93-HABITAT.floor)<.001,'El piso del conducto no coincide con el piso del hábitat.');
 assert.ok(habitatPortal(start.x,start.z)&&canWalkHabitat(start.x,start.z,HABITAT.x+9*Math.cos(lab.angle),HABITAT.z+9*Math.sin(lab.angle)),'La puerta de laboratorio queda bloqueada en modo a pie.');
 assert.ok(labWalkway(end.x,end.z)&&labWalkway(lab.x,lab.z),'La excepción de colisión no cubre el tubo y el pasillo interior.');
 assert.ok(Math.abs(walkFloor(end.x,end.z)-(lab.padY+2.37))<.16,'El umbral del laboratorio no coincide con su conducto.');
 assert.ok(Math.abs(walkFloor(lab.x,lab.z)-(lab.padY+.23))<.001,'Falta continuidad de la escalera al piso interior.');
 let walkingFloor=HABITAT.floor;for(let sample=0;sample<=200;sample++){const t=sample/200,x=start.x+(end.x-start.x)*t,z=start.z+(end.z-start.z)*t,nextFloor=walkFloor(x,z,walkingFloor);assert.ok(nextFloor-landscape(x,z)>1.2,`Laboratorio ${lab.index}: el recorrido abandona el nivel elevado.`);assert.ok(Math.abs(nextFloor-walkingFloor)<.16,`Laboratorio ${lab.index}: peldaño mayor a 16 cm o salto entre niveles.`);walkingFloor=nextFloor;}
 for(let segment=0;segment<HABITAT_ACCESS_PATH.length-1;segment++){const a=HABITAT_ACCESS_PATH[segment],b=HABITAT_ACCESS_PATH[segment+1];for(let sample=0;sample<=40;sample++){const t=sample/40,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,near=segmentDistance(x,z,start.x,start.z,end.x,end.z);if(near.distance>lab.openingRadius+1)continue;const ground=landscape(x,z),shellBottom=start.y+(end.y-start.y)*near.t-lab.openingRadius;assert.ok(shellBottom-walkFloor(x,z)>2.05,`Laboratorio ${lab.index}: el conducto no deja paso bajo el sendero B⁺.`);assert.ok(Math.abs(walkFloor(x,z)-ground)<.01,`Laboratorio ${lab.index}: el sendero salta al piso elevado.`);}}
 for(let sample=0;sample<=40;sample++){const t=sample/40,x=start.x+(end.x-start.x)*t,z=start.z+(end.z-start.z)*t,floor=start.y-.93+(end.y-start.y)*t;assert.ok(floor-landscape(x,z)>1.2,`Laboratorio ${lab.index}: el piso o apoyos se entierran en el terreno.`);}
 for(const panel of SOLAR_ARRAY_LAYOUT)assert.ok(segmentDistance(panel.x,panel.z,start.x,start.z,end.x,end.z).distance>3.12,`Laboratorio ${lab.index}: el tubo invade la huella solar.`);
 for(const other of LAB_ACCESS)if(other!==lab)assert.ok(segmentDistance(other.x,other.z,start.x,start.z,end.x,end.z).distance>9.7,`Laboratorio ${lab.index}: el tubo cruza otra plataforma.`);
}
const industry=ringJunctions[1].ports.find(port=>port.kind==='industria');
assert.ok(industry,'Falta el portal medido del enlace industrial.');
const industryStart=new T.Vector3(industry.x,industry.y,industry.z),industryEnd=new T.Vector3(industry.targetX,industry.targetY,industry.targetZ),industryDirection=industryEnd.clone().sub(industryStart).normalize();
assert.equal(new T.Raycaster(industryStart.clone().addScaledVector(industryDirection,.15),industryDirection,0,industryStart.distanceTo(industryEnd)-.3).intersectObjects(opaque,false).length,0,'El eje del pasillo industrial está obstruido.');
assert.ok(Math.abs(industry.targetY-northEast.centerY)/Math.hypot(industry.targetX-northEast.x,industry.targetZ-northEast.z)<=.15,'La pendiente hacia industria supera el criterio interno.');
assert.ok(industryEnd.distanceTo(new T.Vector3(...campus.industryAccess.door))<.001,'El pasillo no llega al hueco real del bloque industrial.');
const industryFront=new T.Mesh(industryFrontWallGeometry(),new T.MeshBasicMaterial({side:T.DoubleSide}));
industryFront.position.set(industryEnd.x,campus.industryAccess.floorY-.24,industryEnd.z);industryFront.updateMatrixWorld(true);
const industryFaceHit=(dx,rise)=>new T.Raycaster(new T.Vector3(industryEnd.x+dx,campus.industryAccess.floorY-.24+rise,industryEnd.z-.5),new T.Vector3(0,0,1),0,1).intersectObject(industryFront).length;
for(const [dx,rise] of [[0,INDUSTRY_ACCESS.centerRise],[-.7,INDUSTRY_ACCESS.centerRise],[.7,INDUSTRY_ACCESS.centerRise],[0,.9]])assert.equal(industryFaceHit(dx,rise),0,'El frente industrial tapa una parte transitable de la boca circular.');
for(const [dx,rise] of [[1.8,INDUSTRY_ACCESS.centerRise],[-1.8,INDUSTRY_ACCESS.centerRise],[0,3.45]])assert.ok(industryFaceHit(dx,rise)>0,'El frente industrial tiene una abertura fuera del portal.');
assert.ok(clearWidth(INDUSTRY_ACCESS.openingRadius,floorOffset+.08)>=walkwayWidth+.02,'El piso del pasillo industrial no cabe dentro de su abertura.');
assert.ok(Math.abs(INDUSTRY_ACCESS.centerRise-INDUSTRY_ACCESS.openingRadius-.24)<=.02,'La boca industrial deja un escalón vertical en el piso.');
assert.ok(Math.abs(INDUSTRY_ACCESS.parkedLeafOffset)>2*INDUSTRY_ACCESS.openingRadius+.25,'La hoja industrial estacionada invade el paso.');
const industrialRampStart=new T.Vector3(...campus.industryAccess.rampStart),industrialRampEnd=new T.Vector3(...campus.industryAccess.rampEnd);
assert.ok(Math.abs(industrialRampStart.y-(industryEnd.y-floorOffset))<.001,'La rampa interior comienza a distinta cota del corredor.');
assert.ok(Math.abs(industrialRampEnd.y+.07-campus.industryAccess.floorY)<.001,'La rampa no termina sobre el piso del bloque.');
assert.ok(Math.abs(industrialRampEnd.y-industrialRampStart.y)/Math.hypot(industrialRampEnd.x-industrialRampStart.x,industrialRampEnd.z-industrialRampStart.z)<=.15,'La rampa industrial supera 15 %.');
const doorwayClear=new T.Raycaster(industryEnd.clone().add(new T.Vector3(0,0,-.3)),new T.Vector3(0,0,1),0,.65).intersectObjects(opaque,false);
assert.equal(doorwayClear.length,0,'Una pared bloquea la puerta del bloque industrial.');
for(let i=0;i<westRoute.length-1;i++){
 const from=westRoute[i],to=westRoute[i+1],out=from.ports.find(port=>port.kind===(i===0?'ala-oeste':'tronco-saliente')),arrival=to.ports.find(port=>port.kind==='tronco-entrante');
 assert.ok(out&&arrival,`Ala oeste ${i}: faltan los portales del tronco.`);
 const start=new T.Vector3(out.x,out.y,out.z),end=new T.Vector3(arrival.x,arrival.y,arrival.z),direction=end.clone().sub(start).normalize();
 assert.ok(Math.abs(to.floorY-from.floorY)/Math.hypot(to.x-from.x,to.z-from.z)<=.15,`Ala oeste ${i}: pendiente mayor al 15 %.`);
 assert.equal(new T.Raycaster(start.clone().addScaledVector(direction,.15),direction,0,start.distanceTo(end)-.3).intersectObjects(opaque,false).length,0,`Ala oeste ${i}: tubo bloqueado.`);
 for(let sample=0;sample<=20;sample++){const t=sample/20,x=from.x+(to.x-from.x)*t,z=from.z+(to.z-from.z)*t,floor=from.floorY+(to.floorY-from.floorY)*t;assert.ok(floor-landscape(x,z)>.15,`Ala oeste ${i}: el piso se entierra bajo el terreno.`);}
}
assert.equal(campus.junctions.length,8,'Las tres alas necesitan ocho cámaras de distribución y terminales.');
assert.equal(ringJunctions.flatMap(junction=>junction.ports).length+2+campus.junctions.flatMap(junction=>junction.ports).length,55,'Inventario de huecos desactualizado.');
assert.equal(ringJunctions.flatMap(junction=>junction.supports).length+campus.junctions.flatMap(junction=>junction.supports).length,66,'Inventario de apoyos de cámara desactualizado.');
// Build an explicit access graph from the same measured portals checked above.
// An edge means a geometric passage; it does not assert a pressure seal.
const accessGraph=new Map(),edgeKinds=new Map();
const addNode=id=>{if(!accessGraph.has(id))accessGraph.set(id,new Set());};
const addEdge=(a,b,kind='paso interior')=>{const key=[a,b].sort().join('|');assert.ok(!edgeKinds.has(key)||edgeKinds.get(key)===kind,`Clasificaciones contradictorias de ${key}.`);edgeKinds.set(key,kind);addNode(a);addNode(b);accessGraph.get(a).add(b);accessGraph.get(b).add(a);};
const nearPlan=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)<.01;
for(const [index,junction] of ringJunctions.entries()){
 const id=`anillo-${index}`;addNode(id);
 for(const port of junction.ports){
  const target={x:port.targetX,z:port.targetZ},other=ringJunctions.findIndex(candidate=>candidate!==junction&&nearPlan(candidate,target));
  if(other>=0){
   assert.ok(ringJunctions[other].ports.some(back=>nearPlan({x:back.targetX,z:back.targetZ},junction)),`${id}: falta portal recíproco en el anillo.`);
   addEdge(id,`anillo-${other}`);continue;
  }
  if(nearPlan(target,campus.coreEastPortal)||nearPlan(target,campus.coreNorthEastPortal)){addEdge(id,'núcleo');continue;}
  const branch=campus.junctions.find(candidate=>nearPlan(candidate,target));
  if(branch){assert.ok(branch.ports.some(candidate=>candidate.kind==='tronco-entrante'),`${branch.id}: falta portal de entrada.`);addEdge(id,branch.id);continue;}
  const service=[['industria',campus.industryAccess.door],['taller',campus.workshopAccess.door],['hábitat',campus.habitatAccess.door]].find(([,position])=>nearPlan(target,{x:position[0],z:position[2]}));
  assert.ok(service,`${id}: el portal ${port.kind} no tiene destino constructivo conocido.`);
  addEdge(id,service[0]);
 }
}
for(const wing of ['ala-este','ala-norte','ala-oeste']){
 const branch=campus.junctions.filter(junction=>junction.id.startsWith(wing));
 const start=branch.find(junction=>[...accessGraph.values()].some(neighbors=>neighbors.has(junction.id)));
 assert.ok(start,`${wing}: ningún nodo del anillo alcanza la primera cámara.`);
 const ordered=[start],unvisited=branch.filter(junction=>junction!==start);
 while(unvisited.length){const previous=ordered.at(-1),next=unvisited.sort((a,b)=>Math.hypot(a.x-previous.x,a.z-previous.z)-Math.hypot(b.x-previous.x,b.z-previous.z)).shift();
  assert.ok(previous.ports.some(port=>port.kind==='tronco-saliente')&&next.ports.some(port=>port.kind==='tronco-entrante'),`${wing}: faltan extremos compatibles del tronco.`);
  addEdge(previous.id,next.id);ordered.push(next);
 }
}
for(const port of campus.accessPorts){
 const junction=campus.junctions.find(candidate=>nearPlan(candidate,{x:port.junctionX,z:port.junctionZ}));
 assert.ok(junction&&junction.ports.some(candidate=>candidate.kind===`cápsula-${port.side}`),`${port.moduleId}: no hay cámara y portal de entrada.`);
 addEdge(junction.id,port.moduleId);
}
for(const lab of LAB_ACCESS)addEdge('hábitat',`laboratorio-${lab.index+1}`);
// The approved three-door agricultural vestibule adds pedestrian destinations
// to the graph. Its exterior door is not a pressure-certified shortcut.
assert.ok(Math.abs(GREENHOUSE_CORRIDOR.startX+20)<.001&&Math.abs(GREENHOUSE_CORRIDOR.startZ+40.9)<.001,'El pasillo agrícola no nace en la puerta sur del taller.');
assert.ok(Math.abs(GREENHOUSE_PRESSURE_PORTAL.x-(GREENHOUSE_ACCESS_PORTAL.x+GREENHOUSE_ACCESS_PORTAL.innerX)/2)<.001&&Math.abs(GREENHOUSE_PRESSURE_PORTAL.z-GREENHOUSE_ACCESS_PORTAL.z-GREENHOUSE_ACCESS_PORTAL.vestibuleWidth/2)<.001,'El pasillo no desemboca en la pared de la esclusa agrícola.');
assert.ok(Math.abs(GREENHOUSE_ACCESS_PORTAL.innerX-(GREENHOUSE.x-9))<.001,'La puerta interior de la esclusa no llega al testero del invernadero.');
assert.ok(GREENHOUSE_ACCESS_PORTAL.rampStartX<GREENHOUSE_ACCESS_PORTAL.x-10,'La salida exterior carece de rampa separada.');
const agriculturalAccess=[
 ['taller','esclusa agrícola','conducto peatonal con cierres visuales'],
 ['esclusa agrícola','invernadero','puerta interior'],
 ['esclusa agrícola','exterior agrícola','puerta exterior y rampa'],
];
const agriculturalEdgeKinds=new Map();
for(const [from,to,kind] of agriculturalAccess){addEdge(from,to,kind);agriculturalEdgeKinds.set(`${from}→${to}`,kind);}
assert.deepEqual([...agriculturalEdgeKinds.values()],['conducto peatonal con cierres visuales','puerta interior','puerta exterior y rampa'],'La esclusa agrícola necesita tres relaciones de acceso distintas.');
assert.ok(Math.hypot(HABITAT_ACCESS_PATH[0].x-BPLUS_SITE.x,HABITAT_ACCESS_PATH[0].z-BPLUS_SITE.y)<.001,'El acceso exterior no nace en B+.');
assert.ok(Math.hypot(HABITAT_ACCESS_PATH.at(-1).x-HABITAT.airlockX,HABITAT_ACCESS_PATH.at(-1).z-(HABITAT.airlockZ-4.2))<.001,'El acceso B+ no llega a la esclusa del hábitat.');
addEdge('exterior B+','esclusa hábitat','sendero y rampa exterior');
addEdge('esclusa hábitat','hábitat','conducto peatonal con cierres visuales');
const reachable=new Set(['exterior B+']),queue=['exterior B+'];
for(let index=0;index<queue.length;index++)for(const next of accessGraph.get(queue[index])??[])if(!reachable.has(next)){reachable.add(next);queue.push(next);}
assert.deepEqual([...accessGraph.keys()].filter(id=>!reachable.has(id)),[],'Hay destinos sin ruta geométrica desde el acceso exterior B+.');
assert.equal(accessGraph.size,43,'El grafo de acceso cambió de inventario sin revisar sus destinos.');
assert.equal(edgeKinds.size,44,'La cantidad de pasos peatonales cambió sin revisar la red.');
assert.equal(edgeKinds.get(['exterior B+','esclusa hábitat'].sort().join('|')),'sendero y rampa exterior');
assert.equal(edgeKinds.get(['esclusa hábitat','hábitat'].sort().join('|')),'conducto peatonal con cierres visuales');
console.log(`Red peatonal geométrica: ${accessGraph.size} destinos, ${edgeKinds.size} tramos, todos alcanzables desde B+; accesos exteriores y agrícolas tipificados. Carga y servicios técnicos quedan fuera de este grafo.`);
console.log('PASS: ocho nodos forman un circuito cerrado; las tres alas, dieciséis cápsulas, bloque industrial, taller y hábitat explorable tienen ruta geométrica al núcleo. Cincuenta y cinco huecos, sesenta y seis apoyos de cámara y sesenta y ocho troncales.');
