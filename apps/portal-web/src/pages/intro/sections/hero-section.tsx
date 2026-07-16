import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Constellation } from '../../../lib/constellation';
import '../intro.css';

const stats = [
  { value: 50, suffix: 'K+', label: 'Jigs Managed' },
  { value: 500, suffix: 'K+', label: 'Parts Tracked' },
  { value: 99.9, suffix: '%', label: 'Uptime' },
  { value: 40, suffix: '+', label: 'Factories' },
];

/* ── Typing text ── */
const tagline =
  'A centralized management platform for Jig, Part — real-time connectivity with MES & ERP.';

export function HeroSection({ onExplore }: { onExplore: () => void }) {
  const prefersReduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [typed, setTyped] = useState('');
  const [counts, setCounts] = useState(stats.map(() => 0));
  const constellationRef = useRef<Constellation | null>(null);

  /* ── Constellation Canvas ── */
  useEffect(() => {
    if (!canvasRef.current || prefersReduced) return;
    const c = new Constellation(canvasRef.current, {
      count: 100,
      linkDistance: 130,
      speed: 0.5,
      mouseRadius: 180,
    });
    constellationRef.current = c;
    c.start();
    return () => c.stop();
  }, [prefersReduced]);

  /* ── Typing Effect ── */
  useEffect(() => {
    if (prefersReduced) {
      setTyped(tagline);
      return;
    }
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTyped(tagline.slice(0, i));
      if (i >= tagline.length) clearInterval(interval);
    }, 22);
    return () => clearInterval(interval);
  }, [prefersReduced]);

  /* ── Counter Animation ── */
  useEffect(() => {
    if (prefersReduced) {
      setCounts(stats.map((s) => s.value));
      return;
    }
    const durations = [2000, 2200, 1800, 1500];
    const startTimes = stats.map(() => Date.now());
    const raf = requestAnimationFrame(function tick() {
      const now = Date.now();
      const newCounts = stats.map((s, i) => {
        const elapsed = now - startTimes[i]!;
        const progress = Math.min(elapsed / durations[i]!, 1);
        // easeOutQuart
        const eased = 1 - Math.pow(1 - progress, 4);
        return Math.round(s.value * eased);
      });
      setCounts(newCounts);
      if (newCounts.some((c, i) => c < stats[i]!.value)) {
        requestAnimationFrame(tick);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [prefersReduced]);

  /* ── Magnetic button ── */
  const handleMagneticMove = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    const btn = e.currentTarget;
    const r = btn.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    (btn.querySelector('.btn-magnetic') as HTMLElement)?.style.setProperty(
      'transform', `translate(${x * 0.2}px, ${y * 0.2}px)`
    );
  }, []);

  const handleMagneticLeave = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    (e.currentTarget.querySelector('.btn-magnetic') as HTMLElement)?.style.setProperty(
      'transform', 'translate(0, 0)'
    );
  }, []);

  return (
    <section className="hero-gradient relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden">
      {/* Constellation Canvas */}
      {!prefersReduced && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-[2] pointer-events-auto"
        />
      )}

      {/* Grid overlay */}
      <div className="hero-geo z-[1]" />

      {/* Scanning Ray */}
      {!prefersReduced && <div className="scan-line z-[3]" />}

      {/* Halo Rings */}
      {!prefersReduced && (
        <div className="z-[1]">
          <div className="halo-ring halo-ring--outer top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          <div className="halo-ring halo-ring--inner top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          <div className="halo-ring halo-ring--dashed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
      )}

      {/* Ripple Rings */}
      {!prefersReduced && (
        <div className="absolute top-1/2 left-1/2 z-[1] -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
          <div className="ripple-ring" />
          <div className="ripple-ring" />
          <div className="ripple-ring" />
        </div>
      )}

      {/* Data Particles */}
      {!prefersReduced &&
        Array.from({ length: 10 }, (_, i) => (
          <div
            key={`dp-${i}`}
            className="data-particle"
            style={{
              left: `${8 + i * 9}%`,
              bottom: '0',
              animationDelay: `${-(i * 1.1)}s`,
              animationDuration: `${5 + (i % 3) * 2}s`,
            }}
          />
        ))}

      {/* Orbs */}
      <div className="hero-orb hero-orb--blue z-[1]" />
      <div className="hero-orb hero-orb--indigo z-[1]" />
      <div className="hero-orb hero-orb--teal z-[1]" />

      {/* ── Content ── */}
      <div className="relative z-10 mx-auto max-w-5xl px-6 text-center">
        {/* Badge with pulse */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-blue-400/15 bg-blue-400/5 px-5 py-1.5 text-[11px] font-medium uppercase tracking-[0.15em] text-blue-300 backdrop-blur-sm"
        >
          <span className="pulse-dot" />
          Centralized Management Platform
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
          className="gradient-text glow-text relative mb-5 text-5xl font-bold tracking-tight sm:text-7xl md:text-8xl lg:text-9xl"
        >
          NC MEMS
        </motion.h1>

        {/* Typing tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className={`mx-auto mb-10 max-w-2xl text-base leading-relaxed text-gray-400 sm:text-lg ${
            !prefersReduced ? 'typing-cursor' : ''
          }`}
        >
          {typed}
          {prefersReduced && <span className="opacity-0">|</span>}
        </motion.p>

        {/* Buttons with magnetic effect */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <button
            onClick={onExplore}
            className="btn-shine inline-flex items-center gap-2.5 rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-gray-900 shadow-2xl shadow-black/15 transition-all duration-200 hover:bg-gray-50 hover:shadow-2xl hover:shadow-blue-500/15 active:scale-[0.97]"
          >
            Explore Now
            <ArrowRight className="h-4 w-4" />
          </button>
          <a
            href="https://github.com/thanhbinhqs/platform"
            target="_blank"
            rel="noopener noreferrer"
            onMouseMove={handleMagneticMove}
            onMouseLeave={handleMagneticLeave}
            className="inline-flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-8 py-3.5 text-sm font-medium text-gray-300 backdrop-blur-sm transition-all duration-200 hover:border-white/20 hover:bg-white/[0.07] hover:text-white active:scale-[0.97]"
          >
            <span className="btn-magnetic inline-flex items-center gap-2.5">
              <BookOpen className="h-4 w-4" />
              Docs
            </span>
          </a>
        </motion.div>

        {/* Stats with counters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mx-auto mt-16 grid max-w-2xl grid-cols-2 gap-x-12 gap-y-5 border-t border-white/5 pt-8 sm:grid-cols-4"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
              className="text-center"
            >
              <div className="gradient-text text-2xl font-bold sm:text-3xl">
                {counts[i]}{stat.suffix}
              </div>
              <div className="mt-0.5 text-xs text-gray-500">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.4, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, delay: 2 }}
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
      >
        <div className="h-10 w-px bg-gradient-to-b from-blue-400/25 to-transparent" />
      </motion.div>
    </section>
  );
}
