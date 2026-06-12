import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/init.js';

const router = Router();

router.post('/start', (req: Request, res: Response) => {
  const { book_id, user_id } = req.body;
  
  if (!book_id || !user_id) {
    return res.status(400).json({ success: false, message: '缺少必要参数' });
  }
  
  try {
    const activeSession = db.prepare(`
      SELECT * FROM reading_sessions 
      WHERE user_id = ? AND end_time IS NULL
    `).get(user_id);
    
    if (activeSession) {
      return res.status(400).json({ success: false, message: '已有进行中的阅读会话', data: activeSession });
    }
    
    const sessionId = uuidv4();
    const startTime = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO reading_sessions (id, book_id, user_id, start_time)
      VALUES (?, ?, ?, ?)
    `).run(sessionId, book_id, user_id, startTime);
    
    const session = db.prepare('SELECT * FROM reading_sessions WHERE id = ?').get(sessionId);
    
    res.json({ success: true, data: session, message: '开始阅读' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: '开始阅读失败' });
  }
});

router.post('/end/:sessionId', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  
  try {
    const session = db.prepare('SELECT * FROM reading_sessions WHERE id = ?').get(sessionId) as any;
    if (!session) {
      return res.status(404).json({ success: false, message: '阅读会话不存在' });
    }
    
    if (session.end_time) {
      return res.status(400).json({ success: false, message: '阅读会话已结束' });
    }
    
    const endTime = new Date();
    const startTime = new Date(session.start_time);
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    
    db.prepare(`
      UPDATE reading_sessions 
      SET end_time = ?, duration = ?
      WHERE id = ?
    `).run(endTime.toISOString(), duration, sessionId);
    
    const updatedSession = db.prepare('SELECT * FROM reading_sessions WHERE id = ?').get(sessionId);
    
    res.json({ success: true, data: updatedSession, message: '阅读结束' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: '结束阅读失败' });
  }
});

router.get('/active/user/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  
  try {
    const session = db.prepare(`
      SELECT rs.*, b.title, b.author, b.cover_emoji
      FROM reading_sessions rs
      JOIN books b ON rs.book_id = b.id
      WHERE rs.user_id = ? AND rs.end_time IS NULL
      ORDER BY rs.start_time DESC
      LIMIT 1
    `).get(userId);
    
    res.json({ success: true, data: session || null });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取当前阅读会话失败' });
  }
});

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

router.get('/daily/user/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  const { days = '7' } = req.query;
  const numDays = parseInt(days as string);
  
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - numDays + 1);
    
    const sessions = db.prepare(`
      SELECT start_time, duration, end_time
      FROM reading_sessions
      WHERE user_id = ? AND end_time IS NOT NULL
      AND date(start_time) >= date(?)
      ORDER BY start_time ASC
    `).all(userId, startDate.toISOString());
    
    const dailyMap = new Map<string, number>();
    
    for (let i = 0; i < numDays; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dailyMap.set(formatDate(d), 0);
    }
    
    (sessions as any[]).forEach(session => {
      const dateKey = session.start_time.split('T')[0];
      if (dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, dailyMap.get(dateKey)! + (session.duration || 0));
      }
    });
    
    const dailyData = Array.from(dailyMap.entries()).map(([date, duration]) => ({
      date,
      duration,
      hours: Math.round((duration / 3600) * 100) / 100
    }));
    
    const totalDuration = dailyData.reduce((sum, d) => sum + d.duration, 0);
    
    res.json({
      success: true,
      data: {
        daily: dailyData,
        total_hours: Math.round((totalDuration / 3600) * 100) / 100,
        total_duration: totalDuration
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: '获取每日阅读统计失败' });
  }
});

router.get('/weekly/user/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  const { weeks = '4' } = req.query;
  const numWeeks = parseInt(weeks as string);
  
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - numWeeks * 7 + 1);
    
    const sessions = db.prepare(`
      SELECT start_time, duration
      FROM reading_sessions
      WHERE user_id = ? AND end_time IS NOT NULL
      AND date(start_time) >= date(?)
      ORDER BY start_time ASC
    `).all(userId, startDate.toISOString());
    
    function getWeekKey(dateStr: string): string {
      const d = new Date(dateStr);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      return formatDate(monday);
    }
    
    const weeklyMap = new Map<string, number>();
    
    for (let i = numWeeks - 1; i >= 0; i--) {
      const weekStart = new Date(endDate);
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1) - i * 7;
      weekStart.setDate(diff);
      weeklyMap.set(formatDate(weekStart), 0);
    }
    
    (sessions as any[]).forEach(session => {
      const weekKey = getWeekKey(session.start_time);
      if (weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, weeklyMap.get(weekKey)! + (session.duration || 0));
      }
    });
    
    const weeklyData = Array.from(weeklyMap.entries()).map(([week, duration]) => ({
      week,
      duration,
      hours: Math.round((duration / 3600) * 100) / 100
    }));
    
    const totalDuration = weeklyData.reduce((sum, w) => sum + w.duration, 0);
    
    const currentWeekHours = weeklyData.length > 0 ? weeklyData[weeklyData.length - 1].hours : 0;
    const lastWeekHours = weeklyData.length > 1 ? weeklyData[weeklyData.length - 2].hours : 0;
    
    const growthPercent = lastWeekHours > 0 
      ? Math.round(((currentWeekHours - lastWeekHours) / lastWeekHours) * 100)
      : (currentWeekHours > 0 ? 100 : 0);
    
    res.json({
      success: true,
      data: {
        weekly: weeklyData,
        total_hours: Math.round((totalDuration / 3600) * 100) / 100,
        total_duration: totalDuration,
        current_week_hours: currentWeekHours,
        last_week_hours: lastWeekHours,
        growth_percent: growthPercent
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: '获取每周阅读统计失败' });
  }
});

router.get('/monthly/user/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  const { months = '6' } = req.query;
  const numMonths = parseInt(months as string);
  
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - numMonths + 1);
    startDate.setDate(1);
    
    const sessions = db.prepare(`
      SELECT start_time, duration
      FROM reading_sessions
      WHERE user_id = ? AND end_time IS NOT NULL
      AND date(start_time) >= date(?)
      ORDER BY start_time ASC
    `).all(userId, startDate.toISOString());
    
    function getMonthKey(dateStr: string): string {
      return dateStr.substring(0, 7);
    }
    
    const monthlyMap = new Map<string, number>();
    
    for (let i = 0; i < numMonths; i++) {
      const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
      monthlyMap.set(getMonthKey(d.toISOString()), 0);
    }
    
    (sessions as any[]).forEach(session => {
      const monthKey = getMonthKey(session.start_time);
      if (monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, monthlyMap.get(monthKey)! + (session.duration || 0));
      }
    });
    
    const monthlyData = Array.from(monthlyMap.entries()).map(([month, duration]) => ({
      month,
      duration,
      hours: Math.round((duration / 3600) * 100) / 100
    }));
    
    const totalDuration = monthlyData.reduce((sum, m) => sum + m.duration, 0);
    
    res.json({
      success: true,
      data: {
        monthly: monthlyData,
        total_hours: Math.round((totalDuration / 3600) * 100) / 100,
        total_duration: totalDuration
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: '获取每月阅读统计失败' });
  }
});

router.get('/summary/user/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  
  try {
    const totalResult = db.prepare(`
      SELECT SUM(duration) as total_duration, COUNT(*) as total_sessions
      FROM reading_sessions
      WHERE user_id = ? AND end_time IS NOT NULL
    `).get(userId) as any;
    
    const today = new Date();
    const weekStart = new Date(today);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
    weekStart.setDate(diff);
    
    const weekResult = db.prepare(`
      SELECT SUM(duration) as week_duration
      FROM reading_sessions
      WHERE user_id = ? AND end_time IS NOT NULL AND date(start_time) >= date(?)
    `).get(userId, weekStart.toISOString()) as any;
    
    const bookResult = db.prepare(`
      SELECT b.category, COUNT(*) as count
      FROM borrow_records br
      JOIN books b ON br.book_id = b.id
      WHERE br.user_id = ?
      GROUP BY b.category
      ORDER BY count DESC
    `).all(userId);
    
    const borrowStats = db.prepare(`
      SELECT 
        COUNT(*) as total_borrowed,
        SUM(CASE WHEN status = 'overdue' OR (status = 'returned' AND fine_amount > 0) THEN 1 ELSE 0 END) as overdue_count,
        SUM(CASE WHEN status IN ('borrowed', 'overdue') THEN 1 ELSE 0 END) as current_borrowed
      FROM borrow_records
      WHERE user_id = ?
    `).get(userId) as any;
    
    res.json({
      success: true,
      data: {
        total_reading_hours: Math.round(((totalResult?.total_duration || 0) / 3600) * 100) / 100,
        total_sessions: totalResult?.total_sessions || 0,
        week_reading_hours: Math.round(((weekResult?.week_duration || 0) / 3600) * 100) / 100,
        categories: bookResult || [],
        borrow_stats: borrowStats || { total_borrowed: 0, overdue_count: 0, current_borrowed: 0 }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: '获取用户统计摘要失败' });
  }
});

export default router;
