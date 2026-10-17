import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as T from 'three';
import {createRoverLogisticsSurface,roverLogisticsDrivePath} from '../src/data/roverLogistics.ts';
import {ROVER_LOGISTICS_TRANSFER,ROVER_TRANSFER_DESIGN,WORKSHOP_CARGO_LINK} from '../src/data/marsHabitat.ts';
import {WORKSHOP_NORTH_ACCESS} from '../src/components/colonyCampus.ts';
import {landscape} from '../src/data/marsMath.ts';
import {roverEnergyState} from '../src/data/researchScenarios.ts';
import {WORKSHOP_WEST_BAY,WORKSHOP_WEST_GATE} from '../src/components/workshopFacade.ts';

// Decode the six contact patches from the actual compressed rover GLB.
// The model has one fused wheel mesh, so named wheel nodes are unavailable.
async function roverWheels(){
 const bytes=readFileSync('public/models/nasa-perseverance.glb'),jsonLength=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+jsonLength).toString()),binaryStart=20+jsonLength+8;
 const source=readFileSync('node_modules/three/examples/jsm/libs/draco/gltf/draco_decoder.js','utf8'),context={module:{exports:{}},console,TextDecoder,WebAssembly};
 context.exports=context.module.exports;vm.runInNewContext(source,context);
 const draco=await context.DracoDecoderModule({}),decoder=new draco.Decoder(),points=[];
 const assetBounds=new T.Box3(),nonWheelBounds=new T.Box3(),wheelNode=doc.nodes.findIndex(node=>node.name==='Wheels_objs');
 assert.ok(wheelNode>=0,'El GLB perdió su malla de seis ruedas.');
 let wheelMatrix;
 const visit=(index,parent)=>{
  const node=doc.nodes[index],local=node.matrix?new T.Matrix4().fromArray(node.matrix):new T.Matrix4().compose(new T.Vector3(...(node.translation??[0,0,0])),new T.Quaternion(...(node.rotation??[0,0,0,1])),new T.Vector3(...(node.scale??[1,1,1]))),world=parent.clone().multiply(local);
  if(index===wheelNode)wheelMatrix=world;
  if(node.mesh!==undefined)for(const primitive of doc.meshes[node.mesh].primitives){const accessor=doc.accessors[primitive.attributes.POSITION];assert.ok(accessor.min&&accessor.max,'El GLB necesita cotas para su envolvente.');for(const x of [accessor.min[0],accessor.max[0]])for(const y of [accessor.min[1],accessor.max[1]])for(const z of [accessor.min[2],accessor.max[2]]){const corner=new T.Vector3(x,y,z).applyMatrix4(world);assetBounds.expandByPoint(corner);if(index!==wheelNode)nonWheelBounds.expandByPoint(corner);}}
  for(const child of node.children??[])visit(child,world);
 };
 for(const index of doc.scenes[doc.scene??0].nodes)visit(index,new T.Matrix4());
 assert.ok(wheelMatrix&&!assetBounds.isEmpty(),'No se pudo reconstruir el GLB.');
 const wheel=doc.nodes[wheelNode];
 for(const primitive of doc.meshes[wheel.mesh].primitives){
  const extension=primitive.extensions?.KHR_draco_mesh_compression;assert.ok(extension,'Las ruedas cambiaron de codificación.');
  const view=doc.bufferViews[extension.bufferView],start=binaryStart+(view.byteOffset??0),data=bytes.subarray(start,start+view.byteLength),buffer=new draco.DecoderBuffer();buffer.Init(new Int8Array(data),data.length);
  const mesh=new draco.Mesh(),status=decoder.DecodeBufferToMesh(buffer,mesh);assert.ok(status.ok(),status.error_msg());
  const attribute=decoder.GetAttributeByUniqueId(mesh,extension.attributes.POSITION),array=new draco.DracoFloat32Array();decoder.GetAttributeFloatForAllPoints(mesh,attribute,array);
  for(let i=0;i<mesh.num_points();i++)points.push(new T.Vector3(array.GetValue(3*i),array.GetValue(3*i+1),array.GetValue(3*i+2)).applyMatrix4(wheelMatrix));
  draco.destroy(array);draco.destroy(mesh);draco.destroy(buffer);
 }
 const size=assetBounds.getSize(new T.Vector3()),center=assetBounds.getCenter(new T.Vector3()),scale=3.1/Math.max(size.x,size.y,size.z),bottom=Math.min(...points.map(point=>point.y));
 const low=points.filter(point=>point.y-bottom<.045);assert.ok(low.length>1000,'No se identificaron las seis zonas de contacto.');
 const contacts=[];
 for(const side of [-1,1]){
  const sidePoints=low.filter(point=>Math.sign(point.x-center.x)===side),sorted=sidePoints.map(point=>point.z).sort((a,b)=>a-b),means=[sorted[Math.floor(sorted.length*.15)],sorted[Math.floor(sorted.length*.5)],sorted[Math.floor(sorted.length*.85)]];
  for(let pass=0;pass<12;pass++)for(let row=0;row<3;row++){const assigned=sidePoints.filter(point=>means.reduce((best,value,index)=>Math.abs(point.z-value)<Math.abs(point.z-means[best])?index:best,0)===row);assert.ok(assigned.length>100,'Una zona de rueda quedó sin vértices.');means[row]=assigned.reduce((sum,point)=>sum+point.z,0)/assigned.length;}
  for(let row=0;row<3;row++){const assigned=sidePoints.filter(point=>means.reduce((best,value,index)=>Math.abs(point.z-value)<Math.abs(point.z-means[best])?index:best,0)===row);contacts.push({x:(assigned.reduce((sum,point)=>sum+point.x,0)/assigned.length-center.x)*scale,z:(means[row]-center.z)*scale});}
 }
 assert.equal(contacts.length,6);
 assert.ok(Math.abs(contacts[0].x+contacts[3].x)<.03&&Math.abs(contacts[2].z-contacts[5].z)<.03,'El GLB dejó de tener pares de ruedas simétricos.');
 return {contacts,size:size.multiplyScalar(scale),underbodyClearance:(nonWheelBounds.min.y-assetBounds.min.y)*scale};
}

