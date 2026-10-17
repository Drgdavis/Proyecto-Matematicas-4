import * as T from 'three';
import { landscape } from './marsMath.ts';
import { ROVER_LOGISTICS_TRANSFER, WORKSHOP_CARGO_LINK } from './marsHabitat.ts';

const transfer=ROVER_LOGISTICS_TRANSFER;
const vector=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);
const smooth=(u:number)=>{const t=Math.max(0,Math.min(1,u));return t*t*(3-2*t);};

// The same sections drive the visible road/ramp and the six-wheel verifier.
// These are geometry and terrain elevations, not material or traction ratings.
export function createRoverLogisticsSurface(landingY:number,workshopY:number){
 const transferCurve=new T.CatmullRomCurve3(transfer.waypoints.map(p=>vector(p.x,0,p.z)),false,'centripetal');
 const bankRise=transfer.width*Math.tan(transfer.bankLimitDeg*Math.PI/180);
 const roadSection=(time:number)=>{
  const center=transferCurve.getPoint(time),tangent=transferCurve.getTangent(time),normal=vector(-tangent.z,0,tangent.x).normalize();
  const blend=Math.max(0,Math.min(1,(time-transfer.stabilizedStartT)/transfer.roadEntryBlendT));
  const offset=transfer.roadEntryLip+(.18-transfer.roadEntryLip)*smooth(blend);
  const edges=[-1,1].map(side=>{const x=center.x+side*transfer.width/2*normal.x,z=center.z+side*transfer.width/2*normal.z,ground=landscape(x,z);return{x,z,ground,natural:ground+offset};});
  const high=Math.max(...edges.map(edge=>edge.natural));
  return edges.map(edge=>({...edge,top:Math.max(edge.natural,high-bankRise)}));
 };
 const rampEntry=transferCurve.getPoint(transfer.rampStartT),incoming=transferCurve.getTangent(transfer.rampStartT).setY(0).normalize();
 const rampExit=vector(transfer.rampEnd.x,0,transfer.rampEnd.z),outgoing=vector(WORKSHOP_CARGO_LINK.endX-rampExit.x,0,WORKSHOP_CARGO_LINK.endZ-rampExit.z).normalize();
 const rampCurve=new T.CubicBezierCurve3(rampEntry,rampEntry.clone().addScaledVector(incoming,transfer.rampControlIn),rampExit.clone().addScaledVector(outgoing,-transfer.rampControlOut),rampExit);
 const rampCount=120,rampCenters=Array.from({length:rampCount+1},(_,i)=>rampCurve.getPoint(i/rampCount)),rampDistance=[0];
 for(let i=1;i<=rampCount;i++)rampDistance.push(rampDistance[i-1]+rampCenters[i].distanceTo(rampCenters[i-1]));
 const entryHeights=roadSection(transfer.rampStartT).map(edge=>edge.top-.07);
 const padDrivingTop=landingY+.02;
 const rampProgress=(time:number)=>{const q=Math.max(0,Math.min(rampCount,time*rampCount)),index=Math.min(rampCount-1,Math.floor(q));return (rampDistance[index]+(rampDistance[index+1]-rampDistance[index])*(q-index))/rampDistance[rampCount];};
 const rampCrown=(fraction:number)=>transfer.rampCrestHeight*smooth((fraction-transfer.rampCrestStart)/(transfer.rampCrestTop-transfer.rampCrestStart))*(1-smooth((fraction-transfer.rampCrestTop)/(1-transfer.rampCrestTop)));
 const rampTop=(sideIndex:number,time:number)=>{const fraction=rampProgress(time);return entryHeights[sideIndex]*(1-fraction)+(padDrivingTop-.07)*fraction+rampCrown(fraction)+.07;};
 const cargoStart=vector(WORKSHOP_CARGO_LINK.startX,workshopY+.125,WORKSHOP_CARGO_LINK.startZ),cargoEnd=vector(WORKSHOP_CARGO_LINK.endX,padDrivingTop-.1,WORKSHOP_CARGO_LINK.endZ);
 const padStart=vector(rampExit.x,padDrivingTop,rampExit.z);
 const padHeading=cargoEnd.clone().sub(padStart).setY(0).normalize(),deckHeading=cargoStart.clone().sub(cargoEnd).setY(0).normalize(),jointHalfLength=WORKSHOP_CARGO_LINK.jointLength/2;
 const jointStart=cargoEnd.clone().addScaledVector(padHeading,-jointHalfLength),jointEnd=cargoEnd.clone().addScaledVector(deckHeading,jointHalfLength);
 const jointCurve=new T.CubicBezierCurve3(jointStart,jointStart.clone().addScaledVector(padHeading,jointHalfLength*.55),jointEnd.clone().addScaledVector(deckHeading,-jointHalfLength*.55),jointEnd);
 const deckRun=Math.hypot(cargoStart.x-cargoEnd.x,cargoStart.z-cargoEnd.z),deckGrade=(workshopY+.225-padDrivingTop)/deckRun;
 const jointTop=(x:number,z:number)=>padDrivingTop+deckGrade*Math.max(0,(x-cargoEnd.x)*deckHeading.x+(z-cargoEnd.z)*deckHeading.z);
 const jointDeckGeometry=()=>{
  const along=20,across=12,vertices:number[]=[],indices:number[]=[],normal=vector(-padHeading.z,0,padHeading.x),halfWidth=WORKSHOP_CARGO_LINK.jointWidth/2;
  for(const depth of [0,-.1])for(let i=0;i<=along;i++)for(let j=0;j<=across;j++){const s=-jointHalfLength+2*jointHalfLength*i/along,w=-halfWidth+2*halfWidth*j/across,p=cargoEnd.clone().addScaledVector(padHeading,s).addScaledVector(normal,w);vertices.push(p.x,jointTop(p.x,p.z)+depth,p.z);}
  const layer=(along+1)*(across+1);
  for(let i=0;i<along;i++)for(let j=0;j<across;j++){const a=i*(across+1)+j,b=a+across+1;indices.push(a,a+1,b,a+1,b+1,b,a+layer,b+layer,a+layer+1,a+layer+1,b+layer,b+layer+1);}
  for(let i=0;i<along;i++)for(const edge of [0,across]){const a=i*(across+1)+edge,b=a+across+1;indices.push(a,a+layer,b,b,a+layer,b+layer);}
  for(let j=0;j<across;j++)for(const edge of [0,along]){const a=edge*(across+1)+j;indices.push(a,a+1,a+layer,a+1,a+layer+1,a+layer);}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
 };
 return {transferCurve,roadSection,rampCurve,rampCount,rampCenters,rampDistance,rampProgress,rampTop,padDrivingTop,cargoStart,cargoEnd,padStart,jointStart,jointEnd,jointCurve,jointTop,jointDeckGeometry};
}

