import { v4 as uuidv4 } from 'uuid';

export default (app, db) => {
  app.get('/api/milestones', (req, res) => {
    const milestones = db.data.milestones || [];
    res.json(milestones);
  });

  app.post('/api/milestones', (req, res) => {
    const { name, description, deadline, projectId } = req.body;

    if (!name) {
      return res.status(400).json({ error: '里程碑名称不能为空' });
    }

    const newMilestone = {
      id: uuidv4(),
      name,
      description: description || '',
      deadline: deadline || null,
      projectId: projectId || null,
      createdAt: new Date().toISOString(),
    };

    if (!db.data.milestones) {
      db.data.milestones = [];
    }

    db.data.milestones.push(newMilestone);
    db.write();

    res.status(201).json(newMilestone);
  });
};
