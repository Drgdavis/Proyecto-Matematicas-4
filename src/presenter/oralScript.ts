export type OralScene={
 scene:number;speaker:string;opening:string;steps:string[];
 model:{topic:string;text:string;cue:string}[];
 defense:{question:string;answer:string};
};
const REVEALS=['Introducción','Fórmula','Paso 1','Paso 2','Paso 3','Resultado','Qué significa'];

// Only confirmed navigation changes the reading fragment; animation time does not.
export function readingFragment(scene:OralScene,source:'slide'|'model',index:number){
 if(source==='model'){
  const item=scene.model[Math.max(0,Math.min(scene.model.length-1,index))];
  return {label:item.topic,text:item.text,cue:item.cue};
 }
 const reveal=Math.max(0,Math.min(6,index));
 return {label:REVEALS[reveal],text:reveal===0?scene.opening:scene.steps[reveal-1],
  cue:reveal===0?'Al terminar, toca la presentación para revelar la fórmula.':reveal<6?'Al terminar, revela el siguiente elemento.':'Este bloque terminó. Sigue con la siguiente lámina o muestra el modelo según el recorrido del equipo.'};
}
