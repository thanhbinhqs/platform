# NC MEMS Intro / Landing Page Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build a visually stunning intro/landing page for the NC MEMS centralized management system — introducing Jig, Part management and MES/ERP enterprise integration — with rich animation effects, integrated into the existing portal-web React SPA.

**Architecture:** The intro page sits as a **public route** at `/intro` (or `/` root, alongside the existing public auth routes). It uses Framer Motion for orchestrated scroll/entry animations, pure CSS + Tailwind for micro-interactions, and a lightweight particle/glow canvas effect. The page is lazy-loaded and requires no authentication. The NestJS API optionally serves hero/SVG assets and system metadata via a simple `GET /api/v1/system/info` endpoint.

**Tech Stack:** React 19, React Router v7, Tailwind CSS v4, Framer Motion 11, Vite 6, NestJS 11 (backend for system info).

---

## Current Context / Assumptions

- `apps/portal-web/src/App.tsx` — All routes defined here. Currently `/login`, `/forgot-password`, `/reset-password` are public; all others protected behind `ProtectedRoute` + `DashboardLayout`.
- `apps/portal-web/src/styles/globals.css` — Tailwind v4 import with brand theme (`--color-primary: #1a4a8a`).
- `apps/portal-web/src/pages/login.tsx` — Existing public page pattern (no layout wrapper, no `ProtectedRoute`).
- NestJS API at `apps/api/src/` — Has `AppModule` with `AppController`. We'll add a system info endpoint.
- No Framer Motion installed yet. Already using: `react-router-dom v7`, `lucide-react`, `@tanstack/react-query`, `zustand`.
- The `nc-mems-app/` directory contains a **mobile-first** HTML prototype (phone-frame UI) with card-based navigation for Jig, Part, ESD, Production — this is the mobile app design language we can draw inspiration from, not the web intro page.

---

## Proposed Approach

1. **Public route `/`** — Repurpose the root path as the intro page. If user is already authenticated, redirect to `/dashboard` (the current `/` becomes a dashboard index with a new path). If unauthenticated, show the intro. This preserves bookmarks.
2. **Framer Motion** — Add `framer-motion` to portal-web for scroll-triggered animations, stagger children, fade/slide/parallax.
3. **Three visual sections**: Hero (full-viewport, animated), Features (grid with staggered reveals), System Integration (MES/ERP connectors with diagram).
4. **Particle background** — Pure Canvas/TS utility class, no extra dependency. Renders subtle floating particles + connection lines.
5. **Backend** — Minimal `GET /api/v1/system/info` returning system name, version, description, module list. Allows the intro to be data-driven.
6. **No extra 3rd-party animation libs** — Canvas particles are < 100 LOC hand-written. Framer Motion is the only new runtime dep.

---

## Step-by-Step Plan

### Task 1: Add Framer Motion dependency

**Objective:** Install framer-motion in portal-web package

**Files:**
- Modify: `apps/portal-web/package.json`

**Step 1: Install**

Run:
```bash
cd /home/binh/platform
pnpm --filter @platform/portal-web add framer-motion
```
Expected: added to `apps/portal-web/package.json` dependencies.

**Step 2: Verify import**

Read `apps/portal-web/package.json` after install to confirm `"framer-motion": "^11.x.x"` present.

**Commit:**
```bash
cd /home/binh/platform
git add apps/portal-web/package.json pnpm-lock.yaml
git commit -m "feat(portal-web): add framer-motion for intro animations"
```

---

### Task 2: Create particle background utility

**Objective:** Write a reusable canvas-based particle system class (zero deps)

**Files:**
- Create: `apps/portal-web/src/lib/particles.ts`

**Step 1: Write class**

