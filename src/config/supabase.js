// ============================================
// SUPABASE CLIENT - LUPITA AI
// ============================================

const { createClient } = require('@supabase/supabase-js');

// Validar variables de entorno
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

// Cliente con service role (para webhooks y escritura)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================
// FUNCIONES PARA LUPITA
// ============================================

/**
 * Obtiene contexto del usuario para la llamada
 */
async function getUserContext(userId) {
  const { data, error } = await supabase
    .from('registros_familia_mx')
    .select(`
      id,
      nombre,
      apellido_paterno,
      celular,
      sexo,
      fecha_nacimiento,
      parentesco,
      migrante_nombre,
      companion_assigned,
      created_at
    `)
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user context:', error);
    return null;
  }

  return data;
}

/**
 * Obtiene historial de llamadas anteriores
 */
async function getCallHistory(userId) {
  const { data, error } = await supabase
    .from('lupita_calls')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching call history:', error);
    return [];
  }

  return data || [];
}

/**
 * Guarda registro de una llamada
 */
async function saveCallRecord(callData) {
  const { data, error } = await supabase
    .from('lupita_calls')
    .insert({
      user_id: callData.userId,
      vapi_call_id: callData.vapiCallId,
      duration_seconds: callData.duration,
      status: callData.status,
      recording_url: callData.recordingUrl,
      transcript: callData.transcript,
      sentiment: callData.sentiment,
      topics_discussed: callData.topics,
      follow_up_needed: callData.followUpNeeded,
      next_call_scheduled: callData.nextCallDate,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving call record:', error);
    return null;
  }

  return data;
}

/**
 * Guarda insights extraídos de la conversación
 */
async function saveCallInsights(insights) {
  const { data, error } = await supabase
    .from('lupita_insights')
    .insert({
      call_id: insights.callId,
      user_id: insights.userId,
      behavioral_codes: insights.behavioralCodes,
      emotional_state: insights.emotionalState,
      health_mentions: insights.healthMentions,
      family_mentions: insights.familyMentions,
      needs_identified: insights.needsIdentified,
      action_items: insights.actionItems,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving insights:', error);
    return null;
  }

  return data;
}

/**
 * Obtiene usuarios pendientes de primera llamada
 */
async function getPendingFirstCalls() {
  const { data, error } = await supabase
    .from('registros_familia_mx')
    .select('*')
    .is('first_call_completed', null)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching pending calls:', error);
    return [];
  }

  return data || [];
}

/**
 * Marca primera llamada como completada
 */
async function markFirstCallCompleted(userId) {
  const { error } = await supabase
    .from('registros_familia_mx')
    .update({ first_call_completed: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('Error marking call completed:', error);
    return false;
  }

  return true;
}

module.exports = {
  supabase,
  getUserContext,
  getCallHistory,
  saveCallRecord,
  saveCallInsights,
  getPendingFirstCalls,
  markFirstCallCompleted
};