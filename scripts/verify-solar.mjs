import assert from 'node:assert/strict';
import {logarithmicDistance,distanceToZoom,zoomToDistance,SOLAR_MAX_DISTANCE,SOLAR_GALAXY_DISTANCE} from '../src/utils/solarNavigation.ts';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(b)),`${a} != ${b}`);
// Un mismo porcentaje de recorrido conserva una razón de distancias entre escalas lejanas.
near(logarithmicDistance(10,1000,.5),100);near(logarithmicDistance(1000,10,.5),100);
near(logarithmicDistance(10,1000,0),10);near(logarithmicDistance(10,1000,1),1000);
near(logarithmicDistance(10,1000,-1),10);near(logarithmicDistance(10,1000,2),1000);
for(const minimum of [.05,1,6.136,20]){
 let previous=Infinity;
 for(let value=0;value<=100;value++){
  const distance=zoomToDistance(value,minimum);assert.ok(Number.isFinite(distance)&&distance>=minimum-1e-9&&distance<=SOLAR_MAX_DISTANCE+1e-9);
  assert.ok(distance<previous);previous=distance;near(distanceToZoom(distance,minimum),value);
 }
 near(zoomToDistance(100,minimum),minimum);near(zoomToDistance(0,minimum),SOLAR_MAX_DISTANCE);
}
assert.ok(SOLAR_GALAXY_DISTANCE>2800&&SOLAR_GALAXY_DISTANCE<SOLAR_MAX_DISTANCE);
console.log('PASS: navegación logarítmica continua, reversibilidad del zoom y límites de aproximación entre escalas.');
