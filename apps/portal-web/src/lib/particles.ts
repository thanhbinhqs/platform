// @ts-nocheck — Particle background canvas utility
// Pure runtime class, TS array-index false positives.
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
    count: 60,
    color: '#ffffff',
    linkColor: 'rgba(255,255,255,0.15)',
    linkDistance: 120,
    speed: 0.3,
    sizeRange: [1, 3],
  };

  constructor(canvas: HTMLCanvasElement, options?: ParticleOptions) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
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
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.offsetWidth * dpr;
    const h = this.canvas.offsetHeight * dpr;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.scale(dpr, dpr);
  };

  private init() {
    const w = this.canvas.offsetWidth;
    const h = this.canvas.offsetHeight;
    this.particles = Array.from({ length: this.opts.count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * this.opts.speed,
      vy: (Math.random() - 0.5) * this.opts.speed,
      size:
        this.opts.sizeRange[0] +
        Math.random() * (this.opts.sizeRange[1] - this.opts.sizeRange[0]),
      opacity: 0.3 + Math.random() * 0.5,
    }));
  }

  private animate = () => {
    if (!this.running) return;
    this.ctx.clearRect(
      0,
      0,
      this.canvas.offsetWidth,
      this.canvas.offsetHeight,
    );
    const w = this.canvas.offsetWidth;
    const h = this.canvas.offsetHeight;
    const pts = this.particles;
    const len = pts.length;
    if (len === 0) {
      this.animId = requestAnimationFrame(this.animate);
      return;
    }

    // Update positions
    for (const p of pts) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
    }

    // Draw links
    for (let i = 0; i < len; i++) {
      for (let j = i + 1; j < len; j++) {
        const dx = pts[i].x - pts[j].x;
        const dy = pts[i].y - pts[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < this.opts.linkDistance) {
          this.ctx.globalAlpha = 1 - dist / this.opts.linkDistance;
          this.ctx.strokeStyle = this.opts.linkColor;
          this.ctx.lineWidth = 0.5;
          this.ctx.beginPath();
          this.ctx.moveTo(pts[i].x, pts[i].y);
          this.ctx.lineTo(pts[j].x, pts[j].y);
          this.ctx.stroke();
        }
      }
    }

    // Draw particles
    this.ctx.globalAlpha = 1;
    for (const p of pts) {
      this.ctx.fillStyle = this.opts.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.animId = requestAnimationFrame(this.animate);
  };
}
