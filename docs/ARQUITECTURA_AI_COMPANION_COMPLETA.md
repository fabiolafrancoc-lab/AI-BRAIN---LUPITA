# 🧠 ARQUITECTURA COMPLETA: AI COMPANION LUPITA

**Fecha:** 24 Enero 2026  
**Estado:** Revisión de integración completa

---

## 📋 RESUMEN EJECUTIVO

Este documento analiza la arquitectura del AI Companion "Lupita" y verifica si todos los componentes están conectados e integrados correctamente.

### ✅ COMPONENTES CONFIGURADOS

| Componente | Estado | API Key | Integrado |
|-----------|--------|---------|-----------|
| **TELNYX** | ✅ Configurado | ✅ Sí | ✅ Con VAPI |
| **VAPI.ai** | ✅ Configurado | ✅ Sí | ✅ Orquestador central |
| **Claude 3.5 Sonnet** | ✅ Configurado | ⏳ Pendiente | ✅ Via VAPI + Backend |
| **OpenAI GPT-4** | ⚠️ Instalado | ⏳ Pendiente | ❌ NO usado actualmente |
| **ElevenLabs** | ✅ Via VAPI | ⚪ No necesaria | ✅ Via VAPI |
| **Supabase** | ✅ Configurado | ✅ Sí | ✅ 5 tablas AI |
| **Weaviate** | ✅ Configurado | ✅ Sí | ⚠️ Parcial |
| **AWS S3** | ❌ NO configurado | ❌ No | ❌ NO integrado |

---

## 🔄 FLUJO COMPLETO ACTUAL

### 1️⃣ FLUJO DE LLAMADA (Lo que SÍ está funcionando)

```
┌─────────────────────────────────────────────────────────────┐
│                    LLAMADA ENTRANTE                         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  TELNYX (+52 559 990 6900)                                  │
│  • Recibe llamada telefónica                                │
│  • Provider de telefonía                                    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  VAPI.AI (Orquestador)                                      │
│  • Speech-to-Text (voz → texto)                             │
│  • Envía texto a Claude                                     │
│  • Recibe respuesta de Claude                               │
│  • Text-to-Speech con ElevenLabs (texto → voz)              │
│  • Graba la llamada                                         │
│  • Genera transcripción                                     │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  CLAUDE 3.5 SONNET (AI Conversacional)                      │
│  • Procesa contexto de la conversación                      │
│  • Genera respuestas empáticas                              │
│  • Detecta emociones                                        │
│  • Mantiene memoria de conversación (corta)                 │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  VAPI WEBHOOK (/api/vapi-webhook.js)                        │
│  • call-start: Marca inicio de llamada                      │
│  • call-end: Recibe transcripción completa                  │
│  • recording_url: URL de la grabación en VAPI               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  SUPABASE (Base de Datos)                                   │
│  ✅ call_transcripts                                        │
│  ✅ companion_calls                                         │
│  ✅ call_recordings                                         │
│  • Guarda metadata + transcripción                          │
│  • recording_url almacenado (VAPI storage)                  │
└─────────────────────────────────────────────────────────────┘
```

**✅ Estado:** FUNCIONAL (excepto análisis post-llamada con Claude)

---

## ⚠️ GAPS IDENTIFICADOS

### 1. **Grabaciones en AWS S3 (NO IMPLEMENTADO)**

**Estado Actual:**
- ❌ NO hay integración con AWS S3
- ❌ NO hay bucket configurado
- ❌ NO hay credenciales AWS en .env

**Lo que se guarda actualmente:**
- ✅ Grabaciones se quedan en **VAPI Storage** (storage.vapi.ai)
- ✅ URL guardada en `recording_url` en Supabase
- ⚠️ Dependencia total de VAPI para acceso a audio

**Problema:**
- 🚨 **Razones legales:** Necesitas tener control total de las grabaciones
- 🚨 **Retención:** VAPI puede borrar grabaciones después de cierto tiempo
- 🚨 **Compliance:** Para HIPAA/datos de salud necesitas storage propio

**Solución requerida:**
```javascript
// Agregar a /api/vapi-webhook.js después de call-end
async function downloadAndStoreInAWS(vapiRecordingUrl, callId) {
  // 1. Descargar audio de VAPI
  const audioResponse = await fetch(vapiRecordingUrl);
  const audioBuffer = await audioResponse.arrayBuffer();
  
  // 2. Subir a AWS S3
  const s3Params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: `recordings/${callId}.opus`,
    Body: audioBuffer,
    ContentType: 'audio/opus'
  };
  
  const s3Result = await s3Client.send(new PutObjectCommand(s3Params));
  
  // 3. Actualizar Supabase con URL de S3
  const s3Url = `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/recordings/${callId}.opus`;
  
  await supabase
    .from('companion_calls')
    .update({ 
      aws_recording_url: s3Url,
      recording_backed_up: true 
    })
    .eq('vapi_call_id', callId);
    
  return s3Url;
}
```

