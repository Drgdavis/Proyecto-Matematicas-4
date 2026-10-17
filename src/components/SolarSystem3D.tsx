import { assetUrl } from '../utils/assetUrl';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { PhysicalData, ModifiedPhysicalData, CameraMode, CometState } from '../types';
import { VISUAL_SCALE, G_CONSTANT, MASS_OF_SUN, AU_IN_KM } from '../data/planets';
import { getModifiedProps } from '../utils/mathFormulas';

interface SolarSystem3DProps {
  planets: PhysicalData[];
  selectedPlanet: string;
  onSelectPlanet: (name: string) => void;
  // --- Overhaul: selección de lunas (tarjeta de info ligera, no usa PHYS) ---
  onSelectMoon?: (moonName: string, parentPlanetName: string) => void;
  speed: number;
  isPaused: boolean;
  toggles: {
    orbits: boolean;
    trails: boolean;
    lunas: boolean;
    names: boolean;
    vectors: boolean;
    grid: boolean;
    gravValue: boolean;
  };
  cameraMode: CameraMode;
  onCameraModeChange: (mode: CameraMode) => void;
  planetModifiers: Record<string, ModifiedPhysicalData>;
  cometState: CometState;
  onUpdateComet: (updater: (prev: CometState) => CometState) => void;
  comparisonMode: boolean; // aligned planet comparison size layout
  hoveredPlanet: string | null;
  setHoveredPlanet: (name: string | null) => void;
  onSimulateCollisionClick?: (planetAName: string, planetBName: string) => void;
  onUpdateSimulatedTime: (days: number) => void;
  globalPlanetSize: number;
  collisionState: any;
  onCollisionStateChange: (state: any) => void;
  descentActive?: boolean;
}