```typescript
// apps/portal-web/src/lib/particles.ts

interface ParticleOptions {
  count?: number;
  color?: string;
  linkColor?: string;
  linkDistance?: number;
  speed?: number;
  sizeRange?: [number, number];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
}

export class ParticleBackground {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private animId: number = 0;
  private opts: Required<ParticleOptions>;
  private running = false;

  private static DEFAULTS: Required<ParticleOptions> = {
    count: 80,
    color: '#1a4a8a',
    linkColor: '#1a4a8a',
    linkDistance: 150,
    speed: 0.3,
    sizeRange: [1, 3],
  };

  constructor(canvas: HTMLCanvasElement, options?: ParticleOptions) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.opts = { ...ParticleBackground.DEFAULTS, ...options };
  }

  start() {
    this.running = true;
    this.resize();
    window.addEventListener('resize', this.resize);
    this.init();
    this.animate();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.animId);
    window.removeEventListener('resize', this.resize);
  }

  private resize = () => {
    this.canvas.width = this.canvas.offsetWidth * devicePixelRatio;
    this.canvas.height = this.canvas.offsetHeight * devicePixelRatio;
    this.ctx.scale(devicePixelRatio, devicePixelRatio);
  };

  private init() {
    const w = this.canvas.offsetWidth;
    const h = this.canvas.offsetHeight;
    this.particles = Array.from({ length: this.opts.count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * this.opts.speed,
      vy: (Math.random() - 0.5) * this.opts.speed,
      size: this.opts.sizeRange[0] + Math.random() * (this.opts.sizeRange[1] - this.opts.sizeRange[0]),
      opacity: 0.3 + Math.random() * 0.5,
    }));
  }

  private animate = () => {
    if (!this.running) return;
    this.ctx.clearRect(0, 0, this.canvas.offsetWidth, this.canvas.offsetHeight);
    const w = this.canvas.offsetWidth;
    const h = this.canvas.offsetHeight;

    // Update positions
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
    }

    // Draw links
    this.ctx.strokeStyle = this.opts.linkColor;
    this.ctx.lineWidth = 0.5;
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < this.opts.linkDistance) {
          this.ctx.globalAlpha = 1 - dist / this.opts.linkDistance;
          this.ctx.beginPath();
          this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
          this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
          this.ctx.stroke();
        }
      }
    }

    // Draw particles
    this.ctx.globalAlpha = 1;
    for (const p of this.particles) {
      this.ctx.fillStyle = this.opts.color;
      this.ctx.globalAlpha = p.opacity;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.animId = requestAnimationFrame(this.animate);
  };
}
```

**Step 2: Verification**

Run `cd /home/binh/platform/apps/portal-web && npx tsc --noEmit src/lib/particles.ts` to ensure types pass.

**Commit:**
```bash
cd /home/binh/platform
git add apps/portal-web/src/lib/particles.ts
git commit -m "feat(portal-web): add particle background canvas utility"
```

---

### Task 3: Add backend system-info endpoint

**Objective:** Expose `GET /api/v1/system/info` for the intro page to consume

**Files:**
- Create: `apps/api/src/system/system.module.ts`
- Create: `apps/api/src/system/system.controller.ts`
- Create: `apps/api/src/system/dto/system-info.dto.ts`
- Modify: `apps/api/src/app.module.ts` (register SystemModule)

**Step 1: Create DTO**

```typescript
// apps/api/src/system/dto/system-info.dto.ts
export class SystemInfoDto {
  name: string;
  version: string;
  description: string;
  modules: { name: string; description: string; icon: string }[];
}
```

**Step 2: Create controller**

```typescript
// apps/api/src/system/system.controller.ts
import { Controller, Get } from '@nestjs/common';
import { SystemInfoDto } from './dto/system-info.dto';

@Controller('system')
export class SystemController {
  @Get('info')
  getInfo(): SystemInfoDto {
    return {
      name: 'NC MEMS Centralized Management System',
      version: '1.0.0',
      description:
        'Hệ thống quản lý tập trung dành cho NC MEMS — quản lý Jig, Part, kết nối dữ liệu với MES, ERP và các enterprise system.',
      modules: [
        { name: 'Jig Management', description: 'Quản lý vòng đời Jig — tracking, bảo trì, kiểm định', icon: 'wrench' },
        { name: 'Part Management', description: 'Quản lý linh kiện — tồn kho, traceability, BOM', icon: 'package' },
        { name: 'MES Integration', description: 'Đồng bộ sản lượng, WIP, OEE với Manufacturing Execution System', icon: 'factory' },
        { name: 'ERP Integration', description: 'Kết nối SAP/Oracle — đơn hàng, vật tư, tài chính', icon: 'building' },
        { name: 'ESD Control', description: 'Giám sát thiết bị chống tĩnh điện — cảnh báo realtime', icon: 'zap' },
        { name: 'Quality Assurance', description: 'Kiểm soát chất lượng — checklist, non-conformance, CAPA', icon: 'check-circle' },
      ],
    };
  }
}
```

