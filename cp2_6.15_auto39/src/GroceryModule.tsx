import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import type { GroceryItem } from './types';

export default function GroceryModule() {
  const [params] = useSearchParams();
  const listIdParam = params.get('listId') || '';
  const [listId, setListId] = useState(listIdParam);
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [connected, setConnected] = useState(false);
  const [peerModified, setPeerModified] = useState<Set<string>>(new Set());
  const [peerOutline, setPeerOutline] = useState<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!listId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//localhost:3001`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: 'join', listId }));
    };

    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'init') {
          setItems(msg.items || []);
        } else if (msg.type === 'peer-update' && msg.itemId) {
          setItems((prev) =>
            prev.map((it) =>
              it.id === msg.itemId ? { ...it, ...msg.changes } : it,
            ),
          );
          flashPeerItem(msg.itemId);
        } else if (msg.type === 'peer-toggle' && msg.itemId !== undefined) {
          setItems((prev) =>
            prev.map((it) =>
              it.id === msg.itemId ? { ...it, checked: msg.checked } : it,
            ),
          );
          flashPeerItem(msg.itemId);
        }
      } catch (e) {
        console.error('WS parse error', e);
      }
    };

    return () => {
      ws.close();
    };
  }, [listId]);

  const flashPeerItem = (itemId: string) => {
    setPeerModified((prev) => new Set(prev).add(itemId));
    setPeerOutline((prev) => new Set(prev).add(itemId));
    setTimeout(() => {
      setPeerModified((prev) => {
        const n = new Set(prev);
        n.delete(itemId);
        return n;
      });
    }, 300);
    setTimeout(() => {
      setPeerOutline((prev) => {
        const n = new Set(prev);
        n.delete(itemId);
        return n;
      });
    }, 1500);
  };

  const sendUpdate = (itemId: string, changes: Partial<GroceryItem>) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'item-update', listId, itemId, changes }));
  };

  const sendToggle = (itemId: string, checked: boolean) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'item-toggle', listId, itemId, checked }));
  };

  const handleToggle = (itemId: string, checked: boolean) => {
    setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, checked } : it)));
    sendToggle(itemId, checked);
  };

  const handleQuantityChange = (itemId: string, val: string) => {
    const qty = Number(val) || 0;
    setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, quantity: qty } : it)));
    sendUpdate(itemId, { quantity: qty });
  };

  const handlePriceChange = (itemId: string, val: string) => {
    const price = Number(val) || 0;
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, pricePerUnit: price } : it)),
    );
    sendUpdate(itemId, { pricePerUnit: price });
  };

  const handleNoteChange = (itemId: string, val: string) => {
    setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, note: val } : it)));
    sendUpdate(itemId, { note: val });
  };

  const grouped = useMemo(() => {
    const groups: Record<string, GroceryItem[]> = {};
    items.forEach((it) => {
      const cat = it.category || '其他';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(it);
    });
    return groups;
  }, [items]);

  const total = useMemo(() => {
    return items
      .reduce((sum, it) => sum + (it.quantity || 0) * (it.pricePerUnit || 0), 0)
      .toFixed(2);
  }, [items]);

  const shareUrl = `${window.location.origin}${window.location.pathname}?listId=${listId}`;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">协同购物清单</div>
        <div className="page-subtitle">多人实时同步，轻松管理采购</div>
      </div>

      <Link to="/" className="back-link">← 返回菜谱列表</Link>

      {!listId || items.length === 0 ? (
        <div className="empty-state">
          <h3>暂无购物清单</h3>
          <p>请先在菜谱列表中选择菜谱并生成购物清单</p>
          <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
            {!listId && (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  placeholder="输入已有清单ID"
                  className="grocery-input"
                  style={{ width: 200 }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setListId((e.target as HTMLInputElement).value.trim());
                    }
                  }}
                />
                <button className="btn" onClick={(e) => {
                  const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                  if (input.value.trim()) setListId(input.value.trim());
                }}>加入清单</button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="share-section">
            <span
              className={
                'connection-status ' + (connected ? 'connected' : 'disconnected')
              }
            >
              <span className="status-dot" />
              {connected ? '已连接' : '未连接'}
            </span>
            <label>分享链接：</label>
            <input value={shareUrl} readOnly />
            <button
              className="btn btn-secondary"
              onClick={() => {
                navigator.clipboard?.writeText(shareUrl);
              }}
            >
              复制
            </button>
          </div>

          <div className="grocery-list">
            {Object.entries(grouped).map(([category, catItems]) => (
              <div key={category} className="category-group">
                <span className={'category-title ' + (category in { 蔬菜: 1, 肉类: 1, 调料: 1, 蛋类: 1 } ? category : '其他')}>
                  {category}
                </span>
                {catItems.map((item) => {
                  const classes = ['grocery-item'];
                  if (item.checked) classes.push('checked');
                  if (peerModified.has(item.id)) classes.push('peer-modified');
                  if (peerOutline.has(item.id)) classes.push('peer-outline');
                  return (
                    <div key={item.id} className={classes.join(' ')}>
                      <input
                        type="checkbox"
                        className="grocery-checkbox"
                        checked={item.checked}
                        onChange={(e) => handleToggle(item.id, e.target.checked)}
                      />
                      <span className="grocery-name">{item.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          type="number"
                          className="grocery-input"
                          value={item.quantity}
                          step="0.01"
                          onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                        />
                        <span style={{ fontSize: 12, color: '#888' }}>{item.unit}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 12, color: '#888' }}>¥</span>
                        <input
                          type="number"
                          className="grocery-input"
                          value={item.pricePerUnit}
                          step="0.1"
                          onChange={(e) => handlePriceChange(item.id, e.target.value)}
                          placeholder="单价"
                        />
                      </div>
                      <input
                        type="text"
                        className="grocery-input"
                        value={item.note || ''}
                        placeholder="备注"
                        onChange={(e) => handleNoteChange(item.id, e.target.value)}
                      />
                    </div>
                  );
                })}
              </div>
            ))}

            <div className="grocery-total-row">
              <span className="grocery-total-label">合计：</span>
              <span className="grocery-total-value">¥ {total}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
