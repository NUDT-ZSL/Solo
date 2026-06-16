import type { Flaw } from './analysis';

export interface ConditionReport {
  score: number;
  grade: string;
  gradeKey: 'new' | 'like-new' | 'used' | 'damaged';
  summary: string;
  details: {
    appearance: string;
    playability: string;
    valueRetention: string;
  };
  flaws: Flaw[];
  recommendations: string[];
  generatedAt: string;
}

export interface DisplayReport {
  score: number;
  grade: string;
  gradeKey: string;
  gradeColor: string;
  summary: string;
  details: { title: string; content: string }[];
  flaws: Flaw[];
  recommendations: string[];
  generatedAt: string;
}

function getGrade(score: number): { grade: string; key: 'new' | 'like-new' | 'used' | 'damaged'; color: string } {
  if (score >= 90) {
    return { grade: '全新', key: 'new', color: '#2ECC71' };
  } else if (score >= 75) {
    return { grade: '几乎全新', key: 'like-new', color: '#3498DB' };
  } else if (score >= 60) {
    return { grade: '有明显使用痕迹', key: 'used', color: '#E67E22' };
  } else {
    return { grade: '有瑕疵', key: 'damaged', color: '#E74C3C' };
  }
}

function generateSummary(score: number, flawCount: number): string {
  const grade = getGrade(score);
  
  if (score >= 95) {
    return `该乐器整体品相极佳，达到${grade.grade}标准。外观几乎全新，无明显使用痕迹，是收藏或日常使用的绝佳选择。`;
  } else if (score >= 90) {
    return `该乐器整体品相优秀，属于${grade.grade}范畴。外观保养良好，仅有极轻微的使用痕迹，整体状态出色。`;
  } else if (score >= 80) {
    return `该乐器整体状态良好，${grade.grade}。外观有轻微使用痕迹，但不影响整体美观和演奏性能。`;
  } else if (score >= 70) {
    return `该乐器状态尚可，评定为${grade.grade}。存在一些可见的使用痕迹和轻微磨损，属于正常使用范围内。`;
  } else if (score >= 60) {
    return `该乐器有${grade.grade}，外观可见明显使用痕迹和磨损。但功能完好，不影响正常演奏。`;
  } else {
    return `该乐器${grade.grade}，存在较明显的外观瑕疵。建议仔细查看瑕疵详情，确认是否在可接受范围内。`;
  }
}

function generateAppearanceDetail(score: number, flawCount: number): string {
  if (score >= 95) {
    return '外观完美，漆面光洁如新，无任何划痕、磕碰或氧化痕迹。金属部件光泽度高，木质部分纹理清晰。';
  } else if (score >= 85) {
    return '外观状态极佳，仅有极细微的使用痕迹，需仔细观察才能发现。整体漆面保持良好，金属部件基本无氧化。';
  } else if (score >= 75) {
    return `外观状态良好，存在${flawCount}处轻微瑕疵。主要为正常使用产生的细微划痕或小磕碰，不影响整体美观。`;
  } else if (score >= 65) {
    return `外观有一定使用痕迹，可见${flawCount}处明显瑕疵。包括一些划痕和轻微磕碰，属于正常使用留下的印记。`;
  } else {
    return `外观瑕疵较为明显，共检测到${flawCount}处问题。包含较深的划痕或磕碰，对外观有一定影响。`;
  }
}

function generatePlayabilityDetail(score: number): string {
  if (score >= 90) {
    return '演奏性能优秀，琴颈状态良好，品丝磨损极小。弦距适中，按弦舒适，音色保持出厂水准。';
  } else if (score >= 75) {
    return '演奏性能良好，品丝有轻微磨损但不影响使用。琴颈状态稳定，经过简单调试即可达到最佳演奏状态。';
  } else if (score >= 60) {
    return '演奏性能正常，品丝有一定程度磨损。建议进行一次专业保养和品丝抛光，以恢复最佳手感。';
  } else {
    return '演奏性能基本正常，但可能需要一些维修工作。建议进行全面检查和必要的维修调试。';
  }
}

function generateValueRetentionDetail(score: number): string {
  if (score >= 90) {
    return '保值能力优秀，接近全新状态。二手市场认可度高，转售时价格损失较小，具有一定的收藏价值。';
  } else if (score >= 75) {
    return '保值能力良好，正常损耗范围内。在二手市场较为抢手，价格相对稳定，适合日常使用。';
  } else if (score >= 60) {
    return '保值能力一般，外观损耗对价值有一定影响。但功能性完好，性价比高，适合预算有限的买家。';
  } else {
    return '保值能力有限，瑕疵较明显影响市场价值。但价格通常较低，适合对外观要求不高的实用主义者。';
  }
}

function generateRecommendations(score: number, flaws: Flaw[]): string[] {
  const recommendations: string[] = [];
  
  if (score >= 90) {
    recommendations.push('建议使用原装琴盒存放，避免日晒和温度骤变');
    recommendations.push('定期进行专业保养，延长使用寿命');
  } else if (score >= 75) {
    recommendations.push('可考虑进行一次全面清洁和护理');
    recommendations.push('使用加湿器保持适当湿度，防止木材开裂');
  } else if (score >= 60) {
    recommendations.push('建议进行专业维修和翻新处理');
    recommendations.push('更换磨损的琴弦以获得最佳音色');
    recommendations.push('可考虑品丝抛光和指板护理');
  } else {
    recommendations.push('建议在专业琴行进行全面检修');
    recommendations.push('评估维修成本是否值得投入');
    recommendations.push('如非必要，可作为练习琴使用');
  }
  
  if (flaws.length > 0) {
    const hasScratch = flaws.some(f => f.description.includes('划痕'));
    const hasDent = flaws.some(f => f.description.includes('磕碰') || f.description.includes('掉漆'));
    
    if (hasScratch) {
      recommendations.push('表面划痕可使用抛光蜡进行处理');
    }
    if (hasDent) {
      recommendations.push('磕碰部位建议使用护板或贴纸遮盖装饰');
    }
  }
  
  return recommendations.slice(0, 4);
}

export function generateReport(score: number, flaws: Flaw[]): ConditionReport {
  const { grade, key } = getGrade(score);
  const now = new Date().toISOString();
  
  return {
    score,
    grade,
    gradeKey: key,
    summary: generateSummary(score, flaws.length),
    details: {
      appearance: generateAppearanceDetail(score, flaws.length),
      playability: generatePlayabilityDetail(score),
      valueRetention: generateValueRetentionDetail(score)
    },
    flaws,
    recommendations: generateRecommendations(score, flaws),
    generatedAt: now
  };
}

export function formatReportForDisplay(report: ConditionReport): DisplayReport {
  const { color } = getGrade(report.score);
  
  const detailTitles = [
    { key: 'appearance', title: '外观评估' },
    { key: 'playability', title: '演奏性能' },
    { key: 'valueRetention', title: '保值能力' }
  ];
  
  const details = detailTitles.map(({ key, title }) => ({
    title,
    content: report.details[key as keyof typeof report.details]
  }));
  
  return {
    score: report.score,
    grade: report.grade,
    gradeKey: report.gradeKey,
    gradeColor: color,
    summary: report.summary,
    details,
    flaws: report.flaws,
    recommendations: report.recommendations,
    generatedAt: report.generatedAt
  };
}
