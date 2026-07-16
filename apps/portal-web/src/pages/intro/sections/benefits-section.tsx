import { useRef, useState, useCallback, useEffect } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Gauge, BarChart3, Layers } from 'lucide-react';
import '../intro.css';

const benefits = [
  {
    icon: Gauge,
    title: 'Boost Production Efficiency',
    metric: '40%',
    metricLabel: 'WAIT TIME REDUCTION',
    desc: 'Real-time MES integration reduces wait time between stages by 40%. Optimize OEE and plant-wide production capacity.',
    bullets: ['Real-time MES connection', 'OEE optimization', 'Downtime reduction'],
    accent: 'from-blue-500 to-cyan-400',
  },
  {
    icon: BarChart3,
    title: 'Reduce Operational Costs',
    metric: '60%',
    metricLabel: 'ERROR REDUCTION',
    desc: 'Automate Jig & Part workflows, cutting manual errors by 60%. Optimize inventory and equipment maintenance costs.',
    bullets: ['Process automation', 'Inventory optimization', 'Lower maintenance costs'],
    accent: 'from-violet-500 to-fuchsia-400',
  },
  {
    icon: Layers,
    title: 'Full Data Transparency',
    metric: '3s',
    metricLabel: 'TRACEABILITY',
    desc: 'Trace component origins in 3 seconds. Meet the strictest certification standards in electronics manufacturing.',
    bullets: ['Full traceability', 'Auto certification', 'Instant reporting'],
    accent: 'from-emerald-500 to-teal-400',
  },
];

function CounterMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="gradient-text text-4xl font-bold sm:text-5xl">{value}</div>
      <div className="mt-1 text-[10px] font-medium tracking-[0.18em] text-gray-400">{label}</div>
    </div>
  );
}

function TiltCard({ children }: { children: React.ReactNode }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const card = cardRef.current;
    if (!card) return;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const tiltX = (y - 0.5) * -12;
    const tiltY = (x - 0.5) * 12;
    (card.querySelector('.tilt-inner') as HTMLElement)?.style.setProperty(
      'transform', `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`
    );
  }, []);

  const handleMouseLeave = useCallback(() => {
    (cardRef.current?.querySelector('.tilt-inner') as HTMLElement)?.style.setProperty(
      'transform', 'perspective(800px) rotateX(0deg) rotateY(0deg)'
    );
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="feature-card group relative rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl"
    >
      <div className="tilt-inner transition-[transform] duration-200 ease-out">
        {children}
      </div>
      {/* Accent bar */}
      <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 transition-all duration-300 group-hover:opacity-100" />
    </div>
  );
}

export function BenefitsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const prefersReduced = useReducedMotion();

  return (
    <section ref={ref} className="relative w-full bg-transparent px-6 py-28 sm:px-8 lg:px-12">
      {/* Ambient gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.02)_0%,_transparent_60%)] pointer-events-none" />

      <div className="relative mx-auto max-w-6xl">
        {/* Section label */}
        <motion.p
          initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-3 text-center text-[10px] font-bold tracking-[0.25em] text-blue-400"
        >
          — BUSINESS VALUE —
        </motion.p>

        {/* Heading */}
        <motion.h2
          initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="mb-4 text-center text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl"
        >
          Why <span className="gradient-text">NC MEMS</span>?
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-auto mb-14 max-w-2xl text-center text-sm leading-relaxed text-gray-500 dark:text-gray-400"
        >
          Digital transformation for manufacturing — reduce operational costs, increase productivity, and achieve full data transparency.
        </motion.p>

        {/* Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.97 }}
              animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <TiltCard>
                {/* Metric */}
                <CounterMetric value={b.metric} label={b.metricLabel} />

                {/* Divider */}
                <div className="my-4 h-px bg-gradient-to-r from-gray-100 to-transparent dark:from-white/5" />

                {/* Icon */}
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                  <b.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>

                {/* Title */}
                <h3 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">
                  {b.title}
                </h3>

                {/* Description */}
                <p className="mb-4 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                  {b.desc}
                </p>

                {/* Bullets */}
                <ul className="space-y-1.5">
                  {b.bullets.map((bl) => (
                    <li key={bl} className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                      <span className={`inline-block h-1 w-1 rounded-full bg-gradient-to-r ${b.accent}`} />
                      {bl}
                    </li>
                  ))}
                </ul>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BenefitsSectionWithDivider() {
  return (
    <>
      <BenefitsSection />
      <div className="section-divider mx-auto max-w-4xl" />
    </>
  );
}
