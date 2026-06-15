import CryptoJS from "crypto-js";
import type { Capsule, CreateCapsuleRequest } from "@/types";

const ENCRYPTION_PREFIX = "ENC:";

function generateEncryptionKey(unlockDate: string): string {
  return `timecapsule_${unlockDate}_key`;
}

export function createCapsule(
  request: CreateCapsuleRequest,
  creatorId: string
): Capsule {
  const now = new Date();
  const unlockDate = new Date(request.unlockDate);
  const isLocked = unlockDate > now;

  const encryptedContent = isLocked
    ? encryptContent(request.content, request.unlockDate)
    : request.content;

  return {
    id:
      Date.now().toString(36) + Math.random().toString(36).substring(2, 9),
    title: request.title,
    content: encryptedContent,
    images: request.images.map((f) => URL.createObjectURL(f)),
    audioUrl: request.audio ? URL.createObjectURL(request.audio) : null,
    unlockDate: request.unlockDate,
    createdAt: now.toISOString().split("T")[0],
    isPublic: request.isPublic,
    isLocked,
    creatorId,
    tags: request.tags,
  };
}

export function encryptContent(content: string, unlockDate: string): string {
  const key = generateEncryptionKey(unlockDate);
  const encrypted = CryptoJS.AES.encrypt(content, key).toString();
  return `${ENCRYPTION_PREFIX}${encrypted}`;
}

export function decryptContent(
  encryptedContent: string,
  unlockDate: string
): string {
  if (!encryptedContent.startsWith(ENCRYPTION_PREFIX)) {
    return encryptedContent;
  }

  const key = generateEncryptionKey(unlockDate);
  const ciphertext = encryptedContent.substring(ENCRYPTION_PREFIX.length);

  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || encryptedContent;
  } catch {
    return encryptedContent;
  }
}

export function isEncrypted(content: string): boolean {
  return content.startsWith(ENCRYPTION_PREFIX);
}

export function checkUnlockStatus(capsule: Capsule): Capsule {
  const now = new Date();
  const unlockDate = new Date(capsule.unlockDate);
  const shouldUnlock = now >= unlockDate;

  if (shouldUnlock && capsule.isLocked) {
    const decryptedContent = decryptContent(
      capsule.content,
      capsule.unlockDate
    );
    return {
      ...capsule,
      isLocked: false,
      content: decryptedContent,
    };
  }

  if (!shouldUnlock && !capsule.isLocked) {
    return {
      ...capsule,
      isLocked: true,
    };
  }

  return capsule;
}

export function getCountdown(unlockDate: string): string {
  const now = new Date();
  const target = new Date(unlockDate);
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) return "已解锁";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (days > 0) return `${days}天 ${hours}时 ${minutes}分`;
  if (hours > 0) return `${hours}时 ${minutes}分 ${seconds}秒`;
  return `${minutes}分 ${seconds}秒`;
}

export function formatUnlockDate(unlockDate: string): string {
  const date = new Date(unlockDate);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
