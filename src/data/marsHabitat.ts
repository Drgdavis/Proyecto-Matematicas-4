import { landscape, BPLUS_SITE, routeAt, START, WATER_PLANT } from './marsMath.ts';
function platform(x:number,z:number,r:number,margin=.45){let top=-Infinity;for(let i=0;i<48;i++){const a=i/48*Math.PI*2;top=Math.max(top,landscape(x+r*Math.cos(a),z+r*Math.sin(a)));}return top+margin+.225;}
// Preserve B+ on the route while placing the habitat west of the solar field.
// The radial 56 m site leaves room for the inhabited shell and its southern airlock.
const habitatRadius=56,habitatAngle=-.65;
const habitatX=habitatRadius*Math.cos(habitatAngle),habitatZ=habitatRadius*Math.sin(habitatAngle);
// An 11 m separation beyond the old airlock position gives the connector a
// measurable run. The dome's lower plinth still clears the surveyed terrain;
// the airlock's higher plinth makes the exterior ramp and interior link gentle.
const airlockX=habitatX,airlockZ=habitatZ-26;
export const HABITAT={x:habitatX,z:habitatZ,floor:platform(habitatX,habitatZ,11.3,.05)+.18,airlockX,airlockZ,airlockFloor:platform(airlockX,airlockZ,4.2,.70)+.18};
const ringSouthEastX=-8+29/Math.SQRT2,ringSouthEastZ=8-29/Math.SQRT2;
const ringDirection=Math.atan2(ringSouthEastZ-HABITAT.z,ringSouthEastX-HABITAT.x);
const ringEdge=Math.max(...Array.from({length:24},(_,i)=>{const a=i/24*Math.PI*2;return landscape(ringSouthEastX+3.5*Math.cos(a),ringSouthEastZ+3.5*Math.sin(a));}));
export const HABITAT_RING_ACCESS={x:HABITAT.x+10.3*Math.cos(ringDirection),z:HABITAT.z+10.3*Math.sin(ringDirection),angle:ringDirection,centerY:HABITAT.floor+.9,openingRadius:1.4,ringX:ringSouthEastX,ringZ:ringSouthEastZ,ringFloor:ringEdge+1.33} as const;
// The two laboratory passages have separate east-wall ports. Their thresholds
// are derived from the same terrain-following pads used by the scene.
export const LAB_ACCESS=[[95,-28],[96,-45]].map(([x,z],index)=>{
 const angle=Math.atan2(z-HABITAT.z,x-HABITAT.x),padY=platform(x,z,8.4);
 // Enter 2 cm through the rebuilt west bulkhead at local x=-6.70; the old
 // x=-7 endpoint stopped the transparent passage 30 cm outside its opening.
 return {index,x,z,padY,angle,habitatX:HABITAT.x+10.3*Math.cos(angle),habitatZ:HABITAT.z+10.3*Math.sin(angle),habitatCenterY:HABITAT.floor+.93,labX:x-6.68,labCenterY:padY+3.3,openingRadius:1.28};
});
// The surface approach skirts the inhabited shell and reaches the south toe
// of the airlock ramp before climbing to the platform edge.
export const HABITAT_ACCESS_PATH=[
 {x:BPLUS_SITE.x,z:BPLUS_SITE.y},
 {x:HABITAT.x+16,z:HABITAT.z-2},
 {x:HABITAT.airlockX+12.5,z:HABITAT.airlockZ-1},
 {x:HABITAT.airlockX+8,z:HABITAT.airlockZ-8},
 {x:HABITAT.airlockX+8,z:HABITAT.airlockZ-17.4},
 {x:HABITAT.airlockX,z:HABITAT.airlockZ-17.4},
 {x:HABITAT.airlockX,z:HABITAT.airlockZ-4.2},
] as const;
export const GREENHOUSE={x:-8,z:-62,foundationRadius:11.5} as const;
// Buried service from the treatment plinth to the greenhouse's east foundation.
// The exterior cleanout identifies the line without occupying a walking aisle.
export const GREENHOUSE_WATER_SERVICE={
 source:{x:WATER_PLANT.x,z:WATER_PLANT.z},
 bends:[{x:18,z:-60},{x:9,z:-62}],
 cleanout:{x:6.5,z:GREENHOUSE.z},
 inlet:{x:GREENHOUSE.x+8.55,z:GREENHOUSE.z},
 depth:1.2,radius:.12,
} as const;
export const GREENHOUSE_BEDS={columns:8,firstXOffset:-6.7,columnSpacing:2.05,rowOffsets:[-3.6,-1.8,1.8,3.6],length:1.6,width:1.35,entryAisleWidth:1.5,centralAisleWidth:1.45} as const;
// Four slim collectors run beside the rows. The east crossfeed stays beneath
// the floor; each short takeoff terminates over one experimental tray.
export const GREENHOUSE_WATER_DISTRIBUTION={
 crossfeedX:GREENHOUSE_WATER_SERVICE.inlet.x,
 headerStartX:GREENHOUSE.x+GREENHOUSE_BEDS.firstXOffset-GREENHOUSE_BEDS.length/2-.1,
 headerOffsets:[-4.52,-1.03,1.03,4.52],
 headerRadius:.04,dropRadius:.025,
} as const;
export const GREENHOUSE_WATER_PORTS=GREENHOUSE_BEDS.rowOffsets.flatMap((rowOffset,row)=>
 Array.from({length:GREENHOUSE_BEDS.columns},(_,column)=>({
  column,row,
  x:GREENHOUSE.x+GREENHOUSE_BEDS.firstXOffset+column*GREENHOUSE_BEDS.columnSpacing,
  headerZ:GREENHOUSE.z+GREENHOUSE_WATER_DISTRIBUTION.headerOffsets[row],
  emitterZ:GREENHOUSE.z+rowOffset+Math.sign(GREENHOUSE_WATER_DISTRIBUTION.headerOffsets[row]-rowOffset)*.48,
 })));
