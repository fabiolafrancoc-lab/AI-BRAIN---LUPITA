# ✅ PASOS PARA ACTIVAR EL SISTEMA DE CONVERSACIONES GRABADAS

## 🎯 RESUMEN
Has recibido scripts sociológicos profesionales para Lupita. Ahora el sistema:
1. **Graba** todas las conversaciones (audio + transcripción)
2. **Analiza** con IA (detecta crisis, sentimiento, topics)
3. **Guarda** en Supabase para análisis y mejora continua
4. **Alerta** automáticamente si detecta crisis

---

## 📋 CHECKLIST RÁPIDO

### ✅ COMPLETADO (ya en el código)
- [x] Scripts relacionales sociológicos creados
- [x] Webhook actualizado con análisis de IA
- [x] Grabación activada (`recordingEnabled: true`)
- [x] Metadata de scripts agregada
- [x] Código pushed a GitHub
- [x] Documentación completa

### 🔲 FALTA HACER (3 pasos simples)

#### PASO 1: Crear tabla en Supabase (5 minutos)

1. **Abrir Supabase Dashboard:**
   - Ir a: https://supabase.com/dashboard
   - Seleccionar proyecto: `SaludCompartida`

2. **Abrir SQL Editor:**
   - En el menú izquierdo: **SQL Editor**
   - Click en: **+ New query**

3. **Copiar y pegar el SQL:**
   - Abrir archivo: `scripts/create-call-transcripts-table.sql`
   - Copiar TODO el contenido (420 líneas)
   - Pegar en SQL Editor
   - Click en: **▶ Run** (esquina inferior derecha)

4. **Verificar que se creó:**
   ```sql
   -- Ejecutar esto en SQL Editor para verificar
   SELECT * FROM call_transcripts LIMIT 1;
   ```
   
   Debe decir: "0 rows" (normal, aún no hay llamadas)

#### PASO 2: Configurar webhook en Vapi Dashboard (2 minutos)

1. **Abrir Vapi Dashboard:**
   - Ir a: https://dashboard.vapi.ai
   - Login

2. **Configurar webhook:**
   - Menú: **Settings** → **Webhooks**
   - Click: **+ Add Webhook**
   - URL: `https://www.saludcompartida.app/api/vapi-webhook`
   - Events (seleccionar):
     - ✅ `call-start`
     - ✅ `call-end` (CRÍTICO - este dispara el análisis)
     - ✅ `function-call` (opcional)
   - Click: **Save**

#### PASO 3: Test de llamada (1 minuto)

```bash
curl -X POST https://www.saludcompartida.app/api/make-voice-call \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+13055227150",
    "agentId": "agent_001",
    "callReason": "welcome",
    "userName": "Fabiola",
    "userProfile": "adulto_mayor",
    "callNumber": 1,
    "previousTopics": []
  }'
```

Esperar 2-3 minutos después de la llamada, luego verificar en Supabase:

```sql
SELECT 
  id,
  user_name,
  agent_name,
  call_duration,
  sentiment_analysis,
  detected_codes,
  crisis_detected,
  topics,
  analyzed_at
FROM call_transcripts
ORDER BY created_at DESC
LIMIT 1;
```

---

## 🎨 QUÉ HACE EL SISTEMA

### Durante la llamada:
1. Lupita usa scripts sociológicos según perfil del usuario
2. Vapi graba audio + transcribe en tiempo real
3. Usuario habla, Lupita responde según código de comportamiento

### Después de la llamada (automático):
1. Vapi envía webhook con transcripción + grabación
2. Sistema guarda en `call_transcripts`
3. OpenAI analiza conversación:
   - ✅ Sentimiento (positivo/neutral/negativo)
   - ✅ Códigos (CERRADO, EMOCION, SALUD, PAREJA, FINANZAS, ABANDONO, CRISIS)
   - ✅ Nivel de crisis (none → low → medium → high → critical)
   - ✅ Topics (cocina, medicamentos, familia, etc.)
   - ✅ Personas mencionadas
   - ✅ Calidad de llamada (0-1.0 score)
4. Si crisis HIGH o CRITICAL → Alerta automática

### Para análisis:
- Ver todas las conversaciones por usuario
- Detectar patrones emocionales
- Mejorar scripts basado en datos reales
- Identificar usuarios en riesgo

---

## 🔍 CÓMO VER LAS CONVERSACIONES

### En Supabase SQL Editor:

**Ver últimas 10 llamadas:**
```sql
SELECT 
  id,
  call_started_at,
  user_name,
  agent_name,
  call_number,
  call_duration,
  sentiment_analysis->>'overall' as sentiment,
  detected_codes,
  crisis_detected,
  crisis_level,
  topics
FROM call_transcripts
ORDER BY call_started_at DESC
LIMIT 10;
```

