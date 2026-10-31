import * as THREE from 'three';

const TRANSIT_STARS=60000, SPIRAL_STARS=120000, DISTANT_GALAXIES=7000;
function pointMaterial(size:number, diffuse=false){
 return new THREE.ShaderMaterial({
  uniforms:{opacity:{value:0},pointSize:{value:size},maximum:{value:diffuse?48:3.2},diffuse:{value:diffuse?1:0}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:`attribute vec3 starColor;attribute float brightness;varying vec3 tint;uniform float opacity;uniform float pointSize;uniform float maximum;
   void main(){vec4 v=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*v;gl_PointSize=clamp(pointSize*brightness*900./max(1.,-v.z),.55,maximum);tint=starColor*opacity;}`,
  fragmentShader:`varying vec3 tint;uniform float diffuse;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;float a=mix(pow(1.-r,1.7),exp(-r*r*6.)*(1.-smoothstep(.75,1.,r)),diffuse);gl_FragColor=vec4(tint,a);}`,
 });
}

/** Campo ilustrativo con profundidad. Las posiciones individuales no son un catálogo estelar. */
export function createGalacticField(){
 let state=73129,alive=true;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const geometry=new THREE.BufferGeometry(),positions=new Float32Array(TRANSIT_STARS*3),colors=new Float32Array(TRANSIT_STARS*3),brightness=new Float32Array(TRANSIT_STARS);
 const material=pointMaterial(.85),group=new THREE.Group();
 for(let i=0;i<TRANSIT_STARS;i++){
  const radius=45+Math.pow(random(),.58)*(random()<.36?360:1350),angle=random()*Math.PI*2,c=random()*2-1,s=Math.sqrt(1-c*c);
  positions.set([radius*s*Math.cos(angle),radius*c*.62,radius*s*Math.sin(angle)],i*3);
  colors.set([.48,.58,.76],i*3);brightness[i]=random()<.008?3.4:.3+random()*.9;
 }
 geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('starColor',new THREE.BufferAttribute(colors,3));geometry.setAttribute('brightness',new THREE.BufferAttribute(brightness,1));
 const stars=new THREE.Points(geometry,material);stars.frustumCulled=false;group.add(stars);
 const spiralGeometry=new THREE.BufferGeometry(),spiralPositions=new Float32Array(SPIRAL_STARS*3),spiralColors=new Float32Array(SPIRAL_STARS*3),spiralBrightness=new Float32Array(SPIRAL_STARS);
 for(let i=0;i<SPIRAL_STARS;i++){
  const core=random()<.24;let x:number,y:number,z:number;
  if(core){
   const r=Math.pow(random(),.65),a=random()*Math.PI*2,c=random()*2-1,s=Math.sqrt(1-c*c),bx=r*s*Math.cos(a)*260,bz=r*s*Math.sin(a)*600;
   x=bx*.86+bz*.5;z=-bx*.5+bz*.86;y=r*c*170;
  }else{
   const r=280+Math.pow(random(),.72)*2300,arm=Math.floor(random()*4),a=arm*Math.PI/2+Math.log(1+r/170)*1.75+(random()+random()-1)*.55;
   x=r*Math.cos(a);z=r*Math.sin(a);y=(random()+random()+random()-1.5)*(40+80*Math.exp(-r/700));
  }
  spiralPositions.set([x,y,z-1296],i*3);
  const luminous=.35+random()*.65,red=random()<.018;
  spiralColors.set(core?[luminous,luminous*.78,luminous*.48]:red?[luminous*.85,luminous*.3,luminous*.38]:[luminous*.68,luminous*.8,luminous],i*3);
  spiralBrightness[i]=random()<.008?3.5:.4+random()*1.25;
 }
 spiralGeometry.setAttribute('position',new THREE.BufferAttribute(spiralPositions,3));spiralGeometry.setAttribute('starColor',new THREE.BufferAttribute(spiralColors,3));spiralGeometry.setAttribute('brightness',new THREE.BufferAttribute(spiralBrightness,1));
 const spiralMaterial=pointMaterial(4),spiral=new THREE.Points(spiralGeometry,spiralMaterial);spiral.frustumCulled=false;group.add(spiral);
 const hazeCount=5200,hazeGeometry=new THREE.BufferGeometry(),hazePositions=new Float32Array(hazeCount*3),hazeColors=new Float32Array(hazeCount*3),hazeBrightness=new Float32Array(hazeCount);
 hazeGeometry.setAttribute('position',new THREE.BufferAttribute(hazePositions,3));hazeGeometry.setAttribute('starColor',new THREE.BufferAttribute(hazeColors,3));hazeGeometry.setAttribute('brightness',new THREE.BufferAttribute(hazeBrightness,1));
 const hazeMaterial=pointMaterial(190,true),haze=new THREE.Points(hazeGeometry,hazeMaterial);haze.visible=false;haze.frustumCulled=false;group.add(haze);
 const distantGeometry=new THREE.BufferGeometry(),farPositions=new Float32Array(DISTANT_GALAXIES*3),farColors=new Float32Array(DISTANT_GALAXIES*3),farBrightness=new Float32Array(DISTANT_GALAXIES);
 for(let i=0;i<DISTANT_GALAXIES;i++){
  const r=14000+Math.pow(random(),.7)*175000,a=random()*Math.PI*2,c=random()*2-1,s=Math.sqrt(1-c*c);
  farPositions.set([r*s*Math.cos(a),r*c,r*s*Math.sin(a)],i*3);
  const blue=random()>.55;farColors.set(blue?[.6,.73,1.]:[1.,.79,.54],i*3);farBrightness[i]=3+random()*9;
 }
 distantGeometry.setAttribute('position',new THREE.BufferAttribute(farPositions,3));distantGeometry.setAttribute('starColor',new THREE.BufferAttribute(farColors,3));distantGeometry.setAttribute('brightness',new THREE.BufferAttribute(farBrightness,1));
 const farMaterial=pointMaterial(6),distant=new THREE.Points(distantGeometry,farMaterial);distant.frustumCulled=false;group.add(distant);
 return {
  group,
  sample(image:HTMLImageElement){
   if(!alive)return;
   const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;const context=canvas.getContext('2d')!;context.drawImage(image,0,0,512,512);const pixels=context.getImageData(0,0,512,512).data;
   for(let i=0;i<TRANSIT_STARS;i++){
    const x=Math.max(0,Math.min(511,Math.floor((.5+positions[i*3]/7200)*512))),y=Math.max(0,Math.min(511,Math.floor((.68+positions[i*3+2]/7200)*512))),offset=(y*512+x)*4;
    colors.set([.18+pixels[offset]/255*.42,.22+pixels[offset+1]/255*.46,.3+pixels[offset+2]/255*.55],i*3);
   }
   // La referencia aporta densidad, color y calles oscuras; cada punto tiene profundidad propia.
   // El desplazamiento aleatorio dentro de cada píxel evita cuadrículas y patrones repetitivos.
   let filled=0;
   for(let tries=0;filled<SPIRAL_STARS&&tries<SPIRAL_STARS*80;tries++){
    const u=random(),v=random(),offset=(Math.floor(v*512)*512+Math.floor(u*512))*4;
    const r=pixels[offset]/255,g=pixels[offset+1]/255,b=pixels[offset+2]/255,l=.2126*r+.7152*g+.0722*b;
    if(l<.035||random()>Math.pow(l,1.15))continue;
    const x=(u-.5)*7200,z=(v-.68)*7200,radial=Math.hypot(x,z+1296),bulge=Math.exp(-((radial/510)**2));
    const y=(random()+random()+random()+random()-2)*(22+230*bulge+35*Math.exp(-radial/1400));
    spiralPositions.set([x,y,z],filled*3);
    const light=.5+random()*.5;spiralColors.set([Math.pow(r,.8)*light,Math.pow(g,.8)*light,Math.pow(b,.8)*light],filled*3);
    spiralBrightness[filled]=random()<.006?3.2:.35+random()*1.05;
    if(filled<hazeCount){hazePositions.set([x,y*.6,z],filled*3);hazeColors.set([r*.7,g*.7,b*.78],filled*3);hazeBrightness[filled]=.6+random()*.8;}
    filled++;
   }
   spiralGeometry.attributes.position.needsUpdate=true;spiralGeometry.attributes.starColor.needsUpdate=true;spiralGeometry.attributes.brightness.needsUpdate=true;
   spiralGeometry.computeBoundingSphere();
   for(const attribute of Object.values(hazeGeometry.attributes))attribute.needsUpdate=true;
   hazeGeometry.computeBoundingSphere();haze.visible=true;
   geometry.attributes.position.needsUpdate=true;geometry.attributes.starColor.needsUpdate=true;geometry.computeBoundingSphere();
  },
  update(distance:number){
   material.uniforms.opacity.value=THREE.MathUtils.smoothstep(distance,180,460)*(1-THREE.MathUtils.smoothstep(distance,1500,3400))*.7;
   spiralMaterial.uniforms.opacity.value=THREE.MathUtils.smoothstep(distance,450,1800)*.75;
   hazeMaterial.uniforms.opacity.value=THREE.MathUtils.smoothstep(distance,650,2100)*.035;
   farMaterial.uniforms.opacity.value=THREE.MathUtils.smoothstep(distance,3500,22000)*.8;
   stars.visible=distance>180&&distance<3400;spiral.visible=distance>450;geometry.setDrawRange(0,TRANSIT_STARS);
  },
  dispose(){alive=false;},
 };
}
