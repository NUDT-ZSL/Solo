import { useState, useEffect, useCallback, useRef } from 'react';
import CardEditor from './card-module/CardEditor';
import CardPreview from './card-module/CardPreview';
import {
  Card,
  ValidationErrors,
  validateCard,
  createCard,
  PRESET_CARDS,
  STORAGE_KEYS
} from './card-module/CardData';
import BattleUI from './combat-module/BattleUI';
import {
  simulateBattle,
  BattleResult
} from './combat-module/CardCombat';
import VersionHistory, {
  VersionSnapshot
} from './history-module/VersionHistory';

export default function App() {
  const [card, setCard] = useState<Partial<Card>>({
    name: '',
    cost: 0,
    attack: 0,
    health: 0
  });
  const [savedCard, setSavedCard] = useState<Card | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  const [selectedEnemyId, setSelectedEnemyId] = useState<string>(
    PRESET_CARDS[0].id
  );
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<VersionSnapshot | null>(
    null
  );

  const originalCardRef = useRef<Partial<Card>>({
    name: '',
    cost: 0,
    attack: 0,
    health: 0
  });
  const isFirstSaveRef = useRef(true);

  useEffect(() => {
    const storedCard = localStorage.getItem(STORAGE_KEYS.CURRENT_CARD);
    if (storedCard) {
      try {
        const parsed = JSON.parse(storedCard) as Card;
        setCard(parsed);
        setSavedCard(parsed);
        originalCardRef.current = { ...parsed };
        isFirstSaveRef.current = false;
      } catch (e) {
        console.error('加载当前卡牌失败:', e);
      }
    }
  }, []);

  const hasUnsavedChanges = useCallback(() => {
    const orig = originalCardRef.current;
    return (
      card.name !== orig.name ||
      card.cost !== orig.cost ||
      card.attack !== orig.attack ||
      card.health !== orig.health
    );
  }, [card]);

  const saveCard = useCallback(() => {
    const errors: ValidationErrors = validateCard(card);
    if (Object.keys(errors).length > 0) {
      setSavedMessage(null);
      return;
    }

    const newCard = createCard(
      card.name!,
      card.cost!,
      card.attack!,
      card.health!
    );

    localStorage.setItem(STORAGE_KEYS.CURRENT_CARD, JSON.stringify(newCard));
    setSavedCard(newCard);
    originalCardRef.current = { ...newCard };
    isFirstSaveRef.current = false;

    const snapshot: VersionSnapshot = {
      id: `snap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      card: { ...newCard },
      label: newCard.name
    };

    try {
      const existing = localStorage.getItem(STORAGE_KEYS.VERSION_HISTORY);
      const history: VersionSnapshot[] = existing ? JSON.parse(existing) : [];
      history.push(snapshot);
      if (history.length > 50) {
        history.splice(0, history.length - 50);
      }
      localStorage.setItem(
        STORAGE_KEYS.VERSION_HISTORY,
        JSON.stringify(history)
      );
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.error('保存版本历史失败:', e);
    }

    setSavedMessage(`✅ 保存成功！卡牌「${newCard.name}」已保存`);
    setTimeout(() => setSavedMessage(null), 3000);
  }, [card]);

  const startBattle = useCallback(() => {
    const errors: ValidationErrors = validateCard(card);
    if (Object.keys(errors).length > 0) {
      return;
    }

    const playerCard = createCard(
      card.name!,
      card.cost!,
      card.attack!,
      card.health!
    );

    const enemyCard =
      PRESET_CARDS.find((e) => e.id === selectedEnemyId) || PRESET_CARDS[0];

    const result = simulateBattle(playerCard, enemyCard);
    setBattleResult(result);
  }, [card, selectedEnemyId]);

  const handleRestoreRequest = useCallback((snapshot: VersionSnapshot) => {
    setPendingRestore(snapshot);
    setShowConfirmDialog(true);
  }, []);

  const handleCancelRestore = useCallback(() => {
    setShowConfirmDialog(false);
    setPendingRestore(null);
  }, []);

  const handleConfirmDiscard = useCallback(() => {
    if (pendingRestore) {
      const snapCard = pendingRestore.card;
      setCard(snapCard);
      originalCardRef.current = { ...snapCard };

      const timeStr = new Date(pendingRestore.timestamp).toLocaleString(
        'zh-CN',
        {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }
      );
      setRestoreMessage(
        `已恢复至 ${timeStr} 保存的版本「${snapCard.name || '未命名'}」`
      );
      setTimeout(() => setRestoreMessage(null), 4000);

      if (snapCard.name && snapCard.cost !== undefined) {
        const fullCard: Card = {
          id: `restored-${pendingRestore.id}`,
          name: snapCard.name,
          cost: snapCard.cost,
          attack: snapCard.attack ?? 0,
          health: snapCard.health ?? 0
        };
        setSavedCard(fullCard);
        localStorage.setItem(
          STORAGE_KEYS.CURRENT_CARD,
          JSON.stringify(fullCard)
        );
      }
    }
    setShowConfirmDialog(false);
    setPendingRestore(null);
  }, [pendingRestore]);

  const handleCardChange = useCallback((newCard: Partial<Card>) => {
    setCard(newCard);
  }, []);

  const handleEnemyChange = useCallback((enemyId: string) => {
    setSelectedEnemyId(enemyId);
    setBattleResult(null);
  }, []);

  const displayCard: Partial<Card> = savedCard ?? card;
  const unsaved = hasUnsavedChanges();

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>🎴 卡牌编辑器 & 战斗预览</h1>
        <div style={styles.headerBadges}>
          {unsaved && (
            <span style={styles.unsavedBadge}>✏️ 未保存的修改</span>
          )}
        </div>
      </div>

      <div style={styles.layout}>
        <div style={styles.leftColumn}>
          <CardPreview card={displayCard} />
        </div>

        <div style={styles.divider} />

        <div style={styles.middleColumn}>
          <CardEditor
            card={card}
            onCardChange={handleCardChange}
            onSave={saveCard}
            onStartBattle={startBattle}
            savedMessage={savedMessage}
            restoreMessage={restoreMessage}
          />
        </div>

        <div style={styles.divider} />

        <div style={styles.rightColumn}>
          <BattleUI
            battleResult={battleResult}
            currentCard={displayCard}
            selectedEnemyId={selectedEnemyId}
            onEnemyChange={handleEnemyChange}
          />
          <VersionHistory
            hasUnsavedChanges={unsaved}
            onRestore={handleRestoreRequest}
            onCancelRestore={handleCancelRestore}
            pendingRestore={pendingRestore}
            showConfirmDialog={showConfirmDialog}
            onConfirmDiscard={handleConfirmDiscard}
          />
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#1A1A2E',
    color: '#E2E8F0',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    padding: '16px 32px',
    backgroundColor: '#16213E',
    borderBottom: '1px solid #334155',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  headerTitle: {
    margin: 0,
    fontSize: '22px',
    fontWeight: 700,
    color: '#FFFFFF'
  },
  headerBadges: {
    display: 'flex',
    gap: '8px'
  },
  unsavedBadge: {
    padding: '6px 14px',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    border: '1px solid #F59E0B',
    color: '#F59E0B',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600
  },
  layout: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    minHeight: 0
  },
  leftColumn: {
    width: '360px',
    minWidth: '360px',
    overflowY: 'auto',
    backgroundColor: '#16213E'
  },
  middleColumn: {
    width: '480px',
    minWidth: '480px',
    maxWidth: '480px',
    flexShrink: 0,
    overflowY: 'auto'
  },
  rightColumn: {
    width: '360px',
    minWidth: '360px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: '#16213E'
  },
  divider: {
    width: '1px',
    minWidth: '1px',
    backgroundColor: '#334155'
  }
};
