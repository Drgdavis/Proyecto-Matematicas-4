import { useEffect, useRef } from 'react';
import { PhysicalData } from '../types';
import { getModifiedProps } from '../utils/mathFormulas';
import { G_CONSTANT } from '../data/planets';

interface GravityGraphProps {
  massKg: number;
  planetRadiusKm: number;
}

export function GravityGraph({ massKg, planetRadiusKm }: GravityGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Draw background grid
    ctx.strokeStyle = 'rgba(146, 180, 222, 0.07)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#46587a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(35, 10);
    ctx.lineTo(35, height - 20);
    ctx.lineTo(width - 10, height - 20);
    ctx.stroke();

    // Plot Force F(r) = GM/r^2 vs Distance
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 1.6;
    ctx.beginPath();

    const maxDistanceKm = planetRadiusKm * 10;
    const G_VAL = G_CONSTANT;

    const getX = (rKm: number) => {
      return 35 + ((rKm - planetRadiusKm) / (maxDistanceKm - planetRadiusKm)) * (width - 55);
    };

    const getY = (force: number) => {
      // Scale logarithmic-ish or linear bounded
      const maxForce = (G_VAL * massKg) / Math.pow(planetRadiusKm * 1000, 2);
      const ratio = force / maxForce;
      return height - 20 - ratio * (height - 35);
    };

    let first = true;
    for (let rKm = planetRadiusKm; rKm <= maxDistanceKm; rKm += (maxDistanceKm - planetRadiusKm) / 50) {
      const gAccel = (G_VAL * massKg) / Math.pow(rKm * 1000, 2);
      const px = getX(rKm);
      const py = getY(gAccel);

      if (first) {
        ctx.moveTo(px, py);
        first = false;
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw current position (at surface)
    const currentForceSurface = (G_VAL * massKg) / Math.pow(planetRadiusKm * 1000, 2);
    ctx.fillStyle = '#e7eaee';
    ctx.beginPath();
    ctx.arc(getX(planetRadiusKm), getY(currentForceSurface), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Labels
    ctx.fillStyle = '#5b6b88';
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillText('F(r)', 10, 15);
    ctx.fillText('Distancia r', width - 80, height - 5);
    ctx.fillStyle = '#4ade80';
    ctx.fillText(`g(sfc) = ${currentForceSurface.toFixed(2)} m/s²`, 45, 25);
  }, [massKg, planetRadiusKm]);

  return (
    <div className="glass-card p-2 flex flex-col items-center">
      <span className="hud-eyebrow !text-[9.5px] mb-1.5 self-start">Gráfica Gravedad F(r) = G·M·m/r² vs r</span>
      <canvas ref={canvasRef} width={300} height={140} className="w-full bg-[#030312]" id="canvas_gravity_graph" />
    </div>
  );
}

// ==========================================
// Leibniz Pi Convergence Canvas
// ==========================================
interface LeibnizGraphProps {
  terms: number;
}

export function LeibnizPiGraph({ terms }: LeibnizGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = 'rgba(146, 180, 222, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Pi line (3.14159)
    const getPlotY = (val: number) => {
      // target val is around 3.14. Let's make bounds 2.0 to 4.2
      const minVal = 2.0;
      const maxVal = 4.2;
      const ratio = (val - minVal) / (maxVal - minVal);
      return height - 15 - ratio * (height - 30);
    };

    // Draw theoretical Red Line for Pi
    ctx.strokeStyle = '#c98a52';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(35, getPlotY(Math.PI));
    ctx.lineTo(width - 10, getPlotY(Math.PI));
    ctx.stroke();
    ctx.setLineDash([]);

    // Axes
    ctx.strokeStyle = '#46587a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(35, 10);
    ctx.lineTo(35, height - 15);
    ctx.lineTo(width - 10, height - 15);
    ctx.stroke();

    // Plot convergent points
    ctx.strokeStyle = '#aebac4';
    ctx.lineWidth = 1.6;
    ctx.beginPath();

    let sum = 0;
    const pointsToDraw = Math.min(terms, 100); // Caps for rendering speed, but accurate visual
    const stepX = (width - 50) / pointsToDraw;

    for (let n = 0; n < pointsToDraw; n++) {
      const term = Math.pow(-1, n) / (2 * n + 1);
      sum += term;
      const currentPiApproximation = sum * 4;
      const px = 35 + n * stepX;
      const py = getPlotY(currentPiApproximation);

      if (n === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Labels
    ctx.fillStyle = '#5b6b88';
    ctx.font = "9px 'JetBrains Mono', monospace";
    ctx.fillText('Aprox', 5, 15);
    ctx.fillText('N (Términos)', width - 85, height - 4);
    ctx.fillStyle = '#c98a52';
    ctx.fillText('π Real ≈ 3.1416', 45, 20);
  }, [terms]);

  return (
    <div className="glass-card p-2 flex flex-col items-center">
      <span className="hud-eyebrow !text-[9.5px] mb-1.5 self-start">Gráfica Serie de Leibniz (Convergencia de π)</span>
      <canvas ref={canvasRef} width={300} height={140} className="w-full bg-[#030312]" id="canvas_leibniz_graph" />
    </div>
  );
}

// ==========================================
// 2D Elliptical Geometry Layout
// ==========================================
interface EllipseGeometryProps {
  planetName: string;
  semiMajorAxis: number;
  eccentricity: number;
  thetaRad: number;
  planetColor: string;
}

export function EllipseGeometryCanvas({ planetName, semiMajorAxis, eccentricity, thetaRad, planetColor }: EllipseGeometryProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Center coordinates
    const cx = width / 2;
    const cy = height / 2;

    // Oval base radius
    const baseA = 80; // visual semimajor axis
    const e = eccentricity;
    const baseB = baseA * Math.sqrt(1 - e * e); // visual semiminor axis
    const cOffset = baseA * e; // Sun focal offset

    // Focus positions
    const f1X = cx - cOffset; // Sol at real focus
    const f1Y = cy;
    const f2X = cx + cOffset; // Other focus
    const f2Y = cy;

    // Draw elipse orbit boundary
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, baseA, baseB, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Draw major and minor axes
    ctx.strokeStyle = 'rgba(56, 211, 255, 0.14)';
    ctx.setLineDash([2, 3]);
    // Major axis
    ctx.beginPath();
    ctx.moveTo(cx - baseA, cy);
    ctx.lineTo(cx + baseA, cy);
    ctx.stroke();
    // Minor axis
    ctx.beginPath();
    ctx.moveTo(cx, cy - baseB);
    ctx.lineTo(cx, cy + baseB);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Foci
    // Foc1: Sun
    ctx.fillStyle = '#d9a86a';
    ctx.beginPath();
    ctx.arc(f1X, f1Y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Sun text
    ctx.fillStyle = '#d9a86a';
    ctx.font = "9px 'JetBrains Mono', monospace";
    ctx.fillText('Sol(F1)', f1X - 15, f1Y - 10);

    // Foc2
    ctx.fillStyle = 'rgba(100, 150, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(f2X, f2Y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText('F2', f2X - 5, f2Y - 8);

    // Compute current planet position
    // Formula: r = a(1-e^2)/(1+e*cos(theta)). Angle is thetaRad (True anomaly)
    const visualR = (baseA * (1 - e * e)) / (1 + e * Math.cos(thetaRad));
    const px = f1X + visualR * Math.cos(thetaRad);
    const py = f1Y + visualR * Math.sin(thetaRad);

    // Draw vector r_1 (f1 with planet)
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(f1X, f1Y);
    ctx.lineTo(px, py);
    ctx.stroke();

    // Draw vector r_2 (f2 with planet)
    ctx.strokeStyle = '#8800ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(f2X, f2Y);
    ctx.lineTo(px, py);
    ctx.stroke();

    // Draw Planet
    ctx.fillStyle = planetColor;
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Labels & Annotations
    ctx.fillStyle = '#aebac4';
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillText('Elipse Orbital 2D (Parámetros Reales en Foco)', 8, 15);

    // Show distance parameters
    ctx.fillStyle = '#5b6b88';
    ctx.fillText(`a = ${semiMajorAxis.toFixed(3)} AU`, 10, height - 25);
    ctx.fillText(`e = ${e.toFixed(4)}`, 10, height - 12);
    ctx.fillStyle = '#4ade80';
    ctx.fillText(`r₁ = ${(visualR / baseA * semiMajorAxis).toFixed(3)} AU`, width - 95, height - 25);
    ctx.fillStyle = '#8800ff';
    const visualR2 = 2 * baseA - visualR; // conserved: r1 + r2 = 2a
    ctx.fillText(`r₂ = ${(visualR2 / baseA * semiMajorAxis).toFixed(3)} AU`, width - 95, height - 12);
  }, [planetName, semiMajorAxis, eccentricity, thetaRad, planetColor]);

  return (
    <div className="glass-card p-2 flex flex-col items-center">
      <span className="hud-eyebrow !text-[9.5px] mb-1.5 self-start">Visualización 2D de la Elipse y Radios Vectores</span>
      <canvas ref={canvasRef} width={300} height={180} className="w-full bg-[#030312]" id="canvas_ellipse_geometry" />
    </div>
  );
}
