import * as THREE from 'three';

export const SUN_VISUAL_RADIUS = 5.2;

/** Fotosfera y corona ilustrativas, calculadas localmente; no requieren una imagen remota. */
export function createSolarStar(bloomLayer: number) {
  const group = new THREE.Group();
  const uniforms = { time: { value: 0 }, opacity: { value: 1 } };
  const surface = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `varying vec3 p; varying vec3 n; varying vec3 eye;
      void main(){p=position;vec4 v=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);eye=-v.xyz;gl_Position=projectionMatrix*v;}`,
    fragmentShader: `uniform float time; uniform float opacity; varying vec3 p; varying vec3 n; varying vec3 eye;
      float hash(vec3 q){return fract(sin(dot(q,vec3(127.1,311.7,74.7)))*43758.5453);}
      float noise(vec3 q){vec3 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);
        return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
        mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
      float fbm(vec3 q){float a=.55,v=0.;for(int i=0;i<4;i++){v+=a*noise(q);q=q*2.03+vec3(7.1);a*=.5;}return v;}
      void main(){vec3 q=normalize(p);float grains=fbm(q*52.+vec3(time*.028,0.,time*.015));
        float flow=fbm(q*9.+vec3(0.,time*.018,0.));float spots=smoothstep(.63,.76,fbm(q*15.+flow));
        float limb=pow(max(dot(normalize(n),normalize(eye)),0.),.32);
        vec3 color=mix(vec3(.55,.08,.008),vec3(1.65,.78,.16),clamp((grains-.27)*2.,0.,1.));
        color*=mix(.48,1.05,limb)*(1.-spots*.58);gl_FragColor=vec4(color,opacity);}`,
    transparent: true,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(SUN_VISUAL_RADIUS, 96, 64), surface);
  mesh.layers.enable(bloomLayer);
  group.add(mesh);

  const halo = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `varying vec2 uvHalo;void main(){uvHalo=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform float time;uniform float opacity;varying vec2 uvHalo;
      void main(){vec2 q=(uvHalo-.5)*2.;float r=length(q),a=atan(q.y,q.x);
        float rays=.78+.12*sin(a*11.+time*.04)+.1*sin(a*23.-time*.025);
        float corona=exp(-max(r-.29,0.)*8.)*.16*smoothstep(.265,.32,r);
        float alpha=corona*rays*(1.-smoothstep(.72,1.,r))*opacity;if(alpha<.002)discard;
        gl_FragColor=vec4(1.,.42,.08,alpha);}`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const corona = new THREE.Mesh(new THREE.PlaneGeometry(36, 36), halo);
  corona.layers.enable(bloomLayer);
  group.add(corona);
  return {
    group, mesh,
    update(camera: THREE.Camera, seconds: number, visibility: number) {
      uniforms.time.value = seconds;
      uniforms.opacity.value = visibility;
      mesh.rotation.y = seconds * .008;
      corona.quaternion.copy(camera.quaternion);
    },
  };
}
