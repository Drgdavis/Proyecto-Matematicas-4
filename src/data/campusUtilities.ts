import { BPLUS_SITE, landscape, SOLAR_ARRAY_LAYOUT, SOLAR_SUPPORT_LAYOUT, WATER_PLANT } from './marsMath.ts';
import { HABITAT } from './marsHabitat.ts';

export type ServicePoint={x:number;z:number};

// Electrical topology for the academic model. The adjacent cabinet represents
// battery/inverter and isolation conceptually, without internal electrical specs.
const habitatPortAngle=-.65;
const habitatWallRadius=10.3;
const habitatPort={
 x:HABITAT.x+habitatWallRadius*Math.cos(habitatPortAngle),
 z:HABITAT.z+habitatWallRadius*Math.sin(habitatPortAngle),
 angle:habitatPortAngle,
 centerY:HABITAT.floor+1.12,
 radius:.2,
};
const combiner={x:70,z:-32};
const energyStation={x:68,z:-35};
const treatmentTerminal={x:WATER_PLANT.x+2.6,z:WATER_PLANT.z-1};

export const SOLAR_POWER_SERVICE={
 depth:1.05,
 cableRadius:.045,
 panelCableRadius:.028,
 combiner,
 energyStation,
 panels:[...SOLAR_ARRAY_LAYOUT,...SOLAR_SUPPORT_LAYOUT].map((panel,index)=>({id:`solar-${index+1}`,x:panel.x,z:panel.z})),
 // Three original buses (6/7/7) and three auxiliary buses (8/8/8) are separate.
 rowRoutes:[SOLAR_ARRAY_LAYOUT.slice(0,6),SOLAR_ARRAY_LAYOUT.slice(6,13),SOLAR_ARRAY_LAYOUT.slice(13,20),
  SOLAR_SUPPORT_LAYOUT.slice(0,8),SOLAR_SUPPORT_LAYOUT.slice(8,16),SOLAR_SUPPORT_LAYOUT.slice(16,24)]
  .map(row=>[...row].reverse().map(panel=>({x:panel.x,z:panel.z})).concat(combiner)),
 storageRoute:[combiner,energyStation],
 habitat:{id:'habitat',port:habitatPort,route:[combiner,{x:62,z:-39},habitatPort]},
 treatment:{id:'tratamiento',terminal:treatmentTerminal,route:[combiner,{x:69,z:-45},{x:65,z:-62},{x:59,z:-74},{x:39,z:-74},{x:30,z:-68},treatmentTerminal]},
 bplus:BPLUS_SITE,
} as const;

/** Terrain-following burial, sampled linearly so each route has exact endpoints. */
export function buriedServicePoints(route:readonly ServicePoint[],depth:number,spacing=.8):[number,number,number][]{
 const points:[number,number,number][]=[];
 for(let segment=0;segment<route.length-1;segment++){
  const a=route[segment],b=route[segment+1],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/spacing));
  for(let index=segment?1:0;index<=steps;index++){
   const t=index/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
   points.push([x,landscape(x,z)-depth,z]);
  }
 }
 return points;
}
