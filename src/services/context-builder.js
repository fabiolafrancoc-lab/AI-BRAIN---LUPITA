// ============================================
// CONTEXT BUILDER - LUPITA AI
// Construye contexto personalizado para cada llamada
// ============================================

const { getUserContext, getCallHistory } = require('../config/supabase');
const { searchSimilarConversations } = require('../config/weaviate');
const { BEHAVIORAL_CODES } = require('../assistants/lupita');

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

/**
 * Construye contexto completo para una llamada
 */
async function buildFullContext(userId) {
  console.log(`Building context for user ${userId}`);
  
  try {
    // 1. Datos básicos del usuario
    const user = await getUserContext(userId);
    
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }
    
    // 2. Historial de llamadas
    const callHistory = await getCallHistory(userId);
    
    // 3. Análisis del historial
    const historyAnalysis = analyzeCallHistory(callHistory);
    
    // 4. Conversaciones similares (para patrones)
    const similarPatterns = await getSimilarPatterns(historyAnalysis.dominantTopics);
    
    // 5. Construir contexto final
    const context = {
      // Datos personales
      user_id: user.id,
      user_name: user.nombre,
      user_full_name: `${user.nombre} ${user.apellido_paterno || ''}`.trim(),
      user_age: calculateAge(user.fecha_nacimiento),
      user_gender: user.sexo === 'F' ? 'femenino' : 'masculino',
      user_phone: user.celular,
      
      // Relación con migrante
      migrant_name: user.migrante_nombre || 'su familiar',
      relationship: user.parentesco || 'familiar',
      
      // Companion asignado
      companion: user.companion_assigned || 'Lupita',
      
      // Historial
      total_calls: callHistory.length,
      is_first_call: callHistory.length === 0,
      last_call_date: callHistory[0]?.created_at || null,
      days_since_last_call: calculateDaysSince(callHistory[0]?.created_at),
      
      // Análisis
      dominant_topics: historyAnalysis.dominantTopics,
      emotional_trend: historyAnalysis.emotionalTrend,
      frequent_codes: historyAnalysis.frequentCodes,
      pending_follow_ups: historyAnalysis.pendingFollowUps,
      
      // Sugerencias para Lupita
      conversation_starters: generateConversationStarters(user, historyAnalysis),
      topics_to_revisit: historyAnalysis.topicsToRevisit,
      topics_to_avoid: historyAnalysis.topicsToAvoid,
      
      // Patrones globales (anonimizados)
      similar_patterns: similarPatterns,
      
      // Metadata
      context_built_at: new Date().toISOString()
    };
    
    console.log(`Context built for user ${userId}: ${callHistory.length} previous calls`);
    
    return context;
    
  } catch (error) {
    console.error(`Error building context for user ${userId}:`, error.message);
    throw error;
  }
}

/**
 * Analiza el historial de llamadas
 */
function analyzeCallHistory(callHistory) {
  if (!callHistory || callHistory.length === 0) {
    return {
      dominantTopics: [],
      emotionalTrend: 'unknown',
      frequentCodes: [],
      pendingFollowUps: [],
      topicsToRevisit: [],
      topicsToAvoid: []
    };
  }
  
  // Contar temas
  const topicCounts = {};
  const codeCounts = {};
  const emotions = [];
  const pendingFollowUps = [];
  
  for (const call of callHistory) {
    // Temas
    if (call.topics_discussed) {
      for (const topic of call.topics_discussed) {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      }
    }
    
    // Códigos de comportamiento
    if (call.behavioral_codes) {
      for (const code of call.behavioral_codes) {
        codeCounts[code] = (codeCounts[code] || 0) + 1;
      }
    }
    
    // Emociones
    if (call.sentiment) {
      emotions.push(call.sentiment);
    }
    
    // Follow-ups pendientes
    if (call.follow_up_needed && !call.follow_up_completed) {
      pendingFollowUps.push({
        callId: call.id,
        date: call.created_at,
        reason: call.follow_up_reason
      });
    }
  }
  
  // Ordenar por frecuencia
  const dominantTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic);
  
  const frequentCodes = Object.entries(codeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([code]) => code);
  
  // Tendencia emocional
  const emotionalTrend = calculateEmotionalTrend(emotions);
  
  // Temas para revisar (mencionados en última llamada)
  const lastCall = callHistory[0];
  const topicsToRevisit = lastCall?.topics_discussed?.slice(0, 3) || [];
  
  // Temas a evitar (si generaron reacción negativa)
  const topicsToAvoid = identifyNegativeTopics(callHistory);
  
  return {
    dominantTopics,
    emotionalTrend,
    frequentCodes,
    pendingFollowUps,
    topicsToRevisit,
    topicsToAvoid
  };
}

/**
 * Calcula tendencia emocional
 */
