export interface TimeSlot {
  day: number;
  startMinute: number;
  endMinute: number;
}

export interface User {
  id: string;
  name: string;
  timezone: string;
  email?: string;
  availability: TimeSlot[];
}

export interface Recommendation {
  day: number;
  startTime: string;
  endTime: string;
  availableCount: number;
  conflictingUsers: string[];
  availableUsers: string[];
}

export interface Attendee {
  name: string;
  email: string;
  timezone: string;
}

export interface TimezoneTableRow {
  utcTime: string;
  localTimes: Record<string, string>;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  startTime: string;
  duration: number;
  attendees: Attendee[];
  timezoneTable: TimezoneTableRow[];
  createdAt: string;
}

export interface SelectedTime {
  day: number;
  startMinute: number;
}

export type GridCellInfo = {
  day: number;
  startMinute: number;
  count: number;
};
