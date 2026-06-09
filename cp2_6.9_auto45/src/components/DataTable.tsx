import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Employee } from '../data/mockData';

export type SortField = 'name' | 'department' | 'level' | 'salary';
export type SortOrder = 'asc' | 'desc';

interface DataTableProps {
  employees: Employee[];
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  highlightDepartment: string | null;
}

export interface DataTableHandle {
  scrollToDepartment: (department: string) => void;
}

const levelOrder: Record<string, number> = {
  '实习生': 1,
  '初级': 2,
  '中级': 3,
  '高级': 4,
  '资深': 5,
  '专家': 6
};

const DataTable = forwardRef<DataTableHandle, DataTableProps>(function DataTable(
  { employees, sortField, sortOrder, onSort, highlightDepartment },
  ref
) {
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const [isFading, setIsFading] = useState(false);
  const prevEmployeesRef = useRef<Employee[]>(employees);
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());
  const wrapperRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    scrollToDepartment: (department: string) => {
      const firstMatch = employees.find(emp => emp.department === department);
      if (firstMatch) {
        const rowEl = rowRefs.current.get(firstMatch.id);
        if (rowEl && wrapperRef.current) {
          wrapperRef.current.scrollTo({
            top: rowEl.offsetTop - wrapperRef.current.offsetTop - 80,
            behavior: 'smooth'
          });
        }
      }

      const matchIds = employees
        .filter(emp => emp.department === department)
        .map(emp => emp.id);

      setHighlightedIds(new Set(matchIds));

      setTimeout(() => {
        setHighlightedIds(new Set());
      }, 1500);
    }
  }));

  useEffect(() => {
    if (prevEmployeesRef.current !== employees) {
      setIsFading(true);
      const timer = setTimeout(() => {
        setIsFading(false);
      }, 300);
      prevEmployeesRef.current = employees;
      return () => clearTimeout(timer);
    }
  }, [employees]);

  useEffect(() => {
    if (!highlightDepartment) return;

    const matchIds = employees
      .filter(emp => emp.department === highlightDepartment)
      .map(emp => emp.id);

    setHighlightedIds(new Set(matchIds));

    const timer = setTimeout(() => {
      setHighlightedIds(new Set());
    }, 1500);

    return () => clearTimeout(timer);
  }, [highlightDepartment, employees]);

  const getSortArrow = (field: SortField) => {
    const isActive = sortField === field;
    const arrow = sortOrder === 'asc' ? '▲' : '▼';
    return (
      <span className={`sort-arrow ${isActive ? 'active' : ''}`}>
        {arrow}
      </span>
    );
  };

  const formatSalary = (salary: number) => {
    return salary.toLocaleString('zh-CN');
  };

  return (
    <div className="table-wrapper" ref={wrapperRef} style={{ maxHeight: '500px', overflowY: 'auto' }}>
      <div className="panel-title" style={{ marginBottom: '16px' }}>
        <span>员工薪资明细</span>
        <span style={{ fontSize: '12px', color: '#7f8c8d', fontWeight: '400' }}>点击表头排序</span>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th onClick={() => onSort('name')} style={{ width: '20%' }}>
              姓名{getSortArrow('name')}
            </th>
            <th onClick={() => onSort('department')} style={{ width: '25%' }}>
              部门{getSortArrow('department')}
            </th>
            <th onClick={() => onSort('level')} style={{ width: '20%' }}>
              职级{getSortArrow('level')}
            </th>
            <th onClick={() => onSort('salary')} style={{ width: '35%' }}>
              薪资（元）{getSortArrow('salary')}
            </th>
          </tr>
        </thead>
        <tbody className={isFading ? 'fading' : ''}>
          {employees.map((employee, index) => (
            <tr
              key={employee.id}
              ref={(el) => {
                if (el) rowRefs.current.set(employee.id, el);
              }}
              className={`table-row ${highlightedIds.has(employee.id) ? 'highlighted' : ''}`}
              style={{
                animationDelay: `${index * 0.08}s`,
                animationFillMode: 'both'
              }}
            >
              <td style={{ width: '20%' }}>{employee.name}</td>
              <td style={{ width: '25%' }}>
                <span className="department-tag">{employee.department}</span>
              </td>
              <td style={{ width: '20%' }}>
                <span className="level-badge">{employee.level}</span>
              </td>
              <td style={{ width: '35%' }} className="salary-cell">
                ¥{formatSalary(employee.salary)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

export default DataTable;
