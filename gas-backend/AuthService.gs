/**
 * Autentikasi Tahap 3.
 *
 * Password: PBKDF2-HMAC-SHA256, salt unik 32 byte, 600.000 iterasi.
 * Session: token acak hanya dikirim sekali; yang disimpan pada sheet adalah SHA-256(token).
 * Satu sesi aktif per akun agar tabel Sessions tetap bounded untuk skala MVP.
 */
var LMS_PASSWORD_HASH_ITERATIONS = 600000;
var LMS_SESSION_TTL_SECONDS = 7200;
var LMS_LOGIN_LOCK_SECONDS = 900;
var LMS_LOGIN_MAX_FAILURES = 8;
var LMS_IP_MAX_FAILURES = 60;

function authLogin_(data, requestId, clientIp) {
  var username = typeof data.username === 'string' ? data.username.trim().toLowerCase() : '';
  var password = typeof data.password === 'string' ? data.password : '';

  if (!/^[a-z0-9._-]{3,64}$/.test(username) || password.length < 1 || password.length > 128) {
    return errorEnvelope_('INVALID_CREDENTIALS', 'Username atau password tidak valid.', requestId);
  }

  var throttle = getLoginThrottleState_(username, clientIp);
  if (throttle.locked) {
    return errorEnvelope_('ACCOUNT_LOCKED', 'Terlalu banyak percobaan login. Coba kembali setelah 15 menit.', requestId);
  }

  var user = findUserByUsername_(username);
  var passwordMatches = false;
  if (user && normalizeStatus_(user.status) === 'active' && typeof user.password_hash === 'string' && user.password_hash) {
    passwordMatches = verifyPassword_(password, user.password_hash);
  }

  if (!passwordMatches) {
    var attemptState = recordLoginFailure_(username, clientIp);
    if (attemptState.locked) {
      return errorEnvelope_('ACCOUNT_LOCKED', 'Terlalu banyak percobaan login. Coba kembali setelah 15 menit.', requestId);
    }
    return errorEnvelope_('INVALID_CREDENTIALS', 'Username atau password tidak valid.', requestId);
  }

  clearLoginUserFailures_(username);
  var session = issueSession_(user);
  return {
    success: true,
    message: 'Login berhasil.',
    data: {
      user: publicUser_(user),
      sessionToken: session.token,
      expiresAt: session.expiresAt
    },
    requestId: requestId
  };
}

function authMe_(sessionToken, requestId) {
  var principal = validateSession_(sessionToken);
  if (!principal) {
    return errorEnvelope_('UNAUTHENTICATED', 'Sesi tidak valid atau telah berakhir. Silakan login kembali.', requestId);
  }

  return {
    success: true,
    message: 'Sesi aktif.',
    data: {
      user: publicUser_(principal.user),
      expiresAt: principal.expiresAt
    },
    requestId: requestId
  };
}

function authLogout_(sessionToken, requestId) {
  if (typeof sessionToken === 'string' && sessionToken) {
    revokeSession_(sessionToken);
  }
  // Logout idempoten agar browser selalu dapat menghapus cookie lokal.
  return {
    success: true,
    message: 'Logout berhasil.',
    data: { loggedOut: true },
    requestId: requestId
  };
}

function findUserByUsername_(username) {
  var normalized = String(username || '').trim().toLowerCase();
  var users = readRowsAsObjects_('Users');
  for (var i = 0; i < users.length; i += 1) {
    if (String(users[i].username || '').trim().toLowerCase() === normalized) return users[i];
  }
  return null;
}

function findUserById_(userId) {
  var users = readRowsAsObjects_('Users');
  for (var i = 0; i < users.length; i += 1) {
    if (String(users[i].user_id || '') === String(userId || '')) return users[i];
  }
  return null;
}

function publicUser_(user) {
  return {
    userId: String(user.user_id),
    username: String(user.username),
    role: normalizeRole_(user.role)
  };
}

function normalizeRole_(role) {
  var value = String(role || '').trim().toLowerCase();
  if (value === 'administrator') value = 'admin';
  if (value === 'guru') value = 'teacher';
  if (value === 'siswa') value = 'student';
  return value;
}

function normalizeStatus_(status) {
  var value = String(status || '').trim().toLowerCase();
  if (value === 'aktif') value = 'active';
  if (value === 'nonaktif') value = 'inactive';
  return value;
}

