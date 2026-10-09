/**
 * Validasi request, autentikasi antara Vercel proxy dan Apps Script, dan response JSON.
 */

function parseRequestBody_(event) {
  if (!event || !event.postData || typeof event.postData.contents !== 'string') {
    throw new Error('Request body JSON diperlukan.');
  }

  var raw = event.postData.contents;
  if (raw.length > 250000) {
    throw new Error('Request body terlalu besar.');
  }

  var body;
  try {
    body = JSON.parse(raw);
  } catch (error) {
    throw new Error('Request body bukan JSON yang valid.');
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Request body harus berupa objek JSON.');
  }
  return body;
}

function isValidActionName_(action) {
  return typeof action === 'string' && /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/.test(action);
}

function hasValidInternalSecret_(provided) {
  var expected = PropertiesService.getScriptProperties().getProperty('LMS_API_SHARED_SECRET');
  if (typeof provided !== 'string' || typeof expected !== 'string' || !provided || !expected) {
    return false;
  }
  if (provided.length !== expected.length) return false;

  var difference = 0;
  for (var index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ provided.charCodeAt(index);
  }
  return difference === 0;
}

function jsonOutput_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorEnvelope_(code, message, requestId) {
  return {
    success: false,
    message: message,
    error: { code: code, message: message },
    requestId: requestId
  };
}