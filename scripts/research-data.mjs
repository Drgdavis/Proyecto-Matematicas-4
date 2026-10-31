import {RESEARCH_SCENARIOS,dustState,iceCriteria,oxygenState,shieldState,roverEnergyState} from '../src/data/researchScenarios.ts';
import {safeRoverSpeed} from '../src/data/marsSystems.ts';
import {START,ROUTE_LENGTH} from '../src/data/marsMath.ts';
const threshold=Math.log(dustState(0).power/12),sites=iceCriteria(.25),[a,b]=sites;
const crossover=(.75*(b.P-a.P)+.25*(b.D-a.D))/((a.H-a.P)-(b.H-b.P));
const data={
 sources:RESEARCH_SCENARIOS.map(s=>({id:s.id,name:s.step.name,...s.source})),
 dust:{threshold,rows:[0,.1,threshold,.5,1,2,4].map(tau=>({tau,...dustState(tau/4)}))},
 ice:{sites,weights:[.25,.45,.65].map(w=>({w,sites:iceCriteria(w)})),crossover},
 oxygen:{rows:[1.5,2.5,2.52,3.5].map(p=>oxygenState((p-1.5)/2)),depletion:9/1.02,fill:9/.98},
 shield:{rows:[0,1,2,3,5].map(x=>({x,...shieldState(x/5)})),half:Math.log(2)/.42,ninety:Math.log(10)/.42},
 rover:{rows:[320,470,620].map(m=>roverEnergyState((m-320)/300)),control:{t:START+Math.PI/2,...safeRoverSpeed(START+Math.PI/2)},routeLength:ROUTE_LENGTH},
};
console.log(JSON.stringify(data));
