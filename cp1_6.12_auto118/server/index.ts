import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbQueries, Plan, Member, Schedule, Expense } from './db.js';

const app = express();
const PORT = 3001;

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const listeners: Map<string, Array<{ res: express.Response; timer: NodeJS.Timeout }>> = new Map();

function notifyPlanUpdate(planId: string) {
  const planListeners = listeners.get(planId);
  if (planListeners) {
    planListeners.forEach(({ res, timer }) => {
      clearTimeout(timer);
      try {
        res.json({ updated: true });
      } catch (e) {}
    });
    listeners.delete(planId);
  }
}

function addPlanListener(planId: string, res: express.Response) {
  const timer = setTimeout(() => {
    const planListeners = listeners.get(planId);
    if (planListeners) {
      const filtered = planListeners.filter(l => l.res !== res);
      if (filtered.length === 0) {
        listeners.delete(planId);
      } else {
        listeners.set(planId, filtered);
      }
    }
    try {
      res.json({ updated: false });
    } catch (e) {}
  }, 30000);

  if (!listeners.has(planId)) {
    listeners.set(planId, []);
  }
  listeners.get(planId)!.push({ res, timer });
}

app.get('/api/plans/:id', (req, res) => {
  const plan = dbQueries.getPlanById.get(req.params.id) as Plan | undefined;
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  const members = dbQueries.getMembersByPlanId.all(plan.id) as Member[];
  const schedules = dbQueries.getSchedulesByPlanId.all(plan.id) as Schedule[];
  const totalBudgetRow = dbQueries.getTotalBudgetByPlan.get(plan.id) as { total: number };
  const dailyBudget = dbQueries.getDailyBudget.all(plan.id) as { date: string; total: number }[];
  const memberBudget = dbQueries.getMemberBudget.all(plan.id) as { id: string; name: string; avatar_color: string; total: number }[];

  res.json({
    plan: {
      ...plan,
      cities: JSON.parse(plan.cities)
    },
    members,
    schedules,
    summary: {
      totalBudget: totalBudgetRow.total,
      dailyBudget,
      memberBudget
    }
  });
});

app.get('/api/plans/code/:inviteCode', (req, res) => {
  const plan = dbQueries.getPlanByInviteCode.get(req.params.inviteCode.toUpperCase()) as Plan | undefined;
  if (!plan) {
    return res.status(404).json({ error: 'Invalid invite code' });
  }
  res.json({ planId: plan.id, planName: plan.name });
});

app.post('/api/plans', (req, res) => {
  const { name, startDate, endDate, cities, memberName } = req.body;

  if (!name || !startDate || !endDate || !cities || !memberName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const planId = uuidv4();
  let inviteCode = '';
  let attempts = 0;
  while (attempts < 10) {
    inviteCode = dbQueries.generateInviteCode();
    const existing = dbQueries.getPlanByInviteCode.get(inviteCode) as Plan | undefined;
    if (!existing) break;
    attempts++;
  }

  const memberId = uuidv4();
  const colors = ['#2E86C1', '#F39C12', '#27AE60', '#E74C3C', '#9B59B6', '#1ABC9C', '#E67E22', '#34495E', '#16A085', '#C0392B'];
  const avatarColor = colors[Math.floor(Math.random() * colors.length)];

  try {
    dbQueries.createPlan.run(planId, name, startDate, endDate, JSON.stringify(cities), inviteCode);
    dbQueries.addMember.run(memberId, planId, memberName, avatarColor);

    res.status(201).json({
      planId,
      memberId,
      inviteCode,
      plan: {
        id: planId,
        name,
        start_date: startDate,
        end_date: endDate,
        cities,
        invite_code: inviteCode
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

app.post('/api/plans/:id/join', (req, res) => {
  const { memberName } = req.body;
  const planId = req.params.id;

  const plan = dbQueries.getPlanById.get(planId) as Plan | undefined;
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found' });
  }

  if (!memberName) {
    return res.status(400).json({ error: 'Member name is required' });
  }

  const memberId = uuidv4();
  const colors = ['#2E86C1', '#F39C12', '#27AE60', '#E74C3C', '#9B59B6', '#1ABC9C', '#E67E22', '#34495E', '#16A085', '#C0392B'];
  const avatarColor = colors[Math.floor(Math.random() * colors.length)];

  try {
    dbQueries.addMember.run(memberId, planId, memberName, avatarColor);
    notifyPlanUpdate(planId);

    res.status(201).json({
      memberId,
      member: {
        id: memberId,
        plan_id: planId,
        name: memberName,
        avatar_color: avatarColor,
        is_online: 1
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to join plan' });
  }
});

app.get('/api/plans/:id/members', (req, res) => {
  const members = dbQueries.getMembersByPlanId.all(req.params.id) as Member[];
  res.json(members);
});

app.get('/api/plans/:id/schedules', (req, res) => {
  const schedules = dbQueries.getSchedulesByPlanId.all(req.params.id) as Schedule[];
  res.json(schedules);
});

app.post('/api/plans/:id/schedules', (req, res) => {
  const { memberId, date, time, location, activity, budget, expenseType } = req.body;
  const planId = req.params.id;

  if (!memberId || !date || !time || !location || !activity) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const scheduleId = uuidv4();

  try {
    dbQueries.addSchedule.run(
      scheduleId,
      planId,
      memberId,
      date,
      time,
      location,
      activity,
      budget || 0,
      expenseType || 'split'
    );
    notifyPlanUpdate(planId);

    const schedule = {
      id: scheduleId,
      plan_id: planId,
      member_id: memberId,
      date,
      time,
      location,
      activity,
      budget: budget || 0,
      expense_type: expenseType || 'split'
    };

    res.status(201).json(schedule);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add schedule' });
  }
});

app.put('/api/plans/:id/schedules/:scheduleId', (req, res) => {
  const { date, time, location, activity, budget, expenseType } = req.body;
  const planId = req.params.id;
  const scheduleId = req.params.scheduleId;

  try {
    const result = dbQueries.updateSchedule.run(
      date,
      time,
      location,
      activity,
      budget,
      expenseType,
      scheduleId,
      planId
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    notifyPlanUpdate(planId);
    res.json({ id: scheduleId, date, time, location, activity, budget, expense_type: expenseType });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

app.delete('/api/plans/:id/schedules/:scheduleId', (req, res) => {
  const planId = req.params.id;
  const scheduleId = req.params.scheduleId;

  try {
    const result = dbQueries.deleteSchedule.run(scheduleId, planId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    notifyPlanUpdate(planId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

app.get('/api/plans/:id/summary', (req, res) => {
  const planId = req.params.id;
  const totalBudgetRow = dbQueries.getTotalBudgetByPlan.get(planId) as { total: number };
  const dailyBudget = dbQueries.getDailyBudget.all(planId) as { date: string; total: number }[];
  const memberBudget = dbQueries.getMemberBudget.all(planId) as { id: string; name: string; avatar_color: string; total: number }[];

  res.json({
    totalBudget: totalBudgetRow.total,
    dailyBudget,
    memberBudget
  });
});

app.get('/api/plans/:id/poll', (req, res) => {
  const planId = req.params.id;
  const plan = dbQueries.getPlanById.get(planId) as Plan | undefined;
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found' });
  }
  addPlanListener(planId, res);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
