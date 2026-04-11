/**
 * campanasPrompts.ts — Prompts de IA para generacion de guias, copy e imagenes
 */
import type { ProfileV2 } from './supabase';
import type { CampanaFormState, AnguloCreativo, TipoCreativo, ObjetivoCampana } from './campanasTypes';

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

  const formatoOutput = tipo === 'carrusel'
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

// ─── Prompt para generacion de imagenes ──────────────────────────────────────

export function buildImagePrompt(
  copy: { texto_principal: string; titulo: string },
  angulo: AnguloCreativo,
  perfil: Partial<ProfileV2>,
  slideInfo?: { slideNumber: number; totalSlides: number; slideTexto?: string },
): string {
  const nicho = perfil.nicho ?? perfil.adn_nicho ?? perfil.especialidad ?? 'salud y bienestar';
  const colores = perfil.identidad_colores ?? 'tonos profesionales, dorado y oscuro';
  const tono = perfil.identidad_tono ?? 'profesional y cercano';

  const textoParaImagen = slideInfo?.slideTexto
    ? slideInfo.slideTexto
    : copy.titulo;

  const anguloVisual: Record<AnguloCreativo, string> = {
    contraintuitivo: 'Visual impactante, colores contrastantes, elemento de sorpresa visual. Diseno bold y disruptivo.',
    directo: 'Limpio, profesional, sin distracciones. El mensaje es protagonista. Fondo simple.',
    emocional: 'Imagenes que evocan emocion, luz calida, tonos humanos. Rostros o escenas empaticas.',
    curiosidad: 'Visual intrigante, parcialmente oculto, genera pregunta. Diseno misterioso pero profesional.',
    autoridad: 'Elegante, premium, con elementos de credibilidad. Tonos oscuros con acentos dorados.',
    dolor: 'Visual que refleja la frustracion o el problema. Tonos frios o grises con contraste.',
    deseo: 'Luminoso, aspiracional, resultado ideal. Colores vibrantes, sensacion de logro.',
  };

  return `Genera una imagen publicitaria profesional para Meta Ads (Instagram/Facebook).

NICHO: ${nicho}
ESTILO VISUAL: ${anguloVisual[angulo]}
COLORES DE MARCA: ${colores}
TONO: ${tono}

TEXTO A INCLUIR EN LA IMAGEN: "${textoParaImagen}"

${slideInfo ? `SLIDE ${slideInfo.slideNumber} de ${slideInfo.totalSlides} (carrusel — mantener consistencia visual entre slides)` : 'FORMATO: Imagen unica para feed (1:1)'}

REQUISITOS:
- Formato cuadrado 1080x1080px
- El texto debe ser LEGIBLE y estar bien posicionado
- Tipografia limpia, moderna, sans-serif
- Estetica profesional del sector salud/bienestar
- NO incluir logos de Meta/Instagram
- Fondo que no compita con el texto
- Contraste alto entre texto y fondo
- Si incluye personas, que reflejen el nicho y la audiencia objetivo`;
}
