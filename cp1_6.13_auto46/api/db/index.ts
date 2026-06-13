import Datastore from "nedb-promises";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = path.join(__dirname, "..", "data");
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export const classDB = Datastore.create({
  filename: path.join(DB_DIR, "classes.db"),
  autoload: true,
});

export const bookingDB = Datastore.create({
  filename: path.join(DB_DIR, "bookings.db"),
  autoload: true,
});

export const classChangeDB = Datastore.create({
  filename: path.join(DB_DIR, "class-changes.db"),
  autoload: true,
});

export const memberDB = Datastore.create({
  filename: path.join(DB_DIR, "members.db"),
  autoload: true,
});

export default {
  classDB,
  bookingDB,
  classChangeDB,
  memberDB,
};
