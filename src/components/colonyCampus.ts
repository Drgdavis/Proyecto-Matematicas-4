import * as T from 'three';
import { CAMPUS_CORE_SITE, landscape } from '../data/marsMath.ts';
import { HABITAT_RING_ACCESS } from '../data/marsHabitat.ts';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const CAPSULE_PORTAL={bodyRadius:3.25,straightHalfLength:3.2,openingRadius:1.36,centerRise:3.2,corridorRadius:1.3,floorOffset:.9,walkwayWidth:1.65} as const;
const CORE_PORTAL={radius:1.36,rise:1.04,wallRadius:18} as const;
export const capsulePortalAxial=CAPSULE_PORTAL.straightHalfLength+Math.sqrt(CAPSULE_PORTAL.bodyRadius**2-CAPSULE_PORTAL.openingRadius**2);
const workshopPadEdge=Math.max(...Array.from({length:48},(_,i)=>{const a=i/48*Math.PI*2;return landscape(-20+10*Math.cos(a),-35+10*Math.sin(a));}));
export const WORKSHOP_NORTH_ACCESS={x:-18.5,z:-29.1,foundationY:workshopPadEdge+.45+.225,centerRise:1.75,radius:1.36,interiorRampLength:6.1} as const;
export const INDUSTRY_ACCESS={openingRadius:1.5,centerRise:1.75,wallWidth:23,wallHeight:6,parkedLeafOffset:-3.45} as const;

export function industryFrontWallGeometry(){
 const {wallWidth,wallHeight,openingRadius,centerRise}=INDUSTRY_ACCESS;
 const outline=new T.Shape();outline.moveTo(-wallWidth/2,0);outline.lineTo(wallWidth/2,0);outline.lineTo(wallWidth/2,wallHeight);outline.lineTo(-wallWidth/2,wallHeight);outline.closePath();
 const aperture=new T.Path();aperture.absarc(0,centerRise,openingRadius,0,Math.PI*2,true);outline.holes.push(aperture);
 return new T.ShapeGeometry(outline,48);
}

