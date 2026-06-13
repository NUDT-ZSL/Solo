import DataStore from 'nedb-promises';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const classesDB = DataStore.create({ filename: path.join(dataDir, 'classes.db'), autoload: true });
const bookingsDB = DataStore.create({ filename: path.join(dataDir, 'bookings.db'), autoload: true });
const changesDB = DataStore.create({ filename: path.join(dataDir, 'changes.db'), autoload: true });
const membersDB = DataStore.create({ filename: path.join(dataDir, 'members.db'), autoload: true });

export { classesDB, bookingsDB, changesDB, membersDB };
