/** SI coordinates: mathematical (x,y,z) -> rendering (x,z,y). */
// The tank keeps the same local semielipsoid and density model. Its site is
// deliberately outside the rover corridor so the physical route stays clear.
export const MARS = { radius:110, routeRadius:72, a:18, b:14, c:8, density:920, alpha:.04, beta:.06, tankX:0, tankY:-94 };
export const BPLUS_SITE={x:64.3988,y:-32.1994,z:19.1826} as const;
export const CAMPUS_CORE_SITE={x:-8,z:8} as const;
// Scale the photovoltaic-cell envelope of the GLB (about 7.87 m² unscaled)
// to the nominal 6 m² per module, then check its complete support footprint.
export const SOLAR_MODULE_SCALE=.872;
const solarAngles=Array.from({length:7},(_,i)=>-.42+i*.374/6);
export const SOLAR_ARRAY_LAYOUT=[
 ...Array.from({length:6},(_,i)=>({radius:61.14,angle:-.42+i*.374/5})),
 ...solarAngles.map(angle=>({radius:64.45,angle})),
 ...solarAngles.map(angle=>({radius:67.74,angle})),
].map(({radius,angle})=>({x:radius*Math.cos(angle),z:radius*Math.sin(angle),angle}));
// Auxiliary service array is outside the mathematical integral region R.
// Its 24 modules are separately identified so the original 20-panel proof,
// boundaries and classroom solar demonstration retain their exact meaning.
export const SOLAR_SUPPORT_LAYOUT=[100,103.3,106.6].flatMap(radius=>
 Array.from({length:8},(_,index)=>{const angle=-1+index*.38/7;return{x:radius*Math.cos(angle),z:radius*Math.sin(angle),angle};})
);
export const height = (x:number,y:number) => 18+6*((x*x+y*y)/6400-1)**2+.012*x-.006*y;
export const grad = (x:number,y:number):[number,number] => { const s=(x*x+y*y)/6400-1; return [3*x/800*s+.012,3*y/800*s-.006]; };
export const hessian = (x:number,y:number) => {const s=(x*x+y*y)/6400-1;return [3*s/800+3*x*x/2560000,3*x*y/2560000,3*s/800+3*y*y/2560000];};
export const gradObjective = (x:number,y:number):[number,number] => {
 const g=grad(x,y), h=hessian(x,y);
 return [2*(g[0]*h[0]+g[1]*h[1]), 2*(g[0]*h[1]+g[1]*h[2])];
};
export const START=-Math.atan(.5);
export const routeAt=(t:number):[number,number,number]=>[72*Math.cos(t),height(72*Math.cos(t),72*Math.sin(t)),72*Math.sin(t)];
export const velocityAt=(t:number):[number,number,number]=>[-72*Math.sin(t),-.864*Math.sin(t)-.432*Math.cos(t),72*Math.cos(t)];
export const accelerationAt=(t:number):[number,number,number]=>[-72*Math.cos(t),-.864*Math.cos(t)+.432*Math.sin(t),-72*Math.sin(t)];
/** Arc length accumulated on the actual spatial route, in metres. */
const ROUTE_ARC_SAMPLES=256;
const routeArc=[0];
for(let i=0;i<ROUTE_ARC_SAMPLES;i++){
 const a=START+i*Math.PI/ROUTE_ARC_SAMPLES,b=START+(i+1)*Math.PI/ROUTE_ARC_SAMPLES;
 const speed=(angle:number)=>Math.hypot(...velocityAt(angle));
 routeArc.push(routeArc[i]+(b-a)*(speed(a)+4*speed((a+b)/2)+speed(b))/6);
}
export const ROUTE_LENGTH=routeArc[ROUTE_ARC_SAMPLES];
export function routeDistanceAt(progress:number){
 const position=Math.max(0,Math.min(1,progress))*ROUTE_ARC_SAMPLES;
 const index=Math.min(ROUTE_ARC_SAMPLES-1,Math.floor(position));
 return routeArc[index]+(position-index)*(routeArc[index+1]-routeArc[index]);
}
/** Integral of f(r cos θ,r sin θ) r over the revealed part of solar region R. */
export const REGION_AREA=Math.PI*(72**2-60**2)/8;
export function regionVolumeAt(progress:number){
 const start=-Math.PI/4,end=start+Math.max(0,Math.min(1,progress))*Math.PI/4;
 const radial=(r:number)=>12*r**2-3*r**4/6400+r**6/6400**2;
 return (radial(72)-radial(60))*(end-start)
  +(72**3-60**3)*(.004*(Math.sin(end)-Math.sin(start))+.002*(Math.cos(end)-Math.cos(start)));
}
export const REGION_VOLUME=regionVolumeAt(1);
export const densityAt=(u:number,w:number)=>920*(1+.04*u/18-.06*w/8);
export const VOLUME=2*Math.PI*18*14*8/3;
export const MASS=920*(1-.06*3/8)*VOLUME;
export const CM:[number,number,number]=[(920*.04/18*18**2/5*VOLUME)/MASS,0,(920*(3-.06/8*8**2/5)*VOLUME)/MASS];
export const LEVELS=[17,18.5,20,21.5,23,24];
function northContourCrossing(level:number,inner:boolean){
 let lo=inner?0:80,hi=inner?80:MARS.radius;
 for(let i=0;i<48;i++){
  const mid=(lo+hi)/2;
  if((height(0,lo)>level)===(height(0,mid)>level))lo=mid;else hi=mid;
 }
 return (lo+hi)/2;
}
/** Horizontal separations of the same 20 m and 21.5 m contours along x=0, y>0. */
export const CONTOUR_SPACING={
 inner:[northContourCrossing(21.5,true),northContourCrossing(20,true)] as [number,number],
 outer:[northContourCrossing(20,false),northContourCrossing(21.5,false)] as [number,number],
};
export function landscape(x:number,y:number) {
 const r=Math.hypot(x,y); if(r<=110)return height(x,y);
 const a=Math.atan2(y,x), boundary=height(110*Math.cos(a),110*Math.sin(a));
 const g=grad(110*Math.cos(a),110*Math.sin(a)), slope=g[0]*Math.cos(a)+g[1]*Math.sin(a);
 const outer=18+68*Math.exp(-1*((r-470)/95)**2)*(.72+.28*Math.sin(3*a))**2+38*Math.exp(-1*((r-330)/100)**2)+8*Math.sin(x*.018)*Math.sin(y*.021)+3*Math.sin((x+y)*.036);
 const t=Math.min(1,(r-110)/90), s=t*t*t*(10+t*(-15+6*t));
 return (boundary+slope*(r-110))*(1-s)+outer*s;
}
/** Buried water-service line, sampled against the same terrain as the scene. */
export const WATER_PLANT={x:24,z:-58,foundationRadius:2.7} as const;
export const SERVICE_JUNCTION={x:10,z:-58,size:3.6} as const;
const junctionRunout=SERVICE_JUNCTION.size/2+1.5/2,waterPlantApproachInset=WATER_PLANT.foundationRadius+1.5/2;
export const WATER_PLANT_WALKWAY={startX:SERVICE_JUNCTION.x+junctionRunout,startY:SERVICE_JUNCTION.z,endX:WATER_PLANT.x-waterPlantApproachInset,endY:WATER_PLANT.z,paverWidth:2.2,paverLength:1.5,endSurfaceOffset:0} as const;
export const WATER_PIPE={endX:WATER_PLANT.x,endY:WATER_PLANT.z,depth:1.2,radius:.15} as const;
/** One continuous surface route from the treatment access to the B+ beacon. */
const eastServiceLength=Math.hypot(BPLUS_SITE.x-SERVICE_JUNCTION.x,BPLUS_SITE.y-SERVICE_JUNCTION.z);
const eastServiceDivisions=Math.ceil(eastServiceLength/1.5);
export const EAST_SERVICE_WALKWAY={startX:SERVICE_JUNCTION.x,startY:SERVICE_JUNCTION.z,endX:BPLUS_SITE.x,endY:BPLUS_SITE.y,divisions:eastServiceDivisions,lastPaver:eastServiceDivisions-5,paverWidth:1.8,paverLength:1.5} as const;
export function waterPipeAt(t:number):[number,number,number]{
 const x=MARS.tankX+(WATER_PIPE.endX-MARS.tankX)*t;
 const y=MARS.tankY+(WATER_PIPE.endY-MARS.tankY)*t;
 return [x,landscape(x,y)-WATER_PIPE.depth,y];
}
export const tangentAt=(x:number,y:number,px=40,py=-20)=> {const g=grad(px,py);return height(px,py)+g[0]*(x-px)+g[1]*(y-py);};
/** Move from P to H, then hold H for the comparison stage. */
export function linearizationAt(progress:number){
 const fraction=Math.max(0,Math.min(1,(progress-.25)/.5)),x=40+4*fraction,y=-20+3*fraction;
 const exact=height(x,y),linear=tangentAt(x,y),error=linear-exact;
 return {fraction,x,y,exact,linear,error,relative:Math.abs(error)/Math.abs(exact)*100};
}
export function directionalAtQ(progress:number){
 const ux=1/Math.sqrt(5),uy=-2/Math.sqrt(5),g=grad(-50,35),derivative=g[0]*ux+g[1]*uy;
 const distance=12*Math.max(0,Math.min(1,progress)),x=-50+distance*ux,y=35+distance*uy;
 const delta=height(x,y)-height(-50,35);
 return {ux,uy,derivative,distance,x,y,delta,linearDelta:distance*derivative};
}
export const tankFloor=Math.max(...Array.from({length:128},(_,i)=>height(MARS.tankX+18*Math.cos(i/128*Math.PI*2),MARS.tankY+14*Math.sin(i/128*Math.PI*2))))+.65;
/** Horizontal unit directions; the gradient is nonzero at P and Q. */
export function gradientFrameAt(x:number,y:number){
 const g=grad(x,y),norm=Math.hypot(...g);
 if(norm<1e-12)throw new Error('A critical point has no unique direction of steepest ascent.');
 const ascent:[number,number]=[g[0]/norm,g[1]/norm],descent:[number,number]=[-ascent[0],-ascent[1]],level:[number,number]=[-ascent[1],ascent[0]];
 return {g,norm,ascent,descent,level};
}
/** Project a local tangent seed onto f(x,y)=f(center); heights are not exaggerated. */
export function localLevelTrace(x:number,y:number,span=16,samples=81){
 const frame=gradientFrameAt(x,y),cota=height(x,y);
 return Array.from({length:samples},(_,i)=>{
  const offset=-span+2*span*i/(samples-1);let px=x+offset*frame.level[0],py=y+offset*frame.level[1];
  for(let iteration=0;iteration<12;iteration++){
   const residual=height(px,py)-cota,g=grad(px,py),norm2=g[0]**2+g[1]**2;
   if(Math.abs(residual)<1e-12)break;
   if(norm2<1e-18)throw new Error('Local level projection reached a critical point.');
   px-=residual*g[0]/norm2;py-=residual*g[1]/norm2;
  }
  return {x:px,y:py,height:height(px,py)};
 });
}
/** All components refer to the same route parameter t, measured in radians. */
export function chainAt(progress:number){
 const fraction=Math.max(0,Math.min(1,progress)),t=START+Math.PI*fraction,p=routeAt(t),v=velocityAt(t),g=grad(p[0],p[2]);
 const xTerm=g[0]*v[0],yTerm=g[1]*v[2];
 return {fraction,t,x:p[0],y:p[2],height:p[1],dx:v[0],dy:v[2],fx:g[0],fy:g[1],xTerm,yTerm,derivative:xTerm+yTerm};
}
/** Sweep the complete constraint, hold both candidates, finish at the minimum. */
export function lagrangeAt(progress:number){
 const fraction=Math.max(0,Math.min(1,progress)),stage=fraction<.6?'sweep':fraction<.8?'maximum':'minimum';
 const angle=stage==='sweep'?START+2*Math.PI*fraction/.6:stage==='maximum'?START+Math.PI:START;
 const x=72*Math.cos(angle),y=72*Math.sin(angle),gradient=grad(x,y),objective=gradient[0]**2+gradient[1]**2,gF=gradObjective(x,y),gG:[number,number]=[2*x,2*y];
 const lambda=(gF[0]*gG[0]+gF[1]*gG[1])/(gG[0]**2+gG[1]**2),residual=Math.hypot(gF[0]-lambda*gG[0],gF[1]-lambda*gG[1]);
 return {fraction,stage,angle,x,y,objective,slope:Math.sqrt(objective),gF,gG,lambda,residual};
}
/** Fixed official direction at P, distinct from the rotating rose of directions. */
export function directionalAtP(progress:number){
 const ux=.6,uy=.8,g=grad(40,-20),derivative=g[0]*ux+g[1]*uy;
 const distance=12*Math.max(0,Math.min(1,progress)),x=40+distance*ux,y=-20+distance*uy;
 return {ux,uy,derivative,distance,x,y,delta:height(x,y)-height(40,-20),linearDelta:distance*derivative};
}
