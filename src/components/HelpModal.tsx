import { X, Book, Compass, Zap, Target } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 font-mono select-none" id="help_modal_overlay">
      <div className="glass-panel-strong rounded-xl p-5 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative text-[var(--text-secondary)] text-xs leading-relaxed space-y-4 shadow-2xl scrollbar-hud">

        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 btn-hud rounded-md w-7 h-7 flex items-center justify-center cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* HEADER */}
        <div className="border-b border-[var(--panel-border)] pb-3">
          <h2 className="hud-title text-sm tracking-widest uppercase flex items-center gap-1.5">
            <Book className="w-5 h-5 text-[var(--accent-cyan)]" />
            <span>GUÍA METODOLÓGICA &amp; CONTROL — MATEMÁTICA III</span>
          </h2>
          <span className="hud-eyebrow !text-[9px] block mt-1">Simulación Física y Modelamiento de Estructuras Astronómicas</span>
        </div>

        {/* METHODOLOGICAL CORRELATION */}
        <div className="space-y-4 font-ui">
          <p>
            Esta plataforma correlaciona de forma interactiva los contenidos curriculares de
            <span className="text-white font-bold"> Matemática III (Cálculo Vectorial y Multivariado, Álgebra Lineal aplicada y Análisis Numérico)</span>
            con la mecánica celeste real del Sistema Solar.
          </p>

          {/* UNIT I SECTION */}
          <div className="glass-card p-3 border-l-2 border-l-[var(--accent-cyan)]">
            <h3 className="hud-eyebrow !text-[10.5px] !text-[var(--accent-cyan)] mb-1.5 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span>UNIDAD I: INTEGRALES Y APLICACIONES FISICOMATEMÁTICAS</span>
            </h3>
            <ul className="list-disc list-inside space-y-1 text-[var(--text-tertiary)]">
              <li>
                <strong className="text-[var(--text-secondary)]">Áreas de Elipses:</strong> Integración radial acotada de las secciones cónicas del movimiento planetario.
              </li>
              <li>
                <strong className="text-[var(--text-secondary)]">Volumen por Revolución:</strong> Solución analítica del barrido del semicírculo rotado sobre un plano de traslación.
              </li>
              <li>
                <strong className="text-[var(--text-secondary)]">Trabajo de Campos Conservativos:</strong> Integral de línea del campo gravitatorio central de Kepler al expandir del Perihelio al Afelio.
              </li>
            </ul>
          </div>

          {/* UNIT II SECTION */}
          <div className="glass-card p-3 border-l-2 border-l-[var(--accent-danger)] bg-[var(--accent-danger)]/[0.04]">
            <h3 className="hud-eyebrow !text-[10.5px] !text-[var(--accent-danger)] mb-1.5 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span>UNIDAD II: SERIES, CONVERGENCIA Y PARAMÉTRICAS</span>
            </h3>
            <ul className="list-disc list-inside space-y-1 text-[var(--text-tertiary)]">
              <li>
                <strong className="text-[var(--text-secondary)]">Coordenadas Paramétricas:</strong> Curvatura descrita por un parámetro independiente temporal <em className="text-rose-400 not-italic font-semibold">t</em> (Anomalía Excéntrica).
              </li>
              <li>
                <strong className="text-[var(--text-secondary)]">Serie de Taylor:</strong> Aproximación por polinomios para agilizar la obtención progresiva de la velocidad de traslación.
              </li>
              <li>
                <strong className="text-[var(--text-secondary)]">Criterio de la Razón de D'Alembert:</strong> Prueba formal que dictamina la convergencia absoluta de las series gravitatorias de Legendre dado que la excentricidad orbital <em className="text-[var(--accent-cyan)] not-italic font-semibold">e &lt; 1</em>.
              </li>
            </ul>
          </div>

          {/* UNIT III SECTION */}
          <div className="glass-card p-3 border-l-2 border-l-[var(--accent-cyan)]">
            <h3 className="hud-eyebrow !text-[10.5px] !text-[var(--accent-cyan)] mb-1.5 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 shrink-0" />
              <span>UNIDAD III: VECTORES, COORDENADAS POLARES Y CÓNICAS</span>
            </h3>
            <ul className="list-disc list-inside space-y-1 text-[var(--text-tertiary)]">
              <li>
                <strong className="text-[var(--text-secondary)]">Producto Punto (Proyección):</strong> Indica los estados dinámicos orbitales. Si <em className="text-white not-italic font-semibold">r⃗ · v⃗ &gt; 0</em> la partícula se expande radialmente; si es <em className="text-white not-italic font-semibold">&lt;0</em> colapsa.
              </li>
              <li>
                <strong className="text-[var(--text-secondary)]">Momentos Angulares (Producto Cruz):</strong> Demuestra la conservación del momento angular celestial al computar el vector plano de revolución <em className="text-[var(--accent-cyan)] not-italic font-semibold">L = r x v</em>.
              </li>
            </ul>
          </div>

          {/* MANUAL CONTROLS */}
          <div className="glass-card mt-4 p-3 space-y-1.5">
            <strong className="text-white font-bold">GUÍA DE OPERACIÓN EN ESCENA 3D:</strong>
            <p className="text-[var(--text-tertiary)] leading-relaxed">
              - <strong className="text-[var(--accent-cyan)]">Click Izquierdo + Arrastre:</strong> Rotar cámara libremente.<br />
              - <strong className="text-[var(--accent-cyan)]">Click Derecho + Arrastre:</strong> Desplazar (Pan) cámara.<br />
              - <strong className="text-[var(--accent-cyan)]">Rueda mouse / Zoom:</strong> Acercar/alejar zoom.<br />
              - <strong className="text-[var(--accent-cyan)]">Clic en Planeta:</strong> Selecciona ese planeta, abre el panel matemático contextual correspondiente y resalta su trayectoria radial en cian brillante.
            </p>
          </div>
        </div>

        {/* FOOTER MESSAGE */}
        <div className="border-t border-[var(--panel-border)] pt-3 text-center text-[10px] text-[var(--text-faint)] font-medium font-ui">
          PROYECTO DESARROLLADO PARA EL TALLER APLICADO DE MATEMÁTICA III © LA TIERRA, GALAXY ESTELAR.
        </div>

      </div>
    </div>
  );
}
