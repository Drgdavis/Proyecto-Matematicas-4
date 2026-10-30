import { useState, useEffect, useRef, ReactNode } from 'react';
import { Layers, AlertTriangle, Zap, TrendingUp, Compass, Infinity, Activity, Maximize2, Minimize2, ChevronDown, ChevronUp, ChevronsLeft, ChevronsRight, Settings2, Sparkle, Square, Flame, Rocket, RotateCcw } from 'lucide-react';
import { PhysicalData, ModifiedPhysicalData, AlertState, CometState } from '../types';
import { getModifiedProps, calculateUnidadI, solveLeibnizPi, solveVelocityTaylor, solveLegendreEnergy, solveUnidadIII, getKeplerTableData, formatScientific } from '../utils/mathFormulas';
import { GravityGraph, LeibnizPiGraph, EllipseGeometryCanvas } from './MathCanvases';
import { VISUAL_SCALE, G_CONSTANT, MASS_OF_SUN, AU_IN_KM, EARTH_MASS_KG } from '../data/planets';

interface RightPanelProps {
  compact?: boolean;
  planet: PhysicalData;
  allPlanets: PhysicalData[];
  onSelectPlanet: (name: string) => void;
  modifier: ModifiedPhysicalData;
  onModifierChange: (updater: (prev: ModifiedPhysicalData) => ModifiedPhysicalData) => void;
  onResetModifiers: () => void;
  onLaunchComet: () => void;
  onCancelComet: () => void;
  planetModifiers: Record<string, ModifiedPhysicalData>;
  onTriggerCollision: (planetAName: string, planetBName: string) => void;
  cometState: CometState;
  collisionState?: any;
  onResetCollision?: () => void;
}