export function SolarSystem3D({
  planets,
  selectedPlanet,
  onSelectPlanet,
  onSelectMoon,
  speed,
  isPaused,
  toggles,
  cameraMode,
  onCameraModeChange,
  planetModifiers,
  cometState,
  onUpdateComet,
  comparisonMode,
  hoveredPlanet,
  setHoveredPlanet,
  onUpdateSimulatedTime,
  globalPlanetSize,
  collisionState,
  onCollisionStateChange,
  descentActive = false
}: SolarSystem3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const containerSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const [containerReady, setContainerReady] = useState(false);

  // Keep references to animate meshes and labels inside the requestAnimationFrame loop
  const meshesRef = useRef<Record<string, THREE.Mesh>>({});
  // --- Overhaul Visual: seguimiento de cámara que respeta el zoom manual ----
  const followPrevPosRef = useRef<THREE.Vector3 | null>(null);
  const lastFollowedNameRef = useRef<string | null>(null);
  const followTransitionRef = useRef(1);
  const followCameraStartRef = useRef<THREE.Vector3 | null>(null);
  const followTargetStartRef = useRef<THREE.Vector3 | null>(null);
  const atmosphereMeshesRef = useRef<Record<string, THREE.Mesh>>({});
  const orbitLinesRef = useRef<Record<string, Line2>>({});
  const arrowHelpersRef = useRef<Record<string, THREE.ArrowHelper>>({});
  const moonsMeshesRef = useRef<Record<string, THREE.Mesh[]>>({});
  const labelsContainerRef = useRef<HTMLDivElement>(null);
  const galaxyJumpRef = useRef<(() => void) | null>(null);
  const galacticViewRef = useRef(false);
  const [galacticView, setGalacticView] = useState(false);
  const trailGeometriesRef = useRef<Record<string, { geometry: THREE.BufferGeometry; positions: number[] }>>({});
  const trailLinesRef = useRef<Record<string, THREE.Line>>({});

  // Dynamic values to share with parents
  const angleOfPlanetsRef = useRef<Record<string, number>>({});

  // Elements for comet and gravity grid overlays
  const cometMeshRef = useRef<THREE.Mesh | null>(null);
  // --- Overhaul: uniforms del shader día/noche de la Tierra (luces reales) --
  const earthShaderUniformsRef = useRef<{ sunDirection: { value: THREE.Vector3 } } | null>(null);
  // --- Overhaul: cinturón de asteroides (física kepleriana real por roca) --
  const asteroidBeltRef = useRef<{
    mesh: THREE.InstancedMesh;
    data: { radius: number; angle: number; angularSpeed: number; yOff: number; scale: number; spinAxis: THREE.Vector3; spinSpeed: number }[];
  } | null>(null);
  const cometGlowRef = useRef<THREE.Mesh | null>(null);
  const cometTrailRef = useRef<THREE.Line | null>(null);
  const cometWasActiveRef = useRef<boolean>(false);
  const cometPositionsRef = useRef<number[]>([]);
  const gravityGridRef = useRef<THREE.Mesh | null>(null);
  const eclipticGridRef = useRef<THREE.GridHelper | null>(null);
  const sunCoronaRef = useRef<THREE.Mesh | null>(null);

  // Collision animation references
  const collisionExplosionRef = useRef<THREE.Mesh | null>(null);
  const collisionProgressRef = useRef<number>(0);
  
  // Time metrics inside Three.js
  const timeRef = useRef<number>(0);

  // Mutable references for dynamic props and variables to prevent Three.js component rebuild & context crashes!
  const speedRef = useRef(speed);
  const isPausedRef = useRef(isPaused);
  const togglesRef = useRef(toggles);
  const cameraModeRef = useRef(cameraMode);
  const planetModifiersRef = useRef(planetModifiers);
  const cometStateRef = useRef(cometState);
  const comparisonModeRef = useRef(comparisonMode);
  const hoveredPlanetRef = useRef(hoveredPlanet);
  const selectedPlanetRef = useRef(selectedPlanet);
  const globalPlanetSizeRef = useRef(globalPlanetSize);
  const descentActiveRef = useRef(descentActive);
  const descentStartRef = useRef<number | null>(null);
  const descentCameraStartRef = useRef<THREE.Vector3 | null>(null);
  const descentTargetStartRef = useRef<THREE.Vector3 | null>(null);

  const onSelectPlanetRef = useRef(onSelectPlanet);
  const onSelectMoonRef = useRef(onSelectMoon);
  const onUpdateCometRef = useRef(onUpdateComet);
  const onUpdateSimulatedTimeRef = useRef(onUpdateSimulatedTime);
  const setHoveredPlanetRef = useRef(setHoveredPlanet);

  // Keep references always updated
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);
  useEffect(() => { togglesRef.current = toggles; }, [toggles]);
  useEffect(() => { cameraModeRef.current = cameraMode; }, [cameraMode]);
  useEffect(() => { planetModifiersRef.current = planetModifiers; }, [planetModifiers]);
  useEffect(() => { cometStateRef.current = cometState; }, [cometState]);
  useEffect(() => { comparisonModeRef.current = comparisonMode; }, [comparisonMode]);
  useEffect(() => { hoveredPlanetRef.current = hoveredPlanet; }, [hoveredPlanet]);
  useEffect(() => { selectedPlanetRef.current = selectedPlanet; }, [selectedPlanet]);
  useEffect(() => { globalPlanetSizeRef.current = globalPlanetSize; }, [globalPlanetSize]);
  useEffect(() => { descentActiveRef.current = descentActive; }, [descentActive]);
  useEffect(() => { collisionProgressRef.current = collisionState?.progress || 0; }, [collisionState]);

  useEffect(() => { onSelectPlanetRef.current = onSelectPlanet; }, [onSelectPlanet]);
  useEffect(() => { onSelectMoonRef.current = onSelectMoon; }, [onSelectMoon]);
  useEffect(() => { onUpdateCometRef.current = onUpdateComet; }, [onUpdateComet]);
  useEffect(() => { onUpdateSimulatedTimeRef.current = onUpdateSimulatedTime; }, [onUpdateSimulatedTime]);
  useEffect(() => { setHoveredPlanetRef.current = setHoveredPlanet; }, [setHoveredPlanet]);

  // Check container size and mark as ready
  useEffect(() => {
    if (!mountRef.current) return;

    const checkSize = () => {
      const width = mountRef.current!.clientWidth;
      const height = mountRef.current!.clientHeight;
      if (width > 100 && height > 100) {
        containerSizeRef.current = { width, height };
        setContainerReady(true);
      }
    };

    // Initial check
    checkSize();

    // If not ready, check again in intervals
    let intervalId: number | null = null;
    if (!containerReady) {
      intervalId = window.setInterval(checkSize, 100);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [containerReady]);

  useEffect(() => {
    if (!mountRef.current || !containerReady) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.00003); // negro puro, estilo NASA Eyes — densidad aún más baja

    // 2. Camera Setup
    const width = mountRef.current.clientWidth || 800;
    const height = mountRef.current.clientHeight || 600;
    containerSizeRef.current = { width, height };
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.01, 5200);
    camera.position.set(0, 63, 105);

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setClearColor(0x000000, 1); // fondo 100% negro
    // --- Overhaul Visual: tono fílmico (ACES) para un acabado fotorrealista PBR ---
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- Overhaul Visual: pipeline de Bloom SELECTIVO (exclusivo del Sol) -------
    // Técnica estándar de three.js: se oscurecen temporalmente todos los objetos
    // que NO pertenecen a la capa de bloom, se renderiza solo ese resplandor en un
    // buffer aparte, y luego se compone (blend aditivo) sobre la escena normal.
    // Esto NO afecta absolutamente ningún cálculo físico ni de estado.
    const BLOOM_LAYER = 1;
    const bloomLayer = new THREE.Layers();
    bloomLayer.set(BLOOM_LAYER);
    const bloomDarkMaterial = new THREE.MeshBasicMaterial({ color: 'black' });
    const bloomMaterialsCache: Record<string, THREE.Material | THREE.Material[]> = {};

    type BloomRenderable = THREE.Object3D & {
      isMesh?: boolean; isPoints?: boolean; isSprite?: boolean;
      material: THREE.Material | THREE.Material[];
    };
    const darkenNonBloomed = (obj: THREE.Object3D) => {
      const renderable = obj as BloomRenderable;
      if ((renderable.isMesh || renderable.isPoints || renderable.isSprite) && bloomLayer.test(renderable.layers) === false) {
        bloomMaterialsCache[renderable.uuid] = renderable.material;
        renderable.material = bloomDarkMaterial;
      }
    };
    const restoreBloomedMaterial = (obj: THREE.Object3D) => {
      const renderable = obj as BloomRenderable;
      if (bloomMaterialsCache[renderable.uuid]) {
        renderable.material = bloomMaterialsCache[renderable.uuid];
        delete bloomMaterialsCache[renderable.uuid];
      }
    };

    const bloomComposer = new EffectComposer(renderer);
    bloomComposer.renderToScreen = false;
    bloomComposer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.62, 0.42, 0.38);
    bloomComposer.addPass(bloomPass);

    const mixPass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: bloomComposer.renderTarget2.texture }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D baseTexture;
          uniform sampler2D bloomTexture;
          varying vec2 vUv;
          void main() {
            vec4 base = texture2D(baseTexture, vUv);
            vec4 bloom = texture2D(bloomTexture, vUv);
            gl_FragColor = base + bloom;
          }
        `,
        defines: {}
      }),
      'baseTexture'
    );
    mixPass.needsSwap = true;

    const finalComposer = new EffectComposer(renderer);
    finalComposer.addPass(new RenderPass(scene, camera));
    finalComposer.addPass(mixPass);
    finalComposer.addPass(new OutputPass());

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 1750;
    controls.minDistance = 0.04;
    controls.target.set(0, 0, 0);

    let galaxyFly = 1;
    const galaxyCameraStart = new THREE.Vector3(), galaxyCameraEnd = new THREE.Vector3();
    galaxyJumpRef.current = () => {
      const entering = !galacticViewRef.current;
      galacticViewRef.current = entering;
      setGalacticView(entering);
      galaxyCameraStart.copy(camera.position);
      const direction = camera.position.clone().normalize();
      if (direction.lengthSq() < .01) direction.set(.35, .72, 1).normalize();
      galaxyCameraEnd.copy(direction.multiplyScalar(entering ? 1380 : 118));
      controls.target.set(0, 0, 0);
      galaxyFly = 0;
    };

    // 5. Lighting Setup
    // Glow of entire solar system (PointLight inside the Sun)
    const sunLight = new THREE.PointLight(0xffffff, 2.4, 1000);
    sunLight.decay = 0; // disable distance-based decay so its rays illuminate the farthest planets equally
    scene.add(sunLight);

    // Warm, realistic directional light to cast side-lighting shading for clear 3D forms
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.05);
    dirLight.position.set(30, 60, 30);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.38); // claridad ambiental moderada, sombreado día/noche más natural
    scene.add(ambientLight);

    // 6. Starfield Setup
    // --- Overhaul Visual: skybox esférico fijo (antes: shell con radio variable) -
    // Se mantiene EXACTAMENTE la misma lógica de distribución uniforme (theta/phi)
    // y los mismos 15000 puntos/colores; el único cambio es que ahora todos los
    // puntos viven en una ÚNICA esfera de radio fijo y enorme (muy por fuera del
    // rango navegable de la cámara, maxDistance=600, y por dentro de camera.far=4000).
    // Esto elimina el parallax/profundidad inconsistente y logra el efecto real
    // de "domo celeste" fijo, como en NASA Eyes on the Solar System.
    const starsCount = 24000;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starsCount * 3);
    const starColors = new Float32Array(starsCount * 3);
    const SKYBOX_RADIUS = 3200; // radio único y fijo de la esfera celeste

    for (let i = 0; i < starsCount; i++) {
      // Distribute uniformly on the surface of a single fixed-radius sphere (skybox)
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = SKYBOX_RADIUS;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      starPositions[i * 3] = x;
      starPositions[i * 3 + 1] = y;
      starPositions[i * 3 + 2] = z;

      // Color tints: 80% white, 10% slightly blue, 10% slightly yellow
      const colorRand = Math.random();
      if (colorRand < 0.1) {
        starColors[i * 3] = 0.54; // subtle blue-white
        starColors[i * 3 + 1] = 0.63;
        starColors[i * 3 + 2] = 0.78;
      } else if (colorRand < 0.2) {
        starColors[i * 3] = 0.78; // subtle warm star
        starColors[i * 3 + 1] = 0.65;
        starColors[i * 3 + 2] = 0.48;
      } else {
        const luminosity = .42 + Math.random() * .35;
        starColors[i * 3] = luminosity;
        starColors[i * 3 + 1] = luminosity;
        starColors[i * 3 + 2] = luminosity * 1.04;
      }
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMaterial = new THREE.PointsMaterial({
      size: 1.05, // campo fino: intriga y profundidad sin puntos blancos invasivos
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity: 0.46,
      depthWrite: false
    });

    const starfield = new THREE.Points(starGeometry, starMaterial);
    starfield.renderOrder = -1;
    scene.add(starfield);

    // Nivel galáctico: plano físico fijo, no una cartelera que siga a la cámara.
    // La geometría se traslada para que el marcador "Sun" de la lámina coincida
    // con el origen real; OrbitControls permite verla de frente, oblicua o de canto.
    const galaxyTexture = new THREE.TextureLoader().load(assetUrl('/assets/nasa/milky-way-and-our-location.jpg'));
    galaxyTexture.colorSpace = THREE.SRGBColorSpace;
    const galaxyMaterial = new THREE.MeshBasicMaterial({ map: galaxyTexture, transparent: true, opacity: 0, depthWrite: false, depthTest: false, toneMapped: false, side: THREE.DoubleSide });
    const GALAXY_SIZE = 1420;
    const galaxyGeometry = new THREE.PlaneGeometry(GALAXY_SIZE, GALAXY_SIZE);
    galaxyGeometry.translate(-(.524 - .5) * GALAXY_SIZE, -(.31 - .5) * GALAXY_SIZE, 0);
    galaxyGeometry.rotateX(-Math.PI / 2);
    const galaxyPlane = new THREE.Mesh(galaxyGeometry, galaxyMaterial);
    galaxyPlane.renderOrder = -2;
    galaxyPlane.visible = false;
    galaxyPlane.frustumCulled = false;
    scene.add(galaxyPlane);

    // 7. Sun and Pulsing Corona
    const sunGeom = new THREE.SphereGeometry(3.5, 48, 48);
    // --- Overhaul Visual: material fotorrealista del Sol, no afectado por tone-mapping
    // para garantizar que siempre cruce el umbral de brillo del Bloom selectivo ---
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff1c2 });
    sunMat.toneMapped = false;
    const sunMesh = new THREE.Mesh(sunGeom, sunMat);
    sunMesh.layers.enable(BLOOM_LAYER);
    scene.add(sunMesh);

    // Corona Sphere
    const coronaGeom = new THREE.SphereGeometry(4.2, 48, 48);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0xff8800,
      transparent: true,
      opacity: 0.20,
      side: THREE.BackSide
    });
    coronaMat.toneMapped = false;
    const coronaMesh = new THREE.Mesh(coronaGeom, coronaMat);
    coronaMesh.layers.enable(BLOOM_LAYER);
    scene.add(coronaMesh);
    sunCoronaRef.current = coronaMesh;

    // 7.05 Halo exterior adicional del Sol — capa extra de resplandor cálido
    // (puramente decorativa, alimenta el Bloom para un "glow" más amplio y suave)
    const sunHaloGeom = new THREE.SphereGeometry(5.4, 48, 48);
    const sunHaloMat = new THREE.MeshBasicMaterial({
      color: 0xffae42,
      transparent: true,
      opacity: 0.09,
      side: THREE.BackSide,
      depthWrite: false
    });
    sunHaloMat.toneMapped = false;
    const sunHaloMesh = new THREE.Mesh(sunHaloGeom, sunHaloMat);
    sunHaloMesh.layers.enable(BLOOM_LAYER);
    scene.add(sunHaloMesh);

    // 7.1 Collision Explosion Mesh (hidden initially)
    const explosionGeom = new THREE.SphereGeometry(1.0, 32, 32);
    const explosionMat = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide
    });
    const explosionMesh = new THREE.Mesh(explosionGeom, explosionMat);
    scene.add(explosionMesh);
    collisionExplosionRef.current = explosionMesh;
    explosionMesh.visible = false;

    // 8. Planets & Atmospheric spheres
    // --- Overhaul Visual: utilidades del motor de render (100% visuales) -------
    const textureLoader = new THREE.TextureLoader();

    // Genera una atmósfera tipo Fresnel/Glow (resplandor de borde) — usada en
    // planetas con atmósfera densa (Tierra, Venus). Es un mesh BackSide adicional
    // que se añade como hijo del planeta, por lo que hereda automáticamente su
    // posición y escala sin necesidad de tocar el loop de animación/física.
    const createFresnelAtmosphere = (radius: number, colorHex: string) => {
      const atmGeom = new THREE.SphereGeometry(radius * 1.12, 48, 48);
      const atmMat = new THREE.ShaderMaterial({
        uniforms: {
          glowColor: { value: new THREE.Color(colorHex) }
        },
        vertexShader: `
          varying vec3 vNormalView;
          void main() {
            vNormalView = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 glowColor;
          varying vec3 vNormalView;
          void main() {
            float rim = pow(0.62 - max(dot(vNormalView, vec3(0.0, 0.0, 1.0)), 0.0), 3.4);
            gl_FragColor = vec4(glowColor, rim * 0.45);
          }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending
      });
      atmMat.toneMapped = false;
      const atmMesh = new THREE.Mesh(atmGeom, atmMat);
      atmMesh.renderOrder = 2;
      return atmMesh;
    };

    // Genera un degradado de color por vértice para que las líneas orbitales
    // (Line2/LineMaterial) se "desvanezcan" elegantemente — puramente decorativo,
    // no representa ninguna magnitud física.
    const buildOrbitGradientColors = (numPoints: number, baseColor: THREE.Color) => {
      const colors: number[] = [];
      for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        // Pulso suave: más intenso cerca del perihelio (t≈0/1), más tenue en el afelio (t≈0.5)
        const fade = 0.45 + 0.55 * Math.pow(Math.abs(Math.cos(t * Math.PI)), 1.4);
        colors.push(baseColor.r * fade, baseColor.g * fade, baseColor.b * fade);
      }
      return colors;
    };

    // --- Overhaul: relieve procedural real (desplazamiento de vértices) ------
    // Da volumen geométrico genuino a cuerpos rocosos sin atmósfera densa
    // (Mercurio, Marte, lunas): no es una textura, son vértices físicamente
    // desplazados, por lo que la luz/sombra reacciona de forma realista.
    // Puramente visual — nunca toca masa, radio orbital ni ningún cálculo.
    const applyProceduralRelief = (geometry: THREE.BufferGeometry, amplitude: number, seed: number) => {
      const posAttr = geometry.attributes.position;
      const v = new THREE.Vector3();
      for (let i = 0; i < posAttr.count; i++) {
        v.fromBufferAttribute(posAttr, i);
        const len = v.length();
        const dir = v.clone().normalize();
        const n =
          Math.sin(dir.x * 6.0 + seed) * Math.cos(dir.y * 5.0 + seed * 1.3) * 0.5 +
          Math.sin(dir.y * 11.0 + seed * 0.7) * Math.cos(dir.z * 9.0 + seed * 2.1) * 0.3 +
          Math.sin(dir.z * 17.0 + seed * 1.9) * Math.cos(dir.x * 13.0 + seed * 0.4) * 0.2;
        v.copy(dir.multiplyScalar(len + n * amplitude));
        posAttr.setXYZ(i, v.x, v.y, v.z);
      }
      posAttr.needsUpdate = true;
      geometry.computeVertexNormals();
    };
    // Semilla determinística por nombre de planeta, para que el relieve sea
    // estable entre renders (no cambia aleatoriamente cada vez que se monta).
    const reliefSeedFor = (name: string) => {
      let h = 0;
      for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 1000;
      return h * 0.01;
    };

    // --- Overhaul Visual: anillo planetario con textura real (radial) --------
    // RingGeometry mapea su UV por ángulo, no por radio — aquí se remapea el
    // eje U a la posición radial (0=borde interno, 1=borde externo) para que
    // la franja de textura del anillo (NASA/ofrohn) se vea correctamente.
    const createPlanetRing = (radius: number, innerMult: number, outerMult: number, texturePath: string, fallbackColor: number, tiltRad: number) => {
      const inner = radius * innerMult;
      const outer = radius * outerMult;
      const ringGeom = new THREE.RingGeometry(inner, outer, 96, 1);
      const pos = ringGeom.attributes.position;
      const uvs: number[] = [];
      const v3 = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v3.set(pos.getX(i), pos.getY(i), pos.getZ(i));
        const factor = THREE.MathUtils.clamp((v3.length() - inner) / (outer - inner), 0, 1);
        uvs.push(factor, 0.5);
      }
      ringGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

      const ringMat = new THREE.MeshStandardMaterial({
        color: fallbackColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        roughness: 0.85,
        metalness: 0.0,
        depthWrite: false
      });
      textureLoader.load(texturePath, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        ringMat.map = tex;
        ringMat.alphaMap = tex;
        ringMat.color.set(0xffffff);
        ringMat.needsUpdate = true;
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.rotation.x = tiltRad;
      ringMesh.renderOrder = 1;
      return ringMesh;
    };

    planets.forEach(p => {
      const modifier = planetModifiersRef.current[p.name] || { massMultiplier: 1, eccentricity: p.eccentricity, semiMajorAxisMultiplier: 1, radiusMultiplier: 1 };
      const scaleRadius = VISUAL_SCALE.sizes[p.name] * modifier.radiusMultiplier;

      // Base planetary core
      const geom = new THREE.SphereGeometry(scaleRadius, 64, 64);
      // --- Overhaul Visual: relieve procedural real (genuino "más 3D") --------
      // Cuerpos rocosos sin atmósfera (Mercurio, Marte): relieve marcado.
      // Cuerpos rocosos con atmósfera (Tierra, Venus): relieve sutil (cubierto
      // por nubes/bruma). Gigantes gaseosos: sin relieve (son fluidos, no
      // tienen terreno sólido — aplicar relieve sería físicamente incorrecto).
      const ROCKY_BARE = new Set(['mercury', 'mars']);
      const ROCKY_ATMO = new Set(['earth', 'venus']);
      if (ROCKY_BARE.has(p.name)) {
        applyProceduralRelief(geom, scaleRadius * 0.05, reliefSeedFor(p.name));
      } else if (ROCKY_ATMO.has(p.name)) {
        applyProceduralRelief(geom, scaleRadius * 0.018, reliefSeedFor(p.name));
      }
      // --- Overhaul Visual: MeshStandardMaterial (PBR) en vez de Phong --------
      // Preparado para recibir texturas de alta resolución (diffuse/normal/roughness)
      // vía el campo opcional `textures` de PhysicalData. Sin texturas asignadas,
      // usa un acabado PBR basado en color como fallback fotorrealista.
      // --- Overhaul: la Tierra usa un ShaderMaterial propio día/noche con luces
      // de ciudades reales (NASA) visibles del lado oscuro — el resto de los
      // planetas sigue exactamente igual (MeshStandardMaterial estándar). ------
      let mat: THREE.Material;
      let earthUniforms: { sunDirection: { value: THREE.Vector3 }; dayMap: { value: THREE.Texture | null }; nightMap: { value: THREE.Texture | null } } | null = null;

      if (p.name === 'earth') {
        earthUniforms = {
          sunDirection: { value: new THREE.Vector3(1, 0, 0) },
          dayMap: { value: null },
          nightMap: { value: null }
        };
        const earthShaderMat = new THREE.ShaderMaterial({
          uniforms: earthUniforms,
          vertexShader: `
            varying vec3 vNormalW;
            varying vec2 vUv;
            void main() {
              vNormalW = normalize(mat3(modelMatrix) * normal);
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform sampler2D dayMap;
            uniform sampler2D nightMap;
            uniform vec3 sunDirection;
            varying vec3 vNormalW;
            varying vec2 vUv;
            void main() {
              float intensity = dot(normalize(vNormalW), normalize(sunDirection));
              // Transición suave del terminador día/noche (no un corte duro)
              float dayFactor = smoothstep(-0.18, 0.22, intensity);
              vec3 dayColor = texture2D(dayMap, vUv).rgb;
              vec3 nightColor = texture2D(nightMap, vUv).rgb;
              // Las luces de ciudad solo se notan del lado oscuro, y se atenúan
              // suavemente entrando ya en zona diurna para evitar un borde brusco.
              vec3 nightGlow = nightColor * 1.8 * (1.0 - smoothstep(-0.18, 0.05, intensity));
              vec3 color = dayColor * dayFactor + nightGlow;
              gl_FragColor = vec4(color, 1.0);
            }
          `
        });
        mat = earthShaderMat;
        earthShaderUniformsRef.current = { sunDirection: earthUniforms.sunDirection };
      } else {
        mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(p.color),
          roughness: p.roughness ?? 0.78,
          metalness: p.metalness ?? 0.04,
          emissive: new THREE.Color(p.emissive),
          emissiveIntensity: 0.10
        });
      }

      if (p.textures?.map) {
        textureLoader.load(p.textures.map, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
          if (earthUniforms) {
            earthUniforms.dayMap.value = tex;
          } else {
            (mat as THREE.MeshStandardMaterial).map = tex;
          }
          mat.needsUpdate = true;
        });
      }
      if (p.textures?.nightLightsMap && earthUniforms) {
        textureLoader.load(p.textures.nightLightsMap, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
          earthUniforms!.nightMap.value = tex;
          mat.needsUpdate = true;
        });
      }
      if (p.textures?.normalMap && !earthUniforms) {
        textureLoader.load(p.textures.normalMap, (tex) => {
          tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
          (mat as THREE.MeshStandardMaterial).normalMap = tex;
          mat.needsUpdate = true;
        });
      }
      if (p.textures?.roughnessMap && !earthUniforms) {
        textureLoader.load(p.textures.roughnessMap, (tex) => {
          tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
          (mat as THREE.MeshStandardMaterial).roughnessMap = tex;
          mat.needsUpdate = true;
        });
      }
      // --- Overhaul Visual: mapa de relieve simple (bump) opcional --------
      if (p.textures?.bumpMap && !earthUniforms) {
        textureLoader.load(p.textures.bumpMap, (tex) => {
          tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
          (mat as THREE.MeshStandardMaterial).bumpMap = tex;
          (mat as THREE.MeshStandardMaterial).bumpScale = scaleRadius * 0.04;
          mat.needsUpdate = true;
        });
      }
      const pMesh = new THREE.Mesh(geom, mat);
      pMesh.castShadow = true;
      pMesh.receiveShadow = true;
      scene.add(pMesh);
      meshesRef.current[p.name] = pMesh;

      // Atmospheric clouds — usa cloudsMap real cuando está disponible (Tierra)
      if (p.textures?.cloudsMap) {
        const cloudGeom = new THREE.SphereGeometry(scaleRadius * 1.015, 48, 48);
        const cloudMat = new THREE.MeshStandardMaterial({
          transparent: true,
          opacity: 0.55,
          roughness: 1.0,
          metalness: 0.0,
          depthWrite: false
        });
        textureLoader.load(p.textures.cloudsMap, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
          cloudMat.map = tex;
          cloudMat.alphaMap = tex;
          cloudMat.needsUpdate = true;
        });
        const cloudMesh = new THREE.Mesh(cloudGeom, cloudMat);
        scene.add(cloudMesh);
        atmosphereMeshesRef.current[p.name] = cloudMesh;
      } else if (p.name === 'earth') {
        // Fallback decorativo si no hubiese cloudsMap disponible
        const cloudGeom = new THREE.SphereGeometry(scaleRadius * 1.04, 32, 32);
        const cloudMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.3,
          roughness: 1.0,
          metalness: 0.0,
          blending: THREE.AdditiveBlending
        });
        const cloudMesh = new THREE.Mesh(cloudGeom, cloudMat);
        scene.add(cloudMesh);
        atmosphereMeshesRef.current['earth'] = cloudMesh;
      }

      // --- Overhaul Visual: halo atmosférico Fresnel (Tierra y Venus) -----------
      // Mesh adicional, hijo directo del planeta: hereda posición/escala sin
      // requerir cambios en el loop de física/animación.
      if (p.hasAtmosphere) {
        const fresnelGlow = createFresnelAtmosphere(scaleRadius, p.atmosphereColor || '#6db8ff');
        pMesh.add(fresnelGlow);
      }

      // Orbital ellipse rings (Line loops visually offsetted to keep Sun at foci)
      const visualMajor = VISUAL_SCALE.distances[p.name] * modifier.semiMajorAxisMultiplier;
      const visualEccentricity = modifier.eccentricity;
      const visualMinor = visualMajor * Math.sqrt(1 - visualEccentricity * visualEccentricity);
      const visualFocalOffset = visualMajor * visualEccentricity;

      const curve = new THREE.EllipseCurve(
        -visualFocalOffset, 0, // center x, y offset to Kepler foci
        visualMajor, visualMinor,
        0, 2.0 * Math.PI,
        false, 0
      );

      // --- Overhaul Visual: línea orbital premium (Line2/LineMaterial) ----------
      // Reemplaza THREE.Line/LineBasicMaterial por geometría de líneas "gruesas"
      // en espacio de pantalla: antialiasing real independiente del SO/navegador,
      // grosor constante en píxeles, y un degradado de color que se desvanece
      // elegantemente alrededor de la órbita (puramente decorativo).
      const pointsCoords = curve.getPoints(180);
      const orbitPositions: number[] = [];
      const orbitIncRad = ((p.orbitalInclination || 0) * Math.PI) / 180;
      pointsCoords.forEach(pt => orbitPositions.push(
        pt.x,
        pt.y * Math.sin(orbitIncRad),
        pt.y * Math.cos(orbitIncRad)
      ));

      const orbitGeometry = new LineGeometry();
      orbitGeometry.setPositions(orbitPositions);
      const isSelectedInit = selectedPlanetRef.current === p.name;
      orbitGeometry.setColors(
        buildOrbitGradientColors(pointsCoords.length - 1, new THREE.Color(0xffffff))
      );

      const orbitMat = new LineMaterial({
        linewidth: isSelectedInit ? 1.5 : 0.9,
        transparent: true,
        opacity: isSelectedInit ? 0.75 : 0.22,
        vertexColors: true,
        worldUnits: false,
        alphaToCoverage: true,
        dashed: false
      });
      orbitMat.resolution.set(width, height);

      const orbitLine = new Line2(orbitGeometry, orbitMat);
      orbitLine.computeLineDistances();
      scene.add(orbitLine);
      orbitLinesRef.current[p.name] = orbitLine;

      // --- Overhaul Visual: anillos reales (textura NASA) para los 4 gigantes -
      if (p.name === 'saturn' && p.textures?.ringMap) {
        const ringMesh = createPlanetRing(scaleRadius, VISUAL_SCALE.saturnRings.inner, VISUAL_SCALE.saturnRings.outer, p.textures.ringMap, 0xc9b27a, Math.PI / 2.3);
        pMesh.add(ringMesh);
      }

      if (p.name === 'uranus' && p.textures?.ringMap) {
        const ringMesh = createPlanetRing(scaleRadius, VISUAL_SCALE.uranusRings.inner, VISUAL_SCALE.uranusRings.outer, p.textures.ringMap, 0x9fcfd6, Math.PI / 6.0);
        pMesh.add(ringMesh);
      }

      if (p.name === 'jupiter' && p.textures?.ringMap) {
        const ringMesh = createPlanetRing(scaleRadius, VISUAL_SCALE.jupiterRings.inner, VISUAL_SCALE.jupiterRings.outer, p.textures.ringMap, 0xb0a08c, Math.PI / 2.15);
        (ringMesh.material as THREE.MeshStandardMaterial).opacity = 0.4; // anillo joviano es extremadamente tenue
        pMesh.add(ringMesh);
      }

      if (p.name === 'neptuno' && p.textures?.ringMap) {
        const ringMesh = createPlanetRing(scaleRadius, VISUAL_SCALE.neptuneRings.inner, VISUAL_SCALE.neptuneRings.outer, p.textures.ringMap, 0x6f93a8, Math.PI / 2.2);
        (ringMesh.material as THREE.MeshStandardMaterial).opacity = 0.55;
        pMesh.add(ringMesh);
      }

      // Moons creation
      if (p.moons.length > 0) {
        const pMoons: THREE.Mesh[] = [];
        p.moons.forEach(m => {
          const moonGeom = new THREE.SphereGeometry(m.radius, 32, 32);
          applyProceduralRelief(moonGeom, m.radius * 0.06, reliefSeedFor(p.name + m.color));
          const moonMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(m.color), roughness: 0.92, metalness: 0.03 });
          if (m.textures?.map) {
            textureLoader.load(m.textures.map, (tex) => {
              tex.colorSpace = THREE.SRGBColorSpace;
              moonMat.map = tex;
              moonMat.color.set(0xffffff);
              moonMat.needsUpdate = true;
            });
          }
          if (m.textures?.bumpMap) {
            textureLoader.load(m.textures.bumpMap, (tex) => {
              moonMat.bumpMap = tex;
              moonMat.bumpScale = m.radius * 0.05;
              moonMat.needsUpdate = true;
            });
          }
          const mMesh = new THREE.Mesh(moonGeom, moonMat);
          mMesh.name = m.name;
          mMesh.userData.isMoon = true;
          mMesh.userData.parentPlanet = p.name;
          mMesh.castShadow = true;
          mMesh.receiveShadow = true;
          
          // Added as child to planet to simplify local revolving coordinate transform!
          pMesh.add(mMesh);
          pMoons.push(mMesh);
        });
        moonsMeshesRef.current[p.name] = pMoons;
      }

      // Initialize Planetary Historical Orbital Trails
      const trailPositions: number[] = [];
      const trailGeometry = new THREE.BufferGeometry();
      const initialPositions = new Float32Array(200 * 3); // 200 position points limit
      trailGeometry.setAttribute('position', new THREE.BufferAttribute(initialPositions, 3));

      // Gradient color fade array
      const colorArr = new Float32Array(200 * 3);
      const planetBaseColor = new THREE.Color(p.color);
      for (let idx = 0; idx < 200; idx++) {
        // fade intensity from 100% to 0%
        const intensity = 1.0 - idx / 200;
        const fadedColor = planetBaseColor.clone().multiplyScalar(intensity);
        colorArr[idx * 3] = fadedColor.r;
        colorArr[idx * 3 + 1] = fadedColor.g;
        colorArr[idx * 3 + 2] = fadedColor.b;
      }
      trailGeometry.setAttribute('color', new THREE.BufferAttribute(colorArr, 3));

      const trailMat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        linewidth: 1.5
      });

      const trailLine = new THREE.Line(trailGeometry, trailMat);
      scene.add(trailLine);
      trailLinesRef.current[p.name] = trailLine;
      trailGeometriesRef.current[p.name] = { geometry: trailGeometry, positions: trailPositions };

      // Initialize base position angle
      angleOfPlanetsRef.current[p.name] = Math.random() * Math.PI * 2;
    });

    // --- Overhaul: Cinturón Principal de Asteroides (Marte-Júpiter) ----------
    // Región real: 2.1–3.3 AU. Cada roca recibe su PROPIO semieje real (AU) y,
    // por lo tanto, su propio período kepleriano T = a^1.5 (años) — exactamente
    // la misma 3ª Ley de Kepler que usan los 8 planetas, no una rotación en
    // bloque falsa. Se renderiza con un único InstancedMesh (~2200 rocas en
    // una sola llamada de dibujo) para que el costo de rendimiento sea mínimo.
    {
      const ASTEROID_COUNT = 2200;
      const marsRealAU = planets.find(pl => pl.name === 'mars')!.semiMajorAxis;
      const jupiterRealAU = planets.find(pl => pl.name === 'jupiter')!.semiMajorAxis;
      const marsVisual = VISUAL_SCALE.distances['mars'];
      const jupiterVisual = VISUAL_SCALE.distances['jupiter'];

      const asteroidGeom = new THREE.IcosahedronGeometry(1, 0);
      applyProceduralRelief(asteroidGeom, 0.45, 3.1);
      const asteroidMat = new THREE.MeshStandardMaterial({ color: 0x8a7f73, roughness: 0.96, metalness: 0.04 });
      const asteroidBelt = new THREE.InstancedMesh(asteroidGeom, asteroidMat, ASTEROID_COUNT);
      asteroidBelt.frustumCulled = false;

      type AsteroidDatum = { radius: number; angle: number; angularSpeed: number; yOff: number; scale: number; spinAxis: THREE.Vector3; spinSpeed: number };
      const beltData: AsteroidDatum[] = [];
      const m4 = new THREE.Matrix4();
      const q4 = new THREE.Quaternion();
      const v4 = new THREE.Vector3();
      const s4 = new THREE.Vector3();

      for (let i = 0; i < ASTEROID_COUNT; i++) {
        const realAU = 2.1 + Math.random() * 1.2; // cinturón real: 2.1 a 3.3 AU
        const orbitalPeriodYears = Math.pow(realAU, 1.5); // Kepler exacto (3ª Ley)
        const t = (realAU - marsRealAU) / (jupiterRealAU - marsRealAU);
        const visualR = marsVisual + t * (jupiterVisual - marsVisual);
        const baseAngularSpeed = (2 * Math.PI) / (orbitalPeriodYears * 120); // misma convención visual que los planetas

        const angle = Math.random() * Math.PI * 2;
        const yOff = (Math.random() - 0.5) * 2.4; // dispersión vertical (inclinaciones reales variadas)
        const scale = 0.05 + Math.random() * 0.17;
        const spinAxis = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
        const spinSpeed = (Math.random() - 0.5) * 3.5;

        beltData.push({ radius: visualR, angle, angularSpeed: baseAngularSpeed, yOff, scale, spinAxis, spinSpeed });

        v4.set(Math.cos(angle) * visualR, yOff, Math.sin(angle) * visualR);
        s4.set(scale, scale, scale);
        q4.random();
        m4.compose(v4, q4, s4);
        asteroidBelt.setMatrixAt(i, m4);
      }
      asteroidBelt.instanceMatrix.needsUpdate = true;
      scene.add(asteroidBelt);
      asteroidBeltRef.current = { mesh: asteroidBelt, data: beltData };
    }

    // 9. Comets Setup
    // --- Overhaul: núcleo con resplandor real en vez de esfera blanca plana --
    const cometGeom = new THREE.SphereGeometry(0.22, 16, 16);
    const cometMat = new THREE.MeshBasicMaterial({ color: 0xddeeff });
    cometMat.toneMapped = false;
    const cometMesh = new THREE.Mesh(cometGeom, cometMat);
    cometMesh.layers.enable(BLOOM_LAYER);
    scene.add(cometMesh);
    cometMeshRef.current = cometMesh;
    cometMesh.visible = false;

    const cometGlowGeom = new THREE.SphereGeometry(0.55, 16, 16);
    const cometGlowMat = new THREE.MeshBasicMaterial({
      color: 0x9fd8ff,
      transparent: true,
      opacity: 0.4,
      side: THREE.BackSide,
      depthWrite: false
    });
    cometGlowMat.toneMapped = false;
    const cometGlowMesh = new THREE.Mesh(cometGlowGeom, cometGlowMat);
    cometGlowMesh.layers.enable(BLOOM_LAYER);
    scene.add(cometGlowMesh);
    cometGlowRef.current = cometGlowMesh;
    cometGlowMesh.visible = false;

    // Comet trail
    const cometTrailGeom = new THREE.BufferGeometry();
    const cometTrailMax = 150;
    const cometTrailInitArray = new Float32Array(cometTrailMax * 3);
    cometTrailGeom.setAttribute('position', new THREE.BufferAttribute(cometTrailInitArray, 3));
    
    // Gradient blue/white tail
    const cometColors = new Float32Array(cometTrailMax * 3);
    for (let idx = 0; idx < cometTrailMax; idx++) {
      const alpha = 1.0 - idx / cometTrailMax;
      cometColors[idx * 3] = alpha * 0.4; // icy cyan base
      cometColors[idx * 3 + 1] = alpha * 0.9;
      cometColors[idx * 3 + 2] = 1.0;
    }
    cometTrailGeom.setAttribute('color', new THREE.BufferAttribute(cometColors, 3));

    const cometTrailMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9
    });

    const cometTrailLine = new THREE.Line(cometTrailGeom, cometTrailMat);
    scene.add(cometTrailLine);
    cometTrailRef.current = cometTrailLine;
    cometTrailLine.visible = false;

    // 10. Gravity Field Overlay (Plane Geometry with dynamic gradient heights)
    const gridSegments = 60;
    const gravityGeom = new THREE.PlaneGeometry(160, 160, gridSegments, gridSegments);
    gravityGeom.rotateX(-Math.PI / 2); // align horizontally with ecliptic plane

    // Assign vertex colors proportional to Sol gravitational field: V(r) = -1/r
    const colors = [];
    const positionAttr = gravityGeom.attributes.position;
    for (let i = 0; i < positionAttr.count; i++) {
      const x = positionAttr.getX(i);
      const z = positionAttr.getZ(i); // it was rotated so coordinates reflect horizontal spacing
      const r = Math.sqrt(x * x + z * z);
      
      // Potential function value representation
      const intensity = Math.min(1.0, 4.5 / (r + 1)); // near Sol hyper-intensive blue/purple
      const c = new THREE.Color();
      c.setHSL(0.55 + intensity * 0.35, 1.0, 0.15 + intensity * 0.35); // gradient cyan to dark blue
      colors.push(c.r, c.g, c.b);
    }
    gravityGeom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const gravityMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.2,
      wireframe: true
    });
    const gravityMesh = new THREE.Mesh(gravityGeom, gravityMat);
    scene.add(gravityMesh);
    gravityGridRef.current = gravityMesh;
    gravityMesh.position.y = -0.1; // slightly below flat orbital paths

    // 11. Ecliptic Grid Helper
    const eclipticGrid = new THREE.GridHelper(220, 44, 0x5a5a5a, 0x16181c);
    eclipticGrid.position.y = -0.15;
    scene.add(eclipticGrid);
    eclipticGridRef.current = eclipticGrid;

    // 12. Interactive Raycaster Click Handler for planet selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleCanvasClick = (event: MouseEvent) => {
      if (!rendererRef.current) return;
      // Get click position relative to canvas bounds
      const rect = rendererRef.current.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);

      // Check intersect against planetary meshes AND lunas (children con userData.isMoon)
      const targetMeshes = Object.entries(meshesRef.current).map(([name, mesh]) => ({ name, mesh }));
      const moonMeshes: { name: string; mesh: THREE.Object3D; parentPlanet: string }[] = [];
      targetMeshes.forEach(({ mesh }) => {
        mesh.children.forEach(child => {
          if (child.userData?.isMoon) {
            moonMeshes.push({ name: child.name, mesh: child, parentPlanet: child.userData.parentPlanet });
          }
        });
      });
      const allTargets = [...targetMeshes.map(t => t.mesh as THREE.Object3D), ...moonMeshes.map(m => m.mesh)];
      const intersects = raycaster.intersectObjects(allTargets, false);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        const matchedMoon = moonMeshes.find(mm => mm.mesh === hitMesh);
        if (matchedMoon) {
          onSelectMoonRef.current?.(matchedMoon.name, matchedMoon.parentPlanet);
          return;
        }
        const matched = targetMeshes.find(tm => tm.mesh === hitMesh);
        if (matched) {
          onSelectPlanetRef.current(matched.name);
        }
      }
    };

    renderer.domElement.addEventListener('click', handleCanvasClick);

    // Track mouse hover to show floating tooltips
    const handleMouseMove = (event: MouseEvent) => {
      if (!rendererRef.current) return;
      const rect = rendererRef.current.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const targetMeshes = Object.entries(meshesRef.current).map(([name, mesh]) => ({ name, mesh }));
      const moonMeshes: { name: string; mesh: THREE.Object3D }[] = [];
      targetMeshes.forEach(({ mesh }) => {
        mesh.children.forEach(child => {
          if (child.userData?.isMoon) moonMeshes.push({ name: child.name, mesh: child });
        });
      });
      const allTargets = [...targetMeshes.map(t => t.mesh as THREE.Object3D), ...moonMeshes.map(m => m.mesh)];
      const intersects = raycaster.intersectObjects(allTargets, false);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        const matchedMoon = moonMeshes.find(mm => mm.mesh === hitMesh);
        if (matchedMoon) {
          setHoveredPlanetRef.current(matchedMoon.name);
          return;
        }
        const matched = targetMeshes.find(tm => tm.mesh === hitMesh);
        if (matched) {
          setHoveredPlanetRef.current(matched.name);
          return;
        }
      }
      setHoveredPlanetRef.current(null);
    };

    renderer.domElement.addEventListener('mousemove', handleMouseMove);

    // 13. High FPS Animate loop
    let lastTime = 0;
    let animeFrameId = 0;

    const animate = (timestamp: number) => {
      animeFrameId = requestAnimationFrame(animate);

      if (!lastTime) lastTime = timestamp;
      const deltaSec = (timestamp - lastTime) / 1000;
      lastTime = timestamp;

      // Update simulation time if playing
      const simulatedDeltaDays = isPausedRef.current ? 0 : deltaSec * speedRef.current * 1.5; // scaled speed days
      if (simulatedDeltaDays > 0) {
        onUpdateSimulatedTimeRef.current(simulatedDeltaDays);
        timeRef.current += simulatedDeltaDays;
      }

      const tSim = timeRef.current;

      // Animate solar corona pulsing
      if (sunCoronaRef.current) {
        const pulseRatio = 1.0 + Math.sin(timestamp * 0.003) * 0.06;
        sunCoronaRef.current.scale.set(pulseRatio, pulseRatio, pulseRatio);
      }

      // Animate planets
      planets.forEach(p => {
        const pMesh = meshesRef.current[p.name];
        if (!pMesh) return;

        const modifier = planetModifiersRef.current[p.name] || { massMultiplier: 1, eccentricity: p.eccentricity, semiMajorAxisMultiplier: 1, radiusMultiplier: 1 };
        
        // Dynamic scales apply (incorporating global planet size scale factor and professional adaptive viewport scale)
        const baseR = VISUAL_SCALE.sizes[p.name] * modifier.radiusMultiplier * (globalPlanetSizeRef.current || 1.0);
        const distToCam = camera.position.distanceTo(pMesh.position);
        
        // Ensure planets never shrink below an eye-safe visual threshold from orbit zoom levels
        const adaptiveR = Math.max(baseR, distToCam * 0.015);
        pMesh.scale.set(adaptiveR / VISUAL_SCALE.sizes[p.name], adaptiveR / VISUAL_SCALE.sizes[p.name], adaptiveR / VISUAL_SCALE.sizes[p.name]);

        // Orbit parameter models
        const visualMajor = VISUAL_SCALE.distances[p.name] * modifier.semiMajorAxisMultiplier;
        const visualEccentricity = modifier.eccentricity;
        const visualMinor = visualMajor * Math.sqrt(1 - visualEccentricity * visualEccentricity);
        const visualFocalOffset = visualMajor * visualEccentricity;

        // Visual position angle θ (True Arcs based on Kepler's simplified orbital speeds)
        // Kepler angular velocity: dθ/dt = L_z / (r^2) -> speed gets faster at perihelion!
        // We simulate this angle updates
        if (!isPausedRef.current) {
          // Angular step is proportional to Kepler speed relation
          // Base angular speed inverse to period
          const baseAngularSpeed = (2 * Math.PI) / (p.orbitalPeriod * 120); // visual time tuning
          // Current radius indicator
          const currAngle = angleOfPlanetsRef.current[p.name];
          const relativeRadius = (1 - visualEccentricity * visualEccentricity) / (1 + visualEccentricity * Math.cos(currAngle));
          // Kepler second law: speed proportional to 1/r^2
          const speedFactor = 1 / (relativeRadius * relativeRadius);
          angleOfPlanetsRef.current[p.name] += baseAngularSpeed * speedFactor * speedRef.current * deltaSec;
        }

        const theta = angleOfPlanetsRef.current[p.name];

        let posX = 0;
        let posZ = 0;

        if (comparisonModeRef.current) {
          // Comparison Mode: aligned in file flat line to compare size visually
          const spacingFactor = 8.5;
          const index = planets.findIndex(pl => pl.name === p.name);
          posX = 7 + index * spacingFactor;
          posZ = 0;
        } else {
          // Dynamic Kepler ellipse orbits
          // x = a * cos(theta) - c
          // z = b * sin(theta)
          const radiusVisual = (visualMajor * (1 - visualEccentricity * visualEccentricity)) / (1 + visualEccentricity * Math.cos(theta));
          posX = radiusVisual * Math.cos(theta) - visualFocalOffset;
          posZ = radiusVisual * Math.sin(theta);
        }

        const posY = 0;

        // --- Overhaul: inclinación orbital (plano de la órbita respecto a la
        // eclíptica). Con inclinación 0° (todos los 8 planetas principales)
        // esto es un no-op exacto: newY=0, newZ=posZ, igual que siempre. -----
        let finalPosX = posX;
        let finalPosY = posY;
        let finalPosZ = posZ;
        if (p.orbitalInclination && !comparisonModeRef.current) {
          const incRad = (p.orbitalInclination * Math.PI) / 180;
          finalPosY = posZ * Math.sin(incRad);
          finalPosZ = posZ * Math.cos(incRad);
        }

        // Axial tilts rotations: Tierra 23.4°, Saturn 26.7°, Uranus 97.8°
        const rotRad = (p.axialTilt * Math.PI) / 180;
        pMesh.rotation.z = rotRad;

        // Rotate on its own axis (planetary days periods)
        const dayRotSpeed = (2 * Math.PI) / (Math.abs(p.rotationPeriod) * 10 || 1.0); // day scaling
        if (!isPausedRef.current) {
          pMesh.rotation.y += dayRotSpeed * speedRef.current * deltaSec * (p.rotationPeriod < 0 ? -1 : 1);
        }

        // Apply visual coordinates
        pMesh.position.set(finalPosX, finalPosY, finalPosZ);

        // --- Overhaul: actualizar dirección al Sol para el shader día/noche --
        if (p.name === 'earth' && earthShaderUniformsRef.current) {
          earthShaderUniformsRef.current.sunDirection.value
            .set(-finalPosX, -finalPosY, -finalPosZ)
            .normalize();
        }

        // Atmosphere visual spin
        if (p.name === 'earth' && atmosphereMeshesRef.current['earth']) {
          const cloud = atmosphereMeshesRef.current['earth'];
          cloud.position.copy(pMesh.position);
          cloud.scale.copy(pMesh.scale);
          cloud.rotation.y += 0.05 * speedRef.current * deltaSec;
        }

        // Selected orbital path highlights
        const orbitLine = orbitLinesRef.current[p.name];
        if (orbitLine) {
          orbitLine.visible = togglesRef.current.orbits && !comparisonModeRef.current;
          // Redraw ellipse curve dynamically to handle live manipulation!
          const curvePos = new THREE.EllipseCurve(
            -visualFocalOffset, 0,
            visualMajor, visualMinor,
            0, 2 * Math.PI,
            false, 0
          );
          const pts = curvePos.getPoints(180);
          const flatPositions: number[] = [];
          const orbitIncRadFrame = ((p.orbitalInclination || 0) * Math.PI) / 180;
          pts.forEach(pt => flatPositions.push(
            pt.x,
            pt.y * Math.sin(orbitIncRadFrame),
            pt.y * Math.cos(orbitIncRadFrame)
          ));
          (orbitLine.geometry as LineGeometry).setPositions(flatPositions);

          const isSelectedNow = selectedPlanetRef.current === p.name;
          (orbitLine.geometry as LineGeometry).setColors(
            buildOrbitGradientColors(pts.length - 1, new THREE.Color(0xffffff))
          );
          const lm = orbitLine.material as LineMaterial;
          lm.opacity = isSelectedNow ? 0.75 : 0.22;
          lm.linewidth = isSelectedNow ? 1.5 : 0.9;
        }

        // Render moons orbits
        const moonsList = moonsMeshesRef.current[p.name];
        if (moonsList && moonsList.length > 0) {
          moonsList.forEach((mMesh, mIdx) => {
            const moonData = p.moons[mIdx];
            mMesh.visible = togglesRef.current.lunas;

            // Revolving around parent planet
            const moonAngle = (tSim * Math.PI * 2) / (moonData.orbitalPeriod * 2) + mIdx * 2.0;
            const mX = moonData.semiMajorAxis * Math.cos(moonAngle);
            const mZ = moonData.semiMajorAxis * Math.sin(moonAngle);
            mMesh.position.set(mX, 0, mZ);
          });
        }

        // Add to historical orbit decaying trails
        const trailInfo = trailGeometriesRef.current[p.name];
        const trailLine = trailLinesRef.current[p.name];
        if (trailInfo && trailLine) {
          trailLine.visible = togglesRef.current.trails && !comparisonModeRef.current;
          if (!isPausedRef.current && togglesRef.current.trails) {
            // Unshift current location coordinates
            const pos = trailInfo.positions;
            pos.unshift(posX, posY, posZ);
            
            // Limit to 200 points
            if (pos.length > 200 * 3) {
              pos.length = 200 * 3;
            }

            const positionAttribute = trailInfo.geometry.attributes.position as THREE.BufferAttribute;
            for (let idx = 0; idx < pos.length / 3; idx++) {
              positionAttribute.setXYZ(idx, pos[idx * 3], pos[idx * 3 + 1], pos[idx * 3 + 2]);
            }
            // Fill leftover with the last position to keep buffer filled cleanly
            const gapStart = pos.length / 3;
            const lastX = pos[pos.length - 3] || 0;
            const lastY = pos[pos.length - 2] || 0;
            const lastZ = pos[pos.length - 1] || 0;
            for (let idx = gapStart; idx < 200; idx++) {
              positionAttribute.setXYZ(idx, lastX, lastY, lastZ);
            }
            positionAttribute.needsUpdate = true;
          }
        }

        // Dynamic 3D Velocity Arrow helpers
        let arrow = arrowHelpersRef.current[p.name];
        if (togglesRef.current.vectors && !comparisonModeRef.current) {
          // calculate true physical speed vectors vectors
          const modProps = getModifiedProps(p, modifier);
          const factorV = Math.sqrt((G_CONSTANT * (MASS_OF_SUN + modProps.mass)) / (modProps.a * AU_IN_KM * 1000 * (1 - modProps.e * modProps.e)));
          
          // direction vx, vz
          const vxVal = -factorV * Math.sin(theta);
          const vzVal = factorV * (modProps.e + Math.cos(theta));
          
          const direction = new THREE.Vector3(vxVal, 0, vzVal).normalize();
          const arrowLen = Math.min(6.0, 1.2 + (Math.sqrt(vxVal * vxVal + vzVal * vzVal) * 0.15));

          if (!arrow) {
            arrow = new THREE.ArrowHelper(direction, pMesh.position, arrowLen, 0x00ff88, 0.6, 0.4);
            scene.add(arrow);
            arrowHelpersRef.current[p.name] = arrow;
          } else {
            arrow.position.copy(pMesh.position);
            arrow.setDirection(direction);
            arrow.setLength(arrowLen);
            arrow.visible = true;
          }
        } else if (arrow) {
          arrow.visible = false;
        }
      });

      // --- Overhaul: actualización del cinturón de asteroides -----------------
      // Cada roca avanza según SU PROPIA velocidad angular kepleriana (ya
      // calculada con T = a^1.5 al crearla), no una rotación de bloque falsa.
      if (asteroidBeltRef.current) {
        const { mesh: beltMesh, data: beltData } = asteroidBeltRef.current;
        const m4 = new THREE.Matrix4();
        const q4 = new THREE.Quaternion();
        const v4 = new THREE.Vector3();
        const s4 = new THREE.Vector3();
        const euler4 = new THREE.Euler();

        for (let i = 0; i < beltData.length; i++) {
          const ad = beltData[i];
          if (!isPausedRef.current) {
            ad.angle += ad.angularSpeed * speedRef.current * deltaSec;
          }
          v4.set(Math.cos(ad.angle) * ad.radius, ad.yOff, Math.sin(ad.angle) * ad.radius);
          s4.set(ad.scale, ad.scale, ad.scale);
          // Giro propio (rotación sobre su propio eje, look ligeramente caótico real)
          euler4.set(ad.angle * ad.spinSpeed * 0.3, ad.angle * ad.spinSpeed * 0.5, 0);
          q4.setFromEuler(euler4);
          m4.compose(v4, q4, s4);
          beltMesh.setMatrixAt(i, m4);
        }
        beltMesh.instanceMatrix.needsUpdate = true;
        beltMesh.visible = !comparisonModeRef.current;
      }

      // Animate Hyperbolic Comet
      if (cometStateRef.current.active && cometMeshRef.current && cometTrailRef.current) {
        cometMeshRef.current.visible = true;
        cometTrailRef.current.visible = true;
        if (cometGlowRef.current) cometGlowRef.current.visible = true;

        // Al detectar un lanzamiento nuevo (t pasa a 0 con el cometa recién activado),
        // se limpia el rastro previo para que no queden segmentos "fantasma" del vuelo anterior.
        if (cometStateRef.current.t === 0 && !cometWasActiveRef.current) {
          cometPositionsRef.current.length = 0;
        }
        cometWasActiveRef.current = true;

        if (!isPausedRef.current) {
          // Increment comet parameter time bounds
          onUpdateCometRef.current(prev => {
            const nextT = prev.t + deltaSec * speedRef.current * 0.05;
            // Trayectoria hiperbólica real: r(θ) = a(e² - 1) / (1 + e·cos θ)
            const eComet = prev.eccentricity; // > 1 (órbita abierta)
            const majorComet = prev.semiMajorAxis; // semieje visual

            // --- Overhaul: ángulo límite real de la asíntota (θ∞ = arccos(-1/e)) ---
            // Antes el barrido se truncaba arbitrariamente en ±90°, lo cual no
            // coincidía con el dato que el panel PHYS ya le muestra al usuario
            // (± 143.13° para e=1.25). Ahora coincide exactamente con eso.
            const thetaInfinity = Math.acos(-1 / eComet);
            const thetaMargin = thetaInfinity * 0.97; // pequeño margen antes del límite asintótico (r→∞)
            const thetaHyp = (nextT - 0.5) * thetaMargin * 2;

            if (thetaHyp >= thetaMargin || thetaHyp <= -thetaMargin) {
              // reset comet when out of scope or reached edge
              return { ...prev, t: 0, active: false };
            }

            const rHyp = (majorComet * (eComet * eComet - 1)) / (1 + eComet * Math.cos(thetaHyp));
            // Offset focal point
            const cOffset = majorComet * eComet;
            const cX = rHyp * Math.cos(thetaHyp) - cOffset;
            const cZ = rHyp * Math.sin(thetaHyp);

            // Set Position
            cometMeshRef.current?.position.set(cX, 0, cZ);
            if (cometGlowRef.current) cometGlowRef.current.position.set(cX, 0, cZ);

            // Trail coordinate shifts
            cometPositionsRef.current.unshift(cX, 0, cZ);
            if (cometPositionsRef.current.length > 150 * 3) {
              cometPositionsRef.current.length = 150 * 3;
            }

            const cometTrailGeom = cometTrailRef.current?.geometry;
            if (cometTrailGeom) {
              const posAttribute = cometTrailGeom.attributes.position as THREE.BufferAttribute;
              for (let i = 0; i < cometPositionsRef.current.length / 3; i++) {
                posAttribute.setXYZ(i, cometPositionsRef.current[i * 3], cometPositionsRef.current[i * 3 + 1], cometPositionsRef.current[i * 3 + 2]);
              }
              const gapStart = cometPositionsRef.current.length / 3;
              const lastX = cometPositionsRef.current[cometPositionsRef.current.length - 3] || 0;
              const lastZ = cometPositionsRef.current[cometPositionsRef.current.length - 1] || 0;
              for (let i = gapStart; i < 150; i++) {
                posAttribute.setXYZ(i, lastX, 0, lastZ);
              }
              posAttribute.needsUpdate = true;
            }

            return { ...prev, t: nextT };
          });
        }
      } else {
        if (cometMeshRef.current) cometMeshRef.current.visible = false;
        if (cometTrailRef.current) cometTrailRef.current.visible = false;
        if (cometGlowRef.current) cometGlowRef.current.visible = false;
        cometWasActiveRef.current = false;
      }

      // COLLISION ANIMATION: EARTH vs MARS
      const earthMesh = meshesRef.current['earth'];
      const marsMesh = meshesRef.current['mars'];
      
      // Reset visibility when collision is not active
      if (!collisionState?.active && !collisionState?.completed && earthMesh && marsMesh && collisionExplosionRef.current) {
        earthMesh.visible = true;
        marsMesh.visible = true;
        if (atmosphereMeshesRef.current['earth']) {
          atmosphereMeshesRef.current['earth'].visible = true;
        }
        collisionExplosionRef.current.visible = false;
        collisionProgressRef.current = 0;
      }
      
      if (collisionState?.active && earthMesh && marsMesh && collisionExplosionRef.current) {
        const progress = collisionProgressRef.current;
        
        if (progress < 1.0) {
          collisionProgressRef.current += deltaSec * 0.5; // Animation speed
          
          // Phase 1: Move planets towards each other (0.0 to 0.5)
          if (progress < 0.5) {
            const moveProgress = progress * 2;
            const earthTarget = new THREE.Vector3(0, 0, 0);
            const marsTarget = new THREE.Vector3(0, 0, 0);
            
            // Start positions
            const earthStart = new THREE.Vector3(
              VISUAL_SCALE.distances['earth'] * 0.8, 0, 0
            );
            const marsStart = new THREE.Vector3(
              -VISUAL_SCALE.distances['mars'] * 0.5, 0, 0
            );
            
            // Lerp positions
            earthMesh.position.lerpVectors(earthStart, earthTarget, moveProgress);
            marsMesh.position.lerpVectors(marsStart, marsTarget, moveProgress);
            
            // Camera follows the collision
            const camTargetX = 0;
            const camTargetY = 15;
            const camTargetZ = 30;
            camera.position.lerp(new THREE.Vector3(camTargetX, camTargetY, camTargetZ), 0.08);
            controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.08);
          }
          
          // Phase 2: Explosion and merge (0.5 to 1.0)
          if (progress >= 0.5) {
            const explosionProgress = (progress - 0.5) * 2;
            collisionExplosionRef.current.visible = true;
            
            // Scale explosion
            const explosionScale = 1.0 + explosionProgress * 8.0;
            collisionExplosionRef.current.scale.set(explosionScale, explosionScale, explosionScale);
            
            // Fade out explosion
            const explosionOpacity = 1.0 - explosionProgress;
            (collisionExplosionRef.current.material as THREE.MeshBasicMaterial).opacity = explosionOpacity;
            
            // Change color from orange to white
            const color = new THREE.Color();
            color.setHSL(0.08 - explosionProgress * 0.08, 1.0, 0.5 + explosionProgress * 0.3);
            (collisionExplosionRef.current.material as THREE.MeshBasicMaterial).color = color;
            
            // Hide original planets
            earthMesh.visible = false;
            marsMesh.visible = false;
            if (atmosphereMeshesRef.current['earth']) {
              atmosphereMeshesRef.current['earth'].visible = false;
            }
            
            // Update state
            onCollisionStateChange?.({
              ...collisionState,
              progress: collisionProgressRef.current
            });
          }
        } else {
          // Animation completed
          collisionProgressRef.current = 1.0;
          onCollisionStateChange?.({
            ...collisionState,
            active: false,
            completed: true
          });
        }
      }

      // Toggle Ecliptic Plane Grid overlay
      if (eclipticGridRef.current) {
        eclipticGridRef.current.visible = togglesRef.current.grid && !comparisonModeRef.current;
      }

      // Gravity field potential wireframe toggles
      if (gravityGridRef.current) {
        gravityGridRef.current.visible = togglesRef.current.gravValue && !comparisonModeRef.current;
      }

      // Secuencia EVA01: aproximación orbital continua hacia Marte.
      if (descentActiveRef.current) {
        const marsMesh = meshesRef.current['mars'];
        if (marsMesh) {
          controls.enabled = false;
          if (descentStartRef.current === null) {
            descentStartRef.current = timestamp;
            descentCameraStartRef.current = camera.position.clone();
            descentTargetStartRef.current = controls.target.clone();
          }
          const raw = Math.min(1, (timestamp - descentStartRef.current) / 5800);
          const eased = raw < .5
            ? 4 * raw * raw * raw
            : 1 - Math.pow(-2 * raw + 2, 3) / 2;
          const marsPos = marsMesh.position.clone();
          const arrival = marsPos.clone().add(new THREE.Vector3(1.05, .42, 1.35));
          camera.position.lerpVectors(descentCameraStartRef.current!, arrival, eased);
          controls.target.lerpVectors(descentTargetStartRef.current!, marsPos, eased);
          camera.fov = 60 - eased * 20;
          camera.updateProjectionMatrix();
        }
      } else if (cameraModeRef.current === 'follow' && selectedPlanetRef.current) {
        controls.enabled = true;
        const followMesh = meshesRef.current[selectedPlanetRef.current];
        if (followMesh) {
          const pPos = followMesh.position;

          if (lastFollowedNameRef.current !== selectedPlanetRef.current) {
            lastFollowedNameRef.current = selectedPlanetRef.current;
            followPrevPosRef.current = pPos.clone();
            followTransitionRef.current = 0;
            followCameraStartRef.current = camera.position.clone();
            followTargetStartRef.current = controls.target.clone();
          }

          if (followTransitionRef.current < 1 && followCameraStartRef.current && followTargetStartRef.current) {
            const baseRadius = VISUAL_SCALE.sizes[selectedPlanetRef.current] || 0.5;
            const framingDistance = Math.max(baseRadius * 8.5, 1.8);
            const destination = pPos.clone().add(
              new THREE.Vector3(.55, .36, .84).normalize().multiplyScalar(framingDistance)
            );
            followTransitionRef.current = Math.min(1, followTransitionRef.current + .022);
            const t = followTransitionRef.current;
            const eased = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            camera.position.lerpVectors(followCameraStartRef.current, destination, eased);
            controls.target.lerpVectors(followTargetStartRef.current, pPos, eased);
            followPrevPosRef.current = pPos.clone();
          } else if (followPrevPosRef.current) {
            // --- Mismo objetivo: traslación rígida -------------------------
            // Mueve cámara y target exactamente lo mismo que se movió el
            // planeta, preservando el zoom/ángulo que el usuario haya elegido
            // con el mouse (OrbitControls). Así sí se puede acercar de verdad
            // hasta ver el detalle de la superficie (continentes, relieve...).
            const delta = pPos.clone().sub(followPrevPosRef.current);
            camera.position.add(delta);
            controls.target.add(delta);
            followPrevPosRef.current = pPos.clone();
          }
        }
      } else {
        controls.enabled = true;
        descentStartRef.current = null;
        descentCameraStartRef.current = null;
        descentTargetStartRef.current = null;
        if (camera.fov !== 60) {
          camera.fov = 60;
          camera.updateProjectionMatrix();
        }
        lastFollowedNameRef.current = null;
        followPrevPosRef.current = null;
        followTransitionRef.current = 1;
        followCameraStartRef.current = null;
        followTargetStartRef.current = null;

        if (cameraModeRef.current === 'zenith') {
          // Direct bird-eye orthographic-like view
          const targetPos = new THREE.Vector3(0, 155, 0.01);
          camera.position.lerp(targetPos, 0.08);
          controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.08);
        } else if (cameraModeRef.current === 'ecliptic') {
          // Looking directly flat from horizontal plane
          const targetPos = new THREE.Vector3(92, 0.3, 0);
          camera.position.lerp(targetPos, 0.08);
          controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.08);
        }
      }

      // Transición continua entre escala del sistema solar y escala galáctica.
      // Desde cualquier azimut la mira converge al Sol, evitando que el usuario
      // se pierda en el espacio al usar un rango de zoom tan amplio.
      if (!descentActiveRef.current && galaxyFly < 1) {
        galaxyFly = Math.min(1, galaxyFly + deltaSec * .72);
        const eased = galaxyFly < .5
          ? 4 * galaxyFly * galaxyFly * galaxyFly
          : 1 - Math.pow(-2 * galaxyFly + 2, 3) / 2;
        camera.position.lerpVectors(galaxyCameraStart, galaxyCameraEnd, eased);
        controls.target.lerp(new THREE.Vector3(0, 0, 0), .24);
      }

      const distanceFromSun = camera.position.length();
      const galacticBlend = THREE.MathUtils.smoothstep(distanceFromSun, 460, 1040);
      galaxyMaterial.opacity = galacticBlend * .96;
      galaxyPlane.visible = galacticBlend > .008;
      starMaterial.opacity = THREE.MathUtils.lerp(.46, .16, galacticBlend);

      if (!descentActiveRef.current && cameraModeRef.current === 'free') {
        if (distanceFromSun > 690 && !galacticViewRef.current) {
          galacticViewRef.current = true;
          setGalacticView(true);
        } else if (distanceFromSun < 570 && galacticViewRef.current && galaxyFly >= 1) {
          galacticViewRef.current = false;
          setGalacticView(false);
        }
        if (distanceFromSun > 440) controls.target.lerp(new THREE.Vector3(0, 0, 0), .16);
      }

      controls.update();

      // --- Overhaul Visual: render con Bloom selectivo (exclusivo del Sol) -----
      scene.traverse(darkenNonBloomed);
      bloomComposer.render();
      scene.traverse(restoreBloomedMaterial);
      finalComposer.render();

      // Render 2D screen coordinate floating labels for planets names directly aligned
      updateScreenLabels(camera);
    };

    const screenLabelElements = new Map<string, HTMLDivElement>();
    const updateScreenLabels = (cam: THREE.PerspectiveCamera) => {
      const el = labelsContainerRef.current;
      if (!el) return;
      screenLabelElements.forEach(label => { label.style.display = 'none'; });
      if (!togglesRef.current.names) return;

      planets.forEach(p => {
        const mesh = meshesRef.current[p.name];
        if (!mesh) return;

        // Vector projecting 3D mesh world position onto screen coordinate pixels
        const posVec = mesh.position.clone();
        posVec.project(cam);

        // Convert projection coordinates to absolute screen pixels
        const screenW = containerSizeRef.current.width;
        const screenH = containerSizeRef.current.height;

        const pX = (posVec.x * .5 + .5) * screenW;
        const pY = (-(posVec.y * .5) + .5) * screenH;

        // Behind camera check
        if (posVec.z <= 1.0) {
          // --- Overhaul Visual: etiqueta flotante premium con línea conectora ----
          // (chip tipográfico monoespaciado + punto de acento + leader-line),
          // posicionado por proyección de pantalla (sin tocar la física/posición 3D).
          const isSelected = selectedPlanetRef.current === p.name;
          const isHovered = hoveredPlanetRef.current === p.name;
          const accentColor = isSelected ? '#ffffff' : isHovered ? '#d7dadf' : p.color;

          let wrapper = screenLabelElements.get(p.name);
          if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.style.flexDirection = 'column';
            wrapper.style.alignItems = 'center';
            wrapper.style.gap = '0';
            const chip = document.createElement('span');
            chip.className = 'label-chip';
            const dot = document.createElement('span');
            dot.className = 'label-dot';
            chip.appendChild(dot);
            const text = document.createElement('span');
            text.style.color = '#eef3fb';
            text.innerText = p.name === 'mars' ? 'MARTE · BASE EVA03' : p.displayName.toUpperCase();
            chip.appendChild(text);
            const leader = document.createElement('span');
            leader.className = 'leader-line';
            wrapper.appendChild(chip);
            wrapper.appendChild(leader);
            el.appendChild(wrapper);
            screenLabelElements.set(p.name, wrapper);
          }
          wrapper.className = isSelected ? 'planet-label-3d is-selected' : 'planet-label-3d';
          wrapper.style.display = 'flex';
          wrapper.style.left = `${pX}px`;
          wrapper.style.top = `${pY - 16}px`;
          wrapper.style.color = accentColor;
        }
      });
    };

    // Trigger Initial Animation Request
    animeFrameId = requestAnimationFrame(animate);

    // 14. Handles Resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        containerSizeRef.current = { width: w, height: h };
        if (rendererRef.current) {
          rendererRef.current.setSize(w, h);
        }
        camera.aspect = w / h;
        camera.updateProjectionMatrix();

        // --- Overhaul Visual: mantener nítido el pipeline de Bloom y el grosor
        // en píxeles de las líneas orbitales (Line2) tras un cambio de tamaño ---
        bloomComposer.setSize(w, h);
        finalComposer.setSize(w, h);
        Object.values(orbitLinesRef.current).forEach((line) => {
          (line.material as LineMaterial).resolution.set(w, h);
        });
      }
    });
    resizeObserver.observe(mountRef.current);

    // Clean up
    return () => {
      cancelAnimationFrame(animeFrameId);
      resizeObserver.disconnect();
      controls.dispose();
      labelsContainerRef.current?.replaceChildren();
      screenLabelElements.clear();
      const disposedTextures = new Set<THREE.Texture>();
      const disposeTexture = (value:unknown) => {
        if (value instanceof THREE.Texture && !disposedTextures.has(value)) {
          disposedTextures.add(value);
          value.dispose();
        }
      };
      scene.traverse(object => {
        const renderable = object as THREE.Mesh;
        renderable.geometry?.dispose();
        if (!renderable.material) return;
        const materials = Array.isArray(renderable.material) ? renderable.material : [renderable.material];
        materials.forEach(material => {
          Object.values(material).forEach(disposeTexture);
          if (material instanceof THREE.ShaderMaterial) {
            Object.values(material.uniforms).forEach(uniform => disposeTexture(uniform?.value));
          }
          material.dispose();
        });
      });
      galaxyTexture.dispose();
      galaxyGeometry.dispose();
      galaxyMaterial.dispose();
      galaxyJumpRef.current = null;
      bloomComposer.dispose();
      finalComposer.dispose();
      if (rendererRef.current) {
        rendererRef.current.renderLists.dispose();
        rendererRef.current.dispose();
        rendererRef.current.forceContextLoss();
      }
      if (rendererRef.current && rendererRef.current.domElement && mountRef.current) {
        rendererRef.current.domElement.removeEventListener('click', handleCanvasClick);
        rendererRef.current.domElement.removeEventListener('mousemove', handleMouseMove);
        if (mountRef.current.contains(rendererRef.current.domElement)) {
          mountRef.current.removeChild(rendererRef.current.domElement);
        }
      }
    };
  }, [planets, containerReady]); // Depends on planets and container ready

  const selectedComparison = planets.find((planet) => planet.name === selectedPlanet) ?? planets[0];
  const earthComparison = planets.find((planet) => planet.name === 'earth') ?? planets[0];
  const radiusRatio = selectedComparison.realRadius / earthComparison.realRadius;

  return (
    <div className="relative w-full h-full flex items-stretch select-none" id="container_3d_wrapper">
      {/* Three.js viewport */}
      <div ref={mountRef} className="w-full h-full absolute top-0 left-0 bg-[#02020e] cursor-crosshair z-0" id="canvas_threejs_mount" />

      {/* Canvas screen projection floating names labels mapping */}
      <div ref={labelsContainerRef} className="absolute inset-0 pointer-events-none z-10 overflow-hidden" id="screen_labels_overlay" />

      <button
        type="button"
        className={`galaxy-view-button ${galacticView ? 'is-active' : ''}`}
        aria-pressed={galacticView}
        onClick={() => {
          onCameraModeChange('free');
          galaxyJumpRef.current?.();
        }}
      >
        <span>{galacticView ? 'REGRESAR AL SISTEMA' : 'VISTA GALÁCTICA'}</span>
        <small>{galacticView ? 'anclaje: Sol' : '26,000 años luz del centro'}</small>
      </button>

      {galacticView && (
        <aside className="galaxy-context-card" aria-live="polite">
          <span>ESCALA · VÍA LÁCTEA</span>
          <strong>El sistema solar se vuelve un punto dentro del Espolón de Orión</strong>
          <p>La cámara permanece fijada al Sol. Arte científico: NASA/JPL-Caltech/ESO/Robert Hurt.</p>
        </aside>
      )}

      {comparisonMode && (
        <aside className="planet-comparison-readout" aria-live="polite">
          <header><span>COMPARACIÓN A ESCALA</span><b>DIÁMETROS REALES</b></header>
          <div>
            <article><small>REFERENCIA</small><strong>TIERRA</strong><b>{(earthComparison.realRadius * 2).toLocaleString('es-GT')} km</b></article>
            <i>VS</i>
            <article><small>SELECCIÓN</small><strong>{selectedComparison.displayName.toUpperCase()}</strong><b>{(selectedComparison.realRadius * 2).toLocaleString('es-GT')} km</b></article>
          </div>
          <p>{selectedComparison.displayName} mide <b>{radiusRatio.toFixed(2)}×</b> el radio de la Tierra. Selecciona otro planeta para cambiar la comparación.</p>
        </aside>
      )}

      {/* Floating coordinates indicator in bottom left corner */}
      <div className="absolute bottom-4 left-[295px] pointer-events-none z-10 flex flex-col gap-1 text-[10px] font-mono text-[#6688aa] bg-black/60 p-2 border border-gray-800 rounded backdrop-blur">
        <div className="text-[#00ff88] font-bold">INFO DE CÁMARA</div>
        <div>Modo: {cameraMode.toUpperCase()}</div>
        <div>Fondo estelar: 24,000 pts calibrados</div>
        <div>Escala: {galacticView ? 'VÍA LÁCTEA' : 'SISTEMA SOLAR'}</div>
        <div>Inclinación elíptica: plana (Mat III)</div>
      </div>

      {/* Loading indicator */}
      {!containerReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#02020e] z-20">
          <div className="text-cyan-400 font-mono text-lg animate-pulse">
            Cargando sistema solar...
          </div>
        </div>
      )}
    </div>
  );
}