**Variables necesarias:**
```bash
# AWS Configuration (NO CONFIGURADO ACTUALMENTE)
AWS_ACCESS_KEY_ID=tu_access_key
AWS_SECRET_ACCESS_KEY=tu_secret_key
AWS_S3_BUCKET=saludcompartida-call-recordings
AWS_REGION=us-east-1
```

---

### 2. **Weaviate (Vector DB) - PARCIALMENTE IMPLEMENTADO**

**Estado Actual:**
- ✅ Credenciales configuradas
- ✅ Cliente creado: `src/lib/weaviate-client.js` (441 líneas)
- ✅ Schemas definidos
- ⚠️ **NO se está usando activamente**

**Lo que existe:**
```javascript
// src/lib/weaviate-client.js tiene estas funciones:
class WeaviateAI {
  async storeConversation(conversationData) // Guardar transcripción
  async searchSimilarConversations(query) // Buscar conversaciones similares
  async storeMemory(memoryData) // Guardar memoria largo plazo
  async recallMemories(userId, context) // Recuperar memorias relevantes
  async updateCompanionProfile(profile) // Actualizar perfil de usuario
  async getCompanionContext(userId) // Obtener contexto para conversación
  async checkHealth() // Health check
}
```

**Lo que falta:**
```javascript
// En /api/vapi-webhook.js - agregar después de guardar en Supabase:

// Guardar en Weaviate para aprendizaje grupal
const weaviate = getWeaviateClient();
await weaviate.storeConversation({
  userId: registration.user_id,
  transcript: transcriptText,
  sentiment: analysis.sentiment,
  topics: analysis.topics,
  emotions: analysis.emotions,
  callType: 'voice',
  date: new Date().toISOString(),
  metadata: {
    duration: call.duration,
    vapiCallId: call.id
  }
});

// Buscar conversaciones similares previas
const similarCalls = await weaviate.searchSimilarConversations(
  transcriptText, 
  { limit: 3 }
);
```

**Propósito de Weaviate:**
- 📚 **Aprendizaje grupal:** Patrones de conversación que funcionan
- 🔍 **Búsqueda semántica:** Encontrar casos similares
- 💡 **Mejores prácticas:** Qué técnicas retienen mejor a usuarios
- 🎯 **Personalización:** Adaptar conversaciones basado en historiales

---

### 3. **Memoria de Últimas 4 Llamadas - PARCIALMENTE IMPLEMENTADO**

**Tablas existentes:**
```sql
-- ✅ EXISTE: companion_calls
-- Guarda metadata de cada llamada (duración, tipo, sentiment)

-- ✅ EXISTE: call_transcripts  
-- Guarda transcripciones completas

-- ✅ EXISTE: companion_memory
-- Para memoria largo plazo (preferencias, contexto personal)
```

**Lo que falta:**
```javascript
// Función para recuperar últimas N llamadas y pasarlas a VAPI/Claude

async function getLast4Calls(userId) {
  const { data: lastCalls } = await supabase
    .from('call_transcripts')
    .select('transcript_text, sentiment, created_at, summary')
    .eq('phone_number', userPhone)
    .order('created_at', { ascending: false })
    .limit(4);
    
  // Formatear para contexto de Claude
  const conversationHistory = lastCalls.map(call => ({
    date: call.created_at,
    summary: call.summary,
    mood: call.sentiment,
    transcript: call.transcript_text.slice(0, 500) // Primeros 500 chars
  }));
  
  return conversationHistory;
}

// Usar en VAPI Assistant configuration:
const assistantContext = `
Historial de llamadas previas:
${conversationHistory.map((c, i) => `
Llamada ${i+1} (${c.date}):
Resumen: ${c.summary}
Estado emocional: ${c.mood}
`).join('\n')}
`;
```

**Configuración en VAPI Dashboard:**
- Ir a: https://dashboard.vapi.ai/assistants
- Editar Assistant "Lupita"
- En "System Prompt" agregar llamada a función que recupere últimas 4 llamadas
- O usar VAPI's Knowledge Base feature

---

### 4. **Claude para Análisis Post-Llamada - NO CONECTADO**

