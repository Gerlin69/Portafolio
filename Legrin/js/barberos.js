// ─── Estado de Barberos ───────────────────────────────────────────────────────
const ESTADO_KEY = 'legrinEstadoBarberos';

function _inicializarEstado() {
    if (localStorage.getItem(ESTADO_KEY)) return;
    const estado = {};
    BARBEROS_CONFIG.forEach(({ key }) => {
        estado[key] = { estado: 'En Servicio', tiempoRetorno: null, ultimaActualizacion: new Date().toISOString() };
    });
    localStorage.setItem(ESTADO_KEY, JSON.stringify(estado));
}

function obtenerEstadoBarberos() {
    _inicializarEstado();
    return JSON.parse(localStorage.getItem(ESTADO_KEY));
}

function guardarEstadoBarberos(estado) {
    localStorage.setItem(ESTADO_KEY, JSON.stringify(estado));
}

function obtenerEstadoBarbero(key) {
    return obtenerEstadoBarberos()[key] || { estado: 'En Servicio', tiempoRetorno: null };
}

function cambiarEstadoBarbero(key, nuevoEstado, minutosAusencia = null) {
    const estado = obtenerEstadoBarberos();
    estado[key] = {
        estado: nuevoEstado,
        tiempoRetorno: (minutosAusencia && minutosAusencia > 0)
            ? new Date(Date.now() + minutosAusencia * 60000).toISOString()
            : null,
        ultimaActualizacion: new Date().toISOString()
    };
    guardarEstadoBarberos(estado);
    _sincronizarASheets(key, estado[key]);
    if (typeof actualizarSelectBarberos === 'function') actualizarSelectBarberos();
}

// ─── Disponibilidad ───────────────────────────────────────────────────────────
function obtenerBarberosDisponibles(fecha = null) {
    const hoy = _fechaLocal(new Date());
    // Para fechas futuras todos los barberos están disponibles para reservar
    if (fecha && fecha > hoy) {
        return BARBEROS_CONFIG.map(b => b.nombre);
    }
    const estado = obtenerEstadoBarberos();
    const disponibles = [];
    BARBEROS_CONFIG.forEach(b => {
        const e = estado[b.key];
        if (!e || e.estado === 'En Servicio') {
            disponibles.push(b.nombre);
            return;
        }
        // Auto-retorno si ya pasó el tiempo estimado
        if (e.tiempoRetorno && new Date() >= new Date(e.tiempoRetorno)) {
            cambiarEstadoBarbero(b.key, 'En Servicio');
            disponibles.push(b.nombre);
        }
    });
    return disponibles;
}

function actualizarSelectBarberos(fecha = null) {
    const select = document.getElementById('barbero');
    if (!select) return;
    const valorAnterior = select.value;
    const disponibles = obtenerBarberosDisponibles(fecha);

    select.innerHTML = '<option value="">-- Elige un barbero --</option>';
    disponibles.forEach(nombre => {
        const opt = document.createElement('option');
        opt.value = nombre;
        opt.textContent = nombre;
        select.appendChild(opt);
    });

    if (valorAnterior && disponibles.includes(valorAnterior)) {
        select.value = valorAnterior;
    } else if (valorAnterior) {
        const hoy = _fechaLocal(new Date());
        if (!fecha || fecha <= hoy) {
            if (typeof mostrarNotificacion === 'function')
                mostrarNotificacion('❌ Ese barbero está fuera de servicio. Por favor elige otro disponible.', 'error');
        }
        const horaInput = document.getElementById('hora');
        const container = document.getElementById('horariosContainer');
        if (horaInput) horaInput.value = '';
        if (container) container.innerHTML = '<p class="text-gray-400 col-span-full text-center py-8">Selecciona barbero y fecha</p>';
    }
}

// ─── Helpers para Admin ───────────────────────────────────────────────────────
function tiempoRestante(isoString) {
    if (!isoString) return null;
    const diff = new Date(isoString) - new Date();
    if (diff <= 0) return null;
    const mins = Math.ceil(diff / 60000);
    return mins >= 60
        ? `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}min`
        : `${mins} min`;
}

function horaFormateada(isoString) {
    if (!isoString) return '';
    return new Date(isoString).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function obtenerProximaCita(key) {
    const config = BARBEROS_CONFIG.find(b => b.key === key);
    if (!config) return null;
    const hoy = _fechaLocal(new Date());
    const ahora = new Date().toTimeString().slice(0, 5);
    const reservas = JSON.parse(localStorage.getItem('legrinReservas') || '[]');
    return reservas
        .filter(r => r.barbero === config.nombre && r.fecha === hoy && r.hora >= ahora)
        .sort((a, b) => a.hora.localeCompare(b.hora))[0] || null;
}

function contarCitasHoy(key) {
    const config = BARBEROS_CONFIG.find(b => b.key === key);
    if (!config) return 0;
    const hoy = _fechaLocal(new Date());
    return JSON.parse(localStorage.getItem('legrinReservas') || '[]')
        .filter(r => r.barbero === config.nombre && r.fecha === hoy).length;
}

function obtenerCitasProximas(minutosAnticipacion = 90) {
    const hoy = _fechaLocal(new Date());
    const ahora = new Date();
    const limite = new Date(ahora.getTime() + minutosAnticipacion * 60000);
    return JSON.parse(localStorage.getItem('legrinReservas') || '[]')
        .filter(r => {
            if (r.fecha !== hoy) return false;
            const [h, m] = r.hora.split(':').map(Number);
            const citaTime = new Date();
            citaTime.setHours(h, m, 0, 0);
            return citaTime >= ahora && citaTime <= limite;
        })
        .sort((a, b) => a.hora.localeCompare(b.hora));
}

// ─── Sync Google Sheets (silencioso — requiere Apps Script actualizado) ────────
async function _sincronizarASheets(key, datos) {
    try {
        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            credentials: 'omit',
            body: JSON.stringify({
                action: 'updateBarberStatus',
                token: APPS_SCRIPT_TOKEN,
                barbero: key,
                estado: datos.estado,
                tiempoRetorno: datos.tiempoRetorno || '',
                ultimaActualizacion: datos.ultimaActualizacion
            })
        });
    } catch { /* localStorage como fallback */ }
}

async function sincronizarEstadoDesdeSheets() {
    try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(`${APPS_SCRIPT_URL}?action=getBarberStatus`, { credentials: 'omit', signal: controller.signal });
        clearTimeout(tid);
        const data = await res.json();
        if (data && data.barberos && typeof data.barberos === 'object') {
            guardarEstadoBarberos(data.barberos);
            if (typeof actualizarSelectBarberos === 'function') actualizarSelectBarberos();
            return true;
        }
    } catch { /* usar localStorage */ }
    return false;
}
