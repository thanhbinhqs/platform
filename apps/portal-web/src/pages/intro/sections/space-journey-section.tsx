import { useRef, useState, useEffect, useCallback, forwardRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Rocket, ChevronDown, Sparkles } from 'lucide-react';

/* ─── Planet Data ─── */
interface PlanetData {
  id: string;
  name: string;
  title: string;
  tagline: string;
  description: string;
  color: string;
  colorFrom: string;
  colorTo: string;
  size: number;          // planet diameter px
  orbitTilt?: number;    // deg, for Saturn rings
  ringColor?: string;
  features: string[];
  gradient: string;      // radial-gradient
}

const planets: PlanetData[] = [
  {
    id: 'mercury',
    name: 'Mercury',
    title: 'Core Engine',
    tagline: 'The Foundation',
    color: '#a8b0b8',
    colorFrom: '#6b7280',
    colorTo: '#d1d5db',
    size: 80,
    description: 'Ultra-fast data processing engine powering the entire NC MEMS platform.',
    gradient: 'radial-gradient(circle at 35% 35%, #d1d5db 0%, #6b7280 50%, #374151 100%)',
    features: ['Real-time sync < 10ms', 'Zero-downtime architecture', 'Edge processing ready'],
  },
  {
    id: 'venus',
    name: 'Venus',
    title: 'Jig Management',
    tagline: 'Total Visibility',
    color: '#e8c87a',
    colorFrom: '#d97706',
    colorTo: '#fde68a',
    size: 110,
    description: 'Complete lifecycle tracking for every jig — from assignment to maintenance.',
    gradient: 'radial-gradient(circle at 35% 35%, #fde68a 0%, #d97706 50%, #92400e 100%)',
    features: ['QR / RFID assignment', 'Auto maintenance alerts', 'Real-time location tracking'],
  },
  {
    id: 'earth',
    name: 'Earth',
    title: 'Part Lifecycle',
    tagline: 'Full Traceability',
    color: '#4a9eff',
    colorFrom: '#2563eb',
    colorTo: '#93c5fd',
    size: 120,
    description: 'From incoming inspection to final assembly — every part is accounted for.',
    gradient: 'radial-gradient(circle at 35% 35%, #93c5fd 0%, #2563eb 50%, #1e3a5f 100%)',
    features: ['3s traceability', 'Auto certification', 'Lot & serial tracking'],
  },
  {
    id: 'mars',
    name: 'Mars',
    title: 'Production Monitoring',
    tagline: 'Real-Time Insights',
    color: '#e06040',
    colorFrom: '#dc2626',
    colorTo: '#fca5a5',
    size: 95,
    description: 'Live OEE dashboards, downtime alerts, and production analytics at your fingertips.',
    gradient: 'radial-gradient(circle at 35% 35%, #fca5a5 0%, #dc2626 50%, #7f1d1d 100%)',
    features: ['OEE tracking live', 'Auto downtime alerts', 'Production forecasting'],
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    title: 'Enterprise Scale',
    tagline: 'Unlimited Growth',
    color: '#d4a06a',
    colorFrom: '#b45309',
    colorTo: '#fcd34d',
    size: 160,
    description: 'Handle thousands of jigs, millions of parts, and dozens of factories effortlessly.',
    gradient: 'radial-gradient(circle at 35% 35%, #fcd34d 0%, #b45309 50%, #78350f 100%)',
    features: ['Multi-factory support', 'Load balancing', '99.99% SLA option'],
  },
  {
    id: 'saturn',
    name: 'Saturn',
    title: 'Ecosystem Integration',
    tagline: 'Connected Universe',
    color: '#c8b080',
    colorFrom: '#a16207',
    colorTo: '#fef08a',
    size: 140,
    ringColor: 'rgba(192, 176, 128, 0.4)',
    orbitTilt: -20,
    description: 'Seamless bi-directional sync with MES, ERP, SCADA, and IoT Cloud platforms.',
    gradient: 'radial-gradient(circle at 35% 35%, #fef08a 0%, #a16207 50%, #713f12 100%)',
    features: ['MES / ERP / SCADA sync', 'WebSocket real-time', 'REST & GraphQL APIs'],
  },
];

