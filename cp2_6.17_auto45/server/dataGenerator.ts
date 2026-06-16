export interface LanguageData {
  language: string;
  monthIndex: number;
  monthLabel: string;
  repos: number;
  contributors: number;
  newIssues: number;
  resolvedIssues: number;
}

const LANGUAGES = ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go'];
const MONTHS = 120;

function generateLanguageData(language: string, baseIndex: number): LanguageData[] {
  const data: LanguageData[] = [];
  const now = new Date();
  const baseRepos = 50000 + baseIndex * 30000;
  const baseContributors = 2000 + baseIndex * 800;
  const baseIssues = 500 + baseIndex * 200;

  for (let i = 0; i < MONTHS; i++) {
    const date = new Date(now.getFullYear() - 10, now.getMonth() + i, 1);
    const monthLabel = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const growthFactor = 1 + i / 60 * (0.8 + Math.random() * 0.4);
    const waveFactor = Math.sin(i / 12 * Math.PI * 2) * 0.15 + 1;
    const randomFactor = 0.85 + Math.random() * 0.3;

    const repos = Math.floor(baseRepos * growthFactor * waveFactor * randomFactor);
    const contributors = Math.floor(baseContributors * growthFactor * waveFactor * randomFactor);
    const newIssues = Math.floor(baseIssues * growthFactor * waveFactor * randomFactor);
    const resolutionRate = 0.6 + Math.random() * 0.35;
    const resolvedIssues = Math.floor(newIssues * resolutionRate);

    data.push({
      language,
      monthIndex: i,
      monthLabel,
      repos,
      contributors,
      newIssues,
      resolvedIssues
    });
  }

  return data;
}

export function generateMockData(): LanguageData[] {
  const allData: LanguageData[] = [];
  LANGUAGES.forEach((lang, index) => {
    allData.push(...generateLanguageData(lang, index));
  });
  return allData;
}
