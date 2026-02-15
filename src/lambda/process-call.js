// ============================================
// AWS LAMBDA - PROCESS CALL RECORDING
// SaludCompartida - Lupita AI
// 
// Trigger: S3 PutObject en bucket active
// Proceso: Audio → Transcripción → Análisis → Storage
// ============================================

const AWS = require('aws-sdk');
const axios = require('axios');

// Clients
const s3 = new AWS.S3();
const transcribe = new AWS.TranscribeService();

// Environment variables
const S3_BUCKET_LEGAL = process.env.S3_BUCKET_LEGAL;
const S3_BUCKET_ACTIVE = process.env.S3_BUCKET_ACTIVE;
const WEAVIATE_URL = process.env.WEAVIATE_URL;
const WEAVIATE_API_KEY = process.env.WEAVIATE_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// ============================================
// MAIN HANDLER
// ============================================

exports.handler = async (event) => {
  console.log('Lambda triggered:', JSON.stringify(event, null, 2));
  
  try {
    // Obtener info del archivo S3 que disparó el trigger
    const record = event.Records[0];
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    
    console.log(`Processing: ${bucket}/${key}`);
    
    // Solo procesar archivos de audio
    if (!key.endsWith('.wav') && !key.endsWith('.mp3')) {
      console.log('Not an audio file, skipping');
      return { statusCode: 200, body: 'Skipped - not audio' };
    }
    
    // Extraer IDs del path: recordings/{userId}/{callId}/audio-full.wav
    const pathParts = key.split('/');
    const userId = pathParts[1];
    const callId = pathParts[2];
    
    console.log(`User: ${userId}, Call: ${callId}`);
    
    // ============================================
    // PASO 1: Copiar a bucket legal (retención 1 año)
    // ============================================
    
    await copyToLegalBucket(bucket, key, userId, callId);
    
    // ============================================
    // PASO 2: Transcribir audio
    // ============================================
    
    const transcript = await transcribeAudio(bucket, key, callId);
    
    // ============================================
    // PASO 3: Analizar transcripción
    // ============================================
    
    const analysis = analyzeTranscript(transcript);
    
    // ============================================
    // PASO 4: Guardar en Supabase
    // ============================================
    
    await saveToSupabase(callId, userId, transcript, analysis);
    
    // ============================================
    // PASO 5: Anonimizar y enviar a Weaviate
    // ============================================
    
    await saveToWeaviate(transcript, analysis, userId);
    
    // ============================================
    // PASO 6: Limpiar archivo del bucket active (opcional)
    // ============================================
    
    // await deleteFromActiveBucket(bucket, key);
    
    console.log(`Successfully processed call ${callId}`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        callId,
        userId,
        analysis: analysis.summary
      })
    };
    
  } catch (error) {
    console.error('Lambda error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message
      })
    };
  }
};

// ============================================
// PASO 1: COPIAR A BUCKET LEGAL
// ============================================

async function copyToLegalBucket(sourceBucket, sourceKey, userId, callId) {
  const destinationKey = `recordings/${userId}/${callId}/audio-legal.wav`;
  
  console.log(`Copying to legal bucket: ${destinationKey}`);
  
  await s3.copyObject({
    Bucket: S3_BUCKET_LEGAL,
    CopySource: `${sourceBucket}/${sourceKey}`,
    Key: destinationKey,
    MetadataDirective: 'REPLACE',
    Metadata: {
      'user-id': userId,
      'call-id': callId,
      'legal-copy': 'true',
      'retention-days': '365',
      'copied-at': new Date().toISOString()
    }
  }).promise();
  
  console.log('Copied to legal bucket');
}

// ============================================
// PASO 2: TRANSCRIBIR AUDIO
// ============================================

