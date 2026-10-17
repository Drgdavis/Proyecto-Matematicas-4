import type { EvaStep } from './eva01Project';
import { grad } from './marsMath.ts';

export type ResearchScenario = {
  id: string;
  step: EvaStep;
  question: string;
  formula: string;
  variable: string;
  range: [number, number];
  unit: string;
  evidence: string[];
  decision: string;
  source: { label: string; url: string };
  evaluate: (parameter: number) => { value: string; detail: string; metric: string };
};

const mapValue = (p:number,[a,b]:[number,number]) => a+(b-a)*p;
export const ICE_SITES=[{x:-48,y:42,H:.78,name:'C1'},{x:-82,y:18,H:.63,name:'C2'},{x:-22,y:76,H:.49,name:'C3'}] as const;
export const iceCriteria=(weight:number)=>ICE_SITES.map(site=>{
  const slope=Math.hypot(...grad(site.x,site.y));
  const distance=Math.hypot(site.x-64.3988,site.y+32.1994);
  const P=Math.max(0,1-slope/.12),D=Math.max(0,1-distance/200);
  return {...site,slope,distance,P,D,score:weight*site.H+(.75-weight)*P+.25*D};
});
export const iceScores=(weight:number)=>iceCriteria(weight).map(site=>site.score);

export function dustState(p:number){const tau=4*p,transmission=Math.exp(-tau),irradiance=590*transmission,power=irradiance*120*.24*.86/1000;return{tau,transmission,irradiance,power,load:12,balance:power-12};}
export function oxygenState(p:number){const production=Math.round((1.5+2*p)*100)/100,consumption=2.52,rawNet=production-consumption,net=Math.abs(rawNet)<1e-12?0:rawNet,initial=9,capacity=18,stock=Math.min(capacity,Math.max(0,initial+net));return{production,consumption,net,initial,capacity,stock,fillSols:net>0?(capacity-initial)/net:null};}
export function shieldState(p:number){const thickness=5*p,transmission=Math.exp(-.42*thickness);return{thickness,transmission,reduction:1-transmission};}
export function roverEnergyState(p:number){const mass=320+300*p,rolling=mass*3.71*.04*226.205/3.6e6,margin=mass*.19/1000;return{mass,rolling,margin,energy:rolling+margin};}

