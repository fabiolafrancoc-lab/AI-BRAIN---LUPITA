// ============================================
// CALL SCHEDULER - LUPITA AI
// Programa llamadas con delay de 2 horas
// ============================================

const { getUserContext, getCallHistory, markFirstCallCompleted } = require('../config/supabase');
const { initiateOutboundCall } = require('../config/vapi');
const { formatMexicanNumber, isValidMexicanNumber } = require('../config/telnyx');
const { buildCallContext } = require('../assistants/lupita');

// Cola de llamadas programadas (en producción usar Redis o similar)
const scheduledCalls = new Map();

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

/**
 * Programa una llamada para un nuevo usuario
 * @param {Object} userData - Datos del usuario
 * @param {number} delayMinutes - Minutos de espera (default: 120 = 2 horas)
 */
async function scheduleCall(userData, delayMinutes = 120) {
  const { userId, userName, phone, companion, registeredAt } = userData;
  
  // Validar número
  if (!isValidMexicanNumber(phone)) {
    console.error(`Invalid phone number for user ${userId}: ${phone}`);
    return null;
  }
  
  const formattedPhone = formatMexicanNumber(phone);
  const callTime = new Date(registeredAt || Date.now());
  callTime.setMinutes(callTime.getMinutes() + delayMinutes);
  
  const callId = `call_${userId}_${Date.now()}`;
  
  const scheduledCall = {
    id: callId,
    userId,
    userName,
    phone: formattedPhone,
    companion,
    scheduledFor: callTime,
    status: 'scheduled',
    attempts: 0,
    maxAttempts: 3,
    createdAt: new Date()
  };
  
  // Guardar en cola
  scheduledCalls.set(callId, scheduledCall);
  
  // Programar el timeout
  const delayMs = callTime.getTime() - Date.now();
  
  if (delayMs > 0) {
    setTimeout(() => {
      executeScheduledCall(callId);
    }, delayMs);
    
    console.log(`Call scheduled: ${callId} for ${callTime.toISOString()} (in ${delayMinutes} minutes)`);
  } else {
    // Si ya pasó el tiempo, ejecutar inmediatamente
    console.log(`Call executing immediately: ${callId}`);
    executeScheduledCall(callId);
  }
  
  return scheduledCall;
}

/**
 * Ejecuta una llamada programada
 */
async function executeScheduledCall(callId) {
  const scheduledCall = scheduledCalls.get(callId);
  
  if (!scheduledCall) {
    console.error(`Scheduled call not found: ${callId}`);
    return;
  }
  
  if (scheduledCall.status === 'completed' || scheduledCall.status === 'cancelled') {
    console.log(`Call ${callId} already ${scheduledCall.status}`);
    return;
  }
  
  scheduledCall.attempts++;
  scheduledCall.status = 'executing';
  
  try {
    // Obtener contexto actualizado del usuario
    const user = await getUserContext(scheduledCall.userId);
    
    if (!user) {
      throw new Error(`User not found: ${scheduledCall.userId}`);
    }
    
    // Obtener historial de llamadas
    const callHistory = await getCallHistory(scheduledCall.userId);
    
    // Construir contexto para Lupita
    const context = buildCallContext(user, callHistory);
    
    // Iniciar llamada via VAPI
    const vapiCall = await initiateOutboundCall(scheduledCall.phone, {
      ...user,
      callHistory,
      ...context
    });
    
    scheduledCall.status = 'in_progress';
    scheduledCall.vapiCallId = vapiCall.id;
    scheduledCall.startedAt = new Date();
    
    console.log(`Call initiated: ${callId} -> VAPI ${vapiCall.id}`);
    
    return vapiCall;
    
  } catch (error) {
    console.error(`Error executing call ${callId}:`, error.message);
    
    scheduledCall.status = 'failed';
    scheduledCall.lastError = error.message;
    
    // Reintentar si no hemos alcanzado el máximo
    if (scheduledCall.attempts < scheduledCall.maxAttempts) {
      const retryDelay = 30 * 60 * 1000; // 30 minutos
      scheduledCall.status = 'retry_scheduled';
      
      setTimeout(() => {
        executeScheduledCall(callId);
      }, retryDelay);
      
      console.log(`Call ${callId} retry scheduled in 30 minutes (attempt ${scheduledCall.attempts}/${scheduledCall.maxAttempts})`);
    } else {
      console.log(`Call ${callId} max attempts reached, marking as failed`);
    }
  }
}

/**
 * Marca una llamada como completada
 */
async function markCallCompleted(callId, result) {
  const scheduledCall = scheduledCalls.get(callId);
  
  if (scheduledCall) {
    scheduledCall.status = 'completed';
    scheduledCall.completedAt = new Date();
    scheduledCall.result = result;
    
    // Marcar primera llamada completada en Supabase
    await markFirstCallCompleted(scheduledCall.userId);
    
    console.log(`Call completed: ${callId}`);
  }
}

/**
 * Cancela una llamada programada
 */
function cancelScheduledCall(callId) {
  const scheduledCall = scheduledCalls.get(callId);
  
  if (scheduledCall && scheduledCall.status === 'scheduled') {
    scheduledCall.status = 'cancelled';
    scheduledCall.cancelledAt = new Date();
    console.log(`Call cancelled: ${callId}`);
    return true;
  }
  
  return false;
}

/**
 * Obtiene el estado de una llamada
 */
function getCallStatus(callId) {
  return scheduledCalls.get(callId) || null;
}

/**
 * Lista todas las llamadas programadas
 */
function listScheduledCalls() {
  return Array.from(scheduledCalls.values())
    .filter(call => call.status === 'scheduled')
    .sort((a, b) => a.scheduledFor - b.scheduledFor);
}

/**
 * Lista llamadas pendientes de un usuario
 */
function getUserScheduledCalls(userId) {
  return Array.from(scheduledCalls.values())
    .filter(call => call.userId === userId && call.status === 'scheduled');
}

/**
 * Reprograma una llamada
 */
function rescheduleCall(callId, newTime) {
  const scheduledCall = scheduledCalls.get(callId);
  
  if (!scheduledCall || scheduledCall.status !== 'scheduled') {
    return false;
  }
  
  scheduledCall.scheduledFor = new Date(newTime);
  
  const delayMs = scheduledCall.scheduledFor.getTime() - Date.now();
  
  if (delayMs > 0) {
    setTimeout(() => {
      executeScheduledCall(callId);
    }, delayMs);
  }
  
  console.log(`Call rescheduled: ${callId} to ${scheduledCall.scheduledFor.toISOString()}`);
  return true;
}

/**
 * Estadísticas de llamadas
 */
function getCallStats() {
  const calls = Array.from(scheduledCalls.values());
  
  return {
    total: calls.length,
    scheduled: calls.filter(c => c.status === 'scheduled').length,
    inProgress: calls.filter(c => c.status === 'in_progress').length,
    completed: calls.filter(c => c.status === 'completed').length,
    failed: calls.filter(c => c.status === 'failed').length,
    cancelled: calls.filter(c => c.status === 'cancelled').length
  };
}

module.exports = {
  scheduleCall,
  executeScheduledCall,
  markCallCompleted,
  cancelScheduledCall,
  getCallStatus,
  listScheduledCalls,
  getUserScheduledCalls,
  rescheduleCall,
  getCallStats
};