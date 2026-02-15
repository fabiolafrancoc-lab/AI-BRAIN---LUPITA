// ============================================
// TELNYX EVENTS WEBHOOK - LUPITA AI
// Recibe eventos de telefonía de Telnyx
// ============================================

const express = require('express');
const router = express.Router();
const { saveCallRecord } = require('../config/supabase');

// ============================================
// ENDPOINT PRINCIPAL
// ============================================

/**
 * POST /webhooks/telnyx
 * Recibe todos los eventos de Telnyx
 */
router.post('/', async (req, res) => {
  const event = req.body?.data;
  const eventType = event?.event_type;
  
  console.log(`Telnyx event received: ${eventType}`);
  
  try {
    switch (eventType) {
      case 'call.initiated':
        await handleCallInitiated(event);
        break;
        
      case 'call.answered':
        await handleCallAnswered(event);
        break;
        
      case 'call.hangup':
        await handleCallHangup(event);
        break;
        
      case 'call.machine.detection.ended':
        await handleMachineDetection(event);
        break;
        
      case 'call.recording.saved':
        await handleRecordingSaved(event);
        break;
        
      case 'call.speak.started':
        console.log(`TTS started: ${event.payload?.call_control_id}`);
        break;
        
      case 'call.speak.ended':
        console.log(`TTS ended: ${event.payload?.call_control_id}`);
        break;
        
      case 'call.dtmf.received':
        await handleDTMF(event);
        break;
        
      default:
        console.log(`Unhandled Telnyx event: ${eventType}`);
    }
    
    // Telnyx espera 200 OK
    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('Error processing Telnyx event:', error);
    res.status(200).json({ received: true, error: error.message });
  }
});

// ============================================
// HANDLERS DE EVENTOS
// ============================================

/**
 * Llamada iniciada (marcando)
 */
async function handleCallInitiated(event) {
  const payload = event.payload;
  const callControlId = payload?.call_control_id;
  const to = payload?.to;
  const from = payload?.from;
  
  console.log(`Call initiated: ${callControlId}`);
  console.log(`  From: ${from} -> To: ${to}`);
  
  // Registrar inicio de llamada
  await logCallEvent(callControlId, 'initiated', {
    to,
    from,
    direction: payload?.direction,
    startedAt: new Date().toISOString()
  });
}

/**
 * Llamada contestada
 */
async function handleCallAnswered(event) {
  const payload = event.payload;
  const callControlId = payload?.call_control_id;
  
  console.log(`Call answered: ${callControlId}`);
  
  await logCallEvent(callControlId, 'answered', {
    answeredAt: new Date().toISOString()
  });
}

/**
 * Llamada terminada
 */
async function handleCallHangup(event) {
  const payload = event.payload;
  const callControlId = payload?.call_control_id;
  const hangupCause = payload?.hangup_cause;
  const hangupSource = payload?.hangup_source;
  
  console.log(`Call hangup: ${callControlId}`);
  console.log(`  Cause: ${hangupCause}, Source: ${hangupSource}`);
  
  await logCallEvent(callControlId, 'hangup', {
    hangupCause,
    hangupSource,
    endedAt: new Date().toISOString()
  });
  
  // Manejar diferentes causas de hangup
  switch (hangupCause) {
    case 'normal_clearing':
      // Llamada terminó normalmente
      console.log(`Call ${callControlId} ended normally`);
      break;
      
    case 'user_busy':
      // Usuario ocupado - programar reintento
      console.log(`User busy for call ${callControlId} - scheduling retry`);
      // TODO: Programar reintento en 30 minutos
      break;
      
    case 'no_answer':
      // No contestó - programar reintento
      console.log(`No answer for call ${callControlId} - scheduling retry`);
      // TODO: Programar reintento en 1 hora
      break;
      
    case 'call_rejected':
      // Rechazó la llamada
      console.log(`Call rejected: ${callControlId}`);
      // TODO: Enviar WhatsApp preguntando mejor horario
      break;
      
    default:
      console.log(`Unknown hangup cause: ${hangupCause}`);
  }
}

/**
 * Detección de máquina/buzón
 */
async function handleMachineDetection(event) {
  const payload = event.payload;
  const callControlId = payload?.call_control_id;
  const result = payload?.result; // 'human', 'machine', 'not_sure'
  
  console.log(`Machine detection for ${callControlId}: ${result}`);
  
  if (result === 'machine') {
    // Contestó buzón de voz
    console.log(`Voicemail detected for ${callControlId} - hanging up`);
    
    // TODO: Colgar y programar reintento
    // await hangupCall(callControlId);
    
    await logCallEvent(callControlId, 'voicemail_detected', {
      detectedAt: new Date().toISOString()
    });
  }
}

/**
 * Grabación guardada
 */
async function handleRecordingSaved(event) {
  const payload = event.payload;
  const callControlId = payload?.call_control_id;
  const recordingUrls = payload?.recording_urls;
  
  console.log(`Recording saved for ${callControlId}`);
  
  if (recordingUrls?.mp3) {
    console.log(`  MP3: ${recordingUrls.mp3}`);
    
    await logCallEvent(callControlId, 'recording_saved', {
      recordingUrl: recordingUrls.mp3,
      savedAt: new Date().toISOString()
    });
    
    // TODO: Descargar y guardar en S3
  }
}

/**
 * DTMF recibido (teclas presionadas)
 */
async function handleDTMF(event) {
  const payload = event.payload;
  const callControlId = payload?.call_control_id;
  const digit = payload?.digit;
  
  console.log(`DTMF received for ${callControlId}: ${digit}`);
  
  // Manejar opciones del menú si las hay
  switch (digit) {
    case '1':
      // Opción 1
      break;
    case '0':
      // Transferir a humano
      console.log(`Transfer requested for ${callControlId}`);
      break;
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Registra evento de llamada en logs
 */
async function logCallEvent(callControlId, eventType, data) {
  const logEntry = {
    callControlId,
    eventType,
    data,
    timestamp: new Date().toISOString()
  };
  
  // Log local
  console.log('Call event:', JSON.stringify(logEntry));
  
  // TODO: Guardar en Supabase para análisis
  // await supabase.from('lupita_call_events').insert(logEntry);
}

/**
 * GET /webhooks/telnyx/health
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'telnyx-webhook',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;