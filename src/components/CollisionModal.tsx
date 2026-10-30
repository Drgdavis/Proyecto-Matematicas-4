import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { X, RefreshCw, Globe2, Flame, Orbit, Atom, Ruler, BarChart3, FlaskConical } from 'lucide-react';
import { PhysicalData, ModifiedPhysicalData } from '../types';
import { PLANETS_DATA, VISUAL_SCALE, EARTH_MASS_KG, EARTH_RADIUS_KM, G_CONSTANT, MASS_OF_SUN, AU_IN_KM } from '../data/planets';

interface CollisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  earthModifier: ModifiedPhysicalData;
  // --- Overhaul: registro completo de modificadores (Unidad PHYS) ------------
  // Permite que los cambios realizados en CUALQUIER planeta dentro del panel
  // PHYS (masa, radio, excentricidad, semieje) también se reflejen aquí, no
  // solo los de la Tierra. Es 100% aditivo: si un planeta no fue modificado,
  // se usa su valor real sin alterar ningún cálculo existente.
  planetModifiers: Record<string, ModifiedPhysicalData>;
}

export function CollisionModal({ isOpen, onClose, earthModifier, planetModifiers }: CollisionModalProps) {
  const [progress, setProgress] = useState(0);
  const [targetPlanetName, setTargetPlanetName] = useState<string>('mars');
  const [key, setKey] = useState<number>(0);
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const targetMeshRef = useRef<THREE.Mesh | null>(null);
  const earthAtmoRef = useRef<THREE.Mesh | null>(null);
  const targetAtmoRef = useRef<THREE.Mesh | null>(null);
  const explosionMeshRef = useRef<THREE.Mesh | null>(null);
  const shockwaveMeshRef = useRef<THREE.Mesh | null>(null);
  const debrisGroupRef = useRef<THREE.Group | null>(null);
  const fissureLinesRef = useRef<THREE.LineSegments[]>([]);
  const newPlanetMeshRef = useRef<THREE.Mesh | null>(null);
  const newPlanetGlowRef = useRef<THREE.Mesh | null>(null);
  const animationFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const earthData = PLANETS_DATA.find(p => p.name === 'earth')!;
  const targetData = PLANETS_DATA.find(p => p.name === targetPlanetName)!;

  // --- Overhaul: modificador real del planeta objetivo (antes fijo/real) ----
  const targetModifier: ModifiedPhysicalData = planetModifiers[targetPlanetName] || {
    massMultiplier: 1,
    eccentricity: targetData.eccentricity,
    semiMajorAxisMultiplier: 1,
    radiusMultiplier: 1
  };

  const earthRealMass = earthData.realMass * earthModifier.massMultiplier;
  const earthRealRadius = earthData.realRadius * earthModifier.radiusMultiplier;
  const targetRealMass = targetData.realMass * targetModifier.massMultiplier;
  const targetRealRadius = targetData.realRadius * targetModifier.radiusMultiplier;

  const combinedMass = earthRealMass + targetRealMass;
  const combinedRadius = Math.cbrt(Math.pow(earthRealRadius, 3) + Math.pow(targetRealRadius, 3));
  const avgEccentricity = (earthModifier.eccentricity + targetModifier.eccentricity) / 2;
  
  const earthEscapeVel = Math.sqrt(2 * G_CONSTANT * (earthRealMass * EARTH_MASS_KG) / (earthRealRadius * 1000)) / 1000;
  const targetEscapeVel = Math.sqrt(2 * G_CONSTANT * (targetRealMass * EARTH_MASS_KG) / (targetRealRadius * 1000)) / 1000;
  const impactVelocity = earthEscapeVel + targetEscapeVel;
  const energyReleased = 0.5 * (earthRealMass * EARTH_MASS_KG) * Math.pow(impactVelocity * 1000, 2);

  // Color del "nuevo planeta" resultante: mezcla ponderada por fracción de masa
  // de cada cuerpo progenitor (puramente visual/estético, no es una magnitud física).
  const newPlanetColor = new THREE.Color(earthData.color).lerp(
    new THREE.Color(targetData.color),
    targetRealMass / combinedMass
  );

  const resetAnimation = () => {
    setProgress(0);
    setKey(k => k + 1);
  };

  useEffect(() => {
    if (!isOpen || !mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000011);
    sceneRef.current = scene;

    const width = mountRef.current.clientWidth || 1200;
    const height = mountRef.current.clientHeight || 800;
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 6000);
    camera.position.set(0, 15, 40);
    camera.lookAt(0, 0, 0);
    // --- Fix: posición base de cámara para poder alejarla dinámicamente
    // cuando el cuerpo resultante de la colisión es muy grande (antes se
    // veía cortado en pantalla, p. ej. Tierra + Júpiter). ---------------------
    const baseCameraPos = camera.position.clone();
    const baseCameraDir = baseCameraPos.clone().normalize();
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const sunLight = new THREE.PointLight(0xfff5e6, 4.5, 2500);
    sunLight.decay = 0;
    sunLight.position.set(80, 50, 60);
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const fillLight = new THREE.PointLight(0x6699ff, 1.2, 2000);
    fillLight.position.set(-60, -30, -45);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xff4400, 0.8, 1500);
    rimLight.position.set(0, 50, -80);
    scene.add(rimLight);

    const starsCount = 15000;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starsCount * 3);
    const starColors = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 800 + Math.random() * 2000;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      starPositions[i * 3] = x;
      starPositions[i * 3 + 1] = y;
      starPositions[i * 3 + 2] = z;
      
      const starColorChoice = Math.random();
      let rCol = 1, gCol = 1, bCol = 1;
      if (starColorChoice < 0.25) { rCol = 0.7; gCol = 0.85; bCol = 1; } 
      else if (starColorChoice < 0.5) { rCol = 1; gCol = 0.92; bCol = 0.7; } 
      else if (starColorChoice < 0.7) { rCol = 1; gCol = 0.65; bCol = 0.4; }
      else if (starColorChoice < 0.85) { rCol = 0.9; gCol = 0.4; bCol = 0.4; }
      starColors[i * 3] = rCol;
      starColors[i * 3 + 1] = gCol;
      starColors[i * 3 + 2] = bCol;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMaterial = new THREE.PointsMaterial({ 
      size: 2.2, 
      vertexColors: true,
      sizeAttenuation: true
    });
    const starfield = new THREE.Points(starGeometry, starMaterial);
    scene.add(starfield);

    const nebulaGeom = new THREE.SphereGeometry(3000, 64, 64);
    const nebulaMat = new THREE.MeshBasicMaterial({
      color: 0x110022,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide
    });
    const nebula = new THREE.Mesh(nebulaGeom, nebulaMat);
    scene.add(nebula);

    // --- Overhaul: relieve procedural (desplazamiento de vértices real) ------
    // Genera una superficie con relieve genuino (no solo textura): suma de
    // ondas sinusoidales en distintas frecuencias según la dirección de cada
    // vértice. Es puramente geométrico/visual, no participa en ningún cálculo
    // físico — pero hace que los planetas luzcan realmente tridimensionales
    // (terreno, cráteres) en vez de esferas perfectamente lisas.
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

    // Atmósfera tipo Fresnel/Glow (mismo lenguaje visual que la escena principal)
    const createCollisionAtmosphere = (radius: number, colorHex: number) => {
      const atmGeom = new THREE.SphereGeometry(radius * 1.16, 40, 40);
      const atmMat = new THREE.ShaderMaterial({
        uniforms: { glowColor: { value: new THREE.Color(colorHex) } },
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
            float rim = pow(0.62 - max(dot(vNormalView, vec3(0.0, 0.0, 1.0)), 0.0), 3.2);
            gl_FragColor = vec4(glowColor, rim * 0.5);
          }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending
      });
      atmMat.toneMapped = false;
      return new THREE.Mesh(atmGeom, atmMat);
    };

    const earthScale = VISUAL_SCALE.sizes['earth'] * earthModifier.radiusMultiplier * 1.5;
    const earthGeom = new THREE.IcosahedronGeometry(earthScale, 6);
    applyProceduralRelief(earthGeom, earthScale * 0.035, 4.2);
    const earthMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(earthData.color),
      roughness: earthData.roughness ?? 0.7,
      metalness: earthData.metalness ?? 0.05,
      emissive: new THREE.Color(earthData.emissive),
      emissiveIntensity: 0.08
    });
    const earthMesh = new THREE.Mesh(earthGeom, earthMat);
    earthMesh.castShadow = true;
    earthMesh.receiveShadow = true;
    scene.add(earthMesh);
    earthMeshRef.current = earthMesh;

    const earthAtmoMesh = createCollisionAtmosphere(earthScale, new THREE.Color(earthData.atmosphereColor || '#6db8ff').getHex());
    scene.add(earthAtmoMesh);
    earthAtmoRef.current = earthAtmoMesh;

    const targetScale = VISUAL_SCALE.sizes[targetPlanetName] * targetModifier.radiusMultiplier * 1.5;
    const targetGeom = new THREE.IcosahedronGeometry(targetScale, 6);
    applyProceduralRelief(targetGeom, targetScale * 0.04, 9.7);
    const targetMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(targetData.color),
      roughness: targetData.roughness ?? 0.8,
      metalness: targetData.metalness ?? 0.04,
      emissive: new THREE.Color(targetData.emissive),
      emissiveIntensity: 0.08
    });
    const targetMesh = new THREE.Mesh(targetGeom, targetMat);
    targetMesh.castShadow = true;
    targetMesh.receiveShadow = true;
    scene.add(targetMesh);
    targetMeshRef.current = targetMesh;

    const targetAtmoMesh = createCollisionAtmosphere(targetScale, new THREE.Color(targetData.atmosphereColor || targetData.color).getHex());
    targetAtmoMesh.visible = !!targetData.hasAtmosphere;
    scene.add(targetAtmoMesh);
    targetAtmoRef.current = targetAtmoMesh;

    const createFissures = (center: THREE.Vector3, color: number) => {
      const lines: THREE.LineSegments[] = [];
      for (let i = 0; i < 25; i++) {
        const points = [];
        let currentPoint = center.clone();
        points.push(currentPoint.clone());
        
        const segments = 6 + Math.floor(Math.random() * 8);
        for (let j = 0; j < segments; j++) {
          const direction = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
          ).normalize();
          const length = (Math.random() * 0.6 + 0.3) * (Math.max(earthScale, targetScale));
          currentPoint = currentPoint.clone().add(direction.multiplyScalar(length));
          points.push(currentPoint.clone());
        }
        
        const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineBasicMaterial({ 
          color: color,
          transparent: true,
          opacity: 0.0
        });
        const line = new THREE.LineSegments(lineGeom, lineMat);
        scene.add(line);
        lines.push(line);
      }
      return lines;
    };

    const debrisGroup = new THREE.Group();
    scene.add(debrisGroup);
    debrisGroupRef.current = debrisGroup;
    
    const createDebris = (count: number, color1: number, color2: number, center: THREE.Vector3) => {
      for (let i = 0; i < count; i++) {
        const size = (Math.random() * 0.8 + 0.2) * (Math.max(earthScale, targetScale) * 0.15);
        const geom = new THREE.IcosahedronGeometry(size, 2);
        const mat = new THREE.MeshPhongMaterial({
          color: Math.random() > 0.5 ? color1 : color2,
          shininess: 30,
          specular: 0x444444
        });
        const debris = new THREE.Mesh(geom, mat);
        
        const direction = new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ).normalize();
        debris.position.copy(center);
        debris.userData.velocity = direction.multiplyScalar(2 + Math.random() * 3);
        debris.userData.rotationSpeed = new THREE.Vector3(
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2
        );
        
        debrisGroup.add(debris);
      }
    };

    const explosionGeom = new THREE.IcosahedronGeometry(1.0, 16);
    const explosionMat = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide
    });
    const explosionMesh = new THREE.Mesh(explosionGeom, explosionMat);
    scene.add(explosionMesh);
    explosionMeshRef.current = explosionMesh;
    explosionMesh.visible = false;

    const shockwaveGeom = new THREE.RingGeometry(0.1, 0.5, 64);
    const shockwaveMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide
    });
    const shockwaveMesh = new THREE.Mesh(shockwaveGeom, shockwaveMat);
    shockwaveMesh.rotation.x = Math.PI / 2;
    scene.add(shockwaveMesh);
    shockwaveMeshRef.current = shockwaveMesh;
    shockwaveMesh.visible = false;

    // --- Overhaul: el "nuevo planeta" fusionado (antes solo datos en texto) --
    // Cuerpo único resultante, geométricamente coherente con combinedRadius/
    // combinedMass ya calculados arriba, con relieve procedural propio y un
    // tinte "magma" que se va enfriando hacia su color final mientras crece.
    const kmToVisualUnit = VISUAL_SCALE.sizes['earth'] / EARTH_RADIUS_KM;
    const newPlanetScale = Math.max(0.4, combinedRadius * kmToVisualUnit * 1.5);
    const newPlanetGeom = new THREE.IcosahedronGeometry(newPlanetScale, 6);
    applyProceduralRelief(newPlanetGeom, newPlanetScale * 0.045, 17.3);
    const newPlanetMat = new THREE.MeshStandardMaterial({
      color: newPlanetColor,
      roughness: 0.66,
      metalness: 0.05,
      emissive: new THREE.Color(0xff5522),
      emissiveIntensity: 1.4
    });
    const newPlanetMesh = new THREE.Mesh(newPlanetGeom, newPlanetMat);
    newPlanetMesh.castShadow = true;
    newPlanetMesh.receiveShadow = true;
    newPlanetMesh.scale.set(0.001, 0.001, 0.001);
    newPlanetMesh.visible = false;
    scene.add(newPlanetMesh);
    newPlanetMeshRef.current = newPlanetMesh;

    const newPlanetGlow = createCollisionAtmosphere(newPlanetScale, 0xff5522);
    (newPlanetGlow.material as THREE.ShaderMaterial).uniforms.glowColor.value = new THREE.Color(0xff8844);
    newPlanetGlow.scale.set(0.001, 0.001, 0.001);
    newPlanetGlow.visible = false;
    scene.add(newPlanetGlow);
    newPlanetGlowRef.current = newPlanetGlow;

    startTimeRef.current = Date.now();
    let debrisCreated = false;
    let fissuresCreated = false;
    
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const animProgress = Math.min(elapsed / 7, 1);
      setProgress(animProgress);

      if (animProgress < 0.45) {
        const moveProgress = animProgress / 0.45;
        const earthStart = new THREE.Vector3(20, 0, 0);
        const targetStart = new THREE.Vector3(-20, 0, 0);
        const collisionPoint = new THREE.Vector3(0, 0, 0);

        earthMesh.position.lerpVectors(earthStart, collisionPoint, moveProgress);
        targetMesh.position.lerpVectors(targetStart, collisionPoint, moveProgress);
        earthAtmoMesh.position.lerpVectors(earthStart, collisionPoint, moveProgress);
        targetAtmoMesh.position.lerpVectors(targetStart, collisionPoint, moveProgress);

        earthMesh.rotation.y += 0.05;
        targetMesh.rotation.y += 0.03;
        earthAtmoMesh.rotation.y += 0.025;
        targetAtmoMesh.rotation.y += 0.018;

        // --- Overhaul: paneo cinematográfico durante el acercamiento --------
        // Empieza y termina exactamente en baseCameraPos (sin saltos), con un
        // leve arco lateral + elevación que le da sensación de "toma de cámara"
        // en vez de una vista 100% estática como antes.
        const xzRadius = Math.sqrt(baseCameraPos.x * baseCameraPos.x + baseCameraPos.z * baseCameraPos.z);
        const cinematicSwing = Math.sin(moveProgress * Math.PI);
        const angleOffset = cinematicSwing * (Math.PI / 9);
        camera.position.set(
          Math.sin(angleOffset) * xzRadius,
          baseCameraPos.y + cinematicSwing * 3,
          Math.cos(angleOffset) * xzRadius
        );
        camera.lookAt(0, 0, 0);
      }

      if (animProgress >= 0.45 && animProgress < 1.0) {
        if (!fissuresCreated) {
          fissureLinesRef.current = createFissures(new THREE.Vector3(0,0,0), 0xffaa00);
          fissuresCreated = true;
        }
        
        if (!debrisCreated && animProgress > 0.5) {
          createDebris(120, new THREE.Color(earthData.color).getHex(), new THREE.Color(targetData.color).getHex(), new THREE.Vector3(0,0,0));
          debrisCreated = true;
        }
        
        const explosionProgress = Math.min((animProgress - 0.45) / 0.55, 1.0);
        
        explosionMesh.visible = true;
        shockwaveMesh.visible = true;
        
        const explosionScale = 1.0 + explosionProgress * 35.0;
        explosionMesh.scale.set(explosionScale, explosionScale, explosionScale);
        
        const shockwaveScale = 1.0 + explosionProgress * 120.0;
        shockwaveMesh.scale.set(shockwaveScale, shockwaveScale, shockwaveScale);
        
        const explosionOpacity = 1.0 - explosionProgress;
        explosionMat.opacity = explosionOpacity;
        shockwaveMat.opacity = explosionOpacity * 0.8;
        
        const color = new THREE.Color();
        color.setHSL(0.08 - explosionProgress * 0.12, 1.0, 0.45 + explosionProgress * 0.4);
        explosionMat.color = color;
        
        fissureLinesRef.current.forEach((line, idx) => {
          const mat = line.material as THREE.LineBasicMaterial;
          mat.opacity = Math.max(0, 0.8 - explosionProgress * 0.8);
        });
        
        earthMesh.visible = explosionProgress < 0.15;
        targetMesh.visible = explosionProgress < 0.15;
        earthAtmoMesh.visible = explosionProgress < 0.2;
        targetAtmoMesh.visible = explosionProgress < 0.2;
        
        debrisGroup.children.forEach((debris) => {
          debris.position.add(debris.userData.velocity);
          debris.rotation.x += debris.userData.rotationSpeed.x;
          debris.rotation.y += debris.userData.rotationSpeed.y;
          debris.rotation.z += debris.userData.rotationSpeed.z;
          debris.userData.velocity.multiplyScalar(0.995);
        });

        // --- Overhaul: formación visual del nuevo cuerpo planetario ---------
        // Crece a partir del centro de la colisión mientras el material
        // "magma" se enfría progresivamente hacia el color final mezclado.
        if (explosionProgress > 0.5) {
          const formProgress = Math.min((explosionProgress - 0.5) / 0.5, 1.0);
          const easedForm = formProgress * formProgress * (3 - 2 * formProgress); // smoothstep

          newPlanetMesh.visible = true;
          newPlanetGlow.visible = true;
          newPlanetMesh.scale.setScalar(Math.max(0.001, easedForm));
          newPlanetGlow.scale.setScalar(Math.max(0.001, easedForm * 1.05));
          newPlanetMesh.rotation.y += 0.012;
          newPlanetGlow.rotation.y += 0.012;

          newPlanetMat.emissive.setHex(0xff5522).lerp(new THREE.Color(0x000000), easedForm * 0.92);
          newPlanetMat.emissiveIntensity = 1.4 * (1 - easedForm) + 0.08;

          const glowMat = newPlanetGlow.material as THREE.ShaderMaterial;
          glowMat.uniforms.glowColor.value.setHex(0xff8844).lerp(new THREE.Color(targetData.color), easedForm * 0.6);

          // --- Fix: retroceder la cámara si el cuerpo resultante es grande --
          // (antes quedaba cortado en pantalla con combinaciones muy masivas,
          // p. ej. Tierra + Júpiter). Se aleja proporcionalmente al radio
          // visual final del nuevo planeta, re-encuadrando siempre al centro.
          const extraPullback = Math.max(0, newPlanetScale - 2.2) * 2.4;
          camera.position.copy(baseCameraPos).addScaledVector(baseCameraDir, easedForm * extraPullback);
          camera.lookAt(0, 0, 0);
        }
      }

      starfield.rotation.y += 0.0003;
      nebula.rotation.y += 0.0001;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      debrisCreated = false;
      fissuresCreated = false;
      if (rendererRef.current && mountRef.current && rendererRef.current.domElement) {
        mountRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, [isOpen, targetPlanetName, key]);

  if (!isOpen) return null;

  return (
    <div className="solar-collision fixed inset-0 z-[100] flex items-center justify-center bg-black/98 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Simulación de colisión">
      <div className="w-full h-[98vh] mx-2 flex flex-col glass-panel-strong rounded-3xl border-2 border-[var(--accent-danger)]/30 shadow-[0_0_25px_rgba(255,77,94,0.1)] overflow-hidden font-mono">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-[var(--accent-danger)]/20 bg-gradient-to-r from-red-950/30 via-black/40 to-orange-950/20">
          <div className="flex items-center gap-4">
            <div className="w-4 h-4 bg-[var(--accent-danger)] rounded-full animate-pulse shadow-[0_0_10px_rgba(255,77,94,0.4)]" />
            <h2 className="text-3xl font-black text-white tracking-widest uppercase">
              COLISIÓN PLANETARIA: TIERRA vs {targetData.displayName.toUpperCase()}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={resetAnimation}
              className="px-6 py-3 btn-hud btn-hud-active rounded-xl font-black text-sm transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              REINICIAR ANIMACIÓN
            </button>
            <button
              onClick={onClose}
              className="p-3 hover:bg-red-950/50 rounded-full transition-colors text-[var(--text-tertiary)] hover:text-[var(--accent-danger)]"
            >
              <X className="w-10 h-10" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left: 3D Animation (BIGGER) */}
          <div className="w-3/5 h-full p-5 flex flex-col gap-4">
            <div className="glass-card !border-[var(--accent-danger)]/20 p-4 rounded-2xl">
              <label className="text-sm text-[var(--accent-danger)] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                <Globe2 className="w-4 h-4 shrink-0" />
                SELECCIONA EL PLANETA OBJETIVO PARA CHOCAR CON LA TIERRA MODIFICADA:
              </label>
              <select
                value={targetPlanetName}
                onChange={(e) => {
                  setTargetPlanetName(e.target.value);
                  setProgress(0);
                }}
                className="w-full bg-black/60 border-2 border-[var(--accent-danger)]/40 text-white rounded-xl p-3.5 text-base font-bold focus:outline-none focus:ring-4 focus:ring-red-500/40"
              >
                {PLANETS_DATA.filter(p => p.name !== 'earth').map(planet => (
                  <option key={planet.name} value={planet.name}>
                    {planet.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 bg-black rounded-2xl border-2 border-[var(--accent-danger)]/20 relative overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.8)]" ref={mountRef}>
              <div className="absolute top-5 left-5 right-5">
                <div className="text-sm text-[var(--accent-danger)] font-black mb-2 uppercase tracking-widest flex items-center gap-2">
                  <Flame className="w-5 h-5" />
                  PROGRESO DE COLISIÓN: {Math.round(progress * 100)}%
                </div>
                <div className="hud-timeline-track !h-3">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-600 transition-all duration-100 shadow-[0_0_10px_rgba(239,68,68,0.35)] rounded-full"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </div>

              {/* --- Overhaul: anuncio del nuevo cuerpo planetario formado --- */}
              {progress > 0.72 && (
                <div className="absolute bottom-5 left-5 right-5 glass-panel-strong rounded-xl p-4 animate-fade-in" id="new_planet_announcement">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: `#${newPlanetColor.getHexString()}`, boxShadow: `0 0 10px #${newPlanetColor.getHexString()}` }}
                    />
                    <div>
                      <div className="hud-eyebrow !text-[10px] text-white flex items-center gap-1.5">
                        <Orbit className="w-3 h-3 shrink-0" />
                        {progress > 0.97 ? 'NUEVO CUERPO PLANETARIO FORMADO' : 'FUSIONANDO MASA EN UN NUEVO CUERPO...'}
                      </div>
                      <div className="telemetry-value text-[11px] text-[var(--text-secondary)] mt-0.5">
                        Masa: <span className="text-white font-bold">{combinedMass.toFixed(3)} M⊕</span>
                        <span className="mx-2 opacity-30">|</span>
                        Radio: <span className="text-white font-bold">{Math.round(combinedRadius).toLocaleString()} km</span>
                        <span className="mx-2 opacity-30">|</span>
                        e prom.: <span className="text-white font-bold">{avgEccentricity.toFixed(3)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Data & Equations */}
          <div className="w-2/5 h-full overflow-y-auto p-8 border-l border-[var(--panel-border)] glass-panel scrollbar-hud">
            <div className="space-y-7">
              <div className="glass-card !border-[var(--accent-cyan)]/25 rounded-2xl p-6">
                <h3 className="text-xl font-black text-[var(--accent-cyan)] uppercase tracking-widest mb-5 flex items-center gap-3">
                  <Atom className="w-7 h-7" />
                  PARÁMETROS DE ENTRADA (AMBOS CUERPOS)
                </h3>
                <div className="space-y-3 text-base">
                  {[
                    { label: '1. MASA MULTIPLICADOR', earthVal: `${earthModifier.massMultiplier.toFixed(2)}x`, earthSub: `= ${earthRealMass.toFixed(3)} M⊕`, targetVal: `${targetModifier.massMultiplier.toFixed(2)}x`, targetSub: `= ${targetRealMass.toFixed(3)} M⊕` },
                    { label: '2. EXCENTRICIDAD', earthVal: earthModifier.eccentricity.toFixed(4), earthSub: `e = ${earthModifier.eccentricity.toFixed(4)}`, targetVal: targetModifier.eccentricity.toFixed(4), targetSub: `e = ${targetModifier.eccentricity.toFixed(4)}` },
                    { label: '3. SEMIEJE MAYOR', earthVal: `${earthModifier.semiMajorAxisMultiplier.toFixed(2)}x`, earthSub: `a = ${earthModifier.semiMajorAxisMultiplier.toFixed(3)} AU`, targetVal: `${targetModifier.semiMajorAxisMultiplier.toFixed(2)}x`, targetSub: `a = ${(targetData.semiMajorAxis * targetModifier.semiMajorAxisMultiplier).toFixed(3)} AU` },
                    { label: '4. RADIO MULTIPLICADOR', earthVal: `${earthModifier.radiusMultiplier.toFixed(2)}x`, earthSub: `r = ${Math.round(earthRealRadius).toLocaleString()} km`, targetVal: `${targetModifier.radiusMultiplier.toFixed(2)}x`, targetSub: `r = ${Math.round(targetRealRadius).toLocaleString()} km` }
                  ].map((row, i) => (
                    <div key={i} className="glass-card !bg-black/45 p-3.5 rounded-xl">
                      <div className="text-gray-400 text-xs uppercase tracking-tight mb-2.5 font-bold">{row.label}</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2.5 border-r border-white/8 pr-3">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: earthData.color, boxShadow: `0 0 6px ${earthData.color}` }} />
                          <div>
                            <div className="text-[10px] text-gray-500 uppercase">Tierra</div>
                            <div className="text-white font-mono text-lg font-black leading-tight">{row.earthVal}</div>
                            <div className="text-gray-500 text-[10px]">{row.earthSub}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: targetData.color, boxShadow: `0 0 6px ${targetData.color}` }} />
                          <div>
                            <div className="text-[10px] text-gray-500 uppercase">{targetData.displayName}</div>
                            <div className="text-white font-mono text-lg font-black leading-tight">{row.targetVal}</div>
                            <div className="text-gray-500 text-[10px]">{row.targetSub}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <p className="text-[10px] text-gray-500 font-ui leading-relaxed px-1">
                    Estos valores provienen directamente de los sliders de la pestaña <span className="text-gray-300 font-bold">PHYS</span> para cada planeta. Cambialos ahí antes de lanzar la colisión para ver su efecto aquí.
                  </p>
                </div>
              </div>

              <div className="glass-card !border-[var(--accent-orange)]/30 rounded-2xl p-6">
                <h3 className="text-xl font-black text-[var(--accent-orange)] uppercase tracking-widest mb-5 flex items-center gap-3">
                  <Ruler className="w-7 h-7" />
                  ECUACIONES UTILIZADAS
                </h3>
                <div className="space-y-4 text-base">
                  <div className="glass-card !border-[var(--accent-orange)]/25 !bg-black/45 p-4 rounded-xl font-mono">
                    <div className="text-orange-300 font-bold mb-2 text-lg">CONSERVACIÓN DE MASA:</div>
                    <div className="text-white text-lg">m<sub>total</sub> = m<sub>Tierra</sub> + m<sub>{targetData.displayName}</sub></div>
                  </div>
                  <div className="glass-card !border-[var(--accent-orange)]/25 !bg-black/45 p-4 rounded-xl font-mono">
                    <div className="text-orange-300 font-bold mb-2 text-lg">CONSERVACIÓN DE VOLUMEN:</div>
                    <div className="text-white text-lg">R<sub>total</sub> = ∛(R<sub>Tierra</sub>³ + R<sub>{targetData.displayName}</sub>³)</div>
                  </div>
                  <div className="glass-card !border-[var(--accent-orange)]/25 !bg-black/45 p-4 rounded-xl font-mono">
                    <div className="text-orange-300 font-bold mb-2 text-lg">ENERGÍA CINÉTICA (IMPACTO):</div>
                    <div className="text-white text-lg">E<sub>k</sub> = ½ · m · v²</div>
                  </div>
                  <div className="glass-card !border-[var(--accent-orange)]/25 !bg-black/45 p-4 rounded-xl font-mono">
                    <div className="text-orange-300 font-bold mb-2 text-lg">VELOCIDAD DE ESCAPE:</div>
                    <div className="text-white text-lg">v<sub>esc</sub> = √(2 · G · M / R)</div>
                  </div>
                </div>
              </div>

              <div className="glass-card !border-emerald-500/30 rounded-2xl p-6">
                <h3 className="text-xl font-black text-emerald-400 uppercase tracking-widest mb-5 flex items-center gap-3">
                  <BarChart3 className="w-7 h-7" />
                  RESULTADOS DE LA COLISIÓN (Tierra + {targetData.displayName})
                </h3>
                <div className="space-y-4 text-base">
                  <div className="glass-card !border-emerald-500/25 !bg-black/45 p-4 rounded-xl">
                    <div className="text-gray-400 text-xs uppercase tracking-tight mb-2 font-bold">MASA COMBINADA</div>
                    <div className="text-green-300 font-mono text-3xl font-black">{combinedMass.toFixed(3)} Tierras</div>
                    <div className="text-gray-500 text-xs mt-2">= {(combinedMass * EARTH_MASS_KG).toExponential(3)} kg</div>
                  </div>
                  <div className="glass-card !border-emerald-500/25 !bg-black/45 p-4 rounded-xl">
                    <div className="text-gray-400 text-xs uppercase tracking-tight mb-2 font-bold">RADIO DEL SUPERPLANETA</div>
                    <div className="text-green-300 font-mono text-3xl font-black">{Math.round(combinedRadius).toLocaleString()} km</div>
                    <div className="text-gray-500 text-xs mt-2">~{(combinedRadius / EARTH_RADIUS_KM).toFixed(2)}x Tierra</div>
                  </div>
                  <div className="glass-card !border-emerald-500/25 !bg-black/45 p-4 rounded-xl">
                    <div className="text-gray-400 text-xs uppercase tracking-tight mb-2 font-bold">VELOCIDAD DE IMPACTO</div>
                    <div className="text-green-300 font-mono text-3xl font-black">{impactVelocity.toFixed(1)} km/s</div>
                    <div className="text-gray-500 text-xs mt-2">= {(impactVelocity * 3600).toExponential(3)} km/h</div>
                  </div>
                  <div className="glass-card !border-[var(--accent-danger)]/30 !bg-black/45 p-4 rounded-xl">
                    <div className="text-gray-400 text-xs uppercase tracking-tight mb-2 font-bold">ENERGÍA LIBERADA</div>
                    <div className="text-red-400 font-mono text-3xl font-black">{energyReleased.toExponential(3)} J</div>
                    <div className="text-gray-500 text-xs mt-2">ESCALA ESTELAR DE ENERGÍA</div>
                  </div>
                  <div className="glass-card !border-emerald-500/25 !bg-black/45 p-4 rounded-xl">
                    <div className="text-gray-400 text-xs uppercase tracking-tight mb-2 font-bold">EXCENTRICIDAD PROMEDIO</div>
                    <div className="text-green-300 font-mono text-3xl font-black">{avgEccentricity.toFixed(4)}</div>
                  </div>
                </div>
              </div>

              <div className="glass-card !border-purple-500/30 rounded-2xl p-6">
                <h3 className="text-xl font-black text-purple-400 uppercase tracking-widest mb-5 flex items-center gap-3">
                  <FlaskConical className="w-7 h-7" />
                  CONSTANTES FÍSICAS
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="glass-card !border-purple-500/25 !bg-black/45 p-3 rounded-xl font-mono">
                    <div className="text-purple-300 font-bold text-lg">G = {G_CONSTANT.toExponential(3)}</div>
                    <div className="text-gray-500">m³ kg⁻¹ s⁻²</div>
                  </div>
                  <div className="glass-card !border-purple-500/25 !bg-black/45 p-3 rounded-xl font-mono">
                    <div className="text-purple-300 font-bold text-lg">M<sub>☉</sub> = {MASS_OF_SUN.toExponential(3)}</div>
                    <div className="text-gray-500">kg</div>
                  </div>
                  <div className="glass-card !border-purple-500/25 !bg-black/45 p-3 rounded-xl font-mono">
                    <div className="text-purple-300 font-bold text-lg">1 AU = {AU_IN_KM.toExponential(3)}</div>
                    <div className="text-gray-500">km</div>
                  </div>
                  <div className="glass-card !border-purple-500/25 !bg-black/45 p-3 rounded-xl font-mono">
                    <div className="text-purple-300 font-bold text-lg">M<sub>⊕</sub> = {EARTH_MASS_KG.toExponential(3)}</div>
                    <div className="text-gray-500">kg</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
