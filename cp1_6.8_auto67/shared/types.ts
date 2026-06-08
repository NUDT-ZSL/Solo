export interface Capsule {
  id: string;
  message: string;
  attachmentUrl?: string;
  attachmentType?: "image" | "audio";
  targetDate: string;
  createdAt: string;
  status: "locked" | "unsealed";
  color: string;
  position: { x: number; y: number; z: number };
  rotationSpeed: { x: number; y: number; z: number };
}

export interface CreateCapsuleRequest {
  message: string;
  attachmentUrl?: string;
  attachmentType?: "image" | "audio";
  targetDate: string;
}

export interface UnsealCapsuleResponse {
  success: boolean;
  capsule: Capsule;
}
