# 🎙️ Sistema de Conversaciones Grabadas y Análisis con IA

## 📋 RESUMEN EJECUTIVO

Sistema completo para grabar, transcribir, analizar y mejorar las conversaciones telefónicas de Lupita con IA. Detecta códigos de comportamiento (CRISIS, EMOCION, SALUD, etc.), analiza sentimiento y genera insights para mejorar el acompañamiento emocional.

---

## 🏗️ ARQUITECTURA

```
┌─────────────────────────────────────────────────────────────┐
│                     VAPI.AI PHONE CALL                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Lupita habla con Usuario                              │  │
│  │ - Grabación de audio: ACTIVADA ✅                     │  │
│  │ - Transcripción en tiempo real                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   VAPI WEBHOOK (call-end)                    │
│  api/vapi-webhook.js                                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1. Recibe: transcript, recording_url, metadata        │  │
│  │ 2. Guarda en Supabase: call_transcripts               │  │
│  │ 3. Dispara análisis con IA                            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                ANÁLISIS CON OPENAI GPT-4o-mini               │
│  analyzeCallWithAI()                                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Detecta:                                              │  │
│  │ ✓ Sentimiento (positive/neutral/negative)            │  │
│  │ ✓ Códigos comportamiento (CRISIS, EMOCION, etc.)     │  │
│  │ ✓ Nivel de crisis (none/low/medium/high/critical)    │  │
│  │ ✓ Topics (cocina, medicamentos, familia)             │  │
│  │ ✓ Personas mencionadas                               │  │
│  │ ✓ Action items                                        │  │
│  │ ✓ Calidad de llamada (0-1.0 score)                   │  │
│  │ ✓ Satisfacción usuario (inferida)                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│             SUPABASE: call_transcripts (actualizado)         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ - transcript (texto completo)                         │  │
│  │ - recording_url (audio de Vapi)                       │  │
│  │ - sentiment_analysis (JSONB)                          │  │
│  │ - detected_codes (array)                              │  │
│  │ - crisis_detected (boolean)                           │  │
│  │ - crisis_level (text)                                 │  │
│  │ - topics, mentioned_people, action_items              │  │
│  │ - analyzed_at (timestamp)                             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  ALERTAS Y SEGUIMIENTO                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Si crisis_level = 'high' o 'critical':                │  │
│  │ - Alerta al equipo (Slack, email, SMS)               │  │
│  │ - Programa seguimiento en 1 hora                     │  │
│  │ - Vista: crisis_alerts (últimos 7 días)              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📂 ARCHIVOS NUEVOS

### 1. `ai-brain/lupita-scripts-relacionales.js`
**Propósito:** Scripts sociológicos para Lupita según perfil y número de llamada.

**Contenido:**
- ✅ Principios fundamentales de Lupita (nunca/siempre)
- ✅ Códigos de comportamiento (CERRADO, EMOCION, SALUD, PAREJA, FINANZAS, ABANDONO, CRISIS)
- ✅ Scripts para Adulto Mayor (Llamada 1: Llegada, 2: Sabor de Casa, 3: Hilo Invisible)
- ✅ Scripts para Madre con Hijos (Llamada 1: Aliada, 2: Los Niños, 3: Tú También Importas)
- ✅ Configuración técnica para Vapi (pausas, tono, interrupciones, memoria)
- ✅ Función `generarSystemPrompt()` - genera prompt dinámico según perfil y número de llamada

**Uso:**
```javascript
import { generarSystemPrompt } from '../ai-brain/lupita-scripts-relacionales.js';

