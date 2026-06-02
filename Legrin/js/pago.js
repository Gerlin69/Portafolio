// ─── Modal de Pago ────────────────────────────────────────────────────────────
let _reservaPendiente = null;
let _pagoTimer        = null;
let _pagoSegundos     = 30 * 60;

function mostrarModalPago(datosReserva) {
    _reservaPendiente = datosReserva;
    _pagoSegundos     = 30 * 60;

    // Rellena los datos en el modal
    const mapCampos = {
        'mp-nombre':   datosReserva.nombre,
        'mp-barbero':  datosReserva.barbero,
        'mp-fecha':    datosReserva.fecha,
        'mp-hora':     datosReserva.hora,
        'mp-servicio': datosReserva.tipoCorte || 'Corte',
    };
    for (const [id, val] of Object.entries(mapCampos)) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }

    const msgExp = document.getElementById('mp-msg-expiracion');
    if (msgExp) msgExp.style.display = 'none';

    const btnCerrar = document.getElementById('mp-btn-cerrar');
    if (btnCerrar) { btnCerrar.disabled = false; btnCerrar.textContent = '✅ Entendido, voy a pagar'; }

    const cdEl = document.getElementById('mp-countdown');
    if (cdEl) { cdEl.style.color = ''; }

    document.getElementById('modal-pago').style.display = 'flex';
    _iniciarCountdown();
}

function _iniciarCountdown() {
    clearInterval(_pagoTimer);
    _actualizarCountdown();
    _pagoTimer = setInterval(() => {
        _pagoSegundos--;
        if (_pagoSegundos <= 0) {
            clearInterval(_pagoTimer);
            _pagoSegundos = 0;
            _reservaExpiradaUI();
        }
        _actualizarCountdown();
    }, 1000);
}

function _actualizarCountdown() {
    const el = document.getElementById('mp-countdown');
    if (!el) return;
    const min = Math.floor(_pagoSegundos / 60);
    const sec = _pagoSegundos % 60;
    el.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function _reservaExpiradaUI() {
    const cdEl = document.getElementById('mp-countdown');
    if (cdEl) cdEl.style.color = '#ef4444';

    const msgEl = document.getElementById('mp-msg-expiracion');
    if (msgEl) msgEl.style.display = 'flex';

    const btnEl = document.getElementById('mp-btn-cerrar');
    if (btnEl) {
        btnEl.disabled = false;
        btnEl.textContent = 'Cerrar';
    }
}

function cerrarModalPago() {
    clearInterval(_pagoTimer);
    document.getElementById('modal-pago').style.display = 'none';
    _reservaPendiente = null;
}
