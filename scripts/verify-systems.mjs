import assert from 'node:assert/strict';
import * as T from 'three';
import { START, height, landscape, WATER_PLANT, SOLAR_ARRAY_LAYOUT, SOLAR_SUPPORT_LAYOUT, waterPipeAt } from '../src/data/marsMath.ts';
import { GREENHOUSE, GREENHOUSE_BEDS, GREENHOUSE_WATER_SERVICE, GREENHOUSE_WATER_DISTRIBUTION, GREENHOUSE_WATER_PORTS, HABITAT, HABITAT_ACCESS_PATH, LAB_ACCESS, HABITAT_RING_ACCESS, segmentDistance } from '../src/data/marsHabitat.ts';
import { SOLAR_POWER_SERVICE, buriedServicePoints } from '../src/data/campusUtilities.ts';
import { SERVICE_SCENARIO, evaluateServiceBalance, solarEnergyKwh } from '../src/data/campusServiceBalance.ts';
import { descentPath, directionalRose, routeCurvature, safeRoverSpeed, solarState } from '../src/data/marsSystems.ts';
import { ICE_SITES, iceScores, RESEARCH_SCENARIOS } from '../src/data/researchScenarios.ts';
import { grad } from '../src/data/marsMath.ts';

const noon=solarState(.5), midnight=solarState(0);
const irrigation=GREENHOUSE_WATER_SERVICE,greenhouse=GREENHOUSE;
assert.deepEqual(irrigation.source,{x:WATER_PLANT.x,z:WATER_PLANT.z},'El ramal de riego debe salir de la planta de tratamiento.');
assert.ok(irrigation.inlet.x<greenhouse.x+9&&irrigation.inlet.x>greenhouse.x+8.4,'El registro interior debe quedar dentro del testero este.');
assert.equal(irrigation.inlet.z,greenhouse.z,'El ramal no debe atravesar las bancadas laterales.');
assert.ok(Math.hypot(irrigation.cleanout.x-greenhouse.x,irrigation.cleanout.z-greenhouse.z)>greenhouse.foundationRadius+2.2+.5,'El registro de inspección debe quedar fuera del terraplén del invernadero.');
const irrigationSites=[irrigation.source,...irrigation.bends,irrigation.cleanout,irrigation.inlet];
const branchVertices=irrigationSites.slice(1).flatMap((end,i)=>Array.from({length:13},(_,j)=>{const start=irrigationSites[i],t=j/12,x=start.x+(end.x-start.x)*t,z=start.z+(end.z-start.z)*t;return new T.Vector3(x,landscape(x,z)-irrigation.depth,z);}));
const branchCurve=new T.CatmullRomCurve3(branchVertices,false,'centripetal');let branchMinCover=Infinity;
for(let sample=0;sample<=500;sample++){
 const p=branchCurve.getPoint(sample/500),cover=landscape(p.x,p.z)-p.y-irrigation.radius;
 assert.ok(Math.hypot(p.x,p.z)<110,'El ramal de servicio sale del dominio físico D.');
 branchMinCover=Math.min(branchMinCover,cover);
}
assert.ok(branchMinCover>=1,'El tubo interpolado aflora antes del registro.');
assert.ok(irrigation.inlet.x+.21<greenhouse.x+9,'El registro interior atraviesa el testero este.');
assert.ok(.58/2< GREENHOUSE_BEDS.centralAisleWidth/2,'El registro interior sale del ancho del pasillo central.');
assert.ok(Math.min(...GREENHOUSE_BEDS.rowOffsets.map(offset=>Math.abs(offset)))-GREENHOUSE_BEDS.width/2-.58/2>.5,'El registro interior invade una bandeja.');
const distribution=GREENHOUSE_WATER_DISTRIBUTION;
assert.equal(GREENHOUSE_WATER_PORTS.length,GREENHOUSE_BEDS.columns*GREENHOUSE_BEDS.rowOffsets.length,'No hay una entrega por cada bandeja.');
assert.equal(new Set(GREENHOUSE_WATER_PORTS.map(port=>`${port.x},${port.emitterZ}`)).size,GREENHOUSE_WATER_PORTS.length,'Dos tomas terminan en la misma posición.');
assert.equal(distribution.crossfeedX,irrigation.inlet.x,'La distribución interior no nace en el registro.');
assert.ok(distribution.headerStartX<=GREENHOUSE.x+GREENHOUSE_BEDS.firstXOffset-GREENHOUSE_BEDS.length/2,'Los colectores no llegan al extremo occidental de las bancadas.');
assert.ok(distribution.crossfeedX>GREENHOUSE_WATER_PORTS.at(-1).x+GREENHOUSE_BEDS.length/2,'El ramal cruza una bandeja en el testero este.');
for(const [row,rowOffset] of GREENHOUSE_BEDS.rowOffsets.entries()){
 const header=distribution.headerOffsets[row];
 assert.ok(Math.abs(header)>GREENHOUSE_BEDS.centralAisleWidth/2+distribution.headerRadius+.2,'Un colector invade el paso central.');
 assert.ok(Math.abs(header)<4.7,'Un colector sale de la envolvente del invernadero.');
 assert.ok(Math.abs(header-rowOffset)>GREENHOUSE_BEDS.width/2+distribution.headerRadius,'Un colector atraviesa una bancada.');
 const ports=GREENHOUSE_WATER_PORTS.filter(port=>port.row===row);
 assert.equal(ports.length,GREENHOUSE_BEDS.columns,'Una fila no tiene ocho entregas.');
 for(const port of ports){
  const bedX=GREENHOUSE.x+GREENHOUSE_BEDS.firstXOffset+port.column*GREENHOUSE_BEDS.columnSpacing;
  assert.equal(port.x,bedX,'La entrega no coincide con su bandeja.');
  assert.equal(port.headerZ,GREENHOUSE.z+header,'La toma no nace de su colector.');
  assert.ok(Math.abs(port.emitterZ-(GREENHOUSE.z+rowOffset))<GREENHOUSE_BEDS.width/2-.1,'El gotero sale de la bandeja.');
  assert.ok(port.x-.32>GREENHOUSE.x-9&&port.x+.32<GREENHOUSE.x+9,'El gotero cruza un testero.');
 }
}
assert.deepEqual(noon.panelNormal,[0,1,0],'La normal de captación debe coincidir con las celdas horizontales del modelo 3D.');
assert.ok(Math.abs(noon.incidence-noon.direction[1])<1e-12,'La incidencia de los paneles horizontales debe ser el seno de la altura solar.');
assert.ok(noon.electricPower>10000,'La potencia solar de mediodía debe ser positiva y útil.');
assert.equal(midnight.electricPower,0,'La potencia solar nocturna debe ser cero.');
const service=evaluateServiceBalance();
const analyticSolarKwh=noon.electricPower/1000*SERVICE_SCENARIO.cycleHours/Math.PI*SOLAR_POWER_SERVICE.panels.length/20*SERVICE_SCENARIO.activeFraction*SERVICE_SCENARIO.transmission;
assert.ok(Math.abs(service.electricity.generatedKwh-analyticSolarKwh)<1e-8,'La integración solar debe coincidir con la integral analítica de coseno positivo en equinoccio.');
assert.deepEqual(new Set(service.electricity.electricDestinations),new Set([SOLAR_POWER_SERVICE.habitat.id,SOLAR_POWER_SERVICE.treatment.id]),'Solo las cargas conectadas físicamente pueden entrar al balance eléctrico.');
assert.equal(service.electricity.connectedDemandKwh,service.electricity.connectedDemandKw*SERVICE_SCENARIO.cycleHours,'Las unidades del balance eléctrico deben ser kWh.');
assert.ok(service.electricity.grossDifferenceKwh>0&&service.electricity.unservedKwh<1e-8&&service.electricity.minimumStoredKwh>0,'La ampliación debe cubrir las dos cargas y mantener reserva en un ciclo repetido.');
const oldArray=evaluateServiceBalance(SERVICE_SCENARIO.activeFraction,SERVICE_SCENARIO.transmission,20);
assert.ok(oldArray.electricity.unservedKwh>0,'La matriz original de 20 paneles no cubre las cargas bajo el mismo escenario.');
assert.ok(evaluateServiceBalance(.85,.6).electricity.unservedKwh>0,'La sensibilidad debe revelar insuficiencia al empeorar la transmitancia.');
assert.ok(Math.abs(solarEnergyKwh(.85,.7)-solarEnergyKwh(1,1)*.85*.7)<1e-8,'Fracción activa y polvo deben reducir la energía sin aumentar producción.');
assert.throws(()=>solarEnergyKwh(1.1),RangeError,'No se deben aceptar fracciones activas fuera de rango.');
assert.throws(()=>solarEnergyKwh(1,1,44,3),RangeError,'Simpson requiere subdivisiones pares.');
assert.equal(service.water.trayCount,GREENHOUSE_WATER_PORTS.length,'La demanda agrícola debe derivar de los goteros realmente conectados.');
assert.ok(Math.abs(service.water.requiredRawLitres*SERVICE_SCENARIO.treatmentYield-service.water.deliveredIrrigationLitres)<1e-10,'La planta debe conservar el balance de agua bruta y tratada.');
assert.ok(Math.abs(service.water.requiredRawLitres-service.water.deliveredIrrigationLitres-service.water.processLossLitres)<1e-10,'Las pérdidas de proceso deben explicar la diferencia de caudal.');
assert.ok(service.water.unusedTreatmentCapacityLitres>0&&service.water.rawCyclesAtAssumedInventory<Infinity,'La capacidad supuesta cubre solo el riego y el inventario sin reposición es finito.');
assert.ok(service.water.rawCapacityShortfallWithHabitatLitres>0&&service.water.unconnectedHabitatDemandLitres>0,'No debe confundirse el riego conectado con suministro suficiente al hábitat.');

