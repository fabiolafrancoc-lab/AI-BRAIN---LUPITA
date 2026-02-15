// ============================================
// VAPI CLIENT - LUPITA AI
// ============================================

const axios = require('axios');

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const VAPI_ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID;
const VAPI_BASE_URL = 'https://api.vapi.ai';

if (!VAPI_API_KEY) {
  throw new Error('Missing VAPI_API_KEY environment variable');
}

// Cliente axios configurado
const vapiClient = axios.create({
  baseURL: VAPI_BASE_URL,
  headers: {
    'Authorization': `Bearer ${VAPI_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// ============================================
// FUNCIONES PARA LUPITA
// ============================================

/**
 * Inicia una llamada saliente a un usuario
 */
async function initiateOutboundCall(phoneNumber, userContext) {
  try {
    const response = await vapiClient.post('/call/phone', {
      assistantId: VAPI_ASSISTANT_ID,
      phoneNumberId: process.env.TELNYX_PHONE_NUMBER,
      customer: {
        number: phoneNumber
      },
      assistantOverrides: {
        variableValues: {
          user_name: userContext.nombre,
          user_age: calculateAge(userContext.fecha_nacimiento),
          migrant_name: userContext.migrante_nombre,
          relationship: userContext.parentesco,
          previous_calls: userContext.callHistory?.length || 0,
          last_topics: userContext.lastTopics || 'primera llamada'
        }
      }
    });

    console.log(`Call initiated: ${response.data.id}`);
    return response.data;

  } catch (error) {
    console.error('Error initiating call:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Obtiene el estado de una llamada
 */
async function getCallStatus(callId) {
  try {
    const response = await vapiClient.get(`/call/${callId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting call status:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Obtiene la transcripción de una llamada
 */
async function getCallTranscript(callId) {
  try {
    const response = await vapiClient.get(`/call/${callId}`);
    return response.data.transcript || null;
  } catch (error) {
    console.error('Error getting transcript:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Actualiza el assistant de Lupita con nuevo contexto
 */
async function updateAssistantContext(newContext) {
  try {
    const response = await vapiClient.patch(`/assistant/${VAPI_ASSISTANT_ID}`, {
      variableValues: newContext
    });
    return response.data;
  } catch (error) {
    console.error('Error updating assistant:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Lista todas las llamadas recientes
 */
async function listRecentCalls(limit = 20) {
  try {
    const response = await vapiClient.get('/call', {
      params: { limit }
    });
    return response.data;
  } catch (error) {
    console.error('Error listing calls:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Termina una llamada en progreso
 */
async function endCall(callId) {
  try {
    const response = await vapiClient.post(`/call/${callId}/end`);
    return response.data;
  } catch (error) {
    console.error('Error ending call:', error.response?.data || error.message);
    throw error;
  }
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

module.exports = {
  vapiClient,
  initiateOutboundCall,
  getCallStatus,
  getCallTranscript,
  updateAssistantContext,
  listRecentCalls,
  endCall
};