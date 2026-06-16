export type Personality = '友好' | '胆小' | '活泼'
export type HealthStatus = '已驱虫' | '已疫苗' | '已绝育'
export type ApplicationStatus = 'pending' | 'approved' | 'rejected'
export type HousingType = '自有住房' | '租房' | '其他'

export interface Animal {
  id: number
  name: string
  breed: string
  age: number
  gender: '公' | '母'
  personality: Personality[]
  health: HealthStatus[]
  photo: string
  description: string
  createdAt: string
}

export interface ApplicationFormData {
  applicantName: string
  phone: string
  age: number | string
  housingType: HousingType[]
  hasPet: boolean
  experience: string
}

export interface Application extends ApplicationFormData {
  id: number
  animalId: number
  animalName: string
  status: ApplicationStatus
  matchScore: number
  createdAt: string
}

export interface ValidationErrors {
  applicantName?: string
  phone?: string
  age?: string
  housingType?: string
  hasPet?: string
  experience?: string
}

export function validateApplication(data: ApplicationFormData): ValidationErrors {
  const errors: ValidationErrors = {}

  if (!data.applicantName || data.applicantName.trim() === '') {
    errors.applicantName = '请输入领养人姓名'
  } else if (data.applicantName.trim().length < 2) {
    errors.applicantName = '姓名至少2个字符'
  }

  if (!data.phone || data.phone.trim() === '') {
    errors.phone = '请输入联系电话'
  } else if (!/^1[3-9]\d{9}$/.test(data.phone.trim())) {
    errors.phone = '请输入正确的11位手机号码'
  }

  const ageNum = typeof data.age === 'string' ? parseInt(data.age, 10) : data.age
  if (data.age === '' || data.age === undefined || data.age === null) {
    errors.age = '请输入年龄'
  } else if (isNaN(ageNum)) {
    errors.age = '年龄必须是数字'
  } else if (!Number.isInteger(ageNum)) {
    errors.age = '年龄必须是整数'
  } else if (ageNum < 18 || ageNum > 70) {
    errors.age = '年龄必须在18-70岁之间'
  }

  if (!data.housingType || data.housingType.length === 0) {
    errors.housingType = '请至少选择一种住房类型'
  }

  if (data.experience && data.experience.length > 500) {
    errors.experience = '养宠经验描述不能超过500字'
  }

  return errors
}

export function calculateMatchScore(
  data: ApplicationFormData,
  animal: Animal
): number {
  let score = 50

  const ageNum = typeof data.age === 'string' ? parseInt(data.age, 10) : data.age
  if (ageNum >= 25 && ageNum <= 50) {
    score += 15
  } else if (ageNum >= 20 && ageNum <= 60) {
    score += 10
  } else {
    score += 5
  }

  if (data.housingType.includes('自有住房')) {
    score += 15
  } else if (data.housingType.includes('租房')) {
    score += 8
  } else {
    score += 5
  }

  if (data.hasPet) {
    score += 10
  }

  if (data.experience && data.experience.trim().length > 0) {
    const expLength = data.experience.trim().length
    if (expLength > 200) {
      score += 10
    } else if (expLength > 100) {
      score += 7
    } else {
      score += 4
    }
  }

  if (animal.personality.includes('友好') && data.hasPet) {
    score += 5
  }

  if (animal.health.includes('已疫苗') && animal.health.includes('已驱虫')) {
    score += 5
  }

  return Math.min(Math.max(score, 0), 100)
}

const validTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
  pending: ['approved', 'rejected'],
  approved: [],
  rejected: [],
}

export function transitionStatus(
  currentStatus: ApplicationStatus,
  targetStatus: ApplicationStatus
): ApplicationStatus {
  const allowed = validTransitions[currentStatus]
  if (!allowed.includes(targetStatus)) {
    throw new Error(
      `无效的状态转换: 无法从 ${currentStatus} 转换到 ${targetStatus}`
    )
  }
  return targetStatus
}

export function canTransition(
  currentStatus: ApplicationStatus,
  targetStatus: ApplicationStatus
): boolean {
  const allowed = validTransitions[currentStatus]
  return allowed.includes(targetStatus)
}
