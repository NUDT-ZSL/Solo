import { Topic } from '../types';

export const TOPICS: Topic[] = [
  {
    id: 'restaurant',
    name: '餐厅点餐',
    icon: 'utensils',
    description: '练习在餐厅点餐、询问菜单、特殊要求等场景',
    starterQuestions: [
      "Good evening! Welcome to our restaurant. Do you have a reservation?",
      "Welcome! Have you had a chance to look at our menu?",
      "Hi there! How many people will be dining with us tonight?"
    ],
    keywords: ['menu', 'order', 'reservation', 'table', 'food', 'drink', 'bill', 'waiter', 'chef', 'special']
  },
  {
    id: 'travel',
    name: '旅行问路',
    icon: 'map-pin',
    description: '练习在旅行中问路、买票、入住酒店等场景',
    starterQuestions: [
      "Excuse me, could you help me find the nearest subway station?",
      "Welcome to the hotel! Do you have a reservation with us?",
      "Hello! Where would you like to buy a ticket to?"
    ],
    keywords: ['direction', 'map', 'station', 'hotel', 'ticket', 'airport', 'train', 'bus', 'left', 'right']
  },
  {
    id: 'interview',
    name: '求职面试',
    icon: 'briefcase',
    description: '练习英文面试自我介绍、回答问题等场景',
    starterQuestions: [
      "Good morning! Could you please tell me a little about yourself?",
      "Thank you for coming in. Why are you interested in this position?",
      "Welcome! What do you consider your greatest professional strength?"
    ],
    keywords: ['experience', 'skill', 'team', 'project', 'goal', 'company', 'position', 'salary', 'work', 'career']
  },
  {
    id: 'shopping',
    name: '购物逛街',
    icon: 'shopping-bag',
    description: '练习在商店购物、询问价格、讨价还价等场景',
    starterQuestions: [
      "Hi! Welcome to our store. Is there anything specific you're looking for?",
      "Hello! Would you like to try on this jacket? It's our bestseller.",
      "Good afternoon! How can I assist you today?"
    ],
    keywords: ['price', 'size', 'color', 'discount', 'try', 'buy', 'payment', 'cash', 'card', 'return']
  },
  {
    id: 'daily',
    name: '日常聊天',
    icon: 'message-circle',
    description: '练习日常话题、天气、兴趣爱好等轻松对话',
    starterQuestions: [
      "Hey! How's your day going so far?",
      "Nice weather we're having today, isn't it?",
      "Hi there! Do you have any plans for the weekend?"
    ],
    keywords: ['weather', 'hobby', 'family', 'friend', 'weekend', 'movie', 'music', 'sport', 'food', 'travel']
  },
  {
    id: 'business',
    name: '商务会议',
    icon: 'users',
    description: '练习商务会议、汇报工作、讨论方案等场景',
    starterQuestions: [
      "Good morning everyone. Let's get started with today's meeting.",
      "Thank you for joining. Could you update us on the Q3 project status?",
      "Welcome everyone. First on our agenda is the budget review."
    ],
    keywords: ['meeting', 'project', 'budget', 'deadline', 'team', 'client', 'report', 'strategy', 'goal', 'agenda']
  }
];

export const TOPIC_ICONS: Record<string, string> = {
  restaurant: '🍽️',
  travel: '📍',
  interview: '💼',
  shopping: '🛍️',
  daily: '💬',
  business: '👥'
};

export const FOLLOW_UP_QUESTIONS: Record<string, string[]> = {
  restaurant: [
    "Would you like to hear about today's specials?",
    "How would you like your steak cooked?",
    "Can I get you anything else with that?",
    "Would you care for dessert or coffee after your meal?",
    "Is there anything else I can help you with?"
  ],
  travel: [
    "Is this your first time visiting our city?",
    "Would you prefer a direct train or one with transfers?",
    "How many nights will you be staying with us?",
    "Have you had a chance to visit any tourist attractions yet?",
    "Would you like me to call a taxi for you?"
  ],
  interview: [
    "Can you tell me about a challenging project you've worked on?",
    "Where do you see yourself professionally in five years?",
    "How do you handle tight deadlines and pressure?",
    "Why are you leaving your current position?",
    "Do you have any questions for me about the role?"
  ],
  shopping: [
    "Would you like to see something in a different color?",
    "Are you interested in signing up for our rewards program?",
    "We're having a sale this week - would you like to know more?",
    "How does this fit compared to what you usually wear?",
    "Would you like this gift-wrapped?"
  ],
  daily: [
    "What kind of music do you usually listen to?",
    "Have you watched any good movies lately?",
    "What's your favorite way to relax after work?",
    "Do you prefer cooking at home or eating out?",
    "What's the best vacation you've ever been on?"
  ],
  business: [
    "Does anyone have any feedback on this proposal?",
    "What are the main risks we should be aware of?",
    "Can we set some clear KPIs for this quarter?",
    "How does this align with our long-term objectives?",
    "Who would be the best person to lead this initiative?"
  ]
};
