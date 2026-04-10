/**
 * PilarUnlockedModal.tsx
 * Gamification popup shown when a pilar is completed and the next one unlocks.
 * Step 1: Achievement celebration screen.
 * Step 2: Optional 1-5 star satisfaction rating.
 */
import React, { useEffect, useState } from 'react';
import { Trophy, ChevronRight, Sparkles, Star } from 'lucide-react';

interface PilarUnlockedModalProps {
  pilarCompletado: string;
  pilarDesbloqueado?: string;
  pilarNumero: number;
  onClose: () => void;
  onContinuar?: () => void;
  onRating?: (rating: number) => Promise<void>;
}

export default function PilarUnlockedModal({
  pilarCompletado,
  pilarDesbloqueado,
  pilarNumero,
  onClose,
  onContinuar,
  onRating,
}: PilarUnlockedModalProps) {
  const [visible, setVisible] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; delay: number }[]>([]);
  const [step, setStep] = useState<'achievement' | 'rating'>('achievement');
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
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

  const handleContinuar = () => {
    if (onRating) {
      setStep('rating');
    } else {
      if (onContinuar) onContinuar();
      handleClose();
    }
  };

  const handleSubmitRating = async () => {
    if (selectedRating === 0 || submitting) return;
    setSubmitting(true);
    try {
      await onRating?.(selectedRating);
    } finally {
      setSubmitting(false);
    }
    if (onContinuar) onContinuar();
    handleClose();
  };

  const handleSkipRating = () => {
    if (onContinuar) onContinuar();
    handleClose();
  };

  const activeRating = hoveredRating || selectedRating;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={(e) => { if (e.target === e.currentTarget && step === 'achievement') handleClose(); }}
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

        {/* Trophy glow */}
        <div className="relative mx-auto w-24 h-24 mb-6">
          <div className="absolute inset-0 rounded-full bg-[var(--accent-gold)]/20 animate-pulse" />
          <div className="absolute inset-2 rounded-full bg-[var(--accent-gold)]/10 border-2 border-[var(--accent-gold)]/40 flex items-center justify-center">
            <Trophy className="w-10 h-10 text-[var(--accent-gold)]" />
          </div>
        </div>

        {/* Content card */}
        <div className="card-panel p-8 rounded-2xl border border-[rgba(245,166,35,0.4)]">

          {step === 'achievement' ? (
            <>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--accent-gold)]/15 border border-[var(--accent-gold)]/30 mb-4">
                <Sparkles className="w-4 h-4 text-[var(--accent-gold)]" />
                <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent-gold)]">
                  Pilar completado
                </span>
              </div>

              {/* Title */}
              <h2
                className="text-2xl font-medium text-[#FFFFFF] mb-2"
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
                  <p className="text-sm text-[#FFFFFF]/60 mb-1">Nuevo pilar desbloqueado:</p>
                  <p className="text-lg font-medium text-[#FFFFFF]">{pilarDesbloqueado}</p>
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
                onClick={handleContinuar}
                className="btn-primary w-full flex items-center justify-center gap-2 text-base py-3"
              >
                {pilarDesbloqueado ? (
                  <>
                    Continuar al siguiente pilar
                    <ChevronRight className="w-5 h-5" />
                  </>
                ) : (
                  'Continuar'
                )}
              </button>
            </>
          ) : (
            <>
              {/* Rating step */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--accent-gold)]/15 border border-[var(--accent-gold)]/30 mb-4">
                <Star className="w-4 h-4 text-[var(--accent-gold)]" />
                <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent-gold)]">
                  Tu opinión
                </span>
              </div>

              <h2
                className="text-2xl font-medium text-[#FFFFFF] mb-2"
                style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}
              >
                ¿Cómo te pareció este pilar?
              </h2>
              <p className="text-sm text-[#FFFFFF]/50 mb-6">
                Tu valoración nos ayuda a mejorar el programa
              </p>

              {/* Stars */}
              <div className="flex items-center justify-center gap-3 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setSelectedRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="transition-transform hover:scale-110 focus:outline-none"
                    aria-label={`${star} estrella${star > 1 ? 's' : ''}`}
                  >
                    <Star
                      className={`w-10 h-10 transition-colors duration-150 ${
                        star <= activeRating
                          ? 'text-[#F5A623] fill-[#F5A623]'
                          : 'text-[#FFFFFF]/20'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Rating label */}
              <p className="text-sm text-[#FFFFFF]/40 mb-6 h-5">
                {activeRating === 1 && 'Necesita mejorar'}
                {activeRating === 2 && 'Regular'}
                {activeRating === 3 && 'Bueno'}
                {activeRating === 4 && 'Muy bueno'}
                {activeRating === 5 && 'Excelente'}
              </p>

              {/* Submit button */}
              <button
                onClick={handleSubmitRating}
                disabled={selectedRating === 0 || submitting}
                className={`btn-primary w-full flex items-center justify-center gap-2 text-base py-3 mb-3 transition-opacity ${
                  selectedRating === 0 ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              >
                {submitting ? 'Enviando...' : 'Enviar valoración'}
              </button>

            </>
          )}
        </div>
      </div>
    </div>
  );
}
