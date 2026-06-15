export interface Plan {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  cities: string[];
  invite_code: string;
  created_at?: string;
}

export interface Member {
  id: string;
  plan_id: string;
  name: string;
  avatar_color: string;
  is_online: number;
  joined_at?: string;
}

export interface Schedule {
  id: string;
  plan_id: string;
  member_id: string;
  date: string;
  time: string;
  location: string;
  activity: string;
  budget: number;
  expense_type: string;
  is_personal: number;
  created_at?: string;
}

export interface Expense {
  id: string;
  plan_id: string;
  member_id: string;
  schedule_id?: string;
  amount: number;
  description?: string;
  expense_type: string;
  split_type: string;
  date: string;
  created_at?: string;
}

export interface DailyBudget {
  date: string;
  total: number;
}

export interface MemberBudget {
  id: string;
  name: string;
  avatar_color: string;
  total: number;
}

export interface Summary {
  totalBudget: number;
  dailyBudget: DailyBudget[];
  memberBudget: MemberBudget[];
}

export interface PlanData {
  plan: Plan;
  members: Member[];
  schedules: Schedule[];
  summary: Summary;
}
