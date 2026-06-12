import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import type { EscapeRoom, Item, ItemType, Room } from '../../types';
import GridEditor from '../components/GridEditor';
import PropertyPanel from '../components/PropertyPanel';
import ItemIcon from '../components/ItemIcon';

type ToolType = 'select' | 'wall' | 'erase' | ItemType;

const tools: { id: ToolType; label: string; icon: string }[] = [
  { id: 'select', label: '选择', icon: '🖱️' },
  { id: 'wall', label: '墙壁', icon: '🧱' },
  { id: 'erase', label: '擦除', icon: '🧹' },
  { id: 'key', label: '钥匙', icon: '🔑' },
  { id: 'safe', label: '密码箱', icon: '🔐' },
  { id: 'sensor', label: '感应器', icon: '📡' },
  { id: 'door', label: '门', icon: '🚪' },
  { id: 'note', label: '纸条', icon: '📝' }
];

function DesignerView() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [escapeRoom, setEscapeRoom] = useState<EscapeRoom | null>(null);
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [tool, setTool] = useState<ToolType>('select');
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<any>(null);

  const currentRoom = escapeRoom?.rooms[currentRoomIndex];

  useEffect(() => {
    if (roomId) {
      loadRoom(roomId);
    } else {
      createNewRoom();
    }
  }, [roomId]);

  useEffect(() => {
    const newSocket = io('http://localhost:3002');
    setSocket(newSocket);
    return () => {
      newSocket.disconnect();
    };
  }, []);

  const loadRoom = async (id: string) => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/rooms/${id}`);
      setEscapeRoom(res.data);
    } catch (e) {
      console.error('Failed to load room:', e);
      alert('加载密室失败');
    }
    setLoading(false);
  };

  const createNewRoom = async () => {
    try {
      setLoading(true);
      const res = await axios.post('/api/rooms', { name: '我的密室', designerId: 'designer-1' });
      setEscapeRoom(res.data);
      navigate(`/designer/${res.data.id}`, { replace: true });
      
      const stored = localStorage.getItem('escapeRooms');
      const rooms = stored ? JSON.parse(stored) : [];
      rooms.push({ id: res.data.id, name: res.data.name });
      localStorage.setItem('escapeRooms', JSON.stringify(rooms));
    } catch (e) {
      console.error('Failed to create room:', e);
      alert('创建密室失败');
    }
    setLoading(false);
  };

  const handleToggleWall = async (x: number, y: number, visible: boolean) => {
    if (!escapeRoom || !currentRoom) return;
    
    try {
      await axios.post(
        `/api/rooms/${escapeRoom.id}/rooms/${currentRoom.id}/walls`,
        { x, y, visible }
      );
      
      const updatedRooms = [...escapeRoom.rooms];
      const room = updatedRooms[currentRoomIndex];
      const wallIndex = room.walls.findIndex(w => w.x === x && w.y === y);
      
      if (wallIndex !== -1) {
        updatedRooms[currentRoomIndex] = {
          ...room,
          walls: room.walls.map((w, i) => 
            i === wallIndex ? { ...w, visible } : w
          )
        };
      } else if (visible) {
        updatedRooms[currentRoomIndex] = {
          ...room,
          walls: [...room.walls, { x, y, visible: true }]
        };
      }
      
      setEscapeRoom({ ...escapeRoom, rooms: updatedRooms });
      socket?.emit('designer_update', { escapeRoomId: escapeRoom.id });
    } catch (e) {
      console.error('Failed to update wall:', e);
    }
  };

  const handleAddItem = async (type: ItemType, x: number, y: number) => {
    if (!escapeRoom || !currentRoom) return;
    
    const itemNames: Record<ItemType, string> = {
      key: '钥匙',
      safe: '密码箱',
      sensor: '感应器',
      door: '门',
      note: '神秘纸条'
    };

    try {
      const res = await axios.post(
        `/api/rooms/${escapeRoom.id}/rooms/${currentRoom.id}/items`,
        {
          type,
          name: itemNames[type],
          x,
          y,
          solved: false,
          collected: false,
          doorLocked: type === 'door'
        }
      );
      
      const updatedRooms = [...escapeRoom.rooms];
      updatedRooms[currentRoomIndex] = {
        ...updatedRooms[currentRoomIndex],
        items: [...updatedRooms[currentRoomIndex].items, res.data]
      };
      
      setEscapeRoom({ ...escapeRoom, rooms: updatedRooms });
      socket?.emit('designer_update', { escapeRoomId: escapeRoom.id });
    } catch (e) {
      console.error('Failed to add item:', e);
    }
  };

  const handleMoveItem = async (itemId: string, x: number, y: number) => {
    if (!escapeRoom || !currentRoom) return;
    
    try {
      await axios.put(
        `/api/rooms/${escapeRoom.id}/rooms/${currentRoom.id}/items/${itemId}`,
        { x, y }
      );
      
      const updatedRooms = [...escapeRoom.rooms];
      updatedRooms[currentRoomIndex] = {
        ...updatedRooms[currentRoomIndex],
        items: updatedRooms[currentRoomIndex].items.map(item =>
          item.id === itemId ? { ...item, x, y } : item
        )
      };
      
      setEscapeRoom({ ...escapeRoom, rooms: updatedRooms });
      
      if (selectedItem?.id === itemId) {
        setSelectedItem({ ...selectedItem, x, y });
      }
      socket?.emit('designer_update', { escapeRoomId: escapeRoom.id });
    } catch (e) {
      console.error('Failed to move item:', e);
    }
  };

  const handleUpdateItem = async (updates: Partial<Item>) => {
    if (!escapeRoom || !currentRoom || !selectedItem) return;
    
    try {
      await axios.put(
        `/api/rooms/${escapeRoom.id}/rooms/${currentRoom.id}/items/${selectedItem.id}`,
        updates
      );
      
      const updatedItem = { ...selectedItem, ...updates };
      const updatedRooms = [...escapeRoom.rooms];
      updatedRooms[currentRoomIndex] = {
        ...updatedRooms[currentRoomIndex],
        items: updatedRooms[currentRoomIndex].items.map(item =>
          item.id === selectedItem.id ? updatedItem : item
        )
      };
      
      setEscapeRoom({ ...escapeRoom, rooms: updatedRooms });
      setSelectedItem(updatedItem);
      socket?.emit('designer_update', { escapeRoomId: escapeRoom.id });
    } catch (e) {
      console.error('Failed to update item:', e);
    }
  };

  const handleDeleteItem = async () => {
    if (!escapeRoom || !currentRoom || !selectedItem) return;
    
    if (!confirm(`确定要删除「${selectedItem.name}」吗？`)) return;
    
    try {
      await axios.delete(
        `/api/rooms/${escapeRoom.id}/rooms/${currentRoom.id}/items/${selectedItem.id}`
      );
      
      const updatedRooms = [...escapeRoom.rooms];
      updatedRooms[currentRoomIndex] = {
        ...updatedRooms[currentRoomIndex],
        items: updatedRooms[currentRoomIndex].items.filter(item => item.id !== selectedItem.id)
      };
      
      setEscapeRoom({ ...escapeRoom, rooms: updatedRooms });
      setSelectedItem(null);
      socket?.emit('designer_update', { escapeRoomId: escapeRoom.id });
    } catch (e) {
      console.error('Failed to delete item:', e);
    }
  };

  const handleSelectItem = (item: Item | null) => {
    if (item) {
      setSelectedItem(item);
      setTool('select');
    } else {
      setSelectedItem(null);
    }
  };

  const addRoom = async () => {
    if (!escapeRoom) return;
    if (escapeRoom.rooms.length >= 3) {
      alert('最多只能添加3个房间');
      return;
    }
    
    try {
      const res = await axios.post(`/api/rooms/${escapeRoom.id}/rooms`, {
        name: `房间 ${escapeRoom.rooms.length + 1}`
      });
      
      setEscapeRoom({
        ...escapeRoom,
        rooms: [...escapeRoom.rooms, res.data]
      });
      setCurrentRoomIndex(escapeRoom.rooms.length);
    } catch (e) {
      console.error('Failed to add room:', e);
      alert('添加房间失败');
    }
  };

  const switchRoom = (index: number) => {
    setCurrentRoomIndex(index);
    setSelectedItem(null);
  };

  const handleSelectItemById = (item: Item) => {
    setSelectedItem(item);
    setTool('select');
  };

  if (loading) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a'
      }}>
        <div style={{ color: '#94a3b8', fontSize: '18px' }}>加载中...</div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: '#0f172a'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        backgroundColor: '#1e293b',
        borderBottom: '1px solid #334155'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '6px 12px',
              backgroundColor: '#334155',
              color: '#f1f5f9',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            ← 返回
          </button>
          <h1 style={{ color: '#f97316', fontSize: '20px' }}>
            🔐 密室设计师
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => {
              if (escapeRoom) {
                localStorage.setItem('lastRoomId', escapeRoom.id);
                navigate(`/play/${escapeRoom.id}-demo`);
              }
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#22c55e',
              color: 'white',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            ▶ 预览游戏
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{
          width: '70px',
          backgroundColor: '#1e293b',
          borderRight: '1px solid #334155',
          padding: '12px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {tools.map(t => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              style={{
                padding: '10px 6px',
                backgroundColor: tool === t.id ? '#f97316' : '#334155',
                color: 'white',
                borderRadius: '8px',
                fontSize: '11px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span style={{ fontSize: '20px' }}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
          
          <div style={{
            height: '1px',
            backgroundColor: '#334155',
            margin: '8px 0'
          }} />
          
          <div style={{
            padding: '8px 4px',
            color: '#94a3b8',
            fontSize: '11px',
            textAlign: 'center'
          }}>
            房间
          </div>
          
          {escapeRoom?.rooms.map((room, i) => (
            <button
              key={room.id}
              onClick={() => switchRoom(i)}
              style={{
                padding: '8px 6px',
                backgroundColor: currentRoomIndex === i ? '#f97316' : '#334155',
                color: 'white',
                borderRadius: '6px',
                fontSize: '11px'
              }}
            >
              {room.name}
            </button>
          ))}
          
          {escapeRoom && escapeRoom.rooms.length < 3 && (
            <button
              onClick={addRoom}
              style={{
                padding: '8px 6px',
                backgroundColor: 'transparent',
                color: '#94a3b8',
                border: '1px dashed #475569',
                borderRadius: '6px',
                fontSize: '11px'
              }}
            >
              + 添加
            </button>
          )}
        </div>

        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '30px',
          overflow: 'auto',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#64748b',
            fontSize: '13px'
          }}>
            {tool === 'wall' && '点击或拖拽放置墙壁'}
            {tool === 'erase' && '点击或拖拽擦除墙壁'}
            {tool === 'select' && '点击选择道具，拖拽移动位置'}
            {tools.find(t => t.id === tool)?.type === 'item' && '点击地面放置道具'}
            {(['key', 'safe', 'sensor', 'door', 'note'] as ItemType[]).includes(tool as ItemType) && 
              `点击地面放置${tools.find(t => t.id === tool)?.label}`
            }
          </div>
          
          {currentRoom && (
            <GridEditor
              room={currentRoom}
              selectedItemId={selectedItem?.id || null}
              onSelectItem={handleSelectItem}
              onToggleWall={handleToggleWall}
              onMoveItem={handleMoveItem}
              tool={tool}
              onAddItem={handleAddItem}
            />
          )}
        </div>

        {currentRoom && (
          <PropertyPanel
            item={selectedItem}
            isOpen={!!selectedItem}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
            roomItems={currentRoom.items}
          />
        )}
      </div>
    </div>
  );
}

export default DesignerView;
