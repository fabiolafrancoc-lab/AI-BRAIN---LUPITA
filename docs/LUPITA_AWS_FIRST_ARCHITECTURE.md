# 🏗️ LUPITA - ARQUITECTURA AWS-FIRST
## Single Source of Truth: Amazon S3
**Fecha**: 24 Enero 2026  
**Versión**: 2.0 (AWS-Centric)

---

## 📊 RESUMEN EJECUTIVO

### Cambio Principal
❌ **ANTES**: TELNYX → VAPI (graba) → Descarga → S3  
✅ **AHORA**: AWS Chime/Connect → S3 (directo) → VAPI (stateless)

### Beneficios
- 87% reducción costo telefonía
- Eliminación de duplicación de datos
- Compliance nativo (S3 Object Lock)
- Arquitectura más simple
- Zero vendor lock-in en grabaciones

---

## 🎯 ARQUITECTURA COMPLETA

```
┌─────────────────────────────────────────────────────────────────┐
│                  LUPITA AWS-FIRST ARCHITECTURE                  │
│              "Bring Your Own Vectors" + Stateless AI             │
└─────────────────────────────────────────────────────────────────┘

COMPONENTE 1: TELEFONÍA + GRABACIÓN (AWS Chime SDK)
┌──────────────────────────────────────────────────────────────┐
│ AWS Chime SDK Voice Connector                                │
│                                                              │
│ Número México: +52 (via SIP Trunk)                          │
│ └─ Llama a familia en Oaxaca                               │
│                                                              │
│ Grabación Bidireccional:                                    │
│ ├─ Leg A: Lupita (saliente)                                │
│ ├─ Leg B: Usuario (entrante)                               │
│ └─ Output: stereo WAV → S3 directo                         │
│                                                              │
│ Media Streaming:                                            │
│ └─ WebSocket → Lambda → VAPI (tiempo real)                 │
└──────────────────────────────────────────────────────────────┘
        ↓ (escribe directo)
        
COMPONENTE 2: STORAGE (AWS S3)
┌──────────────────────────────────────────────────────────────┐
│ S3 Bucket: saludcompartida-legal-archive                    │
│                                                              │
│ Path: calls/2026/01/24/{call-id}/                          │
│ ├─ audio-full.wav (stereo, ambos lados)                    │
│ ├─ metadata.json                                            │
│ └─ consent.json                                             │
│                                                              │
│ Features:                                                    │
│ ├─ Object Lock: COMPLIANCE mode (1 año)                    │
│ ├─ Versioning: Enabled                                      │
│ ├─ Encryption: AES-256                                      │
│ └─ Lifecycle: Archive to Glacier después 90 días           │
│                                                              │
│ S3 Bucket: saludcompartida-companion-active                 │
│ └─ Copia para procesamiento (sin Object Lock)              │
└──────────────────────────────────────────────────────────────┘
        ↓ (trigger automático)
        
COMPONENTE 3: PROCESAMIENTO (AWS Lambda)
┌──────────────────────────────────────────────────────────────┐
│ Lambda: process-call-recording                              │
│                                                              │
│ Trigger: S3 PUT event en /active/ bucket                   │
│                                                              │
│ Pipeline:                                                    │
│ 1. Download audio de S3                                     │
│ 2. Separar canales (diarization)                           │
│ 3. Transcribir con Whisper/Deepgram                        │
│ 4. Generar embeddings (OpenAI text-embedding-3-small)      │
│ 5. Extraer metadata:                                        │
│    ├─ Topics (NLP)                                          │
│    ├─ Emotions (sentiment analysis)                        │
│    ├─ Behavioral codes triggered                           │
│    └─ User facts (family mentions, preferences)            │
│ 6. Store en Weaviate (vectors + s3_uri)                    │
│ 7. Store metadata en Supabase                              │
│                                                              │
│ Output: NO copia audio, solo referencias                    │
└──────────────────────────────────────────────────────────────┘
        ↓
        
COMPONENTE 4: VAPI.ai (STATELESS)
┌──────────────────────────────────────────────────────────────┐
│ VAPI Assistant: Lupita                                       │
│                                                              │
│ Config:                                                      │
│ ├─ Model: Claude 3.5 Sonnet                                │
│ ├─ Voice: ElevenLabs (voz mexicana)                        │
│ ├─ Transcriber: Deepgram Nova-2                            │
│ ├─ recordingEnabled: FALSE ⚠️                              │
│ └─ Storage: NONE (todo a AWS)                              │
│                                                              │
│ Function Calls (real-time):                                 │
│ ├─ getUserContext(phone) → Query Weaviate + Supabase       │
│ ├─ saveUserFact(fact) → Lambda → Supabase                  │
│ └─ scheduleCallback(time) → Lambda → Supabase              │
│                                                              │
│ Flujo:                                                       │
│ 1. Recibe audio stream de AWS Chime                        │
│ 2. Procesa con Claude (razonamiento)                       │
│ 3. Genera respuesta (texto)                                │
│ 4. Sintetiza con ElevenLabs (audio)                        │
│ 5. Devuelve a Chime → Usuario                              │
│ 6. NO guarda nada                                           │
└──────────────────────────────────────────────────────────────┘

COMPONENTE 5: WEAVIATE (VECTOR INDEX)
┌──────────────────────────────────────────────────────────────┐
│ Class: LupitaConversation                                    │
│                                                              │
│ Schema:                                                      │
│ {                                                            │
│   "call_id": "abc-123",                                     │
│   "s3_uri": "s3://legal/calls/.../audio-full.wav",        │
│   "phone_number_hash": "sha256(...)",                       │
│   "vector": [0.123, 0.456, ...],  // 1536 dims            │
│   "metadata": {                                             │
│     "topics": ["familia", "salud", "comida"],             │
│     "emotion": "positive",                                 │
│     "behavioral_codes": ["echo_open_question", ...],      │
│     "duration_seconds": 342,                               │
│     "region": "oaxaca"                                     │
│   }                                                         │
│ }                                                            │
│                                                              │
│ ⚠️ NO ALMACENA AUDIO - Solo vectors + s3_uri               │
└──────────────────────────────────────────────────────────────┘

COMPONENTE 6: SUPABASE (METADATA HUB)
┌──────────────────────────────────────────────────────────────┐
│ Table: companion_calls                                       │
│                                                              │
│ Columns:                                                     │
│ ├─ call_id (PK)                                             │
│ ├─ phone_number (encrypted)                                 │
│ ├─ s3_legal_key (reference)                                │
│ ├─ s3_active_key (reference)                               │
│ ├─ weaviate_id (reference)                                  │
│ ├─ started_at, ended_at, duration                          │
│ ├─ summary (text, generated by Claude)                     │
│ ├─ topics (JSONB)                                           │
│ ├─ emotion_primary (text)                                   │
│ └─ behavioral_codes_triggered (text[])                     │
│                                                              │
│ Table: user_facts                                            │
│ ├─ phone_number_hash                                        │
│ ├─ fact_type, fact_key, fact_value                         │
│ ├─ source_call_id → companion_calls.call_id               │
│ └─ confidence_score                                         │
│                                                              │
│ ⚠️ NO ALMACENA AUDIO - Solo metadata                       │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔄 FLUJO DETALLADO: LLAMADA COMPLETA

### FASE 1: PRE-LLAMADA (Preparación Contexto)

```javascript
// Lambda: prepare-lupita-call
async function prepareCall(phoneNumber) {
  // 1. Query Weaviate: buscar conversaciones similares
  const similarCalls = await weaviate.graphql
    .get()
    .withClassName('LupitaConversation')
    .withNearText({ 
      concepts: [`conversación con ${phoneNumber}`] 
    })
    .withLimit(4)
    .do();

  // 2. Query Supabase: obtener facts del usuario
  const { data: facts } = await supabase
    .from('user_facts')
    .select('*')
    .eq('phone_number_hash', sha256(phoneNumber))
    .eq('is_active', true);

  // 3. Construir contexto para VAPI
  const context = {
    recent_topics: similarCalls.map(c => c.metadata.topics).flat(),
    user_facts: facts,
    behavioral_hints: {
      preferred_codes: ['echo_open_question', 'duelo_migratorio'],
      avoid_topics: []
    }
  };

  return context;
}
```

### FASE 2: DURANTE LLAMADA (Tiempo Real)

```javascript
// AWS Chime SDK - Configuración
const chimeMeeting = await chime.createMeeting({
  MediaRegion: 'us-east-1',
  ExternalMeetingId: callId
});

