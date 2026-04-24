/**
 * campanasPrompts.ts — Prompts de IA para generacion de guias, copy e imagenes
 */
import type { ProfileV2 } from './supabase';
import type { CampanaFormState, AnguloCreativo, TipoCreativo, ObjetivoCampana, EstiloVisual, ImageMode, CustomText, ImageFormat } from './campanasTypes';
import { ESTILO_VISUAL_OPTIONS, IMAGE_FORMAT_OPTIONS } from './campanasTypes';

// ─── Contexto ADN del profesional ────────────────────────────────────────────

export function adnContext(perfil: Partial<ProfileV2>): string {
  const avatar = perfil.adn_avatar;
  const avatarStr = avatar
    ? `
  - Nombre ficticio: ${avatar.nombre_ficticio}
  - Edad: ${avatar.edad}, Profesion: ${avatar.profesion}
  - Situacion: ${avatar.situacion}
  - DOLORES: ${avatar.dolores?.join(', ') || 'no definidos'}
  - SUENOS: ${avatar.suenos?.join(', ') || 'no definidos'}
  - OBJECIONES: ${avatar.objeciones?.join(', ') || 'no definidas'}
  - LENGUAJE que usa: ${avatar.lenguaje?.join(', ') || 'no definido'}`
    : perfil.avatar_cliente ?? 'no definido';

  return `
=== CONTEXTO DEL SANADOR ===
- Nombre: ${perfil.nombre ?? 'Sanador'}
- Especialidad: ${perfil.especialidad ?? 'salud'}
- Nicho: ${perfil.nicho ?? perfil.adn_nicho ?? 'no definido'}
- PUV: ${perfil.adn_usp ?? 'no definido'}
- Posicionamiento: ${perfil.posicionamiento ?? 'no definido'}

=== AVATAR DEL CLIENTE IDEAL ===
${avatarStr}

=== MATRIZ DE TRANSFORMACION ===
- Punto A (El Infierno — dolores actuales): ${perfil.matriz_a ?? 'no definido'}
- Punto B (Los Obstaculos — por que no avanzan): ${perfil.matriz_b ?? 'no definido'}
- Punto C (El Cielo — resultado deseado): ${perfil.matriz_c ?? 'no definido'}

=== METODO Y OFERTA ===
- Metodo: ${perfil.metodo_nombre ?? 'no definido'}
- Pasos del metodo: ${perfil.metodo_pasos ?? 'no definido'}
- Oferta High Ticket: ${perfil.oferta_high ?? 'no definida'}
- Oferta Mid Ticket: ${perfil.oferta_mid ?? 'no definida'}
- Oferta Low / Lead Magnet: ${perfil.oferta_low ?? perfil.lead_magnet ?? 'no definido'}

=== HISTORIA ===
- Historia 50 palabras: ${perfil.historia_50 ?? 'no cargada'}
- Historia 150 palabras: ${perfil.historia_150 ?? 'no cargada'}

=== IDENTIDAD VISUAL ===
- Colores: ${perfil.identidad_colores ?? 'no definidos'}
- Tipografia: ${perfil.identidad_tipografia ?? 'no definida'}
- Tono de comunicacion: ${perfil.identidad_tono ?? 'no definido'}
`.trim();
}

// ─── Guia de configuracion de campana ────────────────────────────────────────

export function buildGuiaCampanaPrompt(
  campana: CampanaFormState,
  perfil: Partial<ProfileV2>,
  knowledgeBase: string,
): string {
  const objetivoGuides: Record<ObjetivoCampana, string> = {
    trafico_perfil: `
TIPO DE CAMPANA: Trafico al Perfil con CTA de Palabra Clave
- Objetivo en Meta: TRAFICO
- Destino: Perfil de Instagram
- CTA: El usuario comenta una palabra clave en el post o envia por DM
- Automatizacion: ManyChat detecta la palabra clave y activa flujo automatico
- GHL: Recibe el lead y envia recursos automaticamente + inicia conversacion
- Conversion: DM -> Recurso gratuito -> Conversacion -> Retargeting

INSTRUCCIONES ESPECIALES:
- Explicar como configurar la palabra clave en ManyChat (trigger por comentario y por DM)
- Explicar como conectar ManyChat con GHL via webhook o Zapier
- Detallar el flujo automatico: mensaje de bienvenida -> envio de recurso -> follow up a las 24h
- Naming convention para la campaña: [NICHO]_TRAFICO_[PALABRA-CLAVE]_[FECHA]`,

    mensajes_retargeting: `
TIPO DE CAMPAÑA: Mensajes (Retargeting)
- Objetivo en Meta: MENSAJES
- Audiencia: Custom audiences de personas que interactuaron con campaña de trafico
- Destino: Messenger o Instagram Direct
- Estrategia: Segundo contacto con quienes ya vieron la campaña de trafico pero no convirtieron

INSTRUCCIONES ESPECIALES:
- Explicar como crear custom audiences: visitantes del perfil ultimos 30-60 dias, personas que interactuaron con posts/ads, video viewers 50%+
- Configurar exclusion: excluir quienes ya enviaron DM o completaron formulario
- Copy de retargeting: recordatorio del recurso, social proof, urgencia suave
- Naming convention: [NICHO]_RETARGETING_MSG_[FECHA]`,

    clientes_potenciales: `
TIPO DE CAMPAÑA: Clientes Potenciales (Lead Gen con Filtro API)
- Objetivo en Meta: CLIENTES POTENCIALES (Lead Gen) o CONVERSIONES
- Destino: Landing page con VSL
- URL Landing: ${campana.url_landing || '[configurar]'}
- URL VSL: ${campana.url_vsl || '[configurar]'}
- Formulario: GHL con calendario integrado para agendar llamada
- FILTRO API DE CONVERSION: En el formulario se pregunta "Cuanto puedes invertir?"
  - Si responde menos de $${campana.monto_inversion_filtro || '500'} o "no puedo": NO se envia evento de conversion a Meta
  - Si califica (>=$${campana.monto_inversion_filtro || '500'}): SE ENVIA evento de conversion
  - Asi la API de Meta aprende a buscar leads cada vez mejores

INSTRUCCIONES ESPECIALES:
- Explicar configuracion del formulario GHL con campo de inversion
- Explicar como configurar la Conversion API de Meta (server-side events)
- Detallar la logica del filtro: webhook GHL -> verificar monto -> enviar/no enviar evento
- Configuracion del pixel y eventos custom
- Calendario GHL: configurar disponibilidad, confirmaciones automaticas, recordatorios
- Naming convention: [NICHO]_LEADGEN_VSL_[FECHA]`,
  };

  return `Eres un experto en Meta Ads especializado en marketing para profesionales de la salud.
Tu tarea es generar una GUIA PASO A PASO DETALLADA para configurar una campaña en Meta Ads Manager.

${adnContext(perfil)}

${knowledgeBase ? `\n=== CONOCIMIENTO ADICIONAL DEL PROFESIONAL ===\n${knowledgeBase}\n` : ''}

=== CONFIGURACION DE LA CAMPAÑA ===
- Nombre: ${campana.nombre}
- Nicho objetivo: ${campana.nicho || perfil.nicho || 'general'}
- Ubicacion: ${campana.ubicacion || 'a definir'}
- Rango de edad: ${campana.edad_min} - ${campana.edad_max} anos
- Genero: ${campana.genero}
- Intereses: ${campana.intereses.length > 0 ? campana.intereses.join(', ') : 'a definir segun nicho'}
- Presupuesto diario: $${campana.presupuesto_diario || 'a definir'}
- Duracion: ${campana.duracion_dias} dias

${objetivoGuides[campana.objetivo]}

=== FORMATO DE RESPUESTA ===
Genera una guia numerada paso a paso con las siguientes secciones:

## 1. Preparacion Previa
(Pixel, audiences, assets necesarios)

## 2. Crear Campana
(Nivel campana: objetivo, nombre, presupuesto, optimizacion)

## 3. Configurar Conjunto de Anuncios
(Audiencia, ubicaciones, programacion, placements)

## 4. Configurar Anuncio
(Formato, creativos, copy, CTA, tracking)

## 5. Automatizaciones Post-Campana
(ManyChat/GHL segun tipo, follow-ups, nurturing)

## 6. Metricas Clave a Monitorear
(KPIs especificos para este tipo de campana)

## 7. Checklist Final
(Lista de verificacion antes de publicar)

Se ESPECIFICO con los nombres exactos de botones, menus y opciones en Meta Ads Manager.
Incluye tips y mejores practicas para el nicho de salud.
Escribe en espanol, tono profesional pero cercano.`;
}

