/**
 * Router action API.
 * Login password verification is handled by Vercel native crypto through internal bridge actions.
 */
function routeAction_(action, data, requestId, sessionToken, clientIp) {
  if (!isValidActionName_(action)) {
    return errorEnvelope_('INVALID_ACTION', 'Nama action tidak valid.', requestId);
  }

  if (action === 'health.check') return healthCheck_(requestId);
  if (action === 'auth.credentials.lookup') return authCredentialsLookup_(data, requestId, clientIp);
  if (action === 'auth.login.failed') return authLoginFailed_(data, requestId, clientIp);
  if (action === 'auth.session.issue') return authSessionIssue_(data, requestId, clientIp);
  if (action === 'auth.login') {
    return errorEnvelope_('AUTH_PROXY_REQUIRED', 'Login harus melalui proxy Vercel.', requestId);
  }
  if (action === 'auth.logout') return authLogout_(sessionToken, requestId);
  if (action === 'auth.me') return authMe_(sessionToken, requestId);

  var principal = validateSession_(sessionToken);
  if (!principal) {
    return errorEnvelope_('UNAUTHENTICATED', 'Sesi tidak valid atau telah berakhir. Silakan login kembali.', requestId);
  }

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
