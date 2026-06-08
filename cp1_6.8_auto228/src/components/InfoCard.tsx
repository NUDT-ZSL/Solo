import { useState, useEffect, useCallback, useRef } from 'react';

const QUOTES = [
  { text: '生活中唯一真正的失败，是不敢去尝试。', author: '乔治·克鲁尼' },
  { text: '光在黑暗中更显耀眼。', author: '未知' },
  { text: '每一个不曾起舞的日子，都是对生命的辜负。', author: '尼采' },
  { text: '宇宙不仅比我们想象的更奇怪，而且比我们能想象的更奇怪。', author: '海森堡' },
  { text: '简单是终极的复杂。', author: '达·芬奇' },
  { text: '想象力比知识更重要。', author: '爱因斯坦' },
  { text: '世界是一本书，不旅行的人只读了其中一页。', author: '奥古斯丁' },
  { text: '当你凝视深渊时，深渊也在凝视你。', author: '尼采' },
  { text: '万物皆有裂痕，那是光照进来的地方。', author: '莱昂纳德·科恩' },
  { text: '真正的发现之旅不在于寻找新风景，而在于拥有新眼光。', author: '普鲁斯特' },
  { text: '你无法在回顾中串联起生命中的点滴，只能在展望中将其连接。', author: '乔布斯' },
  { text: '我们都在阴沟里，但仍有人仰望星空。', author: '王尔德' },
  { text: '星辰不问赶路人，时光不负有心人。', author: '未知' },
  { text: '最好的时间永远是现在。', author: '未知' },
  { text: '一个人知道自己为什么而活，就可以忍受任何一种生活。', author: '尼采' },
];

interface InfoCardProps {
  trigger: number;
  triggerX: number;
  triggerY: number;
}

export default function InfoCard({ trigger, triggerX, triggerY }: InfoCardProps) {
  const [visible, setVisible] = useState(false);
  const [quote, setQuote] = useState(QUOTES[0]);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const lastIdxRef = useRef(-1);

  const pickQuote = useCallback(() => {
    let idx: number;
    do {
      idx = Math.floor(Math.random() * QUOTES.length);
    } while (idx === lastIdxRef.current && QUOTES.length > 1);
    lastIdxRef.current = idx;
    return QUOTES[idx];
  }, []);

  useEffect(() => {
    if (trigger === 0) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    const newQuote = pickQuote();
    setQuote(newQuote);
    setVisible(true);

    timerRef.current = setTimeout(() => {
      setVisible(false);
    }, 2800);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [trigger, pickQuote]);

  const cardStyle: React.CSSProperties = {
    top: Math.min(triggerY, window.innerHeight - 160),
    left: Math.min(Math.max(triggerX, 220), window.innerWidth - 220),
    transform: `translate(-50%, -50%) scale(${visible ? 1 : 0.8})`,
  };

  return (
    <div
      className={`info-card-wrapper ${visible ? 'visible' : ''}`}
      style={cardStyle}
    >
      <div className="info-card">
        <p className="quote-text">「{quote.text}」</p>
        <p className="quote-author">—— {quote.author}</p>
      </div>
    </div>
  );
}
