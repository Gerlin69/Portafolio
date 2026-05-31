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

// ─── Parallax orbs — Servicios, Manicure, Productos ──────────────────────────
// Orbs decorativos dorados creados en JS para no tocar el HTML
(function() {
    var secciones = [
        { id: '#servicios', left: '5%',   top: '-10%', w: 800 },
        { id: '#manicure',  left: '55%',  top: '5%',   w: 750 },
        { id: '#productos', left: '10%',  top: '0%',   w: 700 }
    ];

    secciones.forEach(function(cfg) {
        var section = document.querySelector(cfg.id);
        if (!section) return;

        var orb = document.createElement('div');
        var pos = 'left:' + cfg.left + ';top:' + cfg.top;

        orb.style.cssText = [
            'position:absolute',
            'width:' + cfg.w + 'px',
            'height:' + cfg.w + 'px',
            'border-radius:50%',
            'background:radial-gradient(circle,rgba(251,191,36,0.18) 0%,rgba(251,191,36,0.06) 40%,transparent 70%)',
            'pointer-events:none',
            'z-index:0',
            'will-change:transform',
            'filter:blur(40px)',
            pos
        ].join(';');

        section.style.position = 'relative';
        section.style.overflow = 'hidden';
        section.insertBefore(orb, section.firstChild);

        // Contenido encima del orb
        section.querySelectorAll(':scope > div').forEach(function(d) {
            if (!d.style.position) d.style.position = 'relative';
        });

        gsap.to(orb, {
            yPercent: -45,
            ease: 'none',
            scrollTrigger: {
                trigger: section,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 2.2
            }
        });
    });
})();

// ─── Productos — animación de entrada (llamada después de cargar las tarjetas) ─
function initProductsGsap() {
    ScrollTrigger.refresh();
    gsap.from('#productos-gallery .card-premium', {
        y: 55,
        opacity: 0,
        duration: 0.85,
        ease: 'power3.out',
        stagger: 0.14,
        scrollTrigger: {
            trigger: '#productos',
            start: 'top 82%',
            toggleActions: 'play none none none'
        }
    });
}

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