function issueSession_(user) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    var tokenHash = sha256Hex_(token);
    var issuedAt = new Date();
    var expiresAt = new Date(issuedAt.getTime() + LMS_SESSION_TTL_SECONDS * 1000);
    var sheet = getSheetByName_('Sessions');
    var lastRow = sheet.getLastRow();
    var existingRow = 0;

    if (lastRow >= 2) {
      var existing = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
      for (var i = 0; i < existing.length; i += 1) {
        if (String(existing[i][1]) === String(user.user_id)) {
          existingRow = i + 2;
          break;
        }
      }
    }

    var row = [
      tokenHash,
      String(user.user_id),
      normalizeRole_(user.role),
      issuedAt.toISOString(),
      expiresAt.toISOString(),
      'active',
      ''
    ];

    if (existingRow) {
      // Policy MVP: one active browser session per account; new login invalidates the old token.
      sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }

    return { token: token, expiresAt: expiresAt.toISOString() };
  } finally {
    lock.releaseLock();
  }
}

function validateSession_(token) {
  if (typeof token !== 'string' || token.length < 32 || token.length > 256) return null;

  var tokenHash = sha256Hex_(token);
  var sheet = getSheetByName_('Sessions');
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  var rows = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  var now = Date.now();

  for (var i = 0; i < rows.length; i += 1) {
    var row = rows[i];
    if (String(row[0]) !== tokenHash || String(row[5]) !== 'active') continue;

    var expiresAt = new Date(row[4]).getTime();
    if (!isFinite(expiresAt) || expiresAt <= now) return null;

    var user = findUserById_(row[1]);
    if (!user || normalizeStatus_(user.status) !== 'active') return null;

    return { user: user, expiresAt: new Date(expiresAt).toISOString() };
  }
  return null;
}

function revokeSession_(token) {
  if (typeof token !== 'string' || token.length < 32 || token.length > 256) return false;
  var tokenHash = sha256Hex_(token);
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = getSheetByName_('Sessions');
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return false;

    var rows = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
    for (var i = 0; i < rows.length; i += 1) {
      if (String(rows[i][0]) === tokenHash) {
        sheet.getRange(i + 2, 6, 1, 2).setValues([['revoked', new Date().toISOString()]]);
        return true;
      }
    }
    return false;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Dipakai oleh pemilik script untuk membuat akun awal tanpa menaruh password di source.
 *
 * Isi Script Properties:
 * LMS_BOOTSTRAP_USERNAME
 * LMS_BOOTSTRAP_PASSWORD (minimal 12 karakter)
 * LMS_BOOTSTRAP_ROLE = admin | teacher | student (opsional; default admin)
 *
 * Jalankan fungsi ini dari editor Apps Script. Kredensial bootstrap dihapus setelah sukses.
 */
function bootstrapUserFromProperties() {
  var props = PropertiesService.getScriptProperties();
  var username = String(props.getProperty('LMS_BOOTSTRAP_USERNAME') || '').trim().toLowerCase();
  var password = String(props.getProperty('LMS_BOOTSTRAP_PASSWORD') || '');
  var role = normalizeRole_(props.getProperty('LMS_BOOTSTRAP_ROLE') || 'admin');

  if (!/^[a-z0-9._-]{3,64}$/.test(username)) {
    throw new Error('LMS_BOOTSTRAP_USERNAME harus 3–64 karakter: huruf kecil, angka, titik, garis bawah, atau tanda hubung.');
  }
  if (password.length < 12 || password.length > 128) {
    throw new Error('LMS_BOOTSTRAP_PASSWORD harus berisi 12–128 karakter. Tidak ada akun yang dibuat.');
  }
  if (['admin', 'teacher', 'student'].indexOf(role) === -1) {
    throw new Error('LMS_BOOTSTRAP_ROLE tidak valid. Pilih admin, teacher, atau student.');
  }
  if (findUserByUsername_(username)) {
    throw new Error('Username sudah ada. Tidak ada data yang diubah.');
  }

  var now = new Date().toISOString();
  var record = {
    user_id: 'USR-' + Utilities.getUuid().replace(/-/g, '').toUpperCase(),
    username: username,
    password_hash: hashPassword_(password),
    role: role,
    status: 'active',
    created_at: now,
    updated_at: now
  };

  appendRecord_('Users', record);
  props.deleteProperty('LMS_BOOTSTRAP_PASSWORD');
  props.deleteProperty('LMS_BOOTSTRAP_USERNAME');
  props.deleteProperty('LMS_BOOTSTRAP_ROLE');
  console.log('Akun bootstrap berhasil dibuat: ' + username + ' (' + role + '). Password tidak dicatat.');
  return { created: true, username: username, role: role };
}

function hashPassword_(password) {
  var saltBytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    Utilities.getUuid() + Utilities.getUuid(),
    Utilities.Charset.UTF_8
  );
  var saltHex = bytesToHex_(saltBytes);
  var derivedBytes = pbkdf2Sha256_(password, saltBytes, LMS_PASSWORD_HASH_ITERATIONS);
  return 'pbkdf2_sha256$' + LMS_PASSWORD_HASH_ITERATIONS + '$' + saltHex + '$' + Utilities.base64EncodeWebSafe(derivedBytes).replace(/=+$/g, '');
}

