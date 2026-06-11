import { v4 as uuidv4 } from 'uuid';

export type Priority = 'high' | 'medium' | 'low';

export interface Comment {
  id: string;
  cardId: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface Card {
  id: string;
  listId: string;
  title: string;
  description: string;
  priority: Priority;
  dueDate: string | null;
  assignee: string | null;
  order: number;
  createdAt: string;
  completedAt: string | null;
}

export interface List {
  id: string;
  projectId: string;
  title: string;
  order: number;
}

export interface Member {
  id: string;
  projectId: string;
  email: string;
  name: string;
  role: 'owner' | 'member';
  joinedAt: string;
}

export interface Invitation {
  id: string;
  projectId: string;
  email: string;
  token: string;
  invitedAt: string;
  accepted: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  ownerEmail: string;
}

interface StoreData {
  projects: Project[];
  lists: List[];
  cards: Card[];
  members: Member[];
  invitations: Invitation[];
  comments: Comment[];
}

const data: StoreData = {
  projects: [],
  lists: [],
  cards: [],
  members: [],
  invitations: [],
  comments: [],
};

function initSampleData() {
  const projectId = uuidv4();
  const today = new Date().toISOString();

  const sampleProject: Project = {
    id: projectId,
    name: '示例项目',
    description: '这是一个示例项目，展示 LightFlow 的功能',
    createdAt: today,
    ownerEmail: 'demo@example.com',
  };
  data.projects.push(sampleProject);

  const ownerMember: Member = {
    id: uuidv4(),
    projectId,
    email: 'demo@example.com',
    name: '演示用户',
    role: 'owner',
    joinedAt: today,
  };
  data.members.push(ownerMember);

  const listIds = [uuidv4(), uuidv4(), uuidv4()];
  const listTitles = ['待办', '进行中', '完成'];

  listTitles.forEach((title, index) => {
    const list: List = {
      id: listIds[index],
      projectId,
      title,
      order: index,
    };
    data.lists.push(list);
  });

  const sampleCards: Card[] = [
    {
      id: uuidv4(),
      listId: listIds[0],
      title: '设计用户界面原型',
      description: '完成产品首页和主要功能页面的UI设计稿',
      priority: 'high',
      dueDate: addDays(today, 3),
      assignee: 'demo@example.com',
      order: 0,
      createdAt: today,
      completedAt: null,
    },
    {
      id: uuidv4(),
      listId: listIds[0],
      title: '编写技术文档',
      description: '整理项目技术架构和API接口文档',
      priority: 'medium',
      dueDate: addDays(today, 5),
      assignee: null,
      order: 1,
      createdAt: today,
      completedAt: null,
    },
    {
      id: uuidv4(),
      listId: listIds[1],
      title: '开发用户认证模块',
      description: '实现登录、注册和权限管理功能',
      priority: 'high',
      dueDate: addDays(today, 1),
      assignee: 'demo@example.com',
      order: 0,
      createdAt: today,
      completedAt: null,
    },
    {
      id: uuidv4(),
      listId: listIds[1],
      title: '数据库表结构设计',
      description: '设计核心业务表结构和索引',
      priority: 'medium',
      dueDate: addDays(today, 2),
      assignee: null,
      order: 1,
      createdAt: today,
      completedAt: null,
    },
    {
      id: uuidv4(),
      listId: listIds[2],
      title: '项目需求分析',
      description: '完成需求调研和产品需求文档',
      priority: 'low',
      dueDate: addDays(today, -2),
      assignee: 'demo@example.com',
      order: 0,
      createdAt: addDays(today, -5),
      completedAt: addDays(today, -1),
    },
    {
      id: uuidv4(),
      listId: listIds[2],
      title: '技术选型评估',
      description: '评估并确定项目使用的技术栈',
      priority: 'low',
      dueDate: addDays(today, -3),
      assignee: null,
      order: 1,
      createdAt: addDays(today, -5),
      completedAt: addDays(today, -2),
    },
  ];

  data.cards.push(...sampleCards);
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

initSampleData();

export function getAllProjects(): Project[] {
  return [...data.projects];
}

export function getProjectById(projectId: string): Project | undefined {
  return data.projects.find((p) => p.id === projectId);
}

export function createProject(name: string, description: string, ownerEmail: string): Project {
  const project: Project = {
    id: uuidv4(),
    name,
    description,
    createdAt: new Date().toISOString(),
    ownerEmail,
  };
  data.projects.push(project);

  const ownerMember: Member = {
    id: uuidv4(),
    projectId: project.id,
    email: ownerEmail,
    name: ownerEmail.split('@')[0],
    role: 'owner',
    joinedAt: new Date().toISOString(),
  };
  data.members.push(ownerMember);

  const defaultLists = ['待办', '进行中', '完成'];
  defaultLists.forEach((title, index) => {
    const list: List = {
      id: uuidv4(),
      projectId: project.id,
      title,
      order: index,
    };
    data.lists.push(list);
  });

  return project;
}

export function getListsByProjectId(projectId: string): List[] {
  return data.lists
    .filter((l) => l.projectId === projectId)
    .sort((a, b) => a.order - b.order);
}

export function getCardsByListId(listId: string): Card[] {
  return data.cards
    .filter((c) => c.listId === listId)
    .sort((a, b) => a.order - b.order);
}

export function getCardsByProjectId(projectId: string): Card[] {
  const projectLists = getListsByProjectId(projectId).map((l) => l.id);
  return data.cards.filter((c) => projectLists.includes(c.listId));
}

export function getCardById(cardId: string): Card | undefined {
  return data.cards.find((c) => c.id === cardId);
}

export function createCard(
  listId: string,
  title: string,
  description: string,
  priority: Priority,
  dueDate: string | null,
  assignee: string | null
): Card {
  const listCards = getCardsByListId(listId);
  const maxOrder = listCards.length > 0 ? Math.max(...listCards.map((c) => c.order)) : -1;

  const card: Card = {
    id: uuidv4(),
    listId,
    title,
    description,
    priority,
    dueDate,
    assignee,
    order: maxOrder + 1,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
  data.cards.push(card);
  return card;
}

export function updateCard(cardId: string, updates: Partial<Card>): Card | undefined {
  const cardIndex = data.cards.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) return undefined;

  data.cards[cardIndex] = { ...data.cards[cardIndex], ...updates };
  return data.cards[cardIndex];
}

export function deleteCard(cardId: string): boolean {
  const cardIndex = data.cards.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) return false;

  data.cards.splice(cardIndex, 1);
  data.comments = data.comments.filter((c) => c.cardId !== cardId);
  return true;
}

export function moveCard(cardId: string, newListId: string, newOrder: number): Card | undefined {
  const card = getCardById(cardId);
  if (!card) return undefined;

  const oldListId = card.listId;

  const targetListCards = getCardsByListId(newListId)
    .filter((c) => c.id !== cardId)
    .sort((a, b) => a.order - b.order);

  targetListCards.forEach((c, index) => {
    const cardIdx = data.cards.findIndex((cc) => cc.id === c.id);
    if (index >= newOrder) {
      data.cards[cardIdx].order = index + 1;
    } else {
      data.cards[cardIdx].order = index;
    }
  });

  const cardIndex = data.cards.findIndex((c) => c.id === cardId);
  data.cards[cardIndex].listId = newListId;
  data.cards[cardIndex].order = newOrder;

  if (oldListId !== newListId) {
    const sourceListCards = getCardsByListId(oldListId).sort((a, b) => a.order - b.order);
    sourceListCards.forEach((c, index) => {
      const idx = data.cards.findIndex((cc) => cc.id === c.id);
      data.cards[idx].order = index;
    });
  }

  const newLists = getListsByProjectId(card.listId ? '' : '');
  const list = data.lists.find((l) => l.id === newListId);
  if (list && list.title === '完成' && !card.completedAt) {
    data.cards[cardIndex].completedAt = new Date().toISOString();
  } else if (list && list.title !== '完成' && card.completedAt) {
    data.cards[cardIndex].completedAt = null;
  }

  return data.cards[cardIndex];
}

export function getMembersByProjectId(projectId: string): Member[] {
  return data.members.filter((m) => m.projectId === projectId);
}

export function createInvitation(projectId: string, email: string): Invitation {
  const existingInvitation = data.invitations.find(
    (inv) => inv.projectId === projectId && inv.email === email && !inv.accepted
  );
  if (existingInvitation) {
    return existingInvitation;
  }

  const invitation: Invitation = {
    id: uuidv4(),
    projectId,
    email,
    token: uuidv4(),
    invitedAt: new Date().toISOString(),
    accepted: false,
  };
  data.invitations.push(invitation);
  return invitation;
}

export function getInvitationByToken(token: string): Invitation | undefined {
  return data.invitations.find((inv) => inv.token === token);
}

export function acceptInvitation(token: string, name: string): Member | null {
  const invitation = getInvitationByToken(token);
  if (!invitation || invitation.accepted) return null;

  const invitationIndex = data.invitations.findIndex((inv) => inv.token === token);
  data.invitations[invitationIndex].accepted = true;

  const existingMember = data.members.find(
    (m) => m.projectId === invitation.projectId && m.email === invitation.email
  );
  if (existingMember) return existingMember;

  const member: Member = {
    id: uuidv4(),
    projectId: invitation.projectId,
    email: invitation.email,
    name: name || invitation.email.split('@')[0],
    role: 'member',
    joinedAt: new Date().toISOString(),
  };
  data.members.push(member);
  return member;
}

export function addComment(cardId: string, author: string, content: string): Comment {
  const comment: Comment = {
    id: uuidv4(),
    cardId,
    author,
    content,
    createdAt: new Date().toISOString(),
  };
  data.comments.push(comment);
  return comment;
}

export function getCommentsByCardId(cardId: string): Comment[] {
  return data.comments
    .filter((c) => c.cardId === cardId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}
