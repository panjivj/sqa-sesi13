import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { Builder, By, until } from 'selenium-webdriver'
import chrome from 'selenium-webdriver/chrome.js'

dotenv.config({
  path: fileURLToPath(new URL('../../../.env', import.meta.url)),
  quiet: true
})

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

  if (!publicUrl || !adminUrl) {
    throw new Error(`URL public web dan dashboard untuk mode ${mode} wajib diisi di .env`)
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
    throw new Error(`${label} mengembalikan HTTP ${response.status} dari ${url}`)
  }

  console.log(`✓ ${label} dapat diakses: ${url}`)
}

async function loadParticipant() {
  const fixturePath = fileURLToPath(new URL('../fixtures/participants.json', import.meta.url))
  const runId = `${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}-${Date.now().toString().slice(-4)}`
  let fixture

  try {
    fixture = JSON.parse(await readFile(fixturePath, 'utf8')).registrationSuccess
  } catch (error) {
    throw new Error(`Dataset Selenium tidak dapat dibaca dari ${fixturePath}: ${error.message}`)
  }

  if (!fixture || typeof fixture !== 'object') {
    throw new Error('Dataset registrationSuccess wajib tersedia di fixtures/participants.json')
  }

  const requiredFields = [
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

  for (const field of requiredFields) {
    if (typeof fixture[field] !== 'string' || fixture[field].trim() === '') {
      throw new Error(`Field dataset ${field} wajib berupa teks dan tidak boleh kosong`)
    }
  }

  if (!fixture.email.includes('{{runId}}')) {
    throw new Error('Field email pada dataset wajib memiliki placeholder {{runId}} agar unik')
  }

  if (!['Laki-laki', 'Perempuan'].includes(fixture.gender)) {
    throw new Error('Field gender harus bernilai Laki-laki atau Perempuan')
  }

  if (!['5K', '10K'].includes(fixture.raceCategory)) {
    throw new Error('Field raceCategory harus bernilai 5K atau 10K')
  }

  if (!['S', 'M', 'L', 'XL', 'XXL'].includes(fixture.shirtSize)) {
    throw new Error('Field shirtSize harus bernilai S, M, L, XL, atau XXL')
  }

  return Object.fromEntries(
    Object.entries(fixture).map(([key, value]) => [
      key,
      typeof value === 'string' ? value.replaceAll('{{runId}}', runId) : value
    ])
  )
}

async function saveFailureScreenshot(driver, mode) {
  const screenshotDirectory = fileURLToPath(new URL('../screenshots', import.meta.url))
  const fileName = `failure-${mode}-${Date.now()}.png`
  const filePath = `${screenshotDirectory}/${fileName}`

  await mkdir(screenshotDirectory, { recursive: true })
  const screenshot = await driver.takeScreenshot()
  await writeFile(filePath, screenshot, 'base64')
  console.error(`Screenshot kegagalan disimpan: ${filePath}`)
}

async function run() {
  const config = loadConfiguration()
  const participant = await loadParticipant()
  let driver
  let succeeded = false

  const delay = async () => {
    if (config.stepDelay > 0) await new Promise((resolve) => setTimeout(resolve, config.stepDelay))
  }

  console.log(`Menjalankan Selenium dalam mode ${config.mode.toUpperCase()}`)
  console.log(`Data test: ${participant.email}`)

  await checkTarget('Public web', config.publicUrl, config.timeout)
  await checkTarget('Admin dashboard', config.adminUrl, config.timeout)

  const options = new chrome.Options()
  options.addArguments('--window-size=1440,1100')

  if (config.headless) {
    options.addArguments('--headless=new', '--no-sandbox', '--disable-dev-shm-usage')
  }

  if (config.chromeBinary) {
    options.setChromeBinaryPath(config.chromeBinary)
  }

  try {
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build()

    console.log('→ Membuka public web')
    await driver.get(config.publicUrl)
    const eventName = await driver.wait(
      until.elementLocated(By.css('[data-testid="event-name"]')),
      config.timeout
    )
    await driver.wait(until.elementIsVisible(eventName), config.timeout)
    await delay()

    const fill = async (testId, value) => {
      const element = await driver.findElement(By.css(`[data-testid="${testId}"]`))
      await element.clear()
      await element.sendKeys(value)
      await delay()
    }

    console.log('→ Mengisi data peserta')
    await fill('name-input', participant.name)
    await fill('email-input', participant.email)
    await fill('phone-input', participant.phone)
    await driver.findElement(By.css(`[data-testid="gender-select"] option[value="${participant.gender}"]`)).click()
    await delay()

    const birthDateInput = await driver.findElement(By.css('[data-testid="birth-date-input"]'))
    await driver.executeScript(
      "arguments[0].value = arguments[1]; arguments[0].dispatchEvent(new Event('input', { bubbles: true }))",
      birthDateInput,
      participant.birthDate
    )
    await delay()

    await fill('address-input', participant.address)
    await driver.findElement(By.css(`[data-testid="race-category-select"] option[value="${participant.raceCategory}"]`)).click()
    await delay()
    await driver.findElement(By.css(`[data-testid="shirt-size-select"] option[value="${participant.shirtSize}"]`)).click()
    await delay()
    await fill('emergency-name-input', participant.emergencyName)
    await fill('emergency-phone-input', participant.emergencyPhone)
    await fill('medical-condition-input', participant.medicalCondition)

    const agreement = await driver.findElement(By.css('[data-testid="agree-terms-input"]'))
    if (!(await agreement.isSelected())) await agreement.click()
    await delay()

    console.log('→ Mengirim formulir registrasi')
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
    console.log(`✓ Registrasi berhasil: ${registrationCode}`)
    await delay()

    console.log('→ Membuka dashboard admin')
    await driver.get(config.adminUrl)
    const row = await driver.wait(
      until.elementLocated(By.css(`[data-registration-email="${participant.email}"]`)),
      config.timeout
    )
    await driver.wait(until.elementIsVisible(row), config.timeout)

    const rowText = await row.getText()
    assert.ok(rowText.includes(participant.email), 'Email peserta tidak ditemukan di dashboard')
    assert.ok(rowText.includes(registrationCode), 'Kode registrasi tidak ditemukan di dashboard')
    assert.ok(rowText.includes(participant.raceCategory), 'Kategori lari tidak ditemukan di dashboard')

    console.log('✓ Data peserta ditemukan dan sesuai di dashboard admin')
    console.log(`SELENIUM ${config.mode.toUpperCase()}: LULUS`)
    succeeded = true
  } catch (error) {
    console.error(`SELENIUM ${config.mode.toUpperCase()}: GAGAL`)
    console.error(error)

    if (driver) {
      try {
        await saveFailureScreenshot(driver, config.mode)
      } catch (screenshotError) {
        console.error(`Screenshot gagal disimpan: ${screenshotError.message}`)
      }
    }
  } finally {
    if (driver) {
      if (config.pauseAfterTest > 0) {
        console.log(`Browser akan ditutup dalam ${config.pauseAfterTest} ms`)
        await new Promise((resolve) => setTimeout(resolve, config.pauseAfterTest))
      }

      await driver.quit()
    }
  }

  if (!succeeded) process.exitCode = 1
}

run().catch((error) => {
  console.error(`Selenium tidak dapat dimulai: ${error.message}`)
  process.exitCode = 1
})