export const GREENHOUSE_ACCESS_PORTAL={x:GREENHOUSE.x-12.5,z:GREENHOUSE.z+3.2,rampStartX:-48,rampStartZ:GREENHOUSE.z+3.2,innerX:GREENHOUSE.x-9,vestibuleLength:3.5,vestibuleWidth:3.6,doorY:1.35,doorRadius:.95} as const;
// The workshop tube joins the north wall of the existing airlock. The outdoor
// west door and the greenhouse east door remain on their original axis.
export const GREENHOUSE_PRESSURE_PORTAL={x:(GREENHOUSE_ACCESS_PORTAL.x+GREENHOUSE_ACCESS_PORTAL.innerX)/2,z:GREENHOUSE_ACCESS_PORTAL.z+GREENHOUSE_ACCESS_PORTAL.vestibuleWidth/2,rise:1.3,radius:1.34,offset:.06} as const;
// The workshop asset's south access is at local z=+5.9 after a half turn.
export const GREENHOUSE_CORRIDOR={startX:-20,startZ:-40.9,startRise:1.3,portalRise:GREENHOUSE_PRESSURE_PORTAL.rise,portalOffset:GREENHOUSE_PRESSURE_PORTAL.offset,radius:1.08,floorOffset:.9,portalRadius:GREENHOUSE_PRESSURE_PORTAL.radius,supportOffset:1.38,archHeight:1.4,supports:[.12,.7,.9]} as const;
// A separate open vehicle deck joins the workshop bay to the logistics apron.
// It carries cargo, not the pressurized crew tunnel or the mathematical r(t).
export const WORKSHOP_CARGO_LINK={startX:-27,startZ:-35,endX:-71,endZ:-44,width:4.5,jointWidth:5.1,jointLength:3.2,supports:[.09,.18,.27,.36,.45,.54,.63,.72,.81,.9]} as const;
// Conceptual load case for the open cargo deck. Strength and soil values are
// explicit assumptions to check the model, not measured Martian properties.
export const ROVER_TRANSFER_DESIGN={massKg:620,marsGravity:3.71,loadFactor:2,inspectionSpeed:.5,assumedFriction:.35,allowableSoilPressurePa:25_000,assumedElasticModulusPa:200e9,assumedYieldPa:235e6,beamWidth:.26,beamDepth:.36,beamWall:.012,footingRadius:.36,maxSupportSpan:4.5} as const;
// The logistics spur branches tangentially before the northwest end of the
// measured half-arc. It does not change r(t) or its 226 m arc-length result.
// The raised apron leaves the terrain trace before its old dead-end and
// curves tangentially onto the northwestern side of the logistics pad.
export const ROVER_TRANSFER_BRANCH_T=2.65;
const roverRouteBranch=routeAt(START+ROVER_TRANSFER_BRANCH_T);
const roverRouteAhead=routeAt(START+ROVER_TRANSFER_BRANCH_T+.0001);
const roverBranchLength=Math.hypot(roverRouteAhead[0]-roverRouteBranch[0],roverRouteAhead[2]-roverRouteBranch[2]);
const roverBranchStep={x:roverRouteBranch[0]+7.2*(roverRouteAhead[0]-roverRouteBranch[0])/roverBranchLength,z:roverRouteBranch[2]+7.2*(roverRouteAhead[2]-roverRouteBranch[2])/roverBranchLength};
export const ROVER_LOGISTICS_TRANSFER={
 waypoints:[
  {x:roverRouteBranch[0],z:roverRouteBranch[2]},
  roverBranchStep,{x:-65,z:43},{x:-80,z:42},{x:-92,z:38},{x:-98,z:29},
  {x:-101,z:12},{x:-102,z:-12},{x:-100,z:-30},{x:-97,z:-42},
 ],
 rampStartT:.9,
 rampControlIn:10,rampControlOut:6,
 rampEnd:{x:-86,z:-45},
 rampSupports:[.16,.32,.48,.64,.8,.96],
 rampCrestHeight:.18,rampCrestStart:.05,rampCrestTop:.88,
 stabilizedStartT:.42,roadEntryBlendT:.45,roadEntryLip:.03,shoulderWidth:1.5,bankLimitDeg:10,
 width:5,
} as const;
export function greenhouseCorridorPlan(t:number){return {x:GREENHOUSE_CORRIDOR.startX+(GREENHOUSE_PRESSURE_PORTAL.x-GREENHOUSE_CORRIDOR.startX)*t,z:GREENHOUSE_CORRIDOR.startZ+(GREENHOUSE_PRESSURE_PORTAL.z-GREENHOUSE_CORRIDOR.portalOffset-GREENHOUSE_CORRIDOR.startZ)*t};}
// A sparse service spine skirts the north edge of the greenhouse foundation.
export const GREENHOUSE_ACCESS_ROUTE=[
 {x:10,z:-58},{x:18,z:-48},{x:0,z:-48},{x:-20,z:-48},{x:-35,z:-53},{x:GREENHOUSE_ACCESS_PORTAL.rampStartX,z:GREENHOUSE_ACCESS_PORTAL.rampStartZ},
] as const;
export function segmentDistance(x:number,z:number,ax:number,az:number,bx:number,bz:number){const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));return {distance:Math.hypot(x-ax-t*dx,z-az-t*dz),t};}
const airlockDoor={x:HABITAT.airlockX,z:HABITAT.airlockZ+4.2},habitatDoor={x:HABITAT.x,z:HABITAT.z-10.2};
export function labWalkway(x:number,z:number){return LAB_ACCESS.some(lab=>segmentDistance(x,z,lab.habitatX,lab.habitatZ,lab.labX,lab.z).distance<.75||x>=lab.labX-.05&&x<=lab.x+6.4&&Math.abs(z-lab.z)<.75);}
export function habitatPortal(x:number,z:number){const radialX=Math.cos(HABITAT_RING_ACCESS.angle),radialZ=Math.sin(HABITAT_RING_ACCESS.angle);return segmentDistance(x,z,HABITAT.airlockX,HABITAT.airlockZ-10.8,HABITAT.airlockX,HABITAT.airlockZ-4.2).distance<1.25||segmentDistance(x,z,airlockDoor.x,airlockDoor.z,habitatDoor.x,habitatDoor.z).distance<1.25||segmentDistance(x,z,HABITAT.x+8.8*radialX,HABITAT.z+8.8*radialZ,HABITAT.x+12*radialX,HABITAT.z+12*radialZ).distance<1.25||LAB_ACCESS.some(lab=>segmentDistance(x,z,HABITAT.x+8.8*Math.cos(lab.angle),HABITAT.z+8.8*Math.sin(lab.angle),HABITAT.x+12*Math.cos(lab.angle),HABITAT.z+12*Math.sin(lab.angle)).distance<1.15);}
export function walkFloor(x:number,z:number,preferredFloor?:number){
 const {floor,airlockFloor}=HABITAT;
 const airlockRampStart=airlockZ-4.2,airlockRampEnd=airlockZ-17.4;
 const corridor=segmentDistance(x,z,airlockDoor.x,airlockDoor.z,habitatDoor.x,habitatDoor.z);
 if(corridor.distance<1.5)return airlockFloor+(floor-airlockFloor)*corridor.t;
 const ringCorridor=segmentDistance(x,z,HABITAT_RING_ACCESS.ringX,HABITAT_RING_ACCESS.ringZ,HABITAT_RING_ACCESS.x,HABITAT_RING_ACCESS.z);
 if(ringCorridor.distance<1.15)return HABITAT_RING_ACCESS.ringFloor+(floor-HABITAT_RING_ACCESS.ringFloor)*ringCorridor.t;
 for(const lab of LAB_ACCESS){
  if(x>=lab.labX-.05&&x<=lab.x+6.4&&Math.abs(z-lab.z)<.75){const local=x-lab.x,threshold=lab.padY+2.37,landing=lab.padY+.23,steps=15,stairStart=-6.65,stairEnd=-.15;if(local>=stairEnd)return landing;const index=Math.max(0,Math.min(steps-1,Math.floor((local-stairStart)/(stairEnd-stairStart)*steps)));return threshold+(landing-threshold)*(index+1)/steps;}
  const corridor=segmentDistance(x,z,lab.habitatX,lab.habitatZ,lab.labX,lab.z);
  if(corridor.distance<.75){const start=floor,end=lab.padY+2.37,continuous=start+(end-start)*corridor.t,ground=landscape(x,z);
   // The B⁺ surface route passes beneath laboratory A: x/z alone cannot
   // select between stacked floors. An EVA walker keeps the nearest level.
   if(preferredFloor===undefined||Math.abs(preferredFloor-ground)<Math.abs(preferredFloor-continuous))continue;
   const grade=Math.abs(end-start)/Math.hypot(lab.labX-lab.habitatX,lab.z-lab.habitatZ);if(grade>.15){const steps=Math.ceil(Math.abs(end-start)/.15),index=Math.max(0,Math.min(steps-1,Math.floor(corridor.t*steps)));return start+(end-start)*(index+1)/steps;}return continuous;}
 }
 // Evaluate the ramp before the circular landing: the 4.3 m landing radius
 // extends 0.1 m past its 4.2 m door threshold in plan.
 if(Math.abs(x-HABITAT.airlockX)<1.6&&z<airlockRampStart&&z>=airlockRampEnd-1e-6){const t=Math.max(0,Math.min(1,(airlockRampStart-z)/(airlockRampStart-airlockRampEnd)));return airlockFloor*(1-t)+landscape(x,airlockRampEnd)*t;}
 if(Math.hypot(x-HABITAT.airlockX,z-HABITAT.airlockZ)<4.3)return airlockFloor;
 if(Math.hypot(x-HABITAT.x,z-HABITAT.z)<10.2)return floor;
 return landscape(x,z);
}
export function canWalkHabitat(x:number,z:number,fromX:number,fromZ:number){
 const radius=Math.hypot(x-HABITAT.x,z-HABITAT.z),wasInside=Math.hypot(fromX-HABITAT.x,fromZ-HABITAT.z)<9.65;
 if(radius<11.9&&!habitatPortal(x,z)&&!(wasInside&&radius<9.65))return false;
 if(Math.abs(x-HABITAT.airlockX)<2.25&&z<=HABITAT.airlockZ-4.2&&z>=HABITAT.airlockZ-10.8&&Math.abs(x-HABITAT.airlockX)>1.22&&!habitatPortal(x,z))return false;
 if(radius<9.65){
  const furniture=[[0,0,1.9],[-5,3,1.6],[5,3,1.6],[0,-5.8,1.6],[-6.7,-1.7,1.3],[-2.9,-7,1.2],[4.2,-6.1,1.6]];
  if(furniture.some(([dx,dz,r])=>Math.hypot(x-HABITAT.x-dx,z-HABITAT.z-dz)<r))return false;
 }
 return true;
}
