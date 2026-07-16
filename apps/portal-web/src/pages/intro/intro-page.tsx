import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@platform/hooks';
import { CosmicBackground } from './cosmic-background';
import { HeroSection } from './sections/hero-section';
import { BenefitsSectionWithDivider } from './sections/benefits-section';
import { IntegrationSectionWithDivider } from './sections/integration-section';
import { CtaFooterSection } from './sections/cta-footer-section';
import './intro.css';

export function IntroPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [activeSection, setActiveSection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionIds = ['hero', 'benefits', 'integration', 'cta'];

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Track scroll position → active section
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const scrollY = el.scrollTop;
      const sections = el.querySelectorAll<HTMLElement>('[data-section-id]');
      let active = 0;
      sections.forEach((section) => {
        const offset = section.offsetTop;
        const h = section.offsetHeight;
        if (scrollY >= offset - window.innerHeight * 0.3) {
          active = parseInt(section.dataset.sectionId ?? '0', 10);
        }
      });
      setActiveSection(active);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const handleExplore = useCallback(() => {
    const el = containerRef.current;
    if (el) {
      const heroHeight = window.innerHeight;
      el.scrollTo({ top: heroHeight, behavior: 'smooth' });
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="intro-page h-screen w-screen overflow-y-auto overflow-x-hidden"
    >
      {/* Cosmic background — fixed behind all content */}
      <CosmicBackground activeSection={activeSection} />

      {/* Content layer — z-index above cosmic background */}
      <div className="relative z-10">
        <div data-section-id="0">
          <HeroSection onExplore={handleExplore} />
        </div>
        <div data-section-id="1">
          <BenefitsSectionWithDivider />
        </div>
        <div data-section-id="2">
          <IntegrationSectionWithDivider />
        </div>
        <div data-section-id="3">
          <CtaFooterSection />
        </div>
      </div>
    </div>
  );
}
