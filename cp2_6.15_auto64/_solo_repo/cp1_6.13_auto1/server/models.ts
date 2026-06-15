import Datastore from 'nedb-promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbDir = join(__dirname, '..', 'data');

export interface User {
  id: string;
  name: string;
  color: string;
}

export interface Note {
  id: string;
  sessionId: string;
  content: string;
  x: number;
  y: number;
  color: string;
  authorId: string;
  authorName: string;
  votes: string[];
  createdAt: number;
}

export interface Session {
  id: string;
  code: string;
  title: string;
  description: string;
  deadline: number;
  hostId: string;
  notes: Note[];
  users: User[];
  voting: boolean;
  voteCandidates: string[];
  createdAt: number;
}

const sessionsDb = Datastore.create({
  filename: join(dbDir, 'sessions.db'),
  autoload: true,
});

const notesDb = Datastore.create({
  filename: join(dbDir, 'notes.db'),
  autoload: true,
});

function generateCode(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return code;
}

export const NOTE_COLORS = [
  '#fef3c7',
  '#dbeafe',
  '#ecfccb',
  '#fce7f3',
  '#e0e7ff',
  '#fef9c3',
];

export const USER_COLORS = [
  '#f87171',
  '#fb923c',
  '#fbbf24',
  '#a3e635',
  '#34d399',
  '#22d3ee',
  '#60a5fa',
  '#a78bfa',
  '#f472b6',
];

export function randomNoteColor(): string {
  return NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)];
}

export function randomUserColor(): string {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}

export async function createSession(
  title: string,
  description: string,
  deadline: number,
  hostName: string
): Promise<Session> {
  let code = generateCode();
  let existing = await sessionsDb.findOne({ code });
  while (existing) {
    code = generateCode();
    existing = await sessionsDb.findOne({ code });
  }

  const hostId = uuidv4();
  const session: Session = {
    id: uuidv4(),
    code,
    title,
    description,
    deadline,
    hostId,
    notes: [],
    users: [
      {
        id: hostId,
        name: hostName,
        color: randomUserColor(),
      },
    ],
    voting: false,
    voteCandidates: [],
    createdAt: Date.now(),
  };

  await sessionsDb.insert(session);
  return session;
}

export async function findSessionByCode(code: string): Promise<Session | null> {
  return sessionsDb.findOne({ code: code.toUpperCase() });
}

export async function findSessionById(id: string): Promise<Session | null> {
  return sessionsDb.findOne({ id });
}

export async function addUserToSession(
  sessionId: string,
  userName: string
): Promise<{ session: Session; user: User } | null> {
  const session = await sessionsDb.findOne({ id: sessionId });
  if (!session) return null;

  const user: User = {
    id: uuidv4(),
    name: userName,
    color: randomUserColor(),
  };

  session.users.push(user);
  await sessionsDb.update({ id: sessionId }, { $set: { users: session.users } });
  return { session, user };
}

export async function removeUserFromSession(
  sessionId: string,
  userId: string
): Promise<Session | null> {
  const session = await sessionsDb.findOne({ id: sessionId });
  if (!session) return null;

  session.users = session.users.filter((u) => u.id !== userId);
  await sessionsDb.update({ id: sessionId }, { $set: { users: session.users } });
  return session;
}

export async function addNote(
  sessionId: string,
  note: Omit<Note, 'id' | 'sessionId' | 'createdAt' | 'votes'>
): Promise<Note | null> {
  const fullNote: Note = {
    ...note,
    id: uuidv4(),
    sessionId,
    votes: [],
    createdAt: Date.now(),
  };

  await notesDb.insert(fullNote);

  const session = await sessionsDb.findOne({ id: sessionId });
  if (session) {
    session.notes.push(fullNote);
    await sessionsDb.update({ id: sessionId }, { $set: { notes: session.notes } });
  }

  return fullNote;
}

export async function updateNote(
  noteId: string,
  updates: Partial<Pick<Note, 'content' | 'x' | 'y' | 'color'>>
): Promise<Note | null> {
  const note = await notesDb.findOne({ id: noteId });
  if (!note) return null;

  const updated = { ...note, ...updates };
  await notesDb.update({ id: noteId }, { $set: updates });

  const session = await sessionsDb.findOne({ id: note.sessionId });
  if (session) {
    const idx = session.notes.findIndex((n) => n.id === noteId);
    if (idx !== -1) {
      session.notes[idx] = updated;
      await sessionsDb.update({ id: note.sessionId }, { $set: { notes: session.notes } });
    }
  }

  return updated;
}

export async function deleteNote(noteId: string): Promise<boolean> {
  const note = await notesDb.findOne({ id: noteId });
  if (!note) return false;

  await notesDb.remove({ id: noteId });

  const session = await sessionsDb.findOne({ id: note.sessionId });
  if (session) {
    session.notes = session.notes.filter((n) => n.id !== noteId);
    await sessionsDb.update({ id: note.sessionId }, { $set: { notes: session.notes } });
  }

  return true;
}

export async function toggleVote(
  noteId: string,
  userId: string
): Promise<{ note: Note | null; voted: boolean }> {
  const note = await notesDb.findOne({ id: noteId });
  if (!note) return { note: null, voted: false };

  const idx = note.votes.indexOf(userId);
  let voted: boolean;
  if (idx === -1) {
    note.votes.push(userId);
    voted = true;
  } else {
    note.votes.splice(idx, 1);
    voted = false;
  }

  await notesDb.update({ id: noteId }, { $set: { votes: note.votes } });

  const session = await sessionsDb.findOne({ id: note.sessionId });
  if (session) {
    const nIdx = session.notes.findIndex((n) => n.id === noteId);
    if (nIdx !== -1) {
      session.notes[nIdx] = note;
      await sessionsDb.update({ id: note.sessionId }, { $set: { notes: session.notes } });
    }
  }

  return { note, voted };
}

export async function startVoting(
  sessionId: string,
  candidateIds: string[]
): Promise<Session | null> {
  const session = await sessionsDb.findOne({ id: sessionId });
  if (!session) return null;

  session.voting = true;
  session.voteCandidates = candidateIds;
  session.notes.forEach((n) => (n.votes = []));
  await sessionsDb.update(
    { id: sessionId },
    { $set: { voting: true, voteCandidates: candidateIds, notes: session.notes } }
  );

  for (const nId of candidateIds) {
    await notesDb.update({ id: nId }, { $set: { votes: [] } });
  }

  return session;
}

export async function endVoting(sessionId: string): Promise<Session | null> {
  const session = await sessionsDb.findOne({ id: sessionId });
  if (!session) return null;

  session.voting = false;
  session.voteCandidates = [];
  await sessionsDb.update(
    { id: sessionId },
    { $set: { voting: false, voteCandidates: [] } }
  );
  return session;
}

export async function getSessionNotes(sessionId: string): Promise<Note[]> {
  return notesDb.find({ sessionId }).sort({ createdAt: 1 });
}
