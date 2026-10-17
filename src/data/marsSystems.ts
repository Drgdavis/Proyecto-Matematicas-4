import { START, grad, height, routeAt, velocityAt, accelerationAt } from './marsMath.ts';

export const SOLAR_ASSUMPTIONS = {
  latitudeDeg: 18,
  declinationDeg: 0,
  peakIrradiance: 590,
  panelArea: 6,
  panelCount: 20,
  efficiency: .24,
  performanceRatio: .86,
} as const;

export function solarState(fraction:number){
  const latitude=SOLAR_ASSUMPTIONS.latitudeDeg*Math.PI/180;
  const declination=SOLAR_ASSUMPTIONS.declinationDeg*Math.PI/180;
  const hourAngle=(fraction-.5)*Math.PI*2;
  const east=-Math.cos(declination)*Math.sin(hourAngle);
  const north=Math.cos(latitude)*Math.sin(declination)-Math.sin(latitude)*Math.cos(declination)*Math.cos(hourAngle);
  const up=Math.sin(latitude)*Math.sin(declination)+Math.cos(latitude)*Math.cos(declination)*Math.cos(hourAngle);
  const length=Math.hypot(east,north,up)||1;
  const direction:[number,number,number]=[east/length,Math.max(-1,Math.min(1,up/length)),north/length];
  const localHour=24*fraction;
  const irradiance=SOLAR_ASSUMPTIONS.peakIrradiance*Math.max(0,direction[1]);
  // The photovoltaic-cell planes in the 3D asset are horizontal; terrain
  // slope affects the supports, not the illuminated surface normal.
  const panelNormal:[number,number,number]=[0,1,0];
  const incidence=direction[1]>0?Math.max(0,direction[0]*panelNormal[0]+direction[1]*panelNormal[1]+direction[2]*panelNormal[2]):0;
  const incidentPower=SOLAR_ASSUMPTIONS.peakIrradiance*SOLAR_ASSUMPTIONS.panelArea*SOLAR_ASSUMPTIONS.panelCount*incidence;
  const electricPower=incidentPower*SOLAR_ASSUMPTIONS.efficiency*SOLAR_ASSUMPTIONS.performanceRatio;
  return {direction,localHour,irradiance,panelNormal,incidence,incidentPower,electricPower};
}

export function routeCurvature(t:number){
  const v=velocityAt(t),a=accelerationAt(t);
  const cross:[number,number,number]=[v[1]*a[2]-v[2]*a[1],v[2]*a[0]-v[0]*a[2],v[0]*a[1]-v[1]*a[0]];
  return Math.hypot(...cross)/Math.hypot(...v)**3;
}

export function safeRoverSpeed(t:number,lateralAcceleration=.55){
  const curvature=routeCurvature(t);
  return {curvature,lateralAcceleration,speed:Math.sqrt(lateralAcceleration/curvature)};
}

export function routeProfile(samples=72){
  return Array.from({length:samples},(_,i)=>{
    const ratio=i/(samples-1),t=START+ratio*Math.PI,p=routeAt(t);
    return {ratio,t,height:p[1],x:p[0],z:p[2]};
  });
}

export function directionalRose(x:number,z:number,samples=72){
  const g=grad(x,z);
  return Array.from({length:samples},(_,i)=>{
    const angle=i/samples*Math.PI*2,value=g[0]*Math.cos(angle)+g[1]*Math.sin(angle);
    return {angle,value};
  });
}

export function descentPath(x:number,z:number,steps=42,stepSize=2.4){
  const points:{x:number;z:number;y:number;slope:number}[]=[];
  for(let i=0;i<steps&&Math.hypot(x,z)<=108;i++){
    const g=grad(x,z),slope=Math.hypot(...g);points.push({x,z,y:height(x,z),slope});
    if(slope<1e-5)break;
    let step=stepSize,accepted=false;
    for(let trial=0;trial<24;trial++){
      const nx=x-step*g[0]/slope,nz=z-step*g[1]/slope;
      if(Math.hypot(nx,nz)<=108 && height(nx,nz)<height(x,z)-1e-12){x=nx;z=nz;accepted=true;break;}
      step*=.5;
    }
    if(!accepted)break;
  }
  return points;
}
