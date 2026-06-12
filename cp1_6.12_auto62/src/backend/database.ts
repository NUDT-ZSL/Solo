import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', '..', 'data');
const dbPath = path.join(dataDir, 'quizcraft.db');

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

let db: SqlJsDatabase;

function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

export async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

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

  saveDb();
}

function queryAll<T>(sql: string, params: unknown[] = []): T[] {
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
