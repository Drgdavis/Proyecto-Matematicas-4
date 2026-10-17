import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inventory, sectors, coverage } from '../src/data/expeditionAudit.ts';
import { PROJECT_FACTS as facts } from '../src/data/projectFacts.ts';
import { EVA_PHASES } from '../src/data/eva01Project.ts';
import { PRESENTATION_SECTIONS } from '../src/data/presentationSlides.ts';
import { CAMPUS_CORE_SITE, grad, MARS, REGION_AREA, REGION_VOLUME, ROUTE_LENGTH, VOLUME, MASS, CM, SOLAR_ARRAY_LAYOUT, SOLAR_SUPPORT_LAYOUT, WATER_PLANT, tankFloor } from '../src/data/marsMath.ts';
import { mathSolutions } from '../src/data/mathSolutions.ts';
import { academicDevelopment } from '../src/data/academicDevelopment.ts';
import { dustState, iceCriteria, oxygenState, shieldState, roverEnergyState } from '../src/data/researchScenarios.ts';
import { SOLAR_POWER_SERVICE } from '../src/data/campusUtilities.ts';
import { SERVICE_SCENARIO } from '../src/data/campusServiceBalance.ts';
import * as T from 'three';
import { createColonyCampus } from '../src/components/colonyCampus.ts';
import { GREENHOUSE, GREENHOUSE_ACCESS_PORTAL, GREENHOUSE_BEDS, GREENHOUSE_WATER_PORTS, LAB_ACCESS, WORKSHOP_CARGO_LINK } from '../src/data/marsHabitat.ts';

const source = readFileSync(new URL('../src/Expedition.tsx', import.meta.url), 'utf8');
const audit = readFileSync(new URL('../public/materials/Auditoria_EVA03_Maestra.md', import.meta.url), 'utf8');
const current = audit.slice(0, audit.indexOf('## 6. Hallazgos y condiciones de cierre'));
const compactNumbers = current.replace(/(?<=\d) (?=\d)/g, '');
const contract = current.slice(current.indexOf('## 4. Contrato matemático'), current.indexOf('## 5. Inventario constructivo'));
const inventoryText = current.slice(current.indexOf('## 5. Inventario constructivo'));
const item = label => {
  const found = inventory.find(row => row.system.startsWith(label));
  assert.ok(found, `Falta ficha visible: ${label}`);
  return found;
};
const comma = (value, decimals) => value.toFixed(decimals).replace('.', ',');

// The official rubric is 100 points. Scene/topic counts are current inventory,
// never a proxy for completed visual review or a grade.
assert.equal(coverage.reduce((sum, [, points]) => sum + Number(points), 0), 100);
assert.equal(EVA_PHASES.reduce((sum, phase) => sum + phase.steps.length, 0), 53);
assert.equal(new Set(EVA_PHASES.flatMap(phase => phase.steps.map(step => step.name))).size, 53);
assert.equal(inventory.length, 27, 'El inventario visible debe mantener todas las categorías físicas, matemáticas y de contexto auditadas.');
for (const row of inventory) {
  assert.ok(row.count && row.system && row.purpose.length > 25 && row.basis.length > 40, `Ficha incompleta: ${row.system}`);
  assert.match(row.basis, /no |sin |falta|fuera|supuest|conceptual|representaci|no se/i, `La ficha carece de límite explícito: ${row.system}`);
}
assert.ok(PRESENTATION_SECTIONS.every(section => section.stepNames.every(name =>
  EVA_PHASES.some(phase => phase.steps.some(step => step.name === name))
)), 'El índice menciona un tema que no existe en el programa.');
const campus = createColonyCampus(new T.Texture());
assert.equal(campus.spatialInventory.length, 16);
assert.equal(campus.ringJunctions.length, 8);
assert.deepEqual([campus.hub.x, campus.hub.z], [CAMPUS_CORE_SITE.x, CAMPUS_CORE_SITE.z]);
const coreSlopePercent = Math.hypot(...grad(campus.hub.x, campus.hub.z)) * 100;
assert.ok(Math.abs(facts.coreSlopePercent - coreSlopePercent) < 1e-12);
assert.ok(item('Núcleo geodésico').basis.includes(`${comma(coreSlopePercent, 3)} %`));
assert.ok(sectors.some(sector => sector.name === 'Núcleo y anillo' &&
  sector.position[0] === campus.hub.x && sector.position[2] === campus.hub.z &&
  sector.math.includes(`${comma(coreSlopePercent, 3)} %`) &&
  sector.math.includes('no es B⁺')));
