import { openDB, IDBPDatabase } from 'idb';
import { Contract } from './types';
import { v4 as uuidv4 } from 'uuid';

const DB_NAME = 'freelancer-contract-db';
const STORE_NAME = 'contracts';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      }
    });
  }
  return dbPromise;
}

export async function getAllContracts(): Promise<Contract[]> {
  const db = await getDB();
  const contracts = await db.getAll(STORE_NAME);
  if (contracts.length === 0) {
    const sample = createSampleContracts();
    for (const c of sample) {
      await db.put(STORE_NAME, c);
    }
    return sample;
  }
  return contracts as Contract[];
}

export async function getContractById(id: string): Promise<Contract | undefined> {
  const db = await getDB();
  return (await db.get(STORE_NAME, id)) as Contract | undefined;
}

export async function addContract(contract: Omit<Contract, 'id'>): Promise<Contract> {
  const db = await getDB();
  const newContract: Contract = { ...contract, id: uuidv4() };
  await db.add(STORE_NAME, newContract);
  return newContract;
}

export async function updateContract(contract: Contract): Promise<Contract> {
  const db = await getDB();
  await db.put(STORE_NAME, contract);
  return contract;
}

export async function deleteContract(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

function createSampleContracts(): Contract[] {
  const today = new Date();
  const addDays = (d: Date, days: number) => {
    const nd = new Date(d);
    nd.setDate(nd.getDate() + days);
    return nd.toISOString().split('T')[0];
  };

  return [
    {
      id: uuidv4(),
      clientName: '北京科技有限公司',
      amount: 120000,
      stage: 'in_progress',
      startDate: addDays(today, -60),
      endDate: addDays(today, 5),
      freelancerSignature: '张伟',
      clientSignature: '李明',
      milestones: [
        { id: uuidv4(), name: '需求调研完成', date: addDays(today, -50), completed: true },
        { id: uuidv4(), name: '设计稿交付', date: addDays(today, -30), completed: true },
        { id: uuidv4(), name: '前端开发完成', date: addDays(today, 3), completed: false },
        { id: uuidv4(), name: '测试上线', date: addDays(today, 30), completed: false }
      ],
      payments: [
        { id: uuidv4(), amount: 36000, date: addDays(today, -55), description: '首付款30%' },
        { id: uuidv4(), amount: 48000, date: addDays(today, -25), description: '中期款40%' }
      ],
      attachments: [],
      nextPaymentDueDate: addDays(today, 10)
    },
    {
      id: uuidv4(),
      clientName: '上海创意工作室',
      amount: 68000,
      stage: 'in_progress',
      startDate: addDays(today, -30),
      endDate: addDays(today, 60),
      freelancerSignature: '张伟',
      clientSignature: '王芳',
      milestones: [
        { id: uuidv4(), name: '品牌策划方案', date: addDays(today, -15), completed: true },
        { id: uuidv4(), name: 'LOGO设计', date: addDays(today, 8), completed: false },
        { id: uuidv4(), name: 'VI系统交付', date: addDays(today, 45), completed: false }
      ],
      payments: [
        { id: uuidv4(), amount: 20400, date: addDays(today, -28), description: '首付款30%' }
      ],
      attachments: [],
      nextPaymentDueDate: addDays(today, 15)
    },
    {
      id: uuidv4(),
      clientName: '深圳数据科技',
      amount: 200000,
      stage: 'overdue',
      startDate: addDays(today, -120),
      endDate: addDays(today, -10),
      freelancerSignature: '张伟',
      clientSignature: '陈强',
      milestones: [
        { id: uuidv4(), name: '系统架构设计', date: addDays(today, -100), completed: true },
        { id: uuidv4(), name: '数据库建模', date: addDays(today, -80), completed: true },
        { id: uuidv4(), name: 'API开发', date: addDays(today, -40), completed: true },
        { id: uuidv4(), name: '系统集成上线', date: addDays(today, -15), completed: false }
      ],
      payments: [
        { id: uuidv4(), amount: 60000, date: addDays(today, -115), description: '首付款30%' },
        { id: uuidv4(), amount: 80000, date: addDays(today, -50), description: '中期款40%' }
      ],
      attachments: [],
      nextPaymentDueDate: addDays(today, -5)
    },
    {
      id: uuidv4(),
      clientName: '广州电商平台',
      amount: 45000,
      stage: 'completed',
      startDate: addDays(today, -180),
      endDate: addDays(today, -90),
      freelancerSignature: '张伟',
      clientSignature: '刘洋',
      milestones: [
        { id: uuidv4(), name: '页面设计', date: addDays(today, -160), completed: true },
        { id: uuidv4(), name: '前端开发', date: addDays(today, -130), completed: true },
        { id: uuidv4(), name: '上线部署', date: addDays(today, -95), completed: true }
      ],
      payments: [
        { id: uuidv4(), amount: 13500, date: addDays(today, -175), description: '首付款30%' },
        { id: uuidv4(), amount: 18000, date: addDays(today, -140), description: '中期款40%' },
        { id: uuidv4(), amount: 13500, date: addDays(today, -92), description: '尾款30%' }
      ],
      attachments: [],
      nextPaymentDueDate: undefined
    },
    {
      id: uuidv4(),
      clientName: '杭州教育科技',
      amount: 85000,
      stage: 'not_started',
      startDate: addDays(today, 10),
      endDate: addDays(today, 100),
      freelancerSignature: '张伟',
      clientSignature: '赵敏',
      milestones: [
        { id: uuidv4(), name: '课程体系设计', date: addDays(today, 25), completed: false },
        { id: uuidv4(), name: '视频录制', date: addDays(today, 55), completed: false },
        { id: uuidv4(), name: '平台对接上线', date: addDays(today, 90), completed: false }
      ],
      payments: [],
      attachments: [],
      nextPaymentDueDate: addDays(today, 12)
    }
  ];
}