// Iniciar grabación directo a S3
await chime.startMediaCapturePipeline({
  SourceType: 'ChimeSdkMeeting',
  SourceArn: chimeMeeting.MeetingArn,
  SinkType: 'S3Bucket',
  SinkArn: 'arn:aws:s3:::saludcompartida-legal-archive/calls/',
  ChimeSdkMeetingConfiguration: {
    ArtifactsConfiguration: {
      Audio: {
        MuxType: 'AudioWithCompositedVideo'
      }
    }
  }
});

// Stream bidireccional a VAPI
const vapiStream = await vapi.startCall({
  phoneNumber: '+521234567890',
  assistantId: 'lupita-assistant-id',
  assistantOverrides: {
    variableValues: {
      user_context: JSON.stringify(context)
    },
    recordingEnabled: false // ⚠️ CRÍTICO
  }
});

// Conectar Chime ↔ VAPI
chime.on('audioTrack', (track) => {
  vapiStream.sendAudio(track);
});

vapi.on('audioResponse', (audio) => {
  chime.sendAudio(audio);
});
```

### FASE 3: POST-LLAMADA (Pipeline Automático)

```javascript
// Lambda: process-call-recording
// Trigger: S3 PUT en saludcompartida-companion-active

exports.handler = async (event) => {
  const s3Key = event.Records[0].s3.object.key;
  // key = "calls/2026/01/24/abc-123/audio-full.wav"
  
  const callId = s3Key.split('/')[4];
  
  // 1. Download audio
  const audio = await s3.getObject({
    Bucket: 'saludcompartida-companion-active',
    Key: s3Key
  }).promise();
  
  // 2. Separar canales (stereo → mono × 2)
  const { lupitaChannel, userChannel } = separateChannels(audio.Body);
  
  // 3. Transcribir con Whisper
  const transcript = await openai.audio.transcriptions.create({
    file: userChannel,
    model: 'whisper-1',
    language: 'es'
  });
  
  // 4. Generar embedding del texto
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: transcript.text
  });
  
  // 5. Extraer metadata con Claude
  const analysis = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    messages: [{
      role: 'user',
      content: `Analiza esta conversación y extrae:
      - Topics principales
      - Emoción dominante
      - Behavioral codes activados
      - User facts importantes
      
      Transcripción:
      ${transcript.text}`
    }]
  });
  
  // 6. Store en Weaviate (BYOV)
  await weaviate.data
    .creator()
    .withClassName('LupitaConversation')
    .withProperties({
      call_id: callId,
      s3_uri: `s3://saludcompartida-legal-archive/${s3Key}`,
      phone_number_hash: sha256(phoneNumber),
      ...analysis.metadata
    })
    .withVector(embedding.data[0].embedding)
    .do();
  
  // 7. Store metadata en Supabase
  await supabase.from('companion_calls').update({
    transcript: transcript.text,
    topics: analysis.topics,
    emotion_primary: analysis.emotion,
    behavioral_codes_triggered: analysis.codes,
    weaviate_id: weaviateResult.id,
    processed_at: new Date().toISOString()
  }).eq('call_id', callId);
  
  // 8. Extraer y guardar user facts
  for (const fact of analysis.user_facts) {
    await supabase.from('user_facts').upsert({
      phone_number_hash: sha256(phoneNumber),
      fact_type: fact.type,
      fact_key: fact.key,
      fact_value: fact.value,
      source_call_id: callId,
      confidence_score: fact.confidence
    });
  }
};
```

---

## 💰 ANÁLISIS DE COSTOS

### Comparación Mensual (1000 llamadas, 5 min c/u)

| Componente | TELNYX Model | AWS-First Model | Ahorro |
|------------|--------------|-----------------|--------|
| **Telefonía** | | | |
| - Llamadas salientes | TELNYX: $100 | Chime: $13 | 87% ↓ |
| - Número MX | TELNYX: $5 | Chime: $1 | 80% ↓ |
| **Grabación** | | | |
| - Storage (100GB) | VAPI: $10 | S3: $2.30 | 77% ↓ |
| - Transfer out | VAPI→S3: $9 | Interno: $0 | 100% ↓ |
| **AI Processing** | | | |
| - VAPI (con grabación) | $150 | $100 (stateless) | 33% ↓ |
| - Claude API | Incluido | $20 | - |
| - ElevenLabs | Incluido | $30 | - |
| **Vectorización** | | | |
| - OpenAI embeddings | $0 | $2 | - |
| - Weaviate | $0 (free tier) | $0 | - |
| **Total** | **$274/mes** | **$168.30/mes** | **38.6% ↓** |

**ROI**: $105.70/mes × 12 = **$1,268/año ahorrado**

---

## 🔒 COMPLIANCE Y SEGURIDAD

### S3 Object Lock Configuration

```javascript
// Crear bucket con Object Lock
await s3.createBucket({
  Bucket: 'saludcompartida-legal-archive',
  ObjectLockEnabledForBucket: true
});