/* ─── Star Field ─── */
function StarField({ speed }: { speed?: number }) {
  const stars = useRef(
    Array.from({ length: 80 }, () => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: 1 + Math.random() * 2.5,
      delay: Math.random() * 5,
      duration: 2 + Math.random() * 4,
      alpha: 0.15 + Math.random() * 0.5,
    }))
  ).current;

  return (
    <div className="star-field">
      {stars.map((s, i) => (
        <div
          key={i}
          className="star-particle"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            opacity: s.alpha,
            animationDelay: `${s.delay}s`,
            animationDuration: speed ? `${s.duration * (2 / speed)}s` : `${s.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Planet Visual ─── */
function PlanetVisual({ planet, index }: { planet: PlanetData; index: number }) {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const r = containerRef.current?.getBoundingClientRect();
    if (!r) return;
    const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    setMouseX(x);
    setMouseY(y);
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { setMouseX(0); setMouseY(0); }}
      className="relative flex items-center justify-center"
      style={{ width: planet.size + 100, height: planet.size + 100 }}
    >
      {/* Glow */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: planet.size * 2.5,
          height: planet.size * 2.5,
          background: `radial-gradient(circle, ${planet.color}15 0%, transparent 70%)`,
          transform: `translate(${mouseX * 8}px, ${mouseY * 8}px)`,
          transition: 'transform 0.3s ease-out',
        }}
      />

      {/* Orbit ring (visible on all planets, faint) */}
      <div
        className="absolute rounded-full border pointer-events-none opacity-20"
        style={{
          width: planet.size * 2,
          height: planet.size * 2,
          borderColor: planet.color,
          borderWidth: '1px',
          animation: `ring-spin ${18 + index * 3}s linear infinite`,
        }}
      />

      {/* Saturn rings */}
      {planet.ringColor && (
        <div
          className="absolute pointer-events-none"
          style={{
            width: planet.size * 2.2,
            height: planet.size * 0.4,
            border: `2px solid ${planet.ringColor}`,
            borderRadius: '50%',
            transform: `rotate(${planet.orbitTilt || 0}deg) translate(${mouseX * 5}px, ${mouseY * 5}px)`,
            transition: 'transform 0.3s ease-out',
            boxShadow: `0 0 20px ${planet.ringColor}30`,
          }}
        />
      )}

      {/* Planet */}
      <div
        className="planet-sphere absolute rounded-full"
        style={{
          width: planet.size,
          height: planet.size,
          background: planet.gradient,
          transform: `perspective(800px) rotateY(${mouseX * 15}deg) rotateX(${mouseY * -15}deg) translate(${mouseX * 10}px, ${mouseY * 10}px)`,
          boxShadow: `0 0 60px ${planet.color}30, inset 0 -20px 40px rgba(0,0,0,0.3)`,
          transition: 'transform 0.3s ease-out',
        }}
      >
        {/* Surface highlight */}
        <div
          className="absolute rounded-full"
          style={{
            width: '35%',
            height: '35%',
            top: '15%',
            left: '20%',
            background: `radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)`,
          }}
        />
      </div>

      {/* Floating orbit dots */}
      {!useReducedMotion() && (
        <div
          className="absolute w-2 h-2 rounded-full"
          style={{
            background: planet.color,
            opacity: 0.3,
            animation: `orbit-dot ${8 + index * 2}s linear infinite`,
            filter: 'blur(1px)',
          }}
        />
      )}
    </div>
  );
}

/* ─── Single Planet Section ─── */
function PlanetSection({
  planet,
  index,
  isActive,
}: {
  planet: PlanetData;
  index: number;
  isActive: boolean;
}) {
  const prefersReduced = useReducedMotion();

  return (
    <section
      id={`planet-${planet.id}`}
      className="planet-section relative flex min-h-screen w-full items-center overflow-hidden px-6 py-20 sm:px-12 lg:px-20"
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(180deg, 
            rgba(6,13,26,1) 0%, 
            rgba(6,13,26,0.98) 40%,
            rgba(6,13,26,0.95) 100%
          )`,
        }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center gap-10 lg:flex-row lg:gap-16">
        {/* Planet visual */}
        <motion.div
          initial={prefersReduced ? { opacity: 0 } : { opacity: 0, x: -40, scale: 0.85 }}
          whileInView={{ opacity: 1, x: 0, scale: 1 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-1 items-center justify-center"
        >
          <PlanetVisual planet={planet} index={index} />
        </motion.div>

        {/* Info */}
        <motion.div
          initial={prefersReduced ? { opacity: 0 } : { opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 text-center lg:text-left"
        >
          {/* Badge */}
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.03] px-3.5 py-1">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: planet.color }}
            />
            <span className="text-[10px] font-medium tracking-[0.12em] text-gray-500 uppercase">
              {planet.tagline}
            </span>
          </div>

          {/* Planet name + title */}
          <h2 className="mb-1 text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            {planet.name}
          </h2>
          <p
            className="mb-4 text-lg font-medium sm:text-xl"
            style={{ color: planet.color }}
          >
            {planet.title}
          </p>

          {/* Description */}
          <p className="mb-6 max-w-md text-sm leading-relaxed text-gray-400">
            {planet.description}
          </p>

          {/* Features */}
          <ul className="space-y-2.5">
            {planet.features.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-gray-300">
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                  style={{ background: `${planet.color}20` }}
                >
                  <Sparkles className="h-2.5 w-2.5" style={{ color: planet.color }} />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Main Space Journey ─── */
export function SpaceJourneySection() {
  const prefersReduced = useReducedMotion();
  const [isJourneyStarted, setIsJourneyStarted] = useState(false);
  const [currentPlanet, setCurrentPlanet] = useState(-1);
  const journeyRef = useRef<HTMLDivElement>(null);

  // Track which planet is in view
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    planets.forEach((_, i) => {
      const el = document.getElementById(`planet-${planets[i]!.id}`);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry!.isIntersecting) {
            setCurrentPlanet(i);
          }
        },
        { threshold: 0.4 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  /* ── Auto Journey ── */
  const startJourney = useCallback(() => {
    setIsJourneyStarted(true);
    let i = 0;
    const scrollNext = () => {
      if (i >= planets.length) {
        setIsJourneyStarted(false);
        return;
      }
      const el = document.getElementById(`planet-${planets[i]!.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      i++;
      setTimeout(scrollNext, 3500);
    };
    scrollNext();
  }, []);

  /* ── Jump to planet ── */
  const jumpTo = useCallback((i: number) => {
    const el = document.getElementById(`planet-${planets[i]?.id ?? ''}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div ref={journeyRef} className="relative">
      {/* Star field background */}
      <StarField speed={isJourneyStarted ? 0.5 : 0.2} />

      {/* Navigation dots */}
      <div className="fixed right-6 top-1/2 z-50 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
        {planets.map((p, i) => (
          <button
            key={p.id}
            onClick={() => jumpTo(i)}
            className="group relative flex items-center justify-center"
            title={p.name}
          >
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full border transition-all duration-300 ${
                currentPlanet === i
                  ? 'border-blue-400 bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]'
                  : 'border-white/20 bg-transparent hover:border-white/50'
              }`}
            />
            <span className="absolute right-4 whitespace-nowrap text-[10px] text-gray-500 opacity-0 transition-opacity group-hover:opacity-100">
              {p.name}
            </span>
          </button>
        ))}
      </div>

      {/* Intro splash */}
      {!isJourneyStarted && (
        <section className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-6">
          <StarField />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 text-center"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-400/15 bg-blue-400/5 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.15em] text-blue-300">
              <Rocket className="h-3.5 w-3.5" />
              Interactive Experience
            </div>

            <h1 className="gradient-text mb-4 text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl">
              The NC MEMS Universe
            </h1>

            <p className="mx-auto mb-10 max-w-xl text-sm leading-relaxed text-gray-400">
              Embark on a journey through the solar system. Each planet represents a core capability of the NC MEMS platform.
            </p>

            <button
              onClick={startJourney}
              className="group inline-flex items-center gap-3 rounded-xl bg-white px-8 py-4 text-sm font-semibold text-gray-900 shadow-2xl shadow-black/20 transition-all duration-200 hover:bg-gray-50 hover:shadow-2xl hover:shadow-blue-500/20 active:scale-[0.97]"
            >
              <Rocket className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              Launch Journey
            </button>
          </motion.div>

          {/* Scroll down indicator */}
          {!prefersReduced && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.4, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 2 }}
              className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2"
            >
              <ChevronDown className="h-5 w-5 text-blue-400/40" />
            </motion.div>
          )}
        </section>
      )}

      {/* Planet sections */}
      {planets.map((planet, i) => (
        <PlanetSection
          key={planet.id}
          planet={planet}
          index={i}
          isActive={currentPlanet === i}
        />
      ))}

      {/* Final CTA */}
      <section className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-6">
        <StarField />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center"
        >
          <h2 className="gradient-text mb-4 text-3xl font-bold sm:text-5xl">
            Ready to Explore?
          </h2>
          <p className="mx-auto mb-8 max-w-md text-sm text-gray-400">
            The NC MEMS universe is waiting. Sign in to start your journey.
          </p>
          <a
            href="/login"
            className="btn-shine inline-flex items-center gap-2.5 rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-gray-900 shadow-2xl shadow-black/15 transition-all duration-200 hover:bg-gray-50 hover:shadow-2xl hover:shadow-blue-500/15 active:scale-[0.97]"
          >
            Sign In Now
            <Rocket className="h-4 w-4" />
          </a>
        </motion.div>
      </section>

      {/* Travel indicator (during auto-scroll) */}
      {isJourneyStarted && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-[10px] text-gray-400 backdrop-blur-sm border border-white/5">
            <Rocket className="h-3 w-3 text-blue-400" />
            Traveling...
            <span className="text-blue-400">
              {currentPlanet >= 0 ? `${planets[currentPlanet]!.name}` : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
