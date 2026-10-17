import { PhysicalData, ModifiedPhysicalData, AlertState } from '../types';
import { G_CONSTANT, MASS_OF_SUN, EARTH_MASS_KG, EARTH_RADIUS_KM, AU_IN_KM } from '../data/planets';

// Core math helper to scientific notation
export function formatScientific(num: number, decimals: number = 3): string {
  if (Math.abs(num) < 0.0001 || Math.abs(num) >= 1000000) {
    return num.toExponential(decimals);
  }
  return num.toLocaleString('es-ES', { maximumFractionDigits: decimals });
}

// Compute physical bounds for any planet with dynamic multiplier
export function getModifiedProps(planet: PhysicalData, mod: ModifiedPhysicalData) {
  const massVal = planet.realMass * mod.massMultiplier * EARTH_MASS_KG; // kg
  const eVal = mod.eccentricity; // eccentricity
  const aVal = planet.semiMajorAxis * mod.semiMajorAxisMultiplier; // AU
  const rVal = planet.realRadius * mod.radiusMultiplier; // km

  // b = a * sqrt(1 - e^2)
  const bVal = aVal * Math.sqrt(1 - eVal * eVal); // AU

  // Focal distance c = a * e
  const cVal = aVal * eVal; // AU

  // Orbital Period from Kepler's Third Law: T^2 = a^3 (relative to Earth if Sun mass stays dominant)
  // Standard formulas: T = 2*pi * sqrt( a^3 / (G * (M_sun + m_planet)) )
  // Let's calculate orbital period dynamically
  const aInMeters = aVal * AU_IN_KM * 1000;
  const tSeconds = 2 * Math.PI * Math.sqrt(Math.pow(aInMeters, 3) / (G_CONSTANT * (MASS_OF_SUN + massVal)));
  const tYears = tSeconds / (365.25 * 24 * 3600);

  return {
    mass: massVal,
    e: eVal,
    a: aVal,
    b: bVal,
    c: cVal,
    r: rVal,
    tYears
  };
}

// ==========================================
// PESTAÑA 1 - UNIDAD I: INTEGRALES Y APLICACIONES
// ==========================================

export function calculateUnidadI(planet: PhysicalData, mod: ModifiedPhysicalData) {
  const p = getModifiedProps(planet, mod);

  // 1. Area of orbital ellipse: A = pi * a * b
  const areaAU2 = Math.PI * p.a * p.b;
  // --- Fix: el área en km² es areaAU2 convertido por el factor de escala al
  // cuadrado (1 AU² = AU_IN_KM² km²). La versión anterior multiplicaba por un
  // factor π extra erróneo, sobreestimando el área en π veces (~3.14x). -----
  const areaKm2 = areaAU2 * Math.pow(AU_IN_KM, 2);

  // 2. Ramanujan approximation of perimeter (Orbital arc length)
  const aKm = p.a * AU_IN_KM;
  const bKm = p.b * AU_IN_KM;
  const h = Math.pow(aKm - bKm, 2) / Math.pow(aKm + bKm, 2);
  const orbitalArcKm = Math.PI * (aKm + bKm) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
  const lightYearInKm = 9.460730472e12;
  const orbitalArcLY = orbitalArcKm / lightYearInKm;

  // 3. Volume of the planet: V = 4/3 * pi * r^3
  const volumeKm3 = (4 / 3) * Math.PI * Math.pow(p.r, 3);
  const earthRadius = EARTH_RADIUS_KM;
  const earthVolumeKm3 = (4 / 3) * Math.PI * Math.pow(earthRadius, 3);
  const volumeRel = volumeKm3 / earthVolumeKm3;

  // 4. Gravitational work in half-orbit: Perihelion to Aphelion
  // Perihelion position r_peri = a(1 - e)
  // Aphelion position r_afelio = a(1 + e)
  const rPeriMeters = p.a * (1 - p.e) * AU_IN_KM * 1000;
  const rAfelioMeters = p.a * (1 + p.e) * AU_IN_KM * 1000;
  
  // W = GMm / r_peri - GMm / r_afelio (net work on expansion is negative, but magnitude of potential difference is requested)
  // Let's use the absolute work or difference in energy
  const workJoules = G_CONSTANT * MASS_OF_SUN * p.mass * (1 / rPeriMeters - 1 / rAfelioMeters);

  // 5. Center of Mass (Barycenter) Sun-Planet
  // x_bar = (M_sol * 0 + m_planet * a) / (M_sol + m_planet)
  // Sun radius = 696340 km
  const barycenterKm = (p.mass * (p.a * AU_IN_KM)) / (MASS_OF_SUN + p.mass);
  const sunRadiusKm = 696340.0;
  const isInsideSun = barycenterKm < sunRadiusKm;

  // 6. Mean density: rho = mass / volume (converted to kg/m^3)
  const volCubicMeters = volumeKm3 * 1e9;
  const densityKgM3 = volCubicMeters > 0 ? p.mass / volCubicMeters : 0;
  const densityRelWater = densityKgM3 / 1000; // ratio to water density

  // 7. Escape velocity: v_esc = sqrt(2 * G * m_planet / r_planet)
  const rMeters = p.r * 1000;
  const vEscapeMs = rMeters > 0 ? Math.sqrt((2 * G_CONSTANT * p.mass) / rMeters) : 0;
  const vEscapeKms = vEscapeMs / 1000;

  return {
    areaAU2,
    areaKm2,
    orbitalArcKm,
    orbitalArcLY,
    volumeKm3,
    volumeRel,
    workJoules,
    barycenterKm,
    isInsideSun,
    densityKgM3,
    densityRelWater,
    vEscapeKms,
    periMeters: rPeriMeters,
    afelioMeters: rAfelioMeters
  };
}

