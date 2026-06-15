export interface TeaRecord {
  id: string;
  teaName: string;
  variety: string;
  temperature: number[];
  steepTime: number;
  notes: string;
  mood: string[];
  rating: number;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  recordId: string;
  author: string;
  content: string;
  createdAt: string;
}
