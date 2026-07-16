import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import {
  Rocket,
  BookOpen,
  Github,
  PlayCircle,
  ExternalLink,
} from 'lucide-react';

const actions = [
  {
    label: 'Bắt Đầu',
    desc: 'Đăng nhập và trải nghiệm hệ thống quản lý tập trung.',
    icon: Rocket,
    href: '/login',
    primary: true,
  },
  {
    label: 'Tài Liệu',
    desc: 'Hướng dẫn sử dụng và tài liệu kỹ thuật chi tiết.',
    icon: BookOpen,
    href: '#',
    primary: false,
  },
  {
    label: 'GitHub',
    desc: 'Mã nguồn mở — đóng góp và theo dõi tiến độ phát triển.',
    icon: Github,
    href: 'https://github.com/thanhbinhqs/platform',
    primary: false,
  },
  {
    label: 'Demo',
    desc: 'Xem video giới thiệu các tính năng chính của hệ thống.',
    icon: PlayCircle,
    href: '#',
    primary: false,
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

export function QuickActionsSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const prefersReduced = useReducedMotion();

  return (
    <section
      ref={ref}
      className="w-full bg-gray-50 px-6 py-24 dark:bg-gray-900 sm:px-8 lg:px-12"
    >
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
            Quick Start
          </span>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
            Bắt Đầu{' '}
            <span className="text-blue-600 dark:text-blue-400">Ngay</span>
          </h2>
        </motion.div>

        {/* Action cards */}
        <motion.div
          variants={!prefersReduced ? containerVariants : undefined}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {actions.map((action) => {
            const Icon = action.icon;
            const Comp = action.href.startsWith('http') ? 'a' : 'a';

            return (
              <motion.div
                key={action.label}
                variants={!prefersReduced ? itemVariants : undefined}
              >
                <a
                  href={action.href}
                  {...(action.href.startsWith('http')
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                  className={`action-card group flex h-full flex-col rounded-xl border p-6 text-left transition-all duration-200 ${
                    action.primary
                      ? 'border-blue-600 bg-blue-600 text-white shadow-md hover:bg-blue-700 hover:shadow-lg'
                      : 'border-gray-200 bg-white text-gray-900 shadow-sm hover:border-gray-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:border-gray-600'
                  }`}
                >
                  <div
                    className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ${
                      action.primary
                        ? 'bg-white/20 text-white'
                        : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-1.5 text-base font-semibold">
                    {action.label}
                    {action.href.startsWith('http') && (
                      <ExternalLink className="h-3.5 w-3.5 opacity-50" />
                    )}
                  </div>
                  <p
                    className={`mt-1.5 text-sm leading-relaxed ${
                      action.primary
                        ? 'text-blue-100'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {action.desc}
                  </p>
                </a>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