// ─── Generacion de Copy para Meta Ads ────────────────────────────────────────

const ANGULO_INSTRUCTIONS: Record<AnguloCreativo, string> = {
  contraintuitivo: `ANGULO CONTRAINTUITIVO:
Arranca con una afirmacion IMPACTANTE que contradiga una creencia popular del nicho.
Algo que haga frenar el scroll porque suena "incorrecto" pero es verdad.
Ejemplo de estructura: "Lo que tu [profesional] no te dice sobre [tema] es que..."
El hook debe generar disonancia cognitiva inmediata.`,

  directo: `ANGULO DIRECTO:
Ve al grano. Beneficio claro desde la primera linea.
Sin rodeos, sin historias largas. Resultado concreto + CTA fuerte.
Estructura: "[Resultado especifico] en [tiempo]. Sin [objecion comun]."
Ideal para audiencias calientes o retargeting.`,

  emocional: `ANGULO EMOCIONAL:
Conecta con el dolor o deseo MAS PROFUNDO del avatar.
Usa su LENGUAJE EXACTO (las frases que el usa internamente).
Pinta la escena de su sufrimiento actual con detalles vividos.
Luego muestra el contraste: como seria su vida con el resultado.
El CTA debe ser el puente entre ambos mundos.`,

  curiosidad: `ANGULO CURIOSIDAD:
Crea un OPEN LOOP irresistible. El usuario NECESITA hacer clic para cerrar el loop.
No reveles la respuesta en el anuncio. Insinua, sugiere, pero no completes.
Estructura: "Descubri [algo inesperado] sobre [tema] que [resultado sorprendente]..."
Usa numeros especificos y detalles intrigantes.`,

  autoridad: `ANGULO AUTORIDAD:
Posicionate como EL experto. Menciona tu metodo propio, anos de experiencia, resultados.
Usa prueba social: numero de pacientes/clientes, resultados medibles, credenciales.
El tono es seguro, experto, pero no arrogante.
Estructura: "Despues de [experiencia], desarrolle [metodo] que [resultado]. Ahora [CTA]."`,

  dolor: `ANGULO DOLOR:
Apunta DIRECTO al punto de dolor mas agudo del avatar.
Se especifico: no "problemas de salud" sino el dolor exacto con detalles.
Describe la situacion actual del avatar con precision dolorosa.
Luego ofrece la salida. El CTA es el alivio.
Estructura: "Si [dolor especifico], entonces [lo que necesitas saber]..."`,

  deseo: `ANGULO DESEO:
Pinta la VISION ASPIRACIONAL del resultado final.
Como se ve, se siente, se vive la transformacion completa.
El avatar debe verse reflejado en ese futuro.
Estructura: "Imaginate [escena del resultado ideal]. Eso es exactamente lo que [metodo/oferta] te da."`,
};

export function buildCopyPrompt(
  angulo: AnguloCreativo,
  tipo: TipoCreativo,
  perfil: Partial<ProfileV2>,
  objetivo: ObjetivoCampana,
  slideCount?: number,
): string {
  const ctaByObjetivo: Record<ObjetivoCampana, string> = {
    trafico_perfil: 'CTA: Invitar a comentar una PALABRA CLAVE o enviar DM para recibir un recurso gratuito. Ejemplo: "Comenta [PALABRA] y te envio [recurso] gratis"',
    mensajes_retargeting: 'CTA: Invitar a enviar mensaje directo para continuar la conversacion. Tono de recordatorio amigable.',
    clientes_potenciales: 'CTA: Invitar a hacer clic para ver la masterclass/VSL y agendar su llamada estrategica gratuita.',
  };

  const formatoOutput = tipo === 'yt_thumbnail'
    ? `Genera 3 variantes de texto para portada de YouTube.
Cada variante es un hook visual diferente para testear cual genera mas clicks.

Para CADA variante genera un JSON:
{ "texto_principal": "Hook largo alternativo (una oracion que describe el video)", "titulo": "HOOK CORTO Y POTENTE para la portada (max 6-8 palabras, DEBE generar curiosidad)", "descripcion": "Subtitulo complementario (max 5 palabras)", "cta_texto": "Texto badge/sticker (ej: GRATIS, NUEVO, CASO REAL)" }

REGLAS PARA YOUTUBE THUMBNAILS:
- El titulo es lo MAS importante — debe generar CLICK irresistible
- Usa numeros especificos, no genericos ("7 errores" no "errores comunes")
- Genera curiosidad SIN revelar la respuesta
- Emociones fuertes: sorpresa, miedo, ambicion, indignacion
- Titulo MUY corto — en la portada se lee en 1 segundo

Responde con un JSON array de 3 variantes: [{ variante1 }, { variante2 }, { variante3 }]`
    : tipo === 'carrusel'
    ? `Genera un carrusel de ${slideCount ?? 5} slides.
Para CADA slide genera un JSON con este formato:
{ "texto_principal": "...", "titulo": "...", "descripcion": "...", "cta_texto": "..." }

Estructura del carrusel:
- Slide 1: HOOK potente (frena el scroll)
- Slides 2-${(slideCount ?? 5) - 1}: Contenido de valor, puntos de dolor, transformacion
- Slide ${slideCount ?? 5}: CTA fuerte con urgencia

Responde con un JSON array: [{ slide1 }, { slide2 }, ...]`
    : `Genera UNA imagen unica con su copy para Meta Ads.
Responde con un JSON:
{
  "texto_principal": "El texto largo del anuncio (2-4 parrafos, maximo 300 palabras). Incluye hook, desarrollo y CTA.",
  "titulo": "Titulo corto y potente (maximo 40 caracteres)",
  "descripcion": "Descripcion del enlace (maximo 90 caracteres)",
  "cta_texto": "Texto del boton CTA (2-4 palabras)"
}`;

  return `Eres un copywriter de elite especializado en Meta Ads para profesionales de la salud.
Tu trabajo es generar copy que CONVIERTA — alto CTR, bajo costo por resultado.

${adnContext(perfil)}

=== OBJETIVO DE LA CAMPANA ===
${ctaByObjetivo[objetivo]}

=== ANGULO DE COMUNICACION ===
${ANGULO_INSTRUCTIONS[angulo]}

=== INSTRUCCIONES ===
${formatoOutput}

REGLAS:
- Usa el lenguaje EXACTO del avatar (sus palabras, no las tuyas)
- El hook debe frenar el scroll en 1-2 segundos
- Incluye al menos un "pattern interrupt" o "scroll stopper"
- No uses jerga medica compleja
- Tono: profesional pero cercano, como si hablaras con un amigo experto
- Incluye emojis estrategicos (maximo 3-4 en texto_principal)
- El titulo debe funcionar SOLO — sin contexto del texto principal
- SOLO responde con el JSON, sin texto adicional`;
}

