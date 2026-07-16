import { useRef, useCallback } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import {
  Monitor,
  Database,
  Server,
  Cloud,
  ArrowRightLeft,
} from 'lucide-react';
import '../intro.css';

const systems = [
  {
    icon: Monitor,
    name: 'MES',
    subtitle: 'Manufacturing Execution',
    detail: 'Output · WIP · OEE',
    connector: 1,
  },
  {
    icon: Database,
    name: 'ERP',
    subtitle: 'Enterprise Resource Planning',
    detail: 'Orders · Materials · Finance',
    connector: 2,
  },
  {
    icon: Server,
    name: 'SCADA',
    subtitle: 'Supervisory Control',
    detail: 'Equipment · Sensors · Power',
    connector: 3,
  },
  {
    icon: Cloud,
    name: 'IoT Cloud',
    subtitle: 'Industrial IoT Platform',
    detail: 'Connect · Collect · Analyze',
    connector: 4,
  },
];

function TiltIntegrationCard({
  children,
  index,
}: {
  children: React.ReactNode;
  index: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((e: React.MouseEvent) => {
    const card = cardRef.current;
    if (!card) return;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const tiltX = (y - 0.5) * -8;
    const tiltY = (x - 0.5) * 8;
    (card.querySelector('.tilt-inner') as HTMLElement)?.style.setProperty(
      'transform', `perspective(600px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`
    );
  }, []);

  const handleLeave = useCallback(() => {
    (cardRef.current?.querySelector('.tilt-inner') as HTMLElement)?.style.setProperty(
      'transform', 'perspective(600px) rotateX(0deg) rotateY(0deg)'
    );
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className="integration-card group relative rounded-xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl"
    >
      <div className="tilt-inner transition-[transform] duration-200 ease-out">
        {children}
      </div>
      {/* Top accent line */}
      <div className="absolute inset-x-0 top-0 h-0.5 rounded-t-xl bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 transition-all duration-300 group-hover:opacity-100" />
    </div>
  );
}

export function IntegrationSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const prefersReduced = useReducedMotion();

  return (
    <section
      ref={ref}
      className="relative w-full px-6 py-28 sm:px-8 lg:px-12"
    >
      {/* Ambient gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(99,102,241,0.015)_0%,_transparent_60%)] pointer-events-none" />

      <div className="relative mx-auto max-w-5xl">
        {/* Section label */}
        <motion.p
          initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-3 text-center text-[10px] font-bold tracking-[0.25em] text-blue-400"
        >
          — ECOSYSTEM —
        </motion.p>

        {/* Heading */}
        <motion.h2
          initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="mb-4 text-center text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl"
        >
          Connected <span className="gradient-text">Ecosystem</span>
        </motion.h2>

        {/* Description */}
        <motion.p
          initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-auto mb-14 max-w-2xl text-center text-sm leading-relaxed text-gray-500 dark:text-gray-400"
        >
          NC MEMS serves as the central hub, enabling bi-directional data sync with every enterprise system in your facility.
        </motion.p>

        {/* Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {systems.map((sys, i) => (
            <motion.div
              key={sys.name}
              initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.95 }}
              animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
              transition={{ duration: 0.4, delay: 0.15 + i * 0.08 }}
            >
              <TiltIntegrationCard index={i}>
                {/* Icon */}
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                  <sys.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>

                {/* Name */}
                <h3 className="mb-0.5 text-base font-semibold text-gray-900 dark:text-white">
                  {sys.name}
                </h3>

                {/* Subtitle */}
                <p className="mb-2 text-[11px] text-gray-400 dark:text-gray-500">
                  {sys.subtitle}
                </p>

                {/* Detail */}
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {sys.detail}
                </p>

                {/* Connector */}
                <div className="mt-3 flex items-center gap-1.5 text-[10px] text-blue-400">
                  <ArrowRightLeft className="h-3 w-3" />
                  <span>bi-directional</span>
                </div>
              </TiltIntegrationCard>
            </motion.div>
          ))}
        </div>

        {/* Tech note */}
        <motion.p
          initial={prefersReduced ? { opacity: 0 } : { opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-8 text-center text-[11px] text-gray-400 dark:text-gray-600"
        >
          REST API · WebSocket · RabbitMQ · PostgreSQL · Real-time sync
        </motion.p>
      </div>
    </section>
  );
}

export function IntegrationSectionWithDivider() {
  return (
    <>
      <IntegrationSection />
      <div className="section-divider mx-auto max-w-4xl" />
    </>
  );
}