assert.ok(coreSlopePercent > 3.788 && item('Núcleo geodésico').basis.includes('no por menor pendiente que B⁺'),
  'El núcleo prioriza centralidad; no debe atribuirse el mínimo de B⁺.');
assert.equal(item('Cápsulas habitacionales').count, String(campus.spatialInventory.length));
assert.equal(item('Nodos del anillo central').count, String(campus.ringJunctions.length));
assert.equal(item('Laboratorios').count, String(LAB_ACCESS.length));
assert.equal(campus.accessPorts.length, campus.spatialInventory.length);
const capsuleStairs = campus.accessPorts.filter(port => port.accessType === 'escalera').length;
const capsuleRamps = campus.accessPorts.filter(port => port.accessType === 'rampa').length;
assert.equal(capsuleStairs + capsuleRamps, campus.spatialInventory.length);
const wingCounts = {
  east: campus.accessPorts.filter(port => port.junctionX > 0).length,
  north: campus.accessPorts.filter(port => port.junctionZ >= 49).length,
  west: campus.accessPorts.filter(port => port.junctionX < -8).length,
};
assert.equal(Object.values(wingCounts).reduce((sum, count) => sum + count, 0), campus.accessPorts.length);
for (const count of [capsuleStairs, capsuleRamps, wingCounts.east, wingCounts.north, wingCounts.west])
  assert.ok(item('Cápsulas habitacionales').basis.includes(String(count)), `La ficha de cápsulas omite ${count}.`);
assert.equal(campus.junctions.length, 8);
assert.equal(campus.junctions.reduce((sum, junction) => sum + junction.ports.length, 0), 29);
assert.equal(campus.ringJunctions.reduce((sum, junction) => sum + junction.ports.length, 0), 24);
assert.equal(campus.junctions.reduce((sum, junction) => sum + junction.supports.length, 0) +
  campus.ringJunctions.reduce((sum, junction) => sum + junction.supports.length, 0), 66);
assert.equal(campus.trunkSupports.length, 68);
assert.ok(campus.coreEastPortal && campus.coreNorthEastPortal);
assert.equal(29 + 24 + 2, 55, 'El total de huecos de campus incluye las dos entradas del núcleo.');
assert.equal(GREENHOUSE_WATER_PORTS.length, GREENHOUSE_BEDS.columns * GREENHOUSE_BEDS.rowOffsets.length);
assert.ok(item('Invernadero experimental').basis.includes(String(GREENHOUSE_WATER_PORTS.length)));
assert.deepEqual(facts.tankSite, {x:MARS.tankX,z:MARS.tankY});
assert.deepEqual(facts.tankSemiaxes, {a:MARS.a,b:MARS.b,c:MARS.c});
assert.equal(facts.tankVolumeM3,VOLUME);
assert.ok(item('Depósito E').system.includes(`(${MARS.tankX}, ${MARS.tankY})`));
assert.ok(item('Depósito E').basis.includes(`${MARS.a}×${MARS.b}×${MARS.c} m; V=${comma(VOLUME,3)} m³`));
assert.deepEqual([facts.treatmentSite.x,facts.treatmentSite.z],[WATER_PLANT.x,WATER_PLANT.z]);
assert.ok(item('Planta de tratamiento').system.includes(`(${WATER_PLANT.x}, ${WATER_PLANT.z})`));
assert.deepEqual([facts.greenhouseSite.x,facts.greenhouseSite.z],[GREENHOUSE.x,GREENHOUSE.z]);
assert.ok(item('Invernadero experimental').system.includes(`(${GREENHOUSE.x}, ${GREENHOUSE.z})`));
assert.equal(facts.greenhouseRampMetres,GREENHOUSE_ACCESS_PORTAL.x-GREENHOUSE_ACCESS_PORTAL.rampStartX);
assert.equal(facts.greenhouseFoliageInstances,GREENHOUSE_BEDS.columns*GREENHOUSE_BEDS.rowOffsets.length*6);
assert.ok(item('Invernadero experimental').basis.includes(`${facts.greenhouseFoliageInstances} instancias`));
assert.ok(item('Invernadero experimental').basis.includes(`${comma(facts.greenhouseRampMetres,1)} m`));
assert.deepEqual(facts.labSites,LAB_ACCESS.map(({x,z})=>({x,z})));
for(const {x,z} of facts.labSites)assert.ok(item('Laboratorios').system.includes(`(${x}, ${z})`));
assert.equal(facts.roverArcMetres,ROUTE_LENGTH);
assert.ok(item('Rover Perseverance').basis.includes(`${comma(ROUTE_LENGTH,3)} m`));
const cargoLinkPlanMetres=Math.hypot(WORKSHOP_CARGO_LINK.endX-WORKSHOP_CARGO_LINK.startX,WORKSHOP_CARGO_LINK.endZ-WORKSHOP_CARGO_LINK.startZ);
assert.ok(Math.abs(facts.cargoLinkPlanMetres-cargoLinkPlanMetres)<1e-12);
assert.ok(item('Taller del rover').basis.includes(`${comma(cargoLinkPlanMetres,3)} m`));

