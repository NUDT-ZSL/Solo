import { useEffect, useRef } from 'react';
import { OutfitState } from '../types';
import { getColorHex } from '../data';

interface CharacterPreviewProps {
  outfit: OutfitState;
  width?: number;
  height?: number;
}

export default function CharacterPreview({ outfit, width = 400, height = 600 }: CharacterPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const startTime = performance.now();

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f9f0e0';
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const scale = Math.min(width / 400, height / 600);
    const headY = 120 * scale;
    const shoulderY = 220 * scale;
    const waistY = 340 * scale;
    const hipY = 380 * scale;
    const kneeY = 480 * scale;
    const footY = 570 * scale;

    ctx.save();
    ctx.translate(centerX, 0);

    drawBody(ctx, outfit.bodyType, scale, shoulderY, waistY, hipY, kneeY, footY);
    drawHair(ctx, outfit.hair.partId, getColorHex(outfit.hair.colorId), scale, headY);
    drawFace(ctx, scale, headY);
    drawTop(ctx, outfit.top.partId, getColorHex(outfit.top.colorId), scale, shoulderY, waistY, hipY);
    drawBottom(ctx, outfit.bottom.partId, getColorHex(outfit.bottom.colorId), scale, waistY, hipY, kneeY);
    drawShoes(ctx, outfit.shoes.partId, getColorHex(outfit.shoes.colorId), scale, kneeY, footY);
    drawAccessory(ctx, outfit.accessory.partId, getColorHex(outfit.accessory.colorId), scale, headY, shoulderY);

    ctx.restore();

    const elapsed = performance.now() - startTime;
    if (elapsed > 50) {
      console.warn(`Canvas render took ${elapsed.toFixed(1)}ms, target < 50ms`);
    }
  }, [outfit, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="character-canvas"
    />
  );
}

