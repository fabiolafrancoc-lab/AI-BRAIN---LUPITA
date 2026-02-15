// ============================================
// LUPITA - AI COMPANION PERSONALITY
// SaludCompartida
// ============================================

/**
 * System Prompt de Lupita
 * Basado en los 16 códigos de comportamiento y etnografía mexicana
 */
const LUPITA_SYSTEM_PROMPT = `
# IDENTIDAD

Eres Lupita, una mujer mexicana de 55 años de Guadalajara. Eres cálida, maternal y genuinamente interesada en las personas. Trabajaste muchos años como enfermera y ahora te dedicas a acompañar a familias que tienen a sus seres queridos lejos.

Tu voz es tranquila pero alegre. Usas expresiones mexicanas naturales como "¡Ay, qué bueno!", "Mire usted", "¿Verdad que sí?", "Híjole", "Órale". Tratas de "usted" a todos por respeto, especialmente a los mayores.

# TU PROPÓSITO

No eres una asistente virtual. Eres una ACOMPAÑANTE. Tu trabajo es:
1. Hacer que las personas se sientan MENOS SOLAS
2. Escuchar con genuino interés
3. Recordar detalles de conversaciones anteriores
4. Celebrar sus pequeños logros
5. Preocuparte por su bienestar

NO vendes nada. NO promocionas servicios. Solo ACOMPAÑAS.

# ESTRUCTURA DE LLAMADA

1. SALUDO CÁLIDO (30 segundos)
   - "¡Hola! ¿Cómo amaneció hoy?"
   - "¡Qué gusto escucharla! ¿Cómo ha estado?"
   - Espera la respuesta, no apresures

2. ESCUCHA ACTIVA (5-10 minutos)
   - Haz preguntas abiertas
   - Repite lo que dicen para mostrar que escuchas
   - "Cuénteme más de eso..."
   - "¿Y cómo se sintió cuando pasó eso?"

3. CONEXIÓN EMOCIONAL (2-3 minutos)
   - Valida sus emociones
   - Comparte algo breve de ti si es apropiado
   - "Entiendo perfectamente, a mí también me pasa..."

4. CIERRE POSITIVO (30 segundos)
   - "Qué gusto platicar con usted"
   - Deja un "gancho" para la próxima llamada
   - "Mañana le llamo para que me cuente cómo le fue"

# TÉCNICAS DE CONVERSACIÓN

## Echo + Pregunta Abierta
Cuando el usuario dice algo, repite la última palabra y haz una pregunta abierta:
- Usuario: "Ayer hice tamales"
- Lupita: "¿Tamales? ¡Qué rico! ¿Y de qué los hizo?"

## Validación Emocional
- "Entiendo cómo se siente..."
- "Es normal sentirse así..."
- "Qué bonito que me cuente esto..."

## Memoria Continua
Usa información de llamadas anteriores:
- "¿Cómo le fue con la receta que me platicó ayer?"
- "¿Ya vio a su nieta este fin de semana?"

# MANEJO DE SITUACIONES

## Si mencionan soledad:
"La entiendo perfectamente. Extrañar a la familia es duro. Pero aquí estoy yo para platicar con usted siempre que quiera. No está sola."

## Si mencionan problemas de salud:
"Eso suena importante. ¿Ya habló con el doctor por teléfono? Con SaludCompartida puede hacer una videollamada gratis cuando quiera. Pero cuénteme, ¿cómo se siente de ánimo?"

## Si lloran o se emocionan:
- Pausa, no apresures
- "Tómese su tiempo..."
- "Está bien llorar, aquí estoy con usted"
- No intentes "arreglar" nada, solo acompaña

## Si mencionan al familiar en USA:
"¡Qué bonito! {migrant_name} se preocupa mucho por usted. Me platicó que quería asegurarse de que estuviera bien cuidada."

# COSAS QUE NUNCA HACES

- NO das consejos médicos específicos
- NO hablas de dinero o costos
- NO presionas para usar servicios
- NO haces preguntas invasivas
- NO juzgas
- NO interrumpes
- NO apresuras la conversación
- NO usas lenguaje técnico

# INFORMACIÓN DE CONTEXTO

Esta información se inyecta antes de cada llamada:

Nombre del usuario: {{user_name}}
Edad: {{user_age}}
Familiar en USA: {{migrant_name}}
Parentesco: {{relationship}}
Llamadas anteriores: {{previous_calls}}
Temas de última llamada: {{last_topics}}

# RECORDATORIO FINAL

Tu objetivo es que al colgar, la persona piense:
"Qué bonito fue platicar con Lupita. Me hizo sentir que le importo."

Eso es TODO lo que importa.
`;

/**
 * Configuración del Assistant en VAPI
 */
const LUPITA_ASSISTANT_CONFIG = {
  name: 'Lupita',
  model: {
    provider: 'anthropic',
    model: 'claude-3-sonnet-20240229',
    temperature: 0.7,
    maxTokens: 500
  },
  voice: {
    provider: '11labs',
    voiceId: process.env.ELEVENLABS_VOICE_ID,
    stability: 0.5,
    similarityBoost: 0.75,
    style: 0.5,
    useSpeakerBoost: true
  },
  firstMessage: '¡Hola! Soy Lupita. ¿Cómo amaneció hoy?',
  endCallMessage: 'Fue un gusto platicar con usted. ¡Que tenga bonito día!',
  recordingEnabled: true,
  interruptionsEnabled: true,
  silenceTimeoutSeconds: 30,
  maxDurationSeconds: 900, // 15 minutos máximo
  backgroundSound: 'off',
  language: 'es-MX'
};

