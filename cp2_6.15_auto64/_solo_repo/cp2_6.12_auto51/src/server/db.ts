import initSqlJs, { Database as SqlJsDatabase, SqlJsStatic, PreparedStatement } from 'sql.js';
import path from 'path';
import fs from 'fs';

interface RunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

interface StatementWrapper {
  run(...params: unknown[]): RunResult;
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
}

interface DatabaseWrapper {
  prepare(sql: string): StatementWrapper;
  exec(sql: string): void;
  pragma(sql: string): void;
  transaction<T>(fn: () => T): () => T;
  close(): void;
}

const dbDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'app.db');

let SQL: SqlJsStatic | null = null;
let dbInstance: DatabaseWrapper | null = null;
let innerDb: SqlJsDatabase | null = null;

function saveToDisk(): void {
  if (innerDb) {
    const data = innerDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

function createWrapper(database: SqlJsDatabase): DatabaseWrapper {
  innerDb = database;

  const prepare = (sql: string): StatementWrapper => {
    let statement: PreparedStatement | null = null;

    const getStatement = (): PreparedStatement => {
      if (!statement) {
        statement = database.prepare(sql);
      }
      return statement;
    };

    const normalizeParams = (params: unknown[]): unknown[] => {
      return params.map((p) => {
        if (p === undefined) return null;
        return p;
      });
    };

    return {
      run(...params: unknown[]): RunResult {
        const stmt = getStatement();
        const normalized = normalizeParams(params);
        if (normalized.length > 0) {
          stmt.bind(normalized);
        }
        const hasRows = stmt.step();
        let changes = 0;
        let lastInsertRowid = 0;

        try {
          const changesResult = database.exec('SELECT changes() as c, last_insert_rowid() as id');
          if (changesResult.length > 0 && changesResult[0].values.length > 0) {
            changes = changesResult[0].values[0][0] as number;
            lastInsertRowid = changesResult[0].values[0][1] as number;
          }
        } catch {
          // ignore
        }

        stmt.reset();
        stmt.free();
        statement = null;
        saveToDisk();
        return { changes, lastInsertRowid };
      },

      get(...params: unknown[]): unknown {
        const stmt = getStatement();
        const normalized = normalizeParams(params);
        if (normalized.length > 0) {
          stmt.bind(normalized);
        }
        const columns = stmt.getColumnNames();
        let result: unknown = undefined;

        if (stmt.step()) {
          const row = stmt.getAsObject();
          result = {};
          for (const col of columns) {
            (result as Record<string, unknown>)[col] = row[col];
          }
        }

        stmt.reset();
        stmt.free();
        statement = null;
        return result;
      },

      all(...params: unknown[]): unknown[] {
        const stmt = getStatement();
        const normalized = normalizeParams(params);
        if (normalized.length > 0) {
          stmt.bind(normalized);
        }
        const columns = stmt.getColumnNames();
        const results: unknown[] = [];

        while (stmt.step()) {
          const row = stmt.getAsObject();
          const obj: Record<string, unknown> = {};
          for (const col of columns) {
            obj[col] = row[col];
          }
          results.push(obj);
        }

        stmt.reset();
        stmt.free();
        statement = null;
        return results;
      }
    };
  };

  return {
    prepare,

    exec(sql: string): void {
      database.run(sql);
      saveToDisk();
    },

    pragma(_sql: string): void {
      // sql.js does not fully support pragmas, ignore
    },

    transaction<T>(fn: () => T): () => T {
      return (): T => {
        database.run('BEGIN TRANSACTION');
        try {
          const result = fn();
          database.run('COMMIT');
          saveToDisk();
          return result;
        } catch (err) {
          database.run('ROLLBACK');
          throw err;
        }
      };
    },

    close(): void {
      database.close();
    }
  };
}

function initDatabase(): void {
  if (!SQL) {
    throw new Error('SQL.js not initialized yet');
  }

  let existingData: Uint8Array | undefined;
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    existingData = new Uint8Array(buffer);
  }

  const database = existingData ? new SQL.Database(existingData) : new SQL.Database();
  dbInstance = createWrapper(database);

  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar TEXT,
      totalHours REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      date TEXT NOT NULL,
      hours REAL NOT NULL,
      description TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS badges (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      badgeType TEXT NOT NULL,
      earnedAt TEXT NOT NULL,
      FOREIGN KEY(userId) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_activities_userId ON activities(userId);
    CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date);
    CREATE INDEX IF NOT EXISTS idx_badges_userId ON badges(userId);
  `);
}

let initPromise: Promise<void> | null = null;

function getInitPromise(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async (): Promise<void> => {
    SQL = await initSqlJs({
      locateFile: (file: string) => path.join(require.resolve('sql.js.js'), '..', file)
    });
    initDatabase();
  })();
  return initPromise;
}

const dbProxy: DatabaseWrapper = {
  prepare(sql: string): StatementWrapper {
    if (!dbInstance) throw new Error('Database not initialized. Call waitForDb() first.');
    return dbInstance.prepare(sql);
  },

  exec(sql: string): void {
    if (!dbInstance) throw new Error('Database not initialized. Call waitForDb() first.');
    return dbInstance.exec(sql);
  },

  pragma(sql: string): void {
    if (!dbInstance) throw new Error('Database not initialized. Call waitForDb() first.');
    return dbInstance.pragma(sql);
  },

  transaction<T>(fn: () => T): () => T {
    if (!dbInstance) throw new Error('Database not initialized. Call waitForDb() first.');
    return dbInstance.transaction(fn);
  },

  close(): void {
    if (dbInstance) {
      dbInstance.close();
    }
  }
};

export async function waitForDb(): Promise<void> {
  await getInitPromise();
}

export default dbProxy;
