import * as T from 'three';
import { height, landscape } from '../data/marsMath';

export function createElevationBands(){
  const radii=72,angles=180,positions:number[]=[],colors:number[]=[],indices:number[]=[];
  const palette=['#254d54','#39706d','#72917c','#b49b72','#d4855f','#e4b07a'].map(c=>new T.Color(c));
  for(let r=0;r<=radii;r++)for(let a=0;a<=angles;a++){
    const radius=110*r/radii,theta=a/angles*Math.PI*2,x=radius*Math.cos(theta),z=radius*Math.sin(theta),y=height(x,z)+.038;
    const band=Math.max(0,Math.min(palette.length-1,Math.floor((y-16.5)/1.45))),c=palette[band];
    positions.push(x,y,z);colors.push(c.r,c.g,c.b);
  }
  for(let r=0;r<radii;r++)for(let a=0;a<angles;a++){
    const i=r*(angles+1)+a;indices.push(i,i+angles+1,i+1,i+1,i+angles+1,i+angles+2);
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const mesh=new T.Mesh(geometry,new T.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.34,depthWrite:false,side:T.DoubleSide}));
  mesh.name='Franjas de elevación calculadas sobre f';mesh.renderOrder=1;return mesh;
}

export function createAtmosphericDust(seed:(n:number)=>number){
  const count=900,positions=new Float32Array(count*3),sizes=new Float32Array(count);
  for(let i=0;i<count;i++){const radius=150+seed(i)*590,angle=seed(i+1000)*Math.PI*2;positions[i*3]=Math.cos(angle)*radius;positions[i*3+1]=10+seed(i+2000)*150;positions[i*3+2]=Math.sin(angle)*radius;sizes[i]=.4+seed(i+3000)*1.8;}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(positions,3));geometry.setAttribute('size',new T.BufferAttribute(sizes,1));
  const material=new T.PointsMaterial({color:'#e1b08c',size:1.15,sizeAttenuation:true,transparent:true,opacity:.14,depthWrite:false,blending:T.AdditiveBlending});
  const points=new T.Points(geometry,material);points.name='Polvo atmosférico tenue';return points;
}

export function createMoons(){
  const group=new T.Group(),phobos=new T.Mesh(new T.IcosahedronGeometry(3.1,2),new T.MeshStandardMaterial({color:'#c9aa91',roughness:1})),deimos=new T.Mesh(new T.IcosahedronGeometry(1.7,2),new T.MeshStandardMaterial({color:'#a9998e',roughness:1}));
  phobos.name='Phobos — escala visual';deimos.name='Deimos — escala visual';group.add(phobos,deimos);return {group,phobos,deimos};
}

export function createOuterCraters(regolith:T.Texture,normal:T.Texture){
  const group=new T.Group(),material=new T.MeshStandardMaterial({color:'#79513e',map:regolith,normalMap:normal,normalScale:new T.Vector2(.24,.24),roughness:1});
  for(const [x,z,r] of [[-145,70,13],[138,105,9],[-105,-155,17],[188,-54,11],[58,165,7]] as [number,number,number][]){
    const rim=new T.Mesh(new T.TorusGeometry(r,r*.16,7,44),material);rim.position.set(x,landscape(x,z)+.25,z);rim.rotation.x=Math.PI/2;rim.scale.y=.65;rim.receiveShadow=true;group.add(rim);
    const floor=new T.Mesh(new T.CircleGeometry(r*.83,44),new T.MeshStandardMaterial({color:'#684638',roughness:1,map:regolith}));floor.position.set(x,landscape(x,z)-r*.15,z);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;group.add(floor);
  }
  group.name='Cráteres menores fuera del dominio matemático';return group;
}

export function createGodRays(x:number,y:number,z:number){
  const group=new T.Group(),material=new T.MeshBasicMaterial({color:'#bfece2',transparent:true,opacity:.025,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending});
  for(let i=0;i<5;i++){const ray=new T.Mesh(new T.ConeGeometry(.35+i*.08,8+i*.6,16,1,true),material.clone());ray.position.set(x-4+i*2,y+5,z+(i%2?2:-2));ray.rotation.z=(i-2)*.1;group.add(ray);}return group;
}
