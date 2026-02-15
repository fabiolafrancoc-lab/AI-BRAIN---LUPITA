// ============================================
// LUPITA AI - MAIN SERVER
// SaludCompartida AI Companion System
// ============================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Webhooks
const supabaseWebhook = require('./webhooks/supabase-trigger');
const vapiWebhook = require('./webhooks/vapi-events');
const telnyxWebhook = require('./webhooks/telnyx-events');

// Services
const { getCallStats, listScheduledCalls } = require('./services/call-scheduler');
const { buildFullContext, generateLupitaBriefing } = require('./services/context-builder');

// Config health checks
const { healthCheck: telnyxHealth } = require('./config/telnyx');
const { healthCheck: awsHealth } = require('./config/aws');
const { healthCheck: weaviateHealth } = require('./config/weaviate');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================

app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ============================================
// WEBHOOKS
// ============================================

app.use('/webhooks/supabase', supabaseWebhook);
app.use('/webhooks/vapi', vapiWebhook);
app.use('/webhooks/telnyx', telnyxWebhook);

// ============================================
// API ENDPOINTS
// ============================================

/**
 * GET /
 * Información básica del servidor
 */
app.get('/', (req, res) => {
  res.json({
    name: 'Lupita AI',
    description: 'SaludCompartida AI Companion System',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      webhooks: {
        supabase: '/webhooks/supabase/new-user',
        vapi: '/webhooks/vapi',
        telnyx: '/webhooks/telnyx'
      },
      api: {
        stats: '/api/stats',
        calls: '/api/calls',
        context: '/api/context/:userId'
      }
    }
  });
});

/**
 * GET /health
 * Health check completo de todos los servicios
 */
app.get('/health', async (req, res) => {
  try {
    const [telnyx, aws, weaviate] = await Promise.all([
      telnyxHealth().catch(e => ({ status: 'error', error: e.message })),
      awsHealth().catch(e => ({ status: 'error', error: e.message })),
      weaviateHealth().catch(e => ({ status: 'error', error: e.message }))
    ]);
    
    const allHealthy = [telnyx, aws, weaviate].every(
      s => s.status === 'healthy' || s.status === 'disabled'
    );
    
    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        telnyx,
        aws,
        weaviate
      }
    });
    
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/stats
 * Estadísticas de llamadas
 */
app.get('/api/stats', (req, res) => {
  const stats = getCallStats();
  
  res.json({
    success: true,
    data: stats,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/calls
 * Lista llamadas programadas
 */
app.get('/api/calls', (req, res) => {
  const calls = listScheduledCalls();
  
  res.json({
    success: true,
    count: calls.length,
    data: calls,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/context/:userId
 * Obtiene contexto completo de un usuario
 */
app.get('/api/context/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const context = await buildFullContext(parseInt(userId));
    const briefing = generateLupitaBriefing(context);
    
    res.json({
      success: true,
      data: {
        context,
        briefing
      }
    });
    
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/test-call
 * Inicia una llamada de prueba (solo desarrollo)
 */
app.post('/api/test-call', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not allowed in production' });
  }
  
  try {
    const { userId, phone } = req.body;
    
    if (!userId || !phone) {
      return res.status(400).json({ error: 'Missing userId or phone' });
    }
    
    const { scheduleCall } = require('./services/call-scheduler');
    
    // Programar llamada inmediata (0 minutos de delay)
    const scheduledCall = await scheduleCall({
      userId,
      userName: 'Test User',
      phone,
      companion: 'Lupita',
      registeredAt: new Date().toISOString()
    }, 0);
    
    res.json({
      success: true,
      message: 'Test call scheduled',
      data: scheduledCall
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log('');
  console.log('============================================');
  console.log('   🤖 LUPITA AI - SaludCompartida');
  console.log('============================================');
  console.log(`   Server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('   Webhooks:');
  console.log(`   - Supabase: /webhooks/supabase/new-user`);
  console.log(`   - VAPI:     /webhooks/vapi`);
  console.log(`   - Telnyx:   /webhooks/telnyx`);
  console.log('');
  console.log('   Health: /health');
  console.log('============================================');
  console.log('');
});

module.exports = app;