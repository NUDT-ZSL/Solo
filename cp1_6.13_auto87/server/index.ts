import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  seedSampleCourses,
  getAvailableSlots,
} from './courseService';
import {
  getBookings,
  getBookingsByCourseId,
  createBooking,
  approveBooking,
  rejectBooking,
  notifyCourseCancelled,
} from './bookingService';
import type { CreateCourseRequest, UpdateCourseRequest, CreateBookingRequest } from './types';

dotenv.config();

const app: express.Application = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

seedSampleCourses();

app.get('/api/courses', async (req: Request, res: Response) => {
  try {
    const courses = await getCourses();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    const filtered = courses.filter((c) => {
      const courseDate = new Date(c.date);
      return courseDate <= thirtyDaysLater && c.status === 'active';
    });
    res.json({ success: true, data: filtered });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch courses' });
  }
});

app.get('/api/courses/:id', async (req: Request, res: Response) => {
  try {
    const course = await getCourseById(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    res.json({ success: true, data: course });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch course' });
  }
});

app.get('/api/courses/:id/slots', async (req: Request, res: Response) => {
  try {
    const slots = await getAvailableSlots(req.params.id);
    res.json({ success: true, data: { slots } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch slots' });
  }
});

app.post('/api/courses', async (req: Request, res: Response) => {
  try {
    const data = req.body as CreateCourseRequest;
    const course = await createCourse(data);
    res.json({ success: true, data: course });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create course' });
  }
});

app.put('/api/courses/:id', async (req: Request, res: Response) => {
  try {
    const data = req.body as UpdateCourseRequest;
    const course = await updateCourse(req.params.id, data);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    res.json({ success: true, data: course });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update course' });
  }
});

app.delete('/api/courses/:id', async (req: Request, res: Response) => {
  try {
    const course = await deleteCourse(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    await notifyCourseCancelled(req.params.id);
    res.json({ success: true, data: course });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to cancel course' });
  }
});

app.post('/api/bookings', async (req: Request, res: Response) => {
  try {
    const data = req.body as CreateBookingRequest;
    const booking = await createBooking(data);
    res.json({ success: true, data: booking });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create booking';
    res.status(400).json({ success: false, message });
  }
});

app.get('/api/bookings', async (req: Request, res: Response) => {
  try {
    const bookings = await getBookings();
    res.json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch bookings' });
  }
});

app.get('/api/bookings/course/:courseId', async (req: Request, res: Response) => {
  try {
    const bookings = await getBookingsByCourseId(req.params.courseId);
    res.json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch bookings' });
  }
});

app.put('/api/bookings/:id/approve', async (req: Request, res: Response) => {
  try {
    const booking = await approveBooking(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found or not pending' });
    }
    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to approve booking' });
  }
});

app.put('/api/bookings/:id/reject', async (req: Request, res: Response) => {
  try {
    const booking = await rejectBooking(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found or not pending' });
    }
    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to reject booking' });
  }
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ success: true, message: 'ok' });
});

app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  res.status(500).json({ success: false, error: 'Server internal error' });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' });
});

const server = app.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
