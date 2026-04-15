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
=== CONTEXTO DEL PROFESIONAL DE SALUD ===
- Nombre: ${perfil.nombre ?? 'Profesional'}
- Especialidad: ${perfil.especialidad ?? 'salud'}
- Nicho: ${perfil.nicho ?? perfil.adn_nicho ?? 'no definido'}
- USP: ${perfil.adn_usp ?? 'no definido'}
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
}

export interface CarouselNarrative {
  concepto_visual: CarouselConceptoVisual;
  slides: CarouselSlideCopy[];
}

export function buildCarouselNarrativePrompt(
  brief: string,
  totalSlides: number,
  angulo: AnguloCreativo,
  perfil: Partial<ProfileV2>,
): string {
  return `Eres un copywriter senior + director creativo especializado en carruseles de Instagram para profesionales de la salud.
Tu trabajo: crear un carrusel con HILO NARRATIVO COHERENTE — copy y direccion visual unificados.

${adnContext(perfil)}

=== ANGULO DE COMUNICACION ===
${ANGULO_INSTRUCTIONS[angulo]}

=== BRIEF DEL USUARIO (intencion del carrusel) ===
${brief}

=== TAREA ===
1) Crea ${totalSlides} titulares encadenados que se LEAN como una sola historia de izquierda a derecha.
2) Define UN concepto visual UNICO compartido por TODAS las slides.

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

Concepto visual compartido (DEBE poder aplicarse identico a las ${totalSlides} slides):
- paleta: 2-3 colores hex especificos (ej: "#0F1419 fondo, #F5A623 acento, #FFFFFF texto")
- escena: tipo de escena dominante repetible en cada slide (ej: "primer plano de mujer 35-45 con fondo neutro warm desenfocado", "flatlay minimalista de elementos del nicho", "retrato del especialista con overlay de texto")
- tipografia: estilo tipografico unificado (ej: "sans-serif bold blanco con fino outline negro, alineacion izquierda")
- tratamiento: tratamiento fotografico repetible (ej: "filtro warm cinematografico, blur de fondo, alto contraste, vineteado sutil")

Responde SOLO con este JSON, sin markdown, sin texto adicional:
{
  "concepto_visual": {
    "paleta": "...",
    "escena": "...",
    "tipografia": "...",
    "tratamiento": "..."
  },
  "slides": [
    { "titulo": "...", "subtitulo": "..." }
  ]
}

El array "slides" DEBE tener exactamente ${totalSlides} elementos.`;
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
    narrativeContext?: {
      conceptoVisual?: CarouselConceptoVisual;
      allSlideTitles?: string[];
      previousSlideTitle?: string;
      nextSlideTitle?: string;
    };
  },
): string {
  const nicho = perfil.nicho ?? perfil.adn_nicho ?? perfil.especialidad ?? 'salud y bienestar';
  const colores = perfil.identidad_colores ?? 'tonos profesionales, dorado y oscuro';
  const tono = perfil.identidad_tono ?? 'profesional y cercano';
  const mode = options?.mode ?? 'completa';
  const estilo = options?.estilo;

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

  // Custom text with hierarchy
  const customTextSection = options?.customText
    ? `TEXTO A INCLUIR EN LA IMAGEN (JERARQUIA OBLIGATORIA):
- H1 (titulo principal, MAS GRANDE Y BOLD): "${options.customText.h1}"
- H2 (subtitulo, segundo en jerarquia): "${options.customText.h2}"
${options.customText.h3 ? `- H3 (texto terciario, mas pequeño): "${options.customText.h3}"` : ''}
- CTA (boton de accion, debe DESTACAR): "${options.customText.cta}"

JERARQUIA TIPOGRAFICA CRITICA:
- H1 es lo primero que el ojo ve — tamaño dominante, bold, maximo contraste
- H2 complementa al H1 — menor tamaño, puede ser lighter
- CTA debe parecer un BOTON real — fondo de color solido que contraste (ej: #F5A623 dorado), bordes redondeados, texto oscuro sobre fondo claro. Debe gritar "HAZ CLIC"
- La jerarquia visual debe ser INMEDIATAMENTE clara en 1 segundo`
    : null;

  // El texto a renderizar SOLO sale de fuentes explicitas (copy generado, slide texto explicito, o custom text).
  // El userPrompt es un BRIEF de intencion, NO texto a renderizar literal.
  const realTexto = (slideInfo?.slideTexto ?? copy?.titulo ?? '').trim();
  const hasRealTexto = realTexto.length > 0;

  const tipografiaBlock = `TIPOGRAFIA:
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

  const userPromptSection = options?.userPrompt?.trim()
    ? `\nDESCRIPCION DEL USUARIO (que quiere ver en la imagen):\n${options.userPrompt.trim()}\n`
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
  const styleRefPrompt = styleCount > 0
    ? `\nREFERENCIA DE ESTILO VISUAL (${styleCount} ${styleCount === 1 ? 'imagen adjunta' : 'imagenes adjuntas de referencia estetica'} — PRIORIDAD MAXIMA):
REPLICA el diseño de la imagen de referencia de estilo lo mas fielmente posible:

COPIAR EXACTAMENTE:
- La MISMA tipografia (peso, tamaño relativo, tracking, estilo serif/sans-serif/display)
- La MISMA paleta de colores (tonos exactos, gradientes, contrastes)
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
${nc.conceptoVisual ? `CONCEPTO VISUAL UNIFICADO (aplicar identico a TODAS las slides del carrusel):
- Paleta: ${nc.conceptoVisual.paleta}
- Escena dominante: ${nc.conceptoVisual.escena}
- Tipografia: ${nc.conceptoVisual.tipografia}
- Tratamiento fotografico: ${nc.conceptoVisual.tratamiento}

` : ''}${nc.allSlideTitles && nc.allSlideTitles.length > 0 ? `NARRATIVA COMPLETA DEL CARRUSEL (asi se lee de izquierda a derecha):
${nc.allSlideTitles.map((t, i) => `  Slide ${i + 1}: "${t}"`).join('\n')}

` : ''}${nc.previousSlideTitle ? `Slide ANTERIOR decia: "${nc.previousSlideTitle}" — esta slide debe encadenar visualmente y argumentalmente con esa.\n` : ''}${nc.nextSlideTitle ? `Slide SIGUIENTE dira: "${nc.nextSlideTitle}" — esta slide debe construir hacia esa idea.\n` : ''}
REGLA DE CONTINUIDAD VISUAL: misma paleta exacta, misma escena/encuadre, misma tipografia, mismo tratamiento, mismo personaje (si hay) entre todas las slides. Solo cambia el TEXTO y micro-detalles de la composicion. Que se vea claramente que es UN SOLO carrusel, no piezas sueltas.\n`
    : '';

  return `Genera una imagen ${isYouTube ? 'de portada de YouTube' : 'publicitaria de ALTO IMPACTO para Meta Ads (Instagram/Facebook)'}.
${isYouTube ? 'Esta portada debe generar CLICKS. El hook visual es CRITICO — el usuario decide en 1 segundo si hace clic o no.' : 'Esta imagen debe FRENAR EL SCROLL. Tiene que ser visualmente tan potente que el usuario deje de scrollear en menos de 1 segundo.'}

NICHO: ${nicho}
${nc?.conceptoVisual ? 'DIRECCION VISUAL: Seguir el CONCEPTO VISUAL UNIFICADO del carrusel (ver bloque abajo) — tiene PRIORIDAD sobre cualquier estilo por defecto' : styleCount > 0 ? 'DIRECCION VISUAL: Seguir la referencia de estilo adjunta (ver instrucciones abajo)' : `DIRECCION VISUAL: ${estiloPrompt}`}
ANGULO COMUNICACIONAL: ${anguloVisual[angulo]}
${nc?.conceptoVisual ? 'COLORES: Usar la paleta del concepto visual unificado' : styleCount > 0 ? 'COLORES: Usar la paleta de la referencia de estilo' : `COLORES DE MARCA: ${colores}`}
TONO: ${tono}
${userPromptSection}${narrativeBlock}${characterRefPrompt}${styleRefPrompt}${instruccionesCustom}
${textoSection}

${slideInfo ? `SLIDE ${slideInfo.slideNumber} de ${slideInfo.totalSlides} (carrusel — mantener consistencia visual ABSOLUTA entre slides)` : `FORMATO: ${fmtInfo.label} — ${fmtInfo.descripcion}`}

REQUISITOS CRITICOS:
- Formato: ${fmtInfo.width}x${fmtInfo.height}px (aspect ratio ${fmt === 'yt_thumbnail' ? '16:9' : fmt})
- La composicion debe ser PROFESIONAL, nivel agencia de publicidad
- NO parecer imagen de stock generica — debe sentirse unica y con personalidad
- NO incluir logos de Meta/Instagram
- Si incluye personas: expresiones REALES, no poses artificiales
- Iluminacion cinematografica, no plana
- Jerarquia visual clara: el ojo va primero al elemento mas importante`;
}
