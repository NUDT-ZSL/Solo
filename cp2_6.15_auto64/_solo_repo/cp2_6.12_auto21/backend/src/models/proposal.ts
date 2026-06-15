import { v4 as uuidv4 } from "uuid";

export interface ContentBlock {
  id: string;
  type: "heading" | "paragraph" | "list" | "code";
  content: string;
}

export interface Collaborator {
  userId: string;
  username: string;
  avatarColor: string;
  cursorPosition: number | null;
  isOnline: boolean;
}

export interface ProposalVersion {
  version: number;
  timestamp: Date;
  editorId: string;
  editorName: string;
  content: string;
  contentBlocks: ContentBlock[];
}

export interface Proposal {
  id: string;
  title: string;
  content: string;
  contentBlocks: ContentBlock[];
  version: number;
  collaborators: Collaborator[];
  versions: ProposalVersion[];
  createdAt: Date;
  updatedAt: Date;
  shareLink: string;
}

export class ProposalsStore {
  private proposals: Map<string, Proposal> = new Map();

  create(title: string, creatorId: string, creatorName: string): Proposal {
    const id = uuidv4();
    const now = new Date();
    const proposal: Proposal = {
      id,
      title,
      content: "",
      contentBlocks: [],
      version: 1,
      collaborators: [
        {
          userId: creatorId,
          username: creatorName,
          avatarColor: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"),
          cursorPosition: null,
          isOnline: true,
        },
      ],
      versions: [
        {
          version: 1,
          timestamp: now,
          editorId: creatorId,
          editorName: creatorName,
          content: "",
          contentBlocks: [],
        },
      ],
      createdAt: now,
      updatedAt: now,
      shareLink: uuidv4(),
    };
    this.proposals.set(id, proposal);
    return proposal;
  }

  getById(id: string): Proposal | undefined {
    return this.proposals.get(id);
  }

  update(
    id: string,
    updates: Partial<Pick<Proposal, "title" | "content" | "contentBlocks">>
  ): Proposal | undefined {
    const proposal = this.proposals.get(id);
    if (!proposal) return undefined;
    if (updates.title !== undefined) proposal.title = updates.title;
    if (updates.content !== undefined) proposal.content = updates.content;
    if (updates.contentBlocks !== undefined) proposal.contentBlocks = updates.contentBlocks;
    proposal.updatedAt = new Date();
    return proposal;
  }

  addCollaborator(
    id: string,
    userId: string,
    username: string
  ): Proposal | undefined {
    const proposal = this.proposals.get(id);
    if (!proposal) return undefined;
    const existing = proposal.collaborators.find((c) => c.userId === userId);
    if (existing) {
      existing.isOnline = true;
      return proposal;
    }
    proposal.collaborators.push({
      userId,
      username,
      avatarColor: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"),
      cursorPosition: null,
      isOnline: true,
    });
    proposal.updatedAt = new Date();
    return proposal;
  }

  removeCollaborator(id: string, userId: string): Proposal | undefined {
    const proposal = this.proposals.get(id);
    if (!proposal) return undefined;
    const collaborator = proposal.collaborators.find((c) => c.userId === userId);
    if (collaborator) {
      collaborator.isOnline = false;
      collaborator.cursorPosition = null;
    }
    proposal.updatedAt = new Date();
    return proposal;
  }

  updateCursor(
    id: string,
    userId: string,
    position: number | null
  ): Proposal | undefined {
    const proposal = this.proposals.get(id);
    if (!proposal) return undefined;
    const collaborator = proposal.collaborators.find((c) => c.userId === userId);
    if (collaborator) {
      collaborator.cursorPosition = position;
    }
    return proposal;
  }

  addVersion(
    id: string,
    editorId: string,
    editorName: string,
    content: string,
    contentBlocks: ContentBlock[]
  ): Proposal | undefined {
    const proposal = this.proposals.get(id);
    if (!proposal) return undefined;
    proposal.version += 1;
    proposal.content = content;
    proposal.contentBlocks = contentBlocks;
    proposal.versions.push({
      version: proposal.version,
      timestamp: new Date(),
      editorId,
      editorName,
      content,
      contentBlocks,
    });
    proposal.updatedAt = new Date();
    return proposal;
  }

  getVersion(id: string, version: number): ProposalVersion | undefined {
    const proposal = this.proposals.get(id);
    if (!proposal) return undefined;
    return proposal.versions.find((v) => v.version === version);
  }

  getAll(): Proposal[] {
    return Array.from(this.proposals.values());
  }
}
