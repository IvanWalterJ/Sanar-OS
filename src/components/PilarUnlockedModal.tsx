/**
 * PilarUnlockedModal.tsx
 * Gamification popup shown when a pilar is completed and the next one unlocks.
 * Feels like a game achievement screen.
 */
import React, { useEffect, useState } from 'react';
import { Trophy, ChevronRight, Sparkles, X } from 'lucide-react';

interface PilarUnlockedModalProps {
  pilarCompletado: string;     // titulo of completed pilar
  pilarDesbloqueado?: string;  // titulo of newly unlocked pilar
  pilarNumero: number;         // number of the completed pilar
  onClose: () => void;
  onContinuar?: () => void;
}

export default function PilarUnlockedModal({
  pilarCompletado,
  pilarDesbloqueado,
  pilarNumero,
  onClose,
  onContinuar,
}: PilarUnlockedModalProps) {
  const [visible, setVisible] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; delay: number }[]>([]);

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => setVisible(true));
    // Generate particles
    setParticles(
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 0.5,
      })),
    );
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      {/* Particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-2 h-2 rounded-full bg-[var(--accent-gold)] animate-ping"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: '1.5s',
            opacity: 0.6,
          }}
        />
      ))}

      {/* Modal */}
      <div
        className={`relative z-10 w-full max-w-md text-center transition-all duration-500 ${
          visible ? 'scale-100 translate-y-0' : 'scale-90 translate-y-8'
        }`}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute -top-2 -right-2 z-20 w-8 h-8 rounded-full bg-[#1A1410] border border-[rgba(212,162,78,0.3)] flex items-center justify-center text-[#F5F0E1]/40 hover:text-[#F5F0E1] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Trophy glow */}
        <div className="relative mx-auto w-24 h-24 mb-6">
          <div className="absolute inset-0 rounded-full bg-[var(--accent-gold)]/20 animate-pulse" />
          <div className="absolute inset-2 rounded-full bg-[var(--accent-gold)]/10 border-2 border-[var(--accent-gold)]/40 flex items-center justify-center">
            <Trophy className="w-10 h-10 text-[var(--accent-gold)]" />
          </div>
        </div>

        {/* Content card */}
        <div className="card-panel p-8 rounded-2xl border border-[rgba(212,162,78,0.4)]">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--accent-gold)]/15 border border-[var(--accent-gold)]/30 mb-4">
            <Sparkles className="w-4 h-4 text-[var(--accent-gold)]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent-gold)]">
              Pilar completado
            </span>
          </div>

          {/* Title */}
          <h2
            className="text-2xl font-medium text-[#F5F0E1] mb-2"
            style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}
          >
            Pilar {pilarNumero} completado
          </h2>
          <p className="text-lg text-[var(--accent-gold)] font-medium mb-4">
            {pilarCompletado}
          </p>

          {/* Divider */}
          <div className="w-16 h-px bg-[var(--accent-gold)]/30 mx-auto mb-4" />

          {/* Next pilar */}
          {pilarDesbloqueado ? (
            <div className="mb-6">
              <p className="text-sm text-[#F5F0E1]/60 mb-1">Nuevo pilar desbloqueado:</p>
              <p className="text-lg font-medium text-[#F5F0E1]">{pilarDesbloqueado}</p>
            </div>
          ) : (
            <div className="mb-6">
              <p className="text-sm text-[var(--green-success)] font-medium">
                Completaste todos los pilares del programa
              </p>
            </div>
          )}

          {/* Action button */}
          <button
            onClick={() => {
              if (onContinuar) onContinuar();
              handleClose();
            }}
            className="btn-primary w-full flex items-center justify-center gap-2 text-base py-3"
          >
            {pilarDesbloqueado ? (
              <>
                Continuar al siguiente pilar
                <ChevronRight className="w-5 h-5" />
              </>
            ) : (
              'Cerrar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
