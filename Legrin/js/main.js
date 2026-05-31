
async function loadProducts() {
    let fotosPorId = {};
    try {
        const res  = await fetch(`${APPS_SCRIPT_URL}?action=getFotos&tipo=producto`, { credentials: 'omit' });
        const data = await res.json();
        if (data.fotos) data.fotos.forEach(f => { if (f.productoId) fotosPorId[f.productoId] = f.url; });
    } catch {}

    document.getElementById('productos-gallery').innerHTML = products.map(product => {
        const img = fotosPorId[String(product.id)] || product.image;
        return `
        <div class="card-premium rounded-2xl overflow-hidden scroll-animate">
            <div class="relative h-64 overflow-hidden">
                <img src="${img}" alt="${product.name}" class="w-full h-full object-cover" loading="lazy" id="prod-img-main-${product.id}">
                <div class="absolute top-4 right-4 badge-premium">${product.price}</div>
            </div>
            <div class="p-6">
                <h3 class="text-xl font-bold mb-2">${product.name}</h3>
                <p class="text-gray-400 text-sm mb-4">${product.description}</p>
                <button onclick="contactForProduct('${product.name}')" class="w-full btn-premium gradient-amber text-black font-bold py-2 rounded-lg">
                    <i class="fas fa-shopping-bag mr-2"></i>Contactar
                </button>
            </div>
        </div>`;
    }).join('');
}

// ─── Navegación ───────────────────────────────────────────────────────────────
function toggleMenu() {
    document.getElementById('mobile-menu').classList.toggle('hidden');
}

function scrollToSection(id) {
    document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
    document.getElementById('mobile-menu').classList.add('hidden');
}

function contactForProduct(productName) {
    window.open(`https://wa.me/${WHATSAPP_CONTACTO}?text=Estoy interesado en ${productName}`, '_blank');
}

// Scroll animations manejadas por GSAP en animations.js

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    loadProducts();

    // Si el horario de hoy ya terminó, pre-seleccionar mañana
    const ahora = new Date();
    const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
    const horarioDia = HORARIOS_DIA[ahora.getDay()];
    let fechaInicial;
    if (minutosActuales >= horarioDia.fin) {
        const manana = new Date(ahora);
        manana.setDate(manana.getDate() + 1);
        fechaInicial = manana.toISOString().split('T')[0];
    } else {
        fechaInicial = ahora.toISOString().split('T')[0];
    }
    const fechaInput = document.getElementById('fecha');
    fechaInput.setAttribute('min', fechaInicial);
    fechaInput.value = fechaInicial;

    // Sincroniza estado desde Sheets al cargar para tener datos cross-device correctos
    await sincronizarEstadoDesdeSheets();
    actualizarSelectBarberos(fechaInicial);

    // Cada 30s re-sincroniza con la fecha actualmente seleccionada
    setInterval(async () => {
        await sincronizarEstadoDesdeSheets();
        const fechaSeleccionada = document.getElementById('fecha')?.value || null;
        actualizarSelectBarberos(fechaSeleccionada);
    }, 30000);
});
