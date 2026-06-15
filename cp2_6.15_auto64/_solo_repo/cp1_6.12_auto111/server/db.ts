import Datastore from 'nedb-promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data');

export const dialogDB = Datastore.create({
  filename: path.join(dbPath, 'dialogs.db'),
  autoload: true
});

export const historyDB = Datastore.create({
  filename: path.join(dbPath, 'history.db'),
  autoload: true
});