const transfer=ROVER_LOGISTICS_TRANSFER,landingY=Math.max(...Array.from({length:48},(_,i)=>landscape(-77+14*Math.cos(i/48*Math.PI*2),-52+14*Math.sin(i/48*Math.PI*2))))+.45+.225;
const model=createRoverLogisticsSurface(landingY,WORKSHOP_NORTH_ACCESS.foundationY);
const preview=roverLogisticsDrivePath(model,WORKSHOP_NORTH_ACCESS.foundationY);
assert.ok(preview.length>200&&preview.length<230,'La vista de maniobra perdió un tramo del recorrido.');
assert.ok(preview.stations.at(-1).point.x>WORKSHOP_WEST_GATE.planeX+2.5,'La vista de maniobra termina antes de liberar el portón.');
assert.ok(Math.max(...preview.stations.slice(1).map((station,index)=>Math.abs(station.point.y-preview.stations[index].point.y)))<.25,'La vista de maniobra salta verticalmente entre superficies.');
const {transferCurve,roadSection,rampCurve,rampTop,padDrivingTop,cargoStart,cargoEnd,padStart,jointStart,jointEnd,jointCurve,jointTop,jointDeckGeometry}=model;
const sections=[];
function append(kind,count,start,end,point,tangent,width,left,right){for(let i=0;i<=count;i++){const t=start+(end-start)*i/count,p=point(t),direction=tangent(t),normal=new T.Vector2(-direction.y,direction.x).normalize();sections.push({kind,t,x:p.x,z:p.y,heading:direction.clone().normalize(),normal,width,yLeft:left(t),yRight:right(t)});}}
const curvePoint=(curve,t)=>{const p=curve.getPoint(t);return new T.Vector2(p.x,p.z);},curveTangent=(curve,t)=>{const p=curve.getTangent(t);return new T.Vector2(p.x,p.z);};
append('natural',320,0,transfer.stabilizedStartT,t=>curvePoint(transferCurve,t),t=>curveTangent(transferCurve,t),transfer.width,t=>landscape(transferCurve.getPoint(t).x,transferCurve.getPoint(t).z),t=>landscape(transferCurve.getPoint(t).x,transferCurve.getPoint(t).z));
append('firme',480,transfer.stabilizedStartT,transfer.rampStartT,t=>curvePoint(transferCurve,t),t=>curveTangent(transferCurve,t),transfer.width,t=>roadSection(t)[0].top,t=>roadSection(t)[1].top);
append('rampa',240,0,1,t=>curvePoint(rampCurve,t),t=>curveTangent(rampCurve,t),transfer.width,t=>rampTop(0,t),t=>rampTop(1,t));
const linePoint=(a,b,t)=>new T.Vector2(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t),lineTangent=(a,b)=>new T.Vector2(b.x-a.x,b.z-a.z);
append('plataforma',72,0,1,t=>linePoint(padStart,cargoEnd,t),()=>lineTangent(padStart,cargoEnd),transfer.width,()=>padDrivingTop,()=>padDrivingTop);
append('tablero',210,0,1,t=>linePoint(cargoEnd,cargoStart,t),()=>lineTangent(cargoEnd,cargoStart),WORKSHOP_CARGO_LINK.width,t=>padDrivingTop+(WORKSHOP_NORTH_ACCESS.foundationY+.225-padDrivingTop)*t,t=>padDrivingTop+(WORKSHOP_NORTH_ACCESS.foundationY+.225-padDrivingTop)*t);
const plateAxis=lineTangent(padStart,cargoEnd).normalize(),plateHalf=WORKSHOP_CARGO_LINK.jointLength/2;
const plateNormal=new T.Vector2(-plateAxis.y,plateAxis.x),plateY=(t,side)=>jointTop(cargoEnd.x+plateAxis.x*t+plateNormal.x*side*WORKSHOP_CARGO_LINK.jointWidth/2,cargoEnd.z+plateAxis.y*t+plateNormal.y*side*WORKSHOP_CARGO_LINK.jointWidth/2);
append('chapa',48,-plateHalf,plateHalf,t=>new T.Vector2(cargoEnd.x+plateAxis.x*t,cargoEnd.z+plateAxis.y*t),()=>plateAxis,WORKSHOP_CARGO_LINK.jointWidth,t=>plateY(t,-1),t=>plateY(t,1));