export const RESEARCH_SCENARIOS:ResearchScenario[]=[
  {
    id:'dust',
    step:{name:'Tormenta y potencia solar',eq:'I(τ)=I₀e^{-τ}',result:'La tormenta reduce la potencia fotovoltaica disponible frente a una carga crítica de 12 kW.',why:'Relaciona opacidad atmosférica, irradiancia transmitida y potencia eléctrica instantánea.',point:[64,26,-18],tag:'POLVO → ENERGÍA',target:'dustResilience',working:['Se fija I₀=590 W/m² como irradiancia de referencia sobre el panel; este escenario mantiene fija la incidencia solar.','La transmitancia atmosférica es e^{-τ}.','La potencia calculada se compara con una carga crítica de 12 kW.']},
    question:'¿La potencia solar instantánea cubre la carga crítica durante una tormenta?',
    formula:'\\begin{aligned}I(\\tau)&=590e^{-\\tau}\\,\\mathrm{W/m^2}\\\\P(\\tau)&=I(\\tau)(120)(0.24)(0.86),\\quad P_c=12\\,\\mathrm{kW}\\end{aligned}',
    variable:'Opacidad óptica τ',range:[0,4],unit:'',
    evidence:['Los rayos muestran la atenuación de irradiancia al aumentar τ.','El flujo 3D conecta el campo fotovoltaico con la carga de referencia.','La barra compara potencia instantánea con 12 kW.'],
    decision:'Si P<12 kW, el escenario presenta un déficit instantáneo. No se simula batería, autonomía ni almacenamiento.',
    source:{label:'NASA · Dust storms on Mars',url:'https://science.nasa.gov/resource/mars-report-dust-storms-on-mars/'},
    evaluate:p=>{const tau=mapValue(p,[0,4]),irr=590*Math.exp(-tau),power=irr*120*.24*.86/1000,net=power-12;return{value:`${power.toFixed(2)} kW disponibles`,detail:`τ=${tau.toFixed(2)} · irradiancia ${irr.toFixed(1)} W/m² · balance ${net>=0?'+':''}${net.toFixed(2)} kW`,metric:(Math.exp(-tau)*100).toFixed(1)};}
  },
  {
    id:'ice',
    step:{name:'Hielo subsuperficial y ubicación',eq:'S_w=wH+(0.75-w)P+0.25D',result:'El candidato de mayor S_w cambia según el peso asignado al recurso.',why:'Pendiente y distancia se calculan de f y B; H es un supuesto exploratorio.',point:[-48,22,42],tag:'RECURSO → UBICACIÓN',target:'iceSurvey',working:['H es una hipótesis de potencial de hielo para cada candidato, no una medición.','P=1−||∇f(C)||/0.12 usa la pendiente real del terreno.','D=1−d(C,B)/200 usa la distancia real a B.','Los pesos suman uno: w+(0.75−w)+0.25=1.']},
    question:'¿Dónde conviene perforar si también importa el relieve?',
    formula:'\\begin{aligned}S_w&=wH+(0.75-w)P+0.25D\\\\P&=1-\\|\\nabla f(C)\\|/0.12,\\quad D=1-d(C,B)/200\\end{aligned}',
    variable:'Peso del recurso H',range:[0.25,0.65],unit:'',
    evidence:['H es potencial de hielo hipotético; P usa ∇f y D la distancia a B.','Las barras 3D comparan S_w de los tres candidatos.','La línea verde conecta el sitio elegido con B.'],
    decision:'El mayor S_w propone una perforación exploratoria; H no es una detección real en este terreno sintético.',
    source:{label:'NASA · SWIM subsurface ice map',url:'https://science.nasa.gov/resource/swim-map-shows-subsurface-water-ice-on-mars/'},
    evaluate:p=>{const w=mapValue(p,[.25,.65]),scores=iceScores(w);const best=Math.max(...scores),i=scores.indexOf(best);return{value:`C${i+1} · índice ${best.toFixed(3)}`,detail:`peso H=${w.toFixed(2)} · comparación ${scores.map(x=>x.toFixed(3)).join(' / ')}`,metric:(best*100).toFixed(1)};}
  },
  {
    id:'resources',
    step:{name:'Balance de oxígeno y reserva',eq:'M_1=9+P-2.52 kg tras un sol',result:'La reserva didáctica se actualiza con producción menos consumo.',why:'Un esquema de ISRU y tripulación permite explicar el balance de O₂ de la base.',point:[38,27,-61],tag:'ISRU → RESERVA',target:'resourceLoop',working:['La producción supuesta de O₂ se compara con el consumo supuesto de 3 tripulantes: 2.52 kg/sol.','Se parte de una reserva didáctica de O₂ de 9 kg con capacidad de 18 kg, separada del depósito de agua.','El agua y la contribución de la biología no se cuantifican en este escenario.']},
    question:'¿La producción local cubre el consumo de tres tripulantes?',
    formula:'\\begin{aligned}\\Delta M_{O_2}&=P-2.52\\,\\mathrm{kg/sol}\\\\M_1&=\\min(18,\\max(0,9+\\Delta M_{O_2}))\\end{aligned}',
    variable:'Producción de O₂',range:[1.5,3.5],unit:'kg/sol',
    evidence:['Tres figuras representan la tripulación modelada.','Los pulsos conectan un esquema de producción ISRU, hábitat y reserva; la biología solo aparece como contexto.','El nivel de la reserva didáctica de O₂ cambia con el balance neto, sin confundirla con el depósito de agua.'],
    decision:'La operación nominal exige producción superior a 2.52 kg O₂/sol o respaldo almacenado.',
    source:{label:'NASA · MOXIE completes Mars mission',url:'https://www.nasa.gov/solar-system/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/'},
    evaluate:p=>{const state=oxygenState(p);return{value:`${state.net===0?'Equilibrio':state.net>0?'Superávit':'Déficit'} ${Math.abs(state.net).toFixed(2)} kg/sol`,detail:`producción ${state.production.toFixed(2)} − consumo 2.52 kg/sol · reserva tras 1 sol ${state.stock.toFixed(2)} kg${state.fillSols!==null?` · desde 9 a 18 kg: ${state.fillSols.toFixed(1)} soles`:''}`,metric:state.production.toFixed(2)};}
  },
  {
    id:'radiation',
    step:{name:'Blindaje de radiación',eq:'D(x)=D₀e^{-μx}',result:'El espesor se convierte en una reducción relativa visible y comparable.',why:'Evalúa una envolvente de protección sin presentar una certificación médica.',point:[64,28,-32],tag:'ESPESOR → ATENUACIÓN',target:'radiationShield',working:['Se normaliza D₀=100 %.','Se adopta μ=0.42 m⁻¹ como parámetro de demostración.','Se calcula la fracción transmitida y la reducción.']},
    question:'¿Cómo cambia la exposición relativa al aumentar el blindaje?',
    formula:'\\begin{aligned}D(x)&=D_0e^{-0.42x}\\\\R(x)&=1-\\frac{D(x)}{D_0}\\end{aligned}',
    variable:'Espesor equivalente x',range:[0,5],unit:'m',
    evidence:['Los rayos se atenúan al atravesar las capas del hábitat.','Dos columnas comparan exposición exterior e interior.','La métrica es reducción relativa, no dosis clínica.'],
    decision:'El modelo permite comparar alternativas y deja explícito el parámetro μ.',
    source:{label:'NASA/JPL · Radiation on Mars',url:'https://www.nasa.gov/centers-and-facilities/jpl/how-nasas-curiosity-rover-is-making-mars-safer-for-astronauts/'},
    evaluate:p=>{const x=mapValue(p,[0,5]),trans=Math.exp(-.42*x);return{value:`Reducción relativa ${((1-trans)*100).toFixed(1)} %`,detail:`x=${x.toFixed(2)} m · transmisión ${(trans*100).toFixed(1)} % de D₀`,metric:((1-trans)*100).toFixed(1)};}
  },
  {
    id:'rover',
    step:{name:'Rover: energía y riesgo',eq:'E_est=0.04mgL/3.6·10⁶+0.19m/1000 kWh',result:'La ruta muestra pendiente local; la energía es un estimado didáctico de rodadura y margen.',why:'Distingue la demanda local del estimado total y limita la velocidad con la curvatura.',point:[0,28,72],tag:'RUTA → ENERGÍA',target:'roverEnergy',working:['L=226.205 m y g_Marte=3.71 m/s².','Se supone coeficiente de rodadura 0.04 y margen operativo de 0.19 Wh/kg.','La pendiente colorea tramos, pero no se integra como trabajo adicional en E_est.']},
    question:'¿Dónde exige más energía y menor velocidad la ruta del rover?',
    formula:'\\begin{aligned}E_{est}&=\\frac{0.04m(3.71)(226.205)}{3.6\\cdot10^6}+\\frac{0.19m}{1000}\\;\\mathrm{kWh}\\\\v_{max}(t)&=\\sqrt{\\frac{a_{lat,max}}{\\kappa(t)}}\\end{aligned}',
    variable:'Masa operativa',range:[320,620],unit:'kg',
    evidence:['Longitud 3D ya calculada: 226.205 m.','La masa seleccionada permanece fija mientras el rover recorre la ruta.','Las barras muestran pendiente local; el anillo, la velocidad límite. Ninguna se suma a E_est.'],
    decision:'El consumo es didáctico, no autonomía de batería. La velocidad se limita según la curvatura local.',
    source:{label:'NASA · Mars surface power studies',url:'https://www.nasa.gov/wp-content/uploads/2024/01/acr23-white-papers-compiled-v10.pdf'},
    evaluate:p=>{const mass=mapValue(p,[320,620]),energy=mass*3.71*.04*226.205/3.6e6+mass*.19/1000;return{value:`${energy.toFixed(3)} kWh estimados`,detail:`masa ${mass.toFixed(0)} kg · rodadura 0.04 · margen supuesto 0.19 Wh/kg`,metric:energy.toFixed(3)};}
  }
];
