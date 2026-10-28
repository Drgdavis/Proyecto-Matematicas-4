import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gradientFrameAt, localLevelTrace, chainAt, lagrangeAt, directionalAtP, height, grad, START, velocityAt, ROUTE_LENGTH, routeDistanceAt } from '../src/data/marsMath.ts';
import { PRESENTATION_SECTIONS } from '../src/data/presentationSlides.ts';
import { EVA_PHASES } from '../src/data/eva01Project.ts';
import { sceneCallouts, sceneProgressResult } from '../src/data/sceneCallouts.ts';
import { dustState, iceCriteria, iceScores, oxygenState, shieldState, roverEnergyState, RESEARCH_SCENARIOS } from '../src/data/researchScenarios.ts';

for (const [x,y] of [[40,-20],[-50,35]]) {
 const frame=gradientFrameAt(x,y),dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
 for(const direction of [frame.ascent,frame.descent,frame.level])assert.ok(Math.abs(Math.hypot(...direction)-1)<1e-14);
 assert.ok(Math.abs(dot(frame.g,frame.level))<1e-14,'The level direction must be perpendicular to the gradient.');
 const eps=1e-3;
 for(const [direction,expected] of [[frame.ascent,frame.norm],[frame.descent,-frame.norm],[frame.level,0]]) {
  const numerical=(height(x+eps*direction[0],y+eps*direction[1])-height(x-eps*direction[0],y-eps*direction[1]))/(2*eps);
  assert.ok(Math.abs(numerical-expected)<2e-10,'Directional readings must match finite differences of the actual terrain.');
 }
 const trace=localLevelTrace(x,y);
 assert.ok(Math.max(...trace.map(p=>Math.abs(height(p.x,p.y)-height(x,y))))<2e-12,'The complete cyan curve must have the same elevation.');
 const before=trace[39],after=trace[41],tangent=[after.x-before.x,after.y-before.y];
 assert.ok(Math.abs(dot(tangent,frame.g))<1e-7,'The drawn contour must have the indicated tangent at its center.');
}

for(let i=0;i<=40;i++) {
 const p=i/40,sample=chainAt(p),eps=1e-5;
 const numerical=(chainAt(p+eps/Math.PI).height-chainAt(p-eps/Math.PI).height)/(2*eps);
 if(i>0&&i<40){assert.ok(sample.derivative<0,'The interior of this route descends.');assert.ok(Math.abs(numerical-sample.derivative)<1e-8);}
 else assert.ok(Math.abs(sample.derivative)<1e-14,'Both endpoint derivatives are zero.');
 assert.ok(Math.abs(sample.derivative-(-.864*Math.sin(sample.t)-.432*Math.cos(sample.t)))<1e-14);
}
const n=1000,dt=Math.PI/n;
let integral=0;
for(let i=0;i<=n;i++)integral+=(i===0||i===n?1:i%2?4:2)*chainAt(i/n).derivative;
assert.ok(Math.abs(integral*dt/3-(chainAt(1).height-chainAt(0).height))<2e-12,'The profile and chain rule must agree on total elevation loss.');
assert.ok(Math.abs(chainAt(.5).t-(START+Math.PI/2))<1e-14);

// The visible route readings must follow the spatial integral and keep their SI units.
const midpoint=routeDistanceAt(.5),speed=(angle)=>Math.hypot(...velocityAt(angle));
const slices=4096,h=Math.PI*.5/slices;
let independentMidpoint=speed(START)+speed(START+Math.PI*.5);
for(let i=1;i<slices;i++)independentMidpoint+=(i%2?4:2)*speed(START+i*h);
independentMidpoint*=h/3;
assert.ok(Math.abs(midpoint-independentMidpoint)<1e-4,'The displayed travelled distance must integrate the 3D route.');
assert.ok(Math.abs(ROUTE_LENGTH-226.20485)<1e-3);