// ─── Prompt para narrativa coherente de carrusel (1 sola llamada de texto) ──

export interface CarouselConceptoVisual {
  paleta: string;
  escena: string;
  tipografia: string;
  tratamiento: string;
}

export interface CarouselSlideCopy {
  titulo: string;
  subtitulo?: string;
  // Variacion de escena especifica para esta slide (plano/angulo/accion/elementos
  // distintos manteniendo el mismo lenguaje visual). Sin esto todas las slides
  // salen identicas cambiando solo el texto.
  escena?: string;
}

export interface CarouselNarrative {
  concepto_visual: CarouselConceptoVisual;
  slides: CarouselSlideCopy[];
}

const ESTILO_NARRATIVE_EXAMPLES: Record<EstiloVisual, {
  paleta: string;
  escena: string;
  tipografia: string;
  tratamiento: string;
}> = {
  foto_real: {
    paleta: '"#0F1419 fondo, #F5A623 acento, #FFFFFF texto"',
    escena: '"primer plano editorial de mujer 35-45 con fondo warm desenfocado"',
    tipografia: '"sans-serif bold blanco con outline fino, alineacion izquierda"',
    tratamiento: '"fotografia editorial DSLR, luz natural, shallow depth of field, tono warm cinematografico"',
  },
  bold: {
    paleta: '"#000000 fondo, #F5A623 acento saturado, #FFFFFF texto"',
    escena: '"composicion grafica con formas planas y tipografia oversized como protagonista, sin foto"',
    tipografia: '"sans-serif display ultra-bold, tamanos masivos, asimetrica"',
    tratamiento: '"diseño grafico flat vector, alto contraste, poster editorial Behance, sin fotografia"',
  },
  pixar: {
    paleta: '"tonos calidos saturados, pastel con acentos vivos (#FFB347, #4A90E2, #FFF8E1)"',
    escena: '"personaje estilizado 3D con ojos grandes expresivos en escena calida"',
    tipografia: '"sans-serif rounded bold, legible, con leve sombra suave"',
    tratamiento: '"render 3D estilo Pixar/Disney, subsurface scattering en piel, iluminacion cinematografica volumetrica, saturacion alta"',
  },
  caricatura: {
    paleta: '"colores planos saturados tipo animacion (#FF6B6B, #4ECDC4, #FFE66D, #1A1A2E)"',
    escena: '"personaje cartoon 2D con rasgos exagerados en fondo simple de color plano"',
    tipografia: '"sans-serif bold con contornos marcados, tipo caption de animacion"',
    tratamiento: '"ilustracion 2D cel-shaded, contornos negros gruesos, colores planos sin fotografia ni 3D"',
  },
  comic: {
    paleta: '"primarios saturados tipo comic (#E63946, #1D3557, #F1FAEE, negro tinta)"',
    escena: '"personaje en pose dinamica accion comic con lineas de velocidad, sin fotografia"',
    tipografia: '"display comic bold con outline grueso, mayusculas, onomatopeyas estilo Marvel/DC"',
    tratamiento: '"ilustracion comic book americano, tinta gruesa, halftone Ben-Day dots, cross-hatching, panel dinamico"',
  },
  plasticina: {
    paleta: '"tonos calidos tipo plastilina (#E8A87C, #C38D9E, #85DCBA, #41B3A3)"',
    escena: '"personaje/objeto hecho de plastilina con texturas visibles de dedos en fondo de masa"',
    tipografia: '"sans-serif redonda con sombra suave, como letras modeladas en arcilla"',
    tratamiento: '"claymation stop-motion, textura visible de arcilla y huellas digitales, Aardman Wallace and Gromit"',
  },
  noticias: {
    paleta: '"foto real de fondo + overlay negro semi-transparente, badge rojo #E63946, texto blanco, acento amarillo #FFD60A"',
    escena: '"foto documental de una persona reaccionando o escena candid relevante al tema, con titular bold uppercase sobre gradient negro inferior y badge VIRAL/URGENTE arriba"',
    tipografia: '"sans-serif condensed bold uppercase para titular grande, badge en sans-serif bold con fondo de color"',
    tratamiento: '"screenshot tipo medio viral de Instagram (El Kilombo / Infobae viral / FilterNews), foto real candid + overlay editorial bold, NO presentador en estudio, NO chyron de TV"',
  },
  twitter: {
    paleta: '"dark mode #15202B fondo, texto #FFFFFF, handle/timestamp gris #71767B, azul verificado #1D9BF0"',
    escena: '"screenshot organico de un post real en la app de X/Twitter, card unica del tweet visible"',
    tipografia: '"system font (Segoe UI / SF Pro) tamanos REALES de la app — display name ~16px bold, post body ~15-16px regular, handle ~14px gris. JAMAS texto display gigante"',
    tratamiento: '"replica pixel-perfect de un screenshot autentico de X/Twitter, texto a tamano de lectura normal (no de poster), sin efectos, sin gradientes, sin tipografia decorativa — debe parecer captura real"',
  },
};

