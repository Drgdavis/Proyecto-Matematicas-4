import { solarState } from './marsSystems.ts';
import { GREENHOUSE_WATER_PORTS } from './marsHabitat.ts';
import { SOLAR_POWER_SERVICE } from './campusUtilities.ts';

/** Teaching scenario, not measured Mars operation or a certified utility design. */
export const SERVICE_SCENARIO = {
  cycleHours: 24, // Matches solarState's normalized local clock; not a Martian sol.
  activeFraction: .85, // Assumed, not measured from the photovoltaic-cell mesh.
  transmission: .7, // Sensitivity case, not a forecast of dust conditions.
  habitatKw: 4.5,
  treatmentKw: .6, // Includes an assumed pump and controls; no pump curve is known.
  batteryNominalKwh: 120,
  batteryUsableFraction: .8,
  chargeEfficiency: .9,
  dischargeEfficiency: .9,
  trayLitresPerCycle: 2,
  treatmentYield: .85,
  treatmentCapacityLitresPerCycle: 100,
  exampleRawInventoryLitres: 1000, // A scenario input, not the tank's proven contents.
  crew: 3,
  crewLitresPerCycle: 20, // Demand only: no pipe to the occupied habitat is drawn.
} as const;

/** Scale the original 20-panel solar demonstration to the connected array. */
export function solarEnergyKwh(activeFraction=SERVICE_SCENARIO.activeFraction, transmission=SERVICE_SCENARIO.transmission, panelCount=SOLAR_POWER_SERVICE.panels.length, subdivisions=2400) {
  if (!(activeFraction>=0&&activeFraction<=1&&transmission>=0&&transmission<=1)) throw new RangeError('Las fracciones deben estar entre 0 y 1.');
  if (!Number.isInteger(panelCount)||panelCount<1) throw new RangeError('El número de paneles debe ser entero positivo.');
  if (!Number.isInteger(subdivisions)||subdivisions<2||subdivisions%2) throw new RangeError('La integración requiere un número par de subintervalos.');
  let sum=0;
  for(let i=0;i<=subdivisions;i++)sum+=(i===0||i===subdivisions?1:i%2?4:2)*solarState(i/subdivisions).electricPower;
  return sum*SERVICE_SCENARIO.cycleHours/(3*subdivisions*1000)*activeFraction*transmission*panelCount/20;
}

export function evaluateServiceBalance(activeFraction=SERVICE_SCENARIO.activeFraction,transmission=SERVICE_SCENARIO.transmission,panelCount=SOLAR_POWER_SERVICE.panels.length){
  const a=SERVICE_SCENARIO;
  const electricDestinations=[SOLAR_POWER_SERVICE.habitat.id,SOLAR_POWER_SERVICE.treatment.id];
  const connectedDemandKw=a.habitatKw+a.treatmentKw;
  const generatedKwh=solarEnergyKwh(activeFraction,transmission,panelCount);
  const connectedDemandKwh=connectedDemandKw*a.cycleHours;
  // Dispatch is sampled from noon to noon, then repeated to remove the
  // arbitrary initial full-battery condition. Charging is clipped at 80% usable.
  const steps=2400,stepHours=a.cycleHours/steps,capacityKwh=a.batteryNominalKwh*a.batteryUsableFraction;
  let storedKwh=capacityKwh,dispatch={unservedKwh:0,curtailedKwh:0,minimumStoredKwh:capacityKwh,endingStoredKwh:capacityKwh};
  for(let cycle=0;cycle<3;cycle++){
    let unservedKwh=0,curtailedKwh=0,minimumStoredKwh=storedKwh;
    for(let i=0;i<steps;i++){
      const fraction=(.5+(i+.5)/steps)%1;
      const generationKw=solarState(fraction).electricPower/1000*panelCount/20*activeFraction*transmission;
      const netKwh=(generationKw-connectedDemandKw)*stepHours;
      if(netKwh>=0){const incoming=netKwh*a.chargeEfficiency;curtailedKwh+=Math.max(0,storedKwh+incoming-capacityKwh)/a.chargeEfficiency;storedKwh=Math.min(capacityKwh,storedKwh+incoming);}
      else{const required=-netKwh/a.dischargeEfficiency;unservedKwh+=Math.max(0,required-storedKwh)*a.dischargeEfficiency;storedKwh=Math.max(0,storedKwh-required);}
      minimumStoredKwh=Math.min(minimumStoredKwh,storedKwh);
    }
    dispatch={unservedKwh,curtailedKwh,minimumStoredKwh,endingStoredKwh:storedKwh};
  }
  const trayCount=GREENHOUSE_WATER_PORTS.length;
  const deliveredIrrigationLitres=trayCount*a.trayLitresPerCycle;
  const requiredRawLitres=deliveredIrrigationLitres/a.treatmentYield;
  const processLossLitres=requiredRawLitres-deliveredIrrigationLitres;
  const rawCyclesAtAssumedInventory=a.exampleRawInventoryLitres/requiredRawLitres;
  const unconnectedHabitatDemandLitres=a.crew*a.crewLitresPerCycle;
  const rawNeededWithHabitatLitres=(deliveredIrrigationLitres+unconnectedHabitatDemandLitres)/a.treatmentYield;
  return {
    period:'ciclo solar normalizado de 24 h',
    electricity:{panelCount,activeFraction,transmission,electricDestinations,connectedDemandKw,generatedKwh,connectedDemandKwh,
      grossDifferenceKwh:generatedKwh-connectedDemandKwh,batteryNominalKwh:a.batteryNominalKwh,
      batteryUsableKwh:capacityKwh,chargeEfficiency:a.chargeEfficiency,dischargeEfficiency:a.dischargeEfficiency,
      ...dispatch},
    water:{trayCount,deliveredIrrigationLitres,requiredRawLitres,processLossLitres,
      treatmentCapacityLitresPerCycle:a.treatmentCapacityLitresPerCycle,
      unusedTreatmentCapacityLitres:a.treatmentCapacityLitresPerCycle-requiredRawLitres,
      rawCyclesAtAssumedInventory,unconnectedHabitatDemandLitres,rawNeededWithHabitatLitres,
      rawCapacityShortfallWithHabitatLitres:Math.max(0,rawNeededWithHabitatLitres-a.treatmentCapacityLitresPerCycle)},
  };
}
