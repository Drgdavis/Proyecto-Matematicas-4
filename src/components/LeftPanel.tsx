import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RefreshCw, Eye, Camera, Search, Compass, Layers, BarChart3, ChevronsLeft, ChevronsRight, Radio, Telescope, Clock3, ScanLine } from 'lucide-react';
import { PhysicalData, CameraMode } from '../types';

interface LeftPanelProps {
  compact?: boolean;
  planets: PhysicalData[];
  selectedPlanet: string;
  onSelectPlanet: (name: string) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  isPaused: boolean;
  onTogglePlay: () => void;
  toggles: {
    orbits: boolean;
    trails: boolean;
    lunas: boolean;
    names: boolean;
    vectors: boolean;
    grid: boolean;
    gravValue: boolean;
  };
  onToggleChange: (key: string) => void;
  cameraMode: CameraMode;
  onCameraModeChange: (mode: CameraMode) => void;
  simulatedDays: number;
  onResetTime: () => void;
  comparisonMode: boolean;
  onToggleComparison: () => void;
  onScreenshot: () => void;
  globalPlanetSize: number;
  onGlobalPlanetSizeChange: (scale: number) => void;
  onOpenDashboard: () => void;
}

export function LeftPanel({
  planets,
  selectedPlanet,
  onSelectPlanet,
  speed,
  onSpeedChange,
  isPaused,
  onTogglePlay,
  toggles,
  onToggleChange,
  cameraMode,
  onCameraModeChange,
  simulatedDays,
  onResetTime,
  comparisonMode,
  onToggleComparison,
  onScreenshot,
  globalPlanetSize,
  onGlobalPlanetSizeChange,
  onOpenDashboard,
  compact = false
}: LeftPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  // --- Estado puramente visual: colapso del panel de telemetría (no afecta física/estado de simulación) ---
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => { if (compact) setCollapsed(false); }, [compact]);
  const miniMapCanvasRef = useRef<HTMLCanvasElement>(null);

  // Parse simulated day counter (epoch starting Jan 1, 2000 J2000.0)
  const formatEpochTime = (daysCount: number) => {
    const baseDate = new Date(2000, 0, 1, 12, 0, 0); // J2000 epochs
    const simDate = new Date(baseDate.getTime() + daysCount * 24 * 3600 * 1000);
    
    const year = simDate.getUTCFullYear();
    const dayOfYear = Math.floor((simDate.getTime() - new Date(year, 0, 1).getTime()) / (24 * 3600 * 1000)) + 1;
    const hours = simDate.getUTCHours().toString().padStart(2, '0');
    const minutes = simDate.getUTCMinutes().toString().padStart(2, '0');

    return { year, dayOfYear, hours, minutes };
  };

  const { year, dayOfYear, hours, minutes } = formatEpochTime(simulatedDays);

  // Search logic
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQuery = searchQuery.trim().toLowerCase();
    const found = planets.find(p => p.displayName.toLowerCase().includes(cleanQuery) || p.name.toLowerCase().includes(cleanQuery));
    if (found) {
      onSelectPlanet(found.name);
      onCameraModeChange('follow');
    }
  };

  // 2D Cenital minimap drawing loop
  useEffect(() => {
    const canvas = miniMapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Draw solar center indicator (glow premium)
    const cx = width / 2;
    const cy = height / 2;
    ctx.save();
    ctx.shadowColor = '#ff8a3d';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffb44d';
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Map planar orbits centered
    planets.forEach((p, idx) => {
      // Map orbit paths (simple circle representation for planar minimap)
      const radius = 8 + idx * 8; // spaced orbits
      ctx.strokeStyle = selectedPlanet === p.name ? 'rgba(56, 211, 255, 0.55)' : 'rgba(146, 180, 222, 0.10)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Current positions (calculates coordinate angles derived roughly off index for live visual indicators)
      const angle = (simulatedDays * 0.05) / (p.orbitalPeriod || 1.0) + (idx * 0.8);
      const px = cx + radius * Math.cos(angle);
      const py = cy + radius * Math.sin(angle);

      // Dot color matching planet base
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(px, py, 2.6, 0, Math.PI * 2);
      ctx.fill();

      if (selectedPlanet === p.name) {
        ctx.strokeStyle = '#38d3ff';
        ctx.lineWidth = 1;
        ctx.shadowColor = '#38d3ff';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    });

    // Borders
    ctx.strokeStyle = 'rgba(56, 211, 255, 0.14)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
  }, [planets, selectedPlanet, simulatedDays]);

  const SectionHeader = ({ icon: Icon, children }: { icon: any; children: React.ReactNode }) => (
    <h2 className="hud-eyebrow !text-[10px] !text-[var(--accent-cyan)] mb-3 pb-1.5 border-b border-[var(--panel-border)] flex items-center gap-1.5">
      <Icon className="w-3 h-3 shrink-0 opacity-80" />
      <span>{children}</span>
    </h2>
  );

  return (
    <div
      className={`${collapsed ? 'w-[3.25rem] min-w-[3.25rem]' : 'w-64 min-w-[16rem]'} h-full flex flex-col border-r border-[var(--panel-border)] glass-panel p-3 overflow-y-auto select-none font-mono z-30 scrollbar-hud text-[var(--text-secondary)] transition-all duration-300 relative`}
      id="left_control_sidebar"
    >
      {/* RAIL HEADER — collapse toggle */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} mb-3 shrink-0`}>
        {!collapsed && (
          <div className="flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-[var(--accent-cyan)]" />
            <span className="hud-eyebrow !text-[9.5px]">Panel de Telemetría</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="btn-hud rounded-md w-6 h-6 flex items-center justify-center shrink-0 text-[var(--accent-cyan)]"
          title={collapsed ? 'Expandir panel' : 'Colapsar panel'}
        >
          {collapsed ? <ChevronsRight className="w-3.5 h-3.5" /> : <ChevronsLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {collapsed ? (
        /* ============== RAIL COLAPSADO — solo iconos esenciales ============== */
        <div className="flex flex-col items-center gap-3 pt-1">
          <button
            onClick={onTogglePlay}
            className="btn-hud rounded-md w-8 h-8 flex items-center justify-center text-[var(--accent-cyan)]"
            title={isPaused ? 'Reproducir' : 'Pausar'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
          <div className="live-dot" title="Simulación en vivo" />
          <button
            onClick={onOpenDashboard}
            className="btn-hud rounded-md w-8 h-8 flex items-center justify-center text-[var(--accent-live)]"
            title="Panel matemático final"
          >
            <BarChart3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onScreenshot}
            className="btn-hud rounded-md w-8 h-8 flex items-center justify-center"
            title="Captura PNG"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col">

          {/* SEARCH PLANET */}
          <form onSubmit={handleSearchSubmit} className="mb-4 relative shrink-0">
            <input
              type="text"
              placeholder="Buscar planeta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-[10.5px] bg-black/40 border border-[var(--panel-border-strong)] rounded-md px-2.5 py-1.5 pl-7 text-[var(--accent-live)] focus:outline-none focus:border-[var(--accent-cyan)] font-mono placeholder-[var(--text-faint)] transition-colors"
            />
            <Search className="absolute left-2.5 top-2 w-3 h-3 text-[var(--text-tertiary)]" />
          </form>

          {/* SIMULACION CONTROLS */}
          <section className="mb-5">
            <SectionHeader icon={ScanLine}>Simulación</SectionHeader>

            {/* Speed slider */}
            <div className="flex flex-col gap-1.5 mb-3.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-[var(--text-secondary)]">ESCALA TIEMPO</span>
                <span className="telemetry-value text-[var(--accent-cyan)] font-bold">{speed.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="100"
                step="0.5"
                value={speed}
                onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                className="w-full hud-slider"
              />
            </div>

            {/* Global/Visual Planet Size slider */}
            <div className="flex flex-col gap-1.5 mb-4">
              <div className="flex justify-between text-[10px]">
                <span className="text-[var(--text-secondary)]">TAMAÑO PLANETAS</span>
                <span className="telemetry-value text-[var(--accent-live)] font-bold">{globalPlanetSize.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="30.0"
                step="0.5"
                value={globalPlanetSize}
                onChange={(e) => onGlobalPlanetSizeChange(parseFloat(e.target.value))}
                className="w-full hud-slider hud-slider-amber"
              />
              <span className="text-[8.5px] text-[var(--text-faint)] italic mt-0.5 font-ui leading-snug">Incrementa el tamaño visual sin alterar las órbitas reales.</span>
            </div>

            {/* Play/pause and resets */}
            <div className="flex gap-2 text-xs">
              <button
                onClick={onTogglePlay}
                id="btn_play_pause"
                className="flex-1 flex items-center justify-center gap-1.5 btn-hud btn-hud-active py-1.5 text-[10.5px] rounded-md cursor-pointer font-bold"
              >
                {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                {isPaused ? 'REPRODUCIR' : 'PAUSAR'}
              </button>
              <button
                onClick={onResetTime}
                className="flex-1 flex items-center justify-center gap-1.5 btn-hud py-1.5 text-[10.5px] rounded-md cursor-pointer font-bold"
              >
                <RefreshCw className="w-3 h-3" />
                REINICIAR
              </button>
            </div>
          </section>

          {/* VISUALIZACION TOGGLES */}
          <section className="mb-5">
            <SectionHeader icon={Eye}>Visualización</SectionHeader>

            <div className="space-y-2 text-[11px]">
              {Object.entries({
                orbits: 'Trayectorias Orbitales',
                trails: 'Huellas Orbitales',
                lunas: 'Lunas y Satélites',
                names: 'Etiquetas de Planetas',
                vectors: 'Vectores de Velocidad',
                grid: 'Cuadrícula de Pozo Gravitatorio',
                gravValue: 'Valores de Gravedad'
              }).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors font-ui text-[10.5px]" id={`toggle_${key}`}>
                  <input
                    type="checkbox"
                    checked={toggles[key as keyof typeof toggles]}
                    onChange={() => onToggleChange(key)}
                    className="hud-check shrink-0"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* CAMARA CONFIG */}
          <section className="mb-5">
            <SectionHeader icon={Telescope}>Selección de Cámara</SectionHeader>

            <div className="flex flex-col gap-1 text-[10px]">
              {[
                { mode: 'free', label: 'Vista Libre' },
                { mode: 'follow', label: 'Seguir Planeta' },
                { mode: 'zenith', label: 'Vista Cenital (X-Z)' },
                { mode: 'ecliptic', label: 'Plano Eclíptico' }
              ].map((item) => (
                <label
                  key={item.mode}
                  className={`flex items-center gap-2 p-1.5 cursor-pointer rounded-md border transition-colors font-ui ${
                    cameraMode === item.mode
                      ? 'bg-[var(--accent-cyan)]/10 border-[var(--accent-cyan)]/45 text-[var(--accent-cyan)]'
                      : 'border-transparent text-[var(--text-tertiary)] hover:bg-white/[0.03]'
                  }`}
                >
                  <input
                    type="radio"
                    name="cameraMode"
                    value={item.mode}
                    checked={cameraMode === item.mode}
                    onChange={() => onCameraModeChange(item.mode as CameraMode)}
                    className="hidden"
                  />
                  <span className={cameraMode === item.mode ? 'font-bold text-white' : ''}>{item.label.toUpperCase()}</span>
                </label>
              ))}
            </div>

            {/* Dropdown to pick target planet in follow mode */}
            {cameraMode === 'follow' && (
              <div className="mt-2 flex flex-col gap-1">
                <span className="hud-eyebrow !text-[8.5px] !text-[var(--accent-cyan)]/70">Selección de Destino</span>
                <select
                  value={selectedPlanet}
                  onChange={(e) => onSelectPlanet(e.target.value)}
                  className="w-full text-[10px] font-mono bg-black/40 border border-[var(--accent-cyan)]/35 text-[var(--accent-cyan)] rounded-md px-1.5 py-1 focus:outline-none"
                >
                  {planets.map(p => (
                    <option key={p.name} value={p.name}>
                      {p.displayName.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </section>

          {/* CLOCK DISPLAY */}
          <section className="mb-5 font-mono text-[10px]">
            <SectionHeader icon={Clock3}>Contador de Tiempo</SectionHeader>
            <div className="glass-card p-2.5 text-center">
              <div className="telemetry-value text-white font-black text-[11px] tracking-widest">
                AÑO {year} · DÍA {dayOfYear.toString().padStart(3, '0')}
              </div>
              <div className="telemetry-value text-[9px] text-[var(--accent-cyan)]/75 mt-1 flex items-center justify-center gap-1.5">
                <span>{hours}:{minutes} UTC</span>
                <span className="opacity-40">·</span>
                <span className="opacity-70">EPOCH EP-3</span>
              </div>
            </div>
          </section>

          {/* SCALE COMPARISON TOGGLE */}
          <button
            onClick={onToggleComparison}
            className={`w-full text-[10px] tracking-widest py-2 px-2 rounded-md flex items-center justify-center gap-1.5 cursor-pointer font-bold mb-4 transition-all ${
              comparisonMode
                ? 'btn-hud btn-hud-active'
                : 'btn-hud'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>{comparisonMode ? 'COMPARACIÓN DE TAMAÑO: ON' : 'COMPARACIÓN DE TAMAÑO: OFF'}</span>
          </button>

          {/* MINIMAPA CENITAL EN LÍNEA */}
          <div className="mb-4 flex flex-col pt-3 border-t border-[var(--panel-border)]">
            <span className="hud-eyebrow !text-[9px] mb-1.5">Minimapa Eclíptico</span>
            <div className="aspect-square w-full bg-black/30 border border-[var(--panel-border)] relative overflow-hidden flex items-center justify-center p-1 rounded-md">
              <canvas ref={miniMapCanvasRef} width={200} height={200} className="w-full h-full rounded" id="canvas_minimap_2d" />
            </div>
          </div>

          {/* UTILITY ACTION PANEL */}
          <div className="grid grid-cols-2 gap-2 mt-auto text-[10px] border-t border-[var(--panel-border)] pt-3 shrink-0">
            <button
              onClick={onScreenshot}
              className="flex items-center justify-center gap-1.5 py-1.5 btn-hud rounded-md font-bold"
            >
              <Camera className="w-3 h-3" />
              CAPTURA
            </button>
            <button
              onClick={onOpenDashboard}
              className="flex items-center justify-center gap-1.5 py-1.5 rounded-md font-bold border border-[var(--accent-live)]/35 text-[var(--accent-live)] bg-[var(--accent-live)]/[0.06] hover:bg-[var(--accent-live)]/[0.12] transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              PANEL
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
