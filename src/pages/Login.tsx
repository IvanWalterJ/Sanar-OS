import React, { useState } from 'react';
import { Stethoscope, Eye, EyeOff, Lock, Mail, Loader2 } from 'lucide-react';
import { signIn } from '../lib/auth';
import { toast } from 'sonner';

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
      {/* Background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#C8893A]/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-[#C8893A]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-[#C8893A] to-[#D9A04E] items-center justify-center shadow-lg shadow-[#C8893A]/20 mb-4">
            <Stethoscope className="w-8 h-8 text-[#0E0B07]" />
          </div>
          <h1 className="text-2xl font-light text-[#F0EAD8] tracking-tight" style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>Tu Clínica Digital</h1>
          <p className="text-sm text-[#F0EAD8]/40 mt-1">Programa de 90 días</p>
        </div>

        {/* Card */}
        <div className="bg-[#1A1410] border border-[rgba(200,137,58,0.2)] rounded-2xl p-8 backdrop-blur-sm">
          <h2 className="text-lg font-medium text-[#F0EAD8] mb-6">Iniciar sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#F0EAD8]/60 font-medium">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F0EAD8]/40" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  disabled={loading}
                  className="w-full bg-black/20 border border-[rgba(200,137,58,0.2)] rounded-xl py-3 pl-10 pr-4 text-sm text-[#F0EAD8] placeholder-[#F0EAD8]/30 focus:outline-none focus:border-[#C8893A]/50 focus:ring-1 focus:ring-[#C8893A]/50 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#F0EAD8]/60 font-medium">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F0EAD8]/40" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className="w-full bg-black/20 border border-[rgba(200,137,58,0.2)] rounded-xl py-3 pl-10 pr-10 text-sm text-[#F0EAD8] placeholder-[#F0EAD8]/30 focus:outline-none focus:border-[#C8893A]/50 focus:ring-1 focus:ring-[#C8893A]/50 transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#F0EAD8]/40 hover:text-[#F0EAD8]/70 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email.trim() || !password.trim()}
              className="w-full py-3 rounded-xl bg-[#C8893A] hover:bg-[#D9A04E] disabled:opacity-50 disabled:cursor-not-allowed text-[#0E0B07] font-medium text-sm transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-[#C8893A]/20"
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

          <p className="text-center text-xs text-[#F0EAD8]/30 mt-6">
            ¿Problemas para ingresar? Contactá a tu coach por WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
}
