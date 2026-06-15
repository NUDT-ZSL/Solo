import Datastore from 'nedb-promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const events = Datastore.create({
  filename: join(__dirname, '..', 'data', 'events.db'),
  autoload: true,
});

const songs = Datastore.create({
  filename: join(__dirname, '..', 'data', 'songs.db'),
  autoload: true,
});

export { events, songs };
