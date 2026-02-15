// ============================================
// TELNYX CLIENT - LUPITA AI
// ============================================

const axios = require('axios');

const TELNYX_API_KEY = process.env.TELNYX_API_KEY;
const TELNYX_CONNECTION_ID = process.env.TELNYX_CONNECTION_ID;
const TELNYX_PHONE_NUMBER = process.env.TELNYX_PHONE_NUMBER;
const TELNYX_BASE_URL = 'https://api.telnyx.com/v2';

if (!TELNYX_API_KEY) {
  throw new Error('Missing TELNYX_API_KEY environment variable');
}

// Cliente axios configurado
const telnyxClient = axios.create({
  baseURL: TELNYX_BASE_URL,
  headers: {
    'Authorization': `Bearer ${TELNYX_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// ============================================
// FUNCIONES
// ============================================

/**
 * Verifica que el número de México esté activo
 */
async function verifyPhoneNumber() {
  try {
    const response = await telnyxClient.get('/phone_numbers', {
      params: {
        'filter[phone_number]': TELNYX_PHONE_NUMBER
      }
    });
    
    const phoneNumber = response.data.data[0];
    
    if (!phoneNumber) {
      throw new Error(`Phone number ${TELNYX_PHONE_NUMBER} not found`);
    }
    
    return {
      id: phoneNumber.id,
      number: phoneNumber.phone_number,
      status: phoneNumber.status,
      connectionId: phoneNumber.connection_id
    };
  } catch (error) {
    console.error('Error verifying phone number:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Obtiene balance de la cuenta
 */
async function getAccountBalance() {
  try {
    const response = await telnyxClient.get('/balance');
    return {
      balance: response.data.data.balance,
      currency: response.data.data.currency,
      creditLimit: response.data.data.credit_limit
    };
  } catch (error) {
    console.error('Error getting balance:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Lista llamadas recientes
 */
async function listRecentCalls(limit = 20) {
  try {
    const response = await telnyxClient.get('/calls', {
      params: {
        'page[size]': limit
      }
    });
    return response.data.data;
  } catch (error) {
    console.error('Error listing calls:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Obtiene detalles de una llamada específica
 */
async function getCallDetails(callControlId) {
  try {
    const response = await telnyxClient.get(`/calls/${callControlId}`);
    return response.data.data;
  } catch (error) {
    console.error('Error getting call details:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Verifica conectividad con Telnyx
 */
async function healthCheck() {
  try {
    const [balance, phoneNumber] = await Promise.all([
      getAccountBalance(),
      verifyPhoneNumber()
    ]);
    
    return {
      status: 'healthy',
      balance: balance,
      phoneNumber: phoneNumber,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Formatea número de teléfono mexicano
 */
function formatMexicanNumber(phone) {
  // Elimina espacios y caracteres especiales
  let cleaned = phone.replace(/\D/g, '');
  
  // Si empieza con 52, ya está bien
  if (cleaned.startsWith('52')) {
    return `+${cleaned}`;
  }
  
  // Si empieza con 1 (código de país), removerlo
  if (cleaned.startsWith('1')) {
    cleaned = cleaned.substring(1);
  }
  
  // Agregar código de México
  return `+52${cleaned}`;
}

/**
 * Valida que un número sea mexicano válido
 */
function isValidMexicanNumber(phone) {
  const formatted = formatMexicanNumber(phone);
  // Número mexicano: +52 + 10 dígitos
  return /^\+52\d{10}$/.test(formatted);
}

module.exports = {
  telnyxClient,
  TELNYX_PHONE_NUMBER,
  verifyPhoneNumber,
  getAccountBalance,
  listRecentCalls,
  getCallDetails,
  healthCheck,
  formatMexicanNumber,
  isValidMexicanNumber
};