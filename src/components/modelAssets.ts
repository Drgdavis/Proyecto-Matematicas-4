import {LoadingManager} from 'three';

export type ModelAssets={status:'loading'|'ready'|'failed';completed:number;total:number;failed:string[]};
export const INITIAL_MODEL_ASSETS:ModelAssets={status:'loading',completed:0,total:0,failed:[]};

/** Tracks parsed models and their dependent textures through one manager. */
export function trackModelAssets(notify:(state:ModelAssets)=>void){
 const manager=new LoadingManager(),failed=new Set<string>();
 let active=true,completed=0,total=0;
 const emit=()=>{if(active)notify({status:failed.size?'failed':total>0&&completed===total?'ready':'loading',completed,total,failed:[...failed]});};
 manager.onStart=(_url,loaded,count)=>{completed=loaded;total=count;emit();};
 manager.onProgress=(_url,loaded,count)=>{completed=loaded;total=count;emit();};
 manager.onError=url=>{failed.add(url.startsWith('blob:')||url.startsWith('data:')?'Textura integrada en un modelo':decodeURIComponent(url.split('?')[0].split('/').pop()||url));emit();};
 manager.onLoad=emit;
 return {manager,dispose:()=>{active=false;}};
}
