# Intro Component — Complete Retrospective Summary

> **Date:** 2026-07-14
> **Project:** NC MEMS Centralized Management Platform (`/home/binh/platform`)
> **App:** `@platform/portal-web` (React + Vite + TypeScript + Tailwind CSS)

---

## 1. Overview

The intro page (`/intro`) là landing page / introduction page cho **NC MEMS Centralized Management System** — một hệ thống quản lý tập trung cho Jig, Part, kết nối MES/ERP. Trang được thiết kế như một public landing page, không yêu cầu auth, redirect về dashboard nếu user đã đăng nhập.

---

## 2. Files Created (6 files)

| File | Path | Dòng | Mục đích |
|------|------|------|----------|
| `intro-page.tsx` | `apps/portal-web/src/pages/intro/` | 37 | Orchestrator component — điều phối các section |
| `intro.css` | `apps/portal-web/src/pages/intro/` | 74 | Global styles, ripple, reduced-motion, scrollbar |
| `hero-section.tsx` | `sections/` | 133 | Hero: dark gradient, particles canvas, CTA, stats |
| `features-section.tsx` | `sections/` | 124 | 6 feature cards: Jig, Part, MES, ERP, ESD, QA |
| `quick-actions-section.tsx` | `sections/` | 144 | 4 action cards: Bắt Đầu, Tài Liệu, GitHub, Demo |
| `version-footer-section.tsx` | `sections/` | 100 | Version v2.1.0, tech stack badges, copyright footer |

### Shared utility

| File | Path | Dòng | Mục đích |
|------|------|------|----------|
| `particles.ts` | `lib/` | 138 | Canvas particle engine (count, speed, link distance configurable) |

---

## 3. Files Modified (2 files)

| File | Thay đổi |
|------|----------|
| `App.tsx` | Thêm route `/intro` → `<IntroPage />` (public, không auth) |
| `login.tsx` | Thêm link `<Link to="/intro">Về hệ thống NC MEMS</Link>` ở cuối form |
| `index.html` | Đổi title từ "Platform Portal" → "NC MEMS - Centralized Management Platform" |

### Files deleted

| File | Lý do |
|------|-------|
| `sections/cta-section.tsx` | Thay thế bằng `quick-actions-section.tsx` + `version-footer-section.tsx` |
| `sections/integration-section.tsx` | Nội dung tích hợp vào `features-section.tsx` + quick-actions |

---

## 4. Component Architecture

```
IntroPage                       # orchestrator, container scroll
├── HeroSection                 # dark gradient, particle canvas, heading, CTA, stats
├── FeaturesSection             # 6 cards grid, stagger entrance, hover lift
├── QuickActionsSection         # 4 action cards (link to login/docs/github/demo)
└── VersionFooterSection        # version badge, tech stack, copyright footer
```

---

## 5. Detailed Section Breakdown

### 5.1 HeroSection (`hero-section.tsx`)

**Layout:** Full viewport (`min-h-screen`), flex centered

**Visual:**
- Dark gradient background (`#0f172a → #1e293b → #172554`)
- Subtle mesh grid overlay (SVG data-uri pattern)
- Canvas particles (40 particles, white, link distance 160px, speed 0.2)
- Radial blue glow (`bg-blue-500/5 blur-[100px]`)
- Pill badge "Centralized Management Platform" with ping dot
- Large heading "NC MEMS" (4xl-7xl responsive)
- Tagline về Jig, Part, MES, ERP
- Stats row: 50K+ Jigs, 500K+ Parts, 99.9% Uptime
- Scroll indicator (animated line)

**CTA Buttons:**
- "Khám Phá Ngay" → scroll down (white bg)
- "GitHub" → external link (border/transparent bg)

**Dark mode:** N/A (hero luôn dark gradient)

### 5.2 FeaturesSection (`features-section.tsx`)

**Layout:** Full width, centered max-w-6xl, 6 cards in 3x2 grid (responsive: 1→2→3 cols)

**Cards (6 modules):**
1. **Jig Management** — vòng đời Jig, tracking, bảo trì, kiểm định
2. **Part Management** — linh kiện, tồn kho, traceability, BOM
3. **MES Integration** — đồng bộ sản lượng, WIP, OEE
4. **ERP Integration** — kết nối SAP, Oracle
5. **ESD Control** — giám sát thiết bị chống tĩnh điện
6. **Quality Assurance** — checklist số, non-conformance, CAPA

**Styling:**
- White cards, rounded-xl, border gray-100, shadow-sm
- Icon trong blue-50 rounded-lg
- Hover: translateY(-4px) + shadow-lg (transition 0.25s)
- Dark: bg-gray-900, border-gray-800, icon blue-900/30

**Animation:**
- Stagger children (0.08s gap)
- Card fade up từ y:24
- `prefers-reduced-motion` disabled

### 5.3 QuickActionsSection (`quick-actions-section.tsx`)

**Layout:** Full width, gray-50 bg, 4 cards in 4-col grid