export function buildCarouselNarrativePrompt(
  brief: string,
  totalSlides: number,
  angulo: AnguloCreativo,
  perfil: Partial<ProfileV2>,
  estilo?: EstiloVisual,
): string {
  const estiloInfo = estilo ? ESTILO_VISUAL_OPTIONS[estilo] : null;
  const examples = estilo ? ESTILO_NARRATIVE_EXAMPLES[estilo] : null;
  const estiloBlock = estiloInfo
    ? `
=== ESTILO VISUAL OBLIGATORIO — "${estiloInfo.titulo}" (NO sustituir, NO derivar hacia foto cinematografica si el estilo no lo pide) ===
${estiloInfo.prompt}

IMPORTANTE: El concepto visual unificado que generes DEBE describir literalmente una pieza en este estilo. Si el estilo es ilustracion, 3D, comic, plastilina o UI — NO uses palabras como "fotografia", "DSLR", "cinematografico", "filtro warm", "shallow depth of field", "lente" salvo que el estilo sea foto_real. Los campos paleta/escena/tipografia/tratamiento deben estar redactados en vocabulario del estilo (ej: "ilustracion 2D cel-shaded", "render 3D con subsurface scattering", "halftone Ben-Day", "claymation stop-motion").
`
    : '';

  const exampleBlock = examples
    ? `

Ejemplos concretos para el estilo "${estiloInfo!.titulo}" (usa este vocabulario, no palabras fotograficas si el estilo no es foto_real):
- paleta: ${examples.paleta}
- escena: ${examples.escena}
- tipografia: ${examples.tipografia}
- tratamiento: ${examples.tratamiento}`
    : `

Ejemplos genericos:
- paleta: "#0F1419 fondo, #F5A623 acento, #FFFFFF texto"
- escena: "primer plano de mujer 35-45 con fondo neutro warm desenfocado"
- tipografia: "sans-serif bold blanco con fino outline negro, alineacion izquierda"
- tratamiento: "filtro warm cinematografico, blur de fondo, alto contraste, vineteado sutil"`;

  const brandPaleta = perfil.identidad_colores?.trim();
  const brandBrief = brandPaleta
    ? `\n=== MANUAL DE MARCA (PALETA OBLIGATORIA) ===\nEl profesional ya definio una paleta de marca: ${brandPaleta}. Al construir "concepto_visual.paleta" usa EXACTAMENTE estos colores (no inventes otros). El estilo visual aporta la tecnica/estetica, pero los colores son los del manual.\n`
    : '';

  return `Eres un copywriter senior + director creativo especializado en carruseles de Instagram para profesionales de la salud.
Tu trabajo: crear un carrusel con HILO NARRATIVO COHERENTE — copy y direccion visual unificados.

${adnContext(perfil)}

=== ANGULO DE COMUNICACION ===
${ANGULO_INSTRUCTIONS[angulo]}
${estiloBlock}${brandBrief}
=== BRIEF DEL USUARIO (intencion del carrusel) ===
${brief.trim().length > 0
  ? brief
  : `(sin brief explicito — inventa una historia coherente al nicho "${perfil.nicho ?? perfil.adn_nicho ?? perfil.especialidad ?? 'salud y bienestar'}" y al angulo elegido. Asegurate de que cada slide avance el argumento: Slide 1 = hook fuerte distinto al resto, slides intermedios = una idea concreta diferente cada uno, slide final = CTA accionable.)`}

=== TAREA ===
1) Crea ${totalSlides} titulares encadenados que se LEAN como una sola historia de izquierda a derecha.
2) Define UN concepto visual UNICO compartido por TODAS las slides${estiloInfo ? `, escrito en el vocabulario del estilo "${estiloInfo.titulo}"` : ''}.
3) Define una ESCENA DISTINTA para cada slide — MISMO universo visual, pero DIFERENTE plano/angulo/accion/elementos. CADA slide debe sentirse visualmente fresca, NO una copia de la anterior con el texto cambiado.

Estructura narrativa obligatoria:
- Slide 1 = HOOK que detiene el scroll (curiosidad, dolor o promesa fuerte)
- Slides intermedios = desarrollo PROGRESIVO — UNA idea concreta por slide, encadenada con la anterior
- Slide ${totalSlides} = CTA claro y accionable

Reglas de copy:
- Cada titulo: maximo 6-8 palabras, bold y punchy
- Lenguaje del avatar, no jerga medica
- Que se entienda LEYENDO SOLO los titulos en orden — debe contar UNA historia
- Cada slide ENGANCHA con la siguiente (frase suspendida, pregunta, "pero...", numero que avanza)
- Sin repetir conceptos entre slides

Concepto visual compartido (LENGUAJE VISUAL — aplicable identico a las ${totalSlides} slides):
- paleta: 2-3 colores hex especificos, coherentes con el estilo obligatorio
- escena: UNIVERSO VISUAL comun (contexto general y mundo en el que suceden las slides), EN EL ESTILO obligatorio. Describe el "donde" y la estetica general, NO la accion especifica de una slide.
- tipografia: estilo tipografico unificado, coherente con el estilo obligatorio
- tratamiento: tecnica de render/tratamiento visual repetible, EXPLICITAMENTE en el estilo obligatorio (si es comic, decir "ilustracion comic"; si es pixar, decir "render 3D Pixar"; si es foto_real, decir "fotografia editorial"; etc.)

Reglas de variacion de escena por slide (CRITICAS — esto evita que todas las slides se vean iguales):
- Cada slide tiene su propia "escena" con una VARIACION distinta: distinto plano (close-up, medium, wide, detalle), distinto angulo (frontal, lateral, picado, contrapicado, over-the-shoulder), distinta accion (mirada, gesto, interaccion con objeto, pose), distintos elementos visibles (prop nuevo, fragmento de entorno distinto, gesto corporal diferente).
- Si hay personaje: misma persona e identidad, pero expresion/gesto/pose/interaccion DIFERENTE y encuadre DIFERENTE en cada slide.
- Cada "escena" por slide debe describir UNA micro-escena distinta dentro del mismo universo visual — no repetir el mismo plano ni los mismos elementos.
- Sin embargo, el LENGUAJE VISUAL (paleta, tipografia, tratamiento, iluminacion, mood, tecnica de render) debe ser IDENTICO entre slides — es lo que las hila visualmente.
- Pensa como un director de arte armando los storyboard frames de un carrusel: mismo set/universo, misma paleta, misma tecnica, pero CADA frame muestra algo distinto.
${exampleBlock}

Responde SOLO con este JSON, sin markdown, sin texto adicional:
{
  "concepto_visual": {
    "paleta": "...",
    "escena": "...",
    "tipografia": "...",
    "tratamiento": "..."
  },
  "slides": [
    { "titulo": "...", "subtitulo": "...", "escena": "variacion de escena concreta para ESTA slide — plano/angulo/accion/elementos distintos a las otras slides, pero dentro del mismo universo visual" }
  ]
}

El array "slides" DEBE tener exactamente ${totalSlides} elementos. Cada uno con su "escena" propia y distinta a las demas.`;
}