async function transcribeAudio(bucket, key, callId) {
  const jobName = `lupita-${callId}-${Date.now()}`;
  const mediaUri = `s3://${bucket}/${key}`;
  
  console.log(`Starting transcription job: ${jobName}`);
  
  // Iniciar job de transcripción
  await transcribe.startTranscriptionJob({
    TranscriptionJobName: jobName,
    LanguageCode: 'es-MX', // Español mexicano
    MediaFormat: key.endsWith('.mp3') ? 'mp3' : 'wav',
    Media: {
      MediaFileUri: mediaUri
    },
    OutputBucketName: bucket,
    OutputKey: key.replace(/audio-full\.(wav|mp3)$/, 'transcript.json'),
    Settings: {
      ShowSpeakerLabels: true,
      MaxSpeakerLabels: 2, // Lupita + Usuario
      ShowAlternatives: false
    }
  }).promise();
  
  // Esperar a que termine (polling)
  let job;
  let attempts = 0;
  const maxAttempts = 60; // 5 minutos máximo
  
  do {
    await sleep(5000); // Esperar 5 segundos
    
    const response = await transcribe.getTranscriptionJob({
      TranscriptionJobName: jobName
    }).promise();
    
    job = response.TranscriptionJob;
    attempts++;
    
    console.log(`Transcription status: ${job.TranscriptionJobStatus} (attempt ${attempts})`);
    
  } while (
    job.TranscriptionJobStatus === 'IN_PROGRESS' && 
    attempts < maxAttempts
  );
  
  if (job.TranscriptionJobStatus !== 'COMPLETED') {
    throw new Error(`Transcription failed: ${job.TranscriptionJobStatus}`);
  }
  
  // Obtener transcripción del resultado
  const transcriptUri = job.Transcript.TranscriptFileUri;
  const transcriptResponse = await axios.get(transcriptUri);
  const transcriptData = transcriptResponse.data;
  
  // Extraer texto
  const transcript = transcriptData.results.transcripts[0].transcript;
  
  console.log(`Transcription complete: ${transcript.substring(0, 100)}...`);
  
  return transcript;
}

// ============================================
// PASO 3: ANALIZAR TRANSCRIPCIÓN
// ============================================

function analyzeTranscript(transcript) {
  const lowerTranscript = transcript.toLowerCase();
  
  // Detectar códigos de comportamiento
  const behavioralCodes = detectBehavioralCodes(lowerTranscript);
  
  // Detectar estado emocional
  const emotionalState = detectEmotionalState(lowerTranscript);
  
  // Extraer temas
  const topics = extractTopics(lowerTranscript);
  
  // Detectar menciones de salud
  const healthMentions = extractHealthMentions(transcript);
  
  // Detectar menciones de familia
  const familyMentions = extractFamilyMentions(transcript);
  
  // Detectar si necesita seguimiento
  const followUpNeeded = determineFollowUp(behavioralCodes, emotionalState);
  
  // Detectar crisis
  const crisisDetected = detectCrisis(lowerTranscript);
  
  return {
    behavioralCodes,
    emotionalState,
    topics,
    healthMentions,
    familyMentions,
    followUpNeeded,
    crisisDetected,
    summary: generateSummary(behavioralCodes, emotionalState, topics)
  };
}

// ============================================
// BEHAVIORAL CODES (Los 16 códigos)
// ============================================

function detectBehavioralCodes(text) {
  const codes = [];
  
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
    if (words.some(word => text.includes(word))) {
      codes.push(code);
    }
  }
  
  return codes;
}

function detectEmotionalState(text) {
  const emotions = {
    'muy_positivo': ['feliz', 'contento', 'alegre', 'maravilloso', 'excelente'],
    'positivo': ['bien', 'bueno', 'gracias', 'bonito', 'tranquilo'],
    'neutral': ['normal', 'igual', 'ahí', 'más o menos'],
    'negativo': ['mal', 'triste', 'preocupado', 'difícil', 'cansado'],
    'muy_negativo': ['terrible', 'horrible', 'llorar', 'solo', 'deprimido']
  };
  
  for (const [state, words] of Object.entries(emotions)) {
    if (words.some(word => text.includes(word))) {
      return state;
    }
  }
  
  return 'neutral';
}

function extractTopics(text) {
  const topics = [];
  
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
    if (keywords.some(kw => text.includes(kw))) {
      topics.push(topic);
    }
  }
  
  return topics;
}

function extractHealthMentions(text) {
  const mentions = [];
  const keywords = ['dolor', 'medicina', 'pastilla', 'doctor', 'hospital', 'enfermo', 'síntoma', 'presión', 'azúcar', 'diabetes'];
  
  const sentences = text.split(/[.!?]+/);
  
  for (const sentence of sentences) {
    if (keywords.some(kw => sentence.toLowerCase().includes(kw))) {
      mentions.push(sentence.trim());
    }
  }
  
  return mentions.slice(0, 5);
}

