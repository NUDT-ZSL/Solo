import Datastore from 'nedb-promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const configsDb = new Datastore({
  filename: path.join(__dirname, 'data', 'configs.db'),
  autoload: true,
});

const presetsDb = new Datastore({
  filename: path.join(__dirname, 'data', 'presets.db'),
  autoload: true,
});

export { configsDb, presetsDb };
