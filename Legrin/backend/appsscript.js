// Token secreto — debe coincidir con APPS_SCRIPT_TOKEN en data.js
var TOKEN_SECRETO = 'Lgr9vBk2xMpQ7nRs4';
var SHEET_ID      = '1K2XZLh-7o4g8pRCuWdB3vpHoyh2po8KQ5Z7yB1HH7tg';

// ─── Sanitización anti-inyección de fórmulas ──────────────────────────────────
function sanitizarCampo(val) {
  var s = String(val || '').trim();
  // Bloquear prefijos que Google Sheets interpreta como fórmulas
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

    var error = validarDatosReserva(body);
    if (error) return ContentService.createTextOutput(JSON.stringify({ success: false, error: error }))
      .setMimeType(ContentService.MimeType.JSON);

    if (!verificarRateLimit(body.telefono)) return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: 'Demasiadas solicitudes. Espera unos minutos.' }))
      .setMimeType(ContentService.MimeType.JSON);

    var ss = SpreadsheetApp.openById('1K2XZLh-7o4g8pRCuWdB3vpHoyh2po8KQ5Z7yB1HH7tg') // Sheet: Solicitudes (legrinbarber@gmail.com);
    var hoja = ss.getSheetByName('Solicitudes');
    var nuevoID = hoja.getLastRow();
    hoja.appendRow([nuevoID, sanitizarCampo(body.nombre), body.telefono, body.barbero, body.fecha, body.hora, body.tipoCorte || '', 'Pendiente', '', new Date().toLocaleString()]);
    return ContentService.createTextOutput(JSON.stringify({ success: true, id: nuevoID }))
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

    // Lectura de todas las solicitudes — requiere token secreto
    if (e.parameter.token !== TOKEN_SECRETO) {
      return ContentService.createTextOutput(JSON.stringify({ error: 'No autorizado' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var ss = SpreadsheetApp.openById('1K2XZLh-7o4g8pRCuWdB3vpHoyh2po8KQ5Z7yB1HH7tg') // Sheet: Solicitudes (legrinbarber@gmail.com);
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

    var ss = SpreadsheetApp.openById('1K2XZLh-7o4g8pRCuWdB3vpHoyh2po8KQ5Z7yB1HH7tg') // Sheet: Solicitudes (legrinbarber@gmail.com);
    var hoja = ss.getSheetByName('Solicitudes');
    var nuevoID = hoja.getLastRow();
    hoja.appendRow([nuevoID, sanitizarCampo(p.nombre), p.telefono, p.barbero, p.fecha, p.hora, p.tipoCorte || '', 'Pendiente', '', new Date().toLocaleString()]);
    return { success: true, id: nuevoID };
  } catch(err) {
    return { success: false, error: err.toString() };
  }
}

// ─── Actualizar estado de barbero ─────────────────────────────────────────────
function actualizarEstadoBarbero(key, nuevoEstado, tiempoRetorno, ultimaActualizacion) {
  try {
    var ss = SpreadsheetApp.openById('1K2XZLh-7o4g8pRCuWdB3vpHoyh2po8KQ5Z7yB1HH7tg') // Sheet: Solicitudes (legrinbarber@gmail.com);
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
    var ss = SpreadsheetApp.openById('1K2XZLh-7o4g8pRCuWdB3vpHoyh2po8KQ5Z7yB1HH7tg') // Sheet: Solicitudes (legrinbarber@gmail.com);
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
  var ss   = SpreadsheetApp.openById('1K2XZLh-7o4g8pRCuWdB3vpHoyh2po8KQ5Z7yB1HH7tg') // Sheet: Solicitudes (legrinbarber@gmail.com);
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

  // Búsqueda por ID con validación IDOR: verificar que nombre y barbero coinciden
  if (data.id && !isNaN(parseInt(data.id))) {
    var rowNum = parseInt(data.id) + 1;
    if (rowNum >= 2 && rowNum <= valores.length) {
      var filaVerif = valores[rowNum - 1];
      var nombreVerif  = String(filaVerif[1] || '');
      var barberoVerif = String(filaVerif[3] || '');
      // Rechazar si los datos no coinciden con la fila
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
// Ejecuta esta función manualmente desde el editor después de hacer cambios.
function crearBackup() {
  var ss    = SpreadsheetApp.openById('1K2XZLh-7o4g8pRCuWdB3vpHoyh2po8KQ5Z7yB1HH7tg') // Sheet: Solicitudes (legrinbarber@gmail.com);
  var tz    = Session.getScriptTimeZone();
  var fecha = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm');
  ss.copy('Legrin Backup ' + fecha);
  Logger.log('Backup creado: Legrin Backup ' + fecha);
}