const padCut=1-plateHalf/lineTangent(padStart,cargoEnd).length(),deckCut=plateHalf/lineTangent(cargoEnd,cargoStart).length();
const driveStations=sections.filter(section=>['natural','firme','rampa'].includes(section.kind)||section.kind==='plataforma'&&section.t<=padCut||section.kind==='tablero'&&section.t>=deckCut);
const padStations=driveStations.filter(section=>section.kind==='plataforma'),deckStations=driveStations.filter(section=>section.kind==='tablero');
const beforeDeck=driveStations.findIndex(section=>section.kind==='tablero');
assert.ok(beforeDeck>0&&padStations.length>0&&deckStations.length>0);
const jointStations=Array.from({length:61},(_,i)=>{const t=i/60,p=jointCurve.getPoint(t),direction=jointCurve.getTangent(t),heading=new T.Vector2(direction.x,direction.z).normalize(),normal=new T.Vector2(-heading.y,heading.x),half=WORKSHOP_CARGO_LINK.jointWidth/2;return{kind:'giro',t,x:p.x,z:p.z,heading,normal,width:WORKSHOP_CARGO_LINK.jointWidth,yLeft:jointTop(p.x-normal.x*half,p.z-normal.y*half),yRight:jointTop(p.x+normal.x*half,p.z+normal.y*half)};});
driveStations.splice(beforeDeck,0,...jointStations);
const jointMesh=new T.Mesh(jointDeckGeometry(),new T.MeshBasicMaterial({side:T.DoubleSide}));jointMesh.updateMatrixWorld(true);
for(const p of [jointStart,jointCurve.getPoint(.25),cargoEnd,jointCurve.getPoint(.75),jointEnd]){const expected=jointTop(p.x,p.z),hit=new T.Raycaster(new T.Vector3(p.x,expected+2,p.z),new T.Vector3(0,-1,0),0,4).intersectObject(jointMesh)[0];assert.ok(hit&&Math.abs(hit.point.y-expected)<.008,'La malla de la chapa no coincide con su cota de rodadura.');}
const deckJoinFraction=plateHalf/lineTangent(cargoEnd,cargoStart).length();
assert.ok(Math.abs(jointTop(jointStart.x,jointStart.z)-padDrivingTop)<.001,'La chapa no enraza con el piso de plataforma.');
assert.ok(Math.abs(jointTop(jointEnd.x,jointEnd.z)-(padDrivingTop+(WORKSHOP_NORTH_ACCESS.foundationY+.225-padDrivingTop)*deckJoinFraction))<.001,'La chapa deja un escalón al terminar sobre el tablero.');
let jointMinRadius=Infinity;
for(let i=1;i<300;i++){const a=jointCurve.getPoint((i-1)/300),p=jointCurve.getPoint(i/300),b=jointCurve.getPoint((i+1)/300),v1=new T.Vector2(p.x-a.x,p.z-a.z),v2=new T.Vector2(b.x-p.x,b.z-p.z),turn=v1.angleTo(v2);jointMinRadius=Math.min(jointMinRadius,(v1.length()+v2.length())/2/Math.max(turn,1e-12));}
assert.ok(jointMinRadius>=6,'La maniobra sobre la chapa exige un radio inferior a 6 m.');

