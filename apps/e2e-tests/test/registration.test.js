import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { Builder, By, until } from 'selenium-webdriver'
import chrome from 'selenium-webdriver/chrome.js'

dotenv.config({
  path: fileURLToPath(new URL('../../../.env', import.meta.url)),
  quiet: true
})

const REQUIRED_PARTICIPANT_FIELDS = [
  'name',
  'email',
  'phone',
  'gender',
  'birthDate',
  'address',
  'raceCategory',
  'shirtSize',
  'emergencyName',
  'emergencyPhone'
]

function readMode() {
  const modeIndex = process.argv.indexOf('--mode')
  const mode = modeIndex >= 0 ? process.argv[modeIndex + 1] : undefined

  if (!['dev', 'prod'].includes(mode)) {
    throw new Error('Mode wajib dipilih: gunakan --mode dev atau --mode prod')
  }

  return mode
}

function readNonNegativeNumber(name, fallback) {
  const value = Number(process.env[name] ?? fallback)

  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} harus berupa angka nol atau lebih besar`)
  }

  return value
}

function readBoolean(name, fallback) {
  const value = String(process.env[name] ?? fallback).toLowerCase()

  if (!['true', 'false'].includes(value)) {
    throw new Error(`${name} harus bernilai true atau false`)
  }

  return value === 'true'
}

function loadConfiguration() {
  const mode = readMode()
  const isProduction = mode === 'prod'
  const publicUrl = isProduction
    ? process.env.PROD_PUBLIC_WEB_URL
    : process.env.DEV_PUBLIC_WEB_URL || 'http://localhost:5173'
  const adminUrl = isProduction
    ? process.env.PROD_ADMIN_DASHBOARD_URL
    : process.env.DEV_ADMIN_DASHBOARD_URL || 'http://localhost:5174'
  const adminUsername = process.env.SELENIUM_ADMIN_USERNAME
  const adminPassword = process.env.SELENIUM_ADMIN_PASSWORD

  if (!publicUrl || !adminUrl) {
    throw new Error(`URL public web dan dashboard untuk mode ${mode} wajib diisi di .env`)
  }

  if (!adminUsername || !adminPassword) {
    throw new Error('SELENIUM_ADMIN_USERNAME dan SELENIUM_ADMIN_PASSWORD wajib diisi di .env')
  }

  const normalizedPublicUrl = publicUrl.replace(/\/$/, '')
  const normalizedAdminUrl = adminUrl.replace(/\/$/, '')

  if (isProduction) {
    for (const [label, value] of [['public web', normalizedPublicUrl], ['admin dashboard', normalizedAdminUrl]]) {
      const url = new URL(value)
      const localHosts = ['localhost', '127.0.0.1', '::1']

      if (url.protocol !== 'https:') {
        throw new Error(`URL production ${label} wajib menggunakan https`)
      }

      if (localHosts.includes(url.hostname) || url.hostname.endsWith('.localhost')) {
        throw new Error(`URL production ${label} tidak boleh mengarah ke localhost`)
      }
    }
  }

  const snapChromeBinary = '/snap/chromium/current/usr/lib/chromium-browser/chrome'

  return {
    mode,
    publicUrl: normalizedPublicUrl,
    adminUrl: normalizedAdminUrl,
    adminUsername,
    adminPassword,
    headless: readBoolean('SELENIUM_HEADLESS', false),
    stepDelay: readNonNegativeNumber('SELENIUM_STEP_DELAY_MS', 500),
    pauseAfterTest: readNonNegativeNumber('SELENIUM_PAUSE_AFTER_TEST_MS', 3000),
    timeout: readNonNegativeNumber('SELENIUM_TIMEOUT_MS', 15000),
    chromeBinary: process.env.SELENIUM_CHROME_BINARY
      || (existsSync(snapChromeBinary) ? snapChromeBinary : '')
  }
}

async function checkTarget(label, url, timeout) {
  let response

  try {
    response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(timeout)
    })
  } catch (error) {
    throw new Error(`${label} tidak dapat diakses di ${url}: ${error.message}`)
  }

  if (!response.ok) {
    throw new Error(`${label} mengembalikan HTTP ${response.status}`)
  }
}

function validateParticipant(fixtureName, participant) {
  if (!participant || typeof participant !== 'object') {
    throw new Error(`Dataset ${fixtureName} wajib berupa object`)
  }

  for (const field of REQUIRED_PARTICIPANT_FIELDS) {
    if (typeof participant[field] !== 'string' || participant[field].trim() === '') {
      throw new Error(`Field ${fixtureName}.${field} wajib berupa teks dan tidak boleh kosong`)
    }
  }

  if (!['Laki-laki', 'Perempuan'].includes(participant.gender)) {
    throw new Error(`Field ${fixtureName}.gender tidak valid`)
  }

  if (!['5K', '10K'].includes(participant.raceCategory)) {
    throw new Error(`Field ${fixtureName}.raceCategory tidak valid`)
  }

  if (!['S', 'M', 'L', 'XL', 'XXL'].includes(participant.shirtSize)) {
    throw new Error(`Field ${fixtureName}.shirtSize tidak valid`)
  }
}

async function loadParticipants() {
  const fixturePath = fileURLToPath(new URL('../fixtures/participants.json', import.meta.url))
  const requiredFixtures = [
    'registrationSuccess',
    'registrationInvalid',
    'registrationDuplicate',
    'registrationSearch',
    'registrationEdit',
    'registrationEditConflictSource',
    'registrationEditConflictTarget',
    'registrationDeleteCancel',
    'registrationDelete'
  ]
  let fixtures

  try {
    fixtures = JSON.parse(await readFile(fixturePath, 'utf8'))
  } catch (error) {
    throw new Error(`Dataset Selenium tidak dapat dibaca dari ${fixturePath}: ${error.message}`)
  }

  const runId = `${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}-${Date.now().toString().slice(-4)}`
  const participants = {}

  for (const fixtureName of requiredFixtures) {
    const participant = fixtures[fixtureName]
    validateParticipant(fixtureName, participant)

    if (!participant.email.includes('{{runId}}')) {
      throw new Error(`Field ${fixtureName}.email wajib memiliki placeholder {{runId}}`)
    }

    participants[fixtureName] = Object.fromEntries(
      Object.entries(participant).map(([key, value]) => [
        key,
        typeof value === 'string' ? value.replaceAll('{{runId}}', runId) : value
      ])
    )
  }

  return participants
}

async function createDriver(config) {
  const options = new chrome.Options()
  options.addArguments('--window-size=1440,1100')

  if (config.headless) {
    options.addArguments('--headless=new', '--no-sandbox', '--disable-dev-shm-usage')
  }

  if (config.chromeBinary) {
    options.setChromeBinaryPath(config.chromeBinary)
  }

  return new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build()
}

async function saveFailureScreenshot(driver, testCaseId, mode) {
  const screenshotDirectory = fileURLToPath(new URL('../screenshots', import.meta.url))
  const filePath = `${screenshotDirectory}/failure-${testCaseId}-${mode}-${Date.now()}.png`

  await mkdir(screenshotDirectory, { recursive: true })
  await writeFile(filePath, await driver.takeScreenshot(), 'base64')
  console.error(`Screenshot kegagalan ${testCaseId} disimpan: ${filePath}`)
}

const config = loadConfiguration()
const participants = await loadParticipants()
const delay = async () => {
  if (config.stepDelay > 0) {
    await new Promise((resolve) => setTimeout(resolve, config.stepDelay))
  }
}

async function openRegistrationPage(driver) {
  await driver.get(config.publicUrl)
  const eventName = await driver.wait(
    until.elementLocated(By.css('[data-testid="event-name"]')),
    config.timeout
  )
  await driver.wait(until.elementIsVisible(eventName), config.timeout)
}

async function fillInput(driver, testId, value) {
  const element = await driver.findElement(By.css(`[data-testid="${testId}"]`))
  await element.clear()
  await element.sendKeys(value)
  await delay()
}

async function fillParticipant(driver, participant) {
  await fillInput(driver, 'name-input', participant.name)
  await fillInput(driver, 'email-input', participant.email)
  await fillInput(driver, 'phone-input', participant.phone)
  await driver.findElement(By.css(`[data-testid="gender-select"] option[value="${participant.gender}"]`)).click()
  await delay()

  const birthDateInput = await driver.findElement(By.css('[data-testid="birth-date-input"]'))
  await driver.executeScript(
    "arguments[0].value = arguments[1]; arguments[0].dispatchEvent(new Event('input', { bubbles: true }))",
    birthDateInput,
    participant.birthDate
  )
  await delay()

  await fillInput(driver, 'address-input', participant.address)
  await driver.findElement(By.css(`[data-testid="race-category-select"] option[value="${participant.raceCategory}"]`)).click()
  await delay()
  await driver.findElement(By.css(`[data-testid="shirt-size-select"] option[value="${participant.shirtSize}"]`)).click()
  await delay()
  await fillInput(driver, 'emergency-name-input', participant.emergencyName)
  await fillInput(driver, 'emergency-phone-input', participant.emergencyPhone)
  await fillInput(driver, 'medical-condition-input', participant.medicalCondition || '')

  const agreement = await driver.findElement(By.css('[data-testid="agree-terms-input"]'))
  if (!(await agreement.isSelected())) await agreement.click()
  await delay()
}

async function submitValidRegistration(driver) {
  await driver.findElement(By.css('[data-testid="submit-registration"]')).click()
  const successMessage = await driver.wait(
    until.elementLocated(By.css('[data-testid="registration-success"]')),
    config.timeout
  )
  await driver.wait(until.elementIsVisible(successMessage), config.timeout)

  const registrationCode = await driver
    .findElement(By.css('[data-testid="registration-code"]'))
    .getText()

  assert.match(registrationCode, /^RUN-/)
  return registrationCode
}

async function loginAsAdmin(driver) {
  await driver.get(config.adminUrl)
  const loginForm = await driver.wait(
    until.elementLocated(By.css('[data-testid="admin-login-form"]')),
    config.timeout
  )
  await driver.wait(until.elementIsVisible(loginForm), config.timeout)

  await fillInput(driver, 'admin-username-input', config.adminUsername)
  await fillInput(driver, 'admin-password-input', config.adminPassword)
  await driver.findElement(By.css('[data-testid="admin-login-submit"]')).click()

  const dashboard = await driver.wait(
    until.elementLocated(By.css('[data-testid="admin-dashboard"]')),
    config.timeout
  )
  await driver.wait(until.elementIsVisible(dashboard), config.timeout)
}

async function findRegistrationRow(driver, email) {
  const rows = await driver.findElements(By.css('[data-testid="registration-row"]'))

  for (const row of rows) {
    if ((await row.getAttribute('data-registration-email')) === email.toLowerCase()) {
      return row
    }
  }

  throw new Error(`Peserta ${email} tidak ditemukan pada dashboard`)
}

async function searchRegistrations(driver, keyword, expectedTotal) {
  const searchInput = await driver.wait(
    until.elementLocated(By.css('[data-testid="registration-search"]')),
    config.timeout
  )
  await searchInput.clear()
  await searchInput.sendKeys(keyword)

  const filteredCount = await driver.findElement(
    By.css('[data-testid="filtered-registration-count"]')
  )
  await driver.wait(
    until.elementTextMatches(filteredCount, new RegExp(`^${expectedTotal} dari `, 'i')),
    config.timeout
  )

  return {
    filteredCount,
    rows: await driver.findElements(By.css('[data-testid="registration-row"]'))
  }
}

async function openEditForm(driver, row) {
  await row.findElement(By.css('button[data-testid^="edit-registration-"]')).click()
  const editForm = await driver.wait(
    until.elementLocated(By.css('[data-testid="edit-registration-form"]')),
    config.timeout
  )
  await driver.wait(until.elementIsVisible(editForm), config.timeout)
  return editForm
}

async function runCase(testCaseId, scenario) {
  const driver = await createDriver(config)

  try {
    await scenario(driver)
    console.log(`✓ ${testCaseId} lulus`)
  } catch (error) {
    try {
      await saveFailureScreenshot(driver, testCaseId, config.mode)
    } catch (screenshotError) {
      console.error(`Screenshot ${testCaseId} gagal disimpan: ${screenshotError.message}`)
    }

    throw error
  } finally {
    if (config.pauseAfterTest > 0) {
      await new Promise((resolve) => setTimeout(resolve, config.pauseAfterTest))
    }

    await driver.quit()
  }
}

await Promise.all([
  checkTarget('Public web', config.publicUrl, config.timeout),
  checkTarget('Admin dashboard', config.adminUrl, config.timeout)
])
console.log(`Menjalankan test registrasi Selenium dalam mode ${config.mode.toUpperCase()}`)

test('TC-01 registrasi valid tersimpan dan tampil pada dashboard', async () => {
  await runCase('TC-01', async (driver) => {
    const participant = participants.registrationSuccess
    await openRegistrationPage(driver)
    await fillParticipant(driver, participant)
    const registrationCode = await submitValidRegistration(driver)

    await loginAsAdmin(driver)
    const row = await findRegistrationRow(driver, participant.email)
    const rowText = await row.getText()

    assert.ok(rowText.includes(participant.email.toLowerCase()))
    assert.ok(rowText.includes(registrationCode))
    assert.ok(rowText.includes(participant.raceCategory))
  })
})

test('TC-02 registrasi dengan format email tidak valid ditolak', async () => {
  await runCase('TC-02', async (driver) => {
    await openRegistrationPage(driver)
    await fillParticipant(driver, participants.registrationInvalid)
    await driver.findElement(By.css('[data-testid="submit-registration"]')).click()

    const emailError = await driver.wait(
      until.elementLocated(By.css('[data-testid="email-error"]')),
      config.timeout
    )
    await driver.wait(until.elementIsVisible(emailError), config.timeout)

    assert.match(await emailError.getText(), /format email tidak valid/i)
    assert.equal(
      (await driver.findElements(By.css('[data-testid="registration-success"]'))).length,
      0
    )
  })
})

test('TC-03 registrasi dengan email yang sama ditolak', async () => {
  await runCase('TC-03', async (driver) => {
    const participant = participants.registrationDuplicate
    await openRegistrationPage(driver)
    await fillParticipant(driver, participant)
    await submitValidRegistration(driver)

    await driver.findElement(By.css('[data-testid="submit-registration"]')).click()
    const emailError = await driver.wait(
      until.elementLocated(By.css('[data-testid="email-error"]')),
      config.timeout
    )
    await driver.wait(until.elementIsVisible(emailError), config.timeout)

    assert.match(await emailError.getText(), /email sudah terdaftar/i)
    const registrationError = await driver.findElement(By.css('[data-testid="registration-error"]'))
    assert.match(await registrationError.getText(), /email sudah terdaftar/i)
  })
})

test('TC-04 pencarian peserta menggunakan email', async () => {
  await runCase('TC-04', async (driver) => {
    const participant = participants.registrationSearch
    await openRegistrationPage(driver)
    await fillParticipant(driver, participant)
    const registrationCode = await submitValidRegistration(driver)

    await loginAsAdmin(driver)
    const { filteredCount, rows } = await searchRegistrations(driver, participant.email, 1)
    assert.equal(rows.length, 1)

    const rowText = await rows[0].getText()
    assert.ok(rowText.includes(participant.email.toLowerCase()))
    assert.ok(rowText.includes(registrationCode))
    assert.match(await filteredCount.getText(), /^1 dari /i)
  })
})

test('TC-09 edit registrasi menggunakan data valid', async () => {
  await runCase('TC-09', async (driver) => {
    const participant = participants.registrationEdit
    const updatedName = `${participant.name} Diperbarui`

    await openRegistrationPage(driver)
    await fillParticipant(driver, participant)
    await submitValidRegistration(driver)
    await loginAsAdmin(driver)

    const row = await findRegistrationRow(driver, participant.email)
    const editForm = await openEditForm(driver, row)
    const nameInput = await editForm.findElement(By.css('input[name="name"]'))
    await nameInput.clear()
    await nameInput.sendKeys(updatedName)
    await editForm
      .findElement(By.css('select[name="race_category"] option[value="10K"]'))
      .click()
    await driver.findElement(By.css('[data-testid="save-registration-edit"]')).click()

    const successMessage = await driver.wait(
      until.elementLocated(By.css('[data-testid="registration-action-success"]')),
      config.timeout
    )
    await driver.wait(until.elementIsVisible(successMessage), config.timeout)
    assert.match(await successMessage.getText(), /berhasil diperbarui/i)

    const updatedRow = await findRegistrationRow(driver, participant.email)
    const updatedText = await updatedRow.getText()
    assert.ok(updatedText.includes(updatedName))
    assert.ok(updatedText.includes('10K'))
  })
})

test('TC-10 edit registrasi menggunakan email peserta lain ditolak', async () => {
  await runCase('TC-10', async (driver) => {
    const source = participants.registrationEditConflictSource
    const target = participants.registrationEditConflictTarget

    await openRegistrationPage(driver)
    await fillParticipant(driver, source)
    await submitValidRegistration(driver)
    await openRegistrationPage(driver)
    await fillParticipant(driver, target)
    await submitValidRegistration(driver)
    await loginAsAdmin(driver)

    const targetRow = await findRegistrationRow(driver, target.email)
    const editForm = await openEditForm(driver, targetRow)
    const emailInput = await editForm.findElement(By.css('input[name="email"]'))
    await emailInput.clear()
    await emailInput.sendKeys(source.email)
    await driver.findElement(By.css('[data-testid="save-registration-edit"]')).click()

    const editError = await driver.wait(
      until.elementLocated(By.css('[data-testid="edit-registration-error"]')),
      config.timeout
    )
    await driver.wait(until.elementIsVisible(editError), config.timeout)
    assert.match(await editError.getText(), /email sudah terdaftar/i)

    await driver.findElement(By.css('.modal-heading .button--secondary')).click()
    await driver.wait(until.stalenessOf(editForm), config.timeout)
    const unchangedRow = await findRegistrationRow(driver, target.email)
    assert.ok((await unchangedRow.getText()).includes(target.email.toLowerCase()))
  })
})

test('TC-11 membatalkan konfirmasi delete mempertahankan registrasi', async () => {
  await runCase('TC-11', async (driver) => {
    const participant = participants.registrationDeleteCancel

    await openRegistrationPage(driver)
    await fillParticipant(driver, participant)
    await submitValidRegistration(driver)
    await loginAsAdmin(driver)

    const row = await findRegistrationRow(driver, participant.email)
    await row.findElement(By.css('button[data-testid^="delete-registration-"]')).click()
    const confirmation = await driver.wait(until.alertIsPresent(), config.timeout)
    assert.match(await confirmation.getText(), /tidak dapat dibatalkan/i)
    await confirmation.dismiss()

    const retainedRow = await findRegistrationRow(driver, participant.email)
    assert.equal(await retainedRow.isDisplayed(), true)
  })
})

test('TC-12 mengonfirmasi delete menghapus registrasi', async () => {
  await runCase('TC-12', async (driver) => {
    const participant = participants.registrationDelete

    await openRegistrationPage(driver)
    await fillParticipant(driver, participant)
    await submitValidRegistration(driver)
    await loginAsAdmin(driver)

    const { filteredCount, rows } = await searchRegistrations(driver, participant.email, 1)
    assert.equal(rows.length, 1)
    await rows[0].findElement(By.css('button[data-testid^="delete-registration-"]')).click()
    const confirmation = await driver.wait(until.alertIsPresent(), config.timeout)
    await confirmation.accept()

    const successMessage = await driver.wait(
      until.elementLocated(By.css('[data-testid="registration-action-success"]')),
      config.timeout
    )
    await driver.wait(until.elementIsVisible(successMessage), config.timeout)
    assert.match(await successMessage.getText(), /berhasil dihapus/i)
    await driver.wait(
      until.elementTextMatches(filteredCount, /^0 dari /i),
      config.timeout
    )

    const noResults = await driver.findElement(By.css('[data-testid="registrations-no-results"]'))
    assert.equal(await noResults.isDisplayed(), true)
    assert.equal(
      (await driver.findElements(By.css(`[data-registration-email="${participant.email}"]`))).length,
      0
    )
  })
})