**Step 3: Create module**

```typescript
// apps/api/src/system/system.module.ts
import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';

@Module({
  controllers: [SystemController],
})
export class SystemModule {}
```

**Step 4: Register in AppModule**

```typescript
// apps/api/src/app.module.ts — register SystemModule
import { SystemModule } from './system/system.module';

@Module({
  imports: [
    SystemModule,
    // ... existing imports
  ],
})
```

**Step 5: Verify**

Run `cd /home/binh/platform && pnpm --filter @platform/api dev` and test:
```bash
curl http://localhost:3000/api/v1/system/info | jq .
```
Expected: JSON with name, version, description, modules array.

**Commit:**
```bash
cd /home/binh/platform
git add apps/api/src/system/ apps/api/src/app.module.ts
git commit -m "feat(api): add GET /system/info endpoint for intro page"
```

---

### Task 4: Create Hero section component

**Objective:** Build full-viewport hero with animated tagline, CTA, and particle background

**Files:**
- Create: `apps/portal-web/src/pages/intro/sections/hero-section.tsx`
- Create: `apps/portal-web/src/pages/intro/intro.css` (custom keyframes + scrollbar)

**Step 1: Write the CSS**

```css
/* apps/portal-web/src/pages/intro/intro.css */

/* ─── Global intro overrides ─── */
.intro-page {
  scroll-behavior: smooth;
}

.intro-page::-webkit-scrollbar { width: 6px; }
.intro-page::-webkit-scrollbar-track { background: transparent; }
.intro-page::-webkit-scrollbar-thumb { background: rgba(26, 74, 138, 0.3); border-radius: 3px; }

/* ─── Hero ─── */
.hero-gradient {
  background: linear-gradient(
    135deg,
    #0a1628 0%,
    #142850 30%,
    #1a4a8a 60%,
    #0d3b66 100%
  );
}

.hero-glow {
  position: absolute;
  width: 600px;
  height: 600px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(26, 74, 138, 0.15) 0%, transparent 70%);
  filter: blur(60px);
  pointer-events: none;
}

.hero-glow:nth-child(1) { top: -10%; left: -5%; }
.hero-glow:nth-child(2) { bottom: -10%; right: -5%; }

/* ─── Floating micro-interactions ─── */
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.animate-float { animation: float 4s ease-in-out infinite; }
.animate-float-delayed { animation: float 5s ease-in-out infinite; animation-delay: 1s; }

/* ─── Feature cards ─── */
.feature-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(26, 74, 138, 0.12);
}

/* ─── Integration diagram ─── */
.integration-line {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: dash-draw 2s ease forwards;
}

@keyframes dash-draw {
  to { stroke-dashoffset: 0; }
}
```

**Step 2: Write Hero component**

