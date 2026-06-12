import express from 'express';
import { getCourses, getCourseSlots, getSlotsByDate, createBooking } from '../database';

const router = express.Router();

router.get('/courses', async (req, res) => {
  try {
    const courses = await getCourses();
    res.json({ success: true, data: courses });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取课程列表失败' });
  }
});

router.get('/courses/:id/slots', async (req, res) => {
  try {
    const { id } = req.params;
    const date = req.query.date as string | undefined;
    const slots = await getCourseSlots(id, date);
    res.json({ success: true, data: slots });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取课程时段失败' });
  }
});

router.get('/slots/by-date/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const slots = await getSlotsByDate(date);
    res.json({ success: true, data: slots });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取日期时段失败' });
  }
});

router.post('/bookings', async (req, res) => {
  try {
    const { slot_id, course_id, customer_name, phone } = req.body;

    if (!slot_id || !course_id || !customer_name || !phone) {
      res.status(400).json({ success: false, error: '缺少必要参数' });
      return;
    }

    const booking = await createBooking({ slot_id, course_id, customer_name, phone });
    res.json({ success: true, data: { id: booking.id, message: '预约成功' } });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '预约失败';
    res.status(400).json({ success: false, error: errorMessage });
  }
});

export default router;
