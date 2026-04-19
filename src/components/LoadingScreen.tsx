/**
 * LoadingScreen.tsx
 * Pantalla de carga premium con anillos concentricos, glow dorado y pulso.
 */
import { Stethoscope } from 'lucide-react';

interface Props {
  label?: string;
}

export default function LoadingScreen({ label = 'Cargando tu espacio' }: Props) {
  return (
    <div className="relative min-h-screen bg-[#0A0A0A] flex items-center justify-center overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full bg-[#F5A623]/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#F5A623]/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#F5A623]/5 blur-[100px] pointer-events-none" />

      <div className="relative flex flex-col items-center gap-8">
        {/* Spinner con multiples anillos */}
        <div className="relative w-24 h-24">
          {/* Anillo externo estatico */}
          <div className="absolute inset-0 rounded-full border border-[#F5A623]/15" />

          {/* Anillo medio girando lento */}
          <div
            className="absolute inset-1 rounded-full border-2 border-transparent border-t-[#F5A623]/40 border-r-[#F5A623]/20"
            style={{ animation: 'spin 2.4s linear infinite' }}
          />

          {/* Anillo principal girando rapido */}
          <div
            className="absolute inset-3 rounded-full border-2 border-transparent border-t-[#F5A623] border-r-[#F5A623]/60"
            style={{ animation: 'spin 1.2s cubic-bezier(0.5, 0.1, 0.5, 0.9) infinite' }}
          />

          {/* Glow dorado detras */}
          <div className="absolute inset-0 rounded-full bg-[#F5A623]/20 blur-2xl animate-pulse" />

          {/* Icono central */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-[#F5A623]/10 border border-[#F5A623]/30 flex items-center justify-center shadow-lg shadow-[#F5A623]/20">
              <Stethoscope className="w-5 h-5 text-[#F5A623]" />
            </div>
          </div>
        </div>

        {/* Texto + puntos animados */}
        <div className="flex flex-col items-center gap-2">
          <p
            className="text-[15px] text-[#FFFFFF]/70 tracking-wide"
            style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}
          >
            {label}
          </p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623]/60" style={{ animation: 'dot-bounce 1.2s ease-in-out infinite', animationDelay: '0s' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623]/60" style={{ animation: 'dot-bounce 1.2s ease-in-out infinite', animationDelay: '0.15s' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623]/60" style={{ animation: 'dot-bounce 1.2s ease-in-out infinite', animationDelay: '0.3s' }} />
          </div>
        </div>
      </div>

      {/* Keyframes locales (los globales viven en index.css) */}
      <style>{`
        @keyframes dot-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
