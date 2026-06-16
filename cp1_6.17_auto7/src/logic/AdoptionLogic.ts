export type PersonalityTag = '友好' | '胆小' | '活泼';
export type HealthStatus = '已驱虫' | '已疫苗' | '已绝育';
export type HousingType = '自有住房' | '租房' | '其他';
export type ApplicationStatus = '待审核' | '已通过' | '已拒绝';

export interface Animal {
  id: string;
  name: string;
  breed: string;
  age: number;
  gender: '公' | '母';
  personalityTags: PersonalityTag[];
  healthStatus: HealthStatus[];
  photo: string;
  description: string;
  createdAt: number;
}

export interface ApplicationFormData {
  applicantName: string;
  phone: string;
  age: string;
  housingType: HousingType[];
  hasExistingPets: '是' | '否' | '';
  petExperience: string;
}

export interface ApplicationRecord {
  id: string;
  animalId: string;
  animalName: string;
  applicantName: string;
  phone: string;
  age: number;
  housingType: HousingType[];
  hasExistingPets: boolean;
  petExperience: string;
  status: ApplicationStatus;
  matchScore: number;
  submittedAt: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof ApplicationFormData, string>>;
}

export function validateApplication(data: ApplicationFormData): ValidationResult {
  const errors: Partial<Record<keyof ApplicationFormData, string>> = {};

  if (!data.applicantName?.trim()) {
    errors.applicantName = '请填写领养人姓名';
  }

  if (!data.phone?.trim()) {
    errors.phone = '请填写联系电话';
  } else if (!/^1[3-9]\d{9}$/.test(data.phone.trim())) {
    errors.phone = '请输入正确的手机号码格式';
  }

  if (!data.age) {
    errors.age = '请填写年龄';
  } else {
    const ageNum = parseInt(data.age, 10);
    if (isNaN(ageNum) || !Number.isInteger(ageNum) || ageNum < 18 || ageNum > 70) {
      errors.age = '年龄必须为18-70岁的整数';
    }
  }

  if (!data.housingType || data.housingType.length === 0) {
    errors.housingType = '请至少选择一种住房类型';
  }

  if (!data.hasExistingPets) {
    errors.hasExistingPets = '请选择是否已有宠物';
  }

  if (data.petExperience && data.petExperience.length > 500) {
    errors.petExperience = '养宠经验描述不能超过500字';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

export function calculateMatchScore(
  animal: Animal,
  data: ApplicationFormData
): number {
  let score = 0;

  const ageNum = parseInt(data.age, 10);
  if (ageNum >= 25 && ageNum <= 55) {
    score += 25;
  } else if (ageNum >= 18 && ageNum <= 70) {
    score += 15;
  }

  if (data.housingType.includes('自有住房')) {
    score += 30;
  } else if (data.housingType.includes('租房')) {
    score += 15;
  } else {
    score += 5;
  }

  if (data.hasExistingPets === '否') {
    score += 20;
  } else {
    score += 10;
  }

  const expLength = data.petExperience?.trim().length || 0;
  if (expLength >= 100) {
    score += 25;
  } else if (expLength >= 30) {
    score += 15;
  } else if (expLength > 0) {
    score += 5;
  }

  return Math.min(score, 100);
}

export function transitionStatus(
  currentStatus: ApplicationStatus,
  action: 'approve' | 'reject'
): ApplicationStatus {
  if (currentStatus !== '待审核') {
    return currentStatus;
  }
  return action === 'approve' ? '已通过' : '已拒绝';
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
