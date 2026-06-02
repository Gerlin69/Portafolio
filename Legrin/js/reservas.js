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

function formatearHora12h(hora24) {
    const [h, m] = hora24.split(':').map(Number);
    const periodo = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${periodo}`;
}

function obtenerDiasNoLaborables(solicitudes) {
    const estado = {};
    solicitudes.forEach(s => {
        const fecha = String(s.Fecha || '').substring(0, 10);
        if (s.Nombre === '__DIA_LIBRE__')   estado[fecha] = 'cerrado';
        if (s.Nombre === '__DIA_ABIERTO__') estado[fecha] = 'abierto';
    });
    // Merge localStorage (admin device, fallback cuando Sheets no acepta el marcador)
    try {
        const local = JSON.parse(localStorage.getItem('legrinDiasLibres') || '{}');
        Object.entries(local).forEach(([fecha, { estado: est }]) => {
            if (!(fecha in estado)) estado[fecha] = est;
        });
    } catch {}
    return Object.keys(estado).filter(f => estado[f] === 'cerrado');
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
        const response = await fetch(`${APPS_SCRIPT_URL}?${params}`, { credentials: 'omit' });
        const data = await response.json();
        return data.success ? true : null;
    } catch {
        return null;
    }
}

async function obtenerSolicitudesGoogleSheets() {
    try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 12000);
        const response = await fetch(`${APPS_SCRIPT_URL}?token=${APPS_SCRIPT_TOKEN}&_t=${Date.now()}`, {
            credentials: 'omit',
            signal: controller.signal
        });
        clearTimeout(tid);
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
    for (let minutos = inicio; minutos < Math.min(ALMUERZO.inicio, fin); minutos += DURACION_CORTE) {
        const h = Math.floor(minutos / 60);
        const m = minutos % 60;
        horarios.push(String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'));
    }
    for (let minutos = ALMUERZO.fin + ALMUERZO.buffer; minutos < fin; minutos += DURACION_CORTE) {
        const h = Math.floor(minutos / 60);
        const m = minutos % 60;
        horarios.push(String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'));
    }

    const solicitudes = await obtenerSolicitudesGoogleSheets();

    if (obtenerDiasNoLaborables(solicitudes).includes(fecha)) {
        container.innerHTML = `
            <div class="col-span-full text-center py-10">
                <i class="fas fa-store-slash text-4xl text-red-400 mb-4 block"></i>
                <p class="text-red-400 font-semibold text-lg">La barbería estará cerrada este día</p>
                <p class="text-gray-500 text-sm mt-2">Por favor selecciona otra fecha</p>
            </div>`;
        return;
    }

    const horasOcupadas = new Set(
        solicitudes
            .filter(s => {
                if (s.Barbero !== barbero) return false;
                if (String(s.Fecha || '').substring(0, 10) !== fecha) return false;
                const estado     = s['Estado (Pendiente/Aprobado/Rechazado)'] || s.Estado || 'Pendiente';
                const estadoPago = s.EstadoPago || '';
                return estado !== 'Rechazada' && estadoPago !== 'Cancelado';
            })
            .map(s => parsearHora(s.Hora))
    );

    const ahora = new Date();
    const hoy   = `${ahora.getFullYear()}-${String(ahora.getMonth()+1).padStart(2,'0')}-${String(ahora.getDate()).padStart(2,'0')}`;
    const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();

    container.innerHTML = horarios.map(h => {
        const [hh, mm] = h.split(':').map(Number);
        const pasada     = fecha === hoy && (hh * 60 + mm) <= minutosAhora;
        const disponible = !pasada && !horasOcupadas.has(h) && validarDisponibilidad(barbero, fecha, h);
        const clase = disponible ? 'horario-disponible hover:shadow-lg hover:shadow-green-500/30' : 'horario-ocupado';
        return `<button type="button" class="${clase}" data-hora="${h}" onclick="seleccionarHora('${h}')" ${!disponible ? 'disabled' : ''}>${formatearHora12h(h)}</button>`;
    }).join('');
}

function seleccionarHora(hora) {
    document.getElementById('hora').value = hora;
    document.querySelectorAll('.horario-disponible, .horario-ocupado').forEach(btn => {
        btn.classList.remove('horario-seleccionado');
        if (btn.dataset.hora === hora) btn.classList.add('horario-seleccionado');
    });
}

// Cada 30 seg: deshabilita visualmente los slots pasados sin llamada a la red
setInterval(function() {
    const fechaEl = document.getElementById('fecha');
    if (!fechaEl || !fechaEl.value) return;
    const ahora = new Date();
    const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth()+1).padStart(2,'0')}-${String(ahora.getDate()).padStart(2,'0')}`;
    if (fechaEl.value !== hoy) return;
    const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
    document.querySelectorAll('.horario-disponible, .horario-seleccionado').forEach(btn => {
        const hora = btn.dataset.hora;
        if (!hora) return;
        const [hh, mm] = hora.split(':').map(Number);
        if ((hh * 60 + mm) <= minutosAhora) {
            btn.disabled = true;
            btn.classList.remove('horario-disponible', 'horario-seleccionado');
            btn.classList.add('horario-ocupado');
            const horaInput = document.getElementById('hora');
            if (horaInput && horaInput.value === hora) horaInput.value = '';
        }
    });
}, 30000);