const systemPrompt = generarSystemPrompt(
  'adulto_mayor',  // o 'madre_hijos'
  1,  // Número de llamada
  {
    nombre_usuario: 'María',
    nombre_migrante: 'Juan',
    parentesco: 'su hijo',
    hora_saludo: 'buenos días'
  }
);
```

---

### 2. `scripts/create-call-transcripts-table.sql`
**Propósito:** Tabla en Supabase para guardar transcripciones y análisis.

**Estructura:**
```sql
call_transcripts (
  -- Identificadores
  id UUID PRIMARY KEY
  call_id TEXT UNIQUE  -- ID de Vapi
  user_id UUID  -- Si está autenticado
  
  -- Usuario
  phone_number TEXT
  user_name TEXT
  user_email TEXT
  
  -- Agente
  agent_id TEXT  -- agent_001, agent_002, etc.
  agent_name TEXT  -- Lupita, Carmen, Rosa
  
  -- Contexto relacional
  user_profile TEXT  -- 'adulto_mayor' o 'madre_hijos'
  call_number INTEGER  -- 1, 2, 3... (secuencia)
  previous_topics JSONB  -- Temas de llamadas anteriores
  
  -- Transcripción
  transcript TEXT  -- Texto completo
  transcript_json JSONB  -- Por turnos
  
  -- Grabación
  recording_url TEXT  -- URL de Vapi
  recording_duration INTEGER
  
  -- Análisis IA
  sentiment_analysis JSONB
  detected_codes JSONB  -- ['CRISIS', 'EMOCION', etc.]
  crisis_detected BOOLEAN
  crisis_level TEXT  -- 'none', 'low', 'medium', 'high', 'critical'
  
  -- Extracciones
  topics JSONB  -- ['cocina', 'medicamentos']
  mentioned_people JSONB  -- ['Juan', 'María']
  action_items JSONB
  
  -- Calidad
  call_status TEXT
  call_duration INTEGER
  call_quality_score DECIMAL(3,2)
  user_satisfaction TEXT
  
  -- Seguimiento
  follow_up_needed BOOLEAN
  follow_up_reason TEXT
  follow_up_scheduled_at TIMESTAMPTZ
  
  -- Timestamps
  call_started_at TIMESTAMPTZ
  call_ended_at TIMESTAMPTZ
  created_at TIMESTAMPTZ
  analyzed_at TIMESTAMPTZ
)
```

**Vistas incluidas:**
- ✅ `call_transcripts_summary` - Resumen por usuario
- ✅ `crisis_alerts` - Alertas de crisis últimos 7 días

**Ejecutar:**
```bash
# En Supabase SQL Editor
psql -h [host] -U postgres -d postgres -f scripts/create-call-transcripts-table.sql
```

---

### 3. `api/vapi-webhook.js` (ACTUALIZADO)
**Propósito:** Recibe webhooks de Vapi, guarda y analiza conversaciones.

**Flujo actualizado:**

1. **call-end event →** Guarda en `call_transcripts`:
   ```javascript
   {
     call_id: call.id,
     phone_number: call.customer.number,
     agent_id: call.metadata.agentId,
     user_profile: call.metadata.userProfile,  // NUEVO
     call_number: call.metadata.callNumber,    // NUEVO
     previous_topics: call.metadata.previousTopics,  // NUEVO
     transcript: fullTranscriptText,
     recording_url: recording.url,
     // ... más campos
   }
   ```

2. **Dispara análisis con OpenAI:**
   ```javascript
   analyzeCallWithAI(transcriptId, fullTranscriptText, messages)
   ```

3. **Análisis detecta:**
   - Sentimiento con confianza
   - Códigos de comportamiento (CRISIS, EMOCION, SALUD, etc.)
   - Nivel de crisis (none → critical)
   - Topics, personas mencionadas, action items
   - Calidad de llamada (0-1.0)
   - Satisfacción del usuario (inferida)

4. **Si crisis high/critical →** `sendCrisisAlert()`:
   - Log en consola con evidencia
   - Programa seguimiento en 1 hora
   - TODO: Slack, email, SMS

**Códigos de comportamiento detectados:**
```javascript
const CODIGOS = {
  CERRADO: 'Respuestas cortas, monosílabos',
  EMOCION: 'Llanto, voz quebrada',
  SALUD: 'Menciona dolor, síntomas',
  PAREJA: 'Pleitos con migrante',
  FINANZAS: 'Problemas de dinero',
  ABANDONO: 'Se siente sola, migrante no llama',
  CRISIS: 'Ideación suicida, desesperanza'
};
```

---

### 4. `api/make-voice-call.js` (ACTUALIZADO)
**Propósito:** Inicia llamadas de Vapi con metadata de scripts relacionales.

**Cambios:**

1. **Nuevos parámetros aceptados:**
   ```javascript
   {
     phone: '+13055227150',
     agentId: 'agent_001',
     callReason: 'welcome',
     userName: 'María',
     userEmail: 'maria@example.com',  // NUEVO
     userProfile: 'adulto_mayor',      // NUEVO
     callNumber: 1,                    // NUEVO
     previousTopics: ['cocina', 'medicamentos'],  // NUEVO
     userContext: {...}
   }
   ```

2. **Metadata enviada a Vapi:**
   ```javascript
   assistant: {
     metadata: {
       agentId,
       callReason,
       userName,
       userEmail,
       userProfile,    // 'adulto_mayor' o 'madre_hijos'
       callNumber,     // 1, 2, 3...
       previousTopics  // Array de temas
     }
   }
   ```

3. **Grabación ya activada:**
   ```javascript
   recordingEnabled: true  // ✅ Ya configurado
   ```

---

## 🚀 INSTALACIÓN

### Paso 1: Crear tabla en Supabase

1. Ir a Supabase Dashboard → SQL Editor
2. Pegar contenido de `scripts/create-call-transcripts-table.sql`
3. Ejecutar

### Paso 2: Verificar variables de entorno

```bash
# Vercel o .env.local
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxxx  # Service role key (NO anon key)
OPENAI_API_KEY=sk-xxxx
VAPI_API_KEY=xxxx
VAPI_PHONE_NUMBER_ID=9aafdbd3-9d61-49f5-929a-51bb2323419f
```

### Paso 3: Deploy código actualizado

```bash
git add .
git commit -m "feat: Sistema de conversaciones grabadas y análisis con IA"
git push origin main
```

Vercel deploy automático en ~2 minutos.

### Paso 4: Configurar webhook en Vapi Dashboard

1. Ir a https://dashboard.vapi.ai
2. Settings → Webhooks
3. Añadir webhook URL:
   ```
   https://www.saludcompartida.app/api/vapi-webhook
   ```
4. Eventos a suscribir:
   - ✅ `call-start`
   - ✅ `call-end` (CRÍTICO)
   - ✅ `function-call` (opcional)

### Paso 5: Test de llamada

```bash
curl -X POST https://www.saludcompartida.app/api/make-voice-call \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+13055227150",
    "agentId": "agent_001",
    "callReason": "welcome",
    "userName": "María",
    "userProfile": "adulto_mayor",
    "callNumber": 1,
    "previousTopics": []
  }'
