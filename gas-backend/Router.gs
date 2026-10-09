/**
 * Router action API LMS.
 * Semua action selain health.check, auth.login dan auth.logout memerlukan sesi aktif.
 */
function routeAction_(action, data, requestId, sessionToken, clientIp) {
  if (!isValidActionName_(action)) {
    return errorEnvelope_('INVALID_ACTION', 'Nama action tidak valid.', requestId);
  }

  if (action === 'health.check') return healthCheck_(requestId);
  if (action === 'auth.login') return authLogin_(data, requestId, clientIp);
  if (action === 'auth.logout') return authLogout_(sessionToken, requestId);
  if (action === 'auth.me') return authMe_(sessionToken, requestId);

  var principal = validateSession_(sessionToken);
  if (!principal) {
    return errorEnvelope_('UNAUTHENTICATED', 'Sesi tidak valid atau telah berakhir. Silakan login kembali.', requestId);
  }

  // Modul domain berikutnya harus menerima principal dan menegakkan role serta ownership
  // di backend. Jangan mengandalkan route guard frontend sebagai kontrol keamanan.
  return errorEnvelope_(
    'NOT_IMPLEMENTED',
    'Action "' + action + '" belum tersedia. Sesi pengguna sudah tervalidasi.',
    requestId
  );
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
