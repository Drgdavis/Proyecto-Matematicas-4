import {readFileSync} from 'node:fs';
import {EVA_PHASES} from '../src/data/eva01Project.ts';
import {mathSolutions} from '../src/data/mathSolutions.ts';
import {PRESENTATION_SECTIONS} from '../src/data/presentationSlides.ts';

// Read the actual navigation inventory without duplicating its order by hand.
const source=readFileSync('src/Expedition.tsx','utf8');
const routeLiteral=source.match(/const TV_ROUTE=(\[[\s\S]*?\]) as const;/)?.[1];
const demoLiteral=source.match(/const TV_DEMONSTRATIONS:[^=]+=(\{[\s\S]*?\n\});/)?.[1];
if(!routeLiteral||!demoLiteral)throw Error('No se encontró el inventario de navegación.');
const routes=Function(`return (${routeLiteral})`)(),demos=Function(`return (${demoLiteral})`)();
const steps=EVA_PHASES.flatMap(p=>p.steps);
const pdfByScene=['10','4.1–4.2','4.2','5.1','5.1–5.2','5.2','5.3','6.1–6.2','7','7','8.1–8.3','8.1','8.2–8.3','9.1','9.4','9.2','9.2','9.3','10'];
const inventory=routes.flatMap((route,i)=>(demos[i]??[{name:route.step}]).map((demo,j)=>{
 const step=steps.find(s=>s.name===demo.name),solution=mathSolutions[demo.name];
 if(!step)throw Error(`Tema sin datos: ${demo.name}`);
 return {scene:i+1,demo:j+1,topic:demo.name,pdfSection:pdfByScene[i],object:step.target,result:step.result,formula:solution?.formula??step.eq,procedureSteps:solution?.steps.length??0,reference:solution?.reference??null,interpretation:step.why,limit:PRESENTATION_SECTIONS[route.section].limit,visualStatus:'No evaluado por este script; requiere inspección WebGL',deliveryStatus:'Informe/anexo/plano aún sin cotejo final'};
}));
if(inventory.length!==53)throw Error(`Cambió el inventario: ${inventory.length}; revisar migración.`);
if(new Set(inventory.map(item=>item.topic)).size!==inventory.length)throw Error('El recorrido repite un tema y deja otro sin presentar.');
if(inventory.some(item=>!item.object||!item.formula||!item.result||!item.interpretation||!item.limit))throw Error('Hay temas sin objeto, fórmula, resultado, interpretación o límite.');
console.log(JSON.stringify({scenes:routes.length,topics:inventory.length,withoutExplicitProcedure:inventory.filter(r=>!r.procedureSteps).map(r=>r.topic),note:'La trazabilidad detallada se mantiene en public/materials/Auditoria_EVA03_Maestra.md; este verificador no crea reportes paralelos.'},null,2));
