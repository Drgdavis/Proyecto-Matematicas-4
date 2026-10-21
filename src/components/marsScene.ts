import { assetUrl } from '../utils/assetUrl';
import {trackModelAssets,type ModelAssets} from './modelAssets';
import { createColonyCampus, WORKSHOP_NORTH_ACCESS } from './colonyCampus';
import { habitatWallGeometry } from './habitatWall';
import { workshopFacadeGeometry, workshopNorthWallGeometry, workshopWestCargoWallGeometry, WORKSHOP_WEST_BAY, WORKSHOP_WEST_GATE, workshopGateOffset, prepareWorkshopForAccess } from './workshopFacade';
import * as T from 'three';
import { createSurveyLayer } from './marsSurvey';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { height, landscape, grad, hessian, gradObjective, tangentAt, MARS, tankFloor, CM, LEVELS, CONTOUR_SPACING, START, routeAt, velocityAt, accelerationAt, densityAt, WATER_PIPE, WATER_PLANT, WATER_PLANT_WALKWAY, waterPipeAt, EAST_SERVICE_WALKWAY, SERVICE_JUNCTION, SOLAR_ARRAY_LAYOUT, SOLAR_SUPPORT_LAYOUT, SOLAR_MODULE_SCALE } from '../data/marsMath';
import { descentPath, directionalRose, safeRoverSpeed, solarState } from '../data/marsSystems';
 import { HABITAT, HABITAT_RING_ACCESS, LAB_ACCESS, HABITAT_ACCESS_PATH, GREENHOUSE, GREENHOUSE_BEDS, GREENHOUSE_PRESSURE_PORTAL, GREENHOUSE_ACCESS_PORTAL, GREENHOUSE_CORRIDOR, GREENHOUSE_WATER_SERVICE, GREENHOUSE_WATER_DISTRIBUTION, GREENHOUSE_WATER_PORTS, WORKSHOP_CARGO_LINK, ROVER_TRANSFER_DESIGN, ROVER_LOGISTICS_TRANSFER, GREENHOUSE_ACCESS_ROUTE, greenhouseCorridorPlan, walkFloor, labWalkway, canWalkHabitat } from '../data/marsHabitat';
import { SOLAR_POWER_SERVICE, buriedServicePoints } from '../data/campusUtilities';
import { createRoverLogisticsSurface, roverLogisticsDrivePath } from '../data/roverLogistics';
import { EVA_BASE, type EvaStep } from '../data/eva01Project';
import { createAtmosphericDust, createElevationBands, createGodRays, createMoons, createOuterCraters } from './marsEnvironment';
import { ICE_SITES, iceScores, dustState, oxygenState, shieldState, roverEnergyState } from '../data/researchScenarios';
import { linearizationAt, directionalAtQ, directionalAtP, gradientFrameAt, localLevelTrace, chainAt, lagrangeAt, routeDistanceAt, ROUTE_LENGTH } from '../data/marsMath';