export function RightPanel({
  planet,
  allPlanets,
  onSelectPlanet,
  modifier,
  onModifierChange,
  onResetModifiers,
  onLaunchComet,
  onCancelComet,
  planetModifiers,
  onTriggerCollision,
  cometState,
  collisionState,
  onResetCollision,
  compact = false
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<'calculus' | 'series' | 'vectors' | 'manipulation'>('calculus');
  const [leibnizTerms, setLeibnizTerms] = useState<number>(1000);
  const [trueAnomalyTheta, setTrueAnomalyTheta] = useState<number>(0);
  const thetaRef = useRef<number>(0);
  const [alerts, setAlerts] = useState<AlertState[]>([]);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  // --- Overhaul: panel colapsable (vista limpia del sistema solar) ----------
  const [collapsed, setCollapsed] = useState<boolean>(false);
  useEffect(() => { if (compact) { setCollapsed(false); setIsExpanded(false); } }, [compact]);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Seleccionar un planeta conserva el ancho actual. La consola completa solo
  // se abre mediante el control explícito del usuario.

  // Collision state hooks
  const [collisionTargetA, setCollisionTargetA] = useState<string>('mercury');
  const [collisionTargetB, setCollisionTargetB] = useState<string>('earth');
  const [collisionResult, setCollisionResult] = useState<string | null>(null);

  // Maintain theta animation angle
  useEffect(() => {
    if (activeTab !== 'calculus' || collapsed) return;
    let frameId: number;
    let lastUpdate = performance.now();
    const updateTheta = (now:number) => {
      // Rotate slowly for the static mathematical displays of angle θ
      if (!document.hidden && now - lastUpdate >= 50) {
        thetaRef.current = (thetaRef.current + 0.045) % (Math.PI * 2);
        setTrueAnomalyTheta(thetaRef.current);
        lastUpdate = now;
      }
      frameId = requestAnimationFrame(updateTheta);
    };
    frameId = requestAnimationFrame(updateTheta);
    return () => cancelAnimationFrame(frameId);
  }, [activeTab, collapsed]);

  // Recalculate properties for displays
  const props = getModifiedProps(planet, modifier);
  const uniI = calculateUnidadI(planet, modifier);
  const leibniz = solveLeibnizPi(leibnizTerms);
  const taylor = solveVelocityTaylor(props, trueAnomalyTheta);
  const legendre = solveLegendreEnergy(props, trueAnomalyTheta);
  const uniIII = solveUnidadIII(props, trueAnomalyTheta);

  const keplerTable = getKeplerTableData(allPlanets, planetModifiers);

  // Handle live physical modifiers and trigger notifications cards
  const handleSliderChange = (
    key: keyof ModifiedPhysicalData,
    newVal: number,
    paramLabel: string,
    formulaApplied: string,
    oldFormatted: string,
    newFormatted: string
  ) => {
    onModifierChange(prev => {
      const updated = { ...prev, [key]: newVal };
      
      // Calculate variance percentage
      let pctChangeText = "";
      const oldValue = prev[key];
      const val = newVal;
      
      if (oldValue !== val) {
        if (key === 'massMultiplier') {
          // Escape speed is proportional to sqrt(m)
          const oldV = Math.sqrt(oldValue);
          const newV = Math.sqrt(val);
          const diff = ((newV - oldV) / oldV) * 100;
          pctChangeText = diff >= 0 
            ? `Velocidad de escape aumentó +${diff.toFixed(1)}%` 
            : `Velocidad de escape redujo ${Math.abs(diff).toFixed(1)}%`;
        } else if (key === 'eccentricity') {
          // Orbital Area is proportional to sqrt(1 - e^2)
          const oldB = Math.sqrt(Math.max(0, 1 - oldValue * oldValue));
          const newB = Math.sqrt(Math.max(0, 1 - val * val));
          if (oldB > 0) {
            const diff = ((newB - oldB) / oldB) * 100;
            pctChangeText = diff >= 0 
              ? `Área orbital aumentó +${diff.toFixed(1)}%` 
              : `Área redujo ${Math.abs(diff).toFixed(1)}%`;
          } else {
            pctChangeText = "Órbita modificada";
          }
        } else if (key === 'semiMajorAxisMultiplier') {
          // Period is proportional to a^1.5
          const oldP = Math.pow(oldValue, 1.5);
          const newP = Math.pow(val, 1.5);
          const diff = ((newP - oldP) / oldP) * 100;
          pctChangeText = diff >= 0 
            ? `Período orbital aumentó +${diff.toFixed(1)}%` 
            : `Período orbital redujo ${Math.abs(diff).toFixed(1)}%`;
        } else if (key === 'radiusMultiplier') {
          // Volume is proportional to r^3
          const oldVol = Math.pow(oldValue, 3);
          const newVol = Math.pow(val, 3);
          const diff = ((newVol - oldVol) / oldVol) * 100;
          pctChangeText = diff >= 0 
            ? `Volumen aumentó +${diff.toFixed(1)}%` 
            : `Volumen redujo ${Math.abs(diff).toFixed(1)}%`;
        }
      }

      // Calculate resulting values to show in alert card
      const alert: AlertState = {
        parameter: paramLabel,
        formula: formulaApplied,
        prevValue: oldFormatted,
        newValue: newFormatted,
        result: pctChangeText || `Recálculo completado.`
      };

      setAlerts(prevAlerts => [alert, ...prevAlerts.slice(0, 3)]); // cap to 4 alerts
      return updated;
    });
  };

  // Automated Collision Solver
  const handleSimulateCollision = () => {
    if (collisionTargetA === collisionTargetB) {
      setCollisionResult('Error: No puedes colisionar un planeta consigo mismo.');
      return;
    }

    const pA = allPlanets.find(p => p.name === collisionTargetA);
    const pB = allPlanets.find(p => p.name === collisionTargetB);

    if (!pA || !pB) return;

    // Trigger parent visual action
    onTriggerCollision(collisionTargetA, collisionTargetB);

    // Solve average physics
    const combinedMassMultiplier = (pA.realMass + pB.realMass) / pA.realMass;
    const combinedRadiusMultiplier = Math.cbrt(Math.pow(pA.realRadius, 3) + Math.pow(pB.realRadius, 3)) / pA.realRadius;
    const avgEccentricity = (pA.eccentricity + pB.eccentricity) / 2;

    setCollisionResult(`FUSIÓN COMPLETADA:
La colisión de ${pA.displayName} con ${pB.displayName} ha creado un nuevo superplaneta.
- Nueva Masa combinada: ${formatScientific(pA.realMass + pB.realMass)} Tierras.
- Conservación de Volumen (Nuevo Radio): ${Math.round(pA.realRadius * combinedRadiusMultiplier)} km.
- Excentricidad promedio residual: ${avgEccentricity.toFixed(4)}.
Cálculos físicos recalculados en base al Teorema de Choques Inelásticos.`);
  };

  const renderAccordionSection = (
    sectionId: string,
    title: string,
    content: ReactNode,
    extraHeader?: ReactNode
  ) => {
    const isOpen = collapsedSections[sectionId] !== true;
    return (
      <div className="glass-card overflow-hidden">
        <div 
          onClick={() => setCollapsedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }))}
          className="flex justify-between items-center px-3 py-2.5 cursor-pointer select-none border-b border-[var(--panel-border)] hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex-1 pr-2 flex items-center gap-2">
            <span className="w-[3px] h-3 rounded-full bg-[var(--accent-cyan)] shrink-0" />
            <div>
              <span className="hud-eyebrow !text-[10px] !text-[var(--accent-cyan)] block">{title}</span>
              {extraHeader}
            </div>
          </div>
          <div className="text-[var(--accent-cyan)]/70 shrink-0">
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </div>
        {isOpen && (
          <div className="p-3 space-y-2 text-xs bg-black/15 animate-fade-in">
            {content}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`h-full flex flex-col border-l border-[var(--panel-border)] glass-panel ${collapsed ? 'p-2' : 'p-4'} overflow-y-auto select-none font-mono z-30 scrollbar-hud text-[var(--text-secondary)] transition-all duration-300 ${
        collapsed
          ? 'w-[3.25rem] min-w-[3.25rem]'
          : isExpanded 
            ? 'w-[48vw] min-w-[32rem] max-w-[55rem]' 
            : 'w-80 min-w-[20rem]'
      }`}
      id="right_analytics_sidebar"
    >
      {collapsed ? (
        /* ============== RAIL COLAPSADO — solo esencial ============== */
        <div className="flex flex-col items-center gap-3 pt-1">
          <button
            onClick={() => setCollapsed(false)}
            className="btn-hud rounded-md w-8 h-8 flex items-center justify-center shrink-0"
            title="Expandir panel de datos"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <span
            className="w-3 h-3 rounded-full border border-white/40 shrink-0"
            style={{ backgroundColor: planet.color, boxShadow: `0 0 8px ${planet.color}` }}
            title={planet.displayName}
          />
          <span className="hud-eyebrow !text-[8px] [writing-mode:vertical-rl] tracking-widest py-2">{planet.displayName.toUpperCase()}</span>
        </div>
      ) : (
        <>
      {/* HEADER SECTION */}
      <div className="mb-4 flex items-center justify-between border-b border-[var(--panel-border)] pb-3" id="right_sidebar_header">
        <div className="flex items-start gap-2">
          <button
            onClick={() => setCollapsed(true)}
            className="btn-hud rounded-md w-6 h-6 flex items-center justify-center shrink-0 mt-0.5"
            title="Colapsar panel"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full border border-white/40 shrink-0" style={{ backgroundColor: planet.color, boxShadow: `0 0 10px ${planet.color}` }} />
              <h2 className="hud-title text-[13px] tracking-widest">{planet.displayName.toUpperCase()}</h2>
            </div>
            <p className="hud-eyebrow !text-[9px] mt-1.5">{planet.description}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="hud-eyebrow !text-[8.5px] block">Distancia Solar</span>
          <span className="telemetry-value text-[11px] text-[var(--accent-live)] font-bold">{props.a.toFixed(3)} AU</span>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="grid grid-cols-4 gap-1 bg-black/30 p-1 rounded-md mb-3 text-[9px] font-bold text-center border border-[var(--panel-border)]">
        {[
          { id: 'calculus', label: 'U:Ⅰ CALC', icon: Activity },
          { id: 'series', label: 'U:Ⅱ SERI', icon: Infinity },
          { id: 'vectors', label: 'U:Ⅲ VECT', icon: Compass },
          { id: 'manipulation', label: 'PHYS', icon: Zap }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`py-1.5 px-0.5 rounded-md transition-all cursor-pointer flex flex-col items-center gap-1 ${
              activeTab === tab.id
                ? 'btn-hud-active'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <tab.icon className="w-3" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* EXPAND & COLLAPSE CONTROL ACTIONS */}
      <div className="flex justify-between items-center glass-card px-2.5 py-1.5 mb-3 text-[10px]">
        <button
          onClick={() => {
            const keys = activeTab === 'calculus' 
              ? ['area', 'arc', 'volume', 'work', 'barycenter', 'density', 'escape', 'graph']
              : activeTab === 'series'
              ? ['parametrics', 'leibniz', 'leibniz_graph', 'taylor', 'legendre', 'convergence']
              : activeTab === 'vectors'
              ? ['polar', 'vectors_rt', 'dot_product', 'cross_product', 'conic', 'extremes', 'geometry_2d', 'kepler_table']
              : ['slider_mass', 'slider_ecc', 'slider_axis', 'slider_rad', 'action_triggers', 'alerts'];
            
            const anyOpen = keys.some(k => collapsedSections[k] !== true);
            const next: Record<string, boolean> = { ...collapsedSections };
            keys.forEach(k => {
              next[k] = anyOpen;
            });
            setCollapsedSections(next);
          }}
          className="text-[var(--accent-cyan)] font-bold hover:text-white transition-colors cursor-pointer font-ui"
        >
          { (activeTab === 'calculus' ? ['area', 'arc', 'volume', 'work', 'barycenter', 'density', 'escape', 'graph'] :
             activeTab === 'series' ? ['parametrics', 'leibniz', 'leibniz_graph', 'taylor', 'legendre', 'convergence'] :
             activeTab === 'vectors' ? ['polar', 'vectors_rt', 'dot_product', 'cross_product', 'conic', 'extremes', 'geometry_2d', 'kepler_table'] :
             ['slider_mass', 'slider_ecc', 'slider_axis', 'slider_rad', 'action_triggers', 'alerts']).some(k => collapsedSections[k] === true)
            ? '⊞ EXPANDIR TODOS' 
            : '⊟ COLAPSAR TODOS'}
        </button>
        
        {/* Toggle expanded panel width */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[var(--accent-live)] font-bold hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer text-[10px] font-ui"
          title={isExpanded ? "Reducir a Barra Lateral" : "Ampliar Consola Matemática"}
        >
          {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          <span>{isExpanded ? 'BARRA LATERAL' : 'CONSOLA EXPANDIDA'}</span>
        </button>
      </div>


      {/* PERSISTENT COMET TELEMETRY IF ACTIVE */}
      {cometState && cometState.active && (() => {
        const thetaInfRad = Math.acos(-1 / cometState.eccentricity);
        const thetaInfDeg = thetaInfRad * (180 / Math.PI);
        return (
        <div className="glass-card border-l-4 border-l-[var(--accent-cyan)] p-3 mb-4">
          <div className="flex justify-between items-center mb-1.5 pb-1.5 border-b border-[var(--panel-border)]">
            <span className="hud-eyebrow !text-[10px] !text-[var(--accent-cyan)]">TELEMETRÍA DE COMETA HIPERBÓLICO</span>
            <div className="live-indicator">
              <span className="live-dot" />
              <span className="live-label !text-[8px]">ESCAPE ACTIVO</span>
            </div>
          </div>
          <p className="text-[10px] text-[var(--text-tertiary)] mb-2 leading-relaxed font-ui">
            Un cuerpo con masa insignificante y velocidad superior a la de escape realiza un sobrevuelo gravitatorio en trayectoria abierta (no se repite, escapa para siempre).
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] bg-black/30 p-2.5 rounded-md border border-[var(--panel-border)] font-mono text-[var(--text-secondary)]">
            <div>
              <div className="text-[var(--accent-cyan)] font-bold mb-0.5">Ecuación Polar de Órbita Abierta (e = {cometState.eccentricity.toFixed(2)} &gt; 1):</div>
              <div className="text-[var(--text-faint)] text-[9px] mb-1 font-mono font-bold">r(θ) = a(e² - 1) / (1 + e·cosθ)</div>
              <div>Semieje (a): <span className="text-white">{cometState.semiMajorAxis} unid. de escena</span></div>
              <div>Excentricidad (e): <span className="text-white">{cometState.eccentricity.toFixed(2)}</span></div>
            </div>
            <div>
              <div className="text-[var(--accent-cyan)] font-bold mb-0.5">Ángulo de Asíntota del Escape:</div>
              <div className="text-[var(--text-faint)] text-[9px] mb-1 font-mono font-bold">θ∞ = ± arccos(-1/e)</div>
              <div>Ángulo límite: <span className="text-[var(--accent-cyan)] font-bold">± {thetaInfDeg.toFixed(2)}°</span> (±{thetaInfRad.toFixed(3)} rad)</div>
              <div>Velocidad orbital: <span className="text-[var(--accent-live)] font-bold">v &gt; v_esc (escapa al infinito)</span></div>
            </div>
          </div>

          <button
            onClick={onCancelComet}
            className="w-full mt-2.5 py-1.5 btn-hud rounded-md text-[10px] font-bold tracking-wide"
          >
            DETENER SOBREVUELO
          </button>
        </div>
        );
      })()}

      {/* TAB CONTENT SPACES */}
      <div className="flex-1 overflow-y-auto pr-1 text-xs" id="right_tabs_container">
        
        {/* ======================================= */}
        {/* TAB 1 - UNIDAD I: INTEGRALES & COGNICIÓN */}
        {/* ======================================= */}
        {activeTab === 'calculus' && (
          <div className={`space-y-3 ${isExpanded ? 'grid grid-cols-1 md:grid-cols-2 gap-4 space-y-0' : ''}`} id="tab_calculus_body">
            
            {/* Ellipse orbit Area */}
            {renderAccordionSection('area', '1. Área Orbital (Integración)', (
              <>
                <div className="text-[10px] text-gray-400 font-semibold mb-1">Fórmula: A = π · a · b</div>
                <p className="text-[10px] text-gray-400 leading-normal">
                  Derivado de la integral de área para secciones acotadas: y = b · √(1 − x²/a²).
                </p>
                <div className="info-tip mt-2">
                  <span className="text-amber-400 font-bold">¿Para qué sirve?</span>
                  <p className="text-gray-300 mt-1">Con este dato sabemos el espacio total que recorre el planeta en su órbita alrededor del Sol.</p>
                </div>
                <div className="result-box mt-1.5">
                  A = π · {props.a.toFixed(4)} · {props.b.toFixed(4)} = <span className="text-white font-extrabold">{uniI.areaAU2.toFixed(4)} AU²</span>
                  <span className="text-[10px] text-gray-500 block mt-0.5">({formatScientific(uniI.areaKm2)} km²)</span>
                </div>
              </>
            ))}

            {/* Ramanujan Arc Length */}
            {renderAccordionSection('arc', '2. Longitud de Arco (Integral)', (
              <>
                <div className="text-[10px] text-gray-400 font-semibold mb-1">Fórmula (Ramanujan II): L ≈ π[3(a+b) − √((3a+b)(a+3b))]</div>
                <p className="text-[10px] text-gray-400 leading-normal">Aproximación para el perímetro elíptico en km.</p>
                <div className="info-tip mt-2">
                  <span className="text-amber-400 font-bold">¿Para qué sirve?</span>
                  <p className="text-gray-300 mt-1">Con este dato sabemos la distancia total que recorre el planeta en una vuelta completa alrededor del Sol.</p>
                </div>
                <div className="result-box mt-1.5">
                  L ≈ <span className="text-white font-extrabold">{formatScientific(uniI.orbitalArcKm)} km</span>
                  <span className="text-[10px] text-gray-500 block mt-0.5">({uniI.orbitalArcLY.toExponential(4)} Años Luz AD)</span>
                </div>
              </>
            ))}

            {/* Planetary Volume */}
            {renderAccordionSection('volume', '3. Volumen Esferoidal (Integral de Revolución)', (
              <>
                <div className="text-[10px] text-gray-400 font-semibold mb-1">Fórmula: V = (4/3) · π · r³</div>
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  La rotación de la circunferencia genera el sólido de revolución V = π · ∫ [−r, r] (r² − x²) dx.
                </p>
                <div className="info-tip mt-2">
                  <span className="text-amber-400 font-bold">¿Para qué sirve?</span>
                  <p className="text-gray-300 mt-1">Con este dato sabemos el espacio total que ocupa el planeta. Comparándolo con la Tierra, podemos entender su tamaño relativo.</p>
                </div>
                <div className="result-box mt-1.5">
                  V ≈ <span className="text-white font-extrabold">{formatScientific(uniI.volumeKm3)} km³</span>
                  <span className="text-[10px] text-amber-400 block mt-0.5">(Equivalente a {uniI.volumeRel.toFixed(3)} Tierras)</span>
                </div>
              </>
            ))}

            {/* Potential Difference and Work */}
            {renderAccordionSection('work', '4. Trabajo Gravitacional (Integral de Línea)', (
              <>
                <div className="text-[10px] text-gray-400 font-semibold mb-1">Fórmula: W = G·M_sol·m · [ 1/r_peri − 1/r_afelio ]</div>
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Trabajo de la fuerza gravitatoria conservativa F⃗ = -G·(M·m)/r² û_r en media órbita.
                </p>
                <div className="info-tip mt-2">
                  <span className="text-amber-400 font-bold">¿Para qué sirve?</span>
                  <p className="text-gray-300 mt-1">Con este dato sabemos la energía que se necesita para mover el planeta desde el punto más cercano al Sol (perihelio) hasta el más lejano (afelio).</p>
                </div>
                <div className="result-box mt-1.5">
                  W = <span className="text-white font-extrabold">{formatScientific(uniI.workJoules)} Joules</span>
                  <span className="text-[10px] text-gray-500 block">Diferencia de Energía Potencial de Perihelio a Afelio</span>
                </div>
              </>
            ))}

            {/* System Barycenter */}
            {renderAccordionSection('barycenter', '5. Centro de Masa (Momento Estático)', (
              <>
                <div className="text-[10px] text-gray-400 font-semibold mb-1">Fórmula: x̄ = (M_sol·0 + m·a) / (M_sol + m)</div>
                <div className="info-tip mt-2">
                  <span className="text-amber-400 font-bold">¿Para qué sirve?</span>
                  <p className="text-gray-300 mt-1">Con este dato sabemos el punto alrededor del cual giran realmente el Sol y el planeta. Si está dentro del Sol, el Sol parece "temblequear" muy poco.</p>
                </div>
                <div className="result-box mt-1.5">
                  x̄ = <span className="text-white font-extrabold">{uniI.barycenterKm.toFixed(2)} km</span>
                  <span className={`text-[10px] block mt-0.5 font-bold ${uniI.isInsideSun ? 'text-emerald-400' : 'text-amber-500'}`}>
                    {uniI.isInsideSun ? '✓ Situado DENTRO del cuerpo del Sol' : '⚠ Situado FUERA del cuerpo del Sol'}
                  </span>
                </div>
              </>
            ))}

            {/* Mean Density */}
            {renderAccordionSection('density', '6. Densidad Media (Distribución Homogénea)', (
              <>
                <div className="text-[10px] text-gray-400 font-semibold mb-1">Fórmula: ρ = m / V</div>
                <div className="info-tip mt-2">
                  <span className="text-amber-400 font-bold">¿Para qué sirve?</span>
                  <p className="text-gray-300 mt-1">Con este dato sabemos de qué está compuesto el planeta. Si es más denso que el agua, probablemente tiene rocas y metales; si es menos denso, probablemente es gaseoso.</p>
                </div>
                <div className="result-box mt-1.5">
                  ρ ≈ <span className="text-white font-extrabold">{Math.round(uniI.densityKgM3).toLocaleString()} kg/m³</span>
                  <span className="text-[10px] text-gray-500 block mt-0.5">({uniI.densityRelWater.toFixed(2)}x la densidad del agua de 1000 kg/m³)</span>
                </div>
              </>
            ))}

            {/* Escape Velocity */}
            {renderAccordionSection('escape', '7. Velocidad de Escape Planetaria (Límites de Integración)', (
              <>
                <div className="text-[10px] text-gray-400 font-semibold mb-1">Fórmula: v_esc = √(2 · G · m / r)</div>
                <div className="info-tip mt-2">
                  <span className="text-amber-400 font-bold">¿Para qué sirve?</span>
                  <p className="text-gray-300 mt-1">Con este dato sabemos la velocidad mínima que necesita un cohete para salir completamente de la gravedad del planeta y no regresar nunca más.</p>
                </div>
                <div className="result-box mt-1.5">
                  v_esc = <span className="text-white font-extrabold">{uniI.vEscapeKms.toFixed(3)} km/s</span>
                  <span className="text-[10px] text-gray-500 block mt-0.5">({formatScientific(uniI.vEscapeKms * 3600)} km/h)</span>
                </div>
              </>
            ))}

            {/* Gravity acceleration custom plot canvas */}
            {renderAccordionSection('graph', 'Gráfica Gravedad F(r)', (
              <GravityGraph massKg={props.mass} planetRadiusKm={props.r} />
            ))}

          </div>
        )}

        {/* ======================================= */}
        {/* TAB 2 - UNIDAD II: SERIES & PARAMETRICS */}
        {/* ======================================= */}
        {activeTab === 'series' && (
          <div className="space-y-4" id="tab_series_body">
            
            {/* Parametrics Equations */}
            {renderAccordionSection('parametrics', '1. Ecuaciones Paramétricas de Órbita 3D', (
              <>
                <div className="text-[10px] text-gray-400 font-semibold mb-1">
                  x(t) = a·cos(t) − c <br />
                  y(t) = b·sin(t) <br />
                  z(t) = 0
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Donde t = Anomalía Excéntrica animada.</p>
                <div className="info-tip mt-2">
                  <span className="text-amber-400 font-bold">¿Para qué sirve?</span>
                  <p className="text-gray-300 mt-1">Con estas ecuaciones sabemos la posición exacta del planeta en cualquier momento del tiempo, usando un solo parámetro (t).</p>
                </div>
                <div className="space-y-1 bg-black/40 p-2 rounded border border-white/8 text-[10.5px]">
                  <div>Ángulo t actual: <span className="text-gray-200 font-bold">{trueAnomalyTheta.toFixed(4)} rad</span> ({Math.round(trueAnomalyTheta * 180 / Math.PI)}°)</div>
                  <div>Coordenada x(t): <span className="text-white font-bold">{(props.a * Math.cos(trueAnomalyTheta) - props.c).toFixed(4)} AU</span></div>
                  <div>Coordenada y(t): <span className="text-white font-bold">{(props.b * Math.sin(trueAnomalyTheta)).toFixed(4)} AU</span></div>
                </div>
              </>
            ))}

            {/* Leibniz Series for Pi */}
            {renderAccordionSection('leibniz', '2. Leibniz Serie Alternante para π', (
              <>
                <div className="text-[10px] text-gray-400 font-semibold mb-1">
                  π/4 = Σ(n=0 a N) [(-1)^n / (2n+1)]
                </div>
                <div className="info-tip mt-2">
                  <span className="text-amber-400 font-bold">¿Para qué sirve?</span>
                  <p className="text-gray-300 mt-1">Con esta serie podemos calcular el número π de forma aproximada, sumando términos uno por uno. Más términos = más precisión.</p>
                </div>

                {/* Slider terms */}
                <div className="flex flex-col gap-1 my-1.5">
                  <div className="flex justify-between text-[10px]">
                    <span>Iteraciones N:</span>
                    <span className="text-[#ff3366] font-extrabold">{leibnizTerms.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10000"
                    step="50"
                    value={leibnizTerms}
                    onChange={(e) => setLeibnizTerms(parseInt(e.target.value))}
                    className="w-full accent-[#ff3366] h-1"
                  />
                </div>

                <div className="space-y-1 bg-black/40 p-2 rounded border border-[#ff3366]/10 text-[10px]">
                  <div>Valor aproximado: <span className="text-white font-bold">{leibniz.approxPi.toFixed(7)}</span></div>
                  <div>Error absoluto: <span className="text-rose-450">{leibniz.errorAbs.toExponential(4)}</span></div>
                  <div>Error porcentual: <span className="text-rose-450">{leibniz.errorPct.toFixed(5)}%</span></div>
                </div>
              </>
            ))}

            {/* Real convergence graph for Pi */}
            {renderAccordionSection('leibniz_graph', 'Gráfica Serie de Leibniz (Convergencia de π)', (
              <LeibnizPiGraph terms={leibnizTerms} />
            ))}

            {/* Taylor Series of Velocity */}
            {renderAccordionSection('taylor', '3. Velocidad Orbital - Serie de Taylor', (
              <>
                <div className="text-[10px] text-gray-400 font-semibold mb-1">
                  v(θ) ≈ v_med · [ 1 + e·cos(θ) + e²/2·cos(2θ) + e³/2·cos(3θ) ]
                </div>
                <p className="text-[10px] text-gray-400 mb-1.5 leading-relaxed">
                  Aproximación por Polinomio de Maclaurin de orden 3. Coeficientes elípticos.
                </p>
                <div className="info-tip mt-2">
                  <span className="text-amber-400 font-bold">¿Para qué sirve?</span>
                  <p className="text-gray-300 mt-1">Con esta serie podemos calcular la velocidad del planeta de forma simple, sin tener que hacer cálculos muy complejos. Es una aproximación muy cercana al valor real.</p>
                </div>

                <div className="space-y-1.5 text-[9.5px]">
                  <div className="grid grid-cols-2 gap-1 bg-black/40 p-1.5 border border-white/8 rounded">
                    <div>T0 (Media): {taylor.terms[0].toFixed(2)} km/s</div>
                    <div>T1 (e·cosθ): {taylor.terms[1].toFixed(2)} km/s</div>
                    <div>T2 (cos2θ): {taylor.terms[2].toFixed(2)} km/s</div>
                    <div>T3 (cos3θ): {taylor.terms[3].toFixed(2)} km/s</div>
                  </div>

                  <div className="bg-black/60 p-2 border border-white/8 rounded leading-relaxed text-[10px]">
                    <div>Aproximación Taylor: <span className="text-amber-400 font-bold">{taylor.vTaylor.toFixed(3)} km/s</span></div>
                    <div>Cálculo exacto (Vis-viva): <span className="text-emerald-400 font-bold">{taylor.vExact.toFixed(3)} km/s</span></div>
                    <div>Error truncamiento: <span className="text-rose-400">{taylor.truncationErrorKms.toFixed(3)} km/s</span> ({taylor.truncationErrorPct.toFixed(3)}%)</div>
                  </div>
                </div>
              </>
            ))}

            {/* Legendre Gravitational Potential series */}
            {renderAccordionSection('legendre', '4. Energía Potencial - Polinomios de Legendre', (
              <>
                <div className="text-[10px] text-gray-400 font-semibold mb-1">
                  U(r) = -GMm/a · Σ (e^n · P_n(cosθ))
                </div>
                <div className="info-tip mt-2">
                  <span className="text-amber-400 font-bold">¿Para qué sirve?</span>
                  <p className="text-gray-300 mt-1">Con estos polinomios podemos calcular la energía potencial gravitatoria del planeta de forma desglosada, lo que nos ayuda a entender cómo se distribuye la energía en la órbita.</p>
                </div>

                <div className="space-y-1 text-[10px] bg-black/40 p-2 rounded border border-white/8 leading-relaxed">
                  <div>U(T0): {formatScientific(legendre.terms[0])} J</div>
                  <div>U(T1): {formatScientific(legendre.terms[1])} J</div>
                  <div>U(T2): {formatScientific(legendre.terms[2])} J</div>
                  <div className="border-t border-gray-800 pt-1 mt-1 text-gray-300">
                    Suma aproximada: {formatScientific(legendre.approxU)} J <br />
                    Valor Real exacto: {formatScientific(legendre.exactU)} J
                  </div>
                </div>
              </>
            ))}

            {/* Series convergence proof */}
            {renderAccordionSection('convergence', "Prueba de Convergencia (Criterio de la Razón)", (
              <>
                <div className="info-tip mb-2">
                  <span className="text-amber-400 font-bold">¿Para qué sirve?</span>
                  <p className="text-gray-300 mt-1">Con esta prueba sabemos que las series que usamos para calcular velocidad y energía potencial realmente funcionan y se acercan al valor correcto, no se van al infinito.</p>
                </div>
                <div className="text-[10px] text-gray-400 leading-relaxed">
                  Para la serie orbital elíptica de velocidad y potencial:<br />
                  <div className="text-white my-1 font-bold">{"lim |u_(n+1) / u_n| = e"}</div>
                  Dado que la excentricidad de {planet.displayName} es <span className="text-gray-100 font-black">e = {props.e.toFixed(4)} &lt; 1</span>, el radio de convergencia se cumple absolutamente. Se declara <span className="text-white font-bold">ABSOLUTAMENTE CONVERGENTE ✔</span> según D'Alembert.
                </div>
              </>
            ))}

          </div>
        )}

        {/* ======================================= */}
        {/* TAB 3 - UNIDAD III: VECTORS & CONICS    */}
        {/* ======================================= */}
        {activeTab === 'vectors' && (
          <div className={`space-y-3 ${isExpanded ? 'grid grid-cols-1 md:grid-cols-2 gap-4 space-y-0' : ''}`} id="tab_vectors_body">
            
            {/* Polar representation of ellipse */}
            {renderAccordionSection('polar', '1. Ecuación Polar Orbital', (
              <>
                <div className="text-[10px] text-gray-400 font-semibold mb-1">r(θ) = a(1−e²) / (1 + e·cos(θ))</div>
                <div className="info-tip mb-2">
                  <span className="text-amber-400 font-bold">¿Para qué sirve?</span>
                  <p className="text-gray-300 mt-1">Con esta ecuación sabemos la distancia del planeta al Sol en cualquier ángulo θ, usando coordenadas polares que son perfectas para órbitas elípticas.</p>
                </div>
                <div className="bg-black/45 p-2 rounded border border-white/8 font-mono text-[10.5px] leading-normal">
                  Ángulo θ actual: <span className="text-gray-200 font-bold">{trueAnomalyTheta.toFixed(4)} rad</span> ({Math.round(trueAnomalyTheta * 180 / Math.PI)}°) <br />
                  Radio r calculado: <span className="text-white font-extrabold">{uniIII.rAU.toFixed(4)} AU</span>
                  <span className="text-gray-500 text-[10px] block font-medium">({formatScientific(uniIII.rKm)} km)</span>
                </div>
              </>
            ))}

            {/* Real-time vectors display */}
            {renderAccordionSection('vectors_rt', '2. Vectores Orbitarios en Tiempo Real (100ms)', (
              <>
                <div className="info-tip mb-2">
                  <span className="text-amber-400 font-bold">¿Para qué sirve?</span>
                  <p className="text-gray-300 mt-1">Con estos vectores sabemos exactamente dónde está el planeta (vector posición r⃗) y hacia dónde se está moviendo (vector velocidad v⃗) en cada momento.</p>
                </div>
                <div className="space-y-1 bg-black/40 p-2.5 rounded border border-white/8 text-[10.5px] font-mono leading-relaxed">
                  <div className="text-gray-300">r⃗  = ({Math.round(uniIII.posVector[0]).toLocaleString()}, {Math.round(uniIII.posVector[1]).toLocaleString()}, 0) km</div>
                  <div className="text-gray-100 font-black">|r⃗| = {Math.round(uniIII.rKm).toLocaleString()} km</div>
                  
                  <div className="text-gray-300 mt-2">v⃗  = ({uniIII.velVector[0].toFixed(2)}, {uniIII.velVector[1].toFixed(2)}, 0) km/s</div>
                  <div className="text-gray-100 font-black">|v⃗| = {uniIII.vMagnitude.toFixed(2)} km/s</div>
                </div>
              </>
            ))}

            {/* Dot Product Interpretation */}
            {renderAccordionSection('dot_product', '3. Producto Punto Cinemático', (
              <>
                <div className="text-[10px] text-gray-400 font-semibold mb-1">r⃗ · v⃗ = rx·vx + ry·vy + rz·vz</div>
                <div className="info-tip mb-2">
                  <span className="text-amber-400 font-bold">¿Para qué sirve?</span>
                  <p className="text-gray-300 mt-1">Con el producto punto sabemos si el planeta se está acercando o alejando del Sol en ese momento, sin tener que mirar la órbita.</p>
                </div>
                <div className="bg-black/40 p-2 rounded border border-[#00d4ff]/10 font-mono text-[10px]">
                  <div>Resultado: <span className={uniIII.dotProduct > 0 ? 'text-emerald-400' : 'text-rose-400'}>{formatScientific(uniIII.dotProduct)} km²/s</span></div>
                  <p className="text-[9px] text-gray-300 mt-1 pr-1 leading-normal uppercase text-center border-t border-white/10 pt-1 font-bold">
                    {uniIII.dotProduct > 0 
                      ? 'ALEJÁNDOSE DEL SOL (radial hacia Afelio)' 
                      : 'ACERCÁNDOSE AL SOL (radial hacia Perihelio)'}
                  </p>
                </div>
              </>
            ))}

            {/* Cross Product Angular Momentum */}
            {renderAccordionSection('cross_product', '4. Conservación Momento Angular (Producto Cruz)', (
              <>
                <div className="text-[10px] text-gray-400 font-semibold mb-1">L⃗ = r⃗ × v⃗</div>
                <div className="info-tip mb-2">
                  <span className="text-amber-400 font-bold">¿Para qué sirve?</span>
                  <p className="text-gray-300 mt-1">Con el producto cruz sabemos que el momento angular del planeta siempre es el mismo, lo que explica por qué los planetas se mueven más rápido cerca del Sol y más despacio lejos.</p>
                </div>
                <div className="bg-black/40 p-2 rounded space-y-1 text-[10.5px] font-mono border border-white/8">
                  <div>Momento Angular L: <span className="text-[#a855f7] font-extrabold">{formatScientific(uniIII.specificAngularMomentum)} km²/s</span></div>
                  <span className="text-[9px] text-gray-300 block font-bold uppercase">✓ Constante física garantizada en órbita cerrada</span>
                </div>
              </>
            ))}

            {/* Conic Gauge */}
            {renderAccordionSection('conic', '5. Clasificación de Cónica', (
              <>
                <div className="info-tip mb-2">
                  <span className="text-amber-400 font-bold">¿Para qué sirve?</span>
                  <p className="text-gray-300 mt-1">Con la excentricidad sabemos qué tipo de órbita tiene el planeta: círculo (e=0), elipse (0&lt;e&lt;1), parábola (e=1) o hipérbola (e&gt;1).</p>
                </div>
                <div className="flex justify-between items-center text-[10px] mt-1 mb-1 text-gray-400">
                  <span>Excentricidad e: <span className="text-white font-bold">{props.e.toFixed(4)}</span></span>
                  <span className="text-gray-200 font-bold">Elipse ✓</span>
                </div>

                <div className="w-full bg-gray-800 h-2 rounded overflow-hidden relative border border-gray-950">
                  <div 
                    className="bg-gradient-to-r from-teal-500 to-cyan-400 h-full transition-all" 
                    style={{ width: `${Math.min(100, (props.e / 1.5) * 100)}%` }} 
                  />
                  <span className="absolute left-[66%] top-0 h-full w-[2px] bg-red-500" title="Limite e=1.0" />
                </div>
                <div className="flex justify-between text-[8px] text-gray-500 mt-1 uppercase">
                  <span>Círculo (0.0)</span>
                  <span>Límite Parábola (1.0)</span>
                  <span>Hipérbola (&gt;1.0)</span>
                </div>
              </>
            ))}

            {/* Focal extremes */}
            {renderAccordionSection('extremes', 'Extremes Focales (Perihelio & Afelio)', (
              <>
                <div className="info-tip mb-2">
                  <span className="text-amber-400 font-bold">¿Para qué sirve?</span>
                  <p className="text-gray-300 mt-1">Con estos datos sabemos la distancia más cercana (perihelio) y más lejana (afelio) que alcanza el planeta del Sol en su órbita.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="glass-card p-2">
                    <span className="text-[var(--accent-cyan)] text-[9px] uppercase font-bold">PERIHELIO (Mínimo):</span>
                    <div className="font-bold text-white mt-0.5">{Math.round(uniIII.perihelioKm).toLocaleString()} km</div>
                    <span className="text-xs text-[var(--text-tertiary)] font-bold">({(uniIII.perihelioKm / AU_IN_KM).toFixed(4)} AU)</span>
                  </div>
                  <div className="glass-card p-2">
                    <span className="text-rose-400 text-[9px] uppercase font-bold">AFELIO (Máximo):</span>
                    <div className="font-bold text-white mt-0.5">{Math.round(uniIII.afelioKm).toLocaleString()} km</div>
                    <span className="text-xs text-[var(--text-tertiary)] font-bold">({(uniIII.afelioKm / AU_IN_KM).toFixed(4)} AU)</span>
                  </div>
                </div>
              </>
            ))}

            {/* Interactive orbit Layout figures */}
            {renderAccordionSection('geometry_2d', 'Visualización 2D de la Elipse y Radios Vectores', (
              <>
                <div className="info-tip mb-2">
                  <span className="text-amber-400 font-bold">¿Para qué sirve?</span>
                  <p className="text-gray-300 mt-1">Con esta visualización podemos ver la forma de la órbita elíptica y cómo cambia la distancia del planeta al Sol según su posición.</p>
                </div>
                <EllipseGeometryCanvas
                  planetName={planet.name}
                  semiMajorAxis={props.a}
                  eccentricity={props.e}
                  thetaRad={trueAnomalyTheta}
                  planetColor={planet.color}
                />
              </>
            ))}

            {/* Table layout Kepler's Third Law */}
            {renderAccordionSection('kepler_table', "Tabla de Verificación de 3ra Ley de Kepler", (
              <>
                <div className="info-tip mb-2">
                  <span className="text-amber-400 font-bold">¿Para qué sirve?</span>
                  <p className="text-gray-300 mt-1">Con esta tabla comprobamos que para todos los planetas, el cuadrado del período orbital dividido por el cubo del semieje mayor es casi el mismo, lo que confirma la 3ra Ley de Kepler.</p>
                </div>
                <div className="overflow-x-auto text-[9.5px]">
                  <table className="w-full text-left font-mono border-collapse" id="kepler_data_table">
                    <thead>
                      <tr className="border-b border-[var(--panel-border-strong)] text-[var(--text-tertiary)]">
                        <th className="py-1">PLANETA</th>
                        <th className="py-1 text-center">a (AU)</th>
                        <th className="py-1 text-center">T² (Año²)</th>
                        <th className="py-1 text-center">a³ (AU³)</th>
                        <th className="py-1 text-right text-[var(--accent-live)]">T²/a³</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keplerTable.map((item) => (
                        <tr 
                          key={item.name} 
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPlanet(item.name);
                          }}
                          className={`border-b border-[var(--panel-border)] cursor-pointer transition-colors ${
                            planet.name === item.name 
                              ? 'bg-[var(--accent-cyan)]/15 text-white font-bold' 
                              : 'hover:bg-white/[0.03] text-[var(--text-tertiary)]'
                          }`}
                        >
                          <td className="py-1 font-bold">{item.displayName}</td>
                          <td className="py-1 text-center">{item.a.toFixed(2)}</td>
                          <td className="py-1 text-center">{item.tSquared.toFixed(2)}</td>
                          <td className="py-1 text-center">{item.aCubed.toFixed(2)}</td>
                          <td className="py-1 text-right font-black text-[var(--accent-cyan)]">{item.ratio.toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ))}

          </div>
        )}

        {/* ======================================= */}
        {/* TAB 4 - PHYSICAL MANIPULATION MODULE    */}
        {/* ======================================= */}
        {activeTab === 'manipulation' && (
          <div className="space-y-3" id="tab_manipulation_body">
            
            <div className="glass-card p-2.5 text-[var(--text-secondary)] leading-normal mb-2">
              <div className="flex items-center gap-1.5 text-[var(--accent-cyan)] font-bold text-[10px] mb-1">
                <AlertTriangle className="w-4 h-4 text-[var(--accent-amber)] shrink-0" />
                <span>MODIFICACIÓN FÍSICA DE PARÁMETROS</span>
              </div>
              Modifica la gravedad, masa, tamaño, excentricidad y trayectoria de <span className="font-extrabold text-[var(--accent-live)]">{planet.displayName}</span> para alterar sus magnitudes físicas.
              <div className="text-[9.5px] text-gray-500 mt-1.5 font-ui">
                Estos mismos valores también se usan en el simulador de colisiones (abajo) para <span className="text-gray-300 font-semibold">cualquier</span> planeta, no solo la Tierra.
              </div>
            </div>

            {/* --- Overhaul Visual: franja de telemetría "hero" (mismos datos de los sliders, vista glanceable) --- */}
            <div className={`grid gap-2 mb-1 ${isExpanded ? 'grid-cols-4' : 'grid-cols-2'}`} id="phys_hero_stats_strip">
              {[
                { icon: Zap, label: 'MASA', value: modifier.massMultiplier, unit: 'x', min: 0.01, max: 100, color: 'var(--accent-cyan)' },
                { icon: Compass, label: 'EXCENTRIC.', value: modifier.eccentricity, unit: '', min: 0, max: 0.95, color: 'var(--accent-orange)' },
                { icon: TrendingUp, label: 'DIST. SOLAR', value: modifier.semiMajorAxisMultiplier, unit: 'x', min: 0.3, max: 3, color: 'var(--accent-live)' },
                { icon: Layers, label: 'RADIO', value: modifier.radiusMultiplier, unit: 'x', min: 0.1, max: 10, color: '#c084fc' }
              ].map((stat, i) => {
                const pct = Math.min(100, Math.max(0, ((stat.value - stat.min) / (stat.max - stat.min)) * 100));
                const isAltered = Math.abs(stat.value - (stat.label === 'EXCENTRIC.' ? planet.eccentricity : 1.0)) > 0.001;
                return (
                  <div key={i} className="glass-card p-2 relative overflow-hidden" style={{ borderColor: isAltered ? `${stat.color}55` : undefined }}>
                    <div className="flex items-center gap-1 mb-1">
                      <stat.icon className="w-3 h-3 shrink-0" style={{ color: stat.color }} />
                      <span className="hud-eyebrow !text-[8px]">{stat.label}</span>
                    </div>
                    <div className="telemetry-value font-black text-[13px]" style={{ color: isAltered ? stat.color : 'var(--text-primary)' }}>
                      {stat.value.toFixed(2)}{stat.unit}
                    </div>
                    <div className="h-[3px] w-full bg-black/40 rounded-full mt-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%`, background: stat.color, boxShadow: `0 0 6px ${stat.color}` }}
                      />
                    </div>
                    {isAltered && (
                      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: stat.color, boxShadow: `0 0 6px ${stat.color}` }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Slider Planet Mass */}
            {renderAccordionSection('slider_mass', '1. Masa del Planeta', (
              <>
                <div className="info-tip mb-2">
                  <span className="text-amber-400 font-bold">¿Para qué sirve?</span>
                  <p className="text-gray-300 mt-1">Con este control podemos cambiar la masa del planeta y ver cómo afecta su gravedad, velocidad de escape y otros parámetros físicos.</p>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10.5px]">
                    <span className="font-bold text-gray-300">Multiplicador:</span>
                    <span className="text-gray-200 font-bold">{modifier.massMultiplier.toFixed(2)}x real</span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="100"
                    step="0.05"
                    value={modifier.massMultiplier}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      handleSliderChange(
                        'massMultiplier', 
                        val, 
                        'Masa del Planeta', 
                        'ρ = m/V,   v_esc = √(2Gm/r)', 
                        `${modifier.massMultiplier.toFixed(1)}x`,
                        `${val.toFixed(1)}x`
                      );
                    }}
                    className="w-full hud-slider"
                  />
                  {modifier.massMultiplier !== 1.0 && (
                    <span className="text-[9px] font-bold bg-amber-950/50 border border-amber-500/30 text-amber-500 px-1 rounded block text-center uppercase">
                      ⚠ Masa modificada: {(planet.realMass * modifier.massMultiplier).toFixed(3)} Tierras
                    </span>
                  )}
                </div>
              </>
            ), (
              <span className="telemetry-value !text-[9px] !text-[var(--accent-cyan)] font-bold">{modifier.massMultiplier.toFixed(2)}x</span>
            ))}

            {/* Slider Planet Eccentricity */}
            {renderAccordionSection('slider_ecc', '2. Excentricidad Orbital (e)', (
              <>
                <div className="info-tip mb-2">
                  <span className="text-amber-400 font-bold">¿Para qué sirve?</span>
                  <p className="text-gray-300 mt-1">Con este control podemos cambiar la forma de la órbita, desde un círculo casi perfecto (e=0) hasta una elipse muy alargada (e cerca de 1).</p>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10.5px]">
                    <span className="font-bold text-gray-300">Excentricidad:</span>
                    <span className="text-gray-200 font-bold">{modifier.eccentricity.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.00"
                    max="0.95"
                    step="0.01"
                    value={modifier.eccentricity}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      handleSliderChange(
                        'eccentricity', 
                        val, 
                        'Excentricidad Orbital', 
                        'b = a·√(1−e²),  A = π·a·b', 
                        `${modifier.eccentricity.toFixed(2)}`,
                        `${val.toFixed(2)}`
                      );
                    }}
                    className="w-full hud-slider"
                  />
                </div>
              </>
            ), (
              <span className="telemetry-value !text-[9px] !text-[var(--accent-orange)] font-bold">{modifier.eccentricity.toFixed(2)}</span>
            ))}

            {/* Slider Major Axis distance */}
            {renderAccordionSection('slider_axis', '3. Semieje Mayor (a)', (
              <>
                <div className="info-tip mb-2">
                  <span className="text-amber-400 font-bold">¿Para qué sirve?</span>
                  <p className="text-gray-300 mt-1">Con este control podemos cambiar la distancia promedio del planeta al Sol y ver cómo afecta su período orbital (tiempo que tarda en dar una vuelta completa).</p>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10.5px]">
                    <span className="font-bold text-gray-300">Distancia al Sol:</span>
                    <span className="text-gray-200 font-bold">{modifier.semiMajorAxisMultiplier.toFixed(2)}x real</span>
                  </div>
                  <input
                    type="range"
                    min="0.3"
                    max="3"
                    step="0.05"
                    value={modifier.semiMajorAxisMultiplier}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      handleSliderChange(
                        'semiMajorAxisMultiplier', 
                        val, 
                        'Semieje Mayor', 
                        'T² = a³,   W = ΔEp', 
                        `${modifier.semiMajorAxisMultiplier.toFixed(1)}x`,
                        `${val.toFixed(1)}x`
                      );
                    }}
                    className="w-full hud-slider"
                  />
                  {modifier.semiMajorAxisMultiplier !== 1.0 && (
                    <span className="text-[9px] text-[var(--accent-amber)] px-1 rounded block text-center uppercase font-bold bg-white/5 py-0.5">
                      Nuevo Período recalculado: {props.tYears.toFixed(2)} Años
                    </span>
                  )}
                </div>
              </>
            ), (
              <span className="telemetry-value !text-[9px] !text-[var(--accent-live)] font-bold">{modifier.semiMajorAxisMultiplier.toFixed(2)}x</span>
            ))}

            {/* Slider Planet radius scale */}
            {renderAccordionSection('slider_rad', '4. Radio del Planeta (r)', (
              <>
                <div className="info-tip mb-2">
                  <span className="text-amber-400 font-bold">¿Para qué sirve?</span>
                  <p className="text-gray-300 mt-1">Con este control podemos cambiar el tamaño del planeta y ver cómo afecta su volumen y densidad (si la masa se mantiene igual).</p>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10.5px]">
                    <span className="font-bold text-gray-300">Radio Físico:</span>
                    <span className="text-gray-200 font-bold">{modifier.radiusMultiplier.toFixed(2)}x real</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="10.0"
                    step="0.1"
                    value={modifier.radiusMultiplier}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      handleSliderChange(
                        'radiusMultiplier', 
                        val, 
                        'Radio Planetario', 
                        'V = (4/3)·π·r³,  ρ = m/V', 
                        `${modifier.radiusMultiplier.toFixed(1)}x`,
                        `${val.toFixed(1)}x`
                      );
                    }}
                    className="w-full hud-slider"
                  />
                </div>
              </>
            ), (
              <span className="telemetry-value !text-[9px] font-bold" style={{ color: '#c084fc' }}>{modifier.radiusMultiplier.toFixed(2)}x</span>
            ))}

            {/* Action launcher triggers */}
            {renderAccordionSection('action_triggers', '5. SIMULADOR DE EVENTOS EXTREMOS', (
              <>
                <div className="info-tip mb-2">
                  <span className="info-tip-label">¿Para qué sirve?</span>
                  <p>Con estas herramientas simulamos eventos extremos —un sobrevuelo hiperbólico o una colisión entre dos cuerpos— y observamos cómo se conservan la masa, el momento y la energía.</p>
                </div>
                <div className="space-y-3 pb-1">

                  {/* Variables que alimentan ambos motores (siempre la Tierra: es el cuerpo que realmente se lanza) */}
                  <div className="glass-card p-2.5 text-[10px] text-[var(--text-secondary)]">
                    <div className="flex items-center gap-1.5 font-bold text-white mb-1.5">
                      <Settings2 className="w-3 h-3 text-[var(--text-tertiary)]" />
                      <span>Variables activas de la Tierra (cuerpo lanzado)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono">
                      <span>Masa: <span className="text-white">{(planetModifiers['earth']?.massMultiplier ?? 1).toFixed(2)}x</span></span>
                      <span>Radio: <span className="text-white">{(planetModifiers['earth']?.radiusMultiplier ?? 1).toFixed(2)}x</span></span>
                      <span>e: <span className="text-white">{(planetModifiers['earth']?.eccentricity ?? 0.0167).toFixed(4)}</span></span>
                      <span>a: <span className="text-white">{(planetModifiers['earth']?.semiMajorAxisMultiplier ?? 1).toFixed(2)}x</span></span>
                    </div>
                    {planet.name !== 'earth' && (
                      <p className="text-[9px] text-[var(--text-faint)] font-ui mt-1.5 leading-snug">
                        Nota: estás viendo los controles de {planet.displayName}, pero el simulador de eventos siempre lanza la Tierra. Seleccioná la Tierra arriba para modificarla.
                      </p>
                    )}
                  </div>

                  {/* Cometa hiperbólico */}
                  <button
                    onClick={cometState?.active ? onCancelComet : onLaunchComet}
                    id="btn_launch_comet"
                    className={`w-full py-2 px-3 rounded-md font-bold transition-all text-[11px] cursor-pointer flex items-center justify-center gap-2 ${
                      cometState?.active ? 'btn-hud-active' : 'btn-hud'
                    }`}
                  >
                    {cometState?.active ? <Square className="w-3.5 h-3.5" /> : <Sparkle className="w-3.5 h-3.5" />}
                    {cometState?.active ? 'DETENER SOBREVUELO EN CURSO' : 'LANZAR SOBREVUELO HIPERBÓLICO (e = 1.25)'}
                  </button>

                  {/* Colisión planetaria */}
                  <div className="glass-card !border-[var(--accent-danger)]/25 p-2.5 rounded-lg space-y-2" id="collision_engine_wrapper">
                    <div className="flex items-center gap-1.5 hud-eyebrow !text-[9px] !text-[var(--accent-danger)] border-b border-[var(--accent-danger)]/15 pb-1.5">
                      <Flame className="w-3 h-3" />
                      <span>SIMULADOR DE COLISIÓN PLANETARIA</span>
                    </div>
                    <p className="text-[9.5px] text-[var(--text-tertiary)] font-ui leading-snug">
                      Lanza la Tierra (con sus modificadores actuales) contra cualquier otro planeta del sistema. Elegís el objetivo dentro de la pantalla de colisión.
                    </p>
                    <button
                      onClick={() => onTriggerCollision('earth', 'mars')}
                      className="w-full py-2 bg-[var(--accent-danger)]/12 hover:bg-[var(--accent-danger)]/20 border border-[var(--accent-danger)]/40 text-[var(--accent-danger)] font-bold rounded-md cursor-pointer text-center text-[10.5px] flex items-center justify-center gap-2 transition-all"
                    >
                      <Rocket className="w-3.5 h-3.5" />
                      ABRIR SIMULADOR DE COLISIÓN
                    </button>
                  </div>

                  {/* Restore values */}
                  <button
                    onClick={onResetModifiers}
                    className="w-full py-1.5 px-3 btn-hud rounded-md text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    RESTAURAR VALORES REALES NASA
                  </button>
                </div>
              </>
            ))}

            {/* Change log alerts display */}
            {alerts.length > 0 && renderAccordionSection('alerts', `Historial de Cambios (${alerts.length})`, (
              <>
                <div className="info-tip mb-2">
                  <span className="text-amber-400 font-bold">¿Para qué sirve?</span>
                  <p className="text-gray-300 mt-1">Con este historial podemos ver todos los cambios que hemos hecho a los parámetros del planeta y cómo afectaron las fórmulas físicas.</p>
                </div>
                <div className="space-y-2" id="alerts_list">
                  {alerts.map((alert, idx) => (
                    <div 
                      key={idx} 
                      className="border-l-2 border-[var(--accent-amber)] bg-[var(--accent-amber)]/[0.07] p-2 rounded-r-md text-[10px] space-y-0.5 animate-fade-in"
                    >
                      <div className="text-[var(--accent-amber)] font-bold uppercase flex items-center gap-1">
                        <span>⚠ CAMBIO DETECTADO</span>
                      </div>
                      <div>Parámetro: <span className="text-white font-semibold">{alert.parameter}</span></div>
                      <div className="text-[var(--text-tertiary)]">Fórmula afectada: {alert.formula}</div>
                      <div className="text-[var(--text-secondary)] font-mono">Anterior: <span className="text-rose-400 font-bold">{alert.prevValue}</span> → Nuevo: <span className="text-emerald-400 font-bold">{alert.newValue}</span></div>
                    </div>
                  ))}
                </div>
              </>
            ))}

          </div>
        )}

      </div>
        </>
      )}
    </div>
  );
}
