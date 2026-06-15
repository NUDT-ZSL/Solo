import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  username: string;
  nickname: string;
  createdAt: string;
}

export interface BookClub {
  id: string;
  name: string;
  bookTitle: string;
  bookAuthor: string;
  description: string;
  hostId: string;
  memberIds: string[];
  createdAt: string;
}

export interface DiscussionTopic {
  id: string;
  clubId: string;
  creatorId: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface Reply {
  id: string;
  topicId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

interface Database {
  users: User[];
  bookClubs: BookClub[];
  topics: DiscussionTopic[];
  replies: Reply[];
}

const db: Database = {
  users: [],
  bookClubs: [],
  topics: [],
  replies: []
};

export const database = {
  findUserByUsername(username: string): User | undefined {
    return db.users.find(u => u.username === username);
  },

  findUserById(id: string): User | undefined {
    return db.users.find(u => u.id === id);
  },

  createUser(username: string, nickname: string): User {
    const user: User = {
      id: uuidv4(),
      username,
      nickname,
      createdAt: new Date().toISOString()
    };
    db.users.push(user);
    return user;
  },

  getAllBookClubs(): BookClub[] {
    return [...db.bookClubs];
  },

  getBookClubById(id: string): BookClub | undefined {
    return db.bookClubs.find(c => c.id === id);
  },

  createBookClub(
    name: string,
    bookTitle: string,
    bookAuthor: string,
    description: string,
    hostId: string
  ): BookClub {
    const club: BookClub = {
      id: uuidv4(),
      name,
      bookTitle,
      bookAuthor,
      description,
      hostId,
      memberIds: [hostId],
      createdAt: new Date().toISOString()
    };
    db.bookClubs.push(club);
    return club;
  },

  joinBookClub(clubId: string, userId: string): BookClub | null {
    const club = db.bookClubs.find(c => c.id === clubId);
    if (!club) return null;
    if (!club.memberIds.includes(userId)) {
      club.memberIds.push(userId);
    }
    return club;
  },

  leaveBookClub(clubId: string, userId: string): BookClub | null {
    const club = db.bookClubs.find(c => c.id === clubId);
    if (!club) return null;
    
    const index = club.memberIds.indexOf(userId);
    if (index === -1) return club;
    
    club.memberIds.splice(index, 1);
    
    if (club.hostId === userId && club.memberIds.length > 0) {
      club.hostId = club.memberIds[0];
    }
    
    return club;
  },

  removeMember(clubId: string, memberId: string, removerId: string): BookClub | null {
    const club = db.bookClubs.find(c => c.id === clubId);
    if (!club) return null;
    if (club.hostId !== removerId) return null;
    if (memberId === club.hostId) return null;
    
    const index = club.memberIds.indexOf(memberId);
    if (index > -1) {
      club.memberIds.splice(index, 1);
    }
    return club;
  },

  getClubMembers(clubId: string): User[] {
    const club = db.bookClubs.find(c => c.id === clubId);
    if (!club) return [];
    return club.memberIds
      .map(id => db.users.find(u => u.id === id))
      .filter((u): u is User => u !== undefined);
  },

  getTopicsByClubId(clubId: string): DiscussionTopic[] {
    return db.topics
      .filter(t => t.clubId === clubId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getTopicById(topicId: string): DiscussionTopic | undefined {
    return db.topics.find(t => t.id === topicId);
  },

  createTopic(
    clubId: string,
    creatorId: string,
    title: string,
    content: string
  ): DiscussionTopic | null {
    const club = db.bookClubs.find(c => c.id === clubId);
    if (!club || !club.memberIds.includes(creatorId)) return null;
    
    const topic: DiscussionTopic = {
      id: uuidv4(),
      clubId,
      creatorId,
      title,
      content,
      createdAt: new Date().toISOString()
    };
    db.topics.push(topic);
    return topic;
  },

  getRepliesByTopicId(topicId: string): Reply[] {
    return db.replies
      .filter(r => r.topicId === topicId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  createReply(
    topicId: string,
    authorId: string,
    content: string
  ): Reply | null {
    const topic = db.topics.find(t => t.id === topicId);
    if (!topic) return null;
    
    const club = db.bookClubs.find(c => c.id === topic.clubId);
    if (!club || !club.memberIds.includes(authorId)) return null;
    
    const reply: Reply = {
      id: uuidv4(),
      topicId,
      authorId,
      content,
      createdAt: new Date().toISOString()
    };
    db.replies.push(reply);
    return reply;
  }
};

export default database;
