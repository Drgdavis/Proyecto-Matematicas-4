import * as T from 'three';

export type HabitatWallOpening={angle:number;centerY:number;radius:number};

// A tapered cylindrical sill with actual apertures at the two crew passages.
// Angles use the world x/z plane, so frames and corridor axes share a datum.
export function habitatWallGeometry(openings:HabitatWallOpening[]){
 const wallHeight=2.7,bottomRadius=10.5,topRadius=10.1,referenceRadius=10.3;
 const normalized=(angle:number)=>(angle+2*Math.PI)%(2*Math.PI);
 const delta=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
 const angles=Array.from({length:257},(_,i)=>i*2*Math.PI/256);
 for(const opening of openings){const span=Math.asin(opening.radius/referenceRadius);for(let i=0;i<=32;i++)angles.push(normalized(opening.angle-span+2*span*i/32));}
 angles.sort((a,b)=>a-b);const distinct=angles.filter((a,i)=>i===0||a-angles[i-1]>1e-7),vertices:number[]=[];
 const point=(angle:number,y:number)=>{const r=bottomRadius+(topRadius-bottomRadius)*y/wallHeight;return [r*Math.cos(angle),y,r*Math.sin(angle)];};
 const band=(a:number,b:number,lowA:number,highA:number,lowB:number,highB:number)=>{if(highA<=lowA&&highB<=lowB)return;const p=[point(a,lowA),point(b,lowB),point(b,highB),point(a,highA)];for(const i of [0,1,2,0,2,3])vertices.push(...p[i]);};
 for(let i=0;i<distinct.length-1;i++){
  const a=distinct[i],b=distinct[i+1],opening=openings.find(item=>Math.abs(delta((a+b)/2,item.angle))<Math.asin(item.radius/referenceRadius));
  if(!opening){band(a,b,0,wallHeight,0,wallHeight);continue;}
  const edge=(angle:number)=>Math.sqrt(Math.max(0,opening.radius**2-(referenceRadius*Math.sin(delta(angle,opening.angle)))**2));
  const lowA=Math.max(0,opening.centerY-edge(a)),lowB=Math.max(0,opening.centerY-edge(b));
  const highA=Math.min(wallHeight,opening.centerY+edge(a)),highB=Math.min(wallHeight,opening.centerY+edge(b));
  band(a,b,0,lowA,0,lowB);band(a,b,highA,wallHeight,highB,wallHeight);
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();return geometry;
}
