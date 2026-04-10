import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Download, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { base64ToDataUrl } from '../../lib/campanasImageGen';
import type { CopyGenerado } from '../../lib/campanasTypes';

type LayoutMode = 'centered' | 'top' | 'bottom';

interface Props {
  image: { base64: string; mimeType: string };
  copy: CopyGenerado;
  slideIndex?: number;
  onExport?: (dataUrl: string) => void;
}

const LAYOUTS: { id: LayoutMode; label: string }[] = [
  { id: 'centered', label: 'Centrado' },
  { id: 'top', label: 'Superior' },
  { id: 'bottom', label: 'Inferior' },
];

export default function CreativoPreviewAuto({ image, copy, slideIndex, onExport }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [layout, setLayout] = useState<LayoutMode>('centered');

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 1080;
    canvas.width = size;
    canvas.height = size;

    const img = new Image();
    img.onload = () => {
      // Draw background image
      ctx.drawImage(img, 0, 0, size, size);

      // Dark overlay for text readability
      const gradient = ctx.createLinearGradient(0, 0, 0, size);
      if (layout === 'top') {
        gradient.addColorStop(0, 'rgba(0,0,0,0.75)');
        gradient.addColorStop(0.5, 'rgba(0,0,0,0.2)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.1)');
      } else if (layout === 'bottom') {
        gradient.addColorStop(0, 'rgba(0,0,0,0.1)');
        gradient.addColorStop(0.5, 'rgba(0,0,0,0.2)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.75)');
      } else {
        gradient.addColorStop(0, 'rgba(0,0,0,0.5)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.5)');
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);

      // Text positioning
      const padding = 80;
      const maxWidth = size - padding * 2;
      let yStart: number;

      if (layout === 'top') yStart = padding + 40;
      else if (layout === 'bottom') yStart = size - 400;
      else yStart = size / 2 - 150;

      // Title
      ctx.font = 'bold 52px "DM Sans", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      wrapText(ctx, copy.titulo, size / 2, yStart, maxWidth, 60);

      // CTA button
      const ctaY = layout === 'bottom' ? size - padding - 40 : layout === 'top' ? yStart + 200 : size / 2 + 120;
      if (copy.cta_texto) {
        const ctaWidth = ctx.measureText(copy.cta_texto).width + 60;
        ctx.font = 'bold 32px "DM Sans", sans-serif';
        const ctaActualWidth = ctx.measureText(copy.cta_texto).width + 60;

        // Button background
        const btnX = (size - ctaActualWidth) / 2;
        ctx.fillStyle = '#F5A623';
        roundRect(ctx, btnX, ctaY - 25, ctaActualWidth, 55, 12);
        ctx.fill();

        // Button text
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 28px "DM Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(copy.cta_texto, size / 2, ctaY + 5);
      }
    };

    img.src = base64ToDataUrl(image.base64, image.mimeType);
  }, [image, copy, layout]);

  useEffect(() => {
    render();
  }, [render]);

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    onExport?.(dataUrl);

    // Trigger download
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `creativo${slideIndex !== undefined ? `-slide${slideIndex + 1}` : ''}.png`;
    a.click();
    toast.success('Imagen descargada');
  };

  return (
    <div className="space-y-3">
      {/* Layout selector */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {LAYOUTS.map((l) => (
            <button
              key={l.id}
              onClick={() => setLayout(l.id)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
                layout === l.id
                  ? 'bg-[#F5A623]/15 text-[#F5A623]'
                  : 'bg-[#FFFFFF]/5 text-[#FFFFFF]/30 hover:text-[#FFFFFF]/50'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#F5A623] bg-[#F5A623]/10 hover:bg-[#F5A623]/15 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Descargar
        </button>
      </div>

      {/* Canvas preview */}
      <div className="rounded-xl overflow-hidden border border-[rgba(245,166,35,0.15)]">
        <canvas ref={canvasRef} className="w-full aspect-square" style={{ imageRendering: 'auto' }} />
      </div>
    </div>
  );
}

// ─── Canvas helpers ──────────────────────────────────────────────────────────

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxWidth && line !== '') {
      ctx.fillText(line.trim(), x, currentY);
      line = word + ' ';
      currentY += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
