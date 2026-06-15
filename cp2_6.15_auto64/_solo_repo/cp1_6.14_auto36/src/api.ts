import axios, { AxiosInstance } from 'axios';

export interface User {
  _id: string;
  nickname: string;
  email: string;
  avatar: string;
  rating: number;
  bio: string;
  canTeach: string[];
  wantLearn: string[];
  createdAt: number;
}

export interface TimeSlot {
  id: string;
  dayOfWeek: number;
  time: string;
  booked: boolean;
  bookedBy?: string;
}

export interface Skill {
  _id: string;
  title: string;
  category: string;
  description: string;
  coverColor: string;
  teacherId: string;
  teacherName: string;
  teacherAvatar: string;
  availableSlots: TimeSlot[];
  createdAt: number;
}

export interface SkillDetail extends Skill {
  teacher: User;
  reviews: Review[];
}

export interface Review {
  _id: string;
  skillId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  content: string;
  createdAt: number;
}

export interface Message {
  _id: string;
  from: string;
  to: string;
  content: string;
  read: boolean;
  createdAt: number;
}

export interface Conversation {
  peerId: string;
  peer: User;
  lastMessage: Message;
}

export interface MatchResult {
  user: User;
  similarity: number;
  commonCanTeach: string[];
  commonWantLearn: string[];
}

const TOKEN_KEY = 'skillswap_token';
const USER_KEY = 'skillswap_user';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const getSavedUser = (): User | null => {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as User) : null;
};

const http: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
    return Promise.reject(err);
  }
);

export async function login(email: string, password: string) {
  const { data } = await http.post<{ token: string; user: User }>('/login', { email, password });
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data;
}

export async function register(nickname: string, email: string, password: string) {
  const { data } = await http.post<{ token: string; user: User }>('/register', { nickname, email, password });
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return data;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function getSkills(q?: string) {
  const { data } = await http.get<Skill[]>('/skills', { params: q ? { q } : {} });
  return data;
}

export async function getSkillDetail(id: string) {
  const { data } = await http.get<SkillDetail>(`/skills/${id}`);
  return data;
}

export async function bookSkill(id: string, slotId: string, date: string) {
  const { data } = await http.post<{ ok: boolean }>(`/skills/${id}/book`, { slotId, date });
  return data;
}

export async function getUsers() {
  const { data } = await http.get<User[]>('/users');
  return data;
}

export async function getUser(id: string) {
  const { data } = await http.get<User>(`/users/${id}`);
  return data;
}

export async function getMatches(canTeach: string[], wantLearn: string[]) {
  const params = new URLSearchParams();
  canTeach.forEach((t) => params.append('canTeach', t));
  wantLearn.forEach((t) => params.append('wantLearn', t));
  const { data } = await http.get<MatchResult[]>(`/match?${params.toString()}`);
  return data;
}

export async function getConversationList() {
  const { data } = await http.get<Conversation[]>('/messages');
  return data;
}

export async function getMessages(peerId: string) {
  const { data } = await http.get<Message[]>(`/messages/${peerId}`);
  return data;
}

export async function sendMessage(to: string, content: string) {
  const { data } = await http.post<Message>('/messages', { to, content });
  return data;
}

export async function getReviews(skillId: string) {
  const { data } = await http.get<Review[]>(`/reviews/${skillId}`);
  return data;
}
