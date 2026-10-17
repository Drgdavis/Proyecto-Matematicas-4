import assert from 'node:assert/strict';
import {height,landscape,grad,hessian,tangentAt,linearizationAt,directionalAtQ,routeAt,velocityAt,accelerationAt,VOLUME,MASS,CM,densityAt,tankFloor,MARS,CONTOUR_SPACING} from '../src/data/marsMath.ts';
const near=(a,b,tol=1e-6)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
near(height(0,CONTOUR_SPACING.inner[0]),21.5);
near(height(0,CONTOUR_SPACING.inner[1]),20);
near(height(0,CONTOUR_SPACING.outer[0]),20);
near(height(0,CONTOUR_SPACING.outer[1]),21.5);
assert.ok(CONTOUR_SPACING.outer[1]-CONTOUR_SPACING.outer[0]<CONTOUR_SPACING.inner[1]-CONTOUR_SPACING.inner[0]);
const regionArea=(72**2-60**2)*Math.PI/8;
near(regionArea,622.0353454107791);
const polarCellArea=r0=>.5*((r0+4)**2-r0**2)*Math.PI/24;
near(polarCellArea(60),62*4*Math.PI/24);
near(polarCellArea(68),70*4*Math.PI/24);
near(polarCellArea(68)/polarCellArea(60),70/62);
const ellipsoidMap=(rho,phi,theta)=>[18*rho*Math.sin(phi)*Math.cos(theta),14*rho*Math.sin(phi)*Math.sin(theta),8*rho*Math.cos(phi)];
const jacobianAt=(rho,phi,theta)=>{const e=1e-5,columns=[[rho+e,phi,theta,rho-e,phi,theta],[rho,phi+e,theta,rho,phi-e,theta],[rho,phi,theta+e,rho,phi,theta-e]].map(([r1,p1,t1,r0,p0,t0])=>ellipsoidMap(r1,p1,t1).map((value,i)=>(value-ellipsoidMap(r0,p0,t0)[i])/(2*e)));const [a,b,c]=columns;return a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]);};
near(Math.abs(jacobianAt(.6,Math.PI/3,Math.PI/4)),2016*.6**2*Math.sin(Math.PI/3),1e-6);
for(const [x,y] of [[40,-20],[-50,35],[0,0],[64.3988,-32.1994]]){const e=.001,g=grad(x,y),h=hessian(x,y);near((height(x+e,y)-height(x-e,y))/(2*e),g[0]);near((height(x,y+e)-height(x,y-e))/(2*e),g[1]);near((grad(x+e,y)[0]-grad(x-e,y)[0])/(2*e),h[0]);near((grad(x,y+e)[0]-grad(x,y-e)[0])/(2*e),h[1]);}
// Independent Taylor remainder from the Hessian integral along P -> H.
near(tangentAt(40,-20),height(40,-20));
for(let k=1;k<=20;k++){
 const s=k/20,sample=linearizationAt(.25+.5*s),n=100,du=s/n;
 let remainder=0;
 for(let i=0;i<=n;i++){const u=i*du,h=hessian(40+4*u,-20+3*u),weight=i===0||i===n?1:i%2?4:2;remainder+=weight*(s-u)*(16*h[0]+24*h[1]+9*h[2]);}
 near(sample.error,-remainder*du/3,1e-9);
 assert.ok(sample.error>0,'The tangent prediction is above f on this P -> H segment.');
}
near(linearizationAt(1).error,813/32768,1e-9);
const directional=directionalAtQ(1),gQ=grad(-50,35);
near(Math.hypot(directional.ux,directional.uy),1);
near((gQ[0]-directional.derivative*directional.ux)*directional.ux+(gQ[1]-directional.derivative*directional.uy)*directional.uy,0);
const eps=.0001;
near((height(-50+eps*directional.ux,35+eps*directional.uy)-height(-50-eps*directional.ux,35-eps*directional.uy))/(2*eps),directional.derivative,1e-8);
assert.ok(Math.abs(directional.delta-directional.linearDelta)>.001,'Finite height change must be distinguished from the local linear prediction.');
for(let i=0;i<80;i++){const a=i/80*Math.PI*2;for(const r of [110,200]){const f=t=>landscape(t*Math.cos(a),t*Math.sin(a)),e=.001;near(f(r-e),f(r+e),.003);near((f(r)-f(r-e))/e,(f(r+e)-f(r))/e,.0001);}const r=109;near(landscape(r*Math.cos(a),r*Math.sin(a)),height(r*Math.cos(a),r*Math.sin(a)));}
let vol=0,mass=0,mx=0,mz=0;const n=100,h=8/n;
for(let i=0;i<=n;i++){const w=i*h,A=Math.PI*18*14*(1-w*w/64),q=(i===0||i===n)?1:i%2?4:2;vol+=q*A;mass+=q*A*densityAt(0,w);mx+=q*(920*.04/18)*A*(18**2*(1-w*w/64)/4);mz+=q*A*w*densityAt(0,w);}
vol*=h/3;mass*=h/3;mx*=h/3;mz*=h/3;near(vol,VOLUME);near(mass,MASS);near(mx/mass,CM[0],1e-7);near(mz/mass,CM[2],1e-7);
assert.ok((CM[0]/18)**2+(CM[1]/14)**2<1,'La proyección del centro debe quedar dentro de la base elíptica.');
for(const t of [-.463647609,0,1.107148718,2.677945]){const p=routeAt(t),v=velocityAt(t),a=accelerationAt(t),e=1e-5;near(p[1],height(p[0],p[2]));for(let k=0;k<3;k++){near((routeAt(t+e)[k]-routeAt(t-e)[k])/(2*e),v[k]);near((velocityAt(t+e)[k]-velocityAt(t-e)[k])/(2*e),a[k]);}}
for(let i=0;i<128;i++){const a=i/128*Math.PI*2;assert.ok(tankFloor>height(MARS.tankX+18*Math.cos(a),MARS.tankY+14*Math.sin(a)));}
console.log('PASS: region area, derivatives, Hessian, terrain joins in height and slope, route kinematics, volume, mass, centre of mass and tank clearance.');
console.log(JSON.stringify({volume:VOLUME,mass:MASS,centre:CM,tankFloor},null,2));
