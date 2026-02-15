// ============================================
// AWS S3 CLIENT - LUPITA AI
// ============================================

const AWS = require('aws-sdk');

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const S3_BUCKET_LEGAL = process.env.S3_BUCKET_LEGAL;
const S3_BUCKET_ACTIVE = process.env.S3_BUCKET_ACTIVE;

if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
  console.warn('AWS credentials not configured - S3 storage disabled');
}

// Configurar AWS
AWS.config.update({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION
});

const s3 = new AWS.S3();

// ============================================
// FUNCIONES
// ============================================

/**
 * Guarda grabación de llamada en S3 (bucket legal - inmutable)
 */
async function saveRecordingLegal(callId, userId, audioBuffer) {
  const key = `recordings/${userId}/${callId}/audio-full.wav`;
  
  try {
    await s3.putObject({
      Bucket: S3_BUCKET_LEGAL,
      Key: key,
      Body: audioBuffer,
      ContentType: 'audio/wav',
      Metadata: {
        'call-id': callId,
        'user-id': String(userId),
        'recorded-at': new Date().toISOString()
      }
    }).promise();
    
    console.log(`Recording saved to legal bucket: ${key}`);
    return { bucket: S3_BUCKET_LEGAL, key };
  } catch (error) {
    console.error('Error saving to legal bucket:', error);
    throw error;
  }
}

/**
 * Guarda grabación en bucket activo (para procesamiento)
 */
async function saveRecordingActive(callId, userId, audioBuffer) {
  const key = `recordings/${userId}/${callId}/audio-full.wav`;
  
  try {
    await s3.putObject({
      Bucket: S3_BUCKET_ACTIVE,
      Key: key,
      Body: audioBuffer,
      ContentType: 'audio/wav',
      Metadata: {
        'call-id': callId,
        'user-id': String(userId),
        'recorded-at': new Date().toISOString()
      }
    }).promise();
    
    console.log(`Recording saved to active bucket: ${key}`);
    return { bucket: S3_BUCKET_ACTIVE, key };
  } catch (error) {
    console.error('Error saving to active bucket:', error);
    throw error;
  }
}

/**
 * Guarda transcripción en S3
 */
async function saveTranscript(callId, userId, transcript) {
  const key = `transcripts/${userId}/${callId}/transcript.json`;
  
  try {
    await s3.putObject({
      Bucket: S3_BUCKET_ACTIVE,
      Key: key,
      Body: JSON.stringify(transcript, null, 2),
      ContentType: 'application/json'
    }).promise();
    
    console.log(`Transcript saved: ${key}`);
    return { bucket: S3_BUCKET_ACTIVE, key };
  } catch (error) {
    console.error('Error saving transcript:', error);
    throw error;
  }
}

/**
 * Guarda insights anonimizados
 */
async function saveAnonymizedInsights(callId, insights) {
  const key = `insights/anonymized/${callId}.json`;
  
  try {
    await s3.putObject({
      Bucket: S3_BUCKET_ACTIVE,
      Key: key,
      Body: JSON.stringify(insights, null, 2),
      ContentType: 'application/json'
    }).promise();
    
    console.log(`Anonymized insights saved: ${key}`);
    return { bucket: S3_BUCKET_ACTIVE, key };
  } catch (error) {
    console.error('Error saving insights:', error);
    throw error;
  }
}

/**
 * Obtiene una grabación de S3
 */
async function getRecording(bucket, key) {
  try {
    const result = await s3.getObject({
      Bucket: bucket,
      Key: key
    }).promise();
    
    return result.Body;
  } catch (error) {
    console.error('Error getting recording:', error);
    return null;
  }
}

/**
 * Lista grabaciones de un usuario
 */
async function listUserRecordings(userId) {
  try {
    const result = await s3.listObjectsV2({
      Bucket: S3_BUCKET_LEGAL,
      Prefix: `recordings/${userId}/`
    }).promise();
    
    return result.Contents || [];
  } catch (error) {
    console.error('Error listing recordings:', error);
    return [];
  }
}

/**
 * Genera URL temporal para acceder a grabación
 */
function getSignedUrl(bucket, key, expiresIn = 3600) {
  return s3.getSignedUrl('getObject', {
    Bucket: bucket,
    Key: key,
    Expires: expiresIn
  });
}

/**
 * Verifica conectividad con S3
 */
async function healthCheck() {
  try {
    await s3.headBucket({ Bucket: S3_BUCKET_LEGAL }).promise();
    await s3.headBucket({ Bucket: S3_BUCKET_ACTIVE }).promise();
    
    return {
      status: 'healthy',
      buckets: {
        legal: S3_BUCKET_LEGAL,
        active: S3_BUCKET_ACTIVE
      },
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

module.exports = {
  s3,
  S3_BUCKET_LEGAL,
  S3_BUCKET_ACTIVE,
  saveRecordingLegal,
  saveRecordingActive,
  saveTranscript,
  saveAnonymizedInsights,
  getRecording,
  listUserRecordings,
  getSignedUrl,
  healthCheck
};