import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Download, Type, Move, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { base64ToDataUrl } from '../../lib/campanasImageGen';
import type { CopyGenerado } from '../../lib/campanasTypes';

interface TextElement {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontWeight: string;
  textAlign: CanvasTextAlign;
  shadow: boolean;
}

interface Props {
  image: { base64: string; mimeType: string };
  copy: CopyGenerado;
  slideIndex?: number;
  onExport?: (dataUrl: string) => void;
}

const COLORS = ['#FFFFFF', '#F5A623', '#000000', '#22C55E', '#3B82F6', '#EF4444', '#8B5CF6'];

export default function CreativoEditor({ image, copy, slideIndex, onExport }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [elements, setElements] = useState<TextElement[]>(() => [
    {
      id: 'titulo',
      text: copy.titulo,
      x: 540,
      y: 200,
      fontSize: 52,
      color: '#FFFFFF',
      fontWeight: 'bold',
      textAlign: 'center',
      shadow: true,
    },
    {
      id: 'cta',
      text: copy.cta_texto || 'Saber Mas',
      x: 540,
      y: 880,
      fontSize: 28,
      color: '#000000',
      fontWeight: 'bold',
      textAlign: 'center',
      shadow: false,
    },
  ]);
  const [selectedId, setSelectedId] = useState<string | null>('titulo');
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const selected = elements.find((e) => e.id === selectedId);

  const updateElement = (id: string, fields: Partial<TextElement>) => {
    setElements((prev) => prev.map((e) => (e.id === id ? { ...e, ...fields } : e)));
  };

  // Render canvas
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
      ctx.drawImage(img, 0, 0, size, size);

      // Semi-transparent overlay
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 0, size, size);

      for (const el of elements) {
        ctx.font = `${el.fontWeight} ${el.fontSize}px "DM Sans", sans-serif`;
        ctx.textAlign = el.textAlign;
        ctx.fillStyle = el.color;

        if (el.shadow) {
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 10;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
        } else {
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }

        // CTA gets a button background
        if (el.id === 'cta') {
          const metrics = ctx.measureText(el.text);
          const btnW = metrics.width + 60;
          const btnH = el.fontSize + 30;
          ctx.shadowColor = 'transparent';
          ctx.fillStyle = '#F5A623';
          roundRect(ctx, el.x - btnW / 2, el.y - btnH / 2, btnW, btnH, 12);
          ctx.fill();
          ctx.fillStyle = el.color;
          ctx.fillText(el.text, el.x, el.y + el.fontSize / 3);
        } else {
          wrapText(ctx, el.text, el.x, el.y, 920, el.fontSize + 12);
        }

        // Selection indicator
        if (el.id === selectedId) {
          ctx.shadowColor = 'transparent';
          ctx.strokeStyle = '#F5A623';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          const metrics = ctx.measureText(el.text);
          const w = Math.min(metrics.width + 20, 940);
          const h = el.fontSize + 20;
          ctx.strokeRect(el.x - w / 2, el.y - h / 2, w, h);
          ctx.setLineDash([]);
        }
      }
    };
    img.src = base64ToDataUrl(image.base64, image.mimeType);
  }, [image, elements, selectedId]);

  useEffect(() => {
    render();
  }, [render]);

  // Mouse handlers for drag
  const getCanvasCoords = (e: React.MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scale = 1080 / rect.width;
    return {
      x: (e.clientX - rect.left) * scale,
      y: (e.clientY - rect.top) * scale,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const coords = getCanvasCoords(e);
    // Find clicked element
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    for (const el of [...elements].reverse()) {
      ctx.font = `${el.fontWeight} ${el.fontSize}px "DM Sans", sans-serif`;
      const w = Math.min(ctx.measureText(el.text).width + 40, 940);
      const h = el.fontSize + 40;
      if (
        coords.x >= el.x - w / 2 &&
        coords.x <= el.x + w / 2 &&
        coords.y >= el.y - h / 2 &&
        coords.y <= el.y + h / 2
      ) {
        setSelectedId(el.id);
        setDragging(el.id);
        setDragOffset({ x: coords.x - el.x, y: coords.y - el.y });
        return;
      }
    }
    setSelectedId(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const coords = getCanvasCoords(e);
    updateElement(dragging, {
      x: Math.max(60, Math.min(1020, coords.x - dragOffset.x)),
      y: Math.max(60, Math.min(1020, coords.y - dragOffset.y)),
    });
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  const handleExport = () => {
    // Re-render without selection indicator
    const prevSelected = selectedId;
    setSelectedId(null);
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/png');
      onExport?.(dataUrl);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `creativo-editado${slideIndex !== undefined ? `-slide${slideIndex + 1}` : ''}.png`;
      a.click();
      toast.success('Imagen descargada');
      setSelectedId(prevSelected);
    }, 100);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Move className="w-4 h-4 text-[#FFFFFF]/30" />
          <span className="text-xs text-[#FFFFFF]/40">Arrastra los elementos para moverlos</span>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#F5A623] bg-[#F5A623]/10 hover:bg-[#F5A623]/15 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Descargar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Canvas */}
        <div
          ref={containerRef}
          className="lg:col-span-2 rounded-xl overflow-hidden border border-[rgba(245,166,35,0.15)] cursor-move"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <canvas ref={canvasRef} className="w-full aspect-square" style={{ imageRendering: 'auto' }} />
        </div>

        {/* Properties panel */}
        <div className="space-y-4">
          <div className="bg-[#141414] border border-[rgba(245,166,35,0.15)] rounded-xl p-4 space-y-4">
            <h4 className="text-xs font-medium text-[#FFFFFF]/60 uppercase tracking-wider">Elementos</h4>
            {elements.map((el) => (
              <button
                key={el.id}
                onClick={() => setSelectedId(el.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                  selectedId === el.id
                    ? 'bg-[#F5A623]/10 text-[#F5A623] border border-[#F5A623]/30'
                    : 'text-[#FFFFFF]/50 hover:bg-[#FFFFFF]/5'
                }`}
              >
                <Type className="w-3 h-3 inline mr-2" />
                {el.id === 'titulo' ? 'Titulo' : el.id === 'cta' ? 'CTA' : el.id}
              </button>
            ))}
          </div>

          {selected && (
            <div className="bg-[#141414] border border-[rgba(245,166,35,0.15)] rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-medium text-[#FFFFFF]/60 uppercase tracking-wider">Propiedades</h4>

              <div>
                <label className="text-[10px] text-[#FFFFFF]/30 mb-1 block">Texto</label>
                <textarea
                  value={selected.text}
                  onChange={(e) => updateElement(selected.id, { text: e.target.value })}
                  rows={2}
                  className="w-full bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-lg px-3 py-2 text-sm text-[#FFFFFF] focus:outline-none focus:border-[#F5A623]/50 resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#FFFFFF]/30 mb-1 block">Tamano</label>
                <input
                  type="range"
                  min={16}
                  max={80}
                  value={selected.fontSize}
                  onChange={(e) => updateElement(selected.id, { fontSize: Number(e.target.value) })}
                  className="w-full accent-[#F5A623]"
                />
                <span className="text-[10px] text-[#FFFFFF]/30">{selected.fontSize}px</span>
              </div>

              <div>
                <label className="text-[10px] text-[#FFFFFF]/30 mb-1 block">Color</label>
                <div className="flex gap-1.5">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => updateElement(selected.id, { color: c })}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        selected.color === c ? 'border-[#F5A623] scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-[#FFFFFF]/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.shadow}
                  onChange={(e) => updateElement(selected.id, { shadow: e.target.checked })}
                  className="accent-[#F5A623]"
                />
                Sombra
              </label>

              <div>
                <label className="text-[10px] text-[#FFFFFF]/30 mb-1 block">Peso</label>
                <div className="flex gap-1.5">
                  {['normal', 'bold'].map((w) => (
                    <button
                      key={w}
                      onClick={() => updateElement(selected.id, { fontWeight: w })}
                      className={`px-3 py-1 rounded text-xs transition-all ${
                        selected.fontWeight === w
                          ? 'bg-[#F5A623]/15 text-[#F5A623]'
                          : 'bg-[#FFFFFF]/5 text-[#FFFFFF]/30'
                      }`}
                      style={{ fontWeight: w }}
                    >
                      {w === 'bold' ? 'Bold' : 'Normal'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
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