**Estado Actual:**
- ✅ `src/lib/claude-client.js` existe (251 líneas, 6 funciones)
- ✅ Funciones disponibles: `analyzeConversation()`, `detectEmotion()`, etc.
- ❌ **NO se llama desde /api/vapi-webhook.js**

**Lo que falta:**
```javascript
// En /api/vapi-webhook.js - handleCallEnd()

import { analyzeConversation } from '../src/lib/claude-client.js';

// Después de guardar transcripción, agregar análisis:
const claudeAnalysis = await analyzeConversation(transcriptText);

// claudeAnalysis retorna:
// {
//   sentiment: 'positive',
//   emotions: ['esperanza', 'gratitud', 'ansiedad leve'],
//   topics: ['salud mental', 'familia', 'medicación'],
//   urgency: 'medium',
//   summary: 'Usuario expresó...',
//   actionItems: ['Seguimiento en 3 días', 'Recordatorio medicación'],
//   flags: [] // ['crisis', 'suicidio'] si detecta
// }

// Guardar análisis en Supabase
await supabase
  .from('call_transcripts')
  .update({
    claude_sentiment: claudeAnalysis.sentiment,
    claude_emotions: claudeAnalysis.emotions,
    claude_topics: claudeAnalysis.topics,
    urgency_level: claudeAnalysis.urgency,
    ai_summary: claudeAnalysis.summary,
    action_items: claudeAnalysis.actionItems,
    alert_flags: claudeAnalysis.flags
  })
  .eq('vapi_call_id', call.id);

// Si hay flags críticos, enviar alerta
if (claudeAnalysis.flags.includes('crisis')) {
  await sendCrisisAlert(registration.user_id, claudeAnalysis);
}
```

---

### 5. **OpenAI GPT-4 - NO SE USA**

**Estado Actual:**
- ✅ SDK instalado (`openai` package)
- ❌ NO se usa en el sistema de voz actual
- ❌ NO hay OPENAI_API_KEY configurada

**Rol previsto (según docs viejas):**
- Era para WhatsApp AI Companion (descartado)
- Era para transcripción (Whisper) - ahora VAPI lo hace
- Era para análisis - ahora Claude lo hace

**Recomendación:**
- ⚪ NO necesario actualmente
- ✅ Claude via VAPI es suficiente
- 💰 Ahorro de costos al no usar GPT-4

---

## 📊 TABLAS DE SUPABASE (Estado Actual)

### Tablas AI Configuradas:

#### 1. `ai_companions` ✅
```sql
-- Perfiles de usuarios y configuración VAPI
CREATE TABLE ai_companions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  personality_type VARCHAR(50),
  voice_id VARCHAR(100),
  vapi_assistant_id VARCHAR(100),
  elevenlabs_voice_id VARCHAR(100),
  is_active BOOLEAN,
  preferences JSONB
);
```

#### 2. `companion_memory` ✅
```sql
-- Memoria largo plazo (preferencias, contexto personal)
CREATE TABLE companion_memory (
  id UUID PRIMARY KEY,
  companion_id UUID REFERENCES ai_companions(id),
  memory_type VARCHAR(50), -- 'preference', 'fact', 'experience'
  topic VARCHAR(100),
  content TEXT,
  importance_score INTEGER,
  expires_at TIMESTAMPTZ,
  metadata JSONB
);
```

#### 3. `companion_conversations` / `call_transcripts` ✅
```sql
-- Historial completo de llamadas
CREATE TABLE call_transcripts (
  id UUID PRIMARY KEY,
  vapi_call_id VARCHAR(255),
  phone_number VARCHAR(20),
  access_code VARCHAR(12),
  transcript_text TEXT,
  recording_url TEXT,
  duration_seconds INTEGER,
  sentiment VARCHAR(20),
  behavioral_codes JSONB,
  -- Columnas para análisis Claude (FALTAN):
  claude_sentiment VARCHAR(20),
  claude_emotions TEXT[],
  claude_topics TEXT[],
  urgency_level VARCHAR(20),
  ai_summary TEXT,
  action_items TEXT[],
  alert_flags TEXT[]
);
```

#### 4. `companion_calls` ✅
```sql
-- Metadata de llamadas (scheduling, status)
CREATE TABLE companion_calls (
  id UUID PRIMARY KEY,
  beneficiary_id UUID,
  vapi_call_id VARCHAR(255),
  telnyx_call_id VARCHAR(255),
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  call_type VARCHAR(30),
  status VARCHAR(30),
  sentiment_detected VARCHAR(20),
  transcript_url TEXT,
  transcript_text TEXT,
  -- FALTA:
  aws_recording_url TEXT,
  recording_backed_up BOOLEAN,
  weaviate_id VARCHAR(255),
  embeddings_stored BOOLEAN
);
```