const {contacts,size,underbodyClearance}=await roverWheels(),requiredKinds=new Set(['firme','rampa','plataforma','giro','tablero']);
assert.ok(preview.stations.at(-1).point.x-WORKSHOP_WEST_GATE.planeX-1>size.z/2+.3,'La demostración cierra el portón antes de liberar la zaga del rover.');
const kindRanges=new Map();for(let i=0;i<driveStations.length;i++){const range=kindRanges.get(driveStations[i].kind)??{first:i,last:i};range.last=i;kindRanges.set(driveStations[i].kind,range);}
const supportAt=(x,z)=>{
 const here=new T.Vector2(x,z);let best=null;
 for(const section of sections){const delta=here.clone().sub(new T.Vector2(section.x,section.z)),along=delta.dot(section.heading),across=delta.dot(section.normal),distance=Math.hypot(along,across);
  if(distance>section.width/2+.1||Math.abs(across)>section.width/2+.04)continue;
  if(!best||distance<best.distance){const fraction=Math.max(0,Math.min(1,.5+across/section.width));best={kind:section.kind,distance,y:section.yLeft*(1-fraction)+section.yRight*fraction};}
 }
 if(!best)return {kind:'terreno',y:landscape(x,z),distance:Infinity};
 if(best.kind==='natural')return {kind:'terreno',y:landscape(x,z),distance:best.distance};
 return best;
};