```tsx
// apps/portal-web/src/pages/intro/sections/hero-section.tsx
import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { ParticleBackground } from '@/lib/particles';
import '../intro.css';

export function HeroSection({ onExplore }: { onExplore: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<ParticleBackground | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      particlesRef.current = new ParticleBackground(canvasRef.current, {
        count: 60,
        color: '#ffffff',
        linkColor: 'rgba(255,255,255,0.15)',
        linkDistance: 120,
      });
      particlesRef.current.start();
    }
    return () => particlesRef.current?.stop();
  }, []);

  return (
    <section className="hero-gradient relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden text-white">
      {/* Glow orbs */}
      <div className="hero-glow" />
      <div className="hero-glow" />

      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <span className="mb-4 inline-block rounded-full border border-white/20 bg-white/5 px-4 py-1 text-xs font-medium uppercase tracking-widest text-blue-200 backdrop-blur-sm">
            NC MEMS · Centralized Management Platform
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
          className="mb-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
        >
          Hệ Thống Quản Lý{' '}
          <span className="bg-gradient-to-r from-blue-300 to-cyan-200 bg-clip-text text-transparent">
            Tập Trung
          </span>{' '}
          NC MEMS
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
          className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-blue-100/80 sm:text-xl"
        >
          Quản lý Jig, Part, kết nối dữ liệu thời gian thực với{' '}
          <strong className="text-white">MES</strong>,{' '}
          <strong className="text-white">ERP</strong> và các hệ thống
          enterprise — tối ưu vận hành sản xuất.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: 'easeOut' }}
          className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
        >
          <button
            onClick={onExplore}
            className="group inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-[#1a4a8a] shadow-lg shadow-blue-900/30 transition-all hover:bg-blue-50 hover:shadow-xl active:scale-95"
          >
            Khám Phá Ngay
            <ArrowRight
              size={18}
              className="transition-transform group-hover:translate-x-1"
            />
          </button>
          <button
            onClick={() => window.location.href = '/login'}
            className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-8 py-3.5 text-base font-medium text-white/90 backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/50"
          >
            Đăng Nhập
          </button>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-16 grid grid-cols-3 gap-8 border-t border-white/10 pt-8"
        >
          {[
            { value: '50K+', label: 'Jigs Managed' },
            { value: '500K+', label: 'Parts Tracked' },
            { value: '99.9%', label: 'Uptime SLA' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold text-white sm:text-3xl">
                {stat.value}
              </div>
              <div className="mt-1 text-xs text-blue-200/60 sm:text-sm">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce"
      >
        <ChevronDown className="h-6 w-6 text-white/50" />
      </motion.div>
    </section>
  );
}
```

**Step 3: Verify no TypeScript errors**

Run `cd /home/binh/platform/apps/portal-web && npx tsc --noEmit` and fix any path/import issues.

**Commit:**
```bash
cd /home/binh/platform
git add apps/portal-web/src/pages/intro/ \
       apps/portal-web/src/styles/globals.css
git commit -m "feat(portal-web): add hero section component with particle bg"
```

---

### Task 5: Create Features section component

**Objective:** Build the feature grid with stagger-reveal cards showing Jig, Part, MES, ERP, ESD, QA modules

**Files:**
- Create: `apps/portal-web/src/pages/intro/sections/features-section.tsx`

**Step 1: Write component**

