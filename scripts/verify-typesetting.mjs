import assert from 'node:assert/strict';
import katex from 'katex';
import {mathSolutions} from '../src/data/mathSolutions.ts';
import {EVA_PHASES} from '../src/data/eva01Project.ts';
let equations=0;
for(const [name,solution] of Object.entries(mathSolutions)){
 assert(EVA_PHASES.some(p=>p.steps.some(s=>s.name===name)),`Unknown topic: ${name}`);
 for(const latex of [solution.formula,...solution.steps.map(s=>s.math).filter(Boolean)]){
  assert(!katex.renderToString(latex,{displayMode:true,throwOnError:true,strict:'ignore'}).includes('katex-error'),name);equations++;
 }
}
const missing=EVA_PHASES.flatMap(p=>p.steps).filter(s=>!mathSolutions[s.name]).map(s=>s.name);
assert.deepEqual(missing,['Lectura constructiva del relieve','Limitaciones','Comprobación tecnológica']);
console.log(JSON.stringify({topics:Object.keys(mathSolutions).length,equations,narrativeTopics:missing,passed:true},null,2));
