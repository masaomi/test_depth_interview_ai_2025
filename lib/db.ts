import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'interviews.db');
const db = new Database(dbPath);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS interview_templates (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    prompt TEXT NOT NULL,
    duration INTEGER NOT NULL DEFAULT 600,
    translations TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS interview_sessions (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    status TEXT DEFAULT 'active',
    FOREIGN KEY (template_id) REFERENCES interview_templates(id)
  );

  CREATE TABLE IF NOT EXISTS conversation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES interview_sessions(id)
  );
`);

// Add translations column if it doesn't exist (migration)
try {
  db.exec(`ALTER TABLE interview_templates ADD COLUMN translations TEXT`);
} catch (e) {
  // Column already exists, ignore
}

export default db;