```tsx
// apps/portal-web/src/pages/intro/sections/features-section.tsx
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Wrench,
  Package,
  Factory,
  Building2,
  Zap,
  CheckCircle2,
} from 'lucide-react';

const modules = [
  { name: 'Jig Management', desc: 'Quản lý vòng đời Jig — tracking, bảo trì, kiểm định định kỳ. Tự động cảnh báo khi đến hạn.', icon: Wrench, color: 'bg-blue-50 text-blue-600' },
  { name: 'Part Management', desc: 'Quản lý linh kiện — tồn kho, traceability, BOM. Dễ dàng truy xuất nguồn gốc.', icon: Package, color: 'bg-emerald-50 text-emerald-600' },
  { name: 'MES Integration', desc: 'Đồng bộ sản lượng, WIP, OEE với Manufacturing Execution System theo thời gian thực.', icon: Factory, color: 'bg-orange-50 text-orange-600' },
  { name: 'ERP Integration', desc: 'Kết nối SAP, Oracle — đồng bộ đơn hàng, vật tư, tài chính hai chiều.', icon: Building2, color: 'bg-purple-50 text-purple-600' },
  { name: 'ESD Control', desc: 'Giám sát thiết bị chống tĩnh điện — cảnh báo realtime khi phát hiện bất thường.', icon: Zap, color: 'bg-amber-50 text-amber-600' },
  { name: 'Quality Assurance', desc: 'Kiểm soát chất lượng — checklist số, non-conformance, CAPA, báo cáo tự động.', icon: CheckCircle2, color: 'bg-rose-50 text-rose-600' },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

export function FeaturesSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section
      ref={ref}
      className="relative w-full bg-white px-4 py-24 sm:px-6 lg:px-8"
    >
      {/* Background accent */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-blue-50/50 to-white" />

      <div className="relative mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">
            Tính Năng Cốt Lõi
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-500">
            Hệ thống quản lý tập trung tích hợp đầy đủ các module nghiệp vụ,
            từ quản lý Jig, Part đến kết nối doanh nghiệp.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <motion.div
                key={mod.name}
                variants={cardVariants}
                className="feature-card group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
              >
                {/* Hover accent bar */}
                <div className="absolute inset-x-0 top-0 h-0.5 bg-primary scale-x-0 transition-transform duration-300 group-hover:scale-x-100" />

                <div
                  className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${mod.color}`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  {mod.name}
                </h3>
                <p className="text-sm leading-relaxed text-gray-500">
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
```

**Step 2: Verify** — `npx tsc --noEmit` in portal-web.

**Commit:**
```bash
git add apps/portal-web/src/pages/intro/sections/features-section.tsx
git commit -m "feat(portal-web): add feature cards section with stagger animation"
```

---

### Task 6: Create Integration diagram section

**Objective:** Visual diagram showing NC MEMS in the middle connecting to MES, ERP, and other enterprise systems

**Files:**
- Create: `apps/portal-web/src/pages/intro/sections/integration-section.tsx`

**Step 1: Write component**

```tsx
// apps/portal-web/src/pages/intro/sections/integration-section.tsx
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Database, Cloud, Monitor, Server, ArrowRightLeft } from 'lucide-react';

const systems = [
  { label: 'MES', icon: Monitor, desc: 'Manufacturing Execution System' },
  { label: 'ERP', icon: Database, desc: 'SAP / Oracle / Microsoft' },
  { label: 'SCADA', icon: Server, desc: 'Real-time Data Acquisition' },
  { label: 'IoT Cloud', icon: Cloud, desc: 'Device & Sensor Platform' },
];

