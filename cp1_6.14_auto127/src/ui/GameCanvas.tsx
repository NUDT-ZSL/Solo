import React, { useRef, useEffect, useCallback } from 'react'
import type { Ship, Obstacle, EnergyOrb, Particle, Star, InputData, RenderData } from '../types'
import { bridge } from '../Bridge'
import { getGameEngine } from '../GameEngine'

interface GameCanvasProps {
  width: number
  height: number
}

const GameCanvas: React.FC<GameCanvasProps> = ({ width, height }) => {
  const canvasRef = use