import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createApp } from '../src/app.js'
import { createDatabase } from '../src/database.js'

let database
let server
let baseUrl

const ADMIN_USERNAME = 'admin'
const ADMIN_PASSWORD = '123456'
const ADMIN_PASSWORD_HASH = 'run-event-admin-demo:0b9c76b24c3fb37d93675f151a1e3daed979d718c31fb086953e604b2392eca0cb46a3bdd25c230159eb5410385cec0176a0cb5c488135d2484469ec1eca42b7'

function readSessionCookie(response) {
  const setCookie = response.headers.get('set-cookie')
  assert.ok(setCookie, 'Response login harus mengirim cookie sesi')
  return setCookie.split(';', 1)[0]
}

async function loginAdmin(credentials = {}) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD,
      ...credentials
    })
  })

  return { response, cookie: response.ok ? readSessionCookie(response) : null }
}

before(async () => {
  database = createDatabase(':memory:')
  const app = createApp(database, {
    auth: {
      adminUsername: ADMIN_USERNAME,
      adminPasswordHash: ADMIN_PASSWORD_HASH,
      sessionTtlSeconds: 3600
    }
  })

  server = await new Promise((resolve) => {
    const runningServer = app.listen(0, () => resolve(runningServer))
  })

  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
  database.close()
})

test('health check mengembalikan status ok', async () => {
  const response = await fetch(`${baseUrl}/health`)
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.deepEqual(body, { status: 'ok' })
})

test('event seed dapat dibaca', async () => {
  const response = await fetch(`${baseUrl}/api/event`)
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.equal(body.data.id, 1)
  assert.equal(body.data.name, 'Campus Fun Run 2026')
})

test('daftar peserta menolak akses tanpa autentikasi', async () => {
  const response = await fetch(`${baseUrl}/api/registrations`)
  const body = await response.json()

  assert.equal(response.status, 401)
  assert.equal(body.error.code, 'AUTH_REQUIRED')
})

test('login menolak kredensial admin yang salah', async () => {
  const { response } = await loginAdmin({ password: 'password-salah' })
  const body = await response.json()

  assert.equal(response.status, 401)
  assert.equal(body.error.code, 'INVALID_CREDENTIALS')
  assert.equal(response.headers.get('set-cookie'), null)
})

test('login valid membuat sesi yang dapat mengakses endpoint terlindungi', async () => {
  const { response: loginResponse, cookie } = await loginAdmin()
  const loginBody = await loginResponse.json()

  assert.equal(loginResponse.status, 200)
  assert.equal(loginBody.data.username, ADMIN_USERNAME)
  assert.match(loginResponse.headers.get('set-cookie'), /HttpOnly/i)
  assert.match(loginResponse.headers.get('set-cookie'), /SameSite=Lax/i)

  const sessionResponse = await fetch(`${baseUrl}/api/auth/session`, {
    headers: { cookie }
  })
  const sessionBody = await sessionResponse.json()

  assert.equal(sessionResponse.status, 200)
  assert.equal(sessionBody.data.username, ADMIN_USERNAME)

  const registrationsResponse = await fetch(`${baseUrl}/api/registrations`, {
    headers: { cookie }
  })

  assert.equal(registrationsResponse.status, 200)
})

test('logout menghapus sesi dan menolak penggunaan cookie lama', async () => {
  const { cookie } = await loginAdmin()
  const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    headers: { cookie }
  })

  assert.equal(logoutResponse.status, 204)
  assert.match(logoutResponse.headers.get('set-cookie'), /run_event_admin_session=;/i)
  assert.match(logoutResponse.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/i)

  const sessionResponse = await fetch(`${baseUrl}/api/auth/session`, {
    headers: { cookie }
  })
  const sessionBody = await sessionResponse.json()

  assert.equal(sessionResponse.status, 401)
  assert.equal(sessionBody.error.code, 'AUTH_REQUIRED')
})

test('registrasi tidak valid ditolak', async () => {
  const response = await fetch(`${baseUrl}/api/registrations`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'bukan-email' })
  })
  const body = await response.json()

  assert.equal(response.status, 400)
  assert.equal(body.error.code, 'VALIDATION_ERROR')
  assert.equal(body.error.fields.email, 'Format email tidak valid')
  assert.equal(body.error.fields.name, 'Field wajib diisi')
})

test('registrasi valid disimpan dan dapat dibaca kembali', async () => {
  const participant = {
    name: 'Budi Santoso',
    email: 'budi@example.com',
    phone: '081234567890',
    gender: 'Laki-laki',
    birth_date: '2000-01-15',
    address: 'Jl. Merdeka No. 10',
    race_category: '5K',
    shirt_size: 'L',
    emergency_contact_name: 'Siti Santoso',
    emergency_contact_phone: '081298765432',
    medical_condition: '',
    agree_to_terms: true
  }

  const createResponse = await fetch(`${baseUrl}/api/registrations`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(participant)
  })
  const createBody = await createResponse.json()

  assert.equal(createResponse.status, 201)
  assert.match(createBody.data.registration_code, /^RUN-/)

  const { cookie } = await loginAdmin()
  const listResponse = await fetch(`${baseUrl}/api/registrations`, {
    headers: { cookie }
  })
  const listBody = await listResponse.json()

  assert.equal(listResponse.status, 200)
  assert.equal(listBody.data.length, 1)
  assert.equal(listBody.pagination.page, 1)
  assert.equal(listBody.pagination.pageSize, 10)
  assert.equal(listBody.pagination.total, 1)
  assert.equal(listBody.summary.total, 1)
  assert.equal(listBody.data[0].email, participant.email)
  assert.equal(listBody.data[0].race_category, participant.race_category)
  assert.equal(listBody.data[0].registration_code, createBody.data.registration_code)
})

test('registrasi dengan email yang sama ditolak tanpa membedakan huruf besar kecil', async () => {
  const participant = {
    name: 'Peserta Duplikat',
    email: 'duplikat@example.com',
    phone: '081200000001',
    gender: 'Perempuan',
    birth_date: '2001-02-20',
    address: 'Jl. Pengujian No. 2',
    race_category: '10K',
    shirt_size: 'M',
    emergency_contact_name: 'Kontak Duplikat',
    emergency_contact_phone: '081200000002',
    medical_condition: '',
    agree_to_terms: true
  }

  const firstResponse = await fetch(`${baseUrl}/api/registrations`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(participant)
  })
  assert.equal(firstResponse.status, 201)

  const duplicateResponse = await fetch(`${baseUrl}/api/registrations`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...participant, email: 'DUPLIKAT@example.com' })
  })
  const duplicateBody = await duplicateResponse.json()

  assert.equal(duplicateResponse.status, 409)
  assert.equal(duplicateBody.error.code, 'DUPLICATE_EMAIL')
  assert.equal(duplicateBody.error.fields.email, 'Email sudah terdaftar')
})
