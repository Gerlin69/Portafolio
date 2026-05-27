// ─── LocalStorage ────────────────────────────────────────────────────────────
function obtenerReservas() {
    const reservas = localStorage.getItem('legrinReservas');
    return reservas ? JSON.parse(reservas) : [];
}

function guardarReservas(reservas) {
    localStorage.setItem('legrinReservas', JSON.stringify(reservas));
}

function agregarReservaConfirmada(nombre, barbero, fecha, hora, tipoCorte) {
    const reservas = obtenerReservas();
    reservas.push({ id: Date.now(), nombre, barbero, fecha, hora, tipoCorte: tipoCorte || '', fechaConfirmacion: new Date().toISOString() });
    guardarReservas(reservas);
}

function validarDisponibilidad(barbero, fecha, hora) {
    return !obtenerReservas().find(r => r.barbero === barbero && r.fecha === fecha && r.hora === hora);
}

function parsearHora(val) {
    const str = String(val || '');
    if (/^\d{1,2}:\d{2}$/.test(str)) return str.padStart(5, '0');
    const d = new Date(str);
    if (!isNaN(d.getTime())) return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    return str;
}

// ─── Google Sheets ────────────────────────────────────────────────────────────
async function guardarEnGoogleSheets(nombre, telefono, barbero, fecha, hora, tipoCorte) {
    try {
        const params = new URLSearchParams({ action: 'nuevaReserva', nombre, telefono, barbero, fecha, hora, tipoCorte });
        const response = await fetch(`${APPS_SCRIPT_URL}?${params}`);
        const data = await response.json();
        return data.success ? true : null;
    } catch {
        return null;
    }
}

