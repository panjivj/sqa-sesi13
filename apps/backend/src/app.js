import { randomUUID } from 'node:crypto'
import cors from 'cors'
import express from 'express'

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

export function createApp(database) {
  const app = express()

  app.use(cors())
  app.use(express.json())

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' })
  })

  app.get('/api/event', (_request, response) => {
    const event = database.prepare('SELECT * FROM events WHERE id = ?').get(1)
    response.json({ data: event })
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
    const result = database.prepare(`
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
      body.email.trim(),
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

    return response.status(201).json({
      data: {
        id: Number(result.lastInsertRowid),
        registration_code: registrationCode
      }
    })
  })

  app.get('/api/registrations', (_request, response) => {
    const registrations = database.prepare(`
      SELECT * FROM registrations ORDER BY id DESC
    `).all()

    response.json({ data: registrations })
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