// ─── Prompt para generacion de imagenes ──────────────────────────────────────

export function buildImagePrompt(
  copy: { texto_principal: string; titulo: string } | null | undefined,
  angulo: AnguloCreativo,
  perfil: Partial<ProfileV2>,
  slideInfo?: { slideNumber: number; totalSlides: number; slideTexto?: string },
  options?: {
    estilo?: EstiloVisual;
    mode?: ImageMode;
    instrucciones?: string;
    userPrompt?: string;
    characterRefCount?: number;
    styleRefCount?: number;
    customText?: CustomText;
    format?: ImageFormat;
    isCarousel?: boolean;
    narrativeContext?: {
      conceptoVisual?: CarouselConceptoVisual;
      allSlideTitles?: string[];
      previousSlideTitle?: string;
      nextSlideTitle?: string;
      // Variacion de escena SOLO para esta slide (plano/angulo/accion/elementos
      // distintos al resto). Sin esto la imagen replica la escena del concepto
      // unificado y todas las slides salen identicas.
      slideEscena?: string;
      // Todas las variaciones de escena del carrusel (contexto para que el
      // modelo entienda que cada slide debe ser distinta visualmente).
      allSlideEscenas?: string[];
    };
  },
): string {
  const nicho = perfil.nicho ?? perfil.adn_nicho ?? perfil.especialidad ?? 'salud y bienestar';
  const colores = perfil.identidad_colores ?? 'tonos profesionales, dorado y oscuro';
  const tono = perfil.identidad_tono ?? 'profesional y cercano';
  const mode = options?.mode ?? 'completa';
  const estilo = options?.estilo;

  // ── Manual de Marca: paleta/tipografia/reglas con prioridad sobre estilo y refs
  const brandPaleta = perfil.identidad_colores?.trim();
  const brandTipografia = perfil.identidad_tipografia?.trim();
  const brandReglas = perfil.identidad_reglas_uso?.trim();
  const hasBrand = Boolean(brandPaleta || brandTipografia || brandReglas);

  const anguloVisual: Record<AnguloCreativo, string> = {
    contraintuitivo: 'Visual impactante, colores contrastantes, elemento de sorpresa visual. Diseno bold y disruptivo.',
    directo: 'Limpio, profesional, sin distracciones. El mensaje es protagonista. Fondo simple.',
    emocional: 'Imagenes que evocan emocion, luz calida, tonos humanos. Rostros o escenas empaticas.',
    curiosidad: 'Visual intrigante, parcialmente oculto, genera pregunta. Diseno misterioso pero profesional.',
    autoridad: 'Elegante, premium, con elementos de credibilidad. Tonos oscuros con acentos dorados.',
    dolor: 'Visual que refleja la frustracion o el problema. Tonos frios o grises con contraste.',
    deseo: 'Luminoso, aspiracional, resultado ideal. Colores vibrantes, sensacion de logro.',
  };

  const estiloPrompt = estilo ? ESTILO_VISUAL_OPTIONS[estilo].prompt : anguloVisual[angulo];

  // Custom text with hierarchy — H2/H3/CTA opcionales.
  // CRITICO: los nombres "H1/H2/H3/CTA" son metadata interna — la imagen renderiza SOLO
  // el contenido entre comillas, NUNCA las etiquetas.
  const customTextSection = options?.customText
    ? (() => {
        const ct = options.customText!;
        const h2Trim = ct.h2?.trim();
        const ctaTrim = ct.cta?.trim();
        const h3Trim = ct.h3?.trim();

        // Bloques con descripciones en prosa (no labels code-like que el modelo pueda echo-ear).
        const lines = [`  Texto principal (jerarquia 1, dominante): "${ct.h1}"`];
        if (h2Trim) lines.push(`  Texto secundario (jerarquia 2, complementa al principal): "${h2Trim}"`);
        if (h3Trim) lines.push(`  Texto terciario (jerarquia 3, pequeño): "${h3Trim}"`);
        if (ctaTrim) lines.push(`  Texto del boton CTA (debe verse como boton): "${ctaTrim}"`);

        const jerarquia = estilo === 'twitter'
          ? [
              '- El texto principal es el body del tweet — tamano de lectura NORMAL (~15-16px equivalente), regular weight, system font, alineado a la izquierda',
              '- PROHIBIDO texto display gigante o poster style — debe verse organico dentro del card del tweet',
            ]
          : estilo === 'noticias'
            ? [
                '- El texto principal es el TITULAR del post viral — sans-serif condensed bold UPPERCASE, ocupa el tercio inferior sobre gradient negro',
                '- Si hay un dato/cifra (porcentaje, ranking), destacarlo en color amarillo o acento',
                ...(h2Trim ? ['- El texto secundario complementa el titular en menor tamano'] : []),
                ...(ctaTrim ? ['- El CTA aparece como badge tipo "VIRAL" / "ULTIMO MOMENTO" en sans-serif bold mayusculas'] : []),
              ]
            : [
                '- El texto principal es lo primero que el ojo ve — tamano dominante, bold, maximo contraste',
                ...(h2Trim ? ['- El texto secundario complementa al principal — menor tamano, puede ser lighter'] : []),
                ...(ctaTrim ? ['- El boton CTA debe parecer un BOTON real — fondo de color solido que contraste (ej: #F5A623 dorado), bordes redondeados, texto oscuro sobre fondo claro. Debe gritar "HAZ CLIC"'] : []),
                '- La jerarquia visual debe ser INMEDIATAMENTE clara en 1 segundo',
              ];

        const restriction = (!h2Trim && !ctaTrim && !h3Trim)
          ? '\n\nIMPORTANTE: Renderizar UNICAMENTE el texto principal. NO inventar subtitulos, badges, CTA ni textos adicionales.'
          : !ctaTrim
            ? '\n\nIMPORTANTE: NO incluir CTA ni botones — el usuario eligio no incluirlos.'
            : '';

        return `TEXTOS A RENDERIZAR EN LA IMAGEN (renderizar SOLO el contenido entre comillas, NUNCA las etiquetas "Texto principal", "secundario", "terciario", "boton CTA" ni similares — esos son nombres internos):\n${lines.join('\n')}\n\nJERARQUIA TIPOGRAFICA CRITICA:\n${jerarquia.join('\n')}${restriction}\n\nPROHIBIDO ABSOLUTO: NO renderizar las palabras "H1", "H2", "H3", "CTA", "Titulo", "Subtitulo", "Texto principal", "Texto secundario", "Texto terciario" ni ninguna etiqueta de campo. SOLO el contenido textual real entre comillas.`;
      })()
    : null;

  // El texto a renderizar SOLO sale de fuentes explicitas (copy generado, slide texto explicito, o custom text).
  // El userPrompt es un BRIEF de intencion, NO texto a renderizar literal.
  const realTexto = (slideInfo?.slideTexto ?? copy?.titulo ?? '').trim();
  const hasRealTexto = realTexto.length > 0;

  const tipografiaBlock = estilo === 'twitter'
    ? `TIPOGRAFIA (estilo Twitter/X — debe parecer captura real, NO poster):
- Tamano de lectura NORMAL — system font (Segoe UI / SF Pro / Helvetica)
- Body del tweet en regular weight ~15-16px equivalente, alineado a la izquierda
- Display name en bold ~16px, handle y timestamp en gris ~14px
- PROHIBIDO texto display gigante, oversized, poster style o tipografia decorativa
- El texto NO debe dominar la imagen — debe verse organico dentro del card del tweet`
    : estilo === 'noticias'
      ? `TIPOGRAFIA (estilo medio viral — overlay editorial sobre foto):
- Titular en sans-serif condensed BOLD UPPERCASE, ocupa el tercio inferior sobre gradient negro
- Si hay subtitulo o cifra clave (ej: "67%", "8 de cada 10"), destacarla en color amarillo o acento
- Badge superior pequeno tipo "VIRAL" / "ULTIMO MOMENTO" / "URGENTE" en sans-serif bold mayusculas, fondo de color solido
- Sin tipografia decorativa, sin serifs ornamentales — debe parecer post real de medio viral de Instagram`
      : `TIPOGRAFIA:
- Texto principal grande, bold, legible desde el celular
- Tipografia moderna sans-serif (tipo Montserrat o Inter)
- Contraste MAXIMO entre texto y fondo
- El texto debe DOMINAR la composicion, no ser un detalle pequeno
- Incluir CTA visual si es relevante`;

  const inventaTextoBlock = slideInfo
    ? `TEXTO A INCLUIR EN LA IMAGEN (INVENTALO TU):
- Generar un titular CORTO y punchy (maximo 6-8 palabras) para ESTE slide
- Slide ${slideInfo.slideNumber} de ${slideInfo.totalSlides}: ${
        slideInfo.slideNumber === 1
          ? 'HOOK que detiene el scroll, abre la curiosidad o nombra el dolor'
          : slideInfo.slideNumber === slideInfo.totalSlides
            ? 'CTA claro y accionable (ej: "Aplica ahora", "Reservar diagnostico")'
            : 'Desarrollo del argumento — aporta UNA idea concreta, no resumen'
      }
- El copy debe ser COHERENTE con la DESCRIPCION DEL USUARIO de arriba (esa es la INTENCION)
- NO copies literalmente la descripcion del usuario — generala TU como copywriter pro
- Mantener narrativa y estilo visual consistentes con los demas slides

${tipografiaBlock}`
    : `TEXTO A INCLUIR EN LA IMAGEN (INVENTALO TU):
- Generar un titular CORTO y punchy (maximo 6-8 palabras) que detenga el scroll
- Coherente con la DESCRIPCION DEL USUARIO de arriba (esa es la INTENCION, no el texto literal)
- NO copies la descripcion del usuario — generala TU como copywriter pro
- Si aplica, incluir un CTA breve y claro

${tipografiaBlock}`;

  const textoSection = mode === 'fondo'
    ? `IMPORTANTE: NO incluir NINGUN texto, letras, palabras, numeros ni tipografia en la imagen. Solo imagen visual pura. La imagen sera usada como fondo y el texto se agrega despues.`
    : customTextSection
      ? customTextSection
      : hasRealTexto
        ? `TEXTO A INCLUIR EN LA IMAGEN: "${realTexto}"

${tipografiaBlock}`
        : inventaTextoBlock;

  const hasStyleRef = (options?.styleRefCount ?? 0) > 0;
  const userPromptSection = options?.userPrompt?.trim()
    ? hasStyleRef
      ? `\nTEMA / CONTEXTO DEL CONTENIDO (orienta el angulo del mensaje, NO la estetica — la estetica viene de la referencia visual adjunta):\n${options.userPrompt.trim()}\n`
      : `\nTEMA / CONTEXTO DEL CONTENIDO (orienta el angulo del mensaje, NO descripcion literal de que dibujar):\n${options.userPrompt.trim()}\n`
    : '';

  const instruccionesCustom = options?.instrucciones
    ? `\nINSTRUCCIONES ESPECIFICAS DEL USUARIO:\n${options.instrucciones}\n`
    : '';

  const characterCount = options?.characterRefCount ?? 0;
  const characterRefPrompt = characterCount > 0
    ? `\nREFERENCIA DE PERSONAJE (${characterCount} ${characterCount === 1 ? 'imagen adjunta' : 'imagenes adjuntas de la MISMA persona desde distintos angulos'}):
La persona en la imagen generada DEBE verse EXACTAMENTE igual que la persona en ${characterCount === 1 ? 'la foto de referencia' : 'las fotos de referencia'} adjuntas.
Mismos rasgos faciales, mismo tono de piel, misma edad, misma estructura facial.
${characterCount > 1 ? 'Usa las multiples fotos para capturar la identidad consistente desde cualquier angulo.\n' : ''}Esto es INNEGOCIABLE — la identidad del personaje debe respetarse al 100%.
NO cambies la apariencia de esta persona bajo ninguna circunstancia.\n`
    : '';

  const styleCount = options?.styleRefCount ?? 0;
  const isCarouselMode = options?.isCarousel === true;
  const styleRefPrompt = styleCount > 0
    ? isCarouselMode
      ? `\nREFERENCIA DE ESTILO VISUAL (${styleCount} ${styleCount === 1 ? 'imagen adjunta' : 'imagenes adjuntas de referencia estetica'} — PRIORIDAD MAXIMA):
La referencia adjunta define el LENGUAJE VISUAL del carrusel, NO una plantilla a clonar slide por slide.
Esta pieza es UNA slide de un set — cada slide del carrusel debe ser visualmente FRESCA y DISTINTA a las otras (plano, angulo, accion, elementos), manteniendo el MISMO lenguaje visual.

COPIAR EXACTAMENTE de la referencia (LENGUAJE VISUAL — identico en TODAS las slides):
- La MISMA tipografia (peso, familia, estilo serif/sans-serif/display, tracking, jerarquia)
${brandPaleta ? '- NO copiar la paleta de la referencia — la PALETA DE MARCA del bloque "MANUAL DE MARCA" manda. La referencia aporta tratamiento y estetica, pero los COLORES finales son los del manual.' : '- La MISMA paleta de colores (tonos hex exactos, gradientes, contrastes)'}
- El MISMO tratamiento visual (filtros, temperatura de color, contraste, grano, textura)
- La MISMA estetica y mood (premium, bold, editorial, minimalista, etc.)
- La MISMA calidad de iluminacion y tecnica de render

VARIAR OBLIGATORIAMENTE (ESCENA — distinta en cada slide del carrusel):
- DISTINTO plano: close-up, medium shot, wide, plano detalle, over-the-shoulder, insert de objeto. No repetir el plano de la referencia en TODAS las slides.
- DISTINTO angulo y encuadre: frontal, lateral, 3/4, picado, contrapicado. La camara cambia de posicion entre slides.
- DISTINTA accion/gesto/expresion: si hay personaje, su pose/mirada/interaccion debe ser diferente en cada slide (no copiar la pose exacta de la referencia en todas).
- DISTINTOS elementos y props: nuevos objetos visibles, fragmentos de entorno distintos, distintos detalles del set. No clonar los mismos elementos de la referencia en cada slide.
- DISTINTA composicion puntual: la posicion del texto y del sujeto puede variar slide a slide, siempre respetando la jerarquia tipografica.

La referencia adjunta es una muestra del ESTILO — pensala como un frame de moodboard, no como una plantilla a clonar. El carrusel resultante debe tener 5-10 slides que se sientan de la MISMA familia visual pero muestren distintos momentos/planos/acciones.

NO COPIAR (PROHIBIDO):
- NO copies el texto/palabras que aparecen en la referencia
- NO copies logos ni marcas de la referencia
- NO clones la composicion exacta de la referencia en cada slide (eso genera 10 slides iguales)
- Usa UNICAMENTE el texto proporcionado en ESTE prompt

Resultado esperado: el carrusel completo debe verse como si el MISMO director de arte armara un storyboard — misma paleta, misma tipografia, mismo tratamiento, pero CADA slide muestra algo visualmente distinto.\n`
      : `\nREFERENCIA DE ESTILO VISUAL (${styleCount} ${styleCount === 1 ? 'imagen adjunta' : 'imagenes adjuntas de referencia estetica'} — PRIORIDAD MAXIMA):
REPLICA el diseño de la imagen de referencia de estilo lo mas fielmente posible:

COPIAR EXACTAMENTE:
- La MISMA tipografia (peso, tamaño relativo, tracking, estilo serif/sans-serif/display)
${brandPaleta ? '- NO copiar la paleta de la referencia — la PALETA DE MARCA del bloque "MANUAL DE MARCA" manda. La referencia aporta composicion/tratamiento/estetica, pero los COLORES finales son los del manual.' : '- La MISMA paleta de colores (tonos exactos, gradientes, contrastes)'}
- La MISMA composicion y layout (posicion de elementos, alineacion, spacing)
- Los MISMOS efectos visuales (sombras, glows, overlays, mascaras, gradientes)
- El MISMO tratamiento fotografico (filtros, temperatura de color, contraste)
- La MISMA estetica general (premium, bold, minimalista, etc.)
- El MISMO estilo de fondo y elementos decorativos

NO COPIAR (PROHIBIDO):
- NO copies el texto/palabras que aparecen en la referencia
- NO copies logos ni marcas de la referencia
- Usa UNICAMENTE el texto proporcionado en ESTE prompt

El resultado debe verse como si el MISMO diseñador hubiera creado ambas piezas. Misma mano, mismo estilo, diferente contenido.\n`
    : '';

  const fmt = options?.format ?? '1:1';
  const fmtInfo = IMAGE_FORMAT_OPTIONS[fmt];
  const isYouTube = fmt === 'yt_thumbnail';

  // Bloque de continuidad narrativa/visual del carrusel
  const nc = options?.narrativeContext;
  const narrativeBlock = nc
    ? `\n=== HILO NARRATIVO Y VISUAL DEL CARRUSEL (CRITICO — RESPETAR AL 100%) ===
${nc.conceptoVisual ? `LENGUAJE VISUAL UNIFICADO (aplicar IDENTICO a TODAS las slides del carrusel${estilo ? ` — SIEMPRE dentro de la tecnica "${ESTILO_VISUAL_OPTIONS[estilo].titulo}"` : ''}):
- Paleta: ${brandPaleta ? `IGNORAR la paleta del concepto — usar la PALETA DE MARCA del bloque "MANUAL DE MARCA" (${brandPaleta})` : nc.conceptoVisual.paleta}
- Universo visual / contexto: ${nc.conceptoVisual.escena}
- Tipografia: ${nc.conceptoVisual.tipografia}
- Tratamiento visual: ${nc.conceptoVisual.tratamiento}

` : ''}${nc.allSlideTitles && nc.allSlideTitles.length > 0 ? `NARRATIVA COMPLETA DEL CARRUSEL (asi se lee de izquierda a derecha — contexto interno SOLAMENTE, no renderizar):
${nc.allSlideTitles.map((t) => `  - "${t}"`).join('\n')}

` : ''}${nc.allSlideEscenas && nc.allSlideEscenas.length > 0 ? `VARIACIONES DE ESCENA DEL CARRUSEL COMPLETO (contexto interno — te muestra que cada slide es una escena distinta dentro del mismo universo):
${nc.allSlideEscenas.map((e, i) => `  - Slide ${i + 1}: ${e || '(sin variacion definida)'}`).join('\n')}

` : ''}${nc.slideEscena ? `ESCENA ESPECIFICA DE ESTA SLIDE (NO aplicar la misma escena de las otras slides — esta slide debe mostrar justamente esto):
${nc.slideEscena}

` : ''}${nc.previousSlideTitle ? `La pieza ANTERIOR decia: "${nc.previousSlideTitle}" — esta debe encadenar argumentalmente con esa, pero con una escena visualmente DISTINTA (otro plano, otro gesto, otros elementos).\n` : ''}${nc.nextSlideTitle ? `La pieza SIGUIENTE dira: "${nc.nextSlideTitle}" — esta debe construir hacia esa idea.\n` : ''}
REGLA DE CONTINUIDAD (CRITICA — leer con atencion):
- LO QUE SE MANTIENE IDENTICO entre TODAS las slides (lenguaje visual): paleta exacta, tipografia y jerarquia tipografica, tratamiento visual, iluminacion, mood, tecnica de render, identidad del personaje si hay, calidad y textura.
- LO QUE DEBE VARIAR en CADA slide (escena): plano (close-up/medium/wide/detalle), angulo y encuadre (frontal/lateral/picado/contrapicado/over-the-shoulder), accion o gesto, expresion del personaje, elementos y props visibles, composicion puntual.
- NO es una plantilla donde solo cambia el texto — cada slide es un FRAME distinto del mismo universo visual. Pensalo como storyboard frames: mismo set, mismo art direction, pero cada frame muestra algo distinto.
- Si el personaje aparece en varias slides, es la MISMA persona (misma identidad/rostro/ropa) pero en DISTINTA pose/accion/encuadre en cada slide.
- PROHIBIDO: generar esta slide clonando la composicion de la referencia o de las otras slides con solo el texto cambiado. Si sentis la tentacion de repetir el mismo plano/accion, cambialos.${estilo && estilo !== 'foto_real' ? `\n\nREGLA DE ESTILO (NO NEGOCIABLE): La tecnica de render es "${ESTILO_VISUAL_OPTIONS[estilo].titulo}". Si el LENGUAJE VISUAL arriba contiene palabras tipo "fotografia", "DSLR", "cinematografico", "lente", "warm filter", IGNORALAS — el estilo base manda. Usa solo la PALETA, UNIVERSO y TIPOGRAFIA del concepto, pero RENDERIZA siempre en "${ESTILO_VISUAL_OPTIONS[estilo].titulo}".` : ''}\n`
    : '';

  const hasEstiloOverride = estilo && nc?.conceptoVisual;
  const estiloOverrideHeader = hasEstiloOverride
    ? `\n=== TECNICA DE RENDER OBLIGATORIA — "${ESTILO_VISUAL_OPTIONS[estilo!].titulo}" (PRIORIDAD #1, INNEGOCIABLE) ===
${ESTILO_VISUAL_OPTIONS[estilo!].prompt}

Esta es la tecnica visual con la que debes renderizar la imagen. Todo lo demas (concepto unificado del carrusel, angulo, tono) se aplica DENTRO de esta tecnica. Si alguna otra instruccion sugiere una tecnica diferente (ej: "fotografia editorial" cuando el estilo es comic), IGNORALA — esta tecnica manda.\n`
    : '';

  const shouldSuppressAnguloVisual = estilo && estilo !== 'foto_real' && nc?.conceptoVisual;

  // Bloque de Manual de Marca — se inyecta con maxima prioridad (colocado cerca
  // del final del prompt para que el modelo lo tome como autoridad definitiva).
  // La PALETA manda sobre estilo y sobre imagen de referencia. La TIPOGRAFIA se
  // aplica si el estilo lo permite (twitter/noticias tienen codigos propios).
  // Las REGLAS DE USO son innegociables.
  const brandBlock = hasBrand
    ? `\n=== MANUAL DE MARCA — PRIORIDAD MAXIMA SOBRE ESTILO Y REFERENCIAS (aplicar SIEMPRE) ===
${brandPaleta ? `PALETA DE MARCA (OBLIGATORIA — estos colores mandan sobre la paleta sugerida por el estilo visual y sobre los colores de cualquier imagen de referencia adjunta; el estilo define la TECNICA y el tratamiento, esta paleta define los COLORES finales): ${brandPaleta}
` : ''}${brandTipografia ? `TIPOGRAFIA DE MARCA (aplicar cuando sea compatible con el estilo; si el estilo es "twitter" o "noticias" respetar los codigos tipograficos propios de esos formatos): ${brandTipografia}
` : ''}${brandReglas ? `REGLAS DE USO DE MARCA (INNEGOCIABLES — tienen que cumplirse aunque contradigan otras instrucciones del prompt): ${brandReglas}
` : ''}`
    : '';

  return `Genera una imagen ${isYouTube ? 'de portada de YouTube' : 'publicitaria de ALTO IMPACTO para Meta Ads (Instagram/Facebook)'}.
${isYouTube ? 'Esta portada debe generar CLICKS. El hook visual es CRITICO — el usuario decide en 1 segundo si hace clic o no.' : 'Esta imagen debe FRENAR EL SCROLL. Tiene que ser visualmente tan potente que el usuario deje de scrollear en menos de 1 segundo.'}
${estiloOverrideHeader}
NICHO: ${nicho}
${hasEstiloOverride
  ? 'DIRECCION VISUAL: Aplicar el CONCEPTO VISUAL UNIFICADO del carrusel (paleta, escena, tipografia) ESTRICTAMENTE dentro de la TECNICA DE RENDER OBLIGATORIA definida arriba.'
  : nc?.conceptoVisual
    ? 'DIRECCION VISUAL: Seguir el CONCEPTO VISUAL UNIFICADO del carrusel (ver bloque abajo)'
    : styleCount > 0
      ? 'DIRECCION VISUAL: Seguir la referencia de estilo adjunta (ver instrucciones abajo)'
      : `DIRECCION VISUAL: ${estiloPrompt}`}
${shouldSuppressAnguloVisual
  ? `ANGULO COMUNICACIONAL (aplicar SOLO como guia emocional/narrativa, NO como direccion fotografica — la tecnica de render de arriba manda): ${anguloVisual[angulo].replace(/foto|fotografia|cinematografic[oa]|DSLR|lente|warm|filtro/gi, '').trim() || 'guiar la emocion y el enfasis de la composicion'}`
  : `ANGULO COMUNICACIONAL: ${anguloVisual[angulo]}`}
${brandPaleta
  ? 'COLORES: Usar la PALETA DE MARCA del bloque "MANUAL DE MARCA" — tiene prioridad sobre concepto visual, estilo y referencia.'
  : nc?.conceptoVisual ? 'COLORES: Usar la paleta del concepto visual unificado' : styleCount > 0 ? 'COLORES: Usar la paleta de la referencia de estilo' : `COLORES DE MARCA: ${colores}`}
TONO: ${tono}
${userPromptSection}${narrativeBlock}${characterRefPrompt}${styleRefPrompt}${instruccionesCustom}${brandBlock}
${textoSection}

${slideInfo ? `(Esta es la pieza ${slideInfo.slideNumber} de un set de ${slideInfo.totalSlides} — mantener LENGUAJE VISUAL identico (paleta, tipografia, tratamiento) pero VARIAR la escena (plano, angulo, accion, elementos) respecto a las demas slides. La numeracion es metadata interna, NO se renderiza.)` : `FORMATO: ${fmtInfo.label} — ${fmtInfo.descripcion}`}

REQUISITOS CRITICOS:
- Formato: ${fmtInfo.width}x${fmtInfo.height}px (aspect ratio ${fmt === 'yt_thumbnail' ? '16:9' : fmt})
- La composicion debe ser PROFESIONAL, nivel agencia de publicidad
- NO parecer imagen de stock generica — debe sentirse unica y con personalidad
- NO incluir logos de Meta/Instagram
- Si incluye personas: expresiones REALES, no poses artificiales
- Iluminacion cinematografica, no plana
- Jerarquia visual clara: el ojo va primero al elemento mas importante

PROHIBIDO RENDERIZAR (texto que NUNCA debe aparecer en la imagen):
- Numeros de slide / paginadores tipo "1/5", "Slide 3/5", "3 de 5", etc.
- Etiquetas de jerarquia tipografica tipo "H1", "H2", "H3", "CTA", "Titulo", "Subtitulo"
- Nombres de campos del prompt — solo renderizar el CONTENIDO de los textos, nunca su etiqueta
- Badges automaticos tipo "Carrusel", "Consejo #N", "Tema:", "Ansiedad y estres", "Slide X"
- Watermarks, marcas de agua, "@usuario", handles de redes
- Logos de marcas, Meta, Instagram, OpenAI, Gemini, "Generated by AI"
- Cualquier texto que sirva de metadata interna del sistema y no haya sido pedido EXPLICITAMENTE como contenido a mostrar`;
}
