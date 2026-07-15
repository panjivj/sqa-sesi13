import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createApp } from '../src/app.js'
import { createDatabase } from '../src/database.js'

let database
let server
let baseUrl

before(async () => {
  database = createDatabase(':memory:')
  const app = createApp(database)

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

  const listResponse = await fetch(`${baseUrl}/api/registrations`)
  const listBody = await listResponse.json()

  assert.equal(listResponse.status, 200)
  assert.equal(listBody.data.length, 1)
  assert.equal(listBody.data[0].email, participant.email)
  assert.equal(listBody.data[0].race_category, participant.race_category)
  assert.equal(listBody.data[0].registration_code, createBody.data.registration_code)
})
