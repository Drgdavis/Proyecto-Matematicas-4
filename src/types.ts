export interface MoonData {
  name: string;
  radius: number; // relative for 3D
  semiMajorAxis: number; // relative for orbit
  orbitalPeriod: number; // days
  color: string;
  // --- Overhaul Visual: datos opcionales para tarjeta de información --------
  // Puramente informativos/visuales — no participan en el motor orbital.
  realRadiusKm?: number;     // radio real en km (para mostrar en la tarjeta)
  realDistanceKm?: number;   // distancia real al planeta padre en km
  description?: string;      // breve descripción real del satélite
  textures?: {
    map?: string;
    bumpMap?: string;
  };
}

export interface PhysicalData {
  name: string;
  displayName: string;
  realMass: number; // in Earth masses (1.0 = 5.972e24 kg)
  realRadius: number; // in km (6371 km)
  semiMajorAxis: number; // a in AU (1 AU = 1.496e8 km)
  eccentricity: number; // e
  orbitalPeriod: number; // T in Earth years (1.0 = 365.25 days)
  axialTilt: number; // in degrees (Tierra = 23.44)
  rotationPeriod: number; // in Earth days (Tierra = 1.0)
  color: string;
  specular: string;
  shininess: number;
  emissive: string;
  description: string;
  moons: MoonData[];
  // --- Overhaul Visual: propiedades PBR opcionales (NO físicas) ---------
  // Usadas únicamente por el motor de render (MeshStandardMaterial) para el
  // acabado fotorrealista. No participan en ningún cálculo de Unidad I/II/III.
  roughness?: number; // 0 (espejo) a 1 (mate total)
  metalness?: number; // 0 (dieléctrico) a 1 (metálico)
  hasAtmosphere?: boolean; // habilita el shader de atmósfera Fresnel/Glow
  atmosphereColor?: string; // color del halo atmosférico
  // --- Overhaul: inclinación del PLANO orbital respecto a la eclíptica -----
  // (no confundir con axialTilt, que es la inclinación del EJE de rotación).
  // Por defecto 0° (los 8 planetas principales son ~coplanares, <3°, y se
  // simplifican como plano XZ puro, igual que siempre). Permite representar
  // con precisión cuerpos como Plutón, cuya órbita real está inclinada ~17°.
  orbitalInclination?: number;
  isDwarfPlanet?: boolean; // marca informativa (Plutón) — no afecta cálculos
  // Rutas opcionales a texturas de alta resolución. Si no se proveen, el
  // motor usa el material PBR basado en color como fallback fotorrealista.
  textures?: {
    map?: string;          // textura difusa/albedo
    normalMap?: string;    // mapa de normales (relieve de superficie, tangent-space)
    bumpMap?: string;      // mapa de relieve simple (escala de grises)
    roughnessMap?: string; // mapa de rugosidad
    cloudsMap?: string;    // capa de nubes (con canal alpha)
    ringMap?: string;      // textura del anillo (Júpiter/Saturno/Urano/Neptuno)
    nightLightsMap?: string; // luces de ciudades reales en el lado nocturno (solo Tierra)
  };
}

export interface ModifiedPhysicalData {
  massMultiplier: number; // 0.01x to 100x
  eccentricity: number; // 0.00 to 0.95
  semiMajorAxisMultiplier: number; // 0.3x to 3x
  radiusMultiplier: number; // 0.1x to 10x
}

export type ActiveTab = 'calculus' | 'series' | 'vectors' | 'manipulation';
export type CameraMode = 'free' | 'follow' | 'zenith' | 'ecliptic';

export interface AlertState {
  parameter: string;
  formula: string;
  prevValue: string;
  newValue: string;
  result: string;
}

export interface CometState {
  active: boolean;
  position: [number, number, number];
  semiMajorAxis: number;
  eccentricity: number;
  color: string;
  t: number;
}

export interface CollisionState {
  active: boolean;
  planetA: string;
  planetB: string;
  progress: number; // 0 to 1
  completed: boolean;
  mergedPlanetName?: string;
  data?: {
    combinedMass: number;
    combinedRadius: number;
    avgEccentricity: number;
    energyReleased: number;
    impactVelocity: number;
  };
}
