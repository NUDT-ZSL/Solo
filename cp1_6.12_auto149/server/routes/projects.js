import { v4 as uuidv4 } from 'uuid';

export default (app, db) => {
  app.get('/api/projects', (req, res) => {
    const projects = db.data.projects || [];
    res.json(projects);
  });

  app.post('/api/projects', (req, res) => {
    const { name, description, deadline } = req.body;

    if (!name) {
      return res.status(400).json({ error: '项目名称不能为空' });
    }

    const newProject = {
      id: uuidv4(),
      name,
      description: description || '',
      deadline: deadline || null,
      createdAt: new Date().toISOString(),
    };

    if (!db.data.projects) {
      db.data.projects = [];
    }

    db.data.projects.push(newProject);
    db.write();

    res.status(201).json(newProject);
  });
};