#### 5. `call_recordings` ✅
```sql
-- Sistema de grabaciones para training
CREATE TABLE call_recordings (
  id UUID PRIMARY KEY,
  user_id UUID,
  agent_id UUID,
  recording_url TEXT, -- VAPI URL
  duration_seconds INTEGER,
  call_type VARCHAR(30),
  call_outcome VARCHAR(30),
  transcription_text TEXT,
  transcription_segments JSONB,
  analysis_summary JSONB,
  emotional_tone VARCHAR(50),
  quality_rating DECIMAL(3,2),
  is_training_example BOOLEAN,
  tags TEXT[]
);
```

---

## 🎯 ACCIONES REQUERIDAS

### CRÍTICAS (Para compliance legal)

#### 1. **Implementar AWS S3 Storage** 🔴
```bash
# Crear bucket S3
aws s3 mb s3://saludcompartida-call-recordings --region us-east-1

# Configurar lifecycle policy (retención 7 años)
aws s3api put-bucket-lifecycle-configuration \
  --bucket saludcompartida-call-recordings \
  --lifecycle-configuration file://lifecycle.json

# Habilitar encriptación
aws s3api put-bucket-encryption \
  --bucket saludcompartida-call-recordings \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

**Variables .env:**
```bash
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=saludcompartida-call-recordings
AWS_REGION=us-east-1
```

**Modificar webhook:**
```javascript
// En /api/vapi-webhook.js - handleCallEnd()
const awsUrl = await downloadAndStoreInAWS(recording.url, call.id);
```

#### 2. **Obtener ANTHROPIC_API_KEY** 🔴
```bash
# Ir a: https://console.anthropic.com/settings/keys
# Crear key: "SaludCompartida-Production"
# Agregar a .env y Vercel:
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### IMPORTANTES (Para funcionalidad completa)

#### 3. **Conectar Claude Post-Análisis** 🟡
- Modificar `/api/vapi-webhook.js`
- Importar `analyzeConversation` de `claude-client.js`
- Llamar después de guardar transcripción
- Guardar resultados en columnas dedicadas

#### 4. **Activar Weaviate** 🟡
- Importar `weaviate-client.js` en webhook
- Guardar cada transcripción en Weaviate
- Usar para búsqueda de patrones
- Implementar aprendizaje grupal

#### 5. **Implementar Memoria 4 Llamadas** 🟡
- Crear función `getLast4Calls(phoneNumber)`
- Integrar con VAPI context o Knowledge Base
- Actualizar system prompt de Lupita con historial

### OPCIONALES (Mejoras futuras)

#### 6. **Agregar columnas faltantes a Supabase** 🟢
```sql
-- Agregar a call_transcripts
ALTER TABLE call_transcripts ADD COLUMN claude_sentiment VARCHAR(20);
ALTER TABLE call_transcripts ADD COLUMN claude_emotions TEXT[];
ALTER TABLE call_transcripts ADD COLUMN claude_topics TEXT[];
ALTER TABLE call_transcripts ADD COLUMN urgency_level VARCHAR(20);
ALTER TABLE call_transcripts ADD COLUMN ai_summary TEXT;
ALTER TABLE call_transcripts ADD COLUMN action_items TEXT[];
ALTER TABLE call_transcripts ADD COLUMN alert_flags TEXT[];

-- Agregar a companion_calls
ALTER TABLE companion_calls ADD COLUMN aws_recording_url TEXT;
ALTER TABLE companion_calls ADD COLUMN recording_backed_up BOOLEAN DEFAULT false;
ALTER TABLE companion_calls ADD COLUMN weaviate_id VARCHAR(255);
ALTER TABLE companion_calls ADD COLUMN embeddings_stored BOOLEAN DEFAULT false;
```

---

## 📝 CHECKLIST DE INTEGRACIÓN

### Sistema de Voz (Core) ✅
- [x] TELNYX configurado
- [x] VAPI.ai configurado
- [x] Claude en VAPI (sin API key propia)
- [x] ElevenLabs via VAPI
- [x] Webhook recibiendo llamadas
- [x] Supabase guardando transcripciones

### Almacenamiento Legal ❌
- [ ] AWS S3 configurado
- [ ] Credenciales AWS en .env
- [ ] Bucket creado con encriptación
- [ ] Lifecycle policy (7 años)
- [ ] Webhook descargando y subiendo a S3
- [ ] URLs de S3 en Supabase

