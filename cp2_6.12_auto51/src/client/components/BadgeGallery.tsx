import React from 'react';
import { motion } from 'framer-motion';

interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  level: number;
}

interface BadgeGalleryProps {
  badges: Badge[];
}

const getBadgeGradient = (level: number) => {
  switch (level) {
    case 1:
      return 'linear-gradient(135deg, #90EE90 0%, #32CD32 100%)';
    case 2:
      return 'linear-gradient(135deg, #CD7F32 0%, #B87333 100%)';
    case 3:
      return 'linear-gradient(135deg, #C0C0C0 0