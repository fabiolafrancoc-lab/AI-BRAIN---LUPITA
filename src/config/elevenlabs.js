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
// PERFILES DE VOZ SEGMENTADOS
// ============================================

const VOICE_PROFILES = {
  // Mujeres mayores (para usuarios que prefieren voz maternal)
  lupita:   { id: 'VOICE_ID_HERE', age: 65, gender: 'F', tone: 'maternal', accent: 'mexican' },
  carmen:   { id: 'VOICE_ID_HERE', age: 62, gender: 'F', tone: 'firme', accent: 'mexican' },
  rosa:     { id: 'VOICE_ID_HERE', age: 68, gender: 'F', tone: 'suave', accent: 'mexican' },
  teresa:   { id: 'VOICE_ID_HERE', age: 64, gender: 'F', tone: 'clara', accent: 'mexican' },
  
  // Mujeres jóvenes (para usuarios que prefieren voz moderna)
  maria:    { id: 'VOICE_ID_HERE', age: 32, gender: 'F', tone: 'energética', accent: 'mexican' },
  ana:      { id: 'VOICE_ID_HERE', age: 35, gender: 'F', tone: 'paciente', accent: 'mexican' },
  sofia:    { id: 'VOICE_ID_HERE', age: 29, gender: 'F', tone: 'dinámica', accent: 'mexican' },
  daniela:  { id: 'VOICE_ID_HERE', age: 38, gender: 'F', tone: 'profesional', accent: 'mexican' },
  
  // Hombres mayores (para usuarios hombres que prefieren voz masculina)
  roberto:  { id: 'VOICE_ID_HERE', age: 67, gender: 'M', tone: 'autoritativo', accent: 'mexican' },
  miguel:   { id: 'VOICE_ID_HERE', age: 63, gender: 'M', tone: 'amigable', accent: 'mexican' }
};

// Voz por defecto
const DEFAULT_VOICE = 'lupita';

// ============================================
// CONFIGURACIÓN DE VOZ
// ============================================

const VOICE_SETTINGS = {
  stability: 0.5,           // Balance entre consistencia y expresividad
  similarity_boost: 0.75,   // Qué tan similar al original
  style: 0.5,               // Expresividad emocional
  use_speaker_boost: true   // Mejora calidad
};

// ============================================
// FUNCIONES
// ============================================

/**
 * Obtiene el perfil de voz por nombre
 */
function getVoiceProfile(voiceName) {
  return VOICE_PROFILES[voiceName.toLowerCase()] || VOICE_PROFILES[DEFAULT_VOICE];
}

/**
 * Selecciona la mejor voz según el perfil del usuario
 */
function selectVoiceForUser(userAge, userGender, preference = null) {
  // Si hay preferencia específica, usarla
  if (preference && VOICE_PROFILES[preference]) {
    return VOICE_PROFILES[preference];
  }
  
  // Selección automática basada en demografía del usuario
  if (userGender === 'M' && userAge > 50) {
    // Hombres mayores pueden preferir voz masculina
    return VOICE_PROFILES.miguel;
  }
  
  if (userAge > 55) {
    // Usuarios mayores: voz maternal de Lupita
    return VOICE_PROFILES.lupita;
  }
  
  if (userAge < 40) {
    // Usuarios jóvenes: voz más moderna
    return VOICE_PROFILES.maria;
  }
  
  // Default: Lupita
  return VOICE_PROFILES.lupita;
}

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
 * Obtiene información de una voz específica
 */
async function getVoiceInfo(voiceId) {
  try {
    const response = await elevenlabsClient.get(`/voices/${voiceId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting voice info:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Genera audio de prueba con una voz
 */
async function generateTestAudio(voiceName, text = '¡Hola! Soy tu acompañante de salud. ¿Cómo amaneció hoy?') {
  const profile = getVoiceProfile(voiceName);
  
  try {
    const response = await elevenlabsClient.post(
      `/text-to-speech/${profile.id}`,
      {
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: VOICE_SETTINGS
      },
      {
        responseType: 'arraybuffer'
      }
    );
    
    return Buffer.from(response.data);
  } catch (error) {
    console.error('Error generating audio:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Obtiene uso de la cuenta (para monitorear límites)
 */
async function getUsageStats() {
  try {
    const response = await elevenlabsClient.get('/user/subscription');
    return {
      characterCount: response.data.character_count,
      characterLimit: response.data.character_limit,
      remainingCharacters: response.data.character_limit - response.data.character_count
    };
  } catch (error) {
    console.error('Error getting usage:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Lista todos los perfiles de voz disponibles
 */
function listVoiceProfiles() {
  return Object.entries(VOICE_PROFILES).map(([name, profile]) => ({
    name,
    ...profile
  }));
}

module.exports = {
  elevenlabsClient,
  VOICE_PROFILES,
  VOICE_SETTINGS,
  DEFAULT_VOICE,
  getVoiceProfile,
  selectVoiceForUser,
  listSpanishVoices,
  getVoiceInfo,
  generateTestAudio,
  getUsageStats,
  listVoiceProfiles
};