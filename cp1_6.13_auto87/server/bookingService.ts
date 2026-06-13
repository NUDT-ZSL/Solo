import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Booking, CreateBookingRequest } from './types';
import { getCourseById, incrementBookedCount } from './courseService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = Datastore.create({
  filename: path.join(__dirname, 'data', 'bookings.db'),
  autoload: true,
});

function formatBooking(doc: Record<string, unknown>): Booking {
  const { _id, ...rest } = doc;
  return rest as Booking;
}

export async function getBookings(): Promise<Booking[]> {
  const docs = await db.find({}).sort({ createdAt: -1 }).exec();
  return docs.map(formatBooking);
}

export async function getBookingsByCourseId(courseId: string): Promise<Booking[]> {
  const docs = await db.find({ courseId }).sort({ createdAt: -1 }).exec();
  return docs.map(formatBooking);
}

export async function getBookingById(id: string): Promise<Booking | null> {
  const doc = await db.findOne({ id });
  return doc ? formatBooking(doc) : null;
}

export async function createBooking(data: CreateBookingRequest): Promise<Booking> {
  const course = await getCourseById(data.courseId);
  if (!course) {
    throw new Error('Course not found');
  }
  if (course.status === 'cancelled') {
    throw new Error('Course is cancelled');
  }

  const booking: Booking = {
    id: uuidv4(),
    courseId: data.courseId,
    studentName: data.studentName,
    phone: data.phone,
    email: data.email,
    notes: data.notes,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  const doc = await db.insert(booking);
  return formatBooking(doc);
}

export async function approveBooking(id: string): Promise<Booking | null> {
  const booking = await getBookingById(id);
  if (!booking || booking.status !== 'pending') return null;

  await db.update({ id }, { $set: { status: 'approved' } });
  await incrementBookedCount(booking.courseId, 1);

  const updated = { ...booking, status: 'approved' };

  console.log(`已向${booking.studentName}发送审核结果通知 (${booking.email})`);

  return updated;
}

export async function rejectBooking(id: string): Promise<Booking | null> {
  const booking = await getBookingById(id);
  if (!booking || booking.status !== 'pending') return null;

  await db.update({ id }, { $set: { status: 'rejected' } });

  const updated = { ...booking, status: 'rejected' };

  console.log(`已向${booking.studentName}发送审核结果通知 (${booking.email})`);

  return updated;
}

export async function notifyCourseCancelled(courseId: string): Promise<void> {
  const bookings = await getBookingsByCourseId(courseId);
  for (const booking of bookings) {
    if (booking.status === 'approved' || booking.status === 'pending') {
      console.log(`已向${booking.studentName}发送课程取消通知 (${booking.email})`);
    }
  }
}
