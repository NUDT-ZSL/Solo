import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Course, CreateCourseRequest, UpdateCourseRequest } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = Datastore.create({
  filename: path.join(__dirname, 'data', 'courses.db'),
  autoload: true,
});

function formatCourse(doc: Record<string, unknown>): Course {
  const { _id, ...rest } = doc;
  return rest as Course;
}

export async function getCourses(): Promise<Course[]> {
  const docs = await db.find({}).sort({ date: 1, time: 1 }).exec();
  return docs.map(formatCourse);
}

export async function getCourseById(id: string): Promise<Course | null> {
  const doc = await db.findOne({ id });
  return doc ? formatCourse(doc) : null;
}

export async function getAvailableSlots(courseId: string): Promise<number> {
  const course = await getCourseById(courseId);
  if (!course) return 0;
  return Math.max(0, course.capacity - course.bookedCount);
}

export async function createCourse(data: CreateCourseRequest): Promise<Course> {
  const course: Course = {
    id: uuidv4(),
    name: data.name,
    date: data.date,
    time: data.time,
    instructor: data.instructor,
    capacity: data.capacity ?? 10,
    bookedCount: 0,
    price: data.price,
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  const doc = await db.insert(course);
  return formatCourse(doc);
}

export async function updateCourse(id: string, data: UpdateCourseRequest): Promise<Course | null> {
  const existing = await getCourseById(id);
  if (!existing) return null;
  const updated = { ...existing, ...data };
  await db.update({ id }, { $set: data });
  return updated;
}

export async function incrementBookedCount(courseId: string, delta: number): Promise<void> {
  await db.update({ id: courseId }, { $inc: { bookedCount: delta } });
}

export async function deleteCourse(id: string): Promise<Course | null> {
  const existing = await getCourseById(id);
  if (!existing) return null;
  await db.update({ id }, { $set: { status: 'cancelled' } });
  return { ...existing, status: 'cancelled' };
}

export async function seedSampleCourses(): Promise<void> {
  const count = await db.count({});
  if (count > 0) return;

  const today = new Date();
  const samples: CreateCourseRequest[] = [
    {
      name: '手工皮雕基础班',
      date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '10:00',
      instructor: '李师傅',
      capacity: 8,
      price: 299,
    },
    {
      name: '皮具制作进阶班',
      date: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '14:00',
      instructor: '张师傅',
      capacity: 6,
      price: 499,
    },
    {
      name: '钱包制作入门',
      date: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '09:30',
      instructor: '王师傅',
      capacity: 10,
      price: 199,
    },
    {
      name: '皮带定制课程',
      date: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '15:00',
      instructor: '李师傅',
      capacity: 12,
      price: 159,
    },
    {
      name: '手工染色工艺',
      date: new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '10:30',
      instructor: '张师傅',
      capacity: 6,
      price: 399,
    },
    {
      name: '高级皮具设计',
      date: new Date(today.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      time: '13:00',
      instructor: '陈师傅',
      capacity: 5,
      price: 699,
    },
  ];

  for (const sample of samples) {
    await createCourse(sample);
  }

  console.log('Sample courses seeded');
}