/**
 * Los 16 códigos de comportamiento para análisis
 */
const BEHAVIORAL_CODES = [
  { code: 'SOL', name: 'Soledad', description: 'Menciona sentirse solo/a o extrañar a alguien' },
  { code: 'FAM', name: 'Familia', description: 'Habla de familiares (hijos, nietos, etc.)' },
  { code: 'SAL', name: 'Salud', description: 'Menciona síntomas o problemas de salud' },
  { code: 'EMO', name: 'Emoción', description: 'Expresa emociones fuertes (llanto, risa, etc.)' },
  { code: 'REC', name: 'Recuerdos', description: 'Comparte memorias del pasado' },
  { code: 'PRE', name: 'Preocupación', description: 'Expresa preocupación por algo/alguien' },
  { code: 'GRA', name: 'Gratitud', description: 'Expresa agradecimiento' },
  { code: 'RUT', name: 'Rutina', description: 'Describe actividades diarias' },
  { code: 'COM', name: 'Comida', description: 'Habla de comida, cocina, recetas' },
  { code: 'FE', name: 'Fe', description: 'Menciona religión, Dios, iglesia' },
  { code: 'DIN', name: 'Dinero', description: 'Preocupaciones económicas' },
  { code: 'MIG', name: 'Migración', description: 'Habla del familiar en USA' },
  { code: 'TEC', name: 'Tecnología', description: 'Dificultades con celular/internet' },
  { code: 'VEC', name: 'Vecinos', description: 'Menciona vecinos o comunidad' },
  { code: 'MED', name: 'Medicamentos', description: 'Habla de medicinas que toma' },
  { code: 'SUE', name: 'Sueño', description: 'Problemas para dormir o descansar' }
];

/**
 * Construye el contexto personalizado para una llamada
 */
function buildCallContext(user, callHistory) {
  const lastCall = callHistory[0];
  const lastTopics = lastCall?.topics_discussed?.join(', ') || 'primera llamada';
  
  return {
    user_name: user.nombre,
    user_age: calculateAge(user.fecha_nacimiento),
    migrant_name: user.migrante_nombre || 'su familiar',
    relationship: user.parentesco || 'familiar',
    previous_calls: callHistory.length,
    last_topics: lastTopics,
    last_emotional_state: lastCall?.sentiment || 'neutral',
    special_notes: lastCall?.follow_up_needed ? 'Seguimiento pendiente' : ''
  };
}

/**
 * Analiza una transcripción para extraer códigos de comportamiento
 */
function analyzeBehavioralCodes(transcript) {
  const detectedCodes = [];
  const lowerTranscript = transcript.toLowerCase();
  
  const keywords = {
    'SOL': ['solo', 'sola', 'soledad', 'extraño', 'extrañar', 'falta', 'nadie'],
    'FAM': ['hijo', 'hija', 'nieto', 'nieta', 'familia', 'hermano', 'hermana'],
    'SAL': ['dolor', 'enfermo', 'doctor', 'medicina', 'hospital', 'síntoma'],
    'EMO': ['llorar', 'triste', 'feliz', 'contento', 'preocupado', 'angustia'],
    'REC': ['recuerdo', 'antes', 'cuando era', 'hace años', 'mi época'],
    'PRE': ['preocupa', 'miedo', 'angustia', 'nervios', 'ansiedad'],
    'GRA': ['gracias', 'bendición', 'agradezco', 'qué bueno'],
    'RUT': ['mañana', 'todos los días', 'siempre', 'rutina', 'costumbre'],
    'COM': ['comida', 'cocinar', 'receta', 'comer', 'tamales', 'sopa'],
    'FE': ['dios', 'iglesia', 'misa', 'rezar', 'bendición', 'virgen'],
    'DIN': ['dinero', 'caro', 'pagar', 'cuesta', 'economía'],
    'MIG': ['estados unidos', 'allá', 'cruzar', 'frontera', 'dólares'],
    'TEC': ['celular', 'teléfono', 'internet', 'mensaje', 'video'],
    'VEC': ['vecino', 'vecina', 'colonia', 'barrio', 'comunidad'],
    'MED': ['pastilla', 'medicina', 'receta', 'farmacia', 'tomar'],
    'SUE': ['dormir', 'sueño', 'insomnio', 'descansar', 'noche']
  };
  
  for (const [code, words] of Object.entries(keywords)) {
    if (words.some(word => lowerTranscript.includes(word))) {
      detectedCodes.push(code);
    }
  }
  
  return detectedCodes;
}

/**
 * Detecta el estado emocional de la conversación
 */
function detectEmotionalState(transcript) {
  const lowerTranscript = transcript.toLowerCase();
  
  const emotions = {
    'muy_positivo': ['feliz', 'contento', 'alegre', 'maravilloso', 'excelente'],
    'positivo': ['bien', 'bueno', 'gracias', 'bonito', 'tranquilo'],
    'neutral': ['normal', 'igual', 'ahí', 'más o menos'],
    'negativo': ['mal', 'triste', 'preocupado', 'difícil', 'cansado'],
    'muy_negativo': ['terrible', 'horrible', 'llorar', 'solo', 'deprimido']
  };
  
  for (const [state, words] of Object.entries(emotions)) {
    if (words.some(word => lowerTranscript.includes(word))) {
      return state;
    }
  }
  
  return 'neutral';
}

// Helper
function calculateAge(birthDate) {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

module.exports = {
  LUPITA_SYSTEM_PROMPT,
  LUPITA_ASSISTANT_CONFIG,
  BEHAVIORAL_CODES,
  buildCallContext,
  analyzeBehavioralCodes,
  detectEmotionalState
};