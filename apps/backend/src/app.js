import { randomUUID } from 'node:crypto'
import cors from 'cors'
import express from 'express'
import { createAuthService } from './auth.js'

const REQUIRED_FIELDS = [
  'name',
  'email',
  'phone',
  'gender',
  'birth_date',
  'address',
  'race_category',
  'shirt_size',
  'emergency_contact_name',
  'emergency_contact_phone'
]

const RACE_CATEGORIES = ['5K', '10K']
const SHIRT_SIZES = ['S', 'M', 'L', 'XL', 'XXL']
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 50

function validateRegistration(body) {
  const errors = {}

  for (const field of REQUIRED_FIELDS) {
    if (typeof body[field] !== 'string' || body[field].trim() === '') {
      errors[field] = 'Field wajib diisi'
    }
  }

  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    errors.email = 'Format email tidak valid'
  }

  if (body.race_category && !RACE_CATEGORIES.includes(body.race_category)) {
    errors.race_category = 'Kategori lari tidak valid'
  }

  if (body.shirt_size && !SHIRT_SIZES.includes(body.shirt_size)) {
    errors.shirt_size = 'Ukuran jersey tidak valid'
  }

  if (body.agree_to_terms !== true) {
    errors.agree_to_terms = 'Persetujuan wajib diberikan'
  }

  return errors
}

function isDuplicateEmailError(error) {
  return error.code === 'ERR_SQLITE_ERROR'
    && /idx_registrations_event_email_unique/i.test(error.message)
}

function duplicateEmailResponse(response) {
  return response.status(409).json({
    error: {
      code: 'DUPLICATE_EMAIL',
      message: 'Email sudah terdaftar pada event ini',
      fields: {
        email: 'Email sudah terdaftar'
      }
    }
  })
}

function parsePositiveInteger(value, fallback, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value, 10)

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return fallback
  }

  return Math.min(parsed, maximum)
}