```

---

## 📊 CONSULTAS ÚTILES EN SUPABASE

### Ver todas las transcripciones

```sql
SELECT 
  id,
  call_id,
  user_name,
  phone_number,
  agent_name,
  call_number,
  call_duration,
  call_status,
  sentiment_analysis->>'overall' as sentiment,
  detected_codes,
  crisis_detected,
  analyzed_at,
  created_at
FROM call_transcripts
ORDER BY created_at DESC
LIMIT 50;
```

### Ver alertas de crisis

```sql
SELECT * FROM crisis_alerts;
```

### Resumen por usuario

```sql
SELECT * FROM call_transcripts_summary
WHERE phone_number = '+13055227150';
```

### Buscar en transcripciones (full-text)

```sql
SELECT 
  id,
  user_name,
  agent_name,
  call_started_at,
  transcript
FROM call_transcripts
WHERE to_tsvector('spanish', transcript) @@ to_tsquery('spanish', 'medicamento | doctor | salud')
ORDER BY call_started_at DESC;
```

### Llamadas con código específico

```sql
SELECT 
  id,
  user_name,
  agent_name,
  detected_codes,
  transcript,
  call_started_at
FROM call_transcripts
WHERE detected_codes @> '["CRISIS"]'::jsonb
ORDER BY call_started_at DESC;
```

### Estadísticas de calidad

```sql
SELECT 
  agent_name,
  COUNT(*) as total_calls,
  AVG(call_quality_score) as avg_quality,
  AVG(call_duration) as avg_duration_seconds,
  COUNT(*) FILTER (WHERE user_satisfaction = 'satisfied') as satisfied_users,
  COUNT(*) FILTER (WHERE crisis_detected = TRUE) as crisis_calls
FROM call_transcripts
WHERE analyzed_at IS NOT NULL
GROUP BY agent_name
ORDER BY avg_quality DESC;
```

---

## 🔍 ANÁLISIS CON IA - DETALLES

### Prompt de análisis (OpenAI GPT-4o-mini)

El sistema envía este prompt a OpenAI:

```
Eres un analista experto en conversaciones de acompañamiento emocional. 
Analiza esta conversación telefónica entre Lupita y un usuario.

CÓDIGOS DE COMPORTAMIENTO A DETECTAR:
- CERRADO: Respuestas cortas, monosílabos
- EMOCION: Llanto, voz quebrada
- SALUD: Menciona dolor físico, síntomas
- PAREJA: Menciona pleitos con pareja/migrante
- FINANZAS: Menciona dinero, remesas
- ABANDONO: Siente que el migrante no llama
- CRISIS: Menciona "ya no quiero vivir", ideación suicida

