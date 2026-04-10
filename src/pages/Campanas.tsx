/**
 * Campanas.tsx — Orquestador principal del modulo de campanas
 * Sub-nav horizontal + router de vistas
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import CampanasSubNav from '../components/campanas/CampanasSubNav';
import CampanasHome from '../components/campanas/CampanasHome';
import CopiesView from '../components/campanas/CopiesView';
import DiagnosticoView from '../components/campanas/DiagnosticoView';
import NuevaCampanaChat from '../components/campanas/NuevaCampanaChat';
import MontajeView from '../components/campanas/MontajeView';
import HistorialView from '../components/campanas/HistorialView';
import GanadoresView from '../components/campanas/GanadoresView';
import CreativosView from '../components/campanas/CreativosView';
import CreativoStudio from '../components/campanas/CreativoStudio';
import CreativoDetalle from '../components/campanas/CreativoDetalle';
import { fetchCampanas, fetchCreativos } from '../lib/campanasStorage';
import type { CampanasView, Campana, Creativo } from '../lib/campanasTypes';
import type { ProfileV2 } from '../lib/supabase';

interface CampanasProps {
  userId?: string;
  perfil?: Partial<ProfileV2>;
  geminiKey?: string;
}

export default function Campanas({ userId, perfil, geminiKey }: CampanasProps) {
  const [view, setView] = useState<CampanasView>('home');
  const [previousView, setPreviousView] = useState<CampanasView>('home');
  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [creativos, setCreativos] = useState<Creativo[]>([]);
  const [selectedCampana, setSelectedCampana] = useState<Campana | null>(null);
  const [selectedCreativo, setSelectedCreativo] = useState<Creativo | null>(null);
  const [loading, setLoading] = useState(true);
  const topRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const [camp, crea] = await Promise.all([
        fetchCampanas(userId),
        fetchCreativos(userId),
      ]);
      setCampanas(camp);
      setCreativos(crea);
    } catch {
      // Fallback handled inside fetch functions
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Scroll to top whenever view changes
  useEffect(() => {
    const el = topRef.current;
    if (!el) return;
    let parent = el.parentElement;
    while (parent) {
      const { overflowY } = getComputedStyle(parent);
      if (overflowY === 'auto' || overflowY === 'scroll') {
        parent.scrollTop = 0;
        break;
      }
      parent = parent.parentElement;
    }
  }, [view]);

  const navigateTo = (target: CampanasView) => {
    setPreviousView(view);
    setView(target);
  };

  const handleSelectCampana = (campana: Campana) => {
    setSelectedCampana(campana);
    navigateTo('studio');
  };

  const handleSelectCreativo = (creativo: Creativo) => {
    setSelectedCreativo(creativo);
    navigateTo('detail');
  };

  const handleCampanaCreated = (campana: Campana) => {
    setCampanas((prev) => [campana, ...prev]);
    setSelectedCampana(campana);
    navigateTo('studio');
  };

  const handleCreativoSaved = (creativo: Creativo) => {
    setCreativos((prev) => [creativo, ...prev]);
  };

  const handleBack = () => {
    setSelectedCampana(null);
    setSelectedCreativo(null);
    setView(previousView === 'studio' || previousView === 'detail' ? 'home' : previousView);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#F5A623]/30 border-t-[#F5A623] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Invisible anchor for scroll-to-top */}
      <div ref={topRef} />

      {/* Sub-nav */}
      <CampanasSubNav currentView={view} onNavigate={navigateTo} />

      {/* Back button for drill-down views */}
      {(view === 'studio' || view === 'detail') && (
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-sm text-[#FFFFFF]/50 hover:text-[#FFFFFF] transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
      )}

      {/* Views */}
      {view === 'home' && (
        <CampanasHome
          campanas={campanas}
          creativos={creativos}
          perfil={perfil}
          onNavigate={navigateTo}
          onSelectCampana={handleSelectCampana}
        />
      )}

      {view === 'nueva' && (
        <NuevaCampanaChat
          userId={userId}
          perfil={perfil}
          onComplete={handleCampanaCreated}
          onCancel={() => navigateTo('home')}
        />
      )}

      {view === 'copies' && (
        <CopiesView perfil={perfil ?? {}} />
      )}

      {view === 'diagnostico' && (
        <DiagnosticoView perfil={perfil ?? {}} />
      )}

      {view === 'montaje' && (
        <MontajeView perfil={perfil ?? {}} />
      )}

      {view === 'historial' && (
        <HistorialView
          campanas={campanas}
          onSelectCampana={handleSelectCampana}
          onRefresh={loadData}
        />
      )}

      {view === 'ganadores' && (
        <GanadoresView
          creativos={creativos}
          onSelectCreativo={handleSelectCreativo}
        />
      )}

      {view === 'creativos' && (
        <CreativosView
          userId={userId}
          perfil={perfil}
          geminiKey={geminiKey}
        />
      )}

      {view === 'studio' && selectedCampana && (
        <CreativoStudio
          campana={selectedCampana}
          userId={userId}
          perfil={perfil}
          geminiKey={geminiKey}
          onBack={handleBack}
          onSaved={handleCreativoSaved}
        />
      )}

      {view === 'detail' && selectedCreativo && (
        <CreativoDetalle
          creativo={selectedCreativo}
          userId={userId}
          onBack={handleBack}
          onDeleted={handleBack}
        />
      )}
    </div>
  );
}
