import { useEffect, useRef, useState } from 'react';
import { DepartmentData, colorPalette } from '../data/mockData';

interface BarChartProps {
  departments: DepartmentData[];
  onDepartmentClick: (departmentName: string) => void;
  activeDepartment: string | null;
}

export default function BarChart({ departments, onDepartmentClick, activeDepartment }: BarChartProps) {
  const [maxWidth, setMaxWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const wrapper = containerRef.current.querySelector('.bar-wrapper');
        if (wrapper) {
          setMaxWidth((wrapper as HTMLElement).offsetWidth - 100);
        }
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [departments.length]);

  const maxSalary = departments.length > 0
    ? Math.max(...departments.map(d => d.totalSalary))
    : 0;

  return (
    <div className="panel">
      <div className="panel-title">
        <span>部门薪资分布</span>
        <span style={{ fontSize: '12px', color: '#7f8c8d', fontWeight: '400' }}>按薪资总额排序</span>
      </div>
      <div className="bar-chart-container" ref={containerRef}>
        {departments.map((dept, index) => {
          const widthPercent = maxSalary > 0 ? (dept.totalSalary / maxSalary) * 100 : 0;
          const barWidth = Math.max((widthPercent / 100) * maxWidth, 4);
          const color = colorPalette[index % colorPalette.length];

          return (
            <div
              key={dept.name}
              className={`bar-row ${activeDepartment === dept.name ? 'active' : ''}`}
              onClick={() => onDepartmentClick(dept.name)}
            >
              <div className="bar-wrapper">
                <div
                  className="bar"
                  style={{
                    width: `${barWidth}px`,
                    backgroundColor: color
                  }}
                />
                <div className="bar-value">¥{(dept.totalSalary / 10000).toFixed(1)}万</div>
              </div>
              <div className="bar-info">
                <div className="bar-name">{dept.name}</div>
                <div className="bar-count">{dept.employeeCount} 人</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
