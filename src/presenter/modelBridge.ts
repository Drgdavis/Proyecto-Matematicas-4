import {useEffect,useRef,type MutableRefObject} from 'react';
import type {SceneHandle} from '../components/marsScene';
import type {ModelState} from './session';

type Actions={next:()=>void;previous:()=>void;scene:(scene:number,demo?:number)=>void;progress:(n:number)=>void;play:()=>void;replay:()=>void;solution:(open:boolean)=>void;restore:(state:ModelState)=>void};
export function useModelBridge(state:ModelState,actions:Actions,engine:MutableRefObject<SceneHandle|null>,error:string){
 const current=useRef({state,actions,error});current.current={state,actions,error};
 useEffect(()=>{
  if(new URLSearchParams(location.search).get('cabina')!=='model')return;
  const report=(id?:string)=>window.parent.postMessage({type:'eva03:model',id,state:current.current.state,error:current.current.error},location.origin);
  const handler=(event:MessageEvent)=>{
   if(event.source!==window.parent||event.origin!==location.origin||event.data?.type!=='eva03:model-command')return;
   const {action,value,id,dx,dy,kind}=event.data,api=current.current.actions;
   if(action==='model.next')api.next();
   else if(action==='model.prev')api.previous();
   else if(action==='model.scene'&&Number.isInteger(value)&&value>=0&&value<22)api.scene(value);
   else if(action==='model.demo'&&Number.isInteger(value)&&value>=0&&value<12)api.scene(current.current.state.scene,value);
   else if(action==='model.progress'&&Number.isFinite(value)&&value>=0&&value<=1)api.progress(value);
   else if(action==='model.playToggle')api.play();
   else if(action==='model.replay')api.replay();
   else if(action==='model.solution')api.solution(!current.current.state.solution);
   else if(action==='model.overview')engine.current?.overview();
   else if(action==='model.camera'&&['orbit','pan','zoom'].includes(kind)&&[dx??0,dy??0].every(n=>Number.isFinite(n)&&Math.abs(n)<=.5))engine.current?.remoteCamera(kind,dx??0,dy??0);
   else if(action==='model.visibility')engine.current?.rendering(!!value);
   else if(action==='restore'&&value)api.restore(value);
   else if(action!=='snapshot')return;
   requestAnimationFrame(()=>report(id));
  };
  let last='';
  const interval=setInterval(()=>{if(!engine.current&&!current.current.error)return;const value=JSON.stringify(current.current);if(value!==last){last=value;report();}},150);
  window.addEventListener('message',handler);
  const keys=(event:KeyboardEvent)=>{if((event.target as HTMLElement).closest('input,select,textarea,button'))return;let action='';if(event.key===' '||event.key==='ArrowRight')action='model.next';else if(event.key==='ArrowLeft')action='model.prev';if(action){event.preventDefault();event.stopImmediatePropagation();window.parent.postMessage({type:'eva03:local-command',action},location.origin);}};
  window.addEventListener('keydown',keys,true);
  return()=>{clearInterval(interval);window.removeEventListener('message',handler);window.removeEventListener('keydown',keys,true);};
 },[]);
}
