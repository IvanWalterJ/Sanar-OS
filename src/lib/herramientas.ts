/**
 * herramientas.ts — Catálogo de herramientas IA de la Biblioteca
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
  precargar?: keyof ProfileV2;
}

export interface Herramienta {
  id: string;
  grupo: GrupoHerramienta;
  titulo: string;
  descripcion: string;
  emoji: string;
  inputs: CampoInput[];
  promptTemplate: (inputs: Record<string, string>, perfil: Partial<ProfileV2>) => string;
  outputLabel: string;
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
- Historia de origen: ${perfil.historia_origen ?? 'no cargada aún'}
`.trim();
}

// ─── GRUPO A — Identidad y Mentalidad ─────────────────────────────────────────

const GRUPO_A: Herramienta[] = [
  {
    id: 'A1',
    grupo: 'A',
    titulo: 'Perfil del Fundador',
    descripcion:
      'Construye tu perfil completo como emprendedor/a de la salud: propósito, valores, nicho inicial, cliente ideal, visión a 3 años y el diferencial que nadie puede copiar. Este perfil precarga todas las herramientas de la Biblioteca.',
    emoji: '🌱',
    inputs: [
      {
        id: 'especialidad',
        label: 'Tu especialidad profesional',
        tipo: 'text',
        placeholder: 'ej: Nutricionista clínica, Psicólogo, Kinesiólogo...',
        required: true,
        precargar: 'especialidad',
      },
      {
        id: 'nicho_inicial',
        label: '¿A quién querés ayudar específicamente?',
        tipo: 'textarea',
        placeholder: 'ej: Mujeres de 30-45 con ansiedad crónica, profesionales con sobrepeso por estrés laboral...',
        required: true,
      },
      {
        id: 'por_que',
        label: '¿Por qué elegiste esta profesión? ¿Qué historia hay detrás?',
        tipo: 'textarea',
        placeholder: 'Tu vocación, tu momento de quiebre, por qué esto y no otra cosa...',
        required: true,
      },
      {
        id: 'resultado_que_logras',
        label: '¿Qué resultado concreto lográs con tus clientes?',
        tipo: 'textarea',
        placeholder: 'No el proceso ("hago sesiones de..."), sino el resultado final que transforma su vida...',
        required: true,
      },
      {
        id: 'situacion_actual',
        label: '¿Cómo está tu práctica hoy? Sé honesto/a',
        tipo: 'textarea',
        placeholder: 'Cuántos clientes tenés, cómo conseguís pacientes, qué te frustra, qué funciona...',
        required: true,
      },
      {
        id: 'legado',
        label: '¿Qué querés haber construido en 3 años?',
        tipo: 'textarea',
        placeholder: 'El impacto que imaginás, los ingresos, la libertad de tiempo, el reconocimiento...',
        required: true,
      },
      {
        id: 'diferencial',
        label: '¿Qué tenés vos que ningún otro profesional de tu especialidad tiene?',
        tipo: 'textarea',
        placeholder: 'Tu perspectiva única, tu método, una experiencia personal, una combinación de saberes...',
      },
      {
        id: 'mayor_miedo',
        label: '¿Cuál es tu mayor miedo en este camino emprendedor?',
        tipo: 'textarea',
        placeholder: 'Cobrar caro, mostrarte en redes, no ser suficientemente experto/a, fallar...',
      },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Sos un coach de negocios para profesionales de la salud. Generá el "Perfil de Fundador/a" completo de este profesional.

DATOS DEL PROFESIONAL:
- Especialidad: ${inputs.especialidad}
- A quién quiere ayudar: ${inputs.nicho_inicial}
- Por qué eligió esta profesión: ${inputs.por_que}
- Resultado que logra con clientes: ${inputs.resultado_que_logras}
- Situación actual: ${inputs.situacion_actual}
- Legado a 3 años: ${inputs.legado}
- Diferencial único: ${inputs.diferencial || 'por descubrir'}
- Mayor miedo: ${inputs.mayor_miedo || 'no especificado'}

Generá el Perfil de Fundador/a con estas secciones:

1. PROPÓSITO CENTRAL (1 oración poderosa que define su misión — sin clichés)
2. NICHO INICIAL RECOMENDADO (basado en lo que describió — específico, con nombre de avatar)
3. DECLARACIÓN DE IDENTIDAD (3-4 oraciones para presentarse en cualquier contexto)
4. VALORES CENTRALES (3 valores con 1 línea de explicación cada uno, anclados en su historia real)
5. EL DIFERENCIAL INIMITABLE (lo que nadie puede copiar, expandido con ejemplos concretos)
6. LEGADO A 3 AÑOS (versión expandida y específica con métricas aspiracionales)
7. SOMBRA A TRABAJAR (el miedo o creencia que más puede frenarlo — dicho con respeto pero sin suavizar)
8. PRIMER PASO RECOMENDADO (qué debería hacer en los próximos 7 días basado en su situación actual)

Escribí en segunda persona ("Sos...", "Tu diferencial es...") en tono directo, poderoso y sin clichés de coaching.
    `.trim(),
    outputLabel: 'Perfil de Fundador/a',
  },

  {
    id: 'A2',
    grupo: 'A',
    titulo: 'Carta del Día 91',
    descripcion:
      'Escribí la carta que te enviará el Coach al terminar los 90 días. Es la brújula emocional del programa y el recordatorio de por qué empezaste.',
    emoji: '💌',
    inputs: [
      {
        id: 'meta_financiera',
        label: '¿Cuál es tu meta de ingresos mensuales en 90 días? (USD)',
        tipo: 'text',
        placeholder: 'ej: $3,000 USD mensuales',
        required: true,
      },
      {
        id: 'situacion_actual',
        label: '¿Cómo es tu vida y tu práctica hoy, en el Día 1?',
        tipo: 'textarea',
        placeholder: 'Cuántos clientes tenés, cuánto ganás, cómo te sentís, qué te preocupa, cuál es tu mayor tensión...',
        required: true,
      },
      {
        id: 'miedo_principal',
        label: '¿Cuál es tu miedo más grande al iniciar este camino?',
        tipo: 'textarea',
        placeholder: 'Sé completamente honesto/a — esto solo lo leés vos...',
        required: true,
      },
      {
        id: 'por_que_hoy',
        label: '¿Por qué tomaste la decisión hoy y no hace 6 meses?',
        tipo: 'textarea',
        placeholder: '¿Qué pasó, qué te hizo clic, qué cansancio llegó a su límite?',
        required: true,
      },
      {
        id: 'para_quien',
        label: '¿Por quién o para qué hacés este esfuerzo más allá de vos?',
        tipo: 'textarea',
        placeholder: 'Tu familia, una deuda que querés saldar, la libertad que querés vivir, el ejemplo que querés dar...',
      },
      {
        id: 'como_te_ves_dia91',
        label: '¿Cómo te imaginás el Día 91? ¿Qué cambió?',
        tipo: 'textarea',
        placeholder: 'Sé específico/a — no solo los números, también cómo te sentís, cómo arrancás el día...',
        required: true,
      },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Escribí la "Carta del Día 91" para ${perfil.nombre ?? 'este profesional de la salud'}.
Esta carta la escribe HOY (Día 1) y la lee al terminar el programa (Día 91). Es su brújula emocional — el texto que le recordará en los días difíciles por qué empezó.

SITUACIÓN DEL PROFESIONAL EN EL DÍA 1:
- Meta financiera: ${inputs.meta_financiera}
- Cómo es su vida hoy: ${inputs.situacion_actual}
- Miedo principal: ${inputs.miedo_principal}
- Por qué tomó la decisión ahora: ${inputs.por_que_hoy}
- Para quién lo hace: ${inputs.para_quien || 'no especificado'}
- Cómo se imagina el Día 91: ${inputs.como_te_ves_dia91}

La carta debe:
1. Estar escrita en primera persona, como si el profesional se la escribiera a sí mismo/a
2. Nombrar exactamente el miedo que sentía en el Día 1 (sin suavizarlo)
3. Recordarle el momento concreto en que tomó la decisión (el "por qué hoy")
4. Describir la transformación que imaginó — y validarla con lo que logró
5. Mencionar a quien lo/la mueve más allá de sí mismo/a
6. Tener un tono cálido pero con fuerza — como una carta de un amigo muy honesto
7. Terminar con una frase que dé escalofríos de la buena — que lo haga recordar quién decidió ser

Extensión: 350-450 palabras. Sin títulos ni bullets — solo carta corrida.
    `.trim(),
    outputLabel: 'Carta del Día 91',
  },

  {
    id: 'A3',
    grupo: 'A',
    titulo: 'Historia de Origen (3 versiones)',
    descripcion:
      'Genera tu historia en formato A→B→C (Infierno → Brecha → Cielo) en 3 versiones: larga (300 palabras), media (150) y corta (50). Listas para landing, bio e Instagram.',
    emoji: '📖',
    inputs: [
      {
        id: 'infierno',
        label: 'El "infierno" — ¿De dónde venías? ¿Cuál era el problema real?',
        tipo: 'textarea',
        placeholder: 'La situación concreta que viviste — emociones, circunstancias, cómo era tu vida antes del cambio...',
        required: true,
      },
      {
        id: 'brecha',
        label: 'La "brecha" — ¿Cuál fue el punto de quiebre o aprendizaje clave?',
        tipo: 'textarea',
        placeholder: 'El momento específico en que algo cambió — una decisión, un descubrimiento, una persona, un fracaso...',
        required: true,
      },
      {
        id: 'cielo',
        label: 'El "cielo" — ¿A dónde llegaste? ¿Cuál es tu situación hoy?',
        tipo: 'textarea',
        placeholder: 'Dónde estás ahora, qué lograste, qué podés hacer hoy que antes no podías...',
        required: true,
      },
      {
        id: 'conexion_cliente',
        label: '¿Cómo conecta tu historia con el problema de tus clientes?',
        tipo: 'textarea',
        placeholder: 'Por qué tu historia hace que tu cliente sienta que vos entendés su situación mejor que nadie...',
        required: true,
      },
      {
        id: 'especialidad',
        label: 'Especialidad',
        tipo: 'text',
        required: true,
        precargar: 'especialidad',
      },
      {
        id: 'tono',
        label: '¿Cómo querés sonar?',
        tipo: 'select',
        opciones: ['Cálido y cercano', 'Profesional y directo', 'Vulnerable y auténtico', 'Inspirador y motivador'],
        required: true,
      },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Generá la Historia de Origen de ${perfil.nombre ?? 'este profesional'} en 3 versiones con estructura A→B→C:

A (INFIERNO): ${inputs.infierno}
B (BRECHA): ${inputs.brecha}
C (CIELO): ${inputs.cielo}
CONEXIÓN CON EL CLIENTE: ${inputs.conexion_cliente}
TONO: ${inputs.tono}

Generá exactamente:

---VERSIÓN LARGA (300 palabras)---
[Historia completa, con detalles sensoriales y emocionales. Para landing page y primer email de bienvenida. El lector debe sentir que le están hablando de su propia vida.]

---VERSIÓN MEDIA (150 palabras)---
[Historia condensada. Para la bio de Instagram extendida, LinkedIn y presentaciones en vivo.]

---VERSIÓN CORTA (50 palabras)---
[Historia ultra comprimida. Para bio de Instagram principal y caption de presentación.]

Reglas: no uses frases genéricas de coaching. Mencioná la especialidad específica. La versión corta debe provocar curiosidad. Cada versión debe sonar diferente, no como un resumen de la anterior.
    `.trim(),
    outputLabel: 'Historia de Origen (3 versiones)',
  },

  {
    id: 'A4',
    grupo: 'A',
    titulo: 'Reformulador de Creencias',
    descripcion:
      'Identifica tus creencias limitantes más fuertes sobre dinero, visibilidad y vocación, y las reformula con evidencia real de tu propia historia.',
    emoji: '🔄',
    inputs: [
      {
        id: 'creencia1',
        label: 'Creencia limitante #1 (sobre dinero o precio)',
        tipo: 'textarea',
        placeholder: 'ej: "Cobrar caro va en contra de mi vocación de ayudar", "El dinero corrompe"...',
        required: true,
      },
      {
        id: 'creencia2',
        label: 'Creencia limitante #2 (sobre visibilidad o redes)',
        tipo: 'textarea',
        placeholder: 'ej: "Si me muestro mucho voy a parecer un vendedor", "No soy fotogénico/a"...',
        required: true,
      },
      {
        id: 'creencia3',
        label: 'Creencia limitante #3 (sobre capacidad o mérito)',
        tipo: 'textarea',
        placeholder: 'ej: "Todavía no soy experto/a suficiente", "Otros hacen esto mejor que yo"...',
      },
      {
        id: 'de_donde_viene',
        label: '¿De dónde creés que vienen estas creencias? (familia, escuela, cultura médica...)',
        tipo: 'textarea',
        placeholder: 'Qué te enseñaron sobre el dinero y los profesionales de la salud...',
      },
      {
        id: 'evidencia',
        label: '¿Qué resultados REALES has logrado con tus clientes?',
        tipo: 'textarea',
        placeholder: 'Casos concretos, transformaciones que generaste, feedback que recibiste — aunque te parezcan pequeños...',
        required: true,
      },
      {
        id: 'profesional_admirado',
        label: '¿Hay algún profesional de la salud que admires que también cobra bien y es visible?',
        tipo: 'textarea',
        placeholder: 'Nombre (puede ser anónimo), qué admiras de cómo maneja dinero y visibilidad...',
      },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Sos un coach de mentalidad especializado en profesionales de la salud. Tu trabajo es reformular creencias limitantes con lógica, evidencia real y respeto — sin frases vacías de autoayuda.

CREENCIAS A REFORMULAR:
1. "${inputs.creencia1}"
2. "${inputs.creencia2}"
${inputs.creencia3 ? `3. "${inputs.creencia3}"` : ''}

ORIGEN PERCIBIDO: ${inputs.de_donde_viene || 'no especificado'}
EVIDENCIA REAL DE SU TRABAJO: ${inputs.evidencia}
REFERENTE QUE ADMIRA: ${inputs.profesional_admirado || 'no especificado'}

Para CADA creencia generá:
- ANÁLISIS DE ORIGEN: de dónde viene esta creencia y por qué fue útil en otro momento (sin victimizar, con perspectiva histórica)
- EL COSTO REAL: qué está perdiendo concretamente por sostener esta creencia (en dinero, tiempo, pacientes, libertad)
- REFORMULACIÓN POTENCIADORA: la creencia nueva — específica, creíble, anclada en su historia y evidencia real
- EVIDENCIA QUE LA SOSTIENE: usando los datos reales del profesional para validar la nueva creencia
- ACCIÓN CONCRETA: 1 acción pequeña que puede hacer esta semana para actuar desde la nueva creencia

Tono: directo, específico para el sector salud, sin clichés. Que cada reformulación duela un poco por lo obvia que termina siendo.
    `.trim(),
    outputLabel: 'Creencias Reformuladas',
  },

  {
    id: 'A5',
    grupo: 'A',
    titulo: 'Visión Financiera Clara',
    descripcion:
      'Define tu meta financiera real a 90 días, calcula exactamente cuántos protocolos necesitás vender y diseña los 3 hitos del camino.',
    emoji: '💰',
    inputs: [
      {
        id: 'ingreso_meta',
        label: 'Ingreso mensual que querés tener en 90 días (USD)',
        tipo: 'number',
        placeholder: '3000',
        required: true,
      },
      {
        id: 'ingreso_actual',
        label: 'Ingreso mensual actual aproximado (USD)',
        tipo: 'number',
        placeholder: '800',
        required: true,
      },
      {
        id: 'precio_protocolo',
        label: 'Precio que estás pensando cobrar por tu protocolo (USD)',
        tipo: 'number',
        placeholder: '1200',
        required: true,
      },
      {
        id: 'gastos_mensuales',
        label: 'Gastos mensuales fijos (alquiler, servicios, herramientas, etc.) (USD)',
        tipo: 'number',
        placeholder: '500',
      },
      {
        id: 'horas_disponibles',
        label: '¿Cuántas horas por semana podés dedicar al crecimiento del negocio (no a atender pacientes)?',
        tipo: 'number',
        placeholder: '10',
        required: true,
      },
      {
        id: 'que_significa',
        label: '¿Qué significa para vos llegar a esa meta? ¿Qué cambia en tu vida?',
        tipo: 'textarea',
        placeholder: 'No solo el número — qué podés hacer con ese dinero, qué presión se va, qué se abre...',
        required: true,
      },
      {
        id: 'mayor_traba',
        label: '¿Cuál creés que es la mayor traba para llegar a esa meta?',
        tipo: 'textarea',
        placeholder: 'Sin clientes suficientes, precio bajo, miedo a vender, falta de visibilidad, poco tiempo...',
      },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Generá el análisis de Visión Financiera completo para ${perfil.nombre ?? 'este profesional'}.

DATOS:
- Meta de ingreso mensual en 90 días: $${inputs.ingreso_meta} USD
- Ingreso actual: $${inputs.ingreso_actual} USD
- Precio del protocolo: $${inputs.precio_protocolo} USD
- Gastos mensuales: $${inputs.gastos_mensuales || '0'} USD
- Horas disponibles para el negocio (no para atención): ${inputs.horas_disponibles} hs/semana
- Significado personal de la meta: ${inputs.que_significa}
- Mayor traba percibida: ${inputs.mayor_traba || 'no especificada'}

Calculá y presentá:
1. INGRESO NETO OBJETIVO (meta - gastos) y cuántos protocolos representa
2. PROTOCOLOS NECESARIOS POR MES y por semana
3. EMBUDO REQUERIDO (cuántas llamadas y leads necesitás asumiendo 30% cierre en llamada y 20% conversión lead→llamada)
4. BRECHA Y TIEMPO (cuánto falta, cuánto puede crecer por mes si es constante)
5. DIAGNÓSTICO DE VIABILIDAD (¿es realista en 90 días con las horas disponibles? ¿Qué tiene que pasar sí o sí?)
6. LOS 3 HITOS (qué lograr en el día 30, 60 y 90 — con números específicos)
7. EL RIESGO PRINCIPAL (qué puede hacer que no llegue a la meta y cómo mitigarlo)
8. UNA FRASE SOBRE EL SIGNIFICADO (expandir por qué esto importa más allá del dinero)

Sé específico con los números. No redondees de más. Que el plan se sienta ejecutable y honesto.
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
    descripcion:
      'Define tu nicho con máxima especificidad. De "psicóloga" a "psicóloga de ansiedad para mujeres ejecutivas de 30-45 que no pueden desconectarse del trabajo".',
    emoji: '🔬',
    inputs: [
      {
        id: 'especialidad',
        label: 'Tu especialidad base',
        tipo: 'text',
        required: true,
        precargar: 'especialidad',
      },
      {
        id: 'problema_que_resuelves',
        label: '¿Qué problema específico resolvés?',
        tipo: 'textarea',
        placeholder: 'No el síntoma superficial — el problema real que cambia la vida del cliente. Ej: no "bajo de peso" sino "dejó de ser prisionero de la comida"...',
        required: true,
      },
      {
        id: 'perfil_cliente',
        label: '¿Para quién exactamente? (sé lo más específico posible)',
        tipo: 'textarea',
        placeholder: 'Edad aproximada, género, ocupación, situación de vida, nivel de ingreso, dónde vive...',
        required: true,
      },
      {
        id: 'resultado_prometido',
        label: '¿Cuál es el resultado específico y verificable que logran contigo?',
        tipo: 'textarea',
        placeholder: 'Con número y tiempo si es posible: "en 12 semanas logran X" o "salen del programa sabiendo hacer Y"...',
        required: true,
      },
      {
        id: 'por_que_te_eligen',
        label: '¿Por qué te elegiría alguien de ese perfil a vos y no a otro profesional?',
        tipo: 'textarea',
        placeholder: 'Tu experiencia personal, tu método diferente, tu historia, tu forma de trabajar...',
      },
      {
        id: 'clientes_actuales',
        label: '¿Cómo son tus 2-3 mejores clientes actuales? Describílos',
        tipo: 'textarea',
        placeholder: 'No tiene que ser exacto — patrones que notas en quienes más resultados logran contigo...',
      },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Generá 3 variantes de definición de nicho para este profesional, de menos a más específica.

ESPECIALIDAD: ${inputs.especialidad}
PROBLEMA QUE RESUELVE: ${inputs.problema_que_resuelves}
PERFIL DEL CLIENTE: ${inputs.perfil_cliente}
RESULTADO PROMETIDO: ${inputs.resultado_prometido}
POR QUÉ LO ELIGEN: ${inputs.por_que_te_eligen || 'no especificado'}
MEJORES CLIENTES ACTUALES: ${inputs.clientes_actuales || 'no especificado'}

Para cada variante:
- DEFINICIÓN DE NICHO (en 1 oración, máximo 20 palabras)
- POR QUÉ FUNCIONA (qué tiene de específico y poderoso — en qué se diferencia de los demás)
- EJEMPLO DE BIO de Instagram usando ese nicho
- EJEMPLO DE POST de valor para ese nicho (solo el hook de 1 línea)

Luego:
- RECOMENDACIÓN: cuál de las 3 es la más rentable ahora y por qué (considera competencia, demanda y capacidad del profesional)
- ADVERTENCIA: qué nicho evitar y por qué
    `.trim(),
    outputLabel: 'Definición de Nicho (3 variantes)',
  },

  {
    id: 'B2',
    grupo: 'B',
    titulo: 'Avatar de Cliente Ideal',
    descripcion:
      'Construye el perfil psicográfico profundo de tu cliente ideal: dolores, deseos, objeciones, lenguaje exacto y dónde encontrarlo.',
    emoji: '🎯',
    inputs: [
      {
        id: 'nicho',
        label: 'Tu nicho definido',
        tipo: 'text',
        required: true,
        precargar: 'nicho',
      },
      {
        id: 'cliente_real',
        label: 'Describí a tu mejor cliente actual (o al ideal que imaginás)',
        tipo: 'textarea',
        placeholder: 'Nombre de pila, edad, qué hace, cómo vive, cómo llegó a vos, qué cambió en su vida...',
        required: true,
      },
      {
        id: 'dolor_profundo',
        label: '¿Cuál es el dolor más profundo que tiene? No el síntoma — el miedo de fondo',
        tipo: 'textarea',
        placeholder: 'ej: miedo a envejecer enfermo, vergüenza de su cuerpo, miedo a que su familia lo vea sufrir...',
        required: true,
      },
      {
        id: 'deseo_secreto',
        label: '¿Cuál es su deseo más profundo? El que quizás no diría en voz alta',
        tipo: 'textarea',
        placeholder: 'No "bajar de peso" sino "sentirse atractiva en una reunión sin esconderse", por ejemplo...',
        required: true,
      },
      {
        id: 'intentos_previos',
        label: '¿Qué intentó antes para resolver el problema y no funcionó?',
        tipo: 'textarea',
        placeholder: 'Otras terapias, dietas, medicación, libros, apps, otros profesionales...',
        required: true,
      },
      {
        id: 'objeciones',
        label: '¿Por qué no compraría o tardaría en decidirse?',
        tipo: 'textarea',
        placeholder: 'Precio, tiempo, desconfianza, ya probó antes, vergüenza, necesita consultarlo...',
        required: true,
      },
      {
        id: 'donde_esta',
        label: '¿Dónde pasa el tiempo digitalmente? ¿Qué consume?',
        tipo: 'textarea',
        placeholder: 'Instagram, TikTok, LinkedIn, podcasts, YouTube, qué tipo de contenido ve...',
      },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Generá el Avatar de Cliente Ideal completo para el nicho: ${inputs.nicho}

CLIENTE DE REFERENCIA: ${inputs.cliente_real}
DOLOR PROFUNDO: ${inputs.dolor_profundo}
DESEO SECRETO: ${inputs.deseo_secreto}
INTENTOS PREVIOS: ${inputs.intentos_previos}
OBJECIONES: ${inputs.objeciones}
DÓNDE ESTÁ: ${inputs.donde_esta || 'no especificado'}

El avatar debe incluir:
1. NOMBRE Y PERFIL (nombre de pila + datos demográficos específicos — edad, ocupación, ingresos aproximados, situación de vida)
2. UN DÍA EN SU VIDA (descripción de cómo es un día típico, con el problema presente)
3. DOLORES PROFUNDOS (5 dolores reales en el lenguaje que él/ella usaría, no en lenguaje técnico)
4. DESEOS ESPECÍFICOS (5 deseos concretos — lo que quiere lograr, sentir, ser)
5. LO QUE YA INTENTÓ (y por qué no funcionó — esto es clave para diferenciarse)
6. OBJECIONES REALES (5 razones por las que no compraría, con qué hay detrás de cada una)
7. LENGUAJE EXACTO (10 frases textuales que esta persona dice o piensa — para usar en el copy)
8. DISPARADORES DE COMPRA (qué hace que finalmente tome la decisión de invertir)
9. PLATAFORMAS Y HÁBITOS (dónde está, qué consume, qué lo hace confiar en un profesional)
10. PUNTO DE ENTRADA (qué busca en Google o pregunta en foros antes de encontrarte)
    `.trim(),
    outputLabel: 'Avatar de Cliente Ideal',
  },

  {
    id: 'B3',
    grupo: 'B',
    titulo: 'Propuesta de Valor Única',
    descripcion:
      'Escribe tu propuesta de valor en 1 oración que cualquier persona de tu nicho entiende en 3 segundos y quiere saber más.',
    emoji: '💡',
    inputs: [
      {
        id: 'nicho',
        label: 'Tu nicho',
        tipo: 'text',
        required: true,
        precargar: 'nicho',
      },
      {
        id: 'avatar',
        label: 'Tu avatar (quién es tu cliente, en pocas palabras)',
        tipo: 'text',
        required: true,
        precargar: 'avatar_cliente',
      },
      {
        id: 'resultado',
        label: '¿Qué resultado específico logran contigo?',
        tipo: 'textarea',
        placeholder: 'Con tiempo y número si es posible: "en X semanas logran Y"...',
        required: true,
      },
      {
        id: 'sin_lo_malo',
        label: '¿Qué es lo que NO tienen que hacer / sacrificar / sufrir con tu método?',
        tipo: 'textarea',
        placeholder: 'Sin dietas extremas, sin medicación, sin dejar su trabajo, sin sesiones interminables...',
      },
      {
        id: 'diferencial',
        label: '¿Qué hace diferente tu método o enfoque?',
        tipo: 'textarea',
        placeholder: 'Tu metodología propia, tu combinación de saberes, tu historia, tu forma de acompañar...',
      },
      {
        id: 'tiempo_resultado',
        label: '¿En cuánto tiempo logran el resultado principal?',
        tipo: 'text',
        placeholder: 'ej: 8 semanas, 3 meses, 6 sesiones...',
      },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Generá 5 variantes de Propuesta de Valor Única (PVU) para este profesional.

NICHO: ${inputs.nicho}
AVATAR: ${inputs.avatar}
RESULTADO: ${inputs.resultado}
SIN LO MALO: ${inputs.sin_lo_malo || 'no especificado'}
DIFERENCIAL: ${inputs.diferencial || 'no especificado'}
TIEMPO: ${inputs.tiempo_resultado || 'no especificado'}

Cada variante debe:
- Tener máximo 20 palabras
- Incluir el avatar o el problema específico
- Incluir el resultado concreto
- Ser inmediatamente comprensible (sin jerga técnica ni médica)
- Atacar desde un ángulo diferente: dolor / resultado / método / identidad / tiempo / transformación

Formato para cada variante:
VARIANTE X: [La propuesta de valor]
ÁNGULO: [qué emoción o lógica activa]
DÓNDE USAR: [bio, headline de landing, apertura de Reel, etc.]

Al final:
GANADORA RECOMENDADA: [cuál es la más efectiva y por qué — basado en el contexto del profesional]
CÓMO TESTEARLA: [cómo saber si funciona en las primeras 2 semanas]
    `.trim(),
    outputLabel: 'Propuesta de Valor Única (5 variantes)',
  },

  {
    id: 'B4',
    grupo: 'B',
    titulo: 'Estructura del Protocolo',
    descripcion:
      'Define la estructura completa de tu protocolo/método propio: nombre, fases, sesiones, formato, precio y resultados verificables.',
    emoji: '📐',
    inputs: [
      {
        id: 'nombre_protocolo',
        label: '¿Cómo se llama (o podría llamarse) tu protocolo o método?',
        tipo: 'text',
        placeholder: 'ej: Protocolo VIDA, Método Cuerpo Libre, Programa Mente Clínica...',
        required: true,
      },
      {
        id: 'duracion',
        label: 'Duración del protocolo',
        tipo: 'text',
        placeholder: 'ej: 12 semanas, 3 meses, 6 sesiones mensuales...',
        required: true,
      },
      {
        id: 'formato',
        label: 'Formato',
        tipo: 'select',
        opciones: ['1 a 1 online', '1 a 1 presencial', 'Grupal online', 'Híbrido presencial y online', 'Solo asincrónico (grabado)'],
        required: true,
      },
      {
        id: 'que_incluye',
        label: '¿Qué incluye el protocolo? (sé detallado)',
        tipo: 'textarea',
        placeholder: 'Sesiones semanales, materiales, seguimiento entre sesiones, acceso a recursos, bonos, soporte por WhatsApp...',
        required: true,
      },
      {
        id: 'resultado_garantizado',
        label: '¿Cuál es el resultado verificable y específico al finalizar?',
        tipo: 'textarea',
        placeholder: 'El cliente puede decir "al terminar logré X" — qué sabe hacer, qué tiene, cómo está...',
        required: true,
      },
      {
        id: 'precio_actual',
        label: '¿Cuánto estás cobrando o pensando cobrar? (USD)',
        tipo: 'number',
        placeholder: '1500',
      },
      {
        id: 'proceso_trabajo',
        label: 'Describí paso a paso cómo trabajás con un cliente desde el día 1',
        tipo: 'textarea',
        placeholder: 'Primera sesión diagnóstica, evaluación inicial, qué pasa semana a semana, cómo terminan...',
        required: true,
      },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Generá la estructura completa del protocolo "${inputs.nombre_protocolo}" de ${perfil.nombre ?? 'este profesional'}.

DATOS:
- Duración: ${inputs.duracion}
- Formato: ${inputs.formato}
- Qué incluye: ${inputs.que_incluye}
- Resultado prometido: ${inputs.resultado_garantizado}
- Precio actual o estimado: $${inputs.precio_actual || 'a definir'} USD
- Proceso de trabajo: ${inputs.proceso_trabajo}

Generá:
1. NOMBRE DEFINITIVO DEL PROTOCOLO (el que ya tiene + 2 alternativas si puede mejorarse)
2. DESCRIPCIÓN PARA LA LANDING (párrafo de 80-100 palabras — para quien llega sin saber nada)
3. FASES DEL PROTOCOLO (3-4 fases con nombre atractivo, descripción de qué pasa y qué resultado parcial se logra)
4. LO QUE INCLUYE (bullet list para la página de ventas — con formato "accés a / recibís / tenés")
5. RESULTADOS VERIFICABLES (qué puede decir el cliente al finalizar cada fase)
6. PARA QUIÉN ES Y PARA QUIÉN NO ES (criterio de calificación)
7. PROMESA PRINCIPAL (1 oración de resultado — la que va arriba del precio)
8. GARANTÍA SUGERIDA (cómo podría proteger al cliente sin ponerse en riesgo el profesional)
9. PREGUNTAS FRECUENTES (5 FAQs que realmente recibe un profesional de este tipo)
    `.trim(),
    outputLabel: 'Estructura del Protocolo',
  },

  {
    id: 'B5',
    grupo: 'B',
    titulo: 'Justificación de Precio',
    descripcion:
      'Calcula el ROI de tu cliente y construye los argumentos sólidos para sostener tu precio sin bajar la guardia.',
    emoji: '💲',
    inputs: [
      {
        id: 'precio',
        label: 'Precio de tu protocolo (USD)',
        tipo: 'number',
        required: true,
      },
      {
        id: 'precio_actual_cobras',
        label: '¿Cuánto cobrás actualmente por consulta o tu servicio equivalente? (USD)',
        tipo: 'number',
        placeholder: '80',
      },
      {
        id: 'resultado_del_cliente',
        label: '¿Cuánto vale para el cliente el resultado que obtendrá?',
        tipo: 'textarea',
        placeholder: 'En dinero (tiempo ahorrado, trabajo recuperado), en salud, en calidad de vida, en relaciones...',
        required: true,
      },
      {
        id: 'alternativas',
        label: '¿Qué alternativas tiene el cliente (y cuánto cuestan)?',
        tipo: 'textarea',
        placeholder: 'Terapia semanal por 1 año, medicación, otras dietas o tratamientos, consultores similares...',
      },
      {
        id: 'costo_no_actuar',
        label: '¿Qué pasa si no cambia nada? ¿Cuál es el costo de esperar 6 meses más?',
        tipo: 'textarea',
        placeholder: 'En salud deteriorada, en trabajo perdido, en relaciones afectadas, en autoestima...',
        required: true,
      },
      {
        id: 'objecion_mas_comun',
        label: '¿Cuál es la objeción de precio más común que recibís?',
        tipo: 'textarea',
        placeholder: 'ej: "Es caro", "Tengo que pensarlo", "No tengo ese dinero ahora"...',
        required: true,
      },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Construí la justificación completa de precio para el protocolo de ${perfil.nombre ?? 'este profesional'} a $${inputs.precio} USD.

PRECIO ACTUAL QUE COBRA: $${inputs.precio_actual_cobras || 'no especificado'}
VALOR DEL RESULTADO PARA EL CLIENTE: ${inputs.resultado_del_cliente}
ALTERNATIVAS Y SUS COSTOS: ${inputs.alternativas || 'no especificadas'}
COSTO DE NO ACTUAR: ${inputs.costo_no_actuar}
OBJECIÓN MÁS COMÚN: ${inputs.objecion_mas_comun}

Generá:
1. ANÁLISIS DE ROI (si el resultado puede cuantificarse, calculá el retorno del cliente — cuánto gana o recupera por cada dólar invertido)
2. COMPARACIÓN CON ALTERNATIVAS (tabla: alternativa | costo total | tiempo | resultado | conveniencia)
3. EL COSTO DE ESPERAR (cuánto pierde el cliente por cada mes que posterga — en dinero, salud, tiempo)
4. LOS 5 ARGUMENTOS DE PRECIO MÁS SÓLIDOS (lógica de valor, no de costo)
5. SCRIPT PARA "ES CARO" (respuesta exacta, empática y sin bajar el precio)
6. SCRIPT PARA "TENGO QUE PENSARLO" (cómo ayudar sin presionar)
7. SCRIPT PARA "NO TENGO ESE DINERO AHORA" (opciones reales — cuotas, prioridades, costo de no invertir)
8. FRASE DE CIERRE SOBRE EL PRECIO (1 oración poderosa para la llamada de venta)
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
    descripcion:
      'Genera 21 ideas de stories divididas en 3 tipos: valor, proceso y prueba social. Listas para ejecutar sin pensar.',
    emoji: '📱',
    inputs: [
      {
        id: 'nicho',
        label: 'Tu nicho',
        tipo: 'text',
        required: true,
        precargar: 'nicho',
      },
      {
        id: 'avatar',
        label: 'Tu avatar (quién te ve)',
        tipo: 'text',
        required: true,
        precargar: 'avatar_cliente',
      },
      {
        id: 'protocolo',
        label: 'Nombre de tu protocolo o servicio principal',
        tipo: 'text',
        required: true,
      },
      {
        id: 'resultado_real',
        label: 'Un resultado real que lograste con un cliente (puede ser anónimo)',
        tipo: 'textarea',
        placeholder: 'ej: "Una clienta bajó 8kg en 10 semanas sin dejar de comer lo que le gusta"',
        required: true,
      },
      {
        id: 'etapa',
        label: '¿En qué etapa estás en redes?',
        tipo: 'select',
        opciones: ['Arrancando desde cero (menos de 500 seguidores)', 'Creciendo (500-5k seguidores)', 'Consolidando (5k+ seguidores)'],
        required: true,
      },
      {
        id: 'plataforma',
        label: '¿Cuál es tu plataforma principal?',
        tipo: 'select',
        opciones: ['Instagram', 'TikTok', 'LinkedIn', 'Facebook', 'Todas por igual'],
        required: true,
      },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Generá 21 ideas de stories para ${perfil.nombre ?? 'este profesional'} divididas en 3 tipos (7 de cada tipo).

NICHO: ${inputs.nicho}
AVATAR: ${inputs.avatar}
PROTOCOLO: ${inputs.protocolo}
RESULTADO REAL: ${inputs.resultado_real}
ETAPA EN REDES: ${inputs.etapa}
PLATAFORMA PRINCIPAL: ${inputs.plataforma}

TIPO 1 — VALOR (educan y dan perspectiva nueva sin vender):
7 ideas de stories que enseñan algo útil. El avatar debe pensar "esto es exactamente lo que necesitaba saber".
Formato para cada idea: TIPO DE STORY | PRIMER TEXTO LITERAL | CTA sugerido

TIPO 2 — PROCESO (muestran cómo trabajás, generan confianza):
7 ideas que muestran el detrás de escena, la metodología, el día a día. Humanización + autoridad.
Formato para cada idea: TIPO DE STORY | PRIMER TEXTO LITERAL | CTA sugerido

TIPO 3 — PRUEBA SOCIAL (resultados sin violar privacidad):
7 ideas que muestran transformaciones, antes/después, feedback de clientes. Sin mentir, sin exagerar.
Formato para cada idea: TIPO DE STORY | PRIMER TEXTO LITERAL | CTA sugerido

Al final: 3 ERRORES COMUNES al hacer stories en este nicho que el profesional debe evitar.
    `.trim(),
    outputLabel: 'Banco de 21 Stories',
  },

  {
    id: 'C2',
    grupo: 'C',
    titulo: 'Guión de Reel',
    descripcion:
      'Genera el guión completo de un Reel de 30-60 segundos con hook que para el scroll, desarrollo y CTA.',
    emoji: '🎬',
    inputs: [
      {
        id: 'angulo',
        label: '¿Desde qué ángulo querés atacar?',
        tipo: 'select',
        opciones: [
          'El error más común del avatar',
          'La verdad que nadie dice en mi especialidad',
          'El antes vs después (resultado real)',
          'El mito que hay que destruir',
          'Mi historia personal de transformación',
          'El resultado en X tiempo (número concreto)',
          'La pregunta que todos tienen miedo de hacer',
          'Por qué lo que te dijeron está mal',
        ],
        required: true,
      },
      {
        id: 'tema',
        label: '¿De qué trata el Reel? (sé específico)',
        tipo: 'textarea',
        placeholder: 'El tema concreto que querés abordar, la idea central...',
        required: true,
      },
      {
        id: 'nicho',
        label: 'Nicho',
        tipo: 'text',
        required: true,
        precargar: 'nicho',
      },
      {
        id: 'duracion',
        label: '¿Cuánto debe durar?',
        tipo: 'select',
        opciones: ['15-20 segundos (micro-reel)', '30-45 segundos', '45-60 segundos', '60-90 segundos'],
        required: true,
      },
      {
        id: 'cta',
        label: '¿Cuál es el CTA?',
        tipo: 'select',
        opciones: ['Escribime "INFO"', 'Agendá una consulta gratuita', 'Mandame un DM', 'Link en bio', 'Guardalo para después'],
        required: true,
      },
      {
        id: 'resultado_real',
        label: '¿Hay un resultado real que puedas mencionar? (opcional pero potente)',
        tipo: 'textarea',
        placeholder: 'Caso real de cliente (anónimo): "Una paciente logró X en Y tiempo"...',
      },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Generá el guión completo de un Reel de ${inputs.duracion} para ${perfil.nombre ?? 'este profesional'}.

ÁNGULO: ${inputs.angulo}
TEMA: ${inputs.tema}
NICHO: ${inputs.nicho}
CTA: ${inputs.cta}
RESULTADO REAL: ${inputs.resultado_real || 'no especificado'}

Estructura el guión así:

HOOK (primeros 2-3 segundos — lo único que decide si siguen o no):
[Texto exacto + instrucción visual (qué mostrar en pantalla)]
[2 HOOKS ALTERNATIVOS para testear]

DESARROLLO ([número de puntos según la duración]):
[Texto exacto para decir + qué mostrar en pantalla para cada punto]

CIERRE + CTA:
[Frase de cierre que crea urgencia o apertura + CTA exacto]

CAPTION SUGERIDO (80-120 palabras + hashtags):
[Caption completo listo para pegar]

THUMBNAIL IDEA:
[Qué poner en el primer frame para que se vea bien en el feed]

Reglas: el hook no puede empezar con "Hola" ni presentación. Debe provocar curiosidad, emoción o controversia en el primer segundo. El desarrollo debe ser accionable. El CTA debe ser específico.
    `.trim(),
    outputLabel: 'Guión de Reel',
  },

  {
    id: 'C3',
    grupo: 'C',
    titulo: 'Plan de Contenido Semanal',
    descripcion:
      'Genera el plan de contenido de 7 días: Reel + stories diarias + post de valor. Todo personalizado.',
    emoji: '📅',
    inputs: [
      {
        id: 'semana_foco',
        label: '¿Cuál es el tema o foco de esta semana?',
        tipo: 'textarea',
        placeholder: 'ej: Lanzando el protocolo, trabajando el dolor del avatar, mostrando resultados de clientes, construyendo autoridad...',
        required: true,
      },
      {
        id: 'nicho',
        label: 'Tu nicho',
        tipo: 'text',
        required: true,
        precargar: 'nicho',
      },
      {
        id: 'etapa',
        label: '¿En qué etapa estás del negocio?',
        tipo: 'select',
        opciones: [
          'Construyendo audiencia desde cero',
          'Lanzando el protocolo por primera vez',
          'Relanzando / mejorando el protocolo',
          'Escalando ventas con audiencia existente',
          'Mantenimiento y seguimiento',
        ],
        required: true,
      },
      {
        id: 'resultado_cliente_semana',
        label: '¿Tenés algún resultado de cliente que puedas compartir esta semana?',
        tipo: 'textarea',
        placeholder: 'Opcional pero muy valioso: resultado específico, transformación reciente (anónimo si hace falta)...',
      },
      {
        id: 'energia_disponible',
        label: '¿Cuánto tiempo/energía tenés para crear contenido esta semana?',
        tipo: 'select',
        opciones: [
          'Poco (1-2 horas máximo)',
          'Normal (2-4 horas)',
          'Mucho (tengo tiempo para grabar varios videos)',
        ],
        required: true,
      },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Generá el Plan de Contenido Semanal completo para ${perfil.nombre ?? 'este profesional'}.

TEMA FOCO DE LA SEMANA: ${inputs.semana_foco}
NICHO: ${inputs.nicho}
ETAPA DEL NEGOCIO: ${inputs.etapa}
RESULTADO DE CLIENTE DISPONIBLE: ${inputs.resultado_cliente_semana || 'ninguno esta semana'}
TIEMPO/ENERGÍA DISPONIBLE: ${inputs.energia_disponible}

Para cada día de la semana (Lunes a Domingo) generá:
- OBJETIVO DEL DÍA (qué debe lograr ese contenido: awareness / confianza / deseo / decisión)
- 3 IDEAS DE STORIES (valor / proceso / prueba social — texto de la primera pantalla de cada una)
- CTA DE LAS STORIES (qué acción queremos que tome)

Más:
- 1 REEL O VIDEO (el día de mayor energía — guión de 3 líneas: hook + punto clave + CTA)
- 1 POST DE FEED DE VALOR (el día de más reflexión — primer línea del caption)
- 1 MENSAJE PROACTIVO (DM estratégico o respuesta que debería hacer esa semana)

Al final:
- MÉTRICA CLAVE DE LA SEMANA (qué número va a medir para saber si funcionó)
- AJUSTE SEGÚN ENERGÍA: si tiene poco tiempo, qué priorizar y qué cortar sin perder impacto
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
    descripcion:
      'Genera 3 versiones de bio de Instagram que convierten visitas en seguidores calificados y leads reales.',
    emoji: '📸',
    inputs: [
      {
        id: 'nicho',
        label: 'Tu nicho',
        tipo: 'text',
        required: true,
        precargar: 'nicho',
      },
      {
        id: 'resultado',
        label: 'El resultado principal que lográs con tus clientes',
        tipo: 'text',
        required: true,
        placeholder: 'ej: "Perdieron 10kg sin dietas" o "Salieron de la deuda en 6 meses"',
      },
      {
        id: 'credencial',
        label: 'Tu credencial más relevante',
        tipo: 'text',
        placeholder: 'ej: Lic. en Nutrición · 8 años · 300+ pacientes',
        required: true,
      },
      {
        id: 'cta_bio',
        label: '¿Cuál es el CTA del link en bio?',
        tipo: 'select',
        opciones: [
          'Agenda una consulta gratuita',
          'Descargá el recurso gratis',
          'Escribime para más info',
          'Conocé el protocolo',
          'Mirá cómo trabajo',
        ],
        required: true,
      },
      {
        id: 'tono',
        label: '¿Cómo querés sonar?',
        tipo: 'select',
        opciones: ['Empático y cálido', 'Directo y sin rodeos', 'Científico y confiable', 'Cercano y divertido'],
        required: true,
      },
      {
        id: 'diferencial',
        label: '¿Qué hace diferente tu enfoque? (en pocas palabras)',
        tipo: 'text',
        placeholder: 'ej: sin restricciones, sin medicación, con acompañamiento real...',
      },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Generá 3 versiones de bio de Instagram para ${perfil.nombre ?? 'este profesional'}.

NICHO: ${inputs.nicho}
RESULTADO: ${inputs.resultado}
CREDENCIAL: ${inputs.credencial}
CTA: ${inputs.cta_bio}
TONO: ${inputs.tono}
DIFERENCIAL: ${inputs.diferencial || 'no especificado'}

Para cada bio (máximo 150 caracteres totales en Instagram):
- BIO COMPLETA lista para copiar y pegar
- EXPLICACIÓN: qué estrategia usa (autoridad / transformación / identidad / dolor / resultado)
- EMOJI STRATEGY: qué emojis usa y por qué

Luego:
- RECOMENDACIÓN: cuál de las 3 usar primero y por qué
- NOMBRE DE USUARIO SUGERIDO: variantes del nombre que sean fáciles de buscar y recordar
- DESTACADOS SUGERIDOS: qué categorías de highlights debería tener (con nombres de 1-2 palabras)
    `.trim(),
    outputLabel: 'Bio de Instagram (3 versiones)',
  },

  {
    id: 'D2',
    grupo: 'D',
    titulo: 'Email de Bienvenida',
    descripcion:
      'Genera el email de bienvenida para quien completa tu formulario o descarga tu lead magnet. El primer email importa más que todos los demás.',
    emoji: '✉️',
    inputs: [
      {
        id: 'nombre_protocolo',
        label: 'Nombre del protocolo o lead magnet',
        tipo: 'text',
        required: true,
      },
      {
        id: 'resultado',
        label: 'Resultado que promete el protocolo o lead magnet',
        tipo: 'textarea',
        required: true,
      },
      {
        id: 'como_llego',
        label: '¿Por dónde llegó este lead?',
        tipo: 'select',
        opciones: ['Instagram Stories con CTA', 'Reel viral', 'Publicidad paga', 'Referido', 'Google / búsqueda', 'Otro'],
        required: true,
      },
      {
        id: 'proximo_paso',
        label: '¿Cuál es el próximo paso que querés que dé el lead?',
        tipo: 'select',
        opciones: [
          'Agendar una llamada de diagnóstico',
          'Ver el VSL (video de ventas)',
          'Unirse a la comunidad de WhatsApp',
          'Escribirme por WhatsApp directamente',
          'Ir a la landing page del protocolo',
        ],
        required: true,
      },
      {
        id: 'historia_breve',
        label: '¿Querés incluir una mini historia personal? (una línea)',
        tipo: 'text',
        placeholder: 'ej: "Yo estuve exactamente donde estás vos hace 3 años..."',
      },
      {
        id: 'objecion_anticipa',
        label: '¿Cuál es la objeción más común en este punto del proceso?',
        tipo: 'text',
        placeholder: 'ej: "Esto puede que no sea para mí", "Lo pensaré cuando tenga más tiempo"...',
      },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Escribí el email de bienvenida para quien se suscribió al protocolo/lead magnet "${inputs.nombre_protocolo}" de ${perfil.nombre ?? 'este profesional'}.

RESULTADO PROMETIDO: ${inputs.resultado}
CÓMO LLEGÓ: ${inputs.como_llego}
PRÓXIMO PASO: ${inputs.proximo_paso}
HISTORIA PERSONAL: ${inputs.historia_breve || 'no incluir'}
OBJECIÓN A ANTICIPAR: ${inputs.objecion_anticipa || 'no especificada'}

El email debe tener:
- ASUNTO: 3 opciones (directo y personal — no genérico, sin spam words)
- PRE-HEADER: el texto de preview del email (45 caracteres)
- APERTURA: validar la decisión de suscribirse con autenticidad (no con adulación)
- MINI HISTORIA (si aplica): 2-3 líneas que generen identificación
- CUERPO: recordar el resultado que obtienen + anticipar la objeción + resolverla
- CTA ÚNICO Y CLARO: ${inputs.proximo_paso}
- CIERRE: cálido, con la voz del profesional — no corporativo

Extensión: 180-280 palabras. Tono: profesional pero como si te escribiera un conocido que sabe de lo que habla. Sin plantilla visible.
    `.trim(),
    outputLabel: 'Email de Bienvenida',
  },

  {
    id: 'D4',
    grupo: 'D',
    titulo: 'Secuencia de Captación ManyChat',
    descripcion:
      'Genera las keywords disparadoras, respuestas automáticas y secuencia de seguimiento para configurar en ManyChat o herramienta equivalente.',
    emoji: '🤖',
    inputs: [
      {
        id: 'nombre_protocolo',
        label: 'Nombre del protocolo o lead magnet',
        tipo: 'text',
        required: true,
      },
      {
        id: 'resultado',
        label: 'Resultado principal que promete el protocolo',
        tipo: 'textarea',
        required: true,
      },
      {
        id: 'keyword_1',
        label: 'Keyword disparadora #1 (palabra que comenta o envía el lead)',
        tipo: 'text',
        placeholder: 'ej: INFO, QUIERO, PROTOCOLO',
        required: true,
      },
      {
        id: 'keyword_2',
        label: 'Keyword disparadora #2',
        tipo: 'text',
        placeholder: 'ej: GUÍA, GRATIS, MÁS INFO',
      },
      {
        id: 'keyword_3',
        label: 'Keyword disparadora #3',
        tipo: 'text',
        placeholder: 'ej: SÍ, ME INTERESA, CÓMO',
      },
      {
        id: 'proximo_paso',
        label: '¿Cuál es el próximo paso que querés que dé el lead?',
        tipo: 'select',
        opciones: [
          'Agendar una llamada',
          'Ir a la landing page',
          'Ver el VSL',
          'Escribirme por WhatsApp',
        ],
        required: true,
      },
      {
        id: 'precio_aproximado',
        label: '¿Cuál es el precio del protocolo? (para la respuesta a "¿cuánto cuesta?")',
        tipo: 'text',
        placeholder: 'ej: desde $1200 USD, depende del plan, inversión personalizada...',
      },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Generá la secuencia completa de captación para ManyChat del protocolo "${inputs.nombre_protocolo}".

RESULTADO PROMETIDO: ${inputs.resultado}
KEYWORDS: ${[inputs.keyword_1, inputs.keyword_2, inputs.keyword_3].filter(Boolean).join(', ')}
PRÓXIMO PASO: ${inputs.proximo_paso}
PRECIO APROXIMADO: ${inputs.precio_aproximado || 'a consultar'}

Para CADA keyword generá:
1. MENSAJE AUTOMÁTICO INMEDIATO (primeros 5 segundos — máximo 3 oraciones, usa nombre si posible, incluye link o CTA claro)
2. SEGUIMIENTO DÍA 1 (24hs después si no respondió — empático, recordar el beneficio, no insistente)
3. SEGUIMIENTO DÍA 3 (último mensaje del flujo — apertura de conversación, pregunta simple)

Luego generá:
4. RESPUESTA A "¿CUÁNTO CUESTA?" (bot que da el precio con contexto de valor, no solo el número)
5. RESPUESTA A "MANDAME MÁS INFO" (da info sin revelar todo)
6. RESPUESTA A "NO ME INTERESA / GRACIAS" (cierre elegante que deja la puerta abierta)
7. GUÍA DE CONFIGURACIÓN: dónde y cómo pegar cada mensaje en ManyChat (paso a paso, máximo 8 pasos)

Tono: cálido, personal, que no parezca un bot. Que el lead sienta que hay una persona real detrás.
    `.trim(),
    outputLabel: 'Secuencia de Captación ManyChat',
  },

  {
    id: 'D3',
    grupo: 'D',
    titulo: 'Copy de Landing Page',
    descripcion:
      'Genera el copy completo de la landing page del protocolo: headline, todas las secciones y CTAs.',
    emoji: '🌐',
    inputs: [
      {
        id: 'nombre_protocolo',
        label: 'Nombre del protocolo',
        tipo: 'text',
        required: true,
      },
      {
        id: 'avatar',
        label: 'Avatar (quién es el cliente ideal — sé específico)',
        tipo: 'textarea',
        required: true,
        precargar: 'avatar_cliente',
      },
      {
        id: 'resultado',
        label: 'Resultado principal que logran (con número y tiempo si es posible)',
        tipo: 'textarea',
        required: true,
      },
      {
        id: 'precio',
        label: 'Precio (USD)',
        tipo: 'number',
        required: true,
      },
      {
        id: 'duracion_protocolo',
        label: 'Duración del protocolo',
        tipo: 'text',
        placeholder: 'ej: 12 semanas, 3 meses...',
        required: true,
      },
      {
        id: 'testimonio',
        label: 'Pegá 1-2 testimonios reales de clientes (puede ser anónimo)',
        tipo: 'textarea',
        placeholder: 'ej: "En 8 semanas bajé 7kg sin dejar de comer asado los domingos. Por primera vez no recuperé lo que bajé" — M.G., 42 años',
      },
      {
        id: 'garantia',
        label: '¿Ofrecés algún tipo de garantía?',
        tipo: 'textarea',
        placeholder: 'ej: Si en 30 días no ves resultados te devuelvo el 100%, garantía de satisfacción...',
      },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Generá el copy completo de la landing page para el protocolo "${inputs.nombre_protocolo}" de ${perfil.nombre ?? 'este profesional'}.

AVATAR: ${inputs.avatar}
RESULTADO: ${inputs.resultado}
PRECIO: $${inputs.precio} USD
DURACIÓN: ${inputs.duracion_protocolo}
TESTIMONIO: ${inputs.testimonio || 'no disponible aún'}
GARANTÍA: ${inputs.garantia || 'no definida aún'}

Generá TODAS estas secciones:

1. HEADLINE PRINCIPAL (1 oración que para el scroll — debe tener el avatar y el resultado)
2. SUBHEADLINE (amplía el headline, 2 líneas — el "cómo" o el "sin lo malo")
3. VIDEO O IMAGEN (descripción de qué debería mostrar el hero visual)
4. PARA VOS SI... (5 bullets del avatar ideal — en lenguaje del cliente)
5. NO ES PARA VOS SI... (3 bullets de descalificación — crea confianza)
6. EL PROBLEMA (párrafo de agitación del dolor — en lenguaje del cliente, no clínico)
7. POR QUÉ LO QUE INTENTASTE ANTES NO FUNCIONÓ (destruir objeciones previas)
8. LA SOLUCIÓN — presentación del protocolo (nombre + promesa en 2 párrafos)
9. QUÉ INCLUYE (bullets de deliverables — con formato "Acceso a / Recibís / Vas a poder")
10. RESULTADOS ESPERADOS (bullets concretos — no promesas vacías)
11. SOBRE ${(perfil.nombre ?? 'el profesional').toUpperCase()} (bio de autoridad, 80-100 palabras — con historia personal si aplica)
12. TESTIMONIO (si lo hay, presentado de forma que impacte)
13. PREGUNTAS FRECUENTES (5 FAQs reales del nicho — con respuestas directas)
14. CTA PRINCIPAL (botón + texto de urgencia o escasez si aplica)
15. GARANTÍA (si la hay, presentada para eliminar el riesgo percibido)
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
    descripcion:
      'Genera el guión personalizado de tu llamada de diagnóstico/venta con preguntas exactas, manejo de objeciones y cierres.',
    emoji: '📞',
    inputs: [
      {
        id: 'nombre_protocolo',
        label: 'Nombre del protocolo que ofrecés',
        tipo: 'text',
        required: true,
      },
      {
        id: 'precio',
        label: 'Precio (USD)',
        tipo: 'number',
        required: true,
      },
      {
        id: 'duracion_llamada',
        label: 'Duración de la llamada',
        tipo: 'select',
        opciones: ['20 minutos', '30 minutos', '45 minutos', '60 minutos'],
        required: true,
      },
      {
        id: 'perfil_tipico_lead',
        label: '¿Cómo llega el lead típico a la llamada? ¿Qué sabe de vos?',
        tipo: 'textarea',
        placeholder: 'Por Instagram, ya vio el precio, todavía no sabe el precio, completó un formulario...',
        required: true,
      },
      {
        id: 'objeciones',
        label: '¿Cuáles son las 3 objeciones más comunes que recibís?',
        tipo: 'textarea',
        placeholder: 'ej: Es caro, tengo que pensarlo, no tengo tiempo, necesito consultarlo con alguien...',
        required: true,
      },
      {
        id: 'mejor_resultado',
        label: '¿Cuál es el mejor resultado que lograste con un cliente? (para mencionar si viene al caso)',
        tipo: 'textarea',
        placeholder: 'Un caso concreto — puede ser anónimo — que muestre de lo que sos capaz...',
      },
      {
        id: 'donde_falla',
        label: '¿En qué punto de la llamada sentís que perdés más cierres?',
        tipo: 'select',
        opciones: [
          'Al presentar el precio',
          'Cuando dicen "lo pienso"',
          'Cuando preguntan por alternativas más baratas',
          'Al cerrar / pedir el sí',
          'No sé exactamente dónde',
        ],
        required: true,
      },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Generá el guión completo de la llamada de venta del protocolo "${inputs.nombre_protocolo}" a $${inputs.precio} USD.

DURACIÓN: ${inputs.duracion_llamada}
CÓMO LLEGA EL LEAD: ${inputs.perfil_tipico_lead}
OBJECIONES MÁS COMUNES: ${inputs.objeciones}
MEJOR RESULTADO LOGRADO: ${inputs.mejor_resultado || 'no especificado'}
DONDE FALLA EL CIERRE ACTUALMENTE: ${inputs.donde_falla}

El guión debe tener los textos EXACTOS (no temas, sino lo que el profesional dice):

1. APERTURA (2 minutos): romper el hielo, establecer el tono de colaboración, no de venta
2. DIAGNÓSTICO (8-12 preguntas de discovery — en orden): de dónde viene, qué ya intentó, qué pasó, qué quiere exactamente, qué tan urgente es, qué lo frenó antes de buscar ayuda
3. CONFIRMACIÓN (resumir lo que escuchaste): validar que entendiste el problema — aquí el lead se convence a sí mismo
4. PRESENTACIÓN DEL PROTOCOLO (5 minutos): presentar después de escuchar, no antes — conectar cada elemento del protocolo con lo que el lead dijo
5. MANEJO DE CADA OBJECIÓN LISTADA: respuesta empática primero, lógica después, cierre de la objeción
6. PRESENTACIÓN DEL PRECIO: cómo presentarlo con contexto de valor, no como un número suelto
7. EL CIERRE: cómo pedir el sí sin presión ni falsa urgencia
8. POST-"LO PIENSO": qué hacer exactamente en las 24-48hs siguientes
9. POST-"NO": cómo terminar bien y dejar la puerta abierta

Énfasis extra en resolver: ${inputs.donde_falla}
    `.trim(),
    outputLabel: 'Guión de Llamada de Venta',
  },

  {
    id: 'E2',
    grupo: 'E',
    titulo: 'Manejo de Objeciones',
    descripcion:
      'Genera respuestas precisas y empáticas para las objeciones más comunes del sector salud.',
    emoji: '🛡️',
    inputs: [
      {
        id: 'precio',
        label: 'Precio de tu protocolo (USD)',
        tipo: 'number',
        required: true,
      },
      {
        id: 'nicho',
        label: 'Tu nicho',
        tipo: 'text',
        required: true,
        precargar: 'nicho',
      },
      {
        id: 'objeciones_top',
        label: '¿Cuáles son las 3 objeciones más frecuentes que escuchás?',
        tipo: 'textarea',
        required: true,
        placeholder: 'Texto exacto que dicen los leads, no solo el tema...',
      },
      {
        id: 'canal_venta',
        label: '¿Por dónde ocurren la mayoría de tus ventas?',
        tipo: 'select',
        opciones: ['Llamada/videollamada', 'Chat de WhatsApp', 'DM de Instagram', 'En persona', 'Mixto'],
        required: true,
      },
      {
        id: 'contexto_precio',
        label: '¿Qué cobran otros profesionales similares a vos en tu mercado?',
        tipo: 'text',
        placeholder: 'ej: consultas de $50-80 USD, programas similares de $500-800 USD...',
      },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Generá las respuestas a las objeciones más comunes para un profesional de salud con protocolo de $${inputs.precio} USD en el nicho: ${inputs.nicho}.

CANAL DE VENTA: ${inputs.canal_venta}
CONTEXTO DE PRECIO EN EL MERCADO: ${inputs.contexto_precio || 'no especificado'}
OBJECIONES REPORTADAS: ${inputs.objeciones_top}

Para CADA objeción (las 3 reportadas + las 7 más universales del sector salud):

OBJECIÓN: [texto exacto del lead]
INTERPRETACIÓN REAL: lo que realmente significa (generalmente no es lo que dice)
RESPUESTA EN ${inputs.canal_venta === 'Llamada/videollamada' ? 'VOZ' : 'CHAT'}: texto exacto, empático primero, lógico después
FRASE DE REENGANCHE: cómo retomar el camino hacia el sí sin presionar

Las 7 objeciones universales a incluir (además de las 3 reportadas):
- "Es muy caro"
- "Tengo que pensarlo"
- "Necesito consultarlo con mi pareja/familia"
- "No tengo tiempo ahora"
- "Ya probé varias cosas y no funcionaron"
- "¿Me podés dar algo más económico?"
- "Dame más información antes de decidir"

Tono: empático primero, siempre. Jamás presionar, siempre ayudar a decidir.
    `.trim(),
    outputLabel: 'Manejo de Objeciones',
  },

  {
    id: 'E3',
    grupo: 'E',
    titulo: 'Análisis de Métricas',
    descripcion:
      'Analiza tus métricas de las últimas 4 semanas e identifica el cuello de botella y las 3 acciones de mayor impacto.',
    emoji: '📊',
    inputs: [
      {
        id: 'visitas_landing',
        label: 'Visitas a la landing (últimas 4 semanas)',
        tipo: 'number',
        placeholder: 'ej: 450',
      },
      {
        id: 'leads_captados',
        label: 'Leads captados (formularios completados, mensajes de interés)',
        tipo: 'number',
        required: true,
      },
      {
        id: 'llamadas_agendadas',
        label: 'Llamadas o consultas agendadas',
        tipo: 'number',
        required: true,
      },
      {
        id: 'ventas_cerradas',
        label: 'Ventas cerradas',
        tipo: 'number',
        required: true,
      },
      {
        id: 'ingresos',
        label: 'Ingresos totales del período (USD)',
        tipo: 'number',
      },
      {
        id: 'precio_protocolo',
        label: 'Precio del protocolo (USD)',
        tipo: 'number',
        required: true,
      },
      {
        id: 'mayor_problema_percibido',
        label: '¿Cuál creés que es el mayor problema en tu embudo ahora mismo?',
        tipo: 'textarea',
        placeholder: 'Lo que sentís que está fallando: no llegan suficientes leads, los leads no son calificados, no cierro las llamadas...',
        required: true,
      },
      {
        id: 'objetivo_proximo_mes',
        label: '¿Cuántas ventas querés cerrar el próximo mes?',
        tipo: 'number',
        required: true,
      },
    ],
    promptTemplate: (inputs, perfil) => `
${contextoBase(perfil)}

Analizá las métricas del embudo de ${perfil.nombre ?? 'este profesional'} de las últimas 4 semanas.

MÉTRICAS:
- Visitas a la landing: ${inputs.visitas_landing || 'no registrado'}
- Leads captados: ${inputs.leads_captados}
- Llamadas agendadas: ${inputs.llamadas_agendadas}
- Ventas cerradas: ${inputs.ventas_cerradas}
- Ingresos: $${inputs.ingresos || '?'} USD
- Precio del protocolo: $${inputs.precio_protocolo} USD

PERCEPCIÓN DEL PROFESIONAL: ${inputs.mayor_problema_percibido}
META DEL PRÓXIMO MES: ${inputs.objetivo_proximo_mes} ventas

Calculá y presentá:

1. TASAS DE CONVERSIÓN POR ETAPA:
   - Landing → Lead: X%
   - Lead → Llamada: X%
   - Llamada → Venta: X%
   - Conversión total de lead a venta: X%

2. COMPARACIÓN CON BENCHMARKS DEL SECTOR SALUD (rangos sanos de cada métrica)

3. CUELLO DE BOTELLA PRINCIPAL (la etapa con mayor pérdida relativa)

4. DIAGNÓSTICO HONESTO (qué está causando ese cuello de botella — con hipótesis específicas)

5. ¿COINCIDE CON LA PERCEPCIÓN DEL PROFESIONAL? (si no coincide, explicar por qué la data dice algo diferente)

6. 3 ACCIONES DE ALTO IMPACTO para la próxima semana (ordenadas por impacto potencial × facilidad de ejecución)

7. PROYECCIÓN: si mejora el cuello de botella un 20%, ¿qué pasa con las ventas el próximo mes?

8. QUÉ MEDIR DE AHORA EN ADELANTE (métricas adicionales que ayudarían a entender mejor el embudo)
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
  D: { titulo: 'Infraestructura Digital', descripcion: 'Bio, landing page, emails y automatización', emoji: '🌐', color: 'cyan' },
  E: { titulo: 'Conversión y Aceleración', descripcion: 'Ventas, objeciones y métricas', emoji: '🚀', color: 'orange' },
};

export function getHerramienta(id: string): Herramienta | undefined {
  // Buscar primero en V3, luego en legacy
  return HERRAMIENTAS_V3.find((h) => h.id === id) ?? HERRAMIENTAS.find((h) => h.id === id);
}

// ─── V3: Herramientas del PDF Definitivo (22 herramientas) ──────────────────

export interface HerramientaV3 extends Herramienta {
  usa_ia: boolean;
  adn_field?: string;
  requiere_datos_de?: string[];
  es_recurrente?: boolean;
}

function adnContext(perfil: Partial<ProfileV2>): string {
  const parts: string[] = [];
  if (perfil.nombre) parts.push(`Nombre: ${perfil.nombre}`);
  if (perfil.especialidad) parts.push(`Especialidad: ${perfil.especialidad}`);
  if (perfil.adn_linea_tiempo) parts.push(`Línea de tiempo vital:\n${perfil.adn_linea_tiempo}`);
  if (perfil.historia_300) parts.push(`Historia 300 palabras:\n${perfil.historia_300}`);
  if (perfil.historia_150) parts.push(`Historia 150 palabras:\n${perfil.historia_150}`);
  if (perfil.historia_50) parts.push(`Historia 50 palabras:\n${perfil.historia_50}`);
  if (perfil.proposito) parts.push(`Propósito: ${perfil.proposito}`);
  if (perfil.legado) parts.push(`Legado: ${perfil.legado}`);
  if (perfil.adn_carta_futuro) parts.push(`Carta al yo de 10 años:\n${perfil.adn_carta_futuro}`);
  if (perfil.adn_pacientes_reales) parts.push(`Análisis de pacientes reales:\n${perfil.adn_pacientes_reales}`);
  if (perfil.adn_avatar) parts.push(`Avatar:\n${JSON.stringify(perfil.adn_avatar, null, 2)}`);
  if (perfil.adn_nicho) parts.push(`Nicho: ${perfil.adn_nicho}`);
  if (perfil.adn_usp) parts.push(`USP: ${perfil.adn_usp}`);
  if (perfil.adn_transformaciones) parts.push(`Transformaciones de pacientes:\n${perfil.adn_transformaciones}`);
  if (perfil.matriz_a) parts.push(`Matriz A (dolor):\n${perfil.matriz_a}`);
  if (perfil.matriz_b) parts.push(`Matriz B (obstáculos):\n${perfil.matriz_b}`);
  if (perfil.matriz_c) parts.push(`Matriz C (resultado):\n${perfil.matriz_c}`);
  if (perfil.adn_proceso_actual) parts.push(`Proceso actual:\n${perfil.adn_proceso_actual}`);
  if (perfil.metodo_nombre) parts.push(`Método: ${perfil.metodo_nombre}`);
  if (perfil.metodo_pasos) parts.push(`Pasos del método: ${perfil.metodo_pasos}`);
  if (perfil.oferta_mid) parts.push(`Oferta Mid:\n${perfil.oferta_mid}`);
  if (perfil.oferta_high) parts.push(`Oferta High:\n${perfil.oferta_high}`);
  if (perfil.oferta_low) parts.push(`Oferta Low:\n${perfil.oferta_low}`);
  if (perfil.lead_magnet) parts.push(`Lead Magnet:\n${perfil.lead_magnet}`);
  if (perfil.script_venta) parts.push(`Script de venta:\n${perfil.script_venta}`);
  return parts.length > 0 ? `\n=== ADN DEL NEGOCIO ===\n${parts.join('\n\n')}` : '';
}

export const HERRAMIENTAS_V3: HerramientaV3[] = [
  // ─── P0.2: Formulario de bienvenida ─────────────────────────────────────────
  {
    id: 'H-P0.2',
    grupo: 'A' as GrupoHerramienta,
    titulo: 'Formulario de bienvenida',
    descripcion: 'Respondé las preguntas iniciales para generar tu ADN prototipo beta.',
    emoji: '🌱',
    usa_ia: true,
    adn_field: 'adn_formulario_bienvenida',
    outputLabel: 'ADN Prototipo Beta',
    inputs: [
      { id: 'admiracion', label: '¿A qué profesionales del mundo admirás?', tipo: 'textarea', required: true },
      { id: 'que_tienen', label: '¿Qué tienen ellos que vos querés tener?', tipo: 'textarea', required: true },
      { id: 'impedimento', label: '¿Qué te impidió hasta ahora cobrar lo que vale tu trabajo?', tipo: 'textarea', required: true },
      { id: 'vida_10k', label: '¿Cómo te imaginás tu vida con $10K/mes extra?', tipo: 'textarea', required: true },
      { id: 'anios_profesion', label: '¿Cuántos años ejercés tu profesión?', tipo: 'number', required: true },
      { id: 'modalidad', label: '¿Presencial, online o mixto?', tipo: 'select', opciones: ['Presencial', 'Online', 'Mixto'], required: true },
      { id: 'pacientes_mes', label: '¿Cuántos pacientes pagando por mes?', tipo: 'number', required: true },
      { id: 'problema_principal', label: '¿Qué problema principal resolvés?', tipo: 'textarea', required: true },
    ],
    promptTemplate: (inputs, perfil) => `
Sos un consultor de negocios para profesionales de salud. Con las respuestas del formulario de bienvenida, generá un párrafo de presentación profesional (ADN prototipo beta). Debe ser personal, cálido y en primera persona.
${adnContext(perfil)}

Respuestas del formulario:
- Profesionales que admira: ${inputs.admiracion}
- Lo que quiere tener: ${inputs.que_tienen}
- Lo que le impidió cobrar más: ${inputs.impedimento}
- Cómo imagina su vida con $10K/mes: ${inputs.vida_10k}
- Años de profesión: ${inputs.anios_profesion}
- Modalidad: ${inputs.modalidad}
- Pacientes pagando por mes: ${inputs.pacientes_mes}
- Problema principal que resuelve: ${inputs.problema_principal}

Generá un párrafo de 150-200 palabras que presente a este profesional. Usá tono rioplatense, directo y cálido.`.trim(),
  },

  // ─── P1.2: Línea de tiempo vital (NO IA) ───────────────────────────────────
  {
    id: 'H-P1.2',
    grupo: 'A' as GrupoHerramienta,
    titulo: 'Línea de tiempo vital',
    descripcion: 'Anotá los 5-8 momentos que más te marcaron. Escritura pura, sin IA.',
    emoji: '📖',
    usa_ia: false,
    adn_field: 'adn_linea_tiempo',
    outputLabel: 'Línea de tiempo',
    inputs: [
      { id: 'linea_tiempo', label: 'Anotá los 5 a 8 momentos que más te marcaron en la vida. Fracasos, enfermedades, cambios de rumbo, descubrimientos. No los ve nadie más — es el insumo para construir tu historia.', tipo: 'textarea', required: true },
    ],
    promptTemplate: (inputs) => inputs.linea_tiempo,
  },

  // ─── P1.3: Historia en 3 versiones ──────────────────────────────────────────
  {
    id: 'H-P1.3',
    grupo: 'A' as GrupoHerramienta,
    titulo: 'Generador de Historia en 3 versiones',
    descripcion: 'Genera tu historia en 300, 150 y 50 palabras a partir de tu línea de tiempo.',
    emoji: '📖',
    usa_ia: true,
    adn_field: 'historia_300',
    requiere_datos_de: ['H-P1.2'],
    outputLabel: 'Historia en 3 versiones',
    inputs: [],
    promptTemplate: (_inputs, perfil) => `
Sos un copywriter especializado en historias personales para profesionales de salud. A partir de la línea de tiempo vital del profesional, generá 3 versiones de su historia de origen.
${adnContext(perfil)}

Generá exactamente en este formato:

---HISTORIA 300 PALABRAS---
[Historia completa para sitio web. Incluí los momentos de quiebre, la transformación y por qué hace lo que hace. Tono personal, auténtico, en primera persona.]

---HISTORIA 150 PALABRAS---
[Versión compacta para bio de redes sociales. Los momentos clave y la esencia.]

---HISTORIA 50 PALABRAS---
[Versión ultra-corta para presentaciones. Una oración potente.]

Usá tono rioplatense, directo, sin jerga de marketing. La historia tiene que sonar a persona real, no a bio de LinkedIn.`.trim(),
  },

  // ─── P2.2: Los 5 por qué ───────────────────────────────────────────────────
  {
    id: 'H-P2.2',
    grupo: 'A' as GrupoHerramienta,
    titulo: 'Los 5 por qué',
    descripcion: 'Formulario encadenado de 5 preguntas para llegar al propósito real.',
    emoji: '🎯',
    usa_ia: false,
    adn_field: 'adn_cinco_por_que',
    outputLabel: 'Respuestas de los 5 por qué',
    inputs: [
      { id: 'pq1', label: '¿Por qué hacés lo que hacés?', tipo: 'textarea', required: true },
      { id: 'pq2', label: '¿Y eso por qué importa?', tipo: 'textarea', required: true },
      { id: 'pq3', label: '¿Y por qué eso importa para vos específicamente?', tipo: 'textarea', required: true },
      { id: 'pq4', label: '¿Qué cambiaría si más personas tuvieran esto?', tipo: 'textarea', required: true },
      { id: 'pq5', label: '¿Para qué estás realmente acá?', tipo: 'textarea', required: true },
    ],
    promptTemplate: (inputs) => `1. ${inputs.pq1}\n2. ${inputs.pq2}\n3. ${inputs.pq3}\n4. ${inputs.pq4}\n5. ${inputs.pq5}`,
  },

  // ─── P2.3: Destilador de Propósito ──────────────────────────────────────────
  {
    id: 'H-P2.3',
    grupo: 'A' as GrupoHerramienta,
    titulo: 'Destilador de Propósito',
    descripcion: 'Genera 3 versiones de tu oración de propósito.',
    emoji: '🎯',
    usa_ia: true,
    adn_field: 'proposito',
    requiere_datos_de: ['H-P2.2'],
    outputLabel: 'Propósito destilado',
    inputs: [],
    promptTemplate: (_inputs, perfil) => `
Sos un coach de propósito para profesionales de salud. Leé las 5 respuestas del ejercicio "Los 5 por qué" y destilá 3 versiones de la oración de propósito.
${adnContext(perfil)}

Las 5 respuestas: ${perfil.adn_cinco_por_que ? (Array.isArray(perfil.adn_cinco_por_que) ? perfil.adn_cinco_por_que.join('\n') : perfil.adn_cinco_por_que) : 'No disponibles'}

Estructura obligatoria: "Ayudo a [quién específico] a [resultado concreto] para que [para qué más profundo]."

Generá 3 versiones diferentes, cada una en su propio párrafo numerado. La oración tiene que ser específica, verificable y personal — que solo esta persona pueda decirla.`.trim(),
  },

  // ─── P3.2: Carta al yo de 10 años (NO IA) ──────────────────────────────────
  {
    id: 'H-P3.2',
    grupo: 'A' as GrupoHerramienta,
    titulo: 'Carta al yo de dentro de 10 años',
    descripcion: 'Escribí como si ya lograste todo. Mínimo 200 palabras.',
    emoji: '🌅',
    usa_ia: false,
    adn_field: 'adn_carta_futuro',
    outputLabel: 'Carta al futuro',
    inputs: [
      { id: 'carta', label: 'Es el año 2035. Lograste todo lo que querías lograr. ¿Cómo es tu vida? ¿A quiénes ayudaste? ¿Qué dejaste? ¿Cómo te sentís? Mínimo 200 palabras.', tipo: 'textarea', required: true },
    ],
    promptTemplate: (inputs) => inputs.carta,
  },

  // ─── P3.3: Sintetizador de Legado ───────────────────────────────────────────
  {
    id: 'H-P3.3',
    grupo: 'A' as GrupoHerramienta,
    titulo: 'Sintetizador de Legado',
    descripcion: 'Extrae tu legado en 2-3 oraciones a partir de la carta.',
    emoji: '🌅',
    usa_ia: true,
    adn_field: 'legado',
    requiere_datos_de: ['H-P3.2'],
    outputLabel: 'Legado sintetizado',
    inputs: [],
    promptTemplate: (_inputs, perfil) => `
Leé la carta al yo de 10 años de este profesional y extraé el legado en 2-3 oraciones. Distinguí entre legado real (impacto en otros), metas financieras y reconocimiento personal. El legado trasciende lo económico.
${adnContext(perfil)}

Carta al futuro: ${perfil.adn_carta_futuro ?? 'No disponible'}

Generá el legado en 2-3 oraciones directas. Sin florituras.`.trim(),
  },

  // ─── P4.2: Análisis de 3 pacientes reales ──────────────────────────────────
  {
    id: 'H-P4.2',
    grupo: 'B' as GrupoHerramienta,
    titulo: 'Análisis de 3 pacientes reales',
    descripcion: '3 bloques con 5 preguntas cada uno sobre pacientes reales.',
    emoji: '👤',
    usa_ia: false,
    adn_field: 'adn_pacientes_reales',
    outputLabel: 'Análisis de pacientes',
    inputs: [
      { id: 'p1_problema', label: 'Paciente 1 — ¿Qué problema tenía cuando llegó?', tipo: 'textarea', required: true },
      { id: 'p1_palabras', label: 'Paciente 1 — ¿Cómo lo describía con sus propias palabras?', tipo: 'textarea', required: true },
      { id: 'p1_intento', label: 'Paciente 1 — ¿Qué intentó antes sin éxito?', tipo: 'textarea', required: true },
      { id: 'p1_resultado', label: 'Paciente 1 — ¿Qué obtuvo después de trabajar juntos?', tipo: 'textarea', required: true },
      { id: 'p1_ahora', label: 'Paciente 1 — ¿Cómo describe su vida ahora?', tipo: 'textarea', required: true },
      { id: 'p2_problema', label: 'Paciente 2 — ¿Qué problema tenía cuando llegó?', tipo: 'textarea', required: true },
      { id: 'p2_palabras', label: 'Paciente 2 — ¿Cómo lo describía con sus propias palabras?', tipo: 'textarea', required: true },
      { id: 'p2_intento', label: 'Paciente 2 — ¿Qué intentó antes sin éxito?', tipo: 'textarea', required: true },
      { id: 'p2_resultado', label: 'Paciente 2 — ¿Qué obtuvo después de trabajar juntos?', tipo: 'textarea', required: true },
      { id: 'p2_ahora', label: 'Paciente 2 — ¿Cómo describe su vida ahora?', tipo: 'textarea', required: true },
      { id: 'p3_problema', label: 'Paciente 3 — ¿Qué problema tenía cuando llegó?', tipo: 'textarea', required: true },
      { id: 'p3_palabras', label: 'Paciente 3 — ¿Cómo lo describía con sus propias palabras?', tipo: 'textarea', required: true },
      { id: 'p3_intento', label: 'Paciente 3 — ¿Qué intentó antes sin éxito?', tipo: 'textarea', required: true },
      { id: 'p3_resultado', label: 'Paciente 3 — ¿Qué obtuvo después de trabajar juntos?', tipo: 'textarea', required: true },
      { id: 'p3_ahora', label: 'Paciente 3 — ¿Cómo describe su vida ahora?', tipo: 'textarea', required: true },
    ],
    promptTemplate: (inputs) => Object.entries(inputs).map(([k, v]) => `${k}: ${v}`).join('\n'),
  },

  // ─── P4.3: Constructor de Avatar ────────────────────────────────────────────
  {
    id: 'H-P4.3',
    grupo: 'B' as GrupoHerramienta,
    titulo: 'Constructor de Avatar',
    descripcion: 'Genera tu avatar ideal a partir de los 3 análisis de pacientes.',
    emoji: '👤',
    usa_ia: true,
    adn_field: 'adn_avatar',
    requiere_datos_de: ['H-P4.2'],
    outputLabel: 'Avatar del paciente ideal',
    inputs: [],
    promptTemplate: (_inputs, perfil) => `
Sos un experto en construcción de avatares de cliente. Leé los análisis de 3 pacientes reales y construí un perfil completo del avatar ideal.
${adnContext(perfil)}

Generá exactamente esto:
- Nombre ficticio
- Edad
- Profesión
- Situación de vida
- Dolores (mínimo 5)
- Sueños (mínimo 3)
- Objeciones (mínimo 3)
- Lenguaje exacto que usa (3-5 frases textuales que diría esta persona)

El avatar tiene que ser una persona real con una vida real, no "profesional de 35-50 años con estrés".`.trim(),
  },

  // ─── P5.2: Definidor de Nicho y USP ────────────────────────────────────────
  {
    id: 'H-P5.2',
    grupo: 'B' as GrupoHerramienta,
    titulo: 'Definidor de Nicho y USP',
    descripcion: 'Definí tu nicho y creá tu propuesta de valor única.',
    emoji: '💡',
    usa_ia: true,
    adn_field: 'adn_nicho',
    outputLabel: 'Nicho y USP',
    inputs: [
      { id: 'no_atender', label: '¿A quién específicamente NO querés atender?', tipo: 'textarea', required: true },
      { id: 'mejor_que', label: '¿En qué problema sos claramente mejor que el promedio de tu especialidad?', tipo: 'textarea', required: true },
      { id: 'diferencial', label: '¿Qué tenés vos que ningún colega tiene?', tipo: 'textarea', required: true },
      { id: 'quien_busca', label: '¿Qué grupo de personas te busca a vos y no a otro?', tipo: 'textarea', required: true },
    ],
    promptTemplate: (inputs, perfil) => `
Sos un estratega de posicionamiento para profesionales de salud. Con las respuestas y el ADN del profesional, generá:
1. Descripción del nicho (2-3 oraciones)
2. 3 versiones de USP con la estructura: "Ayudo a [avatar] a [resultado] sin [obstáculo que temen]."
${adnContext(perfil)}

Respuestas:
- No quiere atender a: ${inputs.no_atender}
- Es mejor en: ${inputs.mejor_que}
- Su diferencial: ${inputs.diferencial}
- Lo buscan: ${inputs.quien_busca}

Sé específico. Si la USP podría ser dicha por cualquier colega, no está lista.`.trim(),
  },

  // ─── P6.2: Transformaciones reales de pacientes ─────────────────────────────
  {
    id: 'H-P6.2',
    grupo: 'B' as GrupoHerramienta,
    titulo: 'Transformaciones reales de pacientes',
    descripcion: '10 bloques con Estado A, B y C de cada paciente. Mínimo 5.',
    emoji: '🔺',
    usa_ia: false,
    adn_field: 'adn_transformaciones',
    outputLabel: 'Transformaciones documentadas',
    inputs: [
      { id: 't1_a', label: 'Paciente 1 — Estado A: ¿Cómo llegó? ¿Qué le dolía?', tipo: 'textarea', required: true },
      { id: 't1_b', label: 'Paciente 1 — Estado B: ¿Qué le impedía resolverlo solo?', tipo: 'textarea', required: true },
      { id: 't1_c', label: 'Paciente 1 — Estado C: ¿Dónde terminó? ¿Qué cambió?', tipo: 'textarea', required: true },
      { id: 't2_a', label: 'Paciente 2 — Estado A', tipo: 'textarea', required: true },
      { id: 't2_b', label: 'Paciente 2 — Estado B', tipo: 'textarea', required: true },
      { id: 't2_c', label: 'Paciente 2 — Estado C', tipo: 'textarea', required: true },
      { id: 't3_a', label: 'Paciente 3 — Estado A', tipo: 'textarea', required: true },
      { id: 't3_b', label: 'Paciente 3 — Estado B', tipo: 'textarea', required: true },
      { id: 't3_c', label: 'Paciente 3 — Estado C', tipo: 'textarea', required: true },
      { id: 't4_a', label: 'Paciente 4 — Estado A', tipo: 'textarea', required: true },
      { id: 't4_b', label: 'Paciente 4 — Estado B', tipo: 'textarea', required: true },
      { id: 't4_c', label: 'Paciente 4 — Estado C', tipo: 'textarea', required: true },
      { id: 't5_a', label: 'Paciente 5 — Estado A', tipo: 'textarea', required: true },
      { id: 't5_b', label: 'Paciente 5 — Estado B', tipo: 'textarea', required: true },
      { id: 't5_c', label: 'Paciente 5 — Estado C', tipo: 'textarea', required: true },
    ],
    promptTemplate: (inputs) => Object.entries(inputs).map(([k, v]) => `${k}: ${v}`).join('\n'),
  },

  // ─── P6.3: Constructor de Matriz A→B→C ──────────────────────────────────────
  {
    id: 'H-P6.3',
    grupo: 'B' as GrupoHerramienta,
    titulo: 'Constructor de Matriz A→B→C',
    descripcion: 'Genera la matriz completa del dolor, obstáculos y resultado.',
    emoji: '🔺',
    usa_ia: true,
    adn_field: 'matriz_a',
    requiere_datos_de: ['H-P6.2'],
    outputLabel: 'Matriz A→B→C',
    inputs: [],
    promptTemplate: (_inputs, perfil) => `
Sos un estratega de oferta para profesionales de salud. Leé las transformaciones de pacientes reales y construí la Matriz A→B→C.
${adnContext(perfil)}

Generá exactamente:

---ESTADO A (El Dolor)---
[2-3 párrafos describiendo la experiencia emocional completa del problema, en el LENGUAJE del paciente. No jerga clínica.]

---ESTADO B (Los Obstáculos)---
[Lista de 5-8 obstáculos concretos que le impiden resolverlo solo. Este es el MÁS IMPORTANTE — es la razón por la que existe el programa.]

---ESTADO C (El Resultado)---
[2-3 párrafos describiendo la vida que el paciente quiere cuando el problema ya no existe.]

El Estado B tiene que ser tan específico que si el paciente lo lee, diga "eso soy yo".`.trim(),
  },

  // ─── P7.2: Documentador del proceso actual ─────────────────────────────────
  {
    id: 'H-P7.2',
    grupo: 'B' as GrupoHerramienta,
    titulo: 'Documentador del proceso actual',
    descripcion: 'Documentá cómo trabajás con pacientes de principio a fin.',
    emoji: '⚙️',
    usa_ia: false,
    adn_field: 'adn_proceso_actual',
    outputLabel: 'Proceso documentado',
    inputs: [
      { id: 'primer_contacto', label: '¿Qué pasa en el primer contacto con el paciente?', tipo: 'textarea', required: true },
      { id: 'primera_sesion', label: '¿Cómo es la primera sesión?', tipo: 'textarea', required: true },
      { id: 'sesiones_siguientes', label: '¿Qué hacés en las sesiones siguientes, paso a paso?', tipo: 'textarea', required: true },
      { id: 'como_termina', label: '¿Cómo sabés que el proceso terminó?', tipo: 'textarea', required: true },
      { id: 'como_mide', label: '¿Cómo medís el resultado?', tipo: 'textarea', required: true },
      { id: 'duracion', label: '¿Cuánto tiempo dura el proceso completo?', tipo: 'text', required: true },
    ],
    promptTemplate: (inputs) => Object.entries(inputs).map(([k, v]) => `${k}: ${v}`).join('\n'),
  },

  // ─── P7.3: Generador de Método ──────────────────────────────────────────────
  {
    id: 'H-P7.3',
    grupo: 'B' as GrupoHerramienta,
    titulo: 'Generador de Método',
    descripcion: 'Genera 5 opciones de nombre + 3-7 pasos con descripción.',
    emoji: '⚙️',
    usa_ia: true,
    adn_field: 'metodo_nombre',
    requiere_datos_de: ['H-P7.2'],
    outputLabel: 'Método propio',
    inputs: [],
    promptTemplate: (_inputs, perfil) => `
Sos un consultor de branding para profesionales de salud. Leé el proceso actual del profesional y la Matriz A→B→C, y generá:
${adnContext(perfil)}

1. 5 opciones de nombre para el método. El nombre tiene que evocar el RESULTADO, no el mecanismo. "Sesiones de fisioterapia" es genérico. "Protocolo de Reintegración Funcional" es un activo diferenciador.

2. Para la mejor opción, 3 a 7 pasos con nombre y descripción breve de cada uno.

Formato:
---NOMBRES---
1. [nombre] — [por qué funciona]
2. ...

---PASOS DEL MÉTODO---
Paso 1: [nombre] — [qué es y por qué existe]
...`.trim(),
  },

  // ─── P8.2: Diseñador de Oferta Mid ──────────────────────────────────────────
  {
    id: 'H-P8.2',
    grupo: 'B' as GrupoHerramienta,
    titulo: 'Diseñador de Oferta Mid',
    descripcion: 'El producto principal. Se construye primero.',
    emoji: '🏗️',
    usa_ia: true,
    adn_field: 'oferta_mid',
    outputLabel: 'Oferta Mid',
    inputs: [
      { id: 'duracion_protocolo', label: '¿Cuánto tiempo dura el protocolo completo?', tipo: 'text', required: true },
      { id: 'sesiones', label: '¿Cuántas sesiones incluye?', tipo: 'number', required: true },
      { id: 'resultado_garantizado', label: '¿Qué resultado concreto y medible garantizás?', tipo: 'textarea', required: true },
      { id: 'soporte_adicional', label: '¿Qué soporte adicional incluye?', tipo: 'textarea', required: true },
      { id: 'precio_mente', label: '¿Qué precio tenés en mente?', tipo: 'text', required: true },
    ],
    promptTemplate: (inputs, perfil) => `
Sos un diseñador de ofertas para profesionales de salud. Diseñá la Oferta Mid usando el Método y la Matriz A→B→C del ADN.
${adnContext(perfil)}

Datos de la oferta:
- Duración: ${inputs.duracion_protocolo}
- Sesiones: ${inputs.sesiones}
- Resultado garantizado: ${inputs.resultado_garantizado}
- Soporte adicional: ${inputs.soporte_adicional}
- Precio en mente: ${inputs.precio_mente}

Generá: nombre de la oferta, promesa principal, para quién es, qué incluye, precio sugerido, garantía sugerida.`.trim(),
  },

  // ─── P8.3: Generador High + Low + Lead Magnet ──────────────────────────────
  {
    id: 'H-P8.3',
    grupo: 'B' as GrupoHerramienta,
    titulo: 'Generador de Oferta High + Low + Lead Magnet',
    descripcion: 'Genera las 3 ofertas restantes a partir de la Oferta Mid.',
    emoji: '🏗️',
    usa_ia: true,
    adn_field: 'oferta_high',
    requiere_datos_de: ['H-P8.2'],
    outputLabel: 'Escalera de ofertas',
    inputs: [],
    promptTemplate: (_inputs, perfil) => `
Sos un estratega de ofertas. A partir de la Oferta Mid ya diseñada, generá las otras 3 ofertas de la escalera.
${adnContext(perfil)}

Generá exactamente:

---OFERTA HIGH ($4.000 a $6.000)---
[El Mid amplificado con acceso directo y pocas plazas. Nombre, qué incluye, precio, para quién.]

---OFERTA LOW ($500 a $1.000)---
[Las primeras 2-3 sesiones del protocolo Mid. Nombre, qué incluye, precio.]

---LEAD MAGNET (gratis o hasta $27)---
[Recurso que resuelve el primer dolor del Estado A de forma completa. Formato, contenido, CTA.]`.trim(),
  },

  // ─── P9A.2: Landing copy ────────────────────────────────────────────────────
  {
    id: 'H-P9A.2',
    grupo: 'D' as GrupoHerramienta,
    titulo: 'Generador de Copy de Landing Page',
    descripcion: 'Copy completo usando Avatar + Matriz + Oferta Mid.',
    emoji: '📣',
    usa_ia: true,
    adn_field: 'adn_landing_copy',
    outputLabel: 'Copy de landing page',
    inputs: [],
    promptTemplate: (_inputs, perfil) => `
Sos un copywriter de landing pages para profesionales de salud. Generá el copy completo usando el ADN del profesional.
${adnContext(perfil)}

Generá las siguientes secciones:
1. Headline (1 línea potente)
2. Subheadline (1-2 líneas)
3. Sección del problema (usa Estado A del avatar)
4. Obstáculos (usa Estado B)
5. Solución (presenta el método)
6. Qué incluye
7. Para quién es
8. Para quién NO es
9. Preguntas frecuentes (5 mínimo)
10. Llamado a la acción

Tono: directo, empático, sin hipérboles. El avatar tiene que sentir que le estás hablando directamente.`.trim(),
  },

  // ─── P9A.3: 3 Anuncios para Meta ───────────────────────────────────────────
  {
    id: 'H-P9A.3',
    grupo: 'D' as GrupoHerramienta,
    titulo: 'Generador de 3 Anuncios para Meta',
    descripcion: '3 versiones de anuncios: desde el dolor, el obstáculo y el sueño.',
    emoji: '📣',
    usa_ia: true,
    adn_field: 'adn_anuncios',
    outputLabel: '3 anuncios para Meta',
    inputs: [],
    promptTemplate: (_inputs, perfil) => `
Sos un copywriter de anuncios para Meta/Instagram. Generá 3 versiones de anuncios usando el ADN del profesional.
${adnContext(perfil)}

---ANUNCIO 1: DESDE EL DOLOR (Estado A)---
Copy para imagen estática (3-5 líneas):
Guión de 30 segundos para video/reel:

---ANUNCIO 2: DESDE EL OBSTÁCULO (Estado B)---
Copy para imagen estática:
Guión de 30 segundos:

---ANUNCIO 3: DESDE EL SUEÑO (Estado C)---
Copy para imagen estática:
Guión de 30 segundos:

Cada anuncio debe hablar al avatar específico. CTA: palabra clave para DM.`.trim(),
  },

  // ─── P9A.4: Genius Contenido ────────────────────────────────────────────────
  {
    id: 'H-P9A.4',
    grupo: 'C' as GrupoHerramienta,
    titulo: 'Genius Contenido — Plan semanal orgánico',
    descripcion: 'Generá 5 ideas de contenido para la semana. Podés volver cada semana.',
    emoji: '📣',
    usa_ia: true,
    es_recurrente: true,
    outputLabel: 'Plan de contenido semanal',
    inputs: [
      { id: 'objecion_semana', label: '¿Qué objeción o miedo de tu avatar apareció más esta semana?', tipo: 'textarea', required: true },
    ],
    promptTemplate: (inputs, perfil) => `
Sos un estratega de contenido orgánico para profesionales de salud. Generá 5 ideas de contenido para esta semana.
${adnContext(perfil)}

Objeción/miedo de la semana: ${inputs.objecion_semana}

Generá exactamente:
1. REEL 1: formato, hook de apertura, idea central, CTA
2. REEL 2: formato, hook de apertura, idea central, CTA
3. POST 1: formato, hook de apertura, idea central, CTA
4. POST 2: formato, hook de apertura, idea central, CTA
5. CARRUSEL: formato, hook de apertura, idea central, CTA

El contenido debe responder directamente a la objeción/miedo de la semana.`.trim(),
  },

  // ─── P9B.2: Script de Ventas ────────────────────────────────────────────────
  {
    id: 'H-P9B.2',
    grupo: 'E' as GrupoHerramienta,
    titulo: 'Constructor de Script de Ventas',
    descripcion: 'Script completo de llamada de diagnóstico de 45 minutos.',
    emoji: '📞',
    usa_ia: true,
    adn_field: 'script_venta',
    outputLabel: 'Script de ventas',
    inputs: [],
    promptTemplate: (_inputs, perfil) => `
Sos un coach de ventas para profesionales de salud. Construí un script completo de llamada de diagnóstico de 45 minutos.
${adnContext(perfil)}

Secciones del script:
1. Apertura y encuadre (primeros 5 min)
2. Preguntas de diagnóstico (10 min)
3. Profundización del dolor (10 min)
4. Presentación de la solución (10 min)
5. Manejo de las 5 objeciones más comunes del avatar (5 min)
6. Cierre con precio (5 min)

El tono es de evaluación, no de venta. Estás diagnosticando si podés ayudar, no convenciendo.`.trim(),
  },

  // ─── P9C.2: Protocolo de Entrega ────────────────────────────────────────────
  {
    id: 'H-P9C.2',
    grupo: 'D' as GrupoHerramienta,
    titulo: 'Documentador de Protocolo de Entrega',
    descripcion: 'Automatizá la entrega sin perder el toque personal.',
    emoji: '🤝',
    usa_ia: true,
    adn_field: 'adn_protocolo_servicio',
    outputLabel: 'Protocolo de entrega',
    inputs: [
      { id: 'primeras_24h', label: '¿Qué recibe el paciente en las primeras 24 horas después de pagar?', tipo: 'textarea', required: true },
      { id: 'primera_sesion', label: '¿Cómo se configura la primera sesión?', tipo: 'textarea', required: true },
      { id: 'recordatorios', label: '¿Qué recordatorios automáticos necesita durante el protocolo?', tipo: 'textarea', required: true },
      { id: 'seguimiento', label: '¿Cómo se hace el seguimiento entre sesiones?', tipo: 'textarea', required: true },
      { id: 'cierre', label: '¿Qué pasa al terminar el protocolo?', tipo: 'textarea', required: true },
    ],
    promptTemplate: (inputs, perfil) => `
Sos un consultor de automatización para profesionales de salud. Generá el protocolo de entrega completo.
${adnContext(perfil)}

Datos del servicio actual:
- Primeras 24h: ${inputs.primeras_24h}
- Primera sesión: ${inputs.primera_sesion}
- Recordatorios: ${inputs.recordatorios}
- Seguimiento: ${inputs.seguimiento}
- Cierre: ${inputs.cierre}

Generá:
1. Email de bienvenida automático (texto completo)
2. Lista de 5 automatizaciones prioritarias para GHL en orden de impacto
3. Protocolo de cierre: encuesta de satisfacción + solicitud de testimonio + propuesta de referido`.trim(),
  },

  // ─── P10.2: Sistema de Identidad ────────────────────────────────────────────
  {
    id: 'H-P10.2',
    grupo: 'D' as GrupoHerramienta,
    titulo: 'Generador de Sistema de Identidad',
    descripcion: 'Paleta, tipografía, tono de voz y brief completo.',
    emoji: '🎨',
    usa_ia: true,
    adn_field: 'adn_identidad_sistema',
    outputLabel: 'Sistema de identidad visual',
    inputs: [],
    promptTemplate: (_inputs, perfil) => `
Sos un diseñador de identidad visual para profesionales de salud. Usando el ADN del profesional (Historia, Propósito, Avatar, Nicho), generá un sistema completo.
${adnContext(perfil)}

Generá exactamente:

---PALETA DE COLORES---
- Primario: [hex + nombre + justificación]
- Secundario: [hex + nombre + justificación]
- Acento: [hex + nombre + justificación]
- Neutros: [2 hex + justificación]

---TIPOGRAFÍAS---
- Títulos: [fuente de Google Fonts + por qué]
- Cuerpo: [fuente de Google Fonts + por qué]

---TONO DE VOZ---
- 5 palabras que SÍ definen la marca
- 5 palabras que NO definen la marca
- Ejemplo: el mismo mensaje en la voz correcta y en la incorrecta

---BRIEF PARA DISEÑADOR---
[Resumen de 10 líneas listo para entregar a un diseñador o implementar en Canva]

La identidad debe ser coherente con el tipo de paciente que quiere atraer.`.trim(),
  },
];
