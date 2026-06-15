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
  UserStatsRes,
} from '../../shared/types.js'

function checkUnlock(letter: Letter, now: number): Letter {
  if (!letter.isUnlocked && now >= letter.unlockAt) {
    return jsonStore.updateLetter(letter.id, { isUnlocked: true }) ?? letter
  }
  return letter
}

function getLetterStatus(letter: Letter, now: number): 'sent' | 'unlocked' | 'expired' {
  if (letter.isUnlocked || now >= letter.unlockAt) {
    return 'unlocked'
  }
  return 'sent'
}

export function createLetter(
  userId: string,
  req: CreateLetterReq
): CreateLetterRes {
  if (!req.title?.trim()) {
    throw new AppError('标题不能为空')
  }
  if (!req.recipientEmail?.trim()) {
    throw new AppError('收件人邮箱不能为空')
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
    recipientEmail: req.recipientEmail.trim(),
    content: req.content.trim(),
    emotion: req.emotion,
    unlockAt: req.unlockAt,
    createdAt: Date.now(),
    isUnlocked: false,
  }
  jsonStore.createLetter(letter)

  const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/letter/${letter.id}`

  return {
    id: letter.id,
    title: letter.title,
    emotion: letter.emotion,
    unlockAt: letter.unlockAt,
    createdAt: letter.createdAt,
    shareUrl,
  }
}

export function getPublicLetter(letterId: string): GetLetterRes {
  const letter = jsonStore.findLetterById(letterId)
  if (!letter) {
    throw new AppError('信件不存在', 404)
  }

  const now = Date.now()
  const checked = checkUnlock(letter, now)
  const isUnlocked = checked.isUnlocked || now >= checked.unlockAt

  const result: GetLetterRes = {
    id: checked.id,
    title: checked.title,
    recipientEmail: checked.recipientEmail,
    emotion: checked.emotion,
    unlockAt: checked.unlockAt,
    createdAt: checked.createdAt,
    isUnlocked,
  }

  if (isUnlocked) {
    result.content = checked.content
  }

  return result
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
  const isUnlocked = checked.isUnlocked || now >= checked.unlockAt

  const result: GetLetterRes = {
    id: checked.id,
    title: checked.title,
    recipientEmail: checked.recipientEmail,
    emotion: checked.emotion,
    unlockAt: checked.unlockAt,
    createdAt: checked.createdAt,
    isUnlocked,
  }

  if (isUnlocked) {
    result.content = checked.content
  }

  return result
}

export function listLetters(
  userId: string,
  page = 1,
  pageSize = 20
): LetterListRes {
  const { items, total } = jsonStore.listLettersByUserIdPaged(userId, page, pageSize)
  const now = Date.now()

  const listItems: LetterListItem[] = items.map((l) => {
    const checked = checkUnlock(l, now)
    const status = getLetterStatus(checked, now)
    return {
      id: checked.id,
      title: checked.title,
      recipientEmail: checked.recipientEmail,
      emotion: checked.emotion,
      unlockAt: checked.unlockAt,
      createdAt: checked.createdAt,
      isUnlocked: checked.isUnlocked,
      status,
    }
  })

  return {
    items: listItems,
    total,
    page,
    pageSize,
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

export function getUserStats(userId: string): UserStatsRes {
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