**Ver transcripción completa de una llamada:**
```sql
SELECT 
  user_name,
  agent_name,
  call_started_at,
  transcript,
  recording_url
FROM call_transcripts
WHERE phone_number = '+13055227150'
ORDER BY call_started_at DESC
LIMIT 1;
```

**Ver alertas de crisis:**
```sql
SELECT * FROM crisis_alerts;
```

**Resumen de un usuario:**
```sql
SELECT * FROM call_transcripts_summary
WHERE phone_number = '+13055227150';
```

---

## 🚨 SISTEMA DE ALERTAS DE CRISIS

### Niveles automáticos:

| Nivel | Qué detecta | Acción automática |
|-------|-------------|-------------------|
| **none** | Conversación normal | Ninguna |
| **low** | "Estoy un poco triste" | Monitor próxima llamada |
| **medium** | "Ya nadie me visita", "Me siento muy sola" | Seguimiento en 2-3 días |
| **high** | "Ya no puedo más", "No tiene sentido" | 🔔 **ALERTA** - Seguimiento en 24h |
| **critical** | "Ya no quiero vivir", ideación suicida | 🚨 **URGENTE** - Seguimiento en 1h |

### Si detecta CRISIS:
1. ✅ Log en Vercel con evidencia textual
2. ✅ Marca `crisis_detected = TRUE`
3. ✅ Programa `follow_up_scheduled_at` = en 1 hora
4. ✅ Guarda en vista `crisis_alerts`
5. 🔜 TODO: Notificar por Slack/email/SMS

---

## 📊 EJEMPLO DE ANÁLISIS

Después de una llamada, verás esto en Supabase:

```json
{
  "id": "abc123...",
  "user_name": "María López",
  "agent_name": "Lupita",
  "call_number": 2,
  "user_profile": "adulto_mayor",
  "call_duration": 180,
  
  "transcript": "Lupita: ¿Bueno? ¿María López? Buenos días...\nUsuario: Hola Lupita...\n...",
  
  "recording_url": "https://storage.vapi.ai/recordings/xyz.mp3",
  
  "sentiment_analysis": {
    "overall": "neutral",
    "confidence": 0.85,
    "emotions": ["tristeza", "nostalgia", "esperanza"]
  },
  
  "detected_codes": ["EMOCION", "ABANDONO"],
  "crisis_detected": false,
  "crisis_level": "low",
  
  "topics": ["cocina", "familia", "hijo_migrante", "recetas"],
  "mentioned_people": ["Juan (hijo)", "Dr. García"],
  
  "action_items": [
    "recordar_receta_mole",
    "llamar_hijo_fin_semana"
  ],
  
  "call_quality_score": 0.87,
  "user_satisfaction": "satisfied",
  
  "follow_up_needed": true,
  "follow_up_reason": "Mencionó sentirse sola, monitorear emocionalmente"
}
```

---

## 📖 DOCUMENTACIÓN COMPLETA

Lee: **`SISTEMA_CONVERSACIONES_GRABADAS.md`** para:
- Arquitectura detallada
- Consultas SQL avanzadas
- Troubleshooting
- Próximos pasos (dashboard visual, etc.)

---

## 🎯 QUICK START

```bash
# 1. Crear tabla en Supabase
# → Copiar/pegar scripts/create-call-transcripts-table.sql

# 2. Configurar webhook en Vapi
# → https://dashboard.vapi.ai → Settings → Webhooks
# → URL: https://www.saludcompartida.app/api/vapi-webhook

# 3. Test de llamada
curl -X POST https://www.saludcompartida.app/api/make-voice-call \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+13055227150",
    "agentId": "agent_001",
    "callReason": "welcome",
    "userName": "Fabiola",
    "userProfile": "adulto_mayor",
    "callNumber": 1
  }'

# 4. Esperar 2-3 minutos, verificar en Supabase
# → SELECT * FROM call_transcripts ORDER BY created_at DESC LIMIT 1;

# ✅ LISTO - Sistema activado
```

---

## 💡 BENEFICIOS

1. **Mejora continua:** Analizar llamadas reales para mejorar scripts
2. **Detección temprana:** Identificar usuarios en crisis antes de que sea tarde
3. **Personalización:** Retomar temas de llamadas anteriores (memoria relacional)
4. **Métricas:** Medir calidad de agentes, satisfacción, topics más comunes
5. **Cumplimiento:** Auditoría completa de conversaciones para regulación
6. **Training:** Entrenar nuevos agentes con llamadas reales exitosas

---

**¿Necesitas ayuda con algún paso?** Pregúntame.

**Ready para activar:** Sigue PASO 1 → PASO 2 → PASO 3 ✅
