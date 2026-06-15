import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PetState, PetType, EventEntry } from './types';
import { useSocket } from './hooks/useSocket';
import PetSelection from './components/PetSelection';
import PetScene from './components/PetScene';
import PetCard from './components/PetCard';
import Timeline from './components/Timeline';

const PET_NAMES: Record<PetType, string> = {
  cat: '小橘',
  dog: '旺财',
  dragon: '小火龙',
};

function generateOwnerId(): string {
  const id = localStorage.getItem('petOwnerId');
  if (id) return id;
  const newId = 'user_' + Math.random().toString(36).substring(2, 10);
  localStorage.setItem('petOwnerId', newId);
  return newId;
}

export default function App() {
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get('roomId') || 'lobby';

  const [ownerId] = useState(generateOwnerId);
  const [view, setView] = useState<'selection' | 'main'>('selection');
  const [myPet, setMyPet] = useState<PetState | null>(null);
  const [otherPets, setOtherPets] = useState<Record<string, PetState>>({});
  const [events, setEvents] = useState<EventEntry[]>([]);
  const [activeAnimation, setActiveAnimation] = useState<'feed' | 'play' | 'train' | null>(null);

  const handleRoomState = useCallback((pets: Record<string, PetState>) => {
    const others: Record<string, PetState> = {};
    Object.entries(pets).forEach(([oid, pet]) => {
      if (oid !== ownerId) {
        others[oid] = pet;
      } else {
        setMyPet(pet);
      }
    });
    setOtherPets(others);
  }, [ownerId]);

  const handlePetUpdated = useCallback((pet: PetState) => {
    if (pet.ownerId === ownerId) {
      setMyPet(pet);
    } else {
      setOtherPets((prev) => ({ ...prev, [pet.ownerId]: pet }));
    }
  }, [ownerId]);

  const handlePetJoined = useCallback((_ownerId: string) => {
  }, []);

  const handlePetLeft = useCallback((leftOwnerId: string) => {
    setOtherPets((prev) => {
      const next = { ...prev };
      delete next[leftOwnerId];
      return next;
    });
  }, []);

  const handleActionResult = useCallback((data: { pet: PetState; event: EventEntry }) => {
    setMyPet(data.pet);
    setEvents((prev) => [data.event, ...prev].slice(0, 100));
    setActiveAnimation(data.event.type);
    setTimeout(() => setActiveAnimation(null), data.event.type === 'train' ? 2000 : data.event.type === 'play' ? 1500 : 1000);
  }, []);

  const { joinRoom, selectPet, performAction } = useSocket({
    ownerId,
    onRoomState: handleRoomState,
    onPetUpdated: handlePetUpdated,
    onPetJoined: handlePetJoined,
    onPetLeft: handlePetLeft,
    onActionResult: handleActionResult,
  });

  useEffect(() => {
    joinRoom(roomId);
  }, [roomId, joinRoom]);

  const handleSelectPet = useCallback((type: PetType) => {
    const name = PET_NAMES[type];
    selectPet(type, name, roomId);
    setMyPet({
      id: '',
      name,
      type,
      ownerId,
      health: 80,
      happiness: 70,
      hunger: 70,
    });
    setView('main');
  }, [selectPet, roomId, ownerId]);

  const handleAction = useCallback((type: 'feed' | 'play' | 'train') => {
    performAction(type, roomId);
  }, [performAction, roomId]);

  const otherPetList = useMemo(() => Object.values(otherPets), [otherPets]);

  if (view === 'selection') {
    return <PetSelection onSelect={handleSelectPet} />;
  }

  return (
    <div className="app-container">
      <div className="main-layout">
        <div className="center-area">
          {myPet && (
            <PetScene
              pet={myPet}
              activeAnimation={activeAnimation}
              onAction={handleAction}
            />
          )}
        </div>
        <div className="sidebar-right">
          <Timeline events={events} />
        </div>
      </div>
      {otherPetList.length > 0 && (
        <div className="other-pets-bar">
          <h3 className="other-pets-title">同房间的小伙伴</h3>
          <div className="other-pets-list">
            {otherPetList.map((pet) => (
              <PetCard key={pet.ownerId} pet={pet} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
