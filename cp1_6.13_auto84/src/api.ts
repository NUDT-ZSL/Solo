import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

export interface Pet {
  _id?: string
  name: string
  breed: string
  birthDate: string
  weight: string
  avatar: string
  borderColor: string
  createdAt?: string
}

export interface Task {
  _id?: string
  petId: string
  title: string
  category: 'feeding' | 'walking' | 'medication' | 'vet'
  date: string
  time: string
  notes: string
  completed: boolean
  createdAt?: string
}

export interface NotificationSettings {
  _id?: string
  type?: string
  defaultReminderTime: string
  weeklyReportEnabled: boolean
}

export const getPets = async (): Promise<Pet[]> => {
  const res = await api.get('/pets')
  return res.data
}

export const addPet = async (pet: Omit<Pet, '_id' | 'createdAt'>): Promise<Pet> => {
  const res = await api.post('/pets', pet)
  return res.data
}

export const updatePet = async (id: string, pet: Partial<Pet>): Promise<Pet> => {
  const res = await api.put(`/pets/${id}`, pet)
  return res.data
}

export const deletePet = async (id: string): Promise<{ success: boolean }> => {
  const res = await api.delete(`/pets/${id}`)
  return res.data
}

export const getTasks = async (petId?: string): Promise<Task[]> => {
  const url = petId ? `/tasks?petId=${petId}` : '/tasks'
  const res = await api.get(url)
  return res.data
}

export const addTask = async (task: Omit<Task, '_id' | 'createdAt' | 'completed'>): Promise<Task> => {
  const res = await api.post('/tasks', task)
  return res.data
}

export const updateTask = async (id: string, task: Partial<Task>): Promise<Task> => {
  const res = await api.put(`/tasks/${id}`, task)
  return res.data
}

export const deleteTask = async (id: string): Promise<{ success: boolean }> => {
  const res = await api.delete(`/tasks/${id}`)
  return res.data
}

export const getNotificationSettings = async (): Promise<NotificationSettings> => {
  const res = await api.get('/notifications')
  return res.data
}

export const updateNotificationSettings = async (settings: Partial<NotificationSettings>): Promise<NotificationSettings> => {
  const res = await api.put('/notifications/settings', settings)
  return res.data
}

export const seedData = async () => {
  const res = await api.get('/seed')
  return res.data
}

export default api
