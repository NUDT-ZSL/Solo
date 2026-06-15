import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', '..', 'data');
const dbPath = path.join(dataDir, 'quizcraft.db');
const backupDir = path.join(dataDir, 'backups');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

let db: SqlJsDatabase;
let dbReady = false;
let saveIntervalId: NodeJS.Timeout | null = null;
const AUTO_SAVE_INTERVAL = 30000;

function generateChecksum(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function saveDb(sync = true): void {
  if (!dbReady) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    const checksum = generateChecksum(buffer);

    const tempPath = `${dbPath}.tmp`;
    fs.writeFileSync(tempPath, buffer);

    const writtenBuffer = fs.readFileSync(tempPath);
    const writtenChecksum = generateChecksum(writtenBuffer);

    if (checksum !== writtenChecksum) {
      throw new Error('Database file corruption detected during write');
    }

    if (fs.existsSync(dbPath)) {
      const oldBuffer = fs.readFileSync(dbPath);
      const oldChecksum = generateChecksum(oldBuffer);
      const backupFileName = `backup_${Date.now()}_${oldChecksum.substring(0, 8)}.db`;
      fs.copyFileSync(dbPath, path.join(backupDir, backupFileName));

      const backupFiles = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('backup_') && f.endsWith('.db'))
        .sort()
        .reverse();

      if (backupFiles.length > 10) {
        for (let i = 10; i < backupFiles.length; i++) {
          fs.unlinkSync(path.join(backupDir, backupFiles[i]));
        }
      }
    }

    fs.renameSync(tempPath, dbPath);
  } catch (err) {
    console.error('Failed to save database:', err);
    if (sync) throw err;
  }
}

function verifyDatabaseIntegrity(): boolean {
  try {
    const result = db.exec('PRAGMA integrity_check');
    return result.length > 0 && result[0].values[0][0] === 'ok';
  } catch {
    return false;
  }
}

function loadBackup(): boolean {
  const backupFiles = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('backup_') && f.endsWith('.db'))
    .sort()
    .reverse();

  for (const backupFile of backupFiles) {
    try {
      const backupPath = path.join(backupDir, backupFile);
      const fileBuffer = fs.readFileSync(backupPath);
      const SQL = (initSqlJs as unknown as { default: typeof initSqlJs }).default
        ? (initSqlJs as unknown as { default: typeof initSqlJs }).default
        : initSqlJs;
      const tempDb = new SQL.Database(fileBuffer);
      const tempResult = tempDb.exec('PRAGMA integrity_check');
      tempDb.close();

      if (tempResult.length > 0 && tempResult[0].values[0][0] === 'ok') {
        fs.copyFileSync(backupPath, dbPath);
        console.log(`Restored database from backup: ${backupFile}`);
        return true;
      }
    } catch (err) {
      console.warn(`Failed to load backup ${backupFile}:`, err);
    }
  }
  return false;
}

export async function initDatabase(): Promise<void> {
  const SQL = (initSqlJs as unknown as { default: typeof initSqlJs }).default
    ? (initSqlJs as unknown as { default: typeof initSqlJs }).default
    : initSqlJs;

  const SQLInstance = await SQL();

  let loadedFromBackup = false;

  if (fs.existsSync(dbPath)) {
    try {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQLInstance.Database(fileBuffer);

      if (!verifyDatabaseIntegrity()) {
        console.warn('Database integrity check failed, attempting backup restore');
        if (loadBackup()) {
          const restoredBuffer = fs.readFileSync(dbPath);
          db = new SQLInstance.Database(restoredBuffer);
          loadedFromBackup = true;
        } else {
          console.warn('No valid backup found, creating fresh database');
          db = new SQLInstance.Database();
        }
      }
    } catch (err) {
      console.error('Failed to load database:', err);
      if (loadBackup()) {
        const restoredBuffer = fs.readFileSync(dbPath);
        db = new SQLInstance.Database(restoredBuffer);
        loadedFromBackup = true;
      } else {
        db = new SQLInstance.Database();
      }
    }
  } else {
    db = new SQLInstance.Database();
  }

  db.run(`PRAGMA journal_mode = MEMORY`);
  db.run(`PRAGMA synchronous = NORMAL`);

  db.run(`
    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS subtitles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id TEXT NOT NULL,
      start_time REAL NOT NULL,
      end_time REAL NOT NULL,
      text TEXT NOT NULL,
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      video_id TEXT NOT NULL,
      time_point REAL NOT NULL,
      question TEXT NOT NULL,
      options TEXT NOT NULL,
      correct_index INTEGER NOT NULL,
      subtitle_text TEXT NOT NULL,
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS answers (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL,
      video_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      selected_index INTEGER NOT NULL,
      is_correct INTEGER NOT NULL,
      answer_time REAL NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_subtitles_video ON subtitles(video_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_quizzes_video ON quizzes(video_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_answers_video ON answers(video_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_answers_student ON answers(student_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_answers_quiz ON answers(quiz_id)`);

  dbReady = true;

  saveDb();

  if (saveIntervalId) clearInterval(saveIntervalId);
  saveIntervalId = setInterval(() => saveDb(false), AUTO_SAVE_INTERVAL);

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
  process.on('exit', gracefulShutdown);

  if (loadedFromBackup) {
    console.log('Database initialized from backup successfully');
  } else {
    console.log('Database initialized successfully');
  }
}

