// ─── Configuración ────────────────────────────────────────────────────────────
const wheelCarouselConfig = {
    currentIndex: 0,
    totalItems: 0
};

// ─── Fotos (agregar URLs aquí para expandir la galería) ───────────────────────
const fotosCortes = [
    'https://images.unsplash.com/photo-1599458438517-c47d1fe35288?w=500&h=600&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=600&fit=crop',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&h=600&fit=crop',
    'https://images.unsplash.com/photo-1504634712202-b4169f325185?w=500&h=600&fit=crop',
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=500&h=600&fit=crop',
    'https://images.unsplash.com/photo-1599458438517-c47d1fe35288?w=500&h=600&fit=crop&sig=1',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=600&fit=crop&sig=2',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&h=600&fit=crop&sig=3',
    'https://images.unsplash.com/photo-1504634712202-b4169f325185?w=500&h=600&fit=crop&sig=4',
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=500&h=600&fit=crop&sig=5',
    'https://images.unsplash.com/photo-1599458438517-c47d1fe35288?w=500&h=600&fit=crop&sig=6',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&h=600&fit=crop&sig=7'
];

// ─── Cargar fotos desde Sheets (con fallback al array local) ─────────────────
async function _cargarUrlsGaleria() {
    try {
        const res = await fetch(`${APPS_SCRIPT_URL}?action=getFotos&tipo=galeria`, { credentials: 'omit' });
        const data = await res.json();
        if (data.fotos && data.fotos.length > 0) return data.fotos.map(f => f.url);
    } catch {}
    return null;
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function initWheelCarousel() {
    const container = document.getElementById('carouselWheel');
    if (!container) return;

    const urlsSheets = await _cargarUrlsGaleria();
    const urls = urlsSheets || fotosCortes;

    wheelCarouselConfig.totalItems = urls.length;

    urls.forEach((url, index) => {
        const item = document.createElement('div');
        item.className = 'carousel-wheel-item';
        item.id = `carousel-item-${index}`;
        item.innerHTML = `<img src="${url}" alt="Corte ${index + 1}" loading="lazy">`;
        item.addEventListener('click', () => irAlSlide(index));
        container.appendChild(item);
    });

    const dotsContainer = document.getElementById('carouselDots');
    if (dotsContainer) {
        fotosCortes.forEach((_, index) => {
            const dot = document.createElement('button');
            dot.className = 'carousel-dot';
            dot.setAttribute('aria-label', `Ir a foto ${index + 1}`);
            dot.setAttribute('aria-current', index === 0 ? 'true' : 'false');
            dot.addEventListener('click', () => irAlSlide(index));
            dotsContainer.appendChild(dot);
        });
    }

    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    if (btnPrev) btnPrev.addEventListener('click', deslizarAnterior);
    if (btnNext) btnNext.addEventListener('click', deslizarSiguiente);

    // Scroll wheel — solo cuando el mouse está encima del carousel (no bloquea el scroll de la página)
    let scrollTimeout;
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            if (e.deltaY > 0) deslizarSiguiente();
            else deslizarAnterior();
        }, 100);
    }, { passive: false });

    // Touch swipe
    let touchStartX = 0;
    container.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
    }, { passive: true });
    container.addEventListener('touchend', (e) => {
        const diff = touchStartX - e.changedTouches[0].clientX;
        if (diff > 50) deslizarSiguiente();
        else if (diff < -50) deslizarAnterior();
    }, { passive: true });

    // Teclado
    document.addEventListener('keydown', (e) => {
        if (isInViewport(container)) {
            if (e.key === 'ArrowLeft') deslizarAnterior();
            if (e.key === 'ArrowRight') deslizarSiguiente();
        }
    });

    actualizarWheel();
}

// ─── Navegación ───────────────────────────────────────────────────────────────
function irAlSlide(index) {
    const total = wheelCarouselConfig.totalItems;
    wheelCarouselConfig.currentIndex = ((index % total) + total) % total;
    actualizarWheel();
}

function deslizarSiguiente() {
    wheelCarouselConfig.currentIndex = (wheelCarouselConfig.currentIndex + 1) % wheelCarouselConfig.totalItems;
    actualizarWheel();
}

function deslizarAnterior() {
    wheelCarouselConfig.currentIndex = (wheelCarouselConfig.currentIndex - 1 + wheelCarouselConfig.totalItems) % wheelCarouselConfig.totalItems;
    actualizarWheel();
}

// ─── Actualizar posiciones ────────────────────────────────────────────────────
function actualizarWheel() {
    const items = document.querySelectorAll('.carousel-wheel-item');
    const dots  = document.querySelectorAll('.carousel-dot');
    const total = wheelCarouselConfig.totalItems;

    items.forEach((item, index) => {
        let pos = (index - wheelCarouselConfig.currentIndex + total) % total;
        if (pos > total / 2) pos -= total;

        let posClass = 'back';
        if (pos === 0)       posClass = 'center';
        else if (pos === 1)  posClass = 'right-1';
        else if (pos === 2)  posClass = 'right-2';
        else if (pos === -1) posClass = 'left-1';
        else if (pos === -2) posClass = 'left-2';

        item.className = `carousel-wheel-item position-${posClass}`;
    });

    dots.forEach((dot, index) => {
        const active = index === wheelCarouselConfig.currentIndex;
        dot.classList.toggle('active', active);
        dot.setAttribute('aria-current', active ? 'true' : 'false');
    });
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function isInViewport(el) {
    const rect = el.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
}

document.addEventListener('DOMContentLoaded', initWheelCarousel);
