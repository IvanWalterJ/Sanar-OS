/**
 * herramientas.ts — Catálogo de 40+ herramientas IA de la Biblioteca
 * Grupos A–E del Método CLÍNICA
 */
import type { ProfileV2 } from './supabase';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type GrupoHerramienta = 'A' | 'B' | 'C' | 'D' | 'E';

export interface CampoInput {
  id: string;
  label: string;
  tipo: 'text' | 'textarea' | 'select' | 'number';
  placeholder?: string;
  opciones?: string[];
  required?: boolean;
  precargar?: keyof ProfileV2; // campo del perfil para precargar
}

export interface Herramienta {
  id: string;          // 'A1', 'B3', etc.
  grupo: GrupoHerramienta;
  titulo: string;
  descripcion: string;
  emoji: string;
  inputs: CampoInput[];
  promptTemplate: (inputs: Record<string, string>, perfil: Partial<ProfileV2>) => string;
  outputLabel: string; // nombre del output generado
}

// ─── Helpers de prompt ────────────────────────────────────────────────────────

function contextoBase(perfil: Partial<ProfileV2>): string {
  return `
Contexto del profesional de salud:
- Nombre: ${perfil.nombre ?? 'el profesional'}
- Especialidad: ${perfil.especialidad ?? 'salud'}
- Nicho: ${perfil.nicho ?? 'no definido aún'}
- Avatar de cliente ideal: ${perfil.avatar_cliente ?? 'no definido aún'}
- Posicionamiento: ${perfil.posicionamiento ?? 'no definido aún'}
`.trim();
}

// ─── GRUPO A — Identidad y Mentalidad ─────────────────────────────────────────

