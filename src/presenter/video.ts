import {useEffect,useRef,useState} from 'react';
import type {Packet} from './session';

type Transport={clientId:string;send:(p:Packet)=>boolean;subscribe:(cb:(p:Packet)=>void)=>()=>void};
type Peer={pc:RTCPeerConnection;pending:RTCIceCandidateInit[];connectionId?:string};
const flush=async(peer:Peer)=>{for(const candidate of peer.pending.splice(0))await peer.pc.addIceCandidate(candidate);};

export function useVideoSender(transport:Transport,recipients:{id:string;connectionId:string}[]){
 const [stream,setStream]=useState<MediaStream|null>(null),[error,setError]=useState('');
 const peers=useRef(new Map<string,Peer>()),streamRef=useRef<MediaStream|null>(null);
 const {send,subscribe,clientId}=transport,key=recipients.map(p=>p.id+':'+p.connectionId).join(',');
 useEffect(()=>{
  const all=peers.current;
  const create=async(id:string,connectionId:string)=>{
   if(all.get(id)?.connectionId===connectionId||!stream)return;
   all.get(id)?.pc.close();
   const peer:Peer={pc:new RTCPeerConnection({iceServers:[]}),pending:[],connectionId};all.set(id,peer);
   peer.pc.onicecandidate=event=>{if(event.candidate)send({type:'signal',to:id,signal:{candidate:event.candidate.toJSON()}});};
   for(const track of stream.getTracks())peer.pc.addTrack(track,stream);
   try{const offer=await peer.pc.createOffer();await peer.pc.setLocalDescription(offer);send({type:'signal',to:id,signal:{description:peer.pc.localDescription?.toJSON()}});}catch(e){setError(String(e));}
  };
  if(stream&&clientId){send({type:'video',active:true});for(const recipient of recipients)void create(recipient.id,recipient.connectionId);}
  for(const [id,p] of all)if(!recipients.some(r=>r.id===id)){p.pc.close();all.delete(id);}
 },[stream,key,clientId,send]);
 useEffect(()=>subscribe(p=>{
  if(p.type!=='signal')return;const peer=peers.current.get(p.from);if(!peer)return;
  void(async()=>{try{if(p.signal.description){await peer.pc.setRemoteDescription(p.signal.description);await flush(peer);}else if(p.signal.candidate){if(peer.pc.remoteDescription)await peer.pc.addIceCandidate(p.signal.candidate);else peer.pending.push(p.signal.candidate);}}catch(e){setError(String(e));}})();
 }),[subscribe]);
 useEffect(()=>{if(!clientId){for(const p of peers.current.values())p.pc.close();peers.current.clear();}},[clientId]);
 useEffect(()=>()=>{streamRef.current?.getTracks().forEach(t=>t.stop());for(const p of peers.current.values())p.pc.close();peers.current.clear();},[]);
 async function start(){
  try{
   if(!navigator.mediaDevices?.getDisplayMedia)throw new Error('Abre la cabina desde http://localhost en Chrome o Edge de la laptop.');
   const media=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:{ideal:20,max:24},width:{ideal:1280},height:{ideal:720}},audio:false});
   streamRef.current?.getTracks().forEach(t=>t.stop());for(const p of peers.current.values())p.pc.close();peers.current.clear();
   streamRef.current=media;setStream(media);setError('');
   media.getVideoTracks()[0].addEventListener('ended',()=>{if(streamRef.current===media){setStream(null);streamRef.current=null;send({type:'video',active:false});}});
  }catch(e){setError(e instanceof Error?e.message:String(e));}
 }
 function stop(){streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;setStream(null);for(const p of peers.current.values())p.pc.close();peers.current.clear();send({type:'video',active:false});}
 return {stream,error,start,stop};
}

export function useVideoReceiver(transport:Transport,active:boolean){
 const [stream,setStream]=useState<MediaStream|null>(null),peer=useRef<Peer|null>(null),early=useRef(new Map<string,RTCIceCandidateInit[]>());
 const {send,subscribe,clientId}=transport;
 useEffect(()=>subscribe(p=>{
  if(p.type!=='signal')return;
  void(async()=>{try{
   if(p.signal.description?.type==='offer'){
    peer.current?.pc.close();const current:Peer={pc:new RTCPeerConnection({iceServers:[]}),pending:early.current.get(p.from)||[]};early.current.delete(p.from);peer.current=current;
    current.pc.onicecandidate=e=>{if(e.candidate)send({type:'signal',to:p.from,signal:{candidate:e.candidate.toJSON()}});};
    current.pc.ontrack=e=>setStream(e.streams[0]??new MediaStream([e.track]));
    await current.pc.setRemoteDescription(p.signal.description);await flush(current);await current.pc.setLocalDescription(await current.pc.createAnswer());
    send({type:'signal',to:p.from,signal:{description:current.pc.localDescription?.toJSON()}});
   }else if(p.signal.candidate){if(peer.current){if(peer.current.pc.remoteDescription)await peer.current.pc.addIceCandidate(p.signal.candidate);else peer.current.pending.push(p.signal.candidate);}else early.current.set(p.from,[...(early.current.get(p.from)||[]),p.signal.candidate]);}
  }catch{setStream(null);}})();
 }),[subscribe,send]);
 useEffect(()=>{if(!active||!clientId){peer.current?.pc.close();peer.current=null;setStream(null);}},[active,clientId]);
 useEffect(()=>()=>peer.current?.pc.close(),[]);
 return stream;
}
