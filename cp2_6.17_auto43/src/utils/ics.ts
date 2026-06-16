import type { Event, Attendee } from '@/types';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

function formatICSDate(dateStr: string, timeStr: string, duration: number): string {
  const dt = dayjs(`${dateStr}T${timeStr}`).utc();
  return dt.format('YYYYMMDDTHHmmss') + 'Z';
}

function formatICSEndDate(dateStr: string, timeStr: string, duration: number): string {
  const dt = dayjs(`${dateStr}T${timeStr}`).add(duration, 'minute').utc();
  return dt.format('YYYYMMDDTHHmmss') + 'Z';
}

function escapeICS(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function generateICSContent(event: Event): string {
  const now = dayjs().utc().format('YYYYMMDDTHHmmss') + 'Z';
  const attendeesList = event.attendees
    .map((a: Attendee) => `ATTENDEE;CN=${escapeICS(a.name)}:mailto:${a.email}`)
    .join('\r\n');

  const description = event.attendees.map(a => `${a.name} (${a.timezone})`).join(', ');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TimeSync//Meeting Scheduler//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@timesync`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatICSDate(event.date, event.startTime, event.duration)}`,
    `DTEND:${formatICSEndDate(event.date, event.startTime, event.duration)}`,
    `SUMMARY:${escapeICS(event.title)}`,
    `DESCRIPTION:${escapeICS(description)}`,
    attendeesList,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

export function downloadICS(event: Event): void {
  const content = generateICSContent(event);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.title.replace(/\s+/g, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
