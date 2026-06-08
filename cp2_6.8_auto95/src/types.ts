export interface StoryNodeData {
  id: string;
  content: string;
  parentId: string | null;
  children: string[];
  saved: boolean;
  createdAt: number;
}

export interface UserData {
  id: string;
  name: string;
  color: string;
  editingNodeId: string | null;
}
