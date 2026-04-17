export interface ExtractedProfile {
  historia_300?: string;
  historia_150?: string;
  historia_50?: string;
  proposito?: string;
  legado?: string;
  matriz_a?: string;
  matriz_b?: string;
  matriz_c?: string;
  metodo_nombre?: string;
  metodo_pasos?: string;
  oferta_high?: string;
  oferta_mid?: string;
  oferta_low?: string;
  lead_magnet?: string;
  identidad_colores?: string;
  identidad_tipografia?: string;
  identidad_logo?: string;
  identidad_tono?: string;
  nicho?: string;
  posicionamiento?: string;
  por_que_oficial?: string;
}

export interface MigrationStep1Data {
  nombre: string;
  email: string;
  password: string;
  plan: 'DWY' | 'DFY' | 'IMPLEMENTACION';
  especialidad: string;
  fecha_inicio: string;
  pilar_actual: number;
}
