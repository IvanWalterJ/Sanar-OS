import React, { useState } from 'react';
import { Stethoscope, Eye, EyeOff, Lock, Mail, Loader2, X } from 'lucide-react';
import { signIn, sendPasswordReset } from '../lib/auth';
import { toast } from 'sonner';

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);

    if (error) {
      toast.error('Credenciales incorrectas. Verificá tu email y contraseña.');
      return;
    }

    onLogin();
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setResetLoading(true);
    const { error } = await sendPasswordReset(resetEmail);
    setResetLoading(false);
    if (error) {
      toast.error(`No se pudo enviar el mail: ${error}`);
      return;
    }
    toast.success('Te enviamos un mail con el link para recuperar tu contraseña.');
    setShowResetModal(false);
    setResetEmail('');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      {/* Background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#F5A623]/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-[#F5A623]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F5A623] to-[#FFB94D] items-center justify-center shadow-lg shadow-[#F5A623]/20 mb-4">
            <Stethoscope className="w-8 h-8 text-[#0A0A0A]" />
          </div>
          <h1 className="text-2xl font-light text-[#FFFFFF] tracking-tight" style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>Tu Clínica Digital</h1>
          <p className="text-sm text-[#FFFFFF]/40 mt-1">Programa de 90 días</p>
        </div>

        {/* Card */}
        <div className="bg-[#1C1C1C] border border-[rgba(245,166,35,0.2)] rounded-2xl p-8 backdrop-blur-sm">
          <h2 className="text-lg font-medium text-[#FFFFFF] mb-6">Iniciar sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#FFFFFF]/60 font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FFFFFF]/40" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  disabled={loading}
                  className="w-full bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-xl py-3 pl-10 pr-4 text-sm text-[#FFFFFF] placeholder-[#FFFFFF]/30 focus:outline-none focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/50 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#FFFFFF]/60 font-medium">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FFFFFF]/40" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className="w-full bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-xl py-3 pl-10 pr-10 text-sm text-[#FFFFFF] placeholder-[#FFFFFF]/30 focus:outline-none focus:border-[#F5A623]/50 focus:ring-1 focus:ring-[#F5A623]/50 transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#FFFFFF]/40 hover:text-[#FFFFFF]/70 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email.trim() || !password.trim()}
              className="w-full py-3 rounded-xl bg-[#F5A623] hover:bg-[#FFB94D] disabled:opacity-50 disabled:cursor-not-allowed text-[#0A0A0A] font-medium text-sm transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-[#F5A623]/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Ingresando...
                </>
              ) : (
                'Ingresar al programa'
              )}
            </button>
          </form>

          <button
            type="button"
            onClick={() => { setResetEmail(email); setShowResetModal(true); }}
            className="w-full text-center text-xs text-[#F5A623]/70 hover:text-[#F5A623] mt-4 transition-colors"
          >
            ¿Olvidaste tu contraseña?
          </button>

          <p className="text-center text-xs text-[#FFFFFF]/30 mt-6">
            ¿Otros problemas? Contactá a tu coach por WhatsApp.
          </p>
        </div>
      </div>

      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#141414] border border-[rgba(245,166,35,0.2)] rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(245,166,35,0.1)]">
              <h3 className="text-sm font-semibold text-[#FFFFFF]">Recuperar contraseña</h3>
              <button
                onClick={() => setShowResetModal(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#FFFFFF]/40 hover:text-[#FFFFFF] hover:bg-[#FFFFFF]/5 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleResetRequest} className="p-5 space-y-4">
              <p className="text-xs text-[#FFFFFF]/60">
                Te enviaremos un mail con un link para que puedas fijar una nueva contraseña.
              </p>
              <div>
                <label className="block text-[10px] font-bold text-[#FFFFFF]/40 uppercase tracking-wider mb-1.5">Email</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  autoFocus
                  disabled={resetLoading}
                  className="w-full bg-black/20 border border-[rgba(245,166,35,0.2)] rounded-xl px-4 py-2.5 text-sm text-[#FFFFFF] placeholder-[#FFFFFF]/30 focus:outline-none focus:border-[#F5A623]/50 transition-colors disabled:opacity-50"
                />
              </div>
              <button
                type="submit"
                disabled={resetLoading || !resetEmail.trim()}
                className="w-full py-2.5 rounded-xl bg-[#F5A623] hover:bg-[#FFB94D] disabled:opacity-50 text-black text-sm font-bold transition-all flex items-center justify-center gap-2"
              >
                {resetLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : 'Enviar mail de recuperación'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
