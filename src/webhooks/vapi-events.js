// ============================================
// VAPI EVENTS WEBHOOK - LUPITA AI
// Recibe eventos de llamadas de VAPI
// ============================================

const express = require('express');
const router = express.Router();
const { markCallCompleted, getCallStatus } = require('../services/call-scheduler');
const { processCompletedCall } = require('../services/outbound-call');
const { saveCallRecord } = require('../config/supabase');

// Secret para validar webhooks de VAPI
const VAPI_WEBHOOK_SECRET = process.env.VAPI_WEBHOOK_SECRET;

// ============================================
// MIDDLEWARE DE VALIDACIÓN
// ============================================

function validateVapiWebhook(req, res, next) {
  // VAPI envía un header de verificación
  const vapiSignature = req.headers['x-vapi-signature'];
  
  // En desarrollo, permitir sin validación
  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  
  if (VAPI_WEBHOOK_SECRET && vapiSignature !== VAPI_WEBHOOK_SECRET) {
    console.warn('Invalid VAPI webhook signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  next();
}

// ============================================
// ENDPOINT PRINCIPAL
// ============================================

/**
 * POST /webhooks/vapi
 * Recibe todos los eventos de VAPI
 */
router.post('/', validateVapiWebhook, async (req, res) => {
  const event = req.body;
  
  console.log(`VAPI event received: ${event.type || 'unknown'}`);
  
  try {
    switch (event.type) {
      case 'call.started':
        await handleCallStarted(event);
        break;
        
      case 'call.ended':
        await handleCallEnded(event);
        break;
        
      case 'call.failed':
        await handleCallFailed(event);
        break;
        
      case 'transcript.partial':
        await handleTranscriptPartial(event);
        break;
        
      case 'transcript.final':
        await handleTranscriptFinal(event);
        break;
        
      case 'speech.started':
        // Usuario empezó a hablar
        console.log(`User speaking: ${event.call?.id}`);
        break;
        
      case 'speech.ended':
        // Usuario terminó de hablar
        console.log(`User stopped speaking: ${event.call?.id}`);
        break;
        
      case 'assistant.message':
        // Lupita envió un mensaje
        console.log(`Lupita said: ${event.message?.content?.slice(0, 50)}...`);
        break;
        
      case 'tool.called':
        await handleToolCalled(event);
        break;
        
      default:
        console.log(`Unhandled VAPI event: ${event.type}`);
    }
    
    // VAPI espera 200 OK
    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('Error processing VAPI event:', error);
    // Aún respondemos 200 para que VAPI no reintente
    res.status(200).json({ received: true, error: error.message });
  }
});

// ============================================
// HANDLERS DE EVENTOS
// ============================================

/**
 * Llamada iniciada
 */
async function handleCallStarted(event) {
  const callId = event.call?.id;
  const phoneNumber = event.call?.customer?.number;
  
  console.log(`Call started: ${callId} to ${phoneNumber}`);
  
  // Actualizar estado en nuestra base de datos
  await saveCallRecord({
    vapiCallId: callId,
    status: 'in_progress',
    startedAt: new Date().toISOString(),
    phoneNumber: phoneNumber
  });
}

/**
 * Llamada terminada
 */
async function handleCallEnded(event) {
  const callId = event.call?.id;
  const duration = event.call?.duration;
  const endReason = event.call?.endedReason;
  
  console.log(`Call ended: ${callId}, duration: ${duration}s, reason: ${endReason}`);
  
  // Extraer datos de la llamada
  const callData = {
    vapiCallId: callId,
    duration: duration,
    status: 'completed',
    endReason: endReason,
    transcript: event.call?.transcript,
    recordingUrl: event.call?.recordingUrl,
    summary: event.call?.summary,
    userAge: event.call?.assistantOverrides?.variableValues?.user_age
  };
  
  // Obtener userId de nuestro sistema
  const userId = await getUserIdFromVapiCall(callId);
  
  if (userId) {
    // Procesar llamada completada (análisis, guardar en S3, etc.)
    await processCompletedCall(callId, userId, callData);
    
    // Marcar como completada en scheduler
    await markCallCompleted(callId, {
      duration,
      endReason,
      completedAt: new Date().toISOString()
    });
  }
}

/**
 * Llamada fallida
 */
async function handleCallFailed(event) {
  const callId = event.call?.id;
  const error = event.error || event.call?.error;
  
  console.error(`Call failed: ${callId}`, error);
  
  await saveCallRecord({
    vapiCallId: callId,
    status: 'failed',
    errorMessage: error?.message || 'Unknown error',
    failedAt: new Date().toISOString()
  });
  
  // TODO: Programar reintento si es apropiado
}

/**
 * Transcripción parcial (en tiempo real)
 */
async function handleTranscriptPartial(event) {
  const callId = event.call?.id;
  const text = event.transcript?.text;
  const role = event.transcript?.role; // 'user' o 'assistant'
  
  // Útil para monitoreo en tiempo real
  if (role === 'user') {
    console.log(`[${callId}] User: ${text}`);
    
    // Detectar palabras clave de emergencia
    if (detectEmergencyKeywords(text)) {
      console.warn(`⚠️ Emergency keywords detected in call ${callId}`);
      // TODO: Alertar a supervisores
    }
  }
}

/**
 * Transcripción final
 */
async function handleTranscriptFinal(event) {
  const callId = event.call?.id;
  const transcript = event.transcript;
  
  console.log(`Final transcript received for call ${callId}`);
  
  // La transcripción final se procesa en handleCallEnded
}

/**
 * Herramienta llamada (si Lupita usa tools)
 */
async function handleToolCalled(event) {
  const callId = event.call?.id;
  const toolName = event.tool?.name;
  const toolInput = event.tool?.input;
  
  console.log(`Tool called in ${callId}: ${toolName}`, toolInput);
  
  // Manejar herramientas específicas
  switch (toolName) {
    case 'schedule_telemedicine':
      // TODO: Agendar cita de telemedicina
      break;
      
    case 'send_reminder':
      // TODO: Enviar recordatorio por WhatsApp
      break;
      
    case 'escalate_to_human':
      // TODO: Escalar a humano
      console.warn(`⚠️ Call ${callId} escalated to human`);
      break;
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Obtiene userId de nuestra BD basado en el VAPI callId
 */
async function getUserIdFromVapiCall(vapiCallId) {
  // Buscar en nuestra cola de llamadas programadas
  const { supabase } = require('../config/supabase');
  
  try {
    const { data } = await supabase
      .from('lupita_calls')
      .select('user_id')
      .eq('vapi_call_id', vapiCallId)
      .single();
    
    return data?.user_id || null;
  } catch (error) {
    console.error('Error getting userId for VAPI call:', error);
    return null;
  }
}

/**
 * Detecta palabras clave de emergencia
 */
function detectEmergencyKeywords(text) {
  if (!text) return false;
  
  const emergencyKeywords = [
    'emergencia',
    'ambulancia',
    'hospital',
    'me muero',
    'no puedo respirar',
    'me caí',
    'sangre',
    'desmayo',
    'infarto',
    'suicid'
  ];
  
  const lowerText = text.toLowerCase();
  return emergencyKeywords.some(kw => lowerText.includes(kw));
}

/**
 * GET /webhooks/vapi/health
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'vapi-webhook',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;