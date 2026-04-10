/**
 * campanasStorage.ts — Helpers de Supabase Storage para assets de creativos
 */
import { supabase, isSupabaseReady } from './supabase';
import type { Campana, Creativo, CreativoAsset } from './campanasTypes';
import { base64ToBlob } from './campanasImageGen';

const BUCKET = 'creativos-assets';

// ─── Upload de imagen ────────────────────────────────────────────────────────

export async function uploadCreativeImage(
  userId: string,
  creativoId: string,
  slideOrden: number,
  imageBase64: string,
  mimeType: string = 'image/png',
): Promise<{ storagePath: string; publicUrl: string } | null> {
  if (!isSupabaseReady() || !supabase) return null;

  const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
  const path = `${userId}/${creativoId}/${slideOrden}.${ext}`;
  const blob = base64ToBlob(imageBase64, mimeType);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: mimeType, upsert: true });

  if (uploadError) {
    console.error('Upload error:', uploadError.message);
    return null;
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return { storagePath: path, publicUrl: urlData.publicUrl };
}

// ─── Guardar asset en tabla ──────────────────────────────────────────────────

export async function saveCreativoAsset(
  asset: Omit<CreativoAsset, 'id' | 'created_at'>,
): Promise<CreativoAsset | null> {
  if (!isSupabaseReady() || !supabase) return null;

  const { data, error } = await supabase
    .from('creativo_assets')
    .insert(asset)
    .select()
    .single();

  if (error) {
    console.error('Save asset error:', error.message);
    return null;
  }
  return data as CreativoAsset;
}

// ─── Eliminar assets de un creativo ──────────────────────────────────────────

export async function deleteCreativoAssets(
  creativoId: string,
  userId: string,
): Promise<void> {
  if (!isSupabaseReady() || !supabase) return;

  // Obtener paths
  const { data: assets } = await supabase
    .from('creativo_assets')
    .select('storage_path')
    .eq('creativo_id', creativoId);

  if (assets && assets.length > 0) {
    const paths = assets.map((a: { storage_path: string }) => a.storage_path);
    await supabase.storage.from(BUCKET).remove(paths);
  }

  // Eliminar registros
  await supabase.from('creativo_assets').delete().eq('creativo_id', creativoId);
}

// ─── CRUD de Campanas ────────────────────────────────────────────────────────

export async function fetchCampanas(userId: string): Promise<Campana[]> {
  if (!isSupabaseReady() || !supabase) {
    return loadCampanasFromLocal();
  }

  const { data, error } = await supabase
    .from('campanas')
    .select('*')
    .eq('usuario_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fetch campanas error:', error.message);
    return loadCampanasFromLocal();
  }

  const campanas = data as Campana[];
  localStorage.setItem('tcd_campanas', JSON.stringify(campanas));
  return campanas;
}

export async function saveCampana(
  campana: Omit<Campana, 'id' | 'created_at' | 'updated_at'>,
): Promise<Campana | null> {
  if (!isSupabaseReady() || !supabase) {
    return saveCampanaLocal(campana);
  }

  const { data, error } = await supabase
    .from('campanas')
    .insert(campana)
    .select()
    .single();

  if (error) {
    console.error('Save campana error:', error.message);
    return saveCampanaLocal(campana);
  }

  return data as Campana;
}

export async function updateCampana(
  id: string,
  fields: Partial<Campana>,
): Promise<void> {
  if (!isSupabaseReady() || !supabase) return;

  await supabase
    .from('campanas')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id);
}

export async function deleteCampana(id: string): Promise<void> {
  if (!isSupabaseReady() || !supabase) return;
  await supabase.from('campanas').delete().eq('id', id);
}

// ─── CRUD de Creativos ───────────────────────────────────────────────────────

export async function fetchCreativos(
  userId: string,
  campanaId?: string,
): Promise<Creativo[]> {
  if (!isSupabaseReady() || !supabase) {
    return loadCreativosFromLocal(campanaId);
  }

  let query = supabase
    .from('creativos')
    .select('*, assets:creativo_assets(*)')
    .eq('usuario_id', userId)
    .order('created_at', { ascending: false });

  if (campanaId) {
    query = query.eq('campana_id', campanaId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Fetch creativos error:', error.message);
    return loadCreativosFromLocal(campanaId);
  }

  const creativos = data as Creativo[];
  localStorage.setItem('tcd_creativos', JSON.stringify(creativos));
  return creativos;
}

export async function saveCreativo(
  creativo: Omit<Creativo, 'id' | 'created_at' | 'assets'>,
): Promise<Creativo | null> {
  if (!isSupabaseReady() || !supabase) {
    return saveCreativoLocal(creativo);
  }

  const { data, error } = await supabase
    .from('creativos')
    .insert(creativo)
    .select()
    .single();

  if (error) {
    console.error('Save creativo error:', error.message);
    return saveCreativoLocal(creativo);
  }

  return data as Creativo;
}

export async function updateCreativo(
  id: string,
  fields: Partial<Creativo>,
): Promise<void> {
  if (!isSupabaseReady() || !supabase) return;
  await supabase.from('creativos').update(fields).eq('id', id);
}

export async function deleteCreativo(
  id: string,
  userId: string,
): Promise<void> {
  await deleteCreativoAssets(id, userId);
  if (isSupabaseReady() && supabase) {
    await supabase.from('creativos').delete().eq('id', id);
  }
}

// ─── Descarga ────────────────────────────────────────────────────────────────

export function downloadImage(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ─── localStorage fallbacks ──────────────────────────────────────────────────

function loadCampanasFromLocal(): Campana[] {
  try {
    const saved = localStorage.getItem('tcd_campanas');
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function loadCreativosFromLocal(campanaId?: string): Creativo[] {
  try {
    const saved = localStorage.getItem('tcd_creativos');
    const all: Creativo[] = saved ? JSON.parse(saved) : [];
    return campanaId ? all.filter(c => c.campana_id === campanaId) : all;
  } catch { return []; }
}

function saveCampanaLocal(campana: Omit<Campana, 'id' | 'created_at' | 'updated_at'>): Campana {
  const now = new Date().toISOString();
  const full: Campana = {
    ...campana,
    id: crypto.randomUUID(),
    created_at: now,
    updated_at: now,
  };
  const existing = loadCampanasFromLocal();
  localStorage.setItem('tcd_campanas', JSON.stringify([full, ...existing]));
  return full;
}

function saveCreativoLocal(creativo: Omit<Creativo, 'id' | 'created_at' | 'assets'>): Creativo {
  const full: Creativo = {
    ...creativo,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  const existing = loadCreativosFromLocal();
  localStorage.setItem('tcd_creativos', JSON.stringify([full, ...existing]));
  return full;
}