// Generate data points for F(r) vs r graph
export function generateGravityGraphPoints(planetMassKg: number) {
  const points: { r: number; force: number }[] = [];
  // Distance from 1 Earth radius to 10 Earth radii
  const baseRadius = EARTH_RADIUS_KM * 1000; // meters
  for (let i = 1; i <= 20; i++) {
    const r = baseRadius * (i / 2);
    // Force on a test mass of 1kg: F = G * M * 1 / r^2
    const force = (G_CONSTANT * planetMassKg) / Math.pow(r, 2);
    points.push({ r: r / 1000, force }); // distance in km, force in N/kg
  }
  return points;
}

// ==========================================
// PESTAÑA 2 - UNIDAD II: SERIES Y PARAMÉTRICAS
// ==========================================

// Leibniz Series Solver for Pi
export function solveLeibnizPi(terms: number) {
  let sum = 0;
  const displayPoints: { n: number; val: number }[] = [];
  
  // Calculate to make graph rendering smooth (subsample up to 20 key steps for the chart)
  const recordIntervals = Math.max(1, Math.floor(terms / 15));
  
  for (let n = 0; n < terms; n++) {
    const term = Math.pow(-1, n) / (2 * n + 1);
    sum += term;
    
    if (n === 0 || n % recordIntervals === 0 || n === terms - 1) {
      displayPoints.push({ n: n + 1, val: sum * 4 });
    }
  }

  const approxPi = sum * 4;
  const errorAbs = Math.abs(Math.PI - approxPi);
  const errorPct = (errorAbs / Math.PI) * 100;

  return {
    approxPi,
    errorAbs,
    errorPct,
    points: displayPoints
  };
}

// Taylor Series of Orbital Velocity
// v(theta) = v_media * [1 + e*cos(theta) + e^2/2 * cos(2*theta) + e^3/2 * cos(3*theta) ...]
export function solveVelocityTaylor(p: ReturnType<typeof getModifiedProps>, thetaRad: number) {
  const v_media_kms = (2 * Math.PI * (p.a * AU_IN_KM)) / (p.tYears * 365.25 * 24 * 3600);
  
  const term0 = 1;
  const term1 = p.e * Math.cos(thetaRad);
  const term2 = (Math.pow(p.e, 2) / 2) * Math.cos(2 * thetaRad);
  const term3 = (Math.pow(p.e, 3) / 2) * Math.cos(3 * thetaRad); // order 3 coefficient is indeed e^3/2, let's keep it structurally
  
  const seriesSumFactor = term0 + term1 + term2 + term3;
  const vTaylor = v_media_kms * seriesSumFactor;

  // Exact velocity using Vis-Viva equation: v = sqrt( G * M * (2/r - 1/a) )
  const rCurrentMeters = (p.a * (1 - p.e * p.e)) / (1 + p.e * Math.cos(thetaRad)) * AU_IN_KM * 1000;
  const aInMeters = p.a * AU_IN_KM * 1000;
  const vExactMs = Math.sqrt(G_CONSTANT * (MASS_OF_SUN + p.mass) * (2 / rCurrentMeters - 1 / aInMeters));
  const vExactKms = vExactMs / 1000;

  const truncationErrorKms = Math.abs(vExactKms - vTaylor);
  const truncationErrorPct = (truncationErrorKms / vExactKms) * 100;

  return {
    v_media: v_media_kms,
    terms: [v_media_kms, v_media_kms * term1, v_media_kms * term2, v_media_kms * term3],
    vTaylor,
    vExact: vExactKms,
    truncationErrorKms,
    truncationErrorPct
  };
}

