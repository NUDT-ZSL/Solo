export interface Volunteer {
  id: string;
  name: string;
  avatar: string;
}

export interface Activity {
  id: string;
  date: string;
  volunteerId: string;
  type: '垃圾分类宣传' | '河道清洁' | '植树';
  duration: number;
}

const volunteerNames = [
  '张伟', '李娜', '王芳', '刘洋', '陈静',
  '杨光', '赵敏', '黄磊', '周杰', '吴婷',
  '徐丽', '孙明', '马超', '朱琳', '胡军'
];

const activityTypes: Array<'垃圾分类宣传' | '河道清洁' | '植树'> = [
  '垃圾分类宣传',
  '河道清洁',
  '植树'
];

const generateVolunteers = (): Volunteer[] => {
  return volunteerNames.map((name, index) => ({
    id: `v-${index + 1}`,
    name,
    avatar: name.charAt(0)
  }));
};

const randomInt = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const generateActivities = (volunteers: Volunteer[]): Activity[] => {
  const activities: Activity[] = [];
  const year = 2026;
  let id = 1;

  for (let month = 1; month <= 12; month++) {
    const activitiesInMonth = randomInt(4, 8);

    for (let i = 0; i < activitiesInMonth; i++) {
      const day = randomInt(1, month === 2 ? 28 : 30);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const volunteer = volunteers[randomInt(0, volunteers.length - 1)];
      const type = activityTypes[randomInt(0, activityTypes.length - 1)];
      const duration = randomInt(30, 180);

      activities.push({
        id: `a-${id++}`,
        date: dateStr,
        volunteerId: volunteer.id,
        type,
        duration
      });
    }
  }

  return activities;
};

const volunteersData = generateVolunteers();
const activitiesData = generateActivities(volunteersData);

export const getVolunteers = (): Promise<Volunteer[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(volunteersData);
    }, 100);
  });
};

export const getActivities = (): Promise<Activity[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(activitiesData);
    }, 100);
  });
};
