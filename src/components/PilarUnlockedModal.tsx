/**
 * PilarUnlockedModal.tsx
 * Gamification popup shown when a pilar is completed and the next one unlocks.
 * Step 1: Achievement celebration screen.
 * Step 2: Mandatory 1-5 star satisfaction rating + optional comment.
 */
import React, { useEffect, useState } from 'react';
import { Trophy, ChevronRight, Sparkles, Star, Award } from 'lucide-react';

export interface NivelAlcanzado {
  numero: 1 | 2 | 3 | 4 | 5;
  nombre: string;
  descripcion: string;
}

interface PilarUnlockedModalProps {
  pilarCompletado: string;
  pilarDesbloqueado?: string;
  pilarNumero: number;
  nivelAlcanzado?: NivelAlcanzado;
  onClose: () => void;
  onContinuar?: () => void;
  onRating?: (rating: number, comentario: string) => Promise<void>;
}

const RATING_CONFIG: Record<number, { titulo: string; mensaje: string; placeholder: string }> = {
  5: {
    titulo: '¡Excelente!',
    mensaje: '¡Gracias por tu valoración! Nos alegra muchísimo que hayas disfrutado este pilar. Tu compromiso es lo que hace que el programa funcione.',
    placeholder: '¿Qué fue lo que más te gustó de este pilar? (opcional)',
  },
  4: {
    titulo: 'Muy bueno',
    mensaje: 'Gracias por tu feedback. Nos acercamos, pero nos gustaría saber qué nos faltó para llegar a las 5 estrellas y seguir mejorando para vos.',
    placeholder: '¿Qué podríamos mejorar para llegar a las 5 estrellas?',
  },
  3: {
    titulo: 'Aceptable',
    mensaje: 'Gracias por ser honesto. Queremos entender qué pasó: ¿hay algo que podamos mejorar o que no quedó del todo claro en este pilar?',
    placeholder: '¿Qué podríamos hacer mejor en este pilar?',
  },
  2: {
    titulo: 'Necesita mejorar',
    mensaje: 'Lamentamos que este pilar no haya cumplido tus expectativas. Tu opinión es muy valiosa para nosotros, contanos qué estuvo mal.',
    placeholder: '¿Qué no funcionó en este pilar? Tu opinión nos ayuda mucho.',
  },
  1: {
    titulo: 'Muy por debajo',
    mensaje: 'Lamentamos profundamente que este pilar haya sido una mala experiencia. Queremos saber exactamente qué pasó para poder solucionarlo.',
    placeholder: '¿Qué salió mal? Cualquier detalle nos ayuda a mejorar.',
  },
};

export default function PilarUnlockedModal({
  pilarCompletado,
  pilarDesbloqueado,
  pilarNumero,
  nivelAlcanzado,
  onClose,
  onContinuar,
  onRating,
}: PilarUnlockedModalProps) {
  const [visible, setVisible] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; delay: number }[]>([]);
  const [step, setStep] = useState<'achievement' | 'rating'>('achievement');
  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comentario, setComentario] = useState('');
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
      await onRating?.(selectedRating, comentario.trim());
    } finally {
      setSubmitting(false);
    }
    if (onContinuar) onContinuar();
    handleClose();
  };

  const activeRating = hoveredRating || selectedRating;
  const ratingConfig = selectedRating > 0 ? RATING_CONFIG[selectedRating] : null;

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

              <h2
                className="text-2xl font-medium text-[#FFFFFF] mb-2"
                style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}
              >
                Pilar {pilarNumero} completado
              </h2>
              <p className="text-lg text-[var(--accent-gold)] font-medium mb-4">
                {pilarCompletado}
              </p>

              <div className="w-16 h-px bg-[var(--accent-gold)]/30 mx-auto mb-4" />

              {nivelAlcanzado && (
                <div className="mb-5 rounded-xl border border-[var(--accent-gold)]/40 bg-[var(--accent-gold)]/5 p-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Award className="w-4 h-4 text-[var(--accent-gold)]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-gold)]">
                      Nivel {nivelAlcanzado.numero} alcanzado
                    </span>
                  </div>
                  <p className="text-lg font-medium text-[#FFFFFF] mb-1">{nivelAlcanzado.nombre}</p>
                  <p className="text-xs text-[#FFFFFF]/60 leading-relaxed">
                    {nivelAlcanzado.descripcion}
                  </p>
                </div>
              )}

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
              {/* Badge */}
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
              <p className="text-sm text-[#FFFFFF]/50 mb-5">
                Tu valoración nos ayuda a mejorar el programa
              </p>

              {/* Stars */}
              <div className="flex items-center justify-center gap-3 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => { setSelectedRating(star); setComentario(''); }}
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

              {/* Dynamic message based on rating */}
              {ratingConfig && (
                <div className="text-left mb-4 transition-all duration-300">
                  <p className="text-sm font-semibold text-[#FFFFFF] mb-1">{ratingConfig.titulo}</p>
                  <p className="text-sm text-[#FFFFFF]/60 leading-relaxed mb-3">
                    {ratingConfig.mensaje}
                  </p>
                  {selectedRating < 5 && (
                    <textarea
                      value={comentario}
                      onChange={(e) => setComentario(e.target.value)}
                      placeholder={ratingConfig.placeholder}
                      maxLength={500}
                      rows={3}
                      className="w-full bg-[#0A0A0A] border border-[rgba(245,166,35,0.2)] rounded-xl px-4 py-3 text-sm text-[#FFFFFF] placeholder-[#FFFFFF]/25 focus:outline-none focus:border-[#F5A623]/50 resize-none"
                    />
                  )}
                </div>
              )}

              {/* Submit button */}
              <button
                onClick={handleSubmitRating}
                disabled={selectedRating === 0 || submitting}
                className={`btn-primary w-full flex items-center justify-center gap-2 text-base py-3 transition-opacity ${
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
