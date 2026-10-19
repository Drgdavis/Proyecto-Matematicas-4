const crypto = require('node:crypto');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const { WebSocketServer, WebSocket } = require('ws');
const QRCode = require('qrcode');

const NAMES = ['Davis', 'Haroldo', 'Juan Carlos'];
const ACTIONS = new Set(['slide.nextStep','slide.prevStep','slide.next','slide.prev','output.select','model.next','model.prev','model.scene','model.demo','model.playToggle','model.replay','model.progress','model.camera','model.overview','model.solution']);
const initialState = () => ({ source:'model', slide:0, reveal:0, model:{scene:0,demo:0,demoCount:3,parameter:.5,paused:false,solution:false} });
const isLoopback = address => ['127.0.0.1','::1','::ffff:127.0.0.1'].includes(address);

function createCabina({root, port=3000, ackTimeout=4000, shutdown}) {
  const code = String(crypto.randomInt(100000,1000000));
  const hostToken = crypto.randomBytes(32).toString('hex');
  const clients = new Map(), resumes = new Map(), completed = new Map();
  let stage = null, pending = null, lease = null, videoHost = null;
  let state = initialState(), owner = 'Davis', mode = 'individual', revision = 0, epoch = 0, stageReady = false, videoActive = false;
  const wss = new WebSocketServer({noServer:true,maxPayload:65536});
  const heartbeat=setInterval(()=>{for(const c of clients.values()){if(c.alive===false){c.socket.terminate();continue;}c.alive=false;c.socket.ping();}},15000);heartbeat.unref();
  const send = (client, data) => { if(client?.socket.readyState===WebSocket.OPEN)client.socket.send(JSON.stringify(data)); };
  const presence = () => [...clients.values()].filter(c=>c.role==='controller').map(c=>({id:c.id,name:c.name,connectionId:c.connectionId}));
  const room = () => ({code,owner,mode,revision,epoch,state,stageOnline:!!stage,stageReady,videoActive,presence:presence(),busy:!!pending});
  const broadcast = () => { const data={type:'room',room:room()};for(const c of clients.values())send(c,data); };
  const canManage = c => c.role==='host'||c.role==='controller'&&c.name===owner;
  const canControl = c => c.role==='host'||c.role==='stage'||c.role==='controller'&&(mode==='shared'||c.name===owner);
  const error = (c,message,id) => send(c,{type:'error',message,id});
  function finishPending(message) {
    if(!pending)return;
    clearTimeout(pending.timer);
    error(clients.get(pending.clientId),message,pending.id);
    pending=null;
  }
  const addresses = () => [...new Set(Object.values(os.networkInterfaces()).flat().filter(n=>n&&n.family==='IPv4'&&!n.internal).map(n=>n.address))];
  const controlUrl = address => `http://${address.includes(':')?'['+address+']':address}:${port}/?cabina=control&room=${code}`;
  function json(res, status, value) {
    res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));
  }
  async function http(req,res) {
    const url = new URL(req.url,'http://localhost');
    if(!url.pathname.startsWith('/api/cabina/'))return false;
    if(url.pathname==='/api/cabina/close'){
      if(req.method!=='POST'||!isLoopback(req.socket.remoteAddress)||req.headers.authorization!==`Bearer ${hostToken}`||!shutdown){json(res,403,{error:'Solo la laptop puede cerrar la sala.'});return true;}
      json(res,200,{closed:true});setTimeout(shutdown,150);return true;
    }
    if(req.method!=='GET'){json(res,405,{error:'Método no permitido'});return true;}
    if(url.pathname==='/api/cabina/health'){json(res,200,{product:'eva03-cabina',version:1});return true;}
    if(url.pathname==='/api/cabina/bootstrap'){
      if(!isLoopback(req.socket.remoteAddress)){json(res,403,{error:'La preparación se abre en localhost desde la laptop.'});return true;}
      json(res,200,{hostToken,code,addresses:addresses(),port});return true;
    }
    if(url.searchParams.get('room')!==code){json(res,403,{error:'Código de sala incorrecto.'});return true;}
    if(url.pathname==='/api/cabina/qr'){
      const address=url.searchParams.get('address');
      if(!addresses().includes(address)&&address!=='127.0.0.1'){json(res,400,{error:'Dirección no disponible.'});return true;}
      const svg=await QRCode.toString(controlUrl(address),{type:'svg',margin:2,width:220});
      res.writeHead(200,{'Content-Type':'image/svg+xml','Cache-Control':'no-store'});res.end(svg);return true;
    }
    if(url.pathname==='/api/cabina/content'){
      const html=fs.readFileSync(path.join(root,'materials','Presentacion_EVA03_Defensa_Matematica_22_Escenas_Navegador.html'),'utf8');
      const match=html.match(/const slides=(\[[\s\S]*?\]);\s*const cues=/);
      if(!match){json(res,500,{error:'No se encontró la presentación.'});return true;}
      const guide=fs.readFileSync(path.join(root,'materials','Guia_Defensa_3_Integrantes.md'),'utf8');
      const scripts={};
      for(const section of guide.matchAll(/^### Escena (\d+) [^\n]*\n([\s\S]*?)(?=^#{1,3} |$(?![\s\S]))/gm))scripts[Number(section[1])]=section[2].trim();
      const oral=JSON.parse(fs.readFileSync(path.join(root,'materials','Guion_Oral_Cabina.json'),'utf8'));
      json(res,200,{slides:JSON.parse(match[1]),scripts,oral:oral.scenes});return true;
    }
    json(res,404,{error:'Ruta desconocida.'});return true;
  }
  function validAction(message) {
    if(!ACTIONS.has(message.action))return false;
    if(message.action==='output.select')return ['slide','model'].includes(message.value);
    if(message.action==='model.progress')return Number.isFinite(message.value)&&message.value>=0&&message.value<=1;
    if(message.action==='model.scene')return Number.isInteger(message.value)&&message.value>=0&&message.value<22;
    if(message.action==='model.demo')return Number.isInteger(message.value)&&message.value>=0&&message.value<12;
    if(message.action==='model.camera')return ['begin','move','end'].includes(message.phase)&&['orbit','pan','zoom'].includes(message.kind)&&typeof message.gesture==='string'&&message.gesture.length<80&&[message.dx??0,message.dy??0].every(v=>Number.isFinite(v)&&Math.abs(v)<=.5);
    return true;
  }
  function validState(value) {
    return value&&['slide','model'].includes(value.source)&&Number.isInteger(value.slide)&&value.slide>=0&&value.slide<22&&Number.isInteger(value.reveal)&&value.reveal>=0&&value.reveal<=6&&value.model&&Number.isInteger(value.model.scene)&&value.model.scene>=0&&value.model.scene<22&&Number.isInteger(value.model.demoCount)&&value.model.demoCount>=1&&value.model.demoCount<=12&&Number.isInteger(value.model.demo)&&value.model.demo>=0&&value.model.demo<value.model.demoCount&&Number.isFinite(value.model.parameter)&&value.model.parameter>=0&&value.model.parameter<=1&&typeof value.model.paused==='boolean'&&typeof value.model.solution==='boolean';
  }
  function onMessage(c,m) {
    if(m.type==='signal'){
      if(!m.signal||typeof m.signal!=='object'||Array.isArray(m.signal))return;
      const peer=clients.get(m.to);
      if(peer&&(c.role==='host'&&c.id===videoHost&&peer.role==='controller'||c.role==='controller'&&peer.id===videoHost)&&JSON.stringify(m.signal).length<50000)send(peer,{type:'signal',from:c.id,signal:m.signal});
      return;
    }
    if(m.type==='video'&&c.role==='host'){
      if(videoHost&&videoHost!==c.id&&videoActive){error(c,'Otra cabina está compartiendo la salida.');return;}
      videoHost=m.active?c.id:null;videoActive=!!m.active;broadcast();return;
    }
    if(m.type==='stage.ready'&&c===stage){stageReady=true;if(validState(m.state))state=m.state;broadcast();return;}
    if(m.type==='stage.telemetry'&&c===stage&&validState(m.state)){
      if(!pending){state=m.state;broadcast();}return;
    }
    if(m.type==='stage.applied'&&c===stage&&pending&&m.id===pending.id){
      if(!validState(m.state)){finishPending('La salida devolvió un estado inválido.');broadcast();return;}
      clearTimeout(pending.timer);state=m.state;revision++;
      const result={type:'ack',id:m.id,revision};completed.set(pending.clientId+':'+m.id,result);
      if(completed.size>256)completed.delete(completed.keys().next().value);
      send(clients.get(pending.clientId),result);pending=null;broadcast();return;
    }
    if(m.type==='stage.error'&&c===stage&&pending&&pending.id===m.id){finishPending(m.message||'No se pudo aplicar el cambio.');broadcast();return;}
    if(m.type!=='command'||typeof m.id!=='string'||m.id.length>100)return;
    const cached=completed.get(c.id+':'+m.id);if(cached){send(c,cached);return;}
    if(m.action==='mode.set'||m.action==='turn.set'){
      if(!canManage(c)){error(c,'Solo la laptop o quien tiene el turno puede cambiar permisos.',m.id);return;}
      if(m.confirmed!==true){error(c,'Falta confirmar el cambio de permisos.',m.id);return;}
      if(m.action==='mode.set'){
        if(!['individual','shared'].includes(m.value)){error(c,'Modo inválido.',m.id);return;}mode=m.value;
      }else{
        if(!NAMES.includes(m.value)||!presence().some(p=>p.name===m.value)){error(c,'Ese integrante no está conectado.',m.id);return;}owner=m.value;
      }
      epoch++;lease=null;send(stage,{type:'camera.cancel'});const result={type:'ack',id:m.id,revision};completed.set(c.id+':'+m.id,result);send(c,result);broadcast();return;
    }
    if(!canControl(c)){error(c,`El turno lo tiene ${owner}.`,m.id);return;}
    if(!validAction(m)){error(c,'Acción no admitida.',m.id);return;}
    if(!stage||!stageReady){error(c,'Abre la salida de la TV y espera a que cargue.',m.id);return;}
    if(m.epoch!==epoch){error(c,'Los permisos cambiaron. Vuelve a intentarlo.',m.id);return;}
    if(m.action==='model.camera'){
      if(state.source!=='model'||pending)return;
      const now=Date.now();
      if(m.phase==='begin'){
        if(lease&&lease.expires>now&&lease.clientId!==c.id){error(c,'Otra tablet está moviendo la cámara.',m.id);return;}
        lease={clientId:c.id,gesture:m.gesture,expires:now+1600};
      }
      if(!lease||lease.clientId!==c.id||lease.gesture!==m.gesture||lease.expires<now)return;
      lease.expires=now+1600;
      send(stage,{type:'camera',command:m});
      if(m.phase==='end')lease=null;
      return;
    }
    if(pending){if(pending.id!==m.id)error(c,'Espera a que termine el cambio actual.',m.id);return;}
    lease=null;send(stage,{type:'camera.cancel'});
    pending={id:m.id,clientId:c.id,timer:setTimeout(()=>{finishPending('La salida no confirmó el cambio. Comprueba la laptop.');broadcast();},ackTimeout)};
    send(stage,{type:'execute',command:m});broadcast();
  }
  wss.on('connection',socket=>{
    let client=null;
    socket.on('pong',()=>{if(client)client.alive=true;});
    const joinTimer=setTimeout(()=>socket.close(1008,'Falta iniciar sesión'),5000);
    socket.on('message',raw=>{
      let m;try{m=JSON.parse(raw.toString());}catch{socket.close(1008,'JSON inválido');return;}
      if(!m||typeof m!=='object')return;
      if(!client){
        if(m.type!=='join')return;
        if(m.role==='host'||m.role==='stage'){
          if(m.token!==hostToken){socket.close(1008,'Acceso no autorizado');return;}
          if(m.role==='stage'&&stage){socket.send(JSON.stringify({type:'error',message:'Ya existe una salida conectada. Cierra la anterior para abrir otra.'}));socket.close(1008);return;}
          client={id:crypto.randomUUID(),role:m.role,socket};
        }else if(m.role==='controller'&&m.code===code&&NAMES.includes(m.name)){
          const existing=resumes.get(m.name);
          const previous=[...clients.values()].find(p=>p.role==='controller'&&p.name===m.name);
          if(previous&&(!existing||existing.token!==m.resumeToken)){socket.send(JSON.stringify({type:'error',message:'Ese integrante ya tiene una tablet conectada.'}));socket.close(1008);return;}
          if(existing&&existing.token!==m.resumeToken){socket.send(JSON.stringify({type:'error',message:'Usa la tablet original de este integrante o reinicia la sala en la laptop.'}));socket.close(1008);return;}
          if(previous){clients.delete(previous.id);previous.socket.terminate();if(lease?.clientId===previous.id){lease=null;send(stage,{type:'camera.cancel'});}}
          const token=existing?.token||crypto.randomBytes(24).toString('hex');
          const id=existing?.id||crypto.randomUUID();resumes.set(m.name,{token,id});
          client={id,role:'controller',name:m.name,resumeToken:token,connectionId:crypto.randomUUID(),socket};
        }else{socket.send(JSON.stringify({type:'error',message:'Comprueba el código de sala y tu nombre.'}));socket.close(1008);return;}
        clearTimeout(joinTimer);clients.set(client.id,client);
        if(client.role==='stage'){stage=client;stageReady=false;}
        send(client,{type:'welcome',clientId:client.id,resumeToken:client.resumeToken,room:room()});broadcast();return;
      }
      onMessage(client,m);
    });
    socket.on('error',()=>{});
    socket.on('close',()=>{
      clearTimeout(joinTimer);if(!client)return;
      if(clients.get(client.id)!==client)return;
      clients.delete(client.id);
      if(client===stage){stage=null;stageReady=false;finishPending('La pantalla de salida se desconectó.');}
      if(client.id===videoHost){videoHost=null;videoActive=false;}
      if(lease?.clientId===client.id){lease=null;send(stage,{type:'camera.cancel'});}
      broadcast();
    });
  });
  function upgrade(req,socket,head){
    if(req.url!=='/cabina-ws'){socket.destroy();return;}
    try{if(new URL(req.headers.origin).host!==req.headers.host){socket.destroy();return;}}catch{socket.destroy();return;}
    wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
  }
  function close(){clearInterval(heartbeat);finishPending('Sala cerrada.');for(const c of clients.values())c.socket.terminate();wss.close();}
  return {http,upgrade,close,bootstrap:()=>({code,hostToken}),room};
}
module.exports={createCabina};
