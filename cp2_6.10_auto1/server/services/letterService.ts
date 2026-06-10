import { jsonStore } from '../storage/jsonStore.js'
import { generateId } from '../utils/id.js'
import { AppError } from '../middleware/error.js'
import type {
  Letter,
  CreateLetterReq,
  CreateLetterRes,
  GetLetterRes,
  LetterListRes,
  LetterListItem,
} from '../../shared/types.js'

function checkUnlock(letter: Letter, now: number): Letter {
  if (!letter.isUnlocked && now >= letter.unlockAt) {
    return jsonStore.updateLetter(letter.id, { isUnlocked: true }) ?? letter
  }
  return letter
}

export function createLetter(
  userId: string,
  req: CreateLetterReq
): CreateLetterRes {
  if (!req.title?.trim()) {
    throw new AppError('标题不能为空')
  }
  if (!req.content?.trim()) {
    throw new AppError('内容不能为空')
  }
  if (!req.unlockAt || req.unlockAt <= Date.now()) {
    throw new AppError('解锁时间必须在未来')
  }

  const letter: Letter = {
    id: generateId(),
    userId,
    title: req.title.trim(),
    content: req.content.trim(),
    emotion: req.emotion,
    unlockAt: req.unlockAt,
    createdAt: Date.now(),
    isUnlocked: false,
  }
  jsonStore.createLetter(letter)

  return {
    id: letter.id,
    title: letter.title,
    emotion: letter.emotion,
    unlockAt: letter.unlockAt,
    createdAt: letter.createdAt,
  }
}

export function getLetter(userId: string, letterId: string): GetLetterRes {
  const letter = jsonStore.findLetterById(letterId)
  if (!letter) {
    throw new AppError('信件不存在', 404)
  }
  if (letter.userId !== userId) {
    throw new AppError('无权访问', 403)
  }

  const now = Date.now()
  const checked = checkUnlock(letter, now)

  if (!checked.isUnlocked) {
    throw new AppError('信件尚未解锁', 403)
  }

  return {
    id: checked.id,
    title: checked.title,
    content: checked.content,
    emotion: checked.emotion,
    unlockAt: checked.unlockAt,
    createdAt: checked.createdAt,
    isUnlocked: checked.isUnlocked,
  }
}

export function listLetters(userId: string): LetterListRes {
  const all = jsonStore.findLettersByUserId(userId)
  const now = Date.now()
  const items: LetterListItem[] = all.map((l) => {
    const checked = checkUnlock(l, now)
    return {
      id: checked.id,
      title: checked.title,
      emotion: checked.emotion,
      unlockAt: checked.unlockAt,
      createdAt: checked.createdAt,
      isUnlocked: checked.isUnlocked,
    }
  })

  return {
    letters: items,
    total: items.length,
  }
}

export function deleteLetter(userId: string, letterId: string): void {
  const letter = jsonStore.findLetterById(letterId)
  if (!letter) {
    throw new AppError('信件不存在', 404)
  }
  if (letter.userId !== userId) {
    throw new AppError('无权访问', 403)
  }
  jsonStore.deleteLetter(letterId)
}

export function getUserStats(userId: string): { total: number; unlocked: number; locked: number } {
  const all = jsonStore.findLettersByUserId(userId)
  const now = Date.now()
  let unlocked = 0
  let locked = 0
  for (const l of all) {
    if (now >= l.unlockAt) unlocked++
    else locked++
  }
  return {
    total: all.length,
    unlocked,
    locked,
  }
}
