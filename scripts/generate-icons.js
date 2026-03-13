// Generate simple PNG icons using canvas — run this script to create actual PNG files
// This creates proper 192x192 and 512x512 icons for PWA

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const drawIcon = (size) => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#4f46e5');
  grad.addColorStop(0.5, '#7c3aed');
  grad.addColorStop(1, '#6d28d9');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.22);
  ctx.fill();

  // Chat bubble
  const s = size * 0.5;
  const x = size * 0.25, y = size * 0.22;
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.roundRect(x, y, s, s * 0.7, s * 0.15);
  ctx.fill();
  // Tail
  ctx.beginPath();
  ctx.moveTo(x + s * 0.1, y + s * 0.65);
  ctx.lineTo(x - s * 0.08, y + s * 0.9);
  ctx.lineTo(x + s * 0.3, y + s * 0.7);
  ctx.fill();

  // Dots
  const dotY = y + s * 0.3;
  const dotR = s * 0.07;
  [0.3, 0.5, 0.7].forEach(xRatio => {
    ctx.fillStyle = '#4f46e5';
    ctx.beginPath();
    ctx.arc(x + s * xRatio, dotY, dotR, 0, Math.PI * 2);
    ctx.fill();
  });

  return canvas.toBuffer('image/png');
};

fs.writeFileSync(path.join(dir, 'icon-192.png'), drawIcon(192));
fs.writeFileSync(path.join(dir, 'icon-512.png'), drawIcon(512));
console.log('✅ Icons generated: icons/icon-192.png and icons/icon-512.png');
