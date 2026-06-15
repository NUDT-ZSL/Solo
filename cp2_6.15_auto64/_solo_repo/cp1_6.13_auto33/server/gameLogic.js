import { v4 as uuidv4 } from 'uuid';

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

const HAND_RANKS = {
  HIGH_CARD: 0,
  PAIR: 1,
  TWO_PAIR: 2,
  THREE_OF_A_KIND: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  FOUR_OF_A_KIND: 7,
  STRAIGHT_FLUSH: 8,
};

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: uuidv4(),
        suit,
        rank,
      });
    }
  }
  return deck;
}

function shuffleDeck(deck) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function dealHands(players, deck) {
  const newDeck = [...deck];
  const updatedPlayers = players.map((player) => ({
    ...player,
    hand: [newDeck.pop(), newDeck.pop()],
  }));
  return { players: updatedPlayers, deck: newDeck };
}

function countRanks(cards) {
  const counts = {};
  for (const card of cards) {
    counts[card.rank] = (counts[card.rank] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([rank, count]) => ({ rank: parseInt(rank), count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);
}

function countSuits(cards) {
  const counts = {};
  for (const card of cards) {
    counts[card.suit] = (counts[card.suit] || 0) + 1;
  }
  return Object.entries(counts).map(([suit, count]) => ({ suit, count }));
}

function isStraight(ranks) {
  const sorted = [...new Set(ranks)].sort((a, b) => a - b);
  if (sorted.length < 5) return false;

  for (let i = 0; i <= sorted.length - 5; i++) {
    if (sorted[i + 4] - sorted[i] === 4) {
      return { isStraight: true, highCard: sorted[i + 4] };
    }
  }

  if (sorted.includes(14) && sorted.includes(2) && sorted.includes(3) && sorted.includes(4) && sorted.includes(5)) {
    return { isStraight: true, highCard: 5 };
  }

  return { isStraight: false };
}

function isFlush(cards) {
  const suitCounts = countSuits(cards);
  const flushSuit = suitCounts.find((s) => s.count >= 5);
  if (!flushSuit) return { isFlush: false };

  const flushCards = cards.filter((c) => c.suit === flushSuit.suit).sort((a, b) => b.rank - a.rank);
  return { isFlush: true, suit: flushSuit.suit, highCards: flushCards.slice(0, 5) };
}

function evaluateHand(cards) {
  const allCards = [...cards];
  const rankCounts = countRanks(allCards);
  const ranks = allCards.map((c) => c.rank);

  const flushResult = isFlush(allCards);
  const straightResult = isStraight(ranks);

  if (flushResult.isFlush && straightResult.isStraight) {
    const flushRanks = flushResult.highCards.map((c) => c.rank);
    const flushStraightResult = isStraight(flushRanks);
    if (flushStraightResult.isStraight) {
      return {
        rank: HAND_RANKS.STRAIGHT_FLUSH,
        name: '同花顺',
        highCards: [flushStraightResult.highCard],
      };
    }
  }

  if (rankCounts[0]?.count === 4) {
    const fourRank = rankCounts[0].rank;
    const kicker = rankCounts.find((r) => r.rank !== fourRank)?.rank || 0;
    return {
      rank: HAND_RANKS.FOUR_OF_A_KIND,
      name: '四条',
      highCards: [fourRank, kicker],
    };
  }

  if (rankCounts[0]?.count === 3 && rankCounts[1]?.count >= 2) {
    return {
      rank: HAND_RANKS.FULL_HOUSE,
      name: '葫芦',
      highCards: [rankCounts[0].rank, rankCounts[1].rank],
    };
  }

  if (flushResult.isFlush) {
    return {
      rank: HAND_RANKS.FLUSH,
      name: '同花',
      highCards: flushResult.highCards.map((c) => c.rank),
    };
  }

  if (straightResult.isStraight) {
    return {
      rank: HAND_RANKS.STRAIGHT,
      name: '顺子',
      highCards: [straightResult.highCard],
    };
  }

  if (rankCounts[0]?.count === 3) {
    const threeRank = rankCounts[0].rank;
    const kickers = rankCounts.filter((r) => r.rank !== threeRank).slice(0, 2).map((r) => r.rank);
    return {
      rank: HAND_RANKS.THREE_OF_A_KIND,
      name: '三条',
      highCards: [threeRank, ...kickers],
    };
  }

  if (rankCounts[0]?.count === 2 && rankCounts[1]?.count === 2) {
    const highPair = Math.max(rankCounts[0].rank, rankCounts[1].rank);
    const lowPair = Math.min(rankCounts[0].rank, rankCounts[1].rank);
    const kicker = rankCounts.find((r) => r.rank !== highPair && r.rank !== lowPair)?.rank || 0;
    return {
      rank: HAND_RANKS.TWO_PAIR,
      name: '两对',
      highCards: [highPair, lowPair, kicker],
    };
  }

  if (rankCounts[0]?.count === 2) {
    const pairRank = rankCounts[0].rank;
    const kickers = rankCounts.filter((r) => r.rank !== pairRank).slice(0, 3).map((r) => r.rank);
    return {
      rank: HAND_RANKS.PAIR,
      name: '一对',
      highCards: [pairRank, ...kickers],
    };
  }

  const sortedRanks = [...ranks].sort((a, b) => b - a).slice(0, 5);
  return {
    rank: HAND_RANKS.HIGH_CARD,
    name: '高牌',
    highCards: sortedRanks,
  };
}

function compareHands(hand1, hand2) {
  if (hand1.rank !== hand2.rank) {
    return hand1.rank - hand2.rank;
  }

  for (let i = 0; i < Math.max(hand1.highCards.length, hand2.highCards.length); i++) {
    const c1 = hand1.highCards[i] || 0;
    const c2 = hand2.highCards[i] || 0;
    if (c1 !== c2) return c1 - c2;
  }

  return 0;
}

function determineWinners(players, communityCards) {
  const activePlayers = players.filter((p) => !p.isFolded);

  if (activePlayers.length === 1) {
    return activePlayers;
  }

  const playerHands = activePlayers.map((player) => {
    const allCards = [...player.hand, ...communityCards];
    const evaluation = evaluateHand(allCards);
    return { player, evaluation };
  });

  playerHands.sort((a, b) => compareHands(b.evaluation, a.evaluation));

  const bestEvaluation = playerHands[0].evaluation;
  const winners = playerHands
    .filter((ph) => compareHands(ph.evaluation, bestEvaluation) === 0)
    .map((ph) => ph.player);

  return winners;
}

function createRoom() {
  return {
    id: uuidv4(),
    players: [],
    maxPlayers: 4,
    status: 'waiting',
    communityCards: [],
    pot: 0,
    currentBet: 0,
    currentPlayerIndex: 0,
    dealerIndex: 0,
    smallBlind: 10,
    bigBlind: 20,
    round: 'preflop',
    chipHistory: [],
    handNumber: 0,
    deck: [],
  };
}

function addPlayer(room, playerName, playerId) {
  if (room.players.length >= room.maxPlayers) {
    throw new Error('房间已满');
  }
  if (room.status !== 'waiting') {
    throw new Error('游戏已开始，无法加入');
  }

  const seat = room.players.length;
  const player = {
    id: playerId,
    name: playerName,
    seat,
    chips: 1000,
    hand: [],
    currentBet: 0,
    isFolded: false,
    isAllIn: false,
    isActive: true,
  };

  room.players.push(player);
  return player;
}

function removePlayer(room, playerId) {
  const index = room.players.findIndex((p) => p.id === playerId);
  if (index !== -1) {
    room.players.splice(index, 1);
    room.players.forEach((p, i) => {
      p.seat = i;
    });
  }
  return room;
}

function startGame(room) {
  if (room.players.length < 2) {
    throw new Error('至少需要2名玩家才能开始游戏');
  }

  room.status = 'playing';
  room.handNumber = 0;
  room.chipHistory = [];

  return initHand(room);
}

function initHand(room) {
  room.deck = shuffleDeck(createDeck());
  room.communityCards = [];
  room.pot = 0;
  room.currentBet = 0;
  room.round = 'preflop';
  room.handNumber++;

  room.players.forEach((player) => {
    if (player.chips > 0) {
      player.hand = [];
      player.currentBet = 0;
      player.isFolded = false;
      player.isAllIn = false;
      player.isActive = true;
    } else {
      player.isActive = false;
      player.isFolded = true;
    }
  });

  const activePlayers = room.players.filter((p) => p.isActive);
  if (activePlayers.length < 2) {
    room.status = 'finished';
    return room;
  }

  const numPlayers = room.players.length;
  room.dealerIndex = (room.dealerIndex + 1) % numPlayers;
  while (!room.players[room.dealerIndex].isActive) {
    room.dealerIndex = (room.dealerIndex + 1) % numPlayers;
  }

  const sbIndex = (room.dealerIndex + 1) % numPlayers;
  const bbIndex = (room.dealerIndex + 2) % numPlayers;

  const sbPlayer = room.players[sbIndex];
  const bbPlayer = room.players[bbIndex];

  const sbAmount = Math.min(room.smallBlind, sbPlayer.chips);
  const bbAmount = Math.min(room.bigBlind, bbPlayer.chips);

  sbPlayer.chips -= sbAmount;
  sbPlayer.currentBet = sbAmount;
  bbPlayer.chips -= bbAmount;
  bbPlayer.currentBet = bbAmount;

  room.pot = sbAmount + bbAmount;
  room.currentBet = bbAmount;

  const dealResult = dealHands(room.players, room.deck);
  room.players = dealResult.players;
  room.deck = dealResult.deck;

  room.currentPlayerIndex = (bbIndex + 1) % numPlayers;
  while (!room.players[room.currentPlayerIndex].isActive || room.players[room.currentPlayerIndex].isFolded) {
    room.currentPlayerIndex = (room.currentPlayerIndex + 1) % numPlayers;
  }

  const chipEntry = {
    handNumber: room.handNumber,
    players: {},
  };
  room.players.forEach((p) => {
    chipEntry.players[p.id] = p.chips;
  });
  room.chipHistory.push(chipEntry);

  return room;
}

function processBet(room, player, action, amount = 0) {
  const callAmount = room.currentBet - player.currentBet;

  switch (action) {
    case 'fold':
      player.isFolded = true;
      break;

    case 'call':
      const actualCallAmount = Math.min(callAmount, player.chips);
      player.chips -= actualCallAmount;
      player.currentBet += actualCallAmount;
      room.pot += actualCallAmount;
      if (player.chips === 0) {
        player.isAllIn = true;
      }
      break;

    case 'raise':
      const raiseAmount = Math.max(amount, room.currentBet * 2 - player.currentBet);
      const totalBet = player.currentBet + raiseAmount;
      const actualRaiseAmount = Math.min(raiseAmount, player.chips);
      player.chips -= actualRaiseAmount;
      player.currentBet += actualRaiseAmount;
      room.pot += actualRaiseAmount;
      room.currentBet = Math.max(room.currentBet, player.currentBet);
      if (player.chips === 0) {
        player.isAllIn = true;
      }
      break;

    case 'allin':
      const allInAmount = player.chips;
      player.chips = 0;
      player.currentBet += allInAmount;
      room.pot += allInAmount;
      player.isAllIn = true;
      room.currentBet = Math.max(room.currentBet, player.currentBet);
      break;
  }

  return room;
}

function isRoundComplete(room) {
  const activePlayers = room.players.filter((p) => p.isActive && !p.isFolded);

  if (activePlayers.length <= 1) {
    return true;
  }

  const allMatched = activePlayers.every((p) => p.currentBet === room.currentBet || p.isAllIn);
  const allActed = activePlayers.every((p) => p.currentBet > 0 || p.isAllIn || p.isFolded);

  return allMatched && allActed;
}

function advanceRound(room) {
  const activePlayers = room.players.filter((p) => p.isActive && !p.isFolded);

  if (activePlayers.length <= 1) {
    return finishHand(room);
  }

  if (room.round === 'preflop') {
    room.communityCards = [room.deck.pop(), room.deck.pop(), room.deck.pop()];
    room.round = 'flop';
  } else if (room.round === 'flop') {
    room.communityCards.push(room.deck.pop());
    room.round = 'turn';
  } else if (room.round === 'turn') {
    room.communityCards.push(room.deck.pop());
    room.round = 'river';
  } else if (room.round === 'river') {
    return finishHand(room);
  }

  room.currentBet = 0;
  room.players.forEach((p) => {
    p.currentBet = 0;
  });

  const numPlayers = room.players.length;
  room.currentPlayerIndex = (room.dealerIndex + 1) % numPlayers;
  while (!room.players[room.currentPlayerIndex].isActive || room.players[room.currentPlayerIndex].isFolded) {
    room.currentPlayerIndex = (room.currentPlayerIndex + 1) % numPlayers;
  }

  return room;
}

function finishHand(room) {
  const winners = determineWinners(room.players, room.communityCards);
  const potPerWinner = Math.floor(room.pot / winners.length);

  winners.forEach((winner) => {
    const player = room.players.find((p) => p.id === winner.id);
    if (player) {
      player.chips += potPerWinner;
    }
  });

  room.round = 'showdown';

  const chipEntry = {
    handNumber: room.handNumber,
    players: {},
  };
  room.players.forEach((p) => {
    chipEntry.players[p.id] = p.chips;
  });
  room.chipHistory[room.chipHistory.length - 1] = chipEntry;

  return { room, winners, pot: room.pot };
}

function advanceTurn(room) {
  const numPlayers = room.players.length;
  room.currentPlayerIndex = (room.currentPlayerIndex + 1) % numPlayers;

  let attempts = 0;
  while (
    (!room.players[room.currentPlayerIndex].isActive ||
      room.players[room.currentPlayerIndex].isFolded ||
      room.players[room.currentPlayerIndex].isAllIn) &&
    attempts < numPlayers
  ) {
    room.currentPlayerIndex = (room.currentPlayerIndex + 1) % numPlayers;
    attempts++;
  }

  return room;
}

function getPublicRoomState(room) {
  return {
    ...room,
    players: room.players.map((p) => ({
      ...p,
      hand: [],
    })),
    deck: undefined,
  };
}

function getPlayerRoomState(room, playerId) {
  return {
    ...room,
    players: room.players.map((p) => ({
      ...p,
      hand: p.id === playerId ? p.hand : [],
    })),
    deck: undefined,
  };
}

export {
  createDeck,
  shuffleDeck,
  dealHands,
  evaluateHand,
  compareHands,
  determineWinners,
  createRoom,
  addPlayer,
  removePlayer,
  startGame,
  initHand,
  processBet,
  isRoundComplete,
  advanceRound,
  finishHand,
  advanceTurn,
  getPublicRoomState,
  getPlayerRoomState,
  HAND_RANKS,
};