async function obtenerSolicitudesGoogleSheets() {
    try {
        const response = await fetch(APPS_SCRIPT_URL);
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

async function verificarEstadoReserva(nombre, barbero, fecha, hora, tipoCorte) {
    const solicitudes = await obtenerSolicitudesGoogleSheets();
    const solicitud = solicitudes.find(s =>
        s.Nombre === nombre && s.Barbero === barbero && s.Fecha === fecha && s.Hora === hora
    );

    if (!solicitud) return 'pendiente';

    if (solicitud.Estado === 'Aprobada') {
        agregarReservaConfirmada(nombre, barbero, fecha, hora, tipoCorte);
        mostrarNotificacion('✅ ¡Tu reserva fue CONFIRMADA! El barbero confirmó tu cita.', 'success');
        return 'aprobada';
    }
    if (solicitud.Estado === 'Rechazada') {
        mostrarNotificacion(`❌ Tu reserva fue rechazada. Motivo: ${solicitud['Motivo Rechazo'] || 'Sin especificar'}`, 'error');
        return 'rechazada';
    }
    return 'pendiente';
}

// ─── UI ───────────────────────────────────────────────────────────────────────
function mostrarNotificacion(mensaje, tipo = 'info') {
    const colors = {
        success: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981', border: '#10b981' },
        error:   { bg: 'rgba(239, 68, 68, 0.1)',  text: '#ef4444',  border: '#ef4444' },
        info:    { bg: 'rgba(59, 130, 246, 0.1)',  text: '#3b82f6',  border: '#3b82f6' }
    };
    const c = colors[tipo] || colors.info;

    const div = document.createElement('div');
    div.style.cssText = `
        position: fixed; top: 100px; right: 20px;
        padding: 16px 24px; border-radius: 12px;
        font-size: 14px; font-weight: 600; z-index: 9999;
        animation: slideIn 0.5s ease; max-width: 400px;
        backdrop-filter: blur(10px); border: 1px solid;
        background-color: ${c.bg}; color: ${c.text}; border-color: ${c.border};
    `;
    div.textContent = mensaje;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 5000);
}

async function actualizarHorarios() {
    const barbero = document.getElementById('barbero').value;
    const fecha   = document.getElementById('fecha').value;
    const container = document.getElementById('horariosContainer');

    if (!barbero || !fecha) {
        container.innerHTML = '<p class="text-gray-400 col-span-full text-center py-8">Selecciona barbero y fecha</p>';
        return;
    }

    // Refresca la lista de barberos según si la fecha es hoy o futura
    if (typeof actualizarSelectBarberos === 'function') actualizarSelectBarberos(fecha);

    container.innerHTML = '<p class="text-gray-400 col-span-full text-center py-8"><i class="fas fa-spinner fa-spin mr-2"></i>Cargando horarios...</p>';

    const diaSemana = new Date(fecha + 'T12:00:00').getDay();
    const { inicio, fin } = HORARIOS_DIA[diaSemana];

    const horarios = [];
    for (let minutos = inicio; minutos < fin; minutos += DURACION_CORTE) {
        const h = Math.floor(minutos / 60);
        const m = minutos % 60;
        horarios.push(String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'));
    }

    const solicitudes = await obtenerSolicitudesGoogleSheets();
    const horasOcupadas = new Set(
        solicitudes
            .filter(s => {
                if (s.Barbero !== barbero) return false;
                if (String(s.Fecha || '').substring(0, 10) !== fecha) return false;
                const estado = s['Estado (Pendiente/Aprobado/Rechazado)'] || s.Estado || 'Pendiente';
                return estado !== 'Rechazada';
            })
            .map(s => parsearHora(s.Hora))
    );

    container.innerHTML = horarios.map(h => {
        const disponible = !horasOcupadas.has(h) && validarDisponibilidad(barbero, fecha, h);
        const clase = disponible ? 'horario-disponible hover:shadow-lg hover:shadow-green-500/30' : 'horario-ocupado';
        return `<button type="button" class="${clase}" onclick="seleccionarHora('${h}')" ${!disponible ? 'disabled' : ''}>${h}</button>`;
    }).join('');
}

function seleccionarHora(hora) {
    document.getElementById('hora').value = hora;
    document.querySelectorAll('.horario-disponible, .horario-ocupado').forEach(btn => {
        btn.classList.remove('horario-seleccionado');
        if (btn.textContent === hora) btn.classList.add('horario-seleccionado');
    });
}

async function realizarReserva() {
    const nombre    = document.getElementById('nombre').value;
    const telefono  = document.getElementById('telefono').value;
    const barbero   = document.getElementById('barbero').value;
    const fecha     = document.getElementById('fecha').value;
    const hora      = document.getElementById('hora').value;
    const tipoCorte = document.getElementById('tipoCorte').value;

    if (!nombre || !telefono || !barbero || !fecha || !hora || !tipoCorte) {
        mostrarNotificacion('❌ Por favor completa todos los campos', 'error');
        return;
    }

    const hoy = new Date().toISOString().split('T')[0];
    if (fecha < hoy) {
        mostrarNotificacion('❌ No puedes reservar en fechas anteriores a hoy', 'error');
        return;
    }

    const btn = document.getElementById('btn-reservar');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Verificando...'; }

    const solicitudes = await obtenerSolicitudesGoogleSheets();
    const yaOcupado = solicitudes.some(s => {
        if (s.Barbero !== barbero) return false;
        if (String(s.Fecha || '').substring(0, 10) !== fecha) return false;
        if (parsearHora(s.Hora) !== hora) return false;
        const estado = s['Estado (Pendiente/Aprobado/Rechazado)'] || s.Estado || 'Pendiente';
        return estado !== 'Rechazada';
    });

    if (yaOcupado || !validarDisponibilidad(barbero, fecha, hora)) {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Realizar Reserva'; }
        mostrarNotificacion(`❌ ${barbero} ya tiene una reserva a las ${hora}. Elige otro horario.`, 'error');
        await actualizarHorarios();
        document.getElementById('hora').value = '';
        return;
    }

    if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Enviando...'; }

    const ok = await guardarEnGoogleSheets(nombre, telefono, barbero, fecha, hora, tipoCorte);

    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Realizar Reserva'; }

    if (!ok) {
        mostrarNotificacion('❌ Error de red. Verifica tu conexión e intenta de nuevo.', 'error');
        return;
    }

    mostrarNotificacion('✅ ¡Reserva enviada! Los barberos ya pueden verla.', 'success');
    document.getElementById('formReserva').reset();
    document.getElementById('horariosContainer').innerHTML = '<p class="text-gray-400 col-span-full text-center py-8">Selecciona primero barbero y fecha</p>';
    document.getElementById('hora').value = '';
}