export function IntegrationSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section
      ref={ref}
      className="relative w-full bg-gray-50 px-4 py-24 sm:px-6 lg:px-8"
    >
      <div className="relative mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">
            Kết Nối Doanh Nghiệp
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-500">
            NC MEMS đóng vai trò trung tâm kết nối, đồng bộ dữ liệu hai chiều
            với toàn bộ hệ thống enterprise.
          </p>
        </motion.div>

        {/* Center hub + orbiting systems */}
        <div className="relative flex flex-col items-center justify-center">
          {/* Center node */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={inView ? { scale: 1, opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.2, type: 'spring', stiffness: 100 }}
            className="z-10 mb-16 flex h-24 w-24 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-blue-200 sm:h-28 sm:w-28"
          >
            <div className="text-center text-white">
              <div className="text-xs font-bold uppercase tracking-wider">NC</div>
              <div className="text-base font-extrabold">MEMS</div>
            </div>
          </motion.div>

          {/* Connected systems */}
          <div className="grid w-full max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {systems.map((sys, idx) => {
              const Icon = sys.icon;
              return (
                <motion.div
                  key={sys.label}
                  initial={{ opacity: 0, y: 30 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.4 + idx * 0.15 }}
                  className="relative flex flex-col items-center rounded-2xl border bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/20"
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-gray-900">{sys.label}</div>
                    <div className="mt-1 text-xs text-gray-400">{sys.desc}</div>
                  </div>
                  {/* Connector dot */}
                  <div className="absolute -top-2 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-blue-300" />
                </motion.div>
              );
            })}
          </div>

          {/* Connector lines (CSS) */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 1200 600"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <motion.path
              d="M600,80 L600,140"
              stroke="#1a4a8a"
              strokeWidth="2"
              strokeDasharray="8 4"
              initial={{ pathLength: 0 }}
              animate={inView ? { pathLength: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.5 }}
            />
          </svg>
        </div>

        {/* Integration features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 1 }}
          className="mt-16 grid gap-6 sm:grid-cols-3"
        >
          {[
            { title: 'Real-time Sync', desc: 'Đồng bộ dữ liệu qua REST API & WebSocket — phản hồi trong milliseconds' },
            { title: 'Message Queue', desc: 'Kiến trúc event-driven với RabbitMQ — đảm bảo không mất dữ liệu' },
            { title: 'Audit Trail', desc: 'Ghi lại toàn bộ thay đổi — traceability đáp ứng tiêu chuẩn ISO' },
          ].map((feat) => (
            <div key={feat.title} className="rounded-xl border bg-white p-5 text-center shadow-sm">
              <div className="mb-2 text-sm font-bold text-primary">{feat.title}</div>
              <p className="text-sm text-gray-500">{feat.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
```

**Step 2: Verify** — `npx tsc --noEmit`.

**Commit:**
```bash
git add apps/portal-web/src/pages/intro/sections/integration-section.tsx
git commit -m "feat(portal-web): add enterprise integration diagram section"
```

---

### Task 7: Create CTA / Footer section

**Objective:** Bottom call-to-action section with login prompt and branding

**Files:**
- Create: `apps/portal-web/src/pages/intro/sections/cta-section.tsx`

**Step 1: Write**

```tsx
// apps/portal-web/src/pages/intro/sections/cta-section.tsx
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export function CtaSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true });

  return (
    <section ref={ref} className="relative w-full bg-primary px-4 py-20 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-white/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.6 }}
        className="relative mx-auto max-w-3xl text-center"
      >
        <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
          Sẵn Sàng Quản Lý Tập Trung?
        </h2>
        <p className="mb-8 text-lg text-blue-100/80">
          Đăng nhập để bắt đầu quản lý Jig, Part và kết nối với hệ thống
          enterprise của bạn.
        </p>
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <button
            onClick={() => window.location.href = '/login'}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-primary shadow-lg transition-all hover:bg-blue-50 active:scale-95"
          >
            Đăng Nhập Ngay
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => window.location.href = '/forgot-password'}
            className="inline-flex items-center justify-center rounded-xl border border-white/30 px-8 py-3.5 text-base font-medium text-white/90 backdrop-blur-sm transition-all hover:bg-white/10"
          >
            Quên Mật Khẩu?
          </button>
        </div>
      </motion.div>

      {/* Footer bar */}
      <div className="relative mx-auto mt-16 max-w-5xl border-t border-white/10 pt-6 text-center text-xs text-blue-200/60">
        &copy; {new Date().getFullYear()} NC MEMS. All rights reserved. |
        Built with NestJS & React | Powered by Samsung Gauss AI
      </div>
    </section>
  );
}
```

**Verify + commit** after each.

---

### Task 8: Create the IntroPage component (orchestrator)

**Objective:** Compose all sections into a single `IntroPage`, added as a public route in App.tsx

**Files:**
- Create: `apps/portal-web/src/pages/intro/intro-page.tsx`
- Modify: `apps/portal-web/src/App.tsx`

**Step 1: Write IntroPage**

```tsx
// apps/portal-web/src/pages/intro/intro-page.tsx
import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@platform/hooks';
import { HeroSection } from './sections/hero-section';
import { FeaturesSection } from './sections/features-section';
import { IntegrationSection } from './sections/integration-section';
import { CtaSection } from './sections/cta-section';

export function IntroPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const featuresRef = useRef<HTMLDivElement>(null);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleExplore = () => {
    const el = document.querySelector('.intro-page');
    el?.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
  };

  return (
    <div className="intro-page h-screen w-screen overflow-y-auto overflow-x-hidden bg-white">
      <HeroSection onExplore={handleExplore} />
      <div ref={featuresRef}>
        <FeaturesSection />
      </div>
      <IntegrationSection />
      <CtaSection />
    </div>
  );
}
```

**Step 2: Modify App.tsx — add public intro route**

Primary change: make `/` the intro page when unauthenticated. Move the current protected index route (dashboard) to a different element:

```tsx
// In App.tsx:
// Add import:
import { IntroPage } from './pages/intro/intro-page';

