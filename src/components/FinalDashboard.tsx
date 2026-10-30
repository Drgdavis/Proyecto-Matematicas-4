import { useState } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import { PhysicalData, ModifiedPhysicalData } from '../types';
import { PLANETS_DATA, EARTH_MASS_KG, EARTH_RADIUS_KM, G_CONSTANT, MASS_OF_SUN, AU_IN_KM } from '../data/planets';
import { GravityGraph, LeibnizPiGraph, EllipseGeometryCanvas } from './MathCanvases';

interface FinalDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  planetModifiers: Record<string, ModifiedPhysicalData>;
}

type UnitTab = 'unidad1' | 'unidad2' | 'unidad3' | 'phys';

export function FinalDashboard({ isOpen, onClose, planetModifiers }: FinalDashboardProps) {
  const [selectedPlanetName, setSelectedPlanetName] = useState<string>('earth');
  const [activeTab, setActiveTab] = useState<UnitTab>('phys');

  const planet = PLANETS_DATA.find(p => p.name === selectedPlanetName)!;
  const modifier = planetModifiers[selectedPlanetName] || {
    massMultiplier: 1,
    eccentricity: planet.eccentricity,
    semiMajorAxisMultiplier: 1,
    radiusMultiplier: 1
  };
  const modifiedRealMass = planet.realMass * modifier.massMultiplier;
  const modifiedRealRadius = planet.realRadius * modifier.radiusMultiplier;
  const modifiedEccentricity = modifier.eccentricity;
  const modifiedSemiMajorAxis = planet.semiMajorAxis * modifier.semiMajorAxisMultiplier;
  const massKg = modifiedRealMass * EARTH_MASS_KG;

  if (!isOpen) return null;

  return (
    <div className="solar-dashboard fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md font-mono" role="dialog" aria-modal="true" aria-label="Resumen del sistema solar">
      <div className="w-full max-w-7xl h-[95vh] mx-4 flex flex-col glass-panel-strong rounded-2xl border border-[var(--accent-cyan)]/25 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--panel-border)] bg-gradient-to-r from-[var(--accent-cyan)]/[0.08] to-transparent">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/[0.05] rounded-full transition-colors text-[var(--text-tertiary)] hover:text-white flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-bold">VOLVER AL SIMULADOR</span>
            </button>
            <div className="h-8 w-px bg-[var(--panel-border)]" />
            <h1 className="hud-title text-2xl tracking-widest uppercase">
              📊 DASHBOARD FINAL - MATEMÁTICA III
            </h1>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-950/50 rounded-full transition-colors text-[var(--text-tertiary)] hover:text-[var(--accent-danger)]"
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        <div className="solar-dashboard-content flex-1 flex overflow-hidden">
          {/* Left: Planet Selector */}
          <div className="w-64 glass-panel border-r border-[var(--panel-border)] p-4 overflow-y-auto scrollbar-hud">
            <h3 className="hud-eyebrow !text-[10px] !text-[var(--accent-cyan)] mb-3">
              🌍 Selecciona un Planeta
            </h3>
            <div className="space-y-2">
              {PLANETS_DATA.map(p => (
                <button
                  key={p.name}
                  onClick={() => setSelectedPlanetName(p.name)}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition-all text-sm ${
                    selectedPlanetName === p.name
                      ? 'btn-hud-active'
                      : 'bg-transparent border-[var(--panel-border)] text-[var(--text-tertiary)] hover:bg-white/[0.03] hover:border-[var(--panel-border-strong)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: p.color, boxShadow: `0 0 8px ${p.color}` }}
                    />
                    <span className="font-semibold">{p.displayName}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Planet Summary */}
            <div className="mt-6 pt-4 border-t border-[var(--panel-border)]">
              <h4 className="hud-eyebrow !text-[10px] !text-[var(--accent-orange)] mb-2">
                📋 Datos Básicos
              </h4>
              <div className="space-y-2 text-xs">
                <div className="glass-card p-2">
                  <div className="text-gray-500">Masa</div>
                  <div className="text-white font-mono">{modifiedRealMass.toFixed(3)} M⊕</div>
                  <div className="text-gray-500 text-xs">= {massKg.toExponential(3)} kg</div>
                </div>
                <div className="glass-card p-2">
                  <div className="text-gray-500">Radio</div>
                  <div className="text-white font-mono">{Math.round(modifiedRealRadius).toLocaleString()} km</div>
                  <div className="text-gray-500 text-xs">~ {(modifiedRealRadius / EARTH_RADIUS_KM).toFixed(2)}x Tierra</div>
                </div>
                <div className="glass-card p-2">
                  <div className="text-gray-500">Excentricidad</div>
                  <div className="text-white font-mono">{modifiedEccentricity.toFixed(4)}</div>
                </div>
                <div className="glass-card p-2">
                  <div className="text-gray-500">Periodo Orbital</div>
                  <div className="text-white font-mono">{planet.orbitalPeriod.toFixed(2)} años</div>
                  <div className="text-gray-500 text-xs">= {(planet.orbitalPeriod * 365.25).toFixed(1)} días</div>
                </div>
                <div className="glass-card p-2">
                  <div className="text-gray-500">Velocidad Orbital (promedio)</div>
                  <div className="text-white font-mono">{(2 * Math.PI * modifiedSemiMajorAxis * AU_IN_KM / (planet.orbitalPeriod * 365.25 * 24)).toFixed(1)} km/h</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs Navigation */}
            <div className="flex border-b border-[var(--panel-border)] glass-panel-soft">
              {[
                { id: 'phys', label: '⚙ PHYS - Física & Órbitas' },
                { id: 'unidad1', label: '📐 Unidad I - Integrales' },
                { id: 'unidad2', label: '📊 Unidad II - Series & Paramétricas' },
                { id: 'unidad3', label: '🎯 Unidad III - Vectores & Cónicas' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as UnitTab)}
                  className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${
                    activeTab === tab.id
                      ? 'text-[var(--accent-cyan)] border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10'
                      : 'text-[var(--text-tertiary)] border-transparent hover:text-[var(--text-secondary)] hover:bg-white/[0.03]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'phys' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                    ⚙ Física y Parámetros Orbitales
                    <span className="text-cyan-400">- {planet.displayName}</span>
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="bg-gradient-to-br from-orange-950/30 to-red-950/20 border border-orange-500/30 rounded-xl p-5 backdrop-blur-md">
                        <h3 className="text-lg font-bold text-orange-400 mb-3 uppercase tracking-wider">
                          📊 Parámetros Modificados
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-black/40 p-3 rounded-lg border border-orange-900/30">
                            <div className="text-gray-400 text-xs uppercase">Masa</div>
                            <div className="text-2xl font-mono text-orange-300">x{modifier.massMultiplier.toFixed(2)}</div>
                          </div>
                          <div className="bg-black/40 p-3 rounded-lg border border-orange-900/30">
                            <div className="text-gray-400 text-xs uppercase">Radio</div>
                            <div className="text-2xl font-mono text-orange-300">x{modifier.radiusMultiplier.toFixed(2)}</div>
                          </div>
                          <div className="bg-black/40 p-3 rounded-lg border border-orange-900/30">
                            <div className="text-gray-400 text-xs uppercase">Excentricidad</div>
                            <div className="text-2xl font-mono text-orange-300">{modifiedEccentricity.toFixed(4)}</div>
                          </div>
                          <div className="bg-black/40 p-3 rounded-lg border border-orange-900/30">
                            <div className="text-gray-400 text-xs uppercase">Semieje Mayor</div>
                            <div className="text-2xl font-mono text-orange-300">x{modifier.semiMajorAxisMultiplier.toFixed(2)}</div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-cyan-950/30 to-blue-950/20 border border-cyan-500/30 rounded-xl p-5 backdrop-blur-md">
                        <h3 className="text-lg font-bold text-cyan-400 mb-3 uppercase tracking-wider">
                          🌌 Datos Orbitales
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center bg-black/30 p-2 rounded border border-cyan-900/20">
                            <span className="text-gray-400">Perihelio</span>
                            <span className="text-cyan-300 font-mono">{(modifiedSemiMajorAxis * (1 - modifiedEccentricity)).toFixed(4)} AU</span>
                          </div>
                          <div className="flex justify-between items-center bg-black/30 p-2 rounded border border-cyan-900/20">
                            <span className="text-gray-400">Afelio</span>
                            <span className="text-cyan-300 font-mono">{(modifiedSemiMajorAxis * (1 + modifiedEccentricity)).toFixed(4)} AU</span>
                          </div>
                          <div className="flex justify-between items-center bg-black/30 p-2 rounded border border-cyan-900/20">
                            <span className="text-gray-400">Semieje Menor</span>
                            <span className="text-cyan-300 font-mono">{(modifiedSemiMajorAxis * Math.sqrt(1 - modifiedEccentricity * modifiedEccentricity)).toFixed(4)} AU</span>
                          </div>
                          <div className="flex justify-between items-center bg-black/30 p-2 rounded border border-cyan-900/20">
                            <span className="text-gray-400">Distancia Focal</span>
                            <span className="text-cyan-300 font-mono">{(modifiedSemiMajorAxis * modifiedEccentricity).toFixed(4)} AU</span>
                          </div>
                          <div className="flex justify-between items-center bg-black/30 p-2 rounded border border-cyan-900/20">
                            <span className="text-gray-400">Longitud de la Órbita</span>
                            <span className="text-cyan-300 font-mono">{(Math.PI * (3*(modifiedSemiMajorAxis + modifiedSemiMajorAxis*Math.sqrt(1-modifiedEccentricity*modifiedEccentricity)) - Math.sqrt((3*modifiedSemiMajorAxis + modifiedSemiMajorAxis*Math.sqrt(1-modifiedEccentricity*modifiedEccentricity))*(modifiedSemiMajorAxis + 3*modifiedSemiMajorAxis*Math.sqrt(1-modifiedEccentricity*modifiedEccentricity))))).toFixed(4)} AU</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-purple-950/30 to-indigo-950/20 border border-purple-500/30 rounded-xl p-5 backdrop-blur-md">
                        <h3 className="text-lg font-bold text-purple-400 mb-3 uppercase tracking-wider">
                          🌡️ Datos Físicos
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center bg-black/30 p-2 rounded border border-purple-900/20">
                            <span className="text-gray-400">Densidad</span>
                            <span className="text-purple-300 font-mono">{(massKg / ((4/3) * Math.PI * Math.pow(modifiedRealRadius * 1000, 3))).toFixed(2)} kg/m³</span>
                          </div>
                          <div className="flex justify-between items-center bg-black/30 p-2 rounded border border-purple-900/20">
                            <span className="text-gray-400">Gravedad Superficial</span>
                            <span className="text-purple-300 font-mono">{(G_CONSTANT * massKg / Math.pow(modifiedRealRadius * 1000, 2)).toFixed(2)} m/s²</span>
                          </div>
                          <div className="flex justify-between items-center bg-black/30 p-2 rounded border border-purple-900/20">
                            <span className="text-gray-400">Velocidad de Escape</span>
                            <span className="text-purple-300 font-mono">{(Math.sqrt(2 * G_CONSTANT * massKg / (modifiedRealRadius * 1000)) / 1000).toFixed(1)} km/s</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-gradient-to-br from-purple-950/30 to-indigo-950/20 border border-purple-500/30 rounded-xl p-5 backdrop-blur-md">
                        <h3 className="text-lg font-bold text-purple-400 mb-3 uppercase tracking-wider">
                          📈 Gráfica de Campo Gravitacional
                        </h3>
                        <div className="bg-black/50 rounded-lg border border-purple-900/30 p-2">
                          <GravityGraph massKg={massKg} planetRadiusKm={modifiedRealRadius} />
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-amber-950/30 to-yellow-950/20 border border-amber-500/30 rounded-xl p-5 backdrop-blur-md">
                        <h3 className="text-lg font-bold text-amber-400 mb-3 uppercase tracking-wider">
                          🌞 Constante Gravitacional (G)
                        </h3>
                        <div className="bg-black/40 p-3 rounded-lg font-mono text-sm border border-amber-900/30 space-y-2">
                          <div className="text-amber-300">G = {G_CONSTANT.toExponential(3)} m³/(kg·s²)</div>
                          <div className="text-gray-400 text-xs">
                            Masa del Sol: {MASS_OF_SUN.toExponential(3)} kg
                          </div>
                          <div className="text-gray-400 text-xs">
                            1 AU = {AU_IN_KM.toExponential(3)} km
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-rose-950/30 to-red-950/20 border border-rose-500/30 rounded-xl p-5 backdrop-blur-md">
                        <h3 className="text-lg font-bold text-rose-400 mb-3 uppercase tracking-wider">
                          📐 Ley de Kepler III
                        </h3>
                        <div className="bg-black/40 p-3 rounded-lg font-mono text-sm border border-rose-900/30">
                          <div className="text-rose-300">T² = k · a³</div>
                          <div className="text-gray-400 mt-2 text-xs">
                            Para {planet.displayName}: T² = {(Math.pow(planet.orbitalPeriod, 2)).toFixed(4)}, a³ = {(Math.pow(planet.semiMajorAxis, 3)).toFixed(4)}
                          </div>
                          <div className="text-gray-400 text-xs">
                            Ratio T²/a³ = {(Math.pow(planet.orbitalPeriod, 2)/Math.pow(planet.semiMajorAxis, 3)).toFixed(8)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'unidad1' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                    📐 Unidad I - Técnicas de Integración
                    <span className="text-cyan-400">- {planet.displayName}</span>
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="bg-gradient-to-br from-yellow-950/30 to-amber-950/20 border border-yellow-500/30 rounded-xl p-5 backdrop-blur-md">
                        <h3 className="text-lg font-bold text-yellow-400 mb-3 uppercase tracking-wider">
                          📊 Aproximación de π (Leibniz)
                        </h3>
                        <div className="bg-black/50 rounded-lg border border-yellow-900/30 p-3">
                          <LeibnizPiGraph terms={100} />
                        </div>
                        <div className="mt-3 bg-black/40 p-3 rounded-lg font-mono text-sm border border-yellow-900/30">
                          <div className="text-yellow-300">π/4 = 1 - 1/3 + 1/5 - 1/7 + 1/9 - ...</div>
                          <div className="text-gray-400 mt-2 text-xs">
                            Serie alternante que converge lentamente a π
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-emerald-950/30 to-green-950/20 border border-emerald-500/30 rounded-xl p-5 backdrop-blur-md">
                        <h3 className="text-lg font-bold text-emerald-400 mb-3 uppercase tracking-wider">
                          📐 Área de la Circunferencia
                        </h3>
                        <p className="text-sm text-gray-300 mb-3">
                          Integral definida para calcular el área de la sección transversal del planeta.
                        </p>
                        <div className="bg-black/40 p-3 rounded-lg font-mono text-sm border border-emerald-900/30 space-y-2">
                          <div className="text-emerald-300">A = ∫₀<sup>R</sup> 2πr dr = πR²</div>
                          <div className="text-gray-400">
                            A = {(Math.PI * Math.pow(modifiedRealRadius, 2)).toExponential(3)} km²
                          </div>
                          <div className="text-gray-400 text-xs">
                            = {(Math.PI * Math.pow(modifiedRealRadius / EARTH_RADIUS_KM, 2)).toFixed(4)} Tierras de área
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-cyan-950/30 to-sky-950/20 border border-cyan-500/30 rounded-xl p-5 backdrop-blur-md">
                        <h3 className="text-lg font-bold text-cyan-400 mb-3 uppercase tracking-wider">
                          📐 Longitud de Arco (Perímetro Orbital)
                        </h3>
                        <div className="bg-black/40 p-3 rounded-lg font-mono text-sm border border-cyan-900/30 space-y-2">
                          <div className="text-cyan-300">L = ∫₀<sup>2π</sup> √(r² + (dr/dθ)²) dθ</div>
                          <div className="text-gray-400">
                            ≈ π [3(a+b) - √((3a+b)(a+3b))]
                          </div>
                          <div className="text-gray-400">
                            ≈ {(Math.PI * (3*(modifiedSemiMajorAxis + modifiedSemiMajorAxis*Math.sqrt(1-modifiedEccentricity*modifiedEccentricity)) - Math.sqrt((3*modifiedSemiMajorAxis + modifiedSemiMajorAxis*Math.sqrt(1-modifiedEccentricity*modifiedEccentricity))*(modifiedSemiMajorAxis + 3*modifiedSemiMajorAxis*Math.sqrt(1-modifiedEccentricity*modifiedEccentricity))))).toFixed(6)} AU
                          </div>
                          <div className="text-gray-400 text-xs">
                            = {(Math.PI * (3*(modifiedSemiMajorAxis + modifiedSemiMajorAxis*Math.sqrt(1-modifiedEccentricity*modifiedEccentricity)) - Math.sqrt((3*modifiedSemiMajorAxis + modifiedSemiMajorAxis*Math.sqrt(1-modifiedEccentricity*modifiedEccentricity))*(modifiedSemiMajorAxis + 3*modifiedSemiMajorAxis*Math.sqrt(1-modifiedEccentricity*modifiedEccentricity))))*AU_IN_KM).toExponential(3)} km
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-gradient-to-br from-rose-950/30 to-red-950/20 border border-rose-500/30 rounded-xl p-5 backdrop-blur-md">
                        <h3 className="text-lg font-bold text-rose-400 mb-3 uppercase tracking-wider">
                          🏭 Volumen de Revolución
                        </h3>
                        <p className="text-sm text-gray-300 mb-3">
                          Volumen del planeta usando la fórmula de la esfera (método de discos).
                        </p>
                        <div className="bg-black/40 p-3 rounded-lg font-mono text-sm border border-rose-900/30 space-y-2">
                          <div className="text-rose-300">V = ∫₀<sup>R</sup> πy² dx = (4/3)πR³</div>
                          <div className="text-gray-400">
                            V = {((4/3) * Math.PI * Math.pow(modifiedRealRadius, 3)).toExponential(3)} km³
                          </div>
                          <div className="text-gray-400 text-xs">
                            = {(((4/3) * Math.PI * Math.pow(modifiedRealRadius, 3)) / ((4/3) * Math.PI * Math.pow(EARTH_RADIUS_KM, 3))).toFixed(4)} Tierras de volumen
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-sky-950/30 to-cyan-950/20 border border-sky-500/30 rounded-xl p-5 backdrop-blur-md">
                        <h3 className="text-lg font-bold text-sky-400 mb-3 uppercase tracking-wider">
                          ⚖ Centro de Masa y Centroides
                        </h3>
                        <p className="text-sm text-gray-300 mb-3">
                          Para una esfera homogénea, el centro de masa coincide con el centro geométrico.
                        </p>
                        <div className="bg-black/40 p-3 rounded-lg font-mono text-sm border border-sky-900/30 space-y-2">
                          <div className="text-sky-300">CM = (x̄, ȳ, z̄) = (0, 0, 0)</div>
                          <div className="text-gray-400 text-xs">
                            (en el sistema de referencia del planeta)
                          </div>
                          <div className="text-gray-400 text-xs">
                            x̄ = (1/M) ∫x dm, ȳ = (1/M) ∫y dm, z̄ = (1/M) ∫z dm
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-purple-950/30 to-indigo-950/20 border border-purple-500/30 rounded-xl p-5 backdrop-blur-md">
                        <h3 className="text-lg font-bold text-purple-400 mb-3 uppercase tracking-wider">
                          📊 Trabajo y Energía Gravitacional
                        </h3>
                        <div className="bg-black/40 p-3 rounded-lg font-mono text-sm border border-purple-900/30 space-y-2">
                          <div className="text-purple-300">W = ∫ F · dr</div>
                          <div className="text-gray-400">
                            ΔU = GMm(1/r₁ - 1/r₂)
                          </div>
                          <div className="text-gray-400 text-xs">
                            Perihelio a Afelio: {((G_CONSTANT * MASS_OF_SUN * massKg) * (1/(modifiedSemiMajorAxis*(1-modifiedEccentricity)*AU_IN_KM*1000) - 1/(modifiedSemiMajorAxis*(1+modifiedEccentricity)*AU_IN_KM*1000))).toExponential(3)} J
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-lime-950/30 to-green-950/20 border border-lime-500/30 rounded-xl p-5 backdrop-blur-md">
                        <h3 className="text-lg font-bold text-lime-400 mb-3 uppercase tracking-wider">
                          📐 Integración por Partes (Ejemplo)
                        </h3>
                        <div className="bg-black/40 p-3 rounded-lg font-mono text-sm border border-lime-900/30">
                          <div className="text-lime-300">∫ u dv = uv - ∫ v du</div>
                          <div className="text-gray-400 mt-2 text-xs">
                            Aplicable a funciones de energía potencial
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'unidad2' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                    📊 Unidad II - Series & Ecuaciones Paramétricas
                    <span className="text-cyan-400">- {planet.displayName}</span>
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="bg-gradient-to-br from-violet-950/30 to-purple-950/20 border border-violet-500/30 rounded-xl p-5 backdrop-blur-md">
                        <h3 className="text-lg font-bold text-violet-400 mb-3 uppercase tracking-wider">
                          🌐 Órbita Paramétrica
                        </h3>
                        <div className="bg-black/50 rounded-lg border border-violet-900/30 p-4">
                          <div className="font-mono text-sm space-y-2">
                            <div className="text-violet-300">x(θ) = a · cosθ</div>
                            <div className="text-violet-300">y(θ) = b · sinθ</div>
                            <div className="text-violet-300">r(θ) = a(1-e²)/(1+e·cosθ)</div>
                            <div className="text-gray-400 mt-2 text-xs">
                              Donde θ ∈ [0, 2π], a = semieje mayor, b = semieje menor
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 bg-black/40 p-3 rounded-lg font-mono text-xs border border-violet-900/30">
                          <div className="text-violet-300 font-bold mb-1">EJEMPLOS DE PUNTOS:</div>
                          {Array.from({ length: 8 }).map((_, i) => {
                            const t = i / 8;
                            const theta = 2 * Math.PI * t;
                            const r = modifiedSemiMajorAxis * (1 - modifiedEccentricity * modifiedEccentricity) / 
                                       (1 + modifiedEccentricity * Math.cos(theta));
                            const x = r * Math.cos(theta);
                            const y = r * Math.sin(theta);
                            return (
                              <div key={i} className="text-gray-300 py-0.5 border-b border-violet-900/20">
                                θ={(theta*180/Math.PI).toFixed(0)}° → r={r.toFixed(4)}, x={x.toFixed(3)}, y={y.toFixed(3)}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-fuchsia-950/30 to-pink-950/20 border border-fuchsia-500/30 rounded-xl p-5 backdrop-blur-md">
                        <h3 className="text-lg font-bold text-fuchsia-400 mb-3 uppercase tracking-wider">
                          🔢 Sucesión de Posiciones
                        </h3>
                        <p className="text-sm text-gray-300 mb-3">
                          Posiciones del planeta en intervalos regulares de tiempo.
                        </p>
                        <div className="bg-black/40 p-3 rounded-lg font-mono text-xs border border-fuchsia-900/30 max-h-48 overflow-y-auto">
                          {Array.from({ length: 20 }).map((_, i) => {
                            const t = i * 0.05;
                            const theta = 2 * Math.PI * t;
                            const r = modifiedSemiMajorAxis * (1 - modifiedEccentricity * modifiedEccentricity) / 
                                       (1 + modifiedEccentricity * Math.cos(theta));
                            return (
                              <div key={i} className="text-gray-300 py-0.5 border-b border-fuchsia-900/20">
                                t={t.toFixed(2)} → r={r.toFixed(4)} AU
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-indigo-950/30 to-blue-950/20 border border-indigo-500/30 rounded-xl p-5 backdrop-blur-md">
                        <h3 className="text-lg font-bold text-indigo-400 mb-3 uppercase tracking-wider">
                          📐 Serie Geométrica (Ejemplo)
                        </h3>
                        <div className="bg-black/40 p-3 rounded-lg font-mono text-sm border border-indigo-900/30 space-y-2">
                          <div className="text-indigo-300">S = ∑ₙ=₀<sup>∞</sup> arⁿ</div>
                          <div className="text-gray-400">
                            S = a / (1 - r) para |r| &lt; 1
                          </div>
                          <div className="text-gray-400 text-xs">
                            Aplicable a expansiones en serie de potenciales
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-gradient-to-br from-lime-950/30 to-green-950/20 border border-lime-500/30 rounded-xl p-5 backdrop-blur-md">
                        <h3 className="text-lg font-bold text-lime-400 mb-3 uppercase tracking-wider">
                          📈 Serie de Velocidades (Taylor)
                        </h3>
                        <p className="text-sm text-gray-300 mb-3">
                          Aproximación de la velocidad orbital usando series de Taylor.
                        </p>
                        <div className="bg-black/40 p-3 rounded-lg font-mono text-sm border border-lime-900/30 space-y-2">
                          <div className="text-lime-300">v(θ) ≈ v₀ + v₁θ + v₂θ²/2! + v₃θ³/3!</div>
                          <div className="text-gray-400 mt-2 text-xs">
                            v₀ = velocidad en perihelio (máxima)
                          </div>
                          <div className="text-gray-400 text-xs">
                            v₀ = {(Math.sqrt(G_CONSTANT * (MASS_OF_SUN + massKg) * (1 + modifiedEccentricity) / (modifiedSemiMajorAxis * (1 - modifiedEccentricity) * AU_IN_KM * 1000)) / 1000).toFixed(2)} km/s
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-teal-950/30 to-cyan-950/20 border border-teal-500/30 rounded-xl p-5 backdrop-blur-md">
                        <h3 className="text-lg font-bold text-teal-400 mb-3 uppercase tracking-wider">
                          🎯 Pruebas de Convergencia
                        </h3>
                        <div className="space-y-3">
                          <div className="bg-black/40 p-3 rounded-lg font-mono text-sm border border-teal-900/30">
                            <div className="text-teal-300 font-bold">Prueba de la Razón:</div>
                            <div className="text-gray-400 text-xs">
                              L = limₙ→∞ |aₙ₊₁/aₙ|
                            </div>
                          </div>
                          <div className="bg-black/40 p-3 rounded-lg font-mono text-sm border border-teal-900/30">
                            <div className="text-teal-300 font-bold">Prueba de la Raíz:</div>
                            <div className="text-gray-400 text-xs">
                              L = limₙ→∞ |aₙ|<sup>1/n</sup>
                            </div>
                          </div>
                          <div className="bg-black/40 p-3 rounded-lg font-mono text-sm border border-teal-900/30">
                            <div className="text-teal-300">✓ Convergencia garantizada</div>
                            <div className="text-gray-400 mt-1 text-xs">
                              (órbita cerrada y periódica)
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-orange-950/30 to-amber-950/20 border border-orange-500/30 rounded-xl p-5 backdrop-blur-md">
                        <h3 className="text-lg font-bold text-orange-400 mb-3 uppercase tracking-wider">
                          🔄 Serie de Fourier (Conceptual)
                        </h3>
                        <div className="bg-black/40 p-3 rounded-lg font-mono text-sm border border-orange-900/30 space-y-2">
                          <div className="text-orange-300">f(θ) = a₀/2 + ∑(aₙ cosnθ + bₙ sinnθ)</div>
                          <div className="text-gray-400 text-xs">
                            Análisis armónico de perturbaciones orbitales
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'unidad3' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                    🎯 Unidad III - Vectores & Secciones Cónicas
                    <span className="text-cyan-400">- {planet.displayName}</span>
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="bg-gradient-to-br from-indigo-950/30 to-blue-950/20 border border-indigo-500/30 rounded-xl p-5 backdrop-blur-md">
                        <h3 className="text-lg font-bold text-indigo-400 mb-3 uppercase tracking-wider">
                          🔵 Elipse - Visualización Geométrica
                        </h3>
                        <div className="bg-black/50 rounded-lg border border-indigo-900/30 p-2">
                          <EllipseGeometryCanvas
                            planetName={planet.name}
                            semiMajorAxis={modifiedSemiMajorAxis}
                            eccentricity={modifiedEccentricity}
                            thetaRad={0}
                            planetColor={planet.color}
                          />
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-cyan-950/30 to-sky-950/20 border border-cyan-500/30 rounded-xl p-5 backdrop-blur-md">
                        <h3 className="text-lg font-bold text-cyan-400 mb-3 uppercase tracking-wider">
                          📐 Parámetros de la Elipse
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between items-center bg-black/30 p-2 rounded border border-cyan-900/20">
                            <span className="text-gray-400">Semieje mayor (a)</span>
                            <span className="text-cyan-300 font-mono">{modifiedSemiMajorAxis.toFixed(4)} AU</span>
                          </div>
                          <div className="flex justify-between items-center bg-black/30 p-2 rounded border border-cyan-900/20">
                            <span className="text-gray-400">Semieje menor (b)</span>
                            <span className="text-cyan-300 font-mono">{(modifiedSemiMajorAxis * Math.sqrt(1 - modifiedEccentricity * modifiedEccentricity)).toFixed(4)} AU</span>
                          </div>
                          <div className="flex justify-between items-center bg-black/30 p-2 rounded border border-cyan-900/20">
                            <span className="text-gray-400">Distancia focal (c)</span>
                            <span className="text-cyan-300 font-mono">{(modifiedSemiMajorAxis * modifiedEccentricity).toFixed(4)} AU</span>
                          </div>
                          <div className="flex justify-between items-center bg-black/30 p-2 rounded border border-cyan-900/20">
                            <span className="text-gray-400">Relación b² + c²</span>
                            <span className="text-cyan-300 font-mono">= {((Math.pow(modifiedSemiMajorAxis * Math.sqrt(1 - modifiedEccentricity * modifiedEccentricity), 2) + Math.pow(modifiedSemiMajorAxis * modifiedEccentricity, 2))).toFixed(4)}</span>
                          </div>
                          <div className="flex justify-between items-center bg-black/30 p-2 rounded border border-cyan-900/20">
                            <span className="text-gray-400">= a²</span>
                            <span className="text-cyan-300 font-mono">{Math.pow(modifiedSemiMajorAxis, 2).toFixed(4)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-pink-950/30 to-rose-950/20 border border-pink-500/30 rounded-xl p-5 backdrop-blur-md">
                        <h3 className="text-lg font-bold text-pink-400 mb-3 uppercase tracking-wider">
                          🔄 Coordenadas Polares vs Cartesianas
                        </h3>
                        <div className="bg-black/40 p-3 rounded-lg font-mono text-sm border border-pink-900/30 space-y-2">
                          <div className="text-pink-300">Cartesianas → Polares:</div>
                          <div className="text-gray-400">r = √(x² + y²), θ = arctan2(y, x)</div>
                          <div className="text-pink-300 mt-2">Polares → Cartesianas:</div>
                          <div className="text-gray-400">x = r cosθ, y = r sinθ</div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-gradient-to-br from-rose-950/30 to-orange-950/20 border border-rose-500/30 rounded-xl p-5 backdrop-blur-md">
                        <h3 className="text-lg font-bold text-rose-400 mb-3 uppercase tracking-wider">
                          📍 Vectores de Posición
                        </h3>
                        <p className="text-sm text-gray-300 mb-3">
                          Vector de posición del planeta en coordenadas heliocéntricas.
                        </p>
                        <div className="bg-black/40 p-3 rounded-lg font-mono text-sm border border-rose-900/30 space-y-2">
                          <div className="text-rose-300">**r**(θ) = (r cosθ, r sinθ, 0)</div>
                          <div className="text-gray-400 mt-2 text-xs">
                            r(θ) = a(1-e²)/(1+e cosθ)
                          </div>
                          <div className="text-gray-400 text-xs">
                            |**r**| = r = {(modifiedSemiMajorAxis * (1 - modifiedEccentricity * modifiedEccentricity) / (1 + modifiedEccentricity)).toFixed(4)} AU en θ=0
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-amber-950/30 to-yellow-950/20 border border-amber-500/30 rounded-xl p-5 backdrop-blur-md">
                        <h3 className="text-lg font-bold text-amber-400 mb-3 uppercase tracking-wider">
                          🔄 Vectores de Velocidad
                        </h3>
                        <p className="text-sm text-gray-300 mb-3">
                          Velocidad tangencial a la órbita (segunda ley de Kepler).
                        </p>
                        <div className="bg-black/40 p-3 rounded-lg font-mono text-sm border border-amber-900/30 space-y-2">
                          <div className="text-amber-300">**v** ⊥ **r** en perihelio/afelio</div>
                          <div className="text-gray-400 mt-1 text-xs">
                            |**v**| máximo en perihelio, mínimo en afelio
                          </div>
                          <div className="text-gray-400 text-xs">
                            **v** = √(GM(2/r - 1/a)) (Vis-Viva)
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-emerald-950/30 to-teal-950/20 border border-emerald-500/30 rounded-xl p-5 backdrop-blur-md">
                        <h3 className="text-lg font-bold text-emerald-400 mb-3 uppercase tracking-wider">
                          🌌 Clasificación de Cónicas
                        </h3>
                        <div className="space-y-2">
                          <div className="bg-black/40 p-3 rounded-lg font-mono text-sm border border-emerald-900/30">
                            <div className="text-emerald-300">
                              {modifiedEccentricity === 0 ? '● CÍRCULO (e = 0)' : 
                               modifiedEccentricity < 1 ? '🟡 ELIPSE (0 < e < 1)' : 
                               modifiedEccentricity === 1 ? '☄ PARÁBOLA (e = 1)' : '🟣 HIPÉRBOLA (e > 1)'}
                            </div>
                            <div className="text-gray-400 mt-2">
                              e = {modifiedEccentricity.toFixed(6)} ∈ [0, ∞)
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-black/40 p-2 rounded text-xs border border-emerald-900/30">
                              <div className="text-emerald-300 font-bold">0 ≤ e &lt; 1</div>
                              <div className="text-gray-400">Elipse</div>
                            </div>
                            <div className="bg-black/40 p-2 rounded text-xs border border-emerald-900/30">
                              <div className="text-emerald-300 font-bold">e = 1</div>
                              <div className="text-gray-400">Parábola</div>
                            </div>
                            <div className="bg-black/40 p-2 rounded text-xs border border-emerald-900/30">
                              <div className="text-emerald-300 font-bold">e &gt; 1</div>
                              <div className="text-gray-400">Hipérbola</div>
                            </div>
                            <div className="bg-black/40 p-2 rounded text-xs border border-emerald-900/30">
                              <div className="text-emerald-300 font-bold">e = 0</div>
                              <div className="text-gray-400">Círculo</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-purple-950/30 to-indigo-950/20 border border-purple-500/30 rounded-xl p-5 backdrop-blur-md">
                        <h3 className="text-lg font-bold text-purple-400 mb-3 uppercase tracking-wider">
                          📐 Productos Vectoriales (Dot y Cross)
                        </h3>
                        <div className="bg-black/40 p-3 rounded-lg font-mono text-sm border border-purple-900/30 space-y-2">
                          <div className="text-purple-300">Producto Punto (Escalar):</div>
                          <div className="text-gray-400">**a**·**b** = |**a**||**b**|cosθ = aₓbₓ + a<sub>y</sub>b<sub>y</sub> + a<sub>z</sub>b<sub>z</sub></div>
                          <div className="text-purple-300 mt-2">Producto Cruz (Vectorial):</div>
                          <div className="text-gray-400">**a**×**b** = |**a**||**b**|sinθ **n̂**</div>
                          <div className="text-gray-400 text-xs">
                            Aplicable al momento angular: **H** = **r**×**v**
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
