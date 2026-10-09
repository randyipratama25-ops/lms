/**
 * Skema spreadsheet dan utilitas akses database.
 * Jalankan setupDatabase() sekali dari editor Apps Script.
 */

var LMS_SCHEMA = [
  { name: 'Users', headers: ['user_id', 'username', 'password_hash', 'role', 'status', 'created_at', 'updated_at'] },
  { name: 'Students', headers: ['student_id', 'nis', 'nisn', 'name', 'class_id', 'photo_media_id', 'status', 'created_at', 'updated_at'] },
  { name: 'Teachers', headers: ['teacher_id', 'employee_number', 'name', 'email', 'status', 'created_at', 'updated_at'] },
  { name: 'Classes', headers: ['class_id', 'class_name', 'grade_level', 'homeroom_teacher_id', 'academic_year_id', 'status', 'created_at', 'updated_at'] },
  { name: 'Subjects', headers: ['subject_id', 'subject_name', 'subject_code', 'status', 'created_at', 'updated_at'] },
  { name: 'AcademicYears', headers: ['academic_year_id', 'year_label', 'semester', 'is_active', 'created_at', 'updated_at'] },
  { name: 'TeachingAssignments', headers: ['assignment_id', 'teacher_id', 'class_id', 'subject_id', 'academic_year_id', 'status', 'created_at', 'updated_at'] },
  { name: 'AttendanceSessions', headers: ['session_id', 'class_id', 'subject_id', 'teacher_id', 'session_date', 'meeting_number', 'notes', 'created_at'] },
  { name: 'AttendanceRecords', headers: ['record_id', 'session_id', 'student_id', 'attendance_status', 'notes', 'recorded_by', 'recorded_at', 'updated_at'] },
  { name: 'Assignments', headers: ['assignment_id', 'teacher_id', 'class_id', 'subject_id', 'title', 'instructions', 'available_at', 'due_at', 'status', 'allow_resubmission', 'max_score', 'attachment_media_id', 'created_at', 'updated_at'] },
  { name: 'Submissions', headers: ['submission_id', 'assignment_id', 'student_id', 'answer_text', 'attachment_media_id', 'submitted_at', 'status', 'score', 'feedback', 'graded_by', 'graded_at', 'created_at', 'updated_at'] },
  { name: 'Materials', headers: ['material_id', 'teacher_id', 'class_id', 'subject_id', 'title', 'description', 'drive_file_id', 'visibility', 'created_at', 'updated_at'] },
  { name: 'Media', headers: ['media_id', 'drive_file_id', 'original_name', 'mime_type', 'file_size', 'category', 'visibility', 'uploaded_by', 'created_at', 'updated_at'] },
  { name: 'Announcements', headers: ['announcement_id', 'title', 'body', 'audience', 'start_at', 'end_at', 'created_by', 'status', 'created_at', 'updated_at'] },
  { name: 'AuditLogs', headers: ['log_id', 'actor_id', 'action', 'entity_type', 'entity_id', 'details_json', 'created_at'] },
  { name: 'Settings', headers: ['setting_key', 'setting_value', 'description', 'updated_at'] }
];

/**
 * Membuat Spreadsheet database baru jika belum ada, lalu menyiapkan header.
 * Fungsi ini tidak membuat atau mencetak shared secret.
 */
function setupDatabase() {
  var properties = PropertiesService.getScriptProperties();
  var spreadsheetId = properties.getProperty('LMS_SPREADSHEET_ID');
  var spreadsheet;

  if (spreadsheetId) {
    spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  } else {
    spreadsheet = SpreadsheetApp.create('LMS Sekolah/Madrasah — Database');
    properties.setProperty('LMS_SPREADSHEET_ID', spreadsheet.getId());
  }

  var initialSheets = spreadsheet.getSheets();
  LMS_SCHEMA.forEach(function (schema, index) {
    var sheet = spreadsheet.getSheetByName(schema.name);

    if (!sheet && index === 0 && initialSheets.length === 1 &&
        initialSheets[0].getName() === 'Sheet1' && initialSheets[0].getLastRow() === 0) {
      initialSheets[0].setName(schema.name);
      sheet = initialSheets[0];
    }

    if (!sheet) {
      sheet = spreadsheet.insertSheet(schema.name);
    }

    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, schema.headers.length).setValues([schema.headers]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, schema.headers.length).setFontWeight('bold');
      return;
    }

    var currentHeaders = sheet.getRange(1, 1, 1, schema.headers.length).getDisplayValues()[0];
    var matches = schema.headers.every(function (header, headerIndex) {
      return currentHeaders[headerIndex] === header;
    });

    if (!matches) {
      throw new Error('Header sheet "' + schema.name + '" tidak sesuai skema. Tidak ada perubahan otomatis dilakukan.');
    }
    sheet.setFrozenRows(1);
  });

  Logger.log('Spreadsheet siap: ' + spreadsheet.getUrl());
  return {
    spreadsheetId: spreadsheet.getId(),
    spreadsheetUrl: spreadsheet.getUrl(),
    sheetCount: LMS_SCHEMA.length
  };
}

function getSpreadsheet_() {
  var spreadsheetId = PropertiesService.getScriptProperties().getProperty('LMS_SPREADSHEET_ID');
  if (!spreadsheetId) {
    throw new Error('LMS_SPREADSHEET_ID belum disetel. Jalankan setupDatabase() terlebih dahulu.');
  }
  return SpreadsheetApp.openById(spreadsheetId);
}

function getDatabaseHealth_() {
  var spreadsheetId = PropertiesService.getScriptProperties().getProperty('LMS_SPREADSHEET_ID');
  if (!spreadsheetId) {
    return { configured: false, accessible: false, message: 'Jalankan setupDatabase() dari editor Apps Script.' };
  }

  try {
    var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    return {
      configured: true,
      accessible: true,
      spreadsheetName: spreadsheet.getName(),
      sheetCount: spreadsheet.getSheets().length
    };
  } catch (error) {
    console.error('Database health check failed: ' + error);
    return { configured: true, accessible: false, message: 'Spreadsheet tidak dapat dibuka oleh Apps Script.' };
  }
}