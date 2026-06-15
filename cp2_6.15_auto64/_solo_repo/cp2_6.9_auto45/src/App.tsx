import { useMemo, useState, useRef, useCallback } from 'react';
import StatsCards from './components/StatsCards';
import BarChart from './components/BarChart';
import DataTable, { SortField, SortOrder, DataTableHandle } from './components/DataTable';
import {
  generateMockEmployees,
  aggregateByDepartment,
  calculateMedian,
  Employee
} from './data/mockData';

const levelOrder: Record<string, number> = {
  '实习生': 1,
  '初级': 2,
  '中级': 3,
  '高级': 4,
  '资深': 5,
  '专家': 6
};

export default function App() {
  const [employees] = useState<Employee[]>(() => generateMockEmployees(40));
  const [sortField, setSortField] = useState<SortField>('salary');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [activeDepartment, setActiveDepartment] = useState<string | null>(null);
  const tableRef = useRef<DataTableHandle>(null);

  const sortedEmployees = useMemo(() => {
    const sorted = [...employees];
    const direction = sortOrder === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'zh-CN');
          break;
        case 'department':
          comparison = a.department.localeCompare(b.department, 'zh-CN');
          break;
        case 'level':
          comparison = (levelOrder[a.level] || 0) - (levelOrder[b.level] || 0);
          break;
        case 'salary':
          comparison = a.salary - b.salary;
          break;
      }

      return comparison * direction;
    });

    return sorted;
  }, [employees, sortField, sortOrder]);

  const departments = useMemo(() => aggregateByDepartment(employees), [employees]);

  const stats = useMemo(() => {
    const salaries = employees.map(e => e.salary);
    const totalSalary = salaries.reduce((sum, s) => sum + s, 0);
    return {
      totalCount: employees.length,
      averageSalary: employees.length > 0 ? Math.round(totalSalary / employees.length) : 0,
      medianSalary: calculateMedian(salaries)
    };
  }, [employees]);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'salary' ? 'desc' : 'asc');
    }
  }, [sortField]);

  const handleDepartmentClick = useCallback((departmentName: string) => {
    setActiveDepartment(departmentName);
    if (tableRef.current) {
      tableRef.current.scrollToDepartment(departmentName);
    }

    setTimeout(() => {
      setActiveDepartment(prev => prev === departmentName ? null : prev);
    }, 1500);
  }, []);

  return (
    <div className="app-container">
      <header className="header">
        <h1 className="header-title">薪资分布可视化看板</h1>
        <p className="header-subtitle">实时掌握团队薪酬结构与分布情况</p>
      </header>

      <main className="content">
        <StatsCards
          totalCount={stats.totalCount}
          averageSalary={stats.averageSalary}
          medianSalary={stats.medianSalary}
        />

        <div className="main-content">
          <BarChart
            departments={departments}
            onDepartmentClick={handleDepartmentClick}
            activeDepartment={activeDepartment}
          />

          <DataTable
            ref={tableRef}
            employees={sortedEmployees}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={handleSort}
            highlightDepartment={activeDepartment}
          />
        </div>
      </main>
    </div>
  );
}
