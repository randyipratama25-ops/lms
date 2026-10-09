/**
 * Router action untuk API LMS. Action berikutnya ditambahkan pada tahap modul.
 */

function routeAction_(action, data, requestId) {
  if (!isValidActionName_(action)) {
    return errorEnvelope_('INVALID_ACTION', 'Nama action tidak valid.', requestId);
  }

  switch (action) {
    case 'health.check':
      return healthCheck_(requestId);
    default:
      return errorEnvelope_(
        'NOT_IMPLEMENTED',
        'Action "' + action + '" belum tersedia pada Tahap 2.',
        requestId
      );
  }
}

function healthCheck_(requestId) {
  var database = getDatabaseHealth_();
  var status = database.accessible ? 'ok' : (database.configured ? 'unavailable' : 'setup_required');

  return {
    success: true,
    message: 'Pemeriksaan API selesai.',
    data: {
      service: 'lms-sekolah-madrasah',
      api: 'ok',
      status: status,
      database: database,
      timezone: Session.getScriptTimeZone(),
      checkedAt: new Date().toISOString()
    },
    requestId: requestId
  };
}