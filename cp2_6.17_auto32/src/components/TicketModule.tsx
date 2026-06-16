import React, { useState, useEffect } from 'react';
import useApi, { TourStop, Order } from '../hooks/useApi';
import './TicketModule.css';

interface SeatInfo {
  id: string;
  row: string;
  number: number;
  area: 'front' | 'middle' | 'back';
  status: 'available' | 'sold' | 'occupied';
  price: number;
}

const TicketModule: React.FC = () => {
  const { getStops, createOrder, getOrders } = useApi();
  const [stops, setStops] = useState<TourStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCity, setFilterCity] = useState('全部');
  const [filterDate, setFilterDate] = useState('');
  const [selectedStop, setSelectedStop] = useState<TourStop | null>(null);
  const [seats, setSeats] = useState<SeatInfo[]>([]);
  const [selectedSeat, setSelectedSeat] = useState<SeatInfo | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [showTicket, setShowTicket] = useState(false);
  const [ticketData, setTicketData] = useState<Order | null>(null);

  useEffect(() => {
    const loadStops = async () => {
      try {
        const data = await getStops();
        setStops(data.filter(s => s.status === '计划中'));
      } catch (err) {
        console.error('加载演出失败', err);
      } finally {
        setLoading(false);
      }
    };
    loadStops();
  }, []);

  const cities = ['全部', ...new Set(stops.map(s => s.city))];

  const filteredStops = stops.filter(stop => {
    if (filterCity !== '全部' && stop.city !== filterCity) return false;
    if (filterDate && stop.date !== filterDate) return false;
    return true;
  });

  const generateSeats = () => {
    const seats: SeatInfo[] = [];
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const seatsPerRow = 12;

    rows.forEach((row, rowIndex) => {
      for (let i = 1; i <= seatsPerRow; i++) {
        const area = rowIndex < 3 ? 'front' : rowIndex < 6 ? 'middle' : 'back';
        const price = area === 'front' ? 580 : area === 'middle' ? 380 : 180;
        
        const random = Math.random();
        let status: 'available' | 'sold' | 'occupied' = 'available';
        if (random < 0.3) status = 'sold';
        else if (random < 0.4) status = 'occupied';

        seats.push({
          id: `${row}-${i.toString().padStart(2, '0')}`,
          row,
          number: i,
          area,
          status,
          price
        });
      }
    });

    return seats;
  };

  const handleSelectStop = (stop: TourStop) => {
    setSelectedStop(stop);
    setSeats(generateSeats());
    setSelectedSeat(null);
  };

  const handleSeatClick = (seat: SeatInfo) => {
    if (seat.status === 'available') {
      setSelectedSeat(seat);
    }
  };

  const handlePurchase = async () => {
    if (!selectedStop || !selectedSeat || !customerName.trim()) {
      alert('请填写完整信息');
      return;
    }

    try {
      const order = await createOrder({
        playId: selectedStop.playId,
        stopId: selectedStop.id,
        seatNumber: selectedSeat.id,
        seatArea: selectedSeat.area,
        customerName: customerName.trim(),
        price: selectedSeat.price
      });

      setTicketData({
        ...order,
        playName: selectedStop.playName,
        city: selectedStop.city,
        venue: selectedStop.venue,
        date: selectedStop.date
      });
      setShowTicket(true);

      setSeats(prev => prev.map(s => 
        s.id === selectedSeat.id ? { ...s, status: 'sold' as const } : s
      ));
    } catch (err) {
      console.error('购票失败', err);
      alert('购票失败，请重试');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  };

  const getSeatsByRow = (row: string) => {
    return seats.filter(s => s.row === row).sort((a, b) => a.number - b.number);
  };

  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  if (loading) {
    return <div className="ticket-module"><div className="loading">加载中...</div></div>;
  }

  return (
    <div className="ticket-module">
      <div className="module-header">
        <h2>在线购票</h2>
      </div>

      {!selectedStop ? (
        <>
          <div className="filter-bar">
            <div className="filter-group">
              <label>城市</label>
              <select value={filterCity} onChange={e => setFilterCity(e.target.value)}>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>日期</label>
              <input
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
              />
            </div>
          </div>

          <div className="shows-list">
            {filteredStops.length === 0 ? (
              <div className="empty-state">暂无符合条件的演出</div>
            ) : (
              filteredStops.map(stop => (
                <div
                  key={stop.id}
                  className="show-card"
                  onClick={() => handleSelectStop(stop)}
                >
                  <div className="show-date">
                    <div className="date-day">{new Date(stop.date).getDate()}</div>
                    <div className="date-month">{new Date(stop.date).getMonth() + 1}月</div>
                  </div>
                  <div className="show-info">
                    <h3>{stop.playName}</h3>
                    <p className="show-city">{stop.city} · {stop.venue}</p>
                    <p className="show-time">{formatDate(stop.date)}</p>
                  </div>
                  <div className="show-action">
                    <button className="btn-primary">选座购票</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="seat-selection">
          <button className="back-btn" onClick={() => {
            setSelectedStop(null);
            setSelectedSeat(null);
          }}>
            ← 返回演出列表
          </button>

          <div className="show-detail-header">
            <h3>{selectedStop.playName}</h3>
            <p>{selectedStop.city} · {selectedStop.venue} · {formatDate(selectedStop.date)}</p>
          </div>

          <div className="stage">舞台</div>

          <div className="seat-map">
            {rows.map(row => (
              <div key={row} className="seat-row">
                <span className="row-label">{row}</span>
                {getSeatsByRow(row).map(seat => (
                  <div
                    key={seat.id}
                    className={`seat seat-${seat.area} seat-${seat.status} ${selectedSeat?.id === seat.id ? 'selected' : ''}`}
                    onClick={() => handleSeatClick(seat)}
                    title={`${seat.id} - ¥${seat.price}`}
                  />
                ))}
                <span className="row-label">{row}</span>
              </div>
            ))}
          </div>

          <div className="seat-legend">
            <span className="legend-item">
              <span className="seat-legend-dot available"></span> 可选
            </span>
            <span className="legend-item">
              <span className="seat-legend-dot sold"></span> 已售
            </span>
            <span className="legend-item">
              <span className="seat-legend-dot occupied"></span> 已占
            </span>
            <span className="legend-item">
              <span className="seat-legend-dot selected"></span> 已选
            </span>
          </div>

          {selectedSeat && (
            <div className="purchase-panel">
              <div className="selected-info">
                <div>
                  <span className="label">座位</span>
                  <span className="value">{selectedSeat.id} ({selectedSeat.area === 'front' ? '前区' : selectedSeat.area === 'middle' ? '中区' : '后区'})</span>
                </div>
                <div>
                  <span className="label">票价</span>
                  <span className="value price">¥{selectedSeat.price}</span>
                </div>
              </div>
              <div className="customer-input">
                <input
                  type="text"
                  placeholder="请输入姓名"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                />
              </div>
              <button className="btn-primary purchase-btn" onClick={handlePurchase}>
                确认购票
              </button>
            </div>
          )}
        </div>
      )}

      {showTicket && ticketData && (
        <div className="ticket-modal" onClick={() => {
          setShowTicket(false);
          setSelectedSeat(null);
          setCustomerName('');
          setSelectedStop(null);
        }}>
          <div className="e-ticket" onClick={e => e.stopPropagation()}>
            <div className="ticket-header">
              <div className="ticket-title">电子票</div>
              <div className="ticket-order-no">订单号：{ticketData.id}</div>
            </div>
            <div className="ticket-body">
              <h3 className="ticket-play">{ticketData.playName}</h3>
              <div className="ticket-info">
                <div className="ticket-row">
                  <span className="ticket-label">时间</span>
                  <span className="ticket-value">{ticketData.date}</span>
                </div>
                <div className="ticket-row">
                  <span className="ticket-label">场馆</span>
                  <span className="ticket-value">{ticketData.venue}</span>
                </div>
                <div className="ticket-row">
                  <span className="ticket-label">座位</span>
                  <span className="ticket-value">{ticketData.seatNumber}</span>
                </div>
                <div className="ticket-row">
                  <span className="ticket-label">观众</span>
                  <span className="ticket-value">{ticketData.customerName}</span>
                </div>
              </div>
            </div>
            <div className="ticket-footer">
              <span>巡演排期与观众洞察</span>
            </div>
            <div className="ticket-watermark">电子票 · 请勿转让</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketModule;
