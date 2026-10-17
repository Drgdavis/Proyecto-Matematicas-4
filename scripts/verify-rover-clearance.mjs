import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {MARS,START,height,landscape,grad,routeAt,BPLUS_SITE,WATER_PIPE,WATER_PLANT,WATER_PLANT_WALKWAY,SERVICE_JUNCTION,SOLAR_ARRAY_LAYOUT,SOLAR_SUPPORT_LAYOUT,SOLAR_MODULE_SCALE,waterPipeAt,EAST_SERVICE_WALKWAY} from '../src/data/marsMath.ts';
import {HABITAT,HABITAT_ACCESS_PATH,GREENHOUSE,GREENHOUSE_BEDS,GREENHOUSE_PRESSURE_PORTAL,GREENHOUSE_ACCESS_PORTAL,GREENHOUSE_CORRIDOR,GREENHOUSE_ACCESS_ROUTE,greenhouseCorridorPlan,walkFloor} from '../src/data/marsHabitat.ts';
import {createColonyCampus} from '../src/components/colonyCampus.ts';

// Reconstruct conservative world-space bounds from GLB accessor bounds and
// node transforms. This matches the scale applied by marsScene to the rover.
function glbBounds(path,nodeFilter=()=>true){
 const bytes=readFileSync(path),jsonLength=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+jsonLength).toString());
 const bounds=new T.Box3();
 function visit(index,parent){
  const node=doc.nodes[index],local=node.matrix?new T.Matrix4().fromArray(node.matrix):new T.Matrix4().compose(new T.Vector3(...(node.translation??[0,0,0])),new T.Quaternion(...(node.rotation??[0,0,0,1])),new T.Vector3(...(node.scale??[1,1,1]))),world=parent.clone().multiply(local);
  if(node.mesh!==undefined&&nodeFilter(node))for(const primitive of doc.meshes[node.mesh].primitives){
   const accessor=doc.accessors[primitive.attributes.POSITION];assert.ok(accessor.min&&accessor.max,`${path}: faltan límites de vértices`);
   for(const x of [accessor.min[0],accessor.max[0]])for(const y of [accessor.min[1],accessor.max[1]])for(const z of [accessor.min[2],accessor.max[2]])bounds.expandByPoint(new T.Vector3(x,y,z).applyMatrix4(world));
  }
  for(const child of node.children??[])visit(child,world);
 }
 for(const index of doc.scenes[doc.scene??0].nodes)visit(index,new T.Matrix4());
 assert.ok(!bounds.isEmpty(),`${path}: modelo vacío`);
 return bounds.getSize(new T.Vector3());
}
const routeRadius=72,minClearance=1,roverSize=glbBounds('public/models/nasa-perseverance.glb'),roverScale=3.1/Math.max(roverSize.x,roverSize.y,roverSize.z),roverRadius=Math.hypot(roverSize.x,roverSize.z)*roverScale/2;
// Distance to the actual half-circle, including its endpoints. A full-ring
// radial check would count structures on the unused southern half as crossings.
function distanceToRoute(x,z){
 const angle=Math.atan2(z,x);
 return Math.min(...[angle-2*Math.PI,angle,angle+2*Math.PI].map(a=>{
  const t=Math.max(START,Math.min(START+Math.PI,a));
  return Math.hypot(x-routeRadius*Math.cos(t),z-routeRadius*Math.sin(t));
 }));
}
const solarSize=glbBounds('public/models/eva01-solar.glb');solarSize.x*=SOLAR_MODULE_SCALE;solarSize.z*=SOLAR_MODULE_SCALE;
const solarCellsSize=glbBounds('public/models/eva01-solar.glb',node=>node.name?.startsWith('Célula fotovoltaica'));
const solarCellEnvelopeArea=solarCellsSize.x*solarCellsSize.z*SOLAR_MODULE_SCALE**2;
const solarRadius=Math.hypot(solarSize.x,solarSize.z)/2;
assert.ok(Math.abs(solarCellEnvelopeArea-6)<.05,`La envolvente de células del panel representa ${solarCellEnvelopeArea.toFixed(2)} m² en vez de 6 m².`);
const solarPads=SOLAR_ARRAY_LAYOUT;
assert.equal(solarPads.length,20,'El modelo debe mostrar las 20 placas usadas en el cálculo de potencia.');
assert.deepEqual([61.14,64.45,67.74].map(radius=>solarPads.filter(panel=>Math.abs(Math.hypot(panel.x,panel.z)-radius)<1e-6).length),[6,7,7],'El campo necesita tres filas 6/7/7 dentro de R.');
function rectangleCorners(cx,cz,hx,hz,angle){
 const c=Math.cos(angle),s=Math.sin(angle);
 return [[-hx,-hz],[hx,-hz],[hx,hz],[-hx,hz]].map(([x,z])=>[cx+x*c-z*s,cz+x*s+z*c]);
}
function panelCorners(panel){return rectangleCorners(panel.x,panel.z,solarSize.x/2,solarSize.z/2,panel.angle);}
function rectangleSeparation(ac,bc){
 const axes=[];
 for(const corners of [ac,bc])for(let i=0;i<4;i++){const p=corners[i],q=corners[(i+1)%4],dx=q[0]-p[0],dz=q[1]-p[1],length=Math.hypot(dx,dz);axes.push([-dz/length,dx/length]);}
 let separation=0;
 for(const [x,z] of axes){const ap=ac.map(p=>p[0]*x+p[1]*z),bp=bc.map(p=>p[0]*x+p[1]*z);separation=Math.max(separation,Math.min(...bp)-Math.max(...ap),Math.min(...ap)-Math.max(...bp));}
 return separation;
}
function panelSeparation(a,b){return rectangleSeparation(panelCorners(a),panelCorners(b));}
const solarRows=[solarPads.slice(0,6),solarPads.slice(6,13),solarPads.slice(13)];
const solarAisleWidth=Math.min(...[0,1].map(index=>{
 const innerEdge=Math.max(...solarRows[index].flatMap(panel=>panelCorners(panel).map(([x,z])=>Math.hypot(x,z))));
 const outerEdge=Math.min(...solarRows[index+1].flatMap(panel=>panelCorners(panel).map(([x,z])=>Math.hypot(x,z))));
 return outerEdge-innerEdge;
}));
assert.ok(solarAisleWidth>=1,`Pasillos radiales solares de mantenimiento: solo ${solarAisleWidth.toFixed(2)} m libres.`);
const solarEntryWidth=Math.min(...solarPads.flatMap(panel=>panelCorners(panel).map(([,z])=>-z)));
assert.ok(solarEntryWidth>=1,`Borde oriental del campo solar: solo ${solarEntryWidth.toFixed(2)} m libres para entrar a las filas.`);
let minSolarPanelGap=Infinity,minSolarPanelPair='';
for(const [i,panel] of solarPads.entries()){
 const corners=panelCorners(panel);
 for(const [x,z] of corners){const r=Math.hypot(x,z),a=Math.atan2(z,x);assert.ok(r>=60&&r<=72,`Placa ${i+1}: huella fuera de R (r=${r.toFixed(2)} m)`);assert.ok(a>=-Math.PI/4&&a<=0,`Placa ${i+1}: huella fuera del sector angular R (θ=${a.toFixed(3)})`);}
 const routeGap=routeRadius-Math.max(...corners.map(([x,z])=>Math.hypot(x,z)))-roverRadius;
 assert.ok(routeGap>=minClearance,`Placa ${i+1}: solo ${routeGap.toFixed(2)} m libres de la envolvente del rover`);
 const habitatGap=Math.hypot(panel.x-HABITAT.x,panel.z-HABITAT.z)-solarRadius-11.3;
 assert.ok(habitatGap>=minClearance,`Placa ${i+1}: solo ${habitatGap.toFixed(2)} m libres del cimiento habitable`);
 for(let j=0;j<i;j++){const gap=panelSeparation(panel,solarPads[j]);if(gap<minSolarPanelGap){minSolarPanelGap=gap;minSolarPanelPair=`${j+1}/${i+1}`;}}
}
assert.ok(minSolarPanelGap>=1,`Separación mínima entre huellas solares ${minSolarPanelPair}: ${minSolarPanelGap.toFixed(4)} m.`);
const supportPads=SOLAR_SUPPORT_LAYOUT,allSolarPads=[...solarPads,...supportPads];
assert.equal(supportPads.length,24,'La ampliación debe tener 24 módulos distintos del sector R.');
assert.deepEqual([100,103.3,106.6].map(radius=>supportPads.filter(panel=>Math.abs(Math.hypot(panel.x,panel.z)-radius)<1e-6).length),[8,8,8],'La ampliación debe conservar tres filas 8/8/8.');
let supportMinGap=Infinity,supportMinRouteGap=Infinity,supportMinBplusGap=Infinity;
let supportMinLabGap=Infinity;
for(const [i,panel] of allSolarPads.entries()){
 if(i<solarPads.length)continue;
 const corners=panelCorners(panel);
 for(const [x,z] of corners)assert.ok(Math.hypot(x,z)<MARS.radius&&Math.hypot(x,z)>72,'El panel auxiliar debe estar dentro de D y fuera de R.');
 supportMinRouteGap=Math.min(supportMinRouteGap,...corners.map(([x,z])=>distanceToRoute(x,z)-roverRadius));
 supportMinBplusGap=Math.min(supportMinBplusGap,Math.hypot(panel.x-BPLUS_SITE.x,panel.z-BPLUS_SITE.y)-solarRadius-2);
 supportMinLabGap=Math.min(supportMinLabGap,...[[95,-28],[96,-45]].map(([x,z])=>Math.hypot(panel.x-x,panel.z-z)-solarRadius-8.4));
 assert.ok(Math.hypot(panel.x-HABITAT.x,panel.z-HABITAT.z)-solarRadius-11.3>=1,'La ampliación invade el hábitat.');
 for(let j=0;j<i;j++)supportMinGap=Math.min(supportMinGap,panelSeparation(panel,allSolarPads[j]));
}
assert.ok(supportMinGap>=1,`La ampliación deja solo ${supportMinGap.toFixed(3)} m entre paneles.`);
assert.ok(supportMinRouteGap>=1,`La ampliación invade la ruta del rover (${supportMinRouteGap.toFixed(3)} m).`);
assert.ok(supportMinBplusGap>=1,`La ampliación invade la llegada B⁺ (${supportMinBplusGap.toFixed(3)} m).`);
assert.ok(supportMinLabGap>=2,`La ampliación invade los cimientos de laboratorio (${supportMinLabGap.toFixed(3)} m).`);
const seeded=n=>{const a=Math.sin(n*127.1+31.7)*43758.54;return a-Math.floor(a);};
let closestRock=Infinity;
for(let i=0;i<650;i++){
 const radius=25+Math.sqrt(seeded(i+991))*430,rockRadius=.2+seeded(i+48)*2.1;
 if(radius<120&&Math.abs(radius-routeRadius)<5)continue;
 closestRock=Math.min(closestRock,Math.abs(radius-routeRadius)-rockRadius-roverRadius);
}
assert.ok(closestRock>=minClearance,`Rocas: solo ${closestRock.toFixed(2)} m libres de la envolvente del rover`);
// The rover is placed on the tangent plane. Check how far that plane deviates
// from the real terrain throughout its conservative horizontal footprint.
let maxContactDeviation=0;
for(let i=0;i<=360;i++){
 const point=routeAt(START+i/360*Math.PI),g=grad(point[0],point[2]);
 for(let j=0;j<24;j++){
  const angle=j/24*Math.PI*2,dx=roverRadius*Math.cos(angle),dz=roverRadius*Math.sin(angle);
  maxContactDeviation=Math.max(maxContactDeviation,Math.abs(height(point[0]+dx,point[2]+dz)-(point[1]+g[0]*dx+g[1]*dz)));
 }
}
assert.ok(maxContactDeviation<.02,`Apoyo sobre el terreno: desviación ${maxContactDeviation.toFixed(3)} m`);
// The water service pipe is buried along its entire course. Its plan view
// stays outside the actual half-arc used by the rover.
let minPipeCover=Infinity,minPipeRouteGap=Infinity;
const pipeCurve=new T.CatmullRomCurve3(Array.from({length:65},(_,i)=>new T.Vector3(...waterPipeAt(i/64))));
for(let i=0;i<=2000;i++){
 const {x,y,z}=pipeCurve.getPoint(i/2000);
 minPipeCover=Math.min(minPipeCover,landscape(x,z)-y-WATER_PIPE.radius);
 minPipeRouteGap=Math.min(minPipeRouteGap,distanceToRoute(x,z));
}
assert.ok(minPipeCover>.1,`Tubería: solo ${minPipeCover.toFixed(3)} m bajo la superficie`);
assert.ok(minPipeRouteGap>roverRadius+WATER_PIPE.radius+minClearance,`Tubería: separación horizontal insuficiente de la ruta (${minPipeRouteGap.toFixed(3)} m)`);
// Check the actual rotated paving envelope, not just the centre of its last
// tile. The approach ends before the rover's one-metre safety corridor.
let closestServicePaver=Infinity,closestServiceLight=Infinity;
for(let i=0;i<=EAST_SERVICE_WALKWAY.lastPaver;i++){
 const path=EAST_SERVICE_WALKWAY,t=i/path.divisions,x=path.startX+t*(path.endX-path.startX),z=path.startY+t*(path.endY-path.startY);
 const halfDiagonal=Math.hypot(path.paverWidth,path.paverLength)/2;
 closestServicePaver=Math.min(closestServicePaver,distanceToRoute(x,z)-halfDiagonal-roverRadius);
 if(i%4===0)closestServiceLight=Math.min(closestServiceLight,distanceToRoute(x+2,z)-.13-roverRadius);
}
assert.ok(closestServicePaver>=minClearance,`Sendero oriental: solo ${closestServicePaver.toFixed(3)} m libres del pavimento`);
assert.ok(closestServiceLight>=minClearance,`Luminarias del sendero oriental: solo ${closestServiceLight.toFixed(3)} m libres`);
const plantWalkwayDivisions=Math.ceil(Math.hypot(WATER_PLANT_WALKWAY.endX-WATER_PLANT_WALKWAY.startX,WATER_PLANT_WALKWAY.endY-WATER_PLANT_WALKWAY.startY)/1.35),plantWalkwayHalfDiagonal=Math.hypot(WATER_PLANT_WALKWAY.paverWidth,WATER_PLANT_WALKWAY.paverLength)/2;
let plantWalkwayRouteGap=Infinity,plantWalkwayFoundationGap=Infinity;
for(let i=0;i<=plantWalkwayDivisions;i++){const t=i/plantWalkwayDivisions,x=WATER_PLANT_WALKWAY.startX+t*(WATER_PLANT_WALKWAY.endX-WATER_PLANT_WALKWAY.startX),z=WATER_PLANT_WALKWAY.startY+t*(WATER_PLANT_WALKWAY.endY-WATER_PLANT_WALKWAY.startY),dx=Math.max(Math.abs(x-WATER_PLANT.x)-WATER_PLANT_WALKWAY.paverLength/2,0),dz=Math.max(Math.abs(z-WATER_PLANT.z)-WATER_PLANT_WALKWAY.paverWidth/2,0);plantWalkwayRouteGap=Math.min(plantWalkwayRouteGap,distanceToRoute(x,z)-plantWalkwayHalfDiagonal-roverRadius);plantWalkwayFoundationGap=Math.min(plantWalkwayFoundationGap,Math.hypot(dx,dz)-WATER_PLANT.foundationRadius);}
assert.ok(plantWalkwayRouteGap>=minClearance,`Sendero de tratamiento de agua: solo ${plantWalkwayRouteGap.toFixed(2)} m libres de ruta`);
assert.ok(plantWalkwayFoundationGap>=-.05,`Sendero de tratamiento de agua invade el cimiento (${plantWalkwayFoundationGap.toFixed(2)} m)`);
assert.ok(Math.hypot(WATER_PLANT_WALKWAY.startX-(SERVICE_JUNCTION.x+SERVICE_JUNCTION.size/2+WATER_PLANT_WALKWAY.paverLength/2),WATER_PLANT_WALKWAY.startY-SERVICE_JUNCTION.z)<.01,'La rampa de tratamiento debe salir del borde oriental del descanso compartido.');
assert.ok(Math.hypot(EAST_SERVICE_WALKWAY.startX-SERVICE_JUNCTION.x,EAST_SERVICE_WALKWAY.startY-SERVICE_JUNCTION.z)<.01,'El andador oriental debe compartir el nodo de distribución.');
assert.ok(Math.hypot(EAST_SERVICE_WALKWAY.endX-BPLUS_SITE.x,EAST_SERVICE_WALKWAY.endY-BPLUS_SITE.y)<.01,'El andador oriental debe terminar en B+.');
assert.ok(Math.hypot(GREENHOUSE_ACCESS_ROUTE[0].x-SERVICE_JUNCTION.x,GREENHOUSE_ACCESS_ROUTE[0].z-SERVICE_JUNCTION.z)<.01,'La ruta superficial al invernadero debe partir del nodo compartido.');
assert.ok(Math.hypot(GREENHOUSE_ACCESS_ROUTE.at(-1).x-GREENHOUSE_ACCESS_PORTAL.rampStartX,GREENHOUSE_ACCESS_ROUTE.at(-1).z-GREENHOUSE_ACCESS_PORTAL.rampStartZ)<.01,'El andador del invernadero debe llegar al pie de su rampa.');
const waterPlantTop=Math.max(...Array.from({length:48},(_,i)=>{const a=i/48*Math.PI*2;return landscape(WATER_PLANT.x+WATER_PLANT.foundationRadius*Math.cos(a),WATER_PLANT.z+WATER_PLANT.foundationRadius*Math.sin(a));}))+.675;
const waterRampEndY=waterPlantTop+WATER_PLANT_WALKWAY.endSurfaceOffset,waterRampRise=waterRampEndY-(landscape(WATER_PLANT_WALKWAY.startX,WATER_PLANT_WALKWAY.startY)+.13),waterRampGrade=waterRampRise/(WATER_PLANT_WALKWAY.endX-WATER_PLANT_WALKWAY.startX);
assert.ok(Math.abs(waterRampEndY-waterPlantTop)<.02,'La rampa de tratamiento termina a distinta cota de la plataforma.');
assert.ok(waterRampGrade>=0&&waterRampGrade<=.15,`Rampa de tratamiento: pendiente ${(waterRampGrade*100).toFixed(1)}%, supera 15%.`);
let habitatAccessRouteClearance=Infinity,habitatAccessSolarClearance=Infinity,habitatAccessAirlockClearance=Infinity,habitatAccessPlantClearance=Infinity,habitatAccessFoundationOverlap=0,habitatAccessPavers=0;
let habitatAccessMaxGrade=0;
assert.ok(Math.hypot(HABITAT_ACCESS_PATH.at(-1).x-HABITAT.airlockX,HABITAT_ACCESS_PATH.at(-1).z-(HABITAT.airlockZ-4.2))<.01,'El sendero debe terminar en el borde accesible de la esclusa.');
assert.ok(Math.hypot(HABITAT_ACCESS_PATH.at(-2).x-HABITAT.airlockX,HABITAT_ACCESS_PATH.at(-2).z-(HABITAT.airlockZ-17.4))<.01,'La rampa debe arrancar sobre el terreno al sur de la esclusa.');
for(let segment=0;segment<HABITAT_ACCESS_PATH.length-1;segment++){
 const a=HABITAT_ACCESS_PATH[segment],b=HABITAT_ACCESS_PATH[segment+1],divisions=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/1.5),angle=Math.atan2(b.x-a.x,b.z-a.z);
 let previousFloor=walkFloor(a.x,a.z),previousX=a.x,previousZ=a.z;
 for(let sample=1;sample<=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.25);sample++){
  const t=sample/Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.25),x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,floor=walkFloor(x,z),run=Math.hypot(x-previousX,z-previousZ);
  if(run>0)habitatAccessMaxGrade=Math.max(habitatAccessMaxGrade,Math.abs(floor-previousFloor)/run);
  previousFloor=floor;previousX=x;previousZ=z;
 }
 for(let i=1;i<=divisions;i++){
  const t=i/divisions,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,paver=rectangleCorners(x,z,.75,.75,-angle),bypassPad=segment===0&&Math.hypot(x-BPLUS_SITE.x,z-BPLUS_SITE.y)<4.5;
  habitatAccessPavers++;
  if(!bypassPad)habitatAccessRouteClearance=Math.min(habitatAccessRouteClearance,distanceToRoute(x,z)-Math.SQRT1_2*1.5-roverRadius);
  const solarClearances=allSolarPads.map(panel=>rectangleSeparation(paver,panelCorners(panel)));
  const solarClearance=Math.min(...solarClearances);
  assert.ok(solarClearance>=.4,`Sendero B⁺–hábitat próximo al panel ${solarClearances.indexOf(solarClearance)+1}: ${solarClearance.toFixed(2)} m en (${x.toFixed(1)},${z.toFixed(1)}).`);
  habitatAccessSolarClearance=Math.min(habitatAccessSolarClearance,solarClearance);
  const intendedRampApproach=segment===HABITAT_ACCESS_PATH.length-2||segment===HABITAT_ACCESS_PATH.length-3&&i===divisions;
  if(!intendedRampApproach)habitatAccessAirlockClearance=Math.min(habitatAccessAirlockClearance,Math.hypot(x-HABITAT.airlockX,z-HABITAT.airlockZ)-Math.SQRT1_2*1.5-4.2);
  habitatAccessPlantClearance=Math.min(habitatAccessPlantClearance,Math.hypot(x-WATER_PLANT.x,z-WATER_PLANT.z)-Math.SQRT1_2*1.5-WATER_PLANT.foundationRadius);
  const foundationGap=Math.hypot(x-HABITAT.x,z-HABITAT.z)-11.3-Math.SQRT1_2*1.5;
  habitatAccessFoundationOverlap=Math.max(habitatAccessFoundationOverlap,-foundationGap);
  if(!(segment===0&&i===divisions))assert.ok(foundationGap>=-.05,`Sendero B+–hábitat invade la cimentación fuera de su unión (${foundationGap.toFixed(2)} m)`);
 }
}
assert.ok(habitatAccessRouteClearance>=minClearance,`Sendero B+–hábitat: solo ${habitatAccessRouteClearance.toFixed(2)} m de holgura con el rover fuera de la plataforma B+`);
assert.ok(habitatAccessMaxGrade<=.15,`Sendero B+–hábitat y transición a esclusa: pendiente ${(habitatAccessMaxGrade*100).toFixed(1)}%, supera 15%.`);
assert.ok(habitatAccessSolarClearance>=0,`Sendero B+–hábitat invade las huellas solares (${habitatAccessSolarClearance.toFixed(2)} m)`);
assert.ok(habitatAccessAirlockClearance>=1,`Sendero B+–hábitat se acerca demasiado a la esclusa (${habitatAccessAirlockClearance.toFixed(2)} m)`);
assert.ok(habitatAccessPlantClearance>=1,`Sendero B+–hábitat se acerca demasiado a tratamiento (${habitatAccessPlantClearance.toFixed(2)} m)`);
const sites=[
  {name:'esclusa',x:HABITAT.airlockX,z:HABITAT.airlockZ,r:4.2},
  {name:'hábitat',x:HABITAT.x,z:HABITAT.z,r:11.3},
  {name:'tratamiento de agua',x:WATER_PLANT.x,z:WATER_PLANT.z,r:WATER_PLANT.foundationRadius},
  {name:'taller',x:-20,z:-35,r:10.2},
  {name:'plataforma logística',x:-77,z:-52,r:16.2},
  {name:'invernadero',x:GREENHOUSE.x,z:GREENHOUSE.z,r:GREENHOUSE.foundationRadius+.1},
  {name:'laboratorio A',x:95,z:-28,r:8.5},
  {name:'laboratorio B',x:96,z:-45,r:8.5},
];
for(const site of sites){
  const clearance=distanceToRoute(site.x,site.z)-site.r-roverRadius;
  assert.ok(clearance>=minClearance,`${site.name}: solo ${clearance.toFixed(2)} m libres de la carrocería`);
}
// Read the 16 module positions produced by the actual campus builder. Its slab
// widens each capsule's nominal radius by 1 m at the base.
const campus=createColonyCampus(new T.Texture());
let closestCampusModule={clearance:Infinity,x:0,z:0};
for(const module of campus.obstacles){
  const clearance=distanceToRoute(module.x,module.z)-(module.r+1)-roverRadius;
  if(clearance<closestCampusModule.clearance)closestCampusModule={clearance,x:module.x,z:module.z};
  assert.ok(clearance>=minClearance,`módulo del campus (${module.x.toFixed(1)},${module.z.toFixed(1)}): solo ${clearance.toFixed(2)} m libres`);
}
assert.equal(campus.obstacles.length,16,'Se esperaba revisar los 16 módulos periféricos del campus.');
assert.equal(campus.accessPorts.length,16,'Cada módulo residencial debe tener una boca de acceso presurizada visible.');
for(const port of campus.accessPorts){
 const reach=Math.hypot(port.x-port.centerX,port.z-port.centerZ);
 assert.ok(Math.abs(reach-(3.2+Math.sqrt(3.25**2-1.36**2)))<.02,`${port.moduleId}: el portal no coincide con la abertura del testero (${reach.toFixed(2)} m).`);
 assert.ok(Number.isFinite(port.y),`${port.moduleId}: falta cota del collar de acceso.`);
 const run=Math.hypot(port.junctionX-port.x,port.junctionZ-port.z);
 const alignment=((port.junctionX-port.x)*port.normalX+(port.junctionZ-port.z)*port.normalZ)/run;
 assert.ok(alignment>.999,`${port.moduleId}: la derivación no enfrenta la abertura (${alignment.toFixed(3)}).`);
 assert.ok(Math.abs(port.run-run)<.001,`${port.moduleId}: longitud del piso distinta de la distancia entre portales.`);
 assert.ok(Math.abs(port.floorY-(port.y-.9))<.001,`${port.moduleId}: el piso no coincide con el umbral del módulo.`);
 if(port.accessType==='rampa')assert.ok(port.grade<=.15,`${port.moduleId}: rampa demasiado inclinada (${(port.grade*100).toFixed(1)} %).`);
 else{assert.ok(port.accessType==='escalera'&&port.steps>=2,`${port.moduleId}: desnivel sin escalera.`);assert.ok(port.maxRiser<=.16,`${port.moduleId}: contrahuella ${(port.maxRiser*100).toFixed(1)} cm.`);}
}
campus.root.traverse(object=>{if(object instanceof T.Mesh)object.geometry.dispose();});

