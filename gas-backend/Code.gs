/**
 * Entrypoint Google Apps Script untuk LMS Sekolah/Madrasah.
 *
 * Deploy sebagai Web App: Execute as owner, access Anyone.
 * Lindungi POST dengan Script Property LMS_API_SHARED_SECRET.
 */

function doGet() {
  return jsonOutput_({
    success: true,
    message: 'LMS Apps Script API aktif',
    data: {
      service: 'lms-sekolah-madrasah',
      status: 'ok',
      apiVersion: '1.0.0',
      postAuthenticationRequired: true
    },
    requestId: Utilities.getUuid()
  });
}

function doPost(e) {
  var requestId = Utilities.getUuid();

  try {
    var body = parseRequestBody_(e);

    if (!hasValidInternalSecret_(body.internalSecret)) {
      return jsonOutput_(errorEnvelope_(
        'UNAUTHORIZED',
        'Permintaan backend tidak terautentikasi.',
        requestId
      ));
    }

    var action = String(body.action || '');
    var data = body.data && typeof body.data === 'object' && !Array.isArray(body.data)
      ? body.data
      : {};

    return jsonOutput_(routeAction_(action, data, requestId));
  } catch (error) {
    // Jangan kembalikan detail exception kepada pemanggil.
    console.error('LMS API error [' + requestId + ']: ' + error);
    return jsonOutput_(errorEnvelope_(
      'INTERNAL_ERROR',
      'Terjadi kesalahan internal. Gunakan requestId untuk penelusuran log.',
      requestId
    ));
  }
}