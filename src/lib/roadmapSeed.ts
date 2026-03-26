export type TareaCategoria = 'Oferta' | 'Sistema' | 'Contenido' | 'Mentalidad';

export interface RoadmapTarea {
  id: string;
  semana: number;
  titulo: string;
  tiempo_estimado: string;
  categoria: TareaCategoria;
  status: 'pendiente' | 'activa' | 'completada';
}

export interface RoadmapSemana {
  numero: number;
  titulo: string;
  tareas: RoadmapTarea[];
}

export interface RoadmapPilar {
  id: number;
  titulo: string;
  emoji: string;
  expanded: boolean;
  semanas: RoadmapSemana[];
}

export const SEED_ROADMAP: RoadmapPilar[] = [
  {
    id: 1,
    titulo: 'IDENTIDAD Y OFERTA',
    emoji: '💎',
    expanded: true,
    semanas: [
      {
        numero: 1,
        titulo: 'Sesión 1-1: Base',
        tareas: [
          { id: 'p1s1t1', semana: 1, categoria: 'Oferta', tiempo_estimado: '15 min', status: 'activa', titulo: 'Definir propósito en 1 oración (el "para qué" que nadie puede copiar)' },
          { id: 'p1s1t2', semana: 1, categoria: 'Oferta', tiempo_estimado: '30 min', status: 'pendiente', titulo: 'Escribir tu historia en formato A→B→C (Infierno, Brecha, Cielo)' },
          { id: 'p1s1t3', semana: 1, categoria: 'Mentalidad', tiempo_estimado: '15 min', status: 'pendiente', titulo: 'Identificar tu legado a 3 años' },
          { id: 'p1s1t4', semana: 1, categoria: 'Oferta', tiempo_estimado: '20 min', status: 'pendiente', titulo: 'Completar Biblia de Negocio — Capítulo 1: Quién soy' },
          { id: 'p1s1t5', semana: 1, categoria: 'Oferta', tiempo_estimado: '20 min', status: 'pendiente', titulo: 'Definir tu nicho específico (no "psicóloga" — "psicóloga de vínculos para mujeres ejecutivas")' }
        ]
      },
      {
        numero: 2,
        titulo: 'Sesión 1-1: Oferta',
        tareas: [
          { id: 'p1s2t1', semana: 2, categoria: 'Oferta', tiempo_estimado: '15 min', status: 'pendiente', titulo: 'Nombrar tu protocolo/método propio' },
          { id: 'p1s2t2', semana: 2, categoria: 'Oferta', tiempo_estimado: '15 min', status: 'pendiente', titulo: 'Definir la promesa de transformación en 1 línea' },
          { id: 'p1s2t3', semana: 2, categoria: 'Oferta', tiempo_estimado: '5 min', status: 'pendiente', titulo: 'Establecer la duración exacta del protocolo (ej: 12 semanas)' },
          { id: 'p1s2t4', semana: 2, categoria: 'Oferta', tiempo_estimado: '20 min', status: 'pendiente', titulo: 'Listar los 5 resultados verificables del proceso' },
          { id: 'p1s2t5', semana: 2, categoria: 'Oferta', tiempo_estimado: '10 min', status: 'pendiente', titulo: 'Definir precio del protocolo individual (en USD)' },
          { id: 'p1s2t6', semana: 2, categoria: 'Mentalidad', tiempo_estimado: '10 min', status: 'pendiente', titulo: 'Calcular tu hora real actual (usar calculadora)' },
          { id: 'p1s2t7', semana: 2, categoria: 'Mentalidad', tiempo_estimado: '10 min', status: 'pendiente', titulo: 'Calcular brecha entre hora real y precio del protocolo' },
          { id: 'p1s2t8', semana: 2, categoria: 'Oferta', tiempo_estimado: '30 min', status: 'pendiente', titulo: 'Escribir objeciones top 3 y respuestas' },
          { id: 'p1s2t9', semana: 2, categoria: 'Oferta', tiempo_estimado: '20 min', status: 'pendiente', titulo: 'Validar la oferta con 1 cliente actual: "¿Comprarías esto?"' },
          { id: 'p1s2t10', semana: 2, categoria: 'Oferta', tiempo_estimado: '20 min', status: 'pendiente', titulo: 'Biblia de Negocio — Capítulo 2: Qué ofrezco' }
        ]
      }
    ]
  },
  {
    id: 2,
    titulo: 'SISTEMA Y AUTOMATIZACIÓN',
    emoji: '⚙️',
    expanded: false,
    semanas: [
      {
        numero: 3,
        titulo: 'Comunicación base',
        tareas: [
          { id: 'p2s3t1', semana: 3, categoria: 'Sistema', tiempo_estimado: '20 min', status: 'pendiente', titulo: 'Configurar WhatsApp Business (no el personal)' },
          { id: 'p2s3t2', semana: 3, categoria: 'Sistema', tiempo_estimado: '15 min', status: 'pendiente', titulo: 'Escribir mensaje de bienvenida automático' },
          { id: 'p2s3t3', semana: 3, categoria: 'Sistema', tiempo_estimado: '30 min', status: 'pendiente', titulo: 'Escribir 5 respuestas rápidas para preguntas frecuentes' },
          { id: 'p2s3t4', semana: 3, categoria: 'Sistema', tiempo_estimado: '5 min', status: 'pendiente', titulo: 'Configurar mensaje de ausencia fuera de horario' },
          { id: 'p2s3t5', semana: 3, categoria: 'Sistema', tiempo_estimado: '10 min', status: 'pendiente', titulo: 'Probar el flujo completo desde un número externo' }
        ]
      },
      {
        numero: 4,
        titulo: 'Agenda y CRM',
        tareas: [
          { id: 'p2s4t1', semana: 4, categoria: 'Sistema', tiempo_estimado: '15 min', status: 'pendiente', titulo: 'Elegir herramienta de agenda online (Calendly / GHL)' },
          { id: 'p2s4t2', semana: 4, categoria: 'Sistema', tiempo_estimado: '20 min', status: 'pendiente', titulo: 'Configurar disponibilidad y tipos de turno' },
          { id: 'p2s4t3', semana: 4, categoria: 'Sistema', tiempo_estimado: '10 min', status: 'pendiente', titulo: 'Activar recordatorio automático 24h antes' },
          { id: 'p2s4t4', semana: 4, categoria: 'Sistema', tiempo_estimado: '10 min', status: 'pendiente', titulo: 'Activar confirmación automática al agendar' },
          { id: 'p2s4t5', semana: 4, categoria: 'Sistema', tiempo_estimado: '15 min', status: 'pendiente', titulo: 'Configurar seguimiento post-consulta (mensaje D+1)' },
          { id: 'p2s4t6', semana: 4, categoria: 'Sistema', tiempo_estimado: '10 min', status: 'pendiente', titulo: 'Conectar agenda con Google Calendar' },
          { id: 'p2s4t7', semana: 4, categoria: 'Sistema', tiempo_estimado: '15 min', status: 'pendiente', titulo: 'Testear flujo completo: reserva → confirmación → recordatorio' },
          { id: 'p2s5t1', semana: 5, categoria: 'Sistema', tiempo_estimado: '45 min', status: 'pendiente', titulo: 'Configurar GHL / CRM básico' },
          { id: 'p2s5t2', semana: 5, categoria: 'Sistema', tiempo_estimado: '15 min', status: 'pendiente', titulo: 'Crear pipeline: Lead → Consulta → Protocolo activo → Completado' },
          { id: 'p2s5t3', semana: 5, categoria: 'Sistema', tiempo_estimado: '20 min', status: 'pendiente', titulo: 'Importar contactos actuales al CRM' }
        ]
      },
      {
        numero: 6,
        titulo: 'ManyChat + Instagram',
        tareas: [
          { id: 'p2s6t1', semana: 6, categoria: 'Sistema', tiempo_estimado: '15 min', status: 'pendiente', titulo: 'Crear cuenta ManyChat conectada a Instagram' },
          { id: 'p2s6t2', semana: 6, categoria: 'Sistema', tiempo_estimado: '10 min', status: 'pendiente', titulo: 'Definir 3 palabras clave disparadoras (ej: "INFO", "PROTOCOLO")' },
          { id: 'p2s6t3', semana: 6, categoria: 'Sistema', tiempo_estimado: '30 min', status: 'pendiente', titulo: 'Escribir respuesta automática para cada keyword' },
          { id: 'p2s6t4', semana: 6, categoria: 'Sistema', tiempo_estimado: '30 min', status: 'pendiente', titulo: 'Configurar secuencia de seguimiento (D+1, D+3, D+7)' },
          { id: 'p2s6t5', semana: 6, categoria: 'Sistema', tiempo_estimado: '15 min', status: 'pendiente', titulo: 'Probar flujo completo desde cuenta externa' },
          { id: 'p2s6t6', semana: 6, categoria: 'Contenido', tiempo_estimado: '15 min', status: 'pendiente', titulo: 'Publicar primer contenido con keyword visible en el caption' }
        ]
      },
      {
        numero: 7,
        titulo: 'Cobros internacionales',
        tareas: [
          { id: 'p2s7t1', semana: 7, categoria: 'Sistema', tiempo_estimado: '45 min', status: 'pendiente', titulo: 'Crear cuenta Stripe (o TiendaNube Pagos / Hotmart)' },
          { id: 'p2s7t2', semana: 7, categoria: 'Sistema', tiempo_estimado: '10 min', status: 'pendiente', titulo: 'Configurar cobro en USD' },
          { id: 'p2s7t3', semana: 7, categoria: 'Oferta', tiempo_estimado: '15 min', status: 'pendiente', titulo: 'Crear link de pago para el protocolo' },
          { id: 'p2s7t4', semana: 7, categoria: 'Sistema', tiempo_estimado: '15 min', status: 'pendiente', titulo: 'Testear pago desde tarjeta extranjera' },
          { id: 'p2s7t5', semana: 7, categoria: 'Sistema', tiempo_estimado: '15 min', status: 'pendiente', titulo: 'Integrar link de pago en el flujo post-llamada' }
        ]
      }
    ]
  },
  {
    id: 3,
    titulo: 'CONTENIDO Y CAPTACIÓN',
    emoji: '📱',
    expanded: false,
    semanas: [
      {
        numero: 3,
        titulo: 'Contenido base',
        tareas: [
          { id: 'p3s3t1', semana: 3, categoria: 'Contenido', tiempo_estimado: '20 min', status: 'pendiente', titulo: 'Definir los 3 temas pilares de tu contenido (de la Matriz de Transformación)' },
          { id: 'p3s3t2', semana: 3, categoria: 'Contenido', tiempo_estimado: '15 min', status: 'pendiente', titulo: 'Escribir tu bio de Instagram optimizada (con quién ayudás y qué resultado)' },
          { id: 'p3s3t3', semana: 3, categoria: 'Contenido', tiempo_estimado: '60 min', status: 'pendiente', titulo: 'Crear lead magnet: práctica, guía o checklist descargable' },
          { id: 'p3s3t4', semana: 3, categoria: 'Contenido', tiempo_estimado: '45 min', status: 'pendiente', titulo: 'Grabar Reel de presentación ("quién soy y a quién ayudo")' },
          { id: 'p3s3t5', semana: 3, categoria: 'Contenido', tiempo_estimado: '15 min', status: 'pendiente', titulo: 'Publicar primer Reel con llamada a la acción clara' }
        ]
      },
      {
        numero: 4,
        titulo: 'VSL / Video de ventas',
        tareas: [
          { id: 'p3s4t1', semana: 4, categoria: 'Contenido', tiempo_estimado: '60 min', status: 'pendiente', titulo: 'Escribir guión del VSL (5 partes: hook, dolor, villano, método, CTA)' },
          { id: 'p3s4t2', semana: 4, categoria: 'Contenido', tiempo_estimado: '45 min', status: 'pendiente', titulo: 'Grabar el VSL (puede ser simple, fondo neutro, buena luz)' },
          { id: 'p3s4t3', semana: 4, categoria: 'Contenido', tiempo_estimado: '60 min', status: 'pendiente', titulo: 'Editar el VSL (máximo 15 minutos)' },
          { id: 'p3s5t1', semana: 5, categoria: 'Sistema', tiempo_estimado: '60 min', status: 'pendiente', titulo: 'Crear landing page con el VSL arriba' },
          { id: 'p3s5t2', semana: 5, categoria: 'Sistema', tiempo_estimado: '20 min', status: 'pendiente', titulo: 'Añadir formulario de pre-calificación (3 preguntas)' },
          { id: 'p3s5t3', semana: 5, categoria: 'Sistema', tiempo_estimado: '15 min', status: 'pendiente', titulo: 'Conectar formulario a Calendly / agenda' },
          { id: 'p3s5t4', semana: 5, categoria: 'Sistema', tiempo_estimado: '15 min', status: 'pendiente', titulo: 'Testear flujo completo de landing → formulario → agenda' }
        ]
      },
      {
        numero: 6,
        titulo: 'Anuncios',
        tareas: [
          { id: 'p3s6t1', semana: 6, categoria: 'Sistema', tiempo_estimado: '30 min', status: 'pendiente', titulo: 'Crear cuenta de Meta Ads Business Manager' },
          { id: 'p3s6t2', semana: 6, categoria: 'Sistema', tiempo_estimado: '20 min', status: 'pendiente', titulo: 'Instalar Pixel de Meta en la landing' },
          { id: 'p3s7t1', semana: 7, categoria: 'Contenido', tiempo_estimado: '30 min', status: 'pendiente', titulo: 'Escribir guión del Anuncio 1 (ángulo: el dolor del estancamiento)' },
          { id: 'p3s7t2', semana: 7, categoria: 'Contenido', tiempo_estimado: '30 min', status: 'pendiente', titulo: 'Escribir guión del Anuncio 2 (ángulo: el contraste antes/después)' },
          { id: 'p3s7t3', semana: 7, categoria: 'Contenido', tiempo_estimado: '30 min', status: 'pendiente', titulo: 'Escribir guión del Anuncio 3 (ángulo: la autoridad del profesional)' },
          { id: 'p3s7t4', semana: 7, categoria: 'Contenido', tiempo_estimado: '60 min', status: 'pendiente', titulo: 'Grabar los 3 anuncios' },
          { id: 'p3s8t1', semana: 8, categoria: 'Sistema', tiempo_estimado: '45 min', status: 'pendiente', titulo: 'Configurar campaña en Meta Ads (objetivo: leads)' },
          { id: 'p3s8t2', semana: 8, categoria: 'Sistema', tiempo_estimado: '15 min', status: 'pendiente', titulo: 'Definir audiencia: intereses, edad, geo (LATAM o local)' },
          { id: 'p3s8t3', semana: 8, categoria: 'Sistema', tiempo_estimado: '10 min', status: 'pendiente', titulo: 'Lanzar campaña con presupuesto mínimo ($10-15 USD/día)' },
          { id: 'p3s8t4', semana: 8, categoria: 'Mentalidad', tiempo_estimado: '10 min', status: 'pendiente', titulo: 'Monitorear CPL (costo por lead) los primeros 3 días' },
          { id: 'p3s8t5', semana: 8, categoria: 'Sistema', tiempo_estimado: '15 min', status: 'pendiente', titulo: 'Ajustar el anuncio con mejor rendimiento (pausar los otros 2)' }
        ]
      },
      {
        numero: 9,
        titulo: 'YouTube (opcional pero poderoso)',
        tareas: [
          { id: 'p3s9t1', semana: 9, categoria: 'Contenido', tiempo_estimado: '30 min', status: 'pendiente', titulo: 'Crear canal de YouTube con branding consistente' },
          { id: 'p3s9t2', semana: 9, categoria: 'Contenido', tiempo_estimado: '60 min', status: 'pendiente', titulo: 'Grabar Video 1 (el pilar de dolor — 20-30 min)' },
          { id: 'p3s9t3', semana: 9, categoria: 'Contenido', tiempo_estimado: '20 min', status: 'pendiente', titulo: 'Publicar Video 1 con descripción y link al VSL' },
          { id: 'p3s10t1', semana: 10, categoria: 'Contenido', tiempo_estimado: '60 min', status: 'pendiente', titulo: 'Grabar y publicar Video 2 (pilar hormonal / técnico)' },
          { id: 'p3s11t1', semana: 11, categoria: 'Contenido', tiempo_estimado: '60 min', status: 'pendiente', titulo: 'Grabar y publicar Video 3 (el método paso a paso)' },
          { id: 'p3s12t1', semana: 12, categoria: 'Contenido', tiempo_estimado: '60 min', status: 'pendiente', titulo: 'Crear 3 Reels de cada video (9 Reels totales)' },
          { id: 'p3s12t2', semana: 12, categoria: 'Contenido', tiempo_estimado: '15 min', status: 'pendiente', titulo: 'Publicar con frecuencia mínima: 1 reel por semana' }
        ]
      }
    ]
  },
  {
    id: 4,
    titulo: 'MENTALIDAD Y PROCESO PROPIO',
    emoji: '🌿',
    expanded: false,
    semanas: [
      {
        numero: 1,
        titulo: 'Diagnóstico interno',
        tareas: [
          { id: 'p4s1t1', semana: 1, categoria: 'Mentalidad', tiempo_estimado: '15 min', status: 'pendiente', titulo: 'Calcular hora real neta (cuánto ganás de verdad por hora)' },
          { id: 'p4s1t2', semana: 1, categoria: 'Mentalidad', tiempo_estimado: '10 min', status: 'pendiente', titulo: 'Identificar el "techo" actual de ingresos con el modelo actual' },
          { id: 'p4s1t3', semana: 1, categoria: 'Mentalidad', tiempo_estimado: '15 min', status: 'pendiente', titulo: 'Nombrar la creencia limitante central sobre el dinero y la vocación' },
          { id: 'p4s1t4', semana: 1, categoria: 'Mentalidad', tiempo_estimado: '15 min', status: 'pendiente', titulo: 'Escribir la diferencia entre "cobrar por tiempo" y "cobrar por resultado"' },
          { id: 'p4s2t1', semana: 2, categoria: 'Mentalidad', tiempo_estimado: '30 min', status: 'pendiente', titulo: 'Leer Capítulo 6 del libro (La Trampa Elegante)' },
          { id: 'p4s2t2', semana: 2, categoria: 'Mentalidad', tiempo_estimado: '30 min', status: 'pendiente', titulo: 'Leer Capítulo 7 (Lo que se automatiza y lo que no)' },
          { id: 'p4s3t1', semana: 3, categoria: 'Mentalidad', tiempo_estimado: '30 min', status: 'pendiente', titulo: 'Leer Capítulo 8 (El precio del resultado)' },
          { id: 'p4s3t2', semana: 3, categoria: 'Mentalidad', tiempo_estimado: '10 min', status: 'pendiente', titulo: 'Responder: ¿cuándo fue la última vez que llegaste bien al final del día?' },
          { id: 'p4s3t3', semana: 3, categoria: 'Mentalidad', tiempo_estimado: '15 min', status: 'pendiente', titulo: 'Definir tu versión de "llegar bien" en palabras concretas' },
          { id: 'p4s4t1', semana: 4, categoria: 'Mentalidad', tiempo_estimado: '10 min', status: 'pendiente', titulo: 'Identificar 1 proceso que hoy hacés vos y que podría automatizarse' },
          { id: 'p4s4t2', semana: 4, categoria: 'Mentalidad', tiempo_estimado: '15 min', status: 'pendiente', titulo: 'Escribir en el Diario la respuesta a: "¿qué parte de mi proceso personal tengo pendiente?"' }
        ]
      },
      {
        numero: 5,
        titulo: 'Hitos de mentalidad',
        tareas: [
          { id: 'p4s5t1', semana: 5, categoria: 'Oferta', tiempo_estimado: '45 min', status: 'pendiente', titulo: 'Tener la primera consulta de venta del protocolo (aunque no cierre)' },
          { id: 'p4s6t1', semana: 6, categoria: 'Oferta', tiempo_estimado: '0 min', status: 'pendiente', titulo: 'Cerrar el primer protocolo al nuevo precio' },
          { id: 'p4s7t1', semana: 7, categoria: 'Oferta', tiempo_estimado: '0 min', status: 'pendiente', titulo: 'Recibir el primer pago en USD de alguien fuera de tu ciudad' },
          { id: 'p4s8t1', semana: 8, categoria: 'Mentalidad', tiempo_estimado: '0 min', status: 'pendiente', titulo: 'Decirle "no" a un paciente que no encaja con el protocolo nuevo' }
        ]
      }
    ]
  }
];
