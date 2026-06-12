export const animationConfig = {
  durations: {
    fast: 0.2,
    normal: 0.3,
    slow: 0.5,
  },
  easings: {
    easeOut: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    spring: { type: 'spring', stiffness: 500, damping: 30, mass: 1 },
    bounce: { type: 'spring', stiffness: 700, damping: 25, mass: 0.8 },
  },
  card: {
    enter: {
      translateY: 50,
      scale: 0,
      opacity: 0,
    },
    visible: {
      translateY: 0,
      scale: 1,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 25,
        mass: 1,
        duration: 0.3,
      },
    },
  },
  score: {
    change: {
      scale: [1.2, 1],
      transition: {
        duration: 0.2,
        ease: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
    },
  },
  pulse: {
    duration: 1,
    iterations: Infinity,
  },
  crown: {
    float: {
      y: [0, -8, 0],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      },
    },
  },
} as const;

export const cssVariables = `
  :root {
    --animation-fast: 0.2s;
    --animation-normal: 0.3s;
    --animation-slow: 0.5s;
    --ease-out: cubic-bezier(0.25, 0.46, 0.45, 0.94);
    --card-radius: 12px;
    --card-spacing: 16px;
    --color-primary: #5b8aa8;
    --color-secondary: #f5a623;
    --color-success: #4caf50;
    --color-danger: #f44336;
    --color-bg-gradient-start: #f0f4f8;
    --color-bg-gradient-end: #ffffff;
    --color-card-bg: #fff8e1;
  }
`;
