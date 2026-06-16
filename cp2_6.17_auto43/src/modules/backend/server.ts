import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import type { User, Recommendation, Event, TimeSlot, Attendee, TimezoneTableRow } from '@/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4000;

const DATA_DIR = path.resolve(__dirname, '../../../../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');

app.use(cors());
app.use(express.json());

function readUsers(): User[] {
  try {
    const data = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    return data.users || [];
  } catch {
    return [];
  }
}

function writeUsers(users: User[]): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(USERS_FILE, JSON.stringify({ users }, null, 2));
}

function readEvents(): Event[] {
  try {
    const data = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf-8'));
    return data.events || [];
  } catch {
    return [];
  }
}

function writeEvents(events: Event[]): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(EVENTS_FILE, JSON.stringify({ events }, null, 2));
}

function parseTimezoneOffset(tz: string): number {
  const match = tz.match(/UTC([+-])(\d{1,2})/);
  if (!match) return 0;
  const sign = match[1] === '+' ? 1 : -1;
  return sign * parseInt(match[2], 10);
}

function minuteToTimeString(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function convertTimeToTimezone(time: string, fromTz: string, toTz: string): string {
  const fromOffset = parseTimezoneOffset(fromTz);
  const toOffset = parseTimezoneOffset(toTz);
  const diffMinutes = (toOffset - fromOffset) * 60;
  const [h, m] = time.split(':').map(Number);
  let totalMinutes = h * 60 + m + diffMinutes;
  if (totalMinutes < 0) totalMinutes += 24 * 60;
  if (totalMinutes >= 24 * 60) totalMinutes -= 24 * 60;
  return minuteToTimeString(totalMinutes);
}

function isUserAvailableAt(user: User, day: number, startMinute: number, durationMinutes = 30): boolean {
  return user.availability.some(slot =>
    slot.day === day &&
    slot.startMinute <= startMinute &&
    slot.endMinute >= startMinute + durationMinutes
  );
}

function calculateRecommendations(): Recommendation[] {
  const users = readUsers();
  if (users.length === 0) return [];

  const results: Recommendation[] = [];

  for (let day = 0; day < 5; day++) {
    for (let startMinute = 0; startMinute < 24 * 60; startMinute += 30) {
      const availableUsers: string[] = [];
      const conflictingUsers: string[] = [];

      for (const user of users) {
        if (isUserAvailableAt(user, day, startMinute)) {
          availableUsers.push(user.name);
        } else {
          conflictingUsers.push(user.name);
        }
      }

      if (availableUsers.length > 0) {
        results.push({
          day,
          startTime: minuteToTimeString(startMinute),
          endTime: minuteToTimeString(startMinute + 30),
          availableCount: availableUsers.length,
          conflictingUsers,
          availableUsers
        });
      }
    }
  }

  return results
    .sort((a, b) => b.availableCount - a.availableCount)
    .slice(0, 3);
}

function generateTimezoneTable(
  startTime: string,
  duration: number,
  attendees: Attendee[]
): TimezoneTableRow[] {
  const rows: TimezoneTableRow[] = [];
  const [startH, startM] = startTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const stepMinutes = 30;
  const totalSteps = Math.ceil(duration / stepMinutes);

  for (let i = 0; i <= totalSteps; i++) {
    const currentMinutes = startMinutes + i * stepMinutes;
    const utcTime = minuteToTimeString(currentMinutes % (24 * 60));
    const localTimes: Record<string, string> = {};

    for (const attendee of attendees) {
      localTimes[attendee.timezone] = convertTimeToTimezone(
        minuteToTimeString(startMinutes),
        'UTC+0',
        attendee.timezone
      );
      const tzOffset = parseTimezoneOffset(attendee.timezone);
      const adjusted = currentMinutes + tzOffset * 60;
      const normalized = ((adjusted % (24 * 60)) + 24 * 60) % (24 * 60);
      localTimes[attendee.timezone] = minuteToTimeString(normalized);
    }

    rows.push({ utcTime, localTimes });
  }

  return rows;
}

app.get('/api/users', (_req, res) => {
  const users = readUsers();
  res.json({ users });
});

app.post('/api/users', (req, res) => {
  try {
    const { name, timezone, availability, email } = req.body as {
      name: string;
      timezone: string;
      availability: TimeSlot[];
      email?: string;
    };

    if (!name || !timezone || !availability) {
      return res.status(400).json({ success: false, error: '缺少必要字段' });
    }

    const users = readUsers();
    const newUser: User = {
      id: uuidv4(),
      name,
      timezone,
      email,
      availability
    };

    users.push(newUser);
    writeUsers(users);

    res.json({ success: true, user: newUser });
  } catch (err) {
    res.status(500).json({ success: false, error: '保存用户失败' });
  }
});

app.get('/api/recommend', (_req, res) => {
  try {
    const recommendations = calculateRecommendations();
    res.json({ recommendations });
  } catch (err) {
    res.status(500).json({ success: false, error: '计算推荐失败' });
  }
});

app.get('/api/events', (_req, res) => {
  const events = readEvents();
  res.json({ events });
});

app.post('/api/events', (req, res) => {
  try {
    const { title, date, startTime, duration, attendees } = req.body as {
      title: string;
      date: string;
      startTime: string;
      duration: number;
      attendees: Attendee[];
    };

    if (!title || !date || !startTime || !duration || !attendees) {
      return res.status(400).json({ success: false, error: '缺少必要字段' });
    }

    const timezoneTable = generateTimezoneTable(startTime, duration, attendees);

    const newEvent: Event = {
      id: uuidv4(),
      title,
      date,
      startTime,
      duration,
      attendees,
      timezoneTable,
      createdAt: new Date().toISOString()
    };

    const events = readEvents();
    events.unshift(newEvent);
    writeEvents(events);

    res.json({ success: true, event: newEvent });
  } catch (err) {
    res.status(500).json({ success: false, error: '创建事件失败' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

export default app;