// The electrical drawing has a traceable source and two physical endpoints.
// This tests topology and burial, not power adequacy, protection, or storage.
const power=SOLAR_POWER_SERVICE;
assert.equal(power.panels.length,SOLAR_ARRAY_LAYOUT.length+SOLAR_SUPPORT_LAYOUT.length,'Falta un origen eléctrico de algún panel.');
assert.equal(new Set(power.panels.map(panel=>panel.id)).size,44,'Los paneles eléctricos no tienen identificadores únicos.');
for(const [index,panel] of power.panels.entries()){
 const site=[...SOLAR_ARRAY_LAYOUT,...SOLAR_SUPPORT_LAYOUT][index];assert.equal(panel.x,site.x);
 assert.equal(panel.z,site.z);
}
assert.deepEqual(power.rowRoutes.map(row=>row.length-1),[6,7,7,8,8,8],'Los colectores de fila no siguen la distribución 6/7/7 + 8/8/8.');
const busSites=power.rowRoutes.flatMap(row=>row.slice(0,-1).map(point=>`${point.x},${point.z}`));
assert.equal(new Set(busSites).size,44,'Una conexión de panel está duplicada en las filas.');
assert.deepEqual(new Set(busSites),new Set(power.panels.map(panel=>`${panel.x},${panel.z}`)),'No todos los paneles llegan a un colector.');
for(const row of power.rowRoutes)assert.deepEqual(row.at(-1),power.combiner,'Un colector de fila no termina en la caja común.');
assert.deepEqual(power.habitat.route[0],power.combiner,'La alimentación del hábitat no nace en el colector.');
assert.deepEqual(power.treatment.route[0],power.combiner,'La alimentación de tratamiento no nace en el colector.');
assert.deepEqual(power.storageRoute[0],power.combiner,'El almacenamiento no nace en el colector.');
assert.deepEqual(power.storageRoute.at(-1),power.energyStation,'El almacenamiento no termina en el gabinete de energía.');
assert.deepEqual(power.habitat.route.at(-1),power.habitat.port,'La línea no termina en el pasamuros del hábitat.');
assert.deepEqual(power.treatment.route.at(-1),power.treatment.terminal,'La línea no termina en la caja de tratamiento.');
assert.ok(Math.hypot(power.habitat.port.x-HABITAT.x,power.habitat.port.z-HABITAT.z)>10.25&&Math.hypot(power.habitat.port.x-HABITAT.x,power.habitat.port.z-HABITAT.z)<10.35,'El pasamuros eléctrico no coincide con la pared del hábitat.');
const powerPort=power.habitat.port;
const crewAngles=[-Math.PI/2,HABITAT_RING_ACCESS.angle,...LAB_ACCESS.map(lab=>lab.angle)];
assert.ok(crewAngles.every(angle=>Math.abs(Math.atan2(Math.sin(angle-powerPort.angle),Math.cos(angle-powerPort.angle)))>.35),'El pasamuros eléctrico ocupa una puerta peatonal.');
const serviceWalkwayGap=Math.min(...HABITAT_ACCESS_PATH.slice(1).map((end,index)=>{
 const start=HABITAT_ACCESS_PATH[index];return segmentDistance(powerPort.x,powerPort.z,start.x,start.z,end.x,end.z).distance;
}));
assert.ok(serviceWalkwayGap>2,'La terminal eléctrica invade el acceso B⁺–esclusa.');
assert.ok(Math.hypot(power.treatment.terminal.x-WATER_PLANT.x,power.treatment.terminal.z-WATER_PLANT.z)>WATER_PLANT.foundationRadius,'La caja eléctrica bloquea el centro del plinto de tratamiento.');
const collectorPanelGap=Math.min(...power.panels.map(panel=>Math.hypot(panel.x-power.combiner.x,panel.z-power.combiner.z)-1.835));
assert.ok(collectorPanelGap>2,'La caja colectora invade el campo solar.');
assert.ok(Math.hypot(power.combiner.x-power.bplus.x,power.combiner.z-power.bplus.y)>4,'La caja colectora bloquea la plataforma B⁺.');
const stationPanelGap=Math.min(...power.panels.map(panel=>Math.hypot(panel.x-power.energyStation.x,panel.z-power.energyStation.z)-1.835-.9));
assert.ok(stationPanelGap>2,'El gabinete de energía invade los paneles.');
assert.ok(Math.hypot(power.energyStation.x-power.bplus.x,power.energyStation.z-power.bplus.y)>4,'El gabinete de energía invade la llegada B⁺.');
let powerMinCover=Infinity,powerMinDomain=Infinity,powerLength=0;
for(const route of [...power.rowRoutes,power.storageRoute,power.habitat.route,power.treatment.route]){
 const points=buriedServicePoints(route,power.depth).map(([x,y,z])=>new T.Vector3(x,y,z));
 const curve=new T.CatmullRomCurve3(points,false,'centripetal');
 powerLength+=curve.getLength();
 for(let sample=0;sample<=Math.max(40,Math.ceil(curve.getLength()*3));sample++){
  const point=curve.getPoint(sample/Math.max(40,Math.ceil(curve.getLength()*3)));
  powerMinCover=Math.min(powerMinCover,landscape(point.x,point.z)-point.y-power.cableRadius);
  powerMinDomain=Math.min(powerMinDomain,110-Math.hypot(point.x,point.z));
 }
}
assert.ok(powerMinCover>.85,'Una conducción eléctrica aflora antes de su terminal.');
assert.ok(powerMinDomain>1,'Una conducción eléctrica sale del dominio físico.');
let waterFeedAirlockGap=Infinity,waterFeedGreenhouseGap=Infinity,waterFeedPipeGap=Infinity;
const waterFeed=buriedServicePoints(power.treatment.route,power.depth);
for(const [x,,z] of waterFeed){
 waterFeedAirlockGap=Math.min(waterFeedAirlockGap,Math.hypot(x-HABITAT.airlockX,z-HABITAT.airlockZ)-4.7);
 waterFeedGreenhouseGap=Math.min(waterFeedGreenhouseGap,Math.hypot(x-GREENHOUSE.x,z-GREENHOUSE.z)-GREENHOUSE.foundationRadius);
 for(let i=0;i<=100;i++){const [wx,,wz]=waterPipeAt(i/100);waterFeedPipeGap=Math.min(waterFeedPipeGap,Math.hypot(x-wx,z-wz));}
}
assert.ok(waterFeedAirlockGap>5,'La zanja eléctrica invade la cimentación de la esclusa del hábitat.');
assert.ok(waterFeedGreenhouseGap>5,'La zanja eléctrica invade la cimentación del invernadero.');
assert.ok(waterFeedPipeGap>1.5,'Las líneas de electricidad y agua comparten una zanja sin separación.');

