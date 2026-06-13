import Datastore from 'nedb-promises';
import path from 'path';

const trailDb = Datastore.create({
  filename: path.join(__dirname, '../../data/trail.db'),
  autoload: true,
});

export interface TrailRecord {
  _id?: string;
  bookId: string;
  fromUser: string;
  toUser: string;
  action: 'borrow' | 'return' | 'register';
  timestamp: string;
}

export async function addTrailRecord(record: Omit<TrailRecord, '_id'>): Promise<TrailRecord> {
  const doc = await trailDb.insert(record);
  return doc as TrailRecord;
}

export async function getTrailByBookId(bookId: string): Promise<TrailRecord[]> {
  const records = await trailDb
    .find({ bookId })
    .sort({ timestamp: 1 })
    .exec();
  return records as TrailRecord[];
}

export async function getTrailsByUser(userId: string): Promise<TrailRecord[]> {
  const records = await trailDb
    .find({ $or: [{ fromUser: userId }, { toUser: userId }] })
    .sort({ timestamp: -1 })
    .exec();
  return records as TrailRecord[];
}

export default trailDb;
