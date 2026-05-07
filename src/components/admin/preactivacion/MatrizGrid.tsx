import React from 'react';
import { Check } from 'lucide-react';
import { SECTIONS, STEPS, TOTAL_STEPS } from '../../../lib/preactivacionSteps';
import {
  type ChecksByCliente,
  isChecked,
  progressPct,
  completedCount,
} from '../../../lib/preactivacionCheck';

export interface MatrizClienteRow {
  id: string;
  nombre: string;
  metodo?: string;
  initial: string;
}

interface MatrizGridProps {
  clientes: MatrizClienteRow[];
  checks: ChecksByCliente;
  onToggle: (clienteId: string, stepId: string, on: boolean) => void;
}

export default function MatrizGrid({ clientes, checks, onToggle }: MatrizGridProps) {
  if (clientes.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-[#FFFFFF]/40 text-sm">
        Sin clientes que coincidan
      </div>
    );
  }

  return (
    <div className="overflow-auto scrollbar-hide" style={{ maxHeight: 'calc(100vh - 220px)' }}>
      <table
        className="border-separate"
        style={{ borderSpacing: 0, fontSize: 14 }}
      >
        <thead>
          {/* Group row */}
          <tr>
            <th
              className="sticky left-0 top-0 z-50 bg-[#0E0E0E]"
              style={{ minWidth: 240 }}
            />
            {SECTIONS.map((sec, idx) => (
              <th
                key={sec.id}
                colSpan={sec.items.length}
                className="sticky top-0 z-30 bg-[#141414] text-[#F5A623] uppercase tracking-widest"
                style={{
                  fontFamily: 'monospace',
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: 1.5,
                  padding: '10px 0',
                  textAlign: 'center',
                  borderBottom: '1px solid rgba(245,166,35,0.15)',
                  borderLeft: idx === 0 ? 'none' : '2px solid #252830',
                }}
              >
                {sec.short}
              </th>
            ))}
            <th
              className="sticky right-0 top-0 z-40 bg-[#141414] text-[#F5A623]"
              style={{
                fontFamily: 'monospace',
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: 1.5,
                padding: '10px 10px',
                textAlign: 'center',
                borderBottom: '1px solid rgba(245,166,35,0.15)',
                borderLeft: '2px solid #252830',
                textTransform: 'uppercase',
              }}
            >
              %
            </th>
          </tr>

          {/* Column labels */}
          <tr>
            <th
              className="sticky left-0 z-40 bg-[#0E0E0E]"
              style={{
                top: 40,
                minWidth: 240,
                borderBottom: '2px solid rgba(245,166,35,0.15)',
              }}
            />
            {STEPS.map((step, idx) => {
              const isFirstOfSection =
                idx === 0 || STEPS[idx - 1].sectionId !== step.sectionId;
              const lines = step.lbl
                .replace(/­/g, '·')
                .split('\n');
              return (
                <th
                  key={step.id}
                  className="sticky bg-[#0F0F0F]"
                  style={{
                    top: 40,
                    padding: '8px 4px 10px',
                    fontWeight: 500,
                    verticalAlign: 'bottom',
                    borderBottom: '2px solid rgba(245,166,35,0.15)',
                    borderLeft: isFirstOfSection ? '2px solid #252830' : 'none',
                  }}
                  title={step.title}
                >
                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 11,
                      color: 'rgba(255,255,255,0.65)',
                      lineHeight: 1.35,
                      textAlign: 'center',
                      minWidth: 72,
                      maxWidth: 84,
                      wordBreak: 'break-word',
                      hyphens: 'manual',
                    }}
                  >
                    {lines.map((line, i) => (
                      <React.Fragment key={i}>
                        {line}
                        {i < lines.length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </div>
                </th>
              );
            })}
            <th
              className="sticky right-0 z-30 bg-[#0F0F0F]"
              style={{
                top: 40,
                padding: '8px 10px 10px',
                borderBottom: '2px solid rgba(245,166,35,0.15)',
                borderLeft: '2px solid #252830',
              }}
            >
              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.65)',
                  textAlign: 'center',
                }}
              >
                Total
              </div>
            </th>
          </tr>
        </thead>

        <tbody>
          {clientes.map((cl) => {
            const pct = progressPct(checks, cl.id);
            const done = completedCount(checks, cl.id);
            const isComplete = pct === 100;
            return (
              <tr key={cl.id} className="group">
                {/* Sticky client cell */}
                <td
                  className="sticky left-0 z-20 bg-[#0A0A0A] group-hover:bg-[#141414] transition-colors"
                  style={{
                    padding: '0 14px',
                    height: 56,
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="rounded-md flex items-center justify-center shrink-0"
                      style={{
                        width: 36,
                        height: 36,
                        background: 'rgba(245,166,35,0.12)',
                        color: '#F5A623',
                        fontFamily: 'monospace',
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      {cl.initial}
                    </div>
                    <div className="min-w-0">
                      <div
                        className="truncate font-semibold"
                        style={{ maxWidth: 175, fontSize: 14 }}
                        title={cl.nombre}
                      >
                        {cl.nombre}
                      </div>
                      {cl.metodo && (
                        <div
                          className="truncate"
                          style={{
                            color: 'rgba(255,255,255,0.45)',
                            fontFamily: 'monospace',
                            fontSize: 11,
                            maxWidth: 175,
                          }}
                        >
                          {cl.metodo}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                {STEPS.map((step, idx) => {
                  const isFirstOfSection =
                    idx === 0 || STEPS[idx - 1].sectionId !== step.sectionId;
                  const on = isChecked(checks, cl.id, step.id);
                  return (
                    <td
                      key={step.id}
                      className="group-hover:bg-[#141414] transition-colors"
                      style={{
                        padding: 0,
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        height: 56,
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        borderLeft: isFirstOfSection
                          ? '2px solid #252830'
                          : '1px solid rgba(26,28,34,0.35)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => onToggle(cl.id, step.id, !on)}
                        title={`${step.title} — ${on ? 'destildar' : 'tildar'}`}
                        className="inline-flex items-center justify-center transition-all hover:border-[#F5A623]/60"
                        style={{
                          width: 30,
                          height: 30,
                          border: `2px solid ${on ? '#22C55E' : '#3a3d44'}`,
                          borderRadius: 7,
                          cursor: 'pointer',
                          background: on ? '#22C55E' : 'transparent',
                        }}
                      >
                        {on && <Check className="w-4 h-4" style={{ color: '#0A0A0A', strokeWidth: 3 }} />}
                      </button>
                    </td>
                  );
                })}

                {/* Sticky total */}
                <td
                  className="sticky right-0 z-10 bg-[#0A0A0A] group-hover:bg-[#141414] transition-colors"
                  style={{
                    padding: '0 12px',
                    height: 56,
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    borderLeft: '2px solid #252830',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    fontSize: 14,
                    minWidth: 84,
                    color: isComplete ? '#22C55E' : 'rgba(255,255,255,0.7)',
                    fontWeight: isComplete ? 700 : 500,
                  }}
                  title={`${done}/${TOTAL_STEPS} pasos`}
                >
                  {pct}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