const V=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);
const ground=(x:number,z:number,lift=0)=>V(x,landscape(x,z)+lift,z);
const amber=0xffc078, cyan=0x64e1e0, red=0xff6965;
const LEVEL_TRACE_P=localLevelTrace(40,-20),LEVEL_TRACE_Q=localLevelTrace(-50,35);
const STATIC_ROUTE_TARGETS=new Set(['route','vectors','tangentVector','curvature','routeMarkers','safeSpeed']);
const seeded=(n:number)=>{const a=Math.sin(n*127.1+31.7)*43758.54;return a-Math.floor(a);};
export type Telemetry={value:string;detail:string;x?:number;z?:number};
export type MarsView='aerial'|'walk';
export type PhaseVCamera='auto'|'campus'|'geometry'|'side'|'under';
export type CurvatureCamera='auto'|'top'|'space';
export type SceneAnnotation={element:HTMLElement;anchor:[number,number,number]};
export type SceneHandle={snapshot?:()=>string;rendering:(on:boolean)=>void;remoteCamera:(kind:string,dx:number,dy:number)=>void;annotations:(items:SceneAnnotation[])=>void;curvatureCamera:(view:CurvatureCamera)=>void;phaseCamera:(view:PhaseVCamera)=>void;station:(step:EvaStep,value:number)=>void;parameter:(value:number)=>void;view:(mode:MarsView)=>void;overview:()=>void;focus:(position:[number,number,number])=>void;zoom:(factor:number)=>void;interior:()=>void;entrance:()=>void;clean:(on:boolean)=>void;survey:(on:boolean)=>void;elevation:(on:boolean)=>void;explain:(on:boolean)=>void;xray:(on:boolean)=>void;autopilot:(on:boolean)=>void;day:(value:number)=>void;dayCycle:(on:boolean)=>void;demoCycle:(on:boolean)=>void;sound:(on:boolean)=>void;move:(direction:string,on:boolean)=>void;dispose:()=>void};
function line(points:T.Vector3[],color=cyan){return new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color}));}
function label(text:string,color='#e9f6f3',scale=1){
 const c=document.createElement('canvas');c.width=768;c.height=128;const x=c.getContext('2d')!;
 const glass=x.createLinearGradient(0,5,0,121);glass.addColorStop(0,'rgba(18,31,36,.78)');glass.addColorStop(.48,'rgba(12,24,30,.66)');glass.addColorStop(1,'rgba(8,17,23,.76)');x.fillStyle=glass;x.roundRect(4,5,760,116,18);x.fill();x.lineWidth=2;x.strokeStyle='rgba(231,242,238,.36)';x.stroke();x.beginPath();x.moveTo(24,8);x.lineTo(744,8);x.strokeStyle='rgba(255,255,255,.16)';x.lineWidth=3;x.stroke();x.fillStyle=color;let fontSize=80;do{x.font=`700 ${fontSize}px sans-serif`;fontSize-=4;}while(x.measureText(text).width>690&&fontSize>24);x.textAlign='center';x.fillText(text,384,90);
 const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const s=new T.Sprite(new T.SpriteMaterial({map,depthTest:true,transparent:true}));s.scale.set(15*scale,2.5*scale,1);return s;
}
function surface(fn:(x:number,z:number)=>number,minX:number,maxX:number,minZ:number,maxZ:number,n=32){
 const p:number[]=[],uv:number[]=[],idx:number[]=[];
 for(let j=0;j<=n;j++)for(let i=0;i<=n;i++){const x=minX+(maxX-minX)*i/n,z=minZ+(maxZ-minZ)*j/n;p.push(x,fn(x,z),z);uv.push(x/12,z/12);}
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i;idx.push(a,a+n+1,a+1,a+1,a+n+1,a+n+2);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
function sector(lift=0,nr=20,nt=60){const p:number[]=[],idx:number[]=[];for(let j=0;j<=nt;j++)for(let i=0;i<=nr;i++){const a=-Math.PI/4+j/nt*Math.PI/4,r=60+i/nr*12,x=r*Math.cos(a),z=r*Math.sin(a);p.push(x,height(x,z)+lift,z);}for(let j=0;j<nt;j++)for(let i=0;i<nr;i++){const a=j*(nr+1)+i;idx.push(a,a+nr+1,a+1,a+1,a+nr+1,a+nr+2);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();return g;}
function landscapeGeometry(){
 const coords=[...Array.from({length:50},(_,i)=>-780+i*13.2),...Array.from({length:200},(_,i)=>-120+i*1.2),...Array.from({length:51},(_,i)=>120+i*13.2)],n=coords.length,p:number[]=[],uv:number[]=[],idx:number[]=[];
 for(const z of coords)for(const x of coords){p.push(x,landscape(x,z),z);uv.push(x/12,z/12);}
 for(let j=0;j<n-1;j++)for(let i=0;i<n-1;i++){const a=j*n+i;idx.push(a,a+n,a+1,a+1,a+n,a+n+1);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
function disposeGroup(g:T.Group){g.traverse(o=>{const m=o as T.Mesh;if(m.geometry)m.geometry.dispose();if(m.material){(Array.isArray(m.material)?m.material:[m.material]).forEach(mat=>{const map=(mat as T.SpriteMaterial).map;if(o instanceof T.Sprite)map?.dispose();mat.dispose();});}});g.clear();}

export function createMarsScene(host:HTMLDivElement,onTelemetry:(t:Telemetry)=>void,onParameter?:(value:number)=>void,onDay?:(value:number)=>void,onMotionComplete?:()=>void,onAssets?:(state:ModelAssets)=>void):SceneHandle {
 const assetTracker=trackModelAssets(state=>onAssets?.(state));
 const logisticsPreview=new URLSearchParams(window.location.search).get('drive')==='1';
 const scene=new T.Scene();scene.background=new T.Color('#967061');scene.fog=new T.FogExp2('#ad8270',.0015);
 const camera=new T.PerspectiveCamera(52,host.clientWidth/host.clientHeight,.12,1800);camera.position.set(207,185,238);
 const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setSize(host.clientWidth,host.clientHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.localClippingEnabled=true;host.appendChild(renderer.domElement);
 const composer=new EffectComposer(renderer);composer.setPixelRatio(Math.min(devicePixelRatio,1.35));const renderPass=new RenderPass(scene,camera),gtao=new GTAOPass(scene,camera,host.clientWidth,host.clientHeight);gtao.blendIntensity=.18;gtao.updateGtaoMaterial({radius:.16,distanceExponent:1.7,thickness:.82,samples:8,screenSpaceRadius:true});const bloom=new UnrealBloomPass(new T.Vector2(host.clientWidth,host.clientHeight),.24,.35,1.05);composer.addPass(renderPass);composer.addPass(gtao);composer.addPass(bloom);composer.addPass(new OutputPass());
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(26,22,-15);controls.enableDamping=true;controls.minDistance=8;controls.maxDistance=580;controls.maxPolarAngle=Math.PI*.49;
 controls.addEventListener('start',()=>{targetCamera=null;targetLook=null;});
 const hemi=new T.HemisphereLight('#f0dfcc','#69503f',2.05);scene.add(hemi);
 const sun=new T.DirectionalLight('#ffe0b2',3.3);sun.position.set(-160,135,-120);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-190,right:190,top:190,bottom:-190,near:1,far:600});sun.shadow.normalBias=.08;scene.add(sun);
 const skyUniforms={horizon:{value:new T.Color('#b77658')},zenith:{value:new T.Color('#202b36')}};const sky=new T.Mesh(new T.SphereGeometry(1100,40,24),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:skyUniforms,vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 p;uniform vec3 horizon;uniform vec3 zenith;void main(){float h=normalize(p).y;vec3 c=mix(horizon,zenith,smoothstep(0.,.85,h));gl_FragColor=vec4(c,1.);}'}));scene.add(sky);
 const textures:T.Texture[]=[];const loader=new T.TextureLoader(assetTracker.manager);const load=(url:string,srgb=false,repeat=1)=>{const t=loader.load(url);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(repeat,repeat);if(srgb)t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;textures.push(t);return t;};
 const regolith=load(assetUrl('/assets/mars-regolith-pbr-v3.png'),true),normal=load(assetUrl('/materials/rock_06_nor_gl_2k.jpg')),rough=load(assetUrl('/materials/rock_06_rough_2k.jpg'));
 const terrainMaterial=new T.MeshStandardMaterial({color:'#c8aa93',map:regolith,normalMap:normal,normalScale:new T.Vector2(.34,.34),roughnessMap:rough,roughness:1});
 const terrain=new T.Mesh(landscapeGeometry(),terrainMaterial);terrain.receiveShadow=true;scene.add(terrain);
 const elevationBands=createElevationBands();elevationBands.visible=false;scene.add(elevationBands);
 const atmosphericDust=createAtmosphericDust(seeded);scene.add(atmosphericDust);
 const {group:moons,phobos,deimos}=createMoons();scene.add(moons);
 const outerCraters=createOuterCraters(regolith,normal);scene.add(outerCraters);
 const pearl=new T.MeshStandardMaterial({color:'#d8d7ca',roughness:.45,metalness:.48});
 const graphite=new T.MeshStandardMaterial({color:'#26373d',roughness:.6,metalness:.55});
 const walkwaySurface=new T.MeshStandardMaterial({color:'#b99d7c',roughness:.92,metalness:.04});
 const walkwayGuide=new T.MeshStandardMaterial({color:'#78968b',roughness:.62,metalness:.14,emissive:'#263d38',emissiveIntensity:.08});
 const walkwayRib=new T.MeshStandardMaterial({color:'#d7c1a0',roughness:.82,metalness:.06});
 const platformSurface=new T.MeshStandardMaterial({color:'#a28a70',map:regolith,roughness:.94,metalness:.06});
 const copper=new T.MeshStandardMaterial({color:'#c4623b',metalness:.5,roughness:.45});
 const powerConduit=new T.MeshStandardMaterial({color:'#45616b',metalness:.3,roughness:.62});
 const glow=new T.MeshStandardMaterial({color:'#c4e9e3',emissive:'#65c5c6',emissiveIntensity:.65,roughness:.3});
 const glass=new T.MeshPhysicalMaterial({color:'#83b8ba',transparent:true,opacity:.32,metalness:.15,roughness:.17,side:T.DoubleSide,depthWrite:false});
 const enclosureGlass=new T.MeshPhysicalMaterial({color:'#b0d3cf',transparent:true,opacity:.62,metalness:.12,roughness:.24,side:T.DoubleSide,depthWrite:false});
 const hatchLeaf=new T.MeshStandardMaterial({color:'#d8d3be',metalness:.43,roughness:.44,side:T.DoubleSide});
 const obstacles:{x:number;z:number;r:number}[]=[];
 const buildings=new T.Group();scene.add(buildings);
 const installationLabels=new T.Group();installationLabels.name='Rótulos funcionales · plano integrado';buildings.add(installationLabels);
 const mesh=(geo:T.BufferGeometry,mat:T.Material,x:number,y:number,z:number,parent:T.Object3D=buildings)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
 const box=(x:number,y:number,z:number,w:number,h:number,d:number,mat:T.Material,parent:T.Object3D=buildings)=>mesh(new T.BoxGeometry(w,h,d),mat,x,y,z,parent);
 // Batch pavers and their route inlays so functional wayfinding adds only two draw calls.
 const pavingCapacity=1024,pavingPose=new T.Object3D(),pavingTiles=new T.InstancedMesh(new T.BoxGeometry(1,1,1),walkwaySurface,pavingCapacity),pavingInlays=new T.InstancedMesh(new T.BoxGeometry(1,1,1),walkwayGuide,pavingCapacity);let pavingCount=0;
 pavingTiles.count=pavingInlays.count=0;pavingTiles.castShadow=pavingTiles.receiveShadow=pavingInlays.castShadow=pavingInlays.receiveShadow=true;buildings.add(pavingTiles,pavingInlays);
 const paving=(x:number,y:number,z:number,width:number,length:number,angle:number)=>{if(pavingCount>=pavingCapacity)throw new Error('La red de andadores excedió la capacidad de adoquines instanciados.');pavingPose.position.set(x,y,z);pavingPose.rotation.set(0,angle,0);pavingPose.scale.set(width,.12,length);pavingPose.updateMatrix();pavingTiles.setMatrixAt(pavingCount,pavingPose.matrix);pavingPose.position.y+=.052;pavingPose.scale.set(Math.min(.15,width*.12),.012,length*.56);pavingPose.updateMatrix();pavingInlays.setMatrixAt(pavingCount,pavingPose.matrix);pavingCount++;pavingTiles.count=pavingInlays.count=pavingCount;};
 paving(SERVICE_JUNCTION.x,landscape(SERVICE_JUNCTION.x,SERVICE_JUNCTION.z)+.07,SERVICE_JUNCTION.z,SERVICE_JUNCTION.size,SERVICE_JUNCTION.size,0);
 const rod=(a:T.Vector3,b:T.Vector3,r:number,mat:T.Material,parent:T.Object3D=buildings)=>{const delta=b.clone().sub(a),m=mesh(new T.CylinderGeometry(r,r,delta.length(),10),mat,0,0,0,parent);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(V(0,1,0),delta.normalize());return m;};
 const sealedHatch=(center:T.Vector3,normal:T.Vector3,radius:number)=>{
  const assembly=new T.Group();assembly.position.copy(center);assembly.quaternion.setFromUnitVectors(V(0,0,1),normal.clone().normalize());buildings.add(assembly);
  mesh(new T.CircleGeometry(radius-.055,40),hatchLeaf,0,0,0,assembly);
  mesh(new T.TorusGeometry(radius-.035,.045,8,40),pearl,0,0,.022,assembly);
  const window=mesh(new T.CircleGeometry(.24,24),glass,0,.16,.027,assembly);window.castShadow=false;
  mesh(new T.TorusGeometry(.255,.025,6,24),graphite,0,.16,.045,assembly);
 };
 const sign=(text:string,x:number,z:number,y:number)=>{const tag=label(text,'#e3f2eb',.68);tag.position.set(x,y,z);tag.material.depthTest=false;tag.material.depthWrite=false;tag.renderOrder=14;installationLabels.add(tag);};
 const pressureCorridor=(a:T.Vector3,b:T.Vector3,fit?:{radius:number;floorOffset:number;portalRadius?:number;archHeight?:number;stairs?:boolean;hatches?:boolean;plan?:(t:number)=>T.Vector3})=>{
  const delta=b.clone().sub(a),radius=fit?.radius??1.28,floorOffset=fit?.floorOffset??.93;
  const count=Math.max(12,Math.ceil(delta.length()/.45));
  const at=(t:number)=>fit?.plan?.(t)??a.clone().lerp(b,t).add(V(0,(fit?.archHeight??0)*Math.sin(Math.PI*t)**2,0));
  const points=Array.from({length:count+1},(_,i)=>at(i/count)),curve=new T.CatmullRomCurve3(points);
  const shell=mesh(new T.TubeGeometry(curve,count,radius,16,false),glass,0,0,0);shell.castShadow=false;
  // A full-width tread follows the sealed span; the former thin rod was not a floor.
  const floorWidth=fit?1.05:1.35,floorVertices:number[]=[],floorIndices:number[]=[];
  for(let i=0;i<=count;i++){
   const p=points[i],tangent=curve.getTangent(i/count),lateral=V(tangent.z,0,-tangent.x).normalize();
   for(const side of [-1,1]){const edge=p.clone().addScaledVector(lateral,side*floorWidth/2);floorVertices.push(edge.x,edge.y-floorOffset,edge.z);}
   if(i<count){const k=i*2;floorIndices.push(k,k+2,k+1,k+1,k+2,k+3);}
  }
  const floorGeometry=new T.BufferGeometry();floorGeometry.setAttribute('position',new T.Float32BufferAttribute(floorVertices,3));floorGeometry.setIndex(floorIndices);floorGeometry.computeVertexNormals();
  if(fit?.stairs){
   const steps=Math.ceil(Math.abs(b.y-a.y)/.15),run=Math.hypot(b.x-a.x,b.z-a.z),yaw=Math.atan2(b.x-a.x,b.z-a.z);
   for(let i=0;i<steps;i++){const t=(i+.5)/steps,p=a.clone().lerp(b,t),tread=box(p.x,a.y-floorOffset+(b.y-a.y)*(i+1)/steps-.045,p.z,floorWidth,.09,run/steps+.035,walkwaySurface);tread.rotation.y=yaw;}
   floorGeometry.dispose();
  }else{const floor=mesh(floorGeometry,walkwaySurface,0,0,0);floor.castShadow=false;}
  if(fit){
   for(const side of [-1,1]){
    const railPoints=points.map((p,i)=>{const tangent=curve.getTangent(i/count),lateral=V(tangent.z,0,-tangent.x).normalize();return p.clone().addScaledVector(lateral,side*(floorWidth/2-.06)).add(V(0,-floorOffset+.67,0));});
    mesh(new T.TubeGeometry(new T.CatmullRomCurve3(railPoints),count,.035,6,false),pearl,0,0,0);
   }
   for(let i=2;i<count;i+=2){const p=points[i],tangent=curve.getTangent(i/count),lateral=V(tangent.z,0,-tangent.x).normalize(),left=p.clone().addScaledVector(lateral,-floorWidth/2+.08).add(V(0,-floorOffset+.025,0)),right=p.clone().addScaledVector(lateral,floorWidth/2-.08).add(V(0,-floorOffset+.025,0));rod(left,right,.023,walkwayRib);}
   if(fit.hatches!==false){sealedHatch(a,curve.getTangent(0),radius-.025);sealedHatch(b,curve.getTangent(1),radius-.025);}
  }
  for(let i=1;i<count;i+=Math.max(1,Math.floor(count/8))){const t=i/count,ring=mesh(new T.TorusGeometry(radius+.015,.055,6,24),pearl,0,0,0);ring.position.copy(curve.getPointAt(t));ring.quaternion.setFromUnitVectors(V(0,0,1),curve.getTangentAt(t).normalize());}
  if(fit?.portalRadius&&fit.portalRadius>radius){const cuffLength=.42,axisY=V(0,1,0),axisZ=V(0,0,1);for(const atStart of [true,false]){const t=atStart?0:1,cuffT=atStart ? .5*cuffLength/delta.length() : 1-.5*cuffLength/delta.length(),center=curve.getPointAt(cuffT),normal=curve.getTangentAt(atStart ? .001 : .999).normalize(),cuff=mesh(atStart?new T.CylinderGeometry(radius,fit.portalRadius,cuffLength,32,1,true):new T.CylinderGeometry(fit.portalRadius,radius,cuffLength,32,1,true),glass,center.x,center.y,center.z);cuff.quaternion.setFromUnitVectors(axisY,normal);const frame=mesh(new T.TorusGeometry(fit.portalRadius,.075,8,32),pearl,0,0,0);frame.position.copy(curve.getPointAt(t));frame.quaternion.setFromUnitVectors(axisZ,normal);}}
 };
 const pressureBridge=(a:T.Vector3,b:T.Vector3)=>{const arch=(t:number)=>a.clone().lerp(b,t).add(V(0,4.5*Math.sin(Math.PI*t),0));for(let i=0;i<24;i++)pressureCorridor(arch(i/24),arch((i+1)/24));};
 function foundation(x:number,z:number,r:number,margin=.45){let top=-Infinity,bottom=Infinity;for(let i=0;i<48;i++){const a=i/48*Math.PI*2;top=Math.max(top,landscape(x+r*Math.cos(a),z+r*Math.sin(a)));bottom=Math.min(bottom,landscape(x+(r+2)*Math.cos(a),z+(r+2)*Math.sin(a)));}top+=margin;bottom-=.45;mesh(new T.CylinderGeometry(r+.1,r+2.2,top-bottom,64),new T.MeshStandardMaterial({map:regolith,color:'#aa795b',roughness:1,normalMap:normal,normalScale:new T.Vector2(.15,.15)}),x,(top+bottom)/2,z);mesh(new T.CylinderGeometry(r,r,.45,64),platformSurface,x,top,z);return top+.225;}
 const bx=HABITAT.x,bz=HABITAT.z,baseY=foundation(bx,bz,11.3,.05);
 // A small physical beacon marks the analytically selected B+ site. The rover
 // route begins here; keeping the main habitat offset preserves route clearance.
 const baseSiteX=EVA_BASE.x,baseSiteZ=EVA_BASE.y,baseSiteY=landscape(baseSiteX,baseSiteZ);
 const basePad=mesh(new T.CylinderGeometry(2.15,2.35,.18,40),platformSurface,baseSiteX,baseSiteY+.09,baseSiteZ);basePad.castShadow=false;
 const baseRing=mesh(new T.TorusGeometry(2.45,.08,8,48),glow,baseSiteX,baseSiteY+.19,baseSiteZ);baseRing.rotation.x=Math.PI/2;
 const baseBeacon=mesh(new T.CylinderGeometry(.16,.24,2.2,12),new T.MeshStandardMaterial({color:amber,emissive:amber,emissiveIntensity:.42,roughness:.4}),baseSiteX,baseSiteY+1.28,baseSiteZ);
 sign('B⁺ · ACCESO ÓPTIMO · 3.788%',baseSiteX,baseSiteZ,baseSiteY+5.2);
 const serviceEndX=EAST_SERVICE_WALKWAY.startX+(EAST_SERVICE_WALKWAY.endX-EAST_SERVICE_WALKWAY.startX)*EAST_SERVICE_WALKWAY.lastPaver/EAST_SERVICE_WALKWAY.divisions,serviceEndZ=EAST_SERVICE_WALKWAY.startY+(EAST_SERVICE_WALKWAY.endY-EAST_SERVICE_WALKWAY.startY)*EAST_SERVICE_WALKWAY.lastPaver/EAST_SERVICE_WALKWAY.divisions;
 for(let i=0;i<=4;i++){const t=i/4,x=serviceEndX+(baseSiteX-serviceEndX)*t,z=serviceEndZ+(baseSiteZ-serviceEndZ)*t;paving(x,landscape(x,z)+.08,z,1.7,1.35,Math.atan2(baseSiteX-serviceEndX,baseSiteZ-serviceEndZ));}
 for(let segment=0;segment<HABITAT_ACCESS_PATH.length-1;segment++){const a=HABITAT_ACCESS_PATH[segment],b=HABITAT_ACCESS_PATH[segment+1],divisions=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/1.5),angle=Math.atan2(b.x-a.x,b.z-a.z);if(segment>0)paving(a.x,walkFloor(a.x,a.z)+.09,a.z,1.7,1.7,0);for(let i=1;i<=divisions;i++){const t=i/divisions,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;paving(x,walkFloor(x,z)+.09,z,1.5,1.5,angle);}}
 // The south airlock apron is a continuous, handrailed ramp from the raised
 // threshold to regolith; this is the crew's actual exterior way in.
 const airlockRampStart=HABITAT.airlockZ-4.2,airlockRampEnd=HABITAT.airlockZ-17.4;
 for(const side of [-1,1]){const x=HABITAT.airlockX+side*1.05,a=V(x,walkFloor(HABITAT.airlockX,airlockRampStart)+1.05,airlockRampStart),b=V(x,walkFloor(HABITAT.airlockX,airlockRampEnd)+1.05,airlockRampEnd);rod(a,b,.055,walkwayRib);for(let i=0;i<=4;i++){const t=i/4,z=airlockRampStart+(airlockRampEnd-airlockRampStart)*t,p=V(x,walkFloor(HABITAT.airlockX,z)+.15,z);rod(p,V(x,p.y+.9,z),.045,pearl);}}
 const innerWall=pearl.clone();innerWall.side=T.DoubleSide;
 const habitatPowerPort=SOLAR_POWER_SERVICE.habitat.port;
 mesh(habitatWallGeometry([{angle:-Math.PI/2,centerY:HABITAT.floor+.93-baseY,radius:1.36},{angle:HABITAT_RING_ACCESS.angle,centerY:HABITAT_RING_ACCESS.centerY-baseY,radius:HABITAT_RING_ACCESS.openingRadius},{angle:habitatPowerPort.angle,centerY:habitatPowerPort.centerY-baseY,radius:habitatPowerPort.radius},...LAB_ACCESS.map(lab=>({angle:lab.angle,centerY:lab.habitatCenterY-baseY,radius:lab.openingRadius}))]),innerWall,bx,baseY,bz);
 mesh(new T.CylinderGeometry(10.1,10.1,.18,64),new T.MeshStandardMaterial({color:'#687c7c',roughness:.85}),bx,baseY+.09,bz);
 const ringNormal=V(Math.cos(HABITAT_RING_ACCESS.angle),0,Math.sin(HABITAT_RING_ACCESS.angle)),ringTangent=V(-ringNormal.z,0,ringNormal.x),ringFrame=mesh(new T.TorusGeometry(HABITAT_RING_ACCESS.openingRadius+.04,.08,8,40),pearl,HABITAT_RING_ACCESS.x,HABITAT_RING_ACCESS.centerY,HABITAT_RING_ACCESS.z);
 ringFrame.quaternion.setFromUnitVectors(V(0,0,1),ringNormal);
 const powerNormal=V(Math.cos(habitatPowerPort.angle),0,Math.sin(habitatPowerPort.angle));
 const powerFrame=mesh(new T.TorusGeometry(habitatPowerPort.radius+.025,.035,8,24),walkwayRib,habitatPowerPort.x,habitatPowerPort.centerY,habitatPowerPort.z);
 powerFrame.quaternion.setFromUnitVectors(V(0,0,1),powerNormal);
 rod(V(habitatPowerPort.x,habitatPowerPort.centerY,habitatPowerPort.z).addScaledVector(powerNormal,.4),V(habitatPowerPort.x,habitatPowerPort.centerY,habitatPowerPort.z).addScaledVector(powerNormal,-.9),.12,powerConduit);
 const powerTerminal=V(habitatPowerPort.x,habitatPowerPort.centerY,habitatPowerPort.z).addScaledVector(powerNormal,-1.05);
 box(powerTerminal.x,HABITAT.floor+.45,powerTerminal.z,.62,.78,.5,walkwayRib);
 box(powerTerminal.x,HABITAT.floor+.45,powerTerminal.z-.26,.4,.4,.025,graphite);
 sealedHatch(V(HABITAT_RING_ACCESS.x,HABITAT_RING_ACCESS.centerY,HABITAT_RING_ACCESS.z).addScaledVector(ringTangent,2.8).addScaledVector(ringNormal,.12),ringNormal,HABITAT_RING_ACCESS.openingRadius-.07);
 for(const lab of LAB_ACCESS){const normal=V(Math.cos(lab.angle),0,Math.sin(lab.angle)),tangent=V(-normal.z,0,normal.x),center=V(lab.habitatX,lab.habitatCenterY,lab.habitatZ),frame=mesh(new T.TorusGeometry(lab.openingRadius+.04,.08,8,40),pearl,center.x,center.y,center.z);frame.quaternion.setFromUnitVectors(V(0,0,1),normal);sealedHatch(center.clone().addScaledVector(tangent,lab.index===0?2.55:-2.55).addScaledVector(normal,.12),normal,lab.openingRadius-.08);}
 const dome=mesh(new T.SphereGeometry(10,64,32,0,Math.PI*2,0,Math.PI/2),glass,bx,baseY+2.7,bz);dome.scale.y=.67;dome.castShadow=false;
 for(let k=0;k<12;k++){const a=k/12*Math.PI*2;const pts:T.Vector3[]=[];for(let j=0;j<=28;j++){const t=j/28*Math.PI/2;pts.push(V(bx+10*Math.cos(t)*Math.cos(a),baseY+2.7+6.7*Math.sin(t),bz+10*Math.cos(t)*Math.sin(a)));}mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),30,.08,6,false),pearl,0,0,0);}
 for(let k=0;k<3;k++){const yy=1.5+k*1.5,rr=10*Math.sqrt(1-(yy/6.7)**2);const rim=mesh(new T.TorusGeometry(rr,.075,6,80),pearl,bx,baseY+2.7+yy,bz);rim.rotation.x=Math.PI/2;}
 for(let k=0;k<12;k++){const a=k/12*Math.PI*2,angularGap=(b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));if(angularGap(HABITAT_RING_ACCESS.angle)<.23||angularGap(-Math.PI/2)<.23||angularGap(habitatPowerPort.angle)<.23||LAB_ACCESS.some(lab=>angularGap(lab.angle)<.23))continue;const pane=box(bx+10.15*Math.cos(a),baseY+1.5,bz+10.15*Math.sin(a),2.4,.8,.08,glow);pane.rotation.y=-a+Math.PI/2;}
 // Interior map table: a miniature of the same analytical terrain, surrounded by circulation.
 mesh(new T.CylinderGeometry(1.65,1.45,.85,48),pearl,bx,HABITAT.floor+.425,bz);
 mesh(new T.CylinderGeometry(1.95,1.95,.12,64),graphite,bx,HABITAT.floor+.91,bz);
 const modelMap=mesh(surface((x,z)=>height(x,z)-16,-80,80,-80,80,60),terrainMaterial.clone(),bx,HABITAT.floor+1,bz);modelMap.scale.set(.016,.05,.016);
 for(let i=0;i<16;i++){const a=i/16*Math.PI*2;const stripe=box(bx+7.9*Math.cos(a),HABITAT.floor+.015,bz+7.9*Math.sin(a),.07,.015,1.65,glow);stripe.rotation.y=-a;}
 const roomLight=new T.PointLight('#d8f2ec',65,22,1.5);roomLight.position.set(bx,baseY+5.7,bz);buildings.add(roomLight);
 const campusLights=[[-28,-52],[2,-78],[81,-39]].map(([x,z])=>{const lamp=new T.PointLight('#ffd39c',0,62,1.65);lamp.position.set(x,landscape(x,z)+9,z);scene.add(lamp);return lamp;});
 const screenCanvas=document.createElement('canvas');screenCanvas.width=768;screenCanvas.height=384;const screenContext=screenCanvas.getContext('2d')!;const screenTexture=new T.CanvasTexture(screenCanvas);screenTexture.colorSpace=T.SRGBColorSpace;
 const screenMaterial=new T.MeshBasicMaterial({map:screenTexture,toneMapped:false});
 function updateInteriorScreens(value:string,detail:string){screenContext.fillStyle='#061419';screenContext.fillRect(0,0,768,384);screenContext.fillStyle='#71e4d8';screenContext.font='700 28px monospace';screenContext.fillText('EVA03 · TELEMETRÍA COMPARTIDA',34,52);screenContext.strokeStyle='#244e52';for(let y=84;y<360;y+=46){screenContext.beginPath();screenContext.moveTo(30,y);screenContext.lineTo(738,y);screenContext.stroke();}screenContext.fillStyle='#f1c88e';screenContext.font='700 44px monospace';screenContext.fillText(value.slice(0,29),34,136);screenContext.fillStyle='#b8d4d0';screenContext.font='24px sans-serif';const words=detail.split(' ');let row='',lineY=194;for(const word of words){const next=`${row} ${word}`.trim();if(screenContext.measureText(next).width>690){screenContext.fillText(row,34,lineY);row=word;lineY+=38;}else row=next;if(lineY>342)break;}screenContext.fillText(row,34,lineY);screenTexture.needsUpdate=true;}
 updateInteriorScreens('SISTEMA EN LÍNEA','Selecciona una evidencia para reflejar aquí su telemetría real.');
 for(const [x,z,angle] of [[bx-5.3,bz+4.1,.9],[bx+5.3,bz+4.1,-.9],[bx,bz-6.3,Math.PI]] as [number,number,number][]){const display=mesh(new T.PlaneGeometry(3.7,1.85),screenMaterial,x,HABITAT.floor+2.45,z);display.rotation.y=angle;}
 const godRays=createGodRays(bx,baseY+2.5,bz);buildings.add(godRays);
 for(const [text,x,z] of [['TOPOGRAFÍA / TERRENO',bx-5,bz+3],['MOVILIDAD / ROVER',bx+5,bz+3],['RECURSOS / VOLUMEN Y MASA',bx,bz-5.8]] as [string,number,number][]){const smallSign=label(text,'#d9efed',.19);smallSign.position.set(x,baseY+2.5,z);buildings.add(smallSign);}
 // The airlock is set safely inside the route ring; the mathematical B+ marker is unchanged.
 const airlockX=HABITAT.airlockX,airlockZ=HABITAT.airlockZ,airlockY=foundation(airlockX,airlockZ,4.2,.70);mesh(new T.CylinderGeometry(4.2,4.7,HABITAT.airlockFloor-airlockY,48),new T.MeshStandardMaterial({color:'#ac8065',map:regolith,roughness:1}),airlockX,(HABITAT.airlockFloor+airlockY)/2,airlockZ);sign('HÁBITAT · ESTANCIA PRESURIZADA',bx,bz,baseY+11);
 // Corridor centerline sits above its tread by floorOffset. Portals therefore
 // meet the two actual floor elevations used by walkFloor and the camera.
 const habitatPassageFloorOffset=.93,passageA=V(airlockX,HABITAT.airlockFloor+habitatPassageFloorOffset,airlockZ+4.2),passageB=V(bx,HABITAT.floor+habitatPassageFloorOffset,bz-10.2);
 pressureCorridor(passageA,passageB,{radius:1.28,floorOffset:habitatPassageFloorOffset});
 for(const t of [.25,.5,.75])for(const side of [-1,1]){const center=passageA.clone().lerp(passageB,t),x=center.x+side*1.18,z=center.z;rod(ground(x,z,.12),V(x,center.y-.55,z),.09,pearl);}
 const rampX0=airlockX-1.65,rampX1=airlockX+1.65,rampEntranceZ=airlockZ-17.4,rampZ0=rampEntranceZ,rampZ1=airlockZ-10.8,ramp=mesh(surface(walkFloor,rampX0,rampX1,rampZ0,rampZ1,20),walkwaySurface,0,.025,0);ramp.receiveShadow=true;
 for(let i=1;i<8;i++){const z=rampZ0+(rampZ1-rampZ0)*i/8,y=walkFloor(airlockX,z)+.045;box(airlockX,y,z,3.2,.025,.1,walkwayRib);}
 for(const xx of [airlockX-1.6,airlockX+1.6])rod(V(xx,HABITAT.airlockFloor+1,airlockZ-4.2),ground(xx,rampEntranceZ,1.1),.055,pearl);
 sign('ENTRADA / HÁBITAT EXPLORABLE',airlockX,rampEntranceZ,Math.max(HABITAT.airlockFloor,landscape(airlockX,rampEntranceZ))+3.8);
 const labPads:{x:number;y:number;z:number}[]=[];for(const lab of LAB_ACCESS){const {x,z}=lab,y=foundation(x,z,8.4),start=V(lab.habitatX,lab.habitatCenterY,lab.habitatZ),end=V(lab.labX,y+3.3,z),run=Math.hypot(end.x-start.x,end.z-start.z),stairs=Math.abs(end.y-start.y)/run>.15;labPads.push({x,y,z});obstacles.push({x,z,r:8.5});pressureCorridor(start,end,{radius:lab.openingRadius,floorOffset:.93,stairs,hatches:false});
  const lateral=V(-(end.z-start.z)/run,0,(end.x-start.x)/run);for(const t of lab.index===0?[.38,.7]:[.25,.5,.75]){const p=start.clone().lerp(end,t),beamY=p.y-lab.openingRadius-.08,feet=[p.clone().addScaledVector(lateral,-1.45),p.clone().addScaledVector(lateral,1.45)];rod(V(feet[0].x,beamY,feet[0].z),V(feet[1].x,beamY,feet[1].z),.1,walkwayRib);for(const foot of feet){const groundY=landscape(foot.x,foot.z);rod(V(foot.x,groundY+.15,foot.z),V(foot.x,beamY,foot.z),.12,walkwayRib);mesh(new T.CylinderGeometry(.28,.32,.16,12),platformSurface,foot.x,groundY+.08,foot.z);}}
  sign(`LABORATORIO ${lab.index===0?'A':'B'} · MUESTRAS Y ANÁLISIS`,x,z,y+10);}
 const mastX=89,mastZ=-62,mastY=landscape(mastX,mastZ);rod(V(mastX,mastY,mastZ),V(mastX,mastY+18,mastZ),.18,pearl);for(const [dx,dz] of [[3,3],[-3,3],[0,-3]])rod(ground(mastX+dx,mastZ+dz),V(mastX,mastY+11,mastZ),.035,graphite);const dish=mesh(new T.SphereGeometry(2.8,32,16,0,Math.PI*2,0,Math.PI*.4),pearl,mastX,mastY+17,mastZ);dish.scale.y=.25;dish.rotation.z=.45;
 // Ellipsoidal storage: internal volume and outer structure use one common local frame.
 const tankDisplay=new T.Group();scene.add(tankDisplay);const tankShell=new T.Group();tankDisplay.add(tankShell);const tx=MARS.tankX,tz=MARS.tankY,ty=tankFloor;
 obstacles.push({x:tx,z:tz,r:18.7});
 for(let i=0;i<20;i++){const a=i/20*Math.PI*2,x=tx+18*Math.cos(a),z=tz+14*Math.sin(a);rod(ground(x,z,-.3),V(x,ty,z),.34,graphite,tankDisplay);}
 const tankBase=mesh(new T.CylinderGeometry(1,1,.5,64),graphite,tx,ty-.25,tz,tankDisplay);tankBase.scale.set(18,1,14);
 const tankBermBottom=Math.min(...Array.from({length:48},(_,i)=>landscape(tx+20*Math.cos(i/48*Math.PI*2),tz+16*Math.sin(i/48*Math.PI*2))))-.5;
 const tankBerm=mesh(new T.CylinderGeometry(1,1.13,ty-tankBermBottom-.5,64),new T.MeshStandardMaterial({color:'#a6775d',map:regolith,roughness:1}),tx,(ty-.5+tankBermBottom)/2,tz,tankDisplay);tankBerm.scale.set(18,1,14);
 const shellMat=new T.MeshStandardMaterial({color:'#c7bfa9',metalness:.32,roughness:.65,normalMap:normal,normalScale:new T.Vector2(.035,.035),side:T.DoubleSide});
 const shell=mesh(new T.SphereGeometry(1,64,32,0,Math.PI*2,0,Math.PI/2),shellMat,tx,ty,tz,tankShell);shell.scale.set(18,8,14);
 const xrayGroup=new T.Group();xrayGroup.visible=false;scene.add(xrayGroup);const cutGround=landscape(tx,tz);for(let layer=0;layer<5;layer++){const band=new T.Mesh(new T.PlaneGeometry(26,.88),new T.MeshBasicMaterial({color:new T.Color().setHSL(.045+layer*.026,.62,.34+layer*.052),transparent:true,opacity:.78,side:T.DoubleSide,depthTest:false,depthWrite:false}));band.position.set(tx+.08,cutGround-.55-layer*.9,tz);band.rotation.y=Math.PI/2;band.renderOrder=8;xrayGroup.add(band);}const sectionFrame=new T.LineSegments(new T.EdgesGeometry(new T.PlaneGeometry(26,4.5)),new T.LineBasicMaterial({color:0xf3d1a9,transparent:true,opacity:.78,depthTest:false}));sectionFrame.position.set(tx+.09,cutGround-2.35,tz);sectionFrame.rotation.y=Math.PI/2;sectionFrame.renderOrder=9;xrayGroup.add(sectionFrame);
 for(let i=0;i<12;i++){const a=i/12*Math.PI*2,p:T.Vector3[]=[];for(let j=0;j<=28;j++){const q=j/28*Math.PI/2;p.push(V(tx+18*Math.cos(q)*Math.cos(a),ty+8*Math.sin(q),tz+14*Math.cos(q)*Math.sin(a)));}mesh(new T.TubeGeometry(new T.CatmullRomCurve3(p),28,.09,6,false),graphite,0,0,0,tankShell);}
 // Panel seams follow the real ellipsoid; they remain part of the removable outer shell.
 for(const elevation of [1.7,3.8,5.6,7]){const radius=Math.sqrt(1-elevation*elevation/64),points=Array.from({length:129},(_,i)=>{const a=i/128*Math.PI*2;return V(tx+18.015*radius*Math.cos(a),ty+elevation,tz+14.015*radius*Math.sin(a));});mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),128,.035,5,false),graphite,0,0,0,tankShell);}
 const bolts=new T.InstancedMesh(new T.SphereGeometry(.095,6,4),graphite,48),boltPose=new T.Object3D();let boltIndex=0;
 for(let i=0;i<12;i++)for(const elevation of [1.7,3.8,5.6,7]){const a=i/12*Math.PI*2,r=Math.sqrt(1-elevation*elevation/64);boltPose.position.set(tx+18.08*r*Math.cos(a),ty+elevation+.025,tz+14.08*r*Math.sin(a));boltPose.updateMatrix();bolts.setMatrixAt(boltIndex++,boltPose.matrix);}tankShell.add(bolts);
 // Irregular regolith apron softens the engineered berm without altering f(x,y).
 const apronPositions:number[]=[],apronUV:number[]=[],apronIndices:number[]=[];
 for(let j=0;j<=6;j++)for(let i=0;i<=96;i++){const a=i/96*Math.PI*2,t=j/6,wave=.55*Math.sin(a*7)+.3*Math.cos(a*13),x=tx+(18.2+t*(6+wave))*Math.cos(a),z=tz+(14.2+t*(5+wave))*Math.sin(a),groundY=landscape(x,z),y=(1-t)*(ty-.3)+t*groundY+.12*Math.sin(Math.PI*t)*(1+Math.sin(a*9));apronPositions.push(x,Math.max(groundY+.025,y),z);apronUV.push(x/8,z/8);}
 for(let j=0;j<6;j++)for(let i=0;i<96;i++){const a=j*97+i;apronIndices.push(a,a+1,a+97,a+1,a+98,a+97);}const apronGeometry=new T.BufferGeometry();apronGeometry.setAttribute('position',new T.Float32BufferAttribute(apronPositions,3));apronGeometry.setAttribute('uv',new T.Float32BufferAttribute(apronUV,2));apronGeometry.setIndex(apronIndices);apronGeometry.computeVertexNormals();mesh(apronGeometry,new T.MeshStandardMaterial({color:'#b38566',map:regolith,normalMap:normal,normalScale:new T.Vector2(.18,.18),roughness:1}),0,0,0,tankDisplay);
 sign('DEPÓSITO E · 4 222.301 m³',tx,tz,ty+11);
 // The original 20 panels remain the integral-R demonstrator. A distinct
 // 24-panel service field supports the separately stated campus load case.
 const solarPads=[...SOLAR_ARRAY_LAYOUT,...SOLAR_SUPPORT_LAYOUT].map(({x,z,angle})=>({x,z,a:angle}));
 sign('R · 20 PANELES DE ESTUDIO',74,-28,height(74,-28)+7);
 sign('AMPLIACIÓN ELÉCTRICA · 24 PANELES',77,-72,height(77,-72)+7);
 // Navigable service walkways and lights carry a human scale.
 const servicePathLength=Math.hypot(EAST_SERVICE_WALKWAY.endX-EAST_SERVICE_WALKWAY.startX,EAST_SERVICE_WALKWAY.endY-EAST_SERVICE_WALKWAY.startY),servicePathX=(EAST_SERVICE_WALKWAY.endX-EAST_SERVICE_WALKWAY.startX)/servicePathLength,servicePathZ=(EAST_SERVICE_WALKWAY.endY-EAST_SERVICE_WALKWAY.startY)/servicePathLength,serviceJunctionExit=SERVICE_JUNCTION.size/(2*Math.max(Math.abs(servicePathX),Math.abs(servicePathZ)))+EAST_SERVICE_WALKWAY.paverLength/2,serviceStop=servicePathLength*EAST_SERVICE_WALKWAY.lastPaver/EAST_SERVICE_WALKWAY.divisions;
 for(let distance=serviceJunctionExit,tile=0;distance<=serviceStop;distance+=1.5,tile++){const t=distance/servicePathLength,x=EAST_SERVICE_WALKWAY.startX+t*(EAST_SERVICE_WALKWAY.endX-EAST_SERVICE_WALKWAY.startX),z=EAST_SERVICE_WALKWAY.startY+t*(EAST_SERVICE_WALKWAY.endY-EAST_SERVICE_WALKWAY.startY),y=landscape(x,z)+.12;paving(x,y,z,EAST_SERVICE_WALKWAY.paverWidth,EAST_SERVICE_WALKWAY.paverLength,Math.atan2(EAST_SERVICE_WALKWAY.endX-EAST_SERVICE_WALKWAY.startX,EAST_SERVICE_WALKWAY.endY-EAST_SERVICE_WALKWAY.startY));if(tile%4===0){rod(ground(x+2,z),ground(x+2,z,1.2),.06,pearl);mesh(new T.SphereGeometry(.13,8,6),glow,x+2,y+1.2,z);}}
 // Western campus: logistics, habitation and experimental biology stay within the study footprint.
 const workshopY=foundation(-20,-35,10);obstacles.push({x:-20,z:-35,r:10.2});
 // The south frontage retains only the sealed greenhouse crew hatch. Cargo
 // enters through the west wall, aligned with the raised loading deck.
 const workshopFrontZ=-40.9,workshopFacade=mesh(workshopFacadeGeometry(GREENHOUSE_CORRIDOR.startRise),enclosureGlass,-20,workshopY,workshopFrontZ);workshopFacade.castShadow=false;
 const workshopGable=new T.Shape();workshopGable.moveTo(-7,5.58);workshopGable.lineTo(0,7.26);workshopGable.lineTo(7,5.58);workshopGable.closePath();
 const gablePane=mesh(new T.ShapeGeometry(workshopGable),enclosureGlass,-20,workshopY,workshopFrontZ);gablePane.castShadow=false;
 const westFacade=mesh(workshopWestCargoWallGeometry(),enclosureGlass,-27,workshopY,-35);westFacade.rotation.y=Math.PI/2;westFacade.castShadow=false;
 const westShutter=mesh(new T.CylinderGeometry(.23,.23,WORKSHOP_WEST_BAY.width,16),pearl,-27.12,workshopY+WORKSHOP_WEST_BAY.height+.18,-35);westShutter.rotation.x=Math.PI/2;
 for(const side of [-1,1]){const z=-35+side*(WORKSHOP_WEST_BAY.width/2+.04);rod(V(-27.1,workshopY+.25,z),V(-27.1,workshopY+WORKSHOP_WEST_BAY.height,z),.045,pearl);}
 // Sliding leaves park against the adjacent wall during a cargo operation.
 // They start closed; the visual cycle does not certify pressure or actuation.
 let gateOpening=0,gateTarget=logisticsPreview?1:0;
 const gatePanels:{side:-1|1;group:T.Group}[]=[];
 for(const side of [-1,1] as const){
  const group=new T.Group();group.name=`workshop-west-gate-${side<0?'south':'north'}`;buildings.add(group);gatePanels.push({side,group});
  const z=WORKSHOP_WEST_GATE.centerZ+side*WORKSHOP_WEST_GATE.leafWidth/2;
  const leaf=box(WORKSHOP_WEST_GATE.planeX,workshopY+WORKSHOP_WEST_GATE.bottom+WORKSHOP_WEST_GATE.height/2,z,WORKSHOP_WEST_GATE.thickness,WORKSHOP_WEST_GATE.height,WORKSHOP_WEST_GATE.leafWidth-.025,enclosureGlass,group);
  leaf.castShadow=false;
  box(WORKSHOP_WEST_GATE.planeX-.085,workshopY+WORKSHOP_WEST_GATE.bottom+.46,z,.06,.92,WORKSHOP_WEST_GATE.leafWidth-.09,pearl,group);
  for(const rise of [WORKSHOP_WEST_GATE.bottom+.94,WORKSHOP_WEST_GATE.bottom+2.3,WORKSHOP_WEST_BAY.height-.03])rod(V(WORKSHOP_WEST_GATE.planeX-.09,workshopY+rise,z-WORKSHOP_WEST_GATE.leafWidth/2+.04),V(WORKSHOP_WEST_GATE.planeX-.09,workshopY+rise,z+WORKSHOP_WEST_GATE.leafWidth/2-.04),.038,pearl,group);
  const innerZ=WORKSHOP_WEST_GATE.centerZ-side*.025;
  rod(V(WORKSHOP_WEST_GATE.planeX-.1,workshopY+WORKSHOP_WEST_GATE.bottom,innerZ),V(WORKSHOP_WEST_GATE.planeX-.1,workshopY+WORKSHOP_WEST_BAY.height,innerZ),.06,graphite,group);
 }
 for(const z of [WORKSHOP_WEST_GATE.centerZ-WORKSHOP_WEST_BAY.width/2,WORKSHOP_WEST_GATE.centerZ+WORKSHOP_WEST_BAY.width/2])rod(V(WORKSHOP_WEST_GATE.planeX-.1,workshopY+WORKSHOP_WEST_GATE.bottom,z),V(WORKSHOP_WEST_GATE.planeX-.1,workshopY+WORKSHOP_WEST_BAY.height,z),.06,graphite);
 rod(V(-27,workshopY+5.6,workshopFrontZ-.08),V(-20,workshopY+7.26,workshopFrontZ-.08),.055,pearl);
 rod(V(-20,workshopY+7.26,workshopFrontZ-.08),V(-13,workshopY+5.6,workshopFrontZ-.08),.055,pearl);
 // The south ring reaches a real opening in the north wall, with an internal
 // ramp down to the workshop floor. The greenhouse connection stays untouched.
 const northWallMaterial=pearl.clone();northWallMaterial.side=T.DoubleSide;
 mesh(workshopNorthWallGeometry(WORKSHOP_NORTH_ACCESS.x+20,WORKSHOP_NORTH_ACCESS.centerRise,WORKSHOP_NORTH_ACCESS.radius),northWallMaterial,-20,workshopY,WORKSHOP_NORTH_ACCESS.z);
 const northDoorY=workshopY+WORKSHOP_NORTH_ACCESS.centerRise;
 mesh(new T.TorusGeometry(WORKSHOP_NORTH_ACCESS.radius+.06,.09,8,40),pearl,WORKSHOP_NORTH_ACCESS.x,northDoorY,WORKSHOP_NORTH_ACCESS.z);
 sealedHatch(V(WORKSHOP_NORTH_ACCESS.x+2.7,northDoorY,WORKSHOP_NORTH_ACCESS.z+.16),V(0,0,1),WORKSHOP_NORTH_ACCESS.radius-.08);
 const innerRampA=V(WORKSHOP_NORTH_ACCESS.x,northDoorY-.9,WORKSHOP_NORTH_ACCESS.z);
 const innerRampB=V(WORKSHOP_NORTH_ACCESS.x,workshopY+.225,WORKSHOP_NORTH_ACCESS.z-WORKSHOP_NORTH_ACCESS.interiorRampLength);
 const innerRampDelta=innerRampB.clone().sub(innerRampA),innerRamp=mesh(new T.BoxGeometry(1.65,.14,innerRampDelta.length()+.08),walkwaySurface,0,0,0);
 innerRamp.position.copy(innerRampA).add(innerRampB).multiplyScalar(.5);innerRamp.quaternion.setFromUnitVectors(V(0,0,1),innerRampDelta.normalize());
  const plantX=WATER_PLANT.x,plantZ=WATER_PLANT.z,plantY=foundation(plantX,plantZ,WATER_PLANT.foundationRadius);obstacles.push({x:plantX,z:plantZ,r:WATER_PLANT.foundationRadius});
 const landingX=-77,landingZ=-52,landingY=foundation(landingX,landingZ,14);obstacles.push({x:landingX,z:landingZ,r:16.2});
 // Sparse wheel traces branch tangentially from r(t) before its northwest end.
 // The mathematical half-arc and its arc length remain unchanged.
 const transfer=ROVER_LOGISTICS_TRANSFER;
 const logistics=createRoverLogisticsSurface(landingY,workshopY);
 const logisticsDrive=logisticsPreview?roverLogisticsDrivePath(logistics,workshopY):null;
 let logisticsTravel=logisticsDrive?logisticsDrive.length*Math.max(0,Math.min(.9,Number(new URLSearchParams(window.location.search).get('driveFrom')||0))):0;
 const {transferCurve,roadSection,rampCurve,rampCount,rampCenters,rampDistance,padDrivingTop,cargoStart,cargoEnd}=logistics;
 const transferCenters=Array.from({length:121},(_,i)=>transferCurve.getPoint(transfer.stabilizedStartT*i/120));
 for(const side of [-1,1]){
  const track=transferCenters.map((center,i)=>{const p=center.clone(),t=transferCurve.getTangent(transfer.stabilizedStartT*i/120),l=V(-t.z,0,t.x).normalize();p.addScaledVector(l,side*1.1);p.y=landscape(p.x,p.z)+.11;return p;});
  const trace=mesh(new T.TubeGeometry(new T.CatmullRomCurve3(track),120,.045,5,false),walkwayGuide,0,0,0);trace.castShadow=false;
 }
 // A compacted-regolith roadbed fills the low side of the outer slope before
 // the vehicle enters the raised ramp. It follows the existing logistics trace.
 const roadCount=140,roadVertices:number[]=[],roadFaces:number[]=[],roadEdges:[T.Vector3[],T.Vector3[]]=[[],[]],shoulderVertices:[number[],number[]]=[[],[]],shoulderFaces:[number[],number[]]=[[],[]];
 for(let i=0;i<=roadCount;i++){
  const time=transfer.stabilizedStartT+(transfer.rampStartT-transfer.stabilizedStartT)*i/roadCount,center=transferCurve.getPoint(time),tangent=transferCurve.getTangent(time),normal=V(-tangent.z,0,tangent.x).normalize(),edges=roadSection(time);
  for(const [index,e] of edges.entries()){roadVertices.push(e.x,e.top,e.z);roadEdges[index].push(V(e.x,e.top+.035,e.z));const side=index===0?-1:1,toeX=center.x+side*(transfer.width/2+transfer.shoulderWidth)*normal.x,toeZ=center.z+side*(transfer.width/2+transfer.shoulderWidth)*normal.z,vertices=shoulderVertices[index],faces=shoulderFaces[index];vertices.push(e.x,e.top,e.z,toeX,landscape(toeX,toeZ)+.03,toeZ);if(i<roadCount){const a=i*2,b=a+2;faces.push(a,a+1,b,a+1,b+1,b);}}
  for(const e of edges)roadVertices.push(e.x,e.ground+.03,e.z);
  if(i<roadCount){const a=i*4,b=a+4;roadFaces.push(a,a+1,b,a+1,b+1,b,b+2,b+3,a+2,b+3,a+3,a+2,a,b,a+2,a+2,b,b+2,a+1,a+3,b+1,a+3,b+3,b+1);}
 }
 const roadGeometry=new T.BufferGeometry();roadGeometry.setAttribute('position',new T.Float32BufferAttribute(roadVertices,3));roadGeometry.setIndex(roadFaces);roadGeometry.computeVertexNormals();
 const roadMaterial=new T.MeshStandardMaterial({map:regolith,color:'#bea080',roughness:1,side:T.DoubleSide});mesh(roadGeometry,roadMaterial,0,0,0);
 for(let side=0;side<2;side++){const shoulderGeometry=new T.BufferGeometry();shoulderGeometry.setAttribute('position',new T.Float32BufferAttribute(shoulderVertices[side],3));shoulderGeometry.setIndex(shoulderFaces[side]);shoulderGeometry.computeVertexNormals();mesh(shoulderGeometry,roadMaterial,0,0,0);}
 for(const edge of roadEdges)mesh(new T.TubeGeometry(new T.CatmullRomCurve3(edge),roadCount,.035,5,false),walkwayGuide,0,0,0);
 // The old straight slab cut into the west slope. A tangent curve starts on
 // the existing wheel trace; its two edges follow the surveyed crossfall at
 // the toe and gradually level out at the pad. Both are checked separately.
 const rampExit=V(transfer.rampEnd.x,0,transfer.rampEnd.z);
 const rampVertices:number[]=[],rampFaces:number[]=[],rampEdges:[T.Vector3[],T.Vector3[]]=[[],[]];
 for(let i=0;i<=rampCount;i++){
  const p=rampCenters[i],tangent=rampCurve.getTangent(i/rampCount),normal=V(-tangent.z,0,tangent.x).normalize();
  for(const [index,side] of [-1,1].entries()){
   const x=p.x+side*transfer.width/2*normal.x,z=p.z+side*transfer.width/2*normal.z,top=logistics.rampTop(index,i/rampCount);
   rampEdges[index].push(V(x,top+.05,z));rampVertices.push(x,top,z);
  }
  for(const [index,side] of [-1,1].entries())rampVertices.push(p.x+side*transfer.width/2*normal.x,logistics.rampTop(index,i/rampCount)-.14,p.z+side*transfer.width/2*normal.z);
  if(i<rampCount){const a=i*4,b=a+4;rampFaces.push(a,a+1,b,a+1,b+1,b,b+2,b+3,a+2,b+3,a+3,a+2,a,b,a+2,a+2,b,b+2,a+1,a+3,b+1,a+3,b+3,b+1);}
 }
 const rampGeometry=new T.BufferGeometry();rampGeometry.setAttribute('position',new T.Float32BufferAttribute(rampVertices,3));rampGeometry.setIndex(rampFaces);rampGeometry.computeVertexNormals();
 const rampMaterial=walkwaySurface.clone();rampMaterial.side=T.DoubleSide;mesh(rampGeometry,rampMaterial,0,0,0);
 for(const edge of rampEdges)mesh(new T.TubeGeometry(new T.CatmullRomCurve3(edge),rampCount,.055,6,false),walkwayGuide,0,0,0);
 for(const fraction of transfer.rampSupports)for(const edge of rampEdges){const p=edge[Math.round(fraction*rampCount)],groundY=landscape(p.x,p.z);if(p.y-groundY>.4)rod(V(p.x,groundY+.06,p.z),V(p.x,p.y-.22,p.z),.15,walkwayRib);}
 const transferRampB=V(rampExit.x,padDrivingTop,rampExit.z);
 const cargoDelta=cargoEnd.clone().sub(cargoStart),cargoRun=Math.hypot(cargoDelta.x,cargoDelta.z),cargoSide=V(-cargoDelta.z/cargoRun,0,cargoDelta.x/cargoRun);
 const padDelta=cargoEnd.clone().sub(transferRampB),padSide=V(-padDelta.z,0,padDelta.x).normalize();
 // A full-width, supported apron carries the rover from the terrain ramp to
 // the workshop deck. The former pair of guide rods had no traversable floor.
 const padDeckA=V(transferRampB.x,padDrivingTop-.08,transferRampB.z),padDeckB=V(cargoEnd.x,padDrivingTop-.08,cargoEnd.z);
 const padDeckDelta=padDeckB.clone().sub(padDeckA),padDeck=mesh(new T.BoxGeometry(transfer.width,.16,padDeckDelta.length()+.12),walkwaySurface,0,0,0);
 padDeck.position.copy(padDeckA).add(padDeckB).multiplyScalar(.5);padDeck.quaternion.setFromUnitVectors(V(0,0,1),padDeckDelta.normalize());
 for(const side of [-1,1]){const offset=padSide.clone().multiplyScalar(side*(transfer.width/2-.13));const edgeA=padDeckA.clone().add(offset),edgeB=padDeckB.clone().add(offset);rod(edgeA.clone().add(V(0,.14,0)),edgeB.clone().add(V(0,.14,0)),.055,walkwayGuide);if(Math.hypot(edgeA.x-landingX,edgeA.z-landingZ)>14){const foot=V(edgeA.x,landscape(edgeA.x,edgeA.z)+.06,edgeA.z);rod(foot,edgeA.clone().add(V(0,-.08,0)),.12,walkwayRib);}}
 const cargoDeck=mesh(new T.BoxGeometry(WORKSHOP_CARGO_LINK.width,.2,cargoDelta.length()+.24),walkwaySurface,0,0,0);cargoDeck.position.copy(cargoStart).add(cargoEnd).multiplyScalar(.5);cargoDeck.quaternion.setFromUnitVectors(V(0,0,1),cargoDelta.clone().normalize());
 for(const side of [-1,1]){const beam=mesh(new T.BoxGeometry(ROVER_TRANSFER_DESIGN.beamWidth,ROVER_TRANSFER_DESIGN.beamDepth,cargoDelta.length()+.18),walkwayRib,0,0,0);beam.position.copy(cargoDeck.position).addScaledVector(cargoSide,side*(WORKSHOP_CARGO_LINK.width/2-.32)).addScaledVector(V(0,-1,0).applyQuaternion(cargoDeck.quaternion),.24);beam.quaternion.copy(cargoDeck.quaternion);}
 // The two rectangular decks meet at a shallow angle. This flush junction
 // plate spans their outside corners instead of leaving a triangular hole.
 // The joint plate rises with the workshop deck on its forward half. A flat
 // box previously hid a small step where its far edge met the sloped deck.
 mesh(logistics.jointDeckGeometry(),walkwaySurface,0,0,0);
 for(const side of [-1,1]){const offset=cargoSide.clone().multiplyScalar(side*(WORKSHOP_CARGO_LINK.width/2+.12)),railA=cargoStart.clone().add(offset).add(V(0,1,0)),railB=cargoEnd.clone().add(offset).add(V(0,1,0));rod(railA,railB,.055,pearl);for(const t of [0,...WORKSHOP_CARGO_LINK.supports,1]){const p=cargoStart.clone().lerp(cargoEnd,t).add(offset),groundY=landscape(p.x,p.z);rod(V(p.x,p.y-.02,p.z),V(p.x,p.y+1,p.z),.06,pearl);if(t>0&&t<1){const beamY=p.y-.2;rod(V(p.x,groundY+.15,p.z),V(p.x,beamY,p.z),.15,walkwayRib);mesh(new T.CylinderGeometry(.32,.36,.18,12),platformSurface,p.x,groundY+.09,p.z);}}}
 // Keep the orientation mark clear of the new apron rather than crossing its deck.
 for(const [begin,end] of [[0,.65],[1.15,2.16],[2.8,Math.PI*2]]){const points=Array.from({length:49},(_,i)=>{const angle=begin+(end-begin)*i/48;return V(landingX+11*Math.cos(angle),landingY+.03,landingZ+11*Math.sin(angle));});mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),48,.12,6,false),pearl,0,0,0);}
 for(const dx of [-3,3])box(landingX+dx,landingY+.05,landingZ,.35,.05,8,pearl);box(landingX,landingY+.05,landingZ,6,.05,.35,pearl);
 for(let i=0;i<12;i++){if(i===5)continue;const a=i/12*Math.PI*2;mesh(new T.SphereGeometry(.18,10,8),glow,landingX+12.7*Math.cos(a),landingY+.3,landingZ+12.7*Math.sin(a));}
 // The former z=-91 placed the greenhouse inside the mathematical reservoir E.
 // This service site clears the reservoir apron while keeping its west-campus link.
 const gx=GREENHOUSE.x,gz=GREENHOUSE.z,gy=foundation(gx,gz,GREENHOUSE.foundationRadius);obstacles.push({x:gx,z:gz,r:GREENHOUSE.foundationRadius+.1});
 const greenhouseShellBase=gy-.1,greenhouse=new T.BufferGeometry(),gp:number[]=[],gi:number[]=[],shellLong=72,shellArc=96;
 for(let j=0;j<=shellLong;j++)for(let i=0;i<=shellArc;i++){const a=i/shellArc*Math.PI;gp.push(gx-9+j*18/shellLong,greenhouseShellBase+5*Math.sin(a),gz+5*Math.cos(a));}
 for(let j=0;j<shellLong;j++)for(let i=0;i<shellArc;i++){const k=j*(shellArc+1)+i;gi.push(k,k+shellArc+1,k+1,k+1,k+shellArc+1,k+shellArc+2);}
 greenhouse.setAttribute('position',new T.Float32BufferAttribute(gp,3));greenhouse.setIndex(gi);greenhouse.computeVertexNormals();mesh(greenhouse,enclosureGlass,0,0,0);
 box(gx,gy+.2,gz,18,.4,10,pearl);
 for(let j=0;j<=8;j++){const x=gx-9+j*2.25,pts=Array.from({length:33},(_,i)=>V(x,greenhouseShellBase+5*Math.sin(i/32*Math.PI),gz+5*Math.cos(i/32*Math.PI)));mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),32,.07,6,false),pearl,0,0,0);}
 for(const dx of [-9,9]){
  if(dx===-9){
   const cap=new T.Shape();cap.absarc(0,0,5,Math.PI,0,true);cap.lineTo(-5,0);
   const accessDoor=new T.Path();accessDoor.absarc(gz-GREENHOUSE_ACCESS_PORTAL.z,GREENHOUSE_ACCESS_PORTAL.doorY+.1,GREENHOUSE_ACCESS_PORTAL.doorRadius,0,Math.PI*2,true);cap.holes.push(accessDoor);
   const end=mesh(new T.ShapeGeometry(cap,48),enclosureGlass,gx+dx,greenhouseShellBase,gz);end.rotation.y=Math.PI/2;
   const accessFrame=mesh(new T.TorusGeometry(GREENHOUSE_ACCESS_PORTAL.doorRadius+.08,.1,10,40),pearl,GREENHOUSE_ACCESS_PORTAL.innerX-.015,gy+GREENHOUSE_ACCESS_PORTAL.doorY,GREENHOUSE_ACCESS_PORTAL.z);accessFrame.rotation.y=Math.PI/2;
  }else{const end=mesh(new T.CircleGeometry(5,48,0,Math.PI),enclosureGlass,gx+dx,greenhouseShellBase,gz);end.rotation.y=Math.PI/2;}
  rod(V(gx+dx,gy+.42,gz-5),V(gx+dx,gy+.42,gz+5),.07,pearl);
 }
 // One three-port vestibule joins the greenhouse, outdoor ramp and workshop.
 const vestibuleWest=GREENHOUSE_ACCESS_PORTAL.x,vestibuleEast=GREENHOUSE_ACCESS_PORTAL.innerX,vestibuleX=(vestibuleWest+vestibuleEast)/2,vestibuleZ=GREENHOUSE_ACCESS_PORTAL.z,vestibuleLength=GREENHOUSE_ACCESS_PORTAL.vestibuleLength,vestibuleWidth=GREENHOUSE_ACCESS_PORTAL.vestibuleWidth,vestibuleFloor=gy+.4,vestibuleHeight=2.35;
 box(vestibuleX,vestibuleFloor-.08,vestibuleZ,vestibuleLength,.16,vestibuleWidth,walkwayRib);
 box(vestibuleX,vestibuleFloor+vestibuleHeight,vestibuleZ,vestibuleLength,.08,vestibuleWidth,glass);
 for(const side of [-1,1])rod(V(vestibuleWest,vestibuleFloor+vestibuleHeight,vestibuleZ+side*vestibuleWidth/2),V(vestibuleEast,vestibuleFloor+vestibuleHeight,vestibuleZ+side*vestibuleWidth/2),.045,pearl);
 box(vestibuleX,vestibuleFloor+vestibuleHeight/2,vestibuleZ-vestibuleWidth/2,vestibuleLength,vestibuleHeight,.08,glass);
 const pressureWall=new T.Shape();pressureWall.moveTo(-vestibuleLength/2,0);pressureWall.lineTo(vestibuleLength/2,0);pressureWall.lineTo(vestibuleLength/2,vestibuleHeight);pressureWall.lineTo(-vestibuleLength/2,vestibuleHeight);pressureWall.closePath();
 const pressureOpening=new T.Path();pressureOpening.absarc(GREENHOUSE_PRESSURE_PORTAL.x-vestibuleX,GREENHOUSE_PRESSURE_PORTAL.rise-(vestibuleFloor-gy),GREENHOUSE_CORRIDOR.radius+.045,0,Math.PI*2,true);pressureWall.holes.push(pressureOpening);
 const pressurePane=mesh(new T.ShapeGeometry(pressureWall,48),enclosureGlass,vestibuleX,vestibuleFloor,GREENHOUSE_PRESSURE_PORTAL.z);pressurePane.castShadow=false;
 mesh(new T.TorusGeometry(GREENHOUSE_CORRIDOR.radius+.06,.075,8,40),pearl,GREENHOUSE_PRESSURE_PORTAL.x,gy+GREENHOUSE_PRESSURE_PORTAL.rise,GREENHOUSE_PRESSURE_PORTAL.z);
 for(const x of [vestibuleWest,vestibuleEast])for(const side of [-1,1])rod(V(x,vestibuleFloor,vestibuleZ+side*vestibuleWidth/2),V(x,vestibuleFloor+vestibuleHeight,vestibuleZ+side*vestibuleWidth/2),.09,pearl);
 for(const x of [vestibuleWest,vestibuleEast]){
  const endWall=new T.Shape();endWall.moveTo(-vestibuleWidth/2,0);endWall.lineTo(vestibuleWidth/2,0);endWall.lineTo(vestibuleWidth/2,vestibuleHeight);endWall.lineTo(-vestibuleWidth/2,vestibuleHeight);endWall.closePath();
  const endOpening=new T.Path();endOpening.absarc(0,GREENHOUSE_ACCESS_PORTAL.doorY-(vestibuleFloor-gy),GREENHOUSE_ACCESS_PORTAL.doorRadius+.035,0,Math.PI*2,true);endWall.holes.push(endOpening);
  const endPane=mesh(new T.ShapeGeometry(endWall,48),enclosureGlass,x,vestibuleFloor,vestibuleZ);endPane.rotation.y=Math.PI/2;endPane.castShadow=false;
  const frame=mesh(new T.TorusGeometry(GREENHOUSE_ACCESS_PORTAL.doorRadius+.08,.1,10,40),pearl,x,gy+GREENHOUSE_ACCESS_PORTAL.doorY,vestibuleZ);frame.rotation.y=Math.PI/2;
  sealedHatch(V(x,gy+GREENHOUSE_ACCESS_PORTAL.doorY,vestibuleZ),V(1,0,0),GREENHOUSE_ACCESS_PORTAL.doorRadius);
  for(const side of [-1,1])box(x,vestibuleFloor+vestibuleHeight/2,vestibuleZ+side*(vestibuleWidth/2-.06),.08,vestibuleHeight,.12,pearl);
 }
 const vestibuleLabel=label('ESCLUSA EXTERIOR', '#e3f2eb', .31);vestibuleLabel.position.set(vestibuleX,vestibuleFloor+vestibuleHeight+1.15,vestibuleZ);installationLabels.add(vestibuleLabel);
 const leafMaterial=new T.MeshStandardMaterial({color:'#679167',roughness:.9});const leafGeometry=new T.SphereGeometry(1,6,4),leaves=new T.InstancedMesh(leafGeometry,leafMaterial,192),plantDummy=new T.Object3D();let leafIndex=0;
 // A transverse entry aisle links both west doors to the clear central aisle.
 box(gx-8.25,gy+.414,gz,GREENHOUSE_BEDS.entryAisleWidth,.028,8.6,walkwaySurface);
 box(gx,gy+.414,gz,17.5,.028,GREENHOUSE_BEDS.centralAisleWidth,walkwaySurface);
 for(let i=0;i<GREENHOUSE_BEDS.columns;i++)for(const zoff of GREENHOUSE_BEDS.rowOffsets){const x=gx+GREENHOUSE_BEDS.firstXOffset+i*GREENHOUSE_BEDS.columnSpacing,z=gz+zoff;box(x,gy+.65,z,GREENHOUSE_BEDS.length,.5,GREENHOUSE_BEDS.width,graphite);rod(V(x,gy+.9,z),V(x,gy+1.8,z),.035,copper);for(let k=0;k<6;k++){plantDummy.position.set(x+Math.cos(k)*.27,gy+1.15+k*.1,z+Math.sin(k)*.27);plantDummy.scale.set(.38,.055,.16);plantDummy.rotation.y=k;plantDummy.updateMatrix();leaves.setMatrixAt(leafIndex++,plantDummy.matrix);}}
 buildings.add(leaves);
 // The sealed branch terminates in the north wall of the existing airlock.
 const corridorA=V(GREENHOUSE_CORRIDOR.startX,workshopY+GREENHOUSE_CORRIDOR.startRise,GREENHOUSE_CORRIDOR.startZ),corridorB=V(GREENHOUSE_PRESSURE_PORTAL.x,gy+GREENHOUSE_CORRIDOR.portalRise,GREENHOUSE_PRESSURE_PORTAL.z-GREENHOUSE_CORRIDOR.portalOffset);
 const greenhouseRouteAt=(t:number)=>{const p=greenhouseCorridorPlan(t);return V(p.x,corridorA.y*(1-t)+corridorB.y*t+GREENHOUSE_CORRIDOR.archHeight*Math.sin(Math.PI*t)**2,p.z);};
 pressureCorridor(corridorA,corridorB,{radius:GREENHOUSE_CORRIDOR.radius,floorOffset:GREENHOUSE_CORRIDOR.floorOffset,portalRadius:GREENHOUSE_CORRIDOR.portalRadius,archHeight:GREENHOUSE_CORRIDOR.archHeight,plan:greenhouseRouteAt});
 // The workshop's open bay reaches the sealed corridor at a modest raised threshold.
 for(let i=0;i<=7;i++){const t=i/7;paving(GREENHOUSE_CORRIDOR.startX,workshopY+.08+.32*t-.06,-37.2+(-40.9+37.2)*t,1.05,.68,0);}
 // Three regolith-anchored bents carry the long sealed span above the terrain.
 for(const t of GREENHOUSE_CORRIDOR.supports){const center=greenhouseRouteAt(t),before=greenhouseCorridorPlan(t-.002),after=greenhouseCorridorPlan(t+.002),direction=new T.Vector2(after.x-before.x,after.z-before.z).normalize(),lateral=new T.Vector2(-direction.y,direction.x),bottom=center.y-GREENHOUSE_CORRIDOR.radius-.06,foot=(side:number)=>{const x=center.x+lateral.x*GREENHOUSE_CORRIDOR.supportOffset*side,z=center.z+lateral.y*GREENHOUSE_CORRIDOR.supportOffset*side,y=landscape(x,z);mesh(new T.CylinderGeometry(.3,.36,.2,12),platformSurface,x,y+.1,z);return V(x,y+.2,z);},feet:[T.Vector3,T.Vector3]=[foot(-1),foot(1)];rod(feet[0],V(feet[0].x,bottom,feet[0].z),.11,walkwayRib);rod(feet[1],V(feet[1].x,bottom,feet[1].z),.11,walkwayRib);rod(V(feet[0].x,bottom,feet[0].z),V(feet[1].x,bottom,feet[1].z),.1,walkwayRib);}
 // Deliberate surface network: B+ ↔ treatment junction ↔ greenhouse approach.
  // foundation() returns the walking surface, already half a slab above its
  // centre. The former extra 0.225 m left a step at the service apron.
  const waterRampLength=WATER_PLANT_WALKWAY.endX-WATER_PLANT_WALKWAY.startX,waterRampStartY=landscape(WATER_PLANT_WALKWAY.startX,WATER_PLANT_WALKWAY.startY)+.13,waterRampEndY=plantY+WATER_PLANT_WALKWAY.endSurfaceOffset,waterRampSteps=Math.ceil(waterRampLength/1.35);
  for(let i=0;i<=waterRampSteps;i++){const t=i/waterRampSteps,x=WATER_PLANT_WALKWAY.startX+waterRampLength*t,z=WATER_PLANT_WALKWAY.startY,y=waterRampStartY+(waterRampEndY-waterRampStartY)*t;paving(x,y-.06,z,WATER_PLANT_WALKWAY.paverWidth,WATER_PLANT_WALKWAY.paverLength,Math.PI/2);}
  for(const side of [-1,1]){const railA=V(WATER_PLANT_WALKWAY.startX,waterRampStartY+1.05,WATER_PLANT_WALKWAY.startY+side*1.25),railB=V(WATER_PLANT_WALKWAY.endX,waterRampEndY+1.05,WATER_PLANT_WALKWAY.endY+side*1.25);rod(railA,railB,.055,walkwayRib);for(let i=0;i<=Math.ceil(waterRampLength/3);i++){const t=i/Math.ceil(waterRampLength/3),p=railA.clone().lerp(railB,t),px=WATER_PLANT_WALKWAY.startX+waterRampLength*t;rod(V(px,landscape(px,WATER_PLANT_WALKWAY.startY)+.15,p.z),p,.045,pearl);}}
  const greenhouseSegments=GREENHOUSE_ACCESS_ROUTE.slice(1).map((b,i)=>{const a=GREENHOUSE_ACCESS_ROUTE[i],length=Math.hypot(b.x-a.x,b.z-a.z);return {a,b,length};}),greenhouseTotal=greenhouseSegments.reduce((sum,segment)=>sum+segment.length,0);let greenhouseDistance=SERVICE_JUNCTION.size/(2*Math.max(...(()=>{const first=greenhouseSegments[0],length=first.length;return [Math.abs((first.b.x-first.a.x)/length),Math.abs((first.b.z-first.a.z)/length)];})()))+1.5/2;
  for(;greenhouseDistance<greenhouseTotal;greenhouseDistance+=1.5){let remaining=greenhouseDistance,segment=greenhouseSegments.find(item=>{if(remaining<=item.length)return true;remaining-=item.length;return false;})||greenhouseSegments.at(-1)!;const t=Math.min(1,remaining/segment.length),x=segment.a.x+(segment.b.x-segment.a.x)*t,z=segment.a.z+(segment.b.z-segment.a.z)*t;paving(x,landscape(x,z)+.07,z,2.2,1.5,Math.atan2(segment.b.x-segment.a.x,segment.b.z-segment.a.z));}
  const greenhouseLast=greenhouseSegments.at(-1)!;paving(greenhouseLast.b.x,landscape(greenhouseLast.b.x,greenhouseLast.b.z)+.07,greenhouseLast.b.z,2.2,1.5,Math.atan2(greenhouseLast.b.x-greenhouseLast.a.x,greenhouseLast.b.z-greenhouseLast.a.z));
 // The 27.5 m exterior ramp reaches the greenhouse floor at 12.5522% maximum grade; each
 // instanced slab follows the interpolated walking surface up to the portal.
 const rampA=GREENHOUSE_ACCESS_PORTAL.rampStartX,rampB=GREENHOUSE_ACCESS_PORTAL.x,rampLength=rampB-rampA,rampZ=GREENHOUSE_ACCESS_PORTAL.rampStartZ,rampStartY=landscape(rampA,rampZ)+.13,rampEndY=vestibuleFloor,rampSteps=Math.ceil(rampLength/1.35),rampAngle=Math.PI/2;
 for(let i=0;i<=rampSteps;i++){const t=i/rampSteps,x=rampA+rampLength*t,y=rampStartY+(rampEndY-rampStartY)*t;paving(x,y-.06,rampZ,2.2,1.5,rampAngle);}
 for(const side of [-1,1]){const railA=V(rampA,rampStartY+1.05,rampZ+side*1.25),railB=V(rampB,rampEndY+1.05,rampZ+side*1.25);rod(railA,railB,.055,walkwayRib);for(let i=0;i<=8;i++){const t=i/8,p=railA.clone().lerp(railB,t);rod(p.clone().add(V(0,-.92,0)),p,.045,pearl);}}
 box(rampB+.22,vestibuleFloor+.03,rampZ,.55,.06,2.45,walkwayRib);
 const rockGeo=new T.IcosahedronGeometry(1,1);const rp=rockGeo.attributes.position;for(let i=0;i<rp.count;i++){const d=.8+.35*seeded(i);rp.setXYZ(i,rp.getX(i)*d,rp.getY(i)*d,rp.getZ(i)*d);}rockGeo.computeVertexNormals();
 const rockMat=new T.MeshStandardMaterial({map:load(assetUrl('/materials/rock_06_diff_2k.jpg'),true),normalMap:normal,roughnessMap:rough,color:'#a27c64',roughness:1});const rockPositions:{x:number;z:number;r:number}[]=[];
 for(let i=0;i<650;i++){const a=seeded(i)*Math.PI*2,r=25+Math.sqrt(seeded(i+991))*430,x=r*Math.cos(a),z=r*Math.sin(a),s=.2+seeded(i+48)*2.1;if(r<120&&(obstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+4)||solarPads.some(panel=>Math.hypot(x-panel.x,z-panel.z)<s+2.85)||Math.abs(r-72)<5||transferCenters.some(p=>Math.hypot(x-p.x,z-p.z)<transfer.width/2+s+1)||Math.hypot(x-40,z+20)<23||Math.hypot(x+50,z-35)<15||z<0&&x>40&&x<80))continue;rockPositions.push({x,z,r:s});}
 // Geological outcrops are clustered outside the academic domain, with smaller fragments at their feet.
 for(const [cx,cz,span] of [[-127,-25,15],[-88,-122,11],[133,24,16],[54,143,13],[-149,84,18],[114,-120,15]])for(let i=0;i<95;i++){const a=seeded(i+cx*7)*Math.PI*2,r=Math.sqrt(seeded(i+cz*11))*span,x=cx+r*Math.cos(a),z=cz+r*Math.sin(a);if(Math.hypot(x,z)<116)continue;const size=.25+(1-r/span)**2*(3+seeded(i+817)*5);rockPositions.push({x,z,r:size});}
 // Low scattered fragments at the reservoir skirt leave the approach and service pipe clear.
 for(let i=0;i<75;i++){const a=seeded(i+912)*Math.PI*2;if(Math.cos(a)>.55)continue;const radius=1+seeded(i+561)*.12,x=tx+25*radius*Math.cos(a),z=tz+20*radius*Math.sin(a);if(Math.abs(Math.hypot(x,z)-72)<3)continue;rockPositions.push({x,z,r:.13+seeded(i+118)*.55});}
 const rocks=new T.InstancedMesh(rockGeo,rockMat,rockPositions.length),dummy=new T.Object3D();rockPositions.forEach((p,i)=>{dummy.position.copy(ground(p.x,p.z,p.r*.2));dummy.scale.set(p.r,p.r*.55,p.r*.8);dummy.rotation.set(0,seeded(i)*6,seeded(i+4)*.3);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);});rocks.castShadow=true;rocks.receiveShadow=true;scene.add(rocks);
 const routePoints=Array.from({length:257},(_,i)=>{const p=V(...routeAt(START+i/256*Math.PI));p.y+=.12;return p;});const routeLine=line(routePoints,0xd9ac73);scene.add(routeLine);
  for(let i=0;i<=12;i++){const p=V(...routeAt(START+i/12*Math.PI)),a=START+i/12*Math.PI,x=p.x+3.2*Math.cos(a),z=p.z+3.2*Math.sin(a);rod(ground(x,z),ground(x,z,1),.035,graphite);mesh(new T.SphereGeometry(.075,8,6),glow,x,landscape(x,z)+1,z);}
 const rover=new T.Group(),roverWheels:T.Object3D[]=[];scene.add(rover);const fallback=box(0,1.1,0,2,.6,1.5,copper,rover);for(const x of [-1.1,1.1])for(const z of [-.65,0,.65]){const w=mesh(new T.CylinderGeometry(.32,.32,.2,16),graphite,x,.33,z,rover);w.rotation.z=Math.PI/2;roverWheels.push(w);}
 const trailPositions=new Float32Array(96*3);trailPositions.fill(-999);const trailGeometry=new T.BufferGeometry();trailGeometry.setAttribute('position',new T.BufferAttribute(trailPositions,3));const trail=new T.Points(trailGeometry,new T.PointsMaterial({color:'#d18e68',size:.34,transparent:true,opacity:.34,depthWrite:false}));scene.add(trail);let trailIndex=0;
 const draco=new DRACOLoader(assetTracker.manager);draco.setDecoderPath(assetUrl('/draco/gltf/'));const gltf=new GLTFLoader(assetTracker.manager);gltf.setDRACOLoader(draco);let alive=true;
 gltf.load(assetUrl('/models/nasa-perseverance.glb'),r=>{if(!alive)return;rover.clear();roverWheels.length=0;const model=r.scene,b=new T.Box3().setFromObject(model),size=b.getSize(V(0,0,0)),scale=3.1/Math.max(size.x,size.y,size.z);model.scale.setScalar(scale);b.setFromObject(model);const c=b.getCenter(V(0,0,0));model.position.set(-c.x,-b.min.y,-c.z);model.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;}});rover.add(model);},undefined,()=>{fallback.visible=true;});
 gltf.load(assetUrl('/models/eva01-survey.glb'),r=>{if(!alive)return;for(const [x,z] of [[38,-21],[-52,34]]){const instrument=r.scene.clone(true);instrument.position.copy(ground(x,z));instrument.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;}});buildings.add(instrument);}},undefined,e=>console.error('No se pudo cargar el instrumento de levantamiento',e));
 // Blender hard-surface assets: merge by material once, then share geometries across clones.
 function compact(model:T.Group){model.updateMatrixWorld(true);const buckets=new Map<T.Material,T.BufferGeometry[]>();model.traverse(o=>{if(!(o instanceof T.Mesh))return;const material=o.material as T.Material,g=o.geometry.clone().applyMatrix4(o.matrixWorld);for(const key of Object.keys(g.attributes))if(key!=='position'&&key!=='normal')g.deleteAttribute(key);const flat=g.index?g.toNonIndexed():g;if(flat!==g)g.dispose();if(!buckets.has(material))buckets.set(material,[]);buckets.get(material)!.push(flat);});const result=new T.Group();for(const [material,geometries] of buckets){const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(geometry){const mesh=new T.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;result.add(mesh);}}return result;}
 const solarModules=new T.Group();buildings.add(solarModules);
 function openLaboratory(model:T.Group){
  const key=(name:string)=>name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/gi,'').toLowerCase();
  const find=(name:string)=>{let found:T.Object3D|undefined;model.traverse(part=>{if(key(part.name)===key(name))found=part;});return found;};
  const hull=find('Casco de presión') as T.Mesh|undefined,bulkhead=find('Mamparo estanco') as T.Mesh|undefined;if(!hull||!bulkhead)throw new Error('El activo de laboratorio perdió su casco o mamparo.');
  const hullMaterial=(hull.material as T.Material).clone(),capMaterial=(bulkhead.material as T.Material).clone();capMaterial.side=T.DoubleSide;
  for(const name of ['Casco de presión','Mamparo estanco','Escotilla circular'])find(name)?.removeFromParent();
  const shell=new T.Mesh(new T.CylinderGeometry(3.12,3.12,13.4,64,1,true),hullMaterial);shell.position.set(0,3.3,0);shell.rotation.z=Math.PI/2;model.add(shell);
  const end=new T.Shape();end.absarc(0,0,3.12,0,Math.PI*2,false);const opening=new T.Path();opening.absarc(0,0,1.28,0,Math.PI*2,true);end.holes.push(opening);
  const westCap=new T.Mesh(new T.ShapeGeometry(end,64),capMaterial);westCap.position.set(-6.7,3.3,0);westCap.rotation.y=Math.PI/2;model.add(westCap);
  const westGasket=new T.Mesh(new T.TorusGeometry(1.32,.065,8,48),capMaterial);westGasket.position.set(-6.72,3.3,0);westGasket.rotation.y=Math.PI/2;model.add(westGasket);
 }
 function install(name:string,placements:{x:number;y:number;z:number;angle?:number}[],parent:T.Group=buildings){gltf.load(assetUrl(`/models/eva01-${name}.glb`),r=>{if(!alive)return;if(name==='workshop')prepareWorkshopForAccess(r.scene);if(name==='laboratory')openLaboratory(r.scene);const model=compact(r.scene);for(const p of placements){const instance=model.clone(true);instance.position.set(p.x,p.y,p.z);instance.rotation.y=p.angle||0;if(name==='solar')instance.scale.set(SOLAR_MODULE_SCALE,1,SOLAR_MODULE_SCALE);parent.add(instance);
   if(name==='laboratory'){
    const steps=15,stairStart=-6.65,stairEnd=-.15,landing=.23,threshold=2.37,run=stairEnd-stairStart;
    for(let i=0;i<steps;i++){const x=stairStart+run*(i+.5)/steps,y=threshold+(landing-threshold)*(i+1)/steps;box(x,y-.045,0,run/steps+.025,.09,1.5,walkwaySurface,instance);}
    box((stairEnd+6.4)/2,landing-.045,0,6.4-stairEnd,.09,1.5,walkwaySurface,instance);
    const hatch=mesh(new T.CircleGeometry(1.16,40),hatchLeaf,-7.12,3.3,2.65,instance);hatch.rotation.y=-Math.PI/2;
    const hatchFrame=mesh(new T.TorusGeometry(1.18,.05,8,40),pearl,-7.13,3.3,2.65,instance);hatchFrame.rotation.y=-Math.PI/2;
   }
  }},undefined,e=>console.error(`No se pudo cargar ${name}`,e));}
 const nasaHabitat=new T.Group();buildings.add(nasaHabitat);
 gltf.load(assetUrl('/models/nasa-habitat.glb'),r=>{if(!alive)return;const model=r.scene;let bounds=new T.Box3().setFromObject(model);const size=bounds.getSize(V(0,0,0));model.scale.setScalar(10/Math.max(size.x,size.y,size.z));bounds=new T.Box3().setFromObject(model);const center=bounds.getCenter(V(0,0,0));model.position.set(-center.x+99,landscape(99,8)-bounds.min.y,-center.z+8);model.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;}});nasaHabitat.add(model);},undefined,e=>console.error('NASA habitat',e));
 install('workshop',[{x:-20,y:workshopY,z:-35,angle:Math.PI}]);install('cargo-lander',[{x:landingX,y:landingY,z:landingZ}]);install('interior',[{x:bx,y:HABITAT.floor,z:bz}]);install('laboratory',labPads);install('airlock',[{x:airlockX,y:HABITAT.airlockFloor-.2,z:airlockZ}]);install('solar',solarPads.map(p=>({x:p.x,y:height(p.x,p.z),z:p.z,angle:-p.a})),solarModules);
  install('water-plant',[{x:plantX,y:plantY,z:plantZ}]);
 // Buried row buses connect both photovoltaic fields to two named loads.
 // The separate cabinet marks the battery/inverter assumed by the balance;
 // its internal equipment and protection are not engineered here.
 const powerService=SOLAR_POWER_SERVICE;
 const buryCable=(route:readonly {x:number;z:number}[],radius:number)=>{
  const points=buriedServicePoints(route,powerService.depth).map(([x,y,z])=>V(x,y,z));
  const curve=new T.CatmullRomCurve3(points,false,'centripetal');
  const conduit=mesh(new T.TubeGeometry(curve,Math.max(16,points.length*2),radius,6,false),powerConduit,0,0,0);
  conduit.castShadow=false;
 };
 for(const panel of powerService.panels){
  const surface=landscape(panel.x,panel.z);
  rod(V(panel.x,surface-powerService.depth,panel.z),V(panel.x,surface+.12,panel.z),powerService.panelCableRadius,powerConduit);
 }
 for(const row of powerService.rowRoutes)buryCable(row,powerService.panelCableRadius);
 buryCable(powerService.storageRoute,powerService.cableRadius);
 buryCable(powerService.habitat.route,powerService.cableRadius);
 buryCable(powerService.treatment.route,powerService.cableRadius);
 const collectorGround=landscape(powerService.combiner.x,powerService.combiner.z);
 rod(V(powerService.combiner.x,collectorGround-powerService.depth,powerService.combiner.z),V(powerService.combiner.x,collectorGround+.7,powerService.combiner.z),powerService.cableRadius,powerConduit);
 mesh(new T.CylinderGeometry(.64,.68,.12,16),platformSurface,powerService.combiner.x,collectorGround+.06,powerService.combiner.z);
 box(powerService.combiner.x,collectorGround+.58,powerService.combiner.z,.86,1.04,.64,walkwayRib);
 box(powerService.combiner.x,collectorGround+1.12,powerService.combiner.z,.96,.08,.72,graphite);
 box(powerService.combiner.x,collectorGround+.66,powerService.combiner.z-.33,.56,.35,.03,graphite);
 const station=powerService.energyStation,stationGround=landscape(station.x,station.z);
 rod(V(station.x,stationGround-powerService.depth,station.z),V(station.x,stationGround+.35,station.z),powerService.cableRadius,powerConduit);
 mesh(new T.CylinderGeometry(.88,.9,.14,20),platformSurface,station.x,stationGround+.07,station.z);
 box(station.x,stationGround+1.08,station.z,1.25,1.95,.92,walkwayRib);
 box(station.x,stationGround+2.10,station.z,1.38,.10,1.05,graphite);
 box(station.x,stationGround+1.35,station.z-.475,.86,.42,.035,graphite);
 sign('BATERÍA / INVERSOR · CASO SUPUESTO',station.x,station.z,stationGround+4.2);
 const habitatCableGround=landscape(habitatPowerPort.x,habitatPowerPort.z);
 rod(V(habitatPowerPort.x,habitatCableGround-powerService.depth,habitatPowerPort.z),V(habitatPowerPort.x,habitatPowerPort.centerY,habitatPowerPort.z),powerService.cableRadius,powerConduit);
 const treatmentFeed=powerService.treatment.terminal,treatmentGround=landscape(treatmentFeed.x,treatmentFeed.z);
 rod(V(treatmentFeed.x,treatmentGround-powerService.depth,treatmentFeed.z),V(treatmentFeed.x,plantY+.58,treatmentFeed.z),powerService.cableRadius,powerConduit);
 box(treatmentFeed.x,plantY+.48,treatmentFeed.z,.55,.72,.48,walkwayRib);
 box(treatmentFeed.x,plantY+.48,treatmentFeed.z-.25,.4,.34,.025,graphite);
 for(const bend of powerService.treatment.route.slice(1,-1)){
  const groundY=landscape(bend.x,bend.z);
  mesh(new T.CylinderGeometry(.27,.27,.055,12),walkwayRib,bend.x,groundY+.027,bend.z);
  mesh(new T.TorusGeometry(.2,.018,5,16),graphite,bend.x,groundY+.058,bend.z).rotation.x=Math.PI/2;
 }
 const pipeCurve=new T.CatmullRomCurve3(Array.from({length:65},(_,i)=>V(...waterPipeAt(i/64))));
 mesh(new T.TubeGeometry(pipeCurve,128,WATER_PIPE.radius,8,false),copper,0,0,0);
 const irrigation=GREENHOUSE_WATER_SERVICE,waterSites=[irrigation.source,...irrigation.bends,irrigation.cleanout,irrigation.inlet];
 const waterBranch=waterSites.slice(1).flatMap((end,i)=>Array.from({length:13},(_,j)=>{const start=waterSites[i],t=j/12,x=start.x+(end.x-start.x)*t,z=start.z+(end.z-start.z)*t;return V(x,landscape(x,z)-irrigation.depth,z);}));
 mesh(new T.TubeGeometry(new T.CatmullRomCurve3(waterBranch,false,'centripetal'),waterBranch.length*2,irrigation.radius,8,false),copper,0,0,0);
 const cleanoutGround=landscape(irrigation.cleanout.x,irrigation.cleanout.z);
 rod(V(irrigation.cleanout.x,cleanoutGround-irrigation.depth,irrigation.cleanout.z),V(irrigation.cleanout.x,cleanoutGround+.03,irrigation.cleanout.z),irrigation.radius,copper);
 mesh(new T.CylinderGeometry(.34,.34,.1,16),pearl,irrigation.cleanout.x,cleanoutGround+.08,irrigation.cleanout.z);
 const inletGround=landscape(irrigation.inlet.x,irrigation.inlet.z);
 rod(V(irrigation.inlet.x,inletGround-irrigation.depth,irrigation.inlet.z),V(irrigation.inlet.x,gy+.78,irrigation.inlet.z),irrigation.radius,copper);
 box(irrigation.inlet.x,gy+.68,irrigation.inlet.z,.42,.46,.58,walkwayRib);
 // The underfloor crossfeed splits into four low collectors outside the
 // walking aisle. A small takeoff ends over each of the 32 crop trays.
 const distribution=GREENHOUSE_WATER_DISTRIBUTION,feedX=distribution.crossfeedX;
 rod(V(feedX,gy+.16,gz+distribution.headerOffsets[0]),V(feedX,gy+.16,gz+distribution.headerOffsets[3]),distribution.headerRadius,copper);
 for(const offset of distribution.headerOffsets){const z=gz+offset;
  rod(V(feedX,gy+.16,z),V(feedX,gy+.52,z),distribution.headerRadius,copper);
  rod(V(distribution.headerStartX,gy+.52,z),V(feedX,gy+.52,z),distribution.headerRadius,copper);
 }
 for(const port of GREENHOUSE_WATER_PORTS){
  rod(V(port.x,gy+.52,port.headerZ),V(port.x,gy+.98,port.emitterZ),distribution.dropRadius,copper);
  rod(V(port.x-.32,gy+.98,port.emitterZ),V(port.x+.32,gy+.98,port.emitterZ),distribution.dropRadius,copper);
 }
 sign('04 / TRATAMIENTO DE AGUA',plantX,plantZ,plantY+5);
 const campus=createColonyCampus(regolith);scene.add(campus.root);obstacles.push(...campus.obstacles);
 sign('NÚCLEO · CIRCULACIÓN Y COORDINACIÓN',-8,8,landscape(-8,8)+14);
 sign('INDUSTRIA · MANTENIMIENTO Y VENTILACIÓN',31,41,landscape(31,41)+16);
 sign('ANTENA · RELÉ DE TELEMETRÍA',mastX,mastZ,mastY+21);
 sign('REFERENCIA NASA · NO CONECTADA',99,8,landscape(99,8)+13);
 sign('INVERNADERO · 32 BANDEJAS EXPERIMENTALES',gx,gz,gy+7);
 sign('TALLER · MANTENIMIENTO DEL ROVER',-20,-35,workshopY+9);
 sign('PLATAFORMA · CARGA LOGÍSTICA',landingX,landingZ,landingY+9);
 sign('RUTA DEL ROVER · r = 72 m',0,72,landscape(0,72)+6);
 sign('INSTRUMENTO DE GRADIENTE · P',38,-21,landscape(38,-21)+6);
 sign('INSTRUMENTO DE GRADIENTE · Q',-52,34,landscape(-52,34)+6);
 const materialState=new Map<T.Material,{transparent:boolean;opacity:number;depthWrite:boolean}>();
 function explain(on:boolean){
  for(const group of [buildings,campus.root])group.traverse(o=>{if(!(o instanceof T.Mesh))return;for(const material of (Array.isArray(o.material)?o.material:[o.material])){
   if(!materialState.has(material))materialState.set(material,{transparent:material.transparent,opacity:material.opacity,depthWrite:material.depthWrite});
   const original=materialState.get(material)!;
   material.transparent=on||original.transparent;material.opacity=on?Math.min(original.opacity,.24):original.opacity;material.depthWrite=on?false:original.depthWrite;material.needsUpdate=true;
  }});
 }
 tankShell.traverse(o=>{if(o instanceof T.Mesh)o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();});
 const surveyLayer=createSurveyLayer();scene.add(surveyLayer);
 const overlay=new T.Group();scene.add(overlay);
 const routeLabels=new T.Group();routeLabels.visible=false;scene.add(routeLabels);
 for(const [u,n] of [[0,'INICIO · dz/dt=0'],[.5,'C* · MÁXIMO DESCENSO'],[1,'FINAL · dz/dt=0']] as [number,string][]){const pp=V(...routeAt(START+u*Math.PI));mesh(new T.SphereGeometry(.4,16,12),new T.MeshStandardMaterial({color:amber,emissive:amber,emissiveIntensity:.25}),pp.x,pp.y,pp.z,routeLabels);const fixedLabel=label(n,'#ffc078',.55);fixedLabel.position.copy(pp.clone().add(V(0,4,0)));routeLabels.add(fixedLabel);}
 let active:EvaStep|undefined,param=.5,clean=false,mode:MarsView='aerial',keys=new Set<string>(),autoRover=false,solarCycle=false,xrayMode=false,dayFraction=.5;
 let lastLagrangeStage='';
 let curvatureView:CurvatureCamera='auto';
 let targetCamera:T.Vector3|null=null,targetLook:T.Vector3|null=null;const focusPoint=V(40,height(40,-20),-20);let savedWalk=V(47,landscape(47,-5)+1.7,-5);
 function aimCurvatureCamera(progress:number){
  if(curvatureView==='top'){targetLook=V(0,24,0);targetCamera=V(0,185,8);return;}
  if(curvatureView==='space'){targetLook=V(0,24,0);targetCamera=V(130,138,155);return;}
  if(progress<.2||progress>.82){targetLook=V(0,height(0,0),0);targetCamera=V(0,185,8);return;}
  const q=V(...routeAt(START+progress*Math.PI));
  targetLook=q.clone().add(V(0,2,0));targetCamera=q.clone().add(V(19,30,25));
 }
 let phaseVCamera:PhaseVCamera='auto',lastPhaseVCamera='';
 function aimPhaseVCamera(){
  if(mode!=='aerial'||!active)return;
  const region=active.name==='Región, límites y orden',volume=active.name==='Volumen bajo f';
  if(!region&&!volume)return;
  const preset=phaseVCamera==='auto'?(region?(param<.18?'campus':'geometry'):(param<.72?'geometry':'side')):phaseVCamera;
  const signature=`${active.name}:${preset}`;
  if(signature===lastPhaseVCamera)return;
  lastPhaseVCamera=signature;
  if(preset==='campus'){targetLook=V(35,22,-25);targetCamera=V(167,146,137);}
  else if(region){targetLook=V(32,22,-21);targetCamera=preset==='side'?V(85,66,52):V(32,128,-19);}
  else{targetLook=V(61,11,-24);targetCamera=preset==='under'?V(105,6,22):preset==='side'?V(108,31,25):V(97,67,27);}
 }
 const announce=(value:string,detail:string)=>{onTelemetry({value,detail,x:focusPoint.x,z:focusPoint.z});updateInteriorScreens(value,detail);};
 const addLine=(pts:T.Vector3[],color=cyan,opacity=1)=>{const o=line(pts,color);if(opacity<1){const material=o.material as T.LineBasicMaterial;material.transparent=true;material.opacity=opacity;material.depthWrite=false;}overlay.add(o);return o;};
 const addLabel=(text:string,p:T.Vector3,color='#b9efed',scale=.55)=>{const l=label(text,color,scale);l.position.copy(p);overlay.add(l);return l;};
 const arrow=(start:T.Vector3,dir:T.Vector3,length:number,color=cyan,opacity=1)=>{if(dir.length()<1e-8)return;const helper=new T.ArrowHelper(dir.clone().normalize(),start,length,color,Math.min(2,length*.2),Math.min(.8,length*.1));if(opacity<1)helper.traverse(o=>{const m=(o as T.Mesh).material as T.Material|undefined;if(m){m.transparent=true;m.opacity=opacity;m.depthWrite=false;}});overlay.add(helper);return helper;};
 const orb=(p:T.Vector3,color=amber,r=.4)=>mesh(new T.SphereGeometry(r,16,12),new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.25}),p.x,p.y,p.z,overlay);
 const mat=(color:number,opacity=.35)=>new T.MeshStandardMaterial({color,transparent:true,opacity,side:T.DoubleSide,roughness:.8,depthWrite:false});
 function applyDay(){const state=solarState(dayFraction),direction=V(...state.direction),daylight=Math.max(0,direction.y),twilight=Math.max(.08,Math.min(1,(direction.y+.12)/.32));sun.position.copy(direction.multiplyScalar(420));sun.intensity=.14+3.55*daylight;hemi.intensity=1.45+1.15*twilight;roomLight.intensity=30+100*(1-twilight);campusLights.forEach(light=>light.intensity=88*(1-twilight));renderer.toneMappingExposure=1.08+.22*twilight;gtao.enabled=active?.target!=='linear'&&active?.name!=='Volumen bajo f'&&host.clientWidth>760&&twilight>.18;bloom.strength=.22+.16*(1-twilight);skyUniforms.horizon.value.copy(new T.Color('#1a2028').lerp(new T.Color('#c78c6b'),twilight));skyUniforms.zenith.value.copy(new T.Color('#070c15').lerp(new T.Color('#303943'),twilight));(scene.fog as T.FogExp2).color.copy(new T.Color('#171721').lerp(new T.Color('#b58a74'),twilight));moons.visible=twilight<.7;godRays.visible=twilight>.22;}
 applyDay();
 let audioContext:AudioContext|null=null,audioGain:GainNode|null=null;
 function setAmbientSound(on:boolean){if(on){audioContext??=new AudioContext();if(!audioGain){const gain=audioContext.createGain(),wind=audioContext.createOscillator(),hum=audioContext.createOscillator(),filter=audioContext.createBiquadFilter();gain.gain.value=.018;wind.type='sawtooth';wind.frequency.value=43;hum.type='sine';hum.frequency.value=91;filter.type='lowpass';filter.frequency.value=180;wind.connect(filter);hum.connect(filter);filter.connect(gain);gain.connect(audioContext.destination);wind.start();hum.start();audioGain=gain;}audioContext.resume();audioGain.gain.setTargetAtTime(.018,audioContext.currentTime,.08);}else if(audioContext&&audioGain)audioGain.gain.setTargetAtTime(0,audioContext.currentTime,.05);}
 function contours(levels=LEVELS,labelScale=2.55,integrated=false){
  const colors=integrated?[0x91bdb5,0xa5c0ad,0xc3b38f,0xb89c83,0xb88e94,0xa99eb7]:[0x5ae8dc,0x7ff5c7,0xffdf78,0xffaf68,0xff738a,0xd89aff];
  for(let n=0;n<levels.length;n++){
   const lev=levels[n],pts:T.Vector3[]=[],h=1.8;
   for(let x=-110;x<110;x+=h)for(let z=-110;z<110;z+=h){
    if(Math.hypot(x+h/2,z+h/2)>109)continue;
    const corners=[[x,z],[x+h,z],[x+h,z+h],[x,z+h]],hits:T.Vector3[]=[];
    for(let k=0;k<4;k++){
     const a=corners[k],b=corners[(k+1)%4],fa=height(...a as [number,number])-lev,fb=height(...b as [number,number])-lev;
     if(fa*fb<0){const fraction=fa/(fa-fb);hits.push(V(a[0]+fraction*(b[0]-a[0]),lev+.22,a[1]+fraction*(b[1]-a[1])));}
    }
    if(hits.length===2)pts.push(...hits);
   }
   if(!pts.length)continue;
   const geometry=new LineSegmentsGeometry();geometry.setPositions(pts.flatMap(p=>[p.x,p.y,p.z]));
   const material=new LineMaterial({color:colors[n%colors.length],linewidth:integrated?1.75:levels.length===1?3.3:2.7,depthTest:!integrated,depthWrite:false});
   material.resolution.set(host.clientWidth,host.clientHeight);
   const lines=new LineSegments2(geometry,material);lines.renderOrder=8;overlay.add(lines);
   const angle=n===2&&levels.length>1?Math.PI/4:(n+.25)/levels.length*Math.PI*2,target=V(80*Math.cos(angle),0,80*Math.sin(angle));
   const anchor=pts.reduce((best,p)=>Math.hypot(p.x-target.x,p.z-target.z)<Math.hypot(best.x-target.x,best.z-target.z)?p:best,pts[0]);
   const title=levels.length===1?`COTA ${lev.toFixed(2)} m`:`C${n+1} · ${lev.toFixed(1)} m`;
   const tag=label(title,`#${colors[n%colors.length].toString(16).padStart(6,'0')}`,labelScale);
   tag.material.depthTest=false;tag.renderOrder=9;tag.position.copy(anchor).add(V(0,3.2,0));overlay.add(tag);
  }
 }
 function ring(r:number,color:number){addLine(Array.from({length:181},(_,i)=>ground(r*Math.cos(i/180*Math.PI*2),r*Math.sin(i/180*Math.PI*2),.1)),color);}
 function update(){
  const regionCampus=active?.name==='Región, límites y orden'&&(phaseVCamera==='campus'||phaseVCamera==='auto'&&param<.18);
  const volumeUnder=active?.name==='Volumen bajo f'&&phaseVCamera==='under';
  terrain.visible=!volumeUnder;controls.maxPolarAngle=Math.PI*(volumeUnder ? .75 : .49);
  // Ambient occlusion treats the transparent X-ray surfaces and sprites as
  // opaque depth surfaces. Disable it for this diagram, restore in other scenes.
  gtao.enabled=active?.target!=='linear'&&active?.name!=='Volumen bajo f'&&host.clientWidth>760&&Math.max(.08,Math.min(1,(solarState(dayFraction).direction[1]+.12)/.32))>.18;
  if(!active)return;disposeGroup(overlay);overlay.visible=!clean;const key=active.target,t=param,p=V(40,height(40,-20),-20),campusTankIntro=active.name==='Sólido y límites'&&t<.22,chainScene=key==='route'&&active.name==='Regla de la cadena',candidateSearch=key==='candidates'&&t<.8,isolated=!clean&&!campusTankIntro&&(chainScene||candidateSearch||['domain','contours','criticalMin','criticalOther','traces','terrain','gradientP','gradientQ','directional','directionalQ','directionalRose','normal','tangent','linear','curvature','solarRegion','polarGrid','doubleVolume','surfaceArea','tank','jacobian','density','mass','iceSurvey','resourceLoop','roverEnergy'].includes(key)),tankFocus=['tank','jacobian','density','mass'].includes(key),lengthScene=key==='route'&&active.name==='Longitud de arco';focusPoint.copy(p);installationLabels.visible=key==='architecture'&&!clean;routeLabels.visible=!clean&&STATIC_ROUTE_TARGETS.has(key)&&key!=='curvature'&&!lengthScene&&active.name!=='Regla de la cadena';if(key==='terrain'||key==='contours'||clean)elevationBands.visible=key==='terrain'&&!clean;for(const object of [buildings,campus.root,rocks,trail,outerCraters])object.visible=!isolated;rover.visible=!isolated||key==='curvature'||chainScene;routeLine.visible=!isolated||key==='curvature';nasaHabitat.visible=clean||!STATIC_ROUTE_TARGETS.has(key)&&key!=='chainRule';tankDisplay.visible=!isolated||tankFocus;
  if(regionCampus){for(const object of [buildings,campus.root,rocks,outerCraters])object.visible=true;tankDisplay.visible=true;routeLine.visible=true;}
  if(key==='evaluations'){
    for(const object of [buildings,campus.root,rocks,trail,outerCraters,rover,routeLine,nasaHabitat,tankDisplay])object.visible=false;
  }
  (scene.fog as T.FogExp2).density=.0015;applyDay();
  tankShell.traverse(o=>{if(o instanceof T.Mesh){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.clippingPlanes=[]);}});tankShell.visible=true;terrainMaterial.clippingPlanes=[];rover.visible=key!=='evaluations'&&(!isolated||key==='roverEnergy'||key==='curvature'||chainScene);xrayGroup.visible=false;
  if(clean){announce(active.result,active.why);return;}
  announce(active.result,active.why);
  if(['axes','terrain','domain','contours','traces','evaluations','terrainInterpretation','all'].includes(key)){
  if(key==='domain'||key==='all')ring(110,amber);
  if(key==='domain'){
   for(const radius of [27.5,55,82.5])addLine(Array.from({length:129},(_,i)=>{const angle=i/128*Math.PI*2;return ground(radius*Math.cos(angle),radius*Math.sin(angle),.42);}),cyan,.3);
   for(let i=0;i<12;i++){const angle=i/12*Math.PI*2;addLine(Array.from({length:41},(_,j)=>{const radius=j/40*110;return ground(radius*Math.cos(angle),radius*Math.sin(angle),.43);}),cyan,.22);}
   const boundary=Array.from({length:129},(_,i)=>{const angle=i/128*Math.PI*2;return ground(110*Math.cos(angle),110*Math.sin(angle),.55);});
   const rim=mesh(new T.TubeGeometry(new T.CatmullRomCurve3(boundary),128,.28,6,false),new T.MeshBasicMaterial({color:amber,depthTest:false,depthWrite:false}),0,0,0,overlay);
   rim.renderOrder=10;focusPoint.copy(ground(0,0));
   addLabel('D · TERRENO ESTUDIADO',ground(-23,-46,7),'#adfffa',2.35);
   addLabel('PAISAJE CONTEXTUAL',ground(0,-165,12),'#ffe4bc',2.1);
   if(mode==='aerial'){targetLook=V(0,20,0);targetCamera=V(0,290,8);}
   announce('D: radio 110 m · diámetro 220 m','La retícula cian sigue la superficie z=f(x,y) dentro del disco D. El paisaje exterior y el campus sirven de contexto visual, pero no amplían la región de los cálculos.');
  }
   if(key==='contours'||key==='all'){
    if(key==='contours'){
     const cutHeight=LEVELS[0]+(LEVELS[LEVELS.length-1]-LEVELS[0])*t,revealed=LEVELS.filter(level=>level<=cutHeight+1e-6).length;
     const planeOpacity=.07*(1-Math.max(0,Math.min(1,(t-.85)/.15))),plane=mesh(new T.CircleGeometry(110,96),new T.MeshBasicMaterial({color:0x8fe9e0,transparent:true,opacity:planeOpacity,side:T.DoubleSide,depthWrite:false}),0,cutHeight,0,overlay);plane.rotation.x=-Math.PI/2;plane.renderOrder=3;
     contours(LEVELS.slice(0,Math.max(1,revealed)));focusPoint.copy(ground(0,0));ring(110,amber);
     if(mode==='aerial'){targetLook=V(0,20,0);targetCamera=t<.48?V(0,290,8):V(130,205,145);}
     if(t>=.78){
      for(const [x,z,name,color] of [[3.2064,-1.6032,'ELEVACIÓN',red],[-73.1035,36.5517,'DEPRESIÓN',cyan],[64.3988,-32.1994,'ZONA SUAVE',0x84f0a3]] as [number,number,string,number][]){const marker=orb(ground(x,z,.6),color,1.5);marker.material.depthTest=false;marker.renderOrder=11;const halo=mesh(new T.RingGeometry(3.2,5.4,40),new T.MeshBasicMaterial({color,transparent:true,opacity:.72,side:T.DoubleSide,depthTest:false,depthWrite:false}),x,height(x,z)+.22,z,overlay);halo.rotation.x=-Math.PI/2;halo.renderOrder=10;addLabel(name,ground(x,z,8),`#${color.toString(16).padStart(6,'0')}`,1.02);}
      for(const [pair,color,offset] of [[CONTOUR_SPACING.inner,cyan,-17],[CONTOUR_SPACING.outer,amber,17]] as [[number,number],number,number][]){
       const [from,to]=pair,points=Array.from({length:25},(_,i)=>ground(0,from+(to-from)*i/24,.75));
       const measure=mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),48,.42,8,false),new T.MeshBasicMaterial({color,depthTest:false,depthWrite:false}),0,0,0,overlay);measure.renderOrder=12;
       for(const r of pair){const endpoint=orb(ground(0,r,.9),color,1.1);endpoint.material.depthTest=false;endpoint.renderOrder=13;}
       addLabel(`${(to-from).toFixed(1)} m`,ground(offset,(from+to)/2,12),`#${color.toString(16).padStart(6,'0')}`,2);
      }
     }
     announce(`Plano z=${cutHeight.toFixed(2)} m · ${Math.max(1,revealed)}/6 niveles`,`El plano horizontal corta z=f(x,y). Solo aparecen curvas cuyo nivel ya alcanzó el plano: ${LEVELS.slice(0,Math.max(1,revealed)).join(', ')} m. Curvas más próximas indican mayor cambio de cota por distancia horizontal; los marcadores finales localizan elevación, depresión y zona suave.`);
   }else contours(LEVELS,.72,true);
   }
   if(key==='axes'||key==='all'){arrow(ground(0,0),V(1,0,0),35,red);arrow(ground(0,0),V(0,0,1),35,cyan);arrow(V(0,0,0),V(0,1,0),35,amber);addLabel('x · ESTE / m',ground(38,0,2));addLabel('y · NORTE / m',ground(0,38,2));addLabel('z · ALTURA / m',V(0,38,0));}
   if(key==='traces'){
    focusPoint.copy(ground(0,0));ring(110,amber);
    for(const [axis,color,start,progress,title] of [[0,cyan,0,Math.min(1,t*2),'T₁ · x=0'],[1,amber,.5,Math.max(0,Math.min(1,(t-.5)*2)),'T₂ · y=0']] as [number,number,number,number,string][]){
     if(t<start)continue;
     const plane=mesh(new T.PlaneGeometry(220,35),new T.MeshBasicMaterial({color,transparent:true,opacity:.12,side:T.DoubleSide,depthWrite:false}),0,17.5,0,overlay);if(axis===0)plane.rotation.y=Math.PI/2;plane.renderOrder=3;
     const count=Math.max(2,Math.round(progress*110)),points=Array.from({length:count+1},(_,i)=>{const coordinate=-110+220*progress*i/count;return axis?V(coordinate,height(coordinate,0)+.5,0):V(0,height(0,coordinate)+.5,coordinate);});
     const profile=mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),Math.max(16,count*2),.25,6,false),new T.MeshBasicMaterial({color,depthTest:false,depthWrite:false}),0,0,0,overlay);profile.renderOrder=11;
     for(const coordinate of [-80,-40,0,40,80]){const point=axis?V(coordinate,height(coordinate,0)+.5,0):V(0,height(0,coordinate)+.5,coordinate);addLine([V(point.x,0,point.z),point],color,.25);}
     addLabel(title,axis?V(85,40,0):V(0,40,-85),`#${color.toString(16).padStart(6,'0')}`,1.28);
    }
    const coordinate=t<.5?-110+440*t:-110+440*(t-.5),axis=t<.5?0:1,point=axis?V(coordinate,height(coordinate,0)+.7,0):V(0,height(0,coordinate)+.7,coordinate);orb(point,axis?amber:cyan,.8);
    announce(`${axis?'T₂: y=0':'T₁: x=0'} · z=${height(axis?coordinate:0,axis?0:coordinate).toFixed(2)} m`,`El punto avanza por ${axis?'z=f(x,0)':'z=f(0,y)'}. Cada plano vertical corta la misma superficie del terreno; las líneas de perfil se construyen sobre esa intersección y sus proyecciones muestran la altura respecto de z=0. Trazos y sonda se separan ligeramente del suelo para verse; la cota indicada es f sin esa separación gráfica.`);
   }
  if(key==='evaluations'){
    ring(110,amber);
    const sites=[[0,0,'A',cyan],[40,-20,'P',amber],[64.3988,-32.1994,'B',0x84f0a3]] as [number,number,string,number][];
    for(const [x,z,name,color] of sites.slice(0,t<1/3?1:t<2/3?2:3)){
      const q=ground(x,z,1.1),marker=orb(q,color,1.5);
      marker.material.depthTest=false;marker.renderOrder=12;
      const halo=mesh(new T.RingGeometry(3.5,5.8,48),new T.MeshBasicMaterial({color,side:T.DoubleSide,depthTest:false,depthWrite:false}),q.x,height(x,z)+.5,q.z,overlay);
      halo.rotation.x=-Math.PI/2;halo.renderOrder=11;
      addLine([V(x,0,z),q],color,.65);
      addLabel(`${name} · ${height(x,z).toFixed(2)} m`,q.clone().add(V(0,8,0)),`#${color.toString(16).padStart(6,'0')}`,1.1);
    }
    announce(`A: ${height(0,0).toFixed(2)} m${t>=1/3?` · P: ${height(40,-20).toFixed(2)} m`:''}${t>=2/3?` · B: ${height(64.3988,-32.1994).toFixed(2)} m`:''}`,'Tres puntos del mismo terreno f, medidos respecto de z=0. Las líneas verticales muestran sus cotas; los anillos ubican cada punto en planta.');
  }
   if(key==='terrainInterpretation'){contours();const sites=[[3.2064,-1.6032,'ELEVACIÓN · evitar explanación',red,11],[-73.1035,36.5517,'DEPRESIÓN · revisar acumulación',cyan,12],[64.3988,-32.1994,'PLATAFORMA · pendiente 3.788%',0x84f0a3,10]] as [number,number,string,number,number][];for(const [x,z,name,color,r] of sites.slice(0,t<1/3?1:t<2/3?2:3)){const q=ground(x,z,.24),disc=mesh(new T.CircleGeometry(r,48),mat(color,.24),q.x,q.y,q.z,overlay);disc.rotation.x=-Math.PI/2;orb(q,color,.62);addLabel(name,q.clone().add(V(0,5,0)),`#${color.toString(16).padStart(6,'0')}`,.48);}announce('elevación · depresión · plataforma','Los tres conceptos están localizados sobre la misma f: forma, cota y pendiente conducen a una decisión distinta.');}
   if(key==='terrain'){
    focusPoint.copy(ground(0,0));ring(110,amber);
    for(const coordinate of [-80,-40,0,40,80]){
     const limit=Math.sqrt(110**2-coordinate**2);
     addLine(Array.from({length:41},(_,i)=>ground(coordinate,-limit+2*limit*i/40,.22)),cyan,.46);
     addLine(Array.from({length:41},(_,i)=>ground(-limit+2*limit*i/40,coordinate,.22)),cyan,.46);
    }
    const x=-80+160*t,z=35,probe=ground(x,z,.45),beamMat=new T.MeshBasicMaterial({color:0xb7fff0,transparent:true,opacity:.9,depthTest:false,depthWrite:false});
    rod(V(x,0,z),probe,.22,beamMat,overlay).renderOrder=7;orb(probe,cyan,1.8);
    addLabel(`P = (${x.toFixed(1)}, ${z.toFixed(1)}, ${height(x,z).toFixed(2)})`,probe.clone().add(V(0,8,0)),'#b7fff0',2.05);
    announce(`f(${x.toFixed(1)},${z.toFixed(1)}) = ${height(x,z).toFixed(2)} m`,'La sonda recorre posiciones dentro de D. Su línea vertical representa la altura z=f(x,y) sobre el plano de referencia. La cuadrícula se apoya sobre la misma superficie continua.');
   }
  }
  if(['gradientP','gradientQ','directional','directionalQ','directionalRose','normal','tangent','linear'].includes(key)){
   const isQ=key==='gradientQ'||key==='directionalQ',px=isQ?-50:40,pz=isQ?35:-20,g=grad(px,pz),a=t*Math.PI*2,ux=Math.cos(a),uz=Math.sin(a),d=g[0]*ux+g[1]*uz; p.copy(ground(px,pz,.12));focusPoint.copy(p);if(key!=='linear')orb(p,amber,key==='directionalQ'?.45:.85);
   if(!['directionalQ','directional'].includes(key)&&!active.name.startsWith('Gradiente'))for(const offset of [-12,0,12]){addLine(Array.from({length:31},(_,i)=>ground(px+offset,pz-15+i,.08)),0xffffff,.22);addLine(Array.from({length:31},(_,i)=>ground(px-15+i,pz+offset,.08)),0xffffff,.22);}
   if(key==='gradientP'||key==='gradientQ'||key.startsWith('directional')){
    const partialStep=active.name==='Derivadas parciales',gradientStep=active.name.startsWith('Gradiente'),directionStep=key==='directional',norm=Math.hypot(...g),contextOpacity=.17;
    if(partialStep){
     const fP=height(px,pz),join=t>=.8;
     for(const [dx,dz,color,start] of [[1,0,red,0],[0,1,cyan,.4]] as [number,number,number,number][]){
      if(t<start)continue;
      const progress=Math.max(0,Math.min(1,(t-start)/.4)),selected=t<start+.4||join,opacity=selected ? .9 : .32;
      const planeMaterial=mat(color,selected ? .16 : .04);planeMaterial.depthWrite=false;
      const plane=mesh(new T.PlaneGeometry(26,8),planeMaterial,px,fP,pz,overlay);if(dz)plane.rotation.y=Math.PI/2;
      if(progress>.001){
       const profile=Array.from({length:65},(_,i)=>ground(px+dx*(-12+24*progress*i/64),pz+dz*(-12+24*progress*i/64),.14));
       mesh(new T.TubeGeometry(new T.CatmullRomCurve3(profile),64,.13,6,false),new T.MeshBasicMaterial({color,transparent:true,opacity}),0,0,0,overlay);
       orb(profile[64],color,.35);
      }
      const slope=dx?g[0]:g[1],tangent=Array.from({length:25},(_,i)=>{const run=-6+12*i/24;return V(px+dx*run,fP+slope*run+.24,pz+dz*run);});
      mesh(new T.TubeGeometry(new T.CatmullRomCurve3(tangent),24,.06,6,false),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity,depthTest:false,depthWrite:false}),0,0,0,overlay);arrow(p,V(dx,slope,dz),9,color,opacity);
      addLabel(dx?'y = −20 m · corte en x':'x = 40 m · corte en y',p.clone().add(dx?V(-8,6,-5):V(5,7,-8)),dx?'#ffb3a7':'#baffee',.7);
     }
     if(join){
      const origin=p.clone().add(V(0,3,0)),scale=150,tip=origin.clone().add(V(g[0]*scale,0,g[1]*scale)),elbow=origin.clone().add(V(g[0]*scale,0,0));
      addLine([p,origin],0xffffff,.55);
      addLine([origin,elbow],red,1);addLine([elbow,tip],cyan,1);arrow(origin,V(g[0],0,g[1]),scale*norm,0x84f0a3);
     }
     announce(join?`∇f(P)=⟨${g[0].toFixed(7)}, ${g[1].toFixed(7)}⟩`:`${t<.4?'fₓ':'fᵧ'}(P) = ${(t<.4?g[0]:g[1]).toFixed(7)} m/m`,`${t<.4?'Se fija y=−20 m y se construye z=f(x,−20).':t<.8?'Se fija x=40 m y se construye z=f(40,y).':'Las dos tasas se reúnen en el vector horizontal ∇f(P); su longitud gráfica usa 150 m por unidad m/m.'} Rojo: fₓ<0, descenso al aumentar x. Cian: fᵧ>0, ascenso al aumentar y. Blanco: tangente local en P; los trazos se elevan ligeramente para distinguirlos del suelo.`);
    }else if(gradientStep){
     const frame=gradientFrameAt(px,pz),origin=V(px,height(px,pz)+3,pz),levelTrace=isQ?LEVEL_TRACE_Q:LEVEL_TRACE_P;
     const count=Math.max(2,Math.round((levelTrace.length-1)*Math.min(1,t/.3))),points=levelTrace.slice(0,count+1).map(point=>V(point.x,point.height+.18,point.y));
     const curve=mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),Math.max(16,count),.1,6,false),new T.MeshBasicMaterial({color:cyan,depthTest:false,depthWrite:false}),0,0,0,overlay);curve.renderOrder=9;
     addLine([V(px,height(px,pz),pz),origin],0xffffff,.5);
     for(const [direction,color,start,title] of [[frame.ascent,0x84f0a3,.25,'u⁺ · ascenso'],[frame.descent,amber,.5,'u⁻ · descenso'],[frame.level,0xffffff,.7,'u₀ · nivel']] as [[number,number],number,number,string][]){
      const reveal=Math.max(0,Math.min(1,(t-start)/.2));if(reveal<.001)continue;
      const vector=V(direction[0],0,direction[1]);arrow(origin,vector,12*reveal,color);
      const caption=addLabel(title,origin.clone().addScaledVector(vector,16).add(V(0,1,0)),title.includes('ascenso')?'#baffcb':title.includes('descenso')?'#ffe0ad':'#ffffff',.6);caption.material.depthTest=false;caption.material.depthWrite=false;caption.renderOrder=12;
     }
     if(t>=.9){const u=V(frame.ascent[0],0,frame.ascent[1]).multiplyScalar(1.5),v=V(frame.level[0],0,frame.level[1]).multiplyScalar(1.5);addLine([origin.clone().add(u),origin.clone().add(u).add(v),origin.clone().add(v)],0xffffff,1);}
     focusPoint.copy(V(px,height(px,pz),pz));
     announce(`Dᵤ⁺f=+${frame.norm.toFixed(6)} · Dᵤ⁻f=−${frame.norm.toFixed(6)} · Dᵤ₀f=0 m/m`,`En ${isQ?'Q':'P'}, las tres direcciones son unitarias. La curva cian satisface f(x,y)=${height(px,pz).toFixed(5)} m y su tangente local es perpendicular al gradiente. Flechas horizontales elevadas: 12 m gráficos por vector unitario; el terreno conserva su altura.`);
    }else{
     if(!['directionalQ','directional'].includes(key))for(const [dx,dz,col] of [[1,0,red],[0,1,cyan]] as [number,number,number][]){const pts=Array.from({length:81},(_,i)=>ground(px+(i-40)*.4*dx,pz+(i-40)*.4*dz,.08));addLine(pts,col,partialStep?1:contextOpacity);arrow(p,V(dx,g[0]*dx+g[1]*dz,dz),10,col,partialStep?1:contextOpacity);if(partialStep)addLabel(`${dx?'∂f/∂x':'∂f/∂y'} = ${(dx?g[0]:g[1]).toFixed(5)}`,p.clone().add(V(dx*10,4,dz*10)),'#eaf7ef',.72);}
    if(key==='directionalRose'){
     const rose=directionalRose(px,pz,96),scale=115,revealed=Math.max(1,Math.round(rose.length*Math.min(1,t/.8)));
     for(let i=0;i<revealed;i++){const r=rose[i],radius=3+Math.abs(r.value)*scale,end=ground(px+Math.cos(r.angle)*radius,pz+Math.sin(r.angle)*radius,.22);addLine([p,end],r.value>=0?0x84f0a3:amber,.82);}
     const current=rose[revealed-1],currentRadius=3+Math.abs(current.value)*scale;orb(ground(px+Math.cos(current.angle)*currentRadius,pz+Math.sin(current.angle)*currentRadius,.35),current.value>=0?0x84f0a3:amber,.35);
     if(t>.8){const growth=Math.min(1,(t-.8)/.2),maxDir=V(g[0]/norm,0,g[1]/norm);arrow(p,maxDir,15*growth,0x84f0a3);arrow(p,maxDir.clone().negate(),15*growth,amber);}
     announce(t<.8?`${revealed} de ${rose.length} rumbos · Dᵤf = ${(current.value*100).toFixed(3)} cm/m`:`máx |Dᵤf| = ${(norm*100).toFixed(3)} cm/m`,'La rosa se construye por rumbos. Verde asciende, ámbar desciende y el radio se anula sobre la curva de nivel.');
    }else{
     const run=12;
     if(key==='directionalQ'||key==='directional'){
      const sample=isQ?directionalAtQ(t):directionalAtP(t),origin=V(px,height(px,pz)+3,pz),scale=120;
      const gradient=V(g[0],0,g[1]),direction=V(sample.ux,0,sample.uy),projection=direction.clone().multiplyScalar(sample.derivative);
      const tip=origin.clone().addScaledVector(gradient,scale),projectedTip=origin.clone().addScaledVector(projection,scale);
      addLine([V(px,height(px,pz),pz),origin],0xffffff,.65);
      arrow(origin,gradient,scale*norm,0x84f0a3);arrow(origin,direction,18,0xffffff,.65);
      arrow(origin,projection,scale*Math.abs(sample.derivative),amber);
      const guide=new T.Line(new T.BufferGeometry().setFromPoints([tip,projectedTip]),new T.LineDashedMaterial({color:0xffffff,dashSize:.45,gapSize:.3,transparent:true,opacity:.85,depthTest:false,depthWrite:false}));guide.computeLineDistances();overlay.add(guide);
      const perpendicular=gradient.clone().sub(projection).normalize(),u=direction.clone().multiplyScalar(.7),v=perpendicular.multiplyScalar(.7);
      addLine([projectedTip.clone().sub(u),projectedTip.clone().sub(u).add(v),projectedTip.clone().add(v)],0xffffff,.9);
      const profile=Array.from({length:65},(_,i)=>ground(px+run*i/64*sample.ux,pz+run*i/64*sample.uy,.15));
      mesh(new T.TubeGeometry(new T.CatmullRomCurve3(profile),64,.09,6,false),new T.MeshBasicMaterial({color:cyan}),0,0,0,overlay);
      const probe=V(sample.x,height(sample.x,sample.y)+.2,sample.y);orb(probe,amber,.5);
      addLabel(`${isQ?'Q':'P'} · origen del rumbo`,origin.clone().add(V(-5,4,-5)),'#e9f6f3',.6);
      announce(`Dᵤf(${isQ?'Q':'P'}) = ${sample.derivative.toFixed(6)} m/m`,`Proyección del gradiente sobre ${isQ?'u=⟨1,−2⟩/√5':'u=⟨3/5,4/5⟩'}. Recorrido horizontal s=${sample.distance.toFixed(2)} m: cambio real Δf=${sample.delta.toFixed(5)} m; predicción local sDᵤf=${sample.linearDelta.toFixed(5)} m. Los vectores horizontales están elevados; escala gráfica 120 m por unidad m/m.`);
     }else{
      const end=ground(px+run*ux,pz+run*uz,.1),flat=V(end.x,p.y,end.z);
      addLine([p,flat,end],amber,directionStep?1:contextOpacity);
      addLine(Array.from({length:81},(_,i)=>ground(px+(i-40)*.4*ux,pz+(i-40)*.4*uz,.13)),amber,directionStep?1:contextOpacity);
      arrow(p,V(ux,d,uz),12,amber,directionStep?1:contextOpacity);
      arrow(p,V(g[0]/norm,norm,g[1]/norm),14,0x9bd780,gradientStep?1:contextOpacity);
      if(directionStep)addLabel(`Dᵤf = ${(d*100).toFixed(3)} cm/m`,p.clone().add(V(ux*14,4,uz*14)),'#ffcd87');
      if(gradientStep)addLabel(`∇f · ${(norm*100).toFixed(3)}%`,p.clone().add(V(g[0]/norm*16,4,g[1]/norm*16)),'#a5ffc0');
      announce(directionStep?`${d>=0?'↑':'↓'} ${Math.abs(d*100).toFixed(3)} cm/m`:`||∇f|| = ${(norm*100).toFixed(3)}%`,directionStep?`Rumbo ${(a*180/Math.PI).toFixed(0)}°; la flecha ámbar muestra la derivada direccional en ese rumbo.`:'Rojo y cian indican las tasas parciales sobre los ejes; el gradiente reúne ambas componentes.');
     }
    }
    }
   }else{
    if(key!=='linear'&&active.name!=='Segundas derivadas'){const size=1.2+5.8*t;mesh(surface((x,z)=>tangentAt(x,z)+.06,px-size,px+size,pz-size,pz+size,16),mat(amber,.28),0,0,0,overlay);if(key==='normal')arrow(p,V(-g[0],1,-g[1]),2+10*t,cyan);}
    if(active.name==='Plano tangente'){const size=1.2+5.8*t;for(const offset of [-size/2,0,size/2])for(const [dx,dz] of [[1,0],[0,1]]){const profile=Array.from({length:49},(_,i)=>{const along=-size+2*size*i/48,x=px+dx*along+dz*offset,z=pz+dz*along+dx*offset;return ground(x,z,.12);});const trace=addLine(profile,cyan,.8);(trace.material as T.LineBasicMaterial).depthTest=false;trace.renderOrder=9;}}
    if(key==='normal')arrow(p,V(0,1,0),2+10*t,0xffffff,.55);
    if(key==='linear'){
     const sample=linearizationAt(t),size=1.2+5.8*Math.min(1,t/.25),P=V(px,height(px,pz),pz),q=V(sample.x,sample.exact,sample.y),l=V(sample.x,sample.linear,sample.y);
     const plane=mesh(surface(tangentAt,px-size,px+size,pz-size,pz+size,24),new T.MeshBasicMaterial({color:amber,transparent:true,opacity:.27,side:T.DoubleSide,depthTest:false,depthWrite:false}),0,0,0,overlay);plane.renderOrder=7;
     const boundary=[V(px-size,tangentAt(px-size,pz-size),pz-size),V(px+size,tangentAt(px+size,pz-size),pz-size),V(px+size,tangentAt(px+size,pz+size),pz+size),V(px-size,tangentAt(px-size,pz+size),pz+size),V(px-size,tangentAt(px-size,pz-size),pz-size)];
     const rim=addLine(boundary,amber,.85);(rim.material as T.LineBasicMaterial).depthTest=false;rim.renderOrder=8;
     for(const offset of [-6,-3,0,3,6])for(const [dx,dz] of [[1,0],[0,1]]){
      const points=Array.from({length:49},(_,i)=>{const along=-7+14*i/48,x=px+dx*along+dz*offset,z=pz+dz*along+dx*offset;return V(x,height(x,z),z);});
      const terrainGrid=addLine(points,cyan,.75);(terrainGrid.material as T.LineBasicMaterial).depthTest=false;terrainGrid.renderOrder=9;
     }
     if(sample.fraction>.001){
      const profile=Array.from({length:49},(_,i)=>{const fraction=sample.fraction*i/48;return V(40+4*fraction,height(40+4*fraction,-20+3*fraction),-20+3*fraction);});
      const realTrace=mesh(new T.TubeGeometry(new T.CatmullRomCurve3(profile),48,.025,6,false),new T.MeshBasicMaterial({color:cyan,depthTest:false,depthWrite:false}),0,0,0,overlay);realTrace.renderOrder=10;
      const linearTrace=addLine([P,l],amber);(linearTrace.material as T.LineBasicMaterial).depthTest=false;linearTrace.renderOrder=10;
      const errorSegment=addLine([q,l],red);(errorSegment.material as T.LineBasicMaterial).depthTest=false;errorSegment.renderOrder=12;
      const exactPoint=orb(q,cyan,.15),linearPoint=orb(l,amber,.1);for(const marker of [exactPoint,linearPoint]){marker.material.depthTest=false;marker.renderOrder=11;}
     }
     if(t>=.75){
      // The separate comparison rig enlarges only the vertical error; q and l remain at their exact coordinates.
      const rigX=sample.x+6,rigZ=sample.y,base=V(rigX,sample.exact,rigZ),top=V(rigX,sample.exact+Math.abs(sample.error)*80,rigZ);
      const link=addLine([q,base],cyan,.65);(link.material as T.LineBasicMaterial).depthTest=false;link.renderOrder=11;
      for(const [level,color] of [[base,cyan],[top,amber]] as const){const tick=addLine([level.clone().add(V(-1,0,0)),level.clone().add(V(1,0,0))],color);(tick.material as T.LineBasicMaterial).depthTest=false;tick.renderOrder=12;}
      const amplified=rod(base,top,.08,mat(red,.9),overlay);amplified.material.depthTest=false;amplified.renderOrder=12;
      const comparisonLabel=addLabel('ERROR VERTICAL ×80',top.clone().add(V(3,1,0)),'#ffb7a2',.45);comparisonLabel.material.depthTest=false;comparisonLabel.material.depthWrite=false;comparisonLabel.renderOrder=14;
     }
     const contact=orb(P,0xffffff,.22);contact.material.depthTest=false;contact.renderOrder=11;
     const pointLabel=addLabel('P · contacto del plano',P.clone().add(V(-4,3,-3)),'#ffffff',.42);pointLabel.material.depthTest=false;pointLabel.material.depthWrite=false;pointLabel.renderOrder=14;
     if(t>=.75){const hLabel=addLabel('H = (44, −17)',q.clone().add(V(4,3,2)),'#baffee',.42);hLabel.material.depthTest=false;hLabel.material.depthWrite=false;hLabel.renderOrder=14;}
     focusPoint.copy(V(42,height(42,-18.5),-18.5));
     announce(`${(Math.abs(sample.error)*100).toFixed(3)} cm de error`,`${t<.25?'El plano se construye en P.':t<.75?'El punto avanza hacia H.':'Comparación en H.'} En (${sample.x.toFixed(2)},${sample.y.toFixed(2)}): f=${sample.exact.toFixed(5)} m; L=${sample.linear.toFixed(5)} m; error=${sample.error.toFixed(6)} m (${sample.relative.toFixed(3)} %). La regla 3D y el recuadro amplían el error vertical ×80; el terreno y el plano conservan sus coordenadas reales.`);
    }
    if(active.name==='Segundas derivadas'){for(const zoff of [-6,0,6])addLine(Array.from({length:81},(_,i)=>ground(px-16+i*.4,pz+zoff,.1)),cyan);const xx=px-12+t*24,gg=grad(xx,pz),hh=hessian(xx,pz),pp=ground(xx,pz,.1);arrow(ground(px,pz,.2),V(1,g[0],0),9,amber,.55);orb(pp);arrow(pp,V(1,gg[0],0),9,red);announce(`fₓₓ=${hh[0].toFixed(6)} m⁻¹`,`En x=${xx.toFixed(1)}: fₓ=${gg[0].toFixed(5)}, fᵧᵧ=${hh[2].toFixed(6)}, fₓᵧ=${hh[1].toFixed(6)}. La tangente gira al avanzar.`);}
   }
  }
  if(['criticals','criticalMin','criticalOther','safe','candidates','base'].includes(key)){
   const lagrange=lagrangeAt(t),minimum=lagrangeAt(1),maximum=lagrangeAt(.7);
   if(key==='candidates'){
    const points=Array.from({length:193},(_,i)=>ground(72*Math.cos(START+i/192*2*Math.PI),72*Math.sin(START+i/192*2*Math.PI),.25));
    const geometry=new T.TubeGeometry(new T.CatmullRomCurve3(points),192,.32,6,false),positions=geometry.attributes.position,colors:number[]=[];
    for(let i=0;i<positions.count;i++){const angle=Math.atan2(positions.getZ(i),positions.getX(i)),g=grad(72*Math.cos(angle),72*Math.sin(angle)),ratio=(g[0]**2+g[1]**2-minimum.objective)/(maximum.objective-minimum.objective),color=new T.Color(0x84f0a3).lerp(new T.Color(red),Math.max(0,Math.min(1,ratio)));colors.push(color.r,color.g,color.b);}
    geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));mesh(geometry,new T.MeshBasicMaterial({vertexColors:true,toneMapped:false,depthTest:false,depthWrite:false}),0,0,0,overlay);
    if(mode==='aerial'&&lastLagrangeStage!==lagrange.stage){lastLagrangeStage=lagrange.stage;targetLook=lagrange.stage==='sweep'?ground(0,0):ground(lagrange.x,lagrange.y,2);targetCamera=targetLook.clone().add(lagrange.stage==='sweep'?V(95,100,125):V(34,35,42));}
   }else ring(72,cyan);
   const ang=key==='candidates'?lagrange.angle:t*Math.PI*2,x=72*Math.cos(ang),z=72*Math.sin(ang),g=grad(x,z),q=ground(x,z,.1);focusPoint.copy(key==='candidates'&&lagrange.stage!=='minimum'?ground(0,0):q);
   if(key.startsWith('critical')){const criticalSites=[[-73.1035,36.5517,'MÍNIMO',0x84f0a3],[3.2064,-1.6032,'MÁXIMO',red],[69.8971,-34.9485,'SILLA',0xb18cff]] as [number,number,string,number][];const shown=key==='criticals'?criticalSites.slice(0,t<1/3?1:t<2/3?2:3):key==='criticalMin'?criticalSites.slice(0,1):criticalSites.slice(t<.5?1:2,t<.5?2:3);for(const [xx,zz,n,color] of shown){const pp=ground(xx,zz,.3),hh=hessian(xx,zz);orb(pp,color,.8);addLabel(n,pp.clone().add(V(0,5,0)));for(const [dx,dz] of [[1,0],[0,1]])addLine(Array.from({length:41},(_,i)=>ground(xx+(i-20)*.6*dx,zz+(i-20)*.6*dz,.1)),cyan,.48);const patch=surface((x,z)=>height(xx,zz)+6*.5*(hh[0]*(x-xx)**2+2*hh[1]*(x-xx)*(z-zz)+hh[2]*(z-zz)**2)+.35,xx-7,xx+7,zz-7,zz+7,18);mesh(patch,mat(color,.38),0,0,0,overlay);addLabel('HESSIANO · altura ×6',pp.clone().add(V(0,2.1,0)),`#${color.toString(16).padStart(6,'0')}`,.34);}const site=key==='criticalMin'?criticalSites[0]:key==='criticalOther'?criticalSites[t<.5?1:2]:criticalSites[1];focusPoint.copy(ground(site[0],site[1]));}
   else{
    orb(q,amber,.7);const plane=mesh(surface((xx,zz)=>height(x,z)+g[0]*(xx-x)+g[1]*(zz-z)+.15,x-5,x+5,z-5,z+5,4),mat(amber,.6),0,0,0,overlay);plane.name='Plataforma candidata';
    const ngX=x/72,ngZ=z/72,movingOrigin=key==='candidates'?q.clone().add(V(0,3,0)):q;
    if(key!=='candidates'||lagrange.stage==='sweep')arrow(movingOrigin,V(ngX,0,ngZ),12,cyan,.95);
    const gF=gradObjective(x,z),normGF=Math.hypot(gF[0],gF[1]);
    if(normGF>1e-7&&(key!=='candidates'||lagrange.stage==='sweep')){const nfX=gF[0]/normGF,nfZ=gF[1]/normGF;arrow(movingOrigin,V(nfX,0,nfZ),12,0xffa050,.95);}
    for(const s of [1,-1]){
     const bx=s*72*Math.cos(START),bz=s*72*Math.sin(START),pp=ground(bx,bz,.15),selected=key==='candidates'&&((s===1&&lagrange.stage==='minimum')||(s===-1&&lagrange.stage==='maximum'));orb(pp,s===1?0x84f0a3:red,selected?1.4:.9);const candidateRing=mesh(new T.RingGeometry(3.8,selected?7.2:5.8,48),mat(s===1?0x84f0a3:red,.7),pp.x,pp.y+.2,pp.z,overlay);candidateRing.rotation.x=-Math.PI/2;
     const bRad=V(bx/72,0,bz/72),objectiveGradient=gradObjective(bx,bz),objectiveNorm=Math.hypot(...objectiveGradient),vectorOrigin=key==='candidates'?pp.clone().add(V(0,3,0)):pp;arrow(vectorOrigin,bRad,13,cyan,.9);if(objectiveNorm>1e-9)arrow(vectorOrigin,V(objectiveGradient[0]/objectiveNorm,0,objectiveGradient[1]/objectiveNorm),13,0xffa050,.9);
     addLabel(s===1?'B⁺ · 3.788% · ELEGIDO':'B⁻ · 6.472% · DESCARTADO',pp.clone().add(V(0,8,0)),s===1?'#84f0a3':'#ff7b7b',1.48);
    }
    const curSlope=Math.hypot(...g)*100;
    announce(`${curSlope.toFixed(3)}% pendiente`,key==='candidates'?`F=${lagrange.objective.toFixed(6)}; residuo ‖∇F−λ∇g‖=${lagrange.residual.toExponential(2)}. ${lagrange.stage==='sweep'?'Búsqueda sobre la circunferencia completa.':lagrange.stage==='maximum'?'B⁻: candidato de mayor pendiente.':'B⁺: candidato de menor pendiente sobre la frontera de comparación.'} Flechas cian y naranja: direcciones normalizadas de ∇g y ∇F.`:`Lagrange: ∇F = λ∇g confirma paralelismo. B⁺(64.4, −32.2) minimiza la pendiente sobre la circunferencia de comparación (3.788% vs 6.472%).`);
   }
  }
  if(['route','vectors','tangentVector','curvature','routeMarkers','safeSpeed'].includes(key)){
   const tt=START+t*Math.PI,q=V(...routeAt(tt)),v=V(...velocityAt(tt)),acc=V(...accelerationAt(tt));focusPoint.copy(q);rover.position.copy(q);const direction=v.clone().normalize(),gg=grad(q.x,q.z),up=V(-gg[0],1,-gg[1]).normalize(),right=up.clone().cross(direction).normalize();rover.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(right,up,direction));
   const routeTrace=addLine(routePoints,amber);if(key==='curvature'){(routeTrace.material as T.LineBasicMaterial).depthTest=false;routeTrace.renderOrder=9;}const halo=mesh(new T.RingGeometry(key==='curvature'?4.6:2.4,key==='curvature'?6:3.15,40),key==='curvature'?new T.MeshBasicMaterial({color:0x84f0a3,transparent:true,opacity:.72,depthTest:false,depthWrite:false}):mat(0x84f0a3,.68),q.x,q.y+.18,q.z,overlay);halo.rotation.x=-Math.PI/2;if(key==='curvature')halo.renderOrder=11;const vectorOrigin=q.clone().add(V(0,1,0)),tangent=v.clone().normalize(),normalFrenet=acc.clone().sub(tangent.clone().multiplyScalar(acc.dot(tangent))).normalize();arrow(vectorOrigin,v,14,cyan,key==='vectors'?.95:.2);arrow(vectorOrigin,acc,10,red,key==='vectors'?.95:.2);arrow(vectorOrigin,tangent,13,cyan,key==='tangentVector'?1:.22);if(key==='tangentVector')addLabel('T̂ = r′ / ||r′||',vectorOrigin.clone().addScaledVector(tangent,15),'#9ff7ef');
   if(key==='route'&&active.name==='Longitud de arco'){const index=Math.min(255,Math.floor(t*256)),distance=routeDistanceAt(t),covered=routePoints.slice(0,index+1);covered.push(q.clone().add(V(0,.16,0)));if(t>.005)mesh(new T.TubeGeometry(new T.CatmullRomCurve3(covered),Math.max(12,index),.18,6,false),new T.MeshBasicMaterial({color:0x64e1e0}),0,0,0,overlay);const projection=V(q.x,.2,q.z),drop=addLine([projection,q],0xffa766,.58);(drop.material as T.LineBasicMaterial).depthTest=false;drop.renderOrder=11;announce(`${distance.toFixed(1)} / ${ROUTE_LENGTH.toFixed(1)} m`,`La línea cian es el tramo espacial ya recorrido; la línea ámbar queda pendiente. En planta se recorren ${(72*Math.PI*t).toFixed(1)} m hasta esta posición. La diferencia incorpora la altura f(x,y).`);}
   if(key==='route'&&active.name==='Regla de la cadena'){
    const sample=chainAt(t),componentOrigin=q.clone().add(V(0,4,0));
    if(Math.abs(sample.dx)>1e-8)arrow(componentOrigin,V(Math.sign(sample.dx),0,0),.18*Math.abs(sample.dx),red);
    if(Math.abs(sample.dy)>1e-8)arrow(componentOrigin,V(0,0,Math.sign(sample.dy)),.18*Math.abs(sample.dy),cyan);
    // A signed addition diagram travels with the rover: red and cyan are the
    // two chain-rule terms; amber is their sum. Its vertical scale is schematic.
    const bars=q.clone().add(V(-12,9,8)),barScale=2.4;
    addLine([bars.clone().add(V(-1,0,0)),bars.clone().add(V(12,0,0))],0xfff0d4,.8);
    for(const [offset,term,color] of [[0,sample.xTerm,red],[4,sample.yTerm,cyan],[9,sample.derivative,amber]] as [number,number,number][]){
     const start=bars.clone().add(V(offset,0,0)),end=start.clone().add(V(0,term*barScale,0));
     if(Math.abs(term)>1e-6){const bar=rod(start,end,.18,new T.MeshBasicMaterial({color,depthTest:false,depthWrite:false}),overlay);bar.renderOrder=12;}
     const marker=orb(end,color,.38);marker.material.depthTest=false;marker.material.depthWrite=false;marker.renderOrder=13;
    }
    const index=Math.min(255,Math.floor(t*256)),covered=routePoints.slice(0,index+1);
    covered.push(q.clone().add(V(0,.24,0)));
    if(t>.005){const trace=mesh(new T.TubeGeometry(new T.CatmullRomCurve3(covered),Math.max(12,index),.23,6,false),new T.MeshBasicMaterial({color:cyan,depthTest:false}),0,0,0,overlay);trace.renderOrder=11;}
    const derivative=v.y,descending=derivative<-.0001,rising=derivative>.0001;
    const signColor=descending?red:rising?0x84f0a3:amber,origin=q.clone().add(V(7,8,4));
    arrow(origin,descending?V(0,-1,0):V(0,1,0),5,signColor);
   }
   if(key!=='curvature'&&!lengthScene&&active.name!=='Regla de la cadena')for(const [u,n] of [[0,'INICIO · dz/dt=0'],[.5,'C* · MÁXIMO DESCENSO'],[1,'FINAL · dz/dt=0']] as [number,string][]){const pp=V(...routeAt(START+u*Math.PI));orb(pp,amber,.4);addLabel(n,pp.clone().add(V(0,4,0)));}
   const cross=v.clone().cross(acc),k=cross.length()/v.length()**3;
   if(key==='curvature'){
    const r=1/k,center=q.clone().addScaledVector(normalFrenet,r);
    const pts=Array.from({length:181},(_,i)=>center.clone().addScaledVector(normalFrenet,-r*Math.cos(i/180*Math.PI*2)).addScaledVector(tangent,r*Math.sin(i/180*Math.PI*2)));
    const osculatingCircle=mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),240,.34,8,false),new T.MeshBasicMaterial({color:cyan,depthTest:false,depthWrite:false}),0,0,0,overlay);osculatingCircle.renderOrder=10;
    const start=Math.max(START,tt-.12),end=Math.min(START+Math.PI,tt+.12),local=Array.from({length:31},(_,i)=>V(...routeAt(start+(end-start)*i/30)));
    const localTrace=mesh(new T.TubeGeometry(new T.CatmullRomCurve3(local),60,.46,8,false),new T.MeshBasicMaterial({color:0xb18cff,depthTest:false,depthWrite:false}),0,0,0,overlay);localTrace.renderOrder=11;
    const radiusLine=mesh(new T.TubeGeometry(new T.LineCurve3(q,center),20,.45,7,false),new T.MeshBasicMaterial({color:amber,depthTest:false,depthWrite:false}),0,0,0,overlay);
    radiusLine.renderOrder=12;
    arrow(vectorOrigin,tangent,15,cyan);arrow(vectorOrigin,normalFrenet,12,0xb18cff);
    const centerMarker=orb(center,amber,1.1);centerMarker.material.depthTest=false;centerMarker.material.depthWrite=false;centerMarker.renderOrder=13;
    orb(q,red,.8);
    const centerLabel=addLabel('CENTRO DE GIRO · radio real',center.clone().add(V(0,5,0)),'#ffe0ad',.9);
    centerLabel.material.depthTest=false;centerLabel.renderOrder=14;
    const scaleStart=q.clone().addScaledVector(normalFrenet,-7).add(V(0,.5,0)),scaleEnd=scaleStart.clone().addScaledVector(tangent,10);
    const scaleBar=mesh(new T.TubeGeometry(new T.LineCurve3(scaleStart,scaleEnd),12,.16,6,false),new T.MeshBasicMaterial({color:0xfff0d4,depthTest:false,depthWrite:false}),0,0,0,overlay);scaleBar.renderOrder=13;
    for(const endpoint of [scaleStart,scaleEnd]){const marker=orb(endpoint,0xfff0d4,.33);marker.material.depthTest=false;marker.renderOrder=14;}
    for(const endpoint of [scaleStart,scaleEnd]){const tick=mesh(new T.TubeGeometry(new T.LineCurve3(endpoint.clone().addScaledVector(normalFrenet,-.8),endpoint.clone().addScaledVector(normalFrenet,.8)),4,.13,6,false),new T.MeshBasicMaterial({color:0xfff0d4,depthTest:false,depthWrite:false}),0,0,0,overlay);tick.renderOrder=14;}
   }
   if(key==='curvature'&&!autoRover&&mode==='aerial')aimCurvatureCamera(t);
   if(key==='safeSpeed'){const safe=safeRoverSpeed(tt);arrow(vectorOrigin,tangent,safe.speed*2.1,0x84f0a3);addLabel(`vₘₐₓ = ${safe.speed.toFixed(2)} m/s`,vectorOrigin.clone().addScaledVector(tangent,16),'#baffcb');announce(`${safe.speed.toFixed(2)} m/s`,`Límite ideal por κ=${safe.curvature.toFixed(8)} m⁻¹ y aₗₐₜ,máx=${safe.lateralAcceleration.toFixed(2)} m/s². No sustituye tracción ni detección de obstáculos.`);}
   else if(!(key==='route'&&active.name==='Longitud de arco'))announce(key==='curvature'?`κ = ${k.toFixed(6)} m⁻¹ · R = ${(1/k).toFixed(2)} m`:`t = ${tt.toFixed(3)} rad`,`z=${q.y.toFixed(3)} m · dz/dt=${v.y.toFixed(4)} m/rad · recorrido total 226.205 m. Cian: T̂/r′; rojo: r″; morado: N̂.`);
  }else{const tt=START+.35,q=V(...routeAt(tt)),g=grad(q.x,q.z),up=V(-g[0],1,-g[1]).normalize(),forward=V(...velocityAt(tt)).normalize();rover.position.copy(q);rover.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(up.clone().cross(forward).normalize(),up,forward));}
  if(['solarRegion','surfaceArea','polarGrid','doubleVolume','solarPower'].includes(key)){
   const regionWalk=key==='solarRegion'&&active.name==='Región, límites y orden';
   focusPoint.copy(ground(regionWalk?34:key==='solarPower'?66:62,regionWalk?-15:key==='solarPower'?-18:-20));if(key!=='doubleVolume'&&!regionWalk)mesh(sector(.08),mat(cyan,key==='solarPower'?.1:.4),0,0,0,overlay);
   if(regionWalk){
    if(regionCampus){
     mesh(sector(.12),new T.MeshBasicMaterial({color:cyan,transparent:true,opacity:.1,side:T.DoubleSide,depthWrite:false}),0,0,0,overlay);
     const center=ground(66*Math.cos(-Math.PI/8),66*Math.sin(-Math.PI/8),1),caption=center.clone().add(V(20,23,0));
     addLine([center,caption],cyan,.9);addLabel('R · INFRAESTRUCTURA',caption,'#baffee',2.2);
    }
    const a0=-Math.PI/4,a1=a0+t*Math.PI/4,point=(r:number,a:number,lift=.3)=>ground(r*Math.cos(a),r*Math.sin(a),lift);
    const vertices:number[]=[],indices:number[]=[],nr=12,na=Math.max(2,Math.ceil(60*t));for(let j=0;j<=na;j++)for(let i=0;i<=nr;i++){const r=60+12*i/nr,a=a0+(a1-a0)*j/na;vertices.push(...point(r,a).toArray());}for(let j=0;j<na;j++)for(let i=0;i<nr;i++){const p=j*(nr+1)+i,q=p+nr+1;indices.push(p,q,p+1,p+1,q,q+1);}const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();const fill=mesh(geometry,new T.MeshBasicMaterial({color:cyan,transparent:true,opacity:.16,side:T.DoubleSide,depthWrite:false}),0,0,0,overlay);fill.renderOrder=9;
    for(const r of [60,72]){const edge=Array.from({length:65},(_,i)=>point(r,a0+i/64*Math.PI/4,.45));mesh(new T.TubeGeometry(new T.CatmullRomCurve3(edge),64,.12,6,false),new T.MeshBasicMaterial({color:r===60?0xa9f7f0:0xffd08b}),0,0,0,overlay);}
    for(const a of [a0,0])addLine([point(60,a,.5),point(72,a,.5)],amber,.8);
    const sweep=addLine([point(60,a1,.65),point(72,a1,.65)],red,1);(sweep.material as T.LineBasicMaterial).depthTest=false;sweep.renderOrder=11;
    addLine(Array.from({length:37},(_,i)=>point(72*i/36,a1,.55)),0xffdf9f,.65);orb(point(0,0,1),amber,.85);if(!regionCampus){addLabel('ORIGEN · r=0',point(0,0,6),'#ffe0ad',1.05);for(const [r,captionRadius,color] of [[60,48,'#a9f7f0'],[72,84,'#ffe0ad']] as [number,number,string][]){const anchor=point(r,-Math.PI/8,.6),caption=point(captionRadius,-Math.PI/8,6);addLine([anchor,caption],r===60?cyan:amber,.9);addLabel('r = '+r+' m',caption,color,1.1);}}addLabel(`θ=${(a1*180/Math.PI).toFixed(1)}°`,point(36,a1,9),'#ffb0a4',1.05);
    const area=.5*(72**2-60**2)*(a1-a0);if(!regionCampus)addLabel(`Aₚ = ${area.toFixed(2)} m²`,point(66,(a0+a1)/2,13),'#baffee',1.15);announce(`${area.toFixed(2)} / 622.04 m² en planta`,`${regionCampus?'R está localizada junto al hábitat y al campo solar. Su contorno completo se muestra como referencia; el barrido coloreado conserva el mismo θ. ':'Vista aislada de la misma R. '}La franja radial va de 60 a 72 m; θ barre desde −45° hasta 0°. El área proyectada total es 622.035 m²; el área real del relieve se calcula aparte.`);
    aimPhaseVCamera();
   }
    else if(key==='polarGrid'||key==='solarRegion'){
     for(let r=60;r<=72;r+=2)addLine(Array.from({length:50},(_,i)=>ground(r*Math.cos(-Math.PI/4+i/49*Math.PI/4),r*Math.sin(-Math.PI/4+i/49*Math.PI/4),.14)),cyan);
     for(let a=-Math.PI/4;a<=0;a+=Math.PI/32)addLine([ground(60*Math.cos(a),60*Math.sin(a),.14),ground(72*Math.cos(a),72*Math.sin(a),.14)],amber);
     if(key==='solarRegion'){
      const a=-Math.PI/4+t*Math.PI/4;
      addLine([ground(60*Math.cos(a),60*Math.sin(a),.2),ground(72*Math.cos(a),72*Math.sin(a),.2)],red);
      addLabel('r = 60 m',ground(60*Math.cos(-Math.PI/8),60*Math.sin(-Math.PI/8),4),'#baffee',.68);
      addLabel('r = 72 m',ground(72*Math.cos(-Math.PI/8),72*Math.sin(-Math.PI/8),5),'#baffee',.68);
      addLabel('θ = −45°',ground(66/Math.sqrt(2),-66/Math.sqrt(2),4),'#ffe0ad',.68);
      addLabel('θ = 0°',ground(66,0,4),'#ffe0ad',.68);
      announce(`θ = ${(a*180/Math.PI).toFixed(1)}° · 60 ≤ r ≤ 72 m`,'La cuadrícula usa radios y ángulos para recorrer el sector. La región incluye espacios de servicio.');
     }else{
      const delta=Math.PI/24,angle=-Math.PI/4+t*(Math.PI/4-delta),point=(radius:number,theta:number)=>ground(radius*Math.cos(theta),radius*Math.sin(theta),.46);
      const cell=(r0:number,color:number)=>{
       const vertices:number[]=[],indices:number[]=[],nr=4,na=12;
       for(let j=0;j<=na;j++)for(let i=0;i<=nr;i++)vertices.push(...point(r0+4*i/nr,angle+delta*j/na).toArray());
       for(let j=0;j<na;j++)for(let i=0;i<nr;i++){const p=j*(nr+1)+i,q=p+nr+1;indices.push(p,q,p+1,p+1,q,q+1);}
       const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
       const patch=mesh(geometry,new T.MeshBasicMaterial({color,transparent:true,opacity:.92,side:T.DoubleSide,depthWrite:false}),0,0,0,overlay);patch.renderOrder=10;
       const edge=[...Array.from({length:na+1},(_,i)=>point(r0,angle+delta*i/na)),...Array.from({length:nr},(_,i)=>point(r0+4*(i+1)/nr,angle+delta)),...Array.from({length:na},(_,i)=>point(r0+4,angle+delta*(na-i-1)/na)),...Array.from({length:nr-1},(_,i)=>point(r0+4*(nr-i-1)/nr,angle)),point(r0,angle)];
       addLine(edge,color,1);
       return .5*((r0+4)**2-r0**2)*delta;
      };
      const innerArea=cell(60,0xffd38e),outerArea=cell(68,0xff7770);
      // Dimensions live in one horizontal plane: their lengths are projected
      // polar lengths, not distances measured along the relief.
      const mid=angle+delta/2,dimensionHeight=height(66*Math.cos(mid),66*Math.sin(mid))+3;
      const projected=(radius:number,theta:number)=>V(radius*Math.cos(theta),dimensionHeight,radius*Math.sin(theta));
      const dimension=(points:T.Vector3[],color:number)=>mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),Math.max(8,points.length*2),.085,6,false),new T.MeshBasicMaterial({color}),0,0,0,overlay);
      for(const [r0,color] of [[60,0xffd38e],[68,0xff7770]]){
       const radius=r0+2,radialStart=projected(r0,angle),radialEnd=projected(r0+4,angle);
       dimension([radialStart,radialEnd],0xffffff);orb(radialStart,0xffffff,.16);orb(radialEnd,0xffffff,.16);
       for(const r of [r0,r0+4])addLine([point(r,angle),projected(r,angle)],color,.55);
       const arc=Array.from({length:25},(_,i)=>projected(radius,angle+delta*i/24));
       dimension(arc,0x84f0a3);orb(arc[0],0x84f0a3,.16);orb(arc[24],0x84f0a3,.16);
       const anchor=projected(radius,mid),caption=projected(r0===60?51:81,mid).add(V(0,3,0));
       addLine([anchor,caption],color,.7);
       addLabel(`r̄Δθ = ${(radius*delta).toFixed(3)} m`,caption,`#${color.toString(16).padStart(6,'0')}`,.72);
      }
      addLabel('Δr = 4 m · ambas',projected(66,angle-.14).add(V(0,2,0)),'#ffffff',.68);
      focusPoint.copy(ground(61,-24,4));
      announce(`${innerArea.toFixed(2)} → ${outerArea.toFixed(2)} m² en planta`,`Blanco: Δr=4 m en ambas celdas. Verde: arco al radio medio r̄Δθ, ${(62*delta).toFixed(3)} m dentro y ${(70*delta).toFixed(3)} m fuera; Δθ=π/24 rad. Las cotas se dibujan en un plano horizontal elevado para mostrar longitudes en planta. A=r̄ΔrΔθ da ${innerArea.toFixed(3)} y ${outerArea.toFixed(3)} m². La exterior tiene ${(100*(outerArea/innerArea-1)).toFixed(3)} % más área: ese crecimiento es el factor |J|=r.`);
     }
    }
   if(key==='surfaceArea'){
    const projectionHeight=26,plane=mesh(sector(0),mat(amber,.33),0,0,0,overlay),pp=plane.geometry.attributes.position;
    for(let i=0;i<pp.count;i++)pp.setY(i,projectionHeight);pp.needsUpdate=true;plane.geometry.computeVertexNormals();
    for(let i=0;i<8;i++){const a=-Math.PI/4+i/7*Math.PI/4;addLine([V(66*Math.cos(a),projectionHeight,66*Math.sin(a)),ground(66*Math.cos(a),66*Math.sin(a))],amber,.65);}
    const angle=-Math.PI/4+(.15+.7*t)*Math.PI/4,x=66*Math.cos(angle),z=66*Math.sin(angle),g=grad(x,z),factor=Math.sqrt(1+g[0]**2+g[1]**2),half=1.5;
    const footprint=[[x-half,z-half],[x+half,z-half],[x+half,z+half],[x-half,z+half]] as [number,number][];
    const trueCorners=footprint.map(([xx,zz])=>V(xx,height(xx,zz)+.48,zz)),flatCorners=footprint.map(([xx,zz])=>V(xx,projectionHeight+.35,zz));
    const tile=(corners:T.Vector3[],color:number)=>{const vertices=new Float32Array([...corners[0].toArray(),...corners[1].toArray(),...corners[2].toArray(),...corners[0].toArray(),...corners[2].toArray(),...corners[3].toArray()]),geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(vertices,3));geometry.computeVertexNormals();const patch=mesh(geometry,new T.MeshBasicMaterial({color,transparent:true,opacity:.86,side:T.DoubleSide,depthWrite:false}),0,0,0,overlay);patch.renderOrder=10;addLine([...corners,corners[0]],color,1);};
    tile(flatCorners,amber);tile(trueCorners,cyan);for(let i=0;i<4;i++)addLine([trueCorners[i],flatCorners[i]],0xf8edd6,.75);
    addLabel(`dAₛ/dA = ${factor.toFixed(6)}`,V(x,height(x,z)+2,z),'#eafff5',.78);
    addLabel('A = 622.035 m²',V(72,projectionHeight+1,-29),'#ffe0ad',.82);
    announce('623.365 m² / 622.035 m²',`La celda cian sigue el relieve y la ámbar conserva la misma proyección (x,y). En el punto móvil, dAₛ/dA=√(1+fₓ²+fᵧ²)=${factor.toFixed(6)}. La integral completa añade 1.330 m² (+0.214 %); los planos están separados solo para hacer visible la comparación.`);
   }
   if(key==='solarPower'){dayFraction=t;applyDay();const state=solarState(t),center=ground(66,-18,1);arrow(center,V(...state.direction),18,0xffe2a4);arrow(center,V(...state.panelNormal),13,cyan);addLabel(`SOL · ${state.localHour.toFixed(1)} h`,center.clone().addScaledVector(V(...state.direction),20),'#ffe8b4');addLabel(`Pₑ = ${(state.electricPower/1000).toFixed(2)} kW`,center.clone().add(V(0,8,0)),'#a5ffc0');announce(`${(state.electricPower/1000).toFixed(2)} kW eléctricos`,`I₀=590 W/m² · A=${20*6} m² · η=24% · PR=0.86 · incidencia ${(state.incidence*100).toFixed(1)}%. Escenario de diseño en equinoccio a 18°N.`);}
   if(active.name==='Valor medio'){const average=12119.9617/622.03535,plane=mesh(sector(0),mat(amber,.5),0,0,0,overlay),pos=plane.geometry.attributes.position;for(let i=0;i<pos.count;i++)pos.setY(i,average);pos.needsUpdate=true;const a=-Math.PI/4+t*Math.PI/4,q=ground(66*Math.cos(a),66*Math.sin(a));orb(q,cyan);addLine([q,V(q.x,average,q.z)],red);announce(`f̄ = ${average.toFixed(5)} m`,`Plano ámbar: altura media. En el punto cian, f=${q.y.toFixed(3)} m; diferencia ${(q.y-average).toFixed(3)} m. El mismo volumen se obtiene con altura uniforme f̄ sobre R.`);}
   if(key==='doubleVolume'){
    // X-ray materials retain the true coordinates below f while letting the
    // audience see the closed integration solid through the opaque terrain.
    const xrayMaterial=(color:number,opacity:number)=>{const m=mat(color,opacity);m.depthTest=false;return m;};
    const base=sector(0,20,64),ys=base.attributes.position;
    for(let i=0;i<ys.count;i++)ys.setY(i,.05);
    ys.needsUpdate=true;base.computeVertexNormals();
    const bottom=mesh(base,xrayMaterial(amber,.14),0,0,0,overlay);
    bottom.renderOrder=7;
    const baseBoundary=[
     ...Array.from({length:65},(_,i)=>{const a=-Math.PI/4+i/64*Math.PI/4;return V(72*Math.cos(a),.1,72*Math.sin(a));}),
     ...Array.from({length:17},(_,i)=>V(72-12*i/16,.1,0)),
     ...Array.from({length:65},(_,i)=>{const a=-(i/64)*Math.PI/4;return V(60*Math.cos(a),.1,60*Math.sin(a));}),
     ...Array.from({length:17},(_,i)=>{const r=60+12*i/16;return V(r/Math.SQRT2,.1,-r/Math.SQRT2);})
    ];
    const baseOutline=mesh(new T.TubeGeometry(new T.CatmullRomCurve3(baseBoundary,true),180,.22,6,true),new T.MeshBasicMaterial({color:amber,depthTest:false,depthWrite:false}),0,0,0,overlay);
    baseOutline.renderOrder=9;
    const wall=(edge:T.Vector3[],opacity=.16,color=cyan)=>{
     const vertices:number[]=[],indices:number[]=[];
     for(const point of edge)vertices.push(point.x,.08,point.z,point.x,point.y,point.z);
     for(let i=0;i<edge.length-1;i++){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}
     const geometry=new T.BufferGeometry();
     geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
     geometry.setIndex(indices);geometry.computeVertexNormals();
     const surface=mesh(geometry,xrayMaterial(color,opacity),0,0,0,overlay);
     surface.renderOrder=8;
    };
    for(const radius of [60,72]){
     const edge=Array.from({length:65},(_,i)=>{const a=-Math.PI/4+i/64*Math.PI/4;return ground(radius*Math.cos(a),radius*Math.sin(a),.14);});
     wall(edge);
     for(let i=0;i<=8;i++){const point=edge[i*8],guide=addLine([V(point.x,.08,point.z),point],amber,.58);(guide.material as T.LineBasicMaterial).depthTest=false;guide.renderOrder=9;}
    }
    const radialCut=(angle:number,lift=.18)=>Array.from({length:49},(_,i)=>{const r=60+12*i/48;return ground(r*Math.cos(angle),r*Math.sin(angle),lift);});
    for(const angle of [-Math.PI/4,0])wall(radialCut(angle,.14));
    const endAngle=-Math.PI/4+t*Math.PI/4;
    if(t>.001){
     const surface=(top:boolean)=>{const vertices:number[]=[],faces:number[]=[],radialSteps=16,angleSteps=Math.max(2,Math.ceil(64*t));for(let j=0;j<=angleSteps;j++)for(let i=0;i<=radialSteps;i++){const angle=-Math.PI/4+(endAngle+Math.PI/4)*j/angleSteps,r=60+12*i/radialSteps,x=r*Math.cos(angle),z=r*Math.sin(angle);vertices.push(x,top?height(x,z)+.18:.1,z);}for(let j=0;j<angleSteps;j++)for(let i=0;i<radialSteps;i++){const a=j*(radialSteps+1)+i,b=a+radialSteps+1;faces.push(a,b,a+1,a+1,b,b+1);}const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(faces);geometry.computeVertexNormals();return geometry;};
     const grownTop=mesh(surface(true),xrayMaterial(cyan,.52),0,0,0,overlay);grownTop.renderOrder=10;
     const grownBase=mesh(surface(false),xrayMaterial(amber,.28),0,0,0,overlay);grownBase.renderOrder=9;
     for(const radius of [60,72])wall(Array.from({length:Math.max(3,Math.ceil(64*t))},(_,i)=>{const angle=-Math.PI/4+(endAngle+Math.PI/4)*i/(Math.max(3,Math.ceil(64*t))-1);return ground(radius*Math.cos(angle),radius*Math.sin(angle),.18);}),.34);
     const front=radialCut(endAngle);wall(front,.58,amber);const sweep=addLine(front,0xffcf82,.9);(sweep.material as T.LineBasicMaterial).depthTest=false;sweep.renderOrder=12;
     const sample=ground(66*Math.cos(endAngle),66*Math.sin(endAngle),.18),drop=addLine([V(sample.x,.1,sample.z),sample],amber,.95);(drop.material as T.LineBasicMaterial).depthTest=false;drop.renderOrder=12;
     const fValue=height(sample.x,sample.z),measure=new T.MeshBasicMaterial({color:amber,depthTest:false,depthWrite:false});
     rod(V(sample.x,0,sample.z),V(sample.x,fValue,sample.z),.12,measure,overlay).renderOrder=13;
    }
    const baseLabel=addLabel('BASE · z = 0',V(55,1,-40),'#ffe0ad',.85);baseLabel.material.depthTest=false;baseLabel.material.depthWrite=false;baseLabel.renderOrder=13;
    const roofLabel=addLabel('TECHO · z = f(x,y)',ground(68,-19,6),'#baffee',.85);roofLabel.material.depthTest=false;roofLabel.material.depthWrite=false;roofLabel.renderOrder=14;
    announce('12 119.962 m³ respecto de z=0',`Corte radial en θ=${(endAngle*180/Math.PI).toFixed(1)}°: de r=60 a r=72 m, con techo curvo z=f(r cosθ,r senθ) y base z=0. El corte ámbar y su altura avanzan con el mismo parámetro. El valor total procede de la integral evaluada; es volumen geométrico respecto al datum, no excavación.`);
    aimPhaseVCamera();
   }
  }
  if(['tank','density','mass','jacobian'].includes(key)){
   focusPoint.set(tx,ty+3,tz);tankShell.visible=false;
   const cut=mesh(new T.SphereGeometry(1,64,32,0,Math.PI*1.45,0,Math.PI/2),mat(0xb4ced0,.24),tx,ty,tz,overlay);cut.scale.set(18,8,14);
   const centerScene=active.name==='Centro y estabilidad',momentScene=active.name==='Momentos';
   const transformScene=active.name==='Transformación y límites',comparisonScene=active.name==='Cartesiano vs. elipsoidal';
   for(const [dir,len,name] of [[V(1,0,0),18,'u · 18 m'],[V(0,0,1),14,'v · 14 m'],[V(0,1,0),8,'w · 8 m']] as [T.Vector3,number,string][]){arrow(V(tx,ty,tz),dir,len,amber);if(!centerScene)addLabel(name,V(tx,ty,tz).addScaledVector(dir,len+2));}
   const slice=8*t,rx=18*Math.sqrt(Math.max(0,1-(slice/8)**2)),rz=14*Math.sqrt(Math.max(0,1-(slice/8)**2));
   const solidBounds=active.name==='Sólido y límites',volumeWalk=active.name==='Volumen paso a paso',massSymmetry=active.name==='Masa paso a paso';
   if(solidBounds){
    if(xrayMode&&mode==='aerial'){const campusLook=V((bx+tx)/2,Math.max(baseY,ty)+8,(bz+tz)/2),comparisonCamera=['jacobian','Transformación y límites','Cartesiano vs. elipsoidal'].includes(active.name),objectLook=comparisonCamera?V(tx-13.5,ty+7.5,tz+1):V(tx,ty+3,tz);targetLook=campusTankIntro?campusLook:objectLook;targetCamera=campusTankIntro?campusLook.clone().add(V(72,78,96)):objectLook.clone().add(comparisonCamera?V(45,52,55):V(40,48,52));}
    if(campusTankIntro){const from=V(bx,baseY+6,bz),to=V(tx,ty+5,tz),link=addLine([from,to],amber,.9);(link.material as T.LineBasicMaterial).depthTest=false;link.renderOrder=12;orb(to,amber,1.5);addLabel('CAMPUS · HÁBITAT',from.clone().add(V(0,11,0)),'#ffe0ad',.75);addLabel('DEPÓSITO · E',to.clone().add(V(0,12,0)),'#bafff7',.75);}
    const section=mesh(new T.CircleGeometry(1,64),new T.MeshBasicMaterial({color:cyan,transparent:true,opacity:.5,side:T.DoubleSide,depthTest:false,depthWrite:false}),tx,ty+slice+.08,tz,overlay);
    section.rotation.x=-Math.PI/2;section.scale.set(Math.max(.01,rx),Math.max(.01,rz),1);section.renderOrder=10;
    const boundary=addLine(Array.from({length:97},(_,i)=>{const angle=i/96*Math.PI*2;return V(tx+rx*Math.cos(angle),ty+slice+.17,tz+rz*Math.sin(angle));}),0xe8fff8);
    (boundary.material as T.LineBasicMaterial).depthTest=false;boundary.renderOrder=11;
    const heightLine=addLine([V(tx,ty+.1,tz),V(tx,ty+slice+.2,tz)],amber);
    (heightLine.material as T.LineBasicMaterial).depthTest=false;heightLine.renderOrder=11;
    addLabel(`CORTE w=${slice.toFixed(2)} m`,V(tx,ty+slice+4,tz),'#ddfff8',.63);
    announce(`w=${slice.toFixed(2)} m · sección ${(2*rx).toFixed(2)} × ${(2*rz).toFixed(2)} m`,`La elipse blanca es el corte horizontal del sólido E a altura w. Sus semiejes son 18√(1−w²/8²)=${rx.toFixed(3)} m y 14√(1−w²/8²)=${rz.toFixed(3)} m. Al subir de w=0 a w=8 m, la sección se cierra; todavía no se está sumando volumen.`);
   }else if(volumeWalk){
    const stage=Math.min(2,Math.floor(t*3)),stageProgress=Math.min(1,Math.max(0,3*t-stage));
    const rho=stage===0?Math.max(.008,stageProgress):1;
    const polar=stage===0?Math.PI/10:stage===1?Math.PI/10+(Math.PI/2-Math.PI/10)*stageProgress:Math.PI/2;
    const azimuth=stage===2?Math.PI/4+(2*Math.PI-Math.PI/4)*stageProgress:Math.PI/4;
    const point=(r:number,ph:number,th:number)=>V(tx+18*r*Math.sin(ph)*Math.cos(th),ty+8*r*Math.cos(ph),tz+14*r*Math.sin(ph)*Math.sin(th));
    const surface=(rows:number,cols:number,position:(a:number,b:number)=>T.Vector3,color:number,opacity:number)=>{
     const vertices:number[]=[],faces:number[]=[];
     for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){const p=position(j/rows,i/cols);vertices.push(p.x,p.y,p.z);}
     for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+cols+1;faces.push(a,b,a+1,a+1,b,b+1);}
     const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(faces);geometry.computeVertexNormals();
     const part=mesh(geometry,new T.MeshBasicMaterial({color,transparent:true,opacity,side:T.DoubleSide,depthTest:false,depthWrite:false}),0,0,0,overlay);part.renderOrder=9;
    };
    // The visible wedge follows exactly the integration order: radius, polar angle, then azimuth.
    surface(20,48,(a,b)=>point(rho,polar*a,azimuth*b),0x54e9de,.39);
    surface(8,20,(a,b)=>point(rho*a,polar*b,0),0xb999ef,.24);
    if(azimuth<2*Math.PI-.002)surface(8,20,(a,b)=>point(rho*a,polar*b,azimuth),0xb999ef,.32);
    surface(8,48,(a,b)=>point(rho*a,polar,azimuth*b),0xffd095,.3);
    const leadingRim=addLine(Array.from({length:81},(_,i)=>point(rho,polar,azimuth*i/80)),amber,.96);
    (leadingRim.material as T.LineBasicMaterial).depthTest=false;leadingRim.renderOrder=11;
    const leadingMeridian=addLine(Array.from({length:41},(_,i)=>point(rho,polar*i/40,azimuth)),cyan,.94);
    (leadingMeridian.material as T.LineBasicMaterial).depthTest=false;leadingMeridian.renderOrder=11;
    const marker=orb(point(rho,polar,azimuth),amber,.74);marker.material.depthTest=false;marker.renderOrder=12;
    const stageName=['ρ · llenar desde el centro','φ · abrir hacia la base','θ · girar hasta completar E'][stage];
    announce(t>=.995?'V = 1344π ≈ 4 222.301 m³':`Paso ${stage+1}/3 · ${stageName}`,`La cuña recorre 0≤ρ≤${rho.toFixed(2)}, 0≤φ≤${(polar*180/Math.PI).toFixed(0)}° y 0≤θ≤${(azimuth*180/Math.PI).toFixed(0)}°. El cambio de variables aporta dV=2016ρ²senφ dρ dφ dθ. Al evaluar los tres factores se obtiene 2016(1/3)(1)(2π)=1344π m³. La cuña ilustra los límites; su transparencia no representa densidad ni volumen medido.`);
   }else if(!centerScene&&!momentScene&&!massSymmetry&&!transformScene&&!comparisonScene){
    const layerCount=Math.max(1,Math.round(8*t));
    for(let k=0;k<layerCount;k++){
     const wk=layerCount===1?slice:(k/(layerCount-1))*slice,rux=18*Math.sqrt(Math.max(0,1-(wk/8)**2)),rvz=14*Math.sqrt(Math.max(0,1-(wk/8)**2));
     const layerDisk=mesh(new T.CircleGeometry(1,48),mat(k===layerCount-1?cyan:0x397b87,k===layerCount-1?.7:.2),tx,ty+wk,tz,overlay);
     layerDisk.rotation.x=-Math.PI/2;layerDisk.scale.set(Math.max(.01,rux),Math.max(.01,rvz),1);
    }
   }
   if(key==='density'||key==='mass'){
    if(key==='density'){
     const w=active.name==='Masa paso a paso'?Math.min(slice,6):slice,radius=Math.sqrt(Math.max(0,1-(w/8)**2));
     if(active.name==='Masa paso a paso'){
      const section=mesh(new T.CircleGeometry(1,64),new T.MeshBasicMaterial({color:cyan,transparent:true,opacity:.24,side:T.DoubleSide,depthTest:false,depthWrite:false}),tx,ty+w+.08,tz,overlay);
      section.rotation.x=-Math.PI/2;section.scale.set(Math.max(.01,18*radius),Math.max(.01,14*radius),1);section.renderOrder=9;
      const u=9*radius,left=V(tx-u,ty+w+.35,tz),right=V(tx+u,ty+w+.35,tz),mean=(densityAt(-u,w)+densityAt(u,w))/2;
      for(const [point,color] of [[left,cyan],[right,amber]] as [T.Vector3,number][]){const marker=orb(point,color,1.35);marker.material.depthTest=false;marker.material.depthWrite=false;marker.renderOrder=12;const stem=addLine([point.clone().add(V(0,-2,0)),point.clone().add(V(0,2.6,0))],color,.95);(stem.material as T.LineBasicMaterial).depthTest=false;stem.renderOrder=11;}
      const pair=addLine([left,right],0xe1d6bf,.78);(pair.material as T.LineBasicMaterial).depthTest=false;pair.renderOrder=10;for(const [tag,point,color] of [[`δ(−u) = ${densityAt(-u,w).toFixed(1)}`,left,'#a8f7f2'],[`δ(+u) = ${densityAt(u,w).toFixed(1)}`,right,'#ffe2b4']] as [string,T.Vector3,string][]){const title=addLabel(tag,point.clone().add(V(0,4,0)),color,.64);title.material.depthTest=false;title.renderOrder=13;}announce(`δ̄ par = ${mean.toFixed(1)} kg/m³`,`Dos elementos simétricos de igual volumen en un único corte w=${w.toFixed(2)} m: los términos en u se cancelan exactamente. El promedio cambia con w; al integrar todas las secciones resulta δ̄=899.3 kg/m³ y M=3 797 114.863 kg. Los dos marcadores no sustituyen la integral.`);
     }else{
      for(let k=0;k<48;k++){const a=k/48*Math.PI*2,u=18*radius*.82*Math.cos(a),v=14*radius*.82*Math.sin(a),rho=densityAt(u,w),col=new T.Color().setHSL(.5-(rho-853.658)/(956.8-853.658)*.42,.72,.55);orb(V(tx+u,ty+w,tz+v),col.getHex(),.52);}
      const minU=-18*radius,maxU=18*radius;
      addLabel(`${densityAt(minU,w).toFixed(1)} kg/m³`,V(tx+minU,ty+w+2,tz),'#9de9ff',.58);
      addLabel(`${densityAt(maxU,w).toFixed(1)} kg/m³`,V(tx+maxU,ty+w+2,tz),'#ffd18e',.58);
      announce(`δ = ${densityAt(0,w).toFixed(2)} kg/m³ en la sección w=${w.toFixed(2)} m`,'Los rótulos muestran los extremos de esta sección elíptica; los extremos de todo E son 853.658 y 956.8 kg/m³. La masa integra δ en todo el depósito.');
     }
    }else if(momentScene){
     const u=4+2*t,v=3+2*t,w=3,sample=V(tx+u,ty+w,tz+v),mirror=V(tx+u,ty+w,tz-v),projections=[
      {point:V(tx,ty+w,tz+v),color:cyan,title:'u · δ dV → plano u=0',labelOffset:V(-12,5,8)},
      {point:V(tx+u,ty+w,tz),color:0xb18cff,title:'v · δ dV → plano v=0',labelOffset:V(12,5,-8)},
      {point:V(tx+u,ty,tz+v),color:amber,title:'w · δ dV → plano w=0',labelOffset:V(0,10,0)}
     ];
     for(const {point,color,title,labelOffset} of projections){const arm=addLine([sample,point],color,.95);(arm.material as T.LineBasicMaterial).depthTest=false;arm.renderOrder=11;const end=orb(point,color,.65);end.material.depthTest=false;end.renderOrder=12;const labelPoint=point.clone().add(labelOffset),leader=addLine([point,labelPoint],color,.58);(leader.material as T.LineBasicMaterial).depthTest=false;leader.renderOrder=12;const tag=addLabel(title,labelPoint,`#${color.toString(16).padStart(6,'0')}`,.55);tag.material.depthTest=false;tag.renderOrder=13;}
     for(const [point,color] of [[sample,red],[mirror,0xb18cff]] as [T.Vector3,number][]){const mark=orb(point,color,1.05);mark.material.depthTest=false;mark.renderOrder=12;}
     const pair=addLine([sample,mirror],0xb18cff,.8);(pair.material as T.LineBasicMaterial).depthTest=false;pair.renderOrder=10;
     announce('Mᵧ𝓏=559 370.37 · Mₓ𝓏=0 · Mₓᵧ=11 280 635.87 kg·m','Las tres líneas muestran distancias a los planos coordenados de una muestra interior. La pareja violeta refleja v→−v: δ no cambia, así que los aportes al momento en v se cancelan en toda la región. Los valores proceden de integrar uδ, vδ y wδ, no de estas dos muestras.');
    }else if(centerScene){
     const center=V(tx+CM[0],ty+CM[2],tz+CM[1]),projection=V(center.x,ty+.16,center.z);
     const progress=(start:number,end:number)=>Math.max(0,Math.min(1,(t-start)/(end-start)));
     const samples=progress(0,.3),arms=progress(.28,.53),located=progress(.52,.74),projected=progress(.72,1);
     // These fixed samples illustrate density; the exact center still comes from the evaluated integrals.
     const sampleCount=Math.round(60*samples*(1-.8*projected));
     for(let i=0;i<sampleCount;i++){
      const w=.5+7.05*((i*17)%61)/61,radial=.12+.7*Math.sqrt(((i*29)%59)/59),angle=i*2.399963229728653;
      const radius=Math.sqrt(1-(w/8)**2),u=18*radius*radial*Math.cos(angle),v=14*radius*radial*Math.sin(angle);
      const density=densityAt(u,w),mix=Math.max(0,Math.min(1,(density-853.658)/(956.8-853.658)));
      const color=new T.Color(0x69c9bf).lerp(new T.Color(0xc97555),mix).getHex();
      const dot=orb(V(tx+u,ty+w,tz+v),color,.29);dot.material.depthTest=false;dot.renderOrder=11;
     }
     if(samples>.04&&t<.53)addLabel('δ(u,w) · M = ∭E δ dV',V(tx-3,ty+11,tz),'#dff1e8',.62);
     if(arms>.01&&t<.76){
      const sample=V(tx+5,ty+4.8,tz+3),origin=V(tx,ty+.2,tz);
      for(const [end,color] of [[V(sample.x,origin.y,sample.z),amber],[V(origin.x,sample.y,sample.z),cyan],[V(sample.x,sample.y,origin.z),0xb18cff]] as [T.Vector3,number][]){
       const arm=addLine([sample,sample.clone().lerp(end,arms)],color,.95);(arm.material as T.LineBasicMaterial).depthTest=false;arm.renderOrder=12;
      }
      const mark=orb(sample,0xf5e6cc,.48);mark.material.depthTest=false;mark.renderOrder=13;
      if(arms>.7)addLabel('Mᵧ𝓏 / M · Mₓ𝓏 / M · Mₓᵧ / M',sample.clone().add(V(5,5,2)),'#f5e6cc',.55);
     }
     if(located>.01){
      const uniform=V(tx,ty+3,tz),trueOffset=center.clone().sub(uniform),amplified=uniform.clone().addScaledVector(trueOffset,35*located);
      const ref=orb(uniform,0xb18cff,.78);ref.material.depthTest=false;ref.renderOrder=13;
      const cm=orb(center,red,.35+1.2*located);cm.material.depthTest=false;cm.material.depthWrite=false;cm.renderOrder=14;
      const displacement=addLine([uniform,amplified],0xb18cff,.9);(displacement.material as T.LineBasicMaterial).depthTest=false;displacement.renderOrder=11;
      if(located>.7&&t<.76){addLabel('UNIFORME · (0, 0, 3.000) m',uniform.clone().add(V(-9,10,1)),'#e4d2ff',.58);addLabel('DIFERENCIA ×35 VISUAL',amplified.clone().add(V(0,3,0)),'#e4d2ff',.51);}
      addLabel('CM · (0.147, 0, 2.971) m',center.clone().add(V(0,6,0)),'#ffc1b8',.72);
     }
     if(projected>.01){
      const base=mesh(new T.CircleGeometry(1,72),new T.MeshBasicMaterial({color:amber,transparent:true,opacity:.04+.1*projected,side:T.DoubleSide,depthTest:false,depthWrite:false}),tx,ty+.1,tz,overlay);
      base.rotation.x=-Math.PI/2;base.scale.set(18,14,1);base.renderOrder=8;
      const dropEnd=center.clone().lerp(projection,projected),drop=addLine([center,dropEnd],0xffffff);
      (drop.material as T.LineBasicMaterial).depthTest=false;drop.renderOrder=11;
      const dropVector=dropEnd.clone().sub(center),column=mesh(new T.CylinderGeometry(.12,.12,Math.max(.01,dropVector.length()),8),new T.MeshBasicMaterial({color:0xe6f4ed,transparent:true,opacity:.9,depthTest:false,depthWrite:false}),center.x+dropVector.x/2,center.y+dropVector.y/2,center.z+dropVector.z/2,overlay);
      column.quaternion.setFromUnitVectors(V(0,1,0),dropVector.clone().normalize());column.renderOrder=12;
      const endpoint=orb(dropEnd,cyan,.5+.45*projected);endpoint.material.depthTest=false;endpoint.material.depthWrite=false;endpoint.renderOrder=13;
      const count=Math.max(2,Math.round(projected*96)),outline=addLine(Array.from({length:count+1},(_,i)=>{const angle=i/96*Math.PI*2;return V(tx+18*Math.cos(angle),ty+.2,tz+14*Math.sin(angle));}),amber);
      (outline.material as T.LineBasicMaterial).depthTest=false;outline.renderOrder=10;
      if(projected>.55)addLabel(projected>.94?'PROYECCIÓN · w=0':'HACIA LA BASE · w=0',dropEnd.clone().add(V(8,1,-5)),'#d8f3ec',.56);
     }
     const support=(CM[0]/18)**2+(CM[1]/14)**2;
     const stage=t<.28?'1/4 · densidad y masa':t<.52?'2/4 · brazos y momentos':t<.72?'3/4 · centro calculado':'4/4 · proyección sobre la base';
     announce(stage,`Las muestras son esquemáticas; M y los momentos se obtienen integrando todo E. El centro fijo resulta de dividir cada momento entre M=3 797 114.863 kg. La proyección cumple (ū/18)²+(v̄/14)²=${support.toFixed(6)}<1. La línea y el contorno se revelan progresivamente; no se desplaza físicamente el centro.`);
    }else{
     for(let j=0;j<8;j++){const w=(j+.5),radius=Math.sqrt(1-(w/8)**2);for(let k=0;k<24;k++){const a=k/24*Math.PI*2,u=18*radius*.78*Math.cos(a),v=14*radius*.78*Math.sin(a),rho=densityAt(u,w),col=new T.Color().setHSL(.5-(rho-853.658)/(956.8-853.658)*.42,.65,.56);orb(V(tx+u,ty+w,tz+v),col.getHex(),.31);}}
     const center=V(tx+CM[0],ty+CM[2],tz),projection=V(center.x,ty+.18,center.z);
     orb(center,red,.68);orb(projection,red,.76);
     const drop=addLine([center,projection],red);(drop.material as T.LineBasicMaterial).depthTest=false;drop.renderOrder=10;
     addLabel('CENTRO DE MASA',center.clone().add(V(0,4,0)),'#ffb1a4',.58);
     addLabel('PROYECCIÓN DENTRO DEL APOYO',projection.clone().add(V(0,1.1,0)),'#ffb1a4',.54);
     announce('M = 3 797 114.863 kg','Las muestras coloreadas representan densidad integrada sobre todo el semielipsoide. El marcador rojo es el centro de masa y su proyección vertical cae dentro del apoyo.');
    }
   }else if(key==='jacobian'){
   const rho=.12+.88*t,phi=Math.PI/3,theta=Math.PI/4,s=Math.sin(phi),c=Math.cos(phi),reference=V(tx-27,ty+15,tz+2);
   const sphere=mesh(new T.SphereGeometry(1,32,20,0,Math.PI*2,0,Math.PI/2),mat(amber,.38),tx,ty,tz,overlay);sphere.scale.set(18*rho,8*rho,14*rho);
   for(const ph of [Math.PI/6,Math.PI/3,Math.PI/2]){const ringPts=Array.from({length:65},(_,i)=>{const th=i/64*Math.PI*2;return V(tx+18*rho*Math.sin(ph)*Math.cos(th),ty+8*rho*Math.cos(ph),tz+14*rho*Math.sin(ph)*Math.sin(th));});addLine(ringPts,cyan,.68);}
   const displayScale=9;
   for(const direction of [V(1,0,0),V(0,1,0),V(0,0,1)])arrow(reference,direction,displayScale,0xb18cff,.75);
   const unitShell=mesh(new T.SphereGeometry(1,32,16,0,Math.PI*2,0,Math.PI/2),new T.MeshBasicMaterial({color:0xb18cff,transparent:true,opacity:.18,side:T.DoubleSide,depthTest:false,depthWrite:false}),reference.x,reference.y,reference.z,overlay);unitShell.scale.setScalar(displayScale);unitShell.renderOrder=8;
   const unitSweep=mesh(new T.SphereGeometry(1,32,16,0,Math.PI*2,0,Math.PI/2),new T.MeshBasicMaterial({color:0xc9aaff,transparent:true,opacity:.52,side:T.DoubleSide,depthTest:false,depthWrite:false}),reference.x,reference.y,reference.z,overlay);unitSweep.scale.setScalar(displayScale*rho);unitSweep.renderOrder=9;
   const point=V(tx+18*rho*s*Math.cos(theta),ty+8*rho*c,tz+14*rho*s*Math.sin(theta)),unitPoint=reference.clone().add(V(displayScale*rho*s*Math.cos(theta),displayScale*rho*c,displayScale*rho*s*Math.sin(theta)));
   const connection=addLine([unitPoint,point],0xe3c7ff,.9);(connection.material as T.LineBasicMaterial).depthTest=false;connection.renderOrder=11;
   for(const [position,color,size] of [[unitPoint,0xe7c9ff,.52],[point,0xffe2a4,.88]] as [T.Vector3,number,number][]){const marker=orb(position,color,size);marker.material.depthTest=false;marker.material.depthWrite=false;marker.renderOrder=13;}
   const showCell=(origin:T.Vector3,radial:T.Vector3,polar:T.Vector3,azimuth:T.Vector3,opacity:number)=>{
    const corners=Array.from({length:8},(_,i)=>origin.clone().addScaledVector(radial,i&1?1:0).addScaledVector(polar,i&2?1:0).addScaledVector(azimuth,i&4?1:0));
    for(const [quad,color] of [[[0,2,6,4],amber],[[1,3,7,5],amber],[[0,1,5,4],cyan],[[2,3,7,6],cyan],[[0,1,3,2],0xcba8ff],[[4,5,7,6],0xcba8ff]] as [number[],number][]){
     const geometry=new T.BufferGeometry(),positions=quad.flatMap(i=>corners[i].toArray());geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex([0,1,2,0,2,3]);geometry.computeVertexNormals();
     const face=mesh(geometry,new T.MeshBasicMaterial({color,transparent:true,opacity,side:T.DoubleSide,depthTest:false,depthWrite:false}),0,0,0,overlay);face.renderOrder=11;
    }
    for(let i=0;i<8;i++)for(const [bit,color] of [[1,amber],[2,cyan],[4,0xcba8ff]] as [number,number][])if(!(i&bit)){const edge=addLine([corners[i],corners[i|bit]],color);(edge.material as T.LineBasicMaterial).depthTest=false;edge.renderOrder=12;}
   };
   showCell(unitPoint,V(displayScale*s*Math.cos(theta),displayScale*c,displayScale*s*Math.sin(theta)).multiplyScalar(.18),V(displayScale*rho*c*Math.cos(theta),-displayScale*rho*s,displayScale*rho*c*Math.sin(theta)).multiplyScalar(.27),V(-displayScale*rho*s*Math.sin(theta),0,displayScale*rho*s*Math.cos(theta)).multiplyScalar(.27),.13);
   showCell(point,V(18*s*Math.cos(theta),8*c,14*s*Math.sin(theta)).multiplyScalar(.18),V(18*rho*c*Math.cos(theta),-8*rho*s,14*rho*c*Math.sin(theta)).multiplyScalar(.27),V(-18*rho*s*Math.sin(theta),0,14*rho*s*Math.cos(theta)).multiplyScalar(.27),.24);
   addLabel('SEMIESFERA · ×9 VISUAL',reference.clone().add(V(0,-7,0)),'#e4d2ff',1);
   addLabel(`ρ=${rho.toFixed(2)} · φ=60° · θ=45°`,point.clone().add(V(0,9,0)),'#ffe8ba',1);
   const localJacobian=2016*rho*rho*s;
   announce(`ρ=${rho.toFixed(2)} · |J|(φ=60°)=${localJacobian.toFixed(1)} m³`,`Los dos puntos comparten (ρ,φ,θ); la semiesfera violeta se dibuja ×9 solo para verla y ese aumento no entra al cálculo. La transformación real es u=18ρsenφcosθ, v=14ρsenφsenθ, w=8ρcosφ; el determinante es 18·14·8·ρ²senφ=2016ρ²senφ. Las aristas coloreadas muestran una celda diferencial local, no una medida de volumen finita.`);
   }else if(transformScene){
    const reference=V(tx-32,ty-1,tz+2),displayScale=9,unit=mesh(new T.SphereGeometry(1,40,24,0,Math.PI*2,0,Math.PI/2),new T.MeshBasicMaterial({color:0xb18cff,transparent:true,opacity:.25,side:T.DoubleSide,depthTest:false,depthWrite:false}),reference.x,reference.y,reference.z,overlay);
    unit.scale.setScalar(displayScale);unit.renderOrder=8;
    const factors=[1+17*t,1+13*t,1+7*t],mapped=mesh(new T.SphereGeometry(1,40,24,0,Math.PI*2,0,Math.PI/2),new T.MeshBasicMaterial({color:0x70e9e3,transparent:true,opacity:.32,side:T.DoubleSide,depthTest:false,depthWrite:false}),tx,ty,tz,overlay);
    mapped.scale.set(factors[0],factors[2],factors[1]);mapped.renderOrder=9;
    const phi=Math.PI/3,theta=Math.PI/4,rho=.82,unitPoint=reference.clone().add(V(displayScale*rho*Math.sin(phi)*Math.cos(theta),displayScale*rho*Math.cos(phi),displayScale*rho*Math.sin(phi)*Math.sin(theta))),mappedPoint=V(tx+factors[0]*rho*Math.sin(phi)*Math.cos(theta),ty+factors[2]*rho*Math.cos(phi),tz+factors[1]*rho*Math.sin(phi)*Math.sin(theta));
    for(const [point,color] of [[unitPoint,0xc9aaff],[mappedPoint,0xffcf82]] as [T.Vector3,number][]){const marker=orb(point,color,.8);marker.material.depthTest=false;marker.renderOrder=12;}
    const connector=addLine([unitPoint,mappedPoint],0xe5d0ff,.85);(connector.material as T.LineBasicMaterial).depthTest=false;connector.renderOrder=11;
    addLabel('SEMIESFERA UNITARIA · ×9 VISUAL',reference.clone().add(V(0,-6,0)),'#e4d2ff',.72);
    addLabel(`ESCALAS · ${factors.map(value=>value.toFixed(1)).join(' : ')}`,V(tx,ty+17,tz),'#bafff7',.65);
    announce(`Estiramiento u:v:w = ${factors.map(value=>value.toFixed(1)).join(':')}`,`La animación interpola desde la identidad hasta las escalas físicas (18,14,8). Solo al final representa la transformación exacta u=18ρsenφcosθ, v=14ρsenφsenθ, w=8ρcosφ. La semiesfera de la izquierda está ampliada ×9 solo para verla; ese factor no entra en el jacobiano.`);
   }else if(comparisonScene){
    const reference=V(tx-32,ty-1,tz+2),displayScale=9,zeta=t,w=8*zeta,radius=Math.sqrt(Math.max(0,1-zeta*zeta)),unit=mesh(new T.SphereGeometry(1,40,24,0,Math.PI*2,0,Math.PI/2),new T.MeshBasicMaterial({color:0xb18cff,transparent:true,opacity:.21,side:T.DoubleSide,depthTest:false,depthWrite:false}),reference.x,reference.y,reference.z,overlay);
    unit.scale.setScalar(displayScale);unit.renderOrder=8;
    const ellipse=mesh(new T.CircleGeometry(1,64),new T.MeshBasicMaterial({color:cyan,transparent:true,opacity:.54,side:T.DoubleSide,depthTest:false,depthWrite:false}),tx,ty+w+.12,tz,overlay);ellipse.rotation.x=-Math.PI/2;ellipse.scale.set(Math.max(.01,18*radius),Math.max(.01,14*radius),1);ellipse.renderOrder=10;
    const circle=mesh(new T.CircleGeometry(1,64),new T.MeshBasicMaterial({color:0xc9aaff,transparent:true,opacity:.56,side:T.DoubleSide,depthTest:false,depthWrite:false}),reference.x,reference.y+displayScale*zeta,reference.z,overlay);circle.rotation.x=-Math.PI/2;circle.scale.setScalar(Math.max(.01,displayScale*radius));circle.renderOrder=10;
    for(const [origin,rx,rz,color] of [[V(tx,ty+w+.2,tz),18*radius,14*radius,cyan],[V(reference.x,reference.y+displayScale*zeta+.1,reference.z),displayScale*radius,displayScale*radius,0xc9aaff]] as [T.Vector3,number,number,number][]){const rim=addLine(Array.from({length:65},(_,i)=>{const angle=i/64*Math.PI*2;return origin.clone().add(V(rx*Math.cos(angle),0,rz*Math.sin(angle)));}),color,.9);(rim.material as T.LineBasicMaterial).depthTest=false;rim.renderOrder=11;}
    addLabel(`CARTESIANO · w=${w.toFixed(2)} m`,V(tx,ty+16,tz),'#bafff7',.68);
    addLabel(`TRANSFORMADO · ζ=${zeta.toFixed(2)}`,reference.clone().add(V(0,-6,0)),'#e4d2ff',.7);
    announce(`Mismo corte: w=${w.toFixed(2)} m ↔ ζ=${zeta.toFixed(2)}`,`La elipse del depósito tiene semiejes ${ (18*radius).toFixed(2)} y ${(14*radius).toFixed(2)} m. El círculo violeta corresponde al mismo nivel ζ=w/8 en la semiesfera unitaria, mostrada ×9 solo por legibilidad. La región cartesiana exige límites anidados con raíces; (ρ,φ,θ) usa 0≤ρ≤1, 0≤φ≤π/2, 0≤θ≤2π. No son dos depósitos.`);
   }else if(!solidBounds&&!volumeWalk){
    const filled=Math.PI*18*14*(slice-slice**3/(3*64));
    addLabel(`V(w) = ${filled.toFixed(0)} m³`,V(tx-12,ty+8,tz),'#a5ffea',.58);
    announce(`${filled.toFixed(1)} m³ acumulados · V = 1344π ≈ 4 222.301 m³`,`Sección elíptica: πab(1−w²/c²). Al llegar a 8 m se acumulan 1344π = 4 222.301 m³ con semiejes ${rx.toFixed(2)}×${rz.toFixed(2)} m.`);
   }
  }
  if(key==='dustResilience'){
    const dustStateNow=dustState(t),tau=dustStateNow.tau,trans=dustStateNow.transmission,power=dustStateNow.power,panel=ground(62,-18,1),meterPos=ground(45,-40,4),load=ground(bx,bz,4),coverage=Math.max(0,Math.min(1,power/12));focusPoint.copy(ground(54,-32,4));(scene.fog as T.FogExp2).density=.0015+.0022*t;sun.intensity*=.18+.82*trans;
   const positions:number[]=[];for(let i=0;i<520;i++){const a=seeded(i+19)*Math.PI*2,r=15+seeded(i+91)*105;positions.push(panel.x+r*Math.cos(a),panel.y+2+seeded(i+37)*42,panel.z+r*Math.sin(a));}const dust=new T.Points(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(positions,3)),new T.PointsMaterial({color:0xd48c63,size:.45+t*.8,transparent:true,opacity:.12+.48*t,depthWrite:false}));overlay.add(dust);
   const sunlight=V(...solarState(.45).direction).multiplyScalar(34);for(let i=-2;i<=2;i++){const end=panel.clone().add(V(i*4,0,i*.7)),start=end.clone().add(sunlight);addLine([start,end],power<12?red:0xffe0a0,.2+.8*trans);orb(start.clone().lerp(end,(t+i*.13+1)%1),0xffe0a0,.22);}
   const meter=box(meterPos.x,meterPos.y,meterPos.z,9,8,5,mat(0x172d2d,.82),overlay),fill=box(meterPos.x,meterPos.y-3.5+3.6*coverage,meterPos.z,7.7,7.2*coverage,3.8,mat(power<12?red:0x79d99c,.82),overlay);meter.rotation.y=fill.rotation.y=.15;
   addLine([panel,meterPos,load],power<12?red:0x84f0a3,.9);const phase=(t*1.7)%1,packet=phase<.5?panel.clone().lerp(meterPos,phase*2):meterPos.clone().lerp(load,(phase-.5)*2);orb(packet,power<12?red:0x84f0a3,.38);
   const critical=box(load.x,load.y,load.z,8,8,8,mat(power<12?red:0x84f0a3,.18),overlay);critical.rotation.y=.35;addLabel(`IRRADIANCIA · ${(trans*100).toFixed(1)}%`,panel.clone().add(V(0,7,0)),'#ffe7b5',.48);addLabel(`POTENCIA / 12 kW · ${(coverage*100).toFixed(0)}%`,meterPos.clone().add(V(0,7,0)),power<12?'#ffaaa4':'#baffcb',.5);addLabel('CARGA CRÍTICA · 12 kW',load.clone().add(V(0,8,0)),'#dff7f2',.48);announce(`${power.toFixed(2)} kW disponibles`,`τ=${tau.toFixed(2)} · transmisión ${(trans*100).toFixed(1)}% · ${power<12?'déficit de potencia frente a la carga crítica de 12 kW':'la generación cubre la carga crítica de 12 kW'}. El indicador compara potencia instantánea; no representa el estado de carga de una batería.`);
  }
  if(key==='iceSurvey'){
   const w=.25+.4*t,scores=iceScores(w),best=Math.max(...scores),selected=scores.indexOf(best);focusPoint.copy(ground(-50,42));
    ICE_SITES.forEach(({x,y:z,H:h,name},index)=>{const y=landscape(x,z),radius=7+h*7,color=index===selected?0x84f0a3:cyan,depth=5+8*h;const ice=mesh(new T.CylinderGeometry(radius*.72,radius,2.2,48),mat(0x62d8ff,index===selected?.42:.26),x,y-depth,z,overlay);ice.material.depthTest=false;ice.renderOrder=8;const drillMaterial=mat(color,.85);drillMaterial.depthTest=false;rod(V(x,y+.2,z),V(x,y-depth-1,z),.22,drillMaterial,overlay).renderOrder=9;rod(V(x,y,z),V(x,y+8,z),.13,mat(color,.9),overlay);const bar=box(x+3,y+scores[index]*5,z,1.6,scores[index]*10,1.6,mat(color,.78),overlay);bar.rotation.y=.2;orb(V(x,y+.5,z),color,.85);const siteLabel=addLabel(`${name} · S=${scores[index].toFixed(3)}${index===selected?' · ELEGIDO':''}`,V(x,y+18,z),index===selected?'#baffcb':'#a8efff',1.08);siteLabel.material.depthTest=false;siteLabel.material.depthWrite=false;siteLabel.renderOrder=12;bar.material.depthTest=false;bar.renderOrder=10;if(index===selected)addLine([ground(x,z,.3),ground(64.3988,-32.1994,.3)],0x84f0a3,.8);});
   ring(110,amber);announce(`C${selected+1} · índice ${best.toFixed(3)}`,`Peso H=${w.toFixed(2)}. Los cilindros azules representan volumen subsuperficial hipotético; la barra compara S y la línea verde conecta el sitio elegido con EVA03.`);
  }
  if(key==='resourceLoop'){
    const nodes=[ground(50,-65,3),ground(bx,bz,4),ground(55,-82,3)],names=['ISRU · ESQUEMA','HÁBITAT · 3 PERSONAS','RESERVA O₂ · ESQUEMA'],colors=[cyan,0x84f0a3,amber],oxygen=oxygenState(t),prod=oxygen.production,net=oxygen.net,initialStock=oxygen.initial,capacity=oxygen.capacity,stock=oxygen.stock,reserve=stock/capacity;focusPoint.copy(ground(35,-60));
   for(let i=0;i<nodes.length;i++){const node=nodes[i],tank=mesh(new T.CylinderGeometry(3.2,3.8,7.5,24),mat(colors[i],.32),node.x,node.y,node.z,overlay);tank.rotation.y=i*.35;orb(node,colors[i],.9);const caption=node.clone().add(V(0,8,0));addLabel(names[i],caption,`#${colors[i].toString(16).padStart(6,'0')}`,.72);}
   const flows:[number,number,number,number][]=[[0,1,Math.min(prod,oxygen.consumption),cyan]];
   if(net>0)flows.push([0,2,net,0x84f0a3]);else if(net<0)flows.push([2,1,-net,red]);
   flows.forEach(([from,to,rate,color],i)=>{const start=nodes[from],end=nodes[to];addLine([start,end],color,.9);arrow(start.clone().lerp(end,.45),end.clone().sub(start),7,color,.9);orb(start.clone().lerp(end,(t+i*.23)%1),color,.5);if(i===1)addLabel(`${net>0?'A RESERVA':'DESDE RESERVA'} · ${rate.toFixed(2)} kg/sol`,start.clone().lerp(end,.5).add(V(0,4,0)),net>0?'#baffcb':'#ffaaa4',.54);});
    const reservePos=nodes[2],fillHeight=6.5*reserve;mesh(new T.CylinderGeometry(1.3,1.3,fillHeight,24),mat(stock>=initialStock?0x84f0a3:red,.82),reservePos.x,reservePos.y-2.5+fillHeight/2,reservePos.z,overlay);addLabel(`O₂ · ${prod.toFixed(2)}−2.52=${net>=0?'+':''}${net.toFixed(2)} kg/sol`,nodes[1].clone().add(V(0,14,0)),net>=0?'#baffcb':'#ffaaa4',.5);
   for(let i=-1;i<=1;i++){const person=nodes[1].clone().add(V(i*2.2,0,4));mesh(new T.CylinderGeometry(.28,.38,1.5,12),mat(0xe6dfd2,.8),person.x,person.y,person.z,overlay);orb(person.clone().add(V(0,1.05,0)),0xe6dfd2,.35);}
    announce(`${net===0?'Equilibrio':net>0?'Superávit':'Déficit'} ${Math.abs(net).toFixed(2)} kg O₂/sol`,`Balance tras un sol: 9 kg iniciales + (${prod.toFixed(2)}−2.52) = ${stock.toFixed(2)} kg en una capacidad didáctica de 18 kg. Los símbolos de producción y reserva son un esquema de O₂ independiente del depósito de agua; no cuantifican la biología.`);
  }
  if(key==='radiationShield'){
   const center=ground(bx,bz,4),shield=shieldState(t),x=shield.thickness,trans=shield.transmission;focusPoint.copy(center);for(let i=1;i<=5;i++){const shell=mesh(new T.SphereGeometry(1,48,24,0,Math.PI*2,0,Math.PI/2),mat(i/5<=t?0x75d7c4:0xb88868,i/5<=t?.16:.035),center.x,center.y-4,center.z,overlay);shell.scale.set(8+i*1.8,5+i*.9,8+i*1.8);shell.material.depthWrite=false;}
   for(let i=-3;i<=3;i++){const start=center.clone().add(V(-34,5+i*2.2,i*1.6)),impact=center.clone().add(V(-11,3+i*.8,i*1.2)),inside=center.clone().add(V(-4,2+i*.45,i*.55));addLine([start,impact],red,.72);addLine([impact,inside],trans<.2?0x84f0a3:amber,.12+.72*trans);arrow(start,V(1,-.08,0),7,red,.8);}
   const outside=box(center.x-22,center.y+5,center.z-13,2,10,2,mat(red,.8),overlay),insideHeight=Math.max(.4,10*trans),inside=box(center.x+4,center.y+insideHeight/2,center.z-13,2,insideHeight,2,mat(trans<.25?0x84f0a3:amber,.8),overlay);outside.rotation.y=inside.rotation.y=.15;addLabel('EXTERIOR · D₀=100%',center.clone().add(V(-22,12,-13)),'#ffaaa4',.46);addLabel(`INTERIOR · ${(trans*100).toFixed(1)}% D₀`,center.clone().add(V(4,12,-13)),trans<.25?'#baffcb':'#ffe0ad',.46);addLabel(`BLINDAJE x=${x.toFixed(2)} m`,center.clone().add(V(0,14,0)),'#baffea',.54);announce(`Reducción relativa ${((1-trans)*100).toFixed(1)}%`,`Los rayos rojos llegan a la envolvente; los segmentos interiores pierden intensidad según D/D₀=e^(−0.42x). La comparación es relativa, no una dosis clínica.`);
  }
  if(key==='roverEnergy'){
    const energyState=roverEnergyState(t),mass=energyState.mass;for(let i=0;i<routePoints.length-1;i++){const u=i/(routePoints.length-1),tt=START+u*Math.PI,v=velocityAt(tt),grade=Math.abs(v[1])/Math.hypot(...v),demand=Math.min(1,grade/.014),color=new T.Color().lerpColors(new T.Color(0x84f0a3),new T.Color(red),demand).getHex();addLine([routePoints[i],routePoints[i+1]],color,.92);if(i%32===0){const p=routePoints[i],h=1+7*demand;box(p.x,p.y+h/2,p.z,.6,h,.6,mat(color,.72),overlay);}}
    const tt=START+autoRoute*Math.PI,q=V(...routeAt(tt)),v=V(...velocityAt(tt)),g=grad(q.x,q.z),direction=v.clone().normalize(),up=V(-g[0],1,-g[1]).normalize(),safe=safeRoverSpeed(tt);focusPoint.copy(q);rover.position.copy(q);rover.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(up.clone().cross(direction).normalize(),up,direction));const energy=energyState.energy,currentGrade=Math.abs(v.y)/v.length();arrow(q.clone().add(V(0,1,0)),direction,13,cyan);const zone=mesh(new T.RingGeometry(3.2,4.1,40),mat(currentGrade>.009?red:0x84f0a3,.55),q.x,q.y+.12,q.z,overlay);zone.rotation.x=-Math.PI/2;addLabel(`E≈${energy.toFixed(3)} kWh · masa ${mass.toFixed(0)} kg`,q.clone().add(V(0,7,0)),'#ffe0ad',.7);addLabel(`|dz/ds| ${(currentGrade*100).toFixed(2)}% · vₘₐₓ ${safe.speed.toFixed(2)} m/s`,q.clone().add(V(0,5,0)),currentGrade>.009?'#ffaaa4':'#baffcb',.62);announce(`${energy.toFixed(3)} kWh estimados`,`La masa seleccionada permanece fija durante el recorrido. Las barras colorean |dz/ds|, pendiente respecto de la longitud 3D recorrida; no se suma a E_est. E_est usa rodadura y un margen supuesto de 0.19 Wh/kg. El anillo indica el tramo actual y vₘₐₓ=${safe.speed.toFixed(2)} m/s por curvatura.`);
  }
  if(key==='runoff'){focusPoint.copy(ground(5,18));for(const [sx,sz] of [[-15,-5],[12,42],[45,15],[-38,58],[82,8]] as [number,number][]){const path=descentPath(sx,sz);if(path.length<2)continue;const pts=path.map(q=>V(q.x,q.y+.18,q.z));addLine(pts,0x66d9ff,.9);const last=pts[pts.length-1];orb(pts[0],amber,.35);orb(last,cyan,.38);const delta=pts[0].y-last.y;addLabel(`Δz = ${delta.toFixed(2)} m`,last.clone().add(V(0,2.8,0)),'#a8efff',.34);}announce('5 líneas de máximo descenso','Cada cauce se integra con −∇f y reduce la cota paso a paso. Es una trayectoria topográfica; no calcula agua ni caudal.');}
  if(key==='all'){
   addLine(routePoints,0xe7bb87,.68);
   const region=mesh(sector(.3,16,48),mat(0x78c9bb,.15),0,0,0,overlay);region.renderOrder=4;
   for(const r of [60,72])addLine(Array.from({length:65},(_,i)=>{const a=-Math.PI/4+i/64*Math.PI/4;return ground(r*Math.cos(a),r*Math.sin(a),.55);}),0x9ee2ce,.85);
   for(const a of [-Math.PI/4,0])addLine(Array.from({length:25},(_,i)=>{const r=60+i/24*12;return ground(r*Math.cos(a),r*Math.sin(a),.55);}),0x9ee2ce,.8);
   addLabel('R · INTEGRAL DOBLE',ground(66*Math.cos(-Math.PI/8),66*Math.sin(-Math.PI/8),5),'#b8f2df',.72);
   ring(72,0xd7ae7c);
   addLabel('D · RADIO 110 m',ground(110*Math.cos(2.5),110*Math.sin(2.5),5),'#f3d29e',.68);
   const bx0=EVA_BASE.x,bz0=EVA_BASE.y,bPoint=ground(bx0,bz0,.55),bHalo=mesh(new T.RingGeometry(2.5,5.8,48),new T.MeshBasicMaterial({color:0x9be6ad,transparent:true,opacity:.8,side:T.DoubleSide,depthTest:false,depthWrite:false}),bx0,height(bx0,bz0)+.35,bz0,overlay);bHalo.rotation.x=-Math.PI/2;bHalo.renderOrder=10;orb(bPoint,0x9be6ad,.78);addLine([ground(bx0,bz0),ground(bx0,bz0,5)],0x9be6ad,.9);addLabel('B+ · 3.788% · LAGRANGE',ground(bx0,bz0,8),'#c8f5ce',.78);
   for(const [x,z,name,color] of [[40,-20,'P',0xf0c48f],[-50,35,'Q',0x9ddedb]] as [number,number,string,number][]){const g=grad(x,z),norm=Math.hypot(...g),origin=ground(x,z,.35);orb(origin,color===0xf0c48f?0xe9bd8f:0x8fd8d2,.55);arrow(origin,V(g[0]/norm,norm,g[1]/norm),15,color,.88);addLabel(`${name} · |∇f| ${(norm*100).toFixed(2)}%`,origin.clone().add(V(0,7,0)),name==='P'?'#f3d9bd':'#b8eeea',.62);}
   const start=V(...routeAt(START)),control=V(...routeAt(Math.PI/2)),finish=V(...routeAt(START+Math.PI));for(const [point,title] of [[start,'INICIO B+'],[control,'CONTROL'],[finish,'FINAL']] as [T.Vector3,string][]){const marker=orb(point.clone().add(V(0,.5,0)),0xf0d09b,.5);marker.material.depthTest=false;addLabel(title,point.clone().add(V(0,4,0)),'#f3d9bd',.52);}
   const barStart=ground(-78,-62,.7),barEnd=ground(-28,-62,.7);addLine([barStart,barEnd],0xf1dfbd,.95);for(const point of [barStart,barEnd]){const tick=addLine([point.clone().add(V(0,-.1,0)),point.clone().add(V(0,1.7,0))],0xf1dfbd,.95);(tick.material as T.LineBasicMaterial).depthTest=false;}addLabel('50 m · ESCALA 1:1',barStart.clone().lerp(barEnd,.5).add(V(0,3.2,0)),'#f3e8d3',.62);
   const depot=V(MARS.tankX,tankFloor+12,MARS.tankY);addLabel('E · DEPÓSITO · 4 222 m³',depot,'#f3d9bd',.68);
   focusPoint.set(0,height(0,0),0);
   announce('Plano integrado · terreno, base, ruta, R y depósito','La vista reúne D y seis cotas, B+ seleccionado por Lagrange, la trayectoria espacial del rover, la región solar R de la integral doble, gradientes en P y Q y el depósito semielipsoidal E. Coordenadas métricas: 1 unidad = 1 m.');
  }
  if(xrayMode){const cutPlane=new T.Plane(V(-1,0,0),tx);xrayGroup.visible=!tankFocus;tankShell.visible=true;tankShell.traverse(o=>{if(o instanceof T.Mesh){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.clippingPlanes=[cutPlane]);}});terrainMaterial.clippingPlanes=[];if(!tankFocus)addLabel('CORTE DEL DEPÓSITO · capacidad interior',V(tx,ty+11,tz),'#ffd2ad');}
 }
 const keyDown=(e:KeyboardEvent)=>{if((e.target as HTMLElement).matches('input,textarea,select'))return;if(e.key.toLowerCase()==='g'&&!e.repeat){if(!logisticsPreview)gateTarget=1-gateTarget;return;}if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase())){keys.add(e.key.toLowerCase());if(mode==='walk')e.preventDefault();}};
 const keyUp=(e:KeyboardEvent)=>keys.delete(e.key.toLowerCase());const blur=()=>keys.clear();window.addEventListener('keydown',keyDown);window.addEventListener('keyup',keyUp);window.addEventListener('blur',blur);
 let dragging=false,lastX=0,lastY=0,yaw=0,pitch=0;const down=(e:PointerEvent)=>{if(mode!=='walk')return;dragging=true;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);};const move=(e:PointerEvent)=>{if(!dragging)return;yaw-=(e.clientX-lastX)*.004;pitch=Math.max(-1.15,Math.min(1.15,pitch-(e.clientY-lastY)*.003));lastX=e.clientX;lastY=e.clientY;};const up=()=>{dragging=false;};renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);
 const resize=()=>{camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight);composer.setSize(host.clientWidth,host.clientHeight);applyDay();};const ro=new ResizeObserver(resize);ro.observe(host);resize();
 const emitDust=(position:T.Vector3)=>{trailPositions[trailIndex*3]=position.x+(seeded(trailIndex+performance.now())-.5)*1.3;trailPositions[trailIndex*3+1]=position.y+.15;trailPositions[trailIndex*3+2]=position.z+(seeded(trailIndex+74)-.5)*1.3;trailIndex=(trailIndex+1)%96;trailGeometry.attributes.position.needsUpdate=true;};
 let annotationItems:SceneAnnotation[]=[];
 const annotationVector=new T.Vector3();
 const placeAnnotations=()=>{
  const width=host.clientWidth,height=host.clientHeight;
  const placed:{x:number;y:number;width:number;height:number}[]=[];
  let leftDockY=110,rightDockY=185;
  const cinematic=!!host.closest('.cinematic-mode');
  for(const {element,anchor} of annotationItems){
   annotationVector.set(...anchor).project(camera);
   const visible=annotationVector.z>=-1&&annotationVector.z<=1&&Math.abs(annotationVector.x)<1.1&&Math.abs(annotationVector.y)<1.1;
   element.style.visibility=visible?'visible':'hidden';
   if(!visible)continue;
   const pinX=(annotationVector.x+1)*width/2,pinY=(1-annotationVector.y)*height/2;
   const right=pinX>width*.64,leftDock=element.dataset.calloutDock==='left-column',rightDock=element.dataset.calloutDock==='right-column'&&cinematic,docked=leftDock||rightDock;
   const cardWidth=element.offsetWidth||210,cardHeight=element.offsetHeight||88;
   const x=rightDock?width-cardWidth-12:leftDock?12:Math.max(12,Math.min(width-cardWidth-12,pinX+(element.dataset.calloutId==='linear-normal'?100:right?-cardWidth-20:20)));
   const maxY=Math.max(110,height-cardHeight-72);
   let y=rightDock?Math.min(maxY,rightDockY):leftDock?Math.min(maxY,leftDockY):Math.max(110,Math.min(maxY,pinY-(element.dataset.calloutId?.startsWith('linear-')||element.dataset.calloutId==='directional-probe'?cardHeight+45:cardHeight/2)));
   for(const previous of placed){
    if(x<previous.x+previous.width+8&&x+cardWidth+8>previous.x&&y<previous.y+previous.height+8&&y+cardHeight+8>previous.y){
     const below=previous.y+previous.height+10,above=previous.y-cardHeight-10;
     y=below<=maxY?below:Math.max(110,above);
    }
   }
   placed.push({x,y,width:cardWidth,height:cardHeight});
   if(leftDock)leftDockY=y+cardHeight+12;
   if(rightDock)rightDockY=y+cardHeight+12;
   element.style.left=`${x}px`;element.style.top=`${y}px`;
   element.style.setProperty('--pin-x',`${pinX-x}px`);element.style.setProperty('--pin-y',`${pinY-y}px`);
   const connector=element.querySelector('.scene-connector');
   const line=connector?.querySelector('line'),dot=connector?.querySelector('circle');
   if(line){line.setAttribute('x1',String(pinX<x?0:pinX>x+cardWidth?cardWidth:pinX-x));line.setAttribute('y1',String(Math.max(8,Math.min(cardHeight-8,pinY-y))));line.setAttribute('x2',String(pinX-x));line.setAttribute('y2',String(pinY-y));}
   if(dot){dot.setAttribute('cx',String(pinX-x));dot.setAttribute('cy',String(pinY-y));}
  }
 };
 let renderEnabled=true;
 let raf=0,last=performance.now(),autoRoute=.5,autoElapsed=0,dayElapsed=0,demoElapsed=0,demoPhase=.5,dustElapsed=0,lastFoot=V(999,999,999),demoLoop=false;const tick=()=>{if(!alive)return;raf=requestAnimationFrame(tick);const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;if(!renderEnabled)return;
  if(gateOpening!==gateTarget){gateOpening=gateTarget>gateOpening?Math.min(gateTarget,gateOpening+dt/1.4):Math.max(gateTarget,gateOpening-dt/1.4);for(const panel of gatePanels)panel.group.position.z=workshopGateOffset(panel.side,gateOpening);}
  atmosphericDust.rotation.y+=dt*.004;dish.rotation.y+=dt*.16;const orbit=now*.00004;phobos.position.set(Math.cos(orbit)*390,82+Math.sin(orbit*.7)*25,Math.sin(orbit)*390);deimos.position.set(Math.cos(-orbit*.43)*520,125+Math.sin(orbit*.3)*16,Math.sin(-orbit*.43)*520);
  if(solarCycle){dayFraction=(dayFraction+dt/80)%1;applyDay();dayElapsed+=dt;if(dayElapsed>.18){dayElapsed=0;onDay?.(dayFraction);if(active?.target==='solarPower'){param=dayFraction;update();onParameter?.(param);}}}
  if(demoLoop&&active&&!solarCycle&&!autoRover){demoPhase=Math.min(1,demoPhase+dt*.09);demoElapsed+=dt;if(demoElapsed>.11||demoPhase>=1){demoElapsed=0;param=demoPhase;update();onParameter?.(param);}if(demoPhase>=1){demoLoop=false;onMotionComplete?.();}}
  if(autoRover){
   autoRoute=Math.min(1,autoRoute+dt*.035);
   const tt=START+autoRoute*Math.PI,q=V(...routeAt(tt)),v=V(...velocityAt(tt)),g=grad(q.x,q.z),direction=v.clone().normalize(),up=V(-g[0],1,-g[1]).normalize();
   rover.position.copy(q);
   rover.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(up.clone().cross(direction).normalize(),up,direction));
   // The fallback wheels are independent cylinders. The Perseverance GLB has
   // all six wheels fused into one mesh, so rotating it would tumble the whole set.
   roverWheels.forEach(w=>w.rotateY(dt*9));dustElapsed+=dt;
   if(dustElapsed>.09){dustElapsed=0;emitDust(q);}
   if(active&&(STATIC_ROUTE_TARGETS.has(active.target)||active.target==='roverEnergy')){
    autoElapsed+=dt;
    if(autoElapsed>.08){
     autoElapsed=0;
     const previous=focusPoint.clone();
     if(active.target!=='roverEnergy')param=autoRoute;update();if(active.target!=='roverEnergy')onParameter?.(param);
     if(mode==='aerial'){
      const delta=focusPoint.clone().sub(previous);
      if(active.target==='curvature'){
       aimCurvatureCamera(autoRoute);
      }else if(active.name==='Regla de la cadena'){
       targetLook=focusPoint.clone().add(V(0,3,0));
       targetCamera=focusPoint.clone().add(V(17,17,22));
      }else if(active.name==='Longitud de arco'){
       targetLook=focusPoint.clone().add(V(0,3,0));
       targetCamera=focusPoint.clone().add(V(12,28,16));
      }else{
       targetLook=(targetLook||controls.target).clone().add(delta);
       targetCamera=(targetCamera||camera.position).clone().add(delta);
      }
     }
    }
   }
   if(autoRoute>=1){
    autoRover=false;
    if(active&&STATIC_ROUTE_TARGETS.has(active.target)){param=1;update();onParameter?.(1);}
    else if(active?.target==='roverEnergy')update();
    if(active?.name==='Longitud de arco'&&mode==='aerial'){targetLook=V(0,height(0,0),0);targetCamera=V(0,235,8);}
    onMotionComplete?.();
   }
  }
  if(logisticsDrive&&!autoRover){
   const stations=logisticsDrive.stations;
   const nearGate=stations.find(station=>station.distance>=logisticsTravel)?.point;
   if(!(nearGate&&nearGate.x<WORKSHOP_WEST_GATE.planeX&&WORKSHOP_WEST_GATE.planeX-nearGate.x<8&&gateOpening<.99))logisticsTravel=Math.min(logisticsDrive.length,logisticsTravel+dt*6);
   let high=stations.findIndex(station=>station.distance>=logisticsTravel);if(high<1)high=1;
   const a=stations[high-1],b=stations[high],blend=Math.max(0,Math.min(1,(logisticsTravel-a.distance)/(b.distance-a.distance)));
   rover.position.copy(a.point).lerp(b.point,blend);
   const forward=b.point.clone().sub(a.point).normalize(),right=V(forward.z,0,-forward.x).normalize(),up=forward.clone().cross(right).normalize();
   rover.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(right,up,forward));
   gateTarget=logisticsTravel>=logisticsDrive.length-1?0:1;
  }
  const trailAttribute=trailGeometry.attributes.position as T.BufferAttribute;for(let i=0;i<trailAttribute.count;i++){const y=trailAttribute.getY(i);if(y>-900)trailAttribute.setY(i,y+dt*.12);}trailAttribute.needsUpdate=true;
  if(mode==='walk'){const forward=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0),side=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),previous=camera.position.clone();const next=camera.position.clone();next.x+=(-Math.sin(yaw)*forward+Math.cos(yaw)*side)*dt*6;next.z+=(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*dt*6;if(Math.hypot(next.x,next.z)<400&&canWalkHabitat(next.x,next.z,camera.position.x,camera.position.z)&&!obstacles.some(o=>Math.hypot(next.x-o.x,next.z-o.z)<o.r+.7&&!(LAB_ACCESS.some(lab=>lab.x===o.x&&lab.z===o.z)&&labWalkway(next.x,next.z)))){camera.position.x=next.x;camera.position.z=next.z;}camera.position.y=(Math.hypot(camera.position.x-landingX,camera.position.z-landingZ)<13.5?landingY:walkFloor(camera.position.x,camera.position.z,previous.y-1.7))+1.7;if(previous.distanceTo(camera.position)>.001&&lastFoot.distanceTo(camera.position)>.85){emitDust(V(camera.position.x,camera.position.y-1.7,camera.position.z));lastFoot.copy(camera.position);}camera.lookAt(camera.position.clone().add(V(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch))));savedWalk.copy(camera.position);
  }else{if(targetCamera&&targetLook){const blend=1-Math.exp(-4*dt);camera.position.lerp(targetCamera,blend);controls.target.lerp(targetLook,blend);if(camera.position.distanceTo(targetCamera)<.1){targetCamera=null;targetLook=null;}}controls.update();if(!(active?.name==='Volumen bajo f'&&phaseVCamera==='under'))camera.position.y=Math.max(camera.position.y,landscape(camera.position.x,camera.position.z)+1.3);}
  placeAnnotations();
  composer.render();
 };tick();
 controls.addEventListener('start',()=>{targetCamera=null;targetLook=null;});
 const previewCanvas=document.createElement('canvas');const remoteAccess={snapshot(){if(!renderEnabled){if(targetCamera)camera.position.copy(targetCamera);if(targetLook)controls.target.copy(targetLook);controls.update();}renderer.render(scene,camera);previewCanvas.width=640;previewCanvas.height=Math.round(640*renderer.domElement.height/renderer.domElement.width);previewCanvas.getContext('2d')!.drawImage(renderer.domElement,0,0,previewCanvas.width,previewCanvas.height);return previewCanvas.toDataURL('image/jpeg',.6);},rendering(on:boolean){renderEnabled=on;keys.clear();},remoteCamera(kind:string,dx:number,dy:number){mode='aerial';controls.enabled=true;keys.clear();targetCamera=null;targetLook=null;const damping=controls.enableDamping;controls.enableDamping=false;try{if(kind==='orbit'){controls.rotateLeft(dx*Math.PI*2);controls.rotateUp(dy*Math.PI*2);}else if(kind==='pan')controls.pan(dx*host.clientWidth,dy*host.clientHeight);else if(kind==='zoom')controls.dollyOut(Math.exp(dy*2));controls.update();}finally{controls.enableDamping=damping;}}};
 return {...remoteAccess,annotations(items){annotationItems=items;placeAnnotations();},curvatureCamera(view){curvatureView=view;if(active?.target==='curvature')aimCurvatureCamera(param);},phaseCamera(view){phaseVCamera=view;lastPhaseVCamera='';update();aimPhaseVCamera();},station(step,value){phaseVCamera='auto';lastPhaseVCamera='';lastLagrangeStage='';curvatureView='auto';if(active?.target!==step.target){xrayMode=false;autoRover=false;solarCycle=false;demoLoop=false;keys.clear();}active=step;param=value;demoPhase=value;if(STATIC_ROUTE_TARGETS.has(step.target))autoRoute=value;else if(step.target==='roverEnergy')autoRoute=0;if(step.target==='solarPower'){dayFraction=value;applyDay();onDay?.(value);}update();if(mode==='aerial'){const broad=['all','criticals','safe','candidates','axes','domain','contours','curvature','terrainInterpretation','runoff'].includes(step.target),tracked=['route','vectors','tangentVector','curvature','routeMarkers','safeSpeed','directional','directionalQ','directionalRose','chainRule'].includes(step.target),tripleIntegral=['tank','jacobian','density','mass'].includes(step.target);if(step.name==='Plano general'){targetLook=V(0,8,0);targetCamera=V(152,164,152);}else{targetLook=focusPoint.clone().add(V(0,step.target==='route'?3:tripleIntegral?5:-9,0));targetCamera=step.target==='solarPower'?targetLook.clone().add(V(50,55,40)):step.name==='Regla de la cadena'?targetLook.clone().add(V(72,54,88)):step.target==='resourceLoop'?focusPoint.clone().add(V(50,39,60)):step.target==='iceSurvey'?focusPoint.clone().add(V(0,120,12)):step.target==='contours'||step.target==='terrain'?focusPoint.clone().add(V(0,185,8)):tripleIntegral?targetLook.clone().add(V(25,21,30)):focusPoint.clone().add(tracked?V(72,54,88):broad?V(95,100,125):V(35,27,43));}}},parameter(value){const previous=focusPoint.clone(),previousLagrangeStage=lastLagrangeStage;param=value;demoPhase=value;if(active&&STATIC_ROUTE_TARGETS.has(active.target))autoRoute=value;if(active?.target==='solarPower'){dayFraction=value;applyDay();onDay?.(value);}update();if(mode==='aerial'&&active?.target==='criticalOther'){targetLook=focusPoint.clone().add(V(0,2,0));targetCamera=targetLook.clone().add(V(55,55,70));}if(active?.target==='candidates'&&previousLagrangeStage!==lastLagrangeStage)return;if(mode==='aerial'&&active&&['route','vectors','tangentVector','routeMarkers','safeSpeed','safe','candidates','base','traces','roverEnergy'].includes(active.target)){const delta=focusPoint.clone().sub(previous);if(active.name==='Regla de la cadena'){targetLook=focusPoint.clone().add(V(0,3,0));targetCamera=focusPoint.clone().add(V(17,17,22));}else{targetLook=(targetLook||controls.target).clone().add(delta);targetCamera=(targetCamera||camera.position).clone().add(delta);}}},view(next){mode=next;controls.enabled=next==='aerial';targetCamera=null;targetLook=null;if(next==='walk'){camera.position.copy(savedWalk);yaw=-.5;pitch=-.05;}else{targetLook=focusPoint.clone().add(V(0,-9,0));targetCamera=focusPoint.clone().add(V(75,80,100));}},interior(){mode='walk';controls.enabled=false;targetLook=null;targetCamera=null;keys.clear();camera.position.set(bx,HABITAT.floor+1.7,bz+5);savedWalk.copy(camera.position);yaw=0;pitch=-.04;},entrance(){mode='walk';controls.enabled=false;targetLook=null;targetCamera=null;keys.clear();const entranceZ=airlockZ-17.4;camera.position.set(airlockX,walkFloor(airlockX,entranceZ)+1.7,entranceZ);savedWalk.copy(camera.position);yaw=0;pitch=0;},focus(position){mode='aerial';controls.enabled=true;keys.clear();targetLook=V(...position);targetCamera=targetLook.clone().add(V(55,50,68));},zoom(factor){if(mode!=='aerial')return;const look=(targetLook||controls.target).clone(),current=(targetCamera||camera.position).clone(),offset=current.sub(look),distance=Math.max(10,Math.min(580,offset.length()*factor));targetLook=look;targetCamera=look.clone().add(offset.normalize().multiplyScalar(distance));},overview(){mode='aerial';controls.enabled=true;targetLook=V(0,8,0);targetCamera=V(152,164,152);},survey(on){surveyLayer.visible=on;},elevation(on){elevationBands.visible=on;},explain,xray(on){xrayMode=on;if(on)clean=false;update();if(on){mode='aerial';controls.enabled=true;const comparisonCamera=['jacobian','Transformación y límites','Cartesiano vs. elipsoidal'].includes(active?.name||''),objectLook=comparisonCamera?V(tx-13.5,ty+7.5,tz+1):V(tx,ty+3,tz);targetLook=objectLook;targetCamera=objectLook.clone().add(comparisonCamera?V(45,52,55):V(40,48,52));}},autopilot(on){if(on&&autoRoute>=1){autoRoute=0;if(active?.target!=='roverEnergy'){param=0;onParameter?.(0);}update();}autoRover=on;},day(value){dayFraction=value;applyDay();if(active?.target==='solarPower'){param=value;update();onParameter?.(value);}},dayCycle(on){solarCycle=on;},demoCycle(on){if(on&&demoPhase>=1){demoPhase=0;param=0;update();onParameter?.(0);}demoLoop=on;},sound(on){setAmbientSound(on);},clean(on){clean=on;if(on)xrayMode=false;update();},move(direction,on){on?keys.add(direction):keys.delete(direction);},dispose(){assetTracker.dispose();alive=false;annotationItems=[];cancelAnimationFrame(raf);ro.disconnect();controls.dispose();draco.dispose();setAmbientSound(false);window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);window.removeEventListener('blur',blur);renderer.domElement.removeEventListener('pointerdown',down);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',up);scene.traverse(o=>{const m=o as T.Mesh;if(m.geometry)m.geometry.dispose();if(m.material)(Array.isArray(m.material)?m.material:[m.material]).forEach(mat=>{for(const value of Object.values(mat))if(value instanceof T.Texture)value.dispose();mat.dispose();});});textures.forEach(t=>t.dispose());screenTexture.dispose();renderer.domElement.remove();}};
}


