import { v4 as uuidv4 } from 'uuid';

export interface Employee {
  id: string;
  name: string;
  department: string;
  level: string;
  salary: number;
}

const departments = [
  '技术部', '产品部', '设计部', '市场部',
  '运营部', '人力资源部', '财务部', '销售部'
];

const levels = ['实习生', '初级', '中级', '高级', '资深', '专家'];

const firstNames = ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '马', '朱', '胡'];
const lastNames = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀英', '霞', '平'];

const salaryRanges: Record<string, [number, number]> = {
  '实习生': [3000, 6000],
  '初级': [8000, 15000],
  '中级': [15000, 25000],
  '高级': [25000, 40000],
  '资深': [40000, 60000],
  '专家': [60000, 100000]
};

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomName(): string {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  return firstName + lastName;
}

export function generateMockEmployees(count: number = 40): Employee[] {
  const employees: Employee[] = [];
  for (let i = 0; i < count; i++) {
    const level = levels[Math.floor(Math.random() * levels.length)];
    const [minSalary, maxSalary] = salaryRanges[level];
    employees.push({
      id: uuidv4(),
      name: randomName(),
      department: departments[Math.floor(Math.random() * departments.length)],
      level,
      salary: randomBetween(minSalary, maxSalary)
    });
  }
  return employees;
}

export interface DepartmentData {
  name: string;
  employeeCount: number;
  totalSalary: number;
}

export function aggregateByDepartment(employees: Employee[]): DepartmentData[] {
  const deptMap = new Map<string, DepartmentData>();
  
  employees.forEach(emp => {
    const existing = deptMap.get(emp.department);
    if (existing) {
      existing.employeeCount += 1;
      existing.totalSalary += emp.salary;
    } else {
      deptMap.set(emp.department, {
        name: emp.department,
        employeeCount: 1,
        totalSalary: emp.salary
      });
    }
  });
  
  return Array.from(deptMap.values()).sort((a, b) => b.totalSalary - a.totalSalary);
}

export function calculateMedian(salaries: number[]): number {
  if (salaries.length === 0) return 0;
  const sorted = [...salaries].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export const colorPalette = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
  '#9b59b6', '#1abc9c', '#e67e22', '#34495e',
  '#16a085', '#c0392b', '#8e44ad', '#27ae60'
];
