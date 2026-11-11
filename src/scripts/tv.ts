/**
 * L'image de la télévision : une mosaïque de chaînes dessinée dans un canvas, qui sert de
 * texture à l'écran du salon. Une chaîne par réalisation, chacune avec son carton : une
 * teinte et un pictogramme vectoriel.
 */
import * as THREE from 'three';

export interface Channel {
  title: string;
  /** Teinte du carton. */
  tint: string;
  /** Tracé SVG du pictogramme, et la taille du cadre dans lequel il est dessiné. */
  glyph: { path: string; width: number; height: number };
}

export interface Television {
  texture: THREE.CanvasTexture;
  /** 0 : éteinte ; 1 : allumée. */
  setPower(power: number): void;
  setHover(index: number): void;
  /** Passe de la mosaïque au carton plein écran d'une chaîne (-1 pour revenir). */
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
const INK = '#0b0d12';

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
  const paths = channels.map((channel) => new Path2D(channel.glyph.path));

  let power = 0;
  let hover = -1;
  let program = -1;

  /** Carton d'une chaîne : fond teinté, pictogramme au trait centré dans la zone donnée. */
  const card = (
    index: number,
    x: number,
    y: number,
    width: number,
    height: number,
    size: number,
    active: boolean,
  ) => {
    const { tint, glyph } = channels[index];
    const shade = ctx.createLinearGradient(x, y, x + width, y + height);
    shade.addColorStop(0, tint);
    shade.addColorStop(1, INK);
    ctx.fillStyle = shade;
    ctx.fillRect(x, y, width, height);

    const scale = size / Math.max(glyph.width, glyph.height);
    ctx.save();
    ctx.translate(
      x + width / 2 - (glyph.width * scale) / 2,
      y + height * 0.44 - (glyph.height * scale) / 2,
    );
    ctx.scale(scale, scale);
    ctx.lineWidth = (active ? 5 : 3.5) / scale;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = active ? '#fff' : 'rgba(255,255,255,0.78)';
    ctx.stroke(paths[index]);
    ctx.restore();
  };

  const draw = () => {
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#020203';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    if (power > 0.01) {
      ctx.globalAlpha = Math.min(1, power);
      if (program >= 0) {
        card(program, 0, 0, WIDTH, HEIGHT, 520, true);
      } else {
        ctx.fillStyle = INK;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '400 40px "Instrument Sans Variable", sans-serif';
        ctx.fillText(hint, MARGIN, 96);
        channels.forEach((channel, index) => {
          const { x, y } = cell(index);
          const active = index === hover;
          card(index, x, y, cellWidth, cellHeight, cellHeight * (active ? 0.52 : 0.46), active);
          ctx.fillStyle = '#7fdcff';
          ctx.font = '400 30px "Geist Mono Variable", monospace';
          ctx.fillText(String(index + 1).padStart(2, '0'), x + 24, y + 50);
          ctx.fillStyle = '#fff';
          ctx.font = '400 58px "Instrument Serif", serif';
          ctx.fillText(channel.title, x + 24, y + cellHeight - 30, cellWidth - 48);
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
      texture.dispose();
    },
  };
}