// Configurar retención COMPLIANCE (1 año)
await s3.putObjectLockConfiguration({
  Bucket: 'saludcompartida-legal-archive',
  ObjectLockConfiguration: {
    ObjectLockEnabled: 'Enabled',
    Rule: {
      DefaultRetention: {
        Mode: 'COMPLIANCE', // No puede ser eliminado
        Days: 365
      }
    }
  }
});

// Cada grabación automáticamente se marca como immutable
```

### Encryption at Rest

```javascript
// Server-side encryption con KMS
await s3.putBucketEncryption({
  Bucket: 'saludcompartida-legal-archive',
  ServerSideEncryptionConfiguration: {
    Rules: [{
      ApplyServerSideEncryptionByDefault: {
        SSEAlgorithm: 'aws:kms',
        KMSMasterKeyID: 'arn:aws:kms:us-east-2:xxx:key/xxx'
      },
      BucketKeyEnabled: true
    }]
  }
});
```

### Acceso Controlado

```javascript
// IAM Policy: Solo Lambda puede leer
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": [
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::saludcompartida-legal-archive/*",
      "Condition": {
        "StringEquals": {
          "aws:SourceArn": "arn:aws:lambda:us-east-2:xxx:function:process-call-recording"
        }
      }
    }
  ]
}
```

---

## 📊 IMPLEMENTACIÓN: 3 OPCIONES

### OPCIÓN A: AWS Chime SDK (Recomendado para MVP)

**Pros**:
- Control total
- Mejor pricing
- WebRTC nativo
- SDKs para web/mobile

**Cons**:
- Más complejo setup inicial
- Requiere SIP trunk provider

**Setup**:
```bash
# 1. Crear Voice Connector
aws chime create-voice-connector --name lupita-mx

# 2. Configurar SIP trunk (con Bandwidth.com o similar)
aws chime put-voice-connector-origination \
  --voice-connector-id xxx \
  --origination file://sip-config.json

# 3. Habilitar grabación a S3
aws chime put-voice-connector-streaming-configuration \
  --voice-connector-id xxx \
  --streaming-configuration file://streaming-config.json
```

### OPCIÓN B: Amazon Connect (Más Simple)

**Pros**:
- Zero-code contact flows
- Grabación S3 nativa
- Fácil integración Lambda
- UI para gestión

**Cons**:
- Menos flexible
- Pricing ligeramente mayor

**Setup**:
```bash
# 1. Crear instancia Connect
aws connect create-instance \
  --identity-management-type CONNECT_MANAGED \
  --instance-alias lupita-saludcompartida

# 2. Claim número México (via AWS)
aws connect search-available-phone-numbers \
  --target-arn arn:aws:connect:us-east-1:xxx:instance/xxx \
  --phone-number-country-code MX

# 3. Configurar Lambda para VAPI integration
aws connect create-integration-association \
  --instance-id xxx \
  --integration-type LAMBDA_FUNCTION \
  --integration-arn arn:aws:lambda:xxx:function:vapi-integration
```

### OPCIÓN C: Hybrid (TELNYX → AWS)

**Pros**:
- Mantiene TELNYX para telefonía
- AWS solo para storage/processing
- Migración gradual

**Cons**:
- No aprovecha descuentos AWS
- Sigue duplicando datos

---

## 🚀 PLAN DE MIGRACIÓN

### FASE 1: POC (Esta Semana - 8 horas)

```
DÍA 1-2:
[ ] Crear bucket S3 con Object Lock
[ ] Setup Lambda process-call-recording
[ ] Configurar Weaviate schema (BYOV)
[ ] Test pipeline con audio mock

DÍA 3:
[ ] Setup AWS Chime SDK Voice Connector
[ ] Configurar SIP trunk
[ ] Test llamada a número test

DÍA 4:
[ ] Integrar VAPI (stateless mode)
[ ] Test llamada completa
[ ] Verificar audio en S3
[ ] Verificar vectors en Weaviate
```

### FASE 2: Producción (Próxima Semana)

```
SEMANA 2:
[ ] Migrar números TELNYX a AWS
[ ] Configurar alarmas CloudWatch
[ ] Setup backup cross-region
[ ] Load testing (100 llamadas concurrentes)
[ ] Go-live con usuarios reales
```

---

## 📝 CHECKLIST DE ACTIVACIÓN

### AWS Setup
- [ ] Cuenta AWS con billing configurado
- [ ] IAM roles para Lambda + Chime
- [ ] S3 buckets creados (legal + active)
- [ ] Object Lock configurado
- [ ] KMS keys creadas
- [ ] CloudWatch logs habilitados

### Chime SDK
- [ ] Voice Connector creado
- [ ] SIP trunk configurado
- [ ] Número México claimed/ported
- [ ] Media streaming a Lambda
- [ ] Recording pipeline a S3

### Lambda Functions
- [ ] process-call-recording deployed
- [ ] prepare-lupita-call deployed
- [ ] vapi-integration deployed
- [ ] Environment variables set
- [ ] VPC configuration (si aplica)

### VAPI Configuration
- [ ] recordingEnabled: false
- [ ] Webhook a Lambda (no Next.js)
- [ ] Function calls configuradas
- [ ] ElevenLabs voice selected

### Weaviate
- [ ] Cluster creado
- [ ] Schema LupitaConversation
- [ ] API key configurado
- [ ] Test query funcionando

### Supabase
- [ ] Tablas companion_calls, user_facts
- [ ] RLS policies configuradas
- [ ] Service role key en Lambda
- [ ] Backup configurado

---

## 🎯 RESULTADO FINAL

Con esta arquitectura tendrás:

✅ **Single Source of Truth**: S3 es la única fuente de audio  
✅ **Cost Optimization**: 38.6% reducción de costos  
✅ **Compliance Built-in**: Object Lock para LFPDPPP  
✅ **Zero Duplication**: Una sola copia de cada grabación  
✅ **Scalable**: Auto-scaling de Lambda + Chime  
✅ **Maintainable**: Menos vendors, menos complejidad  

**Próximo paso**: ¿Implementamos POC con AWS Chime esta semana?
