gsap.registerPlugin(ScrollTrigger);

// ─── Hero — entrada cinematográfica ──────────────────────────────────────────
(function() {
    gsap.set('.hero-badge-el', { opacity: 0, y: -35 });
    gsap.set('.hero-title-1',  { opacity: 0, y: 80 });
    gsap.set('.hero-title-2',  { opacity: 0, y: 80 });
    gsap.set('.hero-subtitle', { opacity: 0, y: 30 });
    gsap.set('.hero-cta-btns', { opacity: 0, y: 20 });
    gsap.set('.hero-stat',     { opacity: 0, y: 22 });

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl
        .from('.hero-bg img',  { scale: 1.14, duration: 2.2, ease: 'power2.out' }, 0)
        .to('.hero-badge-el',  { opacity: 1, y: 0, duration: 0.9 }, 0.25)
        .to('.hero-title-1',   { opacity: 1, y: 0, duration: 1.1, ease: 'power4.out' }, 0.45)
        .to('.hero-title-2',   { opacity: 1, y: 0, duration: 1.1, ease: 'power4.out' }, 0.62)
        .to('.hero-subtitle',  { opacity: 1, y: 0, duration: 0.9 }, 1.0)
        .to('.hero-cta-btns',  { opacity: 1, y: 0, duration: 0.7 }, 1.2)
        .to('.hero-stat',      { opacity: 1, y: 0, duration: 0.6, stagger: 0.15 }, 1.35);
})();

// ─── Hero — parallax del fondo al hacer scroll ────────────────────────────────
gsap.to('.hero-bg img', {
    yPercent: 28,
    ease: 'none',
    scrollTrigger: {
        trigger: '#inicio',
        start: 'top top',
        end: 'bottom top',
        scrub: 1.8
    }
});

// ─── Sobre Nosotros — parallax + scale reveal ─────────────────────────────────
gsap.from('.sobre-img-wrap', {
    scale: 0.88,
    opacity: 0,
    duration: 1.4,
    ease: 'power3.out',
    scrollTrigger: {
        trigger: '#sobre',
        start: 'top 75%',
        toggleActions: 'play none none none'
    }
});

gsap.to('.sobre-img-wrap img', {
    yPercent: -14,
    ease: 'none',
    scrollTrigger: {
        trigger: '#sobre',
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1.5
    }
});

// ─── Reveals genéricos — único handler para todas las secciones ───────────────
// Un solo handler por elemento evita conflictos de doble animación
gsap.utils.toArray('.scroll-animate').forEach(el => {
    gsap.from(el, {
        y: 40,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            toggleActions: 'play none none none'
        }
    });
});

