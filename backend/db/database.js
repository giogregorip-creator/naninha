const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS families (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS babies (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL REFERENCES families(id),
      name TEXT NOT NULL,
      birth_date TEXT NOT NULL,
      gender TEXT CHECK(gender IN ('M','F','outro')),
      birth_weight_kg REAL,
      birth_height_cm REAL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS invites (
      id TEXT PRIMARY KEY,
      baby_id TEXT NOT NULL REFERENCES babies(id),
      code TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('caretaker','doctor')),
      used_by TEXT,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS caretakers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      baby_id TEXT REFERENCES babies(id),
      invite_code_used TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS doctors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      crm TEXT,
      specialty TEXT DEFAULT 'Pediatria',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS doctor_baby (
      doctor_id TEXT NOT NULL REFERENCES doctors(id),
      baby_id TEXT NOT NULL REFERENCES babies(id),
      linked_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (doctor_id, baby_id)
    );

    CREATE TABLE IF NOT EXISTS diary_entries (
      id TEXT PRIMARY KEY,
      baby_id TEXT NOT NULL REFERENCES babies(id),
      caretaker_id TEXT NOT NULL REFERENCES caretakers(id),
      entry_date TEXT NOT NULL,
      meals_json TEXT,
      sleep_json TEXT,
      diapers_json TEXT,
      mood TEXT,
      symptoms_json TEXT,
      health_notes TEXT,
      activities TEXT,
      general_notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(baby_id, entry_date)
    );

    CREATE TABLE IF NOT EXISTS weight_records (
      id TEXT PRIMARY KEY,
      baby_id TEXT NOT NULL REFERENCES babies(id),
      recorded_by TEXT,
      recorded_by_role TEXT,
      recorded_at TIMESTAMPTZ NOT NULL,
      weight_kg REAL NOT NULL,
      height_cm REAL,
      head_cm REAL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS clinical_notes (
      id TEXT PRIMARY KEY,
      baby_id TEXT NOT NULL REFERENCES babies(id),
      doctor_id TEXT NOT NULL REFERENCES doctors(id),
      note_date TEXT NOT NULL,
      type TEXT DEFAULT 'consulta',
      content TEXT NOT NULL,
      diagnosis TEXT,
      prescription TEXT,
      next_appointment TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('[db] tabelas prontas');
}

// Helper: query simples retorna rows
async function query(text, params) {
  const res = await pool.query(text, params);
  return res.rows;
}

// Helper: retorna primeira linha ou null
async function queryOne(text, params) {
  const res = await pool.query(text, params);
  return res.rows[0] || null;
}

module.exports = { pool, query, queryOne, initDb };
