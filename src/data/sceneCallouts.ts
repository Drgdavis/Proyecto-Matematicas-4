import type { EvaStep } from './eva01Project.ts';
import { chainAt, directionalAtP, directionalAtQ, grad, height, hessian, lagrangeAt, LEVELS, linearizationAt, MARS, START, velocityAt, accelerationAt, tangentAt, tankFloor, VOLUME, MASS, CM, ROUTE_LENGTH, routeDistanceAt, REGION_AREA, REGION_VOLUME, regionVolumeAt } from './marsMath.ts';
import { directionalRose, safeRoverSpeed } from './marsSystems.ts';

export type SceneCallout = { id:string; title:string; value:string; detail:string; anchor:[number,number,number]; tone:'cyan'|'amber'|'green'|'coral'; dock?:'left-column'|'right-column' };
const at=(x:number,y:number,lift=6):[number,number,number]=>[x,height(x,y)+lift,y];
const point=(id:string,title:string,value:string,detail:string,x:number,y:number,tone:SceneCallout['tone']):SceneCallout=>({id,title,value,detail,anchor:at(x,y),tone});

/** Visible claims are derived from the same model and progress used by the 3D geometry. */
export function sceneCallouts(step:EvaStep,progress:number):SceneCallout[]{
 const t=Math.max(0,Math.min(1,progress));
 if(step.name==='Plano general'||step.target==='architecture')return [];
 // ---- Fase I · Escenas 01-02 ----
 if(step.target==='axes'){
  return [
   {id:'axis-x',title:'Eje X · Este-Oeste',value:'1 unidad = 1 m',detail:'Positivo hacia el Este. Origen: centro del cráter.',anchor:[55,height(55,0)+3,0],tone:'cyan'},
   {id:'axis-y',title:'Eje Y · Norte-Sur',value:'1 unidad = 1 m',detail:'Positivo hacia el Norte.',anchor:[0,height(0,55)+3,55],tone:'amber'},
   {id:'axis-z',title:'Eje Z · Elevación',value:'z = 0 m = datum',detail:'Medido respecto del datum del modelo.',anchor:[0,4,0],tone:'green'}
  ];
 }
 if(step.target==='terrain'){
  return [point('f-formula','Superficie f(x,y)','f ∈ C^∞ en R²','Polinomio: 18 + 6·(…)² + 0.012x − 0.006y. Depresión anular + inclinación suave.',0,0,'cyan')];
 }
 if(step.target==='domain'){
  return [point('domain-boundary','Disco físico D · r = 110 m','π·110² ≈ 38 013.27 m²','Solo dentro de D se toman decisiones. Fuera: paisaje contextual de transición.',110,0,'green')];
 }
 // ---- Escenas 02-03 existentes ----
 if(step.target==='contours'){
  const cutHeight=LEVELS[0]+(LEVELS[LEVELS.length-1]-LEVELS[0])*t;
  const revealed=Math.max(1,LEVELS.filter(level=>level<=cutHeight+1e-6).length);
  return [{id:'level',title:'Corte horizontal',value:`z = ${cutHeight.toFixed(2)} m`,detail:`${revealed} de ${LEVELS.length} curvas visibles: puntos con igual cota.`,anchor:[0,cutHeight,0],tone:'cyan'}];
 }
 if(step.target==='traces'){
  const second=t>=.5,coordinate=-110+440*(second?t-.5:t);
  const x=second?coordinate:0,y=second?0:coordinate;
  return [point('trace',second?'T₂ · y = 0':'T₁ · x = 0',`f = ${height(x,y).toFixed(2)} m`,'El plano vertical corta la superficie en este punto.',x,y,second?'amber':'cyan')];
 }
 if(step.target==='evaluations'){
  const sites=[['A',0,0,'cyan'],['P',40,-20,'amber'],['B⁺',64.3988,-32.1994,'green']] as const;
  const count=t<1/3?1:t<2/3?2:3;
  return sites.slice(0,count).slice(-2).map(([name,x,y,tone])=>point(`height-${name}`,`Cota ${name}`,`${height(x,y).toFixed(2)} m`,'Altura medida desde z = 0.',x,y,tone));
 }
 if(step.target==='terrainInterpretation'){
  const sites=[['Cima local',3.2064,-1.6032,'Evitar una explanación extensa.','coral'],['Depresión',-73.1035,36.5517,'Revisar acumulación y drenaje.','cyan'],['Sitio candidato B⁺',64.3988,-32.1994,'Menor pendiente sobre la circunferencia de comparación.','green']] as const;
  const count=t<1/3?1:t<2/3?2:3;
  return sites.slice(0,count).slice(-2).map(([title,x,y,detail,tone])=>point(`zone-${title}`,title,`${height(x,y).toFixed(2)} m`,detail,x,y,tone));
 }
 if(step.target==='linear'){
  const sample=linearizationAt(t);
  return [point('linear-sample',t<.75?'Punto móvil':'Comparación en H',`f ${sample.exact.toFixed(3)} · L ${sample.linear.toFixed(3)} m`,`Error vertical: ${(Math.abs(sample.error)*100).toFixed(3)} cm; el terreno y el plano conservan su escala.`,sample.x,sample.y,'amber')];
 }
 if(step.name==='Segundas derivadas'){
  const x=28+24*t,[fxx,fxy,fyy]=hessian(x,-20);
  return [point('linear-hessian','Curvatura local',`fₓₓ = ${fxx.toFixed(6)} m⁻¹`,`En x = ${x.toFixed(1)} m: fₓᵧ = ${fxy.toFixed(6)}; fᵧᵧ = ${fyy.toFixed(6)} m⁻¹.`,x,-20,'cyan')];
 }
 if(step.name==='Plano tangente'){
  const size=1.2+5.8*t,edgeX=40+size,edgeY=-20+size,edgeError=Math.abs(tangentAt(edgeX,edgeY)-height(edgeX,edgeY));
  return [point('linear-plane','Contacto en P',`f(P) = ${height(40,-20).toFixed(5)} m`,`En la esquina (+${size.toFixed(1)}, +${size.toFixed(1)}) m: |L−f| = ${(edgeError*100).toFixed(2)} cm.`,40,-20,'amber')];
 }
 if(step.target==='normal'){
  const [fx,fy]=grad(40,-20),norm=Math.hypot(fx,fy,1);
  return [point('linear-normal','Normal al plano',t<.5?`n = (${(-fx).toFixed(3)}, ${(-fy).toFixed(3)}, 1)`:`n̂ = (${(-fx/norm).toFixed(3)}, ${(-fy/norm).toFixed(3)}, ${(1/norm).toFixed(3)})`,'Cian: normal al plano; blanco: vertical de referencia. Su separación depende de la pendiente en P.',40,-20,'cyan')];
 }
 // ---- Escena 05 · Gradiente P/Q y rosa ----
 if(step.target==='gradientP'){
  const [fx,fy]=grad(40,-20),norm=Math.hypot(fx,fy);
  if(t<.5) return [point('gradP-fx','∂f/∂x en P',`fₓ = ${fx.toFixed(6)} m/m`,'Pendiente del corte y = −20 m en el punto P.',40,-20,'coral')];
  if(t<.9) return [
   point('gradP-fx','∂f/∂x en P',`fₓ = ${fx.toFixed(6)} m/m`,'Corte y = −20 m.',40,-20,'coral'),
   point('gradP-fy','∂f/∂y en P',`fᵧ = ${fy.toFixed(6)} m/m`,'Corte x = 40 m.',40,-20,'amber')
  ];
  return [point('gradP-grad','∇f en P',`‖∇f‖ = ${(norm*100).toFixed(3)} cm/m`,'Apunta al mayor ascenso; perpendicular a la curva de nivel local.',40,-20,'green')];
 }
 if(step.target==='gradientQ'){
  const [fx,fy]=grad(-50,35),norm=Math.hypot(fx,fy);
  if(t<.5) return [point('gradQ-point','Q = (−50, 35)',`f(Q) = ${height(-50,35).toFixed(3)} m`,'Segundo punto de análisis. Compara la seguridad con P.',-50,35,'cyan')];
  return [point('gradQ-grad','∇f en Q',`‖∇f‖ = ${(norm*100).toFixed(3)} cm/m`,`fₓ=${fx.toFixed(6)}; fᵧ=${fy.toFixed(6)} m/m. Supera a P en ${((norm-0.1018808)*1000).toFixed(3)} ‰.`,-50,35,'green')];
 }
 if(step.target==='directionalRose'){
  const [fx,fy]=grad(40,-20),norm=Math.hypot(fx,fy);
  if(t>=.8)return [point('rose-maximum','Mayor ascenso',`+${(norm*100).toFixed(3)} cm/m`,'La dirección del gradiente maximiza Dᵤf; la opuesta da el descenso máximo.',40+fx/norm*15,-20+fy/norm*15,'green')];
  const rose=directionalRose(40,-20,96),index=Math.max(0,Math.round(rose.length*t/.8)-1),sample=rose[index],radius=3+Math.abs(sample.value)*115;
  return [point('rose-sweep',`Rumbo ${(sample.angle*180/Math.PI).toFixed(0)}°`,`Dᵤf = ${(sample.value*100).toFixed(3)} cm/m`,sample.value>=0?'El rumbo actual asciende.':'El rumbo actual desciende.',40+Math.cos(sample.angle)*radius,-20+Math.sin(sample.angle)*radius,sample.value>=0?'green':'amber')];
 }
 // ---- Escena 06 · Direccionales P/Q ----
 if(step.target==='directional'||step.target==='directionalQ'){
  const sample=step.target==='directionalQ'?directionalAtQ(t):directionalAtP(t);
  const atP=step.target==='directional';
  if(t<=.1) return [point(atP?'dirP-start':'dirQ-start',atP?'Direccional en P · rumbo u':'Direccional en Q · rumbo u',`Dᵤf = ${(sample.derivative*100).toFixed(3)} cm/m`,`u = (${sample.ux.toFixed(3)}, ${sample.uy.toFixed(3)}); ‖u‖ = 1. s = 12 m por recorrer.`,atP?40:-50,atP?-20:35,sample.derivative>=0?'green':'amber')];
  return [point('directional-probe','Sonda sobre el suelo',`Δf = ${sample.delta.toFixed(4)} m`,`s = ${sample.distance.toFixed(2)} m; predicción lineal = ${sample.linearDelta.toFixed(4)} m; Dᵤf = ${(sample.derivative*100).toFixed(3)} cm/m.`,sample.x,sample.y,sample.delta>=sample.linearDelta?'green':'cyan')];
 }
 // ---- Escena 07 · Regla de la cadena ----
 if(step.name==='Regla de la cadena'){
  const sample=chainAt(t);
  const atStart=sample.fraction===0, atEnd=sample.fraction===1;
  const level=Math.abs(sample.derivative)<1e-8;
  let phase='Descenso del rover';
  if(atStart)phase='Inicio · z′=0 (máx. local de z)';
  else if(atEnd)phase='Final · z′=0 (mín. local de z)';
  else if(level)phase='Nivel instantáneo · z′=0';
  else if(sample.derivative<0)phase='Descenso · z′<0';
  else phase='Ascenso · z′>0';
  return [point('chain-rover',phase,`z′ = ${level?'0.0000':sample.derivative.toFixed(4)} m/rad`,`Rojo fₓx′=${sample.xTerm.toFixed(3)}; cian fᵧy′=${sample.yTerm.toFixed(3)} m/rad. t=${sample.t.toFixed(3)} rad; barras ×2.4 (escala gráfica).`,sample.x,sample.y,level?'amber':'cyan')];
 }
 if(step.target==='criticals'){
  const sites=[['Mínimo',-73.1035,36.5517,'green'],['Máximo',3.2064,-1.6032,'coral'],['Silla',69.8971,-34.9485,'amber']] as const;
  const count=t<1/3?1:t<2/3?2:3;
  return sites.slice(0,count).slice(-2).map(([title,x,y,tone])=>{
   const [fxx,fxy,fyy]=hessian(x,y),det=fxx*fyy-fxy*fxy;
   return point(`critical-${title}`,title,`D = ${det.toExponential(2)}`,`${title}: ∇f ≈ 0; clasificación por Hessiano.`,x,y,tone);
  });
 }
 if(step.target==='criticalMin')return [point('critical-min','Mínimo local',`${height(-73.1035,36.5517).toFixed(2)} m`,'Hessiano positivo: depresión local.',-73.1035,36.5517,'green')];
 if(step.target==='criticalOther')return [point('critical-other',t<.5?'Máximo local':'Punto de silla',t<.5?`${height(3.2064,-1.6032).toFixed(2)} m`:'D < 0',t<.5?'Determinante D > 0 y fₓₓ < 0.':'Determinante D < 0: sube en una dirección y baja en otra.',t<.5?3.2064:69.8971,t<.5?-1.6032:-34.9485,t<.5?'coral':'amber')];
 if(step.target==='safe')return [point('constraint','Circunferencia de comparación','x² + y² = 72²','La llegada se elige sobre x²+y²=72², no entre los críticos libres.',72*Math.cos(t*Math.PI*2),72*Math.sin(t*Math.PI*2),'cyan')];
 if(step.target==='candidates'){
  const sample=lagrangeAt(t),minimum=lagrangeAt(1),maximum=lagrangeAt(.7);
  if(sample.stage==='sweep') return [point('lagrange-sweep','Buscar sobre la circunferencia',`F = ${sample.objective.toFixed(5)}`,'F = ‖∇f‖² sobre la circunferencia de comparación.',sample.x,sample.y,'cyan')];
  if(sample.stage==='maximum') return [point('lagrange-max','B⁻ · descartar',`${(Math.sqrt(maximum.objective)*100).toFixed(3)} %`,'Mayor pendiente entre los dos candidatos.',maximum.x,maximum.y,'coral')];
  return [point('lagrange-min','B⁺ · elegir',`${(Math.sqrt(minimum.objective)*100).toFixed(3)} %`,'Menor pendiente sobre la circunferencia de 72 m.',minimum.x,minimum.y,'green')];
 }
 // ---- Escena 09-10 · Ruta 3D / Curvatura ----
 if(step.target==='route'||step.target==='routeMarkers'){
  const tStart=START, tMid=Math.PI/2-Math.atan(.5), tEnd=START+Math.PI;
  const fraction=Math.max(0,Math.min(1,t)), tPar=tStart+Math.PI*fraction;
  const [rx,ry]=[72*Math.cos(tPar),72*Math.sin(tPar)];
  if(step.target==='routeMarkers'){
   const count=fraction<0.34?1:fraction<0.67?2:3;
   const markers:SceneCallout[]=[];
   if(count>=1)markers.push(point('marker-start','Inicio · EVA03 (B⁺)',`${height(72*Math.cos(tStart),72*Math.sin(tStart)).toFixed(2)} m`,'t = −atan(1/2) rad.',72*Math.cos(tStart),72*Math.sin(tStart),'green'));
   if(count>=2)markers.push(point('marker-mid','C* · máximo descenso longitudinal',`${height(72*Math.cos(tMid),72*Math.sin(tMid)).toFixed(2)} m`,'t* ≈ 1.107 rad; z′ es mínimo (κ no es máxima).',72*Math.cos(tMid),72*Math.sin(tMid),'amber'));
   if(count>=3)markers.push(point('marker-end','Final · −B⁺',`${height(72*Math.cos(tEnd),72*Math.sin(tEnd)).toFixed(2)} m`,'t = π−atan(1/2) rad.',72*Math.cos(tEnd),72*Math.sin(tEnd),'coral'));
   return markers.slice(-2);
  }
  const s=routeDistanceAt(fraction);
  return [point('route-probe','Rover en ruta',`s = ${s.toFixed(2)} / ${ROUTE_LENGTH.toFixed(2)} m`,'Longitud 3D acumulada; x=72 cos t, y=72 sen t, z=f(x,y). t='+tPar.toFixed(3)+' rad.',rx,ry,'cyan')];
 }
 if(step.target==='vectors'){
  const tPar=START+Math.PI*t;
  const v=velocityAt(tPar),a=accelerationAt(tPar);
  const [rx,ry]=[72*Math.cos(tPar),72*Math.sin(tPar)];
  return [
   point('route-v','Derivada espacial r′',`‖r′‖ = ${Math.hypot(...v).toFixed(3)} m/rad`,'Componentes (x′, y′, z′) = ('+[v[0],v[2],v[1]].map(value=>value.toFixed(2)).join(', ')+'). t es angular.',rx,ry,'amber'),
   point('route-a','Segunda derivada r″',`‖r″‖ = ${Math.hypot(...a).toFixed(3)} m/rad²`,'Incluye el cambio de altura z″. Para m/s o m/s² se necesita t(τ).',rx+4,ry+4,'coral')
  ];
 }
 if(step.target==='tangentVector'){
  const tPar=START+Math.PI*t;
  const v=velocityAt(tPar),vn=Math.hypot(...v),unit=v.map(value=>value/vn);
  const [rx,ry]=[72*Math.cos(tPar),72*Math.sin(tPar)];
  return [point('route-t','Tangente 3D unitaria',`T = (${[unit[0],unit[2],unit[1]].map(value=>value.toFixed(3)).join(', ')})`,'Orden matemático (x, y, z); incluye inclinación vertical.',rx+unit[0]*6,ry+unit[2]*6,'green')];
 }
 if(step.target==='curvature'){
  const tPar=START+Math.PI*t;
  const kappa=safeRoverSpeed(tPar).curvature,R=1/kappa;
  const [rx,ry]=[72*Math.cos(tPar),72*Math.sin(tPar)];
  return [point('route-k','κ(t) y R(t)',`κ = ${kappa.toFixed(6)} m⁻¹ · R = ${R.toFixed(2)} m`,'‖v×a‖/‖v‖³. En t*: κ≈0.013886, R≈72.01 m.',rx,ry,'cyan')];
 }
 if(step.target==='safeSpeed'){
  const tPar=START+Math.PI*t;
  const {speed:vmax}=safeRoverSpeed(tPar);
  const [rx,ry]=[72*Math.cos(tPar),72*Math.sin(tPar)];
  return [point('route-vmax','vₘₐₓ(κ)',`≈ ${vmax.toFixed(2)} m/s`,'Límite calculado con a_lat_máx = 0.55 m/s²; su aplicación considera tracción, obstáculos y control.',rx,ry,'green')];
 }
 // ---- Escenas 11-13 · Integrales dobles ----
 if(step.target==='solarRegion'){
  if(step.name==='Región, límites y orden')return [point('region-r','Barrido de la región R',`${(REGION_AREA*t).toFixed(2)} / ${REGION_AREA.toFixed(2)} m²`,'60 ≤ r ≤ 72 m; −π/4 ≤ θ ≤ 0. Área en planta; la franja cian crece con θ.',66*Math.cos(-Math.PI/8),66*Math.sin(-Math.PI/8),'cyan')];
  if(step.name==='Valor medio')return [point('region-favg','Altura media f̄',`= ${(REGION_VOLUME/REGION_AREA).toFixed(3)} m`,'V/A = 12 119.962 m³ / 622.035 m². El plano ámbar iguala el volumen.',66,-18,'amber')];
  return [point('region-energy','Área para recubrimiento','623.365 − 622.035 = 1.330 m²','El área real supera la proyección en 0.214 %; la potencia requiere irradiancia y orientación.',66,-18,'green')];
 }
 if(step.target==='doubleVolume'){
  return [point('vol-underf','Volumen bajo f',`${regionVolumeAt(t).toFixed(2)} / ${REGION_VOLUME.toFixed(2)} m³`,'Integral acumulada hasta el corte θ actual; respecto de z=0. NO es excavación.',66,-22,'green')];
 }
 if(step.target==='surfaceArea'){
  const Aproj=622.035345, Asurf=623.364857, diff=Asurf-Aproj;
  return [
   point('area-proj','Área proyectada',`${Aproj.toFixed(3)} m² (planta)`,'Borde interior r=60, exterior r=72.',60*Math.cos(-Math.PI/8),60*Math.sin(-Math.PI/8),'cyan'),
   point('area-real','Área real relieve',`${Asurf.toFixed(3)} m²`,'Factor √(1+‖∇f‖²). Exceso +'+diff.toFixed(3)+' m² ('+((diff/Aproj)*100).toFixed(3)+' %).',66,-26,'green')
  ];
 }
 if(step.target==='polarGrid'){
  const rInner=62, rOuter=70, dTheta=Math.PI/24;
  const aInner=rInner*dTheta*4, aOuter=rOuter*dTheta*4;
  return [
   point('polar-inner','Celda interior (r̄≈62)',`ΔA ≈ ${aInner.toFixed(3)} m²`,'|J| = r. Δr=4 m; Δθ=π/24 rad.',rInner*Math.cos(-dTheta*2),rInner*Math.sin(-dTheta*2),'amber'),
   point('polar-outer','Celda exterior (r̄≈70)',`ΔA ≈ ${aOuter.toFixed(3)} m²`,'Mismo Δr,Δθ. Mayor por |J| creciente con r. +'+((aOuter/aInner-1)*100).toFixed(1)+'%.',rOuter*Math.cos(-dTheta*2),rOuter*Math.sin(-dTheta*2),'coral')
  ];
 }
 if(step.target==='solarPower'){
  return [{...point('solar-pw','Paneles solares · campo R','20×6 m² · η≈24% · PR=0.86','P = I₀·A·η·PR·ŝ·n̂. Escenario: latitud 18°N, equinoccio.',66,-18,'amber'),dock:'left-column'}];
 }
 // ---- Escenas 14-18 · Integrales triples ----
 if(step.target==='tank'&&step.name!=='Volumen paso a paso'){
  const tx=MARS.tankX+CM[0], ty=MARS.tankY;
  if(t<.5) return [
   {id:'tank-semiejes',title:'Semiejes',value:'18 · 14 · 8 m',detail:'u²/18² + v²/14² + w²/8² ≤ 1. w≥0 → mitad superior.',anchor:[tx+20,tankFloor+5,ty],tone:'cyan'},
   {id:'tank-bottom',title:'Base (w=0)',value:'Óvalo 36 × 28 m',detail:'Proyección sobre el terreno. Planta de apoyo.',anchor:[tx,tankFloor+0.5,ty-14],tone:'green'}
  ];
  return [{id:'tank-limits',title:'Sólido E',value:t>.75?'Límites constantes ρ,φ,θ':'Límites anidados (Cartesiano)',detail:t>.75?'0≤ρ≤1 · 0≤φ≤π/2 · 0≤θ≤2π':'u, √(1−u²/18²), w(√(…)).',anchor:[tx,tankFloor+9,ty],tone:'amber'}];
 }
 if(step.target==='jacobian'){
  return [
   {id:'jac-part',title:'Celda (ρ,φ,θ)',value:'dV = 2016 ρ² sen φ dρdφdθ',detail:'|J| = 18·14·8·ρ² sen φ = 2016 ρ² sen φ. Esfera unitaria vs elipsoide.',anchor:[MARS.tankX+25,tankFloor+7,MARS.tankY],tone:'cyan'},
   {id:'jac-stretch',title:'Estiramiento',value:'18×14×8 × V_semiunitario',detail:'Producto semiejes · 2π/3 = 1344π m³.',anchor:[MARS.tankX+CM[0]-22,tankFloor+7,MARS.tankY],tone:'amber'}
  ];
 }
 if(step.target==='density'){
  return [
   point('density-model','Modelo δ(u,w)','853.66 ≤ δ ≤ 956.80 kg/m³','δ = 920·(1 + 0.04u/18 − 0.06w/8). δ > 0 en todo E (positiva).',MARS.tankX+18,MARS.tankY,'amber'),
   point('density-mass','Masa total M',`≈ ${(MASS/1e6).toFixed(3)} × 10⁶ kg`,'Contribución u impar se cancela por simetría: ∭_E u dV = 0.',MARS.tankX-18,MARS.tankY,'green')
  ];
 }
 if(step.target==='mass'){
  if(step.name==='Reserva y estabilidad')return [
   point('synthesis-arrival','Sitio de llegada','B⁺ · 3.788 %','',64.3988,-32.1994,'cyan')
  ];
  const tx=MARS.tankX+CM[0], ty=MARS.tankY;
  if(t<.28)return [
   {id:'mass-density',title:'Densidad variable',value:'M = ∭E δ dV',detail:'Las muestras son esquemáticas; la masa procede de integrar todo E.',anchor:[tx+8,tankFloor+5,ty],tone:'cyan'}
  ];
  if(t<.52) return [
   {id:'mass-arms',title:'Brazos de momento',value:'u, v, w desde planos coord.',detail:'M_yz=∭uδdV; M_xz=∭vδdV=0 (simetría); M_xy=∭wδdV.',anchor:[tx+22,tankFloor+6,ty-12],tone:'amber'},
   {id:'mass-sym',title:'Simetría en v',value:'v̄ = 0 (componente nula)',detail:'Depósito simétrico respecto al plano v=0.',anchor:[tx,tankFloor+1,ty+14],tone:'cyan'}
  ];
  return t<.84?[
   {id:'mass-cm',title:'Centro calculado',value:`(${CM[0].toFixed(3)}, 0, ${CM[2].toFixed(3)}) m`,detail:'Cada coordenada es su primer momento dividido entre la masa total.',anchor:[tx,tankFloor+CM[2],ty],tone:'coral'}
  ]:[
   {id:'mass-cm',title:'Centro calculado',value:`(${CM[0].toFixed(3)}, 0, ${CM[2].toFixed(3)}) m`,detail:'Altura: 37.14 % del depósito.',anchor:[tx,tankFloor+CM[2],ty],tone:'coral'},
   {id:'mass-basecheck',title:'Proyección en la base',value:'(ū/18)² + (v̄/14)² < 1',detail:'Inclusión geométrica; faltan cargas, suelo y apoyos reales.',anchor:[tx+18,tankFloor+0.5,ty],tone:'amber'}
  ];
 }
 // ---- Escena 19 · Ingeniería / Síntesis ----
 if(step.target==='base'){
  return [point('base-choice','B⁺ · sitio candidato',`${height(64.3988,-32.1994).toFixed(2)} m · pendiente 3.788%`,'Lagrange: min ‖∇f‖² en x²+y²=72². El núcleo físico está en otro punto.',64.3988,-32.1994,'green')];
 }
 if(step.target==='runoff'){
  return [point('runoff-flow','Máximo descenso · −∇f','Integración pasos Δs=2.4 m','Cauces idealizados: p_{k+1}=p_k−Δs·∇f/‖∇f‖. NO es agua líquida marciana.',15,30,'cyan')];
 }
 if(step.target==='all'){
  return [
   {...point('synth-b','B⁺ · mínimo restringido','pendiente 3.788%','Sitio candidato de Lagrange; no coincide con el núcleo modelado.',64.3988,-32.1994,'green'),dock:'left-column'},
   {...point('synth-R','Región R solar','622.035 / 623.365 m²','Área proyectada y real. Jacobiano r.',66,-18,'amber'),dock:'left-column'}
  ];
 }
 if(step.name==='Volumen paso a paso'){
  const factors=[['ρ · radio','∫₀¹ ρ² dρ = 1/3','Primero se integra la dimensión radial.'],['φ · inclinación','∫₀π/2 sen φ dφ = 1','Después se completa la mitad superior.'],['θ · giro','∫₀²π dθ = 2π','Por último se gira una vuelta completa.']] as const;
  const index=t<1/3?0:t<2/3?1:2,[title,value,detail]=factors[index];
  return [{id:`volume-${index}`,title,value,detail,anchor:[MARS.tankX+4,tankFloor+Math.max(2,8*t)+4,MARS.tankY],tone:index===2?'green':'cyan'},...(t>=.99?[{id:'volume-result',title:'Capacidad geométrica',value:`${VOLUME.toFixed(3).replace(/^(\d)(\d{3}\.)/,'$1 $2')} m³`,detail:'Resultado exacto: 1344π m³.',anchor:[MARS.tankX-9,tankFloor+5,MARS.tankY] as [number,number,number],tone:'amber' as const}]:[])];
 }
 return [];
}