function gracefulShutdown(): void {
  try {
    if (saveIntervalId) clearInterval(saveIntervalId);
    if (dbReady) saveDb();
    if (db) db.close();
    dbReady = false;
  } catch (err) {
    console.error('Error during graceful shutdown:', err);
  }
}

export function isDatabaseReady(): boolean {
  return dbReady;
}

export function getDatabaseInfo(): { path: string; size: number; tables: number } {
  const stats = fs.statSync(dbPath);
  const tablesResult = db.exec(`
    SELECT COUNT(*) as count FROM sqlite_master
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `);
  return {
    path: dbPath,
    size: stats.size,
    tables: tablesResult[0]?.values[0][0] as number || 0,
  };
}

function queryAll<T>(sql: string, params: unknown[] = []): T[] {
  if (!dbReady) throw new Error('Database not initialized');
  const stmt = db.prepare(sql);
  stmt.bind(params as (string | number | null | Uint8Array)[]);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

function queryOne<T>(sql: string, params: unknown[] = []): T | undefined {
  const results = queryAll<T>(sql, params);
  return results[0];
}

export function insertVideo(id: string, filename: string): void {
  db.run('INSERT INTO videos (id, filename) VALUES (?, ?)', [id, filename]);
  saveDb();
}

export function getVideo(id: string): { id: string; filename: string; created_at: string } | undefined {
  return queryOne<{ id: string; filename: string; created_at: string }>('SELECT * FROM videos WHERE id = ?', [id]);
}

export function getAllVideos(): { id: string; filename: string; created_at: string }[] {
  return queryAll<{ id: string; filename: string; created_at: string }>('SELECT * FROM videos ORDER BY created_at DESC');
}

export function insertSubtitle(videoId: string, startTime: number, endTime: number, text: string): void {
  db.run('INSERT INTO subtitles (video_id, start_time, end_time, text) VALUES (?, ?, ?, ?)', [videoId, startTime, endTime, text]);
  saveDb();
}

export function getSubtitlesByVideo(videoId: string): { id: number; start_time: number; end_time: number; text: string }[] {
  return queryAll<{ id: number; start_time: number; end_time: number; text: string }>('SELECT * FROM subtitles WHERE video_id = ? ORDER BY start_time', [videoId]);
}

export function updateSubtitleText(id: number, text: string): void {
  db.run('UPDATE subtitles SET text = ? WHERE id = ?', [text, id]);
  saveDb();
}

export function insertQuiz(id: string, videoId: string, timePoint: number, question: string, options: string[], correctIndex: number, subtitleText: string): void {
  db.run('INSERT INTO quizzes (id, video_id, time_point, question, options, correct_index, subtitle_text) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, videoId, timePoint, question, JSON.stringify(options), correctIndex, subtitleText]);
  saveDb();
}

export function updateQuiz(id: string, question: string, options: string[], correctIndex: number): void {
  db.run('UPDATE quizzes SET question = ?, options = ?, correct_index = ? WHERE id = ?',
    [question, JSON.stringify(options), correctIndex, id]);
  saveDb();
}

export function getQuizzesByVideo(videoId: string): { id: string; video_id: string; time_point: number; question: string; options: string; correct_index: number; subtitle_text: string }[] {
  return queryAll<{ id: string; video_id: string; time_point: number; question: string; options: string; correct_index: number; subtitle_text: string }>('SELECT * FROM quizzes WHERE video_id = ? ORDER BY time_point', [videoId]);
}

export function getQuiz(id: string): { id: string; video_id: string; time_point: number; question: string; options: string; correct_index: number; subtitle_text: string } | undefined {
  return queryOne<{ id: string; video_id: string; time_point: number; question: string; options: string; correct_index: number; subtitle_text: string }>('SELECT * FROM quizzes WHERE id = ?', [id]);
}

export function insertAnswer(id: string, quizId: string, videoId: string, studentId: string, selectedIndex: number, isCorrect: boolean, answerTime: number): void {
  db.run('INSERT INTO answers (id, quiz_id, video_id, student_id, selected_index, is_correct, answer_time) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, quizId, videoId, studentId, selectedIndex, isCorrect ? 1 : 0, answerTime]);
  saveDb();
}

export function getAnswersByVideo(videoId: string): { id: string; quiz_id: string; video_id: string; student_id: string; selected_index: number; is_correct: number; answer_time: number; timestamp: string }[] {
  return queryAll<{ id: string; quiz_id: string; video_id: string; student_id: string; selected_index: number; is_correct: number; answer_time: number; timestamp: string }>('SELECT * FROM answers WHERE video_id = ? ORDER BY timestamp', [videoId]);
}

export function getAnswersByStudent(studentId: string, videoId: string): { id: string; quiz_id: string; video_id: string; student_id: string; selected_index: number; is_correct: number; answer_time: number; timestamp: string }[] {
  return queryAll<{ id: string; quiz_id: string; video_id: string; student_id: string; selected_index: number; is_correct: number; answer_time: number; timestamp: string }>('SELECT * FROM answers WHERE student_id = ? AND video_id = ? ORDER BY timestamp', [studentId, videoId]);
}

export function getStudentSummary(videoId: string): {
  studentId: string;
  totalQuizzes: number;
  correctCount: number;
  correctRate: number;
  totalAnswerTime: number;
  wrongQuizIds: string[];
}[] {
  const answers = getAnswersByVideo(videoId);
  const quizzes = getQuizzesByVideo(videoId);
  const quizIds = new Set(quizzes.map(q => q.id));
  const totalQuizzes = quizIds.size;

  const studentMap = new Map<string, { correctCount: number; totalAnswerTime: number; wrongQuizIds: string[]; totalAnswers: number }>();

  for (const a of answers) {
    if (!studentMap.has(a.student_id)) {
      studentMap.set(a.student_id, { correctCount: 0, totalAnswerTime: 0, wrongQuizIds: [], totalAnswers: 0 });
    }
    const entry = studentMap.get(a.student_id)!;
    entry.totalAnswers++;
    entry.totalAnswerTime += a.answer_time;
    if (a.is_correct === 1) {
      entry.correctCount++;
    } else {
      entry.wrongQuizIds.push(a.quiz_id);
    }
  }

  return Array.from(studentMap.entries()).map(([studentId, entry]) => ({
    studentId,
    totalQuizzes,
    correctCount: entry.correctCount,
    correctRate: entry.totalAnswers > 0 ? entry.correctCount / entry.totalAnswers : 0,
    totalAnswerTime: entry.totalAnswerTime,
    wrongQuizIds: entry.wrongQuizIds,
  }));
}

export function getQuizStats(videoId: string): { quizId: string; question: string; totalAnswers: number; correctCount: number; correctRate: number }[] {
  const rows = queryAll<{ quizId: string; question: string; totalAnswers: number; correctCount: number }>(
    `SELECT
      q.id as quizId,
      q.question,
      COUNT(a.id) as totalAnswers,
      SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) as correctCount
    FROM quizzes q
    LEFT JOIN answers a ON q.id = a.quiz_id
    WHERE q.video_id = ?
    GROUP BY q.id
    ORDER BY q.time_point`,
    [videoId]
  );

  return rows.map(r => ({
    quizId: r.quizId,
    question: r.question,
    totalAnswers: r.totalAnswers,
    correctCount: r.correctCount,
    correctRate: r.totalAnswers > 0 ? r.correctCount / r.totalAnswers : 0,
  }));
}

export function clearSubtitlesByVideo(videoId: string): void {
  db.run('DELETE FROM subtitles WHERE video_id = ?', [videoId]);
  saveDb();
}

export default {
  initDatabase,
  insertVideo,
  getVideo,
  getAllVideos,
  insertSubtitle,
  getSubtitlesByVideo,
  updateSubtitleText,
  insertQuiz,
  updateQuiz,
  getQuizzesByVideo,
  getQuiz,
  insertAnswer,
  getAnswersByVideo,
  getAnswersByStudent,
  getQuizStats,
  getStudentSummary,
  clearSubtitlesByVideo,
  isDatabaseReady,
  getDatabaseInfo,
};
