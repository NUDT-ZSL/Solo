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
    const {