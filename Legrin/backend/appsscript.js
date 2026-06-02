// Token secreto — debe coincidir con APPS_SCRIPT_TOKEN en data.js
var TOKEN_SECRETO = 'Lgr9vBk2xMpQ7nRs4';
var SHEET_ID      = '1K2XZLh-7o4g8pRCuWdB3vpHoyh2po8KQ5Z7yB1HH7tg';

// ─── Twilio — números y precios ────────────────────────────────────────────────
// Ejecutar configurarTwilio() UNA VEZ desde el editor de Apps Script para guardar
// las credenciales de forma segura en las propiedades del script.
var BARBEROS_WHATSAPP_NUMEROS = {
  'Leider V.':          '+573044652515',
  'Andres M. "Gringo"': '+573102471637'
};
var NUMERO_COMPROBANTES = '+573102471637';

var INFO_CUENTA_BANCARIA = {
  banco:        'Nequi',
  tipoCuenta:   'Ahorros',
  numeroCuenta: '3102471637',
  titular:      'Andres Palacios'
};

var PRECIO_ADELANTO       = 15000;
var PRECIO_SALDO_BARBERIA = 10000;

// ─── Sanitización anti-inyección de fórmulas ──────────────────────────────────
function sanitizarCampo(val) {
  var s = String(val || '').trim();
  if (/^[=+\-@|%`]/.test(s)) s = "'" + s;
  return s;
}

// ─── Whitelist de barberos (debe coincidir con BARBEROS_CONFIG en data.js) ────
var BARBEROS_VALIDOS = [
  'Leider V.',
  'Andres M. "Gringo"',
  'Freddy R "Dobby"',
  'Felipe M. "Tyga"',
  'Juan Diaz "Polo"'
];

// ─── Validación de datos ──────────────────────────────────────────────────────
function validarDatosReserva(p) {
  if (!p.nombre || typeof p.nombre !== 'string' || p.nombre.trim().length < 2 || p.nombre.length > 80)
    return 'Nombre inválido';
  if (!p.telefono || !/^\d{7,15}$/.test(p.telefono.toString().replace(/\s/g, '')))
    return 'Teléfono inválido';
  if (!p.barbero || BARBEROS_VALIDOS.indexOf(String(p.barbero)) < 0)
    return 'Barbero inválido';
  if (!p.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(p.fecha))
    return 'Fecha inválida';
  if (!p.hora || !/^\d{2}:\d{2}$/.test(p.hora))
    return 'Hora inválida';
  return null;
}

// ─── Rate limiting — máx 3 reservas por teléfono cada 10 minutos ─────────────
function verificarRateLimit(telefono) {
  try {
    var cache = CacheService.getScriptCache();
    var key = 'rl_' + telefono.toString().replace(/\D/g, '').substring(0, 15);
    var count = parseInt(cache.get(key) || '0');
    if (count >= 3) return false;
    cache.put(key, String(count + 1), 600);
    return true;
  } catch(e) {
    return true;
  }
}

// ─── doPost ───────────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    // Twilio inbound webhook (form URL-encoded, no JSON)
    if (e.postData && e.postData.type && e.postData.type.indexOf('application/x-www-form-urlencoded') >= 0) {
      return manejarRespuestaCliente(e);
    }

    var body = JSON.parse(e.postData.contents);

    if (body.action === 'subirFoto') {
      if (body.token !== TOKEN_SECRETO) return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'No autorizado' })).setMimeType(ContentService.MimeType.JSON);
      return ContentService.createTextOutput(JSON.stringify(_subirFoto(body.base64, body.mimeType, body.nombre, body.tipo, body.productoId))).setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === 'eliminarFoto') {
      if (body.token !== TOKEN_SECRETO) return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'No autorizado' })).setMimeType(ContentService.MimeType.JSON);
      return ContentService.createTextOutput(JSON.stringify(_eliminarFoto(body.id))).setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === 'updateBarberStatus') {
      if (body.token !== TOKEN_SECRETO) return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: 'No autorizado' }))
        .setMimeType(ContentService.MimeType.JSON);
      actualizarEstadoBarbero(body.barbero, body.estado, body.tiempoRetorno, body.ultimaActualizacion);
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === 'actualizarEstadoCorte') {
      if (body.token !== TOKEN_SECRETO) return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: 'No autorizado' }))
        .setMimeType(ContentService.MimeType.JSON);
      actualizarEstadoCorteEnSheet(body);
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Fallback: crear reserva
    var result = guardarReservaGet(body);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ─── doGet ────────────────────────────────────────────────────────────────────
function doGet(e) {
  try {
    if (e.parameter.action === 'getFotos') {
      return ContentService.createTextOutput(JSON.stringify(_getFotos(e.parameter.tipo, e.parameter.productoId))).setMimeType(ContentService.MimeType.JSON);
    }

    if (e.parameter.action === 'guardarFoto') {
      if (e.parameter.token !== TOKEN_SECRETO) return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'No autorizado' })).setMimeType(ContentService.MimeType.JSON);
      var hoja = _getHojaFotos();
      var id   = Utilities.getUuid();
      hoja.appendRow([id, e.parameter.url || '', e.parameter.tipo || 'galeria', e.parameter.productoId || '', e.parameter.nombre || 'foto', new Date().toLocaleString()]);
      return ContentService.createTextOutput(JSON.stringify({ success: true, url: e.parameter.url, id: id })).setMimeType(ContentService.MimeType.JSON);
    }

    if (e.parameter.action === 'getBarberStatus') {
      return ContentService.createTextOutput(JSON.stringify(obtenerEstadoBarberos_()))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (e.parameter.action === 'nuevaReserva') {
      return ContentService.createTextOutput(JSON.stringify(guardarReservaGet(e.parameter)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (e.parameter.action === 'actualizarEstadoCorte') {
      if (e.parameter.token !== TOKEN_SECRETO) return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: 'No autorizado' }))
        .setMimeType(ContentService.MimeType.JSON);
      actualizarEstadoCorteEnSheet(e.parameter);
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (e.parameter.action === 'confirmarPago') {
      if (e.parameter.token !== TOKEN_SECRETO) return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: 'No autorizado' }))
        .setMimeType(ContentService.MimeType.JSON);
      return ContentService.createTextOutput(JSON.stringify(confirmarPagoEnSheet(e.parameter)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (e.parameter.action === 'notificarBarbero') {
      if (e.parameter.token !== TOKEN_SECRETO) return ContentService.createTextOutput(
        JSON.stringify({ success: false, error: 'No autorizado' }))
        .setMimeType(ContentService.MimeType.JSON);
      return ContentService.createTextOutput(JSON.stringify(notificarBarberoCorteRealizado(e.parameter)))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Lectura de todas las solicitudes — requiere token secreto
    if (e.parameter.token !== TOKEN_SECRETO) {
      return ContentService.createTextOutput(JSON.stringify({ error: 'No autorizado' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var ss = SpreadsheetApp.openById(SHEET_ID);
    var hoja = ss.getSheetByName('Solicitudes');
    var datos = hoja.getDataRange().getValues();
    var headers = datos[0];
    var tz = Session.getScriptTimeZone();

    var resultado = datos.slice(1).map(function(row) {
      var obj = {};
      headers.forEach(function(h, i) {
        var val = row[i];
        if (val instanceof Date) {
          if (h === 'Hora') {
            val = Utilities.formatDate(val, tz, 'HH:mm');
          } else if (h === 'Fecha') {
            val = Utilities.formatDate(val, tz, 'yyyy-MM-dd');
          } else {
            val = val.toISOString();
          }
        }
        obj[h] = val;
      });
      return obj;
    });

    return ContentService.createTextOutput(JSON.stringify(resultado))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ─── Guardar reserva vía GET ──────────────────────────────────────────────────
function guardarReservaGet(p) {
  try {
    var error = validarDatosReserva(p);
    if (error) return { success: false, error: error };

    if (!verificarRateLimit(p.telefono)) return { success: false, error: 'Demasiadas solicitudes. Espera unos minutos.' };

    var ss = SpreadsheetApp.openById(SHEET_ID);
    var hoja = ss.getSheetByName('Solicitudes');
    var nuevoID = hoja.getLastRow();
    var expiracion = new Date(Date.now() + 30 * 60 * 1000); // 30 min para pagar

    hoja.appendRow([
      nuevoID,
      sanitizarCampo(p.nombre),
      p.telefono,
      p.barbero,
      p.fecha,
      p.hora,
      p.tipoCorte || '',
      'Pago Pendiente',         // Estado general
      '',                       // Motivo rechazo
      new Date().toLocaleString(),
      'Pago Pendiente',         // EstadoPago
      expiracion.toISOString(), // ExpiracionPago
      ''                        // RecordatoriosEnviados
    ]);

    // Enviar instrucciones de pago al cliente y notificar al barbero simultáneamente
    var datosReserva = {
      nombre:    sanitizarCampo(p.nombre),
      barbero:   p.barbero,
      fecha:     p.fecha,
      hora:      p.hora,
      tipoCorte: p.tipoCorte || 'Corte'
    };
    enviarInstruccionesPago(p.telefono, datosReserva);
    var telBarbero = BARBEROS_WHATSAPP_NUMEROS[p.barbero];
    if (telBarbero) enviarConfirmacionReservaBarbero(telBarbero, datosReserva);

    return { success: true, id: nuevoID };
  } catch(err) {
    return { success: false, error: err.toString() };
  }
}

// ─── Confirmar pago desde el panel admin ──────────────────────────────────────
function confirmarPagoEnSheet(p) {
  try {
    var ss      = SpreadsheetApp.openById(SHEET_ID);
    var hoja    = ss.getSheetByName('Solicitudes');
    var datos   = hoja.getDataRange().getValues();
    var headers = datos[0];
    var tz      = Session.getScriptTimeZone();

    var colEstadoPago = _buscarColumna(headers, 'EstadoPago');
    var colEstado     = _buscarColumna(headers, 'Estado');
    if (colEstadoPago < 0) return { success: false, error: 'Columna EstadoPago no encontrada. Ejecuta setupNuevasColumnas()' };

    for (var i = 1; i < datos.length; i++) {
      var fila = datos[i];
      var nombreFila  = String(fila[1] || '');
      var barberoFila = String(fila[3] || '');
      var fechaFila   = fila[4] instanceof Date
        ? Utilities.formatDate(fila[4], tz, 'yyyy-MM-dd')
        : String(fila[4] || '').substring(0, 10);
      var horaFila    = fila[5] instanceof Date
        ? Utilities.formatDate(fila[5], tz, 'HH:mm')
        : String(fila[5] || '').substring(0, 5);

      if (nombreFila === p.nombre && barberoFila === p.barbero &&
          fechaFila === p.fecha && horaFila === p.hora) {
        hoja.getRange(i + 1, colEstadoPago + 1).setValue('Confirmado');
        if (colEstado >= 0) hoja.getRange(i + 1, colEstado + 1).setValue('Pendiente');
        Logger.log('✅ Pago confirmado: ' + p.nombre + ' ' + p.fecha + ' ' + p.hora);
        return { success: true };
      }
    }
    return { success: false, error: 'Reserva no encontrada' };
  } catch(err) {
    return { success: false, error: err.toString() };
  }
}

// ─── Notificar barbero cuando corte es marcado como realizado ─────────────────
function notificarBarberoCorteRealizado(p) {
  try {
    var telefonoBarbero = BARBEROS_WHATSAPP_NUMEROS[p.barbero];
    if (!telefonoBarbero) {
      Logger.log('⚠️ Sin número configurado para barbero: ' + p.barbero);
      return { success: false, error: 'Barbero sin número configurado' };
    }
    var datos = { nombre: p.nombre, barbero: p.barbero, fecha: p.fecha, hora: p.hora };
    enviarNotificacionBarbero(telefonoBarbero, p.nombre, datos);
    return { success: true };
  } catch(err) {
    return { success: false, error: err.toString() };
  }
}

// ─── Actualizar estado de barbero ─────────────────────────────────────────────
function actualizarEstadoBarbero(key, nuevoEstado, tiempoRetorno, ultimaActualizacion) {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var hoja = ss.getSheetByName('Estado Barberos');
    if (!hoja) {
      hoja = ss.insertSheet('Estado Barberos');
      hoja.appendRow(['Key', 'Estado', 'TiempoRetorno', 'UltimaActualizacion']);
    }
    var datos = hoja.getDataRange().getValues();
    var fila = -1;
    for (var i = 1; i < datos.length; i++) {
      if (datos[i][0] === key) { fila = i + 1; break; }
    }
    if (fila === -1) {
      hoja.appendRow([key, nuevoEstado, tiempoRetorno || '', ultimaActualizacion || new Date().toISOString()]);
    } else {
      hoja.getRange(fila, 2).setValue(nuevoEstado);
      hoja.getRange(fila, 3).setValue(tiempoRetorno || '');
      hoja.getRange(fila, 4).setValue(ultimaActualizacion || new Date().toISOString());
    }
  } catch(err) {
    Logger.log('Error actualizarEstadoBarbero: ' + err.toString());
  }
}

// ─── Obtener estado de barberos ───────────────────────────────────────────────
function obtenerEstadoBarberos_() {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var hoja = ss.getSheetByName('Estado Barberos');
    if (!hoja) return { barberos: {} };
    var datos = hoja.getDataRange().getValues();
    var barberos = {};
    for (var i = 1; i < datos.length; i++) {
      var row = datos[i];
      if (!row[0]) continue;
      barberos[row[0]] = {
        estado: row[1] || 'En Servicio',
        tiempoRetorno: row[2] || null,
        ultimaActualizacion: row[3] || null
      };
    }
    return { barberos: barberos };
  } catch(err) {
    return { barberos: {}, error: err.toString() };
  }
}

// ─── Actualizar estado del corte en el Sheet ──────────────────────────────────
function actualizarEstadoCorteEnSheet(data) {
  var ss   = SpreadsheetApp.openById(SHEET_ID);
  var hoja = ss.getSheetByName('Solicitudes');
  if (!hoja) return;

  var valores = hoja.getDataRange().getValues();
  var headers = valores[0];
  var nuevoEstado = data.estado === 'Realizado' ? 'Aprobado' : 'Rechazado';

  var colEstado = -1, colMotivo = -1;
  for (var c = 0; c < headers.length; c++) {
    var h = String(headers[c]).toLowerCase();
    if (h.indexOf('estado') >= 0 && colEstado < 0) colEstado = c + 1;
    if (h.indexOf('motivo') >= 0 && colMotivo < 0) colMotivo = c + 1;
  }
  if (colEstado < 0) return;

  // Búsqueda por ID con validación IDOR
  if (data.id && !isNaN(parseInt(data.id))) {
    var rowNum = parseInt(data.id) + 1;
    if (rowNum >= 2 && rowNum <= valores.length) {
      var filaVerif = valores[rowNum - 1];
      var nombreVerif  = String(filaVerif[1] || '');
      var barberoVerif = String(filaVerif[3] || '');
      if (nombreVerif !== data.nombre || barberoVerif !== data.barbero) {
        Logger.log('IDOR bloqueado: ID ' + data.id + ' no corresponde a ' + data.nombre + ' / ' + data.barbero);
        return;
      }
      hoja.getRange(rowNum, colEstado).setValue(nuevoEstado);
      if (colMotivo > 0 && data.motivo) hoja.getRange(rowNum, colMotivo).setValue(data.motivo);
      return;
    }
  }

  // Fallback: buscar por campos
  var tz = Session.getScriptTimeZone();
  for (var i = 1; i < valores.length; i++) {
    var fila = valores[i];
    var nombreFila  = String(fila[1] || '');
    var barberoFila = String(fila[3] || '');
    var fechaFila   = fila[4] instanceof Date
      ? Utilities.formatDate(fila[4], tz, 'yyyy-MM-dd')
      : String(fila[4] || '').substring(0, 10);
    var horaFila    = fila[5] instanceof Date
      ? Utilities.formatDate(fila[5], tz, 'HH:mm')
      : String(fila[5] || '').substring(0, 5);

    if (nombreFila === data.nombre && barberoFila === data.barbero &&
        fechaFila === data.fecha && horaFila === data.hora) {
      hoja.getRange(i + 1, colEstado).setValue(nuevoEstado);
      if (colMotivo > 0 && data.motivo) hoja.getRange(i + 1, colMotivo).setValue(data.motivo);
      return;
    }
  }
}

// ─── Manejo de respuestas entrantes de clientes (Twilio webhook) ─────────────
function manejarRespuestaCliente(e) {
  try {
    // Parsear cuerpo URL-encoded que envía Twilio
    var params = {};
    (e.postData.contents || '').split('&').forEach(function(par) {
      var kv = par.split('=');
      if (kv.length >= 2) {
        params[decodeURIComponent(kv[0])] = decodeURIComponent(kv.slice(1).join('=').replace(/\+/g, ' '));
      }
    });

    var from     = String(params.From || '');               // "whatsapp:+573XXXXXXXX"
    var body     = String(params.Body || '').trim();
    var telefono = from.replace('whatsapp:', '');
    var cacheKey = 'conv_' + telefono.replace(/[^0-9]/g, '');

    var cache      = CacheService.getScriptCache();
    var estadoJSON = cache.get(cacheKey);
    var estado     = estadoJSON ? JSON.parse(estadoJSON) : null;
    var respuesta  = '';
    var bodyNorm   = body.toLowerCase()
      .replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i').replace(/ó/g,'o').replace(/ú/g,'u');

    if (!estado) {
      // Mensaje fuera de contexto — no responder para no generar ruido
      return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT);
    }

    if (estado.paso === 'esperando_asistencia') {
      var esS = ['si','s','sí','yes','claro','ok','dale','voy','ahi voy','ahí voy'].some(function(p){ return bodyNorm === p; });
      var esN = ['no','nop','nope','no puedo','no voy'].some(function(p){ return bodyNorm === p || bodyNorm.startsWith('no '); });

      if (esS) {
        cache.remove(cacheKey);
        respuesta =
          '✅ ¡Perfecto! Te esperamos en *Legrin Barber* 💈\n\n' +
          'Recuerda llegar 5-10 min antes y traer los *$10.000* del saldo.';
      } else if (esN) {
        cache.put(cacheKey, JSON.stringify({ paso: 'esperando_motivo', datos: estado.datos }), 3600);
        respuesta = '😔 Lamentamos escuchar eso.\n\n¿Cuál es el motivo por el que no puedes asistir?';
      } else {
        respuesta = 'Por favor responde *SÍ* o *NO* para que podamos ayudarte.';
      }

    } else if (estado.paso === 'esperando_motivo') {
      cache.remove(cacheKey);
      var barbero = estado.datos ? (estado.datos.barbero || 'tu barbero') : 'tu barbero';
      respuesta =
        'Gracias por avisarnos. 📝\n\n' +
        'Por favor comunícate directamente con *' + barbero + '* para coordinar la situación.\n\n' +
        '⚠️ *Política de devolución:*\n' +
        'Solo se considerará la devolución del adelanto ($15.000) en casos de *fuerza mayor* debidamente justificados:\n' +
        '- Accidente\n' +
        '- Problema de salud\n' +
        '- Emergencia familiar u otro caso grave\n\n' +
        'En otros casos, el adelanto *no es reembolsable*.\n\n' +
        'Lamentamos los inconvenientes. 💈';
    }

    if (respuesta) enviarWhatsApp(telefono, respuesta);

    return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT);
  } catch(err) {
    Logger.log('Error manejarRespuestaCliente: ' + err.toString());
    return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT);
  }
}

// ─── Twilio: enviar WhatsApp ───────────────────────────────────────────────────
function _getTwilioConfig() {
  var props = PropertiesService.getScriptProperties();
  return {
    accountSid: props.getProperty('TWILIO_SID')    || '',
    authToken:  props.getProperty('TWILIO_TOKEN')  || '',
    numero:     props.getProperty('TWILIO_NUMERO') || '+14155238886'
  };
}

function _formatearNumeroWA(telefono) {
  var n = String(telefono || '').replace(/\D/g, '');
  if (n.length === 10) n = '57' + n;
  else if (n.startsWith('0057')) n = n.substring(2);
  else if (n.length > 10 && !n.startsWith('57')) n = '57' + n;
  return '+' + n;
}

function enviarWhatsApp(telefono, mensaje) {
  try {
    var config = _getTwilioConfig();
    if (!config.accountSid || !config.authToken) {
      Logger.log('❌ Twilio no configurado. Ejecuta configurarTwilio() desde el editor.');
      return null;
    }
    var numero = _formatearNumeroWA(telefono);
    var url    = 'https://api.twilio.com/2010-04-01/Accounts/' + config.accountSid + '/Messages.json';
    var options = {
      method:  'post',
      payload: { From: 'whatsapp:' + config.numero, To: 'whatsapp:' + numero, Body: mensaje },
      headers: { Authorization: 'Basic ' + Utilities.base64Encode(config.accountSid + ':' + config.authToken) },
      muteHttpExceptions: true
    };
    var response = UrlFetchApp.fetch(url, options);
    var result   = JSON.parse(response.getContentText());
    if (result.sid) {
      Logger.log('✅ WhatsApp → ' + numero + ' [' + result.sid + ']');
      return result.sid;
    }
    Logger.log('❌ Error Twilio: ' + JSON.stringify(result));
    return null;
  } catch(e) {
    Logger.log('❌ enviarWhatsApp: ' + e.toString());
    return null;
  }
}

function enviarInstruccionesPago(telefono, datos) {
  var msg =
    '📱 *INSTRUCCIONES DE PAGO* 💈\n\n' +
    '¡Hola ' + datos.nombre + '!\n\n' +
    'Tu reserva en *Legrin Barber* está lista, pero debes confirmar el pago.\n\n' +
    '📋 *DETALLES DE TU CITA:*\n' +
    '─────────────────────\n' +
    '👤 Barbero: ' + datos.barbero + '\n' +
    '📅 Fecha: '   + datos.fecha   + '\n' +
    '⏰ Hora: '    + _formatearHora12h(datos.hora) + '\n' +
    '✂️ Servicio: ' + (datos.tipoCorte || 'Corte') + '\n\n' +
    '💰 *MONTO A PAGAR AHORA:* $15.000 COP\n\n' +
    '🏦 *DATOS PARA TRANSFERENCIA:*\n' +
    '─────────────────────\n' +
    'Banco: '             + INFO_CUENTA_BANCARIA.banco        + '\n' +
    'Tipo de Cuenta: '    + INFO_CUENTA_BANCARIA.tipoCuenta   + '\n' +
    'Número de Cuenta: '  + INFO_CUENTA_BANCARIA.numeroCuenta + '\n' +
    'Titular: '           + INFO_CUENTA_BANCARIA.titular      + '\n\n' +
    '📤 *DESPUÉS DE PAGAR:*\n' +
    '1️⃣ Realiza la transferencia de $15.000\n' +
    '2️⃣ Toma foto del comprobante\n' +
    '3️⃣ ENVÍA A: +57 3102471637 (Gringo)\n' +
    '4️⃣ Incluye tu nombre\n\n' +
    '⏳ *IMPORTANTE:*\n' +
    'Tienes *30 MINUTOS* para hacer el pago.\n' +
    'Si no pagas, tu reserva será cancelada.\n\n' +
    '¿PREGUNTAS?\n' +
    '+57 3044652515 (Leider)\n\n' +
    '¡Gracias! 💈';
  return enviarWhatsApp(telefono, msg);
}

function enviarRecordatorioCita(telefono, minutosRestantes, datos) {
  // Guardar estado de conversación para procesar la respuesta del cliente
  var cacheKey = 'conv_' + String(telefono).replace(/[^0-9]/g, '');
  CacheService.getScriptCache().put(
    cacheKey,
    JSON.stringify({ paso: 'esperando_asistencia', datos: datos }),
    7200 // 2 horas
  );

  var hora12 = _formatearHora12h(datos.hora);
  var pregunta = '\n\n💬 *¿Aún puedes asistir?*\nResponde: *SÍ* o *NO*';
  var msg;

  if (minutosRestantes >= 110) {
    msg = '⏰ *RECORDATORIO DE TU CITA* 💈\n\n' +
      '¡Hola ' + datos.nombre + '!\n\n' +
      'Tu cita en *Legrin Barber* es en *2 HORAS*\n\n' +
      '📋 *DETALLES:*\n' +
      '👤 Barbero: ' + datos.barbero + '\n' +
      '⏰ Hora: '    + hora12        + '\n' +
      '✂️ Servicio: ' + (datos.tipoCorte || 'Corte') + '\n\n' +
      '⚠️ *IMPORTANTE:*\n' +
      '- Llega 5-10 minutos antes\n' +
      '- Ten listo: *$10.000 COP* para pagar en sitio\n' +
      '- Si NO asistes, PIERDES los $15.000 pagados' +
      pregunta;
  } else if (minutosRestantes >= 50) {
    msg = '🚨 *¡ÚLTIMA LLAMADA!* 🚨\n\n' +
      '¡Hola ' + datos.nombre + '!\n\n' +
      'Tu cita en *Legrin Barber* es en *1 HORA*\n\n' +
      '👤 Barbero: ' + datos.barbero + '\n' +
      '⏰ Hora: '    + hora12        +
      pregunta;
  } else {
    msg = '⏰ *FALTAN 20 MINUTOS* ⏰\n\n' +
      '¡Hola ' + datos.nombre + '!\n\n' +
      '¡Tu cita en *Legrin Barber* está por comenzar!\n\n' +
      '👤 Barbero: ' + datos.barbero + '\n' +
      '⏰ Hora: '    + hora12        + '\n\n' +
      'Apúrate para llegar a tiempo.\n' +
      'No olvides los *$10.000* para pagar en sitio.' +
      pregunta;
  }
  return enviarWhatsApp(telefono, msg);
}

function enviarConfirmacionReservaBarbero(telefonoBarbero, datos) {
  var msg =
    '📅 *NUEVA RESERVA* 💈\n\n' +
    'El cliente *' + datos.nombre + '* acaba de reservar una cita.\n' +
    'Está realizando el pago ahora mismo.\n\n' +
    '📋 *DETALLES:*\n' +
    '──────────────────────\n' +
    '👤 Cliente: '  + datos.nombre                      + '\n' +
    '📅 Fecha: '    + datos.fecha                       + '\n' +
    '⏰ Hora: '     + _formatearHora12h(datos.hora)     + '\n' +
    '✂️ Servicio: ' + (datos.tipoCorte || 'Corte')      + '\n\n' +
    'Legrin Barber 💈';
  return enviarWhatsApp(telefonoBarbero, msg);
}

function enviarRecordatorioBarbero(telefonoBarbero, datos) {
  var msg =
    '⏰ *CITA EN 15 MINUTOS* ✂️\n\n' +
    'Tu próxima cita comienza en *15 minutos*:\n\n' +
    '👤 Cliente: '  + datos.nombre                      + '\n' +
    '✂️ Servicio: ' + (datos.tipoCorte || 'Corte')      + '\n' +
    '⏰ Hora: '     + _formatearHora12h(datos.hora)     + '\n\n' +
    '💰 Recuerda cobrar *$10.000* en sitio.\n\n' +
    'Legrin Barber 💈';
  return enviarWhatsApp(telefonoBarbero, msg);
}

function enviarNotificacionBarbero(telefonoBarbero, nombreCliente, datos) {
  var msg =
    '✅ *CORTE REALIZADO* ✂️\n\n' +
    'Cliente: ' + nombreCliente + '\n\n' +
    '📋 *VERIFICAR PAGO:*\n' +
    '─────────────────────\n' +
    'El cliente debe haber pagado $15.000\n' +
    'y enviado comprobante a: +57 3102471637\n\n' +
    '💰 *COBRAR EN SITIO:* $10.000\n\n' +
    '⚠️ ANTES de completar:\n' +
    '1️⃣ Verifica que pagó los $15.000\n' +
    '2️⃣ Revisa el comprobante de pago\n' +
    '3️⃣ Cobra los $10.000 restantes\n\n' +
    '✅ Si todo está OK, marca como Completado';
  return enviarWhatsApp(telefonoBarbero, msg);
}

// ─── Procesamiento automático (trigger cada 5 min) ────────────────────────────
function procesarEventosProgramados() {
  try {
    var ss      = SpreadsheetApp.openById(SHEET_ID);
    var hoja    = ss.getSheetByName('Solicitudes');
    if (!hoja) return;

    var datos   = hoja.getDataRange().getValues();
    var headers = datos[0];
    var ahora   = new Date();
    var tz      = Session.getScriptTimeZone();

    var colEstadoPago = _buscarColumna(headers, 'EstadoPago');
    var colExpiracion = _buscarColumna(headers, 'ExpiracionPago');
    var colRecord     = _buscarColumna(headers, 'RecordatoriosEnviados');
    var colEstado     = _buscarColumna(headers, 'Estado');

    if (colEstadoPago < 0 || colExpiracion < 0 || colRecord < 0) {
      Logger.log('⚠️ Columnas nuevas no encontradas. Ejecuta setupNuevasColumnas()');
      return;
    }

    for (var i = 1; i < datos.length; i++) {
      var fila       = datos[i];
      var estadoPago = String(fila[colEstadoPago] || '').trim();
      var expiracion = fila[colExpiracion];
      var recordEnv  = String(fila[colRecord]     || '').trim();
      var nombre     = String(fila[1] || '').trim();
      var telefono   = String(fila[2] || '').trim();
      var barbero    = String(fila[3] || '').trim();
      var fecha      = fila[4] instanceof Date
        ? Utilities.formatDate(fila[4], tz, 'yyyy-MM-dd')
        : String(fila[4] || '').substring(0, 10);
      var hora       = fila[5] instanceof Date
        ? Utilities.formatDate(fila[5], tz, 'HH:mm')
        : String(fila[5] || '').substring(0, 5);
      var tipoCorte  = String(fila[6] || '').trim();

      if (!nombre || !telefono || !fecha || !hora) continue;

      var datosR = { nombre: nombre, barbero: barbero, fecha: fecha, hora: hora, tipoCorte: tipoCorte };

      // ── Validar pago pendiente (cancelar si pasaron 30 min) ─────────────────
      if (estadoPago === 'Pago Pendiente' && expiracion) {
        var fechaExp = expiracion instanceof Date ? expiracion : new Date(expiracion);
        if (!isNaN(fechaExp.getTime()) && ahora > fechaExp) {
          hoja.getRange(i + 1, colEstadoPago + 1).setValue('Cancelado');
          if (colEstado >= 0) hoja.getRange(i + 1, colEstado + 1).setValue('Rechazada');
          enviarWhatsApp(telefono,
            '⏰ *RESERVA CANCELADA* ❌\n\n' +
            '¡Hola ' + nombre + '!\n\n' +
            'No recibimos tu pago en el tiempo límite de 30 minutos.\n' +
            'Tu reserva con *' + barbero + '* el ' + fecha + ' a las ' + hora + ' ha sido cancelada.\n\n' +
            'Para hacer otra reserva escríbenos por WhatsApp o visítanos.\n\n' +
            'Legrin Barber 💈'
          );
          Logger.log('❌ Cancelada por falta de pago: ' + nombre + ' ' + fecha + ' ' + hora);
          continue;
        }
      }

      // ── Recordatorios automáticos (solo para reservas con pago confirmado) ──
      if (estadoPago !== 'Confirmado') continue;

      var citaDate = Utilities.parseDate(fecha + ' ' + hora, tz, 'yyyy-MM-dd HH:mm');
      var minsCita = Math.round((citaDate.getTime() - ahora.getTime()) / 60000);

      if (minsCita < 0 || minsCita > 130) continue;

      var yaEnviados = recordEnv ? recordEnv.split(',').filter(Boolean) : [];
      var tipoRecord = null;

      if (minsCita > 110 && minsCita <= 130 && !yaEnviados.includes('120')) tipoRecord = '120';
      else if (minsCita > 90  && minsCita <= 110 && !yaEnviados.includes('100')) tipoRecord = '100';
      else if (minsCita > 70  && minsCita <= 90  && !yaEnviados.includes('80'))  tipoRecord = '80';
      else if (minsCita > 50  && minsCita <= 70  && !yaEnviados.includes('60'))  tipoRecord = '60';
      else if (minsCita > 30  && minsCita <= 50  && !yaEnviados.includes('40'))  tipoRecord = '40';
      else if (minsCita > 10  && minsCita <= 30  && !yaEnviados.includes('20'))  tipoRecord = '20';

      if (tipoRecord) {
        enviarRecordatorioCita(telefono, parseInt(tipoRecord), datosR);
        yaEnviados.push(tipoRecord);
        hoja.getRange(i + 1, colRecord + 1).setValue(yaEnviados.join(','));
        Logger.log('⏰ Recordatorio ' + tipoRecord + 'min → ' + nombre);
      }

      // Recordatorio al barbero 15 min antes de su cita
      if (minsCita > 10 && minsCita <= 20 && !yaEnviados.includes('barber15')) {
        var telefonoBarbero = BARBEROS_WHATSAPP_NUMEROS[barbero];
        if (telefonoBarbero) {
          enviarRecordatorioBarbero(telefonoBarbero, datosR);
          yaEnviados.push('barber15');
          hoja.getRange(i + 1, colRecord + 1).setValue(yaEnviados.join(','));
          Logger.log('📲 Recordatorio barbero 15min → ' + barbero);
        }
      }
    }
  } catch(e) {
    Logger.log('❌ procesarEventosProgramados: ' + e.toString());
  }
}

// ─── Formatear hora 24h → 12h (ej: 18:35 → 6:35 PM) ─────────────────────────
function _formatearHora12h(hora24) {
  var parts = String(hora24 || '').split(':');
  var h = parseInt(parts[0]) || 0;
  var m = parts[1] || '00';
  var periodo = h >= 12 ? 'PM' : 'AM';
  var h12 = h % 12 || 12;
  return h12 + ':' + m + ' ' + periodo;
}

// ─── Buscar columna por nombre (case-insensitive, sin espacios) ───────────────
function _buscarColumna(headers, nombre) {
  var n = nombre.toLowerCase().replace(/\s/g, '');
  for (var i = 0; i < headers.length; i++) {
    if (String(headers[i]).toLowerCase().replace(/\s/g, '') === n) return i;
  }
  return -1;
}

// ─── SETUP: ejecutar UNA VEZ desde el editor de Apps Script ──────────────────

// 1) Guarda las credenciales de Twilio de forma segura
function configurarTwilio() {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('TWILIO_SID',    'TU_ACCOUNT_SID');
  props.setProperty('TWILIO_TOKEN',  'TU_AUTH_TOKEN');
  props.setProperty('TWILIO_NUMERO', '+14155238886');
  Logger.log('✅ Twilio configurado correctamente');
}

// 2) Agrega las nuevas columnas al Sheet (sólo las que falten)
function setupNuevasColumnas() {
  var ss   = SpreadsheetApp.openById(SHEET_ID);
  var hoja = ss.getSheetByName('Solicitudes');
  if (!hoja) { Logger.log('❌ Hoja Solicitudes no encontrada'); return; }

  var headers = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
  var nuevas  = ['EstadoPago', 'ExpiracionPago', 'RecordatoriosEnviados'];

  nuevas.forEach(function(col) {
    var yaExiste = headers.some(function(h) {
      return String(h).toLowerCase().replace(/\s/g, '') === col.toLowerCase();
    });
    if (!yaExiste) {
      hoja.getRange(1, hoja.getLastColumn() + 1).setValue(col);
      Logger.log('✅ Columna agregada: ' + col);
    } else {
      Logger.log('ℹ️  Columna ya existe: ' + col);
    }
  });
}

// 3) Activa el trigger que corre cada 5 min para pagos y recordatorios
function configurarTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'procesarEventosProgramados') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('procesarEventosProgramados').timeBased().everyMinutes(5).create();
  Logger.log('✅ Trigger activado: procesarEventosProgramados cada 5 minutos');
}

// ─── Fotos — Google Drive + hoja "Fotos" ─────────────────────────────────────
function _getHojaFotos() {
  var ss   = SpreadsheetApp.openById(SHEET_ID);
  var hoja = ss.getSheetByName('Fotos');
  if (!hoja) {
    hoja = ss.insertSheet('Fotos');
    hoja.appendRow(['ID', 'URL', 'Tipo', 'ProductoId', 'Nombre', 'FechaSubida']);
  }
  return hoja;
}

function _subirFoto(base64, mimeType, nombre, tipo, productoId) {
  var datos   = base64.replace(/^data:[^;]+;base64,/, '');
  var bytes   = Utilities.base64Decode(datos);
  var blob    = Utilities.newBlob(bytes, mimeType || 'image/jpeg', nombre || 'foto.jpg');

  var folders = DriveApp.getFoldersByName('Legrin Fotos');
  var folder  = folders.hasNext() ? folders.next() : DriveApp.createFolder('Legrin Fotos');
  var file    = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE, DriveApp.Permission.VIEW);

  var fileId = file.getId();
  var url    = 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w800-h1000';

  var hoja = _getHojaFotos();
  var id   = Utilities.getUuid();
  hoja.appendRow([id, url, tipo || 'galeria', productoId || '', nombre || 'foto.jpg', new Date().toLocaleString()]);
  return { success: true, url: url, id: id };
}

function _getFotos(tipo, productoId) {
  var hoja  = _getHojaFotos();
  var datos = hoja.getDataRange().getValues();
  if (datos.length < 2) return { fotos: [] };
  var fotos = datos.slice(1).filter(function(r) {
    if (!r[0]) return false;
    if (tipo && String(r[2]).toLowerCase() !== tipo.toLowerCase()) return false;
    if (productoId && String(r[3]) !== String(productoId)) return false;
    return true;
  }).map(function(r) {
    return { id: String(r[0]), url: String(r[1]), tipo: String(r[2]), productoId: String(r[3]), nombre: String(r[4]) };
  });
  return { fotos: fotos };
}

function _eliminarFoto(id) {
  var hoja  = _getHojaFotos();
  var datos = hoja.getDataRange().getValues();
  for (var i = 1; i < datos.length; i++) {
    if (String(datos[i][0]) === String(id)) {
      hoja.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: 'Foto no encontrada' };
}

// ─── Backup Manual ────────────────────────────────────────────────────────────
function crearBackup() {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var tz    = Session.getScriptTimeZone();
  var fecha = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm');
  ss.copy('Legrin Backup ' + fecha);
  Logger.log('Backup creado: Legrin Backup ' + fecha);
}