// In Routes, BEFORE the protected layout:
<Route path="/" element={<IntroPage />} />
// Keep the protected routes as they are (they already check auth via ProtectedRoute)
```

**Important:** Since `/` is now used by the intro, the dashboard should stay under the protected layout (which already has `index` route). But the intro page and the dashboard layout both try to match `/`. We need to adjust:

Option A: Make intro page its own route, e.g., `/intro` (simpler, less disruptive).
Option B: Conditionally render intro vs dashboard at `/` based on auth state.

**Recommended: Option B** — Keep `/` smart: show intro for unauthenticated, show dashboard for authenticated. This is done by moving the intro check to App.tsx:

```tsx
// Revised approach in App.tsx:
function AppContent() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) return <LoadingScreen />;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="portal-theme">
        <BrowserRouter>
          <Routes>
            {/* Public routes — always accessible */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Root: intro if unauthenticated, dashboard if authenticated */}
            <Route
              path="/"
              element={
                isAuthenticated ? (
                  <ProtectedRoute>
                    <ErrorBoundary>
                      <DashboardLayout />
                    </ErrorBoundary>
                  </ProtectedRoute>
                ) : (
                  <IntroPage />
                )
              }
            >
              {/* Dashboard child routes only when authenticated */}
              {isAuthenticated && (
                <>
                  <Route index element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />
                  <Route path="users" element={<Suspense fallback={<PageLoader />}><UsersPage /></Suspense>} />
                  {/* ... all other protected routes */}
                </>
              )}
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

> **Caveat:** React Router v7 doesn't support conditional children well. A simpler approach: keep the intro as a separate route. Change the root `/` to always render `<IntroPage />`, and inside IntroPage redirect if authenticated. But then dashboard is at `/dashboard`? No — that breaks existing links.

**Simplest correct approach:**
- Keep existing protected layout at `/` as-is.
- Add intro at `/intro` as a separate public route.
- The `<ProtectedRoute>` already guards the dashboard children.
- On the login page, add a link to `/intro`.
- In `SiteHeader`, add "About" / "Intro" link for unauthenticated users.
- If user visits `/` unauthenticated, they'll hit `ProtectedRoute` which redirects to `/login`. From login they can see the intro link.

**Revised simpler plan:**
- Route `/intro` — public, no auth required
- The existing `/` stays as-is (protected, requires auth, redirects to login)
- Inside login page, add a subtle "About NC MEMS" link to `/intro`

This is much safer and avoids touching the complex routing logic.

```tsx
// In App.tsx, add before the protected routes:
<Route path="/intro" element={<Suspense fallback={<PageLoader />}><IntroPage /></Suspense>} />
```

**Step 3: Update login page** — add a small text link at bottom "Về hệ thống NC MEMS"

```tsx
// In login.tsx, under the forgot-password link:
<div className="mt-4 text-center text-xs text-muted-foreground">
  <Link to="/intro" className="hover:text-primary transition-colors">
    Về hệ thống NC MEMS
  </Link>
</div>
```

**Step 4: Verify** — navigate to `/intro` in browser. Check scrolling, animations, CTA links.

**Commit:**
```bash
git add apps/portal-web/src/pages/intro/intro-page.tsx apps/portal-web/src/App.tsx apps/portal-web/src/pages/login.tsx
git commit -m "feat(portal-web): add intro page at /intro with login-page link"
```

---

### Task 9: Verification & polish

**Objective:** End-to-end verification of the intro page, animations, responsive layout

**Files:**
- None (read-only checks)

**Steps:**

1. Start both backend and frontend:
```bash
cd /home/binh/platform
# Terminal 1:
pnpm --filter @platform/api dev
# Terminal 2:
pnpm --filter @platform/portal-web dev
```