NIVEL DE CRISIS:
- none: Sin señales
- low: Desánimo leve
- medium: Desánimo persistente
- high: Desesperanza
- critical: Ideación suicida

Devuelve JSON con: sentiment, detected_codes, crisis_detected, 
crisis_level, topics, mentioned_people, action_items, 
call_quality_score, user_satisfaction, summary, relational_notes
```

### Estructura del análisis guardado

```json
{
  "sentiment_analysis": {
    "overall": "neutral",
    "confidence": 0.85,
    "emotions": ["tristeza", "ansiedad", "esperanza"]
  },
  "detected_codes": ["EMOCION", "SALUD"],
  "crisis_detected": false,
  "crisis_level": "low",
  "topics": ["medicamentos", "familia", "cocina"],
  "mentioned_people": ["Juan", "María", "Dr. López"],
  "action_items": [
    "recordar_tomar_medicamento_8am",
    "agendar_consulta_doctor"
  ],
  "call_quality_score": 0.87,
  "user_satisfaction": "satisfied"
}
```

---

## 🚨 SISTEMA DE ALERTAS DE CRISIS

### Niveles de crisis

| Nivel | Descripción | Acción |
|-------|-------------|--------|
| **none** | Sin señales de crisis | Ninguna |
| **low** | Desánimo leve, tristeza pasajera | Monitorear próxima llamada |
| **medium** | Desánimo persistente, aislamiento | Programar seguimiento en 2-3 días |
| **high** | Desesperanza, pensamientos negativos recurrentes | **ALERTA** - Seguimiento en 24h |
| **critical** | Ideación suicida, plan concreto | **🚨 ALERTA URGENTE** - Seguimiento en 1h, notificar equipo |

### Protocolo automático

Cuando `crisis_level` = `'high'` o `'critical'`:

1. ✅ Log en consola con evidencia textual
2. ✅ Actualiza `follow_up_scheduled_at` = NOW() + 1 hour
3. ✅ Marca `follow_up_needed = TRUE`
4. 🔜 TODO: Enviar a Slack webhook
5. 🔜 TODO: Email urgente al equipo
6. 🔜 TODO: SMS al supervisor

### Frases que activan CRISIS

Según scripts relacionales:

- "Ya no quiero vivir"
- "Ojalá me muriera"
- "Mis hijos estarían mejor sin mí"
- "Ya no le veo sentido"
- "Estoy pensando en hacerme daño"

Respuesta de Lupita (desde script):

```
"Oye, espérame tantito. Lo que me estás diciendo es muy serio 
y me preocupa mucho. Yo te quiero ayudar, pero la verdad es 
que no estoy capacitada para esto. 

Lo que sí puedo hacer es darte un número donde hay personas 
que sí saben cómo ayudar.

Es la Línea de la Vida en México: 800 911 2000. 
Contestan las 24 horas. ¿Tienes cómo anotar?

¿Me prometes que les vas a marcar? 
Yo te voy a llamar mañana para ver cómo estás.

No estás sola, ¿eh? Aunque ahorita se sienta así."
```

---

## 📈 MÉTRICAS Y REPORTES

### KPIs principales

```sql
-- Dashboard de métricas generales
SELECT 
  COUNT(*) as total_calls,
  COUNT(*) FILTER (WHERE call_status = 'completed') as completed_calls,
  COUNT(*) FILTER (WHERE crisis_detected = TRUE) as crisis_calls,
  COUNT(*) FILTER (WHERE follow_up_needed = TRUE) as follow_ups_pending,
  AVG(call_duration) as avg_duration_seconds,
  AVG(call_quality_score) as avg_quality_score,
  COUNT(DISTINCT phone_number) as unique_users,
  COUNT(DISTINCT agent_id) as active_agents
FROM call_transcripts
WHERE created_at >= NOW() - INTERVAL '7 days';
```

### Top topics discutidos

```sql
SELECT 
  jsonb_array_elements_text(topics) as topic,
  COUNT(*) as frequency
FROM call_transcripts
WHERE topics IS NOT NULL
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY topic
ORDER BY frequency DESC
LIMIT 20;
```

### Progreso relacional por usuario

```sql
SELECT 
  phone_number,
  user_name,
  user_profile,
  call_number,
  topics,
  sentiment_analysis->>'overall' as sentiment,
  call_quality_score,
  call_started_at
