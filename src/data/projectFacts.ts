import * as T from 'three';
import { CAMPUS_CORE_SITE, grad, landscape, MARS, ROUTE_LENGTH, SOLAR_ARRAY_LAYOUT, SOLAR_SUPPORT_LAYOUT, VOLUME, WATER_PLANT, WATER_PLANT_WALKWAY } from './marsMath.ts';
import { GREENHOUSE, GREENHOUSE_ACCESS_PORTAL, GREENHOUSE_BEDS, HABITAT, LAB_ACCESS, ROVER_LOGISTICS_TRANSFER, WORKSHOP_CARGO_LINK } from './marsHabitat.ts';
import { SOLAR_POWER_SERVICE } from './campusUtilities.ts';
import { evaluateServiceBalance, SERVICE_SCENARIO } from './campusServiceBalance.ts';

// Values used by the visible inventory and system summary. Derive them from
// the same layout and service scenario that the 3D scene and checks consume.
const route = ROVER_LOGISTICS_TRANSFER;
const routeCurve = new T.CatmullRomCurve3(
  route.waypoints.map(point => new T.Vector3(point.x, 0, point.z)),
  false,
  'centripetal',
);
let outdoorRouteMetres = 0;
let previous = routeCurve.getPoint(0);
for (let step = 1; step <= 3600; step++) {
  const current = routeCurve.getPoint(route.rampStartT * step / 3600);
  outdoorRouteMetres += current.distanceTo(previous);
  previous = current;
}
let stabilizedRouteMetres = 0;
previous = routeCurve.getPoint(route.stabilizedStartT);
for (let step = 1; step <= 3600; step++) {
  const current = routeCurve.getPoint(route.stabilizedStartT +
    (route.rampStartT - route.stabilizedStartT) * step / 3600);
  stabilizedRouteMetres += current.distanceTo(previous);
  previous = current;
}

const plantTop = Math.max(...Array.from({ length: 48 }, (_, index) => {
  const angle = index / 48 * Math.PI * 2;
  return landscape(
    WATER_PLANT.x + WATER_PLANT.foundationRadius * Math.cos(angle),
    WATER_PLANT.z + WATER_PLANT.foundationRadius * Math.sin(angle),
  );
})) + .675;
const treatmentRampMetres = WATER_PLANT_WALKWAY.endX - WATER_PLANT_WALKWAY.startX;
const treatmentRampGradePercent = 100 * (
  plantTop + WATER_PLANT_WALKWAY.endSurfaceOffset
  - landscape(WATER_PLANT_WALKWAY.startX, WATER_PLANT_WALKWAY.startY) - .13
) / treatmentRampMetres;
const service = evaluateServiceBalance();

export const PROJECT_FACTS = {
  coreSite: CAMPUS_CORE_SITE,
  coreSlopePercent: 100 * Math.hypot(...grad(CAMPUS_CORE_SITE.x, CAMPUS_CORE_SITE.z)),
  habitatSite: { x: HABITAT.x, z: HABITAT.z },
  greenhouseSite: GREENHOUSE,
  treatmentSite: WATER_PLANT,
  tankSite: { x: MARS.tankX, z: MARS.tankY },
  tankSemiaxes: { a: MARS.a, b: MARS.b, c: MARS.c },
  tankVolumeM3: VOLUME,
  labSites: LAB_ACCESS.map(({ x, z }) => ({ x, z })),
  roverArcMetres: ROUTE_LENGTH,
  greenhouseRampMetres: GREENHOUSE_ACCESS_PORTAL.x - GREENHOUSE_ACCESS_PORTAL.rampStartX,
  greenhouseFoliageInstances: GREENHOUSE_BEDS.columns * GREENHOUSE_BEDS.rowOffsets.length * 6,
  cargoLinkPlanMetres: Math.hypot(WORKSHOP_CARGO_LINK.endX - WORKSHOP_CARGO_LINK.startX, WORKSHOP_CARGO_LINK.endZ - WORKSHOP_CARGO_LINK.startZ),
  solarStudyPanels: SOLAR_ARRAY_LAYOUT.length,
  solarSupportPanels: SOLAR_SUPPORT_LAYOUT.length,
  solarTotalPanels: SOLAR_POWER_SERVICE.panels.length,
  solarPanelNominalAreaM2: 6,
  connectedElectricalLoads: service.electricity.electricDestinations,
  batteryNominalKwh: SERVICE_SCENARIO.batteryNominalKwh,
  generatedKwh: service.electricity.generatedKwh,
  connectedDemandKwh: service.electricity.connectedDemandKwh,
  minimumStoredKwh: service.electricity.minimumStoredKwh,
  irrigationTrays: service.water.trayCount,
  irrigationDeliveredLitres: service.water.deliveredIrrigationLitres,
  irrigationRawLitres: service.water.requiredRawLitres,
  treatmentRampMetres,
  treatmentRampGradePercent,
  roverOutdoorPlanMetres: outdoorRouteMetres,
  roverStabilizedPlanMetres: stabilizedRouteMetres,
} as const;