let maxResidual=0,maxRoll=0,maxPitch=0,minLateralMargin=Infinity,minLongitudinalMargin=Infinity,minimumEngineeredSupport=6,maxRequiredMu=0,minBodyClearance=Infinity,worst=null,checked=0;
const {massKg,marsGravity:marsG,inspectionSpeed,assumedFriction}=ROVER_TRANSFER_DESIGN,rolling=.04;
assert.equal(roverEnergyState(1).mass,massKg,'La masa de diseño diverge del escenario máximo del rover.');
for(let stationIndex=8;stationIndex<driveStations.length-8;stationIndex+=2){
 const station=driveStations[stationIndex],at=new T.Vector2(station.x,station.z),heading=station.heading,normal=station.normal,samples=[];
 for(const wheel of contacts){const position=at.clone().addScaledVector(normal,wheel.x).addScaledVector(heading,wheel.z),support=supportAt(position.x,position.y);samples.push({...wheel,worldX:position.x,worldZ:position.y,...support});}
 const engineered=requiredKinds.has(station.kind);if(engineered){const count=samples.filter(sample=>sample.kind!=='terreno').length;minimumEngineeredSupport=Math.min(minimumEngineeredSupport,count);const range=kindRanges.get(station.kind);if(stationIndex>range.first+20&&stationIndex<range.last-20)assert.equal(count,6,`Rueda sin piso construido en ${station.kind}, estación ${stationIndex}.`);}
 const mean=(key)=>samples.reduce((sum,item)=>sum+item[key],0)/6,mx=mean('x'),mz=mean('z'),my=mean('y');
 const xx=samples.reduce((sum,item)=>sum+(item.x-mx)**2,0),zz=samples.reduce((sum,item)=>sum+(item.z-mz)**2,0),xz=samples.reduce((sum,item)=>sum+(item.x-mx)*(item.z-mz),0),xy=samples.reduce((sum,item)=>sum+(item.x-mx)*(item.y-my),0),zy=samples.reduce((sum,item)=>sum+(item.z-mz)*(item.y-my),0),det=xx*zz-xz*xz;
 const lateralSlope=(xy*zz-zy*xz)/det,longitudinalSlope=(zy*xx-xy*xz)/det,residual=Math.max(...samples.map(item=>Math.abs(item.y-(my+lateralSlope*(item.x-mx)+longitudinalSlope*(item.z-mz))))),roll=Math.abs(Math.atan(lateralSlope)),pitch=Math.abs(Math.atan(longitudinalSlope));
 const turnRadius=station.kind==='giro'?jointMinRadius:station.kind==='natural'||station.kind==='firme'||station.kind==='rampa'?10.27:Infinity,lateralAcceleration=inspectionSpeed**2/turnRadius;
 const lateralMargin=Math.min(...samples.map(item=>Math.abs(item.x)))-size.y*(Math.abs(lateralSlope)+lateralAcceleration/marsG),longitudinalMargin=Math.min(...samples.filter(item=>Math.abs(item.z)>.5).map(item=>Math.abs(item.z)))-size.y*Math.abs(longitudinalSlope);
 const friction=Math.hypot(Math.abs(Math.tan(pitch))+rolling,Math.abs(Math.tan(roll))+lateralAcceleration/marsG);
 for(const x of [-size.x*.3,0,size.x*.3])for(const z of [-size.z*.3,0,size.z*.3]){const position=at.clone().addScaledVector(normal,x).addScaledVector(heading,z),surface=supportAt(position.x,position.y),plane=my+lateralSlope*(x-mx)+longitudinalSlope*(z-mz);minBodyClearance=Math.min(minBodyClearance,plane+underbodyClearance-surface.y);}
 maxResidual=Math.max(maxResidual,residual);maxRoll=Math.max(maxRoll,roll);maxPitch=Math.max(maxPitch,pitch);minLateralMargin=Math.min(minLateralMargin,lateralMargin);minLongitudinalMargin=Math.min(minLongitudinalMargin,longitudinalMargin);maxRequiredMu=Math.max(maxRequiredMu,friction);checked++;
 if(!worst||residual>worst.residual)worst={kind:station.kind,index:stationIndex,residual,roll,pitch};
}
console.log(`GLB ${size.x.toFixed(3)} × ${size.y.toFixed(3)} × ${size.z.toFixed(3)} m; ruedas x/z: ${contacts.map(wheel=>`(${wheel.x.toFixed(3)},${wheel.z.toFixed(3)})`).join(' ')}.`);
console.log(`${checked} estaciones: seis ruedas sobre firme/rampa/piso/chapa/tablero en sus tramos interiores; ${minimumEngineeredSupport}/6 sobre obra en transiciones con el terreno; giro sobre chapa Rmín ${jointMinRadius.toFixed(3)} m; desnivel residual máximo ${(maxResidual*100).toFixed(2)} cm (${worst.kind}, #${worst.index}); roll ${(maxRoll*180/Math.PI).toFixed(2)}°, pitch ${(maxPitch*180/Math.PI).toFixed(2)}°; márgenes geométricos lateral ${minLateralMargin.toFixed(3)} m, longitudinal ${minLongitudinalMargin.toFixed(3)} m; despeje inferior proxy ${minBodyClearance.toFixed(3)} m; μ requerido ${maxRequiredMu.toFixed(3)} frente a supuesto ${assumedFriction.toFixed(2)}.`);
assert.ok(maxResidual<=.15,'El terreno exige más de 15 cm de articulación vertical en la proxy rígida.');
assert.ok(maxRoll<=10*Math.PI/180+.003,'El balanceo supera el criterio geométrico interno de 10°.');
assert.ok(Math.tan(maxPitch)<=.15+.003,'El cabeceo supera el criterio longitudinal interno de 15 %.');
assert.ok(minLateralMargin>=.3&&minLongitudinalMargin>=.3,'La proyección conservadora del centro de masa sale de la huella de seis ruedas.');
assert.ok(minBodyClearance>=.05,'Los bajos conservadores del GLB rozan el terreno o el piso.');
assert.ok(maxRequiredMu<=assumedFriction,'La fricción supuesta no cubre pendiente, peralte y rodadura a 0.5 m/s.');
const cargoLength=cargoStart.distanceTo(cargoEnd),supportFractions=[0,...WORKSHOP_CARGO_LINK.supports,1],span=Math.max(...supportFractions.slice(1).map((fraction,index)=>(fraction-supportFractions[index])*cargoLength));
const rampLength=model.rampDistance.at(-1),rampFractions=[0,...transfer.rampSupports,1],rampSpan=Math.max(...rampFractions.slice(1).map((fraction,index)=>(fraction-rampFractions[index])*rampLength));
const designLoad=massKg*marsG*ROVER_TRANSFER_DESIGN.loadFactor,b=ROVER_TRANSFER_DESIGN.beamWidth,h=ROVER_TRANSFER_DESIGN.beamDepth,t=ROVER_TRANSFER_DESIGN.beamWall;
const inertia=(b*h**3-(b-2*t)*(h-2*t)**3)/12,stress=(designLoad*span/4)*(h/2)/inertia,deflection=designLoad*span**3/(48*ROVER_TRANSFER_DESIGN.assumedElasticModulusPa*inertia),bearing=designLoad/(Math.PI*ROVER_TRANSFER_DESIGN.footingRadius**2);
assert.ok(span<=ROVER_TRANSFER_DESIGN.maxSupportSpan&&rampSpan<=ROVER_TRANSFER_DESIGN.maxSupportSpan,'La separación entre apoyos supera el alcance conceptual de diseño.');
assert.ok(stress<ROVER_TRANSFER_DESIGN.assumedYieldPa/2,'La viga conceptual supera la mitad de la fluencia supuesta.');
assert.ok(deflection<span/500,'La flecha conceptual supera L/500.');
assert.ok(bearing<ROVER_TRANSFER_DESIGN.allowableSoilPressurePa,'El apoyo excede la presión admisible supuesta del terreno.');
const approach=new T.Vector2(cargoStart.x-cargoEnd.x,cargoStart.z-cargoEnd.z).normalize(),angle=Math.abs(Math.atan2(approach.y,approach.x)),projectedWidth=size.x*Math.cos(angle)+size.z*Math.sin(angle),clearance=(WORKSHOP_WEST_BAY.width-projectedWidth)/2,requiredOpenFraction=(projectedWidth+1)/(2*WORKSHOP_WEST_GATE.travel);
assert.ok(clearance>=.5&&requiredOpenFraction<=1,'El portón no libera la envolvente del GLB con 0.5 m por lado.');
assert.ok(Math.abs(cargoStart.y+.1-(WORKSHOP_NORTH_ACCESS.foundationY+.225))<.001,'El tablero no llega enrasado al umbral del taller.');
console.log(`Carga conceptual ${designLoad.toFixed(0)} N con factor ${ROVER_TRANSFER_DESIGN.loadFactor}; vanos tablero ${span.toFixed(3)} m/rampa ${rampSpan.toFixed(3)} m; un larguero recibe toda la carga: σ ${(stress/1e6).toFixed(2)} MPa, flecha ${(deflection*1000).toFixed(2)} mm; un apoyo recibe toda la carga: ${(bearing/1000).toFixed(2)} kPa (comparados solo con valores de material/suelo supuestos).`);
console.log(`Portón: margen por lado ${clearance.toFixed(3)} m, apertura requerida ≥${(requiredOpenFraction*100).toFixed(1)} % y hoja completamente abierta antes del cruce; piso/umbral enrasado.`);
console.log('PASS: seis huellas del GLB, giro, apoyos y cargas conceptuales comprobados. No certifica suspensión, fricción ni resistencia reales.');
