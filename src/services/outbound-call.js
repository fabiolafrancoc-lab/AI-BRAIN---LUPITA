// ============================================
// OUTBOUND CALL SERVICE - LUPITA AI
// Maneja el ciclo de vida de llamadas salientes
// ============================================

const { initiateOutboundCall, getCallStatus, getCallTranscript, endCall } = require('../config/vapi');
const { saveRecordingLegal, saveRecordingActive, saveTranscript } = require('../config/aws');
const { saveCallRecord, saveCallInsights } = require('../config/supabase');
const { saveConversationEmbedding } = require('../config/weaviate');
const { analyzeBehavioralCodes, detectEmotionalState } = require('../assistants/lupita');
const axios = require('axios');

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

/**
 * Inicia una llamada completa con todo el contexto
 */
async function startCall(userId, phone, userContext) {
  console.log(`Starting call to ${phone} for user ${userId}`);
  
  try {
    // Iniciar llamada via VAPI
    const call = await initiateOutboundCall(phone, userContext);
    
    return {
      success: true,
      callId: call.id,
      status: call.status,
      startedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`Failed to start call for user ${userId}:`, error.message);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Procesa una llamada completada
 */
async function processCompletedCall(callId, userId, vapiCallData) {
  console.log(`Processing completed call: ${callId}`);
  
  try {
    // 1. Obtener transcripción
    const transcript = vapiCallData.transcript || await getCallTranscript(callId);
    
    // 2. Analizar comportamiento
    const behavioralCodes = analyzeBehavioralCodes(transcript || '');
    const emotionalState = detectEmotionalState(transcript || '');
    
    // 3. Extraer temas discutidos
    const topics = extractTopics(transcript || '');
    
    // 4. Determinar si necesita seguimiento
    const followUpNeeded = determineFollowUp(behavioralCodes, emotionalState);
    
    // 5. Guardar grabación en S3 (si existe)
    if (vapiCallData.recordingUrl) {
      await saveRecordingFromUrl(callId, userId, vapiCallData.recordingUrl);
    }
    
    // 6. Guardar transcripción en S3
    if (transcript) {
      await saveTranscript(callId, userId, {
        raw: transcript,
        analyzedAt: new Date().toISOString()
      });
    }
    
    // 7. Guardar registro en Supabase
    const callRecord = await saveCallRecord({
      userId,
      vapiCallId: callId,
      duration: vapiCallData.duration || 0,
      status: 'completed',
      recordingUrl: vapiCallData.recordingUrl,
      transcript: transcript,
      sentiment: emotionalState,
      topics: topics,
      followUpNeeded: followUpNeeded,
      nextCallDate: followUpNeeded ? calculateNextCallDate() : null
    });
    
    // 8. Guardar insights en Supabase
    const insights = await saveCallInsights({
      callId: callRecord?.id,
      userId,
      behavioralCodes,
      emotionalState,
      healthMentions: extractHealthMentions(transcript || ''),
      familyMentions: extractFamilyMentions(transcript || ''),
      needsIdentified: identifyNeeds(behavioralCodes),
      actionItems: generateActionItems(behavioralCodes, emotionalState)
    });
    
    // 9. Guardar embedding anonimizado en Weaviate
    await saveConversationEmbedding({
      content: anonymizeTranscript(transcript || ''),
      emotionalState,
      behavioralCodes,
      topics,
      ageGroup: getAgeGroup(vapiCallData.userAge),
      region: 'mexico', // Anonimizado
      callDuration: vapiCallData.duration || 0
    });
    
    console.log(`Call ${callId} processed successfully`);
    
    return {
      success: true,
      callRecord,
      insights,
      behavioralCodes,
      emotionalState,
      followUpNeeded
    };
    
  } catch (error) {
    console.error(`Error processing call ${callId}:`, error.message);
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Termina una llamada en progreso
 */
async function terminateCall(callId, reason = 'manual') {
  console.log(`Terminating call ${callId}: ${reason}`);
  
  try {
    await endCall(callId);
    return { success: true };
  } catch (error) {
    console.error(`Error terminating call ${callId}:`, error.message);
    return { success: false, error: error.message };
  }
}

// ============================================
// FUNCIONES DE ANÁLISIS
// ============================================

/**
 * Extrae temas de la transcripción
 */
function extractTopics(transcript) {
  const topics = [];
  const lowerTranscript = transcript.toLowerCase();
  
  const topicKeywords = {
    'salud': ['doctor', 'medicina', 'dolor', 'enfermo', 'hospital'],
    'familia': ['hijo', 'hija', 'nieto', 'esposo', 'hermano'],
    'comida': ['cocinar', 'comida', 'receta', 'comer'],
    'soledad': ['solo', 'extraño', 'falta'],
    'dinero': ['dinero', 'pagar', 'caro', 'cuesta'],
    'fe': ['dios', 'iglesia', 'misa', 'rezar'],
    'recuerdos': ['antes', 'recuerdo', 'cuando era']
  };
  
  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(kw => lowerTranscript.includes(kw))) {
      topics.push(topic);
    }
  }
  
  return topics;
}

/**
 * Determina si necesita seguimiento urgente
 */
function determineFollowUp(behavioralCodes, emotionalState) {
  // Seguimiento si: estado muy negativo, menciona soledad, o problemas de salud
  const urgentCodes = ['SOL', 'SAL', 'EMO', 'PRE'];
  const hasUrgentCode = behavioralCodes.some(code => urgentCodes.includes(code));
  const isNegative = ['negativo', 'muy_negativo'].includes(emotionalState);
  
  return hasUrgentCode || isNegative;
}

/**
 * Calcula próxima fecha de llamada
 */
function calculateNextCallDate() {
  const nextCall = new Date();
  nextCall.setDate(nextCall.getDate() + 1); // Mañana
  nextCall.setHours(10, 0, 0, 0); // 10 AM
  return nextCall.toISOString();
}

/**
 * Extrae menciones de salud
 */
function extractHealthMentions(transcript) {
  const mentions = [];
  const healthKeywords = ['dolor', 'medicina', 'pastilla', 'doctor', 'hospital', 'enfermo', 'síntoma', 'presión', 'azúcar', 'diabetes'];
  
  const sentences = transcript.split(/[.!?]+/);
  
  for (const sentence of sentences) {
    if (healthKeywords.some(kw => sentence.toLowerCase().includes(kw))) {
      mentions.push(sentence.trim());
    }
  }
  
  return mentions.slice(0, 5); // Máximo 5
}

/**
 * Extrae menciones de familia
 */
function extractFamilyMentions(transcript) {
  const mentions = [];
  const familyKeywords = ['hijo', 'hija', 'nieto', 'nieta', 'esposo', 'esposa', 'hermano', 'hermana', 'mamá', 'papá'];
  
  const sentences = transcript.split(/[.!?]+/);
  
  for (const sentence of sentences) {
    if (familyKeywords.some(kw => sentence.toLowerCase().includes(kw))) {
      mentions.push(sentence.trim());
    }
  }
  
  return mentions.slice(0, 5);
}

/**
 * Identifica necesidades basadas en códigos
 */
function identifyNeeds(behavioralCodes) {
  const needsMap = {
    'SOL': 'Necesita más contacto social',
    'SAL': 'Requiere atención médica',
    'PRE': 'Necesita apoyo emocional',
    'DIN': 'Preocupaciones económicas',
    'TEC': 'Ayuda con tecnología',
    'SUE': 'Problemas de sueño - revisar'
  };
  
  return behavioralCodes
    .filter(code => needsMap[code])
    .map(code => needsMap[code]);
}

/**
 * Genera acciones a tomar
 */
function generateActionItems(behavioralCodes, emotionalState) {
  const actions = [];
  
  if (behavioralCodes.includes('SAL')) {
    actions.push('Recordar sobre telemedicina gratuita');
  }
  
  if (behavioralCodes.includes('SOL')) {
    actions.push('Programar llamadas más frecuentes');
  }
  
  if (['negativo', 'muy_negativo'].includes(emotionalState)) {
    actions.push('Llamar mañana para seguimiento');
  }
  
  if (behavioralCodes.includes('MED')) {
    actions.push('Preguntar si necesita ayuda con medicamentos');
  }
  
  return actions;
}

/**
 * Anonimiza transcripción para Weaviate
 */
function anonymizeTranscript(transcript) {
  // Remover nombres propios y datos personales
  return transcript
    .replace(/\b[A-Z][a-záéíóú]+\b/g, '[NOMBRE]') // Nombres propios
    .replace(/\d{10}/g, '[TELEFONO]') // Teléfonos
    .replace(/\d+\s*(años|año)/gi, '[EDAD] años') // Edades
    .replace(/calle\s+[^,]+/gi, '[DIRECCION]'); // Direcciones
}

/**
 * Obtiene grupo de edad anonimizado
 */
function getAgeGroup(age) {
  if (!age) return 'desconocido';
  if (age < 40) return '30-39';
  if (age < 50) return '40-49';
  if (age < 60) return '50-59';
  if (age < 70) return '60-69';
  if (age < 80) return '70-79';
  return '80+';
}

/**
 * Descarga y guarda grabación desde URL
 */
async function saveRecordingFromUrl(callId, userId, recordingUrl) {
  try {
    const response = await axios.get(recordingUrl, {
      responseType: 'arraybuffer'
    });
    
    const audioBuffer = Buffer.from(response.data);
    
    // Guardar en ambos buckets
    await saveRecordingLegal(callId, userId, audioBuffer);
    await saveRecordingActive(callId, userId, audioBuffer);
    
    console.log(`Recording saved for call ${callId}`);
    
  } catch (error) {
    console.error(`Error saving recording for ${callId}:`, error.message);
  }
}

module.exports = {
  startCall,
  processCompletedCall,
  terminateCall,
  extractTopics,
  determineFollowUp,
  anonymizeTranscript
};