import {useEffect,useRef,useState,type PointerEvent} from 'react';
import {INITIAL,PEOPLE,makeId,useSession,type Join} from './session';
import {useVideoReceiver} from './video';
import {PermissionControls} from './PermissionControls';
import {readingFragment,type OralScene} from './oralScript';

type Slide={title:string;formula:string;steps:string[];result:string;meaning:string;notes:string};
type Content={slides:Slide[];scripts:Record<string,string>;oral:OralScene[]};
const plain=(text:string)=>text.replace(/\*\*|`|«|»/g,'');
const savedCode=()=>new URLSearchParams(location.search).get('room')||'';
const savedName=()=>{const name=sessionStorage.getItem('eva03:lastName:'+savedCode());return PEOPLE.includes(name as typeof PEOPLE[number])?name!:'Davis';};
const savedJoin=():Join|null=>{const code=savedCode(),name=savedName(),token=sessionStorage.getItem(`eva03:${code}:${name}`);return token?{role:'controller',name,code,resumeToken:token}:null;};
export function Tablet(){
 const [name,setName]=useState(savedName),[code,setCode]=useState(savedCode),[join,setJoin]=useState<Join|null>(savedJoin),[content,setContent]=useState<Content|null>(null),[font,setFont]=useState(22),[follow,setFollow]=useState(true),[pinned,setPinned]=useState(1),[draft,setDraft]=useState(.5);
 const [reviewSource,setReviewSource]=useState<'slide'|'model'>('slide'),[reviewStep,setReviewStep]=useState(0),reader=useRef<HTMLElement>(null);
 const scrubbing=useRef(false);
 const session=useSession(join),room=session.room,state=room?.state||INITIAL;
 const stream=useVideoReceiver(session,!!room?.videoActive);
 const slideVideo=useRef<HTMLVideoElement>(null),modelVideo=useRef<HTMLVideoElement>(null),[lastModel,setLastModel]=useState(''),[lastFrame,setLastFrame]=useState(0),[now,setNow]=useState(Date.now());
 const pointers=useRef(new Map<number,{x:number;y:number}>()),gesture=useRef({id:'',time:0,x:0,y:0,distance:0,moved:false}),suppressClick=useRef(false);
 const connected=session.status==='Conectado',can=connected&&!!room&&(room.mode==='shared'||room.owner===name)&&room.stageReady,enabled=can&&!room?.busy;
 const currentScene=(state.source==='model'?state.model.scene:state.slide)+1,scriptScene=follow?currentScene:pinned,slide=content?.slides[state.slide];
 const scriptSource=follow?state.source:reviewSource,scriptStep=follow?(state.source==='slide'?state.reveal:state.model.demo):reviewStep;
 const oral=content?.oral?.find(item=>item.scene===scriptScene),fragment=oral?readingFragment(oral,scriptSource,scriptStep):null;
 const readingKey=`${scriptSource}:${scriptScene}:${scriptStep}`;
 useEffect(()=>{reader.current?.scrollTo({top:0});},[readingKey]);
 useEffect(()=>{if(!scrubbing.current)setDraft(state.model.parameter);},[state.model.parameter]);
 useEffect(()=>{document.title='EVA03 · Tablet';},[]);
 useEffect(()=>{if(join)sessionStorage.setItem('eva03:lastName:'+code,name);},[join,code,name]);
 useEffect(()=>{if(!room?.code)return;let active=true;fetch(`/api/cabina/content?room=${encodeURIComponent(room.code)}`).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(c=>{if(!Array.isArray(c.oral)||c.oral.length!==22)throw new Error();if(active)setContent(c);}).catch(()=>{if(active)session.setError('No se pudo cargar el guion oral. Reinicia la sala con INICIAR_CABINA.cmd y recarga esta tablet.');});return()=>{active=false;};},[room?.code]);
 useEffect(()=>{
  const videos=[slideVideo.current,modelVideo.current];for(const video of videos){if(video){video.srcObject=stream;if(stream)void video.play().catch(()=>{});}}
  const active=state.source==='model'?modelVideo.current:slideVideo.current;
  let cancelled=false,id=0,stamp=0;
  const callback=()=>{if(cancelled||!active)return;const time=Date.now();if(time-stamp>500){stamp=time;setLastFrame(time);}id=active.requestVideoFrameCallback(callback);};
  if(active&&stream&&active.requestVideoFrameCallback)id=active.requestVideoFrameCallback(callback);
  return()=>{cancelled=true;if(active&&id)active.cancelVideoFrameCallback(id);};
 },[stream,state.source]);
 useEffect(()=>{const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t);},[]);
 useEffect(()=>{return()=>{if(gesture.current.id)session.command('model.camera',{phase:'end',kind:'orbit',gesture:gesture.current.id});};},[session.command]);
 function act(action:string,extra:Record<string,unknown>={}){if(enabled)session.command(action,extra);}
 function select(source:'slide'|'model'){
  if(suppressClick.current){suppressClick.current=false;return;}
  if(state.source===source){if(source==='slide')act('slide.nextStep');return;}
  if(state.source==='model'&&modelVideo.current?.readyState>=2){try{const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;canvas.getContext('2d')?.drawImage(modelVideo.current,0,0,640,360);setLastModel(canvas.toDataURL('image/jpeg',.7));}catch{/* A preview is optional. */}}
  act('output.select',{value:source});
 }
 function camera(e:PointerEvent<HTMLButtonElement>,phase:'begin'|'move'|'end'){
  if(!enabled||state.source!=='model')return;
  const positions=pointers.current,g=gesture.current;
  const metrics=()=>{const values=[...positions.values()];const a=values[0],b=values[1];return {x:b?(a.x+b.x)/2:a?.x||0,y:b?(a.y+b.y)/2:a?.y||0,distance:b?Math.hypot(a.x-b.x,a.y-b.y):0};};
  if(phase==='begin'){
   e.currentTarget.setPointerCapture(e.pointerId);positions.set(e.pointerId,{x:e.clientX,y:e.clientY});const m=metrics();
   if(!g.id){g.id=makeId();g.moved=false;g.time=performance.now();session.command('model.camera',{phase:'begin',kind:'orbit',gesture:g.id});}
   Object.assign(g,m);return;
  }
  if(!positions.has(e.pointerId))return;
  if(phase==='end'){
   session.command('model.camera',{phase:'end',kind:'orbit',gesture:g.id});suppressClick.current=g.moved;positions.clear();g.id='';return;
  }
  positions.set(e.pointerId,{x:e.clientX,y:e.clientY});const t=performance.now();if(t-g.time<33)return;if(t-g.time>1000)session.command('model.camera',{phase:'begin',kind:'orbit',gesture:g.id});g.time=t;
  const m=metrics(),box=e.currentTarget.getBoundingClientRect(),dx=Math.max(-.3,Math.min(.3,(m.x-g.x)/box.width)),dy=Math.max(-.3,Math.min(.3,(m.y-g.y)/box.height));
  if(Math.abs(m.x-g.x)+Math.abs(m.y-g.y)>3)g.moved=true;
  if(positions.size>1){session.command('model.camera',{phase:'move',kind:'pan',gesture:g.id,dx,dy});if(g.distance&&m.distance)session.command('model.camera',{phase:'move',kind:'zoom',gesture:g.id,dy:Math.max(-.3,Math.min(.3,Math.log(m.distance/g.distance)/2))});}
  else session.command('model.camera',{phase:'move',kind:'orbit',gesture:g.id,dx,dy});Object.assign(g,m);
 }
 const age=lastFrame?Math.floor((now-lastFrame)/1000):null;
 const imageStatus=stream&&age!==null?(age<4?'Imagen en directo':`Imagen sin actualizar · ${age} s`):room?.videoActive?'Conectando imagen':'La laptop todavía no comparte imagen';
 if(!join)return <main className="cabina-page cabina-login"><h1>Cabina EVA03</h1><p>Conecta esta tablet a la misma red Wi-Fi de la laptop.</p><form onSubmit={e=>{e.preventDefault();setJoin({role:'controller',name,code,resumeToken:sessionStorage.getItem(`eva03:${code}:${name}`)||undefined});}}><label>Integrante<select value={name} onChange={e=>setName(e.target.value)}>{PEOPLE.map(n=><option key={n}>{n}</option>)}</select></label><label>Código de sala<input inputMode="numeric" pattern="[0-9]{6}" required maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/></label><button className="primary">Entrar a la sala</button></form><small>El código y el QR aparecen al escribir EVA03 dentro del modelo local.</small></main>;
 return <main className="cabina-tablet">
  <header className="cabina-top"><div><b>EVA03 · {name}</b><small>{session.status} · sala {code}</small></div><span>{imageStatus}</span></header>
  <PermissionControls session={session} name={name}/>
  {session.error&&<p className="cabina-error" role="alert">{session.error}<button onClick={()=>session.setError('')}>Cerrar aviso</button></p>}
  {!connected&&<p className="cabina-warning">Los controles están suspendidos hasta recuperar la conexión. El guion sigue disponible.<button onClick={()=>setJoin(null)}>Volver al acceso</button></p>}
  <div className="cabina-work">
   <aside ref={reader} className="cabina-script"><div className="cabina-row"><h1>Mi guion</h1><button aria-label="Reducir letra del guion" onClick={()=>setFont(n=>Math.max(18,n-1))}>A−</button><button aria-label="Aumentar letra del guion" onClick={()=>setFont(n=>Math.min(32,n+1))}>A+</button></div><p className="cabina-caption">{scriptSource==='slide'?'Lámina':'Modelo'} {scriptScene} · voz principal: {oral?.speaker||'Preparando…'}</p><label className="cabina-check"><input type="checkbox" checked={follow} onChange={e=>{setPinned(currentScene);setReviewSource(state.source);setReviewStep(state.source==='slide'?state.reveal:state.model.demo);setFollow(e.target.checked);}}/>Seguir la exposición</label>{!follow&&<div className="cabina-review"><p>Repaso privado · estos cambios no se proyectan.</p><label>Repasar escena<select value={pinned} onChange={e=>{setPinned(Number(e.target.value));setReviewStep(0);}}>{Array.from({length:22},(_,i)=><option key={i} value={i+1}>{i+1} · {content?.slides[i]?.title}</option>)}</select></label><label>Guion de<select value={reviewSource} onChange={e=>{setReviewSource(e.target.value as 'slide'|'model');setReviewStep(0);}}><option value="slide">Presentación</option><option value="model">Modelo 3D</option></select></label><label>Fragmento<select value={reviewStep} onChange={e=>setReviewStep(Number(e.target.value))}>{(reviewSource==='slide'?['Introducción','Fórmula','Paso 1','Paso 2','Paso 3','Resultado','Qué significa']:oral?.model.map(m=>m.topic)||[]).map((label,i)=><option key={i} value={i}>{label}</option>)}</select></label></div>}
    <section className="cabina-reading" aria-label="Texto para decir en voz alta"><p className="cabina-reading-label">PARA DECIR · {fragment?.label||'Preparando'}</p><div className="cabina-phrase" style={{fontSize:font}}>{fragment?fragment.text.split(/\n\n/).map((paragraph,i)=><p key={i}>{paragraph}</p>):<p>Preparando el guion oral…</p>}</div></section>
    {fragment&&<div className="cabina-reader-cue"><b>Solo para ti · no se lee</b><p>{fragment.cue}</p></div>}
    {scriptSource==='model'&&<p className="cabina-caption">Las cifras del guion corresponden al caso de referencia o al total indicado. La lectura del modelo cambia durante la animación.</p>}
    {oral&&<details key={'question:'+scriptScene}><summary>Si nos preguntan</summary><div className="cabina-answer" style={{fontSize:Math.max(18,font-2)}}><b>{oral.defense.question}</b><p>{oral.defense.answer}</p></div></details>}
    <details key={'guide:'+scriptScene}><summary>Guía técnica de apoyo</summary><div className="cabina-script-full" style={{fontSize:Math.max(18,font-2)}}>{plain(content?.scripts[scriptScene]||'Cargando guía…')}</div></details>
   </aside>
   <section className="cabina-previews">
    <div><div className="cabina-pane-heading"><b>Presentación · {state.slide+1}/22</b><span>Paso {state.reveal}/6 · {state.source==='slide'?'Proyectando':'Vista previa'}</span></div>
     <button className="cabina-preview" disabled={!enabled} aria-label="Presentación: proyectar o revelar un paso" onClick={()=>select('slide')}>
      <video ref={slideVideo} autoPlay muted playsInline hidden={state.source!=='slide'||!stream}/>
      {(state.source!=='slide'||!stream)&&<div className="cabina-slide-preview"><strong>{slide?.title||'Presentación matemática'}</strong>{state.reveal>0&&<div className="formula">{slide?.formula}</div>}{slide?.steps.map((s,i)=>state.reveal>=i+2?<p key={i}>{i+1}. {s}</p>:null)}{state.reveal>=5&&<b>{slide?.result}</b>}{state.reveal>=6&&<p>{slide?.meaning}</p>}</div>}
     </button>
     <div className="cabina-row"><button disabled={!enabled||state.reveal===0} onClick={()=>act('slide.prevStep')}>Paso anterior</button><button className="primary" disabled={!enabled||state.reveal===6} onClick={()=>act('slide.nextStep')}>Revelar {Math.min(6,state.reveal+1)}/6</button><button disabled={!enabled||state.slide===0} onClick={()=>act('slide.prev')}>Lámina anterior</button><button disabled={!enabled||state.slide===21} onClick={()=>act('slide.next')}>Siguiente lámina</button></div>
    </div>
    <div><div className="cabina-pane-heading"><b>Modelo · escena {state.model.scene+1}/22</b><span>Tema {state.model.demo+1}/{state.model.demoCount} · {state.source==='model'?'Proyectando':'Vista previa'}</span></div>
     <button className="cabina-preview cabina-model-touch" disabled={!enabled} aria-label="Proyectar y mover el modelo 3D" onClick={()=>select('model')} onPointerDown={e=>camera(e,'begin')} onPointerMove={e=>camera(e,'move')} onPointerUp={e=>camera(e,'end')} onPointerCancel={e=>camera(e,'end')}>
      <video ref={modelVideo} autoPlay muted playsInline hidden={state.source!=='model'||!stream}/>
      {(state.source!=='model'||!stream)&&(lastModel?<img src={lastModel} alt="Última vista recibida del modelo"/>:<div className="cabina-empty">Modelo 3D · escena {state.model.scene+1}<small>Para ver la imagen real, comparte la pestaña de salida desde la laptop.</small></div>)}
     </button>
     <div className="cabina-row"><button disabled={!enabled||state.model.scene===0&&state.model.demo===0} onClick={()=>act('model.prev')}>Anterior</button><button disabled={!enabled} onClick={()=>act('model.next')}>Siguiente escena</button><button disabled={!enabled} onClick={()=>act('model.playToggle')}>{state.model.paused?'Reanudar':'Pausar'}</button><button disabled={!enabled} onClick={()=>act('model.replay')}>Repetir</button><button disabled={!enabled} onClick={()=>act('model.overview')}>Vista general</button><button disabled={!enabled} onClick={()=>act('model.solution')}>{state.model.solution?'Cerrar cálculo':'Ver cálculo'}</button></div>
     <label className="cabina-progress">Avance · {Math.round(draft*100)} %<input disabled={!enabled} type="range" min="0" max="1" step="0.01" value={draft} onPointerDown={()=>{scrubbing.current=true;}} onChange={e=>setDraft(Number(e.target.value))} onPointerUp={e=>{scrubbing.current=false;act('model.progress',{value:Number(e.currentTarget.value)});}} onPointerCancel={()=>{scrubbing.current=false;setDraft(state.model.parameter);}} onKeyUp={e=>act('model.progress',{value:Number(e.currentTarget.value)})}/></label>
     <div className="cabina-row"><label>Escena<select disabled={!enabled} value={state.model.scene} onChange={e=>act('model.scene',{value:Number(e.target.value)})}>{content?.slides.map((s,i)=><option key={i} value={i}>{i+1} · {s.title}</option>)}</select></label><label>Tema<select disabled={!enabled} value={state.model.demo} onChange={e=>act('model.demo',{value:Number(e.target.value)})}>{Array.from({length:state.model.demoCount},(_,i)=><option key={i} value={i}>Tema {i+1}</option>)}</select></label></div>
    </div>
    {!can&&<p className="cabina-warning">{connected?`El turno lo tiene ${room?.owner||'la laptop'}. Puedes seguir la exposición y leer tus notas.`:'Esperando conexión.'}</p>}
   </section>
  </div>
 </main>;
}