function verifyPassword_(password, encodedHash) {
  var parts = String(encodedHash || '').split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2_sha256') return false;

  var iterations = Number(parts[1]);
  if (!isFinite(iterations) || iterations < 100000 || iterations > 1000000) return false;
  if (!/^[a-f0-9]{64}$/i.test(parts[2]) || !/^[A-Za-z0-9_-]{40,50}$/.test(parts[3])) return false;

  var calculated = Utilities.base64EncodeWebSafe(
    pbkdf2Sha256_(password, hexToBytes_(parts[2]), iterations)
  ).replace(/=+$/g, '');
  return constantTimeStringEquals_(calculated, parts[3]);
}

/**
 * PBKDF2-HMAC-SHA256, satu blok output 32 byte.
 * Utilities melakukan primitive HMAC; password tidak disimpan atau dicatat.
 */
function pbkdf2Sha256_(password, saltBytes, iterations) {
  var passwordBytes = Utilities.newBlob(password, 'text/plain').getBytes();
  var initialMessage = saltBytes.concat([0, 0, 0, 1]);
  var u = Utilities.computeHmacSha256Signature(initialMessage, passwordBytes);
  var output = u.slice();

  for (var round = 1; round < iterations; round += 1) {
    u = Utilities.computeHmacSha256Signature(u, passwordBytes);
    for (var index = 0; index < output.length; index += 1) {
      var value = ((output[index] & 255) ^ (u[index] & 255));
      output[index] = value > 127 ? value - 256 : value;
    }
  }
  return output;
}

function sha256Hex_(value) {
  return bytesToHex_(Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(value),
    Utilities.Charset.UTF_8
  ));
}

function bytesToHex_(bytes) {
  return bytes.map(function (value) {
    var unsigned = (value + 256) % 256;
    return ('0' + unsigned.toString(16)).slice(-2);
  }).join('');
}

function hexToBytes_(hex) {
  var bytes = [];
  for (var index = 0; index < hex.length; index += 2) {
    var value = parseInt(hex.substr(index, 2), 16);
    bytes.push(value > 127 ? value - 256 : value);
  }
  return bytes;
}

function constantTimeStringEquals_(left, right) {
  left = String(left);
  right = String(right);
  var max = Math.max(left.length, right.length);
  var diff = left.length ^ right.length;
  for (var i = 0; i < max; i += 1) {
    diff |= (left.charCodeAt(i) || 0) ^ (right.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function loginThrottleKey_(type, value) {
  return 'LMS_LOGIN_' + type + '_' + sha256Hex_(String(value || 'unknown')).substring(0, 40);
}

function getLoginThrottleState_(username, clientIp) {
  var cache = CacheService.getScriptCache();
  var usernameLocked = cache.get(loginThrottleKey_('USER_LOCK', username));
  var ipLocked = clientIp ? cache.get(loginThrottleKey_('IP_LOCK', clientIp)) : null;
  return { locked: Boolean(usernameLocked || ipLocked) };
}

function recordLoginFailure_(username, clientIp) {
  var cache = CacheService.getScriptCache();
  var lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    var userCountKey = loginThrottleKey_('USER_COUNT', username);
    var userCount = Number(cache.get(userCountKey) || 0) + 1;
    cache.put(userCountKey, String(userCount), LMS_LOGIN_LOCK_SECONDS);
    var locked = userCount >= LMS_LOGIN_MAX_FAILURES;
    if (locked) cache.put(loginThrottleKey_('USER_LOCK', username), '1', LMS_LOGIN_LOCK_SECONDS);

    if (clientIp) {
      var ipCountKey = loginThrottleKey_('IP_COUNT', clientIp);
      var ipCount = Number(cache.get(ipCountKey) || 0) + 1;
      cache.put(ipCountKey, String(ipCount), LMS_LOGIN_LOCK_SECONDS);
      if (ipCount >= LMS_IP_MAX_FAILURES) {
        cache.put(loginThrottleKey_('IP_LOCK', clientIp), '1', LMS_LOGIN_LOCK_SECONDS);
        locked = true;
      }
    }
    return { locked: locked };
  } finally {
    lock.releaseLock();
  }
}

function clearLoginUserFailures_(username) {
  var cache = CacheService.getScriptCache();
  cache.remove(loginThrottleKey_('USER_COUNT', username));
  cache.remove(loginThrottleKey_('USER_LOCK', username));
}