// Legendre Potential Series U(r) = -GMm/a * [ 1 + e*cos(theta) + e^2 * (3*cos^2(theta)-1)/2 ]
export function solveLegendreEnergy(p: ReturnType<typeof getModifiedProps>, thetaRad: number) {
  const u_factor = -(G_CONSTANT * MASS_OF_SUN * p.mass) / (p.a * AU_IN_KM * 1000); // Joules
  
  const p0 = 1;
  const p1 = Math.cos(thetaRad);
  const p2 = (3 * Math.pow(Math.cos(thetaRad), 2) - 1) / 2;

  const term0 = u_factor * p0;
  const term1 = u_factor * p.e * p1;
  const term2 = u_factor * Math.pow(p.e, 2) * p2;

  const approxU = term0 + term1 + term2;

  // Exact potential: U = - GMm / r
  const rCurrentMeters = (p.a * (1 - p.e * p.e)) / (1 + p.e * Math.cos(thetaRad)) * AU_IN_KM * 1000;
  const exactU = -(G_CONSTANT * MASS_OF_SUN * p.mass) / rCurrentMeters;

  return {
    u_factor,
    terms: [term0, term1, term2],
    approxU,
    exactU,
    error: Math.abs(exactU - approxU)
  };
}

// ==========================================
// PESTAÑA 3 - UNIDAD III: VECTORES Y CONICAS
// ==========================================

// Polar coordinates
export function solveUnidadIII(p: ReturnType<typeof getModifiedProps>, thetaRad: number) {
  // r(theta) = a * (1 - e^2) / (1 + e * cos(theta))
  const rAU = (p.a * (1 - p.e * p.e)) / (1 + p.e * Math.cos(thetaRad));
  const rKm = rAU * AU_IN_KM;

  // Real-time vector simulation (derived from mechanics)
  // Position vectors in heliocentric orbital coordinates (perifocal frame:
  // el Sol está en el FOCO de la elipse, que es el origen de este sistema).
  // --- Fix: antes se restaba `focalOffsetKm` (el centro geométrico de la
  // elipse), lo que desplazaba el vector posición fuera del foco solar. Eso
  // rompía la consistencia con r(θ) (|r⃗| ya no coincidía con rKm) y, más
  // grave, hacía que el momento angular L = r⃗ × v⃗ variara con θ en vez de
  // permanecer constante (violando la 2ª Ley de Kepler). Ahora el origen es
  // el Sol/foco, igual que en la fórmula de r(θ) y en v⃗ (marco perifocal). --
  const xKm = rKm * Math.cos(thetaRad);
  const yKm = rKm * Math.sin(thetaRad);
  const zKm = 0.0; // flat ecliptic grid reference

  // Velocity vectors
  // v_x = - sqrt(GM / (a(1-e^2))) * sin(theta)
  // v_y = sqrt(GM / (a(1-e^2))) * (e + cos(theta))
  const factorVel = Math.sqrt((G_CONSTANT * (MASS_OF_SUN + p.mass)) / (p.a * AU_IN_KM * 1000 * (1 - p.e * p.e))) / 1000; // km/s
  const vxKmS = -factorVel * Math.sin(thetaRad);
  const vyKmS = factorVel * (p.e + Math.cos(thetaRad));
  const vzKmS = 0.0;

  const vMagnitude = Math.sqrt(vxKmS * vxKmS + vyKmS * vyKmS);

  // Dot product position * velocity
  const dotProduct = xKm * vxKmS + yKm * vyKmS; 

  // Cross product (Specific Angular Momentum H = r x v)
  // Since 2D planar, L_z = x*vy - y*vx
  const LzKm2S = xKm * vyKmS - yKm * vxKmS;

  return {
    rAU,
    rKm,
    posVector: [xKm, yKm, zKm] as [number, number, number],
    velVector: [vxKmS, vyKmS, vzKmS] as [number, number, number],
    vMagnitude,
    dotProduct,
    specificAngularMomentum: LzKm2S,
    orbitType: p.e < 1.0 ? 'Elipse ✓' : p.e === 1.0 ? 'Parábola' : 'Hipérbola',
    perihelioKm: p.a * (1 - p.e) * AU_IN_KM,
    afelioKm: p.a * (1 + p.e) * AU_IN_KM
  };
}

// Kepler table calculators
export function getKeplerTableData(planets: PhysicalData[], planetModifiers: Record<string, ModifiedPhysicalData>) {
  return planets.map(p => {
    const mod = planetModifiers[p.name] || { massMultiplier: 1, eccentricity: p.eccentricity, semiMajorAxisMultiplier: 1, radiusMultiplier: 1 };
    const props = getModifiedProps(p, mod);
    const a = props.a; // in AU
    const T = props.tYears; // in Years
    const tSquared = T * T;
    const aCubed = a * a * a;
    const ratio = tSquared / aCubed;
    return {
      name: p.name,
      displayName: p.displayName,
      a,
      T,
      tSquared,
      aCubed,
      ratio
    };
  });
}