FROM call_transcripts
WHERE phone_number = '+13055227150'
ORDER BY call_number ASC;
```

---

## 🔐 SEGURIDAD Y PRIVACIDAD

### Row Level Security (RLS) configurado

- ✅ Admins pueden ver todas las transcripciones
- ✅ Usuarios solo ven sus propias transcripciones
- ✅ Solo el sistema (service key) puede insertar/actualizar
- ✅ Datos sensibles encriptados en Supabase

### GDPR / Privacidad

**Importante:** Las grabaciones contienen información de salud sensible.

- ✅ Grabaciones en Vapi (encriptadas at-rest)
- ✅ Solo accesibles via URL firmada con expiración
- ✅ Logs con PII hasheada en producción
- 🔜 TODO: Implementar data retention policy (eliminar grabaciones después de 90 días)
- 🔜 TODO: Consentimiento explícito al inicio de llamada

---

## 🛠️ TROUBLESHOOTING

### No se graban las conversaciones

1. Verificar en Vapi Dashboard:
   ```
   Settings → Recording → Enabled ✅
   ```

2. Verificar en código:
   ```javascript
   recordingEnabled: true  // En make-voice-call.js
   ```

3. Verificar webhook configurado:
   ```
   Dashboard → Webhooks → call-end event suscrito
   ```

### Análisis no se completa

1. Verificar logs en Vercel:
   ```bash
   vercel logs --follow
   ```

2. Buscar errores de OpenAI:
   ```
   ❌ Error analyzing call with AI: [mensaje]
   ```

3. Verificar API key:
   ```bash
   # Debe estar configurada
   echo $OPENAI_API_KEY
   ```

4. Verificar créditos en OpenAI:
   https://platform.openai.com/account/usage

### Transcripciones vacías

1. Verificar transcriber en Vapi:
   ```javascript
   transcriber: {
     provider: 'deepgram',
     language: 'es',
     model: 'nova-2'
   }
   ```

2. Verificar que la llamada duró más de 5 segundos

3. Verificar logs del webhook:
   ```
   📞 Vapi Webhook Event: { type: 'call-end', callId: '...' }
   ```

---

## 📚 RECURSOS ADICIONALES

- 📄 [Scripts Relacionales](ai-brain/lupita-scripts-relacionales.js)
- 🗄️ [Schema SQL](scripts/create-call-transcripts-table.sql)
- 🔗 [Vapi Webhooks Docs](https://docs.vapi.ai/webhooks)
- 🔗 [OpenAI API Docs](https://platform.openai.com/docs)
- 🔗 [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [x] Crear `ai-brain/lupita-scripts-relacionales.js`
- [x] Crear `scripts/create-call-transcripts-table.sql`
- [x] Actualizar `api/vapi-webhook.js` con análisis completo
- [x] Actualizar `api/make-voice-call.js` con metadata
- [x] Ejecutar SQL en Supabase
- [ ] Configurar webhook en Vapi Dashboard
- [ ] Hacer test de llamada
- [ ] Verificar que se guarda en `call_transcripts`
- [ ] Verificar que análisis se completa
- [ ] Configurar alertas de crisis (Slack/email)
- [ ] Implementar data retention policy
- [ ] Añadir consentimiento de grabación

---

## 🎯 PRÓXIMOS PASOS

1. **Crear dashboard visual** en frontend:
   - Gráfica de sentimiento por agente
   - Timeline de llamadas por usuario
   - Alertas de crisis en tiempo real
   - Player de audio con transcripción sincronizada

2. **Mejorar análisis con IA:**
   - Detectar tono de voz (pitch, velocidad)
   - Análisis de pausas y silencios
   - Comparar transcripción esperada (script) vs real
   - Generar sugerencias de mejora para Lupita

3. **Automatizar seguimientos:**
   - Scheduler automático según `follow_up_scheduled_at`
   - Llamadas de seguimiento programadas
   - Email/SMS recordatorios al usuario

4. **Integrar con Weaviate:**
   - Almacenar embeddings de conversaciones
   - Búsqueda semántica: "Encuentra usuarios que mencionaron problemas de salud"
   - Memoria de largo plazo para Lupita

---

**Creado:** 2026-01-19  
**Autor:** Sistema SaludCompartida  
**Versión:** 1.0
