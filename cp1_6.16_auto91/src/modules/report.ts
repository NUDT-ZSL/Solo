import { Flaw, PriceRange } from './analysis';

export type ConditionGrade = 'new' | 'like-new' | 'used' | 'damaged';

export interface ConditionReport {
  id: string;
  score: number;
  condition: ConditionGrade;
  conditionLabel: string;
  flaws: Flaw[];
  priceRange: PriceRange;
  description: string;
  overallAssessment: string;
  createdAt: string;
}

export interface FormattedReport {
  id: string;
  score: number;
  condition: ConditionGrade;
  conditionLabel: string;
  conditionColor: string;
  flaws: FormattedFlaw[];
  priceRange: PriceRange;
  priceRangeText: string;
  description: string;
  overallAssessment: string;
  scoreColor: string;
  createdAt: string;
}

export interface FormattedFlaw extends Flaw {
  severity: 'minor' | 'moderate' | 'major';
}

const CONDITION_GRADES: Array<{
  grade: ConditionGrade;
  label: string;
  color: string;
  minScore: number;
  description: string;
}> = [
  {
    grade: 'new',
    label: '全新',
    color: '#2ECC71',
    minScore: 90,
    description: '乐器状态极佳，几乎没有使用痕迹'
  },
  {
    grade: 'like-new',
    label: '几乎全新',
    color: '#3498DB',
    minScore: 75,
    description: '轻微使用痕迹，整体状态良好'
  },
  {
    grade: 'used',
    label: '有明显使用痕迹',
    color: '#E67E22',
    minScore: 50,
    description: '有明显使用痕迹，功能正常'
  },
  {
    grade: 'damaged',
    label: '有瑕疵',
    color: '#E74C3C',
    minScore: 0,
    description: '存在瑕疵或损坏，需要注意'
  }
];

function determineCondition(score: number): {
  grade: ConditionGrade;
  label: string;
  color: string;
  description: string;
} {
  for (const grade of CONDITION_GRADES) {
    if (score >= grade.minScore) {
      return grade;
    }
  }
  return CONDITION_GRADES[CONDITION_GRADES.length - 1];
}

function getScoreColor(score: number): string {
  if (score >= 90) return '#2ECC71';
  if (score >= 75) return '#3498DB';
  if (score >= 50) return '#E67E22';
  return '#E74C3C';
}

function assessFlawSeverity(flaw: Flaw): 'minor' | 'moderate' | 'major' {
  const area = flaw.w * flaw.h;
  if (area > 0.08) return 'major';
  if (area > 0.03) return 'moderate';
  return 'minor';
}

function generateDescription(score: number, flaws: Flaw[]): string {
  const condition = determineCondition(score);
  const baseDesc = condition.description;
  
  if (flaws.length === 0) {
    return `${baseDesc}，经检测未发现明显瑕疵。`;
  }
  
  const flawTypes = [...new Set(flaws.map(f => f.description))];
  const flawSummary = flawTypes.slice(0, 3).join('、');
  
  return `${baseDesc}，检测到的主要问题包括：${flawSummary}${flawTypes.length > 3 ? '等' : ''}。`;
}

function generateOverallAssessment(score: number, flaws: Flaw[]): string {
  const assessments: string[] = [];
  
  if (score >= 90) {
    assessments.push('这是一把保养极好的乐器');
    assessments.push('状态接近全新');
    assessments.push('具有很高的收藏价值');
  } else if (score >= 75) {
    assessments.push('乐器整体状态良好');
    assessments.push('正常使用几乎不会有问题');
    assessments.push('性价比很高');
  } else if (score >= 50) {
    assessments.push('乐器有使用痕迹但功能正常');
    assessments.push('建议购买后进行专业保养');
    assessments.push('适合预算有限的买家');
  } else {
    assessments.push('乐器存在一些瑕疵');
    assessments.push('建议仔细检查瑕疵位置');
    assessments.push('价格反映了当前状态');
  }
  
  if (flaws.length > 3) {
    assessments.push('请注意多处瑕疵位置');
  } else if (flaws.length > 0) {
    assessments.push('瑕疵位置已在图中标注');
  } else {
    assessments.push('未发现明显瑕疵');
  }
  
  return assessments.join('，') + '。';
}

export function generateReport(
  score: number,
  flaws: Flaw[],
  priceRange: PriceRange
): ConditionReport {
  const condition = determineCondition(score);
  const now = new Date().toISOString();
  
  return {
    id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    score,
    condition: condition.grade,
    conditionLabel: condition.label,
    flaws,
    priceRange,
    description: generateDescription(score, flaws),
    overallAssessment: generateOverallAssessment(score, flaws),
    createdAt: now
  };
}

export function formatReportForDisplay(report: ConditionReport): FormattedReport {
  const formattedFlaws: FormattedFlaw[] = report.flaws.map(flaw => ({
    ...flaw,
    severity: assessFlawSeverity(flaw)
  }));
  
  const priceRangeText = `¥${report.priceRange.min.toLocaleString()} - ¥${report.priceRange.max.toLocaleString()}`;
  
  return {
    ...report,
    conditionColor: getScoreColor(report.score),
    scoreColor: getScoreColor(report.score),
    flaws: formattedFlaws,
    priceRangeText
  };
}

export function getConditionInfo(grade: ConditionGrade): {
  label: string;
  color: string;
} {
  const condition = CONDITION_GRADES.find(g => g.grade === grade);
  return condition ? { label: condition.label, color: condition.color } : { label: '未知', color: '#999' };
}

export function interpolateColor(score: number): string {
  const clampedScore = Math.max(0, Math.min(100, score));
  const ratio = clampedScore / 100;
  
  const r1 = 231, g1 = 76, b1 = 60;
  const r2 = 46, g2 = 204, b2 = 113;
  
  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);
  
  return `rgb(${r}, ${g}, ${b})`;
}
