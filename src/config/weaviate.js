// ============================================
// WEAVIATE CLIENT - LUPITA AI
// ============================================

const weaviate = require('weaviate-ts-client');

const WEAVIATE_URL = process.env.WEAVIATE_URL;
const WEAVIATE_API_KEY = process.env.WEAVIATE_API_KEY;

if (!WEAVIATE_URL) {
  console.warn('Weaviate not configured - embeddings disabled');
}

// Cliente Weaviate
const client = WEAVIATE_URL ? weaviate.client({
  scheme: 'https',
  host: WEAVIATE_URL.replace('https://', ''),
  apiKey: new weaviate.ApiKey(WEAVIATE_API_KEY)
}) : null;

// ============================================
// SCHEMA PARA LUPITA
// ============================================

const LUPITA_SCHEMA = {
  class: 'LupitaConversation',
  description: 'Conversaciones anonimizadas de Lupita para análisis de patrones',
  vectorizer: 'text2vec-openai',
  moduleConfig: {
    'text2vec-openai': {
      model: 'ada',
      modelVersion: '002',
      type: 'text'
    }
  },
  properties: [
    {
      name: 'content',
      dataType: ['text'],
      description: 'Contenido anonimizado de la conversación'
    },
    {
      name: 'emotionalState',
      dataType: ['string'],
      description: 'Estado emocional detectado'
    },
    {
      name: 'behavioralCodes',
      dataType: ['string[]'],
      description: 'Códigos de comportamiento identificados'
    },
    {
      name: 'topics',
      dataType: ['string[]'],
      description: 'Temas discutidos'
    },
    {
      name: 'ageGroup',
      dataType: ['string'],
      description: 'Grupo de edad (anonimizado)'
    },
    {
      name: 'region',
      dataType: ['string'],
      description: 'Región geográfica (anonimizado)'
    },
    {
      name: 'callDuration',
      dataType: ['int'],
      description: 'Duración de la llamada en segundos'
    },
    {
      name: 'timestamp',
      dataType: ['date'],
      description: 'Fecha de la conversación'
    }
  ]
};

// ============================================
// FUNCIONES
// ============================================

/**
 * Crea el schema de Lupita en Weaviate
 */
async function createSchema() {
  if (!client) return null;
  
  try {
    // Verificar si ya existe
    const existing = await client.schema.classGetter()
      .withClassName('LupitaConversation')
      .do();
    
    if (existing) {
      console.log('Schema LupitaConversation already exists');
      return existing;
    }
  } catch (error) {
    // No existe, lo creamos
  }
  
  try {
    const result = await client.schema.classCreator()
      .withClass(LUPITA_SCHEMA)
      .do();
    
    console.log('Schema LupitaConversation created');
    return result;
  } catch (error) {
    console.error('Error creating schema:', error);
    throw error;
  }
}

/**
 * Guarda una conversación anonimizada para embeddings
 */
async function saveConversationEmbedding(conversation) {
  if (!client) return null;
  
  try {
    const result = await client.data.creator()
      .withClassName('LupitaConversation')
      .withProperties({
        content: conversation.content,
        emotionalState: conversation.emotionalState,
        behavioralCodes: conversation.behavioralCodes,
        topics: conversation.topics,
        ageGroup: conversation.ageGroup,
        region: conversation.region,
        callDuration: conversation.callDuration,
        timestamp: new Date().toISOString()
      })
      .do();
    
    console.log(`Embedding saved: ${result.id}`);
    return result;
  } catch (error) {
    console.error('Error saving embedding:', error);
    throw error;
  }
}

/**
 * Busca conversaciones similares (para contexto)
 */
async function searchSimilarConversations(query, limit = 5) {
  if (!client) return [];
  
  try {
    const result = await client.graphql
      .get()
      .withClassName('LupitaConversation')
      .withFields('content emotionalState behavioralCodes topics ageGroup')
      .withNearText({ concepts: [query] })
      .withLimit(limit)
      .do();
    
    return result.data?.Get?.LupitaConversation || [];
  } catch (error) {
    console.error('Error searching conversations:', error);
    return [];
  }
}

/**
 * Obtiene patrones por estado emocional
 */
async function getPatternsByEmotion(emotion, limit = 10) {
  if (!client) return [];
  
  try {
    const result = await client.graphql
      .get()
      .withClassName('LupitaConversation')
      .withFields('content behavioralCodes topics')
      .withWhere({
        path: ['emotionalState'],
        operator: 'Equal',
        valueString: emotion
      })
      .withLimit(limit)
      .do();
    
    return result.data?.Get?.LupitaConversation || [];
  } catch (error) {
    console.error('Error getting patterns:', error);
    return [];
  }
}

/**
 * Obtiene estadísticas agregadas
 */
async function getAggregateStats() {
  if (!client) return null;
  
  try {
    const result = await client.graphql
      .aggregate()
      .withClassName('LupitaConversation')
      .withFields('meta { count } callDuration { mean maximum minimum }')
      .do();
    
    return result.data?.Aggregate?.LupitaConversation?.[0] || null;
  } catch (error) {
    console.error('Error getting stats:', error);
    return null;
  }
}

/**
 * Verifica conectividad con Weaviate
 */
async function healthCheck() {
  if (!client) {
    return {
      status: 'disabled',
      message: 'Weaviate not configured',
      timestamp: new Date().toISOString()
    };
  }
  
  try {
    const meta = await client.misc.metaGetter().do();
    
    return {
      status: 'healthy',
      version: meta.version,
      modules: Object.keys(meta.modules || {}),
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
  client,
  LUPITA_SCHEMA,
  createSchema,
  saveConversationEmbedding,
  searchSimilarConversations,
  getPatternsByEmotion,
  getAggregateStats,
  healthCheck
};