for(const ratio of [0,.25,.5,.75,1]){
  const t=START+ratio*Math.PI,curvature=routeCurvature(t),safe=safeRoverSpeed(t);
  assert.ok(Number.isFinite(curvature)&&curvature>0,'La curvatura debe ser finita y positiva.');
  assert.ok(Math.abs(safe.speed**2*curvature-safe.lateralAcceleration)<1e-10,'v²κ debe coincidir con la aceleración lateral declarada.');
}
const referenceCurvature=routeCurvature(START+Math.PI/2);
assert.ok(Math.abs(referenceCurvature-.013886389338807903)<1e-12,'κ(t*) debe coincidir con la escena y el anexo.');
assert.ok(Math.abs(1/referenceCurvature-72.01296)<1e-8,'R(t*) debe coincidir con la escena y el anexo.');
assert.ok(Math.abs(routeCurvature(START)-referenceCurvature)>3e-6,'El inicio no debe confundirse con t*.');

const rose=directionalRose(40,-20,360),maximum=Math.max(...rose.map(sample=>sample.value));
assert.ok(maximum>0&&rose.some(sample=>sample.value<0),'La rosa direccional debe mostrar ascenso y descenso.');

for(const [x,z] of [[-15,-5],[12,42],[45,15],[-38,58],[82,8]]){
  const path=descentPath(x,z);
  assert.ok(path.length>2,'Cada cauce debe contener varios pasos.');
  for(let i=1;i<path.length;i++)assert.ok(path[i].y<=path[i-1].y+1e-9,'El descenso por −∇f no puede aumentar la cota.');
  assert.equal(path[0].y,height(x,z));
}