export function createApp(database, options = {}) {
  const app = express()
  const auth = createAuthService(database, options.auth ?? {})
  const allowedOrigins = options.allowedOrigins ?? []

  app.use(cors({
    credentials: true,
    origin(origin, callback) {
      const isAllowed = !origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)
      callback(null, isAllowed)
    }
  }))
  app.use(express.json())

  function requireAdmin(request, response) {
    if (auth.getSession(request)) {
      return true
    }

    response.status(401).json({
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Autentikasi admin diperlukan'
      }
    })
    return false
  }

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' })
  })

  app.get('/api/event', (_request, response) => {
    const event = database.prepare('SELECT * FROM events WHERE id = ?').get(1)
    response.json({ data: event })
  })

  app.post('/api/auth/login', (request, response) => {
    const { username, password } = request.body ?? {}

    if (!auth.validateCredentials(username, password)) {
      return response.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Username atau password salah'
        }
      })
    }

    auth.createSession(response)
    return response.json({
      data: { username }
    })
  })

  app.get('/api/auth/session', (request, response) => {
    const session = auth.getSession(request)

    if (!session) {
      return response.status(401).json({
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Autentikasi admin diperlukan'
        }
      })
    }

    return response.json({
      data: { username: session.username }
    })
  })

  app.post('/api/auth/logout', (request, response) => {
    auth.destroySession(request, response)
    return response.status(204).end()
  })

  app.post('/api/registrations', (request, response) => {
    const body = request.body ?? {}
    const errors = validateRegistration(body)

    if (Object.keys(errors).length > 0) {
      return response.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Data pendaftaran tidak valid',
          fields: errors
        }
      })
    }

    const registrationCode = `RUN-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`
    let result

    try {
      result = database.prepare(`
        INSERT INTO registrations (
          event_id,
          registration_code,
          name,
          email,
          phone,
          gender,
          birth_date,
          address,
          race_category,
          shirt_size,
          emergency_contact_name,
          emergency_contact_phone,
          medical_condition,
          agree_to_terms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        1,
        registrationCode,
        body.name.trim(),
        body.email.trim().toLowerCase(),
        body.phone.trim(),
        body.gender.trim(),
        body.birth_date.trim(),
        body.address.trim(),
        body.race_category,
        body.shirt_size,
        body.emergency_contact_name.trim(),
        body.emergency_contact_phone.trim(),
        typeof body.medical_condition === 'string' && body.medical_condition.trim()
          ? body.medical_condition.trim()
          : null,
        1
      )
    } catch (error) {
      if (isDuplicateEmailError(error)) {
        return duplicateEmailResponse(response)
      }

      throw error
    }

    return response.status(201).json({
      data: {
        id: Number(result.lastInsertRowid),
        registration_code: registrationCode
      }
    })
  })

  app.get('/api/registrations', (request, response) => {
    if (!requireAdmin(request, response)) return

    const page = parsePositiveInteger(request.query.page, 1)
    const pageSize = parsePositiveInteger(request.query.limit, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
    const search = typeof request.query.search === 'string'
      ? request.query.search.trim().toLowerCase()
      : ''
    const whereClause = search
      ? `WHERE
          instr(lower(name), ?) > 0 OR
          instr(lower(email), ?) > 0 OR
          instr(lower(registration_code), ?) > 0`
      : ''
    const searchParameters = search ? [search, search, search] : []
    const total = Number(database.prepare(`
      SELECT COUNT(*) AS total FROM registrations ${whereClause}
    `).get(...searchParameters).total)
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const offset = (page - 1) * pageSize

    const registrations = database.prepare(`
      SELECT * FROM registrations
      ${whereClause}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `).all(...searchParameters, pageSize, offset)

    const summary = database.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN race_category = '5K' THEN 1 ELSE 0 END) AS total_5k,
        SUM(CASE WHEN race_category = '10K' THEN 1 ELSE 0 END) AS total_10k
      FROM registrations
    `).get()

    response.json({
      data: registrations,
      pagination: {
        page,
        pageSize,
        total,
        totalPages
      },
      summary: {
        total: Number(summary.total),
        total5K: Number(summary.total_5k || 0),
        total10K: Number(summary.total_10k || 0)
      }
    })
  })

  app.put('/api/registrations/:id', (request, response) => {
    if (!requireAdmin(request, response)) return

    const registrationId = parsePositiveInteger(request.params.id, 0)
    const existingRegistration = database
      .prepare('SELECT * FROM registrations WHERE id = ?')
      .get(registrationId)

    if (!existingRegistration) {
      return response.status(404).json({
        error: {
          code: 'REGISTRATION_NOT_FOUND',
          message: 'Data peserta tidak ditemukan'
        }
      })
    }

    const body = request.body ?? {}
    const errors = validateRegistration({ ...body, agree_to_terms: true })

    if (Object.keys(errors).length > 0) {
      return response.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Data peserta tidak valid',
          fields: errors
        }
      })
    }

    try {
      database.prepare(`
        UPDATE registrations SET
          name = ?,
          email = ?,
          phone = ?,
          gender = ?,
          birth_date = ?,
          address = ?,
          race_category = ?,
          shirt_size = ?,
          emergency_contact_name = ?,
          emergency_contact_phone = ?,
          medical_condition = ?
        WHERE id = ?
      `).run(
        body.name.trim(),
        body.email.trim().toLowerCase(),
        body.phone.trim(),
        body.gender.trim(),
        body.birth_date.trim(),
        body.address.trim(),
        body.race_category,
        body.shirt_size,
        body.emergency_contact_name.trim(),
        body.emergency_contact_phone.trim(),
        typeof body.medical_condition === 'string' && body.medical_condition.trim()
          ? body.medical_condition.trim()
          : null,
        registrationId
      )
    } catch (error) {
      if (isDuplicateEmailError(error)) {
        return duplicateEmailResponse(response)
      }

      throw error
    }

    const updatedRegistration = database
      .prepare('SELECT * FROM registrations WHERE id = ?')
      .get(registrationId)

    return response.json({ data: updatedRegistration })
  })

  app.delete('/api/registrations/:id', (request, response) => {
    if (!requireAdmin(request, response)) return

    const registrationId = parsePositiveInteger(request.params.id, 0)
    const result = database
      .prepare('DELETE FROM registrations WHERE id = ?')
      .run(registrationId)

    if (result.changes === 0) {
      return response.status(404).json({
        error: {
          code: 'REGISTRATION_NOT_FOUND',
          message: 'Data peserta tidak ditemukan'
        }
      })
    }

    return response.status(204).end()
  })

  app.use((error, _request, response, _next) => {
    console.error(error)
    response.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Terjadi kesalahan pada server'
      }
    })
  })

  return app
}
