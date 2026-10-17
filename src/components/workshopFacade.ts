import * as T from 'three';

// The south frontage keeps the greenhouse crew hatch. The rover uses the west
// wall, facing the loading deck, so it can enter without a right-angle turn.
export function workshopFacadeGeometry(crewRise:number){
 const face=new T.Shape();face.moveTo(-7,0);face.lineTo(7,0);face.lineTo(7,5.6);face.lineTo(-7,5.6);face.closePath();
 const crew=new T.Path();crew.absarc(0,crewRise,1.11,0,Math.PI*2,true);face.holes.push(crew);
 return new T.ShapeGeometry(face,48);
}

export function workshopNorthWallGeometry(openingX:number,openingRise:number,radius:number){
 const face=new T.Shape();face.moveTo(-7,0);face.lineTo(7,0);face.lineTo(7,5.6);face.lineTo(-7,5.6);face.closePath();
 const opening=new T.Path();opening.absarc(openingX,openingRise,radius,0,Math.PI*2,true);face.holes.push(opening);
 return new T.ShapeGeometry(face,48);
}

export const WORKSHOP_WEST_BAY={width:4.7,height:5} as const;
// Closed twin leaves isolate the workshop from the open logistics deck. Their
// lower edge meets the workshop floor; opening them is a cargo operation, not
// a permanently open pressure connection.
export const WORKSHOP_WEST_GATE={planeX:-27.14,centerZ:-35,leafWidth:2.35,height:4.775,bottom:.225,thickness:.14,travel:2.5} as const;
export function workshopGateOffset(side:-1|1,opening:number){return side*WORKSHOP_WEST_GATE.travel*Math.max(0,Math.min(1,opening));}
export function workshopWestCargoWallGeometry(){
 const face=new T.Shape();face.moveTo(-6,0);face.lineTo(6,0);face.lineTo(6,5.6);face.lineTo(-6,5.6);face.closePath();
 const half=WORKSHOP_WEST_BAY.width/2,opening=new T.Path();opening.moveTo(-half,0);opening.lineTo(-half,WORKSHOP_WEST_BAY.height);opening.lineTo(half,WORKSHOP_WEST_BAY.height);opening.lineTo(half,0);opening.closePath();face.holes.push(opening);
 return new T.ShapeGeometry(face);
}

// The original spare-part crates occupy the vehicle's entry aisle. Keep the
// crates in the workshop, on the east side of the floor, with their lids.
export function prepareWorkshopForAccess(scene:T.Object3D){
 for(const name of ['Cerramiento_posterior','Muro_lateral001','Pórtico_vertical007']){
  const part=scene.children.find(child=>child.name===name);
  if(!part)throw new Error(`Falta ${name} del taller.`);
  part.removeFromParent();
 }
 const storage=[
  {names:['Contenedor_de_repuestos','Cierre_de_contenedor','Cierre_de_contenedor001'],dx:9.4,dz:-3.4},
  {names:['Contenedor_de_repuestos001','Cierre_de_contenedor002','Cierre_de_contenedor003'],dx:10.7,dz:-2},
  {names:['Contenedor_de_repuestos002','Cierre_de_contenedor004','Cierre_de_contenedor005'],dx:9.4,dz:-2},
 ];
 for(const group of storage)for(const name of group.names){
  const part=scene.children.find(child=>child.name===name);
  if(!part)throw new Error(`Falta ${name} del taller.`);
  // The workshop instance rotates by π; local offsets invert the world shift.
  part.position.x-=group.dx;part.position.y+=.24;part.position.z-=group.dz;
 }
}
