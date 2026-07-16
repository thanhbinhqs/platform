/**
 * Constellation — Canvas neural network particle system
 * Zero-dependency, DPR-aware, mouse-interactive
 */

export interface ConstellationOptions {
  count?: number;
  color?: string;
  linkColor?: string;
  linkDistance?: number;
  speed?: number;
  sizeRange?: [number, number];
  mouseRadius?: number;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  alpha: number;
  twinkle: number;
  twinkleSpeed: number;
}

export class Constellation {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private opts: Required<ConstellationOptions>;
  private dpr: number;
  private rafId: number = 0;
  private mouseX: number = -10000;
  private mouseY: number = -10000;
  private w: number = 0;
  private h: number = 0;
  private boundResize: () => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseLeave: () => void;

  constructor(canvas: HTMLCanvasElement, options?: ConstellationOptions) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.dpr = window.devicePixelRatio || 1;
    this.opts = {
      count: options?.count ?? 100,
      color: options?.color ?? '#ffffff',
      linkColor: options?.linkColor ?? 'rgba(96,165,250,',
      linkDistance: options?.linkDistance ?? 140,
      speed: options?.speed ?? 0.6,
      sizeRange: options?.sizeRange ?? [1, 3.5],
      mouseRadius: options?.mouseRadius ?? 200,
    };

    this.boundResize = this.resize.bind(this);
    this.boundMouseMove = this.onMouseMove.bind(this);
    this.boundMouseLeave = this.onMouseLeave.bind(this);
  }

  start() {
    this.resize();
    this.canvas.addEventListener('mousemove', this.boundMouseMove);
    this.canvas.addEventListener('mouseleave', this.boundMouseLeave);
    window.addEventListener('resize', this.boundResize);
    this.animate();
  }

  stop() {
    cancelAnimationFrame(this.rafId);
    this.canvas.removeEventListener('mousemove', this.boundMouseMove);
    this.canvas.removeEventListener('mouseleave', this.boundMouseLeave);
    window.removeEventListener('resize', this.boundResize);
  }

  private resize() {
    this.w = this.canvas.offsetWidth;
    this.h = this.canvas.offsetHeight;
    this.canvas.width = this.w * this.dpr;
    this.canvas.height = this.h * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
    this.particles = [];
    for (let i = 0; i < this.opts.count; i++) {
      this.particles.push(this.createParticle());
    }
  }

  private createParticle(): Particle {
    const [min, max] = this.opts.sizeRange;
    return {
      x: Math.random() * this.w,
      y: Math.random() * this.h,
      vx: (Math.random() - 0.5) * this.opts.speed,
      vy: (Math.random() - 0.5) * this.opts.speed,
      size: min + Math.random() * (max - min),
      alpha: 0.15 + Math.random() * 0.4,
      twinkle: Math.random() * Math.PI * 2,
      twinkleSpeed: 1.5 + Math.random() * 2.5,
    };
  }

  private onMouseMove(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;
  }

  private onMouseLeave() {
    this.mouseX = -10000;
    this.mouseY = -10000;
  }

  private animate = () => {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);

    const time = Date.now() * 0.001;

    // Update & draw particles
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i]!;
      const twinkleFactor = 0.5 + 0.5 * Math.sin(time * p.twinkleSpeed + p.twinkle);
      const currentAlpha = p.alpha * (0.6 + 0.4 * twinkleFactor);

      // Move
      p.x += p.vx;
      p.y += p.vy;

      // Bounce walls
      if (p.x <= 0 || p.x >= this.w) p.vx *= -1;
      if (p.y <= 0 || p.y >= this.h) p.vy *= -1;

      // Mouse repulsion
      const dx = p.x - this.mouseX;
      const dy = p.y - this.mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.opts.mouseRadius && dist > 0) {
        const force = (this.opts.mouseRadius - dist) / this.opts.mouseRadius * 0.05;
        p.x += (dx / dist) * force * 20;
        p.y += (dy / dist) * force * 20;
      }

      // Draw particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(148,163,184,${currentAlpha * 0.7})`;
      ctx.fill();

      // Glow for larger particles
      if (p.size > 2) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(96,165,250,${currentAlpha * 0.04})`;
        ctx.fill();
      }

      // Draw connections
      for (let j = i + 1; j < this.particles.length; j++) {
        const q = this.particles[j]!;
        const dx2 = p.x - q.x;
        const dy2 = p.y - q.y;
        const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
        if (dist2 < this.opts.linkDistance) {
          const linkAlpha = (1 - dist2 / this.opts.linkDistance) * 0.25;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(96,165,250,${linkAlpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    this.rafId = requestAnimationFrame(this.animate);
  };
}
