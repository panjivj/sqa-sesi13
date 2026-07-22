import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual
} from 'node:crypto'

export const ADMIN_SESSION_COOKIE = 'run_event_admin_session'

function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

function safelyCompareText(actual, expected) {
  const actualDigest = createHash('sha256').update(actual).digest()
  const expectedDigest = createHash('sha256').update(expected).digest()
  return timingSafeEqual(actualDigest, expectedDigest)
}

function verifyPassword(password, storedPasswordHash) {
  const separatorIndex = storedPasswordHash.indexOf(':')

  if (separatorIndex <= 0) {
    return false
  }

  const salt = storedPasswordHash.slice(0, separatorIndex)
  const expectedHex = storedPasswordHash.slice(separatorIndex + 1)

  if (!/^[a-f0-9]{128}$/i.test(expectedHex)) {
    return false
  }

  const actualHash = scryptSync(password, salt, 64)
  const expectedHash = Buffer.from(expectedHex, 'hex')
  return timingSafeEqual(actualHash, expectedHash)
}

function readCookie(request, name) {
  const cookieHeader = request.headers.cookie

  if (!cookieHeader) {
    return null
  }

  for (const part of cookieHeader.split(';')) {
    const separatorIndex = part.indexOf('=')

    if (separatorIndex === -1) {
      continue
    }

    const cookieName = part.slice(0, separatorIndex).trim()
    if (cookieName === name) {
      return part.slice(separatorIndex + 1).trim()
    }
  }

  return null
}

export function createAuthService(database, options) {
  const {
    adminUsername,
    adminPasswordHash,
    sessionTtlSeconds = 3600,
    secureCookies = false
  } = options

  if (!adminUsername || !adminPasswordHash) {
    throw new Error('Konfigurasi ADMIN_USERNAME dan ADMIN_PASSWORD_HASH wajib diisi')
  }

  if (!Number.isSafeInteger(sessionTtlSeconds) || sessionTtlSeconds <= 0) {
    throw new Error('ADMIN_SESSION_TTL_SECONDS harus berupa bilangan bulat positif')
  }

  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookies,
    path: '/',
    maxAge: sessionTtlSeconds * 1000
  }

  function validateCredentials(username, password) {
    if (typeof username !== 'string' || typeof password !== 'string') {
      return false
    }

    const usernameMatches = safelyCompareText(username, adminUsername)
    const passwordMatches = verifyPassword(password, adminPasswordHash)
    return usernameMatches && passwordMatches
  }

  function createSession(response) {
    const token = randomBytes(32).toString('base64url')
    const tokenHash = hashSessionToken(token)
    const expiresAt = Date.now() + sessionTtlSeconds * 1000

    database.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?').run(Date.now())
    database.prepare(`
      INSERT INTO admin_sessions (token_hash, username, expires_at)
      VALUES (?, ?, ?)
    `).run(tokenHash, adminUsername, expiresAt)

    response.cookie(ADMIN_SESSION_COOKIE, token, cookieOptions)
  }

  function getSession(request) {
    const token = readCookie(request, ADMIN_SESSION_COOKIE)

    if (!token) {
      return null
    }

    const tokenHash = hashSessionToken(token)
    const session = database.prepare(`
      SELECT username, expires_at
      FROM admin_sessions
      WHERE token_hash = ?
    `).get(tokenHash)

    if (!session) {
      return null
    }

    if (session.expires_at <= Date.now()) {
      database.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(tokenHash)
      return null
    }

    return session
  }

  function destroySession(request, response) {
    const token = readCookie(request, ADMIN_SESSION_COOKIE)

    if (token) {
      database.prepare('DELETE FROM admin_sessions WHERE token_hash = ?')
        .run(hashSessionToken(token))
    }

    response.clearCookie(ADMIN_SESSION_COOKIE, {
      httpOnly: true,
      sameSite: 'lax',
      secure: secureCookies,
      path: '/'
    })
  }

  return {
    createSession,
    destroySession,
    getSession,
    validateCredentials
  }
}
