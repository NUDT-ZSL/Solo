import assert from 'assert';
import {
  createDeck,
  shuffleDeck,
  dealHands,
  evaluateHand,
  compareHands,
  determineWinners,
  HAND_RANKS,
} from '../server/gameLogic.js';

function runTests() {
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`✓ ${name}`);
      passed++;
    } catch (error) {
      console.log(`✗ ${name}`);
      console.log(`  Error: ${error.message}`);
      failed++;
    }
  }

  function expect(actual) {
    return {
      toBe(expected) {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, but got ${actual}`);
        }
      },
      toEqual(expected) {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
        }
      },
      toBeGreaterThan(expected) {
        if (actual <= expected) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`);
        }
      },
      toBeLessThan(expected) {
        if (actual >= expected) {
          throw new Error(`Expected ${actual} to be less than ${expected}`);
        }
      },
      toBeTruthy() {
        if (!actual) {
          throw new Error(`Expected truthy, but got ${actual}`);
        }
      },
      toBeFalsy() {
        if (actual) {
          throw new Error(`Expected falsy, but got ${actual}`);
        }
      },
      toHaveLength(length) {
        if (actual.length !== length) {
          throw new Error(`Expected length ${length}, but got ${actual.length}`);
        }
      },
      toContain(item) {
        if (!actual.includes(item)) {
          throw new Error(`Expected array to contain ${item}`);
        }
      },
    };
  }

  function makeCard(rank, suit) {
    return { id: `${rank}-${suit}`, rank, suit };
  }

  // ========== 洗牌测试 ==========

  test('createDeck - 应该创建52张牌', () => {
    const deck = createDeck();
    expect(deck.length).toBe(52);
  });

  test('createDeck - 应该包含4种花色', () => {
    const deck = createDeck();
    const suits = new Set(deck.map((c) => c.suit));
    expect(suits.size).toBe(4);
    expect(suits.has('hearts')).toBeTruthy();
    expect(suits.has('diamonds')).toBeTruthy();
    expect(suits.has('clubs')).toBeTruthy();
    expect(suits.has('spades')).toBeTruthy();
  });

  test('createDeck - 每种花色应该有13张牌', () => {
    const deck = createDeck();
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    suits.forEach((suit) => {
      const suitCards = deck.filter((c) => c.suit === suit);
      expect(suitCards.length).toBe(13);
    });
  });

  test('shuffleDeck - 应该打乱牌的顺序', () => {
    const deck = createDeck();
    const originalOrder = deck.map((c) => c.id).join(',');
    const shuffled = shuffleDeck(deck);
    const shuffledOrder = shuffled.map((c) => c.id).join(',');
    expect(shuffled.length).toBe(52);
    expect(originalOrder === shuffledOrder).toBeFalsy();
  });

  test('shuffleDeck - 不应该改变原数组', () => {
    const deck = createDeck();
    const originalIds = deck.map((c) => c.id);
    shuffleDeck(deck);
    const afterIds = deck.map((c) => c.id);
    expect(originalIds.join(',') === afterIds.join(',')).toBeTruthy();
  });

  // ========== 发牌测试 ==========

  test('dealHands - 应该给每位玩家发2张牌', () => {
    const deck = createDeck();
    const players = [
      { id: '1', hand: [] },
      { id: '2', hand: [] },
      { id: '3', hand: [] },
    ];
    const result = dealHands(players, deck);
    expect(result.players.length).toBe(3);
    result.players.forEach((p) => {
      expect(p.hand.length).toBe(2);
    });
  });

  test('dealHands - 发牌后牌堆应该减少', () => {
    const deck = createDeck();
    const players = [
      { id: '1', hand: [] },
      { id: '2', hand: [] },
    ];
    const result = dealHands(players, deck);
    expect(result.deck.length).toBe(52 - 4);
  });

  test('dealHands - 不应该有重复的牌', () => {
    const deck = createDeck();
    const players = [
      { id: '1', hand: [] },
      { id: '2', hand: [] },
      { id: '3', hand: [] },
      { id: '4', hand: [] },
    ];
    const result = dealHands(players, deck);
    const allCards = [];
    result.players.forEach((p) => allCards.push(...p.hand));
    allCards.push(...result.deck);
    const uniqueIds = new Set(allCards.map((c) => c.id));
    expect(uniqueIds.size).toBe(52);
  });

  // ========== 牌型评估测试 ==========

  test('evaluateHand - 高牌', () => {
    const cards = [
      makeCard(2, 'hearts'),
      makeCard(5, 'diamonds'),
      makeCard(8, 'clubs'),
      makeCard(10, 'spades'),
      makeCard(14, 'hearts'),
    ];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(HAND_RANKS.HIGH_CARD);
    expect(result.name).toBe('高牌');
    expect(result.highCards[0]).toBe(14);
  });

  test('evaluateHand - 一对', () => {
    const cards = [
      makeCard(10, 'hearts'),
      makeCard(10, 'diamonds'),
      makeCard(2, 'clubs'),
      makeCard(5, 'spades'),
      makeCard(8, 'hearts'),
    ];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(HAND_RANKS.PAIR);
    expect(result.name).toBe('一对');
    expect(result.highCards[0]).toBe(10);
  });

  test('evaluateHand - 两对', () => {
    const cards = [
      makeCard(10, 'hearts'),
      makeCard(10, 'diamonds'),
      makeCard(5, 'clubs'),
      makeCard(5, 'spades'),
      makeCard(8, 'hearts'),
    ];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(HAND_RANKS.TWO_PAIR);
    expect(result.name).toBe('两对');
    expect(result.highCards[0]).toBe(10);
    expect(result.highCards[1]).toBe(5);
  });

  test('evaluateHand - 三条', () => {
    const cards = [
      makeCard(10, 'hearts'),
      makeCard(10, 'diamonds'),
      makeCard(10, 'clubs'),
      makeCard(5, 'spades'),
      makeCard(8, 'hearts'),
    ];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(HAND_RANKS.THREE_OF_A_KIND);
    expect(result.name).toBe('三条');
    expect(result.highCards[0]).toBe(10);
  });

  test('evaluateHand - 顺子', () => {
    const cards = [
      makeCard(5, 'hearts'),
      makeCard(6, 'diamonds'),
      makeCard(7, 'clubs'),
      makeCard(8, 'spades'),
      makeCard(9, 'hearts'),
    ];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(HAND_RANKS.STRAIGHT);
    expect(result.name).toBe('顺子');
    expect(result.highCards[0]).toBe(9);
  });

  test('evaluateHand - 顺子 (A2345)', () => {
    const cards = [
      makeCard(14, 'hearts'),
      makeCard(2, 'diamonds'),
      makeCard(3, 'clubs'),
      makeCard(4, 'spades'),
      makeCard(5, 'hearts'),
    ];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(HAND_RANKS.STRAIGHT);
    expect(result.name).toBe('顺子');
    expect(result.highCards[0]).toBe(5);
  });

  test('evaluateHand - 同花', () => {
    const cards = [
      makeCard(2, 'hearts'),
      makeCard(5, 'hearts'),
      makeCard(8, 'hearts'),
      makeCard(10, 'hearts'),
      makeCard(12, 'hearts'),
    ];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(HAND_RANKS.FLUSH);
    expect(result.name).toBe('同花');
  });

  test('evaluateHand - 葫芦', () => {
    const cards = [
      makeCard(10, 'hearts'),
      makeCard(10, 'diamonds'),
      makeCard(10, 'clubs'),
      makeCard(5, 'spades'),
      makeCard(5, 'hearts'),
    ];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(HAND_RANKS.FULL_HOUSE);
    expect(result.name).toBe('葫芦');
    expect(result.highCards[0]).toBe(10);
    expect(result.highCards[1]).toBe(5);
  });

  test('evaluateHand - 四条', () => {
    const cards = [
      makeCard(10, 'hearts'),
      makeCard(10, 'diamonds'),
      makeCard(10, 'clubs'),
      makeCard(10, 'spades'),
      makeCard(5, 'hearts'),
    ];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(HAND_RANKS.FOUR_OF_A_KIND);
    expect(result.name).toBe('四条');
    expect(result.highCards[0]).toBe(10);
  });

  test('evaluateHand - 同花顺', () => {
    const cards = [
      makeCard(5, 'hearts'),
      makeCard(6, 'hearts'),
      makeCard(7, 'hearts'),
      makeCard(8, 'hearts'),
      makeCard(9, 'hearts'),
    ];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(HAND_RANKS.STRAIGHT_FLUSH);
    expect(result.name).toBe('同花顺');
    expect(result.highCards[0]).toBe(9);
  });

  test('evaluateHand - 7张牌中取最好的5张 (一对)', () => {
    const cards = [
      makeCard(10, 'hearts'),
      makeCard(10, 'diamonds'),
      makeCard(2, 'clubs'),
      makeCard(5, 'spades'),
      makeCard(8, 'hearts'),
      makeCard(12, 'diamonds'),
      makeCard(14, 'clubs'),
    ];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(HAND_RANKS.PAIR);
    expect(result.highCards[0]).toBe(10);
  });

  test('evaluateHand - 7张牌中取最好的5张 (同花)', () => {
    const cards = [
      makeCard(2, 'hearts'),
      makeCard(5, 'hearts'),
      makeCard(8, 'hearts'),
      makeCard(10, 'hearts'),
      makeCard(12, 'hearts'),
      makeCard(3, 'diamonds'),
      makeCard(7, 'clubs'),
    ];
    const result = evaluateHand(cards);
    expect(result.rank).toBe(HAND_RANKS.FLUSH);
  });

  // ========== 牌型比较测试 ==========

  test('compareHands - 一对 > 高牌', () => {
    const pairHand = evaluateHand([
      makeCard(10, 'hearts'),
      makeCard(10, 'diamonds'),
      makeCard(2, 'clubs'),
      makeCard(5, 'spades'),
      makeCard(8, 'hearts'),
    ]);
    const highCardHand = evaluateHand([
      makeCard(2, 'hearts'),
      makeCard(5, 'diamonds'),
      makeCard(8, 'clubs'),
      makeCard(10, 'spades'),
      makeCard(14, 'hearts'),
    ]);
    expect(compareHands(pairHand, highCardHand)).toBeGreaterThan(0);
  });

  test('compareHands - 葫芦 > 同花', () => {
    const fullHouse = evaluateHand([
      makeCard(10, 'hearts'),
      makeCard(10, 'diamonds'),
      makeCard(10, 'clubs'),
      makeCard(5, 'spades'),
      makeCard(5, 'hearts'),
    ]);
    const flush = evaluateHand([
      makeCard(2, 'hearts'),
      makeCard(5, 'hearts'),
      makeCard(8, 'hearts'),
      makeCard(10, 'hearts'),
      makeCard(12, 'hearts'),
    ]);
    expect(compareHands(fullHouse, flush)).toBeGreaterThan(0);
  });

  test('compareHands - 同花顺 > 四条', () => {
    const straightFlush = evaluateHand([
      makeCard(5, 'hearts'),
      makeCard(6, 'hearts'),
      makeCard(7, 'hearts'),
      makeCard(8, 'hearts'),
      makeCard(9, 'hearts'),
    ]);
    const fourKind = evaluateHand([
      makeCard(10, 'hearts'),
      makeCard(10, 'diamonds'),
      makeCard(10, 'clubs'),
      makeCard(10, 'spades'),
      makeCard(5, 'hearts'),
    ]);
    expect(compareHands(straightFlush, fourKind)).toBeGreaterThan(0);
  });

  test('compareHands - 同牌型比较 (一对，对子大小)', () => {
    const pairOf10 = evaluateHand([
      makeCard(10, 'hearts'),
      makeCard(10, 'diamonds'),
      makeCard(2, 'clubs'),
      makeCard(5, 'spades'),
      makeCard(8, 'hearts'),
    ]);
    const pairOf8 = evaluateHand([
      makeCard(8, 'hearts'),
      makeCard(8, 'diamonds'),
      makeCard(2, 'clubs'),
      makeCard(5, 'spades'),
      makeCard(10, 'hearts'),
    ]);
    expect(compareHands(pairOf10, pairOf8)).toBeGreaterThan(0);
  });

  test('compareHands - 同牌型比较 (两对，大对子相同，小对子不同)', () => {
    const twoPairHigh = evaluateHand([
      makeCard(10, 'hearts'),
      makeCard(10, 'diamonds'),
      makeCard(7, 'clubs'),
      makeCard(7, 'spades'),
      makeCard(2, 'hearts'),
    ]);
    const twoPairLow = evaluateHand([
      makeCard(10, 'hearts'),
      makeCard(10, 'diamonds'),
      makeCard(5, 'clubs'),
      makeCard(5, 'spades'),
      makeCard(8, 'hearts'),
    ]);
    expect(compareHands(twoPairHigh, twoPairLow)).toBeGreaterThan(0);
  });

  test('compareHands - 同牌型比较 (高牌，逐张比较)', () => {
    const hand1 = evaluateHand([
      makeCard(14, 'hearts'),
      makeCard(10, 'diamonds'),
      makeCard(8, 'clubs'),
      makeCard(5, 'spades'),
      makeCard(2, 'hearts'),
    ]);
    const hand2 = evaluateHand([
      makeCard(14, 'hearts'),
      makeCard(10, 'diamonds'),
      makeCard(7, 'clubs'),
      makeCard(5, 'spades'),
      makeCard(3, 'hearts'),
    ]);
    expect(compareHands(hand1, hand2)).toBeGreaterThan(0);
  });

  test('compareHands - 完全相同的牌返回0', () => {
    const hand1 = evaluateHand([
      makeCard(10, 'hearts'),
      makeCard(10, 'diamonds'),
      makeCard(2, 'clubs'),
      makeCard(5, 'spades'),
      makeCard(8, 'hearts'),
    ]);
    const hand2 = evaluateHand([
      makeCard(10, 'clubs'),
      makeCard(10, 'spades'),
      makeCard(2, 'diamonds'),
      makeCard(5, 'hearts'),
      makeCard(8, 'clubs'),
    ]);
    expect(compareHands(hand1, hand2)).toBe(0);
  });

  // ========== 赢家判定测试 ==========

  test('determineWinners - 单赢家', () => {
    const players = [
      {
        id: '1',
        hand: [makeCard(10, 'hearts'), makeCard(10, 'diamonds')],
        isFolded: false,
      },
      {
        id: '2',
        hand: [makeCard(2, 'hearts'), makeCard(5, 'diamonds')],
        isFolded: false,
      },
    ];
    const communityCards = [
      makeCard(3, 'clubs'),
      makeCard(7, 'spades'),
      makeCard(9, 'hearts'),
    ];
    const winners = determineWinners(players, communityCards);
    expect(winners.length).toBe(1);
    expect(winners[0].id).toBe('1');
  });

  test('determineWinners - 已弃牌玩家不能赢', () => {
    const players = [
      {
        id: '1',
        hand: [makeCard(14, 'hearts'), makeCard(14, 'diamonds')],
        isFolded: true,
      },
      {
        id: '2',
        hand: [makeCard(2, 'hearts'), makeCard(5, 'diamonds')],
        isFolded: false,
      },
    ];
    const communityCards = [
      makeCard(3, 'clubs'),
      makeCard(7, 'spades'),
      makeCard(9, 'hearts'),
    ];
    const winners = determineWinners(players, communityCards);
    expect(winners.length).toBe(1);
    expect(winners[0].id).toBe('2');
  });

  test('determineWinners - 平局', () => {
    const players = [
      {
        id: '1',
        hand: [makeCard(10, 'hearts'), makeCard(5, 'diamonds')],
        isFolded: false,
      },
      {
        id: '2',
        hand: [makeCard(10, 'clubs'), makeCard(5, 'spades')],
        isFolded: false,
      },
    ];
    const communityCards = [
      makeCard(2, 'clubs'),
      makeCard(7, 'spades'),
      makeCard(9, 'hearts'),
    ];
    const winners = determineWinners(players, communityCards);
    expect(winners.length).toBe(2);
  });

  // ========== 牌型排序测试 ==========

  test('牌型从大到小排序正确', () => {
    const hands = [
      { name: '高牌', rank: HAND_RANKS.HIGH_CARD },
      { name: '一对', rank: HAND_RANKS.PAIR },
      { name: '两对', rank: HAND_RANKS.TWO_PAIR },
      { name: '三条', rank: HAND_RANKS.THREE_OF_A_KIND },
      { name: '顺子', rank: HAND_RANKS.STRAIGHT },
      { name: '同花', rank: HAND_RANKS.FLUSH },
      { name: '葫芦', rank: HAND_RANKS.FULL_HOUSE },
      { name: '四条', rank: HAND_RANKS.FOUR_OF_A_KIND },
      { name: '同花顺', rank: HAND_RANKS.STRAIGHT_FLUSH },
    ];

    for (let i = 0; i < hands.length - 1; i++) {
      expect(hands[i + 1].rank).toBeGreaterThan(hands[i].rank);
    }
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  return failed === 0;
}

const success = runTests();
process.exit(success ? 0 : 1);
