import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { test } from 'node:test'
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
  const adminUrl = isProduction
    ? process.env.PROD_ADMIN_DASHBOARD_URL
    : process.env.DEV_ADMIN_DASHBOARD_URL || 'http://localhost:5174'
  const adminUsername = process.env.SELENIUM_ADMIN_USERNAME
  const adminPassword = process.env.SELENIUM_ADMIN_PASSWORD

  if (!adminUrl) {
    throw new Error(`URL dashboard untuk mode ${mode} wajib diisi di .env`)
  }

  if (!adminUsername || !adminPassword) {
    throw new Error('SELENIUM_ADMIN_USERNAME dan SELENIUM_ADMIN_PASSWORD wajib diisi di .env')
  }

  const normalizedAdminUrl = adminUrl.replace(/\/$/, '')

  if (isProduction) {
    const url = new URL(normalizedAdminUrl)
    const localHosts = ['localhost', '127.0.0.1', '::1']

    if (url.protocol !== 'https:') {
      throw new Error('URL production admin dashboard wajib menggunakan https')
    }

    if (localHosts.includes(url.hostname) || url.hostname.endsWith('.localhost')) {
      throw new Error('URL production admin dashboard tidak boleh mengarah ke localhost')
    }
  }

  const snapChromeBinary = '/snap/chromium/current/usr/lib/chromium-browser/chrome'

  return {
    mode,
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

async function checkTarget(config) {
  let response

  try {
    response = await fetch(config.adminUrl, {
      redirect: 'follow',
      signal: AbortSignal.timeout(config.timeout)
    })
  } catch (error) {
    throw new Error(`Admin dashboard tidak dapat diakses di ${config.adminUrl}: ${error.message}`)
  }

  if (!response.ok) {
    throw new Error(`Admin dashboard mengembalikan HTTP ${response.status}`)
  }
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
const delay = async () => {
  if (config.stepDelay > 0) {
    await new Promise((resolve) => setTimeout(resolve, config.stepDelay))
  }
}

async function openLoginPage(driver) {
  await driver.get(config.adminUrl)
  const loginForm = await driver.wait(
    until.elementLocated(By.css('[data-testid="admin-login-form"]')),
    config.timeout
  )
  await driver.wait(until.elementIsVisible(loginForm), config.timeout)
}

async function submitLogin(driver, password = config.adminPassword) {
  const usernameInput = await driver.findElement(By.css('[data-testid="admin-username-input"]'))
  const passwordInput = await driver.findElement(By.css('[data-testid="admin-password-input"]'))

  await usernameInput.clear()
  await usernameInput.sendKeys(config.adminUsername)
  await delay()
  await passwordInput.clear()
  await passwordInput.sendKeys(password)
  await delay()
  await driver.findElement(By.css('[data-testid="admin-login-submit"]')).click()
}

async function waitForDashboard(driver) {
  const dashboard = await driver.wait(
    until.elementLocated(By.css('[data-testid="admin-dashboard"]')),
    config.timeout
  )
  await driver.wait(until.elementIsVisible(dashboard), config.timeout)
  return dashboard
}

async function runCase(testCaseId, description, scenario) {
  console.log(`▶ Menjalankan ${testCaseId}: ${description}`)
  const driver = await createDriver(config)

  try {
    await scenario(driver)
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

await checkTarget(config)
console.log(`Menjalankan test autentikasi Selenium dalam mode ${config.mode.toUpperCase()}`)

test('TC-05 login dengan kredensial admin valid', async () => {
  await runCase('TC-05', 'login dengan kredensial admin valid', async (driver) => {
    await openLoginPage(driver)
    await submitLogin(driver)
    await waitForDashboard(driver)

    const currentUsername = await driver
      .findElement(By.css('[data-testid="admin-current-username"]'))
      .getText()

    assert.equal(currentUsername, config.adminUsername)
  })
})

test('TC-06 login dengan kredensial admin salah', async () => {
  await runCase('TC-06', 'login dengan kredensial admin salah', async (driver) => {
    await openLoginPage(driver)
    await submitLogin(driver, `${config.adminPassword}-salah`)

    const errorMessage = await driver.wait(
      until.elementLocated(By.css('[data-testid="admin-login-error"]')),
      config.timeout
    )
    await driver.wait(until.elementIsVisible(errorMessage), config.timeout)

    assert.match(await errorMessage.getText(), /username atau password salah/i)
    assert.equal(
      (await driver.findElements(By.css('[data-testid="admin-dashboard"]'))).length,
      0
    )
  })
})

test('TC-07 akses dashboard tanpa autentikasi', async () => {
  await runCase('TC-07', 'akses dashboard tanpa autentikasi', async (driver) => {
    await openLoginPage(driver)

    assert.equal(
      (await driver.findElements(By.css('[data-testid="admin-dashboard"]'))).length,
      0
    )
    assert.equal(
      (await driver.findElements(By.css('[data-testid="admin-login-form"]'))).length,
      1
    )
  })
})

test('TC-08 logout mengakhiri sesi admin', async () => {
  await runCase('TC-08', 'logout mengakhiri sesi admin', async (driver) => {
    await openLoginPage(driver)
    await submitLogin(driver)
    await waitForDashboard(driver)

    await driver.findElement(By.css('[data-testid="admin-logout"]')).click()
    const logoutMessage = await driver.wait(
      until.elementLocated(By.css('[data-testid="admin-login-error"]')),
      config.timeout
    )
    await driver.wait(until.elementIsVisible(logoutMessage), config.timeout)
    assert.match(await logoutMessage.getText(), /telah logout/i)

    await driver.navigate().refresh()
    const loginForm = await driver.wait(
      until.elementLocated(By.css('[data-testid="admin-login-form"]')),
      config.timeout
    )
    await driver.wait(until.elementIsVisible(loginForm), config.timeout)
    assert.equal(
      (await driver.findElements(By.css('[data-testid="admin-dashboard"]'))).length,
      0
    )
  })
})