// Check the real elliptical berm outline, not a decorative bounding circle.
let tankInnerRadius=Infinity,tankOuterRadius=0;
for(let i=0;i<720;i++){
  const a=i/720*Math.PI*2;
  const x=MARS.tankX+MARS.a*1.13*Math.cos(a),z=MARS.tankY+MARS.b*1.13*Math.sin(a),r=Math.hypot(x,z);
  tankInnerRadius=Math.min(tankInnerRadius,r);tankOuterRadius=Math.max(tankOuterRadius,r);
}
assert.ok(tankInnerRadius-routeRadius-roverRadius>=minClearance,'La carrocería debe librar el terraplén del depósito.');
assert.ok(tankOuterRadius<=MARS.radius,'El terraplén del depósito debe quedar dentro del dominio D.');
assert.ok(3.2-roverRadius-.075>=minClearance,'Los hitos de la ruta deben quedar fuera de la envolvente segura del rover.');

// The current southern habitat entry no longer crosses the rover route on a bridge.
// Verify actual circular foundations and the access apron against the active half-arc.
const habitatRouteClearance=distanceToRoute(HABITAT.x,HABITAT.z)-11.3-roverRadius;
const airlockRouteClearance=distanceToRoute(HABITAT.airlockX,HABITAT.airlockZ)-4.2-roverRadius;
assert.ok(habitatRouteClearance>=minClearance,`Cimiento del hábitat: solo ${habitatRouteClearance.toFixed(2)} m libres de la ruta`);
assert.ok(airlockRouteClearance>=minClearance,`Esclusa: solo ${airlockRouteClearance.toFixed(2)} m libres de la ruta`);
const habitatPlantClearance=Math.hypot(HABITAT.x-WATER_PLANT.x,HABITAT.z-WATER_PLANT.z)-11.3-WATER_PLANT.foundationRadius;
const airlockPlantClearance=Math.hypot(HABITAT.airlockX-WATER_PLANT.x,HABITAT.airlockZ-WATER_PLANT.z)-4.2-WATER_PLANT.foundationRadius;
assert.ok(habitatPlantClearance>=1,`Hábitat/planta de agua: solo ${habitatPlantClearance.toFixed(2)} m entre cimientos`);
assert.ok(airlockPlantClearance>=1,`Esclusa/planta de agua: solo ${airlockPlantClearance.toFixed(2)} m entre cimientos`);

