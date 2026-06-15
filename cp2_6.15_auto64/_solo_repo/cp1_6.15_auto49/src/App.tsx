import { useState, useCallback, useEffect } from 'react';
import BookingForm from './components/BookingForm';
import SpaceGrid from './components/SpaceGrid';
import {
  Space,
  Booking,
  SpaceType,
  BookingResult,
  createInitialSpaces,
  processBookingRequest,
  updateSpaceStatuses,
} from './logic/bookingLogic';

export default function App() {
  const [spaces, setSpaces] = useState<Space[]>(() => createInitialSpaces());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [lastResult, setLastResult] = useState<BookingResult | null>(null);
  const [resultVisible, setResultVisible] = useState(false);

  useEffect(() => {
    setSpaces((prev) => updateSpaceStatuses(prev, bookings));
  }, [bookings]);

  const handleSubmit = useCallback(
    (data: { petName: string; spaceType: SpaceType; startDate: string; endDate: string }) => {
      const result = processBookingRequest({
        ...data,
        spaces,
        bookings,
      });

      setLastResult(result);
      setResultVisible(true);

      if (result.success && result.booking) {
        setBookings((prev) => [...prev, result.booking!]);
        setSpaces((prev) =>
          prev.map((s) =>
            s.id === result.booking!.spaceId ? { ...s, status: 'occupied' } : s
          )
        );
      }

      setTimeout(() => {
        setResultVisible(false);
      }, 3000);
    },
    [spaces, bookings]
  );

  const handleSpaceClick = useCallback((spaceId: string) => {
    setSpaces((prev) =>
      prev.map((s) => {
        if (s.id !== spaceId) return s;
        if (s.status === 'idle') {
          return { ...s, status: 'cleaning' };
        }
        if (s.status === 'cleaning') {
          setTimeout(() => {
            setSpaces((p) => p.map((sp) => (sp.id === spaceId ? { ...sp, status: 'idle' } : sp)));
          }, 500);
          return s;
        }
        return s;
      })
    );
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        minHeight: '100vh',
        gap: '24px',
        padding: '24px',
        background: 'linear-gradient(135deg, #FFF8E1 0%, #FAFAFA 100%)',
      }}
    >
      <div
        style={{
          width: '400px',
          minWidth: '320px',
          flexShrink: 0,
        }}
      >
        <BookingForm onSubmit={handleSubmit} lastResult={lastResult} resultVisible={resultVisible} />
      </div>

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <SpaceGrid
          spaces={spaces}
          bookings={bookings}
          onSpaceClick={handleSpaceClick}
        />
      </div>
    </div>
  );
}