const GRUPO_A: Herramienta[] = [
  {
    id: 'A1',
    grupo: 'A',
    titulo: 'Perfil del Fundador',
    descripcion: 'Define quién sos como emprendedor/a de la salud: propósito, valores, legado y el "por qué" que nadie puede copiar.',
    emoji: '🌱',
    inputs: [
      { id: 'especialidad', label: 'Tu especialidad', tipo: 'text', placeholder: 'ej: Nutricionista clínica', required: true, precargar: 'especialidad' },
      { id: 'por_que', label: '¿Por qué elegiste esta profesión?', tipo: 'textarea', placeholder: 'Tu historia detrás de la vocación...', required: true },
      { id: 'legado', label: '¿Qué querés haber construido en 3 años?', tipo: 'textarea', placeholder: 'El impacto que imaginás...', required: true },
      { id: 'diferencial', label: '¿Qué tenés vos que nadie más tiene?', tipo: 'textarea', placeholder: 'Tu perspectiva única, tu método, tu experiencia...' },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Sos un coach de negocios para profesionales de la salud. Generá el "Perfil de Fundador/a" de este profesional en formato estructurado.

Inputs del usuario:
- Especialidad: ${inputs.especialidad}
- Por qué eligió esta profesión: ${inputs.por_que}
- Legado a 3 años: ${inputs.legado}
- Diferencial único: ${inputs.diferencial || 'No especificado'}

Generá un perfil que incluya:
1. PROPÓSITO (1 oración poderosa que define su misión)
2. VALORES CENTRALES (3 valores con 1 línea de explicación cada uno)
3. LEGADO A 3 AÑOS (versión expandida y específica)
4. EL DIFERENCIAL INIMITABLE (lo que nadie puede copiar de este profesional)
5. DECLARACIÓN DE IDENTIDAD (párrafo de 3-4 oraciones para presentarse)

Escribí en segunda persona ("Sos...") y en un tono directo, poderoso y sin clichés. Evitá el lenguaje genérico de coaching.
    `.trim(),
    outputLabel: 'Perfil de Fundador/a',
  },

  {
    id: 'A2',
    grupo: 'A',
    titulo: 'Carta del Día 91',
    descripcion: 'Escribí la carta que te enviará el Coach al terminar los 90 días. Es la brújula emocional del programa.',
    emoji: '💌',
    inputs: [
      { id: 'meta_financiera', label: '¿Cuál es tu meta de ingresos en 90 días?', tipo: 'text', placeholder: 'ej: $3,000 USD mensuales', required: true },
      { id: 'situacion_actual', label: '¿Cuál es tu situación actual?', tipo: 'textarea', placeholder: 'Cuántos clientes tenés, cuánto ganás hoy, qué te preocupa...', required: true },
      { id: 'miedo_principal', label: '¿Cuál es tu miedo más grande al iniciar este camino?', tipo: 'textarea', placeholder: 'Sé honesto/a...', required: true },
      { id: 'por_que_hoy', label: '¿Por qué tomaste la decisión hoy y no antes?', tipo: 'textarea', required: true },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Escribí la "Carta del Día 91" para ${perfil.nombre ?? 'este profesional de la salud'}. Esta carta la escriben hoy (Día 1) y la leen al finalizar el programa (Día 91). Es su brújula emocional.

Situación actual del profesional:
- Meta financiera a 90 días: ${inputs.meta_financiera}
- Situación hoy: ${inputs.situacion_actual}
- Miedo principal: ${inputs.miedo_principal}
- Por qué tomó la decisión hoy: ${inputs.por_que_hoy}

Escribí la carta en primera persona, como si el profesional se la escribiera a sí mismo/a. Debe:
1. Nombrar exactamente el miedo que sentía en el Día 1
2. Describir la transformación que imagina al llegar al Día 91
3. Recordarle su "por qué" más profundo
4. Tener un tono cálido pero desafiante — no motivacional vacío
5. Terminar con una frase que dé escalofríos de la buena

Extensión: 300-400 palabras. Sin títulos ni bullets — solo carta.
    `.trim(),
    outputLabel: 'Carta del Día 91',
  },

  {
    id: 'A3',
    grupo: 'A',
    titulo: 'Historia de Origen (3 versiones)',
    descripcion: 'Genera tu historia en formato A→B→C en 3 versiones: larga (300 palabras), media (150) y corta (50).',
    emoji: '📖',
    inputs: [
      { id: 'infierno', label: 'El "infierno" — ¿De dónde venías? ¿Cuál era el problema?', tipo: 'textarea', placeholder: 'La situación que viviste y que luego entendiste que podías resolver para otros...', required: true },
      { id: 'brecha', label: 'La "brecha" — ¿Cuál fue el punto de quiebre o aprendizaje?', tipo: 'textarea', placeholder: 'Qué pasó, qué descubriste, qué cambiaste...', required: true },
      { id: 'cielo', label: 'El "cielo" — ¿A dónde llegaste? ¿Cuál es tu resultado hoy?', tipo: 'textarea', placeholder: 'Dónde estás ahora y cómo ayudás a otros a llegar ahí...', required: true },
      { id: 'especialidad', label: 'Especialidad', tipo: 'text', required: true, precargar: 'especialidad' },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Generá la Historia de Origen de ${perfil.nombre ?? 'este profesional'} en 3 versiones. Estructura A→B→C (Infierno → Brecha → Cielo):

A (INFIERNO): ${inputs.infierno}
B (BRECHA): ${inputs.brecha}
C (CIELO): ${inputs.cielo}

Generá exactamente esto:

---VERSIÓN LARGA (300 palabras)---
[Historia completa, con detalles sensoriales y emocionales. Para la bio de la landing page y el primer email de bienvenida.]

---VERSIÓN MEDIA (150 palabras)---
[Historia condensada. Para la bio de Instagram extendida y el perfil de LinkedIn.]

---VERSIÓN CORTA (50 palabras)---
[Historia ultra comprimida. Para la bio de Instagram principal y el caption de presentación.]

Reglas: No uses frases genéricas de coaching. Mencioná la especialidad específica. El lector del nicho debe sentir que le están hablando de su propia vida.
    `.trim(),
    outputLabel: 'Historia de Origen (3 versiones)',
  },

  {
    id: 'A4',
    grupo: 'A',
    titulo: 'Reformulador de Creencias',
    descripcion: 'Identifica tus 3 creencias limitantes más fuertes sobre dinero, visibilidad y vocación, y las reformula con evidencia real.',
    emoji: '🔄',
    inputs: [
      { id: 'creencia1', label: 'Creencia limitante #1 (sobre dinero)', tipo: 'textarea', placeholder: 'ej: "Cobrar caro va en contra de mi vocación de ayudar"', required: true },
      { id: 'creencia2', label: 'Creencia limitante #2 (sobre visibilidad)', tipo: 'textarea', placeholder: 'ej: "Si me muestro mucho voy a parecer un vendedor, no un profesional"', required: true },
      { id: 'creencia3', label: 'Creencia limitante #3 (sobre capacidad)', tipo: 'textarea', placeholder: 'ej: "No soy experto/a suficiente para cobrar ese precio"' },
      { id: 'evidencia', label: '¿Qué resultados reales has logrado con tus clientes?', tipo: 'textarea', placeholder: 'Casos concretos, transformaciones que generaste...', required: true },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Sos un coach de mentalidad especializado en profesionales de la salud emprendedores. Reformulá estas creencias limitantes con evidencia real y lógica de negocio — no con frases vacías de autoayuda.

CREENCIAS A REFORMULAR:
1. "${inputs.creencia1}"
2. "${inputs.creencia2}"
${inputs.creencia3 ? `3. "${inputs.creencia3}"` : ''}

EVIDENCIA REAL DE SU TRABAJO:
${inputs.evidencia}

Para cada creencia generá:
- ANÁLISIS: De dónde viene esta creencia (sin victimizar, con perspectiva)
- REFORMULACIÓN POTENCIADORA: La creencia nueva que la reemplaza
- EVIDENCIA QUE LA SOSTIENE: Usando los datos reales que el profesional ya tiene

Tono: directo, específico para el sector salud, sin clichés motivacionales. Que cada reformulación duela un poco por lo obvia que es.
    `.trim(),
    outputLabel: 'Creencias Reformuladas',
  },

  {
    id: 'A5',
    grupo: 'A',
    titulo: 'Visión Financiera Clara',
    descripcion: 'Define tu meta financiera real a 90 días y calcula exactamente cuántos protocolos necesitás vender.',
    emoji: '💰',
    inputs: [
      { id: 'ingreso_meta', label: 'Ingreso mensual que querés tener en 90 días (USD)', tipo: 'number', placeholder: '3000', required: true },
      { id: 'precio_protocolo', label: 'Precio de tu protocolo principal (USD)', tipo: 'number', placeholder: '1200', required: true },
      { id: 'ingreso_actual', label: 'Ingreso mensual actual aproximado (USD)', tipo: 'number', placeholder: '800' },
      { id: 'que_significa', label: '¿Qué significa para vos llegar a esa meta? ¿Qué cambia?', tipo: 'textarea', required: true },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Generá el análisis de Visión Financiera para ${perfil.nombre ?? 'este profesional'}.

DATOS:
- Meta de ingreso mensual en 90 días: $${inputs.ingreso_meta} USD
- Precio del protocolo: $${inputs.precio_protocolo} USD
- Ingreso actual: $${inputs.ingreso_actual || 'no especificado'} USD
- Significado personal: ${inputs.que_significa}

Calculá y presentá:
1. PROTOCOLOS NECESARIOS POR MES (meta ÷ precio)
2. PROTOCOLOS NECESARIOS POR SEMANA
3. RATIO DE CIERRE REQUERIDO (si cierra 1 de cada 3 llamadas, cuántas llamadas necesita)
4. LEADS NECESARIOS POR SEMANA (asumiendo 20% de conversión lead→llamada y 30% llamada→venta)
5. BRECHA ACTUAL (cuánto falta del ingreso actual a la meta)
6. ANÁLISIS DE VIABILIDAD (¿es realista en 90 días? ¿qué se necesita?)
7. UN PLAN DE 3 HITOS (días 30, 60, 90) con números concretos

Sé específico con los números. No redondees de más. Que el plan se sienta ejecutable.
    `.trim(),
    outputLabel: 'Visión Financiera',
  },
];

// ─── GRUPO B — Claridad y Oferta ─────────────────────────────────────────────

const GRUPO_B: Herramienta[] = [
  {
    id: 'B1',
    grupo: 'B',
    titulo: 'Definición de Nicho',
    descripcion: 'Define tu nicho con máxima especificidad. De "psicóloga" a "psicóloga de ansiedad para mujeres ejecutivas de 30-45".',
    emoji: '🔬',
    inputs: [
      { id: 'especialidad', label: 'Tu especialidad base', tipo: 'text', required: true, precargar: 'especialidad' },
      { id: 'problema_que_resuelves', label: '¿Qué problema específico resolvés?', tipo: 'textarea', placeholder: 'No el síntoma — el problema de raíz', required: true },
      { id: 'perfil_cliente', label: '¿Para quién es, específicamente?', tipo: 'textarea', placeholder: 'Edad, género, profesión, situación de vida...', required: true },
      { id: 'resultado_prometido', label: '¿Cuál es el resultado que logran contigo?', tipo: 'textarea', required: true },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Generá 3 variantes de definición de nicho para este profesional, de menos a más específica.

ESPECIALIDAD: ${inputs.especialidad}
PROBLEMA: ${inputs.problema_que_resuelves}
PERFIL DEL CLIENTE: ${inputs.perfil_cliente}
RESULTADO: ${inputs.resultado_prometido}

Para cada variante:
- DEFINICIÓN DE NICHO (en 1 oración)
- POR QUÉ FUNCIONA (qué tiene de específico y poderoso)
- EJEMPLO DE BIO de Instagram usando ese nicho

Luego recomendá cuál de las 3 es la más rentable y por qué.
    `.trim(),
    outputLabel: 'Definición de Nicho (3 variantes)',
  },

  {
    id: 'B2',
    grupo: 'B',
    titulo: 'Avatar de Cliente Ideal',
    descripcion: 'Construye el perfil psicográfico completo de tu cliente ideal: dolores profundos, deseos, objeciones y el lenguaje exacto que usa.',
    emoji: '🎯',
    inputs: [
      { id: 'nicho', label: 'Tu nicho definido', tipo: 'text', required: true, precargar: 'nicho' },
      { id: 'cliente_real', label: 'Describí a tu mejor cliente actual (o ideal)', tipo: 'textarea', placeholder: 'Edad, situación de vida, qué hace, cómo llegó a vos...', required: true },
      { id: 'dolor_principal', label: '¿Cuál es el dolor más grande que tiene?', tipo: 'textarea', required: true },
      { id: 'deseo_principal', label: '¿Cuál es su deseo más profundo?', tipo: 'textarea', required: true },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Generá el Avatar de Cliente Ideal completo para el nicho: ${inputs.nicho}

CLIENTE DE REFERENCIA: ${inputs.cliente_real}
DOLOR PRINCIPAL: ${inputs.dolor_principal}
DESEO PRINCIPAL: ${inputs.deseo_principal}

El avatar debe incluir:
1. PERFIL DEMOGRÁFICO (edad, género, ocupación, ingresos aproximados, ubicación)
2. DOLORES PROFUNDOS (3-5 dolores reales, en el lenguaje que el cliente usaría, no en lenguaje técnico)
3. DESEOS ESPECÍFICOS (3-5 deseos concretos, qué quiere lograr exactamente)
4. OBJECIONES MÁS COMUNES (5 razones por las que no compraría)
5. LENGUAJE EXACTO (10 frases que esta persona dice o piensa textualmente)
6. PLATAFORMAS Y HÁBITOS DIGITALES (dónde está, qué consume)
7. PUNTO DE ENTRADA (qué busca en Google antes de encontrarte)

Nombre al avatar con un nombre de persona real (ej: "María, 38 años, médica de guardia").
    `.trim(),
    outputLabel: 'Avatar de Cliente Ideal',
  },

  {
    id: 'B3',
    grupo: 'B',
    titulo: 'Propuesta de Valor Única',
    descripcion: 'Escribe tu propuesta de valor en 1 oración que cualquier persona de tu nicho entiende en 3 segundos.',
    emoji: '💡',
    inputs: [
      { id: 'nicho', label: 'Tu nicho', tipo: 'text', required: true, precargar: 'nicho' },
      { id: 'avatar', label: 'Tu avatar (quién es tu cliente)', tipo: 'text', required: true, precargar: 'avatar_cliente' },
      { id: 'resultado', label: '¿Qué resultado específico logran contigo?', tipo: 'textarea', required: true },
      { id: 'diferencial', label: '¿Qué hace diferente tu método o enfoque?', tipo: 'textarea' },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Generá 5 variantes de Propuesta de Valor Única (PVU) para este profesional.

NICHO: ${inputs.nicho}
AVATAR: ${inputs.avatar}
RESULTADO: ${inputs.resultado}
DIFERENCIAL: ${inputs.diferencial || 'no especificado'}

Cada variante debe:
- Tener máximo 20 palabras
- Incluir el avatar específico (o el problema)
- Incluir el resultado concreto
- Ser inmediatamente comprensible (sin jerga técnica)
- Ser diferente en ángulo (dolor, resultado, método, identidad, tiempo)

Al final, elegí la más efectiva y explicá por qué en 2 líneas.
    `.trim(),
    outputLabel: 'Propuesta de Valor Única (5 variantes)',
  },

  {
    id: 'B4',
    grupo: 'B',
    titulo: 'Estructura del Protocolo',
    descripcion: 'Define la estructura completa de tu protocolo/método propio: nombre, fases, sesiones, formato y resultados verificables.',
    emoji: '📐',
    inputs: [
      { id: 'nombre_protocolo', label: '¿Cómo se llama tu protocolo o método?', tipo: 'text', placeholder: 'ej: Protocolo VIDA, Método Cuerpo Libre...', required: true },
      { id: 'duracion', label: 'Duración del protocolo', tipo: 'text', placeholder: 'ej: 12 semanas, 3 meses, 6 sesiones', required: true },
      { id: 'formato', label: 'Formato', tipo: 'select', opciones: ['1 a 1 online', '1 a 1 presencial', 'Grupal online', 'Híbrido', 'Solo asincrónico'], required: true },
      { id: 'que_incluye', label: '¿Qué incluye el protocolo?', tipo: 'textarea', placeholder: 'Sesiones, materiales, seguimiento, bonos...', required: true },
      { id: 'resultado_garantizado', label: '¿Cuál es el resultado verificable al final?', tipo: 'textarea', required: true },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Generá la estructura completa del protocolo "${inputs.nombre_protocolo}" de ${perfil.nombre ?? 'este profesional'}.

DATOS:
- Duración: ${inputs.duracion}
- Formato: ${inputs.formato}
- Qué incluye: ${inputs.que_incluye}
- Resultado prometido: ${inputs.resultado_garantizado}

Generá:
1. DESCRIPCIÓN DEL PROTOCOLO (párrafo de 100 palabras para la landing page)
2. FASES DEL PROCESO (3-4 fases con nombre atractivo y descripción de qué pasa en cada una)
3. LO QUE INCLUYE (bullet list para la página de ventas)
4. RESULTADOS VERIFICABLES EN CADA FASE
5. PROMESA PRINCIPAL (1 oración de garantía de resultado)
6. PREGUNTAS FRECUENTES (5 FAQs con respuestas)
7. PARA QUIÉN ES Y PARA QUIÉN NO ES
    `.trim(),
    outputLabel: 'Estructura del Protocolo',
  },

  {
    id: 'B5',
    grupo: 'B',
    titulo: 'Justificación de Precio',
    descripcion: 'Calcula el ROI de tu cliente y construye la justificación de precio basada en valor, no en costo.',
    emoji: '💲',
    inputs: [
      { id: 'precio', label: 'Precio de tu protocolo (USD)', tipo: 'number', required: true },
      { id: 'resultado_del_cliente', label: '¿Cuánto vale para el cliente el resultado que obtendrá?', tipo: 'textarea', placeholder: 'En dinero (si aplica), en tiempo, en calidad de vida, en salud...', required: true },
      { id: 'alternativas', label: '¿Qué alternativas tiene el cliente (y cuánto cuestan)?', tipo: 'textarea', placeholder: 'Terapia semanal por 1 año, medicación, otros tratamientos...' },
      { id: 'transformation', label: '¿Qué pasa si no cambia nada? ¿Cuál es el costo de NO hacer nada?', tipo: 'textarea', required: true },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Construí la justificación de precio basada en valor para el protocolo de ${perfil.nombre ?? 'este profesional'} a $${inputs.precio} USD.

VALOR DEL RESULTADO: ${inputs.resultado_del_cliente}
ALTERNATIVAS DEL CLIENTE: ${inputs.alternativas || 'no especificadas'}
COSTO DE NO ACTUAR: ${inputs.transformation}

Generá:
1. ANÁLISIS DE ROI (si el cliente puede cuantificar el valor, calculá el retorno)
2. COMPARACIÓN CON ALTERNATIVAS (tabla: alternativa | precio | tiempo | resultado)
3. EL COSTO DE NO ACTUAR (cuánto pierde el cliente por cada mes que posterga)
4. ARGUMENTOS DE PRECIO (3-5 argumentos sólidos para sostener el precio)
5. SCRIPT DE RESPUESTA A "ES CARO" (cómo responder a la objeción más común)
6. FRASE DE CIERRE SOBRE EL PRECIO (1 oración poderosa para la llamada de venta)
    `.trim(),
    outputLabel: 'Justificación de Precio',
  },
];

// ─── GRUPO C — Contenido ──────────────────────────────────────────────────────

const GRUPO_C: Herramienta[] = [
  {
    id: 'C1',
    grupo: 'C',
    titulo: 'Banco de Stories (21 ideas)',
    descripcion: 'Genera 21 ideas de stories divididas en 3 tipos: valor, proceso y prueba social.',
    emoji: '📱',
    inputs: [
      { id: 'nicho', label: 'Tu nicho', tipo: 'text', required: true, precargar: 'nicho' },
      { id: 'avatar', label: 'Tu avatar', tipo: 'text', required: true, precargar: 'avatar_cliente' },
      { id: 'protocolo', label: 'Nombre de tu protocolo', tipo: 'text', required: true },
      { id: 'resultado', label: 'Resultado principal que lograste con un cliente', tipo: 'textarea', required: true },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Generá 21 ideas de stories para ${perfil.nombre ?? 'este profesional'} divididas en 3 tipos (7 de cada tipo).

NICHO: ${inputs.nicho}
AVATAR: ${inputs.avatar}
PROTOCOLO: ${inputs.protocolo}
RESULTADO REAL: ${inputs.resultado}

TIPO 1 — VALOR (educan, dan una perspectiva nueva):
7 ideas de stories que enseñan algo útil para el avatar sin necesidad de vender. Cada idea debe tener: tipo de contenido + texto inicial.

TIPO 2 — PROCESO (muestran el detrás de escena):
7 ideas de stories que muestran cómo trabajás, tu método, tu día. Genera confianza y cercanía.

TIPO 3 — PRUEBA SOCIAL (resultados, testimonios, transformaciones):
7 ideas de stories que muestran resultados sin violar privacidad. Casos, antes/después, métricas.

Para cada idea: TÍTULO + PRIMER TEXTO DE LA STORY + CTA sugerido.
    `.trim(),
    outputLabel: 'Banco de 21 Stories',
  },

  {
    id: 'C2',
    grupo: 'C',
    titulo: 'Guión de Reel',
    descripcion: 'Genera el guión completo de un Reel de 30-60 segundos con hook, desarrollo y CTA.',
    emoji: '🎬',
    inputs: [
      { id: 'angulo', label: '¿Desde qué ángulo querés atacar?', tipo: 'select', opciones: ['El error más común del avatar', 'La verdad que nadie dice', 'El antes vs después', 'El mito que hay que destruir', 'Mi historia personal', 'El resultado en X tiempo'], required: true },
      { id: 'tema', label: '¿De qué trata el Reel?', tipo: 'textarea', placeholder: 'El tema específico que querés tocar...', required: true },
      { id: 'nicho', label: 'Nicho', tipo: 'text', required: true, precargar: 'nicho' },
      { id: 'cta', label: '¿Cuál es el CTA?', tipo: 'select', opciones: ['Escribime "INFO"', 'Agendá una consulta gratuita', 'Mandame un DM', 'Link en bio'], required: true },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Generá el guión completo de un Reel de 45-60 segundos para ${perfil.nombre ?? 'este profesional'}.

ÁNGULO: ${inputs.angulo}
TEMA: ${inputs.tema}
NICHO: ${inputs.nicho}
CTA: ${inputs.cta}

Estructura el guión así:

HOOK (primeros 3 segundos — el primero es el único que importa):
[Texto exacto + indicación visual]

DESARROLLO (3 puntos o 1 idea bien desarrollada):
[Texto exacto para decir + qué mostrar en pantalla]

CIERRE + CTA:
[Frase de cierre + CTA exacto]

CAPTION SUGERIDO (100-150 palabras):
[Caption con hashtags finales]

Reglas: el hook debe generar curiosidad o promover una emoción en el primer segundo. Nada de "Hola, soy..." como primera palabra.
    `.trim(),
    outputLabel: 'Guión de Reel',
  },

  {
    id: 'C3',
    grupo: 'C',
    titulo: 'Plan de Contenido Semanal',
    descripcion: 'Genera el plan de contenido de 7 días: 1 Reel + stories diarias + 1 post de valor.',
    emoji: '📅',
    inputs: [
      { id: 'semana_foco', label: '¿Cuál es el tema foco de esta semana?', tipo: 'textarea', placeholder: 'ej: Lanzamiento del protocolo, dolor del avatar, mi método...', required: true },
      { id: 'nicho', label: 'Tu nicho', tipo: 'text', required: true, precargar: 'nicho' },
      { id: 'etapa', label: '¿En qué etapa estás del programa?', tipo: 'select', opciones: ['Construyendo audiencia', 'Lanzando el protocolo', 'Escalando ventas', 'Optimizando'], required: true },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Generá el Plan de Contenido Semanal para ${perfil.nombre ?? 'este profesional'}.

TEMA FOCO: ${inputs.semana_foco}
NICHO: ${inputs.nicho}
ETAPA: ${inputs.etapa}

Para cada día (Lunes a Domingo):
- STORIES (3 ideas concretas: valor / proceso / prueba social)
- REEL O POST DE FEED (solo 1 día por semana — el de mayor energía)
- LIVE SUGERIDO (si aplica — 1 por semana máximo)
- MENSAJE PROACTIVO (1 DM o respuesta estratégica sugerida)

Al final: MÉTRICA CLAVE DE LA SEMANA (qué vas a medir para saber si funcionó).
    `.trim(),
    outputLabel: 'Plan de Contenido Semanal',
  },
];

// ─── GRUPO D — Infraestructura ────────────────────────────────────────────────

const GRUPO_D: Herramienta[] = [
  {
    id: 'D1',
    grupo: 'D',
    titulo: 'Bio de Instagram Optimizada',
    descripcion: 'Genera 3 versiones de bio de Instagram con el copy que convierte visitas en seguidores calificados.',
    emoji: '📸',
    inputs: [
      { id: 'nicho', label: 'Tu nicho', tipo: 'text', required: true, precargar: 'nicho' },
      { id: 'resultado', label: 'El resultado principal que lográs', tipo: 'text', required: true },
      { id: 'cta_bio', label: '¿Cuál es el CTA del link en bio?', tipo: 'select', opciones: ['Agenda una consulta gratuita', 'Descargá el recurso gratis', 'Escribime para más info', 'Conocé el protocolo'] },
      { id: 'credencial', label: 'Tu credencial más relevante', tipo: 'text', placeholder: 'ej: Lic. en Nutrición · 8 años · 200+ pacientes' },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Generá 3 versiones de bio de Instagram para ${perfil.nombre ?? 'este profesional'}.

NICHO: ${inputs.nicho}
RESULTADO: ${inputs.resultado}
CTA: ${inputs.cta_bio || 'consulta gratuita'}
CREDENCIAL: ${inputs.credencial || 'no especificada'}

Cada bio debe tener máximo 150 caracteres, incluir emoji estratégico, comunicar el nicho, el resultado y el CTA. Variá los ángulos: autoridad, transformación e identidad.
    `.trim(),
    outputLabel: 'Bio de Instagram (3 versiones)',
  },

  {
    id: 'D2',
    grupo: 'D',
    titulo: 'Email de Bienvenida',
    descripcion: 'Genera el email de bienvenida para quien completa tu formulario de pre-calificación o descarga tu lead magnet.',
    emoji: '✉️',
    inputs: [
      { id: 'nombre_protocolo', label: 'Nombre del protocolo o lead magnet', tipo: 'text', required: true },
      { id: 'resultado', label: 'Resultado que promete el protocolo', tipo: 'textarea', required: true },
      { id: 'proximo_paso', label: '¿Cuál es el próximo paso que querés que dé el lead?', tipo: 'select', opciones: ['Agendar una llamada', 'Ver el VSL', 'Unirse a la comunidad', 'Escribirme por WhatsApp'], required: true },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Escribí el email de bienvenida para quien se suscribió al protocolo/lead magnet "${inputs.nombre_protocolo}".

RESULTADO PROMETIDO: ${inputs.resultado}
PRÓXIMO PASO: ${inputs.proximo_paso}

El email debe:
- Asunto: directo y personal (no genérico)
- Apertura: validar la decisión de suscribirse
- Cuerpo: recordar el resultado que obtienen + pequeña dosis de historia de origen
- CTA único y claro: ${inputs.proximo_paso}
- Cierre: cálido y con la voz del profesional

Extensión: 200-300 palabras. Tono: profesional pero cercano. Sin plantilla visible.
    `.trim(),
    outputLabel: 'Email de Bienvenida',
  },

  {
    id: 'D4',
    grupo: 'D',
    titulo: 'Secuencia de Captación ManyChat',
    descripcion: 'Genera las 3 keywords disparadoras con sus respuestas automáticas y la secuencia de seguimiento post-interacción para configurar en ManyChat o herramienta equivalente.',
    emoji: '🤖',
    inputs: [
      { id: 'nombre_protocolo', label: 'Nombre del protocolo o lead magnet', tipo: 'text', required: true },
      { id: 'resultado', label: 'Resultado principal que promete el protocolo', tipo: 'textarea', required: true },
      { id: 'keyword_1', label: 'Keyword disparadora #1 (palabra que comenta o envía el lead)', tipo: 'text', placeholder: 'ej: INFO, QUIERO, PROTOCOLO', required: true },
      { id: 'keyword_2', label: 'Keyword disparadora #2', tipo: 'text', placeholder: 'ej: GUÍA, GRATIS, MÁS INFO' },
      { id: 'keyword_3', label: 'Keyword disparadora #3', tipo: 'text', placeholder: 'ej: SÍ, ME INTERESA, CÓMO' },
      { id: 'proximo_paso', label: '¿Cuál es el próximo paso que querés que dé el lead?', tipo: 'select', opciones: ['Agendar una llamada', 'Ir a la landing page', 'Ver el VSL', 'Escribirme por WhatsApp'], required: true },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Generá la secuencia completa de captación para ManyChat (o herramienta equivalente) del protocolo "${inputs.nombre_protocolo}".

RESULTADO PROMETIDO: ${inputs.resultado}
KEYWORDS: ${[inputs.keyword_1, inputs.keyword_2, inputs.keyword_3].filter(Boolean).join(', ')}
PRÓXIMO PASO: ${inputs.proximo_paso}

Para CADA keyword generá:
1. MENSAJE AUTOMÁTICO INMEDIATO (mensaje que se envía en los primeros 5 segundos — máximo 3 oraciones, empezá con el nombre del lead si es posible, incluí el link o CTA)
2. SEGUIMIENTO DÍA 1 (mensaje de seguimiento 24hs después si no respondió — empático, no insistente, recordar el beneficio)
3. SEGUIMIENTO DÍA 3 (cierre suave — el último mensaje del flujo, preguntar si tiene dudas, abrir conversación)

Luego generá:
4. RESPUESTA A "¿CUÁNTO CUESTA?" (mensaje de bot para cuando el lead pregunta el precio antes de conocer el valor)
5. RESPUESTA A "MANDAME MÁS INFO" (mensaje que da info sin spoilear todo)
6. GUÍA DE CONFIGURACIÓN: dónde y cómo pegar cada mensaje en ManyChat (paso a paso simple)

Tono: cálido, personal, sin parecer un bot. Usar el nombre del profesional en la firma.
    `.trim(),
    outputLabel: 'Secuencia de Captación ManyChat',
  },

  {
    id: 'D3',
    grupo: 'D',
    titulo: 'Copy de Landing Page',
    descripcion: 'Genera el copy completo de la landing page del protocolo: headline, subheadline, secciones y CTA.',
    emoji: '🌐',
    inputs: [
      { id: 'nombre_protocolo', label: 'Nombre del protocolo', tipo: 'text', required: true },
      { id: 'avatar', label: 'Avatar (quién es el cliente ideal)', tipo: 'textarea', required: true, precargar: 'avatar_cliente' },
      { id: 'resultado', label: 'Resultado principal en 90 días o menos', tipo: 'textarea', required: true },
      { id: 'precio', label: 'Precio (USD)', tipo: 'number', required: true },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Generá el copy completo de la landing page para el protocolo "${inputs.nombre_protocolo}" de ${perfil.nombre ?? 'este profesional'}.

AVATAR: ${inputs.avatar}
RESULTADO: ${inputs.resultado}
PRECIO: $${inputs.precio} USD

Secciones a generar:
1. HEADLINE PRINCIPAL (1 oración que detiene el scroll)
2. SUBHEADLINE (amplía el headline, 2-3 líneas)
3. SECCIÓN "PARA VOS SI..." (5 bullets del avatar ideal)
4. SECCIÓN "NO ES PARA VOS SI..." (3 bullets de descalificación)
5. EL PROBLEMA (párrafo de agitación del dolor)
6. LA SOLUCIÓN (presentación del protocolo)
7. QUÉ INCLUYE (bullets de deliverables)
8. RESULTADOS ESPERADOS (bullets de resultados)
9. SOBRE ${(perfil.nombre ?? 'el profesional').toUpperCase()} (bio de autoridad, 100 palabras)
10. FAQ (5 preguntas frecuentes)
11. CTA PRINCIPAL ("Quiero empezar" o equivalente)
12. CTA SECUNDARIO ("¿Tenés dudas? Escribime")
    `.trim(),
    outputLabel: 'Copy de Landing Page',
  },
];

// ─── GRUPO E — Conversión y Aceleración ──────────────────────────────────────

const GRUPO_E: Herramienta[] = [
  {
    id: 'E1',
    grupo: 'E',
    titulo: 'Guión de Llamada de Venta',
    descripcion: 'Genera el guión personalizado de tu llamada de diagnóstico/venta con manejo de objeciones incluido.',
    emoji: '📞',
    inputs: [
      { id: 'nombre_protocolo', label: 'Nombre del protocolo que ofrecés', tipo: 'text', required: true },
      { id: 'precio', label: 'Precio (USD)', tipo: 'number', required: true },
      { id: 'duracion_llamada', label: 'Duración de la llamada', tipo: 'select', opciones: ['30 minutos', '45 minutos', '60 minutos'], required: true },
      { id: 'objeciones', label: '¿Cuáles son las 3 objeciones más comunes que recibís?', tipo: 'textarea', placeholder: 'ej: Es caro, tengo que pensarlo, no tengo tiempo...', required: true },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Generá el guión completo de la llamada de venta del protocolo "${inputs.nombre_protocolo}" de ${perfil.nombre ?? 'este profesional'}.

PRECIO: $${inputs.precio} USD
DURACIÓN: ${inputs.duracion_llamada}
OBJECIONES PRINCIPALES: ${inputs.objeciones}

El guión debe tener:
1. APERTURA (primeros 2 minutos — romper el hielo, establecer el tono)
2. DIAGNÓSTICO (10-15 preguntas de discovery — de dónde viene, qué quiere, qué lo frenó)
3. PRESENTACIÓN (5 minutos — presentar el protocolo después de escuchar, no antes)
4. MANEJO DE OBJECIONES (respuesta a cada objeción listada)
5. CIERRE (cómo pedir el sí sin presión)
6. POST-LLAMADA (qué hacer si dice "lo pienso")

Incluí las preguntas EXACTAS, no los temas. El profesional debe poder leer el guión.
    `.trim(),
    outputLabel: 'Guión de Llamada de Venta',
  },

  {
    id: 'E2',
    grupo: 'E',
    titulo: 'Manejo de Objeciones',
    descripcion: 'Genera respuestas precisas para las 10 objeciones más comunes del sector salud.',
    emoji: '🛡️',
    inputs: [
      { id: 'precio', label: 'Precio de tu protocolo', tipo: 'number', required: true },
      { id: 'objeciones_top', label: '¿Cuáles son tus 3 objeciones más frecuentes?', tipo: 'textarea', required: true },
      { id: 'nicho', label: 'Tu nicho', tipo: 'text', required: true, precargar: 'nicho' },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Generá las respuestas a las objeciones más comunes para un profesional de salud con protocolo de $${inputs.precio} USD en el nicho: ${inputs.nicho}.

OBJECIONES REPORTADAS POR EL PROFESIONAL: ${inputs.objeciones_top}

Para cada objeción (las 3 reportadas + las 7 más comunes del sector salud):
- OBJECIÓN: [el texto exacto que dice el lead]
- INTERPRETACIÓN: lo que realmente significa (no siempre es lo que dicen)
- RESPUESTA IDEAL: texto exacto para responder (empático primero, luego racional)
- FRASE DE CIERRE: cómo retomar el camino hacia el sí

Tono: empático, sin presión, desde la perspectiva de ayudar — no de convencer.
    `.trim(),
    outputLabel: 'Manejo de Objeciones',
  },

  {
    id: 'E3',
    grupo: 'E',
    titulo: 'Análisis de Métricas',
    descripcion: 'Analiza tus métricas de las últimas 4 semanas e identifica el cuello de botella principal.',
    emoji: '📊',
    inputs: [
      { id: 'visitas_landing', label: 'Visitas a la landing (últimas 4 semanas)', tipo: 'number' },
      { id: 'leads_captados', label: 'Leads captados', tipo: 'number', required: true },
      { id: 'llamadas_agendadas', label: 'Llamadas agendadas', tipo: 'number', required: true },
      { id: 'ventas_cerradas', label: 'Ventas cerradas', tipo: 'number', required: true },
      { id: 'ingresos', label: 'Ingresos totales del período (USD)', tipo: 'number' },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Analizá las métricas del embudo de ${perfil.nombre ?? 'este profesional'} de las últimas 4 semanas.

MÉTRICAS:
- Visitas a la landing: ${inputs.visitas_landing || 'no especificado'}
- Leads captados: ${inputs.leads_captados}
- Llamadas agendadas: ${inputs.llamadas_agendadas}
- Ventas cerradas: ${inputs.ventas_cerradas}
- Ingresos: $${inputs.ingresos || '?'} USD

Calculá y presentá:
1. TASAS DE CONVERSIÓN por etapa (visitas→leads, leads→llamadas, llamadas→ventas)
2. COMPARACIÓN CON BENCHMARKS del sector salud
3. CUELLO DE BOTELLA PRINCIPAL (la etapa con mayor pérdida)
4. DIAGNÓSTICO (por qué está pasando esto)
5. 3 ACCIONES DE ALTO IMPACTO para la próxima semana
6. PROYECCIÓN (si se mejora el cuello de botella, ¿qué pasa con los ingresos?)
    `.trim(),
    outputLabel: 'Análisis de Métricas del Embudo',
  },
];

// ─── Catálogo completo ────────────────────────────────────────────────────────

export const HERRAMIENTAS: Herramienta[] = [
  ...GRUPO_A,
  ...GRUPO_B,
  ...GRUPO_C,
  ...GRUPO_D,
  ...GRUPO_E,
];

export const HERRAMIENTAS_POR_GRUPO: Record<GrupoHerramienta, Herramienta[]> = {
  A: GRUPO_A,
  B: GRUPO_B,
  C: GRUPO_C,
  D: GRUPO_D,
  E: GRUPO_E,
};

export const GRUPOS_INFO: Record<GrupoHerramienta, { titulo: string; descripcion: string; emoji: string; color: string }> = {
  A: { titulo: 'Identidad y Mentalidad', descripcion: 'Tu fundamento como emprendedor/a', emoji: '💎', color: 'violet' },
  B: { titulo: 'Claridad y Oferta', descripcion: 'Nicho, avatar, protocolo y precio', emoji: '🎯', color: 'blue' },
  C: { titulo: 'Contenido y Captación', descripcion: 'Stories, reels y plan de contenido', emoji: '📱', color: 'pink' },
  D: { titulo: 'Infraestructura Digital', descripcion: 'Bio, landing page y email', emoji: '🌐', color: 'cyan' },
  E: { titulo: 'Conversión y Aceleración', descripcion: 'Ventas, objeciones y métricas', emoji: '🚀', color: 'orange' },
};

export function getHerramienta(id: string): Herramienta | undefined {
  return HERRAMIENTAS.find((h) => h.id === id);
}