// Check every pressurized walkway against the actual route. Some structures
// cross the full ring but not the traveled half-arc.
function foundationTop(x,z,r){
 let top=-Infinity;
 for(let i=0;i<48;i++){const a=i/48*Math.PI*2;top=Math.max(top,landscape(x+r*Math.cos(a),z+r*Math.sin(a)));}
 return top+.675;
}
const workshopY=foundationTop(-20,-35,10),residenceY=foundationTop(-38,-75,8.4),greenhouseY=foundationTop(GREENHOUSE.x,GREENHOUSE.z,GREENHOUSE.foundationRadius);
const greenhouseFloor=greenhouseY+.4;
const greenhouseRampStartY=landscape(GREENHOUSE_ACCESS_PORTAL.rampStartX,GREENHOUSE_ACCESS_PORTAL.rampStartZ)+.13;
const greenhouseRampGrade=(greenhouseFloor-greenhouseRampStartY)/(GREENHOUSE_ACCESS_PORTAL.x-GREENHOUSE_ACCESS_PORTAL.rampStartX);
assert.ok(Math.abs(GREENHOUSE_PRESSURE_PORTAL.x-(GREENHOUSE_ACCESS_PORTAL.x+GREENHOUSE_ACCESS_PORTAL.innerX)/2)<1e-9&&Math.abs(GREENHOUSE_PRESSURE_PORTAL.z-(GREENHOUSE_ACCESS_PORTAL.z+GREENHOUSE_ACCESS_PORTAL.vestibuleWidth/2))<1e-9,'El corredor presurizado debe terminar en el costado norte de la esclusa existente.');
assert.ok(Math.abs(GREENHOUSE_ACCESS_PORTAL.innerX-(GREENHOUSE.x-9))<1e-9&&Math.abs(GREENHOUSE_ACCESS_PORTAL.z-GREENHOUSE.z-3.2)<1e-9,'La esclusa exterior debe conservar su abertura original en el testero oeste.');
assert.ok(Math.hypot(GREENHOUSE_ACCESS_PORTAL.innerX-GREENHOUSE_PRESSURE_PORTAL.x,GREENHOUSE_ACCESS_PORTAL.z-GREENHOUSE_PRESSURE_PORTAL.z)>GREENHOUSE_ACCESS_PORTAL.doorRadius+GREENHOUSE_CORRIDOR.radius+.15,'La puerta lateral de la esclusa debe dejar espacio respecto a su puerta interior.');
assert.ok(Math.abs(GREENHOUSE_ACCESS_PORTAL.innerX-GREENHOUSE_ACCESS_PORTAL.x-GREENHOUSE_ACCESS_PORTAL.vestibuleLength)<1e-9,'La esclusa debe unir físicamente sus puertas exterior e interior.');
assert.ok(GREENHOUSE_ACCESS_PORTAL.vestibuleWidth>2*GREENHOUSE_ACCESS_PORTAL.doorRadius+.4,'Los testeros de la esclusa deben contener las puertas y paneles de cierre a ambos lados.');
assert.ok(Math.abs(GREENHOUSE_ACCESS_PORTAL.doorY-GREENHOUSE_ACCESS_PORTAL.doorRadius-(greenhouseFloor-greenhouseY))<1e-9,'El umbral de la esclusa debe quedar a nivel con el piso del invernadero.');
const greenhouseCorridorFloorAtWorkshop=workshopY+GREENHOUSE_CORRIDOR.startRise-GREENHOUSE_CORRIDOR.floorOffset;
const greenhouseCorridorFloorAtGreenhouse=greenhouseY+GREENHOUSE_CORRIDOR.portalRise-GREENHOUSE_CORRIDOR.floorOffset;
assert.ok(Math.abs(greenhouseCorridorFloorAtWorkshop-(workshopY+.4))<.01,'El piso del corredor debe llegar al umbral elevado del taller.');
assert.ok(Math.abs(greenhouseCorridorFloorAtGreenhouse-greenhouseFloor)<.01,'El piso del corredor debe terminar a la misma cota del invernadero.');
assert.equal(GREENHOUSE_BEDS.columns*GREENHOUSE_BEDS.rowOffsets.length,32,'El invernadero debe conservar las 32 bandejas experimentales.');
const greenhouseWestAisle=GREENHOUSE_BEDS.firstXOffset-GREENHOUSE_BEDS.length/2+9;
assert.ok(greenhouseWestAisle>=GREENHOUSE_BEDS.entryAisleWidth-.01,'Las bandejas deben dejar un pasillo transversal libre desde ambos portales.');
const nearestRow=Math.min(...GREENHOUSE_BEDS.rowOffsets.map(offset=>Math.abs(offset)));
assert.ok(2*(nearestRow-GREENHOUSE_BEDS.width/2)>=GREENHOUSE_BEDS.centralAisleWidth,'La bandejas deben dejar un pasillo longitudinal central.');
assert.ok(GREENHOUSE_PRESSURE_PORTAL.x-GREENHOUSE_CORRIDOR.radius>GREENHOUSE_ACCESS_PORTAL.x+.1&&GREENHOUSE_PRESSURE_PORTAL.x+GREENHOUSE_CORRIDOR.radius<GREENHOUSE_ACCESS_PORTAL.innerX-.1,'La abertura presurizada debe caber en la pared lateral de la esclusa.');
assert.ok(GREENHOUSE_PRESSURE_PORTAL.rise+GREENHOUSE_CORRIDOR.radius<.4+2.35,'La abertura lateral no debe atravesar el techo de la esclusa.');
assert.ok(greenhouseRampGrade>0&&greenhouseRampGrade<=.15,`Acceso exterior del invernadero: pendiente ${(greenhouseRampGrade*100).toFixed(1)}%, supera el 15%.`);
assert.ok(Math.hypot(GREENHOUSE_ACCESS_PORTAL.rampStartX-GREENHOUSE.x,GREENHOUSE_ACCESS_PORTAL.rampStartZ-GREENHOUSE.z)>GREENHOUSE.foundationRadius,'La rampa debe comenzar fuera del cimiento.');
assert.equal(GREENHOUSE_CORRIDOR.supports.length,3,'El tramo sellado elevado debe tener tres marcos estructurales visibles.');
assert.ok(GREENHOUSE_CORRIDOR.radius< GREENHOUSE_CORRIDOR.portalRadius-.2,'El corredor debe ser claramente menor que el marco de transición del portal.');
assert.ok(GREENHOUSE_CORRIDOR.radius+GREENHOUSE_CORRIDOR.floorOffset>=1.85,'El gálibo interior conceptual del corredor debe mantener 1.85 m sobre el piso transitable.');
assert.ok(2*Math.sqrt(GREENHOUSE_CORRIDOR.radius**2-GREENHOUSE_CORRIDOR.floorOffset**2)>=1.05,'El piso transitable debe caber dentro de la sección circular.');
assert.ok(GREENHOUSE_CORRIDOR.supportOffset>=GREENHOUSE_CORRIDOR.radius+.2,'Las patas de soporte deben apoyar fuera de la envolvente lateral del tubo.');
const corridorTarget=[GREENHOUSE_PRESSURE_PORTAL.x,greenhouseY+GREENHOUSE_CORRIDOR.portalRise,GREENHOUSE_PRESSURE_PORTAL.z-GREENHOUSE_CORRIDOR.portalOffset];
let corridorRampClearance=Infinity;
for(let i=0;i<=200;i++){
 const {x,z}=greenhouseCorridorPlan(i/200);
 const rampEndX=GREENHOUSE_ACCESS_PORTAL.x,rampZ=GREENHOUSE_ACCESS_PORTAL.z;
 corridorRampClearance=Math.min(corridorRampClearance,Math.hypot(x-Math.min(x,rampEndX),z-rampZ)-GREENHOUSE_CORRIDOR.radius-1.05);
}
assert.ok(corridorRampClearance>=.25,`El tubo invade o roza la rampa exterior: ${corridorRampClearance.toFixed(2)} m de separación.`);
assert.ok(GREENHOUSE_CORRIDOR.portalOffset>0&&GREENHOUSE_CORRIDOR.portalOffset<.2,'El centro del corredor debe penetrar ligeramente en la abertura lateral.');
const workshopAccess=[-20,-35-5.9],workshopCorridorAccess=[GREENHOUSE_CORRIDOR.startX,GREENHOUSE_CORRIDOR.startZ];
assert.ok(Math.hypot(workshopAccess[0]-workshopCorridorAccess[0],workshopAccess[1]-workshopCorridorAccess[1])<.05,'El corredor debe coincidir con la puerta sur real del taller, no con una pared lateral.');
assert.ok(workshopCorridorAccess[1]<-35,'La puerta del taller orientado al sur debe quedar al sur de su centro.');
assert.ok(greenhouseRampGrade<=.15,`Rampa del invernadero ${(greenhouseRampGrade*100).toFixed(1)}%: supera 15%.`);
let greenhouseServiceGrade=0,greenhouseServiceWorkshopGap=Infinity,greenhouseServiceWaterGap=Infinity,greenhouseServiceCapsuleGap=Infinity;
const serviceHalfDiagonal=Math.hypot(2.2,1.5)/2;
const pointSegmentInfo=(x,z,a,b)=>{const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));return {t,distance:Math.hypot(x-a.x-t*dx,z-a.z-t*dz)};};
let greenhouseUnderpassClearance=Infinity,greenhouseSupportRouteClearance=Infinity;
const greenhouseBridgeSamples=Array.from({length:401},(_,i)=>{const t=i/400,p=greenhouseCorridorPlan(t);return {...p,t,y:(workshopY+GREENHOUSE_CORRIDOR.startRise)*(1-t)+(greenhouseY+GREENHOUSE_CORRIDOR.portalRise)*t+GREENHOUSE_CORRIDOR.archHeight*Math.sin(Math.PI*t)**2};});
for(let segment=0;segment<GREENHOUSE_ACCESS_ROUTE.length-1;segment++){
 const a=GREENHOUSE_ACCESS_ROUTE[segment],b=GREENHOUSE_ACCESS_ROUTE[segment+1],length=Math.hypot(b.x-a.x,b.z-a.z),n=Math.ceil(length/.5);
 for(let i=0;i<n;i++){
  const t=i/n,u=(i+1)/n,mid=(t+u)/2,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,xx=a.x+(b.x-a.x)*u,zz=a.z+(b.z-a.z)*u,xm=a.x+(b.x-a.x)*mid,zm=a.z+(b.z-a.z)*mid,run=Math.hypot(xx-x,zz-z);
  greenhouseServiceGrade=Math.max(greenhouseServiceGrade,Math.abs(landscape(xx,zz)-landscape(x,z))/run);
  greenhouseServiceWorkshopGap=Math.min(greenhouseServiceWorkshopGap,Math.hypot(xm+20,zm+35)-10.2-serviceHalfDiagonal);
  for(const bridge of greenhouseBridgeSamples){if(Math.hypot(xm-bridge.x,zm-bridge.z)<=GREENHOUSE_CORRIDOR.radius+serviceHalfDiagonal)greenhouseUnderpassClearance=Math.min(greenhouseUnderpassClearance,bridge.y-GREENHOUSE_CORRIDOR.radius-landscape(xm,zm)-.2);}
  greenhouseServiceWaterGap=Math.min(greenhouseServiceWaterGap,Math.hypot(xm-WATER_PLANT.x,zm-WATER_PLANT.z)-WATER_PLANT.foundationRadius-serviceHalfDiagonal);
  for(const module of campus.obstacles)greenhouseServiceCapsuleGap=Math.min(greenhouseServiceCapsuleGap,Math.hypot(xm-module.x,zm-module.z)-module.r-1-serviceHalfDiagonal);
 }
}
assert.ok(greenhouseServiceGrade<=.15,`Sendero exterior al invernadero: pendiente ${(greenhouseServiceGrade*100).toFixed(1)}%, supera 15%.`);
assert.ok(greenhouseUnderpassClearance>=2.2,`Cruce inferior del andador: solo ${greenhouseUnderpassClearance.toFixed(2)} m de gálibo libre bajo el corredor.`);
const greenhousePedestrianSegments=[...GREENHOUSE_ACCESS_ROUTE.slice(1).map((b,i)=>({a:GREENHOUSE_ACCESS_ROUTE[i],b})),{a:{x:GREENHOUSE_ACCESS_PORTAL.rampStartX,z:GREENHOUSE_ACCESS_PORTAL.rampStartZ},b:{x:GREENHOUSE_ACCESS_PORTAL.x,z:GREENHOUSE_ACCESS_PORTAL.z}}];
for(const t of GREENHOUSE_CORRIDOR.supports){const p=greenhouseCorridorPlan(t),before=greenhouseCorridorPlan(t-.002),after=greenhouseCorridorPlan(t+.002),dx=after.x-before.x,dz=after.z-before.z,length=Math.hypot(dx,dz),lateral={x:-dz/length,z:dx/length};for(const side of [-1,1]){const fx=p.x+lateral.x*GREENHOUSE_CORRIDOR.supportOffset*side,fz=p.z+lateral.z*GREENHOUSE_CORRIDOR.supportOffset*side;for(const {a,b} of greenhousePedestrianSegments)greenhouseSupportRouteClearance=Math.min(greenhouseSupportRouteClearance,pointSegmentInfo(fx,fz,a,b).distance-serviceHalfDiagonal-.36);}}
assert.ok(greenhouseSupportRouteClearance>=.15,`Las patas del corredor invaden el andador (${greenhouseSupportRouteClearance.toFixed(2)} m libres).`);
assert.ok(greenhouseServiceWorkshopGap>=0,`Sendero al invernadero invade el taller (${greenhouseServiceWorkshopGap.toFixed(2)} m).`);
assert.ok(greenhouseServiceWaterGap>=0,`Sendero al invernadero invade tratamiento (${greenhouseServiceWaterGap.toFixed(2)} m).`);
assert.ok(greenhouseServiceCapsuleGap>=0,`Sendero al invernadero invade un módulo presurizado (${greenhouseServiceCapsuleGap.toFixed(2)} m).`);
let waterRampGroundClearance=Infinity;
for(let i=0;i<=100;i++){const t=i/100,x=WATER_PLANT_WALKWAY.startX+(WATER_PLANT_WALKWAY.endX-WATER_PLANT_WALKWAY.startX)*t,y=landscape(WATER_PLANT_WALKWAY.startX,WATER_PLANT_WALKWAY.startY)+.13+waterRampRise*t;waterRampGroundClearance=Math.min(waterRampGroundClearance,y-landscape(x,WATER_PLANT_WALKWAY.startY));}
assert.ok(waterRampGroundClearance>=.1,`Rampa de tratamiento queda enterrada bajo el terreno (${waterRampGroundClearance.toFixed(2)} m).`);
// The complete greenhouse pad must clear the irregular reservoir apron.
// The old (-8,-91) site was inside E itself.
const greenhouseApronGap=Math.min(...Array.from({length:720},(_,i)=>{
 const a=i/720*Math.PI*2,wave=.55*Math.sin(a*7)+.3*Math.cos(a*13);
 const x=MARS.tankX+(18.2+6+wave)*Math.cos(a),z=MARS.tankY+(14.2+5+wave)*Math.sin(a);
 return Math.hypot(GREENHOUSE.x-x,GREENHOUSE.z-z)-GREENHOUSE.foundationRadius;
}));
assert.ok(((GREENHOUSE.x-MARS.tankX)/MARS.a)**2+((GREENHOUSE.z-MARS.tankY)/MARS.b)**2>1,'El invernadero no debe ocupar E.');
assert.ok(greenhouseApronGap>=1,`Invernadero/terraplén: ${greenhouseApronGap.toFixed(2)} m de separación`);
const walkwayClearances=[];
for(const crossing of [
 {name:'puente oeste',a:[-28,workshopY+2.7,-40],b:[-36,residenceY+2.7,-69],arch:4.5},
 {name:'pasillo al costado de la esclusa del invernadero',a:[GREENHOUSE_CORRIDOR.startX,workshopY+GREENHOUSE_CORRIDOR.startRise,GREENHOUSE_CORRIDOR.startZ],b:corridorTarget,arch:GREENHOUSE_CORRIDOR.archHeight,archSquared:true,plan:greenhouseCorridorPlan,radius:GREENHOUSE_CORRIDOR.radius},
 {name:'pasillo norte: subida del puente',a:campus.northBridge.start,b:campus.northBridge.crest,arch:0,radius:campus.northBridge.radius},
 {name:'pasillo norte: bajada del puente',a:campus.northBridge.crest,b:campus.northBridge.end,arch:0,radius:campus.northBridge.radius},
]){
 let min=Infinity,closest=null;
 for(let i=0;i<=10000;i++){
  const t=i/10000,plan=crossing.plan?.(t),x=plan?.x??crossing.a[0]+(crossing.b[0]-crossing.a[0])*t,z=plan?.z??crossing.a[2]+(crossing.b[2]-crossing.a[2])*t;
  if(distanceToRoute(x,z)>roverRadius+minClearance)continue;
  const centerY=crossing.a[1]+(crossing.b[1]-crossing.a[1])*t+crossing.arch*(crossing.archSquared?Math.sin(Math.PI*t)**2:Math.sin(Math.PI*t));
  const clearance=centerY-(crossing.radius??1.28)-height(x,z)-3.1;
  if(clearance<min){min=clearance;closest={t,x,z};}
 }
 if(Number.isFinite(min))assert.ok(min>=minClearance,`${crossing.name}: altura libre ${min.toFixed(2)} m`);
 walkwayClearances.push({name:crossing.name,clearance:Number.isFinite(min)?min:null,closest,intersectsRoute:Number.isFinite(min)});
}
const northSupports=[];
for(const support of campus.trunkSupports.filter(item=>item.segment==='anillo-ala-norte'||item.segment.startsWith('ala-norte-'))){
 const {x,z}=support,clearance=distanceToRoute(x,z)-.3-roverRadius;
 assert.ok(clearance>=minClearance,`Soporte del pasillo norte (${x},${z}): solo ${clearance.toFixed(2)} m libres`);
 northSupports.push({x,z,clearance});
}
let westSupportClearance=Infinity;
for(const support of campus.trunkSupports.filter(item=>item.segment==='anillo-ala-oeste'||item.segment.startsWith('ala-oeste-'))){
 const clearance=distanceToRoute(support.x,support.z)-.3-roverRadius;
 westSupportClearance=Math.min(westSupportClearance,clearance);
 assert.ok(clearance>=minClearance,`Soporte del ala oeste (${support.x},${support.z}): solo ${clearance.toFixed(2)} m libres`);
}

