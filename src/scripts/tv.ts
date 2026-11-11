/**
 * L'image de la télévision : une mosaïque de chaînes dessinée dans un canvas, qui sert de
 * texture à l'écran du salon. Une chaîne par réalisation.
 */
import * as THREE from 'three';

export interface Channel {
  title: string;
  image: string;
}

export interface Television {
  texture: THREE.CanvasTexture;
  /** 0 : éteinte ; 1 : allumée. */
  setPower(power: number): void;
  setHover(index: number): void;
  /** Passe d'une mosaïque à l'image d'une chaîne (-1 pour revenir à la mosaïque). */
  setProgram(index: number): void;
  /** Indice de la chaîne sous le point (u, v) de l'écran, ou -1. */
  hit(u: number, v: number): number;
  dispose(): void;
}

const WIDTH = 1920;
const HEIGHT = 1080;
const COLUMNS = 4;
const MARGIN = 64;
const GUTTER = 28;
const TOP = 150;

export function createTelevision(channels: Channel[], hint: string): Television {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  const rows = Math.ceil(channels.length / COLUMNS);
  const cellWidth = (WIDTH - MARGIN * 2 - GUTTER * (COLUMNS - 1)) / COLUMNS;
  const cellHeight = (HEIGHT - TOP - MARGIN - GUTTER * (rows - 1)) / rows;
  const cell = (index: number) => ({
    x: MARGIN + (index % COLUMNS) * (cellWidth + GUTTER),
    y: TOP + Math.floor(index / COLUMNS) * (cellHeight + GUTTER),
  });

  let power = 0;
  let hover = -1;
  let program = -1;

  /** Dessine l'image en la recadrant depuis son coin haut gauche, comme `object-fit: cover`. */
  const cover = (
    image: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number,
    zoom = 1,
  ) => {
    if (!image.complete || !image.naturalWidth) return;
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight) * zoom;
    ctx.drawImage(image, 0, 0, width / scale, height / scale, x, y, width, height);
  };

  const draw = () => {
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#020203';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    if (power > 0.01) {
      ctx.globalAlpha = Math.min(1, power);
      if (program >= 0) {
        cover(images[program], 0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = 'rgba(8,10,14,0.55)';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      } else {
        ctx.fillStyle = '#0b0d12';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '400 40px "Instrument Sans Variable", sans-serif';
        ctx.fillText(hint, MARGIN, 96);
        channels.forEach((channel, index) => {
          const { x, y } = cell(index);
          const active = index === hover;
          ctx.save();
          ctx.beginPath();
          ctx.rect(x, y, cellWidth, cellHeight);
          ctx.clip();
          cover(images[index], x, y, cellWidth, cellHeight, active ? 1.08 : 1);
          const shade = ctx.createLinearGradient(0, y, 0, y + cellHeight);
          shade.addColorStop(0, `rgba(8,10,14,${active ? 0.25 : 0.6})`);
          shade.addColorStop(0.55, `rgba(8,10,14,${active ? 0.05 : 0.45})`);
          shade.addColorStop(1, 'rgba(8,10,14,0.92)');
          ctx.fillStyle = shade;
          ctx.fillRect(x, y, cellWidth, cellHeight);
          ctx.restore();
          ctx.fillStyle = '#7fdcff';
          ctx.font = '400 30px "Geist Mono Variable", monospace';
          ctx.fillText(String(index + 1).padStart(2, '0'), x + 22, y + 48);
          ctx.fillStyle = '#fff';
          ctx.font = '400 58px "Instrument Serif", serif';
          ctx.fillText(channel.title, x + 22, y + cellHeight - 28, cellWidth - 44);
          if (active) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 6;
            ctx.strokeRect(x + 3, y + 3, cellWidth - 6, cellHeight - 6);
          }
        });
      }
    }
    texture.needsUpdate = true;
  };

  const images = channels.map((channel) => {
    const image = new Image();
    image.onload = draw;
    image.src = channel.image;
    return image;
  });
  draw();

  return {
    texture,
    setPower(value) {
      const next = Math.round(value * 50) / 50;
      if (next === power) return;
      power = next;
      draw();
    },
    setHover(index) {
      if (index === hover) return;
      hover = index;
      draw();
    },
    setProgram(index) {
      if (index === program) return;
      program = index;
      draw();
    },
    hit(u, v) {
      if (power < 0.9 || program >= 0) return -1;
      const x = u * WIDTH;
      const y = (1 - v) * HEIGHT;
      return channels.findIndex((_, index) => {
        const origin = cell(index);
        return (
          x >= origin.x && x <= origin.x + cellWidth && y >= origin.y && y <= origin.y + cellHeight
        );
      });
    },
    dispose() {
      images.forEach((image) => (image.onload = null));
      texture.dispose();
    },
  };
}
