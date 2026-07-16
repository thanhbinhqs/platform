import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import {
  Wrench,
  Package,
  Factory,
  Building2,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import '../intro.css';

const modules = [
  {
    name: 'Jig Management',
    desc: 'Quản lý vòng đời Jig — tracking, bảo trì, kiểm định định kỳ, tự động cảnh báo.',
    icon: Wrench,
  },
  {
    name: 'Part Management',
    desc: 'Quản lý linh kiện — tồn kho, traceability, BOM, truy xuất nguồn gốc.',
    icon: Package,
  },
  {
    name: 'MES Integration',
    desc: 'Đồng bộ sản lượng, WIP, OEE với Manufacturing Execution System realtime.',
    icon: Factory,
  },
  {
    name: 'ERP Integration',
    desc: 'Kết nối SAP, Oracle — đồng bộ đơn hàng, vật tư, tài chính hai chiều.',
    icon: Building2,
  },
  {
    name: 'ESD Control',
    desc: 'Giám sát thiết bị chống tĩnh điện — cảnh báo realtime khi phát hiện bất thường.',
    icon: Zap,
  },
  {
    name: 'Quality Assurance',
    desc: 'Kiểm soát chất lượng — checklist số, non-conformance, CAPA, báo cáo tự động.',
    icon: CheckCircle2,
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

export function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: '-80px' });
  const prefersReduced = useReducedMotion();

  return (
    <section
      ref={sectionRef}
      className="w-full bg-white px-6 py-24 dark:bg-gray-950 sm:px-8 lg:px-12"
    >
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-16 text-center"
        >
          <span className="mb-3 inline-block text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
            Modules
          </span>
          <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
            Tính Năng{' '}
            <span className="text-blue-600 dark:text-blue-400">Cốt Lõi</span>
          </h2>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-gray-400 dark:text-gray-500">
            Hệ thống quản lý tập trung tích hợp đầy đủ các module nghiệp vụ,
            từ quản lý Jig, Part đến kết nối doanh nghiệp.
          </p>
        </motion.div>

        {/* Cards */}
        <motion.div
          variants={!prefersReduced ? containerVariants : undefined}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <motion.div
                key={mod.name}
                variants={!prefersReduced ? cardVariants : undefined}
                className="feature-card group rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-colors duration-200 group-hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:group-hover:bg-blue-900/50">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 text-base font-semibold text-gray-900 dark:text-white">
                  {mod.name}
                </h3>
                <p className="text-sm leading-relaxed text-gray-400 dark:text-gray-500">
                  {mod.desc}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
