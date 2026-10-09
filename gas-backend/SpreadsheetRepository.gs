/**
 * Operasi dasar Google Sheets. Modul CRUD akademik akan dibangun di atas fungsi ini.
 */

function getSheetByName_(sheetName) {
  var spreadsheet = getSpreadsheet_();
  var knownSheet = LMS_SCHEMA.some(function (schema) {
    return schema.name === sheetName;
  });

  if (!knownSheet) {
    throw new Error('Nama sheet tidak dikenal: ' + sheetName);
  }

  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet "' + sheetName + '" belum dibuat. Jalankan setupDatabase().');
  }
  return sheet;
}

function readRowsAsObjects_(sheetName) {
  var sheet = getSheetByName_(sheetName);
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();

  if (lastRow < 2 || lastColumn < 1) return [];

  var values = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
  var headers = values.shift();

  return values
    .filter(function (row) {
      return row.some(function (cell) { return cell !== '' && cell !== null; });
    })
    .map(function (row) {
      var record = {};
      headers.forEach(function (header, index) {
        record[String(header)] = row[index];
      });
      return record;
    });
}

/**
 * Tambah record memakai nama kolom sehingga urutan kolom tidak di-hardcode.
 * Nilai string dengan awalan yang dapat dieksekusi sebagai formula diprefix apostrof.
 */
function appendRecord_(sheetName, record) {
  var sheet = getSheetByName_(sheetName);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  var row = headers.map(function (header) {
    var value = Object.prototype.hasOwnProperty.call(record, header) ? record[header] : '';
    if (typeof value === 'string' && /^[\s]*[=+@]/.test(value)) {
      return "'" + value;
    }
    return value === undefined || value === null ? '' : value;
  });

  sheet.appendRow(row);
  return sheet.getLastRow();
}