function extractFamilyMentions(text) {
  const mentions = [];
  const keywords = ['hijo', 'hija', 'nieto', 'nieta', 'esposo', 'esposa', 'hermano', 'hermana', 'mamá', 'papá'];
  
  const sentences = text.split(/[.!?]+/);
  
  for (const sentence of sentences) {
    if (keywords.some(kw => sentence.toLowerCase().includes(kw))) {
      mentions.push(sentence.trim());
    }
  }
  
  return mentions.slice(0, 5);
}

function determineFollowUp(codes, emotionalState) {
  const urgentCodes = ['SOL', 'SAL', 'EMO', 'PRE'];
  const hasUrgentCode = codes.some(code => urgentCodes.includes(code));
  const isNegative = ['negativo', 'muy_negativo'].includes(emotionalState);
  
  return hasUrgentCode || isNegative;
}

function detectCrisis(text) {
  const crisisKeywords = [
    'me quiero morir',
    'no quiero vivir',
    'suicid',
    'acabar con todo',
    'ya no puedo más',
    'emergencia',
    'ambulancia'
  ];
  
  return crisisKeywords.some(kw => text.includes(kw));
}

function generateSummary(codes, emotional, topics) {
  const parts = [];
  
  if (emotional) {
    parts.push(`Estado emocional: ${emotional}`);
  }
  
  if (codes.length > 0) {
    parts.push(`Códigos: ${codes.join(', ')}`);
  }
  
  if (topics.length > 0) {
    parts.push(`Temas: ${topics.join(', ')}`);
  }
  
  return parts.join(' | ');
}

// ============================================
// PASO 4: GUARDAR EN SUPABASE
// ============================================

async function saveToSupabase(callId, userId, transcript, analysis) {
  console.log('Saving to Supabase...');
  
  // Actualizar registro de llamada
  await axios.patch(
    `${SUPABASE_URL}/rest/v1/lupita_calls?vapi_call_id=eq.${callId}`,
    {
      transcript: transcript,
      sentiment: analysis.emotionalState,
      topics_discussed: analysis.topics,
      behavioral_codes: analysis.behavioralCodes,
      follow_up_needed: analysis.followUpNeeded,
      updated_at: new Date().toISOString()
    },
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      }
    }
  );
  
  // Guardar insights
  await axios.post(
    `${SUPABASE_URL}/rest/v1/lupita_insights`,
    {
      call_id: callId,
      user_id: userId,
      behavioral_codes: analysis.behavioralCodes,
      emotional_state: analysis.emotionalState,
      health_mentions: analysis.healthMentions,
      family_mentions: analysis.familyMentions,
      needs_identified: [],
      action_items: [],
      crisis_detected: analysis.crisisDetected
    },
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  console.log('Saved to Supabase');
}

// ============================================
// PASO 5: GUARDAR EN WEAVIATE (ANONIMIZADO)
// ============================================

async function saveToWeaviate(transcript, analysis, userId) {
  if (!WEAVIATE_URL || !WEAVIATE_API_KEY) {
    console.log('Weaviate not configured, skipping');
    return;
  }
  
  console.log('Saving to Weaviate...');
  
  // Anonimizar transcripción
  const anonymizedContent = anonymizeText(transcript);
  
  // Anonimizar userId a grupo de edad
  const ageGroup = 'unknown'; // En producción, obtener de Supabase
  
  await axios.post(
    `${WEAVIATE_URL}/v1/objects`,
    {
      class: 'LupitaConversation',
      properties: {
        content: anonymizedContent,
        emotionalState: analysis.emotionalState,
        behavioralCodes: analysis.behavioralCodes,
        topics: analysis.topics,
        ageGroup: ageGroup,
        region: 'mexico',
        callDuration: 0,
        timestamp: new Date().toISOString()
      }
    },
    {
      headers: {
        'Authorization': `Bearer ${WEAVIATE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  console.log('Saved to Weaviate');
}

function anonymizeText(text) {
  return text
    .replace(/\b[A-Z][a-záéíóú]+\b/g, '[NOMBRE]')
    .replace(/\d{10}/g, '[TELEFONO]')
    .replace(/\d+\s*(años|año)/gi, '[EDAD] años')
    .replace(/calle\s+[^,]+/gi, '[DIRECCION]');
}

// ============================================
// HELPERS
// ============================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function deleteFromActiveBucket(bucket, key) {
  console.log(`Deleting from active bucket: ${key}`);
  
  await s3.deleteObject({
    Bucket: bucket,
    Key: key
  }).promise();
  
  console.log('Deleted from active bucket');
}