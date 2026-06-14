import { openDB, IDBPDatabase, DBSchema } from 'idb';
import { RideRecord, RideReport } from '../types';

interface RideTrackDB extends DBSchema {
  records: {
    key: string;
    value: RideRecord;
    indexes: { 'by-createdAt': number };
  };
  reports: {
    key: string;
    value: RideReport;
    indexes: { 'by-rideId': string; 'by-generatedAt': number };
  };
  trackPoints: {
    key: string;
    value: {
      id: string;
      rideId: string;
      index: number;
      lat: number;
      lng: number;
      altitude: number;
      timestamp: number;
      speed: number;
    };
    indexes: { 'by-rideId': string; 'by-timestamp': number };
  };
  notes: {
    key: string;
    value: {
      id: string;
      rideId: string;
      lat: number;
      lng: number;
      text: string;
      timestamp: number;
    };
    indexes: { 'by-rideId': string; 'by-timestamp': number };
  };
}

const DB_NAME = 'ridetrack-db';
const DB_VERSION = 1;
const MAX_RECORDS = 50;

let dbPromise: Promise<IDBPDatabase<RideTrackDB>> | null = null;

function getDB(): Promise<IDBPDatabase<RideTrackDB>> {
  if (!dbPromise) {
    dbPromise = openDB<RideTrackDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const recordsStore = db.createObjectStore('records', { keyPath: 'id' });
        recordsStore.createIndex('by-createdAt', 'createdAt');

        const reportsStore = db.createObjectStore('reports', { keyPath: 'id' });
        reportsStore.createIndex('by-rideId', 'rideId');
        reportsStore.createIndex('by-generatedAt', 'generatedAt');

        const trackStore = db.createObjectStore('trackPoints', { keyPath: 'id' });
        trackStore.createIndex('by-rideId', 'rideId');
        trackStore.createIndex('by-timestamp', 'timestamp');

        const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
        notesStore.createIndex('by-rideId', 'rideId');
        notesStore.createIndex('by-timestamp', 'timestamp');
      },
    });
  }
  return dbPromise;
}

export async function saveRecord(record: RideRecord): Promise<RideRecord> {
  const db = await getDB();
  const tx = db.transaction(['records', 'reports', 'trackPoints', 'notes'], 'readwrite');

  try {
    await tx.objectStore('records').put(record);

    if (record.trackPoints && record.trackPoints.length > 0) {
      const tpStore = tx.objectStore('trackPoints');
      const BATCH = 500;
      for (let i = 0; i < record.trackPoints.length; i += BATCH) {
        const batch = record.trackPoints.slice(i, i + BATCH);
        for (const tp of batch) {
          await tpStore.put({
            id: `${record.id}_tp_${i + batch.indexOf(tp)}`,
            rideId: record.id,
            index: i + batch.indexOf(tp),
            lat: tp.lat,
            lng: tp.lng,
            altitude: tp.altitude,
            timestamp: tp.timestamp,
            speed: tp.speed,
          });
        }
      }
    }

    if (record.notes && record.notes.length > 0) {
      const notesStore = tx.objectStore('notes');
      for (const note of record.notes) {
        await notesStore.put({
          ...note,
          rideId: record.id,
        });
      }
    }

    await pruneOldRecords(db, tx);
    await tx.done;
    return record;
  } catch (err) {
    tx.abort();
    throw err;
  }
}

export async function getRecord(id: string): Promise<RideRecord | undefined> {
  const db = await getDB();
  const tx = db.transaction(['records', 'trackPoints', 'notes'], 'readonly');

  try {
    const record = await tx.objectStore('records').get(id);
    if (!record) {
      await tx.done;
      return undefined;
    }

    const trackPointsRaw = await tx
      .objectStore('trackPoints')
      .index('by-rideId')
      .getAll(id);
    trackPointsRaw.sort((a, b) => a.index - b.index);
    record.trackPoints = trackPointsRaw.map((raw) => ({
      lat: raw.lat,
      lng: raw.lng,
      altitude: raw.altitude,
      timestamp: raw.timestamp,
      speed: raw.speed,
    }));

    const notesRaw = await tx
      .objectStore('notes')
      .index('by-rideId')
      .getAll(id);
    record.notes = notesRaw.map((n) => ({
      id: n.id,
      lat: n.lat,
      lng: n.lng,
      text: n.text,
      timestamp: n.timestamp,
    }));

    await tx.done;
    return record;
  } catch (err) {
    tx.abort();
    throw err;
  }
}

