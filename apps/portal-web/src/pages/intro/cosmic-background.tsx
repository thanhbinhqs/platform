import { useRef, useState, useEffect, useCallback } from 'react';

/* ─── Planet Data ─── */
interface PlanetVisual {
  id: string;
  name: string;
  color: string;
  size: number;
  orbitTilt?: number;
  ringColor?: string;
  gradient: string;
}

const planets: PlanetVisual[] = [
  {
    id: 'sun',
    name: 'Core',
    color: '#fbbf24',
    size: 140,
    gradient: 'radial-gradient(circle at 35% 35%, #fef08a 0%, #f59e0b 50%, #b45309 100%)',
  },
  {
    id: 'earth',
    name: 'Earth',
    color: '#4a9eff',
    size: 120,
    gradient: 'radial-gradient(circle at 35% 35%, #93c5fd 0%, #2563eb 50%, #1e3a5f 100%)',
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    color: '#d4a06a',
    size: 160,
    gradient: 'radial-gradient(circle at 35% 35%, #fcd34d 0%, #b45309 50%, #78350f 100%)',
  },
  {
    id: 'saturn',
    name: 'Saturn',
    color: '#c8b080',
    size: 140,
    ringColor: 'rgba(192, 176, 128, 0.4)',
    orbitTilt: -20,
    gradient: 'radial-gradient(circle at 35% 35%, #fef08a 0%, #a16207 50%, #713f12 100%)',
  },
  {
    id: 'mercury',
    name: 'Mercury',
    color: '#a8b0b8',
    size: 100,
    gradient: 'radial-gradient(circle at 35% 35%, #d1d5db 0%, #6b7280 50%, #374151 100%)',
  },
  {
    id: 'mars',
    name: 'Mars',
    color: '#e06040',
    size: 95,
    gradient: 'radial-gradient(circle at 35% 35%, #fca5a5 0%, #dc2626 50%, #7f1d1d 100%)',
  },
];

function getPlanetForSection(sectionIndex: number): PlanetVisual {
  const idx = Math.min(sectionIndex, planets.length - 1);
  return planets[idx]!;
}

