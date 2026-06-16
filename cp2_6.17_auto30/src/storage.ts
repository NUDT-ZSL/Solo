import { v4 as uuidv4 } from 'uuid';

export interface Topic {
  id: string;
  title: string;
  description: string;
  optionA: string;
  optionB: string;
  optionC: string;
  createdAt: number;
}

export interface Vote {
  id: string;
  topicId: string;
  fingerprint: string;
  choice: 'A' | 'B' | 'C';
  timestamp: number;
}

const DB_NAME = 'AnonymousVoteDB';
const DB_VERSION = 1;
const TOPICS_STORE = 'topics';
const VOTES_STORE = 'votes';

const DEFAULT_TOPICS: Omit<Topic, 'id' | 'createdAt'>[] = [
  { title: '远程办公 vs 坐班', description: '你更倾向于哪种工作方式？', optionA: '完全远程', optionB: '完全坐班', optionC: '混合办公' },
  { title: 'AI 对就业的影响', description: '你认为 AI 会如何影响就业市场？', optionA: '减少岗位', optionB: '创造新岗位', optionC: '影响有限' },
  { title: '编程语言首选', description: '入门编程你推荐哪种语言？', optionA: 'Python', optionB: 'JavaScript', optionC: 'Rust' },
  { title: '社交平台使用', description: '你每天花最多时间的平台？', optionA: '微信/微博', optionB: '抖音/B站', optionC: '几乎不用' },
  { title: '电动汽车购买意愿', description: '你下一辆车会考虑电动汽车吗？', optionA: '一定会', optionB: '绝不会', optionC: '看情况' },
  { title: '睡眠时间', description: '你通常每晚睡几个小时？', optionA: '少于6小时', optionB: '6-8小时', optionC: '多于8小时' },
  { title: '城市生活满意度', description: '你对目前生活的城市满意吗？', optionA: '满意', optionB: '不满意', optionC: '一般' },
  { title: '每周锻炼频率', description: '你每周锻炼多少次？', optionA: '几乎不锻炼', optionB: '1-3次', optionC: '4次以上' },
  { title: '读书习惯', description: '你平均每月读几本书？', optionA: '0本', optionB: '1-2本', optionC: '3本以上' },
  { title: '咖啡 vs 茶', description: '你更喜欢哪种饮品？', optionA: '咖啡', optionB: '茶', optionC: '都不喜欢' },
  { title: '工作年限', description: '你的工作年限是？', optionA: '0-3年', optionB: '3-10年', optionC: '10年以上' },
  { title: '生育意愿', description: '你认为理想的孩子数量是？', optionA: '0个', optionB: '1-2个', optionC: '3个以上' },
];

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(TOPICS_STORE)) {
        const topicStore = db.createObjectStore(TOPICS_STORE, { keyPath: 'id' });
        topicStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(VOTES_STORE)) {
        const voteStore = db.createObjectStore(VOTES_STORE, { keyPath: 'id' });
        voteStore.createIndex('topicId', 'topicId', { unique: false });
        voteStore.createIndex('fingerprint_topicId', ['fingerprint', 'topicId'], { unique: true });
      }
    };
  });
}

async function ensureTopics(): Promise<Topic[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TOPICS_STORE, 'readwrite');
    const store = tx.objectStore(TOPICS_STORE);
    const countReq = store.count();
    countReq.onsuccess = () => {
      if (countReq.result === 0) {
        const topics: Topic[] = DEFAULT_TOPICS.map(t => ({
          ...t,
          id: uuidv4(),
          createdAt: Date.now(),
        }));
        topics.forEach(t => store.add(t));
        tx.oncomplete = () => resolve(topics);
        tx.onerror = () => reject(tx.error);
      } else {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result.sort((a, b) => a.createdAt - b.createdAt));
        req.onerror = () => reject(req.error);
      }
    };
  });
}

export async function getTopics(): Promise<Topic[]> {
  return ensureTopics();
}

export async function getTopic(topicId: string): Promise<Topic | undefined> {
  const topics = await getTopics();
  return topics.find(t => t.id === topicId);
}

export async function addVote(topicId: string, fingerprint: string, choice: 'A' | 'B' | 'C'): Promise<Vote | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VOTES_STORE, 'readwrite');
    const store = tx.objectStore(VOTES_STORE);
    const index = store.index('fingerprint_topicId');
    const check = index.get([fingerprint, topicId]);
    check.onsuccess = () => {
      if (check.result) {
        resolve(null);
        return;
      }
      const vote: Vote = {
        id: uuidv4(),
        topicId,
        fingerprint,
        choice,
        timestamp: Date.now(),
      };
      const addReq = store.add(vote);
      addReq.onsuccess = () => resolve(vote);
      addReq.onerror = () => reject(addReq.error);
    };
    check.onerror = () => reject(check.error);
  });
}

export async function getVotesByTopic(topicId: string): Promise<Vote[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VOTES_STORE, 'readonly');
    const store = tx.objectStore(VOTES_STORE);
    const index = store.index('topicId');
    const req = index.getAll(topicId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllVotes(): Promise<Vote[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VOTES_STORE, 'readonly');
    const req = tx.objectStore(VOTES_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getUserVoteForTopic(topicId: string, fingerprint: string): Promise<Vote | undefined> {
  const votes = await getVotesByTopic(topicId);
  return votes.find(v => v.fingerprint === fingerprint);
}
