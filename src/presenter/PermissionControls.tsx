import {useEffect,useRef,useState} from 'react';
import type {useSession} from './session';
type Session=ReturnType<typeof useSession>;
export function PermissionControls({session,host=false,name=''}:{session:Session;host?:boolean;name?:string}){
 const [dialog,setDialog]=useState<'mode'|'turn'|null>(null),[recipient,setRecipient]=useState('');
 const box=useRef<HTMLDivElement>(null),trigger=useRef<HTMLElement|null>(null);
 const room=session.room,manage=host||room?.owner===name;
 useEffect(()=>{
  if(!dialog)return;box.current?.querySelector<HTMLButtonElement>('[data-cancel]')?.focus();
  const handler=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setDialog(null);trigger.current?.focus();}if(e.key==='Tab'){const nodes=[...box.current!.querySelectorAll<HTMLElement>('button:not([disabled]),select')];const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}};
  window.addEventListener('keydown',handler);return()=>window.removeEventListener('keydown',handler);
 },[dialog]);
 if(!room)return null;
 const others=room.presence.filter(p=>p.name!==room.owner);
 const close=()=>{setDialog(null);trigger.current?.focus();};
 return <>
  <div className="cabina-permissions"><span><b>{room.mode==='shared'?'Control compartido':'Control individual'}</b><small>Turno: {room.owner}</small></span><button disabled={!manage||!others.length} onClick={e=>{trigger.current=e.currentTarget;setRecipient(others[0]?.name||'');setDialog('turn');}}>Ceder turno</button><button disabled={!manage} onClick={e=>{trigger.current=e.currentTarget;setDialog('mode');}}>{room.mode==='shared'?'Volver a un expositor':'Todos pueden controlar'}</button></div>
  {dialog&&<div className="cabina-confirm-backdrop"><div ref={box} className="cabina-confirm" role="dialog" aria-modal="true" aria-labelledby="cabina-question">
   <h2 id="cabina-question">{dialog==='turn'?'¿A quién cedes el turno?':room.mode==='individual'?'¿Permitir que las tres tablets controlen?':'¿Volver al control individual?'}</h2>
   <p>{dialog==='turn'?'La imagen y el avance se conservan. Cambiará quién puede controlar la salida.':room.mode==='individual'?'Davis, Haroldo y Juan Carlos podrán cambiar pasos, escenas y cámara.':`Solo ${room.owner} y la laptop podrán cambiar la proyección.`}</p>
   {dialog==='turn'&&<label>Entregar a<select value={recipient} onChange={e=>setRecipient(e.target.value)}>{others.map(p=><option key={p.id}>{p.name}</option>)}</select></label>}
   <div className="cabina-row"><button data-cancel onClick={close}>Cancelar</button><button className="primary" disabled={!manage||dialog==='turn'&&!others.some(p=>p.name===recipient)} onClick={()=>{session.command(dialog==='turn'?'turn.set':'mode.set',{value:dialog==='turn'?recipient:room.mode==='shared'?'individual':'shared',confirmed:true});close();}}>Confirmar</button></div>
  </div></div>}
 </>;
}
