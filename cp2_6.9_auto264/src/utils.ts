import CryptoJS from 'crypto-js'

export function generateNoteId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function generateKey(noteId: string): string {
  return CryptoJS.SHA256(noteId + 'burn-after-reading-salt').toString()
}

export function encryptContent(content: string, key: string): string {
  return CryptoJS.AES.encrypt(content, key).toString()
}

export function decryptContent(encryptedContent: string, key: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedContent, key)
  return bytes.toString(CryptoJS.enc.Utf8)
}

export function calculateExpiryTime(): number {
  return Date.now() + 24 * 60 * 60 * 1000
}

export function isNoteExpired(expiryTime: number): boolean {
  return Date.now() > expiryTime
}

export function isValidText(text: string): boolean {
  return text.length > 0 && text.length <= 2000
}

export function isValidImageSize(size: number): boolean {
  return size > 0 && size <= 2 * 1024 * 1024
}
