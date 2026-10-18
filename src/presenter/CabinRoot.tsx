import {useEffect,useRef,useState} from 'react';
import App from '../App';
import {useSession,type Join} from './session';
import {useVideoSender} from './video';
import {PermissionControls} from './PermissionControls';
import {Tablet} from './Tablet';
import {Stage} from './Stage';
import './cabina.css';

type Bootstrap={hostToken:string;code:string;addresses:string[];port:number};
function HostCabin({visible,onClose}:{visible:boolean;onClose:()=>void}){
 const [bootstrap,setBootstrap]=useState<Bootstrap|null>(null),[error,setError]=useState(''),[address,setAddress]=useState(''),[retry,setRetry]=useState(0);
 const box=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  let active=true;fetch('/api/cabina/bootstrap').then(async r=>{if(!r.ok||!r.headers.get('content-type')?.includes('application/json'))throw new Error('Este enlace no tiene servidor local.');return r.json();}).then((data:Bootstrap)=>{if(active){setBootstrap(data);setAddress(data.addresses.find(a=>a.startsWith('192.168.'))||data.addresses[0]||'');setError('');}}).catch(()=>{if(active)setError('Para conectar las tablets, abre la copia local con INICIAR_CABINA.cmd. El sitio público permite ver el proyecto, pero no iniciar el servidor de tu laptop.');});return()=>{active=false;};
 },[retry]);
 const join:Join|null=bootstrap?{role:'host',token:bootstrap.hostToken}:null,session=useSession(join);
 const video=useVideoSender(session,session.room?.presence||[]);
 useEffect(()=>{if(visible)box.current?.querySelector<HTMLButtonElement>('[data-close]')?.focus();},[visible]);
 useEffect(()=>{
  if(!visible)return;
  const listener=(e:KeyboardEvent)=>{if(e.key!=='Tab')return;const nodes=[...box.current!.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],select,input')].filter(n=>n.offsetParent!==null),first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}};
  box.current?.addEventListener('keydown',listener);return()=>box.current?.removeEventListener('keydown',listener);
 },[visible]);
 const url=bootstrap&&address?`http://${address}:${bootstrap.port}/?cabina=control&room=${bootstrap.code}`:'';
 return <div className="cabina-host-backdrop" hidden={!visible}><section ref={box} className="cabina-host" role="dialog" aria-modal="true" aria-labelledby="cabina-host-title">
  <header className="cabina-top"><div><h1 id="cabina-host-title">Cabina EVA03</h1><small>Preparación privada · EVA03 abre la cabina · Esc vuelve al modelo</small></div><button data-close onClick={onClose}>Volver al modelo</button></header>
  {error?<div className="cabina-card"><p role="alert">{error}</p><ol><li>Descarga o actualiza el repositorio en esta laptop.</li><li>Ejecuta INICIAR_CABINA.cmd desde la carpeta del proyecto. Necesita Node.js 22 o posterior.</li><li>En el modelo local, escribe EVA03 con la página enfocada.</li></ol><a href="https://github.com/Drgdavis/Proyecto-Matematicas-4" target="_blank" rel="noreferrer">Abrir el repositorio</a><button onClick={()=>setRetry(n=>n+1)}>Reintentar conexión local</button></div>:!bootstrap?<p>Preparando sala…</p>:<>
   <div className="cabina-host-grid"><section className="cabina-card"><h2>1 · Conectar las tablets</h2><p>Usa la misma red Wi-Fi en los cuatro equipos. Elige la dirección de esa red.</p><label>Dirección de la laptop<select value={address} onChange={e=>setAddress(e.target.value)}>{bootstrap.addresses.map(a=><option key={a}>{a}</option>)}</select></label>
    {url?<><img className="cabina-qr" src={`/api/cabina/qr?room=${bootstrap.code}&address=${encodeURIComponent(address)}`} alt="QR para entrar a la sala desde una tablet"/><p className="cabina-code">Sala {bootstrap.code}</p><a className="cabina-url" href={url} target="_blank" rel="noreferrer">{url}</a><small>Elige un nombre distinto en cada tablet. Si no abre, comprueba la red y el acceso de Node a la red privada en Windows.</small></>:<p>No se encontró una dirección de red. Conecta la laptop al Wi-Fi o al router.</p>}
   </section><section className="cabina-card"><h2>2 · Preparar la salida</h2><p>Abre una sola ventana de salida, muévela a la TV y activa allí pantalla completa.</p><button className="primary" disabled={!!session.room?.stageOnline} onClick={()=>window.open(`${location.pathname}?cabina=salida`,'eva03-salida')}>{session.room?.stageOnline?'Salida conectada':'Abrir salida para TV'}</button><p>{session.room?.stageReady?'Presentación y modelo listos para recibir órdenes.':'Esperando que cargue la salida.'}</p><h2>3 · Compartir la imagen</h2><p>Elige la pestaña <b>EVA03 · Salida</b>. Así las tablets reciben la proyección y las notas permanecen privadas.</p><div className="cabina-row"><button disabled={!session.room?.stageReady||!!video.stream} onClick={()=>void video.start()}>Compartir salida con tablets</button>{video.stream&&<button onClick={video.stop}>Detener imagen</button>}</div><p role="status">{video.stream?'Captura activa':session.status}</p>{video.error&&<p className="cabina-error" role="alert">{video.error}</p>}<p className="cabina-caption">Cerrar esta cabina conserva la conexión y la captura. Cerrar la pestaña de esta laptop detiene la imagen hacia las tablets.</p>
   </section></div>
   <section className="cabina-card"><h2>Integrantes · {session.room?.presence.length||0}/3</h2><p>{session.room?.presence.map(p=>p.name).join(' · ')||'Todavía no hay tablets conectadas.'}</p><PermissionControls session={session} host/>{session.error&&<p className="cabina-error" role="alert">{session.error}</p>}<div className="cabina-row"><button disabled={!session.room?.stageReady||session.room?.busy} onClick={()=>session.command('output.select',{value:'slide'})}>Proyectar presentación</button><button disabled={!session.room?.stageReady||session.room?.busy} onClick={()=>session.command('output.select',{value:'model'})}>Proyectar modelo</button><button onClick={()=>{if(window.confirm('¿Cerrar la sala y desconectar las tres tablets?')){video.stop();void fetch('/api/cabina/close',{method:'POST',headers:{Authorization:`Bearer ${bootstrap.hostToken}`}}).then(r=>{if(!r.ok)throw new Error();setError('La sala se ha cerrado. Para volver a iniciarla, ejecuta INICIAR_CABINA.cmd.');}).catch(()=>session.setError('No se pudo cerrar el servidor.'));}}}>Cerrar sala y servidor</button></div></section>
  </>}
 </section></div>;
}