// The visual installations, power topology, scenario and live copy must agree.
assert.equal(facts.solarStudyPanels, SOLAR_ARRAY_LAYOUT.length);
assert.equal(facts.solarSupportPanels, SOLAR_SUPPORT_LAYOUT.length);
assert.equal(facts.solarTotalPanels, SOLAR_POWER_SERVICE.panels.length);
assert.equal(facts.solarTotalPanels, facts.solarStudyPanels + facts.solarSupportPanels);
assert.deepEqual(new Set(facts.connectedElectricalLoads), new Set(['habitat', 'tratamiento']));
assert.equal(facts.batteryNominalKwh, SERVICE_SCENARIO.batteryNominalKwh);
assert.equal(item('Paneles solares').count, String(facts.solarTotalPanels));
for (const value of [facts.solarStudyPanels, facts.solarSupportPanels, facts.solarTotalPanels, facts.batteryNominalKwh]) {
  assert.ok(item('Paneles solares').basis.includes(String(value)), `La ficha solar omite ${value}.`);
}
assert.ok(sectors.some(sector => sector.name.includes('Campo solar') &&
  sector.math.includes(comma(facts.generatedKwh, 3)) &&
  sector.math.includes(comma(facts.connectedDemandKwh, 3)) &&
  sector.math.includes('No demuestra autonomía')));
assert.ok(source.includes('PROJECT_FACTS.solarSupportPanels') && source.includes('PROJECT_FACTS.batteryNominalKwh'));
assert.ok(!source.includes('139,0 m') && !source.includes('sin simular almacenamiento ni distribución'));

// Access and water figures come from the geometry and the connected outlets.
assert.ok(item('Planta de tratamiento').basis.includes(`${comma(facts.treatmentRampMetres, 1)} m al ${comma(facts.treatmentRampGradePercent, 3)} %`));
assert.ok(item('Plataforma logística').basis.includes(`${comma(facts.roverOutdoorPlanMetres, 3)} m`));
assert.ok(item('Plataforma logística').basis.includes(`${comma(facts.roverStabilizedPlanMetres, 3)} m`));
assert.ok(item('Invernadero experimental').basis.includes(String(facts.irrigationTrays)));
assert.ok(sectors.some(sector => sector.name === 'Depósito y tratamiento' &&
  sector.math.includes(comma(facts.irrigationRawLitres, 3)) &&
  sector.reference.includes('No existe ramal de agua al hábitat')));

// Check the current master contract, excluding dated records intentionally
// retained as history. These are useful export invariants for the final report.
for (const token of [
  `44`, `24`, `120 kWh`, `7.299 %`, `127.950 m`,
  ROUTE_LENGTH.toFixed(3), REGION_AREA.toFixed(6), REGION_VOLUME.toFixed(6),
  VOLUME.toFixed(6), MASS.toFixed(6), CM[2].toFixed(9),
]) assert.ok(compactNumbers.includes(token), `La auditoría vigente no contiene ${token}.`);
assert.match(contract, /20×6=120 m²/);
assert.match(contract, /Otros24 paneles/);
assert.match(inventoryText, /supuestos.*riego|consumo y rendimiento \*\*supuestos\*\*/s);
assert.ok(!/Sin fracción activa exacta, almacenamiento, distribución ni autonomía demostrados/.test(contract));
assert.ok(!/corredor seguro|corredor de diseño supuesto|dos extremos del corredor|B fija la ubicación seleccionada/i.test(source + EVA_PHASES.map(phase => phase.steps.map(step => `${step.result} ${step.why}`).join(' ')).join(' ')), 'B⁺ debe describirse como acceso sobre la frontera de comparación, no como todo el campus ni una carretera segura.');