export async function listRecords(limit: number = MAX_RECORDS): Promise<
  Array<{
    id: string;
    createdAt: number;
    summary: RideRecord['summary'];
    title: string;
  }>
> {
  const db = await getDB();
  const tx = db.transaction('records', 'readonly');
  const index = tx.store.index('by-createdAt');
  const allRecords = await index.getAll(null, 'prev');
  const limited = allRecords.slice(0, limit);

  const result = limited.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    title: r.title,
    summary: r.summary,
  }));

  await tx.done;
  return result;
}

export async function deleteRecord(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['records', 'reports', 'trackPoints', 'notes'], 'readwrite');

  try {
    await tx.objectStore('records').delete(id);

    const reportKeys = await tx
      .objectStore('reports')
      .index('by-rideId')
      .getAllKeys(id);
    for (const key of reportKeys) {
      await tx.objectStore('reports').delete(key);
    }

    const trackKeys = await tx
      .objectStore('trackPoints')
      .index('by-rideId')
      .getAllKeys(id);
    for (const key of trackKeys) {
      await tx.objectStore('trackPoints').delete(key);
    }

    const noteKeys = await tx
      .objectStore('notes')
      .index('by-rideId')
      .getAllKeys(id);
    for (const key of noteKeys) {
      await tx.objectStore('notes').delete(key);
    }

    await tx.done;
  } catch (err) {
    tx.abort();
    throw err;
  }
}

export async function saveReport(report: RideReport): Promise<RideReport> {
  const db = await getDB();
  const tx = db.transaction('reports', 'readwrite');
  try {
    await tx.store.put(report);
    await tx.done;
    return report;
  } catch (err) {
    tx.abort();
    throw err;
  }
}

export async function getReportByRideId(rideId: string): Promise<RideReport | undefined> {
  const db = await getDB();
  const tx = db.transaction('reports', 'readonly');
  const reports = await tx.store.index('by-rideId').getAll(rideId);
  reports.sort((a, b) => b.generatedAt - a.generatedAt);
  await tx.done;
  return reports[0];
}

export async function getReport(id: string): Promise<RideReport | undefined> {
  const db = await getDB();
  const tx = db.transaction('reports', 'readonly');
  const report = await tx.store.get(id);
  await tx.done;
  return report;
}

export async function clearAll(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['records', 'reports', 'trackPoints', 'notes'], 'readwrite');
  try {
    await Promise.all([
      tx.objectStore('records').clear(),
      tx.objectStore('reports').clear(),
      tx.objectStore('trackPoints').clear(),
      tx.objectStore('notes').clear(),
    ]);
    await tx.done;
  } catch (err) {
    tx.abort();
    throw err;
  }
}

async function pruneOldRecords(
  db: IDBPDatabase<RideTrackDB>,
  tx: IDBPDatabase<RideTrackDB> extends { transaction(...args: any[]): infer T } ? T : any
): Promise<void> {
  const count = await tx.objectStore('records').count();
  if (count <= MAX_RECORDS) return;

  const index = tx.objectStore('records').index('by-createdAt');
  const allKeys: string[] = [];
  let cursor = await index.openCursor(null, 'next');
  while (cursor) {
    allKeys.push(cursor.primaryKey as string);
    cursor = await cursor.continue();
  }

  const excess = allKeys.length - MAX_RECORDS;
  if (excess > 0) {
    const toDelete = allKeys.slice(0, excess);
    for (const key of toDelete) {
      const reportKeys = await tx
        .objectStore('reports')
        .index('by-rideId')
        .getAllKeys(key);
      for (const rk of reportKeys) {
        await tx.objectStore('reports').delete(rk);
      }

      const trackKeys = await tx
        .objectStore('trackPoints')
        .index('by-rideId')
        .getAllKeys(key);
      for (const tk of trackKeys) {
        await tx.objectStore('trackPoints').delete(tk);
      }

      const noteKeys = await tx
        .objectStore('notes')
        .index('by-rideId')
        .getAllKeys(key);
      for (const nk of noteKeys) {
        await tx.objectStore('notes').delete(nk);
      }

      await tx.objectStore('records').delete(key);
    }
  }
}

export const indexedDBStorage = {
  saveRecord,
  getRecord,
  listRecords,
  deleteRecord,
  saveReport,
  getReport,
  getReportByRideId,
  clearAll,
};

export default indexedDBStorage;
