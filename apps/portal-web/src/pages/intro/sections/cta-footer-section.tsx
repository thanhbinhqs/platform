import { useRef, useEffect, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { ArrowRight, Shield, Sparkles } from 'lucide-react';
import { Constellation } from '../../../lib/constellation';
import '../intro.css';

export function CtaFooterSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const prefersReduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const year = new Date().getFullYear();

  /* ── Mini constellation for CTA ── */
  useEffect(() => {
    if (!canvasRef.current || prefersReduced) return;
    const c = new Constellation(canvasRef.current, {
      count: 40,
      linkDistance: 100,
      speed: 0.3,
      color: '#93c5fd',
      mouseRadius: 120,
    });
    c.start();
    return () => c.stop();
  }, [prefersReduced]);

  return (
    <section
      ref={ref}
      className="relative w-full overflow-hidden px-6 py-24 sm:px-8 lg:px-12"
    >
      {/* Constellation */}
      {!prefersReduced && (
        <canvas ref={canvasRef} className="absolute inset-0 z-[2]" />
      )}

      {/* Decorative shapes */}
      {!prefersReduced && (
        <>
          <div className="float-shape" />
          <div className="float-shape" />
          <div className="float-shape" />
          <div className="float-shape" />
        </>
      )}

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <motion.div
          initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 15 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          {/* Heading */}
          <h2 className="mb-5 text-3xl font-bold tracking-tight text-white sm:text-5xl">
            Ready for{' '}
            <span className="gradient-text">Centralized Management</span>?
          </h2>

          {/* Description */}
          <p className="mx-auto mb-10 max-w-xl text-sm leading-relaxed text-gray-400">
            Sign in to start managing Jigs, Parts, and connect with your enterprise systems today.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="/login"
              className="btn-shine inline-flex items-center gap-2.5 rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-gray-900 shadow-2xl shadow-black/15 transition-all duration-200 hover:bg-gray-50 hover:shadow-2xl hover:shadow-blue-500/15 active:scale-[0.97]"
            >
              Sign In Now
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          {/* Trust badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <Shield className="h-3.5 w-3.5 text-blue-400" />
              ISO 9001:2025
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <Sparkles className="h-3.5 w-3.5 text-blue-400" />
              AI-Powered
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 flex flex-col items-center gap-2">
            <p className="text-[10px] text-gray-600">
              &copy; {year} NC MEMS — Centralized Management Platform
            </p>
            <p className="text-[10px] text-gray-600">v2.1.0</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
