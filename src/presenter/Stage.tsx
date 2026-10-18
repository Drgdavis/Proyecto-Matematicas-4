import {useEffect,useRef,useState} from 'react';
import {assetUrl} from '../utils/assetUrl';
import {INITIAL,makeId,postToFrame,useSession,type Join,type OutputState,type Packet} from './session';

export function Stage(){
 const [join,setJoin]=useState<Join|null>(null),[error,setError]=useState(''),[ready,setReady]=useState(false),[setup,setSetup]=useState(true),[hint,setHint]=useState(''),[source,setSource]=useState<'slide'|'model'>('model');
 const deck=useRef<HTMLIFrameElement>(null),model=useRef<HTMLIFrameElement>(null),snapshot=useRef<OutputState>(structuredClone(INITIAL));
 const frames=useRef({deck:false,model:false}),initialized=useRef(false),initStarted=useRef(false),waiting=useRef(new Map<string,{resolve:()=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}>());
 const session=useSession(join),live=useRef(session);live.current=session;
 useEffect(()=>{document.title='EVA03 · Salida';},[]);
 useEffect(()=>{let active=true;fetch('/api/cabina/bootstrap').then(r=>r.ok?r.json():Promise.reject(new Error('Abre la salida desde la laptop, usando localhost.'))).then(b=>{if(active)setJoin({role:'stage',token:b.hostToken});}).catch(e=>setError(String(e)));return()=>{active=false;};},[]);
 const call=async(which:'deck'|'model',action:string,extra:Record<string,unknown>={})=>{
  const id=makeId();
  await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>{waiting.current.delete(id);reject(new Error('El contenido no respondió.'));},2500);waiting.current.set(id,{resolve,reject,timer});postToFrame(which==='deck'?deck.current:model.current,`eva03:${which}-command`,{id,action,...extra});});
 };
 const activate=(value:'slide'|'model')=>{snapshot.current.source=value;setSource(value);postToFrame(model.current,'eva03:model-command',{action:'model.visibility',value:value==='model'});};
 useEffect(()=>{
  const receive=(event:MessageEvent)=>{
   if(event.origin!==location.origin)return;
   const p=event.data;
   if(event.source===deck.current?.contentWindow&&p?.type==='eva03:deck'){
    frames.current.deck=true;snapshot.current.slide=p.index;snapshot.current.reveal=p.reveal;
   }else if(event.source===model.current?.contentWindow&&p?.type==='eva03:model'){
    frames.current.model=true;snapshot.current.model=p.state;
   }else if((event.source===deck.current?.contentWindow||event.source===model.current?.contentWindow)&&p?.type==='eva03:local-command'){
    live.current.command(p.action);return;
   }else return;
   const pending=waiting.current.get(p.id);if(pending){clearTimeout(pending.timer);waiting.current.delete(p.id);pending.resolve();}
   if(frames.current.deck&&frames.current.model)setReady(true);
  };
  window.addEventListener('message',receive);return()=>{window.removeEventListener('message',receive);for(const p of waiting.current.values()){clearTimeout(p.timer);p.reject(new Error('Salida cerrada.'));}waiting.current.clear();};
 },[]);
 useEffect(()=>{
  if(!ready||!session.room||initStarted.current)return;
  initStarted.current=true;const saved=structuredClone(session.room.state);
  void(async()=>{try{
   await call('deck','restore',{value:saved});await call('model','restore',{value:saved.model});activate(saved.source);
   initialized.current=true;session.send({type:'stage.ready',state:snapshot.current});
  }catch(e){setError(String(e));initStarted.current=false;}})();
 },[ready,session.room,session.clientId]);
 useEffect(()=>{
  if(!session.clientId)return;
  if(initialized.current)session.send({type:'stage.ready',state:snapshot.current});
  return session.subscribe((p:Packet)=>{
   if(p.type==='camera'){if(snapshot.current.source==='model'&&p.command.phase==='move')postToFrame(model.current,'eva03:model-command',p.command);return;}
   if(p.type!=='execute')return;
   const c=p.command;
   void(async()=>{try{
    if(c.action==='output.select')activate(c.value);
    else if(c.action.startsWith('slide.')){activate('slide');await call('deck',c.action);}
    else {activate('model');await call('model',c.action,{value:c.value});}
    session.send({type:'stage.applied',id:c.id,state:snapshot.current});
   }catch(e){session.send({type:'stage.error',id:c.id,message:String(e)});}})();
  });
 },[session.clientId,session.send,session.subscribe]);
 useEffect(()=>{const interval=setInterval(()=>{if(initialized.current)session.send({type:'stage.telemetry',state:snapshot.current});},500);return()=>clearInterval(interval);},[session.send]);
 useEffect(()=>{const handler=(e:KeyboardEvent)=>{if((e.target as HTMLElement).closest('input,textarea,select,button'))return;if(e.key===' '||e.key==='ArrowRight'){e.preventDefault();session.command(source==='slide'?'slide.nextStep':'model.next');}else if(e.key==='ArrowLeft'){e.preventDefault();session.command(source==='slide'?'slide.prevStep':'model.prev');}else if(e.key==='PageDown'){e.preventDefault();session.command('slide.next');}else if(e.key.toLowerCase()==='m')session.command('output.select',{value:source==='slide'?'model':'slide'});};window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);},[session.command,source]);
 const failure=error||(session.status==='Acceso pendiente'?session.error:'');
 if(failure)return <div className="cabina-page"><h1>No se pudo abrir la salida</h1><p role="alert">{failure}</p><button onClick={()=>location.reload()}>Reintentar</button></div>;
 return <main className="cabina-stage">
  <iframe ref={deck} className={source==='slide'?'active':''} title="Presentación proyectada" src={assetUrl('/materials/Presentacion_EVA03_Defensa_Matematica_22_Escenas_Navegador.html?embed=cabina')}/>
  <iframe ref={model} className={source==='model'?'active':''} title="Modelo proyectado" src={`${location.pathname}?eva01=surface&cabina=model`}/>
  {setup&&<div className="cabina-stage-setup"><b>{ready&&session.room?.stageReady?'Salida conectada':'Preparando la presentación y el modelo…'}</b><span>Revisa que carguen los edificios y el rover. Mueve esta ventana a la TV y después activa pantalla completa.</span>{hint&&<span role="alert">{hint}</span>}<button onClick={async()=>{try{await document.documentElement.requestFullscreen();setSetup(false);}catch{setHint('El navegador no activó pantalla completa. Puedes usar su menú de pantalla completa y ocultar este aviso.');}}}>Pantalla completa</button><button onClick={()=>setSetup(false)}>Ocultar aviso</button></div>}
 </main>;
}
