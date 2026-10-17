import { assetUrl } from '../utils/assetUrl';
import { PhysicalData } from '../types';

export const G_CONSTANT = 6.6743e-11; // m^3 kg^-1 s^-2
export const MASS_OF_SUN = 1.989e30; // kg
export const EARTH_MASS_KG = 5.9722e24; // kg
export const EARTH_RADIUS_KM = 6371.0; // km
export const AU_IN_KM = 1.495978707e8; // km
export const J2000_EPOCH = new Date(2000, 0, 1, 12, 0, 0);

// Texturas de contexto visual; procedencia y permisos individuales pendientes
// en public/textures/ATTRIBUTION.md. No participan en los cálculos matemáticos.
const TEX = assetUrl('/textures/');

export const PLANETS_DATA: PhysicalData[] = [
  {
    name: 'mercury',
    displayName: 'Mercurio',
    realMass: 0.0553,
    realRadius: 2439.7,
    semiMajorAxis: 0.3871,
    eccentricity: 0.2056,
    orbitalPeriod: 0.2408,
    axialTilt: 0.034,
    rotationPeriod: 58.646,
    color: '#8c8c94',
    specular: '#4f4f54',
    shininess: 2,
    emissive: '#111112',
    description: 'El planeta más cercano al Sol. Pequeño, denso y cubierto de cráteres con temperaturas extremas sin atmósfera.',
    roughness: 0.92, metalness: 0.05,
    textures: { map: TEX + 'mercurymap.jpg', bumpMap: TEX + 'mercurybump.jpg' },
    moons: []
  },
  {
    name: 'venus',
    displayName: 'Venus',
    realMass: 0.815,
    realRadius: 6051.8,
    semiMajorAxis: 0.7233,
    eccentricity: 0.0068,
    orbitalPeriod: 0.6152,
    axialTilt: 177.3,
    rotationPeriod: -243.02,
    color: '#e3bb76',
    specular: '#3d301b',
    shininess: 90,
    emissive: '#2b1a0e',
    description: 'Posee una atmósfera superdensa de CO₂ que atrapa el calor en un efecto invernadero desbocado, haciéndolo el más caliente.',
    roughness: 0.55, metalness: 0.0, hasAtmosphere: true, atmosphereColor: '#f0c98a',
    textures: { map: TEX + 'venusmap2.jpg' },
    moons: []
  },
  {
    name: 'earth',
    displayName: 'Tierra',
    realMass: 1.0,
    realRadius: 6371.0,
    semiMajorAxis: 1.0,
    eccentricity: 0.0167,
    orbitalPeriod: 1.0,
    axialTilt: 23.44,
    rotationPeriod: 0.9973,
    color: '#2b82c9',
    specular: '#2244aa',
    shininess: 45,
    emissive: '#09152b',
    description: 'Nuestro hogar en el cosmos. El único planeta conocido con agua líquida superficial y abundante biodiversidad activa.',
    roughness: 0.62, metalness: 0.08, hasAtmosphere: true, atmosphereColor: '#6db8ff',
    textures: { map: TEX + 'earthmap.jpg', normalMap: TEX + 'earthnormal.jpg', cloudsMap: TEX + 'earthclouds.png', nightLightsMap: TEX + 'earthlights.png' },
    moons: [
      {
        name: 'Luna',
        radius: 0.2, // relative to Earth size
        semiMajorAxis: 1.8, // relative distance
        orbitalPeriod: 27.3,
        color: '#aaaaaa',
        realRadiusKm: 1737.4,
        realDistanceKm: 384400,
        description: 'Único satélite natural de la Tierra. Su gravedad estabiliza el eje terrestre y genera las mareas oceánicas.',
        textures: { map: TEX + 'moonmap.jpg', bumpMap: TEX + 'moonbump.jpg' }
      }
    ]
  },
  {
    name: 'mars',
    displayName: 'Marte',
    realMass: 0.107,
    realRadius: 3389.5,
    semiMajorAxis: 1.5237,
    eccentricity: 0.0934,
    orbitalPeriod: 1.8808,
    axialTilt: 25.19,
    rotationPeriod: 1.026,
    color: '#c1440e',
    specular: '#2b0c03',
    shininess: 5,
    emissive: '#1c0702',
    description: 'El planeta rojo debido al óxido de hierro en su superficie. Alberga gigantes volcanes inactivos y grandes cañones tectónicos.',
    roughness: 0.88, metalness: 0.04,
    hasAtmosphere: true,
    atmosphereColor: '#d98255',
    textures: { map: assetUrl('/assets/nasa/mars-viking-texture.webp'), bumpMap: TEX + 'marsbump.jpg' },
    moons: [
      {
        name: 'Fobos',
        radius: 0.045,
        semiMajorAxis: 1.5,
        orbitalPeriod: 0.319,
        color: '#9a8a7a',
        realRadiusKm: 11.27,
        realDistanceKm: 9377,
        description: 'La mayor y más interna de las lunas marcianas. Orbita tan rápido que sale dos veces al día desde la superficie de Marte.',
        textures: { map: TEX + 'phobosmap.jpg' }
      },
      {
        name: 'Deimos',
        radius: 0.03,
        semiMajorAxis: 2.0,
        orbitalPeriod: 1.262,
        color: '#a89888',
        realRadiusKm: 6.2,
        realDistanceKm: 23460,
        description: 'La luna más pequeña y externa de Marte. Su origen probable es un asteroide capturado por la gravedad marciana.',
        textures: { map: TEX + 'deimosmap.jpg' }
      }
    ]
  },
  {
    name: 'jupiter',
    displayName: 'Júpiter',
    realMass: 317.8,
    realRadius: 69911.0,
    semiMajorAxis: 5.2044,
    eccentricity: 0.0489,
    orbitalPeriod: 11.8626,
    axialTilt: 3.13,
    rotationPeriod: 0.4135,
    color: '#d4a373',
    specular: '#332211',
    shininess: 20,
    emissive: '#1a120a',
    description: 'El gigante gaseoso más masivo del sistema. Compuesto de hidrógeno y helio, característico por sus bandas de tormentas paralelas.',
    roughness: 0.65, metalness: 0.0,
    textures: { map: TEX + 'jupitermap.jpg', ringMap: TEX + 'jupiterrings.png' },
    moons: [
      {
        name: 'Ío', radius: 0.09, semiMajorAxis: 2.2, orbitalPeriod: 1.769, color: '#ffd60a',
        realRadiusKm: 1821.6, realDistanceKm: 421800,
        description: 'La luna con mayor actividad volcánica del sistema solar, esculpida por las fuerzas de marea de Júpiter.',
        textures: { map: TEX + 'iomap.jpg' }
      },
      {
        name: 'Europa', radius: 0.08, semiMajorAxis: 2.7, orbitalPeriod: 3.551, color: '#e0e1dd',
        realRadiusKm: 1560.8, realDistanceKm: 671100,
        description: 'Su corteza de hielo cubre un océano subsuperficial, candidato principal a albergar condiciones para vida.',
        textures: { map: TEX + 'europamap.jpg' }
      },
      {
        name: 'Ganímedes', radius: 0.12, semiMajorAxis: 3.4, orbitalPeriod: 7.155, color: '#aaaaaa',
        realRadiusKm: 2634.1, realDistanceKm: 1070400,
        description: 'La luna más grande del sistema solar, mayor incluso que Mercurio. Único satélite con campo magnético propio.',
        textures: { map: TEX + 'ganymedemap.jpg' }
      },
      {
        name: 'Calisto', radius: 0.11, semiMajorAxis: 4.2, orbitalPeriod: 16.689, color: '#777777',
        realRadiusKm: 2410.3, realDistanceKm: 1882700,
        description: 'La más externa de las lunas galileanas, con la superficie más antigua y craterizada del sistema joviano.',
        textures: { map: TEX + 'callistomap.jpg' }
      }
    ]
  },
  {
    name: 'saturn',
    displayName: 'Saturno',
    realMass: 95.2,
    realRadius: 58232.0,
    semiMajorAxis: 9.5826,
    eccentricity: 0.0541,
    orbitalPeriod: 29.4475,
    axialTilt: 26.73,
    rotationPeriod: 0.444,
    color: '#e9c46a',
    specular: '#2e2612',
    shininess: 25,
    emissive: '#17130a',
    description: 'Famoso por su increíble sistema de anillos helados que giran de forma ecuatorial de forma compacta.',
    roughness: 0.6, metalness: 0.0,
    textures: { map: TEX + 'saturnmap.jpg', ringMap: TEX + 'saturnrings.png' },
    moons: [
      {
        name: 'Titán', radius: 0.12, semiMajorAxis: 3.2, orbitalPeriod: 15.945, color: '#f5cb5c',
        realRadiusKm: 2574.7, realDistanceKm: 1221870,
        description: 'La única luna del sistema solar con una atmósfera densa propia y lagos de metano líquido en su superficie.',
        textures: { map: TEX + 'titanclouds.jpg' }
      },
      {
        name: 'Rea', radius: 0.07, semiMajorAxis: 3.7, orbitalPeriod: 4.518, color: '#cfcfcf',
        realRadiusKm: 763.8, realDistanceKm: 527068,
        description: 'Segunda luna más grande de Saturno, compuesta principalmente de hielo de agua.',
        textures: { map: TEX + 'rheamap.jpg' }
      },
      {
        name: 'Tetis', radius: 0.055, semiMajorAxis: 2.6, orbitalPeriod: 1.888, color: '#d8d8d8',
        realRadiusKm: 533.0, realDistanceKm: 294672,
        description: 'Luna helada con un enorme cañón, Ithaca Chasma, que recorre casi tres cuartos de su circunferencia.',
        textures: { map: TEX + 'tethysmap.jpg' }
      },
      {
        name: 'Dione', radius: 0.058, semiMajorAxis: 2.9, orbitalPeriod: 2.737, color: '#c9c9c9',
        realRadiusKm: 561.4, realDistanceKm: 377415,
        description: 'Presenta acantilados de hielo brillante visibles desde gran distancia, resultado de fracturas tectónicas.',
        textures: { map: TEX + 'dionemap.jpg' }
      },
      {
        name: 'Encélado', radius: 0.04, semiMajorAxis: 2.3, orbitalPeriod: 1.370, color: '#f0f5f8',
        realRadiusKm: 252.1, realDistanceKm: 238037,
        description: 'Expulsa géiseres de agua helada desde su polo sur, alimentando el anillo E de Saturno.',
        textures: { map: TEX + 'enceladusmap.jpg' }
      },
      {
        name: 'Mimas', radius: 0.032, semiMajorAxis: 2.0, orbitalPeriod: 0.942, color: '#bdbdbd',
        realRadiusKm: 198.2, realDistanceKm: 185539,
        description: 'Conocida como la "Estrella de la Muerte" por su enorme cráter de impacto Herschel.',
        textures: { map: TEX + 'mimasmap.jpg' }
      },
      {
        name: 'Jápeto', radius: 0.06, semiMajorAxis: 5.5, orbitalPeriod: 79.33, color: '#8a8378',
        realRadiusKm: 734.5, realDistanceKm: 3560820,
        description: 'Tiene un hemisferio extremadamente oscuro y otro brillante, dándole una apariencia de "yin-yang".',
        textures: { map: TEX + 'iapetusmap.jpg' }
      }
    ]
  },
  {
    name: 'uranus',
    displayName: 'Urano',
    realMass: 14.5,
    realRadius: 25362.0,
    semiMajorAxis: 19.2184,
    eccentricity: 0.0472,
    orbitalPeriod: 84.0168,
    axialTilt: 97.77,
    rotationPeriod: -0.718,
    color: '#a8dadc',
    specular: '#223d3d',
    shininess: 15,
    emissive: '#092121',
    description: 'Un gigante de hielo cuya inclinación axial de casi 98° hace que ruede lateralmente sobre su órbita alrededor del Sol.',
    roughness: 0.45, metalness: 0.05,
    textures: { map: TEX + 'uranusmap.jpg', ringMap: TEX + 'uranusrings.png' },
    moons: [
      {
        name: 'Titania', radius: 0.05, semiMajorAxis: 2.4, orbitalPeriod: 8.706, color: '#9aa0a8',
        realRadiusKm: 788.4, realDistanceKm: 436300,
        description: 'La luna más grande de Urano, con extensos cañones y acantilados de hasta 5 km de altura.',
        textures: { map: TEX + 'titaniamap.jpg' }
      },
      {
        name: 'Oberón', radius: 0.048, semiMajorAxis: 3.1, orbitalPeriod: 13.46, color: '#8e8e96',
        realRadiusKm: 761.4, realDistanceKm: 583500,
        description: 'La más externa y masiva de las grandes lunas de Urano, con una superficie muy craterizada.',
        textures: { map: TEX + 'oberonmap.jpg' }
      },
      {
        name: 'Umbriel', radius: 0.04, semiMajorAxis: 1.9, orbitalPeriod: 4.144, color: '#5c5c62',
        realRadiusKm: 584.7, realDistanceKm: 266000,
        description: 'La luna más oscura del sistema uraniano, con un misterioso anillo brillante llamado "Wunda".',
        textures: { map: TEX + 'umbrielmap.jpg' }
      },
      {
        name: 'Ariel', radius: 0.042, semiMajorAxis: 1.6, orbitalPeriod: 2.520, color: '#b8bcc2',
        realRadiusKm: 578.9, realDistanceKm: 190900,
        description: 'La superficie con menos cráteres y más joven de las lunas grandes de Urano, con valles extensos.',
        textures: { map: TEX + 'arielmap.jpg' }
      },
      {
        name: 'Miranda', radius: 0.028, semiMajorAxis: 1.3, orbitalPeriod: 1.413, color: '#aeb2b8',
        realRadiusKm: 235.8, realDistanceKm: 129390,
        description: 'La luna más pequeña y cercana de las grandes de Urano, con un terreno extremadamente variado y fracturado.',
        textures: { map: TEX + 'mirandamap.jpg' }
      }
    ]
  },
  {
    name: 'neptuno',
    displayName: 'Neptuno',
    realMass: 17.1,
    realRadius: 24622.0,
    semiMajorAxis: 30.0703,
    eccentricity: 0.0086,
    orbitalPeriod: 164.7913,
    axialTilt: 28.32,
    rotationPeriod: 0.671,
    color: '#457b9d',
    specular: '#11293d',
    shininess: 25,
    emissive: '#051121',
    description: 'El planeta gigante de hielo más alejado del Sol. Azotado constantemente por los vientos más veloces del sistema solar.',
    roughness: 0.42, metalness: 0.06,
    textures: { map: TEX + 'neptunemap.jpg', ringMap: TEX + 'neptunerings.png' },
    moons: [
      {
        name: 'Tritón', radius: 0.09, semiMajorAxis: 2.5, orbitalPeriod: 5.877, color: '#e8d8c8',
        realRadiusKm: 1353.4, realDistanceKm: 354759,
        description: 'La única gran luna del sistema solar con órbita retrógrada; probablemente un objeto del Cinturón de Kuiper capturado.',
        textures: { map: TEX + 'tritonmap.jpg' }
      },
      {
        name: 'Proteo', radius: 0.04, semiMajorAxis: 1.7, orbitalPeriod: 1.122, color: '#7a7a7a',
        realRadiusKm: 210.0, realDistanceKm: 117647,
        description: 'Una de las lunas más oscuras del sistema solar, de forma irregular y muy cercana a Neptuno.',
        textures: { map: TEX + 'proteusmap.jpg' }
      }
    ]
  },
  {
    // --- Overhaul: Plutón (planeta enano) ------------------------------------
    // No es uno de los 8 planetas principales, pero se incluye con datos 100%
    // reales por su valor educativo: excentricidad altísima (0.2488 — la
    // mayor de todo el sistema), inclinación orbital real (17.16°, la única
    // que se modela inclinada de verdad) y su luna Caronte, tan grande en
    // proporción que ambos están acoplados por marea mutuamente (los dos
    // siempre se muestran la misma cara — un "planeta doble" de facto).
    name: 'pluto',
    displayName: 'Plutón',
    realMass: 0.00218,
    realRadius: 1188.3,
    semiMajorAxis: 39.482,
    eccentricity: 0.2488,
    orbitalPeriod: 247.94,
    axialTilt: 122.53,
    rotationPeriod: -6.387,
    color: '#cbb89a',
    specular: '#3a342a',
    shininess: 8,
    emissive: '#0d0b08',
    description: 'Planeta enano del Cinturón de Kuiper. Su órbita es la más excéntrica e inclinada (17.16°) del sistema — a veces queda más cerca del Sol que Neptuno.',
    roughness: 0.85, metalness: 0.03,
    orbitalInclination: 17.16,
    isDwarfPlanet: true,
    textures: { map: TEX + 'plutomap.jpg' },
    moons: [
      {
        name: 'Caronte', radius: 0.09, semiMajorAxis: 1.6, orbitalPeriod: 6.387, color: '#a89888',
        realRadiusKm: 606.0, realDistanceKm: 19591,
        description: 'Tan grande respecto a Plutón (mitad de su tamaño) que el sistema gira sobre un centro de masa fuera de Plutón. Ambos están acoplados por marea: siempre se muestran la misma cara.',
        textures: { map: TEX + 'charonmap.jpg' }
      }
    ]
  }
];