function CabinEntry(){
 const [activated,setActivated]=useState(false),[visible,setVisible]=useState(false),visibleRef=useRef(false),returnFocus=useRef<HTMLElement|null>(null);
 visibleRef.current=visible;
 const close=()=>{setVisible(false);returnFocus.current?.focus();};
 useEffect(()=>{
  let sequence='',last=0;
  const handler=(event:KeyboardEvent)=>{
   if(visibleRef.current){
    if(event.key==='Escape'&&!document.querySelector('.cabina-confirm')){event.preventDefault();event.stopImmediatePropagation();setVisible(false);returnFocus.current?.focus();return;}
    // Bubble handlers in the 3D page must not receive typing inside the cabina.
    event.stopPropagation();
    if(event.key==='Tab'){
     const modal=document.querySelector<HTMLElement>('.cabina-confirm')||document.querySelector<HTMLElement>('.cabina-host');
     const nodes=[...(modal?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],select,input')||[])].filter(n=>n.offsetParent!==null),first=nodes[0],end=nodes[nodes.length-1];
     if(event.shiftKey&&document.activeElement===first){event.preventDefault();end?.focus();}else if(!event.shiftKey&&document.activeElement===end){event.preventDefault();first?.focus();}
    }
    if(event.key==='Escape'&&document.querySelector('.cabina-confirm')){document.querySelector<HTMLButtonElement>('.cabina-confirm [data-cancel]')?.click();event.preventDefault();}
    return;
   }
   if(event.repeat||event.ctrlKey||event.altKey||event.metaKey||(event.target as HTMLElement).closest('input,textarea,select,[contenteditable="true"]'))return;
   const time=performance.now();if(time-last>1800)sequence='';last=time;
   const key=event.key.toLowerCase();if(key.length!==1){sequence='';return;}
   const next=sequence+key;
   if('eva03'.startsWith(next)){sequence=next;event.preventDefault();event.stopImmediatePropagation();}
   else {sequence=key==='e'?'e':'';return;}
   if(sequence==='eva03'){sequence='';returnFocus.current=document.activeElement as HTMLElement;setActivated(true);setVisible(true);}
  };
  window.addEventListener('keydown',handler,true);return()=>window.removeEventListener('keydown',handler,true);
 },[]);
 return activated?<HostCabin visible={visible} onClose={close}/>:null;
}

export default function CabinRoot(){
 const mode=new URLSearchParams(location.search).get('cabina');
 if(mode==='control')return <Tablet/>;
 if(mode==='salida')return <Stage/>;
 return <><App/>{mode!=='model'&&<CabinEntry/>}</>;
}
