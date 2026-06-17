export interface Participant {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
}

export interface Note {
  id: string;
  content: string;
  author: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  attachments: Attachment[];
}

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'pdf';
  url: string;
  size: number;
  createdAt: string;
}

export type TodoPriority = 'urgent' | 'high' | 'medium' | 'low';

export interface TodoItem {
  id: string;
  title: string;
  assigneeId: string;
  priority: TodoPriority;
  dueDate: string;
  completed: boolean;
  createdAt: string;
}

export type MeetingStatus = 'upcoming' | 'ongoing' | 'finished';

export interface Meeting {
  id: string;
  title: string;
  dateTime: string;
  participants: Participant[];
  location: string;
  agenda: string;
  status: MeetingStatus;
  notes: Note[];
  todos: TodoItem[];
  createdAt: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface DashboardStats {
  totalMeetings: number;
  completedTodosRatio: number;
  avgTodosPerMeeting: number;
  last7DaysTodos: { date: string; count: number }[];
}
