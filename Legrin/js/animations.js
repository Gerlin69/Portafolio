gsap.registerPlugin(ScrollTrigger);

// ─── Hero — entrada cinematográfica ──────────────────────────────────────────
(function() {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl
        .from('.hero-bg img',    { scale: 1.14, duration: 2.2, ease: 'power2.out' }, 0)
        .from('.hero-badge-el',  { y: -35, opacity: 0, duration: 0.9 }, 0.25)
        .from('.hero-title-1',   { y: 80,  opacity: 0, duration: 1.1, ease: 'power4.out' }, 0.45)
        .from('.hero-title-2',   { y: 80,  opacity: 0, duration: 1.1, ease: 'power4.out' }, 0.62)
        .from('.hero-subtitle',  { y: 30,  opacity: 0, duration: 0.9 }, 1.0)
        .from('.hero-cta-btns',  { y: 20,  opacity: 0, duration: 0.7 }, 1.2)
        .from('.hero-stat',      { y: 22,  opacity: 0, duration: 0.6, stagger: 0.15 }, 1.35);
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

// ─── Reveals genéricos (reemplaza IntersectionObserver) ──────────────────────
gsap.utils.toArray('.scroll-animate').forEach(el => {
    gsap.from(el, {
        y: 45,
        opacity: 0,
        duration: 0.95,
        ease: 'power3.out',
        scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            toggleActions: 'play none none none'
        }
    });
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

// ─── Barberos — stagger ───────────────────────────────────────────────────────
gsap.from('#barberos .group', {
    y: 55,
    opacity: 0,
    duration: 0.85,
    stagger: 0.1,
    ease: 'power3.out',
    scrollTrigger: {
        trigger: '#barberos .grid',
        start: 'top 80%',
        toggleActions: 'play none none none'
    }
});

// ─── Servicios — stagger ─────────────────────────────────────────────────────
gsap.from('#servicios .card-premium', {
    y: 55,
    opacity: 0,
    duration: 0.85,
    stagger: 0.1,
    ease: 'power3.out',
    scrollTrigger: {
        trigger: '#servicios .grid',
        start: 'top 80%',
        toggleActions: 'play none none none'
    }
});

// ─── Manicure — stagger ───────────────────────────────────────────────────────
gsap.from('#manicure .card-premium', {
    y: 55,
    opacity: 0,
    duration: 0.85,
    stagger: 0.08,
    ease: 'power3.out',
    scrollTrigger: {
        trigger: '#manicure .grid',
        start: 'top 80%',
        toggleActions: 'play none none none'
    }
});

// ─── Testimonios — stagger ────────────────────────────────────────────────────
gsap.from('.testimonios .card-premium', {
    y: 45,
    opacity: 0,
    duration: 0.85,
    stagger: 0.13,
    ease: 'power3.out',
    scrollTrigger: {
        trigger: '.testimonios',
        start: 'top 80%',
        toggleActions: 'play none none none'
    }
});

// ─── Galería — expand + parallax interior ─────────────────────────────────────
function initGalleryGsap() {
    ScrollTrigger.refresh();

    gsap.utils.toArray('.gallery-item').forEach((item, i) => {
        // Imagen con escala inicial para dejar margen al parallax
        const img = item.querySelector('img');
        if (img) gsap.set(img, { scale: 1.12, transformOrigin: 'center center' });

        // Expansión cinematográfica al entrar al viewport
        gsap.from(item, {
            scale: 0.82,
            opacity: 0,
            duration: 1.0,
            ease: 'power2.out',
            delay: (i % 3) * 0.07,
            scrollTrigger: {
                trigger: item,
                start: 'top 90%',
                toggleActions: 'play none none none'
            }
        });

        // Parallax interior de la imagen
        if (img) {
            gsap.to(img, {
                yPercent: -10,
                ease: 'none',
                scrollTrigger: {
                    trigger: item,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: true
                }
            });
        }
    });
}