for(const weight of [.25,.45,.65]){
 const scores=iceScores(weight);
 ICE_SITES.forEach((site,index)=>{
  const slope=Math.hypot(...grad(site.x,site.y));
  const distance=Math.hypot(site.x-64.3988,site.y+32.1994);
  const expected=weight*site.H+(.75-weight)*Math.max(0,1-slope/.12)+.25*Math.max(0,1-distance/200);
  assert.ok(Math.abs(scores[index]-expected)<1e-12,'El índice de hielo debe usar la pendiente y la distancia del modelo.');
 });
}
assert.equal(iceScores(.25).indexOf(Math.max(...iceScores(.25))),1,'Con menor peso del recurso gana la ubicación de menor pendiente.');
assert.equal(iceScores(.65).indexOf(Math.max(...iceScores(.65))),0,'Con mayor peso del recurso gana C1.');
assert.match(RESEARCH_SCENARIOS[2].evaluate(.51).value,/Equilibrio/,'La producción igual al consumo no debe figurar como déficit.');
assert.equal(RESEARCH_SCENARIOS[2].unit,'kg/sol','La unidad del control debe coincidir con el balance de oxígeno.');
for(const parameter of [0,.25,.51,.75,1]){
 const tau=4*parameter;
 const dust=RESEARCH_SCENARIOS[0].evaluate(parameter);
 assert.ok(Math.abs(Number.parseFloat(dust.value)-590*Math.exp(-tau)*120*.24*.86/1000)<.005,'Potencia de tormenta y fórmula de la escena deben coincidir.');
 const prod=1.5+2*parameter,oxygen=RESEARCH_SCENARIOS[2].evaluate(parameter);
 assert.ok(Math.abs(Number.parseFloat(oxygen.metric)-prod)<.005,'La producción del control debe seguir el balance de O₂.');
 const shield=RESEARCH_SCENARIOS[3].evaluate(parameter),reduction=100*(1-Math.exp(-.42*5*parameter));
 assert.ok(Math.abs(Number.parseFloat(shield.metric)-reduction)<.051,'La reducción del blindaje debe seguir su ley exponencial.');
 const mass=320+300*parameter,rover=RESEARCH_SCENARIOS[4].evaluate(parameter);
 const expectedEnergy=mass*3.71*.04*226.205/3.6e6+mass*.19/1000;
 assert.ok(Math.abs(Number.parseFloat(rover.metric)-expectedEnergy)<.00051,'La energía del rover debe seguir la fórmula declarada.');
}

 console.log(JSON.stringify({noonElectricKw:noon.electricPower/1000,midnightElectricKw:midnight.electricPower/1000,roseMaximum:maximum,branchMinCover,serviceBalance:service,power:{panels:power.panels.length,loads:[power.habitat.id,power.treatment.id],buriedLength:powerLength,minCover:powerMinCover,minDomain:powerMinDomain,collectorPanelGap,serviceWalkwayGap,waterFeedAirlockGap,waterFeedGreenhouseGap,waterFeedPipeGap}},null,2));
