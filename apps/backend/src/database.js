import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export function createDatabase(databasePath) {
  if (databasePath !== ':memory:') {
    mkdirSync(dirname(databasePath), { recursive: true })
  }

  const database = new DatabaseSync(databasePath)
  database.exec('PRAGMA foreign_keys = ON')
  database.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      event_date TEXT NOT NULL,
      location TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      registration_code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      gender TEXT NOT NULL,
      birth_date TEXT NOT NULL,
      address TEXT NOT NULL,
      race_category TEXT NOT NULL,
      shirt_size TEXT NOT NULL,
      emergency_contact_name TEXT NOT NULL,
      emergency_contact_phone TEXT NOT NULL,
      medical_condition TEXT,
      agree_to_terms INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (event_id) REFERENCES events(id)
    );
  `)

  database.prepare(`
    INSERT OR IGNORE INTO events (id, name, description, event_date, location)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    1,
    'Campus Fun Run 2026',
    'Event lari santai untuk seluruh civitas kampus.',
    '2026-12-06',
    'Lapangan Utama Kampus'
  )

  return database
}
