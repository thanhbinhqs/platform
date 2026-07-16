import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Code2, Cpu, Shield } from 'lucide-react';

const techStack = [
  { icon: Code2, label: 'NestJS + React' },
  { icon: Cpu, label: 'TypeScript' },
  { icon: Shield, label: 'Samsung Gauss AI' },
];

export function VersionFooterSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true });
  const prefersReduced = useReducedMotion();
  const year = new Date().getFullYear();

  return (
    <section
      ref={ref}
      className="w-full border-t border-gray-100 bg-white px-6 py-16 dark:border-gray-800 dark:bg-gray-950 sm:px-8 lg:px-12"
    >
      <div className="mx-auto max-w-4xl text-center">
        {/* Version info */}
        <motion.div
          initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <span className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-xs font-mono text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              v2.1.0
            </span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            Build {year}.07.14
            <span className="text-gray-300 dark:text-gray-600">|</span>
            130K+ lines of code
          </span>
        </motion.div>

        {/* Tech stack badges */}
        <motion.div
          initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-10 flex items-center justify-center gap-6 text-xs text-gray-400 dark:text-gray-500"
        >
          {techStack.map((tech) => {
            const Icon = tech.icon;
            return (
              <span
                key={tech.label}
                className="inline-flex items-center gap-1.5"
              >
                <Icon className="h-3.5 w-3.5" />
                {tech.label}
              </span>
            );
          })}
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={prefersReduced ? { opacity: 0 } : { opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="pt-8 text-xs text-gray-400 dark:text-gray-600"
        >
          <p>
            &copy; {year} NC MEMS. All rights reserved.
          </p>
          <p className="mt-1">
            Built with{' '}
            <span className="font-medium text-gray-500 dark:text-gray-400">
              NestJS
            </span>{' '}
            &amp;{' '}
            <span className="font-medium text-gray-500 dark:text-gray-400">
              React
            </span>{' '}
            | Powered by{' '}
            <span className="font-medium text-gray-500 dark:text-gray-400">
              Samsung Gauss AI
            </span>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
