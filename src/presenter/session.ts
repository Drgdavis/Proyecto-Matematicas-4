import {useCallback,useEffect,useRef,useState} from 'react';

export const PEOPLE=['Davis','Haroldo','Juan Carlos'] as const;
export type ModelState={scene:number;demo:number;demoCount:number;parameter:number;paused:boolean;solution:boolean};
export type OutputState={source:'slide'|'model';slide:number;reveal:number;model:ModelState};
export type Room={code:string;owner:string;mode:'individual'|'shared';revision:number;epoch:number;state:OutputState;stageOnline:boolean;stageReady:boolean;videoActive:boolean;presence:{id:string;name:string;connectionId:string}[];busy:boolean};
export type Packet={type:string;[key:string]:any};
export type Join={role:'host'|'stage';token:string}|{role:'controller';code:string;name:string;resumeToken?:string};
export const INITIAL:OutputState={source:'model',slide:0,reveal:0,model:{scene:0,demo:0,demoCount:3,parameter:.5,paused:false,solution:false}};
export const makeId=()=>Array.from(crypto.getRandomValues(new Uint8Array(12)),n=>n.toString(16).padStart(2,'0')).join('');

export function useSession(join:Join|null){
 const socket=useRef<WebSocket|null>(null),listeners=useRef(new Set<(p:Packet)=>void>());
 const [room,setRoom]=useState<Room|null>(null),[clientId,setClientId]=useState(''),[status,setStatus]=useState('Preparando conexión'),[error,setError]=useState('');
 const key=JSON.stringify(join);
 useEffect(()=>{
  if(!join)return;
  let stopped=false,timer:ReturnType<typeof setTimeout>;
  const connect=()=>{
   if(stopped)return;setStatus('Conectando');
   const ws=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/cabina-ws`);socket.current=ws;
   ws.onopen=()=>{const data={...JSON.parse(key),type:'join'};if(join.role==='controller')data.resumeToken=sessionStorage.getItem(`eva03:${join.code}:${join.name}`)||data.resumeToken;ws.send(JSON.stringify(data));};
   ws.onmessage=event=>{
    let p:Packet;try{p=JSON.parse(event.data);}catch{return;}
    if(p.type==='welcome'){setRoom(p.room);setClientId(p.clientId);setStatus('Conectado');setError('');
     if(join.role==='controller'&&p.resumeToken)sessionStorage.setItem(`eva03:${join.code}:${join.name}`,p.resumeToken);
    }
    if(p.type==='room')setRoom(p.room);
    if(p.type==='error')setError(p.message);
    for(const listener of listeners.current)listener(p);
   };
   ws.onerror=()=>setStatus('Sin conexión');
   ws.onclose=event=>{if(stopped)return;setStatus(event.code===1008?'Acceso pendiente':'Sin conexión · reintentando');setClientId('');if(event.code!==1008)timer=setTimeout(connect,1800);};
  };
  connect();
  return()=>{stopped=true;clearTimeout(timer);socket.current?.close();socket.current=null;};
 },[key]);
 const send=useCallback((p:Packet)=>{if(socket.current?.readyState!==WebSocket.OPEN)return false;socket.current.send(JSON.stringify(p));return true;},[]);
 const subscribe=useCallback((cb:(p:Packet)=>void)=>{listeners.current.add(cb);return()=>{listeners.current.delete(cb);};},[]);
 const command=useCallback((action:string,extra:Record<string,unknown>={})=>{const id=makeId();if(!send({type:'command',id,action,epoch:room?.epoch,...extra}))setError('La tablet está desconectada.');return id;},[send,room?.epoch]);
 return {room,clientId,status,error,setError,send,subscribe,command};
}

export function postToFrame(frame:HTMLIFrameElement|null,type:string,extra:Record<string,unknown>={}){
 frame?.contentWindow?.postMessage({...extra,type},location.origin);
}