// Architectural geometry is independent of the mathematical evidence layer.
// Coordinates and dimensions are metres; the terrain is never flattened by a mesh.
export function createColonyCampus(regolith:T.Texture){
 const root=new T.Group();root.name='EVA03 · radial settlement';
 const ivory=new T.MeshStandardMaterial({color:'#ddd6bd',metalness:.3,roughness:.48});
 const dark=new T.MeshStandardMaterial({color:'#39413e',metalness:.55,roughness:.5});
 const padSurface=new T.MeshStandardMaterial({color:'#74614f',roughness:.9});
 const rim=new T.MeshStandardMaterial({color:'#b0a591',metalness:.65,roughness:.35});
 const windowMat=new T.MeshPhysicalMaterial({color:'#4d777a',metalness:.55,roughness:.22,transparent:true,opacity:.66,depthWrite:false});
 const amber=new T.MeshStandardMaterial({color:'#ffbd76',emissive:'#e99442',emissiveIntensity:.65});
 const soil=new T.MeshStandardMaterial({map:regolith,color:'#ac7959',roughness:1});
 const solar=new T.MeshStandardMaterial({color:'#273d51',metalness:.68,roughness:.27});
 const v=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);
 const mesh=(g:T.BufferGeometry,m:T.Material,x:number,y:number,z:number,parent:T.Object3D=root)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
 const box=(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,parent:T.Object3D=root)=>mesh(new T.BoxGeometry(w,h,d),m,x,y,z,parent);
 const rod=(a:T.Vector3,b:T.Vector3,r:number,m:T.Material,parent:T.Object3D=root)=>{const d=b.clone().sub(a);if(d.length()<1e-5)return;const o=mesh(new T.CylinderGeometry(r,r,d.length(),8),m,0,0,0,parent);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(v(0,1,0),d.normalize());return o;};
 const slab=(x:number,z:number,r:number)=>{const heights=Array.from({length:24},(_,i)=>landscape(x+r*Math.cos(i/24*Math.PI*2),z+r*Math.sin(i/24*Math.PI*2)));const top=Math.max(...heights)+.35,bottom=Math.min(...heights)-.4;mesh(new T.CylinderGeometry(r,r+1,top-bottom,48),soil,x,(top+bottom)/2,z);mesh(new T.CylinderGeometry(r,r,.35,48),padSurface,x,top,z);return top+.18;};
 const ports:{x:number;z:number;y:number}[]=[];
 function corridor(a:T.Vector3,b:T.Vector3,r=1.45){const direction=b.clone().sub(a).normalize();rod(a,b,r,ivory);const length=a.distanceTo(b),n=Math.ceil(length/2.2);for(let i=0;i<=n;i++){const ring=mesh(new T.TorusGeometry(r+.03,.065,5,16),dark,0,0,0);ring.position.copy(a).lerp(b,i/n);ring.quaternion.setFromUnitVectors(v(0,0,1),direction);}rod(a.clone().add(v(0,r*.9,0)),b.clone().add(v(0,r*.9,0)),.055,amber);}
 function podCorridor(a:T.Vector3,b:T.Vector3,trimStart=0,trimEnd=0){const direction=b.clone().sub(a).normalize(),run=Math.hypot(b.x-a.x,b.z-a.z),rise=b.y-a.y,grade=Math.abs(rise)/run,r=CAPSULE_PORTAL.corridorRadius;
  // An open-ended skin surrounds either a short ramp or actual level treads.
  const shellA=a.clone().lerp(b,trimStart/run),shellB=b.clone().lerp(a,trimEnd/run),shellLength=shellA.distanceTo(shellB);
  const shell=mesh(new T.CylinderGeometry(r,r,shellLength,20,1,true),windowMat,0,0,0);shell.position.copy(shellA).add(shellB).multiplyScalar(.5);shell.quaternion.setFromUnitVectors(v(0,1,0),direction);shell.castShadow=false;
  let steps=0,maxRiser=0;
  if(grade<=.15){const deck=mesh(new T.BoxGeometry(CAPSULE_PORTAL.walkwayWidth,.14,a.distanceTo(b)+.08),padSurface,0,0,0);deck.position.copy(a).add(b).multiplyScalar(.5).add(v(0,-CAPSULE_PORTAL.floorOffset,0));deck.quaternion.setFromUnitVectors(v(0,0,1),direction);}
  else{steps=Math.ceil(Math.abs(rise)/.16)+1;maxRiser=Math.abs(rise)/(steps-1);const yaw=Math.atan2(b.x-a.x,b.z-a.z);
   for(let i=0;i<steps;i++){const t=(i+.5)/steps,tread=mesh(new T.BoxGeometry(CAPSULE_PORTAL.walkwayWidth,.14,run/steps+.025),padSurface,a.x+(b.x-a.x)*t,a.y-CAPSULE_PORTAL.floorOffset+rise*i/(steps-1),a.z+(b.z-a.z)*t);tread.rotation.y=yaw;}
  }
  const rings=Math.ceil(shellLength/2.2);for(let i=0;i<=rings;i++){const ring=mesh(new T.TorusGeometry(r+.025,.065,6,24),rim,0,0,0);ring.position.copy(shellA).lerp(shellB,i/rings);ring.quaternion.setFromUnitVectors(v(0,0,1),direction);}
  return {run,rise,grade,steps,maxRiser,accessType:steps?'escalera':'rampa'} as const;
 }
 function northBridge(a:T.Vector3,crest:T.Vector3,b:T.Vector3){const r=CAPSULE_PORTAL.corridorRadius,trim=1.8;
  // One continuous open-ended skin crosses the rover route. Two joined deck
  // grades meet at the high point; there are no overlapping bent cylinders.
  const center=(z:number)=>z<=crest.z?a.y+(crest.y-a.y)*(z-a.z)/(crest.z-a.z):crest.y+(b.y-crest.y)*(z-crest.z)/(b.z-crest.z);
  const zs=[...Array.from({length:25},(_,i)=>a.z+trim+(crest.z-a.z-trim)*i/24),...Array.from({length:25},(_,i)=>crest.z+(b.z-trim-crest.z)*(i+1)/25)];
  const radial=24,vertices:number[]=[],indices:number[]=[];
  for(const z of zs)for(let j=0;j<=radial;j++){const angle=j/radial*Math.PI*2;vertices.push(a.x+r*Math.cos(angle),center(z)+r*Math.sin(angle),z);}
  for(let i=0;i<zs.length-1;i++)for(let j=0;j<radial;j++){const p=i*(radial+1)+j,q=p+radial+1;indices.push(p,p+1,q,p+1,q+1,q);}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();const shell=mesh(geometry,windowMat,0,0,0);shell.castShadow=false;
  for(const [start,end] of [[a,crest],[crest,b]]){const direction=end.clone().sub(start).normalize(),deck=mesh(new T.BoxGeometry(CAPSULE_PORTAL.walkwayWidth,.14,start.distanceTo(end)+.08),padSurface,0,0,0);deck.position.copy(start).add(end).multiplyScalar(.5).add(v(0,-CAPSULE_PORTAL.floorOffset,0));deck.quaternion.setFromUnitVectors(v(0,0,1),direction);}
  for(let z=a.z+trim;z<=b.z-trim+.01;z+=2.2){const position=v(a.x,center(z),z),ring=mesh(new T.TorusGeometry(r+.025,.065,6,24),rim,position.x,position.y,position.z);ring.castShadow=false;}
  return {start:a.toArray(),crest:crest.toArray(),end:b.toArray(),radius:r,floorOffset:CAPSULE_PORTAL.floorOffset};
 }
 function dome(x:number,z:number,r:number){const y=slab(x,z,r+1),portalRadius=CORE_PORTAL.radius,portalRise=CORE_PORTAL.rise,wallHeight=2.4;
  // A hollow perimeter opens only where a radial corridor is actually being checked.
  const apertureAngle=Math.asin(portalRadius/r),portalAngles=[0,Math.PI/4],wallVertices:number[]=[];
  const angles=[...Array.from({length:257},(_,i)=>-Math.PI+2*Math.PI*i/256)];
  for(const center of portalAngles)for(let i=0;i<=24;i++)angles.push(center-apertureAngle+2*apertureAngle*i/24);
  angles.sort((a,b)=>a-b);const distinct=angles.filter((angle,i)=>i===0||angle-angles[i-1]>1e-7);
  const vertex=(angle:number,height:number)=>v(r*Math.cos(angle),height,r*Math.sin(angle));
  const band=(a:number,b:number,bottomA:number,topA:number,bottomB:number,topB:number)=>{
   if(topA<=bottomA&&topB<=bottomB)return;
   const p=[vertex(a,bottomA),vertex(b,bottomB),vertex(b,topB),vertex(a,topA)];
   for(const index of [0,1,2,0,2,3])wallVertices.push(p[index].x,p[index].y,p[index].z);
  };
  for(let i=0;i<distinct.length-1;i++){
   const a=distinct[i],b=distinct[i+1],opening=portalAngles.find(center=>Math.abs((a+b)/2-center)<apertureAngle);
   if(opening===undefined){band(a,b,0,wallHeight,0,wallHeight);continue;}
   const edge=(angle:number)=>Math.sqrt(Math.max(0,portalRadius**2-(r*Math.sin(angle-opening))**2));
   const lowA=Math.max(0,portalRise-edge(a)),lowB=Math.max(0,portalRise-edge(b));
   const highA=Math.min(wallHeight,portalRise+edge(a)),highB=Math.min(wallHeight,portalRise+edge(b));
   band(a,b,0,lowA,0,lowB);band(a,b,highA,wallHeight,highB,wallHeight);
  }
  const wallGeo=new T.BufferGeometry();wallGeo.setAttribute('position',new T.Float32BufferAttribute(wallVertices,3));wallGeo.computeVertexNormals();
  const wallMat=ivory.clone();wallMat.side=T.DoubleSide;mesh(wallGeo,wallMat,x,y,z);
  mesh(new T.CylinderGeometry(r+.04,r+.04,.14,64),padSurface,x,y+portalRise-CAPSULE_PORTAL.floorOffset,z);
  for(const angle of portalAngles){const normal=v(Math.cos(angle),0,Math.sin(angle)),tangent=v(-Math.sin(angle),0,Math.cos(angle)),center=v(x+r*normal.x,y+portalRise,z+r*normal.z);
   const frame=mesh(new T.TorusGeometry(portalRadius+.035,.075,8,40),rim,center.x+normal.x*.025,center.y,center.z+normal.z*.025);frame.quaternion.setFromUnitVectors(v(0,0,1),normal);
   // Each hatch is parked beside its opening in the walkthrough state.
   const parked=center.clone().addScaledVector(tangent,2.65).addScaledVector(normal,.22);
   const hatch=mesh(new T.CylinderGeometry(portalRadius-.09,portalRadius-.09,.1,32),dark,parked.x,parked.y,parked.z);hatch.quaternion.setFromUnitVectors(v(0,1,0),normal);
   const grip=mesh(new T.TorusGeometry(.17,.035,6,20),rim,parked.x+normal.x*.07,parked.y,parked.z+normal.z*.07);grip.quaternion.setFromUnitVectors(v(0,0,1),normal);
  }
  // Triangular geodesic lattice, clipped to the upper half of an icosphere.
  const geo=new T.IcosahedronGeometry(r,2),p=geo.attributes.position,triangles:number[]=[],edges=new Set<string>();
  for(let i=0;i<p.count;i+=3){const poly:T.Vector3[]=[];for(let k=0;k<3;k++){const a=v(p.getX(i+k),p.getY(i+k),p.getZ(i+k)),b=v(p.getX(i+(k+1)%3),p.getY(i+(k+1)%3),p.getZ(i+(k+1)%3));if(a.y>=0)poly.push(a);if((a.y>=0)!==(b.y>=0))poly.push(a.clone().lerp(b,a.y/(a.y-b.y)));}if(poly.length<3)continue;for(let k=1;k<poly.length-1;k++)for(const a of [poly[0],poly[k],poly[k+1]])triangles.push(a.x,a.y*.68,a.z);for(let k=0;k<poly.length;k++){const a=poly[k],b=poly[(k+1)%poly.length],key=[a.toArray().map(n=>n.toFixed(3)).join(','),b.toArray().map(n=>n.toFixed(3)).join(',')].sort().join('|');if(!edges.has(key)){edges.add(key);rod(v(x+a.x,y+2.42+a.y*.68,z+a.z),v(x+b.x,y+2.42+b.y*.68,z+b.z),.11,ivory);}}}
  const domeGeo=new T.BufferGeometry();domeGeo.setAttribute('position',new T.Float32BufferAttribute(triangles,3));domeGeo.computeVertexNormals();const d=mesh(domeGeo,windowMat,x,y+2.4,z);d.castShadow=false;geo.dispose();
  for(let k=1;k<12;k++){const a=k/12*Math.PI*2;const pane=box(x+(r+.02)*Math.cos(a),y+1.2,z+(r+.02)*Math.sin(a),r*.32,.75,.06,windowMat);pane.rotation.y=Math.PI/2-a;}
  return y;
 }
 const cx=CAMPUS_CORE_SITE.x,cz=CAMPUS_CORE_SITE.z,cy=dome(cx,cz,CORE_PORTAL.wallRadius);
 const corePortalAt=(angle:number)=>({x:cx+CORE_PORTAL.wallRadius*Math.cos(angle),y:cy+CORE_PORTAL.rise,z:cz+CORE_PORTAL.wallRadius*Math.sin(angle),floorY:cy+CORE_PORTAL.rise-CAPSULE_PORTAL.floorOffset,radius:CORE_PORTAL.radius});
 const coreEastPortal=corePortalAt(0),coreNorthEastPortal=corePortalAt(Math.PI/4);
 const ringRadius=29,ringPorts=8;
 const trunkSupports:{segment:string;x:number;z:number;groundY:number;topY:number;axisX:number;axisY:number;axisZ:number}[]=[];
 let northBridgeData:ReturnType<typeof northBridge>|null=null;
 function supportTrunk(a:T.Vector3,b:T.Vector3,ratios:number[],segment:string){const run=Math.hypot(b.x-a.x,b.z-a.z),side=v(-(b.z-a.z)/run,0,(b.x-a.x)/run);
  for(const t of ratios){const center=a.clone().lerp(b,t),beamY=center.y-CAPSULE_PORTAL.corridorRadius-.1,left=center.clone().addScaledVector(side,-1.42),right=center.clone().addScaledVector(side,1.42);
   rod(v(left.x,beamY,left.z),v(right.x,beamY,right.z),.1,rim);
   for(const foot of [left,right]){const groundY=landscape(foot.x,foot.z);rod(v(foot.x,groundY+.15,foot.z),v(foot.x,beamY,foot.z),.14,dark);mesh(new T.CylinderGeometry(.27,.3,.16,12),rim,foot.x,groundY+.08,foot.z);trunkSupports.push({segment,x:foot.x,z:foot.z,groundY,topY:beamY,axisX:center.x,axisY:center.y,axisZ:center.z});}
  }
 }
 let ringEastJunctionData:{x:number;z:number;centerY:number;floorY:number;apothem:number;ports:{kind:string;x:number;y:number;z:number;radius:number;normalX:number;normalZ:number;targetX:number;targetY:number;targetZ:number}[];supports:{x:number;z:number;groundY:number;topY:number}[]}|null=null;
 let ringNorthEastJunctionData:typeof ringEastJunctionData=null;
 let ringNorthJunctionData:typeof ringEastJunctionData=null;
 function ringEastJunction(){const node=v(ports[0].x,ports[0].y,ports[0].z),apothem=3.2,height=4.2,baseY=node.y-1.4,floorY=node.y-CAPSULE_PORTAL.floorOffset,openingRadius=1.45;
  const angles=[0,5*Math.PI/16,5*Math.PI/8,Math.PI,11*Math.PI/8,27*Math.PI/16];
  const vertices=angles.map((a,i)=>{const next=i===angles.length-1?2*Math.PI:angles[i+1],mid=(a+next)/2,r=apothem/Math.cos((next-a)/2);return v(r*Math.cos(mid),0,r*Math.sin(mid));});
  const polygon=new T.Shape();vertices.forEach((point,i)=>i?polygon.lineTo(point.x,point.z):polygon.moveTo(point.x,point.z));polygon.closePath();
  const floorMat=padSurface.clone();floorMat.side=T.DoubleSide;const roofMat=windowMat.clone();roofMat.side=T.DoubleSide;
  const floor=mesh(new T.ShapeGeometry(polygon),floorMat,node.x,floorY,node.z);floor.rotation.x=Math.PI/2;
  const roof=mesh(new T.ShapeGeometry(polygon),roofMat,node.x,baseY+height,node.z);roof.rotation.x=Math.PI/2;roof.castShadow=false;
  const targets=[{kind:'ala-este',target:v(33,landscape(33,8)+2.9,8)},
   {kind:'anillo-norte',target:v(ports[1].x,ports[1].y,ports[1].z)},
   {kind:'núcleo',target:v(coreEastPortal.x,coreEastPortal.y,coreEastPortal.z)},
   {kind:'anillo-sur',target:v(ports[7].x,ports[7].y,ports[7].z)}];
  const wallMat=ivory.clone();wallMat.side=T.DoubleSide;
  const ringPortals:{kind:string;x:number;y:number;z:number;radius:number;normalX:number;normalZ:number;targetX:number;targetY:number;targetZ:number}[]=[];
  for(let i=0;i<angles.length;i++){const a=angles[i],normal=v(Math.cos(a),0,Math.sin(a)),tangent=v(-Math.sin(a),0,Math.cos(a)),before=vertices[(i+vertices.length-1)%vertices.length],after=vertices[i];
   const left=before.dot(tangent),right=after.dot(tangent),outline=new T.Shape();outline.moveTo(left,0);outline.lineTo(right,0);outline.lineTo(right,height);outline.lineTo(left,height);outline.closePath();
   const target=targets.find(item=>Math.abs(Math.atan2(item.target.z-node.z,item.target.x-node.x)-a)<.001||Math.abs(Math.atan2(item.target.z-node.z,item.target.x-node.x)-a+2*Math.PI)<.001);
   let holeY=0;
   if(target){const run=Math.hypot(target.target.x-node.x,target.target.z-node.z);holeY=1.4+(target.target.y-node.y)*apothem/run;
    const hole=new T.Path();hole.absarc(0,holeY,openingRadius,0,Math.PI*2,true);outline.holes.push(hole);
    ringPortals.push({kind:target.kind,x:node.x+normal.x*apothem,y:baseY+holeY,z:node.z+normal.z*apothem,radius:openingRadius,normalX:normal.x,normalZ:normal.z,targetX:target.target.x,targetY:target.target.y,targetZ:target.target.z});
   }
   const basis=new T.Matrix4().makeBasis(tangent,v(0,1,0),normal.clone().negate()),orientation=new T.Quaternion().setFromRotationMatrix(basis);
   const wall=mesh(new T.ShapeGeometry(outline,32),wallMat,node.x+normal.x*apothem,baseY,node.z+normal.z*apothem);wall.quaternion.copy(orientation);
   if(target){const frame=mesh(new T.TorusGeometry(openingRadius+.04,.07,8,32),rim,node.x+normal.x*(apothem+.02),baseY+holeY,node.z+normal.z*(apothem+.02));frame.quaternion.copy(orientation);frame.castShadow=false;}
  }
  const supports:{x:number;z:number;groundY:number;topY:number}[]=[];
  for(const vertex of vertices){const x=node.x+vertex.x*.92,z=node.z+vertex.z*.92,groundY=landscape(x,z),topY=floorY-.08;
   rod(v(x,groundY+.15,z),v(x,topY,z),.15,dark);mesh(new T.CylinderGeometry(.28,.32,.16,12),rim,x,groundY+.08,z);
   rod(v(node.x+vertex.x,floorY,node.z+vertex.z),v(node.x+vertex.x,baseY+height,node.z+vertex.z),.085,rim);
   supports.push({x,z,groundY,topY});
  }
  ringEastJunctionData={x:node.x,z:node.z,centerY:node.y,floorY,apothem,ports:ringPortals,supports};
 }
 function ringCircularJunction(index:number,links:{kind:string;target:T.Vector3}[],supportAngles:number[]){const node=v(ports[index].x,ports[index].y,ports[index].z),radius=3.2,height=4.2,baseY=node.y-1.4,floorY=node.y-CAPSULE_PORTAL.floorOffset,openingRadius=1.45;
  const connections=links.map(item=>{
   const run=Math.hypot(item.target.x-node.x,item.target.z-node.z);return {...item,run,angle:(Math.atan2(item.target.z-node.z,item.target.x-node.x)+2*Math.PI)%(2*Math.PI),holeY:1.4+(item.target.y-node.y)*radius/run};
  });
  mesh(new T.CylinderGeometry(radius,radius,.14,48),padSurface,node.x,floorY-.07,node.z);
  const roof=mesh(new T.CylinderGeometry(radius,radius,.12,48),windowMat,node.x,baseY+height,node.z);roof.castShadow=false;
  const halfAngle=Math.asin(openingRadius/radius),angles=[...Array.from({length:257},(_,i)=>i*Math.PI*2/256)];
  const angularDelta=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
  for(const connection of connections)for(let i=0;i<=16;i++)angles.push((connection.angle-halfAngle+2*halfAngle*i/16+2*Math.PI)%(2*Math.PI));
  angles.sort((a,b)=>a-b);const distinct=angles.filter((angle,i)=>i===0||angle-angles[i-1]>1e-7),vertices:number[]=[];
  const point=(angle:number,y:number)=>v(radius*Math.cos(angle),y,radius*Math.sin(angle));
  const band=(a:number,b:number,lowA:number,highA:number,lowB:number,highB:number)=>{if(highA<=lowA&&highB<=lowB)return;const p=[point(a,lowA),point(b,lowB),point(b,highB),point(a,highA)];for(const index of [0,1,2,0,2,3])vertices.push(p[index].x,p[index].y,p[index].z);};
  for(let i=0;i<distinct.length-1;i++){
   const a=distinct[i],b=distinct[i+1],opening=connections.find(item=>Math.abs(angularDelta((a+b)/2,item.angle))<halfAngle);
   if(!opening){band(a,b,0,height,0,height);continue;}
   const edge=(angle:number)=>Math.sqrt(Math.max(0,openingRadius**2-(radius*Math.sin(angularDelta(angle,opening.angle)))**2));
   const lowA=Math.max(0,opening.holeY-edge(a)),lowB=Math.max(0,opening.holeY-edge(b)),highA=Math.min(height,opening.holeY+edge(a)),highB=Math.min(height,opening.holeY+edge(b));
   band(a,b,0,lowA,0,lowB);band(a,b,highA,height,highB,height);
  }
  const wallGeo=new T.BufferGeometry();wallGeo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));wallGeo.computeVertexNormals();const wallMat=ivory.clone();wallMat.side=T.DoubleSide;mesh(wallGeo,wallMat,node.x,baseY,node.z);
  const ringPortals=connections.map(item=>{const normal=v(Math.cos(item.angle),0,Math.sin(item.angle)),port=node.clone().addScaledVector(normal,radius),frame=mesh(new T.TorusGeometry(openingRadius+.04,.07,8,32),rim,port.x,baseY+item.holeY,port.z);frame.quaternion.setFromUnitVectors(v(0,0,1),normal);return {kind:item.kind,x:port.x,y:baseY+item.holeY,z:port.z,radius:openingRadius,normalX:normal.x,normalZ:normal.z,targetX:item.target.x,targetY:item.target.y,targetZ:item.target.z};});
  const supports:{x:number;z:number;groundY:number;topY:number}[]=[];
  for(const angle of supportAngles){const x=node.x+3.65*Math.cos(angle),z=node.z+3.65*Math.sin(angle),groundY=landscape(x,z),topY=floorY-.1;
   rod(v(x,groundY+.14,z),v(x,topY,z),.14,dark);mesh(new T.CylinderGeometry(.27,.3,.16,12),rim,x,groundY+.08,z);supports.push({x,z,groundY,topY});
  }
  return {x:node.x,z:node.z,centerY:node.y,floorY,apothem:radius,ports:ringPortals,supports};
 }
 for(let i=0;i<ringPorts;i++){const a=i/ringPorts*Math.PI*2,x=cx+ringRadius*Math.cos(a),z=cz+ringRadius*Math.sin(a),y=slab(x,z,i===0?4.5:3.5);ports.push({x,z,y:y+1.7});const start=i===0?v(coreEastPortal.x,coreEastPortal.y,coreEastPortal.z):v(coreNorthEastPortal.x,coreNorthEastPortal.y,coreNorthEastPortal.z),end=v(x,y+1.7,z);
  if(i===0){podCorridor(start,end,0,3.2);supportTrunk(start,end,[.5],'núcleo-anillo');}
  else if(i===1){podCorridor(start,end,0,3.2);supportTrunk(start,end,[.5],'núcleo-noreste');}
 }
 for(let i=0;i<ringPorts;i++){const a=ports[i],b=ports[(i+1)%ringPorts],start=v(a.x,a.y,a.z),end=v(b.x,b.y,b.z);
  podCorridor(start,end,3.2,3.2);supportTrunk(start,end,[1/3,2/3],`anillo-${i}-${(i+1)%ringPorts}`);
 }
 ringEastJunction();
 const northWingFirst=v(ports[2].x,landscape(ports[2].x,ports[2].z+12)+2.9,ports[2].z+12);
 const ix=31,iz=41,iy=slab(ix,iz,15.3),industryEntrance=v(ix,iy+1.75,iz-9);
 const workshopEntrance=v(WORKSHOP_NORTH_ACCESS.x,WORKSHOP_NORTH_ACCESS.foundationY+WORKSHOP_NORTH_ACCESS.centerRise,WORKSHOP_NORTH_ACCESS.z);
 ringNorthEastJunctionData=ringCircularJunction(1,[{kind:'anillo-este',target:v(ports[0].x,ports[0].y,ports[0].z)},{kind:'núcleo',target:v(coreNorthEastPortal.x,coreNorthEastPortal.y,coreNorthEastPortal.z)},{kind:'anillo-norte',target:v(ports[2].x,ports[2].y,ports[2].z)},{kind:'industria',target:industryEntrance}],[Math.PI/3,2*Math.PI/3,19*Math.PI/18,13*Math.PI/9]);
 ringNorthJunctionData=ringCircularJunction(2,[{kind:'anillo-noreste',target:v(ports[1].x,ports[1].y,ports[1].z)},{kind:'ala-norte',target:northWingFirst},{kind:'anillo-noroeste',target:v(ports[3].x,ports[3].y,ports[3].z)}],[Math.PI/6,2*Math.PI/3,4*Math.PI/3,3*Math.PI/2]);
 const ringJunctions=[ringEastJunctionData,ringNorthEastJunctionData,ringNorthJunctionData];
 for(let i=3;i<ringPorts;i++){
  const previous=ports[(i+ringPorts-1)%ringPorts],next=ports[(i+1)%ringPorts],links=[{kind:'anillo-anterior',target:v(previous.x,previous.y,previous.z)},{kind:'anillo-siguiente',target:v(next.x,next.y,next.z)}];
  if(i===4)links.push({kind:'ala-oeste',target:v(ports[i].x-12,landscape(ports[i].x-12,ports[i].z)+2.9,ports[i].z)});
  if(i===6)links.push({kind:'taller',target:workshopEntrance});
  if(i===7)links.push({kind:'hábitat',target:v(HABITAT_RING_ACCESS.x,HABITAT_RING_ACCESS.centerY,HABITAT_RING_ACCESS.z)});
  const directions=links.map(link=>Math.atan2(link.target.z-ports[i].z,link.target.x-ports[i].x));
  const separation=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
  const candidates=Array.from({length:144},(_,j)=>j*2*Math.PI/144).filter(angle=>directions.every(direction=>separation(angle,direction)>.5));
  const supportAngles:number[]=[];
  for(let j=0;j<4;j++){const selected=candidates.reduce((best,angle)=>{const score=supportAngles.length?Math.min(...supportAngles.map(other=>separation(angle,other))):Math.min(...directions.map(other=>separation(angle,other)));return score>best.score?{angle,score}:best;},{angle:0,score:-1});supportAngles.push(selected.angle);}
  ringJunctions.push(ringCircularJunction(i,links,supportAngles));
 }
 podCorridor(v(ports[1].x,ports[1].y,ports[1].z),industryEntrance,3.2,0);
 supportTrunk(v(ports[1].x,ports[1].y,ports[1].z),industryEntrance,[.5],'anillo-industria');
 const workshopRing=v(ports[6].x,ports[6].y,ports[6].z);
 const workshopLink=podCorridor(workshopRing,workshopEntrance,3.2,0);
 supportTrunk(workshopRing,workshopEntrance,[.5],'anillo-taller');
 const habitatRing=v(ports[7].x,ports[7].y,ports[7].z),habitatEntrance=v(HABITAT_RING_ACCESS.x,HABITAT_RING_ACCESS.centerY,HABITAT_RING_ACCESS.z);
 const habitatLink=podCorridor(habitatRing,habitatEntrance,3.2,0);
 supportTrunk(habitatRing,habitatEntrance,[1/3,2/3],'anillo-hábitat');
 const northBridgeCrest=v(ports[2].x,23.79,70);
 // Three long, legible spines and paired residential pods echo the references.
 const modulePositions:{x:number;z:number;r:number}[]=[];
 const accessPorts:{moduleId:string;centerX:number;centerZ:number;x:number;z:number;y:number;side:number;normalX:number;normalZ:number;junctionX:number;junctionZ:number;junctionY:number;floorY:number;openingRadius:number;run:number;rise:number;grade:number;steps:number;maxRiser:number;accessType:'escalera'|'rampa'}[]=[];
 // Capture physical envelopes before static batching erases module ownership.
 // Rendering uses (x,height,y); these snapshots never move the static campus.
 const spatialInventory:{id:string;x:number;z:number;foundationRadius:number;min:number[];max:number[];anchor:number[];angle:number}[]=[];
 function capsule(x:number,z:number,angle:number,connectedEnd:-1|1){const y=slab(x,z,6.8),g=new T.Group();g.position.set(x,y,z);g.rotation.y=angle;root.add(g);modulePositions.push({x,z,r:6.8});
  box(0,.38,0,9,.7,11,dark,g);
  // Only the end facing the branch receives an aperture; the remote cap stays closed.
  const {bodyRadius,straightHalfLength,openingRadius,centerRise,floorOffset}=CAPSULE_PORTAL;
  const theta=Math.asin(openingRadius/bodyRadius),profile:T.Vector2[]=[];
  const lowerStart=connectedEnd<0?theta:0,upperEnd=connectedEnd>0?theta:0;
  for(let i=0;i<=8;i++){const t=lowerStart+(Math.PI/2-lowerStart)*i/8;profile.push(new T.Vector2(bodyRadius*Math.sin(t),-straightHalfLength-bodyRadius*Math.cos(t)));}
  profile.push(new T.Vector2(bodyRadius,straightHalfLength));
  for(let i=1;i<=8;i++){const t=Math.PI/2-(Math.PI/2-upperEnd)*i/8;profile.push(new T.Vector2(bodyRadius*Math.sin(t),straightHalfLength+bodyRadius*Math.cos(t)));}
  const body=mesh(new T.LatheGeometry(profile,32),ivory,0,centerRise,0,g);body.rotation.x=Math.PI/2;
  box(0,centerRise-floorOffset,0,1.85,.14,2*capsulePortalAxial-.15,padSurface,g);
  for(const side of [-1,1]){box(side*3.12,3.3,0,.12,1.5,6,windowMat,g);box(side*3.2,2.2,0,.14,.1,7,amber,g);}
  for(const zz of [-3.3,0,3.3]){const band=mesh(new T.TorusGeometry(3.28,.08,6,24),rim,0,3.2,zz,g);band.scale.y=.92;}
  box(0,6.4,0,3.4,.25,4.4,dark,g);for(const zz of [-1.3,1.3]){const vent=mesh(new T.CylinderGeometry(.75,.75,.24,16),rim,0,6.66,zz,g);box(0,6.81,zz,1.2,.05,.12,dark,g);}
  for(const xx of [-3.7,3.7])for(const zz of [-3.8,3.8])box(xx,.8,zz,.45,1.2,.45,rim,g);
  // The connected aperture has a closed hatch; the other tip needs no unused door.
  const frame=mesh(new T.TorusGeometry(openingRadius+.045,.09,8,32),amber,0,centerRise,connectedEnd*capsulePortalAxial,g);frame.castShadow=false;const hatch=mesh(new T.CircleGeometry(openingRadius-.035,32),rim,0,centerRise,connectedEnd*(capsulePortalAxial+.025),g);if(connectedEnd<0)hatch.rotation.y=Math.PI;const handle=mesh(new T.CircleGeometry(.19,16),dark,0,centerRise,connectedEnd*(capsulePortalAxial+.055),g);if(connectedEnd<0)handle.rotation.y=Math.PI;
  g.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(g);
  spatialInventory.push({id:`vivienda-${spatialInventory.length+1}`,x,z,foundationRadius:7.8,min:bounds.min.toArray(),max:bounds.max.toArray(),anchor:g.position.toArray(),angle});
  return y+centerRise;
 }
 const junctions:{id:string;x:number;z:number;floorY:number;halfWidth:number;ports:{kind:string;x:number;y:number;z:number;radius:number}[];supports:{x:number;z:number;groundY:number;topY:number}[]}[]=[];
 function branchJunction(node:T.Vector3,previous:T.Vector3,next:T.Vector3|null,angle:number,pods:{side:number;target:T.Vector3}[],id:string){
  const half=1.8,height=3.8,baseY=node.y-1.4,openingRadius=1.45,g=new T.Group();g.position.set(node.x,baseY,node.z);g.rotation.y=Math.PI/2-angle;root.add(g);
  const wallMat=ivory.clone();wallMat.side=T.DoubleSide;
  const openingWall=(holeY:number)=>{const outline=new T.Shape();outline.moveTo(-half,0);outline.lineTo(half,0);outline.lineTo(half,height);outline.lineTo(-half,height);outline.closePath();const cut=new T.Path();cut.absarc(0,holeY,openingRadius,0,Math.PI*2,true);outline.holes.push(cut);return new T.ShapeGeometry(outline,32);};
  box(0,.5,0,half*2,.16,half*2,padSurface,g);box(0,height+.04,0,half*2+.12,.12,half*2+.12,windowMat,g);
  const incomingRun=Math.hypot(previous.x-node.x,previous.z-node.z),backY=1.4+(previous.y-node.y)*half/incomingRun;
  mesh(openingWall(backY),wallMat,0,0,-half,g);
  const backFrame=mesh(new T.TorusGeometry(openingRadius+.04,.07,8,32),rim,0,backY,-half-.02,g);backFrame.castShadow=false;
  const ports=[{kind:'tronco-entrante',x:node.x-Math.cos(angle)*half,y:baseY+backY,z:node.z-Math.sin(angle)*half,radius:openingRadius}];
  if(next){const outgoingRun=Math.hypot(next.x-node.x,next.z-node.z),frontY=1.4+(next.y-node.y)*half/outgoingRun;
   mesh(openingWall(frontY),wallMat,0,0,half,g);
   const frontFrame=mesh(new T.TorusGeometry(openingRadius+.04,.07,8,32),rim,0,frontY,half+.02,g);frontFrame.castShadow=false;
   ports.push({kind:'tronco-saliente',x:node.x+Math.cos(angle)*half,y:baseY+frontY,z:node.z+Math.sin(angle)*half,radius:openingRadius});
  }else box(0,height/2,half,half*2,height,.12,wallMat,g);
  for(const pod of pods){const run=Math.hypot(pod.target.x-node.x,pod.target.z-node.z),holeY=1.4+(pod.target.y-node.y)*half/run,localSide=-pod.side;
   const wall=mesh(openingWall(holeY),wallMat,localSide*half,0,0,g);wall.rotation.y=localSide*Math.PI/2;
   const frame=mesh(new T.TorusGeometry(openingRadius+.04,.07,8,32),rim,localSide*(half+.02),holeY,0,g);frame.rotation.y=Math.PI/2;frame.castShadow=false;
   ports.push({kind:`cápsula-${pod.side}`,x:node.x+(pod.target.x-node.x)*half/run,y:baseY+holeY,z:node.z+(pod.target.z-node.z)*half/run,radius:openingRadius});
  }
  g.updateMatrixWorld(true);const supports:{x:number;z:number;groundY:number;topY:number}[]=[];
  for(const lx of [-1.55,1.55])for(const lz of [-1.55,1.55]){const foot=g.localToWorld(v(lx,0,lz)),groundY=landscape(foot.x,foot.z),topY=baseY+.42;rod(v(foot.x,groundY+.15,foot.z),v(foot.x,topY,foot.z),.16,dark);mesh(new T.CylinderGeometry(.29,.34,.16,12),rim,foot.x,groundY+.08,foot.z);supports.push({x:foot.x,z:foot.z,groundY,topY});}
  junctions.push({id,x:node.x,z:node.z,floorY:baseY+.5,halfWidth:half,ports,supports});
 }
 for(const [portIndex,angle] of [[2,Math.PI/2],[4,Math.PI],[0,0]] as [number,number][]){const port=ports[portIndex],dx=Math.cos(angle),dz=Math.sin(angle);let previous=v(port.x,port.y,port.z);
  for(let i=0;i<(portIndex===0?2:3);i++){
   const distance=portIndex===2?[12,47,63][i]:portIndex===4&&i===1?30:12+i*19;
   const x=port.x+dx*distance,z=port.z+dz*distance,y=landscape(x,z)+2.9+(portIndex===2&&i===1?1.4:0),node=v(x,y,z),isEastJunction=portIndex===0,isNorthJunction=portIndex===2;
   const crest=isNorthJunction&&i===1?northBridgeCrest:null;
   if(crest){northBridgeData=northBridge(previous,crest,node);supportTrunk(previous,crest,[.65],'ala-norte-puente-subida');supportTrunk(crest,node,[.65],'ala-norte-puente-bajada');}
   else if(isNorthJunction){podCorridor(previous,node,i===0?3.2:1.8,1.8);supportTrunk(previous,node,[.5],i===0?'anillo-ala-norte':'ala-norte-terminal');}
   else if(isEastJunction){podCorridor(previous,node,i===0?3.2:1.8,1.8);supportTrunk(previous,node,i===0?[.5]:[1/3,2/3],i===0?'anillo-distribucion':'distribucion-terminal');}
   else if(portIndex===4){podCorridor(previous,node,i===0?3.2:1.8,1.8);supportTrunk(previous,node,i===0?[.5]:[1/3,2/3],i===0?'anillo-ala-oeste':'ala-oeste-tronco');}
   else corridor(previous,node);
   const podTargets:{side:number;target:T.Vector3}[]=[];
   for(const side of [-1,1]){
    const mx=x-dz*12*side,mz=z+dx*12*side,my=capsule(mx,mz,-angle,(side*-1) as -1|1),portX=mx+dz*capsulePortalAxial*side,portZ=mz-dx*capsulePortalAxial*side,target=v(portX,my,portZ),link=podCorridor(node,target,isEastJunction||isNorthJunction||portIndex===4?1.8:0);
    podTargets.push({side,target});
    accessPorts.push({moduleId:`vivienda-${accessPorts.length+1}`,centerX:mx,centerZ:mz,x:portX,z:portZ,y:my,side,normalX:dz*side,normalZ:-dx*side,junctionX:x,junctionZ:z,junctionY:y,floorY:my-CAPSULE_PORTAL.floorOffset,openingRadius:CAPSULE_PORTAL.openingRadius,...link});
   }
   if(isEastJunction||isNorthJunction||portIndex===4){const nextDistance=isNorthJunction?i===0?47:63:portIndex===4?i===0?30:50:distance+19,nextX=port.x+dx*nextDistance,nextZ=port.z+dz*nextDistance;
    const next=isNorthJunction?i===0?northBridgeCrest:i===1?v(nextX,landscape(nextX,nextZ)+2.9,nextZ):null:i<(portIndex===4?2:1)?v(nextX,landscape(nextX,nextZ)+2.9,nextZ):null;
    branchJunction(node,crest??previous,next,angle,podTargets,isNorthJunction?`ala-norte-${i===2?'terminal':`distribucion-${i+1}`}`:portIndex===4?`ala-oeste-${i===2?'terminal':`distribucion-${i+1}`}`:next?'ala-este-distribucion':'ala-este-terminal');}
   else mesh(new T.SphereGeometry(2.4,16,10,0,Math.PI*2,0,Math.PI/2),ivory,x,y-1.6,z);
   previous=node;
  }
 }
 // Industrial block: a layered roof, ventilation banks and attached service wings.
 // The industrial front is cut to the same round section as its arriving tube.
 // Its parked leaf documents how the service bay closes without blocking the
 // inspected pedestrian route; it does not claim a certified pressure seal.
 box(ix,iy+.12,iz,23,.24,18,padSurface);
 for(const side of [-1,1]){
  box(ix+side*11.35,iy+3,iz,.3,6,18,ivory);
 }
 const industryFrontMat=ivory.clone();industryFrontMat.side=T.DoubleSide;
 mesh(industryFrontWallGeometry(),industryFrontMat,ix,iy,iz-9);
 box(ix,iy+3,iz+8.85,23,6,.3,ivory);
 const industryPortal=mesh(new T.TorusGeometry(INDUSTRY_ACCESS.openingRadius+.055,.09,8,40),rim,ix,iy+INDUSTRY_ACCESS.centerRise,iz-9.025);
 industryPortal.castShadow=false;
 const industryLeaf=mesh(new T.CylinderGeometry(INDUSTRY_ACCESS.openingRadius-.09,INDUSTRY_ACCESS.openingRadius-.09,.1,40),dark,ix+INDUSTRY_ACCESS.parkedLeafOffset,iy+INDUSTRY_ACCESS.centerRise,iz-9-.13);
 industryLeaf.rotation.x=Math.PI/2;
 const industryGrip=mesh(new T.TorusGeometry(.18,.04,8,24),rim,ix+INDUSTRY_ACCESS.parkedLeafOffset,iy+INDUSTRY_ACCESS.centerRise,iz-9-.2);
 industryGrip.castShadow=false;
 const industryRampStart=v(ix,iy+.85,iz-9),industryRampEnd=v(ix,iy+.17,iz-3),industryRampDirection=industryRampEnd.clone().sub(industryRampStart);
 const industryRamp=mesh(new T.BoxGeometry(CAPSULE_PORTAL.walkwayWidth,.14,industryRampDirection.length()+.08),padSurface,ix,iy+.51,iz-6);
 industryRamp.quaternion.setFromUnitVectors(v(0,0,1),industryRampDirection.normalize());
 box(ix+2.25,iy+1.8,iz-8.7,.14,3.25,2.8,windowMat);
 box(ix-6,iy+1.1,iz+2,4.3,1.7,3.2,dark);
 box(ix+6,iy+1.1,iz+2,4.3,1.7,3.2,dark);
 box(ix,iy+6.2,iz,24,.5,19,dark);box(ix+4,iy+8,iz-2,10,3.2,8,ivory);box(ix+4,iy+9.65,iz-2,10.4,.18,8.4,rim);
 for(const xx of [-8,-2,4,10])for(const zz of [-5,3]){const fan=mesh(new T.CylinderGeometry(1.55,1.55,.3,20),dark,ix+xx,iy+6.65,iz+zz);for(let b=0;b<4;b++){const blade=box(ix+xx,iy+6.86,iz+zz,2.4,.08,.24,rim);blade.rotation.y=b*Math.PI/4;}}
 for(let i=0;i<8;i++){box(ix-10+i*2.8,iy+3.4,iz+9.03,1.6,1.3,.06,windowMat);box(ix-10+i*2.8,iy+1,iz+9.1,1.6,.12,.1,amber);}
 // The portal reaches a local interior ramp; the workshop for the rover is a separate building.
 // Los dos campos solares se instalan desde marsScene: 20 en R y 24 auxiliares.
 // Evitamos duplicar filas decorativas que quedarían fuera del dominio matemático.
 const panelPositions:{x:number;z:number}[]=[];
 // Remove the former broad decorative roads: they crossed pad footprints and
 // had no portal endpoints. Purposeful foot routes are built from explicit nodes.
 // Batch static opaque architecture by material: hundreds of fittings, few draw calls.
 root.updateMatrixWorld(true);const buckets=new Map<T.Material,{geometries:T.BufferGeometry[];objects:T.Mesh[]}>();
 root.traverse(o=>{if(!(o instanceof T.Mesh)||o instanceof T.InstancedMesh||Array.isArray(o.material)||o.material.transparent)return;const g=o.geometry.clone().applyMatrix4(o.matrixWorld);for(const key of Object.keys(g.attributes))if(key!=='position'&&key!=='normal')g.deleteAttribute(key);const flat=g.index?g.toNonIndexed():g;if(flat!==g)g.dispose();const batch=buckets.get(o.material)||{geometries:[],objects:[]};batch.geometries.push(flat);batch.objects.push(o);buckets.set(o.material,batch);});
 for(const [material,batch] of buckets){const merged=mergeGeometries(batch.geometries);batch.geometries.forEach(g=>g.dispose());if(merged){batch.objects.forEach(o=>{o.removeFromParent();o.geometry.dispose();});mesh(merged,material,0,0,0);}}
 return {root,obstacles:modulePositions,spatialInventory,accessPorts,junctions,trunkSupports,northBridge:northBridgeData,ringJunctions,ringEastJunction:ringEastJunctionData,ringNorthEastJunction:ringNorthEastJunctionData,ringNorthJunction:ringNorthJunctionData,industryAccess:{door:industryEntrance.toArray(),rampStart:industryRampStart.toArray(),rampEnd:industryRampEnd.toArray(),floorY:iy+.24},workshopAccess:{door:workshopEntrance.toArray(),ring:workshopRing.toArray(),link:workshopLink,rampStart:[workshopEntrance.x,workshopEntrance.y-CAPSULE_PORTAL.floorOffset,workshopEntrance.z],rampEnd:[workshopEntrance.x,WORKSHOP_NORTH_ACCESS.foundationY+.225,workshopEntrance.z-WORKSHOP_NORTH_ACCESS.interiorRampLength]},habitatAccess:{door:habitatEntrance.toArray(),ring:habitatRing.toArray(),link:habitatLink},ringEastPort:{...ports[0]},coreEastPortal,coreNorthEastPortal,hub:{x:cx,z:cz,y:cy},panelCount:panelPositions.length};
}

