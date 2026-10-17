import {useLayoutEffect,useMemo,useRef,useState} from 'react';
import katex from 'katex';
import type {EvaStep} from '../data/eva01Project';
import {mathSolutions} from '../data/mathSolutions';
import 'katex/dist/katex.min.css';

/** Scale a displayed equation only when its natural width exceeds the panel.
 * A readable minimum remains available through horizontal scrolling. */
export function DisplayMath({latex}:{latex:string}){
 const frame=useRef<HTMLDivElement>(null),inner=useRef<HTMLDivElement>(null);
 const [size,setSize]=useState({scale:1,height:0,width:0});
 const html=useMemo(()=>katex.renderToString(latex,{displayMode:true,throwOnError:true,strict:'ignore',output:'htmlAndMathml'}),[latex]);
 useLayoutEffect(()=>{
  function measure(){if(!frame.current||!inner.current)return;const w=inner.current.scrollWidth,h=inner.current.scrollHeight;const scale=Math.min(1,Math.max(.78,(frame.current.clientWidth-4)/w));setSize({scale,height:h*scale,width:w*scale});}
  const observer=new ResizeObserver(measure);if(frame.current)observer.observe(frame.current);measure();document.fonts.ready.then(measure);return()=>observer.disconnect();
 },[latex]);
 return <div ref={frame} className="display-math" tabIndex={0} role="group" aria-label="Ecuación matemática"><div className="math-footprint" style={{height:size.height||undefined,minWidth:size.width||undefined}}><div ref={inner} className="math-typeset" style={{transform:`scale(${size.scale})`}} dangerouslySetInnerHTML={{__html:html}}/></div></div>;
}

export function MainEquation({step}:{step:EvaStep}){
 const solution=mathSolutions[step.name];
 return solution?<div className="equation-feature"><span>PLANTEAMIENTO</span><DisplayMath latex={solution.formula}/></div>:<p className="concept-statement">{step.eq}</p>;
}

export function MathProcedure({step,paged=false}:{step:EvaStep;paged?:boolean}){
 const solution=mathSolutions[step.name];
 const lines=solution?.steps??step.working.map(text=>({title:'Explicación',explanation:text,math:undefined}));
 const [page,setPage]=useState(0);
 const current=Math.min(page,Math.max(0,lines.length-1));
 const visible=paged?lines.slice(current,current+1):lines;
 return <section className={`math-procedure ${paged?'paged-procedure':''}`} aria-label={`Solución paso a paso: ${step.name}`}><header><h4>Solución paso a paso</h4>{solution?.reference&&<span>Anexo {solution.reference}</span>}</header>{paged&&<div className="procedure-navigation"><button disabled={current===0} onClick={()=>setPage(current-1)}>Anterior</button><span>Paso {current+1} de {lines.length}</span><button disabled={current===lines.length-1} onClick={()=>setPage(current+1)}>Siguiente paso</button></div>}<ol>{visible.map((line,i)=><li key={`${step.name}-${paged?current:i}`}><div className="procedure-title"><span className="procedure-number">{String((paged?current:i)+1).padStart(2,'0')}</span><h5>{line.title}</h5></div>{line.math&&<DisplayMath latex={line.math}/>}<p>{line.explanation}</p></li>)}</ol><div className="procedure-conclusion"><span>CONCLUSIÓN DEL CASO</span><p>{step.result}</p></div></section>;
}