const minimum=lagrangeAt(1),maximum=lagrangeAt(.7);
const pDirection=directionalAtP(1);
assert.ok(Math.abs(Math.hypot(pDirection.ux,pDirection.uy)-1)<1e-14);
assert.ok(Math.abs(pDirection.derivative+.018225)<1e-14,'The fixed official direction in P must descend by 1.8225 cm/m.');
assert.ok(Math.abs(pDirection.delta-(height(47.2,-10.4)-height(40,-20)))<1e-14,'The 12 m profile must end at the real terrain height.');
assert.ok(Math.abs(pDirection.delta-pDirection.linearDelta)>.01,'Local derivative and finite elevation change must remain distinct.');
for(const candidate of [minimum,maximum]) {
 assert.ok(Math.abs(candidate.x**2+candidate.y**2-72**2)<2e-12,'Candidates must lie on the actual constraint.');
 assert.ok(candidate.residual<1e-17,'The displayed Lagrange equality must hold at each candidate.');
}
for(let i=0;i<=720;i++) {
 const angle=i/720*2*Math.PI,g=grad(72*Math.cos(angle),72*Math.sin(angle)),objective=g[0]**2+g[1]**2;
 assert.ok(objective>=minimum.objective-1e-14&&objective<=maximum.objective+1e-14,'The color legend must bound F over the complete circle.');
 const moving=lagrangeAt(.6*i/721);
 assert.ok(Math.abs(Math.hypot(moving.x,moving.y)-72)<2e-14,'The whole animated search must stay on the circle.');
}
assert.equal(lagrangeAt(.65).stage,'maximum');
assert.equal(lagrangeAt(.85).stage,'minimum');
assert.ok(lagrangeAt(.3).residual<1e-17&&lagrangeAt(.15).residual>1e-5,'The equality must distinguish stationary candidates from general points.');
for(const p of [0,.25,.5,.51,.75,1]) {
 const dust=dustState(p),oxygen=oxygenState(p),shield=shieldState(p),energy=roverEnergyState(p),sites=iceCriteria(.25+.4*p);
 assert.ok(Math.abs(dust.power-dust.irradiance*120*.24*.86/1000)<1e-14);
 assert.ok(Math.abs(oxygen.stock-(9+oxygen.production-2.52))<1e-14,'The reserve is the mass balance after exactly one sol.');
 if(oxygen.fillSols!==null)assert.ok(Math.abs(9+oxygen.net*oxygen.fillSols-18)<1e-14,'The fill time must start from the stated 9 kg reserve.');
 assert.ok(Math.abs(shield.transmission+shield.reduction-1)<1e-14);
 assert.ok(Math.abs(energy.energy-energy.rolling-energy.margin)<1e-14);
 assert.deepEqual(sites.map(site=>site.score),iceScores(.25+.4*p));
 for(const site of sites)assert.ok(Math.abs(site.score-((.25+.4*p)*site.H+(.5-.4*p)*site.P+.25*site.D))<1e-14);
 assert.ok(RESEARCH_SCENARIOS[2].evaluate(p).detail.includes(oxygen.stock.toFixed(2)));
}
assert.equal(oxygenState(.51).net,0);
for(const p of [.50999999,.51,.51000001])assert.equal(oxygenState(p).net,0,'The displayed 2.52 kg/sol production must be genuine equilibrium.');

