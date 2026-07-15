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
const app = createApp(database)
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
