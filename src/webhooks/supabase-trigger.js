// ============================================
// SUPABASE TRIGGER WEBHOOK - LUPITA AI
// Recibe notificación cuando hay nuevo usuario
// ============================================

const express = require('express');
const router = express.Router();
const { scheduleCall } = require('../services/call-scheduler');
const { buildFullContext } = require('../services/context-builder');

// Secret para validar que viene de Supabase
const WEBHOOK_SECRET = process.env.SUPABASE_WEBHOOK_SECRET || 'your-secret-here';

// ============================================
// MIDDLEWARE DE AUTENTICACIÓN
// ============================================

function validateWebhook(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('Webhook request without authorization');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.split(' ')[1];
  
  if (token !== WEBHOOK_SECRET) {
    console.warn('Webhook request with invalid token');
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  next();
}

// ============================================
// ENDPOINTS
// ============================================

/**
 * POST /webhooks/supabase/new-user
 * Recibe notificación de nuevo registro en registros_familia_mx
 */
router.post('/new-user', validateWebhook, async (req, res) => {
  console.log('New user webhook received');
  
  try {
    const {
      user_id,
      user_name,
      user_phone,
      migrant_name,
      companion,
      registered_at
    } = req.body;
    
    // Validar datos requeridos
    if (!user_id || !user_phone) {
      return res.status(400).json({
        error: 'Missing required fields: user_id, user_phone'
      });
    }
    
    console.log(`New user registered: ${user_id} - ${user_name}`);
    
    // Programar llamada para 2 horas después
    const scheduledCall = await scheduleCall({
      userId: user_id,
      userName: user_name,
      phone: user_phone,
      migrantName: migrant_name,
      companion: companion || 'Lupita',
      registeredAt: registered_at || new Date().toISOString()
    }, 120); // 120 minutos = 2 horas
    
    if (scheduledCall) {
      console.log(`Call scheduled for user ${user_id} at ${scheduledCall.scheduledFor}`);
      
      return res.status(200).json({
        success: true,
        message: 'Call scheduled',
        callId: scheduledCall.id,
        scheduledFor: scheduledCall.scheduledFor
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Failed to schedule call'
      });
    }
    
  } catch (error) {
    console.error('Error processing new user webhook:', error);
    
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /webhooks/supabase/user-updated
 * Recibe notificación cuando se actualiza un usuario
 */
router.post('/user-updated', validateWebhook, async (req, res) => {
  console.log('User updated webhook received');
  
  try {
    const { user_id, updated_fields } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ error: 'Missing user_id' });
    }
    
    console.log(`User ${user_id} updated:`, updated_fields);
    
    // Por ahora solo logueamos, en el futuro podemos:
    // - Actualizar contexto cacheado
    // - Reprogramar llamadas si cambió el teléfono
    // - Notificar cambios importantes
    
    return res.status(200).json({
      success: true,
      message: 'Update received'
    });
    
  } catch (error) {
    console.error('Error processing user update webhook:', error);
    
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * POST /webhooks/supabase/subscription-cancelled
 * Recibe notificación cuando se cancela suscripción
 */
router.post('/subscription-cancelled', validateWebhook, async (req, res) => {
  console.log('Subscription cancelled webhook received');
  
  try {
    const { user_id, cancelled_at, reason } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ error: 'Missing user_id' });
    }
    
    console.log(`Subscription cancelled for user ${user_id}: ${reason}`);
    
    // TODO: Cancelar llamadas programadas para este usuario
    // TODO: Enviar llamada de despedida?
    
    return res.status(200).json({
      success: true,
      message: 'Cancellation processed'
    });
    
  } catch (error) {
    console.error('Error processing cancellation webhook:', error);
    
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

/**
 * GET /webhooks/supabase/health
 * Health check para el webhook
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'supabase-webhook',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;