// Cada 60 seg: refresco completo desde Sheets si hoy está seleccionado
setInterval(function() {
    const fechaEl   = document.getElementById('fecha');
    const barberoEl = document.getElementById('barbero');
    if (!fechaEl || !barberoEl || !fechaEl.value || !barberoEl.value) return;
    const ahora = new Date();
    const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth()+1).padStart(2,'0')}-${String(ahora.getDate()).padStart(2,'0')}`;
    if (fechaEl.value === hoy) actualizarHorarios();
}, 60000);

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

    // Honeypot: si el campo oculto tiene valor, es un bot
    const honeypot = document.getElementById('website');
    if (honeypot && honeypot.value) return;

    const _hoyDate = new Date();
    const hoy = `${_hoyDate.getFullYear()}-${String(_hoyDate.getMonth()+1).padStart(2,'0')}-${String(_hoyDate.getDate()).padStart(2,'0')}`;
    if (fecha < hoy) {
        mostrarNotificacion('❌ No puedes reservar en fechas anteriores a hoy', 'error');
        return;
    }
    if (fecha === hoy) {
        const [hh, mm] = hora.split(':').map(Number);
        if ((hh * 60 + mm) <= (_hoyDate.getHours() * 60 + _hoyDate.getMinutes())) {
            mostrarNotificacion('❌ Este horario ya pasó. Por favor elige uno futuro.', 'error');
            return;
        }
    }
    const [_hh, _mm] = hora.split(':').map(Number);
    if ((_hh * 60 + _mm) >= ALMUERZO.inicio && (_hh * 60 + _mm) < ALMUERZO.fin) {
        mostrarNotificacion('❌ Los barberos almuerzan de 1:00 PM a 2:00 PM. Por favor elige otro horario.', 'error');
        return;
    }

    const btn = document.getElementById('btn-reservar');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Verificando...'; }

    const solicitudes = await obtenerSolicitudesGoogleSheets();

    if (obtenerDiasNoLaborables(solicitudes).includes(fecha)) {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check-circle mr-2"></i> Realizar Reserva'; }
        mostrarNotificacion('❌ La barbería estará cerrada ese día. Por favor elige otra fecha.', 'error');
        await actualizarHorarios();
        return;
    }

    const yaOcupado = solicitudes.some(s => {
        if (s.Barbero !== barbero) return false;
        if (String(s.Fecha || '').substring(0, 10) !== fecha) return false;
        if (parsearHora(s.Hora) !== hora) return false;
        const estado     = s['Estado (Pendiente/Aprobado/Rechazado)'] || s.Estado || 'Pendiente';
        const estadoPago = s.EstadoPago || '';
        return estado !== 'Rechazada' && estadoPago !== 'Cancelado';
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

    // Mostrar modal de pago con instrucciones y cuenta regresiva
    if (typeof mostrarModalPago === 'function') {
        mostrarModalPago({ nombre, telefono, barbero, fecha, hora, tipoCorte });
    } else {
        mostrarNotificacion('✅ ¡Reserva enviada! Recibirás instrucciones de pago por WhatsApp.', 'success');
    }

    document.getElementById('formReserva').reset();
    document.getElementById('horariosContainer').innerHTML = '<p class="text-gray-400 col-span-full text-center py-8">Selecciona primero barbero y fecha</p>';
    document.getElementById('hora').value = '';
}