/* ─── Star Field Layer ─── */
function StarFieldLayer({ travelSpeed }: { travelSpeed?: number }) {
  const stars = useRef(
    Array.from({ length: 120 }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 1 + Math.random() * 2.5,
      delay: Math.random() * 5,
      duration: 2 + Math.random() * 4,
      alpha: 0.15 + Math.random() * 0.6,
    }))
  ).current;

  return (
    <div className="cosmic-bg-stars">
      {stars.map((s, i) => (
        <div
          key={i}
          className="cosmic-bg-star"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            opacity: s.alpha,
            animationDelay: `${s.delay}s`,
            animationDuration: travelSpeed && travelSpeed > 0
              ? `${s.duration / travelSpeed}s`
              : `${s.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Planet Renderer ─── */
function PlanetRenderer({
  planet,
  planetIndex,
}: {
  planet: PlanetVisual;
  planetIndex: number;
}) {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const r = containerRef.current?.getBoundingClientRect();
    if (!r) return;
    setMouseX(((e.clientX - r.left) / r.width - 0.5) * 2);
    setMouseY(((e.clientY - r.top) / r.height - 0.5) * 2);
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { setMouseX(0); setMouseY(0); }}
      className="cosmic-bg-planet-container"
    >
      {/* Glow */}
      <div
        className="cosmic-bg-glow"
        style={{
          width: planet.size * 2.8,
          height: planet.size * 2.8,
          background: `radial-gradient(circle, ${planet.color}12 0%, transparent 70%)`,
          transform: `translate(${mouseX * 6}px, ${mouseY * 6}px)`,
        }}
      />

      {/* Orbit ring */}
      <div
        className="cosmic-bg-orbit"
        style={{
          width: planet.size * 2.2,
          height: planet.size * 2.2,
          borderColor: planet.color,
          animationDuration: `${20 + planetIndex * 3}s`,
        }}
      />

      {/* Saturn rings */}
      {planet.ringColor && (
        <div
          className="cosmic-bg-ring"
          style={{
            width: planet.size * 2.4,
            height: planet.size * 0.4,
            border: `2px solid ${planet.ringColor}`,
            boxShadow: `0 0 30px ${planet.ringColor}20`,
            transform: `rotate(${planet.orbitTilt || 0}deg) translate(${mouseX * 4}px, ${mouseY * 4}px)`,
          }}
        />
      )}

      {/* Planet sphere */}
      <div
        className="cosmic-bg-planet"
        style={{
          width: planet.size,
          height: planet.size,
          background: planet.gradient,
          boxShadow: `0 0 80px ${planet.color}25, inset 0 -20px 40px rgba(0,0,0,0.3)`,
          transform: `perspective(800px) rotateY(${mouseX * 12}deg) rotateX(${mouseY * -12}deg) translate(${mouseX * 8}px, ${mouseY * 8}px)`,
        }}
      >
        <div
          className="cosmic-bg-highlight"
          style={{
            width: '35%',
            height: '35%',
            top: '15%',
            left: '20%',
            background: `radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)`,
          }}
        />
      </div>
    </div>
  );
}

/* ─── Scanning Ray ─── */
function ScanningRay() {
  return <div className="cosmic-bg-ray" />;
}

/* ─── Floating Particles ─── */
function FloatingParticles() {
  const particles = useRef(
    Array.from({ length: 15 }, (_, i) => ({
      left: ((i * 73 + 31) % 100),
      delay: i * 0.4,
      duration: 4 + (i % 3) * 2,
      size: 2 + (i % 3),
      alpha: 0.08 + (i % 5) * 0.03,
    }))
  ).current;

  return (
    <>
      {particles.map((p, i) => (
        <div
          key={i}
          className="cosmic-bg-particle"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.alpha,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </>
  );
}

/* ─── Main Cosmic Background ─── */
interface CosmicBackgroundProps {
  /** 0-based index of the currently visible content section */
  activeSection: number;
}

export function CosmicBackground({ activeSection }: CosmicBackgroundProps) {
  const [prevSection, setPrevSection] = useState(activeSection);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (prevSection === activeSection) return;
    setIsTransitioning(true);
    const t = setTimeout(() => {
      setPrevSection(activeSection);
      setIsTransitioning(false);
    }, 600);
    return () => clearTimeout(t);
  }, [activeSection, prevSection]);

  const currentPlanet = getPlanetForSection(activeSection);
  const oldPlanet = getPlanetForSection(prevSection);

  return (
    <div className="cosmic-bg-wrapper">
      {/* Deep space background */}
      <div className="cosmic-bg-space" />

      {/* Star field */}
      <StarFieldLayer travelSpeed={isTransitioning ? 0.5 : 0.15} />

      {/* Planet */}
      <div
        className="cosmic-bg-planet-layer"
        style={{
          opacity: isTransitioning ? 0.4 : 0.8,
          transition: 'opacity 0.6s ease',
        }}
      >
        <PlanetRenderer
          key={activeSection}
          planet={currentPlanet}
          planetIndex={activeSection}
        />
      </div>

      {/* Transition planet (fade out old) */}
      {isTransitioning && (
        <div
          className="cosmic-bg-planet-layer"
          style={{
            opacity: 0.2,
            transition: 'opacity 0.6s ease',
          }}
        >
          <PlanetRenderer planet={oldPlanet} planetIndex={prevSection} />
        </div>
      )}

      {/* Scanning ray */}
      <ScanningRay />

      {/* Floating particles */}
      <FloatingParticles />

      {/* Grid overlay */}
      <div className="cosmic-bg-grid" />

      {/* Bottom gradient fade */}
      <div className="cosmic-bg-fade" />
    </div>
  );
}