function drawBody(ctx: CanvasRenderingContext2D, bodyType: string, scale: number, shoulderY: number, waistY: number, hipY: number, kneeY: number, footY: number) {
  let bodyWidth = 55 * scale;
  let waistWidth = 45 * scale;
  let hipWidth = 52 * scale;

  if (bodyType === 'slim') {
    bodyWidth = 48 * scale;
    waistWidth = 38 * scale;
    hipWidth = 45 * scale;
  } else if (bodyType === 'athletic') {
    bodyWidth = 62 * scale;
    waistWidth = 50 * scale;
    hipWidth = 56 * scale;
  }

  ctx.fillStyle = '#f5d6b8';
  ctx.beginPath();
  ctx.moveTo(-bodyWidth, shoulderY);
  ctx.lineTo(-bodyWidth + 5 * scale, waistY - 20 * scale);
  ctx.quadraticCurveTo(-waistWidth, waistY, -waistWidth, waistY + 10 * scale);
  ctx.lineTo(-hipWidth, hipY);
  ctx.lineTo(-25 * scale, kneeY);
  ctx.lineTo(-22 * scale, footY);
  ctx.lineTo(-10 * scale, footY);
  ctx.lineTo(-5 * scale, hipY);
  ctx.lineTo(5 * scale, hipY);
  ctx.lineTo(10 * scale, footY);
  ctx.lineTo(22 * scale, footY);
  ctx.lineTo(25 * scale, kneeY);
  ctx.lineTo(hipWidth, hipY);
  ctx.lineTo(waistWidth, waistY + 10 * scale);
  ctx.quadraticCurveTo(waistWidth, waistY, bodyWidth - 5 * scale, waistY - 20 * scale);
  ctx.lineTo(bodyWidth, shoulderY);
  ctx.quadraticCurveTo(0, shoulderY - 10 * scale, -bodyWidth, shoulderY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#f5d6b8';
  ctx.beginPath();
  ctx.ellipse(-bodyWidth - 8 * scale, shoulderY + 60 * scale, 12 * scale, 70 * scale, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(bodyWidth + 8 * scale, shoulderY + 60 * scale, 12 * scale, 70 * scale, -0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 80 * scale, 45 * scale, 0, Math.PI * 2);
  ctx.fill();
}

function drawHair(ctx: CanvasRenderingContext2D, partId: string, color: string, scale: number, headY: number) {
  ctx.fillStyle = color;

  switch (partId) {
    case 'hair-short':
      ctx.beginPath();
      ctx.arc(0, headY - 10 * scale, 50 * scale, Math.PI, Math.PI * 2);
      ctx.lineTo(45 * scale, headY + 10 * scale);
      ctx.quadraticCurveTo(0, headY - 5 * scale, -45 * scale, headY + 10 * scale);
      ctx.closePath();
      ctx.fill();
      break;

    case 'hair-long':
      ctx.beginPath();
      ctx.arc(0, headY - 10 * scale, 52 * scale, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-50 * scale, headY - 20 * scale);
      ctx.quadraticCurveTo(-60 * scale, headY + 80 * scale, -55 * scale, headY + 180 * scale);
      ctx.quadraticCurveTo(-40 * scale, headY + 100 * scale, -30 * scale, headY + 20 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(50 * scale, headY - 20 * scale);
      ctx.quadraticCurveTo(60 * scale, headY + 80 * scale, 55 * scale, headY + 180 * scale);
      ctx.quadraticCurveTo(40 * scale, headY + 100 * scale, 30 * scale, headY + 20 * scale);
      ctx.closePath();
      ctx.fill();
      break;

    case 'hair-curly':
      ctx.beginPath();
      ctx.arc(0, headY - 15 * scale, 55 * scale, Math.PI, Math.PI * 2);
      ctx.fill();
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(i * 15 * scale, headY + 5 * scale, 18 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.arc(i * 22 * scale, headY + 40 * scale, 16 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 'hair-ponytail':
      ctx.beginPath();
      ctx.arc(0, headY - 10 * scale, 50 * scale, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, headY - 25 * scale, 25 * scale, 15 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-10 * scale, headY - 30 * scale);
      ctx.quadraticCurveTo(-15 * scale, headY + 50 * scale, -8 * scale, headY + 120 * scale);
      ctx.quadraticCurveTo(0, headY + 130 * scale, 8 * scale, headY + 120 * scale);
      ctx.quadraticCurveTo(15 * scale, headY + 50 * scale, 10 * scale, headY - 30 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ec87c0';
      ctx.beginPath();
      ctx.ellipse(0, headY - 25 * scale, 10 * scale, 6 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
}

function drawFace(ctx: CanvasRenderingContext2D, scale: number, headY: number) {
  ctx.fillStyle = '#2c3e50';
  ctx.beginPath();
  ctx.arc(-15 * scale, headY - 5 * scale, 4 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(15 * scale, headY - 5 * scale, 4 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#c0392b';
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.arc(0, headY + 15 * scale, 10 * scale, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 150, 150, 0.4)';
  ctx.beginPath();
  ctx.ellipse(-28 * scale, headY + 10 * scale, 8 * scale, 5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(28 * scale, headY + 10 * scale, 8 * scale, 5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawTop(ctx: CanvasRenderingContext2D, partId: string, color: string, scale: number, shoulderY: number, waistY: number, hipY: number) {
  ctx.fillStyle = color;
  const bodyWidth = 55 * scale;

  switch (partId) {
    case 'top-tshirt':
      ctx.beginPath();
      ctx.moveTo(-bodyWidth, shoulderY);
      ctx.lineTo(-bodyWidth - 20 * scale, shoulderY + 80 * scale);
      ctx.lineTo(-bodyWidth + 5 * scale, shoulderY + 75 * scale);
      ctx.lineTo(-bodyWidth + 10 * scale, waistY + 20 * scale);
      ctx.lineTo(bodyWidth - 10 * scale, waistY + 20 * scale);
      ctx.lineTo(bodyWidth - 5 * scale, shoulderY + 75 * scale);
      ctx.lineTo(bodyWidth + 20 * scale, shoulderY + 80 * scale);
      ctx.lineTo(bodyWidth, shoulderY);
      ctx.quadraticCurveTo(0, shoulderY + 15 * scale, -bodyWidth, shoulderY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      ctx.stroke();
      break;

    case 'top-shirt':
      ctx.beginPath();
      ctx.moveTo(-bodyWidth, shoulderY);
      ctx.lineTo(-bodyWidth - 22 * scale, shoulderY + 90 * scale);
      ctx.lineTo(-bodyWidth + 3 * scale, shoulderY + 85 * scale);
      ctx.lineTo(-bodyWidth + 8 * scale, waistY + 30 * scale);
      ctx.lineTo(bodyWidth - 8 * scale, waistY + 30 * scale);
      ctx.lineTo(bodyWidth - 3 * scale, shoulderY + 85 * scale);
      ctx.lineTo(bodyWidth + 22 * scale, shoulderY + 90 * scale);
      ctx.lineTo(bodyWidth, shoulderY);
      ctx.lineTo(10 * scale, shoulderY + 20 * scale);
      ctx.lineTo(0, shoulderY + 40 * scale);
      ctx.lineTo(-10 * scale, shoulderY + 20 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, shoulderY + 30 * scale);
      ctx.lineTo(0, waistY + 30 * scale);
      ctx.stroke();
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(0, shoulderY + 50 * scale + i * 25 * scale, 2 * scale, 0, Math.PI * 2);
        ctx.fillStyle = '#f1c40f';
        ctx.fill();
      }
      break;

    case 'top-dress':
      ctx.beginPath();
      ctx.moveTo(-bodyWidth, shoulderY);
      ctx.lineTo(-bodyWidth - 18 * scale, shoulderY + 70 * scale);
      ctx.lineTo(-bodyWidth + 5 * scale, shoulderY + 65 * scale);
      ctx.lineTo(-65 * scale, hipY + 30 * scale);
      ctx.lineTo(65 * scale, hipY + 30 * scale);
      ctx.lineTo(bodyWidth - 5 * scale, shoulderY + 65 * scale);
      ctx.lineTo(bodyWidth + 18 * scale, shoulderY + 70 * scale);
      ctx.lineTo(bodyWidth, shoulderY);
      ctx.quadraticCurveTo(0, shoulderY + 10 * scale, -bodyWidth, shoulderY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.ellipse(0, shoulderY + 80 * scale, 30 * scale, 10 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      break;

    case 'top-sweater':
      ctx.beginPath();
      ctx.moveTo(-bodyWidth - 5 * scale, shoulderY);
      ctx.lineTo(-bodyWidth - 28 * scale, shoulderY + 100 * scale);
      ctx.lineTo(-bodyWidth, shoulderY + 95 * scale);
      ctx.lineTo(-bodyWidth + 8 * scale, waistY + 35 * scale);
      ctx.lineTo(bodyWidth - 8 * scale, waistY + 35 * scale);
      ctx.lineTo(bodyWidth, shoulderY + 95 * scale);
      ctx.lineTo(bodyWidth + 28 * scale, shoulderY + 100 * scale);
      ctx.lineTo(bodyWidth + 5 * scale, shoulderY);
      ctx.quadraticCurveTo(0, shoulderY - 5 * scale, -bodyWidth - 5 * scale, shoulderY);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(-bodyWidth + 10 * scale, shoulderY + 40 * scale + i * 20 * scale);
        ctx.lineTo(bodyWidth - 10 * scale, shoulderY + 40 * scale + i * 20 * scale);
        ctx.stroke();
      }
      break;
  }
}

function drawBottom(ctx: CanvasRenderingContext2D, partId: string, color: string, scale: number, waistY: number, hipY: number, kneeY: number) {
  ctx.fillStyle = color;

  switch (partId) {
    case 'bottom-jeans':
      ctx.beginPath();
      ctx.moveTo(-50 * scale, waistY + 10 * scale);
      ctx.lineTo(-45 * scale, hipY);
      ctx.lineTo(-28 * scale, kneeY + 50 * scale);
      ctx.lineTo(-10 * scale, kneeY + 50 * scale);
      ctx.lineTo(-5 * scale, hipY);
      ctx.lineTo(5 * scale, hipY);
      ctx.lineTo(10 * scale, kneeY + 50 * scale);
      ctx.lineTo(28 * scale, kneeY + 50 * scale);
      ctx.lineTo(45 * scale, hipY);
      ctx.lineTo(50 * scale, waistY + 10 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, waistY + 10 * scale);
      ctx.lineTo(0, hipY);
      ctx.stroke();
      break;

    case 'bottom-skirt':
      ctx.beginPath();
      ctx.moveTo(-48 * scale, waistY + 10 * scale);
      ctx.lineTo(-70 * scale, kneeY + 10 * scale);
      ctx.lineTo(70 * scale, kneeY + 10 * scale);
      ctx.lineTo(48 * scale, waistY + 10 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 15 * scale, waistY + 10 * scale);
        ctx.lineTo(i * 22 * scale, kneeY + 10 * scale);
        ctx.stroke();
      }
      break;

    case 'bottom-shorts':
      ctx.beginPath();
      ctx.moveTo(-50 * scale, waistY + 10 * scale);
      ctx.lineTo(-45 * scale, hipY + 10 * scale);
      ctx.lineTo(-25 * scale, hipY + 60 * scale);
      ctx.lineTo(-8 * scale, hipY + 60 * scale);
      ctx.lineTo(-5 * scale, hipY + 10 * scale);
      ctx.lineTo(5 * scale, hipY + 10 * scale);
      ctx.lineTo(8 * scale, hipY + 60 * scale);
      ctx.lineTo(25 * scale, hipY + 60 * scale);
      ctx.lineTo(45 * scale, hipY + 10 * scale);
      ctx.lineTo(50 * scale, waistY + 10 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, waistY + 10 * scale);
      ctx.lineTo(0, hipY + 10 * scale);
      ctx.stroke();
      break;
  }
}

function drawShoes(ctx: CanvasRenderingContext2D, partId: string, color: string, scale: number, kneeY: number, footY: number) {
  ctx.fillStyle = color;

  switch (partId) {
    case 'shoes-sneakers':
      ctx.beginPath();
      ctx.roundRect(-28 * scale, footY - 10 * scale, 20 * scale, 15 * scale, 4 * scale);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(8 * scale, footY - 10 * scale, 20 * scale, 15 * scale, 4 * scale);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(-28 * scale, footY + 2 * scale, 20 * scale, 3 * scale);
      ctx.fillRect(8 * scale, footY + 2 * scale, 20 * scale, 3 * scale);
      break;

    case 'shoes-heels':
      ctx.beginPath();
      ctx.moveTo(-28 * scale, footY - 5 * scale);
      ctx.lineTo(-8 * scale, footY - 5 * scale);
      ctx.lineTo(-5 * scale, footY);
      ctx.lineTo(-26 * scale, footY);
      ctx.lineTo(-24 * scale, footY + 15 * scale);
      ctx.lineTo(-20 * scale, footY + 15 * scale);
      ctx.lineTo(-22 * scale, footY);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(8 * scale, footY - 5 * scale);
      ctx.lineTo(28 * scale, footY - 5 * scale);
      ctx.lineTo(26 * scale, footY);
      ctx.lineTo(5 * scale, footY);
      ctx.lineTo(7 * scale, footY + 15 * scale);
      ctx.lineTo(11 * scale, footY + 15 * scale);
      ctx.lineTo(9 * scale, footY);
      ctx.closePath();
      ctx.fill();
      break;

    case 'shoes-boots':
      ctx.beginPath();
      ctx.moveTo(-28 * scale, kneeY + 40 * scale);
      ctx.lineTo(-25 * scale, footY - 5 * scale);
      ctx.lineTo(-6 * scale, footY - 5 * scale);
      ctx.lineTo(-6 * scale, kneeY + 40 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(6 * scale, kneeY + 40 * scale);
      ctx.lineTo(6 * scale, footY - 5 * scale);
      ctx.lineTo(25 * scale, footY - 5 * scale);
      ctx.lineTo(28 * scale, kneeY + 40 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(-28 * scale, footY - 3 * scale, 22 * scale, 3 * scale);
      ctx.fillRect(6 * scale, footY - 3 * scale, 22 * scale, 3 * scale);
      break;
  }
}

function drawAccessory(ctx: CanvasRenderingContext2D, partId: string, color: string, scale: number, headY: number, shoulderY: number) {
  switch (partId) {
    case 'acc-necklace':
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5 * scale;
      ctx.beginPath();
      ctx.arc(0, shoulderY - 10 * scale, 22 * scale, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, shoulderY + 8 * scale, 5 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(-1.5 * scale, shoulderY + 6 * scale, 1.5 * scale, 0, Math.PI * 2);
      ctx.stroke();
      break;

    case 'acc-hat':
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, headY - 40 * scale, 60 * scale, 8 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-32 * scale, headY - 40 * scale);
      ctx.quadraticCurveTo(-35 * scale, headY - 90 * scale, 0, headY - 95 * scale);
      ctx.quadraticCurveTo(35 * scale, headY - 90 * scale, 32 * scale, headY - 40 * scale);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(-32 * scale, headY - 50 * scale, 64 * scale, 5 * scale);
      break;
  }
}
