export type SolarDestination = 'sun' | 'planet' | 'system' | 'galaxy' | 'panorama';
export const SOLAR_MAX_DISTANCE = 250000;
export const SOLAR_MIN_DISTANCE = .05;
export const SOLAR_SYSTEM_DISTANCE = 145;
export const SOLAR_GALAXY_DISTANCE = 4200;
export const SOLAR_PANORAMA_DISTANCE = 45000;

export function logarithmicDistance(start: number, end: number, progress: number) {
  const t = Math.max(0, Math.min(1, progress));
  return Math.exp(Math.log(Math.max(SOLAR_MIN_DISTANCE, start)) * (1 - t) + Math.log(Math.max(SOLAR_MIN_DISTANCE, end)) * t);
}
export function distanceToZoom(distance: number, minimum=SOLAR_MIN_DISTANCE) {
  return Math.max(0, Math.min(100, 100 * Math.log(SOLAR_MAX_DISTANCE / Math.max(minimum, distance)) / Math.log(SOLAR_MAX_DISTANCE / minimum)));
}
export function zoomToDistance(zoom: number, minimum=SOLAR_MIN_DISTANCE) {
  return SOLAR_MAX_DISTANCE * Math.pow(minimum / SOLAR_MAX_DISTANCE, Math.max(0, Math.min(100, zoom)) / 100);
}
