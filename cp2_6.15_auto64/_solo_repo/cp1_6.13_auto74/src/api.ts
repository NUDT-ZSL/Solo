import axios from 'axios';

export interface Animal {
  _id: string;
  name: string;
  species: 'cat' | 'dog' | string;
  breed: string;
  age: number;
  gender: string;
  vaccinated: boolean;
  personality: string;
  photo: string | null;
  thumbnail: string | null;
  createdAt: string;
}

export interface Application {
  _id: string;
  animalId: string;
  animalName: string;
  applicantName: string;
  phone: string;
  address: string;
  experience: string;
  status: string;
  createdAt: string;
}

export interface Volunteer {
  _id: string;
  name: string;
  phone: string;
  availableSlots: string[];
  createdAt: string;
}

export interface Schedule {
  _id: string;
  volunteerId: string;
  volunteerName: string;
  day: string;
  timeSlot: string;
  createdAt: string;
  conflict?: boolean;
}

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export const getAnimals = (): Promise<Animal[]> =>
  api.get('/animals').then((res) => res.data);

export const addAnimal = (data: FormData | Partial<Animal>): Promise<Animal> => {
  if (data instanceof FormData) {
    const obj: Record<string, any> = {};
    data.forEach((value, key) => {
      obj[key] = value;
    });
    return api.post('/animals', obj).then((res) => res.data);
  }
  return api.post('/animals', data).then((res) => res.data);
};

export const deleteAnimal = (id: string): Promise<{ success: boolean }> =>
  api.delete(`/animals/${id}`).then((res) => res.data);

export const getApplications = (): Promise<Application[]> =>
  api.get('/applications').then((res) => res.data);

export const submitApplication = (data: Partial<Application>): Promise<Application> =>
  api.post('/applications', data).then((res) => res.data);

export const updateApplicationStatus = (
  id: string,
  status: string
): Promise<Application> =>
  api.put(`/applications/${id}/status`, { status }).then((res) => res.data);

export const getVolunteers = (): Promise<Volunteer[]> =>
  api.get('/volunteers').then((res) => res.data);

export const addVolunteer = (data: Partial<Volunteer>): Promise<Volunteer> =>
  api.post('/volunteers', data).then((res) => res.data);

export const getSchedules = (): Promise<Schedule[]> =>
  api.get('/schedules').then((res) => res.data);

export const addSchedule = (data: Partial<Schedule>): Promise<Schedule> =>
  api.post('/schedules', data).then((res) => res.data);

export const deleteSchedule = (id: string): Promise<{ success: boolean }> =>
  api.delete(`/schedules/${id}`).then((res) => res.data);