**Cards:**
1. **Bắt Đầu** (primary blue) → /login
2. **Tài Liệu** → # (placeholder)
3. **GitHub** → external (https://github.com/thanhbinhqs/platform)
4. **Demo** → # (placeholder)

**Styling:**
- Primary card: bg-blue-600, text white, shadow-md
- Others: white bg, border gray-200, shadow-sm
- Hover: translateY(-3px) + shadow
- External link icon cho GitHub

**Animation:**
- Stagger 0.1s, fade up từ y:20

### 5.4 VersionFooterSection (`version-footer-section.tsx`)

**Layout:** Centered, border-t trên cùng

**Content:**
- Version badge: `v2.1.0 | Build 2026.07.14 | 130K+ lines of code`
- Tech stack: NestJS + React, TypeScript, Samsung Gauss AI
- Copyright footer: © 2026 NC MEMS, powered by Samsung Gauss AI

---

## 6. Route Configuration

Trong `App.tsx` (line 67-74):

```tsx
<Route
  path="/intro"
  element={
    <Suspense fallback={<PageLoader />}>
      <IntroPage />
    </Suspense>
  }
/>
```

- Route **public** (không nằm trong `<ProtectedRoute>`)
- **Không lazy-load** (import trực tiếp, không dùng `lazy()`) — load ngay khi app init
- Redirect về `/` nếu `isAuthenticated === true`

---

## 7. Login Page Link

Trong `login.tsx` (line 84-86):

```tsx
<div className="mt-4 text-center">
  <Link to="/intro" className="text-xs text-muted-foreground hover:text-primary transition-colors">
    Về hệ thống NC MEMS
  </Link>
</div>
```

Xuất hiện ngay dưới "Forgot password?" link.

---

## 8. Dependencies

| Dependency | Version | Dùng cho |
|------------|---------|----------|
| `framer-motion` | ^12.x | Scroll-triggered animation, stagger, useReducedMotion |
| `lucide-react` | ^0.x | Icons (Wrench, Package, Factory, Building2, Zap, Rocket, Github, etc.) |
| `@platform/hooks` | workspace | `useAuthStore` (auth check để redirect) |
| `react-router-dom` | ^6.x | `<Link>`, `useNavigate` |

---

## 9. Design Decisions

### 9.1 Heavy Animations → Clean Enterprise (2 iterations)

**Iteration 1 (heavy):**
- Character-by-character reveal text
- Floating 3D cubes with rotation
- Animated gradient background (12s cycle)
- Mouse parallax hero content
- 3D tilt cards (perspective + rotateX)
- SVG animated connection lines
- Ripple buttons (DOM-based)
- Floating particles in CTA
- Pulsing ping effects

→ User feedback: "still ugly, no strong beautiful animations"

**Iteration 2 (current — clean enterprise):**
- Dark gradient tĩnh + subtle mesh overlay
- Particle canvas nhẹ (40 particles, slow)
- Fade-up animations (không 3D)
- Card hover lift nhẹ (translateY -4px)
- Button hover glow (CSS radial-gradient)
- Respect `prefers-reduced-motion`
- Dark mode support qua `dark:` variants
- Clean typography, 8px grid spacing

### 9.2 Dark Mode

Theme system from `@platform/ui` (`ThemeProvider` + `useTheme`). Uses class-based dark mode (`dark:` prefix in Tailwind). All sections support dark mode except Hero (always dark).

### 9.3 Accessibility

- `useReducedMotion()` — tắt animation khi user prefers reduced motion
- Keyboard navigation (native `<a>` links)
- Semantic headings (h1 → h2 → h3)

### 9.4 Performance

- Canvas particles dùng `requestAnimationFrame`, tự động cleanup
- `will-change: transform` cho feature cards
- CSS transitions (transform/opacity only) — GPU accelerated
- `once: true` trong `useInView` — chỉ animate 1 lần

---

## 10. Dev Server Configuration

| Config | Giá trị |
|--------|---------|
| Port | 3001 |
| Host | 0.0.0.0 (`--host`) — cho phép truy cập từ mạng nội bộ |
| URL local | http://localhost:3001/intro |
| URL LAN | http://192.168.1.200:3001/intro |

---

## 11. Git History

```
# Route & link
apps/portal-web/src/App.tsx              → thêm route /intro
apps/portal-web/src/pages/login.tsx      → thêm link "Về hệ thống NC MEMS"
apps/portal-web/index.html               → đổi title

# Core files
apps/portal-web/src/lib/particles.ts     → canvas particle engine
apps/portal-web/src/pages/intro/intro.css          → styles
apps/portal-web/src/pages/intro/intro-page.tsx     → orchestrator
apps/portal-web/src/pages/intro/sections/hero-section.tsx
apps/portal-web/src/pages/intro/sections/features-section.tsx
apps/portal-web/src/pages/intro/sections/quick-actions-section.tsx
apps/portal-web/src/pages/intro/sections/version-footer-section.tsx
```

---

## 12. File Counts

```
6 files created  (5 section/component + 1 CSS)
2 files modified (App.tsx, login.tsx, index.html)
2 files deleted  (cta-section.tsx, integration-section.tsx)
```

Total: ~800 lines of new code across 8 active files.

---

## 13. Queries / Open Items

| Item | Status |
|------|--------|
| Link "Tài Liệu" trỏ về `#` | Cần cập nhật sau |
| Link "Demo" trỏ về `#` | Cần cập nhật sau |
| Light mode Hero | Thiết kế cố định dark gradient (no light variant) |
| Hero particle settings | Count 40, link 160, speed 0.2 — có thể tùy chỉnh |