// Verify that every selectable demonstration resolves in its slide's section.
const source=readFileSync(new URL('../src/Expedition.tsx',import.meta.url),'utf8');
const route=Function(`return (${source.match(/const TV_ROUTE=([\s\S]*?) as const;/)[1]});`)();
const demos=Function(`return (${source.match(/const TV_DEMONSTRATIONS:[^=]+=([\s\S]*?);\s*const TV_TITLES/)[1]});`)();
const featured=Function(`return (${source.match(/const FEATURED_DEMOS:[^=]+=([^;]+);/)[1]});`)();
const project=readFileSync(new URL('../src/data/eva01Project.ts',import.meta.url),'utf8');
const stepNames=new Set([...project.matchAll(/name:'([^']+)'/g)].map(match=>match[1]));
assert.equal(route.length,22,'The final presentation must retain exactly twenty-two scenes.');
assert.equal(featured.length,route.length,'Every scene needs an explicit mathematical emphasis.');
assert.match(source,/new URLSearchParams\(window\.location\.search\)\.get\('ruta'\)!=='detalle'/,'The default must advance through all twenty-two scenes.');
assert.match(source,/Presentación · 22 escenas/,'The main UI must identify its twenty-two-scene presentation.');
for(const [index,selected] of featured.entries()){
 const count=(demos[index]??[{name:route[index].step}]).length;
 assert.ok(selected.length>=1&&selected.length<=3,`Scene ${index+1} needs one to three highlighted demonstrations.`);
 assert.ok(selected.includes(0),`Scene ${index+1} must highlight its opening demonstration.`);
 assert.ok(selected.every(topic=>Number.isInteger(topic)&&topic>=0&&topic<count),`Scene ${index+1} highlights an unavailable topic.`);
 assert.equal(new Set(selected).size,selected.length,`Scene ${index+1} repeats a highlighted topic.`);
}
assert.deepEqual(featured[8],[0,1,2],'The free critical points and Hessian classification must receive emphasis.');
assert.deepEqual(featured[9],[0,1],'The constrained objective and Lagrange solution must receive emphasis.');
assert.deepEqual(featured[15],[0,1],'Both polar change and real surface area must receive emphasis.');
assert.deepEqual(featured[20],[0,1],'Both centre of mass and moments must receive emphasis.');
const reached=new Set();
let topicCount=0;
for(const [index,slide] of route.entries())for(const demo of demos[index]??[{name:slide.step}]) {
 assert.ok(stepNames.has(demo.name),`${demo.name} must exist in the mathematical project.`);
 assert.ok(PRESENTATION_SECTIONS[slide.section].stepNames.includes(demo.name),`${demo.name} must resolve in slide ${index+1}.`);
 topicCount++;
 reached.add(demo.name);
}
assert.equal(topicCount,reached.size,'Each topic must occur in exactly one scene.');
assert.deepEqual([...reached].sort(),[...stepNames].sort(),'Every mathematical topic must be reachable in the twenty-two-scene presentation.');
const highlighted = new Set(route.flatMap((slide,index)=>featured[index].map(topic=>(demos[index]??[{name:slide.step}])[topic].name)));
for(const required of ['Sistema cartesiano y escala','Tres evaluaciones','Dos trazas verticales','Segundas derivadas','Plano tangente','Vector normal','Gradiente en P','Gradiente en Q','Derivada direccional','Direccional en Q','Sistema crítico','Máximo y silla','Lagrange y comparación','Objetivo y restricción','Curva e intervalo','Velocidad y aceleración','Tangente unitario','Inicio, control y final','Valor medio','Área real','Cambio polar y jacobiano','Cartesiano vs. elipsoidal','Volumen paso a paso','Densidad positiva','Momentos'])assert.ok(highlighted.has(required),`${required} is required by the PDF and should not be buried in extra evidence.`);
const stepByName = name => EVA_PHASES.flatMap(phase => phase.steps).find(step => step.name === name);
const routeMilestones=stepByName('Inicio, control y final');
assert.match(routeMilestones.eq, /t\*=π\/2−atan\(1\/2\)/, 'El hito central debe usar el punto crítico de descenso.');
assert.doesNotMatch(routeMilestones.eq, /r\(π\/2\)/, 'El hito central no es r(π/2).');
const criticalMarker=sceneCallouts(routeMilestones,.5).find(item=>item.id==='marker-mid');
assert.ok(criticalMarker&&Math.abs(criticalMarker.anchor[0]-72*Math.cos(START+Math.PI/2))<1e-10&&Math.abs(criticalMarker.anchor[2]-72*Math.sin(START+Math.PI/2))<1e-10,'El punto de control visible debe coincidir con C*.');
assert.match(criticalMarker.detail,/z′ es mínimo/,'El punto intermedio es crítico para el descenso longitudinal.');
assert.doesNotMatch(criticalMarker.detail,/κ máxima/,'C* no representa curvatura máxima.');
assert.match(sceneProgressResult(stepByName('Sólido y límites'), 1), /semiejes.*corte w=8\.00 m/, 'El cierre de la escena 14 debe seguir describiendo su sólido y sección.');
assert.match(sceneProgressResult(stepByName('Cartesiano vs. elipsoidal'), 1), /Mismo sólido E.*anidados.*constantes/, 'La comparación debe distinguir límites de un mismo sólido.');
assert.match(sceneProgressResult(stepByName('Momentos'), 1), /Mᵧ𝓏=.*Mₓ𝓏=0.*Mₓᵧ=/, 'La evidencia de momentos debe mostrar los tres primeros momentos, no solo el centro.');
assert.match(sceneProgressResult(stepByName('Masa paso a paso'), 1), /M=\(920−20\.7\)V=.*kg.*término impar/, 'La masa debe mostrar su propia integral y la cancelación por simetría.');
assert.match(sceneProgressResult(stepByName('Reserva y estabilidad'), 1), /V=.*m³.*M≈.*kg.*CM vertical=/, 'La síntesis del depósito debe mostrar volumen, masa y centro de masa.');
assert.match(sceneProgressResult(stepByName('Superficie de R'), 1), /área real.*proyectada.*no equivale a energía/, 'El área de R no debe confundirse con producción energética.');
assert.match(sceneProgressResult(stepByName('Limitaciones'), 1), /terreno sintético.*cargas ideales.*geotecnia.*cimentación/, 'El cierre debe declarar el alcance real del modelo.');
assert.match(sceneProgressResult(stepByName('Comprobación tecnológica'), 1), /Malla z=f\(x,y\).*contrastados analíticamente/, 'La comprobación debe señalar la concordancia de malla, ruta y cálculo.');
console.log(`Verified: key PDF requirements highlighted, P/Q directions, Lagrange, and all ${reached.size} topics within twenty-two scenes.`);