console.log('PASS: envolvente GLB, terreno, tubería, huellas GLB del campo solar, rocas, edificios, depósito y pasos actuales.');
console.log(JSON.stringify({roverRadius,solarSize,solarRadius,solarPanels:allSolarPads.length,solarStudyPanels:solarPads.length,solarSupportPanels:supportPads.length,supportMinGap,supportMinRouteGap,supportMinBplusGap,supportMinLabGap,solarAisleWidth,solarEntryWidth,solarPanelSeparationMin:Math.min(...solarPads.flatMap((panel,i)=>solarPads.slice(0,i).map(previous=>panelSeparation(panel,previous)))),closestRock,maxContactDeviation,minPipeCover,minPipeRouteGap,closestServicePaver,closestServiceLight,plantWalkwayRouteGap,plantWalkwayFoundationGap,waterRampGrade,waterRampGroundClearance,greenhouseRampGrade,greenhouseServiceGrade,greenhouseServiceWorkshopGap,greenhouseServiceWaterGap,greenhouseServiceCapsuleGap,corridorRampClearance,greenhouseUnderpassClearance,greenhouseSupportRouteClearance,greenhouseCorridorRadius:GREENHOUSE_CORRIDOR.radius,greenhousePortalRadius:GREENHOUSE_CORRIDOR.portalRadius,habitatAccessPavers,habitatAccessMaxGrade,habitatAccessRouteClearance,habitatAccessSolarClearance,habitatAccessAirlockClearance,habitatAccessPlantClearance,habitatAccessFoundationOverlap,closestCampusModule,tankInnerRadius,tankOuterRadius,habitatRouteClearance,airlockRouteClearance,habitatPlantClearance,airlockPlantClearance,walkwayClearances,northSupports,westSupportClearance},null,2));
