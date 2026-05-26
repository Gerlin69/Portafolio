// ─── Gallery ──────────────────────────────────────────────────────────────────
function loadCuts() {
    document.getElementById('galeria-gallery').innerHTML = cuts.map(cut => `
        <div class="gallery-item scroll-animate">
            <img src="${cut.image}" alt="${cut.title}" loading="lazy">
            <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent opacity-0 hover:opacity-100 transition duration-300 flex items-end p-6">
                <div>
                    <h3 class="text-xl font-bold">${cut.title}</h3>
                    <p class="text-amber-400 text-sm">Click para reservar</p>
                </div>
            </div>
        </div>
    `).join('');
}

function loadProducts() {
    document.getElementById('productos-gallery').innerHTML = products.map(product => `
        <div class="card-premium rounded-2xl overflow-hidden scroll-animate">
            <div class="relative h-64 overflow-hidden">
                <img src="${product.image}" alt="${product.name}" class="w-full h-full object-cover" loading="lazy">
                <div class="absolute top-4 right-4 badge-premium">${product.price}</div>
            </div>
            <div class="p-6">
                <h3 class="text-xl font-bold mb-2">${product.name}</h3>
                <p class="text-gray-400 text-sm mb-4">${product.description}</p>
                <button onclick="contactForProduct('${product.name}')" class="w-full btn-premium gradient-amber text-black font-bold py-2 rounded-lg">
                    <i class="fas fa-shopping-bag mr-2"></i>Contactar
                </button>
            </div>
        </div>
    `).join('');
}

// ─── Navegación ───────────────────────────────────────────────────────────────
function toggleMenu() {
    document.getElementById('mobile-menu').classList.toggle('hidden');
}

function scrollTo(id) {
    document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
    document.getElementById('mobile-menu').classList.add('hidden');
}

function contactForProduct(productName) {
    window.open(`https://wa.me/${WHATSAPP_CONTACTO}?text=Estoy interesado en ${productName}`, '_blank');
}

// ─── Scroll animations ────────────────────────────────────────────────────────
const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
    });
}, { threshold: 0.1 });

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadCuts();
    loadProducts();

    document.getElementById('fecha').setAttribute('min', new Date().toISOString().split('T')[0]);

    document.querySelectorAll('.scroll-animate').forEach(el => scrollObserver.observe(el));
});
