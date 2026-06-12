import { AVATARS } from './types';

const RANDOM_NAMES = [
  '学霸君', '知识达人', '答题王者', '聪明脑袋', '百科全书',
  '脑筋转', '智多星', '神算子', '知识猎手', '学霸超人',
  '答题小能手', '聪明豆', '知识探索者', '智慧星', '脑力王者',
];

export const generateRandomName = (): string => {
  return RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
};

export const generateRandomAvatar = (): string => {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)];
};

export const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
