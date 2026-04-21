/**
 * Dia45Banner.tsx — Banner del Día 45 (Regla #5 v7)
 *
 * Se muestra cuando el usuario ya pasó el día 45 y tiene campos críticos del ADN
 * incompletos. Bloquea visualmente el avance a Fase 4 y lista los campos
 * faltantes agrupados por pilar, con un link para volver a cada uno.
 */

import { AlertTriangle, ArrowRight } from 'lucide-react';
import type { ValidacionDia45 } from '../lib/diaValidator';
import { agruparFaltantesPorPilar, DIA_PUNTO_DE_NO_RETORNO } from '../lib/diaValidator';

interface Dia45BannerProps {
  validacion: ValidacionDia45;
  diaActual: number;
  onIrAPilar?: (pilarId: string) => void;
}

export default function Dia45Banner({ validacion, diaActual, onIrAPilar }: Dia45BannerProps) {
  if (!validacion.debeBloquearFase4) return null;

  const grupos = agruparFaltantesPorPilar(validacion.camposFaltantes);
  const diasDespues = diaActual - DIA_PUNTO_DE_NO_RETORNO;

  return (
    <div className="rounded-2xl border-2 border-[#ff5e5e]/60 bg-[#ff5e5e]/5 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#ff5e5e]/15 border border-[#ff5e5e]/30 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-[#ff5e5e]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#ff5e5e] mb-1">
            Día {diaActual} · punto de no retorno {diasDespues >= 0 ? `+${diasDespues}` : diasDespues}
          </p>
          <h3 className="text-lg font-medium text-[#FFFFFF] tracking-tight mb-1">
            Tu ADN está incompleto para activar Fase 4
          </h3>
          <p className="text-sm text-[#FFFFFF]/60">
            Faltan <span className="text-[#FFFFFF] font-semibold">{validacion.camposFaltantes.length}</span>{' '}
            campos críticos ({validacion.porcentajeCompleto}% completo). Gastar en ads con ADN incompleto
            es quemar plata. Volvé a los pilares de abajo antes de seguir.
          </p>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="h-1.5 bg-[#ff5e5e]/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-[#ff5e5e] rounded-full transition-all"
          style={{ width: `${validacion.porcentajeCompleto}%` }}
        />
      </div>

      {/* Grupos por pilar */}
      <div className="space-y-2">
        {grupos.map(({ pilar, campos }) => (
          <button
            key={pilar}
            type="button"
            onClick={() => onIrAPilar?.(pilar)}
            className="w-full text-left rounded-xl border border-[#ff5e5e]/20 bg-[#1C1C1C]/40 hover:bg-[#ff5e5e]/5 hover:border-[#ff5e5e]/40 transition-colors p-3 flex items-center gap-3 group"
          >
            <span className="text-xs font-mono text-[#ff5e5e] font-semibold flex-shrink-0">
              {pilar}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#FFFFFF]/80">
                {campos.map((c) => c.label).join(' · ')}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-[#FFFFFF]/40 group-hover:text-[#ff5e5e] transition-colors flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