// Opt-in visual inspection route. Its playback speed is accelerated; the
// vehicle checks use the separate 0.5 m/s conceptual inspection case.
export function roverLogisticsDrivePath(model:ReturnType<typeof createRoverLogisticsSurface>,workshopY:number){
 const {transferCurve,roadSection,rampCurve,rampTop,padStart,cargoEnd,cargoStart,padDrivingTop,jointStart,jointEnd,jointCurve,jointTop}=model;
 const stations:{kind:string;point:T.Vector3;distance:number}[]=[];
 const add=(kind:string,point:T.Vector3)=>{if(stations.length&&stations.at(-1)!.point.distanceTo(point)<1e-5)return;const distance=stations.length?stations.at(-1)!.distance+stations.at(-1)!.point.distanceTo(point):0;stations.push({kind,point,distance});};
 const alongCurve=(kind:string,count:number,start:number,end:number,curve:T.Curve<T.Vector3>,height:(t:number,p:T.Vector3)=>number)=>{for(let i=0;i<=count;i++){const t=start+(end-start)*i/count,p=curve.getPoint(t);add(kind,vector(p.x,height(t,p),p.z));}};
 alongCurve('natural',140,0,transfer.stabilizedStartT,transferCurve,(_,p)=>landscape(p.x,p.z));
 alongCurve('firme',180,transfer.stabilizedStartT,transfer.rampStartT,transferCurve,t=>{const edges=roadSection(t);return (edges[0].top+edges[1].top)/2;});
 alongCurve('rampa',90,0,1,rampCurve,t=>(rampTop(0,t)+rampTop(1,t))/2);
 const padLength=Math.hypot(jointStart.x-padStart.x,jointStart.z-padStart.z);
 for(let i=0;i<=30;i++){const p=padStart.clone().lerp(jointStart,i/30);add('plataforma',vector(p.x,padDrivingTop,p.z));}
 alongCurve('giro',50,0,1,jointCurve,(_,p)=>jointTop(p.x,p.z));
 const deckLength=Math.hypot(cargoStart.x-cargoEnd.x,cargoStart.z-cargoEnd.z),deckBegin=Math.hypot(jointEnd.x-cargoEnd.x,jointEnd.z-cargoEnd.z)/deckLength;
 for(let i=0;i<=120;i++){const t=deckBegin+(1-deckBegin)*i/120,p=cargoEnd.clone().lerp(cargoStart,t);add('tablero',vector(p.x,padDrivingTop+(workshopY+.225-padDrivingTop)*t,p.z));}
 const direction=cargoStart.clone().sub(cargoEnd).setY(0).normalize();
 for(let i=1;i<=12;i++)add('taller',vector(cargoStart.x+direction.x*i*.25,workshopY+.225,cargoStart.z+direction.z*i*.25));
 return {stations,length:stations.at(-1)!.distance,padLength};
}