2. Open `http://localhost:3001/intro` — verify:
   - Hero section: gradient background loads, particle canvas animates, text animations play, scroll indicator shows
   - Features section scrolls into view with stagger animation
   - Integration section shows with connected system cards
   - CTA section renders with buttons
   - Footer text visible

3. Test responsive: resize to 375px (mobile) — sections stack, text scales, buttons wrap

4. Test CTA links:
   - "Khám Phá Ngay" scrolls to features
   - "Đăng Nhập Ngay" / "Đăng Nhập" navigates to `/login`
   - "Về hệ thống NC MEMS" on login page navigates to `/intro`

5. Test authenticated redirect: login, then navigate to `/intro` — should stay on dashboard/root

6. Lint:
```bash
cd /home/binh/platform/apps/portal-web && pnpm lint
```

7. Build:
```bash
cd /home/binh/platform && pnpm --filter @platform/portal-web build
```

---

## Files That Will Change

| Action | File | Description |
|--------|------|-------------|
| Create | `apps/portal-web/src/lib/particles.ts` | Canvas particle background utility |
| Create | `apps/portal-web/src/pages/intro/intro-page.tsx` | Intro page orchestrator |
| Create | `apps/portal-web/src/pages/intro/intro.css` | Intro page custom styles |
| Create | `apps/portal-web/src/pages/intro/sections/hero-section.tsx` | Hero with particle background |
| Create | `apps/portal-web/src/pages/intro/sections/features-section.tsx` | Feature card grid |
| Create | `apps/portal-web/src/pages/intro/sections/integration-section.tsx` | System integration diagram |
| Create | `apps/portal-web/src/pages/intro/sections/cta-section.tsx` | Call-to-action + footer |
| Create | `apps/api/src/system/system.module.ts` | System module (NestJS) |
| Create | `apps/api/src/system/system.controller.ts` | System info endpoint |
| Create | `apps/api/src/system/dto/system-info.dto.ts` | System info DTO |
| Modify | `apps/portal-web/package.json` | Add framer-motion dep |
| Modify | `apps/portal-web/src/App.tsx` | Add `/intro` route |
| Modify | `apps/portal-web/src/pages/login.tsx` | Add link to intro page |
| Modify | `apps/api/src/app.module.ts` | Register SystemModule |

---

## Tests / Validation

1. **TypeScript check:** `npx tsc --noEmit` in `apps/portal-web/`
2. **Lint:** `pnpm --filter @platform/portal-web lint`
3. **Build:** `pnpm --filter @platform/portal-web build`
4. **Backend:** `curl http://localhost:3000/api/v1/system/info` returns valid JSON
5. **E2E (manual):** Visual check of all intro sections, animations, responsive breakpoints, CTA navigation

---

## Risks, Tradeoffs, and Open Questions

| Risk | Mitigation |
|------|-----------|
| **Canvas particle performance on low-end mobile** | Particle count capped at 60; add `devicePixelRatio` clamp; consider disabling canvas on devices with < 4GB RAM via `navigator.deviceMemory` |
| **Framer Motion bundle size (~35KB gzip)** | Only added to portal-web package; lazy-loaded intro page ensures it's not in the main dashboard bundle |
| **Route conflict: `/` vs `/intro`** | Mitigated by using distinct `/intro` path; existing `/` remains protected as before |
| **SEO: intro page not easily discoverable** | Add `<meta>` tags and Open Graph in `index.html` + document title per route; consider SSR future |
| **Backend endpoint unused if cached** | Acceptable; the data is static and consumed only once per session; can hardcode fallback in frontend |

**Open questions:**
1. Should the intro page be the **actual root** `/` (public) and dashboard moved to `/dashboard`? This would be a cleaner UX but requires updating all existing nav links and bookmarks.
2. Do you want additional animation flourishes (SVG morph, Lottie, 3D tilt on cards)?
3. Should the intro be available in both Vietnamese and English?

---

## Execution Handoff

**Plan complete and saved. Ready to execute using subagent-driven-development — I'll dispatch a fresh subagent per task with two-stage review (spec compliance then code quality). Shall I proceed?**
