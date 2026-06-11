import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import {
  getAllProjects,
  getProjectById,
  createProject,
  getListsByProjectId,
  getCardsByListId,
  getCardsByProjectId,
  getCardById,
  createCard,
  updateCard,
  deleteCard,
  moveCard,
  getMembersByProjectId,
  createInvitation,
  acceptInvitation,
  addComment,
  getCommentsByCardId,
  Priority,
  Card,
} from './projectsStore';
import {
  initNotifications,
  notifyCardCreated,
  notifyCardUpdated,
  notifyCardDeleted,
  notifyCommentAdded,
  notifyMemberJoined,
} from './notifications';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

initNotifications(io);

app.use(express.json());

app.get('/api/projects', (req, res) => {
  const projects = getAllProjects();
  res.json(projects);
});

app.get('/api/projects/:projectId', (req, res) => {
  const project = getProjectById(req.params.projectId);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  res.json(project);
});

app.post('/api/projects', (req, res) => {
  const { name, description, ownerEmail } = req.body;
  if (!name || !ownerEmail) {
    res.status(400).json({ error: 'Name and ownerEmail are required' });
    return;
  }
  const project = createProject(name, description || '', ownerEmail);
  res.status(201).json(project);
});

app.get('/api/projects/:projectId/lists', (req, res) => {
  const project = getProjectById(req.params.projectId);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  const lists = getListsByProjectId(req.params.projectId);
  res.json(lists);
});

app.get('/api/projects/:projectId/cards', (req, res) => {
  const project = getProjectById(req.params.projectId);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  const cards = getCardsByProjectId(req.params.projectId);
  res.json(cards);
});

app.get('/api/lists/:listId/cards', (req, res) => {
  const cards = getCardsByListId(req.params.listId);
  res.json(cards);
});

app.post('/api/lists/:listId/cards', (req, res) => {
  const { title, description, priority, dueDate, assignee, userEmail } = req.body;
  if (!title) {
    res.status(400).json({ error: 'Title is required' });
    return;
  }

  const card = createCard(
    req.params.listId,
    title,
    description || '',
    (priority as Priority) || 'medium',
    dueDate || null,
    assignee || null
  );

  const lists = getListsByProjectId('');
  const list = lists.find((l) => l.id === req.params.listId);
  if (list) {
    notifyCardCreated(list.projectId, card, userEmail || 'unknown');
  }

  res.status(201).json(card);
});

app.put('/api/cards/:cardId', (req, res) => {
  const { userEmail, ...updates } = req.body;
  const card = updateCard(req.params.cardId, updates);
  if (!card) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }

  const allLists = getListsByProjectId('');
  const list = allLists.find((l) => l.id === card.listId);
  if (list) {
    notifyCardUpdated(list.projectId, card, userEmail || 'unknown');
  }

  res.json(card);
});

app.delete('/api/cards/:cardId', (req, res) => {
  const card = getCardById(req.params.cardId);
  if (!card) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }

  const allLists = getListsByProjectId('');
  const list = allLists.find((l) => l.id === card.listId);

  const deleted = deleteCard(req.params.cardId);
  if (deleted && list) {
    notifyCardDeleted(list.projectId, req.params.cardId, (req.query.userEmail as string) || 'unknown');
  }

  res.json({ success: deleted });
});

app.post('/api/cards/:cardId/move', (req, res) => {
  const { newListId, newOrder, userEmail } = req.body;
  if (!newListId || newOrder === undefined) {
    res.status(400).json({ error: 'newListId and newOrder are required' });
    return;
  }

  const card = getCardById(req.params.cardId);
  if (!card) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }

  const allLists = getListsByProjectId('');
  const oldList = allLists.find((l) => l.id === card.listId);

  const movedCard = moveCard(req.params.cardId, newListId, newOrder);
  if (!movedCard) {
    res.status(500).json({ error: 'Failed to move card' });
    return;
  }

  const newList = allLists.find((l) => l.id === newListId);
  if (newList) {
    notifyCardUpdated(newList.projectId, movedCard, userEmail || 'unknown');
  }

  res.json(movedCard);
});

app.get('/api/projects/:projectId/members', (req, res) => {
  const project = getProjectById(req.params.projectId);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  const members = getMembersByProjectId(req.params.projectId);
  res.json(members);
});

app.post('/api/projects/:projectId/invitations', (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  const project = getProjectById(req.params.projectId);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const invitation = createInvitation(req.params.projectId, email);
  const inviteLink = `http://localhost:5173/invite/${invitation.token}`;

  res.status(201).json({
    invitation,
    inviteLink,
  });
});

app.post('/api/invitations/:token/accept', (req, res) => {
  const { name } = req.body;
  const member = acceptInvitation(req.params.token, name || '');
  if (!member) {
    res.status(404).json({ error: 'Invitation not found or already accepted' });
    return;
  }

  notifyMemberJoined(member.projectId, member);

  res.json(member);
});

app.get('/api/cards/:cardId/comments', (req, res) => {
  const card = getCardById(req.params.cardId);
  if (!card) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }
  const comments = getCommentsByCardId(req.params.cardId);
  res.json(comments);
});

app.post('/api/cards/:cardId/comments', (req, res) => {
  const { author, content } = req.body;
  if (!author || !content) {
    res.status(400).json({ error: 'Author and content are required' });
    return;
  }

  const card = getCardById(req.params.cardId);
  if (!card) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }

  const comment = addComment(req.params.cardId, author, content);

  const allLists = getListsByProjectId('');
  const list = allLists.find((l) => l.id === card.listId);
  if (list) {
    notifyCommentAdded(list.projectId, comment, card.title);
  }

  res.status(201).json(comment);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