// The editable written deliverables and the live mathematical dialog must
// agree with the current site and results before the PDFs are regenerated.
const report = readFileSync(new URL('../public/materials/Informe_Tecnico_EVA03_Fuente.md', import.meta.url), 'utf8');
const appendix = readFileSync(new URL('../public/materials/Anexo_Matematico_EVA03_Fuente.md', import.meta.url), 'utf8');
const liveTankMath = mathSolutions['Transformación y límites'].steps.find(step => step.title === 'Ubicar el marco local').math;
const liveTankProse = academicDevelopment['Transformación y límites'].working.join(' ');
assert.ok(liveTankMath.includes(`(${MARS.tankX}+u,${MARS.tankY}+v,${tankFloor.toFixed(6)}+w)`));
assert.ok(liveTankProse.includes(`(${MARS.tankX},${MARS.tankY},${tankFloor.toFixed(6)})`));
for (const [name, text] of [['informe', report], ['anexo', appendix]]) {
  assert.ok(text.includes(`(0,−94)`) && text.includes('4 222.300526') && text.includes('3 797 114.863414'), `${name}: depósito/cálculos desfasados`);
  assert.ok(text.includes('44 paneles') && text.includes('75.294118'), `${name}: servicios desfasados`);
  assert.ok(!/15\s*[,;+]\s*[−-]65|21\.036255|corredor circular de diseño/i.test(text), `${name}: origen o restricción obsoletos`);
}
assert.match(report.replaceAll('**', ''), /no se demostró autosuficiencia|no se afirma autosuficiencia/i);
assert.ok(appendix.includes('1344π') && appendix.includes('2016ρ²sinφ'));
assert.ok(report.includes('escenarios separados') && appendix.includes('A23.') && appendix.includes('A28.'));
for (const phase of ['Fase I:', 'Fase II:', 'Fase III:', 'Fase IV:', 'Fase V:', 'Fase VI:'])
  assert.ok(report.includes(phase), `Falta ${phase} en la fuente del informe.`);
for (let section = 1; section <= 28; section++)
  assert.ok(appendix.includes(`## A${section}.`), `Falta el procedimiento A${section} en la fuente del anexo.`);
assert.ok(appendix.includes(dustState(0).power.toFixed(5)) && appendix.includes(dustState(1).power.toFixed(6)));
assert.ok(appendix.includes(iceCriteria(.25)[1].score.toFixed(6)) && appendix.includes(iceCriteria(.65)[0].score.toFixed(6)));
assert.ok(appendix.includes(oxygenState(0).stock.toFixed(2)) && appendix.includes((shieldState(1).reduction * 100).toFixed(4)));
assert.ok(appendix.includes(roverEnergyState(0).energy.toFixed(6)) && appendix.includes(roverEnergyState(1).energy.toFixed(6)));

console.log(JSON.stringify({
  rubricPoints: 100,
  topics: 53,
  campus: { capsules: campus.spatialInventory.length, ringNodes: campus.ringJunctions.length, labs: LAB_ACCESS.length, greenhouseOutlets: GREENHOUSE_WATER_PORTS.length },
  constructive: { coreSlopePercent, capsuleStairs, capsuleRamps, wingCounts, roomPortals: 55, chamberSupports: 66, trunkSupports: campus.trunkSupports.length },
  solar: `${facts.solarStudyPanels}+${facts.solarSupportPanels}=${facts.solarTotalPanels}`,
  connectedElectricalLoads: facts.connectedElectricalLoads,
  batteryNominalKwh: facts.batteryNominalKwh,
  treatmentRampGradePercent: facts.treatmentRampGradePercent,
  roverOutdoorPlanMetres: facts.roverOutdoorPlanMetres,
  roverStabilizedPlanMetres: facts.roverStabilizedPlanMetres,
  math: { routeMetres: ROUTE_LENGTH, regionAreaM2: REGION_AREA, regionVolumeM3: REGION_VOLUME, tankVolumeM3: VOLUME, tankMassKg: MASS },
  scope: 'Coherencia entre datos, fichas visibles y secciones vigentes de la auditoría; no reemplaza QA WebGL ni cotejo del informe/PPTX.',
}, null, 2));
