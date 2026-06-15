export interface Activity {
  _id: string;
  name: string;
  dateTime: string;
  location: string;
  maxParticipants: number;
  description: string;
  createdAt: string;
}

export interface Volunteer {
  _id: string;
  name: string;
}

export interface Registration {
  _id: string;
  activityId: string;
  volunteerName: string;
  registeredAt: string;
}

export interface ScheduleAssignment {
  _id: string;
  activityId: string;
  volunteerId: string;
  volunteerName: string;
}

export interface Notification {
  _id: string;
  activityId: string;
  activityName: string;
  message: string;
  type: 'reminder' | 'success';
  createdAt: string;
  dismissed?: boolean;
}

export interface CompletionRate {
  date: string;
  rate: number;
}

export interface CreateActivityData {
  name: string;
  dateTime: string;
  location: string;
  maxParticipants: number;
  description: string;
}
