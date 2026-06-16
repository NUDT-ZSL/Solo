import { useGameStore } from '../store';

export default function RoomTransition() {
  const { transitionDirection } = useGameStore();
  return (
    <div className={`room-transition ${transitionDirection === 'fadeOut' ? 'fade-out' : 'fade-in'}`} />
  );
}
