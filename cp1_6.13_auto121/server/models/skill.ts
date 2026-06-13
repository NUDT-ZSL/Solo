export interface TimeSlot {
  id: string;
  date: string;
  start: string;
  end: string;
  booked: boolean;
}

export interface SkillDoc {
  _id?: string;
  userId: string;
  userName: string;
  userAvatar: string;
  title: string;
  description: string;
  availableSlots: TimeSlot[];
  createdAt: number;
}
