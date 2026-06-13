const Datastore = require('nedb-promises');

const events = new Datastore({
  filename: './data/events.db',
  autoload: true,
});

const songs = new Datastore({
  filename: './data/songs.db',
  autoload: true,
});

module.exports = { events, songs };
