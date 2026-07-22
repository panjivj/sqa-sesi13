import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { createApp } from './app.js'
import { createDatabase } from './database.js'

dotenv.config({
  path: fileURLToPath(new URL('../../../.env', import.meta.url)),
  quiet: true
})

const defaultDatabasePath = fileURLToPath(new URL('../data/app.db', import.meta.url))
const database = createDatabase(process.env.DB_PATH || defaultDatabasePath)
const sessionTtlSeconds = Number(process.env.ADMIN_SESSION_TTL_SECONDS || 3600)
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const app = createApp(database, {
  allowedOrigins,
  auth: {
    adminUsername: process.env.ADMIN_USERNAME,
    adminPasswordHash: process.env.ADMIN_PASSWORD_HASH,
    sessionTtlSeconds,
    secureCookies: process.env.NODE_ENV === 'production'
  }
})
const port = Number(process.env.BACKEND_PORT || 3000)

const server = app.listen(port, () => {
  console.log(`Backend API berjalan di http://localhost:${port}`)
})

function shutdown() {
  server.close(() => {
    database.close()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
