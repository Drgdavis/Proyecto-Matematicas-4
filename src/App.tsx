import { useState, useEffect } from 'react';
import { LeftPanel } from './components/LeftPanel';
import { RightPanel } from './components/RightPanel';
import { SolarSystem3D } from './components/SolarSystem3D';
import Expedition from './Expedition';
import { CollisionModal } from './components/CollisionModal';
import { FinalDashboard } from './components/FinalDashboard';
import { PLANETS_DATA, EARTH_MASS_KG, EARTH_RADIUS_KM } from './data/planets';
import { PhysicalData, ModifiedPhysicalData, CameraMode, CometState, AlertState, CollisionState } from './types';
import { ShieldAlert, Sparkles, Zap, BarChart3, Rocket, RotateCcw, MapPin } from 'lucide-react';

export default function App() {
  const [selectedPlanetName, setSelectedPlanetName] = useState<string>('earth');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(10.0);
  
  // Custom view toggles
  const [toggles, setToggles] = useState({
    orbits: true,
    trails: true,
    lunas: true,
    names: true,
    vectors: false,
    grid: false,
    gravValue: false
  });

  const [cameraMode, setCameraMode] = useState<CameraMode>('free');
  const [simulatedDays, setSimulatedDays] = useState<number>(0);
  const [comparisonMode, setComparisonMode] = useState<boolean>(false);
  const [hoveredPlanetName, setHoveredPlanetName] = useState<string | null>(null);
  // --- Overhaul: tarjeta de información ligera al hacer clic en una luna ---
  const [selectedMoonInfo, setSelectedMoonInfo] = useState<{ moonName: string; parentPlanet: string } | null>(null);
  const [globalPlanetSize, setGlobalPlanetSize] = useState<number>(3.5); // 3.5x beautiful default so they are perfectly clear from orbit zoom

  // Maintain individual modifiers for each planeta to enable complex custom solar environments! (e.g., resizing Earth without affecting Saturn)
  const [planetModifiers, setPlanetModifiers] = useState<Record<string, ModifiedPhysicalData>>(() => {
    const initial: Record<string, ModifiedPhysicalData> = {};
    PLANETS_DATA.forEach(p => {
      initial[p.name] = {
        massMultiplier: 1.0,
        eccentricity: p.eccentricity,
        semiMajorAxisMultiplier: 1.0,
        radiusMultiplier: 1.0
      };
    });
    return initial;
  });

  // Hyperbolic Comet parameters
  const [cometState, setCometState] = useState<CometState>({
    active: false,
    position: [0, 0, 0],
    semiMajorAxis: 24, // custom trajectory Major axis bounds
    eccentricity: 1.25, // hyperbolic escape speed
    color: '#ffffff',
    t: 0
  });

  // Collision state managers
  const [collisionOverlay, setCollisionOverlay] = useState<boolean>(false);
  const [collisionText, setCollisionText] = useState<string | null>(null);
  const [collisionState, setCollisionState] = useState<CollisionState>({
    active: false,
    planetA: 'earth',
    planetB: 'mars',
    progress: 0,
    completed: false
  });
  const [isCollisionModalOpen, setIsCollisionModalOpen] = useState<boolean>(false);
  const [isFinalDashboardOpen, setIsFinalDashboardOpen] = useState<boolean>(false);
  const [experiencePhase, setExperiencePhase] = useState<'solar' | 'descent' | 'surface'>(() =>
    new URLSearchParams(window.location.search).get('eva01') === 'solar' ? 'solar' : 'surface'
  );

  useEffect(() => {
    if (experiencePhase !== 'descent') return;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      params.set('eva01', 'surface');
      params.set('scene', '1');
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}${window.location.hash}`);
      setExperiencePhase('surface');
    }, 6800);
    return () => window.clearTimeout(timer);
  }, [experiencePhase]);

  // Pick selected planet object derived from state
  const currentPlanet = PLANETS_DATA.find(p => p.name === selectedPlanetName) || PLANETS_DATA[2];

  const handlePlanetSelect = (name: string) => {
    setSelectedPlanetName(name);
    setSelectedMoonInfo(null);
    setCameraMode('follow');
  };

  const handleToggleChange = (key: string) => {
    setToggles(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev]
    }));
  };

  const handleModifierUpdate = (updater: (prev: ModifiedPhysicalData) => ModifiedPhysicalData) => {
    setPlanetModifiers(prev => ({
      ...prev,
      [selectedPlanetName]: updater(prev[selectedPlanetName])
    }));
  };

  const handleResetPlanetModifiers = () => {
    setPlanetModifiers(prev => ({
      ...prev,
      [selectedPlanetName]: {
        massMultiplier: 1.0,
        eccentricity: currentPlanet.eccentricity,
        semiMajorAxisMultiplier: 1.0,
        radiusMultiplier: 1.0
      }
    }));
  };

  const handleLaunchComet = () => {
    setCometState({
      active: true,
      position: [0, 0, 0],
      semiMajorAxis: 28,
      eccentricity: 1.25,
      color: '#ffffff',
      t: 0
    });
  };

  // --- Overhaul: permite cancelar manualmente el sobrevuelo en curso --------
  const handleCancelComet = () => {
    setCometState(prev => ({ ...prev, active: false, t: 0 }));
  };

  // Perform screenshot PNG file trigger
  const handleScreenshot = () => {
    const mountEl = document.getElementById('canvas_threejs_mount');
    const canvas = mountEl?.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `solar_math3_${Date.now()}.png`;
      a.click();
    }
  };

  // Trigger collision modal
  const handleCollisionTrigger = (planetA: string, planetB: string) => {
    setIsCollisionModalOpen(true);
  };

  // Reset collision to try again
  const handleResetCollision = () => {
    setCollisionState({
      active: false,
      planetA: 'earth',
      planetB: 'mars',
      progress: 0,
      completed: false
    });
    // Reset visibility of planets
    setTimeout(() => {
      setCollisionText(null);
    }, 300);
  };

  const startEvaDescent = () => {
    setSelectedPlanetName('mars');
    setSelectedMoonInfo(null);
    setComparisonMode(false);
    setIsPaused(true);
    setCameraMode('free');
    setToggles(prev => ({ ...prev, names: true, orbits: true }));
    setExperiencePhase('descent');
  };

  const returnToOrbit = () => {
    const params = new URLSearchParams(window.location.search);
    params.set('eva01', 'solar');
    params.delete('scene');
    const query = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
    setExperiencePhase('solar');
    setCameraMode('free');
    setIsPaused(false);
  };

  if (experiencePhase === 'surface') {
    return <Expedition onBackSolar={returnToOrbit} />;
  }

  return (
    <div className={`w-screen h-screen overflow-hidden flex flex-col bg-[var(--space-950)] text-[#a0aec0] font-mono relative select-none ${experiencePhase === 'descent' ? 'eva01-is-descending' : ''}`} id="app_root_layout">

      {/* Fondo ambiente deep-space + viñeta (puramente decorativo) */}
      <div className="deep-space-backdrop" />

      {experiencePhase === 'descent' && (
        <div className="eva01-descent-overlay" role="status" aria-live="polite">
          <div className="eva01-entry-ring" />
          <div className="eva01-descent-copy">
            <span>TRANSFERENCIA ORBITAL COMPLETADA</span>
            <h2>DESCENSO A EVA03</h2>
            <p>Marte · corredor de entrada · enlace con superficie</p>
          </div>
          <div className="eva01-descent-telemetry">
            <span><b>FASE 01</b> Aproximación</span>
            <span><b>FASE 02</b> Entrada atmosférica</span>
            <span><b>FASE 03</b> Enlace EVA03</span>
          </div>
        </div>
      )}

      {/* 1. TOP HUD BAR — telemetría de misión */}
      <header className="h-12 shrink-0 border-b border-[var(--panel-border)] glass-panel-strong flex items-center justify-between px-6 z-50 relative">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-2.5 h-2.5">
            <span className="absolute w-2.5 h-2.5 bg-[var(--accent-cyan)] rounded-full animate-ping opacity-40" />
            <span className="relative w-1.5 h-1.5 bg-[var(--accent-cyan)] rounded-full shadow-[0_0_8px_var(--accent-cyan-glow)]" />
          </div>
          <h1 className="hud-title tracking-[0.18em] text-[13px] sm:text-[15px] flex items-baseline gap-2">
            SOLAR&nbsp;MATH&nbsp;III&nbsp;×&nbsp;EVA03
            <span className="hud-eyebrow !text-[9px] opacity-60 font-normal tracking-widest">MISIÓN INTEGRADA</span>
          </h1>
        </div>
        <div className="hidden sm:flex gap-7">
          <div className="flex flex-col gap-0.5">
            <span className="hud-eyebrow">Motor de Render</span>
            <span className="telemetry-value text-[11px] text-white font-semibold">Three.js · PBR</span>
          </div>
          <div className="w-px self-stretch bg-[var(--panel-border)]" />
          <div className="flex flex-col gap-0.5">
            <span className="hud-eyebrow">Modo Físico</span>
            <span className="telemetry-value text-[11px] text-white font-semibold">Kepleriano Elíptico</span>
          </div>
          <div className="w-px self-stretch bg-[var(--panel-border)]" />
          <div className="flex flex-col gap-0.5">
            <span className="hud-eyebrow">Tiempo Sim.</span>
            <span className="telemetry-value text-[11px] text-[var(--accent-cyan)] font-semibold">J2000.0 + {(simulatedDays / 365.25).toFixed(1)}y</span>
          </div>
          <div className="w-px self-stretch bg-[var(--panel-border)]" />
          <button className="eva03-mission-cta" onClick={startEvaDescent} title="Iniciar la transición del Sistema Solar a la base marciana">
            <Rocket size={15} /> VIAJAR A MARTE
          </button>
          <div className="w-px self-stretch bg-[var(--panel-border)]" />
          <div className="flex flex-col gap-0.5 items-end justify-center">
            <div className="live-indicator">
              <span className="live-dot" />
              <span className="live-label">{isPaused ? 'EN PAUSA' : 'LIVE'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE CONTENT CONTAINER */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* LEFT PANEL - SIMULATION CONTROLS */}
        <LeftPanel
          planets={PLANETS_DATA}
          selectedPlanet={selectedPlanetName}
          onSelectPlanet={handlePlanetSelect}
          speed={speed}
          onSpeedChange={setSpeed}
          isPaused={isPaused}
          onTogglePlay={() => setIsPaused(!isPaused)}
          toggles={toggles}
          onToggleChange={handleToggleChange}
          cameraMode={cameraMode}
          onCameraModeChange={setCameraMode}
          simulatedDays={simulatedDays}
          onResetTime={() => setSimulatedDays(0)}
          comparisonMode={comparisonMode}
          onToggleComparison={() => setComparisonMode(!comparisonMode)}
          onScreenshot={handleScreenshot}
          globalPlanetSize={globalPlanetSize}
          onGlobalPlanetSizeChange={setGlobalPlanetSize}
          onOpenDashboard={() => setIsFinalDashboardOpen(true)}
        />

        {/* CENTER - 3D THREEPORT VIEWPORT */}
        <div className="flex-1 h-full relative" id="solar_system_3d_container">
          <SolarSystem3D
            planets={PLANETS_DATA}
            selectedPlanet={selectedPlanetName}
            onSelectPlanet={handlePlanetSelect}
            onSelectMoon={(moonName, parentPlanet) => setSelectedMoonInfo({ moonName, parentPlanet })}
            speed={speed}
            isPaused={isPaused}
            toggles={toggles}
            cameraMode={cameraMode}
            onCameraModeChange={setCameraMode}
            planetModifiers={planetModifiers}
            cometState={cometState}
            onUpdateComet={setCometState}
            comparisonMode={comparisonMode}
            hoveredPlanet={hoveredPlanetName}
            setHoveredPlanet={setHoveredPlanetName}
            onUpdateSimulatedTime={(days) => setSimulatedDays(prev => prev + days)}
            globalPlanetSize={globalPlanetSize}
            collisionState={collisionState}
            onCollisionStateChange={setCollisionState}
            descentActive={experiencePhase === 'descent'}
          />

          {selectedPlanetName === 'mars' && experiencePhase === 'solar' && (
            <section className="eva01-orbit-card" aria-label="Punto de descenso a la Base EVA03">
              <div className="eva01-orbit-heading">
                <span className="eva01-site-pulse" />
                <div>
                  <span>SUPERFICIE DE MARTE</span>
                  <strong>BASE EVA03</strong>
                </div>
                <MapPin size={18} />
              </div>
              <dl>
                <div><dt>Plataforma</dt><dd>3.79% pendiente</dd></div>
                <div><dt>Ruta</dt><dd>226.20 m</dd></div>
                <div><dt>Estado</dt><dd className="eva01-online">EN LÍNEA</dd></div>
              </dl>
              <button onClick={startEvaDescent}>
                <Rocket size={17} /> Iniciar descenso a EVA03
              </button>
            </section>
          )}

          {/* --- Overhaul: tarjeta flotante de datos de la luna seleccionada --- */}
          {selectedMoonInfo && (() => {
            const parent = PLANETS_DATA.find(p => p.name === selectedMoonInfo.parentPlanet);
            const moon = parent?.moons.find(m => m.name === selectedMoonInfo.moonName);
            if (!moon) return null;
            return (
              <div className="absolute top-16 right-4 z-30 glass-panel-strong rounded-xl p-4 w-72 animate-fade-in font-mono" id="moon_info_card">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full border border-white/40 shrink-0" style={{ backgroundColor: moon.color, boxShadow: `0 0 8px ${moon.color}` }} />
                    <div>
                      <h3 className="hud-title text-[13px] tracking-wide leading-tight">{moon.name}</h3>
                      <span className="hud-eyebrow !text-[8px]">Satélite de {parent?.displayName}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedMoonInfo(null)}
                    className="btn-hud rounded-md w-5 h-5 flex items-center justify-center shrink-0 text-[10px]"
                  >
                    ✕
                  </button>
                </div>
                {moon.description && (
                  <p className="text-[10.5px] text-[var(--text-secondary)] font-ui leading-relaxed mb-3">{moon.description}</p>
                )}
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  {moon.realRadiusKm && (
                    <div className="glass-card p-2">
                      <span className="hud-eyebrow !text-[8px] block">Radio Real</span>
                      <span className="telemetry-value text-white font-bold">{moon.realRadiusKm.toLocaleString()} km</span>
                    </div>
                  )}
                  {moon.realDistanceKm && (
                    <div className="glass-card p-2">
                      <span className="hud-eyebrow !text-[8px] block">Distancia al Planeta</span>
                      <span className="telemetry-value text-white font-bold">{moon.realDistanceKm.toLocaleString()} km</span>
                    </div>
                  )}
                  <div className="glass-card p-2">
                    <span className="hud-eyebrow !text-[8px] block">Periodo Orbital</span>
                    <span className="telemetry-value text-white font-bold">{moon.orbitalPeriod.toFixed(2)} días</span>
                  </div>
                  <div className="glass-card p-2">
                    <span className="hud-eyebrow !text-[8px] block">Planeta Padre</span>
                    <span className="telemetry-value text-[var(--accent-live)] font-bold">{parent?.displayName}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Floating current hover planet indicator */}
          {hoveredPlanetName && (
            <div className="absolute right-4 bottom-4 pointer-events-none z-20 flex gap-2.5 items-center glass-panel-strong px-3.5 py-2 rounded-md max-w-sm shadow-xl animate-fade-in" id="hud_selection_details">
              <span className="w-2.5 h-2.5 rounded-full border border-white/40 shrink-0" style={{ backgroundColor: PLANETS_DATA.find(p=>p.name===hoveredPlanetName)?.color, boxShadow: `0 0 10px ${PLANETS_DATA.find(p=>p.name===hoveredPlanetName)?.color}` }} />
              <div className="text-xs leading-tight">
                <span className="text-[var(--accent-live)] font-bold uppercase tracking-wide font-mono">{PLANETS_DATA.find(p=>p.name===hoveredPlanetName)?.displayName}</span>
                <span className="text-[var(--text-tertiary)] font-medium ml-1.5 font-ui">— clic para análisis matemático</span>
              </div>
            </div>
          )}

          {/* Global Collision Text Panel Overlay */}
          {collisionText && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 glass-panel-strong border-[var(--accent-orange)]/40 max-w-lg p-4 rounded-xl shadow-2xl flex flex-col items-center gap-3 animate-fade-in" id="collision_hud_alarm_card" style={{ boxShadow: '0 0 40px rgba(255,138,61,0.25)' }}>
              <ShieldAlert className="w-10 h-10 text-[var(--accent-orange)] animate-pulse" />
              <pre className="text-xs text-[var(--accent-orange)] whitespace-pre-wrap font-mono text-center leading-relaxed">
                {collisionText}
              </pre>
            </div>
          )}

          {/* BLINDING WHITE/ORANGE COLLISION FLASH COMPONENT */}
          {collisionOverlay && (
            <div className="absolute inset-0 z-50 bg-gradient-to-br from-white via-orange-300 to-amber-100 flex items-center justify-center animate-pulse" id="nuclear_flash_overlay">
              <div className="text-black font-black font-mono text-2xl tracking-widest text-center flex flex-col gap-2">
                <Sparkles className="w-16 h-16 text-amber-700 animate-spin self-center" />
                <span>COLISIÓN PLASTICA INELÁSTICA</span>
                <span className="text-xs tracking-normal font-bold">Conservación de Impulso y Masa</span>
              </div>
            </div>
          )}
        </div>

        {/* 3. RIGHT PANEL - MATHEMATICAL WORKSPACES */}
        <RightPanel
          planet={currentPlanet}
          allPlanets={PLANETS_DATA}
          onSelectPlanet={handlePlanetSelect}
          modifier={planetModifiers[selectedPlanetName]}
          onModifierChange={handleModifierUpdate}
          onResetModifiers={handleResetPlanetModifiers}
          onLaunchComet={handleLaunchComet}
          onCancelComet={handleCancelComet}
          planetModifiers={planetModifiers}
          onTriggerCollision={handleCollisionTrigger}
          cometState={cometState}
          collisionState={collisionState}
          onResetCollision={handleResetCollision}
        />

      </div>

      {/* 3. BOTTOM PLAYBACK HUD BAR — línea de tiempo de misión */}
      <footer className="h-11 shrink-0 border-t border-[var(--panel-border)] glass-panel-strong flex items-center px-4 z-50 relative" id="bottom_hud_bar">
        <div className="flex items-center gap-4 w-full font-mono">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="btn-hud rounded-md w-8 h-7 flex items-center justify-center text-[var(--accent-cyan)] text-xs cursor-pointer shrink-0"
            title={isPaused ? "Reanudar Simulación" : "Pausar Simulación"}
          >
            {isPaused ? "▶" : "❚❚"}
          </button>

          <div className="flex-1 flex flex-col gap-1">
            <div className="hud-timeline-track">
              <div
                className="hud-timeline-fill"
                style={{ width: `${((simulatedDays * 0.5) % 100).toFixed(1)}%` }}
              />
              <div className="hud-timeline-ticks">
                {Array.from({ length: 21 }).map((_, i) => <span key={i} />)}
              </div>
            </div>
          </div>

          <div className="flex gap-4 shrink-0 items-center text-[9.5px]">
            <span className="hud-eyebrow !text-[9.5px]">EPOCH J2000.0</span>
            <span className="text-[var(--text-secondary)]">
              PROGRESO ORBITAL: <span className="telemetry-value text-[var(--accent-cyan)] font-bold">{((simulatedDays * 0.5) % 100).toFixed(1)}%</span>
            </span>
            <div className="w-px h-4 bg-[var(--panel-border)]" />
            <div className="live-indicator">
              <span className="live-dot" />
              <span className="live-label">{isPaused ? 'PAUSA' : 'REAL RATE'}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* 4. COLLISION MODAL - PANTALLA EXCLUSIVA DE COLISIÓN */}
      <CollisionModal
        isOpen={isCollisionModalOpen}
        onClose={() => setIsCollisionModalOpen(false)}
        earthModifier={planetModifiers['earth']}
        planetModifiers={planetModifiers}
      />

      {/* 5. FINAL DASHBOARD - DASHBOARD FINAL CON TODAS LAS UNIDADES */}
      <FinalDashboard
        isOpen={isFinalDashboardOpen}
        onClose={() => setIsFinalDashboardOpen(false)}
        planetModifiers={planetModifiers}
      />

    </div>
  );
}
