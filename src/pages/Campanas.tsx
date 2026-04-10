import React, { useState, useEffect, useCallback } from 'react';
import CampanasDashboard from '../components/campanas/CampanasDashboard';
import CampanaWizard from '../components/campanas/CampanaWizard';
import CreativoStudio from '../components/campanas/CreativoStudio';
import CreativoDetalle from '../components/campanas/CreativoDetalle';
import CreativoGallery from '../components/campanas/CreativoGallery';
import { fetchCampanas, fetchCreativos } from '../lib/campanasStorage';
import type { CampanasView, Campana, Creativo } from '../lib/campanasTypes';
import type { ProfileV2 } from '../lib/supabase';

interface CampanasProps {
  userId?: string;
  perfil?: Partial<ProfileV2>;
  geminiKey?: string;
}

export default function Campanas({ userId, perfil, geminiKey }: CampanasProps) {
  const [view, setView] = useState<CampanasView>('dashboard');
  const [campanas, setCampanas] = useState<Campana[]>([]);
  const [creativos, setCreativos] = useState<Creativo[]>([]);
  const [selectedCampana, setSelectedCampana] = useState<Campana | null>(null);
  const [selectedCreativo, setSelectedCreativo] = useState<Creativo | null>(null);
  const [loading, setLoading] = useState(true);

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

  const handleNewCampana = () => {
    setSelectedCampana(null);
    setView('wizard');
  };

  const handleCampanaCreated = (campana: Campana) => {
    setCampanas((prev) => [campana, ...prev]);
    setSelectedCampana(campana);
    setView('studio');
  };

  const handleSelectCampana = (campana: Campana) => {
    setSelectedCampana(campana);
    setView('studio');
  };

  const handleSelectCreativo = (creativo: Creativo) => {
    setSelectedCreativo(creativo);
    setView('detail');
  };

  const handleCreativoSaved = (creativo: Creativo) => {
    setCreativos((prev) => [creativo, ...prev]);
    // Stay in studio for more creatives
  };

  const handleBackToDashboard = () => {
    setSelectedCampana(null);
    setSelectedCreativo(null);
    setView('dashboard');
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
    <div className="max-w-6xl mx-auto">
      {view === 'dashboard' && (
        <CampanasDashboard
          campanas={campanas}
          creativos={creativos}
          onNewCampana={handleNewCampana}
          onSelectCampana={handleSelectCampana}
          onSelectCreativo={handleSelectCreativo}
          onRefresh={loadData}
          userId={userId}
        />
      )}

      {view === 'wizard' && (
        <CampanaWizard
          userId={userId}
          perfil={perfil}
          geminiKey={geminiKey}
          onComplete={handleCampanaCreated}
          onCancel={handleBackToDashboard}
        />
      )}

      {view === 'studio' && selectedCampana && (
        <CreativoStudio
          campana={selectedCampana}
          userId={userId}
          perfil={perfil}
          geminiKey={geminiKey}
          onBack={handleBackToDashboard}
          onSaved={handleCreativoSaved}
        />
      )}

      {view === 'detail' && selectedCreativo && (
        <CreativoDetalle
          creativo={selectedCreativo}
          userId={userId}
          onBack={handleBackToDashboard}
          onDeleted={handleBackToDashboard}
        />
      )}
    </div>
  );
}