### Inteligencia y Análisis ⚠️
- [x] Claude client implementado
- [ ] Claude API key obtenida
- [ ] Análisis post-llamada activo
- [ ] Detección de urgencias
- [ ] Alertas de crisis funcionando

### Memoria y Aprendizaje ⚠️
- [x] Weaviate configurado
- [x] Cliente implementado
- [ ] Guardando conversaciones en Weaviate
- [ ] Búsqueda semántica activa
- [ ] Recuperación de últimas 4 llamadas
- [ ] Contexto histórico en VAPI

### Bases de Datos ✅
- [x] 5 tablas AI creadas
- [ ] Columnas de análisis Claude agregadas
- [ ] Columnas AWS/Weaviate agregadas
- [x] Índices optimizados
- [x] RLS habilitado

---

## 💰 COSTOS ESTIMADOS

| Servicio | Plan Actual | Costo Mensual | Notas |
|----------|-------------|---------------|-------|
| TELNYX | Pay-as-you-go | ~$20 | $0.01/min |
| VAPI.ai | Starter | ~$50-100 | Incluye STT/TTS |
| Claude API | Pay-as-you-go | ~$30 | Post-análisis |
| Weaviate | Sandbox | $0 | Gratis hasta 10M vectores |
| AWS S3 | Standard | ~$5-10 | Storage + transfers |
| Supabase | Pro | $25 | Plan actual |
| **TOTAL** | | **~$130-185/mes** | 100-200 llamadas/mes |

---

## 🚀 ROADMAP DE IMPLEMENTACIÓN

### Fase 1: Compliance Legal (1-2 días) 🔴
1. Crear cuenta AWS
2. Configurar S3 bucket con encriptación
3. Implementar descarga + upload en webhook
4. Probar con llamada de prueba
5. Verificar grabación en S3

### Fase 2: Análisis Inteligente (1 día) 🟡
1. Obtener ANTHROPIC_API_KEY
2. Integrar `analyzeConversation` en webhook
3. Agregar columnas a Supabase
4. Probar detección de urgencias
5. Configurar alertas de crisis

### Fase 3: Memoria y Contexto (2 días) 🟡
1. Implementar `getLast4Calls()`
2. Activar Weaviate en webhook
3. Configurar contexto en VAPI Assistant
4. Probar memoria entre llamadas
5. Validar personalización

### Fase 4: Optimización (ongoing) 🟢
1. Monitorear costos
2. A/B testing de prompts
3. Fine-tuning de Claude
4. Análisis de patrones en Weaviate
5. Mejoras de UX

---

## 📞 SOPORTE Y DOCUMENTACIÓN

### VAPI.ai
- Dashboard: https://dashboard.vapi.ai/
- Docs: https://docs.vapi.ai/
- Webhooks: https://docs.vapi.ai/webhooks

### Claude (Anthropic)
- Console: https://console.anthropic.com/
- Docs: https://docs.anthropic.com/
- API Reference: https://docs.anthropic.com/claude/reference

### Weaviate
- Console: https://console.weaviate.cloud/
- Docs: https://weaviate.io/developers/weaviate
- Python Client: https://weaviate.io/developers/weaviate/client-libraries/python

### AWS S3
- Console: https://s3.console.aws.amazon.com/
- Docs: https://docs.aws.amazon.com/s3/
- SDK: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/

---

## ✅ CONCLUSIÓN

**Sistemas Funcionando:**
- ✅ Voz (TELNYX + VAPI + Claude via VAPI + ElevenLabs)
- ✅ Transcripciones guardadas en Supabase
- ✅ Webhook recibiendo eventos

**Sistemas Parciales:**
- ⚠️ Weaviate configurado pero no usado
- ⚠️ Claude backend listo pero no conectado
- ⚠️ Memoria existe pero no se recupera

**Sistemas Faltantes:**
- ❌ AWS S3 para almacenamiento legal
- ❌ Análisis post-llamada con Claude
- ❌ Recuperación de últimas 4 llamadas
- ❌ Aprendizaje grupal en Weaviate

**Prioridad Inmediata:**
1. 🔴 AWS S3 (compliance legal)
2. 🔴 ANTHROPIC_API_KEY
3. 🟡 Conectar análisis Claude
4. 🟡 Activar Weaviate
5. 🟡 Implementar memoria 4 llamadas

**Tiempo estimado para completar:** 4-5 días de desarrollo
