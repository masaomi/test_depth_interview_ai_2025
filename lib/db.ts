import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'interviews.db');
const db = new Database(dbPath);

// Ensure foreign key constraints are enforced
db.pragma('foreign_keys = ON');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS interview_templates (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    prompt TEXT NOT NULL,
    overview TEXT,
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
    metadata TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES interview_sessions(id)
  );

  CREATE TABLE IF NOT EXISTS report_aggregations (
    id TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    llm_model TEXT NOT NULL,
    total_sessions INTEGER NOT NULL,
    status TEXT DEFAULT 'processing'
  );

  CREATE TABLE IF NOT EXISTS report_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aggregation_id TEXT NOT NULL,
    template_id TEXT NOT NULL,
    template_title TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    total_interviews INTEGER NOT NULL,
    completed_interviews INTEGER NOT NULL,
    in_progress_interviews INTEGER NOT NULL,
    total_messages INTEGER NOT NULL,
    avg_duration TEXT,
    avg_duration_seconds INTEGER,
    last_conducted_at DATETIME,
    executive_summary TEXT,
    key_findings TEXT,
    segment_analysis TEXT,
    recommended_actions TEXT,
    FOREIGN KEY (aggregation_id) REFERENCES report_aggregations(id),
    FOREIGN KEY (template_id) REFERENCES interview_templates(id)
  );

  CREATE INDEX IF NOT EXISTS idx_report_details_lang 
    ON report_details(aggregation_id, template_id, language);

  CREATE INDEX IF NOT EXISTS idx_conversation_logs_session 
    ON conversation_logs(session_id);

  CREATE INDEX IF NOT EXISTS idx_sessions_template 
    ON interview_sessions(template_id);
`);

// Lightweight migration helpers
function ensureColumn(table: string, column: string, ddl: string) {
  try {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
    if (!cols.some((c) => c.name === column)) {
      db.exec(ddl);
    }
  } catch {}
}

// Add translations column if it doesn't exist (migration)
ensureColumn('interview_templates', 'translations', `ALTER TABLE interview_templates ADD COLUMN translations TEXT`);

// Add language column to report_details if it doesn't exist (migration)
ensureColumn('report_details', 'language', `ALTER TABLE report_details ADD COLUMN language TEXT NOT NULL DEFAULT 'en'`);

// Add avg_duration_seconds if it doesn't exist (migration)
ensureColumn('report_details', 'avg_duration_seconds', `ALTER TABLE report_details ADD COLUMN avg_duration_seconds INTEGER`);

// Add metadata column to conversation_logs if it doesn't exist (migration)
ensureColumn('conversation_logs', 'metadata', `ALTER TABLE conversation_logs ADD COLUMN metadata TEXT`);

// Add overview column to interview_templates if it doesn't exist (migration)
ensureColumn('interview_templates', 'overview', `ALTER TABLE interview_templates ADD COLUMN overview TEXT`);

export default db;
