import React, { useState, useEffect, useMemo } from 'react';
import Dashboard from './components/Dashboard';
import ExhibitionGenerator from './components/ExhibitionGenerator';
import { Book, Exhibition, getThemeColor } from './utils/bookData';

type PageType = 'dashboard' | 'generator' | 'calendar';

interface CalendarDay {
  date: string;
  day: number;
  isCurrentMonth: boolean;
  exhibitions: Exhibition[];
}

const initialExhibitions: Exhibition[] = [
  {
    id: 1,
    name: '深海秘境书展',
    theme: '深海',
    startDate: '2024-06-10',
    endDate: '2024-06-16',
    color: '#1ABC9C',
    books: [],
  },
  {
    id: 2,
    name: '星际探索书展',
    theme: '宇宙',
    startDate: '2024-06-20',
    endDate: '2024-06-26',
    color: '#8E44AD',
    books: [],
  },
  {
    id: 3,
    name: '侦探推理周',
    theme: '侦探',
    startDate: '2024-07-01',
    endDate: '2024-07-07',
    color: '#E74C3C',
    books: [],
  },
  {
    id: 4,
    name: '绘本阅读月',
    theme: '绘本',
    startDate: '2024-06-15',
    endDate: '2024-06-20',
    color: '#F39C12',
    books: [],
  },
];

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [isMobile, setIsMobile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [exhibitions, setExhibitions] = useState<Exhibition[]>(initialExhibitions);
  const [currentMonth, setCurrentMonth] = useState(new Date(2024, 5, 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedExhibition, setSelectedExhibition] = useState<Exhibition | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: CalendarDay[] = [];

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        date,
        day,
        isCurrentMonth: false,
        exhibitions: getExhibitionsForDate(date),
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        date,
        day: i,
        isCurrentMonth: true,
        exhibitions: getExhibitionsForDate(date),
      });
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nextMonth = month + 2;
      const nextYear = nextMonth > 12 ? year + 1 : year;
      const displayMonth = nextMonth > 12 ? 1 : nextMonth;
      const date = `${nextYear}-${String(displayMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        date,
        day: i,
        isCurrentMonth: false,
        exhibitions: getExhibitionsForDate(date),
      });
    }

    return days;
  }, [currentMonth, exhibitions]);

  function getExhibitionsForDate(date: string): Exhibition[] {
    return exhibitions.filter(ex => date >= ex.startDate && date <= ex.endDate);
  }

  const handleGenerateExhibition = (theme: string, selectedBooks: Book[]) => {
    const color = getThemeColor(theme);
    const newExhibition: Exhibition = {
      id: Date.now(),
      name: `${theme}书展`,
      theme,
      startDate: '2024-07-01',
      endDate: '2024-07-07',
      color,
      books: selectedBooks,
    };
    setExhibitions(prev => [...prev, newExhibition]);
    alert(`已创建书展：${newExhibition.name}\n共 ${selectedBooks.length} 本图书`);
  };

  const navigateTo = (page: PageType) => {
    setCurrentPage(page);
    setIsMenuOpen(false);
    setSelectedDate(null);
    setSelectedExhibition(null);
  };

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
    setSelectedExhibition(null);
  };

  const handleExhibitionClick = (exhibition: Exhibition) => {
    setSelectedExhibition(exhibition);
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const renderSidebar = () => (
    <div
      style={{
        width: isMobile ? '100%' : '220px',
        height: isMobile ? 'auto' : '100vh',
        backgroundColor: '#2C3E50',
        color: 'white',
        padding: '24px 0',
        position: isMobile ? 'fixed' : 'fixed',
        top: 0,
        left: 0,
        zIndex: 100,
        transition: 'transform 0.3s ease',
        transform: isMobile && !isMenuOpen ? 'translateY(-100%)' : 'translateY(0)',
        boxShadow: isMobile ? '0 2px 10px rgba(0,0,0,0.2)' : 'none',
      }}
    >
      {isMobile && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 20px 16px 20px',
            borderBottom: '1px solid #34495E',
          }}
        >
          <h1 style={{ fontSize: '18px', fontWeight: 600 }}>📚 书展策划系统</h1>
          <button
            onClick={() => setIsMenuOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {!isMobile && (
        <div style={{ padding: '0 20px 24px 20px', borderBottom: '1px solid #34495E', marginBottom: '12px' }}>
          <h1 style={{ fontSize: '16px', fontWeight: 600, lineHeight: 1.4 }}>📚 图书馆书展<br />策划系统</h1>
        </div>
      )}

      <nav style={{ padding: '12px 0' }}>
        <NavItem
          icon="📊"
          label="数据总览"
          active={currentPage === 'dashboard'}
          onClick={() => navigateTo('dashboard')}
        />
        <NavItem
          icon="✨"
          label="书展生成器"
          active={currentPage === 'generator'}
          onClick={() => navigateTo('generator')}
        />
        <NavItem
          icon="📅"
          label="活动日历"
          active={currentPage === 'calendar'}
          onClick={() => navigateTo('calendar')}
        />
      </nav>

      {!isMobile && (
        <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px' }}>
          <div style={{ fontSize: '12px', color: '#7F8C8D', textAlign: 'center' }}>
            v1.0.0 © 社区图书馆
          </div>
        </div>
      )}
    </div>
  );

  const renderCalendar = () => (
    <div style={{ padding: '24px', animation: 'fadeIn 0.3s ease-out' }}>
      <h2 style={{ marginBottom: '24px', color: '#2C3E50', fontSize: '22px' }}>书展活动日历</h2>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '400px' }}>
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <button
                onClick={prevMonth}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  border: '1px solid #D5DBDB',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontSize: '16px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F8F9F9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                ◀
              </button>
              <h3 style={{ fontSize: '18px', color: '#2C3E50', margin: 0 }}>
                {currentMonth.getFullYear()}年{currentMonth.getMonth() + 1}月
              </h3>
              <button
                onClick={nextMonth}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  border: '1px solid #D5DBDB',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontSize: '16px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F8F9F9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                ▶
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '4px',
              }}
            >
              {weekDays.map(day => (
                <div
                  key={day}
                  style={{
                    textAlign: 'center',
                    padding: '10px 0',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#7F8C8D',
                  }}
                >
                  {day}
                </div>
              ))}
              {calendarDays.map((day, index) => (
                <div
                  key={index}
                  onClick={() => day.isCurrentMonth && handleDayClick(day.date)}
                  style={{
                    aspectRatio: '1',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px',
                    cursor: day.isCurrentMonth ? 'pointer' : 'default',
                    backgroundColor: selectedDate === day.date ? '#EBF5FB' : 'transparent',
                    transition: 'background-color 0.2s',
                    position: 'relative',
                    fontSize: '13px',
                    color: day.isCurrentMonth ? '#2C3E50' : '#BDC3C7',
                  }}
                  onMouseEnter={(e) => {
                    if (day.isCurrentMonth) {
                      e.currentTarget.style.backgroundColor = selectedDate === day.date ? '#D6EAF8' : '#F8F9F9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (day.isCurrentMonth) {
                      e.currentTarget.style.backgroundColor = selectedDate === day.date ? '#EBF5FB' : 'transparent';
                    }
                  }}
                >
                  <span>{day.day}</span>
                  {day.exhibitions.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '6px',
                        display: 'flex',
                        gap: '3px',
                      }}
                    >
                      {day.exhibitions.slice(0, 3).map((ex, i) => (
                        <div
                          key={i}
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: ex.color,
                            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #E8E8E8' }}>
              <p style={{ fontSize: '13px', color: '#7F8C8D', marginBottom: '10px' }}>图例：</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {exhibitions.slice(0, 4).map(ex => (
                  <div key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: ex.color }}></span>
                    <span style={{ fontSize: '12px', color: '#5D6D7E' }}>{ex.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ width: '320px', minWidth: '280px' }}>
          <div style={cardStyle}>
            <h3 style={{ fontSize: '16px', color: '#2C3E50', margin: '0 0 16px 0' }}>
              {selectedDate ? `${selectedDate} 活动` : '选择日期查看活动'}
            </h3>

            {selectedDate && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {getExhibitionsForDate(selectedDate).length === 0 ? (
                  <p style={{ color: '#BDC3C7', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                    当天没有书展活动
                  </p>
                ) : (
                  getExhibitionsForDate(selectedDate).map((ex, index) => (
                    <div
                      key={ex.id}
                      onClick={() => handleExhibitionClick(ex)}
                      style={{
                        padding: '14px',
                        borderRadius: '8px',
                        border: '1px solid #E8E8E8',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        animation: `scaleIn 0.2s ease-out ${index * 0.05}s both`,
                        borderLeft: `4px solid ${ex.color}`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#F8F9F9';
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      <h4 style={{ fontSize: '14px', color: '#2C3E50', margin: '0 0 6px 0' }}>
                        {ex.name}
                      </h4>
                      <p style={{ fontSize: '12px', color: '#7F8C8D', margin: 0 }}>
                        {ex.startDate} ~ {ex.endDate}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {selectedExhibition && (
              <div
                style={{
                  marginTop: '20px',
                  paddingTop: '20px',
                  borderTop: '1px solid #E8E8E8',
                  animation: 'slideInRight 0.3s ease-out',
                }}
              >
                <h4 style={{ fontSize: '15px', color: '#2C3E50', margin: '0 0 12px 0' }}>
                  书展详情
                </h4>
                <div style={{ fontSize: '13px', color: '#5D6D7E', lineHeight: 1.8 }}>
                  <p><strong style={{ color: '#2C3E50' }}>名称：</strong>{selectedExhibition.name}</p>
                  <p><strong style={{ color: '#2C3E50' }}>主题：</strong>{selectedExhibition.theme}</p>
                  <p><strong style={{ color: '#2C3E50' }}>时间：</strong>{selectedExhibition.startDate} ~ {selectedExhibition.endDate}</p>
                  <p><strong style={{ color: '#2C3E50' }}>图书数量：</strong>{selectedExhibition.books.length || '若干'} 本</p>
                </div>
                <button
                  style={{
                    marginTop: '16px',
                    width: '100%',
                    padding: '10px',
                    backgroundColor: selectedExhibition.color,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  查看详情
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'generator':
        return <ExhibitionGenerator onGenerateExhibition={handleGenerateExhibition} />;
      case 'calendar':
        return renderCalendar();
      default:
        return <Dashboard />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F5F7FA', display: 'flex' }}>
      {renderSidebar()}

      {isMobile && isMenuOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 99,
          }}
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <div
        style={{
          flex: 1,
          marginLeft: isMobile ? 0 : '220px',
          minHeight: '100vh',
          transition: 'margin-left 0.3s ease',
        }}
      >
        {isMobile && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              height: '56px',
              backgroundColor: '#2C3E50',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              zIndex: 50,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            <button
              onClick={() => setIsMenuOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '4px 8px',
                marginRight: '12px',
              }}
            >
              ☰
            </button>
            <span style={{ fontSize: '16px', fontWeight: 500 }}>书展策划系统</span>
          </div>
        )}

        <div style={{ paddingTop: isMobile ? '56px' : 0 }}>
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

interface NavItemProps {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick }) => (
  <div
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      padding: '12px 20px',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'all 0.2s',
      backgroundColor: active ? 'rgba(74, 144, 217, 0.2)' : 'transparent',
      borderLeft: active ? '3px solid #4A90D9' : '3px solid transparent',
      color: active ? '#4A90D9' : 'white',
    }}
    onMouseEnter={(e) => {
      if (!active) {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
      }
    }}
    onMouseLeave={(e) => {
      if (!active) {
        e.currentTarget.style.backgroundColor = 'transparent';
      }
    }}
  >
    <span style={{ marginRight: '12px', fontSize: '16px' }}>{icon}</span>
    <span>{label}</span>
  </div>
);

const cardStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: '12px',
  padding: '24px',
  boxShadow: '0 4px 12px rgba(160, 160, 160, 0.15)',
};

export default App;