/** The headline evidence follows the construction; the complete proof remains in the procedure. */
export function sceneProgressResult(step:EvaStep,progress:number):string|undefined{
 const t=Math.max(0,Math.min(1,progress));
 if(step.name==='Plano general'||step.target==='architecture')return 'EVA03 · cinco funciones integradas en un terreno';
 // These synthesis steps share visual targets with earlier demonstrations,
 // but their evidence must describe the decision actually being presented.
 if(step.name==='Masa paso a paso')return `M=(920−20.7)V=899.3V≈${MASS.toFixed(3)} kg · término impar en u = 0`;
 if(step.name==='Reserva y estabilidad')return `V=${VOLUME.toFixed(3)} m³ · M≈${(MASS/1e6).toFixed(3)} × 10⁶ kg · CM vertical=${CM[2].toFixed(3)} m (37.14 % de h)`;
 if(step.name==='Superficie de R')return 'R: área real 623.365 m² − proyectada 622.035 m² = 1.330 m² (0.214 %); no equivale a energía producida';
 if(step.name==='Limitaciones')return 'Condiciones: terreno sintético y cargas ideales · aplicación constructiva sujeta a geotecnia, cargas y cimentación';
 if(step.name==='Comprobación tecnológica')return 'Malla z=f(x,y) · ruta con z=f(r(t)) · valores contrastados analíticamente';
 // --- Fase I ---
 if(step.target==='axes')return 'Ejes cartesianos · 1 unidad = 1 m · Origen = centro del cráter';
 if(step.target==='terrain')return 'f ∈ C^∞ en R² · depresión anular + pendiente suave';
 if(step.target==='domain')return 'Dom(f)=R² · D: x²+y²≤110² · A = 38 013.27 m² (disco físico)';
 // --- Fase II ---
 if(step.target==='gradientP'){
  const [fx,fy]=grad(40,-20),norm=Math.hypot(fx,fy);
  return t<.5?`Corte y=−20 m · fₓ(P) = ${fx.toFixed(6)} m/m`:t<.9?`fₓ(P)=${fx.toFixed(6)} · fᵧ(P)=${fy.toFixed(6)} m/m`:`∇f(P)=(${fx.toFixed(6)},${fy.toFixed(6)}) · ‖∇f‖=${(norm*100).toFixed(3)} cm/m`;
 }
 if(step.target==='gradientQ'){
  const [fx,fy]=grad(-50,35),norm=Math.hypot(fx,fy);
  return t<.5?`Q=(−50,35) · f(Q) = ${height(-50,35).toFixed(3)} m`:`∇f(Q)=(${fx.toFixed(6)},${fy.toFixed(6)}) · ‖∇f‖=${(norm*100).toFixed(3)} cm/m`;
 }
 if(step.name==='Derivadas parciales'){
  const [fx,fy]=grad(40,-20);
  return t<.4?`Corte y = −20 m · fₓ(P) = ${fx.toFixed(6)} m/m`:t<.8?`fₓ(P) = ${fx.toFixed(6)} · fᵧ(P) = ${fy.toFixed(6)} m/m`:`∇f(P) = (${fx.toFixed(6)}, ${fy.toFixed(6)}) m/m`;
 }
 if(step.target==='directionalRose'){
  if(t<.8)return `${Math.max(1,Math.round(96*t/.8))} de 96 rumbos evaluados`;
  const norm=Math.hypot(...grad(40,-20));
  return `máximo ascenso +${(norm*100).toFixed(3)} cm/m · máximo descenso −${(norm*100).toFixed(3)} cm/m`;
 }
 if(step.target==='directional'||step.target==='directionalQ'){
  const sample=step.target==='directionalQ'?directionalAtQ(t):directionalAtP(t);
  if(t<.1)return `Dᵤf = ${(sample.derivative*100).toFixed(3)} cm/m · pendiente local`;
  return `Real ${sample.delta.toFixed(4)} m · lineal ${sample.linearDelta.toFixed(4)} m · error ${(Math.abs(sample.delta-sample.linearDelta)*100).toFixed(2)} cm`;
 }
 if(step.name==='Regla de la cadena'){
  const sample=chainAt(t);
  const atStart=sample.fraction===0, atEnd=sample.fraction===1;
  const level=Math.abs(sample.derivative)<1e-8;
  const phase=atStart?'extremo superior':atEnd?'extremo inferior':level?'nivel instantáneo':sample.derivative<0?'descenso':'ascenso';
  return `fₓx′=${sample.xTerm.toFixed(3)} + fᵧy′=${sample.yTerm.toFixed(3)} = z′ ${level?'0.000':sample.derivative.toFixed(3)} m/rad · ${phase} · t=${sample.t.toFixed(3)} rad`;
 }
 if(step.target==='contours'){
  const cut=LEVELS[0]+(LEVELS[LEVELS.length-1]-LEVELS[0])*t;
  return `${Math.max(1,LEVELS.filter(level=>level<=cut+1e-6).length)} de ${LEVELS.length} curvas · plano z = ${cut.toFixed(2)} m`;
 }
 if(step.target==='traces'){
  const second=t>=.5,coordinate=-110+440*(second?t-.5:t);
  return `${second?'T₂: y=0':'T₁: x=0'} · cota ${height(second?coordinate:0,second?0:coordinate).toFixed(2)} m`;
 }
 if(step.target==='evaluations'){
  const sites=[['A',0,0],['P',40,-20],['B⁺',64.3988,-32.1994]] as const;
  return sites.slice(0,t<1/3?1:t<2/3?2:3).map(([name,x,y])=>`${name} = ${height(x,y).toFixed(2)} m`).join(' · ');
 }
 if(step.target==='terrainInterpretation')return t<1/3?'Cima local · revisar explanación':t<2/3?'Cima y depresión · revisar drenaje':'Tres zonas interpretadas · plataforma B⁺';
 if(step.target==='linear'){
  const sample=linearizationAt(t);
  if(t<.25)return `Plano en P · f(P) = ${sample.exact.toFixed(5)} m`;
  if(t<.75)return `f = ${sample.exact.toFixed(5)} m · L = ${sample.linear.toFixed(5)} m`;
  return `Error = ${Math.abs(sample.error).toFixed(6)} m = ${(Math.abs(sample.error)*100).toFixed(2)} cm = ${sample.relative.toFixed(3)} %`;
 }
 if(step.name==='Segundas derivadas'){
  const x=28+24*t,[fxx]=hessian(x,-20),[reference]=hessian(40,-20);
  return `x = ${x.toFixed(1)} m · fₓₓ = ${fxx.toFixed(6)} m⁻¹ · en P: ${reference.toFixed(6)} m⁻¹`;
 }
 if(step.name==='Plano tangente'){
  const size=1.2+5.8*t,x=40+size,y=-20+size,error=Math.abs(tangentAt(x,y)-height(x,y));
  return `L(P) = f(P) = ${height(40,-20).toFixed(5)} m · |L−f| en esquina = ${(error*100).toFixed(2)} cm`;
 }
 if(step.target==='normal'){
  const [fx,fy]=grad(40,-20),norm=Math.hypot(fx,fy,1);
  return t<.5?`n = (${(-fx).toFixed(6)}, ${(-fy).toFixed(6)}, 1)`:`n̂ = (${(-fx/norm).toFixed(4)}, ${(-fy/norm).toFixed(4)}, ${(1/norm).toFixed(4)})`;
 }
 if(step.target==='criticals')return `${t<1/3?'1':t<2/3?'2':'3'} de 3 puntos críticos clasificados`;
 if(step.target==='criticalOther')return t<.5?'Máximo local · D > 0, fₓₓ < 0':'Punto de silla · D < 0';
 if(step.target==='safe')return 'Minimizar F = ‖∇f‖² sobre x² + y² = 72²';
 if(step.target==='candidates'){
  const sample=lagrangeAt(t);
  return sample.stage==='sweep'?`Barrido de la circunferencia · F=${sample.objective.toFixed(6)}`:sample.stage==='maximum'?'B⁻=6.472% · descartado':'B⁺=3.788% · mínimo sobre la circunferencia';
 }
 // --- Fase IV ---
 if(step.target==='route')return `s = ${routeDistanceAt(t).toFixed(2)} / ${ROUTE_LENGTH.toFixed(2)} m · longitud espacial acumulada`;
 if(step.target==='vectors'){
  const angle=START+Math.PI*t;
  return `‖r′‖=${Math.hypot(...velocityAt(angle)).toFixed(3)} m/rad · ‖r″‖=${Math.hypot(...accelerationAt(angle)).toFixed(3)} m/rad²`;
 }
 if(step.target==='tangentVector'){
  const v=velocityAt(START+Math.PI*t),norm=Math.hypot(...v);
  return `T(t)=(${[v[0],v[2],v[1]].map(value=>(value/norm).toFixed(3)).join(', ')}) · norma 1`;
 }
 if(step.target==='curvature'){
  const {curvature}=safeRoverSpeed(START+Math.PI*t);
  return `κ(t)=${curvature.toFixed(6)} m⁻¹ · R(t)=${(1/curvature).toFixed(2)} m`;
 }
 if(step.target==='safeSpeed'){
  const {curvature,speed,lateralAcceleration}=safeRoverSpeed(START+Math.PI*t);
  return `κ=${curvature.toFixed(6)} m⁻¹ · vₘₐₓ=${speed.toFixed(2)} m/s con a_lat=${lateralAcceleration.toFixed(2)} m/s² supuesta`;
 }
 if(step.target==='routeMarkers')return t<.34?'Inicio · EVA03 (B⁺)':t<.67?'Inicio + punto medio (control)':'Tres hitos · Inicio / Control / Final';
 // --- Fase V ---
 if(step.target==='solarRegion'){
  if(step.name==='Región, límites y orden')return `R: 60≤r≤72 m · −π/4≤θ≤0 · área barrida ${(REGION_AREA*t).toFixed(2)} / ${REGION_AREA.toFixed(2)} m²`;
  if(step.name==='Valor medio')return `f̄=V/A=${REGION_VOLUME.toFixed(3)} m³ / ${REGION_AREA.toFixed(3)} m² = ${(REGION_VOLUME/REGION_AREA).toFixed(3)} m`;
  return 'Área real 623.365 m² · proyectada 622.035 m² · exceso 1.330 m² (0.214 %)';
 }
 if(step.target==='doubleVolume')return `V acumulado = ${regionVolumeAt(t).toFixed(2)} / ${REGION_VOLUME.toFixed(2)} m³ · respecto z=0; no es excavación`;
 if(step.target==='surfaceArea')return 'Área proyectada 622.035 m² · real 623.365 m² · exceso +0.214%';
 if(step.target==='polarGrid')return '|J| = r · celda interior 32.463 m² · celda exterior 36.652 m² · +12.903%';
 if(step.target==='solarPower')return 'Escenario: I₀=590 W/m², 20×6 m², η=24%, PR=0.86, ŝ·n̂ variable';
 // --- Fase VI ---
 if(step.target==='tank'&&step.name==='Sólido y límites')return `E: semiejes 18×14×8 m · w≥0 · corte w=${(8*t).toFixed(2)} m`;
 if(step.target==='tank'&&step.name==='Transformación y límites')return 'E parametrizado · 0≤ρ≤1, 0≤φ≤π/2, 0≤θ≤2π';
 if(step.target==='tank'&&step.name==='Cartesiano vs. elipsoidal')return 'Mismo sólido E · límites cartesianos anidados / elipsoidales constantes';
 if(step.target==='jacobian')return '|J| = 2016 ρ² sen φ · producto semiejes × esfera unitaria';
 if(step.target==='density')return 'δ ∈ [853.66, 956.80] kg/m³ (positiva) · M≈'+(MASS/1e6).toFixed(3)+' × 10⁶ kg';
 if(step.target==='mass'&&step.name==='Momentos')return `Mᵧ𝓏=${(MASS*CM[0]).toFixed(2)} kg·m · Mₓ𝓏=0 · Mₓᵧ=${(MASS*CM[2]).toFixed(2)} kg·m`;
 if(step.target==='mass')return t<.28?'M = ∭E δ dV ≈ 3 797 114.863 kg':t<.52?'Momentos respecto a tres planos · Mₓ𝓏 = 0':`CM=(${CM[0].toFixed(3)},0,${CM[2].toFixed(3)}) m · w̄/h=37.14%`;
 // --- Ingeniería / Síntesis ---
 if(step.target==='base')return 'B⁺: pendiente 3.788% < B⁻ 6.472% · mejora 41.46% (Lagrange x²+y²=72²)';
 if(step.target==='runoff')return 'Cauces por máximo descenso −∇f · modelo idealizado (no agua líquida marciana)';
 if(step.target==='all')return 'Síntesis: B⁺, ruta 226.2 m, R 622 m², V 4 222 m³, M 3.797 × 10⁶ kg · 1 sistema coherente';
 if(step.name==='Volumen paso a paso')return t<1/3?'Paso 1/3 · ∫₀¹ρ²dρ = 1/3':t<2/3?'Paso 2/3 · ∫₀π/2senφdφ = 1':t<.99?'Paso 3/3 · ∫₀²πdθ = 2π':`V = 1344π ≈ ${VOLUME.toFixed(3).replace(/^(\d)(\d{3}\.)/,'$1 $2')} m³`;
 return undefined;
}