function calculateEmotionalTrend(emotions) {
  if (emotions.length === 0) return 'unknown';
  if (emotions.length === 1) return emotions[0];
  
  const weights = {
    'muy_positivo': 2,
    'positivo': 1,
    'neutral': 0,
    'negativo': -1,
    'muy_negativo': -2
  };
  
  // Últimas 3 llamadas tienen más peso
  const recentEmotions = emotions.slice(0, 3);
  const olderEmotions = emotions.slice(3);
  
  let score = 0;
  
  for (const emotion of recentEmotions) {
    score += (weights[emotion] || 0) * 2; // Doble peso
  }
  
  for (const emotion of olderEmotions) {
    score += weights[emotion] || 0;
  }
  
  const avgScore = score / (recentEmotions.length * 2 + olderEmotions.length);
  
  if (avgScore >= 1) return 'mejorando';
  if (avgScore >= 0) return 'estable_positivo';
  if (avgScore >= -0.5) return 'estable';
  if (avgScore >= -1) return 'estable_negativo';
  return 'necesita_atencion';
}

/**
 * Identifica temas que generaron reacción negativa
 */
function identifyNegativeTopics(callHistory) {
  const negativeTopics = [];
  
  for (const call of callHistory) {
    if (['negativo', 'muy_negativo'].includes(call.sentiment)) {
      // Marcar temas de esa llamada como sensibles
      if (call.topics_discussed) {
        for (const topic of call.topics_discussed) {
          if (!negativeTopics.includes(topic)) {
            negativeTopics.push(topic);
          }
        }
      }
    }
  }
  
  return negativeTopics.slice(0, 3);
}

/**
 * Genera iniciadores de conversación personalizados
 */
function generateConversationStarters(user, historyAnalysis) {
  const starters = [];
  
  // Primera llamada
  if (historyAnalysis.dominantTopics.length === 0) {
    starters.push(`¡Hola ${user.nombre}! Soy Lupita. ${user.migrante_nombre || 'Su familiar'} me pidió que la llamara para conocerla. ¿Cómo amaneció hoy?`);
    return starters;
  }
  
  // Llamadas subsecuentes
  const lastTopics = historyAnalysis.topicsToRevisit;
  
  if (lastTopics.includes('salud')) {
    starters.push(`¡Hola ${user.nombre}! ¿Cómo se ha sentido? La última vez me platicó que andaba un poco malita.`);
  }
  
  if (lastTopics.includes('familia')) {
    starters.push(`¡Hola ${user.nombre}! ¿Cómo está la familia? ¿Ya vio a sus nietos?`);
  }
  
  if (lastTopics.includes('comida')) {
    starters.push(`¡Hola ${user.nombre}! ¿Qué cocinó de rico estos días? Me quedé pensando en esa receta que me platicó.`);
  }
  
  // Default
  if (starters.length === 0) {
    starters.push(`¡Hola ${user.nombre}! ¿Cómo ha estado? Ya la extrañaba.`);
  }
  
  return starters;
}

/**
 * Obtiene patrones similares de Weaviate
 */
async function getSimilarPatterns(topics) {
  if (!topics || topics.length === 0) {
    return [];
  }
  
  try {
    const query = topics.join(' ');
    const similar = await searchSimilarConversations(query, 3);
    
    // Extraer patrones útiles (sin datos personales)
    return similar.map(conv => ({
      topics: conv.topics,
      emotionalState: conv.emotionalState,
      effectiveResponses: conv.behavioralCodes
    }));
    
  } catch (error) {
    console.error('Error getting similar patterns:', error.message);
    return [];
  }
}

/**
 * Genera resumen para Lupita
 */
function generateLupitaBriefing(context) {
  const lines = [];
  
  lines.push(`=== BRIEFING PARA LLAMADA ===`);
  lines.push(`Usuario: ${context.user_full_name}, ${context.user_age || '?'} años`);
  lines.push(`Familiar en USA: ${context.migrant_name} (${context.relationship})`);
  lines.push(`Llamadas anteriores: ${context.total_calls}`);
  
  if (context.is_first_call) {
    lines.push(`\n⭐ PRIMERA LLAMADA - Enfócate en conocerla y generar confianza`);
  } else {
    lines.push(`Última llamada: hace ${context.days_since_last_call} días`);
    lines.push(`Tendencia emocional: ${context.emotional_trend}`);
    
    if (context.topics_to_revisit.length > 0) {
      lines.push(`\nTemas para retomar: ${context.topics_to_revisit.join(', ')}`);
    }
    
    if (context.pending_follow_ups.length > 0) {
      lines.push(`\n⚠️ Seguimientos pendientes: ${context.pending_follow_ups.length}`);
    }
  }
  
  if (context.topics_to_avoid.length > 0) {
    lines.push(`\n🚫 Temas sensibles: ${context.topics_to_avoid.join(', ')}`);
  }
  
  lines.push(`\n💬 Sugerencia de inicio:`);
  lines.push(context.conversation_starters[0]);
  
  return lines.join('\n');
}

// ============================================
// HELPERS
// ============================================

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

function calculateDaysSince(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  const today = new Date();
  const diffTime = Math.abs(today - date);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

module.exports = {
  buildFullContext,
  analyzeCallHistory,
  generateConversationStarters,
  generateLupitaBriefing,
  calculateEmotionalTrend
};