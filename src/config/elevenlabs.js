// ============================================
// ELEVENLABS CLIENT - LUPITA AI
// ============================================

const axios = require('axios');

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID;
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

if (!ELEVENLABS_API_KEY) {
  throw new Error('Missing ELEVENLABS_API_KEY environment variable');
}

// Cliente axios configurado
const elevenlabsClient = axios.create({
  baseURL: ELEVENLABS_BASE_URL,
  headers: {
    'xi-api-key': ELEVENLABS_API_KEY,
    'Content-Type': 'application/json'
  }
});

// ============================================
// CONFIGURACIÓN DE VOZ DE LUPITA
// ============================================

const LUPITA_VOICE_SETTINGS = {
  stability: 0.5,           // Balance entre consistencia y expresividad
  similarity_boost: 0.75,   // Qué tan similar al original
  style: 0.5,               // Expresividad emocional
  use_speaker_boost: true   // Mejora calidad
};

// ============================================
// FUNCIONES
// ============================================

/**
 * Lista todas las voces disponibles en español
 */
async function listSpanishVoices() {
  try {
    const response = await elevenlabsClient.get('/voices');
    
    const spanishVoices = response.data.voices.filter(v => 
      v.labels?.language === 'es' || 
      v.labels?.language === 'Spanish' ||
      v.labels?.accent === 'mexican' ||
      v.labels?.accent === 'Mexican'
    );
    
    return spanishVoices;
  } catch (error) {
    console.error('Error listing voices:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Obtiene información de la voz de Lupita
 */
async function getLupitaVoiceInfo() {
  try {
    const response = await elevenlabsClient.get(`/voices/${ELEVENLABS_VOICE_ID}`);
    return response.data;
  } catch (error) {
    console.error('Error getting voice info:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Genera audio de prueba con la voz de Lupita
 */
async function generateTestAudio(text = '¡Hola! Soy Lupita, tu acompañante de salud. ¿Cómo amaneció hoy?') {
  try {
    const response = await elevenlabsClient.post(
      `/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: LUPITA_VOICE_SETTINGS
      },
      {
        responseType: 'arraybuffer'
      }
    );