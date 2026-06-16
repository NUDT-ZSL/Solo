import express, { Request, Response } from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { Entity, Relation, ChapterEvent, UploadResponse } from '../src/types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const dbPath = path.join(process.cwd(), 'storymap.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    format TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('character', 'location', 'event')),
    count INTEGER NOT NULL DEFAULT 1,
    first_chapter INTEGER NOT NULL,
    color TEXT,
    x REAL,
    y REAL,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS relations (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    cooccurrence INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (source_id) REFERENCES entities(id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES entities(id) ON DELETE CASCADE,
    UNIQUE(source_id, target_id)
  );

  CREATE TABLE IF NOT EXISTS chapter_events (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL,
    chapter INTEGER NOT NULL,
    chapter_title TEXT NOT NULL,
    summary TEXT NOT NULL,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
  );
`);

const characterNames = [
  '张三', '李四', '王五', '赵六', '陈七', '刘八', '周九', '吴十',
  '孙悟空', '猪八戒', '沙和尚', '唐僧', '白龙马',
  '贾宝玉', '林黛玉', '薛宝钗', '王熙凤', '史湘云',
  '刘备', '关羽', '张飞', '诸葛亮', '曹操', '孙权', '周瑜',
  '宋江', '林冲', '武松', '鲁智深', '吴用',
  '哈利', '赫敏', '罗恩', '邓布利多', '斯内普',
  '伊丽莎白', '达西', '简', '宾利',
  '安娜', '沃伦斯基', '卡列宁',
  '爱玛', '奈特利', '哈丽特',
  '盖茨比', '黛西', '汤姆', '尼克',
  '福尔摩斯', '华生', '莫里亚蒂'
];

const locationNames = [
  '北京', '上海', '广州', '深圳', '杭州', '南京', '成都', '武汉',
  '长安', '洛阳', '开封', '西安', '南京', '杭州',
  '天宫', '花果山', '水帘洞', '雷音寺', '女儿国',
  '荣国府', '宁国府', '大观园', '潇湘馆', '怡红院',
  '成都', '荆州', '许昌', '洛阳', '建业',
  '梁山', '东京', '江州',
  '霍格沃茨', '对角巷', '禁林', '女贞路',
  '彭伯里', '浪博恩', '尼日斐花园',
  '莫斯科', '圣彼得堡',
  '海伯里', '伦多尔斯',
  '纽约', '长岛', '西卵', '东卵',
  '伦敦', '贝克街', '苏格兰场'
];

const eventKeywords = [
  '结婚', '死亡', '出生', '战争', '战斗', '会议', '谈判', '宴会',
  '相遇', '离别', '重逢', '背叛', '复仇', '救援', '发现', '秘密',
  '旅行', '探险', '冒险', '阴谋', '计划', '决定', '选择', '牺牲',
  '成功', '失败', '胜利', '失败', '开始', '结束', '转折', '高潮',
  '谋杀', '绑架', '逃跑', '追捕', '审判', '惩罚', '奖励', '庆祝',
  '生病', '康复', '受伤', '治愈', '变形', '诅咒', '祝福', '预言'
];

function parseTxtContent(content: string): { chapters: { title: string; content: string }[] } {
  const chapterRegex = /第[一二三四五六七八九十百千\d]+[章节回].*?$/gm;
  const chapters: { title: string; content: string }[] = [];
  
  let matches: RegExpExecArray | null;