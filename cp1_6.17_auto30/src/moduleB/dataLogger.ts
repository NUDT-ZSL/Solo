import { ArtifactData, ArtifactType, ArtifactEra, ArtifactMaterial } from '../moduleA/artifact';

export interface ExcavationRecord {
  id: string;
  artifactId: string;
  type: ArtifactType;
  era: ArtifactEra;
  material: ArtifactMaterial;
  correct: boolean | null;
  score: number;
  timestamp: number;
  userAnswer?: {
    type: ArtifactType;
    era: ArtifactEra;
    material: ArtifactMaterial;
  };
}

export class DataLogger {
  private records: ExcavationRecord[] = [];
  private totalScore: number = 0;
  private targetScore: number = 0;
  private scoreAnimationValue: number = 0;
  private onScoreUpdateCallback: ((score: number, animated: number) => void) | null = null;
  private onRecordAddedCallback: ((record: ExcavationRecord) => void) | null = null;
  private dbName: string = 'archaeologyDB';
  private dbVersion: number = 1;
  private db: IDBDatabase | null = null;
  private isDbReady: boolean = false;

  constructor() {
    this.initDB();
  }

  private initDB(): void {
    try {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => {
        console.warn('IndexedDB not available, using memory storage');
        this.isDbReady = true;
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isDbReady = true;
        this.loadRecords();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('records')) {
          const store = db.createObjectStore('records', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('score')) {
          db.createObjectStore('score', { keyPath: 'id' });
        }
      };
    } catch (e) {
      console.warn('IndexedDB not supported');
      this.isDbReady = true;
    }
  }

  private loadRecords(): void {
    if (!this.db) return;

    const transaction = this.db.transaction(['records', 'score'], 'readonly');
    
    const recordStore = transaction.objectStore('records');
    const recordRequest = recordStore.getAll();
    
    recordRequest.onsuccess = () => {
      this.records = recordRequest.result || [];
      this.records.sort((a, b) => a.timestamp - b.timestamp);
      this.recalculateScore();
    };

    const scoreStore = transaction.objectStore('score');
    const scoreRequest = scoreStore.get('total');
    
    scoreRequest.onsuccess = () => {
      if (scoreRequest.result) {
        this.totalScore = scoreRequest.result.value || 0;
        this.scoreAnimationValue = this.totalScore;
        this.targetScore = this.totalScore;
      }
    };
  }

  private recalculateScore(): void {
    this.totalScore = this.records.reduce((sum, r) => sum + (r.score || 0), 0);
    this.targetScore = this.totalScore;
  }

  public addRecord(artifact: ArtifactData, userAnswer?: { type: ArtifactType; era: ArtifactEra; material: ArtifactMaterial }): ExcavationRecord {
    const record: ExcavationRecord = {
      id: `R-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      artifactId: artifact.id,
      type: artifact.type,
      era: artifact.era,
      material: artifact.material,
      correct: artifact.correct,
      score: artifact.score,
      timestamp: Date.now(),
      userAnswer
    };

    this.records.push(record);
    this.totalScore += artifact.score;
    this.targetScore = this.totalScore;
    this.animateScore();

    this.saveRecordToDB(record);
    this.saveScoreToDB();

    if (this.onRecordAddedCallback) {
      this.onRecordAddedCallback(record);
    }

    return record;
  }

  private animateScore(): void {
    const animate = () => {
      const diff = this.targetScore - this.scoreAnimationValue;
      if (Math.abs(diff) < 0.5) {
        this.scoreAnimationValue = this.targetScore;
        this.notifyScoreUpdate();
        return;
      }
      
      this.scoreAnimationValue += diff * 0.15;
      this.notifyScoreUpdate();
      requestAnimationFrame(animate);
    };
    
    requestAnimationFrame(animate);
  }

  private notifyScoreUpdate(): void {
    if (this.onScoreUpdateCallback) {
      this.onScoreUpdateCallback(this.totalScore, Math.round(this.scoreAnimationValue));
    }
  }

  private saveRecordToDB(record: ExcavationRecord): void {
    if (!this.db || !this.isDbReady) return;
    
    try {
      const transaction = this.db.transaction(['records'], 'readwrite');
      const store = transaction.objectStore('records');
      store.add(record);
    } catch (e) {
      console.warn('Failed to save record to DB');
    }
  }

  private saveScoreToDB(): void {
    if (!this.db || !this.isDbReady) return;
    
    try {
      const transaction = this.db.transaction(['score'], 'readwrite');
      const store = transaction.objectStore('score');
      store.put({ id: 'total', value: this.totalScore });
    } catch (e) {
      console.warn('Failed to save score to DB');
    }
  }

  public getRecords(): ExcavationRecord[] {
    return [...this.records];
  }

  public getRecordById(id: string): ExcavationRecord | undefined {
    return this.records.find(r => r.id === id);
  }

  public getTotalScore(): number {
    return this.totalScore;
  }

  public getAnimatedScore(): number {
    return Math.round(this.scoreAnimationValue);
  }

  public getCorrectCount(): number {
    return this.records.filter(r => r.correct === true).length;
  }

  public getWrongCount(): number {
    return this.records.filter(r => r.correct === false).length;
  }

  public onScoreUpdate(callback: (score: number, animated: number) => void): void {
    this.onScoreUpdateCallback = callback;
  }

  public onRecordAdded(callback: (record: ExcavationRecord) => void): void {
    this.onRecordAddedCallback = callback;
  }

  public clearAll(): void {
    this.records = [];
    this.totalScore = 0;
    this.targetScore = 0;
    this.scoreAnimationValue = 0;
    this.notifyScoreUpdate();

    if (this.db) {
      try {
        const transaction = this.db.transaction(['records', 'score'], 'readwrite');
        transaction.objectStore('records').clear();
        transaction.objectStore('score').clear();
      } catch (e) {
        console.warn('Failed to clear DB');
      }
    }
  }

  public isReady(): boolean {
    return this.isDbReady;
  }
}