// Visual 3D scaling metrics to ensure they display beautifully and can be observed inside the viewport
export const VISUAL_SCALE = {
  // distances in 3D scene corresponding to planets
  // --- Overhaul: mayor separación entre órbitas (estilo NASA Eyes) para una
  // lectura más clara del sistema — sigue sin ser escala lineal real en AU
  // (sería impracticable visualmente: Neptuno está 77x más lejos que Mercurio),
  // pero ahora con más "aire" entre cada anillo orbital. ----------------------
  distances: {
    mercury: 14,
    venus: 21,
    earth: 28,
    mars: 36,
    jupiter: 50,
    saturn: 66,
    uranus: 82,
    neptuno: 98,
    pluto: 118
  } as Record<string, number>,

  // 3D sizes of planets for clear readability
  sizes: {
    mercury: 0.35,
    venus: 0.58,
    earth: 0.60,
    mars: 0.45,
    jupiter: 1.55,
    saturn: 1.25,
    uranus: 0.90,
    neptuno: 0.88,
    pluto: 0.19
  } as Record<string, number>,

  // rings dimensions relative to planet size
  saturnRings: { inner: 1.6, outer: 2.8 },
  uranusRings: { inner: 1.4, outer: 1.7 },
  // --- Overhaul Visual: anillos sutiles de Júpiter y Neptuno (aditivo) -------
  jupiterRings: { inner: 1.4, outer: 1.8 },
  neptuneRings: { inner: 1.4, outer: 1.7 }
};
